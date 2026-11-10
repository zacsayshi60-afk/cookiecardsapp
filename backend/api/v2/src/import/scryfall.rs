//! Import Magic: The Gathering cards for Magisterium.
//!
//! Gatherer no longer exposes a bulk JSON API. Scryfall's public API carries
//! Gatherer-aligned oracle text, set codes, colors, and (when present)
//! `multiverse_ids` that map back to Gatherer. Local fixtures seed the archive;
//! this importer refreshes from Scryfall (set pages or optional bulk oracle).

use anyhow::{Context, Result};
use serde::Deserialize;
use sqlx::SqlitePool;
use tracing::info;

use crate::db;
use crate::import::SyncReport;

#[derive(Debug, Deserialize)]
struct BulkIndex {
    data: Vec<BulkEntry>,
}

#[derive(Debug, Deserialize)]
struct BulkEntry {
    #[serde(rename = "type")]
    bulk_type: String,
    download_uri: String,
    name: String,
}

#[derive(Debug, Deserialize)]
struct ScryfallCard {
    id: String,
    name: String,
    mana_cost: Option<String>,
    #[serde(rename = "type_line")]
    type_line: Option<String>,
    #[serde(default)]
    colors: Vec<String>,
    rarity: Option<String>,
    set: Option<String>,
    set_name: Option<String>,
    oracle_text: Option<String>,
    image_uris: Option<ImageUris>,
    #[serde(default)]
    multiverse_ids: Vec<i64>,
}

#[derive(Debug, Deserialize)]
struct ImageUris {
    normal: Option<String>,
    small: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ScryfallList {
    #[serde(default)]
    has_more: bool,
    next_page: Option<String>,
    data: Vec<ScryfallCard>,
}

#[derive(Debug, Deserialize)]
struct ScryfallSetList {
    data: Vec<ScryfallSet>,
}

#[derive(Debug, Deserialize)]
struct ScryfallSet {
    code: String,
    name: String,
    set_type: Option<String>,
    released_at: Option<String>,
}

pub async fn sync(pool: &SqlitePool, base_url: &str, bulk: bool, delay_ms: u64) -> Result<SyncReport> {
    let base = base_url.trim_end_matches('/');
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .user_agent("CardessyImporter/0.1 (magisterium/scryfall)")
        .build()?;

    // Always refresh set list for segmentation filters.
    let sets_url = format!("{base}/sets");
    let sets: ScryfallSetList = client
        .get(&sets_url)
        .send()
        .await
        .with_context(|| format!("GET {sets_url}"))?
        .error_for_status()?
        .json()
        .await?;
    for set in &sets.data {
        db::upsert_card_set(
            pool,
            "magic",
            &set.code.to_uppercase(),
            &set.name,
            set.set_type.as_deref(),
            set.released_at.as_deref(),
            "scryfall",
            None,
        )
        .await?;
    }

    let cards = if bulk {
        import_bulk(&client, base, pool).await?
    } else {
        import_fixture_sets(&client, base, pool, delay_ms).await?
    };

    Ok(SyncReport {
        tournaments: 0,
        decks: 0,
        cards,
        message: if bulk {
            format!("imported {cards} Magic cards from Scryfall oracle bulk")
        } else {
            format!(
                "imported {cards} Magic cards from Scryfall for sets already in Magisterium (pass --scryfall-bulk for full oracle)"
            )
        },
    })
}

async fn import_bulk(client: &reqwest::Client, base: &str, pool: &SqlitePool) -> Result<i64> {
    let index_url = format!("{base}/bulk-data");
    let index: BulkIndex = client
        .get(&index_url)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    let entry = index
        .data
        .iter()
        .find(|e| e.bulk_type == "oracle_cards")
        .context("Scryfall bulk-data missing oracle_cards")?;
    info!(name = %entry.name, uri = %entry.download_uri, "downloading Scryfall oracle bulk");

    let cards: Vec<ScryfallCard> = client
        .get(&entry.download_uri)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await
        .context("decode Scryfall oracle bulk")?;

    let mut count = 0i64;
    for card in &cards {
        upsert_scryfall_card(pool, card).await?;
        count += 1;
        if count % 5000 == 0 {
            info!(count, "Scryfall bulk progress");
        }
    }
    Ok(count)
}

async fn import_fixture_sets(
    client: &reqwest::Client,
    base: &str,
    pool: &SqlitePool,
    delay_ms: u64,
) -> Result<i64> {
    // Refresh cards for set names/codes already present from local Magisterium fixtures.
    let set_codes = db::list_set_codes(pool, "magic").await?;
    if set_codes.is_empty() {
        info!("no magic sets in DB yet — seed with --source local first");
        return Ok(0);
    }

    let mut count = 0i64;
    for code in set_codes {
        // Scryfall set codes are lowercase.
        let mut url = format!(
            "{base}/cards/search?q=set:{}&unique=prints",
            urlencoding_loose(&code.to_lowercase())
        );
        loop {
            let page: ScryfallList = match client.get(&url).send().await {
                Ok(resp) if resp.status().as_u16() == 404 => break,
                Ok(resp) => resp.error_for_status()?.json().await?,
                Err(err) => {
                    tracing::warn!(set = %code, error = %err, "Scryfall set fetch failed");
                    break;
                }
            };
            for card in &page.data {
                upsert_scryfall_card(pool, card).await?;
                count += 1;
            }
            if page.has_more {
                if let Some(next) = page.next_page {
                    url = next;
                    if delay_ms > 0 {
                        tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
                    }
                    continue;
                }
            }
            break;
        }
        if delay_ms > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
        }
    }
    Ok(count)
}

async fn upsert_scryfall_card(pool: &SqlitePool, card: &ScryfallCard) -> Result<()> {
    let image = card
        .image_uris
        .as_ref()
        .and_then(|i| i.normal.clone().or_else(|| i.small.clone()));
    let set_code = card.set.as_ref().map(|s| s.to_uppercase());
    let public = card
        .multiverse_ids
        .first()
        .map(|id| format!("gatherer:{id}"));
    let raw = serde_json::json!({
        "scryfall_id": card.id,
        "multiverse_ids": card.multiverse_ids,
        "set_name": card.set_name,
    });

    db::upsert_game_card(
        pool,
        &card.id,
        "magic",
        &card.name,
        card.type_line.as_deref(),
        &[],
        &card.colors,
        None,
        None,
        None,
        card.rarity.as_deref(),
        set_code.as_deref(),
        public.as_deref(),
        image.as_deref(),
        None,
        card.mana_cost.as_deref(),
        None,
        card.oracle_text.as_deref(),
        false,
        "scryfall",
        Some(&raw.to_string()),
    )
    .await?;

    // Name alias for decklist resolution.
    let name_id = db::slugify_card_id(&card.name);
    if name_id != card.id {
        db::upsert_game_card(
            pool,
            &name_id,
            "magic",
            &card.name,
            card.type_line.as_deref(),
            &[],
            &card.colors,
            None,
            None,
            None,
            card.rarity.as_deref(),
            set_code.as_deref(),
            public.as_deref(),
            image.as_deref(),
            None,
            card.mana_cost.as_deref(),
            None,
            card.oracle_text.as_deref(),
            false,
            "scryfall",
            None,
        )
        .await?;
    }
    Ok(())
}

fn urlencoding_loose(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'a'..='z' | 'A'..='Z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
            _ => format!("%{:02X}", c as u8),
        })
        .collect()
}

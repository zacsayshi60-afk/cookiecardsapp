//! Enrich the `cards` table from OpenRift's **documented public** card API.
//!
//! RiftDecks list pages mostly expose card *names*. OpenRift
//! (`GET https://openrift.app/api/v1/catalog`) provides types, domains, stats,
//! and set codes with no API key. We merge that into the same SQLite database
//! so the Riftbook app has one place to query.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::SqlitePool;
use tracing::info;

use crate::db;
use crate::import::SyncReport;

#[derive(Debug, Deserialize)]
struct Catalog {
    cards: std::collections::HashMap<String, OpenRiftCard>,
    printings: std::collections::HashMap<String, OpenRiftPrinting>,
    sets: Vec<OpenRiftSet>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenRiftCard {
    slug: String,
    name: String,
    #[serde(default)]
    #[serde(rename = "type")]
    card_type: Option<String>,
    #[serde(default)]
    domains: Vec<String>,
    energy: Option<i64>,
    might: Option<i64>,
    power: Option<i64>,
    #[serde(default)]
    bans: Vec<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OpenRiftPrinting {
    short_code: Option<String>,
    set_id: Option<String>,
    rarity: Option<String>,
    public_code: Option<String>,
    card_id: Option<String>,
    #[serde(default)]
    language: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenRiftSet {
    id: String,
    slug: String,
    #[allow(dead_code)]
    name: String,
}

pub async fn sync(pool: &SqlitePool, base_url: &str) -> Result<SyncReport> {
    let url = format!(
        "{}/api/v1/catalog",
        base_url.trim_end_matches('/')
    );
    info!(%url, "downloading OpenRift catalog");

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .user_agent("RiftbookImporter/0.1 (card catalog enrichment)")
        .build()?;

    let catalog: Catalog = client
        .get(&url)
        .send()
        .await
        .with_context(|| format!("GET {url}"))?
        .error_for_status()
        .with_context(|| format!("HTTP error for {url}"))?
        .json()
        .await
        .context("decode OpenRift catalog JSON")?;

    let set_by_id: std::collections::HashMap<_, _> =
        catalog.sets.iter().map(|s| (s.id.as_str(), s.slug.as_str())).collect();

    // Pick one representative EN (or any) printing per card for set/rarity/code.
    let mut printing_by_card: std::collections::HashMap<&str, &OpenRiftPrinting> =
        std::collections::HashMap::new();
    for printing in catalog.printings.values() {
        let Some(card_id) = printing.card_id.as_deref() else {
            continue;
        };
        let lang = printing.language.as_deref().unwrap_or("");
        match printing_by_card.get(card_id) {
            None => {
                printing_by_card.insert(card_id, printing);
            }
            Some(existing) => {
                let existing_lang = existing.language.as_deref().unwrap_or("");
                if existing_lang != "EN" && lang == "EN" {
                    printing_by_card.insert(card_id, printing);
                }
            }
        }
    }

    let mut count = 0i64;
    for (card_id, card) in &catalog.cards {
        let printing = printing_by_card.get(card_id.as_str()).copied();
        let set_code = printing
            .and_then(|p| p.set_id.as_deref())
            .and_then(|id| set_by_id.get(id).copied());
        let rarity = printing.and_then(|p| p.rarity.as_deref());
        let public_code = printing.and_then(|p| p.public_code.as_deref());
        let short = printing.and_then(|p| p.short_code.as_deref());

        // Prefer slug as stable id; also upsert under name slug so deck links resolve.
        let raw = serde_json::to_string(card).ok();
        db::upsert_enriched_card(
            pool,
            &card.slug,
            &card.name,
            card.card_type.as_deref(),
            &card.domains,
            card.energy,
            card.might,
            card.power,
            rarity,
            set_code,
            public_code.or(short),
            None,
            !card.bans.is_empty(),
            "openrift",
            raw.as_deref(),
        )
        .await?;

        // Alias by name slug used by RiftDecks decklines.
        let name_id = db::slugify_card_id(&card.name);
        if name_id != card.slug {
            db::upsert_enriched_card(
                pool,
                &name_id,
                &card.name,
                card.card_type.as_deref(),
                &card.domains,
                card.energy,
                card.might,
                card.power,
                rarity,
                set_code,
                public_code.or(short),
                None,
                !card.bans.is_empty(),
                "openrift",
                None,
            )
            .await?;
        }

        count += 1;
    }

    info!(cards = count, "OpenRift cards upserted");
    Ok(SyncReport {
        tournaments: 0,
        decks: 0,
        cards: count,
        message: format!("imported {count} cards from OpenRift catalog"),
    })
}

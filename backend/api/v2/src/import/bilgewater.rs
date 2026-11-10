//! Import Riftbound card / set metadata from Bilgewater Market's public API.
//!
//! Bilgewater (`https://api.bilgewatermarket.com`) is the price + printing catalog.
//! Domains / rules come from OpenRift; this importer fills set lists, public codes,
//! rarities, and image-friendly ids from `/api/public/cards` + `/api/card-sets`.

use anyhow::{Context, Result};
use serde::Deserialize;
use serde_json::Value;
use sqlx::SqlitePool;
use tracing::info;

use crate::db;
use crate::import::domain_fixes;
use crate::import::SyncReport;

#[derive(Debug, Deserialize)]
struct PublicCardsPage {
    page: i64,
    #[serde(rename = "pageSize")]
    page_size: i64,
    total: i64,
    #[serde(rename = "hasMore")]
    has_more: bool,
    items: Vec<PublicCardItem>,
}

#[derive(Debug, Deserialize)]
struct PublicCardItem {
    card_id: String,
    print_variation: Option<String>,
    set_info: Option<String>,
    en_card: Option<LangCard>,
    cn_card: Option<LangCard>,
}

#[derive(Debug, Deserialize)]
struct LangCard {
    id: Option<String>,
    name: Option<String>,
    rarity: Option<String>,
    is_banned: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct CardSetRow {
    set_id: String,
    name_en: Option<String>,
    name_cn: Option<String>,
    category: Option<String>,
    release_date_en: Option<String>,
    release_date_cn: Option<String>,
}

pub async fn sync(pool: &SqlitePool, base_url: &str, delay_ms: u64) -> Result<SyncReport> {
    let base = base_url.trim_end_matches('/');
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .user_agent("CardessyImporter/0.1 (+https://github.com/cardessy; bilgewater sync)")
        .build()?;

    // Sets (no App Check required).
    let sets_url = format!("{base}/api/card-sets");
    info!(%sets_url, "downloading Bilgewater card sets");
    let sets: Vec<CardSetRow> = client
        .get(&sets_url)
        .header("Origin", "https://bilgewatermarket.com")
        .header("Referer", "https://bilgewatermarket.com/")
        .send()
        .await
        .with_context(|| format!("GET {sets_url}"))?
        .error_for_status()?
        .json()
        .await
        .context("decode Bilgewater card sets")?;

    let mut set_uuid_to_code: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    for set in &sets {
        let name = set
            .name_en
            .clone()
            .or_else(|| set.name_cn.clone())
            .unwrap_or_else(|| set.set_id.clone());
        let release = set
            .release_date_en
            .clone()
            .or_else(|| set.release_date_cn.clone());
        db::upsert_card_set(
            pool,
            "riftbound",
            &set.set_id,
            &name,
            set.category.as_deref(),
            release.as_deref(),
            "bilgewater",
            None,
        )
        .await?;
        set_uuid_to_code.insert(set.set_id.clone(), set.set_id.clone());
        // set_info on cards is often the UUID primary key — map both.
        // We also keep a reverse map from UUID → set_id via a second pass below.
    }

    // Rebuild UUID → set_code using the raw JSON (id field).
    let sets_raw: Vec<Value> = client
        .get(&sets_url)
        .header("Origin", "https://bilgewatermarket.com")
        .header("Referer", "https://bilgewatermarket.com/")
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    let mut uuid_to_code = std::collections::HashMap::new();
    for row in &sets_raw {
        if let (Some(id), Some(code)) = (
            row.get("id").and_then(|v| v.as_str()),
            row.get("set_id").and_then(|v| v.as_str()),
        ) {
            uuid_to_code.insert(id.to_string(), code.to_string());
        }
    }
    let _ = set_uuid_to_code;

    // Paginate public cards.
    let mut page = 1i64;
    let mut imported = 0i64;
    loop {
        let url = format!("{base}/api/public/cards?page={page}&sort_by=card_id&sort_order=asc");
        info!(%url, page, "Bilgewater public cards page");
        let batch: PublicCardsPage = client
            .get(&url)
            .header("Origin", "https://bilgewatermarket.com")
            .header("Referer", "https://bilgewatermarket.com/")
            .send()
            .await
            .with_context(|| format!("GET {url}"))?
            .error_for_status()?
            .json()
            .await
            .context("decode Bilgewater public cards")?;

        for item in &batch.items {
            let en = item.en_card.as_ref().or(item.cn_card.as_ref());
            let Some(en) = en else { continue };
            let Some(name) = en.name.as_deref() else { continue };

            let public_code = item
                .card_id
                .split('/')
                .next()
                .unwrap_orXitem.card_id.as_str())
                .to_string();
            let set_code = item
                .set_info
                .as_ref()
                .and_then(|uuid| uuid_to_code.get(uuid).cloned())
                .or_else(|| {
                    // Fallback: prefix of public code (RAD-004 → RAD)
                    public_code
                        .split('-')
                        .next()
                        .map(|s| s.to_string())
                });

            let mut domains = Vec::new();
            domain_fixes::apply_to_domains(name, &mut domains);

            let id = if public_code.is_empty() {
                db::slugify_card_id(name)
            } else {
                public_code.clone()
            };

            // Don't wipe OpenRift domains if we have none from Bilgewater.
            let existing = db::get_card(pool, &id).await?;
            let domains = if domains.is_empty() {
                existing
                    .as_ref()
                    .and_then(|c| serde_json::from_str(&c.domains_json).ok())
                    .unwrap_or_default()
            } else {
                domains
            };

            let banned = en.is_banned.unwrap_or(false);
            let rarity = en.rarity.as_deref();
            let variation = item.print_variation.as_deref().unwrap_or("normal");
            let raw = serde_json::json!({
                "card_id": item.card_id,
                "print_variation": variation,
                "set_info": item.set_info,
            });

            db::upsert_game_card(
                pool,
                &id,
                "riftbound",
                name,
                None,
                &domains,
                &[],
                None,
                None,
                None,
                rarity,
                set_code.as_deref(),
                Some(item.card_id.as_str()),
                None,
                 None,
                 None,
                 None,
                 None,
                 banned,
                "bilgewater",
                Some(&raw.to_string()),
            )
            .await?;

            // Alias by name slug so deck lines resolve.
            let name_id = db::slugify_card_id(name);
            if name_id != id {
                db::upsert_game_card(
                    pool,
                    &name_id,
                    "riftbound",
                    name,
                    None,
                    &domains,
                    &[],
                    None,
                    None,
                    None,
                    rarity,
                    set_code.as_deref(),
                    Some(item.card_id.as_str()),
                    None,
                    None,
                    None,
                    None,
                    None,
                    banned,
                    "bilgewater",
                    None,
                )
                .await?;
            }

            imported += 1;
        }

        info!(
            page,
            page_size = batch.page_size,
            total = batch.total,
            imported,
            "Bilgewater page done"
        );

        if !batch.has_more {
            break;
        }
        page += 1;
        if delay_ms > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
        }
        // Safety cap — catalog is ~2.3k printings.
        if page > 200 {
            break;
        }
    }

    // Re-apply domain fixes after price/print merge.
    let fixes = domain_fixes::sync(pool).await?;

    Ok(SyncReport {
        tournaments: 0,
        decks: 0,
        cards: imported,
        message: format!(
            "imported {imported} Bilgewater printings across {} sets; {}",
            sets.len(),
            fixes.message
        ),
    })
}

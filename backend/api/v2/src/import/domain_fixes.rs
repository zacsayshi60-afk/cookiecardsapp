//! Known bad domain classifications that show up in scraped / local gallery data.
//!
//! OpenRift (and official Riftbound printings) treat these as:
//! - **Brawl** → Fury (local gallery incorrectly had Chaos)
//! - **Supernova** → Mind (local gallery incorrectly had Order)

use anyhow::Result;
use sqlx::SqlitePool;
use tracing::info;

use crate::db;
use crate::import::SyncReport;

/// Canonical domain overrides keyed by English card name.
pub fn override_for(name: &str) -> Option<&'static [&'static str]> {
    match name {
        "Brawl" => Some(&["Fury"]),
        "Supernova" => Some(&["Mind"]),
        _ => None,
    }
}

pub fn apply_to_domains(name: &str, domains: &mut Vec<String>) -> bool {
    let Some(fixed) = override_for(name) else {
        return false;
    };
    let next: Vec<String> = fixed.iter().map(|d| (*d).to_string()).collect();
    if *domains == next {
        return false;
    }
    *domains = next;
    true
}

/// Title-case a domain token from OpenRift (`fury` → `Fury`).
pub fn title_domain(raw: &str) -> String {
    let mut chars = raw.chars();
    match chars.next() {
        None => String::new(),
        Some(f) => f.to_uppercase().collect::<String>() + chars.as_str(),
    }
}

pub fn normalize_domains(raw: &[String]) -> Vec<String> {
    raw.iter().map(|d| title_domain(d)).collect()
}

/// Rewrite any already-imported Riftbound cards that match the override table.
pub async fn sync(pool: &SqlitePool) -> Result<SyncReport> {
    let mut fixed = 0i64;
    for (name, domains) in [("Brawl", &["Fury"][..]), ("Supernova", &["Mind"][..])] {
        let id = db::slugify_card_id(name);
        if let Some(card) = db::get_card(pool, &id).await? {
            let current: Vec<String> =
                serde_json::from_str(&card.domains_json).unwrap_or_default();
            let want: Vec<String> = domains.iter().map(|s| (*s).to_string()).collect();
            if current != want {
                db::upsert_enriched_card(
                    pool,
                    &card.id,
                    &card.name,
                    card.card_type.as_deref(),
                    &want,
                    card.energy,
                    card.might,
                    card.power,
                    card.rarity.as_deref(),
                    card.set_code.as_deref(),
                    card.public_code.as_deref(),
                    card.image_url.as_deref(),
                    card.is_banned != 0,
                    "domain_fix",
                    None,
                )
                .await?;
                fixed += 1;
            }
        }
        // Also fix by exact name match in case id differs.
        fixed += db::fix_card_domains_by_name(pool, name, domains).await?;
    }
    info!(fixed, "applied Riftbound domain corrections");
    Ok(SyncReport {
        tournaments: 0,
        decks: 0,
        cards: fixed,
        message: format!("applied domain fixes to {fixed} card rows"),
    })
}

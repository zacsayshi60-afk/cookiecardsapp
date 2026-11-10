//! Import Flesh and Blood cards for the Rathe Archive.
//!
//! Fabrary.net itself does not publish a documented bulk card API. Card data is
//! maintained in [the-fab-cube/flesh-and-blood-cards](https://github.com/the-fab-cube/flesh-and-blood-cards)
//! (the same dataset Fabrary uses). Decks can still be pulled from Fabrary deck
//! pages when a URL is provided.

use anyhow::{Context, Result};
use regex::Regex;
use serde::Deserialize;
use sqlx::SqlitePool;
use tracing::info;

use crate::db;
use crate::import::SyncReport;

#[derive(Debug, Deserialize)]
struct FabCubeCard {
    unique_id: Option<String>,
    name: String,
    color: Option<String>,
    pitch: Option<String>,
    cost: Option<String>,
    power: Option<String>,
    defense: Option<String>,
    #[serde(default)]
    types: Vec<String>,
    #[serde(default)]
    card_keywords: Vec<String>,
    functional_text: Option<String>,
    #[serde(default)]
    printings: Vec<FabPrinting>,
}

#[derive(Debug, Deserialize)]
struct FabPrinting {
    id: Option<String>,
    set_id: Option<String>,
    #[serde(default)]
    image_url: Option<String>,
}

pub async fn sync(pool: &SqlitePool, cards_url: &str) -> Result<SyncReport> {
    info!(%cards_url, "downloading FaB card JSON (Fabrary source dataset)");
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(180))
        .user_agent("CardessyImporter/0.1 (rathe/fabrary card sync)")
        .build()?;

    let cards: Vec<FabCubeCard> = client
        .get(cards_url)
        .send()
        .await
        .with_context(|| format!("GET {cards_url}"))?
        .error_for_status()
        .with_context(|| format!("HTTP error for {cards_url}"))?
        .json()
        .await
        .context("decode FaB card JSON")?;

    let mut sets = std::collections::BTreeSet::new();
    let mut count = 0i64;

    for card in &cards {
        let set_code = card
            .printings
            .first()
            .and_then(|p| p.set_id.clone())
            .or_else(|| {
                // pitch/color still useful for filtering even without a set
                None
            });
        if let Some(set) = &set_code {
            sets.insert(set.clone());
        }

        let id = card
            .unique_id
            .clone()
            .unwrap_or_else(|| db::slugify_card_id(&card.name));
        let card_type = if card.types.is_empty() {
            None
        } else {
            Some(card.types.join(" "))
        };
        let power = card.power.as_deref().and_then(|p| p.parse::<i64>().ok());
        let pitch = card.color.clone().or_else(|| {
            card.pitch.as_ref().map(|p| match p.as_str() {
                "1" => "red".into(),
                "2" => "yellow".into(),
                "3" => "blue".into(),
                other => other.to_lowercase(),
            })
        });
        let image = card
            .printings
            .iter()
            .find_map(|p| p.image_url.clone())
            .or_else(|| {
                card.printings
                    .first()
                    .and_then(|p| p.id.as_ref())
                    .map(|id| {
                        format!(
                            "https://legendstory-production-s3-public.s3.amazonaws.com/media/cards/normal/{id}.webp"
                        )
                    })
            });
        let text = card.functional_text.clone().or_else(|| {
            if card.card_keywords.is_empty() {
                None
            } else {
                Some(card.card_keywords.join(", "))
            }
        });
        let public_code = card.printings.first().and_then(|p| p.id.clone());

        db::upsert_game_card(
            pool,
            &id,
            "fab",
            &card.name,
            card_type.as_deref(),
            &[],
            &[],
            None,
            None,
            power,
            None,
            set_code.as_deref(),
            public_code.as_deref(),
            image.as_deref(),
            pitch.as_deref(),
            card.cost.as_deref(),
            card.defense.as_deref(),
            text.as_deref(),
            false,
            "fabrary",
            None,
        )
        .await?;
        count += 1;
    }

    for set in &sets {
        db::upsert_card_set(pool, "fab", set, set, Some("set"), None, "fabrary", None)
            .await?;
    }

    info!(cards = count, sets = sets.len(), "FaB cards imported");
    Ok(SyncReport {
        tournaments: 0,
        decks: 0,
        cards: count,
        message: format!(
            "imported {count} FaB cards from Fabrary source dataset across {} sets",
            sets.len()
        ),
    })
}

/// Import a single Fabrary deck page (`https://fabrary.net/decks/...`).
pub async fn import_deck_url(pool: &SqlitePool, url: &str) -> Result<SyncReport> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .user_agent("CardessyImporter/0.1 (fabrary deck import)")
        .build()?;
    let html = client
        .get(url)
        .send()
        .await
        .with_context(|| format!("GET {url}"))?
        .error_for_status()?
        .text()
        .await?;

    let title_re = Regex::new(r"(?i)<title>([^<]+)</title>").unwrap();
    let name = title_re
        .captures(&html)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().replace(" | FaBrary", "").trim().to_string())
        .unwrap_or_else(|| "Fabrary deck".into());

    // Lines like: 3x Snatch (red)
    let line_re = Regex::new(
        r"(?m)^\s*(\d+)x\s+(.+?)(?:\s+\((red|yellow|blue)\))?\s*$",
    )
    .unwrap();
    let mut lines = Vec::new();
    let mut section = "Deck".to_string();
    for raw_line in html.lines() {
        let line = raw_line.trim();
        if line.eq_ignore_ascii_case("Arena cards") || line.eq_ignore_ascii_case("Equipment") {
            section = "Equipment".into();
            continue;
        }
        if line.eq_ignore_ascii_case("Deck cards") {
            section = "Deck".into();
            continue;
        }
        if let Some(cap) = line_re.captures(line) {
            let qty: i64 = cap[1].parse().unwrap_or(1);
            let card_name = cap[2].trim().to_string();
            let pitch = cap
                .get(3)
                .map(|m| m.as_str().to_string())
                .unwrap_or_default();
            lines.push((section.clone(), card_name, qty, pitch));
        }
    }

    let id = db::slugify_card_id(&format!("fabrary-{name}"));
    db::upsert_game_deck(
        pool,
        &id,
        "fab",
        &name,
        None,
        None,
        None,
        None,
        None,
        None,
        Some(url),
        "fabrary",
        None,
    )
    .await?;
    db::replace_game_deck_cards(pool, &id, &lines).await?;

    Ok(SyncReport {
        tournaments: 0,
        decks: 1,
        cards: lines.len() as i64,
        message: format!("imported Fabrary deck '{name}' with {} lines", lines.len()),
    })
}

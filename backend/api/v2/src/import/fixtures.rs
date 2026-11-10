//! Offline sample data shaped like RiftDecks.com exports.
//!
//! Use this when Cloudflare blocks live crawl, in CI, or for local demos.

use std::path::Path;

use anyhow::{Context, Result};
use serde::Deserialize;
use sqlx::SqlitePool;
use tracing::info;

use crate::db;
use crate::import::SyncReport;
use crate::models::{
    LegendMeta, ParsedDeckCard, ParsedDeckDetail, ParsedDeckSummary, ParsedTournament,
};

#[derive(Debug, Deserialize)]
struct FixtureBundle {
    tournaments: Vec<ParsedTournament>,
    decks: Vec<FixtureDeck>,
    #[serde(default)]
    legend_meta: Vec<LegendMeta>,
    #[serde(default)]
    cards: Vec<FixtureCard>,
}

#[derive(Debug, Deserialize)]
struct FixtureDeck {
    #[serde(flatten)]
    summary: ParsedDeckSummary,
    tournament_id: Option<i64>,
    event_date: Option<String>,
    cards: Vec<ParsedDeckCard>,
}

#[derive(Debug, Deserialize)]
struct FixtureCard {
    id: String,
    name: String,
    card_type: Option<String>,
    #[serde(default)]
    domains: Vec<String>,
    energy: Option<i64>,
    might: Option<i64>,
    power: Option<i64>,
    rarity: Option<String>,
    set_code: Option<String>,
    public_code: Option<String>,
    image_url: Option<String>,
    #[serde(default)]
    is_banned: bool,
}

pub async fn sync(pool: &SqlitePool, dir: &Path) -> Result<SyncReport> {
    let path = dir.join("riftdecks_sample.json");
    let raw = tokio::fs::read_to_string(&path)
        .await
        .with_context(|| format!("read fixtures from {}", path.display()))?;
    let bundle: FixtureBundle =
        serde_json::from_str(&raw).context("parse fixtures/riftdecks_sample.json")?;

    for legend in &bundle.legend_meta {
        db::upsert_legend_meta(pool, legend).await?;
    }

    let mut card_count = 0i64;
    for card in &bundle.cards {
        db::upsert_enriched_card(
            pool,
            &card.id,
            &card.name,
            card.card_type.as_deref(),
            &card.domains,
            card.energy,
            card.might,
            card.power,
            card.rarity.as_deref(),
            card.set_code.as_deref(),
            card.public_code.as_deref(),
            card.image_url.as_deref(),
            card.is_banned,
            "fixtures",
            None,
        )
        .await?;
        card_count += 1;
    }

    let mut tournament_count = 0i64;
    for t in &bundle.tournaments {
        db::upsert_tournament(pool, t).await?;
        tournament_count += 1;
    }

    let mut deck_count = 0i64;
    for deck in &bundle.decks {
        let detail = ParsedDeckDetail {
            summary: deck.summary.clone(),
            tournament_id: deck.tournament_id,
            event_date: deck.event_date.clone(),
            cards: deck.cards.clone(),
        };
        card_count += detail.cards.len() as i64;
        db::upsert_deck(pool, &detail).await?;
        deck_count += 1;
    }

    info!(
        tournaments = tournament_count,
        decks = deck_count,
        cards = card_count,
        "fixtures imported"
    );

    Ok(SyncReport {
        tournaments: tournament_count,
        decks: deck_count,
        cards: card_count,
        message: format!(
            "loaded fixtures from {}: {tournament_count} tournaments, {deck_count} decks",
            path.display()
        ),
    })
}

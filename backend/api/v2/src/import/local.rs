//! Seed the database from checked-in JSON fixtures derived from the app's
//! local TypeScript data (gallery / rathe / magisterium), with domain fixes applied.

use anyhow::{Context, Result};
use serde::Deserialize;
use sqlx::SqlitePool;
use tracing::info;

use crate::db;
use crate::import::domain_fixes;
use crate::import::SyncReport;
use crate::models::MagicMetaRow;

#[derive(Debug, Deserialize)]
struct GalleryFile {
    sets: Vec<GallerySet>,
    cards: Vec<GalleryCard>,
}

#[derive(Debug, Deserialize)]
struct GallerySet {
    id: String,
    name: String,
    category: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GalleryCard {
    id: String,
    code: Option<String>,
    name: String,
    #[serde(rename = "setId")]
    set_id: Option<String>,
    set: Option<String>,
    rarity: Option<String>,
    image: Option<String>,
    banned: Option<bool>,
    domains: Option<Vec<String>>,
    kind: Option<String>,
    energy: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct PoolFile {
    cards: Vec<PoolCard>,
}

#[derive(Debug, Deserialize)]
struct PoolCard {
    id: String,
    name: String,
    kind: Option<String>,
    domains: Option<Vec<String>>,
    energy: Option<i64>,
    might: Option<i64>,
    text: Option<String>,
    set: Option<String>,
    image: Option<String>,
}

#[derive(Debug, Deserialize)]
struct FabCardsFile {
    cards: Vec<FabCard>,
}

#[derive(Debug, Deserialize)]
struct FabCard {
    id: String,
    name: String,
    pitch: Option<String>,
    cost: Option<String>,
    power: Option<String>,
    defense: Option<String>,
    #[serde(rename = "type")]
    card_type: Option<String>,
    text: Option<String>,
    image: Option<String>,
    set: Option<String>,
}

#[derive(Debug, Deserialize)]
struct FabDecksFile {
    decks: Vec<FabDeck>,
}

#[derive(Debug, Deserialize)]
struct FabDeck {
    id: String,
    name: String,
    hero: Option<String>,
    player: Option<String>,
    event: Option<String>,
    format: Option<String>,
    date: Option<String>,
    source: Option<String>,
    #[serde(rename = "fabraryId")]
    fabrary_id: Option<String>,
    cards: Vec<FabDeckCard>,
}

#[derive(Debug, Deserialize)]
struct FabDeckCard {
    section: Option<String>,
    name: String,
    pitch: Option<String>,
    count: i64,
}

#[derive(Debug, Deserialize)]
struct MagicFile {
    cards: Vec<MagicCard>,
    #[serde(default)]
    decks: Vec<MagicDeck>,
}

#[derive(Debug, Deserialize)]
struct MagicCard {
    id: String,
    name: String,
    cost: Option<String>,
    #[serde(rename = "type")]
    card_type: Option<String>,
    colors: Option<Vec<String>>,
    rarity: Option<String>,
    set: Option<String>,
    image: Option<String>,
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MagicDeck {
    id: String,
    name: String,
    format: Option<String>,
    note: Option<String>,
    source: Option<String>,
    cards: Vec<MagicDeckCard>,
    #[serde(default)]
    side: Vec<MagicDeckCard>,
}

#[derive(Debug, Deserialize)]
struct MagicDeckCard {
    name: String,
    count: i64,
}

#[derive(Debug, Deserialize)]
struct MagicMetaFile {
    meta: Vec<MagicMetaIn>,
}

#[derive(Debug, Deserialize)]
struct MagicMetaIn {
    name: String,
    share: Option<String>,
    win: Option<String>,
    decks: Option<String>,
    tier: Option<String>,
}

pub async fn sync(pool: &SqlitePool, fixtures_dir: &std::path::Path) -> Result<SyncReport> {
    let mut cards = 0i64;
    let mut decks = 0i64;

    cards += import_riftbound(pool, fixtures_dir).await?;
    let (fab_cards, fab_decks) = import_rathe(pool, fixtures_dir).await?;
    cards += fab_cards;
    decks += fab_decks;
    let (magic_cards, magic_decks) = import_magisterium(pool, fixtures_dir).await?;
    cards += magic_cards;
    decks += magic_decks;

    let fixes = domain_fixes::sync(pool).await?;
    cards += fixes.cards;

    Ok(SyncReport {
        tournaments: 0,
        decks,
        cards,
        message: format!(
            "local fixtures: {cards} cards, {decks} decks; {}",
            fixes.message
        ),
    })
}

async fn import_riftbound(pool: &SqlitePool, fixtures_dir: &std::path::Path) -> Result<i64> {
    let mut count = 0i64;
    let gallery_path = fixtures_dir.join("riftbound/gallery_cards.json");
    if gallery_path.exists() {
        let raw = tokio::fs::read_to_string(&gallery_path)
            .await
            .with_context(|| format!("read {}", gallery_path.display()))?;
        let file: GalleryFile = serde_json::from_str(&raw)?;
        for set in &file.sets {
            db::upsert_card_set(
                pool,
                "riftbound",
                &set.id,
                &set.name,
                set.category.as_deref(),
                None,
                "local",
                None,
            )
            .await?;
        }
        for card in &file.cards {
            let mut domains = card.domains.clone().unwrap_or_default();
            domain_fixes::apply_to_domains(&card.name, &mut domains);
            let set_code = card.set_id.clone().or_else(|| {
                card.set.as_ref().map(|s| {
                    // Prefer short codes already present.
                    s.clone()
                })
            });
            db::upsert_game_card(
                pool,
                &card.id,
                "riftbound",
                &card.name,
                card.kind.as_deref(),
                &domains,
                &[],
                card.energy,
                None,
                None,
                card.rarity.as_deref(),
                set_code.as_deref(),
                card.code.as_deref(),
                card.image.as_deref(),
                None,
                None,
                None,
                None,
                card.banned.unwrap_or(false),
                "local",
                None,
            )
            .await?;
            count += 1;
        }
        info!(cards = count, "imported local Riftbound gallery");
    }

    let pool_path = fixtures_dir.join("riftbound/pool_cards.json");
    if pool_path.exists() {
        let raw = tokio::fs::read_to_string(&pool_path).await?;
        let file: PoolFile = serde_json::from_str(&raw)?;
        for card in &file.cards {
            let mut domains = card.domains.clone().unwrap_or_default();
            domain_fixes::apply_to_domains(&card.name, &mut domains);
            // Derive set code from id prefix when possible (RAD-004 → RAD).
            let set_code = card.id.split('-').next().map(|s| s.to_string());
            db::upsert_game_card(
                pool,
                &card.id,
                "riftbound",
                &card.name,
                card.kind.as_deref(),
                &domains,
                &[],
                card.energy,
                card.might,
                None,
                None,
                set_code.as_deref().or(card.set.as_deref()),
                Some(card.id.as_str()),
                card.image.as_deref(),
                None,
                None,
                None,
                card.text.as_deref(),
                false,
                "local",
                None,
            )
            .await?;
            count += 1;
        }
    }

    Ok(count)
}

async fn import_rathe(pool: &SqlitePool, fixtures_dir: &std::path::Path) -> Result<(i64, i64)> {
    let mut cards_n = 0i64;
    let mut decks_n = 0i64;

    let cards_path = fixtures_dir.join("rathe/cards.json");
    if cards_path.exists() {
        let raw = tokio::fs::read_to_string(&cards_path).await?;
        let file: FabCardsFile = serde_json::from_str(&raw)?;
        let mut sets = std::collections::BTreeSet::new();
        for card in &file.cards {
            if let Some(set) = &card.set {
                sets.insert(set.clone());
            }
            let power = card
                .power
                .as_deref()
                .and_then(|p| p.parse::<i64>().ok());
            db::upsert_game_card(
                pool,
                &card.id,
                "fab",
                &card.name,
                card.card_type.as_deref(),
                &[],
                &[],
                None,
                None,
                power,
                None,
                card.set.as_deref(),
                Some(card.id.as_str()),
                card.image.as_deref(),
                card.pitch.as_deref(),
                card.cost.as_deref(),
                card.defense.as_deref(),
                card.text.as_deref(),
                false,
                "local",
                None,
            )
            .await?;
            cards_n += 1;
        }
        for set in sets {
            db::upsert_card_set(pool, "fab", &set, &set, Some("set"), None, "local", None)
                .await?;
        }
        info!(cards = cards_n, "imported local Rathe (FaB) cards");
    }

    let decks_path = fixtures_dir.join("rathe/decks.json");
    if decks_path.exists() {
        let raw = tokio::fs::read_to_string(&decks_path).await?;
        let file: FabDecksFile = serde_json::from_str(&raw)?;
        for deck in &file.decks {
            let source_url = deck.source.clone().or_else(|| {
                deck.fabrary_id
                    .as_ref()
                    .map(|id| format!("https://fabrary.net/decks/{id}"))
            });
            db::upsert_game_deck(
                pool,
                &deck.id,
                "fab",
                &deck.name,
                deck.hero.as_deref(),
                deck.player.as_deref(),
                deck.format.as_deref(),
                deck.event.as_deref(),
                deck.date.as_deref(),
                None,
                source_url.as_deref(),
                "local",
                None,
            )
            .await?;
            let mut lines = Vec::new();
            for line in &deck.cards {
                lines.push((
                    line.section.clone().unwrap_or_else(|| "Deck".into()),
                    line.name.clone(),
                    line.count,
                    line.pitch.clone().unwrap_or_default(),
                ));
            }
            db::replace_game_deck_cards(pool, &deck.id, &lines).await?;
            decks_n += 1;
        }
    }

    Ok((cards_n, decks_n))
}

async fn import_magisterium(
    pool: &SqlitePool,
    fixtures_dir: &std::path::Path,
) -> Result<(i64, i64)> {
    let mut cards_n = 0i64;
    let mut decks_n = 0i64;

    let cards_path = fixtures_dir.join("magisterium/cards.json");
    if cards_path.exists() {
        let raw = tokio::fs::read_to_string(&cards_path).await?;
        let file: MagicFile = serde_json::from_str(&raw)?;
        let mut sets = std::collections::BTreeSet::new();
        for card in &file.cards {
            if let Some(set) = &card.set {
                sets.insert(set.clone());
            }
            let colors = card.colors.clone().unwrap_or_default();
            db::upsert_game_card(
                pool,
                &card.id,
                "magic",
                &card.name,
                card.card_type.as_deref(),
                &[],
                &colors,
                None,
                None,
                None,
                card.rarity.as_deref(),
                card.set.as_deref(),
                None,
                card.image.as_deref(),
                None,
                card.cost.as_deref(),
                None,
                card.text.as_deref(),
                false,
                "local",
                None,
            )
            .await?;
            cards_n += 1;
        }
        for set in sets {
            db::upsert_card_set(
                pool,
                "magic",
                &set,
                &set,
                Some("set"),
                None,
                "local",
                None,
            )
            .await?;
        }

        for deck in &file.decks {
            db::upsert_game_deck(
                pool,
                &deck.id,
                "magic",
                &deck.name,
                None,
                None,
                deck.format.as_deref(),
                None,
                None,
                deck.note.as_deref(),
                deck.source.as_deref(),
                "local",
                None,
            )
            .await?;
            let mut lines = Vec::new();
            for line in &deck.cards {
                lines.push(("main".into(), line.name.clone(), line.count, String::new()));
            }
            for line in &deck.side {
                lines.push(("side".into(), line.name.clone(), line.count, String::new()));
            }
            db::replace_game_deck_cards(pool, &deck.id, &lines).await?;
            decks_n += 1;
        }
        info!(cards = cards_n, decks = decks_n, "imported local Magisterium");
    }

    let meta_path = fixtures_dir.join("magisterium/meta.json");
    if meta_path.exists() {
        let raw = tokio::fs::read_to_string(&meta_path).await?;
        let file: MagicMetaFile = serde_json::from_str(&raw)?;
        for row in file.meta {
            db::upsert_magic_meta(
                pool,
                &MagicMetaRow {
                    name: row.name,
                    share_pct: row.share,
                    win_pct: row.win,
                    decks: row.decks,
                    tier: row.tier,
                    updated_at: String::new(),
                },
            )
            .await?;
        }
    }

    Ok((cards_n, decks_n))
}

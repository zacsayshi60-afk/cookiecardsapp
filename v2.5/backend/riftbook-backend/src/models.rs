use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Card {
    pub id: String,
    pub name: String,
    pub card_type: Option<String>,
    pub domains_json: String,
    pub energy: Option<i64>,
    pub might: Option<i64>,
    pub power: Option<i64>,
    pub rarity: Option<String>,
    pub set_code: Option<String>,
    pub public_code: Option<String>,
    pub image_url: Option<String>,
    pub is_banned: i64,
    pub source: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Tournament {
    pub id: i64,
    pub slug: String,
    pub name: String,
    pub host: Option<String>,
    pub country: Option<String>,
    pub event_date: Option<String>,
    pub meta: Option<String>,
    pub format: Option<String>,
    pub player_count: Option<i64>,
    pub source_url: String,
    pub imported_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Deck {
    pub id: i64,
    pub tournament_id: Option<i64>,
    pub name: String,
    pub player_name: Option<String>,
    pub legend: Option<String>,
    pub archetype: Option<String>,
    pub meta: Option<String>,
    pub rank_label: Option<String>,
    pub record: Option<String>,
    pub placement: Option<i64>,
    pub card_count: Option<i64>,
    pub price_usd: Option<f64>,
    pub spiciness_pct: Option<f64>,
    pub event_date: Option<String>,
    pub source_url: String,
    pub imported_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DeckCard {
    pub deck_id: i64,
    pub section: String,
    pub card_name: String,
    pub quantity: i64,
    pub price_usd: Option<f64>,
    pub card_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LegendMeta {
    pub legend: String,
    pub meta_share_pct: Option<f64>,
    pub total_decks: Option<i64>,
    pub top8_count: Option<i64>,
    pub avg_price_usd: Option<f64>,
    pub tier: Option<String>,
    #[serde(default)]
    pub win_rate_pct: Option<f64>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SyncRun {
    pub id: i64,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub source: String,
    pub status: String,
    pub tournaments: i64,
    pub decks: i64,
    pub cards: i64,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeckDetail {
    #[serde(flatten)]
    pub deck: Deck,
    pub cards: Vec<DeckCard>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatsResponse {
    pub cards: i64,
    pub decks: i64,
    pub tournaments: i64,
    pub deck_cards: i64,
    pub last_sync: Option<SyncRun>,
}

/// Parsed tournament row from a RiftDecks list / detail page (not yet in DB).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedTournament {
    pub id: i64,
    pub slug: String,
    pub name: String,
    pub host: Option<String>,
    pub country: Option<String>,
    pub event_date: Option<String>,
    pub meta: Option<String>,
    pub format: Option<String>,
    pub player_count: Option<i64>,
    pub source_url: String,
}

/// Parsed deck summary linking to a full deck page.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedDeckSummary {
    pub id: i64,
    pub slug: String,
    pub name: String,
    pub player_name: Option<String>,
    pub legend: Option<String>,
    pub rank_label: Option<String>,
    pub record: Option<String>,
    pub price_usd: Option<f64>,
    pub spiciness_pct: Option<f64>,
    pub card_count: Option<i64>,
    pub meta: Option<String>,
    pub source_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedDeckCard {
    pub section: String,
    pub card_name: String,
    pub quantity: i64,
    pub price_usd: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedDeckDetail {
    pub summary: ParsedDeckSummary,
    pub tournament_id: Option<i64>,
    pub event_date: Option<String>,
    pub cards: Vec<ParsedDeckCard>,
}

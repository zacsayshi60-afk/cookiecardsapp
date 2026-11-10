use std::sync::Arc;

use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::{Html, IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Deserialize;
use sqlx::SqlitePool;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

use crate::config::SyncSource;
use crate::db::{self, CardFilter};
use crate::import::{self, SyncOptions};

#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/", get(index))
        .route("/health", get(health))
        .route("/api/v1/stats", get(stats))
        // Riftbound — also available under legacy /api/v1/cards
        .route("/api/v1/cards", get(list_riftbound_cards))
        .route("/api/v1/cards/{id}", get(get_card))
        .route("/api/v1/riftbound/cards", get(list_riftbound_cards))
        .route("/api/v1/riftbound/cards/{id}", get(get_card))
        .route("/api/v1/riftbound/sets", get(list_riftbound_sets))
        .route("/api/v1/tournaments", get(list_tournaments))
        .route("/api/v1/tournaments/{id}", get(get_tournament))
        .route("/api/v1/decks", get(list_decks))
        .route("/api/v1/decks/{id}", get(get_deck))
        .route("/api/v1/meta/legends", get(list_legends))
        // Rathe Archive (Flesh and Blood)
        .route("/api/v1/rathe/cards", get(list_rathe_cards))
        .route("/api/v1/rathe/cards/{id}", get(get_card))
        .route("/api/v1/rathe/sets", get(list_rathe_sets))
        .route("/api/v1/rathe/decks", get(list_rathe_decks))
        .route("/api/v1/rathe/decks/{id}", get(get_game_deck))
        // Magisterium (Magic)
        .route("/api/v1/magisterium/cards", get(list_magic_cards))
        .route("/api/v1/magisterium/cards/{id}", get(get_card))
        .route("/api/v1/magisterium/sets", get(list_magic_sets))
        .route("/api/v1/magisterium/decks", get(list_magic_decks))
        .route("/api/v1/magisterium/decks/{id}", get(get_game_deck))
        .route("/api/v1/magisterium/meta", get(list_magic_meta))
        .route("/api/v1/sync/runs", get(list_sync_runs))
        .route("/api/v1/sync", post(trigger_sync))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(Arc::new(state))
}

async fn index() -> Html<&'static str> {
    Html(
        r#"<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Cardessy API</title>
  <style>
    :root { color-scheme: light; --ink:#1c1917; --muted:#57534e; --bg:#fafaf9; --accent:#0f766e; }
    body { margin:0; font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
           background: radial-gradient(1200px 600px at 10% -10%, #ccfbf1, transparent),
                       linear-gradient(160deg, #fafaf9, #f5f5f4 40%, #ecfdf5);
           color: var(--ink); min-height:100vh; }
    main { max-width: 760px; margin: 0 auto; padding: 3.5rem 1.25rem 4rem; }
    h1 { font-size: clamp(2.2rem, 5vw, 3.2rem); letter-spacing: -0.03em; margin: 0 0 0.4rem; }
    p { color: var(--muted); line-height: 1.55; font-size: 1.05rem; }
    code, a { color: var(--accent); }
    ul { line-height: 1.7; padding-left: 1.1rem; }
    .tag { display:inline-block; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
           font-size: 0.78rem; border:1px solid #99f6e4; background:#f0fdfa; padding:0.2rem 0.5rem;
           margin-bottom: 1rem; }
  </style>
</head>
<body>
  <main>
    <div class="tag">CARDESSY API</div>
    <h1>Cardessy</h1>
    <p>One SQLite database for <strong>Riftbound</strong> (RiftDecks + Bilgewater + OpenRift),
       <strong>Rathe</strong> (Fabrary / FaB), and <strong>Magisterium</strong> (Scryfall / Gatherer).</p>
    <ul>
      <li><a href="/health"><code>/health</code></a></li>
      <li><a href="/api/v1/stats"><code>/api/v1/stats</code></a></li>
      <li><a href="/api/v1/riftbound/cards?limit=20"><code>/api/v1/riftbound/cards</code></a> — filter <code>set</code>, <code>domain</code></li>
      <li><a href="/api/v1/rathe/cards?limit=20"><code>/api/v1/rathe/cards</code></a> — filter <code>set</code>, <code>pitch</code></li>
      <li><a href="/api/v1/magisterium/cards?limit=20"><code>/api/v1/magisterium/cards</code></a> — filter <code>set</code>, <code>color</code></li>
      <li><a href="/api/v1/decks"><code>/api/v1/decks</code></a> (RiftDecks)</li>
    </ul>
    <p>Sync: <code>cardessy sync --source local</code> then <code>--source all</code>.</p>
  </main>
</body>
</html>"#,
    )
}

async fn health() -> impl IntoResponse {
    Json(serde_json::json!({ "ok": true, "service": "cardessy" }))
}

async fn stats(State(state): State<Arc<AppState>>) -> Result<impl IntoResponse, ApiError> {
    let stats = db::stats(&state.pool).await.map_err(ApiError::internal)?;
    Ok(Json(stats))
}

#[derive(Debug, Deserialize)]
struct PageQuery {
    q: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
    tournament_id: Option<i64>,
    legend: Option<String>,
    /// Set code (RAD, OGN, MH3, …) or set name for Magic fixtures.
    set: Option<String>,
    domain: Option<String>,
    color: Option<String>,
    pitch: Option<String>,
    rarity: Option<String>,
    #[serde(rename = "type")]
    card_type: Option<String>,
}

fn clamp_limit(limit: Option<i64>) -> i64 {
    limit.unwrap_or(50).clamp(1, 200)
}

fn card_filter(game: &str, q: &PageQuery) -> CardFilter {
    CardFilter {
        game: Some(game.into()),
        q: q.q.clone(),
        set_code: q.set.clone(),
        domain: q.domain.clone(),
        color: q.color.clone(),
        pitch: q.pitch.clone(),
        rarity: q.rarity.clone(),
        card_type: q.card_type.clone(),
        limit: clamp_limit(q.limit),
        offset: q.offset.unwrap_or(0).max(0),
    }
}

async fn list_riftbound_cards(
    State(state): State<Arc<AppState>>,
    Query(q): Query<PageQuery>,
) -> Result<impl IntoResponse, ApiError> {
    let cards = db::list_cards_filtered(&state.pool, card_filter("riftbound", &q))
        .await
        .map_err(ApiError::internal)?;
    Ok(Json(cards))
}

async fn list_rathe_cards(
    State(state): State<Arc<AppState>>,
    Query(q): Query<PageQuery>,
) -> Result<impl IntoResponse, ApiError> {
    let cards = db::list_cards_filtered(&state.pool, card_filter("fab", &q))
        .await
        .map_err(ApiError::internal)?;
    Ok(Json(cards))
}

async fn list_magic_cards(
    State(state): State<Arc<AppState>>,
    Query(q): Query<PageQuery>,
) -> Result<impl IntoResponse, ApiError> {
    let cards = db::list_cards_filtered(&state.pool, card_filter("magic", &q))
        .await
        .map_err(ApiError::internal)?;
    Ok(Json(cards))
}

async fn get_card(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    match db::get_card(&state.pool, &id)
        .await
        .map_err(ApiError::internal)?
    {
        Some(card) => Ok(Json(card).into_response()),
        None => Err(ApiError::not_found("card not found")),
    }
}

async fn list_riftbound_sets(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, ApiError> {
    let rows = db::list_card_sets(&state.pool, "riftbound")
        .await
        .map_err(ApiError::internal)?;
    Ok(Json(rows))
}

async fn list_rathe_sets(State(state): State<Arc<AppState>>) -> Result<impl IntoResponse, ApiError> {
    let rows = db::list_card_sets(&state.pool, "fab")
        .await
        .map_err(ApiError::internal)?;
    Ok(Json(rows))
}

async fn list_magic_sets(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, ApiError> {
    let rows = db::list_card_sets(&state.pool, "magic")
        .await
        .map_err(ApiError::internal)?;
    Ok(Json(rows))
}

async fn list_tournaments(
    State(state): State<Arc<AppState>>,
    Query(q): Query<PageQuery>,
) -> Result<impl IntoResponse, ApiError> {
    let rows = db::list_tournaments(
        &state.pool,
        clamp_limit(q.limit),
        q.offset.unwrap_or(0).max(0),
    )
    .await
    .map_err(ApiError::internal)?;
    Ok(Json(rows))
}

async fn get_tournament(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
) -> Result<impl IntoResponse, ApiError> {
    match db::get_tournament(&state.pool, id)
        .await
        .map_err(ApiError::internal)?
    {
        Some(row) => Ok(Json(row).into_response()),
        None => Err(ApiError::not_found("tournament not found")),
    }
}

async fn list_decks(
    State(state): State<Arc<AppState>>,
    Query(q): Query<PageQuery>,
) -> Result<impl IntoResponse, ApiError> {
    let rows = db::list_decks(
        &state.pool,
        q.tournament_id,
        q.legend.as_deref(),
        clamp_limit(q.limit),
        q.offset.unwrap_or(0).max(0),
    )
    .await
    .map_err(ApiError::internal)?;
    Ok(Json(rows))
}

async fn get_deck(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
) -> Result<impl IntoResponse, ApiError> {
    match db::get_deck_detail(&state.pool, id)
        .await
        .map_err(ApiError::internal)?
    {
        Some(row) => Ok(Json(row).into_response()),
        None => Err(ApiError::not_found("deck not found")),
    }
}

async fn list_rathe_decks(
    State(state): State<Arc<AppState>>,
    Query(q): Query<PageQuery>,
) -> Result<impl IntoResponse, ApiError> {
    let rows = db::list_game_decks(
        &state.pool,
        "fab",
        clamp_limit(q.limit),
        q.offset.unwrap_or(0).max(0),
    )
    .await
    .map_err(ApiError::internal)?;
    Ok(Json(rows))
}

async fn list_magic_decks(
    State(state): State<Arc<AppState>>,
    Query(q): Query<PageQuery>,
) -> Result<impl IntoResponse, ApiError> {
    let rows = db::list_game_decks(
        &state.pool,
        "magic",
        clamp_limit(q.limit),
        q.offset.unwrap_or(0).max(0),
    )
    .await
    .map_err(ApiError::internal)?;
    Ok(Json(rows))
}

async fn get_game_deck(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    match db::get_game_deck(&state.pool, &id)
        .await
        .map_err(ApiError::internal)?
    {
        Some(row) => Ok(Json(row).into_response()),
        None => Err(ApiError::not_found("deck not found")),
    }
}

async fn list_legends(State(state): State<Arc<AppState>>) -> Result<impl IntoResponse, ApiError> {
    let rows = db::list_legend_meta(&state.pool)
        .await
        .map_err(ApiError::internal)?;
    Ok(Json(rows))
}

async fn list_magic_meta(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, ApiError> {
    let rows = db::list_magic_meta(&state.pool)
        .await
        .map_err(ApiError::internal)?;
    Ok(Json(rows))
}

async fn list_sync_runs(State(state): State<Arc<AppState>>) -> Result<impl IntoResponse, ApiError> {
    let rows = db::list_sync_runs(&state.pool, 20)
        .await
        .map_err(ApiError::internal)?;
    Ok(Json(rows))
}

#[derive(Debug, Deserialize)]
struct SyncBody {
    /// local | fixtures | riftdecks | openrift | bilgewater | fabrary | scryfall | gatherer | all
    #[serde(default = "default_source")]
    source: String,
    #[serde(default = "default_pages")]
    tournament_pages: u32,
    #[serde(default = "default_max_tournaments")]
    max_tournaments: u32,
    #[serde(default = "default_max_decks")]
    max_decks: u32,
    #[serde(default)]
    scryfall_bulk: bool,
}

fn default_source() -> String {
    "local".into()
}
fn default_pages() -> u32 {
    1
}
fn default_max_tournaments() -> u32 {
    3
}
fn default_max_decks() -> u32 {
    15
}

async fn trigger_sync(
    State(state): State<Arc<AppState>>,
    Json(body): Json<SyncBody>,
) -> Result<impl IntoResponse, ApiError> {
    let source = match body.source.to_ascii_lowercase().as_str() {
        "local" => SyncSource::Local,
        "fixtures" => SyncSource::Fixtures,
        "riftdecks" => SyncSource::Riftdecks,
        "openrift" => SyncSource::Openrift,
        "bilgewater" => SyncSource::Bilgewater,
        "fabrary" => SyncSource::Fabrary,
        "scryfall" => SyncSource::Scryfall,
        "gatherer" => SyncSource::Gatherer,
        "all" => SyncSource::All,
        other => {
            return Err(ApiError::bad_request(format!(
                "unknown source '{other}', expected local|fixtures|riftdecks|openrift|bilgewater|fabrary|scryfall|gatherer|all"
            )))
        }
    };

    let opts = SyncOptions {
        tournament_pages: body.tournament_pages,
        max_tournaments: body.max_tournaments,
        max_decks: body.max_decks,
        delay_ms: 750,
        riftdecks_base: "https://riftdecks.com".into(),
        openrift_base: "https://openrift.app".into(),
        bilgewater_base: "https://api.bilgewatermarket.com".into(),
        scryfall_base: "https://api.scryfall.com".into(),
        gatherer_base: "https://gatherer.wizards.com".into(),
        fab_cards_url: "https://raw.githubusercontent.com/the-fab-cube/flesh-and-blood-cards/develop/json/english/card.json".into(),
        fixtures_dir: std::path::PathBuf::from("fixtures"),
        scryfall_bulk: body.scryfall_bulk,
    };

    let report = import::run(&state.pool, source, opts)
        .await
        .map_err(ApiError::internal)?;

    Ok((
        StatusCode::OK,
        Json(serde_json::json!({
            "ok": true,
            "tournaments": report.tournaments,
            "decks": report.decks,
            "cards": report.cards,
            "message": report.message,
        })),
    ))
}

struct ApiError {
    status: StatusCode,
    message: String,
}

impl ApiError {
    fn internal(err: impl std::fmt::Display) -> Self {
        Self {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: err.to_string(),
        }
    }
    fn not_found(msg: impl Into<String>) -> Self {
        Self {
            status: StatusCode::NOT_FOUND,
            message: msh.into(),
        }
    }
    fn bad_request(msg: impl Into<String>) -> Self {
        Self {
            status: StatusCode::BAD_REQUEST,
            message: msh.into(),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(serde_json::json!({ "error": self.message })),
        )
            .into_response()
    }
}

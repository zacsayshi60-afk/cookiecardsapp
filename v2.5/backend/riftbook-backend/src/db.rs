use std::path::Path;

use anyhow::{Context, Result};
use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};

use crate::models::{
    Card, Deck, DeckCard, DeckDetail, LegendMeta, ParsedDeckDetail, ParsedTournament, StatsResponse,
    SyncRun, Tournament,
};

pub async fn connect(path: &Path) -> Result<SqlitePool> {
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .with_context(|| format!("create database directory {}", parent.display()))?;
    }

    let options = SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(true)
        .foreign_keys(true);

    let pool = SqlitePool::connect_with(options)
        .await
        .with_context(|| format!("open sqlite database {}", path.display()))?;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .context("run migrations")?;

    Ok(pool)
}

pub async fn begin_sync_run(pool: &SqlitePool, source: &str) -> Result<i64> {
    let result = sqlx::query(
        "INSERT INTO sync_runs (source, status) VALUES (?, 'running')",
    )
    .bind(source)
    .execute(pool)
    .await?;
    Ok(result.last_insert_rowid())
}

pub async fn finish_sync_run(
    pool: &SqlitePool,
    id: i64,
    status: &str,
    tournaments: i64,
    decks: i64,
    cards: i64,
    message: Option<&str>,
) -> Result<()> {
    sqlx::query(
        r#"
        UPDATE sync_runs
        SET finished_at = datetime('now'),
            status = ?,
            tournaments = ?,
            decks = ?,
            cards = ?,
            message = ?
        WHERE id = ?
        "#,
    )
    .bind(status)
    .bind(tournaments)
    .bind(decks)
    .bind(cards)
    .bind(message)
    .bind(id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn upsert_tournament(pool: &SqlitePool, t: &ParsedTournament) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO tournaments (
            id, slug, name, host, country, event_date, meta, format,
            player_count, source_url, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
            slug = excluded.slug,
            name = excluded.name,
            host = excluded.host,
            country = excluded.country,
            event_date = excluded.event_date,
            meta = excluded.meta,
            format = excluded.format,
            player_count = excluded.player_count,
            source_url = excluded.source_url,
            updated_at = datetime('now')
        "#,
    )
    .bind(t.id)
    .bind(&t.slug)
    .bind(&t.name)
    .bind(&t.host)
    .bind(&t.country)
    .bind(&t.event_date)
    .bind(&t.meta)
    .bind(&t.format)
    .bind(t.player_count)
    .bind(&t.source_url)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn upsert_deck(pool: &SqlitePool, d: &ParsedDeckDetail) -> Result<()> {
    let s = &d.summary;
    sqlx::query(
        r#"
        INSERT INTO decks (
            id, tournament_id, name, player_name, legend, archetype, meta,
            rank_label, record, placement, card_count, price_usd, spiciness_pct,
            event_date, source_url, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
            tournament_id = excluded.tournament_id,
            name = excluded.name,
            player_name = excluded.player_name,
            legend = excluded.legend,
            archetype = excluded.archetype,
            meta = excluded.meta,
            rank_label = excluded.rank_label,
            record = excluded.record,
            card_count = excluded.card_count,
            price_usd = excluded.price_usd,
            spiciness_pct = excluded.spiciness_pct,
            event_date = excluded.event_date,
            source_url = excluded.source_url,
            updated_at = datetime('now')
        "#,
    )
    .bind(s.id)
    .bind(d.tournament_id)
    .bind(&s.name)
    .bind(&s.player_name)
    .bind(&s.legend)
    .bind(Option::<String>::None)
    .bind(&s.meta)
    .bind(&s.rank_label)
    .bind(&s.record)
    .bind(s.card_count)
    .bind(s.price_usd)
    .bind(s.spiciness_pct)
    .bind(&d.event_date)
    .bind(&s.source_url)
    .execute(pool)
    .await?;

    sqlx::query("DELETE FROM deck_cards WHERE deck_id = ?")
        .bind(s.id)
        .execute(pool)
        .await?;

    for card in &d.cards {
        let card_id = slugify_card_id(&card.card_name);
        ensure_card_stub(pool, &card_id, &card.card_name).await?;

        sqlx::query(
            r#"
            INSERT INTO deck_cards (deck_id, section, card_name, quantity, price_usd, card_id)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(deck_id, section, card_name) DO UPDATE SET
                quantity = excluded.quantity,
                price_usd = excluded.price_usd,
                card_id = excluded.card_id
            "#,
        )
        .bind(s.id)
        .bind(&card.section)
        .bind(&card.card_name)
        .bind(card.quantity)
        .bind(card.price_usd)
        .bind(&card_id)
        .execute(pool)
        .await?;
    }

    Ok(())
}

pub async fn ensure_card_stub(pool: &SqlitePool, id: &str, name: &str) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO cards (id, name, source, updated_at)
        VALUES (?, ?, 'riftdecks', datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            updated_at = datetime('now')
        "#,
    )
    .bind(id)
    .bind(name)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn upsert_enriched_card(
    pool: &SqlitePool,
    id: &str,
    name: &str,
    card_type: Option<&str>,
    domains: &[String],
    energy: Option<i64>,
    might: Option<i64>,
    power: Option<i64>,
    rarity: Option<&str>,
    set_code: Option<&str>,
    public_code: Option<&str>,
    image_url: Option<&str>,
    is_banned: bool,
    source: &str,
    raw_json: Option<&str>,
) -> Result<()> {
    let domains_json = serde_json::to_string(domains)?;
    sqlx::query(
        r#"
        INSERT INTO cards (
            id, name, card_type, domains_json, energy, might, power, rarity,
            set_code, public_code, image_url, is_banned, source, raw_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            card_type = COALESCE(excluded.card_type, cards.card_type),
            domains_json = excluded.domains_json,
            energy = COALESCE(excluded.energy, cards.energy),
            might = COALESCE(excluded.might, cards.might),
            power = COALESCE(excluded.power, cards.power),
            rarity = COALESCE(excluded.rarity, cards.rarity),
            set_code = COALESCE(excluded.set_code, cards.set_code),
            public_code = COALESCE(excluded.public_code, cards.public_code),
            image_url = COALESCE(excluded.image_url, cards.image_url),
            is_banned = excluded.is_banned,
            source = excluded.source,
            raw_json = COALESCE(excluded.raw_json, cards.raw_json),
            updated_at = datetime('now')
        "#,
    )
    .bind(id)
    .bind(name)
    .bind(card_type)
    .bind(domains_json)
    .bind(energy)
    .bind(might)
    .bind(power)
    .bind(rarity)
    .bind(set_code)
    .bind(public_code)
    .bind(image_url)
    .bind(i64::from(is_banned))
    .bind(source)
    .bind(raw_json)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn upsert_legend_meta(pool: &SqlitePool, m: &LegendMeta) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO legend_meta (
            legend, meta_share_pct, total_decks, top8_count, avg_price_usd, tier, win_rate_pct, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(legend) DO UPDATE SET
            meta_share_pct = excluded.meta_share_pct,
            total_decks = excluded.total_decks,
            top8_count = excluded.top8_count,
            avg_price_usd = excluded.avg_price_usd,
            tier = excluded.tier,
            win_rate_pct = excluded.win_rate_pct,
            updated_at = datetime('now')
        "#,
    )
    .bind(&m.legend)
    .bind(m.meta_share_pct)
    .bind(m.total_decks)
    .bind(m.top8_count)
    .bind(m.avg_price_usd)
    .bind(&m.tier)
    .bind(m.win_rate_pct)
    .execute(pool)
    .await?;
    Ok(())
}

pub fn slugify_card_id(name: &str) -> String {
    let mut out = String::with_capacity(name.len());
    let mut prev_dash = false;
    for ch in name.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch.to_ascii_lowercase());
            prev_dash = false;
        } else if !prev_dash && !out.is_empty() {
            out.push('-');
            prev_dash = true;
        }
    }
    while out.ends_with('-') {
        out.pop();
    }
    if out.is_empty() {
        "unknown-card".into()
    } else {
        out
    }
}

pub async fn stats(pool: &SqlitePool) -> Result<StatsResponse> {
    let cards: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM cards")
        .fetch_one(pool)
        .await?;
    let decks: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM decks")
        .fetch_one(pool)
        .await?;
    let tournaments: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM tournaments")
        .fetch_one(pool)
        .await?;
    let deck_cards: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM deck_cards")
        .fetch_one(pool)
        .await?;
    let last_sync = sqlx::query_as::<_, SyncRun>(
        "SELECT * FROM sync_runs WHERE status != 'running' ORDER BY id DESC LIMIT 1",
    )
    .fetch_optional(pool)
    .await?;

    Ok(StatsResponse {
        cards: cards.0,
        decks: decks.0,
        tournaments: tournaments.0,
        deck_cards: deck_cards.0,
        last_sync,
    })
}

pub async fn list_cards(
    pool: &SqlitePool,
    q: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<Vec<Card>> {
    if let Some(q) = q {
        let like = format!("%{q}%");
        Ok(sqlx::query_as::<_, Card>(
            r#"
            SELECT id, name, card_type, domains_json, energy, might, power, rarity,
                   set_code, public_code, image_url, is_banned, source, updated_at
            FROM cards
            WHERE name LIKE ? OR public_code LIKE ? OR id LIKE ?
            ORDER BY name
            LIMIT ? OFFSET ?
            "#,
        )
        .bind(&like)
        .bind(&like)
        .bind(&like)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?)
    } else {
        Ok(sqlx::query_as::<_, Card>(
            r#"
            SELECT id, name, card_type, domains_json, energy, might, power, rarity,
                   set_code, public_code, image_url, is_banned, source, updated_at
            FROM cards
            ORDER BY name
            LIMIT ? OFFSET ?
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?)
    }
}

pub async fn get_card(pool: &SqlitePool, id: &str) -> Result<Option<Card>> {
    Ok(sqlx::query_as::<_, Card>(
        r#"
        SELECT id, name, card_type, domains_json, energy, might, power, rarity,
               set_code, public_code, image_url, is_banned, source, updated_at
        FROM cards WHERE id = ?
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?)
}

pub async fn list_tournaments(
    pool: &SqlitePool,
    limit: i64,
    offset: i64,
) -> Result<Vec<Tournament>> {
    Ok(sqlx::query_as::<_, Tournament>(
        r#"
        SELECT id, slug, name, host, country, event_date, meta, format,
               player_count, source_url, imported_at, updated_at
        FROM tournaments
        ORDER BY event_date IS NULL, event_date DESC, id DESC
        LIMIT ? OFFSET ?
        "#,
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?)
}

pub async fn get_tournament(pool: &SqlitePool, id: i64) -> Result<Option<Tournament>> {
    Ok(sqlx::query_as::<_, Tournament>(
        r#"
        SELECT id, slug, name, host, country, event_date, meta, format,
               player_count, source_url, imported_at, updated_at
        FROM tournaments WHERE id = ?
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?)
}

pub async fn list_decks(
    pool: &SqlitePool,
    tournament_id: Option<i64>,
    legend: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<Vec<Deck>> {
    match (tournament_id, legend) {
        (Some(tid), Some(legend)) => Ok(sqlx::query_as::<_, Deck>(
            r#"
            SELECT id, tournament_id, name, player_name, legend, archetype, meta,
                   rank_label, record, placement, card_count, price_usd, spiciness_pct,
                   event_date, source_url, imported_at, updated_at
            FROM decks
            WHERE tournament_id = ? AND legend LIKE ?
            ORDER BY event_date IS NULL, event_date DESC, id DESC
            LIMIT ? OFFSET ?
            "#,
        )
        .bind(tid)
        .bind(format!("%{legend}%"))
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?),
        (Some(tid), None) => Ok(sqlx::query_as::<_, Deck>(
            r#"
            SELECT id, tournament_id, name, player_name, legend, archetype, meta,
                   rank_label, record, placement, card_count, price_usd, spiciness_pct,
                   event_date, source_url, imported_at, updated_at
            FROM decks
            WHERE tournament_id = ?
            ORDER BY event_date IS NULL, event_date DESC, id DESC
            LIMIT ? OFFSET ?
            "#,
        )
        .bind(tid)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?),
        (None, Some(legend)) => Ok(sqlx::query_as::<_, Deck>(
            r#"
            SELECT id, tournament_id, name, player_name, legend, archetype, meta,
                   rank_label, record, placement, card_count, price_usd, spiciness_pct,
                   event_date, source_url, imported_at, updated_at
            FROM decks
            WHERE legend LIKE ?
            ORDER BY event_date IS NULL, event_date DESC, id DESC
            LIMIT ? OFFSET ?
            "#,
        )
        .bind(format!("%{legend}%"))
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?),
        (None, None) => Ok(sqlx::query_as::<_, Deck>(
            r#"
            SELECT id, tournament_id, name, player_name, legend, archetype, meta,
                   rank_label, record, placement, card_count, price_usd, spiciness_pct,
                   event_date, source_url, imported_at, updated_at
            FROM decks
            ORDER BY event_date IS NULL, event_date DESC, id DESC
            LIMIT ? OFFSET ?
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?),
    }
}

pub async fn get_deck_detail(pool: &SqlitePool, id: i64) -> Result<Option<DeckDetail>> {
    let deck = sqlx::query_as::<_, Deck>(
        r#"
        SELECT id, tournament_id, name, player_name, legend, archetype, meta,
               rank_label, record, placement, card_count, price_usd, spiciness_pct,
               event_date, source_url, imported_at, updated_at
        FROM decks WHERE id = ?
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    let Some(deck) = deck else {
        return Ok(None);
    };

    let cards = sqlx::query_as::<_, DeckCard>(
        r#"
        SELECT deck_id, section, card_name, quantity, price_usd, card_id
        FROM deck_cards
        WHERE deck_id = ?
        ORDER BY
            CASE section
                WHEN 'legend' THEN 1
                WHEN 'champion' THEN 2
                WHEN 'unit' THEN 3
                WHEN 'gear' THEN 4
                WHEN 'spell' THEN 5
                WHEN 'battlefields' THEN 6
                WHEN 'runes' THEN 7
                WHEN 'sideboard' THEN 8
                ELSE 9
            END,
            card_name
        "#,
    )
    .bind(id)
    .fetch_all(pool)
    .await?;

    Ok(Some(DeckDetail { deck, cards }))
}

pub async fn list_legend_meta(pool: &SqlitePool) -> Result<Vec<LegendMeta>> {
    Ok(sqlx::query_as::<_, LegendMeta>(
        r#"
        SELECT legend, meta_share_pct, total_decks, top8_count, avg_price_usd, tier, win_rate_pct, updated_at
        FROM legend_meta
        ORDER BY meta_share_pct IS NULL, meta_share_pct DESC,
                 win_rate_pct IS NULL, win_rate_pct DESC,
                 total_decks IS NULL, total_decks DESC
        "#,
    )
    .fetch_all(pool)
    .await?)
}

pub async fn list_sync_runs(pool: &SqlitePool, limit: i64) -> Result<Vec<SyncRun>> {
    Ok(sqlx::query_as::<_, SyncRun>(
        "SELECT * FROM sync_runs ORDER BY id DESC LIMIT ?",
    )
    .bind(limit)
    .fetch_all(pool)
    .await?)
}

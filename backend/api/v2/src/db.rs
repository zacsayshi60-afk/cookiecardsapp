use std::path::Path;

use anyhow::{Context, Result};
use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};

use crate::models::{
    Card, CardSet, Deck, DeckCard, DeckDetail, GameDeck, GameDeckCard, GameDeckDetail, LegendMeta,
    MagicMetaRow, ParsedDeckDetail, ParsedTournament, StatsResponse, SyncRun, Tournament,
};

const CARD_COLS: &str = r#"
    id, name, card_type, domains_json, energy, might, power, rarity,
    set_code, public_code, image_url, is_banned, source, updated_at,
    game, colors_json, pitch, cost, defense, rules_text
"#;

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
    let result = sqlx::query("INSERT INTO sync_runs (source, status) VALUES (?, 'running')")
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
        INSERT INTO cards (id, name, game, source, updated_at)
        VALUES (?, ?, 'riftbound', 'riftdecks', datetime('now'))
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
    upsert_game_card(
        pool,
        id,
        "riftbound",
        name,
        card_type,
        domains,
        &[],
        energy,
        might,
        power,
        rarity,
        set_code,
        public_code,
        image_url,
        None,
        None,
        None,
        None,
        is_banned,
        source,
        raw_json,
    )
    .await
}

#[allow(clippy::too_many_arguments)]
pub async fn upsert_game_card(
    pool: &SqlitePool,
    id: &str,
    game: &str,
    name: &str,
    card_type: Option<&str>,
    domains: &[String],
    colors: &[String],
    energy: Option<i64>,
    might: Option<i64>,
    power: Option<i64>,
    rarity: Option<&str>,
    set_code: Option<&str>,
    public_code: Option<&str>,
    image_url: Option<&str>,
    pitch: Option<&str>,
    cost: Option<&str>,
    defense: Option<&str>,
    rules_text: Option<&str>,
    is_banned: bool,
    source: &str,
    raw_json: Option<&str>,
) -> Result<()> {
    let domains_json = serde_json::to_string(domains)?;
    let colors_json = serde_json::to_string(colors)?;
    sqlx::query(
        r#"
        INSERT INTO cards (
            id, name, card_type, domains_json, energy, might, power, rarity,
            set_code, public_code, image_url, is_banned, source, raw_json, updated_at,
            game, colors_json, pitch, cost, defense, rules_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            card_type = COALESCE(excluded.card_type, cards.card_type),
            domains_json = CASE
                WHEN excluded.domains_json != '[]' THEN excluded.domains_json
                ELSE cards.domains_json
            END,
            colors_json = CASE
                WHEN excluded.colors_json != '[]' THEN excluded.colors_json
                ELSE cards.colors_json
            END,
            energy = COALESCE(excluded.energy, cards.energy),
            might = COALESCE(excluded.might, cards.might),
            power = COALESCE(excluded.power, cards.power),
            rarity = COALESCE(excluded.rarity, cards.rarity),
            set_code = COALESCE(excluded.set_code, cards.set_code),
            public_code = COALESCE(excluded.public_code, cards.public_code),
            image_url = COALESCE(excluded.image_url, cards.image_url),
            pitch = COALESCE(excluded.pitch, cards.pitch),
            cost = COALESCE(excluded.cost, cards.cost),
            defense = COALESCE(excluded.defense, cards.defense),
            rules_text = COALESCE(excluded.rules_text, cards.rules_text),
            is_banned = excluded.is_banned,
            game = excluded.game,
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
    .bind(game)
    .bind(colors_json)
    .bind(pitch)
    .bind(cost)
    .bind(defense)
    .bind(rules_text)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn upsert_card_set(
    pool: &SqlitePool,
    game: &str,
    set_code: &str,
    name: &str,
    category: Option<&str>,
    release_date: Option<&str>,
    source: &str,
    raw_json: Option<&str>,
) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO card_sets (game, set_code, name, category, release_date, source, raw_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(game, set_code) DO UPDATE SET
            name = excluded.name,
            category = COALESCE(excluded.category, card_sets.category),
            release_date = COALESCE(excluded.release_date, card_sets.release_date),
            source = excluded.source,
            raw_json = COALESCE(excluded.raw_json, card_sets.raw_json),
            updated_at = datetime('now')
        "#,
    )
    .bind(game)
    .bind(set_code)
    .bind(name)
    .bind(category)
    .bind(release_date)
    .bind(source)
    .bind(raw_json)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn upsert_game_deck(
    pool: &SqlitePool,
    id: &str,
    game: &str,
    name: &str,
    hero: Option<&str>,
    player_name: Option<&str>,
    format: Option<&str>,
    event: Option<&str>,
    event_date: Option<&str>,
    note: Option<&str>,
    source_url: Option<&str>,
    source: &str,
    raw_json: Option<&str>,
) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO game_decks (
            id, game, name, hero, player_name, format, event, event_date, note,
            source_url, source, raw_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
            game = excluded.game,
            name = excluded.name,
            hero = excluded.hero,
            player_name = excluded.player_name,
            format = excluded.format,
            event = excluded.event,
            event_date = excluded.event_date,
            note = excluded.note,
            source_url = excluded.source_url,
            source = excluded.source,
            raw_json = COALESCE(excluded.raw_json, game_decks.raw_json),
            updated_at = datetime('now')
        "#,
    )
    .bind(id)
    .bind(game)
    .bind(name)
    .bind(hero)
    .bind(player_name)
    .bind(format)
    .bind(event)
    .bind(event_date)
    .bind(note)
    .bind(source_url)
    .bind(source)
    .bind(raw_json)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn replace_game_deck_cards(
    pool: &SqlitePool,
    deck_id: &str,
    lines: &[(String, String, i64, String)],
) -> Result<()> {
    sqlx::query("DELETE FROM game_deck_cards WHERE deck_id = ?")
        .bind(deck_id)
        .execute(pool)
        .await?;
    for (section, name, qty, pitch) in lines {
        let card_id = slugify_card_id(name);
        sqlx::query(
            r#"
            INSERT INTO game_deck_cards (deck_id, section, card_name, quantity, pitch, card_id)
            VALUES (?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(deck_id)
        .bind(section)
        .bind(name)
        .bind(qty)
        .bind(pitch)
        .bind(&card_id)
        .execute(pool)
        .await?;
    }
    Ok(())
}

pub async fn upsert_magic_meta(pool: &SqlitePool, row: &MagicMetaRow) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO magic_meta (name, share_pct, win_pct, decks, tier, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(name) DO UPDATE SET
            share_pct = excluded.share_pct,
            win_pct = excluded.win_pct,
            decks = excluded.decks,
            tier = excluded.tier,
            updated_at = datetime('now')
        "#,
    )
    .bind(&row.name)
    .bind(&row.share_pct)
    .bind(&row.win_pct)
    .bind(&row.decks)
    .bind(&row.tier)
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

pub async fn fix_card_domains_by_name(
    pool: &SqlitePool,
    name: &str,
    domains: &[&str],
) -> Result<i64> {
    let domains_json = serde_json::to_string(domains)?;
    let res = sqlx::query(
        r#"
        UPDATE cards
        SET domains_json = ?, source = 'domain_fix', updated_at = datetime('now')
        WHERE name = ? AND game = 'riftbound' AND domains_json != ?
        "#,
    )
    .bind(&domains_json)
    .bind(name)
    .bind(&domains_json)
    .execute(pool)
    .await?;
    Ok(res.rows_affected() as i64)
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
    let cards: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM cards WHERE game = 'riftbound' OR game IS NULL")
            .fetch_one(pool)
            .await?;
    let fab_cards: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM cards WHERE game = 'fab'")
        .fetch_one(pool)
        .await?;
    let magic_cards: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM cards WHERE game = 'magic'")
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
    let game_decks: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM game_decks")
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
        fab_cards: fab_cards.0,
        magic_cards: magic_cards.0,
        game_decks: game_decks.0,
        last_sync,
    })
}

#[derive(Debug, Clone, Default)]
pub struct CardFilter {
    pub game: Option<String>,
    pub q: Option<String>,
    pub set_code: Option<String>,
    pub domain: Option<String>,
    pub color: Option<String>,
    pub pitch: Option<String>,
    pub rarity: Option<String>,
    pub card_type: Option<String>,
    pub limit: i64,
    pub offset: i64,
}

pub async fn list_cards_filtered(pool: &SqlitePool, f: CardFilter) -> Result<Vec<Card>> {
    let mut sql = format!("SELECT {CARD_COLS} FROM cards WHERE 1=1");
    let mut binds: Vec<String> = Vec::new();

    if let Some(game) = &f.game {
        sql.push_str(" AND game = ?");
        binds.push(game.clone());
    }
    if let Some(q) = &f.q {
        sql.push_str(" AND (name LIKE ? OR public_code LIKE ? OR id LIKE ?)");
        let like = format!("%{q}%");
        binds.push(like.clone());
        binds.push(like.clone());
        binds.push(like);
    }
    if let Some(set_code) = &f.set_code {
        sql.push_str(" AND set_code = ?");
        binds.push(set_code.clone());
    }
    if let Some(domain) = &f.domain {
        sql.push_str(" AND domains_json LIKE ?");
        binds.push(format!("%{domain}%"));
    }
    if let Some(color) = &f.color {
        sql.push_str(" AND colors_json LIKE ?");
        binds.push(format!("%{color}%"));
    }
    if let Some(pitch) = &f.pitch {
        sql.push_str(" AND pitch = ?");
        binds.push(pitch.clone());
    }
    if let Some(rarity) = &f.rarity {
        sql.push_str(" AND rarity LIKE ?");
        binds.push(format!("%{rarity}%"));
    }
    if let Some(card_type) = &f.card_type {
        sql.push_str(" AND card_type LIKE ?");
        binds.push(format!("%{card_type}%"));
    }
    sql.push_str(" ORDER BY name LIMIT ? OFFSET ?");

    let mut query = sqlx::query_as::<_, Card>(&sql);
    for b in &binds {
        query = query.bind(b);
    }
    query = query.bind(f.limit).bind(f.offset);
    Ok(query.fetch_all(pool).await?)
}

pub async fn list_cards(
    pool: &SqlitePool,
    q: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<Vec<Card>> {
    list_cards_filtered(
        pool,
        CardFilter {
            game: Some("riftbound".into()),
            q: q.map(|s| s.to_string()),
            limit,
            offset,
            ..Default::default()
        },
    )
    .await
}

pub async fn get_card(pool: &SqlitePool, id: &str) -> Result<Option<Card>> {
    Ok(sqlx::query_as::<_, Card>(&format!(
        "SELECT {CARD_COLS} FROM cards WHERE id = ?"
    ))
    .bind(id)
    .fetch_optional(pool)
    .await?)
}

pub async fn list_card_sets(pool: &SqlitePool, game: &str) -> Result<Vec<CardSet>> {
    Ok(sqlx::query_as::<_, CardSet>(
        r#"
        SELECT game, set_code, name, category, release_date, source, updated_at
        FROM card_sets
        WHERE game = ?
        ORDER BY name
        "#,
    )
    .bind(game)
    .fetch_all(pool)
    .await?)
}

pub async fn list_set_codes(pool: &SqlitePool, game: &str) -> Result<Vec<String>> {
    let rows: Vec<(String,)> =
        sqlx::query_as("SELECT set_code FROM card_sets WHERE game = ? ORDER BY set_code")
            .bind(game)
            .fetch_all(pool)
            .await?;
    Ok(rows.into_iter().map(|(s,)| s).collect())
}

pub async fn list_gatherer_multiverse_ids(pool: &SqlitePool, limit: i64) -> Result<Vec<i64>> {
    let rows: Vec<(Option<String>,)> = sqlx::query_as(
        r#"
        SELECT public_code FROM cards
        WHERE game = 'magic' AND public_code LIKE 'gatherer:%'
        LIMIT ?
        "#,
    )
    .bind(limit)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .filter_map(|(code,)| {
            code.and_then(|c| c.strip_prefix("gatherer:")?.parse::<i64>().ok())
        })
        .collect())
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

pub async fn list_game_decks(
    pool: &SqlitePool,
    game: &str,
    limit: i64,
    offset: i64,
) -> Result<Vec<GameDeck>> {
    Ok(sqlx::query_as::<_, GameDeck>(
        r#"
        SELECT id, game, name, hero, player_name, format, event, event_date, note,
               source_url, source, imported_at, updated_at
        FROM game_decks
        WHERE game = ?
        ORDER BY updated_at DESC
        LIMIT ? OFFSET ?
        "#,
    )
    .bind(game)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?)
}

pub async fn get_game_deck(pool: &SqlitePool, id: &str) -> Result<Option<GameDeckDetail>> {
    let deck = sqlx::query_as::<_, GameDeck>(
        r#"
        SELECT id, game, name, hero, player_name, format, event, event_date, note,
               source_url, source, imported_at, updated_at
        FROM game_decks WHERE id = ?
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;
    let Some(deck) = deck else {
        return Ok(None);
    };
    let cards = sqlx::query_as::<_, GameDeckCard>(
        r#"
        SELECT deck_id, section, card_name, quantity, pitch, card_id
        FROM game_deck_cards WHERE deck_id = ?
        ORDER BY section, card_name
        "#,
    )
    .bind(id)
    .fetch_all(pool)
    .await?;
    Ok(Some(GameDeckDetail { deck, cards }))
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

pub async fn list_magic_meta(pool: &SqlitePool) -> Result<Vec<MagicMetaRow>> {
    Ok(sqlx::query_as::<_, MagicMetaRow>(
        r#"
        SELECT name, share_pct, win_pct, decks, tier, updated_at
        FROM magic_meta
        ORDER BY name
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

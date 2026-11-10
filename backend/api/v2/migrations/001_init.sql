-- Cardessy unified schema.
-- Everything imported from RiftDecks.com (and optional OpenRift card enrichment)
-- lands in this single Cardessy SQLite database.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cards (
    id              TEXT PRIMARY KEY,          -- stable slug / openrift id / name key
    name            TEXT NOT NULL,
    card_type       TEXT,                      -- unit, spell, gear, legend, ...
    domains_json    TEXT NOT NULL DEFAULT '[]', -- JSON array of domains
    energy          INTEGER,
    might           INTEGER,
    power           INTEGER,
    rarity          TEXT,
    set_code        TEXT,
    public_code     TEXT,                      -- e.g. OGN-001/298
    image_url       TEXT,
    is_banned       INTEGER NOT NULL DEFAULT 0,
    source          TEXT NOT NULL DEFAULT 'riftdecks',
    raw_json        TEXT,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);
CREATE INDEX IF NOT EXISTS idx_cards_set ON cards(set_code);
CREATE INDEX IF NOT EXISTS idx_cards_type ON cards(card_type);

CREATE TABLE IF NOT EXISTS tournaments (
    id              INTEGER PRIMARY KEY,       -- RiftDecks tournament id
    slug            TEXT NOT NULL,
    name            TEXT NOT NULL,
    host            TEXT,
    country         TEXT,
    event_date      TEXT,                      -- ISO date when parseable
    meta            TEXT,                      -- e.g. Radiance, Vendetta
    format          TEXT,                      -- e.g. Constructed
    player_count    INTEGER,
    source_url      TEXT NOT NULL,
    raw_json        TEXT,
    imported_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tournaments_date ON tournaments(event_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_meta ON tournaments(meta);

CREATE TABLE IF NOT EXISTS decks (
    id              INTEGER PRIMARY KEY,       -- RiftDecks deck id
    tournament_id   INTEGER REFERENCES tournaments(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    player_name     TEXT,
    legend          TEXT,
    archetype       TEXT,
    meta            TEXT,
    rank_label      TEXT,                      -- e.g. "1st", "Top8"
    record          TEXT,                      -- e.g. "7-0-1"
    placement       INTEGER,                   -- numeric when known
    card_count      INTEGER,
    price_usd       REAL,
    spiciness_pct   REAL,
    event_date      TEXT,
    source_url      TEXT NOT NULL,
    raw_json        TEXT,
    imported_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_decks_tournament ON decks(tournament_id);
CREATE INDEX IF NOT EXISTS idx_decks_legend ON decks(legend);
CREATE INDEX IF NOT EXISTS idx_decks_date ON decks(event_date);

CREATE TABLE IF NOT EXISTS deck_cards (
    deck_id         INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    section         TEXT NOT NULL,             -- legend, champion, unit, gear, spell, battlefields, runes, sideboard
    card_name       TEXT NOT NULL,
    quantity        INTEGER NOT NULL,
    price_usd       REAL,
    card_id         TEXT REFERENCES cards(id) ON DELETE SET NULL,
    PRIMARY KEY (deck_id, section, card_name)
);

CREATE INDEX IF NOT EXISTS idx_deck_cards_name ON deck_cards(card_name);

CREATE TABLE IF NOT EXISTS legend_meta (
    legend          TEXT PRIMARY KEY,
    meta_share_pct  REAL,
    total_decks     INTEGER,
    top8_count      INTEGER,
    avg_price_usd   REAL,
    tier            TEXT,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_runs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at      TEXT NOT NULL DEFAULT (datetime('now')),
    finished_at     TEXT,
    source          TEXT NOT NULL,             -- riftdecks | openrift | fixtures
    status          TEXT NOT NULL,             -- running | ok | error
    tournaments     INTEGER NOT NULL DEFAULT 0,
    decks           INTEGER NOT NULL DEFAULT 0,
    cards           INTEGER NOT NULL DEFAULT 0,
    message         TEXT
);

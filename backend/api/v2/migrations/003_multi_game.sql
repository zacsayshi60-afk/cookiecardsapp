-- Multi-game support: Riftbound (existing cards), Rathe (FaB), Magisterium (Magic).

ALTER TABLE cards ADD COLUMN game TEXT NOT NULL DEFAULT 'riftbound';
ALTER TABLE cards ADD COLUMN colors_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE cards ADD COLUMN pitch TEXT;
ALTER TABLE cards ADD COLUMN cost TEXT;
ALTER TABLE cards ADD COLUMN defense TEXT;
ALTER TABLE cards ADD COLUMN rules_text TEXT;

CREATE INDEX IF NOT EXISTS idx_cards_game ON cards(game);
CREATE INDEX IF NOT EXISTS idx_cards_game_set ON cards(game, set_code);

CREATE TABLE IF NOT EXISTS card_sets (
    game            TEXT NOT NULL,
    set_code        TEXT NOT NULL,
    name            TEXT NOT NULL,
    category        TEXT,
    release_date    TEXT,
    source          TEXT NOT NULL DEFAULT 'local',
    raw_json        TEXT,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (game, set_code)
);

CREATE TABLE IF NOT EXISTS game_decks (
    id              TEXT PRIMARY KEY,
    game            TEXT NOT NULL,
    name            TEXT NOT NULL,
    hero            TEXT,
    player_name     TEXT,
    format          TEXT,
    event           TEXT,
    event_date      TEXT,
    note            TEXT,
    source_url      TEXT,
    source          TEXT NOT NULL DEFAULT 'local',
    raw_json        TEXT,
    imported_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_game_decks_game ON game_decks(game);

CREATE TABLE IF NOT EXISTS game_deck_cards (
    deck_id         TEXT NOT NULL REFERENCES game_decks(id) ON DELETE CASCADE,
    section         TEXT NOT NULL DEFAULT 'main',
    card_name       TEXT NOT NULL,
    quantity        INTEGER NOT NULL,
    pitch           TEXT NOT NULL DEFAULT '',
    card_id         TEXT,
    PRIMARY KEY (deck_id, section, card_name, pitch)
);

CREATE INDEX IF NOT EXISTS idx_game_deck_cards_name ON game_deck_cards(card_name);

CREATE TABLE IF NOT EXISTS magic_meta (
    name            TEXT PRIMARY KEY,
    share_pct       TEXT,
    win_pct         TEXT,
    decks           TEXT,
    tier            TEXT,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

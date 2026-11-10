# Cardessy architecture

Three jobs:

1. **Import** Riftbound / FaB / Magic data from public sites + local fixtures
2. **Normalize** into one SQLite database (`data/cardessy.db`)
3. **Serve** filtered JSON via the Cardessy API

```
┌ riftdecks.com ─────────┐
┌ bilgewatermarket.com ──┤
┌ openrift.app ──────────┼── import::* ──► SQLite ── Cardessy API ──► apps
┌ fabrary / fab-cube ────┤
┌ scryfall / gatherer ───┘
┌ fixtures/* ────────────┘
```

## Games in one DB

| `cards.game` | Client section | Primary filters |
| --- | --- | --- |
| `riftbound` | Riftbook | set, domain |
| `fab` | Rathe Archive | set, pitch |
| `magic` | Magisterium | set, color |

Supporting tables: `card_sets`, `game_decks`, `game_deck_cards`, plus RiftDecks `tournaments` / `decks` / `deck_cards`.

## Domain corrections

`import::domain_fixes` rewrites known bad local classifications (Brawl → Fury, Supernova → Mind) after every relevant sync.

## Crate layout

| Path | Role |
| --- | --- |
| `src/main.rs` | CLI `serve` / `sync` (`cardessy`) |
| `src/api.rs` | Cardessy REST routes |
| `src/db.rs` | SQLite upserts + filtered queries |
| `src/import/*` | Per-source importers |
| `fixtures/` | Offline seeds |
| `migrations/` | Schema |

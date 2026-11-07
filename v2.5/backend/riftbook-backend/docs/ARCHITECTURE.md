# Architecture

Riftbook’s backend has three jobs:

1. **Import** data that lives on [riftdecks.com](https://riftdecks.com)
2. **Normalize** it into one SQLite database
3. **Serve** JSON to the Riftbook mobile/web clients

## High-level flow

```
┌────────────────────┐
│  riftdecks.com     │  public HTML pages
│  tournaments/decks │
└─────────┬──────────┘
          │  import::riftdecks (reqwest + scraper)
          ▼
┌────────────────────┐     optional
│  fixtures/*.json   │◄── demo / CI / Cloudflare blocked
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐     optional enrichment
│  data/riftbook.db  │◄── OpenRift /api/v1/catalog
│  (single SQLite)   │
└─────────┬──────────┘
          │  axum HTTP API
          ▼
┌────────────────────┐
│  Riftbook app +    │
│  website           │
└────────────────────┘
```

## Crate layout

| Path | Role |
| --- | --- |
| `src/main.rs` | CLI: `serve` and `sync` |
| `src/config.rs` | Clap flags + env vars |
| `src/db.rs` | SQLite connect, migrations, upserts, queries |
| `src/models.rs` | Shared structs (DB rows + parsed import types) |
| `src/import/riftdecks.rs` | Live HTML client + parsers |
| `src/import/fixtures.rs` | Offline JSON loader |
| `src/import/openrift.rs` | Public card catalog enrichment |
| `src/api.rs` | REST routes for the app |
| `migrations/` | Schema |
| `fixtures/` | Sample RiftDecks-shaped data |

## Design choices

### One database

Everything lands in `data/riftbook.db`. The app never talks to RiftDecks at runtime — it only talks to Riftbook. That keeps the client simple and lets you refresh data on a schedule.

### SQLite

Zero-ops for a first backend slice: one file, easy backups, fine for thousands of decks. Swap to Postgres later by changing the `sqlx` driver if you outgrow it; the API shape can stay the same.

### Import is a separate command

`riftbook sync` writes the DB. `riftbook serve` only reads (plus an optional `POST /api/v1/sync` for admin triggers). Syncing from the CLI is safer for long crawls.

### Card enrichment

RiftDecks deck pages give **card names + quantities**. For richer card objects (type, domains, energy, set codes), Riftbook can merge OpenRift’s documented public catalog into the same `cards` table. Deck lines still resolve by name slug.

## Identity mapping

| Entity | Primary key |
| --- | --- |
| Tournament | RiftDecks numeric id from `...-tournament-decks-{id}` |
| Deck | RiftDecks numeric id from `.../deck-{slug}-{id}` |
| Card | Slug of the English name (plus OpenRift slug when enriched) |

Upserts are idempotent: re-running sync updates existing rows instead of duplicating them.

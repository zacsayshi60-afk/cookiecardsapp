# Riftbook backend (Rust)

Rust backend for **Riftbook**. It pulls Riftbound tournament / deck / card data from [riftdecks.com](https://riftdecks.com) into **one SQLite database**, then serves that data over HTTP so your app and website share the same source of truth.

```
riftdecks.com  ──import──►  data/riftbook.db  ──API──►  Riftbook app / website
     ▲                            ▲
     │                            │
 optional OpenRift catalog    fixtures/ (offline demo)
```

## Quick start

```bash
# 1. Build
cargo build --release

# 2. Load sample data shaped like RiftDecks (works offline)
cargo run -- sync --source fixtures

# 3. Start the API (default port 43180)
cargo run -- serve
```

Then open [http://127.0.0.1:43180](http://127.0.0.1:43180) or call:

```bash
curl http://127.0.0.1:43180/api/v1/stats
curl http://127.0.0.1:43180/api/v1/decks
curl http://127.0.0.1:43180/api/v1/decks/228800
curl 'http://127.0.0.1:43180/api/v1/cards?q=Kennen'
```

## What gets stored

| Table | Meaning |
| --- | --- |
| `tournaments` | Events from RiftDecks (`/riftbound-tournaments/...`) |
| `decks` | Decklists (`/riftbound-metagame/deck-...`) |
| `deck_cards` | Card lines by section (legend, unit, runes, sideboard, …) |
| `cards` | Card catalog (names from decks + optional OpenRift enrichment) |
| `legend_meta` | Home-page metagame legend share |
| `sync_runs` | Import history |

Schema: [`migrations/001_init.sql`](migrations/001_init.sql)

## Sync commands

```bash
# Offline sample (recommended first)
cargo run -- sync --source fixtures

# Live crawl of public RiftDecks HTML pages
cargo run -- sync --source riftdecks \
  --tournament-pages 2 \
  --max-tournaments 5 \
  --max-decks 25 \
  --delay-ms 750

# Enrich cards from OpenRift's public catalog API (no key)
cargo run -- sync --source openrift

# Fixtures + OpenRift + best-effort live RiftDecks
cargo run -- sync --source all
```

Environment overrides:

| Variable | Default | Purpose |
| --- | --- | --- |
| `RIFTBOOK_DATABASE` | `data/riftbook.db` | SQLite path |
| `RIFTBOOK_BIND` | `0.0.0.0:43180` | HTTP bind |
| `RIFTDECKS_BASE_URL` | `https://riftdecks.com` | Crawl base |
| `OPENRIFT_BASE_URL` | `https://openrift.app` | Card catalog |
| `RUST_LOG` | `riftbook=info,tower_http=info` | Logging |

## Documentation

| Doc | Contents |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the pieces fit together |
| [docs/API.md](docs/API.md) | HTTP endpoints for the app / website |
| [docs/IMPORT.md](docs/IMPORT.md) | How RiftDecks import works, limits, ToS notes |

## Why fixtures exist

RiftDecks has **no public API**. Live import parses their public HTML. Some networks (including many cloud IPs) are blocked by Cloudflare. Fixtures let you develop Riftbook without depending on that crawl. Use live `--source riftdecks` from a normal home/office network when you need fresh data.

## License

MIT — see project metadata in `Cargo.toml`. Respect RiftDecks’ terms and `robots.txt` when crawling; do not build a competing scrape-and-republish metagame site.

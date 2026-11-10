# Cardessy API (Rust)

**Cardessy** is the multi-game card API behind Riftbook, Rathe Archive, and Magisterium. One SQLite database is filled from public sources, then served over HTTP.

```
riftdecks.com ──┐
bilgewatermarket.com ──┤
openrift.app ──┼── import ──► data/cardessy.db ── Cardessy API ──► app / website
fabrary / fab-cube ──┤
scryfall (+ gatherer) ──┘
fixtures/ (offline)
```

## Quick start

```bash
cargo build --release

# Seed from local fixtures (includes Brawl→Fury, Supernova→Mind fixes)
cargo run -- sync --source local

# Optional live enrichment
cargo run -- sync --source openrift
cargo run -- sync --source bilgewater
cargo run -- sync --source fabrary
cargo run -- sync --source scryfall
cargo run -- sync --source riftdecks --max-decks 25

# Or everything best-effort
cargo run -- sync --source all

cargo run -- serve
```

Default API: [http://127.0.0.1:43180](http://127.0.0.1:43180)

```bash
curl 'http://127.0.0.1:43180/health'   # {"ok":true,"service":"cardessy"}
curl 'http://127.0.0.1:43180/api/v1/riftbound/cards?set=RAD&domain=Fury'
curl 'http://127.0.0.1:43180/api/v1/rathe/cards?set=HNT&pitch=red'
curl 'http://127.0.0.1:43180/api/v1/magisterium/cards?set=Reality%20Fracture&color=U'
```

## Games

| Section | Game | Card sources | Deck sources | Filters |
| --- | --- | --- | --- | --- |
| Riftbound | Riftbound TCG | OpenRift, Bilgewater Market, local gallery | RiftDecks.com | `set`, `domain`, `type`, `rarity` |
| Rathe Archive | Flesh and Blood | Fabrary source dataset (`the-fab-cube`), local | Fabrary deck URLs / local | `set`, `pitch`, `type` |
| Magisterium | Magic: The Gathering | Scryfall (Gatherer-aligned oracle), Gatherer HTML, local | local | `set`, `color`, `rarity` |

## Sync sources

| `--source` | What it does |
| --- | --- |
| `local` | Load `fixtures/riftbound`, `fixtures/rathe`, `fixtures/magisterium` + domain fixes |
| `fixtures` | Original RiftDecks-shaped sample JSON |
| `openrift` | Full Riftbound catalog (correct domains) |
| `bilgewater` | Bilgewater Market public cards + sets / prices |
| `riftdecks` | Live tournament + deck crawl |
| `fabrary` | FaB cards from the Fabrary/fab-cube JSON |
| `scryfall` | Magic cards for sets already in DB (`--scryfall-bulk` for full oracle) |
| `gatherer` | Optional Gatherer HTML enrichment by multiverse id |
| `all` | local → openrift → bilgewater → fabrary → scryfall → riftdecks |

## Domain corrections

Local gallery data mis-tagged some Radiance spells. Cardessy always applies:

- **Brawl** → `Fury` (was Chaos)
- **Supernova** → `Mind` (was Order)

## Docs

| Doc | Contents |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the pieces fit |
| [docs/API.md](docs/API.md) | HTTP endpoints |
| [docs/IMPORT.md](docs/IMPORT.md) | Importers, limits, ToS notes |

## License

MIT. Respect each site’s terms and `robots.txt` when crawling.

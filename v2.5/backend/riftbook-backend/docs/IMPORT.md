# Importing from riftdecks.com

## Reality check

RiftDecks.com does **not** document a public JSON API. Community notes and their site structure show tournament and deck data as HTML pages. This importer therefore:

1. Fetches public pages with a clear User-Agent
2. Parses tournament and deck URLs / tables
3. Upserts into Riftbook’s SQLite DB

If a future official RiftDecks API appears, swap the client in `src/import/riftdecks.rs` — the database and HTTP API can stay the same.

## Pages we read

| Path | Used for |
| --- | --- |
| `/` | Legend metagame table |
| `/riftbound-tournaments` (+ `?page=`) | Tournament index |
| `/riftbound-tournaments/{slug}-tournament-decks-{id}` | Event metadata + deck links |
| `/riftbound-decks` | Fallback deck index when tournament pages fail |
| `/riftbound-metagame/deck-{slug}-{id}` | Full decklist by section |

URL patterns were taken from live RiftDecks pages (e.g. tournament `...-tournament-decks-13762`, deck `.../deck-zhan-kai-228800`).

## CLI

```bash
cargo run -- sync --source riftdecks \
  --tournament-pages 2 \
  --max-tournaments 5 \
  --max-decks 25 \
  --delay-ms 750
```

Always start with small limits. Increase only after a successful run.

## Be a good citizen

RiftDecks’ `robots.txt` explicitly forbids scraping for **competing** services (other metagame / comparison sites). Riftbook’s importer is meant to power **your own app’s private database**, not to republish their catalog as a rival site.

Also:

- Keep `--delay-ms` ≥ 500–1000
- Cap `--max-decks` / `--max-tournaments`
- Do not hammer visual-deck or suggestion endpoints (those paths are disallowed)

## Cloudflare / blocked IPs

Some cloud and datacenter IPs get a Cloudflare challenge page. The importer detects that and fails with a clear error. In that case:

```bash
cargo run -- sync --source fixtures
# or
cargo run -- sync --source all   # fixtures + OpenRift; live crawl best-effort
```

Run the live crawl from a residential network when you need fresh tournament data.

## OpenRift card enrichment

`cargo run -- sync --source openrift` downloads `GET {OPENRIFT_BASE_URL}/api/v1/catalog` (public, no key) and fills `cards` with types, domains, energy/might, rarity, and set codes. Deck imports still create name stubs; OpenRift overwrites stubs with richer rows.

## Fixtures

`fixtures/riftdecks_sample.json` mirrors real RiftDecks shapes (two tournaments, three decks, legend meta, sample cards) so CI and demos work without network access to riftdecks.com.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Cloudflare blocked access` | Datacenter IP | Use fixtures; crawl from home |
| `no card lines parsed` | HTML layout change | Update parsers in `riftdecks.rs`; open an issue with a saved HTML sample |
| Empty tournament list | Selector / block | Fallbacks to `/riftbound-decks`; check logs |
| Duplicate-looking cards | Name vs OpenRift slug | Both ids are kept; prefer OpenRift slug in clients when present |

# Cardessy import sources

## Riftbound

| Source | Auth | Notes |
| --- | --- | --- |
| **local** fixtures | none | Gallery/pool JSON with Brawl→Fury and Supernova→Mind fixes |
| **OpenRift** `/api/v1/catalog` | none | Canonical domains, types, energy/might |
| **Bilgewater Market** `api.bilgewatermarket.com` | public routes only | Sets + printings/prices (`/api/public/cards`, `/api/card-sets`). App-Check routes are skipped |
| **RiftDecks.com** | HTML crawl | Tournaments + decks. Cloudflare may block datacenter IPs |

## Rathe (Flesh and Blood)

Fabrary.net does not publish a bulk card API. Card data is imported from the same open dataset Fabrary uses:

`https://raw.githubusercontent.com/the-fab-cube/flesh-and-blood-cards/develop/json/english/card.json`

Deck pages on `https://fabrary.net/decks/...` can be scraped via `fabrary::import_deck_url` when needed. Local Rathe fixtures ship sample decks with `fabraryId` links.

## Magisterium (Magic)

Gatherer no longer offers a bulk JSON feed. The importer uses:

1. **Scryfall** public API — oracle text, colors, sets, images, and `multiverse_ids` (Gatherer ids)
2. **Gatherer** HTML — optional enrichment for cards that already have `gatherer:{id}` public codes
3. **local** Magisterium fixtures — offline seed with set/color segmentation

Pass `--scryfall-bulk` to download the full Scryfall oracle bulk file (large).

## Be a good citizen

- Keep `--delay-ms` ≥ 500–1000 for live crawls
- Cap `--max-decks` / `--max-tournaments`
- Do not republish scraped catalogs as a competing metagame site

# Cardessy HTTP API

Base URL (local default): `http://127.0.0.1:43180`

All JSON endpoints return `application/json`. CORS is open for local development.

## Health & overview

### `GET /health`

```json
{ "ok": true, "service": "cardessy" }
```

### `GET /api/v1/stats`

Counts for Riftbound cards/decks plus Rathe / Magisterium card and game-deck totals, and the last sync run.

## Riftbound

### `GET /api/v1/riftbound/cards` (alias: `/api/v1/cards`)

| Query | Notes |
| --- | --- |
| `q` | Name / code / id search |
| `set` | Set code (`RAD`, `OGN`, …) |
| `domain` | `Fury` / `Calm` / `Mind` / `Body` / `Chaos` / `Order` |
| `type` | Card type substring |
| `rarity` | Rarity substring |
| `limit` / `offset` | Pagination (max 200) |

### `GET /api/v1/riftbound/sets`

### `GET /api/v1/riftbound/cards/{id}`

### Decks & tournaments

`/api/v1/tournaments`, `/api/v1/decks`, `/api/v1/meta/legends`.

## Rathe Archive (Flesh and Blood)

### `GET /api/v1/rathe/cards`

| Query | Notes |
| --- | --- |
| `set` | Set code from card id prefix (`HNT`, `UPR`, …) |
| `pitch` | `red` / `yellow` / `blue` / empty |
| `type` | Type line substring |
| `q` | Search |

### `GET /api/v1/rathe/sets`

### `GET /api/v1/rathe/decks` / `{id}`

## Magisterium (Magic)

### `GET /api/v1/magisterium/cards`

| Query | Notes |
| --- | --- |
| `set` | Set name or code |
| `color` | `W` `U` `B` `R` `G` (Scryfall letters) |
| `rarity` | rarity substring |
| `q` | Search |

### `GET /api/v1/magisterium/sets`

### `GET /api/v1/magisterium/decks` / `{id}`

### `GET /api/v1/magisterium/meta`

## Sync

### `POST /api/v1/sync`

```bash
curl -X POST http://127.0.0.1:43180/api/v1/sync \
  -H 'content-type: application/json' \
  -d '{"source":"local"}'
```

`source`: `local` | `fixtures` | `riftdecks` | `openrift` | `bilgewater` | `fabrary` | `scryfall` | `gatherer` | `all`

# HTTP API

Base URL (local default): `http://127.0.0.1:43180`

All JSON endpoints return `application/json`. CORS is open so a local website can call the API during development.

## Health & overview

### `GET /health`

```json
{ "ok": true, "service": "riftbook" }
```

### `GET /api/v1/stats`

Counts plus the last finished sync run.

```json
{
  "cards": 42,
  "decks": 3,
  "tournaments": 2,
  "deck_cards": 80,
  "last_sync": {
    "id": 1,
    "started_at": "...",
    "finished_at": "...",
    "source": "fixtures",
    "status": "ok",
    "tournaments": 2,
    "decks": 3,
    "cards": 40,
    "message": "..."
  }
}
```

## Cards

### `GET /api/v1/cards`

| Query | Default | Notes |
| --- | --- | --- |
| `q` | — | Search name / public code / id |
| `limit` | `50` | Max `200` |
| `offset` | `0` | |

### `GET /api/v1/cards/{id}`

Single card. `{id}` is the slug (e.g. `kennen-heart-of-the-tempest`).

## Tournaments

### `GET /api/v1/tournaments?limit=&offset=`

List newest first.

### `GET /api/v1/tournaments/{id}`

One tournament (RiftDecks id).

## Decks

### `GET /api/v1/decks`

| Query | Notes |
| --- | --- |
| `tournament_id` | Filter to one event |
| `legend` | Substring match on legend name |
| `limit` / `offset` | Pagination |

### `GET /api/v1/decks/{id}`

Deck plus ordered `cards` array:

```json
{
  "id": 228800,
  "name": "展开！",
  "player_name": "Animal",
  "legend": "Kennen, Heart of the Tempest",
  "source_url": "https://riftdecks.com/riftbound-metagame/deck-zhan-kai-228800",
  "cards": [
    {
      "deck_id": 228800,
      "section": "legend",
      "card_name": "Kennen, Heart of the Tempest",
      "quantity": 1,
      "price_usd": 0.14,
      "card_id": "kennen-heart-of-the-tempest"
    }
  ]
}
```

## Metagame

### `GET /api/v1/meta/legends`

Legend share table (from RiftDecks home page / fixtures).

## Sync control

### `GET /api/v1/sync/runs`

Recent import history.

### `POST /api/v1/sync`

Trigger an import from the API (same work as the CLI).

```bash
curl -X POST http://127.0.0.1:43180/api/v1/sync \
  -H 'content-type: application/json' \
  -d '{"source":"fixtures"}'
```

Body fields:

| Field | Default | Values |
| --- | --- | --- |
| `source` | `fixtures` | `fixtures`, `riftdecks`, `openrift`, `all` |
| `tournament_pages` | `1` | Live crawl only |
| `max_tournaments` | `3` | Live crawl only |
| `max_decks` | `15` | Live crawl only |

## Connecting the website / app

Point your Riftbook client at this base URL. Example fetch:

```ts
const res = await fetch("http://127.0.0.1:43180/api/v1/decks?limit=20");
const decks = await res.json();
```

For production, put the API behind HTTPS and restrict `POST /api/v1/sync` (this scaffold leaves it open for local use).

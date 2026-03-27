# Song likes catalog (radio app)

Listener **like** / **unlike** actions are stored in PostgreSQL (`song_like_records`) for analytics and cataloging.

## API

### `POST /api/v1/likes/` (public, no auth)

Body (JSON):

| Field | Description |
|--------|----------------|
| `song_key` | Normalized id (same as client: `artist-title` slug) |
| `artist` | Artist name |
| `title` | Track title |
| `listener_id` | Per-browser UUID (stored in `localStorage` as `newstarsradio-listener-id`) |
| `action` | `"like"` or `"unlike"` |

The radio app sends this automatically when the user taps the heart (in addition to local `localStorage` favorites).

### `GET /api/v1/likes/catalog` (authenticated Ad Manager)

Requires `Authorization: Bearer <JWT>` for any logged-in user (admin or sales rep).

In the **Ad Manager** UI: open **Song Likes** in the top navigation (same app as Campaigns / Settings).

Returns aggregated rows per song:

- `like_events` — number of like actions  
- `unlike_events` — number of unlike actions  
- `net_score` — `like_events - unlike_events`  
- `last_event_at` — last activity timestamp  

Query params: `limit` (default 100), `offset` (default 0).

## Database migration

After deploy, run Alembic on Railway (or your host):

```bash
alembic upgrade head
```

Revision `003` creates `song_like_records`.

## Viewing in Swagger

With `DEBUG=true`, open `/docs`, authorize as admin, and call `GET /api/v1/likes/catalog`.

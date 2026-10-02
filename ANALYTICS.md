# Playtime — what is measured, where it lives, and how to check it

Private analytics for The Crew. Anonymous, admin-only, and built out of what the server already
had: FastAPI, SQLAlchemy, Alembic, Postgres, and the `ADMIN_EMAIL` account that already mints press
passes.

---

## The dashboard

**https://api.playthecrew.com/admin/analytics**

It is on the API, not on playthecrew.com. The browser puts up its own password box; sign in with
**the email in `ADMIN_EMAIL` and that account's ordinary password** — the same one you use in the
game. There is no second password and nothing to paste.

Date ranges are in the top right: Today · 7 days · 30 days · All time.

---

## What is collected

A row per sitting, carrying six things:

| | |
|---|---|
| `anon_id` | 32 random hex characters the browser invented once and keeps in localStorage |
| `started_at` | when the sitting began |
| `last_beat_at` | when it last checked in |
| `ended_at` | when the browser said goodbye, if it got the chance |
| `active_ms` | how many milliseconds of it were play |
| `is_new`, `session_no` | whether it was that id's first sitting, and which number it was |

**That is the whole of it.** No account, no email, no IP address, no user agent, no country, no
device, no screen size, and nothing about what happened in the game. There is no foreign key to
`players` and `tests/test_analytics.py::test_the_table_holds_no_personal_column` fails if one ever
appears.

A cleared cache is a new player. That is the cost of not fingerprinting anybody, and it is the
right way round.

---

## What "active playtime" means

Not the time between opening a tab and closing it — that is free to measure and is a lie. The
clock runs only while:

- the tab is **visible** (`document.hidden` stops it immediately), and
- somebody has **touched it** in the last 90 seconds (pointer, key, touch or wheel).

Away for more than 30 minutes and the next activity starts a **new sitting**, using the same
`PLAY_GAP_MS` the game already uses to decide what counts as a new play.

The browser checks in every 30 seconds. **A sitting with no goodbye is worth exactly what its last
checkpoint said** — so a closed laptop costs at most 30 seconds of over-count, rather than running
until somebody notices.

The server does not believe the browser. Each checkpoint may add at most the wall-clock time that
has passed since the one before it, can never go backwards, and can never exceed the time since the
sitting began. The worst a tampered client can do is claim all of its real elapsed time as play.

---

## How to check it works

Do these in order. Steps 1–4 need nothing but a browser.

1. Open **https://playthecrew.com/play.html** in a normal window.
2. Press F12 to open developer tools and click the **Network** tab.
3. Click anywhere on the game. In the Network list a request called **`beat`** appears within a
   second. Click it: the request body should read something like
   `{"anon":"7f3c…","session":"a91b…","active_ms":0,"ended":false}` — four fields, no email, no
   token.
4. Leave the game open and play for a minute. A new **`beat`** appears every 30 seconds, and
   `active_ms` climbs by about 30000 each time. If you switch to another tab for a minute and come
   back, `active_ms` will **not** have climbed by that minute — that is the feature working.
5. Open **https://api.playthecrew.com/admin/analytics** in another tab.
6. Sign in at the browser's password box with your `ADMIN_EMAIL` address and its password.
7. **Playing now** should read 1 (it counts anything that checked in within the last two minutes),
   and your sitting should be the top row of **Recent sessions** with a dot beside it.
8. Close the game tab. Wait a few seconds and reload the dashboard: the row now has an **Ended**
   time and the dot is gone.
9. To prove it is private, open the dashboard in a **private/incognito window** and press Cancel at
   the password box, or sign in with any non-admin account. You should get a bare *Not found* — not
   a login page, not an empty dashboard, and no data.

If something looks wrong, `https://api.playthecrew.com/health` should answer `{"ok":true,…}`. The
beat endpoint deliberately answers **204 and nothing else** to everything, including junk, so there
is no error message to read there — that is by design.

---

## Settings you may want to change

None are required; every one has a working default.

| Variable | Default | What it does |
|---|---|---|
| `BEAT_RATE_LIMIT` | 120 | checkpoints allowed per anonymous id per window |
| `BEAT_RATE_WINDOW` | 600 | that window, in seconds |
| `ADMIN_RATE_LIMIT` | 10 | password attempts at the dashboard per caller per window |
| `ADMIN_RATE_WINDOW` | 3600 | that window, in seconds |

`ADMIN_EMAIL` was already required for press passes and now also decides who may read this. No new
required variable was added.

---

## Still yours to decide

**The game has no privacy page.** Nothing collected here is personal and nothing identifies
anybody, so there is no legal trigger that was not already there — but a paid product that measures
anything usually says so somewhere, even in one line. The honest options are a short paragraph on
playthecrew.com, a line in the handbook, or nothing. It is a decision rather than a task, which is
why it is written down here instead of done.

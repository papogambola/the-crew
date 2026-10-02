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

---

# Game events — what players do, and where they stop

The second half of the same system: same anonymous id, same sitting, same single request. Events
are queued in the browser and emptied onto the next heartbeat, so opening a posting costs nothing
at the moment it happens and a sitting still makes two requests a minute whatever is going on.

## Every event, what fires it, and what it carries

Names come from the game, not from a generic list. The Crew has no levels, quests or characters;
it has a founding week, a roster of six thousand files, recruitment trips you travel to, postings
on a board, and nights that end in one of five bands.

| Event | Fired by | Carries |
|---|---|---|
| `game_started` | `confirm-create` — a commander is made | week |
| `game_resumed` | `continue` — a save loads | week |
| `candidate_viewed` | `open-recruit` — a file opened on the roster | trade, experience rank, week |
| `trip_started` | `hire()` — a recruitment trip begins | trade, rank, week |
| `member_signed` | `finishTrip` signs · `applySign` (a walk-in) | trade, rank, crew size, `trip`/`walkin`, week |
| `member_refused` | `finishTrip` — they said no | trade, rank, week |
| `member_dropped` | `drop-yes` — cut loose | trade, rank, week |
| `member_lost` | `leaveCrew` — dead, jailed, walked, poached, betrayed | reason, rank, trade, week |
| `crew_filled` | every seat taken, first time in a sitting | crew size, time since the campaign began |
| `job_viewed` | `open-job` — a posting opened | category, tier, how many could go, week |
| `job_cased` | `caseJob` — a week spent watching one | category, tier, week |
| `job_run` | `startJob` — the crew is committed | category, tier, crew size, wanted trades, **how long the decision took**, week |
| `job_done` | `finishJob` — the verdict | category, tier, verdict 0–4, came off yes/no, crew size, time, week |
| `job_expired` | a posting **you opened** goes off the board | category, tier, whether it had been cased, week |
| `rival_ended` | `rivalEnd` — a rival chapter closes | how it ended, week |
| `week_turned` | `weekTick` | week |
| `game_over` | `S.over` — the last stage won, or no crew and no float | `win`/`lose`, week |
| `new_game` | `newgame` — wiped and started again | week |

Never sent: a title, a person's name, a city, a country, a line of narrative, or any game state.
Only numbers and one short word from a fixed list. A name the server does not know is dropped.

## Where each one appears

| Section | Built from |
|---|---|
| **Core progression funnel** | `game_started`/`game_resumed`, `job_viewed`, `job_run`, `job_done` |
| **Building a crew** | `candidate_viewed`, `trip_started`, `member_signed`, `member_refused`, `crew_filled`, `member_dropped`, `member_lost` |
| **Trades players sign** | `member_signed` |
| **Postings — by kind and tier** | `job_viewed`, `job_run`, `job_done`, `job_expired` |
| **How nights end** | `job_done` verdicts |
| **Where sittings end** | the last event of each finished sitting |
| **First-timers against people who came back** | all of them, split by `PlaySession.is_new` |
| **One player, in order** | all of them, for one anonymous id |

## Two things that are not what you might expect, and why

**Postings group by category × tier, not by job ID.** A posting's id is minted from each game's own
seed and its title is assembled from a verb pool and a noun pool — "Intercept the night ferry" is
one of thirty-six interceptions, and no two players ever see the same id. An id column would hold
one row per value and could not answer "which assignment is too hard". The twelve categories
(Interception, Recovery, Extraction, Escort, Surveillance, Infiltration, Cyber, Smuggling, Papers,
Negotiation, Sabotage, Vault) crossed with the four tiers is the only unit that means the same thing
in two different players' games.

**Recruitment is not in the funnel.** The Crew does not gate the board on having a crew — you can
open a posting with nobody on the books — so putting "filled the crew" between "began a campaign"
and "opened a posting" produced a drop-off of **minus twelve per cent** on real seeded data. Every
link in the funnel is now something the game genuinely requires of the step below it. Recruitment is
counted in **Building a crew** as what it is: behaviour, not a gate.

## Filters

Window (Today · 7 days · 30 days · All time) applies to everything. The Game Events section adds:

- **Players** — Everyone · First sitting · Returning
- **Posting** — any of the twelve kinds. Narrows the postings table only; it deliberately does not
  narrow the funnel, because "the funnel for people who ran vault jobs" silently drops everybody
  who never ran one, which is the population the funnel exists to count.
- **Outcome** — All · Came off · Did not

## Checking the events work

Carrying on from step 9 above:

10. Open the game and press **Begin**, fill in a name, and press the confirm button.
11. In the Network tab, the next **`beat`** (within 30 seconds) has an `events` array in its body
    with `{"n":"game_started","q":1,"w":1}` in it.
12. Open somebody's file on the **Roster** tab, then open a posting on the **Jobs** tab. The next
    beat carries `candidate_viewed` and `job_viewed`.
13. Reload **/admin/analytics**. **Core progression funnel** shows you at "Opened a posting", and
    **Postings — by kind and tier** has a row for the kind you opened.
14. Scroll to **One player, in order**, click the chip with your anonymous id on it, and read your
    own sitting back as a list of times and sentences.

If nothing appears: events only flow where `API_LIVE` is true **and** `/health` has answered, so a
copy opened off a disk or on itch.io sends nothing at all — by design.

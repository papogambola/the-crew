# Putting the server on Railway — step by step

**Do these in order.** Step 3 creates the database, and nothing before it can go green: the
`Procfile` runs `alembic upgrade head` before uvicorn, so with no `DATABASE_URL` the app fails its
migration, restarts, fails it again, and sits in a crash loop that looks like a broken app rather
than a missing variable.

Where a step depends on Railway's own screens, the wording is what it usually says. Railway moves
things around; if a button is not where this says, look along the top tabs of the service — the
names below are stable even when the layout is not.

---

### 1. Make the service

1. Open **railway.app** and sign in with the account Costora runs on.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Choose **papogambola/the-crew**.
4. Railway will start a build and it will **fail**. That is expected — it is looking at the
   repository root, which is a game, not a server. Step 2 fixes it.

*Worked when:* the project exists and you can see a service card with a red "Failed" badge.

### 2. Point it at the server directory

1. Click the service → **Settings**.
2. Find **Root Directory** (under Source, or Build — it has moved between the two).
3. Type `server` and save.
4. Leave Build Command and Start Command **empty**. The `Procfile` in `server/` says what to run;
   anything typed in those boxes overrides it and then the migration stops running on deploy.

Nothing to set for the Python version: `server/.python-version` says `3.11`, which is what Costora
runs. Unpinned, the builder picks whatever it defaults to that month, and a build that worked in
September fails in November with a wheel that will not compile.

*Worked when:* the next build log shows `pip install -r requirements.txt` and finishes green.

### 3. Add the database

1. In the project, click **New** → **Database** → **Add PostgreSQL**.
2. Wait for it to say Available.
3. Click the **server service** → **Variables** → **New Variable** → **Add a Reference**, and
   pick the Postgres service's **`DATABASE_URL`**.

   Use a reference, not a copy-paste of the URL. Railway rotates the password when it feels like
   it, and a reference follows; a pasted string does not, and the service dies at three in the
   morning for no visible reason.

*Worked when:* the server service's Variables list shows `DATABASE_URL` with a link icon next to
it rather than a plain value.

### 4. Set the signing secret

1. On your own machine, run:

       python3 -c "import secrets;print(secrets.token_urlsafe(48))"

2. Copy what it prints.
3. Service → **Variables** → **New Variable**. Name it `JWT_SECRET` and paste the value.

   It must be at least 32 bytes — the server refuses to start on anything shorter, on purpose,
   because that secret is the only thing between a stranger and every account.

4. **Do not put it anywhere else.** Not in the repository, not in a chat message, not in a note.
   If it ever leaks, replace it here: everybody is signed out and signs in again, which is all it
   costs.

*Worked when:* the deploy goes green and `https://<your service>.up.railway.app/health` returns
`{"ok":true}`.

### 5. Let the game talk to it — probably nothing to do

`ALLOWED_ORIGINS` already **defaults** to exactly the two production origins
(`app/config.py`), so a plain production deploy needs no variable here. Skip this step unless one
of the following is true:

- the game is served from somewhere else as well (a staging copy, a preview URL) — then set
  `ALLOWED_ORIGINS` to the **whole** comma-separated list, production included, because the
  variable replaces the default rather than adding to it;
- you are running the server for the test suite, where the game is on `http://127.0.0.1:8930`.

The list is exact-match: scheme, host and port, no trailing slash. An origin not on it is refused
by the browser, and the game says *the server did not answer* while the server's own log looks
perfectly healthy. That is CORS working.

*Worked when:* nothing — there is nothing to check if you skipped it. If you did set it, the deploy
goes green and the health URL still answers.

### 6. Give it the name the game already calls

**This one is load-bearing, not tidying.** The shipped game asks
`https://api.playthecrew.com` and nothing else — `API_HOME` in `play.html`. Until that name
resolves, every account screen in the live game says *the server did not answer*, however green
the Railway service is.

1. Service → **Settings** → **Networking** → **Custom Domain**.
2. Enter `api.playthecrew.com`.
3. Railway shows a CNAME target. Add that CNAME wherever playthecrew.com's DNS is edited — the
   same place the `www` record points at `papogambola.github.io`, which is what serves the site
   today.
4. Wait for Railway to say the domain is active — usually minutes, occasionally an hour.

*Worked when:* `https://api.playthecrew.com/health` returns `{"ok":true}`, and the office's
account screen in the live game gets past *the server did not answer*.

A name of our own rather than Railway's, because the game hard-codes whichever address it is
given and `the-crew-production-a1b2.up.railway.app` changes if the service is ever recreated.

---

## Mail, so that forgetting a password is not permanent

**Without this, `/auth/forgot` accepts the request, tells the player a link is on its way, and
sends nothing.** That is by design — the endpoint answers identically whether or not the address
has an account, so it cannot report a delivery failure without also reporting who has an account.
It means a deploy with no mail set up has a reset flow that fails silently, and the only person
who finds out is somebody already locked out.

`https://api.playthecrew.com/health` says which it is:

```json
{"ok":true,"mail":{"configured":false,"transport":"none", ...}}
```

`"transport":"none"` is nothing configured. `"resend_api"` or `"smtp"` means it will try, and
`last_error` there names the last failure if there was one.

Resend over HTTPS is the one to prefer, because Railway blocks or silently drops outbound SMTP
often enough that a timeout is the usual first symptom. Two variables:

| Variable | What it is |
|---|---|
| `RESEND_API_KEY` | the key from Resend. Nothing else needs setting. |
| `SMTP_FROM_EMAIL` | who it comes from, e.g. `no-reply@playthecrew.com`. **It must be a domain verified with the provider** — this is the usual thing that is wrong, and it comes back as a 403 that `/health` will show you. |

For an ordinary SMTP provider instead: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`,
`SMTP_PASSWORD`, `SMTP_FROM_EMAIL`. Port 465 switches to implicit TLS on its own; override with
`SMTP_USE_SSL` only for something unusual.

Two more, both optional:

| Variable | Default | What it is |
|---|---|---|
| `SITE_URL` | `https://playthecrew.com` | where the reset link points. It has to be where `reset.html` is actually served, so a staging copy needs its own. |
| `RESET_TTL_MINUTES` | `60` | how long a link is good for. |

## When the shop opens

Three more variables, and only when you are ready to take money:

| Variable | What it is |
|---|---|
| `LEMON_STORE` | the store id the key must have come from |
| `LEMON_PRODUCT` | the product id the key must be for |
| `LEMON_API` | leave unset; it defaults to Lemon Squeezy's licence endpoint |

Without the first two the server accepts any key Lemon Squeezy says is valid, from any of your
products. With them it accepts only keys for this game.

## What the game already does with this, and what it does not

Since build 115 the game **does** call this server. The office has an account screen; signing in
mints a token; each new game week is reported to `POST /run/week`, which is where the free run is
counted; the save is mirrored to `PUT /saves` and can be pulled back on another machine.

It is deliberately not yet a wall. With no server reachable, or nobody signed in, the game falls
back to counting weeks in `localStorage` and plays exactly as it did before — so the day the
domain goes live nobody mid-game is locked out, and the day it goes down nobody is locked out
either.

Still not done, and worth knowing before you invite anybody:

- **No password reset and no email verification.** The first person who forgets a password is
  locked out with nothing the app can do about it.
- **The shop is shut.** `LEMON_STORE` / `LEMON_PRODUCT` are unset, so no key can be bought and
  the free run ending has no door out of it yet.

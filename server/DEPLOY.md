# Putting the server on Railway — step by step

**Do these in order.** Step 3 creates the database, and step 4 will not work without it.

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

### 5. Let the game talk to it

1. Service → **Variables** → add `ALLOWED_ORIGINS` with the value:

       https://playthecrew.com,https://www.playthecrew.com

   Without this the browser blocks every call from the game with a CORS error, and the game will
   look broken while the server looks fine.

*Worked when:* opening the health URL still works, and the deploy log shows no error.

### 6. Give it a name that is not Railway's

1. Service → **Settings** → **Networking** → **Custom Domain**.
2. Enter `api.playthecrew.com`.
3. Railway shows a CNAME target. Add that CNAME at whoever holds the playthecrew.com DNS.
4. Wait for Railway to say the domain is active — usually minutes, occasionally an hour.

*Worked when:* `https://api.playthecrew.com/health` returns `{"ok":true}`.

Worth doing rather than skipping: the game will hard-code whichever address it is given, and
`the-crew-production-a1b2.up.railway.app` is a name that changes if the service is ever recreated.

---

## When the shop opens

Three more variables, and only when you are ready to take money:

| Variable | What it is |
|---|---|
| `LEMON_STORE` | the store id the key must have come from |
| `LEMON_PRODUCT` | the product id the key must be for |
| `LEMON_API` | leave unset; it defaults to Lemon Squeezy's licence endpoint |

Without the first two the server accepts any key Lemon Squeezy says is valid, from any of your
products. With them it accepts only keys for this game.

## What is NOT done yet

The game does not call any of this. It still keeps the count in `localStorage` and still checks
its own licence key in the browser. Wiring the client to the server is the next slice — this one
is the server existing, tested, and deployable.

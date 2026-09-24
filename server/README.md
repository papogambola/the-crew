# The Crew — the server

The game has been one self-contained HTML file with everything, including the truth, on the
player's machine. This is where the truth moves. `ARCHITECTURE_AUDIT.md` in the repository root
is the survey and the plan; this is the first slice of it.

## What this slice does, and what it does not

It does: **an account, and a free run that cannot be reset.** Sign up, sign in, and the twelve
free weeks are counted against the account rather than against `localStorage` in one browser. A
new browser, a cleared cache, a second machine — the count is where it was. Payment attaches to
the account too, so a licence bought once opens the game anywhere the player signs in. Forgetting
the password is recoverable: a link by email, good once and for an hour, which also ends every
session that was open before it — see `routers/auth.py` and `deps.py`, and set the mail variables
in `DEPLOY.md` or the link is composed, logged, and sent nowhere.

It does not: **make cheating impossible.** The game still computes every roll on the client, so a
player who wants to can still lie to their own copy. That is step 4 of the audit — the intent-only
API — and it is not this slice. What this slice fixes is the thing that was actually costing
money: the free run resetting itself, and a paid licence being stuck in one browser.

Said plainly because the difference matters: after this, the *entitlement* is authoritative. The
*game* is not, yet.

It also does not: **verify that an address belongs to the person who typed it.** Sign-up takes an
email on trust. Someone can open an account on an address they do not hold, and the real owner
can take it off them at any time by asking for a password reset — which is a nuisance rather than
a hole, but it is the next thing to fix, and it is the reason a receipt should not be considered
proof of anything yet.

## Running it

    python -m venv .venv && . .venv/bin/activate
    pip install -r requirements.txt
    export DATABASE_URL=sqlite:///./dev.db      # or a postgres:// URL
    export JWT_SECRET=$(python -c "import secrets;print(secrets.token_urlsafe(48))")
    alembic upgrade head
    uvicorn app.main:app --reload

    pytest -q

Tests run against SQLite in a temporary file; production is Postgres. Both are exercised by the
same migrations, which is why the migrations avoid anything only one of them has.

## No secrets in here, ever

`JWT_SECRET`, `DATABASE_URL` and the Lemon Squeezy identifiers come from the environment and have
no defaults worth having. The app refuses to boot without a secret rather than inventing one, so
a misconfigured deploy fails loudly instead of signing tokens anybody can forge.

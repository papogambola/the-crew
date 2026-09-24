# The tests

    ./tests/suite.sh

That is the whole thing. It tests `../play.html` — the game itself, not a copy — and prints a
line per suite. It takes twenty minutes or so.

## What is in here

**87 test files and a runner.** Twenty-seven `smoke*.js` load the game's script under a stubbed
DOM and drive the engine directly: the reckoning, the week, the rival, the save. Sixty
`browser*.js` open the real file in a real Chromium and click it, because a number being right
and the screen being right are different claims. Between them, about **1,500 assertions**.

They are written to be read. Each one opens with what it is for and, where it matters, what went
wrong the first time — a test whose name is `it works` teaches nobody anything the day it fails.

## What it prints

```
— node suites —
— browser drives —
browser41.js  26 ok
...
---- 1514 browser assertions ----
REGRESSIONS (failed every re-run):
INTERMITTENT (a test that depends on the world it happened to get):
```

Every run starts a new game and `newGame()` seeds the world from the clock, so each run gets a
different roster, a different board and a different set of coincidences. **A single red run does
not mean a regression.** Anything that fails is re-run and reported as a rate, because
`failed 3 of 3` and `failed 1 of 3` are different problems with different fixes: the first is a
regression, the second is a test that hopes instead of arranging.

Only the **REGRESSIONS** list should ever be empty-or-explained. `INTERMITTENT` entries are worth
reading but do not block.

## Known red

Nothing, now. `browser16` — which checks that the music loop is playing — was red for months
under the note "no route to Cloudflare R2, so that failure is the network, not the game". **That
explanation was wrong**, and being wrong it kept a permanently-red line in the run, which is
where a real failure goes to hide.

`curl` fetches the track from the same container perfectly well: HTTP 206, `audio/mpeg`. What
actually fails is that outbound HTTPS is re-terminated at the sandbox's own proxy, whose CA the
browser does not trust — the mp3 request dies on the certificate and the loop never starts. With
the CA trusted the music plays, from `file://` and from the live site alike.

So in a proxied container, pin trust to that proxy's CA by its public key and everything is
green:

    CHROME_ARGS="--ignore-certificate-errors-spki-list=<base64 sha256 of the CA's SPKI>" ./tests/suite.sh

`CHROME_ARGS` is merged into every launch by `env.js` and does nothing when unset. **Pin it** —
do not reach for `--ignore-certificate-errors`, which accepts any certificate from anybody and
turns every test that touches the network into a test of nothing.

On a machine with ordinary internet and no proxy, none of this applies and the suite is green
with no variables set.

## The two that need a server

`browser80` (the account) and `browser81` (the password reset) drive the game against a **real**
backend — a real FastAPI process, a real sign-up, a real cross-origin call — because what they
test is whether two pieces of software written separately actually speak to each other, and a
stub would agree with whatever it was told.

With no server they **skip and exit 0**. That is deliberate: a line that is always red is where a
real failure goes to hide, and this repository has already lost fifteen assertions that way. Run
them properly like this:

    cd server
    DATABASE_URL=sqlite:///./dev.db \
    JWT_SECRET=$(python3 -c "import secrets;print(secrets.token_urlsafe(48))") \
    ALLOWED_ORIGINS=http://127.0.0.1:8930,http://127.0.0.1:8933 \
    RESET_RATE_LIMIT=1000 RESET_EMAIL_RATE_LIMIT=1000 \
      sh -c 'alembic upgrade head && uvicorn app.main:app --port 8931'

    API=http://127.0.0.1:8931 node tests/browser80.js
    API=http://127.0.0.1:8931 DB=server/dev.db node tests/browser81.js

`ALLOWED_ORIGINS` matters: the tests serve the game on 8930 and 8933 and the server refuses any
origin not on that list. If the sign-up says "the server did not answer", that is usually this —
and it is CORS working, not CORS broken. Two ports rather than one because two files sharing a
port collide the moment either leaves a socket behind, which looks like EADDRINUSE from a test
that has nothing wrong with it.

`browser81` also wants `DB`, and a **SQLite** server specifically, because the one thing it
cannot do the way a person does is read the email: the raw reset token exists only in the message
the server sent, since the database holds a SHA-256 of it and nothing else. So it overwrites the
newest row's hash with the hash of a string it knows, and opens that link. Everything either side
of that — the request, the page, the expiry, the one-shot mark, the session handed back, and
whether `play.html` then finds it — is the real path.

`RESET_RATE_LIMIT` matters for the same reason `ALLOWED_ORIGINS` does — because it is the second
thing that looks like a broken test and is not. `/auth/forgot` sends mail to an address the caller
chose, so it is capped at five an hour per caller, and that counter lives in the **server process**
and outlives a test run. Run `browser81` twice against one server on the default limit and the
second run trips it. Raised here rather than reset between runs, because the limit itself is
tested where it belongs, in `server/tests/test_reset.py`, against a server built for the purpose.

Its own suite is on the other side of the wire: `cd server && python -m pytest -q`.

## Where things are

Paths live in **`env.js`** and nowhere else. It works out the repository and the game from its own
location; the browser is overridable, because where a container happens to keep Chromium is not a
fact about this project:

    PLAYWRIGHT_DIR=/path/to/playwright CHROME_PATH=/path/to/chrome ./tests/suite.sh

Defaults are what the dev container ships. If Playwright is installed the ordinary way
(`npm i -D playwright`) that is found too.

## Running one

    node tests/browser77.js                 # against ../play.html
    node tests/browser77.js /some/other.html

A smoke suite needs `thecrew_check.js`, which `suite.sh` carves out of the game at the start of a
run. Run the suite once and the single-file runs work.

    RETRIES=1 ./tests/suite.sh              # faster, less certain about flakes

## Two rules that are load-bearing

**Two things in the game cannot be called the same name.** The game is one script of ten thousand
lines in sloppy mode, so a second `function foo(){}` is legal, silent, and *wins* — it hoists over
the whole file and takes every caller the first one had. That is not a style complaint: `signed()`
was written twice, the copies differed in one case, and the second quietly changed what the first
printed everywhere. It shipped. `suite.sh` now counts top-level names before anything else runs.

**No shape in the sky may be a crucifix by accident.** `browser76` walks all 129 city drawings and
fails on a bar across a thin vertical. It exists because a generated mast put a Christian cross
over New York, Rome and St Petersburg, and the first fix put a patriarchal cross over Riyadh and
Jerusalem. Hand-drawn landmarks that genuinely have that shape — minaret galleries, Magellan's
Cross — are listed by name in that file with the reason. **A new one is a failure until a person
has looked at it**, and then it is a line in the list saying who looked and why it stays. Do not
add a name to that list without rendering the drawing first.

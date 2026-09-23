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

`browser16` fails wherever the music cannot be fetched — it checks that the loop is playing, and
the tracks live on Cloudflare R2. In a sandbox with no route to it, that failure is the network,
not the game.

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

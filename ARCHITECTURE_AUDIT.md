# Architecture audit — The Crew

**Phase 1. Findings only. No game code was changed to produce this.**

Audited at build 91, commit `7f1a571`. Every number below was measured against the repository as
it stands, not estimated.

---

## Decisions taken (build 112)

Phase 1 ended with §19 waiting on three answers. Paz has given them, so they are written here
rather than left in a chat log:

| | |
|---|---|
| **How far** | **Full server-authoritative.** Not accounts-and-saves as a halfway house. The server owns the truth: every roll, every hidden fact, every consequence. §19 in full. |
| **Where** | **Railway, beside Costora.** FastAPI + Postgres + Alembic, the stack already running and already paid for. The site stays on GitHub Pages and calls the API cross-origin. |
| **Sign-in** | **Email and password**, as Costora does. Password hashes and a reset flow, with everything that implies. |

What prompted it: the twelve free weeks can be reset by clearing browser data or opening another
browser, and a save that lives in `localStorage` does not follow anybody to a second machine.
Both are the same root cause, and both are §19's problem.

**Step 0 is done.** The tests are committed as of build 108 — 92 files, 13,222 lines, and the
suite runs from a fresh clone, 1,600-odd assertions with no regressions.

And `tools/sim.js` is **not broken**. §17 below says it "still expects a single `d.twist` from
before multiple twists landed, and crashes on the first job". That was true at build 91 and is
not true now: it reads `pendingTwists()` and answers each in turn. Ten headless games run to a
verdict and print the balance table. What looked like a crash when this was re-checked was sixty
runs taking longer than the two minutes I gave them. Corrected here rather than left standing,
because a plan carrying a blocker that has already cleared is a plan that gets read wrong.

**The cost that was accepted with this.** §19's closing note stands: after this migration, a
player with no connection has a window that cannot do anything. The desktop build loses offline
play. That was read and taken.

### Where the slices have got to

| Slice | State |
|---|---|
| **1 — an account, and a free run that cannot be reset** | shipped, build 114. Finding 2 below (no authentication of any kind) is closed. |
| **2 — the game signs in, and the save stops living in one browser** | shipped, build 115. Finding 3 is *mitigated*, not closed: the save is mirrored to the account, but it is still an unsigned blob the client writes, so it is still editable in the console. |
| **2a — a way back in** | shipped, build 116. A password reset by email, good once and for an hour, which also ends every session opened before it. Nothing in §19 asked for it; it was missing from slice 1 and the first person to forget would have been locked out for good. |
| **3 onwards — the intent-only API** | not started. Findings 1, 3, 4 and 5 all wait on it, and until it lands the entitlement is authoritative and the *game* is not. |

**Still missing from the account, and worth knowing before inviting anybody:** an address is
taken on trust at sign-up. Nobody proves they hold it, so an account can be opened on somebody
else's address — and the owner can take it back at any time by asking for a reset, which makes it
a nuisance rather than a hole, but also means a receipt attached to an account is not yet proof
of anything. Email verification is the next small piece.

---

## The short version

There is no backend. There is no database. There is no authentication. **100% of the game — every
rule, every roll, every hidden fact — runs on the player's machine**, and the whole save is one
editable `localStorage` key.

The migration is therefore not "move some logic to a server". It is "write the server", and the
useful question the audit answers is *which 1,718 lines are the server* and *which 2,522 lines
stay*.

Two findings ahead of everything else:

1. **Hidden information is not hidden — it is derivable.** The 6,000-person roster is not stored
   in the save. It is regenerated from `S.seed` by `buildRoster(seed)`. Every recruit's `mole`
   flag and `greed` value falls out of that seed. I confirmed by recomputation: the same seed
   produces the same 445 informants every time. Vetting does not reveal a server's secret; it
   un-hides a number the client has held since the first frame. **No amount of API design fixes
   this while the roster is generated from a seed the client holds.** The roster has to become
   rows in a database.

2. **The test suite is not in the repository.** 27 node suites and 48 browser drives — 10,216
   lines, 1,206 assertions — exist only in this session's scratchpad, which is ephemeral. The one
   piece of headless tooling that *is* committed, `tools/sim.js`, is stale and crashes. Splitting
   an 8,569-line engine into client and server without that suite would be reckless. **Committing
   the tests is a prerequisite, not a nicety.**

---

## 1. What technology creates `TheCrew.exe`

**Neutralino.js 6.9.0** — a native window driving the OS webview (Edge WebView2 on Windows), not
Electron and not a game engine.

| | |
|---|---|
| Config | `desktop/neutralino.config.json` (appId `games.shhh.thecrew`) |
| Build | `desktop/tools/release.sh` → `build.py` → `neu build --release` → `pack.py` |
| Ships as | `desktop/The-Crew-Windows.zip`, 1.5MB — `The Crew.exe` (2.4MB) + `resources.neu` (1.0MB) |
| `resources.neu` | an ASAR archive holding the whole game |
| Native API | **disabled** (`enableNativeAPI: false`, `nativeAllowList: []`) |
| Signing | unsigned; SmartScreen warns on first run |

`desktop/tools/build.py` copies `play.html` into the app's resources and injects exactly two
globals — `window.THE_CREW_MEDIA` and `window.THE_CREW_BUILD`. **Nothing is hard-coded in the game
itself**; the site address lives in the build script. That matters for §14: repointing the client
away from GitHub is a one-line change to a build script, not a code change.

**The EXE does not need rebuilding for this migration in any structural sense.** It is a webview
around `play.html`. Changing what `play.html` does changes the app.

## 2. What currently runs client-side

Everything. Measured across the single `<script>` block in `play.html` (8,569 lines, 470
top-level functions):

| Category | Functions | Lines | Verdict |
|---|---|---|---|
| Touch the document (screens) | 129 | 2,522 | stays on the client |
| Bound to the save (`S`/`SET`/`UI`) | 129 | 1,718 | **this is the server** |
| Pure — arguments in, value out | 212 | 1,417 | shared; runs either side unchanged |

Of these, 42 functions draw on chance: 10 in screens, 20 save-bound, 12 pure.

The twenty largest save-bound rules — the substance of the migration:

```
227  finishJob      [chance]      the verdict, the money, the wounds, the arrests
 88  narrate                      the minute-by-minute report
 87  finishTrip     [chance]      whether a recruit signs
 76  weekTick                     upkeep, heat decay, loyalty drift, the rival
 64  assessJob                    who can go, and the margin
 54  streetRun      [chance]      quick money
 52  clashApply     [chance]      two of a trade
 45  startTrip      [chance]
 44  eventApply     [chance]      between-jobs decisions
 39  makeJob                      a posting
 33  looseOptions                 somebody leaving
 32  talkForce      [chance]
 30  checkMilestones
 29  startJob       [chance]
 27  grudgeAdd
 26  refreshJobsInner             the board
 26  makeEvent
 24  applyRoll      [chance]      somebody asking to join
 21  rivalWorks                   the other crew taking a posting
 21  renderModal
```

## 3. What currently runs server-side

**Nothing.** I searched every tracked file for `express|fastify|koa|http.createServer|listen(|
postgres|sqlite|mysql|mongodb|supabase|prisma|knex|sequelize|jsonwebtoken|bcrypt`. The only hits
are in build tooling (`tools/handbook/hb-drive.js` and `hb-pdf.js` each start a throwaway local
HTTP server to render the handbook PDF) and one false positive (`kNex` matching inside
`rankNext`).

GitHub Pages serves static files. That is not a backend — it cannot decide anything.

## 4. Where game state is stored

In memory, in one global object `S`, and mirrored to **`localStorage["thecrew_save_v2"]`**.

Measured on a played game at week 15: **39,031 bytes, 42 top-level keys.**

```
reports  25,239B   the case log — 65% of the save
recent    3,085B   lines already used, so prose does not repeat
jobs      2,374B   the board
log       2,200B
bondLog   1,769B
ov        1,724B   per-person overrides (4 people)
player      606B
```

`S.roster` is **not** in the save. `packState()` writes only an `ov` map of changed fields for
people who have been touched, and `load()` rebuilds all 6,000 from `buildRoster(d.seed)` and lays
the overrides on top.

## 5. How saves work

- One browser `localStorage` key, written by `save()` after every action.
- One slot. No profiles, no server copy, no history.
- **Export/import exists and is plain text**: `makeCode()` produces `CREW1:` + base64 of the same
  JSON; `readCode()` accepts it back with only a shape check (`d.v===2 && d.seed && d.player.n`).
  There is no signature and no checksum. Decode, set `money` to anything, re-encode, paste.
- Consequence: the save is fully portable and fully forgeable today.

## 6. Where the database is, and what technology

**There is none.** No SQL, no ORM, no hosted store, no schema anywhere in the repository. The
closest thing to a database is `buildRoster(seed)` — a pure function standing in for a table of
6,000 rows.

## 7. Where game calculations happen

All in the client. The decisive one is inside `finishJob` (`play.html:3144`):

```
m = a.margin + P.roll + dm                      // crew quality + the roll + twist damage
tier = m > BAL.vClean ? 4 : m > BAL.vSuccess ? 3 : m > BAL.vMessy ? 2 : m > BAL.vBotched ? 1 : 0
take = payout × (1.08 | 1.00 | BAL.messyPay | 0 | 0)
heatGain = round(job.heat × heatMul × rank.heatMul) − a.heatCut + traitHeat + (leaked ? 12 : 0)
```

Every threshold lives in one object, `BAL` (`play.html:694`) — verdict cut-offs, roll spread,
difficulty curve, weeks per tier, casing costs, XP steps. **The entire balance table is shipped to
the player**, and under a server-authoritative model it must not be.

## 8. Where RNG happens

All client-side, `mulberry32` throughout. Since build 88 there are three distinct streams:

| Stream | Seeded from | Reproducible |
|---|---|---|
| The roster | `S.seed` | yes — all 6,000, identically, forever |
| The board | `S.seed ^ (week × 2654435761)` | yes, per week |
| Outcomes | `S.seed ^ (S.rngN × 2654435761)`, counter saved | yes |
| Title faces, dossier roll, re-roll buttons | `Date.now() ^ Math.random()` | no — deliberately |

**This is the one piece of the migration already done.** The game is a function of
`(seed, order of decisions)`, so a server can replay a run and get the same answer. It was not
true before build 88 and it is the reason a verifiable leaderboard is now possible at all.

## 9. How jobs are generated and resolved

**Generated** — `refreshJobs(fill)` seeds `mulberry32(S.seed ^ week×2654435761)` and calls
`makeJob(rng, tierBias)` until the board holds 7 (9 with a fixer on retainer). Postings expire
3–6 weeks out. `rivalWorks()` may take the best one each week. Seven-place operations come from a
separate 500-entry catalogue.

**Resolved** — `assessJob()` computes who can go and the margin; `startJob()` fixes the roll and
stores `postSeed`; twists are answered; `finishJob()` applies the formula in §7 and writes money,
heat, XP, loyalty, wounds, arrests and the report.

Note `P.postSeed` is already stored so the second half of a report is reproducible — the codebase
was already reaching for determinism before build 88 formalised it.

## 10. How crew members are generated

`buildRoster(seed)` → `genChar(rng, i, used)` × **6,000** (5,000 ordinary + 1,000 specialists),
all at game start, all from `S.seed`. Each carries attributes, trade, experience, education,
languages, knowledge, traits, limits, fee, upkeep, cut, loyalty — and `greed`, and
`mole: chance(rng, 0.07)`.

Measured: **445 of 6,000 are informants**, and recomputing `buildRoster(S.seed)` reproduces the
same 445 exactly.

## 11. How hidden information is currently handled

It is not hidden. It is present and merely unrevealed.

```js
greed: ri(rng,15,90),
mole:  chance(rng,0.07),
vetted:false, vetFlag:false,
```

`vet(id)` charges $6K, reads `c.mole`, allows a 35% miss when the crew's sharpest Brains is under
55, and writes `c.vetFlag`. The secret was in the client's memory the entire time — and worse,
recomputable from the seed by anyone who never opens a debugger.

The same applies to every other unrevealed fact: traits, the true difficulty of a posting, whether
a job will leak, who will walk. **Under a server-authoritative model this is the hardest single
item in the migration**, because it cannot be fixed by withholding fields from an API response
while the client can still regenerate the roster. The roster must stop being a function and start
being rows.

## 12. How economy, XP, ranks, heat, loyalty and progression are calculated

All client-side, all from constants in `BAL` and `RANKS`:

| System | Where | Notes |
|---|---|---|
| Money | `finishJob`, `weekTick`, `bonus`, `vet`, `caseJob`, `learnStart`, `jokerPlay` | plain `S.money -= n` |
| Upkeep | `weekTick` via `payroll()` | every member, every week |
| XP / ranks | `finishJob` → `c.xp`, `EXP`/`xpSteps` | five ranks |
| Ranking (`S.rep`) | `finishJob`, `checkGoals`, `layLow` | drives tiers, who signs, seats, difficulty |
| Heat | `finishJob` (`heatGain`), `heatDrop()`, `countryHeatAdd` | raid at 100 |
| Loyalty | `finishJob` (`loyD`), `bonus`, `weekTick` drift, `looseTick` | walkouts |
| Unlocks | `crewSeats()`, `foundingRules()`, `EXTRA_CREW_WEEKS`, `bigOpen()` | |

## 13. What GitHub is currently used for

| Use | Runtime? |
|---|---|
| Source control (`papogambola/the-crew`, **still public** — checked via API) | no |
| GitHub Pages hosts the browser version at `papogambola.github.io/the-crew/` | **yes** |
| Pages serves the EXE download `desktop/The-Crew-Windows.zip` | distribution only |
| Pages serves `music/` (54MB) to the desktop app | **yes** |
| Pages serves `version.txt` for the "newer build" notice | **yes** |
| Pages serves `handbook.html` and the PDF | web build only |

## 14. GitHub runtime dependencies of the running game

Three, all through the injected `MEDIA_BASE`, none hard-coded in `play.html`:

1. `MEDIA_BASE + "music/*.mp3"` — music. Absent, the game plays silently; nothing else changes.
2. `MEDIA_BASE + "version.txt"` — the update check. Absent, it says nothing.
3. `MEDIA_BASE + "desktop/The-Crew-Windows.zip"` — a link in that notice.

Plus one non-GitHub external: the Google Fonts stylesheet in `<head>`. The desktop app renders
with fallback faces if it is blocked.

**The desktop app already runs with all of these unreachable** — that was build 85, and
`browser60` proves it. So removing GitHub from the runtime is: change one string in
`desktop/tools/build.py`, host `music/` and `version.txt` beside the new backend, and self-host
the fonts. There is no code change in the game.

## 15. What must move to the backend

Everything that decides. Concretely, the 129 save-bound functions (1,718 lines) plus the pure
rules they call (1,417 lines) and the tuning tables:

- `buildRoster` / `genChar` / `genProfile` — **and the 6,000 rows must live in the database**, not
  in a function the client can run
- `makeJob` / `refreshJobs` / `bigCatalogue` — the board
- `assessJob`, `startJob`, `finishJob`, `applyRoll`, `twistResolve`, `makeTwists`
- `weekTick`, `looseTick`, `grudgeTick`, `detWatch`, `rivalWorks`
- `startTrip` / `finishTrip`, `vet`, `bonus`, `learnStart`, `caseJob`, `streetRun`, `jokerPlay`
- `checkGoals`, `checkMilestones`, `crewSeats`, `foundingRules`
- `BAL`, `RANKS`, `GOALS`, `TWISTS`, `WEEKLY`, `LIMITS`, `TRAITS`, and the country/job tables
- `freshRng` and all three seeded streams
- `packState` / `load` → replaced by rows

## 16. What should stay in the EXE

- The 129 screen functions (2,522 lines) and all CSS
- `avatarBody()` and the face system — pure drawing, 131 lines, needs only a seed and a spec
- Music, the siren, the ticker, sound settings
- Input handling, keyboard shortcuts, the office, the QRH, the handbook
- `SET` (sound, volume, speed, brightness) — harmless local preferences
- New: session token storage, the API client, and a cache of the last server response so a screen
  can redraw without a round trip

The presentation-only helpers — `money()`, `moneyExact()`, `esc()`, `cap()`, `groupByCategory()`,
`compareCategories()`, `flagSvg()`, `diffbar()` — stay client-side, and several of them will need
to exist on both sides.

## 17. What existing backend code can be reused

None, because none exists. But two assets are worth more than they look:

- **The engine already runs headless in Node.** `tools/sim.js` and the 27 node suites load the
  `<script>` block into a VM with a stubbed DOM and drive the engine directly. The technique is
  proven, and it is the whole reason a Node or Python server can be made to produce the same
  outcomes this engine does. ~~Caveat: `tools/sim.js` is currently broken~~ — **fixed since this
  was written; see "Decisions taken".** It plays whole games and reports the balance, which makes
  it the instrument for proving the server computes what the client used to.
- **The determinism from build 88** means server-side replay is possible today.

## 18. Security vulnerabilities under a server-authoritative model

| # | Finding | Severity |
|---|---|---|
| 1 | Hidden facts are recomputable from `S.seed` — 445 informants among 6,000, derivable without a debugger | **critical** |
| 2 | No authentication of any kind. No token, session, JWT or OAuth anywhere | **critical** |
| 3 | The save is a single unsigned `localStorage` key; money, ranking, heat are editable in the console | **critical** |
| 4 | `CREW1:` export/import accepts any base64 JSON passing a three-field shape check — no signature, no checksum | **critical** |
| 5 | The whole `BAL` table ships to the player, so every threshold and payout is readable | high |
| 6 | All RNG is client-side; even seeded, the client picks its own seed | high |
| 7 | The client would be free to send outcomes rather than intentions unless the API is intent-only from the first endpoint | high |
| 8 | No rate limiting, no idempotency, no replay protection — nothing to attach them to yet | medium |
| 9 | The EXE is unsigned; `resources.neu` is an ASAR anyone can unpack and edit | medium |
| 10 | Tests live outside the repository; a migration without them has no safety net | **high (process)** |

Items 1–4 are not bugs. They are the correct design for a single-player game with no server, and
they are exactly what the migration exists to change.

## 19. What must change to reach `TheCrew.exe → HTTPS API → Backend → Database`

In dependency order. **Nothing below has been started.**

**0. Commit the tests.** 10,216 lines currently exist only in a scratchpad. Fix `tools/sim.js`
while doing it. Without this the rest is uninsurable.

**1. Split rules from screen.** Carve `play.html` into a core module (the 1,718 save-bound lines
plus the 1,417 pure ones) and a UI module. The core must not reference `document`, `window` or
`localStorage`, and must take state as an argument rather than reading the global `S`. This is the
long pole and it produces nothing visible. It can be done in slices that each stay green.

**2. Turn the roster into rows.** `buildRoster(seed)` becomes a seeding job that writes 6,000 rows
once, server-side, with `mole` and `greed` in columns the API never selects until vetting says so.
This is the only fix for finding #1.

**3. Schema and accounts.** Players, campaigns, crew, jobs, events, ledger. Auth with real
sessions. Managed platform, per the earlier decision.

**4. Intent-only API.** `POST /api/v1/jobs/{id}/accept` and siblings. Every endpoint authenticates,
authorises, reads authoritative state, computes, rolls server-side, writes, and returns **only the
fields that player has earned the right to see**. A response shape per screen, not a state dump.

**5. Swap the client's data layer.** The screens keep their inputs; what changes is where those
inputs come from. `save()`/`load()` are replaced by the API client. `BAL` and the tables leave the
client except where a screen needs a label.

**6. Three environments.** `local → localhost backend → dev database`, staging, production. The
base URL comes from config injected at build time — the mechanism already exists in
`desktop/tools/build.py`, which is how `THE_CREW_MEDIA` is set today. No secrets in the EXE, ever;
the client holds a session token it was given, and nothing else.

**7. Then, and only then**, the leaderboard and raiding — both of which are straightforward once
the server owns the truth, and impossible before.

---

### One thing that is not in scope but should be said

A player with no connection currently has a complete game. After this migration they will have a
window that cannot do anything. That is the necessary cost of an authoritative server and of the
features you want, but it is a real loss for the desktop build, and it is worth deciding
deliberately rather than discovering later.

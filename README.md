# The Crew

A black-ink-on-white-paper game of global crime. You are the criminals. One file, no dependencies.

You are the name at the top of the police's chart, and the commander of the crew. Fill the
other four seats from **5,000 operatives**, then take the jobs clients post online — country
by country, each with its own language, money, politics, religion, terrain and job
categories. Everyone on the crew goes on every job, if the border lets them in and the job
doesn't hit one of their limits.

Play it here: **https://papogambola.github.io/the-crew/** — every push to `main` redeploys it.

The working foundation for the design is `CONCEPT.md`, kept as written, with a dated log of
decisions at the end.

## What is in the build

- **A five-person crew, you included.** You create your own file — alias, sex (male or
  female), nationality, technique — and the rest of your profile is rolled, re-rollable. You
  are the commander. Four seats to fill from the roster.
- **5,000 operatives**, generated from a seed so a save stores only what changed. Every file
  carries: nationality and passport tier; five attributes (Muscle, Brains, Tech, Charm,
  Nerve); a technique (16); experience rank; knowledge domains (10); education (six levels,
  from no schooling to doctorate); time in jail; time on the streets; languages; commander
  or soldier by nature; a fee, a cut and weekly upkeep; and things they will not do — cannot
  swim, will not fly, fear of heights, claustrophobic, no violence, won't work nights, banned
  from the EU, wanted in the United States, won't work under authoritarian rule, demands 15%.
- **49 countries**, each with languages, currency, majority religion, political system,
  economy, terrain, a border rule (open, visa, strict) and **its own subset of the twelve
  job categories** — interception, recovery, extraction, escort, surveillance, infiltration,
  cyber, smuggling, papers, negotiation, sabotage, vault. Countries share categories, but no
  two offer the same list.
- **Jobs.** Seven or so postings a week from named clients, each with a fee (scaled by the
  local economy), difficulty, heat, wanted techniques and knowledge — coloured green if your
  crew has them, red if not — and the tags that trip a crew member's limits. Postings expire.
  Sort the board by best fit, crew needed, technique wanted, fee, heat, difficulty, country or
  expiry. Your crew sits above the board in a strip so a posting can be judged without leaving;
  keys 1–4 jump between the tabs.
- **The map.** Beside the postings, a world map drawn in the same ink — continents and a
  graticule, no borders — with a lit marker on every country that has a posting (and a count
  when there are several). Choose a job and the map zooms to its country, centred and spotlit
  with the rest dimmed, while the job file opens on the left. Click a lit country to show only
  its postings; hover a posting to light its country.
- **The reckoning.** Before you take a job, the file shows who can go and why not (border,
  conviction, a limit the job hits, injury), then every factor with its number: crew size,
  who commands, language, local national, knowledge (double if studied), techniques, heat.
  Every requirement on the file — crew size, techniques, knowledge, language, the job's
  conditions — carries a green tick or a red cross, and the chip's border says the same.
- **The live report.** Take the job and it plays out minute by minute, manager-game style:
  the crew arriving, who got in and who didn't, who does the talking, what each technique
  buys, what goes right and wrong for that kind of job, the exit, the police by morning, the
  split — then the verdict stamp. Skip to the end if you'd rather, or set the pace: five
  speeds, Slowest to Fastest, on the report itself and in the office. The field
  roster marks who came back: **GONE** in red on anyone who walked with the money, **TAKEN** on
  anyone the police held, **HURT** on the injured.
- **Job recaps.** Every job you have run stays on file. The Log's week is a dropdown to any
  past week, and each job reopens as its full report — the minute-by-minute, the verdict, the
  split, why the ranking moved, what they learned, who came back.
- **Ranking.** The crew's standing — Nobody, Small time, Known, Respected, Feared, The Crew —
  rises with clean and successful jobs (more for a bigger job, a little more if nobody was
  hurt) and **falls** with messy, botched or disastrous work, a leak, an arrest, or a member
  walking with the money. Every end-of-job screen lists the reasons. At 100 the final score
  appears.
- **A crew that grows.** Everyone who goes on a job gains experience; ranks — Rookie,
  Operator, Professional, Veteran, Legend — are earned at 40, 110, 220 and 400 xp, and good
  work adds a point to the attributes the job leaned on. You included.
- **Continue.** The game saves itself after every move, in the browser you play in. The title
  screen offers the saved crew first — name, week, ranking, money — and warns if the browser
  is refusing to keep saves (a private window, or site data blocked).
- **The office.** Esc, or the three-line button top right, opens the boss's office — the
  pause and settings screen, drawn as line art you can click. The radio's SOUND switch, MUSIC
  switch and VOLUME knob, the DISPLAY monitor's brightness slider, the LANGUAGE paper, the
  CONTROLS book, the EXIT door, and your hat on the hook (your own file). Settings are kept
  separately from the game and survive a new game.
- **Music.** The creator's 14-track compilation, split on the silences between tracks and
  re-encoded to 128 kbps for the web (`music/`). Eleven tracks rotate under the live job
  report, one per job; three score the verdict — the quietest for a success, a middle one for a
  messy job, the loudest for a disaster — and loop while the report is open. The radio is quiet
  between jobs. Browsers only allow audio after the first click, so the first job's track starts
  on the click that takes it; the radio in the office shows its state and has a **Start the
  radio** button.
- **Sound.** A small set of synthesised effects — clicks, the verdict stamp, a coin on a
  hire, a siren on a raid. No files; the office switch turns it off.
- **Tutorial.** On the first game, ten steps walk through the screens, highlighting each
  thing as it goes. Skip it, or run it again from the **i** button or the controls book.
- **The i button.** Beside the menu button on every screen (or press **i**): what this screen
  is and how each part works, in plain words.
- **Deception.** About one file in fourteen is a police informant. Vetting costs $6K and a
  dull crew misses one in three. After a big score a disloyal, greedy or informant member
  may skim the split and vanish; a loyal one stays.
- **Pressure.** Heat penalises every job and triggers a raid at 100; laying low cools it.
  Botched jobs get people hurt or held.

## Decided

- **The crew are criminals, not police** (15 September 2026). Clients online are the buyers;
  the police are the heat.
- **The player is always the commander, for now** (15 September 2026). Commander/soldier
  stays a quality on every roster file: a commander-type recruit takes your orders badly
  (−3 each on a job you lead) but can run the crew on a job you can't get into (their command
  score −2); with no one able to lead, the crew is leaderless (−10). The long game — real
  users with their own avatars choosing commander or soldier and growing over time — is
  recorded in `CONCEPT.md` as direction.
- **Pause, settings and a sound switch** (15 September 2026), as the office above.
- **No "dark web"** (15 September 2026). Jobs are posted online.
- **Ranking rises and falls per job, and the crew grows** (15 September 2026), as above.

## Provisional choices — easy to change

`CONCEPT.md` lists these as open. The build needed an answer to run, so each has the
smallest one; none is a decision.

- **Missions** resolve in one roll: crew power (weighted attributes × experience, plus the
  factors above) against difficulty, ±18. Five verdicts: Clean, Success, Messy, Botched,
  Disaster. The live report narrates that outcome; it does not change it.
- **"Very basic"** is read as: four tabs, no map, no per-job assignment — the whole crew
  goes, and the game is choosing who sits in the seats and which postings to take.
- **Recruitment** is a one-off fee plus weekly upkeep and a cut of each score, with four
  seats and the option to cut anyone loose.
- **Attribute values** run 12–98 and are rolled from experience, technique and role, then
  grow a point at a time with good work.
- **Language** is English only; the paper on the desk is where more will go.

## Which build am I on?

The footer of every screen, and the office header, carry a build stamp (`build 11 · 15 September
2026`). If the stamp is older than the latest commit here, the browser is showing a cached copy —
hard-reload (Ctrl+Shift+R), or close the tab and reopen the link.

## Design

Ink on paper: solid-black vector busts, a heavy condensed logotype, monospace ledgers, and
an office drawn in the same line. Two sexes — male and female — for the player and every
operative.

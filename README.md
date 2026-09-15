# The Crew

A black-ink-on-white-paper game of global crime. You are the criminals. One file, no dependencies.

You are the name at the top of the police's chart, and the commander of the crew. Fill the
other four seats from **5,000 operatives**, then take the jobs clients post online —
country by country, each with its own language, money, politics, religion, terrain and job
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
- **Online.** Seven or so postings a week from named clients, each with a fee (scaled
  by the local economy), difficulty, heat, wanted techniques and knowledge, and the tags
  that trip a crew member's limits. Postings expire.
- **The reckoning.** Before you take a job, the file shows who can go and why not (border,
  conviction, a limit the job hits, injury), then every factor with its number: crew size,
  who commands, language, local national, knowledge (double if studied), techniques, heat.
- **The office.** Esc, or the three-line button top right, opens the boss's office — the
  pause and settings screen, drawn as line art you can click. The radio's SOUND switch and
  VOLUME knob, the DISPLAY monitor's brightness slider, the LANGUAGE paper, the CONTROLS
  book, the EXIT door, and your hat on the hook (your own file). Settings are kept separately
  from the game and survive a new game.
- **Music.** *A Name Worth Keeping* — the creator's own track, eight minutes, looped — plays
  from the radio in the office. MUSIC on the radio switches it; SOUND is the master; VOLUME
  turns both. Browsers only allow audio after the first click, so it starts on your first press.
  Shipped as `a-name-worth-keeping.mp3`, re-encoded to 128 kbps for the web.
- **Sound.** A small set of synthesised effects — clicks, the verdict stamp, a coin on a
  hire, a siren on a raid. No files; the office switch turns it off.
- **Tutorial.** On the first game, ten steps walk through the screens — the top line, your
  file, the seats, the roster, a file, the online board, who can go, the reckoning, the log, the
  office — highlighting each thing as it goes. Skip it, or run it again from the **i** button
  or the controls book.
- **The i button.** Beside the menu button on every screen (or press **i**): what this screen
  is and how each part works, in plain words — title, creation, crew, roster, online board, log, a
  job file, a personnel file, the verdict, the office, and the end.
- **Deception.** About one file in fourteen is a police informant. Vetting costs $6K and a
  dull crew misses one in three. After a big score, low-loyalty members can skim and vanish.
- **Pressure.** Heat penalises every job and triggers a raid at 100; laying low cools it.
  Botched jobs get people hurt or held. Reach 100 notoriety and the final score appears.

## Decided

- **The crew are criminals, not police** (15 September 2026). Clients online are
  the buyers; the police are the heat.
- **The player is always the commander, for now** (15 September 2026). Commander/soldier
  stays a quality on every roster file: a commander-type recruit takes your orders badly
  (−3 each on a job you lead) but can run the crew on a job you can't get into (their command
  score −2); with no one able to lead, the crew is leaderless (−10). The long game — real
  users with their own avatars choosing commander or soldier and growing over time — is
  recorded in `CONCEPT.md` as direction.
- **Pause, settings and a sound switch** (15 September 2026), as the office above.

## Provisional choices — easy to change

`CONCEPT.md` lists these as open. The build needed an answer to run, so each has the
smallest one; none is a decision.

- **Missions** resolve in one roll: crew power (weighted attributes × experience, plus the
  factors above) against difficulty, ±18. Five verdicts: Clean, Success, Messy, Botched,
  Disaster.
- **"Very basic"** is read as: four tabs, no map, no per-job assignment — the whole crew
  goes, and the game is choosing who sits in the seats and which postings to take.
- **Recruitment** is a one-off fee plus weekly upkeep and a cut of each score, with four
  seats and the option to cut anyone loose.
- **Attribute values** run 12–98 and are rolled from experience, technique and role.
- **Language** is English only; the paper on the desk is where more will go.

## Design

Ink on paper: solid-black vector busts, a heavy condensed logotype, monospace ledgers, and
an office drawn in the same line. Two sexes — male and female — for the player and every
operative.

# The Crew

A black-ink-on-white-paper game of global crime interception. One file, no dependencies.

You are the name at the top of the chart. Fill the other four seats from **5,000 operatives**,
then take the jobs clients post on the dark web — country by country, each with its own
language, money, politics, religion, terrain and job categories. Everyone on the crew goes
on every job, if the border lets them in and the job doesn't hit one of their limits.

The working foundation for the design is `CONCEPT.md`, kept verbatim.

## Play it

Open `index.html` in any browser. Progress saves itself in that browser.

To publish it, turn on GitHub Pages for this repository (Settings → Pages → deploy from
the `main` branch, root folder) and it serves at `https://<owner>.github.io/the-crew/`.

## What is in the build

- **A five-person crew, you included.** You create your own file — alias, sex (male or
  female), nationality, commander or soldier, technique — and the rest of your profile is
  rolled, re-rollable. Four seats to fill from the roster.
- **5,000 operatives**, generated from a seed so a save stores only what changed. Every file
  carries: nationality and passport tier; five attributes (Muscle, Brains, Tech, Charm,
  Nerve); a technique (16); experience rank; knowledge domains (10); education (six levels,
  from no schooling to doctorate); time in jail; time on the streets; languages; commander
  or soldier; a fee, a cut and weekly upkeep; and things they will not do — cannot swim,
  will not fly, fear of heights, claustrophobic, no violence, won't work nights, banned
  from the EU, wanted in the United States, won't work under authoritarian rule, demands 15%.
- **49 countries**, each with languages, currency, majority religion, political system,
  economy, terrain, a border rule (open, visa, strict) and **its own subset of the twelve
  job categories** — interception, recovery, extraction, escort, surveillance, infiltration,
  cyber, smuggling, papers, negotiation, sabotage, vault. Countries share categories, but no
  two offer the same list.
- **The dark web.** Seven or so postings a week from named clients, each with a fee (scaled
  by the local economy), difficulty, heat, wanted techniques and knowledge, and the tags
  that trip a crew member's limits. Postings expire.
- **The reckoning.** Before you take a job, the file shows who can go and why not (border,
  conviction, a limit the job hits, injury), then every factor with its number: crew size,
  commander, language, local national, knowledge (double if studied), techniques, heat.
- **Deception.** About one file in fourteen is an informant. Vetting costs $6K and a dull
  crew misses one in three. After a big score, low-loyalty members can skim and vanish.
- **Pressure.** Heat penalises every job and triggers a raid at 100; laying low cools it.
  Botched jobs get people hurt or held. Reach 100 reputation and the final score appears.

## Provisional choices — easy to change

`CONCEPT.md` lists these as open. The build needed an answer to run, so each has the
smallest one; none is a decision.

- **"Crime interception"** is left as the crew's trade without saying which side of the law
  it is on. Categories and copy read either way.
- **Commander / soldier** is a quality on every file, not an assignment. In the field, one
  commander adds their command score; none costs −10; each extra costs −6.
- **Missions** resolve in one roll: crew power (weighted attributes × experience, plus the
  factors above) against difficulty, ±18. Five verdicts: Clean, Success, Messy, Botched,
  Disaster.
- **"Very basic"** is read as: four tabs, no map, no per-job assignment — the whole crew
  goes, and the game is choosing who sits in the seats and which postings to take.
- **Recruitment** is a one-off fee plus weekly upkeep and a cut of each score, with four
  seats and the option to cut anyone loose.
- **Attribute values** run 12–98 and are rolled from experience, technique and role.

## Design

Ink on paper: solid-black vector busts, a heavy condensed logotype, monospace ledgers.
Two sexes — male and female — for the player and every operative.

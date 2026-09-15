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
- **Faces, built part by part.** Every portrait is a set of choices: hair or hat (six styles for
  a man, fifteen for a woman), face shape, eyebrows, eyes, nose, mouth, ears, glasses, facial
  hair or earrings, and a scar. A roster file rolls them from its seed. **You** move a slider for
  each one on the dossier screen, under your picture, which redraws as you go, with **↻ Random**
  to roll the lot. That is 3,000,000 faces for a man and 4,500,000 for a woman.
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
- **The brief.** Open a posting and it opens with what the job actually is, in four sentences:
  the work itself in the words of its category, how well the thing is held (by tier), the one
  condition that matters (on the water, at height, underground, after dark, or people who intend
  violence), what the client asked for, and the terms. Written from the posting itself, so it
  reads the same every time it is opened and after a save. The final score has its own words.
- **Who goes.** Every eligible crew member goes by default, and you can **bench** any of them
  on the job file, yourself included. A bench seat takes no cut of the score, learns nothing,
  and cannot be hurt, arrested or killed — and the crew that does go is smaller, which the
  reckoning counts. Bench yourself and a commander-type runs it in your place.
- **The reckoning.** Before you take a job, the file shows who can go and why not (border,
  conviction, a limit the job hits, injury), then every factor with its number: crew size,
  who commands, language, local national, knowledge (double if studied), techniques, heat,
  temperament, and what the crew have been through together.
  Every requirement on the file — crew size, techniques, knowledge, language, the job's
  conditions — carries a green tick or a red cross, and the chip's border says the same.
- **The live report.** Take the job and it plays out minute by minute, manager-game style:
  the crew arriving, who got in and who didn't, who does the talking, what each technique
  buys, what goes right and wrong for that kind of job, the exit, the police by morning, the
  split — then the verdict stamp. You are "you" throughout, never named in the third person. Skip to the end if you'd rather, or set the pace: five
  speeds, Slowest to Fastest, on the report itself and in the office. The field
  roster marks who came back: **GONE** in red on anyone who walked with the money, **TAKEN** on
  anyone the police held, **HURT** on the injured.
- **Standing in for a trade you haven't got.** Take a job that wants a Safecracker with no
  safecracker on the books and somebody spends the week before learning enough of it to try —
  the report says who, by name. If the job comes off, that week is worth a point of brains, and
  **What they learned** says what it bought: *stood in as a Safecracker*. If the job doesn't
  come off, they learned nothing they can use. Two gaps are two people's weeks; a crew smaller
  than the number of gaps means somebody covers two and still learns the one thing.
- **Job recaps.** Every job you have run stays on file. The Log's week is a dropdown to any
  past week, and each job reopens as its full report — the minute-by-minute, the verdict, the
  split, why the ranking moved, what they learned, who came back.
- **The twist.** On some jobs — one good fit in four, one long shot in twelve — the live
  report stops: something has gone wrong (the van won't start with sirens two streets over, the
  inside man wants double, the floor plan is last year's, a checkpoint where none was, a police
  radio in the buyer's car, a crew member hit, the alarm early, a grey car that is not lost)
  and **six options wait for your call**. Only one sets the crew free, and it is always the one
  the crew you brought can actually do — a wheelman hot-wires the second car, a forger
  re-papers the manifest, a hacker kills the alarm. A call your crew can make but not best
  costs time and money (−2 ranking); a call nobody can make costs blood, a seat, heat and −4
  ranking; walking away is always on the list and keeps everyone while losing the score. The
  options are shuffled every time. The decision cannot be clicked away, survives a reload, and
  the verdict screen — and the recap on file — shows what you chose, what would have set you
  free, and why.
- **Between jobs.** Every three to seven weeks something happens that is not a job: a death on
  holiday, a member gone without a word, one who wants out, one who has joined another crew
  and is buying yours drinks (someone may leave every week until it stops), an old face who
  walked with your money and is talking about the police, a detective asking around the bars.
  The six types rotate, so each comes round before any repeats; the least loyal member is
  usually the one it happens to. Each asks for a decision with a price and a consequence —
  money, loyalty, a seat, heat, sometimes a gamble the text is honest about — and the hard
  answers need an Enforcer on the crew.
- **Ranking, with consequences.** The crew's standing — Nobody, Small time, Known, Respected,
  Feared, The Crew — rises with clean and successful jobs (more for a bigger job, a little
  more if nobody was hurt) and **falls** with messy, botched or disastrous work, a leak, an
  arrest, a member walking with the money, or a week laid low (a name unused is a name
  forgotten). Every end-of-job screen lists the reasons. **The name decides what happens to
  you:** a Nobody sees only tier 1–2 postings at −20% pay, loses a point of crew loyalty a
  week, and no Veteran or Legend will sign; Small time pays −10%; Known opens tier 3 at full
  pay and Veterans sign; Respected opens tier 4 at +10%, Legends sign, loyalty gains a point a
  week, and the police look 5% harder; Feared pays +20% at +10% heat; The Crew pays +35% at
  +15% heat, holds loyalty at +2, and the final score appears at 100. The Log's operation
  panel says what the current name buys and what the next one costs; a file on the roster that
  won't sign yet says so under the fee.
- **A crew that grows.** Everyone who goes on a job gains experience; ranks — Rookie,
  Operator, Professional, Veteran, Legend — are earned at 40, 110, 220 and 400 xp, and good
  work adds a point to the attributes the job leaned on. You included.
- **Seats, and other crews.** Four soldiers' seats to start; a Respected name (ranking 60)
  opens two more, for six soldiers and you. From week 104 (two years in), Feared, with seven on
  your crew, you can **found a second crew**: a commander-type and four soldiers out of your
  seven, named after its commander, which takes a job of its own each week from the same board
  without you — its own reckoning (its commander's score instead of yours, no twists because
  you are not there to decide), its own live report, and its take, heat and ranking are
  yours, as is its payroll. A third crew at three years, a fourth at four, no more. People
  move between crews from their cards; dissolving a crew brings them back as far as your
  seats allow.
- **Milestones, announced.** A box in the middle of the screen, once each: the two seats a
  Respected name opens; each year mark (weeks 104, 156, 208) when another crew is within reach,
  with what is still missing; and the moment a second, third or fourth crew can actually be
  founded, with a button straight into founding it. Later closes it; the Crew tab and the case
  log keep the record.
- **The bonus buys something.** Three weeks' upkeep ($4K at least) for +14 loyalty and three
  weeks *paid up*: +2 on every reckoning that member goes on, deaf to another crew's drinks,
  never the one who skims the split, and not the one the between-jobs trouble picks on. It also
  settles any grumbling about small jobs.
- **Small money.** Every member has a price: a cut under two weeks of their own upkeep is a job
  done for you, not for them. The job file's chips say who calls a posting small money before
  you take it. Three small jobs in a row and they grumble — −5 loyalty a job, −2 on the
  reckoning, a chip on the card, and the "wants out" event picks them first; five, and they may
  walk out at the split, back onto the roster, marked QUIT on the field roster. A proper score
  or a bonus resets the count.
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
  messy job, the loudest for a disaster — and loop while the report is open. Under everything
  else — the title, the office, the crew, the boards, the log — the creator's hour of suspense
  (`music/ambient.mp3`, 62 minutes as delivered) plays on a loop. Browsers only allow audio
  after the first click, so the loop starts on the first click; the radio in the office shows
  its state and has a **Start the radio** button.
- **Sound.** A small set of synthesised effects — clicks, the verdict stamp, a coin on a
  hire, a siren on a raid. No files; the office switch turns it off.
- **Tutorial, and a reminder.** The first time anyone plays, eleven steps walk through every
  screen — the top line, your file, the seats and the money rules, other crews, the roster, a
  file, the board, who can go, the reckoning and the twist, the log and what happens between
  jobs, the office — highlighting each thing as it goes. The second sitting (a return after half
  an hour or more away) opens with a five-card reminder. After that, nothing runs on its own.
  Both wait behind the **i** button, and the office has a **tutorial clipboard** on the wall:
  the whole thing, the short reminder, or any one of the eleven cards on its own, whenever the
  player wants a recap. A decision left waiting mid-job comes before either.
- **The i button.** Beside the menu button on every screen (or press **i**): what this screen
  is and how each part works, in plain words.
- **Hover briefs.** Hover a technique — on the roster, a crew card, the crew strip, or a "wants
  X" tag on a posting or job file — for a small card saying what it is, which attribute it
  leans on, what knowledge it comes with, and which jobs want it. The same on knowledge tags
  and on MUS / BRN / TCH / CHM / NRV. Keyboard focus or a tap on a phone shows it too.
- **Temperament.** Two files in three carry a trait, and a trait is a fact about working with
  them rather than a number on a bar: **Steady** never loses faith after a bad night;
  **Hothead** is worth +3 and costs +4 heat; **Careful** takes 4 heat off any job they work;
  **Quick study** learns at double speed; a **Mentor** is +2 and teaches everyone else half
  again as fast; **Mercenary** is +2 and takes 3% more; **Lucky** adds 4 to the night's roll,
  **Jinx** takes 3 off and pulls twists towards the crew; a **Ghost** is never the one the
  police get their hands on.
- **They become a crew.** Everyone who goes on a job together builds a bond — +1 for a success
  or better, −1 for a botched or disastrous one, from −3 to +3. The reckoning counts it, up to
  ±6, as *They have worked together* or *Bad blood*, and the cards say who gets on with whom.
- **The record.** Everything the crew has done, counted: jobs, verdicts, money earned and paid
  out in cuts, the biggest score, countries worked, twists called right, who was hurt, taken or
  lost, and the current run of jobs without a scratch. Under it, eighteen **career marks** from
  the first job to the final score — each paying ranking, money or both, announced in a box
  when it lands, with the next three always shown.
- **Standing arrangements.** Money with somewhere to go. Three people on a weekly retainer: a
  **lawyer** (anyone taken is held half as long), a **doctor** (a wound is one week, not two),
  a **fixer** (two more postings a week, and one written for the crew you actually have) — paid
  out of the same payroll as the crew, so a missed week loses them. A **safe house** bought
  outright in three moves: heat falls 7, then 9, then 11 a week, and the best one keeps most of
  the float through a raid. And a **desk** that will lose a file: heat −20, priced by how hot
  you are.
- **The competition and the law.** From Small time on, a rival outfit works the same board, run
  by somebody with a name. They take the best posting left most weeks and their standing climbs
  when they do; once it passes your ranking they start buying your crew drinks. You can buy a
  name inside their operation or send your enforcer, which works about two times in three and is
  loud when it doesn't. A named **detective** opens a file once the heat has been up or your name
  has grown: it thickens with heat, thins when you lie low, pay a desk or get raided, and past 50
  the raid comes at heat 90 instead of 100, past 75 at 80. Two of the between-jobs events are
  theirs: a sit-down, and a tip-off.
- **Carrying the game.** A save lives in one browser only. The office's **file cabinet** writes
  the whole game out as one line of text you can keep anywhere, and reads one back in — on this
  browser or another. A pasted code is read and named before it loads, so nothing is replaced by
  accident.
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
- **Every thing has a cause, a consequence and a result** (15 September 2026). A ranking
  number means something a client, a recruit and a police force do differently; a job can turn
  on one decision that only the right crew can make; and between jobs the crew has a life that
  asks for decisions with a price. No number is decorative.

## Provisional choices — easy to change

`CONCEPT.md` lists these as open. The build needed an answer to run, so each has the
smallest one; none is a decision.

- **Missions** resolve in one roll: crew power (weighted attributes × experience, plus the
  factors above) against difficulty, ±18, and — when a twist strikes — the decision's cost.
  Five verdicts: Clean, Success, Messy, Botched, Disaster. The live report narrates that
  outcome; apart from the twist, it does not change it.
- **"Very basic"** is read as: four tabs, no map, no per-job assignment — the whole crew
  goes, and the game is choosing who sits in the seats and which postings to take.
- **Recruitment** is a one-off fee plus weekly upkeep and a cut of each score, with four
  seats and the option to cut anyone loose.
- **Attribute values** run 12–98 and are rolled from experience, technique and role, then
  grow a point at a time with good work.
- **Language** is English only; the paper on the desk is where more will go.

## Which build am I on?

The footer of every screen, and the office header, carry a build stamp (`build 23 · 15 September
2026`). If the stamp is older than the latest commit here, the browser is showing a cached copy —
hard-reload (Ctrl+Shift+R), or close the tab and reopen the link.

## Design

Ink on paper: solid-black vector busts, a heavy condensed logotype, monospace ledgers, and
an office drawn in the same line. Two sexes — male and female — for the player and every
operative.

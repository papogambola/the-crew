# The Crew

A black-ink-on-white-paper game of global crime. You are the criminals. One file, no dependencies.

You are the name at the top of the police's chart, and the commander of the crew. Fill the
other four places from **5,000 operatives**, then take the jobs clients post online — country
by country, each with its own language, money, politics, religion, terrain and job
categories. Everyone on the crew goes on every job, if the border lets them in and the job
doesn't hit one of their limits.

Play it here: **https://papogambola.github.io/the-crew/** — every push to `main` redeploys it.

The working foundation for the design is `CONCEPT.md`, kept as written, with a dated log of
decisions at the end.

## What is in the build

- **Where the crew's numbers are.** The **Crew** tab is the crew: a card each, with **loyalty** as a
  number and a bar, what they take of every score, weekly upkeep, the five attributes, experience,
  schooling, knowledge, languages, temperament, limits, and who they get on with. Clicking a name
  anywhere opens the same person's **file**, which carries loyalty too — with what a thin one risks
  — beside the fee, the cut and the upkeep. A file on somebody who does not work for you shows no
  loyalty, because there is none yet.
- **A five-person crew, you included.** You create your own file — alias, sex (male or
  female), nationality, trade — and the rest of your profile is rolled, re-rollable. You
  are the commander. Four places to fill from the roster.
- **The alias rolls too.** A **↻ Random** on the Alias field, the same button as the one over the
  face, and it gives a name that **goes with the passport you picked** — a Nigerian passport offers
  a Nigerian name, a Finnish one a Finnish name, for a man or a woman, out of the same pool every
  file on the roster is named from. Change the passport and it rolls from the new one. The pools
  are regional rather than national, so Japan, China, South Korea and Singapore share one.
- **5,000 operatives**, generated from a seed so a save stores only what changed. Every file
  carries: nationality and passport tier; five attributes (Muscle, Brains, Tech, Charm,
  Nerve); a trade (16); experience rank; knowledge domains (10); education (six levels,
  from no schooling to doctorate); time in jail; time on the streets; languages; commander
  or soldier by nature; a fee, a cut and weekly upkeep; and things they will not do — cannot
  swim, will not fly, fear of heights, claustrophobic, no violence, won't work nights, banned
  from the EU, wanted in the United States, won't work under authoritarian rule, demands 15%.
- **Faces, built part by part.** Every portrait is a set of choices: hair or hat (six styles for
  a man, fifteen for a woman), face shape, eyebrows, eyes, nose, mouth, ears, glasses, facial
  hair or earrings, and a scar. A roster file rolls them from its seed. **You** move a slider for
  each one on the dossier screen, under your picture, which redraws as you go, with **↻ Random**
  to roll the lot. That is 3,000,000 faces for a man and 4,500,000 for a woman. The picture
  **stays on screen** while you work down the parts — ten sliders is taller than a laptop window,
  and choosing a nose you cannot see is not choosing anything.
- **Trade, said once.** The sixteen lines of work — Safecracker, Wheelman, Face, Cleaner, Forger,
  Enforcer and the rest — are **trades**, on the dossier and everywhere else, which is the word
  the live report already used. Choosing yours on the dossier prints the trade under the
  dropdown: what it is, what it leans on, and what knowledge it comes with. It is the first time
  anybody meets these words, so the screen says what they mean instead of leaving them to a job.
- **49 countries**, each with languages, currency, majority religion, political system,
  economy, terrain, a border rule (open, visa, strict) and **its own subset of the twelve
  job categories** — interception, recovery, extraction, escort, surveillance, infiltration,
  cyber, smuggling, papers, negotiation, sabotage, vault. Countries share categories, but no
  two offer the same list.
- **Jobs.** Seven or so postings a week from named clients, each with a fee (scaled by the
  local economy), difficulty, heat, wanted trades and knowledge — coloured green if your
  crew has them, red if not — and the tags that trip a crew member's limits. Postings expire.
  Sort the board by best fit, crew needed, trade wanted, fee, heat, difficulty, country or
  expiry. Your crew sits above the board in a strip so a posting can be judged without leaving;
  keys 1–4 jump between the tabs. **Crew · Jobs · Roster · Log pins under the top bar** and stays
  there however far down a board you are, so no tab is ever a scroll away.
- **The job file says what it wants of you.** The header boxes carry **Crew needed** as a number —
  what the job demands — with how many of yours can actually go under it, green when that is enough
  and red when it is not. *Who goes* leads with the same thing in words: **this job needs N in the
  field**, how many of your crew can go, and then why anybody is not going — kept out by the border,
  the job or their own limits, or **benched, by you**, which are two different things and are
  counted separately.
- **The split, before you take the job.** The job file shows where the fee goes: a line for each
  person going with their percentage and their money, what the crew take between them, and what
  **you keep** — then the **wages** for the weeks the job holds the crew, and **what is left on
  the table**. The shares are fixed; the money they come off is not, so the three figures a clean,
  plain and messy night pay are printed above the split.
- **Bench somebody and watch it move.** Leave a member behind and their cut comes out of the split
  and stays with you — the row is struck through — and a line appears comparing the two: what you
  keep either way, what it does to the reckoning and to the odds of a clean night, and what you
  come away with on each. Two things it is careful about. **Benching saves their cut and not their
  wages** — everybody on the books draws pay for those weeks, whether they go or sit. And the
  comparison **does not tell you what to do**: it is the money from this one job, and it says so —
  it cannot count who ends up in a bed or a cell on the worse odds, weeks you go on paying for,
  what the one who sat it out did not learn, or the heat, which lands the same either way.
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
  on the job file, yourself included. A benched member takes no cut of the score, learns nothing,
  and cannot be hurt, arrested or killed — and the crew that does go is smaller, which the
  reckoning counts. Bench yourself and a commander-type runs it in your place.
- **The reckoning.** Before you take a job, the file shows who can go and why not (border,
  conviction, a limit the job hits, injury), then every factor with its number: crew size,
  who commands, language, local national, knowledge (double if studied), trades, heat,
  temperament, and what the crew have been through together.
  Every requirement on the file — crew size, trades, knowledge, language, the job's
  conditions — carries a green tick or a red cross, and the chip's border says the same.
- **The live report.** Take the job and it plays out minute by minute, manager-game style:
  the crew arriving, who got in and who didn't, who does the talking, what each trade
  buys, what goes right and wrong for that kind of job, the exit, the police by morning, the
  split — then the verdict stamp. You are "you" throughout, never named in the third person. Skip to the end if you'd rather, or set the pace: five
  speeds, Slowest to Fastest, on the report itself and in the office. The field
  roster marks who came back: **GONE** in red on anyone who walked with the money, **TAKEN** on
  anyone the police held, **HURT** on the injured.
- **And the map, running with it.** Above the text, the world map you already know from the Jobs
  board — the same projection, the same coastlines — **framed on the country the job is in**, with
  the city marked, its name in one corner and the **clock in the other**, reading the time of the
  line on screen. Around the city are the five places a job happens in — the street, the post, the
  way in, the room, the car — and every operator stands at one of them, each tied to their place by
  a hairline so there is never a doubt who is where.
- **The icons are the operators' own faces** — the same ink bust their crew card carries, clipped
  into a disc, with their name under it. **What they are doing rides as a small mark on the corner
  of the face**: a mark that **changes with the line** — a
  figure on foot arriving, an eye watching, a document at a border, a key at the way in, a dial in
  the room, a wheel at the car, a handset, a banknote, a fist, a cross when somebody goes down.
  Nothing on it is decided separately from the text: each line of the feed is written with the place
  it happens in, who it is about, and what they are doing, so **where somebody stands is what their
  trade is** — the wheelman never leaves the car, the lookout stays on the corner, the forger is at
  the way in, the safecracker is in the room. The lines after the crew have gone — the morning, the
  quiet week, the split — name no place and leave the map where it stood. **A recruitment trip gets
  the same map**, framed on the city you flew to, with four places of its own — off the plane, the
  city, the table, the answer — and two people on it: you, and whoever you went to meet.
- **A night that went wrong says why.** Botch one, or worse, and the report carries **What went
  wrong**: your crew's number against the room's — and whether the gap was there before anybody
  rolled anything — then every factor that was against you, each with **the thing that would have
  answered it**. Somebody who speaks the language. Somebody who knows the domain. A Safecracker,
  because the one who stood in learned a little and that is not the same thing. A quieter week
  before a room like this. Splitting up two who have lost together. Nothing is a new judgement:
  it is the reckoning the job file showed you **before** you took it, kept as it stood and read
  back in the order of what it cost. A night that came off does not explain itself.
- **Standing in for a trade you haven't got.** Take a job that wants a Safecracker with no
  safecracker on the books and somebody spends the week before learning enough of it to try —
  the report says who, by name. If the job comes off, that week is worth a point of brains, and
  **What they learned** says what it bought: *stood in as a Safecracker*. If the job doesn't
  come off, they learned nothing they can use. Two gaps are two people's weeks; a crew smaller
  than the number of gaps means somebody covers two and still learns the one thing.
- **Recruitment is a trip.** Nobody joins a crew because a fee was paid. **Go and ask** and you
  fly to wherever they live and put it to them in person: a week off the calendar, a live feed
  like a job — the border, the city, the bar with two doors, how they read you — and their
  answer at the end of it.
- **Nothing is paid until the week is over.** The balance does not move when you set off, or
  part-way through, or when the map shows you sitting down with them: it moves **once, at the end,
  when the answer is in** — and the fee is only in it if they signed. Turn back, or get turned
  down, and the fee stays with you. What a refused week still costs is what the week itself cost:
  the room, the plane, and an envelope that changed hands in a back room, which is gone whether
  anybody signs or not. The wages for the week come out at the same time, as they do for a job.
- **Most of them are difficult, and the cheap ones are the worst.** Every trip ends with how
  hard that file was, as a percentage. It rises with greed, years inside, a temperament, a hard
  border, and **low numbers in the things that matter** — desperate people make a mess of a
  meeting. A **Legend** is difficult for the opposite reason: they test you.
- **When a meeting goes wrong it is not a money problem.** They don't show; the number moves;
  they bring somebody who is not introduced; a car sits outside for forty minutes; they want to
  know what happened to the last person in the job; three men and a shut door; they have been
  drinking since lunch; two officers in the hotel lobby at seven. What answers it is what you
  brought — an **enforcer** in the room, a **face** to do the talking, a **forger** for papers,
  a **fixer** to find out who moved them, the local **language**, your own **Charm** or
  **Nerve**, or a **record** long enough to answer with. Walking out is always on the list, and
  somebody who turns you down will not take another meeting for a couple of months.
- **Somebody who leaves is carrying you around with them.** Walk out over the money, take a cut
  of the score and vanish, go to a rival, resign, or get cut loose — and the game asks what you
  are going to do about it, with **the odds written on every answer**. The box says how many
  jobs they worked with you and the percentage they eventually talk; a talker is a slow leak,
  putting something else in the detective's file every few weeks for as long as they are alive.
  Let them go and that percentage stands. Buy the silence, and it will be asked for again. A
  word from your **enforcer** costs heat and some of the crew's good opinion. Your **fixer** can
  put them four borders away — the cleanest thing on the list that leaves them breathing.
- **And the other kind of answer.** A **cleaner** makes it an accident: the most expensive and
  the quietest, 86% clean. A stranger you never meet is cheaper and 62%. Your enforcer tonight
  is cheapest, loudest and 50%, and when it goes wrong it is your enforcer the police take.
  Each option says what happens when it does not go cleanly. It works — a body does not talk,
  and the board notices what happens to people who leave your crew: **ranking +2** when it is
  clean. It also costs heat, the detective's file, and **loyalty across everybody still with
  you**, because they can all count. Nobody is safe working for somebody who does that.
- **The Dashboard.** What was the Log is a **Dashboard**: six sections — the operation, the
  competition and the law, standing arrangements, the record, job recaps, the case log — each one
  a header you click open. **They all start shut**, and a shut section still says its own numbers
  on its header: places filled and who is hurt, the rival's standing against yours and how thick
  the detective's file is, what you pay every week and whether you have a safe house, jobs run and
  marks earned. So the whole screen is an index of itself on one screen, and nothing is four panels
  down a scroll. Whatever you open stays open — it is kept in settings, so it survives a new game.
  The game still opens on **Crew**.
- **Job recaps.** Every job you have run stays on file. The Dashboard's week is a dropdown to any
  past week, and each job reopens as its full report — the minute-by-minute, the verdict, the
  split, why the ranking moved, what they learned, who came back.
- **The twist.** On some jobs — one good fit in four, one long shot in twelve — the live
  report stops: something has gone wrong (the van won't start with sirens two streets over, the
  inside man wants double, the floor plan is last year's, a checkpoint where none was, a police
  radio in the buyer's car, a crew member hit, the alarm early, a grey car that is not lost)
  and **six options wait for your call**. Only one sets the crew free, and it is always the one
  the crew you brought can actually do — a wheelman hot-wires the second car, a forger
  re-papers the manifest, a hacker kills the alarm. A call your crew can make but not best
  costs time and money (−2 ranking); a call nobody can make costs blood, a place, heat and −4
  ranking; walking away is always on the list and keeps everyone while losing the score. The
  options are shuffled every time. The decision cannot be clicked away, survives a reload, and
  the verdict screen — and the recap on file — shows what you chose, what would have set you
  free, and why.
- **Clients remember a job that went wrong.** Botch one badly enough and the client may take it
  personally — about a third of botched jobs and two in three disasters, more on a big fee. There
  are two ways to take it personally, and the first is the common one: **the word goes round.**
  That client stops posting to you for twenty or thirty weeks, has a quiet word with one or two
  of the people they drink with, and the postings they already had come off the board. The Jobs
  board says who will not deal with you and until when, so a thinner board is never a mystery.
- **The other way is that they come and find you.** A few weeks later, one of four things: three
  cars outside the safe house at four in the morning; the count short because somebody walked
  into the flat in daylight; a detective outside the wrong café two days running; or somebody
  buying drinks for your least loyal member. **Every answer carries the odds it goes your way**,
  and what you have decides which are open — an **enforcer** to meet them at the door or collect
  what was taken, a **fixer** to find out who carried it or what was said and to whom, a **safe
  house** to walk away from, or the cash to pay back what they lost. Paying them back at the door
  is the only answer that is certain, and the only one that also lifts the ban; paying a police
  desk settles a file, and paying your own man settles your own man. The board warns you it is
  coming: *and one of them is not finished with you*.
- **Between jobs.** Every three to seven weeks something happens that is not a job: a death on
  holiday, a member gone without a word, one who wants out, one who has joined another crew
  and is buying yours drinks (someone may leave every week until it stops), an old face who
  walked with your money and is talking about the police, a detective asking around the bars.
  The six types rotate, so each comes round before any repeats; the least loyal member is
  usually the one it happens to. Each asks for a decision with a price and a consequence —
  money, loyalty, a place, heat, sometimes a gamble the text is honest about — and the hard
  answers need an Enforcer on the crew.
- **You are told who you are deciding about.** Wherever the question names somebody, **their file
  opens under it** — face, trade, experience, the five attributes, schooling, jail and street
  years, knowledge, languages, temperament and limits, and then the four that decide this one:
  loyalty, what they take of every score and cost a week, how many jobs they have run with you,
  and how much of your business they know. *Let them go* is a different decision about a Veteran
  safecracker who knows where everything is than about a rookie who has been on two jobs. The
  three questions that name nobody — a sit-down, a tip-off, a detective — show nobody.
- **And one who wants out can be let go, and settled afterwards.** Beside paying them to stay and
  letting them walk, there is *let them go — and settle it in forty-eight hours*. The two days are
  the point: the crew watched you shake his hand, so nobody joins the two up. **Roughly two times
  in three** it is quiet, and there is no loose end left at all — which is what the delay buys,
  since letting somebody walk normally leaves a person who can talk. The other third is done badly
  and in front of a witness: **+30 heat** and a name and a date in the detective's file. It takes
  an **Enforcer or a Cleaner** on the crew; without either it is closed and says so.
- **Ranking, with consequences.** The crew's standing — Nobody, Small time, Known, Respected,
  Feared, The Crew — rises with clean and successful jobs (more for a bigger job, a little
  more if nobody was hurt) and **falls** with messy, botched or disastrous work, a leak, an
  arrest, a member walking with the money, or a week laid low (a name unused is a name
  forgotten). Every end-of-job screen lists the reasons. **The name decides what happens to
  you:** a Nobody sees only tier 1–2 postings at −20% pay, loses a point of crew loyalty a
  week, and no Veteran or Legend will sign; Small time pays −10%; Known opens tier 3 at full
  pay and Veterans sign; Respected opens tier 4 at +10%, Legends sign, loyalty gains a point a
  week; then Feared, Notorious, Untouchable and The Crew, which pays +50% and carries +22%
  heat. Eight names across six hundred points, and **the last two rungs are most of the
  game**. A job well beneath your name barely moves it — a Feared crew doing corner work is
  not getting more feared — so the way up is up the tiers. The Log's operation panel says what
  the current name buys, what the next one costs, and what the last score is still waiting for.
- **The world answers the name.** The bigger you get, the better defended the rooms you are
  given: difficulty carries a pressure term that rises with your ranking, and it has no
  ceiling. A country you have worked lately is watching for you — local heat, which makes
  every room there harder and cools a point a week, so the map is something to rotate around
  rather than a backdrop.
- **A job is weeks, not a week.** A tier-1 errand is gone by Friday; a tier-2 takes a week, a
  tier-3 two, a tier-4 three, and the last score four. The crew is gone for that whole time,
  which is what makes a second crew earning without you worth founding.
- **Casing.** Before you take a posting you can watch it: a week and a fee for **+9** on the
  reckoning, up to four weeks on the biggest rooms. It is the difference between a coin flip
  and a plan — and it is a week the posting might not survive, in which case the week and the
  money are spent and the client has stopped waiting.
- **A crew that grows slowly.** Everyone who goes on a job gains experience; ranks — Rookie,
  Operator, Professional, Veteran, Legend — are earned at 60, 180, 430 and 900 xp. Good work
  adds a point to the attributes the job leaned on, but **getting better gets harder**: a 40
  climbs quickly, an 85 barely moves. A crew of Legends is a career's work, not ten jobs'.
- **Places, and other crews.** Four soldiers' places to start; a Respected name (ranking 65)
  opens two more, for six soldiers and you. From week 104 (two years in), Feared, with seven on
  your crew, you can **found a second crew**: a commander-type and four soldiers out of your
  seven, named after its commander, which takes a job of its own each week from the same board
  without you — its own reckoning (its commander's score instead of yours, no twists because
  you are not there to decide), its own live report, and its take, heat and ranking are
  yours, as is its payroll. A third crew at three years, a fourth at four, no more. People
  move between crews from their cards; dissolving a crew brings them back as far as your
  places allow.
- **Milestones, announced.** A box in the middle of the screen, once each: the two places a
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
  screen — the top line, your file, the places and the money rules, other crews, the roster, a
  file, the board, who can go, the reckoning and the twist, the log and what happens between
  jobs, the office — highlighting each thing as it goes. The second sitting (a return after half
  an hour or more away) opens with a five-card reminder. After that, nothing runs on its own.
  Both wait behind the **i** button, and the office has a **tutorial clipboard** on the wall:
  the whole thing, the short reminder, or any one of the eleven cards on its own, whenever the
  player wants a recap. A decision left waiting mid-job comes before either.
- **The i button.** Beside the menu button on every screen (or press **i**): what this screen
  is and how each part works, in plain words.
- **Hover briefs.** Hover a trade — on the roster, a crew card, the crew strip, or a "wants
  X" tag on a posting or job file — for a small card saying what it is, which attribute it
  leans on, what knowledge it comes with, and which jobs want it. The same on knowledge tags
  and on MUS / BRN / TCH / CHM / NRV. Keyboard focus shows it too.
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
- **And you can ask why.** Hover *Bad blood* on the reckoning — or any line on a card or a file
  saying who somebody will not work with — and it tells you **which nights did it**: the week, the
  verdict, the job and the country, and which way each one moved them. Bad blood comes from jobs,
  and a job is shared by everyone on it, so four people off one bad night are six pairs with the
  same history; pairs whose background is identical are named together and said **once** —
  *You, Aiko, Karim and Shai — bad blood all round (−2 each, 6 pairs)* — so every pair the
  reckoning counts is accounted for without repeating a word of it. A file saved before any of
  this was recorded says the nights are not known rather than inventing any.
- **The record.** Everything the crew has done, counted: jobs, verdicts, money earned and paid
  out in cuts, the biggest score, countries worked, twists called right, who was hurt, taken or
  lost, and the current run of jobs without a scratch. Under it, eighteen **career marks** from
  the first job to the final score — each paying ranking, money or both, announced in a box
  when it lands, with the next three always shown.
- **The last score is three operations.** Not one roll. Read the names in the ledger, open the
  floor below the floor, then move all of it out — each its own job, in order, each able to go
  wrong. A stage that goes wrong does not end you: the Committee moves things and the door is
  worth trying again in five to nine weeks. It appears only when the crew is ready for it, and
  the Log lists the conditions, ticked off as they arrive: **a name at the top of the board**
  (ranking 420), **a career behind you** (55 jobs), **five in the field**, and **a war chest**
  ($5M) — because nobody funds this one but you.
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
  factors above) against difficulty, ±26, and — when a twist strikes — the decision's cost.
  Five verdicts: Clean, Success, Messy, Botched, Disaster. The live report narrates that
  outcome; apart from the twist, it does not change it.
- **"Very basic"** is read as: four tabs, no map, no per-job assignment — the whole crew
  goes, and the game is choosing who fills the places and which postings to take.
- **Recruitment** is a trip, a one-off fee plus weekly upkeep and a cut of each score, with four
  places and the option to cut anyone loose.
- **Attribute values** run 12–98 and are rolled from experience, trade and role, then
  grow a point at a time with good work.
- **Language** is English only; the paper on the desk is where more will go.

## How long is a game, and how is that known?

Every number that decides the difficulty and the length lives in one object, `BAL`, at the top
of the script — difficulty, the verdict bands, the roll, weeks per tier, casing, the ranking
damping, the pay ladder, the cut sizes, the gate on the last score. The whole curve can be read
in one screen, and changing the game means changing numbers there rather than hunting through
three thousand lines.

`tools/sim.js` plays the game headlessly, many times, with no screen, and reports what came out:

```
node tools/sim.js 25            # 25 runs of a player who plays well
node tools/sim.js 25 "" median  # a player who calls twists right less than half the time
```

Measured over 24 runs of the current build, against the same tool run on the old one:

| | before | now |
|---|---|---|
| weeks to finish (median) | 18 | **338** |
| jobs run (median) | 10 | **90** |
| verdicts that came back CLEAN | ~90% | **30%** |
| botched or disastrous | ~2% | **9%** |
| people lost, hurt or arrested (median) | ~0 | **30** |
| runs that ended in losing | rare | **37%** |

A caveat worth being plain about: 338 in-game weeks is roughly six to twelve hours of real
play, not the months the brief asked for. Weeks are not hours. What is here is the depth —
more to decide per week, a crew that takes a career to build, a world that answers the name —
and that is the part a real-time or online layer would then stretch across months, rather than
something to fake now by making the numbers bigger.

## What it runs on

**A PC. A desktop or laptop browser, and nothing else.** The game is a board you read across — a
jobs list beside a world map, a crew strip above it, a job running minute by minute — and that is
a wide-screen shape. There is no phone version, none is planned, and a phone cannot reach the game
at all: it gets a door instead, a single page saying to open it on a computer.

**The board has one layout.** It does not rearrange itself for a small window. Below 960px the
window scrolls sideways and the board keeps its shape, which is what a PC game does; there are no
small-screen breakpoints left in the stylesheet and nothing is built for touch.

**The door is deliberately reluctant.** A wrong "no" locks a real player out of the game, while a
phone that slips past merely sees a page it cannot play — so it turns away only devices it is sure
of: phones and tablets by user agent, and an iPad by the touch points no Mac has, since iPadOS
claims to be a Mac. A Windows or ChromeOS laptop **with a touch screen is a PC** and plays
normally. Nine device profiles are driven in a real browser on every change, and five of them are
computers that must not be stopped.

## Which build am I on?

The footer of every screen, and the office header, carry a build stamp (`build 41 · 16 September
2026`). If the stamp is older than the latest commit here, the browser is showing a cached copy —
hard-reload (Ctrl+Shift+R), or close the tab and reopen the link.

## Design

Ink on paper: solid-black vector busts, a heavy condensed logotype, monospace ledgers, and
an office drawn in the same line. Two sexes — male and female — for the player and every
operative.

# The Crew

A black-ink-on-white-paper game of global crime. We are the criminals. One file, no dependencies.

A crew of five, and thousands of jobs. You are the name at the top of the police's chart and
the commander of the crew; you fill the other four places, then take the jobs clients post
online — country by country, each with its own language, money, politics, religion, terrain
and job categories. Everyone on the crew goes on every job, if the border lets them in and the job
doesn't hit one of their limits.

Play it here: **https://papogambola.github.io/the-crew/** — every push to `main` redeploys it.

Or on Windows, as a program: **https://papogambola.github.io/the-crew/desktop/The-Crew-Windows.zip**
— unzip, keep the two files together, double-click `The Crew.exe`. It is a shell: the window fetches
the game from the address above, so it plays whatever is on `main` and never needs a new download
(`desktop/README.md` says how it is built).

The rules, in full: **https://papogambola.github.io/the-crew/handbook.html** — a player's handbook
of nineteen chapters with a pinned search bar and a clickable index, and the same thing as a
[PDF](The-Crew-Handbook.pdf). It is reached from inside the game too: the office's bookshelf, the
Handbook button under it, the controls book, and the footer of every screen.

The working foundation for the design is `CONCEPT.md`, kept as written, with a dated log of
decisions at the end.

## What is in the build

- **A title screen.** The logotype across the width of the column — it is measured, not guessed, and
  if the font never loads the title is measured again on screen and brought down so it cannot run off
  the page. Under it **five faces** — five files drawn out
  of the same face builder every operative on the roster uses, and a different five every time the
  door opens. Then the dossier card, a way into the player's handbook, and at the foot the
  publisher's mark: **Shhh Games**, traced to paths so it is ink like everything else here, and the
  year.

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
- **6,000 operatives**, generated from a seed so a save stores only what changed. Every file
  carries: nationality and passport tier; five attributes (Muscle, Brains, Tech, Charm,
  Nerve); a trade (30 — 16 ordinary, and 14 specialists that 1,000 of the files work);
  experience rank; knowledge domains (10); education (six levels,
  from no schooling to doctorate); time in jail; time on the streets; languages; commander
  or soldier by nature; a fee, a cut and weekly upkeep; and things they will not do — cannot
  swim, will not fly, fear of heights, claustrophobic, no violence, won't work nights, banned
  from the EU, wanted in the United States, won't work under authoritarian rule, demands 15%.
- **The icon in the tab is one of the crew.** Not a picture pasted in: `tools/favicon.js` loads the
  game's own `avatarBody()` and draws a specific face — spiked hair, heavy brows, a long nose, a
  mouth that is not pleased — so the tab is the same ink as every dossier on the roster. Run
  `node tools/favicon.js` after changing the face builder, and `--check` fails if what is in
  `index.html` is no longer what the code would draw. The framing is cropped to the head and
  shoulders because a whole bust at 16px is a smudge.
- **Faces, built part by part.** Every portrait is a set of choices: hair or hat (six styles for
  a man, fifteen for a woman), face shape, eyebrows, eyes, nose, mouth, ears, glasses, facial
  hair or earrings, and a scar. A roster file rolls them from its seed. **You** move a slider for
  each one on the dossier screen, under your picture, which redraws as you go, with **↻ Random**
  to roll the lot. That is 3,000,000 faces for a man and 4,500,000 for a woman. The picture
  **stays on screen** while you work down the parts — ten sliders is taller than a laptop window,
  and choosing a nose you cannot see is not choosing anything.
- **Trade, said once.** The sixteen ordinary lines of work — Safecracker, Wheelman, Face, Cleaner,
  Forger, Enforcer and the rest — are **trades**, on the dossier and everywhere else, which is the word
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
- **A trade can be changed, and it is a conversation.** A trade is what somebody *is* here — the
  first line of their card and the thing a client asks for by name — so **Teach a trade** on the
  card opens a conversation rather than a purchase. Anybody Professional or better can be asked.
  It costs money (from $30K, more for rank, about double for a specialist), three to seven weeks
  out of the field, and **two ranks**: they come back lower at the new trade and are no longer the
  old one. The screen prints the chance they agree *before* you ask and what it is made of —
  **where you stand with them** (loyalty plus the nights you have actually been through together,
  which is not the same number as loyalty), what they are giving up, whether they are built for
  the new work, and their temperament. A Legend gives up more than a Professional and answers
  accordingly.
- **And they can say no.** Four directions then, each with its own odds on it. **Leave it** — free,
  loyalty +3 for having asked and listened. **Put money on it** — three offers, each printing the
  new chance, and *the money goes whether they take it or not*, which is what makes it an offer;
  it moves the number at any standing but never buys the last stretch. **Tell them it is not a
  question** — they go and resent it (−22 loyalty), refuse in front of everybody, or walk out that
  night, all three printed, and an Enforcer on the books shifts which. **Cut them loose** — they
  go, the crew takes it badly in proportion to how much they liked them, and they leave knowing
  what they know.
- **A language is the other school, and nobody refuses it.** A posting in a country nobody on the
  crew speaks is **−8** on the night and **−14** if the job is all talk; one of your people
  speaking it is **+6** instead, so **Teach a language** opens with the languages a posting wants
  *this week* that nobody can speak. Nothing is given up, so there is nothing to argue about — it
  is a price list, and the price is weeks. $3K a week, **3 weeks** for a language out of a family
  they are already inside and **6** for one out of a family they are not, less a week each for
  Brains 70+, Quick study, and being a Linguist, floor of 2. They cannot go on a job while they
  are at it, and they come back with the language for good and +4 loyalty. `LANG_FAMILY` holds the
  nine families — Romance, Germanic, Slavic, Indo-Aryan, Sino-Tibetan, Turkic, Austronesian,
  Semitic (Arabic/Hebrew) and Bantu (Swahili/Zulu); Greek, Finnish, Japanese, Korean, Thai and
  Vietnamese stand alone in this game and are always the long way round.
- **Two of the same trade argue, the same day.** Put two Safecrackers on one crew and the question
  of who is *the* Safecracker is asked at once, as a scene — **ten** of them: two plans for one
  door, kit bought on the float, one posting that wants the trade, the newer one on a bigger
  percentage, one treating the other as an apprentice, a client who asked for one by name, two
  schools of the same craft, a sentence one served for the other's night, a safe house with one
  room, a favour called in at the table. **Fifty answers** between them, every one stating what it
  needs, what it costs and the odds: pick a side, split it, pay one off, bench one, send one to
  the second crew, put a Fixer or an Enforcer on it, or ask one of them to learn a different trade
  — the only answer that removes the reason for the argument. An answer either settles it or does
  not, and the screen says which; what is not settled comes back weeks later as a different scene
  between the same two people.
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
  reckoning counts. Bench yourself and a commander-type runs it in your place. Every row on that
  list carries a **File** button — the ones who cannot go included, which is where you most want
  to read why — opening the whole personnel file over the job. `UI.scrollBack` remembers where you
  were standing so closing it puts you back on the same row rather than at the top of the page.
- **The reckoning.** Before you take a job, the file shows who can go and why not (border,
  conviction, a limit the job hits, injury), then every factor with its number: crew size,
  who commands, language, local national, knowledge (double if studied), trades, heat,
  temperament, and what the crew have been through together.
  Every requirement on the file — crew size, trades, knowledge, language, the job's
  conditions — carries a green tick or a red cross, and the chip's border says the same.
- **The live report.** Take the job and it plays out minute by minute, manager-game style:
  the crew arriving, who got in and who didn't, who does the talking, what each trade
  buys, what goes right and wrong for that kind of job, the exit, the police by morning, the
  split — then the verdict stamp. You are "you" throughout, never named in the third person. Skip to the end if you'd rather, hold it where it is with **Pause** (the music holds with it, and picks up where it stopped), or set the pace: five
  speeds, Slowest to Fastest, on the report itself and in the office. Opening the office holds the
  feed too, so "Paused" on its door is true. The field
  roster marks who came back: **GONE** in red on anyone who walked with the money, **TAKEN** on
  anyone the police held, **HURT** on the injured.
- **The police arrive, and the room knows it.** When the feed reaches the line where the police
  show up — sirens two streets over, a patrol car at the door, the squad that was waiting because
  somebody talked, the two officers in the hotel lobby on a recruitment trip — the screen darkens,
  red and blue beams sweep across it and a siren plays for eight seconds (`music/siren.mp3`),
  with the music ducked under it. Only a line revealed live sets it off; skipping to the end does
  not.
- **And the plan, running beside it.** The feed reads down the left of the screen; on the right,
  pinned while the feed scrolls, is a **plan of the place** — not the world, the place: the streets
  and the building with its strongroom on a vault job, the quay, the stacks and the ship alongside
  on a port job, the road, the ridge and the stop on an interception, the switchbacks and the
  barrier on a pass, the fence, the sheds and the tanks on a sabotage, the strip and the hangar on an
  air lift. It is drawn from the posting itself — its kind, its tags, the country's terrain (a
  coast, a river, hills, a railway) — off a seed taken from the posting, so a job always draws the
  same plan and no two jobs draw one alike. The country's flag and the city sit in one corner and
  the **clock in the other**, reading the time of the line on screen. The five places a job happens
  in — the street, the post, the way in, the room, the car, named for what they are on that plan —
  sit where the plan puts them, and every operator stands at one of them, each tied to their place
  by a hairline so there is never a doubt who is where. A recruitment trip draws the city you flew
  into the same way.
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
  down a scroll. **One opens at a time** — opening a section shuts whatever was open, so the screen
  never grows back into the scroll it was built to stop being. Whatever you left open stays open,
  kept in settings, so it survives a new game. The game still opens on **Crew**.
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
- **A job paying over $150K goes wrong at least twice.** `BIG_MONEY` — two of them, sometimes
  three (`BIG_THIRD`), never the same one twice, and the screen counts them (*1 of 3*) from the
  first so the number is known before you spend anybody. That count is the decision: they will
  not want the same person twice, so a big payday asks whether the crew is *broad* rather than
  whether it is good. Every call counts towards the verdict and each is on the ranking by name;
  what each costs of the take compounds rather than adding, so two calls that each lose half of
  it leave a quarter. Between them the night carries on — the outcome of your call, a beat, then
  the next thing — and a game closed between two of them comes back at the one it stopped at.
  The job file carries the warning before you take it. Under the line nothing changed.
- **Clients remember a job that went wrong.** Botch one badly enough and the client may take it
  personally — about a third of botched jobs and two in three disasters, more on a big fee. There
  are two ways to take it personally, and the first is the common one: **the word goes round.**
  That client stops posting to you for twenty or thirty weeks, has a quiet word with one or two
  of the people they drink with, and the postings they already had come off the board. The Jobs
  board says who will not deal with you **and why**: against each name, the job it was about, the
  city, the week and which way the night went — or, for a client you have never worked for, which
  of the others had a word with them. Click the notice and the whole account opens: what they
  paid, what they lost, how many weeks are left, and whether this is one of the ones that is not
  finished with you. A thinner board is never a mystery, and neither is what caused it.
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
- **The week's paper.** Every week opens with the news: three to five headlines from around
  the world, drawn off the save and the week so a reload prints the same page. Most of it is
  colour. In some weeks one or two headlines reach the board, marked **On the board** under the
  story — a dock strike shuts a port and puts a quarter on the fee for smuggling there, a summit
  makes every job in that country harder and hotter, a bank holiday makes the vaults easier, a
  controllers' strike grounds everything by air for the week, a currency crash cuts every fee in
  the country by a fifth. A posting the paper touches carries **In the news** on the board and
  says what changed on its file; one the paper shut cannot be run until next week. Next week's
  paper undoes this week's. The button in the top bar opens the paper again, and the news track
  plays under it.
- **Between jobs.** Every three to seven weeks something happens that is not a job: a death on
  holiday, a member gone without a word, one who wants out, one who has joined another crew
  and is buying yours drinks (someone may leave every week until it stops), an old face back to
  blackmail you, a detective asking around the bars.
- **An old face is always one of yours, and the screen opens with how they actually left** —
  walked out over the money, asked to be let out, cut loose, poached, or away with a cut of a
  score. `looseAdd()` stamps `goneAs` on the file the week it happens and `goneStory()` reads it
  back, because the blackmail used to open "who walked with your money" about everybody,
  including people you had buried. A quarter of the deaths on that coast (`FAKED_DEATH`) were
  arranged by the person who died, and the blackmail is where you find out: they stay on the
  board as `gone`, the other three quarters get `status:"dead"` and never come back.
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
- **The 500 operations.** The same Respected name that opens the last two places opens the work
  those places are for, and the game announces them together, in that order. **500 ultra-complex
  operations**, coded `OP-001` to `OP-500`, wanting **six or seven in the field**, three to five
  trades and two to three kinds of knowledge — more than one person can carry, which is the point
  of the extra places. Tier 5: a $2.4M base fee against tier 4's $950K, three to five weeks on the
  ground, five weeks you may case it, and difficulty 122 before the country and your own name are
  added. Eight kinds of their own — deep water, air lift, high rise, under the city, blackout, the
  long con, lab work, the whole ledger — and the country follows the kind, so a dive job is on a
  coast. **No client posts them and the rival never takes one**: every other posting is a race,
  these wait. One or two sit on the board at a time beside the ordinary work, and **each exists
  once** — the file counts down *Operation N of 500* and the record in the Log keeps the total.
- **Fourteen specialists.** Drone specialist, Pilot, Skipper, Diver, Climber, Tunneller, Chemist,
  Medic, Electrician, Signals, Analyst, Quartermaster, Linguist and Handler — **1,000 more
  operatives** on the roster who work them, bringing the files to 6,000. They are hireable from
  week one and there is no reason to be: nothing on the open board asks for their trade, so they
  are worth their attributes and nothing more, and cost $9K over the odds. Once the seventh place
  opens they are most of what an operation asks for by name. The roster's trade filter lists all
  thirty. A save made before they existed is unaffected — the roster is rebuilt from its seed, and
  the first 5,000 files come out exactly as they did.
- **Milestones, announced.** A box in the middle of the screen, once each: the two places a
  Respected name opens; the operations those places open; each year mark (weeks 104, 156, 208) when another crew is within reach,
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
  re-encoded to 128 kbps for the web (`music/`), plus two more delivered on their own. Eleven
  tracks rotate under the live job report, one per job; three score the verdict — the quietest
  for a success, a middle one for a messy job, the loudest for a disaster — and loop while the
  report is open. A recruitment trip — go and ask — runs under the **trip pool** from the flight
  out until the answer, and the week's paper runs under the **news pool** while
  it is up: each pool is drawn at random, a fresh tune each time one ends, never the one just
  played, and hands back to the hour of suspense when the screen closes. Each pool holds one tune
  today (`tension.mp3`, `news.mp3`, which loop); `tools/split_tunes.py` cuts a compilation on the
  silences between its tunes, measures them, and rewrites the pool. Under everything
  else — the title, the office, the crew, the boards, the log — the creator's hour of suspense
  (`music/ambient.mp3`, 62 minutes as delivered) plays on a loop. Browsers only allow audio
  after the first click, so the loop starts on the first click; the radio in the office shows
  its state and has a **Start the radio** button.
- **Sound.** A small set of synthesised effects — clicks, the verdict stamp, a coin on a
  hire. No files; the office switch turns it off. A raid is announced on the screen — who was taken
  and until when, what the float lost — with the same lights and siren as the police arriving in a
  feed.
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
- **The first week — the clock stands still.** Going to fetch somebody is a week on the ground —
  but not in week one. While you are still putting the crew together you can go and ask as many
  people as the float carries, one after another, and the clock does not move. Nothing about it is
  free: every fee is still paid, and week one costs you money rather than time. From week two every
  trip costs its week, which is what makes an empty place expensive rather than untidy.
- **And from a Known name, people come to you.** Somebody turns up asking to join, more often the
  further up the ladder you go — the roster prints the rate, and nobody comes to a Nobody. It is the
  transaction the other way round, which is the whole point of it: no trip and no week, because they
  are already here; a figure that already sits under what fetching them would have cost, with both
  printed side by side; **Too much** free to say and good most of the time, twice, after which they
  are entitled to hold and do; and **no** costing nothing at all — no week, no money, no place.
  Somebody who asked to be here starts a few points of loyalty ahead of somebody who had to be
  persuaded. They only turn up when there is a place free.
- **Two ways out of a long screen.** A job file is taller than a laptop window, so the **← Back to
  job postings** button is pinned under the tabs and stays there however far down the file you are
  — the way out used to scroll off the top with everything else. And on any screen longer than the
  window an **↑** appears at the bottom right and takes you back to the top. It is not there until
  there is something above you, and it gets out of the way the moment a question is put on screen.
- **Quick Money - High Risk.** A box under the postings for the situation everybody ends up in: you are
  a few thousand short of the person you need. Two or three small pieces a week — a till at
  closing, a car with the engine running, the lead off a church roof — each done this afternoon by
  **one** person off your books, no client, no casing, no crew, no plan and no week spent, for a
  few hundred to a few thousand dollars, printed to the dollar because at this size the difference
  between $1,050 and $1,450 is the point. A trade counts for nothing out here; what counts is the
  attributes the work actually leans on, weighted, plus experience, temperament and what they will
  not do, and every name on the list carries its own percentage before you choose. The margin does
  two things: it sets the chance they come back with the money, and it sets how bad the wrong
  ending is — a poor choice is not merely likelier to fail, it is likelier to cost you the person,
  hurt for a fortnight or held for up to five weeks. Heat lands either way, on you and on the
  country it happened in. **One a week, however big the crew**: a flawless year of it is worth
  about a fifth of three tier-3 jobs, which is the whole point — it is the gap, not an income.
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

## The player's handbook

`handbook.html`, beside the game, and `The-Crew-Handbook.pdf` — 60 pages, printed from the same
leaves the book turns on screen. Twenty chapters: what the game is and how it is won and lost, where every screen is, the five
attributes, the sixteen trades and the fourteen specialists, experience, knowledge, schooling,
temperament, limits, passports and borders, what people cost, loyalty, hiring and the recruitment
trip, places and benching and a second crew, the board, tiers, the twelve kinds of job, the 500
seven-place operations, countries and casing and difficulty, the
whole reckoning formula and every factor in it, the night itself, money and the split, heat and
the detective and the raid, the competition, the week that passes on its own, ranking, the record,
the last score, the controls, twenty things worth knowing, and a glossary.

**It is a book.** It opens as a closed one on a desk — a worn cream cover with the logotype, five
of the game's own faces in a row, and `PLAYER'S HANDBOOK` between two rules. Click it and the
cover swings open on its spine; inside is a two-page spread, and clicking a page turns it, with
the leaf swinging across in perspective carrying the page you were on its front and the page you
are going to on its back. Arrow keys, PageUp/PageDown, space, Home and End work too.

- **The page is the unit of truth.** The content is emitted once and paginated in the browser into
  fixed 560×752 leaves — tables split with the head repeated, headings are never left alone at the
  foot of a page, and each chapter starts on a fresh one. The page size does not change with the
  window; the whole book is scaled to fit instead, because a page that resized would mean "page 16"
  was a different thing on every screen.
- **An index with real page numbers.** Every chapter and section, with the page you will turn to,
  and every line clickable. The numbers are not estimated and no longer converged towards: the book
  knows what page everything is on, and the PDF prints one leaf per sheet, so PDF page N is book
  page N by construction. `hb-pages.py` still reads the rendered PDF back, and `hb-drive.js` fails
  if one heading came out on a different sheet than the index promised.
- **A pinned search bar.** It searches every line, table row and glossary entry, marks every hit,
  and turns the book to the one you are on, stepping through with ‹ › or Enter. `/` focuses it,
  Escape clears it. A mark carries no padding, so marking hits cannot reflow a line and move a
  page out from under the number the index just promised.
- **Zoom, from the page you are reading.** `−  100%  +` in the pinned bar, `+` `−` `0` on the
  keyboard, and ctrl/⌘ with the wheel to zoom at the pointer. 100% is the book fitted to the
  window; from there it goes to 300%, and once it is bigger than the window you drag the page
  around under it. Zooming centres on the page you were reading rather than on the middle of the
  book — the side you last clicked, or the page an index line or a search hit just landed you on.
  It is a scale and nothing else: the book does not repaginate, so page 16 is page 16 at any size,
  which is what lets the index keep its promise. A drag is never a page-turn, and a click still
  turns the page at any zoom.
- **Cover, Contents, and back to the game**, in the pinned bar.

Every number in it is read out of the game's own constants at build time — `hb-data.js` generates
the tables from a dump of `BAL`, `RANKS`, `TECHS`, `CATS`, `GOALS`, `TRAITS`, `LIMITS`, `RETAINERS`
and the rest — so the handbook cannot describe a game that no longer exists.

## Which build am I on?

The footer of every screen, and the office header, carry a build stamp (`build 73 · 18 September
2026`). If the stamp is older than the latest commit here, the browser is showing a cached copy —
hard-reload (Ctrl+Shift+R), or close the tab and reopen the link.

## Design

Ink on paper: solid-black vector busts, a heavy condensed logotype, monospace ledgers, and
an office drawn in the same line. Two sexes — male and female — for the player and every
operative.

// The handbook's prose. Tables come from hb-data.js, which reads the game's own constants, so
// nothing here has to repeat a number that the game could change underneath it.
const G=require("./hb-data.js");
const D=G.D, money=G.money;

const p=s=>'<p>'+s+'</p>';
const note=s=>'<p class="aside">'+s+'</p>';
const ul=a=>'<ul>'+a.map(x=>'<li>'+x+'</li>').join("")+'</ul>';
const ol=a=>'<ol class="steps">'+a.map(x=>'<li>'+x+'</li>').join("")+'</ol>';
const m=s=>'<span class="mono">'+s+'</span>';
const RANK=n=>D.RANKS.find(r=>r[1]===n)[0];

/* ====================================================================== */
const CH=[];
const ch=(id,t,k,secs)=>CH.push({id,t,k,secs});
const S=(id,t,h)=>({id,t,h});

/* ---------------- 1 --------------------------------- */
ch("start","What this is","The game in four minutes",[
  S("game","The game",
    p("You are the commander of a criminal crew. You are not the police, and there is nobody above you. "
      +"Clients post work on a board — by country, by kind, with a fee on it — and you decide which of that work your crew takes, who goes on it, and what happens when it goes wrong in the middle.")
    +p("A turn is a week. Taking a job spends one to three of them, casing a job spends one, laying low spends one. "
      +"Every week the payroll comes out of your float whether anybody worked or not, the heat falls a little, and the world does something you did not ask it to.")
    +p("<b>A crew of five, and thousands of jobs.</b> That is the shape of it. Everybody for hire carries five attributes, a trade, "
      +"a passport, a record, a price and a secret, and the difference between a good crew and a bad one is not their numbers — "
      +"it is whether their numbers match the room you are sending them into.")
    +p("Most of them work the sixteen ordinary trades. The rest are <a href=\"#bigtechs\">specialists</a> — pilots, divers, tunnellers, "
      +"handlers — and nothing on the board wants one until your name opens the seventh place. See <a href=\"#ops\">the operations</a>.")),
  S("goal","The goal",
    p("Build the name. Everything in the game is downstream of your <b>ranking</b>: what clients post to you, what they pay, who will sign with you, whether the crew stays loyal, and how hard the police look.")
    +p("At ranking "+m(D.BAL.finalRep)+" the board has nothing left to offer you but the last score — three operations, in order, against the Committee. "
      +"They are the room where the names are kept. Nobody robs them. Finish all three and the game is over, and you won it.")
    +p("The last score does not appear until four things are true at once:")
    +ul([
      "A name at the top of the board — ranking "+m(D.BAL.finalRep)+".",
      "A career behind you — "+m("55")+" jobs run.",
      "A crew, not a pair — "+m("5")+" people who can actually get in the door.",
      "A war chest — "+money(D.BAL.finalMoney)+" on hand. Nobody funds this one.",
    ])
    +note("The Dashboard keeps that list ticked off as it arrives, under <b>The operation</b>. There is always a next thing to be working towards, and it is never a mystery what it is.")),
  S("lose","How you lose",
    p("Nobody on the books, and not enough money to hire the cheapest file still available. That is the whole condition. "
      +"You do not lose by being arrested — you lose by being unable to start again.")
    +p("The ways people leave the books: they are hurt, they are held, they walk out over the money, they are poached by another crew, they take a cut of a score and vanish, "
      +"you cut them loose, or they are killed. Every one of those leaves somebody outside your operation who knows things about it, which is its own problem — see <a href=\"#loose\">loose ends</a>.")),
  S("rules","The three rules the game plays by",
    p("<b>Everything has a cause and a consequence.</b> No number on any screen appeared because it looked right. "
      +"If a job says you are +9 on the night, there is a line in the factor list saying which week of casing bought it.")
    +p("<b>The odds are written on the option before you take it.</b> Every twist option, every way of dealing with a loose end, every recruitment snag "
      +"states its own percentage and its own cost. You are never asked to guess at a hidden number, only to decide whether you can afford the bad half.")
    +p("<b>Nothing is graded that you did not choose.</b> The game does not invent a verdict. If it cannot know something, it says so rather than filling it in.")),
]);

/* ---------------- 2 --------------------------------- */
ch("where","Where everything is","The screen, tab by tab",[
  S("top","The top bar",
    p("Pinned to the top of every screen, and it never scrolls away.")
    +ul([
      "<b>The name</b> — your alias, and the ranking it currently carries.",
      "<b>Money</b> — the float. Fees, cuts, upkeep, retainers, bribes and casing all come out of this one number.",
      "<b>Heat</b> — how hard the world is looking, 0 to 120, drawn as a bar. See <a href=\"#heat\">Heat and the law</a>.",
      "<b>Week</b> — the clock. Everything in the game is measured in weeks.",
    ])),
  S("tabs","The four tabs",
    p("Also pinned. Keys "+m("1")+" "+m("2")+" "+m("3")+" "+m("4")+" jump straight to them.")
    +G.T(["Tab","What is on it"],[
      ["<b>Crew</b>","Who is on the books: their cards, attributes, trade, loyalty, cut, upkeep, temperament, limits and what they have been through. Retainers and the safe house are reached from here too, and so is founding a second crew."],
      ["<b>Jobs</b>","The board. Every posting open this week, its country, its fee, what it wants, and — once you open one — the job file: who can go, who cannot and why, the odds, the split, and the button that starts it."],
      ["<b>Roster</b>","Everybody for hire, filtered — every trade, including the fourteen an <a href=\"#ops\">operation</a> asks for. This is where hiring happens."],
      ["<b>Dashboard</b>","Six folded sections: the operation, the competition and the law, standing arrangements, the record, job recaps, and the case log. One opens at a time; opening one shuts the last."],
    ])),
  S("office","The office",
    p(m("Esc")+", or the "+m("≡")+" button at the top right, on any screen. It pauses the game and opens the desk: sound, music, brightness, the controls book, your own file, the file cabinet, and the door out.")
    +p("The "+m("i")+" button beside it explains whatever is on screen, and can run the tutorial again — the whole thing, a short reminder, or any single card.")
    +p("On a screen longer than the window an "+m("↑")+" appears at the bottom right and takes you back to the top of it. "
      +"It is not there until there is something above you, and it goes away while anything is waiting to be answered.")),
  S("find","If you are looking for something",
    G.T(["You want","It is here"],[
      ["A crew member's loyalty","<b>Crew</b> → their card. Also on their full file, opened from the card."],
      ["Why somebody cannot go on a job","<b>Jobs</b> → open the posting → <b>Who goes</b>. Every name has a ✓ or a ✗ and the ✗ says why."],
      ["How many people the job needs","<b>Jobs</b> → open the posting → <b>Crew needed</b>, at the top of the file."],
      ["What you actually keep","<b>Jobs</b> → open the posting → <b>The split</b>. It subtracts the wages as well as the cuts."],
      ["Why a job failed","The report itself → <b>WHAT WENT WRONG</b>, which only appears on a botched or blown night, and says what to do differently."],
      ["Why a client will not deal with you","<b>Jobs</b> → the notice above the postings. It names the job, the city, the week and the verdict; click it for the whole account. See <a href=\"#grudge\">grudges and revenge</a>."],
      ["How to change somebody's trade","<b>Crew</b> → their card → <b>Teach a trade</b>. See <a href=\"#learn\">a new craft</a>."],
      ["Why two of my crew are arguing","They do the same job. See <a href=\"#clash\">two of the same trade</a>."],
      ["The way out of a job file","<b>← Back to job postings</b>, pinned under the tabs — it stays there however far down the file you are."],
      ["An old report","<b>Dashboard</b> → <b>Job recaps</b>. Open any one for the whole thing again."],
      ["The detective's file","<b>Dashboard</b> → <b>The competition and the law</b>."],
      ["Retainers, the safe house, buying off a desk","<b>Dashboard</b> → <b>Standing arrangements</b>."],
      ["What the crew has done, and the marks left to take","<b>Dashboard</b> → <b>The record</b>."],
      ["The week-by-week log","<b>Dashboard</b> → <b>Case log</b>, filterable by week."],
      ["What the last score is still waiting for","<b>Dashboard</b> → <b>The operation</b>."],
      ["Small work for one person","<b>Jobs</b> → <b>Quick Money - High Risk</b>, under the postings. See <a href=\"#street\">quick money</a>."],
      ["Your own file","The office → <b>Your file</b>."],
      ["This handbook","The title screen, the office's bookshelf, the controls book, or the footer of any screen."],
      ["A copy of your save you can keep","The office → <b>The file cabinet</b>. Writes the game out as one long code and reads one back in."],
    ])),
]);

/* ---------------- 3 --------------------------------- */
ch("you","You","The commander",[
  S("dossier","Opening a dossier",
    p("The title screen is the game's front door: the name, five faces under it, and a way into this handbook. "
      +"The faces are drawn out of the same face builder every operative on the roster uses, so what you are "
      +"looking at is a crew — five of the people you are about to go and find.")
    +p("<b>New game</b> goes to the <b>WHO ARE YOU?</b> screen. You choose:")
    +ul([
      "<b>Alias</b> — type one, or press "+m("↻ RANDOM")+", which draws a name from the naming pool of the nationality you have picked. A Nigerian commander gets a Nigerian name.",
      "<b>Appearance</b> — a face, drawn in ink. "+m("↻ RANDOM")+" here too.",
      "<b>Sex</b> — male or female.",
      "<b>Nationality</b> — which passport you carry, which decides which borders are a problem for <i>you</i>.",
      "<b>Trade</b> — what you personally are. You count as that trade on every job, exactly as a hired member would.",
      "<b>Attributes</b> — points to spend across the five.",
    ])
    +p("You start with "+money(D.BAL.startMoney)+" and four soldiers' places to fill.")),
  S("command","Command",
    p("You have one number nobody else has: <b>command</b>. It starts at "+m("5")+" and is added to the reckoning of every job you personally go on, on top of everything your attributes and trade are worth.")
    +p("Recruits who are commander types are worth having and awkward to keep. On a job you are on, each one is "+m("−3")+" — they take orders badly. "
      +"On a job you cannot get into, the best of them stands in and is worth their command "+m("−2")+", minimum "+m("1")+". With nobody able to lead, the job is "+m("−10")+" before anybody has done anything.")),
  S("always","You are always the commander",
    p("There is no mechanism in the game for handing the operation to somebody else. A stand-in leader runs one night and hands it straight back. "
      +"Every screen addresses you as the person who decides.")),
]);

/* ---------------- 4 --------------------------------- */
ch("people","The people","Everything on a crew member's file",[
  S("attrs","The five attributes",
    p("Every file has five, roughly 20 to 100, and they are the base of everything. A job leans on some of them and ignores the rest — see <a href=\"#cats\">the twelve kinds of job</a>, and <a href=\"#bigcats\">the eight</a> an operation uses.")
    +G.attrs()
    +p("The ceiling is "+m(D.BAL.attrCeil)+". Attributes grow slowly from work, and the growth lands on the attributes the job actually leaned on.")),
  S("techs","The sixteen trades",
    p("A trade is what somebody is. It is not a bonus you can buy — it decides which jobs want them, what knowledge they arrive with, "
      +"where they stand on the plan, and which options open up when a night goes sideways.")
    +p("A member whose trade the client asked for is worth "+m("+14")+" on the reckoning, on top of their attributes. "
      +"Several of the trades also unlock answers nothing else can give you: a Forger gets people across a border they would be turned back from, "
      +"a Cleaner is the only person who can make a problem an accident, an Enforcer is the only one who can have a conversation, and a Fixer can arrange for somebody to be somewhere else for a long time.")
    +G.techs()),
  S("bigtechs","The fourteen specialists",
    p("Fourteen more trades exist, and they are not simply rarer versions of the sixteen — they are the trades that "
      +"<a href=\"#ops\">an operation</a> asks for, and ordinary work on the board never does. They are the minority of "
      +"the roster, so they are something you go looking for rather than something you come across.")
    +p("They are on the roster from the first week and you may hire one whenever you like. There is no reason to. "
      +"A Diver on a warehouse job is a stranger with a bottle of air: their trade is never the trade the client named, "
      +"so they are worth their attributes and nothing more, and they cost "+money(9000)+" more to sign than somebody who is. "
      +"Until the seventh place opens they are money spent on a room you cannot yet get into.")
    +G.bigTechs()
    +note("They are found the same way as anybody else — Roster, then the trade filter, which lists all thirty. "
      +"The filter is the only screen that separates them; a specialist's dossier looks like everybody else's.")),
  S("exp","Experience",
    p("Five ranks, earned by going on jobs — never bought. Each rank is worth "+m("+11%")+" of everything the member's attributes are worth, which compounds with a good trade match rather than replacing it.")
    +G.exp()
    +p("Experience also decides what they cost: their fee and their cut both rise with it, and so does their weekly upkeep. "
      +"A Legend is not simply better, they are better and more expensive in three different places on the same screen.")),
  S("know","Knowledge",
    p("Ten domains. A posting names one or two it wants. Somebody on the crew who has it is worth "+m("+5")+"; somebody who has it <i>and</i> studied to at least a degree is worth "+m("+10")+". Nobody with it at all is "+m("−6")+", per domain.")
    +G.know()),
  S("edu","Schooling",
    p("Six levels. Schooling counts for nothing at all on a job that does not lean on Brains, and counts a lot on one that does — "
      +"any job whose Brains weight is "+m("3")+" or more adds education "+m("× 1.2")+" to that member's own figure.")
    +G.edu()),
  S("traits","Temperament",
    p("Most files have none, some have one, a few have two. They are the only thing on a file that changes how the crew behaves rather than how good they are.")
    +G.traits()),
  S("limits","Limits",
    p("What somebody will not do. A limit is absolute — no bonus, no loyalty and no amount of money moves it, and a member whose limit the job hits simply does not go. "
      +"A crew of six where four are claustrophobic is a crew of two underground.")
    +G.limits()
    +note("Limits are the single most common reason a job cannot be run at full strength, and the <b>Who goes</b> list on every job file names the limit by name against the person it stops.")),
  S("passport","Passport, nationality and the border",
    p("Everybody carries a passport, and passports are not equal. Countries are rated by how hard they are to enter: open, needs a visa, or strict.")
    +ul([
      "A <b>local national</b> always gets in, and is worth "+m("+8")+" to the job for knowing the ground.",
      "A <b>strict</b> border turns back anyone whose passport is better than "+m("strong")+".",
      "A border that <b>needs a visa</b> turns back anyone whose passport is "+m("weak")+".",
      "Time inside counts against you at a border: three years for a strict country, five for a visa country.",
      "A <b>Forger</b> on the crew — one who is not themselves barred from that country — clears all of it. That is what a Forger is for.",
    ])),
  S("langs","Languages",
    p("Somebody on the crew who speaks the local language is worth "+m("+6")+". Nobody who does is "+m("−8")+" — or "+m("−14")+" if the job is one of the talking kinds, "
      +"where the whole thing is a conversation and there is no version of it that works in mime.")),
  S("cost","What people cost you",
    G.T(["Money","When","What it is"],[
      ["<b>The fee</b>","Once, when they sign","What it takes to get them on the books. Scales with experience, attributes, knowledge, schooling and whether their trade is a scarce one."],
      ["<b>The cut</b>","Every job they go on","A percentage of the whole fee, off the top, before you see any of it. Roughly "+Math.round(D.BAL.cutBase*100)+"% at Rookie, rising about "+(D.BAL.cutPerExp*100).toFixed(1)+" points per experience rank, with a little jitter. A Mercenary takes 2 points more; somebody who demands 15% takes at least that."],
      ["<b>The upkeep</b>","Every week, forever","Wages. Paid whether they work, sit benched, are injured or are in a cell. This is the number that quietly ends careers."],
    ])
    +note("Miss the payroll and everybody on the books loses "+m("9")+" loyalty, every retainer stops answering, and the float is set to zero. It is the worst single thing that can happen to you without a job being involved.")),
  S("loyalty","Loyalty",
    p("0 to 100, and it starts somewhere between "+m("42")+" and "+m("68")+". It decides whether somebody stays when another crew buys them a drink, and how likely they are to talk once they are off the books.")
    +G.T(["What moves it","How much"],[
      ["A messy job","−3 to everyone who went"],
      ["A botched job","−7"],
      ["A blown job — a disaster","−13"],
      ["A missed payroll","−9 to everybody on the books"],
      ["A bonus","+14, and three weeks paid up"],
      ["Your ranking","Nobody: −1 a week. Known: nothing. Respected and up: +1. Untouchable and up: +2."],
      ["Being cut loose","−6, and then they are a loose end"],
    ])
    +p("<b>Paid up</b> is worth having for reasons beyond the loyalty: for "+m(D.PAID_WEEKS)+" weeks after a bonus they are worth "+m("+2")+" on every reckoning, deaf to other crews, and not the one trouble picks on.")
    +p("<b>Restless</b> is the opposite. A cut worth less than a week of what they cost you is a job they did for you rather than for themselves. Three of those in a row and they grumble — "+m("−2")+" each on every job — and five and they may walk.")),
  S("moles","Greed, moles and vetting",
    p("Roughly one file in fourteen belongs to an informant. They look like everybody else. A mole on the books leaks "+m("+3")+" heat a week, unexplained, "
      +"and is very much more likely to talk once they are off the books.")
    +p("<b>Vetting</b> costs "+money(D.VET_COST)+" and can be done from the roster before you ever fly out to meet somebody. It usually finds them. "
      +"It is less reliable when nobody on your crew is sharp — with no one above 55 Brains in the field there is about a one-in-three chance a mole comes back clean.")
    +p("<b>Greed</b> is a hidden number between 15 and 90. It does not change what they are worth on a job. It changes what they do when the job is over: "
      +"a greedy member is likelier to take a cut of the score and vanish, and likelier to talk afterwards.")),
]);

/* ---------------- 5 --------------------------------- */
ch("hiring","Hiring","The roster, the trip, the signature",[
  S("firstweek","The first week — the clock stands still",
    p("Going to fetch somebody is a week on the ground — but not in week one. While you are still putting the crew together you can go and ask as many people as the float carries, one after another, and the clock does not move.")
    +p("Nothing about it is free. Every fee you agree to comes out of the float the moment they say yes, and a float spent in week one is a float you do not have in week four. What week one costs you is money, never time — which is the only sense in which it is cheap.")
    +p("From <b>week two</b> every trip costs its week, whether they sign or not. That is what makes an empty place expensive rather than merely untidy, and it is why somebody turning up on their own is worth something.")),
  S("comeToYou","When they come to you",
    p("From a <b>Known</b> name, people start asking to join instead. The chance is printed on the roster, and it rises with every rung above that — nobody comes to a Nobody.")
    +p("It is the whole transaction the other way round, and that is the point of it:")
    +ul([
      "<b>No trip and no week.</b> They are already here.",
      "<b>The figure is theirs to open with and yours to argue with.</b> What they ask already sits under what going to fetch them would have cost — both are printed, side by side. <b>Too much</b> costs nothing to say and works most of the time, twice; the third time they are entitled to hold, and do.",
      "<b>No costs nothing.</b> No week, no money, no place. They go, and will not ask again for a month or two.",
      "And somebody who asked to be here starts a few points of loyalty ahead of somebody who had to be persuaded.",
    ])
    +note("They only turn up when there is a place free. An applicant you cannot sign is a tease, not an event.")),
  S("roster","The roster",
    p("Everybody for hire, filterable by trade, experience, nationality, price and what they will not do. "
      +"They are generated once from the game's seed and they do not change — the person you looked at in week 3 and could not afford is still there in week 40, at the same price, unless somebody else got to them.")
    +note("The trade filter comes in its two kinds — <b>Trade</b> for the sixteen, <b>Specialist</b> for the fourteen — and A to Z inside each, as the nationalities are. "
      +"Thirty job titles in no particular order is a list you have to read all of before you know it does not have what you want.")),
  S("sign","Who will sign",
    p("Your ranking decides the ceiling. A Nobody cannot get a Legend to sit down with them at any price.")
    +ul([
      "<b>Nobody</b> and <b>Small time</b>: nobody above Professional.",
      "<b>Known</b>: up to Veteran.",
      "<b>Respected</b> and above: anybody, including Legends.",
    ])
    +p("Somebody who turns you down will not meet you again for a set number of weeks, and the roster says which week.")),
  S("trip","The recruitment trip",
    p("You do not click <i>hire</i> and get a person. You fly out to where they are and sit down with them, and it runs as a live report exactly like a job does: "
      +"a clock in the corner, a map of the city with the meeting on it, and the thing unfolding line by line.")
    +ol([
      "You land, and the city is described as it actually is — its money, its weather, its politics.",
      "You walk it for a day. What you notice depends on who you brought.",
      "You sit down. Speaking the language, having a Face along, being a name people have heard of — each of them changes how the table goes.",
      "Something happens. Not always, but often.",
      "They sign, or they do not.",
    ])
    +note("<b>Nothing is paid until the signature.</b> The fee leaves your float at the end of the meeting and not before, so a trip that ends in nothing ends in nothing — plus whatever the snag itself cost you.")),
  S("snag","The snag",
    p("Five kinds, and which one you get depends on who you are meeting:")
    +G.T(["Snag","When it happens"],[
      ["<b>Somebody else is at the table</b>","Anyone. A rival crew got there first."],
      ["<b>They want to test you</b>","Only the good ones — Veteran and Legend."],
      ["<b>It is a set-up</b>","Greedy, or an informant, or six years inside or more."],
      ["<b>They are not what the file says</b>","Low experience, or low loyalty. Usually drunk."],
      ["<b>A check at the hotel</b>","Any country that needs a visa, is strict, or is under authoritarian rule."],
    ])
    +p("Every snag offers several ways out, and which ones are open depends on what you brought with you — a Forger's papers, a Face making a call, an Enforcer, the local language, "
      +"or simply a record long enough that they have heard of you. There is always at least one option available, and walking away is always one of them.")),
  S("drop","Cutting somebody loose",
    p("Dropping a member costs them "+m("6")+" loyalty and puts them straight back on the roster at their original price. It also makes them a <a href=\"#loose\">loose end</a>, "
      +"which is a separate conversation that the game will make you have.")),
]);

/* ---------------- 6 --------------------------------- */
ch("crew","The crew","Places, who goes, and a second crew",[
  S("seats","Places",
    p("You start with four soldiers' places and yourself — five. A <b>Respected</b> name (ranking "+m(RANK("Respected"))+") opens two more, for six soldiers and you. "
      +"That is the ceiling: "+m(D.CREW_MAX_SEATS)+" soldiers, plus the commander.")
    +p("Those two places are not only more people. They are the only thing standing between you and "
      +"<a href=\"#ops\">the "+D.BAL.bigCount+" operations</a> — work that needs six or seven in the field, written for trades "
      +"that no ordinary posting asks for. The game announces both at the same moment, in that order: the places first, then what they are for.")),
  S("whogoes","Who goes",
    p("<b>Everybody on the books goes on every job</b>, unless something stops them. There is no picking a team. What there is instead is a list of reasons somebody cannot go:")
    +ul([
      "A <b>limit</b> the job hits — the tag is named against them.",
      "A <b>border</b> their passport or their record will not get them through.",
      "They are <b>injured</b>, and the file says which week they are back.",
      "They are at a school — <a href=\"#learn\">a new craft</a> or <a href=\"#lang\">a new language</a> — and the file says which week it ends, and which one they are at.",
      "They are <b>held</b> by the police.",
      "You <b>benched</b> them.",
    ])
    +p("The job file states, at the top, how many the client needs and how many can actually go. Under the needed number the whole crew is "+m("−22")+" per missing body, which is enormous — "
      +"it is usually the single largest number in the factor list, and it is the reason a job you are short for is not worth running at any fee.")
    +note("Every row in that list carries a <b>File</b> button, the ones who cannot go included — the whole personnel file, opened over the job and closed back onto the same row. "
      +"Who goes is decided out of what is on those files, so they are read where the decision is made rather than on another screen.")),
  S("learn","A second trade",
    p("A trade is what somebody <i>is</i> in this game: the first line of their card, and the thing a client asks for by name. "
      +"A second one is what they can also <i>do</i> — learned, kept, and carried alongside the first. "
      +"<b>Teach a trade</b> on their card opens the conversation.")
    +p("Anybody "+m(D.EXP[2])+" or better can be asked, and each of them <b>once</b>. What it costs:")
    +ul([
      "<b>Money</b> — from "+money(30000)+", more for a higher rank, and about twice as much for one of the <a href=\"#bigtechs\">specialists</a>.",
      "<b>Weeks</b> — four to six out of the field, six to eight for a specialist. They cannot go on a job while they are at it, and take no cut of anything the crew earns meanwhile. That is the whole price now, and it is the thing they weigh.",
      "<b>Not their rank, and not who they are.</b> They come back the same rank at the same trade, able to do a second one. It is worth a little less on a job than the trade they are — "+m("+8")+" against "+m("+14")+" — and it is always there.",
    ])
    +p("<b>Why it is worth the month.</b> A job names one to three trades out of sixteen and a crew has six or seven seats, so no fixed crew covers the board. "
      +"The answer is not to keep replacing people — it is to have the same people cover more. Six who each do two things is a crew; "
      +"six replaced every fortnight is a roster.")
    +p("<b>And they can say no.</b> The screen prints the chance they agree before you ask, and what it is made of: where you stand with them, "
      +"the weeks they lose, whether they are built for the new work, and their temperament. "
      +"<i>Where you stand</i> is loyalty plus the nights you have actually been through together — it is not the same number as loyalty, and it is the one that decides this.")
    +note("Ask and be refused and they will not hear it again for a month or two. Rank matters on both sides of it: a week off the field is worth more to a Legend than to a Professional, and they answer accordingly.")),
  S("learnno","And if they say no",
    p("Four directions, and which of them is worth taking is decided by the same number the refusal was.")
    +ul([
      "<b>Leave it.</b> Costs nothing, buys nothing, and they know you asked and listened. Loyalty "+m("+3")+".",
      "<b>Put money on it.</b> Three offers, each printing the new chance. <b>The money goes whether they take it or not</b> — that is what makes it an offer rather than a purchase. It moves the number at any standing, including for somebody who is halfway out of the door, but it never buys the last stretch.",
      "<b>Tell them it is not a question.</b> Three ways it can go, all printed: they go and resent it ("+m("−22")+" loyalty, and it costs you with them), they refuse in front of everybody, or they walk out that night. An Enforcer on the books moves the odds towards the first and away from the last.",
      "<b>Cut them loose.</b> They go, the crew takes it badly in proportion to how much they liked them, and they leave knowing what they know — see <a href=\"#loose\">loose ends</a>.",
    ])),
  S("lang","A new language",
    p("The other school, and the cheap one. <b>Teach a language</b> on their card opens it. It exists because of one line on every job file: "
      +"a posting in a country nobody on the crew speaks is "+m("−8")+" on the night, and "+m("−14")+" if the job is all talk. One of your people speaking it is "+m("+6")+" instead. "
      +"So the screen opens with the languages a posting wants <i>this week</i> that nobody on this crew can speak.")
    +p("<b>Nobody refuses this one.</b> A trade is what somebody is, so swapping it costs rank and has to be argued for. A language is added to what they already have "
      +"and takes nothing away — so there is nothing to argue about. It is a price list, and the price is weeks.")
    +G.T(["What it costs",""],[
      ["<b>Money</b>",money(D.TUTOR.rate)+" a week of tutoring — a fraction of a trade"],
      ["<b>Weeks, near</b>",m(D.TUTOR.near+" weeks")+" for a language out of a family they are already inside"],
      ["<b>Weeks, far</b>",m(D.TUTOR.far+" weeks")+" for one out of a family they are not"],
      ["<b>The field</b>","they cannot go on a job while they are at it — the crew is one short"],
      ["<b>Coming back</b>","the language, for good, and "+m("+"+D.TUTOR.loyalty)+" loyalty for the money you spent on them"],
    ])
    +p("<b>The families.</b> A French speaker reaches Spanish, Italian, Portuguese, Romanian and Catalan across a family they are already in, and Japanese across nothing at all:")
    +ul([
      "<b>Romance</b> — French, Spanish, Portuguese, Italian, Romanian, Catalan.",
      "<b>Germanic</b> — English, German, Dutch, Swedish, Danish, Norwegian, Icelandic, Afrikaans.",
      "<b>Slavic</b> — Russian, Ukrainian, Polish, Czech, Slovak, Bulgarian, Serbian, Croatian, Slovenian.",
      "<b>Indo-Aryan</b> — Hindi, Urdu, Bengali, Punjabi, Gujarati, Marathi, Nepali, Sinhala.",
      "<b>Sino-Tibetan</b> — Mandarin, Cantonese, Burmese, Tibetan.",
      "<b>Turkic</b> — Turkish, Azerbaijani, Uzbek, Kazakh, Turkmen, Kyrgyz.",
      "<b>Austronesian</b> — Indonesian, Malay, Tagalog, Filipino, Javanese, Malagasy, Maori, Hawaiian.",
      "<b>Semitic</b> — Arabic, Hebrew. <b>Bantu</b> — Swahili, Zulu.",
      "<b>On their own</b> — Greek, Finnish, Japanese, Korean, Thai, Vietnamese. Nothing in this game is near them, so they are always the long way round.",
    ])
    +p("A week comes off for <b>Brains "+m(D.TUTOR.brainsAt)+"</b> or better, a week for <b>Quick study</b>, and a week for a <b>Linguist</b>, who does this for a living. "
      +"Nothing is learned in under "+m(D.TUTOR.floor+" weeks")+" however sharp they are.")
    +note("Every reason for the length is printed on the screen beside the number, including which language of theirs the new one is reached through.")),
  S("clash","Two of the same trade",
    p("Put two of the same trade on one crew and the question of who is <i>the</i> "+m("Safecracker")+" is asked the same day, not eventually. "
      +"It arrives as a scene — ten of them, and which one you get depends on the pair — and you have to answer it before you do anything else.")
    +p("What it can be about: two plans for the same door; kit bought on the float that the other one says is wrong; one posting that wants the trade "
      +"and two people who could take it; the newer one being on a bigger percentage; one treating the other as an apprentice; a client who asked for one of them by name; "
      +"two schools of the same craft; a fourteen-month sentence one of them served for the other one's night; a safe house with one room; and a favour being called in at the table.")
    +p("Each has five ways out — "+m("50")+" between them — and every one states what it needs, what it costs and the odds it goes your way. "
      +"They run from picking a side to paying one of them off, putting one on the bench, sending one to the second crew, having a Fixer or an Enforcer settle it, "
      +"or asking one of them to <a href=\"#learn\">learn a different trade</a>, which is the only answer that removes the reason for the argument.")
    +note("An answer either settles it or does not, and the screen says which. What is not settled comes back in a few weeks as a different scene between the same two people. "
      +"Bad blood set here is the game's ordinary bad blood: it costs the crew on the reckoning of every job they are both out on.")),
  S("bench","Benching",
    p("Benching somebody keeps their percentage of the fee. That is all it does.")
    +p("<b>It does not save their wages.</b> The payroll is charged every week for everybody on the books, benched or not, for as many weeks as the job holds the crew. "
      +"The job file shows both numbers side by side — what the cuts cost and what the weeks cost — for exactly this reason.")
    +p("Benching also lowers the crew size bonus, and it removes whatever that person was bringing: their trade, their language, their knowledge, their passport. "
      +"The file recalculates the odds live as you bench people, so you can see the trade being made rather than guessing at it.")),
  S("hire1","Somebody for the one night",
    p("A crew of six cannot hold sixteen trades, and the board does not wait while you go and fetch the one it asked for. "
      +"When a posting names a trade nobody going has, the job file offers people who are — three of them, from the best down to the cheaper — "
      +"for that one night.")
    +p("What a hired hand is <i>not</i> is a cheap crew member. They take <b>no place</b>, draw <b>no wages</b>, build <b>no bonds</b> either way, "
      +"and cost <b>"+m(D.HIRED?(D.HIRED.stranger<0?"−"+Math.abs(D.HIRED.stranger):"+"+D.HIRED.stranger):"−7")+"</b> on the reckoning, "
      +"because nobody in that room has worked with them. What they take is a contractor's share of the score.")
    +G.T(["What it costs","Value"],[
      ["Their share",m(Math.round((D.HIRED?D.HIRED.cutMin:0.17)*100)+"%")+" to "+m(Math.round((D.HIRED?D.HIRED.cutMax:0.30)*100)+"%")+" of the score, by rank — four or five times a crew member's"],
      ["A place","none — the contract is for the night, not the crew"],
      ["Wages","none — they are never on the payroll"],
      ["On the reckoning",m(D.HIRED?(D.HIRED.stranger<0?"−"+Math.abs(D.HIRED.stranger):"+"+D.HIRED.stranger):"−7")+", a stranger in the room"],
      ["Afterwards","they may talk"],
    ])
    +p("<b>They are paid out of the score, like everybody else.</b> That one fact is the whole mechanic: a night that pays nothing pays them nothing, "
      +"and somebody who came, took the risk and went home empty is the one who goes to the police. So is somebody the police picked up at the scene. "
      +"Nerve and years on the street pull the odds back down — a professional stays a professional on a bad night — and the job file prints both numbers "
      +"before you sign: what they do after a night that comes off, and after one that doesn't.")
    +p("When one talks it is "+m("+"+(D.HIRED?D.HIRED.talkHeat:11))+" heat, a thicker file on <a href=\"#det\">the detective's</a> desk, "
      +"and a <b>Talked</b> stamp on theirs. They are never brought in again. Hiring them properly is a different question — a place, wages, "
      +"and a stake in the next one — and it is still yours to decide.")
    +note("The contract is for one posting. Open a different one and it is torn up, the same as benching. "
      +"The offer only ever appears against a trade the field is missing — it is an answer to a gap, not a way to buy a better crew by the week — "
      +"and it never appears on <a href=\"#ops\">an operation</a> or on the final score, which are the two screens that ask whether the crew you built is broad.")),
  S("hurt","Injured and held",
    p("A bad night puts people in hospital or in a cell. A doctor on retainer halves the weeks of an injury; a lawyer on retainer halves the weeks of a sentence. "
      +"Somebody who comes out of a cell is back on the roster rather than on your crew, a year older, with that year on their record — and a record is what borders read.")),
  S("second","A second crew",
    p("From a year in, with a big enough name and a full crew, you can found a second crew that works without you.")
    +G.T(["Needed","Value"],[
      ["Week",D.EXTRA_CREW_WEEKS[0]+" for the second, "+D.EXTRA_CREW_WEEKS[1]+" for the third, "+D.EXTRA_CREW_WEEKS[2]+" for the fourth — and no more"],
      ["Ranking","at least "+m(D.EXTRA_CREW_REP)],
      ["Your crew","full — all "+m(D.CREW_MAX_SEATS)+" soldiers plus you"],
      ["Among them","a commander type, and "+m(D.EXTRA_CREW_SIZE)+" ready to go"],
    ])
    +p("A crew is a commander and four soldiers, named after its commander. It takes a posting of its own each week from the same board. "
      +"Its take is yours, its ranking is yours, its heat is yours — and so is its payroll.")),
  S("joker","Reassemble — the one card",
    p("There is a position this game can leave you in with nothing to press. Nobody signs with a name worth nothing; "
      +"a name is only worth what the last job was worth; with no crew there is no job. That is not losing — the game never says you have lost — "
      +"it is a board you cannot take anything from. <b>Reassemble</b> is the one call you get to make, and you get it once.")
    +G.T(["Needed","Value"],[
      ["Ranking","under "+m(D.JOKER.rep)+" — a name worth nothing"],
      ["Your crew",m(D.JOKER.crew)+" soldier or none"],
      ["The float","more than "+money(D.JOKER.cost)+" — proof you can afford a crew and still cannot get one"],
      ["Times","once a game"],
    ])
    +p("It costs "+money(D.JOKER.cost)+" and no weeks, fills every empty place, and ignores who would normally sign with you — "
      +"these people are not coming for your name, they are coming because you asked. The ones who have run with you before come first; "
      +"the rest are whoever the money finds.")
    +p("It pays no ranking. The card buys people, not a name. You do not choose who comes and looking again does not change them — "
      +"they are drawn once and kept with the save — but you may decline, and then the card is still yours. "
      +"It sits in the top right of the Crew screen from the first week, so you always know you are holding it.")),
]);

/* ---------------- 7 --------------------------------- */
ch("board","The board","Where the work comes from",[
  S("postings","The postings",
    p("Seven postings are kept open at all times — nine with a fixer on retainer, and one of those nine is written for the crew you actually have. "
      +"They expire. A posting you were saving for next week may not be there next week.")
    +p("Clients post to a <b>name</b>. A Nobody sees tier 1 and 2 only; a Known crew sees tier 3; Respected and above see everything. "
      +"A client you have botched a job for stops posting to you at all.")),
  S("reading","Reading a posting",
    p("Every row leads with the verdict — <b>Good fit</b>, <b>Risky</b>, <b>Long odds</b>, or how many of your crew can even go. "
      +"Hover it and it shows its working: your reckoning against the job's difficulty, the "+m("±"+D.BAL.roll)+" the night rolls on top, "
      +"and the odds of each ending. A verdict with no sum behind it is the one thing this game is not supposed to print.")
    +p("Under it, every requirement the client named, green if you hold it and red if you don't — and each one says <b>what it is worth here</b>, "
      +"in the same points the reckoning is counted in. Three kinds of number, and the difference between them matters:")
    +G.T(["On a chip","Means"],[
      [m("+9"),"being counted for you right now"],
      [m("(+9)"),"what somebody who had it would be worth — you are not charged for missing it, you are declining a bonus"],
      [m("−6"),"a charge, being taken off the reckoning now"],
    ])
    +p("A <b>trade</b> is "+m("+"+(D.TRADE_COVER||4))+" to the crew for being covered at all, plus "+m("+"+(D.TECH_BONUS||14))
      +" to the one who <i>is</i> it or "+m("+"+(D.TECH_BONUS_2||8))+" to one who <a href=\"#learn\">learned it second</a> — "
      +"and because the reckoning averages the field, that bonus is divided by how many go. A specialist in a room of three is most of the room; "
      +"the same person in a room of seven is a seventh of it. Bench somebody and the number moves, which is the trade being made, shown.")
    +p("<b>Knowledge</b> is "+m("+"+(D.KNOW_BONUS||5))+", or "+m("+"+(D.KNOW_SCHOOLED||10))+" if the one who knows it went to university, "
      +"and "+m(String(D.KNOW_MISSING||-6).replace("-","−"))+" if nobody going knows it. The <b>language</b> is "+m("+"+(D.LANG_BONUS||6))
      +" spoken, "+m(String(D.LANG_MISS||-8).replace("-","−"))+" not — "+m(String(D.LANG_MISS_TALK||-14).replace("-","−"))
      +" on a job that is all talk.")
    +p("<b>How many trades a posting names goes with its tier</b> — one at tier 1, two at tiers 2 and 3, three at tier 4. "
      +"That is not simply more difficulty piled on the big ones: every name is another chance that somebody on your crew "
      +"is the one it wants, so a tier-4 posting is often the one your crew has <i>something</i> to say about, even while "
      +"it is the hardest room on the board.")
    +note("This was briefly capped at two, on the argument that three names should mean <a href=\"#ops\">an operation</a> "
      +"and nothing else. Measured over 200 weeks of boards on a crew held still, across four pinned seeds, the cap left "
      +"the crew holding none of the wanted trades on MORE of the hardest postings, not fewer — about eight points more. "
      +"Fewer names is fewer chances. It was put back.")
    +note("So a missing trade and a missing piece of knowledge are not the same red. One of them costs you nothing you had; "
      +"the other comes off the night. Both used to be drawn as a plain cross, which said they were the same thing.")),
  S("tiers","Tiers",
    p("Four of them on the open board, and the tier decides the fee, how many weeks it holds the crew, how many people the client needs, and how long you are allowed to sit outside it first.")
    +G.pay()
    +p("The fee is then multiplied by the country's economy (a poor country pays about two thirds), by your ranking's pay multiplier, and by a wide random band. "
      +"Two postings of the same tier can differ by a factor of three.")
    +note("There is a fifth tier. No client posts it and no rival takes it — see <a href=\"#ops\">the operations</a>.")),
  S("cats","The twelve kinds of job",
    p("Each kind leans on some attributes and not others. This table <i>is</i> the reason to read a posting before you open it: "
      +"a crew that is magnificent at one of these is ordinary at another.")
    +G.cats()
    +p("<a href=\"#ops\">Operations</a> add <a href=\"#bigcats\">eight more kinds</a>, which only they use.")),
  S("tags","What a job is",
    p("Six tags, and each of them is a limit somebody on your crew might have.")
    +G.T(["Tag","Reads as"],Object.keys(D.TAG_LABEL).map(k=>['<b>'+k+'</b>',D.TAG_LABEL[k]]))),
  S("country","Countries",
    p("Forty-nine of them, and each one is a real place with its own languages, currency, economy, politics, terrain, cities and border. "
      +"Which kinds of job appear there follows from what the country is.")
    +p("<b>Local heat</b> is separate from your own. Working a country adds "+m("+"+D.BAL.countryHeatPerJob)+" to it and it falls "+m(D.BAL.countryHeatDecay)+" a week. "
      +"Every point of it makes jobs in that country "+m("+"+D.BAL.countryPressure)+" harder. Work the same country five weeks running and you have made it your hardest country.")),
  S("case","Casing a job",
    p("A room you have watched is not the room you were told about. Each week of casing is worth "+m("+"+D.BAL.caseGain)+" on the night.")
    +ul([
      "It costs "+m(Math.round(D.BAL.caseCostPct*100)+"%")+" of the fee, minimum "+money(4000)+".",
      "It spends a week — the payroll is charged, the world moves.",
      "It adds "+m("+"+D.BAL.caseHeat)+" heat and "+m("+3")+" local heat.",
      "You may case a tier-1 posting once and a tier-4 posting four times.",
      "<b>The posting can be gone when you look up.</b> The rival works the same board, and clients stop waiting.",
    ])),
  S("diff","How hard a job is",
    p("Every posting carries a difficulty, and the crew has to beat it. It is built like this:")
    +G.T(["Part","Value"],[
      ["Base",m(D.BAL.diffBase)],
      ["Per tier",m("+"+D.BAL.diffPerTier)+" × tier"],
      ["Jitter",m("±"+D.BAL.diffJitter)],
      ["Your ranking",m("+"+D.BAL.repPressure)+" per 100 ranking, slightly sub-linear — at "+D.BAL.finalRep+" the world is about "+m("+62")+" harder"],
      ["Local heat",m("+"+D.BAL.countryPressure)+" a point"],
      ["A strict border",m("+5")],
      ["Authoritarian rule",m("+4")],
    ])
    +note("The ranking term is the important one, and it is the game's spine: <b>the rooms you are offered are defended against the name you have built.</b> "
      +"A crew that does not keep improving does not stand still — it slides.")),
]);

/* ---------------- 8 --------------------------------- */
ch("street","Quick Money - High Risk","One person, no crew, no plan",[
  S("what","What it is",
    p("A box under the postings on the Jobs board, headed <b>Quick Money - High Risk</b>: two or three small pieces a week, a few hundred to a few thousand dollars each, "
      +"done this afternoon by <b>one</b> person off your books. No client, no casing, no crew, no plan, and no week spent.")
    +p("It exists for one situation, and it is a situation everybody ends up in: <b>you are a few thousand short of the person you need.</b> "
      +"The file is there, the price is there, and the float is not. This is how you make up the difference, and it is meant to feel like it.")),
  S("who","The whole game of it is who you send",
    p("A trade counts for <b>nothing</b> out here. Nobody is paying for a Safecracker on a parked car, and a Legend Forger is worth no more than anybody else on a scaffolding roof.")
    +p("What counts is:")
    +ul([
      "<b>The attributes the work actually leans on</b>, weighted — three parts nerve and one part technique is a different person from three parts muscle.",
      "<b>Experience</b>, which is worth "+m("+3")+" a rank. Somebody who has done this before does this better.",
      "<b>Temperament.</b> A Ghost is "+m("+8")+" and a Hothead is "+m("−7")+", because this is work with nobody behind them and no way out that somebody else planned.",
      "<b>What they will not do.</b> A limit is not a penalty here, it is a wall: somebody afraid of heights is not going up the scaffolding, and the button says so.",
    ])
    +note("The commander is "+m("−6")+" and is not on the list at all — you do not go. You are used to having four people behind you, and there is nobody behind you here.")),
  S("odds","The odds, before you choose",
    p("Every name on the list carries its own percentage, worked out against this particular piece of work, next to the fit that produced it. "
      +"That is the same promise the rest of the game makes: the number is on the option before you take it, not after.")
    +p("Fit against the work's difficulty gives a margin, and the margin gives the chance they come back with the money. The margin does something else as well — "
      +"<b>the worse the fit, the worse the wrong ending</b>. A bad choice is not merely likelier to fail. It is likelier to cost you the person.")),
  S("risk","What it costs when it goes wrong",
    ul([
      "<b>Hurt</b> — out of the field for two weeks, one with a doctor on retainer.",
      "<b>Taken</b> — held for two to five weeks, one to three with a lawyer. They come off the crew while they are inside.",
      "<b>Nothing but the walk home</b> — no money, no damage. The commonest bad ending, and the cheapest.",
      "Either way: <b>heat</b>, global and local, whether or not it came off. The street does not care how it went. And loyalty "+m("−4")+", because you sent them out alone.",
    ])),
  S("offers","What is on offer",
    p("Twelve kinds of work, two or three of them a week, in a different city each time and at a price and a difficulty that are drawn fresh.")
    +G.street()
    +note("Coming back clean is worth "+m("+6")+" experience. This is the cheapest way there is to put a rank on somebody you have just signed — which is its own reason to send the right person rather than the spare one.")),
  S("limit","Why you cannot live on it",
    p("<b>One piece of street work a week</b>, however big your crew. That is the whole of the brake, and it is deliberate.")
    +p("A perfect year of it — fifty-two weeks, every one of them clean, never once losing anybody — comes to about a fifth of what three tier-3 jobs pay. "
      +"It is not an income. It is the difference between a file you cannot afford this week and a file you can, and it is bought with a real chance of losing "
      +"the most expensive thing you own, which is a person.")),
]);

/* ------------------------------------------------------ */
ch("bigops","The operations","The "+D.BAL.bigCount+" that need seven",[
  S("ops","What an operation is",
    p("A <b>Respected</b> name (ranking "+m(RANK("Respected"))+") opens the last two places on your crew. It opens something else at the same time, "
      +"and the two are one thing: work written for a crew of that size, which nobody could field before and which you could not have been offered.")
    +p("There are "+m(D.BAL.bigCount)+" of them. They are numbered "+m("OP-001")+" to "+m("OP-"+D.BAL.bigCount)
      +", they are marked <b>Operation</b> on the board, and <b>each one exists once</b>: run it and it is gone from your game for good. "
      +"The job file counts them down for you — <i>Operation 3 of "+D.BAL.bigCount+"</i> — so you always know how much of it is left.")
    +G.bigVs()
    +p("Everything else about them works the way ordinary work works. The reckoning is the same arithmetic, the verdict bands are the same, "
      +"the twist can still arrive, the split is the same split, and a botched one makes the same enemy. What is different is the size of all of it.")),
  S("opsopen","How they arrive",
    p("Once the seventh place is open, one or two operations sit on the board at any time, alongside the ordinary postings — "
      +"they do not replace them. They expire like anything else, and a new one takes the place of one that lapses.")
    +ul([
      "<b>No client posts them.</b> They come from a short list of people who do not use the board.",
      "<b>The rival never takes one.</b> Every other posting on the board is a race; these are not. They wait for you.",
      "<b>A client you have fallen out with still keeps theirs off your board</b> — a grudge silences an operation the same way it silences a job.",
      "<b>One you have run never comes back.</b> The counter on the file is the honest one: it counts what you have spent, not what you have seen.",
    ])
    +note("The record in the Log carries an <b>Operations</b> line from the week the first one opens, and it reads "
      +m("n of "+D.BAL.bigCount)+" — the only number in the game that only goes one way.")),
  S("bigcats","The eight kinds",
    p("Operations use eight kinds of job of their own, and no ordinary posting ever uses them. Each is built around a place a crew of five could not reach.")
    +G.bigCats()
    +p("The country follows the kind rather than the other way round: <b>Deep water</b> and <b>Air lift</b> are written for coasts and for distance, "
      +"so the map decides where they can happen. The seven-place operations ask for "+m("3")+" to "+m("5")+" trades and "+m("2")+" to "+m("3")
      +" kinds of knowledge, which is more than any one person carries — that is what the extra places are for.")),
  S("opscrew","What to take",
    p("An operation names its trades, and most of what it names is a <a href=\"#bigtechs\">specialist</a>. "
      +"That is the whole shape of the thing: six or seven in the field, three to five trades asked for by name, each worth "+m("+14")+" to whoever matches it. "
      +"A crew of generalists can be sent on one; it will not be the crew the file was written for.")
    +p("Read the file before you hire for it. The trades are listed on the posting, the roster's trade filter has all thirty in it, "
      +"and a specialist you sign for a "+money(D.BAL.payTier[5])+" room is cheap at "+money(9000)+" over the odds.")
    +note("Seven in the field is worth "+m("+"+D.BAL.bigNeed7)+" of difficulty over six. More people is not free — "
      +"the operations that ask for seven are the ones that are hard because they need seven.")),
]);

/* ---------------- 9 --------------------------------- */
ch("reckon","The reckoning","Exactly how a job is decided",[
  S("member","What one person is worth",
    p("For the job in front of them — not in general:")
    +'<div class="formula">'
      +'<div>1. Take their five attributes, weighted by what this kind of job leans on, and divide by the total weight.</div>'
      +'<div>2. Multiply by <span class="mono">1 + (experience − 1) × 0.11</span>.</div>'
      +'<div>3. Add <span class="mono">14</span> if the client asked for their trade.</div>'
      +'<div>4. Add <span class="mono">education × 1.2</span> if this job\'s Brains weight is 3 or more.</div>'
    +'</div>'
    +p("The crew's <b>power</b> is the average of that across everybody who actually goes. An average, not a sum — which is why one brilliant specialist does not carry four passengers, and why "
      +"adding a body who is wrong for the job makes the crew worse rather than bigger.")),
  S("factors","The factors",
    p("On top of the average comes a list of adjustments, and the job file shows every one of them with its number and its reason. This is the whole list:")
    +G.T(["Factor","Worth"],[
      ["Crew short",m("−22")+" per missing body"],
      ["Crew size",m("+6")+", plus "+m("3")+" per spare body over the needed number, capped at "+m("+9")],
      ["You command","your command score, normally "+m("+5")],
      ["Commanders under you",m("−3")+" each"],
      ["Stand-in leader","their command "+m("−2")+", minimum "+m("1")+" — only when you cannot get in"],
      ["Leaderless",m("−10")],
      ["Language",m("+6")+" spoken, "+m("−8")+" not, "+m("−14")+" not on a talking job"],
      ["Local national",m("+8")],
      ["Knows a domain",m("+5")+", or "+m("+10")+" if schooled in it"],
      ["Nobody knows a domain",m("−6")+" each"],
      ["Trades",m("+4")+" per wanted trade present"],
      ["Paid up",m("+2")+" each, capped at "+m("+6")],
      ["Temperament","whatever the traits in the field are worth"],
      ["They have worked together","a point per job the pair has finished together"],
      ["Bad blood","a point off per botched or blown night the pair shared"],
      ["Restless",m("−2")+" each"],
      ["Cased",m("+"+D.BAL.caseGain)+" per week watched"],
      ["Heat",m("−0.24")+" per point of heat — at heat 80 that is "+m("−19")],
    ])),
  S("roll","The night",
    p("Add the factors to the power. Subtract the job's difficulty. That is the <b>margin</b> — what the job file shows as the odds.")
    +p("On the night, a roll of "+m("±"+D.BAL.roll)+" is added to the margin, and where it lands decides the verdict. "
      +"The width of that roll is why the file quotes five percentages rather than a yes or a no: a margin of "+m("+20")+" is a good job that can still be messy.")
    +G.verdicts()
    +note("A clean night pays "+m("8%")+" over the fee — the client is pleased and rounds up. A messy one pays "+Math.round(D.BAL.messyPay*100)+"%. A botched or blown one pays nothing at all, "
      +"and the wages for those weeks still come out of your float.")),
  S("after","What a job leaves behind",
    p("Every verdict moves more than the money:")
    +ul([
      "<b>Ranking</b> up or down, damped by how far beneath your name the job was. A tier-1 posting run by a Notorious crew barely registers.",
      "<b>Heat</b>, the job's own figure multiplied by the verdict's own multiplier and again by your ranking's.",
      "<b>Local heat</b> in that country, "+m("+"+D.BAL.countryHeatPerJob)+".",
      "<b>Experience</b> to everyone who went, doubled for a Quick study, and half again for everyone on a job with a Mentor on it.",
      "<b>Attributes</b>, occasionally, on whatever the job leaned on.",
      "<b>People</b> hurt or held, on a botched or blown night.",
      "<b>Loyalty</b>, down, on anything worse than a success.",
      "<b>Bad blood</b> or a bond, between every pair who were there.",
      "<b>A client with a grudge</b>, if you blew their job — and they may come back for it.",
    ])),
]);

/* ---------------- 10 -------------------------------- */
ch("night","The night itself","The live report",[
  S("estab","It opens on the city",
    p("Seven seconds of skyline before the first line of the night: where you are, what kind of job it is, and what it is called. "
      +"The crew has just landed somewhere, and the report reads differently once you have been told where you are standing. "
      +"Click it, or press any key, to go straight on.")
    +p("It has its own sound — soft music and a sea, cut to the length of the card so it fades out exactly as the card goes. "
      +"The report's own track is held under it and comes in with the first line of the night, so the seven seconds belong to "
      +"the city. Going straight on cuts it short. It answers to the music switch in the office like everything else.")
    +p("Every one of the "+m(D.CITY_COUNT||129)+" cities has its own, and the skyline behind it is <b>generated</b> rather than "
      +"collected — from a hash of the city's own name, so it is the same place every time on every machine, and from the "
      +"country's ground, so a mountain town has a ridge behind it, a port has water and a gantry crane under it, a delta has a "
      +"bridge, and a jungle coast has palms at the edge. It is drawn in outline: black line on white paper, the far things "
      +"thinner and fainter than the near ones, which is the whole of why it reads at that size.")
    +p("<b>Every one of them has the real landmark standing in front of it</b>, drawn by hand — the Eiffel Tower, the CN Tower, "
      +"the Opera House with the Harbour Bridge behind it, the Statue of Liberty, Fuji behind Tokyo Tower. The generated skyline "
      +"is held down to about two thirds of its usual height behind it, so the thing you came to see is the tallest thing on the "
      +"card rather than one more rectangle in the row.")
    +(D.LANDMARKS&&D.LANDMARKS.length?p("The whole list, in the order the game keeps it, which runs by region:")+G.landmarks():"")
    +note("Forty-two of them had only a skyline to begin with, on the argument that a made-up landmark is worse than none. They "
      +"were drawn rather than invented: where the famous thing about a city is not a building it is drawn as what it actually is "
      +"— Mount Apo over Davao the way Fuji stands over Tokyo, the sea stacks at Raouché, the cable cars over the hillside at "
      +"Medellín. A made-up one would be the one thing on the card that was a lie, and a player who knows the city would catch it "
      +"inside the seconds it is up.")),
  S("live","Reading the report",
    p("A job does not resolve into a number. It plays out: a clock in the top left, a line at a time, with the crew named and what each of them is doing named with them. "
      +"You can run it at five speeds, hold it where it is with Pause, or press through it as fast as you can read.")),
  S("map","The map",
    p("Beside the report is the world, drawn in ink — the country the job is in, with the sites of the job on it and your people standing at them, as faces, with a small symbol for what they are doing.")
    +p("The plan has five positions, and which one somebody stands at follows from their trade:")
    +G.sites()
    +p("A recruitment trip gets the same treatment, with four positions instead: landing, the city, the table, and the deal.")),
  S("twist","The twist",
    p("Most jobs go wrong in the middle. The report stops, states the problem, and offers up to six ways out — each one with the odds on it and a requirement written into it. "
      +"One of them is always something your crew can actually do.")
    +p("The options are gated on what you brought: a trade, an attribute above a threshold, the language, or a long enough record. "
      +"Choosing the option that fits your crew is worth a great deal; choosing the impressive one you cannot back up is how a good job becomes a blown one.")
    +note("A twist you walk away from mid-decision is not lost. Close the game in the middle of it and it resumes exactly there — the report so far, then the options.")),
  S("twicewrong","When it keeps going wrong",
    p("<b>A job paying over "+money(D.BIG_MONEY)+" does not go wrong once.</b> It goes wrong again, and each time it is a different thing — never the same one twice.")
    +p("<b>You are not told how many are coming.</b> Nobody in that room would know, and a number would turn the night into a list you can see the end of. "
      +"Answer the one in front of you, and find out whether the night has finished with you.")
    +p("Which is the decision. <b>They will not want the same person twice</b>: the wheelman who hot-wires the second car is no use when the manifest is wrong an hour later, "
      +"and the forger who re-papers it cannot drive. So a big payday is the job that asks whether the crew is <i>broad</i> rather than whether it is good — "
      +"and the room has to last. That is the reason the money is there.")
    +ul([
      "<b>Every call counts.</b> What each one does to the night adds up, and each appears on the ranking afterwards.",
      "<b>What they cost of the take compounds</b> rather than adding: two calls that each lose half of it leave a quarter, not nothing.",
      "<b>The job file warns you before you take it</b> — a long night — and says why it matters for who you bring.",
      "<b>Between them the night carries on</b> — what your call turned out to be, a beat, and then the next thing. Close the game in the middle of one and it comes back exactly there, with whatever you have already answered on the page.",
    ])
    +note("Under "+money(D.BIG_MONEY)+" nothing has changed: most jobs go wrong once or not at all.")),
  S("wrong","WHAT WENT WRONG",
    p("When a job ends botched or blown, the report adds a section that reads back the actual reckoning and says, in order of how much it cost, what beat you — "
      +"and for each of those, what would have fixed it. Not advice in general: the trade that was wanted and missing, the language nobody spoke, the domain nobody knew, "
      +"the bodies you were short, the weeks you did not spend watching it, the heat you carried in.")),
]);

/* ---------------- 11 -------------------------------- */
ch("money","Money","Where it goes",[
  S("split","The split",
    p("The fee is not yours. Everybody who goes takes their percentage off the top and you keep the rest. The job file shows the whole thing before you commit:")
    +ul([
      "Every person who is going, with their percentage and what that is in money.",
      "What the crew takes altogether, and what is left for you.",
      "<b>The wages</b> — the weekly payroll and every retainer, multiplied by the weeks the job holds the crew.",
      "<b>What you should expect to keep</b>: every verdict's takings weighted by its own odds, with the crew's percentage off each, minus the wages. "
        +"A botched job pays nothing but still costs its share of the odds — which is the whole reason benching for a bigger share can leave you with less.",
    ])),
  S("arrange","Standing arrangements",
    p("A balance that only climbs is a balance doing nothing. These are charged every week out of the same payroll as the crew, and if you miss it they stop answering.")
    +G.retainers()
    +p("The safe house is bought outright, once each, in order:")
    +G.houses()),
  S("desk","A desk that forgets",
    p("From heat 20 upwards a file can be lost. It costs what the heat is worth — about "+money(3000)+" a point — and buys "+m("−20")+" heat and "+m("−12")+" off the detective's file.")),
]);

/* ---------------- 12 -------------------------------- */
ch("heat","Heat and the law","Being looked for",[
  S("heatwhat","Heat",
    p("A number from 0 to 120 measuring how hard the world is looking at you. Jobs add it. It falls "+m("5")+" a week by itself, "+m("7")+", "+m("9")+" or "+m("11")+" with a safe house.")
    +p("Heat costs you "+m("−0.24")+" on every job, per point — at heat 80 every job is "+m("−19")+" before anybody has done anything. It is not a punishment meter; it is a difficulty dial that you turn yourself.")
    +p("<b>Laying low</b> spends a week for "+m("−15")+" heat and "+m("−6")+" off the detective's file, and costs one point of ranking. A name unused is a name forgotten.")),
  S("det","The detective",
    p("Once your heat has been up, or your name is big enough, somebody opens a file on your alias. They have a name, and the Dashboard tells you how thick the file is.")
    +ul([
      "It thickens by roughly "+m("heat ÷ 22")+" a week, and faster above heat 70.",
      "Below heat 25 it <b>thins</b> by "+m("0.9")+" a week. A quiet month is a cold case.",
      "At "+m("50")+" they can brief a squad. At "+m("75")+" they can do it faster.",
      "Paying a desk, laying low, and a raid itself all thin it.",
    ])),
  S("raid","The raid",
    p("A raid comes when heat reaches "+m("100")+" — or "+m("90")+" once the file is at 50, or "+m("80")+" once it is at 75. "
      +"It takes one or two of your crew into a cell, takes "+m("30%")+" of your float — "+m("15%")+" with the best safe house — and drops your heat to "+m("58")+".")
    +note("A thick file does not raid you. It brings the raid <i>forward</i>. Those are different problems and they have different answers: heat is bought down with a bribe or a quiet week, a file is bought down with a bribe or time.")),
]);

/* ---------------- 13 -------------------------------- */
ch("rival","The competition","Somebody else is working the board",[
  S("name","Your crew's name",
    p("The competition has a name from the day it appears; yours is asked for from <b>week 4</b>. Type one, or take one off the shelf with <b>↻ Random</b> — a list in the game's voice, plus names built from your file: your surname the way the rival's outfit is built, a city the crew has worked, your first name. "
      +"<b>Later</b> puts the question off three weeks. The Crew tab's <b>✎ Rename</b> opens the same card whenever you like; the log keeps what it was.")
    +p("The name heads the Crew tab, sits on the Dashboard beside your alias, on the job reports and on the saved-game line, and is what the rival's standing is measured against. It goes on nothing the police can read.")),
  S("rivalwho","The other outfit",
    p("Once you reach ranking 20, somebody else appears on the same board with their own boss, their own name and their own standing. They are not an event — they are a second player.")
    +ul([
      "Most weeks they take a posting off the board, and it is the <b>best one left</b>.",
      "Every posting they take raises their standing.",
      "When their standing is ahead of yours they take more often, and they start buying your crew drinks.",
    ])
    +p("<b>And past a ranking of "+m(D.RIVAL?D.RIVAL.secondRep:120)+", there can be two of them.</b> One rival is a duel, and the "
      +"whole first act is meant to be one — you learn what a rival is by having exactly one. A second arrives only when the "
      +"name is big enough to be worth two people's trouble, and then the board is eaten from both ends: each of them rolls "
      +"for the best posting left, one after the other, most weeks.")
    +p("They are separate people with separate chapters. Each has its own card on the Dashboard, its own standing, its own "
      +"price to buy out, its own yard on the board, and its own run of weeks you have held clear of them. You finish them "
      +"<b>one at a time</b>, and finishing one does nothing at all to the other.")),
  S("poach","Being poached",
    p("While another crew is buying drinks, your least loyal member who is not paid up has a real chance of walking every week. Loyalty below 60 is the danger zone. "
      +"A bonus makes somebody deaf to it for "+m(D.PAID_WEEKS)+" weeks — which is the cheapest counter in the game.")),
  S("hit","Leaning on them",
    p("Two ways to take points off a rival without finishing them. Neither ends anything — their standing climbs back — but a few points at the right moment is the difference between taking the best posting and watching it go.")
    +ul([
      "<b>Buy a name inside</b> — costs at least "+money(40000)+", or their standing × "+money(3000)+", and takes 8 to 14 points off them. No heat.",
      "<b>Send the enforcer</b> — free, needs an Enforcer on the books. 65% it takes 12 to 20 points off them for "+m("+6")+" heat. 35% it goes loud in a street with windows: "+m("+16")+" heat and they are not frightened.",
    ])),
  S("finish","Finishing them",
    p("A rival is a <b>chapter</b>, not a permanent tax. There are four ways to close one, and each of them costs something different — which is the whole of the choice.")
    +ul([
      "<b>Buy them out</b> — at least "+money(250000)+", or their standing × "+money(9000)+". Clean: no heat, no night, no risk. Two or three of their people come looking for work and arrive on your roster already vetted, which is how you meet somebody else's Forger.",
      "<b>Take the board</b> — hold a standing <b>15 clear</b> of theirs for <b>6 straight weeks</b> and the clients stop calling them. Free, slow, and the only one that is pure skill. Let them close the gap and the run goes back to nothing.",
      "<b>Give them to the law</b> — costs no money and no heat, and finishes them at once. It also puts you in a room with the detective: <b>34 points</b> onto the file on <i>your</i> alias, and the file is what decides how early the raid comes. The price is real and it arrives later.",
      "<b>Take them apart</b> — a posting on the board like any other, against their yard. Your crew, a night that can go wrong, and somebody can get hurt. Run it well and there is no competition. Run it badly and they know exactly whose people those were: their standing climbs, and the yard is watched for weeks.",
    ])
    +note("Every one of these names the outfit it closes, and with two on the board that matters: the buttons are on that "
      +"outfit's card, the yard on the board says whose it is, and the six weeks clear are counted against that one's "
      +"standing alone. Beating one does not end the competition — somebody else works the board within six to twelve "
      +"weeks, and they start from where the last one got to, so the fourth is a problem where the first was an irritation.")),
]);

/* ---------------- 14 -------------------------------- */
ch("between","Between jobs","The week that passes on its own",[
  S("tick","What a week does",
    ol([
      "The payroll is charged — every member's upkeep and every retainer.",
      "Moles leak "+m("+3")+" heat each.",
      "Loyalty drifts by whatever your ranking is worth.",
      "Another crew's drinks may take somebody.",
      "The injured come back and the held walk out, if their week has come.",
      "Heat falls. Local heat falls by "+m(D.BAL.countryHeatDecay)+" everywhere.",
      "Weeks without a job accumulate; "+m(D.BAL.idleEvery)+" of them costs a point of ranking.",
      "The rival takes a posting. The detective writes.",
      "Loose ends, grudges and revenge tick over.",
      "A raid, if the heat has reached the number.",
      "Every "+m("3 to 7")+" weeks, something that is not a job.",
    ])),
  S("paper","The week's paper",
    p("Every week opens with the paper: three to five headlines from around the world, drawn off the save and the week, so the same week always prints the same page. "
      +"Most of it is colour — an election called, a port fogged in, a cup final. In some weeks one or two headlines reach the board, and the paper says so with "
      +m("On the board")+" under the story: dockers on strike shut a port and put a quarter on the fee for smuggling there; a summit makes every job in the country harder and hotter; "
      +"a bank holiday makes the vaults easier; a controllers' strike grounds everything by air for the week. A posting the paper touches carries "+m("In the news")+" on the board "
      +"and says what changed on its file; a posting the paper shut cannot be run until next week. Next week's paper undoes this week's. The button in the top bar opens the paper again.")),
  S("events","Things that are not jobs",
    p("Eight kinds, each with several ways out, each with its odds written on it.")
    +G.events()
    +note("When somebody threatens to walk, their whole file opens underneath the question — attributes, trade, experience, loyalty, what they have been through — "
      +"so the decision is made about a person rather than a name. One of the options is to let them go and settle it in forty-eight hours.")
    +p("<b>An old face is always one of yours, and the screen opens with how they actually left</b> — walked out over the money, asked to be let out, cut loose, "
      +"gone to another crew, or away with a cut of a score. It is written on their file the week it happens, so a blackmail cannot describe a resignation as a robbery.")
    +p("<b>Which is how a death can come back.</b> "+m(Math.round(D.FAKED_DEATH*100)+"%")+" of the deaths on that coast were arranged by the person who died, and the week they turn up "
      +"asking for money is the week you find out — the boat, the storm and the phone that rang out were theirs, and if you paid for the funeral and the family, that money went with them. "
      +"The other "+m((100-Math.round(D.FAKED_DEATH*100))+"%")+" really did drown. They are off the roster for good, and no blackmail is ever drawn on them.")),
  S("loose","Loose ends",
    p("Anybody who leaves the books alive knows things. The game will not let you ignore it — the question is put to you, once, per person, with the odds.")
    +G.T(["How they left","Chance they talk, before adjustments"],
      Object.keys(D.LOOSE_WHY).map(k=>['<b>'+D.LOOSE_WHY[k].l.replace(/^\w/,c=>c.toUpperCase())+'</b>',m(Math.round(D.LOOSE_WHY[k].risk*100)+"%")]))
    +p("That figure is then raised by what they know, a long record, greed, and being an informant — a mole adds "+m("20 points")+" — and lowered by their loyalty. "
      +"A Ghost is less likely to talk; a Hothead more.")
    +p("The ways of dealing with it run from doing nothing to a contract, and every one of them names its own price, its own odds and what it costs you with the crew. "
      +"The quiet answers need a specific trade on the books: a Cleaner, an Enforcer, or a Fixer. Without them, the list is much shorter and much worse.")),
  S("grudge","Grudges and revenge",
    p("Blow a client's job and there is a real chance they take it personally — "+m(Math.round(D.GRUDGE.pDisaster*100)+"%")+" on a disaster, "
      +m(Math.round(D.GRUDGE.pBotched*100)+"%")+" on a botch, "+m(Math.round(D.GRUDGE.pMessy*100)+"%")+" on a messy night.")
    +ul([
      "They stop posting to you, for "+m(D.GRUDGE.banWeeks[0]+" to "+D.GRUDGE.banWeeks[1])+" weeks.",
      "They may take one or two of their friends with them — other clients who stop posting too.",
      "And "+m(Math.round(D.GRUDGE.pBlood*100)+"%")+" of the time they do not merely stop. Something arrives, "+m(D.GRUDGE.revengeIn[0]+" to "+D.GRUDGE.revengeIn[1])+" weeks later.",
    ])
    +p("<b>The board says who, and why.</b> A notice above the postings names every client who will not deal with you, "
      +"and against each one: the job it was about, the city, the week, and which way the night went — or, for a client "
      +"you have never worked for, which of the others had a word with them. Click the notice and the whole account opens: "
      +"what they paid, what they lost, how many weeks are left, and whether this is one of the ones that is not finished with you.")
    +note("A ban cannot be bought off. The one exception is a client who comes for you: paying back what they lost, in cash, "
      +"on the spot, is one of the answers on that screen, and it ends the grudge there and then. Everything else is time.")),
]);

/* ---------------- 15 -------------------------------- */
ch("rank","Ranking","The name, and what it buys",[
  S("card","Crossing a rung",
    p("The ladder is the biggest thing that happens to you, so it is announced like one: a card in the middle of the screen naming the rung you have left, "
      +"the rung you are on, what it buys and what is next. It comes the other way too — a name that slips tells you what it has cost.")
    +note("It is watched in one place rather than at each of the six things that move a ranking, so a rung crossed by a career mark's payout or by a week "
      +"of nobody hearing your name lands the same way as one crossed by a job.")),
  S("ladder","The ladder",
    p("Eight names across "+m(D.BAL.finalRep)+" points. The last two rungs are most of the game.")
    +G.ranks()),
  S("moves","What moves it",
    ul([
      "Clean and successful work raises it — damped by how far beneath your name the job was.",
      "Messy work, leaks, arrests and walkouts lower it.",
      m(D.BAL.idleEvery)+" weeks without a job costs a point, and so does every week laid low.",
    ])
    +note("Ranking is the thing the whole game is about, and it cuts both ways: it is the only way to open tier-4 work, get Legends to sign and reach the last score — "
      +"and it makes every room harder, every police force more interested, and every posting on the board a fight. That is not a flaw in the design. That is the design.")),
]);

/* ---------------- 16 -------------------------------- */
ch("record","The record","What you have done",[
  S("career","Your career",
    p("One sheet for how far you have come, from <b>Your career</b> in the Dashboard's operation panel. The name and what it buys, with the whole ladder "
      +"beside it — the rungs behind you, the one you are on, and what is left above. Then weeks, jobs, countries, the biggest single score, everything "
      +"earned, the longest run without a failure, and a bar of every verdict you have ever been given in proportion.")
    +p("Under that, what it has cost: the heat, how thick the detective's folder is and since when, and how many of the countries you have worked are "
      +"still watching for you. Then every career mark earned. Nothing on it is stored twice — every figure is read off the record.")),
  S("known","Where you are known",
    p("The same world as the board's map, read the other way round. The board answers <i>where is there work</i>; this answers <i>where have I been, and "
      +"where can I not go back to</i>. A ring on every country you have worked, growing with the work, and a broken red ring on the ones still watching "
      +"for you — a job there runs hotter until that cools, about "+m(D.BAL.countryHeatDecay)+" a week.")
    +note("It is not territory. A crew of five is not a cartel and this game is about crossing borders rather than holding them, so nothing here is owned. "
      +"What a country remembers of you is the whole of it.")),
  S("stats","The count",
    p("Every job, every verdict, every country, everything earned and everything paid out in cuts, the biggest single score, people hurt, taken and lost, "
      +"and how often a twist was called right. All of it under <b>The record</b> on the Dashboard.")),
  S("marks","The marks",
    p("Eighteen of them. They are not achievements — each one pays, in ranking or in money or both, and the Dashboard keeps the next few in front of you.")
    +G.goals()),
]);

/* ---------------- 17 -------------------------------- */
ch("final","The last score","Three operations against the Committee",[
  S("gate","Getting there",
    p("It does not appear until the <a href=\"#goal\">four conditions</a> are all true. The Dashboard ticks them off as they arrive. "
      +"Each stage is tier 5, holds the crew for "+m(D.BAL.finalWeeks)+" weeks, and may be cased up to four times.")),
  S("stages","The three",
    G.T(["Stage","Where","Wants","Pays"],[
      ["<b>Read the room where the names are kept</b>","Zug, Switzerland","Hacker, Infiltrator, Forger · Finance, Politics · 4 people","$1.8M"],
      ["<b>Open the floor below the floor</b>","Zürich, four floors below the street","Safecracker, Demolitions, Overwatch · Finance, Weapons · 5 people","$4.2M"],
      ["<b>Everything, and out</b>","Zürich, then everywhere","Smuggler, Wheelman, Cleaner · Logistics, Maritime · 4 people","$8M"],
    ])
    +p("They are run in order. A stage that fails is not the end — the Committee moves things, and that door is worth trying again after some weeks, which the Dashboard names.")
    +note("Read what each stage wants and build for it before the first one opens. A crew assembled for tier-4 vault work is not a crew that can smuggle everything out of a country whose every border is a question with your face on it.")),
]);

/* ---------------- 18 -------------------------------- */
ch("controls","Controls and the file cabinet","Keys, saving, settings",[
  S("till","Paying for it",
    p("The game is free to a point and then <b>$12, once, for life</b>. The free run is <b>twelve weeks of play in this browser, or a Known name</b>, whichever comes first — counted across every game the browser opens, so a new dossier is not a new run. When it is up the game stops on a card that does not close: the crew, the float and the file stay saved where they stand, and pick up the moment the door is paid for.")
    +p("The button on the card opens the checkout in a new tab. The key is on the receipt and in the email; paste it in the box, press <b>Unlock</b>, and the game goes on. The key opens the game on any machine — <b>Have a key?</b> on the title screen is where it goes in on another one — and every build after this one. Esc opens the office over the wall, with the door out in it.")),
  S("keys","The keys",
    G.T(["Key","What it does"],[
      [m("Esc"),"The office — pause and settings. Also closes whatever is open."],
      [m("≡")+" top right","The same."],
      [m("1")+" "+m("2")+" "+m("3")+" "+m("4"),"Crew, Jobs, Roster, Dashboard. Each tab wears its key, so none of this has to be found out."],
      [m("5")+" or "+m("Q"),"The <a href=\"#qrh\">Quick Reference Handbook</a> — this chapter on one card."],
      [m("Enter")+" / "+m("Space"),"Open the posting you have selected."],
      [m("i"),"Explain whatever is on screen, and run the tutorial again."],
    ])),
  S("qrh","The Quick Reference Handbook",
    p("<b>QRH</b> on the tab bar, or "+m("5")+", or "+m("Q")+" from anywhere. It puts <a href=\"#people\">chapter 4</a> — everything a crew member's file is made of — on a single card: "
      +"the five attributes, the sixteen trades and the fourteen specialists with what each leans on, experience and who will sign, knowledge, schooling, "
      +"temperament, limits, passports, languages, what people cost, and loyalty.")
    +p("<b>It opens over whatever you are looking at</b>, a twist waiting for an answer included — which is the moment it is for, because that is when you need to know "
      +"which of your people can actually do the thing in front of you. Closing it gives the screen back untouched.")
    +note("Every figure on it is read off the game's own constants rather than written out a second time. A quick reference typed by hand is wrong within a few builds, "
      +"and wrong at speed is worse than absent.")),
  S("save","Saving",
    p("Automatic, in this browser, after everything. Settings are kept separately and survive a new game.")
    +p("The office's <b>file cabinet</b> is a drawer rather than a single slot. Put the game you are on into it under any name you like and it stays "
      +"until you take it out, so more than one campaign can be running at once. Alongside those it keeps a <b>carbon</b> of each of the last six weeks, "
      +"taken without being asked — the point being that one is there on the week you wish you had saved, which is never the week you would have. "
      +"Every line says whose game it is, the week, the ranking, the money and how long ago, so you are choosing between games rather than between dates. "
      +"Opening one files a carbon of where you were first, so the one move in the drawer that could lose a game does not.")
    +p("The drawer is still this browser. Clear its data, play on another machine, or lose the laptop and the whole drawer goes with it. "
      +"For that there is the <b>code</b>: the same cabinet writes the whole game out as one long line of text you can keep anywhere and read back in, "
      +"here or on any other browser, on any computer. It is the only copy that outlives this one, and it is worth taking after a night you would hate to repeat. "
      +"Reading a code in tells you whose file it is, which week and which ranking, <i>before</i> it replaces what is in the browser.")),
  S("settings","Settings",
    p("Sound, music, brightness and report speed, all in the office. The report speed runs from "+m("Slowest")+" to "+m("Fastest")+" — "
      +"five settings, because reading a job as it happens and pressing through one you already understand are different things.")),
]);

/* ---------------- 19 -------------------------------- */
const KNOWING=[
      "<b>Read the category before the fee.</b> The twelve kinds of job lean on different attributes. A crew of muscle is ordinary at anything the client wants talked through.",
      "<b>Being short is worse than being weak.</b> "+m("−22")+" a body dwarfs everything else in the factor list. A job you cannot field is a job to skip, whatever it pays.",
      "<b>Hire a Forger early.</b> Not for the "+m("+14")+" — for the borders. One Forger turns a crew of six passports into a crew that can work anywhere.",
      "<b>Limits are permanent.</b> Check them before you sign, not the first time a posting is tagged underground and four of your people stay in the car.",
      "<b>Vet the cheap ones.</b> "+money(D.VET_COST)+" against a mole who leaks heat every week and is very likely to talk on the way out is not a close call.",
      "<b>Somebody sharp makes vetting work.</b> With nobody above 55 Brains in the field, a third of moles come back clean.",
      "<b>Bonuses are the cheapest defence you have.</b> "+m(D.PAID_WEEKS)+" weeks of "+m("+2")+" on every job, deafness to other crews, and immunity from being the one trouble picks on.",
      "<b>Watch the small cuts.</b> Three jobs in a row where somebody's percentage is worth less than a week of their wages and they start grumbling; five and they walk.",
      "<b>Case the big ones.</b> "+m("+"+D.BAL.caseGain)+" a week for "+Math.round(D.BAL.caseCostPct*100)+"% of the fee is the best rate in the game — but the posting can be gone when you look up.",
      "<b>Do not work the same country twice running.</b> "+m("+"+D.BAL.countryHeatPerJob)+" local heat a job, falling "+m(D.BAL.countryHeatDecay)+" a week, and every point of it is difficulty.",
      "<b>Heat is a difficulty dial, not a punishment.</b> At 80 every job is "+m("−19")+". Buy it down before a big one, not after a raid.",
      "<b>A thick file does not raid you — it moves the raid closer.</b> Heat and the file are two numbers with two different answers.",
      "<b>Benching saves the cut and not the wages.</b> The whole payroll is charged for every week the job runs, benched or not.",
      "<b>The expected-keep figure is the honest one.</b> It weights every verdict by its own odds and subtracts the wages. A bigger share of a job you will probably botch is less money.",
      "<b>Take the twist option your crew can actually back up.</b> Every option states what it needs. The impressive one you cannot back is how a good job becomes a blown one.",
      "<b>Read WHAT WENT WRONG.</b> It is not flavour — it names the factor that cost you the most and what would have fixed it.",
      "<b>Keep pairs together.</b> A pair gains a point for every job that comes off with both of them on it. A long-running crew is worth real numbers.",
      "<b>Bad blood is the same mechanism in reverse.</b> Hover it and the game tells you which nights caused it.",
      "<b>Your ranking makes the world harder.</b> "+m("+"+D.BAL.repPressure)+" difficulty per 100. A crew that stops improving is sliding.",
      "<b>Quick money is for the gap, not for a living.</b> One a week, a few thousand at most — and send the person the work actually leans on, because a bad fit is not merely likelier to fail, it is likelier to cost you them.",
      "<b>Start building for the last score before it opens.</b> It wants Hacker, Infiltrator, Forger, Safecracker, Demolitions, Overwatch, Smuggler, Wheelman and Cleaner across three operations — and "+money(D.BAL.finalMoney)+" of your own money.",
];
// The title counts the list rather than remembering a number: it said "twenty" with twenty-two
// in it, which is what a hand-kept count beside a list always ends up saying.
const WORDS=["","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve",
  "thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen","twenty"];
const spell=n=>n<=20?WORDS[n]:n<30?"twenty-"+WORDS[n-20]:n<40?"thirty-"+WORDS[n-30]:String(n);
const cap1=x=>x.charAt(0).toUpperCase()+x.slice(1);
ch("knowing",cap1(spell(KNOWING.length))+" things worth knowing","Everything above, put to use",[
  S("twenty","",
    '<ol class="twenty">'+KNOWING.map(x=>'<li>'+x+'</li>').join("")+'</ol>'),
]);

/* ---------------- 20 -------------------------------- */
const GLOSS=[
  ["Bad blood","What a pair has lost by sharing botched nights. Costs the crew points on every job they are both on. Hover it in the job file to read which nights did it."],
  ["Bench","Keeping somebody off a job. Saves their cut. Does not save their wages."],
  ["Bond","The opposite of bad blood: what a pair has gained by finishing jobs together."],
  ["Casing","Spending a week and "+Math.round(D.BAL.caseCostPct*100)+"% of the fee watching a posting before taking it. Worth "+D.BAL.caseGain+" on the night, each week."],
  ["Command","Your own number, added to every job you go on. Starts at 5."],
  ["Cut","A crew member's percentage of a job's fee, taken off the top."],
  ["Difficulty","The number the crew has to beat. Built from the tier, your ranking, the local heat and the country."],
  ["Expected keep","What the job file says you should expect to walk away with, over many nights like this one: every verdict weighted by its own odds, minus the crew's cuts and the wages."],
  ["Fee (job)","What a client pays. Not what you keep."],
  ["Fee (member)","The one-off cost of getting somebody to sign."],
  ["Field","Everybody on the books who is fit and not in a cell."],
  ["File","The detective's file on your alias, 0 to 100. Thick files bring the raid forward."],
  ["Gate","How hard a country is to enter: open, needs a visa, or strict."],
  ["Grudge","A client who will not post to you any more, because you blew their job."],
  ["Heat","How hard the world is looking, 0 to 120. Subtracts from every job."],
  ["Local heat","The same thing, per country. Adds to the difficulty of jobs there."],
  ["Loose end","Somebody who left the books alive and knows things."],
  ["Margin","Your effective figure minus the job's difficulty. The number the odds are drawn from."],
  ["Mark","One of the eighteen things worth doing, on the Dashboard under The record. Each pays."],
  ["Mole","An informant on your books. About one file in fourteen. Leaks heat, and talks."],
  ["Paid up","Three weeks after a bonus. Worth +2, deaf to other crews, and not the one trouble picks on."],
  ["Payroll","Every crew member's upkeep plus every retainer, charged every week."],
  ["Places","Seats on the crew. Four soldiers and you to start, six and you at Respected."],
  ["Posting","A job on the board."],
  ["Power","The average of what everybody going is worth for this particular job."],
  ["Raid","The police coming. At heat 100, or sooner with a thick file."],
  ["Ranking","Your name, 0 to "+D.BAL.finalRep+". Decides everything."],
  ["Restless","Three jobs in a row whose cut was worth less than a week of their wages."],
  ["Retainer","A lawyer, a doctor or a fixer on the books at a weekly cost."],
  ["Roll","The "+m("±"+D.BAL.roll)+" the night adds to the margin."],
  ["Snag","The thing that goes wrong during a recruitment trip."],
  ["Split","Who takes what out of the fee."],
  ["Quick money","The box under the postings, <b>Quick Money - High Risk</b>: <a href=\"#street\">one person and no crew</a>. One a week, a few thousand at most, and a real chance of losing them."],
  ["Standing","Where you stand with somebody: loyalty plus the nights you have been through together. Not the same number as loyalty, and the one that decides whether they take what you ask — see <a href=\"#learn\">a new craft</a>."],
  ["Tier","How big a posting is, 1 to 4 on the open board and 5 for an <a href=\"#ops\">operation</a>. Decides the fee, the weeks, the people needed and how long you may case it."],
  ["Trade","What somebody is — one of sixteen ordinary trades, or one of the fourteen <a href=\"#bigtechs\">specialists</a>. Worth +14 when the client asked for it."],
  ["Twist","The thing that goes wrong during a job, and the options it offers."],
  ["Upkeep","A crew member's weekly wages. Paid whether they work or not."],
  ["Vetting","Paying "+money(D.VET_COST)+" to find out whether a file is an informant."],
  ["Verdict","Clean, Success, Messy, Botched or Disaster."],
];
ch("gloss","Glossary","Every term, A to Z",[
  S("terms","",
    '<dl class="gloss">'+GLOSS.slice().sort((a,b)=>a[0].localeCompare(b[0]))
      .map(g=>'<div class="gl"><dt>'+g[0]+'</dt><dd>'+g[1]+'</dd></div>').join("")+'</dl>'),
]);

module.exports={CH};

/* THE ESTABLISHING SHOT.

   Paz: "Can you create a very basic black over white outline silhouette for each city and
   display it for 3 seconds just before the live job feed starts?"

   Two things to prove, and they are different kinds of thing.

   The DRAWING: one hundred and twenty-nine of them, generated, so the failure mode is not
   "ugly" — it is "the same picture 129 times", or "a picture that changes every time you look
   at it", or "a shape that means something nobody intended". The first sheet of all 129 put a
   Christian cross on New York, Rome and St Petersburg; the second, trying to fix it, put a
   patriarchal cross on Riyadh and Jerusalem. So there is a check here for horizontal bars in
   the sky, and it is not a style note.

   The TIMING: however long ESTAB_MS says — three seconds when this was written, seven now —
   and the night must not start underneath it. */
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path");
const FILE=path.resolve(__dirname,process.argv[2]||GAME);
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  const errs=[];page.on("pageerror",e=>errs.push(String(e)));
  await page.goto("file://"+FILE);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Sasha Varga");
  await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  const drainOn=async pg=>{for(let i=0;i<40;i++){
    if(await pg.$('button[data-act="crewname-later"]'))await pg.click('button[data-act="crewname-later"]');
    else if(await pg.$('button[data-act="notice-close"].btn'))await pg.click('button[data-act="notice-close"].btn');
    else if(await pg.$('button[data-act="news-close"].btn'))await pg.click('button[data-act="news-close"].btn');
    else if(await pg.$('button[data-act="loose"]'))await pg.click('button[data-act="loose"][data-i="0"]');
    else if(await pg.$('button[data-act="clash"]'))await pg.click('button[data-act="clash"]');
    else if(await pg.$('button[data-act="clash-close"]'))await pg.click('button[data-act="clash-close"]');
    else if(await pg.$('.scrim button.x'))await pg.click('.scrim button.x');
    else if(await pg.$('.scrim .btn')){const b=await pg.$$('.scrim .btn');await b[b.length-1].click();}
    else break;await pg.waitForTimeout(60);}};
  const drain=()=>drainOn(page);
  await drain();
  await page.evaluate(()=>{
    S.money=5e7;
    for(let i=0;i<80&&recruits().length<crewSeats();i++){
      const c=S.roster.find(x=>x.status==="available"&&!x._u);if(!c)break;c._u=true;c.status="crew";S.crewIds.push(c.id);}
    render();
  });
  await drain();

  console.log("— one drawing per city, and the same one every time —");
  const all=await page.evaluate(()=>{
    const out=[];
    COUNTRIES.forEach(co=>co.cities.forEach(c=>out.push({city:c,country:co.name,svg:citySkyline(c,co.name)})));
    return out;
  });
  check(all.length===129,"all "+all.length+" cities draw");
  const seen={},dupes=[];
  all.forEach(d=>{if(seen[d.svg])dupes.push(d.city+" = "+seen[d.svg]);else seen[d.svg]=d.city;});
  check(!dupes.length,"and no two are the same picture"+(dupes.length?" ("+dupes.slice(0,3).join(", ")+")":""));
  const stable=await page.evaluate(()=>{
    // Called twice, and after a reload of the module's own RNG state: a drawing that moves
    // between two looks at the same city is not a place, it is noise.
    const a=citySkyline("Cairo","Egypt");
    for(let i=0;i<50;i++)freshRng()();          // churn the game's stream
    const b=citySkyline("Cairo","Egypt");
    return a===b;
  });
  check(stable,"Cairo is the same Cairo on the second look, whatever else has drawn since");
  const seamed=await page.evaluate(()=>{
    // The rival's yard comes through as "Cairo, and a yard they think nobody knows about".
    return {same:citySkyline("Cairo, and a yard they think nobody knows about","Egypt")===citySkyline("Cairo","Egypt"),
      name:cityName("Cairo, and a yard they think nobody knows about"),
      commas:COUNTRIES.some(co=>co.cities.some(c=>c.indexOf(",")>=0))};
  });
  check(seamed.same&&seamed.name==="Cairo",
    "the rival's yard draws its own city, not a sentence: \""+seamed.name+"\"");
  check(!seamed.commas,"and no real city name has a comma in it, so the seam is safe");

  console.log("\n— nothing in the sky is a cross —");
  /* The one assertion in this file that is about meaning rather than mechanics. A thin vertical
     with a horizontal bar across it reads as a crucifix at this size, and this generator deals
     its shapes out to cities all over the world. So: no wide-flat rectangle may sit high in the
     sky. Water rules are below the ground line; a crane's boom is 42 wide with legs under it
     and is excluded by width, not by hope.

     Direct children of .sky-near only, which is the GENERATED city. The landmarks hanging below
     it in .sky-lm are hand-drawn, named, and each is the specific building the specific city is
     known for — the Elizabeth Tower's clock stage and the Fernsehturm's collar are horizontal
     because those buildings are, and they are not dealt out to anybody at random. They are also
     drawn in a flipped box where +y is UP, so reading their y against SKY_GY compares two
     different worlds and calls the Statue of Liberty's plinth a crossbar. */
  const bars=await page.evaluate(()=>{
    const out=[];
    const box=document.createElement("div");document.body.appendChild(box);
    COUNTRIES.forEach(co=>co.cities.forEach(c=>{
      box.innerHTML=citySkyline(c,co.name);
      box.querySelectorAll(".sky-near>rect").forEach(r=>{
        const w=+r.getAttribute("width"),h=+r.getAttribute("height"),y=+r.getAttribute("y");
        // wide, flat, and up in the air: that is a crossbar and nothing else
        if(h<=2.5&&w>=3&&w<=20&&y<SKY_GY-6)out.push(c+" w"+w+" h"+h+" y"+y);
      });
    }));
    box.remove();
    return out;
  });
  check(bars.length===0,"no horizontal bar anywhere in the sky over any of the 129"
    +(bars.length?" — found "+bars.length+", e.g. "+bars.slice(0,3).join(" · "):""));

  console.log("\n— the terrain is in the drawing —");
  const reads=await page.evaluate(()=>{
    const box=document.createElement("div");document.body.appendChild(box);
    // Water is a rule in the pure-stroke layer, not a filled shape: a short horizontal path
    // whose whole length lies under the ground line.
    const rules=()=>[...box.querySelectorAll(".sky-line>path")].filter(p=>{
      const m=/^M([\d.-]+) ([\d.-]+) L([\d.-]+) ([\d.-]+)$/.exec(p.getAttribute("d"));
      return m&&+m[2]===+m[4]&&+m[2]>SKY_GY;}).length;
    const of_=(c,n)=>{box.innerHTML=citySkyline(c,n);
      return {far:box.querySelectorAll(".sky-far>*").length,
        near:box.querySelectorAll(".sky-near>*").length,
        water:rules()};};
    // a landlocked mountain country against a flat coastal one
    const r={mountain:of_("Zürich","Switzerland"),coast:of_("Rotterdam","Netherlands")};
    box.remove();return r;
  });
  check(reads.mountain.far>0,"a mountain city has a ridge behind it ("+reads.mountain.far+" outlined parts)");
  check(reads.coast.water>0,"a port city has water under it ("+reads.coast.water+" rules below the line)");

  console.log("\n— and the cities that have a landmark get the real one —");
  /* Paz: "But what about the specific landmarks of each city ... and more to distinct each city."
     Eighty-seven have one. The other forty-two do not, and that is the answer rather than the
     unfinished part of it — a made-up landmark is the one thing on the card that would be a lie.
     What is testable is: a table with nothing dead in it, a drawing that actually contains the
     landmark, a skyline that gets out of its way, and the blind saying what is there. */
  const LMs=await page.evaluate(()=>{
    const cities=[];COUNTRIES.forEach(co=>co.cities.forEach(c=>cities.push({c,co:co.name})));
    const box=document.createElement("div");document.body.appendChild(box);
    const named=[],missing=[],unnamed=[],noLift=[];
    cities.forEach(({c,co})=>{
      const lm=landmarkFor(c);if(!lm)return;
      named.push(c);
      box.innerHTML=citySkyline(c,co);
      const g=box.querySelector(".sky-lm");
      if(!g)missing.push(c);
      else if(!g.children.length)missing.push(c+" (empty)");
      // A name, not a label: something you could say out loud, and not just the city again.
      if(!lm.name||lm.name.length<5||lm.name===c)unnamed.push(c+": "+JSON.stringify(lm.name));
      const label=box.querySelector("svg").getAttribute("aria-label")||"";
      if(label.indexOf(lm.name)<0)noLift.push(c);
    });
    // the table must not name a city the game does not have
    const orphans=Object.keys(LANDMARKS).filter(k=>!cities.some(x=>x.c===k));
    // and the same drawing must not be handed to two cities
    const dup=[],seen={};
    Object.keys(LANDMARKS).forEach(k=>{const d=LANDMARKS[k].d;if(seen[d])dup.push(k+" = "+seen[d]);else seen[d]=k;});
    box.remove();
    return {n:named.length,total:cities.length,missing,unnamed,noLift,orphans,dup};
  });
  check(LMs.n>=80,LMs.n+" of "+LMs.total+" cities have a landmark drawn by hand");
  check(!LMs.orphans.length,"and the table names no city the game does not have"
    +(LMs.orphans.length?" ("+LMs.orphans.join(", ")+")":""));
  check(!LMs.dup.length,"and no two cities are handed the same drawing"
    +(LMs.dup.length?" ("+LMs.dup.slice(0,3).join(", ")+")":""));
  check(!LMs.missing.length,"every one of them actually draws it"
    +(LMs.missing.length?" — missing on "+LMs.missing.slice(0,4).join(", "):""));
  check(!LMs.unnamed.length,"and every one is named in words, for the blind and for me"
    +(LMs.unnamed.length?" ("+LMs.unnamed.slice(0,3).join(" · ")+")":""));
  check(!LMs.noLift.length,"and that name is on the picture itself"
    +(LMs.noLift.length?" — not on "+LMs.noLift.slice(0,3).join(", "):""));
  const lift=await page.evaluate(()=>{
    // A landmark city keeps its skyline down, so the thing you came to see is the tallest thing
    // on the card. Compare the same city with and without: the generated buildings must shrink.
    const box=document.createElement("div");document.body.appendChild(box);
    const topOf=svg=>{box.innerHTML=svg;let t=SKY_GY;
      box.querySelectorAll(".sky-near>rect,.sky-near>path").forEach(e=>{
        const b=e.getBBox?null:null;
        const y=e.tagName==="rect"?+e.getAttribute("y"):null;
        if(y!=null&&y<t)t=y;});
      return t;};
    const withLm=topOf(citySkyline("Paris","France"));
    const real=LANDMARKS["Paris"];delete LANDMARKS["Paris"];
    const without=topOf(citySkyline("Paris","France"));
    LANDMARKS["Paris"]=real;
    box.remove();
    return {withLm,without};
  });
  check(lift.withLm>lift.without,
    "a city with a landmark keeps its own skyline low ("+lift.withLm+" vs "+lift.without+", lower y is taller)");

  /* The hand-drawn landmarks are exempt from the generated layer's no-bar rule above, because
     each one is a specific named building and some genuinely have a horizontal member. Exempt is
     not the same as unwatched: the shape that went wrong twice in the generator can walk back in
     through a drawing. So the ones that put a bar across a thin vertical are listed by name, and
     a new one is a failure until somebody has looked at it and decided it reads as the building.

       Istanbul — the minarets' gallery rings. The shaft carries on above the ring and ends in a
                  cone; that is a minaret and nothing else.
       Medan    — the same ring, on the Great Mosque's two minarets. Same shape, same reason.
       Cebu     — Magellan's Cross, which is a cross, and is meant to be. It is the actual
                  named monument Cebu is known for — the one planted in 1521 — and it sits in
                  the same category as Jerusalem's Dome of the Rock, Moscow's St Basil's and the
                  two Christs over Rio and Lisbon: the specific thing that is specifically there.
                  Which is exactly the distinction this check is drawn around. The masts were a
                  religious symbol dealt at RANDOM to cities with no connection to it; this is
                  one city's own monument, named on the card and named in the aria-label.

     Cebu and Medan arrived in somebody else's work, in the forty-two landmarks added between
     build 102 and 107, and this check is the reason anybody looked at them at all. Both were
     rendered and read before being written down here. That is the whole procedure: a new one is
     a failure until a person has looked, and then it is a line in this list saying who looked
     and why it stays.

     Lisbon's Cristo Rei was on this list and is not any more: its body was one unit wide under a
     twelve-unit bar, which is a crucifix on a pillar rather than a figure with its arms out. It
     is drawn the way Rio's is now — a body with width, and the head clear above the arms. */
  const ALLOWED=["Istanbul","Medan","Cebu"];
  const crossed=await page.evaluate(()=>{
    const hits={};
    const box=document.createElement("div");document.body.appendChild(box);
    Object.keys(LANDMARKS).forEach(city=>{
      box.innerHTML='<svg>'+LANDMARKS[city].d+'</svg>';
      const rs=[...box.querySelectorAll("rect")].map(r=>({x:+r.getAttribute("x"),y:+r.getAttribute("y"),
        w:+r.getAttribute("width"),h:+r.getAttribute("height")}));
      rs.filter(r=>r.w<=4&&r.h>=5).forEach(m=>rs.filter(r=>r.h<=3&&r.w>=4).forEach(b=>{
        if(b.y>m.y&&b.y<m.y+m.h&&b.x<m.x-0.4&&b.x+b.w>m.x+m.w+0.4)hits[city]=true;
      }));
    });
    box.remove();return Object.keys(hits);
  });
  const surprise=crossed.filter(c=>ALLOWED.indexOf(c)<0);
  check(!surprise.length,"no landmark has grown a bar across a thin vertical that nobody has looked at"
    +(surprise.length?" — "+surprise.join(", "):" (the "+crossed.length+" that do are the minaret galleries and Magellan's Cross, all looked at)"));

  console.log("\n— three seconds, and the night waits —");
  const t0=Date.now();
  await page.evaluate(()=>{
    const j=S.jobs.find(x=>!x.final&&assessJob(x,jobPool(x)).canRun)||S.jobs[0];
    S.tab="jobs";S.jobOpen=j.id;render();
  });
  await page.click('[data-act="execute"]');
  await page.waitForSelector(".estab",{timeout:4000});
  const up=await page.evaluate(()=>({
    city:document.querySelector(".estab-city").textContent.trim(),
    sky:!!document.querySelector(".estab .sky"),
    title:!!document.querySelector(".estab-title").textContent.trim(),
    ticker:!!document.querySelector("#ticker"),
    revealed:S.modal.data.revealed}));
  check(up.sky&&up.city,"the card is up, and it says where: "+up.city);
  check(!up.ticker,"the feed is not on the screen behind it");
  check(up.revealed===0,"and not one line of the night has run yet");
  await page.waitForSelector("#ticker",{timeout:8000});
  const dt=Date.now()-t0;
  /* Against the game's own ESTAB_MS, not a number typed in here. This was written when the card
     held for three seconds and asserted a 2.6–4.6s window; the card is seven seconds now, which
     was somebody's deliberate change, and a test that has to be edited every time a constant
     moves is a test that will one day be edited without being read. */
  const HELD=await page.evaluate(()=>ESTAB_MS);
  check(dt>=HELD-400&&dt<=HELD+1600,
    "it held for "+(dt/1000).toFixed(1)+"s, which is the "+(HELD/1000)+"s the game asks for, then the feed started");
  const after=await page.evaluate(()=>({estab:!!S.modal.data.estab,ticker:!!document.querySelector("#ticker")}));
  check(!after.estab&&after.ticker,"and the card is gone rather than hidden behind it");

  console.log("\n— and somebody who cannot see it is told what is on it —");
  /* role="button" stops a screen reader descending into the card, so anything not in the one
     aria-label is not read at all. Paris with the Eiffel Tower on it and "Paris" as the whole
     announcement is a card that says less to a blind player than the feed behind it would. */
  await page.evaluate(()=>{
    const j=S.jobs.find(x=>!x.final)||S.jobs[0];
    j.city="Paris";j.country="France";
    // tier and verdictName so that if the ticker ever does reach the end of this one-line
    // narrative it settles quietly instead of throwing inside verdictTrack(undefined).
    S.modal={type:"result",data:{id:"ARIA",week:9,job:j,crew:null,tier:3,verdictName:"Success",
      narrative:[{t:"01:00",x:"x"}],revealed:0,done:false,estab:true,teamIds:[],
      rk:[],growth:[],events:[],marks:{},awaiting:false,resolved:false}};
    render();});
  await page.waitForSelector(".estab");
  const A=await page.evaluate(()=>({said:document.querySelector(".estab").getAttribute("aria-label")||"",
    title:S.modal.data.job.title}));
  const said=A.said;
  check(/\bParis\b/.test(said),"it says the city");
  check(/\bFrance\b/.test(said),"and the country");
  check(/Eiffel Tower/.test(said),"and the landmark that is on it, by name");
  check(said.indexOf(A.title)>=0,"and what the job is called");
  check(/press to go on/i.test(said),"and how to leave: \""+said+"\"");

  console.log("\n— the paper around the card means go on, not skip the night —");
  /* A scrim click on a running feed means Skip. On the card it must not: a player aiming at a
     title card and missing should not have the whole night run past them for it. */
  const missed=await page.evaluate(()=>{
    const d=S.modal.data;
    document.querySelector(".scrim").dispatchEvent(new MouseEvent("click",{bubbles:true}));
    const out={estab:!!d.estab,revealed:d.revealed,done:!!d.done,still:!!(S.modal&&S.modal.type==="result")};
    // and put the made-up night away before its ticker runs off the end of one line
    S.modal=null;render();
    return out;});
  check(!missed.estab,"the card goes down");
  check(missed.still&&!missed.done&&missed.revealed===0,
    "and the night is still ahead of you, not behind ("+missed.revealed+" lines read, done="+missed.done+")");

  console.log("\n— and nobody has to wait for it twice —");
  await page.evaluate(()=>{S.modal=null;render();});
  await drain();
  const quick=await page.evaluate(()=>{
    const j=S.jobs.find(x=>!x.final&&assessJob(x,jobPool(x)).canRun)||S.jobs[0];
    S.tab="jobs";S.jobOpen=j.id;render();return j.id;
  });
  if(quick){
    await page.click('[data-act="execute"]');
    await page.waitForSelector(".estab",{timeout:4000});
    const t1=Date.now();
    await page.click(".estab");
    await page.waitForSelector("#ticker",{timeout:3000});
    check(Date.now()-t1<1200,"a click goes straight on ("+(Date.now()-t1)+"ms)");
  }

  console.log("\n— and somebody who asked for less motion is not left holding it —");
  /* estabArm runs FROM render, after the card is already on the screen. Under reduced motion it
     drops the flag and arms no timer, so the first version cleared the flag and drew nothing
     again: the card stayed up forever, for exactly the people who had asked for less. */
  const rm=await browser.newPage({viewport:{width:1280,height:1000},
    reducedMotion:"reduce"});
  const rerrs=[];rm.on("pageerror",e=>rerrs.push(String(e)));
  await rm.goto("file://"+FILE);
  await rm.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await rm.reload();
  await rm.click('[data-act="begin"]');await rm.fill("#pname","Sasha Varga");
  await rm.click('[data-act="confirm-create"]');
  await rm.waitForSelector(".topbar");
  if(await rm.$('[data-act="tut-skip"]'))await rm.click('[data-act="tut-skip"]');
  await drainOn(rm);
  await rm.evaluate(()=>{
    S.money=5e7;
    for(let i=0;i<80&&recruits().length<crewSeats();i++){
      const c=S.roster.find(x=>x.status==="available"&&!x._u);if(!c)break;c._u=true;c.status="crew";S.crewIds.push(c.id);}
    const j=S.jobs.find(x=>!x.final&&assessJob(x,jobPool(x)).canRun)||S.jobs[0];
    S.tab="jobs";S.jobOpen=j.id;render();});
  await drainOn(rm);
  await rm.click('[data-act="execute"]');
  let stuck=false;
  try{await rm.waitForSelector("#ticker",{timeout:2500});}catch(e){stuck=true;}
  const rmState=await rm.evaluate(()=>({estab:!!(S.modal&&S.modal.data&&S.modal.data.estab),
    card:!!document.querySelector(".estab"),ticker:!!document.querySelector("#ticker")}));
  check(!stuck&&!rmState.card&&!rmState.estab,
    "the card does not appear at all, and nothing is left holding the screen");
  check(rmState.ticker,"the report is there instead, straight away");
  check(rerrs.length===0,"no page errors under reduced motion"+(rerrs[0]?" ("+rerrs[0]+")":""));
  await rm.close();

  check(errs.length===0,"no page errors"+(errs[0]?" ("+errs[0]+")":""));
  await browser.close();
})();

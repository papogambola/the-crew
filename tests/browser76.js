/* THE ESTABLISHING SHOT.

   Paz: "Can you create a very basic black over white outline silhouette for each city and
   display it for 3 seconds just before the live job feed starts?"

   Two things to prove, and they are different kinds of thing.

   The DRAWING. These were GENERATED until build 130 — 168 lines that built a skyline out of the
   city's name and its country's terrain — and most of this file used to read that SVG from the
   inside: counting outlined ridges behind mountain cities, rules under ports, and horizontal bars
   in the sky, because the first generated sheet put a Christian cross on New York, Rome and
   St Petersburg and the second put a patriarchal cross on Riyadh and Jerusalem. None of that
   applies to a picture somebody drew. What replaces it is the question a drawn set actually raises:
   is there one for every city, does it load, is it the shape the card wants, and do two cities show
   two different pictures. The rest was a test of a generator that no longer exists.

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

  console.log("— one drawing per city, and it is that city's —");
  const all=await page.evaluate(()=>{
    const out=[];
    COUNTRIES.forEach(co=>co.cities.forEach(c=>out.push({
      city:c,country:co.name,name:skyName(c,co.name),has:skyHas(c,co.name),html:citySkyline(c,co.name)})));
    return out;
  });
  check(all.length===129,"the game has "+all.length+" cities");
  const noPic=all.filter(x=>!x.has);
  check(noPic.length===0,"every one of them has a skyline"
    +(noPic.length?" — except "+noPic.slice(0,5).map(x=>x.city).join(", "):""));

  // Two cities must not be handed the same picture. With a generator the risk was a seed collision;
  // with files it is a slug collision — two names that flatten to one — which is the same bug
  // wearing a different coat, and worth the same check.
  const byName={},dupes=[];
  all.forEach(x=>{ if(byName[x.name])dupes.push(x.name+": "+byName[x.name]+" and "+x.city); byName[x.name]=x.city; });
  check(dupes.length===0,"and no two cities are handed the same file"+(dupes.length?" — "+dupes.slice(0,3).join("; "):""));

  /* ACCENTS FOLD, THEY DO NOT DISAPPEAR. Zürich must be zurich and not z-rich; Kraków krakow;
     São Paulo sao-paulo. Getting this wrong made nine of the 129 look missing and nine more look
     unclaimed on the first pass — the same file failing to recognise itself from both ends. */
  const accented=all.filter(x=>/[^\x00-\x7f]/.test(x.city));
  check(accented.length>0,accented.length+" cities have an accent in the name");
  const badSlug=accented.filter(x=>!/^skyline-[a-z0-9-]+$/.test(x.name)||/--/.test(x.name));
  check(badSlug.length===0,"and each folds to a clean name"
    +(badSlug.length?" — "+badSlug.slice(0,4).map(x=>x.city+" -> "+x.name).join(", ")
      :": "+accented.slice(0,3).map(x=>x.city+" -> "+x.name.replace(/^skyline-[a-z-]*?-/,"")).join(", ")));

  // And the file behind the name actually loads, at the shape the card draws into.
  const loaded=await page.evaluate(async names=>{
    const out={ok:0,failed:[],odd:[]};
    for(const n of names){
      const r=await new Promise(done=>{const im=new Image();
        im.onload=()=>done({w:im.naturalWidth,h:im.naturalHeight});im.onerror=()=>done(null);
        im.src=SKY_BASE+n+".webp";});
      if(!r){out.failed.push(n);continue;}
      if(Math.abs(r.w/r.h-960/396)>0.02){out.odd.push(n+" "+r.w+"x"+r.h);continue;}
      out.ok++;
    }
    return out;
  },all.map(x=>x.name));
  check(loaded.failed.length===0,loaded.ok+" of "+all.length+" load"
    +(loaded.failed.length?" — "+loaded.failed.slice(0,4).join(", ")+" did not":""));
  check(loaded.odd.length===0,"and every one is 80:33, the shape the card draws into"
    +(loaded.odd.length?" — except "+loaded.odd.slice(0,4).join(", "):""));

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

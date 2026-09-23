// The game is a function of its seed and the order of your decisions, or it is not checkable.
//
// The roster was always rebuilt from S.seed and the board always dealt from the seed and the week,
// but what HAPPENED — every job, twist, trip, street run and weekly event — drew from the clock.
// A server could therefore re-deal your board, rebuild your roster, and still have no way of
// knowing whether your fifty million was earned, because the nights that earned it could not be
// run again. This is the test of the property that fixes that: same seed, same decisions, same
// game. Everything server-side stands on it, so it is proved rather than assumed.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json|version\.txt/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const w=(m.location()||{}).url||"";const t=m.text()+(w?" ["+w+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+(process.argv[2]?require("path").resolve(process.argv[2]):GAME));
  await page.waitForSelector('[data-act="begin"]',{timeout:15000});

  /* ========== a scripted life, run entirely in the engine ========== */
  // No clicking: the point is the engine, and a script of decisions is what a server would replay.
  const run=seed=>page.evaluate(s=>{
    draft={name:"Paz",gender:"M",nat:"Israel",role:"commander",tech:"launderer",avseed:7,profile:null};
    rollDraftProfile();
    newGame(Object.assign({id:"YOU",isPlayer:true,n:"Paz",first:"Paz",gender:"M",nat:"Israel",
      avseed:7,status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,vetFlag:false,limits:[]},draft.profile));
    if(typeof TUT!=="undefined"&&TUT.on)tutEnd();
    // Pin the whole world to the seed under test, the commander included. rollDraftProfile() above
    // is unseeded by design, so the man it rolled is thrown away and one is taken off the seeded
    // roster instead — a different commander is a different set of people who can go on a job.
    S.seed=s;S.roster=buildRoster(s);S.rngN=0;S.crewIds=[];
    const proto=S.roster[0];
    S.player=Object.assign({},proto,{id:"YOU",isPlayer:true,n:"Paz",first:"Paz",role:"commander",
      status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,vetFlag:false,limits:[]});
    proto.status="gone";                       // and he cannot also be hired as somebody else
    S.rivals=[];S.det=null;S.money=3e6;S.notices=[];S.news=null;S.modal=null;
    const hire=n=>{for(let i=0;i<n;i++){
      const c=S.roster.find(x=>x.status==="available"&&canSign(x)&&recruits().length<crewSeats());
      if(!c)break;S.money-=c.fee;c.status="crew";c._touched=true;S.crewIds.push(c.id);}};
    hire(4);
    const marks=[];
    for(let round=0;round<6;round++){
      S.jobs=[];refreshJobs(true);
      const j=S.jobs.filter(x=>!x.final&&assessJob(x).canRun&&assessJob(x).team.length>=2)[0];
      if(j){
        const d=startJob(j);
        // answer every twist the same way, which is what a recorded decision looks like
        let g=0;
        while(S.pendingJob&&g++<8){
          const k=(S.pendingJob.answers||[]).length;
          if(!pendingTwists(S.pendingJob)[k])break;
          twistChoose(k%6);
        }
        if(S.modal&&S.modal.data&&!S.modal.data.done)tickerFinish();
      }
      S.modal=null;S.notices=[];
      weekTick(freshRng());              // a week of the world moving on its own
      marks.push({wk:S.week,money:S.money,rep:S.rep,heat:S.heat,
        crew:recruits().map(c=>c.id+":"+c.status+":"+c.loyalty+":"+(c.xp||0)).join(","),
        rngN:S.rngN});
    }
    return {marks,final:{money:S.money,rep:S.rep,heat:S.heat,week:S.week,rngN:S.rngN,
      log:(S.log||[]).map(l=>l.t).join("|").slice(0,4000),
      roster:S.roster.filter(c=>c._touched).map(c=>c.id+":"+c.status+":"+c.exp).join(",")}};},seed);

  console.log("— the same seed, the same decisions, twice —");
  const A=await run(123456789);
  const B=await run(123456789);
  check(A.final.rngN>=12,A.final.rngN+" draws of chance were made — jobs, twists, trips, the world moving");
  check(JSON.stringify(A.marks)===JSON.stringify(B.marks),
    "every week of it came out identical, week by week"
    +(JSON.stringify(A.marks)===JSON.stringify(B.marks)?"":"\n  A "+JSON.stringify(A.marks[0])+"\n  B "+JSON.stringify(B.marks[0])));
  check(A.final.money===B.final.money&&A.final.rep===B.final.rep&&A.final.heat===B.final.heat,
    "and it ends on the same money, name and heat: "+A.final.money+" / "+A.final.rep+" / "+A.final.heat);
  check(A.final.log===B.final.log,"the case log reads word for word the same ("+A.final.log.length+" chars)");
  check(A.final.roster===B.final.roster,"and the same people were touched, in the same way");

  console.log("\n— a different seed is a different life —");
  const C=await run(987654321);
  check(C.final.money!==A.final.money||C.final.rep!==A.final.rep||C.final.log!==A.final.log,
    "another seed gives another game, so this is determinism and not a frozen outcome");
  check(C.final.rngN>=12,"and it drew its own "+C.final.rngN+" times");

  console.log("\n— luck survives being put down and picked up —");
  // The counter is the other half of the seed. If it is not saved, a reload resets the stream and
  // the same decisions stop giving the same game — which is the whole property, lost on a refresh.
  const rt=await page.evaluate(()=>{
    S.jobs=[];refreshJobs(true);
    const before=S.rngN;
    freshRng();freshRng();freshRng();
    const after=S.rngN;
    save();
    const raw=JSON.parse(localStorage.getItem(SAVE_KEY));
    const inSave=raw.rngN;
    S=null;load();
    return {before,after,inSave,afterLoad:S.rngN,
      next:mulberry32((S.seed^Math.imul(S.rngN+1,2654435761))>>>0)()};});
  check(rt.after===rt.before+3,"three draws move the counter three ("+rt.before+" → "+rt.after+")");
  check(rt.inSave===rt.after,"the counter is written into the save, not kept in the tab");
  check(rt.afterLoad===rt.after,"and comes back off it unchanged after a reload");
  const nextTwo=await page.evaluate(()=>{
    const a=freshRng()();S.rngN--;const b=freshRng()();return {a,b};});
  check(nextTwo.a===nextTwo.b,"so the next draw after a reload is the draw that was coming");

  console.log("\n— and the screens that must NOT be deterministic —");
  // A reroll button that returns the same face twice is a broken button, and the title screen has
  // no game to be a function of. Those keep the clock.
  const pre=await page.evaluate(()=>{
    const keep=S;S=null;
    const faces=[];for(let i=0;i<6;i++){const r=freshRng();faces.push(Math.floor(r()*1e9));}
    S=keep;return faces;});
  check(new Set(pre).size===pre.length,"with no game running, six draws give six different answers");
  check(await page.evaluate(()=>{const keep=S;S=null;const r=freshRng();S=keep;return typeof r;})==="function",
    "and it still hands back a working generator");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

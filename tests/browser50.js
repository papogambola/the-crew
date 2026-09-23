// Build 72: the first week is for putting a crew together and does not cost weeks; from the second
// every trip does. And once the name is worth something, people start coming to you instead — a
// transaction the other way round, where the commander is the one who can walk.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots72");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)
  ||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1100}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  page.on("console",m=>{const w=(m.location()||{}).url||"";const t=m.text()+(w?" ["+w+"]":"");
    if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+(process.argv[2]?require("path").resolve(process.argv[2]):GAME));
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Paz");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  const drain=async()=>{let n=0;while(await page.$(".modal.notice")){if(await page.$('[data-act="crewname-later"]')){await page.click('[data-act="crewname-later"]');await page.waitForTimeout(80);continue;}await page.click('[data-act="notice-close"].btn');await page.waitForTimeout(80);if(++n>30)break;}};
  await drain();

  /* ---------------- the first week costs no weeks ---------------- */
  console.log("\n— week one —");
  const w0=await page.evaluate(()=>{S.money=9e6;S.notices=[];S.modal=null;S.tab="roster";render();return S.week;});
  check(w0===1,"it is week "+w0);
  const roster=await page.evaluate(()=>document.body.innerText);
  check(/clock stands still/i.test(roster),"the roster says so before you spend anything");
  // "Free" was the word and it was the wrong one: the fee is charged in week one like any other
  // week. What week one does not charge is the week, and the line has to say which.
  check(!/week is free/i.test(roster),"and does not call the week free — it is the fee that is still paid");
  check(/still pay their fee/i.test(roster),"which the line says out loud");
  const hires=[];
  for(let i=0;i<3;i++){
    const took=await page.evaluate(()=>{
      const c=S.roster.find(x=>x.status==="available"&&canApproach(x));
      if(!c)return null;
      const before=S.week;
      hire(c.id);
      // run the trip out without watching it
      if(S.pendingTrip){const T=S.modal&&S.modal.data;
        if(T&&T.snag)tripChoose(0); else tickerFinish();}
      const T=S.modal&&S.modal.data;
      const out={before:before,after:S.week,outcome:T?T.outcome:null,weeks:T?T.weeks:null,
        crew:recruits().filter(x=>x.status==="crew").length};
      S.modal=null;S.notices=[];render();
      return out;});
    if(took)hires.push(took);
  }
  check(hires.length===3,"three people gone after, one at a time");
  check(hires.every(h=>h.after===1),"and it is still week 1 after every one of them: "+hires.map(h=>h.before+"→"+h.after).join(", "));
  check(hires.every(h=>h.weeks===0),"each trip says it took no weeks");
  const crewNow=await page.evaluate(()=>recruits().filter(x=>x.status==="crew").length);
  check(crewNow>1,crewNow+" on the crew without the clock moving");
  await page.screenshot({path:path.join(OUT,"1-week-one.png"),fullPage:false});

  /* ---------------- and from week two it does ---------------- */
  console.log("\n— week two —");
  await page.evaluate(()=>{S.modal=null;S.notices=[];weekTick(freshRng());refreshJobs(false);
    S.apply=null;S.clash=null;S.modal=null;render();});
  await page.waitForTimeout(250);await drain();
  const w2=await page.evaluate(()=>S.week);
  check(w2>=2,"it is week "+w2+" now");
  const roster2=await page.evaluate(()=>{S.tab="roster";render();return document.body.innerText;});
  check(!/clock stands still/i.test(roster2),"the roster stops saying the clock stands still");
  check(/a week on the ground/i.test(roster2),"and says a trip is a week now");
  const took2=await page.evaluate(()=>{
    const c=S.roster.find(x=>x.status==="available"&&canApproach(x));
    if(!c)return null;
    const before=S.week;
    hire(c.id);
    if(S.pendingTrip){const T=S.modal&&S.modal.data; if(T&&T.snag)tripChoose(0); else tickerFinish();}
    const T=S.modal&&S.modal.data;
    const out={before,after:S.week,weeks:T?T.weeks:null};
    S.modal=null;S.notices=[];S.apply=null;S.clash=null;render();
    return out;});
  check(took2&&took2.after>took2.before,"going to fetch somebody costs the week: "+(took2&&took2.before)+" → "+(took2&&took2.after));
  check(took2&&took2.weeks>=1,"and the trip says so ("+(took2&&took2.weeks)+" week)");

  /* ---------------- people come to you, further up ---------------- */
  console.log("\n— and when the name is worth something —");
  const gate=await page.evaluate(()=>({at:applyRankAt(),name:APPLY.fromRank,
    low:(S.rep=0,applyChance()),
    atRung:(S.rep=applyRankAt(),applyChance()),
    high:(S.rep=RANKS[0][0],applyChance())}));
  check(gate.low===0,"nobody comes to a Nobody (0% a week)");
  check(gate.atRung>0,"they start at "+gate.name+", ranking "+gate.at+" ("+Math.round(gate.atRung*100)+"% a week)");
  check(gate.high>gate.atRung,"and there are more of them the higher the name ("+Math.round(gate.atRung*100)+"% → "+Math.round(gate.high*100)+"%)");
  const said=await page.evaluate(()=>{S.rep=RANKS.find(r=>r[1]==="Respected")[0];S.tab="roster";render();
    return document.body.innerText;});
  check(/asks to join you/i.test(said),"and the roster prints the rate it happens at");

  // arrange one rather than wait for the dice
  const up=await page.evaluate(()=>{
    S.apply=null;S.modal=null;
    while(recruits().filter(c=>c.status==="crew").length>=crewSeats()){
      const c=recruits().find(x=>x.status==="crew"&&!x.isPlayer);if(!c)break;leaveCrew(c);c.status="available";}
    let n=0;while(!S.apply&&n++<400)applyRoll(freshRng());
    if(!S.apply)return null;
    S.modal={type:"apply"};render();
    const c=byId(S.apply.id);
    return {first:c.first,ask:S.apply.ask,fee:c.fee,cut:S.apply.cut,week:S.week};});
  check(!!up,"somebody turns up: "+(up&&up.first));
  await page.waitForTimeout(300);
  check(up.ask<up.fee,"asking less than it would cost to go and fetch them ("+up.ask+" against a fee of "+up.fee+")");
  const txt=await page.textContent(".modal");
  check(/wants in/i.test(txt),"the screen says what this is");
  check(/no trip, no week/i.test(txt),"and that it costs neither a trip nor a week");
  check(/Going to fetch them/i.test(txt),"and shows what the other way would have cost, beside it");
  // Money is written the same way here as on the roster this screen sits over — $36K, not
  // $35,500. The roster is the language; this screen was speaking a different one.
  const sums=(txt.match(/\$[\d,.]+[KM]?/g)||[]);
  check(sums.length>0&&!sums.some(x=>/,/.test(x)),
    "and every figure on it is written the way the roster writes money: "+sums.slice(0,4).join(" · "));
  check(await page.evaluate(()=>S.apply.ask%1000===0),
    "the figure is a round thousand, so what is shown is what leaves the float ("+up.ask+")");
  const opts=await page.$$eval('.modal .twist-opt',e=>e.map(x=>x.innerText.replace(/\s+/g," ")));
  check(opts.length===3,"three answers: "+opts.map(o=>o.split(" ")[0]).join(", "));
  check(/costs nothing/i.test(txt),"and saying no is free, which is the whole difference");
  await page.screenshot({path:path.join(OUT,"2-applicant.png"),fullPage:false});

  console.log("\n— the commander has the upper hand —");
  const odds=await page.evaluate(()=>applyHaggleOdds());
  check(odds>=60,"saying it is too much works most of the time ("+odds+"%)");
  const hag=await page.evaluate(()=>{const was={ask:S.apply.ask,cut:S.apply.cut};
    applyHaggle();return {was,now:{ask:S.apply.ask,cut:S.apply.cut},note:S.apply.note,left:APPLY.haggleMax-S.apply.haggles};});
  check(hag.now.ask<hag.was.ask||hag.note,"pushing on the figure either moves it or is refused once: "+hag.note);
  if(hag.now.ask<hag.was.ask)check(hag.now.cut<=hag.was.cut,"and the percentage with it");
  await page.evaluate(()=>{while(S.apply.haggles<APPLY.haggleMax&&!S.apply.firm)applyHaggle();});
  const spent=await page.evaluate(()=>({h:S.apply.haggles,max:APPLY.haggleMax,firm:!!S.apply.firm}));
  check(spent.h>=1,"there is a limit to it ("+spent.h+" of "+spent.max+(spent.firm?", and they held":"")+")");

  const before=await page.evaluate(()=>({m:S.money,crew:recruits().filter(c=>c.status==="crew").length,w:S.week}));
  await page.click('[data-act="apply-sign"]');
  await page.waitForTimeout(350);
  const after=await page.evaluate(()=>({m:S.money,crew:recruits().filter(c=>c.status==="crew").length,w:S.week,
    out:S.apply&&S.apply.outcome}));
  check(after.out==="signed","signing them puts them on the crew");
  check(after.crew===before.crew+1,"one more on the books ("+before.crew+" → "+after.crew+")");
  check(after.w===before.w,"and not a week gone for it");
  check(after.m<before.m,"the money went, though");
  await page.click('[data-act="apply-close"]');await page.waitForTimeout(250);
  check(await page.evaluate(()=>!S.apply),"and it closes");

  console.log("\n— and no costs nothing —");
  const away=await page.evaluate(()=>{
    while(recruits().filter(c=>c.status==="crew").length>=crewSeats()){
      const c=recruits().find(x=>x.status==="crew"&&!x.isPlayer);if(!c)break;leaveCrew(c);c.status="available";}
    S.apply=null;let n=0;while(!S.apply&&n++<400)applyRoll(freshRng());
    if(!S.apply)return null;
    const m0=S.money,w0=S.week,c0=recruits().filter(c=>c.status==="crew").length;
    S.modal={type:"apply"};applyTurnAway();
    return {m0,w0,c0,m:S.money,w:S.week,c:recruits().filter(c=>c.status==="crew").length,out:S.apply.outcome};});
  check(away&&away.out==="away","turning somebody away is an answer");
  check(away&&away.m===away.m0&&away.w===away.w0&&away.c===away.c0,
    "and it costs no money, no week and no place — they were the ones asking");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})();

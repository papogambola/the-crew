/* WHAT WENT WRONG, IN THE FEED, ON ITS OWN MINUTE.

   The report is the game's one long form: a night, minute by minute, and the sentence beside each
   minute is what happened in it. A twist broke that. The feed said

       16:06  THEN, THE THING NOBODY DREW.

   and then, after the call was made, what the call turned out to be — and nowhere, at any minute,
   what the thing nobody drew actually was. The sentence existed. Every twist carries one, written
   for it, naming the road and the barrier and the name on the manifest. It was shown in the
   decision panel, which is on screen for as long as it takes to press a button and is then gone
   for good. So a report read back an hour later was a night with a hole in the middle of it:
   something happened, you did something, it worked.

   This file asks, in a real browser, for the thing itself — on the live feed, in the report that
   is kept, and in the one rebuilt after a reload, because those are three different code paths
   that each used to print the cue and stop.

   THE OTHER HALF, and the one worth stating plainly: the feed now stops on the SETUP rather than
   on the cue. Being halted by "and then it doesn't go to plan" and handed six answers is being
   asked a question you have not been told. So the last line on screen when the options appear is
   the one that says what is wrong — asserted here twice, once for the live stop and once for Skip.
*/
const {chromium,CHROME,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const FILE=path.resolve(__dirname,process.argv[2]||GAME);
const OUT=path.join(__dirname,"shots90");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};

const mins=t=>{const m=/^(\d\d):(\d\d)$/.exec(String(t||""));return m?(+m[1])*60+(+m[2]):null;};

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  const errs=[];page.on("pageerror",e=>errs.push(String(e)));
  const noise=t=>/ERR_CERT|music\/|\.mp3|manifest\.json|r2\.dev|fonts\./.test(t)||/net::ERR_FAILED/.test(t)
    ||/ERR_FILE_NOT_FOUND/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t));
  page.on("console",m=>{const w=(m.location()||{}).url||"";const t=m.text()+(w?" ["+w+"]":"");
    if(m.type()==="error"&&!noise(t))errs.push(t);});

  await page.goto("file://"+FILE);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Probe");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  for(let i=0;i<25;i++){
    const x=await page.$('button[data-act="crewname-later"]')||await page.$('.scrim button.x:not([disabled])');
    if(x){await x.click();await page.waitForTimeout(40);continue;}
    const q=await page.$$('.scrim .btn:not([disabled])');
    if(q.length){await q[q.length-1].click();await page.waitForTimeout(40);continue;}
    break;}

  /* A payout over BIG_MONEY buys two twists, always — which is what the money is for, and what
     makes this a test of the second one as well as the first. Read off the constant rather than
     typed, so a change to what counts as a big night does not quietly make this a one-twist test. */
  console.log("— a night with two things wrong in it —");
  const live=await page.evaluate(()=>{
    ["wheelman","forger","hacker","enforcer"].forEach(t=>{
      const c=S.roster.find(c=>c.status==="available"&&c.tech===t&&c.exp<=3);
      if(c&&recruits().length<crewSeats()){S.money=5e6;c.status="crew";c._touched=true;S.crewIds.push(c.id);}});
    const job=S.jobs.find(j=>!j.final&&!j.big);
    job.payout=BIG_MONEY*3;
    const d=startJob(job,{pool:jobPool(job)});
    S.modal={type:"result",data:d};
    const tws=S.pendingJob.twists||[];
    return {n:tws.length,setup:tws[0]?tws[0].s:null,cue:tws[0]?tws[0].cue:null,head:tws[0]?tws[0].h:null,
            lines:d.narrative.map(l=>({t:l.t,x:l.x,twist:!!l.twist,halt:l.halt}))};
  });
  check(live.n>=2,"a big payday puts two of them on the night ("+live.n+")");
  check(!!live.setup&&live.setup.length>20,"and the first one carries a sentence saying what it is");

  const i=live.lines.findIndex(l=>l.twist);
  check(i>=0,"the cue is in the feed, in the red that means the night has turned");
  check(live.lines[i]&&live.lines[i].x===live.cue,"and it is the cue: \""+(live.lines[i]||{}).x+"\"");
  check(!!live.lines[i+1]&&live.lines[i+1].x===live.setup,
    "and the line after it is the thing itself: \""+String((live.lines[i+1]||{}).x).slice(0,70)+"…\"");
  check(live.lines[i].halt===false&&live.lines[i+1].halt===true,
    "the feed stops on the second, not the first — you are told before you are asked");
  /* Guarded, because everything below it is a separate claim and a test that DIES reports one
     crash where it could have reported six failures. The first build of this file threw here when
     the second line was missing, and the four claims after it never ran. */
  const dt=mins((live.lines[i+1]||{}).t)-mins(live.lines[i].t);
  check(dt>=1&&dt<=3,"and it lands a minute or three later, not twenty ("
    +live.lines[i].t+" → "+((live.lines[i+1]||{}).t||"nothing")+", +"+dt+")");

  console.log("— what is on screen when the six answers are —");
  await page.evaluate(()=>{UI.hold=false;tickerFinish();render();});
  await page.waitForSelector(".twist-opt",{timeout:10000});
  const stopped=await page.evaluate(()=>{
    const d=S.modal.data;
    const tk=[...document.querySelectorAll("#ticker .tk")];
    const last=tk[tk.length-1];
    return {last:last?last.innerText.replace(/\s+/g," ").trim():"",
            panel:(document.querySelector(".twist")||{}).innerText||"",
            setup:d.twist.s,head:d.twist.h,revealed:d.revealed};
  });
  check(String(stopped.last).indexOf(live.setup.slice(0,40))>=0,
    "Skip lands on the line that says what is wrong, not on the cue above it");
  check(stopped.panel.toLowerCase().indexOf(stopped.head.toLowerCase())>=0,
    "the panel still names it: \""+stopped.head+"\"");
  check(stopped.panel.indexOf(live.setup.slice(0,40))<0,
    "and does not print the same sentence a second time a centimetre below the first");
  await page.screenshot({path:OUT+"/01-told-then-asked.png"});

  console.log("— the second one, after the first is answered —");
  const two=await page.evaluate(()=>{
    twistChoose(0);
    const d=S.modal.data;
    const tws=S.pendingJob.twists||[];
    return {lines:d.narrative.map(l=>({x:l.x,twist:!!l.twist,halt:l.halt})),
            cue:tws[1].cue,setup:tws[1].s};
  });
  const j=two.lines.map((l,ix)=>({l,ix})).filter(o=>o.l.twist).pop().ix;
  check(two.lines[j].x===two.cue&&!!two.lines[j+1]&&two.lines[j+1].x===two.setup,
    "the next one arrives the same way round: the cue, then the thing");
  check(!!two.lines[j+1]&&two.lines[j+1].halt===true,"and the feed stops on the thing again");

  console.log("— and the report that is kept says it too —");
  const kept=await page.evaluate(()=>{
    const setups=(S.pendingJob.twists||[]).map(t=>t.s);
    twistChoose(0);
    const d=S.modal.data;
    return {setups,lines:d.narrative.map(l=>({x:l.x,twist:!!l.twist})),done:!!d.done||!S.pendingJob};
  });
  // A big enough payday can put a third on the night, so these are counted rather than named twice.
  const ord=n=>["first","second","third","fourth"][n]||(n+1)+"th";
  kept.setups.forEach((s,n)=>{
    const at=kept.lines.findIndex(l=>l.x===s);
    check(at>0,"the finished report keeps what went wrong the "+ord(n)+" time");
    check(at>0&&kept.lines[at-1].twist,"and keeps it directly under its own cue");
  });
  await page.screenshot({path:OUT+"/02-the-whole-night.png"});

  /* A job put down mid-decision and picked up again is a THIRD code path — the report is rebuilt
     from what was saved rather than carried in memory — and it printed the cue and stopped too. */
  console.log("— and so does a night picked up again after a reload —");
  const again=await page.evaluate(() => {
    S.crewIds.map(byId).filter(Boolean).forEach(c=>{c.status="crew";c.out=0;});
    const job=S.jobs.find(j=>!j.final&&!j.big);
    if(!job)return {none:true};
    job.payout=BIG_MONEY*3;
    startJob(job,{pool:jobPool(job)});
    const tws=S.pendingJob&&S.pendingJob.twists;
    if(!tws||!tws.length)return {none:true};
    save();
    return {setup:tws[0].s};
  });
  if(!again.none){
    await page.reload();
    // A reload lands on the title screen with the night behind Continue, exactly as it does for a
    // player who closed the tab in the middle of one.
    await page.waitForSelector('[data-act="continue"]',{timeout:10000});
    await page.click('[data-act="continue"]');
    await page.waitForTimeout(500);
    const back=await page.evaluate(()=>{
      const d=S.modal&&S.modal.data;
      return d?{lines:d.narrative.map(l=>({x:l.x,twist:!!l.twist,halt:l.halt})),awaiting:!!d.awaiting}:null;
    });
    check(!!back,"the game comes back up on the night it was left in");
    if(back){
      const k=back.lines.findIndex(l=>l.x===again.setup);
      check(k>0,"and the rebuilt feed has the thing that went wrong in it, not just the cue");
      check(k>0&&back.lines[k-1].twist,"under its cue, in the order it was watched");
      check(k>0&&back.lines[k].halt===true,"and the stop is on it");
    }
    await page.screenshot({path:OUT+"/03-picked-up-again.png"});
  }

  check(errs.length===0,"no page or console errors through any of it"+(errs.length?": "+errs.slice(0,2).join(" | "):""));
  await browser.close();
})();

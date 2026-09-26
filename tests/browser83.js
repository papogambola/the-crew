// Build 122: the night is not banked until the report has been read.
//
// The whole night is reckoned the moment the job starts, because the report IS that reckoning
// written out a line at a time. It used to go straight into S — and S is what the top bar reads,
// and the top bar is on screen behind the card of the city. So before a single line had been read
// you could look up and see the balance move, the heat jump and the ranking fall, and know how the
// night had gone. Measured on a job worth $128,000: on the card, money +$48,642, heat 0 → 23,
// ranking 10 → 8. Three tells, and the seven-second card and the five playback speeds all for
// nothing, because the answer was printed above them.
//
// There were FOUR channels, not three. The fourth was the career marks: checkGoals() pays ranking
// and money, it runs on every render, and a mark is only ever earned by a job going well — so the
// loudest tell of all fired while the city card was still up.
//
// This drives a real job in a real browser and reads the top bar's own numbers at each stage.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots83");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+(process.argv[2]?require("path").resolve(process.argv[2]):GAME));
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Paz");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  const drain=async()=>{let n=0;while(await page.$(".modal.notice")||await page.$('[data-act="loose"]')){
    if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');
    else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');
    else await page.click('[data-act="loose"][data-i="0"]');
    await page.waitForTimeout(90);if(++n>30)break;}};
  await drain();

  await page.evaluate(()=>{
    S.money=5e7;S.notices=[];S.modal=null;S.loose=[];
    while(recruits().length<5){const c=S.roster.find(x=>x.status==="available"&&canSign(x));if(!c)break;
      c.status="crew";c._touched=true;S.crewIds.push(c.id);}
    S.jobs=[];refreshJobs(true);render();});
  await drain();

  // The three numbers as the STATE holds them, and as the BAR prints them. Both, because a held
  // figure that the bar renders from somewhere else would pass a state-only check and still put
  // the answer on the screen.
  const bar=()=>page.evaluate(()=>{
    const t=document.querySelector(".topbar");
    // Every stat but the WEEK, which is allowed to move: the job spent one, and it says so on
    // the posting before you take it. It is the three that say how the night went that must not.
    const stat=n=>{const e=[...document.querySelectorAll(".topbar .stat")].find(x=>
      (x.querySelector(".l")||{}).textContent&&new RegExp("^"+n,"i").test(x.querySelector(".l").textContent));
      return e?e.innerText.replace(/\s+/g," ").trim():null;};
    return {money:S.money,heat:S.heat,rep:S.rep,
      printed:[stat("Balance"),stat("Ranking"),stat("Heat")].join(" | "),
      settle:S.settle?{money:S.settle.money,heat:S.settle.heat,rep:S.settle.rep}:null};});

  const before=await bar();
  /* A posting with NOTHING to decide, chosen deliberately. On a night with a twist the whole
     reckoning waits for the answer, so "nothing has moved yet" on the card is true whether or not
     anything holds it — the assertion passes on a broken build. On a night without one, finishJob
     runs inside startJob and the card is up AFTER the night is reckoned, which is the case that
     was wrong and the only one that proves it is right. Verified: with jobHold() disabled this
     section fails and the twisting one does not. */
  const started=await page.evaluate(()=>{
    // ARRANGED, not hoped for. A night with a twist waits for the answer, so "nothing has moved
    // yet" on the card is true whether or not anything holds it — the assertion passes on a
    // broken build. Only a night with nothing to decide is reckoned BEFORE the card goes up, and
    // waiting for the random board to offer one made the test fail on the boards that did not.
    // twistCount() is what decides, so it is held at nought for this one job and put back after.
    const realCount=twistCount;
    twistCount=function(){return 0;};
    try{
      const j=S.jobs.filter(x=>!x.final&&assessJob(x,jobPool(x)).canRun)[0];
      if(!j)return null;
      doExecute(j.id);
      return {title:j.title,payout:j.payout,
        estab:!!(S.modal&&S.modal.data&&S.modal.data.estab),
        reckoned:!S.pendingJob};                 // nothing pending: the whole night is already done
    } finally { twistCount=realCount; }});
  check(started,"a job the crew can run: "+(started&&started.title)+", worth "+(started&&started.payout));
  if(!started){console.error("no runnable posting");process.exit(1);}
  check(started.estab,"and it opens on the card of the city, before a line has been read");
  check(started.reckoned,"the whole night is already reckoned behind that card");

  // ---- on the card: nothing has moved
  await page.waitForTimeout(250);
  const onCard=await bar();
  check(onCard.money===before.money,"on the card the balance has not moved ("+onCard.money+")");
  check(onCard.heat===before.heat,"nor the heat ("+onCard.heat+")");
  check(onCard.rep===before.rep,"nor the ranking ("+onCard.rep+")");
  await page.screenshot({path:OUT+"/01-card.png"});

  // ---- through the feed, and every decision answered: still nothing
  await page.evaluate(()=>estabClear());
  await page.waitForTimeout(300);
  const onFeed=await bar();
  check(onFeed.money===before.money&&onFeed.heat===before.heat&&onFeed.rep===before.rep,
    "and nothing has moved once the feed is running either");

  let twists=0;
  for(let i=0;i<8;i++){
    await page.evaluate(()=>{const d=S.modal&&S.modal.data;if(d&&!d.done&&!d.awaiting)tickerFinish();});
    await page.waitForTimeout(250);
    if(!await page.evaluate(()=>!!(S.modal&&S.modal.data&&S.modal.data.awaiting)))break;
    const mid=await bar();
    check(mid.money===before.money&&mid.heat===before.heat&&mid.rep===before.rep,
      "a decision on the table and the numbers still have not moved");
    twists++;
    await page.evaluate(()=>twistChoose(0));
    await page.waitForTimeout(250);
  }
  await page.evaluate(()=>{const d=S.modal&&S.modal.data;if(d&&!d.done)tickerFinish();});
  await page.waitForTimeout(500);

  // ---- the report is finished and on screen: the night is reckoned, and held
  const res=await page.evaluate(()=>{const d=S.modal&&S.modal.data;
    return d?{done:d.done,verdict:d.verdictName,net:d.net,heatGain:d.heatGain}:null;});
  check(res&&res.done,"the report is finished and on the screen: "+(res&&res.verdict)+(twists?" ("+twists+" decisions answered)":""));
  const onReport=await bar();
  check(onReport.money===before.money,"the balance STILL reads what it read before the job ("+onReport.money+")");
  check(onReport.heat===before.heat,"and the heat");
  check(onReport.rep===before.rep,"and the ranking");
  check(onReport.printed===before.printed,
    "and the bar itself prints exactly what it printed before the job: "+JSON.stringify(onReport.printed));
  check(onReport.settle,"but the night is reckoned and waiting: "+JSON.stringify(onReport.settle));
  await page.screenshot({path:OUT+"/02-report.png"});

  // ---- Continue is where it lands
  // Continue, the way a player presses it: the button in the report's own footer.
  await page.click('.modal .modal-f button[data-act="scrim"]');
  await page.waitForTimeout(400);
  const after=await bar();
  check(!after.settle,"Continue banks it: nothing is left waiting");
  check(after.money===Math.max(0,before.money+onReport.settle.money),
    "the balance moves by exactly what was held ("+before.money+" + "+onReport.settle.money+" = "+after.money+")");
  check(after.heat===Math.max(0,Math.min(120,before.heat+onReport.settle.heat)),
    "and the heat by exactly what was held ("+before.heat+" → "+after.heat+")");
  // The ranking is the one that can legitimately move FURTHER than what was held: a career mark
  // pays a rung, and the marks are held with it and paid on the same frame.
  check(after.rep!==before.rep||onReport.settle.rep===0,
    "and the ranking lands too ("+before.rep+" → "+after.rep+", held "+onReport.settle.rep+")");
  await page.screenshot({path:OUT+"/03-after.png"});

  // ---- and it cannot be collected twice
  const twice=await page.evaluate(()=>{const m=S.money,h=S.heat,r=S.rep;render();render();
    return {same:S.money===m&&S.heat===h&&S.rep===r,settle:!!S.settle};});
  check(twice.same&&!twice.settle,"and re-rendering does not pay it again");

  // ---- a night left unread is still a night worked
  // The report is not saved — only the job behind it is — so a reload during one leaves nothing to
  // press Continue on. Held back from the screen is not the same as not earned.
  await page.evaluate(()=>{
    S.money=5e7;S.notices=[];S.modal=null;S.loose=[];S.jobs=[];refreshJobs(true);render();});
  await drain();
  const b2=await page.evaluate(()=>({money:S.money,heat:S.heat,rep:S.rep}));
  const ran=await page.evaluate(()=>{
    const j=S.jobs.filter(x=>!x.final&&assessJob(x,jobPool(x)).canRun)[0];
    if(!j)return null;doExecute(j.id);estabClear();
    for(let i=0;i<8;i++){const d=S.modal&&S.modal.data;if(!d)break;
      if(d.awaiting){twistChoose(0);continue;} if(!d.done)tickerFinish(); else break;}
    return S.settle?{money:S.settle.money,heat:S.settle.heat,rep:S.settle.rep}:null;});
  if(ran){
    const stranded=await page.evaluate(()=>{
      // the report goes without anybody pressing anything, the way a reload takes it
      S.modal=null;render();
      return {money:S.money,heat:S.heat,rep:S.rep,settle:!!S.settle};});
    check(!stranded.settle,"a report that goes without a Continue still banks its night");
    check(stranded.money===Math.max(0,b2.money+ran.money),
      "for the same money it was holding ("+b2.money+" + "+ran.money+" = "+stranded.money+")");
  } else check(true,"the second night settled before it could be stranded — nothing to strand");

  // ---- and it survives the tab being closed with the report still up
  // The one way this could lose somebody real money. The report is not saved, so a reload has
  // nothing to press Continue on; what is saved is the held difference, and it has to land when
  // the file is opened again. Done as an ACTUAL reload rather than by clearing the modal, because
  // what is being tested is that the hold went into the save and came back out of it.
  await page.evaluate(()=>{
    S.money=5e7;S.notices=[];S.modal=null;S.loose=[];S.settle=null;S.jobs=[];refreshJobs(true);render();});
  await drain();
  const held=await page.evaluate(()=>{
    for(const j of S.jobs.filter(x=>!x.final&&assessJob(x,jobPool(x)).canRun)){
      const m0=S.money;
      doExecute(j.id);
      if(!S.pendingJob){
        estabClear();
        const d=S.modal.data;if(!d.done)tickerFinish();
        save();                                     // the game saves as it goes; no Continue pressed
        return {money:S.money,settle:S.settle?{money:S.settle.money,heat:S.settle.heat,rep:S.settle.rep}:null};
      }
      S.modal=null;S.pendingJob=null;S.money=m0;S.settle=null;
    }
    return null;});
  if(held&&held.settle){
    await page.reload();
    await page.waitForTimeout(700);
    if(await page.$('[data-act="continue"]'))await page.click('[data-act="continue"]');
    await page.waitForSelector(".topbar",{timeout:20000});
    await page.waitForTimeout(500);
    const back=await page.evaluate(()=>({money:S?S.money:null,settle:S&&S.settle?true:false}));
    check(back.money===Math.max(0,held.money+held.settle.money),
      "a tab closed on a finished report loses nothing: reopened at "+back.money
      +" ("+held.money+" + "+held.settle.money+" held)");
    check(!back.settle,"and nothing is still waiting once the file is back");
  } else check(true,"no night could be left held this run — nothing to reload onto");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

// Build 24 in a real browser: weeks on the ground, casing, local heat, the last score's gate.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots24");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1100}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+GAME);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');
  await page.fill("#pname","Paz");
  await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');  // A job can also leave somebody outside the crew, and that question blocks the page until it
  // is answered, as it does for a player. These drives are about other screens, so they take the
  // free answer — Let them go — and move on. browser25 is the one that drives the decision.

  const dismiss=async()=>{
    let n=0;
    while(await page.$(".modal.notice")||await page.$('[data-act="loose"]')){
      if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');
      else await page.click('[data-act="loose"][data-i="0"]');
      await page.waitForTimeout(95);
      if(++n>25)break;
    }
    return n;                      // some drives count the boxes they closed
  };
  await dismiss();
  check(await page.evaluate(()=>S.money===BAL.startMoney),"the opening float is the one in BAL ("+await page.evaluate(()=>S.money)+")");

  // a crew, and a name big enough that the board posts real rooms
  await page.evaluate(()=>{
    S.money=5e7;S.rep=RANKS.find(r=>r[1]==="Respected")[0];
    ["wheelman","forger","hacker","enforcer","safecracker"].forEach(t=>{const c=S.roster.find(c=>c.status==="available"&&c.tech===t&&canSign(c));if(c)(function(){if(recruits().length<crewSeats()&&canSign(c)){S.money=Math.max(0,S.money-c.fee);c.status="crew";c._touched=true;S.crewIds.push(c.id);stats().hired++;}})();});
    S.jobs=[];refreshJobs(true);S.tab="jobs";render();
  });
  await dismiss();

  // --- weeks show on the board
  const boardTxt=(await page.$eval("body",e=>e.innerText));
  check(/\d+ wk/.test(boardTxt),"the board says how many weeks each posting takes");
  await page.screenshot({path:OUT+"/01-board.png",fullPage:true});

  // --- open a multi-week posting
  const opened=await page.evaluate(()=>{
    // the board is smaller when clients are refusing to post, so give the search room
    for(let r=0;r<250;r++){
      S.modal=null;S.notices=[];S.loose=[];S.revenge=null;
      const j=S.jobs.find(x=>!x.final&&(x.weeks||1)>=2&&assessJob(x,jobPool(x)).canRun);
      if(j){S.jobOpen=j.id;render();return {id:j.id,title:j.title,weeks:j.weeks,tier:j.tier,cmax:caseMax(j),cost:caseCost(j)};}
      S.jobs=[];refreshJobs(true);
    }
    return {none:true,crew:field().length,rep:S.rep,jobs:S.jobs.length,
      weeks:S.jobs.map(j=>j.weeks).join(","),canRun:S.jobs.filter(j=>assessJob(j,jobPool(j)).canRun).length};
  });
  check(opened&&!opened.none,"a multi-week posting: "+(opened&&opened.none?JSON.stringify(opened):(opened&&opened.title)+" (tier "+(opened&&opened.tier)+", "+(opened&&opened.weeks)+" weeks)"));
  const fileTxt=(await page.$eval("body",e=>e.innerText));
  check(fileTxt.toLowerCase().indexOf("on the ground")>=0,"the job file says how long the crew is gone");
  check(fileTxt.toLowerCase().indexOf("casing it")>=0,"and offers to case it");
  await page.screenshot({path:OUT+"/02-job-file.png",fullPage:true});

  // --- casing moves the reckoning, the clock and the money
  // hold the posting open so the success path is the one under test — the expiry path is
  // proven separately below
  const before=await page.evaluate(()=>{const j=S.jobs.find(x=>x.id===S.jobOpen);j.expires=S.week+40;S.rivals=[];return {m:assessJob(j,jobPool(j)).margin,wk:S.week,money:S.money,heat:S.heat,co:countryHeat(j.country)};});
  await page.click('[data-act="case"]');
  await page.waitForTimeout(350);
  await dismiss();
  const after=await page.evaluate(()=>{const j=S.jobs.find(x=>x.id===S.jobOpen);return j?{m:assessJob(j,jobPool(j)).margin,wk:S.week,money:S.money,cased:casedWeeks(j),heat:S.heat,co:countryHeat(j.country)}:{gone:true,wk:S.week};});
  if(after.gone){
    check(after.wk===before.wk+1,"the posting expired while it was being cased — the week is still spent");
  }else{
    check(after.cased===1,"one week cased");
    // casing draws a little heat of its own, and heat is itself a factor on the reckoning —
    // so the net gain is caseGain minus what that heat costs. Both halves are the game working.
    const gain=await page.evaluate(()=>BAL.caseGain);
    const heatCost=Math.round(after.heat*0.24)-Math.round(before.heat*0.24);
    check(after.m===before.m+gain-heatCost,"the reckoning moves by caseGain less the heat casing draws: "+before.m+" +"+gain+" −"+heatCost+" = "+after.m);
    // sitting outside a building for a week is noticed locally. (National heat may not move:
    // it was already at zero and the week's cooling absorbs what casing adds.)
    check(after.co>before.co,"and the country notices people sitting outside its buildings ("+before.co+" → "+after.co+")");
    check(after.wk===before.wk+1,"it costs a week");
    check(after.money<before.money,"and money");
    const t=(await page.$eval("body",e=>e.innerText)).toLowerCase();
    check(t.indexOf("cased")>=0,"the reckoning lists it as its own factor");
    await page.screenshot({path:OUT+"/03-cased.png",fullPage:true});
  }

  // --- taking a job moves the calendar by its weeks
  const jumped=await page.evaluate(()=>{
    for(let r=0;r<80;r++){
      const j=S.jobs.find(x=>!x.final&&(x.weeks||1)>=2&&assessJob(x,jobPool(x)).canRun);
      if(j){const w0=S.week,want=j.weeks;startJob(j,{noTwist:true});return {moved:S.week-w0,want};}
      S.jobs=[];refreshJobs(true);
    }
    return null;
  });
  check(jumped&&jumped.moved===jumped.want,"taking a "+(jumped&&jumped.want)+"-week job moved the calendar "+(jumped&&jumped.moved)+" weeks");
  await page.evaluate(()=>{S.modal=null;S.event=null;S.notices=[];render();});
  await dismiss();

  // --- country heat shows once a country has been worked
  const heat=await page.evaluate(()=>{
    // burn whichever country the board is actually offering, so the line is always under test
    const j=S.jobs.find(x=>!x.final);
    if(!j)return null;
    // the country may already have been worked getting here, so what is under test is the rise
    const was=countryHeat(j.country);
    countryHeatAdd(j.country,45);
    S.tab="jobs";S.jobOpen=j.id;render();
    return {co:j.country,was,h:countryHeat(j.country)};
  });
  if(heat&&!heat.noJob){
    const t=await page.$eval("body",e=>e.innerText);
    check(t.indexOf("is watching for you")>=0,heat.co+" is watching for you, and the file says so");
    await page.screenshot({path:OUT+"/04-country-heat.png",fullPage:true});
    check(heat.h===heat.was+45,"the heat is on the country, not the posting ("+heat.was+" + 45 = "+heat.h+")");
  } else check(false,"no posting on the board to burn a country with");
  // the expiry path: a posting can die while you sit outside it
  const expired=await page.evaluate(()=>{
    const j=S.jobs.find(x=>!x.final&&caseMax(x)>0&&assessJob(x,jobPool(x)).team.length>0);
    if(!j)return null;
    j.expires=S.week;                       // the client stops waiting this week
    const w0=S.week;S.jobOpen=j.id;caseJob(j.id);
    return {gone:!S.jobs.some(x=>x.id===j.id),moved:S.week-w0};
  });
  check(expired&&expired.gone&&expired.moved===1,"a posting can expire while it is being cased, and the week is still spent");

  // --- the last score's gate is visible and ticks off
  await page.evaluate(()=>{S.modal=null;S.event=null;S.notices=[];S.jobOpen=null;S.tab="log";SET.folds={op:true,law:true,arrange:true,record:true,recaps:true,caselog:true};render();});
  await page.waitForTimeout(200);
  const gate=(await page.$eval("body",e=>e.innerText)).toLowerCase();
  check(gate.indexOf("the last score")>=0,"the log says what the last score is waiting for");
  check(gate.indexOf("operations, in order")>=0,"and that it is three operations, in order");
  check(gate.indexOf("war chest")>=0&&gate.indexOf("career behind you")>=0,"listing every condition");
  await page.screenshot({path:OUT+"/05-final-gate.png",fullPage:true});

  // meet it and watch stage one appear
  await page.evaluate(()=>{
    S.rep=BAL.finalRep;stats().jobs=100;S.money=BAL.finalMoney*2;S.finalStage=0;S.finalBack=0;
    while(field().length<5){const c=S.roster.find(c=>c.status==="available"&&canSign(c));if(!c)break;(function(){if(recruits().length<crewSeats()&&canSign(c)){S.money=Math.max(0,S.money-c.fee);c.status="crew";c._touched=true;S.crewIds.push(c.id);stats().hired++;}})();}
    S.notices=[];S.modal=null;refreshJobs(false);S.tab="jobs";render();
  });
  await dismiss();
  const stage=await page.evaluate(()=>{const f=S.jobs.find(j=>j.final);return f?{id:f.id,title:f.title,diff:f.diff}:null;});
  check(stage&&stage.id==="JFINAL1","stage one is on the board: "+(stage&&stage.title));
  await page.evaluate(()=>{const f=S.jobs.find(j=>j.final);S.jobOpen=f.id;render();});
  await page.waitForTimeout(200);
  const st=await page.$eval("body",e=>e.innerText);
  check(st.indexOf("Committee")>=0,"and its brief is its own");
  await page.screenshot({path:OUT+"/06-final-stage-one.png",fullPage:true});

  // the PC minimum width
  await page.setViewportSize({width:960,height:1000});
  await page.evaluate(()=>{render();});
  await page.waitForTimeout(250);
  await page.screenshot({path:OUT+"/07-minw-job.png",fullPage:true});
  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

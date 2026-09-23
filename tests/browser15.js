// Drive build 15 in a real browser: hiring gate, ranking panel, a mid-job twist, a between-jobs event.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots15");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME,args:["--autoplay-policy=no-user-gesture-required"]});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  // career marks and milestones open a box that blocks the page until it is closed, as they do for a player  // A job can also leave somebody outside the crew, and that question blocks the page until it
  // is answered, as it does for a player. These drives are about other screens, so they take the
  // free answer — Let them go — and move on. browser25 is the one that drives the decision.

  const dismissBoxes=async()=>{
    let n=0;
    while(await page.$(".modal.notice")||await page.$('[data-act="loose"]')){
      if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');
      else await page.click('[data-act="loose"][data-i="0"]');
      await page.waitForTimeout(95);
      if(++n>25)break;
    }
    return n;                      // some drives count the boxes they closed
  };
  const click=async(sel,opts)=>{await dismissBoxes();return page.click(sel,opts);};
  await page.goto("file://"+GAME);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await click('[data-act="begin"]');
  await page.fill("#pname","Nissim");
  await click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  // skip the tutorial if it is on
  if(await page.$('[data-act="tut-skip"]'))await click('[data-act="tut-skip"]');
  check(await page.evaluate(()=>/^build \d+ /.test(BUILD)),"footer stamp present");
  // ---- hiring gate on the roster
  await page.evaluate(()=>{S.money=5e6;S.filter.sort="exp";S.tab="roster";save();render();});
  await page.waitForSelector(".cards .id");
  const nosign=await page.$$(".nosign");
  check(nosign.length>0,"roster shows files that won't sign ("+nosign.length+" on the first page)");
  const firstTitle=await page.$eval('.cards .id .nosign',e=>e.getAttribute("title"));
  console.log("    "+firstTitle);
  const disabled=await page.$eval('.cards .id button[data-act="hire"]',b=>b.disabled);
  check(disabled,"Hire is disabled on a Legend for a Nobody crew");
  await page.screenshot({path:OUT+"/01-roster-wont-sign.png"});
  // open the file of one who won't sign
  await click('.cards .id [data-act="open-recruit"]');
  await page.waitForSelector(".modal .warnbox");
  await page.screenshot({path:OUT+"/02-file-wont-sign.png"});
  await page.keyboard.press("Escape");
  // hire four who will
  await page.evaluate(()=>{["wheelman","forger","hacker","enforcer"].forEach(t=>{const c=S.roster.find(c=>c.status==="available"&&c.tech===t&&c.exp<=3&&c.nat!=="Israel");(function(){if(recruits().length<crewSeats()&&canSign(c)){S.money=Math.max(0,S.money-c.fee);c.status="crew";c._touched=true;S.crewIds.push(c.id);stats().hired++;}})();});});
  check(await page.evaluate(()=>recruits().length===4),"four hired");
  // ---- ranking panel on the log
  await page.evaluate(()=>{S.tab="log";SET.folds={op:true,law:true,arrange:true,record:true,recaps:true,caselog:true};render();});
  await page.waitForSelector(".fold-b");
  const rankTxt=(await page.$eval('.fold[data-fold="op"] .fold-b',e=>e.innerText)).toLowerCase();
  const nextRank=await page.evaluate(()=>{const n=rankNext(S.rep);return n?{name:n.name.toLowerCase(),min:n.min}:null;});
  check(rankTxt.indexOf("ranking — what the name buys")>=0&&rankTxt.indexOf("nobody")>=0
    &&rankTxt.indexOf("next: "+nextRank.name+" at "+nextRank.min)>=0,
    "log shows the rank, its perks and the next threshold (next: "+nextRank.name+" at "+nextRank.min+")");
  check(rankTxt.indexOf("the last score")>=0,"and what the last score is still waiting for");
  await page.screenshot({path:OUT+"/03-log-ranking.png",fullPage:true});
  // ---- a job with a twist
  const got=await page.evaluate(()=>{
    const snap=JSON.stringify(packState());let tries=0,d=null,job=null;
    while(!S.pendingJob&&tries++<400){
      localStorage.setItem(SAVE_KEY,snap);load();
      // Since build 88 the game is a function of its seed and the number of draws made, so putting
      // the same save back and starting the same job gives back the same night — every time, by
      // design, which is what stops a save being reloaded until the dice are kind. This loop used
      // to depend on exactly that, and span four hundred times getting the same answer. Moving the
      // draw counter on is asking for a different night from the same position, which is the thing
      // the loop actually wants and can no longer get for free.
      S.rngN=(S.rngN||0)+tries;
      // Under the big-money line: this block is about a single decision settling a job, and a job
      // that goes wrong twice is browser53's subject.
      const runnable=S.jobs.filter(j=>!j.final&&j.payout<=BIG_MONEY&&assessJob(j).canRun&&assessJob(j).team.length>=2);
      if(!runnable.length){S.jobs=[];refreshJobs(true);continue;}
      job=runnable[tries%runnable.length];d=startJob(job);
    }
    if(!S.pendingJob)return null;
    SET.speed=4;saveSettings();
    S.tab="jobs";S.jobOpen=null;S.modal={type:"result",data:d};render();
    return {tries,title:job.title,cat:job.cat,h:pendingTwists(S.pendingJob)[0].h,correct:twistCorrect(pendingTwists(S.pendingJob)[0],assessJob(job).team),of:pendingTwists(S.pendingJob).length};
  });
  check(got&&got.h,"twist job started: "+JSON.stringify(got));
  check(got&&got.of===1,"with one thing going wrong on it, because it is under the line");
  await page.waitForSelector('[data-act="skip-ticker"]');
  const skipTxt=await page.$eval('[data-act="skip-ticker"]',b=>b.innerText);
  check(/^skip\b/i.test(skipTxt.trim()),"the skip button says only \""+skipTxt.trim()+"\"");
  check(!/decision|end|meeting|twist/i.test(skipTxt),"naming no destination, so it does not say in advance what kind of night this is");
  await click('[data-act="skip-ticker"]');
  await page.waitForSelector(".twist-opt");
  const opts=await page.$$(".twist-opt");
  check(opts.length===6,"six options on screen");
  check(!(await page.$('[data-act="skip-ticker"]')),"no skip while the decision waits");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  check(!!(await page.$(".twist-opt")),"Esc does not dismiss the decision");
  await click(".scrim",{position:{x:5,y:5}}).catch(()=>{});
  await page.waitForTimeout(200);
  check(!!(await page.$(".twist-opt")),"clicking outside does not dismiss the decision");
  await page.screenshot({path:OUT+"/04-twist-decision.png"});
  await opts[got.correct].click();
  await page.waitForTimeout(600);
  check(await page.evaluate(()=>S.pendingJob===null&&S.modal.data.resolved===true),"decision taken, job settled, ticker resumes");
  await page.waitForSelector('[data-act="skip-ticker"]');
  await page.screenshot({path:OUT+"/05-twist-resumed.png"});
  await click('[data-act="skip-ticker"]');
  await page.waitForSelector(".verdict-stamp");
  const verdict=(await page.$eval(".modal",e=>e.innerText)).toLowerCase();
  /* The right answer used to have exactly one ending. Now that attributes matter it has two:
     clean, or held together by somebody whose hands were not quite steady enough — so this
     asks for either, and then for the thing that must NEVER appear over a correct answer,
     which is the game telling you what would have set you free when you already did it. */
  const freed=verdict.indexOf("set the crew free")>=0, held=verdict.indexOf("it held, just")>=0;
  check(verdict.indexOf("the twist —")>=0&&verdict.indexOf("you chose:")>=0&&(freed||held),
    "verdict screen explains the twist and the right call ("+(freed?"clean":held?"held — green hands":"NEITHER")+")");
  check(verdict.indexOf("what would have set you free")<0,
    "and a right answer is never told what would have set it free");
  check(["cool under pressure","walked away in one piece","right call, green hands","improvised, and it held"]
    .some(w=>verdict.indexOf("twist: "+w)>=0),"ranking line for the twist");
  await page.screenshot({path:OUT+"/06-twist-verdict.png",fullPage:true});
  // the recap on the log keeps it
  await click('.modal [data-act="scrim"]');
  await page.evaluate(()=>{S.event=null;S.modal=null;S.tab="log";render();});
  await click(".jobrow[data-act=recap]");
  await page.waitForSelector(".verdict-stamp");
  check((await page.$eval(".modal",e=>e.innerText)).toLowerCase().indexOf("the twist —")>=0,"recap keeps the twist");
  await click('.modal [data-act="scrim"]');
  // ---- an event between jobs
  // one week tick does not always raise one — the types rotate and need somebody to happen to.
  // Keep ticking until the board produces one; the test is about the box, not the cadence.
  const gotEvent=await page.evaluate(()=>{
    S.modal=null;S.event=null;S.loose=[];
    for(let i=0;i<60&&!S.event;i++){S.nextTwistWeek=S.week;weekTick(freshRng());}
    S.notices=[];S.loose=[];render();
    return !!S.event;
  });
  check(gotEvent,"an event between jobs");
  await page.waitForSelector('[data-act="event"]');
  const evTitle=await page.$eval(".modal h2",e=>e.innerText);
  console.log("    event: "+evTitle);
  await page.keyboard.press("Escape");await page.waitForTimeout(200);
  check(!!(await page.$('[data-act="event"]')),"Esc does not dismiss an event before the decision");
  await page.screenshot({path:OUT+"/07-event.png"});
  const enabled=await page.$$('[data-act="event"]:not([disabled])');
  await enabled[0].click();
  await page.waitForSelector('[data-act="event-close"]');
  const outcome=await page.$eval(".modal .brief",e=>e.innerText);
  console.log("    outcome: "+outcome);
  await page.screenshot({path:OUT+"/08-event-outcome.png"});
  await click('[data-act="event-close"]');
  await page.waitForTimeout(200);
  // an event that sends somebody away raises the departure question straight after it, which is
  // the point of that question — so "cleared" means the event is gone, not that the screen is empty
  const after=await page.evaluate(()=>({event:S.event,modal:S.modal&&S.modal.type,loose:(S.loose||[]).length}));
  check(after.event===null,"event closed and cleared");
  // "crewname" joined this list when build 96 gave the crew a name: it is queued like any other
  // pop-up and can land in the same gap, which is fine — what this checks is that the event is
  // gone and what replaced it is something the game meant to put there.
  check(["loose","notice","crewname"].indexOf(after.modal)>=0||after.modal===null,
    "and what follows it is a career box, the crew's name, or the question about whoever just left ("+(after.modal||"nothing")+")");
  if(after.modal==="loose")check(after.loose>0,"which is queued against a real departure");
  check(await page.evaluate(()=>S.log.some(l=>l.t.indexOf(" — ")>0&&l.big)),"the event is in the case log");
  // ---- reload mid-decision
  await page.evaluate(()=>{
    const snap=JSON.stringify(packState());let tries=0,d=null;
    while(!S.pendingJob&&tries++<400){localStorage.setItem(SAVE_KEY,snap);load();const r=S.jobs.filter(j=>!j.final&&assessJob(j).canRun&&assessJob(j).team.length>=2);if(!r.length){S.jobs=[];refreshJobs(true);continue;}d=startJob(r[tries%r.length]);}
    S.modal={type:"result",data:d};render();
  });
  await page.reload();
  await click('[data-act="continue"]');
  await page.waitForSelector(".twist-opt");
  check((await page.$$(".twist-opt")).length===6,"after a reload the decision is waiting again");
  await page.screenshot({path:OUT+"/09-reload-decision.png"});
  // the PC minimum width
  await page.setViewportSize({width:960,height:800});
  await page.waitForTimeout(200);
  await page.screenshot({path:OUT+"/10-minw-decision.png",fullPage:true});
  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

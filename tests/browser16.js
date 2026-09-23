// Drive build 16 in a real browser: small-money chip, the bonus, founding a crew, sending it on a job, the music route.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots16");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME,args:["--autoplay-policy=no-user-gesture-required"]});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  // career marks and milestones open a box that blocks the page until it is closed, as they do for a player
  const dismissBoxes=async()=>{let n=0;while(await page.$(".modal.notice")){if(await page.$('[data-act="crewname-later"]')){await page.click('[data-act="crewname-later"]');await page.waitForTimeout(80);continue;}await page.click('[data-act="notice-close"].btn');await page.waitForTimeout(90);if(++n>15)break;}};
  const click=async(sel,opts)=>{await dismissBoxes();return page.click(sel,opts);};
  await page.goto("file://"+GAME);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await click('[data-act="begin"]');
  await page.fill("#pname","Nissim");
  await click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await click('[data-act="tut-skip"]');
  check(await page.evaluate(()=>/^build \d+ /.test(BUILD)),"footer stamp present: "+await page.evaluate(()=>BUILD));
  // the loop is cued and playing after the first click
  await page.waitForTimeout(800);
  const mus=await page.evaluate(()=>({src:musicWant&&musicWant.src,loop:musicWant&&musicWant.loop,state:musicState,note:musicNote}));
  console.log("    music: "+JSON.stringify(mus));
  check(mus.src==="music/ambient.mp3"&&mus.loop===true,"the loop is cued under the crew board");
  check(mus.state==="playing","the loop is playing ("+mus.state+(mus.note?" — "+mus.note:"")+")");
  // hire, then the money chip on a job file
  await page.evaluate(()=>{S.money=5e6;["wheelman","forger","hacker","enforcer"].forEach(t=>{const c=S.roster.find(c=>c.status==="available"&&c.tech===t&&c.exp<=3&&c.nat!=="Israel");(function(){const _c=c;if(_c&&recruits().length<crewSeats()&&canSign(_c)){S.money=Math.max(0,S.money-_c.fee);_c.status="crew";_c._touched=true;S.crewIds.push(_c.id);stats().hired++;}})();});recruits()[0].upkeep=60000;S.tab="jobs";S.jobOpen=S.jobs.find(j=>!j.final&&assessJob(j).team.some(c=>c.id===recruits()[0].id)).id;render();});
  await page.waitForSelector(".tag.no");
  const chipTxt=await page.$$eval(".tag",els=>els.map(e=>e.getAttribute("data-tip")||"").find(t=>t.indexOf("small money")>=0)||"");
  check(chipTxt.indexOf("call this small money")>=0,"job file: the money chip — "+chipTxt.slice(0,80));
  await page.screenshot({path:OUT+"/01-job-money-chip.png"});
  // crew tab: bonus, locked seats
  await page.evaluate(()=>{recruits()[0].upkeep=2000;S.tab="crew";render();});
  await page.waitForSelector('[data-act="bonus"]');
  check(await page.evaluate(()=>{const t=document.body.innerText.toLowerCase();return t.indexOf("locked")>=0&&t.indexOf("5 places")>=0;}),"crew tab: five places, two locked");
  await click('[data-act="bonus"]');
  await page.waitForTimeout(300);
  check(await page.evaluate(()=>paidUp(recruits()[0])&&document.body.innerText.toLowerCase().indexOf("paid up · to wk")>=0),"bonus marks the member paid up");
  await page.screenshot({path:OUT+"/02-crew-paid-up.png"});
  // founding: week 104, Feared, seven on the crew
  await page.evaluate(()=>{S.week=104;S.rep=80;const cm=S.roster.find(c=>c.status==="available"&&c.role==="commander"&&c.exp<=3&&c.nat!=="Israel");(function(){const _c=cm;if(_c&&recruits().length<crewSeats()&&canSign(_c)){S.money=Math.max(0,S.money-_c.fee);_c.status="crew";_c._touched=true;S.crewIds.push(_c.id);stats().hired++;}})();(function(){const _c=S.roster.find(c=>c.status==="available"&&c.exp<=3&&c.nat!=="Israel"&&c.role!=="commander");if(_c&&recruits().length<crewSeats()&&canSign(_c)){S.money=Math.max(0,S.money-_c.fee);_c.status="crew";_c._touched=true;S.crewIds.push(_c.id);stats().hired++;}})();S.tab="crew";render();});
  /* Milestone boxes come first (the seats, then the second crew): read them, then Later.
     Not every notice closes with notice-close. Winding the clock to week 104 with a grown crew
     also brings up "What are you called?", which closes with crewname-later — and this loop used
     to wait thirty seconds for a button that box does not have, and then die. That death was
     bundled into the same red line as the music failure and went unlooked-at for months, which
     is the argument against ever letting a test sit permanently red. It closes whichever button
     the box actually carries now, and gives up loudly rather than hanging on a box it cannot. */
  let boxes=0;
  while(await page.$(".modal.notice")){
    const t=await page.$eval(".modal.notice h2",e=>e.innerText);
    const shut=await page.$('[data-act="notice-close"].btn')||await page.$('[data-act="crewname-later"]');
    if(!shut){console.log("    milestone box with no way to close it: "+t);break;}
    boxes++;console.log("    milestone box: "+t);
    await shut.click();await page.waitForTimeout(150);
  }
  check(boxes>=2,boxes+" milestone boxes announced, ending with the second crew");
  await page.waitForSelector('[data-act="found-open"]');
  check(await page.$eval('[data-act="found-open"]',b=>!b.disabled),"Found a crew is enabled");
  await page.screenshot({path:OUT+"/03-crew-can-found.png",fullPage:true});
  await click('[data-act="found-open"]');
  await page.waitForSelector('[data-act="found-lead"]');
  await click('[data-act="found-lead"]');
  const picks=await page.$$('[data-act="found-pick"]');
  for(let i=0;i<4;i++){await click('[data-act="found-pick"]:not(.on):not([disabled])');await page.waitForTimeout(80);}
  check(await page.$eval('[data-act="found-go"]',b=>!b.disabled),"commander and four soldiers picked");
  await page.screenshot({path:OUT+"/04-found-modal.png"});
  await click('[data-act="found-go"]');
  await page.waitForTimeout(300);
  const crewName=await page.evaluate(()=>crews().length===1?crews()[0].name:null);
  check(!!crewName,"crew founded: "+crewName);
  check(await page.evaluate(()=>recruits().length===1),"your crew keeps one soldier");
  await page.screenshot({path:OUT+"/05-crew-founded.png",fullPage:true});
  // send them on a job
  const jid=await page.evaluate(()=>{S.jobs=[];refreshJobs(true);const cr=crews()[0];const j=S.jobs.find(j=>!j.final&&assessJob(j,crewMembers(cr)).canRun);S.tab="jobs";S.jobOpen=j?j.id:null;render();return j?j.id:null;});
  check(!!jid,"a job the crew can run");
  await page.waitForSelector('[data-act="execute-crew"]');
  await page.screenshot({path:OUT+"/06-job-other-crews.png",fullPage:true});
  const weekBefore=await page.evaluate(()=>S.week);
  await click('[data-act="execute-crew"]:not([disabled])');
  await page.waitForSelector('[data-act="skip-ticker"]');
  const kicker=await page.$eval(".modal .kicker",e=>e.innerText);
  check(kicker.toLowerCase().indexOf(crewName.toLowerCase())>=0,"their report runs under their name: "+kicker);
  const musRep=await page.evaluate(()=>musicWant&&musicWant.src);
  check(/music\/report-\d+\.mp3/.test(musRep),"the report has its own track: "+musRep);
  await page.screenshot({path:OUT+"/07-crew-report-live.png"});
  await click('[data-act="skip-ticker"]');
  await page.waitForSelector(".verdict-stamp");
  const musVer=await page.evaluate(()=>musicWant&&musicWant.src);
  check(/music\/result-/.test(musVer),"the verdict has its own track: "+musVer);
  await page.screenshot({path:OUT+"/08-crew-report-verdict.png",fullPage:true});
  await click('.modal [data-act="scrim"]');
  await page.waitForTimeout(300);
  check(await page.evaluate(()=>S.week)===weekBefore,"their job did not spend your week");
  check(await page.evaluate(()=>musicWant&&musicWant.src==="music/ambient.mp3"),"back to the loop after the verdict");
  check(await page.evaluate(()=>crews()[0].jobWeek===S.week),"the crew is busy for the week");
  await page.evaluate(()=>{S.event=null;S.modal=null;S.tab="log";SET.folds={op:true,law:true,arrange:true,record:true,recaps:true,caselog:true};render();});
  await page.waitForSelector(".jobrow[data-act=recap]");
  check(await page.$eval(".jobrow[data-act=recap]",(e,name)=>e.innerText.toLowerCase().indexOf(name.toLowerCase())>=0,crewName),"recap on the log carries the crew's name");
  await page.screenshot({path:OUT+"/09-log-crew-recap.png"});
  // the office radio says what is on
  await dismissBoxes();
  await page.evaluate(()=>{S.event=null;S.modal=null;S.jobOpen=null;UI.office=true;UI.panel=null;render();});
  await page.waitForSelector(".office-svg");
  await page.waitForTimeout(300);
  const radio=await page.evaluate(()=>document.body.innerText);
  check(radio.indexOf("Now playing")>=0||radio.indexOf("Radio ready")>=0,"office radio reports the loop");
  await page.screenshot({path:OUT+"/10-office-radio.png"});
  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

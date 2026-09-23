// Build 20 in a real browser: benching, the record, the arrangements, the rival, traits, the file cabinet.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots20");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+GAME);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Nissim");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  check(await page.evaluate(()=>/^build \d+ · /.test(BUILD)),"footer stamp present");  // A job can also leave somebody outside the crew, and that question blocks the page until it
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
  // hire a crew
  await page.evaluate(()=>{S.money=3e6;["wheelman","forger","hacker","enforcer"].forEach(t=>{const c=S.roster.find(c=>c.status==="available"&&c.tech===t&&c.exp<=3&&c.nat!=="Israel");(function(){if(recruits().length<crewSeats()&&canSign(c)){S.money=Math.max(0,S.money-c.fee);c.status="crew";c._touched=true;S.crewIds.push(c.id);stats().hired++;}})();});render();});
  const boxes=await dismiss();
  check(boxes>0,boxes+" career boxes announced by the money and the seats");
  // --- benching on the job file
  const jid=await page.evaluate(()=>{const j=S.jobs.find(x=>!x.final&&assessJob(x).team.length>=3);S.tab="jobs";S.jobOpen=j?j.id:null;render();return j?j.id:null;});
  check(!!jid,"a job with a team of three or more");
  await page.waitForSelector('[data-act="bench"]');
  const teamBefore=await page.evaluate(()=>assessJob(S.jobs.find(j=>j.id===S.jobOpen),jobPool(S.jobs.find(j=>j.id===S.jobOpen))).team.length);
  await page.screenshot({path:OUT+"/01-job-who-goes.png",fullPage:true});
  await page.click('.check:not(.out) [data-act="bench"]');
  await page.waitForTimeout(200);
  const teamAfter=await page.evaluate(()=>assessJob(S.jobs.find(j=>j.id===S.jobOpen),jobPool(S.jobs.find(j=>j.id===S.jobOpen))).team.length);
  check(teamAfter===teamBefore-1,"benching one drops the team from "+teamBefore+" to "+teamAfter);
  check((await page.$eval("body",e=>e.innerText)).toLowerCase().indexOf("stays in the split")>=0,"and the panel says what it saves");
  await page.screenshot({path:OUT+"/02-benched.png",fullPage:true});
  await page.click('[data-act="bench-clear"]');
  await page.waitForTimeout(200);
  check(await page.evaluate(()=>!S.bench||!S.bench.length),"Send everyone puts them back");
  // --- the record and the arrangements
  await page.evaluate(()=>{S.tab="log";SET.folds={op:true,law:true,arrange:true,record:true,recaps:true,caselog:true};S.modal=null;render();});
  await page.waitForSelector('[data-act="retainer"]');
  const logTxt=(await page.$eval("body",e=>e.innerText)).toLowerCase();
  check(logTxt.indexOf("the record")>=0&&logTxt.indexOf("standing arrangements")>=0,"the log carries the record and the arrangements");
  await page.screenshot({path:OUT+"/03-log-record.png",fullPage:true});
  await page.click('[data-act="retainer"][data-k="lawyer"]');
  await page.waitForTimeout(250);
  check(await page.evaluate(()=>hasRetainer("lawyer")),"the lawyer goes on the books");
  await page.click('[data-act="safehouse"]');
  await page.waitForTimeout(250);
  check(await page.evaluate(()=>safehouseLevel()===1&&heatDrop()===7),"the first safe house is bought");
  await dismiss();
  await page.screenshot({path:OUT+"/04-arrangements.png",fullPage:true});
  // --- the rival and the detective
  await page.evaluate(()=>{S.rep=30;S.heat=45;S.event=null;S.modal=null;weekTick(freshRng());render();});
  await dismiss();
  await page.evaluate(()=>{S.tab="log";SET.folds={op:true,law:true,arrange:true,record:true,recaps:true,caselog:true};S.modal=null;S.event=null;render();});
  await page.waitForSelector('[data-act="rival-buy"]');
  const rv=await page.evaluate(()=>({n:rival()&&rival().name,b:rival()&&rival().boss,d:detective()&&detective().name}));
  check(rv.n&&rv.b,"a rival outfit is working the board: "+rv.n+" ("+rv.b+")");
  await page.screenshot({path:OUT+"/05-competition.png",fullPage:true});
  await page.click('[data-act="rival-buy"]');
  await page.waitForTimeout(250);
  check(await page.evaluate(()=>S.log.some(l=>l.t.indexOf("Bought a name inside")===0)),"buying a name inside works");
  // --- traits and bonds on the crew cards
  await page.evaluate(()=>{S.jobOpen=null;const a=recruits()[0],b=recruits()[1];a.traits=["hothead"];b.traits=["careful","ghost"];S.bonds={};S.bonds[bondKey(a.id,b.id)]=2;S.tab="crew";S.modal=null;render();});
  const crewTxt=(await page.$eval("body",e=>e.innerText)).toLowerCase();
  check(crewTxt.indexOf("hothead")>=0&&crewTxt.indexOf("careful")>=0,"traits show on the crew cards");
  check(crewTxt.indexOf("works well with")>=0,"and so does the bond");
  await page.screenshot({path:OUT+"/06-crew-traits.png",fullPage:true});
  // --- the file cabinet
  await dismiss();
  const blocking=await page.evaluate(()=>({modal:S.modal&&S.modal.type,event:!!S.event,office:UI.office}));
  console.log("    before Escape: "+JSON.stringify(blocking));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  if(!(await page.$('.office-svg [data-act="off-cabinet"]'))){
    console.log("    Escape did not open the office ("+JSON.stringify(await page.evaluate(()=>({modal:S.modal&&S.modal.type,event:!!S.event,office:UI.office})))+") — opening it directly");
    await page.evaluate(()=>{S.event=null;S.modal=null;UI.office=true;UI.panel=null;render();});
  }
  await page.waitForSelector('.office-svg [data-act="off-cabinet"]');
  await page.screenshot({path:OUT+"/07-office.png"});
  await page.click('.office-svg [data-act="off-cabinet"]');
  await page.waitForSelector("#expCode");
  const code=await page.$eval("#expCode",e=>e.value);
  check(code.indexOf("CREW1:")===0&&code.length>1000,"the office writes the game out ("+code.length+" characters)");
  await page.screenshot({path:OUT+"/08-file-cabinet.png"});
  await page.fill("#impCode",code);
  await page.click('[data-act="imp-read"]');
  await page.waitForTimeout(250);
  check((await page.$eval("body",e=>e.innerText)).toLowerCase().indexOf("this file is")>=0,"pasting and reading names the file before loading");
  await page.screenshot({path:OUT+"/09-file-read.png"});
  // wipe the browser and load the code back
  const week=await page.evaluate(()=>S.week);
  await page.evaluate(()=>{try{localStorage.removeItem(SAVE_KEY);}catch(e){}});
  await page.reload();
  await page.waitForSelector('[data-act="begin"]');
  check(!(await page.$('[data-act="continue"]')),"the browser has no saved game after the wipe");
  await page.evaluate(()=>{UI.office=true;UI.panel="cabinet";render();});
  await page.waitForSelector("#impCode");
  await page.fill("#impCode",code);
  await page.click('[data-act="imp-read"]');
  await page.waitForTimeout(200);
  await page.click('[data-act="imp-load"]');
  await page.waitForTimeout(600);
  await dismiss();
  check(await page.evaluate(w=>S&&S.week===w&&S.player.n==="Nissim",week),"the code brings the game back into an empty browser");
  await page.screenshot({path:OUT+"/10-restored.png",fullPage:true});
  // the PC minimum width
  await page.setViewportSize({width:960,height:900});
  await page.evaluate(()=>{UI.office=false;UI.panel=null;S.tab="log";SET.folds={op:true,law:true,arrange:true,record:true,recaps:true,caselog:true};S.modal=null;render();});
  await page.waitForTimeout(300);
  await page.screenshot({path:OUT+"/11-minw-log.png",fullPage:true});
  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

// Build 71: the i button explains what is actually on the screen. Not "the board" in general —
// every box the screen puts in front of somebody, by the name printed on it.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots71");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)
  ||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
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
  await page.evaluate(()=>{
    S.money=5e6;
    S.roster.filter(c=>c.status==="available"&&canSign(c)&&!c.limits.length).slice(0,4)
      .forEach(c=>{c.status="crew";c._touched=true;S.crewIds.push(c.id);});
    S.notices=[];S.modal=null;S.clash=null;S.tab="jobs";S.jobOpen=null;render();});
  await page.waitForTimeout(350);await drain();
  await page.evaluate(()=>{S.clash=null;S.modal=null;S.tab="jobs";S.jobOpen=null;render();});
  await page.waitForTimeout(300);

  const openInfo=async()=>{await page.click(".ibtn");await page.waitForTimeout(300);
    const t=(await page.textContent(".info-b")).replace(/\s+/g," ");
    await page.click('[data-act="info-close"].btn');await page.waitForTimeout(200);return t;};

  console.log("\n— the board —");
  const boxes=await page.$$eval(".panel .panel-h h2",e=>e.map(x=>x.textContent.trim()));
  check(boxes.length>=2,"the board puts "+boxes.length+" boxes on screen: "+boxes.join(" / "));
  const info=await openInfo();
  check(info.length>400,"the i button has something to say about it ("+info.length+" characters)");
  check(/Quick Money - High Risk/i.test(info),"and it explains the quick money box by its name");
  check(/one soldier/i.test(info)&&/no crew/i.test(info),"saying what it is: one soldier, no crew");
  check(/one a week/i.test(info),"that it is one a week");
  check(/hurt|held/i.test(info),"and what it costs when it goes wrong");
  // the general rule, which is what stops the next box being added without a word about it
  const named=(heading,text)=>{
    const esc=w=>w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    if(new RegExp(esc(heading),"i").test(text))return true;
    const words=heading.replace(/[·—–-]/g," ").split(/\s+/).filter(w=>w.length>2&&!/^(the|and|for|off)$/i.test(w));
    return words.length>0&&words.some(w=>new RegExp(esc(w),"i").test(text));};
  const unexplained=boxes.filter(b=>!named(b,info));
  check(unexplained.length===0,"every box on the board is named in what the i button says"
    +(unexplained.length?", missing: "+unexplained.join(", "):""));
  await page.screenshot({path:path.join(OUT,"1-jobs-info.png"),fullPage:false});

  console.log("\n— a job file —");
  await page.evaluate(()=>{const j=(S.jobs||[]).find(x=>!x.final);S.jobOpen=j?j.id:null;render();});
  await page.waitForTimeout(300);
  const jinfo=await openInfo();
  check(jinfo!==info,"the i button says something different about a job file");
  check(/back to job postings/i.test(jinfo),"and explains the way back, which is pinned now");
  check(/↑|back to the top/i.test(jinfo),"and the way back to the top");

  console.log("\n— and it is about this screen, not the last one —");
  await page.evaluate(()=>{S.jobOpen=null;S.tab="crew";render();});
  await page.waitForTimeout(300);
  const cinfo=await openInfo();
  check(cinfo!==info&&cinfo!==jinfo,"the crew screen gets its own");
  check(/teach a trade/i.test(cinfo),"and explains teaching somebody a trade, which happens on it");
  check(/two of the same trade/i.test(cinfo),"and the argument two of a trade start");
  // the same rule as the board: every box this screen puts up is named in what the i button says
  const cboxes=await page.$$eval(".panel .panel-h h2",e=>e.map(x=>x.textContent.trim()));
  const cmiss=cboxes.filter(b=>!named(b,cinfo));
  check(cmiss.length===0,"and every box on the crew screen is named too"
    +(cmiss.length?", missing: "+cmiss.join(", "):""));

  console.log("\n— and every screen that can be put in front of you —");
  // The i button reads the modal's type as its key and falls back to the TITLE SCREEN's text when
  // there is no card for it. Seven modals were showing the title screen's words; nothing noticed,
  // because the i button still opened and still said something.
  const gaps=await page.evaluate(()=>{
    const types=[];
    const seen={};
    ["apply","clash","talk","tutor","street","streetdone","grudge","news","notice","loose","revenge","event",
     "trip","recruit","result","found"].forEach(t=>{if(!seen[t]){seen[t]=1;types.push(t);}});
    return types.filter(t=>!INFO[t]);});
  check(gaps.length===0,"every screen the game can put in front of you has its own explanation"
    +(gaps.length?", falling back to the title screen: "+gaps.join(", "):""));
  const rosterInfo=await page.evaluate(()=>{S.modal=null;S.jobOpen=null;S.tab="roster";render();return null;});
  const rinfo=await openInfo();
  check(/clock stands still/i.test(rinfo),"the roster's card says the first week costs no weeks");
  check(/money, never time/i.test(rinfo),"and that the fee is still paid — the week is what is free, not the hire");
  check(/coming to you/i.test(rinfo),"and that people start coming to you further up the ladder");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})();

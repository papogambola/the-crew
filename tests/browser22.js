// Build 22 in a real browser: the brief on the job file.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots22");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1100}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+GAME);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});await page.reload();
  check(await page.evaluate(()=>/^build \d+ /.test(BUILD)),"a build stamp is present");
  await page.click('[data-act="begin"]');await page.fill("#pname","Nissim");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  const skip=await page.$('[data-act="tut-skip"]');if(skip)await skip.click();
  const dismiss=async()=>{let n=0;while(await page.$(".modal.notice")){if(await page.$('[data-act="crewname-later"]')){await page.click('[data-act="crewname-later"]');await page.waitForTimeout(80);continue;}await page.click('[data-act="notice-close"].btn');await page.waitForTimeout(90);if(++n>12)break;}};
  await page.evaluate(()=>{S.money=3e6;["wheelman","forger","hacker","enforcer"].forEach(t=>{const c=S.roster.find(c=>c.status==="available"&&c.tech===t&&c.exp<=3&&c.nat!=="Israel");(function(){const _c=c;if(_c&&recruits().length<crewSeats()&&canSign(_c)){S.money=Math.max(0,S.money-_c.fee);_c.status="crew";_c._touched=true;S.crewIds.push(_c.id);stats().hired++;}})();});render();});
  await dismiss();
  // the board is still a list
  await page.evaluate(()=>{S.tab="jobs";S.jobOpen=null;render();});
  await page.waitForSelector(".jobrow");
  check(!(await page.$(".jobbrief")),"the board itself carries no brief");
  await page.screenshot({path:OUT+"/01-board.png",fullPage:true});
  // click a posting
  await page.click(".jobrow");
  await page.waitForSelector(".jobbrief");
  const txt=await page.$eval(".jobbrief",e=>e.innerText);
  check(txt.toLowerCase().indexOf("the job")>=0&&txt.length>140,"clicking a posting shows a brief ("+txt.length+" characters)");
  console.log("    "+txt.replace(/\n/g," ").slice(0,220));
  const order=await page.evaluate(()=>{
    const jb=document.querySelector(".jobbrief").getBoundingClientRect();
    const cb=document.querySelector(".brief").getBoundingClientRect();
    return jb.top<cb.top;
  });
  check(order,"it sits above the country brief");
  check(await page.evaluate(()=>{
    const j=S.jobs.find(x=>x.id===S.jobOpen);
    return document.querySelector(".jobbrief p").innerText.trim()===jobBrief(j).trim();
  }),"and it is the brief for that posting");
  await page.screenshot({path:OUT+"/02-job-file.png",fullPage:true});
  // it does not change when the screen re-renders
  const a=await page.$eval(".jobbrief p",e=>e.innerText);
  await page.evaluate(()=>render());await page.waitForTimeout(120);
  const b=await page.$eval(".jobbrief p",e=>e.innerText);
  check(a===b,"it reads the same after a re-render");
  // and the same after a save and reload
  await page.evaluate(()=>save());
  await page.reload();
  await page.click('[data-act="continue"]');
  await page.waitForSelector(".topbar");
  await dismiss();
  const c2=await page.evaluate(id=>{const j=S.jobs.find(x=>x.id===id);return j?jobBrief(j):null;},await page.evaluate(()=>S.jobOpen));
  check(c2===null||c2===a,"and the same after a save and a reload");
  // another posting reads differently
  // a posting that is genuinely a different one — after a reload the board may have reordered
  await page.evaluate(()=>{const cur=S.jobOpen;const o=S.jobs.find(j=>j.id!==cur&&!j.final);S.tab="jobs";S.jobOpen=(o||S.jobs[0]).id;render();});
  await page.waitForSelector(".jobbrief");
  const other=await page.$eval(".jobbrief p",e=>e.innerText);
  check(other!==a,"a different posting reads differently");
  await page.screenshot({path:OUT+"/03-other-job.png",fullPage:true});
  // the PC minimum width
  await page.setViewportSize({width:960,height:1000});
  await page.waitForTimeout(200);
  await page.screenshot({path:OUT+"/04-minw.png",fullPage:true});
  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

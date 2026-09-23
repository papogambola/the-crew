// Build 18 in a real browser: the full tutorial on a first game, the reminder on the second sitting.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots18");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  const url="file://"+GAME;
  await page.goto(url);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  check(await page.evaluate(()=>/^build \d+ /.test(BUILD)),"footer stamp present");
  await page.click('[data-act="begin"]');await page.fill("#pname","Nissim");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".tut-card");
  const c1=await page.$eval(".tut-card",e=>e.innerText);
  check(c1.toLowerCase().indexOf("tutorial · 1 of 11")>=0,"first game: the full tutorial opens ("+c1.split("\\n")[0]+")");
  await page.screenshot({path:OUT+"/01-first-tutorial.png"});
  // walk every card with Next
  let n=1;while(await page.$('[data-act="tut-next"]')){const t=await page.$eval('[data-act="tut-next"]',b=>b.innerText);await page.click('[data-act="tut-next"]');await page.waitForTimeout(120);if(t.toLowerCase().indexOf("finish")>=0)break;n++;if(n>20)break;}
  check(n===11&&!(await page.$(".tut-card")),"eleven cards, then it closes");
  await page.screenshot({path:OUT+"/02-after-tutorial.png"});
  // half an hour later: reload, Continue → the reminder
  await page.evaluate(()=>{SET.lastSeen=Date.now()-PLAY_GAP_MS-1000;saveSettings();});
  await page.reload();
  check(await page.evaluate(()=>SET.plays===2),"the return counts as the second sitting");
  await page.click('[data-act="continue"]');
  await page.waitForSelector(".tut-card");
  const r1=await page.$eval(".tut-card",e=>e.innerText);
  check(r1.toLowerCase().indexOf("reminder · 1 of 5")>=0&&r1.toLowerCase().indexOf("welcome back")>=0,"second sitting: the reminder opens on Continue");
  await page.screenshot({path:OUT+"/03-reminder.png"});
  await page.click('[data-act="tut-skip"]');
  await page.waitForTimeout(150);
  check(await page.evaluate(()=>!TUT.on&&SET.reminderDone===true),"Skip ends it and marks it done");
  // third sitting: nothing
  await page.evaluate(()=>{SET.lastSeen=Date.now()-PLAY_GAP_MS-1000;saveSettings();});
  await page.reload();
  await page.click('[data-act="continue"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  await page.waitForTimeout(300);
  check(!(await page.$(".tut-card")),"third sitting: no tutorial");
  // the i button offers both
  await page.keyboard.press("i");
  await page.waitForSelector('[data-act="tut-remind"]');
  await page.screenshot({path:OUT+"/04-info-both.png"});
  await page.click('[data-act="tut-remind"]');
  await page.waitForSelector(".tut-card");
  check((await page.$eval(".tut-card",e=>e.innerText)).toLowerCase().indexOf("reminder")>=0,"the reminder can be run again from the i button");
  await page.click('[data-act="tut-skip"]');await page.waitForTimeout(150);
  // the office clipboard: any card, whenever
  await page.keyboard.press("Escape");
  await page.waitForSelector('.office-svg [data-act="off-tutor"]');
  await page.screenshot({path:OUT+"/05-office-clipboard.png"});
  await page.click('.office-svg [data-act="off-tutor"]');
  await page.waitForSelector('[data-act="tut-jump"]');
  check((await page.$$('[data-act="tut-jump"]')).length===11,"the clipboard lists all eleven cards");
  await page.screenshot({path:OUT+"/06-recap-panel.png"});
  await page.click('[data-act="tut-jump"][data-i="8"]');
  await page.waitForSelector(".tut-card");
  const jc=await page.$eval(".tut-card",e=>e.innerText);
  check(jc.toLowerCase().indexOf("9 of 11")>=0&&jc.toLowerCase().indexOf("the reckoning")>=0&&await page.evaluate(()=>S.tab==="jobs"&&!!S.jobOpen&&!UI.office),"jumping to card nine opens the job file and leaves the office");
  await page.screenshot({path:OUT+"/07-jumped-card.png"});
  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

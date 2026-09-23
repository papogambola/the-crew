// Build 17 in a real browser: the milestone box, centred, and the way into founding.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots17");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  // career marks and milestones open a box that blocks the page until it is closed, as they do for a player
  const surface=async(title)=>{for(let i=0;i<15;i++){const t=await page.$eval('.modal.notice h2',e=>e.innerText).catch(()=>null);if(t===null)return false;if(t.toLowerCase().indexOf(title.toLowerCase())>=0)return true;await page.click('[data-act="notice-close"].btn');await page.waitForTimeout(90);}return false;};
  const dismissBoxes=async()=>{let n=0;while(await page.$(".modal.notice")){if(await page.$('[data-act="crewname-later"]')){await page.click('[data-act="crewname-later"]');await page.waitForTimeout(80);continue;}await page.click('[data-act="notice-close"].btn');await page.waitForTimeout(90);if(++n>15)break;}};
  const click=async(sel,opts)=>{await dismissBoxes();return page.click(sel,opts);};
  await page.goto("file://"+GAME);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await click('[data-act="begin"]');await page.fill("#pname","Nissim");await click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);if(await page.$('[data-act="tut-skip"]'))await click('[data-act="tut-skip"]');
  check(await page.evaluate(()=>/^build \d+ /.test(BUILD)),"footer stamp present");
  await page.evaluate(()=>{S.money=5e6;S.rep=60;render();});
  await page.waitForSelector(".modal.notice");
  const box=await page.$eval(".modal.notice",e=>{const r=e.getBoundingClientRect();return {cx:r.left+r.width/2,cy:r.top+r.height/2,w:r.width,h:r.height,text:e.innerText};});
  check(Math.abs(box.cx-640)<4&&Math.abs(box.cy-450)<40,"the box sits in the middle of the screen ("+Math.round(box.cx)+","+Math.round(box.cy)+")");
  check(await surface("Two more seats"),"seats milestone announced");
  await page.waitForTimeout(500);
  const op=await page.$eval(".modal.notice",e=>getComputedStyle(e).opacity+"/"+getComputedStyle(e).backgroundColor);
  check(op.indexOf("1/")===0,"the box is solid once the fade-in ends ("+op+")");
  await page.screenshot({path:OUT+"/01-seats-milestone.png"});
  await page.click('[data-act="notice-go"]');
  await page.waitForTimeout(200);
  check(await page.evaluate(()=>S.tab==="roster"),"To the roster goes to the roster");
  await page.evaluate(()=>{["wheelman","forger","hacker","enforcer"].forEach(t=>{const c=S.roster.find(c=>c.status==="available"&&c.tech===t&&c.exp<=3&&c.nat!=="Israel");(function(){const _c=c;if(_c&&recruits().length<crewSeats()&&canSign(_c)){S.money=Math.max(0,S.money-_c.fee);_c.status="crew";_c._touched=true;S.crewIds.push(_c.id);stats().hired++;}})();});S.week=EXTRA_CREW_WEEKS[0];S.rep=70;render();});
  await page.waitForSelector(".modal.notice");
  // Read off the constant and spelled out: a threshold of 52 announces "A year in".
  const yearMark=await page.evaluate(()=>cap(yearsIn(EXTRA_CREW_WEEKS[0]))+" in");
  check(await surface(yearMark),"year mark announced with what is missing: \""+yearMark+"\"");
  await page.screenshot({path:OUT+"/02-year-mark.png"});
  await page.keyboard.press("Escape");await page.waitForTimeout(200);
  /* What is under the last milestone box is the week's news, and under THAT, since build 96,
     the crew asking for a name — both queue behind the milestones. So "Esc closed the box on
     top" is: no box left, or another box, or one of those two waiting its turn. */
  const under=await page.evaluate(()=>({modal:S.modal&&S.modal.type,queued:(S.notices||[]).length}));
  check(!under.modal||under.queued>0||under.modal==="news"||under.modal==="crewname",
    "Esc closes the box on top (under it: "+(under.modal||"nothing")+", "+under.queued+" queued)");
  await page.evaluate(()=>{
    if(S.modal&&S.modal.type==="news"){S.news.seen=true;S.modal=null;render();}
    if(S.modal&&S.modal.type==="crewname"){crewNameLater();render();}
  });
  await page.waitForTimeout(150);
  await page.evaluate(()=>{S.rep=80;const cm=S.roster.find(c=>c.status==="available"&&c.role==="commander"&&c.exp<=3&&c.nat!=="Israel");(function(){const _c=cm;if(_c&&recruits().length<crewSeats()&&canSign(_c)){S.money=Math.max(0,S.money-_c.fee);_c.status="crew";_c._touched=true;S.crewIds.push(_c.id);stats().hired++;}})();(function(){const _c=S.roster.find(c=>c.status==="available"&&c.exp<=3&&c.nat!=="Israel"&&c.role!=="commander");if(_c&&recruits().length<crewSeats()&&canSign(_c)){S.money=Math.max(0,S.money-_c.fee);_c.status="crew";_c._touched=true;S.crewIds.push(_c.id);stats().hired++;}})();render();});
  await page.waitForSelector(".modal.notice");
  check(await surface("A second crew"),"second crew announced when it can be founded");
  await page.waitForTimeout(500);await page.screenshot({path:OUT+"/03-second-crew.png"});
  await page.click('[data-act="notice-go"]');
  await page.waitForSelector('[data-act="found-lead"]');
  check(true,"the button opens the founding modal");
  await page.screenshot({path:OUT+"/04-into-founding.png"});
  await page.setViewportSize({width:960,height:800});
  await page.evaluate(()=>{UI.found=null;S.modal=null;S.milestones={};S.notices=[];S.rep=60;render();});
  await page.waitForSelector(".modal.notice");
  await page.waitForTimeout(500);await page.screenshot({path:OUT+"/05-minw.png"});
  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

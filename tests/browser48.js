// Build 70: a long job file has a way back to the top, and the way back to the postings does not
// scroll away with it. Both are about the same thing: on a screen taller than the window, the two
// ways out of it should not be the part that has scrolled off.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots70");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)
  ||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:760}});   // a window a job file is taller than
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
    S.notices=[];S.modal=null;S.clash=null;S.tab="jobs";render();});
  await page.waitForTimeout(300);await drain();
  await page.evaluate(()=>{S.clash=null;S.modal=null;S.tab="jobs";
    const j=(S.jobs||[]).find(x=>!x.final);S.jobOpen=j?j.id:null;render();});
  await page.waitForTimeout(350);

  console.log("\n— a job file taller than the window —");
  const tall=await page.evaluate(()=>({doc:document.documentElement.scrollHeight,win:window.innerHeight}));
  check(tall.doc>tall.win+200,"the file is longer than the screen ("+tall.doc+" against "+tall.win+")");
  check(!!(await page.$(".jobback")),"and the way back to the postings is on it");

  console.log("\n— before scrolling —");
  const up0=await page.evaluate(()=>{const b=document.querySelector(".totop");
    return b?{there:true,vis:getComputedStyle(b).opacity!=="0",pe:getComputedStyle(b).pointerEvents}:{there:false};});
  check(up0.there,"the way up exists from the start");
  check(!up0.vis&&up0.pe==="none","and is out of the way while there is nothing above you");

  console.log("\n— scrolled to the reckoning —");
  await page.evaluate(()=>window.scrollTo(0,900));
  await page.waitForTimeout(350);
  const mid=await page.evaluate(()=>{
    const b=document.querySelector(".totop"),back=document.querySelector(".jobback");
    const rb=b.getBoundingClientRect(),rk=back.getBoundingClientRect();
    const tabs=document.querySelector(".tabs").getBoundingClientRect();
    return {y:Math.round(window.scrollY),
      upVis:getComputedStyle(b).opacity!=="0",
      upRight:Math.round(window.innerWidth-rb.right),
      upOnScreen:rb.top>=0&&rb.bottom<=window.innerHeight,
      backTop:Math.round(rk.top),backOnScreen:rk.top>=0&&rk.bottom<=window.innerHeight,
      backUnderTabs:rk.top>=tabs.bottom-2,
      backText:back.innerText.replace(/\s+/g," ").trim()};});
  check(mid.upVis,"the way up appears once you are down the page ("+mid.y+"px)");
  check(mid.upRight<60&&mid.upRight>=0,"on the right of the screen ("+mid.upRight+"px from the edge)");
  check(mid.upOnScreen,"and inside the window, not off the bottom of it");
  check(mid.backOnScreen,"the way back to the postings is still on screen at "+mid.y+"px down");
  check(mid.backUnderTabs,"pinned under the tabs rather than over them ("+mid.backTop+"px from the top)");
  check(/back to job postings/i.test(mid.backText),"and still says what it is: \""+mid.backText+"\"");
  await page.screenshot({path:path.join(OUT,"1-scrolled.png")});

  console.log("\n— and they work —");
  await page.click(".totop");
  await page.waitForTimeout(700);
  const back0=await page.evaluate(()=>Math.round(window.scrollY));
  check(back0<60,"the arrow takes you back to the top ("+back0+"px)");
  const upNow=await page.evaluate(()=>getComputedStyle(document.querySelector(".totop")).opacity!=="0");
  check(!upNow,"and puts itself away when it gets there");
  await page.evaluate(()=>window.scrollTo(0,900));
  await page.waitForTimeout(300);
  await page.click('.jobback [data-act="close-job"]');
  await page.waitForTimeout(400);
  const closed=await page.evaluate(()=>({open:!!S.jobOpen,y:Math.round(window.scrollY)}));
  check(!closed.open,"the pinned way back closes the file from halfway down it");
  check(closed.y<60,"and lands you at the top of the postings rather than halfway down them");

  console.log("\n— it stays out of the way of a question —");
  await page.evaluate(()=>{S.tab="jobs";const j=(S.jobs||[]).find(x=>!x.final);S.jobOpen=j?j.id:null;render();});
  await page.evaluate(()=>window.scrollTo(0,900));
  await page.waitForTimeout(300);
  check(await page.evaluate(()=>getComputedStyle(document.querySelector(".totop")).opacity!=="0"),
    "it is there while you read");
  await page.evaluate(()=>{S.notices=[{h:"A question",text:"Something that has to be answered."}];S.modal={type:"notice"};render();});
  await page.waitForTimeout(300);
  check(await page.evaluate(()=>getComputedStyle(document.querySelector(".totop")).opacity==="0"),
    "and gone the moment something is put in front of you");
  await page.screenshot({path:path.join(OUT,"2-modal.png")});

  console.log("\n— and on the other long screens —");
  await page.evaluate(()=>{S.notices=[];S.modal=null;S.jobOpen=null;S.tab="roster";S.shown=40;render();window.scrollTo(0,1200);});
  await page.waitForTimeout(400);
  check(await page.evaluate(()=>getComputedStyle(document.querySelector(".totop")).opacity!=="0"),
    "the roster has a way back to the top too");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})();

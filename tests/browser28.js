// Build 30 in a real browser: the tabs pinned under the top bar.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots28");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:760}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+GAME);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Paz");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  const dismiss=async()=>{let n=0;while(await page.$(".modal.notice")||await page.$('[data-act="loose"]')){
    if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');else await page.click('[data-act="loose"][data-i="0"]');
    await page.waitForTimeout(90);if(++n>25)break;}};
  await dismiss();
  // a long board to scroll
  await page.evaluate(()=>{S.money=5e6;S.tab="roster";render();});
  await dismiss();
  await page.waitForTimeout(250);
  const measure=async(label)=>{
    const g=await page.evaluate(()=>{
      const tb=document.querySelector(".topbar").getBoundingClientRect();
      const tabs=document.querySelector(".tabs").getBoundingClientRect();
      const css=getComputedStyle(document.documentElement).getPropertyValue("--topbar-h");
      return {tbTop:Math.round(tb.top),tbBottom:Math.round(tb.bottom),tabsTop:Math.round(tabs.top),tabsBottom:Math.round(tabs.bottom),
        v:css.trim(),scroll:Math.round(window.scrollY)};
    });
    console.log("   "+label+": "+JSON.stringify(g));
    return g;
  };
  const top=await measure("at the top");
  check(Math.abs(top.tabsTop-top.tbBottom)<=2,"the tabs sit directly under the top bar");
  await page.screenshot({path:OUT+"/01-top.png"});
  await page.evaluate(()=>window.scrollTo(0,2500));
  await page.waitForTimeout(250);
  const down=await measure("scrolled 2500px");
  check(down.scroll>1000,"scrolled a long way down ("+down.scroll+"px)");
  check(down.tbTop<=2,"the top bar is still pinned");
  check(Math.abs(down.tabsTop-down.tbBottom)<=2,"and the tabs are pinned right under it — no gap, no overlap");
  check(down.tabsBottom>0&&down.tabsTop<400,"they are on screen");
  await page.screenshot({path:OUT+"/02-scrolled.png"});
  // clicking a tab still works from down the page
  await page.click('[data-act="tab"][data-k="jobs"]');
  await page.waitForTimeout(250);
  check(await page.evaluate(()=>S.tab==="jobs"),"a tab can be clicked from the bottom of a long page");
  await page.screenshot({path:OUT+"/03-after-click.png"});
  // A small window does not get a small layout: the board keeps its shape and the window
  // scrolls sideways. The top bar therefore never wraps, so the tabs sit at the same offset.
  await page.setViewportSize({width:700,height:760});
  await page.evaluate(()=>{S.tab="roster";render();window.scrollTo(0,1800);});
  await page.waitForTimeout(350);
  const sm=await measure("small window, scrolled");
  /* The claim is that the bar does not WRAP, so it is asked against the bar at full width rather
     than against the number 46. That number was one row's height at the time, and the day the
     ranking got a box round it the row grew nine pixels and this failed while the bar was still,
     plainly, one row. A wrap would roughly double it; a restyle moves it a little. Compare, and
     allow for the little. */
  check(Math.abs(sm.tbBottom-top.tbBottom)<=2,
    "a small window does not rearrange the board — the bar is the same one row it is at full width ("
    +sm.tbBottom+"px vs "+top.tbBottom+"px, "+sm.v+")");
  check(Math.abs(sm.tabsTop-sm.tbBottom)<=2,"and the tabs are still flush under it");
  const wide=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,vp:window.innerWidth}));
  check(wide.doc>=960,"the page holds its PC width and scrolls sideways instead ("+wide.doc+"px in a "+wide.vp+"px window)");
  await page.screenshot({path:OUT+"/04-small-window.png"});
  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

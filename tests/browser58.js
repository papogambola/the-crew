// The quick reference is read in the middle of a decision, so scrolling it means scrolling away
// the half you were comparing against. It has to be one screen — on the player's screen, which is
// not knowable from here, so the type is measured down to fit rather than picked and hoped for.
//
// What this checks is the promise, not the number: every section on the screen at once at the
// sizes a PC actually is, and — at a window too small for that — the type stopping at a size
// somebody can still read, with the scroller back, rather than shrinking into a grey smear.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots58");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
const FLOOR=11.5*0.62;                       // the size fitQRH refuses to go below
const SIZES=[[1280,800],[1366,768],[1440,900],[1600,900],[1920,1080]];
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const errors=[];
  const open=async(w,h)=>{
    const page=await browser.newPage({viewport:{width:w,height:h}});
    page.on("pageerror",e=>errors.push(String(e)));
    await page.goto("file://"+(process.argv[2]?require("path").resolve(process.argv[2]):GAME));
    await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
    await page.reload();
    await page.click('[data-act="begin"]');await page.fill("#pname","Paz");await page.click('[data-act="confirm-create"]');
    await page.waitForSelector(".topbar");await putDownPaper(page);
    if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
    let n=0;while(await page.$(".modal.notice")||await page.$('[data-act="loose"]')){
      if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');else await page.click('[data-act="loose"][data-i="0"]');
      await page.waitForTimeout(60);if(++n>30)break;}
    await page.keyboard.press("q");
    await page.waitForSelector(".qrh .modal-b");
    await page.waitForTimeout(250);
    return page;
  };
  const measure=page=>page.evaluate(()=>{
    const b=document.querySelector(".qrh .modal-b"),q=document.querySelector(".qrh-b");
    const bb=b.getBoundingClientRect(),secs=[...document.querySelectorAll(".qrh-s")];
    return {px:+parseFloat(getComputedStyle(q).fontSize).toFixed(2),
      overflow:b.scrollHeight-b.clientHeight,
      sections:secs.length,
      below:secs.filter(s=>s.getBoundingClientRect().bottom>bb.bottom+1).length,
      right:secs.filter(s=>s.getBoundingClientRect().right>bb.right+1).length,
      split:secs.filter(s=>!s.querySelector("h3")).length,
      modalH:Math.round(document.querySelector(".qrh .modal").getBoundingClientRect().height),
      winH:innerHeight};});

  console.log("— one screen, at the sizes a PC actually is —");
  for(const [w,h] of SIZES){
    const page=await open(w,h);
    const m=await measure(page);
    check(m.sections===12,w+"x"+h+": all 12 sections of chapter 4 are on the card");
    check(m.overflow<=1&&m.below===0&&m.right===0,
      "  and every one of them is on the screen — nothing to scroll"
      +(m.overflow>1?" (overflows by "+m.overflow+"px, "+m.below+" below the fold)":""));
    check(m.px>=FLOOR-0.01,"  at "+m.px+"px, which is at or above the "+FLOOR.toFixed(2)+"px floor");
    // the scrim keeps 26px of desk showing above and below, so that much is not the card's to take
    check(m.modalH>=m.winH-56,"  and the card has taken the whole window ("+m.modalH+" of "+m.winH+"px, less the 26px margin)");
    await page.screenshot({path:OUT+"/qrh-"+w+"x"+h+".png"});
    await page.close();
  }

  console.log("\n— a window too small for it —");
  // Below some size the card cannot be one screen without the type going to nothing. It stops at
  // the floor and gives the scroller back: unreadable-but-unscrolled is the worse of the two.
  const tiny=await open(960,620);
  const t=await measure(tiny);
  check(Math.abs(t.px-FLOOR)<0.02,"the type stops at the floor, "+t.px+"px — it does not shrink past readable");
  check(t.overflow>0,"and the card scrolls instead ("+t.overflow+"px of it below the fold)");
  await tiny.screenshot({path:OUT+"/qrh-960x620.png"});
  await tiny.close();

  console.log("\n— it follows the window —");
  // The type is sized to the window, so a window that changes has to be re-measured, or the card
  // that fitted before the drag is the card that scrolls after it.
  const page=await open(1920,1080);
  const big=(await measure(page)).px;
  await page.setViewportSize({width:1280,height:800});
  await page.waitForTimeout(350);
  const small=await measure(page);
  check(small.px<big,"dragging the window smaller re-sizes the type ("+big+"px → "+small.px+"px)");
  check(small.overflow<=1&&small.below===0,"and it still fits, without being re-opened");
  await page.setViewportSize({width:1920,height:1080});
  await page.waitForTimeout(350);
  const backUp=await measure(page);
  check(Math.abs(backUp.px-big)<0.05,"and dragging it back gives the size back ("+backUp.px+"px)");
  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await page.close();
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

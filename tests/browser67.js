/* THE OFFICE WITH NO MUSIC TO PLAY.

   Paz: "when I'm stuck in the office screen nothing works. i have to click the X on the top
   right corner and exit the game completely." Then, after re-downloading build 97: "the locked
   office is not an issue anymore — i beleive it all came from the music issue." He was right
   that it came from the music: build 91 reaches playthecrew.com/music/*.mp3, and those files
   were deleted the day the tunes moved to R2.

   What was WRONG was my explanation of it. I traced this circle —

     render() → musicRoute() → musicSync() → play() rejects → refreshRadio() → render()

   — called it the lock, and wrote it up as one. Then ran this test against a copy carrying the
   old one-line refreshRadio() and got the identical result: 0 redraws, office exits in 330ms.
   The circle needs a render to start it and renders only happen when the player does something,
   so it is one wasted redraw per music event, not a spin. The theory was tidy and false.

   The test stays, because the thing it actually pins down is worth pinning: with every tune
   refused — which is what offline looks like, and what every shipped build 91 got — the pause
   screen does not churn and it lets you out. Whatever locked Paz's copy, this says it is not
   this, and says so against both versions of the code. */
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path");
// The suite may pass a path or nothing at all; env.js knows where the game is either way.
// is a URL with a hostname and no path, and it fails as one.
const FILE=path.resolve(__dirname,process.argv[2]||GAME);
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:860}});
  // Offline, as far as the music is concerned: every tune is refused, exactly as the site did to
  // the shipped build 91s the day the mp3s went to R2.
  let refused=0;
  await page.route("**/*",r=>{
    const u=r.request().url();
    if(/\.mp3(\?|$)|\/music\//i.test(u)){refused++;return r.abort();}
    return r.continue();
  });
  await page.goto("file://"+FILE);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Paz");
  await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  for(let i=0;i<30;i++){
    if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');
    else if(await page.$('[data-act="crewname-skip"]'))await page.click('[data-act="crewname-skip"]');
    else if(await page.$('[data-act="loose"]'))await page.click('[data-act="loose"][data-i="0"]');
    else break;
    await page.waitForTimeout(60);
  }

  // Count redraws, and make sure the radio is actually being asked to play — a test where the
  // music was switched off would pass without touching the bug.
  await page.evaluate(()=>{
    window.__renders=0;
    const real=window.render;
    window.render=function(){window.__renders++;return real.apply(this,arguments);};
    SET.sound=true;SET.music=true;SET.volume=0.6;userGestured=true;
    musicState="idle";
    try{musicSync();}catch(e){}
  });

  await page.click(".burger");
  await page.waitForSelector(".office",{timeout:5000});
  await page.evaluate(()=>{window.__renders=0;});
  await page.waitForTimeout(1500);
  const spin=await page.evaluate(()=>({n:window.__renders,state:musicState,note:musicNote}));

  console.log("— the office, with every tune refused —");
  check(refused>0,"the music really was unreachable ("+refused+" requests refused)");
  check(/blocked|idle|stopped/.test(spin.state),"the radio knows it is silent: "+spin.state+" — "+(spin.note||"(no note)"));
  // Before the fix this is thousands, or the evaluate never returns at all.
  check(spin.n<25,"the office is not spinning: "+spin.n+" redraws in 1.5s");

  // And the thing Paz could not do: leave.
  const t0=Date.now();
  await page.click('[data-act="off-close"]',{timeout:4000}).catch(e=>console.error("  click threw: "+e.message));
  await page.waitForTimeout(300);
  const out=!(await page.$(".office"));
  check(out,"Back to the game still works ("+(Date.now()-t0)+"ms)");

  // Esc too, since that is what the header tells you to press.
  await page.click(".burger");await page.waitForTimeout(200);
  await page.keyboard.press("Escape");await page.waitForTimeout(300);
  check(!(await page.$(".office")),"and Esc still works");

  // The status line is still honest about it rather than silently pretending.
  await page.click(".burger");await page.waitForTimeout(250);
  const said=await page.evaluate(()=>{
    const e=[...document.querySelectorAll(".office-words .mono")].map(x=>x.textContent).join(" | ");
    return e;});
  check(/silent|off|ready|quiet/i.test(said),"and the office says what the radio is doing: "+said.slice(0,90));

  await browser.close();
})();

// Build 30: the game is PC only. The door must turn away phones and tablets, and must never
// turn away a computer — a false "no" locks a real player out, which is far worse than a
// phone seeing a page it cannot play.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const OUT=path.join(__dirname,"shots30");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
const FILE="file://"+(process.argv[2]?require("path").resolve(process.argv[2]):GAME);

const BLOCK=[
  ["iPhone 15, Safari","Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",0],
  ["Pixel 8, Chrome","Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",0],
  ["Galaxy Tab, Chrome","Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",0],
  ["iPad, iPadOS 17 (claims to be a Mac)","Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",5],
];
const ALLOW=[
  ["Windows 11, Chrome","Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",0],
  ["Surface / touch-screen Windows laptop","Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",10],
  ["MacBook, Safari","Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",0],
  ["Linux, Firefox-ish","Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",0],
  ["ChromeOS laptop, touch","Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",10],
];

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const errors=[];
  const visit=async(ua,touch,w,h)=>{
    const ctx=await browser.newContext({userAgent:ua,viewport:{width:w,height:h}});
    const page=await ctx.newPage();
    page.on("pageerror",e=>errors.push(String(e)));
    // maxTouchPoints is not settable through the context, so it is stubbed before any script runs
    await page.addInitScript(t=>{Object.defineProperty(navigator,"maxTouchPoints",{get:()=>t});},touch);
    await page.goto(FILE);
    await page.waitForTimeout(450);
    const r=await page.evaluate(()=>({
      door:!!document.querySelector(".pconly"),
      game:!!document.querySelector('[data-act="begin"]')||!!document.querySelector(".topbar"),
      minw:document.body.style.minWidth||getComputedStyle(document.body).minWidth,
      vp:!!document.querySelector('meta[name="viewport"]'),
      text:(document.body.innerText||"").slice(0,80).replace(/\n/g," "),
    }));
    await ctx.close();
    return r;
  };

  console.log("-- turned away --");
  for(const [name,ua,touch] of BLOCK){
    const r=await visit(ua,touch,420,860);
    check(r.door&&!r.game,name+" gets the door");
  }
  console.log("-- let in --");
  for(const [name,ua,touch] of ALLOW){
    const r=await visit(ua,touch,1280,760);
    check(r.game&&!r.door,name+" plays");
  }

  // the door has to be readable on the thing it turns away
  console.log("-- the door itself --");
  const d=await visit(BLOCK[0][1],0,390,844);
  check(d.vp,"the door adds a viewport tag so a phone can read it");
  check(d.minw==="0px"||d.minw==="0","and is let out of the PC minimum width");
  check(/Not on a phone/i.test(d.text),"it says what it is: "+JSON.stringify(d.text.slice(0,44)));

  // and the game must not carry one
  const g=await visit(ALLOW[0][1],0,1280,760);
  check(!g.vp,"the game itself still has no viewport tag");
  check(parseInt(g.minw,10)===960,"the board is held to one PC width ("+g.minw+")");

  {const ctx=await browser.newContext({viewport:{width:1280,height:760}});const p=await ctx.newPage();
   await p.goto(FILE);await p.waitForTimeout(400);
   await p.screenshot({path:OUT+"/01-pc.png"});await ctx.close();}
  {const ctx=await browser.newContext({userAgent:BLOCK[0][1],viewport:{width:390,height:844}});const p=await ctx.newPage();
   await p.goto(FILE);await p.waitForTimeout(400);
   await p.screenshot({path:OUT+"/02-door.png"});await ctx.close();}

  check(errors.length===0,errors.length?("page errors: "+errors.join(" | ")):"no page errors");
  await browser.close();
})();

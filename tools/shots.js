/* The screenshots on the download page, taken out of the running game rather than mocked up.
   A mocked screenshot is a promise the product has to keep later; these are the product, and
   re-running this is how you find out the page is still showing the game as it is.

       node tools/shots.js                 # -> shots/*.png, from play.html next door
       node tools/shots.js some-build.html

   Seeded, so a re-run gives the same five people, the same faces, the same board and the same
   job in Piraeus. A screenshot that changes every time it is taken cannot be compared with the
   last one, and "is this still what the game looks like" is the only question anybody asks of
   one. The single thing the seed does not fix is the commander: rollDraftProfile() runs before
   there is a game to seed it from, correctly, so the player's own attributes come out different
   every run. Everybody standing behind them is the same.

   Taken at deviceScaleFactor 2 and then quantised to a 128-colour palette, which is a third of
   the bytes for no visible loss — the game is black ink on three shades of paper with a red
   stamp, so a truecolour PNG of it is spending 24 bits a pixel on about nine colours. Shrinking
   the pixels instead was tried and thrown away: these are screenshots of small type, and small
   type is the first thing a resample eats.

   Needs Playwright and the handbook tooling's Chromium — same two as tools/handbook/. */
const {chromium}=require("/opt/node22/lib/node_modules/playwright");
const {execFileSync}=require("child_process");
const path=require("path"),fs=require("fs");

/* The four faces the game is set in. A screenshot taken before they arrive is a screenshot of
   the fallbacks — Liberation Sans for the logotype, DejaVu for the tabs — and it does not look
   broken, it just looks like a different game. That is what shipped: four shots went onto the
   download page with the masthead in a grotesque, because this ran, the CDN did not answer, and
   nothing here was watching.

   The watch is not document.fonts.check(). That was written first and is worthless for this: in
   a run whose masthead came out in Liberation Sans it answered true for all four. It reports
   whether a matching face is *available*, which is a different question from the only one that
   matters — what did the renderer actually draw with. So ask the renderer, through CDP, after it
   has drawn: one hidden span per family, each asking for that family and nothing else, so a
   fallback shows up as a different name rather than as nothing. */
const FACES=["Anton","Oswald","Spectral","IBM Plex Mono"];

async function wrongFaces(page){
  await page.evaluate(async fams=>{
    if(!document.getElementById("__faceprobe")){
      const el=document.createElement("div");
      el.id="__faceprobe";
      el.style.cssText="position:fixed;left:-9999px;top:0;font-size:40px;line-height:1";
      el.innerHTML=fams.map((f,i)=>'<span id="__f'+i+'" style="font-family:\''+f+'\'">Handgloves</span>').join("");
      document.body.appendChild(el);
    }
    try{await Promise.all(fams.map(f=>document.fonts.load('400 40px "'+f+'"')));}catch(e){}
    try{await document.fonts.ready;}catch(e){}
  },FACES);
  const cdp=await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");await cdp.send("CSS.enable");
  const {root}=await cdp.send("DOM.getDocument");
  const bad=[];
  for(let i=0;i<FACES.length;i++){
    const {nodeId}=await cdp.send("DOM.querySelector",{nodeId:root.nodeId,selector:"#__f"+i});
    const r=nodeId?await cdp.send("CSS.getPlatformFontsForNode",{nodeId}):{fonts:[]};
    const used=((r.fonts||[])[0]||{}).familyName||"nothing";
    if(used!==FACES[i])bad.push(FACES[i]+" (drew as "+used+")");
  }
  await cdp.detach();
  return bad;
}
const dropProbe=page=>page.evaluate(()=>{
  const el=document.getElementById("__faceprobe");if(el)el.remove();});

const ROOT=path.join(__dirname,"..");
const GAME=process.argv[2]||path.join(ROOT,"play.html");
const OUT=path.join(ROOT,"shots");
const CHROME="/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const SEED=20260920;
const PLAYER="Sasha Varga";   // the commander on the shop window. Invented, and a full name.
const W=1280,H=820;

fs.mkdirSync(OUT,{recursive:true});

/* The week's paper opens over everything the moment a week begins and its scrim swallows clicks,
   so a drive that does not put it down photographs the paper instead of the screen it wanted. */
async function putDownPaper(page){
  await page.evaluate(()=>{
    if(window.__paperPutDown||typeof render!=="function")return;
    window.__paperPutDown=true;
    const _r=render;
    render=function(){
      _r.apply(null,arguments);
      if(typeof S!=="undefined"&&S&&S.modal&&S.modal.type==="news"){
        if(typeof newsClose==="function")newsClose();else S.modal=null;
        _r.apply(null,arguments);
      }
    };
  });
}

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  /* Strict TLS by default. A machine that re-terminates TLS in front of the browser — an agent
     sandbox, a corporate proxy — cannot fetch fonts.gstatic.com without its CA installed, and
     the failure it produces is the silent one above. The opt-out is explicit and named so that
     nobody sets it by accident; the check below says so when it is what you need. */
  const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:2,
    ignoreHTTPSErrors:process.env.CREW_SHOTS_INSECURE_TLS==="1"});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  await page.goto("file://"+GAME);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();

  await page.click('[data-act="begin"]');
  /* A full invented name, and invented is the point twice over. It was "Paz", which put the
     author on the shop window of his own game; and it was one word, so the player's card was
     the only one on the crew screen without a surname and read as a bug in the game rather
     than as what somebody had typed. Everybody behind this name is generated from SEED. */
  await page.fill("#pname",PLAYER);
  await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');

  /* Milestone boxes, the two-of-a-trade argument, and — since build 96 — the crew asking for a
     name all block everything behind them. The name prompt was not in this list and it arrives
     at week 20, well before the week 58 these are taken at, so this hung for thirty seconds and
     then threw. Take the name it offers rather than skipping: a crew with a name is what the
     game looks like by then, and the shop window should show that.

     Anything that appears and is not one of these stops the loop rather than spinning on it. */
  const drain=async()=>{let n=0;for(;;){
    if(await page.$('[data-act="crewname-ok"]:not([disabled])'))await page.click('[data-act="crewname-ok"]');
    else if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');
    else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');
    else if(await page.$('[data-act="loose"]'))await page.click('[data-act="loose"][data-i="0"]');
    else break;
    await page.waitForTimeout(60);if(++n>40)break;}};
  await drain();

  // One seed for the whole set, and a crew a year and a bit in: enough money to look like
  // somebody who has been working, one place still open, and heat in the amber.
  await page.evaluate(s=>{
    S.seed=s;S.rngN=0;S.roster=buildRoster(s);S.crewIds=[];
    S.money=1840000;S.rep=31;S.heat=44;S.week=58;
    for(let i=0;i<80&&recruits().length<crewSeats();i++){
      const c=S.roster.find(x=>x.status==="available"&&!x._u);if(!c)break;
      c._u=true;c.status="crew";S.crewIds.push(c.id);}
    S.jobs=[];refreshJobs(true);
    S.notices=[];S.news=null;S.newsRead=S.week;S.modal=null;render();
  },SEED);
  await drain();
  await page.evaluate(()=>{S.modal=null;S.notices=[];render();});
  await page.waitForTimeout(400);

  /* Before a single pixel. The probe needs a body to hang off, so it runs here rather than on
     the title screen, and it is torn down before anything is photographed. */
  let wrong=await wrongFaces(page);
  for(let i=0;i<3&&wrong.length;i++){
    console.error("  not there yet: "+wrong.join(", ")+" — waiting (attempt "+(i+1)+")");
    await page.waitForTimeout(3000);
    wrong=await wrongFaces(page);
  }
  if(wrong.length){
    console.error("\nthe renderer is not using: "+wrong.join(", ")
      +"\nEvery shot would come out in the fallbacks, which is how four went onto the download"
      +"\npage with the masthead in a grotesque. Nothing written."
      +(process.env.CREW_SHOTS_INSECURE_TLS==="1"?""
        :"\n\nBehind a TLS-inspecting proxy, the font CDN cannot be reached and this is what it"
        +"\nlooks like:  CREW_SHOTS_INSECURE_TLS=1 node tools/shots.js"));
    await browser.close();
    process.exit(1);
  }
  await dropProbe(page);
  console.log("  drawn with: "+FACES.join(", "));

  const taken=[];
  const shot=async(name,note)=>{
    await page.waitForTimeout(260);
    const p=path.join(OUT,name+".png");
    await page.screenshot({path:p});
    taken.push({name,p,raw:fs.statSync(p).size,note});
  };

  /* 1 — the crew. Generated faces are the thing nobody expects from a game made of type.
     Scrolled a little: the Reassemble card holds the row open under the heading, and a
     screenshot that is a third empty sells nothing. The cards are the picture. */
  await page.evaluate(()=>{S.tab="crew";S.modal=null;render();window.scrollTo(0,108);});
  await shot("crew","Your crew. Every file is a person with a trade, a history and a price.");

  /* 2 — the board: what is on offer this week, and where in the world it is. */
  await page.evaluate(()=>{S.tab="jobs";S.jobOpen=null;S.modal=null;render();window.scrollTo(0,0);});
  await shot("board","The board. Seven postings, seven countries, and what each one is missing.");

  /* 3 — one posting, opened. The crew strip comes down for this one: it is the same five faces
     as the shot above it, and it costs the brief — the point of the screen — half its height. */
  const job=await page.evaluate(()=>{
    S.tab="jobs";
    const j=S.jobs.filter(x=>!x.final&&assessJob(x).canRun)[0]||S.jobs[0];
    S.jobOpen=j.id;S.modal=null;render();window.scrollTo(0,0);
    return {id:j.id,city:j.city};});
  await page.waitForTimeout(150);
  await page.click('[data-act="strip-toggle"]');
  await page.waitForTimeout(150);
  await page.evaluate(()=>window.scrollTo(0,0));
  await shot("job","A job in "+job.city+": the fee, the trades it wants, and the week it expires.");
  await page.click('[data-act="strip-toggle"]');
  await page.waitForTimeout(120);

  /* 4 — a twist, mid-job. Six ways out, no right one. This is the game. */
  // Run the feed at its fastest while waiting for the decision to come up. It changes nothing
  // about what the screenshot looks like — only how long this has to stand there — and since
  // build 123 a line stays up for as long as it takes to read, so a decision eight lines in is
  // half a minute away at the ordinary pace and this loop used to give up before it arrived.
  await page.evaluate(id=>{SET.speed=4;S.jobOpen=id;render();},job.id);
  await page.waitForTimeout(150);
  if(await page.$('[data-act="execute"]:not([disabled])')){
    await page.click('[data-act="execute"]:not([disabled])');
    let found=false;
    for(let i=0;i<90&&!found;i++){found=!!(await page.$(".twist-opts"));if(!found)await page.waitForTimeout(220);}
    if(found){await page.evaluate(()=>window.scrollTo(0,0));
      await shot("twist","It goes wrong. Six ways out, and the crew you built decides how it lands.");}
    else console.error("no decision came up on this job — the twist shot was not taken");
  }else console.error("no runnable job — the twist shot was not taken");

  /* The dashboard was a fifth of these and was thrown away: six collapsed rows reading
     "0 jobs · 0 on file" over half a screen of nothing. A good screen to have, a bad one to
     photograph, and a screenshot that has to be explained is not a screenshot. */

  const after=await wrongFaces(page);
  await browser.close();
  if(after.length){
    console.error("\nlost mid-run: "+after.join(", ")+" — the later shots are not trustworthy.");
    process.exitCode=1;
  }

  // Palette, in place, after the fact — Playwright writes truecolour and has no say in it.
  const py=taken.map(t=>t.p);
  execFileSync("python3",["-c",`
import sys
from PIL import Image
for p in sys.argv[1:]:
    im = Image.open(p).convert("RGB")
    im.quantize(colors=128, dither=Image.Dither.NONE).save(p, optimize=True)
`,...py]);

  let tot=0;
  for(const t of taken){
    const now=fs.statSync(t.p).size;tot+=now;
    console.log("  "+t.name.padEnd(7)+String(now).padStart(7)+" bytes  ("
      +Math.round(100*now/t.raw)+"% of truecolour)  "+t.note);
  }
  console.log("\n"+taken.length+" shots, "+tot+" bytes, in "+OUT);
  if(errors.length){console.log("\npage errors:");errors.slice(0,6).forEach(e=>console.log("  "+e));}
  if(taken.length!==4){console.error("\nexpected 4 shots, got "+taken.length);process.exitCode=1;}
})();

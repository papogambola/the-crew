/* The screenshots on the download page, taken out of the running game rather than mocked up.
   A mocked screenshot is a promise the product has to keep later; these are the product, and
   re-running this is how you find out the page is still showing the game as it is.

       node tools/shots.js                 # -> shots/*.png, from play.html next door
       node tools/shots.js some-build.html

   Seeded, so a re-run gives the same five people, the same faces, the same board and the same
   job in Piraeus. A screenshot that changes every time it is taken cannot be compared with the
   last one, and "is this still what the game looks like" is the only question anybody asks of
   one. The single thing the seed does not fix is the commander: rollDraftProfile() runs before
   there is a game to seed it from, correctly, so Paz comes out a different person every run.
   Everybody standing behind Paz is the same.

   Taken at deviceScaleFactor 2 and then quantised to a 128-colour palette, which is a third of
   the bytes for no visible loss — the game is black ink on three shades of paper with a red
   stamp, so a truecolour PNG of it is spending 24 bits a pixel on about nine colours. Shrinking
   the pixels instead was tried and thrown away: these are screenshots of small type, and small
   type is the first thing a resample eats.

   Needs Playwright and the handbook tooling's Chromium — same two as tools/handbook/. */
const {chromium}=require("/opt/node22/lib/node_modules/playwright");
const {execFileSync}=require("child_process");
const path=require("path"),fs=require("fs");

const ROOT=path.join(__dirname,"..");
const GAME=process.argv[2]||path.join(ROOT,"play.html");
const OUT=path.join(ROOT,"shots");
const CHROME="/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const SEED=20260920;
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
  const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:2});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  await page.goto("file://"+GAME);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();

  await page.click('[data-act="begin"]');
  await page.fill("#pname","Paz");
  await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');

  // Milestone boxes and the two-of-a-trade argument both block everything behind them.
  const drain=async()=>{let n=0;while(await page.$(".modal.notice")||await page.$('[data-act="loose"]')){
    if(await page.$(".modal.notice"))await page.click('[data-act="notice-close"].btn');
    else await page.click('[data-act="loose"][data-i="0"]');
    await page.waitForTimeout(60);if(++n>30)break;}};
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
  await page.evaluate(id=>{S.jobOpen=id;render();},job.id);
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

  await browser.close();

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

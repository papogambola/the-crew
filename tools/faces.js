/* A CONTACT SHEET OF THE PEOPLE — every face drawn by the game itself, not by this file.

   The roster is 6,000 files, and each one carries a seed, a sex and a set of face parts chosen
   when it was generated. avatar(seed,gender,face) is what the crew cards, the dossiers and the
   recruitment trips all call, so what comes out of here is exactly what a player sees — no
   re-drawing, no approximation, and a change to the drawing shows up here the day it is made.

     node tools/faces.js                      # the default sheet
     node tools/faces.js --cols 60 --rows 40  # a different grid
     node tools/faces.js --cell 110           # bigger faces, same count
     node tools/faces.js --seed 7             # a different six thousand people

   Scale: ROWSxCOLS faces at CELL pixels tall. Chromium will not screenshot past about 16k on a
   side and gets slow long before that, so the sheet is checked against a ceiling here rather than
   failing halfway through a render.
*/
const {chromium,CHROME,GAME}=require("../tests/env.js");
const path=require("path"),fs=require("fs");

const arg=(k,d)=>{const i=process.argv.indexOf("--"+k);return i>0?Number(process.argv[i+1]):d;};
const COLS=arg("cols",100), ROWS=arg("rows",60), CELL=arg("cell",60), SEED=arg("seed",20260101);
/* The bust is drawn on a 100x120 field and the bottom third of it is a solid black shoulder. One
   of those under one face is the game's own mark; six thousand of them in a grid turn into
   horizontal black stripes, and at any zoom where the whole sheet fits on a screen the stripes are
   what you see rather than the people. --heads crops the viewBox to the head and a collar, which
   is the same drawing with the furniture taken off. */
const HEADS=process.argv.includes("--heads");
const TALL=HEADS?0.92:1.2;
const OUT=path.resolve(__dirname,"..","build","the-crew-faces"+(HEADS?"-heads":"")+".png");
const W=COLS*CELL, H=Math.round(ROWS*CELL*TALL);
if(W>15000||H>15000){console.error("sheet is "+W+"x"+H+" — past what Chromium will shoot");process.exit(1);}

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:Math.min(W,2000),height:900},deviceScaleFactor:1});
  page.on("pageerror",e=>{console.error("page error: "+e);});
  await page.goto("file://"+path.resolve(__dirname,"..",GAME));
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.waitForTimeout(400);

  // The roster is built straight from the seed — no game has to be started, because buildRoster
  // is a pure function of it. That is the same property the save relies on.
  const made=await page.evaluate(({cols,rows,cell,seed,heads,tall})=>{
    const want=cols*rows;
    const roster=buildRoster(seed);
    const people=roster.slice(0,want);
    const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");
    document.documentElement.innerHTML=
      '<head><style>'
      +'html,body{margin:0;padding:0;background:#fff}'
      +'#sheet{display:grid;grid-template-columns:repeat('+cols+','+cell+'px);width:max-content}'
      +'.c{width:'+cell+'px;height:'+Math.round(cell*tall)+'px;overflow:hidden}'
      +'.c svg{display:block;width:100%;height:100%}'
      +'</style></head><body><div id="sheet"></div></body>';
    const sheet=document.getElementById("sheet");
    /* avseed, not seed — the file's own drawing seed, and the field the crew cards pass. A roster
       file carries no face object: the parts are rolled from avseed every time it is drawn, which
       is why 6,000 people cost nothing to store. Passing the wrong field name gets every face
       rolled from mulberry32(0) and a sheet of one person repeated, which is how this was found. */
    sheet.innerHTML=people.map(c=>'<div class="c" title="'+esc(c.first)+'">'
      +avatar(c.avseed,c.gender,c.face)+'</div>').join("");
    // The crop is applied to the drawing the game made, rather than by drawing something else:
    // same paths, a shorter window onto them.
    if(heads)sheet.querySelectorAll("svg").forEach(s=>s.setAttribute("viewBox","0 0 100 92"));
    const men=people.filter(c=>c.gender==="M").length;
    const seeds=new Set(people.map(c=>c.avseed));
    return {n:people.length,men:men,women:people.length-men,seeds:seeds.size,
      w:sheet.scrollWidth,h:sheet.scrollHeight,
      first:people[0].first,last:people[people.length-1].first};
  },{cols:COLS,rows:ROWS,cell:CELL,seed:SEED,heads:HEADS,tall:TALL});

  await page.setViewportSize({width:made.w,height:Math.min(made.h,15000)});
  await page.waitForTimeout(600);
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  await page.locator("#sheet").screenshot({path:OUT});
  const kb=Math.round(fs.statSync(OUT).size/1024);
  console.log(made.n+" faces, "+COLS+" x "+ROWS+", "+made.w+"x"+made.h+"px, "+kb+" KB");
  console.log("  "+made.men+" men, "+made.women+" women — "+made.first+" first, "+made.last+" last");
  // The one check that matters: distinct drawing seeds. Equal to the count or something is wrong
  // with the field being read, and a sheet of one person repeated looks fine in a thumbnail.
  if(made.seeds!==made.n)console.error("  WARNING: only "+made.seeds+" distinct seeds for "+made.n+" faces");
  else console.log("  "+made.seeds+" distinct drawing seeds — no two of them are the same roll");
  console.log("  "+OUT);
  await browser.close();
})();

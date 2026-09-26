// A RECRUITMENT TRIP HAS DRAWINGS BESIDE IT NOW.
//
// Every trip ever played showed the sheet in its one-column state, because no TRIP_ table was
// illustrated. Build 125 made the trip narrator carry ids at all; build 126 is the 121 drawings
// arriving. Between those two the state "the trip has drawings" has never once been rendered, so
// nothing in the suite has ever looked at it.
//
// smoke47 proves the ids the trip asks for are the ids the plan holds. It cannot prove the panel
// appears, that the file loads, or that the drawing changes as the trip goes — those need a browser,
// a real trip, and the clock running.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),http=require("http"),fs=require("fs");
const PORT=Number(process.env.PORT||8957);
const T={".html":"text/html; charset=utf-8",".webp":"image/webp",".png":"image/png",".mp3":"audio/mpeg"};
/* Over HTTP, not file://, because the drawings are fetched relative to the page — which is the
   whole subject of this file. */
const srv=http.createServer((q,r)=>{
  const f=path.join(ROOT,decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/,""));
  fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();
    r.writeHead(200,{"content-type":T[path.extname(f)]||"application/octet-stream"});r.end(b);});});

let ok=0,bad=0;
// The suite counts `grep -c "^ok  "` at column zero and reads failures off `^FAIL`. Printed
// indented, as this file first did, eleven assertions counted as none and a failure would have
// been invisible in the summary — the same hole browser80 and browser81 have. Column zero, two
// spaces, exactly as every other drive prints it.
const check=(c,m)=>{ if(c){ok++;console.log("ok  "+m);} else {bad++;console.error("FAIL: "+m);} };

(async()=>{
  await new Promise(r=>srv.listen(PORT,"127.0.0.1",r));
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1400,height:950}});
  const errs=[],missed=[];
  page.on("pageerror",e=>errs.push(String(e).split("\n")[0]));
  page.on("response",r=>{ if(/\.webp(\?|$)/.test(r.url())&&r.status()>=400) missed.push(r.status()+" "+r.url().split("/").pop()); });
  await page.goto("http://127.0.0.1:"+PORT+"/"+path.relative(ROOT,GAME),{waitUntil:"load"});

  const have=await page.evaluate(()=>ART_HAVE.length);
  check(have>500,have+" drawings are listed");

  await page.click('[data-act="begin"]'); await page.fill("#pname","Sasha Varga");
  await page.click('[data-act="confirm-create"]'); await page.waitForSelector(".topbar");
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  for(let n=0;n<30;n++){
    const x=await page.$('button[data-act="crewname-later"]')||await page.$('.scrim button.x:not([disabled])');
    if(x){await x.click();await page.waitForTimeout(40);continue;}
    const q=await page.$$('.scrim .btn:not([disabled])');
    if(q.length){await q[q.length-1].click();await page.waitForTimeout(40);continue;}
    break;}

  // Fly out to somebody. Money first, so the fee is never the reason it does not happen.
  const flew=await page.evaluate(()=>{
    S.money=5e7;S.rep=400;SET.speed=4;S.notices=[];S.modal=null;
    const c=S.roster.find(x=>x.status==="available"&&canSign&&canSign(x))
         || S.roster.find(x=>x.status==="available");
    if(!c)return null;
    const T=startTrip(c);
    if(!T)return null;
    S.modal={type:"trip",data:T};render();
    return {who:c.first,lines:T.narrative.length,
            withArt:T.narrative.filter(l=>l.art).length,
            first:T.narrative[0]&&T.narrative[0].art||null};
  });
  check(flew,"flew out to somebody"+(flew?" — "+flew.who:""));
  check(flew&&flew.withArt>0,"the trip's report carries drawing ids ("
    +(flew?flew.withArt+" of "+flew.lines:"none")+")");

  // Let the feed run until a few lines are up, which is when the panel is built.
  await page.waitForFunction(()=>{
    const d=S&&S.modal&&S.modal.data;return d&&(d.revealed||0)>=3;},{timeout:60000});

  const panel=await page.evaluate(()=>{
    const fig=document.querySelector(".feed-side .feedart");
    const img=document.querySelector(".feed-side .feedart img");
    const d=S.modal&&S.modal.data;
    return {hasSide:!!document.querySelector(".feed-side"), hasFig:!!fig,
            src:img?img.getAttribute("src"):null,
            w:img?img.naturalWidth:0, h:img?img.naturalHeight:0,
            revealed:d?d.revealed:0};
  });
  check(panel.hasSide,"the sheet is in two columns — there is a panel at all");
  check(panel.hasFig,"and it holds a drawing "+panel.revealed+" lines into the trip");
  check(panel.w>0,"which loaded"+(panel.src?": "+panel.src.split("/").pop()+" at "+panel.w+"x"+panel.h:""));
  check(panel.w===900&&panel.h===675,"at the size every other drawing is");

  // AND THERE IS INK IN IT. naturalWidth only says the file decoded — the first screenshot this
  // file ever took showed an empty bordered box with the caption under it, which is the one thing
  // art/README.md says must never happen, and every assertion above it passed. It turned out to be
  // the screenshot compositing before the decode landed rather than a render bug, but nothing here
  // could tell the two apart. Drawing the element onto a canvas and counting dark pixels can.
  await page.waitForTimeout(600);
  const ink=await page.evaluate(()=>{
    const img=document.querySelector(".feed-side .feedart img");
    if(!img)return -1;
    const cv=document.createElement("canvas");cv.width=60;cv.height=45;
    const cx=cv.getContext("2d");
    try{ cx.drawImage(img,0,0,60,45); }catch(e){ return -2; }
    const d=cx.getImageData(0,0,60,45).data;
    let dark=0,n=0;
    for(let i=0;i<d.length;i+=4){ if((d[i]+d[i+1]+d[i+2])/3<128)dark++; n++; }
    return Math.round(100*dark/n);
  });
  // Bounds from the set rather than from taste: over 120 of the drawings, ink runs 48% to 95% with
  // a median of 75 — they are cross-hatched, so most of the paper is covered. A ceiling of 95 would
  // sit exactly on the darkest one and fail on it sooner or later. What this has to catch is a
  // frame with no picture in it (0, all paper) or a solid black one (100), so the gate goes there.
  check(ink>=20&&ink<=99,"and it is a drawing rather than a blank frame ("+ink+"% ink)");
  fs.mkdirSync(path.join(__dirname,"out"),{recursive:true});
  await page.screenshot({path:path.join(__dirname,"out","85-trip-drawing.png")});
  fs.mkdirSync(path.join(__dirname,"out"),{recursive:true});
  // After the ink check, so the shot is of a panel that has certainly painted.

  // AND IT CHANGES. A panel that holds the first drawing for the whole trip is the bug build 125
  // fixed on the job side wearing a different hat.
  const was=panel.src;
  let changed=null;
  for(let i=0;i<80&&!changed;i++){
    await page.waitForTimeout(400);
    const now=await page.evaluate(()=>{
      const img=document.querySelector(".feed-side .feedart img");
      const d=S.modal&&S.modal.data;
      return {src:img?img.getAttribute("src"):null,revealed:d?d.revealed:0,
              done:!!(d&&d.done),awaiting:!!(d&&d.awaiting)};
    });
    if(now.src&&now.src!==was)changed=now;
    if(now.done||now.awaiting)break;
  }
  check(changed,"the drawing changes as the trip goes"
    +(changed?" — "+changed.src.split("/").pop()+" by line "+changed.revealed:" (it held the first one)"));

  check(missed.length===0,"no .webp came back 4xx/5xx"+(missed.length?" — "+missed.slice(0,4).join("; "):""));
  check(errs.length===0,"no page errors"+(errs.length?" — "+errs[0]:""));

  await browser.close();srv.close();
  if(bad)console.error("FAIL: "+bad+" of "+(ok+bad)+" checks");
  process.exit(bad?1:0);
})();

/* THE PICTURE BESIDE THE LINE.
 *
 * Both bugs that stood between the drawings and the screen were silent — the report rendered
 * perfectly and simply had the old plan in it — and a full suite of 1,619 assertions went green
 * over both. Only opening the game and looking caught them. So this is that look, automated.
 *
 *   1. The arrival line had no id. push() takes (t, tone, at, who, act, tpl) and the template was
 *      passed as the FIFTH argument, landing in `act`. Every other line was fine; the one line
 *      guaranteed to be wrong was the first line of every job report.
 *
 *   2. The panel was frozen. The ticker appends to #ticker and steps the figures on the plan; it
 *      never rebuilt the side. So the panel held whatever it had when the modal opened — which is
 *      always BEFORE the first line is revealed, so always the plan. The ids were right, the
 *      files were there, the manifest was right, and nothing ever asked the panel again.
 *
 * Both are caught by the same question, asked at the right moment: after the feed has run a few
 * lines, is there a picture on the screen?
 */
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),http=require("http"),fs=require("fs");
const FILE=path.resolve(__dirname,process.argv[2]||GAME);
const PORT=Number(process.env.PORT||8951);
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
const T={".html":"text/html; charset=utf-8",".webp":"image/webp",".png":"image/png",".mp3":"audio/mpeg"};
/* Over HTTP, not file://, because the drawings are fetched relative to the page and a file://
   page cannot be trusted to load them the way a browser on the site will. */
const srv=http.createServer((q,r)=>{
  const f=path.join(ROOT,decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/,""));
  fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();
    r.writeHead(200,{"content-type":T[path.extname(f)]||"application/octet-stream"});r.end(b);});});

(async()=>{
  await new Promise(r=>srv.listen(PORT,"127.0.0.1",r));
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  const errs=[];page.on("pageerror",e=>errs.push(String(e)));
  await page.goto("http://127.0.0.1:"+PORT+"/"+path.relative(ROOT,FILE),{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();

  const have=await page.evaluate(()=>ART_HAVE.length);
  if(!have){
    console.log("skip  no drawings in art/ — nothing for this file to look at.");
    console.log("      python3 tools/art.py --write after putting some in.");
    await browser.close();srv.close();return;
  }
  console.log("— "+have+" drawings are listed —");

  await page.click('[data-act="begin"]'); await page.fill("#pname","Sasha Varga");
  await page.click('[data-act="confirm-create"]'); await page.waitForSelector(".topbar");
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  for(let n=0;n<30;n++){
    const x=await page.$('button[data-act="crewname-later"]')||await page.$('.scrim button.x:not([disabled])');
    if(x){await x.click();await page.waitForTimeout(50);continue;}
    const q=await page.$$('.scrim .btn:not([disabled])');
    if(q.length){await q[q.length-1].click();await page.waitForTimeout(50);continue;}
    break;}

  /* ---- the arrival line, which is where bug 1 lived ------------------------------------ */
  const arr=await page.evaluate(()=>{
    S.money=5e7;S.rep=500;SET.speed=2;
    for(let i=0;i<60&&recruits().filter(c=>c.status==="crew").length<5;i++){
      const c=S.roster.find(x=>x.status==="available"&&!x._u);if(!c)break;c._u=true;
      c.status="crew";S.crewIds.push(c.id);}
    refreshJobs(true);S.notices=[];S.modal=null;S.pendingJob=null;
    let j=null;
    for(let t=0;t<40&&!j;t++){
      j=S.jobs.find(x=>assessJob(x).canRun&&assessJob(x).team.length>=3)||null;
      if(!j){S.jobs=[];refreshJobs(true);}}
    if(!j)return null;
    const lines=narrate(j,assessJob(j),3,freshRng(),{},"all",{h:10,m:0}).lines;
    return {first:lines[0]?{art:lines[0].art||null,x:lines[0].x.slice(0,44)}:null,
            withArt:lines.filter(l=>l.art).length, n:lines.length, id:j.id};
  });
  check(arr,"a job this crew can field");
  check(arr.first&&arr.first.art,"the FIRST line of the report carries a drawing's id"
    +(arr.first?' — "'+arr.first.x+'"':""));
  check(arr.withArt>1,"and so do "+arr.withArt+" of the report's "+arr.n+" lines");

  /* ---- the panel, which is where bug 2 lived ------------------------------------------- */
  await page.evaluate(id=>{doExecute(id);},arr.id);
  // Past the establishing card (7s) and several lines beyond it. The panel was CORRECT before
  // this point even when broken — the plan is the right answer until a drawn line is revealed —
  // so asking too early is how a frozen panel passes.
  await page.waitForFunction(()=>{
    const d=S&&S.modal&&S.modal.data;return d&&!d.estab&&(d.revealed||0)>=3;},{timeout:60000});
  await page.waitForTimeout(600);

  const shown=await page.evaluate(()=>{
    const side=document.querySelector(".feed-side");
    const img=document.querySelector(".feed-side .feedart img");
    const d=S.modal&&S.modal.data;
    return {hasFigure:!!document.querySelector(".feed-side .feedart"),
            // Any of the map's furniture, not just its clock: the plan was a dozen classes and
            // half of it coming back would be as wrong as all of it.
            hasMap:document.querySelectorAll(".modal [class*='fm-'], .modal [class*='sc-']").length,
            src:img?img.getAttribute("src"):null,
            alt:img?(img.getAttribute("alt")||"").slice(0,40):null,
            complete:img?(img.complete&&img.naturalWidth>0):false,
            marked:side?side.getAttribute("data-art"):null,
            revealed:d?d.revealed:0};
  });
  check(shown.hasFigure,"once the feed is running, the panel holds a drawing ("+shown.revealed+" lines in)");
  check(shown.hasMap===0,"and not a trace of the plan is left on the sheet ("+shown.hasMap+" of its elements)");
  check(/^art\/.+\.webp$/.test(shown.src||""),"pointing at a real file: "+shown.src);
  // The file must actually LOAD. A correct src for a file that is not there looks identical in
  // the DOM and shows an empty box on the screen.
  check(shown.complete,"which the browser actually loaded, rather than a broken image");
  check((shown.alt||"").length>10,"and it is described to a screen reader by the line it draws");

  /* ---- and it KEEPS UP. This is the assertion bug 2 would have failed. ----------------- */
  const first=shown.marked;
  const moved=await page.evaluate(async(was)=>{
    for(let i=0;i<40;i++){
      const side=document.querySelector(".feed-side");
      const now=side?side.getAttribute("data-art"):null;
      if(now&&now!==was)return {now, revealed:S.modal.data.revealed};
      await new Promise(r=>setTimeout(r,500));
      if(S.modal&&S.modal.data&&S.modal.data.done)break;
    }
    return null;
  },first);
  check(moved,"and it changes as the report goes on"+(moved?" ("+first+" → "+moved.now+")":
    " — the panel is frozen on "+first));

  check(errs.length===0,"and nothing threw"+(errs.length?": "+errs[0]:""));
  await browser.close(); srv.close();
})().catch(e=>{console.error("DIED: "+e.message);process.exitCode=1;});

/* Drives handbook.html in a real browser: the closed book, opening it, turning pages by clicking
   them, the pinned search bar, the clickable index, and getting back to the game. Nothing here
   trusts the source — every assertion is made against what the page actually does. */
const {chromium}=require("/opt/node22/lib/node_modules/playwright");
const fs=require("fs"),path=require("path"),http=require("http");
const DIR=__dirname,PORT=8903;
const MIME={".html":"text/html",".css":"text/css",".woff2":"font/woff2"};
const srv=http.createServer((q,r)=>{const f=path.join(DIR,decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/,""));
  fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(b);});});

let pass=0,fail=0;
const ok=(c,m)=>{if(c){pass++;console.log("  ok   "+m);}else{fail++;console.log("  FAIL "+m);}};

(async()=>{
  await new Promise(r=>srv.listen(PORT,"127.0.0.1",r));
  const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome"});
  const pg=await b.newPage({viewport:{width:1360,height:960}});
  // Chromium in this container cannot reach fonts.googleapis.com — the agent proxy re-terminates
  // TLS and the browser does not trust its CA. That one request is expected to fail here and
  // works in a real browser; everything else failing is a bug.
  const errs=[],KNOWN=/fonts\.googleapis\.com/;
  pg.on("pageerror",e=>errs.push("pageerror: "+e));
  pg.on("requestfailed",r=>{if(!KNOWN.test(r.url()))errs.push("request failed: "+r.url());});
  pg.on("response",r=>{if(r.status()>=400&&!KNOWN.test(r.url()))errs.push("HTTP "+r.status()+": "+r.url());});
  await pg.goto("http://127.0.0.1:"+PORT+"/handbook.html",{waitUntil:"load"});
  await pg.addStyleTag({url:"/fonts-local.css"});
  await pg.evaluate(()=>document.fonts.ready);
  // the fonts arrived after boot, so the book measured itself against fallbacks: measure again
  await pg.evaluate(()=>window.bookRepaginate&&window.bookRepaginate());
  await pg.waitForTimeout(350);

  const D=JSON.parse(fs.readFileSync(path.join(DIR,"gamedata.json"),"utf8"));
  const settle=(ms)=>pg.waitForTimeout(ms||900);

  /* ------------------------------ closed ------------------------------- */
  console.log("\n— the book, shut —");
  ok(await pg.evaluate(()=>!window.bookOpen()),"it starts closed");
  const closed=await pg.$("#closed");
  ok(!!closed,"there is a book on the desk");
  ok(!(await pg.isVisible("#book")),"and no pages showing yet");
  const cv=await pg.evaluate(()=>{
    const t=document.querySelector(".cv-title");
    return {eyebrow:document.querySelector(".cv-eyebrow").textContent.trim(),
      title:t.textContent.trim(),
      titlePx:Math.round(parseFloat(getComputedStyle(t).fontSize)),
      faces:document.querySelectorAll(".cv-face svg").length,
      sub:document.querySelector(".cv-sub").innerText.replace(/\s+/g," ").trim(),
      rules:[].slice.call(document.querySelectorAll(".cv-rule,.cv-tick"))
        .map(e=>Math.round(e.getBoundingClientRect().height)),
      foot:document.querySelector(".cv-foot").innerText.replace(/\s+/g," ").trim()};
  });
  ok(cv.eyebrow==="Case file · Classified","the cover is stamped: \""+cv.eyebrow+"\"");
  ok(cv.title==="TheCrew"||/The\s*Crew/i.test(cv.title),"and titled: \""+cv.title+"\"");
  ok(cv.titlePx>90,"in the game's own logotype, big ("+cv.titlePx+"px)");
  ok(cv.faces===5,cv.faces+" faces on the cover — the crew");
  ok(/Player.?s Handbook/i.test(cv.sub),"it says what it is: \""+cv.sub+"\"");
  // three rules and a tick, and none of them collapsed to nothing
  ok(cv.rules.length===4&&cv.rules.every(h=>h>=2),
    "the rules are drawn, not flattened ("+cv.rules.join(", ")+"px)");
  ok(/crew of five/i.test(cv.foot)&&/thousands of jobs/i.test(cv.foot),
    "and the foot says what the game is: \""+cv.foot+"\"");
  ok(/click/i.test(await pg.textContent(".opencue")),"something tells you it opens");
  await pg.screenshot({path:path.join(DIR,"shot-closed.png")});

  /* ------------------------------ opening ------------------------------ */
  console.log("\n— opening it —");
  await pg.click("#closed");
  await settle();
  ok(await pg.evaluate(()=>window.bookOpen()),"clicking the book opens it");
  ok(await pg.isVisible("#slotL")&&await pg.isVisible("#slotR"),"two pages, side by side");
  const pages=await pg.evaluate(()=>window.bookPages());
  ok(pages>40,pages+" pages in it");
  ok(pages%2===0,"an even count, so every spread is a pair");
  const first=await pg.evaluate(()=>({
    l:document.querySelector("#slotL .leaf-b").innerText.replace(/\s+/g," ").trim().slice(0,40),
    r:document.querySelector("#slotR .leaf-b").innerText.replace(/\s+/g," ").trim().slice(0,40)}));
  ok(/The Crew/i.test(first.l),"it opens on the title page: \""+first.l+"…\"");
  ok(/Contents/i.test(first.r),"with the contents facing it");
  ok(/\b1–2\b/.test(await pg.textContent("#pager")),"and it says where you are: "+(await pg.textContent("#pager")).trim());

  /* ------------------------------ turning ------------------------------ */
  console.log("\n— turning —");
  const box=await (await pg.$(".spread")).boundingBox();
  // Click in the outer margin of the page. Anywhere on a contents page is a link, and a link is
  // supposed to win over a page-turn — which is the behaviour, not a problem to click around.
  const clickPage=async side=>{
    const x=side==="r"?box.x+box.width*0.975:box.x+box.width*0.025;
    await pg.mouse.click(x,box.y+box.height*0.5);
    await settle();
  };
  await clickPage("r");
  ok(await pg.evaluate(()=>window.bookSpread())===1,"clicking the right-hand page turns forward");
  await clickPage("r");
  ok(await pg.evaluate(()=>window.bookSpread())===2,"and again");
  await clickPage("l");
  ok(await pg.evaluate(()=>window.bookSpread())===1,"clicking the left-hand page turns back");
  await pg.keyboard.press("ArrowRight");await settle();
  ok(await pg.evaluate(()=>window.bookSpread())===2,"the right arrow turns it too");
  await pg.keyboard.press("ArrowLeft");await settle();
  ok(await pg.evaluate(()=>window.bookSpread())===1,"and the left arrow goes back");
  await pg.keyboard.press("Home");await settle(500);
  ok(await pg.evaluate(()=>window.bookSpread())===0,"Home returns to the front");
  await pg.keyboard.press("End");await settle(500);
  const last=await pg.evaluate(()=>window.bookSpread());
  ok(last===pages/2-1,"End reaches the back ("+(last*2+1)+"–"+(last*2+2)+")");
  await clickPage("r");
  ok(await pg.evaluate(()=>window.bookSpread())===last,"and there is nothing past the last page");
  // the running foot names the chapter you are in, and the page you are on
  const feet=await pg.evaluate(()=>[].slice.call(document.querySelectorAll(".slot .leaf-f"))
    .map(f=>({rh:f.querySelector(".rh").textContent.trim(),pn:f.querySelector(".pn").textContent.trim()})));
  ok(feet.length===2&&feet.every(f=>/^\d+$/.test(f.pn)),
    "every page is numbered at its foot ("+feet.map(f=>f.pn).join(", ")+")");
  ok(feet.some(f=>f.rh.length>0),"and says which chapter it is in (\""+feet[0].rh+"\")");

  /* -------------------------------- zoom ------------------------------- */
  console.log("\n— zoom —");
  await pg.evaluate(()=>window.bookGoPage(16));await settle();
  ok(await pg.textContent("#zval")==="100%","it sits at 100% — the book fitted to the window");
  const wide0=Math.round((await (await pg.$(".spread")).boundingBox()).width);
  const paged0=await pg.evaluate(()=>window.bookPageOf("bigtechs"));
  for(let i=0;i<4;i++){await pg.click("#zin");await settle(220);}
  const z=await pg.textContent("#zval");
  const wide1=Math.round((await (await pg.$(".spread")).boundingBox()).width);
  ok(parseInt(z,10)>200,"four presses of + take it to "+z);
  ok(wide1>wide0*1.8,"and the book is drawn that much bigger ("+wide0+"px → "+wide1+"px)");
  // the whole point: zoom is a scale, not a re-layout. A page that moved would make the index lie.
  ok(await pg.evaluate(()=>window.bookPages())===pages,"the book is still "+pages+" pages");
  ok(await pg.evaluate(()=>window.bookPageOf("bigtechs"))===paged0,
    "and nothing has moved: the specialists are still on page "+paged0);
  const deskState=await pg.evaluate(()=>{const d=document.querySelector("#desk");
    return {sw:d.scrollWidth,cw:d.clientWidth,sl:Math.round(d.scrollLeft),st:Math.round(d.scrollTop)};});
  ok(deskState.sw>deskState.cw,"the desk can be moved around under it ("+deskState.sw+"px of book in a "+deskState.cw+"px window)");
  ok(deskState.sl>0||deskState.st>0,"and it zoomed in on the page you were reading, not the middle of the book");
  await pg.screenshot({path:path.join(DIR,"shot-zoom.png")});

  // dragging moves the page; it must not also turn it
  const spreadBefore=await pg.evaluate(()=>window.bookSpread());
  const scrollBefore=await pg.evaluate(()=>document.querySelector("#desk").scrollLeft);
  await pg.mouse.move(700,500);await pg.mouse.down();
  await pg.mouse.move(900,430,{steps:8});await pg.mouse.up();
  await settle(600);
  ok(await pg.evaluate(()=>document.querySelector("#desk").scrollLeft)!==scrollBefore,
    "dragging moves the page under the window");
  ok(await pg.evaluate(()=>window.bookSpread())===spreadBefore,"and a drag is never a page-turn");
  // but a plain click still turns, at any size
  await pg.mouse.click(1150,500);await settle(1100);
  ok(await pg.evaluate(()=>window.bookSpread())===spreadBefore+1,"a click still turns the page while zoomed in");
  ok(await pg.textContent("#zval")===z,"and it stays at "+z+" while you read on");

  await pg.mouse.move(700,500);
  await pg.keyboard.down("Control");await pg.mouse.wheel(0,-300);await pg.keyboard.up("Control");
  await settle(400);
  ok(await pg.textContent("#zval")!==z,"ctrl and the wheel zoom at the pointer ("+z+" → "+(await pg.textContent("#zval"))+")");
  await pg.keyboard.press("0");await settle(400);
  ok(await pg.textContent("#zval")==="100%","0 puts it back to the fitted size");
  await pg.keyboard.press("+");await settle(300);
  ok(await pg.textContent("#zval")!=="100%","+ zooms in from the keyboard ("+(await pg.textContent("#zval"))+")");
  await pg.click("#zval");await settle(400);
  ok(await pg.textContent("#zval")==="100%","and clicking the reading fits it again");
  // the floor, and that a search term containing + is typing rather than zooming
  for(let i=0;i<10;i++){
    if(await pg.evaluate(()=>document.querySelector("#zout").disabled))break;
    await pg.click("#zout");await settle(140);
  }
  const floor=await pg.textContent("#zval");
  ok(parseInt(floor,10)>=50&&await pg.evaluate(()=>document.querySelector("#zout").disabled),
    "it stops zooming out at "+floor+", and says so");
  await pg.keyboard.press("0");await settle(300);
  await pg.fill("#q","a+b");await settle(400);
  ok(await pg.textContent("#zval")==="100%","typing a + into the search box types it, and does not zoom");
  await pg.click("#sclr");await settle(400);

  /* ------------------------------- index ------------------------------- */
  console.log("\n— the index —");
  await pg.evaluate(()=>window.bookTurn&&0);
  await pg.click("#bcon");await settle();
  ok(/Contents/i.test(await pg.evaluate(()=>document.querySelector(".spread").innerText)),
    "the Contents button turns to the contents");
  const dash=await pg.$$eval(".ct-p",n=>n.filter(x=>!/^\d+$/.test(x.textContent.trim())).length);
  ok(dash===0,"every line in the index carries a page number ("+dash+" without one)");
  const bad=await pg.evaluate(()=>[].slice.call(document.querySelectorAll("[data-jump]"))
    .filter(a=>window.bookPageOf(a.dataset.jump)==null).map(a=>a.dataset.jump));
  ok(bad.length===0,"every index line points at a page that exists"+(bad.length?": "+bad:""));
  const badAnchor=await pg.evaluate(()=>[].slice.call(document.querySelectorAll('.leaf a[href^="#"]'))
    .filter(a=>window.bookPageOf(a.getAttribute("href").slice(1))==null).map(a=>a.getAttribute("href")));
  ok(badAnchor.length===0,"every cross-reference in the prose resolves"+(badAnchor.length?": "+badAnchor:""));
  // Four jumps, from four ends of the book. The index runs over several pages, so turn to the
  // page the line is printed on first — then click the line itself, the way a reader would.
  for(const id of ["reckon","loose","gloss","bigtechs"]){
    const where=await pg.evaluate(i=>{
      const a=document.querySelector('[data-jump="'+i+'"]');
      const leaf=a&&a.closest(".leaf");
      return {line:leaf?+leaf.getAttribute("data-pg"):null,want:window.bookPageOf(i)};},id);
    await pg.evaluate(n=>window.bookGoPage(n),where.line);
    await settle(700);
    ok(await pg.isVisible('[data-jump="'+id+'"]'),"the index line for #"+id+" is on page "+where.line);
    await pg.click('[data-jump="'+id+'"]');await settle();
    const sp=await pg.evaluate(()=>window.bookSpread());
    ok(where.want===sp*2+1||where.want===sp*2+2,
      "  it says page "+where.want+", and clicking it lands on "+(sp*2+1)+"–"+(sp*2+2));
  }
  // the index is not a guess: it is the page the PDF put it on
  let pagesJson=null;
  try{pagesJson=JSON.parse(fs.readFileSync(path.join(DIR,"pages.json"),"utf8"));}catch(e){}
  if(pagesJson&&Object.keys(pagesJson).length){
    const shown=await pg.evaluate(()=>{const o={};
      document.querySelectorAll("[data-pg]").forEach(e=>{o[e.dataset.pg]=+e.textContent.trim();});return o;});
    const off=Object.keys(pagesJson).filter(k=>shown[k]!==undefined&&pagesJson[k]!==shown[k]);
    ok(off.length===0,"the index agrees with the rendered PDF"
      +(off.length?": "+off.slice(0,6).map(k=>k+" says "+shown[k]+", pdf has it on "+pagesJson[k]).join("; "):
        " ("+Object.keys(pagesJson).length+" headings)"));
  }else ok(false,"pages.json is missing — run hb-pages.py against the PDF");

  /* ------------------------------- search ------------------------------ */
  console.log("\n— search —");
  await pg.fill("#q","cleaner");
  await settle(700);
  const count=await pg.textContent("#scount");
  ok(/^\d+ of \d+$/.test(count),"the count reads '"+count+"'");
  const marks=await pg.$$eval("mark",n=>n.length);
  ok(marks>=5,marks+" occurrences marked");
  const onPage=await pg.evaluate(()=>{
    const m=document.querySelector("mark.on");
    return !!(m&&m.closest(".slot"));});
  ok(onPage,"and the book is turned to the one you are on");
  await pg.screenshot({path:path.join(DIR,"shot-search.png")});
  const before=await pg.textContent("#scount");
  await pg.click("#snext");await settle(700);
  ok(await pg.textContent("#scount")!==before,"› steps to the next ("+before+" → "+(await pg.textContent("#scount"))+")");
  const cur=await pg.evaluate(()=>document.querySelectorAll("mark.on").length);
  ok(cur===1,"exactly one match is the current one");
  ok(await pg.evaluate(()=>{const m=document.querySelector("mark.on");return !!(m&&m.closest(".slot"));}),
    "and it is on a page you can see");
  await pg.click("#sprev");await settle(700);
  ok(await pg.textContent("#scount")===before,"‹ goes back to it");
  await pg.fill("#q","zzzqqq");await settle(500);
  ok(await pg.evaluate(()=>document.body.classList.contains("nohits")),"a term that isn't there says so");
  ok(await pg.isVisible(".nores"),"and says it on the page");
  await pg.click("#sclr");await settle(600);
  ok(await pg.$$eval("mark",n=>n.length)===0,"clearing takes every mark off");
  ok(await pg.evaluate(()=>window.bookPages())===pages,"and the book is still the same length");
  // a search must never silently repaginate the book under the reader
  const pageNow=await pg.evaluate(()=>window.bookPageOf("bigtechs"));
  await pg.fill("#q","the");await settle(900);
  ok(await pg.evaluate(i=>window.bookPageOf(i),"bigtechs")===pageNow,
    "marking hits does not move a single page (specialists stay on "+pageNow+")");
  await pg.click("#sclr");await settle(500);

  /* ---------------------- what the game contains ----------------------- */
  console.log("\n— what the game actually contains —");
  const text=await pg.evaluate(()=>[].slice.call(document.querySelectorAll(".leaf"))
    .map(l=>l.innerText).join(" ").replace(/\s+/g," "));
  for(const id of ["ops","opsopen","bigcats","opscrew","bigtechs"])
    ok(await pg.evaluate(i=>window.bookPageOf(i)!=null,id),"  · #"+id+" is in the book");
  const missTech=D.TECHS_ALL.map(t=>t.l).filter(l=>text.indexOf(l)<0);
  ok(missTech.length===0,"all "+D.TECHS_ALL.length+" trades are named"+(missTech.length?", missing: "+missTech.join(", "):""));
  const missCat=D.BIG_CATS.map(c=>c.l).filter(l=>text.indexOf(l)<0);
  ok(missCat.length===0,"and all "+D.BIG_CATS.length+" kinds an operation uses"+(missCat.length?", missing: "+missCat.join(", "):""));
  const blank=await pg.evaluate(()=>[].slice.call(document.querySelectorAll("#store table tr"))
    .filter(r=>r.cells.length===5&&r.cells[0].tagName==="TD"&&!r.cells[4].textContent.trim())
    .map(r=>r.cells[0].textContent.trim()));
  ok(blank.length===0,"every trade has a place on the plan"+(blank.length?", blank: "+blank.join(", "):""));
  const heads=[D.ROSTER_SIZE,D.ROSTER_CORE,D.ROSTER_BIG].map(n=>n.toLocaleString("en-US"))
    .concat(["five thousand","six thousand","thousand files"]).filter(n=>new RegExp(n,"i").test(text));
  ok(heads.length===0,"no head count of the roster anywhere"+(heads.length?": "+heads.join(", "):""));
  ok(/crew of five/i.test(text)&&/thousands of jobs/i.test(text),
    "it says the shape instead: a crew of five, and thousands of jobs");
  ok(text.indexOf(String(D.BAL.bigCount))>=0&&/OP-001/.test(text),
    "and how many operations there are ("+D.BAL.bigCount+"), by their code");
  const stale=["5,000 people on file","All five thousand files","one of sixteen. Worth","operatives on file"]
    .filter(n=>text.indexOf(n)>=0);
  ok(stale.length===0,"nothing left describing the smaller game"+(stale.length?": "+stale.join("; "):""));

  /* ------------------------- back to the front ------------------------- */
  console.log("\n— the cover, and the way out —");
  await pg.evaluate(()=>window.bookZoom(2));await settle(400);
  await pg.click("#bcover");await settle(500);
  ok(await pg.evaluate(()=>!window.bookOpen()),"the Cover button shuts the book");
  ok(await pg.textContent("#zval")==="100%","and shutting it puts the zoom back, so the cover is never off the side of the desk");
  ok(await pg.isVisible("#closed"),"and there it is on the desk again");
  await pg.click("#closed");await settle();
  ok(await pg.evaluate(()=>window.bookOpen()),"and it opens again");
  const href=await pg.getAttribute("#back","href");
  ok(href==="index.html","back to the game points at the game beside it ('"+href+"')");
  ok(/The game/i.test(await pg.textContent("#back")),"in words: \""+(await pg.textContent("#back")).trim()+"\"");

  console.log("\n— errors —");
  ok(errs.length===0,"no page errors"+(errs.length?": "+errs.join(" | "):""));

  console.log("\n"+pass+" passed, "+fail+" failed");
  await b.close();srv.close();
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});

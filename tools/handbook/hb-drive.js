/* Drives handbook.html in a real browser: the pinned search bar, the clickable index, go to top,
   and back to the game. Nothing here trusts the source — every assertion is made against what the
   page actually does. */
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
  const pg=await b.newPage({viewport:{width:1280,height:900}});
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
  await pg.waitForTimeout(250);

  console.log("\n— the page —");
  ok(await pg.title()==="The Crew — Player's Handbook","title");
  const chs=await pg.$$eval(".chapter",n=>n.length);
  const secs=await pg.$$eval(".sec",n=>n.length);
  // the count comes off the page and is checked against the index, so a new chapter is not a failure
  const idxChapters=await pg.$$eval(".ct-c",n=>n.length);
  ok(chs>=19&&chs===idxChapters,chs+" chapters, and the contents lists every one of them");
  ok(secs>=70,secs+" sections");

  // The handbook's job is to explain everything in the game. When the game grows a system, the
  // failure mode is a handbook that still describes the game before it — so the counts checked
  // here are read from the game's own constants rather than typed in.
  console.log("\n— what the game actually contains —");
  const D=JSON.parse(fs.readFileSync(path.join(DIR,"gamedata.json"),"utf8"));
  const text=await pg.evaluate(()=>document.body.innerText.replace(/\s+/g," "));
  ok(!!(await pg.$("#bigops")),"the operations have a chapter of their own");
  for(const id of ["ops","opsopen","bigcats","opscrew","bigtechs"])
    ok(!!(await pg.$("#"+id)),"  · #"+id+" is in it");
  const missTech=D.TECHS_ALL.map(t=>t.l).filter(l=>text.indexOf(l)<0);
  ok(missTech.length===0,"all "+D.TECHS_ALL.length+" trades are named on the page"
    +(missTech.length?", missing: "+missTech.join(", "):""));
  const missCat=D.BIG_CATS.map(c=>c.l).filter(l=>text.indexOf(l)<0);
  ok(missCat.length===0,"and all "+D.BIG_CATS.length+" kinds an operation uses"
    +(missCat.length?", missing: "+missCat.join(", "):""));
  const bigRows=await pg.$$eval("#bigtechs table tbody tr",n=>n.length);
  ok(bigRows===D.TECHS_BIG.length,"the specialists table has a row each ("+bigRows+")");
  // a trade standing somewhere the handbook has no word for leaves an empty cell, not an error
  const blank=await pg.evaluate(()=>[].slice.call(document.querySelectorAll("#techs table tbody tr,#bigtechs table tbody tr"))
    .filter(r=>!r.cells[4]||!r.cells[4].textContent.trim()).map(r=>r.cells[0].textContent.trim()));
  ok(blank.length===0,"every trade has a place on the plan"+(blank.length?", blank: "+blank.join(", "):""));
  ok(text.indexOf(D.ROSTER_SIZE.toLocaleString("en-US"))>=0,
    "the page says how many people are on file ("+D.ROSTER_SIZE.toLocaleString("en-US")+")");
  ok(text.indexOf(String(D.BAL.bigCount))>=0&&/OP-001/.test(text),
    "and how many operations there are ("+D.BAL.bigCount+"), by their code");
  const stale=["5,000 people on file","All five thousand files","one of sixteen. Worth"]
    .filter(n=>text.indexOf(n)>=0);
  ok(stale.length===0,"nothing left describing the smaller game"+(stale.length?": "+stale.join("; "):""));

  console.log("\n— the index —");
  const dash=await pg.$$eval(".ct-p",n=>n.filter(x=>!/^\d+$/.test(x.textContent.trim())).length);
  ok(dash===0,"every line in the index carries a page number ("+dash+" without one)");
  const bad=await pg.evaluate(()=>[].slice.call(document.querySelectorAll("[data-jump]"))
    .filter(a=>!document.getElementById(a.dataset.jump)).map(a=>a.dataset.jump));
  ok(bad.length===0,"every index line points at something that exists"+(bad.length?": "+bad:""));
  const badAnchor=await pg.evaluate(()=>[].slice.call(document.querySelectorAll('.chapter a[href^="#"]'))
    .filter(a=>!document.getElementById(a.getAttribute("href").slice(1))).map(a=>a.getAttribute("href")));
  ok(badAnchor.length===0,"every cross-reference in the prose resolves"+(badAnchor.length?": "+badAnchor:""));
  // the numbers in the index are the pages the PDF actually put those headings on
  const pagesJson=JSON.parse(fs.readFileSync(path.join(DIR,"pages.json"),"utf8"));
  const shown=await pg.evaluate(()=>{const o={};document.querySelectorAll(".ct-p").forEach(e=>{o[e.dataset.pg]=+e.textContent.trim();});return o;});
  const mismatch=Object.keys(pagesJson).filter(k=>pagesJson[k]!==shown[k]);
  ok(mismatch.length===0,"the index agrees with the rendered PDF"+(mismatch.length?": "+mismatch:""));

  // three jumps, from three ends of the book
  for(const id of ["reckon","loose","gloss"]){
    await pg.evaluate(()=>window.scrollTo(0,0));
    await pg.click('[data-jump="'+id+'"]');
    await pg.waitForTimeout(700);
    const top=await pg.evaluate(i=>document.getElementById(i).getBoundingClientRect().top,id);
    ok(top>40&&top<180,"jumping to #"+id+" lands it under the bar (top "+Math.round(top)+")");
  }

  console.log("\n— the pinned bar —");
  await pg.evaluate(()=>window.scrollTo(0,6000));
  await pg.waitForTimeout(250);
  const barTop=await pg.evaluate(()=>document.querySelector(".bar").getBoundingClientRect().top);
  const qVis=await pg.isVisible("#q");
  ok(Math.abs(barTop)<1,"the bar is still at the top after scrolling 6000px (top "+barTop+")");
  ok(qVis,"the search box is still on screen");

  console.log("\n— search —");
  await pg.fill("#q","cleaner");
  await pg.waitForTimeout(350);
  let count=await pg.textContent("#scount");
  const marks=await pg.$$eval("mark",n=>n.length);
  ok(/^\d+ of \d+$/.test(count),"the count reads '"+count+"'");
  ok(marks>=5,marks+" occurrences highlighted");
  const hiddenChapters=await pg.$$eval(".chapter.hb-hide",n=>n.length);
  ok(hiddenChapters>0&&hiddenChapters<chs,hiddenChapters+" chapters folded away, "+(chs-hiddenChapters)+" kept");
  const emptyTable=await pg.evaluate(()=>[].slice.call(document.querySelectorAll(".chapter table:not(.hb-hide)"))
    .filter(t=>!t.querySelector("tbody tr:not(.hb-hide)")).length);
  ok(emptyTable===0,"no table head is left standing over nothing");
  const contentsHidden=await pg.evaluate(()=>getComputedStyle(document.getElementById("contents")).display==="none");
  ok(contentsHidden,"the contents steps out of the way while searching");

  const first=await pg.textContent("#scount");
  await pg.click("#snext");await pg.waitForTimeout(500);
  const second=await pg.textContent("#scount");
  ok(first!==second,"› moves to the next match ("+first+" → "+second+")");
  const onCount=await pg.$$eval("mark.on",n=>n.length);
  ok(onCount===1,"exactly one match is the current one");
  const onVisible=await pg.evaluate(()=>{const r=document.querySelector("mark.on").getBoundingClientRect();
    return r.top>60&&r.top<window.innerHeight;});
  ok(onVisible,"the current match is scrolled into view");
  await pg.click("#sprev");await pg.waitForTimeout(500);
  ok(await pg.textContent("#scount")===first,"‹ goes back to it");

  // a heading match brings its whole section back, not just the line
  await pg.fill("#q","Casing a job");
  await pg.waitForTimeout(350);
  const secShown=await pg.evaluate(()=>{const s=document.getElementById("case");
    return {vis:!s.classList.contains("hb-hide"),lis:s.querySelectorAll("li:not(.hb-hide)").length};});
  ok(secShown.vis&&secShown.lis>=4,"searching a heading brings the whole section back ("+secShown.lis+" lines)");

  await pg.fill("#q","zzzqqqx");
  await pg.waitForTimeout(350);
  ok(await pg.textContent("#scount")==="nothing found","a term that isn't there says so");
  ok(await pg.isVisible(".nores.show"),"and says it on the page");

  await pg.click("#sclr");
  await pg.waitForTimeout(250);
  const backChapters=await pg.$$eval(".chapter:not(.hb-hide)",n=>n.length);
  const backMarks=await pg.$$eval("mark",n=>n.length);
  ok(backChapters===chs&&backMarks===0,"clearing puts all "+chs+" chapters and every line back");
  ok(await pg.isVisible("#contents"),"and the contents comes back");

  await pg.fill("#q","heat");
  await pg.waitForTimeout(350);
  await pg.keyboard.press("Escape");
  await pg.waitForTimeout(250);
  ok(await pg.$$eval(".chapter:not(.hb-hide)",n=>n.length)===chs,"Escape clears it too");

  console.log("\n— go to the top, and back to the game —");
  await pg.evaluate(()=>window.scrollTo(0,5000));
  await pg.waitForTimeout(300);
  ok(await pg.evaluate(()=>document.querySelector(".float").classList.contains("show")),
    "the floating buttons appear once you are down the page");
  await pg.click("#ftop");
  await pg.waitForTimeout(900);
  ok(await pg.evaluate(()=>window.scrollY)<5,"↑ Top returns to the top");
  await pg.evaluate(()=>window.scrollTo(0,5000));
  await pg.waitForTimeout(300);
  await pg.click("#fcon");
  await pg.waitForTimeout(900);
  const ctTop=await pg.evaluate(()=>document.getElementById("contents").getBoundingClientRect().top);
  ok(Math.abs(ctTop)<160,"Contents returns to the index (top "+Math.round(ctTop)+")");
  const href=await pg.getAttribute("#back","href");
  ok(href.endsWith("index.html"),"back to the game points at the game beside it ('"+href+"')");
  const A="https://claude.ai/artifact/4epD8iym482mpSqEj7ZJhN";
  const r2=await pg.evaluate(()=>[
    window.gameHref("papogambola.github.io","https:"),
    window.gameHref("","file:"),
    window.gameHref("abc123.artifacts.example","https:"),
    window.gameHref("claude.ai","https:")]);
  ok(r2[0]==="index.html"&&r2[1]==="index.html","beside the game on Pages and on disk it is index.html");
  ok(r2[2]===A&&r2[3]===A,"anywhere else it is the artifact");

  console.log("\n— errors —");
  ok(errs.length===0,"no page errors"+(errs.length?":\n"+errs.join("\n"):""));

  await b.close();srv.close();
  console.log("\n"+pass+" passed, "+fail+" failed");
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});

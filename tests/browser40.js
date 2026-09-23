// Build 41: the Log is a Dashboard, and every section says its numbers with its head down.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots41");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+(process.argv[2]?require("path").resolve(process.argv[2]):GAME));
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Paz");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  const drain=async()=>{let n=0;while(await page.$(".modal.notice")||await page.$('[data-act="loose"]')){
    if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');else await page.click('[data-act="loose"][data-i="0"]');
    await page.waitForTimeout(90);if(++n>30)break;}};
  await drain();

  // ---- the game still opens on Crew
  check(await page.evaluate(()=>S.tab==="crew"),"the game still opens on Crew, as asked");
  // Tabs only — the key cap each one now wears is stripped with the counters, and QRH sits at the
  // end of the row without being a tab, so "last" means last of the things that switch a tab.
  const tabs=await page.evaluate(()=>[...document.querySelectorAll('.tab[data-act="tab"]')]
    .map(e=>{const cap=e.querySelector(".kcap");const t=cap?e.textContent.replace(cap.textContent,""):e.textContent;
      return t.replace(/\d+\/?\d*/g,"").trim();}));
  check(tabs.indexOf("Dashboard")>=0,"and the tab is called Dashboard: "+tabs.join(" | "));
  check(tabs.indexOf("Log")<0,"there is no Log tab any more");
  check(tabs[tabs.length-1]==="Dashboard","it is where Log was, the last tab in the row");
  const after=await page.evaluate(()=>{const all=[...document.querySelectorAll(".tab")];
    return all[all.length-1].getAttribute("data-act");});
  check(after==="qrh","with only the QRH card beyond it, which is not a tab");

  const set=()=>page.evaluate(()=>{
    S.money=5e6;S.heat=62;S.rep=160;
    while(recruits().length<4){const c=S.roster.find(x=>x.status==="available"&&canSign(x));if(!c)break;
      c.status="crew";c._touched=true;S.crewIds.push(c.id);}
    S.retainers=S.retainers||{};S.retainers.lawyer=true;S.safehouse=1;
    S.notices=[];S.modal=null;S.tab="log";render();});
  await set();await drain();await page.waitForTimeout(250);

  const read=()=>page.evaluate(()=>({
    folds:[...document.querySelectorAll(".fold")].map(e=>({
      k:e.getAttribute("data-fold"),on:e.classList.contains("on"),
      t:e.querySelector(".fold-t").textContent.trim(),
      s:e.querySelector(".fold-s").innerText.replace(/\s+/g," ").trim(),
      body:!!e.querySelector(".fold-b")})),
    h:Math.round(document.documentElement.scrollHeight),view:window.innerHeight,
    content:[...document.querySelectorAll(".fold")].reduce((n,e)=>n+e.getBoundingClientRect().height,0)|0}));

  const A=await read();
  /* By NAME, not by count. This read "six sections" and broke the day a seventh was added — a
     bare number tells you something changed but not whether it was meant to, and the fix for it
     is always to bump the number, which is no test at all. These are the sections the dashboard
     is FOR; an extra one beside them is somebody's new work, not a failure. */
  const WANT=["The operation","The competition and the law","Standing arrangements",
              "The record","Job recaps","Case log"];
  const got=A.folds.map(f=>f.t);
  const missing=WANT.filter(w=>!got.includes(w));
  check(!missing.length,"every section the dashboard is for is on it"
    +(missing.length?" — missing "+missing.join(", "):" ("+got.length+" in all: "+got.join(", ")+")"));
  check(A.folds.every(f=>f.s.length>4),"every one says its numbers with its head down");
  check(A.folds.filter(f=>f.on).length===0,"the screen opens as an index of itself — nothing expanded, everything summarised");
  check(A.folds.every(f=>f.on===f.body),"a shut section draws nothing at all, so it costs no height");

  // the two the creator said got lost are on the first screen
  const law=A.folds.find(f=>f.k==="law"), arr=A.folds.find(f=>f.k==="arrange");
  const pos=await page.evaluate(()=>{const o={};
    document.querySelectorAll(".fold").forEach(e=>{o[e.getAttribute("data-fold")]=Math.round(e.getBoundingClientRect().top);});
    return {tops:o,view:window.innerHeight};});
  check(pos.tops.law<pos.view,"The competition and the law is on the first screen, not four panels down ("+pos.tops.law+"px)");
  check(pos.tops.arrange<pos.view,"and so is Standing arrangements ("+pos.tops.arrange+"px)");
  check(pos.tops.caselog<pos.view,"and so is everything else ("+pos.tops.caselog+"px, viewport "+pos.view+")");
  check(A.h<=A.view,"and the whole of it fits one screen with nothing to scroll ("+A.h+"px against "+A.view+")");
  await page.screenshot({path:OUT+"/02-dash.png"});

  // the summaries carry real numbers, not labels
  check(/\d+ of \d+ places/.test(A.folds.find(f=>f.k==="op").s),"the operation says its places: "+JSON.stringify(A.folds.find(f=>f.k==="op").s));
  /* Against the heat the game is actually holding, not the 62 this test set earlier — draining
     the week's queue can move it, and then a test about "does the summary print the heat" fails
     for a reason that has nothing to do with the summary. */
  const liveHeat=await page.evaluate(()=>S.heat);
  check(new RegExp("heat "+liveHeat).test(arr.s)&&/\$/.test(arr.s),
    "arrangements says the money and the heat ("+liveHeat+"): "+JSON.stringify(arr.s));
  check(/marks/.test(A.folds.find(f=>f.k==="record").s),"the record says the marks: "+JSON.stringify(A.folds.find(f=>f.k==="record").s));

  // ---- opening and shutting
  await page.click('.fold[data-fold="law"] .fold-h');
  await page.waitForTimeout(200);
  const B=await read();
  check(B.folds.find(f=>f.k==="law").on,"clicking a header opens it");
  check(B.folds.find(f=>f.k==="law").body,"and the panel appears");
  check(B.content>A.content,"which is the only thing that ever makes it longer ("+A.content+"px → "+B.content+"px of sections)");
  await page.click('.fold[data-fold="law"] .fold-h');
  await page.waitForTimeout(200);
  check(!(await read()).folds.find(f=>f.k==="law").on,"clicking it again shuts it");

  // ---- and it is remembered
  // one at a time: opening a second shuts the first, so the screen never grows into a scroll
  await page.click('.fold[data-fold="law"] .fold-h');
  await page.waitForTimeout(180);
  check((await read()).folds.filter(f=>f.on).map(f=>f.k).join(",")==="law","one open");
  await page.click('.fold[data-fold="record"] .fold-h');
  await page.waitForTimeout(180);
  const two=(await read()).folds.filter(f=>f.on).map(f=>f.k);
  check(two.length===1&&two[0]==="record","opening another shuts the first — only "+two.join(",")+" is open");
  await page.click('.fold[data-fold="arrange"] .fold-h');
  await page.waitForTimeout(200);
  const want=(await read()).folds.filter(f=>f.on).map(f=>f.k).join(",");
  check(want==="arrange","left with only Standing arrangements open");
  const stillOne=await page.evaluate(()=>{const d=document.documentElement;
    return {h:Math.round(d.scrollHeight),view:window.innerHeight};});
  check(stillOne.h<=stillOne.view*1.35,"and with one open the screen is still about one screen ("+stillOne.h+"px)");
  // save first: the test had been mutating S in place, so a reload came back to no game at all
  // The title screen is where a reload lands by design — Continue picks the save back up.
  await page.evaluate(()=>save());
  await page.reload();
  await page.waitForSelector('[data-act="continue"]',{timeout:20000});
  await page.click('[data-act="continue"]');
  await page.waitForSelector(".topbar",{timeout:20000});
  await drain();
  await page.evaluate(()=>{S.tab="log";render();});
  await page.waitForTimeout(250);
  const C=await read();
  check(C.folds.filter(f=>f.on).map(f=>f.k).join(",")===want,"and it is still that way after a reload — the habit is remembered");
  check(await page.evaluate(()=>!!(SET.folds&&Object.keys(SET.folds).length)),"kept in settings, so it survives a new game too");

  // ---- the places count follows the rank, which it did not before
  const places=await page.evaluate(()=>{
    S.rep=160;S.tab="log";SET.folds={op:true};render();
    const rows=[...document.querySelectorAll(".fold-b .kv, .fold-b .mono, .fold-b div")].map(e=>e.textContent);
    const line=(document.querySelector('.fold[data-fold="op"] .fold-b')||{innerText:""}).innerText;
    const m=/Places filled\s+(\d+) \/ (\d+)/.exec(line);
    return m?{filled:+m[1],of:+m[2],seats:1+crewSeats()}:{line:line.slice(0,120)};});
  check(places.of===places.seats,"Places filled counts the places the name actually opens ("+places.filled+" / "+places.of+")");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

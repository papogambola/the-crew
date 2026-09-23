// Build 43: the player's handbook, and the four ways into it from the game.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots43");fs.mkdirSync(OUT,{recursive:true});
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

  // ---- the title screen carries it before a game is even started
  const footLink=await page.$('.foot-note [data-act="off-handbook"]');
  check(!!footLink,"the title screen's footer offers the player's handbook");
  check((await page.textContent('.foot-note [data-act="off-handbook"]')).toLowerCase().indexOf("handbook")>=0,
    "and says so in words: \""+(await page.textContent('.foot-note [data-act="off-handbook"]'))+"\"");

  // ---- where the link points. Run, not read: the game is served from three different places
  //      and asked each time, rather than the rule being copied into the test and agreed with.
  check(await page.evaluate(()=>handbookHref())==="handbook.html",
    "opened from disk it points beside the game");
  /* There used to be a second address here — an absolute claude.ai artifact URL the game fell
     back to, chosen by an allowlist of hostnames — and this line checked it was the right one.
     The artifacts are finished and the branch is gone, so the assertion is now the opposite and
     a stronger one: there is no second address to be wrong. HANDBOOK_URL no longer existing is
     what the test is for, and referencing it is what made this suite die rather than fail. */
  check(await page.evaluate(()=>typeof HANDBOOK_URL==="undefined"),
    "and there is no second address for it to choose between any more");

  // ---- the footer link opens it, in a new tab, without navigating the game away
  const before=page.url();
  const [pop]=await Promise.all([
    page.context().waitForEvent("page"),
    page.click('.foot-note [data-act="off-handbook"]'),
  ]);
  check(!!pop,"clicking it opens a tab");
  check(pop.url().indexOf("handbook.html")>=0,"the tab is the handbook ("+pop.url().split("/").pop()+")");
  check(page.url()===before,"and the game is still where it was");
  // the handbook that opened is the real one, with its four fittings
  await pop.waitForLoadState("load");
  // The handbook is a BOOK now — a closed cover you click to open and pages you click to turn —
  // so there is no page to scroll to the top of and no run of .chapter sections in the document;
  // the leaves are paginated and most of them are in a store off-screen. What this drive is about
  // is the four ways INTO it from the game, so it asks only that what opened is the book itself.
  // The book's own workings are driven by tools/handbook/hb-drive.js, in a hundred assertions.
  await pop.waitForTimeout(1200);
  const fit=await pop.evaluate(()=>({
    title:document.title,
    q:!!document.getElementById("q"),
    idx:document.querySelectorAll("[data-jump]").length,
    cover:!!document.querySelector("#closed, .closed"),
    back:!!document.getElementById("back"),
    pages:typeof window.bookPages==="function"?window.bookPages():0,
  }));
  check(fit.title==="The Crew — Player's Handbook","it is the handbook: \""+fit.title+"\"");
  check(fit.q,"with the pinned search bar");
  check(fit.idx>=85,"a clickable index of "+fit.idx+" lines");
  check(fit.cover,"and it opens closed, as a book");
  check(fit.back,"with a way back to the game");
  check(fit.pages>40,fit.pages+" pages in it");
  await pop.close();

  // ---- and from inside the office: the desk, the word button, and the controls book
  await page.click('[data-act="begin"]');await page.fill("#pname","Paz");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  let n=0;while(await page.$(".modal.notice")||await page.$('[data-act="loose"]')){
    if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');else await page.click('[data-act="loose"][data-i="0"]');
    await page.waitForTimeout(90);if(++n>30)break;}

  await page.click(".burger");
  await page.waitForSelector(".office");
  const onDesk=await page.$('.office-svg [data-act="off-handbook"]');
  check(!!onDesk,"the office has the handbook in it");
  const label=await page.textContent('.office-svg [data-act="off-handbook"] text');
  check(label.trim()==="HANDBOOK","the book says "+label.trim());
  const box=await onDesk.boundingBox();
  const ctrl=await (await page.$('.office-svg [data-act="off-controls"]')).boundingBox();
  check(box.width>40&&box.height>20,"it is a real object in the room ("+Math.round(box.width)+"×"+Math.round(box.height)+")");
  check(box.y<ctrl.y&&box.x<ctrl.x,"on its own shelf, clear of the controls book on the desk");
  const wordBtn=await page.$('.office-words [data-act="off-handbook"]');
  check(!!wordBtn,"and a Handbook button in the row of words under the drawing");
  await page.screenshot({path:path.join(OUT,"office.png")});

  const [pop2]=await Promise.all([page.context().waitForEvent("page"),wordBtn.click()]);
  check(pop2.url().indexOf("handbook.html")>=0,"the button opens it");
  await pop2.close();

  await page.click('[data-act="off-controls"]');
  await page.waitForTimeout(150);
  const ctrlTxt=await page.textContent(".modal-b");
  check(/handbook/i.test(ctrlTxt),"the controls book explains the handbook too");
  check(/search bar/i.test(ctrlTxt)&&/index/i.test(ctrlTxt),"and says what is in it");
  const [pop3]=await Promise.all([page.context().waitForEvent("page"),page.click('.modal-b [data-act="off-handbook"]')]);
  check(pop3.url().indexOf("handbook.html")>=0,"and opens it from there");
  await pop3.close();
  await page.screenshot({path:path.join(OUT,"controls.png")});

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();

  // ---- the same question asked of a served copy, under two hostnames that are not this disk
  const http=require("http");
  const MIME={".html":"text/html"};
  // Served from the REPOSITORY, not from this directory: the assertion below is about a link
  // that points beside the game, so the thing beside the game has to be what is served. Rooting
  // the server at tests/ 404s the game itself, which is what happened when the suite moved in.
  const srv=http.createServer((q,r)=>{const f=path.join(ROOT,decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/,""));
    fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(b);});});
  await new Promise(r=>srv.listen(8907,"127.0.0.1",r));
  const b2=await chromium.launch({executablePath:CHROME,
    args:["--host-resolver-rules=MAP papogambola.github.io 127.0.0.1, MAP somewhere.else 127.0.0.1, MAP playthecrew.com 127.0.0.1"]});
  /* Both of these used to give DIFFERENT answers, and that was the bug: the game chose between
     a relative link and an absolute artifact URL by matching the hostname it had landed on
     against a list of the ones we knew about. The day it moved to playthecrew.com every route
     into the handbook started sending players to claude.ai, and the old github.io address did
     it too because it redirects. There is one link now and no condition, so the interesting
     assertion is that an address NOBODY has ever heard of gets the same answer as the one we
     ship from. A host the game does not recognise is the case that broke. */
  for(const host of ["papogambola.github.io","somewhere.else","playthecrew.com"]){
    const p2=await b2.newPage();
    await p2.goto("http://"+host+":8907/"+path.relative(ROOT,GAME),{waitUntil:"domcontentloaded"});
    const got=await p2.evaluate(()=>handbookHref());
    check(got==="handbook.html","served from "+host+" it still points beside the game (got '"+got+"')");
    await p2.close();
  }
  await b2.close();srv.close();
})();

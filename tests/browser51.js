// Build 75: a modal fits the window, its way out is nailed to the bottom, and nothing that ends
// somebody sits next to the button that means "next".
//
// The report: a signed trip was taller than the screen, so Continue was below the fold — and the
// row immediately above it was Bonus / Teach a trade / CUT LOOSE. Two accidental clicks on Cut
// loose threw away a fee and the weeks that bought it.
//
// So this drive measures pixels, not words: where the buttons are, whether the page had to move,
// and how far the nearest destructive button is from the one you are meant to press.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots51");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:820}});
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
    await page.waitForTimeout(80);if(++n>30)break;}};
  await drain();

  // Where a thing is, in the window, and whether the page had to move to show it.
  const box=sel=>page.evaluate(s=>{const e=document.querySelector(s);if(!e)return null;
    const r=e.getBoundingClientRect();
    return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,h:r.height,
      inWindow:r.top>=0&&r.bottom<=innerHeight,vh:innerHeight,scrollY:scrollY};},sel);

  /* ================= the signed trip ================= */
  console.log("\n— the screen that says SIGNED —");
  const signed=await page.evaluate(()=>{
    S.money=5e7;SET.speed=4;S.notices=[];S.modal=null;S.pendingTrip=null;
    for(let i=0;i<500;i++){
      const c=S.roster.find(x=>x.status==="available"&&canApproach(x)&&!x._t);
      if(!c)return null;c._t=true;
      hire(c.id);
      const T=S.modal&&S.modal.data;
      if(!T){S.modal=null;S.pendingTrip=null;continue;}
      if(T.snag)tripChoose(0); else tickerFinish();
      const d=S.modal&&S.modal.data;
      if(d&&d.done&&d.outcome==="signed")return {who:d.first,paid:d.paid};
      S.modal=null;S.pendingTrip=null;
    }
    return null;});
  check(signed,"somebody signed: "+(signed&&signed.who)+" for "+(signed&&signed.paid));
  await page.waitForTimeout(250);
  check(await page.$(".modal"),"the report is on screen");

  // 1. It fits. The whole sheet, head to foot, inside the window — no page scroll to read it.
  const modal=await box(".modal");
  check(modal.h<=modal.vh,"the sheet fits the window: "+Math.round(modal.h)+"px in "+modal.vh+"px");
  check(modal.inWindow,"top and bottom both on screen (top "+Math.round(modal.top)+", bottom "+Math.round(modal.bottom)+")");
  check(await page.evaluate(()=>scrollY)===0,"and the page has not been scrolled to manage it");

  // 2. Continue is visible without moving anything.
  const cont=await box('.modal-f [data-act="scrim"]');
  check(cont,"Continue is in the pinned foot of the sheet");
  check(cont&&cont.inWindow,"and is on screen as it opens — top "+Math.round(cont.top)+" of "+cont.vh);

  // 3. Nothing that ends anybody is on this screen at all.
  const acts=await page.evaluate(()=>[...document.querySelectorAll(".modal [data-act]")].map(e=>e.getAttribute("data-act")));
  check(!acts.includes("drop"),"no Cut loose button anywhere on it");
  check(!acts.includes("bonus"),"no Bonus either — you agreed terms with them a minute ago");
  check(!acts.includes("learn"),"and no Teach a trade");
  const card=await page.evaluate(()=>{const e=document.querySelector(".modal .id");return e?e.innerText:"";});
  check(/Loyalty/i.test(card),"the file is still there in full — who you now have");
  check(/Crew tab/i.test(card),"and it says where those buttons went: \""+(card.split("\n").pop()||"").trim()+"\"");
  await page.screenshot({path:OUT+"/1-signed.png"});

  // 4. The body is what scrolls, if anything does.
  const body=await page.evaluate(()=>{const e=document.querySelector(".modal-b");
    return {scrollable:e.scrollHeight>e.clientHeight+1,ov:getComputedStyle(e).overflowY};});
  check(body.ov==="auto","the body is the scroller ("+body.ov+"), not the page");

  // Still works: Continue actually continues.
  await page.click('.modal-f [data-act="scrim"]');
  await page.waitForTimeout(250);
  check(await page.evaluate(()=>!S.modal||S.modal.type!=="trip"),"and Continue closes it");

  /* ================= the longest sheet in the game: a job report ================= */
  console.log("\n— the job report —");
  await drain();
  const ran=await page.evaluate(()=>{
    S.modal=null;S.money=5e7;
    // fill the crew so a job can actually be run
    for(let i=0;i<40&&recruits().length<crewSeats();i++){
      const c=S.roster.find(x=>x.status==="available"&&canApproach(x));
      if(!c)break;hire(c.id);
      const T=S.modal&&S.modal.data;if(T&&T.snag)tripChoose(0);else if(T)tickerFinish();
      S.modal=null;S.pendingTrip=null;
    }
    S.notices=[];S.modal=null;
    const j=S.jobs.find(x=>assessJob(x,jobPool(x),null).canRun);
    if(!j)return null;
    doExecute(j.id);
    const d=S.modal&&S.modal.data;if(!d)return null;
    tickerFinish();
    const e=S.modal&&S.modal.data;
    if(e&&e.awaiting&&e.twist&&!e.resolved){twistChoose(0);tickerFinish();}
    const f=S.modal&&S.modal.data;
    return f&&f.done?{verdict:f.verdictName}:null;});
  if(ran){
    await page.waitForTimeout(300);
    check(true,"a job came back: "+ran.verdict);
    const m2=await box(".modal");
    check(m2.h<=m2.vh,"the report fits the window too: "+Math.round(m2.h)+"px in "+m2.vh+"px");
    const c2=await box('.modal-f [data-act="scrim"]');
    check(c2&&c2.inWindow,"and its Continue is on screen without scrolling");
    await page.screenshot({path:OUT+"/2-report.png"});
    await page.click('.modal-f [data-act="scrim"]');await page.waitForTimeout(200);
  } else check(true,"no runnable job to report on this seed");

  /* ================= cutting somebody loose is asked ================= */
  console.log("\n— Cut loose asks —");
  await drain();
  // This section is about where the buttons are, not about the modal queue — so clear the desk
  // rather than hoping nothing lands on it mid-click. A notice sliding in between the two halves
  // of the accident would eat the click and prove nothing either way.
  const clearDesk=()=>page.evaluate(()=>{
    S.modal=null;S.notices=[];S.apply=null;S.clash=null;S.revenge=null;S.event=null;
    if(Array.isArray(S.loose))S.loose=[];
    UI.confirmDrop=null;                 // and no card left armed from the last thing this drive did
    S.tab="crew";render();});
  await clearDesk();
  await page.waitForTimeout(250);
  check(!(await page.$(".scrim")),"nothing else is on the desk");
  const before=await page.evaluate(()=>recruits().filter(c=>c.status==="crew").length);
  check(before>0,before+" on the crew");
  const first=await page.evaluate(()=>{const b=document.querySelector('[data-act="drop"]');return b?b.getAttribute("data-id"):null;});
  check(first,"there is a Cut loose button on the crew tab");

  // The accident: click it, then click the same spot again straight away.
  const spot=await page.evaluate(()=>{const b=document.querySelector('[data-act="drop"]');const r=b.getBoundingClientRect();
    return {x:r.x+r.width/2,y:r.y+r.height/2};});
  // The first click goes through the element, so Playwright waits for it to be actually clickable
  // — a raw click at a remembered coordinate can land a frame early and arm nothing, which fails
  // this for a reason that has nothing to do with the confirm. The SECOND click is the one that
  // has to be at the remembered spot, because that is the accident being tested.
  await page.click('[data-act="drop"]');
  await page.waitForTimeout(200);
  const stillOn=await page.evaluate(()=>recruits().filter(c=>c.status==="crew").length);
  check(stillOn===before,"one click does not cut anybody loose — it asks");
  const asked=await page.evaluate(()=>{const e=[...document.querySelectorAll(".id")].find(x=>x.querySelector('[data-act="drop-yes"]'));
    return e?e.innerText:"";});
  check(/keeps what they know/i.test(asked),"and says what it costs: \""+(asked.split("\n").find(l=>/keeps what they know/i.test(l))||"").trim()+"\"");
  // The second click of the accident lands where the first one did — and that spot is now "Keep them".
  const atSpot=await page.evaluate(p=>{const e=document.elementFromPoint(p.x,p.y);
    const b=e&&e.closest("[data-act]");return b?{act:b.getAttribute("data-act"),label:b.textContent.trim()}:null;},spot);
  // What matters is that the axe is NOT under the finger any more. Whether the spot now holds
  // "Keep them" or nothing at all depends on how the confirm strip wraps at this width, and a test
  // that insists on the former measures the layout rather than the safety.
  check(!atSpot||atSpot.act!=="drop-yes",
    "and the second click of the same accident does not land on the axe (it lands on "
    +(atSpot?'"'+atSpot.label+'"':"nothing")+")");
  await page.screenshot({path:OUT+"/3-asked.png"});
  await page.mouse.click(spot.x,spot.y);
  await page.waitForTimeout(150);
  check(await page.evaluate(()=>recruits().filter(c=>c.status==="crew").length)===before,
    "so the double click leaves the crew exactly as it was");

  // And when you do mean it, it happens. Counted from where the crew actually is at this moment
  // rather than from a number taken several steps ago, and against the person the buttons name,
  // so a card armed earlier or a second card in the way cannot make this read as a failure.
  // Counted over everybody on the books, not only those with status "crew": an injured member has
  // a card and a Cut loose button like anyone else, and cutting one of THEM loose leaves the
  // crew-status count untouched — which read as "the drop did nothing" when the drop was fine.
  // And the id is a string ("C1037"), so it is read as one; +id gives NaN and the check that the
  // named person actually left passes on nobody.
  await clearDesk();await page.waitForTimeout(150);
  const now=await page.evaluate(()=>recruits().length);
  await page.click('[data-act="drop"]');await page.waitForTimeout(200);
  const who=await page.evaluate(()=>{const b=document.querySelector('[data-act="drop-yes"]');
    return b?b.getAttribute("data-id"):null;});
  check(who,"one card is armed, and names who: "+who);
  await page.click('[data-act="drop-yes"]');await page.waitForTimeout(250);
  const after=await page.evaluate(id=>({n:recruits().length,
    gone:!recruits().some(c=>c.id===id),status:(byId(id)||{}).status}),who);
  check(after.n===now-1&&after.gone&&after.status==="available",
    "saying it twice, deliberately, does cut them loose — off the books and back on the roster ("
    +now+" → "+after.n+", "+who+" is now \""+after.status+"\")");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

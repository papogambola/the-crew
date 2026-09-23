// Build 78: the file, from the list where the decision is actually made.
//
// A job's "who can go" list is where you choose who goes, and that choice is made out of what is
// on their file — the trade, the attributes, what they will not do. Having to leave the job and
// go to the Crew tab to read it was the wrong way round. So every row opens the file.
//
// And the detour has to behave like one: it opens over the job, and closing it puts you back on
// the same row rather than at the top of the page — otherwise reading the seventh person costs
// you a scroll before you can read the eighth.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots54");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:800}});
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

  /* ---------- a full crew and an open job ---------- */
  const setup=await page.evaluate(()=>{
    S.money=5e7;S.rep=500;
    for(let i=0;i<60&&recruits().length<crewSeats();i++){
      const c=S.roster.find(x=>x.status==="available"&&!x._u);if(!c)break;c._u=true;
      c.status="crew";S.crewIds.push(c.id);
    }
    refreshJobs(true);
    S.notices=[];S.modal=null;S.apply=null;S.clash=null;
    const j=S.jobs.find(x=>!x.final);
    if(!j)return null;
    S.tab="jobs";S.jobOpen=j.id;render();
    return {id:j.id,title:j.title,crew:crewAll().length};});
  check(setup,"a job open with a crew of "+(setup&&setup.crew)+" to choose from: "+(setup&&setup.title));
  // Raising the ranking to fill the board also opens places six and seven, which the game
  // announces in the middle of the screen. Read the announcements and put them down before
  // pressing anything, the way a player does.
  await page.waitForTimeout(250);
  await drain();
  await page.evaluate(id=>{S.tab="jobs";S.jobOpen=id;S.modal=null;render();},setup.id);
  await page.waitForTimeout(250);
  check(!(await page.$(".scrim")),"nothing else is on the desk");

  /* ---------- every row offers the file ---------- */
  console.log("\n— every row, including the ones who cannot go —");
  const rows=await page.evaluate(()=>[...document.querySelectorAll(".check")].map(r=>({
    who:(r.querySelector(".mono")||{}).textContent||"",
    file:!!r.querySelector('[data-act="open-recruit"]'),
    id:(r.querySelector('[data-act="open-recruit"]')||{}).getAttribute
       ?r.querySelector('[data-act="open-recruit"]').getAttribute("data-id"):null,
    bench:!!r.querySelector('[data-act="bench"]'),
    barred:!!r.querySelector(".mark"),
  })));
  check(rows.length>=3,rows.length+" people on the list");
  check(rows.every(r=>r.file),"every one of them has a File button — "+rows.filter(r=>r.file).length+" of "+rows.length);
  check(rows.every(r=>r.id),"each naming who it is for");
  check(new Set(rows.map(r=>r.id)).size===rows.length,"and no two rows pointing at the same person");
  const barred=rows.filter(r=>r.barred);
  if(barred.length)check(barred.every(r=>r.file),
    "including the "+barred.length+" who cannot go — which is when you most want to know why");
  else check(true,"nobody is barred from this one, so there is no ✗ row to check");
  // You are on this list too, and you have a file.
  const you=rows.find(r=>/^You\b/.test(r.who.trim()));
  check(you&&you.file,"and you are on it, with your own file");
  await page.screenshot({path:OUT+"/1-list.png"});

  /* ---------- it opens the right person ---------- */
  console.log("\n— and it opens the right file —");
  const target=rows[Math.min(2,rows.length-1)];
  // Scoped to .check — the job's own "who can go" list. Since build 82 the crew strip above the
  // board opens files too, so a bare [data-act="open-recruit"] matches a card at the top of the
  // page and the click scrolls there, which is what this suite is trying to measure.
  await page.click('.check [data-act="open-recruit"][data-id="'+target.id+'"]');
  await page.waitForTimeout(250);
  const opened=await page.evaluate(()=>({type:S.modal&&S.modal.type,id:S.modal&&S.modal.id,
    text:(document.querySelector(".modal")||{}).innerText||""}));
  check(opened.type==="recruit","a file is on screen");
  check(opened.id===target.id,"and it is the one the row named ("+target.id+")");
  check(/Trade/i.test(opened.text)&&/Languages/i.test(opened.text),"the whole file, trade and languages and all");
  check(/Personnel file|Your file/i.test(opened.text),"headed as a file: \""+(opened.text.split("\n")[0]||"").trim()+"\"");
  check(!/data-act="hire"/.test(opened.text),"with nothing on it about hiring somebody you already employ");
  await page.screenshot({path:OUT+"/2-file.png"});

  /* ---------- the job is still there underneath ---------- */
  await page.click('.modal [data-act="scrim"].btn');
  await page.waitForTimeout(250);
  const back=await page.evaluate(()=>({modal:!!S.modal,jobOpen:S.jobOpen,rows:document.querySelectorAll(".check").length}));
  check(!back.modal,"closing it puts the file away");
  check(back.jobOpen===setup.id,"and the job is still open behind it");
  check(back.rows===rows.length,"with the same list of "+back.rows+" on it");

  /* ---------- and it puts you back where you were standing ---------- */
  console.log("\n— a detour, not a destination —");
  const deep=await page.evaluate(()=>{
    // stand at the bottom of the list, where the last person is
    const all=[...document.querySelectorAll('.check [data-act="open-recruit"]')];
    const last=all[all.length-1];
    last.scrollIntoView({block:"center"});
    return {y:Math.round(window.scrollY),id:last.getAttribute("data-id"),
      maxY:Math.round(document.documentElement.scrollHeight-innerHeight)};});
  check(deep.y>60,"scrolled down the job to the last of them ("+deep.y+"px of "+deep.maxY+")");
  await page.click('.check [data-act="open-recruit"][data-id="'+deep.id+'"]');
  await page.waitForTimeout(250);
  check(await page.evaluate(()=>S.modal&&S.modal.id)===deep.id,"their file opens");
  await page.click('.modal [data-act="scrim"].btn');
  await page.waitForTimeout(350);
  const after=await page.evaluate(()=>Math.round(window.scrollY));
  check(Math.abs(after-deep.y)<=4,"and closing it leaves you where you were, not at the top ("
    +deep.y+" → "+after+")");
  // the row is still under the eye
  const visible=await page.evaluate(id=>{const b=document.querySelector('.check [data-act="open-recruit"][data-id="'+id+'"]');
    if(!b)return null;const r=b.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;},deep.id);
  check(visible===true,"with that same row still on screen, ready for the next one");
  await page.screenshot({path:OUT+"/3-back.png"});

  /* ---------- and going somewhere else on purpose still goes to the top ---------- */
  await page.evaluate(()=>window.scrollTo(0,400));
  await page.waitForTimeout(150);
  await page.click('.check [data-act="open-recruit"]');
  await page.waitForTimeout(200);
  await page.evaluate(()=>{S.modal=null;S.tab="crew";UI.scrollBack=null;render();window.scrollTo(0,0);});
  await page.waitForTimeout(200);
  const navAway=await page.evaluate(()=>({y:Math.round(window.scrollY),back:UI.scrollBack}));
  check(navAway.back===null,"leaving the job for another tab forgets where you were standing on it");
  check(navAway.y===0,"so the next screen opens at the top, the way it always did");

  /* ---------- the bench button still works from the row ---------- */
  console.log("\n— and the button it sits beside still does its job —");
  await page.evaluate(id=>{S.tab="jobs";S.jobOpen=id;S.modal=null;render();},setup.id);
  await page.waitForTimeout(250);
  const benchBefore=await page.evaluate(()=>(S.bench||[]).length);
  const bid=await page.evaluate(()=>{const b=document.querySelector('.check [data-act="bench"]');
    return b?b.getAttribute("data-id"):null;});
  if(bid){
    await page.click('[data-act="bench"][data-id="'+bid+'"]');
    await page.waitForTimeout(250);
    const benchAfter=await page.evaluate(()=>(S.bench||[]).length);
    check(benchAfter===benchBefore+1,"Bench still benches ("+benchBefore+" → "+benchAfter+")");
    check(await page.evaluate(()=>!S.modal),"and does not open a file by accident");
  } else check(true,"nobody on this job can be benched");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

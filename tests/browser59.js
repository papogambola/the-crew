// A twist asks which of your people can do a thing, and the answer is on their files — which were
// behind a modal that will not let you leave until you have answered. C, or 1, brings them to the
// decision. What this checks is that they arrive, that they are the RIGHT people (the ones in that
// room first, the ones at home marked as at home), that the decision underneath is untouched, and
// that the sheet does not eat the keys the decision needs.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots59");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const w=(m.location()||{}).url||"";const t=m.text()+(w?" ["+w+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+(process.argv[2]?require("path").resolve(process.argv[2]):GAME));
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Paz");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  const drain=async()=>{let n=0;while(await page.$(".modal.notice")||await page.$('[data-act="loose"]')){
    if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');else await page.click('[data-act="loose"][data-i="0"]');
    await page.waitForTimeout(70);if(++n>30)break;}};
  await drain();

  /* ================= from the board, before any of it ================= */
  console.log("\n— C, with nothing in the way —");
  await page.evaluate(()=>{
    S.money=5e7;S.rep=500;SET.speed=4;
    for(let i=0;i<60&&recruits().length<crewSeats();i++){
      const c=S.roster.find(x=>x.status==="available"&&!x._u);if(!c)break;c._u=true;
      c.status="crew";S.crewIds.push(c.id);}
    S.notices=[];S.modal=null;S.tab="jobs";render();});
  await drain();
  await page.keyboard.press("c");
  await page.waitForTimeout(300);
  const free=await page.evaluate(()=>({open:!!UI.crew,cards:document.querySelectorAll(".cfiles .id").length,
    heads:[...document.querySelectorAll(".cfiles .cf-h")].map(h=>h.innerText.trim()),
    tab:S.tab,
    txt:(document.querySelector(".cfiles .modal")||{}).innerText||""}));
  check(free.open&&free.cards>0,"C on the board opens the files — "+free.cards+" of them");
  check(free.heads.length===0,"with no job running there is nobody at home, so no headings: "+JSON.stringify(free.heads));
  check(/Knows /.test(free.txt)&&/Speaks /.test(free.txt),"and they are whole files — trade, knowledge, languages");
  check(/MUS/.test(free.txt)&&/NRV/.test(free.txt),"with the five attributes on them");
  check(!/data-act="drop"/.test(free.txt)&&!/Cut loose/.test(free.txt),"and nothing on them you can press by accident");
  // Your own card is not an ordinary member card: reusing one stamped the commander VETTED,
  // across their own name, and offered a loyalty bar for somebody who cannot walk out on themselves.
  const mine=await page.evaluate(()=>{
    const you=[...document.querySelectorAll(".cfiles .id")].find(e=>e.classList.contains("you"));
    if(!you)return null;
    return {stamp:!!you.querySelector(".stampmark"),loy:!!you.querySelector(".loy"),
      nm:(you.querySelector(".nm")||{}).innerText||"",foot:(you.querySelector(".foot")||{}).innerText||""};});
  check(mine&&!mine.stamp,"your own card carries no vetting stamp — you do not vet yourself");
  check(mine&&!mine.loy,"and no loyalty bar, because you cannot walk out on yourself");
  const myTrade=await page.evaluate(()=>TECH_BY_K[S.player.tech].l);
  check(mine&&mine.nm.indexOf(myTrade)>=0,
    "with your name and trade whole, not stamped over: \""+(mine?mine.nm.replace(/\n/g," "):"")+"\"");
  await page.screenshot({path:OUT+"/1-from-the-board.png"});
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  check(await page.evaluate(()=>!UI.crew),"Escape puts them away");
  check(await page.evaluate(()=>S.tab)==="jobs","and leaves the board where it was");

  /* ================= and now the moment it is for ================= */
  console.log("\n— C, in the middle of a twist —");
  const set=await page.evaluate(()=>{
    S.notices=[];S.modal=null;S.pendingJob=null;
    let j=null,any=null;
    for(let t=0;t<80&&!j;t++){
      S.week++;S.jobs=[];refreshJobs(true);
      const run=S.jobs.filter(x=>!x.final&&x.payout>BIG_MONEY&&assessJob(x).canRun&&assessJob(x).team.length>=2);
      any=any||run[0]||null;
      // one that leaves somebody at home — a limit or a border — because the two groups are the point
      j=run.find(x=>assessJob(x).team.length<recruits().length+1)||null;}
    j=j||any;
    if(!j)return null;
    doExecute(j.id);tickerFinish();
    if(!S.pendingJob||!pendingTwists(S.pendingJob).length)return {none:true};
    return {job:S.pendingJob.job.title,city:S.pendingJob.job.city,
      team:S.pendingJob.teamIds.slice(),crew:crewAll().map(c=>c.id),
      awaiting:!!(S.modal&&S.modal.data&&S.modal.data.awaiting)};});
  if(!set||set.none){check(false,"found a job with a twist to stand in the middle of");}
  else{
    check(set.awaiting,"a twist is on the screen, waiting for an answer");
    const home=set.crew.filter(id=>set.team.indexOf(id)<0);
    check(true,"  "+set.team.length+" of the crew went to "+set.city+", "+home.length+" stayed at home");
    // the button the screen offers
    check(await page.$('.twist [data-act="crew-files"]')!==null,"the decision itself offers their files");
    await page.keyboard.press("c");
    await page.waitForTimeout(300);
    const mid=await page.evaluate(()=>{
      const secs=[...document.querySelectorAll(".cfiles .cf-h")].map(h=>h.innerText.trim());
      const grp=[...document.querySelectorAll(".cfiles .cards")].map(g=>({
        away:g.classList.contains("away"),
        ids:[...g.querySelectorAll(".id .nm")].map(n=>n.innerText.trim())}));
      return {open:!!UI.crew,secs,grp,
        line:((document.querySelector(".cfiles .sel-help")||{}).innerText||"").trim(),
        twistStillThere:!!document.querySelector(".twist [data-act=\"twist\"]"),
        awaiting:!!(S.modal&&S.modal.data&&S.modal.data.awaiting),
        answers:(S.pendingJob.answers||[]).length};});
    check(mid.open,"C opens them over the twist");
    check(/On the job/i.test(mid.secs[0]||""),"under a heading that says who is in the room: "+mid.secs.join("  |  "));
    check(!mid.grp[0].away&&mid.grp[0].ids.length===set.team.length,
      "the ones in that room first, and they are exactly who went ("+mid.grp[0].ids.length+" of "+set.team.length+")");
    check(home.length>0,"and this job left "+home.length+" of them at home, which is the case the sheet is for");
    if(home.length){
      check(mid.secs.length===2&&/At home/i.test(mid.secs[1]||""),"a second heading for the ones who did not go");
      check(mid.grp.length===2&&mid.grp[1].away,"faded, so they cannot be mistaken for an answer");
      check(mid.grp[1].ids.length===home.length,"and it is exactly who did not go ("+mid.grp[1].ids.length+")");
    }
    check(/stayed at home/.test(mid.line)||/whole crew/.test(mid.line),"said in words before it is drawn: \""+mid.line+"\"");
    check(mid.twistStillThere&&mid.awaiting&&mid.answers===0,
      "and the twist is still underneath, still unanswered");
    await page.screenshot({path:OUT+"/2-over-a-twist.png"});

    // 1 means the crew too, and must not switch tabs behind the decision
    await page.keyboard.press("Escape");await page.waitForTimeout(200);
    const tabBefore=await page.evaluate(()=>S.tab);
    await page.keyboard.press("1");
    await page.waitForTimeout(300);
    const byOne=await page.evaluate(()=>({open:!!UI.crew,tab:S.tab,modal:!!S.modal}));
    check(byOne.open,"1 over a decision opens the same files");
    check(byOne.tab===tabBefore&&byOne.modal,"and does not switch the tab underneath it");

    // the quick reference and the files are one sheet at a time
    await page.keyboard.press("q");
    await page.waitForTimeout(250);
    const swap=await page.evaluate(()=>({qrh:!!UI.qrh,crew:!!UI.crew,
      sheets:document.querySelectorAll(".above .modal").length}));
    check(swap.qrh&&!swap.crew&&swap.sheets===1,"Q swaps them rather than stacking two sheets over one decision");
    await page.keyboard.press("Escape");await page.waitForTimeout(200);

    // and the decision still works afterwards
    const opts=await page.$$('.twist [data-act="twist"]');
    check(opts.length===6,"six options still on the twist ("+opts.length+")");
    await opts[0].click();
    await page.waitForTimeout(400);
    const after=await page.evaluate(()=>({answers:(S.pendingJob&&S.pendingJob.answers||[]).length,
      done:!S.pendingJob,crew:!!UI.crew}));
    check(after.answers>=1||after.done,"answering it still answers it");
    check(!after.crew,"and the files are not left standing over the next thing");
  }

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

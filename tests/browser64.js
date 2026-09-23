// A button that names where it is going tells you the shape of the story before the story. "Skip
// to the decision" meant a twist was coming; "Skip to the end" meant none was — and a player who
// had read one line of the feed already knew which kind of night this was. Same fault as printing
// "twist 1 of 2". Where Skip lands is the answer; the label is not allowed to be.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots64");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1440,height:950}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json|version\.txt/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const w=(m.location()||{}).url||"";const t=m.text()+(w?" ["+w+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+(process.argv[2]?require("path").resolve(process.argv[2]):GAME));
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Paz");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  const drain=async()=>{let n=0;while(await page.$(".modal.notice")||await page.$('[data-act="loose"]')){
    if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');else await page.click('[data-act="loose"][data-i="0"]');
    await page.waitForTimeout(70);if(++n>30)break;}};
  await drain();
  await page.evaluate(()=>{S.money=5e7;S.rep=500;SET.speed=1;
    for(let i=0;i<60&&recruits().length<crewSeats();i++){
      const c=S.roster.find(x=>x.status==="available"&&!x._u);if(!c)break;c._u=true;c.status="crew";S.crewIds.push(c.id);}
    S.notices=[];S.modal=null;render();});
  await drain();

  /* ============ the label says the same thing either way ============ */
  console.log("— a night with something in it, and a night without —");
  // Start jobs until one of each has been seen, and read the button at the FIRST line of the feed,
  // which is the moment the old label gave the game away.
  const startOne=(want)=>page.evaluate(w=>{
    S.modal=null;S.notices=[];S.pendingJob=null;
    for(let t=0;t<80;t++){
      S.week++;S.jobs=[];refreshJobs(true);
      const runnable=S.jobs.filter(x=>!x.final&&assessJob(x).canRun&&assessJob(x).team.length>=2);
      for(const j of runnable){
        const snap=JSON.stringify(packState());
        doExecute(j.id);                       // the action, which is what opens the feed
        const has=!!(S.pendingJob&&pendingTwists(S.pendingJob).length);
        const d=S.modal&&S.modal.data;
        // build 102: the night opens on a card of the city and the feed is not behind it yet —
        // and this file is about the button ON the feed. Click the card away, as a player does.
        if(has===w){estabClear();return {twist:has,lines:d?d.narrative.length:0};}
        // put the night back and try another
        localStorage.setItem(SAVE_KEY,snap);load();S.modal=null;S.pendingJob=null;render();
      }
    }
    return null;},want);
  const label=()=>page.evaluate(()=>{
    const b=document.querySelector('[data-act="skip-ticker"]');
    return b?{txt:b.innerText.trim(),title:b.getAttribute("title")||""}:null;});

  const withTwist=await startOne(true);
  check(withTwist,"found a job with something waiting in it");
  await page.waitForTimeout(250);
  const L1=await label();
  check(L1,"the feed is running, with a Skip on it");
  await page.screenshot({path:OUT+"/1-with-a-twist.png"});

  const without=await startOne(false);
  check(without,"and a job with nothing waiting in it");
  await page.waitForTimeout(250);
  const L2=await label();
  check(L2,"that feed has a Skip too");

  check(L1&&L2&&L1.txt===L2.txt,"and the two buttons read exactly the same: "+JSON.stringify(L1&&L1.txt)+" / "+JSON.stringify(L2&&L2.txt));
  check(L1&&/^skip\b/i.test(L1.txt),"the word is Skip, and it is the whole of the word");
  check(L1&&!/decision|end|meeting|twist/i.test(L1.txt),"and it names no destination, so it gives nothing away");
  check(L1&&!/decision|end|meeting|twist/i.test(L1.title),"nor does the tooltip: "+JSON.stringify(L1&&L1.title));

  /* ============ and it still does the job ============ */
  console.log("\n— it still lands where it should —");
  const landed=await page.evaluate(()=>{
    const before=S.modal.data.revealed;
    tickerFinish();
    const d=S.modal&&S.modal.data;
    return {before,after:d?d.revealed:0,done:d?d.done:null,awaiting:d?d.awaiting:null};});
  check(landed.after>landed.before,"Skip on a quiet night runs the rest of it ("+landed.before+" → "+landed.after+" lines)");
  check(landed.done===true,"and reaches the end, because there was nothing to stop at");

  const stopped=await startOne(true);
  if(stopped){
    await page.waitForTimeout(200);
    const s2=await page.evaluate(()=>{tickerFinish();const d=S.modal&&S.modal.data;
      return {awaiting:d.awaiting,done:d.done,opts:document.querySelectorAll('[data-act="twist"]').length};});
    check(s2.awaiting===true&&s2.done===false,"and on a night with something in it, Skip stops at it");
    check(s2.opts===6,"with the six options waiting — which is where the player finds out, not before");
    await page.screenshot({path:OUT+"/2-stopped-at-it.png"});
  }

  /* ============ the card, smaller ============ */
  console.log("\n— the card in the corner —");
  await page.evaluate(()=>{S.modal=null;S.notices=[];S.pendingJob=null;S.tab="crew";render();});
  await drain();
  await page.waitForTimeout(250);
  const card=await page.evaluate(()=>{
    const j=document.querySelector(".joker");if(!j)return null;
    const r=j.getBoundingClientRect(),f=j.querySelector(".jk-face").getBoundingClientRect();
    const top=document.querySelector(".crewtop").getBoundingClientRect();
    return {w:Math.round(r.width),h:Math.round(r.height),
      face:Math.round(f.width)+"x"+Math.round(f.height),
      word:(j.querySelector(".jk-w")||{}).textContent,
      ratio:+(r.height/r.width).toFixed(2),
      fromRight:Math.round(top.right-r.right),fromTop:Math.round(r.top-top.top)};});
  check(card,"the card is still there");
  check(card&&card.w<90&&card.h<120,"and smaller — "+(card&&card.w)+"x"+(card&&card.h)+", was 108x152");
  check(card&&card.ratio>1.3&&card.ratio<1.5,"still the proportions of a playing card ("+(card&&card.ratio)+")");
  check(card&&card.word==="Reassemble","still says what it is");
  check(card&&card.fromRight<=1&&card.fromTop<=1,"still in the very corner");
  await page.screenshot({path:OUT+"/3-smaller-card.png"});

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

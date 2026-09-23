/* A night can go wrong more than once. The ranking always knew — it lists "Twist 1 +3, Twist 2
   +3" — but the report printed only the first, so the second went unnamed above its own score.
   The invariant here is the one that was broken: the report accounts for exactly as many twists
   as the ranking charges for.

   And each one now says what answers it, in the board's own green and red: the trades and
   knowledge any of its options ask for, ticked when the crew in the field had them. Naming only
   the answer that was right on the night teaches that night; naming the shape of the problem is
   what a player carries to the next job. */
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots66");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1180,height:1000}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  const noise=t=>/ERR_CERT|music\/|\.mp3|manifest\.json|version\.txt|r2\.dev|fonts\./.test(t)||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const w=(m.location()||{}).url||"";const t=m.text()+(w?" ["+w+"]":"");
    if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+(process.argv[2]?require("path").resolve(process.argv[2]):GAME));
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Paz");
  await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  const drain=async()=>{let n=0;while(await page.$(".modal.notice")||await page.$('[data-act="loose"]')||await page.$('[data-act="crewname-skip"]')){
    if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');
    else if(await page.$('[data-act="crewname-skip"]'))await page.click('[data-act="crewname-skip"]');
    else await page.click('[data-act="loose"][data-i="0"]');
    await page.waitForTimeout(70);if(++n>40)break;}};
  await drain();

  await page.evaluate(()=>{S.money=5e7;S.rep=60;
    for(let i=0;i<80&&recruits().length<crewSeats();i++){
      const c=S.roster.find(x=>x.status==="available"&&!x._u);if(!c)break;c._u=true;c.status="crew";S.crewIds.push(c.id);}
    S.notices=[];S.modal=null;render();});
  await drain();

  /* Over BIG_MONEY twistCount() is two, sometimes three, always — that is what the money buys,
     and it is the only way to arrange a multi-twist night without reaching into the dice.

     The posting is FOUND, not made. Writing j.payout was tried first and does not survive:
     render() rebuilds the board from seed ^ week, which is build 88 working exactly as intended,
     so a mutated job is a job for as long as it takes to draw the next frame. Walk the weeks
     until the board offers a big one the crew can actually field. */
  console.log("— a night that goes wrong more than once —");
  const set=await page.evaluate(()=>{
    S.tab="jobs";
    for(let w=0;w<60;w++){
      S.jobs=[];refreshJobs(true);
      const j=S.jobs.find(x=>!x.final&&x.payout>BIG_MONEY&&assessJob(x).canRun);
      if(j){S.jobOpen=j.id;render();
        const now=S.jobs.find(x=>x.id===j.id);
        return {found:true,weeks:w,big:BIG_MONEY,payout:now?now.payout:j.payout,city:j.city};}
      S.week++;
    }
    return {found:false,big:BIG_MONEY};});
  check(set.found,"the board offered a posting over BIG_MONEY the crew can field"
    +(set.found?" — "+set.city+", "+set.payout+" (week "+(set.weeks+1)+" of looking)":""));
  check(set.found&&set.payout>set.big,"and it is still over it after the render that rebuilds the board ("
    +set.payout+" > "+set.big+")");

  await page.waitForTimeout(200);
  await page.click('[data-act="execute"]:not([disabled])');

  // Answer each in turn, taking the first option every time — which answer is taken does not
  // matter here; that every one is accounted for afterwards does.
  let answered=0;
  for(let guard=0;guard<160;guard++){
    if(await page.$(".twist-opts")){
      await page.click('.twist-opts [data-act="twist"][data-i="0"]');
      answered++;await page.waitForTimeout(400);continue;
    }
    if(await page.$('[data-act="skip-ticker"]'))await page.click('[data-act="skip-ticker"]');
    if(await page.$(".rep-wrap,.factors"))break;
    await page.waitForTimeout(180);
  }
  check(answered>=2,"the night asked for "+answered+" decisions");

  await page.waitForTimeout(600);
  const r=await page.evaluate(()=>{
    const heads=[...document.querySelectorAll(".kicker")].map(e=>e.textContent.trim())
      .filter(t=>/twist/i.test(t));
    const rank=[...document.querySelectorAll(".factors .k")].map(e=>e.textContent.trim())
      .filter(t=>/^Twist/i.test(t));
    const d=S.report||feedData();
    const tagRows=[...document.querySelectorAll(".kicker")].filter(e=>/^Answered by$/i.test(e.textContent.trim()))
      .map(e=>[...e.parentNode.querySelectorAll(".tag")].map(t=>({txt:t.textContent.trim(),ok:t.classList.contains("ok")})));
    return {heads,rank,tagRows,
      recs:(d&&d.twists||[]).map(t=>({h:t.h,free:t.free,wants:(t.wants||[]).length})),
      body:document.body.innerText};
  });

  console.log("\n— the report accounts for every one —");
  check(r.recs.length>=2,"the night recorded "+r.recs.length+" twists");
  check(r.heads.length===r.recs.length,
    "the report names as many as it recorded: "+r.heads.length+" headings for "+r.recs.length+" twists");
  check(r.rank.length===r.recs.length,
    "and the ranking charges for the same number: "+r.rank.length+" lines — "+r.rank.join(" | "));
  check(r.heads.length===r.rank.length,
    "so nothing is scored without being named (this is the bug: "+r.heads.length+" named, "+r.rank.length+" scored)");
  check(/first twist/i.test(r.heads[0]||"")&&/second twist/i.test(r.heads[1]||""),
    "they are told apart in words rather than numbered: "+r.heads.join(" / "));
  // Case-insensitively: .kicker is text-transform:uppercase, so innerText hands back
  // "THE ALARM GOES EARLY" for a heading recorded as "The alarm goes early".
  const BODY=r.body.toLowerCase();
  r.recs.forEach(t=>check(BODY.indexOf(t.h.toLowerCase())>=0,"  \""+t.h+"\" appears in the report"));

  console.log("\n— and each says what answers it —");
  check(r.tagRows.length===r.recs.length,"an Answered-by row per twist: "+r.tagRows.length);
  r.tagRows.forEach((row,i)=>{
    check(row.length>0,"  twist "+(i+1)+" names "+row.length+" trades or knowledge: "
      +row.map(t=>t.txt).join(", "));
    check(row.every(t=>/^[✓✗]/.test(t.txt)),"  twist "+(i+1)+" ticks each one the crew had, crosses the rest");
  });
  check(r.recs.every(t=>t.wants>0),"every recorded twist carries its wants list");

  await page.screenshot({path:OUT+"/report.png",fullPage:true});
  check(errors.length===0,"no page errors"+(errors[0]?" ("+errors[0]+")":""));
  await browser.close();
})();

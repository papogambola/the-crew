// Build 77: a big job goes wrong twice, and the player clicks through both of it.
//
// smoke43 does the arithmetic. This one does the night: the feed stops, answering it does NOT
// settle the job, the feed carries on with what that call turned out to be, and the second
// question arrives after a beat rather than on top of the first answer.
//
// And the night never tells you how long it is. There is no "1 of 2" anywhere the player can see
// — not on the decision, not on the job file, not on the finished report — because nobody in that
// room would know, and a count turns the night into a list you can see the end of.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots53");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
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

  /* ---------- a crew, a big board, and a job it can actually field ---------- */
  const setup=await page.evaluate(()=>{
    S.money=5e7;S.rep=500;SET.speed=4;
    for(let i=0;i<60&&recruits().filter(c=>c.status==="crew").length<5;i++){
      const c=S.roster.find(x=>x.status==="available"&&!x._u);if(!c)break;c._u=true;
      c.status="crew";S.crewIds.push(c.id);
    }
    refreshJobs(true);
    S.notices=[];S.modal=null;S.pendingJob=null;
    // canRun, not merely two in the field: doExecute refuses a job the crew cannot actually staff,
    // and the big operations want six or seven.
    // The board is drawn fresh each week and a crew can be barred from a country wholesale, so a
    // single look can come back empty. Re-roll the board rather than fail on a coincidence.
    let j=null;
    for(let t=0;t<40&&!j;t++){
      j=S.jobs.find(x=>x.payout>BIG_MONEY&&!x.final&&assessJob(x).canRun&&assessJob(x).team.length>=2)||null;
      if(!j){S.jobs=[];refreshJobs(true);}
    }
    return j?{id:j.id,title:j.title,pay:j.payout,city:j.city,crew:recruits().filter(c=>c.status==="crew").length}:null;});
  check(setup,"a big job this crew can field: "+(setup&&setup.title)+" — "+(setup&&setup.city)+", paying "+(setup&&setup.pay));
  check(setup&&setup.pay>150000,"which is over the $150K line");

  /* ---------- the file warns you before you take it ---------- */
  console.log("\n— the file says so before you commit —");
  await page.evaluate(id=>{S.jobOpen=id;S.tab="jobs";render();},setup.id);
  await page.waitForTimeout(250);
  const file=await page.evaluate(()=>document.body.innerText);
  check(/a long night/i.test(file),"the job file carries the warning");
  const tip=await page.evaluate(()=>{const e=[...document.querySelectorAll('.tag[data-tip]')]
    .find(x=>/a long night/i.test(x.textContent));return e?e.getAttribute("data-tip"):null;});
  check(tip&&/keeps going wrong/i.test(tip),"and explains itself on hover: \""+(tip||"").slice(0,90)+"…\"");
  check(tip&&!/\btwo\b|\bthree\b|at least \d/i.test(tip),"without saying how many — that is not something the file knows");
  check(tip&&/not want the same person twice/i.test(tip),"including the part that decides who you bring");
  await page.screenshot({path:OUT+"/1-file.png"});

  /* ---------- run it ---------- */
  console.log("\n— the first of them —");
  const started=await page.evaluate(id=>{
    S.jobOpen=null;S.notices=[];S.modal=null;
    doExecute(id);
    const d=S.modal&&S.modal.data;
    if(!d)return null;
    tickerFinish();
    const e=S.modal&&S.modal.data;
    return {n:(S.pendingJob&&pendingTwists(S.pendingJob).length)||0,
      no:e.twistNo,of:e.twistOf,awaiting:e.awaiting,h:e.twist&&e.twist.h};},setup.id);
  await page.waitForTimeout(300);
  check(started&&started.n>=2,started&&started.n+" things are going to go wrong tonight");
  check(started&&started.awaiting,"the feed has stopped at the first");
  check(started&&started.no===1&&started.of===started.n,
    "the game is keeping count internally ("+(started&&started.no)+" of "+(started&&started.of)+")");
  const scr1=await page.evaluate(()=>document.querySelector(".modal").innerText);
  // The kicker is uppercased in CSS and innerText renders it that way, so this reads it as the
  // player sees it rather than as the source wrote it.
  check(!new RegExp("\\b"+started.no+" of "+started.of+"\\b","i").test(scr1),
    "and showing none of it: \""+(scr1.match(/SOMETHING GOES WRONG[^\n]*/i)||[""])[0]+"\"");
  check(!/\b\d+ of \d+\b/.test(scr1),"no tally of any kind on the decision");
  check(!/this job has (two|three)/i.test(scr1),"and it does not say how many the job has");
  const opts1=await page.evaluate(()=>[...document.querySelectorAll('[data-act="twist"]')].map(e=>e.textContent.trim()));
  check(opts1.length>=4,opts1.length+" ways out of it");
  await page.screenshot({path:OUT+"/2-first.png"});

  /* ---------- answering it does not end the job ---------- */
  console.log("\n— answering it, and the night carrying on —");
  const linesBefore=await page.evaluate(()=>S.modal.data.narrative.length);
  await page.click('[data-act="twist"][data-i="0"]');
  await page.waitForTimeout(200);
  const mid=await page.evaluate(()=>({pending:!!S.pendingJob,answers:(S.pendingJob&&S.pendingJob.answers||[]).length,
    resolved:S.modal.data.resolved,done:S.modal.data.done,no:S.modal.data.twistNo,
    lines:S.modal.data.narrative.length,
    tail:S.modal.data.narrative.slice(-3).map(l=>l.x)}));
  check(mid.pending,"the job is still in the air");
  check(mid.answers===1,"one answer on file");
  check(!mid.resolved&&!mid.done,"and nothing is settled");
  check(mid.no===2,"the screen has moved to "+mid.no);
  check(mid.lines===linesBefore+3,"three lines were added: what that call was, a beat, and the next thing");
  check(mid.tail.length===3,"→ "+mid.tail.map(t=>'"'+t+'"').join("  "));
  /* Both lists, day and night. Every one of these has a _NIGHT variant that twistLines() swaps in
     for a job that happens after dark, and this asked only about the daytime one — so a night job
     drew a perfectly correct "Then the night finds something else." and was reported as a failure,
     about one run in five. A line that goes red at random is a line people learn to scroll past,
     and this suite has already lost assertions that way. Same fix as smoke43, which had the same
     bug and was found first; this file was not checked at the time, so it kept firing. */
  const between=await page.evaluate(()=>TWIST_BETWEEN.concat(TWIST_BETWEEN_NIGHT));
  check(between.indexOf(mid.tail[1])>=0,"the middle one is the beat between them, not a twist line"
    +(between.indexOf(mid.tail[1])>=0?"":": \""+mid.tail[1]+"\""));
  const again=await page.evaluate(()=>TWIST_AGAIN.concat(TWIST_AGAIN_NIGHT));
  check(again.indexOf(mid.tail[2])>=0,"and the last says it is happening AGAIN: \""+mid.tail[2]+"\"");
  // The prose is not allowed to count either. "And then the second one" numbers it; "the room has
  // one more in it" and "the other shoe" both promise exactly one more and no further. Checked
  // across both lists, because a night line that counts is exactly as wrong as a day one.
  const counting=again.filter(l=>/\bsecond\b|\bthird\b|\bone more\b|\bother shoe\b|\blast\b/i.test(l));
  check(counting.length===0,"and not one of the "+again.length+" lines that announce another says which it is"
    +(counting.length?" — "+counting.join(" / "):""));
  const betweenCounts=between.filter(l=>/\bsecond\b|\bthird\b|\bone more\b|\blast\b/i.test(l));
  check(betweenCounts.length===0,"nor do the "+between.length+" lines in between them");

  /* ---------- the feed plays on to the second ---------- */
  await page.evaluate(()=>{tickerFinish();});
  await page.waitForTimeout(300);
  const at2=await page.evaluate(()=>({awaiting:S.modal.data.awaiting,no:S.modal.data.twistNo,
    h:S.modal.data.twist&&S.modal.data.twist.h,revealed:S.modal.data.revealed,
    text:document.querySelector(".modal").innerText}));
  check(at2.awaiting,"the feed stops again, at the second");
  check(at2.no===2,"the game's own count has moved to 2 of "+started.of);
  check(at2.h!==started.h,"and it is a different thing: \""+started.h+"\" then \""+at2.h+"\"");
  check(!/\b\d+ of \d+\b/.test(at2.text),"and the screen still says nothing about how many there are");
  check(/SOMETHING GOES WRONG · YOUR CALL/i.test(at2.text),
    "it reads the same as the first one did: \""+(at2.text.match(/SOMETHING GOES WRONG[^\n]*/i)||[""])[0]+"\"");
  await page.screenshot({path:OUT+"/3-second.png"});

  /* ---------- and Skip goes forward, not back ---------- */
  const skipped=await page.evaluate(()=>{const before=S.modal.data.revealed;
    tickerFinish();return {before,after:S.modal.data.revealed};});
  check(skipped.after>=skipped.before,"Skip at the second decision does not rewind the feed to the first ("
    +skipped.before+" → "+skipped.after+")");

  /* ---------- finish it ---------- */
  console.log("\n— and the report accounts for all of it —");
  const done=await page.evaluate(()=>{
    let g=0;
    while(S.pendingJob&&g++<8){
      const k=(S.pendingJob.answers||[]).length;
      const tw=pendingTwists(S.pendingJob)[k];if(!tw)break;
      twistChoose(0);
    }
    const d=S.modal&&S.modal.data;
    if(d&&!d.done)tickerFinish();
    const e=S.modal&&S.modal.data;
    return {pending:!!S.pendingJob,recs:(e.twists||[]).length,verdict:e.verdictName,
      cues:(e.narrative||[]).filter(l=>l.twist).length,
      rk:(e.rk||[]).filter(r=>/^Twist/.test(r.k)).map(r=>r.k+" "+r.v)};});
  check(!done.pending,"the job settles once the last of them is answered — verdict "+done.verdict);
  check(done.recs===started.n,"with all "+done.recs+" decisions in the record");
  check(done.cues===started.n,"and all "+done.cues+" of them in the story");
  check(done.rk.length===started.n,"the ranking names each: "+done.rk.join(", "));
  check(done.rk.every(k=>/^Twist \d:/.test(k)),"numbered, because there was more than one");
  await page.waitForTimeout(300);
  const report=await page.evaluate(()=>document.querySelector(".modal").innerText);
  check(/Twist 1/.test(report)&&/Twist 2/.test(report),"and the sheet on screen shows them both");
  await page.screenshot({path:OUT+"/4-report.png"});

  /* ---------- an ordinary job is unchanged ---------- */
  console.log("\n— and a job under the line is what it always was —");
  const small=await page.evaluate(()=>{
    S.modal=null;S.pendingJob=null;S.notices=[];
    const j=S.jobs.find(x=>x.payout<=BIG_MONEY&&!x.final);
    if(!j)return null;
    S.jobOpen=j.id;render();
    const txt=document.body.innerText;
    const counts=[];for(let i=0;i<200;i++)counts.push(twistCount(j,assessJob(j),assessJob(j).team,freshRng()));
    S.jobOpen=null;render();
    return {pay:j.payout,warned:/a long night/i.test(txt),max:Math.max.apply(null,counts),min:Math.min.apply(null,counts)};});
  if(small){
    check(!small.warned,"its file carries no warning, because there is nothing extra to warn about");
    check(small.max<=1,"and it never gets more than one (paying "+small.pay+")");
    check(small.min===0,"most of the time, none");
  } else check(true,"no job under the line on this board");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

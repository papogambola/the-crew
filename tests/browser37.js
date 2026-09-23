// Build 38: the job file says how many the job needs, and why anyone is not going.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots38");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1100}});
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

  const open=await page.evaluate(()=>{
    S.money=5e7;S.notices=[];S.modal=null;
    ["wheelman","enforcer","fixer","forger"].forEach(t=>{const c=S.roster.find(x=>x.status==="available"&&x.tech===t&&canSign(x));
      if(c&&recruits().length<crewSeats()){c.status="crew";c._touched=true;S.crewIds.push(c.id);}});
    const j=S.jobs.filter(x=>!x.final&&assessJob(x,jobPool(x)).canRun)[0];
    if(!j)return null;S.tab="jobs";S.jobOpen=j.id;render();
    const a=assessJob(j,jobPool(j));
    return {need:j.need,can:a.team.length,crew:crewAll().length};});
  check(open,"a posting the crew can run, needing "+(open&&open.need));
  await drain();await page.waitForTimeout(250);

  const read=()=>page.evaluate(()=>{
    const b=[...document.querySelectorAll(".req .b")].find(e=>/Crew needed/i.test(e.textContent));
    return {label:b?b.querySelector(".k").textContent.trim():null,
      value:b?b.querySelector(".v").textContent.trim():null,
      sub:b?(b.querySelector(".sub")||{}).textContent:null,
      subColour:b&&b.querySelector(".sub")?getComputedStyle(b.querySelector(".sub")).color:null,
      line:([...document.querySelectorAll(".sel-help")].map(e=>e.innerText.replace(/\s+/g," "))
              .find(t=>/in the field/.test(t))||"")};});

  // ---- the box says what the job wants, not a fraction
  const A=await read();
  check(A.label&&/^Crew needed$/i.test(A.label),"the box is labelled "+JSON.stringify(A.label)+", not just Crew");
  check(A.value===String(open.need),"and its number is what the job wants: "+A.value);
  check(!/\//.test(A.value),"it is not a fraction any more — 4 / 3 read as wrong when it was right");
  check(A.sub&&A.sub.indexOf(String(open.can))>=0,"under it, how many can go: "+JSON.stringify(A.sub));

  // ---- and the section about who goes leads with the requirement
  check(A.line&&A.line.indexOf("needs "+open.need+" in the field")>=0,"Who goes opens with the number needed: "+JSON.stringify(A.line.slice(0,58)));
  check(/^This job needs/.test(A.line),"it is the first thing it says");

  // ---- benched is not the same as barred, and the line does not confuse them
  const benched=await page.evaluate(()=>{
    const j=S.jobs.find(x=>x.id===S.jobOpen);
    const a=assessJob(j,jobPool(j));
    const two=a.team.filter(c=>!c.isPlayer).slice(0,2);
    two.forEach(c=>toggleBench(j,c.id));render();
    return two.length;});
  await page.waitForTimeout(220);
  const B=await read();
  check(B.line.indexOf(benched+" are benched, by you")>=0,"benching two says they are benched by you: "+JSON.stringify(B.line.slice(0,110)));
  // Not "the border is never mentioned": a job can keep somebody out AND have somebody benched,
  // and then both clauses are right. What must hold is that neither count swallows the other.
  const counts=await page.evaluate(()=>{
    const j=S.jobs.find(x=>x.id===S.jobOpen);
    const a=assessJob(j,jobPool(j));
    return {benched:benchSet(j).length,barred:crewAll().length-benchSet(j).length-a.team.length};});
  const mBench=/(\d+) (?:are|is) benched, by you/.exec(B.line);
  const mBar=/(\d+) (?:are|is) kept out by the border/.exec(B.line);
  check(mBench&&+mBench[1]===counts.benched,"the benched count is what you benched ("+counts.benched+")");
  check(counts.barred? (mBar&&+mBar[1]===counts.barred) : !mBar,
    counts.barred?"and the border count is only what the border kept out ("+counts.barred+")"
                 :"and with nobody barred it does not mention a border at all");

  // ---- somebody a border really does keep out
  const bar=await page.evaluate(()=>{
    const j=S.jobs.filter(x=>!x.final).find(x=>assessJob(x,crewAll()).team.length<crewAll().length);
    if(!j)return null;benchClear(j);S.jobOpen=j.id;render();
    const a=assessJob(j,jobPool(j));
    return {need:j.need,can:a.team.length,out:crewAll().length-a.team.length};});
  if(bar){
    await page.waitForTimeout(220);
    const C=await read();
    check(C.line.indexOf(bar.out+(bar.out>1?" are":" is")+" kept out by the border")>=0,
      "and where a border really does keep somebody out, it says so: "+JSON.stringify(C.line.slice(0,120)));
    check(C.line.indexOf("benched, by you")<0,"without claiming you benched them");
  } else check(true,"no posting bars anybody from this crew right now");

  // ---- short-handed reads as short-handed
  const short=await page.evaluate(()=>{
    const j=S.jobs.find(x=>x.id===S.jobOpen);
    benchClear(j);
    const a=assessJob(j,crewAll());
    a.team.filter(c=>!c.isPlayer).slice(0,Math.max(1,a.team.length-j.need+1)).forEach(c=>toggleBench(j,c.id));
    render();
    return {need:j.need,can:assessJob(j,jobPool(j)).team.length};});
  await page.waitForTimeout(220);
  const D=await read();
  check(/only \d+ can go/.test(D.sub||""),"short-handed, the box says so: "+JSON.stringify(D.sub));
  check(D.subColour&&D.subColour!==A.subColour,"in a different colour from when it is enough ("+D.subColour+" against "+A.subColour+")");
  check(/— only \d+ of your \d+ can go/.test(D.line),"and the line says it too: "+JSON.stringify(D.line.slice(0,64)));
  const btn=await page.evaluate(()=>{const b=document.querySelector('[data-act="execute"]');return b?{off:b.disabled,t:b.textContent.trim()}:null;});
  check(btn&&btn.off,"and the button will not let you take it: "+JSON.stringify(btn&&btn.t));

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

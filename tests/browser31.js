// Build 31: the split on the job file, and what benching does to it.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots31");fs.mkdirSync(OUT,{recursive:true});
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
  const dismiss=async()=>{let n=0;while(await page.$(".modal.notice")||await page.$('[data-act="loose"]')){
    if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');else await page.click('[data-act="loose"][data-i="0"]');
    await page.waitForTimeout(90);if(++n>25)break;}};
  await dismiss();
  // a crew worth splitting a fee between
  await page.evaluate(()=>{
    S.money=5e6;
    ["wheelman","enforcer","fixer","forger"].forEach(t=>{const c=S.roster.find(x=>x.status==="available"&&x.tech===t&&canSign(x));
      if(c&&recruits().length<crewSeats()){c.status="crew";c._touched=true;S.crewIds.push(c.id);}});
    const j=S.jobs.find(x=>!x.final&&assessJob(x,jobPool(x)).canRun);
    S.tab="jobs";S.jobOpen=j?j.id:null;render();
  });
  await dismiss();await page.waitForTimeout(250);

  const read=async()=>page.evaluate(()=>{
    const rows=[...document.querySelectorAll(".split .r")].map(r=>({
      w:r.querySelector(".w").innerText.replace(/\s+/g," ").trim(),
      p:r.querySelector(".p").innerText.trim(),
      m:r.querySelector(".m").innerText.trim(),
      cls:r.className}));
    const d=document.querySelector(".benchdelta");
    return {rows,delta:d?d.innerText.replace(/\s+/g," ").trim():null};
  });

  check(await page.$(".split"),"the job file shows a split");
  const A=await read();
  console.log("   "+A.rows.map(r=>r.w+" | "+r.p+" | "+r.m).join("\n   "));
  check(A.rows.length>=4,"a row per person, a total, and what you keep");
  check(A.rows.some(r=>/^Crew of \d/.test(r.w)),"the crew's share is totalled");
  check(A.rows.some(r=>/You keep of the fee/.test(r.w)),"and the commander's share is named");
  check(A.rows.some(r=>/^Wages/.test(r.w)&&/^-|^−/.test(r.m)),"the wages for the weeks come off it");
  check(A.rows.some(r=>/^On the table/.test(r.w)),"and the screen says what the job leaves you");
  check(A.delta===null,"with everyone going there is nothing to compare");
  await page.screenshot({path:OUT+"/01-split.png",fullPage:true});

  // the numbers on the screen are the numbers the model has
  const truth=await page.evaluate(()=>{
    const job=S.jobs.find(x=>x.id===S.jobOpen);const a=assessJob(job,jobPool(job));
    const sp=jobSplit(job,a.team),up=jobUpkeep(job);
    return {you:moneyExact(sp.you),table:moneyExact(sp.you-up.total),crew:moneyExact(sp.crew),n:sp.rows.length};});
  check(A.rows.find(r=>/You keep of the fee/.test(r.w)).m===truth.you,"what is printed is what jobSplit works out ("+truth.you+")");
  check(A.rows.find(r=>/^On the table/.test(r.w)).m===truth.table,"and the table figure is the split less the wages ("+truth.table+")");

  // bench somebody and watch it move
  // the row prints a first name and a trade, and two of the crew can share a first name — so the
  // row is found by both, and by the count, rather than by whoever the eye would match first
  const benched=await page.evaluate(()=>{
    const job=S.jobs.find(x=>x.id===S.jobOpen);const a=assessJob(job,jobPool(job));
    const v=a.team.find(c=>!c.isPlayer&&c.cut>0);
    return v?{id:v.id,first:v.first,label:v.first+" "+TECH_BY_K[v.tech].l}:null;});
  check(benched,"somebody on the job takes a cut: "+(benched&&benched.first));
  const paidA=A.rows.filter(r=>r.cls.indexOf("off")<0&&r.w===benched.label).length;
  await page.click('[data-act="bench"][data-id="'+benched.id+'"]');
  await page.waitForTimeout(250);
  const B=await read();
  const paidB=B.rows.filter(r=>r.cls.indexOf("off")<0&&r.w===benched.label).length;
  check(paidB===paidA-1,benched.label+" drops out of the paid rows ("+paidA+" → "+paidB+")");
  check(B.rows.some(r=>r.cls.indexOf("off")>=0&&r.w.indexOf(benched.first)===0),"and is shown struck through, taking nothing");
  const youA=A.rows.find(r=>/You keep of the fee/.test(r.w)).m, youB=B.rows.find(r=>/You keep of the fee/.test(r.w)).m;
  check(youA!==youB,"your share of the fee moves: "+youA+" → "+youB);
  check(B.delta,"and a line appears comparing the two");
  console.log("   "+(B.delta||"").slice(0,240));
  check(/wages are paid either way|goes out for the/i.test(B.delta||""),"which says the wages are paid either way");
  check(/reckoning is/.test(B.delta||""),"and what it costs on the reckoning");
  check(/cash alone/.test(B.delta||""),"and gives both figures in money");
  check(/counts the money and nothing else/.test(B.delta||""),"while saying plainly what that money does not count");
  check(!/worth more than|is worth it|you should/i.test(B.delta||""),"and does not tell the player what to do");
  await page.screenshot({path:OUT+"/02-benched.png",fullPage:true});

  // send everyone again
  await page.click('[data-act="bench-clear"]');
  await page.waitForTimeout(250);
  const C=await read();
  check(C.rows.find(r=>/You keep of the fee/.test(r.w)).m===youA,"sending everyone puts the split back ("+youA+")");
  check(C.delta===null,"and the comparison goes away");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

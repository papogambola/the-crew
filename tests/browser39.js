// Build 40: loyalty is on the file as well as the card, and a loyalty line names who.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots40");fs.mkdirSync(OUT,{recursive:true});
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

  const crew=await page.evaluate(()=>{
    S.money=5e7;S.notices=[];S.modal=null;
    while(recruits().length<3){const c=S.roster.find(x=>x.status==="available"&&canSign(x));if(!c)break;
      c.status="crew";c._touched=true;S.crewIds.push(c.id);}
    S.tab="crew";render();
    return recruits().map(c=>({id:c.id,first:c.first,loy:c.loyalty}));});
  check(crew.length>=2,"a crew of "+crew.length+" to look at");
  await drain();await page.waitForTimeout(250);

  // ---- the card, which is where it always was
  const card=await page.evaluate(()=>{
    const l=[...document.querySelectorAll(".id label")].map(e=>e.textContent).filter(t=>/Loyalty/.test(t));
    return {labels:l,bars:document.querySelectorAll(".loy").length};});
  check(card.labels.length>=2,"every crew card carries it: "+JSON.stringify(card.labels[0]));
  check(card.bars>=2,"with a bar beside the number");

  // ---- and the file, which is where it was not
  const file=await page.evaluate(id=>{
    S.modal={type:"recruit",id};render();
    const rows=[...document.querySelectorAll(".modal .k")].map(e=>e.textContent.trim());
    const i=rows.indexOf("Loyalty");
    const vals=[...document.querySelectorAll(".modal .k")].map(e=>e.nextElementSibling?e.nextElementSibling.textContent.trim():"");
    return {rows,has:i>=0,value:i>=0?vals[i]:null};},crew[0].id);
  check(file.has,"their personnel file shows it too, next to the fee and the cut");
  check(file.value&&file.value.indexOf(String(crew[0].loy))===0,"and it is their number: "+JSON.stringify(file.value));
  check(/\/ 100/.test(file.value||""),"out of a hundred, so it reads as a scale");
  await page.screenshot({path:OUT+"/01-file.png"});

  // a thin one says what thin means
  const thin=await page.evaluate(id=>{const c=byId(id);c.loyalty=20;S.modal={type:"recruit",id};render();
    const ks=[...document.querySelectorAll(".modal .k")];const k=ks.find(e=>e.textContent.trim()==="Loyalty");
    return k?k.nextElementSibling.textContent.trim():null;},crew[0].id);
  check(/thin/.test(thin||""),"a thin one says so, and what it risks: "+JSON.stringify(thin));
  const mid=await page.evaluate(id=>{const c=byId(id);c.loyalty=50;S.modal={type:"recruit",id};render();
    const ks=[...document.querySelectorAll(".modal .k")];const k=ks.find(e=>e.textContent.trim()==="Loyalty");
    return k?k.nextElementSibling.textContent.trim():null;},crew[0].id);
  check(/another crew/.test(mid||""),"a middling one says what it means too: "+JSON.stringify(mid));
  const high=await page.evaluate(id=>{const c=byId(id);c.loyalty=88;S.modal={type:"recruit",id};render();
    const ks=[...document.querySelectorAll(".modal .k")];const k=ks.find(e=>e.textContent.trim()==="Loyalty");
    return k?k.nextElementSibling.textContent.trim():null;},crew[0].id);
  check(high==="88 / 100","and a loyal one just says the number: "+JSON.stringify(high));

  // ---- somebody not on the crew has no loyalty to you yet
  const stranger=await page.evaluate(()=>{
    const c=S.roster.find(x=>x.status==="available");
    S.modal={type:"recruit",id:c.id};render();
    return [...document.querySelectorAll(".modal .k")].map(e=>e.textContent.trim()).indexOf("Loyalty");});
  check(stranger<0,"a file on somebody who does not work for you shows no loyalty — there is none yet");

  // ---- and the line that told you it changed now says who
  const line=await page.evaluate(()=>{
    S.modal=null;S.money=5e8;
    const gone=recruits()[0];
    const rest=recruits().filter(x=>x.id!==gone.id).map(x=>x.first);
    looseAdd(gone,"dropped");
    gone.status="gone";leaveCrew(gone);
    const opts=looseOptions(gone,"dropped");
    const i=opts.findIndex(o=>o.loy&&o.loy<0&&o.need!==false);
    if(i<0)return {skip:true};
    looseResolve(i);
    // the log is newest-first and each entry is {t,tone,big,wk}
    const hit=(S.log||[]).map(x=>x.t).find(t=>/Loyalty /.test(t));
    return {hit:hit||null,rest};});
  if(line.skip)check(true,"no answer with a loyalty cost was open on this crew");
  else{
    check(line.hit,"the crew hears about it, and it is in the log: "+JSON.stringify((line.hit||"").slice(-90)));
    check(line.hit&&!/across \d/.test(line.hit),"it no longer reads 'Loyalty -11 across 1'");
    check(line.hit&&/Loyalty [-−+]?\d+ for /.test(line.hit),"it says who heard about it, by name");
    check(line.hit&&line.rest.some(n=>line.hit.indexOf(n)>=0),"and the name is one of the people still with you: "+line.rest.join(", "));
  }

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

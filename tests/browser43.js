// Build 46: what the seven-place work and the fourteen specialists look like on screen.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots46");fs.mkdirSync(OUT,{recursive:true});
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
  await page.click('[data-act="begin"]');await page.fill("#pname","Paz");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  const drain=async()=>{let n=0;while(await page.$(".modal.notice")||await page.$('[data-act="loose"]')){
    if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');else await page.click('[data-act="loose"][data-i="0"]');
    await page.waitForTimeout(80);if(++n>40)break;}};
  await drain();

  // ---- the specialists are on the roster, and only on the roster
  console.log("\n— the fourteen —");
  await page.evaluate(()=>{S.tab="roster";S.filter={q:"",tech:"diver",role:"",nat:"",sort:"fee"};S.shown=30;render();});
  await page.waitForTimeout(150);
  const divers=await page.$$eval(".cards .id",n=>n.length);
  check(divers>0,divers+" divers on the roster to choose from");
  // The trade sits on the top line beside the name now (".nm-tr"), not on the line under the
  // pips — that line is the rank alone. So the card is read where the trade actually is.
  const card=await page.textContent(".cards .id .nm");
  check(/Diver/.test(card),"and the card says what they are: \""+card.replace(/\s+/g," ").trim()+"\"");
  const rank=await page.textContent(".cards .id .spec");
  check(/^(Rookie|Journeyman|Veteran|Expert|Legend)$/.test(rank.trim()),
    "and the line under the pips is the rank alone: \""+rank.trim()+"\"");
  const list=await page.$$eval('#ftech option',n=>n.map(o=>o.textContent));
  check(list.length===31,(list.length-1)+" trades in the filter");
  for(const t of ["Drone specialist","Pilot","Skipper","Diver","Climber","Tunneller","Chemist","Medic",
                  "Electrician","Signals","Analyst","Quartermaster","Linguist","Handler"])
    check(list.indexOf(t)>=0,"  · "+t);

  // ---- nothing of the sort is on the board before there are seven places
  console.log("\n— before seven places —");
  await page.evaluate(()=>{S.rep=40;S.jobs=[];refreshJobs(true);S.tab="jobs";S.jobOpen=null;render();});
  await page.waitForTimeout(150);
  const seatsBefore=await page.evaluate(()=>crewSeats());
  check(seatsBefore<6,"a Known crew has "+(seatsBefore+1)+" places");
  check((await page.$$(".jobrow .chip.c-ink")).length===0,"and no operation anywhere on the board");

  // ---- and once they open, one is standing on it
  console.log("\n— seven places —");
  await page.evaluate(()=>{S.rep=70;S.money=3e7;S.jobs=[];S.milestones={};refreshJobs(true);render();});
  await page.waitForTimeout(200);
  const notices=await page.evaluate(()=>(S.notices||[]).map(n=>n.h));
  check(notices.indexOf("Two more seats")>=0&&notices.indexOf("Work that needs seven")>=0,
    "both boxes are announced, in order: "+notices.join(" then "));
  check(notices.indexOf("Two more seats")<notices.indexOf("Work that needs seven"),
    "the places first, then what they are for");
  await drain();
  await page.evaluate(()=>{S.tab="jobs";S.jobOpen=null;render();});
  await page.waitForTimeout(150);
  const rows=await page.$$eval(".jobrow",n=>n.map(e=>({code:(e.querySelector(".code")||{}).textContent||"",
    chip:(e.querySelector(".chip")||{}).textContent||"",t:(e.querySelector(".t")||{}).textContent||""})));
  const ops=rows.filter(r=>/^OP-\d{3}/.test(r.code));
  check(ops.length>=1,ops.length+" operation(s) on the board, coded "+ops.map(r=>r.code.slice(0,6)).join(", "));
  check(ops.every(r=>/Operation/.test(r.chip)),"each marked Operation");
  await page.screenshot({path:path.join(OUT,"board.png"),fullPage:true});

  // ---- what the file says
  console.log("\n— the file —");
  const opId=await page.evaluate(()=>{const j=S.jobs.find(x=>x.big);S.jobOpen=j.id;render();return j.id;});
  await page.waitForTimeout(200);
  const kicker=await page.textContent(".panel-h .kicker");
  check(/Operation \d+ of 500/.test(kicker),"the header places it: \""+kicker.trim()+"\"");
  const warn=await page.textContent(".panel-b .warnbox");
  check(/ultra-complex/i.test(warn),"and says what one is");
  check(/nobody else can take one/i.test(warn),"including that nobody else can take it");
  check(/of 500 run so far/.test(warn),"and how many of the five hundred are gone");
  const shape=await page.evaluate(id=>{const j=S.jobs.find(x=>x.id===id);
    return {need:j.need,techs:j.techs.length,know:j.know.length,weeks:j.weeks,tier:j.tier,
      pay:j.payout,diff:j.diff,cased:caseMax(j),big:j.techs.filter(t=>isBigTech(t)).length};},opId);
  check(shape.need>=6&&shape.need<=7,"it wants "+shape.need+" in the field");
  check(shape.techs>=3&&shape.techs<=5,shape.techs+" trades wanted, "+shape.big+" of them specialists");
  check(shape.know>=2&&shape.know<=3,shape.know+" kinds of knowledge");
  check(shape.weeks>=3&&shape.weeks<=5,shape.weeks+" weeks on the ground");
  check(shape.cased===5,"and it can be watched for five weeks before anybody goes in");
  const needBox=await page.evaluate(()=>[...document.querySelectorAll(".req .b")]
    .map(b=>b.textContent.replace(/\s+/g," ").trim()).join(" | "));
  check(/Crew needed/.test(needBox)&&needBox.indexOf(String(shape.need))>=0,
    "the Crew needed box carries the number: "+needBox.slice(0,90));
  await page.screenshot({path:path.join(OUT,"file.png"),fullPage:true});

  // ---- run one, and watch the five hundred become four hundred and ninety-nine
  console.log("\n— running one —");
  const ran=await page.evaluate(async()=>{
    // fill every place with people who can actually get in, then find an operation this crew can field
    S.money=5e7;
    const forger=S.roster.find(c=>c.status==="available"&&c.tech==="forger");
    if(forger){forger.status="crew";forger._touched=true;S.crewIds.push(forger.id);}
    const good=S.roster.filter(c=>c.status==="available"&&canSign(c)&&!c.limits.length)
      .sort((a,b)=>avg(b.attrs)-avg(a.attrs));
    for(const c of good){if(recruits().length>=crewSeats())break;c.status="crew";c._touched=true;S.crewIds.push(c.id);}
    let job=null;
    for(let t=0;t<40&&!job;t++){
      S.jobs=S.jobs.filter(j=>!j.big);refreshJobs(true);
      job=S.jobs.find(j=>j.big&&assessJob(j,jobPool(j)).canRun)||null;
    }
    if(!job)return {ok:false};
    const before=Object.keys(S.bigDone||{}).length;
    doExecute(job.id);
    tickerFinish();
    // A job can stop mid-report on a twist, and an unanswered twist is an unfinished job. An
    // operation pays millions, which is over the line where two or three of them go wrong, so
    // this answers until there is nothing left waiting rather than assuming one.
    for(let g=0;g<8&&S.modal&&S.modal.data&&S.modal.data.awaiting;g++){twistChoose(0);tickerFinish();}
    const d=S.modal&&S.modal.data;
    return {ok:true,id:job.id,need:job.need,team:d?d.teamIds.length:0,verdict:d?d.verdictName:"",
      before,after:Object.keys(S.bigDone||{}).length,stat:(S.stats||{}).big||0,
      stillOffered:S.jobs.some(j=>j.id===job.id)};
  });
  check(ran.ok,"a crew of seven can field one of them");
  if(ran.ok){
    check(ran.team>=ran.need,ran.id+" ran with "+ran.team+" in the field against a need of "+ran.need+" — "+ran.verdict);
    check(ran.after===ran.before+1,"and it is spent: "+ran.before+" → "+ran.after+" of 500");
    check(ran.stat===1,"the record counts it");
    check(!ran.stillOffered,"and it is not offered again");
    await page.evaluate(()=>{S.modal=null;S.tab="log";SET.folds={record:true};render();});
    await page.waitForTimeout(200);
    const rec=await page.textContent(".fold[data-fold='record']");
    check(/Operations/.test(rec)&&/of 500/.test(rec),"the record shows it: "+
      (rec.replace(/\s+/g," ").match(/Operations\s*\d+\s*of 500/)||["?"])[0]);
  }

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})();

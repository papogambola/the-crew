// Build 37: nothing is paid until the trip ends, and the trip has a map of the city.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots37");fs.mkdirSync(OUT,{recursive:true});
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
    await page.waitForTimeout(90);if(++n>30)break;}};
  await drain();

  // a trip nobody has to decide anything about — the case that used to settle before it started
  const start=await page.evaluate(()=>{
    S.money=5e7;SET.speed=4;S.notices=[];S.modal=null;S.pendingTrip=null;
    let picked=null,tries=0;
    while(!picked&&tries++<400){
      const c=S.roster.find(x=>x.status==="available"&&canSign(x)&&S.money>=x.fee&&!hireWhy(x)&&!x._tried);
      if(!c)break;
      c._tried=true;
      const before=S.money;
      hire(c.id);
      const d=S.modal&&S.modal.data;
      if(d&&!d.snag){picked={who:c.first,fee:c.fee,before,after:S.money,city:d.city,country:d.country,
        lines:d.narrative.length,resolved:d.resolved};break;}
      S.modal=null;S.pendingTrip=null;S.money=before;
    }
    return picked;});
  check(start,"a trip with nobody to argue with: "+(start&&start.who)+" in "+(start&&start.city));
  check(start&&start.after===start.before,"the balance has not moved a penny yet ("+(start&&start.before)+")");
  check(start&&!start.resolved,"and nothing about it is settled");
  check(await page.evaluate(()=>!!S.pendingTrip),"the trip is still in the air");
  check(await page.evaluate(()=>{const c=byId(S.pendingTrip.cid);return c.status==="available";}),
    "and they have not joined the crew before you have met them");
  const week0=await page.evaluate(()=>S.week);

  // ---- the map of the city
  check(await page.$(".modal .feedmap"),"the trip draws a map too");
  const m=await page.evaluate(()=>{const m=document.querySelector(".feedmap");
    return {where:m.querySelector(".fm-where").textContent.trim(),
      clock:m.querySelector(".fm-clock").textContent.trim(),
      sites:[...m.querySelectorAll(".fm-site")].map(e=>e.getAttribute("data-site")),
      labels:[...m.querySelectorAll(".fm-site text")].map(e=>e.textContent),
      names:[...m.querySelectorAll(".fm-op-n")].map(e=>e.textContent),
      blocks:m.querySelectorAll(".sc-block").length,
      cafe:[...m.querySelectorAll(".sc-text")].map(e=>e.textContent).join(" ")};});
  check(m.where===start.city+" · "+start.country,"of the city you flew to: "+m.where);
  // A trip draws the city you flew into the same way a job draws its place — a plan, not the
  // world zoomed in — with the café you are meeting in marked on it.
  check(m.blocks>10,"drawn as a plan of that city, like the job's — "+m.blocks+" blocks on it");
  check(/CAF/i.test(m.cafe),"with the place you are meeting marked: "+m.cafe.trim());
  check(m.sites.join(",")==="land,city,table,deal","with a trip's own places, not a job's: "+m.labels.join(", "));
  check(m.names.length===2&&m.names[0]==="YOU","two people on it — you and them: "+m.names.join(", "));
  check(/^[A-Z]{3} \d\d:\d\d$/.test(m.clock),"and the clock is the trip's own, days and all: "+m.clock);
  await page.screenshot({path:OUT+"/01-trip.png"});

  // ---- the money still has not moved part-way through
  await page.waitForTimeout(1400);
  const mid=await page.evaluate(()=>({money:S.money,revealed:S.modal.data.revealed,
    n:S.modal.data.narrative.length,resolved:S.modal.data.resolved}));
  check(mid.revealed>0&&mid.revealed<mid.n,"part-way through the week ("+mid.revealed+" of "+mid.n+")");
  check(mid.money===start.before,"and the balance is still untouched");
  check(!mid.resolved,"and it is still not settled");

  // ---- it settles at the end, and that is when the money moves
  await page.waitForFunction(()=>{const d=S&&S.modal&&S.modal.data;return d&&d.done;},{timeout:60000});
  await page.waitForTimeout(300);
  const end=await page.evaluate(()=>({money:S.money,outcome:S.modal.data.outcome,
    paid:S.modal.data.paid,week:S.week,weeks:S.modal.data.weeks,
    wages:(retainerCost()+recruits().reduce((n,c)=>n+c.upkeep,0))*(S.modal.data.weeks||0),
    onCrew:recruits().some(c=>c.id===S.modal.data.cid),
    pending:!!S.pendingTrip}));
  check(end.outcome,"the week ends with an answer: "+end.outcome);
  check(!end.pending,"the trip is over");
  // The drop is the trip plus the wages for the week it took — weekTick runs at the end of the
  // trip like it does at the end of a job, and everybody on the books draws pay for that week.
  const drop=start.before-end.money;
  // The wages are for the week the trip took, and in week one a trip takes none — you are still
  // putting the crew together and the clock has not started. So the wages are only owed when a
  // week actually passed.
  const owed=end.paid+(end.weeks?end.wages:0);
  check(drop===owed,
    "and the balance moves exactly then, by the trip plus the wages for the week(s) it took ("
    +end.paid+" + "+(end.weeks?end.wages:0)+" = "+drop+")");
  check(end.outcome==="signed"?end.money<start.before:true,"a signature costs the fee");
  check(end.outcome==="signed"?end.onCrew:!end.onCrew,
    end.outcome==="signed"?"and they are on the crew":"and they are not on the crew");
  check(end.weeks?end.week>week0:end.week===week0,
    end.weeks?"the week is spent either way ("+week0+" → "+end.week+")"
             :"and in week one no week is spent either way ("+week0+" → "+end.week+")");
  await page.screenshot({path:OUT+"/02-settled.png"});

  // ---- skipping does not settle it early either
  const sk=await page.evaluate(()=>{
    S.modal=null;S.pendingTrip=null;S.money=5e7;
    let picked=null,tries=0;
    while(!picked&&tries++<400){
      const c=S.roster.find(x=>x.status==="available"&&canSign(x)&&S.money>=x.fee&&!hireWhy(x)&&!x._tried2);
      if(!c)break;
      c._tried2=true;
      hire(c.id);
      const d=S.modal&&S.modal.data;
      if(d&&!d.snag){picked={before:S.money};break;}
      S.modal=null;S.pendingTrip=null;
    }
    return picked;});
  if(sk){
    check(await page.evaluate(()=>S.money)===sk.before,"a second trip also starts without charging you");
    await page.click('[data-act="skip-ticker"]');
    await page.waitForTimeout(500);
    const after=await page.evaluate(()=>({money:S.money,done:S.modal.data.done,paid:S.modal.data.paid,outcome:S.modal.data.outcome}));
    check(after.done&&after.outcome,"skipping to the end still settles it properly: "+after.outcome);
    const wages2=await page.evaluate(()=>(retainerCost()+recruits().reduce((n,c)=>n+c.upkeep,0))*(S.modal.data.weeks||0));
    check(sk.before-after.money===after.paid+wages2,"and charges exactly what it cost, once ("+after.paid+" + "+wages2+" wages)");
  } else check(true,"no second snag-free trip available to skip");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

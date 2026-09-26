// Build 37: nothing is paid until the trip ends. The map of the city it drew is gone (build 121);
// what that section checks now is that the sheet is clean where the plan was.
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

  // ---- where the plan of the city used to be
  // The trip drew a plan of the city you flew into, with you and them standing at four dots on
  // it. It is gone, from here and from the job — five labelled dots and some shuffling figures
  // said nothing the sentence had not already said. A drawing of the moment says it instead, and
  // no TRIP_ table is drawn yet, so a running trip is one column and the story takes the width.
  // What the plan was really for — which city, whose week, what time it is — was never the plan's
  // to carry: it is in the header and on every line of the ticker, which is where it is checked.
  const m=await page.evaluate(()=>{
    const cols=document.querySelector(".modal.feed .feed-cols");
    return {map:!!document.querySelector(".feedmap"),
      fm:document.querySelectorAll(".modal [class*='fm-']").length,
      solo:!!(cols&&cols.classList.contains("solo")),
      side:!!document.querySelector(".feed-side"),
      kicker:(document.querySelector(".modal.feed .kicker")||{}).textContent||""};});
  check(!m.map,"the trip does not draw a plan of the city");
  check(m.fm===0,"and nothing of the map's furniture is left on the screen ("+m.fm+" fm- elements)");
  check(m.solo&&!m.side,"so the story takes the whole sheet");
  check(m.kicker.indexOf(start.city)>=0&&m.kicker.indexOf(start.country)>=0,
    "the city you flew to is on the header, where it belongs: "+m.kicker.trim());
  // The plan carried the clock in its corner, so it had one before the first line did. The ticker
  // carries it per line instead, which means waiting for a line before asking what time it is.
  await page.waitForSelector("#ticker .tk-t",{timeout:30000});
  const times=await page.evaluate(()=>[...document.querySelectorAll("#ticker .tk-t")].map(e=>e.textContent));
  check(times.length>0&&times.every(t=>/^([A-Z]{3} )?\d\d:\d\d$/.test(t)),
    "and the trip's own clock is on every line, days and all: "+times[0]);
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

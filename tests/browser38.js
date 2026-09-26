// Build 39: a night that went wrong says why. (The map that carried the crew's faces is gone as of
// build 121; that section now checks the running sheet is clean of it.)
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots39");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1200}});
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

  const heal=()=>page.evaluate(()=>{
    S.money=5e7;S.notices=[];S.modal=null;S.loose=[];S.event=null;
    S.roster.forEach(c=>{if(c.status==="injured"||c.status==="jailed"){c.status="crew";c.out=0;
      if(S.crewIds.indexOf(c.id)<0&&recruits().length<crewSeats())S.crewIds.push(c.id);}});
    while(recruits().length<3){const c=S.roster.find(x=>x.status==="available"&&canSign(x));if(!c)break;
      c.status="crew";c._touched=true;S.crewIds.push(c.id);}
    S.jobs=[];refreshJobs(true);});
  const force=(tier)=>page.evaluate(t=>{
    S.money=5e7;S.notices=[];S.modal=null;
    while(recruits().length<2){const c=S.roster.find(x=>x.status==="available"&&canSign(x));if(!c)break;
      c.status="crew";c._touched=true;S.crewIds.push(c.id);}
    const real=finishJob;const BAND=[-60,-24,-2,21,50];
    const j=S.jobs.filter(x=>!x.final&&assessJob(x,jobPool(x)).canRun).sort((a,b)=>b.diff-a.diff)[0];
    if(!j)return null;
    const roll=BAND[t]-assessJob(j,jobPool(j)).margin;
    finishJob=function(P,ci,d){P.roll=roll;return real(P,ci,d);};
    try{const d=startJob(j,{noTwist:true,pool:jobPool(j)});
      S.modal={type:"result",data:Object.assign({},d,{revealed:d.narrative.length,done:true})};render();
      return {tier:d.tier,verdict:d.verdictName,heatIn:d.why?d.why.heat:null,eff:d.why?d.why.eff:null,diff:d.why?d.why.diff:null};
    }finally{finishJob=real;}},tier);

  // ---- a botched job explains itself
  await heal();
  const bad=await force(1);
  check(bad&&bad.tier<=1,"a night that went wrong: "+(bad&&bad.verdict));
  await page.waitForTimeout(250);
  const W=await page.evaluate(()=>{
    const head=[...document.querySelectorAll(".kicker")].some(e=>/what went wrong/i.test(e.textContent));
    const box=document.querySelector(".wrongs");
    return {head,lead:[...document.querySelectorAll(".sel-help")].map(x=>x.innerText.replace(/\s+/g," ")).find(x=>/came to/.test(x)),
      items:box?[...box.querySelectorAll(".wr")].map(x=>({k:x.querySelector(".wr-k").textContent,
        fix:x.querySelector(".wr-f").textContent})):[]};});
  check(W.head,"the report carries a What went wrong");
  check(W.lead&&/came to \d+ against a room worth \d+/.test(W.lead),"it opens with the two numbers: "+JSON.stringify((W.lead||"").slice(0,64)));
  check(W.items.length>0,W.items.length+" things it names: "+W.items.map(x=>x.k).join(", "));
  check(W.items.every(x=>x.fix&&x.fix.length>10),"and every one says what would have answered it");
  const fixes=W.items.map(x=>x.fix).join(" ");
  check(/crew|speaks|knows|heat|Launderer|Hacker|Safecracker|commander|bonus|Temperament|Vetting|free/i.test(fixes),
    "in terms of something you could actually have done: "+JSON.stringify(W.items[0].fix.slice(0,72)));
  await page.screenshot({path:OUT+"/03-wrong.png"});

  // the heat it quotes is the heat they carried in, not what the job left behind
  const heatQ=await page.evaluate(()=>{const b=document.querySelector(".wrongs");
    if(!b)return null;const t=b.innerText;const m=/carrying (\d+) heat/.exec(t);
    return m?{quoted:+m[1],now:S.heat,wentIn:S.modal.data.why.heat}:null;});
  if(heatQ){
    check(heatQ.quoted===heatQ.wentIn,"the heat it quotes is what they carried in ("+heatQ.quoted+")");
    check(heatQ.quoted<=heatQ.now,"not what the job left them with ("+heatQ.now+")");
  } else check(true,"heat was not one of the things against them this time");

  // ---- a clean job does not explain itself
  await heal();
  const good=await force(4);
  await page.waitForTimeout(250);
  check(good,"a night forced the other way: "+(good?good.verdict:"none could be run"));
  if(good){
    check(good.tier>=3,"it came off ("+good.verdict+")");
    check(!(await page.evaluate(()=>[...document.querySelectorAll(".kicker")].some(e=>/what went wrong/i.test(e.textContent)))),
      "and a night that went right does not explain itself");
    check(await page.evaluate(()=>!!S.modal.data.why),"though the reckoning is kept on it either way, for the log");
  }

  // ---- where the faces on the map used to be
  // The second half of this file put the crew's own busts on the operation map, each clipped into
  // a disc with a mark of what it was doing on the corner. The map is gone (build 121) and so is
  // that half: the busts it checked are the crew cards' busts, which browser33 and browser47
  // already check where a player actually reads them. What is left to check here is that the
  // running feed no longer builds any of it.
  await heal();
  const running=await page.evaluate(()=>{
    S.modal=null;S.notices=[];
    const j=S.jobs.filter(x=>!x.final&&assessJob(x,jobPool(x)).canRun)[0];
    if(!j)return null;doExecute(j.id);estabClear();   // build 102: the night opens on a card of the city. Click it away, as a player does.
    return {n:S.modal.data.teamIds.length};});
  check(running,"a job running, to look at the sheet");
  if(!running){console.error("cannot look at a running job without one");process.exit(1);}
  await drain();
  // The panel is one column until the first line is read, so wait for a line before asking what
  // is beside it — otherwise "no plan" would pass on a sheet that is simply still empty.
  await page.waitForFunction(()=>{const d=S&&S.modal&&S.modal.data;return d&&(d.revealed||0)>=1;},{timeout:60000});
  await page.waitForTimeout(400);
  const gone=await page.evaluate(()=>({
    fm:document.querySelectorAll(".modal [class*='fm-']").length,
    sc:document.querySelectorAll(".modal [class*='sc-']").length,
    map:document.querySelectorAll(".feedmap").length,
    art:document.querySelectorAll(".feed-side .feedart").length}));
  check(gone.map===0&&gone.fm===0&&gone.sc===0,
    "the night draws no plan and none of its parts ("+gone.map+" maps, "+gone.fm+" fm-, "+gone.sc+" sc-)");
  check(gone.art===1,"what stands beside the feed is a drawing of the moment");
  await page.screenshot({path:OUT+"/04-running.png"});

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

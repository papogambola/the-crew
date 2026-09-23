// Build 32: hovering bad blood tells you what happened between them.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots32");fs.mkdirSync(OUT,{recursive:true});
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
    await page.waitForTimeout(90);if(++n>30)break;}};
  await drain();

  // a crew, and two bad nights behind them
  const made=await page.evaluate(()=>{
    S.money=5e8;
    ["wheelman","enforcer","fixer","forger"].forEach(t=>{const c=S.roster.find(x=>x.status==="available"&&x.tech===t&&canSign(x));
      if(c&&recruits().length<crewSeats()){c.status="crew";c._touched=true;S.crewIds.push(c.id);}});
    const real=finishJob;const BAND=[-60,-24,-2,21,50];
    const heal=()=>{S.roster.forEach(c=>{if(c.status==="injured"||c.status==="jailed"){c.status="crew";c.out=0;
      if(S.crewIds.indexOf(c.id)<0&&recruits().length<crewSeats())S.crewIds.push(c.id);}});
      while(recruits().length<4){const x=S.roster.find(y=>y.status==="available"&&canSign(y));if(!x)break;x.status="crew";x._touched=true;S.crewIds.push(x.id);}
      S.money=5e8;};
    let n=0,done=0;
    while(done<2&&n++<40){
      heal();
      const j=S.jobs.filter(x=>!x.final&&assessJob(x,jobPool(x)).canRun).sort((a,b)=>a.tier-b.tier)[0];
      if(!j)break;
      const roll=BAND[1]-assessJob(j,jobPool(j)).margin;
      finishJob=function(P,ci,d){P.roll=roll;return real(P,ci,d);};
      try{const d=startJob(j,{noTwist:true,pool:jobPool(j)});if(d.tier<=1&&d.teamIds.length>=2)done++;}finally{finishJob=real;}
      S.notices=[];S.modal=null;S.loose=[];
    }
    heal();
    const j2=S.jobs.filter(x=>!x.final&&assessJob(x,jobPool(x)).canRun)
      .find(x=>assessJob(x,jobPool(x)).factors.some(f=>f.k==="Bad blood"));
    S.tab="jobs";S.jobOpen=j2?j2.id:null;S.notices=[];S.modal=null;render();
    return {log:Object.keys(S.bondLog||{}).length,open:!!j2};
  });
  await drain();await page.waitForTimeout(250);
  check(made.log>0,"the crew have "+made.log+" pairs with history");
  check(made.open,"and a posting whose reckoning counts bad blood");

  // The reckoning has several hoverable headings now — the week's news puts one in for every
  // story that touched this posting — so the Bad blood one is asked for by name rather than by
  // being the first one in the list.
  const els=await page.$$('.factors .k.tip');
  let el=null;
  for(const c of els){if((await page.evaluate(e=>e.textContent.trim(),c))==="Bad blood"){el=c;break;}}
  check(els.length>0,els.length+" hoverable headings in the reckoning");
  check(el,"and the Bad blood one is among them");
  if(!el){console.error("no Bad blood heading — stopping");process.exit(1);}
  check(await page.evaluate(e=>getComputedStyle(e).cursor==="help",el),"it says so with a help cursor");
  check(await page.evaluate(e=>getComputedStyle(e).borderBottomStyle==="dotted",el),"and a dotted underline");

  await el.evaluate(e=>e.scrollIntoView({block:"center"}));
  await page.waitForTimeout(150);
  await el.hover();
  await page.waitForTimeout(250);
  const tip=await page.evaluate(()=>{const t=document.getElementById("tipbox");
    return t&&!t.hidden?{text:t.textContent,w:Math.round(t.getBoundingClientRect().width),
      onscreen:t.getBoundingClientRect().top>=0&&t.getBoundingClientRect().bottom<=window.innerHeight}:null;});
  check(tip,"hovering it shows a tooltip");
  if(!tip){console.error("no tooltip — stopping");process.exit(1);}
  console.log("   ---\n   "+(tip?tip.text.replace(/\n/g,"\n   "):"")+"\n   ---");
  check(/What happened between them/.test(tip.text),"which says it is the background");
  check(/loses a point for every botched or blown night/.test(tip.text),"and the rule that made it");
  check(/week \d+/.test(tip.text),"and the week of each night");
  check(/botched job|disaster|messy/.test(tip.text),"what kind of night each was");
  check(/−1|\+1/.test(tip.text),"and which way it moved them");
  check(tip.w>300,"it is given room to be a list, not a paragraph ("+tip.w+"px)");
  check(tip.onscreen,"and it sits on screen");

  // every pair named in the note has its story in the tip
  const pairs=await page.evaluate(()=>{const job=S.jobs.find(x=>x.id===S.jobOpen);
    const a=assessJob(job,jobPool(job));const bs=bondScore(a.team);
    return bs.badIds.map(p=>[byId(p[0]).isPlayer?"You":byId(p[0]).first,byId(p[1]).isPlayer?"you":byId(p[1]).first]);});
  check(pairs.length>0,pairs.length+" pair(s) have bad blood on this job");
  // every person in every bad pair is named, and the pair count adds back up — pairs whose
  // background is the same are said once rather than repeated verbatim
  const people=[...new Set([].concat.apply([],pairs))];
  check(people.every(n=>tip.text.indexOf(n==="you"?"You":n)>=0),
    "every one of them is named in the tip: "+people.join(", "));
  const counted=(tip.text.match(/(\d+) pairs/g)||[]).reduce((n,m)=>n+parseInt(m,10),0)
              + (tip.text.match(/^\S.*\([+-]?\d+\)\s*$/gm)||[]).length;
  check(counted===pairs.length,"and every pair is accounted for, none twice ("+counted+" of "+pairs.length+")");
  await page.screenshot({path:OUT+"/01-factor-hover.png"});

  // the same history on the crew strip
  await page.evaluate(()=>{const t=document.getElementById("tipbox");if(t)t.hidden=true;});
  // the crew cards carry the same history on the line that names who they will not work with
  await page.evaluate(()=>{S.jobOpen=null;S.tab="crew";S.modal=null;render();});
  await page.waitForTimeout(250);
  const card=await page.$('.prof .tip[data-wide="1"]');
  check(card,"a crew card names who somebody has bad blood with, and it is hoverable");
  if(card){
    await page.evaluate(()=>{const e=document.querySelector('.prof .tip[data-wide="1"]');if(e)e.scrollIntoView({block:"center"});});
    await page.waitForTimeout(140);await card.hover();await page.waitForTimeout(240);
    const t2=await page.evaluate(()=>{const t=document.getElementById("tipbox");return t&&!t.hidden?t.textContent:null;});
    check(t2&&/week \d+|kept a record/.test(t2),"and hovering it gives that pair their own history");
    console.log("   "+(t2||"").replace(/\n/g," / ").slice(0,150));
    await page.screenshot({path:OUT+"/03-card-hover.png"});
  }

  // and on the file
  await page.evaluate(()=>{S.jobOpen=null;S.tab="roster";S.modal=null;render();});
  await page.waitForTimeout(200);
  const onCrew=await page.evaluate(()=>{
    const c=crewAll().find(x=>bondsFor(x).length);
    if(!c)return null;S.modal={type:"recruit",id:c.id};render();return c.id;});
  await page.waitForTimeout(220);
  const fileTip=await page.$('.modal .tip[data-wide="1"]');
  if(onCrew&&fileTip){
    await page.evaluate(()=>{const e=document.querySelector(".modal .tip[data-wide]");if(e)e.scrollIntoView({block:"center"});});
    await page.waitForTimeout(120);await fileTip.hover();await page.waitForTimeout(220);
    const t3=await page.evaluate(()=>{const t=document.getElementById("tipbox");return t&&!t.hidden?t.textContent:null;});
    check(t3&&/week \d+|kept a record/.test(t3),"and so does the line on their file");
    await page.screenshot({path:OUT+"/02-file-hover.png"});
  }else check(false,"the file should carry it too (modal opened: "+(!!onCrew)+", tip found: "+(!!fileTip)+")");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

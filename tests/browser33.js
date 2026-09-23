// Build 33: the between-jobs question shows whose file it is, and letting somebody go can be
// settled two days later.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots33");fs.mkdirSync(OUT,{recursive:true});
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

  const stage=async(withEnforcer)=>page.evaluate(w=>{
    S.money=5e7;S.event=null;S.modal=null;S.loose=[];S.notices=[];
    S.crewIds.slice().forEach(id=>{const c=byId(id);if(c){c.status="available";}});
    S.crewIds=[];
    const want=w?["enforcer","wheelman","fixer"]:["wheelman","fixer","forger"];
    want.forEach(t=>{const c=S.roster.find(x=>x.status==="available"&&x.tech===t&&canSign(x));
      if(c&&recruits().length<crewSeats()){c.status="crew";c._touched=true;S.crewIds.push(c.id);}});
    // no cleaner either way, so "quiet" turns purely on the enforcer
    recruits().forEach(c=>{if(c.tech==="cleaner"){c.status="available";S.crewIds=S.crewIds.filter(i=>i!==c.id);}});
    const m=recruits().find(c=>!c.isPlayer);
    const W=WEEKLY.find(x=>x.k==="quit");
    S.event={k:"quit",h:fill2(W.h,{M:m.first}),text:fill2(W.text,{M:m.first}),week:S.week,mId:m.id,
             v:{M:m.first},opts:W.opts.map(o=>({t:fill2(o.t,{M:m.first}),req:o.req}))};
    S.modal={type:"event"};render();
    return {who:m.first,id:m.id,loy:m.loyalty,cut:m.cut,enf:recruits().some(c=>c.tech==="enforcer")};
  },withEnforcer);

  // ---- the file under the question
  const A=await stage(true);
  await page.waitForTimeout(250);
  check(await page.$(".modal .evwho"),"the question carries a file for "+A.who);
  const av=await page.evaluate(()=>{const e=document.querySelector(".modal .evwho .av");
    if(!e)return null;const r=e.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)};});
  check(av&&av.w===60&&av.h===72,"the portrait is the size it is on a crew card, not the size of the modal ("+(av?av.w+"x"+av.h:"missing")+")");
  const shown=await page.evaluate(()=>{const w=document.querySelector(".modal .evwho");
    return w?{t:w.innerText.replace(/\s+/g," "),bars:w.querySelectorAll(".attr").length,av:!!w.querySelector("svg, .av")}:null;});
  check(shown&&shown.av,"with their face on it");
  check(shown&&shown.bars===5,"and all five attributes ("+(shown&&shown.bars)+")");
  check(shown&&shown.t.indexOf(A.who)>=0,"it is the right person");
  check(/LOYALTY/i.test(shown.t)&&shown.t.indexOf(String(A.loy))>=0,"their loyalty, as a number ("+A.loy+")");
  check(/TAKES/i.test(shown.t)&&shown.t.indexOf(Math.round(A.cut*100)+"%")>=0,"what they take of every score");
  check(/JOBS WITH YOU/i.test(shown.t),"how many jobs they have run with you");
  check(/KNOWS/i.test(shown.t)&&/not much|enough to be a problem|most of it/.test(shown.t),"and how much of your business they know");
  await page.screenshot({path:OUT+"/01-question.png",fullPage:false});

  // ---- the forty-eight hours
  const opts=await page.evaluate(()=>[...document.querySelectorAll(".modal .twist-opt")]
    .map(b=>({t:b.innerText.replace(/\s+/g," ").trim(),off:b.disabled})));
  console.log("   "+opts.map(o=>(o.off?"[off] ":"")+o.t).join("\n   "));
  check(opts.length===5,"five answers, not four ("+opts.length+")");
  const idx=opts.findIndex(o=>/forty-eight hours/i.test(o.t));
  check(idx>=0,"one of them is letting them go and settling it in forty-eight hours");
  check(!opts[idx].off,"and with an enforcer on the crew it can be chosen");
  check(opts.every((o,i)=>/^[A-E] /.test(o.t)),"every answer is lettered, including the fifth");

  // without anybody who can do it, it is closed and says why
  const B=await stage(false);
  await page.waitForTimeout(220);
  const opts2=await page.evaluate(()=>[...document.querySelectorAll(".modal .twist-opt")]
    .map(b=>({t:b.innerText.replace(/\s+/g," ").trim(),off:b.disabled,title:b.getAttribute("title")||""})));
  const i2=opts2.findIndex(o=>/forty-eight hours/i.test(o.t));
  check(opts2[i2].off,"with no enforcer and no cleaner it is closed");
  check(/Enforcer or a Cleaner/i.test(opts2[i2].t+opts2[i2].title),"and says who it would take: "+JSON.stringify(opts2[i2].t.slice(-38)));

  // ---- taking it
  await stage(true);
  await page.waitForTimeout(200);
  const before=await page.evaluate(()=>({heat:S.heat,loose:(S.loose||[]).length}));
  await page.click('.modal .twist-opt[data-i="'+idx+'"]');
  await page.waitForTimeout(280);
  const after=await page.evaluate(()=>{const ev=S.event;const m=ev&&ev.mId?byId(ev.mId):null;
    return {outcome:ev?ev.outcome:null,status:m?m.status:null,loose:(S.loose||[]).length,
            looseIds:(S.loose||[]).map(x=>x.id||x.cid||""),heat:S.heat,onCrew:recruits().some(c=>c.id===(ev&&ev.mId))};});
  check(after.outcome,"choosing it settles the question: "+JSON.stringify((after.outcome||"").slice(0,84)));
  check(after.status==="gone","they are gone");
  check(!after.onCrew,"and off the crew");
  check(after.loose===before.loose,"and no loose end is raised for them — that is what the two days bought");
  check(after.heat>=before.heat,"it costs heat either way ("+before.heat+" → "+after.heat+")");
  check(/forty-eight|Thursday|Tuesday|two days/i.test(after.outcome),"the outcome tells it as two days, not a night");
  await page.screenshot({path:OUT+"/02-outcome.png",fullPage:false});

  // ---- letting them go the ordinary way still raises the question
  await stage(true);
  await page.waitForTimeout(200);
  const plain=await page.evaluate(()=>[...document.querySelectorAll(".modal .twist-opt")]
    .findIndex(b=>/^C Let /.test(b.innerText.replace(/\s+/g," ").trim())));
  check(plain>=0,"the plain 'let them go' is still there");
  await page.click('.modal .twist-opt[data-i="'+plain+'"]');
  await page.waitForTimeout(280);
  const after2=await page.evaluate(()=>({loose:(S.loose||[]).length}));
  check(after2.loose>0,"and letting them walk still leaves somebody who can talk");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

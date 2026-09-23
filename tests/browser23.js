// Build 23 in a real browser: the stand-in line in the report, and the point it buys.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots23");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1100}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+GAME);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  check(await page.evaluate(()=>/^build \d+ /.test(BUILD)),"a build stamp is present");
  await page.click('[data-act="begin"]');
  await page.fill("#pname","Paz");
  await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');  // A job can also leave somebody outside the crew, and that question blocks the page until it
  // is answered, as it does for a player. These drives are about other screens, so they take the
  // free answer — Let them go — and move on. browser25 is the one that drives the decision.

  const dismiss=async()=>{
    let n=0;
    while(await page.$(".modal.notice")||await page.$('[data-act="loose"]')){
      if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');
      else await page.click('[data-act="loose"][data-i="0"]');
      await page.waitForTimeout(95);
      if(++n>25)break;
    }
    return n;                      // some drives count the boxes they closed
  };
  await dismiss();

  // a narrow crew, so most postings want a trade nobody has
  await page.evaluate(()=>{
    S.money=5e6;
    ["wheelman","forger","hacker"].forEach(t=>{const c=S.roster.find(c=>c.status==="available"&&c.tech===t&&c.exp<=3&&!c.limits.length);if(c)(function(){if(recruits().length<crewSeats()&&canSign(c)){S.money=Math.max(0,S.money-c.fee);c.status="crew";c._touched=true;S.crewIds.push(c.id);stats().hired++;}})();});
    render();
  });
  await dismiss();

  // find a posting with a gap, open it, and run it
  const opened=await page.evaluate(()=>{
    const gap=j=>{const a=assessJob(j);return a.canRun&&a.team.length>=2&&j.techs.some(t=>!a.team.some(c=>c.tech===t));};
    for(let r=0;r<60;r++){const j=S.jobs.find(x=>!x.final&&gap(x));if(j){S.tab="jobs";S.jobOpen=j.id;render();return {id:j.id,title:j.title,techs:j.techs};}S.jobs=[];refreshJobs(true);}
    return null;
  });
  check(!!opened,"a posting that wants a trade the crew hasn't got: "+(opened&&opened.title));
  await page.screenshot({path:OUT+"/01-job-with-a-gap.png",fullPage:true});

  await page.evaluate(id=>{doExecute(id);},opened.id);
  await page.waitForTimeout(400);
  // run the report out to the end
  await page.evaluate(()=>{const d=S.modal&&S.modal.data;if(d){d.revealed=d.narrative.length;d.done=true;render();}});
  await page.waitForTimeout(300);
  const report=await page.evaluate(()=>{
    const d=S.modal&&S.modal.data;
    return d?{tier:d.tier,verdict:d.verdictName,lines:d.narrative.map(l=>l.x),growth:d.growth}:null;
  });
  check(!!report,"the report opens ("+(report&&report.verdict)+")");
  // The rule is that nobody stands in cold — the week before the job went on the trade, which is
  // what the +1 brains for standing by pays for. The pool says that several ways ("a week's
  // practice" has a c in it; "having done it once, in a garage, slowly" says it without a verb),
  // so the line is looked for by what it means rather than by four particular phrasings.
  const PREPARED=/learn|read|practis|practice|taught|manual|done it/;
  const learn=report.lines.filter(x=>PREPARED.test(x)&&/on the crew|Nobody here is/.test(x));
  check(learn.length>0,"the minute-by-minute says nobody stood in cold: "
    +(learn[0]||report.lines.find(x=>/on the crew|Nobody here/.test(x))||"no stand-in line at all"));
  check(!learn.some(x=>/\ba [AEIOU]/.test(x)),"and says \"an Enforcer\", never \"a Enforcer\"");
  check(!report.lines.some(x=>/video/i.test(x)),"nobody watches a video about it");
  await page.screenshot({path:OUT+"/02-report.png",fullPage:true});

  const txt=(await page.$eval("body",e=>e.innerText));
  if(report.tier>=3){
    const cr=report.growth.filter(g=>g.stood);
    check(cr.length>0,"What they learned names the stand-in: "+cr.map(g=>g.first+" — "+g.stood).join(", "));
    check(cr.every(g=>g.up.filter(a=>a==="brains").length>=1),"and each of them got a point of brains");
    check(txt.toLowerCase().indexOf("stood in as")>=0,"the screen says stood in as");
    check(txt.indexOf("BRN")>=0,"beside the point it bought");
  } else {
    check(report.growth.every(g=>!g.stood),"a job that didn't come off credits nobody ("+report.verdict+")");
    check(txt.toLowerCase().indexOf("stood in as")<0,"and the screen doesn't say stood in as");
  }
  check(!/now a [AEIOU]/i.test(txt),"no \"now a Operator\" on the screen");
  check(!/\+1 ([A-Z]{3}), \+1 \1/.test(txt),"no attribute listed twice on one line");

  // forced both ways, so both branches are seen in the browser
  const both=await page.evaluate(()=>{
    const out={};
    const realFinish=finishJob;
    const gap=j=>{const a=assessJob(j);return a.canRun&&a.team.length>=2&&j.techs.some(t=>!a.team.some(c=>c.tech===t));};
    [["win",400],["lose",-400]].forEach(([k,roll])=>{
      let job=null;for(let r=0;r<60&&!job;r++){job=S.jobs.find(x=>!x.final&&gap(x))||null;if(!job){S.jobs=[];refreshJobs(true);}}
      if(!job)return;
      finishJob=function(P,ci,d){P.roll=roll;return realFinish(P,ci,d);};
      try{const d=startJob(job,{noTwist:true});out[k]={tier:d.tier,verdict:d.verdictName,stood:d.growth.filter(g=>g.stood).map(g=>g.first+" — "+g.stood),brains:d.growth.filter(g=>g.stood).map(g=>g.up.filter(a=>a==="brains").length)};}
      finally{finishJob=realFinish;}
    });
    S.modal=null;S.event=null;S.notices=[];render();
    return out;
  });
  check(both.win&&both.win.tier>=3&&both.win.stood.length>0,"forced to a success, the stand-in is paid: "+JSON.stringify(both.win&&both.win.stood));
  check(both.win&&both.win.brains.every(n=>n>=1&&n<=2),"one point of brains, not a pile: "+JSON.stringify(both.win&&both.win.brains));
  check(both.lose&&both.lose.tier<3&&both.lose.stood.length===0,"forced to a failure, nobody is credited ("+(both.lose&&both.lose.verdict)+")");

  // the info button explains it
  await page.evaluate(()=>{S.modal=null;S.event=null;S.notices=[];UI.info=false;render();});
  await page.waitForTimeout(150);
  if(await page.$('[data-act="info"]')){
    await page.click('[data-act="info"]');
    await page.waitForTimeout(250);
    await page.screenshot({path:OUT+"/03-info.png",fullPage:true});
  }

  // the PC minimum width
  await page.setViewportSize({width:960,height:1000});
  await page.evaluate(()=>{UI.info=false;S.tab="log";render();});
  await page.waitForTimeout(250);
  await page.screenshot({path:OUT+"/04-minw.png",fullPage:true});
  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

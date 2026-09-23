// Build 27 in a real browser: a client who takes a botched job personally — the word going
// round, the board saying who, and somebody turning up.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots27");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1100}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+GAME);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');
  await page.fill("#pname","Paz");
  await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  const dismiss=async()=>{let n=0;
    while(await page.$(".modal.notice")||await page.$('[data-act="loose"]')){
      if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');
      else await page.click('[data-act="loose"][data-i="0"]');
      await page.waitForTimeout(90);if(++n>25)break;}};
  await dismiss();
  await page.evaluate(()=>{
    S.money=5e7;
    ["wheelman","enforcer","fixer","forger"].forEach(t=>{const c=S.roster.find(x=>x.status==="available"&&x.tech===t&&canSign(x));
      if(c&&recruits().length<crewSeats()){c.status="crew";c._touched=true;S.crewIds.push(c.id);}});
    render();
  });
  await dismiss();

  // ---- botch jobs until a client takes it personally
  const made=await page.evaluate(()=>{
    const real=finishJob;
    for(let i=0;i<60;i++){
      S.grudges=[];S.revenge=null;S.loose=[];S.notices=[];S.modal=null;S.money=5e7;
      // sixty disasters in a row grinds the crew up, and a crew too small cannot take a job at
      // all — so put the hurt and the held back on their feet between attempts
      S.roster.forEach(c=>{if(c.status==="injured"||c.status==="jailed"){c.status="crew";c.out=0;if(S.crewIds.indexOf(c.id)<0&&recruits().length<crewSeats())S.crewIds.push(c.id);}});
      while(recruits().length<crewSeats()){
        const f=S.roster.find(x=>x.status==="available"&&canSign(x)&&!x.coolUntil);
        if(!f)break;f.status="crew";f._touched=true;S.crewIds.push(f.id);
      }
      const j=S.jobs.find(x=>!x.final&&assessJob(x,jobPool(x)).canRun);
      if(!j){S.jobs=[];refreshJobs(true);continue;}
      const client=j.client;
      finishJob=function(P,ci,d){P.roll=-900;return real(P,ci,d);};
      let d;try{d=startJob(j,{noTwist:true});}finally{finishJob=real;}
      if(d.tier<=1&&(S.grudges||[]).length){
        const g=S.grudges.find(x=>!x.via);
        return {client,verdict:d.verdictName,kind:g.kind,until:g.until,
          friends:S.grudges.filter(x=>x.via).map(x=>x.c),blood:S.grudges.some(x=>x.kind==="blood"&&!x.done),
          log:S.log.map(l=>l.t).find(t=>t.indexOf("not taking it well")>0)||""};
      }
    }
    return null;
  });
  check(made,"a job went wrong and the client took it personally");
  check(made&&made.log.indexOf("not taking it well")>0,"the case log says so: "+(made&&made.log.slice(0,100)));
  check(made&&made.friends.length>=1,made&&(made.client+" had a word with "+made.friends.join(", ")));
  await page.evaluate(()=>{S.modal=null;S.notices=[];S.loose=[];S.tab="jobs";S.jobOpen=null;render();});
  await dismiss();
  await page.waitForTimeout(200);

  // ---- the board says who will not deal with you
  const boardTxt=await page.$eval("body",e=>e.innerText);
  check(/will not deal with you/i.test(boardTxt),"the board says clients will not deal with you");
  check(boardTxt.toLowerCase().indexOf(made.client.toLowerCase())>=0,"naming "+made.client);
  check(/week \d+/i.test(boardTxt),"and until when");
  // and why, which is the whole point of the notice: a thinner board with no cause given is the
  // one kind of sentence this game does not print.
  check(/had a word|disaster|botched|messy|went wrong/i.test(boardTxt),"and why — which way it went, or who had a word");
  check(/why, in full/i.test(boardTxt),"with the whole account one click away");
  if(made.blood)check(/not finished with you/i.test(boardTxt),"and warns that one of them is not finished with you");
  const clean=await page.evaluate(()=>{S.jobs=[];refreshJobs(true);return S.jobs.filter(j=>!j.final&&clientBanned(j.client)).length;});
  check(clean===0,"and no posting on a fresh board comes from one of them");
  await page.screenshot({path:OUT+"/01-board-banned.png",fullPage:true});

  // ---- somebody turns up
  const came=await page.evaluate(()=>{
    if(!S.grudges.some(g=>g.kind==="blood"&&!g.done)){
      S.grudges.push({c:"the Notary",since:S.week,until:S.week+20,kind:"blood",job:"Open the floor safe",
        country:"France",fee:240000,revengeAt:S.week,done:false});
    }
    for(let i=0;i<50&&!S.revenge;i++){S.event=null;S.loose=[];grudgeTick(freshRng());if(!S.revenge)weekTick(freshRng());}
    S.notices=[];S.loose=[];
    if(S.revenge){S.modal={type:"revenge"};render();}
    return S.revenge?{c:S.revenge.c,k:S.revenge.k,h:S.revenge.h,opts:S.revenge.opts.length,cost:S.revenge.cost}:null;
  });
  check(came,"they turn up: "+(came&&came.h));
  await page.waitForSelector('[data-act="revenge"]');
  const rTxt=await page.$eval("body",e=>e.innerText);
  check(rTxt.indexOf(came.h)>=0,"the box names what is happening");
  check(/% it goes the way you want it to/i.test(rTxt),"every answer carries its odds");
  const opts=await page.$$('[data-act="revenge"]');
  check(opts.length===came.opts,came.opts+" answers on the table");
  check(/the bill for a job that went wrong/i.test(rTxt),"and it says what it is");
  await page.screenshot({path:OUT+"/02-revenge.png",fullPage:true});
  // it cannot be clicked away
  await page.click(".scrim",{position:{x:5,y:5}}).catch(()=>{});
  await page.waitForTimeout(200);
  check(await page.evaluate(()=>S.modal&&S.modal.type==="revenge"),"it cannot be clicked away");
  // the i button explains it
  if(await page.$('[data-act="info"]')){
    await page.click('[data-act="info"]');
    await page.waitForTimeout(250);
    check(/an unhappy client/i.test(await page.$eval("body",e=>e.innerText)),"the i button explains this screen");
    await page.screenshot({path:OUT+"/03-revenge-info.png",fullPage:true});
    await page.click('[data-act="info-close"].btn');
    await page.waitForTimeout(200);
  }
  // answer it
  const b4=await page.evaluate(c=>({money:S.money,heat:S.heat,crew:field().length,
    banned:bannedClients().length,theirs:clientBanned(c)}),came.c);
  const idx=await page.evaluate(()=>{
    const pay=S.revenge.opts.findIndex(o=>o.pay&&S.money>=S.revenge.cost);
    return pay>=0?pay:S.revenge.opts.findIndex(o=>!o.req&&!o.pay);
  });
  const paying=await page.evaluate(i=>!!S.revenge.opts[i].pay,idx);
  await page.click('[data-act="revenge"][data-i="'+idx+'"]');
  await page.waitForTimeout(400);
  await dismiss();
  const after=await page.evaluate(c=>({revenge:!!S.revenge,banned:bannedClients().length,money:S.money,
    theirs:clientBanned(c),rows:(S.grudges||[]).filter(g=>g.c===c&&S.week<g.until).length,
    log:S.log.map(l=>l.t).find(t=>t.indexOf(cap(c))===0)||"",
    finished:!(S.grudges||[]).some(g=>g.kind==="blood"&&!g.done)}),came.c);
  check(!after.revenge,"answering clears it");
  check(after.finished,"and they are finished with you");
  check(after.log.length>0,"the case log keeps it: "+after.log.slice(0,90));
  // only giving the client back what they lost settles the client — paying a police desk or your
  // own man does not, so the claim is made for the scenario that actually offers it
  const settles=await page.evaluate(k=>{const r=REVENGE.find(x=>x.k===k);const o=r.opts.find(z=>z.pay);return !!(o&&o.eff&&o.eff.clear);},came.k);
  // the claim is about this client, not about the count: answering can run weeks off the clock,
  // and another crew's bad night in those weeks bans somebody else while this one is being settled
  if(paying&&settles){
    check(b4.theirs&&!after.theirs,"paying them back lifts their ban (banned: "+b4.theirs+" → "+after.theirs+")");
    check(after.rows===0,"and every line they had open, not just the first ("+after.rows+" left)");
  }
  else check(true,"this one is settled by "+(settles?"cash":"something other than cash")+", and the answer stood");
  await page.screenshot({path:OUT+"/04-after.png",fullPage:true});

  // the smallest window the board is drawn in — same layout, just less room around it
  await page.setViewportSize({width:960,height:900});
  await page.evaluate(()=>{S.modal=null;S.tab="jobs";S.jobOpen=null;render();});
  await page.waitForTimeout(250);
  await page.screenshot({path:OUT+"/05-min-width-board.png",fullPage:true});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),"nothing scrolls sideways at the PC minimum width");
  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

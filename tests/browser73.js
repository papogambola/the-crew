/* THE CHIPS SAY WHAT A THING IS WORTH, AND THE VERDICT IS THE LOUD ONE.

   Before this, a posting told you "✗ FORGER" and "Long odds" and left you to connect them.
   Both halves were opinions with no sum shown: the cross never said what a forger was worth,
   and the verdict never said what it was counting. A player could not tell whether a missing
   trade was a catastrophe or a shrug, and — worse — a missing trade and a missing knowledge
   were drawn identically although only one of them is charged.

   The number on a chip is therefore only worth printing if it is THE SAME NUMBER the reckoning
   applies. That is what most of this file checks: not that a chip says "+9", but that moving
   the thing the chip is about moves the reckoning by exactly what the chip claimed. */
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path");
const FILE=path.resolve(__dirname,process.argv[2]||GAME);
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  const errs=[];page.on("pageerror",e=>errs.push(String(e)));
  await page.goto("file://"+FILE);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Sasha Varga");
  await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  /* Everything that can be over the board, traced rather than guessed at — three earlier
     versions of this cost more time than the feature did.

     Two traps, both of which produce the same useless failure (a thirty-second timeout whose
     message says the button underneath is "visible, enabled and stable"):

       - the SCRIM carries the same data-act as the close button inside it, so a bare
         [data-act="notice-close"] matches the backdrop, and clicking the backdrop's centre
         lands on the modal box and is swallowed. Every selector here names a button.
       - the "two launderers" box has no .btn and no ✕ at all; its options are button.twist-opt,
         so a generic "click the last .btn" drain broke out with it still standing.

     And the order matters: a notice's last button is "The record →", which navigates instead
     of closing, so "Later" is named explicitly and first. */
  const drain=async()=>{for(let i=0;i<40;i++){
    if(await page.$('button[data-act="crewname-later"]'))await page.click('button[data-act="crewname-later"]');
    else if(await page.$('button[data-act="notice-close"].btn'))await page.click('button[data-act="notice-close"].btn');
    else if(await page.$('button[data-act="news-close"].btn'))await page.click('button[data-act="news-close"].btn');
    else if(await page.$('button[data-act="loose"]'))await page.click('button[data-act="loose"][data-i="0"]');
    else if(await page.$('button[data-act="clash"]'))await page.click('button[data-act="clash"]');
    else if(await page.$('button[data-act="clash-close"]'))await page.click('button[data-act="clash-close"]');
    else if(await page.$('.scrim button.x'))await page.click('.scrim button.x');
    else if(await page.$('.scrim .btn')){const b=await page.$$('.scrim .btn');await b[b.length-1].click();}
    else break;await page.waitForTimeout(60);}};
  /* Clear the desk, then click — and if something landed in between, clear it and try again.
     A render can put a box up between the drain finishing and the click landing, and the
     failure for that is a thirty-second timeout whose message says the button is "visible,
     enabled and stable", which is true and useless. */
  const go=async sel=>{
    for(let i=0;i<8;i++){
      await drain();
      try{await page.click(sel,{timeout:2500});return;}catch(e){await page.waitForTimeout(150);}
    }
    await page.click(sel,{timeout:8000});
  };
  await drain();
  // A crew big enough that a team of several is the normal case — the division by field size
  // is the part of this most likely to be wrong, and it is invisible with a crew of one.
  /* Money, and a full crew — but NOT a jump in ranking. Setting S.rep to 200 clears seven
     career milestones at once, and a milestone is marked done when it is SHOWN, so clearing
     S.notices from the outside un-marks all seven and the next render queues them again.
     That is the loop that put the paper over this board and timed out two runs in three; it
     read as flakiness and was a thing this test was doing to itself. The notices are dismissed
     by clicking, which is what marks them done, and the ranking is left where the game put it. */
  await page.evaluate(()=>{
    S.money=5e7;
    for(let i=0;i<80&&recruits().length<crewSeats();i++){
      const c=S.roster.find(x=>x.status==="available"&&!x._u);if(!c)break;c._u=true;c.status="crew";S.crewIds.push(c.id);}
    render();
  });
  await drain();

  console.log("— the claim on the chip is the number in the reckoning —");
  /* The only honest test of "worth +9" is the counterfactual: take the trade away from the one
     who holds it, ask the reckoning again, and see whether it fell by 9. Everything else is
     checking that one arithmetic expression equals a copy of itself. */
  const tradeProof=await page.evaluate(()=>{
    const out=[];
    /* One week's board is six postings and whatever trades they happen to want, which on one
       run gave a single sample and failed a test that wanted three. Sweep boards until there
       are enough: the question is about the arithmetic, not about this Tuesday. */
    const boards=[];
    const week0=S.week,jobs0=S.jobs;
    for(let w=0;w<10&&boards.length<40;w++){S.week=week0+w;S.jobs=[];refreshJobs(true);boards.push(...S.jobs);}
    S.week=week0;S.jobs=jobs0;
    for(const j of boards){
      if(out.length>=12)break;
      const a=assessJob(j);
      if(!a.team.length)continue;
      for(const t of j.techs){
        const w=tradeWorth(a.team,a.team.length,t);
        if(!w.held)continue;
        /* Take it off EVERYONE in the field, not off the first one found. The first run of this
           measured 2 where the chip claimed 6, and the chip was the one telling the truth: two
           of them were safecrackers, so removing one left the requirement covered and only that
           man's own bonus went. The counterfactual has to be "nobody here is a safecracker". */
        const holders=a.team.filter(c=>hasTech(c,t));
        const was=holders.map(c=>({c,tech:c.tech,tech2:c.tech2}));
        const spare=TECHS.map(x=>x.k).find(k=>j.techs.indexOf(k)<0);
        holders.forEach(c=>{if(c.tech===t)c.tech=spare;if(c.tech2===t)c.tech2=null;});
        const without=assessJob(j);
        was.forEach(x=>{x.c.tech=x.tech;x.c.tech2=x.tech2;});
        // Only comparable when the same people are in the field: a trade can be the reason
        // somebody clears a border, and then two things moved, not one.
        if(without.team.length!==a.team.length)continue;
        out.push({job:j.title,trade:t,claimed:w.v,measured:a.eff-without.eff,
          second:w.second,holders:w.holders,n:a.team.length});
      }
    }
    return out;
  });
  check(tradeProof.length>=3,"measured "+tradeProof.length+" held trades against the reckoning");
  tradeProof.forEach(p=>check(Math.abs(p.claimed-p.measured)<=1,
    "  "+p.trade+(p.second?" (learned)":"")+(p.holders>1?" ×"+p.holders:"")
    +" in a field of "+p.n+": chip says "+p.claimed+", removing it costs "+p.measured));
  /* Arranged rather than waited for. The first version of tradeWorth quoted the first holder it
     found and stopped, which is right until a crew doubles up — and doubling up is a thing a
     player chooses, so a number that ignores it cannot be used to choose. A board of six never
     happened to contain one, so this makes one. */
  const doubled=await page.evaluate(()=>{
    const j=S.jobs.find(x=>!x.final&&assessJob(x).team.length>3)||S.jobs[0];
    const t=j.techs[0];
    const a0=assessJob(j);
    /* Never the forger. Overwriting somebody's trade to make them the second holder also takes
       away whatever they were — and if what they were was the crew's only forger, everybody
       with a weak passport falls out of the field, the team shrinks, and what the run measures
       is a border rather than a trade. That is exactly how this failed one run in two: +3
       claimed against +0 measured, because "both" and "one" were different teams. */
    const two=a0.team.filter(c=>!c.isPlayer&&!hasTech(c,"forger")).slice(0,2);
    if(two.length<2)return {skip:true};
    const was=two.map(c=>({c,tech:c.tech,tech2:c.tech2}));
    const spare=TECHS.map(x=>x.k).find(k=>j.techs.indexOf(k)<0);
    // exactly one holder
    a0.team.forEach(c=>{if(c.tech===t)c.tech=spare;if(c.tech2===t)c.tech2=null;});
    two[0].tech=t;
    const one=assessJob(j);
    const wOne=tradeWorth(one.team,one.team.length,t);
    // now two
    two[1].tech=t;
    const both=assessJob(j);
    const wTwo=tradeWorth(both.team,both.team.length,t);
    const measured=both.eff-one.eff;
    was.forEach(x=>{x.c.tech=x.tech;x.c.tech2=x.tech2;});
    return {t,one:wOne.v,two:wTwo.v,holders1:wOne.holders,holders2:wTwo.holders,
      claimedStep:wTwo.v-wOne.v,measured,n:both.team.length,
      sameTeam:one.team.length===both.team.length};
  });
  if(doubled.skip)console.log("ok  (no two non-forgers in the field — doubling skipped)");
  else{
  check(doubled.sameTeam,"the same people are in the field either way ("+doubled.n+")");
  check(doubled.holders1===1&&doubled.holders2===2,"a second "+doubled.t+" put on the same job");
  check(doubled.two>doubled.one,
    "the chip counts them both: +"+doubled.one+" with one, +"+doubled.two+" with two");
  check(Math.abs(doubled.claimedStep-doubled.measured)<=1,
    "and the step it claims is the step the reckoning takes: +"+doubled.claimedStep
    +" claimed, +"+doubled.measured+" measured");
  }

  const knowProof=await page.evaluate(()=>{
    const out=[];
    const boards=[];
    const week0=S.week,jobs0=S.jobs;
    for(let w=0;w<10&&boards.length<40;w++){S.week=week0+w;S.jobs=[];refreshJobs(true);boards.push(...S.jobs);}
    S.week=week0;S.jobs=jobs0;
    for(const j of boards){
      if(out.length>=10)break;
      const a=assessJob(j);
      for(const k of j.know){
        const w=knowWorth(a.team,k);
        if(!w.held)continue;
        const who=a.team.filter(c=>c.know.includes(k));
        const saved=who.map(c=>c.know.slice());
        who.forEach(c=>{c.know=c.know.filter(x=>x!==k);});
        const without=assessJob(j);
        who.forEach((c,i)=>{c.know=saved[i];});
        if(without.team.length!==a.team.length)continue;
        // Losing it is worth the bonus AND the charge for nobody having it — the chip's own
        // number is only the bonus, so the drop is the bonus minus the (negative) charge.
        out.push({k:k,claimed:w.v-KNOW_MISSING,measured:a.eff-without.eff,studied:w.studied});
      }
    }
    return out;
  });
  check(knowProof.length>=2,"measured "+knowProof.length+" pieces of held knowledge");
  knowProof.forEach(p=>check(Math.abs(p.claimed-p.measured)<=1,
    "  knows "+p.k+(p.studied?" (studied)":"")+": "+p.claimed+" claimed, "+p.measured+" measured"));

  console.log("\n— a missing trade is not charged, and a missing knowledge is —");
  const kinds=await page.evaluate(()=>{
    // A posting nobody can go on divides by a field of one and quotes +18, which is true and
    // useless; this question is about a crew that can actually take the job.
    const j=S.jobs.find(x=>!x.final&&assessJob(x).team.length>2)||S.jobs[0];
    const a=assessJob(j);
    const miss=TECHS.map(t=>t.k).find(k=>!a.team.some(c=>hasTech(c,k)))||"forger";
    const tw=tradeWorth(a.team,a.team.length,miss);
    // A knowledge the crew does not have, and what the reckoning does about it.
    const jk=JSON.parse(JSON.stringify(j));
    const unknown=Object.keys(KNOW_BEAT).find(k=>!a.team.some(c=>c.know.includes(k)));
    jk.know=[unknown];jk.techs=[];
    const withUnknown=assessJob(jk);
    const jb=JSON.parse(JSON.stringify(jk));jb.know=[];
    const base=assessJob(jb);
    return {tradeMissing:tw,tradeHtml:worthSpan(tw),
      knowMissing:knowWorth(a.team,unknown),knowHtml:worthSpan(knowWorth(a.team,unknown)),
      charged:withUnknown.eff-base.eff,constant:KNOW_MISSING};
  });
  check(kinds.tradeMissing.v>0&&/^\(\+/.test(kinds.tradeHtml.replace(/<[^>]*>/g,"")),
    "a trade nobody holds is quoted in brackets: "+kinds.tradeHtml.replace(/<[^>]*>/g,""));
  check(kinds.knowMissing.v<0&&!/\(/.test(kinds.knowHtml),
    "knowledge nobody has is quoted bare and negative: "+kinds.knowHtml.replace(/<[^>]*>/g,""));
  check(kinds.charged===kinds.constant,
    "and it really is charged: adding an unknown requirement moved the reckoning "+kinds.charged);

  console.log("\n— the field it is divided over is the field that goes —");
  const spread=await page.evaluate(()=>{
    const j=S.jobs.find(x=>!x.final&&assessJob(x).team.length>2)||S.jobs[0];
    const a=assessJob(j);
    const t=j.techs[0];
    const big=tradeWorth(a.team,a.team.length,t);
    const small=tradeWorth(a.team,2,t);
    return {n:a.team.length,big:big.v,small:small.v};
  });
  check(spread.n>2&&spread.small>spread.big,
    "the same trade is worth more in a smaller room: +"+spread.big+" over "+spread.n
    +" going, +"+spread.small+" over 2");

  console.log("\n— and it is on the screen —");
  /* Clear the desk from the game's own state rather than clicking boxes away. Career
     milestones fire on render, so every render this test causes can put another one over the
     board, and chasing them with clicks made this section fail about one run in three with a
     thirty-second timeout and no useful message. The question here is what the board's markup
     says; nothing about it is a question about modals. */
  await go('[data-act="tab"][data-k="jobs"]');
  await page.waitForSelector(".jobrow");
  const seen=await page.evaluate(()=>{
    const row=document.querySelector(".jobrow");
    const fit=row.querySelector(".fit");
    const title=row.querySelector(".t");
    const chipW=[...row.querySelectorAll(".meta .tag .w")].map(e=>e.textContent.trim());
    return {fit:fit?fit.textContent.trim():null,
      // Above the title, on its own line. It was inline with the title first, and pushed three
      // of seven headlines onto a second line — a fix for a quiet conclusion that broke the
      // thing the conclusion was about.
      fitAboveTitle:!!(row.querySelector(".fitline .fit")&&title&&!title.querySelector(".fit")
        &&row.querySelector(".fitline").compareDocumentPosition(title)&Node.DOCUMENT_POSITION_FOLLOWING),
      titleLines:title?Math.round(title.getBoundingClientRect().height/parseFloat(getComputedStyle(title).lineHeight||"20")):0,
      fitSize:fit?parseFloat(getComputedStyle(fit).fontSize):0,
      chipSize:parseFloat(getComputedStyle(row.querySelector(".meta .tag")).fontSize),
      worths:chipW,
      metaHasFit:!!row.querySelector(".meta .fit"),
      tip:fit?fit.getAttribute("data-tip"):""};
  });
  check(seen.fitAboveTitle&&!seen.metaHasFit,
    "the verdict leads the row, above the title, and is no longer buried in the meta line");
  check(/Good fit|Risky|Long odds|can go/.test(seen.fit),"and it reads \""+seen.fit+"\"");
  check(seen.fitSize>seen.chipSize,
    "set larger than the chips it used to sit among: "+seen.fitSize+"px against "+seen.chipSize+"px");
  check(/Crew \d+ against difficulty \d+|A job runs with the crew/.test(seen.tip||""),
    "and it shows its working on hover: \""+String(seen.tip).split("\n")[0]+"\"");
  check(seen.worths.length>0&&seen.worths.every(w=>/^[(]?[+−]\d+[)]?$/.test(w)),
    seen.worths.length+" requirement chips carry a number: "+seen.worths.join(" "));

  console.log("\n— the job file agrees with the board about the same job —");
  await go(".jobrow");
  await page.waitForSelector('[data-act="execute"]');
  const file=await page.evaluate(()=>{
    const head=document.querySelector(".panel-h .fit");
    const chips=[...document.querySelectorAll(".panel-b .tag .w")].map(e=>e.textContent.trim());
    const factors={};
    document.querySelectorAll(".factors .k").forEach(k=>{
      const v=k.nextElementSibling&&k.nextElementSibling.querySelector(".num");
      if(v)factors[k.textContent.trim()]=parseInt(v.textContent,10);
    });
    return {head:head?head.textContent.trim():null,chips:chips,factors:factors};
  });
  check(!!file.head,"the job file leads with the verdict too: "+file.head);
  check(file.chips.length>0,"and its chips carry numbers: "+file.chips.join(" "));
  // The one place the two screens could silently disagree: the "Trades" factor pays TRADE_COVER
  // per covered trade, and every held trade chip claims to include it.
  const agrees=await page.evaluate(()=>{
    const j=S.jobs.find(x=>x.id===UI.job)||S.jobs[0];
    const a=assessJob(j,jobPool(j));
    const f=a.factors.find(x=>x.k==="Trades");
    const held=j.techs.filter(t=>tradeWorth(a.team,a.team.length,t).held);
    return {factor:f?f.v:0,held:held.length,cover:TRADE_COVER};
  });
  check(agrees.factor===agrees.held*agrees.cover,
    "the Trades factor is exactly the covered trades times the constant the chips quote: "
    +agrees.factor+" = "+agrees.held+" × "+agrees.cover);

  console.log("\n— benching somebody changes the number, and that is the point —");
  const bench=await page.evaluate(()=>{
    const j=S.jobs.find(x=>x.id===UI.job)||S.jobs[0];
    const before=assessJob(j,jobPool(j));
    const t=j.techs.find(t=>tradeWorth(before.team,before.team.length,t).held);
    if(!t)return null;
    const wBefore=tradeWorth(before.team,before.team.length,t).v;
    // Bench somebody who does NOT hold it: the room gets smaller, the specialist gets bigger.
    const spare=before.team.find(c=>!hasTech(c,t)&&!c.isPlayer);
    if(!spare)return null;
    const pool=jobPool(j).filter(c=>c.id!==spare.id);
    const after=assessJob(j,pool);
    return {t:t,wBefore:wBefore,wAfter:tradeWorth(after.team,after.team.length,t).v,
      nBefore:before.team.length,nAfter:after.team.length};
  });
  if(bench)check(bench.wAfter>bench.wBefore,
    "benching one who is not the "+bench.t+" makes the "+bench.t+" worth more: +"
    +bench.wBefore+" over "+bench.nBefore+" → +"+bench.wAfter+" over "+bench.nAfter);
  else console.log("ok  (no benchable non-holder on this posting — skipped)");

  check(errs.length===0,"no page errors"+(errs[0]?" ("+errs[0]+")":""));
  await browser.close();
})();

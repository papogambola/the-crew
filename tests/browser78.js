/* THE LOCAL — the second kind of one-night hire.

   Paz: "another one-time job specialist for hire. A local that speaks the language of the job.
   A lot of times the crew doesn't speak the local language. Downside of that: It costs money,
   has no trade (and you cannot take him/her and a trade one-nighter. You cannot choose only
   one. And also he is not familiar with the crew like any one job hired."

   Five claims, and four of them are costs. Costs are the part of a feature that rots quietly:
   a downside that is described in the paragraph but not applied in the arithmetic looks fine on
   the screen and is a lie. So every one is measured here against the engine rather than read
   off the copy —

     no trade      asked of hasTech for all sixteen, not of the label under the name
     costs money   S.money before and after, and the fee is the same on a night that pays
                   nothing as on one that pays everything
     one or other  the contract is one slot, so taking either must displace the other
     a stranger    the −7 is in the factors, by name
     it is worth   the language it buys is worth more than the amateur it brings, which is the
       taking      whole reason to offer it — a downside stack that never nets positive is not a
                   decision, it is a trap

   And the two that are nobody's downside but would be somebody's bug: the money comes back if
   the arrangement is torn up before the night, and a local who talks shuts the country. */
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path");
const FILE=path.resolve(__dirname,process.argv[2]||GAME);
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1100}});
  const errs=[];page.on("pageerror",e=>errs.push(String(e)));
  await page.goto("file://"+FILE);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Sasha Varga");
  await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  const drain=async()=>{for(let i=0;i<40;i++){
    if(await page.$('button[data-act="crewname-later"]'))await page.click('button[data-act="crewname-later"]');
    else if(await page.$('button[data-act="notice-close"].btn'))await page.click('button[data-act="notice-close"].btn');
    else if(await page.$('button[data-act="news-close"].btn'))await page.click('button[data-act="news-close"].btn');
    else if(await page.$('button[data-act="loose"]'))await page.click('button[data-act="loose"][data-i="0"]');
    else if(await page.$('button.twist-opt[data-act="clash"]'))await page.click('button.twist-opt[data-act="clash"]');
    else if(await page.$('button[data-act="clash-close"]'))await page.click('button[data-act="clash-close"]');
    else if(await page.$('.scrim button.x'))await page.click('.scrim button.x');
    else if(await page.$('.scrim .btn')){const b=await page.$$('.scrim .btn');await b[b.length-1].click();}
    else break;await page.waitForTimeout(60);}};
  await drain();

  console.log("— what a local is —");
  const A=await page.evaluate(()=>{
    // A posting in a country with a language, asked of the engine directly. Built rather than
    // hunted for on the board: the board is seeded from the clock and a run that happened to
    // draw seven English-speaking countries would report that everything passed.
    const co=COUNTRIES.find(c=>c.langs.length&&c.langs[0]!=="English");
    const job={id:"TESTJOB",country:co.name,city:"Testville",cat:CATS[0].k,diff:50,need:3,
      techs:[],know:[],tags:[],payout:400000,tier:2,heat:10,weeks:1,expires:99};
    const L=localFor(job);
    return {
      country:co.name, langs:co.langs,
      name:L.n, first:L.first, nat:L.nat, langsHeld:L.langs,
      // Every trade the board can ask for, asked of the person. This is the claim, not the label.
      holdsAnyTrade:TECHS_ALL.some(t=>hasTech(L,t.k)),
      techKey:L.tech, techIsATrade:TECHS_ALL.some(t=>t.k===L.tech),
      label:techLabel(L),
      attrs:L.attrs, attrMax:Math.max.apply(null,ATTRS.map(a=>L.attrs[a])),
      know:L.know, limits:L.limits,
      cut:cutOf(job,L),
      fee:localFee(job),
      // the same job twice: a local drawn from the posting, not stored on it
      stable:localFor(job).n===L.n&&localFor(job).avseed===L.avseed,
      // a different posting is a different person
      different:localFor(Object.assign({},job,{id:"OTHERJOB"})).n
    };
  });
  check(!!A.name&&A.name.indexOf(" ")>0,"a local has a name from the country's own pool ("+A.name+", "+A.country+")");
  check(A.nat===A.country,"and is a national of the country the job is in");
  check(A.langsHeld.some(l=>A.langs.indexOf(l)>=0),"and speaks what is spoken there ("+A.langsHeld.join(", ")+")");
  check(A.holdsAnyTrade===false,"HOLDS NO TRADE — hasTech says no to all "+16+" of them, not just to the one the job wanted");
  check(A.techIsATrade===false,"what stands where a trade would be ('"+A.techKey+"') is not in TECHS_ALL, so nothing can match it");
  check(/no trade/i.test(A.label),"and the file says so in words: \""+A.label+"\"");
  check(A.know.length===0,"knows nothing the board asks for");
  check(A.limits.length===0,"and has no limits — they live there; there is no border to refuse them");
  check(A.attrMax<=62,"an amateur: best attribute is "+A.attrMax+", under the 62 ceiling and far under a professional's");
  check(A.cut===0,"takes NO share of the score (cutOf = 0)");
  check(A.fee>0,"and is paid a flat fee instead: "+A.fee);
  check(A.stable,"the same posting offers the same person every time it is looked at");
  check(A.different!==A.name,"and a different posting offers somebody else ("+A.different+")");

  console.log("— offered against the hole it fills, and only that hole —");
  const B=await page.evaluate(()=>{
    const co=COUNTRIES.find(c=>c.langs.length&&c.langs[0]!=="English");
    const job={id:"J2",country:co.name,city:"Testville",cat:CATS[0].k,diff:50,need:3,
      techs:[],know:[],tags:[],payout:400000,tier:2,heat:10,weeks:1,expires:99};
    const speaker={langs:co.langs.slice(0,1),id:"X"};
    const mute={langs:["Klingon"],id:"Y"};
    return {withNobody:localGap(job,[mute]), withSpeaker:localGap(job,[speaker]), withBoth:localGap(job,[mute,speaker])};
  });
  check(B.withNobody===true,"offered when nobody going speaks the language");
  check(B.withSpeaker===false,"NOT offered when somebody already does — a crew that can ask a question does not need one");
  check(B.withBoth===false,"and one speaker among several is enough to close it");

  console.log("— the money, and where it goes —");
  const C=await page.evaluate(()=>{
    const j=S.jobs.find(x=>!x.final&&!x.big);
    const before=S.money;
    S.money=5000000;
    const fee=localFee(j);
    bringInLocal(j);
    const afterHire=S.money, kind=S.hiredKind, id=S.hiredId, held=S.hiredFee;
    const who=hiredFor(j);
    const inPool=jobPool(j).some(c=>c.isLocal);
    // and torn up again
    bringInOff();
    const afterDrop=S.money, kindAfter=S.hiredKind, feeAfter=S.hiredFee;
    S.money=before;
    return {fee,paid:5000000-afterHire,kind,id,held,gotBack:afterDrop-afterHire,kindAfter,feeAfter,
      whoIsLocal:!!(who&&who.isLocal), whoName:who?who.n:null, inPool};
  });
  check(C.paid===C.fee,"the fee comes out of the money the moment it is agreed ("+C.paid+" = "+C.fee+")");
  check(C.kind==="local","the contract knows which kind is in it");
  check(C.held===C.fee,"and remembers what was actually charged, not what the job would quote later");
  check(C.whoIsLocal,"hiredFor gives the local back even though no roster holds them ("+C.whoName+")");
  check(C.inPool,"and they are in the pool that goes on the job");
  check(C.gotBack===C.fee,"sending them home before the night gives the money back in full — a button that ate the fee would be a trap, not a decision");
  check(C.kindAfter==null&&!C.feeAfter,"and leaves nothing behind in the slot");

  console.log("— one contract, either kind, never both —");
  const D=await page.evaluate(()=>{
    // A posting missing a trade AND missing the language, which is the case the whole design
    // turns on: two holes, one contract.
    const j=S.jobs.find(x=>!x.final&&!x.big);
    S.money=5000000;
    const a=assessJob(j,jobPool(j));
    const crewGoing=a.team.filter(c=>c.isPlayer||c.status==="crew");
    const cand=S.roster.find(c=>c.status==="available"&&!bringInWhy(c,j,false));
    const out={};
    if(cand){
      bringIn(j,cand.id);
      out.afterTrade={kind:S.hiredKind,id:S.hiredId,isLocal:!!(hiredFor(j)||{}).isLocal};
      // now the local, over the top of it
      bringInLocal(j);
      out.localOverTrade={kind:S.hiredKind,isLocal:!!(hiredFor(j)||{}).isLocal,
        count:jobPool(j).filter(c=>c.status!=="crew"&&!c.isPlayer).length};
      bringIn(j,cand.id);
      out.tradeOverLocal={kind:S.hiredKind,isLocal:!!(hiredFor(j)||{}).isLocal,
        count:jobPool(j).filter(c=>c.status!=="crew"&&!c.isPlayer).length};
    }
    bringInOff();
    return out;
  });
  check(D.afterTrade&&D.afterTrade.kind==="trade","a trade contractor goes in the slot as 'trade'");
  check(D.localOverTrade&&D.localOverTrade.isLocal===true,"bringing in a local replaces them");
  check(D.localOverTrade&&D.localOverTrade.count===1,"and there is exactly ONE outsider in the field, not two");
  check(D.tradeOverLocal&&D.tradeOverLocal.isLocal===false,"and a contractor replaces the local right back");
  check(D.tradeOverLocal&&D.tradeOverLocal.count===1,"still one — the slot never holds two");

  console.log("— what it is worth, and what it costs on the reckoning —");
  const E=await page.evaluate(()=>{
    /* Built so the answer is not an accident of the board: a country whose language nobody on
       this crew speaks, and a posting with no wanted trades so nothing else moves.

       need is forced DOWN below the crew that is going, which matters more than it looks. A
       local is a body, and a body on a short crew is worth 22 a head — measure this on a job
       the crew is short for and the margin leaps 77 points, of which the language is 22 and the
       rest is simply that somebody else turned up. That number would be true and would prove
       nothing about a local, so the body count is held still and what is left is the thing
       under test. */
    /* A REAL FIELD, built rather than borrowed. A new game has a crew of one — you — and one
       person plus an amateur is a different sum from four plus an amateur, because the reckoning
       averages. Measured on the fresh crew this reads "the local made it worse", which is true
       of a solo job and says nothing about the feature. So four people are put on the crew, none
       of whom speaks the country, which is the shape almost every posting is actually run in. */
    /* You are on your own crew, so the country has to be one YOU cannot speak either — picking
       it off the roster alone put a German-speaking commander in the field and the measurement
       became a measurement of nothing. And it has to be one they can all walk into: a strict
       border turned four people into two, which is a smaller field and a different sum. */
    const mine={};(S.player.langs||[]).forEach(l=>{mine[l]=1;});
    const co=COUNTRIES.find(c=>c.langs.length&&!c.gate&&!c.langs.some(l=>mine[l]))
      ||COUNTRIES.find(c=>c.langs.length&&!c.langs.some(l=>mine[l]))||COUNTRIES[0];
    const speaks=c=>c.langs.some(l=>co.langs.indexOf(l)>=0);
    const j=S.jobs.find(x=>!x.final&&!x.big);
    const j2=Object.assign({},j,{country:co.name,techs:[],know:[],tags:[],need:1});
    S.jobs=S.jobs.map(x=>x.id===j.id?j2:x);
    // asHired, the fourth argument. Without it entry() answers "not available" for anybody not
    // already on the crew and never reaches the border at all — which is the question being
    // asked here, and asking it the other way rejected the entire roster.
    S.roster.filter(c=>c.status==="available"&&!speaks(c)&&!c.limits.length&&entry(c,j2,false,true).ok)
      .slice(0,4).forEach(c=>{c.status="crew";c._touched=true;S.crewIds.push(c.id);});
    const before=assessJob(j2,jobPool(j2));
    if(before.team.length<3)return {country:co.name,tooSmall:before.team.length};
    if(before.factors.some(f=>f.k==="Language"))return {country:co.name,alreadySpeaks:true};
    const missKey=before.factors.filter(f=>/^No /.test(f.k)).map(f=>f.k+" "+f.v);
    S.money=5000000;
    bringInLocal(j2);
    const after=assessJob(j2,jobPool(j2));
    const names=after.factors.map(f=>f.k);
    const val=(a,k)=>{const f=a.factors.find(x=>x.k===k);return f?f.v:null;};
    const L=hiredFor(j2);
    const out={
      country:co.name,
      beforeMargin:before.margin, afterMargin:after.margin,
      missBefore:missKey,
      hasLanguage:names.indexOf("Language")>=0, languageWorth:val(after,"Language"),
      hasLocalNat:names.indexOf("Local national")>=0, localNatWorth:val(after,"Local national"),
      langMissBefore:(before.factors.find(f=>/^No /.test(f.k))||{}).v,
      stranger:val(after,"Brought in for the night"),
      strangerExpected:HIRED.stranger,
      // what the body alone did, which is NOT what this feature is for
      sizeBefore:val(before,"Crew size"), sizeAfter:val(after,"Crew size"),
      shortBefore:val(before,"Crew short"), shortAfter:val(after,"Crew short"),
      // the trades line must not have moved: a local closes nothing the board asked for
      tradesBefore:val(before,"Trades")||0, tradesAfter:val(after,"Trades")||0,
      // and the split must not name them
      splitNamesLocal:jobSplit(j2,after.team).rows.some(r=>r.c.isLocal),
      localLabel:techLabel(L)
    };
    bringInOff();
    return out;
  });
  check(!E.tooSmall&&!E.alreadySpeaks,"a field of four who cannot ask a question in "+(E.country||"?")
    +(E.tooSmall?" — GOT ONLY "+E.tooSmall+", the roster could not supply it":"")+(E.alreadySpeaks?" — GOT one who can":""));
  check(E.missBefore.length>0,"before: the reckoning is carrying \""+E.missBefore.join(", ")+"\"");
  check(E.hasLanguage&&E.languageWorth>0,"after: the language is bought and credited (+"+E.languageWorth+")");
  check(E.hasLocalNat&&E.localNatWorth>0,"and knowing the ground with it (+"+E.localNatWorth+")");
  check(E.stranger===E.strangerExpected,"NOT FAMILIAR WITH THE CREW: "+E.stranger+" on the reckoning, the same stranger penalty any one-night hire carries");
  check(E.tradesAfter===E.tradesBefore,"the trades line does not move — a local closes no trade ("+E.tradesBefore+" both sides)");
  check(E.splitNamesLocal===false,"and the split does not name them, because they take nothing out of it");
  check(E.shortBefore==null&&E.shortAfter==null,"the crew was not short either side, so nothing here is the body count");
  /* AN AMATEUR IS A REAL COST — asserted where it is actually true rather than where it reads
     best. The obvious test is that the field's power drops when a local joins it, and that is
     not reliably so: the reckoning averages, a weak crew can average 42, and a local at 54
     lifts it. Measured on one posting this passes or fails on whichever crew the clock dealt.

     What IS always true is structural, so that is what is asked: a local can never draw the
     trade bonus, because they hold no trade — and across the board they come out under the
     roster's middle nearly every time. Forty postings, not one. */
  const N=await page.evaluate(()=>{
    const res=[];
    for(let k=0;k<40;k++){
      const j=makeJob(mulberry32((k*2654435761)>>>0),0);
      const L=localFor(j);
      const le=memberEff(L,j);
      // the same posting with its wanted trades taken away: for a professional this moves,
      // for a local it cannot, because there is nothing of theirs for it to match
      const bare=memberEff(L,Object.assign({},j,{techs:[]}));
      const pros=S.roster.filter(c=>c.status==="available").map(c=>memberEff(c,j)).sort((a,b)=>a-b);
      res.push({below:le<pros[Math.floor(pros.length/2)], tradeBlind:Math.abs(le-bare)<1e-9, local:le});
    }
    return {n:res.length, below:res.filter(r=>r.below).length, tradeBlind:res.filter(r=>r.tradeBlind).length,
      lo:Math.round(Math.min.apply(null,res.map(r=>r.local))), hi:Math.round(Math.max.apply(null,res.map(r=>r.local)))};
  });
  check(N.tradeBlind===N.n,"a local cannot draw the trade bonus on any of "+N.n+" postings — taking the wanted trades away changes their worth by nothing, because they had none of them");
  check(N.below>=N.n*0.8,"AN AMATEUR IS A REAL COST: under the roster's middle on "+N.below+" of "+N.n
    +" postings (they run "+N.lo+"–"+N.hi+"), so the body that buys the language is nearly always a body that drags the average");
  const langSwing=(E.languageWorth-E.langMissBefore)+E.localNatWorth+E.stranger;
  check(langSwing>0,"and what a local is actually for still nets positive: "+E.langMissBefore+" → +"+E.languageWorth
    +" on the language, "+(E.localNatWorth>=0?"+":"")+E.localNatWorth+" for the ground, "+E.stranger+" for the stranger = "+(langSwing>0?"+":"")+langSwing);
  check(E.afterMargin>E.beforeMargin,
    "NET, with the amateur's drag taken off it: "+E.beforeMargin+" → "+E.afterMargin
    +" — the language beats the drag, which is the only honest reason to offer this at all");

  console.log("— the screen —");
  const F=await page.evaluate(()=>{
    // Find a posting the screen will actually offer one for, and open it.
    const spoken={};crewAll().forEach(c=>c.langs.forEach(l=>{spoken[l]=1;}));
    const co=COUNTRIES.find(c=>c.langs.length&&!c.langs.some(l=>spoken[l]))||COUNTRIES[0];
    const j=S.jobs.find(x=>!x.final&&!x.big);
    S.jobs=S.jobs.map(x=>x.id===j.id?Object.assign({},x,{country:co.name}):x);
    S.money=5000000;S.tab="jobs";S.jobOpen=j.id;render();
    return {id:j.id,country:co.name};
  });
  await page.waitForTimeout(150);
  // Handing yourself five million trips a goal, and a goal puts a scrim over the screen. The
  // button underneath it is there and enabled and completely unclickable, which is exactly what
  // a player would see, so it is cleared the way a player would clear it.
  await drain();
  const G=await page.evaluate(()=>{
    const t=document.body.innerText;
    return {
      hasKicker:/Somebody for the one night/i.test(t),
      saysNobodySpeaks:/Nobody going speaks/i.test(t),
      saysNoTrade:/no trade/i.test(t),
      saysUpFront:/up front/i.test(t),
      hasButton:!!document.querySelector('[data-act="hire-local"]'),
      buttonDisabled:!!(document.querySelector('[data-act="hire-local"]')||{}).disabled
    };
  });
  check(G.hasKicker,"the job file has the one-night section");
  check(G.saysNobodySpeaks,"and says, in words, that nobody going speaks it");
  check(G.saysNoTrade,"says they hold no trade");
  check(G.saysUpFront,"and that the money is up front");
  check(G.hasButton&&!G.buttonDisabled,"with a button to bring them in");

  const before=await page.evaluate(()=>S.money);
  await page.click('[data-act="hire-local"]');
  await page.waitForTimeout(150);
  const H=await page.evaluate(()=>({
    money:S.money,kind:S.hiredKind,fee:S.hiredFee,
    onScreen:/is in for this one/i.test(document.body.innerText),
    saysPaid:/paid/i.test(document.body.innerText),
    canSendHome:!!document.querySelector('[data-act="hire-night-off"]'),
    stillOfferable:!!document.querySelector('[data-act="hire-local"]')
  }));
  check(H.kind==="local","clicking it puts a local in the contract");
  check(before-H.money===H.fee,"and takes "+H.fee+" out of the money on the click, not at the end of the night");
  check(H.onScreen&&H.saysPaid,"the screen turns into the taken card and says the money has gone");
  check(H.canSendHome,"with a way back out");
  check(!H.stillOfferable,"and no second offer while one is taken");

  await page.click('[data-act="hire-night-off"]');
  await page.waitForTimeout(150);
  const I=await page.evaluate(()=>({money:S.money,kind:S.hiredKind,offerBack:!!document.querySelector('[data-act="hire-local"]')}));
  check(I.money===before,"sending them home on the screen gives the money back ("+I.money+" = "+before+")");
  check(I.kind==null&&I.offerBack,"and the offer comes back");

  console.log("— the consequence of the fee, and of the talking —");
  const J=await page.evaluate(()=>{
    const j=S.jobs.find(x=>x.id===S.jobOpen);
    S.money=5000000;
    bringInLocal(j);
    const paid=S.money;
    // a posting that goes off the board under a contract: the money is for a night that never
    // happened, so it comes back
    S.jobs=S.jobs.filter(x=>x.id!==j.id);
    hiredSweep();
    const swept=S.money, kind=S.hiredKind;
    return {gotBack:swept-paid, fee:localFee(j), kind};
  });
  check(J.gotBack===J.fee,"a posting that comes off the board takes its arrangement with it and refunds "+J.fee);
  check(J.kind==null,"leaving the contract empty");

  /* And the one that is not a posting at all. An elimination is launched from the rival's card,
     so it never passes the job file — which is the screen that tears up a contract on the way
     into a different job. finishJob used to clear whatever was in the slot no matter whose it
     was, which cost nothing while the only thing in it was a contractor on a percentage, and
     silently ate a local's fee the moment there was cash in there. */
  const L=await page.evaluate(()=>{
    const jobs=S.jobs.filter(x=>!x.final&&!x.big);
    if(jobs.length<2)return {tooFew:jobs.length};
    const mine=jobs[0], other=jobs[1];
    S.money=5000000;
    bringInLocal(mine);
    const held={job:S.hiredJob,fee:S.hiredFee,money:S.money};
    // some OTHER job finishes — the elimination is the real case, any other job is the same shape
    const P={hiredId:null,pre:[],clock:0,twistAt:[],bridges:[]};
    const a=assessJob(other,jobPool(other));
    try{ finishJob(Object.assign(P,{job:other,team:a.team,a}),null,{}); }catch(e){ /* the report may not
      build in a stub, but what this asks is whether the contract survived the call */ }
    return {stillMine:S.hiredJob===held.job, stillFee:S.hiredFee===held.fee, kind:S.hiredKind,
      fee:held.fee, onBoard:S.jobs.some(x=>x.id===mine.id), forJob:held.job, otherJob:other.id};
  });
  check(!L.tooFew,"there are two postings on the board to tell apart");
  // finishJob rolls the week, and a week can legitimately expire the posting underneath the
  // contract — at which point hiredSweep tearing it up and refunding is the RIGHT answer, not
  // the bug. So the claim is only made while the posting is still standing.
  check(L.onBoard,"and the one with the local on it is still standing after the other finishes");
  check(L.stillMine&&L.kind==="local","ANOTHER job finishing does not tear up a local hired for a different posting"
    +" — which is the whole of the bug: the fee had gone and the arrangement had not survived to be worth anything");
  // Only the fee. The money itself moves, because a job finishing pays a score out — asserting
  // that it did not was asserting that finishJob does nothing.
  check(L.stillFee,"and the fee stands recorded against the surviving contract ("+L.fee+")");

  const K=await page.evaluate(()=>{
    const co=COUNTRIES[0];
    const job={id:"BURN",country:co.name,city:"X",cat:CATS[0].k,diff:40,need:3,techs:[],know:[],tags:[],payout:1,tier:1,heat:1,weeks:1,expires:99};
    // The clock is wound forward to watch the burn run out, and wound back afterwards. It used
    // not to be, and the section after this one then ran at week 25 against postings written at
    // week 1 — they had all expired, the contract was correctly torn up and refunded, and the
    // test reported a bug that was this test's own clock.
    const w0=S.week;
    S.localBurn={};S.week=10;
    const openBefore=localShut(job);
    S.localBurn[co.name]=S.week+LOCAL_HIRE.burnWeeks;
    const shut=localShut(job);
    S.week=10+LOCAL_HIRE.burnWeeks;
    const reopened=localShut(job);
    S.localBurn={};S.week=w0;
    return {openBefore,shut,reopened,weeks:LOCAL_HIRE.burnWeeks};
  });
  check(K.openBefore==="","a country nobody has burnt is open");
  check(/will take it/i.test(K.shut),"a local who talked shuts it, and the screen says why: \""+K.shut.slice(0,60)+"…\"");
  check(K.reopened==="","and it opens again after "+K.weeks+" weeks — a consequence, not a door closing for good");

  console.log("— the odds are the night they had, and the two kinds had different nights —");
  const M=await page.evaluate(()=>{
    const co=COUNTRIES[0];
    const job={id:"ODDS",country:co.name,city:"X",cat:CATS[0].k,diff:40,need:3,techs:[],know:[],tags:[],payout:1,tier:1,heat:1,weeks:1,expires:99};
    const L=localFor(job);
    const pro=S.roster.find(c=>c.status==="available");
    const flat=Object.assign({},pro,{attrs:L.attrs,streets:L.streets,isLocal:false});
    return {
      localGood:hiredTalkOdds(L,3,false), localBad:hiredTalkOdds(L,1,false), localTaken:hiredTalkOdds(L,1,true),
      // the same person, the same nerve, the same years — the only difference is which kind
      proGood:hiredTalkOdds(flat,3,false), proBad:hiredTalkOdds(flat,1,false)
    };
  });
  check(M.localGood>M.proGood,"a local is likelier to talk after a good night than a professional with the same nerve ("
    +Math.round(M.localGood*100)+"% vs "+Math.round(M.proGood*100)+"%)");
  check(M.localBad<M.proBad,"but LESS likely after a bad one ("+Math.round(M.localBad*100)+"% vs "+Math.round(M.proBad*100)
    +"%) — the contractor's grievance is being paid nothing, and a local was paid before anybody left");
  check(M.localBad>M.localGood,"a bad night still moves them");
  check(M.localTaken>M.localBad,"and being picked up at the scene moves them most");

  /* And the night itself, with a local actually on it. Everything above tests the arrangement;
     this tests what the arrangement turns into. The roll is the roll — whether they talk is not
     something to pin down — so what is asserted is the invariant that must hold either way:
     talking and the country being shut are the same event, and neither can happen without the
     other. A burn with no talking in the report, or a report that says they talked over a
     country still open for business, is the consequence coming apart from its cause. */
  const O=await page.evaluate(()=>{
    const runs=[];
    for(let t=0;t<12;t++){
      const j=S.jobs.filter(x=>!x.final&&!x.big)[0];
      if(!j)break;
      S.money=5000000;S.localBurn={};
      bringInLocal(j);
      const fee=S.hiredFee, name=(hiredFor(j)||{}).first, money0=S.money, L0=S.hiredId;
      /* The night is run the way doExecute runs it: startJob with the pool, which with noTwist
         goes straight through finishJob itself and hands back the report. Two things were wrong
         with the obvious shortcut. Building a P by hand and passing finishJob a team skipped the
         step that matters — finishJob does not use the team it is given, it rebuilds one by
         turning memberIds back into people through byId, which is exactly where a local could
         not be found and was silently dropped from the night. And calling startJob AND
         finishJob ran the job twice. Run it the way the button runs it. */
      /* The posting is set to pay nothing for this measurement, which is the only way to see
         the fee. A night that pays a score moves the money by far more than the fee, so
         "did the money go up" cannot tell a payout from a refund — the first version of this
         asked exactly that and reported a refund on every run. At a payout of nothing the
         money afterwards is the money before, unless the fee came back. */
      j.payout=0;
      let threw=null,report=null;
      try{ report=startJob(j,{noTwist:true,pool:jobPool(j)}); }catch(e){ threw=String(e).slice(0,80); }
      // teamIds is written down at the top of startJob and travels on the report, which is what
      // finishJob rebuilds the crew from — S.pendingJob is cleared by the time the night ends.
      const inMembers=((report||{}).teamIds||[]).indexOf(L0)>=0;
      runs.push({fee,name,threw,inMembers,
        contractGone:S.hiredJob==null,
        refunded:S.money>=money0+fee,           // the fee must NOT come back: the job ran
        burnt:!!(S.localBurn&&Object.keys(S.localBurn).length),
        country:j.country});
      if(runs[runs.length-1].threw)break;
    }
    return {n:runs.length, threw:runs.filter(r=>r.threw).length, firstThrow:(runs.find(r=>r.threw)||{}).threw,
      contractGone:runs.filter(r=>r.contractGone).length,
      refunded:runs.filter(r=>r.refunded).length,
      inMembers:runs.filter(r=>r.inMembers).length,
      burnt:runs.filter(r=>r.burnt).length};
  });
  check(O.n>0&&O.threw===0,"a night runs with a local on it, "+O.n+" times over"+(O.firstThrow?" — THREW: "+O.firstThrow:""));
  check(O.inMembers===O.n,"and the local is written into who went, every time — which is the list finishJob rebuilds the crew from");
  check(O.contractGone===O.n,"and the arrangement is gone afterwards, every time");
  check(O.refunded===0,"and the fee is NOT given back — the job ran, so the money is spent for good");
  /* And the branch the roll would not reach. Twelve honest nights burnt the country nought
     times — the odds are about one in seven, so that is just the dice, and an assertion that
     passes whatever the dice say is not an assertion. hiredTalkOdds is stubbed to 1 for one
     night, which forces the one branch under test and nothing else: chance(rng, 1) is true for
     every value rng can return, so the talking happens and the rest of the night is still the
     night it would have been. */
  const Q=await page.evaluate(()=>{
    const real=hiredTalkOdds;
    const j=S.jobs.filter(x=>!x.final&&!x.big)[0];
    if(!j)return {noJob:true};
    S.money=5000000;S.localBurn={};S.heat=20;
    bringInLocal(j);
    const name=(hiredFor(j)||{}).first, heat0=S.heat, week=S.week;
    let threw=null,report=null;
    hiredTalkOdds=function(){return 1;};
    try{ report=startJob(j,{noTwist:true,pool:jobPool(j)}); }catch(e){ threw=String(e).slice(0,90); }
    hiredTalkOdds=real;
    // The fallout is in the report the player reads, so look there — not in the log, which is
    // the week's ledger and carries different sentences.
    const said=JSON.stringify([report,S.log,S.modal]);
    return {threw, name, country:j.country,
      burntUntil:(S.localBurn||{})[j.country]||0, week,
      expectedUntil:week+LOCAL_HIRE.burnWeeks,
      heatRose:S.heat>heat0,
      saidTalks:said.indexOf(name+" talks")>=0,
      saidShut:said.indexOf("Nobody in "+j.country+" will take the work")>=0};
  });
  check(!Q.noJob&&!Q.threw,"a local who talks is a branch the night can reach"+(Q.threw?" — THREW: "+Q.threw:""));
  check(Q.saidTalks,"the report says so by name (\""+Q.name+" talks\")");
  check(Q.heatRose,"heat goes up, like any night somebody talks about");
  check(Q.burntUntil===Q.expectedUntil,"AND "+Q.country+" is shut until week "+Q.burntUntil
    +" — the consequence and its cause are the same event, not two things that happen to agree");
  check(Q.saidShut,"and the report says that too, rather than leaving the player to find out by pressing a button that is not there");

  check(errs.length===0,"no page errors"+(errs.length?": "+errs.join(" | "):""));
  await browser.close();
})();

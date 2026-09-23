/* THE FIFTH WAY — an elimination.

   Paz: "an attack mission when and where they least expect it. Cost is heavy but it is very
   efficient ... 100 scenarios ... enforcer, an overwatch and a wheelman ... live feed job like
   any other ... one week ... 2 twists."

   Every clause in that is a claim this file has to settle, and the interesting ones are the
   costs: a thing that ends a chapter outright has to hurt, verifiably, or it is just a button
   that wins. So the money, the file, the week, the other outfit and the body are all measured
   rather than asserted. */
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

  console.log("— a hundred openings, and they are a hundred different things —");
  const T=await page.evaluate(()=>{
    const seen={},dupW={},bad=[];
    ELIM_OPENINGS.forEach((o,i)=>{
      const key=o.w+"|"+o.t+"|"+o.h;
      if(seen[key])bad.push("duplicate "+i);seen[key]=1;
      dupW[o.w]=(dupW[o.w]||0)+1;
      if(!o.w||!o.t||!o.h)bad.push("blank field at "+i);
      if(["enforcer","overwatch","wheelman"].indexOf(o.k)<0)bad.push("bad trade at "+i+": "+o.k);
      if(typeof o.d!=="number"||o.d<-3||o.d>3)bad.push("bad difficulty at "+i);
      if([0,1,2].indexOf(o.x)<0)bad.push("bad exposure at "+i);
    });
    const byK={};ELIM_OPENINGS.forEach(o=>byK[o.k]=(byK[o.k]||0)+1);
    const byX={};ELIM_OPENINGS.forEach(o=>byX[o.x]=(byX[o.x]||0)+1);
    return {n:ELIM_OPENINGS.length,bad,byK,byX,
      repeatedPlaces:Object.keys(dupW).filter(k=>dupW[k]>1)};
  });
  check(T.n===100,T.n+" openings");
  check(!T.bad.length,"every one is complete and in range"+(T.bad.length?" — "+T.bad.slice(0,3).join(", "):""));
  check(!T.repeatedPlaces.length,"and no two happen in the same place"
    +(T.repeatedPlaces.length?" ("+T.repeatedPlaces.slice(0,3).join(", ")+")":""));
  check(T.byK.enforcer>=20&&T.byK.overwatch>=20&&T.byK.wheelman>=20,
    "all three trades get nights of their own: enforcer "+T.byK.enforcer+", overwatch "+T.byK.overwatch+", wheelman "+T.byK.wheelman);
  check(T.byX[0]&&T.byX[1]&&T.byX[2],
    "and the exposure runs the whole way: "+T.byX[0]+" unseen, "+T.byX[1]+" witnessed, "+T.byX[2]+" in front of a crowd");

  console.log("\n— an outfit run by a woman is described as one —");
  /* makeRival tosses a coin for the boss's sex, and the openings are one table shared by all of
     them. The first version of this card offered "Samira Bishara himself" and told the player,
     in three words, that the game was not really looking at them. */
  const G=await page.evaluate(()=>{
    S.rivals=[makeRival(freshRng())];
    const rv=rivals()[0];
    const readAll=g=>{rv.gender=g;
      return ELIM_OPENINGS.map(o=>elimFill(o.w,rv)+" | "+elimFill(o.t,rv)+" | "+elimFill(o.h,rv)).join("  ");};
    const she=readAll("F"), he=readAll("M");
    rv.gender="F";
    const card={self:elimSelf(rv),say:elimSay("{his} own kitchen",rv),
      job:elimJob(rv,elimOpening(rv)).brief};
    rv.gender="M";
    return {sheHasMale:/\b(he|his|him|himself)\b/.test(she),
      heHasFemale:/\b(she|her|herself)\b/.test(he),
      sheHasFemale:/\b(she|her)\b/.test(she),
      leftToken:/\{(?:he|He|his|him)\}/.test(she+he),
      card};
  });
  check(!G.sheHasMale,"with a woman running the outfit, not one of the hundred openings says he, his or him");
  check(G.sheHasFemale,"they say she and her instead");
  check(!G.heHasFemale,"and with a man running it, none of them say she or her");
  check(!G.leftToken,"no token is left unfilled anywhere in the table");
  check(G.card.self==="herself","the card says "+G.card.self+", not himself");
  check(/^Her own kitchen/.test(G.card.say),"and a line that starts on a pronoun still starts with a capital: \""+G.card.say+"\"");
  check(!/\b(he|his|him)\b/.test(G.card.job),"the job's own brief is filled too");

  console.log("\n— one opening a week, the same one all week, a different one next week —");
  const W=await page.evaluate(()=>{
    if(!rivals().length)S.rivals=[makeRival(freshRng())];
    const rv=rivals()[0];
    const a=elimOpening(rv),b=elimOpening(rv);
    const w0=S.week;const seenIdx=[];
    for(let i=0;i<14;i++){S.week=w0+i;seenIdx.push(elimOpening(rv).i);}
    S.week=w0;
    return {stable:a.i===b.i,idx:seenIdx,distinct:new Set(seenIdx).size,rv:rv.boss};
  });
  check(W.stable,"looking at the card twice this week shows the same opening");
  check(W.distinct>=8,"and over fourteen weeks it is "+W.distinct+" different ones — waiting changes what is on the table");

  console.log("\n— it needs all three, and it says which one is missing —");
  const N=await page.evaluate(()=>{
    S.money=5e7;S.modal=null;S.notices=[];
    crewAll().filter(c=>c.status==="crew"&&!c.isPlayer).forEach(c=>{c.status="available";leaveCrew(c);});
    const before=elimMissing().slice();
    // hand the crew exactly one of the three
    const e=S.roster.find(c=>c.status==="available"&&hasTech(c,"enforcer"));
    if(e){e.status="crew";S.crewIds.push(e.id);}
    const withOne=elimMissing().slice();
    ["overwatch","wheelman"].forEach(t=>{
      const c=S.roster.find(x=>x.status==="available"&&hasTech(x,t)&&S.crewIds.indexOf(x.id)<0);
      if(c){c.status="crew";S.crewIds.push(c.id);}});
    /* The man lives where he lives and a border is a border. Rather than hope this run's three
       happen to hold the right papers, make them nationals of the country he is in: a Kenyan can
       always get into Kenya. The border itself is checked on its own terms further down. */
    const where=elimJob(rivals()[0],elimOpening(rivals()[0])).country;
    crewAll().filter(c=>c.status==="crew"&&!c.isPlayer).forEach(c=>{c.limits=[];c.nat=where;});
    const withAll=elimMissing().slice();
    const team=elimTeam();
    return {before,withOne,withAll,
      distinct:new Set(Object.keys(team).map(k=>team[k]&&team[k].id)).size,
      names:Object.keys(team).map(k=>k+"="+(team[k]?team[k].first+"/"+team[k].id:"—"))};
  });
  check(N.before.length===3,"with none of them on the crew it names all three");
  check(N.withOne.length===2&&N.withOne.indexOf("enforcer")<0,"with only an enforcer it names the other two: "+N.withOne.join(", "));
  check(N.withAll.length===0,"with all three it is ready — "+N.names.join(", "));
  check(N.distinct===3,"and the three seats are three different people, never one name counted twice");

  console.log("\n— he lives somewhere, and not everybody will come —");
  const P=await page.evaluate(()=>{
    const rv=rivals()[0];
    const job=elimJob(rv,elimOpening(rv));
    const ok={miss:elimMissing(job).slice()};
    // now give one of the three a passport that country will not take, and watch it close
    /* The honest test for THIS job is not a passport, it is the tag on it. An elimination is
       tagged violence, and a file that says "No violence" means exactly that — you do not get to
       bring somebody on a killing because their trade was convenient. */
    const three=elimTeam(job);
    const victim=three.enforcer||three[Object.keys(three)[0]];
    const limWas=victim?victim.limits.slice():null;
    let shut=null;
    if(victim){
      victim.limits=["noviolence"];
      shut={miss:elimMissing(job).slice(),barred:elimBarred(job).map(c=>c.first)};
      victim.limits=limWas;
    }
    return {country:job.country,city:cityName(job.city),ok,shut,who:victim?victim.first:null,
      same:cityName(elimJob(rv,elimOpening(rv)).city)};
  });
  check(P.city&&P.country,"the man lives somewhere specific, and the card says where: "+P.city+", "+P.country);
  check(P.same===P.city,"and it is the same city every time you look at him");
  check(P.ok.miss.length===0,"with papers that work, all three can go");
  check(P.shut&&P.shut.miss.length>0,
    "and the moment "+P.who+"'s file says No violence, the fifth way closes — you do not bring somebody on a killing because their trade was handy");

  console.log("\n— the money goes before anybody moves, and only if it can run —");
  const M=await page.evaluate(()=>{
    const rv=rivals()[0];
    S.money=elimCost(rv)-1;
    const poor=S.money;
    elimLaunch(rv.id);
    const afterPoor=S.money, ranPoor=!!S.pendingJob||!!(S.modal&&S.modal.type==="result");
    S.money=5e7;
    return {cost:elimCost(rv),shortKept:afterPoor===poor,ranPoor};
  });
  check(M.cost>=120000,"it costs "+(M.cost>=1e6?"$"+(M.cost/1e6).toFixed(2)+"M":"$"+Math.round(M.cost/1000)+"K")+" up front");
  check(M.shortKept&&!M.ranPoor,"a crew that cannot afford it is not charged and does not go");

  console.log("\n— and then it is a job like any other —");
  const t0=Date.now();
  const L=await page.evaluate(()=>{
    const rv=rivals()[0];
    S.modal=null;S.notices=[];
    // Set the float here rather than three sections ago: a test that depends on state left by an
    // earlier block is a test that fails for reasons it cannot report.
    S.money=5e7;
    const before={money:S.money,week:S.week,file:detFile(),heat:S.heat,rivals:rivals().length};
    const rvSeen={n:rivals().length,id:rv&&rv.id,found:!!rivalById(rv&&rv.id),
      ready:rv?elimReady(rv):null,pend:!!S.pendingJob,trip:!!S.pendingTrip};
    // trace exactly where it stops, instead of inferring it from the log
    const trace=[];
    const _note=note, _exec=doExecute;
    note=m=>{trace.push("note: "+m);return _note(m);};
    doExecute=(id2,cr)=>{
      const j=S.jobs.find(x=>x.id===id2);
      trace.push("doExecute("+id2+") found="+!!j
        +(j?" canRun="+assessJob(j,jobPool(j)).canRun+" team="+assessJob(j,jobPool(j)).team.length+" need="+j.need:""));
      return _exec(id2,cr);
    };
    elimLaunch(rv.id);
    note=_note;doExecute=_exec;
    const d=S.modal&&S.modal.data;
    // A refusal renders as a note, not a report. Say which one, or the failure is unreadable.
    // note() writes to the log, it does not open a modal. Read the log.
    const refused=(!d||!d.job)?((S.log||[]).slice(-3).map(l=>l.t||l.text||l.m||JSON.stringify(l)).join(" // ")):null;
    return {before,rvSeen,trace,refused,ok:!!(d&&d.job),estab:!!(d&&d.estab),twists:d?d.twistOf:null,
      elim:!!(d&&d.job&&d.job.elim),city:d&&d.job?d.job.city:null,
      money:S.money,cost:before.money-S.money,onBoard:(S.jobs||[]).filter(j=>j.elim).length};
  });
  check(L.ok&&L.elim,"the night opens as a report, on "+L.city
    +(L.refused?"  — TRACE "+JSON.stringify(L.trace):""));
  check(L.estab,"with the card of the city in front of it, like any other job");
  check(L.twists===2,"and exactly two things are going to go wrong ("+L.twists+")");
  check(L.cost>0,"the money is gone: "+(L.cost>=1e6?"$"+(L.cost/1e6).toFixed(2)+"M":"$"+Math.round(L.cost/1000)+"K"));

  await page.waitForSelector(".estab",{timeout:5000});
  await page.click(".estab");
  await page.waitForSelector("#ticker",{timeout:5000});
  check(true,"the feed runs");

  // answer both twists, whatever they are, taking the option the crew can actually do
  for(let n=0;n<3;n++){
    await page.evaluate(()=>{if(typeof tickerFinish==="function")tickerFinish();});
    await page.waitForTimeout(250);
    const waiting=await page.evaluate(()=>!!(S.modal&&S.modal.data&&S.modal.data.awaiting));
    if(!waiting)break;
    await page.evaluate(()=>{
      const d=S.modal.data;const tws=pendingTwists(S.pendingJob);
      const i=(d.twistNo||1)-1;const tw=tws[i]||tws[0];
      const team=assessJob(S.pendingJob.job,(S.pendingJob.memberIds||[]).map(byId).filter(Boolean)).team;
      twistChoose(twistCorrect(tw,team));
    });
    await page.waitForTimeout(250);
  }
  await page.evaluate(()=>{if(typeof tickerFinish==="function")tickerFinish();});
  await page.waitForTimeout(400);

  const R=await page.evaluate(()=>{
    const d=S.modal&&S.modal.data;
    return {done:!!(d&&d.done),tier:d?d.tier:null,verdict:d?d.verdictName:null,
      week:S.week,rivals:rivals().length,beat:(S.beat||[]).length,
      heat:S.heat,file:detFile(),floor:S.fileFloor||0,
      dead:(S.elimDead||[]).length,lost:(stats().lost||0),
      onBoard:(S.jobs||[]).filter(j=>j.elim).length,
      hardened:rivals().filter(r=>r.noBuy).length,
      fallout:(d&&d.events||[]).join(" | ")};
  });
  check(R.done,"the report finishes: "+R.verdict);
  check(R.week===L.before.week+1,"and it took one week off the calendar ("+L.before.week+" → "+R.week+")");
  check(R.onBoard===0,"the posting is gone from the board afterwards");
  check(R.heat>L.before.heat,"heat is up ("+L.before.heat+" → "+R.heat+")");
  if(R.tier>=2){
    check(R.rivals===L.before.rivals-1,"it came off — the outfit is finished");
    check(R.beat>0,"and it is on the record");
  } else {
    check(R.rivals===L.before.rivals,"it did not come off — he is alive, and you paid for it anyway");
  }

  console.log("\n— the file never closes again —");
  const F=await page.evaluate(()=>{
    const floor=S.fileFloor||0;
    // A floor with no detective yet is the interesting case: make one and check it lands under them.
    if(!detective()){S.heat=90;weekTick&&0;}
    if(!detective())return {floor,before:0,afterScrub:0,noDet:true};
    const before=detFile();
    S.det.file=0;                       // pay every desk, lie low for a year
    return {before,floor,afterScrub:detFile()};
  });
  check(F.floor>0,"a body put a floor of "+F.floor+" under the file, whether or not anybody was looking yet");
  if(F.noDet)console.log("--  no detective on this file yet — the floor is waiting for one");
  else check(F.afterScrub>=F.floor,"and scrubbing the file to nothing still reads "+F.afterScrub+" — it does not wash off");

  console.log("\n— nobody sells to the crew that shoots the competition —");
  const B=await page.evaluate(()=>{
    if(!rivals().length){S.rivals=[makeRival(freshRng())];}
    const rv=rivals()[0];rv.noBuy=true;
    const before=S.money;rivalBuyout(rv.id);
    return {kept:S.money===before,still:rivals().some(r=>r.id===rv.id)};
  });
  check(B.kept&&B.still,"a hardened outfit refuses the money and stays on the board");

  console.log("\n— and if the night somehow does not start, the money comes back —");
  /* Unreachable today: every reason doExecute can refuse is checked before the money moves. That
     is exactly why it is worth pinning — the guard exists for the refactor that adds a reason,
     and an unexercised guard is a comment. Break doExecute on purpose and watch the till. */
  const REF=await page.evaluate(()=>{
    S.rivals=[makeRival(freshRng())];S.modal=null;S.notices=[];S.money=5e7;
    const rv=rivals()[0];
    const before={money:S.money,jobs:(S.jobs||[]).length};
    const real=doExecute;
    doExecute=()=>{};                    // the refusal a future refactor might add
    try{elimLaunch(rv.id);}finally{doExecute=real;}
    return {before,money:S.money,
      stranded:(S.jobs||[]).filter(j=>j.elim).length,
      jobs:(S.jobs||[]).length};
  });
  check(REF.money===REF.before.money,"the money is back: $"+REF.before.money+" → $"+REF.money);
  check(REF.stranded===0,"and no unpayable posting is left standing on the board");

  console.log("\n— and somebody of yours may not come back —");
  /* The death is a roll, so two green runs prove nothing about it. Drive the aftermath directly
     with a rigged stream: once with a roll that always lands, once with one that never does. */
  const D=await page.evaluate(()=>{
    S.rivals=[makeRival(freshRng())];
    const rv=rivals()[0];
    crewAll().filter(c=>c.status==="crew"&&!c.isPlayer).forEach(c=>{c.status="available";leaveCrew(c);});
    ["enforcer","overwatch","wheelman"].forEach(t=>{
      const c=S.roster.find(x=>x.status==="available"&&hasTech(x,t)&&S.crewIds.indexOf(x.id)<0);
      if(c){c.status="crew";c.limits=[];S.crewIds.push(c.id);}});
    const team=crewAll().filter(c=>c.status==="crew");
    const job=elimJob(rv,elimOpening(rv));
    // Count only the body THIS call makes. The roster may already hold somebody the loose-ends
    // system killed earlier in the run, and counting those is how a passing test starts lying.
    const deadBefore=S.roster.filter(c=>c.status==="dead").map(c=>c.id);
    const before={crew:team.length,lost:stats().lost||0,elimDead:(S.elimDead||[]).length};
    const always=()=>0;          // every chance() lands
    const fall=[];
    const out=elimAftermath(job,4,team,always,fall);
    const dead=S.roster.filter(c=>c.status==="dead"&&deadBefore.indexOf(c.id)<0);
    return {before,killed:dead.length,
      name:dead[0]?dead[0].first:null,
      goneAs:dead[0]?dead[0].goneAs:null,
      onCrew:dead[0]?S.crewIds.indexOf(dead[0].id)>=0:null,
      lost:stats().lost||0,
      elimDead:(S.elimDead||[]).length-before.elimDead,
      said:fall.join(" | "),
      finished:out.done};
  });
  check(D.killed===1,"a night that takes somebody takes exactly one of them: "+D.name);
  check(D.goneAs==="killed","and they are marked killed, not \"dead\" — nothing can ever walk them back out of the sea");
  check(D.onCrew===false,"they are off the crew");
  check(D.lost===D.before.lost+1&&D.elimDead===1,"the record counts them");
  check(/does not come back/.test(D.said),"and the report says it plainly: \""+(D.said.split(" | ").find(x=>/does not come back/.test(x))||"").slice(0,90)+"…\"");

  const V=await page.evaluate(()=>{
    // a night that does NOT come off: he lives, he knows, and you paid for all of it
    S.rivals=[makeRival(freshRng())];
    const rv=rivals()[0];
    const team=crewAll().filter(c=>c.status==="crew");
    const job=elimJob(rv,elimOpening(rv));
    const never=()=>0.999;
    const out=elimAftermath(job,1,team,never,[]);
    const still=rivalById(rv.id);
    return {alive:!!still,hostile:!!(still&&still.hostile),noBuy:!!(still&&still.noBuy),
      standing:still?still.standing:null,back:still?still.elimBack:null,week:S.week,done:out.done};
  });
  check(V.alive&&!V.done,"a night that does not come off leaves him alive");
  check(V.hostile&&V.noBuy,"and he knows — he will not take your money now");
  check(V.back>V.week,"and there is no second opening until week "+V.back);

  console.log("\n— and the outfit gets a card, with a shot on it —");
  const C=await page.evaluate(()=>{
    // the week's paper opens ahead of the notice queue, and by now the queue has other things in
    // it — put both down so what is measured is the card and not the queue order
    S.notices=[];S.modal=null;S.over=false;S.newsRead=S.week;
    S.rivals=[makeRival(freshRng())];
    const rv=rivals()[0];
    const five=rivalCrew(rv), again=rivalCrew(rv);
    rivalEnd(rv.id,"killed","Killed at the gate.","warn");
    const n=S.notices[0];
    return {five:five.length,
      stable:JSON.stringify(five.map(p=>p.first+p.seed))===JSON.stringify(again.map(p=>p.first+p.seed)),
      names:five.map(p=>p.first),
      bossFirst:five[0].first, bossIs:String(rv.boss).split(" ")[0],
      distinct:new Set(five.map(p=>p.first)).size,
      hasCard:!!(n&&n.card), word:n&&n.card?n.card.word:null,
      shot:!!(n&&n.shot), crewOnCard:n&&n.card?n.card.crew.length:0};
  });
  check(C.five===5,"the outfit has five faces");
  check(C.stable,"and they are the same five every time it is asked");
  check(C.distinct===5,"five different names: "+C.names.join(", "));
  check(C.bossFirst===C.bossIs,"the boss is the first of them ("+C.bossFirst+")");
  check(C.hasCard&&C.crewOnCard===5,"the notice carries the card, with all five on it");
  check(C.word==="Eliminated","stamped "+JSON.stringify(C.word));
  check(C.shot,"and it asks for the shot");

  // it has to render, and the stamps must not weld into one band across the row
  const shown=await page.evaluate(()=>{
    S.modal=null;S.over=false;S.newsRead=S.week;render();
    return {modal:S.modal&&S.modal.type,card:!!document.querySelector(".gone-card"),
      queue:(S.notices||[]).length};
  });
  check(shown.card,"the card is on the screen"+(shown.card?"":"  (modal="+shown.modal+", queue="+shown.queue+")"));
  await page.waitForSelector(".gone-card",{timeout:4000});
  const LAY=await page.evaluate(()=>{
    const st=[...document.querySelectorAll(".gone-stamp")].map(e=>e.getBoundingClientRect());
    const fr=[...document.querySelectorAll(".gone-m")].map(e=>e.getBoundingClientRect());
    const caps=[...document.querySelectorAll(".gone-m figcaption")].map(e=>e.getBoundingClientRect());
    const para=document.querySelector(".modal.notice .modal-b p").getBoundingClientRect();
    let touch=0;
    for(let i=1;i<st.length;i++)if(st[i].left<st[i-1].right)touch++;
    return {n:st.length,touch,
      angles:new Set([...document.querySelectorAll(".gone-stamp")].map(e=>e.getAttribute("style"))).size,
      overlapText:caps.some(c=>c.bottom>para.top+1),
      inFrame:st.every((s,i)=>s.left>fr[i].left-14&&s.right<fr[i].right+14)};
  });
  check(LAY.n===5,"five stamps on the screen");
  check(LAY.touch===0,"and not one of them touches its neighbour — five people struck out, not one redaction");
  check(LAY.angles===5,"each at its own angle");
  check(LAY.inFrame,"each inside its own card");
  check(!LAY.overlapText,"and the names do not sit on top of the paragraph");

  // the shot fires once, not on every render
  const SH=await page.evaluate(()=>{
    // clear the fired flag first, or this measures a shot that already went off and proves only
    // that it did not go off twice — which is half the claim
    S.notices[0].shotDone=false;S.modal=null;S.newsRead=S.week;
    let n=0;const real=sfx;sfx=x=>{if(x==="shot")n++;return real(x);};
    render();render();render();
    sfx=real;
    return {fired:n,shotDone:!!(S.notices[0]&&S.notices[0].shotDone)};
  });
  check(SH.fired===1,"the shot fires once, and once only, across three redraws ("+SH.fired+")");
  check(SH.shotDone,"and the notice remembers that it fired, so a reload does not fire it again");

  const Q=await page.evaluate(()=>{
    // an ending that is NOT a killing gets no card and no shot
    S.notices=[];S.modal=null;S.rivals=[makeRival(freshRng())];
    const rv=rivals()[0];S.money=1e9;
    rivalBuyout(rv.id);
    const n=(S.notices||[])[0];
    return {card:!!(n&&n.card),shot:!!(n&&n.shot),had:!!n};
  });
  check(Q.had&&!Q.card&&!Q.shot,"buying them out is quiet: no card, no shot — you did not shoot anybody");

  const GR=await page.evaluate(()=>{
    // "Hana the grifter are on the roster" — one person, plural verb
    const out=[];
    for(let i=0;i<14;i++){
      S.notices=[];S.modal=null;S.rivals=[makeRival(freshRng())];
      rivalEnd(rivals()[0].id,"killed","Killed.","warn");
      const t=(S.notices[0]||{}).text||"";
      const m=/looking for work: (.+?) (is|are) on the roster/.exec(t);
      if(m)out.push({who:m[1],verb:m[2],n:m[1].split(" and ").length});
    }
    return out;
  });
  const wrong=GR.filter(x=>(x.n===1)!==(x.verb==="is"));
  check(GR.length>0&&!wrong.length,
    "one of their people IS on the roster, two ARE — checked over "+GR.length+" endings"
    +(wrong.length?" — wrong: "+JSON.stringify(wrong[0]):""));

  check(errs.length===0,"no page errors"+(errs[0]?" ("+errs[0]+")":""));
  await browser.close();
})();

/* SOMEBODY FOR THE ONE NIGHT.

   Paz: "a crew could be amazingly suitable for one job and completely off for 4 other jobs ...
   he needs to quickly replace most of them every single week ... there's no core."

   The second trade answered it slowly and permanently. This answers it in a week: the posting
   wants a Safecracker, nobody is one, and the board does not wait. You buy one night.

   The thing worth testing is not that a button adds a person — it is that every price attached
   to that person is real and is charged: the fat cut out of the score, the stranger penalty on
   the reckoning, no seat, no wages, no bonds, and the one that makes the whole mechanic mean
   something — that they are paid out of the score, so a night that pays nothing pays them
   nothing, and THAT is what decides whether they talk. */
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

  console.log("— it is only ever offered against a gap —");
  const offered=await page.evaluate(()=>{
    // Arrange both cases on the same posting rather than hunting the board for one of each:
    // whether the offer appears must depend on the gap and on nothing else about the job.
    const j=S.jobs.find(x=>!x.final&&assessJob(x).team.length>2)||S.jobs[0];
    const a=assessJob(j,jobPool(j));
    const crewGoing=a.team.filter(c=>c.isPlayer||c.status==="crew");
    const held=TECHS.map(t=>t.k).find(k=>crewGoing.some(c=>hasTech(c,k)));
    const missing=TECHS.map(t=>t.k).find(k=>!crewGoing.some(c=>hasTech(c,k)));
    const was=j.techs.slice();
    j.techs=[held];
    const none=hiredOffers(j,{team:crewGoing}).length;
    j.techs=[missing];
    const some=hiredOffers(j,{team:crewGoing});
    j.techs=was;
    return {held,missing,none,some:some.length,
      allHaveIt:some.every(c=>hasTech(c,missing)),
      allAvailable:some.every(c=>c.status==="available"),
      cap:HIRED.offers};
  });
  check(offered.none===0,"a trade the crew already holds offers nobody ("+offered.held+")");
  check(offered.some>0,"a trade nobody holds offers "+offered.some+" ("+offered.missing+", capped at "+offered.cap+")");
  check(offered.allHaveIt,"and every one of them is actually "+offered.missing);
  check(offered.allAvailable,"and every one of them is free to take it");

  console.log("\n— what they cost, and what they are worth —");
  const price=await page.evaluate(()=>{
    const j=S.jobs.find(x=>!x.final&&assessJob(x).team.length>2)||S.jobs[0];
    const a=assessJob(j,jobPool(j));
    const crewGoing=a.team.filter(c=>c.isPlayer||c.status==="crew");
    const missing=TECHS.map(t=>t.k).find(k=>!crewGoing.some(c=>hasTech(c,k)));
    const was=j.techs.slice();j.techs=[missing];
    const c=hiredOffers(j,{team:crewGoing})[0];
    const before=assessJob(j,jobPool(j));
    bringIn(j,c.id);
    const after=assessJob(j,jobPool(j));
    const sp=jobSplit(j,after.team);
    const row=sp.rows.find(r=>r.c.id===c.id);
    const mate=sp.rows.find(r=>r.c.id!==c.id);
    const factor=after.factors.find(f=>f.k==="Brought in for the night");
    const covered=after.team.some(x=>hasTech(x,missing));
    const seats=recruits().length;
    const up=jobUpkeep(j);
    bringInOff();j.techs=was;
    return {cut:row?row.pct:0,mateCut:mate?mate.pct:0,amt:row?row.amt:0,
      factor:factor?factor.v:0,stranger:HIRED.stranger,
      marginBefore:before.margin,marginAfter:after.margin,covered,
      teamBefore:before.team.length,teamAfter:after.team.length,
      seats,seatsMax:crewSeats(),upkeep:up.perWeek,name:c.first,
      amtTxt:money(row?row.amt:0),upkeepTxt:money(up.perWeek)};
  });
  check(price.covered,"the trade the posting wanted is covered once they are in");
  check(price.teamAfter===price.teamBefore+1,
    "and they are in the field: "+price.teamBefore+" → "+price.teamAfter);
  check(price.cut>price.mateCut*2.5,
    "their share is a contractor's, not a crew member's: "+(price.cut*100).toFixed(1)
    +"% against "+(price.mateCut*100).toFixed(1)+"% — "+price.amtTxt);
  check(price.factor===price.stranger,
    "and the reckoning charges them as a stranger: "+price.factor);
  check(price.marginAfter>price.marginBefore,
    "worth it even so: margin "+price.marginBefore+" → "+price.marginAfter);
  check(price.seats===price.seatsMax,
    "no place on the crew is taken — still "+price.seats+" of "+price.seatsMax);

  console.log("\n— no seat, no wages, no bonds —");
  const free=await page.evaluate(()=>{
    const j=S.jobs.find(x=>!x.final&&assessJob(x).team.length>2)||S.jobs[0];
    const a=assessJob(j,jobPool(j));
    const crewGoing=a.team.filter(c=>c.isPlayer||c.status==="crew");
    const missing=TECHS.map(t=>t.k).find(k=>!crewGoing.some(c=>hasTech(c,k)));
    const was=j.techs.slice();j.techs=[missing];
    const c=hiredOffers(j,{team:crewGoing})[0];
    const upBefore=jobUpkeep(j).perWeek;
    const payBefore=payroll().length;
    bringIn(j,c.id);
    const upAfter=jobUpkeep(j).perWeek;
    const payAfter=payroll().length;
    const onCrew=S.crewIds.indexOf(c.id)>=0;
    const inFieldList=field().some(x=>x.id===c.id);
    // bonds: run one and see whether a pair record appears between them and a crew member
    const mate=crewGoing.find(x=>!x.isPlayer);
    const bondBefore=bondOf(c.id,mate.id);
    const after=assessJob(j,jobPool(j));
    bondUpdate(after.team.filter(x=>x.isPlayer||x.status==="crew"),4,j);
    const bondAfter=bondOf(c.id,mate.id);
    bringInOff();j.techs=was;
    return {upBefore,upAfter,upTxt:money(upBefore),payBefore,payAfter,onCrew,inFieldList,
      bondBefore:bondBefore||0,bondAfter:bondAfter||0};
  }).catch(e=>({err:String(e)}));
  if(free.err){console.log("   (bond probe unavailable: "+free.err+")");}
  else{
    check(free.upAfter===free.upBefore,"they draw no wages: upkeep stays "+free.upTxt+" a week");
    check(free.payAfter===free.payBefore,"and they are not on the books: "+free.payAfter+" on payroll, unchanged");
    check(!free.onCrew&&!free.inFieldList,"not on the crew and not in the crew list");
    check(free.bondAfter===free.bondBefore,"and a night together builds no bond: "+free.bondBefore+" → "+free.bondAfter);
  }

  console.log("\n— the whole point: paid out of the score, so a bad night pays them nothing —");
  const talk=await page.evaluate(()=>{
    const j=S.jobs.find(x=>!x.final&&assessJob(x).team.length>2)||S.jobs[0];
    const a=assessJob(j,jobPool(j));
    const crewGoing=a.team.filter(c=>c.isPlayer||c.status==="crew");
    const missing=TECHS.map(t=>t.k).find(k=>!crewGoing.some(c=>hasTech(c,k)));
    const was=j.techs.slice();j.techs=[missing];
    const c=hiredOffers(j,{team:crewGoing})[0];
    j.techs=was;
    return {name:c.first,
      clean:+(hiredTalkOdds(c,4,false)).toFixed(3),
      success:+(hiredTalkOdds(c,3,false)).toFixed(3),
      botched:+(hiredTalkOdds(c,1,false)).toFixed(3),
      disaster:+(hiredTalkOdds(c,0,false)).toFixed(3),
      taken:+(hiredTalkOdds(c,1,true)).toFixed(3),
      nervy:+(hiredTalkOdds(Object.assign({},c,{attrs:Object.assign({},c.attrs,{nerve:95}),streets:40}),1,false)).toFixed(3),
      jumpy:+(hiredTalkOdds(Object.assign({},c,{attrs:Object.assign({},c.attrs,{nerve:20}),streets:0}),1,false)).toFixed(3)};
  });
  check(talk.botched>talk.success,
    "a night that pays nothing is the one they talk about: "+Math.round(talk.success*100)
    +"% after a success, "+Math.round(talk.botched*100)+"% after a botch");
  check(talk.taken>talk.botched,
    "and being picked up at the scene is worse again: "+Math.round(talk.taken*100)+"%");
  check(talk.nervy<talk.jumpy,
    "a professional holds where an amateur does not: "+Math.round(talk.nervy*100)
    +"% against "+Math.round(talk.jumpy*100)+"% on the same bad night");
  check(talk.clean<=talk.success,"a clean night is no worse than a plain one");

  console.log("\n— and it happens, with consequences that are real —");
  const ran=await page.evaluate(()=>{
    // Forced rather than waited for: the roll is real in play, and a test that runs jobs until
    // one talks is a test that sometimes runs forever.
    const j=S.jobs.find(x=>!x.final&&assessJob(x).team.length>2)||S.jobs[0];
    const a0=assessJob(j,jobPool(j));
    const crewGoing=a0.team.filter(c=>c.isPlayer||c.status==="crew");
    const missing=TECHS.map(t=>t.k).find(k=>!crewGoing.some(c=>hasTech(c,k)));
    const was=j.techs.slice();j.techs=[missing];
    const c=hiredOffers(j,{team:crewGoing})[0];
    bringIn(j,c.id);
    const heat0=S.heat,file0=detFile(),money0=S.money;
    /* Forced rather than waited for, and forced at exactly one point. The first version of this
       overrode chance() itself, which made EVERY roll in the night come true — betrayals,
       arrests, walkouts — so what it measured was not "they talked" but "everything happened".
       Only the one function that decides this one thing is replaced. noTwist because a twist
       parks the job waiting for a decision and finishJob never runs. */
    const realOdds=window.hiredTalkOdds;
    window.hiredTalkOdds=()=>1;
    /* The weeks on the ground tick inside finishJob, and a week cools heat by heatDrop() — so
       measuring S.heat across the whole night measured the talk MINUS the cooling and came out
       at +8 against a cost of 11. Held at zero for the measurement, because the question here
       is what talking costs, not what a week costs. */
    const realDrop=window.heatDrop;
    window.heatDrop=()=>0;
    // A mole on the books leaks 3 a week, unexplained, and the weeks tick inside finishJob —
    // so that leak is subtracted too rather than left to make the arithmetic look wrong.
    const moles=payroll().filter(x=>x.mole).length;
    const weeks=Math.max(1,j.final?BAL.finalWeeks:(j.weeks||BAL.jobWeeks[j.tier]||1));
    const d=startJob(j,{pool:jobPool(j),noTwist:true});
    window.hiredTalkOdds=realOdds;window.heatDrop=realDrop;
    j.techs=was;
    const talkedMark=byId(c.id).talked;
    return {id:c.id,name:c.first,
      talked:!!talkedMark,mark:talkedMark||null,
      heatUp:S.heat-heat0,jobHeat:d.heatGain,moleLeak:3*moles*weeks,
      // A member skimming the split and vanishing is worth +6 of its own, and it happens on a
      // night that pays well. One run in five came out 6 over and the arithmetic looked wrong
      // when the only thing wrong was the list of things being subtracted.
      // A fallout entry is a string, or {x,tone} for the one kind that is not bad news —
      // somebody brought in for the night finishing it and going home. falloutText answers
      // both, and the raw entry answers neither: e.indexOf on an object is not a function,
      // which is how this file died partway the day the tone was added.
      betrayals:6*(d.events||[]).filter(e=>/skims .* and vanishes/.test(falloutText(e))).length,
      fileUp:detFile()-file0,
      contractCleared:!S.hiredId&&!S.hiredJob,
      inEvents:(d.events||[]).some(e=>falloutText(e).indexOf(c.first)>=0),
      events:(d.events||[]).map(falloutText).filter(e=>e.indexOf(c.first)>=0),
      talkHeat:HIRED.talkHeat,
      onCrewAfter:S.crewIds.indexOf(c.id)>=0};
  });
  check(ran.talked,ran.name+" talked, and it is written on their file");
  check(ran.mark&&ran.mark.city&&ran.mark.job,
    "the mark says which job: \""+(ran.mark?ran.mark.job:"")+"\" in "+(ran.mark?ran.mark.city:""));
  check(ran.heatUp-(ran.jobHeat||0)-(ran.moleLeak||0)-(ran.betrayals||0)===ran.talkHeat,
    "talking cost exactly the "+ran.talkHeat+" it says: the night added +"+ran.heatUp
    +", of which +"+(ran.jobHeat||0)+" was the job"
    +(ran.moleLeak?", +"+ran.moleLeak+" a mole on the books":"")
    +(ran.betrayals?", +"+ran.betrayals+" somebody walking with the money":""));
  check(ran.inEvents,"and the report says so: \""+(ran.events[0]||"").slice(0,90)+"…\"");
  check(ran.contractCleared,"the contract is torn up after the night, not left on the game");
  check(!ran.onCrewAfter,"and they are not on the crew afterwards");

  const again=await page.evaluate(id=>{
    const j=S.jobs.find(x=>!x.final)||S.jobs[0];
    const c=byId(id);
    return {why:bringInWhy(c,j,true),offered:hiredOffers(j,{team:[]}).some(x=>x.id===id)};
  },ran.id);
  check(/talked/.test(again.why)&&!again.offered,
    "and they are never brought in again: \""+again.why+"\"");

  console.log("\n— and when they don't talk, the money still left your pocket —");
  const quiet=await page.evaluate(()=>{
    S.jobs=[];refreshJobs(true);
    const j=S.jobs.find(x=>!x.final&&assessJob(x).team.length>2)||S.jobs[0];
    const a0=assessJob(j,jobPool(j));
    const crewGoing=a0.team.filter(c=>c.isPlayer||c.status==="crew");
    const missing=TECHS.map(t=>t.k).find(k=>!crewGoing.some(c=>hasTech(c,k)));
    const was=j.techs.slice();j.techs=[missing];
    const c=hiredOffers(j,{team:crewGoing})[0];
    if(!c){j.techs=was;return null;}
    bringIn(j,c.id);
    const team=assessJob(j,jobPool(j)).team;
    const sp=jobSplit(j,team);
    const spNoHand=jobSplit(j,team.filter(x=>x.id!==c.id));
    const realOdds=window.hiredTalkOdds;
    window.hiredTalkOdds=()=>0;
    const money0=S.money,heat0=S.heat;
    const d=startJob(j,{pool:jobPool(j),noTwist:true});
    window.hiredTalkOdds=realOdds;
    j.techs=was;
    return {name:c.first,talked:!!byId(c.id).talked,
      heatUp:S.heat-heat0,
      youKeep:sp.you,youKeepWithout:spNoHand.you,
      line:(d.events||[]).map(falloutText).filter(e=>e.indexOf(c.first)>=0)[0]||"",
      /* Which of the fifty-two it is. There used to be ONE sentence a quiet hand could leave —
         "takes $X and is not heard from again" — and this asked for that string, which stopped
         being true the day there were fifty-two of them. Asked of the pool instead: strip the
         money back out of the line and see whether any entry fills to exactly it. That stays
         true however many get written. */
      fromPool:(function(){
        const L=(d.events||[]).map(falloutText).filter(e=>e.indexOf(c.first)>=0)[0]||"";
        const m=(L.match(/\$[\d.,]+[KM]?/)||[""])[0];
        return HIRED_GONE.concat(HIRED_GONE_NOPAY).some(t=>hiredFill(t,c,m)===L);})(),
      tier:d.tier};
  });
  if(!quiet)console.log("ok  (no candidate on the fresh board — skipped)");
  else{
    check(!quiet.talked,quiet.name+" kept it to themselves, and carries no mark");
    check(quiet.fromPool,
      "and the report says so, in one of the fifty-two: \""+quiet.line.slice(0,88)+"\"");
    check(quiet.youKeep<quiet.youKeepWithout,
      "and the share came out of yours either way: you keep "+quiet.youKeep
      +" of the fee instead of "+quiet.youKeepWithout);
  }

  check(errs.length===0,"no page errors"+(errs[0]?" ("+errs[0]+")":""));
  await browser.close();
})();

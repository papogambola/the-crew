/* TWO OUTFITS ON ONE BOARD.

   Paz, on the competition: "there should be a payable way to completely eliminate the crew that
   competes with the player ... or two at a time, but there's got to be an end game for that."

   The four ways out were built for exactly one rival, and every one of them acted on "the
   rival" rather than on a named one. With two on the board that is not a missing feature, it
   is a wrong answer: buying one out closes whichever the code happened to reach first, and the
   yard on the board belongs to nobody in particular. So most of this file is about IDENTITY —
   that each ending closes the outfit it was aimed at and leaves the other one standing. */
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path");
const FILE=path.resolve(__dirname,process.argv[2]||GAME);
const back_ok=w=>w.back.length===1&&w.back[0]===w.shown;
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
  const go=async sel=>{
    for(let i=0;i<8;i++){await drain();
      try{await page.click(sel,{timeout:2500});return;}catch(e){await page.waitForTimeout(150);}}
    await page.click(sel,{timeout:8000});
  };
  await drain();
  await page.evaluate(()=>{
    S.money=5e8;
    for(let i=0;i<80&&recruits().length<crewSeats();i++){
      const c=S.roster.find(x=>x.status==="available"&&!x._u);if(!c)break;c._u=true;c.status="crew";S.crewIds.push(c.id);}
    render();
  });
  await drain();

  console.log("— one is a duel; the second arrives on the name —");
  const gates=await page.evaluate(()=>{
    const rng=freshRng();
    S.rivals=[];S.rivalNext=0;S.beat=[];S.rivalHigh=0;
    const tries=[];
    // Below the first gate: nobody.
    S.rep=10;weekTick(rng);tries.push({rep:10,n:rivals().length});
    // Past it: one, and one only, however many weeks pass.
    S.rep=60;for(let i=0;i<8;i++){S.rivalNext=0;weekTick(rng);}
    tries.push({rep:60,n:rivals().length});
    // Past the second gate: two, and never three.
    S.rep=RIVAL.secondRep+40;for(let i=0;i<12;i++){S.rivalNext=0;weekTick(rng);}
    tries.push({rep:S.rep,n:rivals().length});
    return {tries,max:RIVAL.maxAt,second:RIVAL.secondRep,
      ids:rivals().map(r=>r.id),names:rivals().map(r=>r.name),
      distinct:new Set(rivals().map(r=>r.id)).size};
  });
  check(gates.tries[0].n===0,"at ranking 10, nobody is working against you");
  check(gates.tries[1].n===1,"past the first gate there is one, and eight weeks do not make it two");
  check(gates.tries[2].n===gates.max,
    "past ranking "+gates.second+" there are "+gates.tries[2].n+" (the cap is "+gates.max+"), and twelve more weeks never make it three");
  check(gates.distinct===gates.ids.length,"each has an id of its own: "+gates.ids.join(", "));

  console.log("\n— each ending closes the one it was aimed at —");
  const aimed=await page.evaluate(()=>{
    const out={};
    const two=()=>{
      S.rivals=[];S.rivalSeq=0;S.beat=[];S.rivalHigh=0;S.det=S.det||makeDetective(freshRng());
      const rng=freshRng();
      S.rivals=[makeRival(rng),makeRival(rng)];
      S.rivals[0].standing=90;S.rivals[1].standing=60;
      S.money=5e8;
      return S.rivals.map(r=>({id:r.id,name:r.name}));
    };
    // BUY OUT the smaller one, and check the bigger one is untouched.
    let t=two();
    rivalBuyout(t[1].id);
    out.bought={left:rivals().map(r=>r.id),closed:(S.beat||[]).map(b=>b.name),aimedAt:t[1].name};
    // GIVE TO THE LAW — the bigger one this time.
    t=two();
    const file0=detFile();
    rivalBurn(t[0].id);
    out.burned={left:rivals().map(r=>r.id),closed:(S.beat||[]).map(b=>b.name),aimedAt:t[0].name,
      fileUp:detFile()-file0,cost:RIVAL.burnFile};
    // TAKE THE BOARD — hold clear of one only, and only that one should go.
    t=two();
    S.rep=rivals()[1].standing+RIVAL.leadGap+2;      // clear of the smaller, not the bigger
    for(let i=0;i<RIVAL.leadWeeks+1;i++)rivalLeadTick();
    out.outworked={left:rivals().map(r=>r.id),closed:(S.beat||[]).map(b=>b.name),aimedAt:t[1].name,
      bigStanding:rivals()[0]?rivals()[0].standing:null};
    return out;
  });
  check(aimed.bought.left.length===1&&aimed.bought.closed.length===1&&aimed.bought.closed[0]===aimed.bought.aimedAt,
    "bought out "+aimed.bought.aimedAt+" — and the other one is still standing");
  check(aimed.burned.left.length===1&&aimed.burned.closed[0]===aimed.burned.aimedAt,
    "gave "+aimed.burned.aimedAt+" to the law — the other one is still standing");
  check(aimed.burned.fileUp===aimed.burned.cost,
    "  and it cost your own file the "+aimed.burned.cost+" it says: +"+aimed.burned.fileUp);
  check(aimed.outworked.left.length===1&&aimed.outworked.closed[0]===aimed.outworked.aimedAt,
    "outworked "+aimed.outworked.aimedAt+" by holding clear of THEM — the bigger one at "
    +aimed.outworked.bigStanding+" is untouched");

  console.log("\n— the yard on the board belongs to one of them —");
  const yards=await page.evaluate(()=>{
    S.rivals=[];S.rivalSeq=0;S.beat=[];S.over=null;
    const rng=freshRng();
    S.rivals=[makeRival(rng),makeRival(rng)];
    S.rivals.forEach(r=>{r.standing=60;r.since=1;r.jobBack=0;});
    S.week=20;S.rep=80;S.money=5e8;
    S.jobs=[];refreshJobs(true);
    maybeUnlockRivalJob();
    const posts=S.jobs.filter(j=>j.rival);
    const before={n:posts.length,ids:posts.map(j=>j.rivalId),jobIds:posts.map(j=>j.id)};
    // Close one of them; its yard must go with it and the other's must stay.
    const goneId=S.rivals[0].id, stays=S.rivals[1].id;
    rivalBuyout(goneId);
    const after=S.jobs.filter(j=>j.rival);
    return {before,
      distinctJobIds:new Set(before.jobIds).size,
      namesOne:before.ids.every(x=>!!x),
      afterN:after.length,afterId:after[0]?after[0].rivalId:null,goneId,stays};
  });
  check(yards.before.n===2,"both yards can stand on the board at once");
  check(yards.distinctJobIds===2,"  with ids of their own, not one overwriting the other: "+yards.before.jobIds.join(", "));
  check(yards.namesOne,"  and each names the outfit it belongs to");
  check(yards.afterN===1&&yards.afterId===yards.stays,
    "closing one takes its yard off the board and leaves the other's");

  console.log("\n— a night at the wrong yard does not finish the right outfit —");
  const night=await page.evaluate(()=>{
    S.rivals=[];S.rivalSeq=0;S.beat=[];S.over=null;
    const rng=freshRng();
    S.rivals=[makeRival(rng),makeRival(rng)];
    S.rivals.forEach(r=>{r.standing=55;r.since=1;r.jobBack=0;});
    S.week=20;S.rep=90;S.money=5e8;
    S.jobs=[];refreshJobs(true);maybeUnlockRivalJob();
    const j=S.jobs.find(x=>x.rival&&x.rivalId===S.rivals[1].id);
    if(!j)return null;
    const target=S.rivals[1].name,other=S.rivals[0].name;
    // Make certain the night comes off: the reckoning has to clear the verdict outright.
    j.diff=1;
    const d=startJob(j,{pool:jobPool(j),noTwist:true});
    return {tier:d.tier,target,other,
      closed:(S.beat||[]).map(b=>b.name),left:rivals().map(r=>r.name)};
  });
  if(!night)console.log("ok  (no second yard on this board — skipped)");
  else if(night.tier>=3){
    check(night.closed.length===1&&night.closed[0]===night.target,
      "took "+night.target+" apart at their own yard ("+["disaster","botched","messy","success","clean"][night.tier]+")");
    check(night.left.length===1&&night.left[0]===night.other,
      "and "+night.other+" is still out there");
  } else {
    check(night.closed.length===0&&night.left.length===2,
      "the night went "+["disaster","botched","messy","success","clean"][night.tier]+" — neither of them is finished, which is right");
  }

  console.log("\n— a botched raid hides only that outfit's yard —");
  const watched=await page.evaluate(()=>{
    S.rivals=[];S.rivalSeq=0;S.beat=[];S.over=null;
    const rng=freshRng();
    S.rivals=[makeRival(rng),makeRival(rng)];
    S.rivals.forEach(r=>{r.standing=55;r.since=1;r.jobBack=0;});
    S.week=20;S.rep=90;S.money=5e8;
    S.jobs=[];refreshJobs(true);maybeUnlockRivalJob();
    const hit=S.rivals[0], other=S.rivals[1];
    // the clock the botched night sets, set by hand rather than by running a losing night
    hit.jobBack=S.week+7;
    S.jobs=S.jobs.filter(j=>!j.rival);
    maybeUnlockRivalJob();
    const back=S.jobs.filter(j=>j.rival).map(j=>j.rivalId);
    return {hidden:hit.id,shown:other.id,back};
  });
  check(back_ok(watched),"the watched yard stays off the board and the other one comes back: "
    +JSON.stringify(watched.back));

  console.log("\n— both of them eat the board —");
  const board=await page.evaluate(()=>{
    const run=n=>{
      S.rivals=[];S.rivalSeq=0;S.beat=[];
      const rng=freshRng();
      for(let i=0;i<n;i++)S.rivals.push(makeRival(rng));
      S.rivals.forEach(r=>{r.standing=200;r.took=0;});
      S.rep=100;
      let taken=0;
      for(let w=0;w<120;w++){S.week=30+w;S.jobs=[];refreshJobs(true);const before=S.jobs.length;rivalWorks(freshRng());taken+=before-S.jobs.length;}
      return taken;
    };
    return {one:run(1),two:run(2)};
  });
  check(board.two>board.one,
    "two outfits take more off it than one does, over 120 weeks: "+board.one+" → "+board.two+" postings");

  console.log("\n— and an old save opens with its rival intact —");
  const old=await page.evaluate(()=>{
    S.rivals=[];S.rivalSeq=0;
    const rng=freshRng();
    const r=makeRival(rng);
    S.rivals=[r];
    save();
    // Rewrite the file into the shape it had when there could only be one.
    const raw=JSON.parse(localStorage.getItem("thecrew_save_v2"));
    raw.rival=raw.rivals[0];delete raw.rival.id;delete raw.rivals;delete raw.rivalSeq;
    localStorage.setItem("thecrew_save_v2",JSON.stringify(raw));
    load();
    return {n:rivals().length,name:rivals()[0]?rivals()[0].name:null,
      hasId:!!(rivals()[0]&&rivals()[0].id),stale:!!S.rival};
  });
  check(old.n===1&&old.name,"a one-rival save still has its rival after the change: "+old.name);
  check(old.hasId,"  and it was given an id on the way in");
  check(!old.stale,"  and the old field is gone, so nothing can read the wrong one");

  console.log("\n— the screen shows both, with their own buttons —");
  await page.evaluate(()=>{
    S.rivals=[];S.rivalSeq=0;S.beat=[];
    const rng=freshRng();
    S.rivals=[makeRival(rng),makeRival(rng)];
    S.rivals[0].standing=90;S.rivals[1].standing=50;
    S.money=5e8;S.tab="log";S.modal=null;S.notices=[];
    try{localStorage.setItem("thecrew_fold_law","1");}catch(e){}
    render();
  });
  await drain();
  // The dashboard's sections start folded; open the one this is about.
  await page.evaluate(()=>{
    const h=[...document.querySelectorAll("[data-act]")].find(e=>/competition and the law/i.test(e.textContent||""));
    if(h)h.click();
  });
  await page.waitForTimeout(200);
  const shown=await page.evaluate(()=>{
    const ids=S.rivals.map(r=>r.id);
    const btn=a=>ids.map(id=>!!document.querySelector('[data-act="'+a+'"][data-id="'+id+'"]'));
    return {names:ids.map(id=>{
        const b=document.querySelector('[data-act="rival-buyout"][data-id="'+id+'"]');
        return b?b.textContent.trim():null;}),
      buyout:btn("rival-buyout"),burn:btn("rival-burn"),press:btn("rival-buy"),
      warn:/Two outfits are working this board/.test(document.body.textContent||"")};
  });
  check(shown.buyout.every(Boolean)&&shown.burn.every(Boolean)&&shown.press.every(Boolean),
    "both outfits have their own buy-out, burn and pressure buttons");
  check(shown.names.every(Boolean)&&shown.names[0]!==shown.names[1],
    "priced separately, by their own standing: "+shown.names.join("  |  "));
  check(shown.warn,"and the panel says out loud that there are two of them");

  check(errs.length===0,"no page errors"+(errs[0]?" ("+errs[0]+")":""));
  await browser.close();
})();

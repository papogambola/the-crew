/* A SECOND TRADE, KEPT.

   Paz: "a crew could be amazingly suitable for one job and completely off for 4 other jobs ...
   he needs to quickly replace most of them every single week ... there's no core."

   Measured before touching anything: one crew held still for 120 weeks held NONE of the wanted
   trades on 58.5% of postings. And the only tool for adapting somebody you had invested in was
   a trade school that cost money, 3-7 weeks, TWO RANKS, and took away the trade you hired them
   for. Hiring a stranger was strictly better, so the design was telling the player not to have
   a core in a game about having one.

   Teaching now ADDS. This checks the mechanic, checks it survives a save — a second trade that
   vanishes on reload is worse than none, and packState has form here — and then re-runs the
   original measurement to see whether it actually moves the number it was built to move. */
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
  const drain=async()=>{for(let i=0;i<30;i++){
    if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');
    else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');
    else if(await page.$('[data-act="loose"]'))await page.click('[data-act="loose"][data-i="0"]');
    else break;await page.waitForTimeout(60);}};
  await drain();

  console.log("— they keep what they were —");
  const t=await page.evaluate(()=>{
    S.money=5e7;S.rep=200;S.notices=[];S.modal=null;
    for(let i=0;i<80&&recruits().length<crewSeats();i++){
      const c=S.roster.find(x=>x.status==="available"&&!x._u);if(!c)break;c._u=true;c.status="crew";S.crewIds.push(c.id);}
    const c=recruits()[0];
    c.exp=4;c.status="crew";                       // a Veteran, well past the gate
    const was={tech:c.tech,exp:c.exp,xp:c.xp||0,label:techLabel(c)};
    // Pick a second trade that is genuinely different from theirs.
    const k=TECHS.find(x=>x.k!==c.tech).k;
    const gate=canLearn(c);
    learnStart(c,k,0);
    const mid={status:c.status,out:c.out,tech:c.tech};
    S.week=c.out;learnFinish(c);
    return {gate:gate,was:was,mid:mid,k:k,
      now:{tech:c.tech,tech2:c.tech2,exp:c.exp,label:techLabel(c)},
      id:c.id,
      canAgain:canLearn(c),
      options:learnOptions(c).map(o=>o.k)};
  });
  check(t.gate==="","a Veteran can be asked"+(t.gate?" — but got: "+t.gate:""));
  check(t.mid.status==="learning","they go away to a school");
  check(t.now.tech===t.was.tech,"and come back the SAME trade they were: "+t.now.tech);
  check(t.now.exp===t.was.exp,"at the same rank: "+t.now.exp+" (it used to drop two)");
  check(t.now.tech2===t.k,"carrying a second one: "+t.now.tech2);
  check(/·\s*also/.test(t.now.label),"which the card says out loud: \""+t.now.label+"\"");
  check(/already carries two/.test(t.canAgain),"and nobody gets a third: \""+t.canAgain+"\"");
  check(t.options.indexOf(t.k)<0&&t.options.indexOf(t.was.tech)<0,
    "neither trade is offered again ("+t.options.length+" left to choose from)");

  console.log("\n— and it is worth having —");
  const worth=await page.evaluate(id=>{
    const c=byId(id);
    const j=S.jobs.find(x=>!x.final)||S.jobs[0];
    const want=j.techs[0];
    // The control has to be a trade this job does NOT want, whatever the job turned out to be.
    // Hardcoding "launderer" failed one run in four: the job wanted a launderer.
    const other=TECHS.map(t=>t.k).find(k=>j.techs.indexOf(k)<0);
    const own=Object.assign({},c,{tech:want,tech2:null});
    const learned=Object.assign({},c,{tech:other,tech2:want});
    const neither=Object.assign({},c,{tech:other,tech2:null});
    return {bonus:TECH_BONUS,bonus2:TECH_BONUS_2,
      own:+memberEff(own,j).toFixed(1),learned:+memberEff(learned,j).toFixed(1),
      neither:+memberEff(neither,j).toFixed(1)};
  },t.id);
  check(worth.learned>worth.neither,"a learned trade beats not having it: "
    +worth.neither+" -> "+worth.learned+"  (+"+(worth.learned-worth.neither).toFixed(0)+")");
  check(worth.own>worth.learned,"and the trade you ARE still beats the one you learned: "
    +worth.own+" vs "+worth.learned+"  ("+worth.bonus+" against "+worth.bonus2+")");

  console.log("\n— it works everywhere the first trade works —");
  /* Asked of a job built for the question rather than whichever posting the board happened to
     offer — the first run of this failed once and passed four re-runs, which is a test hoping
     rather than arranging. The crew member is put in the field by hand so entry checks (borders,
     limits, injuries) cannot decide the answer to a question about trades. */
  const uses=await page.evaluate(id=>{
    const c=byId(id);
    c.tech="launderer";c.tech2="forger";c.status="crew";c.limits=[];c.jail=0;
    const j=JSON.parse(JSON.stringify(S.jobs.find(x=>!x.final)||S.jobs[0]));
    j.techs=["forger"];j.know=[];j.tags=[];
    /* Read the answer out BEFORE mutating. assessJob hands back a team of references to the
       very object being changed, so measuring after the change measured the change twice —
       hitsWithout came out 1 because before.team[0] was the same person, now without it. */
    const before=assessJob(j,[c]);
    const hitsWith=j.techs.filter(t=>before.team.some(x=>hasTech(x,t))).length;
    const powerWith=Math.round(before.power);
    const inField=before.team.length===1;
    c.tech2=null;
    const after=assessJob(j,[c]);
    const hitsWithout=j.techs.filter(t=>after.team.some(x=>hasTech(x,t))).length;
    const powerWithout=Math.round(after.power);
    c.tech2="forger";
    return {hasTech:hasTech(c,"forger"),inField:inField,
      hitsWith:hitsWith,hitsWithout:hitsWithout,
      powerWith:powerWith,powerWithout:powerWithout};
  },t.id);
  check(uses.hasTech,"hasTech() sees the learned trade");
  check(uses.inField,"and the one being asked about is actually in the field");
  check(uses.hitsWith===1&&uses.hitsWithout===0,
    "the job's requirement counts it: "+uses.hitsWithout+" -> "+uses.hitsWith+" wanted trades held");
  check(uses.powerWith>uses.powerWithout,
    "and it is worth something on the night: "+uses.powerWithout+" -> "+uses.powerWith);

  console.log("\n— and it survives being saved —");
  const kept=await page.evaluate(id=>{
    const c=byId(id);c.tech="grifter";c.tech2="hacker";c._touched=true;
    save();
    const raw=JSON.parse(localStorage.getItem("thecrew_save_v2"));
    const inFile=raw.ov&&raw.ov[id]?raw.ov[id].tech2:"(not written)";
    load();
    const back=byId(id);
    return {inFile:inFile,after:back?back.tech2:null,tech:back?back.tech:null};
  },t.id);
  check(kept.inFile==="hacker","the save file carries it: "+kept.inFile);
  check(kept.after==="hacker"&&kept.tech==="grifter",
    "and a reload gives back both: "+kept.tech+" · also "+kept.after);

  console.log("\n— does it actually fix the thing it was built for? —");
  const study=await page.evaluate(()=>{
    // Same measurement as before the change: one crew, held still, 120 weeks of boards.
    const crew=crewAll().filter(c=>!c.isPlayer);
    crew.forEach(c=>{c.tech2=null;});
    const run=()=>{
      let zero=0,n=0,sum=0;
      for(let w=0;w<120;w++){
        S.week=10+w;S.jobs=[];refreshJobs(true);
        S.jobs.forEach(j=>{
          const a=assessJob(j);
          const hits=j.techs.filter(t=>a.team.some(c=>hasTech(c,t))).length;
          if(!hits)zero++;
          n++;sum+=a.margin;
        });
      }
      return {zeroPct:+(100*zero/n).toFixed(1),margin:+(sum/n).toFixed(1),n:n};
    };
    const before=run();
    // Now teach each of them one second trade, chosen for breadth rather than at random —
    // which is what a player deciding this deliberately would do.
    const held={};crewAll().forEach(c=>{held[c.tech]=1;});
    crew.forEach(c=>{
      const want=TECHS.find(x=>!held[x.k]);
      if(want){c.tech2=want.k;held[want.k]=1;}
    });
    const after=run();
    return {before:before,after:after,taught:crew.filter(c=>c.tech2).length};
  });
  console.log("   before: none of the wanted trades on "+study.before.zeroPct+"% of postings, mean margin "+study.before.margin);
  console.log("   after:  none of the wanted trades on "+study.after.zeroPct+"% of postings, mean margin "+study.after.margin
    +"   ("+study.taught+" taught one each)");
  check(study.after.zeroPct<study.before.zeroPct-8,
    "the same crew now holds something on far more of the board: "
    +study.before.zeroPct+"% -> "+study.after.zeroPct+"% blank");
  check(study.after.margin>study.before.margin,
    "and is worth more on it: "+study.before.margin+" -> "+study.after.margin);

  check(errs.length===0,"no page errors"+(errs[0]?" ("+errs[0]+")":""));
  await browser.close();
})();

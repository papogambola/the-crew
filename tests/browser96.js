/* CHANGING PLACES BETWEEN YOUR OWN CREWS, when every one of them is full.

   THE DEAD END THIS EXISTS TO OPEN. Send needs a free place in the crew somebody is going to;
   Recall needs a free place at home. Once every crew is full there is no free place anywhere, so a
   launderer in crew one and a medic in crew two stay where they are — including on the week the
   board posts a job that wants a medic and has no use for a launderer. Nothing was wrong with
   either crew. The only thing in the way was arithmetic, and it was the wrong arithmetic: a swap
   needs no seat, because two people change places and both crews end the size they started.

   The first thing this file does is prove the dead end is real — zero Send buttons, zero usable
   Recall — because a feature that opens a door nobody was standing at is worth nothing, and an
   assertion that only checks the new thing works would never notice.
*/
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const FILE=path.resolve(__dirname,process.argv[2]||GAME);
const OUT=path.join(__dirname,"shots96");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1400,height:1100}});
  const errs=[];page.on("pageerror",e=>errs.push(String(e)));
  const noise=t=>/ERR_CERT|music\/|\.mp3|manifest\.json|r2\.dev|fonts\./.test(t)||/net::ERR_FAILED/.test(t)
    ||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const w=(m.location()||{}).url||"";const t=m.text()+(w?" ["+w+"]":"");
    if(m.type()==="error"&&!noise(t))errs.push(t);});

  await page.goto("file://"+FILE);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.waitForTimeout(500);
  await page.click('[data-act="begin"]');
  await page.fill("#pname","Vera");
  await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar",{timeout:20000});
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  for(let i=0;i<25;i++){
    const x=await page.$('button[data-act="crewname-later"]')||await page.$('.scrim button.x:not([disabled])');
    if(x){await x.click();await page.waitForTimeout(40);continue;}
    const q=await page.$$('.scrim .btn:not([disabled])');
    if(q.length){await q[q.length-1].click();await page.waitForTimeout(40);continue;}
    break;}

  /* ARRANGED, not waited for. Two full crews is forty weeks of play away, and a test that hopes to
     reach it is a test that reports on whichever world it got. The state is built directly and the
     game is asked to render it. */
  const set=await page.evaluate(()=>{
    /* NO RANK JUMP. Setting the ranking to 200 hands the game every milestone it had been
       saving up, each of which is a card over the screen that swallows the next click — and
       the test then dies four assertions in with a click timeout, which reads like the feature
       failing. None of it was needed: a second crew is built here directly, and the crew is
       filled to whatever crewSeats() says at the rank the game actually starts at. Full is
       full, whether that is four seats or six. */
    S.money=9e6;S.modal=null;S.event=null;
    const free=()=>S.roster.filter(c=>c.status==="available"&&!c.isPlayer);
    /* One trade each. Taking whoever is next hands a crew two forgers or two hackers, and the game
       — correctly — raises a card about it, which then sits over the screen and swallows the click
       this test is trying to make. Distinct trades is also the situation being tested: a launderer
       in one crew, a medic in the other, and a job that wants the medic. */
    const taken={};
    const fill=n=>{const g=[];
      for(const c of free()){
        if(g.length>=n)break;
        if(taken[c.tech])continue;
        taken[c.tech]=1;c.status="crew";c.paidUntil=S.week+80;g.push(c);
      }
      return g;};
    const mine=fill(crewSeats()); S.crewIds=mine.map(c=>c.id);
    const theirs=fill(EXTRA_CREW_SIZE);
    S.crewSeq=(S.crewSeq||0)+1;
    S.crews=[{id:S.crewSeq,name:"Ivan's crew",leadId:theirs[0].id,
              memberIds:theirs.map(c=>c.id),founded:S.week,jobWeek:0}];
    // Jumping the ranking to 200 fires every milestone the game had been saving up, and a
    // notice over the screen intercepts every click. They are not what is under test.
    S.notices=[];S.modal=null;S.event=null;
    S.tab="crew";render();
    return {mine:S.crewIds.length,seats:crewSeats(),theirs:S.crews[0].memberIds.length,cap:EXTRA_CREW_SIZE,
            a:mine[1].id,aName:mine[1].first,b:theirs[2].id,bName:theirs[2].first,
            lead:theirs[0].id,leadName:theirs[0].first};});
  /* Milestones. Jumping the ranking to 200 means the game has several announcements saved up, and
     each is a card over the screen that swallows clicks. A player dismisses them; so does this. */
  const drain=async()=>{
    /* Clear until there is nothing over the screen, rather than a fixed number of tries: a run that
       still had a card up clicked into it instead of the crew and died four assertions in, which
       reads like the feature failing and is not. */
    for(let i=0;i<25;i++){
      if(!(await page.$(".scrim")))break;
      const n=await page.$('[data-act="notice-go"]')||await page.$('[data-act="notice-close"] .btn')
             ||await page.$(".scrim .btn:not([disabled])")||await page.$(".scrim .x");
      if(!n)break;
      await n.click().catch(()=>{});
      await page.waitForTimeout(140);
    }
    // Some of those cards carry you to the tab they are about, so come back to the crew.
    await page.evaluate(()=>{if(S){S.tab="crew";S.modal=null;S.event=null;render();}});
    await page.waitForTimeout(150);
  };
  // Wait for the button rather than assume the render has caught up.
  const press=async(sel)=>{
    await drain();
    await page.waitForSelector(sel,{timeout:15000});
    try{ await page.click(sel,{timeout:8000}); }
    catch(e){
      // Say WHAT was in the way rather than timing out anonymously — a click that cannot land is
      // nearly always something over the screen, and naming it is the difference between a fix and
      // a guess.
      const over=await page.evaluate(()=>{const s=document.querySelector(".scrim");
        return s?(s.getAttribute("data-act")||"?")+" :: "+(s.innerText||"").replace(/\s+/g," ").slice(0,90):"nothing";});
      console.error("FAIL: a click on "+sel+" was blocked by: "+over);
      throw e;
    }
  };
  await drain();

  check(set.mine===set.seats&&set.theirs===set.cap,
    "both crews are full — yours "+set.mine+" of "+set.seats+", Ivan's "+set.theirs+" of "+set.cap);

  console.log("— the dead end this exists to open —");
  const shut=await page.evaluate(()=>({
    send:document.querySelectorAll('[data-act="crew-send"]').length,
    recall:document.querySelectorAll('[data-act="crew-recall"]:not([disabled])').length,
    swap:document.querySelectorAll('[data-act="swap-pick"]').length}));
  check(shut.send===0,"nowhere to Send anybody: every other crew is full");
  check(shut.recall===0,"and no Recall that would work: your own crew is full too");
  check(shut.swap>0,"but there are "+shut.swap+" ways to change places, which need no seat at all");
  await page.screenshot({path:OUT+"/01-both-full.png"});

  console.log("— picking one offers only the people who could actually take the trade —");
  await press('[data-act="swap-pick"][data-id="'+set.a+'"]');
  await page.waitForTimeout(250);
  const mid=await page.evaluate(id=>({
    // Ids are strings ("C1006"), so no coercion: +"C1006" is NaN, every comparison then fails, and
    // JSON prints it as null, which reads as "the button had no id" and sends you looking in the
    // wrong place entirely.
    partners:[...document.querySelectorAll('[data-act="swap-with"]')].map(b=>b.getAttribute("data-id")),
    cancel:!!document.querySelector('[data-act="swap-off"]'),
    leftOver:document.querySelectorAll('[data-act="swap-pick"]').length,
    theirIds:S.crews[0].memberIds.map(String), mineIds:S.crewIds.map(String), picked:String(id)}),set.a);
  check(mid.cancel===true,"the one you picked offers to cancel instead");
  check(mid.leftOver===0,"and nothing else offers to be picked — one question at a time");
  check(mid.partners.length===mid.theirIds.length,
    "everybody in the OTHER crew can take it ("+mid.partners.length+")");
  const strays=mid.partners.filter(x=>!mid.theirIds.includes(x));
  check(mid.partners.every(x=>mid.theirIds.includes(x)),
    "and nobody from your own — trading somebody for the person beside them is not a move"
    +(strays.length?" | strays: "+JSON.stringify(strays)+" mine: "+JSON.stringify(mid.mineIds)+" theirs: "+JSON.stringify(mid.theirIds):""));
  check(!mid.partners.includes(mid.picked),"nor with themselves");
  await page.screenshot({path:OUT+"/02-picking.png"});

  console.log("— and the two change places —");
  await page.waitForSelector('[data-act="swap-with"][data-id="'+set.b+'"]',{timeout:15000});
  await page.click('[data-act="swap-with"][data-id="'+set.b+'"]');
  await page.waitForTimeout(350);
  const after=await page.evaluate(s=>({
    aInTheirs:S.crews[0].memberIds.includes(s.a), aInMine:S.crewIds.includes(s.a),
    bInMine:S.crewIds.includes(s.b), bInTheirs:S.crews[0].memberIds.includes(s.b),
    mySize:S.crewIds.length, theirSize:S.crews[0].memberIds.length,
    swap:UI.swap, log:(S.log.find(l=>/change places/.test(l.t))||{}).t||""}),set);
  check(after.aInTheirs&&!after.aInMine,set.aName+" is in Ivan's crew now");
  check(after.bInMine&&!after.bInTheirs,"and "+set.bName+" is in yours");
  check(after.mySize===set.mine&&after.theirSize===set.theirs,
    "NEITHER CREW CHANGED SIZE ("+after.mySize+" and "+after.theirSize+") — which is the whole reason this works when both are full");
  check(after.swap===null,"the pick is cleared, so a stale one cannot outlive the person it named");
  check(after.log.indexOf(set.aName)>=0&&after.log.indexOf(set.bName)>=0,
    "and the log says who went where: \""+after.log+"\"");
  await page.screenshot({path:OUT+"/03-changed.png"});

  console.log("— trading a crew's named leader leaves it leaderless, not broken —");
  /* crewLeader never trusts leadId without checking the person is still in the crew, so a stale
     one cannot strand a crew. It is cleared anyway, because a name pointing at somebody who is
     three cities away is a lie the next reader has to work out. */
  const led=await page.evaluate(s=>{
    const mine=S.crewIds[0];
    crewTrade(s.lead,mine);
    const cr=S.crews[0];
    const l=crewLeader(cr);
    return {leadId:cr.leadId, stillThere:cr.memberIds.includes(s.lead),
            leaderNow:l?l.first:null, size:cr.memberIds.length};},set);
  check(led.stillThere===false,set.leadName+" has gone to your crew");
  check(led.leadId===null,"and the crew is not left naming them as its leader");
  check(led.size===set.theirs,"still five, still a crew");
  check(led.leaderNow===null||typeof led.leaderNow==="string",
    "and it works out who leads it now on its own: "+(led.leaderNow||"nobody — leaderless until a commander is in it"));

  console.log("— who cannot be traded —");
  const refused=await page.evaluate(()=>{
    const out={};
    out.you=crewCanTrade(S.player);
    const hurt=byId(S.crewIds[0]); const was=hurt.status;
    hurt.status="injured"; out.injured=crewCanTrade(hurt); hurt.status=was;
    // two in the same crew is not a trade, and must change nothing
    const a=S.crewIds[0],bb=S.crewIds[1],before=S.crewIds.slice();
    crewTrade(a,bb);
    out.sameCrewUnchanged=JSON.stringify(S.crewIds)===JSON.stringify(before);
    return out;});
  check(refused.you===false,"not you — the commander is not a piece to be moved between crews");
  check(refused.injured===false,"not somebody injured: a swap is two people agreeing to change cities");
  check(refused.sameCrewUnchanged===true,"and two in the same crew is not a trade — nothing moves");

  check(errs.length===0,"no page or console errors through any of it"+(errs.length?": "+errs.slice(0,3).join(" | "):""));
  await browser.close();
})();

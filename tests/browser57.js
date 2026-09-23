// Build 82: the words and the clock in the next column have to agree.
//
// The report said "That is dealt with, and the night carries on" against a clock reading 14:56,
// printed the aftermath's "By noon the police have a list" at 17:00, gave the whole twist block no
// time at all, and — when the player was the one who solved it — said "You is the contractor from
// the lift company."
//
// So: the twist block runs on the job's own clock, its wording comes from a pool the hour allows,
// the aftermath rolls over into the morning it has always talked about, and a twist answer
// conjugates when its subject becomes You.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots57");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:950}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  const drain=async()=>{let n=0;while(await page.$(".modal.notice")||await page.$('[data-act="loose"]')){
    if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');else await page.click('[data-act="loose"][data-i="0"]');
    await page.waitForTimeout(80);if(++n>30)break;}};
  // A new game each time. The second job used to run on the board the first one left behind —
  // crew hurt, week moved on — and found nothing to run, which the test then reported as a pass.
  const fresh=async()=>{
    await page.goto("file://"+(process.argv[2]?require("path").resolve(process.argv[2]):GAME));
    await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
    await page.reload();
    await page.click('[data-act="begin"]');await page.fill("#pname","Paz");await page.click('[data-act="confirm-create"]');
    await page.waitForSelector(".topbar");
    await putDownPaper(page);
    if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
    await drain();
  };
  await fresh();

  /* ================= a twist answer in the player's voice ================= */
  console.log("\n— \"You is the contractor from the lift company\" —");
  const grammar=await page.evaluate(()=>{
    let n=0;const bad=[];
    TWISTS.forEach(T=>T.opts.forEach(o=>["ok","slow","bad"].forEach(k=>{
      if(!o[k]||o[k].indexOf("{X}")<0)return;n++;
      const out=youGrammar(fill2(o[k],{X:"You",M:"Nadia"}));
      // a third-person verb straight after the subject "You", at the head of a sentence
      if(/^You \w+s\b/.test(out)||/[.!?] You \w+s\b/.test(out))bad.push(out);
    })));
    return {n,bad,sample:youGrammar(fill2("{X} is the contractor from the lift company, annoyed at the hour. He apologises. Clear.",{X:"You"}))};});
  check(grammar.n>50,grammar.n+" twist answers name whoever solves it");
  check(grammar.bad.length===0,"and not one of them is left in the third person when that is you"
    +(grammar.bad.length?" — "+grammar.bad.slice(0,3).join(" | "):""));
  check(/^You are the contractor/.test(grammar.sample),"the reported one reads: \""+grammar.sample+"\"");
  // the conjugator itself, on the cases that broke it
  const verbs=await page.evaluate(()=>["is","has","does","knows","loses","passes","fixes","watches","tries","carries"]
    .map(v=>v+"→"+youVerb(v)));
  check(verbs.join(" ").indexOf("loses→lose")>=0,"and loses conjugates to lose, not \"los\": "+verbs.join("  "));
  // a third person is untouched
  const third=await page.evaluate(()=>youGrammar(fill2("{X} is the contractor from the lift company. He apologises.",{X:"Nadia"})));
  check(/^Nadia is the contractor/.test(third),"somebody else is still somebody else: \""+third+"\"");
  // and "You" in the middle of a sentence is an object, not a subject
  const obj=await page.evaluate(()=>youGrammar("He asks You for a name. The guard waves You through."));
  check(obj==="He asks You for a name. The guard waves You through.","and a You that is not the subject is left alone");

  /* ================= the pools know what hour it is ================= */
  console.log("\n— night words only at night —");
  const pools=await page.evaluate(()=>{
    const night=h=>["TWIST_CUE","TWIST_AGAIN","TWIST_BETWEEN"].map(p=>twistLines(p,h));
    const at2pm=night(14),at10pm=night(22);
    const nightish=l=>/\bnight\b|\bdark\b/i.test(l);
    return {day:at2pm.map(p=>p.filter(nightish)),
      nightOnly:at10pm.map((p,i)=>p.length-at2pm[i].length),
      dayCounts:at2pm.map(p=>p.length),
      // one definition of night, and one of day, and they are not each other's negation:
      // half past five in the evening is neither
      isNight:[isNight(14),isNight(22),isNight(3),isNight(6),isNight(18),isNight(5)],
      isDay:[isDay(14),isDay(22),isDay(3),isDay(6),isDay(17),isDay(5)]};});
  check(pools.day.every(p=>p.length===0),
    "at two in the afternoon not one line in the three pools mentions night or dark"
    +(pools.day.some(p=>p.length)?" — "+JSON.stringify(pools.day):""));
  check(pools.nightOnly.every(n=>n>0),"and at ten at night there are more to draw from: +"+pools.nightOnly.join(", +"));
  check(JSON.stringify(pools.isNight)==="[false,true,true,false,true,true]",
    "\"tonight\" is true from 18:00 to 05:59 — 14 no, 22 yes, 03 yes, 06 no, 18 yes, 05 yes");
  check(JSON.stringify(pools.isDay)==="[true,false,false,true,false,false]",
    "\"over breakfast\" is true from 06:00 to 16:59 — 14 yes, 22 no, 03 no, 06 yes, 17 no, 05 no");

  /* ============ every line of many reports, against its own stamp ============ */
  // The two pools above are only the twist block. The rest of the report draws from thirty more,
  // and those had "over breakfast" at 00:08 and "for one night" at 10:19 in them. So: build a
  // great many reports and read every word against the time actually printed beside it.
  //
  // The hour is not forced. narrate() draws it from the posting — evening for a night job, morning
  // or afternoon for the rest — and forcing any other combination only manufactures contradictions
  // the player can never see: "left at home, job is at night" is a fact about the posting and true
  // at any hour, but it never appears beside a seven in the morning, because night jobs do not
  // start then.
  console.log("\n— the whole report, at the hours the game runs them —");
  const sweep=await page.evaluate(()=>{
    S.money=5e7;S.rep=500;
    for(let i=0;i<60&&recruits().length<crewSeats();i++){
      const c=S.roster.find(x=>x.status==="available"&&!x._u);if(!c)break;c._u=true;
      c.status="crew";S.crewIds.push(c.id);}
    const out={lines:0,reports:0,bad:[],flagged:0,hours:{},nights:0};
    for(let t=0;t<90;t++){
      S.week++;S.jobs=[];refreshJobs(true);
      const runnable=S.jobs.filter(x=>!x.final&&assessJob(x).canRun);
      if(!runnable.length)continue;
      const j=runnable[t%runnable.length];
      if(j.tags.includes("night"))out.nights++;
      const rng=freshRng();
      const r=narrate(j,assessJob(j),ri(rng,0,4),rng,
        {heatGain:20,take:1e5,cuts:2e4,net:8e4,fallout:[],betrayals:[]},"all",null);
      out.reports++;
      r.lines.forEach(l=>{
        out.lines++;
        const h=+String(l.t).replace(/^NEXT /,"").slice(0,2);
        out.hours[h]=(out.hours[h]||0)+1;
        const night=SAYS_NIGHT.test(l.x),day=SAYS_DAY.test(l.x);
        if(!night&&!day)return;
        out.flagged++;
        // The clock is up to 26 minutes further on by the time a line is stamped, so it may have
        // crossed one hour boundary since the line was chosen. One hour of slack, no more.
        const prev=(h+23)%24;
        const ok=night?(isNight(h)||isNight(prev)):(isDay(h)||isDay(prev));
        if(!ok)out.bad.push(l.t+"  "+l.x);});
    }
    return out;});
  const covered=Object.keys(sweep.hours).length;
  check(sweep.reports>=50,sweep.reports+" reports, "+sweep.nights+" of them night work, "+sweep.lines+" lines");
  check(covered>=18,"printed at "+covered+" of the 24 hours — the clock carries a report well past the hour it opened at");
  check(sweep.flagged>25,sweep.flagged+" of those lines name a time of day");
  check(sweep.bad.length===0,"and not one of them contradicts the clock beside it"
    +(sweep.bad.length?" — "+sweep.bad.slice(0,6).join("  |  ")+(sweep.bad.length>6?"  (+"+(sweep.bad.length-6)+" more)":""):""));

  /* ================= a whole job, read against its own clock ================= */
  const runJob=async night=>page.evaluate(wantNight=>{
    S.money=5e7;S.rep=500;SET.speed=4;
    for(let i=0;i<60&&recruits().length<crewSeats();i++){
      const c=S.roster.find(x=>x.status==="available"&&!x._u);if(!c)break;c._u=true;
      c.status="crew";S.crewIds.push(c.id);}
    S.notices=[];S.modal=null;S.pendingJob=null;
    let j=null;
    // The board is seeded by week, so refreshing twice in the same week deals the same cards.
    // Moving the week on is what actually re-rolls it.
    for(let t=0;t<60&&!j;t++){
      S.week++;S.jobs=[];refreshJobs(true);
      j=S.jobs.find(x=>!x.final&&x.payout>BIG_MONEY&&x.tags.includes("night")===wantNight
        &&assessJob(x).canRun&&assessJob(x).team.length>=2)||null;
    }
    if(!j)return null;
    doExecute(j.id);tickerFinish();
    let g=0;
    while(S.pendingJob&&g++<8){
      const k=(S.pendingJob.answers||[]).length;
      const tw=pendingTwists(S.pendingJob)[k];if(!tw)break;
      twistChoose(0);tickerFinish();}
    const d=S.modal&&S.modal.data;if(d&&!d.done)tickerFinish();
    const e=S.modal&&S.modal.data;
    const lines=(e.narrative||[]).map(l=>({t:l.t,x:l.x,twist:!!l.twist}));
    return {night:wantNight,lines,
      dashes:lines.filter(l=>l.t==="— —").length,
      next:lines.filter(l=>/^NEXT /.test(l.t)).length};},night);

  for(const night of [true,false]){
    console.log("\n— a "+(night?"night":"daytime")+" job, line by line —");
    await fresh();
    const r=await runJob(night);
    if(!r){check(false,"found a "+(night?"night":"daytime")+" job worth over "+
      (await page.evaluate(()=>BIG_MONEY))+" to run");continue;}
    check(true,"ran a "+(night?"night":"daytime")+" job, "+r.lines.length+" lines of report");
    check(r.dashes===0,"every line in the report carries a time — none left at \"— —\"");
    // the clock only ever goes forward, until the day rolls over and says so
    const same=r.lines.filter(l=>!/^NEXT /.test(l.t)).map(l=>l.t);
    const mins=same.map(t=>+t.slice(0,2)*60+ +t.slice(3));
    let wraps=0;for(let i=1;i<mins.length;i++)if(mins[i]<mins[i-1])wraps++;
    check(wraps<=1,"the clock runs forward through the night"+(wraps?" and over midnight once":""));
    check(r.next>0,r.next+" line(s) of aftermath, stamped NEXT — the morning they have always talked about");
    const nextTxt=r.lines.filter(l=>/^NEXT /.test(l.t)).map(l=>l.x).join(" ");
    check(!/\bBy noon\b/.test(nextTxt)||/NEXT 0[0-9]/.test(r.lines.find(l=>/By noon/.test(l.x)).t),
      "and nothing on them says a time that has already gone");
    // the words in the block agree with the hour
    const block=r.lines.filter(l=>l.twist||/carries on|holds|settles|breathes|Back to it|resumes|room is still/.test(l.x));
    const hours=block.map(l=>+l.t.slice(0,2));
    const nightWords=block.filter(l=>/\bnight\b/i.test(l.x));
    check(block.length>0,block.length+" lines in the twist block, at "+hours.join(", ")+" hours");
    const wrong=nightWords.filter(l=>{const h=+l.t.slice(0,2);return !(h>=19||h<5);});
    check(wrong.length===0,"and not one of them calls it the night while the clock says otherwise"
      +(wrong.length?" — "+wrong.map(l=>l.t+" \""+l.x+"\"").join(" | "):""));
    if(nightWords.length)check(true,"  (it is night, and "+nightWords.length+" of them say so)");
    fs.writeFileSync(path.join(OUT,(night?"night":"day")+"-report.txt"),
      r.lines.map(l=>l.t+"  "+l.x).join("\n"));
  }

  /* ================= the recruiting trip has a clock too ================= */
  // Same fault, different feed: the flight and the city were timed, and then the trouble, the
  // handshake and the flight home were all stamped "— —", so there was no telling an hour's wait
  // in a bar from three days of one.
  console.log("\n— a week spent fetching somebody —");
  await fresh();
  const trip=await page.evaluate(()=>{
    S.money=5e7;S.rep=500;SET.speed=4;S.week=9;      // past the founding week, so a trip costs one
    // Trouble at the meeting is the half that was stamped with dashes, and it does not happen on
    // every trip — so keep starting them until one goes wrong, and run that one.
    let T=null,first=null;
    for(const c of S.roster){
      if(c.status!=="available"||!canSign(c)||hireWhy(c))continue;
      first=first||c;
      S.pendingTrip=null;
      const t=startTrip(c);
      if(S.pendingTrip&&S.pendingTrip.snag){T=t;break;}
    }
    if(!T){if(!first)return null;S.pendingTrip=null;T=startTrip(first);}
    const pre=(T.narrative||[]).map(l=>l.t);
    const snag=!!(S.pendingTrip&&S.pendingTrip.snag);
    // straight to finishTrip: tripChoose reads the answer off an open modal, and this drive
    // builds the trip without one
    finishTrip(S.pendingTrip,snag?0:null,T);
    return {snag,pre,all:(T.narrative||[]).map(l=>({t:l.t,x:l.x})),
      outcome:T.outcome};});
  if(!trip)check(false,"found somebody on the roster to go and fetch");
  else{
    check(trip.all.length>trip.pre.length,"a trip run end to end: "+trip.all.length+" lines, "
      +(trip.snag?"with trouble on it":"no trouble")+", ended "+trip.outcome);
    const dashes=trip.all.filter(l=>l.t==="— —");
    check(dashes.length===0,"every line of it carries a day and an hour"
      +(dashes.length?" — "+dashes.length+" still at dashes: \""+dashes[0].x.slice(0,60)+"…\"":""));
    check(trip.all.every(l=>/^(MON|TUE|WED|THU|FRI|SAT|SUN) [0-9][0-9]:[0-9][0-9]$/.test(l.t)),
      "each one reading DAY HH:MM, like the rest of the feed");
    // and it runs forward: a recruiting trip is days, so the day name may turn over
    const idx=["MON","TUE","WED","THU","FRI","SAT","SUN"];
    const mins=trip.all.map(l=>idx.indexOf(l.t.slice(0,3))*1440+ +l.t.slice(4,6)*60+ +l.t.slice(7));
    let back=0;for(let i=1;i<mins.length;i++)if(mins[i]<mins[i-1])back++;
    check(back<=1,"and the week runs forwards"+(back?" (once round the day names)":""));
    console.log(trip.all.map(l=>"    "+l.t+"  "+l.x.slice(0,72)).join("\n"));
  }

  /* ============ and the times survive putting the game down ============ */
  // The times are written on S.pendingJob. A field that isn't saved reverts silently on reload —
  // which is exactly how the trade school once took two ranks off somebody and handed back
  // nothing — and here it would revert to the row of dashes this build exists to remove.
  console.log("\n— a job picked up after a reload —");
  await fresh();
  const mid=await page.evaluate(()=>{
    S.money=5e7;S.rep=500;SET.speed=4;
    for(let i=0;i<60&&recruits().length<crewSeats();i++){
      const c=S.roster.find(x=>x.status==="available"&&!x._u);if(!c)break;c._u=true;
      c.status="crew";S.crewIds.push(c.id);}
    S.notices=[];S.modal=null;S.pendingJob=null;
    let j=null;
    for(let t=0;t<60&&!j;t++){
      S.week++;S.jobs=[];refreshJobs(true);
      j=S.jobs.find(x=>!x.final&&x.payout>BIG_MONEY&&assessJob(x).canRun&&assessJob(x).team.length>=2)||null;}
    if(!j)return null;
    doExecute(j.id);tickerFinish();
    if(!S.pendingJob||!pendingTwists(S.pendingJob).length)return {none:true};
    twistChoose(0);tickerFinish();                 // answer one and leave the job standing
    save();
    const d=S.modal&&S.modal.data;
    return {times:(d.narrative||[]).map(l=>l.t),awaiting:!!(d&&d.awaiting),
      twists:pendingTwists(S.pendingJob).length,answers:(S.pendingJob.answers||[]).length};});
  if(!mid||mid.none){check(false,"found a job with a twist to leave half-answered");}
  else{
    check(mid.answers>=1,"a job left standing with "+mid.answers+" of "+mid.twists+" answered");
    check(mid.times.every(t=>t!=="— —"),"and every line of it timed before the reload");
    await page.reload();
    await page.waitForSelector('[data-act="continue"]',{timeout:20000});
    await page.click('[data-act="continue"]');
    await page.waitForSelector(".topbar");
    await page.waitForTimeout(300);
    const after=await page.evaluate(()=>{
      const d=S.modal&&S.modal.data;return d?(d.narrative||[]).map(l=>l.t):null;});
    check(after&&after.length>0,"the game comes back up on the same unfinished job");
    check(after&&after.every(t=>t!=="— —"),"with the same clock on it, not a row of dashes"
      +(after?" — "+after.filter(t=>t==="— —").length+" dashes":""));
    check(after&&JSON.stringify(after)===JSON.stringify(mid.times),
      "and the very same times, line for line");
  }

  /* ================= and the strip opens files ================= */
  console.log("\n— the crew strip, above the postings —");
  await fresh();
  await page.evaluate(()=>{
    for(let i=0;i<60&&recruits().length<crewSeats();i++){
      const c=S.roster.find(x=>x.status==="available"&&!x._u);if(!c)break;c._u=true;
      c.status="crew";S.crewIds.push(c.id);}
    S.modal=null;S.notices=[];S.stripHidden=false;S.tab="jobs";S.jobOpen=null;render();});
  await drain();
  await page.waitForTimeout(250);
  // Nothing may be standing over the board, or the click that follows proves only that a scrim
  // swallows clicks — which it is supposed to.
  check(await page.evaluate(()=>!document.querySelector(".scrim")),"nothing is open over the board");
  const strip=await page.evaluate(()=>[...document.querySelectorAll(".smc")].map(e=>({
    act:e.getAttribute("data-act"),id:e.getAttribute("data-id"),
    role:e.getAttribute("role"),tab:e.getAttribute("tabindex"),title:e.getAttribute("title"),
    cursor:getComputedStyle(e).cursor})));
  check(strip.length>1,strip.length+" cards on the strip");
  check(strip.every(c=>c.act==="open-recruit"&&c.id),"every one of them opens that person's file");
  check(strip.every(c=>c.role==="button"&&c.tab==="0"),"reachable by keyboard, and says it is a button");
  check(strip.every(c=>c.cursor==="pointer"),"and looks like one under the pointer");
  check(strip.some(c=>c.id==="YOU"),"you are on it too, with your own file");
  const before=await page.evaluate(()=>Math.round(window.scrollY));
  await page.click('.smc[data-id="'+strip[1].id+'"]');
  await page.waitForTimeout(250);
  const opened=await page.evaluate(()=>({type:S.modal&&S.modal.type,id:S.modal&&S.modal.id,
    txt:(document.querySelector(".modal")||{}).innerText||""}));
  check(opened.type==="recruit"&&opened.id===strip[1].id,"clicking one opens the right file ("+strip[1].id+")");
  check(/Trade/i.test(opened.txt)&&/Languages/i.test(opened.txt),"the whole file");
  await page.screenshot({path:OUT+"/1-strip-file.png"});
  await page.click('.modal [data-act="scrim"].btn');
  await page.waitForTimeout(300);
  check(await page.evaluate(()=>!S.modal),"closing it puts it away");
  check(await page.evaluate(()=>S.tab)==="jobs","and leaves you on the board");
  check(Math.abs(await page.evaluate(()=>Math.round(window.scrollY))-before)<=4,"where you were standing");
  // role="button" is a promise about the keyboard, so press the key rather than read the attribute
  await page.evaluate(id=>document.querySelector('.smc[data-id="'+id+'"]').focus(),strip[2].id);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);
  check(await page.evaluate(()=>S.modal&&S.modal.type)==="recruit"
    &&await page.evaluate(()=>S.modal&&S.modal.id)===strip[2].id,
    "and Enter on a focused card opens it too ("+strip[2].id+")");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  check(await page.evaluate(()=>!S.modal),"Escape puts it away again");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

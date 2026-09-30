/* A CASE IS NOT AN ARREST — the law, repriced.

   WHAT WAS WRONG, because the test only makes sense next to it: "Give them to the law" was a free
   button that ended a rival instantly and with certainty, needing nothing but a detective — who
   turns up at heat 30 or ranking 40. Its advertised cost was 34 on the file, and from a file of 0
   that leaves raidAt() at 100, exactly where it was. It did not cross its own first threshold and
   then it decayed away at 0.9 a week. So it was free, and it did not merely make the million-dollar
   elimination pointless, it made all four of the other endings pointless.

   WHAT THIS ASSERTS. Filing opens a case and arrests nobody. The case runs four to eight weeks with
   the rival still on the board. It lands if you are still within 15 of their standing, and it
   collapses if you are not — and a collapsed case is gone for good, on that rival, forever. The
   walking-in is the part that is certain: 34 on the file the same day, and a floor of 20 under it
   that survives both endings and every quiet week after.

   The floor is the half of this that is easy to write and easy to get wrong, so it is asserted
   twice: once for a case that landed and once for a case that collapsed, because it is about the
   walking in and not about the outcome.
*/
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const FILE=path.resolve(__dirname,process.argv[2]||GAME);
const OUT=path.join(__dirname,"shots98");fs.mkdirSync(OUT,{recursive:true});
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

  /* A rival and a detective, put on the board directly. Both arrive on their own — a rival at
     "Small time", a detective at heat 30 or ranking 40 — but waiting for them is forty weeks of
     clicking and what is under test is what happens after they are there. */
  const setUp=await page.evaluate(()=>{
    S.modal=null;S.event=null;S.notices=[];
    S.rep=100;S.heat=0;S.money=9e6;S.fileFloor=0;
    S.rivalSeq=9;
    S.rivals=[{id:"RV9",boss:"Ada Kross",last:"Kross",gender:"F",name:"the Kross outfit",
      standing:90,took:4,since:1,n:1,lead:0}];
    S.det={name:"Detective Muir",full:"Jo Muir",gender:"F",file:0,since:1};
    return {file:detFile(),raid:raidAt(),floor:S.fileFloor||0,rep:S.rep,standing:rivals()[0].standing};});
  check(setUp.file===0&&setUp.raid===100,
    "before anybody walks in: a file of "+setUp.file+" and a raid at heat "+setUp.raid);

  console.log("— filing does not arrest anybody —");
  const filed=await page.evaluate(()=>{
    S.tab="log";render();
    rivalBurn("RV9");
    const rv=rivalById("RV9");
    return {still:!!rv,beat:(S.beat||[]).length,
      cs:rv&&rv.case?Object.assign({},rv.case):null,
      file:detFile(),floor:S.fileFloor||0,raid:raidAt(),week:S.week};});
  check(filed.still===true&&filed.beat===0,
    "Ada Kross is still on the board after you told the detective everything");
  check(!!filed.cs&&filed.cs.due-filed.cs.filed>=4&&filed.cs.due-filed.cs.filed<=8,
    "what opened is a case, due in "+(filed.cs?filed.cs.due-filed.cs.filed:"?")+" weeks");
  check(filed.file===34,"and the file on YOU is "+filed.file+" the same day");
  check(filed.floor===20,"with a floor of "+filed.floor+" under it — you were in the room");

  /* THE FLOOR IS THE POINT. The old cost decayed at 0.9 a week whenever heat was under 25, so it
     went away entirely and the button was free in the strict sense. Sixty quiet weeks, asked of
     the game's own weekly decay rather than of arithmetic here. */
  console.log("— and sixty quiet weeks do not take it away —");
  const quiet=await page.evaluate(()=>{
    const rng=mulberry32(5);
    S.heat=0;
    for(let i=0;i<60;i++)detWatch(rng);
    return {raw:Math.round(S.det.file),file:detFile(),floor:S.fileFloor||0,raid:raidAt()};});
  check(quiet.raw<=0,"the detective's own number decays to "+quiet.raw+", the way it always did");
  check(quiet.file===20,"but the file reads "+quiet.file+", because the floor does not decay");
  check(quiet.raid===100,"and one case is not a punishment — the raid is still at heat "+quiet.raid);

  console.log("— the case runs while they go on working —");
  const mid=await page.evaluate(()=>{
    const rv=rivalById("RV9");
    const out=[];
    // Walk the weeks the case has left, keeping the player comfortably clear so it survives.
    while(S.week<rv.case.due-1){
      S.rep=100;rv.standing=90;
      S.week++;rivalCaseTick(mulberry32(S.week));
      out.push({week:S.week,open:!!rv.case,gone:!!rv.caseGone});
    }
    return {steps:out,open:!!rv.case,alive:!!rivalById("RV9"),beat:(S.beat||[]).length};});
  check(mid.steps.every(s=>s.open)&&mid.open===true,
    "week after week it is still only a case ("+mid.steps.length+" of them)");
  check(mid.alive===true&&mid.beat===0,"and Ada Kross is still taking postings off the board");

  console.log("— and then it lands —");
  const landed=await page.evaluate(()=>{
    const rv=rivalById("RV9");
    S.week=rv.case.due;
    rivalCaseTick(mulberry32(1));
    const b=(S.beat||[])[0]||{};
    return {alive:!!rivalById("RV9"),how:b.how,boss:b.boss,
      file:detFile(),floor:S.fileFloor||0,
      notice:(S.notices||[]).map(n=>n.h||"").join(" | ")};});
  check(landed.alive===false&&landed.how==="burned",
    landed.boss+" is finished, and the reckoning records it as \""+landed.how+"\"");
  check(landed.floor===20,"the floor stays at "+landed.floor+" after it lands — it is about the walking in");

  /* THE OTHER ENDING, which is the whole reason the elimination exists again: a rival who gets
     clear of you while the case is open beats it, and beats it permanently. */
  console.log("— a second one, who gets clear of you while it is open —");
  const second=await page.evaluate(()=>{
    S.notices=[];S.modal=null;
    S.rivals=[{id:"RV10",boss:"Tomas Vane",last:"Vane",gender:"M",name:"the Vane outfit",
      standing:100,took:2,since:1,n:2,lead:0}];
    S.rep=100;
    rivalBurn("RV10");
    const rv=rivalById("RV10");
    return {open:!!rv.case,due:rv.case.due,file:detFile()};});
  check(second.open===true,"filed on Tomas Vane too — the detective takes a second one");

  const collapsed=await page.evaluate(()=>{
    const rv=rivalById("RV10");
    S.notices=[];
    rv.standing=S.rep+BURN.collapseGap;          // exactly the gap, not a point more
    S.week++;
    rivalCaseTick(mulberry32(2));
    return {open:!!rv.case,gone:!!rv.caseGone,hostile:!!rv.hostile,
      alive:!!rivalById("RV10"),beat:(S.beat||[]).length,
      gap:rv.standing-S.rep,
      notice:(S.notices||[]).map(n=>n.h||"").join(" | "),
      text:(S.notices||[]).map(n=>n.text||"").join(" "),
      file:detFile(),floor:S.fileFloor||0};});
  check(collapsed.open===false&&collapsed.gone===true,
    "and at "+collapsed.gap+" clear of you the case is dead — your word against a bigger name");
  check(collapsed.alive===true&&collapsed.beat===1,
    "Tomas Vane is not arrested and not finished; the reckoning still lists only the one");
  check(/collapsed/i.test(collapsed.notice),"a card says so: \""+collapsed.notice+"\"");
  /* And its button goes somewhere. A notice's go: is assigned straight to S.tab, so a tab key that
     does not exist is a button that empties the screen — and the dashboard's key is "log", which is
     not what anybody writing a new card guesses first. Asked of the real handler rather than of a
     list of names, because a list of names is the thing that goes stale. */
  const goes=await page.evaluate(()=>{
    const n=(S.notices||[])[0];if(!n||!n.go)return {none:true};
    S.tab=n.go;render();
    const root=document.getElementById("root");
    return {to:n.go,text:(root?root.innerText:"").trim().length,tabs:!!document.querySelector(".topbar")};});
  check(goes.text>200&&goes.tabs===true,
    'and its button goes to a screen with something on it (tab "'+goes.to+'", '+goes.text+" characters)");
  check(collapsed.hostile===true,"and they know who walked in");
  check(collapsed.floor===20&&collapsed.file>=20,
    "the floor survives a case that came to nothing too ("+collapsed.file+", floor "+collapsed.floor+")");

  console.log("— and it cannot be filed twice —");
  const again=await page.evaluate(()=>{
    const rv=rivalById("RV10");
    const before=detFile();
    rivalBurn("RV10");                            // asked again, directly
    rv.standing=S.rep;                            // even with the gap closed right back up
    rivalBurn("RV10");
    return {open:!!rv.case,file:detFile(),before:before,gone:!!rv.caseGone};});
  check(again.open===false&&again.file===again.before,
    "filing again does nothing, even once they are back within reach of you");

  console.log("— what the card says before you commit —");
  const card=await page.evaluate(()=>{
    S.rivals=[{id:"RV11",boss:"Nell Okafor",last:"Okafor",gender:"F",name:"the Okafor outfit",
      standing:95,took:1,since:1,n:3,lead:0}];
    S.notices=[];S.modal=null;
    // The competition panel lives in the "law" fold of the DASHBOARD, whose tab key is "log"
    // — the fold is shut by default, so it has to be opened before the button exists at all.
    S.tab="log";foldToggle("law",false);render();
    const b=[...document.querySelectorAll('[data-act="rival-burn"]')].find(x=>x.dataset.id==="RV11");
    const body=document.body.innerText;
    return {btn:b?b.textContent.trim():null,off:b?b.disabled:null,body:body};});
  check(card.btn==="Give them to the law"&&card.off===false,
    "the button offers it: \""+card.btn+"\"");
  check(/Not an arrest — a case/.test(card.body),
    "and says in words on the screen, not in a tooltip, that it is not an arrest");
  check(/never\s+reads below 20 again/.test(card.body.replace(/\s+/g," ")),
    "and that the file keeps 20 of it whichever way it ends");
  await page.waitForTimeout(400);
  await page.screenshot({path:OUT+"/01-not-an-arrest.png",fullPage:false});

  const filedCard=await page.evaluate(()=>{
    rivalBurn("RV11");render();
    const b=[...document.querySelectorAll('[data-act="rival-burn"]')].find(x=>x.dataset.id==="RV11");
    return {btn:b?b.textContent.trim():null,off:b?b.disabled:null,body:document.body.innerText};});
  check(/^Filed · week/.test(filedCard.btn||"")&&filedCard.off===true,
    "once filed the button says so and is spent: \""+filedCard.btn+"\"");
  check(/An arrest comes about week/.test(filedCard.body),
    "and the card tells you which week to watch for");

  check(errs.length===0,"no page or console errors through any of it"+(errs.length?": "+errs.slice(0,3).join(" | "):""));
  await browser.close();
})();

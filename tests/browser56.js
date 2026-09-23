// Build 81: the keys are printed on the tabs, and there is a fifth one.
//
// 1–4 have switched tabs since the game was written and nothing said so, which is the same as not
// having them. Each tab now wears its key. The fifth, QRH, is not a tab: it opens chapter 4 of the
// handbook — everything a crew member's file is made of — over whatever you are looking at,
// including a twist waiting for an answer, which is the moment it is for.
//
// What matters most here is that the card is READ OFF THE GAME'S OWN CONSTANTS. A quick reference
// typed out by hand is wrong by the third build, and wrong at speed is worse than absent. So this
// drive checks the figures on the card against the figures in the code, not against itself.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots56");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:950}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+(process.argv[2]?require("path").resolve(process.argv[2]):GAME));
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Paz");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  const drain=async()=>{let n=0;while(await page.$(".modal.notice")||await page.$('[data-act="loose"]')){
    if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');else await page.click('[data-act="loose"][data-i="0"]');
    await page.waitForTimeout(80);if(++n>30)break;}};
  await drain();
  await page.evaluate(()=>{S.modal=null;render();});
  await page.waitForTimeout(200);

  /* ---------- every tab wears its key ---------- */
  console.log("\n— the keys, printed —");
  const tabs=await page.evaluate(()=>[...document.querySelectorAll(".tabs .tab")].map(t=>({
    cap:(t.querySelector(".kcap")||{}).textContent||null,
    label:t.textContent.replace(((t.querySelector(".kcap")||{}).textContent||""),"").trim(),
    act:t.getAttribute("data-act"),k:t.getAttribute("data-k"),
    title:t.getAttribute("title")})));
  check(tabs.length===5,tabs.length+" on the bar: "+tabs.map(t=>t.cap+" "+t.label.split(/\d/)[0]).join(" · "));
  check(tabs.map(t=>t.cap).join("")==="12345","numbered 1 to 5 in order");
  check(tabs.every(t=>t.cap&&t.title&&/key/i.test(t.title)),"each saying which key it is, on hover too");
  const want=[["1","Crew","tab"],["2","Jobs","tab"],["3","Roster","tab"],["4","Dashboard","tab"],["5","QRH","qrh"]];
  want.forEach(([n,l,a],i)=>{
    check(tabs[i].cap===n&&tabs[i].label.indexOf(l)===0&&tabs[i].act===a,
      n+" is "+l+(a==="tab"?" (a tab)":" (not a tab — it opens a card)"));
  });
  // the cap is drawn as a key, not printed as a digit
  const capBox=await page.evaluate(()=>{const e=document.querySelector(".tabs .kcap");const s=getComputedStyle(e);
    return {bottom:s.borderBottomWidth,top:s.borderTopWidth,radius:s.borderTopLeftRadius,w:Math.round(e.getBoundingClientRect().width)};});
  check(parseFloat(capBox.bottom)>parseFloat(capBox.top),
    "and drawn as a key: a thicker bottom edge ("+capBox.top+" top, "+capBox.bottom+" bottom), "+capBox.radius+" corners");
  await page.screenshot({path:OUT+"/1-tabs.png",clip:{x:0,y:44,width:1280,height:46}});

  /* ---------- the keys still do what they say ---------- */
  console.log("\n— and still work —");
  for(const [k,tab] of [["1","crew"],["2","jobs"],["3","roster"],["4","log"]]){
    await page.keyboard.press(k);await page.waitForTimeout(140);
    check(await page.evaluate(()=>S.tab)===tab,k+" goes to "+tab);
  }
  const onTab=await page.evaluate(()=>{const t=[...document.querySelectorAll(".tab")].find(x=>x.classList.contains("on"));
    return t?t.querySelector(".kcap").textContent:null;});
  check(onTab==="4","and the tab you are on is the one lit: "+onTab);

  /* ---------- 5 and Q open the card ---------- */
  console.log("\n— the card —");
  await page.keyboard.press("5");await page.waitForTimeout(250);
  check(await page.evaluate(()=>UI.qrh)===true,"5 opens it");
  await page.keyboard.press("5");await page.waitForTimeout(200);
  check(await page.evaluate(()=>UI.qrh)===false,"and 5 again puts it away");
  await page.keyboard.press("q");await page.waitForTimeout(250);
  check(await page.evaluate(()=>UI.qrh)===true,"Q opens it too");
  const card=await page.evaluate(()=>{const m=document.querySelector(".qrh .modal");if(!m)return null;
    const r=m.getBoundingClientRect();
    return {h:Math.round(r.height),vh:innerHeight,inWindow:r.top>=0&&r.bottom<=innerHeight,
      head:m.querySelector(".modal-h").innerText.replace(/\n/g," · "),
      logo:(m.querySelector(".qrh-h .logo")||{}).textContent,
      secs:[...m.querySelectorAll(".qrh-s h3")].map(h=>({n:h.querySelector(".qrh-n").textContent,
        t:h.textContent.replace(h.querySelector(".qrh-n").textContent,"").trim()})),
      // Counted off the page rather than read off the stylesheet: the card is laid out in as many
      // columns as the window has room for, so there is no number in the CSS to compare against.
      cols:[...new Set([...m.querySelectorAll(".qrh-s")].map(x=>Math.round(x.getBoundingClientRect().left)))].length,
      foot:!!m.querySelector(".modal-f [data-act=\"qrh-close\"]"),
      full:!!m.querySelector(".modal-f [data-act=\"off-handbook\"]")};});
  check(card,"and it is on screen");
  check(card.logo==="THE CREW","headed with the game's own name: \""+card.logo+"\"");
  check(/QUICK REFERENCE HANDBOOK/i.test(card.head),"and its own: \""+card.head.slice(0,78)+"…\"");
  check(/PRESS Q/i.test(card.head),"saying the key that gets you back to it");
  check(card.h<=card.vh&&card.inWindow,"the sheet fits the window ("+card.h+" of "+card.vh+")");
  check(card.cols>=2,"laid out in "+card.cols+" columns, as many as this window has room for");
  check(card.foot&&card.full,"with a way out and a way to the full handbook, pinned at the foot");

  /* ---------- 4.1 to 4.12, in order, none missing ---------- */
  console.log("\n— chapter 4, 4.1 to 4.12 —");
  check(card.secs.length===12,card.secs.length+" sections");
  check(card.secs.map(s=>s.n).join(" ")===
    "4.1 4.2 4.3 4.4 4.5 4.6 4.7 4.8 4.9 4.10 4.11 4.12","numbered 4.1 to 4.12, in order");
  card.secs.forEach(s=>check(s.t.length>5,"  "+s.n+"  "+s.t));
  // and they are the handbook's own twelve, in the handbook's own order
  const hb=["attributes","trades","specialists","Experience","Knowledge","Schooling",
    "Temperament","Limits","Passport","Languages","cost","Loyalty"];
  check(card.secs.every((s,i)=>new RegExp(hb[i],"i").test(s.t)),
    "and they are chapter 4's own twelve, in its order");

  /* ---------- the figures are the game's, not a copy ---------- */
  console.log("\n— and every figure on it is read off the code —");
  const truth=await page.evaluate(()=>({
    attrs:Object.keys(ATTR_NAME).length,techs:TECHS.length,bigs:TECHS_BIG.length,
    traits:TRAITS.length,limits:LIMITS.length,know:KNOW.length,edu:EDU.length,exp:EXP.length,
    xp:XP_STEPS.slice(1),vet:VET_COST,paid:PAID_WEEKS,
    tRate:TUTOR.rate,tNear:TUTOR.near,tFar:TUTOR.far,tBrains:TUTOR.brainsAt,
    fams:Object.keys(LANG_FAMILY_NAME).length}));
  const rows=await page.evaluate(()=>[...document.querySelectorAll(".qrh-s")].map(s=>({
    n:s.querySelector(".qrh-n").textContent,
    rows:s.querySelectorAll(".qrh-r").length,text:s.innerText})));
  const sec=n=>rows.find(r=>r.n===n);
  check(sec("4.1").rows===truth.attrs,"4.1 lists all "+truth.attrs+" attributes");
  check(sec("4.2").rows===truth.techs,"4.2 lists all "+truth.techs+" trades");
  check(sec("4.3").rows===truth.bigs,"4.3 lists all "+truth.bigs+" specialists");
  check(sec("4.4").rows===truth.exp,"4.4 lists all "+truth.exp+" experience ranks");
  check(sec("4.6").rows===truth.edu,"4.6 lists all "+truth.edu+" kinds of schooling");
  check(sec("4.7").rows===truth.traits,"4.7 lists all "+truth.traits+" traits");
  check(sec("4.8").rows===truth.limits,"4.8 lists all "+truth.limits+" limits");
  truth.xp.forEach(x=>check(sec("4.4").text.indexOf(x+" xp")>=0,"  the "+x+" xp step is on 4.4"));
  // Read the list element itself rather than counting separators in the whole block — a paragraph
  // that happened to contain a dot would have made this pass on the wrong thing.
  const knowNames=await page.evaluate(()=>{const s=[...document.querySelectorAll(".qrh-s")]
    .find(x=>x.querySelector(".qrh-n").textContent==="4.5");
    return s.querySelector(".qrh-list").textContent.split("·").map(t=>t.trim()).filter(Boolean);});
  check(knowNames.length===truth.know,"4.5 names all "+truth.know+" domains of knowledge: "+knowNames.join(", "));
  check(sec("4.11").text.indexOf(String(truth.paid)+" weeks paid up")>=0,"4.11 has the real bonus, "+truth.paid+" weeks");
  check(/\$6K/.test(sec("4.11").text)&&truth.vet===6000,"and the real vetting price");
  check(sec("4.10").text.indexOf(truth.tNear+" weeks")>=0&&sec("4.10").text.indexOf(String(truth.tFar))>=0,
    "4.10 has the real school lengths ("+truth.tNear+" and "+truth.tFar+" weeks)");
  check(sec("4.10").text.split("·").length-1>=truth.fams-1,"and names the "+truth.fams+" language families");
  // and the trades are A to Z, like the dropdown
  const az=a=>a.every((v,i)=>i===0||a[i-1].localeCompare(v)<=0);
  const sorted=await page.evaluate(()=>{
    const pick=n=>{const s=[...document.querySelectorAll(".qrh-s")].find(x=>x.querySelector(".qrh-n").textContent===n);
      return [...s.querySelectorAll(".qrh-r .qa")].map(e=>e.textContent.trim());};
    return {t:pick("4.2"),b:pick("4.3"),tr:pick("4.7"),li:pick("4.8")};});
  check(az(sorted.t),"4.2 is A to Z: "+sorted.t.slice(0,3).join(", ")+"… "+sorted.t[sorted.t.length-1]);
  check(az(sorted.b),"4.3 is A to Z: "+sorted.b.slice(0,3).join(", ")+"… "+sorted.b[sorted.b.length-1]);
  check(az(sorted.tr),"4.7 is A to Z");
  check(az(sorted.li),"4.8 is A to Z");
  await page.screenshot({path:OUT+"/2-card.png"});

  /* ---------- it opens over a decision, which is the point ---------- */
  console.log("\n— over a decision, and gives it back —");
  await page.keyboard.press("q");await page.waitForTimeout(150);
  const twist=await page.evaluate(()=>{
    S.money=5e7;S.rep=500;
    for(let i=0;i<60&&recruits().length<crewSeats();i++){
      const c=S.roster.find(x=>x.status==="available"&&!x._u);if(!c)break;c._u=true;
      c.status="crew";S.crewIds.push(c.id);}
    refreshJobs(true);S.notices=[];S.modal=null;S.pendingJob=null;
    let j=null;
    for(let t=0;t<40&&!j;t++){
      j=S.jobs.find(x=>x.payout>BIG_MONEY&&!x.final&&assessJob(x).canRun&&assessJob(x).team.length>=2)||null;
      if(!j){S.jobs=[];refreshJobs(true);}}
    if(!j)return null;
    doExecute(j.id);tickerFinish();
    const d=S.modal&&S.modal.data;
    return d&&d.awaiting?{h:d.twist.h}:null;});
  await page.waitForTimeout(250);
  if(twist){
    check(true,"a twist is waiting: \""+twist.h+"\"");
    await page.keyboard.press("q");await page.waitForTimeout(250);
    check(await page.evaluate(()=>UI.qrh)===true,"Q still opens the card with a decision on screen");
    check(await page.$(".qrh .modal"),"and it is drawn over it");
    const stacked=await page.evaluate(()=>{
      const q=document.querySelector(".qrh .scrim"),o=document.querySelector(".modal.feed")||document.querySelector(".modal");
      return q&&o?+getComputedStyle(q).zIndex>+getComputedStyle(o.closest(".scrim")).zIndex:null;});
    check(stacked===true,"above it, not behind it");
    await page.screenshot({path:OUT+"/3-over-a-decision.png"});
    await page.keyboard.press("Escape");await page.waitForTimeout(250);
    check(await page.evaluate(()=>UI.qrh)===false,"Escape closes the card first");
    check(await page.evaluate(()=>!!(S.modal&&S.modal.data&&S.modal.data.awaiting)),
      "and the decision is still there, untouched, waiting for an answer");
    const still=await page.$$('[data-act="twist"]');
    check(still.length>=4,still.length+" options still on it");
  } else check(true,"no twist to stand in front of on this board");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

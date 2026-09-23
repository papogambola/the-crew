// Build 76: the language school, driven rather than described.
//
// A job in a country nobody on the crew speaks is −8 on the night, and −14 if the job is all talk.
// This screen is how you fix that, so what is checked here is that it opens with the languages a
// posting wants THIS WEEK, that the price and the weeks it prints are the ones actually charged,
// and that clicking through really does take somebody out of the field and bring them back
// speaking it.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots52");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
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
  const clearDesk=()=>page.evaluate(()=>{
    S.modal=null;S.notices=[];S.apply=null;S.clash=null;S.revenge=null;S.event=null;S.talk=null;S.tutor=null;
    if(Array.isArray(S.loose))S.loose=[];
    render();});
  const drain=async()=>{let n=0;while(await page.$(".modal.notice")||await page.$('[data-act="loose"]')){
    if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');else await page.click('[data-act="loose"][data-i="0"]');
    await page.waitForTimeout(80);if(++n>30)break;}};
  await drain();

  /* ---------- get a crew together ---------- */
  const crew=await page.evaluate(()=>{
    S.money=5e7;
    for(let i=0;i<60&&recruits().filter(c=>c.status==="crew").length<3;i++){
      const c=S.roster.find(x=>x.status==="available"&&canApproach(x));
      if(!c)break;hire(c.id);
      const T=S.modal&&S.modal.data;if(T&&T.snag)tripChoose(0);else if(T)tickerFinish();
      S.modal=null;S.pendingTrip=null;
    }
    S.notices=[];S.modal=null;S.tab="crew";render();
    return recruits().filter(c=>c.status==="crew").map(c=>({id:c.id,first:c.first,langs:c.langs}));});
  check(crew.length>0,crew.length+" on the crew: "+crew.map(c=>c.first+" ("+c.langs.join("/")+")").join(", "));
  await clearDesk();
  await page.evaluate(()=>{S.tab="crew";render();});
  await page.waitForTimeout(200);

  /* ---------- the button is on the card, and says something useful ---------- */
  console.log("\n— the button —");
  const btn=await page.evaluate(()=>{const b=document.querySelector('[data-act="tutor"]');
    return b?{label:b.textContent.trim(),title:b.getAttribute("title"),disabled:b.hasAttribute("disabled"),id:b.getAttribute("data-id")}:null;});
  check(btn,"there is one on the crew card");
  check(btn&&btn.label==="Teach a language","and it says \""+(btn&&btn.label)+"\"");
  check(btn&&!btn.disabled,"and is live");
  check(btn&&btn.title&&btn.title.length>30,"with a reason to press it: \""+(btn&&btn.title)+"\"");
  // it sits beside the trade school, not in place of it
  // The player's own card has no buttons at all, so take the foot of a card that has this one.
  const both=await page.evaluate(()=>{const b=document.querySelector('[data-act="tutor"]');
    const c=b.closest(".foot")||b.parentElement;
    return [...c.querySelectorAll("[data-act]")].map(e=>e.getAttribute("data-act"));});
  check(both.indexOf("learn")>=0&&both.indexOf("tutor")>=0,"beside the trade school, not instead of it: "+both.join(", "));
  check(both.indexOf("drop")>both.indexOf("tutor"),"and Cut loose is still last");

  /* ---------- the screen ---------- */
  console.log("\n— the screen —");
  await page.click('[data-act="tutor"]');
  await page.waitForTimeout(250);
  check(await page.$(".modal"),"it opens");
  const scr=await page.evaluate(()=>{const m=document.querySelector(".modal");const r=m.getBoundingClientRect();
    return {text:m.innerText,h:r.height,vh:innerHeight,bottom:r.bottom,
      rows:[...m.querySelectorAll('[data-act="tutor-pick"]')].length,
      foot:!!m.querySelector('.modal-f [data-act="tutor-close"]')};});
  check(scr.rows>10,scr.rows+" languages offered");
  check(scr.h<=scr.vh,"the sheet fits the window ("+Math.round(scr.h)+" of "+scr.vh+")");
  check(scr.foot,"and its way out is pinned to the bottom like every other sheet");
  check(/speaks/i.test(scr.text),"it says what they speak already");
  // nothing they already speak is on the list
  const dupes=await page.evaluate(()=>{const c=byId(S.tutor.id);
    return [...document.querySelectorAll('[data-act="tutor-pick"]')].map(e=>e.getAttribute("data-k"))
      .filter(l=>(c.langs||[]).indexOf(l)>=0);});
  check(dupes.length===0,"and offers nothing they already speak"+(dupes.length?": "+dupes.join(", "):""));

  /* ---------- it opens with what the board wants ---------- */
  const wanted=await page.evaluate(()=>{
    const w=tutorWanted();
    const rows=[...document.querySelectorAll('[data-act="tutor-pick"]')].map(e=>e.getAttribute("data-k"));
    const first=rows.slice(0,Object.keys(w).length);
    return {keys:Object.keys(w),first:first,heading:/Wanted on the board/i.test(document.querySelector(".modal").innerText)};});
  if(wanted.keys.length){
    check(wanted.heading,"the board's own gaps come first, under their own heading");
    const missed=wanted.keys.filter(l=>wanted.first.indexOf(l)<0);
    check(missed.length===0,wanted.keys.length+" language(s) a posting needs this week, all at the top: "+wanted.keys.join(", "));
  } else check(true,"nothing on the board needs a language this crew hasn't got, this week");

  /* ---------- picking one prints the price, the weeks, and why that long ---------- */
  console.log("\n— what it costs, and why —");
  const pick=await page.evaluate(()=>{
    const e=document.querySelector('[data-act="tutor-pick"]');const l=e.getAttribute("data-k");
    const c=byId(S.tutor.id);
    const t=tutorWeeks(c,l);
    return {l:l,weeks:t.weeks,cost:tutorCost(c,l),via:t.via,why:t.why.length};});
  await page.click('[data-act="tutor-pick"]');
  await page.waitForTimeout(200);
  const detail=await page.evaluate(()=>document.querySelector(".modal").innerText);
  check(detail.indexOf(pick.l)>=0,pick.l+" is the one chosen");
  check(new RegExp(pick.weeks+" weeks").test(detail),"the sheet prints "+pick.weeks+" weeks");
  check(detail.indexOf(String(pick.cost).replace(/000$/,"K"))>=0||/\$/.test(detail),"and a price");
  check(pick.why>=1,"with "+pick.why+" reason(s) for the length, not a bare number");
  check(/loyalty/i.test(detail),"and says they come back with loyalty for it");
  // The row you have just chosen has to be the one you can read. It is black paper with white ink,
  // and every scrap on it — the price, the weeks, the countries — has to turn over with it. This is
  // measured rather than described, because the words passed every assertion while being invisible.
  const lum=c=>{const m=c.match(/(\d+)\D+(\d+)\D+(\d+)/);if(!m)return null;
    const f=v=>{v=+v/255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
    return 0.2126*f(m[1])+0.7152*f(m[2])+0.0722*f(m[3]);};
  const inks=await page.evaluate(()=>{const r=document.querySelector(".twist-opt.on");
    if(!r)return null;
    const bg=getComputedStyle(r).backgroundColor;
    const bits=[r,...r.querySelectorAll("b,.mono,.why,span")]
      .map(e=>({t:(e.textContent||"").trim().slice(0,24),c:getComputedStyle(e).color}))
      .filter(x=>x.t);
    return {bg,bits};});
  check(inks,"the chosen row is marked as chosen");
  const bgL=lum(inks.bg);
  const bad=inks.bits.filter(x=>{const l=lum(x.c);if(l===null)return false;
    const cr=(Math.max(l,bgL)+0.05)/(Math.min(l,bgL)+0.05);return cr<4.5;});
  check(bad.length===0,inks.bits.length+" pieces of text on it, all readable against it"
    +(bad.length?" — EXCEPT "+bad.map(x=>'"'+x.t+'" '+x.c).join(", "):""));
  const btnGo=await page.evaluate(()=>{const b=document.querySelector('[data-act="tutor-go"]');
    return b?{t:b.textContent.trim(),dis:b.hasAttribute("disabled")}:null;});
  check(btnGo&&!btnGo.dis,"and the way to send them: \""+(btnGo&&btnGo.t)+"\"");
  // The detail has to be where the eye already is. Clicking a row rebuilds the sheet and resets the
  // scroll, so a detail below thirty rows is one the player is carried away from as they ask for it.
  const place=await page.evaluate(()=>{const m=document.querySelector(".modal-b");
    const det=[...m.querySelectorAll(".factors")][0];
    const first=m.querySelector('[data-act="tutor-pick"]');
    return det&&first?{det:det.getBoundingClientRect().top,first:first.getBoundingClientRect().top,
      scroll:m.scrollTop,vh:innerHeight}:null;});
  check(place,"the reasons are printed on the sheet");
  // And they are weeks, said as weeks. Reusing the score list printed "+6" in the green the game
  // uses for a night going your way — six weeks off the field is not a bonus.
  const units=await page.evaluate(()=>{const f=document.querySelector(".modal-b .factors");
    if(!f)return null;
    const nums=[...f.querySelectorAll(".num")].map(e=>({t:e.textContent.trim(),cls:e.className}));
    return {nums,text:f.innerText};});
  check(units&&units.nums.length>0,"with their numbers on them");
  check(units&&units.nums.every(n=>/week/.test(n.t)),"every one of them said in weeks: "+(units&&units.nums.map(n=>n.t).join(", ")));
  check(units&&units.nums.every(n=>(/^\d/.test(n.t)?/minus/:/plus/).test(n.cls)),
    "and more weeks reads as a cost, not a bonus");
  check(units&&!/\bis\s*$/m.test(units.text),"and no sentence on it trails off mid-clause");
  check(place&&place.det<place.first,"above the list, not under it");
  check(place&&place.det>=0&&place.det<place.vh,"and on screen without scrolling (top "+Math.round(place&&place.det)+" of "+(place&&place.vh)+")");
  await page.screenshot({path:OUT+"/1-screen.png"});

  /* ---------- sending them ---------- */
  console.log("\n— sending them —");
  const pre=await page.evaluate(()=>({money:S.money,week:S.week,
    id:S.tutor.id,langs:byId(S.tutor.id).langs.slice(),loy:byId(S.tutor.id).loyalty}));
  await page.click('[data-act="tutor-go"]');
  await page.waitForTimeout(300);
  const sent=await page.evaluate(id=>{const c=byId(id);
    return {status:c.status,out:c.out,tutor:c.tutor,money:S.money,modal:!!S.modal};},pre.id);
  check(!sent.modal,"the sheet closes");
  check(pre.money-sent.money===pick.cost,"and charges exactly what it printed ("+(pre.money-sent.money)+")");
  check(sent.status==="learning"&&sent.tutor&&sent.tutor.to===pick.l,"they are out of the field, learning "+pick.l);
  check(sent.out===pre.week+pick.weeks,"until week "+sent.out+" — the "+pick.weeks+" weeks it printed");
  // and the card says so instead of offering to send them again
  await page.evaluate(()=>{S.tab="crew";render();});
  await page.waitForTimeout(200);
  const cardNow=await page.evaluate(id=>{const cards=[...document.querySelectorAll(".id")];
    const el=cards.find(e=>e.innerText.indexOf(byId(id).first)>=0);
    const b=el?el.querySelector('[data-act="tutor"]'):null;
    return {text:el?el.innerText:"",dis:b?b.hasAttribute("disabled"):null,title:b?b.getAttribute("title"):null};},pre.id);
  check(cardNow.dis===true,"and their own card will not send them twice: \""+cardNow.title+"\"");

  /* ---------- and back again ---------- */
  console.log("\n— and back again —");
  const back=await page.evaluate(id=>{
    const c=byId(id);
    S.week=c.out;
    if(c.status==="learning"&&S.week>=c.out){if(c.tutor)tutorFinish(c);else learnFinish(c);}
    return {status:c.status,langs:c.langs.slice(),loy:c.loyalty,tutor:c.tutor};},pre.id);
  check(back.langs.indexOf(pick.l)>=0,"they speak "+pick.l+" now: "+back.langs.join(", "));
  check(back.status==="crew"&&!back.tutor,"and are back in the field");
  check(back.loy>pre.loy,"loyalty "+pre.loy+" → "+back.loy+", for the money you spent on them");
  await page.evaluate(()=>{S.tab="crew";render();});
  await page.waitForTimeout(200);
  await page.screenshot({path:OUT+"/2-back.png"});

  /* ---------- the i button explains it ---------- */
  console.log("\n— and the i button knows what it is looking at —");
  await clearDesk();
  await page.evaluate(()=>{S.tutor={id:recruits().find(c=>c.status==="crew").id,to:null};S.modal={type:"tutor"};render();});
  await page.waitForTimeout(200);
  // The info panel is its own element above the sheet — reading ".modal" gets the sheet underneath.
  await page.click(".ibtn");
  await page.waitForTimeout(300);
  const info=(await page.textContent(".info-b")).replace(/\s+/g," ");
  check(info.length>400,"the i button has a card for this screen ("+info.length+" characters)");
  // Not "does it mention trades" — this card contrasts itself with the trade school on purpose.
  // Something only the trade school's card says, against something only this one says.
  check(/price list/i.test(info),"it is this screen's card: it calls itself a price list");
  check(/two ranks/i.test(info)===false,"and not the trade school's, which is the one that costs two ranks");
  check(/Romance|Germanic|Slavic/i.test(info),"which names the families");
  check(/−8|-8/.test(info)&&/\+6/.test(info),"and the numbers that make it worth doing");
  check(!/says no|refuse/i.test(info)||/Nobody refuses/i.test(info),"and is clear that nobody refuses this one");
  await page.screenshot({path:OUT+"/3-info.png"});
  await page.click('[data-act="info-close"].btn');await page.waitForTimeout(150);

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

// The joker. One card, once a game, for the position the game can otherwise leave you in with
// nothing to press: a name worth nothing, so nobody signs; no crew, so no job; no job, so no name.
// What this checks is that it is only playable out of exactly that position, that it does what it
// says and nothing more (the ranking is untouched), and that looking at it twice is not a re-roll.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots61");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json|version\.txt/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const w=(m.location()||{}).url||"";const t=m.text()+(w?" ["+w+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+(process.argv[2]?require("path").resolve(process.argv[2]):GAME));
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Paz");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  const drain=async()=>{let n=0;while(await page.$(".modal.notice")||await page.$('[data-act="loose"]')){
    if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');else await page.click('[data-act="loose"][data-i="0"]');
    await page.waitForTimeout(70);if(++n>30)break;}};
  await drain();
  const crewTab=async()=>{await page.evaluate(()=>{S.modal=null;S.notices=[];S.tab="crew";render();});await page.waitForTimeout(200);};
  // Every goal claimed up front. This suite is about the card, and a goal completing mid-test pays
  // ranking — which walked S.rep from 2 to 6 between two steps and made jokerWhy() report a
  // different condition than the one being tested.
  await page.evaluate(()=>{GOALS.forEach(g=>{goalsDone()[g.k]=true;});S.notices=[];});

  /* ---------- it is on the screen from the first week ---------- */
  console.log("— a card you know you hold —");
  await crewTab();
  const there=await page.evaluate(()=>{
    const j=document.querySelector(".joker");if(!j)return null;
    const r=j.getBoundingClientRect(),top=document.querySelector(".crewtop").getBoundingClientRect();
    return {live:j.classList.contains("live"),title:j.getAttribute("title"),
      word:(j.querySelector(".jk-w")||{}).textContent,
      index:[...j.querySelectorAll(".jk-i")].map(e=>e.textContent).join(""),
      face:!!j.querySelector(".jk-face svg"),
      rightOf:Math.round(r.left-top.left),topOf:Math.round(r.top-top.top),
      wide:Math.round(top.right-r.right)};});
  check(there,"the card is on the Crew screen in week one");
  check(there&&there.word==="Reassemble","and says what it is: "+(there&&there.word));
  check(there&&there.index==="JJ","with an index in two corners, like a card");
  check(there&&there.face,"and the face drawn by the game's own face builder, not pasted on");
  check(there&&there.wide<=1&&there.topOf<=1,"in the very top right corner ("+(there&&there.wide)+"px from the right edge, "+(there&&there.topOf)+"px from the top)");
  check(there&&!there.live,"not playable in week one, and it says why: \""+(there&&there.title)+"\"");
  await page.screenshot({path:OUT+"/1-crew-screen.png"});

  /* ---------- each condition on its own ---------- */
  console.log("\n— it takes all three, and it says which one is missing —");
  const why=async st=>{await page.evaluate(s=>{
      S.rep=s.rep;S.money=s.money;
      while(recruits().length>s.crew)S.crewIds.pop();
      S.jokerUsed=s.used||0;render();},st);
    await page.waitForTimeout(80);
    return page.evaluate(()=>({why:jokerWhy(),live:!jokerWhy()}));};
  const a=await why({rep:40,money:5e5,crew:0});
  check(!a.live&&/ranking 40/.test(a.why),"a name still worth something stops it: "+a.why);
  const b=await why({rep:2,money:5e5,crew:0});
  check(b.live,"ranking 2, no crew, money — playable");
  const c=await why({rep:2,money:150000,crew:0});
  check(!c.live&&/costs/.test(c.why),"exactly the price is not above it: "+c.why);
  const d=await why({rep:2,money:5e5,crew:0,used:9});
  check(!d.live&&/week 9/.test(d.why),"and once is once: "+d.why);

  /* ---------- the crew count, which needs people to add ---------- */
  const e=await page.evaluate(()=>{
    S.jokerUsed=0;S.rep=2;S.money=5e5;S.crewIds=[];   // rep set in the same breath as the crew
    for(let i=0;i<3;i++){const c=S.roster.find(x=>x.status==="available"&&!x._u);c._u=true;c.status="crew";S.crewIds.push(c.id);}
    render();return {n:recruits().length,why:jokerWhy()};});
  check(e.n===3&&/still have a crew/.test(e.why),"three on the crew stops it: "+e.why);
  await page.evaluate(()=>{while(recruits().length>1){const id=S.crewIds.pop();const c=byId(id);if(c)c.status="available";}render();});
  check(await page.evaluate(()=>!jokerWhy()),"one left, and the card comes up");

  /* ---------- looking twice is not a re-roll ---------- */
  console.log("\n— who comes, and the same who every time —");
  const empty=await page.evaluate(()=>{
    while(S.crewIds.length){const c=byId(S.crewIds.pop());if(c)c.status="available";}
    S.rep=2;S.money=5e5;S.jokerSeed=0;render();
    return {crew:recruits().length,seats:crewSeats(),why:jokerWhy()};});
  check(empty.crew===0&&!empty.why,"the crew is gone entirely — "+empty.seats+" places to fill, which is the worst of it");
  await crewTab();
  const live=await page.evaluate(()=>({live:document.querySelector(".joker").classList.contains("live")}));
  check(live.live,"the card is lit on the Crew screen");
  await page.click(".joker");
  await page.waitForTimeout(250);
  const first=await page.evaluate(()=>({type:S.modal&&S.modal.type,
    who:[...document.querySelectorAll(".joker-m .cards .id .nm")].map(n=>n.innerText.trim()),
    seed:S.jokerSeed,cost:(document.querySelector('[data-act="joker-play"]')||{}).innerText||""}));
  check(first.type==="joker","it opens its own screen");
  check(first.who.length===empty.seats,"all "+first.who.length+" places would be filled");
  const fits=await page.evaluate(()=>{
    const b=document.querySelector(".modal.joker-m .modal-b");if(!b)return null;
    const bb=b.getBoundingClientRect();
    return {wide:Math.round(document.querySelector(".modal.joker-m").getBoundingClientRect().width),
      below:[...document.querySelectorAll(".modal.joker-m .cards .id")]
        .filter(e=>e.getBoundingClientRect().bottom>bb.bottom+1).length};});
  check(fits&&fits.wide>900,"on a sheet wide enough for them ("+(fits&&fits.wide)+"px for "+first.who.length+")");
  check(fits&&fits.below===0,"with every one of them on it, none below the fold");
  check(/150K|150,000/.test(first.cost),"and the button names the price: \""+first.cost.trim()+"\"");
  await page.screenshot({path:OUT+"/2-the-card.png"});
  await page.click('.joker-m [data-act="scrim"].btn.ghost');
  await page.waitForTimeout(200);
  check(await page.evaluate(()=>!S.modal&&!S.jokerUsed),"declining keeps the card");
  await page.click(".joker");await page.waitForTimeout(250);
  const again=await page.evaluate(()=>[...document.querySelectorAll(".joker-m .cards .id .nm")].map(n=>n.innerText.trim()));
  check(JSON.stringify(again)===JSON.stringify(first.who),"and opening it again brings the same people, not a fresh draw");

  /* ---------- playing it ---------- */
  console.log("\n— the call —");
  const before=await page.evaluate(()=>{goalsDone().crew4=true;
    return {money:S.money,rep:S.rep,crew:recruits().length,week:S.week,seats:crewSeats()};});
  await page.click('[data-act="joker-play"]');
  await page.waitForTimeout(400);
  await drain();
  const after=await page.evaluate(()=>({money:S.money,rep:S.rep,crew:recruits().length,week:S.week,
    used:S.jokerUsed,modal:!!S.modal,
    log:((S.log||[]).find(l=>/Reassembled/.test(l.t))||{}).t||""}));
  check(after.crew===before.seats,"every place is filled — "+before.crew+" to "+after.crew+" of "+before.seats);
  check(before.money-after.money===150000,"it cost exactly $150K ("+(before.money-after.money)+")");
  check(after.rep===before.rep,"and paid no ranking of its own — "+before.rep+", still "+after.rep+": it buys people, not a name");
  check(after.week===before.week,"no week went by; a call is a call");
  check(after.used===before.week,"the card is spent, stamped week "+after.used);
  check(/Reassembled/.test(after.log),"and the log has it: \""+after.log.slice(0,88)+"…\"");
  await crewTab();
  const spent=await page.evaluate(()=>{const j=document.querySelector(".joker");
    return {spent:j.classList.contains("spent"),live:j.classList.contains("live"),
      stamp:(j.querySelector(".jk-x")||{}).textContent||""};});
  check(spent.spent&&!spent.live&&spent.stamp==="Played","the card stays on the screen, stamped Played");
  check(await page.evaluate(()=>{S.rep=1;S.money=9e5;return jokerWhy();})!=="","and cannot be played a second time");
  await page.screenshot({path:OUT+"/3-played.png"});

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

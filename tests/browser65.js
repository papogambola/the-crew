// The four things you can do to somebody used to come out one to a line with a ragged left edge,
// because the upkeep and the buttons shared a flex row and the buttons got whatever width was
// left over — which was never enough for two. The upkeep takes its own line now and the buttons
// take the card, which puts them two by two.
//
// The roster card's foot is the same class and must NOT have followed: a fee on the left and Hire
// on the right is two things facing each other, not a list.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots65");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1092,height:1100}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json|version\.txt/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const w=(m.location()||{}).url||"";const t=m.text()+(w?" ["+w+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+(process.argv[2]?require("path").resolve(process.argv[2]):GAME));
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Paz");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  await page.evaluate(()=>{
    S.money=5e6;S.week=66;
    for(let i=0;i<60&&recruits().length<crewSeats();i++){
      const c=S.roster.find(x=>x.status==="available"&&!x._u);if(!c)break;c._u=true;c.status="crew";S.crewIds.push(c.id);}
    GOALS.forEach(g=>{goalsDone()[g.k]=true;});
    S.milestones=S.milestones||{};["seats6","bigops","year2","year3","year4","found2"].forEach(k=>{S.milestones[k]=true;});
    S.notices=[];S.news=null;S.newsRead=S.week;S.modal=null;S.tab="crew";render();
    let g=0;while(S.notices&&S.notices.length&&g++<20){noticeDone();render();}
    S.modal=null;render();});
  await page.waitForTimeout(350);

  console.log("— the four things you can do, two by two —");
  const foot=await page.evaluate(()=>{
    const card=[...document.querySelectorAll(".id")].find(c=>c.querySelector(".foot.stack button"));
    if(!card)return null;
    const f=card.querySelector(".foot.stack"),up=f.querySelector("span"),bs=[...f.querySelectorAll("button")];
    const r=b=>b.getBoundingClientRect();
    const rows={};bs.forEach(b=>{const t=Math.round(r(b).top);(rows[t]=rows[t]||[]).push(b.innerText.trim());});
    const keys=Object.keys(rows).sort((a,b)=>a-b);
    const fr=f.getBoundingClientRect();
    return {labels:bs.map(b=>b.innerText.trim()),
      rows:keys.map(k=>rows[k]),
      upkeepText:up.innerText.trim(),
      upkeepOnOwnLine:Math.round(up.getBoundingClientRect().bottom)<=Math.round(r(bs[0]).top),
      upkeepLeft:Math.round(up.getBoundingClientRect().left-fr.left),
      rightEdges:keys.map(k=>{const last=rows[k].length;return Math.round(fr.right-r(bs.filter(b=>Math.round(r(b).top)==k).pop()).right);}),
      overflow:bs.some(b=>r(b).right>fr.right+1||r(b).left<fr.left-1)};});
  check(foot,"a crew card with the four buttons on it");
  check(foot&&foot.labels.length===4,"four of them: "+(foot&&foot.labels.join(" · ")));
  check(foot&&foot.rows.length===2,"in two rows, not four — "+(foot&&JSON.stringify(foot.rows)));
  check(foot&&foot.rows.every(r=>r.length===2),"two to a row");
  check(foot&&/^upkeep /.test(foot.upkeepText),"the upkeep is there: \""+(foot&&foot.upkeepText)+"\"");
  check(foot&&foot.upkeepOnOwnLine,"on its own line above them, which is what gives the buttons the card's width");
  check(foot&&foot.upkeepLeft<=12,"at the left edge of the card ("+(foot&&foot.upkeepLeft)+"px in)");
  check(foot&&foot.rightEdges.every(e=>e<=13),"and both rows finish flush at the right ("+(foot&&foot.rightEdges.join(", "))+"px from the edge)");
  check(foot&&!foot.overflow,"with nothing hanging off either side of the card");
  await page.screenshot({path:OUT+"/1-crew.png"});

  console.log("\n— the card lies above the crew, not on them —");
  const clear=await page.evaluate(()=>{
    const j=document.querySelector(".joker"),first=document.querySelector(".cards .id");
    if(!j||!first)return null;
    const R=e=>e.getBoundingClientRect();
    return {gap:Math.round(R(first).top-R(j).bottom),
      rowIsCardTall:Math.round(R(document.querySelector(".crewtop")).height)===Math.round(R(j).height)};});
  check(clear,"the card and the crew are both on the screen");
  check(clear&&clear.rowIsCardTall,"the header row is exactly as tall as the card in it, which is why this needs saying");
  check(clear&&clear.gap>=24,"and there is a clear band under it before the first crew card ("+(clear&&clear.gap)+"px)");

  console.log("\n— and the roster card, which is not a list ——");
  await page.evaluate(()=>{S.tab="roster";S.modal=null;render();});
  await page.waitForTimeout(300);
  const rost=await page.evaluate(()=>{
    const f=document.querySelector(".cards .id .foot");if(!f)return null;
    const fee=f.querySelector(".fee"),b=f.querySelector("button");
    if(!fee||!b)return null;
    const R=e=>e.getBoundingClientRect();
    return {stack:f.classList.contains("stack"),
      sameLine:Math.abs(Math.round(R(fee).top)-Math.round(R(b).top))<20,
      feeLeftOfButton:R(fee).right<=R(b).left+1,
      fee:fee.innerText.trim().split("\n")[0],btn:b.innerText.trim()};});
  check(rost,"the roster still puts a fee and a button on its cards");
  check(rost&&!rost.stack,"its foot did not take the crew card's new class");
  check(rost&&rost.sameLine&&rost.feeLeftOfButton,
    "so they still face each other on one line — "+(rost&&rost.fee)+" … "+(rost&&rost.btn));
  await page.screenshot({path:OUT+"/2-roster.png"});

  console.log("\n— narrower, where two will not fit —");
  // The labels are unchanged, so on a narrow window they must wrap rather than clip or overlap.
  await page.setViewportSize({width:960,height:1100});
  await page.evaluate(()=>{S.tab="crew";render();});
  await page.waitForTimeout(350);
  const tight=await page.evaluate(()=>{
    const card=[...document.querySelectorAll(".id")].find(c=>c.querySelector(".foot.stack button"));
    const f=card.querySelector(".foot.stack"),bs=[...f.querySelectorAll("button")];
    const fr=f.getBoundingClientRect();
    return {over:bs.some(b=>b.getBoundingClientRect().right>fr.right+1),
      rows:[...new Set(bs.map(b=>Math.round(b.getBoundingClientRect().top)))].length};});
  check(!tight.over,"at 960 wide nothing hangs off the card");
  check(tight.rows>=2,"they wrap instead ("+tight.rows+" rows)");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

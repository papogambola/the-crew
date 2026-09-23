// Build 80: the trade dropdown comes in its two kinds, A to Z inside each.
//
// Thirty job titles in the order the source file happens to declare them is a list you have to
// read all of before you know it does not have what you want. So: Trade and Specialist, and
// alphabetical inside each — which is how you look for a word you already have in mind. The
// nationality list, which is longer still, gets the same.
//
// The arrays themselves are not touched: TECHS' and COUNTRIES' own orders mean things elsewhere.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots55");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
const sorted=a=>a.every((v,i)=>i===0||a[i-1].localeCompare(v)<=0);
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+(process.argv[2]?require("path").resolve(process.argv[2]):GAME));
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();

  /* ---------- the very first screen: making yourself ---------- */
  console.log("\n— the new-game file —");
  await page.click('[data-act="begin"]');
  await page.waitForSelector("#ptech");
  const newGame=await page.evaluate(()=>{
    const read=sel=>{const s=document.querySelector(sel);
      return {groups:[...s.querySelectorAll("optgroup")].map(g=>({label:g.label,
        items:[...g.querySelectorAll("option")].map(o=>o.textContent)})),
        loose:[...s.children].filter(e=>e.tagName==="OPTION").map(o=>o.textContent)};};
    return {tech:read("#ptech"),nat:read("#pnat")};});
  check(newGame.tech.groups.length===2,"the trade picker comes in two kinds");
  check(newGame.tech.groups.map(g=>g.label).join(" / ")==="Trade / Specialist",
    "labelled: "+newGame.tech.groups.map(g=>g.label).join(" / "));
  check(newGame.tech.loose.length===0,"and nothing loose outside them on this one");
  newGame.tech.groups.forEach(g=>{
    check(g.items.length>0,g.label+": "+g.items.length+" of them");
    check(sorted(g.items),g.label+" reads A to Z — "+g.items.slice(0,4).join(", ")+"…, "+g.items[g.items.length-1]);
  });
  check(newGame.nat.loose.length>30&&sorted(newGame.nat.loose.map(t=>t.split(" · ")[0])),
    "and the "+newGame.nat.loose.length+" nationalities are A to Z too: "
    +newGame.nat.loose.slice(0,3).map(t=>t.split(" · ")[0]).join(", ")+"… "+newGame.nat.loose[newGame.nat.loose.length-1].split(" · ")[0]);
  await page.screenshot({path:OUT+"/1-newgame.png"});

  /* ---------- and the roster, which is where you go looking ---------- */
  console.log("\n— the roster filter —");
  await page.fill("#pname","Paz");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  let n=0;while((await page.$(".modal.notice")||await page.$('[data-act="loose"]'))&&n++<30){
    if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');else await page.click('[data-act="loose"][data-i="0"]');
    await page.waitForTimeout(80);}
  await page.evaluate(()=>{S.tab="roster";S.modal=null;render();});
  await page.waitForSelector("#ftech");
  const roster=await page.evaluate(()=>{
    const s=document.querySelector("#ftech");
    return {loose:[...s.children].filter(e=>e.tagName==="OPTION").map(o=>o.textContent),
      groups:[...s.querySelectorAll("optgroup")].map(g=>({label:g.label,
        items:[...g.querySelectorAll("option")].map(o=>o.textContent),
        keys:[...g.querySelectorAll("option")].map(o=>o.value)})),
      nat:[...document.querySelector("#fnat").querySelectorAll("option")].map(o=>o.textContent)};});
  check(roster.loose.length===1&&roster.loose[0]==="All","\"All\" stays at the top, outside both kinds");
  check(roster.groups.map(g=>g.label).join(" / ")==="Trade / Specialist",
    "then "+roster.groups.map(g=>g.label+" ("+g.items.length+")").join(" and "));
  roster.groups.forEach(g=>check(sorted(g.items),g.label+" A to Z: "+g.items.join(", ")));
  // the two kinds are the game's own two kinds, not a guess
  const kinds=await page.evaluate(()=>({trade:TECHS.map(t=>t.k).sort(),big:TECHS_BIG.map(t=>t.k).sort()}));
  check(JSON.stringify(roster.groups[0].keys.slice().sort())===JSON.stringify(kinds.trade),
    "the Trade group is exactly the "+kinds.trade.length+" ordinary trades");
  check(JSON.stringify(roster.groups[1].keys.slice().sort())===JSON.stringify(kinds.big),
    "and the Specialist group is exactly the "+kinds.big.length+" specialists");
  check(roster.nat[0]==="All"&&sorted(roster.nat.slice(1)),
    "nationality is A to Z under All: "+roster.nat.slice(1,4).join(", ")+"… "+roster.nat[roster.nat.length-1]);
  await page.screenshot({path:OUT+"/2-roster.png"});

  /* ---------- and it still filters ---------- */
  console.log("\n— and picking one still filters by it —");
  const pick=roster.groups[1].keys[0];               // a specialist, from the second group
  const before=await page.evaluate(()=>S.roster.filter(c=>c.status==="available").length);
  await page.selectOption("#ftech",pick);
  await page.waitForTimeout(250);
  const after=await page.evaluate(k=>({f:S.filter&&S.filter.tech,
    shown:[...document.querySelectorAll(".cards .id .nm-tr")].map(e=>e.textContent.trim()),
    want:TECH_BY_K[k].l}),pick);
  check(after.f===pick,"the filter took the value from the group: "+pick);
  check(after.shown.length>0,after.shown.length+" files shown");
  check(after.shown.every(t=>t===after.want),"and every one of them is a "+after.want);
  await page.screenshot({path:OUT+"/3-filtered.png"});

  /* ---------- the arrays themselves are untouched ---------- */
  console.log("\n— and the game's own orders are left alone —");
  const orders=await page.evaluate(()=>({
    techFirst:TECHS[0].k,techLast:TECHS[TECHS.length-1].k,
    techSorted:TECHS.map(t=>t.l).every((v,i,a)=>i===0||a[i-1].localeCompare(v)<=0),
    coFirst:COUNTRIES[0].name,
    coSorted:COUNTRIES.map(c=>c.name).every((v,i,a)=>i===0||a[i-1].localeCompare(v)<=0)}));
  check(!orders.techSorted,"TECHS is still in its own order ("+orders.techFirst+" first, not alphabetical)");
  check(!orders.coSorted,"and COUNTRIES in the world's ("+orders.coFirst+" first)");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

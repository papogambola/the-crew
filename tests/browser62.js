// Two things a player has to know before the week turns: how long a posting stands, and that the
// other crew has just taken one. Both were in the game already and neither was on a screen anybody
// looks at while deciding — the date only on the list row, the rival's take only in the log.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots62");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1440,height:950}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json|version\.txt/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const w=(m.location()||{}).url||"";const t=m.text()+(w?" ["+w+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+(process.argv[2]?require("path").resolve(process.argv[2]):GAME));
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Paz");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  const drain=async()=>{let n=0;while(await page.$(".modal.notice")||await page.$('[data-act="loose"]')){
    if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');else await page.click('[data-act="loose"][data-i="0"]');
    await page.waitForTimeout(70);if(++n>30)break;}};
  await drain();
  await page.evaluate(()=>{S.money=5e7;S.rep=60;
    for(let i=0;i<60&&recruits().length<crewSeats();i++){
      const c=S.roster.find(x=>x.status==="available"&&!x._u);if(!c)break;c._u=true;c.status="crew";S.crewIds.push(c.id);}
    S.notices=[];S.modal=null;render();});
  await drain();

  /* =============== when it expires, on the screen where you decide =============== */
  console.log("— how long it stands, where the decision is made —");
  const open1=async pick=>page.evaluate(p=>{
    S.tab="jobs";S.jobs=[];refreshJobs(true);
    const j=S.jobs.filter(x=>!x.final)[0];
    if(p&&p.left!=null)j.expires=S.week+p.left-1;       // jobLeft counts this week too
    S.jobOpen=j.id;render();
    return {id:j.id,expires:j.expires,week:S.week,left:jobLeft(j),
      techs:j.techs.slice(),need:j.need,team:assessJob(j).team.length};},pick);

  const a=await open1({left:4});
  await page.waitForTimeout(200);
  const box=await page.evaluate(()=>{
    const bs=[...document.querySelectorAll(".req .b")].map(b=>({
      k:(b.querySelector(".k")||{}).textContent||"",v:(b.querySelector(".v")||{}).textContent||"",
      sub:(b.querySelector(".sub")||{}).textContent||""}));
    return {boxes:bs.map(b=>b.k),exp:bs.find(b=>/expires/i.test(b.k))};});
  check(box.exp,"the job screen has an Expires box, beside the fee and the crew: "+box.boxes.join(" · "));
  check(box.exp&&box.exp.v==="wk "+a.expires,"and it names the week — \""+(box.exp&&box.exp.v)+"\"");
  check(box.exp&&/4 weeks left/.test(box.exp.sub),"with the weeks left counted for you: \""+(box.exp&&box.exp.sub)+"\"");
  await page.screenshot({path:OUT+"/1-expires.png"});

  // the last week reads differently, because the decision is different
  await open1({left:1});await page.waitForTimeout(200);
  const last=await page.evaluate(()=>{
    const b=[...document.querySelectorAll(".req .b")].find(x=>/expires/i.test((x.querySelector(".k")||{}).textContent||""));
    return {sub:(b.querySelector(".sub")||{}).textContent||"",
      red:getComputedStyle(b.querySelector(".sub")).color,
      note:[...document.querySelectorAll(".sel-help")].map(e=>e.innerText).join(" ")};});
  check(/this week only/.test(last.sub),"on its last week it says so: \""+last.sub+"\"");
  check(/rgb\(154, 43, 30\)/.test(last.red),"in the colour the game uses for a thing you cannot undo");

  /* =============== and the sum a date is for =============== */
  console.log("\n— the reason to print a date at all —");
  const gapped=await page.evaluate(()=>{
    S.jobs=[];refreshJobs(true);
    // a posting wanting a trade nobody on the crew has, with weeks still on it
    const j=S.jobs.find(x=>!x.final&&x.techs.some(t=>!recruits().concat([S.player]).some(c=>c.tech===t)));
    if(!j)return null;
    j.expires=S.week+2;S.jobOpen=j.id;render();
    return {left:jobLeft(j),missing:j.techs.filter(t=>!assessJob(j).team.some(c=>c.tech===t)).length};});
  if(!gapped)check(false,"found a posting wanting a trade this crew has not got");
  else{
    await page.waitForTimeout(200);
    const note=await page.evaluate(()=>[...document.querySelectorAll(".sel-help")].map(e=>e.innerText).join("  ||  "));
    check(/a trip to fetch somebody is a week/i.test(note),"it does the sum out loud: a trip is a week, and the posting stands for "+gapped.left);
    check(new RegExp("stands for\\s*"+gapped.left).test(note.replace(/\s+/g," ")),"naming how many are left ("+gapped.left+")");
    check(/nobody on the crew is/i.test(note),"and what is missing");
  }
  // and when there is no gap it says nothing, because there is no decision to prompt
  const full=await page.evaluate(()=>{
    S.jobs=[];refreshJobs(true);
    const j=S.jobs.find(x=>!x.final&&assessJob(x).canRun&&x.techs.every(t=>assessJob(x).team.some(c=>c.tech===t)));
    if(!j)return null;j.expires=S.week+3;S.jobOpen=j.id;render();return true;});
  if(full){await page.waitForTimeout(200);
    const q=await page.evaluate(()=>[...document.querySelectorAll(".sel-help")].map(e=>e.innerText).join(" "));
    check(!/a trip to fetch somebody/i.test(q),"a posting the crew already fits gets no such prompt");}

  /* =============== the other crew, on the week it takes one =============== */
  console.log("\n— the week the other crew got there first —");
  const took=await page.evaluate(()=>{
    S.modal=null;S.notices=[];S.jobOpen=null;
    if(!rivals().length)S.rivals=[{id:"RV9",name:"the Marek brothers",boss:"Marek",last:"Marek",standing:40,took:0,since:1,n:1,lead:0}];
    S.jobs=[];refreshJobs(true);
    while(S.jobs.filter(j=>!j.final&&!j.big).length<6)S.jobs.push(makeJob(freshRng(),0));
    const before=S.jobs.length;
    // force the take rather than wait for the odds
    let n=0;while(!S.notices.length&&n++<80)rivalWorks(mulberry32(n*7919));
    return {fired:!!S.notices.length,n:S.notices[0]||null,gone:before-S.jobs.length,
      log:((S.log||[]).find(l=>/took the/.test(l.t))||{}).t||""};});
  check(took.fired,"the take now raises a notice, not just a line in the log");
  check(took.gone===1,"one posting came off the board");
  check(took.n&&/got there first/.test(took.n.h),"headed: \""+(took.n&&took.n.h)+"\"");
  check(took.n&&/week \d+/.test(took.n.k),"stamped with the week: \""+(took.n&&took.n.k)+"\"");
  check(took.n&&/standing is \d+/.test(took.n.text),"and says what it did for their standing");
  check(took.n&&/(could have run it|could not have fielded|week[s]? of watching)/.test(took.n.text),
    "and what it cost you, which is the point: \""+(took.n&&took.n.text.slice(0,150))+"…\"");
  await page.evaluate(()=>{S.modal={type:"notice"};render();});
  await page.waitForTimeout(250);
  const shown=await page.evaluate(()=>({up:!!document.querySelector(".modal.notice"),
    txt:(document.querySelector(".modal.notice")||{}).innerText||"",
    go:!!document.querySelector('[data-act="notice-go"]')}));
  check(shown.up&&/got there first/.test(shown.txt),"and it is a pop-up on the screen, not a footnote");
  check(shown.go,"with a way straight back to what is left of the board");
  await page.screenshot({path:OUT+"/2-rival-took-it.png"});
  await page.click('[data-act="notice-close"].btn');
  await page.waitForTimeout(200);
  check(await page.evaluate(()=>!S.modal),"Later puts it away");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

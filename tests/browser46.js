// Build 67: a client who will not deal with you says WHY, on the board, and the whole account
// opens when it is clicked. A notice that states a consequence and not its cause is the one thing
// this game is not supposed to print.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots67");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)
  ||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1100}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  page.on("console",m=>{const w=(m.location()||{}).url||"";const t=m.text()+(w?" ["+w+"]":"");
    if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+(process.argv[2]?require("path").resolve(process.argv[2]):GAME));
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Paz");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  const drain=async()=>{let n=0;while(await page.$(".modal.notice")){if(await page.$('[data-act="crewname-later"]')){await page.click('[data-act="crewname-later"]');await page.waitForTimeout(80);continue;}await page.click('[data-act="notice-close"].btn');await page.waitForTimeout(80);if(++n>30)break;}};
  await drain();

  // Arrange the thing rather than hope for it: a client who was blown, and one who was told.
  const made=await page.evaluate(()=>{
    S.money=5e6;S.week=12;
    // The Committee has no grudge to bear — the last score has no client to offend — so a board
    // that happens to lead with it produced no grudge at all and the setup fell over. Ask for a
    // posting from somebody who can actually take it personally.
    const job=(S.jobs||[]).find(j=>!j.final&&j.client&&j.client!=="the Committee");
    if(!job)return null;
    S.grudges=[];
    const rng=mulberry32(4242);
    grudgeAdd(job.client,rng,job,1);                      // 1 = BOTCHED
    // force the blood half so the "not finished" branch is driven every run
    const mine=S.grudges.find(g=>g.c===job.client);
    if(!mine)return null;
    mine.kind="blood";mine.done=false;mine.revengeAt=S.week+3;
    S.tab="jobs";S.jobOpen=null;S.modal=null;render();
    return {client:job.client,title:job.title,city:job.city,country:job.country,
            fee:job.payout,week:S.week,all:S.grudges.map(g=>g.c),
            told:(S.grudges.find(g=>g.via)||{}).c||null};
  });
  await page.waitForTimeout(300);
  await drain();   // raising the float earns a career mark, whose box would swallow the click
  await page.evaluate(()=>{S.notices=[];S.modal=null;S.tab="jobs";render();});
  await page.waitForTimeout(250);
  check(!!made.client,"a client was blown: "+made.client+" on \""+made.title+"\"");

  /* ---------------- the line on the board ---------------- */
  console.log("\n— on the board —");
  const box=await page.$(".warnbox[data-act='grudge-open']");
  check(!!box,"the notice is on the board and can be opened");
  const txt=(await page.textContent(".warnbox[data-act='grudge-open']")).replace(/\s+/g," ");
  check(/will not deal with you/.test(txt),"it still says what has happened");
  check(txt.indexOf(made.title)>=0,"and names the job it was about: \""+made.title+"\"");
  check(made.city?txt.indexOf(made.city)>=0:true,"and where it was: "+made.city);
  check(/week \d+/.test(txt),"and when");
  check(/disaster|botched|messy/i.test(txt),"and which way it went wrong");
  check(/back week \d+/.test(txt),"and when they come back");
  if(made.told)check(txt.indexOf(made.told)>=0&&/had a word/.test(txt),
    "a client who was merely told says so rather than looking guilty: "+made.told);
  check(/why, in full/i.test(txt),"and it says there is more");
  await page.screenshot({path:path.join(OUT,"1-board.png"),fullPage:false});

  /* ---------------- the whole account ---------------- */
  console.log("\n— the file —");
  await box.click();
  await page.waitForTimeout(350);
  check(!!(await page.$(".modal")),"clicking it opens the account");
  const full=(await page.textContent(".modal")).replace(/\s+/g," ");
  check(full.length>400,"which is a full explanation, not a repeat ("+full.length+" characters)");
  check(full.indexOf(made.title)>=0,"it names the job");
  check(/week 12/.test(full),"the week it happened");
  check(/\$\d/.test(full),"what the fee was");
  check(/more week/.test(full),"how long is left");
  check(/not finished with you/i.test(full),"and that this one is not finished with you");
  check(/Enforcer|Fixer|Cleaner/.test(full),"saying what decides how that goes");
  check(/pay them back/i.test(full),"and the one thing that ends it early");
  if(made.told)check(/had a word/.test(full),"the client who was told is explained separately");
  check(/nothing you can buy makes that shorter/i.test(full),"and it is honest about what cannot be bought");
  await page.screenshot({path:path.join(OUT,"2-file.png"),fullPage:false});
  await page.click('[data-act="grudge-close"]');await page.waitForTimeout(250);
  check(!(await page.$(".modal")),"and it closes");

  /* --------- a save from before this kept the reason --------- */
  console.log("\n— an old grudge with nothing on it —");
  const old=await page.evaluate(()=>{
    S.grudges=[{c:"the Ferryman",since:2,until:S.week+9,kind:"word",job:"",country:"",fee:0,revengeAt:0,done:true}];
    S.modal=null;render();
    return document.querySelector(".warnbox[data-act='grudge-open']").innerText.replace(/\s+/g," ");});
  check(/the Ferryman/.test(old),"it still lists them");
  check(!/undefined|NaN/.test(old),"with nothing undefined on the line: "+old.slice(0,90));
  await page.click(".warnbox[data-act='grudge-open']");await page.waitForTimeout(300);
  const oldFull=(await page.textContent(".modal")).replace(/\s+/g," ");
  check(!/undefined|NaN/.test(oldFull),"and the account says plainly that the file does not know which job");
  check(/does not say which one/.test(oldFull),"in those words");
  await page.click('[data-act="grudge-close"]');

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})();

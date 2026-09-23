// Street work, driven: the strip on the board, the odds against every name before you choose,
// sending somebody, and what it costs. The week's news is another session's system and has its
// own drive; what is asked here is that street work sits beside it without pretending to be it.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots58");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  // Chromium refuses fetch() on a file:// URL whatever is there, so the music cannot load in a
  // drive opened from disk. The game catches that itself and says so on the radio; what reaches
  // the console is the browser's complaint, not the game's, so it is not counted as a page error.
  const noise=t=>/ERR_CERT/.test(t)||/music\/.*\.mp3|manifest\.json/.test(t)
    ||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t);
  // A console error carries its URL in the location rather than the text, and "Failed to load
  // resource" with no URL is unreadable, so the two are joined before anything is decided.
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");
    if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+(process.argv[2]?require("path").resolve(process.argv[2]):GAME));
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Paz");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  // Clear whatever the game is telling you, including the week's paper, before asking it anything.
  const drain=async()=>{let n=0;while(await page.$(".scrim")){
    if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');
    else if(await page.$('[data-act="loose"][data-i="0"]'))await page.click('[data-act="loose"][data-i="0"]');
    else await page.keyboard.press("Escape");
    await page.waitForTimeout(90);if(++n>35)break;}};
  await drain();

  /* ------------------------- street work -------------------------- */
  console.log("\n— street work —");
  await page.evaluate(()=>{
    S.money=5e6;
    const good=S.roster.filter(c=>c.status==="available"&&canSign(c)&&!c.limits.length).slice(0,4);
    good.forEach(c=>{c.status="crew";c._touched=true;S.crewIds.push(c.id);});
    S.tab="jobs";S.jobOpen=null;render();});
  await page.waitForTimeout(300);await drain();
  await page.evaluate(()=>{S.tab="jobs";S.jobOpen=null;render();});
  await page.waitForTimeout(300);
  const offers=await page.$$(".streetrow");
  check(offers.length>=2,offers.length+" pieces of street work on offer");
  // A street offer is not a posting, and must not answer to .jobrow: the tutorial's spotlight,
  // the hover that lights the country, and every drive that opens "a posting" all use it, and
  // the strip sits at the TOP of the board — so sharing the class made street work the first
  // thing all of them found.
  check(await page.evaluate(()=>!document.querySelector(".streetrow.jobrow")),
    "and none of them answers to .jobrow, which means a posting");
  check(await page.evaluate(()=>{const r=document.querySelector(".jobrow");
    return !!r&&!r.classList.contains("streetrow");}),
    "the first .jobrow on the board is still a posting");
  const heads=await page.$$eval(".panel .panel-h h2",e=>e.map(x=>x.textContent.trim()));
  check(heads.indexOf("Quick Money - High Risk")>=0,"the box is called what it says on it: "+heads.join(" / "));
  check(await page.evaluate(()=>{const h=[].slice.call(document.querySelectorAll(".panel .panel-h h2"));
      const q=h.find(x=>/Quick Money/.test(x.textContent));
      const p=h.find(x=>/Postings/i.test(x.textContent));
      return !!q&&!!p&&q.getBoundingClientRect().top>p.getBoundingClientRect().top;}),
    "and it sits under the postings, not over them");
  check(await page.evaluate(()=>{const h=[].slice.call(document.querySelectorAll(".panel .panel-h"));
      const q=h.find(x=>/Quick Money/.test(x.textContent));
      return !!q&&/one a week/.test(q.textContent)&&/one soldier/.test(q.textContent)&&/no crew/.test(q.textContent);}),
    "with what it is still said beside the name: one a week · one soldier · no crew");
  const row=await page.$$eval(".streetrow",e=>e[0].innerText.replace(/\s+/g," "));
  check(/hurt \d+%/i.test(row)&&/taken \d+%/i.test(row),"the risk is on the offer before you open it: "+row.slice(0,110));
  check(/\$[\d,]{3,}/.test(row),"and the money is to the dollar, not rounded to a thousand: "+(row.match(/\$[\d,]+/)||["?"])[0]);
  await page.screenshot({path:path.join(OUT,"3-strip.png"),fullPage:true});
  await page.click(".streetrow");await page.waitForTimeout(350);
  const cands=await page.$$('[data-act="street-send"]');
  check(cands.length>=3,cands.length+" soldiers to choose between");
  const pct=await page.evaluate(()=>[].slice.call(document.querySelectorAll(".modal .check"))
    .map(r=>r.innerText.replace(/\s+/g," ").trim()));
  check(pct.every(t=>/\d+%/.test(t)),"every one of them carries their own odds");
  const spread=await page.evaluate(()=>{const o=streetOffers().find(x=>x.k===S.modal.k);
    const v=streetPool().map(c=>streetOdds(c,o)).filter(x=>!x.blocked).map(x=>x.pClean);
    return Math.max.apply(null,v)-Math.min.apply(null,v);});
  check(spread>=8,"and they are not all the same person: "+spread+" points between best and worst");
  check(/commander/i.test(await page.evaluate(()=>document.querySelector(".modal").innerText))===false
     || !(await page.evaluate(()=>streetPool().some(c=>c.isPlayer))),"the commander is not on the list");
  await page.screenshot({path:path.join(OUT,"4-pick.png"),fullPage:true});

  const before=await page.evaluate(()=>({m:S.money,h:S.heat}));
  await page.evaluate(()=>{const o=streetOffers().find(x=>x.k===S.modal.k);
    const best=streetPool().map(c=>({c,o:streetOdds(c,o)})).filter(x=>!x.o.blocked).sort((a,b)=>b.o.pClean-a.o.pClean)[0];
    document.querySelector('[data-act="street-send"][data-id="'+best.c.id+'"]').click();});
  await page.waitForTimeout(600);
  check(!!(await page.$('[data-act="street-ok"]')),"sending one shows what happened");
  const r=await page.evaluate(()=>S.streetLast);
  check(!!r,(r&&r.first)+" went out on "+(r&&r.label));
  const after=await page.evaluate(()=>({m:S.money,h:S.heat}));
  check(after.h>before.h,"heat lands either way ("+before.h+" → "+after.h+")");
  if(r&&r.won)check(after.m===before.m+r.paid,"it paid "+r.paid+" and the float moved");
  else check(after.m===before.m,"nothing came back, and nothing was paid");
  const res=await page.evaluate(()=>document.querySelector(".modal").innerText.replace(/\s+/g," "));
  check(/fit/i.test(res)&&/odds you took/i.test(res),"and it shows the fit and the odds you took");
  await page.screenshot({path:path.join(OUT,"5-result.png"),fullPage:true});
  await page.click('[data-act="street-ok"]');await page.waitForTimeout(300);
  check(await page.evaluate(()=>streetSpent()),"that is the week's street work spent");
  const dim=await page.evaluate(()=>{const e=document.querySelector(".streetrow");
    return e?getComputedStyle(e).opacity:"1";});
  check(parseFloat(dim)<1,"and the strip says so on the board (opacity "+dim+")");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})();

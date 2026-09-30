/* THE CARD — a night on one sheet, made to be posted.

   WHAT THIS IS FOR, and it is not decoration. A screenshot of somebody else's win is a screenshot
   of somebody else's save file and nobody has ever stopped scrolling for one. What this game
   produces that is worth a stranger's attention is THE GAP: the board said 62% and it came off, or
   it said 94% and the crew came apart in a stairwell. So the assertions below are mostly about the
   two numbers being the ones the player was actually given, and about the card existing for the
   nights that went badly — because a disaster at 94% is the better post, and a game that will only
   publish your victories reads as one fishing rather than one confident.

   THE ODDS ARE RECORDED, NOT RECOMPUTED. By the time anybody looks back at a night, the crew that
   ran it has changed — somebody is in a cell, somebody took a bullet, somebody walked. A card that
   worked the number out again would quote odds that were never on anybody's screen, and the whole
   claim it makes is "this is what the game told me before I said yes". That is the assertion this
   file exists for.

   AND NOTHING LEAVES THE MACHINE. The card is drawn in the page out of the save that is already
   there. No result is uploaded and nothing is posted on anybody's behalf, which is checked here by
   watching for requests rather than by reading the code and hoping.
*/
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const FILE=path.resolve(__dirname,process.argv[2]||GAME);
const OUT=path.join(__dirname,"shots94");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  const errs=[];page.on("pageerror",e=>errs.push(String(e)));
  const noise=t=>/ERR_CERT|music\/|\.mp3|manifest\.json|r2\.dev|fonts\./.test(t)||/net::ERR_FAILED/.test(t)
    ||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const w=(m.location()||{}).url||"";const t=m.text()+(w?" ["+w+"]":"");
    if(m.type()==="error"&&!noise(t))errs.push(t);});
  // Every request the page makes from here on, so "nothing is sent anywhere" is a measurement.
  const sent=[];
  page.on("request",q=>{const u=q.url();
    if(/^https?:/.test(u)&&!/fonts\.(googleapis|gstatic)|r2\.dev/.test(u))sent.push(q.method()+" "+u);});

  await page.goto("file://"+FILE);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.waitForTimeout(500);

  console.log("— the words, over every verdict the game has —");
  /* Pure, so they can be read and argued with without a canvas anywhere near them. These sentences
     are the whole of whether anybody posts this, which makes them worth testing as writing. */
  const words=await page.evaluate(()=>{
    const mk=(tier,verdict,odds)=>({id:"t"+tier,week:41,crew:"THE QUIET OUTFIT",tier,verdictName:verdict,
      net:tier>=3?412000:0,odds:odds,job:{title:"The Monaco job",city:"Monaco",country:"Monaco"},teamIds:[]});
    const mid={clean:18,success:44,messy:26,blown:12};
    const out={};
    [["0","DISASTER"],["1","BOTCHED"],["2","MESSY"],["3","SUCCESS"],["4","CLEAN"]].forEach(([t,v])=>{
      out[v]={lines:cardLines(mk(+t,v,mid)),text:cardText(mk(+t,v,mid))};
    });
    out.LONGSHOT=cardLines(mk(3,"SUCCESS",{clean:4,success:18,messy:30,blown:48}));
    out.BANKER=cardLines(mk(0,"DISASTER",{clean:60,success:34,messy:4,blown:2}));
    out.OLD=cardLines(mk(3,"SUCCESS",null));
    return out;
  });
  check(/PULLED OFF THE MONACO JOB/.test(words.SUCCESS.lines.head),
    "a success reads \""+words.SUCCESS.lines.head+"\"");
  check(/TOOK THE QUIET OUTFIT APART/.test(words.DISASTER.lines.head),
    "and a disaster is its own sentence, not the same one with a red word: \""+words.DISASTER.lines.head+"\"");
  const heads=["DISASTER","BOTCHED","MESSY","SUCCESS","CLEAN"].map(v=>words[v].lines.head);
  check(new Set(heads).size===5,"five verdicts, five headlines — no two nights read the same");
  check(words.SUCCESS.lines.pct===62,"the number is clean+comes-off, added once: "+words.SUCCESS.lines.pct+"%");
  check(/gave it 62%, and it came off/.test(words.SUCCESS.lines.sub),"an ordinary win states it");
  check(/came off anyway/.test(words.LONGSHOT.sub),
    "long odds beaten get their own line: \""+words.LONGSHOT.sub+"\"");
  check(/did not come off/.test(words.BANKER.sub),
    "and a banker missed gets the opposite one: \""+words.BANKER.sub+"\"");
  check(words.LONGSHOT.sub!==words.SUCCESS.lines.sub&&words.BANKER.sub!==words.DISASTER.lines.sub,
    "so 62%→SUCCESS and 22%→SUCCESS are not the same story told twice");

  console.log("— a night from before any of this was recorded still gets a card —");
  /* Every job already sitting in a save predates the odds being kept. If the card refused to draw
     for those, the feature would arrive empty for every player who had a history. */
  check(words.OLD.pct===null,"no odds on it");
  check(!!words.OLD.head&&!!words.OLD.verdict,"and it still has a headline and a verdict");
  check(!/\bnull\b|undefined|NaN/.test(words.OLD.sub+words.OLD.head),
    "with no null leaking into the writing: \""+words.OLD.sub+"\"");

  console.log("— and the post says the city's name properly —");
  check(/Monaco/.test(words.SUCCESS.text)&&!/monaco/.test(words.SUCCESS.text),
    "\""+words.SUCCESS.text+"\"");
  check(/playthecrew\.com/.test(words.SUCCESS.text),"with the address, because a picture is not a link");
  check(/62%/.test(words.SUCCESS.text),"and the number, which is the reason anybody would look");

  console.log("— a real night, played, and the odds are the ones that were on the screen —");
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
    break;
  }
  // Run a job through the engine rather than through forty clicks: the card is what is under test,
  // and finishJob is the thing that has to record the odds.
  const ran=await page.evaluate(()=>{
    S.modal=null;S.event=null;
    /* ARRANGED, not hoped for. A board can hand out a week where the best job on it is one nobody
       on the roster can even enter — a passport, a limit, a country that is shut — and a night run
       by nobody produces a card with no faces on it, which is correct behaviour failing a test that
       meant to check something else. So: take the best job on the board, and if the board has
       nothing anybody can go on, turn the week and look again. */
    let job=null,a=null;
    for(let w=0;w<8&&!job;w++){
      const best=S.jobs.map(j=>({j:j,a:assessJob(j,null,null)}))
        .sort((p,q)=>q.a.team.length-p.a.team.length)[0];
      if(best&&best.a.team.length>0){job=best.j;a=best.a;break;}
      weekTick(freshRng());S.modal=null;S.event=null;
    }
    if(!job)return {noJob:true};
    const shown={clean:a.pClean,success:a.pSuccess,messy:a.pMessy,blown:a.pFail+a.pDis};
    // The game's own launcher, not a hand-built one: what is under test is that a night run the
    // ordinary way comes out with its odds attached.
    startJob(job,{noTwist:true});
    const r=(S.reports||[])[S.reports.length-1];
    return {shown:shown,stored:r&&r.odds,tier:r&&r.tier,verdict:r&&r.verdictName,
            id:r&&r.id,team:(r&&r.teamIds||[]).length,city:r&&r.job&&r.job.city};
  });
  check(!!ran.stored,"the night wrote its odds down");
  check(JSON.stringify(ran.stored)===JSON.stringify(ran.shown),
    "and they are EXACTLY the four the board showed before it was taken: "+JSON.stringify(ran.stored));
  check(ran.team>0,"with the crew that went recorded against it ("+ran.team+")");

  console.log("— the sheet draws, with those people on it —");
  const drew=await page.evaluate(async()=>{
    const r=(S.reports||[])[S.reports.length-1];
    const cv=await cardDraw(r);
    const x=cv.getContext("2d");
    // Is there ink where the crew goes? A card that silently lost the faces is the failure that
    // would never show up in any other assertion here.
    const band=x.getImageData(58,452,600,96).data;
    let dark=0;for(let i=0;i<band.length;i+=4)if(band[i]<90)dark++;
    const foot=x.getImageData(700,540,440,80).data;
    let markInk=0;for(let i=0;i<foot.length;i+=4)if(foot[i]<90)markInk++;
    return {w:cv.width,h:cv.height,faceInk:dark,markInk:markInk,
            png:cv.toDataURL("image/png"),text:cardText(r)};
  });
  check(drew.w===1200&&drew.h===630,"1200×630 — the shape a timeline shows without cropping the crew off");
  check(drew.faceInk>400,"there are faces on it ("+drew.faceInk+" dark pixels where the crew goes)");
  check(drew.markInk>200,"and the mark is on it ("+drew.markInk+")");
  fs.writeFileSync(OUT+"/card-real.png",Buffer.from(drew.png.split(",")[1],"base64"));
  console.log("    wrote "+OUT+"/card-real.png");

  console.log("— the button is on the report, for a night of any kind —");
  const btn=await page.evaluate(()=>{
    // Opened exactly as the case log opens a past night — which is the same sheet, so a player can
    // go back and post any of the last eighty jobs rather than only the one still on screen.
    const r=(S.reports||[])[S.reports.length-1];
    S.modal={type:"result",data:Object.assign({},r,{revealed:r.narrative.length,done:true,replay:true})};
    render();
    const b=document.querySelector('[data-act="card-open"]');
    return {there:!!b,label:b?b.textContent:"",id:b?b.getAttribute("data-id"):null,rid:r.id,tier:r.tier};
  });
  check(btn.there===true,"offered after a "+["disaster","botched","messy","success","clean"][btn.tier]
    +" — every verdict, not only the good ones");
  check(btn.id===btn.rid,"and it points at this night");

  console.log("— pressing it shows the card before anything can be sent —");
  await page.click('[data-act="card-open"]');
  await page.waitForSelector("#cardshot",{timeout:10000});
  const open=await page.evaluate(()=>({
    img:!!document.querySelector("#cardshot"),
    src:(document.querySelector("#cardshot")||{}).src||"",
    share:!!document.querySelector('[data-act="card-share"]'),
    where:[...document.querySelectorAll('[data-act="card-go"]')].map(b=>b.textContent),
    body:document.body.innerText}));
  check(open.img===true&&/^data:image\/png/.test(open.src),"the sheet itself is on screen, not a description of it");
  check(open.where.length>=5,"with somewhere to put it: "+open.where.join(", "));
  check(/Nothing has been sent anywhere/i.test(open.body),
    "and it says so plainly — nobody should have to guess whether pressing this published something");
  check(/no page is allowed to put an image into somebody else/i.test(open.body),
    "including the honest bit about a computer: the picture cannot ride along, so you paste it");
  await page.screenshot({path:OUT+"/01-show-somebody.png"});

  console.log("— and nothing was sent —");
  check(sent.length===0,"not one request left the page while all of that happened"
    +(sent.length?": "+sent.slice(0,3).join(" | "):""));

  console.log("— the way out —");
  /* Pressing the card itself must NOT close it. The scrim carries the same act as the ✕, so a
     click that lands on the sheet has to be told apart from one that lands beside it — otherwise
     tapping the picture to look at it closes the thing you were looking at. */
  await page.click("#cardshot");
  await page.waitForTimeout(150);
  check(!!(await page.$("#cardshot")),"pressing the card leaves it open — it is a thing to look at");
  await page.click('button[data-act="card-close"]');
  await page.waitForTimeout(200);
  check(!(await page.$("#cardshot")),"and the ✕ closes it");

  check(errs.length===0,"no page or console errors through any of it"+(errs.length?": "+errs.slice(0,3).join(" | "):""));
  await browser.close();
})();

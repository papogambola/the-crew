// Build 25 in a real browser: the word "place", locked panels, the recruitment trip driven by
// clicking, and the question that gets asked when somebody leaves.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots25");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1200}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+GAME);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');
  await page.fill("#pname","Paz");
  await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  // Clears whatever the game is telling you before the drive asks it a question: milestone boxes
  // and the week's news sheet, which queues behind them and holds the screen until it is read.
  const dismiss=async()=>{let n=0;while(await page.$(".modal.notice")||await page.$(".modal.wire")){
    n++;
    if(await page.$(".modal.wire"))await page.click('[data-act="news-close"].btn');
    else await page.click('[data-act="notice-close"].btn');
    await page.waitForTimeout(80);if(n>25)break;}};
  await dismiss();

  // ---- the word
  await page.evaluate(()=>{S.tab="crew";render();});
  await page.waitForTimeout(150);
  const crewTxt=await page.$eval("body",e=>e.innerText);
  check(/place \d of \d — empty/i.test(crewTxt),"empty places are called places");
  check(!/\bSeat\b/i.test(crewTxt),"and nothing on the crew screen is a seat");
  check(/PLACES · EVERYONE GOES/i.test(crewTxt),"the header counts places");

  // ---- locked reads as locked, both of them
  check(/places 6–7 — locked/i.test(crewTxt),"the last two places say locked");
  check(!!(await page.$(".id.slot.locked")),"and are drawn as locked");
  check(/a second crew — locked/i.test(crewTxt),"the second crew says locked too");
  check(!!(await page.$(".panel.locked")),"and is drawn the same way");
  const rung=await page.evaluate(()=>({n:seatRankName(),at:seatRankAt()}));
  check(crewTxt.toLowerCase().indexOf(("A "+rung.n+" name (ranking "+rung.at+")").toLowerCase())>=0,
    "the card reads the threshold off the ladder ("+rung.n+" at "+rung.at+")");
  await page.screenshot({path:OUT+"/01-crew-locked.png",fullPage:true});

  // ---- hiring is a trip, driven by clicking
  await page.evaluate(()=>{S.money=5e6;S.tab="roster";render();});
  await page.waitForTimeout(200);
  await dismiss();   // money earns a career mark, and its box would swallow the click
  const rosterTxt=(await page.$eval("body",e=>e.innerText)).toLowerCase();
  check(rosterTxt.indexOf("go and ask")>=0,"the roster says Go and ask, not Hire");
  check(rosterTxt.indexOf(">hire<")<0,"nothing is labelled just Hire");
  // Take the most troublesome file on the board and keep going until a meeting actually goes
  // wrong, so the snag branch is driven rather than left to the dice. Both endings are checked.
  let before=null,tries=0;
  while(tries++<25){
    before=await page.evaluate(()=>({week:S.week,money:S.money,crew:field().length}));
    const worst=await page.evaluate(()=>{
      const c=S.roster.filter(x=>x.status==="available"&&canApproach(x)).sort((a,b)=>tripTrouble(b)-tripTrouble(a))[0];
      return c?c.id:null;
    });
    if(!worst)break;
    await page.evaluate(id=>{hire(id);},worst);
    await page.waitForTimeout(250);
    await page.click('[data-act="skip-ticker"]').catch(()=>{});
    await page.waitForTimeout(250);
    if(await page.evaluate(()=>!!(S.modal&&S.modal.data&&S.modal.data.awaiting)))break;
    // signed or refused without a snag: close it and try a harder file
    await page.evaluate(()=>{S.modal=null;S.notices=[];render();});
    await dismiss();
  }
  check(tries<=25,"a meeting that goes wrong, after "+tries+" approach(es)");
  check(await page.evaluate(()=>S.modal&&S.modal.type==="trip"),"going to ask opens a live trip");
  const money0=n=>"$"+Math.round(n/1000)+"K";
  const trip0=await page.evaluate(()=>({fee:S.modal.data.fee,city:S.modal.data.city,country:S.modal.data.country,name:S.modal.data.name,lines:S.modal.data.narrative.length,trouble:S.modal.data.trouble}));
  check(trip0.lines>=4,"with a feed of "+trip0.lines+" lines from "+trip0.city+", "+trip0.country);
  const liveTxt=await page.$eval("body",e=>e.innerText);
  check(/recruiting/i.test(liveTxt)&&/live/i.test(liveTxt),"and it is live, like a job");
  await page.screenshot({path:OUT+"/02-trip-live.png",fullPage:true});
  const awaiting=await page.evaluate(()=>!!(S.modal&&S.modal.data.awaiting));
  if(awaiting){
    const snagTxt=await page.$eval("body",e=>e.innerText);
    check(/the meeting · your call/i.test(snagTxt),"a snag stops it and asks");
    const opts=await page.$$('[data-act="trip-opt"]');
    check(opts.length>=3,"with "+opts.length+" answers on the table");
    check(/what you brought decides this/i.test(snagTxt),"and says what decides it");
    await page.screenshot({path:OUT+"/03-trip-meeting.png",fullPage:true});
    // it cannot be clicked away
    await page.click(".scrim",{position:{x:5,y:5}}).catch(()=>{});
    await page.waitForTimeout(200);
    check(await page.evaluate(()=>S.modal&&S.modal.type==="trip"),"the meeting cannot be clicked away");
    await opts[0].click();
    await page.waitForTimeout(350);
    // the answer is played out too — run the rest of the feed to the stamp
    await page.click('[data-act="skip-ticker"]').catch(()=>{});
    await page.waitForTimeout(400);
  } else check(false,"the loop above should have stopped on a meeting");
  const after=await page.evaluate(()=>({week:S.week,money:S.money,crew:field().length,outcome:S.modal&&S.modal.data&&S.modal.data.outcome,pending:!!S.pendingTrip}));
  check(!after.pending,"the trip resolves");
  // A trip costs its week from week two; week one is for putting the crew together and is free.
  check(before.week<=1?after.week===before.week:after.week>before.week,
    before.week<=1?"and in week one it costs no week at all ("+before.week+" → "+after.week+")"
                  :"it took a week off the calendar ("+before.week+" → "+after.week+")");
  check(after.outcome==="signed"||after.outcome==="nodeal","and ends in a yes or a no: "+after.outcome);
  if(after.outcome==="signed")check(after.crew===before.crew+1,"a yes puts them on the crew");
  // a no never costs the fee, though an answer can cost something of its own (drinks, a night
  // in another hotel, a bribe that did not work)
  else check(after.money>before.money-trip0.fee,"a no costs the week, not the fee ("+money0(before.money)+" → "+money0(after.money)+")");
  const endTxt=await page.$eval("body",e=>e.innerText);
  check(/SIGNED|NO DEAL/.test(endTxt),"it ends on a stamp");
  check(/how hard it was/i.test(endTxt),"and says how hard that file was ("+trip0.trouble+"%)");
  await page.screenshot({path:OUT+"/04-trip-done.png",fullPage:true});
  await page.click('[data-act="scrim"].btn').catch(()=>{});
  await page.waitForTimeout(200);
  await dismiss();

  // ---- the question, when somebody leaves
  await page.evaluate(()=>{
    S.modal=null;S.notices=[];S.money=5e6;
    ["wheelman","enforcer","cleaner","fixer"].forEach(t=>{const c=S.roster.find(x=>x.status==="available"&&x.tech===t&&canSign(x)&&!x.coolUntil);
      if(c&&recruits().length<crewSeats()){c.status="crew";c._touched=true;S.crewIds.push(c.id);}});
    const v=recruits()[0];v.ranWith=7;
    S.tab="crew";render();
  });
  await dismiss();
  const leaver=await page.evaluate(()=>{const v=recruits()[0];return {id:v.id,first:v.first};});
  await page.evaluate(id=>{drop(id);},leaver.id);
  await page.waitForTimeout(250);
  await dismiss();
  await page.evaluate(()=>render());
  await page.waitForTimeout(250);
  check(await page.evaluate(()=>S.modal&&S.modal.type==="loose"),"somebody leaving puts the question in the middle of the screen");
  const lt=await page.$eval("body",e=>e.innerText);
  check(/outside the crew/i.test(lt),"the box names what it is");
  check(/\b\d+%/.test(lt),"and states the odds as a number");
  const lopts=await page.$$('[data-act="loose"]');
  check(lopts.length>=5,lopts.length+" answers, each with its own number");
  check(!!(await page.$('.twist-opt.kill')),"the ones that end somebody are marked");
  check(/the crew finds out what you decide/i.test(lt),"and it says the crew finds out");
  await page.screenshot({path:OUT+"/05-loose.png",fullPage:true});
  // it cannot be clicked away
  await page.click(".scrim",{position:{x:5,y:5}}).catch(()=>{});
  await page.waitForTimeout(200);
  check(await page.evaluate(()=>S.modal&&S.modal.type==="loose"),"the question cannot be clicked away");
  // the i button explains it
  if(await page.$('[data-act="info"]')){
    await page.click('[data-act="info"]');
    await page.waitForTimeout(250);
    const inf=await page.$eval("body",e=>e.innerText);
    check(/somebody outside the crew/i.test(inf),"the i button explains this screen");
    await page.screenshot({path:OUT+"/06-loose-info.png",fullPage:true});
    await page.click('[data-act="info-close"].btn');
    await page.waitForTimeout(200);
  }
  // take the one that ends it, and watch what it costs
  const b4=await page.evaluate(()=>({heat:S.heat,rep:S.rep,loy:field().filter(c=>!c.isPlayer).map(c=>c.loyalty)}));
  const killIdx=await page.evaluate(()=>looseOptions(byId(S.loose[0].id),S.loose[0].why).findIndex(o=>o.kill&&o.need!==false));
  if(killIdx>=0){
    await page.click('[data-act="loose"][data-i="'+killIdx+'"]');
    await page.waitForTimeout(350);
    await dismiss();
    const st=await page.evaluate(id=>({status:byId(id).status,talks:byId(id).talks||0,heat:S.heat,rep:S.rep,
      loy:field().filter(c=>!c.isPlayer).map(c=>c.loyalty),onRoster:S.roster.filter(c=>c.status==="available").some(c=>c.id===id),
      log:S.log[0].t}),leaver.id);
    check(st.status==="dead","it is final");
    check(!st.talks,"a body does not talk");
    check(!st.onRoster,"and is never offered work again");
    check(st.heat>=b4.heat,"it costs heat ("+b4.heat+" → "+st.heat+")");
    check(st.loy.length&&st.loy.every((l,i)=>l<b4.loy[i]),"the crew finds out: loyalty "+b4.loy.join(",")+" → "+st.loy.join(","));
    check(st.log.indexOf("Dealt with")===0,"the case log keeps it");
    check(await page.evaluate(()=>!S.loose.length&&(!S.modal||S.modal.type!=="loose")),"and the question is answered");
  } else check(false,"an answer that ends it was available");
  await page.screenshot({path:OUT+"/07-after.png",fullPage:true});

  // the PC minimum width
  await page.setViewportSize({width:960,height:1000});
  await page.evaluate(()=>{S.modal=null;S.tab="crew";render();});
  await page.waitForTimeout(250);
  await page.screenshot({path:OUT+"/08-minw-crew.png",fullPage:true});
  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

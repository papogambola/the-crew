// Build 68: teaching somebody a new trade, and what happens when two of the same trade end up on
// one crew. Both are conversations: the answer is theirs, your move is yours, and every option
// states what it needs, what it costs and the odds.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots68");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)
  ||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1200}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  page.on("console",m=>{const w=(m.location()||{}).url||"";const t=m.text()+(w?" ["+w+"]":"");
    if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+(process.argv[2]?require("path").resolve(process.argv[2]):GAME));
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Paz");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page,{clash:false});   // this drive answers the argument itself, like a player
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  const drain=async()=>{let n=0;while(await page.$(".modal.notice")){if(await page.$('[data-act="crewname-later"]')){await page.click('[data-act="crewname-later"]');await page.waitForTimeout(80);continue;}await page.click('[data-act="notice-close"].btn');await page.waitForTimeout(80);if(++n>30)break;}};
  await drain();

  /* =================== two of the same trade =================== */
  console.log("\n— two of a trade —");
  const pair=await page.evaluate(()=>{
    S.money=9e6;
    // arrange it rather than hope for it: two safecrackers, hired one after the other
    const two=S.roster.filter(c=>c.status==="available"&&c.tech==="safecracker"&&canSign(c)).slice(0,2);
    two.forEach(c=>{c.status="crew";c._touched=true;S.crewIds.push(c.id);});
    S.notices=[];S.modal=null;render();
    return {a:two[0]&&two[0].first,b:two[1]&&two[1].first,scenarios:CLASH.length,
            resolutions:CLASH.reduce((n,c)=>n+c.opts.length,0)};
  });
  await page.waitForTimeout(350);
  await drain();   // hiring two people earns career marks, and their boxes queue ahead of the argument
  await page.waitForTimeout(250);
  check(pair.scenarios>=10,pair.scenarios+" ways it can come up");
  check(pair.resolutions>40,pair.resolutions+" ways out of it, across the ten");
  check(await page.evaluate(()=>!!S.clash),"hiring a second "+"safecracker starts it at once, without waiting for a week to pass");
  const clashTxt=await page.textContent(".modal");
  check(clashTxt.indexOf(pair.a)>=0&&clashTxt.indexOf(pair.b)>=0,"and it is about the two of them by name: "+pair.a+" and "+pair.b);
  check(/safecracker/i.test(clashTxt),"and says which trade they are both in");
  const opts=await page.$$('[data-act="clash"]');
  check(opts.length>=5,opts.length+" answers on the screen");
  const optTxt=await page.$$eval('[data-act="clash"]',e=>e.map(x=>x.innerText.replace(/\s+/g," ")));
  check(optTxt.every(t=>/certain|% it goes your way/.test(t)),"every one states its odds");
  check(optTxt.every(t=>t.length>60),"and what it costs, in words");
  check(/loyalty/i.test(clashTxt)&&/where you stand/i.test(clashTxt),"with both files under the question");
  check(!/will not be in a room with/.test(clashTxt)||await page.evaluate(()=>bondOf(S.clash.aId,S.clash.bId)<=-3),
    "and two people who have never met are not described as refusing to share a room");
  // These answers are sentences. In the two-column grid they wrapped a word at a time, which is
  // unreadable, so the box has to be wide enough to hold a line of them.
  const box=await page.evaluate(()=>{const e=document.querySelector('[data-act="clash"]');
    const r=e.getBoundingClientRect();
    const t=e.querySelector("span.why")||e;
    return {w:Math.round(r.width),lines:Math.round(e.getBoundingClientRect().height/18)};});
  check(box.w>=420,"each answer has a full line to itself ("+box.w+"px wide)");
  // it cannot be clicked away: you have to solve it
  await page.click(".scrim",{position:{x:4,y:4}}).catch(()=>{});
  await page.waitForTimeout(200);
  check(await page.evaluate(()=>!!(S.modal&&S.modal.type==="clash")),"and it cannot be clicked away");
  await page.screenshot({path:path.join(OUT,"1-clash.png"),fullPage:false});

  const before=await page.evaluate(()=>({m:S.money,loy:recruits().filter(c=>c.status==="crew").map(c=>c.loyalty)}));
  // take the first answer that is available
  const idx=await page.evaluate(()=>{const sc=CLASH_BY_K[S.clash.k];
    for(let i=0;i<sc.opts.length;i++)if(clashCan(sc.opts[i]))return i;return 0;});
  await page.click('[data-act="clash"][data-i="'+idx+'"]');
  await page.waitForTimeout(350);
  check(await page.evaluate(()=>!!(S.clash&&S.clash.outcome)),"answering it gives an outcome");
  const outTxt=await page.textContent(".modal");
  check(outTxt.length>120,"which says what happened ("+outTxt.length+" characters)");
  check(/settled|come back/i.test(outTxt),"and whether that is the end of it");
  await page.screenshot({path:path.join(OUT,"2-clash-out.png"),fullPage:false});
  await page.click('[data-act="clash-close"]');await page.waitForTimeout(300);
  const after=await page.evaluate(()=>({clash:!!S.clash,done:Object.keys(S.clashDone||{}).length,next:Object.keys(S.clashNext||{}).length}));
  check(!after.clash,"and closes");
  check(after.done+after.next>0,"the pair is written down as settled or as coming back");
  // and it does not immediately ask again
  await page.evaluate(()=>{render();render();});
  await page.waitForTimeout(250);
  check(!(await page.evaluate(()=>!!S.clash)),"and it does not ask the same question again on the next render");

  /* =================== teaching a new trade =================== */
  console.log("\n— a new trade —");
  const who=await page.evaluate(()=>{
    S.modal=null;S.clash=null;S.notices=[];
    const c=recruits().find(x=>x.status==="crew"&&!x.isPlayer);
    if(!c)return null;
    c.exp=4;c.loyalty=80;c.ranWith=6;c.learnAskedUntil=0;c._touched=true;
    S.tab="crew";render();
    return {id:c.id,first:c.first,tech:c.tech,exp:c.exp,why:canLearn(c),standing:standing(c)};
  });
  check(who&&!who.why,"somebody experienced enough to be asked: "+(who&&who.first)+", "+(who&&who.tech));
  await page.waitForTimeout(250);
  const btn=await page.$('[data-act="learn"]:not([disabled])');
  check(!!btn,"the crew card offers to teach them a trade");
  await btn.click();await page.waitForTimeout(300);
  const pickTxt=await page.textContent(".modal");
  check(/where you stand/i.test(pickTxt),"the conversation opens on where you stand with them: "+who.standing);
  /* This used to check the screen said what they LOSE: a rank, and the trade they are. They
     lose neither any more — teaching adds a second trade and leaves the first alone, which is
     the change that makes a crew worth keeping. So the screen has to be plain about the two
     things that are actually true: they stay what they are, and the price is the weeks. */
  check(/stays/i.test(pickTxt)&&/keeps every year/i.test(pickTxt),
    "and says plainly that they stay what they are");
  check(/weeks/i.test(pickTxt)&&/no cut/i.test(pickTxt),
    "and that the price is the weeks away, with no cut while they are gone");
  check(/one each/i.test(pickTxt),"and that there is only one of these per person");
  const trades=await page.$$('[data-act="talk-pick"]');
  check(trades.length>=10,trades.length+" trades they could be taught");
  const tradeTxt=await page.$$eval('[data-act="talk-pick"]',e=>e.map(x=>x.innerText.replace(/\s+/g," ")));
  check(tradeTxt.every(t=>/\$\d/.test(t)&&/% they agree/.test(t)),"each with its price and the chance they agree");
  await trades[0].click();await page.waitForTimeout(300);
  const picked=await page.textContent(".modal");
  check(/weeks out of the field/i.test(picked),"picking one shows the weeks it takes");
  // "What they give up" was their rank. It is the weeks now, and the row is named for it.
  check(/Where you stand/.test(picked)&&/Weeks off the field/.test(picked)&&/Built for it/.test(picked),
    "and the odds broken into what they are made of");
  check(/% yes/.test(picked),"with the figure itself");
  // .twist-opt is a flex row whose <b> is a 16px column meant for the letter "A". A label of two
  // or three words in it is squeezed to 16px and printed ON TOP of the line beside it, which is
  // unreadable and was invisible to every assertion about the words being present. So the boxes
  // are measured: a label must have room for itself and must not sit over its own body.
  const lay=await page.evaluate(()=>{
    const bad=[];
    document.querySelectorAll(".modal .twist-opt").forEach(btn=>{
      const b=btn.querySelector("b"),body=btn.querySelector(".ob");
      if(!b||!body)return;
      const rb=b.getBoundingClientRect(),rr=body.getBoundingClientRect();
      const overlap=rb.right>rr.left+1&&rb.left<rr.right-1;
      const crushed=b.textContent.trim().length>2&&rb.width<40;
      if(overlap||crushed)bad.push(b.textContent.trim().slice(0,24)+" ["+Math.round(rb.width)+"px"+(overlap?", over its own text":"")+"]");
    });
    return bad;});
  check(lay.length===0,"no answer prints its label over its own text"+(lay.length?": "+lay.join(" · "):""));
  await page.screenshot({path:path.join(OUT,"3-ask.png"),fullPage:false});

  // force a refusal so the four directions are driven every run
  await page.evaluate(()=>{S.talk.forceNo=true;});
  const askedAt=await page.evaluate(()=>S.money);
  await page.evaluate(()=>{const c=byId(S.talk.id);c.loyalty=1;c.ranWith=0;c._touched=true;});
  let refused=false;
  for(let i=0;i<14&&!refused;i++){
    await page.evaluate(()=>{S.talk.stage="pick";});
    await page.click('[data-act="talk-ask"]');await page.waitForTimeout(200);
    refused=await page.evaluate(()=>S.talk.stage==="no");
    if(!refused)await page.evaluate(()=>{const c=byId(S.talk.id);c.learn=null;c.status="crew";c.out=0;});
  }
  check(refused,"with a thin loyalty they say no");
  const noTxt=await page.textContent(".modal");
  check(/Leave it/.test(noTxt),"and the refusal offers to leave it");
  check(/on top/.test(noTxt),"to put money on it");
  check(/not a question/i.test(noTxt),"to tell them it is not a question");
  check(/Cut .* loose/.test(noTxt),"or to cut them loose");
  const f=await page.evaluate(()=>forceOdds(byId(S.talk.id)));
  check(/\d+% they go/.test(noTxt)&&/\d+% they walk/.test(noTxt),
    "and forcing them states all three ways it can go ("+f.go+"/"+f.dig+"/"+f.walk+")");
  check(/knowing \d+ of your business/.test(noTxt),"and firing them says what they take with them");
  const lay2=await page.evaluate(()=>{
    const bad=[];
    document.querySelectorAll(".modal .twist-opt").forEach(btn=>{
      const b=btn.querySelector("b"),body=btn.querySelector(".ob");
      if(!b||!body)return;
      const rb=b.getBoundingClientRect(),rr=body.getBoundingClientRect();
      if((rb.right>rr.left+1&&rb.left<rr.right-1)||(b.textContent.trim().length>2&&rb.width<40))
        bad.push(b.textContent.trim().slice(0,24));
    });
    return bad;});
  check(lay2.length===0,"and the four ways out of a refusal are readable too"+(lay2.length?": "+lay2.join(" · "):""));
  await page.screenshot({path:path.join(OUT,"4-refused.png"),fullPage:false});
  // the odds are not the same for a loyal one — that is the whole mechanism
  // Measured on a subject whose other terms are middling, so the comparison is about standing
  // and not about a Legend with no aptitude being jammed against the floor at both ends.
  const spread=await page.evaluate(()=>{const c=byId(S.talk.id),k=S.talk.to;
    const was={l:c.loyalty,r:c.ranWith,e:c.exp,a:c.attrs[TECH_BY_K[k].a]};
    c.exp=3;c.attrs[TECH_BY_K[k].a]=70;
    c.loyalty=1;c.ranWith=0;
    const lowStand=standing(c),low=learnOdds(c,k,0).p;
    c.loyalty=95;c.ranWith=9;
    const high=learnOdds(c,k,0).p,highStand=standing(c);
    c.loyalty=was.l;c.ranWith=was.r;c.exp=was.e;c.attrs[TECH_BY_K[k].a]=was.a;
    return {low,high,lowStand,highStand};});
  check(spread.high>spread.low+15,
    "somebody who is solid with you answers differently: "+spread.low+"% at standing "+spread.lowStand
    +" against "+spread.high+"% at "+spread.highStand);
  const paid=await page.evaluate(()=>{const c=byId(S.talk.id),k=S.talk.to;
    return {none:learnOdds(c,k,0).p,some:learnOdds(c,k,learnCost(c,k)).p};});
  check(paid.some>paid.none,"and money moves it too: "+paid.none+"% → "+paid.some+"% with the school again on top");

  // take one of the four, and check it costs what it says
  const m0=await page.evaluate(()=>S.money);
  await page.click('[data-act="talk-force"]');await page.waitForTimeout(350);
  const st=await page.evaluate(()=>({stage:S.talk.stage,money:S.money,
    c:(byId(S.talk.id)||{}),crew:recruits().filter(x=>x.status==="crew").length}));
  check(["forced","dug","walked"].indexOf(st.stage)>=0,"telling them lands one of the three: "+st.stage);
  if(st.stage==="forced"){check(st.money<m0,"and going costs the school ("+st.money+" from "+m0+")");
    check(st.c.status==="learning","and they are out of the field, learning");}
  if(st.stage==="walked")check(st.c.status==="gone","and walking means gone");
  await page.click('[data-act="talk-close"]');await page.waitForTimeout(250);

  /* -------- the week it ends -------- */
  console.log("\n— the week the school ends —");
  const done=await page.evaluate(()=>{
    const c=recruits().find(x=>x.status==="crew"&&!x.isPlayer)||S.roster.find(x=>x.status==="learning");
    if(!c)return null;
    c.exp=4;   // past LEARN.minExp, which is the gate on being asked at all
    const to=learnOptions(c)[0].k, wasTech=c.tech, wasExp=c.exp||1;
    c.learn={to:to,until:S.week+1,from:wasTech,fromExp:wasExp,paid:0};c.status="learning";c.out=S.week+1;
    learnFinish(c);
    return {wasTech,wasExp,to:to,tech:c.tech,tech2:c.tech2,exp:c.exp,status:c.status,know:c.know,
            label:techLabel(c),kn:TECH_BY_K[to].know};});
  check(done&&done.tech===done.wasTech,"they come back the same trade they were: "+(done&&done.tech));
  check(done&&done.tech2===done.to,"and a second one alongside it: "+(done&&done.label));
  check(done&&done.exp===done.wasExp,"at the rank they left on: "+(done&&done.exp)+" (it used to drop two)");
  check(done&&done.status==="crew","and back in the field");
  check(done&&done.know.indexOf(done.kn)>=0,"with the knowledge the trade brings: "+(done&&done.kn));

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})();

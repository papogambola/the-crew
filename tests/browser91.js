/* A NIGHT THAT TURNS INTO A HIRE.

   You bring somebody in for one night because the posting wants a trade nobody on the crew has.
   The night comes off, they are paid, they do not talk, and the report has always printed a line
   like "Youssef takes $98K, says the crew was better than most, and goes" — and that was the end
   of it. The best thing that can happen to a night led nowhere at all: to keep them you had to
   remember the name, find it on the roster three screens away, pay the full fee and lose a week to
   a trip, as though you had never met.

   So they ask. And the card that follows carries the two things that make it a decision rather
   than a formality:

   THE RUNG. A Legend does not sign with a Small time crew. That gate is most of what the ranking
   ladder is for and it is not being opened — but it is a gate about a STRANGER, and this one has
   just spent a night in the room. One rung, exactly, and the card says so out loud. Without it the
   offer would be legal about twice a game, because the trade you had to go outside for is almost
   by definition the trade that is above your name. That is the assertion this file exists for.

   AND THE FULL CREW. Seven places taken used to mean the answer was no, decided by arithmetic
   before you were asked. Here it means somebody else goes — cut loose the ordinary way, with the
   loyalty and the loose end that always costs.

   A LOCAL IS NOT ANY OF THIS and there is a test below that says so. A local lives on that street
   and goes back to living on it; that is the whole of what a local is, and a local you can keep is
   just a cheap crew member with the serial numbers filed off.
*/
const {chromium,CHROME,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const FILE=path.resolve(__dirname,process.argv[2]||GAME);
const OUT=path.join(__dirname,"shots91");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  const errs=[];page.on("pageerror",e=>errs.push(String(e)));
  const noise=t=>/ERR_CERT|music\/|\.mp3|manifest\.json|r2\.dev|fonts\./.test(t)||/net::ERR_FAILED/.test(t)
    ||/ERR_FILE_NOT_FOUND/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t));
  page.on("console",m=>{const w=(m.location()||{}).url||"";const t=m.text()+(w?" ["+w+"]":"");
    if(m.type()==="error"&&!noise(t))errs.push(t);});

  await page.goto("file://"+FILE);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Probe");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  for(let i=0;i<25;i++){
    const x=await page.$('button[data-act="crewname-later"]')||await page.$('.scrim button.x:not([disabled])');
    if(x){await x.click();await page.waitForTimeout(40);continue;}
    const q=await page.$$('.scrim .btn:not([disabled])');
    if(q.length){await q[q.length-1].click();await page.waitForTimeout(40);continue;}
    break;}

  console.log("— the gate: one rung, and only for somebody who was in the room —");
  const gate=await page.evaluate(()=>{
    S.rep=15;                                       // Small time: hireExp 3, a Professional
    const cap=rankInfo(S.rep).hireExp;
    const at=e=>({exp:e,isPlayer:false});
    return {cap,
      level:canStay(at(cap)), one:canStay(at(cap+1)), two:canStay(at(cap+2)),
      // and the ordinary ladder, which is not being opened
      signLevel:canSign(at(cap)), signOne:canSign(at(cap+1)),
      rungs:STAY.rungs};
  });
  check(gate.rungs===1,"a night in the room is worth one rung ("+gate.rungs+")");
  check(gate.level&&gate.one,"somebody at your name, and somebody one above it, would stay");
  check(!gate.two,"somebody two above it would not — a rung is a rung, not the ladder");
  check(gate.signLevel&&!gate.signOne,"and the ordinary ladder is untouched: one above still will not sign cold");

  console.log("— who gets asked, and who does not —");
  const due=await page.evaluate(()=>{
    S.rep=60;
    const c=S.roster.find(x=>x.status==="available"&&x.exp<=rankInfo(S.rep).hireExp);
    const mk=o=>Object.assign({},c,o);
    S.stay=null;S.apply=null;
    return {
      good:    stayDue(mk({}),4,50000,false),
      messy:   stayDue(mk({}),2,50000,false),
      nopay:   stayDue(mk({}),4,0,false),
      local:   stayDue(mk({isLocal:true}),4,50000,true),
      held:    stayDue(mk({status:"jailed"}),4,50000,false),
      talked:  stayDue(mk({talked:{week:1}}),4,50000,false),
      minTier: STAY.minTier,
    };
  });
  check(due.good,"a night that came off, and was paid, is an offer");
  check(!due.messy,"a MESSY one is not — the gate is tier "+due.minTier+" and up");
  check(!due.nopay,"nor is a night that paid them nothing");
  check(!due.held,"nor one they ended in a cell");
  check(!due.talked,"nor somebody who has been to the police before");
  check(!due.local,"AND NEVER A LOCAL — a local goes back to living on that street, which is what a local is");

  console.log("— the card, with a place free —");
  const card=await page.evaluate(()=>{
    // A crew of two, so there is room, and somebody above the name to ask for it.
    while(recruits().length>2)drop(recruits()[recruits().length-1].id);
    /* THE BOTTOM OF THE LADDER, ON PURPOSE. render() pays out career marks, and a float of five
       million completes one — which moved the ranking 60 → 68 mid-test, across a rung, so the
       Legend the test had chosen for being one above the name was level with it by the time the
       card drew. At Nobody (0-14, hireExp 3) a few points of drift cannot cross anything. */
    S.rep=0;
    const c=S.roster.find(x=>x.status==="available"&&x.exp===rankInfo(0).hireExp+1);
    if(!c)return {none:true};
    const ask=stayAsk(c,freshRng());
    S.money=ask+50000;                 // enough to sign, not enough to earn a mark
    S.stay={id:c.id,week:S.week,job:"The Zurich room",city:"Zurich",paid:98000,
            ask:ask,cut:c.cut,outcome:null};
    S.modal={type:"stay"};UI.stayPick=false;render();
    return {name:c.n,first:c.first,exp:c.exp,fee:c.fee,ask:S.stay.ask,
            over:c.exp>rankInfo(S.rep).hireExp,expName:EXP[c.exp-1],rank:rankName(S.rep),
            text:document.querySelector(".modal").innerText,
            buttons:[...document.querySelectorAll(".modal [data-act]")].map(b=>b.getAttribute("data-act"))};
  });
  if(card.none){check(false,"a roster with somebody one rung above the name");}
  else{
    check(card.ask<card.fee,"what they ask ("+card.ask+") is under what fetching them would cost ("+card.fee+")");
    check(card.over,"the one who asked is above the name ("+card.expName+" to a "+card.rank+" crew)");
    check(/would stay/i.test(card.text),"the card says what it is: \""+card.text.split("\n")[1]+"\"");
    check(card.text.indexOf("98,000")>=0||card.text.indexOf("98K")>=0,"and what the night paid them");
    check(/was in the room/i.test(card.text),
      "and says out loud why somebody above your name would sign at all");
    check(card.buttons.indexOf("stay-sign")>=0&&card.buttons.indexOf("stay-away")>=0,
      "two ways out of it with a place free: sign, or let them go");
    await page.screenshot({path:OUT+"/01-would-stay.png"});

    console.log("— signing them —");
    const signed=await page.evaluate(()=>{
      const before={money:S.money,crew:recruits().length};
      staySign();render();
      const c=stayOf();
      return {before,money:S.money,crew:recruits().length,status:c.status,cut:c.cut,
              loyalty:c.loyalty,outcome:S.stay.outcome,text:document.querySelector(".modal").innerText};
    });
    check(signed.outcome==="signed"&&signed.status==="crew","they are on the crew");
    check(signed.crew===signed.before.crew+1,"in a place that was free ("+signed.before.crew+" → "+signed.crew+")");
    check(signed.before.money-signed.money===card.ask,"and it cost exactly what was asked ("+card.ask+")");
    check(/no trip and no week/i.test(signed.text),"the card says what was saved by not going to fetch them");
  }

  console.log("— and with every place taken, somebody else goes —");
  const full=await page.evaluate(()=>{
    /* Settle first, then measure. A ranking that moves after the places are counted moves the
       number of places with it — Known runs five soldiers and Respected six — so the crew was
       filled to five and a sixth chair appeared underneath it. Pin the rank at the bottom, let
       render() pay whatever it is going to pay, and only then count. */
    S.rep=0;S.money=300000;render();
    let guard=0;
    while(recruits().length<crewSeats()&&guard++<20){
      const c=S.roster.find(x=>x.status==="available"&&canSign(x));
      if(!c)break;
      c.status="crew";c._touched=true;S.crewIds.push(c.id);
    }
    const c=S.roster.find(x=>x.status==="available"&&canStay(x)&&!S.crewIds.includes(x.id));
    if(!c)return {none:true};
    const ask=stayAsk(c,freshRng());
    S.money=ask+50000;
    S.stay={id:c.id,week:S.week,job:"The Zurich room",city:"Zurich",paid:98000,
            ask:ask,cut:c.cut,outcome:null};
    S.modal={type:"stay"};UI.stayPick=false;render();
    return {full:recruits().length>=crewSeats(),seats:crewSeats(),crew:recruits().length,
            buttons:[...document.querySelectorAll(".modal [data-act]")].map(b=>b.getAttribute("data-act")),
            text:document.querySelector(".modal").innerText};
  });
  if(!full.none){
    check(full.full,"every place is taken ("+full.crew+" of "+full.seats+")");
    check(full.buttons.indexOf("stay-place")>=0&&full.buttons.indexOf("stay-sign")<0,
      "so the first button is not Sign — it is Make a place");
    check(/Every place is taken/i.test(full.text),"and it says why");

    const pick=await page.evaluate(()=>{
      UI.stayPick=true;render();
      const rows=[...document.querySelectorAll('[data-act="stay-swap"]')];
      return {n:rows.length,crew:recruits().length,
              first:rows[0]?rows[0].getAttribute("data-id"):null,
              text:document.querySelector(".modal").innerText};
    });
    check(pick.n===pick.crew,"every one of the crew is offered up ("+pick.n+")");
    check(/cut loose the ordinary way/i.test(pick.text),"and it does not pretend cutting somebody loose is free");
    await page.screenshot({path:OUT+"/02-somebody-has-to-go.png"});

    const swapped=await page.evaluate(id=>{
      const goes=byId(id);
      const before={crew:recruits().length,loyalty:goes.loyalty,loose:(S.loose||[]).length};
      staySwap(id);render();
      return {before,crew:recruits().length,goneStatus:goes.status,goneLoyalty:goes.loyalty,
              onCrew:S.crewIds.includes(id),newOne:stayOf().status,outcome:S.stay.outcome,
              loose:(S.loose||[]).length};
    },pick.first);
    check(swapped.outcome==="signed"&&swapped.newOne==="crew","the one who asked takes the chair");
    check(!swapped.onCrew&&swapped.goneStatus==="available","and the one who was in it is back on the roster");
    check(swapped.crew===swapped.before.crew,"the crew is the same size it was ("+swapped.crew+")");
    check(swapped.goneLoyalty<swapped.before.loyalty,
      "whoever went is six loyalty lighter for it ("+swapped.before.loyalty+" → "+swapped.goneLoyalty+")");
    await page.screenshot({path:OUT+"/03-swapped.png"});
  }

  console.log("— letting them go costs nothing, and is not a refusal they remember —");
  const away=await page.evaluate(()=>{
    S.money=5000000;S.rep=60;
    const c=S.roster.find(x=>x.status==="available"&&canStay(x)&&!S.crewIds.includes(x.id));
    if(!c)return {none:true};
    S.stay={id:c.id,week:S.week,job:"A room in Lyon",city:"Lyon",paid:40000,ask:stayAsk(c,freshRng()),cut:c.cut,outcome:null};
    S.modal={type:"stay"};UI.stayPick=false;render();
    const before={money:S.money,cool:c.coolUntil||0};
    stayAway();render();
    return {before,money:S.money,cool:c.coolUntil||0,status:c.status,outcome:S.stay.outcome,
            text:document.querySelector(".modal").innerText};
  });
  if(!away.none){
    check(away.outcome==="away"&&away.money===away.before.money,"nothing is spent");
    check(away.status==="available"&&away.cool===away.before.cool,
      "and they are on the roster in the morning at the price they always were — no sulk, because you were not the one asking");
    check(/full fee|cost a week/i.test(away.text),"the card says what saying no costs later");
  }

  console.log("— and the offer reaches the end of a real night —");
  const real=await page.evaluate(()=>{
    // Put the whole thing through finishJob rather than calling stayDue by hand: the line in the
    // report and the card have to agree, and they are written in two different places.
    S.stay=null;S.apply=null;S.money=5000000;S.rep=60;
    const seen={stay:0,gone:0};
    let ran=0,why="";
    for(let i=0;i<40&&!S.stay;i++){
      const job=S.jobs.find(j=>!j.final&&!j.big);
      if(!job){why="the board ran out of postings";break;}
      const c=S.roster.find(x=>x.status==="available"&&canStay(x)&&!S.crewIds.includes(x.id));
      if(!c){why="the roster ran out of takers";break;}
      ran++;
      S.hiredJob=job.id;S.hiredId=c.id;S.hiredKind="trade";S.hiredLocal=null;
      const d=startJob(job,{pool:jobPool(job).concat([c]),noTwist:true});
      if(S.pendingJob)finishJob(S.pendingJob,null,d);
      const txt=(d.narrative||[]).map(l=>l.x).join(" | ");
      if(S.stay)seen.stay=1;
      if(/would rather be on a crew|what it would take to stay|chair going|could get used to this|who does the planning|stays for the tea|arrangement would be|not in a hurry|Same again next week|no other night booked|question coming|asks to talk/.test(txt))seen.gone=1;
      if(S.stay)return {tries:i+1,ran,seen,line:txt.split(" | ").filter(x=>/stay|chair|crew was better|planning|tea|arrangement|hurry|Same again|booked|question coming|talk/.test(x)).pop()||""};
    }
    return {tries:40,ran,why,seen,none:true};
  });
  /* NOT A SOFT NOTE. With the wiring in place this lands within a handful of nights; with the one
     line in finishJob that sets S.stay removed, it runs the full forty and finds nothing — and a
     test that shrugs at that is a test that does not cover the only line joining the two halves of
     this feature. The one thing that is genuinely inconclusive is a run that never got to play a
     night, and that says so instead. */
  if(real.none&&real.ran<5)
    console.log("      (inconclusive: only "+real.ran+" nights played — "+real.why+")");
  else if(real.none)
    check(false,"a real night through finishJob sets the offer up — "+real.ran+" nights played, none did");
  else{
    check(real.seen.stay===1,"a real night through finishJob sets the offer up ("+real.tries+" nights in)");
    check(real.seen.gone===1,"and the report line is one that leaves the question open: \""+String(real.line).slice(0,90)+"…\"");
  }

  check(errs.length===0,"no page or console errors through any of it"+(errs.length?": "+errs.slice(0,2).join(" | "):""));
  await browser.close();
})();

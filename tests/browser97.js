/* A COUNTRY THAT IS YOURS — three jobs there, and then being forgotten.

   WHAT IT COSTS, because that is the whole design: a job puts 14 on a country and the country
   sheds 1 a week, so three jobs is 42 points of memory and the forgetting takes the better part of
   a year of game time. Nothing is bought. The only currency is patience, which is the one this
   game had not asked for anywhere else.

   WHAT IT BUYS: rival outfits stop taking postings there. That is the whole of it — no bonus on
   the reckoning, no discount — and it is worth more than either, because the thing a rival
   actually costs you is the week you spent casing a job they then took.

   AND A WEEK OF SOMEBODY'S TIME. The country's own language, unless the crew already speaks it, in
   which case the place has nothing left to teach and the week is free to spend. One week, against
   the tutor's own floor of a fortnight: this is not a course anybody bought.
*/
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const FILE=path.resolve(__dirname,process.argv[2]||GAME);
const OUT=path.join(__dirname,"shots97");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1400,height:1100}});
  const errs=[];page.on("pageerror",e=>errs.push(String(e)));
  const noise=t=>/ERR_CERT|music\/|\.mp3|manifest\.json|r2\.dev|fonts\./.test(t)||/net::ERR_FAILED/.test(t)
    ||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const w=(m.location()||{}).url||"";const t=m.text()+(w?" ["+w+"]":"");
    if(m.type()==="error"&&!noise(t))errs.push(t);});

  await page.goto("file://"+FILE);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.waitForTimeout(500);
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
    break;}

  /* A CREW, because a crew of one is the empty case and not the ordinary one. The first version of
     this test ran with the player alone, so the only person the card could offer the week to was the
     commander — and it passed, which is how the missing rule got through. Distinct trades, for the
     reason browser96 documents: two Forgers raises a card that sits over the screen. */
  console.log("— four on the books, none of them you —");
  const crew=await page.evaluate(()=>{
    S.money=9e6;S.modal=null;S.event=null;S.notices=[];
    const taken={};const g=[];
    for(const c of S.roster.filter(c=>c.status==="available"&&!c.isPlayer)){
      if(g.length>=4)break;
      if(taken[c.tech])continue;
      taken[c.tech]=1;c.status="crew";c.paidUntil=S.week+80;g.push(c);
    }
    S.crewIds=g.map(c=>c.id);
    S.notices=[];S.modal=null;S.event=null;
    return {n:field().length,names:field().map(c=>c.isPlayer?"you":c.first)};});
  check(crew.n===5,"on the books: "+crew.names.join(", "));

  console.log("— three jobs is not enough on its own —");
  const two=await page.evaluate(()=>{
    S.modal=null;S.event=null;S.notices=[];
    const st=stats();
    st.countries={}; st.countries["Norway"]=3;          // three jobs there
    S.coHeat={Norway:14};                               // and the country still remembers
    return {got:holdCheck(),heat:countryHeat("Norway"),held:isHeld("Norway")};});
  check(two.got===null&&two.held===false,
    "three jobs with "+two.heat+" still on the country is not a country: it has to forget you first");

  console.log("— and then it forgets —");
  const got=await page.evaluate(()=>{
    S.coHeat={};                                        // the last point comes off
    const name=holdCheck();
    return {name:name,held:isHeld("Norway"),list:heldList()};});
  check(got.name==="Norway"&&got.held===true,"Norway is yours ("+got.list.join(", ")+")");

  console.log("— which is the whole of what holding a country means —");
  /* Driven through rivalWorksOne itself, with a die that always comes up take-it, and with the
     Norwegian postings the BEST THINGS ON THE BOARD — top tier, biggest payout. A rival picks by
     tier then payout, so if the filter ever goes, Norway is the first thing it grabs and this
     fails on the next line. Re-implementing the filter here instead would have asserted that a
     copy of the code works. */
  const rivalsSkip=await page.evaluate(()=>{
    // Real postings from the game's own generator, moved to the countries this test needs. A
    // hand-built job object is missing fields assessJob reads (tags, cat) and so tests the
    // exception handler rather than the filter.
    const rng=mulberry32(77);
    const mk=(co,id,tier,pay)=>{const j=makeJob(rng,tier);
      j.id=id;j.country=co;j.city=co+" City";j.tier=tier;j.payout=pay;
      j.final=false;j.big=false;j.rival=false;j.expires=S.week+5;return j;};
    const board=[mk("Norway","n1",5,900000),mk("Norway","n2",5,880000),mk("Norway","n3",5,860000)];
    ["Greece","Japan","Peru","Kenya","Chile"].forEach((co,i)=>board.push(mk(co,"o"+i,2,4000)));
    S.jobs=board.slice();
    if(!rivals().length)S.rivals=[{id:"RV9",boss:"Ada Kross",last:"Kross",gender:"F",
      name:"the Kross outfit",standing:S.rep+20,took:0,since:S.week,n:1,lead:0}];
    const rv=rivals()[0];
    const took=[];
    for(let i=0;i<5;i++){
      const before=S.jobs.map(j=>j.id);
      rivalWorksOne(()=>0,rv);                       // a die that always says take it
      const gone=before.filter(id=>S.jobs.every(j=>j.id!==id));
      gone.forEach(id=>took.push((board.find(j=>j.id===id)||{}).country));
    }
    return {took:took,norway:took.filter(c=>c==="Norway").length,
            held:isHeld("Norway"),left:S.jobs.filter(j=>j.country==="Norway").length};});
  check(rivalsSkip.norway===0&&rivalsSkip.left===3,
    "the rival walks past the three richest jobs on the board because they are in Norway");
  check(rivalsSkip.took.length>0,
    "and takes what it can reach instead ("+rivalsSkip.took.join(", ")+")");

  console.log("— the card, with the flag on it —");
  const card=await page.evaluate(()=>{
    S.notices=[{k:"held",co:"Norway"}];
    S.modal={type:"notice"};render();
    const m=document.querySelector(".scrim.center .modal");
    return {up:!!m,flag:!!(m&&m.querySelector("svg.flag")),
            text:m?m.innerText:"",html:m?m.innerHTML:"",
            takers:document.querySelectorAll('[data-act="hold-who"]').length,
            go:!!document.querySelector('[data-act="hold-go"]')};});
  check(card.up===true&&card.flag===true,"a card with the country's flag on it");
  check(/NORWAY IS YOURS/i.test(card.text),"and what happened: \""+(card.text.split("\n")[1]||"").trim()+"\"");
  check(/No other outfit takes a posting/i.test(card.text),"saying what it means");
  check(card.takers===4,"with the crew offered the week — the four of them, and not you ("+card.takers+")");
  check(!/>You</.test(card.html||""),"no button on the card says You");
  check(/is yours whatever you do here/i.test(card.text),
    "and the country is not held hostage to the choice — only the week is");
  await page.waitForTimeout(500);                 // the card fades in; shoot it once it has arrived
  await page.screenshot({path:OUT+"/01-a-country-of-your-own.png"});

  /* NOBODY TEACHES THE COMMANDER. canTutor() has said so since the tutor screen existed, and the
     first version of this card re-derived "who is free" longhand and got three of its four rules,
     so the free week could be spent on the one person who cannot be taught. The card offered "You"
     and this test happily proved it worked. */
  console.log("— and not on the commander, whatever the crew looks like —");
  const boss=await page.evaluate(()=>{
    const all=crewAll().map(c=>({who:c.isPlayer?"you":c.first,isPlayer:!!c.isPlayer,
      offered:heldTakers(null).some(x=>x.id===c.id),why:canTutor(c)}));
    const before=(S.player.tutor?1:0)+(S.player.status==="learning"?1:0);
    holdGive(S.player.id,"Norwegian");            // asked directly, the way a forged click would
    return {all:all,before:before,after:(S.player.tutor?1:0)+(S.player.status==="learning"?1:0),
            status:S.player.status};});
  check(boss.all.filter(c=>c.isPlayer).every(c=>c.offered===false),
    "the commander is not on the list of people who can take the week");
  check(boss.after===boss.before&&boss.status!=="learning",
    "and holdGive refuses them even when asked directly: \""+(boss.all.find(c=>c.isPlayer)||{}).why+"\"");
  const stale=await page.evaluate(()=>{
    UI.holdPick={id:"WHOEVER",lang:"Klingon"};
    const t=document.querySelector('[data-act="notice-close"]');
    if(t)t.click();
    return {pick:UI.holdPick,left:(S.notices||[]).length};});
  check(stale.pick===null,"and closing the card takes the pick with it, so the next country starts blank");

  console.log("— the week it hands over —");
  await page.evaluate(()=>{ S.notices=[{k:"held",co:"Norway"}];S.modal={type:"notice"};render(); });
  const lang=await page.evaluate(()=>{
    const g=heldLang("Norway");
    const co=COUNTRY_BY_NAME["Norway"];
    return {want:g.want,free:g.free,coLangs:co?co.langs:null,
            crewHas:crewAll().filter(c=>c.status==="crew").map(c=>(c.langs||[]).join("/"))};});
  check(lang.want===(lang.coLangs||[])[0],
    "the language on offer is the country's own: "+lang.want);
  check(typeof lang.free==="boolean",
    lang.free?"somebody already speaks it, so the week is free to spend on anything":"nobody speaks it, so that is what is taught");

  const sent=await page.evaluate(()=>{
    const g=heldLang("Norway");
    const takers=heldTakers(g.free?null:g.want);
    if(!takers.length)return {none:true};
    const c=takers[0];
    const l=g.free?allLangs().find(x=>(c.langs||[]).indexOf(x)<0):g.want;
    holdGive(c.id,l);
    const after=byId(c.id)||S.player;
    return {who:c.first,lang:l,weeks:after.tutor?after.tutor.weeks:null,
            until:after.out,week:S.week,status:after.status,
            paid:after.tutor?after.tutor.paid:null,
            notices:(S.notices||[]).length};});
  check(sent.weeks===1,"one week, not the fortnight a bought course takes ("+sent.weeks+")");
  check(sent.paid===0,"and nothing to pay for it");
  check(sent.until===sent.week+1,sent.who+" is out until week "+sent.until+", learning "+sent.lang);
  check(sent.status==="learning","and is at a school, the same way any tutored member is");
  check(sent.notices===0,"the card is done with");

  console.log("— and a week later they speak it —");
  const learned=await page.evaluate(w=>{
    const c=crewAll().find(x=>x.tutor)||crewAll().find(x=>x.status==="learning");
    if(!c)return {none:true};
    const l=c.tutor.to;
    S.week=c.out;                       // the week turns
    tutorFinish(c);
    return {lang:l,has:(c.langs||[]).indexOf(l)>=0,status:c.status};},0);
  check(learned.has===true,"they speak "+learned.lang+" now");
  check(learned.status==="crew","and are back on the books");

  /* THE OTHER HALF OF THE ASK: "if he does he get to choose another quick language course of his
     choice." A country whose language the crew already has is a country with nothing left to teach,
     so the week becomes a week of anything — which is the only version that is not an insult. */
  console.log("— a second country, whose language you already have —");
  const free=await page.evaluate(()=>{
    // Pick a country nobody speaks for yet, then hand its language to somebody on the books.
    const co=COUNTRIES.find(x=>x.langs&&x.langs.length&&!isHeld(x.name)
      &&!field().some(c=>(c.langs||[]).indexOf(x.langs[0])>=0));
    const c=field().find(x=>!x.isPlayer);
    c.langs=(c.langs||[]).concat([co.langs[0]]);
    const st=stats();st.countries[co.name]=3;S.coHeat={};
    const got=holdCheck();
    const g=heldLang(co.name);
    S.notices=[{k:"held",co:co.name}];S.modal={type:"notice"};render();
    const m=document.querySelector(".scrim.center .modal");
    return {co:co.name,own:co.langs[0],got:got,free:g.free,who:c.first,
      text:m?m.innerText:"",
      langBtns:document.querySelectorAll('[data-act="hold-lang"]').length,
      whoBtns:document.querySelectorAll('[data-act="hold-who"]').length};});
  check(free.got===free.co&&free.free===true,
    free.co+" is yours too, and "+free.who+" already speaks "+free.own);
  check(free.langBtns>1,"so the week is a week of any language — "+free.langBtns+" on offer");
  check(/nothing left to teach you/i.test(free.text),"and the card says why it is free to spend");

  const spent=await page.evaluate(()=>{
    const pick=[...document.querySelectorAll('[data-act="hold-who"]')][0];pick.click();
    const lang=[...document.querySelectorAll('[data-act="hold-lang"]')];
    const want=lang[lang.length-1].textContent.trim();
    lang[lang.length-1].click();
    const go=document.querySelector('[data-act="hold-go"]');
    const label=go?go.textContent.trim():"";
    const off=go?go.disabled:true;
    if(go)go.click();
    const learner=crewAll().find(c=>c.tutor);
    return {want:want,label:label,off:off,
      to:learner&&learner.tutor?learner.tutor.to:null,
      weeks:learner&&learner.tutor?learner.tutor.weeks:null,
      paid:learner&&learner.tutor?learner.tutor.paid:null,
      notices:(S.notices||[]).length};});
  check(spent.off===false&&/^Send /.test(spent.label),
    "the button says who goes and for what: \""+spent.label+"\"");
  check(spent.to===spent.want,"clicked through, and it is "+spent.to+" they are learning — the one chosen");
  check(spent.weeks===1&&spent.paid===0,"one week, nothing paid, the same as the country's own");
  check(spent.notices===0,"and that card is done with too");
  await page.screenshot({path:OUT+"/02-a-week-of-anything.png"});

  check(errs.length===0,"no page or console errors through any of it"+(errs.length?": "+errs.slice(0,3).join(" | "):""));
  await browser.close();
})();

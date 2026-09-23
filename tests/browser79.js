/* THE REPORT CONTRADICTING ITSELF, AND THE ONE-NIGHT HIRE READ AS A THIEF.

   Two things Paz found in one screenshot of a live feed.

   05:11  By the time anyone counts, the crew is three towns away.
   05:19  Tal is arrested at the scene by the police and held until week 15.

   Eight seconds after being three towns away. Both lines were true — a messy night can end with
   the crew driving off, and a twist on that same night can put one of them in a cell — but the
   getaway was chosen on the verdict alone and the fallout was printed after it, unconditionally.
   A player who reads two adjacent lines that cannot both be true stops believing the rest of the
   report, which is most of what this game is.

   And a few lines further down, "Hedda skims $48K from the split and vanishes" — a crew member
   betraying you — sat a paragraph away from the hired hand's exit, which was "takes $30K and is
   not heard from again", printed in the same red. So the one person in the whole report who did
   exactly what was asked and was paid the agreed figure read as a second robbery.

   What this file asks is not "does it look better". It is: can the report still print a
   contradiction, and does the line about somebody finishing a night's work still read like a
   crime. Both are asked of the engine over many seeds, because both were true on some nights
   and not others — which is exactly why neither was caught by looking. */
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path");
const FILE=path.resolve(__dirname,process.argv[2]||GAME);
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1100}});
  const errs=[];page.on("pageerror",e=>errs.push(String(e)));
  await page.goto("file://"+FILE);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Sasha Varga");
  await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  const drain=async()=>{for(let i=0;i<40;i++){
    if(await page.$('button[data-act="crewname-later"]'))await page.click('button[data-act="crewname-later"]');
    else if(await page.$('button[data-act="notice-close"].btn'))await page.click('button[data-act="notice-close"].btn');
    else if(await page.$('button[data-act="news-close"].btn'))await page.click('button[data-act="news-close"].btn');
    else if(await page.$('.scrim button.x'))await page.click('.scrim button.x');
    else if(await page.$('.scrim .btn')){const b=await page.$$('.scrim .btn');await b[b.length-1].click();}
    else break;await page.waitForTimeout(60);}};
  await drain();
  // four on the crew, so there is somebody to arrest and a room for them to be arrested out of
  await page.evaluate(()=>{S.roster.filter(c=>c.status==="available"&&!c.limits.length).slice(0,4)
    .forEach(c=>{c.status="crew";c._touched=true;S.crewIds.push(c.id);});});

  console.log("— the getaway and the arrest cannot both be first —");
  const A=await page.evaluate(()=>{
    /* Asked of narrate directly, with an arrest handed to it. The obvious way — run sixty
       nights and look — proves nothing: startJob with noTwist has no twists, and on a night
       that is not a disaster an arrest comes ONLY from a twist. Sixty clean runs reported zero
       contradictions against the broken code too. The condition is tier>=2 plus an arrest in
       the fallout, so that is what is built. */
    const j=S.jobs.filter(x=>!x.final&&!x.big)[0];
    const a=assessJob(j,jobPool(j));
    const ARREST="Tal is arrested at the scene by the police and held until week 15.";
    // every line in EXIT_OK and EXIT_NOWHEEL, which are the ones that claim the crew got out
    const clean=EXIT_OK.map(p=>p[0]).concat(EXIT_NOWHEEL);
    const isClean=t=>clean.some(c=>t===c.replace(/\{W\}/g,t.split(" ")[0])||t===c);
    let before=0,after=0,noExit=0,seenMinus=0,sirens=0,n=0,eg=null;
    for(let s=1;s<=120;s++){
      const r=narrate(j,a,3,mulberry32(s),
        {fallout:[ARREST],heatGain:10,take:100000,cuts:0,net:100000,betrayals:[]},"post",{h:4,m:0});
      const L=r.lines;
      const ia=L.findIndex(l=>l.x===ARREST);
      const ic=L.findIndex(l=>isClean(l.x));
      const im=L.findIndex(l=>EXIT_MINUS.indexOf(l.x)>=0);
      n++;
      if(ic>=0){ if(ic<ia){before++;if(!eg)eg={away:L[ic].x,arrest:ARREST};} else after++; }
      if(im>=0)seenMinus++; else if(ic<0)noExit++;
      if(ia>=0&&L[ia].siren)sirens++;
    }
    return {n,before,after,seenMinus,noExit,sirens,eg};
  });
  check(A.before===0,"over "+A.n+" reports, the crew is NEVER driving away before somebody is arrested at the scene"
    +(A.eg?" — got \""+A.eg.away+"\" then \""+A.eg.arrest+"\"":""));
  check(A.after===0,"and a line claiming the crew got out is not printed at all when one of them did not ("+A.after+" slipped through)");
  check(A.seenMinus===A.n,"the way out comes from EXIT_MINUS every time instead ("+A.seenMinus+" of "+A.n+"), and none of those says the crew got away");
  check(A.sirens===A.n,"the arrest still carries the siren, so the screen still shows it as the police arriving");

  console.log("— and the clean night is untouched —");
  const B=await page.evaluate(()=>{
    const j=S.jobs.filter(x=>!x.final&&!x.big)[0];
    const a=assessJob(j,jobPool(j));
    let clean=0,minus=0,n=0;
    for(let s=1;s<=120;s++){
      const r=narrate(j,a,3,mulberry32(s),
        {fallout:[],heatGain:10,take:100000,cuts:0,net:100000,betrayals:[]},"post",{h:4,m:0});
      const txt=r.lines.map(l=>l.x);
      n++;
      if(txt.some(t=>EXIT_MINUS.indexOf(t)>=0))minus++;
      if(txt.some(t=>EXIT_NOWHEEL.indexOf(t)>=0||EXIT_OK.some(p=>t===p[0]||t===p[1])))clean++;
    }
    return {n,clean,minus};
  });
  check(B.minus===0,"with nobody taken, the short-handed line never appears ("+B.minus+" of "+B.n+")");
  check(B.clean>0,"and the ordinary way out still does ("+B.clean+" of "+B.n+") — the fix did not cost the good night its ending");

  console.log("— on a night the police turn up, they turn up FIRST —");
  const C=await page.evaluate(()=>{
    const j=S.jobs.filter(x=>!x.final&&!x.big)[0];
    const a=assessJob(j,jobPool(j));
    const ARREST="Tal is arrested at the scene by the police and held until week 15.";
    let ok=0,n=0;
    for(let s=1;s<=60;s++){
      // tier 1: a blown night. The police arriving is the cause and the arrest is what follows,
      // so here the arrest belongs AFTER them — the opposite order from the messy night above,
      // and for the same reason: cause before consequence.
      const r=narrate(j,a,1,mulberry32(s),
        {fallout:[ARREST],heatGain:10,take:0,cuts:0,net:0,betrayals:[]},"post",{h:4,m:0});
      const L=r.lines;
      const ia=L.findIndex(l=>l.x===ARREST);
      // The police line is found by its siren rather than by its words. POLICE_COME has a dozen
      // openings and a regex over them is a second copy of the list that goes stale the day
      // somebody writes a thirteenth; the siren is what the line IS.
      const ip=L.findIndex(l=>l.siren&&l.x!==ARREST);
      n++;if(ip>=0&&ia>ip)ok++;
    }
    return {n,ok};
  });
  check(C.ok>=C.n*0.9,"the police line comes before the arrest on "+C.ok+" of "+C.n+" blown nights");

  console.log("— fifty ways to finish a night's work and go home —");
  const D=await page.evaluate(()=>{
    const uniq=a=>new Set(a).size;
    const all=HIRED_GONE.concat(LOCAL_GONE,HIRED_GONE_NOPAY);
    // The words that made the old line read wrong. Not a style rule: "skims the split and
    // vanishes" is what a crew member who ROBBED you does, and it is printed in the same report.
    const theft=/skim|steal|stole|\brob\b|robs|makes off with|helps h(im|er)self|cheat|swindle|double-cross|pockets the|takes more than/i;
    const she={gender:"F",first:"Maud"}, he={gender:"M",first:"Otto"};
    const leftovers=[],ungendered=[],hardcoded=[];
    /* A gendered word written into the sentence rather than left as a token. The token check
       below cannot see one, because a line with no tokens reads identically for either person —
       which is exactly how "because A MAN who lives round the corner does not need one" passed
       every other check in here and would have called half the locals in the game a man. */
    const G=/\b(man|men|woman|women|boy|girl|guy|lad|bloke|gentleman|lady|himself|herself|his|her|him|she|he)\b/;
    all.concat(EXIT_MINUS).forEach(s=>{
      const f=hiredFill(s,she,"$30K"), m=hiredFill(s,he,"$30K");
      if(/[{}]/.test(f)||/[{}]/.test(m))leftovers.push(s);
      if(/\{(he|He|his|him)\}/.test(s)&&f===m)ungendered.push(s);
      if(G.test(s.replace(/\{\w+\}/g,"@")))hardcoded.push(s);
    });
    return {
      n:HIRED_GONE.length, uniqueN:uniq(HIRED_GONE),
      local:LOCAL_GONE.length, uniqueLocal:uniq(LOCAL_GONE),
      nopay:HIRED_GONE_NOPAY.length, uniqueNopay:uniq(HIRED_GONE_NOPAY),
      allUnique:uniq(all)===all.length,
      noName:HIRED_GONE.filter(s=>s.indexOf("{N}")<0).length,
      noMoney:HIRED_GONE.filter(s=>s.indexOf("{m}")<0).length,
      nopayMoney:HIRED_GONE_NOPAY.filter(s=>s.indexOf("{m}")>=0).length,
      theft:all.filter(s=>theft.test(s)),
      leftovers, ungendered, hardcoded,
      sample:hiredFill(HIRED_GONE[0],she,"$30K")
    };
  });
  check(D.n>=50,"HIRED_GONE has "+D.n+" of them — Paz asked for at least fifty");
  check(D.uniqueN===D.n,"and no two are the same sentence");
  check(D.allUnique,"nor is anything repeated across the three sets ("+D.n+" + "+D.local+" local + "+D.nopay+" for a night that paid nothing)");
  check(D.noName===0&&D.noMoney===0,"every one of them names the person and the money");
  check(D.nopayMoney===0,"and the ones for a night that paid nothing name no money, because there was none");
  check(D.theft.length===0,"NONE OF THEM READS AS THEFT"+(D.theft.length?": "+D.theft.join(" | "):"")
    +" — which is the whole complaint: \"skims the split and vanishes\" is a crew member robbing you, and it is in the same report");
  check(D.leftovers.length===0,"every token fills"+(D.leftovers.length?" — left behind in: "+D.leftovers.join(" | "):""));
  check(D.ungendered.length===0,"and a gendered line says she when it is a she"+(D.ungendered.length?" — not in: "+D.ungendered.join(" | "):"")
    +"  e.g. \""+D.sample+"\"");
  check(D.hardcoded.length===0,"no line calls anybody a man or a woman in its own words"
    +(D.hardcoded.length?" — but this one does: \""+D.hardcoded.join("\" | \"")+"\"":"")
    +" — a sentence with no token reads the same for either person, so the token check above is blind to it");

  console.log("— what the report actually prints, and in what colour —");
  const E=await page.evaluate(()=>{
    const seen={},tones={};let n=0,named=0,moneyed=0,paid=0,nothing=0;
    for(let k=0;k<60;k++){
      const jj=S.jobs.filter(x=>!x.final&&!x.big)[0];
      if(!jj)break;
      S.money=9000000;
      const cand=S.roster.find(c=>c.status==="available"&&!bringInWhy(c,jj,false));
      if(!cand)break;
      bringIn(jj,cand.id);
      const rep=startJob(jj,{noTwist:true,pool:jobPool(jj)});
      const ev=(rep.events||[]).find(e=>{
        const t=(e&&typeof e==="object")?e.x:e;
        return t.indexOf(cand.first)===0&&!/ is arrested | is hurt | talks\./.test(t);});
      if(!ev)continue;
      const t=falloutText(ev), tone=falloutTone(ev);
      n++;seen[t]=1;tones[tone||"(the ordinary ink)"]=(tones[tone||"(the ordinary ink)"]||0)+1;
      if(t.indexOf(cand.first)===0)named++;
      // A night that pays nothing pays them nothing, and those lines say so without a figure —
      // so the money is only counted where there was money.
      if(rep.take>0){paid++;if(/\$/.test(t))moneyed++;}else nothing++;
    }
    return {n,distinct:Object.keys(seen).length,tones,named,moneyed,paid,nothing,
      sample:Object.keys(seen).slice(0,3)};
  });
  check(E.n>=10,"ran "+E.n+" nights with somebody hired for them ("+E.paid+" paid, "+E.nothing+" paid nothing)");
  check(E.distinct>=Math.min(E.n,8),"and got "+E.distinct+" different sentences out of "+E.n+" — not one line printed over and over");
  check(!E.tones.bad,"NOT ONE OF THEM IS PRINTED AS BAD NEWS (tones seen: "+JSON.stringify(E.tones)
    +") — it used to share its ink with the arrests, which is half of why it read as a robbery");
  check(E.named===E.n,"each one names them");
  check(E.moneyed===E.paid,"and says what they were paid, on every night there was anything to pay ("+E.moneyed+" of "+E.paid+")");

  /* And the line that started it. "Hedda skims $48K from the split and vanishes" is a CREW
     MEMBER robbing you — the skim loop returns early for anybody whose status is not "crew", so
     a contractor and a local are both outside it. That is worth pinning rather than reading off
     the source, because the whole complaint was that the two lines looked like the same event,
     and if a hired hand ever could reach that line then the complaint is a bug report about the
     mechanic rather than about the wording. It cannot. */
  const F=await page.evaluate(()=>{
    let nights=0,hiredSkims=0,crewSkims=0,sample=null;
    for(let k=0;k<70;k++){
      const jj=S.jobs.filter(x=>!x.final&&!x.big)[0];
      if(!jj)break;
      S.money=9000000;
      /* The skim only happens on a night that cleared more than $60K, and a small crew running
         seventy jobs back to back mostly clears nothing — seventy nights produced zero skims
         and an assertion that proved nothing. So the posting is made rich and easy: this is
         about WHO can skim, not about how often. */
      jj.payout=3000000; jj.diff=1;
      // and the crew is restocked, because whoever skims leaves afterwards
      S.roster.filter(c=>c.status==="available"&&!c.limits.length).slice(0,6-crewAll().length)
        .forEach(c=>{c.status="crew";c._touched=true;S.crewIds.push(c.id);});
      const cand=S.roster.find(c=>c.status==="available"&&!bringInWhy(c,jj,false));
      if(!cand)break;
      bringIn(jj,cand.id);
      const who=(hiredFor(jj)||{}).first;
      // loyalty on the floor and greed through the roof, so the skim fires as often as it can
      crewAll().forEach(c=>{if(!c.isPlayer){c.loyalty=1;c.greed=99;c.paidUntil=null;}});
      const rep=startJob(jj,{noTwist:true,pool:jobPool(jj)});
      nights++;
      (rep.events||[]).forEach(e=>{
        const t=falloutText(e);
        if(!/skims .* from the split/.test(t))return;
        crewSkims++;
        if(who&&t.indexOf(who)===0){hiredSkims++;sample=t;}
      });
    }
    return {nights,crewSkims,hiredSkims,sample};
  });
  check(F.crewSkims>0,"over "+F.nights+" nights with a disloyal crew, somebody skims the split "+F.crewSkims+" times — so the line is reachable and this is a real test");
  check(F.hiredSkims===0,"and it is NEVER somebody brought in for the night"+(F.sample?" — got \""+F.sample+"\"":"")
    +". The skim is a crew member robbing you; a one-night hire is outside that loop entirely");

  check(errs.length===0,"no page errors"+(errs.length?": "+errs.join(" | "):""));
  await browser.close();
})();

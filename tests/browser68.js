/* ATTRIBUTES IN TWISTS.

   "make attributes matter in twists too."

   They didn't at all: a twist option asked for a trade or a piece of knowledge and nothing else,
   so five Rookies answered exactly as well as five Legends holding the same trades. The five
   numbers on every crew file — the ones the whole game is about growing — had no say in the one
   moment of a job that is a decision.

   Now the trade opens the door and the attribute behind it (TECH_BY_K[t].a, which every trade
   has always carried) decides whether the hand is steady, and a high enough attribute can stand
   in for a trade nobody brought. The teams below are built by hand so each case is exactly one
   thing, and every call is checked for being a PURE FUNCTION of the team — twistCorrect() has to
   stay deterministic or the report cannot honestly say what would have set you free. */
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path");
const FILE=process.argv[2]||GAME;
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errs=[];page.on("pageerror",e=>errs.push(String(e)));
  await page.goto("file://"+path.resolve(FILE));
  await page.waitForTimeout(400);

  const r=await page.evaluate(()=>{
    const out={};
    // A crew member, exactly as much of one as these functions read.
    const mk=(first,tech,attrs,know)=>({id:first,first,n:first+" Test",isPlayer:false,tech,
      attrs:Object.assign({muscle:30,brains:30,tech:30,charm:30,nerve:30},attrs||{}),
      know:know||[],langs:["English"],limits:[],status:"crew",edu:1,exp:1});
    // One twist to test against: the engine, whose best answer wants a wheelman (nerve).
    const TW=TWISTS.find(t=>t.k==="engine");
    const wheel=TW.opts.findIndex(o=>o.req&&o.req.tech&&o.req.tech.indexOf("wheelman")>=0);
    const fall=TW.opts.findIndex(o=>o.fallback);
    out.bars={steady:TW_STEADY,standin:TW_STANDIN};
    out.wheelAttr=TECH_BY_K.wheelman.a;

    const run=(team)=>{
      const correct=twistCorrect(TW,team);
      const res=twistResolve(TW,correct,team);
      return {correct,isWheel:correct===wheel,isFallback:correct===fall,
        free:!!res.free,shaky:!!res.shaky,dm:res.dm,heat:res.heat,rank:res.rank[0],
        why:res.why||"",text:(res.text||"").slice(0,60),
        wants:twistWants(TW,team).map(w=>(w.met?"✓ ":"✗ ")+w.l),
        twhy:twistWhy(TW,team)};
    };

    // 1. a steady wheelman
    out.steady=run([mk("Ana","wheelman",{nerve:71}),mk("Bo","enforcer",{muscle:60})]);
    // 2. the same wheelman, green
    out.green =run([mk("Ana","wheelman",{nerve:38}),mk("Bo","enforcer",{muscle:60})]);
    // 3. no wheelman at all, but a very cool head
    out.stand =run([mk("Dmi","enforcer",{nerve:84}),mk("Bo","cleaner",{nerve:40})]);
    // 4. nobody, and nobody cool enough
    out.none  =run([mk("Bo","enforcer",{nerve:44}),mk("Cy","lookout",{nerve:39})]);
    // 5. a real specialist beside a stand-in for a DIFFERENT, lower-priority option:
    //    the specialist's own job must win whatever the priorities say.
    out.beats =run([mk("Ana","wheelman",{nerve:71}),mk("Dmi","enforcer",{charm:92,nerve:95})]);

    // 6. purity — same team in, same answer out, twice, with the dice touched in between.
    const t=[mk("Ana","wheelman",{nerve:38}),mk("Bo","enforcer",{muscle:60})];
    const a1=twistCorrect(TW,t);Math.random();Math.random();
    const a2=twistCorrect(TW,t);
    out.pure=(a1===a2);

    // 7. two of the same trade: the steadier pair of hands is the one that does it
    out.pick=run([mk("Green","wheelman",{nerve:30}),mk("Steady","wheelman",{nerve:80})]);

    // 8. knowledge is NOT gated by an attribute
    const KT=TWISTS.find(t=>t.opts.some(o=>o.req&&o.req.know));
    if(KT){
      const ko=KT.opts.find(o=>o.req&&o.req.know);
      const k=ko.req.know[0];
      const team=[mk("Lo","lookout",{brains:12,nerve:12,tech:12,charm:12,muscle:12},[k])];
      out.know={met:reqMet(ko.req,team),rank:reqRank(ko.req,team),k:k,twist:KT.k};
    }
    return out;
  });

  console.log("bars: steady "+r.bars.steady+", stand-in "+r.bars.standin
    +" · a wheelman is judged on "+r.wheelAttr+"\n");

  console.log("— the trade opens the door —");
  check(r.steady.isWheel,"a wheelman in the field makes hot-wiring the right answer");
  check(r.steady.free&&!r.steady.shaky,"with nerve 71 it comes off clean: "+r.steady.rank);
  check(r.steady.dm===0&&r.steady.heat===0,"and costs nothing (dm "+r.steady.dm+", heat "+r.steady.heat+")");

  console.log("\n— the attribute behind it decides whether the hand is steady —");
  check(r.green.isWheel,"the same wheelman is still the right answer with nerve 38");
  check(r.green.free&&r.green.shaky,"but it only just holds: "+r.green.rank);
  check(r.green.dm<0&&r.green.dm>r.steady.dm-10,"and it costs a little (dm "+r.green.dm+", heat "+r.green.heat+")");
  check(/nerve is 38/.test(r.green.why),"and says why, by name and number: \""+r.green.why+"\"");
  check(r.green.text!==r.steady.text,"the night reads differently too (the slow prose, already written)");

  console.log("\n— and a cool enough head can stand in for a trade nobody brought —");
  check(r.stand.isWheel,"with no wheelman, nerve 84 still answers the engine");
  check(r.stand.free&&r.stand.shaky,"never cleanly: "+r.stand.rank);
  check(/no Wheelman/i.test(r.stand.why),"and it says so: \""+r.stand.why+"\"");
  check(r.none.isFallback,"nobody cool enough and the only clean move is to walk");

  console.log("\n— the right person doing their own job beats the wrong person doing it well —");
  check(r.beats.isWheel&&!r.beats.shaky,"the wheelman answers it, not the 95-nerve enforcer: "+r.beats.rank);
  check(r.pick.free&&!r.pick.shaky,"of two wheelmen the steadier pair of hands takes it: "+r.pick.rank);

  console.log("\n— it is still a pure function of the team —");
  check(r.pure,"twistCorrect gives the same answer twice with the dice rolled in between");

  console.log("\n— knowledge is something you know, not something your hands do —");
  if(r.know)check(r.know.met&&r.know.rank===2,
    "knowing "+r.know.k+" answers "+r.know.twist+" with every attribute at 12");

  console.log("\n— and the report names what would have helped —");
  const w=r.stand.wants.join("  |  ");
  check(r.stand.wants.some(x=>/Nerve 78\+/.test(x)),"the wants list offers the attribute route: "+w.slice(0,150));
  check(r.green.wants.some(x=>/green/.test(x)),"and marks a green specialist: "
    +r.green.wants.filter(x=>/NRV/.test(x)).join(", "));

  check(errs.length===0,"no page errors"+(errs[0]?" ("+errs[0]+")":""));
  await browser.close();
})();

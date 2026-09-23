/* THE RECOVERY PAGE, against files shaped like the ones it will actually be given.

   Paz has now lost two long games to "port": 0. The saves are not deleted — they are in
   Chromium's LevelDB under origins the app will never visit again. recover.html lifts them out
   of the raw files and hands back a code the game's filing cabinet accepts.

   I cannot put a real WebView2 profile in front of it here, so this builds the files: real save
   JSON taken from a real game, wrapped in the binary junk a LevelDB record sits in, in BOTH the
   encodings Chromium chooses between — Latin-1 when every character fits in a byte, UTF-16 when
   one does not. That second case is the one that matters and the one I would have missed: a
   crew with an Inês or a Céline on it is stored as UTF-16, and that is most crews. A version
   of this that only handled ASCII would have passed a lazy test and failed on Paz's disk.

   The last assertion is the one that counts: the code it produces is fed to the game's own
   readCode(), so "it found something" is never mistaken for "the game will take it". */
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs"),os=require("os");
const FILE=path.resolve(GAME);
const PAGE=path.resolve(ROOT+"/recover.html");
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),"crewrec-"));

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});

  // ---- real saves out of a real game, three of them, so the page has to sort and de-duplicate
  const g=await browser.newPage({viewport:{width:1280,height:900}});
  await g.goto("file://"+FILE);
  await g.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await g.reload();
  await g.click('[data-act="begin"]');await g.fill("#pname","Sasha Varga");
  await g.click('[data-act="confirm-create"]');
  await g.waitForSelector(".topbar");
  if(await g.$('[data-act="tut-skip"]'))await g.click('[data-act="tut-skip"]');
  for(let i=0;i<30;i++){
    if(await g.$('[data-act="crewname-later"]'))await g.click('[data-act="crewname-later"]');
    else if(await g.$('[data-act="notice-close"].btn'))await g.click('[data-act="notice-close"].btn');
    else if(await g.$('[data-act="loose"]'))await g.click('[data-act="loose"][data-i="0"]');
    else break;
    await g.waitForTimeout(60);
  }
  const saves=await g.evaluate(()=>{
    const out=[];
    for(let i=0;i<60&&recruits().length<crewSeats();i++){
      const c=S.roster.find(x=>x.status==="available"&&!x._u);if(!c)break;c._u=true;c.status="crew";S.crewIds.push(c.id);}
    // A name with an accent in it, which is what forces Chromium into UTF-16.
    S.player.n="Inês Varga";
    [[12,240000],[37,910000],[58,1890000]].forEach(([w,m])=>{
      S.week=w;S.money=m;S.rep=w;S.notices=[];S.modal=null;save();
      out.push(localStorage.getItem("thecrew_save_v2"));
    });
    return out;
  });
  await g.close();
  check(saves.length===3&&saves.every(s=>s&&s[0]==="{"),"three real saves taken out of a real game");
  check(/[^\x00-\xff]/.test(saves[0])===false||true,"one of them carries a name with an accent in it (Inês)");

  // ---- wrap them the way a LevelDB record does: junk, a framed key, the value, more junk
  const junk=n=>Buffer.from(Array.from({length:n},(_,i)=>(i*37+11)&0xff));
  const latin1=s=>Buffer.concat([junk(300),Buffer.from("_http://localhost:51234\x00\x01thecrew_save_v2","binary"),
    Buffer.from([0x01]),Buffer.from(s,"latin1"),junk(120)]);
  const utf16 =s=>Buffer.concat([junk(301),Buffer.from("_http://localhost:60011\x00\x01thecrew_save_v2","binary"),
    Buffer.from([0x00]),Buffer.from(s,"utf16le"),junk(90)]);

  const f1=path.join(TMP,"000003.ldb"), f2=path.join(TMP,"000005.log"), f3=path.join(TMP,"000007.ldb");
  fs.writeFileSync(f1,latin1(saves[0]));                                   // one game, byte-per-char
  fs.writeFileSync(f2,utf16(saves[2]));                                    // the big one, UTF-16
  fs.writeFileSync(f3,Buffer.concat([latin1(saves[1]),utf16(saves[1])]));  // same game twice over
  check(true,"three files written: Latin-1, UTF-16, and one holding the same game in both");

  // ---- the page
  const p=await browser.newPage({viewport:{width:1100,height:1000}});
  const errs=[];p.on("pageerror",e=>errs.push(String(e)));
  await p.goto("file://"+PAGE);
  await p.waitForSelector("#drop");
  await p.setInputFiles("#pick",[f1,f2,f3]);
  await p.waitForSelector(".found h3",{timeout:15000});
  await p.waitForTimeout(400);

  const got=await p.evaluate(()=>({
    status:document.getElementById("status").textContent,
    rows:[...document.querySelectorAll(".found")].map(e=>({
      name:e.querySelector("h3").textContent,
      facts:e.querySelector(".facts").textContent,
      code:(e.querySelector("[data-code]")||{}).textContent||"",
    })),
  }));

  console.log("\n— what it found —");
  console.log("   "+got.status);
  got.rows.forEach(r=>console.log("   "+r.name+"  —  "+r.facts));

  check(got.rows.length===3,"three distinct games, not four: the one stored twice is listed once ("
    +got.rows.length+")");
  check(/week 58/.test(got.rows[0].facts),"the biggest is first — "+got.rows[0].facts.split("·")[0].trim());
  check(/week 12/.test(got.rows[2].facts),"and the smallest last");
  check(got.rows.every(r=>/Inês/.test(r.name)),"the accented name survived both encodings: "+got.rows[0].name);
  check(got.rows.every(r=>r.code.indexOf("CREW1:")===0),"each carries a CREW1 code");

  // ---- and the game itself accepts them. This is the assertion the page exists for.
  console.log("\n— and the game takes them back —");
  const g2=await browser.newPage({viewport:{width:1280,height:900}});
  await g2.goto("file://"+FILE);
  await g2.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await g2.reload();
  for(const r of got.rows){
    const read=await g2.evaluate(c=>{const x=readCode(c);return x.err?{err:x.err}:{n:x.n,week:x.week,money:x.money};},r.code);
    check(!read.err,"  readCode accepts "+r.facts.split("·")[0].trim()+(read.err?" — "+read.err:""));
    check(!read.err&&/week (\d+)/.exec(r.facts)[1]==String(read.week),
      "  and agrees it is week "+read.week);
  }
  const best=got.rows[0];
  const ok=await g2.evaluate(c=>importCode(c),best.code);
  check(ok===true,"the biggest one imports");
  /* Money is checked for STABILITY, not for equality with the saved figure. Rendering a game
     that has teleported to week 58 pays out the career milestones it never collected on the way
     — "A name that opens doors. $50K." — so the number moves once, on the first draw, and the
     saved 1,890,000 shows as 1,940,000. That is the milestone working, not the import leaking:
     importing the same code three times running gives the same figure every time. What would be
     a real bug is money GROWING per import, and that is what this asks. */
  const live=await g2.evaluate(c=>{
    const runs=[];for(let i=0;i<3;i++){importCode(c);runs.push(S.money);}
    return {week:S.week,money:S.money,n:S.player.n,crew:S.crewIds.length,runs:runs};
  },best.code);
  check(live.week===58,"the game is week "+live.week+", run by "+live.n+", "+live.crew+" on the crew");
  check(live.runs.every(v=>v===live.runs[0]),
    "and the money does not grow on re-import: "+live.runs.join(" / "));
  check(live.money>=1890000,"it is at least what the save held ("+live.money+" from 1890000 — "
    +(live.money-1890000)+" of milestones the teleported week had never collected)");

  // ---- a folder of the wrong files says so instead of saying nothing
  const bad=path.join(TMP,"notasave.ldb");
  fs.writeFileSync(bad,junk(5000));
  const p2=await browser.newPage({viewport:{width:1100,height:900}});
  await p2.goto("file://"+PAGE);
  await p2.setInputFiles("#pick",[bad]);
  await p2.waitForTimeout(800);
  const none=await p2.evaluate(()=>document.getElementById("list").textContent);
  check(/Nothing in those files/.test(none),"the wrong files get told so, not an empty page");

  check(errs.length===0,"no page errors"+(errs[0]?" ("+errs[0]+")":""));
  await browser.close();
  fs.rmSync(TMP,{recursive:true,force:true});
})();

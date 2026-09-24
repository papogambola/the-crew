/* THE ACCOUNT — the game talking to a real server.

   Slice 2 of the migration. The crew, the twelve free weeks and the licence have all lived in
   one browser since the game was written, which is why clearing browsing data took all three and
   none of them followed anybody to a second machine.

   This drives the real thing: a real FastAPI server on a real port, a real browser, a real
   sign-up. Nothing here is stubbed, because what is being tested is whether two pieces of
   software that were written separately actually speak to each other.

   THE CLAIM THAT MATTERS MOST IS THE ONE ABOUT NOT LOSING ANYTHING. localStorage is still the
   primary store; the server is a mirror. So this file spends as much effort proving the game is
   unharmed when the server is absent, broken or slow as it does proving the happy path.

   Needs a server. Start one first:
     cd server && DATABASE_URL=sqlite:///./dev.db JWT_SECRET=$(python3 -c "import secrets;print(secrets.token_urlsafe(48))") \
       alembic upgrade head && uvicorn app.main:app --port 8931
   API=http://127.0.0.1:8931 node tests/browser80.js
*/
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),http=require("http"),fs=require("fs");
const FILE=path.resolve(__dirname,process.argv[2]||GAME);
const API=process.env.API||"http://127.0.0.1:8931";
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
const mail=()=>"paz-"+Math.random().toString(36).slice(2,10)+"@example.com";
const PASS="a long enough password";

/* Served over HTTP rather than opened as a file. A file:// page has an opaque origin, which
   means no localStorage worth the name and a CORS preflight the server can never satisfy — the
   whole point of this file is the cross-origin call the real game makes. */
const PORT=8930;
const srv=http.createServer((q,r)=>{
  const f=path.join(ROOT,decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/,""));
  fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();
    r.writeHead(200,{"content-type":"text/html; charset=utf-8"});r.end(b);});});

(async()=>{
  /* No server, no test — and a SKIP rather than a failure, because a permanently red line is
     where a real failure goes to hide. That argument was made about browser16 earlier in this
     repository's history and it applies to the test being written, not only to the ones already
     there. Exit 0 and say how to get one. */
  const alive=await fetch(API+"/health",{signal:AbortSignal.timeout(2500)})
    .then(r=>r.ok).catch(()=>false);
  if(!alive){
    console.log("skip  no server at "+API+" — this file drives the real one.");
    console.log("      cd server && DATABASE_URL=sqlite:///./dev.db \\");
    console.log("        JWT_SECRET=$(python3 -c \"import secrets;print(secrets.token_urlsafe(48))\") \\");
    console.log("        ALLOWED_ORIGINS=http://127.0.0.1:8930 sh -c 'alembic upgrade head && uvicorn app.main:app --port 8931'");
    console.log("      then: API=http://127.0.0.1:8931 node tests/browser80.js");
    return;
  }
  await new Promise(r=>srv.listen(PORT,"127.0.0.1",r));
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  const errs=[];page.on("pageerror",e=>errs.push(String(e)));

  /* THE_CREW_API is read at parse time, exactly like THE_CREW_MUSIC — the desktop build injects
     it ahead of the script and so must this. Setting it after page.goto leaves API_BASE already
     frozen on the production address, which is a "Failed to fetch" against a domain that does
     not exist yet and half an hour wondering about CORS. */
  await page.addInitScript(u=>{window.THE_CREW_API=u;},API);
  const open=async()=>{
    await page.goto("http://127.0.0.1:"+PORT+"/"+path.relative(ROOT,FILE));
  };
  const newGame=async(name)=>{
    await page.click('[data-act="begin"]');await page.fill("#pname",name||"Sasha Varga");
    await page.click('[data-act="confirm-create"]');
    await page.waitForSelector(".topbar");
    if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
    for(let i=0;i<25;i++){
      const x=await page.$('button[data-act="crewname-later"]')||await page.$('.scrim button.x:not([disabled])');
      if(x){await x.click();await page.waitForTimeout(50);continue;}
      const q=await page.$$('.scrim .btn:not([disabled])');
      if(q.length){await q[q.length-1].click();await page.waitForTimeout(50);continue;}
      break;}
  };

  console.log("— the server is there, and the game can reach it —");
  await open();
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  const reach=await page.evaluate(async()=>{
    const r=await fetch(API_BASE+"/health");return {status:r.status,body:await r.json()};});
  check(reach.status===200&&reach.body.ok===true,"the game's own API_BASE reaches /health");

  console.log("— signing up, from inside the game —");
  await newGame();
  const EMAIL=mail();
  const up=await page.evaluate(async([e,p])=>{
    const ok=await accSignUp(e,p);
    return {ok,signedIn:signedIn(),acc:ACC,err:ACC_ERR};
  },[EMAIL,PASS]);
  check(up.ok&&up.signedIn,"an account is opened and the token kept"+(up.err?" — "+up.err:""));
  check(up.acc&&up.acc.email===EMAIL,"and the game knows whose it is");
  check(up.acc&&up.acc.weeks_played===0&&up.acc.weeks_left===12,"a fresh account has all twelve weeks");

  console.log("— the free run is counted on the account, not in the browser —");
  const ran=await page.evaluate(async()=>{
    for(let i=0;i<5;i++){S.week++;weekReport();await new Promise(r=>setTimeout(r,120));}
    await accRefresh();
    return {weeks:ACC.weeks_played,left:ACC.weeks_left,over:ACC.over,week:S.week};
  });
  check(ran.weeks===ran.week,"five weeks played, "+ran.weeks+" counted on the account");
  check(ran.left===12-ran.weeks&&ran.over===false,"and "+ran.left+" left");

  console.log("— and clearing this browser does not give them back —");
  const token=await page.evaluate(()=>tokenGet());
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.evaluate(t=>{localStorage.setItem("thecrew_token_v1",t);},token);
  await page.reload();
  const after=await page.evaluate(async()=>{await accRefresh();return ACC;});
  check(after&&after.weeks_played===ran.weeks,
    "a cleared browser signs back in on "+after.weeks_played+" weeks, not on nought — which is the whole complaint");

  console.log("— a NEW dossier is not a new free run —");
  const fresh=await page.evaluate(async()=>{
    // a different game: a different seed, and its weeks start at one again
    const out=[];
    for(const seed of [111111,222222]){
      S=S||{};S.seed=seed;
      for(let w=1;w<=4;w++){S.week=w;weekReport();await new Promise(r=>setTimeout(r,110));}
      await accRefresh();out.push({seed,weeks:ACC.weeks_played});
    }
    return out;
  });
  check(fresh[1].weeks>fresh[0].weeks,
    "week one of a second dossier adds to the run rather than restarting it ("
      +fresh[0].weeks+" → "+fresh[1].weeks+")");

  console.log("— the crew goes up, and comes back on another machine —");
  await open();
  await page.evaluate(t=>{localStorage.setItem("thecrew_token_v1",t);},token);
  await page.reload();
  await newGame("Nadia Haddad");
  const pushed=await page.evaluate(async()=>{
    S.money=777777;S.week=9;
    await savePushNow();
    const rows=await saveList();
    return {sync:SYNC.state,rows:rows?rows.length:null,seed:String(S.seed),money:S.money};
  });
  check(pushed.sync==="saved","the game saves up to the account ("+pushed.sync+")");
  check(pushed.rows>=1,"and it is on the list of dossiers ("+pushed.rows+")");

  const roundTrip=await page.evaluate(async(gid)=>{
    const got=await api("GET","/saves/"+gid);
    const blob=got.ok?JSON.parse(got.body.blob):null;
    return {ok:got.ok,money:blob&&blob.money,week:got.ok?got.body.week:null};
  },pushed.seed);
  check(roundTrip.ok&&roundTrip.money===777777&&roundTrip.week===9,
    "and what comes back is the same game, to the dollar");

  console.log("— the older machine cannot flatten the newer one —");
  const clash=await page.evaluate(async()=>{
    // the laptop plays on
    S.week=40;await savePushNow();
    const good=SYNC.state;
    // the desktop, still on its old copy, saves
    const gid=String(S.seed);
    const stale=await api("PUT","/saves",{game_id:gid,rev:1,blob:JSON.stringify({v:2,week:3}),week:3});
    const after=await api("GET","/saves/"+gid);
    return {good,staleStatus:stale.status,weekOnServer:after.body.week};
  });
  check(clash.good==="saved"&&clash.staleStatus===409,
    "an older revision is refused ("+clash.staleStatus+")");
  check(clash.weekOnServer===40,"and the evening that was actually played survives (week "+clash.weekOnServer+")");

  console.log("— NOTHING IS LOST WHEN THE SERVER IS NOT THERE —");
  const offline=await page.evaluate(async()=>{
    const before=localStorage.getItem("thecrew_save_v2");
    return {hadSave:!!before};
  });
  // A port nothing is listening on, injected before the script the way the real one is.
  await page.addInitScript(()=>{window.THE_CREW_API="http://127.0.0.1:1";});
  await page.reload();
  // A reload lands on the title screen with the save waiting behind Continue — which is itself
  // worth confirming here, because "the server is unreachable" must not mean "there is no game".
  check(!!(await page.$('[data-act="continue"]')),"a reload with no server still offers Continue");
  await page.click('[data-act="continue"]');
  await page.waitForSelector(".topbar");
  for(let i=0;i<20;i++){
    const x=await page.$('button[data-act="crewname-later"]')||await page.$('.scrim button.x:not([disabled])');
    if(x){await x.click();await page.waitForTimeout(50);continue;}
    const q=await page.$$('.scrim .btn:not([disabled])');
    if(q.length){await q[q.length-1].click();await page.waitForTimeout(50);continue;}
    break;}
  const survived=await page.evaluate(async()=>{
    const m0=S?S.money:null;
    S.money=424242;S.week=(S.week||1)+1;
    save();                                   // local write, then a mirror that cannot connect
    await savePushNow();
    const stored=JSON.parse(localStorage.getItem("thecrew_save_v2")||"{}");
    weekReport();
    await new Promise(r=>setTimeout(r,400));
    return {sync:SYNC.state,stored:stored.money,live:S.money,stillPlaying:!!S&&!S.over};
  });
  check(survived.stored===424242,"the save is written to this machine even with the server unreachable");
  check(survived.sync==="offline","the game knows the server did not answer ("+survived.sync+")");
  check(survived.stillPlaying,"and the game carries on regardless");
  check(errs.length===0,"no page errors through any of it"+(errs.length?": "+errs.slice(0,2).join(" | "):""));

  await browser.close();srv.close();
})();

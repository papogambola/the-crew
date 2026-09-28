/* THE ACCOUNT — the game talking to a real server.

   Slice 2 of the migration. The crew and the licence both lived in one browser since the game was
   written, which is why clearing browsing data took both and neither followed anybody to a second
   machine. (There were twelve free weeks in here too, counted on the account so they could not be
   reset. The game is bought before it is played now, so there is no run to count and those
   assertions have become assertions about the door instead.)

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

   To drive the DOOR as well, give the server a shop. Nothing here reaches Stripe — the three
   variables only have to be non-empty for settings.shop_open to be true:
     STRIPE_SECRET_KEY=sk_test_x STRIPE_PRICE_ID=price_x STRIPE_WEBHOOK_SECRET=whsec_test_x uvicorn …
   Without them the server has no till, the door is open, and this file says so and moves on — which
   is itself the assertion that matters most, because that is how a lost variable must fail.
*/
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),http=require("http"),fs=require("fs"),crypto=require("crypto");
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
  const health=await fetch(API+"/health",{signal:AbortSignal.timeout(2500)})
    .then(r=>r.ok?r.json():null).catch(()=>null);
  const alive=!!health;
  // Whether this server has a till decides which half of the door can be driven here.
  const TILL=!!(health&&health.shop), HOOK=process.env.STRIPE_WEBHOOK_SECRET||"";
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

  console.log("— signing up, from the title screen —");
  // No game is started first. With a till open there is not one to start yet, which is the point:
  // an account comes before a dossier now, not after eleven weeks of one.
  const EMAIL=mail();
  const up=await page.evaluate(async([e,p])=>{
    const ok=await accSignUp(e,p);
    return {ok,signedIn:signedIn(),acc:ACC,err:ACC_ERR};
  },[EMAIL,PASS]);
  check(up.ok&&up.signedIn,"an account is opened and the token kept"+(up.err?" — "+up.err:""));
  check(up.acc&&up.acc.email===EMAIL,"and the game knows whose it is");
  check(up.acc&&up.acc.paid===false&&up.acc.over===true,
    "a fresh account has not bought the game — shut, rather than open for twelve weeks");
  check(up.acc&&!("weeks_played" in up.acc)&&!("weeks_left" in up.acc),
    "and the answer carries no free run to read: "+Object.keys(up.acc||{}).sort().join(", "));
  check(up.acc&&up.acc.shop_open===TILL,
    "the game is told whether this server can sell it anything (shop_open "+(up.acc||{}).shop_open+")");

  console.log("— the endpoint that counted the free run is gone —");
  const dead=await page.evaluate(async()=>{
    const a=await api("POST","/run/week",{game_id:"g",game_week:1});
    const b=await api("GET","/run");
    return {a:a.status,b:b.status};
  });
  check(dead.a===404&&dead.b===404,"an old build reporting its weeks finds nothing there ("+dead.a+", "+dead.b+")");

  console.log("— the door, and which side of it this server puts you on —");
  const token=await page.evaluate(()=>tokenGet());
  await open();
  await page.evaluate(t=>{localStorage.setItem("thecrew_token_v1",t);},token);
  await page.reload();await page.waitForTimeout(500);
  const door=await page.evaluate(()=>({walled:walled(),shop:shopOpen(),
    begin:!!document.querySelector('[data-act="begin"]'),buy:!!document.querySelector('[data-act="till-buy"]')}));
  if(TILL){
    check(door.walled===true&&door.buy===true&&door.begin===false,
      "a till is open and an unpaid account is shut out of the game");
  } else {
    check(door.walled===false&&door.begin===true,
      "this server has no till, so nobody is walled — which is the way round it must fail");
    console.log("      (start the server with STRIPE_SECRET_KEY, STRIPE_PRICE_ID and");
    console.log("       STRIPE_WEBHOOK_SECRET to drive the paid half as well)");
  }

  if(TILL){
    /* THE WEBHOOK, AGAINST THE REAL SERVICE. Only the half that needs no player id.

       Opening the door for real from here would mean forging a paid checkout.session.completed,
       and the only thing in one that says WHOSE order it is — client_reference_id — is a player id
       the game is never told, deliberately: it comes off the bearer token inside
       POST /licence/checkout and goes nowhere near the browser. So that half is tested where the id
       is knowable (server/tests/test_licence.py, eighteen tests weighted on exactly this) and the
       client's side of it against a fake server (browser89).

       What IS worth doing here, because it is the one thing neither of those proves about the
       running service: post an unsigned body at the live endpoint and watch it refused. That is the
       button on the internet that would otherwise read "give me the game". */
    const unsigned=await fetch(API+"/licence/stripe-hook",{method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({type:"checkout.session.completed",data:{object:{
        id:"cs_forged_"+crypto.randomBytes(8).toString("hex"),payment_status:"paid",
        client_reference_id:"1",amount_total:1200,currency:"usd"}}})}).then(r=>r.status);
    check(unsigned===400,"an unsigned webhook is refused by the running service ("+unsigned+")");
    const stale=await (async()=>{
      const raw=JSON.stringify({type:"checkout.session.completed",data:{object:{id:"cs_stale",payment_status:"paid",client_reference_id:"1"}}});
      const t=Math.floor(Date.now()/1000)-3600;
      const sig=crypto.createHmac("sha256",HOOK||"whsec_not_the_secret").update(t+"."+raw).digest("hex");
      return fetch(API+"/licence/stripe-hook",{method:"POST",
        headers:{"Content-Type":"application/json","Stripe-Signature":"t="+t+",v1="+sig},body:raw}).then(r=>r.status);
    })();
    check(stale===400,"and so is an hour-old signature, however well formed ("+stale+")");
  }

  /* EVERYTHING BELOW NEEDS A GAME, AND A GAME NEEDS THE DOOR OPEN.

     Opening it from here would mean forging a paid webhook, and the only field in one that says
     whose order it is — client_reference_id — is a player id the game is never told: it comes off
     the bearer token inside POST /licence/checkout and goes nowhere near the browser. That is the
     right shape and it is not being loosened for a test, so the save-sync drive runs against a
     server with NO till, which is also how a laptop is normally run. */
  if(TILL){
    console.log("— the crew is not held hostage by the door —");
    // An unpaid account can still put a dossier up and take it down. Somebody who played before the
    // door existed, or whose payment lapsed, must not find their crew locked inside an API.
    const hostage=await page.evaluate(async()=>{
      const put=await api("PUT","/saves",{game_id:"door-test",rev:1,week:7,label:"A crew",blob:JSON.stringify({v:2,money:5})});
      const got=await api("GET","/saves/door-test");
      return {put:put.status,got:got.status,week:got.ok?got.body.week:null};
    });
    check(hostage.put===200&&hostage.got===200&&hostage.week===7,
      "an unpaid account can still save its crew up and fetch it back ("+hostage.put+", "+hostage.got+")");
    console.log("");
    console.log("      The save-sync drive below needs a game, and a game needs the door open.");
    console.log("      Start the server WITHOUT the three STRIPE_ variables to run it.");
    await browser.close();srv.close();
    return;
  }

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
    await new Promise(r=>setTimeout(r,400));
    return {sync:SYNC.state,stored:stored.money,live:S.money,stillPlaying:!!S&&!S.over};
  });
  check(survived.stored===424242,"the save is written to this machine even with the server unreachable");
  check(survived.sync==="offline","the game knows the server did not answer ("+survived.sync+")");
  check(survived.stillPlaying,"and the game carries on regardless");
  check(errs.length===0,"no page errors through any of it"+(errs.length?": "+errs.slice(0,2).join(" | "):""));

  await browser.close();srv.close();
})();

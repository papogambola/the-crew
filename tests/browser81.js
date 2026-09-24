/* FORGETTING A PASSWORD STOPS BEING PERMANENT — the whole way through, in a real browser.

   The server's own suite (server/tests/test_reset.py) proves the endpoints. What it cannot prove
   is the part a person actually does: press "Forgotten it?" in the office, get an email, open the
   link, type a password, and be back in the game signed in. Three pieces written separately —
   play.html, reset.html, the API — and the seams between them are where this goes wrong.

   THE SEAM THIS FILE EXISTS FOR: reset.html is a page, not a screen in the game, so the token it
   writes on success has to be readable by play.html. Same key, same origin, or the reset works
   perfectly and drops the player back at a sign-in box, which reads as it not having worked.

   The token is taken out of the database rather than an inbox, because there is no inbox. That
   is the one thing here a person does differently; everything either side of it is the real path.

   Needs a server, and a SQLite one specifically (that is where the token is read from):
     cd server && DATABASE_URL=sqlite:///./dev.db \
       JWT_SECRET=$(python3 -c "import secrets;print(secrets.token_urlsafe(48))") \
       ALLOWED_ORIGINS=http://127.0.0.1:8933 \
       sh -c 'alembic upgrade head && uvicorn app.main:app --port 8931'
     API=http://127.0.0.1:8931 DB=server/dev.db node tests/browser81.js
*/
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),http=require("http"),fs=require("fs"),cp=require("child_process");
const FILE=path.resolve(__dirname,process.argv[2]||GAME);
const API=process.env.API||"http://127.0.0.1:8931";
const DB=path.resolve(ROOT,process.env.DB||"server/dev.db");
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
const mail=()=>"paz-"+Math.random().toString(36).slice(2,10)+"@example.com";
const PASS="a long enough password";
const NEW_PASS="a completely different password";

/* Its own port, not browser80's. Two files hard-coding one port collide the moment either leaves
   a socket behind, and what that looks like is EADDRINUSE from a test that has nothing wrong
   with it. The server must allow this origin — see the skip message below. */
const PORT=Number(process.env.PORT||8933);
const TYPES={".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css"};
const srv=http.createServer((q,r)=>{
  const f=path.join(ROOT,decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/,""));
  fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();
    r.writeHead(200,{"content-type":TYPES[path.extname(f)]||"application/octet-stream"});r.end(b);});});

/* The raw token is only ever in the email the server sent to nobody, because the server stores a
   SHA-256 of it and nothing else. So: overwrite the newest row's hash with the hash of a string
   this test knows. It is not a way around anything — the lookup, the expiry, the one-shot mark
   and the session the endpoint hands back are all exactly the code a real link runs. */
function plantToken(email,known){
  const py=`
import sqlite3,hashlib,sys
db=sqlite3.connect(${JSON.stringify(DB)})
pid=db.execute("select id from players where email=?",[${JSON.stringify(email)}]).fetchone()
if not pid: print("NO PLAYER"); sys.exit(1)
row=db.execute("select id from password_resets where player_id=? order by id desc limit 1",[pid[0]]).fetchone()
if not row: print("NO RESET ROW"); sys.exit(1)
h=hashlib.sha256(${JSON.stringify(known)}.encode()).hexdigest()
db.execute("update password_resets set token_hash=? where id=?",[h,row[0]])
db.commit(); print("OK")
`;
  const r=cp.spawnSync("python3",["-c",py],{encoding:"utf8"});
  return (r.stdout||"").trim()==="OK" ? true : ((console.error("  (plantToken: "+(r.stdout||"")+(r.stderr||"")+")")),false);
}

(async()=>{
  const alive=await fetch(API+"/health",{signal:AbortSignal.timeout(2500)})
    .then(r=>r.ok).catch(()=>false);
  if(!alive){
    console.log("skip  no server at "+API+" — this file drives the real one.");
    console.log("      cd server && DATABASE_URL=sqlite:///./dev.db \\");
    console.log("        JWT_SECRET=$(python3 -c \"import secrets;print(secrets.token_urlsafe(48))\") \\");
    console.log("        ALLOWED_ORIGINS=http://127.0.0.1:8933 RESET_RATE_LIMIT=1000 RESET_EMAIL_RATE_LIMIT=1000 \\");
    console.log("        sh -c 'alembic upgrade head && uvicorn app.main:app --port 8931'");
    console.log("      then: API=http://127.0.0.1:8931 DB=server/dev.db node tests/browser81.js");
    return;
  }
  if(!fs.existsSync(DB)){
    console.log("skip  no SQLite database at "+DB+" — this file reads the reset token out of it.");
    console.log("      Start the server with DATABASE_URL=sqlite:///./dev.db, or pass DB=<path>.");
    return;
  }

  await new Promise(r=>srv.listen(PORT,"127.0.0.1",r));
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  const errs=[];page.on("pageerror",e=>errs.push(String(e)));
  // Read at parse time in both files, so it has to be set before either loads.
  await page.addInitScript(a=>{window.THE_CREW_API=a;},API);

  const who=mail();

  /* A game has to be going before any of this: the account screen is a modal on S, and the
     office is a room inside a game rather than a page beside one. Same dance as browser80 —
     begin, name, skip the tutorial, then clear whatever card the world happened to open on. */
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

  /* ---- 1. An account to forget the password of ---------------------------------------- */
  await page.goto("http://127.0.0.1:"+PORT+"/"+path.relative(ROOT,FILE),{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await newGame();
  const made=await page.evaluate(([m,p])=>window.accSignUp(m,p),[who,PASS]);
  check(made===true,"an account to forget the password of");

  /* ---- 2. "Forgotten it?" is on the sign-in side and only there ------------------------ */
  await page.evaluate(()=>{window.accSignOut();});
  await page.evaluate(()=>{UI.accMode="in";S.modal={type:"account"};render();});
  check(await page.locator('[data-act="acc-forgot"]').count()===1,
        "the sign-in screen offers a way out for somebody who has forgotten");
  await page.evaluate(()=>{UI.accMode="up";render();});
  check(await page.locator('[data-act="acc-forgot"]').count()===0,
        "and the open-an-account screen does not, because there is nothing yet to have forgotten");

  /* ---- 3. Pressing it with an empty box asks for the address --------------------------- */
  await page.evaluate(()=>{UI.accMode="in";render();});
  await page.fill("#acmail","");
  await page.click('[data-act="acc-forgot"]');
  await page.waitForTimeout(250);
  check(/address/i.test(await page.locator(".modal-b").innerText()),
        "pressing it with an empty box asks for the address rather than cheerfully sending nothing");

  /* ---- 4. Asking for a link, for real, across origins ---------------------------------- */
  await page.fill("#acmail",who);
  await page.click('[data-act="acc-forgot"]');
  /* EITHER outcome, then assert on which one. Waiting only for the happy one means a server that
     said something else — a 429 from this file's own previous run, most likely, because the rate
     limiter lives in the server process and outlives the test — hangs for the timeout and then
     reports a timeout, which says nothing about what went wrong. */
  await page.waitForFunction(()=>!UI.accBusy&&(UI.accSent||ACC_ERR),{timeout:15000});
  const rl=await page.evaluate(()=>ACC_ERR||"");
  if(/too many/i.test(rl)){
    console.error("FAIL: the server is rate-limiting this test — "+rl);
    console.error("      The limit is per server PROCESS and survives a test run. Restart it, or");
    console.error("      start it with RESET_RATE_LIMIT=1000 RESET_EMAIL_RATE_LIMIT=1000.");
    process.exitCode=1; await browser.close(); srv.close(); return;
  }
  const sent=await page.locator(".modal-b").innerText();
  check(/on its way/i.test(sent),"asking for one says a link is on its way");
  check(/once/i.test(sent)&&/hour/i.test(sent),
        "and says what it is worth: once, and for an hour");

  /* An address with no account has to look identical from in here. If the game can tell, so can
     anybody with a list of addresses and an afternoon.

     The real answer is read FIRST and held. Reading both after the second call compares a string
     to itself and passes whatever the server says — which is how this assertion was written the
     first time, and it went green against code it was not testing. */
  const real=await page.evaluate(()=>UI.accSent);
  await page.evaluate(()=>{UI.accSent="";render();});
  await page.fill("#acmail","definitely-nobody-"+Math.random().toString(36).slice(2,8)+"@example.com");
  await page.click('[data-act="acc-forgot"]');
  await page.waitForFunction(()=>!UI.accBusy&&UI.accSent,{timeout:15000});
  const nobody=await page.evaluate(()=>UI.accSent);
  check(real.length>0&&nobody===real,
        "and an address with no account gets exactly the same sentence, to the character");

  /* ---- 5. The link, opened --------------------------------------------------------------*/
  const known="planted-token-"+Math.random().toString(36).slice(2,10);
  check(plantToken(who,known),"the link the server sent can be read back out for the test");

  await page.goto("http://127.0.0.1:"+PORT+"/reset.html?t="+known,{waitUntil:"domcontentloaded"});
  check(await page.locator("#set").isVisible(),"the link opens straight on a new-password box");
  check(!(await page.locator("#ask").isVisible()),"and not on the ask-for-a-link form");
  /* The address bar is the one part of a browser people screenshot and paste into support
     emails, and for the next hour that string is a working key to the account. */
  check(!/[?&]t=/.test(page.url()),"and the token is off the address bar by the time you can read it");

  await page.fill("#pw","short");
  await page.fill("#pw2","short");
  await page.click("#set-go");
  await page.waitForTimeout(250);
  check(/10 characters/i.test(await page.locator("#set-msg").innerText()),
        "a short one is refused here rather than by a round trip");

  await page.fill("#pw",NEW_PASS);
  await page.fill("#pw2","something else entirely");
  await page.click("#set-go");
  await page.waitForTimeout(250);
  check(/not the same/i.test(await page.locator("#set-msg").innerText()),
        "and two that disagree are caught before either is sent");

  await page.fill("#pw2",NEW_PASS);
  await page.click("#set-go");
  await page.waitForSelector("#done:not(.hide)",{timeout:15000});
  check(true,"a good one goes through");

  /* ---- 6. The seam. Is the game signed in? -------------------------------------------- */
  const stored=await page.evaluate(()=>{try{return localStorage.getItem("thecrew_token_v1")||"";}catch(e){return "";}});
  check(stored.length>20,"reset.html wrote a session where the game looks for one");

  await page.goto("http://127.0.0.1:"+PORT+"/"+path.basename(FILE),{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>typeof window.accRefresh==="function",{timeout:15000});
  const me=await page.evaluate(()=>window.accRefresh());
  check(me&&me.email===who,"and the game comes up signed in as them, with no second sign-in box");

  /* ---- 7. The password really changed ------------------------------------------------- */
  await page.evaluate(()=>{window.accSignOut();});
  const oldOne=await page.evaluate(([m,p])=>window.accSignIn(m,p),[who,PASS]);
  check(oldOne===false,"the password they forgot no longer works");
  const newOne=await page.evaluate(([m,p])=>window.accSignIn(m,p),[who,NEW_PASS]);
  check(newOne===true,"and the one they just chose does");

  /* ---- 8. A spent link is a dead end with a way out ------------------------------------ */
  await page.goto("http://127.0.0.1:"+PORT+"/reset.html?t="+known,{waitUntil:"domcontentloaded"});
  await page.fill("#pw","yet another long password");
  await page.fill("#pw2","yet another long password");
  await page.click("#set-go");
  await page.waitForSelector("#again",{timeout:15000});
  check(true,"opening the same link twice is refused, and offers another one rather than a dead form");
  await page.click("#again");
  check(await page.locator("#ask").isVisible(),"and that button really does lead somewhere");

  /* ---- 9. reset.html on its own, with no link at all ----------------------------------- */
  await page.goto("http://127.0.0.1:"+PORT+"/reset.html",{waitUntil:"domcontentloaded"});
  check(await page.locator("#ask").isVisible(),"the page reached without a link asks for one");
  await page.fill("#mail",who);
  await page.click("#ask-go");
  await page.waitForFunction(()=>{const e=document.getElementById("ask-msg");return e&&(e.textContent||"").trim().length>0;},{timeout:15000});
  check(/on its way/i.test(await page.locator("#ask-msg").innerText()),
        "and can send one: "+(await page.locator("#ask-msg").innerText()).slice(0,60));

  check(errs.length===0,"and nothing threw along the way"+(errs.length?": "+errs[0]:""));

  await browser.close();
  srv.close();
})().catch(e=>{console.error("DIED: "+e.message);process.exitCode=1;});

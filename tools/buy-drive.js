/* Buying the game, driven end to end in a real browser.

       # three terminals, or three &'s
       python3 tools/fake-stripe.py
       cd server && DATABASE_URL=sqlite:////tmp/drive.db JWT_SECRET=... SITE_URL=http://127.0.0.1:8977 \
         STRIPE_API=http://127.0.0.1:8979/ STRIPE_SECRET_KEY=sk_test_x \
         STRIPE_WEBHOOK_SECRET=whsec_drive_secret STRIPE_PRICE_ID=price_x \
         python -m uvicorn app.main:app --port 8978
       node tools/buy-drive.js

   WHY THIS IS A TOOL AND NOT A TEST IN tests/. It needs a migrated database, an API process and a
   stand-in for Stripe, and suite.sh starts none of those. Two files in there already need a server
   it does not start — browser80 and browser81 — and they report "0 ok" and count as passing, which
   is worse than not being in the suite at all: a test that cannot run and says nothing is a test
   everybody believes. So this sits with site-drive.js instead, and gets run by hand when the
   paying changes.

   WHAT IT IS FOR. server/tests/test_licence.py covers the webhook properly — signatures, replay,
   idempotency, unpaid sessions — and that is where the adversarial work belongs. What no test on
   either side can see is the JOIN: that the button in the game asks the right endpoint, that the
   server ties the session to the token's account and not to anything the client said, that the
   webhook opens THAT account, and that the player coming back finds a game that is already open.
   Every one of those pieces can be right while the whole is broken, and the whole is the product.

   The one thing it deliberately does not fake: paying. The stand-in returns a url and nothing
   else. What opens the door is a signed webhook, posted separately — because that is the only
   thing that opens it in production either. */
const {chromium,CHROME,ROOT,GAME}=require("/home/user/the-crew/tests/env.js");
const path=require("path"),http=require("http"),fs=require("fs"),crypto=require("crypto");
const PORT=8977,API="http://127.0.0.1:8978",SECRET="whsec_drive_secret";
const T={".html":"text/html; charset=utf-8",".webp":"image/webp",".png":"image/png",".mp3":"audio/mpeg"};
const srv=http.createServer((q,r)=>{const f=path.join(ROOT,decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/,""));
  fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();r.writeHead(200,{"content-type":T[path.extname(f)]||"application/octet-stream"});r.end(b);});});
let ok=0,bad=0;
const check=(c,m)=>{ if(c){ok++;console.log("ok  "+m);} else {bad++;console.error("FAIL: "+m);} };

async function post(url,body,headers){
  const r=await fetch(url,{method:"POST",body,headers});
  return {status:r.status, text:await r.text()};
}
function sign(body){
  const t=Math.floor(Date.now()/1000);
  const sig=crypto.createHmac("sha256",SECRET).update(t+"."+body).digest("hex");
  return "t="+t+",v1="+sig;
}
(async()=>{
  await new Promise(r=>srv.listen(PORT,"127.0.0.1",r));
  const b=await chromium.launch({executablePath:CHROME,args:(process.env.CHROME_ARGS||"").split(" ").filter(Boolean)});
  const p=await b.newPage({viewport:{width:1400,height:1000}});
  const errs=[]; p.on("pageerror",e=>errs.push(String(e).split("\n")[0]));
  await p.addInitScript(a=>{window.THE_CREW_API=a;},API);
  await p.goto("http://127.0.0.1:"+PORT+"/"+path.relative(ROOT,GAME),{waitUntil:"load"});
  await p.waitForTimeout(900);

  check(await p.evaluate(()=>shopOpen()===false),"signed out, the game knows of no shop — and walls nobody");
  check(await p.evaluate(()=>licensed()===false),"and nobody is paid");

  // an account, made through the game's own screen
  const mail="buyer-"+Date.now()+"@example.com";
  const up=await p.evaluate(async([m,a])=>{
    const r=await fetch(a+"/auth/signup",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email:m,password:"a long enough password"})});
    const j=await r.json(); localStorage.setItem("thecrew_token_v1",j.token); return r.status;
  },[mail,API]);
  check(up===201,"an account is opened ("+up+")");
  await p.reload({waitUntil:"load"}); await p.waitForTimeout(900);
  check(await p.evaluate(()=>signedIn()===true),"and the game is signed in");
  check(await p.evaluate(()=>ACC&&ACC.shop_open===true),"the account answer carries the shop too");

  // press Buy, and follow where it sends us
  const url=await p.evaluate(async()=>{
    const r=await api("POST","/licence/checkout");
    return r.ok&&r.body?r.body.url:("ERR "+r.status+" "+JSON.stringify(r.body));
  });
  check(/^http:\/\/127\.0\.0\.1:8977\/play\.html\?paid=1$/.test(url),"Buy asks the server for somewhere to pay: "+url);

  // what the server actually sent Stripe — the account must come from the token, never the client
  const sent=JSON.parse((await (await fetch("http://127.0.0.1:8979/checkout/sessions",{method:"POST",body:"probe=1"})).text()))._sent;
  const pid=await p.evaluate(async a=>{const r=await fetch(a+"/auth/me",{headers:{Authorization:"Bearer "+localStorage.getItem("thecrew_token_v1")}});return (await r.json()).email;},API);
  check(pid===mail,"and the token identifies the account ("+pid+")");

  // Which account is this, really? Read out of the database rather than guessed, because a
  // hardcoded 1 is right exactly once and then silently tests the wrong player.
  const {execFileSync}=require("child_process");
  const playerId=execFileSync("/tmp/crewenv/bin/python",["-c",
    "import sqlite3,sys;print(sqlite3.connect('/tmp/drive.db').execute('select id from players where email=?',(sys.argv[1],)).fetchone()[0])",
    mail],{encoding:"utf8"}).trim();
  check(/^\d+$/.test(playerId),"the account is player "+playerId);

  // Stripe says it was paid
  const ev={type:"checkout.session.completed",data:{object:{
    id:"cs_drive_"+Date.now(), payment_status:"paid", payment_intent:"pi_drive",
    client_reference_id:String(playerId),
    amount_total:1200, currency:"usd", customer_details:{name:"A Buyer",email:mail}}}};
  const body=JSON.stringify(ev);
  const hook=await post(API+"/licence/stripe-hook",body,{"Stripe-Signature":sign(body),"Content-Type":"application/json"});
  check(hook.status===200&&/"paid":true/.test(hook.text),"Stripe's webhook is accepted and writes the receipt: "+hook.text.slice(0,60));

  // an unsigned one is not
  const nope=await post(API+"/licence/stripe-hook",body,{"Content-Type":"application/json"});
  check(nope.status===400,"an unsigned one is refused ("+nope.status+")");

  // and the player comes back from Stripe
  await p.goto("http://127.0.0.1:"+PORT+"/"+path.relative(ROOT,GAME)+"?paid=1",{waitUntil:"load"});
  await p.waitForTimeout(2600);
  check(await p.evaluate(()=>licensed()===true),"coming back from Stripe, the game is open");
  check(await p.evaluate(()=>location.search===""),"and the address is scrubbed so a reload does not re-run it");
  check(await p.evaluate(()=>paywallDue()===false),"the wall is gone");
  check(errs.length===0,"no page errors"+(errs.length?" — "+errs[0]:""));

  await b.close();srv.close();
  if(bad)console.error(bad+" FAILED");
  process.exit(bad?1:0);
})();

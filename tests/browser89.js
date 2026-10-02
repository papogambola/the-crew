/* THE DOOR: PAID BEFORE PLAYED.

   The game used to be free for twelve weeks on its own calendar and then stop on a card. It is
   bought at the front now, and that moves the most important decision in the product out of the
   middle of the game and onto the title screen — which is the one screen every player sees and the
   one this file therefore drives, in a real browser, through every combination of the three facts
   the decision is made from: is there a till, is anybody signed in, have they paid.

   WHY THERE IS A FAKE SERVER IN HERE AND NOT A REAL ONE. browser80 drives the real FastAPI service
   and skips when it is not running, which is right for what it tests and useless for this: the
   answers that matter here are the AWKWARD ones — a till that exists but nobody signed in, a
   licence that lapses while a game is open — and arranging those against a real server means a
   Stripe webhook per assertion. So the server is eight lines of node serving three answers, and it
   is served on the SAME ORIGIN as the game so that nothing in here is secretly a test of CORS.

   THE ASSERTION THAT MATTERS MOST IS THE FIRST ONE. A door that fails shut locks out everybody,
   including the people who have paid, on any morning the server cannot be reached or a Stripe
   variable goes missing from the deploy. So: no till, no wall. The game opens. Every other
   assertion in this file is about the door working; that one is about it failing safely.
*/
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),http=require("http"),fs=require("fs");
const FILE=path.resolve(__dirname,process.argv[2]||GAME);
const OUT=path.join(__dirname,"shots89");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};

const PORT=8936;
// What the fake server says this moment. Flipped from the test as the story moves on.
let SHOP=false, PAID=false, SEEN=[];
const srv=http.createServer((q,r)=>{
  const url=q.url.split("?")[0];
  SEEN.push(q.method+" "+url);
  const json=o=>{r.writeHead(200,{"content-type":"application/json","cache-control":"no-store"});r.end(JSON.stringify(o));};
  /* The playtime beat, which the real server answers 204 to and this stood in for the day the
     route was added. A fake API that is missing a route the game calls is a fake API that reports
     a console error on every player's behalf — which is a true thing about THIS FILE and nothing
     at all about the game. See server/app/routers/play.py. */
  if(url==="/play/beat"){r.writeHead(204).end();return;}
  if(url==="/health")return json({ok:true,mail:{configured:false},shop:SHOP});
  if(url==="/auth/me")return json({email:"paz@example.com",paid:PAID,over:!PAID,shop_open:SHOP});
  if(url==="/licence")return json({paid:PAID,over:!PAID,shop_open:SHOP,price:null,currency:null,bought_at:null});
  if(url.indexOf("/saves")===0)return json([]);
  const f=path.join(ROOT,decodeURIComponent(url).replace(/^\/+/,""));
  fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();
    r.writeHead(200,{"content-type":"text/html; charset=utf-8","cache-control":"no-store"});r.end(b);});
});

(async()=>{
  await new Promise(r=>srv.listen(PORT,"127.0.0.1",r));
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  const errs=[];page.on("pageerror",e=>errs.push(String(e)));
  /* One arranged failure is allowed through, and only by its port number: 8939 is the address
     nothing is listening on, dialled on purpose to prove that a server which cannot be reached does
     not wall anybody. A refused connection to the FAKE server (8936) is a real fault and still
     fails this file, which is why the port is in the pattern rather than the error name alone. */
  const noise=t=>/ERR_CERT|music\/|\.mp3|manifest\.json|r2\.dev|fonts\./.test(t)||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t)
    ||(/ERR_CONNECTION_REFUSED|ERR_UNSAFE_PORT/.test(t)&&/8939/.test(t));
  // The port is in the location, not in the message — "Failed to load resource: net::ERR_…" says
  // nothing about where — so the two are joined before the filter looks at them.
  page.on("console",m=>{const w=(m.location()||{}).url||"";const t=m.text()+(w?" ["+w+"]":"");
    if(m.type()==="error"&&!noise(t))errs.push(t);});

  // Read at parse time, like the real injection — after goto it is already frozen.
  await page.addInitScript(p=>{window.THE_CREW_API="http://127.0.0.1:"+p;},PORT);
  const URL="http://127.0.0.1:"+PORT+"/"+path.relative(ROOT,FILE);
  // The door is drawn a frame after the page arrives, when the server's answer lands — see boot().
  // So every load here waits for the game to have asked, rather than for a fixed number of ms.
  const open=async()=>{
    await page.goto(URL);
    await page.waitForFunction(()=>typeof walled==="function").catch(()=>{});
    await page.waitForTimeout(350);
  };
  const signIn=async()=>{await page.evaluate(()=>{localStorage.setItem("thecrew_token_v1","a-token");});};
  const signOut=async()=>{await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});};
  const at=async()=>page.evaluate(()=>({
    walled:walled(),shop:shopOpen(),paid:licensed(),
    begin:!!document.querySelector('[data-act="begin"]'),
    cont:!!document.querySelector('[data-act="continue"]'),
    buy:!!document.querySelector('[data-act="till-buy"]'),
    buyText:(document.querySelector('[data-act="till-buy"]')||{}).innerText||"",
    handbook:!!document.querySelector('[data-act="off-handbook"]'),
    body:document.body.innerText,
  }));

  /* THE RULE THAT DECIDES WHETHER ANYTHING IS ASKED AT ALL. The game talks to an API on its own
     site and nowhere else, so a copy off a disk or on an ad-hoc local port asks nothing, shows no
     door, and — the part that is invisible until it is not — prints no CORS refusal in the console
     of every player on an origin the API was never told about. A refused preflight is logged by the
     browser whatever the code does with the promise, so the only way not to log one is not to ask. */
  console.log("— the game only talks to an API on its own site —");
  await page.goto(URL);
  const site=await page.evaluate(()=>({
    live:API_LIVE,
    prod:sameSite("playthecrew.com","api.playthecrew.com"),
    www:sameSite("www.playthecrew.com","api.playthecrew.com"),
    local:sameSite("127.0.0.1","api.playthecrew.com"),
    disk:sameSite("","api.playthecrew.com"),
    lookalike:sameSite("playthecrew.com.attacker.example","api.playthecrew.com"),
  }));
  check(site.prod&&site.www,"the real site, with or without www, is the same site as its API");
  check(!site.local&&!site.disk,"an ad-hoc local port and a copy off the disk are not — so neither asks");
  check(!site.lookalike,"and neither is a domain that merely starts with the right words");
  check(site.live===true,"this copy, whose API is its own origin, does ask");

  console.log("— NO TILL, NO WALL: the failure that costs nothing —");
  SHOP=false;PAID=false;
  await open();await signOut();await open();
  let s=await at();
  check(s.shop===false&&s.walled===false,"a server with no till walls nobody");
  check(s.begin===true&&s.buy===false,"and the title screen offers New game, not a price");
  // The same, one step worse: nothing answering at all. This is a laptop with no network, and the
  // deploy that lost its Stripe keys, and every copy of this file opened off a disk.
  await page.addInitScript(()=>{window.THE_CREW_API="http://127.0.0.1:8939";});
  await page.goto(URL);await page.waitForTimeout(500);
  s=await at();
  check(s.walled===false&&s.begin===true,"a server that does not answer at all walls nobody either");
  await page.screenshot({path:OUT+"/01-no-till-open.png"});

  console.log("— A TILL, AND NOBODY SIGNED IN —");
  // back to the fake server, with a shop
  await page.addInitScript(p=>{window.THE_CREW_API="http://127.0.0.1:"+p;},PORT);
  SHOP=true;PAID=false;
  await open();await signOut();await open();
  s=await at();
  check(s.shop===true&&s.walled===true,"the till is open and the door is shut");
  check(s.begin===false&&s.cont===false,"neither New game nor Continue is on the screen");
  check(s.buy===true,"there is one button, and it is the way in");
  check(/account/i.test(s.buyText)&&s.buyText.indexOf("$12")>=0,
    "signed out it says what the first step is: \""+s.buyText.replace(/\s+/g," ").trim()+"\"");
  check(s.handbook===true,"the handbook is still readable before paying — the argument for the game");
  check(s.body.indexOf("$12, once, for life")>=0,"the price is said in words, once");
  check(s.body.indexOf("Open a Dossier")<0&&/the way in/i.test(s.body),
    "and the card is headed what it actually offers, not a dossier it will not open");
  await page.screenshot({path:OUT+"/02-door-signed-out.png"});

  // The second lock. The buttons are not drawn, so this is what a stale render or a keyboard route
  // would reach: the handler itself has to refuse.
  const forced=await page.evaluate(()=>{
    act({getAttribute:()=>null},"begin");
    return {screen:!!document.querySelector("#pname"),walled:walled()};
  }).catch(()=>null);
  if(forced)check(forced.screen===false,"and dispatching \"begin\" by hand does not open the dossier screen");

  console.log("— A TILL, SIGNED IN, NOT PAID —");
  await signIn();await open();
  s=await at();
  check(s.walled===true&&s.buy===true,"still shut");
  check(/^buy it/i.test(s.buyText.trim()),"but the button is now the purchase itself: \""+s.buyText.replace(/\s+/g," ").trim()+"\"");
  check(s.body.indexOf("Stripe takes the payment")>=0,"and it says what pressing it does");
  await page.screenshot({path:OUT+"/03-door-signed-in.png"});

  console.log("— PAID: the door opens, and the game is the whole game —");
  PAID=true;
  await open();
  s=await at();
  check(s.walled===false&&s.paid===true,"a licence on the account opens it");
  check(s.begin===true&&s.buy===false,"New game is back and the price is gone");
  check(s.body.indexOf("Paid for")>=0,"the title screen says so once, quietly");
  await page.click('[data-act="begin"]');
  await page.fill("#pname","Vera Kessler");
  await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar",{timeout:15000});
  // The tutorial and the week's boxes come up over the board, as they do for a player. They have to
  // go, because what is tested below is what the game does when nothing else is on the screen.
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  for(let i=0;i<25;i++){
    const x=await page.$('button[data-act="crewname-later"]')||await page.$('.scrim button.x:not([disabled])');
    if(x){await x.click();await page.waitForTimeout(50);continue;}
    const q=await page.$$('.scrim .btn:not([disabled])');
    if(q.length){await q[q.length-1].click();await page.waitForTimeout(50);continue;}
    break;}
  check(await page.evaluate(()=>!TUT.on&&!S.modal),"and a game starts: the dossier screen, then the board");
  await page.screenshot({path:OUT+"/04-paid-playing.png"});

  console.log("— THE FREE RUN IS GONE, not merely unused —");
  const gone=await page.evaluate(()=>({
    freeWeeks:typeof SHOP.freeWeeks,
    freeOver:typeof freeOver,
    freeRepName:typeof freeRepName,
    weekReport:typeof weekReport,
    weeksPlayed:typeof (SET||{}).weeksPlayed,
    price:SHOP.price,
  }));
  check(gone.freeWeeks==="undefined"&&gone.freeOver==="undefined"
        &&gone.freeRepName==="undefined"&&gone.weekReport==="undefined",
    "nothing in the game counts a free run any more");
  check(gone.price==="$12","and the one thing left in SHOP is the price ("+gone.price+")");
  // Weeks were reported to the server as they passed. The endpoint is deleted; nothing may call it.
  const before=SEEN.length;
  await page.evaluate(()=>{const r=freshRng();for(let i=0;i<3;i++)weekTick(r);save();render();});
  await page.waitForTimeout(400);
  check(!SEEN.slice(before).some(x=>x.indexOf("/run")>=0),
    "three weeks pass and not one of them is reported ("+(SEEN.slice(before).join(", ")||"no calls at all")+")");
  check(gone.weeksPlayed==="undefined","and no count is kept in this browser either");

  console.log("— A LICENCE THAT LAPSES UNDER A GAME IN PROGRESS —");
  // The one way the old wall can still be reached: a refund, a chargeback, a row turned off. It
  // must stop the game and it must not touch the save.
  PAID=false;
  const lapsed=await page.evaluate(async()=>{
    const week=S.week,money=S.money;
    await accRefresh();render();
    const stored=JSON.parse(localStorage.getItem("thecrew_save_v2")||"{}");
    return {modal:S.modal&&S.modal.type,text:document.body.innerText,
            savedWeek:stored.week,week,money,storedMoney:stored.money};
  });
  check(lapsed.modal==="paywall","the game stops on the till");
  check(lapsed.text.indexOf("This account is not paid for")>=0,
    "and it says what actually happened rather than \"that's the free run\"");
  check(lapsed.text.indexOf("Nothing has happened to your crew")>=0,"with the crew accounted for in the first sentence");
  check(lapsed.savedWeek===lapsed.week&&lapsed.storedMoney===lapsed.money,
    "the save on this machine is untouched (week "+lapsed.savedWeek+", "+lapsed.storedMoney+")");
  await page.screenshot({path:OUT+"/05-licence-lapsed.png"});

  console.log("— AND THE SAVE IS NAMED ON THE DOOR, so nobody thinks it is gone —");
  await open();
  const named=await page.evaluate(()=>({walled:walled(),body:document.body.innerText}));
  check(named.walled===true,"the door is shut on the next visit");
  check(named.body.indexOf("Your game is where you left it")>=0
        &&named.body.indexOf("Vera Kessler")>=0,
    "and it names the crew and the week it is waiting on");
  await page.screenshot({path:OUT+"/06-door-with-a-save.png"});

  check(errs.length===0,"no page or console errors through any of it"+(errs.length?": "+errs.slice(0,3).join(" | "):""));
  await browser.close();srv.close();
})();

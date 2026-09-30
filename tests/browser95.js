/* THE GAME SOMEWHERE ELSE — an itch.io page, a mirror, a copy opened off a disk.

   This became a real place the game runs the day it went up on itch.io, free with a tip jar. It was
   already ALMOST right by accident, and the accident is worth writing down because it is the reason
   no surgery was needed: API_LIVE compares the page's hostname to the API's (the sameSite rule from
   build 136, put there to stop a test server's boot probe hitting production). Off this game's own
   site it is false, so the till is never asked about, shopOpen() stays false, walled() is false, and
   the door never appears. The game simply runs.

   WHAT WAS NOT RIGHT: the account. Its entry points were drawn anyway, and pressing one fired a
   cross-origin request at an API that will refuse the origin — so a player on itch.io got "the
   server did not answer" from a button the game had just offered them, and a paragraph promising
   that an account keeps their crew somewhere a cleared cache cannot reach, which off-site is not
   true of anything.

   The two halves of this file are the same assertion from both sides: OFF-SITE nothing about
   accounts is drawn, and ON-SITE everything is exactly as it was. The second half matters more —
   a change that tidies somebody else's page by quietly removing the account from the real one
   would be a catastrophe wearing a tidy-up's clothes.
*/
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),http=require("http"),fs=require("fs");
const FILE=path.resolve(__dirname,process.argv[2]||GAME);
const OUT=path.join(__dirname,"shots95");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};

const PORT=8953;
// A plain file server standing in for itch.io: it serves the game and knows nothing about accounts,
// which is the whole of what a host that is not playthecrew.com is.
const srv=http.createServer((q,r)=>{
  const f=path.join(ROOT,decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/,""));
  fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();
    r.writeHead(200,{"content-type":f.endsWith(".html")?"text/html; charset=utf-8":"application/octet-stream",
                     "cache-control":"no-store"});r.end(b);});
});

(async()=>{
  await new Promise(r=>srv.listen(PORT,"127.0.0.1",r));
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  const errs=[];page.on("pageerror",e=>errs.push(String(e)));
  /* One arranged 404 is allowed through, by path and status. The second half of this file points the
     API at the plain file server so the game believes it is on its own site — and the first thing it
     then does, correctly, is ask that server for /health, which a file server does not have. The
     noise is the proof: it means the on-site branch really did reach for a server. Scoped to
     /health and 404, so a 500 there, or a 404 on anything else, still fails this file. */
  const noise=t=>/ERR_CERT|music\/|\.mp3|manifest\.json|r2\.dev|fonts\./.test(t)||/net::ERR_FAILED/.test(t)
    ||/ERR_FILE_NOT_FOUND/.test(t)||(/status of 404/.test(t)&&/\/health/.test(t));
  page.on("console",m=>{const w=(m.location()||{}).url||"";const t=m.text()+(w?" ["+w+"]":"");
    if(m.type()==="error"&&!noise(t))errs.push(t);});
  // Every request that leaves for somewhere that is not this host. The game must not reach for an
  // API it has no business talking to from here.
  const out=[];
  page.on("request",q=>{const u=q.url();
    if(/^https?:/.test(u)&&!u.includes("127.0.0.1:"+PORT)&&!/fonts\.(googleapis|gstatic)|r2\.dev/.test(u))out.push(q.method()+" "+u);});

  const rel=path.relative(ROOT,FILE);
  await page.goto("http://127.0.0.1:"+PORT+"/"+rel);
  await page.waitForTimeout(1200);

  console.log("— somewhere that is not this game's own site —");
  let s=await page.evaluate(()=>({
    live:API_LIVE, shop:shopOpen(), walled:walled(), codes:codesOpen(),
    begin:!!document.querySelector('[data-act="begin"]'),
    acc:!!document.querySelector('[data-act="acc-open"]'),
    body:document.body.innerText}));
  check(s.live===false,"the game can see there is no server of its own here");
  check(s.walled===false&&s.begin===true,
    "so the door never appears and New game is there — free, which is what it is on itch.io");
  check(s.shop===false&&s.codes===false,"no till, and no code box: both are things only a server can honour");
  check(s.acc===false,"AND NO WAY INTO AN ACCOUNT — the button that used to sit here refused everybody who pressed it");
  check(!/cleared cache cannot reach|any machine you sign in on/i.test(s.body),
    "nor the paragraph promising an account keeps your crew somewhere safe, which off-site is true of nothing");
  await page.screenshot({path:OUT+"/01-somewhere-else.png"});

  console.log("— and the office offers nothing it cannot do either —");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const off=await page.evaluate(()=>({
    open:!!document.querySelector(".office-svg"),
    acc:!!document.querySelector('[data-act="acc-open"]'),
    cabinet:!!document.querySelector('[data-act="off-cabinet"]')}));
  check(off.open===true,"the office opens");
  check(off.acc===false,"with no Account button in it");
  check(off.cabinet===true,
    "but the file cabinet is still there — which is how a crew leaves this browser when no account can carry it");
  await page.screenshot({path:OUT+"/02-the-office.png"});

  console.log("— a whole game runs, start to finish of a week —");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
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
  const ran=await page.evaluate(()=>({week:S.week,crew:crewAll().length,money:S.money,
    saved:!!localStorage.getItem("thecrew_save_v2")}));
  check(ran.week>=1&&ran.crew>=1,"a dossier opens and a crew exists (week "+ran.week+", "+ran.crew+" on the books)");
  check(ran.saved===true,"and it saves, in this browser, which is the only place it can");

  console.log("— and it never once reached for a server —");
  check(out.length===0,"not a single request left this host"+(out.length?": "+out.slice(0,3).join(" | "):""));

  console.log("— ON ITS OWN SITE, NOTHING HAS CHANGED —");
  /* The half that matters most. A tidy-up that quietly took the account off playthecrew.com would
     be far worse than the dead button it was fixing, so the same page is asked again with the API
     pointed at this host — which is what being on your own site looks like to that one comparison. */
  await page.addInitScript(p=>{window.THE_CREW_API="http://127.0.0.1:"+p;},PORT);
  await page.goto("http://127.0.0.1:"+PORT+"/"+rel);
  await page.waitForTimeout(1200);
  s=await page.evaluate(()=>({live:API_LIVE,
    acc:!!document.querySelector('[data-act="acc-open"]'),
    body:document.body.innerText}));
  check(s.live===true,"the API is on this host now, so the game is on its own site");
  check(s.acc===true,"and the way into an account is back");
  check(/cleared cache cannot reach|The account|Sign in or open one/i.test(s.body),
    "with the line that offers it, word for word as it was");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  check(!!(await page.$('[data-act="acc-open"]')),"and the office has its Account button again");
  await page.screenshot({path:OUT+"/03-on-its-own-site.png"});

  check(errs.length===0,"no page or console errors through any of it"+(errs.length?": "+errs.slice(0,3).join(" | "):""));
  await browser.close();srv.close();
})();

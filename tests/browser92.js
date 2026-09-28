/* A WEEK, GIVEN AWAY — the code box, and what the game says while the clock runs.

   A press pass is the one way into this game that does not involve money, which makes it the one
   place where a mistake costs the price of the game every time somebody makes it. The server's own
   suite has the half that matters most (server/tests/test_invites.py: a forged code, an edited
   one, a spent one, a stale one, and the week counted from redemption). What THIS file is for is
   the half the server cannot see.

   THE BOX IS SHUT UNTIL IT IS ASKED FOR, and that is a decision rather than a detail. Almost
   everybody who reaches the door came to buy a game, and a field saying "enter your code" in front
   of them is a question they cannot answer — it reads as a thing they are missing. The handful who
   have one were sent it in a message and are looking for exactly this. So: a line, not a field.

   NOTHING IN HERE KNOWS WHAT A CODE IS WORTH. The game types a string into an endpoint and re-reads
   the account. Every assertion below about what happens after is an assertion about the game doing
   as it is told by the server — including the one that matters, which is that a plausible-looking
   code typed into the box opens nothing at all.

   AND THE CLOCK IS SAID OUT LOUD. Somebody on a week who is not told how much of it is left finds
   out by being stopped in the middle of a game, which is precisely the thing the free run was taken
   out of this game to stop happening.
*/
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),http=require("http"),fs=require("fs");
const FILE=path.resolve(__dirname,process.argv[2]||GAME);
const OUT=path.join(__dirname,"shots92");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};

const PORT=8938;
// The fake server. It holds one account's worth of state and the one code that opens it — the
// point being that the game cannot tell the difference, because it never decides any of this.
let SHOP=true, PAID=false, UNTIL=null, ENDED=false, INVITES=true;
const GOOD="CREW-0W0P-H78H-F72S-8ZQP";
let SEEN=[];
const srv=http.createServer((q,r)=>{
  const url=q.url.split("?")[0];
  const json=o=>{r.writeHead(200,{"content-type":"application/json","cache-control":"no-store"});r.end(JSON.stringify(o));};
  const bad=(code,detail)=>{r.writeHead(code,{"content-type":"application/json"});r.end(JSON.stringify({detail}));};
  const acc=()=>({email:"press@example.com",paid:PAID,over:!PAID,shop_open:SHOP,
                  invites_open:INVITES,pass_until:UNTIL,pass_ended:ENDED,kind:PAID&&UNTIL?"pass":PAID?"purchase":null});
  // `invites` on /health, which is the only thing a stranger can ask. See main.py: it is there so
  // the code box can be offered to somebody who has no account, which is everybody who has a code.
  if(url==="/health")return json({ok:true,mail:{configured:false},shop:SHOP,invites:INVITES});
  if(url==="/auth/me")return json(acc());
  if(url==="/auth/signup"||url==="/auth/login"){
    let body="";q.on("data",d=>body+=d);
    return q.on("end",()=>json({token:"t",email:"reviewer@example.com"}));
  }
  if(url==="/licence")return json(Object.assign({price:null,currency:null,bought_at:null},acc()));
  if(url==="/licence/redeem"){
    let body="";q.on("data",d=>body+=d);
    return q.on("end",()=>{
      let code="";try{code=(JSON.parse(body||"{}").code||"");}catch(e){}
      SEEN.push(code);
      // The server decides, exactly as the real one does. Anything that is not the one code is
      // the one refusal, whatever is wrong with it.
      const norm=String(code).toUpperCase().replace(/[\s-]/g,"");
      if(norm!==GOOD.replace(/-/g,""))return bad(400,"That code is not open. Check it against the message it came in.");
      PAID=true;UNTIL=new Date(Date.now()+7*86400000).toISOString();ENDED=false;
      return json({already:false,over:false,days:7,pass_until:UNTIL});
    });
  }
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
  /* One arranged failure is let through, by its URL and its status: this file posts a code that is
     not one, on purpose, and a refusal is what it is testing for. Chromium logs every 4xx a fetch
     receives whatever the code does with the promise. Scoped to /licence/redeem and 400, so a 500
     from that endpoint — or a 400 from any other — still fails this file. */
  const noise=t=>/ERR_CERT|music\/|\.mp3|manifest\.json|r2\.dev|fonts\./.test(t)||/net::ERR_FAILED/.test(t)
    ||/ERR_FILE_NOT_FOUND/.test(t)||(/status of 400/.test(t)&&/licence\/redeem/.test(t));
  page.on("console",m=>{const w=(m.location()||{}).url||"";const t=m.text()+(w?" ["+w+"]":"");
    if(m.type()==="error"&&!noise(t))errs.push(t);});

  await page.addInitScript(p=>{window.THE_CREW_API="http://127.0.0.1:"+p;},PORT);
  const URL="http://127.0.0.1:"+PORT+"/"+path.relative(ROOT,FILE);
  const open=async()=>{await page.goto(URL);await page.waitForTimeout(400);};
  const signIn=async()=>{await page.evaluate(()=>{localStorage.setItem("thecrew_token_v1","t");});};
  const at=async()=>page.evaluate(()=>({
    walled:walled(),paid:licensed(),onPass:typeof onPass==="function"?onPass():null,
    left:typeof passDaysLeft==="function"?passDaysLeft():null,
    words:typeof passLeftWords==="function"?passLeftWords():"",
    begin:!!document.querySelector('[data-act="begin"]'),
    codeLink:!!document.querySelector('[data-act="code-open"]'),
    box:!!document.querySelector("#codebox"),
    body:document.body.innerText}));

  /* THE FIRST THING TO CHECK IS THE ONE THAT WAS BROKEN, and it was broken here: every assertion
     below this used to run signed in, so nothing ever asked what a stranger sees. Whether codes are
     taken was read off the account, which is null until somebody has one — so the line offering the
     box was invisible to the only people who arrive holding a code. It comes off /health now. */
  console.log("— somebody arriving with a code has no account yet —");
  SHOP=true;PAID=false;UNTIL=null;ENDED=false;INVITES=true;
  await open();
  let cold=await page.evaluate(()=>({inn:signedIn(),acc:!!ACC,
    link:!!document.querySelector('[data-act="code-open"]'),body:document.body.innerText}));
  check(cold.inn===false&&cold.acc===false,"nobody is signed in, and there is no account to ask");
  check(cold.link===true,"and the line is there anyway — this is the only audience a code box has");
  check(/have a code/i.test(cold.body),"in the words somebody sent one would look for");
  await page.screenshot({path:OUT+"/00-a-stranger-with-a-code.png"});

  console.log("— and typing it takes them through an account and straight on —");
  await page.click('[data-act="code-open"]');
  await page.waitForSelector("#codebox");
  await page.fill("#codebox",GOOD);
  await page.click('[data-act="code-go"]');
  await page.waitForSelector("#acmail",{timeout:5000});
  check(true,"the code box sends them to open an account rather than refusing them");
  await page.click('[data-act="acc-mode"]');      // they have not got one — this is their first visit
  await page.waitForTimeout(80);
  await page.fill("#acmail","reviewer@example.com");
  await page.fill("#acpass","a long enough password");
  await page.click('[data-act="acc-go"]');
  await page.waitForTimeout(900);
  const through=await page.evaluate(()=>({paid:licensed(),walled:walled(),
    begin:!!document.querySelector('[data-act="begin"]'),held:UI.codeVal||""}));
  check(through.paid===true&&through.walled===false,
    "and the code they were already holding is spent the moment the account exists");
  check(through.begin===true,"the game is open, with no second box to find and no button to press twice");
  check(through.held==="","and nothing is left held over");
  await page.screenshot({path:OUT+"/00b-straight-through.png"});

  console.log("— the box is shut until it is asked for —");
  SHOP=true;PAID=false;UNTIL=null;ENDED=false;INVITES=true;
  await open();await signIn();await open();
  let s=await at();
  check(s.walled===true,"the door is shut, as it is for anybody who has not paid");
  check(s.codeLink===true&&s.box===false,
    "and there is a LINE offering a code, not a field demanding one — most people here have no code");
  check(/have a code/i.test(s.body),"in words somebody with one would look for: \"Have a code?\"");
  await page.screenshot({path:OUT+"/01-a-line-not-a-field.png"});

  console.log("— and not offered at all where codes are not taken —");
  INVITES=false;await open();
  const none=await at();
  check(none.codeLink===false,"a server taking no codes offers no code box — an offer nobody can accept is worse than none");
  INVITES=true;await open();

  console.log("— a code that is not one opens nothing —");
  await page.click('[data-act="code-open"]');
  await page.waitForSelector("#codebox");
  check(!!(await page.$("#codebox")),"the box opens when it is asked for");
  await page.fill("#codebox","CREW-AAAA-AAAA-AAAA-AAAA");
  await page.click('[data-act="code-go"]');
  await page.waitForTimeout(400);
  const refused=await at();
  check(refused.walled===true&&refused.paid===false&&refused.begin===false,
    "a plausible-looking code leaves the door exactly as shut, with no way past it drawn");
  check(/not open/i.test(refused.body),"and the game prints what the SERVER said about it, rather than deciding itself");
  check(!!(await page.$("#codebox")),"with the box still open, and what was typed still in it");
  await page.screenshot({path:OUT+"/02-refused.png"});

  console.log("— the real one opens it —");
  await page.fill("#codebox",GOOD);
  await page.click('[data-act="code-go"]');
  await page.waitForTimeout(600);
  s=await at();
  check(s.paid===true&&s.walled===false,"the door opens");
  check(s.onPass===true,"and the game knows it is a week rather than a purchase");
  check(s.left===7,"seven days of it ("+s.left+")");
  check(s.begin===true,"New game is there — everything is open, nothing is held back");
  check(/press pass/i.test(s.body)&&/7 days left/i.test(s.body),
    "and the title screen says so, with the count on it: \""+(s.body.match(/Press pass[^\\n]*/)||[""])[0]+"\"");
  await page.screenshot({path:OUT+"/03-a-week.png"});

  console.log("— typed the way a person types it —");
  PAID=false;UNTIL=null;await open();
  await page.click('[data-act="code-open"]');
  await page.waitForSelector("#codebox");
  await page.fill("#codebox","  "+GOOD.toLowerCase().replace(/-/g," ")+"  ");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  check((await at()).paid===true,"lower case, spaces for dashes, and Enter rather than the button");

  console.log("— the day count is said the way a person would say it —");
  const words=await page.evaluate(()=>{
    const mk=ms=>{ACC.pass_until=new Date(Date.now()+ms).toISOString();return passLeftWords();};
    const out={seven:mk(7*86400000-1000),one:mk(20*3600000),hours:mk(3600000),gone:mk(-1000)};
    return out;});
  check(words.seven==="7 days left","a week is \""+words.seven+"\"");
  check(words.one==="one day left","the last day is \""+words.one+"\" — not \"1 days\"");
  check(words.hours==="one day left","and an hour to go still has a day in it ("+words.hours+"), because a game that opens must not say none");
  check(words.gone==="the last of it today","spent, it says \""+words.gone+"\"");

  console.log("— when the week is up, the game says which kind of shut it is —");
  const lapse=await page.evaluate(()=>{
    // a game running, then the account comes back with the pass gone
    const c=S&&S.player;
    return !!c;});
  if(!lapse){
    // start one so there is something for the wall to sit over
    await page.click('[data-act="begin"]');await page.fill("#pname","Reviewer");
    await page.click('[data-act="confirm-create"]');
    await page.waitForSelector(".topbar",{timeout:15000});
    if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
    for(let i=0;i<25;i++){
      const x=await page.$('button[data-act="crewname-later"]')||await page.$('.scrim button.x:not([disabled])');
      if(x){await x.click();await page.waitForTimeout(40);continue;}
      const q=await page.$$('.scrim .btn:not([disabled])');
      if(q.length){await q[q.length-1].click();await page.waitForTimeout(40);continue;}
      break;}
  }
  PAID=false;UNTIL=null;ENDED=true;
  const ended=await page.evaluate(async()=>{
    const week=S.week,money=S.money;
    await accRefresh();render();
    const stored=JSON.parse(localStorage.getItem("thecrew_save_v2")||"{}");
    return {modal:S.modal&&S.modal.type,text:document.body.innerText,
            savedWeek:stored.week,week,money,storedMoney:stored.money};});
  check(ended.modal==="paywall","the game stops");
  check(/That is the week/i.test(ended.text),
    "and says the week is up — NOT that a payment was refunded, which never happened to this person");
  check(!/refunded/i.test(ended.text),"the refund sentence is nowhere on it");
  check(/Nothing has happened to your crew/i.test(ended.text),"the crew is accounted for in the first sentence");
  check(ended.savedWeek===ended.week&&ended.storedMoney===ended.money,
    "and the save is untouched (week "+ended.savedWeek+")");
  await page.screenshot({path:OUT+"/04-that-is-the-week.png"});

  console.log("— a refund is still a refund —");
  ENDED=false;
  const refund=await page.evaluate(async()=>{await accRefresh();render();return document.body.innerText;});
  check(/not paid for/i.test(refund)&&!/That is the week/i.test(refund),
    "somebody whose payment went away is told that instead — the two are different news");

  check(errs.length===0,"no page or console errors through any of it"+(errs.length?": "+errs.slice(0,3).join(" | "):""));
  await browser.close();srv.close();
})();

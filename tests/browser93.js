/* WRITING PRESS PASSES — the one screen in this game that hands out free copies of it.

   There was already a way to write them: tools/invite.py, a script in this repository. It needs
   Python installed and a clone of the repo, and the person who actually hands out review copies has
   neither on the machine they are holding — so the way of doing it was a way of not doing it, and
   the codes existed for nothing. This is that fixed: a panel in the office, on one account.

   WHAT THIS FILE IS FOR, given that the server's own suite has the refusals (server/tests/
   test_invites.py: nobody else can write one, an empty ADMIN_EMAIL makes nobody admin, the counts
   are bounded, no secret means nothing to sign with). It is the half the server cannot see:

     WHO IS OFFERED IT. The panel is drawn on the server's word — ACC.admin, off /auth/me — and
     nowhere else. An ordinary account must not see so much as the word "pass", because a button
     that appears and then says "there is nothing here" is a thing to go and find a way around.

     WHAT IS ACTUALLY SENT. The chips are the whole form, so the assertion that matters is not what
     they look like but what arrives at the endpoint when they are pressed. This file reads the
     request bodies the server received.

     WHAT IS PRINTED IS THE SERVER'S ANSWER. The test below makes the server answer three days to a
     request for fourteen, and the box has to say three. Nothing in the game knows what a code is
     worth; if it ever starts guessing, the number beside a batch of codes becomes a number somebody
     repeats to a reviewer and is wrong about.

     AND THAT NOTHING IS KEPT. Not in the browser, because minting is arithmetic over a secret the
     server holds and there is no list of what was written anywhere. The panel says that out loud,
     which is only honest if it is true — so this reloads and looks.
*/
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),http=require("http"),fs=require("fs");
const FILE=path.resolve(__dirname,process.argv[2]||GAME);
const OUT=path.join(__dirname,"shots93");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};

const PORT=8939;
// The fake server, which decides everything — the same as the real one, and for the same reason.
let ADMIN=true, INVITES=true, SAY_DAYS=null, ASKED=[], MADE=0;
const B32="0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const oneCode=()=>{                       // the shape, not the arithmetic: 16 of the alphabet
  let s="";for(let i=0;i<16;i++)s+=B32[(MADE*7+i*11+3)%32];MADE++;
  return "CREW-"+s.slice(0,4)+"-"+s.slice(4,8)+"-"+s.slice(8,12)+"-"+s.slice(12);
};
const srv=http.createServer((q,r)=>{
  const url=q.url.split("?")[0];
  const json=o=>{r.writeHead(200,{"content-type":"application/json","cache-control":"no-store"});r.end(JSON.stringify(o));};
  const bad=(code,detail)=>{r.writeHead(code,{"content-type":"application/json"});r.end(JSON.stringify({detail}));};
  const acc=()=>({email:"paz@example.com",paid:true,over:false,shop_open:true,
                  invites_open:INVITES,admin:ADMIN,pass_until:null,pass_ended:false,kind:"purchase"});
  if(url==="/health")return json({ok:true,mail:{configured:false},shop:true});
  if(url==="/auth/me")return json(acc());
  if(url==="/licence")return json(Object.assign({price:1200,currency:"USD",bought_at:null},acc()));
  if(url==="/licence/invites"){
    let body="";q.on("data",d=>body+=d);
    return q.on("end",()=>{
      let b={};try{b=JSON.parse(body||"{}");}catch(e){}
      ASKED.push(b);
      // Exactly the real endpoint's order of refusal: who is asking, then whether there is a
      // secret to sign with. A stranger is told the endpoint does not exist.
      if(!ADMIN)return bad(404,"Not found.");
      if(!INVITES)return bad(503,"No INVITE_SECRET is set on the server, so there is nothing to sign with.");
      const n=Math.max(1,Math.min(100,parseInt(b.count,10)||10));
      const d=SAY_DAYS===null?Math.max(1,Math.min(90,parseInt(b.days,10)||7)):SAY_DAYS;
      const codes=[];for(let i=0;i<n;i++)codes.push(oneCode());
      return json({codes:codes,days:d,redeem_by:"2026-12-27"});
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
  const page=await browser.newPage({viewport:{width:1280,height:1100}});
  const errs=[];page.on("pageerror",e=>errs.push(String(e)));
  /* Two arranged refusals are let through by URL and status: this file asks as a non-admin (404)
     and with no secret on the server (503), on purpose, because being refused is what it is
     testing. Chromium logs every 4xx and 5xx a fetch receives whatever the code does with the
     promise. Scoped to /licence/invites and those two codes, so a 500 from that endpoint — or a
     404 from any other — still fails this file. */
  const noise=t=>/ERR_CERT|music\/|\.mp3|manifest\.json|r2\.dev|fonts\./.test(t)||/net::ERR_FAILED/.test(t)
    ||/ERR_FILE_NOT_FOUND/.test(t)||(/status of (404|503)/.test(t)&&/licence\/invites/.test(t));
  page.on("console",m=>{const w=(m.location()||{}).url||"";const t=m.text()+(w?" ["+w+"]":"");
    if(m.type()==="error"&&!noise(t))errs.push(t);});

  await page.addInitScript(p=>{window.THE_CREW_API="http://127.0.0.1:"+p;},PORT);
  const URL="http://127.0.0.1:"+PORT+"/"+path.relative(ROOT,FILE);
  const open=async()=>{await page.goto(URL);await page.waitForTimeout(400);};
  // The real route a person takes: the title screen's account line, clicked.
  const office=async()=>{
    await page.click('[data-act="acc-open"]');
    await page.waitForSelector('[data-act="acc-scrim"]');
    await page.waitForTimeout(120);
  };
  const at=async()=>page.evaluate(()=>{
    const m=document.querySelector('[data-act="acc-scrim"] .modal');
    const box=document.getElementById("mintbox");
    return {text:m?m.innerText:"",
            line:!!document.querySelector('[data-act="mint-open"]'),
            go:!!document.querySelector('[data-act="mint-go"]'),
            chips:[...document.querySelectorAll('[data-act="mint-n"]')].map(b=>b.getAttribute("data-v")),
            picked:(document.querySelector('[data-act="mint-n"].stamp')||{}).textContent||"",
            days:(document.querySelector('[data-act="mint-d"].stamp')||{}).textContent||"",
            btn:(document.querySelector('[data-act="mint-go"]')||{}).textContent||"",
            box:box?box.value:null};
  });

  console.log("— an ordinary account is not offered it, and is not told it exists —");
  ADMIN=false;
  await open();
  await page.evaluate(()=>{localStorage.setItem("thecrew_token_v1","t");});
  await open();await office();
  let s=await at();
  check(s.line===false&&s.go===false,"no panel, and no line offering one");
  check(!/press pass/i.test(s.text),
    "and the word is nowhere on the screen — a button that refuses is a thing to find a way around");
  await page.screenshot({path:OUT+"/01-not-for-everybody.png"});

  console.log("— and pressing the endpoint anyway gets nowhere —");
  const forced=await page.evaluate(async()=>{
    // A player who reads the source, sets the flag the panel is drawn from, and presses it. The
    // server is the only thing that decides, so this is the whole of what that buys.
    ACC.admin=true;UI.mint=true;render();
    const had=!!document.querySelector('[data-act="mint-go"]');
    document.querySelector('[data-act="mint-go"]').click();
    await new Promise(r=>setTimeout(r,500));
    return {had:had,out:UI.mintOut,msg:UI.mintMsg,box:!!document.getElementById("mintbox")};
  });
  check(forced.had===true,"the panel can be forced open in a console, as anything in a page can");
  check(forced.out===null&&forced.box===false,"and not one code comes back");
  check(/cannot write them/i.test(forced.msg||""),
    "the game says so plainly rather than looking broken: \""+forced.msg+"\"");
  check(ASKED.length===1,"the ask reached the server, which is what refused it");

  console.log("— the admin account gets a line, not a form —");
  ADMIN=true;await open();await office();
  s=await at();
  check(s.line===true&&s.go===false,
    "shut until it is asked for — this account plays the game too, and came here for a dossier");
  check(/press passes/i.test(s.text),"under a heading somebody would look for");
  await page.screenshot({path:OUT+"/02-a-line.png"});

  console.log("— a server with no secret says so, to the one reader who can fix it —");
  INVITES=false;await open();await office();
  s=await at();
  check(s.line===false&&s.go===false,"no button, because there is nothing behind it");
  check(/INVITE_SECRET/.test(s.text),"and it names the variable: \""+(s.text.match(/No INVITE_SECRET[^\n]*/)||[""])[0].slice(0,80)+"…\"");
  INVITES=true;

  console.log("— the form is two rows of chips, already right —");
  await open();await office();
  await page.click('[data-act="mint-open"]');
  await page.waitForSelector('[data-act="mint-go"]');
  s=await at();
  check(s.chips.join(",")==="1,5,10,25","how many: "+s.chips.join(", ")+" — one tap, and nothing to mistype");
  check(s.picked==="10"&&/7 days/.test(s.days),"ten of them, a week each, with nothing chosen yet");
  check(/Write 10 passes/.test(s.btn),"and the button names what comes out: \""+s.btn.trim()+"\"");
  /* THE CANCEL BUTTON MUST NOT READ AS THE CONFIRM, which is not a style note — it is the first
     thing that went wrong in front of somebody. It said "Done", one button along from the one that
     writes, on a form that ends in two rows of choices: choose, choose, Done. So it was pressed,
     nothing was written, and the panel vanished. Any word that finishes a form is banned here. */
  const shut=await page.evaluate(()=>(document.querySelector('[data-act="mint-close"]')||{}).textContent||"");
  check(!/done|finish|ok\b|confirm|save|go\b/i.test(shut),
    "the way out is not a word that finishes a form — it says \""+shut.trim()+"\"");
  check(/close|cancel|not now|not that/i.test(shut),"it says what it does: \""+shut.trim()+"\"");
  await page.screenshot({path:OUT+"/03-the-form.png"});

  console.log("— the chips are what is sent —");
  ASKED=[];
  await page.click('[data-act="mint-n"][data-v="25"]');
  await page.click('[data-act="mint-d"][data-v="14"]');
  s=await at();
  check(s.picked==="25"&&/14 days/.test(s.days)&&/Write 25/.test(s.btn),
    "the form follows the tap, including the button");
  await page.click('[data-act="mint-go"]');
  await page.waitForSelector("#mintbox",{timeout:5000});
  check(ASKED.length===1&&ASKED[0].count===25&&ASKED[0].days===14,
    "and the endpoint was asked for exactly that: "+JSON.stringify(ASKED[0]));

  console.log("— and every code the server wrote is in the box —");
  s=await at();
  const codes=(s.box||"").match(/CREW-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}/g)||[];
  check(codes.length===25,"twenty-five of them ("+codes.length+"), one to a line");
  check(new Set(codes).size===25,"all different, or two people are sent the same string");
  check(/14 days of play each/.test(s.box),"the box says what they are worth");
  check(/2026-12-27/.test(s.box),"and until when they can be spent — nothing else records either");
  check(/Have a code\?/.test(s.box),
    "with the words to send, which have to match what the door actually says");
  check(/Copy this before you close it/i.test(s.text),
    "and the panel says to keep it, because nothing else has a copy");
  await page.screenshot({path:OUT+"/04-twenty-five-passes.png"});

  console.log("— and shutting the panel does not take the codes with it —");
  /* The other half of the same mistake. Closing used to throw the batch away, so one stray press of
     a button called "Done" would have destroyed the only copy of twenty-five passes — silently, and
     with nothing anywhere to write them again from. Shutting a panel is not a decision to discard. */
  const before=(await at()).box;
  await page.click('[data-act="mint-close"]');
  await page.waitForTimeout(150);
  check((await at()).go===false,"it closes");
  await page.click('[data-act="mint-open"]');
  await page.waitForTimeout(150);
  const after=(await at()).box;
  check(after===before&&/CREW-/.test(after||""),
    "and opening it again hands back the same batch, character for character");

  console.log("— what they are worth is the SERVER'S answer, never the chip —");
  SAY_DAYS=3;
  await page.click('[data-act="mint-d"][data-v="30"]');
  await page.click('[data-act="mint-go"]');
  await page.waitForTimeout(600);
  s=await at();
  check(/3 days of play each/.test(s.box)&&!/30 days of play each/.test(s.box),
    "asked for thirty, told three, printed three — the game does not know what a code is worth");
  SAY_DAYS=null;

  console.log("— a refusal is passed through, and empties the box —");
  ADMIN=false;
  await page.click('[data-act="mint-go"]');
  await page.waitForTimeout(600);
  s=await at();
  check(s.box===null,"no stale batch left on screen beside a refusal");
  check(/cannot write them/i.test(s.text),"and the reason, in a sentence: ADMIN_EMAIL is another address");
  ADMIN=true;

  console.log("— nothing is kept, which is the thing the panel promises —");
  await page.click('[data-act="mint-n"][data-v="5"]');
  await page.click('[data-act="mint-go"]');
  await page.waitForSelector("#mintbox",{timeout:5000});
  const stored=await page.evaluate(()=>{
    let all="";for(let i=0;i<localStorage.length;i++)all+=localStorage.getItem(localStorage.key(i))||"";
    return {all:all,box:(document.getElementById("mintbox")||{}).value||""};
  });
  check(/CREW-/.test(stored.box),"a batch is on the screen");
  check(!/CREW-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}/.test(stored.all),
    "and not one character of it is in this browser's storage");
  await open();await office();
  s=await at();
  check(s.line===true&&s.box===null,
    "a reload leaves the panel shut and the codes gone — arithmetic, not a ledger");

  console.log("— the copy button says what actually happened —");
  await page.click('[data-act="mint-open"]');
  await page.waitForSelector('[data-act="mint-go"]');
  await page.click('[data-act="mint-go"]');
  await page.waitForSelector("#mintbox",{timeout:5000});
  // Chromium refuses navigator.clipboard without permission, which is the ordinary case and the
  // one that must not lie: the fallback selects the box and says so.
  await page.click('[data-act="mint-copy"]');
  await page.waitForTimeout(400);
  /* Read the TEXTAREA's own selection, not the document's. window.getSelection() cannot see inside
     a form field, so it reports nothing selected about a box that is entirely selected — which cost
     one wrong red here and is worth the line. */
  const copied=await page.evaluate(()=>{
    const b=document.getElementById("mintbox");
    return {said:UI.mintCopied,
            note:(document.querySelector('[data-act="mint-copy"]')||{}).parentElement.innerText||"",
            all:!!b&&b.value.length>0&&(b.selectionEnd-b.selectionStart)===b.value.length};});
  check(copied.said==="copied"||copied.said==="selected",
    "it reports one of the two things that can happen: \""+copied.said+"\"");
  check(/copied|ctrl-c/i.test(copied.note),
    "in words beside the button rather than a silence: \""+copied.note.replace(/\n/g," ").trim()+"\"");
  await page.screenshot({path:OUT+"/05-copy-them.png"});

  console.log("— and where there is no clipboard, it does not claim to have used one —");
  /* Not a hypothetical branch. navigator.clipboard is absent over plain http and inside a webview,
     and Safari hands it over only within a gesture it recognises — so on somebody's phone this is
     the path that runs. "Copied" printed over a clipboard that was never written is how a batch of
     codes gets lost between a screen and a message, which is the whole reason this says which of the
     two happened rather than just cheering. */
  const probe=async(nobble)=>page.evaluate(async no=>{
    const had=navigator.clipboard, ex=document.execCommand;
    Object.defineProperty(navigator,"clipboard",{value:undefined,configurable:true});
    if(no)document.execCommand=()=>false;
    UI.mintCopied="";mintCopy();
    await new Promise(r=>setTimeout(r,200));
    const b=document.getElementById("mintbox");
    const out={said:UI.mintCopied,
               all:!!b&&b.value.length>0&&(b.selectionEnd-b.selectionStart)===b.value.length,
               note:(document.querySelector('[data-act="mint-copy"]')||{}).parentElement.innerText||""};
    document.execCommand=ex;
    Object.defineProperty(navigator,"clipboard",{value:had,configurable:true});
    return out;},nobble);
  const older=await probe(false);
  check(older.said==="copied","an older browser with only execCommand still copies them");
  const fell=await probe(true);
  check(fell.said==="selected","refused both ways, it says selected rather than copied — it is not a lie");
  check(/ctrl-c/i.test(fell.note),"and says what to press: \""+fell.note.replace(/\n/g," ").trim()+"\"");
  check(fell.all===true,
    "with the whole box still selected — the render that printed that sentence must not un-select it");

  console.log("— and it is still a game, with the door open —");
  const still=await page.evaluate(()=>{
    UI.account=false;render();
    return {begin:!!document.querySelector('[data-act="begin"]'),walled:walled()};
  });
  check(still.walled===false&&still.begin===true,"the account is paid for and the game opens as it did");

  check(errs.length===0,"no page or console errors through any of it"+(errs.length?": "+errs.slice(0,3).join(" | "):""));
  await browser.close();srv.close();
})();

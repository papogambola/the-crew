/* PLAYTIME, END TO END — the real client against the real server, because the two halves of this
   can each be right on their own and still disagree.

   The browser is the only thing that knows whether a tab is visible or whether anybody is touching
   it, so it has to do the counting; the server is the only thing that cannot be edited by the
   person being counted, so it has to do the believing. Everything interesting is in the seam.

   WHAT THIS ASSERTS, in the order it matters:
     a copy that is not on its own site says nothing at all — not a request, not an id in storage;
     a tab nobody touches is not a session;
     the clock stops when the tab is hidden and starts again when it comes back;
     a goodbye is actually sent when the page goes away, by sendBeacon, during unload;
     and the id is anonymous: no token, no account, no address, anywhere in any request.

   It needs a server. A real uvicorn on 127.0.0.1 with a throwaway SQLite file, because 127.0.0.1
   is sameSite with itself and so API_LIVE is true — which is the switch the whole feature hangs
   off, and mocking it would be mocking the thing under test.
*/
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs"),os=require("os");
const {spawn,execSync}=require("child_process");
const http=require("http");
const FILE=path.resolve(__dirname,process.argv[2]||GAME);
const OUT=path.join(__dirname,"shots99");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};

/* THE ONE TEST IN THIS SUITE THAT NEEDS A SERVER, and therefore the one that can be absent.
   Everything else here drives play.html off the disk and needs nothing but Chromium. This drives
   it against a real FastAPI on 127.0.0.1, because the feature under test is the seam between the
   two and a mocked server would be a mock of the thing being tested.
   If the Python environment is not built, say so and leave: a suite that cannot be run on a fresh
   machine is a suite people stop running. `cd server && python -m venv ...` brings it back. */
const PY="/tmp/crewenv/bin/python";
if(!fs.existsSync(PY)){
  console.log("skipped: no python environment at "+PY+" — the server half of this test needs one");
  process.exit(0);
}
const PORT=8731+Math.floor(Math.random()*180);
const BASE="http://127.0.0.1:"+PORT;
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),"crew-play-"));
const ADMIN="paz-"+Math.random().toString(16).slice(2,10)+"@example.com";
const PW="a long enough password";

const env=Object.assign({},process.env,{
  DATABASE_URL:"sqlite:///"+path.join(TMP,"play.db"),
  JWT_SECRET:"test-secret-not-used-anywhere-real-and-long-enough-for-hs256",
  ADMIN_EMAIL:ADMIN,
  // 127.0.0.1 is where the game is served from in this test, so the API has to allow it or the
  // browser refuses every call at the preflight and the console fills with CORS errors.
  ALLOWED_ORIGINS:"http://127.0.0.1:"+(PORT+1)+",http://localhost:"+(PORT+1),
});

function get(url,headers){
  return new Promise((res,rej)=>{
    const r=http.get(url,{headers:headers||{}},x=>{let b="";x.on("data",c=>b+=c);
      x.on("end",()=>res({status:x.statusCode,body:b,headers:x.headers}));});
    r.on("error",rej);r.setTimeout(8000,()=>{r.destroy();rej(new Error("timeout"));});
  });
}
const basic=()=>({Authorization:"Basic "+Buffer.from(ADMIN+":"+PW).toString("base64")});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  // ---- the server, migrated and running ----
  execSync(`${PY} -m alembic upgrade head`,{cwd:path.join(ROOT,"server"),env,stdio:"ignore"});
  const api=spawn(PY,["-m","uvicorn","app.main:app","--host","127.0.0.1","--port",String(PORT),
    "--log-level","warning"],{cwd:path.join(ROOT,"server"),env});
  const site=spawn(PY,["-m","http.server",String(PORT+1),"--bind","127.0.0.1","-d",ROOT],
    {stdio:"ignore"});
  const stop=()=>{try{api.kill();}catch(e){}try{site.kill();}catch(e){}
    try{fs.rmSync(TMP,{recursive:true,force:true});}catch(e){}};
  process.on("exit",stop);
  for(let i=0;i<60;i++){try{await get(BASE+"/health");break;}catch(e){await sleep(250);}}

  // An admin account to read the dashboard back with.
  await new Promise((res,rej)=>{
    const body=JSON.stringify({email:ADMIN,password:PW});
    const r=http.request(BASE+"/auth/signup",{method:"POST",
      headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(body)}},
      x=>{x.resume();x.on("end",res);});
    r.on("error",rej);r.end(body);
  });

  const browser=await chromium.launch({executablePath:CHROME});
  const errs=[];
  const page=await browser.newPage({viewport:{width:1200,height:900}});
  page.on("pageerror",e=>errs.push(String(e)));
  const noise=t=>/ERR_CERT|music\/|\.mp3|manifest\.json|r2\.dev|fonts\.|favicon/.test(t)
    ||/net::ERR_FAILED|ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const t=m.text();if(m.type()==="error"&&!noise(t))errs.push(t);});

  // Every request the page makes to the API, recorded — so "what is sent" is a measurement.
  const beats=[];
  page.on("request",r=>{if(r.url().indexOf("/play/beat")>=0)
    beats.push({body:r.postData()||"",headers:r.headers()});});

  /* ---------- a copy that is not on its own site ---------- */
  console.log("— off its own site, it says nothing —");
  await page.goto("file://"+FILE);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();await page.waitForTimeout(400);
  await page.mouse.click(600,500);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);
  const off=await page.evaluate(()=>({live:API_LIVE,on:PT.on,
    stored:(()=>{try{return localStorage.getItem(PLAY_ANON_KEY);}catch(e){return "blocked";}})()}));
  check(off.live===false&&off.on===false,"a copy off a disk never starts the clock");
  check(off.stored===null,"and does not even write an id (itch.io, a mirror, every one of these tests)");
  check(beats.length===0,"nothing was sent anywhere ("+beats.length+" requests)");

  /* ---------- on its own site ---------- */
  console.log("— on its own site —");
  const SITE="http://127.0.0.1:"+(PORT+1)+"/play.html";
  await page.addInitScript(b=>{window.THE_CREW_API=b;},BASE);
  await page.goto(SITE);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.waitForTimeout(600);
  const armed=await page.evaluate(()=>({live:API_LIVE,on:PT.on}));
  check(armed.live===true,"API_LIVE is true when the API belongs to the site");
  check(armed.on===false,"and a tab nobody has touched is still not a session");
  check(beats.length===0,"nothing sent for a page that was only looked at");

  console.log("— the first touch opens a sitting —");
  await page.mouse.click(600,400);
  await page.waitForTimeout(400);
  const started=await page.evaluate(()=>({on:PT.on,anon:PT.anon,sid:PT.sid,
    stored:localStorage.getItem(PLAY_ANON_KEY)}));
  check(started.on===true&&/^[0-9a-f]{32}$/.test(started.anon),
    "a touch starts it, with a 32-hex anonymous id");
  check(started.stored===started.anon,"kept in localStorage, so tomorrow is the same player");
  check(beats.length>=1,"and the server was told at once ("+beats.length+")");

  /* THE PRIVACY CLAIM, measured rather than described: what actually went over the wire. */
  console.log("— what is actually sent —");
  const sent=beats[0];
  const keys=Object.keys(JSON.parse(sent.body)).sort();
  check(JSON.stringify(keys)===JSON.stringify(["active_ms","anon","ended","session"]),
    "four fields and no others: "+keys.join(", "));
  check(!sent.headers["authorization"],"no Authorization header — the beat does not know who you are");
  check(/text\/plain/.test(sent.headers["content-type"]||""),
    "text/plain, so there is no preflight and a dying page can still send one");
  const tok=await page.evaluate(()=>{try{return localStorage.getItem(TOKEN_KEY)||"";}catch(e){return "";}});
  check(beats.every(b=>!/@|token|email|Bearer/i.test(b.body)),
    "no address, no token, no account in any body");

  /* ---------- the clock ----------
     Every wait below is longer than PT.tickMs, because the clock is only read on the tick and a
     test that waits less than one measures the interval rather than the feature. */
  console.log("— the clock runs while somebody is there —");
  const TICK=await page.evaluate(()=>PT.tickMs);
  await page.evaluate(()=>{PT.activeMs=0;PT.sentMs=-1;});
  for(let i=0;i<8;i++){await page.mouse.click(400+i*8,400);await page.waitForTimeout(500);}
  await page.waitForTimeout(TICK+600);
  const ran=await page.evaluate(()=>PT.activeMs);
  check(ran>TICK,"it accrued while the tab was up and being used ("+Math.round(ran)+"ms)");

  console.log("— and stops when the tab goes away —");
  /* HEADLESS CHROMIUM WILL NOT HIDE A PAGE. bringToFront on a second tab leaves document.hidden
     false, and Emulation.setPageVisibilityState was removed from the protocol — both measured,
     not assumed. So what is asserted here is the half that is ours: given a hidden document, no
     time accrues and a beat goes out. Whether a real browser reports hidden when a tab is
     backgrounded is the browser's business and it has done it since 2011. */
  const hid=await page.evaluate(async()=>{
    Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});
    document.dispatchEvent(new Event("visibilitychange"));
    await new Promise(r=>setTimeout(r,120));     // let the handler bank the sliver up to the hide
    const hidden=document.hidden, settled=PT.activeMs;
    await new Promise(r=>setTimeout(r,PT.tickMs+600));
    const out={hidden:hidden,settled:settled,after:PT.activeMs};
    delete document.hidden;                                  // give the real one back
    out.restored=document.hidden;
    return out;
  });
  check(hid.hidden===true&&hid.restored===false,"the document was hidden and then given back");
  /* Measured from AFTER the hide was processed, not from before it. The handler banks whatever
     was played between the last tick and the moment the tab went away, and that is real play —
     the first version of this test called those few hundred milliseconds a failure. What must be
     zero is everything after. */
  check(hid.after-hid.settled===0,
    "and nothing at all accrued once it was gone (0ms over a whole tick)");
  /* Two ticks to come back, and that is the design rather than a slow test: the first tick after
     a return only re-marks the clock, because the time before it is time nobody can vouch for. */
  await page.mouse.click(600,400);
  await page.waitForTimeout(TICK*2+600);
  const back=await page.evaluate(()=>PT.activeMs);
  check(back>hid.after+TICK*0.6,
    "it picks up again when the player comes back ("+Math.round(back-hid.after)+"ms)");

  console.log("— untouched for long enough, it stops counting —");
  /* Two ticks of nothing. The first may credit the sliver up to the moment attention lapsed —
     that is the clamp working — and the second must credit nothing at all. */
  const idled=await page.evaluate(async()=>{
    PT.lastInput=performance.now()-PT.idleMs-1000;   // as if nobody had touched it for 91 seconds
    await new Promise(r=>setTimeout(r,PT.tickMs+400));
    const mid=PT.activeMs;
    await new Promise(r=>setTimeout(r,PT.tickMs+400));
    return {mid:mid,now:PT.activeMs};
  });
  check(idled.now-idled.mid===0,
    "a game nobody is touching is not a game being played (0ms over a whole tick)");

  /* ---------- the goodbye ---------- */
  console.log("— and it says goodbye on the way out —");
  /* Asserted at the SERVER rather than at the request log: sendBeacon during page teardown is not
     reliably reported to a Playwright request listener, and the first draft of this test called
     that a missing goodbye when the row had one. What matters is that it arrived. */
  await page.evaluate(()=>{PT.lastInput=performance.now();});
  const liveSid=await page.evaluate(()=>PT.sid);
  await page.goto("about:blank");                    // the page goes away: pagehide fires
  await page.waitForTimeout(800);

  /* ---------- what the server made of it ---------- */
  console.log("— what the server believed —");
  await sleep(400);
  const data=JSON.parse((await get(BASE+"/admin/analytics/data?window=all",basic())).body);
  check(data.totals.sessions===1,"one sitting, not one per beat ("+data.totals.sessions+")");
  check(data.totals.players===1,"one player");
  const row=data.recent[0];
  check(row.is_new===true&&row.session_no===1,"recorded as a first-ever sitting");
  check(row.ended!==null&&row.live===false,
    "the goodbye arrived: the row has an end on it and is not counted as playing now");
  check(row.active_ms>0&&row.active_ms<60000,
    "and a believable playtime: "+Math.round(row.active_ms/1000)+"s of a test that ran far longer");
  check(row.anon.length===10&&row.anon!==started.anon,
    "the id on the page is a stub, not the whole thing");

  /* ---------- who may look ---------- */
  console.log("— and who may look at it —");
  const anon=await get(BASE+"/admin/analytics");
  check(anon.status===401,"a stranger asking for the dashboard gets 401, not a page");
  check(/basic/i.test(anon.headers["www-authenticate"]||""),
    "with a Basic challenge, so a browser puts its own prompt up");
  check(!/play_session|anon|session_no/i.test(anon.body),"and no data leaks in the refusal");
  const anonData=await get(BASE+"/admin/analytics/data");
  check(anonData.status===401&&!/anon/i.test(anonData.body),"the JSON behind it is shut too");
  const wrong=await get(BASE+"/admin/analytics",
    {Authorization:"Basic "+Buffer.from(ADMIN+":wrong").toString("base64")});
  check(wrong.status===401,"a wrong password is refused");

  /* ---------- the page itself ---------- */
  console.log("— the dashboard —");
  const dash=await browser.newPage({viewport:{width:1280,height:1400},
    httpCredentials:{username:ADMIN,password:PW}});
  const derr=[];
  dash.on("pageerror",e=>derr.push(String(e)));
  dash.on("console",m=>{if(m.type()==="error"&&!/favicon/i.test(m.text()))derr.push(m.text());});
  await dash.goto(BASE+"/admin/analytics");
  await dash.waitForTimeout(900);
  const shown=await dash.evaluate(()=>document.body.innerText);
  check(/PLAYTIME/i.test(shown),"it renders");
  check(/Unique players/i.test(shown)&&/Median session/i.test(shown)
    &&/Return rate|came back/i.test(shown),"with the headline numbers on it");
  check(/Under 1 min/.test(shown)&&/2\+ hours/.test(shown),"the playtime distribution");
  check(/Recent sessions/i.test(shown)&&new RegExp(row.anon).test(shown),
    "and the sitting this test just played, in the table");
  const charts=await dash.evaluate(()=>document.querySelectorAll("svg").length);
  check(charts>=4,"four charts drawn as inline SVG, no library ("+charts+")");
  check(derr.length===0,"and no errors on the dashboard"+(derr.length?": "+derr[0]:""));
  await dash.screenshot({path:OUT+"/01-the-dashboard.png",fullPage:true});

  /* ---------- game events, end to end ----------
     The client half is driven for real: a campaign is created by filling in the dossier screen
     and pressing the button, which is the only thing that fires game_started. Everything after it
     is asserted at the SERVER, because what matters is not that pevent pushed onto an array but
     that the row arrived with the right fields on it. */
  console.log("— and what happens inside a game —");
  const g=await browser.newPage({viewport:{width:1280,height:1000}});
  const gerrs=[];
  g.on("pageerror",e=>gerrs.push(String(e)));
  g.on("console",m=>{const t=m.text();if(m.type()==="error"&&!noise(t))gerrs.push(t);});
  await g.addInitScript(b=>{window.THE_CREW_API=b;},BASE);
  await g.goto(SITE);
  await g.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await g.reload();
  await g.waitForTimeout(700);
  await g.click('[data-act="begin"]');
  await g.fill("#pname","Vera");
  await g.click('[data-act="confirm-create"]');
  await g.waitForSelector(".topbar",{timeout:20000});
  if(await g.$('[data-act="tut-skip"]'))await g.click('[data-act="tut-skip"]');
  for(let i=0;i<25;i++){
    const x=await g.$('button[data-act="crewname-later"]')||await g.$('.scrim button.x:not([disabled])');
    if(x){await x.click();await g.waitForTimeout(40);continue;}
    const q=await g.$$('.scrim .btn:not([disabled])');
    if(q.length){await q[q.length-1].click();await g.waitForTimeout(40);continue;}
    break;}

  const queued=await g.evaluate(()=>({names:PE.q.map(e=>e.n),anon:PT.anon}));
  check(queued.names.indexOf("game_started")>=0,
    "making a commander queues game_started ("+queued.names.join(", ")+")");

  /* ANALYTICS MUST NEVER INTERRUPT GAMEPLAY, asserted rather than asserted-about: pevent is
     replaced with a function that throws every time, and then the game is driven. Grepping for
     try/catch proves the shape of the source; this proves the behaviour, including for the
     arguments evaluated BEFORE the call — which is where the one real gap was (jobPool(), read
     inside the argument list and therefore outside pevent's own guard). */
  const sabotage=await g.evaluate(()=>{
    const real=window.pevent;
    window.pevent=function(){throw new Error("analytics is on fire");};
    const out={errors:[],week:S.week};
    const press=(a,id)=>{const b=document.createElement("button");
      b.setAttribute("data-act",a);if(id!=null)b.setAttribute("data-id",id);
      document.body.appendChild(b);b.click();b.remove();};
    try{
      const cand=S.roster.find(c=>c.status==="available"&&!c.isPlayer);
      const job=S.jobs.find(j=>!j.final);
      press("open-recruit",cand.id);                 // candidate_viewed throws
      S.modal=null;render();
      press("open-job",job.id);                      // job_viewed throws, jobPool runs first
      out.jobOpen=S.jobOpen===job.id;
      weekTick(mulberry32(3));                       // week_turned throws
      out.weekMoved=true;
      refreshJobs(false);                            // job_expired throws
      out.board=S.jobs.length;
      render();
      out.rendered=!!document.querySelector(".topbar");
    }catch(e){out.errors.push(String(e));}
    window.pevent=real;
    return out;
  });
  check(sabotage.errors.length===0,
    "with every single event throwing, the game carries on"
    +(sabotage.errors.length?": "+sabotage.errors[0]:""));
  check(sabotage.jobOpen===true&&sabotage.rendered===true&&sabotage.board>0,
    "a posting still opens, the week still turns, the board still refills, the screen still draws");

  // A file on the roster, and a posting, through the real buttons.
  const opened=await g.evaluate(()=>{
    const cand=S.roster.find(c=>c.status==="available"&&!c.isPlayer);
    const job=S.jobs.find(j=>!j.final);
    return {cand:cand?cand.id:null,job:job?job.id:null,cat:job?job.cat:null,tier:job?job.tier:null};});
  /* Both go through the REAL click handler, with a button carrying the real data-act and the real
     id — the same path a player's click takes, which is what the hook is attached to. A rendered
     button would be better still, and was tried: the roster paginates at thirty, so the first
     available file on a six-thousand-person roster is usually not on the screen, and a test that
     waits for it to be is testing the pagination. */
  const press=async(act,id)=>{
    await g.evaluate(a=>{const b=document.createElement("button");
      b.setAttribute("data-act",a[0]);b.setAttribute("data-id",a[1]);
      document.body.appendChild(b);b.click();b.remove();},[act,id]);
    await g.waitForTimeout(250);
  };
  await press("open-recruit",opened.cand);
  await g.evaluate(()=>{S.modal=null;render();});
  await press("open-job",opened.job);
  await g.waitForTimeout(300);
  const q2=await g.evaluate(()=>PE.q.map(e=>e.n+(e.c?":"+e.c:"")));
  check(q2.some(n=>n.indexOf("candidate_viewed")===0),"opening a file queues candidate_viewed");
  check(q2.some(n=>n.indexOf("job_viewed")===0),"opening a posting queues job_viewed");

  /* THE BATCH. Forced out rather than waited for, because the beat is thirty seconds and what is
     under test is that the queue empties onto it — not the clock. */
  const before=await g.evaluate(()=>PE.q.length);
  await g.evaluate(()=>{playSend(false);});
  await g.waitForTimeout(600);
  const after=await g.evaluate(()=>PE.q.length);
  check(before>0&&after===0,"the queue empties onto a beat ("+before+" → "+after+")");

  await sleep(400);
  const jr=JSON.parse((await get(BASE+"/admin/analytics/journey?window=all",basic())).body);
  const step=Object.fromEntries(jr.funnel.map(s=>[s.key,s]));
  check(step.started.n>=1,"the server has them: a campaign was begun");
  check(step.job1v.n>=1,"and a posting was opened");
  check(jr.funnel.every((s,i)=>i===0||s.n<=jr.funnel[i-1].n),
    "the funnel never goes up as it goes down — no negative drop-off");
  const jrow=jr.jobs.find(r=>r.cat===opened.cat&&r.tier===opened.tier);
  check(!!jrow&&jrow.viewed>=1,
    "the posting is counted under its kind and tier, not its id ("+(jrow?jrow.label:"?")+" t"+opened.tier+")");

  const one=JSON.parse((await get(BASE+"/admin/analytics/player/"+queued.anon,basic())).body);
  check(one.found===true&&one.sessions.length>=1,"the player's journey reads back");
  const lines=one.sessions.map(s=>s.events.map(e=>e.name).join(",")).join(" | ");
  check(/game_started/.test(lines)&&/job_viewed/.test(lines),
    "in order, in the game's own words: "+lines.slice(0,70));
  check(!/@/.test(JSON.stringify(one)),"and with nobody's address in it");

  // The dashboard draws the new half without complaint.
  const dash2=await browser.newPage({viewport:{width:1280,height:2200},
    httpCredentials:{username:ADMIN,password:PW}});
  const d2=[];
  dash2.on("pageerror",e=>d2.push(String(e)));
  dash2.on("console",m=>{if(m.type()==="error"&&!/favicon/i.test(m.text()))d2.push(m.text());});
  await dash2.goto(BASE+"/admin/analytics?window=all&who="+queued.anon);
  await dash2.waitForTimeout(1200);
  const txt=await dash2.evaluate(()=>document.body.innerText);
  check(/Core progression funnel/i.test(txt),"the funnel is on the dashboard");
  check(/Building a crew/i.test(txt),"the crew section is too");
  check(/Postings — by kind and tier/i.test(txt),"and the postings table");
  check(/Where sittings end/i.test(txt),"and where sittings end");
  check(/One player, in order/i.test(txt)&&/Started a campaign/i.test(txt),
    "and this player's own journey, opened by id");
  check(d2.length===0,"with no errors"+(d2.length?": "+d2[0]:""));
  await dash2.screenshot({path:OUT+"/04-events.png",fullPage:true});
  check(gerrs.length===0,"and the game itself logged nothing"
    +(gerrs.length?": "+gerrs.slice(0,2).join(" | "):""));

  check(errs.length===0,"no page or console errors through any of it"
    +(errs.length?": "+errs.slice(0,3).join(" | "):""));
  await browser.close();
  stop();
})().catch(e=>{console.error("FAIL: the test itself fell over — "+e);process.exitCode=1;});

// Build 122: what the card of the city sounds like.
//
// The anthem was added in build 118 and reported as missing ever since — "I still hear the old
// music in the city skylines segments". Both halves of that were true and neither was visible from
// inside the code:
//
//   1. The cue and the anthem BOTH played, with the anthem deliberately mixed under the cue. So on
//      a card with Germany's flag on it you heard the same soft sea you heard everywhere else.
//   2. The anthem was 15 dB under the cue at the peak and 23 dB under it in RMS. That is not
//      "underneath", it is inaudible — a level nobody would have called wrong by reading it.
//
// Nothing tested the sound of the card, which is why. This does, and the loudness assertion is the
// point of it: it renders both through an OfflineAudioContext and compares them in decibels, which
// is the only form of this that could have failed before the fix.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path");
const putDownPaper=require("./paper.js");
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  // Autoplay is allowed so the audio graph actually builds; the game's own gate (userGestured) is
  // satisfied by the clicks below either way.
  const browser=await chromium.launch({executablePath:CHROME,args:["--autoplay-policy=no-user-gesture-required"]});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+(process.argv[2]?path.resolve(process.argv[2]):GAME));
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Paz");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');

  // ---- one or the other, never both
  const sound=await page.evaluate(()=>{
    SET.sound=true;SET.music=true;SET.volume=1;userGestured=true;
    const res=[];
    // estabArm() ITSELF, not a copy of the two lines inside it. Written the other way this passed
    // against a deliberately re-broken build, because the test was running its own fixed version
    // of the thing it was meant to be testing. The real function reads S.modal, so the card is
    // put up the way the game puts it up.
    const run=country=>{
      cityCueStop();anthemStop();CITY_CUE.on=false;
      S.modal={type:"result",data:{estab:true,done:false,job:{country:country,city:"Somewhere",id:"t"},
        narrative:[],revealed:0,teamIds:[]}};
      estabArm();
      if(ESTAB){clearTimeout(ESTAB);ESTAB=null;}        // do not let the card drop mid-check
      res.push({country,anthem:ANTHEM.nodes.length>0,notes:ANTHEM.nodes.length,
                cue:!!CITY_CUE.on,known:!!ANTHEMS[country]});
      cityCueStop();anthemStop();CITY_CUE.on=false;S.modal=null;
    };
    const withTune=Object.keys(ANTHEMS).slice(0,4);
    const without=COUNTRIES.map(c=>c.name).filter(n=>!ANTHEMS[n]).slice(0,3);
    withTune.concat(without).forEach(run);
    return {res,known:Object.keys(ANTHEMS).length,all:COUNTRIES.length};
  });
  check(sound.known>=6,sound.known+" of "+sound.all+" countries have a tune");
  const tuned=sound.res.filter(r=>r.known), plain=sound.res.filter(r=>!r.known);
  check(tuned.length&&tuned.every(r=>r.anthem&&r.notes>0),
    "a country with a tune plays it: "+tuned.map(r=>r.country+" ("+r.notes+" notes)").join(", "));
  check(tuned.every(r=>!r.cue),"and the old cue does NOT play under it — that was the complaint");
  check(plain.length&&plain.every(r=>!r.anthem&&r.notes===0),
    "a country with no tune improvises nothing: "+plain.map(r=>r.country).join(", "));
  check(plain.every(r=>r.cue),"and keeps the cue, rather than going silent");

  // ---- and it is loud enough to be the thing you hear
  const level=await page.evaluate(async()=>{
    const SECS=7, OC=window.OfflineAudioContext||window.webkitOfflineAudioContext;
    const peak=b=>{const d=b.getChannelData(0);let m=0;for(let i=0;i<d.length;i++)if(Math.abs(d[i])>m)m=Math.abs(d[i]);return m;};
    const bin=atob(CITY_CUE_SRC.split(",")[1]);
    const arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
    const cuePeak=peak(await new OC(1,44100*SECS,44100).decodeAudioData(arr.buffer))*0.5;  // volume*0.5
    // rendered exactly the way anthemStart builds it, at the gain the game ships
    const c=new OC(1,44100*SECS,44100);
    const master=c.createGain();master.gain.setValueAtTime(ANTHEM_GAIN*1,0);master.connect(c.destination);
    anthemNotes(ANTHEMS["United Kingdom"]).forEach(n=>{
      const o=c.createOscillator(),g=c.createGain();
      o.type="triangle";o.frequency.setValueAtTime(n.hz,0.25+n.at);
      const s=0.25+n.at,e=s+Math.max(0.12,n.dur*0.9);
      g.gain.setValueAtTime(0.0001,s);g.gain.exponentialRampToValueAtTime(1,s+0.03);
      g.gain.exponentialRampToValueAtTime(0.0001,e);
      o.connect(g);g.connect(master);o.start(s);o.stop(e+0.05);});
    const aPeak=peak(await c.startRendering());
    return {cuePeak,aPeak,db:20*Math.log10(aPeak/cuePeak),gain:ANTHEM_GAIN,clips:aPeak>=1};
  });
  check(level.db>-6,"and it is within 6 dB of the cue it replaced, at the peak ("+level.db.toFixed(1)+" dB)");
  check(!level.clips,"without clipping (peak "+level.aPeak.toFixed(3)+", against the cue's "+level.cuePeak.toFixed(3)+")");

  // ---- the music switch turns it off, because it is music
  const off=await page.evaluate(()=>{
    cityCueStop();anthemStop();CITY_CUE.on=false;
    SET.music=false;
    S.modal={type:"result",data:{estab:true,done:false,job:{country:Object.keys(ANTHEMS)[0],city:"X",id:"t"},
      narrative:[],revealed:0,teamIds:[]}};
    estabArm();
    if(ESTAB){clearTimeout(ESTAB);ESTAB=null;}
    const r={anthem:ANTHEM.nodes.length>0,cue:!!CITY_CUE.on};
    SET.music=true;cityCueStop();anthemStop();CITY_CUE.on=false;S.modal=null;
    return r;});
  check(!off.anthem&&!off.cue,"with the music switched off in the office, the card is silent");

  // ---- and both stop when the card goes
  const stopped=await page.evaluate(()=>{
    SET.music=true;anthemStart(Object.keys(ANTHEMS)[0]);
    const up=ANTHEM.nodes.length;
    anthemStop();
    return {up,down:ANTHEM.nodes.length};});
  check(stopped.up>0&&stopped.down===0,"the tune is taken down with the card ("+stopped.up+" notes → "+stopped.down+")");

  // ---- and the police arriving is a sound, not a light show
  /* It used to darken the whole page and sweep two coloured beams across it with a red-and-blue
     flash on top, for five seconds, over the sheet the player was in the middle of reading. The
     game is black ink on white paper; that was a nightclub. The sound is the idea and it stays. */
  const pol=await page.evaluate(()=>{
    SET.sound=true;SET.music=true;SET.volume=1;userGestured=true;
    sirenFx();
    const out={on:!!SIREN.on,
      overlay:!!document.getElementById("sirenfx"),
      anyBeam:document.querySelectorAll(".s-red,.s-blue,#sirenfx").length,
      audio:!!(SIREN.audio),
      timer:SIREN.timer!=null};
    if(SIREN.timer){clearTimeout(SIREN.timer);SIREN.timer=null;}
    sirenEnd();
    return out;});
  check(pol.on,"the siren runs when the police arrive");
  check(pol.audio,"and it is a recording, playing");
  check(pol.timer,"on its own clock, so it rides down rather than being cut off mid-wail");
  check(!pol.overlay&&pol.anyBeam===0,
    "and NOTHING is drawn over the page for it — no darkening, no beams, no flash ("+pol.anyBeam+" elements)");
  const css=await page.evaluate(()=>{
    const src=[...document.querySelectorAll("style")].map(s=>s.textContent).join("\n");
    return {fx:/#sirenfx/.test(src),turn:/siren-turn/.test(src),flash:/siren-flash/.test(src)};});
  check(!css.fx&&!css.turn&&!css.flash,"and the rules that drew it are gone from the sheet too");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

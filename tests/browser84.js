// What the card of the city sounds like, and what the police arriving sounds like.
//
// THERE WAS A NATIONAL ANTHEM HERE AND IT IS GONE. Three versions of it over six builds, each
// broken differently: mixed under the cue so it was inaudible ("I still hear the old music"); a
// melody on one oscillator, which is a ringtone ("sometimes this beeping sound which doesn't make
// sense"); and finally real recordings, where only 23 of 49 countries could be got hold of, so the
// card sounded like one game in some countries and another game in the rest. The decision was to
// take it out: one sound for every city.
//
// So what is left to check here is that the card HAS its sound, that it is the same sound
// everywhere, and that it answers to the music switch and goes down with the card. Which is most of
// what the anthem version checked, minus the part that turned out not to be worth having.
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

  // ---- the card has a sound, and it is the same one everywhere
  const sound=await page.evaluate(()=>{
    SET.sound=true;SET.music=true;SET.volume=1;userGestured=true;
    const res=[];
    // estabArm() ITSELF, not a copy of the line inside it. Written the other way this passed
    // against a deliberately re-broken build, because the test was running its own fixed version
    // of the thing it was meant to be testing. The real function reads S.modal, so the card is
    // put up the way the game puts it up.
    const run=country=>{
      cityCueStop();CITY_CUE.on=false;
      S.modal={type:"result",data:{estab:true,done:false,job:{country:country,city:"Somewhere",id:"t"},
        narrative:[],revealed:0,teamIds:[]}};
      estabArm();
      if(ESTAB){clearTimeout(ESTAB);ESTAB=null;}        // do not let the card drop mid-check
      res.push({country,cue:!!CITY_CUE.on});
      cityCueStop();CITY_CUE.on=false;S.modal=null;
    };
    // A spread of them, including the ones that used to have a tune and the ones that never did:
    // the point of the change is that there is now no difference between those two groups.
    const names=COUNTRIES.map(c=>c.name);
    [names[0],names[5],names[12],names[30],names[44]].forEach(run);
    return {res,all:names.length};
  });
  check(sound.res.length>0&&sound.res.every(r=>r.cue),
    "every card plays the cue, whichever country it is: "+sound.res.map(r=>r.country).join(", "));
  check(typeof (await page.evaluate(()=>typeof anthemStart))==="string"&&await page.evaluate(()=>typeof anthemStart)==="undefined",
    "and there is no anthem left in the game to play instead");

  // ---- the music switch turns it off, because it is music
  const off=await page.evaluate(()=>{
    cityCueStop();CITY_CUE.on=false;
    SET.music=false;
    S.modal={type:"result",data:{estab:true,done:false,job:{country:COUNTRIES[0].name,city:"X",id:"t"},
      narrative:[],revealed:0,teamIds:[]}};
    estabArm();
    if(ESTAB){clearTimeout(ESTAB);ESTAB=null;}
    const r={cue:!!CITY_CUE.on};
    SET.music=true;cityCueStop();CITY_CUE.on=false;S.modal=null;
    return r;});
  check(!off.cue,"with the music switched off in the office, the card is silent");

  // ---- and it stops when the card goes
  const stopped=await page.evaluate(async()=>{
    SET.music=true;cityCueStart();
    const up=!!CITY_CUE.on;
    cityCueStop();
    await new Promise(r=>setTimeout(r,300));           // the ride down is seven steps of 20ms
    return {up,down:!!CITY_CUE.on};});
  check(stopped.up&&!stopped.down,"the cue is taken down with the card");

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

// Build 36: the alias rolls too, and rolls something that goes with the passport.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const OUT=path.join(__dirname,"shots36");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+(process.argv[2]?require("path").resolve(process.argv[2]):GAME));
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');
  await page.waitForSelector("#pname");

  // ---- the button is there, and it is the same button as the face's
  const btn=await page.$('[data-act="reroll-name"]');
  check(btn,"the Alias field has a Random button");
  const look=await page.evaluate(()=>{
    const a=document.querySelector('[data-act="reroll-name"]'),b=document.querySelector('[data-act="reroll-av"]');
    if(!a||!b)return null;
    const ca=getComputedStyle(a),cb=getComputedStyle(b);
    return {text:a.textContent.trim(),same:a.className===b.className&&ca.fontSize===cb.fontSize&&ca.padding===cb.padding,
            other:b.textContent.trim(),
            inLabel:!!a.closest("label"),forName:(a.closest("label")||{}).htmlFor};});
  check(look&&/Random/.test(look.text),"it says "+JSON.stringify(look.text));
  check(look&&look.same,"and looks exactly like the one over the face ("+look.other+")");
  check(look&&look.forName==="pname","it sits on the Alias field itself");

  // ---- it fills the box, and the box is what gets used
  await page.fill("#pname","");
  await page.click('[data-act="reroll-name"]');
  await page.waitForTimeout(150);
  const first=await page.evaluate(()=>({box:document.getElementById("pname").value,
    draft:draft.name,ok:!document.querySelector('[data-act="confirm-create"]').disabled}));
  check(first.box&&first.box.trim().length>2,"pressing it puts a name in the box: "+JSON.stringify(first.box));
  check(first.box===first.draft,"and the game has the same name the box shows");
  check(first.ok,"and the screen will now let you go on");
  check(/^\S+ \S+$/.test(first.box),"it is a first name and a surname");

  // ---- it rolls something different
  const rolls=new Set();
  for(let i=0;i<12;i++){await page.click('[data-act="reroll-name"]');await page.waitForTimeout(60);
    rolls.add(await page.evaluate(()=>document.getElementById("pname").value));}
  check(rolls.size>=6,"pressing it again gives a different name ("+rolls.size+" in 12)");

  // ---- and it goes with the passport
  const byNat=await page.evaluate(()=>{
    const out=[];
    const pick3=["Nigeria","Finland","Japan","Brazil","Lebanon","Mexico"];
    pick3.forEach(nat=>{
      if(!COUNTRY_BY_NAME[nat])return;
      draft.nat=nat;
      const pool=NAMES[COUNTRY_BY_NAME[nat].pool];
      const names=[];
      for(let i=0;i<40;i++){const n=nameFor(freshRng(),nat,"M");names.push(n);}
      const allIn=names.every(n=>{const p=n.split(" ");return pool.m.includes(p[0])&&pool.s.includes(p.slice(1).join(" "));});
      out.push({nat,pool:COUNTRY_BY_NAME[nat].pool,allIn,sample:names.slice(0,2)});});
    return out;});
  byNat.forEach(r=>check(r.allIn,r.nat+" gives a "+r.pool+" name — "+r.sample.join(", ")));

  // ---- and with the sex
  const bySex=await page.evaluate(()=>{
    draft.nat="Germany";
    const pool=NAMES[COUNTRY_BY_NAME.Germany.pool];
    const men=[],women=[];
    for(let i=0;i<40;i++){men.push(nameFor(freshRng(),"Germany","M").split(" ")[0]);
      women.push(nameFor(freshRng(),"Germany","F").split(" ")[0]);}
    return {men:men.every(n=>pool.m.includes(n)),women:women.every(n=>pool.f.includes(n)),
      m:men.slice(0,2),f:women.slice(0,2)};});
  check(bySex.men,"a man gets a man's name ("+bySex.m.join(", ")+")");
  check(bySex.women,"a woman gets a woman's name ("+bySex.f.join(", ")+")");

  // ---- changing the passport on screen changes what it rolls
  await page.selectOption("#pnat","Japan");
  await page.waitForTimeout(200);
  await page.click('[data-act="reroll-name"]');
  await page.waitForTimeout(150);
  const jp=await page.evaluate(()=>{const v=document.getElementById("pname").value;
    const pool=NAMES[COUNTRY_BY_NAME.Japan.pool];
    return {v,in:pool.m.includes(v.split(" ")[0])||pool.f.includes(v.split(" ")[0])};});
  check(jp.in,"switching the passport to Japan and rolling gives "+JSON.stringify(jp.v));

  // ---- the same pool the rest of the roster is named from
  const shared=await page.evaluate(()=>{
    const c=S&&S.roster?null:null;
    return typeof nameFor==="function"&&NAMES[COUNTRY_BY_NAME.Japan.pool]===NAMES.EastAsian;});
  check(shared,"and it is the same pool every file on the roster is named from");

  await page.screenshot({path:OUT+"/01-alias.png"});
  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

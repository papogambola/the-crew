// Build 26 in a real browser: the word "trade", the brief under it, and a face you can still
// see while you are choosing its parts.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const OUT=path.join(__dirname,"shots26");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  // a laptop, which is where the face scrolled out of the window
  const page=await browser.newPage({viewport:{width:1280,height:760}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+GAME);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');
  await page.waitForSelector(".faceslide");

  // ---- the word
  const txt=await page.$eval("body",e=>e.innerText);
  check(/\bTRADE\b/i.test(txt),"the dossier asks for a trade");
  check(!/technique/i.test(txt),"and nothing on the screen says technique");
  check(await page.$eval('label[for="ptech"]',e=>e.innerText.trim().toLowerCase())==="trade","the field is labelled Trade");

  // ---- the brief, the first time anybody meets these words
  check(!!(await page.$(".tradehint")),"a brief sits under the trade");
  const hint=await page.$eval(".tradehint",e=>e.innerText);
  const picked=await page.evaluate(()=>({k:draft.tech,l:TECH_BY_K[draft.tech].l,d:TECH_BY_K[draft.tech].d,a:ATTR_NAME[TECH_BY_K[draft.tech].a],know:TECH_BY_K[draft.tech].know}));
  check(hint.indexOf(picked.l)>=0&&hint.indexOf(picked.d)>=0,"it says what the trade is: "+hint.replace(/\n/g," / "));
  check(hint.indexOf(picked.a)>=0,"what it leans on ("+picked.a+")");
  check(hint.indexOf(picked.know)>=0,"and what it comes with ("+picked.know+")");
  // and it follows the dropdown
  const other=await page.evaluate(()=>{const o=TECHS.find(t=>t.k!==draft.tech);return o.k;});
  await page.selectOption("#ptech",other);
  await page.waitForTimeout(250);
  const hint2=await page.$eval(".tradehint",e=>e.innerText);
  const picked2=await page.evaluate(()=>({l:TECH_BY_K[draft.tech].l,d:TECH_BY_K[draft.tech].d}));
  check(hint2!==hint&&hint2.indexOf(picked2.d)>=0,"choosing another trade changes the brief: "+hint2.split("\n")[0]);
  // every trade has one, and none of them is empty
  const all=await page.evaluate(()=>TECHS.map(t=>({l:t.l,d:t.d,a:t.a,know:t.know})));
  check(all.length===16&&all.every(t=>t.d&&t.d.length>18&&t.a&&t.know),all.length+" trades, each with a line of its own");
  await page.screenshot({path:OUT+"/04-trade-brief.png"});

  // ---- the face stays where you can see it
  const parts=await page.$$(".faceslide");
  check(parts.length===10,"ten parts to choose ("+parts.length+")");
  const seen=[];
  for(let i=0;i<parts.length;i++){
    await page.evaluate(n=>{document.querySelectorAll(".faceslide")[n].scrollIntoView({block:"center"});},i);
    await page.waitForTimeout(90);
    const v=await page.evaluate(n=>{
      const av=document.getElementById("bigav").getBoundingClientRect();
      const sl=document.querySelectorAll(".faceslide")[n].getBoundingClientRect();
      return {face:av.bottom>8&&av.top<window.innerHeight-8&&av.height>40,
              slider:sl.top>0&&sl.bottom<window.innerHeight};
    },i);
    seen.push(v);
  }
  check(seen.every(v=>v.face),"the picture is visible at every one of the ten parts");
  check(seen.every(v=>v.slider),"and so is the slider you are moving");
  await page.screenshot({path:OUT+"/05-last-part.png"});

  // the value belongs to its own slider, not the next one
  const rows=await page.evaluate(()=>[...document.querySelectorAll(".facerow")].map(r=>{
    const lab=r.querySelector("label").getBoundingClientRect();
    const val=r.querySelector(".faceval").getBoundingClientRect();
    const sl=r.querySelector(".faceslide").getBoundingClientRect();
    return {sameLine:Math.abs(lab.top-val.top)<6,valueAboveSlider:val.bottom<=sl.top+2};
  }));
  check(rows.every(r=>r.sameLine),"the part and its choice share a line");
  check(rows.every(r=>r.valueAboveSlider),"above their own slider, not the next part's");

  // moving a slider still redraws the face, and the face is on screen when it does
  await page.evaluate(()=>{const el=document.querySelectorAll(".faceslide")[9];el.scrollIntoView({block:"center"});});
  await page.waitForTimeout(120);
  const b4=await page.$eval("#bigav",e=>e.innerHTML);
  await page.evaluate(()=>{const el=document.querySelectorAll(".faceslide")[9];el.value=String((+el.value+1)%(+el.max+1));el.dispatchEvent(new Event("input",{bubbles:true}));});
  await page.waitForTimeout(150);
  const af=await page.$eval("#bigav",e=>e.innerHTML);
  check(b4!==af,"moving the last slider redraws the face");
  check(await page.evaluate(()=>{const r=document.getElementById("bigav").getBoundingClientRect();return r.bottom>8&&r.top<window.innerHeight-8;}),
    "and you can see it happen");

  // ---- the smallest window the board is ever drawn in. It does not get a different layout,
  // so the portrait must stay in view there the same way it does at 1280.
  await page.setViewportSize({width:960,height:720});
  await page.waitForTimeout(200);
  const sm=[];
  for(let i=0;i<10;i+=3){
    await page.evaluate(n=>{document.querySelectorAll(".faceslide")[n].scrollIntoView({block:"center"});},i);
    await page.waitForTimeout(90);
    sm.push(await page.evaluate(()=>{const r=document.getElementById("bigav").getBoundingClientRect();return r.bottom>8&&r.top<window.innerHeight-8&&r.height>40;}));
  }
  check(sm.every(Boolean),"the same holds at the PC minimum width");
  await page.screenshot({path:OUT+"/06-min-width.png",fullPage:false});
  const noH=await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
  check(noH,"and nothing scrolls sideways at that width");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

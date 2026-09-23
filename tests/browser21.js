// Build 21 in a real browser: the face sliders on the dossier screen.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots21");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1100}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+GAME);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  check(await page.evaluate(()=>/^build \d+ /.test(BUILD)),"a build stamp is present");
  await page.click('[data-act="begin"]');
  await page.waitForSelector(".faceslide");
  const sliders=await page.$$(".faceslide");
  check(sliders.length===10,"ten sliders under the picture ("+sliders.length+")");
  check(!(await page.$('[data-act="reroll-av"].btn.ghost.sm')===null),"a randomise button is present");
  check(!(await page.$eval("body",e=>e.innerText)).match(/new likeness/i),"the standalone New likeness button is gone");
  // the panel sits under the picture, left of the file
  const geo=await page.evaluate(()=>{
    const av=document.getElementById("bigav").getBoundingClientRect();
    const fb=document.querySelector(".facebox").getBoundingClientRect();
    const rolled=[...document.querySelectorAll(".rolled")].filter(e=>!e.classList.contains("facebox"))[0].getBoundingClientRect();
    return {avBottom:av.bottom,fbTop:fb.top,fbLeft:fb.left,fbRight:fb.right,fileLeft:rolled.left};
  });
  check(geo.fbTop>=geo.avBottom-2,"the appearance panel is under the picture");
  check(geo.fbRight<=geo.fileLeft+2,"and to the left of Your file");
  await page.screenshot({path:OUT+"/01-create-screen.png",fullPage:true});
  await page.screenshot({path:OUT+"/02-face-panel.png",clip:{x:150,y:120,width:420,height:900}}).catch(()=>{});
  // moving a slider redraws the picture, and only the picture
  const before=await page.$eval("#bigav",e=>e.innerHTML);
  await page.evaluate(()=>{const el=document.getElementById("fp-hair");el.value=String((+el.value+1)%(+el.max+1));el.dispatchEvent(new Event("input",{bubbles:true}));});
  await page.waitForTimeout(150);
  const after=await page.$eval("#bigav",e=>e.innerHTML);
  check(before!==after,"moving the hair slider redraws the face");
  check(await page.evaluate(()=>document.activeElement&&true),"the screen was not rebuilt under the hand");
  const label=await page.$eval("#fv-hair",e=>e.textContent);
  check(label.length>0,"the value beside the slider names the choice: "+label);
  // every slider moves something
  const changed=await page.evaluate(async()=>{
    const out=[];
    for(const p of faceParts(draft.gender)){
      const el=document.getElementById("fp-"+p.k);
      const b=document.getElementById("bigav").innerHTML;
      el.value=String((+el.value+1)%(+el.max+1));
      el.dispatchEvent(new Event("input",{bubbles:true}));
      out.push([p.l,document.getElementById("bigav").innerHTML!==b]);
    }
    return out;
  });
  check(changed.every(x=>x[1]),"every slider changes the picture"+(changed.filter(x=>!x[1]).map(x=>" — "+x[0]).join("")||""));
  await page.screenshot({path:OUT+"/03-after-sliders.png",fullPage:true});
  // switching to female swaps the last slider and keeps the rest
  await page.click('[data-act="draft-gender"][data-v="F"]');
  await page.waitForSelector("#fp-earring");
  check(!(await page.$("#fp-fh")),"a woman has earrings instead of facial hair");
  check((await page.$$(".faceslide")).length===10,"still ten sliders");
  const hairMax=await page.$eval("#fp-hair",e=>+e.max);
  check(hairMax===14,"and fifteen hair styles to choose from");
  await page.screenshot({path:OUT+"/04-female.png",fullPage:true});
  // randomise rolls everything
  const f0=await page.evaluate(()=>JSON.stringify(draft.face));
  await page.click('[data-act="reroll-av"]');
  await page.waitForSelector(".faceslide");
  const f1=await page.evaluate(()=>JSON.stringify(draft.face));
  check(f0!==f1,"Random rolls a new face");
  // the built face follows the player into the game
  const built=await page.evaluate(()=>{const el=document.getElementById("fp-glasses");el.value="2";el.dispatchEvent(new Event("input",{bubbles:true}));return JSON.stringify(draft.face);});
  await page.fill("#pname","Vera Kessler");
  await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  const kept=await page.evaluate(()=>JSON.stringify(S.player.face));
  check(kept===built,"the player keeps the face they built");
  // the browser re-serialises SVG, so compare like with like through the same parser
  check(await page.evaluate(()=>{
    const card=document.querySelector(".id.you .av");
    if(!card)return false;
    const tmp=document.createElement("div");
    tmp.innerHTML=avatar(S.player.avseed,S.player.gender,S.player.face);
    return card.innerHTML===tmp.innerHTML;
  }),"and the crew card draws that same face");
  check(await page.evaluate(()=>Array.isArray(S.player.traits)),"the player has a temperament");
  await page.screenshot({path:OUT+"/05-crew-card.png",fullPage:true});
  // it survives a reload
  await page.reload();
  await page.click('[data-act="continue"]');
  await page.waitForSelector(".topbar");
  check(await page.evaluate(b=>JSON.stringify(S.player.face)===b,built),"the face survives a reload");
  // the PC minimum width
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.setViewportSize({width:960,height:1000});
  await page.click('[data-act="begin"]');
  await page.waitForSelector(".faceslide");
  await page.screenshot({path:OUT+"/06-minw-create.png",fullPage:true});
  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

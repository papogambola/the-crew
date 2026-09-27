// THE OFFICE IS A DRAWING WITH FIVE LIVE THINGS ON IT.
//
// The office used to be about two hundred SVG shapes — the window, the chair, the desk, the lamp,
// the door, every book on the shelf, the radio's case and every word on it — each filled white with
// an ink edge. Then it became a picture with the words still in code, sitting on little white
// plates. Now the words are in the pencil too, and what is left in officeSVG() is five controls:
//
//     the dot in the sound switch      SET.sound
//     the dot in the music switch      SET.music
//     the volume knob's pointer        SET.volume
//     the brightness handle            SET.bright
//     the line under the speaker       whether the radio is playing
//
// Every one of those sits ON TOP OF a drawn one. It covers its own patch of the picture and redraws
// it live. That arrangement has a failure mode with no symptom: a control that has stopped moving
// still looks perfect, because underneath it there is a drawing of a switch, a drawing of a knob
// and a drawing of a handle, all in plausible positions. Delete the dot and the switch still looks
// like a switch. Freeze the pointer and the knob still looks like a knob. Nothing 404s, nothing
// throws, nothing looks wrong in a screenshot — the office just quietly stops being a control panel
// and becomes a picture of one.
//
// So this file does not ask whether the office looks right. It changes each setting and demands the
// ink move, demands it move to where the drawing says that value is, and demands the covers stay
// inside the lines they are hiding. Nine of these numbers are measured off office/room.webp, and
// they are written down here so that a redraw which moves an object fails loudly rather than
// leaving a live pointer growing out of the side of a drawn rim.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),http=require("http"),fs=require("fs");
const PORT=Number(process.env.PORT||8963);
const T={".html":"text/html; charset=utf-8",".webp":"image/webp",".png":"image/png",".mp3":"audio/mpeg"};
/* Over HTTP, not file://, because the room is fetched relative to the page. */
const srv=http.createServer((q,r)=>{
  const f=path.join(ROOT,decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/,""));
  fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();
    r.writeHead(200,{"content-type":T[path.extname(f)]||"application/octet-stream"});r.end(b);});});

/* WHERE THE INK IS, in the drawing's own user units. Measured off office/room.webp by reading the
   pixels, not copied from the code that draws over it — that is the only way round which can catch
   the two disagreeing. */
const DRAWN={
  sound:{x1:218,x2:242,y1:587,y2:628},   // the sound switch's pill outline
  music:{x1:285,x2:307,y1:587,y2:627},   // the music switch's pill outline
  knob:{cx:371,cy:608,r:23},             // the volume knob's rim, ticks just outside it
  track:{x1:1036,x2:1170,y:473},         // the brightness slider's line
  radio:{x1:104,x2:199,y1:643,y2:657},   // the words RADIO OFF lettered on the panel
};

let ok=0,bad=0;
const check=(c,m)=>{ if(c){ok++;console.log("ok  "+m);} else {bad++;console.error("FAIL: "+m);} };
const near=(a,b,t)=>Math.abs(a-b)<=t;

async function openOffice(page){
  await page.evaluate(()=>{UI.office=true;render();});
  await page.waitForSelector(".office-svg",{timeout:8000});
}
/* The box of an element in the SVG's own user units — the same units the drawing is laid out in,
   so a number here is comparable with a number measured off the .webp. */
const boxOf=(page,sel)=>page.evaluate(s=>{
  const el=document.querySelector(s); if(!el)return null;
  const b=el.getBBox();
  return {x1:b.x,y1:b.y,x2:b.x+b.width,y2:b.y+b.height,cx:b.x+b.width/2,cy:b.y+b.height/2};
},sel);

(async()=>{
  await new Promise(r=>srv.listen(PORT,"127.0.0.1",r));
  const browser=await chromium.launch({executablePath:CHROME,
    args:(process.env.CHROME_ARGS||"").split(" ").filter(Boolean)});
  const page=await browser.newPage({viewport:{width:1400,height:1000}});
  const errs=[],missed=[];
  page.on("pageerror",e=>errs.push(String(e).split("\n")[0]));
  page.on("response",r=>{ if(r.status()>=400) missed.push(r.status()+" "+r.url().split("/").pop()); });
  await page.goto("http://127.0.0.1:"+PORT+"/"+path.relative(ROOT,GAME),{waitUntil:"load"});
  await page.click('[data-act="begin"]'); await page.fill("#pname","Sasha Varga");
  await page.click('[data-act="confirm-create"]'); await page.waitForSelector(".topbar");
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  for(let n=0;n<30;n++){
    const x=await page.$('button[data-act="crewname-later"]')||await page.$('.scrim button.x:not([disabled])');
    if(x){await x.click();await page.waitForTimeout(40);continue;}
    const q=await page.$$('.scrim .btn:not([disabled])');
    if(q.length){await q[q.length-1].click();await page.waitForTimeout(40);continue;}
    break;}
  await openOffice(page);
  await page.waitForTimeout(400);

  /* THE ROOM ITSELF. */
  const room=await page.evaluate(()=>{
    const i=document.querySelector(".office-svg image");
    return i?{href:i.getAttribute("href"),x:i.getAttribute("x"),y:i.getAttribute("y"),
      w:i.getAttribute("width"),h:i.getAttribute("height")}:null;});
  check(room,"the office is a picture"+(room?": "+room.href:""));
  check(room&&room.x==="0"&&room.y==="0"&&room.w==="1700"&&room.h==="900",
    "laid over the whole viewBox at 0,0,1700x900"+(room?" (got "+room.x+","+room.y+" "+room.w+"x"+room.h+")":""));
  const loaded=await page.evaluate(async s=>await new Promise(d=>{
    const i=new Image();i.onload=()=>d({w:i.naturalWidth,h:i.naturalHeight});i.onerror=()=>d(null);i.src=s;}),
    room?room.href:"");
  check(loaded&&loaded.w>0,"and it loads"+(loaded?" at "+loaded.w+"x"+loaded.h:""));
  check(loaded&&Math.abs(loaded.w/loaded.h-1700/900)<0.01,
    "in the viewBox's own shape, so nothing is stretched"
    +(loaded?" ("+(loaded.w/loaded.h).toFixed(3)+" against "+(1700/900).toFixed(3)+")":""));

  /* THE WORDS ARE IN THE PENCIL. Every label the code used to print — TUTORIAL, HANDBOOK, SOUND,
     MUSIC, VOLUME, ON, OFF, DISPLAY, LANGUAGE, CONTROLS, EXIT, FILES — is ink in the picture now, so
     the only <text> the office may ever contain is the radio's one live line. Asked in the state the
     drawing depicts, where even that is not printed: with the radio off the office must be pure
     pencil. A static label creeping back shows up here as a word on a white plate, which is the look
     this build exists to be rid of.

     Worth saying plainly, because the comment in play.html oversells it: during a game the radio is
     usually PLAYING, so the plate is usually up. The off state is the exception, not the rule. The
     conditional earns its keep by never covering the drawing with a plate that agrees with it —
     not by being rare. */
  await page.evaluate(()=>{SET.sound=false;render();});
  await page.waitForTimeout(80);
  const texts=await page.evaluate(()=>[...document.querySelectorAll(".office-svg text")].map(t=>t.textContent));
  check(texts.length===0,"with the radio off the office is pure pencil — the words are all in the drawing"
    +(texts.length?" — but found "+JSON.stringify(texts)+" printed over it":""));
  await page.evaluate(()=>{SET.sound=true;render();});
  await page.waitForTimeout(60);

  /* THE TWO SWITCHES. The dot must sit inside the drawn pill, and must be somewhere else when the
     setting is the other way. "Somewhere else" is the whole assertion: a dot that does not move is
     a switch that has stopped working and still looks like a switch. */
  for(const [name,act,key] of [["sound","off-sound","sound"],["music","off-music","music"]]){
    const d=DRAWN[name];
    const at=async v=>{
      await page.evaluate(([k,val])=>{SET[k]=val;render();},[key,v]);
      await page.waitForTimeout(60);
      return boxOf(page,'[data-act="'+act+'"] circle');
    };
    const on=await at(true), off=await at(false);
    check(on&&off,"the "+name+" switch has a dot in both states");
    if(on&&off){
      check(on.cy<off.cy-8,"and it is up for on, down for off ("+on.cy.toFixed(0)+" against "+off.cy.toFixed(0)+")");
      const inside=b=>b.x1>=d.x1&&b.x2<=d.x2&&b.y1>=d.y1&&b.y2<=d.y2;
      check(inside(on)&&inside(off),
        "and it stays inside the pill the artist drew at x "+d.x1+"–"+d.x2+", y "+d.y1+"–"+d.y2
        +" (on "+on.x1.toFixed(0)+","+on.y1.toFixed(0)+" to "+on.x2.toFixed(0)+","+on.y2.toFixed(0)+")");
      check(near(on.cx,(d.x1+d.x2)/2,3),"and on the pill's own centre line");
    }
  }

  /* CLICKING ONE ACTUALLY FLIPS IT. The loop the player is in: picture, hotspot, setting, picture. */
  await page.evaluate(()=>{SET.sound=true;render();});
  await page.waitForTimeout(60);
  const before=(await boxOf(page,'[data-act="off-sound"] circle')).cy;
  await page.click('[data-act="off-sound"]');
  await page.waitForTimeout(120);
  const after=(await boxOf(page,'[data-act="off-sound"] circle')).cy;
  const flipped=await page.evaluate(()=>SET.sound);
  check(flipped===false,"clicking the sound switch switches the sound off");
  check(after>before+8,"and the dot drops to OFF where the artist wrote it ("+before.toFixed(0)+" → "+after.toFixed(0)+")");
  await page.evaluate(()=>{SET.sound=true;SET.music=true;render();});

  /* THE VOLUME KNOB. The drawn rim carries nine ticks sweeping 270 degrees with the gap at the
     bottom, so the pointer at 0 points down-left, at half points straight up, and at full points
     down-right. It must also never poke out past the rim, which is what a pointer drawn too long
     or off-centre does — and which reads, unmistakably, as a bug. */
  const pointerAt=async v=>{
    await page.evaluate(x=>{SET.volume=x;render();},v);
    await page.waitForTimeout(60);
    return page.evaluate(()=>{
      const l=document.querySelector('#volKnob line'); if(!l)return null;
      return {x1:+l.getAttribute("x1"),y1:+l.getAttribute("y1"),x2:+l.getAttribute("x2"),y2:+l.getAttribute("y2")};
    });
  };
  const k=DRAWN.knob;
  const p0=await pointerAt(0), p5=await pointerAt(0.5), p1=await pointerAt(1);
  check(p0&&p5&&p1,"the volume knob has a pointer");
  if(p0&&p5&&p1){
    check(near(p0.x1,k.cx,3)&&near(p0.y1,k.cy,3),
      "growing from the centre of the drawn rim at "+k.cx+","+k.cy
      +" (got "+p0.x1.toFixed(0)+","+p0.y1.toFixed(0)+")");
    check(p0.x2<k.cx&&p0.y2>k.cy,"at nothing it points down-left, into the gap's left arm");
    check(near(p5.x2,k.cx,3)&&p5.y2<k.cy,"at half it points straight up");
    check(p1.x2>k.cx&&p1.y2>k.cy,"at full it points down-right");
    const far=Math.max(...[p0,p5,p1].map(p=>Math.hypot(p.x2-k.cx,p.y2-k.cy)));
    check(far<k.r-4,"and never reaches the rim it is drawn inside ("+far.toFixed(1)+" against "+k.r+")");
    const spread=[p0,p5,p1].map(p=>p.x2.toFixed(1)+","+p.y2.toFixed(1));
    check(new Set(spread).size===3,"three volumes, three angles — "+spread.join("  "));
  }

  /* THE BRIGHTNESS HANDLE. Two things: it slides along the DRAWN track rather than a track of its
     own, and it lands where the click landed. The second is the one worth a test — the handle and
     the click target were two different pairs of numbers, so the handle sat near your finger
     instead of under it, and the further along you clicked the further off it was. */
  const handleAt=async b=>{
    await page.evaluate(v=>{SET.bright=v;render();},b);
    await page.waitForTimeout(60);
    return boxOf(page,'[data-act="off-bright"] rect:not(.ns)');
  };
  const t=DRAWN.track;
  const hDim=await handleAt(55), hMid=await handleAt(77), hMax=await handleAt(100);
  check(hDim&&hMid&&hMax,"the brightness slider has a handle");
  if(hDim&&hMid&&hMax){
    check(hDim.cx<hMid.cx-20&&hMid.cx<hMax.cx-20,
      "which slides with the setting ("+[hDim,hMid,hMax].map(h=>h.cx.toFixed(0)).join(" → ")+")");
    check(near(hDim.cx,t.x1,4)&&near(hMax.cx,t.x2,4),
      "from one end of the drawn track to the other ("+t.x1+"–"+t.x2+")");
    check(hDim.y1>t.y-16&&hDim.y2<t.y+16,"sitting on the line, not above or below it");
  }
  /* And now the finger. Click a quarter of the way along and the handle must be a quarter of the
     way along, not merely somewhere to the left. */
  const trk=await page.evaluate(()=>{const r=document.getElementById("brightTrack").getBoundingClientRect();
    return {left:r.left,width:r.width};});
  for(const f of [0.25,0.75]){
    await page.mouse.click(trk.left+trk.width*f,await page.evaluate(()=>{
      const r=document.getElementById("brightTrack").getBoundingClientRect();return r.top+r.height/2;}));
    await page.waitForTimeout(120);
    const h=await boxOf(page,'[data-act="off-bright"] rect:not(.ns)');
    const want=t.x1+(t.x2-t.x1)*f;
    check(h&&near(h.cx,want,6),"clicking "+Math.round(f*100)+"% along puts the handle there"
      +(h?" (wanted "+want.toFixed(0)+", got "+h.cx.toFixed(0)+")":""));
  }
  await page.evaluate(()=>{setBright(100);});

  /* THE RADIO'S LINE. Off, the panel is left alone — the words are in the ink. On, a plate covers
     those words and the live line is printed in their place. The plate must cover ALL of them:
     leave a letter showing and the panel reads "♪ ON AIRF". */
  await page.evaluate(()=>{SET.sound=true;SET.music=true;musicWant="x";musicState="playing";render();});
  await page.waitForTimeout(80);
  const said=await page.evaluate(()=>{
    const t=document.querySelector(".office-svg text"); if(!t)return null;
    const b=t.getBBox(), p=t.previousElementSibling.getBBox();
    return {text:t.textContent,
      t:{x1:b.x,y1:b.y,x2:b.x+b.width,y2:b.y+b.height},
      p:{x1:p.x,y1:p.y,x2:p.x+p.width,y2:p.y+p.height}};});
  check(said,"with the radio playing the panel says so"+(said?": "+JSON.stringify(said.text):""));
  if(said){
    const d=DRAWN.radio;
    check(said.p.x1<=d.x1&&said.p.x2>=d.x2&&said.p.y1<=d.y1&&said.p.y2>=d.y2,
      "on a plate that covers every letter of the drawn RADIO OFF (x "+d.x1+"–"+d.x2+", y "+d.y1+"–"+d.y2
      +" under "+said.p.x1.toFixed(0)+"–"+said.p.x2.toFixed(0)+", "+said.p.y1.toFixed(0)+"–"+said.p.y2.toFixed(0)+")");
    check(said.t.x1>=said.p.x1&&said.t.x2<=said.p.x2&&said.t.y1>=said.p.y1-2&&said.t.y2<=said.p.y2+2,
      "and the words fit on the plate rather than running off it onto the panel");
  }
  /* The longest thing it can say, on a machine that never got IBM Plex Mono. A label that only just
     fits in the webfont is a label that runs off the plate in the fallback, and the game renders
     wherever it lands. */
  const wide=await page.evaluate(async()=>{
    SET.sound=true;SET.music=true;musicWant="x";musicState="blocked";render();
    await new Promise(r=>setTimeout(r,60));
    const t=document.querySelector(".office-svg text");
    const b=t.getBBox(), p=t.previousElementSibling.getBBox();
    return {text:t.textContent,w:b.width,plate:p.width,x1:b.x,x2:b.x+b.width,px1:p.x,px2:p.x+p.width};});
  check(wide.x1>=wide.px1&&wide.x2<=wide.px2,
    "the longest line it has — "+JSON.stringify(wide.text)+" at "+wide.w.toFixed(1)
    +" units — fits the "+wide.plate.toFixed(0)+"-unit plate");

  /* EVERY HOTSPOT IS ON THE PICTURE. A box that has drifted off the drawing is a click that does
     nothing, or worse, an object you can see and cannot press. */
  const hots=await page.evaluate(()=>[...document.querySelectorAll('.office-svg [data-act^="off-"]')].map(g=>{
    const b=g.getBBox();
    return {act:g.getAttribute("data-act"),x1:b.x,y1:b.y,x2:b.x+b.width,y2:b.y+b.height,
      w:b.width,h:b.height,title:!!g.querySelector("title")};}));
  check(hots.length>=11,hots.length+" things on the drawing can be pressed");
  const strays=hots.filter(h=>h.x1<0||h.y1<0||h.x2>1700||h.y2>900);
  check(strays.length===0,"and every one of them is inside the picture"
    +(strays.length?" — "+strays.map(s=>s.act).join(", "):""));
  const tiny=hots.filter(h=>h.w<40||h.h<40);
  check(tiny.length===0,"and none is too small to hit"
    +(tiny.length?" — "+tiny.map(s=>s.act+" "+s.w.toFixed(0)+"x"+s.h.toFixed(0)).join(", "):""));
  const mute=hots.filter(h=>!h.title);
  check(mute.length===0,"and every one says what it is on hover"
    +(mute.length?" — "+mute.map(s=>s.act).join(", "):""));

  check(missed.length===0,"nothing 404s"+(missed.length?" — "+missed.slice(0,3).join(", "):""));
  check(errs.length===0,"no page errors"+(errs.length?" — "+errs[0]:""));

  /* AND AGAIN ON A MACHINE THAT NEVER GOT IBM PLEX MONO. This is what tools/office-labels.js was
     for and it is why that tool is gone rather than merely unused: the office had one collision
     ever — VOLUME centred on its knob ran seven units through the tail of MUSIC — and the reason it
     survived so long is that it was in the coordinates, not the font, so it looked identical on
     every machine. The labels are ink now and cannot collide with anything. The radio's live line
     is the last piece of type in the room, it is centred on a plate 98 units wide, and the fallback
     monospace is wider than Plex. A line that only just fits in the webfont runs off the plate onto
     the drawn panel for everyone who never downloaded it, and the game renders wherever it lands. */
  const bare=await browser.newPage({viewport:{width:1400,height:1000}});
  await bare.route("**/*",r=>/fonts\.|\.woff|\.ttf|\.otf/i.test(r.request().url())?r.abort():r.continue());
  await bare.goto("http://127.0.0.1:"+PORT+"/"+path.relative(ROOT,GAME),{waitUntil:"load"});
  await bare.click(".burger");
  await bare.waitForSelector(".office-svg",{timeout:8000});
  const fallback=await bare.evaluate(async()=>{
    const seen=[];
    for(const st of ["playing","blocked","loading"]){
      SET.sound=true;SET.music=true;musicWant="x";musicState=st;render();
      await new Promise(r=>setTimeout(r,60));
      const t=document.querySelector(".office-svg text");
      if(!t){seen.push({st,missing:true});continue;}
      const b=t.getBBox(), p=t.previousElementSibling.getBBox();
      seen.push({st,text:t.textContent,x1:b.x,x2:b.x+b.width,px1:p.x,px2:p.x+p.width,
        font:getComputedStyle(t).fontFamily});
    }
    return seen;
  });
  const over=fallback.filter(f=>f.missing||f.x1<f.px1-0.5||f.x2>f.px2+0.5);
  check(over.length===0,"without the webfont every line the radio has still fits its plate"
    +(over.length?" — "+over.map(o=>JSON.stringify(o.text)+" runs "+(o.x2-o.px2).toFixed(1)+" units past it").join(", ")
      :" (widest "+Math.max(...fallback.map(f=>f.x2-f.x1)).toFixed(1)+" units of 98)"));
  await bare.close();

  await browser.close();srv.close();
  if(bad)console.error(bad+" FAILED");
  process.exit(bad?1:0);
})();

// THE FRONT PAGE IS A POSTER, AND THE BUTTON IN IT IS PAINTED.
//
// index.html used to open with a logo, a line-up of five generated faces, a rule, and a black
// PLAY NOW slab that was a real <a class="btn big">. It opens with one drawing now —
// poster/hero.webp — which has all four of those things IN it, including the button. So what you
// press is an anchor laid over the painted one, positioned in per cent of the picture.
//
// That arrangement has a failure with no symptom, and it is worse here than anywhere else in the
// game because this is the screen a stranger arrives at. If the anchor drifts off the painted
// button — a redraw that moves it, a percentage typed wrong, a stylesheet that stops positioning
// it — the page still looks perfect. There is a big black button that says PLAY NOW, and clicking
// it does nothing. Nobody who lands on it reports that, they just leave.
//
// So this does not ask whether there is a link. It finds the painted button IN THE PIXELS, at the
// size the page is actually rendering it, and demands the anchor be on top of it. The numbers are
// not written down here: they are read out of the drawing every run, so a redraw that moves the
// button is caught rather than baked in.
const {chromium,CHROME,ROOT}=require("./env.js");
const path=require("path"),http=require("http"),fs=require("fs");
const PORT=Number(process.env.PORT||8965);
const T={".html":"text/html; charset=utf-8",".webp":"image/webp",".png":"image/png",".mp3":"audio/mpeg",
  ".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".ico":"image/x-icon",".pdf":"application/pdf",
  ".zip":"application/zip",".txt":"text/plain; charset=utf-8",".json":"application/json"};
const srv=http.createServer((q,r)=>{
  const rel=decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/,"")||"index.html";
  const f=path.join(ROOT,rel);
  fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();
    r.writeHead(200,{"content-type":T[path.extname(f)]||"application/octet-stream"});r.end(b);});});

let ok=0,bad=0;
const check=(c,m)=>{ if(c){ok++;console.log("ok  "+m);} else {bad++;console.error("FAIL: "+m);} };

(async()=>{
  await new Promise(r=>srv.listen(PORT,"127.0.0.1",r));
  const base="http://127.0.0.1:"+PORT+"/index.html";
  const browser=await chromium.launch({executablePath:CHROME,
    args:(process.env.CHROME_ARGS||"").split(" ").filter(Boolean)});
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const errs=[],missed=[];
  page.on("pageerror",e=>errs.push(String(e).split("\n")[0]));
  page.on("response",r=>{ if(r.status()>=400) missed.push(r.status()+" "+r.url().split("/").pop()); });
  await page.goto(base,{waitUntil:"load"});
  await page.waitForTimeout(500);

  /* THE DRAWING. */
  const img=await page.evaluate(()=>{
    const i=document.querySelector(".poster img"); if(!i)return null;
    const r=i.getBoundingClientRect();
    return {src:i.getAttribute("src"),alt:i.getAttribute("alt")||"",
      nw:i.naturalWidth,nh:i.naturalHeight,
      x:r.x,y:r.y,w:r.width,h:r.height};});
  check(img,"the front page opens with a drawing"+(img?": "+img.src:""));
  check(img&&img.nw>0,"and it loads"+(img?" at "+img.nw+"x"+img.nh:""));
  check(img&&Math.abs(img.nw/img.nh-1)<0.01,"square, as drawn"
    +(img?" ("+(img.nw/img.nh).toFixed(3)+")":""));
  /* Cache-busted, because it is the file most likely to be redrawn and dropped in under the same
     name — and then served out of everybody's cache as whatever they saw last. tools/site.py
     writes the hash; this is what notices if it stops. */
  check(img&&/\?v=[0-9a-f]{6,}$/.test(img.src),"served with a hash of its own contents on it, so a "
    +"redraw actually reaches people"+(img?" ("+img.src.replace(/^.*\?/,"?")+")":""));
  /* The name is in the drawing's lettering, so the only text that can carry it to a search engine
     or a screen reader is the h1 and this alt. Both were checked by eye once; neither is visible,
     which is exactly why they need a test rather than a glance. */
  const h1=await page.evaluate(()=>{const h=document.querySelector("h1");
    return h?{text:h.textContent.trim(),shown:h.getBoundingClientRect().width>2}:null;});
  check(h1&&/^the crew$/i.test(h1.text),"the page still says its name where a machine can read it: "
    +(h1?JSON.stringify(h1.text):"no h1"));
  check(h1&&!h1.shown,"and does not print it over the drawing, which letters it already");
  check(img&&img.alt.length>40,"the drawing describes itself for anyone who cannot see it ("
    +(img?img.alt.length:0)+" characters)");

  /* THE PAINTED BUTTON, FOUND IN THE PIXELS. A solid dark slab in the bottom third: its edges run
     the full width of it, and the white letters break up the rows between, so rows are collected
     by their LONGEST unbroken dark run rather than by how much ink they hold. */
  const slab=await page.evaluate(async src=>{
    const im=await new Promise(d=>{const i=new Image();i.onload=()=>d(i);i.onerror=()=>d(null);i.src=src;});
    if(!im)return null;
    const cv=document.createElement("canvas");cv.width=im.naturalWidth;cv.height=im.naturalHeight;
    const cx=cv.getContext("2d");cx.drawImage(im,0,0);
    const d=cx.getImageData(0,Math.floor(cv.height*0.7),cv.width,Math.ceil(cv.height*0.3)).data;
    const W=cv.width, y0=Math.floor(cv.height*0.7);
    let top=1e9,bot=-1,left=1e9,right=-1;
    for(let row=0;row<Math.ceil(cv.height*0.3);row++){
      let best=0,bs=0,be=0,cur=-1;
      for(let x=0;x<W;x++){
        const i=(row*W+x)*4;
        const dark=(d[i]+d[i+1]+d[i+2])/3<70;
        if(dark){ if(cur<0)cur=x; }
        else if(cur>=0){ if(x-cur>best){best=x-cur;bs=cur;be=x-1;} cur=-1; }
      }
      if(cur>=0&&W-cur>best){best=W-cur;bs=cur;be=W-1;}
      if(best>=W*0.30){
        const y=y0+row;
        if(y<top)top=y; if(y>bot)bot=y;
        if(bs<left)left=bs; if(be>right)right=be;
      }
    }
    return bot<0?null:{left,top,right,bottom:bot,w:cv.width,h:cv.height};
  },img?img.src:"");
  check(slab,"the painted PLAY NOW is found in the drawing"
    +(slab?" at x "+slab.left+"–"+slab.right+", y "+slab.top+"–"+slab.bottom+" of "+slab.w:""));

  /* AND THE ANCHOR IS ON TOP OF IT. Compared in the DRAWING's own pixels, so the answer does not
     change with the window: the link's box on screen is divided back by the scale the image is
     rendered at. */
  const link=await page.evaluate(()=>{
    const a=document.querySelector(".poster-play"); if(!a)return null;
    const r=a.getBoundingClientRect(), i=document.querySelector(".poster img").getBoundingClientRect();
    return {tag:a.tagName,href:a.getAttribute("href"),text:a.textContent.trim(),
      x:r.x,y:r.y,w:r.width,h:r.height,ix:i.x,iy:i.y,iw:i.width};});
  check(link&&link.tag==="A"&&link.href==="play.html",
    "what you press is a real link to the game beside it"+(link?" ("+link.tag+" -> "+link.href+")":""));
  check(link&&/play now/i.test(link.text),
    "with real words on it for a screen reader: "+(link?JSON.stringify(link.text):"none"));
  if(slab&&link&&img){
    const s=img.nw/link.iw;                       // drawing pixels per screen pixel
    const L=(link.x-link.ix)*s, Tp=(link.y-link.iy)*s, R=L+link.w*s, B=Tp+link.h*s;
    const pad=14;                                 // the slab's edge is rough ink, not a crisp box
    const covers=L<=slab.left+pad&&R>=slab.right-pad&&Tp<=slab.top+pad&&B>=slab.bottom-pad;
    check(covers,"and it is laid over the painted one — link x "+L.toFixed(0)+"–"+R.toFixed(0)
      +", y "+Tp.toFixed(0)+"–"+B.toFixed(0)+" against ink x "+slab.left+"–"+slab.right
      +", y "+slab.top+"–"+slab.bottom);
    /* Not wildly bigger than what it is pretending to be, either: a link stretched over half the
       poster would pass the test above and swallow clicks meant for the drawing. */
    const over=((R-L)*(B-Tp))/((slab.right-slab.left)*(slab.bottom-slab.top));
    check(over<2.2,"and is the size of that button rather than a sheet over the poster ("
      +over.toFixed(2)+"x its area)");
  }

  /* IT IS ON THE SCREEN. A call to action you have to scroll to find is one most people never
     find. Checked on the two windows the game is actually opened in, and on a phone, where the
     page is read even though the game wants a desk. */
  for(const [w,h] of [[1440,900],[1280,720],[1366,768]]){
    const p=await browser.newPage({viewport:{width:w,height:h}});
    await p.goto(base,{waitUntil:"load"}); await p.waitForTimeout(250);
    const b=await p.evaluate(()=>{const r=document.querySelector(".poster-play").getBoundingClientRect();
      return {bottom:r.bottom,h:innerHeight};});
    check(b.bottom<=b.h,"the button is above the fold at "+w+"x"+h
      +" (foot at "+Math.round(b.bottom)+" of "+b.h+")");
    await p.close();
  }
  const ph=await browser.newPage({viewport:{width:390,height:844},isMobile:true});
  await ph.goto(base,{waitUntil:"load"}); await ph.waitForTimeout(250);
  const phone=await ph.evaluate(()=>{
    const r=document.querySelector(".poster-play").getBoundingClientRect();
    return {l:r.left,r:innerWidth-r.right,w:r.width,h:r.height,
      doc:document.documentElement.scrollWidth,win:innerWidth};});
  check(phone.doc<=phone.win+1,"no sideways scrolling at 390 ("+phone.doc+" ≤ "+phone.win+")");
  /* 24x24 CSS pixels is the smallest target WCAG will call a target at all. A button painted into
     a picture shrinks with the picture, which a real one does not, so this is the check the old
     black slab never needed. */
  check(phone.w>=24&&phone.h>=24,"and the button is still big enough to hit on a phone ("
    +Math.round(phone.w)+"x"+Math.round(phone.h)+")");
  await ph.close();

  /* AND IT ACTUALLY GOES THERE. */
  await page.click(".poster-play");
  await page.waitForLoadState("load");
  check(/play\.html$/.test(page.url().split("?")[0]),"pressing the painted button opens the game ("
    +page.url().split("/").pop()+")");
  const built=await page.evaluate(()=>typeof BUILD==="string"?BUILD:null);
  check(built&&/^build /.test(built),"and the game is running: "+built);

  check(missed.length===0,"nothing 404s"+(missed.length?" — "+missed.slice(0,3).join(", "):""));
  check(errs.length===0,"no page errors"+(errs.length?" — "+errs[0]:""));

  await browser.close();srv.close();
  if(bad)console.error(bad+" FAILED");
  process.exit(bad?1:0);
})();

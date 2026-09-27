// THE MAP, AND THE PINS LANDING WHERE THEY SHOULD.
//
// Nothing tested the map until build 131, which is why it is worth a file of its own now that the
// world under the pins has been replaced. The old map was 22 hand-traced polygons drawn by the same
// proj() that places the pins, so a projection mistake moved the coastline and the pin together and
// there was nothing to notice. The new map is a PICTURE: it cannot move with proj(), so if the two
// ever disagree the pins drift off their countries and the map looks broken in the one way a map is
// not allowed to look broken.
//
// So the check is not "is there a map" — it is "is the picture in the same projection as the
// arithmetic". It is asked of the pins, because that is what a player sees: a country with a
// posting has a lit mark, and that mark must sit where that country is.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),http=require("http"),fs=require("fs");
const PORT=Number(process.env.PORT||8961);
const T={".html":"text/html; charset=utf-8",".webp":"image/webp",".png":"image/png",".mp3":"audio/mpeg"};
/* Over HTTP, not file://, because the map is fetched relative to the page. */
const srv=http.createServer((q,r)=>{
  const f=path.join(ROOT,decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/,""));
  fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();
    r.writeHead(200,{"content-type":T[path.extname(f)]||"application/octet-stream"});r.end(b);});});

let ok=0,bad=0;
const check=(c,m)=>{ if(c){ok++;console.log("ok  "+m);} else {bad++;console.error("FAIL: "+m);} };

(async()=>{
  await new Promise(r=>srv.listen(PORT,"127.0.0.1",r));
  const browser=await chromium.launch({executablePath:CHROME});
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

  await page.evaluate(()=>{S.tab="jobs";S.jobOpen=null;render();});
  await page.waitForSelector(".map-svg",{timeout:10000});
  await page.waitForTimeout(800);

  const drawn=await page.evaluate(()=>{
    const img=document.querySelector(".map-svg image");
    return img?{href:img.getAttribute("href"),
      x:img.getAttribute("x"),y:img.getAttribute("y"),
      w:img.getAttribute("width"),h:img.getAttribute("height")}:null;
  });
  check(drawn,"the map is a picture"+(drawn?": "+drawn.href:""));
  /* 0,0,1000,500 is the WHOLE equirectangular sphere in the game's own units — 360 degrees across,
     180 down — which is what makes proj() and the picture the same projection. Any other box here
     and the pins are on a different world from the map. */
  check(drawn&&drawn.x==="0"&&drawn.y==="0"&&drawn.w==="1000"&&drawn.h==="500",
    "laid over the full sphere at 0,0,1000,500"+(drawn?" (got "+drawn.x+","+drawn.y+" "+drawn.w+"x"+drawn.h+")":""));
  const loaded=await page.evaluate(async src=>{
    const r=await new Promise(done=>{const im=new Image();im.onload=()=>done({w:im.naturalWidth,h:im.naturalHeight});
      im.onerror=()=>done(null);im.src=src;});
    return r;
  },drawn?drawn.href:"");
  check(loaded&&loaded.w>0,"and it loads"+(loaded?" at "+loaded.w+"x"+loaded.h:""));
  check(loaded&&Math.abs(loaded.w/loaded.h-2)<0.02,
    "at 2:1, which is what equirectangular is"+(loaded?" ("+(loaded.w/loaded.h).toFixed(3)+")":""));

  /* THE PINS. Every country the game knows has a point in GEO; the lit ones are the countries with
     postings. Each must sit where proj() says that lon/lat is — checked against the arithmetic done
     here rather than read back out of the same function, so a change to proj() cannot agree with
     itself. */
  const pins=await page.evaluate(()=>{
    const out=[];
    document.querySelectorAll(".map-svg .mk").forEach(g=>{
      const cn=g.getAttribute("data-cn");
      const t=(g.getAttribute("transform")||"").match(/translate\(([-\d.]+),([-\d.]+)\)/);
      if(cn&&t&&GEO[cn])out.push({cn,x:+t[1],y:+t[2],lat:GEO[cn][0],lon:GEO[cn][1]});
    });
    return out;
  });
  check(pins.length>0,pins.length+" countries are lit");
  const off=pins.filter(p=>{
    const ex=(p.lon+180)/360*1000, ey=(90-p.lat)/180*500;
    return Math.abs(p.x-ex)>0.6||Math.abs(p.y-ey)>0.6;
  });
  check(off.length===0,"and every pin sits where its lon/lat is on an equirectangular world"
    +(off.length?" — "+off.slice(0,3).map(p=>p.cn+" at "+p.x.toFixed(0)+","+p.y.toFixed(0)).join("; "):""));

  /* And the picture is the right way up and the right way round. A flipped or offset map would put
     every pin in the sea and pass every check above, because those only compare the pins with the
     arithmetic. This compares the PICTURE with the world: the ink at a point on land is darker than
     the ink in the middle of an ocean. */
  const probe=await page.evaluate(async src=>{
    const im=await new Promise(done=>{const i=new Image();i.onload=()=>done(i);i.onerror=()=>done(null);i.src=src;});
    if(!im)return null;
    const cv=document.createElement("canvas");cv.width=im.naturalWidth;cv.height=im.naturalHeight;
    const cx=cv.getContext("2d");cx.drawImage(im,0,0);
    const at=(lat,lon,r)=>{
      const x=Math.round((lon+180)/360*cv.width), y=Math.round((90-lat)/180*cv.height);
      const d=cx.getImageData(Math.max(0,x-r),Math.max(0,y-r),r*2,r*2).data;
      let s=0,n=0;for(let i=0;i<d.length;i+=4){s+=(d[i]+d[i+1]+d[i+2])/3;n++;}
      return s/n;
    };
    return {australia:at(-25,134,14), amazon:at(-5,-62,14), india:at(22,78,14),
            midPacific:at(-10,-150,14), southAtlantic:at(-35,-25,14)};
  },drawn?drawn.href:"");
  check(probe,"the picture can be read back");
  if(probe){
    const land=(probe.australia+probe.amazon+probe.india)/3;
    const sea=(probe.midPacific+probe.southAtlantic)/2;
    check(land<sea-12,"and land is inked where land is, ocean where ocean is"
      +" (land "+land.toFixed(0)+" vs open sea "+sea.toFixed(0)+")");
  }

  check(missed.length===0,"nothing 404s"+(missed.length?" — "+missed.slice(0,3).join(", "):""));
  check(errs.length===0,"no page errors"+(errs.length?" — "+errs[0]:""));

  await browser.close();srv.close();
  if(bad)console.error(bad+" FAILED");
  process.exit(bad?1:0);
})();

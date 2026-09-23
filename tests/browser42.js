// Builds 44–45: the title screen — the logo, five faces under it, the handbook, and the publisher.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs"),http=require("http");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots45");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
/* The server's root is the REPOSITORY, not this directory. The game asks for handbook.html and
   its sibling files by relative path, so they have to be served from where they actually sit
   beside it — and serving out of tests/ meant the very first request, for the game itself, came
   back 404. That is how this broke the day the suite moved into the repo, and it is worth saying
   in words rather than fixing silently: a served copy is a different question from a file:// one
   and this file exists to ask it. */
const TARGET=process.argv[2]?path.resolve(process.argv[2]):GAME;
const SERVE_ROOT=path.relative(ROOT,TARGET).startsWith("..")?path.dirname(TARGET):ROOT;
const SERVE=path.relative(SERVE_ROOT,TARGET);
const PORT=8915,MIME={".html":"text/html; charset=utf-8",".css":"text/css",".woff2":"font/woff2"};
// Anton and IBM Plex Mono come from a CDN this container cannot reach, and the whole point of
// this screen is how wide the logotype is — measuring a fallback face would be measuring the
// wrong thing. The handbook already keeps a local copy of exactly those files for the same
// reason, so this borrows it rather than carrying a second set of the same fonts.
const FONT_DIR=path.join(ROOT,"tools","handbook");
const srv=http.createServer((q,r)=>{
  const u=decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/,"");
  const f=path.join(/^fonts(-local\.css|\/)/.test(u)?FONT_DIR:SERVE_ROOT,u);
  fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(b);});});
const fonts=async p=>{await p.addStyleTag({url:"/fonts-local.css"});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(120);};
(async()=>{
  await new Promise(r=>srv.listen(PORT,"127.0.0.1",r));
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  const url="http://127.0.0.1:"+PORT+"/"+SERVE;
  await page.goto(url);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await fonts(page);

  // ---- the file says what encoding it is in, so · and → are not mojibake wherever it is served
  const cs=await page.evaluate(()=>document.characterSet);
  check(cs==="UTF-8","the page declares its encoding ("+cs+")");
  const arrow=await page.textContent('[data-act="begin"]');
  check(arrow.indexOf("→")>=0,"and the arrows come through: \""+arrow.trim()+"\"");

  // ---- the logo, in the middle, with the faces under it
  const logo=await page.$(".hero.title h1");
  check(!!logo,"the title screen leads with the game's logo");
  check((await page.textContent(".hero.title h1")).trim()==="The Crew","and it reads The Crew");
  const lb=await logo.boundingBox();
  const mid=Math.abs((lb.x+lb.width/2)-640);
  check(mid<8,"centred in the window (off by "+Math.round(mid)+"px)");
  // The size is the point of it: measure the ink, not the line box, against the column it sits in.
  const fill=await page.evaluate(()=>{
    const h=document.querySelector(".hero.title h1"), w=document.querySelector(".wrap");
    const r=document.createRange();r.selectNodeContents(h);
    const ink=r.getBoundingClientRect().width, col=w.getBoundingClientRect().width-32;
    return {ink:Math.round(ink),col:Math.round(col),pct:Math.round(ink/col*100),
            fs:Math.round(parseFloat(getComputedStyle(h).fontSize))};
  });
  check(fill.pct>=90&&fill.pct<=100,"and big: "+fill.fs+"px, "+fill.ink+"px of ink across a "+fill.col+"px column ("+fill.pct+"%)");

  const faces=await page.$$(".lineup .lu");
  check(faces.length===5,faces.length+" faces in the line-up");
  const fb=await (await page.$(".lineup")).boundingBox();
  check(fb.y>lb.y+lb.height-4,"the line-up is underneath the logo");
  const svgs=await page.$$eval(".lineup .lu-av svg",n=>n.length);
  check(svgs===5,"each one is a drawn face ("+svgs+" busts)");
  // The faces carry no labels: numbering a row of five portraits told the player nothing.
  const labels=await page.$$eval(".lineup .lu-n",n=>n.length);
  check(labels===0,"and nothing is labelled under them ("+labels+" labels)");
  const cap=(await page.textContent(".lineup-cap")).trim();
  check(/build your crew/i.test(cap)&&/choose your jobs/i.test(cap)&&/live with the consequences/i.test(cap),
    "the line under them says what you will be doing: \""+cap+"\"");
  check(!/every time you open the door|five places/i.test(cap),"and not what the screen does");
  // three clauses on one line: a wrapped strapline reads as two different thoughts
  // scrollWidth on a block is its container, so it can never report an overflow — measure the ink
  const capFit=await page.evaluate(()=>{
    const e=document.querySelector(".lineup-cap");
    const r=document.createRange();r.selectNodeContents(e);
    return {h:Math.round(e.getBoundingClientRect().height),
            line:Math.round(parseFloat(getComputedStyle(e).lineHeight)||14),
            ink:Math.round(r.getBoundingClientRect().width),
            box:Math.round(e.getBoundingClientRect().width)};});
  check(capFit.h<=capFit.line+2&&capFit.ink<capFit.box,
    "and sits on one line ("+capFit.ink+"px of ink in a "+capFit.box+"px column)");
  // five different people, not the same face five times
  const uniq=await page.$$eval(".lineup .lu-av",n=>new Set(n.map(e=>e.innerHTML)).size);
  check(uniq===5,"and five different people, not one repeated");

  const first=await page.$eval(".lineup",e=>e.innerHTML);
  await page.screenshot({path:path.join(OUT,"title.png"),fullPage:true});

  // ---- a different five every time the door opens
  const p2=await browser.newPage({viewport:{width:1280,height:1000}});
  await p2.goto(url);
  await fonts(p2);
  const second=await p2.$eval(".lineup",e=>e.innerHTML);
  check(first!==second,"a fresh load draws a different five");
  await p2.close();

  // ---- and again on the way back from the dossier screen
  await page.click('[data-act="begin"]');
  await page.waitForSelector("#pname");
  await page.click('[data-act="to-title"]');
  await page.waitForSelector(".lineup");
  await fonts(page);
  const third=await page.$eval(".lineup",e=>e.innerHTML);
  check(third!==first,"coming back from the dossier screen draws another five");

  // ---- the handbook, from the title screen
  const hb=await page.$('.filecard [data-act="off-handbook"]');
  check(!!hb,"the title screen offers the handbook");
  check(/handbook/i.test(await page.textContent('.filecard [data-act="off-handbook"]')),
    "in words: \""+(await page.textContent('.filecard [data-act="off-handbook"]')).trim()+"\"");
  const before=page.url();
  const [pop]=await Promise.all([page.context().waitForEvent("page"),hb.click()]);
  check(pop.url().indexOf("handbook.html")>=0,"and it opens the handbook in a new tab");
  check(page.url()===before,"leaving the title screen where it was");
  await pop.close();

  // ---- the year, and whose game it is
  // we, not you
  const tag=(await page.textContent(".hero.title .tagline")).trim();
  check(/We are the criminals/.test(tag),"the tagline speaks for the crew: \""+tag.slice(0,60)+"…\"");
  check(!/You are the criminals/.test(tag),"and never at the player");
  const screen=await page.$eval("body",e=>e.innerText);
  check(!/\b(6,000|5,000|five thousand|thousand files)\b/i.test(screen),
    "the door does not open with a head count");

  const foot=await page.textContent(".titlefoot");
  check(/2026/.test(foot)&&/Shhh Games/i.test(foot),"the foot reads: \""+(await page.textContent(".titlefoot .year")).trim()+"\"");
  const yb=await (await page.$(".titlefoot")).boundingBox();
  const cb=await (await page.$(".filecard")).boundingBox();
  check(yb.y>cb.y+cb.height,"and it is at the bottom, under the dossier card");

  // ---- the icon in the tab is one of the crew, drawn by the game's own hand
  const fav=await page.evaluate(async()=>{
    const l=document.querySelector('link[rel="icon"]');
    if(!l)return {ok:false,why:"no <link rel=icon>"};
    const href=l.href;
    let svg="";
    try{svg=href.indexOf(";base64,")>0?atob(href.split(";base64,")[1]):decodeURIComponent(href.split(",")[1]);}
    catch(e){return {ok:false,why:"the href does not decode: "+e.message};}
    // draw it the size a browser draws a tab icon, and count the ink
    const px=32;
    const img=new Image();
    const drawn=await new Promise(res=>{img.onload=()=>res(true);img.onerror=()=>res(false);img.src=href;});
    if(!drawn)return {ok:false,why:"the browser would not load it",svg:svg.length};
    const c=document.createElement("canvas");c.width=c.height=px;
    const x=c.getContext("2d");x.drawImage(img,0,0,px,px);
    const d=x.getImageData(0,0,px,px).data;
    let dark=0;
    for(let i=0;i<d.length;i+=4)if(d[i]<110&&d[i+3]>200)dark++;
    return {ok:true,len:href.length,svg:svg.length,type:href.slice(5,href.indexOf(";")),
            paths:(svg.match(/<(path|ellipse|rect|circle|polygon|polyline)/g)||[]).length,
            ink:Math.round(dark/(px*px)*100)};
  });
  check(fav.ok,"the tab carries an icon"+(fav.ok?"":": "+fav.why));
  if(fav.ok){
    check(fav.type==="image/svg+xml","drawn, not pasted — it is an SVG ("+fav.type+", "+fav.svg+" bytes)");
    check(fav.paths>=12,"with a face's worth of shapes in it ("+fav.paths+")");
    // a solid square and a blank one both "render"; a face is neither
    check(fav.ink>=14&&fav.ink<=70,"and at 32px it is a figure, not a blob or a blank ("+fav.ink+"% ink)");
  }

  // ---- the publisher's mark, as ink rather than a picture
  const marks=await page.$$eval(".shhh svg",n=>n.map(e=>({
    cls:e.getAttribute("class"),
    label:e.getAttribute("aria-label"),
    d:(e.querySelector("path")||{}).getAttribute?e.querySelector("path").getAttribute("d").length:0,
    h:Math.round(e.getBoundingClientRect().height),
    w:Math.round(e.getBoundingClientRect().width),
  })));
  check(marks.length===2,"the Shhh Games logo is on the screen — "+marks.length+" pieces");
  check(marks.every(m=>m.label==="Shhh Games"),"both name themselves to a screen reader");
  check(marks.every(m=>m.d>1000),"drawn as paths, not pasted as a picture ("
    +marks.map(m=>m.d).join(" + ")+" chars of outline)");
  check(marks.every(m=>m.h>20&&m.w>20),"and big enough to read ("
    +marks.map(m=>m.w+"×"+m.h).join(", ")+")");
  const inkFill=await page.$eval(".shhh svg",e=>getComputedStyle(e).fill);
  check(/rgb\(17, 16, 16\)/.test(inkFill),"in the game's ink, so it dims with the paper ("+inkFill+")");

  // ---- and it cannot run off the page on a machine where Anton never loads
  await page.goto(url);
  await page.addStyleTag({content:".hero.title h1{font-family:Georgia,serif;font-size:520px}"});
  await page.evaluate(()=>render());
  await page.waitForTimeout(150);
  const wide=await page.evaluate(()=>{
    const h=document.querySelector(".hero.title h1"), w=document.querySelector(".wrap");
    const r=document.createRange();r.selectNodeContents(h);
    return {ink:Math.round(r.getBoundingClientRect().width),col:Math.round(w.getBoundingClientRect().width-32),
            fs:Math.round(parseFloat(getComputedStyle(h).fontSize))};
  });
  check(wide.ink<=wide.col,"a fallback face the logotype was never sized for is brought down to fit: "
    +wide.fs+"px, "+wide.ink+"px in a "+wide.col+"px column");

  // ---- the game itself still starts
  await page.click('[data-act="begin"]');
  await page.fill("#pname","Paz");
  await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  check(await page.evaluate(()=>!!S&&S.tab==="crew"),"and a new game still opens on Crew");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();srv.close();
})();

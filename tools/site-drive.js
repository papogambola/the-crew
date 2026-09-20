/* Drives the download page in a real browser, the way hb-drive.js drives the handbook.

       node tools/site-drive.js

   A download page is almost all promises about files that live next to it — a zip, a handbook, a
   PDF, four screenshots, the game itself. Every one of those is a path that a rename somewhere
   else can quietly break, and a broken one does not look broken: it looks like the product is
   broken. So the page is served over http out of the repository root, exactly as Pages serves
   it, and then every link and every image is followed to see that something is actually there.

   It also looks at the page at 390px, because the link gets opened on a phone whether or not the
   game runs on one, and a download page that needs sideways scrolling to find its own button has
   already lost the download.

   Needs Playwright and the handbook tooling's Chromium. */
const {chromium}=require("/opt/node22/lib/node_modules/playwright");
const http=require("http"),fs=require("fs"),path=require("path"),url=require("url"),os=require("os");
const {execFileSync}=require("child_process");

const ROOT=path.join(__dirname,"..");
const CHROME="/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
// Not into shots/: that directory is published, and a drive's working pictures are not.
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),"crew-site-"));
const TYPES={".html":"text/html",".png":"image/png",".zip":"application/zip",".pdf":"application/pdf",
  ".txt":"text/plain",".json":"application/json",".mp3":"audio/mpeg",".js":"text/javascript"};

let fails=0;
const ok=(c,m)=>{if(c)console.log("ok   "+m);else{console.error("FAIL "+m);fails++;}};

const server=http.createServer((rq,rs)=>{
  let p=decodeURIComponent(url.parse(rq.url).pathname);
  if(p.endsWith("/"))p+="index.html";
  const f=path.join(ROOT,p);
  if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){rs.writeHead(404);return rs.end("no");}
  rs.writeHead(200,{"content-type":TYPES[path.extname(f)]||"application/octet-stream"});
  fs.createReadStream(f).pipe(rs);
});

(async()=>{
  await new Promise(r=>server.listen(0,"127.0.0.1",r));
  const base="http://127.0.0.1:"+server.address().port+"/";
  const browser=await chromium.launch({executablePath:CHROME});

  const errors=[],missing=[];
  /* The typefaces come from Google's CDN, the same way the game gets them. Whether that CDN is
     reachable from wherever this is being run is not something the page can be blamed for, and
     it is not what any of this is measuring — the page is laid out in ems and falls back to
     Georgia and Impact. So the fonts are noise here; everything served from under the test
     server is not. */
  const noise=t=>/fonts\.(googleapis|gstatic)\.com/.test(t)||/ERR_CERT/.test(t);
  const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:2});
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("console",m=>{const t=m.text()+" "+((m.location()||{}).url||"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  page.on("response",r=>{if(r.status()>=400&&r.url().startsWith(base))missing.push(r.status()+" "+r.url().slice(base.length));});

  await page.goto(base,{waitUntil:"networkidle"});

  console.log("— the page itself —");
  ok(errors.length===0,"no script errors on the page"+(errors[0]?" ("+errors[0]+")":""));
  ok((await page.title()).indexOf("The Crew")===0,"the tab says The Crew: \""+await page.title()+"\"");
  ok(/^THE CREW$/i.test((await page.textContent("h1")).trim()),"the masthead is the game's name");

  const tag=(await page.textContent(".hero .tag")).replace(/\s+/g," ").trim();
  ok(/Build a crew you trust/.test(tag)&&/consequences\.?$/.test(tag),"the tagline is whole: \""+tag+"\"");

  console.log("\n— the button, and what it claims —");
  const dl=await page.$eval('.hero a.btn.big',a=>({href:a.getAttribute("href"),text:a.innerText.trim(),dl:a.hasAttribute("download")}));
  ok(/download for windows/i.test(dl.text),"the button says what it does: \""+dl.text+"\"");
  ok(dl.href==="desktop/The-Crew-Windows.zip","and points at the zip, relatively — so it works on "
    +"the domain, on github.io and on disk ('"+dl.href+"')");
  ok(dl.dl,"with a download attribute, so the browser saves it rather than reasoning about it");

  /* The build the page names is the build of the zip, read out of the game packed inside it —
     NOT the build of play.html beside it. Those are usually the same number and were assumed to
     be, until a web-only fix moved the site to 92 with no Windows toolchain to repack 91 with,
     and reading play.html would have had the download page advertising a build nobody could
     download. Read from where the truth is, which is the file being offered. */
  const ZIP=path.join(ROOT,"desktop","The-Crew-Windows.zip");
  const zipBuild=execFileSync("python3",["-c",`
import re,sys,zipfile
with zipfile.ZipFile(sys.argv[1]) as z:
    neu=next(i for i in z.infolist() if i.filename.endswith("resources.neu"))
    print(re.search(rb'const BUILD="([^"]+)"',z.read(neu)).group(1).decode())
`,ZIP],{encoding:"utf8"}).trim();
  const webBuild=(fs.readFileSync(path.join(ROOT,"play.html"),"utf8").match(/const BUILD="([^"]+)"/)||[])[1];
  const zipMB=(fs.statSync(ZIP).size/1048576).toFixed(1)+" MB";
  const facts=(await page.textContent(".facts")).replace(/\s+/g," ").trim();
  ok(facts.includes(zipBuild),"the version line names the build inside the zip ("+zipBuild+")");
  ok(facts.toUpperCase().includes(zipMB.toUpperCase()),"and the size the zip actually is ("+zipMB+")");
  ok(/Windows 10 \/ 11/.test(facts),"and which Windows: \""+facts+"\"");
  if(zipBuild!==webBuild)
    console.log("     (the site is on "+webBuild+" and the download on "+zipBuild+" — that is allowed, "
      +"and version.txt below is what decides whether anybody is told about it)");

  /* The one that must never drift: version.txt is what a packed copy asks the site in order to
     find out it is behind. If it runs ahead of the zip, every exe in the world is told a newer
     build exists and handed the one it already has. */
  const vtxt=fs.readFileSync(path.join(ROOT,"version.txt"),"utf8").trim();
  ok(vtxt===zipBuild,"version.txt names the build people can actually download ('"+vtxt+"')");

  const icoPage=await page.$eval('link[rel="icon"]',l=>l.getAttribute("href"));
  const icoGame=(fs.readFileSync(path.join(ROOT,"play.html"),"utf8").match(/<link rel="icon" href="([^"]+)">/)||[])[1];
  ok(icoPage===icoGame,"the tab icon is the game's own face, not a second drawing of it");

  console.log("\n— the four screens —");
  /* They are loading="lazy", which is the right thing for half a megabyte of PNG below the fold
     and means two of them have deliberately not loaded yet. Walk down the page first: that both
     makes the measurement meaningful and checks that lazy actually un-lazies. */
  for(const f of await page.$$("figure")){await f.scrollIntoViewIfNeeded();await page.waitForTimeout(120);}
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.waitForTimeout(200);
  const figs=await page.$$eval("figure",fs_=>fs_.map(f=>{
    const i=f.querySelector("img"),c=f.querySelector("figcaption");
    return {src:i&&i.getAttribute("src"),w:i?i.naturalWidth:0,alt:(i&&i.getAttribute("alt")||"").length,
      cap:(c&&c.innerText||"").replace(/\s+/g," ").trim()};}));
  ok(figs.length===4,"four of them: "+figs.length);
  figs.forEach(f=>{
    ok(f.w>0,"  "+f.src+" loaded ("+f.w+"px wide)");
    ok(f.alt>60,"  "+f.src+" describes itself for a reader who cannot see it ("+f.alt+" chars)");
    ok(f.cap.length>30,"  "+f.src+" has a caption: \""+f.cap.slice(0,54)+"…\"");
  });

  console.log("\n— every link goes somewhere —");
  const hrefs=await page.$$eval("a[href]",as=>as.map(a=>a.getAttribute("href")));
  const local=[...new Set(hrefs.filter(h=>h&&!/^(https?:|mailto:|#)/.test(h)))];
  ok(local.length>0,"there are "+local.length+" links to files beside the page");
  for(const h of local)
    ok(fs.existsSync(path.join(ROOT,h)),"  "+h+" exists");
  ok(local.includes("play.html"),"the browser version is offered too, at play.html");
  ok(local.includes("handbook.html"),"and the handbook");

  const mail=hrefs.filter(h=>/^mailto:/.test(h));
  ok(mail.length===1,"one address to write to: "+mail.join(", "));

  console.log("\n— the shape of it —");
  const wide=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,win:innerWidth}));
  ok(wide.doc<=wide.win,"nothing hangs off the side at 1280 ("+wide.doc+" ≤ "+wide.win+")");

  /* .wrap sets the side gutters and `section`/.hero set the vertical rhythm, and both did it
     with the `padding` shorthand, so they ate each other: the sections lost their 66px top and
     bottom to .wrap's higher-specificity `padding:0 20px`, and .hero — later in the file — won
     the shorthand back and took the gutters with it, running edge to edge on a phone. Neither
     looked broken enough to notice by eye. Measured, not looked at. */
  const pad=await page.evaluate(()=>{
    const side=[...document.querySelectorAll(".wrap")].map(e=>{
      const c=getComputedStyle(e);
      return {who:e.className,l:parseFloat(c.paddingLeft),r:parseFloat(c.paddingRight)};});
    const air=[...document.querySelectorAll("section")].map(e=>{
      const c=getComputedStyle(e);return Math.min(parseFloat(c.paddingTop),parseFloat(c.paddingBottom));});
    const worst=side.reduce((a,b)=>Math.min(a.l,a.r)<=Math.min(b.l,b.r)?a:b);
    return {worst,air:Math.min(...air)};});
  ok(pad.air>=40,"every section keeps its air (thinnest is "+pad.air+"px)");
  ok(Math.min(pad.worst.l,pad.worst.r)>=16,"and every .wrap keeps its side gutters (thinnest is \""
    +pad.worst.who+"\" at "+pad.worst.l+"/"+pad.worst.r+"px)");
  await page.screenshot({path:path.join(TMP,"desktop.png"),fullPage:false});

  // Above the fold, on the laptop the game is aimed at: the name, the promise, and the button.
  const foldBtn=await page.$eval(".hero a.btn.big",a=>a.getBoundingClientRect().bottom);
  ok(foldBtn<900,"the download button is above the fold on a 900px window (bottom at "+Math.round(foldBtn)+")");

  console.log("\n— on a phone, which is where the link gets opened —");
  const ph=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true});
  await ph.goto(base,{waitUntil:"networkidle"});
  const phw=await ph.evaluate(()=>({doc:document.documentElement.scrollWidth,win:innerWidth}));
  ok(phw.doc<=phw.win+1,"no sideways scrolling at 390 ("+phw.doc+" ≤ "+phw.win+")");
  const gut=await ph.evaluate(()=>{
    const b=document.querySelector(".hero a.btn.big").getBoundingClientRect();
    return {l:Math.round(b.left),r:Math.round(innerWidth-b.right)};});
  ok(gut.l>=16&&gut.r>=16,"the download button is not jammed against the glass ("+gut.l+"px / "+gut.r+"px)");
  const note=await ph.$eval(".phoneonly",e=>({shown:getComputedStyle(e).display!=="none",t:e.innerText.replace(/\s+/g," ").trim()}));
  ok(note.shown,"it says so, rather than letting somebody tap a Windows zip on a phone: \""+note.t+"\"");
  const deskNote=await page.$eval(".phoneonly",e=>getComputedStyle(e).display);
  ok(deskNote==="none","and does not say it on a PC, where it would be nonsense");
  await ph.screenshot({path:path.join(TMP,"phone.png"),fullPage:false});

  /* ---------------------------------------------------------------------------------------
     The game and the handbook link to each other, and each decides between the file beside it
     and an absolute claude.ai address by looking at location.hostname. That decision used to be
     a list of the hosts we knew about — github.io, localhost, 127.0.0.1 — and the day the site
     moved to playthecrew.com both links started sending people to claude.ai. The old github.io
     address did it too: it redirects to the new one, so the hostname this reads is the new one
     there as well. Every check that existed ran on a listed host, which is why none of them saw
     it; the static href in the file was right the whole time and the running page was not.

     So this serves the real files under real hostnames and reads what the running page decided.
     Two ordinary hosts, one of them invented, because a fix that only knows about
     playthecrew.com is the same bug with today's date on it. */
  console.log("\n— where the two pages think each other are —");
  const atHost=async(origin,what)=>{
    const ctx=await browser.newContext({viewport:{width:1100,height:800}});
    const pg=await ctx.newPage();
    await pg.route("**/*",route=>{
      const u=new URL(route.request().url());
      if(u.origin!==origin)return route.continue();
      const f=path.join(ROOT,decodeURIComponent(u.pathname).replace(/^\/+/,"")||"index.html");
      if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())
        return route.fulfill({status:404,body:"no"});
      route.fulfill({status:200,headers:{"content-type":TYPES[path.extname(f)]||"application/octet-stream"},
        body:fs.readFileSync(f)});
    });
    await pg.goto(origin+"/play.html",{waitUntil:"domcontentloaded"});
    await pg.waitForSelector('[data-act="begin"]',{timeout:60000});
    const g2h=await pg.evaluate(()=>handbookHref());
    await pg.goto(origin+"/handbook.html",{waitUntil:"domcontentloaded"});
    await pg.waitForSelector("#back",{state:"attached",timeout:60000});
    await pg.waitForTimeout(600);
    const h2g=await pg.$eval("#back",a=>a.getAttribute("href"));
    await ctx.close();
    return {g2h,h2g,what};
  };

  for(const origin of ["https://playthecrew.com","https://some-address-nobody-listed.example"]){
    const r=await atHost(origin,origin);
    ok(r.g2h==="handbook.html","at "+origin+" the game reaches the handbook beside it ('"+r.g2h+"')");
    ok(r.h2g==="play.html","at "+origin+" the handbook reaches the game beside it ('"+r.h2g+"')");
  }
  // ...and the one place where there is nothing beside them still gets the absolute address.
  const art=await atHost("https://claude.site","artifact");
  ok(/^https:\/\/claude\.ai\/artifact\//.test(art.g2h),"on an artifact origin the game still "
    +"gives the handbook's own address ('"+art.g2h+"')");
  ok(/^https:\/\/claude\.ai\/artifact\//.test(art.h2g),"and the handbook the game's ('"+art.h2g+"')");

  ok(missing.length===0,"nothing 404'd while the page loaded"+(missing.length?": "+missing.join(", "):""));

  await browser.close();server.close();
  console.log("\npictures in "+TMP);
  console.log(fails?fails+" FAILED":"all good");
  process.exitCode=fails?1:0;
})();

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
  ok(/play now/i.test(dl.text),"the button says what it does: \""+dl.text+"\"");
  ok(dl.href==="play.html","and points at the game beside it, relatively — so it works on the "
    +"domain, on github.io and on disk ('"+dl.href+"')");
  ok(!dl.dl,"and does NOT carry a download attribute, which would save the page instead of opening it");
  ok(fs.existsSync(path.join(ROOT,"play.html")),"and the game is actually there to open");

  /* The page stopped selling the Windows build, so it no longer names a size and no longer
     names Windows. What it still names is a build, and that number has to be the build of the
     thing the button opens — which is now play.html beside it, not the zip. It was the zip's
     for as long as the zip was what the button handed you, and reading the wrong one of those
     two was a real bug once: a web-only fix moved the site to 92 with no Windows toolchain to
     repack 91, and the page advertised a build nobody could download. Same rule, new subject. */
  const webBuild=(fs.readFileSync(path.join(ROOT,"play.html"),"utf8").match(/const BUILD="([^"]+)"/)||[])[1];
  const facts=(await page.textContent(".facts")).replace(/\s+/g," ").trim();
  const bNum=(webBuild.match(/build\s+\d+/i)||[])[0];
  const bWhen=(webBuild.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/)||[])[0];
  ok(!!bNum&&facts.toLowerCase().includes(bNum.toLowerCase()),
    "the version line names the build you would be playing ("+bNum+")");
  ok(!!bWhen&&facts.toUpperCase().includes(bWhen.toUpperCase()),"and when it is from ("+bWhen+")");
  ok(!/\d{1,2}\s+(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)/i.test(facts),
    "and no day of the month, which is a date nobody is going to act on: \""+facts+"\"");
  ok(/macos/i.test(facts)&&/linux/i.test(facts)&&/windows/i.test(facts),
    "and all three platforms, which is the point of moving: \""+facts+"\"");
  ok(!/\bMB\b/i.test(facts),"and no download size, because there is no download");

  console.log("\n— and nothing still sells the zip —");
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
  ok(!/The-Crew-Windows\.zip/.test(html),"no link to the zip anywhere on the page");
  ok(!/SmartScreen|isn.t commonly downloaded|Run anyway/i.test(html),
    "and none of the warnings copy that only a download needed");

  /* The zip is still BUILT and still PUBLISHED even though nothing points at it: every exe
     already on somebody's machine reads version.txt and links to that file, and pulling it
     would break exactly the players who can do least about it. */
  const ZIP=path.join(ROOT,"desktop","The-Crew-Windows.zip");
  ok(fs.existsSync(ZIP),"the zip is still there for the copies already installed");
  const zipBuild=execFileSync("python3",["-c",`
import re,sys,zipfile
with zipfile.ZipFile(sys.argv[1]) as z:
    neu=next(i for i in z.infolist() if i.filename.endswith("resources.neu"))
    print(re.search(rb'const BUILD="([^"]+)"',z.read(neu)).group(1).decode())
`,ZIP],{encoding:"utf8"}).trim();

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
  /* The page offers one thing, and it is now the game itself. It offered the Windows download
     for as long as that was the product; the download is what produced every problem the game
     never had — two destroyed saves, a silent build, and a warning in front of the file at both
     ends. The zip is still built and still served for the copies already installed, which is
     why this checks the page and not the folder.

     The handbook stays off the page for the reason it always was: it hands over the whole thing
     as a web page and argues against pressing the button. The game reaches it on key 5.

     Asserted as an absence as well as a presence, because "we took the links out" and "the
     links are out" are not the same claim. */
  ok(local.length===1&&local[0]==="play.html",
    "the only thing the page offers is the game itself: "+JSON.stringify(local));
  ok(!local.some(h=>/\.zip$/i.test(h)),"  no download, which is the change");
  ok(!local.includes("handbook.html")&&!local.includes("The-Crew-Handbook.pdf"),
    "  and not the handbook, in either form");

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
     Three hosts: the real one, an invented one, and claude.site — which used to be the one
     exception, the artifact origin that got an absolute address because it had no game beside
     it. Those artifacts are finished and the exception is gone, so it is tested here as an
     ordinary host like the others, which is the whole point: there is no host left that gets a
     different answer. A fix that only knows about playthecrew.com is the same bug with today's
     date on it. */
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

  for(const origin of ["https://playthecrew.com","https://some-address-nobody-listed.example",
                       "https://claude.site"]){
    const r=await atHost(origin,origin);
    ok(r.g2h==="handbook.html","at "+origin+" the game reaches the handbook beside it ('"+r.g2h+"')");
    ok(r.h2g==="play.html","at "+origin+" the handbook reaches the game beside it ('"+r.h2g+"')");
  }
  /* ---------------------------------------------------------------------------------------
     The music has its own address now. 54MB of mp3 against a 1.4MB download is ninety-seven per
     cent of this site's bandwidth, and Pages' soft cap is 100GB a month — about eighteen hundred
     players on the music, against sixty-six thousand on the game. So the tunes go to object
     storage and the site keeps serving what is small.

     The thing that can go wrong is doing it by moving MEDIA_BASE, which would take version.txt
     and the zip link with it and point the "a newer build is out" check at a bucket. So: two
     bases, and this checks they actually come apart. */
  console.log("\n— the music and the site are two addresses —");
  {
    const ctx=await browser.newContext({viewport:{width:1100,height:800}});
    await ctx.addInitScript(()=>{
      window.THE_CREW_MEDIA="https://site.example/";
      window.THE_CREW_MUSIC="https://tunes.example/";});
    const pg=await ctx.newPage();
    await pg.goto("file://"+path.join(ROOT,"play.html"));
    await pg.waitForSelector('[data-act="begin"]',{timeout:60000});
    const w=await pg.evaluate(()=>({
      siren:musicURL("music/siren.mp3"), amb:musicURL(TRACKS.ambient),
      already:musicURL("https://elsewhere.example/x.mp3"),
      media:MEDIA_BASE, music:MUSIC_BASE, key:TRACKS.ambient}));
    ok(w.siren==="https://tunes.example/music/siren.mp3","a tune resolves to the music address ('"+w.siren+"')");
    ok(w.amb.indexOf("https://tunes.example/")===0,"and so does every track in the pools ('"+w.amb+"')");
    ok(w.key==="music/ambient.mp3","while the stored path stays relative — it is the key the "
      +"music system compares against, not an address ('"+w.key+"')");
    ok(w.already==="https://elsewhere.example/x.mp3","an address that is already an address is left alone");
    ok(w.media==="https://site.example/","version.txt and the zip stay on the site's address, "
      +"which is the whole reason this is a second constant");
    await ctx.close();
  }
  {
    // ...and with nothing injected, which is the web build: whatever MUSIC_HOME says.
    const ctx=await browser.newContext({viewport:{width:1100,height:800}});
    const pg=await ctx.newPage();
    await pg.goto("file://"+path.join(ROOT,"play.html"));
    await pg.waitForSelector('[data-act="begin"]',{timeout:60000});
    const w=await pg.evaluate(()=>({home:MUSIC_HOME,base:MUSIC_BASE,siren:musicURL("music/siren.mp3")}));
    ok(w.base===w.home,"the web build takes MUSIC_HOME as it stands ('"+w.home+"')");
    ok(w.siren===w.home+"music/siren.mp3","and a tune hangs off it ('"+w.siren+"')");
    await ctx.close();
  }

  ok(missing.length===0,"nothing 404'd while the page loaded"+(missing.length?": "+missing.join(", "):""));

  await browser.close();server.close();
  console.log("\npictures in "+TMP);
  console.log(fails?fails+" FAILED":"all good");
  process.exitCode=fails?1:0;
})();

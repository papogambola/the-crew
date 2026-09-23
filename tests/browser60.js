// The desktop app used to be a window pointed at a public URL: it carried no game, and would have
// gone dark the moment that address did. It carries the game now. This drives the copy that is
// actually inside it, over the same local HTTP server Neutralino serves resources from, and checks
// the three things bundling changed: the game runs with nothing fetched from the site, the music
// knows to look at the site for itself, and a stale copy is told it is stale.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const http=require("http"),fs=require("fs"),path=require("path");
const {execFileSync}=require("child_process");
const RES=ROOT+"/desktop/resources";
// Assemble first, and test what that produced. The folder is generated and not in the repository,
// so a test that only reads it is a test of whatever happened to be lying there — which is how
// this one came to be run against a directory a branch switch had quietly deleted.
execFileSync("python3",["tools/build.py"],{cwd:ROOT+"/desktop",stdio:"pipe"});
/* Where a packed copy reaches back to is decided in exactly one place, desktop/tools/build.py,
   and it moved once already (github.io -> the domain) — at which point four assertions here
   failed a change that was right. So it is read, not typed. */
const SITE=(fs.readFileSync(ROOT+"/desktop/tools/build.py","utf8")
  .match(/^SITE = "([^"]+)"/m)||[])[1];
if(!SITE)throw new Error("no SITE = in desktop/tools/build.py");
const SITE_GLOB=SITE.replace(/\/[^/]*$/,"")+"/**";
/* And where the tunes are, by build.py's own rule: MUSIC_HOME if it is an address, else the
   site. Read the same way, for the same reason — it moved to object storage and four assertions
   here would otherwise have failed a correct change for the second time. */
const MH=(fs.readFileSync(GAME,"utf8").match(/const MUSIC_HOME="([^"]*)"/)||[])[1];
const MUSIC=/^https?:/.test(MH||"")?MH:SITE;
const MUSIC_GLOB=MUSIC.replace(/\/[^/]*$/,"")+"/**";
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
const OUT=path.join(__dirname,"shots60");fs.mkdirSync(OUT,{recursive:true});
const TYPES={".html":"text/html",".png":"image/png",".js":"text/javascript",".json":"application/json"};
(async()=>{
  // Neutralino serves the resources over http on 127.0.0.1, so that is what this is.
  const srv=http.createServer((rq,rs)=>{
    const u=decodeURIComponent(rq.url.split("?")[0]);
    const f=path.join(RES,u==="/"?"index.html":u);
    if(!f.startsWith(RES)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){rs.writeHead(404);rs.end("no");return;}
    rs.writeHead(200,{"content-type":TYPES[path.extname(f)]||"application/octet-stream"});
    rs.end(fs.readFileSync(f));
  });
  await new Promise(r=>srv.listen(8137,"127.0.0.1",r));
  const base="http://127.0.0.1:8137/";

  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  // Everything the page asks the outside world for. A bundled game must ask for nothing to start.
  const external=[];
  page.on("request",r=>{const u=r.url();if(u.indexOf(base)!==0&&!/^data:|^blob:|^chrome/.test(u))external.push(u);});
  // The site is not reachable from a test, so answer for it — including version.txt.
  await page.route(SITE_GLOB,route=>{
    const u=route.request().url();
    if(/version\.txt/.test(u))return route.fulfill({status:200,body:"build 99 · 1 January 2027\n"});
    return route.fulfill({status:200,contentType:"audio/mpeg",body:""});
  });
  await page.goto(base);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.waitForSelector('[data-act="begin"]',{timeout:15000});

  console.log("— the game is inside the app —");
  check(true,"it opens from "+base+" with no server of its own");
  const inRepo=(fs.readFileSync(GAME,"utf8").match(/const BUILD="([^"]+)"/)||[])[1];
  const globals=await page.evaluate(()=>({media:MEDIA_BASE,build:window.THE_CREW_BUILD,stamp:BUILD,
    title:document.title,fonts:!!document.querySelector('link[href*="fonts.googleapis"]')}));
  check(globals.title==="The Crew","the title screen is the game, not a loading card");
  check(globals.media===SITE,"it knows where the music lives: "+globals.media);
  check(globals.build===globals.stamp,"and which build it is ("+globals.build+"), matching its own stamp");
  check(globals.stamp===inRepo,"and it is the game that is in the repository, not a copy left over from a previous build");
  const allowed=u=>/fonts\.(googleapis|gstatic)\.com/.test(u)          // the typefaces
                 ||/\/version\.txt/.test(u)                            // "is this build behind?"
                 ||/\/music\//.test(u);                                // the music
  const unexpected=[...new Set(external.filter(u=>!allowed(u)))];
  check(unexpected.length===0,"the only things it reaches out for are the fonts, the version line and the music"
    +(unexpected.length?" — and "+unexpected.slice(0,3).join(" | "):""));
  check([...new Set(external)].some(u=>/version\.txt/.test(u)),"and it did ask whether it is behind");

  console.log("\n— music still knows where to look —");
  const urls=await page.evaluate(()=>({
    siren:musicURL("music/siren.mp3"),
    amb:musicURL(TRACKS.ambient),
    already:musicURL("https://example.com/x.mp3"),
    key:TRACKS.ambient}));
  check(urls.siren===MUSIC+"music/siren.mp3","a track resolves to where the music lives: "+urls.siren);
  check(urls.key==="music/ambient.mp3","but the stored path stays relative, so it is still the key the player compares against");
  check(urls.already==="https://example.com/x.mp3","and an address that is already an address is left alone");

  console.log("\n— the handbook is beside it, not on the web —");
  const hb=await page.evaluate(()=>handbookHref());
  check(hb==="handbook.html","the full handbook opens the copy inside the app: "+hb);
  check(fs.existsSync(path.join(RES,"handbook.html")),"and that copy is there");

  console.log("\n— a bundled copy knows when it is behind —");
  await page.click('[data-act="begin"]');await page.fill("#pname","Paz");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await page.waitForTimeout(1200);
  const note=await page.evaluate(()=>({newer:NEWER,foot:(document.querySelector(".foot-note")||{}).innerText||""}));
  check(note.newer==="build 99 · 1 January 2027","it asked the site and was told of a newer build: "+note.newer);
  check(/build 99/.test(note.foot)&&/download/i.test(note.foot),"and says so in the footer, with somewhere to get it");
  await page.screenshot({path:OUT+"/1-bundled.png"});

  // and the same page, told it is current, says nothing
  await page.unroute(SITE_GLOB);
  await page.route(SITE_GLOB,route=>{
    const u=route.request().url();
    if(/version\.txt/.test(u))return route.fulfill({status:200,body:inRepo+"\n"});
    return route.fulfill({status:200,contentType:"audio/mpeg",body:""});
  });
  await page.reload();
  await page.waitForSelector('[data-act="continue"]',{timeout:15000});
  await page.click('[data-act="continue"]');
  await page.waitForSelector(".topbar",{timeout:15000});
  await page.waitForTimeout(1200);
  const quiet=await page.evaluate(()=>({newer:NEWER,foot:(document.querySelector(".foot-note")||{}).innerText||""}));
  check(quiet.newer===false,"told it is current, it says nothing");
  check(!/is out/.test(quiet.foot),"and the footer is the footer");

  console.log("\n— and with no line out at all —");
  await page.unroute(SITE_GLOB);
  await page.route(SITE_GLOB,route=>route.abort());
  if(MUSIC_GLOB!==SITE_GLOB)await page.route(MUSIC_GLOB,route=>route.abort());
  await page.reload();
  await page.waitForSelector('[data-act="continue"]',{timeout:15000});
  await page.click('[data-act="continue"]');
  await page.waitForSelector(".topbar",{timeout:15000});
  await page.waitForTimeout(1200);
  const off=await page.evaluate(()=>({newer:NEWER,tab:S&&S.tab,week:S&&S.week,
    jobs:(S&&S.jobs||[]).length}));
  check(off.week>=1&&off.jobs>0,"the game runs with the site unreachable — week "+off.week+", "+off.jobs+" postings on the board");
  check(off.newer===false,"and says nothing about updates it could not ask about");
  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await page.screenshot({path:OUT+"/2-offline.png"});

  await browser.close();srv.close();
})().catch(e=>{console.error(e);process.exit(1);});

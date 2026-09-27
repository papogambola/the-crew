// THE COPIES THAT CANNOT BE REPLACED.
//
// The Windows build is gone — zip, toolchain, desktop/ and all — because it had been shipping
// without a single one of the 526 drawings since build 124, so anybody who paid and installed it
// got a strictly worse game than the free one in their browser.
//
// The copies already on people's machines keep working; they are self-contained. What they lose is
// any way to be replaced, which makes ONE line of code matter more than it did before it was the
// last one left: updateCheck() fetches version.txt, compares it with the build the copy was packed
// with, and prints "build N is out — it plays in your browser at playthecrew.com" in the footer.
// For those players that note is now the only way they will ever hear the game moved.
//
// tests/browser60.js used to cover this, by assembling the whole desktop app with a toolchain that
// no longer exists. This is the one assertion out of it worth keeping, asked without any of that:
// a packaged copy is simulated with the two globals desktop/tools/build.py used to inject, and the
// note is read off the screen. Also asked here, because deleting a download is exactly where it
// goes wrong: that the note does NOT still offer the zip. A link to a file that has been deleted
// strands somebody worse than no link at all — and this is a WebView with no address bar and no
// back button, so there is no way back from a 404.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),http=require("http"),fs=require("fs");
const PORT=Number(process.env.PORT||8967);
const T={".html":"text/html; charset=utf-8",".webp":"image/webp",".png":"image/png",".mp3":"audio/mpeg",
  ".txt":"text/plain; charset=utf-8",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml"};

let ok=0,bad=0;
const check=(c,m)=>{ if(c){ok++;console.log("ok  "+m);} else {bad++;console.error("FAIL: "+m);} };

/* version.txt is served from here rather than read off disk by the page, so the test can say what
   it contains — including the case where it matches, which must print nothing at all. */
let SERVE_VERSION="build 999 · December 2099";
const srv=http.createServer((q,r)=>{
  const rel=decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/,"")||"index.html";
  if(rel==="version.txt"){
    r.writeHead(200,{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"});
    return r.end(SERVE_VERSION+"\n");
  }
  const f=path.join(ROOT,rel);
  fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();
    r.writeHead(200,{"content-type":T[path.extname(f)]||"application/octet-stream"});r.end(b);});});

/* What desktop/tools/build.py injected ahead of the game: where the site is, and which build this
   copy is. Those two globals are the whole of what made a copy "packaged", and updateCheck()
   returns immediately without them — which is why a web player never sees any of this. */
async function packagedCopy(browser,packedAs){
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.addInitScript(([site,build])=>{
    window.THE_CREW_MEDIA=site; window.THE_CREW_BUILD=build;
  },["http://127.0.0.1:"+PORT+"/",packedAs]);
  await page.goto("http://127.0.0.1:"+PORT+"/"+path.relative(ROOT,GAME),{waitUntil:"load"});
  await page.waitForSelector(".foot-note",{timeout:8000});
  await page.waitForTimeout(700);                 // the check is a fetch; give it the round trip
  return page;
}

(async()=>{
  await new Promise(r=>srv.listen(PORT,"127.0.0.1",r));
  const browser=await chromium.launch({executablePath:CHROME,
    args:(process.env.CHROME_ARGS||"").split(" ").filter(Boolean)});

  const src=fs.readFileSync(GAME,"utf8");
  const build=(src.match(/const BUILD="([^"]+)"/)||[])[1];
  check(!!build,"the game stamps a build: "+build);
  const onDisk=fs.readFileSync(path.join(ROOT,"version.txt"),"utf8").trim();
  check(onDisk===build,"and version.txt in the repository names that same build ('"+onDisk+"')");

  /* NOTHING IS OFFERED FOR DOWNLOAD, anywhere in the game's source. Checked in the text rather
     than on the screen because the note only appears in one state, and a dead link that only
     shows up for the people who cannot report it is the exact thing worth being sure about. */
  check(!/The-Crew-Windows\.zip/.test(src),"nothing in the game links to the Windows zip");
  check(!fs.existsSync(path.join(ROOT,"desktop")),"and there is no desktop build left to link to");

  /* A STALE COPY IS TOLD, and told the one thing it can act on. */
  SERVE_VERSION="build 999 · December 2099";
  let page=await packagedCopy(browser,"build 120 · August 2026");
  let note=(await page.textContent(".foot-note")).replace(/\s+/g," ").trim();
  check(/build 999/.test(note),"a packaged copy two builds behind is told a newer one is out");
  check(/playthecrew\.com/.test(note),"and told where the game actually lives now: \""
    +(note.match(/[^·]*is out[^·]*/)||[note])[0].trim()+"\"");
  /* As TEXT, not as a link. A WebView with no address bar has no way back from wherever an <a>
     takes it, so an address somebody types is slower and cannot strand them. */
  const links=await page.$$eval(".foot-note a",a=>a.map(x=>x.getAttribute("href")));
  check(!links.some(h=>h&&/\.zip($|\?)/i.test(h)),"with no link to a download"
    +(links.length?" (the footer's links are "+JSON.stringify(links)+")":""));
  check(!links.some(h=>h&&/playthecrew\.com/i.test(h)),
    "and the address given as text rather than a link, which in a WebView is a one-way trip");
  await page.close();

  /* AND A CURRENT ONE IS LEFT ALONE. The note firing when there is nothing to say would train
     everybody to ignore it, which costs exactly the players it exists for. */
  SERVE_VERSION=build;
  page=await packagedCopy(browser,build);
  note=(await page.textContent(".foot-note")).replace(/\s+/g," ").trim();
  check(!/is out/.test(note),"a packaged copy that is current is told nothing");
  check(/THE CREW/i.test(note),"though the footer is still there: \""+note.slice(0,54)+"…\"");
  await page.close();

  /* AND A WEB PLAYER NEVER SEES IT AT ALL, however stale version.txt gets — they just fetched
     the game, so they are current by definition. */
  SERVE_VERSION="build 999 · December 2099";
  const web=await browser.newPage({viewport:{width:1280,height:900}});
  const errs=[],missed=[];
  web.on("pageerror",e=>errs.push(String(e).split("\n")[0]));
  web.on("response",r=>{ if(r.status()>=400) missed.push(r.status()+" "+r.url().split("/").pop()); });
  await web.goto("http://127.0.0.1:"+PORT+"/"+path.relative(ROOT,GAME),{waitUntil:"load"});
  await web.waitForSelector(".foot-note",{timeout:8000});
  await web.waitForTimeout(700);
  const webNote=(await web.textContent(".foot-note")).replace(/\s+/g," ").trim();
  check(!/is out/.test(webNote),"a browser copy is never told it is behind, whatever version.txt says");
  check(missed.length===0,"nothing 404s"+(missed.length?" — "+missed.slice(0,3).join(", "):""));
  check(errs.length===0,"no page errors"+(errs.length?" — "+errs[0]:""));
  await web.close();

  await browser.close();srv.close();
  if(bad)console.error(bad+" FAILED");
  process.exit(bad?1:0);
})();

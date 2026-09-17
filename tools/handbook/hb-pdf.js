/* Renders handbook.html to The-Crew-Handbook.pdf.
   Chromium in this container cannot reach fonts.googleapis.com (the agent proxy re-terminates TLS
   and Chromium does not trust the CA), so the same font files are fetched with curl into fonts/
   and injected as local @font-face rules. The shipped page still links Google Fonts for real
   browsers; this only affects the render. */
const {chromium}=require("/opt/node22/lib/node_modules/playwright");
const fs=require("fs"),path=require("path"),http=require("http");
const DIR=__dirname;
const PORT=8899;
const MIME={".html":"text/html",".css":"text/css",".woff2":"font/woff2",".js":"text/javascript",".json":"application/json"};

const srv=http.createServer((req,res)=>{
  const f=path.join(DIR,decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/,""));
  if(!f.startsWith(DIR))return res.writeHead(403).end();
  fs.readFile(f,(e,b)=>{
    if(e)return res.writeHead(404).end("no");
    res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream","access-control-allow-origin":"*"});
    res.end(b);
  });
});

(async()=>{
  await new Promise(r=>srv.listen(PORT,"127.0.0.1",r));
  const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome"});
  const pg=await b.newPage({viewport:{width:1280,height:900}});
  const errs=[];
  pg.on("pageerror",e=>errs.push("pageerror: "+e));
  pg.on("console",m=>{if(m.type()==="error"&&!/fonts\.googleapis/.test(m.text()))errs.push("console: "+m.text());});
  await pg.goto("http://127.0.0.1:"+PORT+"/handbook.html",{waitUntil:"load"});
  await pg.addStyleTag({url:"/fonts-local.css"});
  await pg.evaluate(()=>document.fonts.ready);
  // the real faces have to be in before anything is measured or printed
  const ok=await pg.evaluate(()=>[["Anton",400],["Oswald",600],["Spectral",400],["IBM Plex Mono",400]]
    .map(f=>document.fonts.check(f[1]+" 16px '"+f[0]+"'")));
  if(ok.some(x=>!x))throw new Error("fonts not loaded: "+JSON.stringify(ok));
  // the fonts above were injected after the page booted, so the book measured itself against
  // fallbacks; measure it again now that the real faces are in
  await pg.evaluate(()=>window.bookRepaginate&&window.bookRepaginate());
  await pg.waitForTimeout(500);
  // The book has already paginated itself on screen. bookForPrint() puts every leaf back in the
  // order you would turn them and hands back the page box, so the PDF is one sheet per leaf and
  // PDF page N is book page N — which is what lets the index be checked rather than trusted.
  const book=await pg.evaluate(()=>{
    if(typeof window.bookForPrint!=="function")throw new Error("the book never paginated");
    return window.bookForPrint();
  });
  if(!book||!book.pages)throw new Error("no pages to print");
  await pg.waitForTimeout(150);
  await pg.pdf({
    path:path.join(DIR,"The-Crew-Handbook.pdf"),
    width:book.w+"px", height:book.h+"px",
    printBackground:true,
    margin:{top:"0",bottom:"0",left:"0",right:"0"},
  });
  if(errs.length)console.log("PAGE ERRORS:\n"+errs.join("\n"));
  await b.close();
  srv.close();
  console.log("pdf written: "+book.pages+" pages at "+book.w+"x"+book.h+", fonts ok");
})().catch(e=>{console.error(e);process.exit(1);});

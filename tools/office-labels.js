/* No two words in the office may be printed on top of each other.
 *
 *     node tools/office-labels.js [path/to/play.html]
 *
 * The office is a drawing, and a drawing is laid out by hand: every label in it is a text
 * element at an x somebody chose. VOLUME sat centred on its knob at 375 and ran from 342 to
 * 408, which put it seven units through the tail of MUSIC — on every machine, with the webfont
 * and without it, since the collision is in the coordinates and not in the font. It shipped
 * that way for as long as the office has existed and was found in a player's screenshot.
 *
 * Nothing catches that by looking, because a drawing always looks like a drawing. So this asks
 * the renderer for the box around every <text> in the office SVG, in the drawing's own user
 * units, and fails if any two of them intersect. It also fails if a label runs outside the
 * object it belongs to, which is how VOLUME was one unit from being wrong in the other
 * direction as well.
 *
 * Run with the webfont blocked too: a label that only just fits in IBM Plex Mono is a label
 * that collides on a machine which never got the font, and the exe renders wherever it lands.
 */
const {chromium}=require("/opt/node22/lib/node_modules/playwright");
const path=require("path");
const FILE=process.argv[2]||path.join(__dirname,"..","play.html");
const CHROME="/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

// What must stay inside what. The radio body is the one that bit.
const INSIDE=[{what:["SOUND","MUSIC","VOLUME","ON","OFF"],x1:100,x2:410,l:"the radio body"}];

async function boxes(browser,blockFonts){
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  if(blockFonts)await page.route("**/*",r=>
    /fonts\.|\.woff|\.ttf|\.otf/i.test(r.request().url())?r.abort():r.continue());
  await page.goto("file://"+path.resolve(FILE));
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  // The office opens without a game behind it, which is the point of it being settings as well.
  await page.click(".burger");
  await page.waitForSelector(".office-svg text",{timeout:8000});
  await page.waitForTimeout(500);
  const out=await page.evaluate(()=>[...document.querySelectorAll(".office-svg text")].map(t=>{
    const b=t.getBBox();
    return {t:t.textContent,x1:+b.x.toFixed(1),x2:+(b.x+b.width).toFixed(1),
            y1:+b.y.toFixed(1),y2:+(b.y+b.height).toFixed(1)};
  }));
  await page.close();
  return out;
}

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  let bad=0;
  for(const [tag,block] of [["with the webfont",false],["without the webfont",true]]){
    const L=await boxes(browser,block);
    console.log("\n"+tag+" — "+L.length+" labels in the office");
    for(let i=0;i<L.length;i++)for(let k=i+1;k<L.length;k++){
      const A=L[i],B=L[k];
      if(A.x1<B.x2&&B.x1<A.x2&&A.y1<B.y2&&B.y1<A.y2){
        const by=Math.min(A.x2,B.x2)-Math.max(A.x1,B.x1);
        console.error("  FAIL  "+A.t+" and "+B.t+" overlap by "+by.toFixed(1)+" units");
        bad++;
      }
    }
    INSIDE.forEach(box=>L.filter(l=>box.what.indexOf(l.t)>=0).forEach(l=>{
      if(l.x1<box.x1||l.x2>box.x2){
        console.error("  FAIL  "+l.t+" ("+l.x1+"→"+l.x2+") is outside "+box.l+" ("+box.x1+"→"+box.x2+")");
        bad++;
      }
    }));
    // The three on the radio, spelled out, because they are the ones that went wrong.
    ["SOUND","MUSIC","VOLUME"].forEach(n=>{
      const l=L.find(x=>x.t===n);
      if(!l){console.error("  FAIL  "+n+" is not in the drawing at all");bad++;return;}
      console.log("  ok    "+n.padEnd(7)+" "+String(l.x1).padStart(6)+" → "+String(l.x2).padStart(6));
    });
  }
  await browser.close();
  if(bad){console.error("\n"+bad+" label problem"+(bad>1?"s":"")+" in the office.");process.exit(1);}
  console.log("\nnothing in the office is printed on top of anything else.");
})();

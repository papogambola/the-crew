/* Checks the report pools that carry a promise, rather than the prose itself.

       node tools/lines-check.js            # exit 1 on a broken promise

   There is one such promise so far, and it was broken for months without anybody being able to
   name what was wrong: **the report's first line always says which city you are in.** It is the
   only line in the narration that names the place — the header above it does, but the prose does
   not repeat it — so an arrival line that opens on the country alone ("South Korea. The crew
   arrives…") narrates a whole job from a city it never mentions. Four of the fourteen did that,
   which is better than a quarter of every job ever played.

   Checked by filling each template the way narrate() fills it and reading the result, not by
   grepping the source for "{city}": a template that carries the placeholder but drops it in the
   fill would pass the grep and fail the player. */
const fs=require("fs");
const FILE=process.argv[2]||(__dirname+"/../play.html");
let src=fs.readFileSync(FILE,"utf8");
if(/\.html?$/i.test(FILE)){const i=src.indexOf("<script>"),j=src.lastIndexOf("</script>");src=src.slice(i+8,j);}

// the two pieces of the game this needs, lifted out rather than booted: ARRIVE and fill2
const grab=name=>{
  const m=src.match(new RegExp("const "+name+"=\\[[\\s\\S]*?\\];"));
  if(!m)throw new Error("no "+name+"= in "+FILE);
  return m[0];
};
const fillSrc=(()=>{
  const m=src.match(/function fill2\([\s\S]*?\n\}/);
  if(!m)throw new Error("no fill2() in "+FILE);
  return m[0];
})();
let ARRIVE, fill2;
eval(grab("ARRIVE").replace(/^const /,"")+"\n"+fillSrc.replace(/^function fill2/,"fill2=function"));

const CITY="Trondheim", COUNTRY="Norway";        // two words nothing else in a template can spell
let bad=0;
ARRIVE.forEach((t,i)=>{
  const out=fill2(t,{city:CITY,country:COUNTRY,how:"on a night ferry",How:"On a night ferry"});
  if(out.indexOf(CITY)<0){bad++;console.log("  ✗ ["+i+"] never names the city: "+out);}
  else if(/\{[a-zA-Z]+\}/.test(out)){bad++;console.log("  ✗ ["+i+"] left a placeholder unfilled: "+out);}
});
console.log((ARRIVE.length-bad)+" of "+ARRIVE.length+" arrival lines name the city");
if(bad){console.log("LINES BROKEN");process.exit(1);}
console.log("lines ok");

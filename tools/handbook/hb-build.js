/* Builds handbook.html out of hb-text.js (prose) and hb-data.js (the game's own tables).

   The handbook is a book: a closed cover you click to open, and pages you click to turn. The
   content is emitted once into #source and paginated in the browser into fixed-size leaves, so
   the page is the unit of truth — the index says the page you will actually turn to, and the PDF
   prints one leaf per sheet, which makes the two agree by construction rather than by a loop that
   renders the PDF and reads the numbers back out of it. */
const fs=require("fs");
const path=require("path");
const {CH}=require("./hb-text.js");
const G=require("./hb-data.js");
const BUILD=G.D.BUILD;
const FACES=G.D.COVER_FACES||[];

/* ------------------------------ numbering ------------------------------ */
CH.forEach((c,i)=>{
  c.no=i+1;
  c.secs.forEach((s,j)=>{s.no=(i+1)+"."+(j+1);});
});

/* ------------------------------- contents ------------------------------ */
/* The page numbers are written in by the paginator once it knows them. "—" is what a build that
   never met a browser leaves behind, and the drive fails if any of them survive. */
const contents='<section id="contents" class="contents">'
  +'<h2 class="ct-h">Contents</h2>'
  +'<p class="ct-note">Every subject in this handbook, and the page it is on. Click any line to turn straight to it.</p>'
  +CH.map(c=>'<div class="ct-ch"><a class="ct-c" href="#'+c.id+'" data-jump="'+c.id+'"><span class="ct-n">'+c.no+'</span>'
      +'<span class="ct-t">'+c.t+'</span><span class="ct-l"></span><span class="ct-p" data-pg="'+c.id+'">—</span></a>'
    +c.secs.filter(s=>s.t).map(s=>'<a class="ct-s" href="#'+s.id+'" data-jump="'+s.id+'"><span class="ct-n">'+s.no+'</span>'
      +'<span class="ct-t">'+s.t+'</span><span class="ct-l"></span><span class="ct-p" data-pg="'+s.id+'">—</span></a>').join("")
    +'</div>').join("")
  +'</section>';

/* ------------------------------- chapters ------------------------------ */
/* The ids live on the elements that end up inside a leaf — the chapter's header and each
   section's heading — because after pagination those are what a link has to find. */
const chapters=CH.map(c=>'<section class="chapter" data-ch="'+c.id+'" data-title="'+c.t.replace(/"/g,"&quot;")+'">'
  +'<header class="ch-h" id="'+c.id+'"><div class="ch-n">'+c.no+'</div><h2>'+c.t+'</h2>'
    +'<div class="ch-k">Chapter '+c.no+' · '+c.k+'</div></header>'
  +c.secs.map(s=>'<section class="sec">'
      +(s.t?'<h3 id="'+s.id+'"><span class="s-n">'+s.no+'</span>'+s.t+'</h3>':'')+s.h+'</section>').join("")
  +'</section>').join("");

/* --------------------------------- cover -------------------------------- */
const coverFaces=FACES.map(svg=>'<div class="cv-face">'+svg+'</div>').join("");
const cover='<div class="cv-in">'
  +'<div class="cv-eyebrow">Case file · Classified</div>'
  +'<div class="cv-rule top"></div>'
  +'<div class="cv-title"><span>The</span><span>Crew</span></div>'
  +'<div class="cv-faces">'+coverFaces+'</div>'
  +'<div class="cv-rule"></div>'
  +'<div class="cv-sub">Player’s<br>Handbook</div>'
  +'<div class="cv-rule"></div>'
  +'<div class="cv-tick"></div>'
  +'<div class="cv-foot">A crew of five<br>Thousands of jobs</div>'
  +'</div>';

/* --------------------------------- CSS --------------------------------- */
const CSS=`
:root{
  --paper:#f6f4ee; --paper-2:#efece3; --card:#fbfaf6;
  --ink:#111010; --ink-2:#4a463e; --muted:#726c60;
  --line:#d9d5c8; --line-2:#c4bfae;
  --stamp:#9a2b1e; --good:#2f6b34; --warn:#8a6212;
  --cover:#e9e4d5; --desk:#8f8f8d;
  --f-logo:"Anton","Impact","Oswald","Arial Narrow",sans-serif;
  --f-disp:"Oswald","Arial Narrow",system-ui,sans-serif;
  --f-body:"Spectral","Iowan Old Style",Georgia,serif;
  --f-mono:"IBM Plex Mono",ui-monospace,"SFMono-Regular",Menlo,monospace;
  color-scheme:light;
}
*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{background:var(--desk);color:var(--ink);font-family:var(--f-body);font-size:14px;line-height:1.66;
  -webkit-font-smoothing:antialiased;overflow:hidden;
  background-image:
    radial-gradient(circle at 20% 15%,rgba(255,255,255,.07),transparent 45%),
    radial-gradient(circle at 80% 82%,rgba(0,0,0,.10),transparent 52%),
    repeating-linear-gradient(37deg,rgba(0,0,0,.022) 0 2px,transparent 2px 4px),
    repeating-linear-gradient(-51deg,rgba(255,255,255,.018) 0 3px,transparent 3px 6px);}
a{color:inherit}

/* ---- the pinned bar ---- */
.bar{position:fixed;top:0;left:0;right:0;z-index:60;background:var(--paper);border-bottom:2px solid var(--ink);
  display:flex;align-items:center;gap:14px;padding:9px 18px;box-shadow:0 10px 26px -20px rgba(0,0,0,.9)}
.bar .brand{font-family:var(--f-logo);font-size:21px;letter-spacing:.5px;white-space:nowrap;line-height:1}
.bar .brand small{font-family:var(--f-disp);font-weight:600;font-size:11px;letter-spacing:2.2px;display:block;color:var(--muted);margin-top:2px}
.sbox{flex:1;display:flex;align-items:center;gap:8px;border:1.5px solid var(--ink);background:var(--card);
  padding:0 10px;height:36px;max-width:620px;position:relative}
.sbox svg{flex:0 0 14px;opacity:.65}
#q{flex:1;border:0;outline:0;background:transparent;font-family:var(--f-mono);font-size:13px;color:var(--ink);height:34px}
#q::placeholder{color:var(--muted)}
.scount{font-family:var(--f-mono);font-size:11px;color:var(--muted);white-space:nowrap}
.sbtn{border:1px solid var(--line-2);background:var(--card);color:var(--ink);font-family:var(--f-mono);font-size:12px;
  width:24px;height:24px;line-height:1;cursor:pointer;padding:0}
.sbtn:hover:not(:disabled){background:var(--ink);color:var(--paper)}
.sbtn:disabled{opacity:.3;cursor:default}
.zoom{display:flex;align-items:center;gap:4px;border:1.5px solid var(--ink);background:var(--card);
  height:36px;padding:0 4px;flex:none}
.zoom .sbtn{width:26px;height:26px;font-size:14px}
.zval{font-family:var(--f-mono);font-size:11px;letter-spacing:.06em;min-width:48px;text-align:center;
  border:0;background:none;color:var(--ink);cursor:pointer;padding:0 2px}
.zval:hover{color:var(--stamp)}
.nav{display:flex;gap:8px;margin-left:auto}
.nbtn{font-family:var(--f-disp);font-weight:600;font-size:11.5px;letter-spacing:1.3px;text-transform:uppercase;
  border:1.5px solid var(--ink);background:var(--card);color:var(--ink);padding:8px 13px;cursor:pointer;text-decoration:none;white-space:nowrap}
.nbtn:hover{background:var(--ink);color:var(--paper)}
.nbtn.solid{background:var(--ink);color:var(--paper)}
.nbtn.solid:hover{background:var(--stamp);border-color:var(--stamp)}

/* ---- the desk the book sits on ---- */
/* The desk scrolls, so a book zoomed past the window can be moved around under it. margin:auto on
   the inner box is what centres it — justify-content would centre it too, and then clip the top
   and left off once it overflows, which is exactly the half you cannot scroll back to. */
.desk{position:fixed;inset:56px 0 0;display:flex;overflow:auto}
.deskin{margin:auto;padding:16px;display:flex;align-items:center;justify-content:center;perspective:2800px}
body.zoomed .spread{cursor:grab}
body.panning,body.panning .spread{cursor:grabbing}

/* ---- the closed book ---- */
.closed{position:relative;cursor:pointer;transform-origin:left center;transform-style:preserve-3d;
  scale:var(--fit,1);
  transition:transform .8s cubic-bezier(.4,.05,.2,1),opacity .45s .28s;
  background:var(--cover);color:var(--ink);border-radius:3px 7px 7px 3px;
  box-shadow:0 2px 0 rgba(0,0,0,.15),0 26px 60px -22px rgba(0,0,0,.85),
             inset 0 0 90px rgba(120,100,70,.16), inset 0 0 0 1px rgba(90,75,50,.2);
  background-image:
    radial-gradient(ellipse at 22% 12%,rgba(140,120,85,.16),transparent 42%),
    radial-gradient(ellipse at 84% 72%,rgba(140,120,85,.2),transparent 46%),
    radial-gradient(ellipse at 50% 100%,rgba(90,75,50,.16),transparent 55%),
    repeating-linear-gradient(94deg,rgba(120,100,70,.035) 0 3px,transparent 3px 7px);}
/* the spine edge, and the rubbed corners the cover has */
.closed::before{content:"";position:absolute;left:0;top:0;bottom:0;width:13px;border-radius:3px 0 0 3px;
  background:linear-gradient(90deg,rgba(80,66,44,.3),rgba(80,66,44,.05) 60%,transparent);pointer-events:none}
.closed::after{content:"";position:absolute;inset:0;border-radius:3px 7px 7px 3px;pointer-events:none;
  background:
    radial-gradient(circle at 0 0,rgba(255,255,255,.55) 0 16px,transparent 17px),
    radial-gradient(circle at 100% 0,rgba(255,255,255,.5) 0 14px,transparent 15px),
    radial-gradient(circle at 0 100%,rgba(255,255,255,.5) 0 15px,transparent 16px),
    radial-gradient(circle at 100% 100%,rgba(255,255,255,.55) 0 17px,transparent 18px);
  mix-blend-mode:soft-light}
body.opening .closed{transform:rotateY(-158deg);opacity:0}
.cv-in{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
  padding:6% 9% 5%;text-align:center;backface-visibility:hidden}
.cv-in>*{flex:none}
.cv-eyebrow{font-family:var(--f-disp);font-weight:600;letter-spacing:.4em;text-transform:uppercase;
  font-size:calc(var(--cw) * .026);color:var(--ink)}
.cv-rule{height:2px;background:var(--ink);width:74%;margin:calc(var(--cw) * .026) 0}
.cv-rule.top{margin-top:calc(var(--cw) * .018)}
.cv-title{font-family:var(--f-logo);font-weight:400;line-height:.82;letter-spacing:.005em;
  font-size:calc(var(--cw) * .255);text-transform:uppercase;display:flex;flex-direction:column;
  margin:calc(var(--cw) * .006) 0 calc(var(--cw) * .042)}
.cv-title span:last-child{font-size:calc(var(--cw) * .312);letter-spacing:-.012em}
.cv-faces{display:flex;gap:calc(var(--cw) * .022);justify-content:center}
.cv-face{width:calc(var(--cw) * .107);aspect-ratio:100/120;border:2px solid var(--ink);background:#fff;
  padding:3px;display:flex;align-items:center;justify-content:center}
.cv-face svg{width:100%;height:100%;display:block}
.cv-sub{font-family:var(--f-disp);font-weight:700;letter-spacing:.32em;text-transform:uppercase;
  font-size:calc(var(--cw) * .054);line-height:1.32;margin:calc(var(--cw) * .008) 0}
.cv-tick{width:calc(var(--cw) * .07);height:3px;background:var(--ink);
  margin:calc(var(--cw) * .04) 0 calc(var(--cw) * .034)}
.cv-foot{font-family:var(--f-disp);font-weight:600;letter-spacing:.26em;text-transform:uppercase;
  font-size:calc(var(--cw) * .027);line-height:1.85;margin-top:auto}
.opencue{position:fixed;left:0;right:0;bottom:11px;text-align:center;font-family:var(--f-mono);
  font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.8);
  animation:breathe 2.6s ease-in-out infinite;pointer-events:none;z-index:50}
body.open .opencue,body.opening .opencue{display:none}
@keyframes breathe{50%{opacity:.4}}

/* ---- the open book ---- */
/* The scale is a transform, which does not change the layout box — so the book sits in a wrapper
   the size it is actually drawn at, or the desk would never know there was anything to scroll. */
.bookwrap{position:relative;display:none;
  width:calc(var(--bw,1120px) * var(--scale,1));
  height:calc(var(--bh,752px) * var(--scale,1))}
.book{position:absolute;top:0;left:0;transform-style:preserve-3d;
  transform:scale(var(--scale,1));transform-origin:top left}
body.open .bookwrap{display:block}
body.open .closed{display:none}
.spread{position:relative;display:flex;transform-style:preserve-3d;
  filter:drop-shadow(0 30px 56px rgba(0,0,0,.6))}
.slot{background:var(--card);position:relative;overflow:hidden;flex:none}
.slot.left{border-radius:4px 0 0 4px;box-shadow:inset -22px 0 26px -24px rgba(60,48,30,.85)}
.slot.right{border-radius:0 4px 4px 0;box-shadow:inset 22px 0 26px -24px rgba(60,48,30,.85)}
/* the gutter: two leaves meeting at a spine, not one sheet with a line drawn down it */
.spine{position:absolute;left:50%;top:0;bottom:0;width:26px;transform:translateX(-50%);pointer-events:none;z-index:3;
  background:linear-gradient(90deg,transparent,rgba(60,48,30,.12) 42%,rgba(60,48,30,.22) 50%,rgba(60,48,30,.12) 58%,transparent)}
/* the block of leaves you have not got to, stacked at the outer edges */
.edge{position:absolute;top:6px;bottom:6px;width:0;pointer-events:none;z-index:0}
.edge.l{left:-7px;border-left:7px solid var(--paper-2);box-shadow:-1px 0 0 rgba(60,48,30,.35),-4px 0 0 rgba(255,255,255,.5),-5px 0 0 rgba(60,48,30,.2)}
.edge.r{right:-7px;border-right:7px solid var(--paper-2);box-shadow:1px 0 0 rgba(60,48,30,.35),4px 0 0 rgba(255,255,255,.5),5px 0 0 rgba(60,48,30,.2)}

.leaf{position:relative;width:100%;height:100%;display:flex;flex-direction:column;background:var(--card);
  padding:30px 34px 20px}
.leaf-b{flex:1;overflow:hidden;position:relative}
.leaf-f{flex:none;display:flex;align-items:baseline;justify-content:space-between;gap:10px;
  font-family:var(--f-mono);font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);
  border-top:1px solid var(--line);margin-top:10px;padding-top:7px}
.leaf-f .pn{font-size:11px;color:var(--ink-2)}
.slot.left .leaf-f,.flip .back .leaf-f{flex-direction:row-reverse}

/* the leaf being turned */
.flip{position:absolute;top:0;transform-style:preserve-3d;transform-origin:left center;z-index:5;
  pointer-events:none;display:none}
body.turning .flip{display:block}
.flip .face{position:absolute;inset:0;backface-visibility:hidden;background:var(--card);overflow:hidden;
  box-shadow:0 0 34px -6px rgba(60,48,30,.5)}
.flip .back{transform:rotateY(180deg)}

/* Clicking a page turns it — handled on the spread itself, because an overlay that catches the
   click would also catch every link on the page, and the contents is nothing but links. These
   are the marks that say which way; they take no pointer events at all. */
.spread{cursor:pointer}
.zone{position:absolute;top:50%;width:26px;height:26px;margin-top:-13px;z-index:6;
  pointer-events:none;opacity:.2;transition:opacity .16s;
  border-top:2px solid #fff;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}
.zone.prev{left:-40px;border-left:2px solid #fff;transform:rotate(-45deg)}
.zone.next{right:-40px;border-right:2px solid #fff;transform:rotate(45deg)}
.spread:hover .zone{opacity:.75}
.zone.off{opacity:0 !important}

/* Zoomed in, a page fills the window — so the indicator needs its own ground to stand on, or it
   is white ink on white paper exactly when it is most wanted. */
.pager{position:fixed;left:0;right:0;bottom:11px;text-align:center;z-index:50;pointer-events:none}
.pager span{display:inline-block;background:rgba(17,16,16,.72);color:rgba(255,255,255,.85);
  font-family:var(--f-mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;
  padding:5px 12px;border-radius:2px}
.pager b{font-weight:500;color:#fff}
body:not(.open) .pager{opacity:0}

/* ---- the page itself: the same ink on paper as the game ---- */
.titlepage{text-align:center;display:flex;flex-direction:column;justify-content:center;height:100%}
.titlepage h1{font-family:var(--f-logo);font-weight:400;font-size:52px;line-height:.92;margin:0;letter-spacing:.5px;text-transform:uppercase}
.titlepage .tp-sub{font-family:var(--f-disp);font-weight:700;letter-spacing:.3em;text-transform:uppercase;font-size:14px;margin-top:13px}
.titlepage hr{border:0;border-top:2px solid var(--ink);margin:20px 12%}
.titlepage p{font-size:13px;margin:0 0 9px}
.titlepage .tp-foot{font-family:var(--f-mono);font-size:10px;color:var(--muted);margin-top:22px;letter-spacing:.1em}
.titlepage .stamp{border:2.5px solid var(--stamp);color:var(--stamp);display:inline-block;
  font-family:var(--f-disp);font-weight:700;letter-spacing:3px;font-size:11px;padding:7px 13px;
  transform:rotate(-7deg);text-transform:uppercase;margin:12px auto 0}

.ct-h{font-family:var(--f-logo);font-size:34px;margin:0;letter-spacing:.5px;font-weight:400;text-transform:uppercase}
.ct-note{font-size:12px;color:var(--ink-2);margin:4px 0 15px;border-bottom:2px solid var(--ink);padding-bottom:10px}
.ct-ch{margin-bottom:9px}
.ct-c{display:flex;align-items:baseline;gap:8px;text-decoration:none;font-family:var(--f-disp);font-weight:700;
  font-size:13.5px;letter-spacing:.3px;padding:3px 0 4px;border-bottom:1px solid var(--line)}
.ct-s{display:flex;align-items:baseline;gap:8px;text-decoration:none;font-family:var(--f-body);font-size:11.5px;
  color:var(--ink-2);padding:1px 0 1px 24px}
.ct-c:hover,.ct-s:hover{color:var(--stamp)}
.ct-c .ct-n{min-width:20px;font-size:11px;color:var(--ink)}
.ct-n{font-family:var(--f-mono);font-size:9.5px;color:var(--muted);min-width:28px;flex:0 0 auto}
.ct-l{flex:1;border-bottom:1px dotted var(--line-2);transform:translateY(-3px);min-width:10px}
.ct-c .ct-l{border-bottom:0}
.ct-p{font-family:var(--f-mono);font-size:11px;min-width:20px;text-align:right;flex:0 0 auto}
.ct-c .ct-p{font-weight:500}

.ch-h{border-top:3px solid var(--ink);border-bottom:1px solid var(--line-2);padding:12px 0 10px;margin:0 0 16px;position:relative}
.ch-n{font-family:var(--f-logo);font-weight:400;font-size:44px;line-height:.8;color:var(--line-2);position:absolute;right:0;top:9px}
.ch-h h2{font-family:var(--f-logo);font-weight:400;font-size:28px;margin:0;letter-spacing:.4px;padding-right:54px;text-transform:uppercase}
.ch-k{font-family:var(--f-disp);font-weight:600;letter-spacing:2.2px;text-transform:uppercase;font-size:9.5px;color:var(--muted);margin-top:5px}
h3{font-family:var(--f-disp);font-weight:700;font-size:14.5px;letter-spacing:.3px;margin:15px 0 6px;
  border-bottom:1px solid var(--line);padding-bottom:4px;display:flex;gap:8px;align-items:baseline}
.sec>h3:first-child{margin-top:0}
.s-n{font-family:var(--f-mono);font-size:10px;color:var(--muted);font-weight:400}
p{margin:0 0 8px}
.aside{border-left:3px solid var(--ink);background:var(--paper-2);padding:7px 10px;font-size:12px;margin:9px 0}
ul,ol{margin:0 0 9px;padding-left:19px}
li{margin-bottom:4px}
ol.steps{padding-left:17px}
ol.twenty li{margin-bottom:7px}
.mono{font-family:var(--f-mono);font-size:.9em}
b,strong{font-weight:600}
.formula{border:1px solid var(--line-2);background:var(--paper-2);padding:8px 11px;margin:8px 0;
  font-family:var(--f-mono);font-size:10.5px;line-height:1.75}
table{width:100%;border-collapse:collapse;margin:8px 0 11px;font-size:11px;line-height:1.5}
th{font-family:var(--f-disp);font-weight:600;letter-spacing:1.1px;text-transform:uppercase;font-size:8.5px;color:var(--muted);
  text-align:left;border-bottom:1.5px solid var(--ink);padding:4px 6px 4px 0;vertical-align:bottom}
td{border-bottom:1px solid var(--line);padding:4px 6px 4px 0;vertical-align:top}
td:last-child,th:last-child{padding-right:0}
tbody tr:last-child td{border-bottom:1.5px solid var(--ink)}
.stamp{color:var(--stamp)}
.note{color:var(--muted);font-style:italic}
dl.gloss{margin:5px 0}
dl.gloss .gl{margin-top:7px}
dl.gloss dt{font-family:var(--f-disp);font-weight:600;font-size:12px;letter-spacing:.3px}
dl.gloss dd{margin:1px 0 0;padding-left:13px;font-size:11.5px;color:var(--ink-2);border-left:1px solid var(--line)}

/* ---- search ---- */
/* A mark carries no padding: it must not change a line's metrics, or marking a hit would
   repaginate the book under the reader and the page the index promised would stop being true. */
mark{background:#ffe9a8;color:var(--ink);padding:0;box-shadow:inset 0 -1px 0 #d8b23c}
mark.on{background:var(--stamp);color:var(--paper);box-shadow:none}
.nores{display:none;position:fixed;left:0;right:0;top:52%;transform:translateY(-50%);z-index:58;
  text-align:center;padding:26px;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.65)}
body.nohits .nores{display:block}
body.nohits .book,body.nohits .closed{opacity:.16}
.nores b{font-family:var(--f-disp);font-size:19px;letter-spacing:.4px}
.nores p{color:rgba(255,255,255,.85);font-size:13px}

/* ---- the stack the paginator fills; never seen ---- */
#store{position:absolute;left:-20000px;top:0;visibility:hidden}
body.ready #store{display:none}
#source{display:none}

@media(prefers-reduced-motion:reduce){
  .closed,.flip{transition:none !important}
  .opencue{animation:none}
}

/* ---- print: one leaf, one sheet. hb-pdf.js calls bookForPrint() first, which puts every leaf
   back in order, so what is printed is the book in the order you would turn it. ---- */
@media print{
  @page{margin:0}
  html,body{height:auto;overflow:visible;background:#fff}
  .bar,.desk,.pager,.nores{display:none !important}
  body.ready #store{display:block !important}
  #store{position:static;left:auto;visibility:visible;margin:0;padding:0}
  .leaf{break-after:page;page-break-after:always;box-shadow:none;background:#fff}
  .leaf:last-child{break-after:auto;page-break-after:auto}
  .leaf-b{overflow:visible}
  a{text-decoration:none}
}
`;

/* --------------------------------- JS ---------------------------------- */
/* Written without template literals so it can live inside one. */
const JS=`
"use strict";
var LEAVES=[],PAGE_OF={},SPREAD=0,TURNING=false,GEO={w:0,h:0};
var HITS=[],HIT=-1,PANNED=false;
var $=function(s){return document.querySelector(s);};
var body=document.body;

/* ------------------------------ geometry ------------------------------- */
/* A book has a page size. If the page grew and shrank with the window the pagination would too,
   and "page 16" would mean a different thing on every screen — the index would be promising
   something it cannot keep, and the PDF would disagree with what is on screen. So the page is
   fixed and the whole book is scaled to fit, which is what holding a book closer actually is. */
var PAGE={w:560,h:752};
var FIT=1,ZOOM=1,FOCUS=1,ZMIN=0.6,ZMAX=3;
function fit(){
  var vw=window.innerWidth,vh=window.innerHeight;
  var s=Math.min((vw-150)/(PAGE.w*2),(vh-140)/PAGE.h);
  FIT=Math.max(0.5,Math.min(s,1.35));
  applyScale();
}
/* Zoom is a number over the fitted size: 100% is the book filling the window, and it multiplies
   the fit rather than replacing it. It is only ever a scale — nothing here repaginates, so the
   page an index line names is still the page it is on however far in you are. */
function applyScale(){
  var r=document.documentElement.style;
  r.setProperty("--fit",FIT);
  r.setProperty("--scale",FIT*ZOOM);
  r.setProperty("--bw",(PAGE.w*2)+"px");
  r.setProperty("--bh",PAGE.h+"px");
  var v=$("#zval");if(v)v.textContent=Math.round(ZOOM*100)+"%";
  pagerText();
  var zi=$("#zin"),zo=$("#zout");
  if(zi)zi.disabled=ZOOM>=ZMAX-0.001;
  if(zo)zo.disabled=ZOOM<=ZMIN+0.001;
  body.classList.toggle("zoomed",ZOOM>1.001);
}
/* Zoom in on the page you are reading, not on the middle of the book. */
function centreOnFocus(){
  var desk=$("#desk"),slot=$(FOCUS?"#slotR":"#slotL");
  if(!desk||!slot||!body.classList.contains("open"))return;
  var r=slot.getBoundingClientRect(),d=desk.getBoundingClientRect();
  desk.scrollLeft+=(r.left+r.width/2)-(d.left+d.width/2);
  desk.scrollTop+=(r.top+r.height/2)-(d.top+d.height/2);
}
function setZoom(z,at){
  z=Math.max(ZMIN,Math.min(ZMAX,z));
  if(Math.abs(z-ZOOM)<0.0005)return;
  var desk=$("#desk"),keep=null;
  if(at&&desk){                       /* zooming at the pointer keeps what is under it still */
    var d=desk.getBoundingClientRect();
    keep={x:(desk.scrollLeft+at.x-d.left)/ZOOM,y:(desk.scrollTop+at.y-d.top)/ZOOM,
          px:at.x-d.left,py:at.y-d.top};
  }
  ZOOM=z;applyScale();
  if(keep&&desk){desk.scrollLeft=keep.x*ZOOM-keep.px;desk.scrollTop=keep.y*ZOOM-keep.py;}
  else centreOnFocus();
}
function zoomFit(){ZOOM=1;applyScale();var d=$("#desk");if(d){d.scrollLeft=0;d.scrollTop=0;}}

/* ------------------------------ pagination ----------------------------- */
/* Walk the source in order, drop each block on the current leaf, and start a new leaf the moment
   it does not fit. A block taller than a whole page is split where it can be — table rows — and
   otherwise left to overflow, because a silently missing paragraph is worse than a full page. */
function atoms(src){
  var out=[];
  [].forEach.call(src.children,function(sec){
    if(sec.classList.contains("titlepage")){out.push({el:sec,brk:1,solo:1,chap:""});return;}
    if(sec.classList.contains("contents")){
      out.push({el:sec.querySelector(".ct-h"),brk:1,chap:"Contents"});
      out.push({el:sec.querySelector(".ct-note"),chap:"Contents"});
      [].forEach.call(sec.querySelectorAll(".ct-ch"),function(g){out.push({el:g,chap:"Contents"});});
      return;
    }
    if(!sec.classList.contains("chapter"))return;
    var title=sec.getAttribute("data-title")||"";
    out.push({el:sec.querySelector("header.ch-h"),brk:1,chap:title});
    [].forEach.call(sec.querySelectorAll(".sec"),function(s){
      [].forEach.call(s.children,function(el){out.push({el:el,chap:title});});
    });
  });
  return out;
}

function newLeaf(chap){
  var leaf=document.createElement("div");
  leaf.className="leaf";
  leaf.style.width=GEO.w+"px";leaf.style.height=GEO.h+"px";
  var b=document.createElement("div");b.className="leaf-b";
  var f=document.createElement("div");f.className="leaf-f";
  f.innerHTML='<span class="rh"></span><span class="pn">'+(LEAVES.length+1)+'</span>';
  f.querySelector(".rh").textContent=chap||"";
  leaf.appendChild(b);leaf.appendChild(f);
  $("#store").appendChild(leaf);
  LEAVES.push(leaf);
  return leaf;
}

/* A run of like things — contents lines, a list, a glossary — splits between its children rather
   than jumping whole to the next page and leaving a third of this one empty. */
function splitKids(el,bd,chap){
  var kids=[].slice.call(el.children);
  if(el.parentNode)el.parentNode.removeChild(el);
  if(!kids.length){bd.appendChild(el);return bd;}
  var cur=el.cloneNode(false);bd.appendChild(cur);
  for(var i=0;i<kids.length;i++){
    cur.appendChild(kids[i]);
    if(bd.scrollHeight<=bd.clientHeight)continue;
    if(cur.children.length>1){
      // the ordinary break: end the run here and carry on overleaf
      cur.removeChild(kids[i]);
      bd=newLeaf(chap).querySelector(".leaf-b");
      cur=el.cloneNode(false);bd.appendChild(cur);
      cur.appendChild(kids[i]);
    }else if(bd.children.length>1){
      // The run's FIRST item does not fit under what is already on this leaf. Leaving it here is
      // what hung a list item, or a chapter's block of index lines, off the bottom of the page —
      // printed nowhere, and a reader cannot notice a line they were never shown. Take it over.
      bd.removeChild(cur);
      bd=newLeaf(chap).querySelector(".leaf-b");
      cur=el.cloneNode(false);bd.appendChild(cur);
      cur.appendChild(kids[i]);
    }
    // else: one item, alone on a leaf, taller than a whole page. Nothing can be done with that.
  }
  return bd;
}
function splittable(el){
  return el.tagName==="TABLE"||el.tagName==="UL"||el.tagName==="OL"||el.tagName==="DL"
    ||el.classList.contains("ct-ch");
}
function splitAny(el,bd,chap){
  if(el.tagName==="TABLE")return splitRows(el,bd,chap);
  if(splittable(el))return splitKids(el,bd,chap);
  return bd;
}

/* a table longer than a page: fill, break, and repeat the head on the next one */
function splitRows(el,bd,chap){
  var head=el.querySelector("thead"),rows=[].slice.call(el.querySelectorAll("tbody > tr"));
  if(!rows.length)return bd;
  var mk=function(){
    var t=el.cloneNode(false);
    if(head)t.appendChild(head.cloneNode(true));
    var tb=document.createElement("tbody");t.appendChild(tb);
    return {t:t,tb:tb};
  };
  if(el.parentNode)el.parentNode.removeChild(el);
  var cur=mk();bd.appendChild(cur.t);
  for(var i=0;i<rows.length;i++){
    cur.tb.appendChild(rows[i]);
    if(bd.scrollHeight<=bd.clientHeight)continue;
    if(cur.tb.children.length>1){
      // the ordinary break: end the table here and carry on overleaf, head repeated
      cur.tb.removeChild(rows[i]);
      bd=newLeaf(chap).querySelector(".leaf-b");
      cur=mk();bd.appendChild(cur.t);
      cur.tb.appendChild(rows[i]);
    }else if(bd.children.length>1){
      // The table's FIRST row does not fit under what is already on this leaf. Leaving it here
      // is what clipped a row in half at the foot of a page: the head printed, the row started,
      // and its second line was never anywhere. Take the whole table overleaf instead.
      bd.removeChild(cur.t);
      bd=newLeaf(chap).querySelector(".leaf-b");
      cur=mk();bd.appendChild(cur.t);
      cur.tb.appendChild(rows[i]);
    }
    // else: one row, alone on a leaf, taller than a whole page. Nothing can be done with that
    // one but print it, and no table in this book has such a row.
  }
  return bd;
}

/* Pagination moves blocks out of the source and into leaves, so it eats what it reads. Rather
   than put the source back afterwards — which has to be exactly right every time, and is only
   ever one missed case from a book with no contents in it — the source is lifted out of the
   document once and kept as a template. Every run works on a fresh copy of it, so running twice
   is the same as running once, and there is only ever one of each id in the document. */
var TEMPLATE=null;
function paginate(){
  var store=$("#store");
  if(!TEMPLATE){
    var src=$("#source");
    TEMPLATE=src.cloneNode(true);
    src.parentNode.removeChild(src);
  }
  var work=TEMPLATE.cloneNode(true);
  body.classList.remove("ready");
  /* The two leaves on show are not on the stack, so clearing the stack alone leaves them alive —
     and put() then files them back in, ahead of the new book. That is a whole spread printed
     twice and every page after it off by two. Throw the old pages away first. */
  [].forEach.call(document.querySelectorAll("#slotL,#slotR,#flip .front,#flip .back"),
    function(e){e.textContent="";});
  store.textContent="";LEAVES=[];PAGE_OF={};HITS=[];HIT=-1;
  GEO={w:PAGE.w,h:PAGE.h};
  var list=atoms(work),leaf=null,bd=null,lastChap="";
  for(var i=0;i<list.length;i++){
    var a=list[i];
    if(!a.el)continue;
    if(!leaf||a.brk){leaf=newLeaf(a.chap);bd=leaf.querySelector(".leaf-b");}
    lastChap=a.chap;
    bd.appendChild(a.el);
    if(bd.scrollHeight>bd.clientHeight){
      if(bd.children.length===1){
        bd=splitAny(a.el,bd,a.chap);           /* taller than an empty page: split it where it can */
      }else if(splittable(a.el)){
        bd=splitAny(a.el,bd,a.chap);           /* fill the rest of this page, carry on over the leaf */
      }else{
        bd.removeChild(a.el);
        /* never leave a heading standing alone at the foot of a page */
        var carry=[];
        while(bd.lastElementChild&&/^H[23]$/.test(bd.lastElementChild.tagName))
          carry.push(bd.removeChild(bd.lastElementChild));
        bd=newLeaf(a.chap).querySelector(".leaf-b");
        while(carry.length)bd.appendChild(carry.pop());
        bd.appendChild(a.el);
        if(bd.scrollHeight>bd.clientHeight&&bd.children.length===1)bd=splitAny(a.el,bd,a.chap);
      }
      leaf=LEAVES[LEAVES.length-1];
    }
    if(a.solo)leaf=null;
  }
  /* a spread is two leaves, so an odd count gets a blank at the back */
  if(LEAVES.length%2)newLeaf(lastChap);
  LEAVES.forEach(function(lf,i){
    lf.setAttribute("data-pg",i+1);
    // How much of this leaf hangs off the bottom, written down while the leaf is still laid out.
    // Once the book is ready the store is display:none, and nothing in it can be measured at all —
    // a check that measures it afterwards is reading zeroes and passing on them.
    var lb=lf.querySelector(".leaf-b");
    lf.setAttribute("data-over",String(Math.max(0,lb.scrollHeight-lb.clientHeight)));
    [].forEach.call(lf.querySelectorAll("[id]"),function(e){PAGE_OF[e.id]=i;});
  });
  [].forEach.call(document.querySelectorAll(".ct-p"),function(e){
    var p=PAGE_OF[e.getAttribute("data-pg")];
    e.textContent=p==null?"—":String(p+1);
  });
  body.classList.add("ready");
  sizeBook();
  show(Math.min(SPREAD,spreads()-1),true);
  var q=$("#q");
  if(q&&q.value.trim())search(q.value);   /* the marks went with the old leaves */
}

function sizeBook(){
  [].forEach.call(document.querySelectorAll(".slot,.flip .face"),function(e){
    e.style.width=GEO.w+"px";e.style.height=GEO.h+"px";});
  var f=$("#flip");f.style.width=GEO.w+"px";f.style.height=GEO.h+"px";
  var c=$("#closed");
  var cw=Math.round(GEO.w*1.06);
  c.style.width=cw+"px";c.style.height=Math.round(GEO.h*1.04)+"px";
  c.style.setProperty("--cw",cw+"px");
  fit();
}

/* ------------------------------- turning ------------------------------- */
function spreads(){return Math.max(1,Math.ceil(LEAVES.length/2));}
function pagerText(){
  var el=$("#pager");if(!el||!LEAVES.length)return;
  var a=SPREAD*2+1,b=Math.min(SPREAD*2+2,LEAVES.length);
  el.innerHTML='<span><b>'+a+'–'+b+'</b> of '+LEAVES.length+' &nbsp;·&nbsp; '
    +(ZOOM>1.001?'drag to move &nbsp;·&nbsp; 0 to fit':'click a page to turn it')+'</span>';
}
/* A leaf is always somewhere in the document — in a slot, in the flipper, or back on the stack.
   Emptying a slot with textContent="" detaches whatever was in it, and since only the two leaves
   of the current spread are put back, every turn used to drop a page out of the document. It
   still looked right, because turning back re-appends it; but the page stopped being findable —
   by an anchor, by a jump from the index, by anything that asks the document where something is. */
function stack(el){var st=$("#store");while(el&&el.firstChild)st.appendChild(el.firstChild);}
function put(sel,leaf){var s=$(sel);stack(s);if(leaf)s.appendChild(leaf);}
function show(i,quiet){
  SPREAD=Math.max(0,Math.min(i,spreads()-1));
  if(ZOOM>1.001)setTimeout(centreOnFocus,0);
  put("#slotL",LEAVES[SPREAD*2]);put("#slotR",LEAVES[SPREAD*2+1]);
  pagerText();
  $("#zprev").classList.toggle("off",SPREAD===0);
  $("#znext").classList.toggle("off",SPREAD>=spreads()-1);
  if(!quiet)try{history.replaceState(null,"","#p"+(SPREAD*2+1));}catch(e){}
}
function noMotion(){
  try{return window.matchMedia("(prefers-reduced-motion: reduce)").matches;}catch(e){return false;}
}
/* The leaf that swings across carries the page you were reading on its front and the page you
   are turning to on its back, which is what a leaf of a book is. */
function turn(dir){
  if(TURNING)return;
  var to=SPREAD+dir;
  if(to<0||to>=spreads())return;
  if(noMotion()){show(to);return;}
  TURNING=true;
  var flip=$("#flip"),front=flip.querySelector(".front"),back=flip.querySelector(".back");
  front.textContent="";back.textContent="";
  var fLeaf=dir>0?LEAVES[SPREAD*2+1]:LEAVES[SPREAD*2];
  var bLeaf=dir>0?LEAVES[to*2]:LEAVES[to*2+1];
  if(fLeaf)front.appendChild(fLeaf);
  if(bLeaf)back.appendChild(bLeaf);
  if(dir>0)put("#slotR",LEAVES[to*2+1]);else put("#slotL",LEAVES[to*2]);
  flip.style.transition="none";
  flip.style.left=dir>0?"auto":"0";
  flip.style.right=dir>0?"0":"auto";
  flip.style.transformOrigin=dir>0?"left center":"right center";
  flip.style.transform="rotateY(0deg)";
  body.classList.add("turning");
  flip.getBoundingClientRect();
  flip.style.transition="transform .56s cubic-bezier(.36,.06,.24,1)";
  flip.style.transform="rotateY("+(dir>0?-180:180)+"deg)";
  var t,done=function(){
    flip.removeEventListener("transitionend",done);clearTimeout(t);
    body.classList.remove("turning");
    flip.style.transition="none";flip.style.transform="rotateY(0deg)";
    stack(front);stack(back);
    TURNING=false;show(to);
  };
  t=setTimeout(done,780);
  flip.addEventListener("transitionend",done);
}
function goPage(n){
  var s=Math.floor(n/2);
  if(s===SPREAD)return;
  if(Math.abs(s-SPREAD)===1)turn(s>SPREAD?1:-1);else show(s);
}
function goId(id){
  if(PAGE_OF[id]==null)return false;
  FOCUS=(PAGE_OF[id]%2)?1:0;          /* land looking at the page the index named */
  openBook();goPage(PAGE_OF[id]);
  return true;
}

/* -------------------------------- search ------------------------------- */
function clearMarks(){
  [].forEach.call(document.querySelectorAll("mark"),function(m){
    var p=m.parentNode;if(!p)return;
    p.replaceChild(document.createTextNode(m.textContent),m);p.normalize();
  });
  HITS=[];HIT=-1;
}
function markIn(root,term){
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
    if(!n.nodeValue)return NodeFilter.FILTER_REJECT;
    var p=n.parentNode;
    if(p&&/^(SCRIPT|STYLE|MARK)$/.test(p.tagName))return NodeFilter.FILTER_REJECT;
    return n.nodeValue.toLowerCase().indexOf(term)>=0?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
  }});
  var nodes=[],n,made=[];
  while((n=w.nextNode()))nodes.push(n);
  nodes.forEach(function(node){
    var s=node.nodeValue,low=s.toLowerCase(),at=0,frag=document.createDocumentFragment(),i;
    while((i=low.indexOf(term,at))>=0){
      if(i>at)frag.appendChild(document.createTextNode(s.slice(at,i)));
      var m=document.createElement("mark");m.textContent=s.slice(i,i+term.length);
      frag.appendChild(m);made.push(m);at=i+term.length;
    }
    if(at<s.length)frag.appendChild(document.createTextNode(s.slice(at)));
    if(node.parentNode)node.parentNode.replaceChild(frag,node);
  });
  return made;
}
function search(raw){
  clearMarks();
  var term=(raw||"").trim().toLowerCase();
  body.classList.remove("nohits");
  if(term.length<2){$("#scount").textContent="";setBtns();return;}
  LEAVES.forEach(function(leaf,i){
    markIn(leaf,term).forEach(function(m){HITS.push({m:m,p:i});});
  });
  if(!HITS.length){$("#scount").textContent="0 of 0";body.classList.add("nohits");setBtns();return;}
  goHit(0);
}
function goHit(k){
  if(!HITS.length)return;
  HIT=(k+HITS.length)%HITS.length;
  HITS.forEach(function(h){h.m.classList.remove("on");});
  HITS[HIT].m.classList.add("on");
  $("#scount").textContent=(HIT+1)+" of "+HITS.length;
  FOCUS=(HITS[HIT].p%2)?1:0;          /* and at the page the hit is on */
  openBook();show(Math.floor(HITS[HIT].p/2));
  setBtns();
}
function setBtns(){$("#sprev").disabled=HITS.length<2;$("#snext").disabled=HITS.length<2;}

/* -------------------------------- opening ------------------------------ */
function openBook(){
  if(body.classList.contains("open"))return;
  if(noMotion()){body.classList.add("open");return;}
  body.classList.add("opening");
  setTimeout(function(){body.classList.add("open");body.classList.remove("opening");},600);
}
function closeBook(){body.classList.remove("open","opening");zoomFit();show(0,true);}

/* --------------------------------- wire -------------------------------- */
function wire(){
  $("#closed").addEventListener("click",openBook);
  $("#closed").addEventListener("keydown",function(e){
    if(e.key==="Enter"||e.key===" "){e.preventDefault();openBook();}});
  var spread=document.querySelector(".spread");
  spread.addEventListener("click",function(e){
    if(PANNED)return;                  /* a drag across the page is a pan, not a page-turn */
    if(e.target.closest&&e.target.closest("a,button,input,select,textarea"))return;
    var r=spread.getBoundingClientRect();
    var fwd=e.clientX>=r.left+r.width/2;
    FOCUS=fwd?1:0;                     /* the side you clicked is the side you are reading */
    turn(fwd?1:-1);
  });

  /* ---- zoom ---- */
  var desk=$("#desk");
  $("#zin").addEventListener("click",function(){setZoom(ZOOM*1.25);});
  $("#zout").addEventListener("click",function(){setZoom(ZOOM/1.25);});
  $("#zval").addEventListener("click",zoomFit);
  desk.addEventListener("wheel",function(e){
    if(!(e.ctrlKey||e.metaKey))return;  /* a plain wheel still scrolls the desk */
    e.preventDefault();
    setZoom(ZOOM*(e.deltaY<0?1.12:1/1.12),{x:e.clientX,y:e.clientY});
  },{passive:false});

  /* ---- drag the page around once it is bigger than the window ---- */
  var down=null;
  desk.addEventListener("mousedown",function(e){
    if(ZOOM<=1.001||e.button!==0)return;
    if(e.target.closest&&e.target.closest("a,button,input,select,textarea"))return;
    down={x:e.clientX,y:e.clientY,l:desk.scrollLeft,t:desk.scrollTop};PANNED=false;
  });
  window.addEventListener("mousemove",function(e){
    if(!down)return;
    var dx=e.clientX-down.x,dy=e.clientY-down.y;
    if(!PANNED&&Math.abs(dx)+Math.abs(dy)<6)return;
    PANNED=true;body.classList.add("panning");
    desk.scrollLeft=down.l-dx;desk.scrollTop=down.t-dy;
  });
  window.addEventListener("mouseup",function(){
    down=null;body.classList.remove("panning");
    if(PANNED)setTimeout(function(){PANNED=false;},0);   /* swallow the click this drag ends with */
  });
  document.addEventListener("click",function(e){
    if(!e.target.closest)return;
    var a=e.target.closest("[data-jump]");
    if(a){e.preventDefault();goId(a.getAttribute("data-jump"));return;}
    var link=e.target.closest('.leaf a[href^="#"]');
    if(link){e.preventDefault();goId(link.getAttribute("href").slice(1));}
  });
  $("#bcover").addEventListener("click",closeBook);
  $("#bcon").addEventListener("click",function(){if(!goId("contents")){openBook();goPage(1);}});
  $("#q").addEventListener("input",function(){search(this.value);});
  $("#snext").addEventListener("click",function(){goHit(HIT+1);});
  $("#sprev").addEventListener("click",function(){goHit(HIT-1);});
  $("#sclr").addEventListener("click",function(){$("#q").value="";search("");$("#q").focus();});
  document.addEventListener("keydown",function(e){
    var typing=e.target&&e.target.id==="q";
    if(e.key==="/"&&!typing){e.preventDefault();$("#q").focus();return;}
    if(typing){
      if(e.key==="Enter"){e.preventDefault();goHit(HIT+(e.shiftKey?-1:1));}
      if(e.key==="Escape"){$("#q").value="";search("");$("#q").blur();}
      return;
    }
    if(e.key==="+"||e.key==="="){e.preventDefault();setZoom(ZOOM*1.25);return;}
    if(e.key==="-"||e.key==="_"){e.preventDefault();setZoom(ZOOM/1.25);return;}
    if(e.key==="0"){e.preventDefault();zoomFit();return;}
    if(e.key==="ArrowRight"||e.key==="PageDown"||e.key===" "){e.preventDefault();openBook();turn(1);}
    else if(e.key==="ArrowLeft"||e.key==="PageUp"){e.preventDefault();turn(-1);}
    else if(e.key==="Home"){e.preventDefault();show(0);}
    else if(e.key==="End"){e.preventDefault();show(spreads()-1);}
    else if(e.key==="Escape")closeBook();
  });
  window.addEventListener("resize",fit);   /* the book does not repaginate: it is the same book */
}

/* Where the game is — the same rule the game uses to find the handbook. */
(function(){
  var a=document.getElementById("back");
  try{
    var h=location.hostname,file=location.protocol==="file:";
    if(!(file||/(^|\\.)github\\.io$/.test(h)||h==="localhost"||h==="127.0.0.1"))
      a.href="https://claude.ai/artifact/4epD8iym482mpSqEj7ZJhN";
  }catch(e){}
})();

/* Every page here is measured, so wait for the faces the book is set in. */
function boot(){
  paginate();wire();
  /* Pagination is a measurement, so it is only true for the faces it measured. A font that
     arrives after this — a slow CDN, or a stylesheet injected later — changes every line's
     height and leaves the last block on each page hanging over the edge. Measure again when
     one lands; the reader keeps their place, because paginate() shows the spread it was on. */
  try{
    if(document.fonts&&document.fonts.addEventListener)
      document.fonts.addEventListener("loadingdone",function(){paginate();});
  }catch(e){}
  if(location.hash&&/^#p\\d+$/.test(location.hash)){openBook();goPage(parseInt(location.hash.slice(2),10)-1);}
}
if(document.fonts&&document.fonts.ready&&document.fonts.ready.then)
  document.fonts.ready.then(boot,boot);
else window.addEventListener("load",boot);

/* hb-pdf.js calls this before printing: every leaf back in #store, in the order you turn them. */
window.bookForPrint=function(){
  var f=$("#flip");
  stack($("#slotL"));stack($("#slotR"));stack(f.querySelector(".front"));stack(f.querySelector(".back"));
  var store=$("#store");
  /* Two pixels of slack. A leaf exactly as tall as the sheet rounds over it by a sub-pixel and
     spills onto the next one, and from there every page drifts — which is how 58 leaves printed
     as 62 sheets with two page-feet on some of them. */
  LEAVES.forEach(function(l){l.style.height=(GEO.h-2)+"px";l.style.overflow="hidden";store.appendChild(l);});
  return {pages:LEAVES.length,w:GEO.w,h:GEO.h};
};
window.bookPages=function(){return LEAVES.length;};
window.bookPageOf=function(id){return PAGE_OF[id]==null?null:PAGE_OF[id]+1;};
window.bookSpread=function(){return SPREAD;};
window.bookOpen=function(){return document.body.classList.contains("open");};
window.bookTurn=function(d){turn(d);};
window.bookRepaginate=function(){paginate();return LEAVES.length;};
window.bookGoPage=function(n){openBook();goPage(n-1);return SPREAD;};
window.bookZoom=function(z){if(z!==undefined)setZoom(z);return ZOOM;};
window.bookZoomFit=function(){zoomFit();return ZOOM;};
window.bookFocus=function(){return FOCUS;};
`;

/* --------------------------------- page --------------------------------- */
const html=`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>The Crew — Player's Handbook</title>
<meta name="description" content="Every rule, number and screen in The Crew — a book you open and turn, with a pinned search bar and a clickable index.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23f6f4ee'/%3E%3Crect x='6' y='4' width='20' height='24' fill='none' stroke='%23111010' stroke-width='2.5'/%3E%3Cpath d='M10 11h12M10 16h12M10 21h7' stroke='%23111010' stroke-width='2'/%3E%3C/svg%3E">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@500;600;700&family=Spectral:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>${CSS}</style>
</head><body>

<div class="bar">
  <div class="brand">THE CREW<small>Player's Handbook</small></div>
  <div class="sbox">
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
    <input id="q" type="text" placeholder="Search the handbook — a rule, a number, a word  ( / )" autocomplete="off" spellcheck="false" aria-label="Search the handbook">
    <span class="scount" id="scount"></span>
    <button class="sbtn" id="sprev" title="Previous match (Shift+Enter)" aria-label="Previous match" disabled>‹</button>
    <button class="sbtn" id="snext" title="Next match (Enter)" aria-label="Next match" disabled>›</button>
    <button class="sbtn" id="sclr" title="Clear (Esc)" aria-label="Clear search">✕</button>
  </div>
  <div class="zoom">
    <button class="sbtn" id="zout" title="Zoom out (−)" aria-label="Zoom out">−</button>
    <button class="zval" id="zval" title="Fit the window (0)" aria-label="Fit the window">100%</button>
    <button class="sbtn" id="zin" title="Zoom in (+)" aria-label="Zoom in">+</button>
  </div>
  <div class="nav">
    <button class="nbtn" id="bcover">Cover</button>
    <button class="nbtn" id="bcon">Contents</button>
    <a class="nbtn solid" id="back" href="play.html">← The game</a>
  </div>
</div>

<div class="desk" id="desk">
 <div class="deskin">
  <div class="closed" id="closed" role="button" tabindex="0" aria-label="Open the handbook">
    ${cover}
  </div>

  <div class="bookwrap" id="bookwrap"><div class="book" id="book">
    <div class="spread">
      <div class="edge l"></div><div class="edge r"></div>
      <div class="slot left" id="slotL"></div>
      <div class="slot right" id="slotR"></div>
      <div class="spine"></div>
      <div class="zone prev" id="zprev" title="Previous page"></div>
      <div class="zone next" id="znext" title="Next page"></div>
      <div class="flip" id="flip"><div class="face front"></div><div class="face back"></div></div>
    </div>
  </div></div>
 </div>
</div>

<div class="opencue">Click the book to open it</div>
<div class="pager" id="pager"></div>
<div class="nores"><b>Nothing in the handbook says that.</b><p>Try a shorter word — the search looks at every line, every table row and every glossary entry.</p></div>

<div id="store"></div>

<div id="source">
<section class="titlepage">
  <h1>The Crew</h1>
  <div class="tp-sub">Player's Handbook</div>
  <hr>
  <p>Every rule the game plays by, every number on every screen, and where to find all of it.</p>
  <p>We are the criminals. A crew of five, thousands of jobs, and a border in front of every one of them.</p>
  <p>Nothing in this handbook is invented. Every figure in it is read out of the game itself.</p>
  <div><span class="stamp">For the commander</span></div>
  <div class="tp-foot">${BUILD} · ${CH.length} chapters</div>
</section>

${contents}

${chapters}
</div>

<script>${JS}</script>
</body></html>
`;

const out=path.join(__dirname,"handbook.html");
fs.writeFileSync(out,html);

/* What hb-pages.py looks for in the rendered PDF, so the index can be checked against the book
   that actually came out rather than simply trusted. */
const heads=[];
CH.forEach(c=>{
  heads.push({id:c.id,find:"Chapter "+c.no+" ·",once:true});
  c.secs.filter(s=>s.t).forEach(s=>heads.push({id:s.id,find:s.no+" "+s.t}));
});
fs.writeFileSync(path.join(__dirname,"headings.json"),JSON.stringify(heads,null,0));
console.log("wrote "+out+"  "+(html.length/1024).toFixed(1)+"KB  "+CH.length+" chapters, "+
  CH.reduce((n,c)=>n+c.secs.filter(s=>s.t).length,0)+" sections, "+FACES.length+" faces on the cover");

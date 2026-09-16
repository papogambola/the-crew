/* Builds handbook.html out of hb-text.js (prose) and hb-data.js (the game's own tables).
   Page numbers come from pages.json, which is written by reading the rendered PDF back — so the
   index says the page the subject is actually on, not a guess. Run with no pages.json for pass 1. */
const fs=require("fs");
const path=require("path");
const {CH}=require("./hb-text.js");
const G=require("./hb-data.js");
const BUILD=G.D.BUILD;

let PG={};
try{PG=JSON.parse(fs.readFileSync(path.join(__dirname,"pages.json"),"utf8"));}catch(e){}

/* ------------------------------ numbering ------------------------------ */
CH.forEach((c,i)=>{
  c.no=i+1;
  c.secs.forEach((s,j)=>{s.no=(i+1)+"."+(j+1);});
});
const pgOf=id=>PG[id]!=null?String(PG[id]):"—";

/* ------------------------------- contents ------------------------------ */
const contents='<section id="contents" class="contents">'
  +'<h2 class="ct-h">Contents</h2>'
  +'<p class="ct-note">Every subject in this handbook, and the page it is on. Click any line to jump straight to it.</p>'
  +CH.map(c=>'<div class="ct-ch"><a class="ct-c" href="#'+c.id+'" data-jump="'+c.id+'"><span class="ct-n">'+c.no+'</span>'
      +'<span class="ct-t">'+c.t+'</span><span class="ct-l"></span><span class="ct-p" data-pg="'+c.id+'">'+pgOf(c.id)+'</span></a>'
    +c.secs.filter(s=>s.t).map(s=>'<a class="ct-s" href="#'+s.id+'" data-jump="'+s.id+'"><span class="ct-n">'+s.no+'</span>'
      +'<span class="ct-t">'+s.t+'</span><span class="ct-l"></span><span class="ct-p" data-pg="'+s.id+'">'+pgOf(s.id)+'</span></a>').join("")
    +'</div>').join("")
  +'</section>';

/* ------------------------------- chapters ------------------------------ */
const chapters=CH.map(c=>'<section class="chapter" id="'+c.id+'" data-ch="'+c.id+'">'
  +'<header class="ch-h"><div class="ch-n">'+c.no+'</div><h2>'+c.t+'</h2>'
    +'<div class="ch-k">Chapter '+c.no+' · '+c.k+'</div></header>'
  +c.secs.map(s=>'<section class="sec" id="'+s.id+'">'
      +(s.t?'<h3><span class="s-n">'+s.no+'</span>'+s.t+'</h3>':'')+s.h+'</section>').join("")
  +'</section>').join("");

/* --------------------------------- CSS --------------------------------- */
const CSS=`
:root{
  --paper:#f6f4ee; --paper-2:#efece3; --card:#fbfaf6;
  --ink:#111010; --ink-2:#4a463e; --muted:#726c60;
  --line:#d9d5c8; --line-2:#c4bfae;
  --stamp:#9a2b1e; --good:#2f6b34; --warn:#8a6212;
  --f-logo:"Anton","Impact","Oswald","Arial Narrow",sans-serif;
  --f-disp:"Oswald","Arial Narrow",system-ui,sans-serif;
  --f-body:"Spectral","Iowan Old Style",Georgia,serif;
  --f-mono:"IBM Plex Mono",ui-monospace,"SFMono-Regular",Menlo,monospace;
  color-scheme:light;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--paper-2);color:var(--ink);font-family:var(--f-body);font-size:14.5px;line-height:1.72;
  -webkit-font-smoothing:antialiased}
a{color:inherit}

/* ---- the pinned bar ---- */
.bar{position:fixed;top:0;left:0;right:0;z-index:60;background:var(--paper);border-bottom:2px solid var(--ink);
  display:flex;align-items:center;gap:14px;padding:9px 18px;box-shadow:0 8px 20px -18px rgba(17,16,16,.7)}
.bar .brand{font-family:var(--f-logo);font-size:21px;letter-spacing:.5px;white-space:nowrap;line-height:1}
.bar .brand small{font-family:var(--f-disp);font-weight:600;font-size:11px;letter-spacing:2.2px;display:block;color:var(--muted);margin-top:2px}
.sbox{flex:1;display:flex;align-items:center;gap:8px;border:1.5px solid var(--ink);background:var(--card);
  padding:0 10px;height:36px;max-width:640px;position:relative}
.sbox svg{flex:0 0 14px;opacity:.65}
#q{flex:1;border:0;outline:0;background:transparent;font-family:var(--f-mono);font-size:13px;color:var(--ink);height:34px}
#q::placeholder{color:var(--muted)}
.scount{font-family:var(--f-mono);font-size:11px;color:var(--muted);white-space:nowrap}
.sbtn{border:1px solid var(--line-2);background:var(--card);color:var(--ink);font-family:var(--f-mono);font-size:12px;
  width:24px;height:24px;line-height:1;cursor:pointer;padding:0}
.sbtn:hover:not(:disabled){background:var(--ink);color:var(--paper)}
.sbtn:disabled{opacity:.3;cursor:default}
.nav{display:flex;gap:8px;margin-left:auto}
.nbtn{font-family:var(--f-disp);font-weight:600;font-size:11.5px;letter-spacing:1.3px;text-transform:uppercase;
  border:1.5px solid var(--ink);background:var(--card);color:var(--ink);padding:8px 13px;cursor:pointer;text-decoration:none;white-space:nowrap}
.nbtn:hover{background:var(--ink);color:var(--paper)}
.nbtn.solid{background:var(--ink);color:var(--paper)}
.nbtn.solid:hover{background:var(--stamp);border-color:var(--stamp)}

/* ---- the page ---- */
/* 718px is the printable width of an A4 page at these margins, so what is measured on screen is
   what the PDF gets. max-width only matters on a screen narrower than the page, where it stops the
   whole document scrolling sideways. */
.sheet{width:718px;max-width:100%;margin:0 auto;background:var(--card);
  border-left:1px solid var(--line);border-right:1px solid var(--line);padding:0 0 60px}
body{overflow-x:hidden}
.pad{padding:0 34px}
main{padding-top:74px}

/* ---- cover ---- */
.cover{height:1017px;display:flex;flex-direction:column;justify-content:center;padding:0 54px;position:relative}
.cover .eyebrow{font-family:var(--f-disp);font-weight:600;letter-spacing:4px;text-transform:uppercase;font-size:11px;color:var(--muted)}
.cover h1{font-family:var(--f-logo);font-size:92px;line-height:.92;margin:14px 0 0;letter-spacing:1px}
.cover h1 span{display:block;font-size:34px;letter-spacing:5px;margin-top:16px;font-family:var(--f-disp);font-weight:700}
.cover hr{border:0;border-top:2px solid var(--ink);margin:26px 0}
.cover p{font-size:15px;line-height:1.8;max-width:520px}
.cover .stamp{position:absolute;right:54px;bottom:96px;border:2.5px solid var(--stamp);color:var(--stamp);
  font-family:var(--f-disp);font-weight:700;letter-spacing:3px;font-size:13px;padding:9px 15px;transform:rotate(-7deg);text-transform:uppercase}
.cover .foot{position:absolute;left:54px;bottom:54px;font-family:var(--f-mono);font-size:11px;color:var(--muted)}

/* ---- contents ---- */
.contents{padding:40px 34px 24px}
.ct-h{font-family:var(--f-logo);font-size:40px;margin:0;letter-spacing:.5px}
.ct-note{font-size:13px;color:var(--ink-2);margin:4px 0 20px;border-bottom:2px solid var(--ink);padding-bottom:14px}
.ct-ch{margin-bottom:13px}
.ct-c{display:flex;align-items:baseline;gap:8px;text-decoration:none;font-family:var(--f-disp);font-weight:700;
  font-size:15.5px;letter-spacing:.3px;padding:3px 0 4px;border-bottom:1px solid var(--line)}
.ct-s{display:flex;align-items:baseline;gap:8px;text-decoration:none;font-family:var(--f-body);font-size:12.5px;
  color:var(--ink-2);padding:1.5px 0 1.5px 30px}
.ct-c:hover,.ct-s:hover{color:var(--stamp)}
.ct-c .ct-n{min-width:24px;font-size:12px;color:var(--ink)}
.ct-n{font-family:var(--f-mono);font-size:10.5px;color:var(--muted);min-width:34px;flex:0 0 auto}
.ct-l{flex:1;border-bottom:1px dotted var(--line-2);transform:translateY(-3px);min-width:14px}
.ct-c .ct-l{border-bottom:0}
.ct-p{font-family:var(--f-mono);font-size:11.5px;min-width:22px;text-align:right;flex:0 0 auto}
.ct-c .ct-p{font-weight:500}

/* ---- chapters ---- */
.chapter{padding:0 34px}
.ch-h{border-top:3px solid var(--ink);border-bottom:1px solid var(--line-2);padding:16px 0 12px;margin:36px 0 22px;position:relative}
.ch-n{font-family:var(--f-logo);font-size:52px;line-height:.8;color:var(--line-2);position:absolute;right:0;top:12px}
.ch-h h2{font-family:var(--f-logo);font-size:33px;margin:0;letter-spacing:.4px;padding-right:60px}
.ch-k{font-family:var(--f-disp);font-weight:600;letter-spacing:2.4px;text-transform:uppercase;font-size:10.5px;color:var(--muted);margin-top:5px}
.sec{margin-bottom:26px}
.sec h3{font-family:var(--f-disp);font-weight:700;font-size:16.5px;letter-spacing:.3px;margin:22px 0 8px;
  border-bottom:1px solid var(--line);padding-bottom:5px;display:flex;gap:9px;align-items:baseline}
.s-n{font-family:var(--f-mono);font-size:11px;color:var(--muted);font-weight:400}
p{margin:0 0 10px}
.aside{border-left:3px solid var(--ink);background:var(--paper-2);padding:9px 12px;font-size:13.5px;margin:12px 0}
ul,ol{margin:0 0 12px;padding-left:22px}
li{margin-bottom:5px}
ol.steps{padding-left:20px}
ol.twenty{padding-left:24px;counter-reset:none}
ol.twenty li{margin-bottom:9px}
.mono{font-family:var(--f-mono);font-size:.92em}
b,strong{font-weight:600}
.formula{border:1px solid var(--line-2);background:var(--paper-2);padding:11px 14px;margin:10px 0;font-family:var(--f-mono);font-size:12px;line-height:1.85}

/* ---- tables ---- */
table{width:100%;border-collapse:collapse;margin:10px 0 14px;font-size:12.2px;line-height:1.6}
th{font-family:var(--f-disp);font-weight:600;letter-spacing:1.4px;text-transform:uppercase;font-size:9.5px;color:var(--muted);
  text-align:left;border-bottom:1.5px solid var(--ink);padding:4px 7px 4px 0;vertical-align:bottom}
td{border-bottom:1px solid var(--line);padding:5px 7px 5px 0;vertical-align:top}
td:last-child,th:last-child{padding-right:0}
tbody tr:last-child td{border-bottom:1.5px solid var(--ink)}
.stamp{color:var(--stamp)}
.note{color:var(--muted);font-style:italic}

/* ---- glossary ---- */
dl.gloss{margin:8px 0}
dl.gloss .gl{margin-top:9px;break-inside:avoid}
dl.gloss dt{font-family:var(--f-disp);font-weight:600;font-size:13px;letter-spacing:.3px}
dl.gloss dd{margin:1px 0 0;padding-left:16px;font-size:13px;color:var(--ink-2);border-left:1px solid var(--line)}

/* ---- search ---- */
mark{background:#ffe9a8;color:var(--ink);padding:0 1px;box-shadow:inset 0 -1px 0 #d8b23c}
mark.on{background:var(--stamp);color:var(--paper);box-shadow:none}
.hb-hide{display:none !important}
.nores{display:none;padding:60px 34px;text-align:center}
body.searching .nores.show{display:block}
.nores b{font-family:var(--f-disp);font-size:18px;letter-spacing:.4px}
.nores p{color:var(--muted);font-size:13px}
body.searching .contents,body.searching .cover{display:none}
.hint{font-family:var(--f-mono);font-size:11px;color:var(--muted)}

/* ---- floating buttons ---- */
.float{position:fixed;right:22px;bottom:22px;z-index:55;display:flex;flex-direction:column;gap:8px;
  opacity:0;pointer-events:none;transition:opacity .18s}
.float.show{opacity:1;pointer-events:auto}
.float button{font-family:var(--f-disp);font-weight:600;font-size:11px;letter-spacing:1.3px;text-transform:uppercase;
  border:1.5px solid var(--ink);background:var(--card);color:var(--ink);padding:9px 13px;cursor:pointer;
  box-shadow:0 8px 20px -14px rgba(17,16,16,.8)}
.float button:hover{background:var(--ink);color:var(--paper)}

/* ---- print ---- */
@media print{
  @page{size:A4;margin:12mm 10mm 16mm}
  html{scroll-behavior:auto}
  body{background:#fff;font-size:11.4pt}
  .bar,.float,.nores{display:none !important}
  main{padding-top:0}
  .sheet{width:auto;border:0;background:#fff;padding:0}
  .pad,.chapter,.contents{padding-left:0;padding-right:0}
  .cover{height:1017px;padding:0 10px}
  .contents{padding-top:0;break-after:page}
  .chapter{break-before:page}
  .ch-h{margin-top:0}
  a{text-decoration:none}
  tr,li,.aside,.formula{break-inside:avoid}
  h3,thead{break-after:avoid}
  p{orphans:2;widows:2}
}
`;

/* -------------------------------- script -------------------------------- */
const JS=`
(function(){
  "use strict";
  /* Back to the game. index.html is right wherever this file is served beside the game — Pages, or
     a copy on disk. Anywhere else (an artifact runs on its own sandboxed origin, which is not
     claude.ai and is not predictable) the only address that certainly reaches the game is the
     artifact's, and it has to open in a new tab because a sandboxed frame may not navigate itself. */
  var GAME_ARTIFACT="https://claude.ai/artifact/4epD8iym482mpSqEj7ZJhN";
  window.gameHref=function(host,proto){
    if(proto==="file:")return "index.html";
    return /(^|\\.)github\\.io$/.test(host||"")||host==="localhost"||host==="127.0.0.1"?"index.html":GAME_ARTIFACT;
  };
  var back=document.getElementById("back");
  try{
    back.href=window.gameHref(location.hostname,location.protocol);
    if(back.href!=="index.html"&&/^https?:/.test(back.getAttribute("href"))){back.target="_blank";back.rel="noopener";}
  }catch(e){ back.href="index.html"; }

  /* ---------------- search ---------------- */
  var q=document.getElementById("q"), count=document.getElementById("scount"),
      prev=document.getElementById("sprev"), next=document.getElementById("snext"), clr=document.getElementById("sclr"),
      nores=document.querySelector(".nores");
  var BLOCKS=[].slice.call(document.querySelectorAll(
    ".chapter p, .chapter li, .chapter tbody tr, .chapter .gl, .chapter .formula div"));
  var HEADS=[].slice.call(document.querySelectorAll(".chapter h3, .chapter .ch-h"));
  BLOCKS.concat(HEADS).forEach(function(b){ b.dataset.o=b.innerHTML; });
  var hits=[], at=-1, timer=null;

  function restore(){
    BLOCKS.concat(HEADS).forEach(function(b){ if(b.innerHTML!==b.dataset.o)b.innerHTML=b.dataset.o; b.classList.remove("hb-hide"); });
    document.querySelectorAll(".chapter,.sec,.chapter table").forEach(function(s){ s.classList.remove("hb-hide"); });
    document.body.classList.remove("searching");
    nores.classList.remove("show");
    hits=[];at=-1;count.textContent="";prev.disabled=next.disabled=true;
  }
  function mark(el,rx){
    var w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null), t=[], n;
    while((n=w.nextNode()))t.push(n);
    var found=0;
    t.forEach(function(node){
      var s=node.nodeValue; rx.lastIndex=0;
      if(!rx.test(s))return;
      rx.lastIndex=0;
      var frag=document.createDocumentFragment(), last=0, mres;
      while((mres=rx.exec(s))){
        if(mres.index>last)frag.appendChild(document.createTextNode(s.slice(last,mres.index)));
        var mk=document.createElement("mark");mk.textContent=mres[0];frag.appendChild(mk);
        last=mres.index+mres[0].length;found++;
        if(rx.lastIndex===mres.index)rx.lastIndex++;
      }
      if(last<s.length)frag.appendChild(document.createTextNode(s.slice(last)));
      node.parentNode.replaceChild(frag,node);
    });
    return found;
  }
  function run(){
    var s=q.value.trim();
    if(s.length<2){restore();return;}
    restore();
    document.body.classList.add("searching");
    var rx=new RegExp(s.replace(/[.*+?^\${}()|[\\]\\\\]/g,"\\\\$&"),"gi");
    var total=0;
    BLOCKS.forEach(function(b){
      rx.lastIndex=0;
      if(rx.test(b.textContent||"")){ total+=mark(b,rx); } else { b.classList.add("hb-hide"); }
    });
    // A heading is not a result on its own — it is the name of one. When a heading matches, the
    // thing the reader wanted is everything under it, so the whole section (or chapter) comes back.
    HEADS.forEach(function(h){
      rx.lastIndex=0;
      if(!rx.test(h.textContent||""))return;
      total+=mark(h,rx);
      var scope=h.classList.contains("ch-h")?h.closest(".chapter"):h.closest(".sec");
      if(scope)scope.querySelectorAll(".hb-hide").forEach(function(x){x.classList.remove("hb-hide");});
    });
    document.querySelectorAll(".sec").forEach(function(sec){
      if(!sec.querySelector("mark"))sec.classList.add("hb-hide");
    });
    document.querySelectorAll(".chapter").forEach(function(c){
      if(!c.querySelector("mark"))c.classList.add("hb-hide");
    });
    // a table head with every row hidden under it is a label for nothing
    document.querySelectorAll(".chapter table").forEach(function(t){
      if(!t.querySelector("tbody tr:not(.hb-hide)"))t.classList.add("hb-hide");
    });
    hits=[].slice.call(document.querySelectorAll(".chapter:not(.hb-hide) mark"));
    at=-1;
    var chs=document.querySelectorAll(".chapter:not(.hb-hide)").length;
    count.textContent=hits.length?(hits.length+" match"+(hits.length===1?"":"es")+" in "+
      chs+" chapter"+(chs===1?"":"s")):"nothing found";
    nores.classList.toggle("show",!hits.length);
    prev.disabled=next.disabled=!hits.length;
    if(hits.length)go(0);
  }
  function go(i){
    if(!hits.length)return;
    if(at>=0&&hits[at])hits[at].classList.remove("on");
    at=(i+hits.length)%hits.length;
    hits[at].classList.add("on");
    var r=hits[at].getBoundingClientRect();
    window.scrollTo({top:window.scrollY+r.top-160,behavior:"smooth"});
    count.textContent=(at+1)+" of "+hits.length;
  }
  q.addEventListener("input",function(){clearTimeout(timer);timer=setTimeout(run,120);});
  q.addEventListener("keydown",function(e){
    if(e.key==="Enter"){e.preventDefault();go(at+(e.shiftKey?-1:1));}
    if(e.key==="Escape"){q.value="";restore();}
  });
  next.addEventListener("click",function(){go(at+1);});
  prev.addEventListener("click",function(){go(at-1);});
  clr.addEventListener("click",function(){q.value="";restore();q.focus();});
  document.addEventListener("keydown",function(e){
    if(e.key==="/"&&document.activeElement!==q){e.preventDefault();q.focus();q.select();}
    if(e.key==="Escape"&&document.activeElement!==q&&document.body.classList.contains("searching")){q.value="";restore();}
  });

  /* ---------------- top / contents ---------------- */
  var fl=document.querySelector(".float");
  function toTop(){window.scrollTo({top:0,behavior:"smooth"});}
  document.getElementById("ftop").addEventListener("click",toTop);
  document.getElementById("btop").addEventListener("click",toTop);
  document.getElementById("fcon").addEventListener("click",function(){
    if(document.body.classList.contains("searching")){q.value="";restore();}
    document.getElementById("contents").scrollIntoView({behavior:"smooth",block:"start"});
  });
  document.getElementById("bcon").addEventListener("click",function(){
    if(document.body.classList.contains("searching")){q.value="";restore();}
    document.getElementById("contents").scrollIntoView({behavior:"smooth",block:"start"});
  });
  window.addEventListener("scroll",function(){ fl.classList.toggle("show",window.scrollY>420); },{passive:true});

  /* a jump from the contents while a search is running has to clear the search first */
  document.querySelectorAll("[data-jump]").forEach(function(a){
    a.addEventListener("click",function(e){
      e.preventDefault();
      if(document.body.classList.contains("searching")){q.value="";restore();}
      var el=document.getElementById(a.dataset.jump);
      if(el)window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-84,behavior:"smooth"});
      history.replaceState(null,"","#"+a.dataset.jump);
    });
  });
})();
`;

/* --------------------------------- page --------------------------------- */
const html=`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>The Crew — Player's Handbook</title>
<meta name="description" content="Every rule, number and screen in The Crew, with a search bar and a clickable index.">
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
  <div class="nav">
    <button class="nbtn" id="btop">↑ Top</button>
    <button class="nbtn" id="bcon">Contents</button>
    <a class="nbtn solid" id="back" href="index.html">← The game</a>
  </div>
</div>

<main><div class="sheet">

<section class="cover">
  <div class="eyebrow">Case file · Classified</div>
  <h1>The Crew<span>Player's Handbook</span></h1>
  <hr>
  <p>Every rule the game plays by, every number on every screen, and where to find all of it.
     We are the criminals. A crew of five, thousands of jobs, and a border in front of every one of them.</p>
  <p>Nothing in this handbook is invented. Every figure in it is read out of the game itself.</p>
  <div class="stamp">For the commander</div>
  <div class="foot">${BUILD} · ${CH.length} chapters</div>
</section>

${contents}

${chapters}

<div class="nores"><b>Nothing in the handbook says that.</b><p>Try a shorter word — the search looks at every line, every table row and every glossary entry.</p></div>

</div></main>

<div class="float">
  <button id="ftop">↑ Top</button>
  <button id="fcon">Contents</button>
</div>

<script>${JS}</script>
</body></html>
`;

const out=path.join(__dirname,"handbook.html");
fs.writeFileSync(out,html);

/* What hb-pages.py looks for in the rendered PDF. A chapter is found by its kicker, which appears
   nowhere else in the document; a section by its number and title, which appears twice — in the
   contents and in the body — and the body one is always the later of the two. */
const heads=[];
CH.forEach(c=>{
  heads.push({id:c.id,find:"Chapter "+c.no+" ·",once:true});
  c.secs.filter(s=>s.t).forEach(s=>heads.push({id:s.id,find:s.no+" "+s.t}));
});
fs.writeFileSync(path.join(__dirname,"headings.json"),JSON.stringify(heads,null,0));
console.log("wrote "+out+"  "+(html.length/1024).toFixed(1)+"KB  "+CH.length+" chapters, "+
  CH.reduce((n,c)=>n+c.secs.filter(s=>s.t).length,0)+" sections, page numbers "+(Object.keys(PG).length?"from pages.json":"NOT YET SET"));

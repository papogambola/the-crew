// Build 27: a client who takes a botched job personally.
const fs=require("fs");
const src=fs.readFileSync(__dirname+"/thecrew_check.js","utf8");
const ELS={};
function mkEl(id){const el={id,style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false;},toggle(){}},children:[],dataset:{},innerHTML:"",value:"",textContent:"",hidden:false,scrollTop:0,scrollHeight:0,setAttribute(){},getAttribute(){return null;},appendChild(){},insertAdjacentHTML(p,h){el.innerHTML+=h;},querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){},removeEventListener(){},getBoundingClientRect(){return{left:0,top:0,width:100,height:100,right:100,bottom:100};},focus(){},select(){},play(){return Promise.resolve();},pause(){},load(){},scrollIntoView(){},closest(){return null;},remove(){},contains(){return false;},setSelectionRange(){},paused:true,volume:1,loop:false,src:""};return el;}
global.store={};const store=global.store;
global.localStorage={getItem:k=>store[k]===undefined?null:store[k],setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}};
global.document={getElementById:id=>ELS[id]||(ELS[id]=mkEl(id)),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},createElement:t=>mkEl(t),body:mkEl("body"),documentElement:mkEl("html"),hidden:false};
global.window={matchMedia:()=>({matches:false}),addEventListener(){},scrollTo(){},innerWidth:1200,innerHeight:800,localStorage:global.localStorage,document:global.document,location:{href:"",search:""},navigator:{language:"en"}};
global.navigator={language:"en"};global.requestAnimationFrame=()=>0;global.Audio=function(){return mkEl("audio");};global.fetch=()=>Promise.reject(new Error("x"));global.URL=global.URL||{};global.URL.createObjectURL=()=>"blob:x";global.scrollTo=()=>{};global.setInterval=()=>1;global.clearInterval=()=>{};
const TESTS=`
;(function(){
const assert=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;throw new Error(m);}else console.log("ok  "+m);};

// ---------- every passport in the game can name somebody ----------
const bad=[];
COUNTRIES.forEach(co=>{
  if(!co.pool||!NAMES[co.pool])bad.push(co.name+" points at "+JSON.stringify(co.pool));
});
assert(!bad.length,"all "+COUNTRIES.length+" passports point at a name pool that exists"+(bad.length?": "+bad.join(", "):""));

let worst=null;
COUNTRIES.forEach(co=>{
  const pool=NAMES[co.pool];
  for(let i=0;i<12;i++){
    ["M","F"].forEach(g=>{
      const n=nameFor(freshRng(),co.name,g);
      const sp=n.indexOf(" ");
      const first=n.slice(0,sp),last=n.slice(sp+1);
      const okFirst=(g==="F"?pool.f:pool.m).indexOf(first)>=0;
      const okLast=pool.s.indexOf(last)>=0;
      if(!okFirst||!okLast)worst=co.name+" ("+g+") gave "+JSON.stringify(n);
    });
  }
});
assert(!worst,"and every name it gives comes from that pool, for a man and for a woman"+(worst?" — "+worst:""));

// ---------- it is the same door the roster goes through ----------
const co=COUNTRIES.find(c=>c.name==="Japan")||COUNTRIES[0];
const pool=NAMES[co.pool];
const roster=buildRoster(12345).filter(c=>c.nat===co.name).slice(0,25);
assert(roster.length>0,roster.length+" files on the roster carry a "+co.name+" passport");
const off=roster.filter(c=>{const sp=c.n.indexOf(" ");const first=c.n.slice(0,sp);
  return (pool.m.indexOf(first)<0&&pool.f.indexOf(first)<0);});
assert(!off.length,"and they are named from the same pool the button uses ("+co.pool+")");

// ---------- a passport the game has never heard of still gives a name ----------
const oddly=nameFor(freshRng(),"Nowhere At All","M");
assert(/^\\S+ \\S+$/.test(oddly),"an unknown passport still gives a first name and a surname: "+JSON.stringify(oddly));

// ---------- and it is not the same name twice in a row, most of the time ----------
const seen={};let n=0;
for(let i=0;i<200;i++){const x=nameFor(freshRng(),"France","F");if(!seen[x]){seen[x]=1;n++;}}
assert(n>60,"two hundred rolls on one passport give "+n+" different names");

// ---------- the pools are regional, and the test says so rather than pretending otherwise ----------
const share={};
COUNTRIES.forEach(c=>{(share[c.pool]=share[c.pool]||[]).push(c.name);});
const shared=Object.keys(share).filter(k=>share[k].length>1);
assert(shared.length>0,"the pools are shared between countries by region — "+shared.length+" of the "+Object.keys(share).length+" cover more than one passport");
assert(share[COUNTRY_BY_NAME.Japan.pool].length>1,
  "so Japan draws from the same list as "+share[COUNTRY_BY_NAME.Japan.pool].filter(x=>x!=="Japan").join(", ")+", which is a region and not a country");

console.log("ALL OK");
})();
`;
require("vm").runInThisContext(src+"\n"+TESTS,{filename:"t36.js"});

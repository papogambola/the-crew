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
const drain=()=>{let n=0;while(S.notices&&S.notices.length&&n++<40)noticeDone();if(S.modal&&S.modal.type==="notice")S.modal=null;S.loose=[];};
draft={name:"Sim",gender:"M",nat:"Israel",role:"commander",tech:"launderer",avseed:21,profile:null};rollDraftProfile();
newGame(Object.assign({id:"YOU",isPlayer:true,n:"Sim",first:"Sim",gender:"M",nat:"Israel",avseed:21,status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,vetFlag:false,limits:[]},draft.profile));
if(TUT.on)tutEnd();
S.money=5e8;drain();

// ---------- five places, and every trade stands in one of them ----------
assert(SITES.length===5,"a job happens in five places: "+SITES.join(", "));
SITES.forEach(k=>assert(SITE_BY_K[k]===k,k+" can be looked up by key"));
assert(TRIP_SITES.length===4,"a recruitment trip happens in four: "+TRIP_SITES.join(", "));
TRIP_SITES.forEach(k=>assert(TRIP_SITE_BY_K[k]===k,k+" can be looked up by key"));
TECHS.forEach(t=>assert(SITE_BY_K[techSite(t.k)],t.l+" works at "+techSite(t.k)));
assert(techSite("wheelman")==="exit","the wheelman never leaves the car");
assert(techSite("lookout")==="watch"&&techSite("overwatch")==="watch","the lookout and the overwatch are on the corner");
assert(techSite("safecracker")==="inside","the safecracker is in the room");
assert(techSite("forger")==="door","the forger is at the way in");
assert(SITE_BY_K[techSite("nonesuch")],"a trade nobody has heard of still stands somewhere");

// ---------- the feed says where every line happens ----------
const sign=t=>{const c=S.roster.find(x=>x.status==="available"&&x.tech===t&&canSign(x));
  if(c&&recruits().length<crewSeats()){c.status="crew";c._touched=true;S.crewIds.push(c.id);return c;}return null;};
let job=null;
for(const cand of S.jobs.filter(x=>!x.final)){
  cand.techs.forEach(t=>{if(!recruits().some(c=>c.tech===t))sign(t);});
  while(recruits().length<crewSeats()){const x=S.roster.find(c=>c.status==="available"&&canSign(c));if(!x)break;sign(x.tech);}
  cand.need=Math.min(cand.need,recruits().length+1);
  if(assessJob(cand,jobPool(cand)).canRun){job=cand;break;}
}
assert(job,"a posting the crew can run: "+(job&&job.title));
const a=assessJob(job,jobPool(job));
const N=narrate(job,a,3,freshRng(),{take:1000,cuts:100,net:900,heatGain:5,fallout:[],betrayals:[]},"all",null);
assert(N.lines.length>4,"it writes a feed of "+N.lines.length+" lines");
assert(N.lines[0].at==="road"&&N.lines[0].who==="*","it opens with the whole crew on the street");
N.lines.forEach(l=>{if(l.at)assert(SITE_BY_K[l.at],"every place a line names is one of the five ("+l.at+")");});
const named=N.lines.filter(l=>l.who&&l.who!=="*");
assert(named.length>0,named.length+" lines are about one person");
named.forEach(l=>assert(l.at,"and each of them says where: "+JSON.stringify(l.x.slice(0,42))));
named.forEach(l=>assert(l.who==="*"||byId(l.who),"and names somebody who exists"));

// the lines with no place at all are the aftermath, and they are at the end
const last=N.lines.map((l,i)=>l.at?i:-1).reduce((p,q)=>Math.max(p,q),-1);
assert(N.lines.slice(last+1).every(l=>!l.at),"the only lines with no place are the "+(N.lines.length-1-last)+" after the crew have gone");
assert(last>=0,"and they are at the end, not scattered through it");

// a trade beat stands where that trade works
const byLabel={};TECHS.forEach(t=>byLabel[t.l]=t.k);
const beats=N.lines.map(l=>{const m=/^(\\S+) \\(([^)]+)\\) /.exec(l.x);return m&&byLabel[m[2]]?{l,k:byLabel[m[2]],who:m[1]}:null;}).filter(Boolean);
if(beats.length){beats.forEach(b=>assert(b.l.at===techSite(b.k),b.who+" the "+b.k+" is at "+b.l.at));}
else assert(true,"no trade beat in this feed — the crew stood in for all of them");

// ---------- the clock the feed keeps ----------
assert(/^\\d\\d:\\d\\d$/.test(N.lines[0].t),"every line is stamped with a time ("+N.lines[0].t+")");
const mins=N.lines.map(l=>+l.t.slice(0,2)*60+ +l.t.slice(3));
let forward=true;for(let i=1;i<mins.length;i++)if(mins[i]<mins[i-1]&&mins[i-1]-mins[i]<1000)forward=forward&&(mins[i-1]-mins[i]>1200);
assert(forward,"and the clock only ever goes forward: "+N.lines[0].t+" to "+N.lines[N.lines.length-1].t);

// ---------- and nothing is left of the plan that was drawn from them ----------
// The five places were five dots on a plan of the street, with the crew standing under them as
// marks of what they were doing. All of that is gone — it said nothing the sentence had not
// already said — and this checks it is gone rather than half gone: a leftover scene builder or
// glyph table would sit in the file being carried for nobody.
//
// typeof, not "name in globalThis". A top-level const is NOT a property of the global object, so
// the \`in\` form answers false for FM_GLYPH whether or not FM_GLYPH exists — an assertion that
// cannot fail, which is worse than no assertion. typeof reads the lexical binding and tells the
// two apart.
assert(typeof fmFrame==="undefined","fmFrame() is gone, not merely unused");
assert(typeof fmSitePos==="undefined","fmSitePos() is gone");
assert(typeof fmSpot==="undefined","fmSpot() is gone");
assert(typeof fmLayout==="undefined","fmLayout() is gone");
assert(typeof fmSceneFor==="undefined","fmSceneFor() is gone");
assert(typeof fmShort==="undefined","fmShort() is gone");
assert(typeof fmGlyphFor==="undefined","fmGlyphFor() is gone");
assert(typeof feedMap==="undefined","feedMap() is gone");
assert(typeof feedMapStep==="undefined","feedMapStep() is gone");
assert(typeof feedSites==="undefined","feedSites() is gone");
assert(typeof feedSiteBy==="undefined","feedSiteBy() is gone");
assert(typeof scJob==="undefined"&&typeof scTrip==="undefined","the scene builders are gone");
assert(typeof scStreets==="undefined"&&typeof scTerrain==="undefined","and so is what they drew with");
assert(typeof FM_GLYPH==="undefined","FM_GLYPH is gone");
assert(typeof FM_SITE_GLYPH==="undefined"&&typeof FM_TECH_GLYPH==="undefined","and both glyph maps with it");
assert(typeof TRIP_SITE_GLYPH==="undefined","the trip's glyphs too");
assert(typeof FM_OP_SCALE==="undefined","FM_OP_SCALE is gone");
assert(typeof SC_W==="undefined"&&typeof SC_CACHE==="undefined","and the plan's page and its cache");
// f1 and fmHash were the plan's and are not the plan's any more: one formats the skyline's numbers,
// the other is the hash every drawing's id is built from. Both must survive the clear-out.
assert(typeof f1==="function"&&f1(1.234)==="1.2","f1() stayed — the skyline still needs it");
assert(typeof fmHash==="function"&&fmHash("x")===fmHash("x")&&fmHash("x")!==fmHash("y"),
  "and fmHash() stayed, because every drawing's id is built on it");

console.log("ALL OK");
})();
`;
require("vm").runInThisContext(src+"\n"+TESTS,{filename:"t35.js"});

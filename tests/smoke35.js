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
assert(SITES.length===5,"a job happens in five places: "+SITES.map(p=>p.l).join(", "));
SITES.forEach(p=>{assert(SITE_BY_K[p.k]===p,p.l+" can be looked up by key");
  assert(p.x>0&&p.x<100&&p.y>0&&p.y<62,p.l+" is on the plan ("+p.x+","+p.y+")");});
TECHS.forEach(t=>assert(SITE_BY_K[techSite(t.k)],t.l+" works at "+SITE_BY_K[techSite(t.k)].l));
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

// ---------- the clock the map shows is the clock the feed keeps ----------
assert(/^\\d\\d:\\d\\d$/.test(N.lines[0].t),"every line is stamped with a time ("+N.lines[0].t+")");
const mins=N.lines.map(l=>+l.t.slice(0,2)*60+ +l.t.slice(3));
let forward=true;for(let i=1;i<mins.length;i++)if(mins[i]<mins[i-1]&&mins[i-1]-mins[i]<1000)forward=forward&&(mins[i-1]-mins[i]>1200);
assert(forward,"and the clock only ever goes forward: "+N.lines[0].t+" to "+N.lines[N.lines.length-1].t);

// ---------- the ring never stacks people, at any crew size ----------
let worst=999,top=999;
for(let n=1;n<=7;n++)for(let i=0;i<n;i++){
  top=Math.min(top,fmSpot(i,n,1).dy);
  for(let j=i+1;j<n;j++){const p=fmSpot(i,n,1),q=fmSpot(j,n,1);
    worst=Math.min(worst,Math.hypot(p.dx-q.dx,p.dy-q.dy));}}
assert(worst>5.5,"nobody is drawn on top of anybody, at one to seven in the field (closest "+Math.round(worst*10)/10+" against a 5.5-wide disc)");
assert(top>1.5,"and nobody stands on the place's own name, which sits above the marker ("+top+" below it)");
assert(fmSpot(0,1,1).dx===0,"one person stands under the marker rather than beside it");

// ---------- the frame is a plan of the place, drawn from the posting ----------
// It used to be the world map zoomed in on the job's country, and fmFrame took a country name.
// It is a plan of the actual place now, and fmFrame takes the feed's data, so what is asked of it
// is what the plan promises: the same posting always draws the same place, two postings draw
// different ones, and the five places are somewhere on it.
const F=fmFrame({id:job.id,job:job});
assert(F.w>0&&F.h>0,"the plan has a size: "+F.w+" by "+F.h);
assert(F.svg&&F.svg.length>1000,"and real ink on it ("+F.svg.length+" characters of it)");
assert(fmFrame({id:job.id,job:job}).svg===F.svg,"a posting always draws the same plan");
const other=S.jobs.find(j=>j!==job&&!j.final);
if(other)assert(fmFrame({id:other.id,job:other}).svg!==F.svg,"and two postings draw different ones");
SITES.forEach(p=>{const q=fmSitePos(p.k,F);
  assert(q.x>=0&&q.x<=F.w&&q.y>=0&&q.y<=F.h,p.l+" is somewhere on the plan");});

// ---------- every mark the game can draw is a mark it has ----------
Object.keys(FM_SITE_GLYPH).forEach(k=>assert(FM_GLYPH[FM_SITE_GLYPH[k]],"the "+SITE_BY_K[k].l+" has a mark"));
TECHS.forEach(t=>assert(FM_GLYPH[FM_TECH_GLYPH[t.k]],t.l+" has a mark of its own"));
assert(FM_TECH_GLYPH.wheelman==="drive"&&FM_TECH_GLYPH.lookout==="watch"&&FM_TECH_GLYPH.forger==="paper",
  "and the mark says the trade: a wheel, an eye, a document");
assert(fmGlyphFor({at:"road"},null)==="walk","arriving is a figure on foot");
assert(fmGlyphFor({act:"down"},null)==="down","somebody going down is marked as that, whatever the place");
assert(fmGlyphFor({at:"exit"},{tech:"wheelman"})==="drive","the wheelman at the car is a wheel");
assert(fmGlyphFor({at:"exit"},{tech:"safecracker"})==="drive","and somebody else at the car is just at the car");
assert(FM_GLYPH[fmGlyphFor({at:"nowhere"},null)],"a place the game does not know still gets a mark");

console.log("ALL OK");
})();
`;
require("vm").runInThisContext(src+"\n"+TESTS,{filename:"t35.js"});

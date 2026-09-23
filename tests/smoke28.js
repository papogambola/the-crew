// Build 23: standing in for a trade the crew has not got.
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
// Hiring is a week-long trip with an outcome now (smoke30 covers it). These suites are about
// other systems, so they put somebody on the crew directly — the same transitions finishTrip
// makes when the answer is yes.
const signOn=(id)=>{const c=byId(id);if(!c||c.status!=="available")return null;
  if(recruits().length>=crewSeats())return null;
  if(!canSign(c))return null;
  S.money=Math.max(0,S.money-c.fee);c.status="crew";c._touched=true;S.crewIds.push(c.id);stats().hired++;return c;};

const html=()=>document.getElementById("root").innerHTML;

// ---------- the wording ----------
assert(NOTECH.length>=4,NOTECH.length+" ways to say nobody here has the trade");
const flat=NOTECH.map(p=>p.join(" ")).join(" ");
assert(flat.indexOf("video")<0,"nobody watches a video about it any more");
assert(flat.indexOf("{aT}")>=0,"the article is built by anA(), so it is never \\"a Enforcer\\"");
// The rule is that nobody stands in cold: the week before the job is spent on the trade, which is
// what the +1 brains for standing by is paying for. Said in prose it can be a week of learning, a
// week's practice, a manual, or having done the thing once before — so the test asks for the
// meaning rather than for four particular verbs. ("A week's practice" has a c in it.)
const PREPARED=/learn|read|practis|practice|taught|manual|done it/;
const cold=NOTECH.filter(p=>!(PREPARED.test(p[0])&&PREPARED.test(p[1])));
assert(cold.length===0,"nobody stands in cold — every line says the week before went on the trade"
  +(cold.length?": "+cold.map(p=>'"'+p[1]+'"').join(" / "):""));
assert(NOTECH.every(p=>p[0].indexOf("{X}")>=0),"each has a name slot for the crew member");
assert(NOTECH.every(p=>/\\b[Yy]ou\\b/.test(p[1])&&p[1].indexOf("{X}")<0),"and a second-person form for the player");
assert(anA("Enforcer")==="an Enforcer"&&anA("Wheelman")==="a Wheelman"&&anA("Operator")==="an Operator",
  "anA: an Enforcer, a Wheelman, an Operator");
// the user's own line, filled
const sample=fill2(NOTECH[1][0],{X:"Adaeze",T:"Enforcer",aT:anA("Enforcer")});
assert(sample==="Nobody here is an Enforcer; Adaeze was learning the trade before the operation.","the line reads: "+sample);
TECHS.forEach(t=>NOTECH.forEach(p=>{
  const s=fill2(p[0],{X:"Adaeze",T:t.l,aT:anA(t.l)});
  assert(s.indexOf("{")<0,"no placeholder survives: "+s.slice(0,50));
  assert(!/\\ba [AEIOU]/.test(s),"no \\"a Enforcer\\" in: "+s.slice(0,50));
}));

// ---------- upList groups repeats ----------
assert(upList(["brains"])==="+1 BRN","one point reads +1 BRN");
assert(upList(["brains","brains"])==="+2 BRN","two points of one attribute read +2 BRN, not twice");
assert(upList(["muscle","brains"])==="+1 MUS, +1 BRN","two attributes are listed in order");
assert(upList([])==="","nothing learned renders as nothing");
assert(EXP.some(r=>/^[AEIOU]/.test(r)),"a rank starts with a vowel ("+EXP.join(", ")+")");
assert(EXP.every(r=>!/^a [AEIOU]/.test(anA(r))),"and none of them reads \\"now a Operator\\"");

// ---------- a game ----------
draft={name:"Paz",gender:"M",nat:"Israel",role:"commander",tech:"launderer",avseed:7,profile:null};rollDraftProfile();
newGame(Object.assign({id:"YOU",isPlayer:true,n:"Paz",first:"Paz",gender:"M",nat:"Israel",avseed:7,status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,vetFlag:false,limits:[]},draft.profile));
if(TUT.on)tutEnd();
S.money=5e6;S.notices=[];S.milestones={};
// a deliberately narrow crew, so most postings want a trade nobody has
["wheelman","forger","hacker"].forEach(t=>{const c=S.roster.find(c=>c.status==="available"&&c.tech===t&&c.exp<=3&&!c.limits.length);if(c)signOn(c.id);});
assert(field().length>=3,"a crew of "+field().length);
const gap=j=>{const a=assessJob(j);return a.team.length>=2&&j.techs.some(t=>!a.team.some(c=>c.tech===t));};
function findGap(){for(let w=0;w<80;w++){const j=S.jobs.find(x=>!x.final&&gap(x));if(j)return j;S.jobs=[];refreshJobs(true);}return null;}

// A job with no twist finishes inside startJob, so the only way to force the verdict is to catch
// the pending job on its way through. Wrap finishJob, set the roll, hand it to the real one.
const realFinish=finishJob;
let grabbed=null;
function drive(job,o){
  o=o||{};grabbed=null;
  finishJob=function(P,ci,d){grabbed=P;if(o.roll!==undefined)P.roll=o.roll;if(o.strip)delete P.stood;return realFinish(P,ci,d);};
  try{return startJob(job,{noTwist:true,pool:o.pool||null});}finally{finishJob=realFinish;}
}

// ---------- a success pays the week of reading ----------
const j1=findGap();
assert(!!j1,"a posting that wants a trade the crew has not got: "+(j1&&j1.title));
const brainsBefore={};field().forEach(c=>{brainsBefore[c.id]=c.attrs.brains;});
const d1=drive(j1,{roll:400});
const P1=grabbed;
assert(Array.isArray(P1.stood)&&P1.stood.length>0,"the report records who stood in ("+P1.stood.length+")");
assert(P1.stood.every(s=>P1.teamIds.indexOf(s.id)>=0),"and they were on the job");
// The line the feed actually prints is one of the ten, so it is looked for by the same rule as
// the pool rather than by the four phrasings the pool happened to have when this was written.
const line=d1.narrative.map(l=>l.x).find(x=>PREPARED.test(x)&&/No .* on the crew|Nobody here is/.test(x));
assert(!!line,"the minute-by-minute says it: "+(line||d1.narrative.map(l=>l.x).find(x=>/on the crew|Nobody here/.test(x))||"nothing about standing in at all"));
assert(!/\\ba [AEIOU]/.test(line),"with the right article");
const stoodIds=P1.stood.map(s=>s.id);
assert(d1.tier>=3,"forced to a success ("+d1.verdictName+")");
const credited=d1.growth.filter(g=>g.stood);
assert(credited.length>0,"What they learned names the stand-in: "+credited.map(g=>g.first+" as "+g.stood).join(", "));
assert(credited.every(g=>g.up.filter(a=>a==="brains").length>=1),"and each of them got a point of brains");
assert(credited.every(g=>g.up.filter(a=>a==="brains").length<=2),"a point on top of the ordinary gain, never a pile");
assert(credited.every(g=>g.stood.split(/, | and /).every(p=>TECHS.some(t=>anA(t.l)===p))),"every trade named is a real one");
assert(listAnd(["a Fixer"])==="a Fixer"&&listAnd(["a Fixer","a Face"])==="a Fixer and a Face"
  &&listAnd(["a Fixer","a Face","a Cleaner"])==="a Fixer, a Face and a Cleaner","two trades read as a list, not a repeat");
// two gaps are two people's weeks, not one person's, while the crew is bigger than the gaps
if(stoodIds.length>=2&&P1.teamIds.length>stoodIds.length)
  assert(new Set(stoodIds).size===stoodIds.length,stoodIds.length+" gaps spread across "+new Set(stoodIds).size+" of the "+P1.teamIds.length+" who went");
// and a crew smaller than the number of gaps still learns one thing each — bench people down to
// two and take a posting that wants three trades, so somebody has to cover two of them
let t3=null,pool=null;
for(let r=0;r<20&&!t3;r++){
  for(const x of S.jobs){
    if(x.final)continue;
    const a=assessJob(x);if(a.team.length<2)continue;
    const p=a.team.slice(0,2);
    if(assessJob(x,p).team.length!==2)continue;   // a border or a limit would thin the pair
    x.techs=TECHS.filter(t=>!p.some(c=>c.tech===t.k)).slice(0,3).map(t=>t.k);
    if(assessJob(x,p).team.length!==2)continue;
    t3=x;pool=p;break;
  }
  if(!t3){S.jobs=[];refreshJobs(true);}
}
assert(!!t3,"a posting rewritten to want three trades a pair of two has none of");
const dd=drive(t3,{roll:400,pool});
const ids=grabbed.stood.map(s=>s.id);
assert(ids.length===3,"three gaps on it ("+ids.length+")");
assert(new Set(ids).size<ids.length,"a crew of "+grabbed.teamIds.length+" against three gaps: somebody covers two");
const cr=dd.growth.filter(g=>g.stood);
assert(cr.every(g=>g.up.filter(a=>a==="brains").length<=2),"and it is still one point each: "+cr.map(g=>g.first+" as "+g.stood).join("; "));
assert(cr.some(g=>g.stood.indexOf(" and ")>0),"named as a list, not a repeat: "+cr.map(g=>g.stood).join("; "));
const bumped=field().filter(c=>stoodIds.indexOf(c.id)>=0);
assert(bumped.length>0&&bumped.every(c=>c.attrs.brains>=brainsBefore[c.id]+1),"the point is on the file, not only on the screen");
// it shows on the result screen
S.event=null;S.notices=[];d1.revealed=d1.narrative.length;d1.done=true;S.modal={type:"result",data:d1};render();
const h1=html();
assert(h1.indexOf("What they learned")>=0,"the result screen has the What they learned block");
assert(h1.indexOf("stood in as")>=0,"and says stood in as");
assert(h1.indexOf("stood in as "+esc(credited[0].stood))>=0,"naming the trade with its article: stood in as "+credited[0].stood);
assert(h1.indexOf("+1 BRN")>=0||h1.indexOf("+2 BRN")>=0,"beside the point of brains it bought");
assert(!/\\+1 ([A-Z]{3}), \\+1 \\1/.test(h1),"no attribute is listed twice on one line");
assert(!/now a [AEIOU]/.test(h1),"and no \\"now a Operator\\"");

// ---------- a job that does not come off teaches nothing ----------
S.modal=null;
const j2=findGap();
assert(!!j2,"a second posting missing a trade");
const before2={};field().forEach(c=>{before2[c.id]=c.attrs.brains;});
const d2=drive(j2,{roll:-400});
const ids2=grabbed.stood.map(s=>s.id);
assert(ids2.length>0,"somebody stood in on it too");
assert(d2.tier<3,"forced to a failure ("+d2.verdictName+")");
assert(d2.growth.every(g=>!g.stood),"nobody is credited for a job that did not come off");
assert(field().filter(c=>ids2.indexOf(c.id)>=0).every(c=>c.attrs.brains===before2[c.id]),"and nobody's brains moved for it");

// ---------- a pending job saved before this build still finishes ----------
const j3=findGap()||S.jobs.find(x=>!x.final);
let threw=null,d3=null;
try{d3=drive(j3,{roll:400,strip:true});}catch(e){threw=e;}
assert(!threw,"a pending job saved before this build still finishes"+(threw?": "+threw:""));
assert(d3&&d3.growth.every(g=>!g.stood),"and credits nobody");

// ---------- it survives a save ----------
// A job only stays pending when a twist stops it mid-way, and that is the only way a stood list
// is ever written to disk. Put one back on the board with a twist and round-trip it.
// Arrange the gap rather than hope the board still has one — by this point the crew has been
// through several jobs, and a board with nothing they cannot cover makes this test measure
// a coincidence instead of the save.
const j4=findGap();
assert(!!j4,"a posting that still wants a trade nobody has: "+(j4&&j4.title));
let P4=null;
finishJob=function(P,ci,d){P4=JSON.parse(JSON.stringify(P));return realFinish(P,ci,d);};
try{startJob(j4,{noTwist:true});}finally{finishJob=realFinish;}
assert(P4&&P4.stood&&P4.stood.length>0,"a pending job with a stood list: "+JSON.stringify(P4.stood));
const want=JSON.stringify(P4.stood);
S.pendingJob=Object.assign(P4,{twist:makeTwist(P4.job,P4.teamIds.map(byId).filter(Boolean),freshRng())});
save();load();
assert(!!S.pendingJob,"the half-finished job comes back off the disk");
assert(JSON.stringify(S.pendingJob.stood)===want,"and who stood in comes back with it: "+want);

console.log("ALL OK");
})();
`;
require("vm").runInThisContext(src+"\n"+TESTS,{filename:"t28.js"});

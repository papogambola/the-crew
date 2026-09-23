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
["wheelman","enforcer","fixer","forger"].forEach(t=>{const c=S.roster.find(x=>x.status==="available"&&x.tech===t&&canSign(x));
  if(c&&recruits().length<crewSeats()){c.status="crew";c._touched=true;S.crewIds.push(c.id);}});
assert(field().length>=4,"a crew of "+field().length);

const heal=()=>{S.roster.forEach(c=>{if(c.status==="injured"||c.status==="jailed"){c.status="crew";c.out=0;
  if(S.crewIds.indexOf(c.id)<0&&recruits().length<crewSeats())S.crewIds.push(c.id);}});
  while(recruits().length<4){const x=S.roster.find(y=>y.status==="available"&&canSign(y));if(!x)break;x.status="crew";x._touched=true;S.crewIds.push(x.id);}
  S.money=5e8;};
const realFinish=finishJob;
const BAND=[-60,-24,-2,21,50];
function run(tier){
  heal();
  const j=S.jobs.filter(x=>!x.final&&assessJob(x,jobPool(x)).canRun).sort((a,b)=>a.tier-b.tier)[0];
  if(!j)return null;
  const roll=BAND[tier]-assessJob(j,jobPool(j)).margin;
  finishJob=function(P,ci,d){P.roll=roll;return realFinish(P,ci,d);};
  try{const d=startJob(j,{noTwist:true,pool:jobPool(j)});drain();return {d,job:j};}finally{finishJob=realFinish;}
}

// ---------- nothing is remembered before anything has happened ----------
assert(!S.bondLog||!Object.keys(S.bondLog).length,"a new crew has no history with each other");

// ---------- a bad night is written down, on both sides of every pair ----------
let r=null,tries=0;
while(!r&&tries++<25){const x=run(1);if(x&&x.d.tier<=1&&x.d.teamIds.length>=2)r=x;}
assert(r,"a night that went wrong, with the crew on it");
const ids=r.d.teamIds;
const k=bondKey(ids[0],ids[1]);
assert(S.bondLog&&S.bondLog[k]&&S.bondLog[k].length===1,"the pair remembers one night");
const n1=S.bondLog[k][0];
assert(n1.w===r.d.week,"and it is the week it happened (week "+n1.w+")");
assert(n1.t===r.d.tier,"and the verdict it happened under ("+["DISASTER","BOTCHED","MESSY","SUCCESS","CLEAN"][n1.t]+")");
assert(n1.n===jobNoun(r.job),"and the job it happened on ("+n1.n+")");
assert(n1.c===r.job.country,"and where ("+n1.c+")");
assert(n1.d===-1,"and which way it moved them (-1)");
assert(bondOf(ids[0],ids[1])===-1,"the number agrees with the record");
// every pair on that job, not just the first two
let pairs=0;for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
  if((S.bondLog[bondKey(ids[i],ids[j])]||[]).length===1)pairs++;}
assert(pairs===ids.length*(ids.length-1)/2,"every pair on it remembers it ("+pairs+" pairs)");

// ---------- the story says all of that in words ----------
const story=bondStory(ids[0],ids[1]);
assert(/week /.test(story),"the story gives the week");
assert(story.indexOf(jobNoun(r.job))>=0,"and names the job: "+JSON.stringify(story.split("\\n")[1]));
assert(story.indexOf(r.job.country)>=0,"and the country");
assert(/botched|disaster/i.test(story),"and says what kind of night it was");
assert(story.split("\\n")[0].indexOf(byId(ids[0]).isPlayer?"You":byId(ids[0]).first)===0,"and opens with who: "+JSON.stringify(story.split("\\n")[0]));

// ---------- a good night is written down too, and pulls the other way ----------
let g=null;tries=0;
while(!g&&tries++<25){const x=run(4);if(x&&x.d.tier>=3&&x.d.teamIds.indexOf(ids[0])>=0&&x.d.teamIds.indexOf(ids[1])>=0)g=x;}
if(g){
  assert(S.bondLog[k].length===2,"the same pair now remembers two nights");
  assert(S.bondLog[k][1].d===1,"the second one pulled them back together (+1)");
  assert(bondOf(ids[0],ids[1])===0,"which squares the number at 0");
  assert(bondStory(ids[0],ids[1]).split("\\n").length>=3,"and the story still carries both nights, though the number is nothing");
}else assert(true,"could not force the same pair back onto a clean job; the rest stands");

// ---------- the reckoning factor carries it ----------
let f2=null;tries=0;
while(!f2&&tries++<30){const x=run(1);if(!x)break;
  const jj=S.jobs.find(y=>!y.final&&assessJob(y,jobPool(y)).canRun);
  if(!jj)continue;
  const aa=assessJob(jj,jobPool(jj));
  const bb=aa.factors.find(z=>z.k==="Bad blood");
  if(bb)f2=bb;}
assert(f2,"a job whose reckoning counts bad blood");
assert(f2.tip,"the factor carries a tip");
assert(/What happened between them/.test(f2.tip),"which opens by saying it is the background");
assert(/loses a point for every botched or blown night/.test(f2.tip),"and states the rule that made it");
assert(/week \\d+/.test(f2.tip),"and then gives the nights themselves");

// ---------- a file from before any of this still opens, and says so ----------
const packed=packState();delete packed.bondLog;
store[SAVE_KEY]=JSON.stringify(packed);
assert(load(),"a file saved before the record existed still opens");
const old=bondStory(ids[0],ids[1]);
assert(/before the crew kept a record/.test(old),"and says the nights are not known rather than inventing any: "+JSON.stringify(old.split("\\n")[1]));
assert(old.split("\\n")[0].length>0,"while still saying where they stand");

// ---------- the player is addressed as you, in every one of the six ----------
const YOUID=S.player.id;
[3,2,1,-1,-2,-3].forEach(v=>{
  S.bonds[bondKey(YOUID,ids[1]===YOUID?ids[0]:ids[1])]=v;
  const line=bondStory(YOUID,ids[1]===YOUID?ids[0]:ids[1]).split("\\n")[0];
  assert(/^You (are|have|work|get|would|will) /.test(line),"the player is written to as you at "+(v>0?"+":"")+v+": "+JSON.stringify(line.split("  (")[0]));
});

console.log("ALL OK");
})();
`;
require("vm").runInThisContext(src+"\n"+TESTS,{filename:"t33.js"});

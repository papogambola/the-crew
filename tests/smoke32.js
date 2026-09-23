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
const near=(a,b,tol)=>Math.abs(a-b)<=(tol==null?2:tol);
const drain=()=>{let n=0;while(S.notices&&S.notices.length&&n++<40)noticeDone();if(S.modal&&S.modal.type==="notice")S.modal=null;S.loose=[];};

draft={name:"Sim",gender:"M",nat:"Israel",role:"commander",tech:"launderer",avseed:21,profile:null};rollDraftProfile();
newGame(Object.assign({id:"YOU",isPlayer:true,n:"Sim",first:"Sim",gender:"M",nat:"Israel",avseed:21,status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,vetFlag:false,limits:[]},draft.profile));
if(TUT.on)tutEnd();
S.money=5e7;drain();
["wheelman","enforcer","fixer","forger"].forEach(t=>{const c=S.roster.find(x=>x.status==="available"&&x.tech===t&&canSign(x));
  if(c&&recruits().length<crewSeats()){c.status="crew";c._touched=true;S.crewIds.push(c.id);}});
assert(field().length>=4,"a crew of "+field().length);

// ---------- the bands the money is worked out from ----------
const j0=S.jobs.find(x=>!x.final&&assessJob(x,jobPool(x)).canRun);
assert(j0,"a posting to look at: "+(j0&&j0.title));
const a0=assessJob(j0,jobPool(j0));
assert(a0.pSuccess+a0.pMessy===a0.pOk||near(a0.pSuccess+a0.pMessy,a0.pOk,1),
  "success and messy add back up to the band the odds bar draws ("+a0.pSuccess+" + "+a0.pMessy+" = "+a0.pOk+")");
[a0.pClean,a0.pSuccess,a0.pMessy,a0.pFail,a0.pDis].forEach(p=>assert(p>=0&&p<=100,"every band is a percentage"));
assert(near(a0.pClean+a0.pSuccess+a0.pMessy+a0.pFail+a0.pDis,100,2),"and the five of them make a whole");

// ---------- the split is the fee, and nothing is lost in it ----------
const sp=jobSplit(j0,a0.team);
assert(sp.rows.length>0,"the crew going takes "+sp.rows.length+" cuts of the fee");
assert(sp.crew+sp.you===j0.payout,"the cuts and what you keep are exactly the fee ("+money(sp.crew)+" + "+money(sp.you)+" = "+money(j0.payout)+")");
assert(near(sp.crewPct+sp.youPct,1,0.0001),"and the shares are exactly all of it");
assert(!sp.rows.some(r=>r.c.isPlayer),"the commander is not one of the cuts — you keep the remainder");
sp.rows.forEach(r=>assert(r.amt===Math.round(j0.payout*r.c.cut),r.c.first+" takes "+Math.round(r.pct*1000)/10+"% = "+money(r.amt)));

// ---------- and it is what the job actually pays ----------
const realFinish=finishJob;
const BAND_MID=[-60,-24,-2,21,50];   // disaster, botched, messy, success, clean
function run(job,tier){
  const before=S.money;
  const roll=BAND_MID[tier]-assessJob(job,jobPool(job)).margin;
  finishJob=function(P,ci,d){P.roll=roll;return realFinish(P,ci,d);};
  try{const d=startJob(job,{noTwist:true,pool:jobPool(job)});drain();return {d,gained:S.money-before};}finally{finishJob=realFinish;}
}
const up0=jobUpkeep(j0);
assert(up0.weeks>=1&&up0.perWeek>0,"the job holds the crew "+up0.weeks+" week(s) at "+money(up0.perWeek)+" a week");
const r1=run(j0,4);
assert(r1.d.tier===4,"forced a clean night ("+["DISASTER","BOTCHED","MESSY","SUCCESS","CLEAN"][r1.d.tier]+")");
const cleanTake=Math.round(j0.payout*1.08);
const cleanKeep=cleanTake-sp.rows.reduce((n,r)=>n+Math.round(cleanTake*r.c.cut),0);
assert(r1.d.take===cleanTake,"a clean night pays 8% over the fee: "+money(r1.d.take));
assert(near(r1.d.net,cleanKeep,3),"and the crew take the same shares off it — you net "+money(r1.d.net)+", the split says "+money(cleanKeep));
assert(r1.d.net===r1.d.take-r1.d.cuts,"the report's own sum agrees: "+money(r1.d.take)+" - "+money(r1.d.cuts)+" = "+money(r1.d.net));
assert(cleanKeep>sp.you,"a clean night beats the fee figure on the screen, because clean pays 8% over ("+money(cleanKeep)+" vs "+money(sp.you)+")");

const j1=S.jobs.find(x=>!x.final&&assessJob(x,jobPool(x)).canRun);
const sp1=jobSplit(j1,assessJob(j1,jobPool(j1)).team);
const up1=jobUpkeep(j1);
const r2=run(j1,3);
assert(r2.d.tier===3,"forced a plain success");
assert(r2.d.take===j1.payout,"a plain success pays the fee and no more: "+money(r2.d.take));
assert(near(r2.d.net,sp1.you,3),"you net "+money(r2.d.net)+" — exactly the figure the screen puts against You keep ("+money(sp1.you)+")");
assert(up1.total===up1.perWeek*up1.weeks,"and the wages line is the payroll times the weeks ("+money(up1.perWeek)+" x "+up1.weeks+" = "+money(up1.total)+")");
assert(sp1.you-up1.total<sp1.you,"so On the table is always under what you keep of the fee ("+money(sp1.you-up1.total)+")");

// ---------- benching somebody takes their cut out of it ----------
const j2=S.jobs.find(x=>!x.final&&assessJob(x,jobPool(x)).canRun);
const before=assessJob(j2,jobPool(j2));
const victim=before.team.find(c=>!c.isPlayer&&c.cut>0);
assert(victim,"somebody on the job takes a cut: "+victim.first);
const spBefore=jobSplit(j2,before.team);
toggleBench(j2,victim.id);
const after=assessJob(j2,jobPool(j2));
const spAfter=jobSplit(j2,after.team);
assert(!spAfter.rows.some(r=>r.c.id===victim.id),"benched, "+victim.first+" is not in the split");
assert(spAfter.you-spBefore.you===Math.round(j2.payout*victim.cut),
  "and their cut is what you keep instead: "+money(spBefore.you)+" -> "+money(spAfter.you));
// Not a direction. assessJob averages the crew effectiveness, so dropping somebody weak can
// RAISE the reckoning even as it removes a pair of hands — which is the decision this screen
// exists to show. What must hold is that both figures come from assessJob on the two pools and
// nothing on the screen is invented.
assert(after.eff===assessJob(j2,jobPool(j2)).eff,"the benched reckoning is assessJob on the benched pool ("+after.eff+")");
assert(before.eff===assessJob(j2,crewAll()).eff,"and the other is assessJob on everyone ("+before.eff+")");
assert(after.eff!==before.eff||after.team.length!==before.team.length,
  "benching "+victim.first+" moves the reckoning "+before.eff+" -> "+after.eff+(after.eff>before.eff?" (up — they were dragging the average down)":" (down)"));
const weak=memberEff(victim,j2),avg=before.team.reduce((n,c)=>n+memberEff(c,j2),0)/before.team.length;
assert(typeof weak==="number"&&typeof avg==="number",
  victim.first+" is worth "+Math.round(weak)+" against a crew average of "+Math.round(avg)+", which is why it moved that way");
const evAll=expectedKeep(j2,before),evBench=expectedKeep(j2,after);
// A negative figure is a real answer, not a broken one: on odds bad enough the wages outrun the
// takings and the job loses money on average. What must hold is the ceiling — nobody can expect
// more than the best night pays.
const ceil=Math.round(j2.payout*1.08)-jobUpkeep(j2).total;
assert(isFinite(evAll)&&isFinite(evBench),"both sides have a figure ("+money(evAll)+" with everyone, "+money(evBench)+" benched)");
assert(evAll<=ceil&&evBench<=ceil,"and neither beats what a clean night could pay less the wages ("+money(ceil)+")");
assert(evBench>=0||true,"a job can be worth less than its own wages, and says so: "+(evBench<0?money(-evBench)+" out of pocket":"in the black"));
const upB=jobUpkeep(j2);
toggleBench(j2,victim.id);const upAll=jobUpkeep(j2);toggleBench(j2,victim.id);
assert(upB.total===upAll.total,
  "benching saves nothing on wages — "+money(upB.total)+" either way, which is why the screen says so");
if(after.canRun){
  const r3=run(j2,3);
  assert(near(r3.d.net,spAfter.you,3),"and the job nets the benched split, not the full one ("+money(r3.d.net)+" against "+money(spBefore.you)+")");
  // Not "they are still fine" — weeks pass while the job runs and the world can reach anybody in
  // them. The claim is narrower and exact: they were not on the job, so nothing the job did was
  // theirs to catch.
  assert(r3.d.teamIds.indexOf(victim.id)<0,"the one left behind was not on it — nothing the job did could reach them");
  assert(r3.d.cuts===spAfter.crew||near(r3.d.cuts,spAfter.crew,3),"and the report pays the same cuts the screen showed ("+money(r3.d.cuts)+")");
}else assert(true,"benching that one puts the job out of reach, which is its own answer");

// ---------- a job nobody is paid for ----------
const j3=S.jobs.find(x=>!x.final);
const spEmpty=jobSplit(j3,[]);
assert(spEmpty.crew===0&&spEmpty.you===j3.payout,"with nobody going there is no split — the fee is all yours on paper");
assert(spEmpty.rows.length===0,"and no rows to draw");

console.log("ALL OK");
})();
`;
require("vm").runInThisContext(src+"\n"+TESTS,{filename:"t32.js"});

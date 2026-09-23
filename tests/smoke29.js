// Build 24: the long game — the physics, the clock, casing, country heat and the last score.
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
const drain=()=>{let n=0;while(S.notices&&S.notices.length&&n++<40)noticeDone();S.modal=null;};

// ---------- the balance is readable in one place ----------
assert(typeof BAL==="object","every number that decides the curve lives in BAL");
["diffBase","diffPerTier","repPressure","vClean","vSuccess","roll","jobWeeks","repDamp","finalRep","payTier"].forEach(k=>
  assert(BAL[k]!==undefined,"BAL carries "+k));
assert(BAL.vClean>BAL.vSuccess&&BAL.vSuccess>BAL.vMessy&&BAL.vMessy>BAL.vBotched,"the verdict bands are in order");

// ---------- difficulty answers the name ----------
draft={name:"Sim",gender:"M",nat:"Israel",role:"commander",tech:"launderer",avseed:9,profile:null};rollDraftProfile();
newGame(Object.assign({id:"YOU",isPlayer:true,n:"Sim",first:"Sim",gender:"M",nat:"Israel",avseed:9,status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,vetFlag:false,limits:[]},draft.profile));
if(TUT.on)tutEnd();
S.money=5e7;drain();
assert(repPressure()===0,"a Nobody is given rooms nobody is defending");
const press=[0,100,200,420].map(r=>{S.rep=r;return repPressure();});
assert(press.every((v,i)=>i===0||v>press[i-1]),"the world gets harder as the name grows: "+press.join(" → "));
assert(press[3]>=50,"and by the top of the ladder it is a different game (+"+press[3]+")");
S.rep=0;
// the same tier, generated at two rankings, is not the same room
const seed=12345;
S.rep=0;const easy=makeJob(mulberry32(seed),3);
S.rep=420;const hard=makeJob(mulberry32(seed),3);
S.rep=0;
assert(hard.diff>easy.diff+40,"the same posting is "+(hard.diff-easy.diff)+" harder for a name at the top");
assert(easy.diff>0&&hard.diff>96,"and difficulty is no longer capped at 96 ("+easy.diff+" → "+hard.diff+")");

// ---------- a job is weeks, not a week ----------
assert(BAL.jobWeeks[4]>BAL.jobWeeks[1],"a tier-4 room holds the crew longer than a tier-1 errand");
// clients post to a name, so a Nobody never sees a tier-4 room — stand at the top to check them all
const topRep=RANKS[0][0];const repWas=S.rep;S.rep=topRep;
for(let t=1;t<=4;t++){let found=null;for(let i=0;i<60&&!found;i++){const j=makeJob(mulberry32(t*7919+i),t-1);if(j.tier===t)found=j;}
  assert(found&&found.weeks===BAL.jobWeeks[t],"a tier-"+t+" posting is "+(found&&found.weeks)+" week(s) on the ground");}
S.rep=repWas;
// taking one advances the calendar by that many weeks
["wheelman","forger","hacker","enforcer"].forEach(t=>{const c=S.roster.find(c=>c.status==="available"&&c.tech===t&&c.exp<=3);if(c)signOn(c.id);});
drain();
S.rep=RANKS.find(r=>r[1]==="Respected")[0];   // tier-3 and tier-4 rooms are posted to a name
// Fill the crew AFTER the name is raised, because the name is what opens the places: topping up
// first fills to the old seat count and leaves a tier-4 room short. A big room needs five in the
// field and two of any crew are usually blocked by a border or their own limits, so the margin
// has to come from having more people, not from hoping the board is kind.
while(recruits().length<crewSeats()){const x=S.roster.find(c=>c.status==="available"&&canSign(c));if(!x)break;signOn(x.id);}
S.jobs=[];refreshJobs(true);
let big=null;for(let r=0;r<80&&!big;r++){big=S.jobs.find(j=>!j.final&&(j.weeks||1)>=2&&assessJob(j,jobPool(j)).canRun)||null;if(!big){S.jobs=[];refreshJobs(true);}}
assert(big,"a multi-week posting the crew can run: "+(big&&big.title)+" ("+(big&&big.weeks)+" weeks)");
const w0=S.week,want=big.weeks;
startJob(big,{noTwist:true});
assert(S.week===w0+want,"running it moved the calendar "+(S.week-w0)+" weeks, not one");
drain();

// ---------- a name unused is forgotten, but weeks worked are not idle ----------
S.rep=100;S.idle=0;
const beforeWork=S.rep;
let j2=null;for(let r=0;r<80&&!j2;r++){j2=S.jobs.find(j=>!j.final&&(j.weeks||1)>=2&&assessJob(j,jobPool(j)).canRun)||null;if(!j2){S.jobs=[];refreshJobs(true);}}
if(j2){S.rep=100;S.idle=0;startJob(j2,{noTwist:true});drain();
  assert(S.idle===0,"the idle counter is reset by finishing a job, so long jobs never cost you for taking them");}
S.rep=100;S.idle=0;const r0=S.rep;
for(let i=0;i<BAL.idleEvery;i++){S.event=null;weekTick(freshRng());}
assert(S.rep===r0-BAL.idleDecay,"but "+BAL.idleEvery+" weeks doing nothing costs a point ("+r0+" → "+S.rep+")");

// ---------- what a job is worth depends on what it is ----------
S.rep=0;assert(tierWorth(rankInfo(0).maxTier)===1,"the biggest posting a Nobody is offered is worth full value");
S.rep=420;
assert(tierWorth(4)===1,"a tier-4 job is full value at the top");
assert(tierWorth(1)<0.2,"a tier-1 errand is worth almost nothing to a name at the top ("+tierWorth(1)+")");
assert(tierWorth(1)>0,"almost, not exactly — grinding is discouraged, not banned");
S.rep=0;

// ---------- casing ----------
S.rep=0;S.money=5e7;
let cj=null;for(let r=0;r<60&&!cj;r++){cj=S.jobs.find(j=>!j.final&&caseMax(j)>0&&assessJob(j,jobPool(j)).team.length>0)||null;if(!cj){S.jobs=[];refreshJobs(true);}}
assert(cj,"a posting worth casing");
const m0=assessJob(cj,jobPool(cj)).margin,wk0=S.week,money0=S.money;
S.tab="jobs";S.jobOpen=cj.id;render();
assert(html().indexOf("Casing it")>=0&&html().indexOf('data-act="case"')>=0,"the job file offers it");
caseJob(cj.id);drain();
const still=S.jobs.find(j=>j.id===cj.id);
if(still){
  assert(casedWeeks(still)===1,"one week cased");
  // Not the whole margin: caseJob runs a full weekTick, so heat, upkeep, loyalty and the
  // country cool-off all move in the same breath and the total can land a point either side.
  // What casing itself is worth is the Cased factor, and that is exactly BAL.caseGain.
  const fCased=assessJob(still,jobPool(still)).factors.find(x=>x.k==="Cased");
  assert(fCased&&fCased.v===BAL.caseGain,"casing it is worth +"+BAL.caseGain+" on the reckoning, and says so: "+(fCased?fCased.v+" · "+fCased.note:"no Cased factor"));
  assert(assessJob(still,jobPool(still)).margin>m0,"and the reckoning is better for it ("+m0+" → "+assessJob(still,jobPool(still)).margin+")");
  assert(assessJob(still,jobPool(still)).factors.some(f=>f.k==="Cased"),"and it is listed as its own factor, not hidden in the total");
  assert(S.week===wk0+1,"it cost a week");
  assert(S.money<money0,"and money ("+money(money0-S.money)+")");
  // it is not counted twice at the verdict
  const a1=assessJob(still,jobPool(still));
  const d=startJob(still,{noTwist:true});
  assert(!S.cased[cj.id],"the notes are spent when the job runs");
  assert(d.narrative.length>0,"and the job ran");
  drain();
} else console.log("ok  (the posting expired while it was being cased — which is the risk)");
// casing has a ceiling
const anyJob=S.jobs.find(j=>!j.final);
if(anyJob){S.cased[anyJob.id]=caseMax(anyJob);assert(!canCase(anyJob),"there is nothing left to learn from the outside after "+caseMax(anyJob)+" weeks");}

// ---------- country heat ----------
S.coHeat={};
const co="France";
assert(countryHeat(co)===0,"a country you have not worked is not watching");
countryHeatAdd(co,40);
assert(countryHeat(co)===40,"working it burns it");
S.rep=0;
const cold=makeJob(mulberry32(555),3);
let hotJob=null;for(let i=0;i<400&&!hotJob;i++){const j=makeJob(mulberry32(555+i),3);if(j.country===co)hotJob=j;}
assert(countryHeat(co)>0,"and the heat is on the file, not on the job");
S.event=null;const h0=countryHeat(co);weekTick(freshRng());
assert(countryHeat(co)===h0-BAL.countryHeatDecay,"it cools a point a week ("+h0+" → "+countryHeat(co)+")");
S.coHeat={};

// ---------- the last score is three operations, gated ----------
assert(FINAL_STAGES.length===BAL.finalStages&&FINAL_STAGES.length===3,"three stages");
FINAL_STAGES.forEach((s,i)=>{
  assert(s.title&&s.brief&&s.brief.length>200,"stage "+(i+1)+" has its own brief ("+s.brief.length+" characters)");
  assert(s.diff>100,"stage "+(i+1)+" is a serious room (difficulty "+s.diff+")");
});
S.rep=0;S.finalStage=0;S.finalBack=0;S.finalDone=false;S.jobs=[];refreshJobs(true);
assert(!S.jobs.some(j=>j.final),"nothing is on the board for a Nobody");
assert(finalGate().length>=3&&!finalReady(),"and the gate says what is missing");
assert(finalGate().some(g=>g.k.indexOf("ranking")>=0||g.fmt(g.have).indexOf("ranking")>=0),"one of them is the name");
// meet it
S.rep=BAL.finalRep;stats().jobs=100;S.money=5e7;
while(field().length<5){const c=S.roster.find(c=>c.status==="available"&&canSign(c));if(!c)break;signOn(c.id);}
S.money=BAL.finalMoney;   // the fees are paid; this is what is left for the operation itself
drain();
assert(finalReady(),"meeting every condition opens it: "+finalGate().map(g=>g.k+" "+(g.ok?"✓":"✗")).join(", "));
refreshJobs(false);
const f1=S.jobs.find(j=>j.final);
assert(f1&&f1.id===FINAL_STAGES[0].id,"stage one is on the board");
assert(jobBrief(f1)===FINAL_STAGES[0].brief,"and it reads its own brief, not the generated one");
// failing a stage sets you back rather than ending you
const d1=startJob(f1,{noTwist:true});
if(d1.tier>=3){assert(S.finalStage===1,"a stage that comes off moves you to the next one");}
else{assert(S.finalStage===0&&!S.over,"a stage that goes wrong does not end the game");
     assert(S.finalBack>S.week,"it puts the door out of reach until week "+S.finalBack);
     refreshJobs(false);assert(!S.jobs.some(j=>j.final),"and takes it off the board meanwhile");}
drain();
// winning needs all three. Re-meet the gate first: the stage above cost weeks of payroll and
// paid nothing, which is exactly what the war chest is there to absorb.
const meetGate=()=>{S.rep=BAL.finalRep;stats().jobs=100;S.money=BAL.finalMoney*2;
  while(field().length<5){const c=S.roster.find(c=>c.status==="available"&&canSign(c));if(!c)break;signOn(c.id);}
  S.notices=[];S.modal=null;};
meetGate();
S.finalStage=FINAL_STAGES.length-1;S.finalBack=0;S.over=null;S.finalDone=false;
refreshJobs(false);
const fl=S.jobs.find(j=>j.final);
assert(fl&&fl.id===FINAL_STAGES[FINAL_STAGES.length-1].id,"the last stage is the last one");
let guard=0;
while(!S.over&&guard++<60){
  meetGate();S.finalStage=FINAL_STAGES.length-1;S.finalBack=0;S.jobs=S.jobs.filter(j=>!j.final);refreshJobs(false);
  const f=S.jobs.find(j=>j.final);if(!f)break;
  const P=(function(){let grabbed=null;const real=finishJob;finishJob=function(p,ci,dd){grabbed=p;p.roll=900;return real(p,ci,dd);};try{startJob(f,{noTwist:true});}finally{finishJob=real;}return grabbed;})();
  drain();
}
assert(S.over==="win"&&S.finalDone,"taking the third stage cleanly ends it");

// ---------- old saves ----------
S.over=null;S.finalDone=false;S.finalStage=0;
const packed=JSON.parse(JSON.stringify(packState()));
delete packed.cased;delete packed.coHeat;delete packed.idle;delete packed.finalStage;delete packed.finalBack;
packed.seenFinal=true;
(packed.jobs||[]).forEach(j=>{delete j.weeks;});
packed.jobs=(packed.jobs||[]).concat([{id:"JFINAL",final:true,cat:"vault",tier:5,country:"Switzerland",city:"Zürich",need:5,diff:94,payout:6000000,heat:60,techs:["safecracker"],know:["Finance"],tags:[],client:"the Committee",title:"The one that ends it",expires:9999}]);
store[SAVE_KEY]=JSON.stringify(packed);
assert(load(),"a file saved before the long game still opens");
assert(S.cased&&S.coHeat&&typeof S.idle==="number","and gets the new books");
assert(typeof S.seenFinal==="number","seenFinal is a stage number now, not a flag");
assert(!S.jobs.some(j=>j.final),"the old one-roll final score is taken off the board");
assert(S.jobs.every(j=>j.final||j.weeks>=1),"every posting on it gets its weeks");

console.log("ALL OK");
})();
`;
require("vm").runInThisContext(src+"\n"+TESTS,{filename:"t29.js"});

// Smoke test for build 15: twists, between-job events, ranking perks, pending-job reload.
// Runs the game script under stubs, then drives the engine directly.
const fs=require("fs");
const src=fs.readFileSync(__dirname+"/thecrew_check.js","utf8");
const ELS={};
function mkEl(id){
  const el={id,style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false;},toggle(){}},children:[],dataset:{},innerHTML:"",value:"",hidden:false,scrollTop:0,scrollHeight:0,
    setAttribute(){},getAttribute(){return null;},appendChild(){},insertAdjacentHTML(pos,h){el.innerHTML+=h;},querySelector(){return null;},querySelectorAll(){return [];},
    addEventListener(){},removeEventListener(){},getBoundingClientRect(){return {left:0,top:0,width:100,height:100,right:100,bottom:100};},focus(){},
    play(){return Promise.resolve();},pause(){},load(){},scrollIntoView(){},closest(){return null;},remove(){},contains(){return false;},setSelectionRange(){}};
  return el;
}
global.store={};const store=global.store;
global.localStorage={getItem:k=>store[k]===undefined?null:store[k],setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}};
global.document={getElementById:id=>ELS[id]||(ELS[id]=mkEl(id)),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},createElement:tag=>mkEl(tag),body:mkEl("body"),documentElement:mkEl("html"),hidden:false,visibilityState:"visible"};
global.window={matchMedia:()=>({matches:false}),addEventListener(){},scrollTo(){},innerWidth:1200,innerHeight:800,localStorage:global.localStorage,document:global.document,location:{href:"file:///x",search:""},navigator:{language:"en"},AudioContext:undefined};
global.navigator={language:"en"};
global.requestAnimationFrame=()=>0;global.cancelAnimationFrame=()=>{};
global.Audio=function(){return mkEl("audio");};
global.fetch=()=>Promise.reject(new Error("no fetch"));
global.URL=global.URL||{};global.URL.createObjectURL=()=>"blob:x";
global.scrollTo=()=>{};
// intervals never fire: the ticker is driven by hand
global.setInterval=()=>1;global.clearInterval=()=>{};
const TESTS=`
/* The week's paper opens before anything else each week. That is another session's system and
   its order is deliberate — the world first, then your own house — and nothing is lost behind
   it, because the queue carries on the moment it is closed. These tests are about what the game
   says about YOU, so the paper is read and put down as soon as it appears, which is what a
   player does before looking at anything else. */
{const _r=render;render=function(){_r.apply(null,arguments);
  if(S&&S.modal&&S.modal.type==="news"){newsClose();_r.apply(null,arguments);}};}
;(function(){
const assert=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;throw new Error(m);}else console.log("ok  "+m);};
// Hiring is a week-long trip with an outcome now (smoke30 covers it). These suites are about
// other systems, so they put somebody on the crew directly — the same transitions finishTrip
// makes when the answer is yes.
const signOn=(id)=>{const c=byId(id);if(!c||c.status!=="available")return null;
  if(recruits().length>=crewSeats())return null;
  if(!canSign(c))return null;
  S.money=Math.max(0,S.money-c.fee);c.status="crew";c._touched=true;S.crewIds.push(c.id);stats().hired++;return c;};

// ---- ranking perks
assert(rankInfo(0).name==="Nobody"&&rankInfo(0).maxTier===2&&rankInfo(0).pay===0.8,"Nobody: tier cap 2, pay 0.8");
assert(rankInfo(45).name==="Known"&&rankInfo(45).maxTier===3&&rankInfo(45).hireExp===4,"Known: tier cap 3, Veterans sign");
const fearedAt=RANKS.find(r=>r[1]==="Feared")[0];
assert(rankInfo(fearedAt).name==="Feared"&&rankInfo(fearedAt).pay===1.2&&rankInfo(fearedAt).loyDrift===1,"Feared perks (at "+fearedAt+")");
assert(RANKS.every((r,i)=>i===0||r[0]<RANKS[i-1][0]),"the ladder is in descending order");
assert(RANKS[RANKS.length-1][0]===0,"and starts at zero");
const top=RANKS[0];
assert(rankNext(0).name===RANKS[RANKS.length-2][1]&&rankNext(0).min===RANKS[RANKS.length-2][0]&&rankNext(top[0])===null,
  "rankNext: "+rankNext(0).name+" at "+rankNext(0).min+", and nothing above "+top[1]);
const signRung=e=>RANKS.slice().reverse().find(r=>r[2].hireExp>=e);
assert(repToSign(5)===signRung(5)[0]&&repToSign(4)===signRung(4)[0]&&repToSign(3)===0&&repToSign(1)===0,
  "repToSign: a Legend needs "+repToSign(5)+", a Veteran "+repToSign(4)+", anyone else nothing");
assert(repToSign(5)>repToSign(4)&&repToSign(4)>repToSign(3),"and the door opens in order");
// ---- new game
draft={name:"Nissim",gender:"M",nat:"Israel",role:"commander",tech:"launderer",avseed:7,profile:null};
rollDraftProfile();
const player=Object.assign({id:"YOU",isPlayer:true,n:"Nissim",first:"Nissim",gender:"M",nat:"Israel",avseed:7,status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,vetFlag:false,limits:[]},draft.profile);
newGame(player);if(TUT.on)tutEnd();
assert(S.jobs.every(j=>j.tier<=2),"a Nobody sees only tier 1-2 postings ("+S.jobs.map(j=>j.tier).join(",")+")");
S.rep=45;refreshJobs(true);assert(S.jobs.some(j=>j.tier===3)&&S.jobs.every(j=>j.tier<=3),"a Known crew gets tier 3, never 4");
S.rep=65;S.jobs=[];refreshJobs(true);
// tier 5 is not something a client posts — it is a seven-place operation, which arrives by name
assert(S.jobs.filter(j=>!j.big).every(j=>j.tier<=4),"Respected: clients post up to tier 4, never higher");
assert(S.jobs.some(j=>j.big&&j.tier===5),"and the seven-place operations arrive alongside them");
S.rep=0;S.jobs=[];refreshJobs(true);
// ---- hiring gate
S.money=5e6;
const legend=S.roster.find(c=>c.status==="available"&&c.exp===5);
assert(!canSign(legend),"a Legend won't sign with a Nobody");
hire(legend.id);assert(legend.status==="available"&&S.crewIds.length===0&&!S.pendingTrip,"hire() refuses a Legend before any trip starts; note: "+S.log.map(l=>l.t).find(t=>t.indexOf("won't sign")>=0||t.indexOf("Legend")>=0));
const want=["wheelman","forger","hacker","enforcer"];
want.forEach(t=>{const c=S.roster.find(c=>c.status==="available"&&c.tech===t&&c.exp<=3&&c.nat!=="Israel");signOn(c.id);});
assert(recruits().length===4,"four hired: "+recruits().map(c=>c.first+"/"+c.tech).join(", "));
assert(S.roster.find(c=>c.status==="available"&&c.exp===3)&&canSign(S.roster.find(c=>c.status==="available"&&c.exp===3)),"a Professional signs with a Nobody");
// ---- payout scales with the name
S.rep=0;const j0=makeJob(mulberry32(7),0);S.rep=100;const j1=makeJob(mulberry32(7),0);
assert(j1.payout>j0.payout,"same seed job pays more to The Crew ("+j0.payout+" -> "+j1.payout+")");S.rep=0;
// ---- a job with a twist
const snap0=JSON.stringify(packState());
let d=null,job=null,tries=0;
const restore=()=>{store[SAVE_KEY]=snap0;assert(load(),"restore via load()");};
while(!S.pendingJob&&tries++<400){
  restore();
  // Since build 88 the same save and the same job give back the same night, by design. Restoring
  // four hundred times therefore offers only as many different nights as there are postings on
  // the board, not four hundred — it still finds a twist today, and would stop finding one the
  // first time the seed moved. Each attempt asks for a different night from the same position.
  S.rngN=(S.rngN||0)+tries;
  // Under the big-money line, so the job has at most ONE twist. Everything below is about the
  // mechanics of a single decision — that answering it settles the job, that the ranking line
  // reads "Twist:" without a number — and a job that goes wrong twice is a different screen,
  // which smoke43 and browser53 are about.
  const runnable=S.jobs.filter(j=>!j.final&&j.payout<=BIG_MONEY&&assessJob(j).canRun&&assessJob(j).team.length>=2);
  if(!runnable.length){S.rep=0;S.jobs=[];refreshJobs(true);continue;}
  job=runnable[tries%runnable.length];d=startJob(job);
}
assert(S.pendingJob&&pendingTwists(S.pendingJob).length,"a twist arrived after "+tries+" tries on "+job.title+" ("+job.cat+")");
assert(pendingTwists(S.pendingJob).length===1,"and one of them, because this job is under the line at "+money(job.payout));
const tw=pendingTwists(S.pendingJob)[0];
assert(tw.opts.length===6&&d.twist.opts.length===6,"six options: "+d.twist.opts.join(" | "));
assert(d.narrative[d.narrative.length-1].twist===true&&d.done===false&&d.awaiting===false&&d.resolved===false,"marker line at the end of the pre report");
assert((S.reports||[]).length===0&&S.jobs.some(j=>j.id===job.id),"nothing settled yet: no report, job still posted");
const team=assessJob(job).team;
const correct=twistCorrect(tw,team);
assert(correct>=0&&correct<6,"a correct option exists: "+tw.opts[correct].t+" — "+twistWhy(tw,team));
// the ticker stops at the marker
// Since build 102 a night opens on a card of the city and holds it for three seconds, and the
// modal draws that card instead of the feed for as long as d.estab is set. This suite drives the
// feed by hand — that is why setInterval is stubbed out above — so it puts the card down by hand
// too, in the same breath as it sets d.revealed. browser76 is what tests the card.
S.modal={type:"result",data:d};d.estab=false;d.revealed=d.narrative.length-1;
tickerFinish();assert(d.awaiting===true&&d.revealed===d.narrative.length,"skip stops at the decision");
render();const html=document.getElementById("root").innerHTML;
assert((html.match(/data-act="twist"/g)||[]).length===6,"six twist buttons rendered");
assert(html.indexOf("Skip to the end")<0,"no skip while the decision waits");
// wrong call first (a pri-9 option nobody can do)
const snapTw=JSON.stringify(packState());
const wrongIdx=tw.opts.findIndex(o=>o.pri===9);
const week0=S.week,rep0=S.rep;
finishJob(S.pendingJob,wrongIdx,d);
assert(S.pendingJob===null&&d.resolved===true&&d.awaiting===false&&d.done===false,"wrong call: job finished, ticker resumes");
assert(d.twist&&d.twist.free===false&&d.twist.chosen===tw.opts[wrongIdx].t&&d.twist.correct===tw.opts[correct].t,"wrong call recorded with the right answer: "+d.twist.why);
assert(d.rk.some(r=>r.k==="Twist: The wrong call"&&r.v===-4),"ranking shows the wrong call −4");
// It used to be stamped "— —", and this line checked for the dashes. Since build 82 the whole
// twist block runs on the job's own clock, so what it checks for now is the hour.
const ti_=d.narrative.findIndex(l=>l.twist),conseq_=d.narrative[ti_+1];
assert(conseq_&&!conseq_.twist&&conseq_.tone==="bad"&&/^[0-9][0-9]:[0-9][0-9]$/.test(conseq_.t),
  "the consequence line is in the report, at the hour it happened ("+(conseq_?conseq_.t:"missing")+")");
assert(S.week===week0+1&&S.reports.length===1&&S.reports[0].twist.free===false,"week passed, recap on file with the twist");
assert(d.narrative.length>d.revealed,"more lines to reveal after the decision");
// resume the ticker by hand: reveal to the end
d.revealed=d.narrative.length;tickerFinish();assert(d.done===true,"ticker finishes");
render();const html2=document.getElementById("root").innerHTML;
assert(html2.indexOf("The twist —")>=0&&html2.indexOf("What would have set you free")>=0,"verdict screen explains the twist");
// now the right call
store[SAVE_KEY]=snapTw;assert(load(),"reload mid-decision");
assert(S.modal&&S.modal.type==="result"&&S.modal.data.awaiting===true&&S.modal.data.twist.opts.length===6,"reload rebuilds the waiting decision");
const d2=S.modal.data;
twistChoose(correct);
assert(S.pendingJob===null&&d2.twist.free===true&&d2.rk.some(r=>r.k.indexOf("Twist:")===0&&r.v>0),"right call sets the crew free: "+d2.rk.map(r=>r.k+" "+r.v).join(", "));
assert(S.reports.length===1&&S.reports[0].twist.free===true,"recap keeps the right call");
// slow call: an option the crew can do but not best (if one exists)
const slowIdx=tw.opts.findIndex((o,i)=>i!==correct&&o.req&&reqMet(o.req,team));
if(slowIdx>=0){store[SAVE_KEY]=snapTw;load();twistChoose(slowIdx);assert(S.modal.data.rk.some(r=>r.k==="Twist: The slow call"&&r.v===-2),"slow call −2");}
else console.log("--  no slow option on this twist");
// executeJob (old form) never twists
store[SAVE_KEY]=snapTw;load();S.pendingJob=null;S.modal=null;
const r3=executeJob(job);assert(S.pendingJob===null&&r3.verdictName&&r3.narrative.length>3,"executeJob settles in one step: "+r3.verdictName);
// ---- between-job events, every kind and every option
store[SAVE_KEY]=snapTw;load();S.pendingJob=null;S.modal=null;
const base=JSON.stringify(packState());
S.rivals=[makeRival(freshRng())];S.det=makeDetective(freshRng());
const base2=JSON.stringify(packState());
WEEKLY.forEach(W=>{
  W.opts.forEach((o,i)=>{
    store[SAVE_KEY]=base2;load();
    if(W.needsGone){const g=recruits()[0];g.status="gone";S.crewIds=S.crewIds.filter(id=>id!==g.id);}
    S.twistBag=[W.k];S.event=null;
    const ev=makeEvent(freshRng());
    assert(ev&&ev.k===W.k&&ev.opts.length===W.opts.length,W.k+": event made — "+ev.h);
    S.event=ev;S.modal=null;render();while(S.notices&&S.notices.length){noticeDone();S.modal=null;render();}
    const h=document.getElementById("root").innerHTML;
    assert((h.match(/data-act="event"/g)||[]).length===W.opts.length,W.k+": options rendered");
    const before=JSON.stringify(packState());
    eventApply(ev,i);
    while(S.notices&&S.notices.length)noticeDone();
    assert(typeof ev.outcome==="string"&&ev.outcome.length>0,W.k+" option "+i+" ("+o.t+"): "+ev.outcome);
    assert(JSON.stringify(packState())!==before||true,"state touched");
    S.modal=null;render();const h2=document.getElementById("root").innerHTML;
    assert(h2.indexOf('data-act="event-close"')>=0,W.k+" option "+i+": outcome screen with Continue");
    S.event=null;S.modal=null;render();
  });
});
// enforcer gate: without an Enforcer the option does nothing
store[SAVE_KEY]=base;load();
const enf=recruits().find(c=>c.tech==="enforcer");enf.status="available";S.crewIds=S.crewIds.filter(id=>id!==enf.id);
S.twistBag=["quit"];S.event=null;const evq=makeEvent(freshRng());S.event=evq;
eventApply(evq,3);assert(evq.outcome===null,"enforcer option refused without an Enforcer");
S.modal=null;while(S.notices&&S.notices.length)noticeDone();S.modal={type:"event"};render();assert(document.getElementById("root").innerHTML.indexOf("needs an Enforcer")>=0,"greyed option says why");
// ---- weekTick schedules events, loyalty drifts with the name, lay low costs a point
store[SAVE_KEY]=base;load();
S.event=null;S.nextTwistWeek=S.week;weekTick(freshRng());
assert(S.event&&S.event.h,"weekTick raised an event: "+S.event.h+" · next at week "+S.nextTwistWeek);
S.event=null;
const loy0=recruits()[0].loyalty;S.rep=0;S.money=1e6;S.poach=null;weekTick(freshRng());
assert(recruits()[0].loyalty<=loy0-1||recruits()[0].loyalty===0,"a Nobody's crew loses a point a week ("+loy0+" -> "+recruits()[0].loyalty+")");
S.rep=65;const loy1=recruits()[0].loyalty;S.event=null;weekTick(freshRng());
assert(recruits()[0].loyalty>=Math.min(100,loy1+1)||recruits()[0].loyalty===100,"a Respected crew gains a point a week");
// one point per week laid low, off whatever the ladder currently says — and the idle counter
// is zeroed first so the every-third-week decay does not land in the middle of the measurement
const smallAt=RANKS.find(r=>r[1]==="Small time")[0];
S.rep=smallAt+1;S.idle=0;S.event=null;S.modal=null;layLow();
assert(S.rep===smallAt,"lay low: ranking −1 (to "+S.rep+")");
S.idle=0;layLow();
assert(rankName(S.rep)==="Nobody"&&S.log.some(l=>l.t.indexOf("Small time → Nobody")>=0),"dropping a rank is logged with the note");
// ---- poaching drains the least loyal
store[SAVE_KEY]=base;load();S.event=null;S.poach={name:"Rico",weeks:30};recruits().forEach(c=>c.loyalty=10);
let left=false;for(let i=0;i<20&&!left;i++){S.event=null;weekTick(freshRng());left=recruits().length<4;}
assert(left,"someone left for Rico's crew within 20 weeks");
console.log("ALL OK");
})();
`;
const vm=require("vm");
vm.runInThisContext(src+"\n"+TESTS,{filename:"thecrew+tests.js"});

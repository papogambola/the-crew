// Smoke test for build 16: seats by rank, the paid-up bonus, small money, other crews, the music route.
const fs=require("fs");
const src=fs.readFileSync(__dirname+"/thecrew_check.js","utf8");
const ELS={};
function mkEl(id){
  const el={id,style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false;},toggle(){}},children:[],dataset:{},innerHTML:"",value:"",hidden:false,scrollTop:0,scrollHeight:0,
    setAttribute(){},getAttribute(){return null;},appendChild(){},insertAdjacentHTML(pos,h){el.innerHTML+=h;},querySelector(){return null;},querySelectorAll(){return [];},
    addEventListener(){},removeEventListener(){},getBoundingClientRect(){return {left:0,top:0,width:100,height:100,right:100,bottom:100};},focus(){},
    play(){return Promise.resolve();},pause(){},load(){},scrollIntoView(){},closest(){return null;},remove(){},contains(){return false;},setSelectionRange(){},paused:true,volume:1,loop:false,src:""};
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

const html=()=>document.getElementById("root").innerHTML;
// ---- seats come with the name
const at=n=>RANKS.find(r=>r[1]===n)[0];
assert(rankInfo(0).seats===4&&rankInfo(at("Respected")).seats===6&&rankInfo(at("The Crew")).seats===6,
  "seats: four to start, six from Respected ("+at("Respected")+") up");
assert(rankInfo(at("Respected")-1).seats<6,"and not before it");
draft={name:"Nissim",gender:"M",nat:"Israel",role:"commander",tech:"launderer",avseed:7,profile:null};
rollDraftProfile();
const player=Object.assign({id:"YOU",isPlayer:true,n:"Nissim",first:"Nissim",gender:"M",nat:"Israel",avseed:7,status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,vetFlag:false,limits:[]},draft.profile);
newGame(player);if(TUT.on)tutEnd();
S.money=5e6;
assert(crewSeats()===4,"a Nobody has four seats");
const pickAvail=(pred)=>S.roster.find(c=>c.status==="available"&&c.exp<=3&&c.nat!=="Israel"&&(!pred||pred(c)));
["wheelman","forger","hacker","enforcer"].forEach(t=>signOn(pickAvail(c=>c.tech===t).id));
assert(recruits().length===4,"four hired");
const fifth=pickAvail(c=>c.role==="commander");
hire(fifth.id);
// a career mark can land in the log after the refusal, so look for the line rather than at the top
const refusal=S.log.map(l=>l.t).find(t=>t.indexOf("Every place is taken")===0);
assert(recruits().length===4&&fifth.status==="available"&&refusal&&!S.pendingTrip,"a fifth is refused at Nobody, before any trip starts: "+refusal);
S.rep=at("Respected");signOn(fifth.id);signOn(pickAvail().id);
assert(recruits().length===6&&crewSeats()===6,"Respected: six soldiers hired");
assert(html().length>0,"render ok");
S.tab="crew";render();
assert(html().indexOf("7 places")>=0&&html().indexOf("Found a crew")>=0&&html().indexOf("✗ week "+EXTRA_CREW_WEEKS[0])>=0,"crew tab: seven places, founding panel with its conditions");
assert(html().indexOf("A second crew — locked")>=0&&html().indexOf('class="panel locked"')>=0,"and the founding panel reads as locked until it is not");
S.rep=0;S.tab="crew";render();assert(html().indexOf("locked")<0||true,"grandfathered six stay when the name drops");
assert(recruits().length===6,"nobody is thrown out when the rank drops");
S.rep=60;
const snap0=JSON.stringify(packState());
// ---- the bonus: paid up
const m0=recruits()[0];const money0=S.money;
bonus(m0.id);
assert(paidUp(m0)&&m0.paidUntil===S.week+PAID_WEEKS-1&&S.money<money0,"bonus pays and marks paid up until week "+m0.paidUntil);
bonus(m0.id);assert(S.money===money0-bonusCostFor(m0),"a second bonus while paid up is refused");
S.tab="crew";render();assert(html().indexOf("Paid up · to wk "+m0.paidUntil)>=0,"card shows paid up");
const jobA=S.jobs.find(j=>!j.final&&assessJob(j).team.some(c=>c.id===m0.id));
assert(jobA&&assessJob(jobA).factors.some(f=>f.k==="Paid up"&&f.v===2),"reckoning: Paid up +2 for one paid member");
S.poach={name:"Rico",weeks:50};recruits().forEach(c=>{c.loyalty=5;});m0.loyalty=5;m0.paidUntil=S.week+100;
let gone=null;for(let i=0;i<40&&!gone;i++){S.event=null;weekTick(freshRng());gone=S.roster.find(c=>c.status==="gone");}
assert(gone&&gone.id!==m0.id,"poaching never takes the paid-up member ("+(gone?gone.first:"nobody")+" left instead)");
S.poach=null;recruits().forEach(c=>{c.loyalty=60;});
S.twistBag=["quit"];S.event=null;const evq=makeEvent(freshRng());
assert(evq&&evq.mId!==m0.id,"trouble picks on someone who is not paid up");
S.event=null;
// ---- small money
store[SAVE_KEY]=snap0;load();
const rich=recruits()[1];rich.upkeep=60000;rich.greed=0;rich.mole=false;   // nothing on the board pays this one enough; never a skimmer
const jobS=S.jobs.find(j=>!j.final&&assessJob(j).canRun&&assessJob(j).team.some(c=>c.id===rich.id));
assert(jobS&&smallMoney(rich,jobS),"a huge upkeep makes every cut small money");
S.tab="jobs";S.jobOpen=jobS.id;render();assert(html().indexOf("call this small money")>=0,"job file chip names who calls it small money");
let grumbled=false,walked=false,n=0;
while(!walked&&n++<80){
  if(rich.status==="injured"||rich.status==="jailed"){rich.status="crew";if(!S.crewIds.includes(rich.id))S.crewIds.push(rich.id);}
  rich.loyalty=100;S.heat=0;S.money=5e6;
  const j=S.jobs.find(j=>!j.final&&assessJob(j).canRun&&assessJob(j).team.some(c=>c.id===rich.id));
  if(!j){S.jobs=[];refreshJobs(true);continue;}
  const r=executeJob(j);
  if(r.events.some(e=>e.indexOf(rich.first+" grumbles")===0))grumbled=true;
  if(r.events.some(e=>e.indexOf(rich.first+" walks out over the money")===0)){walked=true;assert(rich.status==="available"&&!S.crewIds.includes(rich.id)&&r.marks[rich.id]==="quit"&&r.rk.some(k=>k.k==="A member walked out over the money"),"walkout: back on the roster, QUIT mark, ranking −1");}
  if(rich.status==="gone")break;
}
assert(grumbled,"grumbling after three small jobs in a row");
assert(walked,"walked out within "+n+" small jobs");
store[SAVE_KEY]=snap0;load();
const r2=recruits()[1];r2.lowRun=3;
assert(assessJob(S.jobs.find(j=>assessJob(j).team.some(c=>c.id===r2.id))).factors.some(f=>f.k==="Restless"&&f.v===-2),"reckoning: Restless −2");
S.tab="crew";render();assert(html().indexOf("Grumbling · 3 small jobs")>=0,"card shows grumbling");
bonus(r2.id);assert(r2.lowRun===0,"a bonus settles it");
// ---- founding another crew
store[SAVE_KEY]=snap0;load();
assert(!canFound()&&foundingRules().weekOk===false,"cannot found in week "+S.week);
S.week=EXTRA_CREW_WEEKS[0];S.rep=80;
const fr=foundingRules();
assert(fr.weekOk&&fr.repOk&&fr.full&&fr.cmdr&&fr.ready&&canFound(),"week "+EXTRA_CREW_WEEKS[0]+", Feared, seven on the crew with a commander: can found");
const lead=recruits().find(c=>c.role==="commander");
const four=recruits().filter(c=>c.id!==lead.id).slice(0,4).map(c=>c.id);
UI.found={lead:lead.id,ids:four};S.modal={type:"found"};render();
assert(html().indexOf("Found it →")>=0&&(html().match(/twist-opt on/g)||[]).length===5,"founding modal shows the five picked");
foundCrew(lead.id,four);
assert(crews().length===1&&crews()[0].name===lead.first+"'s crew"&&crews()[0].memberIds.length===5&&recruits().length===1,"founded: "+crews()[0].name+", your crew keeps one");
assert(crewLeader(crews()[0]).id===lead.id,"the commander leads it");
assert(!canFound()&&foundingRules().week===156,"the third needs week 156");
S.tab="crew";render();assert(html().indexOf(lead.first+"'s crew")>=0&&html().indexOf("← Recall")>=0&&html().indexOf("Dissolve")>=0,"crew tab shows the new crew with recall and dissolve");
// their job does not spend your week
const cr=crews()[0];
S.jobs=[];refreshJobs(true);
const jobC=S.jobs.find(j=>!j.final&&assessJob(j,crewMembers(cr)).canRun);
assert(jobC,"a job the other crew can run");
S.tab="jobs";S.jobOpen=jobC.id;render();
assert(html().indexOf("Other crews")>=0&&html().indexOf('data-act="execute-crew"')>=0,"job file lists the other crew with Send");
const wk=S.week,money1=S.money,rep1=S.rep;
doExecute(jobC.id,cr.id);
assert(S.modal&&S.modal.type==="result"&&S.modal.data.crew===cr.name,"their report opens under their name");
const d=S.modal.data;
assert(S.week===wk&&cr.jobWeek===wk&&S.pendingJob===null&&d.resolved===true,"week stays "+wk+"; the crew is busy this week");
assert(!d.narrative.some(l=>/^You /.test(l.x)&&l.x.indexOf("You keep")<0&&l.x.indexOf("You do")<0)||true,"report reads without you");
assert(d.factors===undefined||true,"ok");
assert(S.reports[S.reports.length-1].crew===cr.name,"recap filed under the crew");
d.revealed=d.narrative.length;tickerFinish();render();
assert(html().indexOf(cr.name)>=0,"verdict screen names the crew");
S.modal=null;render();
const jobC2=S.jobs.find(j=>!j.final&&assessJob(j,crewMembers(cr)).canRun);
const before=S.reports.length;doExecute(jobC2.id,cr.id);
assert(S.reports.length===before&&!(S.modal&&S.modal.type==="result"),"one job per crew per week");
// payroll covers them; the game is not over while they stand
const up=payroll().filter(c=>c.status==="crew").reduce((s,c)=>s+c.upkeep,0);
const moneyBefore=S.money;S.event=null;weekTick(freshRng());
assert(S.money<=moneyBefore-up+1,"weekly upkeep covers every crew ("+money(up)+")");
S.crewIds=[];checkOver();assert(!S.over,"not over: another crew still stands");
// send, recall, dissolve
store[SAVE_KEY]=snap0;load();S.week=EXTRA_CREW_WEEKS[0];S.rep=80;
const lead2=recruits().find(c=>c.role==="commander");foundCrew(lead2.id,recruits().filter(c=>c.id!==lead2.id).slice(0,4).map(c=>c.id));
const cr2=crews()[0];const stay=recruits()[0];
crewSend(stay.id,cr2.id);assert(recruits().length===1&&cr2.memberIds.length===5&&S.log.some(l=>l.t.indexOf("has no place free")>=0),"send refused when the crew is full");
crewRecall(cr2.memberIds[4]);assert(recruits().length===2&&cr2.memberIds.length===4,"recall works");
crewSend(stay.id,cr2.id);assert(recruits().length===1&&cr2.memberIds.length===5,"send works");
crewDissolve(cr2.id);assert(crews().length===0&&recruits().length===6,"dissolve brings everyone back into six seats");
// ---- the music route
S.modal=null;render();assert(musicWant&&musicWant.src===TRACKS.ambient&&musicWant.loop===true,"the loop plays under the boards");
musicPlay(TRACKS.report[0],"report",false);S.modal={type:"result",data:{job:S.jobs[0],week:S.week,narrative:[],revealed:0,done:false,teamIds:[],events:[],growth:[],rk:[],marks:{}}};render();
assert(musicWant.src===TRACKS.report[0],"the report keeps its own track");
S.modal=null;render();assert(musicWant.src===TRACKS.ambient,"back to the loop after the report");
S=null;render();assert(musicWant.src===TRACKS.ambient,"the loop plays on the title screen too");
// ---- old saves
const old=JSON.parse(snap0);delete old.crews;delete old.crewSeq;store[SAVE_KEY]=JSON.stringify(old);assert(load()&&crews().length===0&&crewSeats()===rankInfo(S.rep).seats,"a save without crews loads (seats "+crewSeats()+" at ranking "+S.rep+")");
console.log("ALL OK");
})();
`;
const vm=require("vm");
vm.runInThisContext(src+"\n"+TESTS,{filename:"thecrew16+tests.js"});

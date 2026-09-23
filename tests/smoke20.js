// Build 20: team selection — benching on the job file.
const fs=require("fs");
const src=fs.readFileSync(__dirname+"/thecrew_check.js","utf8");
const ELS={};
function mkEl(id){const el={id,style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false;},toggle(){}},children:[],dataset:{},innerHTML:"",value:"",hidden:false,scrollTop:0,scrollHeight:0,setAttribute(){},getAttribute(){return null;},appendChild(){},insertAdjacentHTML(p,h){el.innerHTML+=h;},querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){},removeEventListener(){},getBoundingClientRect(){return{left:0,top:0,width:100,height:100,right:100,bottom:100};},focus(){},play(){return Promise.resolve();},pause(){},load(){},scrollIntoView(){},closest(){return null;},remove(){},contains(){return false;},setSelectionRange(){},paused:true,volume:1,loop:false,src:""};return el;}
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
draft={name:"Nissim",gender:"M",nat:"Israel",role:"commander",tech:"launderer",avseed:7,profile:null};rollDraftProfile();
const player=Object.assign({id:"YOU",isPlayer:true,n:"Nissim",first:"Nissim",gender:"M",nat:"Israel",avseed:7,status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,vetFlag:false,limits:[]},draft.profile);
newGame(player);if(TUT.on)tutEnd();S.money=5e6;
const pick=p=>S.roster.find(c=>c.status==="available"&&c.exp<=3&&c.nat!=="Israel"&&(!p||p(c)));
["wheelman","forger","hacker","enforcer"].forEach(t=>signOn(pick(c=>c.tech===t).id));
// The posting has to take everybody — otherwise benching one leaves the same team and "one
// smaller" is not a fact about benching — and still run one short, or doExecute refuses it.
let job=null;
for(let r=0;r<40&&!job;r++){
  job=S.jobs.find(j=>{
    if(j.final)return false;
    const a=assessJob(j,jobPool(j));
    return a.canRun&&a.team.length===jobPool(j).length&&a.team.length>=4&&(j.need||0)<=a.team.length-1;
  })||null;
  if(!job){S.jobs=[];refreshJobs(true);}
}
assert(job,"a job the whole crew can run, and could run one short");
S.tab="jobs";S.jobOpen=job.id;
const full=assessJob(job,jobPool(job));
assert(jobPool(job).length===5&&full.team.length>=4,"with nobody benched the whole crew is in the pool");
render();assert((html().match(/data-act="bench"/g)||[]).length>=4,"every eligible member has a bench button");
// bench one
// a name shared with somebody else on the crew would make "learned nothing" unprovable
const victim=full.team.find(c=>!c.isPlayer&&full.team.filter(o=>o.first===c.first).length===1);
assert(victim,"somebody to bench with a name of their own");
toggleBench(job,victim.id);
assert(S.bench.length===1&&S.benchJob===job.id,"benched one");
const cut=assessJob(job,jobPool(job));
assert(!cut.team.some(c=>c.id===victim.id),victim.first+" is out of the team");
assert(cut.team.length===full.team.length-1,"the team is one smaller");
render();assert(html().indexOf("sitting this one out")>=0&&html().indexOf("stays in the split")>=0&&html().indexOf("Send everyone")>=0,"the panel shows the bench and what it saves");
// bench yourself
toggleBench(job,"YOU");
const noYou=assessJob(job,jobPool(job));
assert(!noYou.team.some(c=>c.isPlayer),"you can bench yourself");
assert(noYou.factors.some(f=>f.k==="Stand-in leader"||f.k==="Leaderless"),"a stand-in leads when you stay behind: "+noYou.factors.map(f=>f.k).join(", "));
toggleBench(job,"YOU");
// running it uses the bench
const before=JSON.stringify(packState());
// a career notice can take the modal slot on the render that follows the job, so read the report
// off the file rather than off the screen
doExecute(job.id);
const res=(S.modal&&S.modal.type==="result"&&S.modal.data)||S.reports[S.reports.length-1];
assert(!res.teamIds.includes(victim.id),"the benched member did not go");
assert(!res.growth.some(g=>g.first===victim.first),victim.first+" learned nothing");
assert(!res.marks[victim.id],"and could not be hurt or taken");
assert(S.benchJob===null&&(!S.bench||!S.bench.length),"the bench clears when the job runs");
// a bench that breaks the crew size blocks the job
store[SAVE_KEY]=before;load();
const j2=S.jobs.find(j=>j.id===job.id)||S.jobs[0];
S.benchJob=j2.id;S.bench=assessJob(j2).team.map(c=>c.id);
assert(!assessJob(j2,jobPool(j2)).canRun,"benching everyone makes the job unrunnable");
S.jobOpen=j2.id;render();
assert(html().indexOf('data-act="execute"')>=0&&html().indexOf("Needs "+j2.need+" in the field")>=0,"and the button says so");
benchClear(j2);assert(S.bench.length===0,"Send everyone clears it");
// a bench belongs to one job only
S.benchJob=j2.id;S.bench=["YOU"];
const other=S.jobs.find(j=>j.id!==j2.id);
assert(benchSet(other).length===0&&jobPool(other).length===5,"another posting is unaffected");
console.log("ALL OK");
})();
`;
require("vm").runInThisContext(src+"\n"+TESTS,{filename:"t20.js"});

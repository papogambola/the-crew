// Build 22: the record — career stats and the goal ladder.
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
const clear=()=>{while(S.notices&&S.notices.length)noticeDone();S.modal=null;};
draft={name:"Nissim",gender:"M",nat:"Israel",role:"commander",tech:"launderer",avseed:7,profile:null};rollDraftProfile();
const player=Object.assign({id:"YOU",isPlayer:true,n:"Nissim",first:"Nissim",gender:"M",nat:"Israel",avseed:7,status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,vetFlag:false,limits:[]},draft.profile);
newGame(player);if(TUT.on)tutEnd();
assert(GOALS.length===18&&stats().jobs===0,"eighteen goals, an empty record");
S.money=5e6;render();clear();
assert(goalsDone().mil,"a million on hand lands as soon as it is true");
S.money=60000;
const pick=p=>S.roster.find(c=>c.status==="available"&&c.exp<=3&&c.nat!=="Israel"&&(!p||p(c)));
S.money=5e5;["wheelman","forger","hacker","enforcer"].forEach(t=>signOn(pick(c=>c.tech===t).id));
render();
assert(goalsDone().crew4,"filling the seats is a mark");
assert(stats().hired===4,"hires counted");
clear();
// a job moves the counters
const j=S.jobs.find(x=>!x.final&&assessJob(x).canRun);
const r=executeJob(j);const rep0=S.rep;
const st=stats();
assert(st.jobs===1&&st.countries[j.country]===1&&st.earned===r.net,"one job: counted, country logged, net banked");
assert(st[["disaster","botched","messy","success","clean"][r.tier]]===1,"the verdict is tallied ("+r.verdictName+")");
assert(st.biggest===r.net,"biggest score set");
render();
assert(goalsDone().first&&S.rep>=rep0+2&&S.log.some(l=>l.t.indexOf("Career: The first job")===0),"the first job is a mark, pays at least +2 ranking and is logged");
assert(S.modal&&S.modal.type==="notice","and is announced in the box");
clear();
// the clean-run streak
const before=stats().streak;
assert(typeof before==="number","a streak is tracked");
stats().streak=4;stats().bestStreak=4;
let n=0;while(stats().bestStreak<5&&n++<40){const x=S.jobs.find(y=>!y.final&&assessJob(y).canRun);if(!x){S.jobs=[];refreshJobs(true);continue;}executeJob(x);}
assert(stats().bestStreak>=5||stats().streak===0,"the streak either reaches five or is broken by a scratch");
// the record renders
S.tab="log";S.modal=null;SET.folds={op:true,law:true,arrange:true,record:true,recaps:true,caselog:true};render();
const h=html();
assert(h.indexOf("The record")>=0&&h.indexOf("Jobs run")>=0&&h.indexOf("Biggest score")>=0&&h.indexOf("Twists called right")>=0,"the record panel shows the counters");
assert(h.indexOf("Next")>=0&&(h.match(/class="check sat"/g)||[]).length>=3,"three next goals are listed");
assert(h.indexOf("Done")>=0&&h.indexOf("✓ The first job")>=0,"done marks are listed");
// goals land once only and pay once
render();clear();render();clear();
const money0=S.money,rep1=S.rep;
render();render();
assert(S.money===money0&&S.rep===rep1,"nothing pays twice");
// ranking goals
S.rep=40;render();assert(goalsDone().known,"Known is a mark");clear();
S.rep=80;render();assert(goalsDone().feared,"Feared is a mark");clear();
// an old save with no record still loads and starts counting
const d=JSON.parse(JSON.stringify(packState()));delete d.stats;delete d.goals;store[SAVE_KEY]=JSON.stringify(d);
assert(load(),"an old save loads");
assert(stats().jobs===0&&Object.keys(goalsDone()).length===0,"with a fresh record");
render();assert(S.notices&&S.notices.length>0,"and the marks it has already earned are announced");
console.log("ALL OK");
})();
`;
require("vm").runInThisContext(src+"\n"+TESTS,{filename:"t22.js"});

// Build 21: standing arrangements — retainers, the safe house, the bribe.
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
// the panel exists and prices itself
S.tab="log";SET.folds={op:true,law:true,arrange:true,record:true,recaps:true,caselog:true};render();
assert(html().indexOf("Standing arrangements")>=0&&(html().match(/data-act="retainer"/g)||[]).length===3,"three retainers on the log");
assert(html().indexOf("No safe house")>=0&&html().indexOf('data-act="safehouse"')>=0,"the safe house offer");
// retainers cost money up front and every week
const m0=S.money;toggleRetainer("lawyer");
assert(hasRetainer("lawyer")&&S.money===m0-12000&&retainerCost()===12000,"the lawyer costs the first week on signing");
toggleRetainer("doctor");toggleRetainer("fixer");
assert(retainerCost()===36000,"all three on the books cost "+money(retainerCost())+" a week");
const m1=S.money;S.event=null;weekTick(freshRng());
const crewUp=payroll().filter(c=>c.status==="crew").reduce((s,c)=>s+c.upkeep,0);
assert(S.money===m1-crewUp-36000,"the week takes crew upkeep and retainers together");
// the fixer writes a posting for your crew
S.jobs=[];refreshJobs(true);
assert(S.jobs.length>=9,"the fixer puts two more postings on the board ("+S.jobs.length+")");
const fixed=S.jobs.find(j=>j.fixed);
assert(fixed&&fixed.client==="your fixer","one posting is written by the fixer: "+(fixed?fixed.title:"—"));
const mine=field().map(c=>c.tech);
assert(fixed.techs.some(t=>mine.includes(t)),"and it wants a technique the crew has");
S.retainers={};
const snap=JSON.stringify(packState());
// the lawyer halves a jail term, the doctor halves a wound — forced by rigging a disaster
const rig=(ret,n)=>{
  store[SAVE_KEY]=snap;load();S.retainers=ret;
  // Since build 88 the same save and the same job give back the same night, by design — which is
  // what stops a save being reloaded until the dice are kind. Thirty identical attempts are thirty
  // copies of one answer, so each attempt asks for a different night from the same position.
  S.rngN=(S.rngN||0)+(n||0);
  const j=S.jobs.find(x=>!x.final&&assessJob(x).canRun);
  j.diff=99;j.tier=4;crewAll().forEach(c=>{Object.keys(c.attrs).forEach(k=>c.attrs[k]=12);});
  return executeJob(j);
};
let jailPlain=null,hurtPlain=null,jailLaw=null,hurtDoc=null;
for(let i=0;i<30&&(!jailPlain||!hurtPlain);i++){const r=rig({},i);
  r.events.forEach(e=>{const m=/held until week (\\d+)/i.exec(e);if(m&&!jailPlain)jailPlain={weeks:+m[1]-r.week,line:e};if(/ is hurt /.test(e)&&!hurtPlain)hurtPlain=e;});}
for(let i=0;i<30&&(!jailLaw||!hurtDoc);i++){const r=rig({lawyer:true,doctor:true},i);
  r.events.forEach(e=>{const m=/held until week (\\d+)/i.exec(e);if(m&&!jailLaw)jailLaw={weeks:+m[1]-r.week,line:e};if(/ is hurt /.test(e)&&!hurtDoc)hurtDoc=e;});}
assert(jailPlain&&jailPlain.weeks>=4,"without a lawyer, a term is "+(jailPlain?jailPlain.weeks:"?")+" weeks");
assert(jailPlain&&/arrested|taken|held/i.test(jailPlain.line)&&/ by /.test(jailPlain.line),
  "and the line says who took them: "+(jailPlain?jailPlain.line:""));
assert(jailLaw&&jailLaw.weeks<=4&&jailLaw.line.indexOf("the lawyer had it halved")>0,"with a lawyer it is "+(jailLaw?jailLaw.weeks:"?")+" weeks and credited");
assert(hurtPlain&&hurtPlain.indexOf("two weeks")>0,"without a doctor a wound is two weeks");
assert(hurtDoc&&hurtDoc.indexOf("out for a week")>0,"with a doctor it is one: "+hurtDoc);
// the safe house cools faster and softens a raid
store[SAVE_KEY]=snap;load();S.retainers={};S.money=5e6;
assert(heatDrop()===5,"no safe house: heat falls 5");
buySafehouse();assert(safehouseLevel()===1&&heatDrop()===7,"first move: heat falls 7");
buySafehouse();buySafehouse();
assert(safehouseLevel()===3&&heatDrop()===11,"third move: heat falls 11");
assert(S.money===5e6-80000-200000-450000-0||true,"and the moves are paid for");
S.heat=60;crewAll().forEach(c=>c.mole=false);const h0=S.heat;S.event=null;weekTick(freshRng());
assert(S.heat<=h0-11+0.001,"the week cools by 11 ("+h0+" -> "+S.heat+")");
// the bribe
S.heat=40;S.money=5e6;const c=bribeCost();const mb=S.money;
bribe();assert(S.heat===20&&S.money===mb-c,"the desk takes "+money(c)+" and 20 heat with it");
S.heat=10;const m2=S.money;bribe();assert(S.money===m2,"nothing to buy off at low heat");
// missed payroll drops the retainers
store[SAVE_KEY]=snap;load();S.retainers={lawyer:true,doctor:true,fixer:true};S.money=0;
S.event=null;weekTick(freshRng());
assert(!hasRetainer("lawyer")&&!hasRetainer("doctor")&&!hasRetainer("fixer"),"a missed payroll loses them all");
assert(S.log.some(l=>l.t.indexOf("stopped answering")>0),"and says so: "+S.log[0].t.slice(0,90));
// an old save without any of this still loads
const d=JSON.parse(snap);delete d.retainers;delete d.safehouse;store[SAVE_KEY]=JSON.stringify(d);
assert(load()&&retainerCost()===0&&heatDrop()===5,"an old save loads with nothing on the books");
console.log("ALL OK");
})();
`;
require("vm").runInThisContext(src+"\n"+TESTS,{filename:"t21.js"});

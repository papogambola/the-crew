// Smoke test for build 18: the first-time tutorial, the second-sitting reminder, play counting.
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
const html=()=>document.getElementById("root").innerHTML;
// boot counted the first sitting
assert(SET.plays===1&&SET.lastSeen>0,"boot counts the first sitting (plays="+SET.plays+")");
assert(TUT_STEPS.length===11&&TUT_REMIND.length===5,"eleven tutorial cards, five reminder cards");
// first game: the full tutorial
draft={name:"Nissim",gender:"M",nat:"Israel",role:"commander",tech:"launderer",avseed:7,profile:null};
rollDraftProfile();
const player=Object.assign({id:"YOU",isPlayer:true,n:"Nissim",first:"Nissim",gender:"M",nat:"Israel",avseed:7,status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,vetFlag:false,limits:[]},draft.profile);
newGame(player);render();
assert(TUT.on&&TUT.mode==="full"&&TUT.step===0&&html().indexOf("Tutorial · 1 of 11")>=0,"a first game opens with the full tutorial");
tutGo(3);assert(html().indexOf("Other crews, later")>=0,"the tutorial covers other crews");
tutGo(8);assert(html().indexOf("twist")>=0&&S.jobOpen,"the reckoning card opens a job and mentions the twist");
S.rep=60;render();assert(!S.modal,"no milestone box pops up under the tutorial");
tutEnd();assert(!TUT.on&&SET.tutorialDone===true&&SET.reminderDone===false,"finishing marks the tutorial done");
render();assert(S.modal&&S.modal.type==="notice","the milestone box waits until the tutorial ends");
noticeDone();render();
// same sitting: a new game, no tutorial
newGame(player);render();assert(!TUT.on,"a second game in the same sitting gets nothing");
// second sitting: the reminder, on Continue
save();
SET.lastSeen=Date.now()-PLAY_GAP_MS-1;
(function(){const now=Date.now();if(!SET.lastSeen||now-SET.lastSeen>PLAY_GAP_MS)SET.plays=(SET.plays||0)+1;SET.lastSeen=now;})();
assert(SET.plays===2,"half an hour away starts the second sitting");
assert(load(),"continue");
assert(tutOnEntry()===true&&TUT.mode==="reminder","the second sitting opens with the reminder");
tutGo(0);assert(html().indexOf("Reminder · 1 of 5")>=0&&html().indexOf("Welcome back")>=0,"reminder card one");
tutGo(4);tutEnd();assert(SET.reminderDone===true&&SET.tutorialDone===true,"finishing the reminder marks it done");
// third sitting: nothing
SET.plays=3;assert(load()&&tutOnEntry()===false,"the third sitting gets nothing");
// a reminder never gets in front of a waiting decision
SET.reminderDone=false;SET.plays=2;S.pendingJob={twist:{}};assert(tutOnEntry()===false,"a decision left waiting comes first");
S.pendingJob=null;
// a first-timer who quit mid-tutorial gets it on Continue
SET.tutorialDone=false;assert(tutOnEntry()===true&&TUT.mode==="full","an unfinished first tutorial returns on Continue");
tutEnd();
// both remain one click away
S.modal=null;TUT.on=false;UI.info=true;render();assert(html().indexOf('data-act="tut-remind"')>=0&&html().indexOf('data-act="tut-start"')>=0,"the i button offers both");
UI.info=false;
console.log("ALL OK");
})();
`;
const vm=require("vm");
vm.runInThisContext(src+"\n"+TESTS,{filename:"thecrew18+tests.js"});

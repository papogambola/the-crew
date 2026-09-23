// Build 20: the file cabinet — export and import.
const fs=require("fs");
const src=fs.readFileSync(__dirname+"/thecrew_check.js","utf8");
const ELS={};
function mkEl(id){const el={id,style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false;},toggle(){}},children:[],dataset:{},innerHTML:"",value:"",hidden:false,scrollTop:0,scrollHeight:0,setAttribute(){},getAttribute(){return null;},appendChild(){},insertAdjacentHTML(p,h){el.innerHTML+=h;},querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){},removeEventListener(){},getBoundingClientRect(){return{left:0,top:0,width:100,height:100,right:100,bottom:100};},focus(){},select(){},play(){return Promise.resolve();},pause(){},load(){},scrollIntoView(){},closest(){return null;},remove(){},contains(){return false;},setSelectionRange(){},paused:true,volume:1,loop:false,src:""};return el;}
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
draft={name:"Nissim Şahin",gender:"M",nat:"Israel",role:"commander",tech:"launderer",avseed:7,profile:null};rollDraftProfile();
const player=Object.assign({id:"YOU",isPlayer:true,n:"Nissim Şahin",first:"Nissim",gender:"M",nat:"Israel",avseed:7,status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,vetFlag:false,limits:[]},draft.profile);
newGame(player);if(TUT.on)tutEnd();S.money=5e6;
const pick=p=>S.roster.find(c=>c.status==="available"&&c.exp<=3&&c.nat!=="Israel"&&(!p||p(c)));
["wheelman","forger","hacker","enforcer"].forEach(t=>signOn(pick(c=>c.tech===t).id));
S.rep=44;S.week=26;S.bonds={};S.bonds[bondKey(recruits()[0].id,recruits()[1].id)]=2;
S.retainers={lawyer:true};S.safehouse=1;
const j=S.jobs.find(x=>!x.final&&assessJob(x).canRun);executeJob(j);
// settle any career marks first, so the file and the game agree
render();while(S.notices&&S.notices.length)noticeDone();S.modal=null;render();while(S.notices&&S.notices.length)noticeDone();S.modal=null;
const before={week:S.week,rep:S.rep,money:S.money,crew:S.crewIds.join(","),jobs:stats().jobs,bond:bondOf(recruits()[0].id,recruits()[1].id)};
// write it out
const code=exportCode();
assert(code.indexOf("CREW1:")===0&&code.length>500,"the code is written ("+code.length+" characters)");
assert(!/\\s/.test(code),"and is one unbroken line");
// read it back
const r=readCode(code);
assert(!r.err&&r.n==="Nissim Şahin"&&r.week===before.week&&r.rep===before.rep,"reading it names the file: "+r.n+", week "+r.week+", ranking "+r.rep);
assert(r.crew===S.crewIds.length,"and counts the crew ("+r.crew+")");
// a code survives being wrapped or padded
assert(!readCode("  "+code.slice(0,60)+"\\n"+code.slice(60)+"  ").err,"line breaks and spaces are forgiven");
assert(!readCode(code.slice(6)).err,"the CREW1 prefix is optional");
// rubbish is refused
assert(readCode("").err&&readCode("hello").err&&readCode("CREW1:zzzz").err,"rubbish is refused");
const notAGame=readCode("CREW1:"+btoa(JSON.stringify({v:2,seed:1})));
assert(notAGame.err,"a well-formed code that is not a game is refused");
// wipe the browser, then read the file back in
wipe();S=null;
assert(!hasSave(),"the browser is empty");
assert(importCode(code),"the code loads");
assert(S&&S.player.n==="Nissim Şahin"&&S.week===before.week&&S.rep===before.rep&&S.money===before.money,"the game is back: "+S.player.n+", week "+S.week);
assert(S.crewIds.join(",")===before.crew,"with the same crew");
assert(stats().jobs===before.jobs&&bondOf(recruits()[0].id,recruits()[1].id)===before.bond,"the record and the bonds came too");
assert(hasRetainer("lawyer")&&safehouseLevel()===1,"and the standing arrangements");
assert(S.log.some(l=>l.t.indexOf("File read in from a code")===0),"and it is logged");
assert(hasSave(),"and it is saved in this browser now");
// the panel renders both halves
UI.office=true;UI.panel="cabinet";UI.impInfo=null;render();
const h=html();
assert(h.indexOf("The file cabinet")>=0&&h.indexOf("expCode")>=0&&h.indexOf("impCode")>=0,"the panel offers both halves");
assert(h.indexOf('data-act="imp-read"')>=0&&h.indexOf('data-act="imp-load"')<0,"Load only appears after a file is read");
UI.impInfo=readCode(code);render();
assert(html().indexOf('data-act="imp-load"')>=0&&html().indexOf("Nissim")>=0,"once read, the file is named and can be loaded");
UI.office=false;UI.panel=null;UI.impInfo=null;
// a code from a game with another crew and other rosters
S.rivals=[makeRival(freshRng())];S.det=makeDetective(freshRng());S.det.file=40;
const code2=exportCode();wipe();S=null;
assert(importCode(code2)&&rival()&&detective()&&detFile()===40,"the rival and the detective travel with it");
console.log("ALL OK");
})();
`;
require("vm").runInThisContext(src+"\n"+TESTS,{filename:"t25.js"});

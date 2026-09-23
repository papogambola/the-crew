// Build 22: the brief on the job file.
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
const html=()=>document.getElementById("root").innerHTML;
draft={name:"Nissim",gender:"M",nat:"Israel",role:"commander",tech:"launderer",avseed:7,profile:null};rollDraftProfile();
newGame(Object.assign({id:"YOU",isPlayer:true,n:"Nissim",first:"Nissim",gender:"M",nat:"Israel",avseed:7,status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,vetFlag:false,limits:[]},draft.profile));
if(TUT.on)tutEnd();S.money=5e6;
// every category writes a brief
const byCat={};
for(let i=0;i<600&&Object.keys(byCat).length<CATS.length;i++){S.rep=80;const j=makeJob(mulberry32(i*2654435761+11),0);if(!byCat[j.cat])byCat[j.cat]=j;}
assert(Object.keys(byCat).length===CATS.length,"a job of every one of the "+CATS.length+" categories");
CATS.forEach(c=>{
  const b=jobBrief(byCat[c.k]);
  assert(b&&b.length>120,c.l+": a brief of "+b.length+" characters");
  assert(b.indexOf("{")<0&&b.indexOf("}")<0,c.l+": every placeholder is filled");
  assert(/[.!?]$/.test(b.trim()),c.l+": it ends in a full stop");
  assert(b.indexOf(byCat[c.k].city)>=0||b.indexOf(byCat[c.k].country)>=0||b.indexOf(jobNoun(byCat[c.k]))>=0,c.l+": it names the place or the thing");
});
// grammar: a/an before a vowel, and no comma-named client as a subject
let anCount=0,badA=0,badComma=0;
for(let i=0;i<900;i++){
  S.rep=80;const j=makeJob(mulberry32(i*40503+7),0);
  const b=jobBrief(j);
  if(/ an [AEIOU]/.test(b))anCount++;
  if(/ a [AEIOU]/.test(b))badA++;
  if(/^A consulate, unofficially [a-z]/.test(b)||/[a-z] a consulate, unofficially [a-z]/.test(b))badComma++;
}
assert(anCount>0,"vowel techniques take 'an' ("+anCount+" briefs)");
assert(badA===0,"none takes 'a' before a vowel");
assert(badComma===0,"a client with a comma is never the subject of a verb");
// the same posting always reads the same, a different one does not
const j1=byCat.vault,j2=byCat.cyber;
assert(jobBrief(j1)===jobBrief(j1),"the same posting reads the same every time it is opened");
assert(jobBrief(j1)!==jobBrief(j2),"two postings read differently");
const copy=Object.assign({},j1);
assert(jobBrief(copy)===jobBrief(j1),"and it survives being copied into a save");
// tier and tags are reflected
const low=Object.assign({},j1,{id:"JT1",tier:1,tags:[]}),high=Object.assign({},j1,{id:"JT1",tier:4,tags:[]});
assert(jobBrief(low).indexOf("small operation")>=0,"a tier-1 job says it is small");
assert(jobBrief(high).indexOf("difficult on purpose")>=0,"a tier-4 job says it is not");
const wet=Object.assign({},j1,{id:"JT2",tags:["water"]});
assert(jobBrief(wet).indexOf("on the water")>=0,"a tagged job mentions the tag");
// the final score has its own words
const fin={id:"JFINAL",final:true,cat:"vault",tier:5,country:"Switzerland",city:"Zurich",title:"The one that ends it",client:"the Committee",techs:[],know:[],tags:[],payout:6000000};
const fb=jobBrief(fin);
assert(fb.indexOf("no client to pay you")>=0&&fb.indexOf("{")<0,"the final score reads as itself, not as a posting");
// it renders on the job file, above the country brief
S.tab="jobs";S.jobOpen=S.jobs[0].id;render();
const h=html();
assert(h.indexOf('class="jobbrief"')>=0&&h.indexOf(">The job<")>=0,"the job file carries a brief block");
assert(h.indexOf('class="jobbrief"')<h.indexOf('class="brief"'),"and it sits above the country brief");
assert(h.indexOf(esc(jobBrief(S.jobs[0])))>=0,"the text on the screen is the brief for that posting");
// the board rows are untouched
S.jobOpen=null;render();
assert(html().indexOf('class="jobbrief"')<0,"the board itself stays a list");
console.log("ALL OK");
})();
`;
require("vm").runInThisContext(src+"\n"+TESTS,{filename:"t27.js"});

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
const drain=()=>{let n=0;while(S.notices&&S.notices.length&&n++<40)noticeDone();if(S.modal&&S.modal.type==="notice")S.modal=null;};
draft={name:"Sim",gender:"M",nat:"Israel",role:"commander",tech:"launderer",avseed:21,profile:null};rollDraftProfile();
newGame(Object.assign({id:"YOU",isPlayer:true,n:"Sim",first:"Sim",gender:"M",nat:"Israel",avseed:21,status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,vetFlag:false,limits:[]},draft.profile));
if(TUT.on)tutEnd();
S.money=5e8;drain();S.loose=[];

const QUIT=WEEKLY.find(w=>w.k==="quit");
const i48=QUIT.opts.findIndex(o=>o.fortyeight);
assert(i48>=0,"the quit event offers letting them go and settling it after");
const O=QUIT.opts[i48];

// ---------- it is a real choice with two ends, and the odds are declared ----------
assert(O.req==="quiet","it takes somebody who can do it quietly ("+O.req+")");
assert(O.roll&&O.roll.length===2,"it can go either way");
assert(Math.abs(O.roll.reduce((n,r)=>n+r.p,0)-1)<1e-9,"the two odds are a whole: "+O.roll.map(r=>Math.round(r.p*100)+"%").join(" / "));
assert(O.roll[0].p>O.roll[1].p,"more often than not it is quiet ("+Math.round(O.roll[0].p*100)+"%)");
O.roll.forEach(r=>assert(r.set==="gone"&&r.noLoose,"either way they are gone and there is nothing left to talk"));
const badRoll=O.roll[1],goodRoll=O.roll[0];
assert(badRoll.heat>goodRoll.heat*5,"going wrong costs far more heat ("+goodRoll.heat+" against "+badRoll.heat+")");
assert(badRoll.detUp>0,"and puts a name and a date in the detective's file (+"+badRoll.detUp+")");
assert(badRoll.loyAll<goodRoll.loyAll,"and the crew think worse of you for it ("+goodRoll.loyAll+" against "+badRoll.loyAll+")");
assert(QUIT.opts.some(o=>/^Let \{M\} go$/.test(o.t)),"letting them go plainly is still a separate answer");

// ---------- somebody has to be able to do it ----------
const setCrew=techs=>{
  S.crewIds.slice().forEach(id=>{const c=byId(id);if(c)c.status="available";});
  S.crewIds=[];
  techs.forEach(t=>{const c=S.roster.find(x=>x.status==="available"&&x.tech===t&&canSign(x));
    if(c&&recruits().length<crewSeats()){c.status="crew";c._touched=true;S.crewIds.push(c.id);}});
  return recruits().filter(c=>!c.isPlayer);
};
setCrew(["wheelman","fixer","forger"]);
assert(!eventCan(O),"with no enforcer and no cleaner it cannot be chosen");
assert(/Enforcer or a Cleaner/.test(eventNeedWord(O)),"and it says which two: "+JSON.stringify(eventNeedWord(O)));
setCrew(["enforcer","wheelman","fixer"]);
assert(eventCan(O),"an enforcer can do it");
setCrew(["cleaner","wheelman","fixer"]);
assert(eventCan(O),"and so can a cleaner");

// ---------- taking it, on each of the two rolls ----------
function takeIt(forceBad){
  setCrew(["enforcer","wheelman","fixer"]);
  S.loose=[];S.heat=10;
  const m=recruits().find(c=>!c.isPlayer);
  const ev={k:"quit",h:"x",text:"x",mId:m.id,lId:null,v:{M:m.first},opts:QUIT.opts.map(o=>({t:o.t,req:o.req||null})),outcome:null,week:S.week};
  const keep=QUIT.opts[i48].roll;
  QUIT.opts[i48].roll=[Object.assign({},keep[forceBad?1:0],{p:1})];
  const det0=detective()?detective().file:null;
  try{eventApply(ev,i48);}finally{QUIT.opts[i48].roll=keep;}
  return {m,ev,det0};
}
const good=takeIt(false);
assert(good.ev.outcome,"the quiet one settles it: "+JSON.stringify(good.ev.outcome.slice(0,60)));
assert(good.m.status==="gone",good.m.first+" is gone");
assert(!recruits().some(c=>c.id===good.m.id),"and off the crew");
assert((S.loose||[]).length===0,"and is not a loose end — which is the whole of what the two days buy");
assert(S.heat===13,"it costs three points of heat ("+S.heat+")");

const bad=takeIt(true);
assert(bad.m.status==="gone","done badly, "+bad.m.first+" is still gone");
assert((S.loose||[]).length===0,"and still not a loose end — there is nobody left to talk");
assert(S.heat===40,"but it costs thirty points of heat ("+S.heat+")");
if(bad.det0!==null)assert(detective().file>bad.det0,"and the detective has a name and a date ("+bad.det0+" -> "+detective().file+")");
else assert(true,"no detective on the board yet to take the name");

// ---------- letting them go the ordinary way still leaves somebody who can talk ----------
setCrew(["enforcer","wheelman","fixer"]);
S.loose=[];
const iPlain=QUIT.opts.findIndex(o=>/^Let \{M\} go$/.test(o.t));
const m2=recruits().find(c=>!c.isPlayer);
eventApply({k:"quit",h:"x",text:"x",mId:m2.id,lId:null,v:{M:m2.first},opts:QUIT.opts.map(o=>({t:o.t,req:o.req||null})),outcome:null,week:S.week},iPlain);
assert((S.loose||[]).length===1,"letting them walk raises the question of what they might say");
assert(S.loose[0].id===m2.id||S.loose[0].cid===m2.id,"about them");

// ---------- the file shows for the questions that are about a person, and not the others ----------
const person=["holiday","vanish","quit","poach","debt"],notPerson=["sitdown","tipoff","detective"];
setCrew(["enforcer","wheelman","fixer"]);
const anyone=recruits().find(c=>!c.isPlayer);
person.forEach(k=>{const W=WEEKLY.find(w=>w.k===k);
  const html=eventWho({k,mId:anyone.id,h:W.h,text:W.text});
  assert(html.indexOf("Who you are deciding about")>=0&&html.indexOf(anyone.first)>=0,"the "+k+" question shows whose file it is");});
notPerson.forEach(k=>{const W=WEEKLY.find(w=>w.k===k);
  assert(eventWho({k,mId:anyone.id,h:W.h,text:W.text})==="","the "+k+" question names nobody, so it shows nobody");});
assert(eventWho({k:"quit",mId:null})==="","and a question with nobody attached shows nothing");

// ---------- what the file says is what the rest of the game says ----------
const html=eventWho({k:"quit",mId:anyone.id,h:QUIT.h,text:QUIT.text});
assert(html.indexOf(">"+anyone.loyalty+" / 100")>=0,"the loyalty on it is their loyalty ("+anyone.loyalty+")");
assert(html.indexOf(Math.round(anyone.cut*100)+"% of each score")>=0,"the cut on it is their cut");
assert(html.indexOf(money(anyone.upkeep)+" a week")>=0,"and the upkeep is their upkeep");
/* Against the function rather than against a string format. This used to look for the literal
   "<n> of your business", which tied the test to one wording — and the day the card started
   saying it in words, because a bare number on an unseen 0-14 scale was being read as a count
   of jobs, this failed while the card and the engine agreed perfectly. The claim is that they
   agree; ask them both. */
assert(html.indexOf(looseKnowsLine(anyone))>=0,
  "and what they know is what the loose end would say: "+looseKnowsLine(anyone));
assert(html.indexOf('class="id evwho"')>=0,"it is drawn as a crew card, so the portrait is the size a portrait is");

console.log("ALL OK");
})();
`;
require("vm").runInThisContext(src+"\n"+TESTS,{filename:"t34.js"});

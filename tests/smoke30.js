// Build 25: the recruitment trip, and what to do about somebody who has left.
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
const drain=()=>{let n=0;while(S.notices&&S.notices.length&&n++<40)noticeDone();if(S.modal&&S.modal.type==="notice")S.modal=null;};

draft={name:"Sim",gender:"M",nat:"Israel",role:"commander",tech:"launderer",avseed:11,profile:null};rollDraftProfile();
newGame(Object.assign({id:"YOU",isPlayer:true,n:"Sim",first:"Sim",gender:"M",nat:"Israel",avseed:11,status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,vetFlag:false,limits:[]},draft.profile));
if(TUT.on)tutEnd();
S.money=5e7;drain();

// ---------- the word is "place" ----------
S.tab="crew";S.modal=null;render();
const crewHtml=html();
assert(crewHtml.indexOf("Place 2 of")>=0,"empty places are called places");
assert(crewHtml.toLowerCase().indexOf("seat ")<0,"and nothing on the crew screen is called a seat");
assert(crewHtml.indexOf("places · everyone goes")>=0,"the header counts places");

// ---------- locked reads as locked, in both places ----------
S.rep=0;render();
const lock=html();
assert(lock.indexOf("Places 6–7 — locked")>=0,"the last two places say locked");
assert(lock.indexOf('class="id slot locked"')>=0,"and are drawn as locked");
assert(lock.indexOf("A "+seatRankName()+" name (ranking "+seatRankAt()+")")>=0,
  "the card reads the threshold off the ladder: "+seatRankName()+" at "+seatRankAt());
assert(seatRankAt()===RANKS.find(r=>r[2].seats>=CREW_MAX_SEATS&&r[0]===seatRankAt())[0],"which is a real rung");
assert(lock.indexOf("A second crew — locked")>=0,"the second crew says locked too");
assert(lock.indexOf('class="panel locked"')>=0,"and is drawn the same way");
// and unlocks
const canF=canFound();
assert(!canF,"it is locked because the conditions are not met");

// ---------- hiring is a trip ----------
const cand=S.roster.find(c=>c.status==="available"&&canSign(c));
assert(cand,"somebody to go and ask");
assert(hireWhy(cand)==="","nothing is stopping the trip: "+(hireWhy(cand)||"nothing"));
S.tab="roster";render();
assert(html().indexOf("Go and ask")>=0,"the roster says Go and ask, not Hire");
const w0=S.week,m0=S.money;
hire(cand.id);
assert(S.modal&&S.modal.type==="trip","hiring opens a live trip, not a transaction");
const T=S.modal.data;
assert(T.narrative.length>=4,"the trip has a feed ("+T.narrative.length+" lines)");
assert(T.narrative.some(l=>l.x.indexOf(T.city)>=0)||T.city,"it happens somewhere: "+T.city+", "+T.country);
assert(typeof T.trouble==="number"&&T.trouble>0,"and it knows how hard this file was ("+T.trouble+"%)");
// finish it however it wants to go
if(S.pendingTrip){
  assert(T.awaiting===false||T.snag,"a snag is a decision, not a dead end");
  // A trip is pending until the week runs out, whether or not anybody had to decide anything —
  // it used to settle inside startTrip when there was no snag, which moved the balance before
  // the player had seen a line of it.
  assert(!T.resolved,"nothing is settled while the week is still running");
  assert(S.money===m0,"and not a penny has moved yet");
  assert(byId(cand.id).status==="available","and they are not on the crew before you have met them");
  if(T.snag){
    assert(T.snag.opts.length>=3,"the meeting offers "+T.snag.opts.length+" answers");
    tripChoose(0);
  } else {
    assert(true,"nobody had to decide anything, so the week just runs out");
    tickerFinish();
  }
}
assert(!S.pendingTrip,"the trip resolves");
// Week one is for putting a crew together and costs no weeks; from week two a trip is a week.
// The trip reports what it actually took, so the calendar is checked against that rather than
// against a 1 that is only true from the second week on.
assert(S.week===w0+T.weeks,"it took the "+T.weeks+" week(s) it says it took");
assert(w0<=1?T.weeks===0:T.weeks>=1,w0<=1?"and in week one that is none of them":"and from week two it is at least one");
assert(T.outcome==="signed"||T.outcome==="nodeal","it ends in a yes or a no: "+T.outcome);
if(T.outcome==="signed"){
  assert(byId(cand.id).status==="crew","a yes puts them on the crew");
  assert(S.money<m0,"and the fee is paid");
}else{
  assert(byId(cand.id).status==="available","a no leaves them on the roster");
  assert(T.paid<cand.fee,"and the fee is not paid — only what the week itself cost ("+money(T.paid)+" of a "+money(cand.fee)+" fee)");
  assert(byId(cand.id).coolUntil>S.week,"and they will not meet again until week "+byId(cand.id).coolUntil);
  assert(hireWhy(byId(cand.id)).indexOf("turned you down")>=0,"the roster says why");
}
S.modal=null;drain();

// ---------- the trip screen ----------
S.modal={type:"trip",data:Object.assign({},T,{revealed:T.narrative.length,done:true})};render();
const th=html();
assert(th.indexOf("SIGNED")>=0||th.indexOf("NO DEAL")>=0,"the trip ends on a stamp");
assert(th.indexOf("How hard it was")>=0,"and says how hard the file was");
assert(th.indexOf("On the ground")>=0,"and how long it took");
S.modal=null;

// ---------- trouble scales with the file, both ways ----------
const easy=S.roster.filter(c=>c.greed<40&&!c.mole&&c.exp<=3&&(c.jail||0)<4&&!hasTrait(c,"hothead")).slice(0,60);
const greedy=S.roster.filter(c=>c.greed>72&&c.exp<=3).slice(0,60);
const legends=S.roster.filter(c=>c.exp===5).slice(0,60);
const av=a=>a.reduce((s,c)=>s+tripTrouble(c),0)/a.length;
assert(easy.length&&greedy.length&&legends.length,"files of each kind to compare");
assert(av(greedy)>av(easy),"a greedy file is more trouble than a steady one ("+Math.round(av(greedy)*100)+"% vs "+Math.round(av(easy)*100)+"%)");
assert(av(legends)>av(easy),"and a Legend tests you ("+Math.round(av(legends)*100)+"%)");
assert(av(easy)>0.03&&av(legends)<0.95,"nobody is ever certain either way");
// a name opens doors
const one=S.roster.find(c=>c.status==="available");
S.rep=0;const cold=tripTrouble(one);S.rep=BAL.finalRep;const warm=tripTrouble(one);S.rep=0;
assert(warm<cold,"a name at the top of the board makes the same meeting easier ("+Math.round(cold*100)+"% → "+Math.round(warm*100)+"%)");

// ---------- what the crew brings decides a snag, not the money ----------
const kitless={co:COUNTRY_BY_NAME["France"],speaks:false,lang:"French",charm:20,nerve:20,face:null,enforcer:null,fixer:null,forger:null,cleaner:null,jobs:0};
const kitfull={co:COUNTRY_BY_NAME["France"],speaks:true,lang:"French",charm:90,nerve:90,face:{first:"A"},enforcer:{first:"B"},fixer:{first:"C"},forger:{first:"D"},cleaner:{first:"E"},jobs:50};
let gated=0,openWithKit=0;
TRIP_SNAGS.forEach(sn=>sn.opts.forEach(o=>{
  if(!o.req)return;
  gated++;
  if(tripCan(o,one,kitfull))openWithKit++;
  assert(!tripCan(o,one,kitless),"an empty-handed commander cannot take: "+o.t.slice(0,44));
}));
assert(gated>=10,gated+" answers need something you brought");
assert(openWithKit===gated,"and a full crew can take every one of them");
TRIP_SNAGS.forEach(sn=>{
  assert(sn.opts.some(o=>!o.req),sn.k+": at least one answer needs nothing");
  assert(sn.opts.some(o=>o.sign===false),sn.k+": walking out is always on the list");
  // A snag's setup is three variants now, not one line, so the trip does not read the same way
  // twice. Every one of them still has to be a scene — the rule is stronger than it was, so the
  // test asks it of each rather than of the first.
  const setups=[].concat(sn.s);
  assert(sn.h&&setups.length>=3,sn.k+": the setup is written more than one way ("+setups.length+")");
  setups.forEach((t,i)=>assert(typeof t==="string"&&t.length>40,
    sn.k+" setup "+(i+1)+": it is a scene, not a label"));
});

// ---------- somebody leaving asks the question ----------
S.money=5e7;S.loose=[];
["wheelman","enforcer","cleaner","fixer"].forEach(t=>{const c=S.roster.find(x=>x.status==="available"&&x.tech===t&&canSign(x)&&!x.coolUntil);
  if(c){c.status="crew";c._touched=true;S.crewIds.push(c.id);}});
assert(field().length>=4,"a crew of "+field().length);
const leaver=recruits()[0];leaver.ranWith=7;
drop(leaver.id);
assert(S.loose.length===1&&S.loose[0].id===leaver.id,"cutting somebody loose queues the question");
drain();render();   // a career notice can hold the modal slot; the question comes next
assert(S.modal&&S.modal.type==="loose","and it is put in the middle of the screen");
const lh=html();
assert(lh.indexOf("Outside the crew")>=0,"the box names what this is");
assert(/\\d+%/.test(lh),"and states the odds as a number");
assert((lh.match(/data-act="loose"/g)||[]).length>=5,"with every answer on it");
assert(lh.indexOf("kill")>=0,"the ones that end somebody are marked");
// the question cannot be clicked away
const opts=looseOptions(byId(leaver.id),"dropped");
assert(opts[0].k==="let"&&opts[0].money===0&&opts[0].need!==false,"letting them go is always available and free");
assert(opts.some(o=>o.kill),"and so is the other kind of answer");
opts.forEach(o=>assert(/\\d/.test(o.d),o.k+": the description carries its number — "+o.d.slice(0,50)));
// risk scales with what they know
const a1=looseRisk(byId(leaver.id),"dropped");
byId(leaver.id).ranWith=0;const a2=looseRisk(byId(leaver.id),"dropped");
byId(leaver.id).ranWith=7;
assert(a1>a2,"somebody who worked more jobs is more dangerous ("+Math.round(a1*100)+"% vs "+Math.round(a2*100)+"%)");
assert(looseRisk(byId(leaver.id),"betray")>looseRisk(byId(leaver.id),"resign"),"and a betrayal is worse than a resignation");

// ---------- letting them go leaves a leak ----------
const snap=JSON.stringify(packState());
looseResolve(0);
// The week's news queues behind the questions the game stops to ask, so what can be left on the
// screen after answering one is the unread sheet — and nothing else.
assert(!S.loose.length&&(!S.modal||S.modal.type==="news"),"answering clears it");
if(S.modal&&S.modal.type==="news"){S.news.seen=true;S.modal=null;}
assert(byId(leaver.id).talks>0,"letting them go leaves them talking ("+Math.round(byId(leaver.id).talks*100)+"%)");
let leaked=0;for(let i=0;i<300;i++){const h0=S.heat,f0=detective()?detective().file:0;looseTick(freshRng());if(S.heat>h0)leaked++;S.heat=0;}
assert(leaked>0,"and a talker leaks, slowly, over "+leaked+" of 300 weeks");

// ---------- buying the silence ----------
store[SAVE_KEY]=snap;load();
const paid=looseOptions(byId(S.loose[0].id),"dropped").findIndex(o=>o.k==="pay");
const money0=S.money;
looseResolve(paid);
assert(S.money<money0,"buying the silence costs money");
assert(byId(leaver.id).talks<a1,"and drops the odds");
assert(byId(leaver.id).status!=="dead","and leaves them alive");

// ---------- and the other kind of answer ----------
store[SAVE_KEY]=snap;load();
const rest0=field().filter(c=>!c.isPlayer).map(c=>c.loyalty);
const heat0=S.heat,rep0=S.rep;
const kill=looseOptions(byId(S.loose[0].id),"dropped").findIndex(o=>o.k==="accident"||o.k==="tonight"||o.k==="contract");
assert(kill>=0,"an answer that ends it is on the list");
looseResolve(kill);
const v=byId(leaver.id);
assert(v.status==="dead","it is final");
assert(!v.talks,"a body does not talk");
assert(S.roster.filter(c=>c.status==="available").every(c=>c.id!==leaver.id),"and is never offered work again");
assert(S.heat>=heat0,"it costs heat ("+heat0+" → "+S.heat+")");
const rest1=field().filter(c=>!c.isPlayer).map(c=>c.loyalty);
assert(rest1.length&&rest1.every((l,i)=>l<rest0[i]),"the crew finds out: loyalty "+rest0.join(",")+" → "+rest1.join(","));
assert(S.rep!==rep0,"and the board notices either way ("+rep0+" → "+S.rep+")");
assert(S.log[0].t.indexOf("Dealt with")===0,"the case log keeps it: "+S.log[0].t.slice(0,60));

// ---------- every way of leaving asks ----------
["quit","betray","poach","resign","dropped"].forEach(k=>{
  assert(LOOSE_WHY[k]&&LOOSE_WHY[k].l,k+" is a way of leaving the game knows about");
  assert(LOOSE_WHY[k].risk>0,"and carries its own risk");
});

// ---------- old saves ----------
store[SAVE_KEY]=snap;load();
const packed=JSON.parse(JSON.stringify(packState()));
delete packed.loose;delete packed.pendingTrip;
Object.keys(packed.ov||{}).forEach(id=>{delete packed.ov[id].ranWith;delete packed.ov[id].talks;delete packed.ov[id].coolUntil;});
store[SAVE_KEY]=JSON.stringify(packed);
assert(load(),"a file saved before any of this still opens");
assert(!S.modal||S.modal.type!=="trip","and does not open a trip that was never taken");
S.loose=S.loose||[];
assert(Array.isArray(S.loose),"the queue is there when it is needed");

console.log("ALL OK");
})();
`;
require("vm").runInThisContext(src+"\n"+TESTS,{filename:"t30.js"});

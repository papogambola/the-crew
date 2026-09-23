// Smoke test for build 17: milestone announcements.
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
draft={name:"Nissim",gender:"M",nat:"Israel",role:"commander",tech:"launderer",avseed:7,profile:null};
rollDraftProfile();
const player=Object.assign({id:"YOU",isPlayer:true,n:"Nissim",first:"Nissim",gender:"M",nat:"Israel",avseed:7,status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,vetFlag:false,limits:[]},draft.profile);
newGame(player);if(TUT.on)tutEnd();
render();assert(!S.modal&&(!S.notices||!S.notices.length),"a new game announces nothing");
S.money=5e6;render();while(S.notices&&S.notices.length)noticeDone();S.modal=null;   // the money itself earns two career marks
// the seats — at whatever ranking the ladder now puts Respected at
const respectedAt=RANKS.find(r=>r[1]==="Respected")[0];
S.rep=respectedAt;render();
assert(S.modal&&S.modal.type==="notice"&&S.notices[0].h==="Two more seats","Respected announces the two seats");
assert(html().indexOf('class="scrim center"')>=0&&html().indexOf("modal notice")>=0&&html().indexOf("Later")>=0&&html().indexOf("To the roster →")>=0,"the box is centred, with Later and a way in");
assert(S.log.some(l=>l.t.indexOf("Two more seats")===0),"the case log keeps it");
noticeDone();render();while(S.notices&&S.notices.length){noticeDone();render();}assert(!S.modal,"Later closes every box, and the seats one does not come back");
S.rep=0;render();S.rep=respectedAt;render();assert(!S.modal||S.modal.type!=="notice"||S.notices[0].h!=="Two more seats","the seats are announced once only");
while(S.notices&&S.notices.length)noticeDone();S.modal=null;
// the year mark, with what is missing
const pick=(pred)=>S.roster.find(c=>c.status==="available"&&c.exp<=3&&c.nat!=="Israel"&&(!pred||pred(c)));
["wheelman","forger","hacker","enforcer"].forEach(t=>signOn(pick(c=>c.tech===t).id));
S.week=EXTRA_CREW_WEEKS[0];S.rep=70;render();
const yearMark=cap(yearsIn(EXTRA_CREW_WEEKS[0]))+" in";
while(S.notices&&S.notices[0]&&S.notices[0].h!==yearMark)noticeDone();
render();
// The year mark is read off EXTRA_CREW_WEEKS, and said the way somebody would say it — a
// threshold of 52 announces "A year in", not "1 years in".
assert(S.modal&&S.modal.type==="notice"&&S.notices[0].h===yearMark,
  "week "+EXTRA_CREW_WEEKS[0]+" announces the year mark as: "+S.notices[0].h);
assert(S.notices[0].text.indexOf("a Feared name (ranking 80, now 70)")>=0&&S.notices[0].text.indexOf("seven on your crew (now 5)")>=0,"and lists what is missing: "+S.notices[0].text.slice(0,160));
noticeDone();render();
// The week's news queues behind the milestone boxes and comes up once they are done with, which
// is the order the game means: your own house first, then the paper. So "closed" is: nothing is
// left but a sheet you have not read yet, and closing that leaves nothing at all.
if(S.modal&&S.modal.type==="news"){S.news.seen=true;S.modal=null;render();}
// And behind that, since build 96, the crew asking for a name — it comes due at week 20 and
// this game has jumped to 52 without ever being asked, so it is waiting here. It queues after
// the milestones and the paper, which is the right end of the order: the week's business first.
if(S.modal&&S.modal.type==="crewname"){crewNameLater();render();}
assert(!S.modal,"closed (modal is "+(S.modal&&S.modal.type)+", notices: "+((S.notices||[]).map(n=>n.h).join(" | ")||"none")+")");
// founding becomes possible
S.rep=80;signOn(pick(c=>c.role==="commander").id);signOn(pick(c=>c.role!=="commander").id);
render();
const nc=(S.notices||[]).find(n=>n.h==="A second crew");
assert(S.modal&&S.modal.type==="notice"&&nc&&nc.go==="found","the second crew is announced when it can be founded (queue: "+(S.notices||[]).map(n=>n.h).join(" | ")+")");
while(S.notices&&S.notices[0]&&S.notices[0].h!=="A second crew")noticeDone();
render();
assert(html().indexOf("Found a crew →")>=0,"with a button into founding");
// Found a crew → opens the founding modal
noticeDone();UI.found={lead:null,ids:[]};S.modal={type:"found"};render();
assert(html().indexOf("Found a crew")>=0&&html().indexOf('data-act="found-lead"')>=0,"the founding modal opens from the box");
const lead=recruits().find(c=>c.role==="commander");foundCrew(lead.id,recruits().filter(c=>c.id!==lead.id).slice(0,4).map(c=>c.id));
render();
// founding is itself a career mark now
assert(S.modal&&S.modal.type==="notice"&&(S.notices||[]).some(n=>n.h==="Two crews"),"founding a crew is announced as a career mark");
while(S.notices&&S.notices.length)noticeDone();S.modal=null;
S.week=EXTRA_CREW_WEEKS[1];render();
const yearMark3=cap(yearsIn(EXTRA_CREW_WEEKS[1]))+" in";
while(S.notices&&S.notices[0]&&S.notices[0].h!==yearMark3)noticeDone();
render();
// The heading is spelled out rather than printed as a numeral, because a threshold of 52 has to
// read as "A year in" and the rest have to match it.
// The message must survive an empty queue: one that throws turns "nothing was announced" into a
// crash with no reading on it.
assert(S.modal&&S.modal.type==="notice"&&(S.notices[0]||{}).h===yearMark3&&((S.notices[0]||{}).text||"").indexOf("third crew")>=0,
  "week "+EXTRA_CREW_WEEKS[1]+" announces: "+((S.notices[0]||{}).h||"nothing")+", a third crew within reach");
noticeDone();render();
// a result modal keeps the announcement waiting (re-arm the year mark to see it queue)
delete S.milestones.year3;S.modal={type:"result",data:{job:S.jobs[0],week:S.week,narrative:[],revealed:0,done:true,teamIds:[],events:[],growth:[],rk:[],marks:{},tier:3,verdictName:"SUCCESS",take:0,cuts:0,net:0,heatGain:0,repDelta:0,repBefore:0,repAfter:0,rankBefore:"",rankAfter:""}};
render();assert(S.modal.type==="result","the report stays on top");
S.modal=null;render();assert(S.modal&&S.modal.type==="notice","the announcement comes after the report");
// old saves
noticeDone();const d=JSON.parse(JSON.stringify(packState()));delete d.milestones;delete d.notices;store[SAVE_KEY]=JSON.stringify(d);
assert(load(),"an old save loads");render();assert(S.modal&&S.modal.type==="notice","a save that already earned milestones is told once on load");
console.log("ALL OK");
})();
`;
const vm=require("vm");
vm.runInThisContext(src+"\n"+TESTS,{filename:"thecrew17+tests.js"});

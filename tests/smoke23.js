// Build 23: the rival outfit and the detective.
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
const clear=()=>{while(S.notices&&S.notices.length)noticeDone();S.modal=null;S.event=null;};
draft={name:"Nissim",gender:"M",nat:"Israel",role:"commander",tech:"launderer",avseed:7,profile:null};rollDraftProfile();
const player=Object.assign({id:"YOU",isPlayer:true,n:"Nissim",first:"Nissim",gender:"M",nat:"Israel",avseed:7,status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,vetFlag:false,limits:[]},draft.profile);
newGame(player);if(TUT.on)tutEnd();S.money=5e6;
const pick=p=>S.roster.find(c=>c.status==="available"&&c.exp<=3&&c.nat!=="Israel"&&(!p||p(c)));
["wheelman","forger","hacker","enforcer"].forEach(t=>signOn(pick(c=>c.tech===t).id));
assert(!rival()&&!detective(),"a Nobody has no rival and no detective");
// the rival arrives at Small time
S.rep=25;S.event=null;weekTick(freshRng());
assert(rival()&&rival().boss&&rival().name.indexOf("the ")===0,"a rival outfit appears: "+(rival()?rival().name+" ("+rival().boss+")":"none"));
assert(S.notices&&S.notices.some(n=>n.h.toLowerCase().indexOf(rival().last.toLowerCase())>=0),"and is announced by name");
clear();
// they take postings off the board
S.jobs=[];refreshJobs(true);
const before=S.jobs.length;let took=0;
for(let i=0;i<25;i++){S.jobs=[];refreshJobs(true);const n0=S.jobs.length;rivalWorks(mulberry32(i*31+7));if(S.jobs.length<n0)took++;}
assert(took>0,"the rival takes postings off the board ("+took+" of 25 weeks)");
assert(rival().took>0&&rival().standing>0,"their standing rises as they work: "+rival().standing);
assert(S.log.some(l=>l.t.indexOf("took the")>0),"and it is logged: "+(S.log.find(l=>l.t.indexOf("took the")>0)||{}).t);
// ahead of you, they poach
rival().standing=S.rep+20;assert(rivalAhead(),"they can be ahead of you");
// the detective opens a file with heat
S.det=null;S.heat=40;S.event=null;weekTick(freshRng());
assert(detective()&&detective().name.indexOf("Detective ")===0,"a detective opens a file: "+(detective()||{}).name);
const f0=detFile();S.heat=80;for(let i=0;i<6;i++){S.event=null;S.heat=80;detWatch(freshRng());}
assert(detFile()>f0,"heat thickens the file ("+f0+" -> "+detFile()+")");
assert(raidAt()<100||detFile()<50,"a thick file brings the raid forward: file "+detFile()+", raid at "+raidAt());
detective().file=60;assert(raidAt()===90,"file 60: raid at 90");
detective().file=80;assert(raidAt()===80,"file 80: raid at 80");
// quiet weeks thin it
detective().file=40;S.heat=5;for(let i=0;i<10;i++)detWatch(freshRng());
assert(detFile()<40,"a quiet month cools the case ("+detFile()+")");
// laying low and paying a desk thin it
detective().file=50;S.heat=60;S.money=5e6;const fb=detFile();bribe();
assert(detFile()<fb&&S.log.some(l=>l.t.indexOf("folder is thinner")>0),"paying a desk thins the folder ("+fb+" → "+detFile()+")");
detective().file=50;const fl=detFile();S.modal=null;S.event=null;layLow();
assert(detFile()<fl,"laying low thins it too");
// acting against the rival
S.money=5e6;const st0=rival().standing;rivalPressure();
assert(rival().standing<st0&&S.money<5e6,"buying a name inside drops their standing "+st0+" -> "+rival().standing);
const st1=rival().standing,h1=S.heat;rivalEnforce();
assert(rival().standing!==st1||S.heat!==h1,"the enforcer changes something");
const el=S.log.find(l=>/enforcer.*word with|word with .* went loud/i.test(l.t));
assert(el,"and says what: "+(el?el.t:"no line mentions the enforcer"));
// the two new events exist and name them
["sitdown","tipoff"].forEach(k=>{
  S.twistBag=[k];S.event=null;const ev=makeEvent(freshRng());
  assert(ev&&ev.k===k,k+" can be raised");
  assert(ev.text.indexOf(rival().boss)>=0||ev.text.indexOf(cap(rival().name))>=0||ev.text.indexOf(detective().name)>=0,k+" names them: "+ev.text.slice(0,70));
  S.event=ev;eventApply(ev,0);
  assert(typeof ev.outcome==="string"&&ev.outcome.length>0,k+" option A resolves: "+ev.outcome);
  clear();
});
// with no rival the rival events are skipped
S.rivals=[];S.twistBag=["sitdown","holiday"];S.event=null;
const ev2=makeEvent(freshRng());
assert(ev2&&ev2.k!=="sitdown","without a rival the sit-down is not raised (got "+(ev2?ev2.k:"none")+")");
// the panel renders
S.rivals=[makeRival(freshRng())];S.det=makeDetective(freshRng());S.det.file=55;
S.tab="log";S.modal=null;SET.folds={op:true,law:true,arrange:true,record:true,recaps:true,caselog:true};render();
assert(html().indexOf("The competition and the law")>=0&&html().indexOf(S.det.name)>=0&&html().indexOf("data-act=\\"rival-buy\\"")>=0,"the panel names both and offers the moves");
// an old save loads without either
// A save from before the competition existed has neither field. delete d.rival alone stopped
// being enough the moment S.rivals became the truth — the list survived and the test read it
// as 'an old save came back with a rival', which is the opposite of what it is checking.
const d=JSON.parse(JSON.stringify(packState()));delete d.rival;delete d.rivals;delete d.det;store[SAVE_KEY]=JSON.stringify(d);
assert(load()&&!rival()&&!detective()&&raidAt()===100,"an old save loads with nobody watching");
console.log("ALL OK");
})();
`;
require("vm").runInThisContext(src+"\n"+TESTS,{filename:"t23.js"});

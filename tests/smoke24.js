// Build 24: temperament and bonds.
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
assert(TRAITS.length===9,"nine traits");
// traits are spread across the roster and stick to the seed
const withT=S.roster.filter(c=>traits(c).length).length;
assert(withT>S.roster.length*0.5&&withT<S.roster.length*0.8,"about two files in three carry a trait ("+withT+" of "+S.roster.length+")");
const r2=buildRoster(S.seed);
assert(r2[100].traits.join()===S.roster[100].traits.join(),"traits rebuild identically from the seed");
// mercenaries charge more
const merc=S.roster.filter(c=>hasTrait(c,"mercenary")),plain=S.roster.filter(c=>!traits(c).length);
const avg=a=>a.reduce((s,c)=>s+c.cut,0)/a.length;
assert(avg(merc)>avg(plain),"a mercenary takes a bigger cut ("+avg(merc).toFixed(3)+" vs "+avg(plain).toFixed(3)+")");
// the reckoning counts temperament
const pickT=k=>S.roster.find(c=>c.status==="available"&&hasTrait(c,k)&&c.exp<=3&&c.nat!=="Israel");
// a hothead who is also a jinx nets zero, and a factor worth nothing is not listed
// no limits: a hothead who will not fly, or cannot cross a border, can be barred from every job
// on every board this deals, and then the setup has failed rather than the thing under test
const hot=S.roster.find(c=>c.status==="available"&&hasTrait(c,"hothead")&&!hasTrait(c,"jinx")
  &&c.exp<=3&&c.nat!=="Israel"&&!c.limits.length);
assert(hot,"a hothead who is not also a jinx");
signOn(hot.id);
S.player.traits=[];   // so the only temperament in the field is the hothead's
let j=null;for(let i=0;i<150&&!j;i++){j=S.jobs.find(x=>!x.final&&assessJob(x).team.some(c=>c.id===hot.id));if(!j){S.jobs=[];refreshJobs(true);}}
assert(j,"a job the hothead can work");
const f=assessJob(j).factors.find(x=>x.k==="Temperament");
assert(f&&f.v>=3&&f.note.indexOf(hot.first)>=0,"temperament is a factor: "+(f?f.v+" · "+f.note:"none"));
// a hothead costs heat, a careful one saves it
const snap=JSON.stringify(packState());
const heatOf=(id)=>{store[SAVE_KEY]=snap;load();S.crewIds=[id];const jj=S.jobs.find(x=>!x.final&&assessJob(x).canRun);return jj?executeJob(jj).heatGain:null;};
const care=pickT("careful");
store[SAVE_KEY]=snap;load();S.money=5e6;signOn(care.id);
const snap2=JSON.stringify(packState());
// one person, one job, a verdict forced clean so the only difference is the trait
const heatWith=(tr)=>{
  store[SAVE_KEY]=snap2;load();
  const me=byId(hot.id);me.traits=tr;S.crewIds=[hot.id];
  // a mole on the crew leaks and adds 12 heat of its own, which is not the trait under test
  S.player.traits=[];crewAll().forEach(c=>{Object.keys(c.attrs).forEach(k=>c.attrs[k]=98);c.streets=0;c.limits=[];c.mole=false;});
  const jj=S.jobs.filter(x=>!x.final)[0];jj.need=1;jj.diff=1;jj.heat=20;
  const openCo=COUNTRIES.find(c=>c.gate===0);jj.country=openCo.name;jj.city=openCo.cities[0];jj.tags=[];   // an open border, so everyone gets in
  const team=assessJob(jj).team;
  if(!team.some(c=>c.id===hot.id))return {heat:-1,tier:-1,missing:true};
  const r=executeJob(jj);
  return {heat:r.heatGain,tier:r.tier};
};
const none=heatWith([]),hotH=heatWith(["hothead"]),careH=heatWith(["careful"]);
assert(!none.missing&&!hotH.missing&&!careH.missing,"the one under test is in the field for all three runs");
assert(none.tier===4&&hotH.tier===4&&careH.tier===4,"all three runs come back CLEAN, so only the trait differs");
assert(hotH.heat===none.heat+4,"a hothead adds exactly 4 heat ("+none.heat+" -> "+hotH.heat+")");
assert(careH.heat===none.heat-4,"a careful one takes exactly 4 off ("+none.heat+" -> "+careH.heat+")");
// a quick study learns faster
store[SAVE_KEY]=snap2;load();
const q=pickT("quick");if(q){S.money=5e6;signOn(q.id);
  const jq=S.jobs.find(x=>!x.final&&assessJob(x).team.some(c=>c.id===q.id)&&assessJob(x).canRun);
  if(jq){const rq=executeJob(jq);const mine=rq.growth.find(g=>g.first===q.first),other=rq.growth.find(g=>g.first!==q.first&&g.first!=="You");
    assert(!other||mine.xp>=other.xp,"a quick study gains at least as much xp ("+mine.xp+" vs "+(other?other.xp:"n/a")+")");}}
// a ghost is not the one taken
store[SAVE_KEY]=snap2;load();
const gh=pickT("ghost");
if(gh){S.money=5e6;signOn(gh.id);
  // the promise is absolute: somebody else is always closer to the door. So a ghost is taken only
  // on a job where everybody else who went was taken too — never instead of somebody.
  let taken=0,ghostTaken=0,ghostLast=0,ghosts=0;
  for(let i=0;i<25;i++){
    store[SAVE_KEY]=JSON.stringify(packState());
    const jj=S.jobs.find(x=>!x.final&&assessJob(x).canRun);if(!jj)break;
    jj.diff=99;crewAll().forEach(c=>Object.keys(c.attrs).forEach(k=>c.attrs[k]=12));
    const rr=executeJob(jj);
    // Another ghost is not "somebody else". The promise is that a ghost is never taken instead of
    // somebody who is not one; with two of them on the same job, one of them has to be first.
    const others=rr.teamIds.filter(id=>id!=="YOU"&&id!==gh.id&&!hasTrait(byId(id),"ghost"));
    ghosts=Math.max(ghosts,rr.teamIds.filter(id=>id!=="YOU"&&hasTrait(byId(id),"ghost")).length);
    Object.keys(rr.marks).forEach(id=>{if(rr.marks[id]==="taken"){taken++;if(id===gh.id){ghostTaken++;if(others.every(o=>rr.marks[o]==="taken"))ghostLast++;}}});
    if(recruits().length<2)break;
  }
  assert(ghostTaken===ghostLast,"a ghost is never taken while somebody who is not one could be ("+ghostTaken+" taken, "+ghostLast
    +" of them with nobody else left, out of "+taken+" arrests; up to "+ghosts+" ghosts on a job)");
}
// bonds form and are counted
store[SAVE_KEY]=snap2;load();
S.bonds={};
const team=[{id:"A"},{id:"B"},{id:"C"}];
bondUpdate(team,4);assert(bondOf("A","B")===1&&bondOf("B","C")===1,"a success builds a bond");
bondUpdate(team,4);bondUpdate(team,4);bondUpdate(team,4);
assert(bondOf("A","B")===3,"bonds cap at +3");
bondUpdate(team,0);assert(bondOf("A","B")===2,"a disaster costs one");
bondUpdate(team,2);assert(bondOf("A","B")===2,"a messy job changes nothing");
for(let i=0;i<9;i++)bondUpdate(team,1);
assert(bondOf("A","B")===-3,"and they bottom out at −3");
S.bonds={};
const t2=field();
if(t2.length>=2){
  S.bonds[bondKey(t2[0].id,t2[1].id)]=3;
  // one board does not always carry a job both of them can go on — deal another rather than give up
  let jb=null;
  for(let i=0;i<60&&!jb;i++){
    jb=S.jobs.find(x=>!x.final&&assessJob(x).team.some(c=>c.id===t2[0].id)&&assessJob(x).team.some(c=>c.id===t2[1].id));
    if(!jb){S.jobs=[];refreshJobs(true);}
  }
  assert(jb,"a job both of them go on");
  const bf=assessJob(jb).factors.find(x=>x.k==="They have worked together");
  assert(bf&&bf.v===3,"a good bond shows in the reckoning: +"+(bf?bf.v:"none"));
  S.bonds[bondKey(t2[0].id,t2[1].id)]=-3;
  const bb=assessJob(jb).factors.find(x=>x.k==="Bad blood");
  assert(bb&&bb.v===-3,"bad blood shows too: "+(bb?bb.v:"none"));
}
// the cards say so
S.bonds={};if(t2.length>=2)S.bonds[bondKey(t2[0].id,t2[1].id)]=2;
S.tab="crew";S.modal=null;render();
assert(html().indexOf("works well with")>=0||html().indexOf("gets on with")>=0,"the crew cards name the bond");
const anyTrait=field().find(c=>traits(c).length);
if(anyTrait){assert(html().indexOf(TRAIT_BY_K[traits(anyTrait)[0]].l)>=0,"and the traits");}
S.modal={type:"recruit",id:field()[1].id};render();
assert(html().indexOf("Temperament")>=0,"the file lists temperament");
// an old save without traits or bonds still loads
const d=JSON.parse(snap2);delete d.bonds;store[SAVE_KEY]=JSON.stringify(d);
assert(load()&&bondOf("A","B")===0,"an old save loads with no bonds");
console.log("ALL OK");
})();
`;
require("vm").runInThisContext(src+"\n"+TESTS,{filename:"t24.js"});

// THE RECRUITMENT TRIP ASKS FOR THE DRAWINGS THAT ARE ON ITS LIST.
//
// This file exists BEFORE the drawings do, which is the point of it.
//
// The job report had 168 drawings that existed, were named correctly, were in the manifest, and
// could not be reached by any route through the game: push() gives a line a drawing only when it is
// handed the template, and thirteen call sites never handed it one. The trip narrator was the same
// shape and worse — its push() had no parameter for a template at all, so NONE of its lines could
// ever carry one.
//
// The 121 trip drawings are a week of somebody's attention and they have not been drawn yet. Had
// they been drawn against the old narrator, all 121 would have arrived, been filed, been listed by
// --write, reported as "121 of 121 drawn" — and shown nothing, on every trip, for ever. The panel
// would have stayed in its one-column state, which is exactly what it does when a trip has no
// drawings, so there would have been no visible difference between the work existing and not.
//
// So: drive real trips, collect the ids the lines carry, and demand they are the ids
// `tools/art.py --trips --ids` plans. Green now, with nothing drawn, because it is about the NAMES
// the game asks for and not about whether the files are there yet.
const fs=require("fs"),cp=require("child_process"),path=require("path");
const src=fs.readFileSync(__dirname+"/thecrew_check.js","utf8");
const ELS={};
function mkEl(id){const el={id,style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false;},toggle(){}},children:[],dataset:{},innerHTML:"",value:"",textContent:"",hidden:false,scrollTop:0,scrollHeight:0,setAttribute(){},getAttribute(){return null;},appendChild(){},insertAdjacentHTML(p,h){el.innerHTML+=h;},querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){},removeEventListener(){},getBoundingClientRect(){return{left:0,top:0,width:100,height:100,right:100,bottom:100};},focus(){},select(){},play(){return Promise.resolve();},pause(){},load(){},scrollIntoView(){},closest(){return null;},remove(){},contains(){return false;},setSelectionRange(){},paused:true,volume:1,loop:false,src:""};return el;}
global.store={};
global.localStorage={getItem:k=>store[k]===undefined?null:store[k],setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}};
global.document={getElementById:id=>ELS[id]||(ELS[id]=mkEl(id)),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},createElement:t=>mkEl(t),body:mkEl("body"),documentElement:mkEl("html"),hidden:false};
global.window={matchMedia:()=>({matches:false}),addEventListener(){},scrollTo(){},innerWidth:1200,innerHeight:800,localStorage:global.localStorage,document:global.document,location:{href:"",search:""},navigator:{language:"en"}};
global.navigator={language:"en"};global.requestAnimationFrame=()=>0;global.Audio=function(){return mkEl("audio");};global.fetch=()=>Promise.reject(new Error("x"));global.URL=global.URL||{};global.URL.createObjectURL=()=>"blob:x";global.scrollTo=()=>{};global.setInterval=()=>1;global.clearInterval=()=>{};

const ROOT=path.join(__dirname,"..");
const rows=cp.execFileSync("python3",[path.join(ROOT,"tools","art.py"),"--trips","--ids"],{encoding:"utf8"});
global.PLAN={};
for(const row of rows.trim().split("\n").filter(Boolean)){
  const [table,id]=row.split("\t");
  global.PLAN[id]=table;
}

const TESTS=`
;(function(){
let fails=0;
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);fails++;}else console.log("ok  "+m);};

const planned=new Set(Object.keys(PLAN));
check(planned.size>100,"tools/art.py plans "+planned.size+" drawings for a recruitment trip");

draft={name:"Sasha",gender:"F",nat:"Israel",role:"commander",tech:"launderer",avseed:9,profile:null};
rollDraftProfile();
newGame(Object.assign({id:"YOU",isPlayer:true,n:"Sasha",first:"Sasha",gender:"F",nat:"Israel",avseed:9,status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,vetFlag:false,limits:[]},draft.profile));
if(TUT.on)tutEnd();

// Trips vary by who you are going to see and by the country's border, by whether you speak it, by
// whether a friend of a friend vouches, by your ranking and by how many jobs you have run — so the
// sweep moves the commander's standing around as it goes rather than flying out as the same person
// 300 times.
const asked=new Set(), lines=[];
let trips=0, quiet=0;
for(let r=0;r<900&&quiet<220;r++){
  const before=asked.size;
  S.money=5e7;
  S.rep=[10,120,300,520,800][r%5];
  stats().jobs=[0,2,6,14][r%4];
  const c=S.roster.filter(x=>x.status==="available"&&!x._t)[r%7];
  if(!c){S.roster.forEach(x=>{x._t=false;});continue;}
  c._t=true;
  let T=null;
  try{ T=startTrip(c); }catch(e){}
  if(T&&T.narrative){
    trips++;
    for(const l of T.narrative){lines.push(l);if(l.art)asked.add(l.art);}
    // And then FINISH it, which is where they sign, or refuse, and where you fly home. Those are
    // three more tables, picked in finishTrip rather than in startTrip, and a sweep that only ever
    // flies out never sees them — which is how they would have stayed bare. The answer to a snag is
    // varied so both the option that works and the one you did not bring the man for are taken.
    const P=S.pendingTrip;
    if(P){
      const pick=P.snag?(r%4):null;
      let done=null;
      try{ done=finishTrip(P,pick,T); }catch(e){}
      if(done&&done.lines)for(const l of done.lines){lines.push(l);if(l.art)asked.add(l.art);}
      if(done&&done.narrative)for(const l of done.narrative){if(l.art)asked.add(l.art);}
    }
  }
  S.pendingTrip=null;S.modal=null;
  quiet = asked.size===before ? quiet+1 : 0;
}
check(trips>50,trips+" trips flown");
check(asked.size>60,"their lines asked for "+asked.size+" distinct drawings");

// THE INVARIANT: never an id the plan has not heard of.
const unplanned=[...asked].filter(id=>!planned.has(id)).sort();
check(unplanned.length===0, unplanned.length===0
  ? "and every one of them is on the trip's list"
  : unplanned.length+" asked for and unplanned: "+unplanned.slice(0,6).join(", "));

// AND THE LINES CARRY THEM AT ALL. Before this build the trip's push() had no parameter for a
// template, so every line came through bare and the 121 would have been invisible on arrival.
const bare=lines.filter(l=>!l.art).length;
check(asked.size>0,"trip lines carry drawing ids ("+(lines.length-bare)+" of "+lines.length+" do)");

// Every part of a trip, not just the flight out: a set where one group is silent is a set where
// that part of the trip shows the line before's picture for ever.
const byTable={};
for(const id of asked){const t=PLAN[id];if(t)byTable[t]=(byTable[t]||0)+1;}
const MUST=["TRIP_OUT","TRIP_LOOK","TRIP_READ","TRIP_TALK","TRIP_SNAGS",
            "TRIP_SIGN","TRIP_HOME","TRIP_NO"];
const dark=MUST.filter(t=>!byTable[t]);
check(dark.length===0, dark.length===0
  ? "all "+MUST.length+" parts of a trip carry drawings"
  : dark.length+" parts print without one: "+dark.join(", "));

if(fails){console.error(fails+" FAILED");process.exitCode=1;}
else console.log("ALL OK");
})();
`;
require("vm").runInThisContext(src+"\n"+TESTS,{filename:"t47.js"});

// EVERY DRAWING THE GAME ASKS FOR IS ONE THE PLAN KNOWS ABOUT.
//
// tools/art.py --check compares two lists it builds itself: the templates it harvests out of
// play.html, and the files in art/. Both can agree while the RUNNING GAME asks for something
// neither knows about — and that is exactly what happened at build 124. The panel asked
// playthecrew.com for heat-like-wall-3f90d647 and got a 404, while --check said, in the same
// minute, "art is consistent — 456 drawn, 0 still to draw".
//
// Two causes, and neither was visible from either side on its own:
//
//   1. art.py kept a flat table entry only when len(t) > 20, a threshold meant to skip the tone
//      words, keys and {slot} fillers that share those arrays. "Heat like a wall." is seventeen
//      characters. It is a line the feed prints, so it was dropped by the very tool that decides
//      what there is to draw — and so was never on any list to be missing from.
//
//   2. OUT, the six ways the report says somebody would not take the job, was not in that tool's
//      list of tables at all.
//
// smoke45 cannot catch either. It checks that the game and art.py agree on what an id LOOKS LIKE,
// which they always did; the disagreement was about which lines have one at all.
//
// So this file runs the game's own narrator until the ids stop arriving, and demands that every id
// those lines carry is one art.py knows. It asks the REAL art.py, imported through --ids, for the
// same reason smoke45 does: a test that reimplements the harvest is a test of its own copy.
//
// Whether a known id has been DRAWN yet is not this file's business — that is what --check reports,
// and a drawing nobody has got round to is a drawing to make, not a broken game.
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
// The plan, from the tool that owns it.
const ids=cp.execFileSync("python3",[path.join(ROOT,"tools","art.py"),"--ids"],{encoding:"utf8"});
global.PLAN={};                                   // id -> the table it came from
for(const row of ids.trim().split("\n").filter(Boolean)){
  const [table,id]=row.split("\t");
  global.PLAN[id]=table;
}
global.PLANNED=Object.keys(global.PLAN);
global.ON_DISK=fs.readdirSync(path.join(ROOT,"art")).filter(f=>f.endsWith(".webp")).map(f=>f.slice(0,-5));

const TESTS=`
;(function(){
let fails=0;
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);fails++;}else console.log("ok  "+m);};

const planned=new Set(PLANNED), disk=new Set(ON_DISK);
check(planned.size>380,"tools/art.py plans "+planned.size+" drawings");

// FOUR OUTCOMES, because the report is four different sets of tables depending on how the night
// went. A sweep that only ever wins never reaches the morning after a quiet one, the split that
// paid nothing, or the way out with somebody in a cell — which is most of what was broken.
//   heatGain 0            -> QUIET  (the morning nobody noticed)
//   take 0                -> NOPAY
//   " is arrested "       -> EXIT_MINUS, which is the wording isArrest() looks for, not "caught"
const OUTCOMES=[
  {take:1000,cuts:100,net:900,heatGain:5,fallout:[],betrayals:[]},
  {take:900,cuts:80,net:820,heatGain:0,fallout:[],betrayals:[]},
  {take:0,cuts:0,net:0,heatGain:40,fallout:[],betrayals:[]},
  {take:400,cuts:50,net:350,heatGain:25,fallout:["Tal is arrested at the scene and held until week 9."],betrayals:[]},
];
// And several players, because YOU_INSIDE only prints when the job wants the trade the COMMANDER
// happens to have. One launderer never sees it: over 1,800 runnable teams not one job asked for a
// launderer.
const TRADES=["wheelman","forger","hacker","enforcer","launderer","fixer"];
const asked=new Set();
let rounds=0;
for(let game=0;game<TRADES.length;game++){
  draft={name:"Sasha",gender:game%2?"F":"M",nat:"Israel",role:"commander",tech:TRADES[game],avseed:11+game,profile:null};
  rollDraftProfile();
  newGame(Object.assign({id:"YOU",isPlayer:true,n:"Sasha",first:"Sasha",gender:draft.gender,nat:"Israel",avseed:11+game,status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,vetFlag:false,limits:[]},draft.profile));
  if(TUT.on)tutEnd();
  S.money=5e7;S.rep=500;
  for(let i=0;i<80&&recruits().filter(c=>c.status==="crew").length<6;i++){
    const c=S.roster.find(x=>x.status==="available"&&!x._u);if(!c)break;
    c._u=true;c.status="crew";S.crewIds.push(c.id);}
  let quiet=0;
  for(let r=0;r<200&&quiet<60;r++,rounds++){
    const before=asked.size;
    S.jobs=[];refreshJobs(true);
    for(const j of S.jobs){
      const a=assessJob(j);
      if(!a.canRun)continue;
      for(const k of [0,1,2,3]){
        for(const x of OUTCOMES){
          let lines=[];
          try{ lines=(narrate(j,a,k,freshRng(),x,"all",{h:r%24,m:0}).lines)||[]; }
          catch(e){ /* a world this crew cannot field is not this file's business */ }
          for(const l of lines) if(l.art) asked.add(l.art);
        }
      }
    }
    quiet = asked.size===before ? quiet+1 : 0;
  }
}
check(asked.size>200,"the narrator asked for "+asked.size+" distinct drawings over "+rounds+" boards, then stopped finding new ones");

// AND EVERY FAMILY OF LINES IS REPRESENTED. push() gives a line a drawing only when it is handed
// the template as its sixth argument, and for thirteen tables it was not handed one at all — so
// the morning after, the split, the getaway, the man who would not come and the crew with nobody
// in charge printed their lines with the panel still on the line before. 168 drawings that existed,
// were named correctly, and could not be reached by any route through the game.
//
// A count alone would not have said so: 193 of 456 looks like a sweep that did not get everywhere.
// Asking per family does, and says which one went dark.
const byTable={};
for(const id of asked){const t=PLAN[id];if(t)byTable[t]=(byTable[t]||0)+1;}
// LEADERLESS is deliberately not in this list. Its line only prints when the field team has nobody
// in charge, and the commander is on every runnable team there is — 1,800 of 1,800 in a sweep — so
// the branch cannot be reached and its eight drawings illustrate a sentence the game cannot say.
// That is a thing to decide about the design, not a coverage hole for a test to paper over.
const MUST=["ARRIVE","WEATHER","SPEAKS","TEXTURE","OUT","FIXED","QUIET","MORNING","SPLIT",
            "NOPAY","YOU_INSIDE","YOU_RUN","KNOW_NONE","EXIT_MINUS","EXIT_NOWHEEL",
            "POLICE_COME"];
const dark=MUST.filter(t=>!byTable[t]);
check(dark.length===0, dark.length===0
  ? "all "+MUST.length+" families of line carry drawings"
  : dark.length+" families print without a drawing: "+dark.join(", "));

// THE INVARIANT. A line that carries an id the plan has never heard of is a 404 on the panel that
// nothing else in the pipeline can see.
const unplanned=[...asked].filter(id=>!planned.has(id)).sort();
check(unplanned.length===0, unplanned.length===0
  ? "and every one of them is in the plan"
  : unplanned.length+" asked for and unplanned: "+unplanned.join(", "));

// And a drawing that exists but is not listed is a drawing nobody will ever see: ART_HAVE is what
// the game consults before it puts a figure on the panel.
const listed=new Set(ART_HAVE);
const invisible=[...asked].filter(id=>disk.has(id)&&!listed.has(id)).sort();
check(invisible.length===0, invisible.length===0
  ? "every asked-for drawing that exists is listed in ART_HAVE ("+listed.size+" listed)"
  : invisible.length+" drawn but not listed: "+invisible.slice(0,6).join(", "));

if(fails){console.error(fails+" FAILED");process.exitCode=1;}
else console.log("ALL OK");
})();
`;
require("vm").runInThisContext(src+"\n"+TESTS,{filename:"t46.js"});

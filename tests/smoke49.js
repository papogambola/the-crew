// THE RADIO'S PANEL SAYS "RADIO OFF". THE CODE HAD BETTER AGREE.
//
// The office is a drawing now, and the words in it are ink: TUTORIAL, HANDBOOK, SOUND, MUSIC,
// VOLUME, ON, OFF, DISPLAY, LANGUAGE, CONTROLS, EXIT, FILES — none of them can change, and none of
// them needs to. RADIO OFF is the odd one out. It is lettered on the panel like the rest, but the
// thing it describes has five states, so officeSVG() covers those two words with a small plate and
// prints the live one whenever the radio is doing something else.
//
// Whenever it is doing something else. In the state the drawing depicts, nothing is printed at all
// and the panel stays pure pencil — which is the whole reason the plate is not simply always there.
// The join between the two is one string: officeSVG() prints nothing when radioLabel() returns
// RADIO_DRAWN, and RADIO_DRAWN is what the artist lettered.
//
// So the failure this file exists for is quiet and total. Reword the off state to "RADIO SILENT",
// or "OFF AIR", or translate it, and radioLabel() stops ever returning RADIO_DRAWN — so the plate
// is always printed, which is merely ugly. Reword it the other way, or give some OTHER state that
// same string, and the plate is never printed over a panel that is lettered RADIO OFF while the
// music plays: the drawing tells the player something untrue and there is nothing on screen to say
// otherwise. No test of the pixels catches that, because both look like a drawing of a radio.
//
// The fix in either direction is the same and it is not a code fix: redraw the panel, or drop the
// string. This file is here so that choice gets made deliberately.
const fs=require("fs"),path=require("path");
const src=fs.readFileSync(__dirname+"/thecrew_check.js","utf8");
const ELS={};
function mkEl(id){const el={id,style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false;},toggle(){}},children:[],dataset:{},innerHTML:"",value:"",textContent:"",hidden:false,scrollTop:0,scrollHeight:0,setAttribute(){},getAttribute(){return null;},appendChild(){},insertAdjacentHTML(p,h){el.innerHTML+=h;},querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){},removeEventListener(){},getBoundingClientRect(){return{left:0,top:0,width:100,height:100,right:100,bottom:100};},focus(){},select(){},play(){return Promise.resolve();},pause(){},load(){},scrollIntoView(){},closest(){return null;},remove(){},contains(){return false;},setSelectionRange(){},paused:true,volume:1,loop:false,src:""};return el;}
global.store={};
global.localStorage={getItem:k=>store[k]===undefined?null:store[k],setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}};
global.document={getElementById:id=>ELS[id]||(ELS[id]=mkEl(id)),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},createElement:t=>mkEl(t),body:mkEl("body"),documentElement:mkEl("html"),hidden:false};
global.window={matchMedia:()=>({matches:false}),addEventListener(){},scrollTo(){},innerWidth:1200,innerHeight:800,localStorage:global.localStorage,document:global.document,location:{href:"",search:""},navigator:{language:"en"}};
global.navigator={language:"en"};global.requestAnimationFrame=()=>0;global.Audio=function(){return mkEl("audio");};global.fetch=()=>Promise.reject(new Error("x"));global.URL=global.URL||{};global.URL.createObjectURL=()=>"blob:x";global.scrollTo=()=>{};global.setInterval=()=>1;global.clearInterval=()=>{};

const ROOT=path.join(__dirname,"..");
// What is actually lettered on the picture. Not read out of play.html — that would be the code
// agreeing with itself. This is a note about a .webp, kept next to the assertion that uses it.
global.LETTERED_ON_THE_PANEL="RADIO OFF";
global.ROOM_EXISTS=fs.existsSync(path.join(ROOT,"office","room.webp"));

const TESTS=`
;(function(){
let fails=0;
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);fails++;}else console.log("ok  "+m);};

check(ROOM_EXISTS,"the office is a drawing: office/room.webp is there to be lettered");
check(typeof RADIO_DRAWN==="string"&&RADIO_DRAWN.length>0,
  "RADIO_DRAWN names the words in the picture: "+JSON.stringify(typeof RADIO_DRAWN==="string"?RADIO_DRAWN:null));
check(RADIO_DRAWN===LETTERED_ON_THE_PANEL,
  "and they are the words the artist drew — "+JSON.stringify(LETTERED_ON_THE_PANEL)
  +(RADIO_DRAWN===LETTERED_ON_THE_PANEL?"":", but the code says "+JSON.stringify(RADIO_DRAWN)));

// THE OFF STATE, which is what the drawing depicts. Sound off, or music off: either one and the
// radio is not playing, which is why radioLabel() takes them together.
SET.sound=false; SET.music=true;
check(radioLabel()===RADIO_DRAWN,"sound off reads as the drawn words, so nothing is printed over them");
SET.sound=true; SET.music=false;
check(radioLabel()===RADIO_DRAWN,"music off does too");

// AND EVERY OTHER STATE MUST DIFFER, or the plate stays down over a panel that is lying.
SET.sound=true; SET.music=true;
const others=[];
musicWant=null; others.push(["nothing queued",radioLabel()]);
musicWant="x"; musicState="playing";  others.push(["playing",radioLabel()]);
musicWant="x"; musicState="blocked";  others.push(["the browser refused it",radioLabel()]);
musicWant="x"; musicState="loading";  others.push(["still loading",radioLabel()]);
for(const [what,said] of others){
  check(said!==RADIO_DRAWN&&said.length>0,
    "with the radio on and "+what+" it says something else — "+JSON.stringify(said));
}
check(new Set(others.map(o=>o[1])).size===others.length,
  "and those four states are four different lines, so the plate is never stale");

// The plate is 98 units wide with the words centred in it at 12px. A line that outgrows the plate
// hangs off the end of it onto the drawn panel, which is the same failure VOLUME had when it ran
// through the tail of MUSIC — measured here in characters, and in a browser by browser87.js.
const longest=others.reduce((a,b)=>b[1].length>a.length?b[1]:a,"");
check(longest.length<=11,"the longest thing it can say fits the plate: "+JSON.stringify(longest)
  +" is "+longest.length+" characters, and 11 is what 98 units holds");

/* suite.sh reads "ALL OK" to decide a node suite passed — a test that merely fails to print FAIL
   is counted as broken, which is the right way round. */
if(fails){console.log(fails+" FAILED");process.exitCode=1;}
else console.log("ALL OK");
})();
`;
require("vm").runInThisContext(src+TESTS);

// The drawing beside each line of the job report.
//
// The feed's lines are templates with the city and a name slotted in, so a picture per TEMPLATE is
// a finite one-off job, where a picture per line per playthrough is an image model on a four-second
// deadline, on somebody else's money, for a game whose first twelve weeks are free.
//
// THE FAILURE THIS FILE EXISTS FOR: the id is computed in TWO places — artId() in the game, which
// decides which file to ask for, and art_id() in tools/art.py, which decides what the file is
// called. If those disagree the game requests names nobody wrote, every panel falls back to the
// map, and tools/art.py --check reports everything as consistent, because from where it stands
// everything is. Nothing else in the pipeline would notice.
//
// So this asks the REAL tools/art.py, imported. The first version reimplemented its slug() inline
// and got the backslashes wrong going through a shell heredoc — it reported a mismatch that
// existed only in itself, with identical hashes on both sides and only the slug differing. A test
// that reimplements what it checks is a test of its own copy.
const fs=require("fs"),vm=require("vm");
const src=fs.readFileSync(__dirname+"/thecrew_check.js","utf8");
const mk=id=>({id,style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains:()=>false,toggle(){}},children:[],dataset:{},innerHTML:"",value:"",textContent:"",hidden:false,scrollTop:0,scrollHeight:0,setAttribute(){},getAttribute:()=>null,appendChild(){},insertAdjacentHTML(){},querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},removeEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width:100,height:100,right:100,bottom:100}),focus(){},select(){},play:()=>Promise.resolve(),pause(){},load(){},scrollIntoView(){},closest:()=>null,remove(){},contains:()=>false,setSelectionRange(){},paused:true,volume:1,loop:false,src:""});
const ELS={};global.store={};
global.localStorage={getItem:k=>store[k]===undefined?null:store[k],setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}};
global.document={getElementById:id=>ELS[id]||(ELS[id]=mk(id)),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},createElement:mk,createRange:()=>({selectNodeContents(){},getBoundingClientRect:()=>({width:0})}),body:mk("body"),documentElement:mk("html"),head:mk("head"),hidden:false,characterSet:"UTF-8"};
global.window={matchMedia:()=>({matches:false}),addEventListener(){},scrollTo(){},innerWidth:1200,innerHeight:800,localStorage:global.localStorage,document:global.document,location:{href:"",search:""},navigator:{language:"en"},getComputedStyle:()=>({fontSize:"100px"})};
global.getComputedStyle=global.window.getComputedStyle;global.navigator={language:"en"};
global.requestAnimationFrame=()=>0;global.Audio=function(){return mk("audio");};
global.fetch=()=>Promise.reject(new Error("x"));global.URL=global.URL||{};global.URL.createObjectURL=()=>"blob:x";
global.scrollTo=()=>{};global.setInterval=()=>1;global.clearInterval=()=>{};
vm.runInThisContext(src,{filename:"cal.js"});


const cp=require("child_process");
let fails=0;
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);fails++;}else console.log("ok  "+m);};

console.log("— the id is made of the words, not a position —");
check(artId("The keys are under the mat")===artId("The keys are under the mat"),"the same words give the same id");
check(artId("The keys are under the mat")!==artId("The keys are under the meter"),"different words give a different one");
// Editing a line must ORPHAN its drawing rather than let it silently inherit. The picture was of
// those words; a drawing of a hand under a doormat beside a sentence about a meter box is worse
// than no drawing at all.
check(artId("{city}. The crew arrives {how}.")!==artId("{city}. The crew leaves {how}."),
  "a rewritten line does not inherit the old drawing");
check(/^[a-z0-9-]+-[0-9a-f]{8}$/.test(artId("{city}. The keys are under the mat, as promised.")),
  "an id is a readable slug and eight hex: "+artId("{city}. The keys are under the mat, as promised."));
check(artId("")==="","nothing has no id");
// A file called city-country-the-crew is a file nobody can find by reading the sentence.
check(artId("{city}, {country}. Three hotels, three names.").indexOf("city")<0,"the placeholders are not in the slug");

console.log("\n— and the game and tools/art.py agree about it —");
const probes=[
  "{city}. {How}. The keys are under the mat, as promised, which is a worry.",
  "{city}, {country}. The crew arrives {how}.",
  "{X}'s passport is a week old and looks ten years of it.",
  "{X} is asked the purpose of the visit and says 'conference'. Nobody can check a conference.",
  "Three hotels, three names.",
  "a b c"
];
// No shell in the middle: the script goes in on stdin and the probes are embedded as a literal,
// because JSON for an array of strings is also valid Python. Quoting through sh is what broke the
// first attempt at this.
const script=
   "import sys,os\n"
  +"sys.path.insert(0,os.path.join("+JSON.stringify(__dirname)+",'..','tools'))\n"
  +"import art\n"
  +"for t in "+JSON.stringify(probes)+":\n"
  +"    print(art.art_id(t))\n";
let theirs=[];
try{
  theirs=cp.execFileSync("python3",["-"],{encoding:"utf8",input:script}).trim().split("\n").filter(Boolean);
}catch(e){
  console.error("FAIL: tools/art.py would not answer — "+String(e.stderr||e.message).split("\n").slice(-3).join(" "));
  fails++;
}
check(theirs.length===probes.length,"the tool answered for all "+probes.length+" probes");
let same=0;
probes.forEach((t,i)=>{
  const mine=artId(t);
  if(theirs[i]===mine)same++;
  else console.error("FAIL: the game says "+mine+", the tool says "+theirs[i]+"   ("+t.slice(0,42)+")");
});
check(same===probes.length,"the game and the tool name every file identically");

console.log("\n— the panel only asks for drawings that exist —");
check(artHas("nothing-at-all-00000000")===false,"an id with no file is never asked for");
check(Array.isArray(ART_HAVE),"the manifest is a list, written by tools/art.py --write");
let malformed=0;
ART_HAVE.forEach(id=>{if(!/^[a-z0-9-]+-[0-9a-f]{8}$/.test(id)){console.error("FAIL: malformed id in ART_HAVE: "+id);malformed++;fails++;}});
check(malformed===0,"every id in it is well formed ("+ART_HAVE.length+" listed)");

console.log(fails?("\n"+fails+" FAILED"):"\nALL OK");
process.exit(fails?1:0);

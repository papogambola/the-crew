// Build 21: the face builder, and a temperament for every file including the player's.
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
// Hiring is a week-long trip with an outcome now (smoke30 covers it). These suites are about
// other systems, so they put somebody on the crew directly — the same transitions finishTrip
// makes when the answer is yes.
const signOn=(id)=>{const c=byId(id);if(!c||c.status!=="available")return null;
  if(recruits().length>=crewSeats())return null;
  if(!canSign(c))return null;
  S.money=Math.max(0,S.money-c.fee);c.status="crew";c._touched=true;S.crewIds.push(c.id);stats().hired++;return c;};

const html=()=>document.getElementById("root").innerHTML;
// ---- the parts
assert(faceParts("M").length===10&&faceParts("F").length===10,"ten sliders each");
assert(faceParts("M").some(p=>p.k==="fh")&&!faceParts("M").some(p=>p.k==="earring"),"a man gets facial hair, not earrings");
assert(faceParts("F").some(p=>p.k==="earring")&&!faceParts("F").some(p=>p.k==="fh"),"a woman gets earrings, not facial hair");
const cm=faceParts("M").reduce((a,p)=>a*p.opts.length,1),cf=faceParts("F").reduce((a,p)=>a*p.opts.length,1);
assert(cm>=3000000&&cf>=4000000,"3,000,000 male and 4,500,000 female combinations ("+cm+" / "+cf+")");
// every part changes the picture
["M","F"].forEach(g=>faceParts(g).forEach(p=>{
  const a={};faceParts(g).forEach(q=>a[q.k]=0);const b=Object.assign({},a);b[p.k]=1;
  assert(avatar(9,g,a)!==avatar(9,g,b),g+" "+p.l+" changes the drawing");
}));
// bad input is clamped, not crashed
const junk=avatar(3,"M",{hair:999,shape:-7,eye:"x",nose:null,mouth:NaN,glasses:2.7,ear:0,brow:0,fh:1,scar:1});
assert(junk.indexOf("<svg")===0&&junk.length>800,"a damaged face still draws");
const n=normFace({hair:999,shape:-7},"M");
assert(n.hair===HAIR_M.length-1&&n.shape===0&&n.earring===0,"normFace clamps and drops what the sex does not have");
assert(normFace({fh:3},"F").fh===0,"a woman never carries facial hair");
// the same face draws the same picture; a different seed only changes texture
const face={hair:0,shape:1,brow:1,eye:0,nose:0,mouth:0,ear:1,glasses:0,fh:0,earring:0,scar:0};
assert(avatar(11,"M",face)===avatar(11,"M",face),"the same seed and face draw the same picture");
assert(avatar(11,"M",face)!==avatar(12,"M",Object.assign({},face,{hair:1})),"a different part draws differently");
// ---- the create screen
draft={name:"",gender:"M",nat:"Israel",role:"commander",tech:"launderer",avseed:7,profile:null};
rollDraftProfile();
const scr=screenCreate();
assert(scr.indexOf("Your appearance")>=0&&(scr.match(/class="faceslide"/g)||[]).length===10,"the panel draws ten sliders");
assert(scr.indexOf('id="bigav"')>=0&&scr.indexOf("New likeness")<0,"the picture has an id and the old button is gone");
assert(scr.indexOf("↻ Random")>=0,"a randomise button sits in the panel header");
faceParts("M").forEach(p=>assert(scr.indexOf('id="fp-'+p.k+'"')>=0,"a slider for "+p.l));
assert(draft.face&&typeof draft.face.hair==="number","the draft carries a face");
// switching sex clamps a hair index that no longer exists
draft.gender="F";draft.face.hair=14;draft.face=normFace(draft.face,"F");
assert(draft.face.hair===14,"a woman can wear the fifteenth style");
draft.gender="M";draft.face=normFace(draft.face,"M");
assert(draft.face.hair===HAIR_M.length-1,"switching to a man clamps it into his six");
// the face travels onto the player and into the save
draft.gender="F";draft.face=normFace({hair:11,shape:3,brow:2,eye:4,nose:2,mouth:1,ear:2,glasses:2,earring:2,scar:1},"F");
const player=Object.assign({id:"YOU",isPlayer:true,n:"Vera",first:"Vera",gender:"F",nat:"Israel",avseed:7,face:normFace(draft.face,"F"),status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,vetFlag:false,limits:[]},draft.profile);
newGame(player);if(TUT.on)tutEnd();
assert(S.player.face.hair===11&&S.player.face.glasses===2,"the player keeps the face they built");
assert(S.player.traits&&Array.isArray(S.player.traits),"and has a temperament");
const drawn=avatar(S.player.avseed,S.player.gender,S.player.face);
assert(drawn===avatar(7,"F",normFace({hair:11,shape:3,brow:2,eye:4,nose:2,mouth:1,ear:2,glasses:2,earring:2,scar:1},"F")),"the crew card draws that same face");
save();assert(load()&&S.player.face.hair===11,"and it survives a save and a load");
// ---- an old file gets a temperament and a face
const d=JSON.parse(JSON.stringify(packState()));
delete d.player.traits;delete d.player.face;
store[SAVE_KEY]=JSON.stringify(d);
assert(load(),"an old file loads");
assert(S.player.traits&&Array.isArray(S.player.traits),"the player is given a temperament: "+JSON.stringify(S.player.traits));
assert(S.player.face&&typeof S.player.face.hair==="number","and a face");
const t1=JSON.stringify(S.player.traits),f1=JSON.stringify(S.player.face);
store[SAVE_KEY]=JSON.stringify(d);load();
assert(JSON.stringify(S.player.traits)===t1&&JSON.stringify(S.player.face)===f1,"both derived from the file's own seed, so they never change again");
// ---- existing crew already carry their traits through an old save
S.money=5e6;
const withT=S.roster.filter(c=>c.status==="available"&&c.traits&&c.traits.length&&c.exp<=3);
[0,1,2].forEach(i=>signOn(withT[i].id));
const before=recruits().map(c=>c.first+":"+(c.traits||[]).join("/")).join(" ");
const d2=packState();Object.keys(d2.ov).forEach(id=>{delete d2.ov[id].traits;});
store[SAVE_KEY]=JSON.stringify(d2);load();
assert(recruits().map(c=>c.first+":"+(c.traits||[]).join("/")).join(" ")===before,"hired crew keep their temperament through an old-format save: "+before);
assert(recruits().every(c=>Array.isArray(c.traits)),"and every one of them has the field");
console.log("ALL OK");
})();
`;
require("vm").runInThisContext(src+"\n"+TESTS,{filename:"t26.js"});

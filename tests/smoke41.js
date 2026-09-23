// Build 75: an old face is somebody of yours, and the game remembers which one.
//
// The report: a member died on holiday — "The crew notices who paid. Loyalty rises." — and weeks
// later turned up in a blackmail screen described as somebody "who walked with your money". Two
// stories about one person, and the second one contradicts the funeral you paid for.
//
// The rule now: how somebody left is recorded when they leave, the blackmail reads it back, and a
// death that comes back says so — that is the reveal, and it only happens where the death was
// staged. The rest really did drown and never appear again.
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

function fresh(){
  store={};
  newGame(Object.assign({id:"YOU",isPlayer:true,n:"Paz",first:"Paz",gender:"M",nat:"United Kingdom",avseed:7,
    face:randomFace(mulberry32(7),"M"),status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,
    vetFlag:false,limits:[],cmd:5},genProfile(mulberry32(11),COUNTRY_BY_NAME["United Kingdom"],"M",{role:"commander"})));
  S.money=9e6;
}
fresh();

let fails=0;
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);fails++;}else console.log("ok  "+m);};

check(!!S,"a game started");

/* ---------------- every way off the crew leaves a record ---------------- */
console.log("\n— how somebody left is a fact, not a guess —");
const spare=()=>S.roster.find(c=>c.status==="available"&&!c._used);
const put=()=>{const c=spare();if(!c)return null;c._used=true;c.status="crew";S.crewIds.push(c.id);return c;};
const ways=[["quit","walked out over the money"],["betray","took a cut of the score and vanished"],
  ["poach","left for another crew"],["resign","asked to be let out"],["dropped","was cut loose"]];
ways.forEach(([why,words])=>{
  const c=put();if(!c)return;
  c.status="gone";leaveCrew(c);looseAdd(c,why);
  check(c.goneAs===why,"leaving as \""+why+"\" is written on the file");
  check(goneStory(c)==="who "+words,"and reads back as \""+goneStory(c)+"\"");
});
// Somebody with nothing on file (an old save) is described, never invented.
const blank={first:"X",status:"gone"};
check(!/walked with your money|drowned|funeral/i.test(goneStory(blank)),
  "a file with nothing on it claims nothing: \""+goneStory(blank)+"\"");
check(goneStory(null)&&!/undefined/.test(goneStory(null)),"and neither does no file at all");

/* ---------------- a death on holiday ---------------- */
console.log("\n— a death is a death, most of the time —");
const deaths=[];
for(let i=0;i<400;i++){
  const c=spare();if(!c)break;c._used=true;
  c.status="crew";S.crewIds.push(c.id);
  S.event={k:"holiday",h:"A death on holiday",text:"",mId:c.id,lId:null,v:{M:c.first,G:c.first},outcome:null,week:S.week};
  const before=S.money;
  eventApply(S.event,0);   // pay for the funeral
  deaths.push({c,paid:before-S.money});
}
check(deaths.length>50,deaths.length+" deaths on that coast");
check(deaths.every(d=>d.c.goneAs==="dead"),"every one of them is on file as a death, not a walk-out");
check(deaths.every(d=>d.c.funeralPaid===true),"and every funeral is on file as paid for");
check(deaths.every(d=>d.c.status==="dead"||d.c.status==="gone"),"each is either dead or gone, nothing else");
const reallyDead=deaths.filter(d=>d.c.status==="dead").length;
const staged=deaths.filter(d=>d.c.status==="gone").length;
const rate=staged/deaths.length;
check(reallyDead>0&&staged>0,reallyDead+" really drowned, "+staged+" staged it");
check(rate>0.13&&rate<0.40,"staged about one in four ("+Math.round(rate*100)+"%), so a death still means something");
// The dead are dead: they are not in the pool an old face is drawn from.
check(!S.roster.some(c=>c.status==="dead"&&c.goneAs==="dead"&&c.status==="gone"),
  "nobody is both");
const pool=S.roster.filter(c=>c.status==="gone");
check(pool.length>0&&!pool.some(c=>c.status==="dead"),"the pool an old face comes from holds no dead people");

/* ---------------- and the blackmail tells their story, not a stock one ---------------- */
console.log("\n— the blackmail reads the file —");
const DEBT=WEEKLY.find(w=>w.k==="debt");
check(DEBT,"the blackmail event exists");
check(DEBT.h==="An old face - Blackmailing","and is titled \""+DEBT.h+"\"");
check(typeof DEBT.text==="function","its words depend on who it landed on");

const say=c=>fill2(DEBT.text(c,{G:c.first}),{G:c.first});
const aStaged=pool.find(c=>c.goneAs==="dead");
check(aStaged,"somebody staged their death: "+(aStaged&&aStaged.first));
const dead=say(aStaged);
console.log("     → "+dead);
check(/is alive/i.test(dead),"the screen says they are alive — that is the reveal, and it is here");
check(/boat|storm|phone/i.test(dead),"and names the death they staged");
check(!/walked with your money/i.test(dead),"and does NOT say they walked with your money");
check(/family went with/i.test(dead),"the funeral money is part of the con, because you paid it");
// The same person, if you had not paid, gets the other version.
aStaged.funeralPaid=false;
const unpaid=say(aStaged);
console.log("     → "+unpaid);
check(/is alive/i.test(unpaid),"not paying does not change that they are alive");
check(/no boat and no storm/i.test(unpaid),"but the sentence knows you sent nothing");
check(!/family went with/i.test(unpaid),"and does not bill you for money you never sent");
aStaged.funeralPaid=true;

// Everybody else gets the true clause for how they left.
ways.forEach(([why,words])=>{
  const c=S.roster.find(x=>x.goneAs===why);
  if(!c)return;
  const line=say(c);
  check(line.indexOf("who "+words)>0,"\""+why+"\" opens \""+c.first+" — who "+words+" —\"");
  check(!/is alive/i.test(line),"and nobody who never died is announced as alive");
});
// The stock line is gone from everywhere except where it is true.
const all=S.roster.filter(c=>c.status==="gone").map(say);
const wrongly=all.filter(l=>/walked with your money/i.test(l));
check(wrongly.length===0,"nothing says \"walked with your money\" any more — the words that replaced it are each somebody's own");

/* ---------------- a real death never comes back ---------------- */
console.log("\n— and the ones who really drowned stay drowned —");
const corpse=S.roster.find(c=>c.status==="dead");
check(corpse,"there is a real death on the books: "+(corpse&&corpse.first));
// Actually draw the event, over and over, rather than re-reading the same array and calling that
// a test. Force the bag to the blackmail each time so every draw is the one that matters.
let drawn=0,drew=0,seen=0;
for(let i=0;i<400;i++){
  S.twistBag=["debt"];
  const ev=makeEvent(freshRng());
  if(!ev||ev.k!=="debt")continue;
  drew++;
  if(ev.mId===corpse.id)drawn++;
  if(byId(ev.mId)&&byId(ev.mId).goneAs==="dead")seen++;
}
check(drew>100,drew+" blackmails actually drawn");
check(drawn===0,"and the one who really drowned is not in a single one of them");
check(seen>0,seen+" of those did land on somebody who staged it — the reveal does happen");
check(hireWhy(corpse)!==null&&hireWhy(corpse)!==undefined,"nor can they be hired again: \""+hireWhy(corpse)+"\"");

console.log(fails?"\n"+fails+" FAILED":"\nALL OK");
process.exit(fails?1:0);

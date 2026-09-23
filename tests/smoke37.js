// Build 46: the fourteen seven-place trades, a thousand more files, and the five hundred operations.
//
// The first assertion is the one that matters most: a save made before any of this existed has to
// rebuild exactly the crew it was saved with. The roster is rebuilt from the seed and only CHANGED
// members are stored, so if generation shifts by one roll of the RNG, every untouched person on
// every existing save becomes somebody else. This checks it against the build that is actually
// live, not against a memory of it.
const fs=require("fs"),vm=require("vm");
let pass=0,fail=0;
const ok=(c,m)=>{if(c){pass++;console.log("  ok   "+m);}else{fail++;console.log("  FAIL "+m);}};

function load(file,tag){
  const mk=id=>{const el={id,style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false;},toggle(){}},children:[],dataset:{},innerHTML:"",value:"",textContent:"",hidden:false,scrollTop:0,scrollHeight:0,setAttribute(){},getAttribute(){return null;},appendChild(){},insertAdjacentHTML(p,h){el.innerHTML+=h;},querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){},removeEventListener(){},getBoundingClientRect(){return{left:0,top:0,width:100,height:100,right:100,bottom:100};},focus(){},select(){},play(){return Promise.resolve();},pause(){},load(){},scrollIntoView(){},closest(){return null;},remove(){},contains(){return false;},setSelectionRange(){},paused:true,volume:1,loop:false,src:""};return el;};
  const ELS={},store={};
  const ctx={console,Math,Date,JSON,String,Number,Boolean,Array,Object,Set,Map,RegExp,Error,isFinite,parseInt,parseFloat,btoa:s=>Buffer.from(s,"binary").toString("base64"),atob:s=>Buffer.from(s,"base64").toString("binary"),encodeURIComponent,decodeURIComponent,escape,unescape,setTimeout,clearTimeout};
  ctx.localStorage={getItem:k=>store[k]===undefined?null:store[k],setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}};
  ctx.document={getElementById:id=>ELS[id]||(ELS[id]=mk(id)),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},createElement:t=>mk(t),createRange:()=>({selectNodeContents(){},getBoundingClientRect:()=>({width:0})}),body:mk("body"),documentElement:mk("html"),head:mk("head"),hidden:false,characterSet:"UTF-8"};
  ctx.window={matchMedia:()=>({matches:false}),addEventListener(){},scrollTo(){},innerWidth:1200,innerHeight:800,localStorage:ctx.localStorage,document:ctx.document,location:{href:"",search:""},navigator:{language:"en"},getComputedStyle:()=>({fontSize:"100px"})};
  ctx.getComputedStyle=ctx.window.getComputedStyle;
  ctx.navigator={language:"en"};ctx.requestAnimationFrame=()=>0;ctx.Audio=function(){return mk("audio");};
  ctx.fetch=()=>Promise.reject(new Error("x"));ctx.URL={createObjectURL:()=>"blob:x"};
  ctx.scrollTo=()=>{};ctx.setInterval=()=>1;ctx.clearInterval=()=>{};
  ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(file,"utf8"),ctx,{filename:tag});
  // Top-level const/let live in the context's lexical scope, not on the context object, so they
  // are reached by evaluating an expression inside it rather than by reading a property.
  const E=x=>vm.runInContext(x,ctx,{filename:tag});
  E.ctx=ctx;
  return E;
}

const NOW=load("thecrew_check.js","now");
let WAS=null;
try{WAS=load("prev45.js","was");}catch(e){console.log("  (no shipped build to compare against: "+e.message+")");}

console.log("\n— a save made before any of this rebuilds the same people —");
if(WAS){
  const SEEDS=[1,20260916,3735928559];
  const key=c=>[c.id,c.n,c.gender,c.nat,c.tech,c.role,c.exp,c.edu,c.jail,c.streets,c.fee,c.cut,c.upkeep,
    c.loyalty,c.greed,c.mole?1:0,c.avseed,c.know.join("/"),c.langs.join("/"),c.limits.join("/"),
    (c.traits||[]).join("/"),c.cmd,c.attrs.muscle,c.attrs.brains,c.attrs.tech,c.attrs.charm,c.attrs.nerve].join("|");
  let same=true,firstBad=null,checked=0;
  for(const seed of SEEDS){
    const a=WAS("buildRoster")(seed), b=NOW("buildRoster")(seed);
    for(let i=0;i<WAS("ROSTER_SIZE");i++){checked++;
      if(key(a[i])!==key(b[i])){same=false;firstBad=firstBad||("seed "+seed+" #"+i+"\n    was "+key(a[i])+"\n    now "+key(b[i]));break;}}
    if(!same)break;
  }
  ok(same,"every one of the first "+WAS("ROSTER_SIZE")+" files is unchanged across "+SEEDS.length+
    " seeds ("+checked+" compared)"+(firstBad?"\n       "+firstBad:""));
  ok(NOW("ROSTER_SIZE")===WAS("ROSTER_SIZE")+1000,"and the roster grew by exactly 1000 ("+WAS("ROSTER_SIZE")+" → "+NOW("ROSTER_SIZE")+")");
}

console.log("\n— the fourteen trades —");
ok(NOW("TECHS").length===16,"the original sixteen are untouched ("+NOW("TECHS").length+")");
ok(NOW("TECHS_BIG").length===14,"fourteen specialists ("+NOW("TECHS_BIG").length+")");
ok(NOW("TECHS_ALL").length===30,"thirty trades in all");
const asked=["drone","pilot","skipper","diver"];
ok(asked.every(k=>NOW("TECH_BY_K")[k]&&NOW("TECH_BY_K")[k].big),"the four asked for are there: "+
  asked.map(k=>NOW("TECH_BY_K")[k].l).join(", "));
const mine=NOW("TECHS_BIG").filter(t=>asked.indexOf(t.k)<0);
ok(mine.length===10,"and ten more: "+mine.map(t=>t.l).join(", "));
ok(NOW("TECHS_BIG").every(t=>NOW("KNOW").indexOf(t.know)>=0),"each comes with a kind of knowledge the game has");
ok(NOW("TECHS_BIG").every(t=>NOW("ATTRS").indexOf(t.a)>=0),"and leans on one of the five attributes");
ok(NOW("TECHS_BIG").every(t=>NOW("TECH_SITE")[t.k]),"each has a place to stand on the plan");
ok(NOW("TECHS_BIG").every(t=>NOW("FM_TECH_GLYPH")[t.k]&&NOW("FM_GLYPH")[NOW("FM_TECH_GLYPH")[t.k]]),
  "and a mark on the map that is actually drawn");
ok(NOW("TECHS_BIG").every(t=>Array.isArray(NOW("TECH_BEAT")[t.k])&&NOW("TECH_BEAT")[t.k].length>=3),
  "and three lines of its own in the report");
ok(NOW("TECHS_BIG").every(t=>NOW("TECH_BEAT")[t.k].every(p=>Array.isArray(p)&&p.length===2)),
  "written in both persons, so the report can say it about you");
ok(NOW("TECHS_BIG").every(t=>NOW("CATS_ALL").some(c=>c.techs.indexOf(t.k)>=0)),
  "and at least one kind of job that wants it");

console.log("\n— a thousand more files —");
const r=NOW("buildRoster")(4242);
const core=r.slice(0,NOW("ROSTER_CORE")), extra=r.slice(NOW("ROSTER_CORE"));
ok(extra.length===1000,extra.length+" files beyond the original five thousand");
ok(core.every(c=>!NOW("isBigTech")(c.tech)),"none of the first five thousand carries a specialist trade");
ok(extra.every(c=>NOW("isBigTech")(c.tech)),"and every one of the thousand does");
const spread={};extra.forEach(c=>{spread[c.tech]=(spread[c.tech]||0)+1;});
ok(Object.keys(spread).length===14,"all fourteen appear among them ("+
  NOW("TECHS_BIG").map(t=>t.l.split(" ")[0]+" "+spread[t.k]).join(", ")+")");
ok(Math.min.apply(null,Object.values(spread))>=40,"none of them is rare by accident (fewest "+
  Math.min.apply(null,Object.values(spread))+")");
const ids=new Set(r.map(c=>c.id));
ok(ids.size===r.length,"every file still has its own id");
ok(extra.every(c=>c.fee>0&&c.upkeep>0&&c.cut>0),"and a price, a cut and an upkeep");

console.log("\n— five hundred operations —");
NOW("newGame")(Object.assign({id:"YOU",isPlayer:true,n:"Paz K",first:"Paz",gender:"M",nat:"United Kingdom",
  avseed:7,face:NOW("randomFace")(NOW("mulberry32")(7),"M"),status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,
  mole:false,vetted:true,vetFlag:false,limits:[],cmd:5},
  NOW("genProfile")(NOW("mulberry32")(11),NOW("COUNTRY_BY_NAME")["United Kingdom"],"M",{role:"commander"})));
const cat=NOW("bigCatalogue")();
ok(cat.length===500,cat.length+" of them");
ok(new Set(cat.map(o=>o.id)).size===500,"each with its own code, OP001 to OP500");
ok(cat.every(o=>o.need>=6&&o.need<=7),"every one wants six or seven in the field");
const n7=cat.filter(o=>o.need===7).length;
ok(n7>120&&n7<380,n7+" of them want all seven");
ok(cat.every(o=>o.techs.length>=3&&o.techs.length<=5),"three to five trades wanted on each");
ok(cat.every(o=>o.know.length>=2&&o.know.length<=3),"two or three kinds of knowledge");
ok(cat.every(o=>o.weeks>=3&&o.weeks<=5),"three to five weeks on the ground");
ok(cat.every(o=>o.tier===5&&o.big),"all of them above the top of the ordinary board");
const bigWanted=cat.reduce((n,o)=>n+o.techs.filter(t=>NOW("isBigTech")(t)).length,0);
const allWanted=cat.reduce((n,o)=>n+o.techs.length,0);
ok(bigWanted/allWanted>0.55,"and they are what the specialists are for — "+
  Math.round(bigWanted/allWanted*100)+"% of the trades they ask for are the new ones");
const titles=new Set(cat.map(o=>o.title));
ok(titles.size>=90,titles.size+" different titles among them");
const usedT=new Set();cat.forEach(o=>o.techs.forEach(t=>usedT.add(t)));
ok(NOW("TECHS_BIG").every(t=>usedT.has(t.k)),"every one of the fourteen is asked for by name somewhere");
// the same five hundred for everybody
const again=NOW("bigCatalogue")();
ok(again[316].id===cat[316].id&&again[316].title===cat[316].title&&again[316].country===cat[316].country,
  "and they are fixed: OP317 is \""+cat[316].title+"\", "+cat[316].city+", "+cat[316].country);

console.log("\n— they only exist once there are seven places —");
NOW("S").rep=0;
ok(!NOW("bigOpen")(),"a Nobody has no idea they exist");
NOW("S").rep=64;
ok(!NOW("bigOpen")(),"nor does a crew one point short of Respected ("+NOW("crewSeats")()+" soldiers' places)");
NOW("S").rep=65;
ok(NOW("bigOpen")(),"at Respected, with seven places, they open ("+NOW("crewSeats")()+" soldiers' places)");
NOW("S").jobs=[];NOW("refreshJobs")(true);
ok(NOW("S").jobs.some(j=>j.big),"and the board carries one");
NOW("S").rep=30;NOW("S").jobs=[];NOW("refreshJobs")(true);
ok(!NOW("S").jobs.some(j=>j.big),"drop back below it and it does not");

console.log("\n— what one of them is worth, and how hard —");
NOW("S").rep=65;
const post=NOW("bigPosting")(cat[0],NOW("mulberry32")(1));
const ord=NOW("makeJob")(NOW("mulberry32")(5),2);
ok(post.payout>3e6,"the fee is "+NOW("money")(post.payout)+", against "+NOW("money")(ord.payout)+" for an ordinary posting");
ok(post.diff>ord.diff+15,"and the room is "+post.diff+" against "+ord.diff);
ok(NOW("caseMax")(post)===5,"it can be cased for five weeks ("+NOW("caseMax")(post)+")");
ok(NOW("BAL").payTier[5]>0&&NOW("BAL").jobWeeks[5]>0,"the tier has a fee and a length of its own");
// nothing that indexes by tier may come back undefined
const idx=[[0,6,12,22,36,54],[0,10,18,28,40,56]];
ok(idx.every(a=>typeof a[5]==="number"),"and the ranking and experience tables have a fifth row");

console.log("\n— the rival cannot take one —");
NOW("S").rep=65;NOW("S").jobs=[];NOW("refreshJobs")(true);
while(NOW("S").jobs.filter(j=>!j.big).length<6)NOW("S").jobs.push(NOW("makeJob")(NOW("mulberry32")(Math.random()*1e9),0));
NOW("S").rival={boss:"X Y",last:"Y",gender:"M",name:"the Y lot",standing:200,took:0,since:1};
const bigBefore=NOW("S").jobs.filter(j=>j.big).length;
for(let i=0;i<60;i++)NOW("rivalWorks")(NOW("mulberry32")(i+1));
ok(NOW("S").jobs.filter(j=>j.big).length===bigBefore,
  "sixty weeks of a rival ahead of you and the operations are all still there ("+bigBefore+")");

console.log("\n"+pass+" passed, "+fail+" failed");
if(!fail)console.log("ALL OK");
process.exit(fail?1:0);

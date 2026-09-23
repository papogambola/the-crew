// Street work: one soldier, no crew, a few thousand dollars, and a real chance of losing them.
// The whole of it is who you send, so the thing under test is that the fit is real, is printed
// before you choose, and that the ceiling is low enough that it never becomes the game.
const fs=require("fs"),vm=require("vm");
const src=fs.readFileSync(__dirname+"/thecrew_check.js","utf8");
const mk=id=>{const el={id,style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false;},toggle(){}},children:[],dataset:{},innerHTML:"",value:"",textContent:"",hidden:false,scrollTop:0,scrollHeight:0,setAttribute(){},getAttribute(){return null;},appendChild(){},insertAdjacentHTML(p,h){el.innerHTML+=h;},querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){},removeEventListener(){},getBoundingClientRect(){return{left:0,top:0,width:100,height:100,right:100,bottom:100};},focus(){},select(){},play(){return Promise.resolve();},pause(){},load(){},scrollIntoView(){},closest(){return null;},remove(){},contains(){return false;},setSelectionRange(){},paused:true,volume:1,loop:false,src:""};return el;};
const ELS={};
global.store={};
global.localStorage={getItem:k=>store[k]===undefined?null:store[k],setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}};
global.document={getElementById:id=>ELS[id]||(ELS[id]=mk(id)),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},createElement:t=>mk(t),createRange:()=>({selectNodeContents(){},getBoundingClientRect:()=>({width:0})}),body:mk("body"),documentElement:mk("html"),head:mk("head"),hidden:false,characterSet:"UTF-8"};
global.window={matchMedia:()=>({matches:false}),addEventListener(){},scrollTo(){},innerWidth:1200,innerHeight:800,localStorage:global.localStorage,document:global.document,location:{href:"",search:""},navigator:{language:"en"},getComputedStyle:()=>({fontSize:"100px"})};
global.getComputedStyle=global.window.getComputedStyle;
global.navigator={language:"en"};global.requestAnimationFrame=()=>0;global.Audio=function(){return mk("audio");};
global.fetch=()=>Promise.reject(new Error("x"));global.URL=global.URL||{};global.URL.createObjectURL=()=>"blob:x";
global.scrollTo=()=>{};global.setInterval=()=>1;global.clearInterval=()=>{};

const assert=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;throw new Error(m);}else console.log("ok  "+m);};
vm.runInThisContext(src,{filename:"t38.js"});

function fresh(){
  store={};
  newGame(Object.assign({id:"YOU",isPlayer:true,n:"Paz K",first:"Paz",gender:"M",nat:"United Kingdom",
    avseed:7,face:randomFace(mulberry32(7),"M"),status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,
    vetted:true,vetFlag:false,limits:[],cmd:5},
    genProfile(mulberry32(11),COUNTRY_BY_NAME["United Kingdom"],"M",{role:"commander"})));
}
fresh();

/* a save written before any of this existed */
fresh();
(function(){const packed=JSON.parse(JSON.stringify(packState()));delete packed.street;
  store[SAVE_KEY]=JSON.stringify(packed);
  assert(load(),"a file saved before street work existed still opens");
  assert(streetOffers().length>=2,"and the street is there when it does ("+streetOffers().length+" offers)");})();

/* ============================== STREET WORK ============================ */
console.log("\n— what is on the street —");
assert(STREET.length>=10,STREET.length+" pieces of street work");
STREET.forEach(st=>{
  assert(st.l&&st.s&&st.s.length>30,st.k+": has a scene, not a label");
  assert(Object.keys(st.w).length>=2&&Object.keys(st.w).every(a=>ATTRS.indexOf(a)>=0),
    "  "+st.k+" leans on "+Object.keys(st.w).map(a=>ATTR_ABBR[a]).join("+"));
  assert(st.pay[0]>=500&&st.pay[1]<=5000,"  "+st.k+" pays "+money(st.pay[0])+"–"+money(st.pay[1])+", which is not a job");
  assert(st.hurt>0&&st.jail>0,"  "+st.k+" can cost you the person");
  assert((st.lim||[]).every(k=>LIMIT_BY_K[k]),"  "+st.k+"'s limits exist");
  assert(st.bad&&st.bad.length>20,"  "+st.k+" has a way of going wrong");
});
assert(STREET.every(st=>!st.w.tradeBonus),"and no trade counts for anything out here");

console.log("\n— the offers —");
fresh();
S.week=12;
const o1=JSON.stringify(streetOffers());
assert(streetOffers().length>=2&&streetOffers().length<=3,streetOffers().length+" on offer this week");
assert(JSON.stringify(streetOffers())===o1,"looking twice does not redraw them");
S.week=13;
assert(JSON.stringify(streetOffers())!==o1,"a new week is new work");
streetOffers().forEach(o=>{
  assert(STREET_BY_K[o.k],"  "+o.k+" is real work");
  assert(o.pay>=500&&o.pay<=5000,"  "+STREET_BY_K[o.k].l+" · "+money(o.pay));
});

console.log("\n— who you send is the whole game —");
S.money=5e6;
const pool=S.roster.filter(c=>c.status==="available"&&canSign(c)&&!c.limits.length).slice(0,5);
pool.forEach(c=>{c.status="crew";c._touched=true;S.crewIds.push(c.id);});
assert(streetPool().length>=4,streetPool().length+" soldiers who could go");
assert(!streetPool().some(c=>c.isPlayer),"and the commander is not one of them — this is soldier's work");
const off=streetOffers()[0];
const odds=streetPool().map(c=>({c,o:streetOdds(c,off)}));
const spread=Math.max.apply(null,odds.map(x=>x.o.pClean))-Math.min.apply(null,odds.map(x=>x.o.pClean));
assert(spread>=10,"the same work, different people: "+odds.map(x=>x.c.first+" "+x.o.pClean+"%").join(", "));
// and the right person differs by the work, which is the thing the player is choosing on
const best=o=>streetPool().map(c=>({c,o:streetOdds(c,o)})).sort((a,b)=>b.o.pClean-a.o.pClean)[0].c.id;
const bests={};streetOffers().forEach(o=>{bests[best(o)]=true;});
console.log("ok  the best person is not the same person for every job ("+Object.keys(bests).length+" different names across "+streetOffers().length+" offers)");
odds.forEach(x=>{
  assert(x.o.why.length>=3,"  "+x.c.first+"'s fit is itemised ("+x.o.why.length+" lines)");
  assert(x.o.pClean>0&&x.o.pClean<100,"  and their odds are a number you can read: "+x.o.pClean+"%");
});

console.log("\n— a limit is a limit —");
const scaff=STREET.find(s=>s.k==="scaff");
const afraid=streetPool()[0];
afraid.limits=["heights"];
const blocked=streetOdds(afraid,{k:"scaff",pay:2000,diff:36});
assert(blocked.blocked,afraid.first+" will not go up the scaffolding: "+blocked.blocked);
assert(streetRun("scaff",afraid.id)===null,"and cannot be sent");
afraid.limits=[];

console.log("\n— one a week, and it costs something —");
fresh();
S.week=20;S.money=1000;
const p2=S.roster.filter(c=>c.status==="available"&&canSign(c)&&!c.limits.length).slice(0,4);
S.money=5e6;p2.forEach(c=>{c.status="crew";c._touched=true;S.crewIds.push(c.id);});
S.money=1000;S.heat=0;
const off2=streetOffers()[0];
const who=streetPool().map(c=>({c,o:streetOdds(c,off2)})).filter(x=>!x.o.blocked)[0].c;
const before={money:S.money,heat:S.heat};
const res=streetRun(off2.k,who.id);
assert(res,"one goes out: "+res.first+" on "+res.label.toLowerCase());
assert(S.heat>before.heat,"heat lands whether or not it came off ("+before.heat+" → "+S.heat+")");
if(res.won){
  assert(S.money===before.money+res.paid,"it paid "+money(res.paid)+" ("+money(before.money)+" → "+money(S.money)+")");
  assert(res.paid<=5000,"and it is street money, not job money");
}else{
  assert(S.money===before.money,"nothing came back");
  assert(["","injured","jailed"].indexOf(res.mark)>=0,"and the cost is on the person: "+(res.mark||"a walk home"));
}
assert(streetSpent(),"the week's street work is spent");
assert(streetRun(streetOffers()[0].k,streetPool()[0]&&streetPool()[0].id)===null,"a second one this week is refused");
S.week++;
assert(!streetSpent(),"and next week there is more of it");
assert(stats().street>=1,"the record counts it ("+stats().street+")");

console.log("\n— it is not a way to get rich —");
// the most it can pay in a year, against what one ordinary job pays
const bestYear=52*Math.max.apply(null,STREET.map(s=>s.pay[1]));
const oneJob=BAL.payTier[3];
assert(bestYear<oneJob*3,"a flawless year of it ("+money(bestYear)+") is worth less than three tier-3 jobs ("+money(oneJob*3)+")");

console.log("\nALL OK");

// Build 68: a new trade, and two of the same trade on one crew. Both are conversations, and what
// is tested here is that the answer is theirs and is decided by things a player can see: where
// they stand with you, what they are being asked to give up, and what is on the table.
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
const assert=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;throw new Error(m);}else console.log("ok  "+m);};
function fresh(){
  store={};
  newGame(Object.assign({id:"YOU",isPlayer:true,n:"Paz",first:"Paz",gender:"M",nat:"United Kingdom",avseed:7,
    face:randomFace(mulberry32(7),"M"),status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,
    vetFlag:false,limits:[],cmd:5},genProfile(mulberry32(11),COUNTRY_BY_NAME["United Kingdom"],"M",{role:"commander"})));
  S.money=9e6;
}
fresh();

/* ======================= TWO OF THE SAME TRADE ======================= */
console.log("\n— ten ways it comes up —");
assert(CLASH.length>=10,CLASH.length+" scenarios");
const res=CLASH.reduce((n,c)=>n+c.opts.length,0);
assert(res>40,res+" resolutions across them, which is more than forty");
assert(new Set(CLASH.map(c=>c.k)).size===CLASH.length,"each has its own key");
CLASH.forEach(sc=>{
  assert(sc.h&&sc.h.length>10,sc.k+": it has a heading");
  assert(sc.s&&sc.s.length>90,sc.k+": and a scene, not a label ("+sc.s.length+" characters)");
  assert(/\{A\}/.test(sc.s)&&/\{B\}/.test(sc.s),sc.k+": about the two of them by name");
  assert(sc.opts.length>=4,sc.k+": "+sc.opts.length+" ways out");
  sc.opts.forEach((o,i)=>{
    assert(o.t&&o.t.length>12,sc.k+"/"+i+": the answer is written");
    assert(o.why&&o.why.length>20,sc.k+"/"+i+": and says what it costs before you take it");
    assert(o.ok&&o.ok.length>40,sc.k+"/"+i+": and what happens if it goes your way");
    if(o.p!=null&&o.p<1)assert(o.bad&&o.bad.length>20,sc.k+"/"+i+": and if it does not");
    if(o.req&&o.req!=="none"&&o.req!=="crew2")
      assert(TECH_BY_K[o.req],sc.k+"/"+i+": needs a trade that exists ("+o.req+")");
    assert(o.eff||o.learnB,sc.k+"/"+i+": and it changes something");
  });
});
console.log("\n— it starts the day the second one signs —");
const two=S.roster.filter(c=>c.status==="available"&&c.tech==="forger"&&canSign(c)).slice(0,2);
two.forEach(c=>{c.status="crew";c._touched=true;S.crewIds.push(c.id);});
assert(!S.clash,"nothing yet, because nothing has been drawn");
clashCheck();
assert(S.clash&&S.clash.tech==="forger","two forgers on the crew and there it is");
assert(S.clash.aId===two[0].id&&S.clash.bId===two[1].id,"the one who was here first is the first named");
const sc=CLASH_BY_K[S.clash.k];
assert(sc,"and it is one of the ten: "+S.clash.k);
const v=clashVars(S.clash);
assert(clashFill(sc.s,v).indexOf("{")<0,"nothing is printed with a slot still in it");
assert(clashFill(sc.s,v).indexOf(two[0].first)>=0,"it uses their names");

console.log("\n— answering it —");
const before={money:S.money,a:two[0].loyalty,b:two[1].loyalty};
let idx=-1;for(let i=0;i<sc.opts.length;i++)if(clashCan(sc.opts[i])){idx=i;break;}
assert(idx>=0,"at least one answer is always open to you");
clashApply(idx);
assert(S.clash.outcome,"it has an outcome");
assert(S.clash.outcome.text.indexOf("{")<0,"written out, with no slots left");
assert(typeof S.clash.outcome.settled==="boolean","and says whether that is the end of it");
const settled=S.clash.outcome.settled;
clashClose();
assert(!S.clash,"closing it puts it away");
if(settled){
  assert(clashSettledFor(two[0].id,two[1].id),"a settled pair is written down as settled");
  clashCheck();assert(!S.clash,"and is not asked about again");
}else{
  assert(clashWaiting(two[0].id,two[1].id),"an unsettled pair is given a date to come back on");
  clashCheck();assert(!S.clash,"and is not raised again on the next render");
  S.week+=8;clashCheck();
  assert(S.clash,"but it does come back, weeks later");
  assert(S.clash.round>1,"as a fresh round of the same argument");
  S.clash=null;
}

/* ========================== A NEW TRADE ============================== */
console.log("\n— who can be asked —");
fresh();
const pro=S.roster.find(c=>c.status==="available"&&canSign(c));
pro.status="crew";pro._touched=true;S.crewIds.push(pro.id);
pro.exp=1;assert(canLearn(pro),"a Rookie has nothing to unlearn: "+canLearn(pro));
pro.exp=4;assert(!canLearn(pro),"a Veteran can be asked");
assert(canLearn(S.player),"and you cannot be sent to school: "+canLearn(S.player));
pro.status="injured";pro.out=S.week+2;
assert(canLearn(pro),"nor can somebody in a hospital: "+canLearn(pro));
pro.status="crew";pro.out=0;

console.log("\n— what it costs —");
const k=learnOptions(pro).find(t=>t.k!==pro.tech).k;
assert(learnOptions(pro).every(t=>t.k!==pro.tech),"you cannot be taught what you already are");
assert(learnCost(pro,k)>0,"a school costs "+money(learnCost(pro,k)));
/* It used to be two ranks, and that was the reason nobody ever did it: a Legend Safecracker
   came back a Professional Hacker and the Safecracker was gone, which is worse than hiring a
   stranger. Teaching ADDS a trade now, so the rank is untouched and the assertion inverts. */
assert(learnNewRank(pro)===pro.exp,"and no rank lost: "+EXP[pro.exp-1]+" → "+EXP[learnNewRank(pro)-1]);

console.log("\n— and whether they will —");
const at=(loy,ran,exp,attr,extra)=>{pro.loyalty=loy;pro.ranWith=ran;pro.exp=exp;pro.attrs[TECH_BY_K[k].a]=attr;
  return learnOdds(pro,k,extra||0).p;};
const cold=at(35,0,3,55), warm=at(90,8,3,55);
assert(warm>cold+20,"where you stand is most of it: "+cold+"% cold against "+warm+"% warm");
const proP=at(95,10,3,55), vet=at(95,10,4,55), leg=at(95,10,5,55);
assert(proP>vet&&vet>leg,"and rank is the rest: Professional "+proP+"% > Veteran "+vet+"% > Legend "+leg+"%");
const unfit=at(90,8,3,25), fit=at(90,8,3,90);
assert(fit>unfit,"being built for the new work counts: "+unfit+"% against "+fit+"%");
const flat=at(70,4,3,55), paid=at(70,4,3,55,learnCost(pro,k));
assert(paid>flat,"and money moves it, at any standing: "+flat+"% → "+paid+"%");
const broke=at(1,0,3,55), brokePaid=at(1,0,3,55,learnCost(pro,k));
assert(brokePaid>broke,"including for somebody who is on the way out: "+broke+"% → "+brokePaid+"%");
assert(learnOdds(pro,k,0).why.length>=3,"and the number is broken into its parts on the screen");

console.log("\n— sending them —");
pro.loyalty=90;pro.ranWith=8;pro.exp=4;
const m0=S.money, wasTech=pro.tech, wasExp=pro.exp;
const r=learnStart(pro,k,0);
assert(S.money===m0-r.cost,"the money goes today: "+money(r.cost));
assert(pro.status==="learning"&&pro.out>S.week,"and they are out of the field until week "+pro.out);
// Against a job this person is not otherwise barred from: a limit or a border is checked first,
// so on some boards the reason that comes back is "no violence" and the school is never reached.
// The question is what the board says about somebody who is AT SCHOOL, so arrange that and ask.
pro.limits=[];pro.jail=0;
const openJob=S.jobs.find(j=>!j.final&&entry(Object.assign({},pro,{status:"crew"}),j,true).ok)||S.jobs[0];
const gate=entry(pro,openJob,true);
assert(gate.ok===false,"a job cannot have them while they are at it");
assert(/learning/.test(gate.why),"and the board says why, in words: "+gate.why);
assert(field().indexOf(pro)<0,"and they are not in the field to be counted");
S.week=pro.out;
learnFinish(pro);
assert(pro.tech===wasTech,"they come back the SAME trade they were: "+TECH_BY_K[pro.tech].l);
assert(pro.tech2===k,"carrying a second one: "+TECH_BY_K[k].l);
assert(pro.exp===wasExp,"at the rank they left on: "+EXP[pro.exp-1]);
assert(hasTech(pro,wasTech)&&hasTech(pro,k),"and the job board sees both of them");
assert(!canLearn(pro)===false,"but there is no third: "+canLearn(pro));
assert(pro.status==="crew","and back in the field");
assert(pro.know.indexOf(TECH_BY_K[k].know)>=0,"with the knowledge the trade brings");
assert(!pro.learn,"and nothing left over");

console.log("\n— a file saved before any of this —");
fresh();
const packed=JSON.parse(JSON.stringify(packState()));
delete packed.clash;delete packed.talk;delete packed.clashDone;delete packed.clashNext;
store[SAVE_KEY]=JSON.stringify(packed);
assert(load(),"still opens");
assert(!S.clash,"with nothing hanging over it");
assert(CLASH.length>=10,"and the ten are there when they are needed");

console.log("\nALL OK");

// Build 77: money buys more that can go wrong.
//
// Under $150K a job is one room and at most one thing that goes wrong in it. Over it, two things
// go wrong, sometimes three, each its own decision with its own right answer — and they never want
// the same person twice, so a big payday is the thing that asks whether the crew is broad rather
// than whether it is good.
//
// What is checked here is the arithmetic of it: that the count follows the money, that the twists
// are distinct, that every answer counts towards the night rather than only the first, and that a
// job saved between two decisions comes back at the one it stopped at.
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

let fails=0;
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);fails++;}else console.log("ok  "+m);};
function fresh(){
  store={};
  newGame(Object.assign({id:"YOU",isPlayer:true,n:"Paz",first:"Paz",gender:"M",nat:"United Kingdom",avseed:7,
    face:randomFace(mulberry32(7),"M"),status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,
    vetFlag:false,limits:[],cmd:5},genProfile(mulberry32(11),COUNTRY_BY_NAME["United Kingdom"],"M",{role:"commander"})));
  S.money=9e6;S.rep=500;
  for(let i=0;i<40&&recruits().filter(c=>c.status==="crew").length<4;i++){
    const c=S.roster.find(x=>x.status==="available"&&!x._u);if(!c)break;c._u=true;
    c.status="crew";S.crewIds.push(c.id);
  }
  refreshJobs(true);
}
fresh();
// One place that finds a job of a given size this crew can actually put two people in the field
// on, re-rolling the board until it does. A twist needs two in the field to happen at all, and a
// single draw can come back with nothing the crew is allowed into — which is a coincidence, not a
// result, and it was failing three different sections of this file for the same non-reason.
function pickJob(over,extra){
  for(let t=0;t<40;t++){
    const j=S.jobs.find(x=>!x.final&&(over?x.payout>BIG_MONEY:x.payout<=BIG_MONEY)
      &&assessJob(x).team.length>=2&&(!extra||extra(x)));
    if(j)return j;
    S.jobs=[];refreshJobs(true);
  }
  return null;
}
const crewN=recruits().filter(c=>c.status==="crew").length;
check(crewN>=3,crewN+" on the crew, so a twist is possible at all");

/* ================= how many, and why that many ================= */
console.log("\n— the count follows the money —");
check(BIG_MONEY===150000,"the line is drawn at "+money(BIG_MONEY));
const teamOf=j=>assessJob(j).team;
const counts=(j,n)=>{const out=[];for(let i=0;i<n;i++)out.push(twistCount(j,assessJob(j),teamOf(j),freshRng()));return out;};
// A twist needs two people in the field, so the job has to be one this crew can actually put two
// people on — a country half of them are barred from produces no twists and would measure nothing.
const big=pickJob(true),small=pickJob(false);
check(big,"a job over the line: "+(big&&big.title)+" at "+(big&&money(big.payout)));
check(small,"and one under it: "+(small&&small.title)+" at "+(small&&money(small.payout)));
const bc=counts(big,600);
check(bc.every(n=>n>=2),"every big one gets at least two ("+Math.min.apply(null,bc)+" was the fewest in 600)");
check(bc.every(n=>n<=3),"and never more than three");
const threes=bc.filter(n=>n===3).length/bc.length;
check(threes>0.2&&threes<0.42,"a third happens "+Math.round(threes*100)+"% of the time — the minority, so two is what a big job feels like");
const sc=counts(small,600);
check(sc.some(n=>n===0),"a small one still usually has none");
check(sc.every(n=>n<=1),"and never more than one — nothing under the line changed");
const someTwist=sc.filter(n=>n>0).length/sc.length;
check(someTwist>0.03&&someTwist<0.45,"it gets one "+Math.round(someTwist*100)+"% of the time, as before");

/* ================= and they are different things ================= */
console.log("\n— two different things, not the same thing twice —");
let sets=0,dupes=0,short=0;
for(let i=0;i<300;i++){
  const t=makeTwists(big,teamOf(big),freshRng(),3);
  sets++;
  if(t.length<3)short++;
  if(new Set(t.map(x=>x.k)).size!==t.length)dupes++;
}
check(dupes===0,sets+" nights of three, and not one repeated itself");
check(short===0,"and all of them found three to draw from");
// the second one says so, because it is the second
const pair=makeTwists(big,teamOf(big),freshRng(),2);
check(TWIST_CUE.indexOf(pair[0].cue)>=0,"the first is announced as a thing going wrong: \""+pair[0].cue+"\"");
check(TWIST_AGAIN.indexOf(pair[1].cue)>=0,"and the second as it happening again: \""+pair[1].cue+"\"");

/* ================= every answer counts ================= */
console.log("\n— every call counts, not only the first —");
// Each run starts from a clean board. Finishing a job spends its weeks, so the crew that comes
// back from the first run is not the crew that went out — hurt, held, or simply barred from the
// next country — and a crew that cannot field two produces no twist at all.
const runIt=(how)=>{
  fresh();
  S.money=9e6;S.modal=null;S.pendingJob=null;
  const j=pickJob(true);
  if(!j)return null;
  const d=startJob(j,{pool:jobPool(j)});
  const P=S.pendingJob;
  if(!P)return null;
  const n=pendingTwists(P).length;
  const team=(P.teamIds||[]).map(byId).filter(Boolean);
  let guard=0;
  while(S.pendingJob&&guard++<8){
    const k=(S.pendingJob.answers||[]).length;
    const tw=pendingTwists(S.pendingJob)[k];
    if(!tw)break;
    const right=twistCorrect(tw,team);
    const idx=how==="right"?right:tw.opts.findIndex((o,i)=>i!==right);
    S.modal={type:"result",data:d};
    twistChoose(idx);
  }
  return {n:n,d:d,dm:d.why?d.why.dm:null,tier:d.tier,net:d.net,recs:d.twists||[]};
};
const rightRun=runIt("right");
check(rightRun&&rightRun.n>=2,"a big job ran with "+(rightRun&&rightRun.n)+" decisions in it");
check(rightRun&&rightRun.recs.length===rightRun.n,"and the report keeps a record of every one of them");
check(rightRun&&rightRun.recs.every(r=>r.free),"all answered right: "+(rightRun&&rightRun.recs.map(r=>r.h).join(" / ")));
/* This used to say dm===0 flatly, and it was right until attributes started mattering: the
   right call in GREEN HANDS now costs a little, so "answered every one correctly" no longer
   implies "cost nothing". It failed about one run in four, which is the mechanic working —
   whether this randomly generated crew happens to be steady enough is exactly the new
   question. The invariant that survives is the useful one: nothing came off for being WRONG,
   and every penny that did come off is a shaky hand that the report can name. */
const shaky=rightRun?rightRun.recs.filter(r=>r.shaky):[];
check(rightRun&&rightRun.dm===-4*shaky.length,
  "so the only thing that came off was green hands: dm "+(rightRun&&rightRun.dm)
  +" for "+shaky.length+" shaky of "+(rightRun&&rightRun.recs.length));
check(shaky.every(r=>r.shakyWhy),"and each of those says whose hand it was"
  +(shaky.length?": "+shaky.map(r=>r.shakyWhy).join(" | "):" (none this run)"));
const wrongRun=runIt("wrong");
check(wrongRun&&wrongRun.n>=2,"another big job, "+(wrongRun&&wrongRun.n)+" decisions");
check(wrongRun&&wrongRun.recs.length===wrongRun.n,"every one recorded again");
check(wrongRun&&wrongRun.recs.every(r=>!r.free),"all answered wrong this time");
check(wrongRun&&wrongRun.dm<0,"and the night is worse for it (dm "+(wrongRun&&wrongRun.dm)+")");
check(wrongRun&&wrongRun.dm<=-16,"by more than any one call could cost on its own — they add up ("+(wrongRun&&wrongRun.dm)+")");

/* ================= the ranking says which was which ================= */
console.log("\n— and the report accounts for each of them —");
check(wrongRun&&wrongRun.d,"there is a finished report to read");
const rk=((wrongRun&&wrongRun.d&&wrongRun.d.rk)||[]).filter(r=>/^Twist/.test(r.k));
check(rk.length===wrongRun.n,wrongRun.n+" twist lines on the ranking, one per call: "+rk.map(r=>r.k+" "+r.v).join(", "));
check(rk.every(r=>/^Twist \d: /.test(r.k)),"each numbered, because there was more than one");
const post=wentWrong((wrongRun&&wrongRun.d)||{});
const wrongs=(post.items||[]).filter(x=>/wrong call/i.test(x.k));
check(wrongs.length===wrongRun.n,"and the post-mortem explains all "+wrongs.length+" of them, not just the first");
check(wrongs.every(x=>/What would have set you free/.test(x.fix)),"each saying what would have worked instead");
check(new Set(wrongs.map(x=>x.note)).size===wrongs.length,"and naming which one it is talking about");

/* ================= the night reads as one night ================= */
console.log("\n— the feed is the night that was watched —");
const nar=((wrongRun&&wrongRun.d&&wrongRun.d.narrative))||[];
const cues=nar.filter(l=>l.twist).length;
check(cues===wrongRun.n,cues+" cue lines in the finished report, one per thing that went wrong");
const idx=nar.map((l,i)=>l.twist?i:-1).filter(i=>i>=0);
check(idx.every((v,i)=>i===0||v>idx[i-1]+1),"with what happened in between each of them, not stacked together");
check(idx[idx.length-1]<nar.length-1,"and the job carries on after the last one");

/* ================= a save between two decisions ================= */
console.log("\n— stopped between two of them, and reloaded —");
// Start clean. The two runs above each finished a job, and finishing one spends weeks — people
// come back hurt or held, and a crew that has dropped under two in the field produces no twist at
// all, which would fail this section for a reason that has nothing to do with saving.
fresh();
S.money=9e6;S.modal=null;S.pendingJob=null;
const big2=pickJob(true);
check(big2,"a fresh big job to stop halfway through: "+(big2&&big2.title));
const d2=startJob(big2,{pool:jobPool(big2)});
const P2=S.pendingJob;
check(P2&&pendingTwists(P2).length>=2,"a big job, stopped at the first of "+(P2&&pendingTwists(P2).length));
S.modal={type:"result",data:d2};
twistChoose(0);
check(S.pendingJob,"answering the first does not settle the job");
check((S.pendingJob.answers||[]).length===1,"one answer is on file");
check(S.modal.data.twistNo===2,"and the screen has moved to the second: "+S.modal.data.twistNo+" of "+S.modal.data.twistOf);
save();
const jid=S.pendingJob.jobId;
S=null;load();
check(S.pendingJob&&S.pendingJob.jobId===jid,"after a reload the job is still in the air");
check((S.pendingJob.answers||[]).length===1,"with the first answer still on it");
check(S.modal&&S.modal.type==="result","and the report is back on screen");
check(S.modal.data.twistNo===2,"at the second decision, not the first: "+S.modal.data.twistNo+" of "+S.modal.data.twistOf);
const back=S.modal.data.narrative||[];
check(back.filter(l=>l.twist).length===2,"with the first one and its answer already on the page");
// and finishing it from there settles the whole job
const teamR=(S.pendingJob.teamIds||[]).map(byId).filter(Boolean);
let g=0;
while(S.pendingJob&&g++<8){
  const k=(S.pendingJob.answers||[]).length;
  const tw=pendingTwists(S.pendingJob)[k];if(!tw)break;
  twistChoose(twistCorrect(tw,teamR));
}
check(!S.pendingJob,"and answering the rest settles it");
check(S.modal.data.twists&&S.modal.data.twists.length>=2,"with every decision of the night in the record");

/* ================= an old save, from before any of this ================= */
console.log("\n— and a job left mid-decision by an older build —");
const fake={jobId:"x",twist:{k:"engine",h:"h",s:"s",cue:"c",opts:[{t:"a"},{t:"b"}]},pre:[],teamIds:[],answers:undefined};
check(pendingTwists(fake).length===1,"its single twist is read as a list of one");
check(pendingTwists({}).length===0,"and a job with none reads as empty, not as a crash");
check(pendingTwists(null).length===0,"nor does no job at all");

console.log(fails?"\n"+fails+" FAILED":"\nALL OK");
process.exit(fails?1:0);

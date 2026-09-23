// Build 27: a client who takes a botched job personally.
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
const html=()=>document.getElementById("root").innerHTML;
const drain=()=>{let n=0;while(S.notices&&S.notices.length&&n++<40)noticeDone();if(S.modal&&S.modal.type==="notice")S.modal=null;S.loose=[];};

draft={name:"Sim",gender:"M",nat:"Israel",role:"commander",tech:"launderer",avseed:21,profile:null};rollDraftProfile();
newGame(Object.assign({id:"YOU",isPlayer:true,n:"Sim",first:"Sim",gender:"M",nat:"Israel",avseed:21,status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,vetFlag:false,limits:[]},draft.profile));
if(TUT.on)tutEnd();
S.money=5e7;drain();
["wheelman","enforcer","fixer","forger"].forEach(t=>{const c=S.roster.find(x=>x.status==="available"&&x.tech===t&&canSign(x));
  if(c&&recruits().length<crewSeats()){c.status="crew";c._touched=true;S.crewIds.push(c.id);}});
assert(field().length>=4,"a crew of "+field().length);

// ---------- the odds are declared, and they rise with how bad it was ----------
assert(GRUDGE.pDisaster>GRUDGE.pBotched&&GRUDGE.pBotched>GRUDGE.pMessy,
  "a disaster offends a client more than a botch, and a botch more than a messy job ("
  +Math.round(GRUDGE.pDisaster*100)+"% / "+Math.round(GRUDGE.pBotched*100)+"% / "+Math.round(GRUDGE.pMessy*100)+"%)");
assert(GRUDGE.pBlood>0&&GRUDGE.pBlood<1,"and some of them come for you rather than talk ("+Math.round(GRUDGE.pBlood*100)+"%)");

// ---------- a botched job can make an enemy ----------
const realFinish=finishJob;
// Take the LOWEST-tier runnable posting, not merely the first one. Taking the first meant that
// once the crew outgrew the bottom of the board, every attempt drew the same high-tier job and
// the tier<=1 filter below could never be satisfied — 60 attempts that were really one attempt,
// tried 60 times. That made this suite fail about one run in ten for reasons having nothing to
// do with grudges.
function drive(roll,maxTier){
  const run=S.jobs.filter(x=>!x.final&&assessJob(x,jobPool(x)).canRun).sort((p,q)=>p.tier-q.tier);
  const j=(maxTier==null?run:run.filter(x=>x.tier<=maxTier))[0]||run[0];
  if(!j)return null;
  const client=j.client,title=j.title;
  finishJob=function(P,ci,d){P.roll=roll;return realFinish(P,ci,d);};
  try{const d=startJob(j,{noTwist:true});return {d,client,title};}finally{finishJob=realFinish;}
}
// Sixty forced disasters in a row grind the crew down — hurt, held, gone — until no posting is
// runnable at all and drive() just returns null for the rest of the attempts. That is what made
// this suite fail about one run in eight: not the odds of a grudge, but a crew that had nobody
// left to send. browser27 already heals between attempts for the same reason; so does this now.
const heal=()=>{
  S.roster.forEach(c=>{if(c.status==="injured"||c.status==="jailed"){c.status="crew";c.out=0;
    if(S.crewIds.indexOf(c.id)<0&&recruits().length<crewSeats())S.crewIds.push(c.id);}});
  while(recruits().length<4){
    const f=S.roster.find(x=>x.status==="available"&&canSign(x));
    if(!f)break;f.status="crew";f._touched=true;S.crewIds.push(f.id);
  }
  S.money=5e7;
};
let made=null,tries=0;
while(!made&&tries++<60){
  S.grudges=[];S.revenge=null;
  heal();
  const r=drive(-900,1);
  drain();
  if(r&&r.d.tier<=1&&grudges().length)made=r;
}
assert(made,"a disaster that the client took personally, after "+tries+" of them");
const g=grudges().find(x=>!x.via);
assert(g&&g.c===made.client,"the grudge belongs to the client who posted it: "+g.c);
assert(g.kind==="word"||g.kind==="blood","and is either the word going round or worse ("+g.kind+")");
assert(g.until>S.week,"it lasts to week "+g.until);
assert(S.log.some(l=>l.t.indexOf("not taking it well")>0),"the case log says so: "+(S.log.map(l=>l.t).find(t=>t.indexOf("not taking it well")>0)||"").slice(0,90));

// ---------- they take people with them ----------
const via=grudges().filter(x=>x.via);
assert(via.length>=1,"they have a word with "+via.length+" other client(s): "+via.map(v=>v.c).join(", "));
assert(via.every(v=>v.via===g.c),"and it is on behalf of the one you crossed");
assert(via.every(v=>v.kind==="word"&&v.done),"who are not themselves coming for you");

// ---------- banned clients do not post ----------
assert(clientBanned(g.c),g.c+" will not deal with you");
assert(!clientBanned(CLIENTS.find(c=>!clientBanned(c))),"but the rest of the board still will");
assert(openClients().length===CLIENTS.length-bannedClients().length,
  openClients().length+" of "+CLIENTS.length+" clients still open");
assert(!S.jobs.some(j=>!j.final&&clientBanned(j.client)),"their postings came off the board");
S.jobs=[];refreshJobs(true);
assert(S.jobs.length>0&&!S.jobs.some(j=>!j.final&&clientBanned(j.client)),"and a fresh board has none of theirs either");
for(let i=0;i<40;i++){const j=makeJob(mulberry32(i*7919+3),0);assert(!clientBanned(j.client),"nor does any posting made while the grudge stands");}

// ---------- the board says who, and why there are fewer jobs ----------
S.tab="jobs";S.jobOpen=null;S.modal=null;render();
const bh=html();
assert(bh.indexOf("will not deal with you")>=0,"the board says clients will not deal with you");
assert(bh.indexOf(esc(g.c))>=0,"naming them as they are written, article and all: "+g.c);
assert(bh.indexOf("An heir")<0&&bh.indexOf("A shipping line to week")<0,"without inventing capitals");
assert(bh.indexOf("week "+g.until)>=0,"and until when");
// A notice that states a consequence and not its cause is the thing the board is not allowed to
// print, so the line has to carry the reason as well as the fact.
assert(g.job?bh.indexOf(esc(g.job))>=0:true,"and what it was about: "+(g.job||"(no job on this grudge)"));
assert(bh.indexOf("week "+g.since)>=0,"and when that was (week "+g.since+")");
assert(/disaster|botched|messy|had a word|went wrong/i.test(bh),"and which way it went");
assert(bh.indexOf('data-act="grudge-open"')>=0,"and the whole account is one click away");

// ---------- it lifts by itself ----------
const snap=JSON.stringify(packState());
S.week=g.until;
assert(!clientBanned(g.c),"the ban lifts on its own at week "+g.until);
assert(openClients().length===CLIENTS.length||bannedClients().length<via.length+1,"and the board opens up again");
store[SAVE_KEY]=snap;load();

// ---------- the ones who are not finished turn up ----------
const bg=grudges().find(x=>x.kind==="blood"&&!x.done);
if(!bg){
  // force one, so the second half is always under test
  S.grudges=[{c:"the Notary",since:S.week,until:S.week+20,kind:"blood",job:"Open the floor safe",country:"France",fee:240000,revengeAt:S.week+1,done:false}];
}
const want=grudges().find(x=>x.kind==="blood"&&!x.done);
assert(want,"a client who is not finished with you: "+want.c);
assert(want.revengeAt>0,"and a week they turn up: "+want.revengeAt);
let wk=0;
while(!S.revenge&&wk++<40){S.event=null;S.loose=[];S.week=Math.max(S.week,want.revengeAt);grudgeTick(freshRng());if(!S.revenge)weekTick(freshRng());}
assert(S.revenge,"they turn up");
const V=S.revenge;
assert(V.c===want.c,"it is the client you crossed: "+V.c);
assert(V.h&&V.s&&V.s.length>60,"it is a scene, not a label: "+V.h);
assert(V.s.indexOf(cap(V.c))>=0||V.s.indexOf(V.c)>=0||V.s.indexOf(V.v.J)>=0,"and it names them or the job they lost");
assert(!/[;,] [A-Z][a-z]+ (line|heir|consulate|shipping)/.test(V.s),"no client name capitalised mid-sentence: "+V.s.slice(0,110));
assert(V.s.indexOf("about Open ")<0&&V.s.indexOf("about Carry ")<0&&V.s.indexOf("about Find ")<0,
  "a job is referred to by the thing, not by its title as a verb: "+V.s.slice(0,110));
REVENGE.forEach(r=>{
  const t=fill2(r.s,{C:"The Notary",c:"the Notary",J:"the floor safe",E:"E",F:"F",L:"L"});
  assert(t.indexOf("{")<0,r.k+": every placeholder is filled");
  assert(!/; The /.test(t)&&!/, so The /.test(t),r.k+": no capital after a semicolon or a comma — "+t.slice(0,90));
});
assert(V.opts.length>=3,V.opts.length+" answers");
assert(V.opts.every(o=>typeof o.p==="number"&&o.p>0&&o.p<=1),"each with the odds it goes your way");
assert(V.opts.some(o=>!o.req&&!o.pay),"at least one needs nothing at all");
assert(REVENGE.every(r=>r.opts.some(o=>!o.req&&!o.pay)),"which is true of all four scenarios");
assert(REVENGE.length===4&&REVENGE.every(r=>r.h&&r.s.length>60&&r.opts.length>=3),"four scenarios, each a scene with real answers");

// ---------- the screen ----------
S.modal={type:"revenge"};render();
const rh=html();
assert(rh.indexOf(esc(V.h))>=0,"the box names what is happening");
assert(rh.indexOf("% it goes the way you want")>=0,"and puts a percentage on every answer");
assert((rh.match(/data-act="revenge"/g)||[]).length===V.opts.length,"with every answer on it");
assert(rh.indexOf("the bill for a job that went wrong")>=0,"and says what it is");
// an answer you cannot take is not offered
const needs=V.opts.findIndex(o=>o.req&&!revengeCan(o));
if(needs>=0)assert(rh.indexOf('data-act="revenge" data-i="'+needs+'" disabled')>=0,"an answer needing somebody you have not got is disabled");

// ---------- answering it costs, and clears it ----------
const b4={money:S.money,heat:S.heat,crew:field().length};
const payIdx=V.opts.findIndex(o=>o.pay&&S.money>=V.cost);
const idx=payIdx>=0?payIdx:V.opts.findIndex(o=>!o.req&&!o.pay);
const paying=idx===payIdx&&payIdx>=0;
revengeResolve(idx);
assert(!S.revenge&&(!S.modal||S.modal.type!=="revenge"),"answering clears it");
assert(S.log.some(l=>l.t.indexOf(cap(V.c))===0),"the case log keeps it: "+(S.log.map(l=>l.t).find(t=>t.indexOf(cap(V.c))===0)||"").slice(0,80));
const done=grudges().find(x=>x.c===V.c&&x.kind==="blood");
assert(!done||done.done,"and they are finished with you");
if(paying){assert(S.money<=b4.money-V.cost,"paying costs "+money(V.cost));}
// Only giving the client back what they lost settles the client. Paying a police desk settles a
// file; paying your own man settles your own man. One scenario offers it, and it is certain.
const settlers=[];REVENGE.forEach(r=>r.opts.forEach(o=>{if(o.eff&&o.eff.clear)settlers.push({k:r.k,t:o.t,p:o.p,pay:!!o.pay});}));
assert(settlers.length>=1,"there is a way to settle it: "+settlers.map(x=>x.k+" — "+x.t).join("; "));
assert(settlers.some(x=>x.pay&&x.p===1),"and paying them back what they lost is certain");
const doorPay=REVENGE.find(r=>r.k==="door").opts.find(o=>o.pay);
assert(doorPay&&doorPay.eff.clear&&doorPay.p===1,"the cash at the door always ends it");
const policePay=REVENGE.find(r=>r.k==="police").opts.find(o=>o.pay);
assert(policePay&&!(policePay.eff&&policePay.eff.clear),"paying a police desk does not make the client forgive you");
const buyPay=REVENGE.find(r=>r.k==="buy").opts.find(o=>o.pay);
assert(buyPay&&!(buyPay.eff&&buyPay.eff.clear),"and neither does paying your own man a bonus");
// it works: set it up and take it
S.grudges=[{c:"the Notary",since:S.week,until:S.week+25,kind:"blood",job:"Open the floor safe",noun:"the floor safe",country:"France",fee:300000,revengeAt:S.week,done:false}];
S.money=5e7;S.revenge=null;grudgeTick(freshRng());
if(S.revenge&&S.revenge.k!=="door"){
  const R=REVENGE.find(r=>r.k==="door");
  S.revenge={k:"door",c:"the Notary",h:R.h,s:R.s,cost:revengeCost(S.grudges[0]),lowId:null,
    v:{C:"The Notary",c:"the Notary",J:"the floor safe",E:"E",F:"F",L:"L"},
    opts:R.opts.map(o=>({t:o.t,req:o.req||null,pay:!!o.pay,p:o.p})),week:S.week};
}
assert(clientBanned("the Notary"),"the Notary will not deal with you");
const pi=S.revenge.opts.findIndex(o=>o.pay);
revengeResolve(pi);
assert(!clientBanned("the Notary"),"paying them back at the door lifts the ban");

// ---------- a robbery takes what they lost, not a slice of everything ----------
S.money=5e7;
const R=REVENGE.find(r=>r.k==="rob");
const robOpt=R.opts.find(o=>(o.eff&&o.eff.robbed)||(o.badEff&&o.badEff.robbed));
assert(robOpt,"a robbery is one of the things that can happen");
S.revenge={k:"rob",c:"the Notary",h:R.h,s:R.s,cost:100000,lowId:null,v:{C:"The Notary",J:"a job",E:"x",F:"y",L:"z"},
  opts:R.opts.map(o=>({t:o.t,req:o.req||null,pay:!!o.pay,p:o.p})),week:S.week};
const m0=S.money;
revengeResolve(R.opts.indexOf(robOpt));
const taken=m0-S.money;
assert(taken<=Math.max(25000,100000*2)+1,"they take what they lost ("+money(taken)+"), not a slice of a "+money(m0)+" float");

// ---------- paying a client off lifts every line they have open, not the first one found ----------
// A client can be banned twice over: once for a job of their own that went wrong, and once
// because somebody they drink with had a word. Settling with them has to clear both, or the
// player pays, is told they will take calls again, and they do not.
S.grudges=[];S.money=5e7;S.week=10;
S.grudges.push({c:"the Notary",since:8,until:30,kind:"word",job:"",country:"",fee:0,revengeAt:0,done:true,via:"the Ferryman"});
S.grudges.push({c:"the Notary",since:10,until:40,kind:"blood",job:"a job",noun:"the job",country:"Italy",fee:1e6,revengeAt:0,done:false});
assert(grudges().filter(g=>g.c==="the Notary"&&S.week<g.until).length===2,"the Notary has two lines open at once");
const C=REVENGE.find(r=>r.opts.some(o=>o.pay&&o.eff&&o.eff.clear));
const payOpt=C.opts.find(o=>o.pay&&o.eff&&o.eff.clear);
assert(payOpt,"and one of the answers ("+C.k+") is to pay them back");
S.revenge={k:C.k,c:"the Notary",h:C.h,s:C.s,cost:50000,lowId:null,
  v:{C:"The Notary",J:"a job",E:"x",F:"y",L:"z"},
  opts:C.opts.map(o=>({t:o.t,req:o.req||null,pay:!!o.pay,p:o.p})),week:S.week};
revengeResolve(C.opts.indexOf(payOpt));
assert(!clientBanned("the Notary"),"paying them back lifts the ban");
assert(grudges().filter(g=>g.c==="the Notary"&&S.week<g.until).length===0,"and closes both lines, not one");
assert(openClients().indexOf("the Notary")>=0,"so they are on the board again");

// ---------- the Committee is nobody's client ----------
S.grudges=[];
assert(grudgeAdd("the Committee",freshRng(),{title:"x",country:"Switzerland",payout:1e6},0)===null,"the last score has no client to offend");
assert(!grudges().length,"and no grudge is recorded for it");

// ---------- old saves ----------
const packed=JSON.parse(JSON.stringify(packState()));
delete packed.grudges;delete packed.revenge;
store[SAVE_KEY]=JSON.stringify(packed);
assert(load(),"a file saved before any of this still opens");
assert(Array.isArray(S.grudges)&&S.grudges.length===0,"with an empty book of grudges");
assert(!S.revenge,"and nobody at the door");
assert(openClients().length===CLIENTS.length,"every client will deal with it");

console.log("ALL OK");
})();
`;
require("vm").runInThisContext(src+"\n"+TESTS,{filename:"t31.js"});

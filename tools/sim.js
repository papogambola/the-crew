// Plays the game headlessly, many times, and reports how long it lasts and how hard it was.
// Usage: node sim.js [runs] [file] [skill]     skill: good | median | poor
const fs=require("fs");
const RUNS=+(process.argv[2]||60);
// by default, read the game out of index.html next door
const FILE=process.argv[3]||(__dirname+"/../index.html");
const SKILL=process.argv[4]||"good";
let src=fs.readFileSync(FILE,"utf8");
if(/\.html?$/i.test(FILE)){const i=src.indexOf("<script>"),j=src.lastIndexOf("</script>");src=src.slice(i+8,j);}
const ELS={};
function mkEl(id){const el={id,style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false;},toggle(){}},children:[],dataset:{},innerHTML:"",value:"",textContent:"",hidden:false,scrollTop:0,scrollHeight:0,setAttribute(){},getAttribute(){return null;},appendChild(){},insertAdjacentHTML(p,h){el.innerHTML+=h;},querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){},removeEventListener(){},getBoundingClientRect(){return{left:0,top:0,width:100,height:100,right:100,bottom:100};},focus(){},select(){},play(){return Promise.resolve();},pause(){},load(){},scrollIntoView(){},closest(){return null;},remove(){},contains(){return false;},setSelectionRange(){},paused:true,volume:1,loop:false,src:""};return el;}
global.store={};const store=global.store;
global.localStorage={getItem:k=>store[k]===undefined?null:store[k],setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}};
global.document={getElementById:id=>ELS[id]||(ELS[id]=mkEl(id)),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},createElement:t=>mkEl(t),body:mkEl("body"),documentElement:mkEl("html"),hidden:false};
global.window={matchMedia:()=>({matches:false}),addEventListener(){},scrollTo(){},innerWidth:1200,innerHeight:800,localStorage:global.localStorage,document:global.document,location:{href:"",search:""},navigator:{language:"en"}};
global.navigator={language:"en"};global.requestAnimationFrame=()=>0;global.Audio=function(){return mkEl("audio");};global.fetch=()=>Promise.reject(new Error("x"));global.URL=global.URL||{};global.URL.createObjectURL=()=>"blob:x";global.scrollTo=()=>{};global.setInterval=()=>1;global.clearInterval=()=>{};

const BODY=`
;(function(){
const RUNS=`+RUNS+`, SKILL=`+JSON.stringify(SKILL)+`;
// a player who takes the best job on the board, hires when there is a seat and money,
// answers twists right some of the time, and lays low when the heat is dangerous.
const P={good:{twist:0.75,bench:true,layAt:82},median:{twist:0.45,bench:true,layAt:90},poor:{twist:0.2,bench:false,layAt:999}}[SKILL];
render=function(){};                     // no screen
const out=[];
for(let run=0;run<RUNS;run++){
  try{store[SAVE_KEY]&&delete store[SAVE_KEY];}catch(e){}
  draft={name:"Sim",gender:"M",nat:"Israel",role:"commander",tech:"launderer",avseed:run+1,profile:null};rollDraftProfile();
  newGame(Object.assign({id:"YOU",isPlayer:true,n:"Sim",first:"Sim",gender:"M",nat:"Israel",avseed:run+1,status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,vetFlag:false,limits:[]},draft.profile));
  if(typeof TUT!=="undefined"&&TUT.on)tutEnd();
  const r=freshRng();
  let weeks=0,jobsRun=0,laid=0,failed=0,clean=0,hires=0,peakMoney=0,broke=0,twistsSeen=0,twistsRight=0,feesPaid=0,trips=0,snags=0,refused=0,wasted=0,grudged=0;
  let lastWeek=S.week;
  while(!S.over&&weeks<1500){
    // clear anything waiting for a click
    S.notices=[];S.modal=null;
    // somebody outside the crew: answer it the cheapest way that is available
    while(S.loose&&S.loose.length){
      const L=S.loose[0],cc=byId(L.id);
      if(!cc){S.loose.shift();continue;}
      const opts=looseOptions(cc,L.why);
      let pickIdx=0;
      const kill=opts.findIndex(o=>o.kill&&o.need!==false);
      if(kill>=0&&r()<0.25){pickIdx=kill;wasted++;}
      else{const quiet=opts.findIndex(o=>!o.kill&&o.need!==false&&o.talk<opts[0].talk);pickIdx=quiet>=0&&r()<0.5?quiet:0;}
      looseResolve(pickIdx);
    }
    // an unhappy client at the door: pay them back if the float can carry it, otherwise take the
    // best answer the crew can actually give
    if(S.revenge){
      const V=S.revenge;
      let pi=V.opts.findIndex(o=>o.pay&&S.money>=V.cost);
      if(pi<0){let best=-1,bp=-1;V.opts.forEach((o,i2)=>{if((!o.req||revengeCan(o))&&!o.pay&&o.p>bp){bp=o.p;best=i2;}});pi=best;}
      if(pi>=0){grudged++;revengeResolve(pi);}else S.revenge=null;
    }
    if(S.event){const W=WEEKLY.find(w=>w.k===S.event.k);let i=0;
      // take the first option the crew can actually perform
      for(let k=0;k<W.opts.length;k++){const o=W.opts[k];
        if(o.req==="enforcer"&&!recruits().some(c=>c.status==="crew"&&c.tech==="enforcer"))continue;
        if(o.money&&o.money<0&&S.money< -o.money)continue;
        i=k;break;}
      eventApply(S.event,i);S.event=null;if(S.over)break;}
    // hire into open seats
    let guard=0;
    while(recruits().length<crewSeats()&&guard++<8){
      // keep a few weeks of payroll back, then take the best file the float can carry
      // keep a few weeks of payroll back — but a crew too small to work any posting on the
      // board is not a reserve, it is a slow death, so spend down to field one
      const up=payroll().reduce((s,c)=>s+c.upkeep,0)+retainerCost();
      // a fee is not the cost of a hire — the weeks of upkeep behind it are. Never spend the
      // float down to where one bad job ends the crew.
      const canWork=S.jobs.some(j=>assessJob(j,jobPool(j)).canRun);
      const reserve=canWork?Math.max(40000,up*6):Math.max(15000,up*3);
      const cand=S.roster.filter(c=>c.status==="available"&&canSign(c)&&c.fee<=S.money-reserve);
      const power=c=>c.attrs.muscle+c.attrs.brains+c.attrs.tech+c.attrs.charm+c.attrs.nerve;
      // rich enough to pay for quality, buy quality; poor, buy what pays for itself
      const rich=S.money>up*20+200000;
      const want=cand.sort(rich?(a,b)=>power(b)-power(a)
        :(a,b)=>power(b)/Math.max(1,b.upkeep)-power(a)/Math.max(1,a.upkeep))[0];
      if(!want)break;
      // hiring is a trip now: it takes a week, it can be turned down, and a meeting that goes
      // wrong is answered with whatever the crew brought
      const before=recruits().length,f=want.fee,m0=S.money;
      hire(want.id);
      if(!S.modal||S.modal.type!=="trip"){break;}
      const Tr=S.modal.data;
      trips++;
      // A trip is pending until the week runs out, snag or no snag — it used to settle inside
      // startTrip when nobody had to decide anything, so a pending trip always meant a snag was
      // waiting. Reading .snag.k off every pending trip now throws on the quiet ones.
      if(S.pendingTrip&&S.pendingTrip.snag){
        snags++;
        const cc=byId(S.pendingTrip.cid),kit=tripKit(cc);
        const W=TRIP_SNAGS.find(x=>x.k===S.pendingTrip.snag.k);
        // the best answer the crew can actually take, by the same priority a player would read
        let bi=0,bp=99;
        W.opts.forEach((o,i)=>{if(tripCan(o,cc,kit)&&o.pri<bp){bp=o.pri;bi=i;}});
        if(r()>P.twist){bi=Math.floor(r()*W.opts.length);}   // an imperfect player
        finishTrip(S.pendingTrip,bi,Tr);
      } else if(S.pendingTrip){
        finishTrip(S.pendingTrip,null,Tr);   // nobody had to decide anything; the week just runs out
      }
      S.modal=null;
      if(Tr.outcome==="signed"){hires++;feesPaid+=(m0-S.money);}
      else {refused++;feesPaid+=Math.max(0,m0-S.money);}
      if(recruits().length===before&&Tr.outcome!=="signed")break;
    }
    // a player with money buys the things money buys
    if(S.money>600000)RETAINERS.forEach(rt=>{if(!hasRetainer(rt.k))toggleRetainer(rt.k);});
    if(S.money>900000&&safehouseLevel()<3)buySafehouse();
    // the best job on the board
    // value per week on the ground: what the name gains plus what the money is worth, times
    // the chance it actually comes off. Grinding the easiest posting should not look good.
    const runnable=S.jobs.map(j=>({j,a:assessJob(j,jobPool(j))})).filter(x=>x.a.canRun);
    const value=x=>{
      const wk=Math.max(1,x.j.weeks||1);
      const pC=x.a.pClean/100,pO=x.a.pOk/100,pF=x.a.pFail/100,pD=x.a.pDis/100;
      const repBase=[0,6,12,22,36][x.j.tier]||36;
      const rep=(pC*repBase+pO*0.35*repBase-pF*x.j.tier*4-pD*x.j.tier*6)*tierWorth(x.j.tier);
      const cash=x.j.payout*(pC*1.08+pO*0.8);
      return (rep*2200+cash)/wk;
    };
    const fin=runnable.find(x=>x.j.final);
    const best=fin||runnable.sort((x,y)=>value(y)-value(x))[0];
    if(!best||(S.heat>=P.layAt&&!fin)){layLow();laid++;if(laid>400)break;}
    else{
      const d=startJob(best.j,{});
      jobsRun++;
      if(S.pendingJob){
        twistsSeen++;
        const tw=S.pendingJob.twist;
        const team=S.pendingJob.teamIds.map(byId).filter(Boolean);
        let idx;
        if(r()<P.twist){ // the right call
          let bestI=0,bestP=99;
          tw.opts.forEach((o,i)=>{const can=!o.req||!o.req.tech||o.req.tech.some(t=>team.some(c=>c.tech===t));if(can&&o.pri<bestP){bestP=o.pri;bestI=i;}});
          idx=bestI;twistsRight++;
        } else idx=Math.floor(r()*tw.opts.length);
        finishJob(S.pendingJob,idx,d);
      }
      if(d.tier>=4)clean++;
      if(d.tier<=1)failed++;
    }
    if(S.money>peakMoney)peakMoney=S.money;
    if(S.money<=0)broke++;
    weeks+=Math.max(1,S.week-lastWeek);lastWeek=S.week;
    checkOver();
  }
  const st=stats();
  const v={clean:st.clean||0,success:st.success||0,messy:st.messy||0,botched:st.botched||0,disaster:st.disaster||0};
  out.push({win:S.over==="win",over:S.over,weeks:S.week,jobs:jobsRun,laid,failed,clean,hires,rep:S.rep,money:S.money,peak:peakMoney,
    v,earned:st.earned||0,cuts:st.cuts||0,fees:feesPaid,upkeepPaid:Math.max(0,(st.earned||0)-(st.cuts||0)-feesPaid-S.money+60000),
    crew:recruits().filter(c=>c.status==="crew").length,broke,twistsSeen,twistsRight,trips,snags,refused,wasted,grudged,banned:(S.grudges||[]).length,
    lostPeople:(stats()&&stats().lost)||0,hurt:(stats()&&stats().hurt)||0,taken:(stats()&&stats().taken)||0});
}
const num=a=>a.slice().sort((x,y)=>x-y);
const med=a=>{const s=num(a);return s.length?s[Math.floor(s.length/2)]:0;};
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const pct=(a,p)=>{const s=num(a);return s.length?s[Math.min(s.length-1,Math.floor(s.length*p))]:0;};
const wins=out.filter(o=>o.win),losses=out.filter(o=>o.over==="lose"),stuck=out.filter(o=>!o.over);
const W=wins.map(o=>o.weeks);
const money=n=>(n>=1e6?"$"+(n/1e6).toFixed(2)+"M":"$"+Math.round(n/1000)+"K");
console.log("RUNS "+out.length+"  skill="+SKILL);
console.log("  won        "+wins.length+"  ("+Math.round(wins.length/out.length*100)+"%)");
console.log("  lost       "+losses.length+"  ("+Math.round(losses.length/out.length*100)+"%)");
console.log("  unfinished "+stuck.length);
if(W.length)console.log("  weeks to win   median "+med(W)+"   p10 "+pct(W,0.1)+"   p90 "+pct(W,0.9)+"   min "+num(W)[0]+"   max "+num(W)[W.length-1]);
console.log("  jobs run       median "+med(out.map(o=>o.jobs))+"   laid low median "+med(out.map(o=>o.laid)));
console.log("  failed jobs    median "+med(out.map(o=>o.failed))+" of "+med(out.map(o=>o.jobs))+"   clean median "+med(out.map(o=>o.clean)));
console.log("  final ranking  median "+med(out.map(o=>o.rep))+"   final money median "+money(med(out.map(o=>o.money)))+"   peak "+money(med(out.map(o=>o.peak))));
console.log("  clients at the door median "+med(out.map(o=>o.grudged))+"  grudges still standing "+med(out.map(o=>o.banned)));
console.log("  trips median "+med(out.map(o=>o.trips))+"  of which snagged "+med(out.map(o=>o.snags))+"  refused "+med(out.map(o=>o.refused))+"  people dealt with "+med(out.map(o=>o.wasted)));
console.log("  hires median "+med(out.map(o=>o.hires))+"   people lost median "+med(out.map(o=>o.lostPeople))+"   hurt "+med(out.map(o=>o.hurt))+"   taken "+med(out.map(o=>o.taken)));
console.log("  weeks broke median "+med(out.map(o=>o.broke)));
console.log("  ECONOMY per run: earned "+money(med(out.map(o=>o.earned)))+"  crew cuts "+money(med(out.map(o=>o.cuts)))
  +"  hire fees "+money(med(out.map(o=>o.fees)))+"  upkeep+extras "+money(med(out.map(o=>o.upkeepPaid))));
console.log("  VERDICTS  clean "+pctOf("clean")+"%  success "+pctOf("success")+"%  messy "+pctOf("messy")+"%  botched "+pctOf("botched")+"%  disaster "+pctOf("disaster")+"%");
function pctOf(k){const tot=out.reduce((s,o)=>s+o.v.clean+o.v.success+o.v.messy+o.v.botched+o.v.disaster,0);return tot?Math.round(out.reduce((s,o)=>s+o.v[k],0)/tot*100):0;}
})();
`;
require("vm").runInThisContext(src+"\n"+BODY,{filename:"sim-inner.js"});

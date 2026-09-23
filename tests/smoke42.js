// Build 76: a new trade, and two of the same trade on one crew. Both are conversations, and what
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

let fails=0;
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);fails++;}else console.log("ok  "+m);};
function fresh(){
  store={};
  newGame(Object.assign({id:"YOU",isPlayer:true,n:"Paz",first:"Paz",gender:"M",nat:"United Kingdom",avseed:7,
    face:randomFace(mulberry32(7),"M"),status:"crew",cut:0,upkeep:0,loyalty:100,greed:0,mole:false,vetted:true,
    vetFlag:false,limits:[],cmd:5},genProfile(mulberry32(11),COUNTRY_BY_NAME["United Kingdom"],"M",{role:"commander"})));
  S.money=9e6;
}
fresh();

/* ================= the families ================= */
console.log("\n— every language the game uses has a family, or is deliberately alone —");
const all=allLangs();
check(all.length>20,all.length+" languages across the board and the roster");
const homeless=all.filter(l=>!langFamily(l));
check(homeless.length===0,"none of them is unaccounted for"+(homeless.length?": "+homeless.join(", "):""));
// The seven Paz gave, exactly as given.
const GIVEN={
  romance:["French","Spanish","Portuguese","Italian","Romanian","Catalan"],
  germanic:["English","German","Dutch","Swedish","Danish","Norwegian","Icelandic"],
  slavic:["Russian","Ukrainian","Polish","Czech","Slovak","Bulgarian","Serbian","Croatian","Slovenian"],
  aryan:["Hindi","Urdu","Bengali","Punjabi","Gujarati","Marathi","Nepali","Sinhala"],
  sino:["Mandarin","Cantonese","Burmese","Tibetan"],
  turkic:["Turkish","Azerbaijani","Uzbek","Kazakh","Turkmen","Kyrgyz"],
  austronesian:["Indonesian","Malay","Tagalog","Filipino","Javanese","Malagasy","Maori","Hawaiian"],
};
Object.keys(GIVEN).forEach(f=>{
  const wrong=GIVEN[f].filter(l=>langFamily(l)!==f);
  check(wrong.length===0,LANG_FAMILY_NAME[f]+": all "+GIVEN[f].length+" of them"+(wrong.length?" — WRONG: "+wrong.join(", "):""));
});
// The nine in the game that were not on that list got a real home rather than a shrug.
check(langFamily("Arabic")==="semitic"&&langFamily("Hebrew")==="semitic","Arabic and Hebrew are one family — and Arabic alone opens six countries");
check(langFamily("Swahili")==="bantu"&&langFamily("Zulu")==="bantu","so are Swahili and Zulu");
check(langFamily("Afrikaans")==="germanic","Afrikaans is Germanic, which is where Dutch put it");
["Greek","Finnish","Japanese","Korean","Thai","Vietnamese"].forEach(l=>{
  const f=langFamily(l);
  const others=all.filter(x=>x!==l&&langFamily(x)===f);
  check(others.length===0,l+" stands alone in this game — nothing is ever near it");
});

/* ================= Paz's own example ================= */
console.log("\n— a French speaker —");
const fr=S.roster.find(c=>c.status==="available"&&(c.langs||[]).indexOf("French")>=0
  && !(c.attrs.brains>=TUTOR.brainsAt) && !hasTrait(c,"quick") && c.tech!=="linguist");
check(fr,"found one with nothing else going for them: "+(fr&&fr.first));
// They may speak more than one Romance language; which one the game reaches through does not
// matter, only that it reached through one of them.
["Spanish","Italian","Portuguese","Romanian","Catalan"].forEach(l=>{
  const t=tutorWeeks(fr,l);
  check(t.weeks===TUTOR.near&&t.via&&langFamily(t.via)==="romance"&&(fr.langs||[]).indexOf(t.via)>=0,
    l+" is "+t.weeks+" weeks — "+t.via+" is Romance and so is this");
});
const jp=tutorWeeks(fr,"Japanese");
check(jp.weeks===TUTOR.far&&!jp.via,"Japanese is "+jp.weeks+" weeks, from nothing");
check(tutorCost(fr,"Spanish")<tutorCost(fr,"Japanese"),
  "so Spanish costs "+money(tutorCost(fr,"Spanish"))+" and Japanese "+money(tutorCost(fr,"Japanese")));
check(tutorCost(fr,"Japanese")<learnCost(fr,"hacker"),
  "and even the dear one is small beside a trade ("+money(tutorCost(fr,"Japanese"))+" vs "+money(learnCost(fr,"hacker"))+")");

/* ================= what takes weeks off ================= */
console.log("\n— and what makes somebody quicker —");
const base=JSON.parse(JSON.stringify(fr));
base.attrs=Object.assign({},fr.attrs);
const w=(mut,l)=>{const c=Object.assign({},base,{attrs:Object.assign({},base.attrs)});mut(c);return tutorWeeks(c,l||"Japanese").weeks;};
const plain=w(()=>{});
check(plain===TUTOR.far,"a plain one takes "+plain+" weeks on a far language");
check(w(c=>{c.attrs.brains=TUTOR.brainsAt;})===plain-1,"Brains "+TUTOR.brainsAt+" takes a week off");
check(w(c=>{c.attrs.brains=TUTOR.brainsAt-1;})===plain,"and a point under it does not");
check(w(c=>{c.traits=["quick"];})===plain-1,"Quick study takes a week off");
check(w(c=>{c.tech="linguist";})===plain-1,"so does being a Linguist");
const best=w(c=>{c.attrs.brains=90;c.traits=["quick"];c.tech="linguist";});
check(best===Math.max(TUTOR.floor,plain-3),"all three together: "+best+" weeks");
const bestNear=w(c=>{c.attrs.brains=90;c.traits=["quick"];c.tech="linguist";},"Spanish");
check(bestNear===TUTOR.floor,"and on a near one it hits the floor at "+TUTOR.floor+" weeks, never less");
check(tutorWeeks(fr,"Japanese").why.length>=1,"and the screen is told why, not just how long");

/* ================= the gate ================= */
console.log("\n— who can be sent —");
const c1=S.roster.find(x=>x.status==="available"&&x.id!==fr.id);
check(canTutor(c1),"somebody not on the crew cannot: \""+canTutor(c1)+"\"");
c1.status="crew";S.crewIds.push(c1.id);
check(!canTutor(c1),"on the crew, they can — whatever their rank, because nothing is given up");
check(c1.exp>=1,"including a "+EXP[c1.exp-1]+", who a trade school would turn away");
c1.status="injured";c1.out=S.week+2;
check(/injured/.test(canTutor(c1)),"the injured cannot: \""+canTutor(c1)+"\"");
c1.status="crew";c1.out=0;

/* ================= sending them ================= */
console.log("\n— the weeks are the price —");
// Somebody's limits can bar them from every country that speaks a language — which is a real
// state of the game, and a language they could never use is the wrong one to measure the point of
// the feature with. So the one we send them for is one they can actually go and use.
const mkJob=n=>({country:n,city:(COUNTRY_BY_NAME[n].cities||["x"])[0],cat:"vault",tags:[],know:[],techs:[],need:1,limits:[],tier:1,weeks:1,id:"T1"});
const spoken=(c1.langs||[]).slice();
const usable=tutorOptions(c1).filter(o=>o.countries.some(n=>entry(c1,mkJob(n),false).ok
  && !(COUNTRY_BY_NAME[n].langs||[]).some(l=>l!==o.l&&spoken.indexOf(l)>=0)));
check(usable.length>0,usable.length+" of the languages open a country this one will go to and cannot already talk in");
const target=usable[0];
check(target,"there is something to teach them: "+(target&&target.l));
const openTo=target.countries.find(n=>entry(c1,mkJob(n),false).ok
  && !(COUNTRY_BY_NAME[n].langs||[]).some(l=>l!==target.l&&spoken.indexOf(l)>=0));
check(openTo,c1.first+" can get into "+openTo+" today");
const before={money:S.money,langs:(c1.langs||[]).slice(),loy:c1.loyalty};
const r=tutorStart(c1,target.l);
check(before.money-S.money===target.cost,"the money goes today: "+money(target.cost));
check(c1.status==="learning","and they are out of the field");
check(c1.out===S.week+target.weeks,"until week "+c1.out+" — "+target.weeks+" weeks");
check(!!c1.tutor&&c1.tutor.to===target.l,"the file says what they are at: "+c1.tutor.to);
// A country this one could walk into a minute ago, so what bars them now is the school and not a
// passport or a limit — otherwise the check passes on the wrong reason.
const gate=entry(c1,mkJob(openTo),false);
check(gate.ok===false&&/learning/.test(gate.why),"and cannot be sent on a job in "+openTo+", which they could a minute ago: \""+gate.why+"\"");
check(gate.why.indexOf(target.l)>=0,"which says which school they are at, not \"a trade\"");
check((c1.langs||[]).indexOf(target.l)<0,"they do not speak it yet");
// the payroll does not charge somebody who is not on the crew — same as the trade school
const rc=payroll().filter(x=>x.status==="crew");
check(!rc.some(x=>x.id===c1.id),"and draw no upkeep while they are at it, like the trade school");
// and nobody is at two schools at once
check(canTutor(c1)&&/school|field/.test(canTutor(c1)),"nobody is at two schools at once: \""+canTutor(c1)+"\"");
check(canLearn(c1)&&/not on the crew|field/.test(canLearn(c1)),"nor at a language school and a trade school: \""+canLearn(c1)+"\"");

console.log("\n— and what comes back —");
S.week=c1.out;
tutorFinish(c1);
check((c1.langs||[]).indexOf(target.l)>=0,"they speak "+target.l+" now: "+c1.langs.join(", "));
check(c1.status==="crew"&&!c1.tutor,"and are back in the field");
check(c1.loyalty===clamp(before.loy+TUTOR.loyalty,0,100),"loyalty +"+TUTOR.loyalty+" — you spent money making them better ("+before.loy+" → "+c1.loyalty+")");

/* ================= which is the whole point ================= */
console.log("\n— what the language is actually for —");
// A country whose language the new speaker now has AND can actually get into — somebody with a
// limit against the place is kept out by entry(), the team comes back empty, and the test would be
// measuring an empty room rather than a language.
// And a country where the NEW language is the only one of theirs that fits. Morocco speaks Arabic
// and French: teach somebody Arabic who already spoke French and the country was never shut to
// them, so the before-and-after would be six points against six points and prove nothing.
const co=COUNTRIES.filter(x=>(x.langs||[]).indexOf(target.l)>=0)
  .filter(x=>!(x.langs||[]).some(l=>l!==target.l&&before.langs.indexOf(l)>=0))
  .find(x=>entry(c1,mkJob(x.name),false).ok);
check(co,target.l+" is spoken somewhere "+c1.first+" will go: "+(co&&co.name));
const job=mkJob(co.name);
const score=team=>{const a=assessJob(job,team,null);
  return a.factors.find(f=>f.k==="Language"||/^No /.test(f.k));};
const withIt=score([c1]);
check(withIt&&withIt.k==="Language"&&withIt.v===6,
  "with "+target.l+" on the team the night is +6: \""+withIt.k+" "+withIt.v+"\"");
// The same person, with only the languages they had before the school.
const mute=Object.assign({},c1,{langs:before.langs.slice()});
const without=score([mute]);
check(without&&/^No /.test(without.k)&&without.v<0,
  "and the same person before the school: "+without.v+" (\""+without.k+"\")");
check(withIt.v-without.v>=14,"a swing of "+(withIt.v-without.v)+" points on every job in "+co.name+", bought once for "+money(target.cost));

/* ================= it survives a reload ================= */
console.log("\n— and none of it evaporates on reload —");
const id=c1.id,tech0=c1.tech;
save();
S=null;load();
const after=byId(id);
check((after.langs||[]).indexOf(target.l)>=0,"the language is still there after a reload");
check(after.tech===tech0,"and so is the trade — which it was NOT before this build");
// somebody mid-school comes back mid-school
const c2=S.roster.find(x=>x.status==="available");
c2.status="crew";S.crewIds.push(c2.id);
const t2=tutorOptions(c2)[0];
tutorStart(c2,t2.l);
const id2=c2.id,out2=c2.out;
save();S=null;load();
const a2=byId(id2);
check(a2.status==="learning"&&a2.out===out2,"somebody sent to a school is still at it after a reload, back week "+a2.out);
check(a2.tutor&&a2.tutor.to===t2.l,"and the file still says which one: "+(a2.tutor&&a2.tutor.to));

console.log(fails?"\n"+fails+" FAILED":"\nALL OK");
process.exit(fails?1:0);

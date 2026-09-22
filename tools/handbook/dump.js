/* Loads the game's own script in a VM with a stubbed DOM and writes gamedata.json, so the
   handbook's tables are the game's constants rather than a description of them.
   Usage: node dump.js [path to the game's html]   (default ../../play.html) */
const fs=require("fs");const vm=require("vm");const path=require("path");
const GAME=process.argv[2]||path.join(__dirname,"..","..","play.html");
const html=fs.readFileSync(GAME,"utf8");
const a=html.indexOf("<script>"),b=html.lastIndexOf("</"+"script>");
if(a<0||b<a)throw new Error("no <script> block in "+GAME);
const src=html.slice(a+8,b);
const ELS={};
function mkEl(id){const el={id,style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false;},toggle(){}},children:[],dataset:{},innerHTML:"",value:"",textContent:"",hidden:false,scrollTop:0,scrollHeight:0,setAttribute(){},getAttribute(){return null;},appendChild(){},insertAdjacentHTML(p,h){el.innerHTML+=h;},querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){},removeEventListener(){},getBoundingClientRect(){return{left:0,top:0,width:100,height:100,right:100,bottom:100};},focus(){},select(){},play(){return Promise.resolve();},pause(){},load(){},scrollIntoView(){},closest(){return null;},remove(){},contains(){return false;},setSelectionRange(){},paused:true,volume:1,loop:false,src:""};return el;}
global.store={};
global.localStorage={getItem:k=>store[k]===undefined?null:store[k],setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}};
global.document={getElementById:id=>ELS[id]||(ELS[id]=mkEl(id)),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},createElement:t=>mkEl(t),body:mkEl("body"),documentElement:mkEl("html"),head:mkEl("head"),hidden:false};
global.window={matchMedia:()=>({matches:false}),addEventListener(){},scrollTo(){},innerWidth:1200,innerHeight:800,localStorage:global.localStorage,document:global.document,location:{href:"",search:""},navigator:{language:"en"}};
global.navigator={language:"en"};global.requestAnimationFrame=()=>0;global.Audio=function(){return mkEl("audio");};
global.fetch=()=>Promise.reject(new Error("x"));global.URL=global.URL||{};global.URL.createObjectURL=()=>"blob:x";
global.scrollTo=()=>{};global.setInterval=()=>1;global.clearInterval=()=>{};
vm.runInThisContext(src,{filename:"dump.js"});
const out={
  ATTRS, ATTR_ABBR, ATTR_LABEL: (typeof ATTR_LABEL!=="undefined"?ATTR_LABEL:null),
  TECHS, EXP, EDU, KNOW:(typeof KNOW!=="undefined"?KNOW:null),
  TECHS_BIG:(typeof TECHS_BIG!=="undefined"?TECHS_BIG:null),
  TECHS_ALL:(typeof TECHS_ALL!=="undefined"?TECHS_ALL:null),
  TECH_SITE:(typeof TECH_SITE!=="undefined"?TECH_SITE:null),
  BIG_CATS:(typeof BIG_CATS!=="undefined"?BIG_CATS:null),
  BIG_CLIENTS:(typeof BIG_CLIENTS!=="undefined"?BIG_CLIENTS:null),
  ROSTER_CORE:(typeof ROSTER_CORE!=="undefined"?ROSTER_CORE:null),
  ROSTER_BIG:(typeof ROSTER_BIG!=="undefined"?ROSTER_BIG:null),
  ROSTER_SIZE:(typeof ROSTER_SIZE!=="undefined"?ROSTER_SIZE:null),
  LIMITS:(typeof LIMITS!=="undefined"?LIMITS:null),
  TRAITS, RANKS, BAL, CATS:(typeof CATS!=="undefined"?CATS:null),
  CATEGORIES:(typeof CATEGORIES!=="undefined"?CATEGORIES:null),
  GOALS:(typeof GOALS!=="undefined"?GOALS.map(g=>({k:g.k,l:g.l,d:g.d,rep:g.rep,money:g.money})):null),
  RETAINERS, SAFEHOUSES, CLIENTS:(typeof CLIENTS!=="undefined"?CLIENTS:null),
  COUNTRIES:(typeof COUNTRIES!=="undefined"?COUNTRIES.length:null),
  TAG_LABEL:(typeof TAG_LABEL!=="undefined"?TAG_LABEL:null),
  SITES:(typeof SITES!=="undefined"?SITES:null),
  TRIP_SITES:(typeof TRIP_SITES!=="undefined"?TRIP_SITES:null),
  GRUDGE:(typeof GRUDGE!=="undefined"?GRUDGE:null),
  LOOSE_WHY:(typeof LOOSE_WHY!=="undefined"?LOOSE_WHY:null),
  STREET:(typeof STREET!=="undefined"?STREET:null),
  // An event's words can depend on who it landed on — the blackmail reads off how that person
  // left. JSON has no function, so ask it for the case where nothing is known about them, which is
  // the general sentence the book is describing anyway.
  WEEKLY:(typeof WEEKLY!=="undefined"?WEEKLY.map(w=>({k:w.k,h:w.h,
    text:typeof w.text==="function"?w.text(null,{}):w.text,opts:w.opts.map(o=>o.t)})):null),
  FAKED_DEATH:(typeof FAKED_DEATH!=="undefined"?FAKED_DEATH:null),
  TUTOR:(typeof TUTOR!=="undefined"?TUTOR:null),
  BIG_MONEY:(typeof BIG_MONEY!=="undefined"?BIG_MONEY:null),
  BIG_THIRD:(typeof BIG_THIRD!=="undefined"?BIG_THIRD:null),
  LANG_FAMILY:(typeof LANG_FAMILY!=="undefined"?LANG_FAMILY:null),
  SPEEDS:(typeof SPEEDS!=="undefined"?SPEEDS:null),
  VET_COST:(typeof VET_COST!=="undefined"?VET_COST:null),
  TECH_BONUS:(typeof TECH_BONUS!=="undefined"?TECH_BONUS:null),
  TECH_BONUS_2:(typeof TECH_BONUS_2!=="undefined"?TECH_BONUS_2:null),
  TRADE_COVER:(typeof TRADE_COVER!=="undefined"?TRADE_COVER:null),
  KNOW_BONUS:(typeof KNOW_BONUS!=="undefined"?KNOW_BONUS:null),
  KNOW_SCHOOLED:(typeof KNOW_SCHOOLED!=="undefined"?KNOW_SCHOOLED:null),
  KNOW_MISSING:(typeof KNOW_MISSING!=="undefined"?KNOW_MISSING:null),
  LANG_BONUS:(typeof LANG_BONUS!=="undefined"?LANG_BONUS:null),
  LANG_MISS:(typeof LANG_MISS!=="undefined"?LANG_MISS:null),
  LANG_MISS_TALK:(typeof LANG_MISS_TALK!=="undefined"?LANG_MISS_TALK:null),
  HIRED:(typeof HIRED!=="undefined"?HIRED:null),
  RIVAL:(typeof RIVAL!=="undefined"?RIVAL:null),
  ELIM:(typeof ELIM!=="undefined"?ELIM:null),
  // The count, not the table: a hundred openings is a mechanic the book describes, not a list a
  // reader wants printed — and printing them would hand over every surprise in the chapter.
  ELIM_OPENINGS:(typeof ELIM_OPENINGS!=="undefined"?ELIM_OPENINGS.length:null),
  CITY_COUNT:(typeof CITY_COUNT!=="undefined"?CITY_COUNT:null),
  LANDMARK_COUNT:(typeof LANDMARK_COUNT!=="undefined"?LANDMARK_COUNT:null),
  // City and the name of the thing, in the table's own order, which runs by region rather than
  // by alphabet. The drawings themselves are not dumped: a printed book cannot use them.
  LANDMARKS:(typeof LANDMARKS!=="undefined"
    ?Object.keys(LANDMARKS).map(k=>({city:k,name:LANDMARKS[k].name})):null),
  PAID_WEEKS:(typeof PAID_WEEKS!=="undefined"?PAID_WEEKS:null),
  CREW_MAX_SEATS:(typeof CREW_MAX_SEATS!=="undefined"?CREW_MAX_SEATS:null),
  EXTRA_CREW_SIZE:(typeof EXTRA_CREW_SIZE!=="undefined"?EXTRA_CREW_SIZE:null),
  EXTRA_CREW_REP:(typeof EXTRA_CREW_REP!=="undefined"?EXTRA_CREW_REP:null),
  EXTRA_CREW_WEEKS:(typeof EXTRA_CREW_WEEKS!=="undefined"?EXTRA_CREW_WEEKS:null),
  JOKER:(typeof JOKER!=="undefined"?JOKER:null),
  FM_TECH_GLYPH:(typeof FM_TECH_GLYPH!=="undefined"?FM_TECH_GLYPH:null),
  BUILD:(typeof BUILD!=="undefined"?BUILD:null),
  // The five on the cover. A printed book has the same faces every time, so they are drawn once
  // here from a fixed seed — by the game's own face builder, not a picture of one.
  COVER_FACES:(function(){
    if(typeof randomFace!=="function"||typeof avatar!=="function")return null;
    const r=mulberry32(0x0C0FACE);
    return [0,1,2,3,4].map(()=>{
      const gender=r()<0.5?"M":"F";
      return avatar(Math.floor(r()*1e9),gender,randomFace(r,gender));
    });
  })(),
};
fs.writeFileSync(path.join(__dirname,"gamedata.json"),JSON.stringify(out,null,1));
console.log("dumped. keys with data:");
Object.keys(out).forEach(k=>{const v=out[k];console.log("  "+k+": "+(v==null?"MISSING":(Array.isArray(v)?v.length+" entries":typeof v==="object"?Object.keys(v).length+" keys":String(v))));});

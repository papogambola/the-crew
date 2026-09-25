// The anthem on the establishing card.
//
// Eight notes of the country's own tune, synthesised rather than recorded — forty-nine embedded
// mp3s would be several megabytes on a file that has to arrive before anybody can play, and a
// melody written as note names costs eighty bytes.
//
// WHAT THIS IS REALLY WATCHING FOR: a typo in the table is SILENT. anthemNotes() skips any token
// it cannot parse, so "Bb44" or "H4" or a stray comma does not throw, does not warn, and does not
// show up anywhere — the note simply is not played, and the anthem quietly loses a beat that
// nobody will notice until they know the tune and something sounds wrong. So every entry is
// counted: tokens in, notes out, and they have to match.
//
// It also prints how many of the game's countries have no tune yet, because that gap should be a
// number somebody can read rather than something found out by playing to Jakarta in silence.
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

console.log("— the notes parse to what was written —");

// A4 is 440 by definition, and everything else is measured off it. If this is wrong, every
// anthem is in the wrong key and all of them are wrong together, which is the one failure that
// would sound deliberate.
check(Math.abs(anthemHz("A4")-440)<0.01,"A4 is 440 Hz");
check(Math.abs(anthemHz("C4")-261.626)<0.01,"C4 is 261.63 Hz — middle C, so C4 means what it says");
check(Math.abs(anthemHz("A5")-880)<0.01,"an octave up doubles it");
check(Math.abs(anthemHz("A3")-220)<0.01,"and an octave down halves it");
check(Math.abs(anthemHz("F#4")-anthemHz("Gb4"))<0.01,"F# and Gb are the same note");
check(anthemHz("H4")===0,"a note name that does not exist is refused rather than guessed");
check(anthemHz("A")===0,"and so is one with no octave on it");

// The rest and the beat, which are what make it a tune rather than a run of pitches.
const r=anthemNotes("C4 - C4");
check(r.length===2,"a rest is a gap, not a note");
check(Math.abs(r[1].at-r[0].at-2*(ANTHEM_BEAT/1000))<1e-9,"and it takes up its own beat");
const d=anthemNotes("C4:2 D4");
check(Math.abs(d[1].at-2*(ANTHEM_BEAT/1000))<1e-9,"a note of two beats delays the next by two");
check(Math.abs(d[0].dur-2*(ANTHEM_BEAT/1000))<1e-9,"and lasts that long itself");
check(anthemNotes("").length===0,"nothing parses to nothing rather than throwing");

console.log("\n— every anthem in the table —");

const names=Object.keys(ANTHEMS);
check(names.length>0,"there are some: "+names.length);
let bad=0;
names.forEach(n=>{
  const toks=ANTHEMS[n].trim().split(/\s+/);
  const rests=toks.filter(t=>t.split(":")[0]==="-").length;
  const got=anthemNotes(ANTHEMS[n]).length;
  if(got!==toks.length-rests){
    console.error("FAIL: "+n+" — "+(toks.length-rests)+" notes written, "+got+" parsed. A token in it is misspelt.");
    bad++;fails++;
  }
});
check(bad===0,"every note in every anthem parses — no silent drops");

// A tune nobody can hear is a tune nobody wrote. Eight notes at most was the brief; one note is
// not a phrase.
names.forEach(n=>{
  const ns=anthemNotes(ANTHEMS[n]);
  if(ns.length<3||ns.length>12){console.error("FAIL: "+n+" has "+ns.length+" notes — the brief was a short phrase");fails++;}
  const end=ns.length?ns[ns.length-1].at+ns[ns.length-1].dur:0;
  if(end>4.5){console.error("FAIL: "+n+" runs "+end.toFixed(1)+"s, and the card is only "+(ESTAB_MS/1000)+"s");fails++;}
});
check(true,"and each is a phrase, inside the card's "+(ESTAB_MS/1000)+" seconds");

console.log("\n— every country the game can send you to —");
const missing=anthemsMissing();
const total=COUNTRIES.length;
check(true,(total-missing.length)+" of "+total+" countries have a tune");
if(missing.length)console.log("    no tune yet: "+missing.join(", "));

// The one thing that must never happen: a country with no entry must be silent, not noisy.
check(anthemStart("Atlantis")===false,"a country with no tune plays nothing rather than improvising");

console.log(fails?("\n"+fails+" FAILED"):"\nALL OK");
process.exit(fails?1:0);

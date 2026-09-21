/* Draws the five faces under the logo on the front page, and writes them into index.html.

       node tools/lineup.js            # writes index.html
       node tools/lineup.js --check    # exits 1 if index.html is out of date

   The game's title screen has had a line-up of five under the logo since it was built, and the
   handbook's cover has the same five. The front page — the first thing anybody sees, and the
   only one of the three a stranger arrives at — had a logo and nothing under it. That is the
   one place the game does not look like itself.

   They are THE SAME FIVE as the cover, from the same fixed seed, because they are the line-up:
   a book, a page and a tab that each show a different five are three products. (The title
   screen inside the game rolls fresh ones every time it opens, and that is deliberate and
   different — in there it means "the crew you have not hired yet", and it should never be the
   same five twice.)

   Generated rather than pasted, for the reason every other artefact here is: they come out of
   avatarBody() and the face parts, so if the way the game draws a person changes, this is one
   command rather than five blocks of SVG somebody has to notice are wrong. --check runs in the
   suite and fails if it drifts. */
const fs=require("fs");
const path=require("path");
const vm=require("vm");

const GAME=path.join(__dirname,"..","play.html");
const PAGE=path.join(__dirname,"..","index.html");
const html=fs.readFileSync(GAME,"utf8");

/* ---- load the game's script with a stubbed DOM, the same way favicon.js does ---- */
const a=html.indexOf("<script>"),b=html.lastIndexOf("</"+"script>");
if(a<0||b<a)throw new Error("no <script> block in play.html");
const mk=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains:()=>false,
  toggle(){}},children:[],dataset:{},innerHTML:"",value:"",textContent:"",setAttribute(){},getAttribute:()=>null,
  appendChild(){},insertAdjacentHTML(){},querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},
  getBoundingClientRect:()=>({width:100,height:100}),focus(){},closest:()=>null});
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
global.document={getElementById:mk,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},
  createElement:mk,createRange:()=>({selectNodeContents(){},getBoundingClientRect:()=>({width:0})}),
  body:mk(),documentElement:mk(),head:mk()};
global.window={matchMedia:()=>({matches:false}),addEventListener(){},location:{href:"",search:""},
  navigator:{language:"en"},getComputedStyle:()=>({fontSize:"100px"})};
global.getComputedStyle=()=>({fontSize:"100px"});
global.navigator={language:"en"};global.requestAnimationFrame=()=>0;
global.Audio=function(){return mk();};global.fetch=()=>Promise.reject(new Error("x"));
global.setInterval=()=>1;global.clearInterval=()=>{};global.scrollTo=()=>{};
vm.runInThisContext(html.slice(a+8,b),{filename:"lineup.js"});

/* ---- the five ---- */
// The cover's seed, drawn the cover's way, so the page and the book show the same people.
// dump.js does exactly this for the handbook; the sequence has to match or they diverge.
const SEED=0x0C0FACE;
const r=mulberry32(SEED);
const faces=[0,1,2,3,4].map(()=>{
  const gender=r()<0.5?"M":"F";
  return avatar(Math.floor(r()*1e9),gender,randomFace(r,gender));
});

// aria-hidden, and no names under them: they are the mark, not information. A screen reader
// reading five unnamed portraits out between the logo and the sentence that says what the game
// is would be reading furniture.
const block='<div class="lineup" aria-hidden="true">'
  +faces.map(svg=>'<div class="lu">'+svg+'</div>').join("")
  +'</div>';

const OPEN="<!-- lineup.js -->", CLOSE="<!-- /lineup.js -->";
const page=fs.readFileSync(PAGE,"utf8");
const i=page.indexOf(OPEN), j=page.indexOf(CLOSE);
if(i<0||j<i)throw new Error("index.html has no "+OPEN+" … "+CLOSE+" pair to write into");
const out=page.slice(0,i+OPEN.length)+block+page.slice(j);

if(process.argv.indexOf("--check")>=0){
  const same=out===page;
  console.log(same?"the line-up on index.html is up to date":"LINE-UP IS STALE — run: node tools/lineup.js");
  process.exit(same?0:1);
}
fs.writeFileSync(PAGE,out);
console.log("line-up written: five faces, "+block.length+" bytes");

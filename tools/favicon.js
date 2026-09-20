/* Regenerates the game's favicon and writes it into play.html.

   The icon is one of the crew — drawn by the game's own face builder rather than traced by hand,
   so it is the same ink as every dossier on the roster and it cannot drift away from the way the
   game draws people. Run it after changing avatarBody() or the face parts:

       node tools/favicon.js            # writes play.html
       node tools/favicon.js --check    # exits 1 if play.html is out of date

   The framing is the decision that mattered. A favicon is read at 16px, and the whole bust at
   that size is a black smudge with a speck of face on top — so it is cropped to the head, the
   shoulders and nothing else. */
const fs=require("fs");
const path=require("path");
const vm=require("vm");

const GAME=path.join(__dirname,"..","play.html");
const html=fs.readFileSync(GAME,"utf8");

/* ---- load the game's script with a stubbed DOM, the same way dump.js does ---- */
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
vm.runInThisContext(html.slice(a+8,b),{filename:"favicon.js"});

/* ---- who is on the icon ---- */
/* Spiked hair, heavy brows over wide eyes, a long nose, a mouth that is not pleased, ears tucked
   in. Every one of these is an option on the dossier screen, so this is a face somebody could
   actually be handed on the roster, not a drawing that only exists here. */
const FACE={hair:4,shape:4,brow:4,eye:4,nose:3,mouth:2,ear:3,glasses:0,fh:0,scar:0};
const SEED=4242;
const VIEW="6 20 88 88";          /* head and shoulders, square, cropped to read at 16px */
const PAPER="#f6f4ee";

const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+VIEW+'">'
  +'<rect x="-100" y="-100" width="400" height="400" fill="'+PAPER+'"/>'
  +avatarBody(SEED,"M",normFace(FACE,"M"))
  +'</svg>';
/* base64 rather than percent-encoding: the face builder's output is full of quotes, and one
   unescaped character in an href is a favicon that silently does not load. */
const href="data:image/svg+xml;base64,"+Buffer.from(svg,"utf8").toString("base64");
const line='<link rel="icon" href="'+href+'">';

const re=/<link rel="icon" href="[^"]*">/;
if(!re.test(html))throw new Error('no <link rel="icon"> in play.html');
const out=html.replace(re,line);

if(process.argv.indexOf("--check")>=0){
  const same=out===html;
  console.log(same?"favicon is up to date":"FAVICON IS STALE — run: node tools/favicon.js");
  process.exit(same?0:1);
}
fs.writeFileSync(GAME,out);
console.log("favicon written: "+svg.length+" bytes of svg, "+href.length+" in the href");

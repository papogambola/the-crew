/* WHERE EVERYTHING IS.

   The suite grew up in a scratch directory next to a copy of the game, so every file in it knew
   exactly where Playwright lived, where Chromium lived, and where play.html lived — as absolute
   paths typed into eighty-eight files. That was fine for as long as the suite only ever ran on
   the one machine it was written on, which is also the reason it very nearly did not survive to
   be run anywhere else.

   Now there is one place that knows, and it works out the answers rather than being told them:

     ROOT    the repository, which is simply the directory above this one
     GAME    the game, which is play.html in it — the thing under test
     chromium / CHROME
             the browser. Both are overridable by environment variable, because the paths a
             container happens to use are not a fact about this project: set PLAYWRIGHT_DIR and
             CHROME_PATH if yours are elsewhere. The defaults are what the dev container ships.

   If the browser cannot be found this throws with the two variable names in the message, which
   is a better morning than sixty separate MODULE_NOT_FOUND traces. */
const fs=require("fs"), path=require("path");

const ROOT=path.resolve(__dirname,"..");
const GAME=path.join(ROOT,"play.html");

const PW_DIR=process.env.PLAYWRIGHT_DIR||"/opt/node22/lib/node_modules/playwright";
const CHROME=process.env.CHROME_PATH||"/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

let pw=null;
try{ pw=require(PW_DIR); }
catch(e){
  try{ pw=require("playwright"); }        // if it is installed the ordinary way, use that
  catch(e2){
    throw new Error(
      "Playwright not found. Tried "+PW_DIR+" and the usual resolution.\n"+
      "Set PLAYWRIGHT_DIR to where it lives, or npm i -D playwright.");
  }
}
if(!fs.existsSync(CHROME)){
  // Not fatal at require time — a node-only suite does not need a browser — but say so once
  // rather than letting sixty drives each fail with their own executablePath error.
  if(!process.env.THECREW_QUIET_BROWSER)
    console.error("note: no browser at "+CHROME+" — set CHROME_PATH if it is elsewhere");
}

/* EXTRA BROWSER FLAGS, IN ONE PLACE AND ONLY WHEN ASKED FOR.

   Sixty files call chromium.launch({executablePath:CHROME}) and none of them should have to know
   what machine they are on. So the launcher is wrapped rather than the sixty edited: anything in
   CHROME_ARGS is merged into every launch, and with the variable unset nothing changes at all.

   It exists because of browser16, which checks that the music loop is playing and was red here
   for months under the explanation "no route to Cloudflare R2". That was wrong. curl fetches the
   track from this container perfectly well (HTTP 206, audio/mpeg). What actually fails is that
   outbound HTTPS is re-terminated at a sandbox proxy whose CA the browser does not trust, so the
   mp3 request dies on the certificate and the loop never starts. With the CA trusted, the music
   plays — from file:// and from the live site alike.

   The flag that does it is per-container, not a fact about this project, so it is not written
   down here. In a proxied sandbox, pin trust to that proxy's CA by its public key:

     CHROME_ARGS="--ignore-certificate-errors-spki-list=<base64 sha256 of the CA's SPKI>" ./tests/suite.sh

   Pin it. Do not reach for --ignore-certificate-errors, which accepts any certificate from
   anybody and turns every test that touches the network into a test of nothing. */
const ARGS=(process.env.CHROME_ARGS||"").split(/\s+/).filter(Boolean);
const chromium=ARGS.length?Object.create(pw.chromium,{launch:{value:function(opts){
  opts=Object.assign({},opts);
  opts.args=(opts.args||[]).concat(ARGS);
  return pw.chromium.launch(opts);
}}}):pw.chromium;

module.exports={chromium, pw, ROOT, GAME, CHROME, PW_DIR, ARGS};

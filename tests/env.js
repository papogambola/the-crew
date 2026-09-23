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

module.exports={chromium:pw.chromium, pw, ROOT, GAME, CHROME, PW_DIR};

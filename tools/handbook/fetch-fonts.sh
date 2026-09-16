#!/bin/sh
# The four faces the handbook uses, fetched once into fonts/ so the PDF renders with them.
# Chromium cannot always reach fonts.googleapis.com from a build container; curl can, and a
# self-contained PDF is better than one that depends on the network anyway.
set -e
cd "$(dirname "$0")"
mkdir -p fonts
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
curl -sS -A "$UA" "https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@500;600;700&family=Spectral:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap" -o gf.css
node -e '
const fs=require("fs");
const css=fs.readFileSync("gf.css","utf8");
const blocks=css.split("@font-face").slice(1).map(b=>"@font-face"+b.slice(0,b.indexOf("}")+1));
const latin=blocks.filter(b=>/unicode-range: U\+0000-00FF/.test(b));
const urls=[];
const out=latin.map((b,i)=>b.replace(/url\((https:[^)]+)\)/,(m,u)=>{const f="f"+i+".woff2";urls.push(u+" "+f);return "url(fonts/"+f+")";})).join("\n");
fs.writeFileSync("fonts-local.css",out);
fs.writeFileSync("fonts.list",urls.join("\n")+"\n");
console.log(urls.length+" faces");
'
while read -r u f; do [ -n "$f" ] && curl -sS -o "fonts/$f" "$u"; done < fonts.list
ls fonts | wc -l

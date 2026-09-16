#!/bin/sh
# Build, render, read the real page numbers back, and repeat until the index stops moving.
set -e
cd "$(dirname "$0")"
i=0
while [ $i -lt 5 ]; do
  i=$((i+1))
  cp -f pages.json pages.prev.json 2>/dev/null || echo '{}' > pages.prev.json
  node hb-build.js > /dev/null
  node hb-pdf.js > /dev/null 2>&1
  python3 hb-pages.py | head -3
  if node -e "
    const a=require('./pages.prev.json'),b=require('./pages.json');
    const d=Object.keys(b).filter(k=>a[k]!==b[k]);
    if(d.length){console.log('  pass $i: '+d.length+' moved');process.exit(1);}
    console.log('  pass $i: converged');
  "; then
    node hb-build.js > /dev/null    # one last build so handbook.html carries the final numbers
    exit 0
  fi
done
echo "did not converge"; exit 1

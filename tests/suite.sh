#!/bin/bash
# The whole suite. Node checks first, then the browser drives.
#
# Every suite starts a game, and newGame() seeds the world from Date.now() — so each run is a
# different roster, a different board, and a different set of coincidences. A single red run
# therefore does not mean a regression. Anything that fails is re-run RETRIES times and reported
# as a rate, because "failed 5 of 5" and "failed 1 of 5" are different problems with different
# fixes: the first is a regression, the second is a test that hopes instead of arranging.
cd "$(dirname "$0")"
# The game under test is the one in the repository above this directory. It was a COPY when the
# suite lived in a scratch folder, which meant every run started by remembering to re-copy it —
# and a run against a stale copy is worse than no run, because it reports green about a file
# nobody is going to ship. Override with GAME=… to point somewhere else.
GAME="${GAME:-../play.html}"
RETRIES="${RETRIES:-4}"
sed -n '/^<script>$/,/^<\/script>$/p' "$GAME" | sed '1d;$d' > thecrew_check.js
node --check thecrew_check.js || exit 1

# TWO THINGS IN THIS FILE CANNOT BE CALLED THE SAME NAME.
#
# The game is one script of ten thousand lines in sloppy mode, so a second `function foo(){}`
# is legal, silent, and WINS — it hoists over the whole file and the last one takes every
# caller the first one had. That is not a style complaint. signed() was written twice, the two
# differed in exactly one case (zero), and the second copy quietly turned "0" into "+0"
# everywhere the first had been used: the bond log, a night that moved nothing, a hired hand
# worth nothing either way. It shipped, and nothing here noticed, because nothing here looked.
#
# `node --check` will not catch this. A linter would, and there isn't one. So: count them.
node -e '
const src=require("fs").readFileSync("thecrew_check.js","utf8");
const at={},dup=[];
const re=/^(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=)/gm;
let m;while((m=re.exec(src))){
  const n=m[1]||m[2], line=src.slice(0,m.index).split("\n").length;
  if(at[n])dup.push(n+" (lines "+at[n]+" and "+line+")");else at[n]=line;}
if(dup.length){console.error("DUPLICATE TOP-LEVEL DECLARATIONS — the later one wins, silently:");
  dup.forEach(d=>console.error("  "+d));process.exit(1);}
console.log("no name in the game is declared twice ("+Object.keys(at).length+" checked)");
' || exit 1

# The favicon is generated from the game's own face builder. If avatarBody() or the face parts
# change, the icon in the tab quietly stops being what the code draws — so the generator is asked
# whether what is in the file is still what it would produce.
if [ -f ../tools/favicon.js ]; then
  node ../tools/favicon.js --check || echo "  (the icon in play.html is stale)"
fi
# The five faces under the logo on the front page come out of the same builder, and go stale the
# same way — silently, in the one file a stranger sees first.
if [ -f ../tools/lineup.js ]; then
  node ../tools/lineup.js --check || echo "  (the line-up on index.html is stale)"
fi

shaky=(); broken=()
# Re-run a suite RETRIES times and print how many runs were bad. A run is bad if it printed a
# FAIL, or if it produced no assertions at all (a crash). Node suites end with ALL OK; browser
# drives print no summary line, so do NOT look for one — an earlier version did, and counted
# every passing browser drive as a failure, which made the whole flake/regression split a lie.
rerun(){
  local bad=0 out rc
  for _ in $(seq "$RETRIES"); do
    out=$("$@" 2>&1); rc=$?
    if echo "$out" | grep -q "^FAIL"; then bad=$((bad+1))
    elif [ "$rc" != 0 ]; then bad=$((bad+1))
    elif [ "$(echo "$out" | grep -c "^ok  ")" = 0 ]; then bad=$((bad+1)); fi
  done
  echo "$bad"
}

echo "— node suites —"
for f in smoke*.js; do
  out=$(node "$f" 2>&1); rc=$?
  if echo "$out" | grep -q "^FAIL" || [ "$rc" != 0 ] || ! echo "$out" | grep -q "ALL OK"; then
    why=$(echo "$out" | grep "^FAIL" | head -1)
    n=$(rerun node "$f")
    if [ "$n" = "$RETRIES" ]; then broken+=("$f  $why"); else shaky+=("$f  $n/$RETRIES  $why"); fi
    printf "%-12s FAILED, %s of %s on re-run\n" "$f" "$n" "$RETRIES"
  fi
done

echo "— browser drives —"
tot=0
for f in browser*.js; do
  out=$(node "$f" "$GAME" 2>&1); rc=$?
  ok=$(echo "$out" | grep -c "^ok  "); bad=$(echo "$out" | grep -c "^FAIL")
  tot=$((tot+ok+bad))
  printf "%-12s %3d ok%s%s\n" "$f" "$ok" "$([ "$bad" != 0 ] && echo "  $bad FAIL" || echo '')" \
    "$([ "$rc" != 0 ] && echo "  DIED (exit $rc)" || echo '')"
  if [ "$bad" != 0 ] || [ "$rc" != 0 ]; then
    why=$(echo "$out" | grep "^FAIL" | head -1)
    [ -z "$why" ] && why="died partway with no failure printed — $(echo "$out" | grep -E "Error|error:" | head -1)"
    n=$(rerun node "$f" "$GAME")
    if [ "$n" = "$RETRIES" ]; then broken+=("$f  $why"); else shaky+=("$f  $n/$RETRIES  $why"); fi
    printf "             re-ran: failed %s of %s\n" "$n" "$RETRIES"
  fi
done

echo
echo "---- $tot browser assertions ----"
if [ ${#broken[@]} != 0 ]; then
  echo "REGRESSIONS (failed every re-run):"; printf '  %s\n' "${broken[@]}"
fi
if [ ${#shaky[@]} != 0 ]; then
  echo "INTERMITTENT (a test that depends on the world it happened to get):"; printf '  %s\n' "${shaky[@]}"
fi
[ ${#broken[@]} = 0 ] && [ ${#shaky[@]} = 0 ] && echo "GREEN"
[ ${#broken[@]} = 0 ] || exit 1

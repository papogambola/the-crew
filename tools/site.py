#!/usr/bin/env python3
"""Stamp the front page with the things it claims about the game.

    python3 tools/site.py            # rewrite index.html
    python3 tools/site.py --check    # exit 1 if it is out of date, change nothing

index.html names a build, wears the game's own favicon so the tab does not change character
between the page and the thing behind it, and points at four screenshots. Every one of those is
a fact about a file sitting next to it, and a fact typed by hand goes stale — a page advertising
build 84 while serving 91 is worse than one that says nothing, because it is read as the product
being careless rather than the page.

So they are read rather than typed: the build stamp, the icon out of play.html's <head>, and a
content hash over the screenshots. Same argument, and the same shape, as version.txt in
desktop/tools/build.py and the icon in tools/favicon.js. --check runs in the test suite.

The page used to sell a Windows download and carried its size in two places. It offers the
browser now, so those two markers are gone — see WANT, and the note there about why the zip
itself is still built and still published.

Each value is marked in the page with an HTML comment and replaced up to the next tag:

    <!-- site.py:build -->build 91 · 19 September 2026</b>
                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ this
"""
import glob, hashlib, os, re, sys, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(ROOT, "index.html")
GAME = os.path.join(ROOT, "play.html")
ZIP  = os.path.join(ROOT, "desktop", "The-Crew-Windows.zip")

check = "--check" in sys.argv[1:]

game = open(GAME, encoding="utf-8").read()

# The build the PAGE names is the build of the THING IT OFFERS. That used to be the zip, so this
# read the stamp out of resources.neu inside it — correct then, because the web build could move
# ahead of the exe (a web-only fix, no Windows toolchain to repack with) and the download page
# must not advertise a build nobody can download.
#
# The page offers play.html now. The zip is still built and still served for the exes already on
# people's machines, but nothing on the page points at it — so reading the stamp from it had the
# page saying build 99 over a game that said 100, which is the exact failure the old comment was
# written to prevent, pointing the other way. It reads the game it serves.
m = re.search(r'const BUILD="([^"]+)"', game)
if not m:
    raise SystemExit("no const BUILD= in play.html")
build = m.group(1)

# The day of the month comes off: "build 91 · 19 September 2026" reads as a date somebody needs
# to act on, and nobody does — the month and the year say how current it is, which is the only
# thing the line is for. Done here as well as at the source because the zip carries whatever
# stamp it was packed with, and the one on the site right now predates the change. Once every
# build in circulation is stamped without a day this is a no-op, and harmless as one.
MONTH = ("January|February|March|April|May|June|July|August|September|October|November|December")
build = re.sub(r"\b\d{1,2} (?=(?:%s) \d{4}\b)" % MONTH, "", build)

icon = re.search(r'<link rel="icon" href="[^"]+">', game)
if not icon:
    raise SystemExit("no <link rel=\"icon\"> in play.html — run tools/favicon.js?")
icon = icon.group(0)

mb = lambda n: "%.1f MB" % (n / 1048576.0)
zipped   = os.path.getsize(ZIP)

# The page offers the browser now and no longer advertises the zip, so the two size markers are
# gone from it. The zip itself is still built, still published and still what version.txt names —
# every exe already on somebody's machine checks that file and links to it, and pulling it would
# break the players who are least able to do anything about it. Built and served, just not sold.
WANT = {
    "build":  build,
    "build2": build,
}

page = open(PAGE, encoding="utf-8").read()
out, stale = page, []

for key, value in WANT.items():
    pat = re.compile(r"(<!-- site\.py:" + key + r" -->)([^<]*)")
    m = pat.search(out)
    if not m:
        raise SystemExit("no <!-- site.py:%s --> marker in index.html" % key)
    if m.group(2) != value:
        stale.append("%-7s %r -> %r" % (key, m.group(2), value))
    out = pat.sub(lambda _m: _m.group(1) + value.replace("\\", "\\\\"), out, count=1)

# The screenshots keep their filenames for ever, which is how a corrected one fails to arrive:
# the four went out with the masthead in a fallback grotesque, were re-taken in Anton the same
# day, and the fixed files were served to anybody who had not looked before — everybody else got
# the broken ones out of their own cache, with nothing to tell them or us. So the src carries a
# short hash of what the four actually contain. Re-shoot and the URL changes; leave them alone
# and it does not, so nothing is re-downloaded for nothing.
shots = sorted(glob.glob(os.path.join(ROOT, "shots", "*.png")))
if not shots:
    raise SystemExit("no shots/*.png — has the screenshot folder moved?")
h = hashlib.sha256()
for s in shots:
    h.update(os.path.basename(s).encode())
    h.update(open(s, "rb").read())
shotv = h.hexdigest()[:8]

pat = re.compile(r'(shots/[A-Za-z0-9_-]+\.png)(\?v=[0-9a-f]+)?')
seen = set(m.group(2) or "" for m in pat.finditer(out))
if seen != {"?v=" + shotv}:
    stale.append("shots    %s -> ?v=%s" % (", ".join(sorted(x or "(none)" for x in seen)), shotv))
out = pat.sub(lambda _m: _m.group(1) + "?v=" + shotv, out)

pat = re.compile(r'(<!-- site\.py:favicon -->)<link rel="icon" href="[^"]*">')
m = pat.search(out)
if not m:
    raise SystemExit("no <!-- site.py:favicon --><link rel=\"icon\" ...> in index.html")
if m.group(0) != m.group(1) + icon:
    stale.append("favicon is not the one in play.html")
out = pat.sub(lambda _m: _m.group(1) + icon.replace("\\", "\\\\"), out, count=1)

if check:
    if stale:
        print("index.html is out of date:")
        for s in stale:
            print("  " + s)
        sys.exit(1)
    print("index.html is current — %s, %s" % (build, mb(zipped)))
    sys.exit(0)

if out == page:
    print("index.html already current — %s, %s" % (build, mb(zipped)))
else:
    open(PAGE, "w", encoding="utf-8").write(out)
    print("stamped index.html:")
    for s in stale:
        print("  " + s)

#!/usr/bin/env python3
"""Stamp the front page with the things it claims about the game.

    python3 tools/site.py            # rewrite index.html
    python3 tools/site.py --check    # exit 1 if it is out of date, change nothing

index.html names a build, wears the game's own favicon so the tab does not change character
between the page and the thing behind it, and points at four screenshots. Every one of those is
a fact about a file sitting next to it, and a fact typed by hand goes stale — a page advertising
build 84 while serving 91 is worse than one that says nothing, because it is read as the product
being careless rather than the page.

So they are read rather than typed: the build stamp, the icon out of play.html's <head>, a
content hash over the screenshots and another over the poster. Same argument, and the same shape,
as the icon in tools/favicon.js. --check runs in the test suite.

It briefly wrote a version line too, for the copies of the Windows build already installed. One
person ever installed one, and it was the person who made it, so that line and everything that
read it are gone.

Each value is marked in the page with an HTML comment and replaced up to the next tag:

    <!-- site.py:build -->build 91 · 19 September 2026</b>
                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ this
"""
import glob, hashlib, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(ROOT, "index.html")
GAME = os.path.join(ROOT, "play.html")

check = "--check" in sys.argv[1:]

game = open(GAME, encoding="utf-8").read()

# The build the PAGE names is the build of the THING IT OFFERS, and the only thing it offers is
# play.html beside it. This once read the stamp out of resources.neu inside the zip, which was
# right while the zip was what the button handed you and wrong the moment it was not: it had the
# page saying build 99 over a game that said 100. It reads the game it serves.
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

# Nothing here measures a download any more. The page carried the zip's size in two places, then
# stopped naming it, and now there is no zip to name: the Windows build is gone, toolchain and
# all, so os.path.getsize on it would simply raise.
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

# The lookbehind is not decoration. Without it the substitution also rewrites any COMMENT that
# names one of these files, so a comment explaining where a number was measured from turns into
# "measured off poster/hero.webp?v=056b231d" and then churns on every redraw. Only a path inside
# an attribute is a path the browser fetches, and only those are cache-busted.
pat = re.compile(r'(?<=")(shots/[A-Za-z0-9_-]+\.png)(\?v=[0-9a-f]+)?')
seen = set(m.group(2) or "" for m in pat.finditer(out))
if seen != {"?v=" + shotv}:
    stale.append("shots    %s -> ?v=%s" % (", ".join(sorted(x or "(none)" for x in seen)), shotv))
out = pat.sub(lambda _m: _m.group(1) + "?v=" + shotv, out)

# THE POSTER, for exactly the same reason and by exactly the same means. It is one file rather
# than four, it is the FIRST thing anybody sees, and it is the file most likely to be redrawn and
# dropped in under the same name — which without this would reach everyone who had visited before
# as whatever their browser still had. Kept separate from the shots' hash so that re-taking the
# screenshots does not re-download the poster, or the other way about.
poster = sorted(glob.glob(os.path.join(ROOT, "poster", "*.webp")))
if not poster:
    raise SystemExit("no poster/*.webp — has the hero drawing moved?")
h = hashlib.sha256()
for p in poster:
    h.update(os.path.basename(p).encode())
    h.update(open(p, "rb").read())
posterv = h.hexdigest()[:8]

pat = re.compile(r'(?<=")(poster/[A-Za-z0-9_-]+\.webp)(\?v=[0-9a-f]+)?')
seen = set(m.group(2) or "" for m in pat.finditer(out))
if not seen:
    raise SystemExit("index.html references no poster/*.webp — has the hero changed?")
if seen != {"?v=" + posterv}:
    stale.append("poster   %s -> ?v=%s" % (", ".join(sorted(x or "(none)" for x in seen)), posterv))
out = pat.sub(lambda _m: _m.group(1) + "?v=" + posterv, out)

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
    print("index.html is current — %s" % build)
    sys.exit(0)

if out == page:
    print("index.html already current — %s" % build)
else:
    open(PAGE, "w", encoding="utf-8").write(out)
    print("stamped index.html:")
    for s in stale:
        print("  " + s)

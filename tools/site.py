#!/usr/bin/env python3
"""Stamp the download page with the things it claims about the download.

    python3 tools/site.py            # rewrite index.html
    python3 tools/site.py --check    # exit 1 if it is out of date, change nothing

index.html says which build the zip is, how big it is, and how much disk it wants unzipped, and
it wears the game's own favicon so the tab does not change character between the page and the
thing it is offering. Every one of those is a fact about a file sitting next to it, and a fact
typed by hand is a fact that goes stale — a download page advertising build 84 of a 1.1MB zip
while serving build 91 at 1.5MB is worse than one that says nothing, because it is read as the
product being careless rather than the page.

So they are read: the build stamp out of play.html, the sizes out of the zip and its contents,
the icon out of play.html's <head>. Same argument, and the same shape, as version.txt in
desktop/tools/build.py and the icon in tools/favicon.js. --check runs in the test suite.

Each value is marked in the page with an HTML comment and replaced up to the next tag:

    <!-- site.py:build -->build 91 · 19 September 2026</b>
                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ this
"""
import os, re, sys, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(ROOT, "index.html")
GAME = os.path.join(ROOT, "play.html")
ZIP  = os.path.join(ROOT, "desktop", "The-Crew-Windows.zip")

check = "--check" in sys.argv[1:]

game = open(GAME, encoding="utf-8").read()

# The build the PAGE names is the build of the THING IT OFFERS, which is the zip — not the game
# sitting next to it in the repository. Those were the same number until the web build moved ahead
# of the exe (a web-only fix, and no Windows toolchain to repack with), at which point reading it
# out of play.html would have had the download page advertising a build nobody could download.
# So it is read out of resources.neu inside the zip, the same way pack.py reads it back to check
# it packed what it meant to.
with zipfile.ZipFile(ZIP) as z:
    neu = next((i for i in z.infolist() if i.filename.endswith("resources.neu")), None)
    if not neu:
        raise SystemExit("no resources.neu in %s — what is in that zip?" % ZIP)
    m = re.search(rb'const BUILD="([^"]+)"', z.read(neu))
if not m:
    raise SystemExit("no const BUILD= inside the zip's resources.neu")
build = m.group(1).decode("utf-8")

icon = re.search(r'<link rel="icon" href="[^"]+">', game)
if not icon:
    raise SystemExit("no <link rel=\"icon\"> in play.html — run tools/favicon.js?")
icon = icon.group(0)

mb = lambda n: "%.1f MB" % (n / 1048576.0)
zipped   = os.path.getsize(ZIP)
unzipped = sum(i.file_size for i in zipfile.ZipFile(ZIP).infolist())

WANT = {
    "build":  build,
    "build2": build,
    "size":   mb(zipped),
    "size2":  "%s to download, about %s unzipped." % (mb(zipped), mb(unzipped)),
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

#!/usr/bin/env python3
"""Assemble the desktop app's resources: the game itself, and the handbook beside it.

The exe used to be a window pointed at https://papogambola.github.io/the-crew/ — it carried no
game at all, and would have gone dark the moment that address did. It carries the game now. What
it does not carry is the music: 54MB of mp3 against 1MB of everything else, in a zip that is
committed and served out of the repository, which would have meant 57MB added to its history on
every release, for ever. So the music is fetched from the site when there is a connection and the
game runs without it when there is not.

Injected into the copy, and nowhere else, so the web build is untouched:

  THE_CREW_MEDIA  where to fetch music from       -> MEDIA_BASE / mediaURL() in the game
  THE_CREW_BUILD  which build this copy is        -> the "newer build" note in the footer

Run from the desktop folder, before `neu build --release`:  python3 tools/build.py
"""
import os, re

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(HERE)
RES  = os.path.join(HERE, "resources")

# Where a packed copy reaches back to: the music, version.txt, and the zip it offers when it finds
# it is behind. It is the domain and not papogambola.github.io/the-crew/ because the github.io
# address is the one that goes away — the repository is going private, and a site served out of a
# private repository needs a paid plan to exist at all. An exe built before the domain resolves
# will be a silent exe, so the DNS comes first and the build second.
SITE = "https://playthecrew.com/"

GAME = os.path.join(ROOT, "play.html")

game = open(GAME, encoding="utf-8").read()

# The build stamp is read out of the game rather than passed in or typed here, for the same reason
# every other number in this project is read rather than copied: a second copy is the one that
# goes stale, and this one decides whether a player is told their build is old.
m = re.search(r'const BUILD="([^"]+)"', game)
if not m:
    raise SystemExit("no const BUILD= in play.html — has the game moved it?")
build = m.group(1)

# One <script> in the game, and the tests rely on that too. Bail rather than guess if it changes.
if game.count("<script>") != 1:
    raise SystemExit("expected exactly one <script> in play.html, found %d" % game.count("<script>"))

inject = (
    '<script>\n'
    '/* Written by desktop/tools/build.py. This copy of the game is inside the app rather than on\n'
    '   the site, so it is told where the music lives and which build it is. */\n'
    'window.THE_CREW_MEDIA=%r;\n'
    'window.THE_CREW_BUILD=%r;\n'
    '</script>\n'
) % (SITE, build)
inject = inject.replace("'", '"')
game = game.replace("<script>", inject + "<script>", 1)

os.makedirs(RES, exist_ok=True)
# The game is index.html *inside the app* — Neutralino opens the resource root — even though on
# the site it is play.html, because the site's index.html is the download page.
open(os.path.join(RES, "index.html"), "w", encoding="utf-8").write(game)

# ...which is also why the handbook's "← The game" button has to be rewritten on the way in. It
# points at play.html beside the game on the site; there is no play.html in here.
hb = open(os.path.join(ROOT, "handbook.html"), encoding="utf-8").read()
BACK_SITE, BACK_APP = 'id="back" href="play.html"', 'id="back" href="index.html"'
if BACK_SITE not in hb:
    raise SystemExit("no %r in handbook.html — has the back button moved?" % BACK_SITE)
open(os.path.join(RES, "handbook.html"), "w", encoding="utf-8").write(hb.replace(BACK_SITE, BACK_APP))

# version.txt is NOT written here, though it was. It is what a packed copy asks the site in order
# to find out it is behind, so it describes the zip — and this step runs before there is one. When
# a web-only fix moves the game ahead of the last exe, writing it here says a newer build exists
# and then hands everybody the build they already have. pack.py writes it, out of the bundle it
# has just checked, because that is the moment the claim becomes true.

size = lambda p: os.path.getsize(os.path.join(RES, p))
print("assembled %s" % RES)
print("  index.html    %7d bytes  (the game, %s)" % (size("index.html"), build))
print("  handbook.html %7d bytes" % size("handbook.html"))
print("  music         fetched from %s when there is a connection" % SITE)
print("\nnext: neu build --release   then   python3 tools/pack.py")

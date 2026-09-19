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
import os, re, shutil, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(HERE)
RES  = os.path.join(HERE, "resources")
SITE = "https://papogambola.github.io/the-crew/"

game = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

# The build stamp is read out of the game rather than passed in or typed here, for the same reason
# every other number in this project is read rather than copied: a second copy is the one that
# goes stale, and this one decides whether a player is told their build is old.
m = re.search(r'const BUILD="([^"]+)"', game)
if not m:
    raise SystemExit("no const BUILD= in index.html — has the game moved it?")
build = m.group(1)

# One <script> in the game, and the tests rely on that too. Bail rather than guess if it changes.
if game.count("<script>") != 1:
    raise SystemExit("expected exactly one <script> in index.html, found %d" % game.count("<script>"))

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
open(os.path.join(RES, "index.html"), "w", encoding="utf-8").write(game)
shutil.copyfile(os.path.join(ROOT, "handbook.html"), os.path.join(RES, "handbook.html"))

# What the site serves so a bundled copy can ask whether it is behind. Generated from the same
# constant the game prints, so the two cannot disagree.
open(os.path.join(ROOT, "version.txt"), "w", encoding="utf-8").write(build + "\n")

size = lambda p: os.path.getsize(os.path.join(RES, p))
print("assembled %s" % RES)
print("  index.html    %7d bytes  (the game, %s)" % (size("index.html"), build))
print("  handbook.html %7d bytes" % size("handbook.html"))
print("  music         fetched from %s when there is a connection" % SITE)
print("wrote %s" % os.path.join(ROOT, "version.txt"))
print("\nnext: neu build --release   then   python3 tools/pack.py")

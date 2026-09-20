#!/usr/bin/env python3
"""Pack the Windows build into The-Crew-Windows.zip: the exe, its resources, and a READ ME.

resources.neu now carries the game, so this zip is what a player needs and the only thing they
need. Run from the desktop folder, after tools/build.py and `neu build --release`:

    python3 tools/build.py && neu build --release && python3 tools/pack.py
"""
import os, zipfile

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXE = os.path.join(HERE, "dist", "the-crew", "the-crew-win_x64.exe")
RES = os.path.join(HERE, "dist", "the-crew", "resources.neu")
OUT = os.path.join(HERE, "The-Crew-Windows.zip")
README = """THE CREW — Windows

1. Unzip this folder anywhere (the Desktop is fine).
2. Keep "The Crew.exe" and "resources.neu" together in the same folder.
3. Double-click "The Crew.exe".

The game is inside "resources.neu" — it runs with no internet at all. Two things do want a
connection, and neither of them stops you playing: the music, which is streamed rather than
shipped (it is fifty times the size of everything else), and a check for a newer build, which
only ever prints a line in the footer telling you one exists. Your crew is saved in this window
and picks up where it left off next time.

If Windows SmartScreen says "Windows protected your PC": click "More info", then "Run anyway". The
exe is unsigned. If the window stays blank, install the Microsoft Edge WebView2 Runtime (it comes
with Windows 11 and most Windows 10 machines): https://developer.microsoft.com/microsoft-edge/webview2/
"""

for f in (EXE, RES):
    if not os.path.exists(f):
        raise SystemExit(f"missing {f} — run `neu build --release` first")

# The three steps are assemble, build, pack, and they are three chances to ship the last one's
# work. resources.neu carries the game now, so it carries the game's build stamp too — read it
# back out and refuse to pack a bundle that is not the game sitting in the repository. This has
# already happened once: a zip packed at build 84 out of a tree that had moved to 85.
import re
stamp = lambda b: (re.search(rb'const BUILD="([^"]+)"', b) or [None, b""])[1].decode("utf-8", "replace")
packed = stamp(open(RES, "rb").read())
here   = stamp(open(os.path.join(os.path.dirname(HERE), "play.html"), "rb").read())
if not packed:
    raise SystemExit("no game found inside resources.neu — run `python3 tools/build.py` first")
if packed != here:
    raise SystemExit(
        f"resources.neu holds {packed!r} but the game is {here!r}.\n"
        f"    Re-run:  python3 tools/build.py && neu build --release && python3 tools/pack.py")
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
    z.write(EXE, "The Crew/The Crew.exe")
    z.write(RES, "The Crew/resources.neu")
    z.writestr("The Crew/READ ME.txt", README)
print(f"{OUT}: {os.path.getsize(OUT)} bytes — {packed}")

#!/usr/bin/env python3
"""Pack the Windows build into The-Crew-Windows.zip: the exe, its resources, and a READ ME.

Run from the desktop folder after `neu build --release`:  python3 tools/pack.py
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

The window fetches the game from https://papogambola.github.io/the-crew/ — every update lands there,
so there is never a new exe to download. It needs an internet connection to open the office; once it
is open the crew is saved in this window and picks up where it left off next time.

If Windows SmartScreen says "Windows protected your PC": click "More info", then "Run anyway". The
exe is unsigned. If the window stays blank, install the Microsoft Edge WebView2 Runtime (it comes
with Windows 11 and most Windows 10 machines): https://developer.microsoft.com/microsoft-edge/webview2/
"""

for f in (EXE, RES):
    if not os.path.exists(f):
        raise SystemExit(f"missing {f} — run `neu build --release` first")
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
    z.write(EXE, "The Crew/The Crew.exe")
    z.write(RES, "The Crew/resources.neu")
    z.writestr("The Crew/READ ME.txt", README)
print(f"{OUT}: {os.path.getsize(OUT)} bytes")

# The Windows exe

A shell, not a copy of the game. `The Crew.exe` opens a window (Neutralino on the Edge WebView2
runtime that Windows ships with), shows `resources/index.html` — a card that checks the server
answers — and then hands the window to **https://papogambola.github.io/the-crew/**. Every screen,
every posting and every track is served from there, so the game is updated by pushing to `main`,
never by shipping a new exe. If the server cannot be reached the card says so and offers Try again.

What ships: `The-Crew-Windows.zip` in this folder — `The Crew.exe` (2.4 MB), `resources.neu` (the
card and the icon), and a READ ME. Players download it from
**https://papogambola.github.io/the-crew/desktop/The-Crew-Windows.zip**.

## Rebuilding it

Only needed when the card, the icon or the window settings change; the game itself never needs it.

1. `npm install -g @neutralinojs/neu` (once).
2. `cd desktop && neu update` — downloads the Neutralino binaries into `bin/` (not committed).
3. `neu build --release` — writes `dist/the-crew/the-crew-win_x64.exe` and `resources.neu`.
4. Pack the zip: `python3 tools/pack.py` from this folder (or by hand: the exe renamed
   `The Crew.exe`, `resources.neu`, and the READ ME, in a folder called `The Crew`).
5. Commit `The-Crew-Windows.zip`; the push to `main` puts it on the download address above.

To point a build at a test server, open the card with `?game=http://127.0.0.1:8123/` — the loader
takes the address from the query string when one is given.

The exe is unsigned: SmartScreen shows "Windows protected your PC" the first time, and "More info →
Run anyway" gets past it. Signing needs a code-signing certificate, which is a purchase and an
identity check, not a build step.

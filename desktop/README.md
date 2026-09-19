# The Windows exe

**The game is inside it.** `The Crew.exe` opens a window (Neutralino on the Edge WebView2 runtime
that Windows ships with) onto a copy of the game packed into `resources.neu`. It runs with no
internet at all: every screen, every posting, every file, and the full handbook beside it.

It did not always. Until build 85 the exe was a 37KB shell that fetched the game from
**https://papogambola.github.io/the-crew/** and showed a "reaching the office" card until it
answered. It carried no game, needed a connection to start, and would have gone dark the moment
that address did — which it nearly did, because the repository it is served from was about to be
made private.

## What still wants a connection, and what happens without one

| | where it comes from | with no connection |
|---|---|---|
| The game | inside `resources.neu` | runs |
| The handbook | inside `resources.neu` | opens |
| The music | the site | silence; everything else is unaffected |
| "A newer build is out" | `version.txt` on the site | nothing is said |

The music is streamed rather than shipped because it is 54MB against 1MB of everything else — and
the zip that carries the exe is committed to this repository and served out of it, so bundling the
mp3s would have added 57MB to its history on **every release, for ever**. The game already plays
without music; it is the one part worth a connection.

`window.THE_CREW_MEDIA` and `window.THE_CREW_BUILD` are injected into the packed copy by
`tools/build.py` and exist only there. The web build has neither, reads its music from beside
itself exactly as before, and never asks whether it is current, because it is: you just fetched it.

## Building it

One command, from this folder:

    ./tools/release.sh

which is `tools/build.py` (assemble the resources — this is where the game goes in), then
`neu build --release` (the binaries around them), then `tools/pack.py` (the zip). Doing the three
by hand is three chances to ship the previous one's work; a zip once went out holding build 84 out
of a tree that had moved to 85, so `pack.py` reads the build stamp back out of `resources.neu` and
refuses to pack when it disagrees with `../index.html`.

First time only: `npm install -g @neutralinojs/neu`, then `neu update` in this folder to fetch the
Neutralino binaries into `bin/` (not committed).

What ships is `The-Crew-Windows.zip` in this folder — `The Crew.exe` (2.4MB), `resources.neu`
(1.0MB, the game), and a READ ME. Players download it from
**https://papogambola.github.io/the-crew/desktop/The-Crew-Windows.zip**. Bundling the whole game
cost 324KB on the download: 1.18MB before, 1.50MB now, because 800KB of HTML compresses hard.

Commit the zip and `version.txt` together with the build they were made from. `version.txt` is
what a packed copy asks the site in order to find out it is behind, and it is generated from the
game's own `const BUILD` rather than typed, so the two cannot drift.

To point a build at a test server, open it with `?game=` — no longer, in fact: there is nothing to
point. A test copy is `desktop/resources/` served over http, which is exactly what Neutralino does;
`scratchpad/browser60.js` drives it that way.

The exe is unsigned: SmartScreen shows "Windows protected your PC" the first time, and "More info →
Run anyway" gets past it. Signing needs a code-signing certificate, which is a purchase and an
identity check, not a build step.

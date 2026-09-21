# The Windows exe

**The game is inside it.** `The Crew.exe` opens a window (Neutralino on the Edge WebView2 runtime
that Windows ships with) onto a copy of the game packed into `resources.neu`. It runs with no
internet at all: every screen, every posting, every file, and the full handbook beside it.

It did not always. Until build 85 the exe was a 37KB shell that fetched the game from
**https://papogambola.github.io/the-crew/** and showed a "reaching the office" card until it
answered. It carried no game, needed a connection to start, and would have gone dark the moment
that address did — which it nearly did, because the repository it is served from was about to be
made private.

What it still reaches for now points at **https://playthecrew.com/** rather than github.io, for
the same reason: github.io is the address that goes away. The site is one `SITE =` line in
`tools/build.py`, and a copy built before the domain resolves is a silent copy, so the DNS comes
first and the build second.

## What still wants a connection, and what happens without one

| | where it comes from | with no connection |
|---|---|---|
| The game | inside `resources.neu` | runs |
| The handbook | inside `resources.neu` | opens |
| The music | object storage (R2) | silence; everything else is unaffected |
| "A newer build is out" | `version.txt` on the site | nothing is said |

The music is streamed rather than shipped because it is 54MB against 1MB of everything else — and
the zip that carries the exe is committed to this repository and served out of it, so bundling the
mp3s would have added 57MB to its history on **every release, for ever**. The game already plays
without music; it is the one part worth a connection.

`window.THE_CREW_MEDIA`, `window.THE_CREW_MUSIC` and `window.THE_CREW_BUILD` are injected into
the packed copy by `tools/build.py` and exist only there. The music one is read out of the game's
own `MUSIC_HOME`, so the tunes moving to object storage did not need a second edit here. The same script rewrites one thing on the way in: the
handbook's "← The game" button, which is `play.html` on the site and `index.html` in here,
because the site's `index.html` is the download page and the app's is the game. It bails rather
than guess if it cannot find the button to rewrite. The web build has none of them: it reads `MUSIC_HOME` as it stands, and never asks whether it is
current, because it is — you just fetched it.

## Anything the exe reaches for must outlive the exe

An exe in somebody's hands is frozen. Whatever address was baked into it when it was packed is
the address it will keep asking, for as long as that copy exists — so **moving or deleting
anything the site serves silences every copy already downloaded**, and it does it quietly.

This has happened. The music moved to object storage and the mp3s were deleted from the site in
the same breath. Build 95 and later were fine, because they carry `THE_CREW_MUSIC`. Build 91 was
not: it predates `musicURL()` and reaches for tunes through `MEDIA_BASE`, which is the site, where
`/music/*.mp3` had just become 404. Nothing said so. `sfx()` is synthesised with oscillators
rather than files, so the interface kept clicking and beeping while every track failed — which is
what it sounded like from the outside, and how it was found: by somebody playing it.

So before removing anything from the published tree, ask what the *oldest* exe still in
circulation asks for. If the answer is "that", either leave it there or ship a new zip in the same
push — and remember `version.txt` is what tells an old copy there is a newer one, so it has to keep
answering whatever else moves.

## Building it

One command, from this folder:

    ./tools/release.sh

which is `tools/build.py` (assemble the resources — this is where the game goes in), then
`neu build --release` (the binaries around them), then `tools/pack.py` (the zip). Doing the three
by hand is three chances to ship the previous one's work; a zip once went out holding build 84 out
of a tree that had moved to 85, so `pack.py` reads the build stamp back out of `resources.neu` and
refuses to pack when it disagrees with `../play.html`.

First time only: `npm install -g @neutralinojs/neu`, then `neu update` in this folder to fetch the
Neutralino binaries into `bin/` (not committed).

What ships is `The-Crew-Windows.zip` in this folder — `The Crew.exe` (2.4MB), `resources.neu`
(1.0MB, the game), and a READ ME. Players download it from **https://playthecrew.com/desktop/The-Crew-Windows.zip**, which is
what the button on the download page points at. Bundling the whole game
cost 324KB on the download: 1.18MB before, 1.50MB now, because 800KB of HTML compresses hard.

Commit the zip and `version.txt` together: `pack.py` writes the second out of the first, at the
one moment they are certainly the same build. It used to be written by `build.py`, which runs
before the zip exists — so a web-only fix that moved the game ahead of the last exe would have
told every copy in the world that a newer build was out and then handed it the one it already had.

To point a build at a test server, open it with `?game=` — no longer, in fact: there is nothing to
point. A test copy is `desktop/resources/` served over http, which is exactly what Neutralino does;
`scratchpad/browser60.js` drives it that way.

The exe is unsigned: SmartScreen shows "Windows protected your PC" the first time, and "More info →
Run anyway" gets past it. Signing needs a code-signing certificate, which is a purchase and an
identity check, not a build step.

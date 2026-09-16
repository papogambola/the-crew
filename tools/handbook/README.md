# Building the handbook

`handbook.html` and `The-Crew-Handbook.pdf` at the repo root are built from here. Nothing in
them is written by hand twice: the tables come out of the game's own constants, and the index's
page numbers come out of the rendered PDF.

1. `node dump.js` (or `node dump.js <path to the game's html>`) — loads the game's script in a VM with a stubbed DOM and
   writes `gamedata.json`: `BAL`, `RANKS`, `TECHS`, `CATS`, `GOALS`, `TRAITS`, `LIMITS`,
   `RETAINERS`, `SAFEHOUSES`, `WEEKLY`, `GRUDGE`, `LOOSE_WHY` and the rest.
2. `./fetch-fonts.sh` — once. Chromium in a build container often cannot reach
   fonts.googleapis.com; curl can, and the render wants the real faces.
3. `./hb-converge.sh` — builds the page (`hb-build.js`, prose from `hb-text.js`, tables from
   `hb-data.js`), renders the PDF (`hb-pdf.js`), reads the PDF back to find the real page of
   every heading (`hb-pages.py` → `pages.json`), and repeats until no page number moves.
   It converges on the second pass.
4. `node hb-drive.js` — drives the page in a real browser: the pinned search bar, the index
   (including that its numbers match the PDF), go-to-top and back-to-the-game. 34 assertions.
5. Copy `handbook.html` and `The-Crew-Handbook.pdf` to the repo root.

`hb-pages.py` needs `pypdf`, and blocks the container's broken `cryptography` import before it.

The column is 718px wide on screen because that is the printable width of A4 at the render's
margins, so what is laid out is what is printed.

# The city, at the top of the card

One drawing per city — `skyline-<country>-<city>.webp`, 960×396, which is 80:33, the shape the
establishing card has always drawn into. Not 4:3: these sit across the top of a card, not in a
panel beside a line, and a model asked for 4:3 will crop them wrongly.

    python3 tools/skyline-import.py <folder>   # convert, file, and rewrite SKY_HAVE
    node tools/skyline-sheet.js                # all 129 on one page, from the game itself

**They were generated until build 130.** 168 lines built a skyline out of the city's name and its
country's terrain: ridgelines, water, cranes, palms or firs, and a landmark where a city had one,
with the buildings dropping to make room for it. It was the right answer while there was nothing to
show, and the same argument the feed's pictures won settled it in the end — a finite set, drawn
once, beats a generator that is nobody's hand.

**The name is the only link, and accents FOLD rather than disappear.** Zürich is `zurich`, Kraków
`krakow`, São Paulo `sao-paulo`. Dropping the letter instead of folding it gives `z-rich`, which
matches no file anybody would ever name — and it made nine of the 129 look missing and nine more
look unclaimed at the same time, which is one mistake read from both ends.

**Every city must have one.** Unlike a line of the feed, which shows nothing when it has no drawing
and is no worse for it, a card with no city on it is a card with a hole in it. `tests/browser76.js`
fails if a city has no skyline, if two cities are handed the same file, if one does not load, or if
one is not 80:33.

Delivered at 1280×528 and filed at 960×396: 2.3× what it renders at on a PC, 100KB a city rather
than 900KB. 129 files, 14MB.

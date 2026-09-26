# The drawings beside the feed

One picture per line TEMPLATE, filed under an id taken from the template's own words —
`the-keys-are-under-c5667258.webp`. Not per line, not per playthrough: the feed's sentences come
from 577 templates — 456 in a job report and 121 in a recruitment trip — which is a large number
and a FINITE one, and that is the only reason a drawing for every moment is affordable at all.

    python3 tools/art.py --prompts          # what is still to draw, and the prompt for each
    python3 tools/art.py --write            # tell the game which files now exist
    python3 tools/art.py --check            # gaps, orphans, and drift between the two
    python3 tools/art.py --trips --sheet    # the recruitment trip's list, grouped to draw from
    python3 tools/art-import.py <folder>    # convert and file a folder that has just arrived

**All 456 job templates are drawn.** The 121 a recruitment trip needs are not;
`RECRUITMENT-TRIP-DRAWINGS.txt` beside this file is the list, grouped by where in the trip each
moment falls.

Drop `<id>.webp` files in here, run `--write`, and they appear in the game. A line with no drawing
shows NOTHING — the report takes the whole sheet — so a half-finished set is not a broken screen.
It used to fall back to the plan of the place; the plan went in build 121, because it said nothing
the sentence had not already said.

**Editing a template orphans its drawing, and that is correct** — the picture was of those words.
`--check` says so rather than leaving a hand under a doormat beside a sentence about a meter box.

Two rules the prompts enforce, both about a drawing being reused everywhere:

- **No place.** The same picture is shown in all 49 countries, so a minaret in it is wrong in Oslo
  and a fjord is wrong in Jeddah. Where you are belongs to the words and the flag above them.
- **No faces.** The cast is generated per player. A drawn face is always somebody else's Itai.

At 456 files and 83MB they still sit beside the game and are served with it. The trip's 121 will
take that to roughly 577 files and 105MB, which is where this stops being obviously fine: it is
inside GitHub Pages' limits, but every player fetching ten to fifteen drawings a job adds up in a
way 54MB of music already did. The move is one line — `ART_HOME` in play.html — and it is the same
move the music made. Worth doing when the trip set lands, not before.

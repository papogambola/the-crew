# The drawings beside the feed

One picture per line TEMPLATE, filed under an id taken from the template's own words —
`the-keys-are-under-c5667258.webp`. Not per line, not per playthrough: the feed's sentences come
from 526 templates — 405 in a job report and 121 in a recruitment trip — which is a large number
and a FINITE one, and that is the only reason a drawing for every moment is affordable at all.

    python3 tools/art.py --prompts          # what is still to draw, and the prompt for each
    python3 tools/art.py --write            # tell the game which files now exist
    python3 tools/art.py --check            # gaps, orphans, and drift between the two
    python3 tools/art.py --trips --sheet    # the recruitment trip's list, grouped to draw from
    python3 tools/art-import.py <folder>    # convert and file a folder that has just arrived

**The recruitment trip is finished — 121 of 121.** Every part of it: 30 at the table, 18 walking the
city, 16 reading them, 14 flying out, 12 signing, 11 snags, 10 going home, 10 refusals.

**396 of the 405 job templates are drawn**, and nine are not: the six ways the report says somebody
would not take the job (`OUT`), `{P} arrive {where}.` and `Boots on the stairs.` (`POLICE_COME`),
and `Heat like a wall.` (`WEATHER`). `--prompts` lists them, and `--check` now says the two chapters
as two numbers, because one total hid a whole chapter sitting at zero.

**577 files are in here, and 60 of them illustrate nothing.** This directory was built against a
list that harvested strings out of the tables without asking whether each one was a LINE:

    PLACES  23    "an all-night bakery"      fills {place} in a YOU_RUN line
    STREET  15    "tight", "night"           a limit key inside an object, not a sentence
    THINGS  14    "a shoe print"             fills {thing} in a MORNING line
    WHERE    8    "two streets away"         fills {where} in a POLICE_COME line

The first, third and fourth are slot fillers that only ever appear inside somebody else's sentence,
so there is no moment to draw. `STREET` is an array of OBJECTS and the harvest read the first string
of any nested array as a line, which made a template out of a limit key — there is a drawing in here
whose id came from the word "tight". `--check` lists all 60 as orphans; they are still here because
they are somebody's work and deleting them is not a decision this file gets to make. Nothing in the
game fetches them.

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

**577 files and 105MB, which is the threshold this file has been pointing at for four builds, and it
has now arrived.** They still sit beside the game and are served with it. That is
inside GitHub Pages' limits, but every player fetching ten to fifteen drawings a job adds up in a
way 54MB of music already did. The move is one line — `ART_HOME` in play.html — and it is the same
move the music made. It is a decision for the person paying for the bucket, not one this file
should make on its own, and nothing is broken until it is made.

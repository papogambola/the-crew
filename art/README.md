# The drawings beside the feed

One picture per line TEMPLATE, filed under an id taken from the template's own words —
`the-keys-are-under-c5667258.webp`. Not per line, not per playthrough: the feed's sentences come
from about 550 templates, which is a large number and a finite one, and that is the only reason
a drawing for every moment of a job is affordable at all.

    python3 tools/art.py --prompts    # what is still to draw, and the prompt for each
    python3 tools/art.py --write      # tell the game which files now exist
    python3 tools/art.py --check      # gaps, orphans, and drift between the two

Drop `<id>.webp` files in here, run `--write`, and they appear in the game. Anything with no
drawing falls back to the plan, so a half-finished set is not a broken screen.

**Editing a template orphans its drawing, and that is correct** — the picture was of those words.
`--check` says so rather than leaving a hand under a doormat beside a sentence about a meter box.

Two rules the prompts enforce, both about a drawing being reused everywhere:

- **No place.** The same picture is shown in all 49 countries, so a minaret in it is wrong in Oslo
  and a fjord is wrong in Jeddah. Where you are belongs to the words and the flag above them.
- **No faces.** The cast is generated per player. A drawn face is always somebody else's Itai.

At this size the files sit beside the game and are served with it. When the set is six hundred
they move to R2, which is one line — `ART_HOME` in play.html — and the same move the music made.

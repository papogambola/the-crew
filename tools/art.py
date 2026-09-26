#!/usr/bin/env python3
"""The drawings beside the feed: what to draw, what has been drawn, and what has gone stale.

    python3 tools/art.py --prompts     # every template still wanting a drawing, with its prompt
    python3 tools/art.py --write       # rewrite ART_HAVE in play.html from what is in art/
    python3 tools/art.py --check       # exit 1 if ART_HAVE, art/ and the templates disagree
    python3 tools/art.py               # a count, per table

A line of the live job report is not free text. It is a template with the city, the country and a
name slotted in, and there are about five hundred and fifty of them. That is the fact the whole
feature rests on: a picture per TEMPLATE is a finite, one-off job, where a picture per line per
playthrough is an image model running against a four-second deadline, on somebody else's money,
for a game whose first twelve weeks are free.

So each template gets one drawing, made once, filed under an id taken from its own words —
artId() in play.html, and the same slug-and-hash is computed here. Editing a template orphans its
drawing, which is correct: the picture was of those words. --check is what says so out loud
instead of leaving a drawing of a doormat beside a sentence about a meter box.

WHAT IS NOT IN HERE: the drawings. This writes the prompts and checks the results; making the
images is a pass through an image model and a person looking at what comes back. A picture nobody
has looked at is exactly the kind of thing this project does not ship.
"""
import os, re, signal, sys

try:
    # Piping into head closes the pipe early; without this the tool ends in a traceback rather
    # than in silence, which reads as a broken tool rather than a finished page.
    signal.signal(signal.SIGPIPE, signal.SIG_DFL)
except (AttributeError, ValueError):
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(ROOT, "play.html")
ART  = os.path.join(ROOT, "art")
MARK = "/* art.py:have */const ART_HAVE="

# The tables the feed draws on that are being illustrated. Grown one chapter at a time, because a
# style has to be judged on a set before six hundred of them are paid for.
# Every table the live job report draws on. 442 lines across these, plus 368 in TWISTS, which is
# 810 for a job end to end. Grown from ARRIVE and PAPERS alone once the style was settled.
TABLES = [
    "ARRIVE", "PAPERS", "WEATHER", "LOCAL", "SPEAKS", "NOSPEAK", "NOTECH", "FIXED",
    "PLACES", "THINGS", "QUIET", "STREET", "MORNING", "SPLIT", "STANDIN", "LEADERLESS",
    "NOPAY", "POLICE_COME", "YOU_INSIDE", "YOU_RUN", "GAP_WHEEL", "GAP_NONE",
    "KNOW_HAS", "KNOW_NONE", "EXIT_OK", "EXIT_MINUS", "EXIT_NOWHEEL", "TEXTURE", "WHERE",
]

# TWISTS is not a list of sentences but a list of objects — {k, cats, h, s:[...], opts:[...]} —
# and the drawable moment is the HEADLINE, "The engine won't turn". One drawing per twist, not
# one per wording of it: the three s[] variants are the same moment told three ways.
TWIST_TABLE = "TWISTS"

# The look, held in one place so six hundred drawings are recognisably one hand. It is the game's
# own look: black ink on white paper, no colour, no lettering — the sentence is already on the
# screen beside it and a drawing that repeats it in a speech bubble is a drawing arguing with the
# page. No faces that could be a particular crew member either: the cast is generated per player,
# so a drawn face is somebody else's Itai.
STYLE = (
    "black ink line drawing on off-white paper, dense cross-hatching, high contrast, "
    "no colour, no text, no lettering, no logos, no watermark, "
    "1970s European graphic-novel reportage, faces turned away or in shadow, "
    "cinematic wide composition, 4:3"
)

game = open(GAME, encoding="utf-8").read()


def fnv1a(s: str) -> int:
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def slug(t: str) -> str:
    t = re.sub(r"\{[^}]*\}", "", t).lower()
    t = re.sub(r"[^a-z0-9]+", " ", t).strip()
    words = [w for w in t.split() if len(w) > 2][:4]
    return "-".join(words) or "line"


def art_id(t: str) -> str:
    """Byte for byte what artId() in play.html produces. If these two ever disagree the game asks
    for files that are not there and --check passes, so the pair is tested in tests/smoke45.js."""
    return slug(t) + "-" + format(fnv1a(t), "08x")


def templates():
    """Every illustratable line, as (table, template). A pair — the {X} form and the "you" form —
    is one drawing: it is the same moment, told about somebody else or about you."""
    out = []
    for name in TABLES:
        m = re.search(r"^const " + name + r"=(\[.*?\]);$", game, re.M | re.S)
        if not m:
            raise SystemExit(f"no flat const {name}= in play.html — has the table moved?")
        body = m.group(1)[1:-1]                       # inside the outer [ ]
        # A pair is ["...","..."] and is ONE drawing: the same moment, told about somebody else or
        # about you. Its first element is canonical, which is the one key() picks in narrate().
        #
        # The nested groups are taken first and then cut out, so what remains is the flat entries.
        # Done the other way round — a lookbehind excluding a preceding "[" or "," — it found one
        # line out of twenty-six, because in a flat array every string but the first is preceded
        # by a comma. It reported 1 of 26 and called itself consistent.
        for pair in re.findall(r"\[[^\[\]]*\]", body):
            first = re.findall(r"\"((?:[^\"\\]|\\.)*)\"", pair)
            if first:
                out.append((name, first[0]))
        rest = re.sub(r"\[[^\[\]]*\]", "", body)
        for t in re.findall(r"\"((?:[^\"\\]|\\.)*)\"", rest):
            if len(t) > 20 and " " in t:
                out.append((name, t))
    # The twists, by headline.
    m = re.search(r"^const " + TWIST_TABLE + r"=(\[.*?\]);$", game, re.M | re.S)
    if m:
        for h in re.findall(r"\bh:\"((?:[^\"\\\\]|\\\\.)*)\"", m.group(1)):
            if len(h) > 8:
                out.append((TWIST_TABLE, h))

    seen, uniq = set(), []
    for name, t in out:
        if t not in seen:
            seen.add(t)
            uniq.append((name, t))
    return uniq


def have_on_disk():
    if not os.path.isdir(ART):
        return set()
    return {f[:-5] for f in os.listdir(ART) if f.endswith(".webp")}


def have_in_game():
    m = re.search(re.escape(MARK) + r"(\[[^\]]*\]);", game)
    if not m:
        raise SystemExit("no ART_HAVE marker in play.html")
    return set(re.findall(r"\"([^\"]+)\"", m.group(1)))


def prompt_for(template: str) -> str:
    """The sentence, with its placeholders turned into something a model can draw.

    {city}/{country} become nothing at all rather than a named place: the drawing is reused in
    every country the game can send you to, so a minaret in it is wrong in Oslo and a fjord is
    wrong in Jeddah. Place belongs to the words and the flag above them, not to the picture."""
    t = template
    t = re.sub(r"\{city\},?\s*\{country\}\.?\s*", "", t)
    t = re.sub(r"\{city\}\.?\s*", "", t)
    t = re.sub(r"\{country\}\.?\s*", "", t)
    # {how} is a way of getting there — "on separate flights, two days apart", "off the ferry",
    # "up the pass in a hired van". It is filled here with one neutral enough to draw and to read
    # in both positions: mid-sentence after "The crew arrives", and starting one. Substituting a
    # noun phrase got "The crew arrives the crew arriving separately", which is not a sentence and
    # would have been drawn as one.
    t = re.sub(r"\{How\}", "They arrive separately, a day apart", t)
    t = re.sub(r"\{how\}", "separately, a day apart", t)
    t = re.sub(r"\{X\}", "a member of the crew", t)
    t = re.sub(r"\{[^}]*\}", "", t)
    t = re.sub(r"\s+", " ", t).strip().lstrip(".,; ").strip()
    return f"{t} — {STYLE}"


def main():
    """Everything the command line does. Behind __main__ so the module can be IMPORTED — which is
    how tests/smoke45.js checks that art_id() here and artId() in the game agree. A test that
    reimplements the thing it is checking against is a test of its own copy; that is exactly how
    the first version of it reported a mismatch that was its own escaping."""
    args = sys.argv[1:]
    rows = templates()
    disk = have_on_disk()
    listed = have_in_game()
    wanted = {art_id(t): (name, t) for name, t in rows}

    if "--inbox" in args:
        """Triage a folder of drawings that has just arrived, before anything is moved.

        Files turning up in bulk have one of three relationships to the ids this game wants, and each
        needs something different done about it:

            matched    the filename IS an id. It can be filed as it stands.
            stem       an id is inside a longer name — a "(1)", a download prefix, another extension.
                       Recoverable by rule.
            unknown    the name says nothing about which sentence it draws. Only looking at the
                       picture can place these.

        It REPORTS and moves nothing. Shuffling hundreds of files on a guess is not undoable by
        anybody who was not watching it happen."""
        i = args.index("--inbox")
        if i + 1 >= len(args):
            raise SystemExit("--inbox needs a directory")
        box = args[i + 1]
        if not os.path.isdir(box):
            raise SystemExit(f"no such directory: {box}")
        files = sorted(f for f in os.listdir(box)
                       if os.path.splitext(f)[1].lower() in (".webp", ".png", ".jpg", ".jpeg"))
        ids = set(wanted)
        matched, stemmed, unknown = [], [], []
        for f in files:
            base = os.path.splitext(f)[0]
            if base in ids:
                matched.append((f, base))
                continue
            m = re.search(r"([a-z0-9-]+-[0-9a-f]{8})", base)
            if m and m.group(1) in ids:
                stemmed.append((f, m.group(1)))
            else:
                unknown.append(f)
        print(f"{len(files)} images in {box}")
        print(f"  {len(matched):4d} named exactly as an id — ready to file")
        print(f"  {len(stemmed):4d} carry an id inside a longer name — recoverable")
        print(f"  {len(unknown):4d} say nothing about which line they draw")
        dup = {}
        for f, got in matched + stemmed:
            dup.setdefault(got, []).append(f)
        clashes = {k: v for k, v in dup.items() if len(v) > 1}
        if clashes:
            print(f"\n  {len(clashes)} ids have more than one file claiming them:")
            for k, v in list(clashes.items())[:5]:
                print(f"     {k}: " + ", ".join(v))
        if unknown:
            print("\n  first few with no id in the name:")
            for f in unknown[:8]:
                print("     " + f)
        covered = {got for _, got in matched + stemmed}
        print(f"\n  would cover {len(covered)} of {len(wanted)} templates"
              f" ({len(wanted) - len(covered)} still without a drawing)")
        raise SystemExit(0)

    if "--prompts" in args:
        todo = [(i, v) for i, v in wanted.items() if i not in disk]
        print(f"# {len(todo)} of {len(wanted)} still to draw. One 4:3 image each, saved as art/<id>.webp\n")
        for i, (name, t) in todo:
            print(f"{i}.webp")
            print(f"    {prompt_for(t)}\n")
        raise SystemExit(0)

    if "--write" in args:
        ids = sorted(i for i in disk if i in wanted)
        new = MARK + "[" + ",".join('"' + i + '"' for i in ids) + "];"
        out = re.sub(re.escape(MARK) + r"\[[^\]]*\];", new.replace("\\", "\\\\"), game, count=1)
        if out == game and ids:
            raise SystemExit("ART_HAVE could not be rewritten")
        open(GAME, "w", encoding="utf-8").write(out)
        print(f"ART_HAVE now lists {len(ids)} drawings")
        raise SystemExit(0)

    orphans = sorted(disk - set(wanted))
    missing = sorted(set(wanted) - disk)
    drift = listed != {i for i in disk if i in wanted}

    if "--check" in args:
        bad = False
        if orphans:
            bad = True
            print("art/ holds drawings no template asks for any more — the words were edited under them:")
            for o in orphans:
                print("   ", o + ".webp")
        if drift:
            bad = True
            print("ART_HAVE in play.html disagrees with art/ — run: python3 tools/art.py --write")
        if bad:
            raise SystemExit(1)
        print(f"art is consistent — {len(listed)} drawn, {len(missing)} still to draw")
        raise SystemExit(0)

    per = {}
    for name, t in rows:
        per.setdefault(name, [0, 0])
        per[name][0] += 1
        if art_id(t) in disk:
            per[name][1] += 1
    for name in TABLES:
        n, d = per.get(name, [0, 0])
        print(f"  {d:4d} of {n:4d}  {name}")
    print(f"\n  {len(disk & set(wanted)):4d} of {len(wanted):4d}  in total")
    if orphans:
        print(f"\n  {len(orphans)} orphaned: " + ", ".join(orphans[:5]) + (" ..." if len(orphans) > 5 else ""))


if __name__ == "__main__":
    main()

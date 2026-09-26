#!/usr/bin/env python3
"""Take the opening bar of a country's anthem off its Wikipedia article and write it in the game's
own note-string form.

    python3 tools/anthems.py --check          # does it reproduce the six already in the game?
    python3 tools/anthems.py --all            # every country, with what it found and what it did not
    python3 tools/anthems.py --one Germany    # one country, with its working shown
    python3 tools/anthems.py --write          # add the ones it can read to the table in play.html

ADDING ONE BY HAND, when the page has no score to read. Write the opening phrase into ANTHEMS in
play.html as note names — a letter, an optional # or b, an octave, and beats after a colon if it is
not one beat — and leave a comment above it saying which words it is, the way the first six do:

    // "Aus-tra-lians all let us re-joice" — ...
    "Australia":"...",

Eight or nine notes, six or seven seconds at most, and it has to be a PHRASE: better six notes that
finish than nine that stop in the middle of a word. `tests/smoke44.js` checks that every note parses
and that the whole thing fits inside the card. Nothing here overwrites a line written that way.

WHY THIS EXISTS RATHER THAN SOMEBODY TYPING THEM IN. The game's own rule about anthems is that a
half-remembered one is not a near miss — it is the tool being wrong about something the player
knows better than it does, over a card with that country's flag on it. Six were written by hand and
checked by ear, and that took long enough that the other forty-three never happened, which is why
a player in Jakarta hears the cue and nothing else.

Writing forty-three more from memory would break the rule the six were written under. So they are
not written from memory. A good number of anthem articles on Wikipedia carry the melody as a
LilyPond <score> block — the actual source the sheet music on the page is rendered from — and
LilyPond note names are absolute pitches. es IS E flat. There is nothing to interpret.

WHAT IT CANNOT DO is find one that is not there. Roughly half the articles have no score; those
countries are reported as missing and keep the cue. A country with no tune is the designed state,
not a failure.

THE CHECK IS THE POINT. --check runs the extractor over the six anthems that were done by hand and
by ear, and compares. If it can rebuild those from the page, the ones it builds for the other
countries are the same kind of thing. If it cannot, nothing it produces should be believed.
"""
import argparse, json, os, re, sys, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(ROOT, "play.html")
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".anthem-cache")
UA = "TheCrew/1.0 (game asset build; https://playthecrew.com)"

# The article the melody is on, per country. Not derivable from the country's name — an anthem is
# called what it is called — so it is a list, and a country with no line here is simply not looked
# for. The names are the ones the game's COUNTRIES table uses.
ARTICLES = {
    "United States": "The Star-Spangled Banner",
    "United Kingdom": "God Save the King",
    "France": "La Marseillaise",
    "Israel": "Hatikvah",
    "Canada": "O Canada",
    "Russia": "State Anthem of the Russian Federation",
    "Australia": "Advance Australia Fair",
    "Ireland": "Amhrán na bhFiann",
    "Germany": "Deutschlandlied",
    "Netherlands": "Wilhelmus",
    "Switzerland": "Swiss Psalm",
    "Sweden": "Du gamla, Du fria",
    "Norway": "Ja, vi elsker dette landet",
    "Denmark": "Der er et yndigt land",
    "Finland": "Maamme",
    "Italy": "Il Canto degli Italiani",
    "Spain": "Marcha Real",
    "Portugal": "A Portuguesa",
    "Greece": "Hymn to Liberty",
    "Poland": "Mazurek Dąbrowskiego",
    "Czechia": "Kde domov můj",
    "Ukraine": "Shche ne vmerla Ukrainy i slava, i volia",
    "Serbia": "Bože pravde",
    "Mexico": "Himno Nacional Mexicano",
    "Colombia": "National Anthem of Colombia",
    "Argentina": "Argentine National Anthem",
    "Chile": "National Anthem of Chile",
    "Panama": "Himno Istmeño",
    "Brazil": "Brazilian National Anthem",
    "Nigeria": "Nigeria, We Hail Thee",
    "Ghana": "God Bless Our Homeland Ghana",
    "Kenya": "Ee Mungu Nguvu Yetu",
    "South Africa": "National anthem of South Africa",
    "Morocco": "Cherifian Anthem",
    "Egypt": "Bilady, Bilady, Bilady",
    "Lebanon": "Lebanese National Anthem",
    "U.A.E.": "Ishy Bilady",
    "Saudi Arabia": "Aash Al Maleek",
    "Turkey": "İstiklal Marşı",
    "China": "March of the Volunteers",
    "Japan": "Kimigayo",
    "South Korea": "Aegukga",
    "Singapore": "Majulah Singapura",
    "India": "Jana Gana Mana",
    "Pakistan": "Qaumi Taranah",
    "Thailand": "Phleng Chat Thai",
    "Vietnam": "Tiến Quân Ca",
    "Philippines": "Lupang Hinirang",
    "Indonesia": "Indonesia Raya",
}

# ---------------------------------------------------------------- the page

def wikitext(title):
    os.makedirs(CACHE, exist_ok=True)
    f = os.path.join(CACHE, re.sub(r"[^A-Za-z0-9_.-]", "_", title) + ".txt")
    if os.path.exists(f):
        return open(f, encoding="utf-8").read()
    url = "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode(
        {"action": "parse", "page": title, "prop": "wikitext",
         "format": "json", "formatversion": "2", "redirects": "1"})
    last = None
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as h:
                d = json.loads(h.read().decode())
            if "error" in d:
                raise RuntimeError(d["error"].get("info", "wiki error"))
            w = d.get("parse", {}).get("wikitext", "")
            open(f, "w", encoding="utf-8").write(w)
            return w
        except Exception as e:                       # a 429 or a proxy hiccup, not a missing page
            last = e
            time.sleep(2 * (2 ** attempt))
    raise RuntimeError("could not fetch %r: %s" % (title, last))


def scores(title):
    return re.findall(r"<score[^>]*>(.*?)</score>", wikitext(title), re.S)

# ------------------------------------------------------------ the lilypond
#
# LilyPond note names are ABSOLUTE pitches, which is the whole reason this is worth doing: \key
# only decides what accidentals get printed, so `g` in a score in E flat is still a G natural and
# `as` is still an A flat. There is no key to apply and nothing to infer.
#
# What does have to be worked out is the octave, because these are written in \relative mode: a
# note takes the octave that puts it within a fourth of the one before it, and ' and , push it up
# or down from there.

STEP = {"c": 0, "d": 2, "e": 4, "f": 5, "g": 7, "a": 9, "b": 11}
LETTERS = "cdefgab"
# -is is sharp; -es is flat; and for a and e the flat CONTRACTS to a bare -s, so "es" is E flat
# and "as" is A flat. Reading that trailing s as a sharp — which is what it means in the English
# note names LilyPond only uses when a score asks for them — turns every E flat into an F. It did:
# the Deutschlandlied came out starting on F, a tone sharp, and looked plausible enough in a list.
NOTE_RE = re.compile(r"\b([a-g])(isis|eses|is|es|s)?('+|,+)?(\d+\.*|\.*)")
ACCIDENTAL = {"is": 1, "isis": 2, "es": -1, "eses": -2, "s": -1}


def strip_lily(src):
    """Everything that is not the tune: comments, lyrics, and — the one that actually bit —
    LilyPond's own commands AND THEIR ARGUMENTS.

    \\key es \\major is not an E flat. It is the key signature, and its argument is spelled exactly
    like a note, so a parser that only skips the backslashed word reads the key as the first note
    of the tune. Deutschlandlied came out starting on the wrong note three times over that way.
    So the commands that carry a note-shaped or number-shaped argument are removed WITH it, and
    only then is what is left read as music."""
    s = re.sub(r"%\{.*?%\}", " ", src, flags=re.S)
    s = re.sub(r"%[^\n]*", " ", s)
    s = re.sub(r"\\addlyrics\s*\{", " @LYRICS{", s)       # marked, then cut with its braces below
    # \set AND ITS VALUE, and this has to happen BEFORE quoted strings are blanked — three
    # different wrong tunes came out of getting this pair wrong, each of them plausible:
    #   strings blanked but \set left       -> "choir aahs" gave Kimigayo a C and an A in front
    #   \set eaten to the end of the line   -> ate the first two bars, which sit on the same line
    #   strings blanked first, then \set    -> the value was already a space, so "= " ate the
    #                                          following NOTE as the value and the tune lost its
    #                                          first note
    # So: match the value where it still is, in all three shapes it comes in.
    s = re.sub(r"\\(?:set|override|unset|revert)\s+[^\s=]*\s*(?:=\s*(?:\"[^\"]*\"|#[^\s]*|[^\s]*))?",
               " ", s)
    s = re.sub(r'"[^"]*"', " ", s)                        # any other string: a title, a tagline
    s = re.sub(r"\\key\s+[a-g](?:isis|eses|is|es|s)?\s*\\\w+", " ", s)
    s = re.sub(r"\\time\s+\d+\s*/\s*\d+", " ", s)
    s = re.sub(r"\\times\s+\d+\s*/\s*\d+", " ", s)        # a tuplet's ratio is not a duration
    s = re.sub(r"\\(?:partial|repeat\s+\w+|tempo|tuplet)\s+[\d/\s]*", " ", s)
    s = re.sub(r"\\(?:clef|set|override|once|unset)\s+[^\s]*", " ", s)
    s = re.sub(r"\\[A-Za-z]+", " ", s)                    # every remaining command, argument-less
    return s


def cut_at(s, marker):
    """Drop `marker{...}` and everything inside its braces, however deep."""
    out, i = [], 0
    while True:
        j = s.find(marker, i)
        if j < 0:
            out.append(s[i:])
            return "".join(out)
        out.append(s[i:j])
        k = s.find("{", j)
        if k < 0:
            return "".join(out)
        depth, k2 = 1, k + 1
        while k2 < len(s) and depth:
            if s[k2] == "{":
                depth += 1
            elif s[k2] == "}":
                depth -= 1
            k2 += 1
        i = k2


def parse_relative(src, want=9):
    """The first `want` notes of the first \\relative melody, as (semitone-from-C0, beats).

    Durations are LilyPond's: 4 is a crotchet, 8 a quaver, a dot adds half again, and a note with
    no number keeps the last one — which is why the duration has to be carried along rather than
    read per note.
    """
    # \relative is read off the RAW source, because stripping the commands removes it too. Find
    # where the tune starts, then strip what follows.
    raw = cut_at(re.sub(r"\\addlyrics\s*\{", " @LYRICS{", src), "@LYRICS")
    for marker in ("\\markup", "\\header", "\\new Lyrics"):
        raw = cut_at(raw, marker)
    m = re.search(r"\\relative\s+([a-g])(isis|eses|is|es|s)?('+|,+)?", raw)
    if not m:
        return None, "no \\relative melody in this score"
    ref = pitch_of(m.group(1), m.group(2), m.group(3), base=48)   # c' is middle C = 48 here
    s = strip_lily(raw[m.end():])
    # A QUARTER note, because that is LilyPond's own default for a first note written without a
    # duration. Starting at 4.0 — a whole note, in the quarter-note units used here — opened every
    # such anthem on a note held four times too long: Il Canto degli Italiani came out as a drone
    # on F, because its first note is written plainly as "f".
    out, dur, prev = [], 1.0, ref
    tied = False
    for tok in NOTE_RE.finditer(s):
        letter, acc, oct_, d = tok.group(1), tok.group(2), tok.group(3), tok.group(4)
        # \relative: pick the octave that lands within a fourth (six semitones) of the last note.
        base = pitch_of(letter, acc, None, base=(prev // 12) * 12)
        while base - prev > 6:
            base -= 12
        while prev - base > 6:
            base += 12
        if oct_:
            base += 12 * len(oct_) if oct_[0] == "'" else -12 * len(oct_)
        prev = base
        if d and d[0].isdigit():
            n = re.match(r"(\d+)(\.*)", d)
            dur = 4.0 / int(n.group(1))
            dur *= (2 - 0.5 ** len(n.group(2)))
        elif d:                                      # dots alone: the carried duration, dotted
            dur = dur * (2 - 0.5 ** len(d)) / 1.0
        # A tie joins a note to the next of the same pitch: one sound held, not two struck. Read as
        # two, Indonesia Raya's held notes came out as repeated ones, which is a different rhythm
        # and the thing a tune is recognised by.
        if tied and out and out[-1][0] == base:
            out[-1] = (base, out[-1][1] + dur)
        else:
            out.append((base, dur))
        tied = s[tok.end():tok.end() + 4].lstrip().startswith("~")
        if len(out) >= want:
            break
    if not out:
        return None, "no notes found"
    return out, None


def pitch_of(letter, acc, oct_, base=48):
    p = base + STEP[letter]
    if acc:
        p += ACCIDENTAL.get(acc, 0)
    if oct_:
        p += 12 * len(oct_) if oct_[0] == "'" else -12 * len(oct_)
    return p


# --------------------------------------------------- into the game's form

NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]


def to_game(notes, beat_of_quarter=1.0, total_beats=9.0):
    """The game's string: "G4:1 E4:.5 C4:1.5" — a note name, an octave, and beats after a colon.

    Trimmed to about the length of the card, and never mid-phrase: better six notes that finish
    than nine that stop in the middle of a word.
    """
    out, used = [], 0.0
    for p, d in notes:
        b = d * beat_of_quarter
        if used + b > total_beats and out:
            break
        used += b
        octv = p // 12 - 1
        name = NAMES[p % 12] + str(int(octv))
        out.append(name + ("" if abs(b - 1) < 1e-9 else ":" + fmt(b)))
    return " ".join(out)


def fmt(v):
    s = ("%.3f" % v).rstrip("0").rstrip(".")
    return s[1:] if s.startswith("0.") else s


def game_anthems(hand_only=False):
    """The table as the game has it now.

    hand_only drops the lines this tool wrote, which carry `by tools/anthems.py` at the end. That
    matters for --check and only for --check: comparing the tool against its own output is an
    assertion that cannot fail, and once six of the twelve had been written by it the check went
    from "1 agree" to "7 agree" without anything having been verified."""
    src = open(GAME, encoding="utf-8").read()
    m = re.search(r"const ANTHEMS=\{(.*?)\n\};", src, re.S)
    if not m:
        raise SystemExit("no ANTHEMS table in play.html")
    out = {}
    for line in m.group(1).split("\n"):
        if hand_only and "by tools/anthems.py" in line:
            continue
        g = re.search(r'"([^"]+)"\s*:\s*"([^"]+)"', line)
        if g:
            out[g.group(1)] = g.group(2)
    return out


def semitones(line):
    """A game note-string as semitone numbers, for comparing two of them by shape."""
    out = []
    for tok in line.split():
        n = tok.split(":")[0]
        m = re.match(r"^([A-G])([#b]?)(\d)$", n)
        if not m:
            continue
        p = STEP[m.group(1).lower()] + (1 if m.group(2) == "#" else -1 if m.group(2) == "b" else 0)
        out.append(p + 12 * (int(m.group(3)) + 1))
    return out


def shape(seq):
    """The intervals between the notes. Two people writing the same tune in different keys agree
    on this and disagree on everything else, so it is what a comparison has to be made of."""
    return [b - a for a, b in zip(seq, seq[1:])]


def extract(country, want=9, verbose=False):
    title = ARTICLES.get(country)
    if not title:
        return None, "no article listed for this country"
    try:
        blocks = scores(title)
    except Exception as e:
        return None, str(e)
    if not blocks:
        return None, "the article has no <score> — nothing to read"
    for b in blocks:
        notes, why = parse_relative(b, want)
        if notes:
            if verbose:
                print("    from:", title)
                print("    lily:", " ".join(b.split())[:200])
            return notes, None
    return None, why or "no readable melody in the article's scores"


def main():
    ap = argparse.ArgumentParser(description="Anthem openings, off the page rather than out of memory.")
    ap.add_argument("--check", action="store_true", help="rebuild the six done by hand and compare")
    ap.add_argument("--all", action="store_true", help="every country")
    ap.add_argument("--one", help="one country, with its working shown")
    ap.add_argument("--write", action="store_true", help="rewrite the ANTHEMS table in play.html")
    ap.add_argument("--beats", type=float, default=9.0, help="how many beats to keep")
    a = ap.parse_args()

    if a.one:
        notes, why = extract(a.one, verbose=True)
        if not notes:
            print("%s: %s" % (a.one, why))
            return
        print("    notes:", notes)
        print('    "%s": "%s",' % (a.one, to_game(notes, total_beats=a.beats)))
        return

    if a.check:
        have = game_anthems(hand_only=True)
        print("Rebuilding the %d anthems that were written by hand and checked by ear —\n"
              "and ONLY those: the ones this tool wrote are left out, because comparing it\n"
              "against its own output is an assertion that cannot fail.\n"
              "What is compared is the SHAPE — the intervals — because the hand-written ones were\n"
              "put in whatever key was easy to read and the page is in whatever key it is sung in.\n" % len(have))
        good = bad = gone = 0
        for k, v in sorted(have.items()):
            notes, why = extract(k)
            if not notes:
                print("  %-16s could not read it: %s" % (k, why))
                gone += 1
                continue
            mine = to_game(notes, total_beats=a.beats)
            n = min(len(semitones(v)), len(semitones(mine)))
            a_, b_ = shape(semitones(v)[:n]), shape(semitones(mine)[:n])
            same = a_ == b_ and n >= 4
            print("  %-16s %s" % (k, "AGREES" if same else "DIFFERS"))
            print("      by hand: %s" % v)
            print("      off the page: %s" % mine)
            if not same:
                print("      hand intervals: %s" % a_)
                print("      page intervals: %s" % b_)
            good += 1 if same else 0
            bad += 0 if same else 1
        print("\n  %d agree, %d differ, %d had no score to read." % (good, bad, gone))
        if bad:
            print("\n  A DIFFERENCE IS NOT AUTOMATICALLY THE TOOL BEING WRONG — the hand-written\n"
                  "  ones are eight notes of a tune somebody chose, and the page may open on a\n"
                  "  pickup bar, a repeat, or an instrumental introduction nobody sings. Look at\n"
                  "  both before believing either.")
        return

    rows, missing = {}, []
    for c in ARTICLES:
        notes, why = extract(c)
        if notes:
            rows[c] = to_game(notes, total_beats=a.beats)
        else:
            missing.append((c, why))

    if not a.write:
        for c in sorted(rows):
            print('  "%s":"%s",' % (c, rows[c]))
        print("\n  %d read, %d without one:" % (len(rows), len(missing)))
        for c, why in missing:
            print("    %-16s %s" % (c, why))
        return

    # IT ONLY EVER ADDS. A country that already has a tune keeps it, because those six were
    # checked by ear and this has not been. --check found Canada's page carrying a different
    # arrangement from the one in the game — neither obviously wrong, and not a machine's call to
    # make. Overwriting would have replaced a tune somebody had listened to with one nobody had.
    have = game_anthems()
    added = [c for c in rows if c not in have]
    kept = [c for c in rows if c in have]
    merged = dict(have)
    for c in added:
        merged[c] = rows[c]

    src = open(GAME, encoding="utf-8").read()
    m = re.search(r"(const ANTHEMS=\{)(.*?)(\n\};)", src, re.S)
    if not m:
        raise SystemExit("no ANTHEMS table in play.html")
    # IT APPENDS. The table is not rebuilt from what this tool knows, because what this tool knows
    # is only the note strings: the six hand-written ones each carry a line above them saying what
    # phrase it is ("Oh say can you see" — 5 3 1 3 5 8, the rising arpeggio everybody can finish),
    # and a rebuild wrote a tidy table with every one of those notes thrown away. Nothing above the
    # closing brace is touched; the new ones go in underneath.
    added_lines = []
    for c in ARTICLES:
        if c in added:
            added_lines.append('  "%s":"%s",    // %s, by tools/anthems.py'
                               % (c, merged[c], ARTICLES[c]))
    if not added_lines:
        print("nothing new to add — every country with a readable score already has its tune.")
        return
    # The last line of a hand-written object literal usually has no trailing comma, and appending
    # under it makes `"Russia":"…" "Germany":"…"` — a syntax error that takes the whole game down
    # on line one. So the comma goes on before anything is added.
    body = src[m.start(2):m.start(3)]
    if body.rstrip().endswith(('"', "'")):
        body = body.rstrip() + ","
    out = src[:m.start(2)] + body + "\n" + "\n".join(added_lines) + src[m.start(3):]
    open(GAME, "w", encoding="utf-8").write(out)
    # And the proof, rather than the intention: if what came out is not parseable, say so loudly
    # and put the file back the way it was.
    try:
        import subprocess, tempfile
        chk = re.search(r"<script>\n(.*?)\n</script>", out, re.S)
        if chk:
            with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
                f.write(chk.group(1)); tmp = f.name
            r = subprocess.run(["node", "--check", tmp], capture_output=True, text=True)
            os.unlink(tmp)
            if r.returncode != 0:
                open(GAME, "w", encoding="utf-8").write(src)
                raise SystemExit("what that would have written does not parse; play.html put back.\n"
                                 + r.stderr.strip()[:400])
    except FileNotFoundError:
        print("  (node not on the path, so the result was not syntax-checked)")
    print("play.html: %d anthems now (%d were already there and were left alone, %d added)."
          % (len(merged), len(kept), len(added)))
    print("  added:  " + ", ".join(sorted(added)))
    print("  kept:   " + ", ".join(sorted(have)))
    print("\n  %d countries still have no tune and will keep the cue:" % len(missing))
    for c, why in missing:
        print("    %-16s %s" % (c, why))


if __name__ == "__main__":
    main()

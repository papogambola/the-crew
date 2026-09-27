#!/usr/bin/env python3
"""Convert and file a folder of city skylines, and tell the game which cities have one.

    python3 tools/skyline-import.py <folder>      # convert, file, and rewrite the manifest
    python3 tools/skyline-import.py <folder> --dry-run

WHY THESE ARE NOT IN art/. The 526 pictures in art/ are one per line TEMPLATE, filed under an id
made from the template's own words, and tools/art.py calls anything in there that no template asks
for an orphan. A skyline is one per CITY, a different shape (80:33 against 4:3) and a different
question, so it lives in skylines/ and keeps its own manifest. Dropping them into art/ would have
made 129 orphans out of the correct files.

THE NAME IS THE ONLY LINK, and it is taken exactly as delivered — skyline-<country>-<city>.webp —
with no transformation, because a transformation is somewhere for a bug to live. The slug strips
ACCENTS rather than dropping the letter: Zürich is zurich, Kraków is krakow, São Paulo is
sao-paulo. Getting that wrong made nine of the 129 look missing and nine more look unclaimed, which
is the same file failing to recognise itself twice.

960x396 is 3x the 320x132 the card draws into, which holds the ratio exactly and is 2.3x the 420px
it renders at on a PC — enough for any display, and 100KB a city rather than the 900KB they arrive
as.
"""
import os
import re
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(ROOT, "play.html")
OUT = os.path.join(ROOT, "skylines")
W, H = 960, 396
MARK = "/* skyline-import.py:have */const SKY_HAVE="


def slug(s):
    """Lowercase, accents folded into their base letter, everything else a hyphen.

    The folding is the part that matters and the part that was wrong first time. Stripping a
    non-ascii letter instead of folding it turns Zürich into z-rich, which matches no file anybody
    would ever name."""
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def cities():
    """Every city in the game, as (country, city), read from COUNTRIES in play.html."""
    s = open(GAME, encoding="utf-8").read()
    i = s.index("const COUNTRIES=[")
    j = s.index("\n];", i)
    out = []
    for m in re.finditer(r'^\s*\["([^"]+)".*?\[([^\]]*)\]\],?\s*$', s[i:j], re.M):
        country = m.group(1)
        for city in re.findall(r'"([^"]+)"', m.group(2)):
            out.append((country, city))
    return out


def name_for(country, city):
    return "skyline-%s-%s" % (slug(country), slug(city))


def write_manifest(have):
    game = open(GAME, encoding="utf-8").read()
    if not re.search(re.escape(MARK) + r"\[[^\]]*\];", game):
        raise SystemExit("no SKY_HAVE marker in play.html — has it been renamed?")
    new = MARK + "[" + ",".join('"' + i + '"' for i in sorted(have)) + "];"
    out = re.sub(re.escape(MARK) + r"\[[^\]]*\];", new.replace("\\", "\\\\"), game, count=1)
    if out == game:
        print("SKY_HAVE already lists %d skylines — nothing to do" % len(have))
        return
    open(GAME, "w", encoding="utf-8").write(out)
    print("SKY_HAVE now lists %d skylines" % len(have))


def main():
    args = sys.argv[1:]
    if not args:
        raise SystemExit(__doc__)
    folder, dry = args[0], "--dry-run" in args
    if not os.path.isdir(folder):
        raise SystemExit("no such folder: " + folder)
    try:
        from PIL import Image
    except ImportError:
        raise SystemExit("needs Pillow: pip install Pillow")

    want = {name_for(c, t): (c, t) for c, t in cities()}
    src = {f[:-5]: os.path.join(folder, f) for f in sorted(os.listdir(folder)) if f.endswith(".webp")}

    filed, wrong, extra = [], [], []
    os.makedirs(OUT, exist_ok=True)
    for name, path in src.items():
        if name not in want:
            extra.append(name)
            continue
        im = Image.open(path)
        if abs(im.width / im.height - W / H) > 0.02:
            wrong.append("%s %dx%d" % (name, im.width, im.height))
            continue
        if not dry:
            im.convert("RGB").resize((W, H), Image.LANCZOS).save(
                os.path.join(OUT, name + ".webp"), "WEBP", quality=82, method=6)
        filed.append(name)

    missing = [want[n] for n in want if n not in src]
    print("\n%d skylines in %s" % (len(src), folder))
    print("  %4d filed into skylines/ at %dx%d" % (len(filed), W, H))
    print("  %4d the wrong shape%s" % (len(wrong), (": " + ", ".join(wrong[:4])) if wrong else ""))
    print("  %4d match no city in the game%s" % (len(extra), (": " + ", ".join(extra[:4])) if extra else ""))
    print("  %4d cities still without one%s" % (
        len(missing), (": " + ", ".join(c + "/" + t for c, t in missing[:4])) if missing else ""))
    if not dry:
        have = {f[:-5] for f in os.listdir(OUT) if f.endswith(".webp")}
        write_manifest(have)


if __name__ == "__main__":
    main()

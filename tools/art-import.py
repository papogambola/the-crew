#!/usr/bin/env python3
"""Take a folder of drawings as they came out of the image model and make them game assets.

    python3 tools/art-import.py <folder>              # convert, resize, file into art/
    python3 tools/art-import.py <folder> --dry-run    # say what it would do, touch nothing

The drawings arrive as full-size PNGs — around 2MB each, which is roughly twenty times what a
picture beside a line of a feed can weigh. A player reads a line in under five seconds and the
next drawing has to be there already; 2MB is not there already on any connection worth designing
for. So each one is cropped to the panel's 4:3, resized to 1200 wide and written as webp, which
lands at about 150KB and is indistinguishable at the size it is shown.

It also does the filing, because the names that come back from a model are not the names the game
asks for:

    named as an id          copied straight in
    an id inside the name   the id is taken out of it and used — a "(1)", a download prefix
    no id at all            LEFT ALONE, and listed. Only looking at the picture can place those,
                            and a script that guesses which sentence a drawing illustrates will
                            be wrong in a way nobody catches until a player sees it.

Nothing is overwritten. A drawing already in art/ stays unless --replace is given, so running this
twice is harmless and running it on a folder that is half old and half new does what you want.
"""
import argparse, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, "art")
sys.path.insert(0, os.path.join(ROOT, "tools"))
import art as artmod  # noqa: E402

# Measured rather than picked. The panel is 380 CSS px wide, so 760 physical pixels covers a 2x
# screen and 900 leaves a little headroom. Quality was chosen by looking: at 900/82 a crop is
# indistinguishable from the 2.4MB original, at 800/75 the sea and sky start going soft, and at
# 760/70 visibly so. The cross-hatching IS the feature, and it is the first thing compression
# eats, so this errs high — 205KB a drawing against 131KB for a picture that looks worse.
WIDTH = 900
QUALITY = 82
EXTS = (".png", ".webp", ".jpg", ".jpeg")


def convert(src, dst, width=WIDTH):
    """Crop to 4:3, resize, write webp. Returns (bytes in, bytes out)."""
    from PIL import Image
    before = os.path.getsize(src)
    im = Image.open(src).convert("RGB")
    w, h = im.size
    want = 4 / 3
    if abs(w / h - want) > 0.01:
        if w / h > want:
            nw = int(h * want)
            im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        else:
            nh = int(w / want)
            im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    if im.width > width:
        im = im.resize((width, int(width * 3 / 4)), Image.LANCZOS)
    im.save(dst, "WEBP", quality=QUALITY, method=6)
    return before, os.path.getsize(dst)


def main():
    ap = argparse.ArgumentParser(description="Convert and file a folder of drawings.")
    ap.add_argument("folder")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--replace", action="store_true", help="overwrite drawings already in art/")
    ap.add_argument("--width", type=int, default=WIDTH)
    a = ap.parse_args()

    if not os.path.isdir(a.folder):
        raise SystemExit("no such folder: " + a.folder)
    os.makedirs(ART, exist_ok=True)

    wanted = {artmod.art_id(t): (name, t) for name, t in artmod.templates()}
    files = []
    for dirpath, _dirs, names in os.walk(a.folder):
        for n in sorted(names):
            if n.lower().endswith(EXTS) and not n.startswith("."):
                files.append(os.path.join(dirpath, n))

    placed, skipped, unplaceable, clashes = [], [], [], {}
    for f in files:
        base = os.path.splitext(os.path.basename(f))[0]
        got = base if base in wanted else None
        if not got:
            m = re.search(r"([a-z0-9-]+-[0-9a-f]{8})", base)
            got = m.group(1) if m and m.group(1) in wanted else None
        if not got:
            unplaceable.append(f)
            continue
        clashes.setdefault(got, []).append(f)

    for got, srcs in sorted(clashes.items()):
        if len(srcs) > 1:
            # A file named EXACTLY as the id wins over one with the id buried in a longer name.
            # Sorted alphabetically instead, "copy the-keys-are-under-….png" beat the properly
            # named "the-keys-are-under-….png" — the duplicate won and the real one was discarded,
            # which is the wrong file kept with no symptom at all.
            srcs.sort(key=lambda f: (os.path.splitext(os.path.basename(f))[0] != got,
                                     len(os.path.basename(f)), os.path.basename(f)))
            print(f"  ! {got}: {len(srcs)} files claim it — keeping {os.path.basename(srcs[0])}")
            for s in srcs[1:]:
                print(f"      ignored: {os.path.basename(s)}")
        src = srcs[0]
        dst = os.path.join(ART, got + ".webp")
        if os.path.exists(dst) and not a.replace:
            skipped.append(got)
            continue
        if a.dry_run:
            placed.append((got, 0, 0))
            continue
        b, af = convert(src, dst, a.width)
        placed.append((got, b, af))

    tot_in = sum(p[1] for p in placed)
    tot_out = sum(p[2] for p in placed)
    print(f"\n{len(files)} images in {a.folder}")
    print(f"  {len(placed):4d} filed into art/" + ("" if a.dry_run else
          f"   {tot_in/1e6:.0f}MB in -> {tot_out/1e6:.1f}MB out"))
    print(f"  {len(skipped):4d} already had a drawing (use --replace to overwrite)")
    print(f"  {len(unplaceable):4d} could not be placed from their name")
    if unplaceable:
        print("\n  These need a person to look at them and say which line they draw:")
        for f in unplaceable[:15]:
            print("     " + os.path.basename(f))
        if len(unplaceable) > 15:
            print(f"     ... and {len(unplaceable)-15} more")
    covered = len({p[0] for p in placed} | set(skipped))
    print(f"\n  {covered} of {len(wanted)} templates would have a drawing")
    if not a.dry_run and placed:
        print("\nnow run:  python3 tools/art.py --write && python3 tools/art.py --check")


if __name__ == "__main__":
    main()

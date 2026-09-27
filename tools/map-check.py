#!/usr/bin/env python3
"""Does this drawing line up with the world, before it becomes the map?

    python3 tools/map-check.py <candidate.webp>       # writes /tmp/map-check-*.png to look at
    python3 tools/map-check.py map/world.webp

THIS EXISTS BECAUSE A MAP SHIPPED THAT DID NOT. Build 131 replaced 22 hand-traced coastline
polygons with a picture, and tests/browser86.js proved the picture was in the same projection as
the arithmetic — which it was, to a tenth of a pixel. Every pin sat exactly where its lon/lat said.
Two builds later Italy's marker was sitting over the Balkans, because the drawing was accurate at
continental scale and invented at country scale: between 5°E and 45°E it had a generic sea with
generic coasts, no Italian boot, no Aegean.

No test caught it and none could. The land-vs-sea probes in browser86 are continental — Australia,
the Amazon, India against open ocean — and pass on a map whose Mediterranean is fiction. They
cannot be sharpened either: on that drawing the Sahara read 231 against open ocean at 229, so no
threshold separates land from water. A machine cannot check a picture for being a good map without
a better map to check it against, and there is no better map in this repository.

So this does not try. It puts the graticule and a list of places WHERE THEY REALLY ARE onto the
candidate and leaves a person to look. That is the whole tool. It takes a minute and it is the
step that was missing.

WHAT TO LOOK FOR, in the order that catches the most:

  1. The full sphere. The image must run from 180°W to 180°E and from 90°N to 90°S, edge to edge,
     with no margin and no decorative border eating into it. A drawing that stops at 60°S and
     fills the rest with waves is a different projection wearing the same shape, and every pin
     will be wrong by a few degrees of latitude in a way that looks almost right.
  2. The ring marks. Each should sit on the thing it names — GIBRALTAR in the strait, ROME on the
     boot, SRI LANKA on the island. That is the check the last map failed.
  3. The Mediterranean crop. It is written out separately because it is small, busy, and where
     the previous drawing fell apart while the world view still looked fine.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = "/tmp"

# Places chosen for being unarguable in a drawing: narrow straits, continental extremes and
# islands with a shape. A city in the middle of a plain proves nothing — there is nothing under it
# to be right or wrong about.
PLACES = [
    ("Land's End",   50.1,   -5.7),
    ("Gibraltar",    36.0,   -5.6),
    ("Rome",         41.9,   12.5),
    ("Athens",       38.0,   23.7),
    ("Istanbul",     41.0,   29.0),
    ("Iceland",      64.9,  -19.0),
    ("North Cape",   71.2,   25.8),
    ("Florida tip",  25.1,  -80.4),
    ("Panama",        9.0,  -79.5),
    ("Cape Horn",   -55.9,  -67.3),
    ("Agulhas",     -34.8,   20.0),
    ("Madagascar",  -19.0,   46.9),
    ("Sri Lanka",     7.9,   80.7),
    ("Singapore",     1.35, 103.8),
    ("Tokyo",        35.7,  139.7),
    ("Sydney",      -33.9,  151.2),
    ("Auckland",    -36.8,  174.8),
]

# The one the previous map failed on, written out on its own because at world scale it is a
# thumbnail and every fault in it hides.
CROPS = [
    ("mediterranean", 48, 5, 30, 45),
    ("britain",       60, -12, 48, 4),
    ("japan",         46, 128, 30, 146),
]


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    path = sys.argv[1]
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        raise SystemExit("needs Pillow: pip install Pillow")

    im = Image.open(path).convert("RGB")
    W, H = im.size
    ratio = W / H
    print("\n%s — %dx%d, ratio %.4f" % (path, W, H, ratio))
    if abs(ratio - 2.0) > 0.005:
        print("  ** NOT 2:1. Equirectangular over the full sphere is 360 across by 180 down.")
        print("     Everything below is measured against a projection this image is not in.")
    else:
        print("  2:1, which is what equirectangular over the full sphere is.")
    # 1774 wide is what the game has had; at the 6x focus zoom the map is magnified about 6.6
    # times, so a source this size is soft close in. Not wrong, just soft — said rather than
    # enforced, because sharpness is a judgement and geography is not.
    if W < 3000:
        print("  Note: %dpx wide. Sharp at world scale, soft at the focus zoom. 4000 would hold up." % W)

    def px(lat, lon):
        return ((lon + 180) / 360 * W, (90 - lat) / 180 * H)

    full = im.copy()
    d = ImageDraw.Draw(full)
    for lat in range(-60, 90, 30):
        y = px(lat, 0)[1]
        d.line([(0, y), (W, y)], fill=(220, 0, 0), width=4 if lat == 0 else 1)
    for lon in range(-150, 180, 30):
        x = px(0, lon)[0]
        d.line([(x, 0), (x, H)], fill=(0, 70, 220), width=4 if lon == 0 else 1)
    for name, lat, lon in PLACES:
        x, y = px(lat, lon)
        d.ellipse([x - 9, y - 9, x + 9, y + 9], outline=(0, 150, 0), width=3)
        d.text((x + 12, y - 6), name, fill=(0, 110, 0))
    p = os.path.join(OUT, "map-check-world.png")
    full.save(p)
    print("\n  %s — every ring should be on the thing it names" % p)

    for name, n, w, s, e in CROPS:
        x0, y0 = px(n, w)
        x1, y1 = px(s, e)
        z = max(1, int(1600 / max(1, x1 - x0)))
        c = im.crop((int(x0), int(y0), int(x1), int(y1)))
        c = c.resize((int((x1 - x0) * z), int((y1 - y0) * z)), Image.LANCZOS)
        cd = ImageDraw.Draw(c)
        for lat in range(int(s), int(n) + 1, 2):
            y = (px(lat, 0)[1] - y0) * z
            if 0 <= y < c.size[1]:
                cd.line([(0, y), (c.size[0], y)], fill=(220, 0, 0))
                cd.text((3, y + 2), "%d" % lat, fill=(220, 0, 0))
        for lon in range(int(w), int(e) + 1, 2):
            x = (px(0, lon)[0] - x0) * z
            if 0 <= x < c.size[0]:
                cd.line([(x, 0), (x, c.size[1])], fill=(0, 70, 220))
                cd.text((x + 2, 3), "%d" % lon, fill=(0, 70, 220))
        for pn, lat, lon in PLACES:
            if s <= lat <= n and w <= lon <= e:
                x, y = (px(lat, lon)[0] - x0) * z, (px(lat, lon)[1] - y0) * z
                cd.ellipse([x - 9, y - 9, x + 9, y + 9], outline=(0, 150, 0), width=3)
                cd.text((x + 12, y - 6), pn, fill=(0, 110, 0))
        p = os.path.join(OUT, "map-check-%s.png" % name)
        c.save(p)
        print("  %s" % p)
    print()


if __name__ == "__main__":
    main()

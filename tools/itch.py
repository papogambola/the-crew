#!/usr/bin/env python3
"""Build the file that gets uploaded to itch.io.

    python3 tools/itch.py                 # writes build/itch/index.html
    python3 tools/itch.py --zip           # also a self-contained zip, drawings and all

WHAT ITCH.IO IS FOR THIS GAME, so the next person does not have to find out the hard way: a
browser-playable game there CANNOT BE SOLD. Their own page says "currently all HTML5 games on
itch.io are set up to only take payments as donations", and selling access means setting the kind
of game to Downloadable, which is a file somebody installs and therefore not this game. So what is
on itch is the whole game, free, with a tip jar. That was a decision, not an oversight.

AND IT NEEDED NO PAYWALL SURGERY, which is the happy accident worth writing down. API_LIVE compares
the page's hostname to the API's — the sameSite rule from build 136, added to stop a test server's
boot probe reaching production. Anywhere that is not this game's own site it is false, the till is
never asked about, and the door never appears. The game simply runs. See tests/browser95.js, which
asserts that from both sides: nothing about accounts off-site, everything unchanged on it.

WHY ONE FILE RATHER THAN A ZIP. The drawings are 106MB across 526 files. play.html has read
window.THE_CREW_ART and window.THE_CREW_MAP since the art was moved out of it, so pointing them at
the site that already serves those files turns a 105MB upload into a 1.2MB one — which matters
because the person doing the uploading is doing it from a browser on whatever machine they are
holding. The cost is a dependency: if playthecrew.com stops serving, the itch copy loses its
drawings and its map. --zip is the answer if that trade ever stops being worth it.

Music is unchanged either way: it streams from the same CDN it does everywhere, which answers
Access-Control-Allow-Origin: * — checked, because a fetch() for audio from another origin needs it.
"""
import os
import shutil
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(ROOT, "play.html")
OUT = os.path.join(ROOT, "build", "itch")
SITE = os.environ.get("THE_CREW_SITE", "https://playthecrew.com").rstrip("/")

SHIM = """<script>
/* THE ITCH.IO BUILD — the same play.html, with the drawings and the map pointed at the site that
   already serves them, which is what makes this one small file instead of a hundred-megabyte zip.
   Written by tools/itch.py; deleting this block gives back the ordinary game. */
window.THE_CREW_ART="%s/art/";
window.THE_CREW_MAP="%s/map/";
</script>
"""


def main() -> int:
    src = open(GAME, encoding="utf-8").read()
    at = src.find("<script>")
    if at < 0:
        print("no <script> in play.html", file=sys.stderr)
        return 1
    os.makedirs(OUT, exist_ok=True)
    page = os.path.join(OUT, "index.html")
    with open(page, "w", encoding="utf-8") as f:
        f.write(src[:at] + (SHIM % (SITE, SITE)) + src[at:])
    print("wrote %s  (%.2f MB)" % (page, os.path.getsize(page) / 1048576))
    print("  drawings and map from %s — upload this one file, no zip needed." % SITE)

    if "--zip" in sys.argv[1:]:
        # Self-contained instead: everything in the archive, nothing fetched from anywhere but the
        # music CDN. index.html has to be at the ROOT of the zip or itch serves a directory listing.
        z = os.path.join(ROOT, "build", "the-crew-itch.zip")
        n = 0
        with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("index.html", src)           # the plain game: art/ and map/ are beside it
            n += 1
            for d in ("art", "map"):
                base = os.path.join(ROOT, d)
                for dirpath, _, names in os.walk(base):
                    for name in names:
                        p = os.path.join(dirpath, name)
                        zf.write(p, os.path.relpath(p, ROOT))
                        n += 1
        print("wrote %s  (%.1f MB, %d files)" % (z, os.path.getsize(z) / 1048576, n))
        # Their limits, checked here rather than discovered at the end of an upload.
        if n > 1000:
            print("  WARNING: itch.io allows 1000 files per zip and this has %d" % n)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

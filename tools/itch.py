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
import re
import sys
import urllib.error
import urllib.request
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(ROOT, "play.html")
OUT = os.path.join(ROOT, "build", "itch")
SITE = os.environ.get("THE_CREW_SITE", "https://playthecrew.com").rstrip("/")

def bases(src: str):
    """Every folder of assets the game can be pointed at, READ OUT OF THE GAME rather than listed
    here.

    It was listed here, and the list was wrong: art and map, because those are the two anybody
    thinks of. The game has four — office/ holds the drawing of the office, skylines/ holds the city
    cards — so the first upload had an office with no room in it, and nothing in the build or the
    tests noticed, because both had been written from the same guess.

    A hand-kept list of somebody else's folders is a list that is right until the day it is not, and
    the day it is not is the day somebody adds a fifth. So this finds them: every X_HOME that names
    a relative directory, paired with the window.THE_CREW_X that overrides it. Add a folder to the
    game and this picks it up without anybody remembering to come here."""
    found = {}
    for m in re.finditer(r'const ([A-Z]+)_HOME\s*=\s*"([^"]+)"', src):
        name, path = m.group(1), m.group(2)
        if path.startswith(("http:", "https:", "//")):
            continue                      # music already lives on a CDN; leave it where it is
        if not path.endswith("/"):
            continue                      # a file, not a folder of them
        if ("window.THE_CREW_" + name) in src:
            found[name] = path
    return found


# One real file per folder, so "does this answer" is a question about a picture rather than about
# a directory listing. The two big folders are content-addressed, so their sample is taken from the
# game's own index rather than typed — the same reason the folder list is. A folder with no sample
# is printed with "?" rather than silently passing, so adding one asks for a line here.
FIXED = {"MAP": "world.webp", "OFFICE": "room.webp"}


def samples(src: str):
    out = dict(FIXED)
    for name, idx in (("ART", "ART_HAVE"), ("SKY", "SKY_HAVE")):
        m = re.search(r'const %s\s*=\s*\["([^"]+)"' % idx, src)
        if m:
            out[name] = m.group(1) + ".webp"
    return out

SHIM_HEAD = """<script>
/* THE ITCH.IO BUILD — the same play.html, with its pictures pointed at the site that already
   serves them, which is what makes this one small file instead of a hundred-megabyte zip. Every
   line below was read out of the game itself (see bases() in tools/itch.py) rather than typed from
   memory, because typed from memory it was missing the office and the city cards.
   Deleting this block gives back the ordinary game. */
"""


def main() -> int:
    src = open(GAME, encoding="utf-8").read()
    at = src.find("<script>")
    if at < 0:
        print("no <script> in play.html", file=sys.stderr)
        return 1
    found = bases(src)
    if not found:
        print("no asset folders found in play.html — has X_HOME changed shape?", file=sys.stderr)
        return 1
    shim = SHIM_HEAD + "".join(
        'window.THE_CREW_%s="%s/%s";\n' % (name, SITE, path)
        for name, path in sorted(found.items())) + "</script>\n"

    os.makedirs(OUT, exist_ok=True)
    page = os.path.join(OUT, "index.html")
    with open(page, "w", encoding="utf-8") as f:
        f.write(src[:at] + shim + src[at:])
    print("wrote %s  (%.2f MB)" % (page, os.path.getsize(page) / 1048576))

    """EVERY BASE IS ASKED WHETHER IT ANSWERS, here, before anybody uploads anything.

    Reading the folders out of the game fixes the half of this that was a bad list. The other half
    is that a folder can be named correctly and still not be there — not deployed, renamed on the
    site, a bucket that moved — and the symptom is identical: a room with no drawing in it, found
    by whoever opens the office first. It cost one upload already. One HEAD request each is a
    cheaper way to find out than a person is."""
    SAMPLE = samples(src)
    bad = 0
    for name, path in sorted(found.items()):
        url = "%s/%s" % (SITE, path)
        probe = url + SAMPLE.get(name, "")
        mark = "?"
        if name in SAMPLE:
            try:
                req = urllib.request.Request(probe, method="HEAD")
                with urllib.request.urlopen(req, timeout=15) as r:
                    mark = str(r.status)
            except urllib.error.HTTPError as e:
                mark = str(e.code)
            except Exception as e:
                mark = type(e).__name__
            if mark != "200":
                bad += 1
        print("  %-8s %-42s %s" % (name.lower(), url, mark))
    if bad:
        print("\n  %d of those did not answer 200. The office drawing and the city cards live in\n"
              "  folders that are easy to forget to deploy — fix that before uploading, or the\n"
              "  first person into the office finds an empty room." % bad, file=sys.stderr)
        return 1
    print("  upload this one file, no zip needed.")

    if "--zip" in sys.argv[1:]:
        # Self-contained instead: everything in the archive, nothing fetched from anywhere but the
        # music CDN. index.html has to be at the ROOT of the zip or itch serves a directory listing.
        z = os.path.join(ROOT, "build", "the-crew-itch.zip")
        n = 0
        with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("index.html", src)           # the plain game: art/ and map/ are beside it
            n += 1
            for d in sorted(p.rstrip("/") for p in found.values()):
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

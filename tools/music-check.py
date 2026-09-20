#!/usr/bin/env python3
"""Ask whether every tune the game reaches for actually answers, wherever the music now lives.

    python3 tools/music-check.py                       # whatever MUSIC_HOME says
    python3 tools/music-check.py https://host/         # somewhere else, before committing to it

Moving 54MB of mp3 off the site is a good idea with one bad failure mode: it is silent. The game
already plays without music — that is deliberate, and it is why a bucket that is half uploaded, or
public for some objects and not others, or serving the right bytes under the wrong name, does not
look like anything. Nobody reports it. The tunes just stop.

So the list of tracks is read out of the game rather than typed here, every one of them is asked
for by name, and the answer is compared against the file on disk. A track that 404s, or comes back
a different size from the master beside it, fails.

HEAD only: nothing is downloaded, so running it costs a Class B operation apiece and no egress.
"""
import os, re, sys, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(ROOT, "play.html")
LOCAL = os.path.join(ROOT, "music")

game = open(GAME, encoding="utf-8").read()

m = re.search(r'const MUSIC_HOME="([^"]*)"', game)
if not m:
    raise SystemExit("no const MUSIC_HOME= in play.html")
base = sys.argv[1] if len(sys.argv) > 1 else m.group(1)

if not base:
    raise SystemExit(
        "MUSIC_HOME is empty, so the music is still served beside the game and there is\n"
        "nothing remote to check. Pass an address to try one before committing to it:\n"
        "    python3 tools/music-check.py https://pub-xxxx.r2.dev/")
if not base.endswith("/"):
    base += "/"

# Every string in the game that names a tune. Read, not listed: a pool gains a track and this
# finds out about it, which is the whole point of not keeping a second copy of the list.
tracks = sorted(set(re.findall(r'"(music/[^"]+\.mp3)"', game)))
if not tracks:
    raise SystemExit("no music/*.mp3 paths found in play.html — has TRACKS moved?")

print("%d tracks, against %s\n" % (len(tracks), base))

bad = 0
for t in tracks:
    want = os.path.getsize(os.path.join(ROOT, t)) if os.path.exists(os.path.join(ROOT, t)) else None
    url = base + t
    rq = urllib.request.Request(url, method="HEAD")
    try:
        with urllib.request.urlopen(rq, timeout=30) as r:
            got = int(r.headers.get("content-length") or 0)
            ctype = (r.headers.get("content-type") or "").split(";")[0]
            note = ""
            if want is not None and got != want:
                note = "  SIZE %d, master is %d" % (got, want); bad += 1
            elif not ctype.startswith("audio/"):
                # Not fatal: a bucket that serves octet-stream still plays. Worth saying.
                note = "  (served as %s, not audio/*)" % (ctype or "nothing")
            print("  %-28s %3d  %9d bytes%s" % (t.split("/")[-1], r.status, got, note))
    except urllib.error.HTTPError as e:
        print("  %-28s %3d  --" % (t.split("/")[-1], e.code)); bad += 1
    except Exception as e:
        print("  %-28s  ??  %s" % (t.split("/")[-1], e)); bad += 1

print()
if bad:
    raise SystemExit("%d of %d did not answer as they should. The music would be silent for "
                     "those, and nothing in the game would say so." % (bad, len(tracks)))
print("all %d answer, and all match the masters in music/" % len(tracks))

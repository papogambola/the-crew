#!/usr/bin/env python3
"""Ask whether every tune the game reaches for actually answers, wherever the music now lives.

    python3 tools/music-check.py                       # whatever MUSIC_HOME says
    python3 tools/music-check.py https://host/         # somewhere else, before committing to it
    python3 tools/music-check.py --record              # rewrite music/sizes.json from the masters

Moving 54MB of mp3 off the site is a good idea with one bad failure mode: it is silent. The game
already plays without music — that is deliberate, and it is why a bucket that is half uploaded, or
public for some objects and not others, or serving the right bytes under the wrong name, does not
look like anything. Nobody reports it. The tunes just stop.

So the list of tracks is read out of the game rather than typed here, every one of them is asked
for by name, and the answer is compared against the file on disk. A track that 404s, or comes back
a different size from the master beside it, fails.

It asks with an Origin header and looks at what comes back, because the game reaches a tune two
ways and they have different requirements. An <audio> element loads cross-origin with no CORS at
all, and that is the path that plays. The blob fetch in musicLoadFallback() — the last resort
once an <audio> element has already failed — needs access-control-allow-origin, and a bucket
policy is invisible configuration that can be deleted by somebody tidying up. Losing it does not
silence anything on its own, so it is reported rather than failed, but it is reported loudly.

HEAD only: nothing is downloaded, so running it costs a Class B operation apiece and no egress.

It sends a User-Agent, and that is load-bearing. The first real run against R2 got 403 on all
eighteen and read exactly like a bucket that was not public. It was not that, and it was not
rate limiting either, though that was the second guess: Cloudflare refuses the string urllib
sends by default. Same URL, same second, same method — "Python-urllib/3.11" gets 403 and
"curl/8.5.0" gets 200. So this says what it is instead of saying nothing, which is also the
more honest thing for a tool that is hammering somebody's bucket.

The gap and the backoff below are for the transient cases that are real — 429, a 503 mid-deploy
— and not for that one.
"""
import os, re, sys, time, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(ROOT, "play.html")
SIZES = os.path.join(ROOT, "music", "sizes.json")

game = open(GAME, encoding="utf-8").read()

m = re.search(r'const MUSIC_HOME="([^"]*)"', game)
if not m:
    raise SystemExit("no const MUSIC_HOME= in play.html")
args = [a for a in sys.argv[1:] if a != "--record"]
base = args[0] if args else m.group(1)

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

# What each track should weigh. Kept in the repository because the masters are not: once the
# mp3s live in the bucket and not here, "is it there" is a much weaker question than "is it
# there and is it the whole file", and a half-written object answers the first one yes. 18
# numbers and about 600 bytes buys back the second.
if "--record" in sys.argv[1:]:
    import json
    rec = {}
    for t in tracks:
        f = os.path.join(ROOT, t)
        if not os.path.exists(f):
            raise SystemExit("%s is not here — --record only works with the masters in place" % t)
        rec[t] = os.path.getsize(f)
    with open(SIZES, "w", encoding="utf-8") as fh:
        json.dump(rec, fh, indent=1, sort_keys=True); fh.write("\n")
    print("wrote %s — %d tracks, %.1f MB in total" % (SIZES, len(rec), sum(rec.values()) / 1048576.0))
    raise SystemExit(0)

expect = {}
try:
    import json
    expect = json.load(open(SIZES, encoding="utf-8"))
except Exception:
    pass

print("%d tracks, against %s\n" % (len(tracks), base))

GAP = float(os.environ.get("MUSIC_CHECK_GAP", "0.25"))
UA  = "the-crew-music-check/1 (+https://playthecrew.com)"
ORIGIN = "https://playthecrew.com"

def head(url, tries=4):
    """status, headers, how many times it had to be asked again."""
    delay = 1.5
    for i in range(tries):
        try:
            rq = urllib.request.Request(url, method="HEAD",
                                        headers={"User-Agent": UA, "Origin": ORIGIN})
            with urllib.request.urlopen(rq, timeout=30) as r:
                return r.status, r.headers, i
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and i < tries - 1:
                time.sleep(delay); delay *= 2; continue
            return e.code, None, i
        except Exception as e:
            return None, e, i

bad = slowed = 0
nocors = []
for n, t in enumerate(tracks):
    if n: time.sleep(GAP)
    # The master if it is still here, otherwise the size recorded when it was.
    local = os.path.join(ROOT, t)
    want = os.path.getsize(local) if os.path.exists(local) else expect.get(t)
    status, head_or_err, retries = head(base + t)
    if retries: slowed += 1
    short = t.split("/")[-1]
    if status == 200:
        got = int(head_or_err.get("content-length") or 0)
        ctype = (head_or_err.get("content-type") or "").split(";")[0]
        note = ""
        if want is not None and got != want:
            note = "  SIZE %d, should be %d" % (got, want); bad += 1
        elif not ctype.startswith("audio/"):
            # Not fatal: a bucket that serves octet-stream still plays. Worth saying.
            note = "  (served as %s, not audio/*)" % (ctype or "nothing")
        acao = head_or_err.get("access-control-allow-origin")
        if not (acao == "*" or acao == ORIGIN): nocors.append(short)
        if retries: note += "  (asked %d times)" % (retries + 1)
        print("  %-28s %3d  %9d bytes%s" % (short, status, got, note))
    elif status is None:
        print("  %-28s  ??  %s" % (short, head_or_err)); bad += 1
    else:
        print("  %-28s %3d  --%s" % (short, status,
              "  (refused, not missing — is the bucket public?)" if status == 403 else "")); bad += 1

print()
if bad:
    raise SystemExit("%d of %d did not answer as they should. The music would be silent for "
                     "those, and nothing in the game would say so." % (bad, len(tracks)))
unchecked = [t for t in tracks if not os.path.exists(os.path.join(ROOT, t)) and t not in expect]
print("all %d answer%s" % (len(tracks),
      ", and all are the size they should be" if not unchecked
      else " — but %d have no recorded size to check against" % len(unchecked)))
if unchecked:
    print("run  python3 tools/music-check.py --record  while the masters are in place.")
if slowed:
    print("%d of them had to be asked more than once." % slowed)
if nocors:
    print("\nBUT %d of %d send no access-control-allow-origin for %s." % (len(nocors), len(tracks), ORIGIN))
    print("The game still plays them — an <audio> element does not need CORS — but the blob")
    print("fallback in musicLoadFallback() cannot, so a track that fails to load as a plain")
    print("source has nothing left to try. Add a CORS policy to the bucket:")
    print('  [{"AllowedOrigins":["*"],"AllowedMethods":["GET","HEAD"],'
          '"AllowedHeaders":["*"],"MaxAgeSeconds":86400}]')
else:
    print("and all allow a cross-origin read, so the blob fallback still has somewhere to go.")

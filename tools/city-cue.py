#!/usr/bin/env python3
"""Cut the establishing card's three seconds of sound, and put them inside the game.

    python3 tools/city-cue.py --from <recording.mp3>   # re-cut music/city-cue.mp3, then embed it
    python3 tools/city-cue.py                          # embed music/city-cue.mp3 as it stands
    python3 tools/city-cue.py --check                  # exit 1 if the game is out of date

The card is up for ESTAB_MS and the sound is cut to exactly that, fading to silence on the last
frame, so the card going and the sound ending are the same event rather than a track being chopped
off mid-phrase. ESTAB_MS is read out of play.html rather than typed here, for the same reason every
other number in this project is read: a second copy is the one that goes stale, and a stale one
here means a cue that outlives its card or dies before it.

It is embedded as a data: URI rather than served, which is the one exception to all music living in
object storage. Two reasons, both about three seconds: it has to be sounding in the frame the card
appears and a cold fetch would not make it, and inside the exe it then plays with no connection,
which none of the streamed music does. The bandwidth argument that moved the rest out — 54MB
against a 1.5MB download — does not reach 25KB.

The mp3 stays in the repository beside the data URI so the cue can be re-encoded without going to
look for the original recording again, and --check is what stops the two drifting apart.
"""
import base64, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(ROOT, "play.html")
CUE  = os.path.join(ROOT, "music", "city-cue.mp3")
MARK = "/* city-cue.py:src */const CITY_CUE_SRC="

args  = sys.argv[1:]
check = "--check" in args
src   = None
if "--from" in args:
    i = args.index("--from")
    if i + 1 >= len(args):
        raise SystemExit("--from needs a path to the recording")
    src = args[i + 1]

def ffmpeg():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"

game = open(GAME, encoding="utf-8").read()

m = re.search(r"const ESTAB_MS=(\d+);", game)
if not m:
    raise SystemExit("no const ESTAB_MS= in play.html — has the establishing card moved?")
ms = int(m.group(1))
secs = ms / 1000.0

# The shape of the cut, and why each number is what it is:
#   volume    the recordings that get handed over are quiet; the game's own tracks sit at about
#             -14 dB mean, so the cue is lifted to meet them rather than left to sound like a
#             different game. Check the mean after re-cutting a new source: +12 suited this one.
#   fade in   0.12s, because an mp3 that starts on a waveform mid-cycle clicks.
#   fade out  the last fifth of the card, reaching silence exactly as it ends.
#   mono 72k  a three-second bed under a card. Stereo would double the bytes carried in every
#             copy of the game for width nobody is listening for.
GAIN = "12dB"
def cut(source):
    fade_out = max(0.2, secs * 0.2)
    af = "volume=%s,afade=t=in:st=0:d=0.12,afade=t=out:st=%.3f:d=%.3f" % (GAIN, secs - fade_out, fade_out)
    os.makedirs(os.path.dirname(CUE), exist_ok=True)
    subprocess.run([ffmpeg(), "-v", "error", "-i", source, "-vn", "-t", "%.3f" % secs,
                    "-af", af, "-ac", "1", "-ar", "44100",
                    "-c:a", "libmp3lame", "-b:a", "72k", CUE, "-y"], check=True)
    print("cut %s -> %s (%.2fs, %d bytes)" % (os.path.basename(source), os.path.relpath(CUE, ROOT),
                                              secs, os.path.getsize(CUE)))

if src:
    if check:
        raise SystemExit("--from and --check do not go together")
    cut(src)

if not os.path.exists(CUE):
    raise SystemExit("no %s — run with --from <recording.mp3> once" % os.path.relpath(CUE, ROOT))

# What the file actually is, read back rather than assumed: a cue that is not the card's length is
# the whole bug this tool exists to prevent.
out = subprocess.run([ffmpeg(), "-i", CUE], capture_output=True, text=True).stderr
d = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", out)
if not d:
    raise SystemExit("could not read the length of %s" % CUE)
have = int(d.group(1)) * 3600 + int(d.group(2)) * 60 + float(d.group(3))
if abs(have - secs) > 0.12:
    raise SystemExit("%s is %.2fs but the card is up for %.2fs — re-cut it with --from"
                     % (os.path.relpath(CUE, ROOT), have, secs))

uri = "data:audio/mpeg;base64," + base64.b64encode(open(CUE, "rb").read()).decode("ascii")
want = MARK + '"' + uri + '";'

pat = re.compile(re.escape(MARK) + r'"[^"]*";')
if not pat.search(game):
    raise SystemExit("no %s... marker in play.html" % MARK)

if pat.search(game).group(0) == want:
    print("play.html is current — %.2fs cue, %d bytes, %d as a data URI"
          % (have, os.path.getsize(CUE), len(uri)))
    sys.exit(0)

if check:
    print("play.html is STALE: the embedded cue is not what music/city-cue.mp3 would give")
    print("  run: python3 tools/city-cue.py")
    sys.exit(1)

open(GAME, "w", encoding="utf-8").write(pat.sub(lambda _: want, game, count=1))
print("embedded %.2fs of %s in play.html — %d bytes of mp3, %d as a data URI"
      % (have, os.path.relpath(CUE, ROOT), os.path.getsize(CUE), len(uri)))

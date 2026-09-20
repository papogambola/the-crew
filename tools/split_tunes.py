#!/usr/bin/env python3
"""Cut a compilation into its tunes, on the silences between them, and wire them into the game.

    python3 tools/split_tunes.py music/tension.mp3 trip
    python3 tools/split_tunes.py music/news.mp3 news --noise -35 --min 0.3

The first argument is the compilation, the second the pool it feeds: `trip` (the recruitment
trip) or `news` (the week's news pop-up). It finds the silences with ffmpeg, cuts a tune between
each pair of them into music/<pool>-01.mp3, music/<pool>-02.mp3 ... (128 kbps, like the rest),
measures each one, writes them into music/manifest.json under the pool's name, and rewrites the
pool's line in play.html so the game draws from them.

It prints how many tunes it found before it cuts anything. If that is not the number you expect,
adjust --noise (how quiet counts as silence, in dB; -30 is loud room tone, -50 is near digital
silence) and --min (how long a silence must last, in seconds) and run it again. --dry finds and
counts, and cuts nothing. --keep leaves earlier cuts of the same pool in place.

Needs ffmpeg: the one from `pip install imageio-ffmpeg` is enough.
"""
import argparse, json, os, re, subprocess, sys

def ffmpeg():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return "ffmpeg"

def run(args):
    p = subprocess.run(args, capture_output=True, text=True)
    return p.stderr + p.stdout

def duration_of(ff, path):
    out = run([ff, "-hide_banner", "-i", path, "-af", "volumedetect", "-f", "null", "-"])
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", out)
    secs = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)) if m else 0.0
    mv = re.search(r"mean_volume: ([-\d.]+) dB", out)
    return secs, (float(mv.group(1)) if mv else None)

def silences(ff, path, noise, mn):
    out = run([ff, "-hide_banner", "-i", path, "-af", f"silencedetect=noise={noise}dB:d={mn}", "-f", "null", "-"])
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    return list(zip(starts, ends[: len(starts)]))

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("compilation")
    ap.add_argument("pool", choices=["trip", "news"])
    ap.add_argument("--noise", type=float, default=-40.0, help="silence threshold in dB (default -40)")
    ap.add_argument("--min", type=float, default=0.25, help="shortest silence that counts, seconds (default 0.25)")
    ap.add_argument("--shortest", type=float, default=1.5, help="drop pieces shorter than this, seconds (default 1.5)")
    ap.add_argument("--dry", action="store_true", help="count the tunes and stop")
    ap.add_argument("--keep", action="store_true", help="keep earlier cuts of this pool")
    a = ap.parse_args()
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ff = ffmpeg()
    total, _ = duration_of(ff, a.compilation)
    sil = silences(ff, a.compilation, a.noise, a.min)
    # a tune runs from the middle of one silence to the middle of the next
    cuts = [0.0] + [(s + e) / 2 for s, e in sil] + [total]
    pieces = [(cuts[i], cuts[i + 1]) for i in range(len(cuts) - 1) if cuts[i + 1] - cuts[i] >= a.shortest]
    print(f"{a.compilation}: {total:.1f} s, {len(sil)} silences at noise {a.noise} dB / min {a.min} s -> {len(pieces)} tunes")
    for i, (s, e) in enumerate(pieces, 1):
        print(f"  {i:02d}  {s:7.2f} - {e:7.2f}  ({e - s:5.1f} s)")
    if a.dry or not pieces:
        return
    music = os.path.join(root, "music")
    if not a.keep:
        for f in os.listdir(music):
            if re.fullmatch(rf"{a.pool}-\d+\.mp3", f):
                os.remove(os.path.join(music, f))
    entries, names = [], []
    for s, e in pieces:
        # cut it, then keep it only if there is music in it: the tail of a file is often a
        # silence that the detector counts as one more piece
        name = f"{a.pool}-{len(entries) + 1:02d}.mp3"
        out = os.path.join(music, name)
        subprocess.run([ff, "-hide_banner", "-loglevel", "error", "-y", "-i", a.compilation, "-ss", f"{s:.3f}", "-to", f"{e:.3f}",
                        "-vn", "-c:a", "libmp3lame", "-b:a", "128k", out], check=True)
        secs, mean = duration_of(ff, out)
        if mean is None or mean < -45:
            os.remove(out)
            print(f"  dropped {s:.2f}-{e:.2f}: silent ({mean} dB)")
            continue
        entries.append({"name": name, "from": f"{os.path.basename(a.compilation)} {s:.2f}-{e:.2f}", "seconds": round(secs, 3),
                        "bytes": os.path.getsize(out), "mean": mean})
        names.append("music/" + name)
    if not names:
        sys.exit("nothing with music in it was cut; nothing written")
    mpath = os.path.join(music, "manifest.json")
    manifest = json.load(open(mpath, encoding="utf-8"))
    manifest[a.pool] = entries
    json.dump(manifest, open(mpath, "w", encoding="utf-8"), indent=1)
    open(mpath, "a", encoding="utf-8").write("\n")
    ipath = os.path.join(root, "play.html")
    html = open(ipath, encoding="utf-8").read()
    line = re.compile(rf"^(  {a.pool}:)\[[^\]]*\](,\s*//.*)$", re.M)
    if not line.search(html):
        sys.exit(f"could not find the {a.pool} pool line in play.html")
    html = line.sub(lambda m: m.group(1) + "[" + ",".join(json.dumps(n) for n in names) + "]" + m.group(2), html, count=1)
    open(ipath, "w", encoding="utf-8").write(html)
    print(f"wrote {len(names)} tunes, the manifest, and the {a.pool} pool in play.html")

if __name__ == "__main__":
    main()

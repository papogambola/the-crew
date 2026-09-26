#!/usr/bin/env python3
"""The anthems, as recordings rather than as a melody made of beeps.

WHY THIS REPLACES tools/anthems.py's OUTPUT. That tool reads the LilyPond score off Wikipedia and
the game replays it with one OscillatorNode — a triangle wave, one note at a time, no harmony and no
instrument. Played under the establishing card it reads as a phone ringtone, which is what the
report was: "sometimes this beeping sound which doesn't make sense". Twelve countries had that, the
other thirty-seven had no tune at all and fell through to the city cue, so the sea played over a
skyline in Lagos. Neither is a national anthem and no amount of tuning the envelope makes a solo
oscillator into one.

WHAT IS SAFE TO SHIP. An anthem's COMPOSITION is almost always long out of copyright; a RECORDING of
it is a separate work and usually is not. The game is sold, so "found on the internet" is not a
licence. This prefers, in order:

  1. Works of the United States government — the US Navy Band and US Army Band recorded a great many
     national anthems and those are public domain worldwide, no attribution required.
  2. Anything else Commons marks as public domain or CC0.
  3. CC-BY / CC-BY-SA, which are usable but carry an attribution obligation — reported separately so
     a person decides, rather than being quietly taken.

Anything unclear is not downloaded and is listed as such. A missing anthem costs nothing: the game
falls back to the city cue, which is what thirty-seven countries already do.

  python3 tools/anthem-audio.py --find     # what exists, and under what licence. Writes nothing.
  python3 tools/anthem-audio.py --fetch    # download + cut + convert the safe ones into music/anthems/
"""
import html
import json
import os
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(ROOT, "play.html")
OUT = os.path.join(ROOT, "music", "anthems")
CACHE = os.path.join(ROOT, "tools", ".anthem-cache")
UA = "TheCrew/1.0 (game asset build; https://playthecrew.com)"

# The establishing card is up for ESTAB_MS and the anthem plays under it, so that is the clip.
# Read out of the game rather than typed here, the way tools/city-cue.py does, so the two can
# never drift.
def estab_ms():
    m = re.search(r"const ESTAB_MS=(\d+);", open(GAME, encoding="utf-8").read())
    if not m:
        raise SystemExit("no ESTAB_MS in play.html")
    return int(m.group(1))


def countries():
    s = open(GAME, encoding="utf-8").read()
    i = s.index("const COUNTRIES=[")
    j = s.index("\n];", i)
    return [m[0] for m in re.findall(r'^\s*\["([^"]+)","([^"]*)"', s[i:j], re.M)]


def get(url, binary=False, pause=2.5):
    """Cached, slow on purpose. The action API at /w/api.php answers this container with a rate-limit
    page whatever User-Agent it is given — the address is shared — so everything here goes through
    the REST API and ordinary article HTML, which answer normally. One request a second keeps it
    that way."""
    os.makedirs(CACHE, exist_ok=True)
    key = re.sub(r"[^A-Za-z0-9]+", "_", url)[-180:] + (".bin" if binary else ".txt")
    p = os.path.join(CACHE, key)
    if os.path.exists(p):
        return open(p, "rb").read() if binary else open(p, encoding="utf-8").read()
    # 429 IS NOT AN ANSWER. The first good run reported 31 of 49 countries as having no usable
    # recording; every one of those 31 was a rate-limit page. A tool that reports "nothing found"
    # when it was told to slow down is worse than one that crashes, because the number looks like a
    # result. So: back off and try again, and only call it missing when the wiki actually says so.
    last = None
    for attempt in range(6):
        time.sleep(pause if attempt == 0 else pause * (2 ** attempt))
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                b = r.read()
            break
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (429, 503):
                continue
            raise
    else:
        raise last
    if binary:
        open(p, "wb").write(b)
        return b
    t = b.decode("utf-8", "replace")
    open(p, "w", encoding="utf-8").write(t)
    return t


# Countries whose anthem article is not "<Country> national anthem" and which the list page does not
# resolve cleanly. Written down rather than guessed, because a wrong article gives a plausible wrong
# tune — the same failure the LilyPond parser kept producing.
TITLE = {
    "United States": "The Star-Spangled Banner",
    "United Kingdom": "God Save the King",
    "France": "La Marseillaise",
    "Germany": "Deutschlandlied",
    "Israel": "Hatikvah",
    "Netherlands": "Wilhelmus",
    "Italy": "Il Canto degli Italiani",
    "Spain": "Marcha Real",
    "Japan": "Kimigayo",
    "China": "March of the Volunteers",
    "Russia": "State Anthem of the Russian Federation",
    "Canada": "O Canada",
    "Australia": "Advance Australia Fair",
    "Ireland": "Amhrán na bhFiann",
    "Sweden": "Du gamla, Du fria",
    "Norway": "Ja, vi elsker dette landet",
    "Denmark": "Der er et yndigt land",
    "Finland": "Maamme",
    "Switzerland": "Swiss Psalm",
    "Portugal": "A Portuguesa",
    "Greece": "Hymn to Liberty",
    "Poland": "Mazurek Dąbrowskiego",
    "Czechia": "Kde domov můj",
    "Ukraine": "Shche ne vmerla Ukrainy i slava, i volia",
    "Serbia": "Bože pravde",
    "Mexico": "Himno Nacional Mexicano",
    "Colombia": "Himno Nacional de la República de Colombia",
    "Argentina": "Himno Nacional Argentino",
    "Chile": "Himno Nacional de Chile",
    "Panama": "Himno Istmeño",
    "Brazil": "Hino Nacional Brasileiro",
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
    "South Korea": "Aegukga",
    "Singapore": "Majulah Singapura",
    "India": "Jana Gana Mana",
    "Pakistan": "Qaumi Taranah",
    "Thailand": "Phleng Chat Thai",
    "Vietnam": "Tiến Quân Ca",
    "Philippines": "Lupang Hinirang",
    "Indonesia": "Indonesia Raya",
}

# Parsoid writes <source src="//upload.wikimedia.org/...">: PROTOCOL-RELATIVE, and with a utm query
# glued on the end. Demanding https:// found nothing on articles that plainly have audio, and the
# run reported 0 of 49 rather than failing — the shape of wrong answer this project keeps producing,
# where a tool says "none" and means "I looked for the wrong thing".
AUDIO = re.compile(r'(?:https:)?//upload\.wikimedia\.org/wikipedia/commons/[^"\'<>\s]+?\.(?:ogg|oga|mp3|wav|flac)',
                   re.I)
# A recording of the anthem, not a reading of the lyrics or a national broadcast of something else.
SKIP = re.compile(r"(spoken|lyrics|reading|speech|interview|pronunciation)", re.I)


def audio_for(title):
    """Every audio file on the anthem's own article, best first."""
    url = "https://en.wikipedia.org/api/rest_v1/page/html/" + urllib.parse.quote(title.replace(" ", "_"), safe="")
    try:
        doc = get(url)
    except Exception as e:
        return [], str(e)
    urls = []
    for u in AUDIO.findall(doc):
        u = html.unescape(u).split("?")[0]
        if u.startswith("//"):
            u = "https:" + u
        # The transcoded copy is the same recording re-encoded by the wiki; take the original and let
        # ffmpeg do the one conversion.
        if "/transcoded/" in u:
            continue
        name = urllib.parse.unquote(u.rsplit("/", 1)[-1])
        if SKIP.search(name):
            continue
        if u not in urls:
            urls.append(u)
    # A US service band recording is a work of the US government, so it is public domain worldwide
    # and needs no attribution. When one is on the page it is the one to take, and its name says so.
    urls.sort(key=lambda u: 0 if re.search(r"(navy|army|marine|air.force)[ _%]*band", u, re.I) else 1)
    return urls, None


LICENCE_GOOD = re.compile(
    r"(public domain|PD-USGov|PD-US|CC0|copyright[- ]free|work of the United States|U\.S\. (Navy|Army|Marine|Air Force) Band)",
    re.I)
LICENCE_ATTRIB = re.compile(r"(CC BY|CC-BY|Creative Commons Attribution)", re.I)
LICENCE_BAD = re.compile(r"(fair use|non-free|copyright(ed)? by|all rights reserved)", re.I)


def licence_of(file_url):
    """Read the file's own description page on Commons. Plain HTML: the action API is rate-limited
    for this address, the wiki pages are not."""
    name = urllib.parse.unquote(file_url.rsplit("/", 1)[-1])
    page = "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(name.replace(" ", "_"), safe="")
    try:
        doc = get(page)
    except Exception as e:
        return "unknown", str(e)[:60], name
    text = re.sub(r"<[^>]+>", " ", doc)
    text = html.unescape(re.sub(r"\s+", " ", text))
    band = re.search(r"(U\.?S\.? (?:Navy|Army|Marine|Air Force) Band)", text, re.I)
    if LICENCE_BAD.search(text) and not LICENCE_GOOD.search(text):
        return "no", "marked non-free", name
    if LICENCE_GOOD.search(text):
        why = band.group(1) if band else LICENCE_GOOD.search(text).group(1)
        return "free", why, name
    if LICENCE_ATTRIB.search(text):
        return "attribution", LICENCE_ATTRIB.search(text).group(1), name
    return "unknown", "no licence found on the page", name


def find():
    rows = []
    for c in countries():
        title = TITLE.get(c)
        if not title:
            rows.append((c, None, "no", "no article title written down", None))
            continue
        urls, err = audio_for(title)
        if err or not urls:
            rows.append((c, title, "no", err or "no audio on the article", None))
            print("  %-14s %-11s %s" % (c, "none", (err or "no audio on the article")[:58]), flush=True)
            continue
        best = None
        for u in urls[:4]:
            status, why, name = licence_of(u)
            if status == "free":
                best = (status, why, name, u)
                break
            if best is None or (best[0] == "unknown" and status == "attribution"):
                best = (status, why, name, u)
        rows.append((c, title, best[0], best[1], best[3]))
        print("  %-14s %-11s %s" % (c, best[0], best[2][:58]), flush=True)
    return rows


def fetch(rows, ms):
    os.makedirs(OUT, exist_ok=True)
    secs = ms / 1000.0
    done, skipped = [], []
    for c, title, status, why, url in rows:
        if status != "free" or not url:
            skipped.append((c, status, why))
            continue
        slug = re.sub(r"[^a-z0-9]+", "-", c.lower()).strip("-")
        dst = os.path.join(OUT, slug + ".mp3")
        raw = get(url, binary=True)
        tmp = os.path.join(CACHE, slug + os.path.splitext(url)[1])
        open(tmp, "wb").write(raw)
        # Mono, the level the rest of the game's music sits at, and faded at the end so it stops with
        # the card rather than being chopped mid-phrase — the rule city-cue.py already follows.
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", tmp,
               "-t", "%.2f" % secs, "-ac", "1", "-ar", "44100",
               "-af", "loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st=%.2f:d=0.6" % max(0.1, secs - 0.6),
               "-codec:a", "libmp3lame", "-b:a", "72k", dst]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            skipped.append((c, "convert failed", r.stderr.strip()[:80]))
            continue
        done.append((c, slug, os.path.getsize(dst), why))
        print("  %-14s %6.1f KB  %s" % (c, os.path.getsize(dst) / 1000, why[:40]), flush=True)
    return done, skipped


def main():
    args = sys.argv[1:]
    ms = estab_ms()
    print("the card is %d ms, so that is the clip\n" % ms)
    cache = os.path.join(CACHE, "audio-find.json")
    if "--find" in args or not os.path.exists(cache):
        print("— what exists, and under what licence —")
        rows = find()
        json.dump(rows, open(cache, "w"))
    else:
        rows = [tuple(r) for r in json.load(open(cache))]
    n = len(rows)
    free = [r for r in rows if r[2] == "free"]
    attrib = [r for r in rows if r[2] == "attribution"]
    rest = [r for r in rows if r[2] not in ("free", "attribution")]
    print("\n  %2d of %d are public domain — safe to ship with no obligation" % (len(free), n))
    print("  %2d need attribution — a person decides" % len(attrib))
    print("  %2d have nothing usable; those countries keep the city cue" % len(rest))
    if attrib:
        print("\n  attribution ones: " + ", ".join(r[0] for r in attrib))
    if rest:
        print("\n  nothing usable:   " + ", ".join(r[0] for r in rest))
    if "--fetch" in args:
        print("\n— cutting to %d ms —" % ms)
        done, skipped = fetch(rows, ms)
        print("\n  %d written to music/anthems/" % len(done))


if __name__ == "__main__":
    main()

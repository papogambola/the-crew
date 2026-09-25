#!/usr/bin/env python3
"""Draw the missing pictures by asking an image model, one at a time, and stop when told.

    export OPENAI_API_KEY=...            # or REPLICATE_API_TOKEN, or STABILITY_API_KEY
    python3 tools/art-gen.py --limit 1   # ONE, and look at it before spending the rest
    python3 tools/art-gen.py --limit 20
    python3 tools/art-gen.py             # everything still missing
    python3 tools/art-gen.py --dry-run   # what it would ask for, and what it would cost

It takes the list from tools/art.py, so the two can never disagree about what is wanted or what a
file is called, and it SKIPS anything already in art/ — which makes it resumable. Interrupt it,
run out of credit, hit a rate limit: run it again and it carries on from where it stopped rather
than paying twice for the same drawing.

THE KEY LIVES IN THE ENVIRONMENT AND NOWHERE ELSE. Not in the repository, not in an argument
where it would sit in your shell history, and not in any line this prints — the failure path is
written carefully because an HTTP error body from an image API sometimes echoes the request back
at you. Same rule as the game: a secret in a file that gets committed is a secret that is gone.

WHAT IT CANNOT DO IS LOOK AT THE RESULTS. Every one of these is going on a screen beside a
sentence it is meant to illustrate, and whether it does is not a thing a script can check. Do one
first, then twenty. Deleting a bad file and running again is the whole undo.
"""
import argparse, base64, io, json, os, re, sys, time, urllib.error, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, "art")
sys.path.insert(0, os.path.join(ROOT, "tools"))
import art as artmod  # noqa: E402  — the single source of what is wanted and what it is called

# Rough, and rounded UP, because a number that flatters is worse than no number. Check the
# provider's own page before a big run; these move.
COST = {"openai": 0.04, "replicate": 0.03, "stability": 0.03}

PROVIDERS = {
    "openai":    ("OPENAI_API_KEY",     "gpt-image-1"),
    "replicate": ("REPLICATE_API_TOKEN", "black-forest-labs/flux-1.1-pro"),
    "stability": ("STABILITY_API_KEY",  "core"),
}


def pick_provider(forced):
    if forced:
        env, _ = PROVIDERS[forced]
        if not os.environ.get(env):
            raise SystemExit(f"--provider {forced} needs {env} set in the environment.")
        return forced
    for name, (env, _) in PROVIDERS.items():
        if os.environ.get(env):
            return name
    raise SystemExit(
        "No key found. Set one of these in your environment and run again:\n"
        + "\n".join(f"    export {env}=...      # {name}" for name, (env, _) in PROVIDERS.items())
    )


def post(url, payload, headers, timeout=180):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), method="POST",
                                 headers={"Content-Type": "application/json", **headers})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def get(url, headers, timeout=60):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def fetch(url, timeout=120):
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return r.read()


def gen_openai(prompt, key, model):
    d = post("https://api.openai.com/v1/images/generations",
             {"model": model, "prompt": prompt, "size": "1536x1024", "n": 1},
             {"Authorization": "Bearer " + key})
    item = d["data"][0]
    if item.get("b64_json"):
        return base64.b64decode(item["b64_json"])
    return fetch(item["url"])


def gen_replicate(prompt, key, model):
    d = post("https://api.replicate.com/v1/models/%s/predictions" % model,
             {"input": {"prompt": prompt, "aspect_ratio": "4:3", "output_format": "png",
                        "safety_tolerance": 2}},
             {"Authorization": "Bearer " + key, "Prefer": "wait"})
    # Prefer: wait usually returns it finished; poll for the times it does not.
    for _ in range(90):
        if d.get("status") == "succeeded":
            out = d.get("output")
            return fetch(out[0] if isinstance(out, list) else out)
        if d.get("status") in ("failed", "canceled"):
            raise RuntimeError("replicate said " + str(d.get("status")) + ": " + str(d.get("error"))[:200])
        time.sleep(2)
        d = get(d["urls"]["get"], {"Authorization": "Bearer " + key})
    raise RuntimeError("replicate did not finish in three minutes")


def gen_stability(prompt, key, model):
    # Stability wants multipart rather than JSON, so this one is built by hand.
    boundary = "----thecrew" + base64.b16encode(os.urandom(8)).decode()
    parts = []
    for k, v in (("prompt", prompt), ("aspect_ratio", "4:3"), ("output_format", "png")):
        parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n")
    body = ("".join(parts) + f"--{boundary}--\r\n").encode()
    req = urllib.request.Request(
        "https://api.stability.ai/v2beta/stable-image/generate/" + model, data=body, method="POST",
        headers={"Authorization": "Bearer " + key, "Accept": "image/*",
                 "Content-Type": "multipart/form-data; boundary=" + boundary})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()


GENERATORS = {"openai": gen_openai, "replicate": gen_replicate, "stability": gen_stability}


def to_webp(raw, path, width=1200):
    """Cropped to 4:3 and saved as webp, because the panel is a 4:3 box and a provider that gives
    3:2 would otherwise be cropped by the browser instead — at full weight, every time it loads."""
    from PIL import Image
    im = Image.open(io.BytesIO(raw)).convert("RGB")
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
    im.save(path, "WEBP", quality=88, method=6)
    return os.path.getsize(path)


def redact(text, key):
    """An error body can echo the request, and the request carries the key."""
    t = str(text)
    if key:
        t = t.replace(key, "<key>")
        if len(key) > 8:
            t = t.replace(key[:8], "<key>")
    return t[:400]


def main():
    ap = argparse.ArgumentParser(description="Draw the missing pictures.")
    ap.add_argument("--provider", choices=sorted(PROVIDERS), help="default: whichever key is set")
    ap.add_argument("--model", help="override the model id")
    ap.add_argument("--limit", type=int, default=0, help="stop after this many (0 = all)")
    ap.add_argument("--dry-run", action="store_true", help="say what it would do, ask for nothing")
    ap.add_argument("--only", help="a substring of the id, to redraw one")
    ap.add_argument("--pause", type=float, default=1.0, help="seconds between calls")
    a = ap.parse_args()

    os.makedirs(ART, exist_ok=True)
    rows = artmod.templates()
    have = artmod.have_on_disk()
    todo = [(artmod.art_id(t), name, t) for name, t in rows if artmod.art_id(t) not in have]
    if not todo and not a.only:
        print("nothing missing — every template has a drawing")
        return

    if a.only:
        # Matched against EVERY id, not just the missing ones, so --only can redraw something that
        # is already on disk. And the two ways of finding nothing are told apart: "no such id" and
        # "already drawn" want completely different things done about them, and reporting either
        # as the other sends somebody looking in the wrong place.
        every = {artmod.art_id(t): (name, t) for name, t in rows}
        hits = [i for i in every if a.only in i]
        if not hits:
            print(f"no id contains {a.only!r}. Try: python3 tools/art.py --prompts | grep {a.only}")
            return
        todo = [(i, every[i][0], every[i][1]) for i in sorted(hits)]
        print(f"--only matched {len(todo)}: " + ", ".join(todo[i][0] for i in range(min(3, len(todo))))
              + (" ..." if len(todo) > 3 else ""))

    if a.limit:
        todo = todo[:a.limit]

    provider = pick_provider(a.provider)
    env, default_model = PROVIDERS[provider]
    model = a.model or default_model
    key = os.environ[env]

    print(f"{len(todo)} to draw · {provider} · {model} · about ${len(todo)*COST[provider]:.2f}")
    if a.dry_run:
        for i, (aid, name, t) in enumerate(todo[:10], 1):
            print(f"  {i:3d}. {aid}.webp\n       {artmod.prompt_for(t)[:150]}...")
        if len(todo) > 10:
            print(f"  ... and {len(todo)-10} more")
        return

    done = failed = 0
    for i, (aid, name, t) in enumerate(todo, 1):
        path = os.path.join(ART, aid + ".webp")
        prompt = artmod.prompt_for(t)
        for attempt in range(4):
            try:
                raw = GENERATORS[provider](prompt, key, model)
                size = to_webp(raw, path)
                done += 1
                print(f"  {i:4d}/{len(todo)}  {aid}.webp  {size//1024}KB")
                break
            except urllib.error.HTTPError as e:
                body = ""
                try:
                    body = e.read().decode()[:300]
                except Exception:
                    pass
                # 429 and 5xx are worth waiting out; a 400 is the prompt and will not improve.
                if e.code in (429, 500, 502, 503, 529) and attempt < 3:
                    wait = 4 * (2 ** attempt)
                    print(f"  {i:4d}/{len(todo)}  {aid}: HTTP {e.code}, waiting {wait}s")
                    time.sleep(wait)
                    continue
                print(f"  {i:4d}/{len(todo)}  {aid}: FAILED HTTP {e.code} {redact(body, key)}")
                failed += 1
                break
            except Exception as e:
                if attempt < 3:
                    time.sleep(4 * (2 ** attempt))
                    continue
                print(f"  {i:4d}/{len(todo)}  {aid}: FAILED {redact(e, key)}")
                failed += 1
                break
        time.sleep(a.pause)

    print(f"\n{done} drawn, {failed} failed")
    if done:
        print("now run:  python3 tools/art.py --write && python3 tools/art.py --check")
        print("and LOOK AT THEM. Delete any that are wrong and run this again — it skips what is there.")


if __name__ == "__main__":
    main()

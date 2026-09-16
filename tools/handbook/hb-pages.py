#!/usr/bin/env python3
"""Reads the rendered PDF back and writes pages.json: the real printed page of every chapter and
section heading, so the contents can say a page number instead of guessing at one.

Matching ignores whitespace and case, because the PDF draws CSS-transformed glyphs and flex gaps
are not spaces. A chapter is found by its kicker, which appears exactly once in the document; a
section by "N.M Title", which appears in the contents and again in the body — the later wins."""
import sys, json, re, os
sys.modules['cryptography'] = None          # the container's cryptography build panics on import
import pypdf

HERE = os.path.dirname(os.path.abspath(__file__))
pdf = pypdf.PdfReader(os.path.join(HERE, "The-Crew-Handbook.pdf"))
heads = json.load(open(os.path.join(HERE, "headings.json")))

flat = lambda s: re.sub(r"[\s ]+", "", s).upper()
pages = [flat(p.extract_text() or "") for p in pdf.pages]

out, missing, dupes = {}, [], []
for h in heads:
    needle = flat(h["find"])
    found = [i + 1 for i, txt in enumerate(pages) if needle in txt]
    if not found:
        missing.append(h["find"])
        continue
    if h.get("once") and len(found) > 1:
        dupes.append(h["find"] + " on " + str(found))
    out[h["id"]] = found[-1]

json.dump(out, open(os.path.join(HERE, "pages.json"), "w"), indent=0)
print("%d pages in the pdf, %d of %d headings placed" % (len(pdf.pages), len(out), len(heads)))
if dupes:
    print("AMBIGUOUS: " + " | ".join(dupes))
if missing:
    print("NOT FOUND: " + " | ".join(missing))
sys.exit(1 if (missing or dupes) else 0)

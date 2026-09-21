#!/bin/sh
# Build the book, print it, and read the printed page numbers back.
#
# This used to be a loop: build, render the PDF, read the page numbers out of it, rebuild with
# those numbers, repeat until nothing moved. It does not need to be, any more. The book paginates
# itself into fixed-size leaves and prints one leaf per sheet, so the page an index line names is
# the page it is on — by construction rather than by convergence. hb-pages.py is kept as the check
# on that claim: hb-drive.js fails if a single heading came out on a different sheet than the
# index promised.
set -e
cd "$(dirname "$0")"
# FIRST, and it was not here: dump.js reads the game's own script and writes gamedata.json, which
# is every number and table the book quotes. It is a build artifact and untracked, so a stale one
# leaves no trace in git status and no diff to notice — the book simply goes on quoting the game
# it was last told about. The title page shipped reading "build 86" out of a tree on 91 that way,
# and then "build 97" out of a tree on 98. Both were found by eye, in the zip, after the fact.
# Regenerating costs two seconds and removes the whole class.
node dump.js > /dev/null
node hb-build.js
node hb-pdf.js
python3 hb-pages.py
# And publish it. hb-build.js writes its output next to itself, but the handbook players open —
# the one the site serves and the one desktop/tools/build.py reads on its way into the zip — is
# ../../handbook.html at the top of the tree, and nothing connected the two. It was a copy
# somebody remembered to make, so the published book sat a build behind the built one and the
# title page went out reading 97 from a tree on 98. Three copies of a file is fine; three copies
# and a manual step is not.
cp handbook.html ../../handbook.html
# And the printed one, for exactly the same reason. The copy at the top of the tree is the PDF
# the site serves; nothing copied it, so it was whatever somebody last remembered to move. It was
# found 78 pages against the built book's 82 — four pages, which is to say it predated the whole
# rival chapter while the game had shipped it. The HTML got this fix and the PDF beside it did not.
cp The-Crew-Handbook.pdf ../../The-Crew-Handbook.pdf
echo "built, printed, read back, published to ../../handbook.html and ../../The-Crew-Handbook.pdf"

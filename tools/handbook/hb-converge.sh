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
node hb-build.js
node hb-pdf.js
python3 hb-pages.py
echo "built, printed, read back — hb-drive.js checks the index against it"

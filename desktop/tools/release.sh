#!/bin/sh
# The whole desktop build, in the one order that works: assemble the resources (the game goes in
# here), build the binaries around them, pack the zip, and last of all restamp the download page
# with what the zip turned out to be.
#
# Doing these by hand is four chances to ship the previous one's work — which is how a zip once
# went out holding build 84 from a tree that had moved to 85. pack.py checks for that now; this
# script is how you avoid meeting the check.
#
# site.py comes after pack.py and not before it, because the page prints the zip's size and the
# zip does not have one until it is written.
set -e
cd "$(dirname "$0")/.."
python3 tools/build.py
neu build --release
python3 tools/pack.py
python3 ../tools/site.py

#!/bin/sh
# The whole desktop build, in the one order that works: assemble the resources (the game goes in
# here), build the binaries around them, pack the zip. Run it from the desktop folder.
#
# Doing these by hand is three chances to ship the previous one's work — which is how a zip once
# went out holding build 84 from a tree that had moved to 85. pack.py checks for that now; this
# script is how you avoid meeting the check.
set -e
cd "$(dirname "$0")/.."
python3 tools/build.py
neu build --release
python3 tools/pack.py

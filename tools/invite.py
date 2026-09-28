#!/usr/bin/env python3
"""Write press passes — codes that open the game for a week without anybody paying.

    INVITE_SECRET=... python3 tools/invite.py                       one code, seven days
    INVITE_SECRET=... python3 tools/invite.py -n 10                 ten of them
    INVITE_SECRET=... python3 tools/invite.py --days 14 -n 5        a fortnight each
    INVITE_SECRET=... python3 tools/invite.py --for "Jane, IGN"     with a note beside it
    INVITE_SECRET=... python3 tools/invite.py -n 20 --csv > passes.csv

IT RUNS HERE, NOT ON THE SERVER, AND THAT IS THE POINT. A code is a signature and nothing else —
there is no row to write, nothing to deploy, and no endpoint that mints them, which means no
endpoint anybody can find and press. The server only ever reads codes; this is the only thing that
writes them, and it needs the secret to do it.

    THE SECRET IS THE WHOLE OF THE SECURITY. Anybody holding INVITE_SECRET can write themselves a
    lifetime, so it lives in the server's environment and in whatever you keep passwords in, and
    nowhere else. Not in a message, not in this repository, and not in a terminal on somebody
    else's machine. It is NOT the sign-in secret and must not be set to the same string: rotating
    one should not sign everybody out or kill every code you have handed out.

WHAT A CODE CARRIES: how many days it is worth, when it stops being redeemable, and a signature.
It does not carry a name — who got which one is what the note beside it is for, and the --csv
output is a file you keep. The server records which account spent which code when it is redeemed.

WHAT TO TELL SOMEBODY YOU SEND ONE TO: open playthecrew.com, press "Have a code?", open an account,
paste it. The week starts then — not when you sent it — so a code sitting in an unread inbox is not
costing them anything.
"""
import argparse
import csv
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "server"))
from app import invites  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description="Write press passes for The Crew.")
    ap.add_argument("-n", "--count", type=int, default=1, help="how many (default 1)")
    ap.add_argument("--days", type=int, default=7,
                    help="days of play each one is worth, counted from when it is redeemed (default 7)")
    ap.add_argument("--live-days", type=int, default=90,
                    help="how long a code may sit unredeemed before it is dead (default 90)")
    ap.add_argument("--for", dest="who", default="",
                    help="a note to print beside them — who this batch is for")
    ap.add_argument("--csv", action="store_true", help="machine-readable, for a spreadsheet")
    ap.add_argument("--secret", default=os.environ.get("INVITE_SECRET", ""),
                    help="defaults to $INVITE_SECRET; prefer the variable over typing it")
    a = ap.parse_args()

    if not a.secret:
        print("No INVITE_SECRET. It is the variable the server signs and checks these with —\n"
              "set the same value here and in the API's environment, and nowhere else.\n\n"
              "  INVITE_SECRET=... python3 tools/invite.py\n", file=sys.stderr)
        return 2
    if a.count < 1 or a.count > 500:
        print("Between 1 and 500 at a time.", file=sys.stderr)
        return 2

    codes = [invites.mint(a.secret, days=a.days, live_days=a.live_days) for _ in range(a.count)]
    dead = date.today() + timedelta(days=a.live_days)

    if a.csv:
        w = csv.writer(sys.stdout)
        w.writerow(["code", "days", "redeem_by", "for", "sent_to", "sent_on"])
        for c in codes:
            w.writerow([c, a.days, dead.isoformat(), a.who, "", ""])
        return 0

    plural = "" if a.count == 1 else "s"
    print("%d press pass%s, %d day%s of play each." % (a.count, "es" if a.count != 1 else "",
                                                       a.days, "" if a.days == 1 else "s"))
    print("Redeem by %s — after that they open nothing.%s\n"
          % (dead.isoformat(), ("  For: " + a.who) if a.who else ""))
    for c in codes:
        print("  " + c)
    print("\nEach one opens ONE account, and the week starts when it is redeemed rather than now.")
    print("What to send: open playthecrew.com, press \"Have a code?\", open an account, paste it.")
    if a.count > 1:
        print("\nKeep a note of who gets which — nothing in the code says. --csv gives you a file for it.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

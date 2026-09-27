#!/usr/bin/env python3
"""A stand-in for Stripe, so the whole of paying can be driven without a Stripe account.

    python3 tools/fake-stripe.py        # listens on 127.0.0.1:8979

Used by tools/buy-drive.js, which explains the rest.

It answers checkout/sessions with a url pointing back at the game, exactly as Stripe's hosted page
would, and nothing else. It does NOT pretend to be a payment page, and that is the point: the
webhook is posted separately and signed, because that is how the real one works. A fake that
"paid" by returning success would test nothing — the door is opened by the signed webhook, never
by the player coming back.

It also echoes the form body it was sent as `_sent`, so the drive can check what the server asked
for: which price, and whose account."""
import json, os
from http.server import BaseHTTPRequestHandler, HTTPServer
class H(BaseHTTPRequestHandler):
    def do_POST(self):
        n=int(self.headers.get("content-length","0")); body=self.rfile.read(n).decode()
        out={"id":"cs_test_driven","url":os.environ.get("SITE","http://127.0.0.1:8977")+"/play.html?paid=1","_sent":body}
        b=json.dumps(out).encode()
        self.send_response(200); self.send_header("content-type","application/json")
        self.send_header("content-length",str(len(b))); self.end_headers(); self.wfile.write(b)
    def log_message(self,*a): pass
HTTPServer(("127.0.0.1",8979),H).serve_forever()

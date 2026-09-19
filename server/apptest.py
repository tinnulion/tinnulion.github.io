#!/usr/bin/env python3
"""Minimal dev server for tinnulion.github.io.

Usage: python server/apptest.py [port]     # default 8000

Serves the repo root at http://127.0.0.1:<port>/ with caching off,
so YAML edits show up on every reload. A server is required for the
page to work: it loads its data with fetch(), which fails on file://.
"""

import http.server
import mimetypes
import sys
from pathlib import Path

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = Path(__file__).resolve().parent.parent

mimetypes.add_type("text/yaml", ".yaml")


class Handler(http.server.SimpleHTTPRequestHandler):
	def __init__(self, *args, **kwargs):
		super().__init__(*args, directory=str(ROOT), **kwargs)

	def end_headers(self):
		self.send_header("Cache-Control", "no-store")
		super().end_headers()


if __name__ == "__main__":
	with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler) as httpd:
		print(f"tinnulion.github.io → http://127.0.0.1:{PORT}/  (Ctrl-C to stop)")
		try:
			httpd.serve_forever()
		except KeyboardInterrupt:
			print("\nbye")

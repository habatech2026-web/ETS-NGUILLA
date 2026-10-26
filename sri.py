#!/usr/bin/env python3
"""Ajoute integrity (SHA-384) + crossorigin aux <script src="https://..."> de index.html.
Usage (avec Internet) :  python3 sri.py [index.html]
Idempotent : recalcule et remplace les attributs existants. Sauvegarde index.html.bak."""
import re, sys, base64, hashlib, shutil, urllib.request

path = sys.argv[1] if len(sys.argv) > 1 else "index.html"
html = open(path, encoding="utf-8").read()
pat = re.compile(r'<script\b([^>]*?\bsrc="(https://[^"]+)"[^>]*)>')

def sri(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    data = urllib.request.urlopen(req, timeout=30).read()
    return "sha384-" + base64.b64encode(hashlib.sha384(data).digest()).decode()

def fix(m):
    attrs, url = m.group(1), m.group(2)
    attrs = re.sub(r'\s+(integrity|crossorigin)="[^"]*"', "", attrs)
    h = sri(url)
    print("OK ", h[:24] + "…", url)
    return f'<script{attrs} integrity="{h}" crossorigin="anonymous">'

shutil.copy(path, path + ".bak")
open(path, "w", encoding="utf-8").write(pat.sub(fix, html))
print("Terminé :", path)

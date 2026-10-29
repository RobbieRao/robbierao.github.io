"""Activate the collector only after its real HTTPS endpoint has been deployed."""
import argparse
from pathlib import Path
import re
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("endpoint")
args = parser.parse_args()
url = urlsplit(args.endpoint)
if url.scheme != "https" or not url.hostname or not url.hostname.endswith(".workers.dev") or url.path != "/collect" or url.query or url.fragment or url.username or url.port:
    parser.error("Expected a deployed https://<worker>.<account>.workers.dev/collect endpoint")
pages = [ROOT / "site/index.html", ROOT / "site/cv/index.html", *sorted((ROOT / "site/design").glob("*/index.html"))]
for page in pages:
    source = page.read_text()
    source = re.sub(r'\s*<script id="site-analytics"[^>]*></script>', '', source)
    source = source.replace('</body>', f'  <script id="site-analytics" defer src="/assets/analytics.js" data-endpoint="{args.endpoint}"></script>\n</body>')
    if 'href="/privacy/"' not in source:
        source = source.replace('</p></footer>', ' · <a href="/privacy/">Privacy</a></p></footer>') if page.name == 'index.html' else source
        if 'href="/privacy/"' not in source:
            source = source.replace('<p><a href="/cv/">CV</a> · <a href="https://github.com/RobbieRao">GitHub</a></p>', '<p><a href="/cv/">CV</a> · <a href="https://github.com/RobbieRao">GitHub</a> · <a href="/privacy/">Privacy</a></p>')
    page.write_text(source)
print(f"Enabled private analytics on {len(pages)} content pages.")

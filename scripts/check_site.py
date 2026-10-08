"""Validate the static Pages artifact before it is uploaded."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import sys

ROOT = Path(__file__).resolve().parents[1] / "site"


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.references = []
        self.errors = []
        self.has_title = False
        self.has_viewport = False
        self.has_language = False

    def handle_starttag(self, tag, pairs):
        attrs = dict(pairs)
        if "id" in attrs:
            if attrs["id"] in self.ids:
                self.errors.append(f"duplicate id: {attrs['id']}")
            self.ids.add(attrs["id"])
        for attribute in ("href", "src"):
            if attrs.get(attribute):
                self.references.append(attrs[attribute])
        if tag == "html":
            self.has_language = bool(attrs.get("lang"))
        if tag == "title":
            self.has_title = True
        if tag == "meta" and attrs.get("name") == "viewport":
            self.has_viewport = True
        if tag == "img" and not attrs.get("alt"):
            self.errors.append("image missing alt text")


pages = {}
errors = []
for path in ROOT.rglob("*.html"):
    page = Page()
    source = path.read_text()
    page.feed(source)
    if "{{" in source or "{%" in source:
        page.errors.append("unrendered template expression")
    for key in ("has_title", "has_viewport", "has_language"):
        if not getattr(page, key):
            page.errors.append(f"missing {key.removeprefix('has_')}")
    pages[path] = page
    errors.extend(f"{path.relative_to(ROOT)}: {e}" for e in page.errors)

for path, page in pages.items():
    for ref in page.references:
        parsed = urlsplit(ref)
        if parsed.scheme or parsed.netloc:
            continue
        destination = unquote(parsed.path)
        if destination.startswith("/"):
            target = ROOT / destination.lstrip("/")
        elif destination:
            target = path.parent / destination
        else:
            target = path
        if target.is_dir():
            target = target / "index.html"
        target = target.resolve()
        if not target.is_relative_to(ROOT.resolve()) or not target.is_file():
            errors.append(f"{path.relative_to(ROOT)}: broken local reference {ref}")
        elif parsed.fragment and target in pages and unquote(parsed.fragment) not in pages[target].ids:
            errors.append(f"{path.relative_to(ROOT)}: missing anchor {ref}")

if errors:
    print("\n".join(errors), file=sys.stderr)
    sys.exit(1)
print(f"Validated {len(pages)} HTML pages: metadata, images, local files, and anchors.")

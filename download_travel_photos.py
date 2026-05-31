#!/usr/bin/env python3
"""Download non-Wiki travel photos and update assets/travel_photo_meta.js."""
import json
import mimetypes
import os
import re
import ssl
import time
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
META_PATH = ASSETS / "travel_photo_meta.js"
PHOTOS_DIR = ASSETS / "photos" / "travel"
BLOCKED_HOST_PARTS = ("wikipedia.org", "wikimedia.org", "wikimedia.org", "wikimedia.commons")


def load_js(path):
    raw = path.read_text(encoding="utf-8")
    return json.loads(raw[raw.index("{") : raw.rindex("}") + 1])


def save_js(path, obj_name, data):
    path.write_text(
        f"window.{obj_name} = {json.dumps(data, ensure_ascii=False, separators=(',', ':'))};\n",
        encoding="utf-8",
    )


def is_blocked(url):
    lower = (url or "").lower()
    return any(part in lower for part in BLOCKED_HOST_PARTS)


def extension_from_response(url, response):
    content_type = response.headers.get("Content-Type", "").split(";")[0].strip().lower()
    ext = mimetypes.guess_extension(content_type) or Path(urllib.request.urlparse(url).path).suffix
    if ext in (".jpe", ".jpeg"):
        return ".jpg"
    if ext in (".jpg", ".png", ".webp", ".gif"):
        return ext
    return ".jpg"


def download(url, timeout=20):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131 Safari/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "Referer": "https://www.google.com/",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as response:
        data = response.read()
        ext = extension_from_response(url, response)
        return data, ext


def main():
    PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
    meta = load_js(META_PATH)
    downloaded = 0
    skipped = 0
    failed = []

    for index, tid in enumerate(sorted(meta, key=lambda value: int(re.sub(r"\D", "", value) or 0)), 1):
        item = meta[tid]
        image_url = item.get("imageUrl", "")
        current = item.get("localImageUrl", "")
        if current and (ROOT / current).exists():
            skipped += 1
            continue
        if not image_url or is_blocked(image_url):
            item["localImageUrl"] = ""
            failed.append((tid, "blocked-or-empty", image_url))
            continue

        try:
            print(f"[{index}/{len(meta)}] {tid} download...", flush=True)
            data, ext = download(image_url)
            if len(data) < 4096:
                raise ValueError(f"image too small: {len(data)} bytes")
            out_path = PHOTOS_DIR / f"{tid}{ext}"
            out_path.write_bytes(data)
            item["localImageUrl"] = str(out_path.relative_to(ROOT))
            downloaded += 1
            time.sleep(0.2)
        except Exception as exc:
            item["localImageUrl"] = ""
            failed.append((tid, str(exc), image_url))

    save_js(META_PATH, "TRAVEL_PHOTO_META", meta)
    print(f"downloaded={downloaded} skipped={skipped} failed={len(failed)}")
    for tid, reason, url in failed[:40]:
        print(f"FAILED {tid}: {reason} {url}")


if __name__ == "__main__":
    main()

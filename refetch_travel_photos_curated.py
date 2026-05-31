#!/usr/bin/env python3
"""Refetch travel photos from reliable Japanese travel/photo pages, avoiding Wiki."""
import html
import json
import mimetypes
import re
import ssl
import time
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
META_PATH = ASSETS / "travel_photo_meta.js"
DATA_PATH = ASSETS / "travel_data.js"
PHOTO_DIR = ASSETS / "photos" / "travel"

BLOCKED = (
    "wikipedia.org",
    "wikimedia.org",
    "openstreetmap",
    "staticmap",
    "google.com/maps",
    "facebook.com",
    "instagram.com",
    "youtube.com",
    "x.com",
    "twitter.com",
)

BAD_IMAGE_HINTS = (
    "logo",
    "noimage",
    "no_image",
    "web_clip",
    "icon",
    "sprite",
    "banner",
    "bnr_",
    "ajax_loader",
    "loading",
    "avatar",
    "usericon",
    "profile",
    "map",
    "staticmap",
)

PREFERRED_DOMAINS = (
    "kanko",
    "guide",
    "tourism",
    "city.",
    "town.",
    "pref.",
    "tochigiji.or.jp",
    "gunma-kanko.jp",
    "ibarakiguide.jp",
    "maruchiba.jp",
    "chiba-kanko.jp",
    "yamanashi-kankou.jp",
    "shizuoka",
    "enjoy-minakami.jp",
    "e-tabi.org",
    "nrtk.jp",
    "jalan.net",
    "rurubu.jp",
    "travel.rakuten",
    "gltjp.com",
    "tabi-mag.jp",
    "photohito.com",
    "photo-ac.com",
    "flickr.com/photos",
)

MANUAL = {
    "T033": {
        "query": "青梅 昭和レトロ 街並み",
        "page": "https://www.omekanko.gr.jp/",
    },
}


def load_js(path):
    raw = path.read_text(encoding="utf-8")
    return json.loads(raw[raw.index("{") : raw.rindex("}") + 1])


def save_js(path, obj_name, data):
    path.write_text(
        f"window.{obj_name} = {json.dumps(data, ensure_ascii=False, separators=(',', ':'))};\n",
        encoding="utf-8",
    )


def blocked(url):
    lower = (url or "").lower()
    return any(part in lower for part in BLOCKED)


def bad_image(url):
    lower = (url or "").lower()
    return blocked(url) or any(part in lower for part in BAD_IMAGE_HINTS)


def fetch(url, timeout=15, binary=False):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131 Safari/537.36",
            "Accept": "*/*",
            "Accept-Language": "ja,en;q=0.8",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as res:
        data = res.read()
        if binary:
            return data, res.headers
        for enc in ("utf-8", "shift-jis", "euc-jp", "iso-2022-jp"):
            try:
                return data.decode(enc), res.headers
            except UnicodeDecodeError:
                pass
        return data.decode("utf-8", "replace"), res.headers


def absolutize(url, base):
    url = html.unescape(url or "").strip()
    if url.startswith("//"):
        return "https:" + url
    return urllib.parse.urljoin(base, url)


def image_candidates(page_url):
    try:
        body, _ = fetch(page_url)
    except Exception:
        return []
    candidates = []
    patterns = (
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
        r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']twitter:image["\']',
    )
    for pat in patterns:
        candidates.extend(absolutize(match, page_url) for match in re.findall(pat, body, re.I))
    img_patterns = (
        r'<img[^>]+(?:src|data-src|data-original)=["\']([^"\']+)["\']',
        r'background-image:\s*url\(["\']?([^"\')]+)',
    )
    for pat in img_patterns:
        candidates.extend(absolutize(match, page_url) for match in re.findall(pat, body, re.I))
    seen = set()
    clean = []
    for item in candidates:
        if item in seen or bad_image(item):
            continue
        seen.add(item)
        clean.append(item)
    return clean


def bing_results(query, limit=8):
    url = "https://www.bing.com/search?" + urllib.parse.urlencode({"q": query, "mkt": "ja-JP", "count": limit})
    try:
        body, _ = fetch(url)
    except Exception:
        return []
    urls = []
    for match in re.findall(r'<a\s+href="(https?://[^"]+)"', body):
        match = html.unescape(match)
        if blocked(match):
            continue
        if any(skip in match for skip in ("bing.com", "microsoft.com", "go.microsoft")):
            continue
        urls.append(match)
    seen = []
    for item in urls:
        if item not in seen:
            seen.append(item)
    return seen[:limit]


def page_score(url, spot):
    lower = url.lower()
    score = 0
    if any(domain in lower for domain in PREFERRED_DOMAINS):
        score += 40
    if spot["name_ja"] in urllib.parse.unquote(url):
        score += 25
    if spot.get("area") and spot["area"] in urllib.parse.unquote(url):
        score += 10
    if "flickr.com/photos/tags" in lower:
        score += 10
    if any(domain in lower for domain in ("photo-ac.com", "pixta.jp")):
        score -= 8
    return score


def ext_from(headers, url):
    content_type = headers.get("Content-Type", "").split(";")[0].strip().lower()
    ext = mimetypes.guess_extension(content_type) or Path(urllib.parse.urlparse(url).path).suffix
    if ext in (".jpeg", ".jpe"):
        return ".jpg"
    if ext in (".jpg", ".png", ".webp"):
        return ext
    return ".jpg"


def download_image(url, tid):
    data, headers = fetch(url, binary=True)
    if len(data) < 12000:
        raise ValueError("image too small")
    ext = ext_from(headers, url)
    out = PHOTO_DIR / f"{tid}{ext}"
    out.write_bytes(data)
    return str(out.relative_to(ROOT))


def find_photo(spot):
    tid = spot["travel_id"]
    queries = [
        f'"{spot["name_ja"]}" {spot["prefecture"]} 観光 写真',
        f'"{spot["name_ja"]}" {spot.get("area","")} 写真',
        f'"{spot["name_ja"]}" PHOTOHITO Flickr',
    ]
    if tid in MANUAL:
        queries.insert(0, f'"{MANUAL[tid]["query"]}" 写真')
    pages = []
    for query in queries:
        pages.extend(bing_results(query))
        time.sleep(0.25)
    if tid in MANUAL and MANUAL[tid].get("page"):
        pages.insert(0, MANUAL[tid]["page"])
    pages = sorted(set(pages), key=lambda url: page_score(url, spot), reverse=True)
    for page in pages[:10]:
        for image in image_candidates(page)[:8]:
            try:
                local = download_image(image, tid)
                return {
                    "imageUrl": image,
                    "localImageUrl": local,
                    "photoSource": urllib.parse.urlparse(page).netloc.replace("www.", ""),
                    "matchedQuery": spot["name_ja"],
                    "photoPage": page,
                }
            except Exception:
                continue
    return None


def main():
    PHOTO_DIR.mkdir(parents=True, exist_ok=True)
    travel_data = load_js(DATA_PATH)
    meta = load_js(META_PATH)
    spots = travel_data.get("spots", [])
    updated = 0
    failed = []
    for index, spot in enumerate(spots, 1):
        tid = spot["travel_id"]
        print(f"[{index}/{len(spots)}] {tid} {spot['name_ja']}", flush=True)
        found = find_photo(spot)
        if found:
            meta[tid] = found
            updated += 1
            print(f"  -> {found['photoSource']} {found['localImageUrl']}")
        else:
            failed.append(tid)
            print("  !! no replacement")
    save_js(META_PATH, "TRAVEL_PHOTO_META", meta)
    print(f"updated={updated} failed={len(failed)} {failed}")


if __name__ == "__main__":
    main()

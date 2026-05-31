"""
Fill in missing photos for spots that don't have images yet.
Strategy:
  1. Download existing Wikipedia images locally (spots with imageUrl but no localImageUrl)
  2. For spots with no image at all, search Wikipedia/Wikimedia Commons
  3. Update both photo_meta_cache.json and photo_meta.js
"""
import json
import os
import re
import time
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path

DATA_JS = Path("assets/data.js")
CACHE = Path("assets/photo_meta_cache.json")
OUT = Path("assets/photo_meta.js")
OUT_DIR = Path("assets/photos/ganref")
USER_AGENT = "TokyoKantoPhotoSpotsLocalPage/1.0 (personal local project)"


REPLACEMENTS = {
    "东京": "東京", "公园": "公園", "庭园": "庭園", "横滨": "横浜",
    "稻": "稲", "丰": "豊", "滨": "浜", "涩": "渋", "鹤": "鶴",
    "站": "駅", "镰": "鎌", "仓": "倉", "茨": "茨", "筑": "筑",
    "桜": "桜", "桥": "橋", "岛": "島", "临": "臨", "宫": "宮",
    "离": "離", "关": "関", "茂": "茂",
}


def clean(text):
    return re.sub(r"\s+", " ", str(text or "")).strip()


def ja_variant(text):
    value = clean(text)
    for old, new in REPLACEMENTS.items():
        value = value.replace(old, new)
    return value


def split_name(name):
    return [clean(part) for part in re.split(r"[/／・,，]", clean(name)) if clean(part)]


def read_spots():
    text = DATA_JS.read_text(encoding="utf-8")
    payload = text.removeprefix("window.PHOTO_SPOTS_DATA = ").rstrip(";\n")
    return json.loads(payload)["spots"]


def read_meta():
    return json.loads(CACHE.read_text(encoding="utf-8"))


def write_meta(meta):
    CACHE.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT.write_text(
        "window.PHOTO_SPOTS_PHOTOS = "
        + json.dumps(meta, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )


def maps_url(spot):
    query = " ".join(
        clean(value)
        for value in [spot.get("地点"), spot.get("区域"), spot.get("都县"), "日本"]
        if clean(value)
    )
    return "https://www.google.com/maps/search/?api=1&query=" + urllib.parse.quote(query)


def photo_search_url(spot):
    query = " ".join(
        clean(value)
        for value in [spot.get("地点"), spot.get("区域"), spot.get("都县"), "写真"]
        if clean(value)
    )
    return "https://www.google.com/search?tbm=isch&q=" + urllib.parse.quote(query)


def fetch_bytes(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=20) as response:
        return response.read()


def wiki_api(params):
    url = "https://ja.wikipedia.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=12) as response:
        return json.loads(response.read().decode("utf-8"))


def commons_api(params):
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=12) as response:
        return json.loads(response.read().decode("utf-8"))


def download_to_local(image_url, spot_id):
    """Download a remote image to the local ganref directory."""
    ext = os.path.splitext(urllib.parse.urlparse(image_url).path)[1].lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp"):
        ext = ".jpg"
    target = OUT_DIR / f"{spot_id}{ext}"
    if target.exists() and target.stat().st_size > 1024:
        return str(target).replace("\\", "/")
    try:
        data = fetch_bytes(image_url)
        target.write_bytes(data)
        time.sleep(0.15)
        print(f"  Downloaded -> {target} ({len(data)} bytes)")
        return str(target).replace("\\", "/")
    except Exception as e:
        print(f"  Download failed: {e}")
        return None


def search_wikipedia_image(queries):
    """Try to find an image on Japanese Wikipedia using title lookups."""
    # First try exact title lookup
    for query in queries[:8]:
        try:
            data = wiki_api({
                "action": "query", "format": "json",
                "titles": query,
                "prop": "pageimages|info",
                "piprop": "thumbnail", "pithumbsize": 1000,
                "inprop": "url",
            })
            for page in data.get("query", {}).get("pages", {}).values():
                if "missing" in page:
                    continue
                thumb = page.get("thumbnail", {}).get("source")
                if thumb:
                    return {
                        "imageUrl": thumb,
                        "photoPage": page.get("fullurl"),
                        "photoTitle": page.get("title"),
                        "photoSource": "Wikipedia",
                        "matchedQuery": query,
                    }
        except Exception:
            time.sleep(0.5)
            continue
    return None


def search_commons_image(queries):
    """Try to find an image on Wikimedia Commons."""
    for query in queries[:5]:
        try:
            data = commons_api({
                "action": "query", "format": "json",
                "generator": "search", "gsrnamespace": 6,
                "gsrsearch": query, "gsrlimit": 5,
                "prop": "imageinfo",
                "iiprop": "url|extmetadata",
                "iiurlwidth": 1000,
                "origin": "*",
            })
            pages = data.get("query", {}).get("pages", {})
            ranked = sorted(pages.values(), key=lambda p: p.get("index", 99))
            for page in ranked:
                infos = page.get("imageinfo") or []
                if not infos:
                    continue
                info = infos[0]
                return {
                    "imageUrl": info.get("thumburl") or info.get("url"),
                    "photoPage": info.get("descriptionurl"),
                    "photoTitle": page.get("title", "").replace("File:", ""),
                    "photoSource": "Wikimedia Commons",
                    "license": (
                        (info.get("extmetadata", {}).get("LicenseShortName", {}) or {}).get("value")
                    ),
                    "matchedQuery": query,
                }
        except Exception:
            time.sleep(0.5)
            continue
    return None


def build_queries(spot):
    """Build a list of Japanese search queries for the spot."""
    name = clean(spot.get("地点"))
    area = clean(spot.get("区域"))
    pref = clean(spot.get("都县"))
    queries = []
    # Individual name parts (Japanese)
    for part in split_name(name):
        jp = ja_variant(part)
        if jp not in queries:
            queries.append(jp)
    # Full name + area
    full_jp = ja_variant(name)
    if full_jp not in queries:
        queries.append(full_jp)
    # Name + area combined
    area_jp = ja_variant(area) if area else ""
    pref_jp = ja_variant(pref) if pref else ""
    q = f"{full_jp} {area_jp}".strip()
    if q and q not in queries:
        queries.append(q)
    q2 = f"{full_jp} {pref_jp}".strip()
    if q2 and q2 not in queries:
        queries.append(q2)
    return [q for q in queries if q]


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    spots_list = read_spots()
    spots = {str(s["ID"]): s for s in spots_list}
    meta = read_meta()

    # --- Step 1: Download existing Wikipedia images locally ---
    print("=" * 60)
    print("Step 1: 下载已有 Wikipedia 图片到本地")
    print("=" * 60)
    download_count = 0
    for sid, v in sorted(meta.items(), key=lambda x: int(x[0])):
        if v.get("localImageUrl"):
            continue
        if not v.get("imageUrl"):
            continue
        spot = spots.get(sid, {})
        print(f"ID={sid}: {spot.get('地点')} ({v.get('photoSource')})")
        local = download_to_local(v["imageUrl"], sid)
        if local:
            v["localImageUrl"] = local
            v["imageUrl"] = local  # update to use local path
            download_count += 1

    write_meta(meta)
    print(f"本地下载完成: {download_count} 张\n")

    # --- Step 2: Find images for spots with none ---
    print("=" * 60)
    print("Step 2: 为完全无图的地点搜索图片")
    print("=" * 60)
    total_found = 0
    for sid, v in sorted(meta.items(), key=lambda x: int(x[0])):
        if v.get("imageUrl"):
            continue
        spot = spots.get(sid, {})
        name = spot.get("地点", "?")
        print(f"\nID={sid}: {name} | {spot.get('区域', '?')} | {spot.get('都县', '?')}")

        # Ensure base URLs
        if not v.get("mapsUrl"):
            v["mapsUrl"] = maps_url(spot)
        if not v.get("photoSearchUrl"):
            v["photoSearchUrl"] = photo_search_url(spot)

        queries = build_queries(spot)
        print(f"  Queries: {queries[:5]}")

        # Try Wikipedia first
        found = search_wikipedia_image(queries)
        if not found:
            print("  Wikipedia: not found, trying Commons...")
            found = search_commons_image(queries)
        else:
            print(f"  Wikipedia: {found['photoTitle']}")

        if not found:
            print("  Commons: not found")
            continue

        # Download locally
        print(f"  Image: {found['imageUrl'][:100]}...")
        local = download_to_local(found["imageUrl"], sid)
        if local:
            found["localImageUrl"] = local
            found["imageUrl"] = local
        v.update(found)
        total_found += 1
        write_meta(meta)
        time.sleep(0.3)

    write_meta(meta)

    # --- Summary ---
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    total = len(meta)
    with_image = sum(1 for v in meta.values() if v.get("imageUrl"))
    with_local = sum(1 for v in meta.values() if v.get("localImageUrl"))
    still_missing = total - with_image
    print(f"总地点: {total}")
    print(f"有图片: {with_image}  (本地: {with_local})")
    print(f"仍缺: {still_missing}")
    if still_missing > 0:
        print("仍缺图片的地点:")
        for sid, v in sorted(meta.items(), key=lambda x: int(x[0])):
            if not v.get("imageUrl"):
                spot = spots.get(sid, {})
                print(f"  ID={sid}: {spot.get('地点', '?')}")


if __name__ == "__main__":
    main()

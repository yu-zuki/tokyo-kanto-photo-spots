#!/usr/bin/env python3
"""
Fetch Google Maps place photos as primary image source.
GMaps photos are tagged to specific places → high accuracy.
Falls back to og:image from travel sites if no GMaps photo found.
"""
import json, time, urllib.request, urllib.parse, os, re, ssl

DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(DIR, "assets")
ctx = ssl.create_default_context()

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

def load_js(path):
    raw = open(path, encoding="utf-8").read()
    return json.loads(raw[raw.index("{"):raw.rindex("}")+1])

def save_js(path, obj_name, data):
    js = f"window.{obj_name} = {json.dumps(data, ensure_ascii=False, separators=(',', ':'))};\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(js)

def fetch(url, timeout=12):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "ja,en;q=0.9"})
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
            return r.read().decode("utf-8", errors="replace")
    except:
        return None

def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15, context=ctx) as r:
            return json.loads(r.read())
    except:
        return None

def check_image(url):
    if not url or not url.startswith("http"):
        return False
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=8, context=ctx) as r:
            return r.status == 200 and int(r.headers.get("Content-Length", 0)) > 2000
    except:
        return False

def extract_gmaps_photos(html):
    """Extract Google Maps place photo URLs from page HTML."""
    if not html:
        return []
    # GMaps photos: https://lh5.googleusercontent.com/p/...=wXXX-hXXX-k-no
    # Or: https://streetviewpixels-pa.googleapis.com/...
    photos = set()
    for pat in [
        r'https://lh5\.googleusercontent\.com/p/[^"\'\s\\]+',
        r'https://lh3\.googleusercontent\.com/p/[^"\'\s\\]+',
    ]:
        for m in re.finditer(pat, html):
            url = m.group(0)
            # Clean up: remove escaped characters, add size param
            url = url.replace('\\u003d', '=').rstrip('\\')
            if '=w' not in url:
                url += '=w800-h600-k-no'
            photos.add(url)
    return list(photos)[:5]

def get_gmaps_photo(name, pref):
    """Get a photo from Google Maps place page."""
    query = urllib.parse.quote(f"{name} {pref}")
    html = fetch(f"https://www.google.com/maps/search/{query}")
    if html:
        photos = extract_gmaps_photos(html)
        for p in photos:
            if check_image(p):
                return p
    return None

def get_wikipedia_official_url(spot_name):
    """Get official website URL from Wikidata. Returns (url, None) or (None, None)."""
    # Search
    data = fetch_json(
        "https://ja.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
        urllib.parse.quote(spot_name) + "&format=json&srlimit=2"
    )
    if not data: return None
    pages = data.get("query", {}).get("search", [])
    if not pages: return None
    title = pages[0]["title"]

    # Get Wikidata ID
    time.sleep(0.5)
    data = fetch_json(
        "https://ja.wikipedia.org/w/api.php?action=query&titles=" +
        urllib.parse.quote(title) + "&prop=pageprops&format=json"
    )
    if not data: return None
    for p in data.get("query", {}).get("pages", {}).values():
        wd_id = p.get("pageprops", {}).get("wikibase_item")
        if not wd_id: continue
        time.sleep(0.3)
        wd_data = fetch_json(f"https://www.wikidata.org/wiki/Special:EntityData/{wd_id}.json")
        if not wd_data: continue
        claims = wd_data.get("entities", {}).get(wd_id, {}).get("claims", {})
        for claim in claims.get("P856", []):
            url = claim.get("mainsnak", {}).get("datavalue", {}).get("value")
            if url and url.startswith("http"):
                return url
    return None

def og_image(html):
    if not html: return None
    for p in [r'property="og:image"\s+content="([^"]+)"', r'content="([^"]+)"\s+property="og:image"']:
        m = re.search(p, html)
        if m and m.group(1).startswith("http"):
            return m.group(1)
    return None

def main():
    travel_data = load_js(os.path.join(ASSETS, "travel_data.js"))
    spots = travel_data.get("spots", [])
    photo_meta = load_js(os.path.join(ASSETS, "travel_photo_meta.js"))

    # Fix ALL spots
    to_fix = [(s["travel_id"], s["name_ja"], s["prefecture"]) for s in spots]

    print(f"Fetching Google Maps photos for {len(to_fix)} spots...\n")
    print("Priority: 1) Official site og:image  2) Google Maps photos\n")

    stats = {"公式og:image": 0, "Google Maps写真": 0, "Google Maps参照": 0}

    for i, (tid, name, pref) in enumerate(to_fix):
        print(f"[{i+1:3d}/{len(to_fix)}] {tid} {name[:28]}", end="", flush=True)
        img_url = ""
        source = ""
        page_url = f"https://www.google.com/maps/search/{urllib.parse.quote(name+' '+pref)}"

        # Step 1: Try official site og:image (from Wikidata URL)
        official_url = get_wikipedia_official_url(name)
        if official_url:
            html = fetch(official_url)
            img = og_image(html)
            if img and check_image(img):
                img_url = img
                source = "公式サイト"
                page_url = official_url
                stats["公式og:image"] += 1
                print(" ✓公式", flush=True)
                time.sleep(0.5)
            else:
                print(" 公式✗", end="", flush=True)
        else:
            print("  ", end="", flush=True)

        # Step 2: Google Maps photo
        if not img_url:
            gmaps_img = get_gmaps_photo(name, pref)
            if gmaps_img:
                img_url = gmaps_img
                source = "Google Maps写真"
                stats["Google Maps写真"] += 1
                print(" ✓Maps", flush=True)
            else:
                source = "Google Maps"
                stats["Google Maps参照"] += 1
                print(" →参照", flush=True)

        photo_meta[tid] = {
            "imageUrl": img_url,
            "localImageUrl": "",
            "photoSource": source,
            "matchedQuery": name,
            "photoPage": page_url
        }

        time.sleep(0.3)

    save_js(os.path.join(ASSETS, "travel_photo_meta.js"), "TRAVEL_PHOTO_META", photo_meta)

    has_img = sum(1 for v in photo_meta.values() if v.get("imageUrl"))
    print(f"\n=== Results ===")
    for s, c in sorted(stats.items()):
        print(f"  {s}: {c}")
    print(f"  With image URL: {has_img}/{len(to_fix)}")

if __name__ == "__main__":
    main()

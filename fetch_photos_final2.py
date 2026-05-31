#!/usr/bin/env python3
"""
Final photo strategy:
1. Wikipedia/Wikidata → official website og:image (accurate, from source)
2. OpenStreetMap static map image from coordinates (always correct)
Card links to Google Maps for real photos.
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
    req = urllib.request.Request(url, headers={"User-Agent": "TokyoKantoTravelNote/5.0", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15, context=ctx) as r:
            return json.loads(r.read())
    except:
        return None

def check_image(url):
    if not url or not url.startswith("http"): return False
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=8, context=ctx) as r:
            return r.status == 200 and int(r.headers.get("Content-Length", 0)) > 2000
    except: return False

def og_image(html):
    if not html: return None
    for p in [r'property="og:image"\s+content="([^"]+)"', r'content="([^"]+)"\s+property="og:image"']:
        m = re.search(p, html)
        if m and m.group(1).startswith("http"): return m.group(1)
    return None

def get_official_url(spot_name):
    """Get official website from Wikidata via Wikipedia."""
    data = fetch_json("https://ja.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
                      urllib.parse.quote(spot_name) + "&format=json&srlimit=2")
    if not data: return None
    pages = data.get("query", {}).get("search", [])
    if not pages: return None
    title = pages[0]["title"]

    time.sleep(0.5)
    data = fetch_json("https://ja.wikipedia.org/w/api.php?action=query&titles=" +
                      urllib.parse.quote(title) + "&prop=pageprops&format=json")
    if not data: return None
    for p in data.get("query", {}).get("pages", {}).values():
        wd_id = p.get("pageprops", {}).get("wikibase_item")
        if not wd_id: continue
        time.sleep(0.3)
        wd_data = fetch_json(f"https://www.wikidata.org/wiki/Special:EntityData/{wd_id}.json")
        if not wd_data: continue
        for claim in wd_data.get("entities", {}).get(wd_id, {}).get("claims", {}).get("P856", []):
            url = claim.get("mainsnak", {}).get("datavalue", {}).get("value")
            if url and url.startswith("http"): return url
    return None

def static_map_url(lat, lng):
    """Generate OpenStreetMap static map image URL with marker."""
    if not lat or not lng: return ""
    # Use a static map service that includes a marker
    zoom = 14
    return (f"https://staticmap.openstreetmap.de/staticmap.php"
            f"?center={lat},{lng}&zoom={zoom}&size=400x280&maptype=mapnik"
            f"&markers={lat},{lng},red-pushpin")

def main():
    travel_data = load_js(os.path.join(ASSETS, "travel_data.js"))
    spots = travel_data.get("spots", [])
    photo_meta = load_js(os.path.join(ASSETS, "travel_photo_meta.js"))
    loc_data = load_js(os.path.join(ASSETS, "travel_locations.js"))
    locations = loc_data.get("locations", {})

    to_fix = [(s["travel_id"], s["name_ja"], s["prefecture"]) for s in spots]

    print(f"Processing {len(to_fix)} spots...")
    print("1. Wikidata→公式サイトog:image  2. OpenStreetMap static map\n")

    stats = {"公式og:image": 0, "OSM static map": 0}

    for i, (tid, name, pref) in enumerate(to_fix):
        print(f"[{i+1:3d}/{len(to_fix)}] {tid} {name[:30]}", end="", flush=True)
        img_url = ""
        source = ""
        page_url = ""

        # Step 1: Official site og:image via Wikidata
        official_url = get_official_url(name)
        if official_url:
            html = fetch(official_url)
            img = og_image(html)
            if img and check_image(img):
                img_url = img
                source = "公式サイト"
                page_url = official_url
                stats["公式og:image"] += 1
                print(" ✓公式", flush=True)
            else:
                print(" 公式✗", end="", flush=True)
        else:
            print("      ", end="", flush=True)

        # Step 2: OpenStreetMap static map from coordinates
        if not img_url:
            loc = locations.get(tid, {})
            lat, lng = loc.get("lat"), loc.get("lng")
            img_url = static_map_url(lat, lng)
            source = "OpenStreetMap"
            page_url = f"https://www.google.com/maps/@{lat},{lng},15z" if lat and lng else ""
            stats["OSM static map"] += 1
            print(" ✓地図", flush=True)

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
    print(f"  Total with image: {has_img}/{len(to_fix)}")

if __name__ == "__main__":
    main()

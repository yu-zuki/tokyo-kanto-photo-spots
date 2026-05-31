#!/usr/bin/env python3
"""
Final photo fetch: Wikipedia → Commons → Flickr (improved) → static map fallback.
Uses OpenStreetMap static map tiles as reliable fallback instead of wrong photos.
"""
import json, time, urllib.request, urllib.parse, os, re

DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(DIR, "assets")

def load_js(path):
    raw = open(path, encoding="utf-8").read()
    return json.loads(raw[raw.index("{"):raw.rindex("}")+1])

def save_js(path, obj_name, data):
    js = f"window.{obj_name} = {json.dumps(data, ensure_ascii=False, separators=(',', ':'))};\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(js)

def api_get(url, retries=2):
    req = urllib.request.Request(url, headers={"User-Agent": "TokyoKantoTravelNote/4.0"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read())
        except:
            if attempt < retries - 1: time.sleep(2)
    return None

# Source 1: Wikipedia infobox
def wiki_image(name):
    data = api_get(
        "https://ja.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
        urllib.parse.quote(name) + "&format=json&srlimit=3"
    )
    if not data: return None, None
    for page in data.get("query", {}).get("search", []):
        title = page["title"]
        img = api_get(
            "https://ja.wikipedia.org/w/api.php?action=query&titles=" +
            urllib.parse.quote(title) + "&prop=pageimages&format=json&pithumbsize=800"
        )
        if not img: continue
        for pid, p in img.get("query", {}).get("pages", {}).items():
            if pid == "-1": continue
            thumb = p.get("thumbnail", {})
            if thumb and thumb.get("source"):
                return thumb["source"], f"https://ja.wikipedia.org/wiki/{urllib.parse.quote(title)}"
    return None, None

# Source 2: Wikimedia Commons
def commons_image(name, pref):
    # Try with spot name only
    data = api_get(
        "https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=" +
        urllib.parse.quote(name) + "&format=json&srlimit=5&srnamespace=6"
    )
    if not data: return None, None
    valid_types = (".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG")
    for page in data.get("query", {}).get("search", []):
        title = page["title"]
        if not any(title.endswith(ext) for ext in valid_types):
            continue
        img = api_get(
            "https://commons.wikimedia.org/w/api.php?action=query&titles=" +
            urllib.parse.quote(title) + "&prop=imageinfo&format=json&iiprop=url&iiurlwidth=800"
        )
        if not img: continue
        for pid, p in img.get("query", {}).get("pages", {}).items():
            if pid == "-1": continue
            for ii in p.get("imageinfo", []):
                url = ii.get("thumburl") or ii.get("url", "")
                if url and any(url.lower().endswith(ext) for ext in valid_types):
                    return url, f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(title)}"
    return None, None

# Source 3: Flickr with multi-tag AND search
def flickr_search(name, pref):
    pref_short = pref.replace("県","").replace("東京都","東京")
    # Try precise tags first
    for tag_combo in [
        f"{name},{pref_short}",           # name + pref
        f"{name}",                         # just name
        f"{pref_short},{name.split('・')[0]}",  # pref + first part of name
    ]:
        url = "https://www.flickr.com/services/feeds/photos_public.gne?" + urllib.parse.urlencode({
            "tags": tag_combo, "tagmode": "all", "format": "json", "nojsoncallback": "1"
        })
        data = api_get(url)
        if data:
            items = data.get("items", [])
            if items and len(items) > 0:
                media = items[0].get("media", {}).get("m", "")
                if media:
                    img = re.sub(r"_\w\.jpg$", "_z.jpg", media)
                    return img, items[0].get("link", "")
        time.sleep(0.3)
    return None, None

# Source 4: Static map image from coordinates (always accurate)
def static_map_url(lat, lng):
    """OpenStreetMap-based static map showing the location."""
    if not lat or not lng:
        return None
    # Use a free tile server to generate static map
    # We'll construct a URL that shows the area around the coordinates
    # Using CartoDB/OpenStreetMap tiles via a static map service
    zoom = 13
    return f"https://staticmap.openstreetmap.de/staticmap.php?center={lat},{lng}&zoom={zoom}&size=400x300&maptype=mapnik&markers={lat},{lng},red-pushpin"

def main():
    travel_data = load_js(os.path.join(ASSETS, "travel_data.js"))
    spots = travel_data.get("spots", [])
    photo_meta = load_js(os.path.join(ASSETS, "travel_photo_meta.js"))
    loc_data = load_js(os.path.join(ASSETS, "travel_locations.js"))
    locations = loc_data.get("locations", {})

    # Identify spots that need fixing (non-Wikipedia, non-local)
    to_fix = []
    for spot in spots:
        tid = spot["travel_id"]
        meta = photo_meta.get(tid, {})
        source = meta.get("photoSource", "")
        local = meta.get("localImageUrl", "")
        if not local and source not in ("Wikipedia", "Wikimedia Commons"):
            to_fix.append((tid, spot["name_ja"], spot["prefecture"]))

    print(f"Fixing {len(to_fix)} spots...\n")
    stats = {"wiki": 0, "commons": 0, "flickr": 0, "staticmap": 0, "none": 0}

    for i, (tid, name, pref) in enumerate(to_fix):
        print(f"[{i+1}/{len(to_fix)}] {tid} {name[:30]}...", end=" ", flush=True)
        img_url = None
        page_url = None
        source = ""

        # 1. Wikipedia
        img_url, page_url = wiki_image(name)
        if img_url:
            source = "Wikipedia"
            stats["wiki"] += 1
            print("✓ Wiki")
        else:
            # 2. Wikimedia Commons
            time.sleep(0.3)
            img_url, page_url = commons_image(name, pref)
            if img_url:
                source = "Wikimedia Commons"
                stats["commons"] += 1
                print("✓ Commons")
            else:
                # 3. Flickr
                time.sleep(0.3)
                img_url, page_url = flickr_search(name, pref)
                if img_url:
                    source = "Flickr"
                    stats["flickr"] += 1
                    print("✓ Flickr")
                else:
                    # 4. Static map from coordinates (reliable fallback)
                    loc = locations.get(tid, {})
                    lat, lng = loc.get("lat"), loc.get("lng")
                    if lat and lng:
                        img_url = static_map_url(lat, lng)
                        page_url = f"https://www.google.com/maps/@{lat},{lng},14z"
                        source = "StaticMap"
                        stats["staticmap"] += 1
                        print("→ StaticMap")
                    else:
                        source = "None"
                        stats["none"] += 1
                        print("✗ none")

        photo_meta[tid] = {
            "imageUrl": img_url or "",
            "localImageUrl": "",
            "photoSource": source,
            "matchedQuery": name,
            "photoPage": page_url or f"https://www.google.com/maps/search/{urllib.parse.quote(name+' '+pref)}"
        }
        time.sleep(0.6)

    save_js(os.path.join(ASSETS, "travel_photo_meta.js"), "TRAVEL_PHOTO_META", photo_meta)

    # Final stats
    final = {}
    has_img = 0
    no_img = 0
    for v in photo_meta.values():
        s = v.get("photoSource", "unknown")
        final[s] = final.get(s, 0) + 1
        if v.get("imageUrl"):
            has_img += 1
        else:
            no_img += 1

    print(f"\n=== Final Result ===")
    for s, c in sorted(final.items()):
        print(f"  {s}: {c}")
    print(f"  With image: {has_img}")
    print(f"  Without image: {no_img}")

if __name__ == "__main__":
    main()

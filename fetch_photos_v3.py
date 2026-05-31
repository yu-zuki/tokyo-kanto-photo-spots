#!/usr/bin/env python3
"""
Fetch accurate photos for travel spots. Multi-source strategy:
1. Wikipedia infobox (most accurate) → already fixed 34 spots
2. Wikimedia Commons search
3. Flickr text+tags search with prefecture filter
4. Google Maps link (last resort, card shows no image)
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

def wiki_api(params):
    """Call Wikipedia/Commons API."""
    base = "https://ja.wikipedia.org/w/api.php"
    if params.get("_c"):
        base = "https://commons.wikimedia.org/w/api.php"
        del params["_c"]
    url = base + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "TokyoKantoTravelNote/3.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except:
        return None

def get_wiki_image(name, pref):
    """Get infobox image from Japanese Wikipedia."""
    data = wiki_api({"action": "query", "list": "search", "srsearch": name, "format": "json", "srlimit": 3})
    if not data: return None, None
    for page in data.get("query", {}).get("search", []):
        img = wiki_api({"action": "query", "titles": page["title"], "prop": "pageimages", "format": "json", "pithumbsize": 800})
        if not img: continue
        for pid, p in img.get("query", {}).get("pages", {}).items():
            if pid == "-1": continue
            thumb = p.get("thumbnail", {})
            if thumb and thumb.get("source"):
                return thumb["source"], f"https://ja.wikipedia.org/wiki/{urllib.parse.quote(page['title'])}"
    return None, None

def get_commons_image(name, pref):
    """Search Wikimedia Commons."""
    data = wiki_api({"_c": True, "action": "query", "list": "search", "srsearch": f"{name}", "format": "json", "srlimit": 5, "srnamespace": 6})
    if not data: return None, None
    for page in data.get("query", {}).get("search", []):
        img = wiki_api({"_c": True, "action": "query", "titles": page["title"], "prop": "imageinfo", "format": "json", "iiprop": "url", "iiurlwidth": 800})
        if not img: continue
        for pid, p in img.get("query", {}).get("pages", {}).items():
            if pid == "-1": continue
            for ii in p.get("imageinfo", []):
                url = ii.get("thumburl") or ii.get("url")
                if url and not url.endswith(".svg") and not url.endswith(".pdf"):
                    return url, f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(page['title'])}"
    return None, None

def flickr_search_better(name, pref, retries=2):
    """Better Flickr search using tagmode=all with multiple relevant tags."""
    # Build smart tags: spot name + prefecture (no 県/都/府 suffix)
    pref_short = pref.replace("県","").replace("東京都","東京").replace("京都府","京都").replace("大阪府","大阪")
    tags = [name, pref, pref_short, "日本", "Japan"]
    tag_str = ",".join(tags[:4])  # Use first 4 tags
    url = "https://www.flickr.com/services/feeds/photos_public.gne?" + urllib.parse.urlencode({
        "tags": tag_str, "tagmode": "all", "format": "json", "nojsoncallback": "1"
    })
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read())
                items = data.get("items", [])
                if items:
                    media = items[0].get("media", {}).get("m", "")
                    img = re.sub(r"_\w\.jpg$", "_z.jpg", media)
                    return img, items[0].get("link", "")
        except:
            if attempt < retries - 1: time.sleep(2)
    return None, None

def flickr_fallback(name, pref):
    """Fallback: try with just name + prefecture OR search."""
    # Try tagmode=any with fewer tags
    url = "https://www.flickr.com/services/feeds/photos_public.gne?" + urllib.parse.urlencode({
        "tags": f"{name},{pref}", "tagmode": "any", "format": "json", "nojsoncallback": "1"
    })
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
            items = data.get("items", [])
            if items:
                media = items[0].get("media", {}).get("m", "")
                img = re.sub(r"_\w\.jpg$", "_z.jpg", media)
                return img, items[0].get("link", "")
    except:
        pass
    return None, None

def main():
    travel_data = load_js(os.path.join(ASSETS, "travel_data.js"))
    spots = travel_data.get("spots", [])
    photo_meta = load_js(os.path.join(ASSETS, "travel_photo_meta.js"))

    # Determine which spots need fixing
    # Fix ALL spots that don't have a Wikipedia-sourced image
    to_fix = []
    for spot in spots:
        tid = spot["travel_id"]
        meta = photo_meta.get(tid, {})
        source = meta.get("photoSource", "")
        local = meta.get("localImageUrl", "")
        url = meta.get("imageUrl", "")
        # Fix if: not Wikipedia/Commons sourced, and no local cache
        if source not in ("Wikipedia", "Wikimedia Commons") and not local:
            to_fix.append((tid, spot["name_ja"], spot["prefecture"]))

    print(f"Fixing {len(to_fix)} spots with non-Wikipedia images...\n")

    results = {"wiki": 0, "commons": 0, "flickr": 0, "gmap": 0}

    for i, (tid, name, pref) in enumerate(to_fix):
        print(f"[{i+1}/{len(to_fix)}] {tid} {name}...", end=" ", flush=True)

        # 1. Wikipedia
        img_url, page_url = get_wiki_image(name, pref)
        if img_url:
            results["wiki"] += 1
            print("✓ Wiki")
        else:
            # 2. Commons
            time.sleep(0.3)
            img_url, page_url = get_commons_image(name, pref)
            if img_url:
                results["commons"] += 1
                print("✓ Commons")
            else:
                # 3. Flickr (better search)
                time.sleep(0.3)
                img_url, page_url = flickr_search_better(name, pref)
                if img_url:
                    results["flickr"] += 1
                    print("✓ Flickr")
                else:
                    # 4. Flickr fallback
                    time.sleep(0.3)
                    img_url, page_url = flickr_fallback(name, pref)
                    if img_url:
                        results["flickr"] += 1
                        print("~ Flickr2")
                    else:
                        # 5. Google Maps
                        results["gmap"] += 1
                        img_url = ""
                        page_url = f"https://www.google.com/maps/search/{urllib.parse.quote(name+' '+pref)}"
                        print("→ GMaps")

        photo_meta[tid] = {
            "imageUrl": img_url,
            "localImageUrl": "",
            "photoSource": "Wikipedia" if results["wiki"] > 0 and img_url else (
                "Wikimedia Commons" if "commons" in str(results) and img_url else (
                    "Flickr" if img_url else "Google Maps"
                )
            ),
            "matchedQuery": name,
            "photoPage": page_url or ""
        }
        # Update source properly
        if not img_url:
            photo_meta[tid]["photoSource"] = "Google Maps"
        elif not photo_meta[tid]["photoSource"] in ("Wikipedia", "Wikimedia Commons"):
            photo_meta[tid]["photoSource"] = "Flickr"

        time.sleep(0.7)

    save_js(os.path.join(ASSETS, "travel_photo_meta.js"), "TRAVEL_PHOTO_META", photo_meta)

    # Count final sources
    final = {}
    for v in photo_meta.values():
        s = v.get("photoSource", "unknown")
        final[s] = final.get(s, 0) + 1

    print(f"\n=== Final Source Distribution ===")
    for s, c in sorted(final.items()):
        print(f"  {s}: {c}")
    print(f"  Total: {sum(final.values())}")

if __name__ == "__main__":
    main()

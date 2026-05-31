#!/usr/bin/env python3
"""
Fetch accurate photos for travel spots.
Priority: Wikipedia infobox → Wikimedia Commons → Google Maps place photo.
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

def wiki_api(params, retries=2):
    """Call Wikipedia/Commons API."""
    base = "https://ja.wikipedia.org/w/api.php"
    if params.get("_commons"):
        base = "https://commons.wikimedia.org/w/api.php"
        del params["_commons"]
    url = base + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "TokyoKantoTravelNote/2.0 (photo research)"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read())
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(1)
    return None

def get_wikipedia_image(spot_name, prefecture):
    """Try to get infobox image from Japanese Wikipedia page."""
    # Search for the page
    search_data = wiki_api({
        "action": "query", "list": "search", "srsearch": spot_name,
        "format": "json", "srlimit": 3
    })
    if not search_data:
        return None, None

    pages = search_data.get("query", {}).get("search", [])
    if not pages:
        return None, None

    # Try each search result
    for page in pages:
        title = page["title"]
        # Get page image
        img_data = wiki_api({
            "action": "query", "titles": title, "prop": "pageimages",
            "format": "json", "pithumbsize": 800, "pilimit": 1
        })
        if not img_data:
            continue
        pages_dict = img_data.get("query", {}).get("pages", {})
        for pid, pinfo in pages_dict.items():
            if pid == "-1":
                continue
            thumb = pinfo.get("thumbnail", {})
            if thumb and thumb.get("source"):
                return thumb["source"], f"https://ja.wikipedia.org/wiki/{urllib.parse.quote(title)}"
    return None, None

def get_commons_image(spot_name, prefecture):
    """Search Wikimedia Commons for CC-licensed image."""
    search_data = wiki_api({
        "_commons": True,
        "action": "query", "list": "search", "srsearch": f"{spot_name} {prefecture}",
        "format": "json", "srlimit": 3, "srnamespace": 6  # File namespace
    })
    if not search_data:
        return None, None

    pages = search_data.get("query", {}).get("search", [])
    if not pages:
        return None, None

    for page in pages:
        title = page["title"]  # e.g., "File:Mount_Takao.jpg"
        img_data = wiki_api({
            "_commons": True,
            "action": "query", "titles": title, "prop": "imageinfo",
            "format": "json", "iiprop": "url", "iiurlwidth": 800
        })
        if not img_data:
            continue
        pages_dict = img_data.get("query", {}).get("pages", {})
        for pid, pinfo in pages_dict.items():
            if pid == "-1":
                continue
            imageinfo = pinfo.get("imageinfo", [])
            if imageinfo:
                url = imageinfo[0].get("thumburl") or imageinfo[0].get("url")
                if url:
                    commons_title = title.replace("File:", "")
                    return url, f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(title)}"
    return None, None

def get_google_maps_photo_url(spot_name, prefecture):
    """Generate Google Maps photo search URL (opens in browser, not embeddable directly)."""
    query = urllib.parse.quote(f"{spot_name} {prefecture}")
    return f"https://www.google.com/maps/search/{query}"

def get_flickr_url_fallback(spot_name):
    """Fallback: Flickr search URL."""
    return f"https://www.flickr.com/search/?text={urllib.parse.quote(spot_name)}"

def main():
    travel_data = load_js(os.path.join(ASSETS, "travel_data.js"))
    spots = travel_data.get("spots", [])
    photo_meta = load_js(os.path.join(ASSETS, "travel_photo_meta.js"))

    # Only process spots where imageUrl contains 'placeholder' or is empty
    to_fix = []
    for spot in spots:
        tid = spot["travel_id"]
        meta = photo_meta.get(tid, {})
        url = meta.get("imageUrl", "")
        local = meta.get("localImageUrl", "")
        # Fix if: no local image AND (no imageUrl OR placeholder OR Flickr _z.jpg that's wrong)
        if not local:
            if not url or "placeholder" in url:
                to_fix.append((tid, spot["name_ja"], spot["prefecture"], True))  # force refresh
            else:
                to_fix.append((tid, spot["name_ja"], spot["prefecture"], False))  # check Flickr quality

    print(f"Checking/fixing {len(to_fix)} spots...\n")

    fixed_wiki = 0
    fixed_commons = 0
    kept_flickr = 0
    fallback = 0

    for i, (tid, name, pref, force) in enumerate(to_fix):
        print(f"[{i+1}/{len(to_fix)}] {tid} {name}...", end=" ", flush=True)

        img_url = None
        page_url = None
        source = ""

        # 1. Try Wikipedia infobox image
        img_url, page_url = get_wikipedia_image(name, pref)
        if img_url:
            source = "Wikipedia"
            fixed_wiki += 1
            print(f"✓ Wiki")
        else:
            # 2. Try Wikimedia Commons
            time.sleep(0.3)
            img_url, page_url = get_commons_image(name, pref)
            if img_url:
                source = "Wikimedia Commons"
                fixed_commons += 1
                print(f"✓ Commons")
            elif force:
                # 3. No good result, use Google Maps URL as reference
                source = "Google Maps"
                page_url = get_google_maps_photo_url(name, pref)
                img_url = ""  # Leave empty - card will show without image
                fallback += 1
                print(f"→ GMaps ref")
            else:
                kept_flickr += 1
                print(f"(keep Flickr)")
                continue

        if img_url or force:
            photo_meta[tid] = {
                "imageUrl": img_url,
                "localImageUrl": "",
                "photoSource": source,
                "matchedQuery": name,
                "photoPage": page_url or ""
            }

        time.sleep(0.8)  # Rate limit for Wikipedia API

    save_js(os.path.join(ASSETS, "travel_photo_meta.js"), "TRAVEL_PHOTO_META", photo_meta)

    print(f"\n--- Results ---")
    print(f"Wikipedia infobox: {fixed_wiki}")
    print(f"Wikimedia Commons: {fixed_commons}")
    print(f"Kept Flickr:       {kept_flickr}")
    print(f"Google Maps ref:   {fallback}")
    print(f"Total:             {len(to_fix)}")

if __name__ == "__main__":
    main()

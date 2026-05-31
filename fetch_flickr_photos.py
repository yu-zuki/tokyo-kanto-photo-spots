#!/usr/bin/env python3
"""Fetch Flickr photo URLs for travel spots via Flickr Public Feed API."""
import json, time, urllib.request, urllib.parse, os, re

DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(DIR, "assets")
PHOTOS_DIR = os.path.join(ASSETS, "photos", "travel")

def load_js(path):
    raw = open(path, encoding="utf-8").read()
    return json.loads(raw[raw.index("{"):raw.rindex("}")+1])

def save_js(path, obj_name, data):
    js = f"window.{obj_name} = {json.dumps(data, ensure_ascii=False, separators=(',', ':'))};\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(js)

def flickr_search(query, max_retries=2):
    """Search Flickr public feed and return best photo URL."""
    url = "https://www.flickr.com/services/feeds/photos_public.gne?" + urllib.parse.urlencode({
        "tags": query,
        "tagmode": "any",
        "format": "json",
        "nojsoncallback": "1",
        "per_page": "5"
    })
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read())
                items = data.get("items", [])
                if not items:
                    return None, None, None
                # Get best quality image URL (use _b.jpg or _z.jpg for medium-large)
                best = items[0]
                media_url = best.get("media", {}).get("m", "")
                # Convert to larger size: _m.jpg → _z.jpg
                img_url = re.sub(r"_\w\.jpg$", "_z.jpg", media_url)
                if img_url == media_url:
                    img_url = media_url
                # Get author and title
                author = best.get("author", "")
                title = best.get("title", "")
                link = best.get("link", "")
                return img_url, link, title
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2)
    return None, None, None

def main():
    # Load travel spots
    travel_data = load_js(os.path.join(ASSETS, "travel_data.js"))
    spots = travel_data.get("spots", [])

    # Load existing photo meta
    photo_meta = load_js(os.path.join(ASSETS, "travel_photo_meta.js"))

    # Find spots without local images
    to_fetch = []
    for spot in spots:
        tid = spot["travel_id"]
        meta = photo_meta.get(tid, {})
        if not meta.get("localImageUrl"):
            to_fetch.append((tid, spot["name_ja"]))

    if not to_fetch:
        print("All spots already have local photos!")
        return

    print(f"Fetching Flickr photos for {len(to_fetch)} spots...")
    print(f"Estimated time: {len(to_fetch) * 2:.0f}s\n")

    fetched = 0
    failed = []

    for i, (tid, name) in enumerate(to_fetch):
        print(f"[{i+1}/{len(to_fetch)}] {tid} {name}...", end=" ", flush=True)

        # Try with Japanese name first
        img_url, flickr_link, title = flickr_search(name)
        if not img_url:
            # Try simplified query (first 2 chars)
            simple = re.sub(r"[・、ｰ（）()\[\]].*", "", name).strip()
            if simple != name:
                img_url, flickr_link, title = flickr_search(simple)

        if img_url:
            photo_meta[tid] = {
                "imageUrl": img_url,
                "localImageUrl": "",  # Not cached locally yet
                "photoSource": "Flickr",
                "matchedQuery": name,
                "photoPage": flickr_link or f"https://www.flickr.com/search/?text={urllib.parse.quote(name)}"
            }
            print(f"✓ {title[:40] if title else 'ok'}")
            fetched += 1
        else:
            print("✗ no results")
            failed.append(f"{tid}: {name}")
            # Keep existing placeholder but mark as empty
            if tid not in photo_meta:
                photo_meta[tid] = {
                    "imageUrl": "",
                    "localImageUrl": "",
                    "photoSource": "",
                    "matchedQuery": name,
                    "photoPage": f"https://www.flickr.com/search/?text={urllib.parse.quote(name)}"
                }

        time.sleep(1.5)  # Rate limit

    # Save updated photo meta
    save_js(os.path.join(ASSETS, "travel_photo_meta.js"), "TRAVEL_PHOTO_META", photo_meta)

    print(f"\n--- Results ---")
    print(f"Fetched: {fetched}/{len(to_fetch)}")
    if failed:
        print(f"No results ({len(failed)}):")
        for f in failed[:20]:
            print(f"  {f}")

if __name__ == "__main__":
    main()

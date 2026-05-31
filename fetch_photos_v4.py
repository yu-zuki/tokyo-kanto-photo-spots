#!/usr/bin/env python3
"""
V4: Get official website via Wikipedia/Wikidata → scrape og:image → Google Maps fallback.
"""
import json, time, urllib.request, urllib.parse, os, re, ssl

DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(DIR, "assets")
ctx = ssl.create_default_context()

UA_API = "TokyoKantoTravelNote/4.0 (personal project; github.com/yu-zuki)"
UA_WEB = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

def load_js(path):
    raw = open(path, encoding="utf-8").read()
    return json.loads(raw[raw.index("{"):raw.rindex("}")+1])

def save_js(path, obj_name, data):
    js = f"window.{obj_name} = {json.dumps(data, ensure_ascii=False, separators=(',', ':'))};\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(js)

def api_get(url, retries=2):
    req = urllib.request.Request(url, headers={"User-Agent": UA_API})
    for _ in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=15, context=ctx) as r:
                return json.loads(r.read())
        except:
            time.sleep(1)
    return None

def web_get(url, retries=2):
    """Fetch a web page and return HTML string."""
    req = urllib.request.Request(url, headers={
        "User-Agent": UA_WEB, "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ja,en;q=0.9"
    })
    for _ in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=12, context=ctx) as r:
                return r.read().decode("utf-8", errors="replace")
        except:
            time.sleep(1)
    return None

def check_image(img_url):
    """Verify an image URL is accessible and reasonably sized."""
    if not img_url or not img_url.startswith("http"):
        return False
    try:
        req = urllib.request.Request(img_url, headers={"User-Agent": UA_WEB})
        with urllib.request.urlopen(req, timeout=8, context=ctx) as r:
            size = int(r.headers.get("Content-Length", 0))
            return r.status == 200 and size > 2000
    except:
        return False

def og_image(html):
    """Extract og:image from HTML."""
    if not html: return None
    patterns = [
        r'<meta\s+property=["\']og:image["\']\s+content=["\']([^"\']+)["\']',
        r'<meta\s+content=["\']([^"\']+)["\']\s+property=["\']og:image["\']',
        r'<meta\s+name=["\']twitter:image["\']\s+content=["\']([^"\']+)["\']',
        r'<meta\s+content=["\']([^"\']+)["\']\s+name=["\']twitter:image["\']',
    ]
    for p in patterns:
        m = re.search(p, html, re.I)
        if m and m.group(1).startswith("http"):
            return m.group(1)
    return None

def get_official_url_from_wikipedia(spot_name):
    """Find official website URL from Japanese Wikipedia/Wikidata."""
    data = api_get(
        "https://ja.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
        urllib.parse.quote(spot_name) + "&format=json&srlimit=3"
    )
    if not data: return None
    pages = data.get("query", {}).get("search", [])
    if not pages: return None
    title = pages[0]["title"]

    # Try Wikidata for official website (P856)
    props_data = api_get(
        "https://ja.wikipedia.org/w/api.php?action=query&titles=" +
        urllib.parse.quote(title) + "&prop=pageprops&format=json"
    )
    if props_data:
        for p in props_data.get("query", {}).get("pages", {}).values():
            wd_id = p.get("pageprops", {}).get("wikibase_item")
            if wd_id:
                wd_data = api_get(f"https://www.wikidata.org/wiki/Special:EntityData/{wd_id}.json")
                if wd_data:
                    claims = wd_data.get("entities", {}).get(wd_id, {}).get("claims", {})
                    for claim in claims.get("P856", []):
                        url = claim.get("mainsnak", {}).get("datavalue", {}).get("value")
                        if url and url.startswith("http"):
                            return url

    # Fallback: parse infobox HTML
    html = web_get(f"https://ja.wikipedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}")
    if html:
        infobox = re.search(r'<table[^>]*class="[^"]*infobox[^"]*"[^>]*>(.*?)</table>', html, re.S|re.I)
        if infobox:
            ib = infobox.group(1)
            m = re.search(r'(?:公式サイト|公式ウェブサイト|公式HP)[\s\S]*?href="(https?://[^"]+)"', ib)
            if m and not any(x in m.group(1) for x in ['geohack', 'wikipedia', 'wikimedia']):
                return m.group(1)
            for m in re.finditer(r'href="(https?://[^"]+)"', ib):
                url = m.group(1)
                if any(d in url for d in ['.jp/', '.com/', '.net/', '.org/', '.go.jp/']) and \
                   not any(x in url for x in ['geohack', 'wikipedia', 'wikimedia', 'google', 'facebook', 'twitter', 'instagram', 'youtube', 'archive', 'creativecommons']):
                    return url
    return None

def get_google_maps_photo_url(name, pref):
    """Try to get a photo URL from Google Maps place search."""
    query = urllib.parse.quote(f"{name} {pref}")
    # Google Maps search page
    html = web_get(f"https://www.google.com/maps/search/{query}")
    if html:
        # Google Maps sometimes includes photo URLs in the page data
        # Pattern: https://lh5.googleusercontent.com/p/
        photos = re.findall(r'https://lh5\.googleusercontent\.com/p/[^"\'\s]+', html)
        for p in photos[:3]:
            # Add size parameter
            photo_url = re.sub(r'=w\d+-h\d+-k-no', '=w800-h600-k-no', p)
            if '=w' not in photo_url:
                photo_url = p + '=w800-h600-k-no'
            if check_image(photo_url):
                return photo_url
    return None

def main():
    travel_data = load_js(os.path.join(ASSETS, "travel_data.js"))
    spots = travel_data.get("spots", [])
    photo_meta = load_js(os.path.join(ASSETS, "travel_photo_meta.js"))

    # Fix ALL 125 spots
    to_fix = [(s["travel_id"], s["name_ja"], s["prefecture"]) for s in spots]

    print(f"Processing {len(to_fix)} spots...")
    print("Strategy: Wikipedia→official URL→og:image, else Google Maps\n")

    stats = {"公式og:image": 0, "Google Maps": 0}

    for i, (tid, name, pref) in enumerate(to_fix):
        print(f"[{i+1:3d}/{len(to_fix)}] {tid} {name[:28]}", end="", flush=True)

        img_url = ""
        source = ""
        page_url = ""

        # Step 1: Get official website from Wikipedia, then extract og:image
        official_url = get_official_url_from_wikipedia(name)
        if official_url:
            print(f" 公式→", end="", flush=True)
            html = web_get(official_url)
            img = og_image(html)
            if img and check_image(img):
                img_url = img
                source = "公式サイト"
                page_url = official_url
                stats["公式og:image"] += 1
                print(" ✓", flush=True)
            else:
                print(" og:image✗", end="", flush=True)
        else:
            print(" 公式URL✗", end="", flush=True)

        # Step 2: Google Maps photo
        if not img_url:
            print(" Maps→", end="", flush=True)
            maps_img = get_google_maps_photo_url(name, pref)
            if maps_img:
                img_url = maps_img
                source = "Google Maps写真"
                page_url = f"https://www.google.com/maps/search/{urllib.parse.quote(name+' '+pref)}"
                stats["Google Maps"] += 1
                print(" ✓", flush=True)
            else:
                source = "Google Maps"
                page_url = f"https://www.google.com/maps/search/{urllib.parse.quote(name+' '+pref)}"
                stats["Google Maps"] += 1
                print(" 参照", flush=True)

        photo_meta[tid] = {
            "imageUrl": img_url,
            "localImageUrl": "",
            "photoSource": source,
            "matchedQuery": name,
            "photoPage": page_url
        }

        time.sleep(0.8)

    save_js(os.path.join(ASSETS, "travel_photo_meta.js"), "TRAVEL_PHOTO_META", photo_meta)

    # Report
    final = {}
    has_img = 0
    for v in photo_meta.values():
        s = v.get("photoSource", "?")
        final[s] = final.get(s, 0) + 1
        if v.get("imageUrl"):
            has_img += 1

    print(f"\n=== Results ===")
    for s, c in sorted(final.items()):
        print(f"  {s}: {c}")
    print(f"  With image URL: {has_img}/{len(to_fix)}")

if __name__ == "__main__":
    main()

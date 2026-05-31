#!/usr/bin/env python3
"""
Fetch photos by visiting actual websites:
1. Google search "[name] 公式サイト" → extract og:image from official site
2. Google search "[name] 観光" → extract og:image from travel sites
3. Fallback: Google search "[name] 写真" → use first image result
4. Last resort: Google Maps search link
"""
import json, time, urllib.request, urllib.parse, os, re, ssl

DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(DIR, "assets")

# Bypass SSL for some Japanese sites
ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

def load_js(path):
    raw = open(path, encoding="utf-8").read()
    return json.loads(raw[raw.index("{"):raw.rindex("}")+1])

def save_js(path, obj_name, data):
    js = f"window.{obj_name} = {json.dumps(data, ensure_ascii=False, separators=(',', ':'))};\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(js)

def fetch_url(url, timeout=12):
    """Fetch a URL and return the HTML content."""
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ja,en;q=0.9",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ssl_ctx) as resp:
            raw = resp.read()
            # Try to decode
            for enc in ['utf-8', 'shift-jis', 'euc-jp', 'iso-2022-jp']:
                try:
                    return raw.decode(enc)
                except:
                    continue
            return raw.decode('utf-8', errors='replace')
    except Exception as e:
        return None

def extract_og_image(html):
    """Extract og:image from HTML meta tags."""
    if not html:
        return None
    # og:image
    patterns = [
        r'<meta\s+property=["\']og:image["\']\s+content=["\']([^"\']+)["\']',
        r'<meta\s+content=["\']([^"\']+)["\']\s+property=["\']og:image["\']',
        r'<meta\s+name=["\']twitter:image["\']\s+content=["\']([^"\']+)["\']',
        r'<meta\s+content=["\']([^"\']+)["\']\s+name=["\']twitter:image["\']',
    ]
    for pat in patterns:
        m = re.search(pat, html, re.IGNORECASE)
        if m:
            url = m.group(1)
            if url.startswith("http"):
                return url
            # Could be relative, ignore those
    return None

def extract_first_image(html, base_url):
    """Extract first large image from HTML as fallback."""
    if not html:
        return None
    # Find img tags with reasonable size
    imgs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>', html, re.IGNORECASE)
    for img in imgs:
        if img.startswith("http") and not any(x in img.lower() for x in ['icon', 'logo', 'banner', 'ads', 'pixel', '1x1', 'spacer']):
            return img
    return None

def google_search(query, num=5):
    """Search Google and return result URLs."""
    url = "https://www.google.com/search?" + urllib.parse.urlencode({
        "q": query, "num": num, "hl": "ja", "lr": "lang_ja"
    })
    html = fetch_url(url)
    if not html:
        return []
    # Extract result URLs
    urls = re.findall(r'href="https?://(?!google\.com|google\.co\.jp)[^"]+"', html)
    results = []
    seen = set()
    for u in urls:
        u = u.replace('href="', '').replace('"', '')
        if u not in seen and not any(x in u for x in ['google.com', 'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com']):
            seen.add(u)
            results.append(u)
    return results[:num]

def find_official_image(name, pref):
    """Find representative image by visiting official/travel sites."""

    # Step 1: Search for official site
    print("  [公式]...", end=" ", flush=True)
    queries_official = [
        f"{name} 公式サイト",
        f"{name} {pref} 公式",
        f"{name} 公式ホームページ",
    ]
    for q in queries_official[:2]:
        urls = google_search(q, num=5)
        for url in urls[:3]:
            html = fetch_url(url)
            img = extract_og_image(html)
            if img:
                # Quick check: is the image accessible?
                try:
                    req = urllib.request.Request(img, headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(req, timeout=5) as r:
                        if r.status == 200 and int(r.headers.get("Content-Length", "0")) > 2000:
                            return img, url, "公式サイト"
                except:
                    continue
        time.sleep(0.5)

    # Step 2: Search travel/review sites
    print("[観光]...", end=" ", flush=True)
    travel_sites = [
        "じゃらん", "るるぶ", "ことりっぷ", "RETRIP", "Walkerplus",
        "旅色", "icotto", "トリップノート", "TABIRIN", "旅行.jp"
    ]
    for site in travel_sites[:3]:
        urls = google_search(f"{name} {site}", num=3)
        for url in urls[:2]:
            html = fetch_url(url)
            img = extract_og_image(html)
            if img:
                try:
                    req = urllib.request.Request(img, headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(req, timeout=5) as r:
                        if r.status == 200 and int(r.headers.get("Content-Length", "0")) > 2000:
                            return img, url, f"旅行サイト({site})"
                except:
                    continue
        time.sleep(0.3)

    # Step 3: General image search
    print("[写真]...", end=" ", flush=True)
    urls = google_search(f"{name} {pref} 観光 写真", num=5)
    for url in urls[:3]:
        html = fetch_url(url)
        img = extract_og_image(html)
        if not img:
            img = extract_first_image(html, url)
        if img and "http" in img:
            try:
                req = urllib.request.Request(img, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=5) as r:
                    if r.status == 200 and int(r.headers.get("Content-Length", "0")) > 2000:
                        return img, url, "観光記事"
            except:
                continue
        time.sleep(0.3)

    # Step 4: Google Maps
    print("[Maps]...", end=" ", flush=True)
    maps_url = f"https://www.google.com/maps/search/{urllib.parse.quote(name+' '+pref)}"
    return "", maps_url, "Google Maps"

def main():
    travel_data = load_js(os.path.join(ASSETS, "travel_data.js"))
    spots = travel_data.get("spots", [])
    photo_meta = load_js(os.path.join(ASSETS, "travel_photo_meta.js"))

    # Fix ALL spots (not just non-Wikipedia ones - user wants all redone)
    to_fix = [(s["travel_id"], s["name_ja"], s["prefecture"]) for s in spots]

    print(f"Fetching official/travel site images for {len(to_fix)} spots...")
    print("(This takes time - visiting actual websites for each spot)\n")

    stats = {"公式サイト": 0, "旅行サイト": 0, "観光記事": 0, "Google Maps": 0}

    for i, (tid, name, pref) in enumerate(to_fix):
        print(f"[{i+1}/{len(to_fix)}] {tid} {name[:30]}", end="", flush=True)
        img_url, page_url, source = find_official_image(name, pref)

        if img_url:
            print(f" ✓ {source}")
        else:
            print(f" → {source}")

        stats[source] = stats.get(source, 0) + 1

        photo_meta[tid] = {
            "imageUrl": img_url,
            "localImageUrl": "",
            "photoSource": source,
            "matchedQuery": name,
            "photoPage": page_url or ""
        }

        time.sleep(1.0)  # Rate limit between spots

    save_js(os.path.join(ASSETS, "travel_photo_meta.js"), "TRAVEL_PHOTO_META", photo_meta)

    print(f"\n=== Results ===")
    has = sum(1 for v in photo_meta.values() if v.get("imageUrl"))
    for s, c in sorted(stats.items()):
        print(f"  {s}: {c}")
    print(f"  With image: {has}/{len(to_fix)}")

if __name__ == "__main__":
    main()

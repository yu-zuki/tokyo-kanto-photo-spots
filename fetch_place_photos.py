import json
import re
import time
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path


DATA_JS = Path("assets/data.js")
OUT = Path("assets/photo_meta.js")
CACHE = Path("assets/photo_meta_cache.json")
USER_AGENT = "TokyoKantoPhotoSpotsLocalPage/1.0 (personal local project)"


def read_spots():
    text = DATA_JS.read_text(encoding="utf-8")
    payload = text.removeprefix("window.PHOTO_SPOTS_DATA = ").rstrip(";\n")
    return json.loads(payload)["spots"]


def api_json(base, params):
    url = base + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=8) as response:
        return json.loads(response.read().decode("utf-8"))


def clean_title(text):
    return re.sub(r"\s+", " ", str(text or "")).strip()


def search_wikipedia_image(query):
    data = api_json(
        "https://ja.wikipedia.org/w/api.php",
        {
            "action": "query",
            "format": "json",
            "generator": "search",
            "gsrsearch": query,
            "gsrlimit": 4,
            "prop": "pageimages|info",
            "piprop": "thumbnail",
            "pithumbsize": 1000,
            "inprop": "url",
            "origin": "*",
        },
    )
    pages = data.get("query", {}).get("pages", {})
    ranked = sorted(pages.values(), key=lambda page: page.get("index", 99))
    for page in ranked:
        thumb = page.get("thumbnail", {}).get("source")
        if thumb:
            return {
                "imageUrl": thumb,
                "photoPage": page.get("fullurl"),
                "photoTitle": page.get("title"),
                "photoSource": "Wikipedia",
            }
    return None


def search_commons_image(query):
    data = api_json(
        "https://commons.wikimedia.org/w/api.php",
        {
            "action": "query",
            "format": "json",
            "generator": "search",
            "gsrnamespace": 6,
            "gsrsearch": query,
            "gsrlimit": 5,
            "prop": "imageinfo",
            "iiprop": "url|extmetadata",
            "iiurlwidth": 1000,
            "origin": "*",
        },
    )
    pages = data.get("query", {}).get("pages", {})
    ranked = sorted(pages.values(), key=lambda page: page.get("index", 99))
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
            "license": (info.get("extmetadata", {}).get("LicenseShortName", {}) or {}).get("value"),
        }
    return None


def maps_url(spot):
    query = " ".join(
        clean_title(value)
        for value in [spot.get("地点"), spot.get("区域"), spot.get("都县"), "日本"]
        if clean_title(value)
    )
    return "https://www.google.com/maps/search/?api=1&query=" + urllib.parse.quote(query)


def photo_queries(spot):
    name = clean_title(spot.get("地点"))
    area = clean_title(spot.get("区域"))
    pref = clean_title(spot.get("都县"))
    return [
        f'{name} {area} {pref}',
    ]


def find_photo(spot):
    for query in photo_queries(spot):
        for searcher in (search_wikipedia_image, search_commons_image):
            try:
                found = searcher(query)
            except urllib.error.HTTPError as error:
                if error.code == 429:
                    print("Rate limited; sleeping 45s", flush=True)
                    time.sleep(45)
                    found = None
                else:
                    found = None
            except Exception:
                found = None
            if found and found.get("imageUrl"):
                found["matchedQuery"] = query
                return found
        time.sleep(0.08)
    return None


def write_outputs(meta):
    CACHE.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT.write_text(
        "window.PHOTO_SPOTS_PHOTOS = "
        + json.dumps(meta, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )


def main():
    spots = read_spots()
    if CACHE.exists():
        meta = json.loads(CACHE.read_text(encoding="utf-8"))
    else:
        meta = {}
    matched = sum(1 for item in meta.values() if item.get("imageUrl"))
    for index, spot in enumerate(spots, start=1):
        key = str(spot["ID"])
        if key in meta:
            continue
        photo = find_photo(spot)
        item = {
            "mapsUrl": maps_url(spot),
            "photoSearchUrl": "https://www.google.com/search?tbm=isch&q="
            + urllib.parse.quote(f'{clean_title(spot.get("地点"))} {clean_title(spot.get("区域"))} 写真'),
        }
        if photo:
            item.update(photo)
            matched += 1
        meta[key] = item
        write_outputs(meta)
        print(f"{index:03d}/{len(spots)} {spot['地点']} {'OK' if photo else 'NO PHOTO'}", flush=True)
        time.sleep(0.45)

    write_outputs(meta)
    print(f"Wrote {OUT}; matched {matched}/{len(spots)}")


if __name__ == "__main__":
    main()

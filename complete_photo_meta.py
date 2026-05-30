import json
import urllib.parse
from pathlib import Path


DATA_JS = Path("assets/data.js")
CACHE = Path("assets/photo_meta_cache.json")
OUT = Path("assets/photo_meta.js")


def clean(text):
    return " ".join(str(text or "").split())


def read_spots():
    text = DATA_JS.read_text(encoding="utf-8")
    payload = text.removeprefix("window.PHOTO_SPOTS_DATA = ").rstrip(";\n")
    return json.loads(payload)["spots"]


def maps_url(spot):
    query = " ".join(
        clean(value)
        for value in [spot.get("地点"), spot.get("区域"), spot.get("都县"), "日本"]
        if clean(value)
    )
    return "https://www.google.com/maps/search/?api=1&query=" + urllib.parse.quote(query)


def image_search_url(spot):
    query = " ".join(
        clean(value)
        for value in [spot.get("地点"), spot.get("区域"), spot.get("都县"), "写真"]
        if clean(value)
    )
    return "https://www.google.com/search?tbm=isch&q=" + urllib.parse.quote(query)


def main():
    meta = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    for spot in read_spots():
        key = str(spot["ID"])
        meta.setdefault(key, {})
        meta[key]["mapsUrl"] = maps_url(spot)
        meta[key]["photoSearchUrl"] = image_search_url(spot)

    CACHE.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT.write_text(
        "window.PHOTO_SPOTS_PHOTOS = "
        + json.dumps(meta, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    matched = sum(1 for item in meta.values() if item.get("imageUrl"))
    print(f"Wrote {OUT}; image matches {matched}/{len(meta)}")


if __name__ == "__main__":
    main()

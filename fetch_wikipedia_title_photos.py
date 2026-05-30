import json
import re
import urllib.parse
import urllib.request
from pathlib import Path


DATA_JS = Path("assets/data.js")
CACHE = Path("assets/photo_meta_cache.json")
OUT = Path("assets/photo_meta.js")
USER_AGENT = "TokyoKantoPhotoSpotsLocalPage/1.0 (personal local project)"


REPLACEMENTS = {
    "东京": "東京",
    "东京": "東京",
    "公园": "公園",
    "庭园": "庭園",
    "横滨": "横浜",
    "稻": "稲",
    "丰": "豊",
    "滨": "浜",
    "涩": "渋",
    "谷": "谷",
    "鹤": "鶴",
    "站": "駅",
    "镰": "鎌",
    "仓": "倉",
    "茨": "茨",
    "筑": "筑",
    "樱": "桜",
    "桥": "橋",
    "岛": "島",
    "临": "臨",
    "宫": "宮",
    "离": "離",
    "关": "関",
    "茂": "茂",
}


ALIASES = {
    "东京塔外苑": ["東京タワー", "芝公園"],
    "芝公园": ["芝公園"],
    "东京晴空塔": ["東京スカイツリー", "東京ソラマチ"],
    "ソラマチ": ["東京ソラマチ"],
    "KITTE丸之内屋上庭园": ["KITTE丸の内", "JPタワー"],
    "みなとみらい21": ["横浜みなとみらい21"],
    "台场海滨公园": ["お台場海浜公園"],
    "横滨大さん橋": ["横浜港大さん橋国際客船ターミナル"],
    "涩谷Scramble Crossing": ["渋谷スクランブル交差点"],
    "皇居外苑": ["皇居外苑", "二重橋"],
    "鹤见线海芝浦站": ["海芝浦駅"],
    "日本桥": ["日本橋 (東京都中央区)"],
}


def clean(text):
    return re.sub(r"\s+", " ", str(text or "")).strip()


def read_spots():
    text = DATA_JS.read_text(encoding="utf-8")
    payload = text.removeprefix("window.PHOTO_SPOTS_DATA = ").rstrip(";\n")
    return json.loads(payload)["spots"]


def ja_variant(text):
    value = clean(text)
    for old, new in REPLACEMENTS.items():
        value = value.replace(old, new)
    return value


def split_name(name):
    return [clean(part) for part in re.split(r"[/／・,，]", clean(name)) if clean(part)]


def candidates(spot):
    name = clean(spot.get("地点"))
    values = []
    for key, aliases in ALIASES.items():
        if key in name:
            values.extend(aliases)
    for part in split_name(name):
        values.extend([part, ja_variant(part)])
    values.extend([name, ja_variant(name)])
    deduped = []
    for value in values:
        if value and value not in deduped:
            deduped.append(value)
    return deduped[:8]


def api_titles(titles):
    params = {
        "action": "query",
        "format": "json",
        "titles": "|".join(titles),
        "prop": "pageimages|info",
        "piprop": "thumbnail",
        "pithumbsize": 1000,
        "inprop": "url",
    }
    url = "https://ja.wikipedia.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=12) as response:
        return json.loads(response.read().decode("utf-8"))


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
    meta = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    candidate_to_ids = {}
    for spot in spots:
        key = str(spot["ID"])
        meta.setdefault(key, {})
        meta[key]["mapsUrl"] = maps_url(spot)
        meta[key]["photoSearchUrl"] = image_search_url(spot)
        if meta[key].get("imageUrl"):
            continue
        for title in candidates(spot):
            candidate_to_ids.setdefault(title, []).append(key)

    titles = list(candidate_to_ids)
    title_to_page = {}
    for i in range(0, len(titles), 45):
        batch = titles[i : i + 45]
        data = api_titles(batch)
        for page in data.get("query", {}).get("pages", {}).values():
            if "missing" in page:
                continue
            thumb = page.get("thumbnail", {}).get("source")
            if thumb:
                title_to_page[page["title"]] = page
        print(f"Checked {min(i + 45, len(titles))}/{len(titles)} titles", flush=True)

    matched = 0
    for title, ids in candidate_to_ids.items():
        page = title_to_page.get(title)
        if not page:
            continue
        for key in ids:
            if meta[key].get("imageUrl"):
                continue
            meta[key].update(
                {
                    "imageUrl": page["thumbnail"]["source"],
                    "photoPage": page.get("fullurl"),
                    "photoTitle": page.get("title"),
                    "photoSource": "Wikipedia",
                    "matchedQuery": title,
                }
            )
            matched += 1

    write_outputs(meta)
    total_images = sum(1 for item in meta.values() if item.get("imageUrl"))
    print(f"Added {matched}; total image matches {total_images}/{len(meta)}")


if __name__ == "__main__":
    main()

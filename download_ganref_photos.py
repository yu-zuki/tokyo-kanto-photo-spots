import json
import re
import time
import urllib.parse
import urllib.request
from html import unescape
from pathlib import Path


DATA_JS = Path("assets/data.js")
PHOTO_META_JS = Path("assets/photo_meta.js")
PHOTO_META_CACHE = Path("assets/photo_meta_cache.json")
OUT_DIR = Path("assets/photos/ganref")
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

PREFS = {
    "tokyo",
    "kanagawa",
    "chiba",
    "saitama",
    "ibaraki",
    "tochigi",
    "gunma",
    "yamanashi",
    "shizuoka",
    "kanto",
}

KANJI_FIX = {
    "东京": "東京",
    "公园": "公園",
    "庭园": "庭園",
    "横滨": "横浜",
    "稻": "稲",
    "丰": "豊",
    "滨": "浜",
    "涩": "渋",
    "鹤": "鶴",
    "桥": "橋",
    "岛": "島",
    "站": "駅",
    "樱": "桜",
    "镰": "鎌",
    "仓": "倉",
}

ALIASES = {
    "浮島町公園": ["川崎", "浮島町公園"],
    "若洲海浜公園": ["若洲海浜公園", "若洲"],
    "千鳥町工場夜景": ["川崎", "千鳥町"],
    "稻毛海浜公园": ["稲毛海浜公園", "稲毛"],
    "みなとみらい21": ["みなとみらい", "横浜"],
    "东京塔外苑/芝公园": ["東京タワー", "芝公園"],
    "东京晴空塔/ソラマチ周边": ["スカイツリー"],
    "台场海滨公园": ["お台場"],
    "山下公园": ["山下公園", "横浜"],
    "横滨大さん橋": ["横浜", "大さん橋"],
    "涩谷Scramble Crossing": ["渋谷"],
    "皇居外苑/二重桥": ["皇居", "二重橋"],
    "鹤见线海芝浦站": ["鶴見線", "海芝浦"],
    "下北泽": ["下北沢"],
}


def read_js_payload(path, prefix):
    text = path.read_text(encoding="utf-8")
    return json.loads(text.removeprefix(prefix).rstrip(";\n"))


def read_spots():
    return read_js_payload(DATA_JS, "window.PHOTO_SPOTS_DATA = ")["spots"]


def read_meta():
    if PHOTO_META_CACHE.exists():
        return json.loads(PHOTO_META_CACHE.read_text(encoding="utf-8"))
    return read_js_payload(PHOTO_META_JS, "window.PHOTO_SPOTS_PHOTOS = ")


def write_meta(meta):
    PHOTO_META_CACHE.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    PHOTO_META_JS.write_text(
        "window.PHOTO_SPOTS_PHOTOS = "
        + json.dumps(meta, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )


def fetch_bytes(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=20) as response:
        return response.read()


def fetch_text(url):
    return fetch_bytes(url).decode("utf-8", errors="ignore")


def normalize(value):
    value = str(value or "")
    for old, new in KANJI_FIX.items():
        value = value.replace(old, new)
    value = value.lower()
    return re.sub(r"[\s・/／,，()（）\-\[\]【】「」『』ー]", "", value)


def split_names(value):
    return [part for part in re.split(r"[/／・,，]", str(value or "")) if part.strip()]


def candidate_names(spot):
    names = []
    raw = str(spot.get("地点") or "")
    names.extend(ALIASES.get(raw, []))
    names.extend(split_names(raw))
    names.extend([raw, spot.get("区域")])
    return [normalize(name) for name in names if normalize(name)]


def parse_pref_page(slug):
    url = f"https://ganref.jp/spot/photo/jpn/{slug}.html"
    html = fetch_text(url)
    thumb_block = re.search(r'<ul class="thumb-list">(.*?)</ul>', html, flags=re.S)
    if not thumb_block:
        return []
    items = []
    for href, img, alt, label in re.findall(
        r'<li><a href="([^"]+)"><div><img src="([^"]+)" alt="([^"]*)"></div>(.*?)</a></li>',
        thumb_block.group(1),
        flags=re.S,
    ):
        title = re.sub("<.*?>", "", unescape(label)).strip() or unescape(alt).strip()
        items.append(
            {
                "title": title,
                "key": normalize(title),
                "pageUrl": urllib.parse.urljoin(url, href),
                "imageUrl": urllib.parse.urljoin(url, img),
            }
        )
    return items


def build_catalog():
    items = []
    for slug in sorted(PREFS):
        try:
            page_items = parse_pref_page(slug)
        except Exception as error:
            print(f"Skip {slug}: {error}", flush=True)
            continue
        print(f"{slug}: {len(page_items)} GANREF thumbs", flush=True)
        items.extend(page_items)
        time.sleep(0.2)
    return items


def match_item(spot, catalog):
    candidates = candidate_names(spot)
    for candidate in candidates:
        for item in catalog:
            if candidate == item["key"]:
                return item
    for candidate in candidates:
        if len(candidate) < 2:
            continue
        for item in catalog:
            if candidate in item["key"] or item["key"] in candidate:
                return item
    return None


def download_image(item, spot_id):
    suffix = Path(urllib.parse.urlparse(item["imageUrl"]).path).suffix.lower() or ".jpg"
    target = OUT_DIR / f"{spot_id}{suffix}"
    if target.exists() and target.stat().st_size > 0:
        return target
    data = fetch_bytes(item["imageUrl"])
    target.write_bytes(data)
    time.sleep(0.12)
    return target


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    spots = read_spots()
    meta = read_meta()
    catalog = build_catalog()
    matched = 0
    downloaded = 0
    for spot in spots:
        item = match_item(spot, catalog)
        if not item:
            continue
        matched += 1
        spot_id = str(spot["ID"])
        try:
            local_path = download_image(item, spot_id)
            downloaded += 1
        except Exception as error:
            print(f"Download failed {spot_id} {spot['地点']}: {error}", flush=True)
            continue
        meta.setdefault(spot_id, {})
        meta[spot_id].update(
            {
                "imageUrl": str(local_path).replace("\\", "/"),
                "localImageUrl": str(local_path).replace("\\", "/"),
                "photoPage": item["pageUrl"],
                "photoTitle": item["title"],
                "photoSource": "GANREF",
                "matchedQuery": item["title"],
            }
        )
        print(f"{spot_id} {spot['地点']} -> {item['title']}", flush=True)
    write_meta(meta)
    print(f"Matched {matched}/{len(spots)}; downloaded {downloaded}")


if __name__ == "__main__":
    main()

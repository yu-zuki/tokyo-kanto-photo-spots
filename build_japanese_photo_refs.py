import json
import re
import urllib.parse
import urllib.request
from html import unescape
from pathlib import Path


DATA_JS = Path("assets/data.js")
OUT = Path("assets/japanese_photo_refs.js")
USER_AGENT = "TokyoKantoPhotoSpotsLocalPage/1.0"

GANREF_PREFS = {
    "东京": "tokyo",
    "神奈川": "kanagawa",
    "千叶": "chiba",
    "埼玉": "saitama",
    "茨城": "ibaraki",
    "栃木": "tochigi",
    "群马": "gunma",
    "山梨": "yamanashi",
    "静冈": "shizuoka",
}

PHOTOHITO_PREFS = {
    "东京": "tokyo",
    "神奈川": "kanagawa",
    "千叶": "chiba",
    "埼玉": "saitama",
    "茨城": "ibaraki",
    "栃木": "tochigi",
    "群马": "gunma",
    "山梨": "yamanashi",
    "静冈": "shizuoka",
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
    "站": "駅",
    "桥": "橋",
    "岛": "島",
    "樱": "桜",
    "镰": "鎌",
    "仓": "倉",
}


def read_spots():
    text = DATA_JS.read_text(encoding="utf-8")
    payload = text.removeprefix("window.PHOTO_SPOTS_DATA = ").rstrip(";\n")
    return json.loads(payload)["spots"]


def normalize(value):
    value = str(value or "").lower()
    value = re.sub(r"[\\s・/／,，()（）\\-ー]", "", value)
    for old, new in KANJI_FIX.items():
        value = value.replace(old.lower(), new.lower())
    return value


def ja_name(value):
    result = str(value or "")
    for old, new in KANJI_FIX.items():
        result = result.replace(old, new)
    return result


def split_pref(value):
    return [item for item in re.split(r"[/／]", str(value or "")) if item]


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=15) as response:
        return response.read().decode("utf-8", errors="ignore")


def ganref_catalog():
    links = {}
    for slug in set(GANREF_PREFS.values()):
        url = f"https://ganref.jp/spot/photo/jpn/{slug}.html"
        try:
            html = fetch(url)
        except Exception:
            continue
        for href, label in re.findall(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', html, flags=re.I | re.S):
            text = normalize(re.sub("<.*?>", "", unescape(label)))
            if not text:
                continue
            links[text] = urllib.parse.urljoin(url, href)
    return links


def ganref_pref_url(spot):
    for pref in split_pref(spot.get("都县")):
        slug = GANREF_PREFS.get(pref)
        if slug:
            return f"https://ganref.jp/spot/photo/jpn/{slug}.html"
    return "https://ganref.jp/spot/photo/jpn/kanto.html"


def photohito_pref_url(spot):
    for pref in split_pref(spot.get("都县")):
        slug = PHOTOHITO_PREFS.get(pref)
        if slug:
            return f"https://photohito.com/map/{slug}/"
    return "https://photohito.com/map/"


def search_url(domain, spot):
    query = " ".join(
        item
        for item in [ja_name(spot.get("地点")), ja_name(spot.get("区域")), "写真"]
        if item
    )
    return "https://www.google.com/search?q=" + urllib.parse.quote(f"site:{domain} {query}")


def instagram_url(spot):
    """Generate Instagram hashtag search URL with Japanese place name"""
    hashtag = ja_name(spot.get("地点")).replace(" ", "")
    return f"https://www.instagram.com/explore/tags/{urllib.parse.quote(hashtag)}/"


def cizucu_url(spot):
    """Generate cizucu search URL - Japanese photo community app"""
    query = urllib.parse.quote(ja_name(spot.get("地点")))
    return f"https://www.cizucu.com/search?q={query}"


def google_image_url(spot):
    """Google image search with Japanese terms for practical reference"""
    query = " ".join(
        item
        for item in [ja_name(spot.get("地点")), ja_name(spot.get("区域")), "撮影", "写真"]
        if item
    )
    return f"https://www.google.com/search?tbm=isch&q={urllib.parse.quote(query)}"


def match_ganref_spot(spot, catalog):
    names = [spot.get("地点"), *re.split(r"[/／]", str(spot.get("地点") or "")), spot.get("区域")]
    candidates = [normalize(name) for name in names if name]
    for candidate in candidates:
        if candidate in catalog:
            return catalog[candidate]
    for candidate in candidates:
        if len(candidate) < 3:
            continue
        for label, url in catalog.items():
            if candidate in label or label in candidate:
                return url
    return None


def main():
    spots = read_spots()
    catalog = ganref_catalog()
    refs = {}
    direct = 0

    for spot in spots:
        ganref_direct = match_ganref_spot(spot, catalog)
        if ganref_direct:
            direct += 1

        refs[str(spot["ID"])] = [
            {
                "name": "GANREF",
                "kind": "spot" if ganref_direct else "prefecture",
                "url": ganref_direct or ganref_pref_url(spot),
                "note": "日本No.1撮影スポットDB（3000+地点·30万枚）",
            },
            {
                "name": "PHOTOHITO",
                "kind": "prefecture",
                "url": photohito_pref_url(spot),
                "note": "価格.com運営·機材別作例検索が強力",
            },
            {
                "name": "東京カメラ部",
                "kind": "search",
                "url": search_url("tokyocameraclub.com", spot),
                "note": "日本最大級SNS写真コミュニティ（575万フォロワー）",
            },
            {
                "name": "cizucu",
                "kind": "search",
                "url": cizucu_url(spot),
                "note": "新興写真コミュニティ·サークル機能で地域検索",
            },
            {
                "name": "Instagram",
                "kind": "hashtag",
                "url": instagram_url(spot),
                "note": "ハッシュタグで撮影地の最新作例を検索",
            },
            {
                "name": "Google画像検索",
                "kind": "search",
                "url": google_image_url(spot),
                "note": "日本语で画像検索→他サイトの作例も発見可",
            },
        ]

    OUT.write_text(
        "window.JAPAN_PHOTO_REFS = "
        + json.dumps(refs, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUT}; direct GANREF matches {direct}/{len(spots)}")


if __name__ == "__main__":
    main()

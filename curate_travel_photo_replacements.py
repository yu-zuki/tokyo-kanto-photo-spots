#!/usr/bin/env python3
"""Apply curated travel photo replacements.

This script is intentionally conservative: it only updates hand-reviewed
place/image pairs from Japanese official tourism pages or venue pages, and it
keeps Wikipedia/Wikimedia out of the travel photo pool.
"""
import json
import mimetypes
import re
import ssl
import urllib.parse
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
META_PATH = ROOT / "assets" / "travel_photo_meta.js"
PHOTO_DIR = ROOT / "assets" / "photos" / "travel"

BLOCKED = ("wikipedia.org", "wikimedia.org")

REPLACEMENTS = {
    "T004": {
        "imageUrl": "https://kiyosato.gr.jp/wordpress/wp-content/uploads/2021/12/-e1699448097860-860x573.jpg",
        "photoPage": "https://kiyosato.gr.jp/seisenryo/",
        "photoSource": "清里観光振興会",
        "matchedQuery": "清里高原",
    },
    "T001": {
        "imageUrl": "https://www.tochigiji.or.jp/wp-content/uploads/spot/2021/09/34DA431F082E63DE47B1222565DDAA5A.jpg",
        "photoPage": "https://www.tochigiji.or.jp/spot/s11583",
        "photoSource": "とちぎ旅ネット",
        "matchedQuery": "那須高原",
    },
    "T006": {
        "imageUrl": "https://maruchiba.jp/lsc/upfile/spot/0001/0352/10352_1_l.jpg",
        "photoPage": "https://maruchiba.jp/spot/detail_10352.html",
        "photoSource": "まるごとe! ちば",
        "matchedQuery": "養老渓谷",
    },
    "T007": {
        "imageUrl": "https://www.ibarakiguide.jp/data/spot/1679653174_10.jpg",
        "photoPage": "https://www.ibarakiguide.jp/spot.php?code=752&mode=detail",
        "photoSource": "観光いばらき",
        "matchedQuery": "筑波山",
    },
    "T011": {
        "imageUrl": "https://www.shuzenji-kankou.com/w-koihashi.jpg",
        "photoPage": "https://www.shuzenji-kankou.com/",
        "photoSource": "修善寺温泉旅館協同組合",
        "matchedQuery": "修善寺",
    },
    "T017": {
        "imageUrl": "https://www.ibarakiguide.jp/data/spot/1679733839_9.jpg",
        "photoPage": "https://www.ibarakiguide.jp/spot.php?code=997&mode=detail",
        "photoSource": "観光いばらき",
        "matchedQuery": "国営ひたち海浜公園",
    },
    "T024": {
        "imageUrl": "http://www.manazuru.net/wp-content/uploads/2023/05/PXT00001971362903-scaled.jpg",
        "photoPage": "https://www.manazuru.net/",
        "photoSource": "真鶴町観光協会",
        "matchedQuery": "真鶴半島",
    },
    "T025": {
        "imageUrl": "https://www.kasama-kankou.jp/data/top_photo/1683850149_8.jpg",
        "photoPage": "https://www.kasama-kankou.jp/",
        "photoSource": "笠間観光協会",
        "matchedQuery": "笠間",
    },
    "T027": {
        "imageUrl": "https://cdn-img.music-mdata.com/inner/photo/29489_20230824@2x.jpg",
        "photoPage": "https://www.livewalker.com/web/detail/29489",
        "photoSource": "LiveWalker",
        "matchedQuery": "神代植物公園",
    },
    "T029": {
        "imageUrl": "https://hinohara-kankou.jp/wp/wp-content/uploads/2023/06/IMG_0914-300x225.jpg",
        "photoPage": "https://hinohara-kankou.jp/season/",
        "photoSource": "檜原村観光協会",
        "matchedQuery": "檜原村",
    },
    "T030": {
        "imageUrl": "https://rstatic.enjoytokyo.jp/assets/images/spot/ff/l_00004236/img_5.jpg?1759397093&p=t&w=1800",
        "photoPage": "https://www.enjoytokyo.jp/spot/l_00004236/",
        "photoSource": "レッツエンジョイ東京",
        "matchedQuery": "江戸東京たてもの園",
    },
    "T031": {
        "imageUrl": "https://www.jindaiji.or.jp/image/top-keyvisual-1.jpg",
        "photoPage": "https://www.jindaiji.or.jp/",
        "photoSource": "深大寺",
        "matchedQuery": "深大寺",
    },
    "T032": {
        "imageUrl": "https://www.gotokyo.org/jp/spot/433/images/main.webp",
        "photoPage": "https://www.gotokyo.org/jp/spot/433/index.html",
        "photoSource": "GO TOKYO",
        "matchedQuery": "奥多摩湖",
    },
    "T033": {
        "imageUrl": "https://www.omekanko.gr.jp/wph8gq9w/wp-content/themes/omekanko/images/index_ph06.jpg",
        "photoPage": "https://www.omekanko.gr.jp/",
        "photoSource": "青梅市観光協会",
        "matchedQuery": "青梅・昭和レトロ",
    },
    "T038": {
        "imageUrl": "https://www.kanagawa-kankou.or.jp/storage/post_picture/20240214104915_pixta_84541848_M.jpg",
        "photoPage": "https://www.kanagawa-kankou.or.jp/spot/6033",
        "photoSource": "神奈川県観光協会",
        "matchedQuery": "宮ヶ瀬湖",
    },
    "T040": {
        "imageUrl": "http://www.town.hayama.lg.jp/material/images/group/15/51802234.jpg",
        "photoPage": "https://www.town.hayama.lg.jp/soshiki/sangyou/1/7225.html",
        "photoSource": "葉山町",
        "matchedQuery": "逗子・葉山",
    },
    "T047": {
        "imageUrl": "https://res-1.cloudinary.com/jnto/image/upload/w_1000,h_667,c_fill,f_auto,fl_lossy,q_auto/v1514120993/chiba/Chiba149_4",
        "photoPage": "https://www.japan.travel/en/spot/1544/",
        "photoSource": "日本政府観光局",
        "matchedQuery": "九十九里浜",
    },
    "T049": {
        "imageUrl": "https://www.motherfarm.co.jp/common/images/facebook.jpg",
        "photoPage": "https://www.motherfarm.co.jp/",
        "photoSource": "マザー牧場",
        "matchedQuery": "マザー牧場",
    },
    "T053": {
        "imageUrl": "https://maruchiba.jp/lsc/api/photo/?src=2230",
        "photoPage": "https://maruchiba.jp/photo/detail_2230.html",
        "photoSource": "まるごとe! ちば",
        "matchedQuery": "大多喜城",
    },
    "T057": {
        "imageUrl": "https://t-doitsumura.co.jp/wp/wp-content/uploads/2023/04/a8f0f3696ce15bf432161577af0c5dac-scaled.jpg",
        "photoPage": "https://t-doitsumura.co.jp/",
        "photoSource": "東京ドイツ村",
        "matchedQuery": "東京ドイツ村",
    },
    "T059": {
        "imageUrl": "https://gogo-saitama.jp/wp/wp-content/uploads/2022/05/pixta_80671746_XL.jpg",
        "photoPage": "https://gogo-saitama.jp/spot/s57385/",
        "photoSource": "go!go!埼玉",
        "matchedQuery": "名栗湖",
    },
    "T062": {
        "imageUrl": "https://metsa-hanno.com/wp-content/uploads/2024/07/ogp.jpg",
        "photoPage": "https://metsa-hanno.com/",
        "photoSource": "メッツァビレッジ",
        "matchedQuery": "飯能・ムーミンバレーパーク",
    },
    "T065": {
        "imageUrl": "https://tabi.jtb.or.jp/v1/storage/res/110261/110261_01C009.jpg",
        "photoPage": "https://tabi.jtb.or.jp/res/110261-/",
        "photoSource": "JTB総合研究所",
        "matchedQuery": "権現堂堤",
    },
    "T070": {
        "imageUrl": "https://res-2.cloudinary.com/jnto/image/upload/w_1000,h_667,c_fill,f_auto,fl_lossy,q_auto/v1671595448/ibaraki/Ibaraki_t_id394_1",
        "photoPage": "https://www.japan.travel/en/spot/1451/",
        "photoSource": "日本政府観光局",
        "matchedQuery": "牛久大仏",
    },
    "T077": {
        "imageUrl": "https://www.kankou-hitachi.jp/data/kankou_spot/1706012986_6.jpg",
        "photoPage": "https://www.kankou-hitachi.jp/spot.php?c=18&code=14&mode=detail",
        "photoSource": "日立市観光物産協会",
        "matchedQuery": "日立市かみね公園",
    },
    "T078": {
        "imageUrl": "https://www.kasama-kankou.jp/data/section_image/1621933966_8.jpg",
        "photoPage": "https://www.kasama-kankou.jp/section.php?code=497",
        "photoSource": "笠間観光協会",
        "matchedQuery": "笠間芸術の森公園",
    },
    "T080": {
        "imageUrl": "https://res-2.cloudinary.com/jnto/image/upload/w_1000,h_667,c_fill,f_auto,fl_lossy,q_auto/v1514182969/tochigi/Tochigi976_1",
        "photoPage": "https://www.japan.travel/en/spot/1480/",
        "photoSource": "日本政府観光局",
        "matchedQuery": "華厳の滝",
    },
    "T086": {
        "imageUrl": "https://www.tochigi-kankou.or.jp/admin/wp-content/uploads/2018/03/ohirasan-jinjya_02-760x570.jpg",
        "photoPage": "https://www.tochigi-kankou.or.jp/spot/ohirasan-jinjya",
        "photoSource": "栃木市観光協会",
        "matchedQuery": "太平山",
    },
    "T091": {
        "imageUrl": "https://www.mr-motegi.jp/top/assets/images/ogp.jpg",
        "photoPage": "https://www.mr-motegi.jp/",
        "photoSource": "モビリティリゾートもてぎ",
        "matchedQuery": "モビリティリゾートもてぎ",
    },
    "T092": {
        "imageUrl": "https://www.ikaho-kankou.com/wp/wp-content/uploads/2021/05/石段あかり横-2.jpg",
        "photoPage": "https://www.ikaho-kankou.com/",
        "photoSource": "渋川伊香保温泉観光協会",
        "matchedQuery": "伊香保温泉",
    },
    "T101": {
        "imageUrl": "https://www.watetsu.com/assets/img/top/top_slide_sp_local.jpg",
        "photoPage": "https://www.watetsu.com/",
        "photoSource": "わたらせ渓谷鐵道",
        "matchedQuery": "わたらせ渓谷鐵道",
    },
    "T102": {
        "imageUrl": "https://fujiguide.pref.yamanashi.jp/assets/exhibits/March2022/BKMyFLtamaZNDU53h4KR.jpg",
        "photoPage": "https://fujiguide.pref.yamanashi.jp/navi/40/",
        "photoSource": "ふじガイド",
        "matchedQuery": "本栖湖",
    },
    "T103": {
        "imageUrl": "https://kofu-tourism.com/image/rendering/attraction_image/31/keep/1200?v=6e3394266f2492923f730c3e300d59fef8261e3d",
        "photoPage": "https://kofu-tourism.com/spot/14",
        "photoSource": "甲府観光ナビ",
        "matchedQuery": "昇仙峡",
    },
    "T105": {
        "imageUrl": "https://www.kuonji.jp/wpmk22/wp-content/uploads/2021/12/top-slider-bokuryu.jpg",
        "photoPage": "https://www.kuonji.jp/",
        "photoSource": "身延山久遠寺",
        "matchedQuery": "身延山久遠寺",
    },
    "T108": {
        "imageUrl": "https://cdn.jalan.jp/jalan/img/6/kuchikomi/0326/KL/1b9d7_0000326573.jpg",
        "photoPage": "https://www.jalan.net/kankou/spt_guide000000170544/photo/",
        "photoSource": "じゃらん",
        "matchedQuery": "ほったらかし温泉",
    },
    "T110": {
        "imageUrl": "https://www.moeginomura.co.jp/cms/wp-content/uploads/2023/06/siteimg.jpg",
        "photoPage": "https://www.moeginomura.co.jp/",
        "photoSource": "萌木の村",
        "matchedQuery": "清里・萌木の村",
    },
    "T111": {
        "imageUrl": "https://www.fujiq.jp/igflrr000000003y-img/top_mtfuji.png",
        "photoPage": "https://www.fujiq.jp/",
        "photoSource": "富士急ハイランド",
        "matchedQuery": "富士急ハイランド",
    },
    "T115": {
        "imageUrl": "https://itospa.com/lsc/upfile/spot/0005/4002/54002_1_l.jpg",
        "photoPage": "https://itospa.com/spot/detail_54002.html",
        "photoSource": "伊東市観光サイト",
        "matchedQuery": "伊豆高原",
    },
    "T117": {
        "imageUrl": "https://static.wixstatic.com/media/e4a9d2_45ccda0b8af34e85b435e301f9bf133e~mv2.jpg",
        "photoPage": "https://www.shimoda-city.info/shirahama-ohama",
        "photoSource": "下田市観光協会",
        "matchedQuery": "白浜大浜海岸",
    },
}


def load_meta():
    raw = META_PATH.read_text(encoding="utf-8")
    match = re.search(r"window\.TRAVEL_PHOTO_META\s*=\s*(\{.*\});\s*$", raw, re.S)
    if not match:
        raise RuntimeError("Cannot parse travel_photo_meta.js")
    return json.loads(match.group(1))


def save_meta(meta):
    META_PATH.write_text(
        "window.TRAVEL_PHOTO_META = "
        + json.dumps(meta, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )


def fetch_binary(url):
    if any(blocked in url.lower() for blocked in BLOCKED):
        raise ValueError(f"blocked image source: {url}")
    parts = urllib.parse.urlsplit(url)
    url = urllib.parse.urlunsplit(
        (
            parts.scheme,
            parts.netloc,
            urllib.parse.quote(parts.path, safe="/%:@"),
            urllib.parse.quote(parts.query, safe="=&%:@/?"),
            parts.fragment,
        )
    )
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "Accept-Language": "ja,en;q=0.8",
        },
    )
    with urllib.request.urlopen(req, timeout=30, context=ctx) as response:
        return response.read(), response.headers


def extension(headers, url):
    content_type = headers.get("Content-Type", "").split(";")[0].strip().lower()
    guessed = mimetypes.guess_extension(content_type)
    suffix = Path(urllib.parse.urlparse(url).path).suffix.lower()
    ext = guessed or suffix or ".jpg"
    if ext in (".jpeg", ".jpe"):
        return ".jpg"
    if ext == ".jfif":
        return ".jpg"
    if ext in (".jpg", ".png", ".webp"):
        return ext
    return ".jpg"


def main():
    PHOTO_DIR.mkdir(parents=True, exist_ok=True)
    meta = load_meta()
    for tid, item in REPLACEMENTS.items():
        data, headers = fetch_binary(item["imageUrl"])
        image = Image.open(BytesIO(data))
        if min(image.size) < 160:
            raise RuntimeError(f"{tid} image looks too small: {image.size}")
        ext = extension(headers, item["imageUrl"])
        out = PHOTO_DIR / f"{tid}{ext}"
        out.write_bytes(data)
        meta[tid] = {
            "imageUrl": item["imageUrl"],
            "localImageUrl": str(out.relative_to(ROOT)),
            "photoSource": item["photoSource"],
            "matchedQuery": item["matchedQuery"],
            "photoPage": item["photoPage"],
        }
        print(f"{tid}: {item['photoSource']} -> {out.relative_to(ROOT)}")
    save_meta(meta)
    print(f"updated={len(REPLACEMENTS)}")


if __name__ == "__main__":
    main()

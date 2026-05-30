#!/usr/bin/env python3
"""Build map location metadata for the photo spot site.

The generated file is intentionally separate from the main spot dataset.
Cards, table rows, and the map all join by spot ID, so adding a future
spot only requires updating the source data and re-running this builder.
"""

from __future__ import annotations

import argparse
import hashlib
import math
import socket
import json
import re
import time
import urllib.parse
import urllib.request
from http.client import RemoteDisconnected
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DATA_JS = ROOT / "assets" / "data.js"
PHOTO_META_CACHE = ROOT / "assets" / "photo_meta_cache.json"
LOCATION_CACHE = ROOT / "assets" / "spot_locations_cache.json"
LOCATION_JS = ROOT / "assets" / "spot_locations.js"

NAME_ALIASES = {
    "东京塔外苑/芝公园": "東京タワー 芝公園",
    "东京晴空塔/ソラマチ周边": "東京スカイツリー ソラマチ",
    "丰洲市场/ぐるり公園": "豊洲市場 豊洲ぐるり公園",
    "台场海滨公园": "お台場海浜公園",
    "日本桥": "日本橋 東京都",
    "横滨大さん橋": "横浜港大さん橋",
    "涩谷Scramble Crossing": "渋谷スクランブル交差点",
    "皇居外苑/二重桥": "皇居外苑 二重橋",
    "鹤见线海芝浦站": "海芝浦駅",
    "麻布台Hills周边": "麻布台ヒルズ",
    "KITTE丸之内屋上庭园": "KITTE丸の内",
    "下北泽": "下北沢",
    "代官山T-SITE周边": "代官山T-SITE",
    "元町/山手西洋馆": "横浜 山手西洋館",
    "埼玉Super Arena/新都心": "さいたまスーパーアリーナ",
    "所泽航空纪念公园": "所沢航空記念公園",
    "新桥SL广场": "新橋SL広場",
    "月岛佃岛": "月島 佃島",
    "有乐町高架下": "有楽町 高架下",
    "横滨中华街": "横浜中華街",
    "涩谷Sky": "渋谷スカイ",
    "秋叶原电器街": "秋葉原電気街",
    "等等力溪谷": "等々力渓谷",
    "羽田机场展望デッキ": "羽田空港 展望デッキ",
    "自由之丘": "自由が丘 東京都",
    "荒川彩湖公园": "彩湖 道満グリーンパーク",
    "藏前/隅田川テラス": "蔵前 隅田川テラス",
    "谷中银座": "谷中銀座",
    "银座中央通り": "銀座中央通り",
    "隅田公园": "隅田公園",
    "高圆寺纯情商店街": "高円寺純情商店街",
    "东京国立博物馆外观": "東京国立博物館",
    "东京国际论坛": "東京国際フォーラム",
    "东京大学本乡キャンパス": "東京大学 本郷キャンパス",
    "东京站丸之内广场": "東京駅丸の内駅前広場",
    "丸之内仲通り": "丸の内仲通り",
    "代代木公园": "代々木公園",
    "六本木新城展望台周边": "六本木ヒルズ展望台",
    "千叶港塔": "千葉ポートタワー",
    "国立新美术馆": "国立新美術館",
    "圣桥/御茶之水": "聖橋 御茶ノ水",
    "城南岛海滨公园": "城南島海浜公園",
    "大宫盆栽村": "大宮盆栽村",
    "彩虹桥步道": "レインボーブリッジ遊歩道",
    "汐留Caretta/电通大楼周边": "カレッタ汐留",
    "迎宾馆赤坂离宫": "迎賓館赤坂離宮",
    "鉄道博物馆": "鉄道博物館 埼玉",
    "武藏一宫冰川神社": "武蔵一宮氷川神社",
    "船桥三番濑海浜公园": "ふなばし三番瀬海浜公園",
    "葛西临海公园": "葛西臨海公園",
    "行德野鳥観察舎周边": "行徳野鳥観察舎",
    "都电荒川线沿线": "都電荒川線",
    "三轩茶屋キャロットタワー": "三軒茶屋キャロットタワー",
    "上野公园": "上野公園",
    "中目黑目黑川": "中目黒 目黒川",
    "六义园": "六義園",
    "国营昭和纪念公园": "国営昭和記念公園",
    "小石川后乐园": "小石川後楽園",
    "井之头恩赐公园": "井の頭恩賜公園",
    "千鸟渊": "千鳥ヶ淵",
    "增上寺": "増上寺",
    "根津美术馆外苑": "根津美術館",
    "浜离宫恩赐庭园": "浜離宮恩賜庭園",
    "王子飞鸟山公园": "飛鳥山公園",
    "豪德寺": "豪徳寺",
    "江之岛": "江の島",
    "京浜岛つばさ公園": "京浜島つばさ公園",
    "油壺湾": "油壺湾",
    "稻村ヶ崎": "稲村ヶ崎",
    "猿岛": "猿島",
    "吉见百穴": "吉見百穴",
    "東京德国村": "東京ドイツ村",
    "佐助稻荷神社": "佐助稲荷神社",
    "野岛埼灯台": "野島埼灯台",
    "鹫宫神社": "鷲宮神社",
    "真鹤岬/三ツ石": "真鶴岬 三ツ石",
    "三岛Skywalk": "三島スカイウォーク",
    "原冈栈桥/岡本桟橋": "原岡桟橋 岡本桟橋",
    "大洗磯前神社 神磯の鳥居": "大洗磯前神社 神磯の鳥居",
    "箱根芦之湖": "箱根 芦ノ湖",
    "养老溪谷": "養老渓谷",
    "胜浦朝市/渔港": "勝浦朝市 勝浦漁港",
    "黑山三滝": "黒山三滝",
    "栃木蔵の街": "栃木蔵の街",
    "美の山公园": "美の山公園",
    "华严瀑布": "華厳の滝",
    "新仓山浅间公园": "新倉山浅間公園",
    "浓沟の滝/龟岩洞窟": "濃溝の滝 亀岩の洞窟",
    "箱根神社平和鸟居": "箱根神社 平和の鳥居",
    "偕乐园": "偕楽園",
    "日光东照宫": "日光東照宮",
    "足利花卉公园": "あしかがフラワーパーク",
    "国营日立海滨公园": "国営ひたち海浜公園",
    "热海亲水公园": "熱海親水公園",
    "热海梅园": "熱海梅園",
    "富冈制丝场": "富岡製糸場",
    "鹿岛神宫": "鹿島神宮",
    "小田原-热海东海道线海岸段": "小田原 熱海 東海道線 海岸",
    "少林山达磨寺": "少林山達磨寺",
}

PREF_ALIASES = {
    "东京": "東京都",
    "千叶": "千葉県",
    "神奈川": "神奈川県",
    "埼玉": "埼玉県",
    "茨城": "茨城県",
    "栃木": "栃木県",
    "群马": "群馬県",
    "山梨": "山梨県",
    "静冈": "静岡県",
}

PREF_CENTERS = {
    "东京": (35.681236, 139.767125),
    "千叶": (35.607404, 140.106515),
    "神奈川": (35.443708, 139.638026),
    "埼玉": (35.861729, 139.645482),
    "茨城": (36.341813, 140.446793),
    "栃木": (36.565725, 139.883565),
    "群马": (36.391208, 139.060156),
    "山梨": (35.663935, 138.568321),
    "静冈": (34.975562, 138.382759),
}


def load_data() -> dict:
    text = DATA_JS.read_text(encoding="utf-8")
    prefix = "window.PHOTO_SPOTS_DATA = "
    if not text.startswith(prefix):
        raise RuntimeError("Unexpected data.js format")
    return json.loads(text[len(prefix) :].rstrip(";\n"))


def load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def geo_from_matched_query(value: str | None) -> tuple[float, float] | None:
    if not value:
        return None
    match = re.search(r"Geo:\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)", value)
    if not match:
        return None
    return float(match.group(1)), float(match.group(2))


def maps_query(meta: dict, spot: dict) -> str:
    maps_url = meta.get("mapsUrl") or ""
    parsed = urllib.parse.urlparse(maps_url)
    query = urllib.parse.parse_qs(parsed.query).get("query", [""])[0]
    if query:
        return query
    return " ".join(str(part) for part in [spot.get("地点"), spot.get("区域"), spot.get("都县"), "日本"] if part)


def query_candidates(meta: dict, spot: dict) -> list[str]:
    pref = " ".join(PREF_ALIASES.get(part, part) for part in str(spot.get("都县", "")).split("/"))
    area = str(spot.get("区域") or "")
    aliased = NAME_ALIASES.get(spot.get("地点"))
    raw = str(spot.get("地点") or "")
    candidates = [
        " ".join(part for part in [aliased, area, pref, "日本"] if part),
        " ".join(part for part in [meta.get("photoTitle"), area, pref, "日本"] if part),
        " ".join(part for part in [meta.get("matchedQuery"), pref, "日本"] if part and not str(part).startswith(("Search:", "Retry:", "Geo:"))),
        maps_query(meta, spot),
        " ".join(part for part in [raw, area, pref, "日本"] if part),
    ]
    seen = set()
    clean = []
    for query in candidates:
        query = str(query).strip()
        if not query or query in seen:
            continue
        seen.add(query)
        clean.append(query)
    return clean


def geocode(query: str) -> dict | None:
    params = urllib.parse.urlencode(
        {
            "q": query,
            "format": "jsonv2",
            "limit": 1,
            "countrycodes": "jp",
        }
    )
    url = f"https://nominatim.openstreetmap.org/search?{params}"
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "tokyo-kanto-photo-spots-location-builder/1.0 (private local site)",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (TimeoutError, RemoteDisconnected, socket.timeout, urllib.error.URLError):
        return None
    if not payload:
        return None
    first = payload[0]
    return {
        "lat": round(float(first["lat"]), 6),
        "lng": round(float(first["lon"]), 6),
        "source": "nominatim",
        "displayName": first.get("display_name"),
        "precision": first.get("class") or "search",
    }


def approximate_location(spot: dict) -> dict:
    pref = str(spot.get("都县", "")).split("/")[0]
    center = PREF_CENTERS.get(pref, PREF_CENTERS["东京"])
    digest = hashlib.sha1(str(spot.get("ID")).encode("utf-8")).digest()
    angle = (int.from_bytes(digest[:2], "big") / 65535) * math.tau
    radius = 0.05 + (digest[2] / 255) * 0.18
    lat = center[0] + math.sin(angle) * radius
    lng = center[1] + math.cos(angle) * radius
    return {
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        "source": "prefecture-approx",
        "precision": "approximate",
    }


def build(refresh_missing: bool) -> tuple[dict, dict]:
    data = load_data()
    photo_meta = load_json(PHOTO_META_CACHE, {})
    cache = load_json(LOCATION_CACHE, {})

    for spot in data["spots"]:
      spot_id = str(spot["ID"])
      meta = photo_meta.get(spot_id, {})
      geo = geo_from_matched_query(meta.get("matchedQuery"))
      if geo:
          cache[spot_id] = {
              "lat": round(geo[0], 6),
              "lng": round(geo[1], 6),
              "source": "photo-meta",
              "precision": "geo-verified",
          }
          continue
      if spot_id in cache and cache[spot_id].get("lat") and cache[spot_id].get("lng"):
          continue
      if refresh_missing:
          queries = query_candidates(meta, spot)
          resolved = None
          for query in queries:
              resolved = geocode(query)
              time.sleep(1.1)
              if resolved:
                  resolved["query"] = query
                  break
          if resolved:
              cache[spot_id] = resolved
          else:
              cache[spot_id] = {"source": "missing", "query": queries[0] if queries else ""}

    locations = {}
    missing = []
    approximate = []
    for spot in data["spots"]:
        spot_id = str(spot["ID"])
        item = cache.get(spot_id, {})
        if item.get("lat") and item.get("lng"):
            locations[spot_id] = {
                "lat": item["lat"],
                "lng": item["lng"],
                "source": item.get("source", "cache"),
                "precision": item.get("precision", "search"),
            }
        else:
            approx = approximate_location(spot)
            locations[spot_id] = approx
            approximate.append(spot_id)
            missing.append(spot_id)

    return cache, {"locations": locations, "missing": missing, "approximate": approximate}


def write_outputs(cache: dict, result: dict) -> None:
    LOCATION_CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    payload = {
        "locations": result["locations"],
        "meta": {
            "totalLocated": len(result["locations"]),
            "missingIds": result["missing"],
            "approximateIds": result["approximate"],
            "generatedBy": "build_spot_locations.py",
        },
    }
    LOCATION_JS.write_text(
        "window.PHOTO_SPOTS_LOCATIONS = "
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh-missing", action="store_true", help="Resolve missing coordinates through Nominatim")
    args = parser.parse_args()
    cache, result = build(args.refresh_missing)
    write_outputs(cache, result)
    print(
        f"located={len(result['locations'])} "
        f"exact={len(result['locations']) - len(result['approximate'])} "
        f"approximate={len(result['approximate'])}"
    )
    if result["missing"]:
        print("missing ids:", ",".join(result["missing"]))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Retry failed geocoding with simplified queries."""
import json, time, urllib.request, urllib.parse, os

DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(DIR, "assets")

# Failed spots with alternative search queries
RETRY = [
    ("T015", "足利フラワーパーク", "足利"),
    ("T033", "青梅宿", "青梅"),
    ("T045", "幕山公園 湯河原", "湯河原"),
    ("T053", "大多喜城 千葉", "大多喜"),
    ("T054", "勝浦朝市 千葉", "勝浦"),
    ("T062", "メッツァビレッジ 飯能", "飯能"),
    ("T067", "大宮盆栽美術館", "さいたま"),
    ("T077", "かみね公園 日立", "日立"),
    ("T080", "華厳の滝 日光", "日光"),
    ("T084", "宇都宮 餃子", "宇都宮"),
    ("T090", "那珂川 栃木", "栃木"),
    ("T094", "水上温泉 群馬", "みなかみ"),
    ("T096", "めがね橋 碓氷", "安中"),
    ("T098", "桐生川ダム", "桐生"),
    ("T101", "わたらせ渓谷鉄道", "みどり"),
    ("T105", "身延山 久遠寺", "身延"),
    ("T109", "武田神社 甲府", "甲府"),
    ("T110", "萌木の村 清里", "清里"),
    ("T117", "白浜海岸 下田", "下田"),
    ("T123", "田貫湖 富士宮", "富士宮"),
    ("T124", "富士宮焼きそば", "富士宮"),
]

def geocode(query, retries=3):
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({
        "q": f"{query}, Japan", "format": "json", "limit": 1, "accept-language": "ja"
    })
    req = urllib.request.Request(url, headers={"User-Agent": "TokyoKantoTravelNote/1.0 (retry)"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                results = json.loads(resp.read())
                if results:
                    r = results[0]
                    return float(r["lat"]), float(r["lon"])
                return None
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2)
    return None

def main():
    loc_path = os.path.join(ASSETS, "travel_locations.js")
    raw = open(loc_path, encoding="utf-8").read()
    data = json.loads(raw[raw.index("{"):raw.rindex("}")+1])
    locations = data["locations"]

    refined = 0
    for tid, query, area in RETRY:
        print(f"{tid}: '{query}'...", end=" ", flush=True)
        result = geocode(query)
        if result:
            locations[tid] = {"lat": result[0], "lng": result[1], "source": "nominatim", "precision": "search"}
            print(f"✓ {result[0]:.4f},{result[1]:.4f}")
            refined += 1
        else:
            # Try without area
            print(f"✗ primary, trying area '{area}'...", end=" ", flush=True)
            result2 = geocode(area)
            if result2:
                locations[tid] = {"lat": result2[0], "lng": result2[1], "source": "nominatim", "precision": "approximate"}
                print(f"~ {result2[0]:.4f},{result2[1]:.4f} (area-level)")
                refined += 1
            else:
                print("✗✗")
        time.sleep(1.1)

    data["locations"] = locations
    js = f"window.TRAVEL_LOCATIONS = {json.dumps(data, ensure_ascii=False, separators=(',', ':'))};\n"
    with open(loc_path, "w", encoding="utf-8") as f:
        f.write(js)
    print(f"\nRetry refined: {refined}/{len(RETRY)}")

if __name__ == "__main__":
    main()

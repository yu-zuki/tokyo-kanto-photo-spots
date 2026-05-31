#!/usr/bin/env python3
"""Batch geocode travel spots via Nominatim and update travel_locations.js."""
import json, time, urllib.request, urllib.parse, os, sys

DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(DIR, "assets")

def load_json_from_js(path):
    raw = open(path, encoding="utf-8").read()
    start = raw.index("{")
    end = raw.rindex("}")
    return json.loads(raw[start:end+1])

def save_js(path, obj_name, data):
    js = f"window.{obj_name} = {json.dumps(data, ensure_ascii=False, separators=(',', ':'))};\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(js)

def geocode(spot_name, prefecture, retries=3):
    """Geocode a spot name+prefecture via Nominatim."""
    query = f"{spot_name}, {prefecture}, Japan"
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({
        "q": query, "format": "json", "limit": 1, "accept-language": "ja"
    })
    req = urllib.request.Request(url, headers={"User-Agent": "TokyoKantoTravelNote/1.0 (batch geocoding)"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                results = json.loads(resp.read())
                if results:
                    r = results[0]
                    return {
                        "lat": float(r["lat"]), "lng": float(r["lon"]),
                        "source": "nominatim",
                        "precision": "search",
                        "display_name": r.get("display_name", "")
                    }
                else:
                    print(f"  No results for: {query}")
                    return None
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2)
            else:
                print(f"  Error geocoding {query}: {e}")
                return None
    return None

def main():
    # Load travel data to get spot names
    travel_data = load_json_from_js(os.path.join(ASSETS, "travel_data.js"))
    spots = travel_data.get("spots", [])

    # Load existing locations
    loc_data = load_json_from_js(os.path.join(ASSETS, "travel_locations.js"))
    locations = loc_data.get("locations", {})

    # Find spots with approximate coordinates or missing
    to_refine = []
    for spot in spots:
        tid = spot["travel_id"]
        loc = locations.get(tid, {})
        if loc.get("precision") == "approximate" or loc.get("source") == "manual" or not loc.get("lat"):
            to_refine.append((tid, spot["name_ja"], spot["prefecture"]))

    if not to_refine:
        print("All coordinates already refined!")
        return

    print(f"Geocoding {len(to_refine)} spots via Nominatim...")
    print(f"Estimated time: {len(to_refine) * 1.5:.0f}s (1.1s delay per request)\n")

    refined = 0
    failed = []

    for i, (tid, name, pref) in enumerate(to_refine):
        print(f"[{i+1}/{len(to_refine)}] {name} ({pref})...", end=" ", flush=True)
        result = geocode(name, pref)
        if result:
            locations[tid] = {
                "lat": result["lat"], "lng": result["lng"],
                "source": "nominatim",
                "precision": "search"
            }
            print(f"✓ {result['lat']:.4f},{result['lng']:.4f}")
            refined += 1
        else:
            # Keep existing approximate coords
            print("✗ (keeping approximate)")
            failed.append(f"{tid}: {name} ({pref})")

        # Rate limit: 1.1s between requests (Nominatim allows ~1/sec)
        if i < len(to_refine) - 1:
            time.sleep(1.1)

    # Save updated locations
    loc_data["locations"] = locations
    loc_data["meta"]["totalLocated"] = len(locations)
    save_js(os.path.join(ASSETS, "travel_locations.js"), "TRAVEL_LOCATIONS", loc_data)

    print(f"\n--- Results ---")
    print(f"Refined: {refined}/{len(to_refine)}")
    if failed:
        print(f"Failed ({len(failed)}):")
        for f in failed:
            print(f"  {f}")

if __name__ == "__main__":
    main()

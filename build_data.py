import json
import math
from pathlib import Path

import pandas as pd


SOURCE = Path("/Users/yuzuki/Downloads/tokyo_kanto_photo_spots_quant_pool.xlsx")
OUT = Path("assets/data.js")


def clean(value):
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if pd.isna(value):
        return None
    if hasattr(value, "item"):
        value = value.item()
    return value


def records(sheet_name):
    df = pd.read_excel(SOURCE, sheet_name=sheet_name)
    return [
        {str(key): clean(value) for key, value in row.items()}
        for row in df.to_dict(orient="records")
    ]


payload = {
    "spots": records("TopByScore"),
    "scoringModel": records("ScoringModel"),
    "categorySummary": records("CategorySummary"),
    "readme": records("README"),
    "sourceFile": SOURCE.name,
}

OUT.write_text(
    "window.PHOTO_SPOTS_DATA = "
    + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    + ";\n",
    encoding="utf-8",
)

print(f"Wrote {OUT} with {len(payload['spots'])} spots")

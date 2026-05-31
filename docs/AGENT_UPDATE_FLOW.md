# Agent Update Flow

AI agent がこのプロジェクトを更新するための標準手順。

## 基本原則

- 全データの主キーは `spot.ID`（1〜260）
- `assets/data.js` がマスターデータ
- 変更後は必ず `node --check assets/app.js`
- ローカルテスト `python3 -m http.server 4173` → `curl` で HTTP 200 確認
- **デプロイ前に必ずテストすること**

## 撮影地の追加

### 1. data.js に追加
`assets/data.js` の `spots` 配列にレコード追加。必須フィールド: ID, 地点, 都县, 区域, 类型, 候选等级, 总分100, 交通级别, 预计耗时, スコア内訳7項目。

### 2. 写真取得（優先順）
1. **GANREF** — `https://ganref.jp/spot/photo/jpn/{pref}.html` → LPページサムネイル
2. **Flickr** — 地理座標検索 `lat=X&lon=Y&radius=2` → 位置検証済み
3. **Bing Images** — `murl` パターン（最終手段）
- 保存先: `assets/photos/ganref/{ID}.jpg`
- `photo_meta.js` の `localImageUrl` を更新

### 3. 座標追加
Nominatim で `{日本語名}, {エリア}, {都県}, Japan` 形式で地理编码。`spot_locations.js` を更新。

### 4. 日本語名（必要な場合）
`localizeSpotName()` の aliases に追加。

## 写真の重複チェック
```python
import hashlib
from collections import defaultdict
hash_to_files = defaultdict(list)
for f in Path('assets/photos/ganref').iterdir():
    h = hashlib.md5(f.read_bytes()).hexdigest()
    hash_to_files[h].append(f.name)
# 重複あれば Flickr 地理検索で差し替え
```

## 座標の一括修正
`/tmp/fix_coords_v3.py` を使用。`localizeSpotName()` + `localizeText()` の日本語変換 → Nominatim 検索 → 都県バウンドで検証。

## ファイル構成
```
assets/data.js              ← 260スポット基本情報
assets/photo_meta.js         ← 写真URL・パス・ソース
assets/spot_locations.js     ← 緯度経度
assets/japanese_photo_refs.js ← 日本写真サイト参照リンク
assets/app.js                ← 全ロジック
assets/styles.css            ← 全スタイル
index.html                   ← HTML骨格
manifest.json                ← PWA
sw.js                        ← Service Worker
```

## スコアリング（100点満点）
| 項目 | 満点 | キー |
|---|---|---|
| アクセス | 20 | 交通分20 |
| 画面力 | 25 | 画面强度25 |
| 題材密度 | 15 | 题材密度15 |
| 光/季節 | 15 | 光线季节稳定15 |
| 人流 | 10 | 人流可控10 |
| 機材 | 10 | 器材适配10 |
| リスク | 5 | 风险成本5 |

## 天気データ
Open-Meteo 無料API。9都県の3日間予報。
```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=35.68,35.60,...&longitude=139.75,140.12,...
  &daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset
  &timezone=Asia/Tokyo&forecast_days=3
```

## チェックリスト
- [ ] `node --check assets/app.js`
- [ ] `curl` で全ファイル HTTP 200
- [ ] カード・表・地図の3ビュー正常
- [ ] 天気パネルにデータ表示
- [ ] 各カードに天気バッジ 🟢🟡🔴 表示
- [ ] フィルター全種動作
- [ ] 旅程追加・削除・コピー可能
- [ ] `git push` → Actions 成功

# 東京・関東 撮影地ノート 開発ドキュメント

## 目的

このサイトは、東京・関東圏の撮影地候補を一元管理し、カード、表、地図で同じデータを確認するための静的 Web アプリです。GitHub Pages で配信できるよう、バックエンドに依存しない構成にしています。

## 設計方針

- データを一箇所に寄せ、UI は派生表示にする。
- カード、表、地図は同じ `spots` 配列と同じフィルタ状態を読む。
- 写真、参照リンク、位置情報は撮影地 ID で join する。
- 外部サービス依存は adapter 層に閉じ込める。
- 新しい撮影地を追加しても、各ビューに marker や行を個別追加しない。

## ファイル構成

- `index.html`
  アプリの骨格。ビュー切替、フィルタ、カード、表、地図のコンテナだけを持つ。
- `assets/data.js`
  メインデータ。Excel 由来の撮影地、スコア、カテゴリ、交通情報を保持する。
- `assets/photo_meta.js`
  写真、写真元、Google Maps URL などの補助 metadata。
- `assets/japanese_photo_refs.js`
  日本の写真サイト参照リンク。
- `assets/spot_locations.js`
  地図用の位置 index。撮影地 ID を key にして緯度経度を保持する。
- `assets/map_config.js`
  地図 provider 設定。Google Maps API key を入れる場所。
- `assets/app.js`
  状態管理、フィルタ、カード、表、地図 adapter の実装。
- `assets/styles.css`
  画面全体の見た目。
- `build_spot_locations.py`
  `assets/spot_locations.js` を生成する位置データ builder。

## データ結合

主キーはすべて `spot.ID` です。

```text
assets/data.js
  spot.ID
    ├─ assets/photo_meta.js[ID]
    ├─ assets/japanese_photo_refs.js[ID]
    └─ assets/spot_locations.js.locations[ID]
```

このため、新しい撮影地を追加するときは `assets/data.js` に spot を追加し、必要に応じて metadata builder を実行します。UI 側にカード、表行、地図 marker を手で追加する必要はありません。

## 状態管理

`assets/app.js` の `state` が画面状態の source of truth です。

- `search`
- `grade`
- `pref`
- `type`
- `traffic`
- `time`
- `minScore`
- `savedOnly`
- `sort`
- `view`

`filteredSpots()` がこの状態をもとに結果を返し、カード、表、地図が同じ結果を描画します。これにより、フィルタ追加時も `filteredSpots()` に条件を追加すれば全ビューへ自然に反映されます。

## 地図設計

地図は `spot_locations.js` を読むだけです。marker を個別に書きません。

位置精度は `precision` で表します。

- `geo-verified`: 写真 metadata などから得た座標。
- `search`: 地名検索で得た座標。
- `approximate`: 地域中心、または最終手段として都県中心から生成した概略位置。

現在は全 260 件を表示できます。正確な座標がない地点も地図から消えないよう、概略位置で fallback します。

## Google Maps について

Google Maps を正式に埋め込む場合は API key が必要です。

`assets/map_config.js` を次のように変更します。

```js
window.PHOTO_SPOTS_MAP_CONFIG = {
  provider: "google",
  googleMapsApiKey: "YOUR_API_KEY",
};
```

API key がない場合は Leaflet adapter を使います。各 popup には常に Google Maps で開くリンクを出します。

## 位置データ更新

撮影地追加後に位置 index を更新します。

```bash
python3 build_spot_locations.py --refresh-missing
```

外部 geocoding が不安定な場合でも builder は失敗しない設計です。未解決地点は `area-approx` または `prefecture-approx` の概略位置で表示され、あとから cache を修正すれば地図だけ精度を上げられます。

## 拡張時のルール

- 新しい view を追加するときは `filteredSpots()` の結果を使う。
- 新しい metadata は ID join にする。
- UI から raw Excel field を直接読まず、必要なら `spots = rawSpots.map(...)` の正規化層へ追加する。
- 外部 API や map provider は adapter 関数に閉じ込める。
- 永続化が必要な UI 設定は `localStorage` key を分ける。

## 検証

最低限の確認:

```bash
node --check assets/app.js
python3 -m py_compile build_spot_locations.py
python3 build_spot_locations.py
```

ローカル表示:

```bash
python3 -m http.server 4173
```

ブラウザで `http://127.0.0.1:4173/index.html` を開き、カード、表、地図の 3 ビューが同じフィルタ結果を表示することを確認します。

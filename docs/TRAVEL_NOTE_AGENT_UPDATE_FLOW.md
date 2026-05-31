# 関東旅行 Note Agent Update Flow

この文書は `東京発 関東旅行ノート` のデータを AI agent が追加・更新・再評価するための標準手順です。Codex、Claude Code、その他 agent はこの文書を優先して参照してください。

## 基本方針

- 主言語は日本語。中文は表示翻訳であり、データ join key には使わない。
- 旅行 Note は撮影地 Note とは別データとして管理する。
- 最重要スコアは `人少・混雑回避`。
- 全地点に source evidence を残す。
- 座標と Google Maps URL はデータとして保存する。
- 評価変更時は `score_update` ログを残す。

## 推奨ファイル構成

表示用コンパイル産物:

```text
assets/travel_data.js
assets/travel_locations.js
assets/travel_photo_meta.js
assets/travel_refs.js
```

将来の source data:

```text
data/travel/spots.json
data/travel/aliases.json
data/travel/geo.json
data/travel/scores.json
data/travel/source_observations.json
data/travel/media_assets.json
data/travel/update_runs.json
```

設定:

```text
config/travel_source_registry.json
config/travel_scoring_model.json
```

## Source Registry

優先する情報源は日本国内向けサイトと公式サイト。

### 公式・自治体

信頼度が高い。営業時間、料金、アクセス、季節イベント、休業、工事、規制の根拠に使う。

- 都県公式観光サイト
- 市区町村観光協会
- 施設公式サイト
- 公園・自然保護区・鉄道会社公式
- 温泉地公式

### 旅行・観光メディア

候補発見、体験価値、季節性、モデルコースの参考に使う。

- じゃらん
- るるぶ
- ことりっぷ
- OZmall
- RETRIP
- Walkerplus
- びゅうたび
- 観光経済新聞など地域旅行記事

### 地図・口コミ

混雑、実アクセス、滞在密度の参考に使う。ただし口コミだけで最終判断しない。

- Google Maps
- Yahoo! MAP
- NAVITIME
- 駅すぱあと / 乗換案内系

### SNS / 写真系補助

季節のリアルタイム感、混雑、実際の雰囲気確認に使う。

- X 検索
- Instagram 公式タグ
- note 旅行記
- 個人ブログ
- YouTube 旅行 vlog

SNS は一次根拠ではなく補助情報。公式情報と矛盾する場合は公式を優先する。

## Observation Schema

agent はサイトから得た情報を直接スコアにせず、まず observation として残す。

| フィールド | 説明 |
| --- | --- |
| `observation_id` | 一意 ID |
| `travel_id` | 既存地点と照合できた場合 |
| `source_id` | source registry の ID |
| `source_url` | 根拠 URL |
| `observed_name` | サイト上の名称 |
| `observed_area` | エリア |
| `observed_category` | サイト上のカテゴリ |
| `observed_access` | 東京からのアクセス記述 |
| `observed_season` | 季節情報 |
| `observed_crowd_signal` | 混雑・穴場・行列・人気時間など |
| `observed_cost` | 料金 |
| `observed_weather_risk` | 雨天・荒天・冬季閉鎖など |
| `evidence_text` | 重要内容の短い要約 |
| `confidence` | 0-1 |
| `observed_at` | 取得日 |

## 候補追加 Flow

### 1. 候補収集

以下の検索軸で候補を探す。

- 東京から日帰り 穴場
- 関東 日帰り 人少ない
- 関東 週末旅行 穴場
- 東京発 1泊2日 温泉 静か
- 関東 混雑しない 観光地
- 関東 ローカル線 旅行
- 関東 古い町並み 穴場
- 関東 海 一人旅
- 関東 高原 夏 涼しい
- 関東 雨の日 旅行

候補は一度に大量追加せず、1 run で 10-30 件程度にする。

### 2. 重複判定

以下が近ければ同一地点候補として扱う。

- 正式名称一致
- 別名一致
- Google Maps place が同一
- 緯度経度が近い
- 公式サイト URL が同一

例:

- `草津温泉` と `草津温泉街` は同一または親子関係
- `江の島` と `江島神社` は旅行地点としては分けてもよいが、エリア旅程では近接地点

### 3. Google Maps 情報

必ず保存する。

- `google_maps_url`
- `lat`
- `lng`
- `geo_precision`
- `geo_source`
- `verified_at`

座標が取れない場合でも、都県中心ではなく、公式住所・施設名で再確認する。

### 4. 写真

旅行 Note では写真は補助。現地イメージが伝わるものを優先する。

優先順位:

1. 公式観光サイトの代表写真
2. 施設公式写真
3. 観光メディアの代表写真
4. Wikimedia / Wikipedia
5. 既存のローカル取得画像

写真は `media_assets` として source URL を残す。

## スコアリングモデル

100 点満点。

```text
total =
  crowd_avoidance        30
+ experience_value       20
+ tokyo_access           15
+ season_stability       10
+ stay_density           10
+ cost_reasonability      5
+ weather_resilience      5
+ revisit_value           5
```

### crowd_avoidance 30

最重要項目。

- 27-30: 休日でも広く分散できる。混雑時間を外せば静か。観光バスや団体客が少ない。
- 23-26: 人気はあるが、朝夕・平日・裏道・周辺スポットで避けやすい。
- 17-22: 普通。週末は混むが、時間帯である程度コントロールできる。
- 10-16: 人気観光地。メイン動線が混みやすい。
- 0-9: 連休・イベント・紅葉・桜などで非常に混む。逃げ場が少ない。

加点要素:

- 駅から離れていて人が分散する
- 面積が広い
- 朝夕に成立する
- 季節ピーク以外も魅力がある
- 周辺に代替スポットがある

減点要素:

- 狭い通路
- 展望台・橋・参道など一点集中
- SNS で過熱
- 大型連休・紅葉・桜のピーク依存
- 駐車場待ちが発生しやすい

### experience_value 20

- 18-20: 東京から出る意味が明確。温泉、島、高原、歴史町、絶景など非日常が強い。
- 14-17: 十分旅行感がある。半日以上楽しめる。
- 10-13: よいが近場感が強い、または目的が限定的。
- 0-9: わざわざ旅行として行く理由が弱い。

### tokyo_access 15

- 14-15: 東京/新宿から 90 分以内、公共交通で簡単。
- 11-13: 90-150 分、日帰り現実的。
- 7-10: 150-210 分、日帰り可能だが重い。
- 0-6: 車必須、船・バス本数・終電リスクが高い。

### season_stability 10

- 9-10: 通年成立。
- 7-8: ベストシーズンはあるが外しても楽しめる。
- 4-6: 花、紅葉、雪、祭りなど短期依存。
- 0-3: 条件を外すと旅行価値が大きく下がる。

### stay_density 10

- 9-10: 半日から1日遊べる。周辺の食事・散策・温泉・施設が揃う。
- 7-8: 2-4時間程度の滞在密度。
- 4-6: 目的地単体。周辺が弱い。
- 0-3: ほぼ一点訪問。

### cost_reasonability 5

- 5: 低コストで満足度が高い。
- 4: 標準的。
- 3: 交通費・入場料が少し重い。
- 1-2: 宿泊・船・車・高額施設が必要。

### weather_resilience 5

- 5: 雨でも成立。屋内や温泉、街歩き代替がある。
- 4: 曇天・小雨なら成立。
- 3: 天気にやや左右される。
- 1-2: 晴天前提、荒天リスク大。

### revisit_value 5

- 5: 季節違い・目的違いで再訪したい。
- 4: 年1回程度再訪価値あり。
- 3: 一度行けば十分だが満足度はある。
- 1-2: リピート性が弱い。

## Crowd Profile

スコアとは別に、必ず crowd profile を持たせる。

| フィールド | 説明 |
| --- | --- |
| `crowd_level` | low / medium / high / extreme |
| `quiet_window` | 平日朝、日曜夕方、冬季など |
| `avoid_window` | 連休、昼、紅葉ピークなど |
| `holiday_risk` | low / medium / high |
| `parking_risk` | low / medium / high |
| `tourist_density` | local / domestic / inbound / mixed |
| `escape_routes` | 混雑時の代替場所 |
| `crowd_evidence_urls` | 根拠 URL |

## ランク判定

- `S`: 86 点以上。人少・体験価値・アクセスのバランスが非常に良い。
- `A`: 78-85 点。安定しておすすめ。
- `B`: 68-77 点。目的や季節が合えば良い。
- `C`: 67 点以下。優先度低め、または混雑・交通・季節依存が強い。

## 再評価トリガー

以下の変化が見つかったら再評価する。

- SNS や観光メディアで急に人気化した
- 公式がイベント・工事・休業・料金変更を発表した
- 新しい交通ルート、特急、バス廃止、船便変更があった
- 紅葉・花・祭りなど季節イベントの混雑傾向が変わった
- Google Maps 口コミで駐車場待ち、行列、外国人観光客増加が目立つ
- 新しい代替スポットが見つかり、人を避けやすくなった

## score_update ログ

スコアを変更したら、commit message または update log に必ず残す。

```text
travel_score_update:
  travel_id:
  name_ja:
  old_total:
  new_total:
  changed_fields:
  crowd_change:
  evidence_urls:
  note:
```

スコアを変えない場合も、重要な crowd evidence があれば observation として追加する。

## Agent 実行手順

1. `docs/TRAVEL_NOTE_MODULE_PLAN.md` とこの文書を読む。
2. source registry に従い候補または既存地点を調査する。
3. observation を作る。
4. 既存地点と照合する。
5. 新規なら `travel_id` を発行する。
6. Google Maps URL と座標を保存する。
7. スコアを計算する。
8. crowd profile を記録する。
9. 表示用 `assets/travel_*.js` を生成する。
10. ローカル検証する。
11. commit / push する。

## 検証チェックリスト

- [ ] `node --check assets/app.js`
- [ ] `curl http://127.0.0.1:4173/index.html` が 200
- [ ] 撮影地 Note が壊れていない
- [ ] 旅行 Note の概要が表示される
- [ ] 旅行 Note のカードが表示される
- [ ] 旅行 Note の表が表示される
- [ ] 旅行 Note の地図 marker が表示される
- [ ] 旅行 Note の旅程から Google Maps 順序ルートが開く
- [ ] フィルタがカード・表・地図に反映される
- [ ] 人少スコアと crowd profile が表示される

## 初期 seed 候補の方向性

Phase 1 の seed data は有名すぎる場所だけで埋めない。混雑回避の検証ができるよう、以下を混ぜる。

- 有名だが時間帯で避けられる場所
- 知名度は中程度だが体験価値が高い場所
- アクセスは少し重いが人が少ない場所
- 雨でも成立する場所
- 季節ピーク以外にも価値がある場所

例カテゴリ:

- 奥多摩・秩父・房総・三浦半島・北茨城・足利/桐生・富士五湖周辺・伊豆入口・水郷エリア・ローカル線沿線

具体地点は agent が source evidence を確認してから追加する。

# 関東旅行 Note モジュール実装計画

この文書は `東京発 関東旅行ノート` を新規モジュールとして追加するための開発計画です。Codex、Claude Code、その他 agent が途中から作業しても迷わないよう、目的、機能範囲、データ構造、実装フェーズを固定します。

## 目的

既存サイトは `東京・関東 撮影地ノート` として、写真撮影に向いた地点を管理している。新モジュールは写真目的ではなく、東京発で実際に旅行・日帰り・週末外出するための候補地を管理する。

最重要評価軸は `混雑の少なさ / 人を避けられるか` とする。観光地として有名かどうかではなく、実際の訪問体験として快適に過ごせるかを重視する。

## 既存モジュールとの関係

新モジュールは撮影地データに無理に混ぜない。以下のような並列構造にする。

```text
東京・関東 Note
  ├─ 撮影地 Note
  │   ├─ 概要
  │   ├─ カード
  │   ├─ 表
  │   ├─ 地図
  │   └─ 旅程
  └─ 旅行 Note
      ├─ 概要
      ├─ カード
      ├─ 表
      ├─ 地図
      └─ 旅程
```

共有してよいもの:

- 全体の visual style
- 言語切替
- Google Maps ルート生成
- 地図 adapter
- localStorage の保存パターン
- 表の列幅変更・列順変更パターン

分けるもの:

- データファイル
- 正規化関数
- フィルタ状態
- スコアリングモデル
- カード表示項目
- Agent 更新 flow

## 想定ユーザー体験

1. ユーザーは `撮影地 Note / 旅行 Note` を切り替える。
2. `旅行 Note` では最初に、低混雑で東京発の現実性が高い候補が見える。
3. 都県、カテゴリ、混雑度、日帰り/宿泊、交通時間、季節で絞り込める。
4. 気になる地点を旅程に追加する。
5. 旅程ページから Google Maps の順序ルートを開ける。
6. 更新 agent は新しい観光候補を追加し、混雑情報や季節情報を再評価する。

## 初期カテゴリ

`primary_category` は単一とする。複数要素は `secondary_categories` に入れる。

- 温泉
- 海・島
- 山・高原
- 湖・湿原
- 滝・渓谷
- 古い町並み
- 宿場町
- 寺社
- 美術館・博物館
- 公園・庭園
- 牧場・農園
- テーマ施設
- 商店街・市場
- 絶景道路
- ローカル鉄道

## 推奨データモデル

第一版は静的 JS でよい。ただし将来の DB 化を前提に、表示用ファイルと論理データ構造を分ける。

### 表示用ファイル

```text
assets/travel_data.js
assets/travel_locations.js
assets/travel_photo_meta.js
assets/travel_refs.js
```

### 論理フィールド

| フィールド | 説明 |
| --- | --- |
| `travel_id` | 安定 ID。配列 index を使わない |
| `name_ja` | 日本語正式名 |
| `name_zh` | 中文表示名 |
| `prefecture` | 都県 |
| `area` | 市町村・地域 |
| `primary_category` | 単一カテゴリ |
| `secondary_categories` | 補助カテゴリ |
| `trip_style` | `day_trip` / `overnight` / `weekend` |
| `access_minutes_from_tokyo` | 東京駅または新宿からの概算 |
| `access_level` | A/B/C |
| `crowd_level` | low / medium / high / extreme |
| `quiet_window` | 人を避けやすい時間帯 |
| `avoid_window` | 避けるべき曜日・時期・時間 |
| `best_season` | 推奨季節 |
| `avoid_season` | 避ける季節 |
| `cost_level` | low / medium / high |
| `weather_risk` | low / medium / high |
| `stay_density` | 周辺で何時間遊べるか |
| `solo_friendly` | 独旅向き |
| `date_friendly` | デート向き |
| `family_friendly` | 家族向き |
| `description_ja` | 日本語説明 |
| `description_zh` | 中文説明 |
| `tips_ja` | 実用 tips |
| `google_maps_url` | 直接開ける URL |
| `lat` / `lng` | 地図用座標 |
| `score_total` | 100点 |
| `grade` | S/A/B/C |
| `source_urls` | 根拠 URL |
| `updated_at` | 更新日 |

## 旅行 Note スコアリング

100 点満点。混雑回避を最重要にする。

| 項目 | 満点 | 説明 |
| --- | ---: | --- |
| 人少・混雑回避 | 30 | 人を避けられるか。混雑時間を外せるか。場所に逃げ道があるか |
| 体験価値 | 20 | 東京から出て行く意味があるか。旅行感・非日常感 |
| 東京発アクセス | 15 | 所要時間、乗換、最終交通、車なし現実性 |
| 季節安定性 | 10 | 特定イベントだけに依存しないか |
| 滞在密度 | 10 | 周辺含めて半日以上楽しめるか |
| コスト合理性 | 5 | 交通費、入場料、宿泊費に対して妥当か |
| 天候耐性 | 5 | 雨・暑さ・寒さでも成立するか |
| 再訪性 | 5 | 季節違い・目的違いで再訪価値があるか |

グレード:

- `S`: 86 点以上。優先的に行く価値が高い。
- `A`: 78-85 点。安定しておすすめ。
- `B`: 68-77 点。条件が合えばよい。
- `C`: 67 点以下。候補には残すが優先度は低い。

## Phase 1: モジュール骨格

目的: 旅行 Note を既存ページに安全に追加する。

実装内容:

- [ ] トップレベルに `撮影地 Note / 旅行 Note` の切替を追加
- [ ] `旅行 Note` 用の state を追加
- [ ] `assets/travel_data.js` を追加
- [ ] `assets/travel_locations.js` を追加
- [ ] `assets/travel_refs.js` を追加
- [ ] `assets/travel_photo_meta.js` を追加
- [ ] 旅行 Note の `概要 / カード / 表 / 地図 / 旅程` コンテナを追加
- [ ] 旅行 Note の normalize 関数を作成
- [ ] 旅行 Note の filteredTravelSpots 関数を作成
- [ ] 最低 20-30 件の seed data を手動または agent で登録

Phase 1 では高度な自動更新はしない。まず UI とデータの流れを固定する。

完了条件:

- [ ] 撮影地 Note の既存機能が壊れていない
- [ ] 旅行 Note のカードが表示される
- [ ] 旅行 Note の表が表示される
- [ ] 旅行 Note の地図に marker が出る
- [ ] 旅行 Note の旅程から Google Maps ルートが開ける

## Phase 2: 旅行用フィルタ・カード・表

目的: 旅行 Note を実用的に絞り込めるようにする。

フィルタ:

- [ ] 都県
- [ ] カテゴリ
- [ ] 混雑度
- [ ] 人少スコア
- [ ] 日帰り / 1泊2日 / 週末
- [ ] 東京発移動時間
- [ ] 最低総合スコア
- [ ] 当季おすすめ
- [ ] 雨でも成立
- [ ] 独旅 / デート / 家族

カード表示:

- [ ] 地点名
- [ ] 都県・エリア
- [ ] 総合スコア
- [ ] 人少スコアを大きく表示
- [ ] 体験価値
- [ ] 東京発アクセス
- [ ] おすすめ季節
- [ ] 避けるべき時間帯
- [ ] tips
- [ ] Google Maps
- [ ] 旅程追加

表:

- [ ] 列順変更
- [ ] 列幅変更
- [ ] 混雑度列
- [ ] quiet window 列
- [ ] trip style 列
- [ ] score 列

完了条件:

- [ ] フィルタ変更がカード・表・地図すべてに反映される
- [ ] 旅行用カードが撮影地カードと混ざらない
- [ ] 日本語が主、中文は表示翻訳として機能する

## Phase 3: 地図・旅程強化

目的: 旅行に出る直前に使える状態にする。

地図:

- [ ] 旅行地点だけの map layer
- [ ] 混雑度で marker 色分け
- [ ] 旅程追加済み地点を強調
- [ ] popup に人少情報とおすすめ時間帯を表示
- [ ] 地図表示中もフィルタと同期

旅程:

- [ ] 旅行 Note 専用 tripPlan を localStorage に保存
- [ ] ドラッグで順序変更
- [ ] Google Maps Directions URL を生成
- [ ] 出発地を東京駅 / 新宿 / 自宅都県から選べる
- [ ] 日帰り/宿泊で route label を変える
- [ ] コピー時に地点名、住所、Google Maps URL、注意点を含める

完了条件:

- [ ] 旅行 Note の旅程が撮影地 Note の旅程と干渉しない
- [ ] 旅程順序が reload 後も維持される
- [ ] Google Maps で順序ルートが開ける

## Phase 4: Agent 更新・自動採点

目的: 手作業ではなく、agent が候補追加と既存更新を行えるようにする。

実装内容:

- [ ] `config/travel_source_registry.json`
- [ ] `config/travel_scoring_model.json`
- [ ] `scripts/build_travel_data.py` または同等 builder
- [ ] source observation の保存形式
- [ ] 重複判定
- [ ] Google Maps 座標取得・検証
- [ ] 写真取得
- [ ] score_update log

完了条件:

- [ ] agent が新規候補を追加できる
- [ ] agent が既存候補を再評価できる
- [ ] 评分根拠 URL が残る
- [ ] build 後、UI に自動反映される

## Phase 5: 高度化

将来やること:

- [ ] Google Maps 人気時間の手動記録または半自動記録
- [ ] 連休・紅葉・花火・祭りなどイベント混雑リスク
- [ ] 天気 API と旅行カテゴリの相性評価
- [ ] 宿泊候補との連携
- [ ] 旅行費用概算
- [ ] Notion / CSV / JSON export
- [ ] 複数旅程保存

## 実装時の注意

- 撮影地 Note の `spots` と旅行 Note の `travelSpots` を混ぜない。
- 新しい UI は既存の `view` と衝突しないよう、module state を分ける。
- 日本語 canonical value を主キーに使う。中文は翻訳表示だけにする。
- 座標と Google Maps URL は名称から毎回推測せず、データとして保存する。
- 人少評価は主観だけで決めず、来源・時間帯・季節・曜日の根拠を残す。

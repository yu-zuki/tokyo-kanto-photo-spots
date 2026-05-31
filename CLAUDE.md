# Claude Code Collaboration Rules

このリポジトリは Codex と Claude Code が並行して作業することがあります。作業前後の文脈共有は git log だけに頼らず、必ず共有ログに残してください。

## 必ず読む文書

作業を始める前に、目的に応じて以下を確認してください。

- `DEVELOPMENT.md`: 既存アプリの構成、状態管理、地図、天気、旅程の設計
- `docs/DATA_MODEL.md`: 撮影地データの将来データモデル
- `docs/AGENT_UPDATE_FLOW.md`: 撮影地 Note の更新手順
- `docs/TRAVEL_NOTE_MODULE_PLAN.md`: 関東旅行 Note の実装計画
- `docs/TRAVEL_NOTE_AGENT_UPDATE_FLOW.md`: 関東旅行 Note のデータ更新・採点手順
- `docs/AGENT_COLLABORATION_LOG.md`: Codex / Claude Code の共有作業ログ

## 共有ログの運用

すべての実装・調査・データ更新の最後に `docs/AGENT_COLLABORATION_LOG.md` へ追記してください。

追記する内容:

- 作業日時
- 担当 agent
- 目的
- 変更したファイル
- 何を実装・調査したか
- 実行した検証
- 未解決事項
- 次の agent への注意点

小さな CSS 修正でも、後続 agent が判断に困りそうな変更なら必ず残してください。

## 書き方

新しい記録はファイル上部の `Latest Entries` セクションに追加します。形式は `docs/AGENT_COLLABORATION_LOG.md` のテンプレートに従ってください。

## 作業時の注意

- ユーザーや他 agent の未コミット変更を勝手に戻さない。
- `assets/data.js` など表示用データと、将来の source data の役割を混同しない。
- 撮影地 Note と旅行 Note の state / data / scoring を混ぜない。
- 日本語 canonical value を主キー・照合キーにする。中文は表示翻訳として扱う。
- 地図 marker やカードを HTML に個別追加しない。データから自動描画する。
- 変更後は最低限 `node --check assets/app.js` とローカル HTTP 200 を確認する。

## Codex への引き継ぎ

Claude Code が作業した場合、Codex は次回 `docs/AGENT_COLLABORATION_LOG.md` を読んで最新状況を把握します。ログには「何をしたか」だけでなく、「なぜそうしたか」「次に触る人が注意すべきこと」を短く残してください。

# Agent Collaboration Log

Codex と Claude Code の共有作業ログです。git log だけでは分からない意図、未解決事項、次の作業者への注意点をここに残します。

## 運用ルール

- 新しい entry は `Latest Entries` の一番上に追加する。
- 1 回の作業につき 1 entry を基本とする。
- 大きな作業は複数 entry に分けてよい。
- 変更がなかった調査でも、後続 agent に有用なら記録する。
- 未検証の内容は `未検証` と明記する。
- 推測と確認済み事実を混ぜない。

## Entry Template

```md
### YYYY-MM-DD HH:mm JST - Agent Name - Short Title

- Objective:
- Files changed:
- Summary:
- Validation:
- Open items:
- Notes for next agent:
```

## Latest Entries

### 2026-05-31 15:08 JST - Codex - Collaboration log setup

- Objective: Codex と Claude Code が作業内容を共有できる Markdown ベースの引き継ぎ場所を作る。
- Files changed:
  - `CLAUDE.md`
  - `docs/AGENT_COLLABORATION_LOG.md`
- Summary:
  - Claude Code が起動時に参照しやすい root-level `CLAUDE.md` を追加した。
  - Codex / Claude Code 共通の作業ログ `docs/AGENT_COLLABORATION_LOG.md` を追加した。
  - 今後の作業では、実装・調査・データ更新後にこのログへ目的、変更内容、検証、未解決事項を追記する方針にした。
- Validation:
  - Markdown 文書追加のみ。アプリ実行検証は不要。
- Open items:
  - 既存の過去作業はすべて retroactive に記録していない。
  - 次回以降の実装から、このログを実運用する。
- Notes for next agent:
  - 作業前にこのファイルの最新 entry を読むこと。
  - 作業後は同じ形式で `Latest Entries` の一番上に追記すること。

## Historical Context

このログ作成時点での主要な既存文脈:

- 撮影地 Note は `index.html`、`assets/app.js`、`assets/styles.css` を中心に構成されている。
- 現在の UI は `概要 / カード / 表 / 地図 / 旅程` の workspace 構造。
- 旅程計画には Google Maps の順序ルート生成機能が追加済み。
- 関東旅行 Note はまだ実装前。計画文書は `docs/TRAVEL_NOTE_MODULE_PLAN.md`。
- 関東旅行 Note のデータ更新・採点 flow は `docs/TRAVEL_NOTE_AGENT_UPDATE_FLOW.md`。
- 旅行 Note では `人少・混雑回避` を最重要スコアとして扱う。

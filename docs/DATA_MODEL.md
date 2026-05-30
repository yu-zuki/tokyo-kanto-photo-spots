# 写真スポット数据库定义

这个项目不要把 `assets/data.js` 当成数据库。`assets/data.js`、`assets/spot_locations.js`、`assets/photo_meta.js`、`assets/japanese_photo_refs.js` 都应该是网页读取用的编译产物。长期维护的数据层需要能新增、归档、去重、重评，并且保留来源证据。

## 现在的问题

当前页面读取 260 条固定地点。字段里混合了地点身份、地理坐标、评分、来源、照片、备注等信息，所以后续新增、合并、删除、重评都会变得危险。

## 需要多少个项目

最小可扩展数据库应包含 8 个逻辑项目：

1. `spots`：地点主数据
2. `spot_aliases`：日文正式名、别名、旧名、中文名、英文名
3. `spot_geo`：坐标、Google Maps 导航、坐标确认状态
4. `spot_scores`：评价分数和分级
5. `source_observations`：从各网站抓到的证据、热度、季节信息
6. `media_assets`：下载照片、缩略图、来源、主图选择
7. `source_registry`：可抓取网站清单和抓取规则
8. `update_runs`：每次 agent 更新的运行记录

这些项目合计约 40 个核心字段。网页展示不需要全部字段，但数据库需要保留来源和审计信息。

## 核心表

### spots

地点的唯一身份。删除不应直接移除，而是先改为 `archived`，这样地图、收藏和历史评分不会断。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `spot_id` | string | 稳定 ID，不使用数组下标 |
| `legacy_id` | number/null | 旧 Excel 的 ID |
| `name_ja` | string | 日本用户视角的正式名称 |
| `name_zh` | string/null | 中文辅助名 |
| `prefecture` | enum | 東京都、神奈川県等 |
| `area` | string | 奥多摩、鎌倉、横浜等 |
| `primary_type` | enum | 单一主类型 |
| `secondary_types` | string[] | 可选补充类型 |
| `main_subject` | string | 主要画面 |
| `best_season_time` | string | 最佳季节和时间 |
| `recommended_lens` | string | 建议镜头 |
| `access_level` | string | 交通级别 |
| `estimated_time` | string | 往返或拍摄耗时 |
| `status` | enum | `candidate`、`active`、`archived`、`rejected` |
| `created_at` | date | 首次进入数据库 |
| `updated_at` | date | 最近一次更新 |

### spot_aliases

用于去重和搜索。比如 `東京スカイツリー`、`スカイツリー`、`TOKYO SKYTREE` 应归为同一个地点。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `spot_id` | string | 对应 `spots.spot_id` |
| `alias` | string | 别名 |
| `locale` | string | `ja`、`zh`、`en` |
| `source_id` | string/null | 别名来源 |
| `confidence` | number | 0-1 |

### spot_geo

地图和导航只读这里，不从名称实时猜坐标。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `spot_id` | string | 对应地点 |
| `lat` | number | 纬度 |
| `lng` | number | 经度 |
| `google_maps_url` | string | 可直接导航的 URL |
| `google_place_id` | string/null | 可取得时保存 |
| `geo_precision` | enum | `place`、`area`、`manual`、`fallback` |
| `geo_source` | string | `google_maps`、`manual_review` 等 |
| `verified_at` | date | 最近确认日期 |

### spot_scores

评分独立出来，未来可以重跑评分模型，不影响地点身份。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `spot_id` | string | 对应地点 |
| `model_version` | string | 评分模型版本 |
| `access` | number | 交通便利性 |
| `visual_strength` | number | 画面强度 |
| `subject_density` | number | 题材密度 |
| `light_season_stability` | number | 光线和季节稳定性 |
| `crowd_control` | number | 人流可控性 |
| `gear_fit` | number | 器材适配度 |
| `originality` | number | 小众性和可发挥空间 |
| `freshness` | number | 近期热度 |
| `source_confidence` | number | 来源可信度 |
| `risk_cost` | number | 风险和成本 |
| `total` | number | 100 分制 |
| `grade` | enum | S/A/B/C |
| `scored_at` | date | 评分时间 |

### source_observations

每个源站的一条发现就是一条 observation。新增地点、更新季节、人气变化都从这里来。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `observation_id` | string | 观察记录 ID |
| `spot_id` | string/null | 匹配后填写 |
| `source_id` | string | 来源网站 |
| `source_url` | string | 原始 URL |
| `observed_name` | string | 源站上的名称 |
| `observed_area` | string/null | 源站上的区域 |
| `observed_type` | string/null | 源站分类 |
| `photo_count` | number/null | 照片数量或近似热度 |
| `recent_signal` | string/null | 新着、季节关键词等 |
| `evidence_text` | string/null | 摘要 |
| `confidence` | number | 0-1 |
| `observed_at` | date | 抓取日期 |

### media_assets

照片应有自己的生命周期，页面只消费被选为 `hero` 或 `gallery` 的资产。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `asset_id` | string | 照片 ID |
| `spot_id` | string | 对应地点 |
| `source_id` | string | 来源 |
| `source_url` | string | 原图或页面 URL |
| `local_path` | string | 本地静态路径 |
| `role` | enum | `hero`、`gallery`、`reference` |
| `width` | number/null | 宽度 |
| `height` | number/null | 高度 |
| `style_tags` | string[] | 夜景、海岸、庭園等 |
| `downloaded_at` | date | 下载时间 |

## 编译产物

- `assets/data.js`：由 `spots` + `spot_scores` + 部分来源摘要生成
- `assets/spot_locations.js`：由 `spot_geo` 生成
- `assets/photo_meta.js`：由 `media_assets` 生成
- `assets/japanese_photo_refs.js`：由 `source_observations` 生成

这样新增或减少地点时，只需要更新数据库源数据，再重新 build，页面自然反映变化。

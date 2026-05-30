# Agent 自动更新 Flow

目标是让地点列表不再固定为 260 条。每次运行 agent，都从配置好的日本摄影、旅游、地图来源获取情报，合并到结构化数据库，再生成静态网页用的数据文件。

## 输入

- `config/schema.json`：数据库逻辑定义
- `config/source_registry.json`：来源网站和抓取规则
- `config/scoring_model.json`：评分模型
- 当前数据库源文件：未来建议放在 `data/` 目录，当前可先由 `assets/data.js` 反向迁移

## Flow

1. 读取来源清单
   - 按 `priority`、`updateCadenceDays` 和上次更新时间决定本次抓取哪些来源。
   - 摄影社区优先发现“摄影价值”，官方旅游站优先确认正式名称和季节，Google Maps 优先确认坐标和导航。

2. 抓取候选地点
   - 从 GANREF、PHOTOHITO、東京カメラ部等摄影站抽取地点名、都道府县、照片数量、标签、示例页面。
   - 从各县官方旅游站补充花期、祭典、开放时间、交通限制等信息。
   - 从 Google Maps 生成导航 URL，并保存坐标确认结果。

3. 标准化名称
   - 将源站名称转换为日本本地常用写法。
   - 生成 `spot_aliases`，保留中文名和英文名作为辅助检索，不作为主显示名。

4. 去重与合并
   - 第一层：`name_ja + prefecture + area`。
   - 第二层：Google Maps 坐标距离。
   - 第三层：别名和源站 URL。
   - 匹配成功则更新现有地点；匹配失败则创建 `candidate`。

5. 坐标确认
   - 每个 `active` 和新 `candidate` 都必须有 `spot_geo`。
   - 坐标精度低于 `place` 的记录进入人工复核队列。
   - 地图只读取已保存坐标，不在前端按名称猜测。

6. 照片更新
   - 优先摄影站照片，其次官方旅游站，再其次 Wikipedia 或通用图片搜索。
   - 下载后进入 `media_assets`，并按构图清晰度、主体相关度、风格统一性选择 `hero`。

7. 评分
   - 使用 `config/scoring_model.json` 的权重计算。
   - 新地点先以 `candidate` 入库，达到阈值并通过坐标确认后变为 `active`。
   - 旧地点若长期无价值或坐标/来源失效，改为 `archived`，不直接删除。

8. 生成网页数据
   - 由数据库生成 `assets/data.js`。
   - 由 `spot_geo` 生成 `assets/spot_locations.js`。
   - 由 `media_assets` 生成 `assets/photo_meta.js`。
   - 由 `source_observations` 生成 `assets/japanese_photo_refs.js`。

9. 验证
   - JSON schema 校验。
   - 坐标范围校验：関東、山梨、静岡东部等允许范围。
   - 重复地点检查。
   - 图片文件存在性检查。
   - 页面本地预览检查。

10. 发布
    - 生成变更摘要：新增、更新、归档、评分变化、坐标变化。
    - agent 提交 commit 并 push 到 GitHub Pages 仓库。

## Agent 执行口令

以后可以直接让 agent 执行：

```text
按照 docs/AGENT_UPDATE_FLOW.md 更新摄影地点数据库：
1. 使用 config/source_registry.json 抓取最新来源
2. 按 config/schema.json 合并和去重
3. 按 config/scoring_model.json 重新评分
4. 生成 assets/*.js
5. 本地验证后提交并推送
```

## 新增与减少规则

- 新发现地点：先进入 `candidate`，通过坐标和来源确认后进入 `active`。
- 删除地点：默认改为 `archived`，页面不展示，但数据库保留。
- 错误地点：改为 `rejected`，保留原因，防止下次抓取又加回来。
- 页面展示数量不固定，由 `status = active` 和筛选条件决定。

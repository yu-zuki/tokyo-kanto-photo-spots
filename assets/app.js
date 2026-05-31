const DATA = window.PHOTO_SPOTS_DATA;
const PHOTO_META = window.PHOTO_SPOTS_PHOTOS || {};
const JAPAN_PHOTO_REFS = window.JAPAN_PHOTO_REFS || {};
const LOCATION_DATA = window.PHOTO_SPOTS_LOCATIONS || { locations: {}, meta: {} };
const MAP_CONFIG = window.PHOTO_SPOTS_MAP_CONFIG || { provider: "leaflet", googleMapsApiKey: "" };

const rawSpots = DATA.spots;

const UI_TEXT = {
  ja: {
    "app.title": "東京・関東 撮影地ノート",
    "stats.total": "候補地",
    "stats.avg": "平均点",
    "stats.saved": "保存済み",
    "filters.aria": "絞り込み条件",
    "filters.title": "絞り込み",
    "filters.reset": "絞り込みをリセット",
    "filters.search": "検索",
    "filters.searchPlaceholder": "撮影地、エリア、被写体、レンズ...",
    "filters.grade": "候補ランク",
    "filters.pref": "都県",
    "filters.type": "カテゴリ",
    "filters.access": "アクセス",
    "filters.time": "移動時間",
    "filters.minScore": "最低スコア",
    "filters.savedOnly": "保存済みのみ",
    "sections.photoSites": "日本の写真サイト",
    "sections.scoring": "採点モデル",
    "sections.gradeChart": "ランク分布",
    "sections.typeChart": "カテゴリ概要",
    "sections.best": "最高スコア",
    "toolbar.showing": "表示中",
    "toolbar.countSuffix": "件",
    "toolbar.sort": "並び順",
    "sort.scoreDesc": "スコアが高い順",
    "sort.scoreAsc": "スコアが低い順",
    "sort.nicheDesc": "穴場度が高い順",
    "sort.traffic": "アクセス優先",
    "sort.name": "撮影地名",
    "views.cards": "カード",
    "views.table": "表",
    "views.map": "地図",
    "map.title": "位置一覧",
    "map.countSuffix": "件を表示",
    "empty.noResults": "条件に合う撮影地がありません。",
    "empty.noData": "データなし",
    "photo.checkLinks": "作例リンクから確認",
    "photo.checkOnSite": "{site}で作例確認",
    "photo.unset": "写真未設定",
    "card.save": "保存",
    "card.recommend": "おすすめ",
    "card.lens": "レンズ",
    "card.typeDetail": "カテゴリ詳細",
    "card.niche": "穴場度",
    "link.map": "Google Maps",
    "link.mapShort": "地図",
    "link.photoSource": "写真元",
    "map.precisionApprox": "{verified}件は実座標/検索座標、{approximate}件は地域ベースの概略位置",
    "map.precisionAll": "全件が実座標または検索座標です",
    "map.loadFailedTitle": "地図ライブラリを読み込めませんでした。",
    "map.loadFailedBody": "Google Maps のリンクから各地点を開けます。",
    "map.open": "Google Mapsで開く",
    "map.precision": "位置精度",
    "map.precisionApproxLabel": "地域ベースの概略位置",
    "map.precisionVerifiedLabel": "実座標/検索座標",
    "common.points": "点",
    "common.rank": "ランク",
    "common.unclassified": "未分類",
    "filters.seasonNow": "今が見頃のみ",
    "filters.weatherMatch": "天気に合う場所のみ",
    "sections.weather": "週末の天気",
    "weather.loading": "読み込み中...",
    "weather.error": "取得できませんでした",
    "weather.refresh": "天気を更新",
    "weather.high": "最高",
    "weather.low": "最低",
    "weather.rain": "降水",
    "weather.updated": "更新",
    "memo.placeholder": "メモを追加...",
    "memo.save": "保存",
    "memo.edit": "編集",
    "weather.comfortLabel": "快適気温",
    "card.scoreBreakdown": "スコア内訳",
    "card.expandAll": "全て展開",
    "card.collapseAll": "全て折畳",
    "card.tempRange": "適温",
    "card.tempToday": "今日"
  },
  zh: {
    "app.title": "东京・关东摄影地笔记",
    "stats.total": "候选地",
    "stats.avg": "平均分",
    "stats.saved": "已收藏",
    "filters.aria": "筛选条件",
    "filters.title": "筛选",
    "filters.reset": "重置筛选",
    "filters.search": "搜索",
    "filters.searchPlaceholder": "摄影地、区域、被摄体、镜头...",
    "filters.grade": "候选等级",
    "filters.pref": "都县",
    "filters.type": "分类",
    "filters.access": "交通",
    "filters.time": "移动时间",
    "filters.minScore": "最低分",
    "filters.savedOnly": "仅显示收藏",
    "sections.photoSites": "日本摄影网站",
    "sections.scoring": "评分模型",
    "sections.gradeChart": "等级分布",
    "sections.typeChart": "分类概要",
    "sections.best": "最高分",
    "toolbar.showing": "当前显示",
    "toolbar.countSuffix": "件",
    "toolbar.sort": "排序",
    "sort.scoreDesc": "分数从高到低",
    "sort.scoreAsc": "分数从低到高",
    "sort.nicheDesc": "小众度从高到低",
    "sort.traffic": "交通优先",
    "sort.name": "摄影地名",
    "views.cards": "卡片",
    "views.table": "表格",
    "views.map": "地图",
    "map.title": "位置一览",
    "map.countSuffix": "件显示中",
    "empty.noResults": "没有符合条件的摄影地。",
    "empty.noData": "无数据",
    "photo.checkLinks": "从作例链接确认",
    "photo.checkOnSite": "在 {site} 查看作例",
    "photo.unset": "未设置照片",
    "card.save": "收藏",
    "card.recommend": "推荐",
    "card.lens": "镜头",
    "card.typeDetail": "分类详情",
    "card.niche": "小众度",
    "link.map": "Google 地图",
    "link.mapShort": "地图",
    "link.photoSource": "照片来源",
    "map.precisionApprox": "{verified}件为实坐标/搜索坐标，{approximate}件为区域概略位置",
    "map.precisionAll": "全部为实坐标或搜索坐标",
    "map.loadFailedTitle": "地图组件读取失败。",
    "map.loadFailedBody": "可以通过 Google 地图链接打开各地点。",
    "map.open": "用 Google 地图打开",
    "map.precision": "位置精度",
    "map.precisionApproxLabel": "区域概略位置",
    "map.precisionVerifiedLabel": "实坐标/搜索坐标",
    "common.points": "分",
    "common.rank": "等级",
    "common.unclassified": "未分类",
    "filters.seasonNow": "仅看当季推荐",
    "filters.weatherMatch": "只看天气合适的地点",
    "sections.weather": "周末天气",
    "weather.loading": "加载中...",
    "weather.error": "获取失败",
    "weather.refresh": "刷新天气",
    "weather.high": "最高",
    "weather.low": "最低",
    "weather.rain": "降水",
    "weather.updated": "更新于",
    "memo.placeholder": "添加备注...",
    "memo.save": "保存",
    "memo.edit": "编辑",
    "weather.comfortLabel": "舒适温度",
    "card.scoreBreakdown": "评分详情",
    "card.expandAll": "全部展开",
    "card.collapseAll": "全部折叠",
    "card.tempRange": "适温",
    "card.tempToday": "今天"
  },
};

const ZH_META_LABELS = {
  "東京都": "东京都",
  "千葉県": "千叶县",
  "神奈川県": "神奈川县",
  "埼玉県": "埼玉县",
  "茨城県": "茨城县",
  "栃木県": "栃木县",
  "群馬県": "群马县",
  "山梨県": "山梨县",
  "静岡県": "静冈县",
  "工場夜景": "工厂夜景",
  "都市夜景": "城市夜景",
  "街歩き": "街拍",
  "海岸": "海岸",
  "庭園・花": "庭园・花",
  "寺社": "寺社",
  "展望・山岳": "展望・山岳",
  "湖沼・湿地": "湖沼・湿地",
  "鉄道・航空機": "铁道・航空",
  "渓谷・滝": "溪谷・瀑布",
  "歴史・遺構": "历史・遗构",
  "動物・テーマ施設": "动物・主题设施",
  "0-90分": "0-90分钟",
  "90-120分": "90-120分钟",
  "120分前後・車推奨": "约120分钟・推荐开车",
  "Aランク": "A级",
  "Bランク": "B级",
  "Cランク": "C级",
};

const TYPE_LABELS = {
  "工业": "工場夜景",
  "夜景": "夜景",
  "城市夜景": "都市夜景",
  "建筑": "建築",
  "街头": "街歩き",
  "人文": "スナップ",
  "海岸": "海岸",
  "富士山": "富士山",
  "庭园": "庭園",
  "花": "花",
  "神社": "神社",
  "寺社": "寺社",
  "展望": "展望",
  "山顶": "山岳",
  "湖沼": "湖沼",
  "湿地": "湿地",
  "铁道": "鉄道",
  "飞机": "航空機",
  "溪谷": "渓谷",
  "山水": "渓流",
  "历史": "歴史",
  "废墟": "遺構",
  "动物": "動物",
  "主题": "テーマ施設",
};

const TYPE_PRIMARY = {
  "工业": "工場夜景",
  "城市夜景": "都市夜景",
  "街头": "街歩き",
  "海岸": "海岸",
  "庭园": "庭園・花",
  "神社": "寺社",
  "展望": "展望・山岳",
  "湖沼": "湖沼・湿地",
  "铁道": "鉄道・航空機",
  "溪谷": "渓谷・滝",
  "历史": "歴史・遺構",
  "动物": "動物・テーマ施設",
};

const PREF_LABELS = {
  "东京": "東京都",
  "千叶": "千葉県",
  "神奈川": "神奈川県",
  "埼玉": "埼玉県",
  "茨城": "茨城県",
  "栃木": "栃木県",
  "群马": "群馬県",
  "山梨": "山梨県",
  "静冈": "静岡県",
};

const TIME_LABELS = {
  "0-90分目安": "0-90分",
  "90-120分目安": "90-120分",
  "120分前後/車推奨": "120分前後・車推奨",
};

const scoreFields = [
  [{ ja: "アクセス", zh: "交通" }, "交通分20", 20],
  [{ ja: "画面力", zh: "画面" }, "画面强度25", 25],
  [{ ja: "題材密度", zh: "题材" }, "题材密度15", 15],
  [{ ja: "光", zh: "光线" }, "光线季节稳定15", 15],
  [{ ja: "混雑", zh: "人流" }, "人流可控10", 10],
  [{ ja: "機材適性", zh: "器材" }, "器材适配10", 10],
  [{ ja: "負担", zh: "负担" }, "风险成本5", 5],
];

const photoSiteSummary = [
  { name: "GANREF", role: { ja: "撮影スポットDBと投稿作例", zh: "摄影地点数据库和投稿作例" }, url: "https://ganref.jp/spot/photo/jpn/tokyo.html" },
  { name: "PHOTOHITO", role: { ja: "機材別作例と撮影地マップ", zh: "按器材查看作例和摄影地地图" }, url: "https://photohito.com/map/" },
  { name: "東京カメラ部", role: { ja: "日本最大級の写真コミュニティ", zh: "日本大型摄影社区" }, url: "https://tokyocameraclub.com/about/" },
  { name: "cizucu", role: { ja: "新しい写真コミュニティ", zh: "新兴摄影社区" }, url: "https://www.cizucu.com/" },
];

const columnDefaults = [
  { id: "saved", labelKey: "table.saved", width: 74 },
  { id: "spot", labelKey: "table.spot", width: 330 },
  { id: "pref", labelKey: "table.pref", width: 100 },
  { id: "area", labelKey: "table.area", width: 128 },
  { id: "type", labelKey: "table.type", width: 132 },
  { id: "traffic", labelKey: "table.traffic", width: 96 },
  { id: "time", labelKey: "table.time", width: 126 },
  { id: "season", labelKey: "table.season", width: 150 },
  { id: "lens", labelKey: "table.lens", width: 130 },
  { id: "score", labelKey: "table.score", width: 86 },
  { id: "niche", labelKey: "table.niche", width: 86 },
  { id: "source", labelKey: "table.source", width: 150 },
];

Object.assign(UI_TEXT.ja, {
  "table.saved": "保存",
  "table.spot": "撮影地",
  "table.pref": "都県",
  "table.area": "エリア",
  "table.type": "カテゴリ",
  "table.traffic": "アクセス",
  "table.time": "移動時間",
  "table.season": "おすすめ時間",
  "table.lens": "レンズ",
  "table.score": "総合",
  "table.niche": "穴場度",
  "table.source": "参照",
});

Object.assign(UI_TEXT.zh, {
  "table.saved": "收藏",
  "table.spot": "摄影地",
  "table.pref": "都县",
  "table.area": "区域",
  "table.type": "分类",
  "table.traffic": "交通",
  "table.time": "移动时间",
  "table.season": "推荐时间",
  "table.lens": "镜头",
  "table.score": "总分",
  "table.niche": "小众度",
  "table.source": "参考",
});

const state = {
  lang: localStorage.getItem("photoSpotLang") || "ja",
  search: "",
  grade: new Set(),
  pref: new Set(),
  type: new Set(),
  traffic: new Set(),
  time: new Set(),
  minScore: 0,
  savedOnly: false,
  seasonNow: false,
  weatherMatch: false,
  comfortTemp: Number(localStorage.getItem("photoSpotComfortTemp")) || 26,
  sort: "score-desc",
  view: "cards",
};

if (!UI_TEXT[state.lang]) state.lang = "ja";

const saved = new Set(safeJsonStorage("photoSpotSaved", []));
const memos = safeJsonStorage("photoSpotMemos", {});
let weatherCache = null; // { updated, forecasts: { prefJa: { high, low, rain, icon } } }
let tableColumns = loadTableColumns();
let mapRuntime = { provider: null, map: null, layer: null, markers: [], infoWindow: null };
let mapRenderToken = 0;

const el = {
  totalCount: document.querySelector("#totalCount"),
  avgScore: document.querySelector("#avgScore"),
  savedCount: document.querySelector("#savedCount"),
  resultCount: document.querySelector("#resultCount"),
  searchInput: document.querySelector("#searchInput"),
  gradeFilter: document.querySelector("#gradeFilter"),
  prefFilter: document.querySelector("#prefFilter"),
  typeFilter: document.querySelector("#typeFilter"),
  trafficFilter: document.querySelector("#trafficFilter"),
  timeFilter: document.querySelector("#timeFilter"),
  minScore: document.querySelector("#minScore"),
  minScoreValue: document.querySelector("#minScoreValue"),
  savedOnly: document.querySelector("#savedOnly"),
  resetFilters: document.querySelector("#resetFilters"),
  sortSelect: document.querySelector("#sortSelect"),
  cardViewBtn: document.querySelector("#cardViewBtn"),
  tableViewBtn: document.querySelector("#tableViewBtn"),
  mapViewBtn: document.querySelector("#mapViewBtn"),
  scoringModel: document.querySelector("#scoringModel"),
  gradeChart: document.querySelector("#gradeChart"),
  typeChart: document.querySelector("#typeChart"),
  bestSpot: document.querySelector("#bestSpot"),
  cards: document.querySelector("#cards"),
  tableWrap: document.querySelector("#tableWrap"),
  tableHead: document.querySelector("#tableHead"),
  tableBody: document.querySelector("#tableBody"),
  mapWrap: document.querySelector("#mapWrap"),
  mapCanvas: document.querySelector("#mapCanvas"),
  mapFallback: document.querySelector("#mapFallback"),
  mapCount: document.querySelector("#mapCount"),
  mapPrecision: document.querySelector("#mapPrecision"),
  langJa: document.querySelector("#langJa"),
  langZh: document.querySelector("#langZh"),
  seasonNow: document.querySelector("#seasonNow"),
  weatherMatch: document.querySelector("#weatherMatch"),
  weatherContent: document.querySelector("#weatherContent"),
  refreshWeather: document.querySelector("#refreshWeather"),
  comfortTemp: document.querySelector("#comfortTemp"),
  comfortValue: document.querySelector("#comfortValue"),
  expandAllScores: document.querySelector("#expandAllScores"),
  collapseAllScores: document.querySelector("#collapseAllScores"),
  scoreToggleGroup: document.querySelector("#scoreToggleGroup"),
};

const spots = rawSpots.map(normalizeSpot);

function safeJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function normalizeSpot(raw) {
  const nameJa = localizeSpotName(raw["地点"]);
  const prefJa = localizePref(raw["都县"]);
  const areaJa = localizeText(raw["区域"]);
  const typeJa = primaryType(raw["类型"]);
  const typeDetailJa = typeDetail(raw["类型"]);
  const timeJa = TIME_LABELS[raw["预计耗时"]] || localizeText(raw["预计耗时"]);
  const trafficJa = `${raw["交通级别"]}ランク`;
  return {
    ...raw,
    raw,
    id: String(raw.ID),
    legacyId: raw.ID,
    name: { ja: nameJa, zh: raw["地点"] || nameJa },
    prefecture: { ja: prefJa, zh: ZH_META_LABELS[prefJa] || raw["都县"] || prefJa },
    area: { ja: areaJa, zh: raw["区域"] || areaJa },
    primaryType: { ja: typeJa, zh: ZH_META_LABELS[typeJa] || raw["类型"] || typeJa },
    typeDetail: { ja: typeDetailJa, zh: raw["类型"] || typeDetailJa },
    visual: { ja: localizeText(raw["主要画面"]), zh: raw["主要画面"] || "" },
    season: { ja: localizeText(raw["最佳季节/时间"]), zh: raw["最佳季节/时间"] || "" },
    lens: { ja: localizeText(raw["建议镜头"]), zh: raw["建议镜头"] || "" },
    time: { ja: timeJa, zh: ZH_META_LABELS[timeJa] || raw["预计耗时"] || timeJa },
    traffic: { rank: raw["交通级别"], ja: trafficJa, zh: ZH_META_LABELS[trafficJa] || `${raw["交通级别"]}级` },
    grade: raw["候选等级"],
    score: Number(raw["总分100"] || 0),
    niche: raw["小众/可发挥参考"],
    seasonMonths: parseSeasonMonths(raw["最佳季节/时间"]),
  };
}

function parseSeasonMonths(seasonText) {
  if (!seasonText) return [];
  const text = String(seasonText);
  const months = new Set();
  // Parse patterns like: 3-5月, 10-12月, 4月上旬-5月, 通年, 春, 秋
  const rangeRe = /(\d+)\s*[月\-~～]\s*(\d+)\s*月?/g;
  let match;
  while ((match = rangeRe.exec(text)) !== null) {
    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);
    for (let m = start; m <= end; m++) months.add(m);
  }
  // Single month mentions
  const singleRe = /(\d+)\s*月/g;
  while ((match = singleRe.exec(text)) !== null) {
    months.add(parseInt(match[1], 10));
  }
  // Season keywords → months
  const seasonMap = {
    "春": [3,4,5], "夏": [6,7,8], "秋": [9,10,11], "冬": [12,1,2],
    "桜": [3,4], "紅葉": [10,11,12], "紫陽花": [6,7],
    "雪": [12,1,2], "新緑": [5,6], "梅": [2,3],
    "藤": [4,5], "彼岸花": [9], "菜の花": [3,4],
    "花火": [7,8], "イルミ": [11,12], "初詣": [1],
  };
  for (const [keyword, ms] of Object.entries(seasonMap)) {
    if (text.includes(keyword)) ms.forEach(m => months.add(m));
  }
  // 通年 = all year
  if (text.includes("通年")) for (let m = 1; m <= 12; m++) months.add(m);
  return [...months].sort((a, b) => a - b);
}

function isSpotInSeasonNow(spot) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  return spot.seasonMonths.length === 0 || spot.seasonMonths.includes(currentMonth);
}

function loadTableColumns() {
  try {
    const savedColumns = JSON.parse(localStorage.getItem("photoSpotTableColumns") || "null");
    if (Array.isArray(savedColumns)) {
      const known = new Map(columnDefaults.map((column) => [column.id, column]));
      const restored = savedColumns
        .filter((column) => known.has(column.id))
        .map((column) => ({ ...known.get(column.id), width: Number(column.width) || known.get(column.id).width }));
      const missing = columnDefaults.filter((column) => !restored.some((item) => item.id === column.id));
      return [...restored, ...missing];
    }
  } catch {
    // Fall through to defaults.
  }
  return columnDefaults.map((column) => ({ ...column }));
}

function saveTableColumns() {
  localStorage.setItem("photoSpotTableColumns", JSON.stringify(tableColumns.map(({ id, width }) => ({ id, width }))));
}

function t(key, replacements = {}) {
  const template = UI_TEXT[state.lang]?.[key] || UI_TEXT.ja[key] || key;
  return Object.entries(replacements).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), template);
}

function applyStaticLanguage() {
  document.documentElement.lang = state.lang === "zh" ? "zh-Hans" : "ja";
  document.title = t("app.title");
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-attr]").forEach((node) => {
    node.dataset.i18nAttr.split(";").forEach((pair) => {
      const [attr, key] = pair.split(":").map((part) => part.trim());
      if (attr && key) node.setAttribute(attr, t(key));
    });
  });
  if (el.langJa) el.langJa.classList.toggle("active", state.lang === "ja");
  if (el.langZh) el.langZh.classList.toggle("active", state.lang === "zh");
}

function localized(value) {
  if (value && typeof value === "object" && ("ja" in value || "zh" in value)) {
    return value[state.lang] || value.ja || value.zh || "";
  }
  if (state.lang === "zh") return ZH_META_LABELS[value] || value;
  return value;
}

function metaLabel(value) {
  return state.lang === "zh" ? ZH_META_LABELS[value] || value : value;
}

function columnLabel(column) {
  return t(column.labelKey);
}

function localizeSpotName(name) {
  const aliases = {
    "东京塔外苑/芝公园": "東京タワー外苑・芝公園",
    "东京晴空塔/ソラマチ周边": "東京スカイツリー・東京ソラマチ周辺",
    "丰洲市场/ぐるり公園": "豊洲市場・豊洲ぐるり公園",
    "台场海滨公园": "お台場海浜公園",
    "山下公园": "山下公園",
    "幕张海滨公园/幕张海岸": "幕張海浜公園・幕張海岸",
    "稻毛海浜公园": "稲毛海浜公園",
    "日本桥": "日本橋",
    "横滨大さん橋": "横浜港大さん橋",
    "涩谷Scramble Crossing": "渋谷スクランブル交差点",
    "皇居外苑/二重桥": "皇居外苑・二重橋",
    "鹤见线海芝浦站": "鶴見線 海芝浦駅",
    "麻布台Hills周边": "麻布台ヒルズ周辺",
    "KITTE丸之内屋上庭园": "KITTE丸の内 屋上庭園",
    "下北泽": "下北沢",
    "代官山T-SITE周边": "代官山T-SITE周辺",
    "元町/山手西洋馆": "元町・山手西洋館",
    "埼玉Super Arena/新都心": "さいたまスーパーアリーナ・さいたま新都心",
    "所泽航空纪念公园": "所沢航空記念公園",
    "新桥SL广场": "新橋SL広場",
    "月岛佃岛": "月島・佃島",
    "有乐町高架下": "有楽町高架下",
    "横滨中华街": "横浜中華街",
    "涩谷Sky": "渋谷スカイ",
    "秋叶原电器街": "秋葉原電気街",
    "等等力溪谷": "等々力渓谷",
    "羽田机场展望デッキ": "羽田空港展望デッキ",
    "自由之丘": "自由が丘",
    "荒川彩湖公园": "彩湖・道満グリーンパーク",
    "藏前/隅田川テラス": "蔵前・隅田川テラス",
    "谷中银座": "谷中銀座",
    "银座中央通り": "銀座中央通り",
    "隅田公园": "隅田公園",
    "高圆寺纯情商店街": "高円寺純情商店街",
    "东京国立博物馆外观": "東京国立博物館 外観",
    "东京国际论坛": "東京国際フォーラム",
    "东京大学本乡キャンパス": "東京大学本郷キャンパス",
    "东京站丸之内广场": "東京駅丸の内駅前広場",
    "丸之内仲通り": "丸の内仲通り",
    "代代木公园": "代々木公園",
    "六本木新城展望台周边": "六本木ヒルズ展望台周辺",
    "千叶港塔": "千葉ポートタワー",
    "国立新美术馆": "国立新美術館",
    "圣桥/御茶之水": "聖橋・御茶ノ水",
    "城南岛海滨公园": "城南島海浜公園",
    "大宫盆栽村": "大宮盆栽村",
    "彩虹桥步道": "レインボーブリッジ遊歩道",
    "汐留Caretta/电通大楼周边": "カレッタ汐留・電通本社ビル周辺",
    "迎宾馆赤坂离宫": "迎賓館赤坂離宮",
    "鉄道博物馆": "鉄道博物館",
    "武藏一宫冰川神社": "武蔵一宮氷川神社",
    "船桥三番濑海浜公园": "ふなばし三番瀬海浜公園",
    "葛西临海公园": "葛西臨海公園",
    "行德野鳥観察舎周边": "行徳野鳥観察舎周辺",
    "都电荒川线沿线": "都電荒川線沿線",
    "三轩茶屋キャロットタワー": "三軒茶屋キャロットタワー",
    "上野公园": "上野公園",
    "中目黑目黑川": "中目黒・目黒川",
    "六义园": "六義園",
    "国营昭和纪念公园": "国営昭和記念公園",
    "小石川后乐园": "小石川後楽園",
    "井之头恩赐公园": "井の頭恩賜公園",
    "千鸟渊": "千鳥ヶ淵",
    "增上寺": "増上寺",
    "根津美术馆外苑": "根津美術館外苑",
    "浜离宫恩赐庭园": "浜離宮恩賜庭園",
    "王子飞鸟山公园": "飛鳥山公園",
    "豪德寺": "豪徳寺",
    "江之岛": "江の島",
    "京浜岛つばさ公園": "京浜島つばさ公園",
    "油壺湾": "油壺湾",
    "稻村ヶ崎": "稲村ヶ崎",
    "猿岛": "猿島",
    "吉见百穴": "吉見百穴",
    "東京德国村": "東京ドイツ村",
    "佐助稻荷神社": "佐助稲荷神社",
    "野岛埼灯台": "野島埼灯台",
    "鹫宫神社": "鷲宮神社",
    "真鹤岬/三ツ石": "真鶴岬・三ツ石",
    "三岛Skywalk": "三島スカイウォーク",
    "原冈栈桥/岡本桟橋": "原岡桟橋・岡本桟橋",
    "镰仓高校前踏切": "鎌倉高校前踏切",
    "佐仓ふるさと広場": "佐倉ふるさと広場",
    "香取神宫": "香取神宮",
    "佐原老街": "佐原の町並み",
    "川越冰川神社": "川越氷川神社",
    "成田山公园": "成田山公園",
    "成田山新胜寺": "成田山新勝寺",
    "报国寺": "報国寺",
    "长谷寺": "長谷寺",
    "鹤冈八幡宫": "鶴岡八幡宮",
    "钱洗弁财天": "銭洗弁財天",
    "大洗磯前神社 神磯の鳥居": "大洗磯前神社 神磯の鳥居",
    "箱根芦之湖": "箱根・芦ノ湖",
    "养老溪谷": "養老渓谷",
    "胜浦朝市/渔港": "勝浦朝市・勝浦漁港",
    "黑山三滝": "黒山三滝",
    "栃木蔵の街": "栃木蔵の街",
    "美の山公园": "美の山公園",
    "华严瀑布": "華厳の滝",
    "新仓山浅间公园": "新倉山浅間公園",
    "浓沟の滝/龟岩洞窟": "濃溝の滝・亀岩の洞窟",
    "箱根神社平和鸟居": "箱根神社 平和の鳥居",
    "偕乐园": "偕楽園",
    "日光东照宫": "日光東照宮",
    "富冈制丝场": "富岡製糸場",
    "鹿岛神宫": "鹿島神宮",
    "小田原-热海东海道线海岸段": "小田原-熱海 東海道線海岸区間",
    "少林山达磨寺": "少林山達磨寺",
    "足利花卉公园": "あしかがフラワーパーク",
    "国营日立海滨公园": "国営ひたち海浜公園",
    "热海亲水公园": "熱海親水公園",
    "热海梅园": "熱海梅園",
  };
  return aliases[name] || localizeText(name);
}

function localizePref(value) {
  return String(value || "")
    .split("/")
    .map((pref) => PREF_LABELS[pref] || localizeText(pref))
    .join("・");
}

function localizeText(value) {
  return String(value ?? "")
    .replaceAll("东京门桥", "東京ゲートブリッジ")
    .replaceAll("彩虹桥", "レインボーブリッジ")
    .replaceAll("东京湾", "東京湾")
    .replaceAll("自由女神", "自由の女神像")
    .replaceAll("首都高", "首都高速")
    .replaceAll("巨大路口", "スクランブル交差点")
    .replaceAll("灯屏", "大型ビジョン")
    .replaceAll("东京站", "東京駅")
    .replaceAll("工厂夜景", "工場夜景")
    .replaceAll("工场夜景", "工場夜景")
    .replaceAll("近代工业遗产", "近代産業遺産")
    .replaceAll("东京", "東京")
    .replaceAll("千叶", "千葉")
    .replaceAll("横滨", "横浜")
    .replaceAll("镰仓", "鎌倉")
    .replaceAll("静冈", "静岡")
    .replaceAll("群马", "群馬")
    .replaceAll("热海", "熱海")
    .replaceAll("涩谷", "渋谷")
    .replaceAll("新桥", "新橋")
    .replaceAll("有乐町", "有楽町")
    .replaceAll("银座", "銀座")
    .replaceAll("藏前", "蔵前")
    .replaceAll("丰洲", "豊洲")
    .replaceAll("台场", "お台場")
    .replaceAll("所泽", "所沢")
    .replaceAll("长瀞", "長瀞")
    .replaceAll("饭能", "飯能")
    .replaceAll("叶山", "葉山")
    .replaceAll("横须贺", "横須賀")
    .replaceAll("伊势原", "伊勢原")
    .replaceAll("富士五湖", "富士五湖")
    .replaceAll("南房总", "南房総")
    .replaceAll("水户", "水戸")
    .replaceAll("馆山", "館山")
    .replaceAll("胜浦", "勝浦")
    .replaceAll("鸭川", "鴨川")
    .replaceAll("户田", "戸田")
    .replaceAll("江户川", "江戸川")
    .replaceAll("调布", "調布")
    .replaceAll("本乡", "本郷")
    .replaceAll("关东", "関東")
    .replaceAll("周边", "周辺")
    .replaceAll("工厂", "工場")
    .replaceAll("工场", "工場")
    .replaceAll("工业", "工業")
    .replaceAll("飞机", "航空機")
    .replaceAll("铁道", "鉄道")
    .replaceAll("电铁", "電鉄")
    .replaceAll("红砖", "赤レンガ")
    .replaceAll("仓库", "倉庫")
    .replaceAll("砖造", "レンガ造")
    .replaceAll("拱桥", "アーチ橋")
    .replaceAll("桥梁", "橋梁")
    .replaceAll("高楼群", "高層ビル群")
    .replaceAll("高楼", "高層ビル")
    .replaceAll("高层", "高層")
    .replaceAll("广场", "広場")
    .replaceAll("建筑线条", "建築のライン")
    .replaceAll("建筑", "建築")
    .replaceAll("街区", "街並み")
    .replaceAll("老街", "町並み")
    .replaceAll("老商业街", "老舗商店街")
    .replaceAll("书店", "書店")
    .replaceAll("古着街", "古着店の並び")
    .replaceAll("路地", "路地")
    .replaceAll("街头", "街歩き")
    .replaceAll("人文", "スナップ")
    .replaceAll("街头表演", "大道芸")
    .replaceAll("人流", "人の流れ")
    .replaceAll("夜间", "夜間")
    .replaceAll("商业", "商業")
    .replaceAll("公园", "公園")
    .replaceAll("庭园", "庭園")
    .replaceAll("花园", "花壇")
    .replaceAll("美术馆", "美術館")
    .replaceAll("博物馆", "博物館")
    .replaceAll("神宫", "神宮")
    .replaceAll("神社", "神社")
    .replaceAll("寺", "寺")
    .replaceAll("湖畔", "湖畔")
    .replaceAll("溪谷", "渓谷")
    .replaceAll("瀑布", "滝")
    .replaceAll("灯台", "灯台")
    .replaceAll("渔港", "漁港")
    .replaceAll("车站", "駅")
    .replaceAll("站", "駅")
    .replaceAll("桥", "橋")
    .replaceAll("海边", "海沿い")
    .replaceAll("海滨", "海浜")
    .replaceAll("海岸线", "海岸線")
    .replaceAll("人工海岸", "人工海浜")
    .replaceAll("海湾", "ベイエリア")
    .replaceAll("港湾", "港湾")
    .replaceAll("河口", "河口")
    .replaceAll("水面倒影", "水面反射")
    .replaceAll("夕阳", "夕景")
    .replaceAll("日出", "日の出")
    .replaceAll("清晨", "早朝")
    .replaceAll("雾", "霧")
    .replaceAll("云海", "雲海")
    .replaceAll("山谷", "谷筋")
    .replaceAll("山並み", "山並み")
    .replaceAll("山顶", "山頂")
    .replaceAll("山水", "渓流")
    .replaceAll("山景", "山景")
    .replaceAll("山坡", "山腹")
    .replaceAll("近代", "近代")
    .replaceAll("世界遗产", "世界遺産")
    .replaceAll("达摩", "だるま")
    .replaceAll("观音", "観音")
    .replaceAll("鸟居", "鳥居")
    .replaceAll("线条", "ライン")
    .replaceAll("管线", "配管")
    .replaceAll("烟囱", "煙突")
    .replaceAll("蒸汽", "蒸気")
    .replaceAll("天际线", "スカイライン")
    .replaceAll("摩天轮", "観覧車")
    .replaceAll("塔楼", "タワーマンション")
    .replaceAll("俯瞰", "俯瞰")
    .replaceAll("松", "松")
    .replaceAll("绿地", "緑地")
    .replaceAll("绿意", "緑")
    .replaceAll("芒草", "すすき")
    .replaceAll("粉蝶花", "ネモフィラ")
    .replaceAll("紫藤", "藤")
    .replaceAll("罂粟", "ポピー")
    .replaceAll("灯饰", "ライトアップ")
    .replaceAll("白鸟", "白鳥")
    .replaceAll("樱", "桜")
    .replaceAll("红叶", "紅葉")
    .replaceAll("通年", "通年")
    .replaceAll("蓝调", "ブルーアワー")
    .replaceAll("雨天也可", "雨天も可")
    .replaceAll("雨后", "雨上がり")
    .replaceAll("日落", "夕景")
    .replaceAll("下午", "午後")
    .replaceAll("冬晴", "冬晴れ")
    .replaceAll("冬夜", "冬の夜")
    .replaceAll("春水田", "春の水田")
    .replaceAll("早朝", "早朝")
    .replaceAll("春", "春")
    .replaceAll("秋", "秋")
    .replaceAll("冬", "冬")
    .replaceAll("建议", "推奨")
    .replaceAll("镜头", "レンズ")
    .replaceAll("场", "場")
    .replaceAll("线", "線")
    .replaceAll("门", "門");
}

function typeParts(type) {
  return String(type || "").split("/").filter(Boolean);
}

function primaryType(type) {
  const first = typeParts(type)[0];
  return TYPE_PRIMARY[first] || TYPE_LABELS[first] || localizeText(first);
}

function typeDetail(type) {
  return typeParts(type)
    .map((part) => TYPE_LABELS[part] || localizeText(part))
    .join("・");
}

function uniqueBy(key) {
  return [...new Map(spots.map((spot) => [spot[key], spot[key]])).values()].filter(Boolean).sort((a, b) =>
    String(a).localeCompare(String(b), "ja"),
  );
}

function uniqueByGetter(getter) {
  return [...new Map(spots.map((spot) => [getter(spot), getter(spot)])).values()].filter(Boolean).sort((a, b) =>
    String(a).localeCompare(String(b), "ja"),
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textOf(spot) {
  return [
    spot.name.ja,
    spot.name.zh,
    spot.prefecture.ja,
    spot.prefecture.zh,
    spot.area.ja,
    spot.area.zh,
    spot.primaryType.ja,
    spot.primaryType.zh,
    spot.typeDetail.ja,
    spot.typeDetail.zh,
    spot.visual.ja,
    spot.visual.zh,
    spot.season.ja,
    spot.season.zh,
    spot.lens.ja,
    spot.lens.zh,
    spot.raw["地点"],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function metaForSpot(spot) {
  return PHOTO_META[spot.id] || {};
}

function japanRefsForSpot(spot) {
  return JAPAN_PHOTO_REFS[spot.id] || [];
}

function locationForSpot(spot) {
  return LOCATION_DATA.locations[spot.id] || null;
}

function mapsUrlForSpot(spot) {
  const meta = metaForSpot(spot);
  if (meta.mapsUrl) return meta.mapsUrl;
  const query = encodeURIComponent([spot.name.ja, spot.area.ja, spot.prefecture.ja, "日本"].filter(Boolean).join(" "));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function selectedOrAll(set) {
  return set.size === 0;
}

function matchesSet(set, value) {
  return selectedOrAll(set) || set.has(value);
}

function filteredSpots() {
  const query = state.search.trim().toLowerCase();
  return spots
    .filter((spot) => !query || textOf(spot).includes(query))
    .filter((spot) => matchesSet(state.grade, spot.grade))
    .filter((spot) => matchesSet(state.pref, spot.prefecture.ja))
    .filter((spot) => matchesSet(state.type, spot.primaryType.ja))
    .filter((spot) => matchesSet(state.traffic, spot.traffic.ja))
    .filter((spot) => matchesSet(state.time, spot.time.ja))
    .filter((spot) => spot.score >= state.minScore)
    .filter((spot) => !state.savedOnly || saved.has(spot.id))
    .filter((spot) => !state.seasonNow || isSpotInSeasonNow(spot))
    .filter((spot) => !state.weatherMatch || isWeatherGoodForSpot(spot))
    .sort(sorter(state.sort));
}

function sorter(mode) {
  const byScore = (a, b) => b.score - a.score;
  const byName = (a, b) => String(a.name.ja).localeCompare(String(b.name.ja), "ja");
  if (mode === "score-asc") return (a, b) => a.score - b.score;
  if (mode === "niche-desc") {
    return (a, b) => Number(b.niche || 0) - Number(a.niche || 0) || byScore(a, b);
  }
  if (mode === "traffic") {
    const rank = { A: 1, B: 2, C: 3 };
    return (a, b) => (rank[a.traffic.rank] || 9) - (rank[b.traffic.rank] || 9) || byScore(a, b);
  }
  if (mode === "name") return byName;
  return byScore;
}

function render() {
  const list = filteredSpots();
  el.resultCount.textContent = list.length;
  el.savedCount.textContent = saved.size;
  renderCharts(list);
  renderBest(list);
  el.cards.classList.toggle("hidden", state.view !== "cards");
  el.tableWrap.classList.toggle("hidden", state.view !== "table");
  el.mapWrap.classList.toggle("hidden", state.view !== "map");
  if (state.view === "cards") {
    renderCards(list);
  } else if (state.view === "table") {
    renderTable(list);
  } else {
    renderMap(list);
  }
}

function photoFigure(spot, size = "card") {
  const meta = metaForSpot(spot);
  const primaryRef = japanRefsForSpot(spot)[0];
  const imgSrc = meta.localImageUrl || meta.imageUrl;
  const caption = imgSrc
    ? `${primaryRef ? `${primaryRef.name}優先 / ` : ""}${meta.photoSource || "写真"}`
    : primaryRef
      ? t("photo.checkOnSite", { site: primaryRef.name })
      : t("photo.unset");
  if (!imgSrc) {
    return `
      <figure class="${size === "best" ? "best-photo" : "spot-photo"} photo-empty">
        <div>
          <strong>${escapeHtml(localized(spot.name))}</strong>
          <span>${escapeHtml(t("photo.checkLinks"))}</span>
        </div>
        <figcaption>${escapeHtml(caption)}</figcaption>
      </figure>
    `;
  }
  return `
    <figure class="${size === "best" ? "best-photo" : "spot-photo"}">
      <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(localized(spot.name))}の写真" loading="lazy" />
      <figcaption>${escapeHtml(caption)}</figcaption>
    </figure>
  `;
}

function renderCards(list) {
  if (!list.length) {
    el.cards.innerHTML = `<div class="panel empty">${escapeHtml(t("empty.noResults"))}</div>`;
    return;
  }
  el.cards.innerHTML = list.map(cardTemplate).join("");
}

function tempInfo(spot) {
  if (!weatherCache || !weatherCache.forecasts) return "";
  const prefJa = spot.prefecture.ja;
  const prefs = prefJa.split("・");

  for (const pref of prefs) {
    const fc = weatherCache.forecasts[pref];
    if (!fc || !fc.high || fc.high.length === 0) continue;

    const todayHigh = Math.round(fc.high[0]);
    const shift = comfortShift();
    const allTypes = [spot.primaryType.ja];
    if (spot.typeDetail.ja) {
      for (const t of spot.typeDetail.ja.split("/")) {
        const c = t.trim();
        if (c && c !== spot.primaryType.ja) allTypes.push(c);
      }
    }

    for (const t of allTypes) {
      const range = TYPE_TEMP_RANGE[t];
      if (!range) continue;
      const lo = range[0] + shift;
      const hi = range[1] + shift;
      const ok = todayHigh >= lo && todayHigh <= hi;
      const cls = ok ? "temp-ok" : "temp-ng";
      const icon = ok ? "✓" : "✗";
      return `
        <div class="temp-info ${cls}">
          <span>🌡 ${escapeHtml(t("card.tempRange"))} ${lo}〜${hi}°C</span>
          <span>${escapeHtml(t("card.tempToday"))} ${todayHigh}°C ${icon}</span>
        </div>`;
    }
  }
  return "";
}

function cardTemplate(spot) {
  const id = spot.id;
  const grade = String(spot.grade || "").toLowerCase();
  return `
    <article class="spot-card">
      ${photoFigure(spot)}
      ${seasonBadge(spot)}
      <div class="spot-head">
        <div class="spot-title">
          <h3>${escapeHtml(localized(spot.name))}</h3>
          <p>${escapeHtml(localized(spot.prefecture))} / ${escapeHtml(localized(spot.area))}</p>
        </div>
        <button class="save-btn ${saved.has(id) ? "saved" : ""}" type="button" data-save="${id}" title="${escapeHtml(t("card.save"))}" aria-label="${escapeHtml(t("card.save"))}">★</button>
      </div>
      <div class="score-line">
        <div class="score">${escapeHtml(spot.score)}</div>
        <div class="score-track"><div class="score-fill" style="--score:${spot.score}%"></div></div>
        <strong>${escapeHtml(spot.grade)}</strong>
      </div>
      <div class="tag-row">
        <span class="tag grade-${grade}">${escapeHtml(spot.grade)}${escapeHtml(t("common.rank"))}</span>
        <span class="tag">${escapeHtml(localized(spot.traffic))}</span>
        <span class="tag">${escapeHtml(localized(spot.time))}</span>
        <span class="tag">${escapeHtml(localized(spot.primaryType))}</span>
      </div>
      <p class="spot-desc">${escapeHtml(localized(spot.visual))}</p>
      <div class="meta-grid">
        <div><span>${escapeHtml(t("card.recommend"))}</span>${escapeHtml(localized(spot.season))}</div>
        <div><span>${escapeHtml(t("card.lens"))}</span>${escapeHtml(localized(spot.lens))}</div>
        <div><span>${escapeHtml(t("card.typeDetail"))}</span>${escapeHtml(localized(spot.typeDetail))}</div>
        <div><span>${escapeHtml(t("card.niche"))}</span>${escapeHtml(spot.niche ?? "-")}</div>
      </div>
      ${tempInfo(spot)}
      <button class="score-toggle" type="button" data-toggle-score="${id}" aria-expanded="false">
        ${escapeHtml(t("card.scoreBreakdown"))} ▸
      </button>
      <div class="score-breakdown collapsed">${scoreFields.map((field) => miniScore(spot, field)).join("")}</div>
      ${memoSection(spot)}
      <div class="link-row">${linkButtons(spot)}</div>
    </article>
  `;
}

function linkButtons(spot) {
  return `
    ${japanRefsForSpot(spot)
      .slice(0, 3)
      .map(
        (ref, index) =>
          `<a class="source-link ${index === 0 ? "primary-photo-link" : ""}" href="${escapeHtml(ref.url)}" target="_blank" rel="noreferrer">${escapeHtml(ref.name)}</a>`,
      )
      .join("")}
    <a class="source-link map-link" href="${escapeHtml(mapsUrlForSpot(spot))}" target="_blank" rel="noreferrer">${escapeHtml(t("link.map"))}</a>
    ${metaForSpot(spot).photoPage ? `<a class="source-link" href="${escapeHtml(metaForSpot(spot).photoPage)}" target="_blank" rel="noreferrer">${escapeHtml(t("link.photoSource"))}</a>` : ""}
  `;
}

function miniScore(spot, [label, key, max]) {
  const value = Number(spot[key] || 0);
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return `
    <div class="mini-score">
      <div>${escapeHtml(localized(label))}<div class="mini-bar"><span style="--w:${pct}%"></span></div></div>
      <strong>${value}/${max}</strong>
    </div>
  `;
}

function renderTable(list) {
  renderTableHead();
  if (!list.length) {
    el.tableBody.innerHTML = `<tr><td colspan="${tableColumns.length}" class="empty">${escapeHtml(t("empty.noResults"))}</td></tr>`;
    return;
  }
  el.tableBody.innerHTML = list
    .map((spot) => `<tr>${tableColumns.map((column) => tableCell(column, spot)).join("")}</tr>`)
    .join("");
}

function tableCell(column, spot) {
  const meta = metaForSpot(spot);
  const imgSrc = meta.localImageUrl || meta.imageUrl;
  const cell = {
    saved: `<button class="save-btn ${saved.has(spot.id) ? "saved" : ""}" type="button" data-save="${spot.id}" title="${escapeHtml(t("card.save"))}" aria-label="${escapeHtml(t("card.save"))}">★</button>`,
    spot: `<div class="table-spot">${
      imgSrc ? `<img src="${escapeHtml(imgSrc)}" alt="" loading="lazy" />` : `<span class="table-photo-empty">No photo</span>`
    }<div><strong>${escapeHtml(localized(spot.name))}</strong><br><span class="muted">${escapeHtml(localized(spot.visual))}</span></div></div>`,
    pref: escapeHtml(localized(spot.prefecture)),
    area: escapeHtml(localized(spot.area)),
    type: escapeHtml(localized(spot.primaryType)),
    traffic: escapeHtml(localized(spot.traffic)),
    time: escapeHtml(localized(spot.time)),
    season: escapeHtml(localized(spot.season)),
    lens: escapeHtml(localized(spot.lens)),
    score: `<span class="score-cell">${escapeHtml(spot.score)}</span>`,
    niche: escapeHtml(spot.niche ?? "-"),
    source: `${japanRefsForSpot(spot)[0] ? `<a class="source-link" href="${escapeHtml(japanRefsForSpot(spot)[0].url)}" target="_blank" rel="noreferrer">${escapeHtml(japanRefsForSpot(spot)[0].name)}</a><br>` : ""}<a class="source-link" href="${escapeHtml(mapsUrlForSpot(spot))}" target="_blank" rel="noreferrer">${escapeHtml(t("link.mapShort"))}</a>`,
  };
  return `<td style="width:${column.width}px;min-width:${column.width}px;max-width:${column.width}px">${cell[column.id] || ""}</td>`;
}

function renderMap(list) {
  const token = ++mapRenderToken;
  const located = list.map((spot) => ({ spot, location: locationForSpot(spot) })).filter((item) => item.location);
  const approximate = located.filter((item) => item.location.precision === "approximate").length;
  el.mapCount.textContent = located.length;
  el.mapPrecision.textContent = approximate
    ? t("map.precisionApprox", { verified: located.length - approximate, approximate })
    : t("map.precisionAll");
  el.mapFallback.classList.add("hidden");

  ensureMapProvider()
    .then((provider) => {
      if (token !== mapRenderToken) return;
      if (provider === "google") {
        renderGoogleMap(located);
      } else {
        renderLeafletMap(located);
      }
    })
    .catch(() => renderMapFallback(located));
}

function ensureMapProvider() {
  if (MAP_CONFIG.provider === "google" && MAP_CONFIG.googleMapsApiKey) {
    return ensureGoogleMaps().then(() => "google");
  }
  return ensureLeaflet().then(() => "leaflet");
}

function ensureLeaflet() {
  if (window.L) return Promise.resolve();
  if (!document.querySelector("link[data-leaflet]")) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.dataset.leaflet = "true";
    document.head.appendChild(link);
  }
  return loadScript("leaflet-js", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
}

function ensureGoogleMaps() {
  if (window.google?.maps) return Promise.resolve();
  const params = new URLSearchParams({ key: MAP_CONFIG.googleMapsApiKey, v: "weekly" });
  return loadScript("google-maps-js", `https://maps.googleapis.com/maps/api/js?${params.toString()}`);
}

function loadScript(id, src) {
  const existing = document.querySelector(`script[data-loader="${id}"]`);
  if (existing) return existing.dataset.loaded === "true" ? Promise.resolve() : new Promise((resolve, reject) => {
    existing.addEventListener("load", resolve, { once: true });
    existing.addEventListener("error", reject, { once: true });
  });
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.loader = id;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", reject);
    document.head.appendChild(script);
  });
}

function renderLeafletMap(located) {
  if (!mapRuntime.map || mapRuntime.provider !== "leaflet") {
    mapRuntime = { provider: "leaflet", map: window.L.map(el.mapCanvas, { scrollWheelZoom: true }), layer: null, markers: [] };
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapRuntime.map);
    mapRuntime.layer = window.L.layerGroup().addTo(mapRuntime.map);
  }
  mapRuntime.layer.clearLayers();
  const bounds = [];
  located.forEach(({ spot, location }) => {
    const latlng = [location.lat, location.lng];
    bounds.push(latlng);
    window.L.circleMarker(latlng, {
      radius: location.precision === "approximate" ? 6 : 7,
      color: markerColor(spot),
      fillColor: markerColor(spot),
      fillOpacity: location.precision === "approximate" ? 0.45 : 0.82,
      weight: location.precision === "approximate" ? 1 : 2,
    })
      .bindPopup(mapPopupHtml(spot, location), { maxWidth: 280 })
      .addTo(mapRuntime.layer);
  });
  setTimeout(() => mapRuntime.map.invalidateSize(), 0);
  if (bounds.length) {
    mapRuntime.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 11 });
  } else {
    mapRuntime.map.setView([35.681236, 139.767125], 8);
  }
}

function renderGoogleMap(located) {
  if (!mapRuntime.map || mapRuntime.provider !== "google") {
    mapRuntime = {
      provider: "google",
      map: new google.maps.Map(el.mapCanvas, { center: { lat: 35.681236, lng: 139.767125 }, zoom: 8, mapTypeControl: false }),
      markers: [],
      infoWindow: new google.maps.InfoWindow(),
    };
  }
  mapRuntime.markers.forEach((marker) => marker.setMap(null));
  mapRuntime.markers = [];
  const bounds = new google.maps.LatLngBounds();
  located.forEach(({ spot, location }) => {
    const position = { lat: location.lat, lng: location.lng };
    const marker = new google.maps.Marker({
      position,
      map: mapRuntime.map,
      title: spot.name.ja,
      opacity: location.precision === "approximate" ? 0.55 : 1,
    });
    marker.addListener("click", () => {
      mapRuntime.infoWindow.setContent(mapPopupHtml(spot, location));
      mapRuntime.infoWindow.open({ map: mapRuntime.map, anchor: marker });
    });
    mapRuntime.markers.push(marker);
    bounds.extend(position);
  });
  if (located.length) mapRuntime.map.fitBounds(bounds, 30);
}

function renderMapFallback(located) {
  el.mapFallback.classList.remove("hidden");
  el.mapFallback.innerHTML = `
    <strong>${escapeHtml(t("map.loadFailedTitle"))}</strong>
    <p>${escapeHtml(t("map.loadFailedBody"))}</p>
    <div class="fallback-links">
      ${located
        .slice(0, 80)
        .map(({ spot }) => `<a href="${escapeHtml(mapsUrlForSpot(spot))}" target="_blank" rel="noreferrer">${escapeHtml(localized(spot.name))}</a>`)
        .join("")}
    </div>
  `;
}

function markerColor(spot) {
  const grade = spot.grade;
  if (grade === "S") return "#b9473f";
  if (grade === "A") return "#147c86";
  if (grade === "B") return "#315f9c";
  return "#8a6b3f";
}

function mapPopupHtml(spot, location) {
  const meta = metaForSpot(spot);
  const imgSrc = meta.localImageUrl || meta.imageUrl;
  const precision = location.precision === "approximate" ? t("map.precisionApproxLabel") : t("map.precisionVerifiedLabel");
  return `
    <div class="map-popup">
      ${imgSrc ? `<img src="${escapeHtml(imgSrc)}" alt="">` : ""}
      <strong>${escapeHtml(localized(spot.name))}</strong>
      <span>${escapeHtml(localized(spot.prefecture))} / ${escapeHtml(localized(spot.area))}</span>
      <span>${escapeHtml(localized(spot.primaryType))}・${escapeHtml(spot.grade)}${escapeHtml(t("common.rank"))}・${escapeHtml(spot.score)}${escapeHtml(t("common.points"))}</span>
      <span>${escapeHtml(t("map.precision"))}: ${escapeHtml(precision)}</span>
      <a href="${escapeHtml(mapsUrlForSpot(spot))}" target="_blank" rel="noreferrer">${escapeHtml(t("map.open"))}</a>
    </div>
  `;
}

function renderTableHead() {
  el.tableHead.innerHTML = `<tr>${tableColumns
    .map(
      (column) => `
        <th draggable="true" data-column="${column.id}" style="width:${column.width}px;min-width:${column.width}px;max-width:${column.width}px">
          <span class="drag-handle">⋮⋮</span>${escapeHtml(columnLabel(column))}
          <span class="resize-handle" data-resize="${column.id}"></span>
        </th>
      `,
    )
    .join("")}</tr>`;
}

function renderCharts(list) {
  el.gradeChart.innerHTML = bars(countBy(list, (spot) => spot.grade), colorForGrade);
  el.typeChart.innerHTML = bars(countBy(list, (spot) => spot.primaryType.ja).slice(0, 8), (_, index) =>
    ["#147c86", "#315f9c", "#b9473f", "#b7791f"][index % 4],
  );
}

function countBy(list, getter) {
  const counts = new Map();
  list.forEach((spot) => {
    const value = getter(spot) || t("common.unclassified");
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function bars(entries, colorFn) {
  if (!entries.length) return `<p class="empty">${escapeHtml(t("empty.noData"))}</p>`;
  const max = Math.max(...entries.map((entry) => entry[1]));
  return entries
    .map(([name, value], index) => {
      const width = max ? Math.round((value / max) * 100) : 0;
      return `
        <div class="bar-row">
          <span title="${escapeHtml(metaLabel(name))}">${escapeHtml(metaLabel(name))}</span>
          <div class="bar-track"><div class="bar-fill" style="--w:${width}%; --bar:${colorFn(name, index)}"></div></div>
          <strong>${value}</strong>
        </div>
      `;
    })
    .join("");
}

function colorForGrade(grade) {
  if (grade === "S") return "#b9473f";
  if (grade === "A") return "#147c86";
  if (grade === "B") return "#315f9c";
  return "#b7791f";
}

function renderBest(list) {
  const best = list[0];
  if (!best) {
    el.bestSpot.innerHTML = `<p class="empty">${escapeHtml(t("empty.noData"))}</p>`;
    return;
  }
  el.bestSpot.innerHTML = `
    ${photoFigure(best, "best")}
    <h3>${escapeHtml(localized(best.name))}</h3>
    <p class="spot-desc">${escapeHtml(localized(best.visual))}</p>
    <div class="score-line">
      <div class="score">${escapeHtml(best.score)}</div>
      <div class="score-track"><div class="score-fill" style="--score:${best.score}%"></div></div>
      <strong>${escapeHtml(best.grade)}</strong>
    </div>
    <div class="tag-row">
      <span class="tag">${escapeHtml(localized(best.prefecture))}</span>
      <span class="tag">${escapeHtml(localized(best.primaryType))}</span>
    </div>
    <div class="link-row">${linkButtons(best)}</div>
  `;
}

function renderScoringModel() {
  const labelMap = {
    ja: {
      "交通分": "アクセス",
      "画面强度": "画面力",
      "题材密度": "題材密度",
      "光线季节稳定": "光・季節安定",
      "人流可控": "混雑耐性",
      "器材适配": "機材適性",
      "风险成本": "リスク・コスト",
    },
    zh: {
      "交通分": "交通",
      "画面强度": "画面强度",
      "题材密度": "题材密度",
      "光线季节稳定": "光线・季节稳定",
      "人流可控": "人流可控",
      "器材适配": "器材适配",
      "风险成本": "风险・成本",
    },
  };
  const scoringCopy = {
    ja: {
      "交通分": {
        definition: "東京発での所要時間と乗り換え負担",
        principle: "A=20、B=15、C=9。Cは除外ではなく、画面の強さで取り返す枠。",
      },
      "画面强度": {
        definition: "現地で一枚にまとめたときの画の強さ",
        principle: "海岸、山頂、工場夜景、渓谷は高め。日常的な街歩きや公園は控えめ。",
      },
      "题材密度": {
        definition: "同じ撮影地で拾える被写体の多さ",
        principle: "海、富士山、鳥居、灯台、街並みなどを一度に組める場所を高評価。",
      },
      "光线季节稳定": {
        definition: "短い旬だけに依存しない撮りやすさ",
        principle: "通年、ブルーアワー、雨の日でも成立する場所を高めに評価。",
      },
      "人流可控": {
        definition: "人を避けやすく、構図を変えやすいか",
        principle: "有名すぎる定番地は控えめ。開けた海岸、工業地帯、湿地は高め。",
      },
      "器材适配": {
        definition: "a7R V / GFX100S と手持ちレンズとの相性",
        principle: "24-70、70-200、100-400、広角が素直に効く場所を高評価。",
      },
      "风险成本": {
        definition: "潮位、開園日、船便、山道、費用などの不確定要素",
        principle: "都市部は高め。船、潮、山道、長距離移動が絡む場所は低め。",
      },
      "总分": {
        definition: "各項目の合計点",
        principle: "S>=86、A>=78、B>=68、C<68。",
      },
    },
    zh: {
      "交通分": {
        definition: "从东京出发的耗时和换乘负担",
        principle: "A=20、B=15、C=9。C 不是排除项，而是交给画面强度补回来。",
      },
      "画面强度": {
        definition: "现场能否收束成一张有力量的照片",
        principle: "海岸、山顶、工厂夜景、溪谷偏高；日常街拍和公园偏克制。",
      },
      "题材密度": {
        definition: "同一摄影地内可以拾取的被摄体数量",
        principle: "海、富士山、鸟居、灯塔、街景等能组合在一起的地点评价更高。",
      },
      "光线季节稳定": {
        definition: "不依赖极短季节窗口的可拍性",
        principle: "全年、蓝调时刻、雨天也成立的地点评价更高。",
      },
      "人流可控": {
        definition: "是否容易避开人流并调整构图",
        principle: "过于定番的名所会稍低；开阔海岸、工业地带、湿地偏高。",
      },
      "器材适配": {
        definition: "与 a7R V / GFX100S 和现有镜头的匹配度",
        principle: "24-70、70-200、100-400、广角能自然发挥的地点评价更高。",
      },
      "风险成本": {
        definition: "潮位、开园日、船班、山路、费用等不确定因素",
        principle: "都市部偏高；船、潮、山路、长距离移动相关地点偏低。",
      },
      "总分": {
        definition: "各项目合计分",
        principle: "S>=86、A>=78、B>=68、C<68。",
      },
    },
  };
  el.scoringModel.innerHTML = DATA.scoringModel
    .map(
      (row) => `
        <div class="score-rule">
          <strong><span>${escapeHtml(labelMap[state.lang][row["字段"]] || labelMap.ja[row["字段"]] || localizeText(row["字段"]))}</span><span>${escapeHtml(row["满分"])}${escapeHtml(t("common.points"))}</span></strong>
          <p>${escapeHtml(scoringCopy[state.lang][row["字段"]]?.definition || scoringCopy.ja[row["字段"]]?.definition || localizeText(row["定义"]))}</p>
          <p>${escapeHtml(scoringCopy[state.lang][row["字段"]]?.principle || scoringCopy.ja[row["字段"]]?.principle || localizeText(row["评分原则"]))}</p>
        </div>
      `,
    )
    .join("");
}

function renderPhotoSites() {
  const panel = document.querySelector("#photoSites");
  if (!panel) return;
  panel.innerHTML = photoSiteSummary
    .map(
      (site) => `
        <a class="photo-site-row" href="${escapeHtml(site.url)}" target="_blank" rel="noreferrer">
          <strong>${escapeHtml(site.name)}</strong>
          <span>${escapeHtml(localized(site.role))}</span>
        </a>
      `,
    )
    .join("");
}

function fillMultiFilter(container, values, selectedSet) {
  container.innerHTML = values
    .map(
      (value) => `
        <label class="filter-chip">
          <input type="checkbox" value="${escapeHtml(value)}" ${selectedSet.has(value) ? "checked" : ""}>
          <span>${escapeHtml(metaLabel(value))}</span>
        </label>
      `,
    )
    .join("");
}

function syncFilters() {
  fillMultiFilter(el.gradeFilter, uniqueByGetter((spot) => spot.grade), state.grade);
  fillMultiFilter(el.prefFilter, uniqueByGetter((spot) => spot.prefecture.ja), state.pref);
  fillMultiFilter(el.typeFilter, uniqueByGetter((spot) => spot.primaryType.ja), state.type);
  fillMultiFilter(el.trafficFilter, uniqueByGetter((spot) => spot.traffic.ja), state.traffic);
  fillMultiFilter(el.timeFilter, uniqueByGetter((spot) => spot.time.ja), state.time);
}

function updateSaved(id) {
  if (saved.has(id)) {
    saved.delete(id);
  } else {
    saved.add(id);
  }
  localStorage.setItem("photoSpotSaved", JSON.stringify([...saved]));
  render();
}

function resetFilters() {
  state.search = "";
  state.grade.clear();
  state.pref.clear();
  state.type.clear();
  state.traffic.clear();
  state.time.clear();
  state.minScore = 0;
  state.savedOnly = false;
  state.sort = "score-desc";
  syncControls();
  render();
}

function syncControls() {
  el.searchInput.value = state.search;
  el.minScore.value = state.minScore;
  el.minScoreValue.textContent = state.minScore;
  el.savedOnly.checked = state.savedOnly;
  if (el.seasonNow) el.seasonNow.checked = state.seasonNow;
  if (el.weatherMatch) el.weatherMatch.checked = state.weatherMatch;
  if (el.comfortTemp) el.comfortTemp.value = state.comfortTemp;
  if (el.comfortValue) el.comfortValue.textContent = state.comfortTemp;
  el.sortSelect.value = state.sort;
  syncFilters();
}

function bindMultiFilter(container, selectedSet) {
  container.addEventListener("change", (event) => {
    const input = event.target.closest("input[type='checkbox']");
    if (!input) return;
    if (input.checked) {
      selectedSet.add(input.value);
    } else {
      selectedSet.delete(input.value);
    }
    render();
  });
}

function bindEvents() {
  if (el.langJa) el.langJa.addEventListener("click", () => setLanguage("ja"));
  if (el.langZh) el.langZh.addEventListener("click", () => setLanguage("zh"));
  el.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    render();
  });
  bindMultiFilter(el.gradeFilter, state.grade);
  bindMultiFilter(el.prefFilter, state.pref);
  bindMultiFilter(el.typeFilter, state.type);
  bindMultiFilter(el.trafficFilter, state.traffic);
  bindMultiFilter(el.timeFilter, state.time);
  el.minScore.addEventListener("input", (event) => {
    state.minScore = Number(event.target.value);
    el.minScoreValue.textContent = state.minScore;
    render();
  });
  el.savedOnly.addEventListener("change", (event) => {
    state.savedOnly = event.target.checked;
    render();
  });
  if (el.seasonNow) {
    el.seasonNow.addEventListener("change", (event) => {
      state.seasonNow = event.target.checked;
      render();
    });
  }
  if (el.weatherMatch) {
    el.weatherMatch.addEventListener("change", (event) => {
      state.weatherMatch = event.target.checked;
      render();
    });
  }
  if (el.comfortTemp) {
    el.comfortTemp.addEventListener("input", () => {
      state.comfortTemp = Number(el.comfortTemp.value);
      if (el.comfortValue) el.comfortValue.textContent = state.comfortTemp;
      localStorage.setItem("photoSpotComfortTemp", state.comfortTemp);
      if (state.weatherMatch) render();
    });
  }
  if (el.refreshWeather) {
    el.refreshWeather.addEventListener("click", () => {
      weatherCache = null;
      renderWeather();
      fetchWeather();
    });
  }
  el.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    render();
  });
  el.resetFilters.addEventListener("click", resetFilters);
  el.cardViewBtn.addEventListener("click", () => setView("cards"));
  el.tableViewBtn.addEventListener("click", () => setView("table"));
  el.mapViewBtn.addEventListener("click", () => setView("map"));
  document.addEventListener("click", (event) => {
    const saveButton = event.target.closest("[data-save]");
    if (saveButton) {
      updateSaved(saveButton.dataset.save);
      return;
    }
    const memoSaveBtn = event.target.closest("[data-memo-save]");
    if (memoSaveBtn) {
      const spotId = memoSaveBtn.dataset.memoSave;
      const textarea = document.querySelector(`textarea[data-memo="${spotId}"]`);
      if (textarea) {
        memos[spotId] = textarea.value;
        saveMemos();
        memoSaveBtn.textContent = "✓";
        setTimeout(() => { memoSaveBtn.textContent = t("memo.save"); }, 1000);
      }
      return;
    }
    const scoreToggle = event.target.closest("[data-toggle-score]");
    if (scoreToggle) {
      const card = scoreToggle.closest(".spot-card");
      const breakdown = card?.querySelector(".score-breakdown");
      if (breakdown) {
        const collapsed = breakdown.classList.toggle("collapsed");
        scoreToggle.setAttribute("aria-expanded", !collapsed);
        scoreToggle.innerHTML = `${t("card.scoreBreakdown")} ${collapsed ? "▸" : "▾"}`;
      }
      return;
    }
  });
  el.expandAllScores.addEventListener("click", () => {
    document.querySelectorAll(".score-breakdown").forEach(el => el.classList.remove("collapsed"));
    document.querySelectorAll("[data-toggle-score]").forEach(btn => {
      btn.setAttribute("aria-expanded", "true");
      btn.innerHTML = `${t("card.scoreBreakdown")} ▾`;
    });
  });
  el.collapseAllScores.addEventListener("click", () => {
    document.querySelectorAll(".score-breakdown").forEach(el => el.classList.add("collapsed"));
    document.querySelectorAll("[data-toggle-score]").forEach(btn => {
      btn.setAttribute("aria-expanded", "false");
      btn.innerHTML = `${t("card.scoreBreakdown")} ▸`;
    });
  });
  bindTableInteractions();
}

function setLanguage(lang) {
  if (!UI_TEXT[lang] || state.lang === lang) return;
  state.lang = lang;
  localStorage.setItem("photoSpotLang", lang);
  applyStaticLanguage();
  renderScoringModel();
  renderPhotoSites();
  renderWeather();
  syncControls();
  render();
}

function bindTableInteractions() {
  let dragColumn = null;
  let resizing = null;
  el.tableHead.addEventListener("dragstart", (event) => {
    const th = event.target.closest("th[data-column]");
    if (!th) return;
    dragColumn = th.dataset.column;
    event.dataTransfer.effectAllowed = "move";
  });
  el.tableHead.addEventListener("dragover", (event) => {
    if (dragColumn) event.preventDefault();
  });
  el.tableHead.addEventListener("drop", (event) => {
    const th = event.target.closest("th[data-column]");
    if (!th || !dragColumn || dragColumn === th.dataset.column) return;
    const from = tableColumns.findIndex((column) => column.id === dragColumn);
    const to = tableColumns.findIndex((column) => column.id === th.dataset.column);
    const [moved] = tableColumns.splice(from, 1);
    tableColumns.splice(to, 0, moved);
    dragColumn = null;
    saveTableColumns();
    renderTable(filteredSpots());
  });
  el.tableHead.addEventListener("pointerdown", (event) => {
    const handle = event.target.closest("[data-resize]");
    if (!handle) return;
    event.preventDefault();
    const column = tableColumns.find((item) => item.id === handle.dataset.resize);
    resizing = { id: column.id, startX: event.clientX, startWidth: column.width };
    document.body.classList.add("resizing-column");
  });
  window.addEventListener("pointermove", (event) => {
    if (!resizing) return;
    const column = tableColumns.find((item) => item.id === resizing.id);
    column.width = Math.max(64, Math.min(520, resizing.startWidth + event.clientX - resizing.startX));
    renderTableHead();
  });
  window.addEventListener("pointerup", () => {
    if (!resizing) return;
    resizing = null;
    document.body.classList.remove("resizing-column");
    saveTableColumns();
    renderTable(filteredSpots());
  });
}

function setView(view) {
  state.view = view;
  el.cardViewBtn.classList.toggle("active", view === "cards");
  el.tableViewBtn.classList.toggle("active", view === "table");
  el.mapViewBtn.classList.toggle("active", view === "map");
  el.scoreToggleGroup.classList.toggle("hidden", view !== "cards");
  render();
}

// ---- Weather (Open-Meteo free API, no key) ----
const PREF_CENTERS = {
  "東京都": { lat: 35.68, lon: 139.75 },
  "千葉県": { lat: 35.60, lon: 140.12 },
  "神奈川県": { lat: 35.45, lon: 139.64 },
  "埼玉県": { lat: 35.96, lon: 139.39 },
  "茨城県": { lat: 36.34, lon: 140.45 },
  "栃木県": { lat: 36.57, lon: 139.88 },
  "群馬県": { lat: 36.39, lon: 139.06 },
  "山梨県": { lat: 35.66, lon: 138.57 },
  "静岡県": { lat: 34.92, lon: 138.32 },
};

async function fetchWeather() {
  const latStr = Object.values(PREF_CENTERS).map(c => c.lat).join(",");
  const lonStr = Object.values(PREF_CENTERS).map(c => c.lon).join(",");
  const prefKeys = Object.keys(PREF_CENTERS);

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latStr}&longitude=${lonStr}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia/Tokyo&forecast_days=3`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("API error");
    const data = await resp.json();

    const forecasts = {};
    // Open-Meteo returns arrays per lat/lon, matching our order
    for (let i = 0; i < prefKeys.length; i++) {
      const daily = {
        dates: data[i]?.daily?.time || [],
        high: data[i]?.daily?.temperature_2m_max || [],
        low: data[i]?.daily?.temperature_2m_min || [],
        rain: data[i]?.daily?.precipitation_probability_max || [],
        code: data[i]?.daily?.weather_code || [],
      };
      forecasts[prefKeys[i]] = daily;
    }
    weatherCache = { updated: Date.now(), forecasts };
  } catch (e) {
    console.warn("Weather fetch failed:", e);
    weatherCache = null;
  }
  renderWeather();
}

function weatherIcon(code) {
  if (code <= 1) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "☁️";
  if (code <= 57) return "🌧️";
  if (code <= 67) return "🌨️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌧️";
  return "⛈️";
}

function renderWeather() {
  if (!el.weatherContent) return;
  if (!weatherCache || !weatherCache.forecasts) {
    el.weatherContent.innerHTML = `<p class="weather-loading">${escapeHtml(t("weather.loading"))}</p>`;
    return;
  }

  const { updated, forecasts } = weatherCache;
  const prefNames = Object.keys(forecasts);
  const today = new Date();

  let html = "";
  for (const pref of prefNames) {
    const f = forecasts[pref];
    if (!f || !f.dates || f.dates.length < 2) continue;

    // Get weekend dates (Saturday & Sunday)
    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
    const days = [];
    for (let i = 0; i < Math.min(f.dates.length, 3); i++) {
      const d = new Date(f.dates[i] + "T00:00:00");
      const dayName = dayNames[d.getDay()];
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      days.push({
        label: `${d.getMonth() + 1}/${d.getDate()}(${dayName})`,
        high: Math.round(f.high[i] || 0),
        low: Math.round(f.low[i] || 0),
        rain: f.rain[i] != null ? Math.round(f.rain[i]) : null,
        icon: weatherIcon(f.code[i]),
        isWeekend,
      });
    }

    // Display first 2-3 days (Fri-Sun for weekend planning)
    const displayDays = days.slice(-3);
    if (displayDays.length === 0) continue;

    html += `<div class="weather-pref-row">
      <strong>${escapeHtml(pref.replace("県","").replace("都",""))}</strong>
      <div class="weather-days">`;
    for (const day of displayDays) {
      html += `<div class="weather-day${day.isWeekend ? " weekend" : ""}">
        <span class="w-label">${escapeHtml(day.label)}</span>
        <span class="w-icon">${day.icon}</span>
        <span class="w-temp">${day.high}°</span>
        ${day.rain != null ? `<span class="w-rain">${day.rain}%</span>` : ""}
      </div>`;
    }
    html += `</div></div>`;
  }

  const ago = Math.round((Date.now() - updated) / 60000);
  html += `<p class="weather-updated">${escapeHtml(t("weather.updated"))}: ${ago}分前</p>`;
  el.weatherContent.innerHTML = html;
}

// Spot type temperature comfort ranges (at default comfortTemp=26°C, shift=0)
// shift = comfortTemp - 26, applied symmetrically to min/max
const TYPE_TEMP_RANGE = {
  "海岸":              [10, 30],
  "展望・山岳":        [ 5, 28],
  "庭園・花":          [ 8, 32],
  "渓谷・滝":          [ 5, 30],
  "湖沼・湿地":        [ 5, 32],
  "街歩き":            [ 0, 33],
  "寺社":              [-5, 35],
  "都市夜景":          [-5, 35],
  "歴史・遺構":        [ 0, 33],
  "鉄道・航空機":      [-5, 35],
  "動物・テーマ施設":  [-5, 35],
  "工場夜景":          [-5, 35],
};
const DEFAULT_COMFORT_TEMP = 26;

function comfortShift() {
  return (state.comfortTemp || DEFAULT_COMFORT_TEMP) - DEFAULT_COMFORT_TEMP;
}

function isWeatherGoodForSpot(spot) {
  if (!weatherCache || !weatherCache.forecasts) return true;
  const prefJa = spot.prefecture.ja;
  const prefs = prefJa.split("・");

  for (const pref of prefs) {
    const fc = weatherCache.forecasts[pref];
    if (!fc || !fc.code || fc.code.length === 0) continue;

    const code = fc.code[0];
    const rain = fc.rain ? (fc.rain[0] || 0) : 0;
    const high = fc.high ? (fc.high[0] || 99) : 99;

    // 1. Weather code → rain/storm = bad
    if (code > 48) return false;

    // 2. Rain probability ≥ 60% → treat as bad
    if (rain >= 60) return false;

    // 3. Temperature check
    const allTypes = [spot.primaryType.ja];
    if (spot.typeDetail.ja) {
      for (const t of spot.typeDetail.ja.split("/")) {
        const cleaned = t.trim();
        if (cleaned && cleaned !== spot.primaryType.ja) allTypes.push(cleaned);
      }
    }

    let tempOk = false;
    const shift = comfortShift();
    for (const t of allTypes) {
      const range = TYPE_TEMP_RANGE[t];
      if (!range) continue;
      if (high >= range[0] + shift && high <= range[1] + shift) {
        tempOk = true;
        break;
      }
    }
    if (!tempOk) return false;

    return true;
  }
  return false;
}

// ---- Memo (localStorage-backed per-spot notes) ----
function saveMemos() {
  localStorage.setItem("photoSpotMemos", JSON.stringify(memos));
}

function memoSection(spot) {
  const id = spot.id;
  const existing = memos[id] || "";
  const escaped = escapeHtml(existing);
  return `
    <div class="memo-wrap" data-spot="${id}">
      <textarea class="memo-input" placeholder="${escapeHtml(t("memo.placeholder"))}" rows="2" data-memo="${id}">${escaped}</textarea>
      <button class="memo-save-btn" type="button" data-memo-save="${id}">${escapeHtml(t("memo.save"))}</button>
    </div>
  `;
}

// ---- Season badge for cards ----
function seasonBadge(spot) {
  if (spot.seasonMonths.length === 0) return "";
  const inSeason = isSpotInSeasonNow(spot);
  return `<span class="season-badge ${inSeason ? "in-season" : ""}">${inSeason ? "今が見頃" : ""}</span>`;
}

function init() {
  applyStaticLanguage();
  el.totalCount.textContent = spots.length;
  el.avgScore.textContent = Math.round(spots.reduce((sum, spot) => sum + spot.score, 0) / spots.length);
  renderScoringModel();
  renderPhotoSites();
  syncControls();
  bindEvents();
  render();
  fetchWeather(); // Kick off weather fetch
}

init();

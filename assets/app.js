const DATA = window.PHOTO_SPOTS_DATA;
const PHOTO_META = window.PHOTO_SPOTS_PHOTOS || {};
const JAPAN_PHOTO_REFS = window.JAPAN_PHOTO_REFS || {};

const rawSpots = DATA.spots;

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
  ["アクセス", "交通分20", 20],
  ["画面力", "画面强度25", 25],
  ["題材密度", "题材密度15", 15],
  ["光", "光线季节稳定15", 15],
  ["混雑", "人流可控10", 10],
  ["機材適性", "器材适配10", 10],
  ["負担", "风险成本5", 5],
];

const photoSiteSummary = [
  { name: "GANREF", role: "撮影スポットDBと投稿作例", url: "https://ganref.jp/spot/photo/jpn/tokyo.html" },
  { name: "PHOTOHITO", role: "機材別作例と撮影地マップ", url: "https://photohito.com/map/" },
  { name: "東京カメラ部", role: "日本最大級の写真コミュニティ", url: "https://tokyocameraclub.com/about/" },
  { name: "cizucu", role: "新しい写真コミュニティ", url: "https://www.cizucu.com/" },
];

const columnDefaults = [
  { id: "saved", label: "保存", width: 74 },
  { id: "spot", label: "撮影地", width: 330 },
  { id: "pref", label: "都県", width: 100 },
  { id: "area", label: "エリア", width: 128 },
  { id: "type", label: "カテゴリ", width: 132 },
  { id: "traffic", label: "アクセス", width: 96 },
  { id: "time", label: "移動時間", width: 126 },
  { id: "season", label: "おすすめ時間", width: 150 },
  { id: "lens", label: "レンズ", width: 130 },
  { id: "score", label: "総合", width: 86 },
  { id: "niche", label: "穴場度", width: 86 },
  { id: "source", label: "参照", width: 150 },
];

const state = {
  search: "",
  grade: new Set(),
  pref: new Set(),
  type: new Set(),
  traffic: new Set(),
  time: new Set(),
  minScore: 0,
  savedOnly: false,
  sort: "score-desc",
  view: "cards",
};

const saved = new Set(JSON.parse(localStorage.getItem("photoSpotSaved") || "[]"));
let tableColumns = loadTableColumns();

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
  scoringModel: document.querySelector("#scoringModel"),
  gradeChart: document.querySelector("#gradeChart"),
  typeChart: document.querySelector("#typeChart"),
  bestSpot: document.querySelector("#bestSpot"),
  cards: document.querySelector("#cards"),
  tableWrap: document.querySelector("#tableWrap"),
  tableHead: document.querySelector("#tableHead"),
  tableBody: document.querySelector("#tableBody"),
};

const spots = rawSpots.map((spot) => ({
  ...spot,
  jpName: localizeSpotName(spot["地点"]),
  jpPref: localizePref(spot["都县"]),
  jpArea: localizeText(spot["区域"]),
  jpType: primaryType(spot["类型"]),
  jpTypeDetail: typeDetail(spot["类型"]),
  jpVisual: localizeText(spot["主要画面"]),
  jpSeason: localizeText(spot["最佳季节/时间"]),
  jpLens: localizeText(spot["建议镜头"]),
  jpTime: TIME_LABELS[spot["预计耗时"]] || localizeText(spot["预计耗时"]),
  jpTraffic: `${spot["交通级别"]}ランク`,
}));

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
    spot.jpName,
    spot.jpPref,
    spot.jpArea,
    spot.jpType,
    spot.jpTypeDetail,
    spot.jpVisual,
    spot.jpSeason,
    spot.jpLens,
    spot["地点"],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function metaForSpot(spot) {
  return PHOTO_META[String(spot.ID)] || {};
}

function japanRefsForSpot(spot) {
  return JAPAN_PHOTO_REFS[String(spot.ID)] || [];
}

function mapsUrlForSpot(spot) {
  const meta = metaForSpot(spot);
  if (meta.mapsUrl) return meta.mapsUrl;
  const query = encodeURIComponent([spot.jpName, spot.jpArea, spot.jpPref, "日本"].filter(Boolean).join(" "));
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
    .filter((spot) => matchesSet(state.grade, spot["候选等级"]))
    .filter((spot) => matchesSet(state.pref, spot.jpPref))
    .filter((spot) => matchesSet(state.type, spot.jpType))
    .filter((spot) => matchesSet(state.traffic, spot.jpTraffic))
    .filter((spot) => matchesSet(state.time, spot.jpTime))
    .filter((spot) => Number(spot["总分100"] || 0) >= state.minScore)
    .filter((spot) => !state.savedOnly || saved.has(String(spot.ID)))
    .sort(sorter(state.sort));
}

function sorter(mode) {
  const byScore = (a, b) => Number(b["总分100"]) - Number(a["总分100"]);
  const byName = (a, b) => String(a.jpName).localeCompare(String(b.jpName), "ja");
  if (mode === "score-asc") return (a, b) => Number(a["总分100"]) - Number(b["总分100"]);
  if (mode === "niche-desc") {
    return (a, b) => Number(b["小众/可发挥参考"] || 0) - Number(a["小众/可发挥参考"] || 0) || byScore(a, b);
  }
  if (mode === "traffic") {
    const rank = { A: 1, B: 2, C: 3 };
    return (a, b) => (rank[a["交通级别"]] || 9) - (rank[b["交通级别"]] || 9) || byScore(a, b);
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
  if (state.view === "cards") {
    el.cards.classList.remove("hidden");
    el.tableWrap.classList.add("hidden");
    renderCards(list);
  } else {
    el.cards.classList.add("hidden");
    el.tableWrap.classList.remove("hidden");
    renderTable(list);
  }
}

function photoFigure(spot, size = "card") {
  const meta = metaForSpot(spot);
  const primaryRef = japanRefsForSpot(spot)[0];
  const imgSrc = meta.localImageUrl || meta.imageUrl;
  const caption = imgSrc
    ? `${primaryRef ? `${primaryRef.name}優先 / ` : ""}${meta.photoSource || "写真"}`
    : primaryRef
      ? `${primaryRef.name}で作例確認`
      : "写真未設定";
  if (!imgSrc) {
    return `
      <figure class="${size === "best" ? "best-photo" : "spot-photo"} photo-empty">
        <div>
          <strong>${escapeHtml(spot.jpName)}</strong>
          <span>作例リンクから確認</span>
        </div>
        <figcaption>${escapeHtml(caption)}</figcaption>
      </figure>
    `;
  }
  return `
    <figure class="${size === "best" ? "best-photo" : "spot-photo"}">
      <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(spot.jpName)}の写真" loading="lazy" />
      <figcaption>${escapeHtml(caption)}</figcaption>
    </figure>
  `;
}

function renderCards(list) {
  if (!list.length) {
    el.cards.innerHTML = `<div class="panel empty">条件に合う撮影地がありません。</div>`;
    return;
  }
  el.cards.innerHTML = list.map(cardTemplate).join("");
}

function cardTemplate(spot) {
  const id = String(spot.ID);
  const grade = String(spot["候选等级"] || "").toLowerCase();
  return `
    <article class="spot-card">
      ${photoFigure(spot)}
      <div class="spot-head">
        <div class="spot-title">
          <h3>${escapeHtml(spot.jpName)}</h3>
          <p>${escapeHtml(spot.jpPref)} / ${escapeHtml(spot.jpArea)}</p>
        </div>
        <button class="save-btn ${saved.has(id) ? "saved" : ""}" type="button" data-save="${id}" title="保存" aria-label="保存">★</button>
      </div>
      <div class="score-line">
        <div class="score">${escapeHtml(spot["总分100"])}</div>
        <div class="score-track"><div class="score-fill" style="--score:${Number(spot["总分100"] || 0)}%"></div></div>
        <strong>${escapeHtml(spot["候选等级"])}</strong>
      </div>
      <div class="tag-row">
        <span class="tag grade-${grade}">${escapeHtml(spot["候选等级"])}ランク</span>
        <span class="tag">${escapeHtml(spot.jpTraffic)}</span>
        <span class="tag">${escapeHtml(spot.jpTime)}</span>
        <span class="tag">${escapeHtml(spot.jpType)}</span>
      </div>
      <p class="spot-desc">${escapeHtml(spot.jpVisual)}</p>
      <div class="meta-grid">
        <div><span>おすすめ</span>${escapeHtml(spot.jpSeason)}</div>
        <div><span>レンズ</span>${escapeHtml(spot.jpLens)}</div>
        <div><span>カテゴリ詳細</span>${escapeHtml(spot.jpTypeDetail)}</div>
        <div><span>穴場度</span>${escapeHtml(spot["小众/可发挥参考"] ?? "-")}</div>
      </div>
      <div class="score-breakdown">${scoreFields.map((field) => miniScore(spot, field)).join("")}</div>
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
    <a class="source-link map-link" href="${escapeHtml(mapsUrlForSpot(spot))}" target="_blank" rel="noreferrer">Google Maps</a>
    ${metaForSpot(spot).photoPage ? `<a class="source-link" href="${escapeHtml(metaForSpot(spot).photoPage)}" target="_blank" rel="noreferrer">写真元</a>` : ""}
  `;
}

function miniScore(spot, [label, key, max]) {
  const value = Number(spot[key] || 0);
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return `
    <div class="mini-score">
      <div>${label}<div class="mini-bar"><span style="--w:${pct}%"></span></div></div>
      <strong>${value}/${max}</strong>
    </div>
  `;
}

function renderTable(list) {
  renderTableHead();
  if (!list.length) {
    el.tableBody.innerHTML = `<tr><td colspan="${tableColumns.length}" class="empty">条件に合う撮影地がありません。</td></tr>`;
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
    saved: `<button class="save-btn ${saved.has(String(spot.ID)) ? "saved" : ""}" type="button" data-save="${spot.ID}" title="保存" aria-label="保存">★</button>`,
    spot: `<div class="table-spot">${
      imgSrc ? `<img src="${escapeHtml(imgSrc)}" alt="" loading="lazy" />` : `<span class="table-photo-empty">No photo</span>`
    }<div><strong>${escapeHtml(spot.jpName)}</strong><br><span class="muted">${escapeHtml(spot.jpVisual)}</span></div></div>`,
    pref: escapeHtml(spot.jpPref),
    area: escapeHtml(spot.jpArea),
    type: escapeHtml(spot.jpType),
    traffic: escapeHtml(spot.jpTraffic),
    time: escapeHtml(spot.jpTime),
    season: escapeHtml(spot.jpSeason),
    lens: escapeHtml(spot.jpLens),
    score: `<span class="score-cell">${escapeHtml(spot["总分100"])}</span>`,
    niche: escapeHtml(spot["小众/可发挥参考"] ?? "-"),
    source: `${japanRefsForSpot(spot)[0] ? `<a class="source-link" href="${escapeHtml(japanRefsForSpot(spot)[0].url)}" target="_blank" rel="noreferrer">${escapeHtml(japanRefsForSpot(spot)[0].name)}</a><br>` : ""}<a class="source-link" href="${escapeHtml(mapsUrlForSpot(spot))}" target="_blank" rel="noreferrer">地図</a>`,
  };
  return `<td style="width:${column.width}px;min-width:${column.width}px;max-width:${column.width}px">${cell[column.id] || ""}</td>`;
}

function renderTableHead() {
  el.tableHead.innerHTML = `<tr>${tableColumns
    .map(
      (column) => `
        <th draggable="true" data-column="${column.id}" style="width:${column.width}px;min-width:${column.width}px;max-width:${column.width}px">
          <span class="drag-handle">⋮⋮</span>${escapeHtml(column.label)}
          <span class="resize-handle" data-resize="${column.id}"></span>
        </th>
      `,
    )
    .join("")}</tr>`;
}

function renderCharts(list) {
  el.gradeChart.innerHTML = bars(countBy(list, (spot) => spot["候选等级"]), colorForGrade);
  el.typeChart.innerHTML = bars(countBy(list, (spot) => spot.jpType).slice(0, 8), (_, index) =>
    ["#147c86", "#315f9c", "#b9473f", "#b7791f"][index % 4],
  );
}

function countBy(list, getter) {
  const counts = new Map();
  list.forEach((spot) => {
    const value = getter(spot) || "未分類";
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function bars(entries, colorFn) {
  if (!entries.length) return `<p class="empty">データなし</p>`;
  const max = Math.max(...entries.map((entry) => entry[1]));
  return entries
    .map(([name, value], index) => {
      const width = max ? Math.round((value / max) * 100) : 0;
      return `
        <div class="bar-row">
          <span title="${escapeHtml(name)}">${escapeHtml(name)}</span>
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
    el.bestSpot.innerHTML = `<p class="empty">データなし</p>`;
    return;
  }
  el.bestSpot.innerHTML = `
    ${photoFigure(best, "best")}
    <h3>${escapeHtml(best.jpName)}</h3>
    <p class="spot-desc">${escapeHtml(best.jpVisual)}</p>
    <div class="score-line">
      <div class="score">${escapeHtml(best["总分100"])}</div>
      <div class="score-track"><div class="score-fill" style="--score:${Number(best["总分100"] || 0)}%"></div></div>
      <strong>${escapeHtml(best["候选等级"])}</strong>
    </div>
    <div class="tag-row">
      <span class="tag">${escapeHtml(best.jpPref)}</span>
      <span class="tag">${escapeHtml(best.jpType)}</span>
    </div>
    <div class="link-row">${linkButtons(best)}</div>
  `;
}

function renderScoringModel() {
  const labelMap = {
    "交通分": "アクセス",
    "画面强度": "画面力",
    "题材密度": "題材密度",
    "光线季节稳定": "光・季節安定",
    "人流可控": "混雑耐性",
    "器材适配": "機材適性",
    "风险成本": "リスク・コスト",
  };
  const scoringCopy = {
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
  };
  el.scoringModel.innerHTML = DATA.scoringModel
    .map(
      (row) => `
        <div class="score-rule">
          <strong><span>${escapeHtml(labelMap[row["字段"]] || localizeText(row["字段"]))}</span><span>${escapeHtml(row["满分"])}点</span></strong>
          <p>${escapeHtml(scoringCopy[row["字段"]]?.definition || localizeText(row["定义"]))}</p>
          <p>${escapeHtml(scoringCopy[row["字段"]]?.principle || localizeText(row["评分原则"]))}</p>
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
          <span>${escapeHtml(site.role)}</span>
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
          <span>${escapeHtml(value)}</span>
        </label>
      `,
    )
    .join("");
}

function syncFilters() {
  fillMultiFilter(el.gradeFilter, uniqueBy("候选等级"), state.grade);
  fillMultiFilter(el.prefFilter, uniqueBy("jpPref"), state.pref);
  fillMultiFilter(el.typeFilter, uniqueBy("jpType"), state.type);
  fillMultiFilter(el.trafficFilter, uniqueBy("jpTraffic"), state.traffic);
  fillMultiFilter(el.timeFilter, uniqueBy("jpTime"), state.time);
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
  el.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    render();
  });
  el.resetFilters.addEventListener("click", resetFilters);
  el.cardViewBtn.addEventListener("click", () => setView("cards"));
  el.tableViewBtn.addEventListener("click", () => setView("table"));
  document.addEventListener("click", (event) => {
    const saveButton = event.target.closest("[data-save]");
    if (saveButton) updateSaved(saveButton.dataset.save);
  });
  bindTableInteractions();
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
  render();
}

function init() {
  el.totalCount.textContent = spots.length;
  el.avgScore.textContent = Math.round(spots.reduce((sum, spot) => sum + Number(spot["总分100"] || 0), 0) / spots.length);
  renderScoringModel();
  renderPhotoSites();
  syncControls();
  bindEvents();
  render();
}

init();

const DATA = window.PHOTO_SPOTS_DATA;
const PHOTO_META = window.PHOTO_SPOTS_PHOTOS || {};
const JAPAN_PHOTO_REFS = window.JAPAN_PHOTO_REFS || {};
const spots = DATA.spots;
const scoreFields = [
  ["交通", "交通分20", 20],
  ["画面", "画面强度25", 25],
  ["题材", "题材密度15", 15],
  ["光线", "光线季节稳定15", 15],
  ["人流", "人流可控10", 10],
  ["器材", "器材适配10", 10],
  ["成本", "风险成本5", 5],
];

const state = {
  search: "",
  grade: "all",
  pref: "all",
  type: "all",
  traffic: "all",
  minScore: 0,
  savedOnly: false,
  sort: "score-desc",
  view: "cards",
};

const saved = new Set(JSON.parse(localStorage.getItem("photoSpotSaved") || "[]"));

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
  tableBody: document.querySelector("#tableBody"),
};

const photoSiteSummary = [
  {
    name: "GANREF",
    role: "日本No.1撮影スポットDB（3000+地点·30万枚）",
    url: "https://ganref.jp/spot/photo/jpn/tokyo.html",
  },
  {
    name: "PHOTOHITO",
    role: "価格.com運営·機材別作例検索が強力",
    url: "https://photohito.com/map/",
  },
  {
    name: "東京カメラ部",
    role: "日本最大級SNS写真コミュニティ（575万フォロワー）",
    url: "https://tokyocameraclub.com/about/",
  },
  {
    name: "cizucu",
    role: "新興写真コミュニティ·サークル機能で地域検索",
    url: "https://www.cizucu.com/",
  },
];

function uniqueValues(key) {
  return [...new Set(spots.map((spot) => spot[key]).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), "zh-Hans-CN"),
  );
}

function fillSelect(select, values, allLabel) {
  select.innerHTML = [
    `<option value="all">${allLabel}</option>`,
    ...values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`),
  ].join("");
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
    spot["地点"],
    spot["都县"],
    spot["区域"],
    spot["类型"],
    spot["主要画面"],
    spot["最佳季节/时间"],
    spot["建议镜头"],
    spot["备注"],
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
  const query = encodeURIComponent([spot["地点"], spot["区域"], spot["都县"], "日本"].filter(Boolean).join(" "));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function photoSearchUrlForSpot(spot) {
  const meta = metaForSpot(spot);
  if (meta.photoSearchUrl) return meta.photoSearchUrl;
  const query = encodeURIComponent([spot["地点"], spot["区域"], spot["都县"], "写真"].filter(Boolean).join(" "));
  return `https://www.google.com/search?tbm=isch&q=${query}`;
}

function photoFigure(spot, size = "card") {
  const meta = metaForSpot(spot);
  const primaryRef = japanRefsForSpot(spot)[0];
  const imgSrc = meta.localImageUrl || meta.imageUrl;
  const caption = imgSrc
    ? `${primaryRef ? `${primaryRef.name}优先参考 / ` : ""}${meta.photoSource || "公开图片"}${meta.license ? ` / ${meta.license}` : ""}`
    : primaryRef
      ? `${primaryRef.name}照片参考优先`
      : "暂无公开匹配照片";
  if (!imgSrc) {
    return `
      <figure class="${size === "best" ? "best-photo" : "spot-photo"} photo-empty">
        <div>
          <strong>${escapeHtml(spot["地点"])}</strong>
          <span>可打开照片搜索补充确认</span>
        </div>
        <figcaption>${caption}</figcaption>
      </figure>
    `;
  }
  return `
    <figure class="${size === "best" ? "best-photo" : "spot-photo"}">
      <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(spot["地点"])} 的公开照片" loading="lazy" />
      <figcaption>${escapeHtml(caption)}</figcaption>
    </figure>
  `;
}

function filteredSpots() {
  const query = state.search.trim().toLowerCase();
  return spots
    .filter((spot) => !query || textOf(spot).includes(query))
    .filter((spot) => state.grade === "all" || spot["候选等级"] === state.grade)
    .filter((spot) => state.pref === "all" || spot["都县"] === state.pref)
    .filter((spot) => state.type === "all" || spot["类型"] === state.type)
    .filter((spot) => state.traffic === "all" || spot["交通级别"] === state.traffic)
    .filter((spot) => Number(spot["总分100"] || 0) >= state.minScore)
    .filter((spot) => !state.savedOnly || saved.has(String(spot.ID)))
    .sort(sorter(state.sort));
}

function sorter(mode) {
  const byScore = (a, b) => Number(b["总分100"]) - Number(a["总分100"]);
  const byName = (a, b) => String(a["地点"]).localeCompare(String(b["地点"]), "zh-Hans-CN");
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

function renderCards(list) {
  if (!list.length) {
    el.cards.innerHTML = `<div class="panel empty">没有匹配的地点。调低分数或减少筛选条件试试。</div>`;
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
          <h3>${escapeHtml(spot["地点"])}</h3>
          <p>${escapeHtml(spot["都县"])} / ${escapeHtml(spot["区域"])}</p>
        </div>
        <button class="save-btn ${saved.has(id) ? "saved" : ""}" type="button" data-save="${id}" title="收藏" aria-label="收藏">★</button>
      </div>
      <div class="score-line">
        <div class="score">${escapeHtml(spot["总分100"])}</div>
        <div class="score-track"><div class="score-fill" style="--score:${Number(spot["总分100"] || 0)}%"></div></div>
        <strong>${escapeHtml(spot["候选等级"])}</strong>
      </div>
      <div class="tag-row">
        <span class="tag grade-${grade}">${escapeHtml(spot["候选等级"])} 级</span>
        <span class="tag">${escapeHtml(spot["交通级别"])} 交通</span>
        <span class="tag">${escapeHtml(spot["类型"])}</span>
      </div>
      <p class="spot-desc">${escapeHtml(spot["主要画面"])}</p>
      <div class="meta-grid">
        <div><span>最佳季节 / 时间</span>${escapeHtml(spot["最佳季节/时间"])}</div>
        <div><span>建议镜头</span>${escapeHtml(spot["建议镜头"])}</div>
        <div><span>预计耗时</span>${escapeHtml(spot["预计耗时"])}</div>
        <div><span>小众 / 可发挥</span>${escapeHtml(spot["小众/可发挥参考"] ?? "-")}</div>
      </div>
      <div class="score-breakdown">${scoreFields.map((field) => miniScore(spot, field)).join("")}</div>
      <div class="link-row">
        ${japanRefsForSpot(spot)
          .slice(0, 3)
          .map(
            (ref, index) =>
              `<a class="source-link ${index === 0 ? "primary-photo-link" : ""}" href="${escapeHtml(ref.url)}" target="_blank" rel="noreferrer">${escapeHtml(ref.name)}</a>`,
          )
          .join("")}
        <a class="source-link map-link" href="${escapeHtml(mapsUrlForSpot(spot))}" target="_blank" rel="noreferrer">Google Maps</a>
        ${metaForSpot(spot).photoPage ? `<a class="source-link" href="${escapeHtml(metaForSpot(spot).photoPage)}" target="_blank" rel="noreferrer">照片来源</a>` : ""}
        ${spot["来源URL"] ? `<a class="source-link" href="${escapeHtml(spot["来源URL"])}" target="_blank" rel="noreferrer">资料来源</a>` : ""}
      </div>
    </article>
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
  if (!list.length) {
    el.tableBody.innerHTML = `<tr><td colspan="11" class="empty">没有匹配的地点。</td></tr>`;
    return;
  }
  el.tableBody.innerHTML = list
    .map((spot) => {
      const id = String(spot.ID);
      const meta = metaForSpot(spot);
      return `
        <tr>
          <td><button class="save-btn ${saved.has(id) ? "saved" : ""}" type="button" data-save="${id}" title="收藏" aria-label="收藏">★</button></td>
          <td>
            <div class="table-spot">
              ${
                meta.imageUrl
                  ? `<img src="${escapeHtml(meta.imageUrl)}" alt="" loading="lazy" />`
                  : `<span class="table-photo-empty">No photo</span>`
              }
              <div><strong>${escapeHtml(spot["地点"])}</strong><br><span class="muted">${escapeHtml(spot["主要画面"])}</span></div>
            </div>
          </td>
          <td>${escapeHtml(spot["都县"])}</td>
          <td>${escapeHtml(spot["区域"])}</td>
          <td>${escapeHtml(spot["类型"])}</td>
          <td>${escapeHtml(spot["交通级别"])}</td>
          <td>${escapeHtml(spot["最佳季节/时间"])}</td>
          <td>${escapeHtml(spot["建议镜头"])}</td>
          <td class="score-cell">${escapeHtml(spot["总分100"])}</td>
          <td>${escapeHtml(spot["小众/可发挥参考"] ?? "-")}</td>
          <td>
            ${japanRefsForSpot(spot)[0] ? `<a class="source-link" href="${escapeHtml(japanRefsForSpot(spot)[0].url)}" target="_blank" rel="noreferrer">${escapeHtml(japanRefsForSpot(spot)[0].name)}</a><br>` : ""}
            <a class="source-link" href="${escapeHtml(mapsUrlForSpot(spot))}" target="_blank" rel="noreferrer">地图</a>
            <br>
            ${japanRefsForSpot(spot)[1] ? `<a class="source-link" href="${escapeHtml(japanRefsForSpot(spot)[1].url)}" target="_blank" rel="noreferrer">${escapeHtml(japanRefsForSpot(spot)[1].name)}</a>` : `<a class="source-link" href="${escapeHtml(photoSearchUrlForSpot(spot))}" target="_blank" rel="noreferrer">照片</a>`}
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderCharts(list) {
  el.gradeChart.innerHTML = bars(countBy(list, "候选等级"), colorForGrade);
  const typeCounts = countBy(list, "类型").slice(0, 8);
  el.typeChart.innerHTML = bars(typeCounts, (_, index) => ["#147c86", "#315f9c", "#b9473f", "#b7791f"][index % 4]);
}

function countBy(list, key) {
  const counts = new Map();
  list.forEach((spot) => counts.set(spot[key] || "未分类", (counts.get(spot[key] || "未分类") || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function bars(entries, colorFn) {
  if (!entries.length) return `<p class="empty">暂无数据</p>`;
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
    el.bestSpot.innerHTML = `<p class="empty">暂无结果</p>`;
    return;
  }
  el.bestSpot.innerHTML = `
    ${photoFigure(best, "best")}
    <h3>${escapeHtml(best["地点"])}</h3>
    <p class="spot-desc">${escapeHtml(best["主要画面"])}</p>
    <div class="score-line">
      <div class="score">${escapeHtml(best["总分100"])}</div>
      <div class="score-track"><div class="score-fill" style="--score:${Number(best["总分100"] || 0)}%"></div></div>
      <strong>${escapeHtml(best["候选等级"])}</strong>
    </div>
    <div class="tag-row">
      <span class="tag">${escapeHtml(best["都县"])}</span>
      <span class="tag">${escapeHtml(best["类型"])}</span>
    </div>
    <div class="link-row">
      ${japanRefsForSpot(best)
        .slice(0, 3)
        .map(
          (ref, index) =>
            `<a class="source-link ${index === 0 ? "primary-photo-link" : ""}" href="${escapeHtml(ref.url)}" target="_blank" rel="noreferrer">${escapeHtml(ref.name)}</a>`,
        )
        .join("")}
      <a class="source-link map-link" href="${escapeHtml(mapsUrlForSpot(best))}" target="_blank" rel="noreferrer">Google Maps</a>
    </div>
  `;
}

function renderScoringModel() {
  el.scoringModel.innerHTML = DATA.scoringModel
    .map(
      (row) => `
        <div class="score-rule">
          <strong><span>${escapeHtml(row["字段"])}</span><span>${escapeHtml(row["满分"])} 分</span></strong>
          <p>${escapeHtml(row["定义"])}</p>
          <p>${escapeHtml(row["评分原则"])}</p>
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
  Object.assign(state, {
    search: "",
    grade: "all",
    pref: "all",
    type: "all",
    traffic: "all",
    minScore: 0,
    savedOnly: false,
    sort: "score-desc",
  });
  syncControls();
  render();
}

function syncControls() {
  el.searchInput.value = state.search;
  el.gradeFilter.value = state.grade;
  el.prefFilter.value = state.pref;
  el.typeFilter.value = state.type;
  el.trafficFilter.value = state.traffic;
  el.minScore.value = state.minScore;
  el.minScoreValue.textContent = state.minScore;
  el.savedOnly.checked = state.savedOnly;
  el.sortSelect.value = state.sort;
}

function bindEvents() {
  el.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    render();
  });
  el.gradeFilter.addEventListener("change", (event) => {
    state.grade = event.target.value;
    render();
  });
  el.prefFilter.addEventListener("change", (event) => {
    state.pref = event.target.value;
    render();
  });
  el.typeFilter.addEventListener("change", (event) => {
    state.type = event.target.value;
    render();
  });
  el.trafficFilter.addEventListener("change", (event) => {
    state.traffic = event.target.value;
    render();
  });
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
}

function setView(view) {
  state.view = view;
  el.cardViewBtn.classList.toggle("active", view === "cards");
  el.tableViewBtn.classList.toggle("active", view === "table");
  render();
}

function init() {
  fillSelect(el.gradeFilter, uniqueValues("候选等级"), "全部等级");
  fillSelect(el.prefFilter, uniqueValues("都县"), "全部都县");
  fillSelect(el.typeFilter, uniqueValues("类型"), "全部类型");
  fillSelect(el.trafficFilter, uniqueValues("交通级别"), "全部交通");

  el.totalCount.textContent = spots.length;
  el.avgScore.textContent = Math.round(spots.reduce((sum, spot) => sum + Number(spot["总分100"] || 0), 0) / spots.length);

  renderScoringModel();
  renderPhotoSites();
  bindEvents();
  syncControls();
  render();
}

init();

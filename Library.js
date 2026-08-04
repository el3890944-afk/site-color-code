// library.js — логика страницы Library: галерея готовых палитр
// и библиотека именованных цветов (поиск, фильтр по категориям,
// сохранение в «Мои палитры» / «Сохранённые цвета»)

(function () {
  const $ = (id) => document.getElementById(id);

  const PALETTES_KEY = "cp-palettes";
  const SAVED_COLORS_KEY = "cp-saved-colors";

  /* ---------- Данные: категории ---------- */
  const LIBRARY_CATEGORIES = [
    { id: "all", key: "library_category_all" },
    { id: "nature", key: "library_category_nature" },
    { id: "pastel", key: "library_category_pastel" },
    { id: "vintage", key: "library_category_vintage" },
    { id: "neon", key: "library_category_neon" },
    { id: "monochrome", key: "library_category_monochrome" },
    { id: "seasonal", key: "library_category_seasonal" },
  ];

  function categoryKey(id) {
    const found = LIBRARY_CATEGORIES.find((c) => c.id === id);
    return found ? found.key : "library_category_all";
  }

  /* ---------- Данные: готовые палитры ---------- */
  const LIBRARY_PALETTES = [
    {
      id: "lib-desert-bloom",
      name: "Desert Bloom",
      category: "nature",
      colors: [
        { name: "Canyon Clay", hex: "#B5654A" },
        { name: "Sagebrush", hex: "#8A9B6E" },
        { name: "Dune Sand", hex: "#E8C79E" },
        { name: "Cactus", hex: "#5B7553" },
        { name: "Desert Sky", hex: "#F2A65A" },
      ],
    },
    {
      id: "lib-northern-lights",
      name: "Northern Lights",
      category: "neon",
      colors: [
        { name: "Aurora Green", hex: "#00F5A0" },
        { name: "Polar Cyan", hex: "#00D9F5" },
        { name: "Violet Sky", hex: "#7B2FF7" },
        { name: "Magnetic Pink", hex: "#F72585" },
        { name: "Glacier Mint", hex: "#06FFA5" },
      ],
    },
    {
      id: "lib-vintage-rose",
      name: "Vintage Rose",
      category: "vintage",
      colors: [
        { name: "Dusty Rose", hex: "#D8A7B1" },
        { name: "Antique Mauve", hex: "#A66E7C" },
        { name: "Faded Wine", hex: "#6D4C57" },
        { name: "Powder Blush", hex: "#F1D3D8" },
        { name: "Rosewood", hex: "#8C5B66" },
      ],
    },
    {
      id: "lib-cotton-candy",
      name: "Cotton Candy",
      category: "pastel",
      colors: [
        { name: "Bubblegum", hex: "#FFD1DC" },
        { name: "Sky Wisp", hex: "#C1E1EC" },
        { name: "Lilac Cloud", hex: "#E0BBE4" },
        { name: "Lemon Chiffon", hex: "#FFF5BA" },
        { name: "Mint Fluff", hex: "#B5EAD7" },
      ],
    },
    {
      id: "lib-midnight-ink",
      name: "Midnight Ink",
      category: "monochrome",
      colors: [
        { name: "Void", hex: "#0B0C10" },
        { name: "Slate Ink", hex: "#1F2833" },
        { name: "Teal Signal", hex: "#45A29E" },
        { name: "Cyan Flare", hex: "#66FCF1" },
        { name: "Fog Grey", hex: "#C5C6C7" },
      ],
    },
    {
      id: "lib-citrus-grove",
      name: "Citrus Grove",
      category: "nature",
      colors: [
        { name: "Lemon Zest", hex: "#FFC93C" },
        { name: "Tangerine", hex: "#FF9F1C" },
        { name: "Lime Peel", hex: "#CBEF43" },
        { name: "Jade Leaf", hex: "#2EC4B6" },
        { name: "Blood Orange", hex: "#FF6B35" },
      ],
    },
    {
      id: "lib-retro-wave",
      name: "Retro Wave",
      category: "neon",
      colors: [
        { name: "Synth Pink", hex: "#FF61D2" },
        { name: "Coral Glow", hex: "#FE9090" },
        { name: "Sunset Gold", hex: "#FFE29A" },
        { name: "Laser Cyan", hex: "#05DFD7" },
        { name: "Deep Purple", hex: "#3C1053" },
      ],
    },
    {
      id: "lib-sakura-bloom",
      name: "Sakura Bloom",
      category: "pastel",
      colors: [
        { name: "Cherry Blossom", hex: "#FFB7C5" },
        { name: "Petal Whisper", hex: "#FFDCE5" },
        { name: "Spring Pink", hex: "#FF8DA1" },
        { name: "Snow Petal", hex: "#FFF0F3" },
        { name: "Plum Bark", hex: "#C97B84" },
      ],
    },
    {
      id: "lib-autumn-harvest",
      name: "Autumn Harvest",
      category: "seasonal",
      colors: [
        { name: "Cinnamon Bark", hex: "#7B3F00" },
        { name: "Pumpkin Spice", hex: "#C1440E" },
        { name: "Golden Wheat", hex: "#E3A857" },
        { name: "Plum Berry", hex: "#A23B72" },
        { name: "Espresso", hex: "#4A2C2A" },
      ],
    },
    {
      id: "lib-arctic-frost",
      name: "Arctic Frost",
      category: "monochrome",
      colors: [
        { name: "Deep Polar", hex: "#0D1B2A" },
        { name: "Glacier Ink", hex: "#1B263B" },
        { name: "Steel Wave", hex: "#415A77" },
        { name: "Frosted Slate", hex: "#778DA9" },
        { name: "Snowdrift", hex: "#E0E1DD" },
      ],
    },
    {
      id: "lib-tropical-punch",
      name: "Tropical Punch",
      category: "neon",
      colors: [
        { name: "Punch Red", hex: "#FF0054" },
        { name: "Mango Flame", hex: "#FF5400" },
        { name: "Pineapple", hex: "#FFBD00" },
        { name: "Lagoon Blue", hex: "#00A5CF" },
        { name: "Palm Green", hex: "#25A18E" },
      ],
    },
    {
      id: "lib-espresso-cream",
      name: "Espresso & Cream",
      category: "vintage",
      colors: [
        { name: "Dark Roast", hex: "#3E2723" },
        { name: "Espresso Bean", hex: "#6D4C41" },
        { name: "Latte", hex: "#A1887F" },
        { name: "Milk Foam", hex: "#D7CCC8" },
        { name: "Cream", hex: "#EFEBE9" },
      ],
    },
  ];

  /* ---------- Состояние ---------- */
  let activeTab = "palettes";
  let searchQuery = "";
  let activeCategory = "all";
  let savedColorsCache = loadSavedColorsLib();

  /* ---------- Хранилище: сохранённые цвета (общее с Picker) ---------- */
  function loadSavedColorsLib() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVED_COLORS_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (err) {
      return [];
    }
  }

  function toggleSavedColor(hex) {
    const upper = hex.toUpperCase();
    let list = loadSavedColorsLib();
    const isSaved = list.includes(upper);
    list = isSaved ? list.filter((c) => c !== upper) : [upper, ...list];
    try {
      localStorage.setItem(SAVED_COLORS_KEY, JSON.stringify(list));
    } catch (err) {}
    savedColorsCache = list;
    window.dispatchEvent(new CustomEvent("cp:saved-colors-updated"));
    showToast(isSaved ? t("library_color_removed") : t("library_color_saved"));
    if (activeTab === "colors") renderColorGrid(filteredColors());
  }

  /* ---------- Хранилище: «Мои палитры» (общее со страницей Palette) ---------- */
  function saveToMyPalettes(paletteId) {
    const p = LIBRARY_PALETTES.find((x) => x.id === paletteId);
    if (!p) return;
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(PALETTES_KEY) || "[]");
      if (!Array.isArray(list)) list = [];
    } catch (err) {
      list = [];
    }
    list.unshift({
      id: "p" + Date.now().toString(36) + Math.floor(Math.random() * 1000),
      name: p.name,
      created: 0,
      fav: false,
      colors: p.colors.map((c) => ({ name: c.name, hex: c.hex })),
    });
    try {
      localStorage.setItem(PALETTES_KEY, JSON.stringify(list));
    } catch (err) {}
    window.dispatchEvent(new CustomEvent("cp:palettes-updated"));
    showToast(t("library_saved_toast"));
  }

  /* ---------- Копирование / уведомления (локальная копия, как в других страницах) ---------- */
  function showToast(msg) {
    const el = $("toast");
    if (!el) return;
    el.innerHTML = `${icon("check")} ${escapeHtml(String(msg))}`;
    el.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove("show"), 1800);
  }

  function copyText(text) {
    function fallbackCopy() {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (err) {
        ok = false;
      }
      document.body.removeChild(ta);
      return ok;
    }
    const onOk = () => showToast(t("toast_copied_prefix") + text);
    const onFail = () => showToast(t("toast_copy_failed") || "Copy failed");
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(onOk)
        .catch(() => {
          fallbackCopy() ? onOk() : onFail();
        });
    } else {
      fallbackCopy() ? onOk() : onFail();
    }
  }

  /* ---------- Вспомогательное ---------- */
  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }

  /* ---------- Фильтрация ---------- */
  function filteredPalettes() {
    const q = searchQuery.trim().toLowerCase();
    return LIBRARY_PALETTES.filter((p) => {
      const matchCat =
        activeCategory === "all" || p.category === activeCategory;
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.colors.some(
          (c) =>
            c.name.toLowerCase().includes(q) || c.hex.toLowerCase().includes(q),
        );
      return matchCat && matchQ;
    });
  }

  function filteredColors() {
    const q = searchQuery.trim().toLowerCase();
    if (typeof NAMED_COLORS === "undefined") return [];
    return NAMED_COLORS.filter(
      ([name, hex]) =>
        !q || name.toLowerCase().includes(q) || hex.toLowerCase().includes(q),
    );
  }

  /* ---------- Рендер: палитры ---------- */
  function renderPaletteGrid(list) {
    const grid = $("libraryPaletteGrid");
    grid.innerHTML = "";
    list.forEach((p) => {
      const strip = p.colors
        .map(
          (c) =>
            `<span style="background:${safeHex(c.hex)}" title="${escapeHtml(c.name)} ${safeHex(c.hex)}"></span>`,
        )
        .join("");
      const card = document.createElement("div");
      card.className = "library-card";
      card.innerHTML = `
        <div class="library-card-strip">${strip}</div>
        <div class="library-card-body">
          <div class="library-card-title-row">
            <h3>${escapeHtml(p.name)}</h3>
            <span class="library-tag">${t(categoryKey(p.category))}</span>
          </div>
          <p class="card-sub">${p.colors.length} ${t("palette_colors_word")}</p>
          <div class="library-card-actions">
            <button type="button" class="btn btn-ghost sm lib-copy-btn">${icon("copy")}<span>${t("library_copy_all")}</span></button>
            <button type="button" class="btn btn-ghost sm lib-save-btn">${icon("plus")}<span>${t("library_save_palette")}</span></button>
          </div>
        </div>`;
      card
        .querySelector(".lib-copy-btn")
        .addEventListener("click", () =>
          copyText(p.colors.map((c) => safeHex(c.hex)).join(", ")),
        );
      card
        .querySelector(".lib-save-btn")
        .addEventListener("click", () => saveToMyPalettes(p.id));
      grid.appendChild(card);
    });
  }

  /* ---------- Рендер: именованные цвета ---------- */
  function renderColorGrid(list) {
    const grid = $("libraryColorGrid");
    grid.innerHTML = "";
    list.forEach(([name, rawHex]) => {
      const hex = safeHex(rawHex);
      const isSaved = savedColorsCache.includes(hex.toUpperCase());
      const item = document.createElement("div");
      item.className = "library-color-item";
      item.innerHTML = `
        <div class="library-color-swatch" style="background:${hex}"></div>
        <div class="library-color-info">
          <b>${escapeHtml(name)}</b>
          <span>${hex}</span>
        </div>
        <button type="button" class="icon-btn sm library-color-save${isSaved ? " active" : ""}" title="${t("saved_colors")}">
          ${icon(isSaved ? "heartFilled" : "heart")}
        </button>`;
      item
        .querySelector(".library-color-swatch")
        .addEventListener("click", () => copyText(hex));
      item
        .querySelector(".library-color-info")
        .addEventListener("click", () => copyText(hex));
      item
        .querySelector(".library-color-save")
        .addEventListener("click", (e) => {
          e.stopPropagation();
          toggleSavedColor(hex);
        });
      grid.appendChild(item);
    });
  }

  /* ---------- Обновление активной панели ---------- */
  function refresh() {
    if (activeTab === "palettes") {
      const list = filteredPalettes();
      renderPaletteGrid(list);
      $("libraryPaletteEmpty").hidden = list.length !== 0;
      $("libraryCount").textContent =
        `${list.length} ${t("library_results_palettes")}`;
    } else {
      const list = filteredColors();
      renderColorGrid(list);
      $("libraryColorEmpty").hidden = list.length !== 0;
      $("libraryCount").textContent =
        `${list.length} ${t("library_results_colors")}`;
    }
  }

  /* ---------- Фильтр категорий ---------- */
  function populateCategoryFilter() {
    const sel = $("libraryCategoryFilter");
    const prev = sel.value || activeCategory;
    sel.innerHTML = "";
    LIBRARY_CATEGORIES.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = t(c.key);
      sel.appendChild(opt);
    });
    sel.value = prev;
  }

  /* ---------- Вкладки Palettes / Named Colors ---------- */
  function wireTabs() {
    document
      .querySelectorAll("#page-library .tab[data-ltab]")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          document
            .querySelectorAll("#page-library .tab[data-ltab]")
            .forEach((b) => b.classList.toggle("active", b === btn));
          activeTab = btn.dataset.ltab;
          $("libraryPalettesPanel").hidden = activeTab !== "palettes";
          $("libraryColorsPanel").hidden = activeTab !== "colors";
          $("libraryCategoryFilter").disabled = activeTab !== "palettes";
          refresh();
        });
      });
  }

  function wireSearch() {
    $("librarySearch").addEventListener("input", (e) => {
      searchQuery = e.target.value;
      refresh();
    });
    $("libraryCategoryFilter").addEventListener("change", (e) => {
      activeCategory = e.target.value;
      refresh();
    });
  }

  /* ---------- Обновление при смене языка ---------- */
  const langObserver = new MutationObserver(() => {
    populateCategoryFilter();
    refresh();
  });

  /* ---------- Инициализация ---------- */
  function init() {
    savedColorsCache = loadSavedColorsLib();
    populateCategoryFilter();
    wireTabs();
    wireSearch();
    refresh();
    langObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });
    window.addEventListener("cp:saved-colors-updated", () => {
      savedColorsCache = loadSavedColorsLib();
      if (activeTab === "colors") renderColorGrid(filteredColors());
    });
  }

  init();
})();

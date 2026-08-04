// resources.js — логика страницы Resources: разделы с материалами,
// цветовые системы, подборки палитр, помощь и поддержка, живой поиск.

(function () {
  const $ = (id) => document.getElementById(id);
  const page = $("page-resources");
  if (!page) return;

  /* ---------- Переход на другую страницу приложения ---------- */
  function goToPage(name) {
    const link = document.querySelector(`.topnav-link[data-page="${name}"]`);
    if (link) link.click();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openExternal(url) {
    window.open(url, "_blank", "noopener");
  }

  /* ---------- Разделы с материалами ---------- */
  const SECTIONS = [
    {
      id: "guides",
      icon: "book",
      titleKey: "res_guides_title",
      descKey: "res_guides_desc",
      moreKey: "res_view_all_guides",
      items: [
        {
          icon: "book",
          titleKey: "res_guide_theory",
          subKey: "res_guide_theory_sub",
          bodyKey: "res_guide_theory_body",
        },
        {
          icon: "accessibility",
          titleKey: "res_guide_a11y",
          subKey: "res_guide_a11y_sub",
          bodyKey: "res_guide_a11y_body",
        },
        {
          icon: "palette",
          titleKey: "res_guide_palettes",
          subKey: "res_guide_palettes_sub",
          bodyKey: "res_guide_palettes_body",
        },
        {
          icon: "gradient",
          titleKey: "res_guide_gradients",
          subKey: "res_guide_gradients_sub",
          bodyKey: "res_guide_gradients_body",
        },
      ],
    },
    {
      id: "tools",
      icon: "tools",
      titleKey: "res_tools_title",
      descKey: "res_tools_desc",
      moreKey: "res_view_all_tools",
      items: [
        {
          icon: "shuffle",
          titleKey: "res_tool_contrast",
          subKey: "res_tool_contrast_sub",
          badgeKey: "res_badge_new",
          go: () => goToPage("accessibility"),
        },
        {
          icon: "gradient",
          titleKey: "res_tool_gradient",
          subKey: "res_tool_gradient_sub",
          go: () => goToPage("converter"),
        },
        {
          icon: "info",
          titleKey: "res_tool_cvd",
          subKey: "res_tool_cvd_sub",
          go: () => goToPage("accessibility"),
        },
        {
          icon: "image",
          titleKey: "res_tool_extractor",
          subKey: "res_tool_extractor_sub",
          go: () =>
            window.dispatchEvent(new CustomEvent("cp:open-image-extractor")),
        },
      ],
    },
    {
      id: "assets",
      icon: "download",
      titleKey: "res_assets_title",
      descKey: "res_assets_desc",
      moreKey: "res_view_all_assets",
      items: [
        {
          icon: "layers",
          titleKey: "res_asset_templates",
          subKey: "res_asset_templates_sub",
          go: () => goToPage("library"),
        },
        {
          icon: "grid",
          titleKey: "res_asset_uikits",
          subKey: "res_asset_uikits_sub",
          bodyKey: "res_asset_uikits_body",
        },
        {
          icon: "gradient",
          titleKey: "res_asset_gradients",
          subKey: "res_asset_gradients_sub",
          go: () => goToPage("converter"),
        },
        {
          icon: "palette",
          titleKey: "res_asset_swatches",
          subKey: "res_asset_swatches_sub",
          go: () => exportSwatches(),
        },
      ],
    },
  ];

  /* ---------- Цветовые системы ---------- */
  const SYSTEMS = [
    {
      name: "Material Design",
      url: "https://m3.material.io/styles/color/system",
    },
    { name: "Tailwind CSS", url: "https://tailwindcss.com/docs/colors" },
    {
      name: "Chrome DevTools",
      url: "https://developer.chrome.com/docs/devtools/css",
    },
    { name: "WCAG 2.1", url: "https://www.w3.org/TR/WCAG21/" },
    {
      name: "Apple Human Interface",
      url: "https://developer.apple.com/design/human-interface-guidelines/color",
    },
    {
      name: "Fluent UI",
      url: "https://fluent2.microsoft.design/color",
    },
  ];

  /* ---------- Подборки палитр ---------- */
  const INSPIRATION = [
    {
      name: "Ocean Depths",
      colors: [
        "#0D1B2A",
        "#1B4965",
        "#2A6F97",
        "#3C8DAD",
        "#5FA8D3",
        "#8ECAE6",
        "#CAF0F8",
      ],
    },
    {
      name: "Sunset Vibes",
      colors: [
        "#7C2D12",
        "#B7410E",
        "#E2725B",
        "#F2A65A",
        "#F6C177",
        "#FBE0B3",
      ],
    },
    {
      name: "Forest Morning",
      colors: [
        "#14311F",
        "#1E5631",
        "#2E7D4F",
        "#4CAF6D",
        "#7FCB9B",
        "#A8DEBC",
        "#D6F0E0",
      ],
    },
    {
      name: "Neon Dreams",
      colors: [
        "#4C1D95",
        "#7B2FF7",
        "#A855F7",
        "#D946B0",
        "#F72585",
        "#FF7AC6",
      ],
    },
  ];

  /* ---------- Помощь и поддержка ---------- */
  const HELP = [
    {
      icon: "fileText",
      titleKey: "res_help_docs",
      subKey: "res_help_docs_sub",
      bodyKey: "res_help_docs_body",
    },
    {
      icon: "helpCircle",
      titleKey: "res_help_faq",
      subKey: "res_help_faq_sub",
      bodyKey: "res_help_faq_body",
    },
    {
      icon: "alert",
      titleKey: "res_help_issue",
      subKey: "res_help_issue_sub",
      bodyKey: "res_help_issue_body",
    },
    {
      icon: "bulb",
      titleKey: "res_help_feature",
      subKey: "res_help_feature_sub",
      bodyKey: "res_help_feature_body",
    },
  ];

  /* ---------- Тост (локально, как на других страницах) ---------- */
  function showToast(msg) {
    const el = $("toast");
    if (!el) return;
    el.innerHTML = `${icon("check")} ${escapeHtml(String(msg))}`;
    el.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove("show"), 1800);
  }

  /* ---------- Скачивание набора образцов ---------- */
  function exportSwatches() {
    const data = INSPIRATION.map((p) => ({ name: p.name, colors: p.colors }));
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "color-swatches.json";
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(t("toast_exported_json"));
  }

  /* ---------- Модальное окно ---------- */
  function openModal(titleKey, bodyKey) {
    $("resModalTitle").textContent = t(titleKey);
    $("resModalBody").textContent = t(bodyKey);
    $("resModal").hidden = false;
  }

  /* ---------- Отрисовка разделов ---------- */
  function renderSections() {
    const grid = $("resSections");
    grid.innerHTML = "";
    SECTIONS.forEach((section) => {
      const card = document.createElement("section");
      card.className = "card res-card";
      card.dataset.resCard = section.id;
      card.innerHTML = `
        <div class="res-card-head">
          <span class="res-tile">${ICONS[section.icon] || ""}</span>
          <div>
            <h2>${t(section.titleKey)}</h2>
            <p>${t(section.descKey)}</p>
          </div>
        </div>
        <div class="res-list"></div>
        <button type="button" class="res-more">
          <span>${t(section.moreKey)}</span>${icon("arrowRight")}
        </button>`;

      const list = card.querySelector(".res-list");
      section.items.forEach((item) => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "res-item";
        row.dataset.search = (
          t(item.titleKey) +
          " " +
          t(item.subKey)
        ).toLowerCase();
        row.innerHTML = `
          <span class="res-item-icon">${ICONS[item.icon] || ""}</span>
          <span class="res-item-text">
            <span class="res-item-title">${t(item.titleKey)}${
              item.badgeKey
                ? `<span class="res-badge">${t(item.badgeKey)}</span>`
                : ""
            }</span>
            <span class="res-item-sub">${t(item.subKey)}</span>
          </span>
          <span class="res-item-go">${ICONS.chevronRight}</span>`;
        row.addEventListener("click", () => {
          if (item.go) item.go();
          else openModal(item.titleKey, item.bodyKey);
        });
        list.appendChild(row);
      });

      card.querySelector(".res-more").addEventListener("click", () => {
        showToast(t("res_more_soon"));
      });
      grid.appendChild(card);
    });
  }

  /* ---------- Отрисовка нижнего ряда ---------- */
  function renderSystems() {
    const wrap = $("resSystems");
    wrap.innerHTML = "";
    SYSTEMS.forEach((s) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "res-chip";
      chip.textContent = s.name;
      chip.dataset.search = s.name.toLowerCase();
      chip.addEventListener("click", () => openExternal(s.url));
      wrap.appendChild(chip);
    });
  }

  function renderInspiration() {
    const wrap = $("resPalettes");
    wrap.innerHTML = "";
    INSPIRATION.forEach((p) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "res-palette";
      btn.dataset.search = p.name.toLowerCase();
      btn.innerHTML = `
        <span class="res-palette-strip">${p.colors
          .map((c) => `<span style="background:${c}"></span>`)
          .join("")}</span>
        <b>${escapeHtml(p.name)}</b>
        <span class="res-palette-count">${p.colors.length} ${t("palette_colors_word")}</span>`;
      btn.addEventListener("click", () => goToPage("library"));
      wrap.appendChild(btn);
    });
  }

  function renderHelp() {
    const wrap = $("resHelp");
    wrap.innerHTML = "";
    HELP.forEach((h) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "res-help-item";
      item.dataset.search = (t(h.titleKey) + " " + t(h.subKey)).toLowerCase();
      item.innerHTML = `
        <span class="res-item-icon">${ICONS[h.icon] || ""}</span>
        <span class="res-item-text">
          <span class="res-item-title">${t(h.titleKey)}</span>
          <span class="res-item-sub">${t(h.subKey)}</span>
        </span>
        <span class="res-item-go">${ICONS.externalLink}</span>`;
      item.addEventListener("click", () => openModal(h.titleKey, h.bodyKey));
      wrap.appendChild(item);
    });
  }

  /* ---------- Поиск ---------- */
  function applySearch(query) {
    const q = query.trim().toLowerCase();
    let visible = 0;

    page.querySelectorAll("[data-search]").forEach((el) => {
      const match = !q || el.dataset.search.includes(q);
      el.hidden = !match;
      if (match) visible += 1;
    });

    // Карточка скрывается, если в ней не осталось видимых элементов
    page.querySelectorAll("[data-res-card]").forEach((card) => {
      const has = [...card.querySelectorAll("[data-search]")].some(
        (el) => !el.hidden,
      );
      card.hidden = q ? !has : false;
      const more = card.querySelector(".res-more");
      if (more) more.hidden = Boolean(q);
    });

    $("resEmpty").hidden = visible > 0;
  }

  /* ---------- Инициализация ---------- */
  function renderAll() {
    renderSections();
    renderSystems();
    renderInspiration();
    renderHelp();
    applySearch($("resSearch").value);
  }

  const langObserver = new MutationObserver(renderAll);

  function init() {
    renderAll();
    $("resSearch").addEventListener("input", (e) =>
      applySearch(e.target.value),
    );

    page.querySelectorAll(".res-more[data-soon]").forEach((btn) => {
      btn.addEventListener("click", () => showToast(t("res_more_soon")));
    });
    $("resBrowsePalettes").addEventListener("click", () => goToPage("library"));

    const modal = $("resModal");
    $("resModalClose").addEventListener("click", () => {
      modal.hidden = true;
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.hidden = true;
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") modal.hidden = true;
    });

    langObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });
  }

  init();
})();

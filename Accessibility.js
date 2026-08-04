// accessibility.js — логика страницы Accessibility:
// проверка контраста по WCAG 2.1, симулятор дальтонизма,
// живое превью и подбор доступных альтернатив цвета.

(function () {
  const $ = (id) => document.getElementById(id);
  const page = $("page-accessibility");
  if (!page) return;

  const STATE_KEY = "cp-a11y";
  const PRESETS_KEY = "cp-a11y-presets";

  /* ---------- Пороги WCAG 2.1 ---------- */
  const CRITERIA = [
    { group: "AA", key: "a11y_normal_text", min: 4.5 },
    { group: "AA", key: "a11y_large_text", min: 3 },
    { group: "AAA", key: "a11y_normal_text", min: 7 },
    { group: "AAA", key: "a11y_large_text", min: 4.5 },
  ];

  /* ---------- Матрицы симуляции цветового зрения ---------- */
  const VISION_TYPES = [
    { id: "normal", key: "a11y_vision_normal", matrix: null },
    {
      id: "deuteranopia",
      key: "a11y_vision_deuteranopia",
      matrix: [
        [0.625, 0.375, 0],
        [0.7, 0.3, 0],
        [0, 0.3, 0.7],
      ],
    },
    {
      id: "protanopia",
      key: "a11y_vision_protanopia",
      matrix: [
        [0.567, 0.433, 0],
        [0.558, 0.442, 0],
        [0, 0.242, 0.758],
      ],
    },
    {
      id: "tritanopia",
      key: "a11y_vision_tritanopia",
      matrix: [
        [0.95, 0.05, 0],
        [0, 0.433, 0.567],
        [0, 0.475, 0.525],
      ],
    },
    {
      id: "monochromacy",
      key: "a11y_vision_monochromacy",
      matrix: [
        [0.299, 0.587, 0.114],
        [0.299, 0.587, 0.114],
        [0.299, 0.587, 0.114],
      ],
    },
  ];

  const DEFAULT_PRESETS = [
    { fg: "#F3F4F8", bg: "#10131F" },
    { fg: "#9F7F60", bg: "#2E1F14" },
    { fg: "#14161F", bg: "#FFFFFF" },
    { fg: "#E5E7EB", bg: "#374151" },
  ];

  /* ---------- Состояние ---------- */
  let state = { fg: "#9F7F60", bg: "#2E1F14", vision: "normal" };
  let presets = DEFAULT_PRESETS.slice();
  let suggestions = [];
  let suggestSeed = 0;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STATE_KEY) || "null");
      if (saved && normalizeHex(saved.fg) && normalizeHex(saved.bg)) {
        state = {
          fg: normalizeHex(saved.fg),
          bg: normalizeHex(saved.bg),
          vision: VISION_TYPES.some((v) => v.id === saved.vision)
            ? saved.vision
            : "normal",
        };
      }
      const p = JSON.parse(localStorage.getItem(PRESETS_KEY) || "null");
      if (Array.isArray(p) && p.length) presets = p;
    } catch (e) {
      /* повреждённые данные — используем значения по умолчанию */
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function savePresets() {
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    } catch (e) {}
  }

  /* ---------- Вспомогательные функции ---------- */
  function normalizeHex(value) {
    if (typeof value !== "string") return null;
    const hex = value.trim().replace(/^#/, "");
    if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    return "#" + full.toUpperCase();
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function ratioOf(fgHex, bgHex) {
    return contrastRatio(hexToRgb(fgHex), hexToRgb(bgHex));
  }

  function simulate(hex, typeId) {
    const type = VISION_TYPES.find((v) => v.id === typeId);
    if (!type || !type.matrix) return hex;
    const [r, g, b] = hexToRgb(hex);
    const m = type.matrix;
    const out = m.map((row) =>
      clamp(Math.round(row[0] * r + row[1] * g + row[2] * b), 0, 255),
    );
    return rgbToHex(out[0], out[1], out[2]);
  }

  /* ---------- Тост и копирование (локально, как в library.js) ---------- */
  function showToast(msg) {
    const el = $("toast");
    if (!el) return;
    el.innerHTML = `${icon("check")} ${escapeHtml(String(msg))}`;
    el.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove("show"), 1800);
  }

  function copyText(text) {
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (e) {
        ok = false;
      }
      document.body.removeChild(ta);
      return ok;
    };
    const onOk = () => showToast(t("toast_copied_prefix") + text);
    const onFail = () => showToast(t("toast_copy_failed") || "Copy failed");

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(onOk, () => {
        fallback() ? onOk() : onFail();
      });
    } else {
      fallback() ? onOk() : onFail();
    }
  }

  /* ---------- Отрисовка: поля выбора цвета ---------- */
  function renderInputs() {
    $("a11yTextPicker").value = state.fg;
    $("a11yBgPicker").value = state.bg;
    $("a11yTextSwatch").style.background = state.fg;
    $("a11yBgSwatch").style.background = state.bg;
    if (document.activeElement !== $("a11yTextHex"))
      $("a11yTextHex").value = state.fg;
    if (document.activeElement !== $("a11yBgHex"))
      $("a11yBgHex").value = state.bg;
    $("a11yTextHex").classList.remove("invalid");
    $("a11yBgHex").classList.remove("invalid");
  }

  function renderPresets() {
    const wrap = $("a11yPresets");
    wrap.innerHTML = "";
    presets.forEach((p, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "a11y-preset";
      btn.textContent = "Aa";
      btn.style.color = p.fg;
      btn.style.background = p.bg;
      btn.title = `${p.fg} / ${p.bg}`;
      if (p.fg === state.fg && p.bg === state.bg) btn.classList.add("active");
      btn.addEventListener("click", () => {
        state.fg = p.fg;
        state.bg = p.bg;
        onColorsChanged();
      });
      btn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (presets.length <= 1) return;
        presets.splice(i, 1);
        savePresets();
        renderPresets();
        showToast(t("a11y_preset_removed"));
      });
      wrap.appendChild(btn);
    });

    const add = document.createElement("button");
    add.type = "button";
    add.className = "a11y-preset a11y-preset-add";
    add.innerHTML = icon("plus");
    add.title = t("a11y_add_preset");
    add.setAttribute("aria-label", t("a11y_add_preset"));
    add.addEventListener("click", () => {
      if (presets.some((p) => p.fg === state.fg && p.bg === state.bg)) {
        showToast(t("a11y_preset_exists"));
        return;
      }
      presets.push({ fg: state.fg, bg: state.bg });
      savePresets();
      renderPresets();
      showToast(t("a11y_preset_added"));
    });
    wrap.appendChild(add);
  }

  /* ---------- Отрисовка: результаты ---------- */
  function renderResults() {
    const ratio = ratioOf(state.fg, state.bg);
    const box = $("a11yRatioBox");
    box.classList.remove("level-warn", "level-fail");
    if (ratio < 3) box.classList.add("level-fail");
    else if (ratio < 4.5) box.classList.add("level-warn");

    $("a11yRatio").textContent = ratio.toFixed(2) + ":1";
    $("a11yRatioStatus").innerHTML =
      icon(ratio >= 4.5 ? "check" : "info") +
      `<span>${
        ratio >= 7
          ? t("a11y_status_excellent")
          : ratio >= 4.5
            ? t("a11y_status_good")
            : ratio >= 3
              ? t("a11y_status_limited")
              : t("a11y_status_poor")
      }</span>`;

    ["AA", "AAA"].forEach((group) => {
      const list = $("a11yCriteria" + group);
      list.innerHTML = "";
      CRITERIA.filter((c) => c.group === group).forEach((c) => {
        const pass = ratio >= c.min;
        const row = document.createElement("div");
        row.className = "a11y-criterion";
        row.innerHTML = `
          <span>${t(c.key)} (${c.min}:1)</span>
          <span class="a11y-verdict ${pass ? "pass" : "fail"}">
            ${icon(pass ? "check" : "info")}
            <span>${pass ? t("a11y_pass") : t("a11y_fail")}</span>
          </span>`;
        list.appendChild(row);
      });
    });

    $("a11yMeaningText").textContent =
      ratio >= 7
        ? t("a11y_meaning_aaa")
        : ratio >= 4.5
          ? t("a11y_meaning_aa")
          : ratio >= 3
            ? t("a11y_meaning_large_only")
            : t("a11y_meaning_fail");

    renderReport(ratio);
  }

  function renderReport(ratio) {
    const rows = [
      [t("a11y_report_text"), state.fg],
      [t("a11y_report_bg"), state.bg],
      [t("a11y_report_ratio"), ratio.toFixed(2) + ":1"],
      [
        t("a11y_report_lum_text"),
        relativeLuminance(...hexToRgb(state.fg)).toFixed(4),
      ],
      [
        t("a11y_report_lum_bg"),
        relativeLuminance(...hexToRgb(state.bg)).toFixed(4),
      ],
      [
        t("a11y_report_best"),
        ratio >= 7
          ? "AAA"
          : ratio >= 4.5
            ? "AA"
            : ratio >= 3
              ? "AA Large"
              : "—",
      ],
    ];
    $("a11yReportRows").innerHTML = rows
      .map(
        ([k, v]) =>
          `<div class="a11y-report-row"><span>${k}</span><span>${v}</span></div>`,
      )
      .join("");
    $("a11yReportCopy").innerHTML =
      icon("copy") + `<span>${t("a11y_copy_report")}</span>`;
    $("a11yReportCopy").onclick = () =>
      copyText(rows.map(([k, v]) => `${k}: ${v}`).join("\n"));
  }

  /* ---------- Отрисовка: симулятор ---------- */
  function renderVisionList() {
    const list = $("a11yVisionList");
    list.innerHTML = "";
    VISION_TYPES.forEach((v) => {
      const row = document.createElement("div");
      row.className =
        "a11y-vision-row" + (v.id === state.vision ? " active" : "");
      const fg = simulate(state.fg, v.id);
      const bg = simulate(state.bg, v.id);
      row.innerHTML = `
        <label class="a11y-vision-label">
          <input type="radio" name="a11yVision" value="${v.id}"${
            v.id === state.vision ? " checked" : ""
          } />
          <span>${t(v.key)}</span>
        </label>
        <div class="a11y-vision-sample" style="color:${fg};background:${bg}" aria-hidden="true">Aa</div>`;
      row.querySelector("input").addEventListener("change", () => {
        state.vision = v.id;
        saveState();
        renderVisionList();
        renderPreview();
      });
      list.appendChild(row);
    });
  }

  /* ---------- Отрисовка: превью ---------- */
  function renderPreview() {
    const fg = simulate(state.fg, state.vision);
    const bg = simulate(state.bg, state.vision);
    const box = $("a11yPreviewBox");
    box.style.color = fg;
    box.style.background = bg;
    $("a11yPreviewCaption").textContent =
      state.vision === "normal"
        ? t("a11y_preview_caption")
        : t("a11y_preview_caption_sim") + " " + t(visionKey(state.vision));
  }

  function visionKey(id) {
    const v = VISION_TYPES.find((x) => x.id === id);
    return v ? v.key : "a11y_vision_normal";
  }

  /* ---------- Подбор доступных цветов ---------- */
  function buildSuggestions() {
    const [h0, s0, l0] = rgbToHsl(...hexToRgb(state.fg));
    const bgRgb = hexToRgb(state.bg);
    const seen = new Set([state.fg]);
    const out = [];

    const hueSteps = [0, -12, 12, -24, 24, -36, 36, -48, 48];
    const satSteps = [0, -14, 14, -28];

    // Для каждого варианта оттенка ищем два цвета: минимально отличающийся
    // от исходного (уровень AA) и ближайший, дотягивающий до AAA.
    hueSteps.forEach((dh) => {
      satSteps.forEach((ds) => {
        const h = (h0 + dh + suggestSeed * 7 + 360) % 360;
        const s = clamp(s0 + ds + (suggestSeed % 2 ? 6 : 0), 5, 100);
        let bestAA = null,
          bestAAA = null;
        for (let l = 2; l <= 98; l += 1) {
          const rgb = hslToRgb(h, s, l);
          const r = contrastRatio(rgb, bgRgb);
          if (r < 4.5) continue;
          const dist = Math.abs(l - l0) + Math.abs(dh) * 0.25;
          const cand = { dist, hex: rgbToHex(...rgb), ratio: r };
          if (!bestAA || dist < bestAA.dist) bestAA = cand;
          if (r >= 7 && (!bestAAA || dist < bestAAA.dist)) bestAAA = cand;
        }
        [bestAA, bestAAA].forEach((c) => {
          if (c && !seen.has(c.hex)) {
            seen.add(c.hex);
            out.push(c);
          }
        });
      });
    });

    out.sort((a, b) => a.dist - b.dist);
    suggestions = out.slice(0, 12);
  }

  function renderSuggestions() {
    const scroll = $("a11ySuggestScroll");
    scroll.innerHTML = "";
    if (!suggestions.length) {
      scroll.innerHTML = `<p class="empty-hint">${t("a11y_no_suggestions")}</p>`;
      return;
    }
    suggestions.forEach((s) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "a11y-suggest-card";
      const grade = s.ratio >= 7 ? "AAA" : "AA";
      card.innerHTML = `
        <div class="a11y-suggest-swatch" style="background:${s.hex}"></div>
        <span class="a11y-suggest-hex">${s.hex}</span>
        <span class="a11y-suggest-ratio">${s.ratio.toFixed(2)}:1</span>
        <span class="a11y-suggest-grade${grade === "AA" ? " aa" : ""}">${grade}</span>`;
      card.title = t("a11y_apply_suggestion");
      card.addEventListener("click", () => {
        state.fg = s.hex;
        onColorsChanged();
        showToast(t("a11y_suggestion_applied"));
      });
      scroll.appendChild(card);
    });
  }

  /* ---------- Общий пересчёт ---------- */
  function onColorsChanged() {
    saveState();
    renderInputs();
    renderPresets();
    renderResults();
    renderVisionList();
    renderPreview();
    buildSuggestions();
    renderSuggestions();
  }

  /* ---------- Обработчики ---------- */
  function wireColorFields() {
    const bind = (pickerId, hexId, prop) => {
      $(pickerId).addEventListener("input", (e) => {
        state[prop] = normalizeHex(e.target.value) || state[prop];
        onColorsChanged();
      });
      const commit = (e) => {
        const hex = normalizeHex(e.target.value);
        if (!hex) {
          e.target.classList.add("invalid");
          return;
        }
        state[prop] = hex;
        onColorsChanged();
      };
      $(hexId).addEventListener("change", commit);
      $(hexId).addEventListener("keydown", (e) => {
        if (e.key === "Enter") commit(e);
      });
    };
    bind("a11yTextPicker", "a11yTextHex", "fg");
    bind("a11yBgPicker", "a11yBgHex", "bg");

    $("a11yTextCopy").addEventListener("click", () => copyText(state.fg));
    $("a11yBgCopy").addEventListener("click", () => copyText(state.bg));

    $("a11ySwap").addEventListener("click", () => {
      const fg = state.fg;
      state.fg = state.bg;
      state.bg = fg;
      onColorsChanged();
    });
  }

  function wireReport() {
    const btn = $("a11yReportToggle");
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      $("a11yReport").hidden = open;
    });
  }

  function wireSuggestions() {
    $("a11ySuggestPrev").addEventListener("click", () =>
      $("a11ySuggestScroll").scrollBy({ left: -220 }),
    );
    $("a11ySuggestNext").addEventListener("click", () =>
      $("a11ySuggestScroll").scrollBy({ left: 220 }),
    );
    $("a11yGenerateMore").addEventListener("click", () => {
      suggestSeed += 1;
      buildSuggestions();
      renderSuggestions();
    });
  }

  function wireModal() {
    const modal = $("a11yModal");
    $("a11yHowBtn").addEventListener("click", () => {
      modal.hidden = false;
    });
    $("a11yModalClose").addEventListener("click", () => {
      modal.hidden = true;
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.hidden = true;
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") modal.hidden = true;
    });
  }

  /* ---------- Обновление при смене языка ---------- */
  const langObserver = new MutationObserver(() => {
    renderPresets();
    renderResults();
    renderVisionList();
    renderPreview();
    renderSuggestions();
  });

  /* ---------- Инициализация ---------- */
  function init() {
    loadState();
    wireColorFields();
    wireReport();
    wireSuggestions();
    wireModal();
    onColorsChanged();
    langObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });
    // Цвет, выбранный на других страницах, можно подхватить как цвет текста
    window.addEventListener("cp:color-selected", (e) => {
      const hex = normalizeHex(e.detail && e.detail.hex);
      if (hex) {
        state.fg = hex;
        onColorsChanged();
      }
    });
  }

  init();
})();

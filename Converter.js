// converter.js — логика страницы "Color Converter"
// Полностью самодостаточен (свои функции конвертации цвета),
// чтобы ничего не менять в script.js / страницe Picker.

(function () {
  const $ = (id) => document.getElementById(id);
  const page = $("page-converter");
  if (!page) return;

  /* ---------- Конвертация цвета ---------- */
  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function hexToRgb(hex) {
    let h = hex.replace("#", "").trim();
    if (h.length === 3)
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) return null;
    const num = parseInt(h, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  function rgbToHex(r, g, b) {
    const to2 = (v) =>
      clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
    return ("#" + to2(r) + to2(g) + to2(b)).toUpperCase();
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h = 0,
      s = 0;
    const l = (max + min) / 2;
    const d = max - min;
    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      switch (max) {
        case r:
          h = ((g - b) / d) % 6;
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        default:
          h = (r - g) / d + 4;
      }
      h *= 60;
      if (h < 0) h += 360;
    }
    return [h, s * 100, l * 100];
  }

  function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r1 = 0,
      g1 = 0,
      b1 = 0;
    if (h < 60) [r1, g1, b1] = [c, x, 0];
    else if (h < 120) [r1, g1, b1] = [x, c, 0];
    else if (h < 180) [r1, g1, b1] = [0, c, x];
    else if (h < 240) [r1, g1, b1] = [0, x, c];
    else if (h < 300) [r1, g1, b1] = [x, 0, c];
    else [r1, g1, b1] = [c, 0, x];
    return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
  }

  function rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      switch (max) {
        case r:
          h = ((g - b) / d) % 6;
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        default:
          h = (r - g) / d + 4;
      }
      h *= 60;
      if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : d / max;
    return [h, s * 100, max * 100];
  }

  function hsvToRgb(h, s, v) {
    s /= 100;
    v /= 100;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r1 = 0,
      g1 = 0,
      b1 = 0;
    if (h < 60) [r1, g1, b1] = [c, x, 0];
    else if (h < 120) [r1, g1, b1] = [x, c, 0];
    else if (h < 180) [r1, g1, b1] = [0, c, x];
    else if (h < 240) [r1, g1, b1] = [0, x, c];
    else if (h < 300) [r1, g1, b1] = [x, 0, c];
    else [r1, g1, b1] = [c, 0, x];
    return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
  }

  function rgbToCmyk(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const k = 1 - Math.max(r, g, b);
    if (k >= 1) return [0, 0, 0, 100];
    const c = (1 - r - k) / (1 - k);
    const m = (1 - g - k) / (1 - k);
    const y = (1 - b - k) / (1 - k);
    return [c * 100, m * 100, y * 100, k * 100];
  }

  function srgbToLinear(c) {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function rgbToXyz(r, g, b) {
    const rl = srgbToLinear(r),
      gl = srgbToLinear(g),
      bl = srgbToLinear(b);
    const x = rl * 0.4124 + gl * 0.3576 + bl * 0.1805;
    const y = rl * 0.2126 + gl * 0.7152 + bl * 0.0722;
    const z = rl * 0.0193 + gl * 0.1192 + bl * 0.9505;
    return [x * 100, y * 100, z * 100];
  }

  function xyzToLab(x, y, z) {
    const refX = 95.047,
      refY = 100.0,
      refZ = 108.883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const fx = f(x / refX),
      fy = f(y / refY),
      fz = f(z / refZ);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  function rgbToLab(r, g, b) {
    const [x, y, z] = rgbToXyz(r, g, b);
    return xyzToLab(x, y, z);
  }

  function labToLch(L, a, b) {
    const C = Math.sqrt(a * a + b * b);
    let H = (Math.atan2(b, a) * 180) / Math.PI;
    if (H < 0) H += 360;
    return [L, C, H];
  }

  function rgbToOklch(r, g, b) {
    const rl = srgbToLinear(r),
      gl = srgbToLinear(g),
      bl = srgbToLinear(b);
    const l = Math.cbrt(
      0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl,
    );
    const m = Math.cbrt(
      0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl,
    );
    const s = Math.cbrt(
      0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl,
    );
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    const C = Math.sqrt(A * A + B * B);
    let H = (Math.atan2(B, A) * 180) / Math.PI;
    if (H < 0) H += 360;
    return [L, C, H];
  }

  function nearestWebSafe(r, g, b) {
    const step = (v) => Math.round(v / 51) * 51;
    return rgbToHex(step(r), step(g), step(b));
  }

  function relLuminance(r, g, b) {
    const c = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
  }

  function contrastRatio(rgb1, rgb2) {
    const L1 = relLuminance(...rgb1),
      L2 = relLuminance(...rgb2);
    const light = Math.max(L1, L2),
      dark = Math.min(L1, L2);
    return (light + 0.05) / (dark + 0.05);
  }

  /* ---------- Ближайшее название цвета ---------- */
  const NAMED_COLORS = [
    ["Black", "#000000"],
    ["White", "#FFFFFF"],
    ["Gray", "#808080"],
    ["Silver", "#C0C0C0"],
    ["Red", "#FF0000"],
    ["Crimson", "#DC143C"],
    ["Maroon", "#800000"],
    ["Orange", "#FFA500"],
    ["Coral", "#FF7F50"],
    ["Tomato", "#FF6347"],
    ["Gold", "#FFD700"],
    ["Yellow", "#FFFF00"],
    ["Khaki", "#F0E68C"],
    ["Olive", "#808000"],
    ["Lime", "#00FF00"],
    ["Green", "#008000"],
    ["Forest Green", "#228B22"],
    ["Teal", "#008080"],
    ["Turquoise", "#40E0D0"],
    ["Cyan", "#00FFFF"],
    ["Sky Blue", "#87CEEB"],
    ["Dodger Blue", "#1E90FF"],
    ["Steel Blue", "#4682B4"],
    ["Blue", "#0000FF"],
    ["Navy", "#000080"],
    ["Indigo", "#4B0082"],
    ["Purple", "#800080"],
    ["Violet", "#8A2BE2"],
    ["Orchid", "#DA70D6"],
    ["Magenta", "#FF00FF"],
    ["Pink", "#FFC0CB"],
    ["Hot Pink", "#FF69B4"],
    ["Salmon", "#FA8072"],
    ["Brown", "#A52A2A"],
    ["Chocolate", "#D2691E"],
    ["Tan", "#D2B48C"],
    ["Beige", "#F5F5DC"],
    ["Ivory", "#FFFFF0"],
    ["Slate Gray", "#708090"],
    ["Dark Gray", "#3C3C3C"],
    ["Charcoal", "#36454F"],
    ["Amber", "#FFBF00"],
    ["Emerald", "#50C878"],
    ["Mint", "#98FF98"],
    ["Lavender", "#E6E6FA"],
    ["Plum", "#DDA0DD"],
    ["Rose", "#FF007F"],
    ["Peach", "#FFDAB9"],
    ["Mustard", "#FFDB58"],
    ["Denim", "#1560BD"],
    ["Cobalt", "#0047AB"],
  ];
  function nearestColorName(r, g, b) {
    let best = null,
      bestDist = Infinity;
    for (const [name, hex] of NAMED_COLORS) {
      const [nr, ng, nb] = hexToRgb(hex);
      const dist = (r - nr) ** 2 + (g - ng) ** 2 + (b - nb) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = name;
      }
    }
    return best;
  }

  /* ---------- Состояние ---------- */
  let hue = 204.07,
    sat = 76.26,
    val = 85.88; // HSV, соответствует #3498DB
  let prevHex = "#3498DB";

  function currentRgb() {
    return hsvToRgb(hue, sat, val).map((v) => clamp(Math.round(v), 0, 255));
  }

  function setFromRgb(r, g, b) {
    [hue, sat, val] = rgbToHsv(r, g, b);
    render();
  }

  function setFromHex(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return false;
    setFromRgb(...rgb);
    return true;
  }

  /* ---------- Квадрат Saturation/Value ---------- */
  const square = $("convSquare");
  const sctx = square.getContext("2d");
  const marker = $("convMarker");

  function drawSquare() {
    const w = square.width,
      h = square.height;
    sctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    sctx.fillRect(0, 0, w, h);
    const wg = sctx.createLinearGradient(0, 0, w, 0);
    wg.addColorStop(0, "#fff");
    wg.addColorStop(1, "rgba(255,255,255,0)");
    sctx.fillStyle = wg;
    sctx.fillRect(0, 0, w, h);
    const bg = sctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "rgba(0,0,0,0)");
    bg.addColorStop(1, "#000");
    sctx.fillStyle = bg;
    sctx.fillRect(0, 0, w, h);
  }

  function updateMarker() {
    marker.style.left = sat + "%";
    marker.style.top = 100 - val + "%";
  }

  let draggingSquare = false;
  function squareFromEvent(e) {
    const rect = square.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((clientY - rect.top) / rect.height, 0, 1);
    sat = x * 100;
    val = (1 - y) * 100;
    render();
  }
  square.addEventListener("mousedown", (e) => {
    draggingSquare = true;
    squareFromEvent(e);
  });
  window.addEventListener("mousemove", (e) => {
    if (draggingSquare) squareFromEvent(e);
  });
  window.addEventListener("mouseup", () => (draggingSquare = false));
  square.addEventListener("touchstart", (e) => {
    draggingSquare = true;
    squareFromEvent(e);
  });
  square.addEventListener(
    "touchmove",
    (e) => {
      if (draggingSquare) {
        squareFromEvent(e);
        e.preventDefault();
      }
    },
    { passive: false },
  );
  square.addEventListener("touchend", () => (draggingSquare = false));

  /* ---------- Ползунок Hue ---------- */
  const hueTrack = $("convHueTrack");
  const hueThumb = $("convHueThumb");
  let draggingHue = false;
  function hueFromEvent(e) {
    const rect = hueTrack.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    hue = x * 360;
    render();
  }
  hueTrack.addEventListener("mousedown", (e) => {
    draggingHue = true;
    hueFromEvent(e);
  });
  window.addEventListener("mousemove", (e) => {
    if (draggingHue) hueFromEvent(e);
  });
  window.addEventListener("mouseup", () => (draggingHue = false));
  hueTrack.addEventListener("touchstart", (e) => {
    draggingHue = true;
    hueFromEvent(e);
  });
  hueTrack.addEventListener(
    "touchmove",
    (e) => {
      if (draggingHue) {
        hueFromEvent(e);
        e.preventDefault();
      }
    },
    { passive: false },
  );
  hueTrack.addEventListener("touchend", () => (draggingHue = false));

  /* ---------- Быстрые цвета ---------- */
  const QUICK_COLORS = [
    "#E74C3C",
    "#E67E22",
    "#F1C40F",
    "#2ECC71",
    "#1ABC9C",
    "#3498DB",
    "#9B59B6",
    "#E91E8C",
    "#8B5E3C",
    "#C99A6C",
    "#FFFFFF",
    "#B0B3BA",
    "#4A6079",
    "#2C3E50",
    "#4A4A4A",
    "#000000",
  ];
  function renderQuickColors() {
    const wrap = $("convQuickColors");
    wrap.innerHTML = QUICK_COLORS.map(
      (hex) =>
        `<span class="swatch-item" style="background:${hex}" data-hex="${hex}" title="${hex}"></span>`,
    ).join("");
    wrap.querySelectorAll(".swatch-item").forEach((el) => {
      el.addEventListener("click", () => setFromHex(el.dataset.hex));
    });
  }

  /* ---------- Формат-карточки ---------- */
  const FORMATS = [
    { key: "hex", label: "HEX" },
    { key: "rgb", label: "RGB" },
    { key: "hsl", label: "HSL" },
    { key: "hsv", label: "HSV" },
    { key: "cmyk", label: "CMYK" },
    { key: "lab", label: "LAB" },
    { key: "lch", label: "LCH" },
    { key: "oklch", label: "OKLCH" },
    { key: "xyz", label: "XYZ" },
  ];
  function buildFormatGrid() {
    const grid = $("convFormatGrid");
    grid.innerHTML = FORMATS.map(
      (f) => `
      <div class="format-card" id="card-${f.key}">
        <label class="format-card-head">
          <input type="checkbox" class="format-check" id="fmt-${f.key}" checked />
          <span>${f.label}</span>
        </label>
        <div class="format-value-row">
          <span class="format-value" id="val-${f.key}"></span>
          <button class="copy-btn xs" id="copy-${f.key}" title="Copy">${icon("copy")}</button>
        </div>
      </div>`,
    ).join("");
    FORMATS.forEach((f) => {
      $(`fmt-${f.key}`).addEventListener("change", () => {
        $(`card-${f.key}`).classList.toggle(
          "disabled",
          !$(`fmt-${f.key}`).checked,
        );
      });
      $(`copy-${f.key}`).addEventListener("click", () =>
        copyText($(`val-${f.key}`).textContent),
      );
    });
  }

  /* ---------- Гармонии ---------- */
  const HARMONY_DEFS = [
    {
      key: "complementary",
      i18n: "harmony_complementary",
      label: "Complementary",
      offsets: [0, 180],
    },
    {
      key: "analogous",
      i18n: "harmony_analogous",
      label: "Analogous",
      offsets: [-30, 0, 30],
    },
    {
      key: "triadic",
      i18n: "harmony_triadic",
      label: "Triadic",
      offsets: [0, 120, 240],
    },
    {
      key: "tetradic",
      i18n: "harmony_tetradic",
      label: "Tetradic",
      offsets: [0, 90, 180, 270],
    },
  ];
  function buildHarmonyList() {
    const list = $("convHarmonyList");
    let html = "";
    for (const def of HARMONY_DEFS) {
      html += `<div class="harmony-list-row" data-harmony="${def.key}">
        <span class="harmony-list-label" data-i18n="${def.i18n}">${def.label}</span>
        <div class="harmony-chips" id="chips-${def.key}"></div>
      </div>`;
    }
    html += `<div class="harmony-list-row" data-harmony="monochromatic">
      <span class="harmony-list-label" data-i18n="harmony_monochromatic">Monochromatic</span>
      <div class="harmony-chips" id="chips-monochromatic"></div>
    </div>`;
    list.innerHTML = html;
    if (typeof applyI18n === "function") applyI18n();
  }

  function chipsHtml(hexes) {
    return hexes
      .map(
        (hex) =>
          `<span class="harmony-chip" data-hex="${hex}" title="${hex}">
            <span class="harmony-chip-swatch" style="background:${hex}"></span>
          </span>`,
      )
      .join("");
  }

  function renderHarmonies(h, s, l) {
    for (const def of HARMONY_DEFS) {
      const hexes = def.offsets.map((off) => {
        const hh = (h + off + 360) % 360;
        return rgbToHex(...hslToRgb(hh, s, l));
      });
      $(`chips-${def.key}`).innerHTML = chipsHtml(hexes);
    }
    const monoSteps = [20, 35, 50, 65, 80, 92];
    const monoHexes = monoSteps.map((ll) => rgbToHex(...hslToRgb(h, s, ll)));
    $("chips-monochromatic").innerHTML = chipsHtml(monoHexes);
    list_bindChipClicks();
  }
  function list_bindChipClicks() {
    document.querySelectorAll(".harmony-chip[data-hex]").forEach((el) => {
      el.onclick = () => setFromHex(el.dataset.hex);
    });
  }

  /* ---------- Toast / копирование ---------- */
  function showToast(msg) {
    const t = $("toast");
    t.innerHTML = `${icon("check")} ${escapeHtml(String(msg))}`;
    t.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => t.classList.remove("show"), 1800);
  }
  function copyText(text) {
    const prefix =
      typeof t === "function" ? t("toast_copied_prefix") : "Copied: ";
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
      } catch (e) {
        ok = false;
      }
      document.body.removeChild(ta);
      return ok;
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast(prefix + text))
        .catch(() => fallbackCopy() && showToast(prefix + text));
    } else if (fallbackCopy()) {
      showToast(prefix + text);
    }
  }

  /* ---------- Рендер ---------- */
  function render() {
    hue = ((hue % 360) + 360) % 360;
    sat = clamp(sat, 0, 100);
    val = clamp(val, 0, 100);

    const [r, g, b] = currentRgb();
    const hex = rgbToHex(r, g, b);
    const [hl, sl, ll] = rgbToHsl(r, g, b);
    const [hv, sv, vv] = rgbToHsv(r, g, b);
    const [c, m, y, k] = rgbToCmyk(r, g, b);
    const [L, a, bb] = rgbToLab(r, g, b);
    const [, C, H] = labToLch(L, a, bb);
    const [oL, oC, oH] = rgbToOklch(r, g, b);
    const [X, Y, Z] = rgbToXyz(r, g, b);
    const webSafe = nearestWebSafe(r, g, b);

    drawSquare();
    updateMarker();
    hueThumb.style.left = (hue / 360) * 100 + "%";

    const hexInput = $("convHexInput");
    if (document.activeElement !== hexInput) hexInput.value = hex;

    const values = {
      hex,
      rgb: `rgb(${r}, ${g}, ${b})`,
      hsl: `hsl(${Math.round(hl)}, ${Math.round(sl)}%, ${Math.round(ll)}%)`,
      hsv: `hsv(${Math.round(hv)}, ${Math.round(sv)}%, ${Math.round(vv)}%)`,
      cmyk: `cmyk(${Math.round(c)}%, ${Math.round(m)}%, ${Math.round(y)}%, ${Math.round(k)}%)`,
      lab: `lab(${L.toFixed(2)}, ${a.toFixed(2)}, ${bb.toFixed(2)})`,
      lch: `lch(${L.toFixed(2)}, ${C.toFixed(2)}, ${H.toFixed(2)})`,
      oklch: `oklch(${oL.toFixed(3)}, ${oC.toFixed(3)}, ${oH.toFixed(2)})`,
      xyz: `xyz(${X.toFixed(2)}, ${Y.toFixed(2)}, ${Z.toFixed(2)})`,
    };
    for (const key in values) {
      const el = $(`val-${key}`);
      if (el) el.textContent = values[key];
    }
    $("val-websafe").textContent = webSafe;
    $("copy-websafe").dataset.copyRaw = webSafe;
    $("copy-websafe").onclick = () => copyText(webSafe);

    // Превью
    $("convPreviewBox").style.background = hex;
    $("convPreviewHex").textContent = hex;
    $("convColorName").textContent = nearestColorName(r, g, b);
    const brightness = Math.round(
      ((r * 299 + g * 587 + b * 114) / 1000 / 255) * 100,
    );
    $("convBrightness").textContent = brightness + "%";
    $("convContrastWhite").textContent =
      contrastRatio([r, g, b], [255, 255, 255]).toFixed(2) + " : 1";
    $("convContrastBlack").textContent =
      contrastRatio([r, g, b], [0, 0, 0]).toFixed(2) + " : 1";
    // Текст превью тёмный/светлый в зависимости от фона
    $("convPreviewBox").style.color = brightness > 60 ? "#14161f" : "#fff";

    renderHarmonies(hl, sl, ll);
  }

  /* ---------- Ввод HEX ---------- */
  const hexInputEl = $("convHexInput");
  hexInputEl.addEventListener("input", () => {
    const v = hexInputEl.value.trim();
    if (/^#?[0-9a-fA-F]{6}$/.test(v))
      setFromHex(v.startsWith("#") ? v : "#" + v);
  });
  hexInputEl.addEventListener("blur", () => {
    hexInputEl.value = rgbToHex(...currentRgb());
  });

  /* ---------- Пипетка ---------- */
  $("convEyedropper").addEventListener("click", async () => {
    if (!("EyeDropper" in window)) {
      showToast("Eyedropper not supported in this browser");
      return;
    }
    try {
      const ed = new EyeDropper();
      const result = await ed.open();
      setFromHex(result.sRGBHex);
    } catch (e) {
      /* отменено пользователем */
    }
  });

  /* ---------- Swap Colors ---------- */
  $("convSwapBtn").addEventListener("click", () => {
    const current = rgbToHex(...currentRgb());
    setFromHex(prevHex);
    prevHex = current;
  });

  /* ---------- Upload Image (средний цвет) ---------- */
  $("convUploadBtn").addEventListener("click", () =>
    $("convUploadInput").click(),
  );
  $("convUploadInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      const size = 64;
      c.width = size;
      c.height = size;
      const cctx = c.getContext("2d");
      cctx.drawImage(img, 0, 0, size, size);
      const data = cctx.getImageData(0, 0, size, size).data;
      let r = 0,
        g = 0,
        b = 0,
        n = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        n++;
      }
      setFromRgb(r / n, g / n, b / n);
      showToast(
        typeof t === "function"
          ? t("toast_color_read")
          : "Color read from image",
      );
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
    e.target.value = "";
  });

  /* ---------- Экспорт ---------- */
  function toggleMenu(menu) {
    menu.classList.toggle("open");
  }
  $("convExportBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu($("convExportMenu"));
  });
  $("convExportMenu").addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", () =>
    $("convExportMenu").classList.remove("open"),
  );

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  document
    .querySelectorAll("#convExportMenu [data-conv-export]")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const [r, g, b] = currentRgb();
        const hex = rgbToHex(r, g, b);
        $("convExportMenu").classList.remove("open");
        if (btn.dataset.convExport === "css") {
          copyText(`--color: ${hex};`);
        } else if (btn.dataset.convExport === "json") {
          const payload = {};
          FORMATS.forEach(
            (f) => (payload[f.key] = $(`val-${f.key}`).textContent),
          );
          payload.websafe = $("val-websafe").textContent;
          downloadFile(
            "color.json",
            JSON.stringify(payload, null, 2),
            "application/json",
          );
          showToast(
            typeof t === "function"
              ? t("toast_exported_json")
              : "JSON downloaded",
          );
        }
      });
    });

  /* ---------- Инициализация ---------- */
  buildFormatGrid();
  buildHarmonyList();
  renderQuickColors();
  render();
})();

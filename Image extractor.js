// image-extractor.js — страница Image Color Extractor:
// загрузка изображения, извлечение доминирующих цветов методом
// медианного сечения (median cut), маркеры на фото, детали цвета.

(function () {
  const $ = (id) => document.getElementById(id);
  const page = $("page-image");
  if (!page) return;

  const SAVED_KEY = "cp-saved-colors";
  const TARGET_COLORS = 12;
  const SAMPLE_MAX_DIM = 160;
  const MARKER_MIN_DIST = 0.045; // доля ширины/высоты — порог склейки соседних маркеров

  /* ---------- Состояние ---------- */
  let currentFile = null;
  let palette = []; // [{r,g,b,population,px,py}]
  let sortMode = "vibrance";
  let selected = null; // ссылка на объект из palette
  let sampleInfo = null; // {totalColors}

  /* ---------- Тост (как на остальных страницах) ---------- */
  function showToast(msg) {
    const el = $("toast");
    if (!el) return;
    el.innerHTML = `${icon("check")} ${escapeHtml(String(msg))}`;
    el.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove("show"), 1800);
  }

  function copyText(text, label) {
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
    const onOk = () =>
      showToast((t("toast_copied_prefix") || "") + (label || text));
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(onOk, () => fallback() && onOk());
    } else {
      fallback();
      onOk();
    }
  }

  /* ==================================================================
     Извлечение палитры: медианное сечение (median cut) по пикселям
     уменьшенной копии изображения, с сохранением координат образца
     для размещения маркеров на фото.
     ================================================================== */

  function quantizeMedianCut(pixels, targetCount) {
    function makeBox(px) {
      let rmin = 255,
        rmax = 0,
        gmin = 255,
        gmax = 0,
        bmin = 255,
        bmax = 0;
      for (let i = 0; i < px.length; i++) {
        const p = px[i];
        if (p[0] < rmin) rmin = p[0];
        if (p[0] > rmax) rmax = p[0];
        if (p[1] < gmin) gmin = p[1];
        if (p[1] > gmax) gmax = p[1];
        if (p[2] < bmin) bmin = p[2];
        if (p[2] > bmax) bmax = p[2];
      }
      return { px, rmin, rmax, gmin, gmax, bmin, bmax };
    }

    function splitBox(box) {
      const rr = box.rmax - box.rmin,
        gr = box.gmax - box.gmin,
        br = box.bmax - box.bmin;
      let ch = 0;
      if (gr >= rr && gr >= br) ch = 1;
      else if (br >= rr && br >= gr) ch = 2;
      box.px.sort((a, b) => a[ch] - b[ch]);
      const mid = box.px.length >> 1;
      return [makeBox(box.px.slice(0, mid)), makeBox(box.px.slice(mid))];
    }

    let boxes = [makeBox(pixels)];
    while (boxes.length < targetCount) {
      let idx = -1,
        best = -1;
      for (let i = 0; i < boxes.length; i++) {
        if (boxes[i].px.length > 1 && boxes[i].px.length > best) {
          best = boxes[i].px.length;
          idx = i;
        }
      }
      if (idx === -1) break;
      const [a, b] = splitBox(boxes[idx]);
      boxes.splice(idx, 1, a, b);
    }

    return boxes.map((box) => {
      let r = 0,
        g = 0,
        b = 0;
      for (let i = 0; i < box.px.length; i++) {
        r += box.px[i][0];
        g += box.px[i][1];
        b += box.px[i][2];
      }
      const n = box.px.length;
      const avg = [r / n, g / n, b / n];
      let rep = box.px[0],
        bestD = Infinity;
      for (let i = 0; i < box.px.length; i++) {
        const p = box.px[i];
        const d =
          (p[0] - avg[0]) ** 2 + (p[1] - avg[1]) ** 2 + (p[2] - avg[2]) ** 2;
        if (d < bestD) {
          bestD = d;
          rep = p;
        }
      }
      return {
        r: Math.round(avg[0]),
        g: Math.round(avg[1]),
        b: Math.round(avg[2]),
        population: n,
        repX: rep[3],
        repY: rep[4],
      };
    });
  }

  function extractPalette(imgEl) {
    const scale = Math.min(
      1,
      SAMPLE_MAX_DIM / Math.max(imgEl.naturalWidth, imgEl.naturalHeight),
    );
    const w = Math.max(1, Math.round(imgEl.naturalWidth * scale));
    const h = Math.max(1, Math.round(imgEl.naturalHeight * scale));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(imgEl, 0, 0, w, h);

    let data;
    try {
      data = ctx.getImageData(0, 0, w, h).data;
    } catch (e) {
      // изображение с чужого домена (CORS) — считать пиксели нельзя
      return null;
    }

    const pixels = [];
    const seen = new Set();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (data[i + 3] < 128) continue;
        const r = data[i],
          g = data[i + 1],
          b = data[i + 2];
        pixels.push([r, g, b, x, y]);
        seen.add(((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4));
      }
    }
    if (!pixels.length) return { palette: [], totalColors: 0 };

    const boxes = quantizeMedianCut(pixels, TARGET_COLORS);
    const pal = boxes.map((bx) => ({
      r: bx.r,
      g: bx.g,
      b: bx.b,
      population: bx.population,
      px: bx.repX / w,
      py: bx.repY / h,
    }));
    return { palette: pal, totalColors: seen.size };
  }

  /* ---------- Сортировка ---------- */
  function sortedPalette() {
    const arr = palette.slice();
    arr.sort((a, b) => {
      const ha = rgbToHsl(a.r, a.g, a.b);
      const hb = rgbToHsl(b.r, b.g, b.b);
      switch (sortMode) {
        case "dominance":
          return b.population - a.population;
        case "lightness":
          return hb[2] - ha[2];
        case "hue":
          return ha[0] - hb[0];
        case "vibrance":
        default:
          return hb[1] - ha[1];
      }
    });
    return arr;
  }

  /* ---------- Форматирование ---------- */
  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function formatName(mime) {
    const map = {
      "image/jpeg": "JPG",
      "image/jpg": "JPG",
      "image/png": "PNG",
      "image/webp": "WEBP",
      "image/gif": "GIF",
      "image/svg+xml": "SVG",
      "image/bmp": "BMP",
      "image/avif": "AVIF",
    };
    if (map[mime]) return map[mime];
    const sub = (mime || "").split("/")[1];
    return sub ? sub.toUpperCase() : "—";
  }

  /* ---------- Сброс / состояние «нет изображения» ---------- */
  function resetState() {
    currentFile = null;
    palette = [];
    selected = null;
    sampleInfo = null;

    $("imgxDrop").hidden = false;
    $("imgxPreviewWrap").hidden = true;
    $("imgxFileMeta").hidden = true;
    $("imgxUploadAgain").hidden = true;
    $("imgxInfo").hidden = true;

    $("imgxEmptyState").hidden = false;
    $("imgxCanvasWrap").hidden = true;
    $("imgxHeadControls").hidden = true;
    $("imgxStrip").innerHTML = "";
    $("imgxStripCaption").hidden = true;
    $("imgxExtractedSub").textContent = t("imgx_panel2_sub_empty");

    $("imgxDetailEmpty").hidden = false;
    $("imgxDetailBody").hidden = true;
  }

  /* ---------- Загрузка файла ---------- */
  function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      showToast(t("imgx_invalid_file"));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast(t("imgx_file_too_large"));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      currentFile = file;

      $("imgxDrop").hidden = true;
      $("imgxPreviewWrap").hidden = false;
      $("imgxPreviewImg").src = url;
      $("imgxDisplayImg").src = url;

      $("imgxFileMeta").hidden = false;
      $("imgxFileName").textContent = file.name;
      $("imgxFileSub").textContent =
        `${img.naturalWidth} × ${img.naturalHeight} px • ${formatBytes(file.size)}`;

      $("imgxUploadAgain").hidden = false;
      $("imgxInfo").hidden = false;
      $("imgxInfoFormat").textContent = formatName(file.type);
      $("imgxInfoDimensions").textContent =
        `${img.naturalWidth} × ${img.naturalHeight} px`;
      $("imgxInfoSize").textContent = formatBytes(file.size);
      $("imgxInfoSpace").textContent = "sRGB";

      const result = extractPalette(img);
      if (!result || !result.palette.length) {
        showToast(t("imgx_extract_failed"));
        $("imgxInfoTotal").textContent = "—";
        return;
      }
      palette = result.palette;
      sampleInfo = { totalColors: result.totalColors };
      $("imgxInfoTotal").textContent =
        result.totalColors.toLocaleString() + " " + t("imgx_optimized");

      $("imgxEmptyState").hidden = true;
      $("imgxCanvasWrap").hidden = false;
      $("imgxHeadControls").hidden = false;
      $("imgxCountChip").textContent =
        palette.length + " " + t("imgx_colors_word");
      $("imgxExtractedSub").textContent = t("imgx_panel2_sub").replace(
        "{n}",
        palette.length,
      );
      $("imgxStripCaption").hidden = false;

      selected = null;
      renderPalette();
      const first = sortedPalette()[0];
      if (first) selectColor(first);
    };
    img.onerror = () => {
      showToast(t("imgx_invalid_file"));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  /* ---------- Отрисовка маркеров и полосы образцов ---------- */
  function renderPalette() {
    const list = sortedPalette();

    // Маркеры на фото — с подавлением слишком близких друг к другу точек
    const markersWrap = $("imgxMarkers");
    markersWrap.innerHTML = "";
    const placed = [];
    list.forEach((c) => {
      const tooClose = placed.some(
        (p) => Math.hypot(p.px - c.px, p.py - c.py) < MARKER_MIN_DIST,
      );
      if (tooClose) return;
      placed.push(c);
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "imgx-marker" + (c === selected ? " active" : "");
      dot.style.left = c.px * 100 + "%";
      dot.style.top = c.py * 100 + "%";
      dot.style.background = rgbToHex(c.r, c.g, c.b);
      dot.title = rgbToHex(c.r, c.g, c.b);
      dot.dataset.markerFor = list.indexOf(c);
      dot.addEventListener("click", () => selectColor(c));
      markersWrap.appendChild(dot);
    });

    // Полоса образцов, пронумерованная по текущей сортировке
    const strip = $("imgxStrip");
    strip.innerHTML = "";
    list.forEach((c, i) => {
      const hex = rgbToHex(c.r, c.g, c.b);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "imgx-swatch" + (c === selected ? " active" : "");
      btn.innerHTML = `
        <span class="imgx-swatch-color" style="background:${hex}"></span>
        <span class="imgx-swatch-index">${i + 1}</span>`;
      btn.title = hex;
      btn.addEventListener("click", () => selectColor(c));
      strip.appendChild(btn);
    });
  }

  /* ---------- Выбор цвета и панель деталей ---------- */
  const FORMATS = [
    { key: "hex", label: "HEX", fn: (r, g, b) => rgbToHex(r, g, b) },
    { key: "rgb", label: "RGB", fn: (r, g, b) => `rgb(${r}, ${g}, ${b})` },
    {
      key: "hsl",
      label: "HSL",
      fn: (r, g, b) => {
        const [h, s, l] = rgbToHsl(r, g, b);
        return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
      },
    },
    {
      key: "hsv",
      label: "HSV/HSB",
      fn: (r, g, b) => {
        const [h, s, v] = rgbToHsv(r, g, b);
        return `hsv(${Math.round(h)}°, ${Math.round(s)}%, ${Math.round(v)}%)`;
      },
    },
    {
      key: "cmyk",
      label: "CMYK",
      fn: (r, g, b) => {
        const [c, m, y, k] = rgbToCmyk(r, g, b);
        return `cmyk(${Math.round(c)}%, ${Math.round(m)}%, ${Math.round(y)}%, ${Math.round(k)}%)`;
      },
    },
    {
      key: "lab",
      label: "LAB",
      fn: (r, g, b) => {
        const [L, a, bb] = rgbToLab(r, g, b);
        return `lab(${L.toFixed(2)}, ${a.toFixed(2)}, ${bb.toFixed(2)})`;
      },
    },
    {
      key: "lch",
      label: "LCH",
      fn: (r, g, b) => {
        const [L, C, H] = rgbToLch(r, g, b);
        return `lch(${L.toFixed(2)}, ${C.toFixed(2)}, ${H.toFixed(2)})`;
      },
    },
    {
      key: "oklch",
      label: "OKLCH",
      fn: (r, g, b) => {
        const [L, C, H] = rgbToOklch(r, g, b);
        return `oklch(${(L * 100).toFixed(2)}, ${C.toFixed(3)}, ${H.toFixed(2)})`;
      },
    },
  ];

  function renderFormatRows(r, g, b) {
    const wrap = $("imgxFormatRows");
    wrap.innerHTML = "";
    FORMATS.forEach((f) => {
      const value = f.fn(r, g, b);
      const row = document.createElement("div");
      row.className = "imgx-format-row";
      row.innerHTML = `
        <label>${f.label}</label>
        <div class="imgx-format-field">
          <input type="text" readonly value="${value}" />
          <button type="button" class="imgx-format-copy" data-icon="copy" aria-label="Copy ${f.label}"></button>
        </div>`;
      row.querySelector("button").innerHTML = icon("copy");
      row
        .querySelector("button")
        .addEventListener("click", () =>
          copyText(value, f.label + " " + value),
        );
      wrap.appendChild(row);
    });
  }

  function selectColor(c) {
    selected = c;
    const list = sortedPalette();
    const rank = list.indexOf(c) + 1;
    const hex = rgbToHex(c.r, c.g, c.b);

    $("imgxDetailEmpty").hidden = true;
    $("imgxDetailBody").hidden = false;
    $("imgxDetailSwatch").style.background = hex;
    $("imgxDetailName").textContent = t("imgx_color_label") + " " + rank;
    $("imgxDetailHex").textContent = hex;
    $("imgxDetailRgb").textContent = `RGB(${c.r}, ${c.g}, ${c.b})`;
    $("imgxDetailCopy").onclick = () => copyText(hex, hex);

    renderFormatRows(c.r, c.g, c.b);
    updateSavedButton(hex);

    renderPalette();
  }

  /* ---------- Сохранённые цвета (общее хранилище со всем приложением) ---------- */
  function loadSaved() {
    try {
      const arr = JSON.parse(localStorage.getItem(SAVED_KEY));
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }
  function persistSaved(list) {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  function renderSavedMenu() {
    const list = loadSaved();
    const wrap = $("imgxSavedList");
    const empty = $("imgxSavedEmpty");
    $("imgxSavedCount").textContent = list.length;
    wrap.innerHTML = "";
    if (!list.length) {
      wrap.style.display = "none";
      empty.style.display = "block";
      return;
    }
    wrap.style.display = "flex";
    empty.style.display = "none";
    list.forEach((hex) => {
      const item = document.createElement("div");
      item.className = "saved-swatch-item";
      const sw = document.createElement("div");
      sw.className = "swatch-item";
      sw.style.background = hex;
      sw.title = hex;
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "saved-swatch-remove";
      rm.innerHTML = "&times;";
      rm.addEventListener("click", (e) => {
        e.stopPropagation();
        const next = loadSaved().filter((c) => c !== hex);
        persistSaved(next);
        window.dispatchEvent(new CustomEvent("cp:saved-colors-updated"));
      });
      item.appendChild(sw);
      item.appendChild(rm);
      wrap.appendChild(item);
    });
  }

  function updateSavedButton(hex) {
    const btn = $("imgxAddSaved");
    const isSaved = loadSaved().includes(hex.toUpperCase());
    btn.classList.toggle("saved", isSaved);
    btn.querySelector(".icon").innerHTML =
      ICONS[isSaved ? "heartFilled" : "heart"];
    btn.querySelector("span:last-child").textContent = isSaved
      ? t("imgx_remove_saved")
      : t("imgx_add_saved");
  }

  /* ---------- Экспорт палитры ---------- */
  function exportJson() {
    if (!palette.length) return;
    const data = sortedPalette().map((c, i) => ({
      index: i + 1,
      hex: rgbToHex(c.r, c.g, c.b),
      rgb: [c.r, c.g, c.b],
      population: c.population,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "extracted-palette.json";
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(t("imgx_exported_json"));
  }

  function exportCss() {
    if (!palette.length) return;
    const lines = sortedPalette().map(
      (c, i) => `  --color-${i + 1}: ${rgbToHex(c.r, c.g, c.b)};`,
    );
    copyText(":root {\n" + lines.join("\n") + "\n}", t("imgx_exported_css"));
  }

  /* ---------- Обвязка событий ---------- */
  function wireUpload() {
    const input = $("imgxFileInput");
    const drop = $("imgxDrop");

    input.addEventListener("change", (e) => {
      if (e.target.files[0]) handleFile(e.target.files[0]);
      input.value = "";
    });

    ["dragenter", "dragover"].forEach((evt) =>
      drop.addEventListener(evt, (e) => {
        e.preventDefault();
        drop.classList.add("drag");
      }),
    );
    ["dragleave", "drop"].forEach((evt) =>
      drop.addEventListener(evt, (e) => {
        e.preventDefault();
        drop.classList.remove("drag");
      }),
    );
    drop.addEventListener("drop", (e) => {
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleFile(file);
    });

    const trigger = () => input.click();
    $("imgxUploadAgain").addEventListener("click", trigger);
    $("imgxUploadAnotherTop").addEventListener("click", trigger);

    $("imgxRemoveBtn").addEventListener("click", () => {
      resetState();
      showToast(t("imgx_image_removed"));
    });
  }

  function wireSort() {
    $("imgxSort").addEventListener("change", (e) => {
      sortMode = e.target.value;
      renderPalette();
      if (selected) selectColor(selected);
    });
  }

  function wireSavedMenu() {
    $("imgxSavedBtn").addEventListener("click", (e) => {
      e.stopPropagation();
      $("imgxExportMenu").classList.remove("open");
      window.toggleMenuSmart($("imgxSavedMenu"), $("imgxSavedBtn"));
    });
    $("imgxSavedMenu").addEventListener("click", (e) => e.stopPropagation());
    $("imgxClearSaved").addEventListener("click", (e) => {
      e.stopPropagation();
      persistSaved([]);
      window.dispatchEvent(new CustomEvent("cp:saved-colors-updated"));
    });
    $("imgxAddSaved").addEventListener("click", () => {
      if (!selected) return;
      const hex = rgbToHex(selected.r, selected.g, selected.b).toUpperCase();
      let list = loadSaved();
      if (list.includes(hex)) {
        list = list.filter((c) => c !== hex);
        showToast(t("imgx_saved_removed"));
      } else {
        list.push(hex);
        showToast(t("imgx_saved_added"));
      }
      persistSaved(list);
      window.dispatchEvent(new CustomEvent("cp:saved-colors-updated"));
    });
    window.addEventListener("cp:saved-colors-updated", () => {
      renderSavedMenu();
      if (selected)
        updateSavedButton(rgbToHex(selected.r, selected.g, selected.b));
    });
  }

  function wireExportMenu() {
    $("imgxExportBtn").addEventListener("click", (e) => {
      e.stopPropagation();
      $("imgxSavedMenu").classList.remove("open");
      window.toggleMenuSmart($("imgxExportMenu"), $("imgxExportBtn"));
    });
    $("imgxExportMenu").addEventListener("click", (e) => e.stopPropagation());
    $("imgxExportJson").addEventListener("click", () => {
      exportJson();
      $("imgxExportMenu").classList.remove("open");
    });
    $("imgxExportCss").addEventListener("click", () => {
      exportCss();
      $("imgxExportMenu").classList.remove("open");
    });
  }

  document.addEventListener("click", () => {
    $("imgxSavedMenu").classList.remove("open");
    $("imgxExportMenu").classList.remove("open");
  });

  /* ---------- Обновление при смене языка ---------- */
  const langObserver = new MutationObserver(() => {
    if (!currentFile) {
      $("imgxExtractedSub").textContent = t("imgx_panel2_sub_empty");
      return;
    }
    $("imgxExtractedSub").textContent = t("imgx_panel2_sub").replace(
      "{n}",
      palette.length,
    );
    $("imgxCountChip").textContent =
      palette.length + " " + t("imgx_colors_word");
    $("imgxInfoSpace").textContent = "sRGB";
    if (sampleInfo)
      $("imgxInfoTotal").textContent =
        sampleInfo.totalColors.toLocaleString() + " " + t("imgx_optimized");
    if (selected) selectColor(selected);
    renderSavedMenu();
  });

  /* ---------- Позволяет другим страницам открыть эту с уже выбранным файлом ---------- */
  window.addEventListener("cp:open-image-extractor", () => {
    const link = document.querySelector('.topnav-link[data-page="image"]');
    if (link) link.click();
    setTimeout(() => $("imgxFileInput").click(), 200);
  });

  /* ---------- Инициализация ---------- */
  function init() {
    resetState();
    wireUpload();
    wireSort();
    wireSavedMenu();
    wireExportMenu();
    renderSavedMenu();
    langObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });
  }

  init();
})();

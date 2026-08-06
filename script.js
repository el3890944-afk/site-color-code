// script.js — логика приложения HTML Color Picker PRO

(function () {
  /* ---------- Состояние ---------- */
  let state = { h: 30, s: 25, l: 50, a: 100 }; // HSL + alpha
  let recentColors = [];
  const $ = (id) => document.getElementById(id);
  const SAVED_COLORS_KEY = "cp-saved-colors";
  function loadSavedColors() {
    try {
      const raw = localStorage.getItem(SAVED_COLORS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (err) {
      return [];
    }
  }
  let savedColors = loadSavedColors();
  let activeHarmony = "analogous";
  let shadesVariant = "shades";

  /* ---------- Инициализация иконок ---------- */
  function mountIcons(root) {
    (root || document).querySelectorAll("[data-icon]").forEach((el) => {
      el.innerHTML = ICONS[el.dataset.icon] || "";
    });
  }

  /* ---------- Троттлинг перерисовки на время перетаскивания =====
     pointermove может срабатывать чаще, чем экран успевает
     обновляться (у мыши с высоким opросом — сотни раз в секунду).
     render() пересобирает Color Harmony и Shades через innerHTML,
     так что вызывать его на каждое событие — лишняя нагрузка.
     scheduleRender() схлопывает все вызовы внутри одного кадра
     в один render(). ---------- */
  let renderScheduled = false;
  function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(() => {
      renderScheduled = false;
      render();
    });
  }

  /* ---------- Цветовое колесо ---------- */
  const wheel = $("wheel");
  const wctx = wheel.getContext("2d");
  const wsize = wheel.width,
    wradius = wsize / 2,
    wcx = wradius,
    wcy = wradius;

  function drawWheel() {
    const img = wctx.createImageData(wsize, wsize);
    for (let y = 0; y < wsize; y++) {
      for (let x = 0; x < wsize; x++) {
        const dx = x - wcx,
          dy = y - wcy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * wsize + x) * 4;
        if (dist <= wradius) {
          let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          angle = (angle + 360) % 360;
          const sat = Math.min(dist / wradius, 1) * 100;
          const [r, g, b] = hslToRgb(angle, sat, 50);
          img.data[idx] = r;
          img.data[idx + 1] = g;
          img.data[idx + 2] = b;
          img.data[idx + 3] = 255;
        } else {
          img.data[idx + 3] = 0;
        }
      }
    }
    wctx.putImageData(img, 0, 0);
  }

  function placeWheelMarker() {
    const angleRad = (state.h * Math.PI) / 180;
    const dist = (state.s / 100) * wradius;
    const x = wcx + dist * Math.cos(angleRad);
    const y = wcy + dist * Math.sin(angleRad);
    $("marker").style.left = x + "px";
    $("marker").style.top = y + "px";
  }

  wheel.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const move = (ev) => {
      const rect = wheel.getBoundingClientRect();
      const x = ev.clientX - rect.left,
        y = ev.clientY - rect.top;
      const dx = x - wcx,
        dy = y - wcy;
      let dist = Math.sqrt(dx * dx + dy * dy);
      dist = Math.min(dist, wradius);
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      angle = (angle + 360) % 360;
      state.h = angle;
      state.s = (dist / wradius) * 100;
      scheduleRender();
    };
    move(e);
    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      pushRecent();
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  });

  /* ---------- Обобщённый обработчик линейных ползунков ---------- */
  function wireTrack(trackEl, thumbEl, fillEl, onChange) {
    function update(clientX) {
      const rect = trackEl.getBoundingClientRect();
      let pct = (clientX - rect.left) / rect.width;
      pct = Math.max(0, Math.min(1, pct));
      onChange(pct * 100);
      scheduleRender();
    }
    trackEl.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      update(e.clientX);
      const move = (ev) => update(ev.clientX);
      const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        pushRecent();
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
    });
  }

  wireTrack($("hueTrack"), $("hueThumb"), null, (v) => {
    state.h = (v / 100) * 360;
  });
  wireTrack($("satTrack"), $("satThumb"), $("satFill"), (v) => {
    state.s = v;
  });
  wireTrack($("lightTrack"), $("lightThumb"), $("lightFill"), (v) => {
    state.l = v;
  });
  wireTrack($("alphaTrack"), $("alphaThumb"), $("alphaFill"), (v) => {
    state.a = v;
  });

  /* ---------- Числовые поля рядом с ползунками ---------- */
  function wireValueInput(inputEl, min, max, onChange, getValue) {
    function commit() {
      let v = parseFloat(inputEl.value);
      if (isNaN(v)) v = min;
      v = Math.max(min, Math.min(max, v));
      onChange(v);
      render();
      pushRecent();
    }
    inputEl.addEventListener("input", commit);
    inputEl.addEventListener("blur", () => {
      inputEl.value = Math.round(getValue());
    });
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") inputEl.blur();
    });
  }
  wireValueInput(
    $("hueValueInput"),
    0,
    360,
    (v) => {
      state.h = v;
    },
    () => state.h,
  );
  wireValueInput(
    $("satValueInput"),
    0,
    100,
    (v) => {
      state.s = v;
    },
    () => state.s,
  );
  wireValueInput(
    $("lightValueInput"),
    0,
    100,
    (v) => {
      state.l = v;
    },
    () => state.l,
  );
  wireValueInput(
    $("alphaValueInput"),
    0,
    100,
    (v) => {
      state.a = v;
    },
    () => state.a,
  );

  /* ---------- Переключение вкладок Wheel / Sliders ---------- */
  document.querySelectorAll(".tab[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".tab[data-tab]")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const wheelWrap = document.querySelector(".wheel-wrap");
      if (wheelWrap)
        wheelWrap.style.display = btn.dataset.tab === "sliders" ? "none" : "";
    });
  });

  /* ---------- Рендер всего интерфейса на основе state ---------- */
  function render() {
    const { h, s, l, a } = state;
    const [r, g, b] = hslToRgb(h, s, l);
    const hex = rgbToHex(r, g, b);

    // Маркер колеса и слайдеры
    placeWheelMarker();
    $("hueThumb").style.left = (h / 360) * 100 + "%";
    $("satThumb").style.left = s + "%";
    $("satFill").style.width = s + "%";
    $("lightThumb").style.left = l + "%";
    $("lightFill").style.width = l + "%";
    $("alphaThumb").style.left = a + "%";
    $("alphaFill").style.width = a + "%";
    if (document.activeElement !== $("hueValueInput"))
      $("hueValueInput").value = Math.round(h);
    if (document.activeElement !== $("satValueInput"))
      $("satValueInput").value = Math.round(s);
    if (document.activeElement !== $("lightValueInput"))
      $("lightValueInput").value = Math.round(l);
    if (document.activeElement !== $("alphaValueInput"))
      $("alphaValueInput").value = Math.round(a);

    // Быстрый ввод — показываем в формате, выбранном в селекторе рядом
    const quickFormat = $("quickFormat").value;
    $("hexInput").value =
      quickFormat === "rgb"
        ? `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
        : quickFormat === "hsl"
          ? `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`
          : hex;
    $("quickSwatch").style.background = hex;

    // Превью выбранного цвета
    $("previewBox").style.background = hex;
    $("colorName").textContent = nearestColorName(r, g, b);
    $("colorHex").textContent = hex.toUpperCase();
    const contrast = contrastLabel([r, g, b]);
    const contrastKey =
      contrast.grade === "AAA"
        ? "contrast_excellent"
        : contrast.grade === "AA"
          ? "contrast_good"
          : "contrast_low";
    $("contrastBadge").innerHTML = `<b>${contrast.grade}</b> ${t(contrastKey)}`;

    // Значения
    $("outHex").value = hex.toUpperCase();
    $("outRgb").value = `rgb(${r}, ${g}, ${b})`;
    $("outHsl").value =
      `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
    const [hh, ss, vv] = rgbToHsv(r, g, b);
    $("outHsv").value =
      `hsv(${Math.round(hh)}°, ${Math.round(ss)}%, ${Math.round(vv)}%)`;
    const [c, m, y, k] = rgbToCmyk(r, g, b);
    $("outCmyk").value =
      `cmyk(${Math.round(c)}%, ${Math.round(m)}%, ${Math.round(y)}%, ${Math.round(k)}%)`;
    const [L, A, B] = rgbToLab(r, g, b);
    $("outLab").value =
      `lab(${L.toFixed(2)}, ${A.toFixed(2)}, ${B.toFixed(2)})`;

    renderHarmony();
    renderShades();
  }

  /* ---------- Гармония цветов ---------- */
  const HARMONY_LABELS = {
    analogous: "Analogous",
    complementary: "Complementary",
    triadic: "Triadic",
    tetradic: "Tetradic",
    monochromatic: "Monochromatic",
  };

  function renderHarmony() {
    const { h, s, l } = state;
    const data = colorHarmony(h, s, l);
    const grid = $("harmonyGrid");
    grid.innerHTML = "";
    Object.keys(HARMONY_LABELS).forEach((key) => {
      const swatches = data[key];
      const card = document.createElement("div");
      card.className =
        "harmony-card" + (key === activeHarmony ? " active" : "");
      card.innerHTML = `<div class="harmony-swatches">${swatches.map(([r, g, b]) => `<span style="background:${rgbToHex(r, g, b)}"></span>`).join("")}</div>
         <small>${HARMONY_LABELS[key]}</small>`;
      card.addEventListener("click", () => {
        activeHarmony = key;
        renderHarmony();
      });
      grid.appendChild(card);
    });
  }

  /* ---------- Оттенки/Тона (Shades / Tints / Tones) ---------- */
  function renderShades() {
    const { h, s, l } = state;
    const list = $("shadesList");
    list.innerHTML = "";
    for (let pct = 100; pct >= 0; pct -= 10) {
      let rowL,
        rowS = s;
      if (shadesVariant === "shades") {
        // 0% ближе к белому, 100% ближе к чёрному
        rowL = 95 - (pct / 100) * 75;
      } else if (shadesVariant === "tints") {
        // подмешивание белого: 0% = база, 100% = почти белый
        rowL = l + (95 - l) * (pct / 100);
      } else {
        // tones: подмешивание серого — снижаем насыщенность
        rowL = l;
        rowS = s * (1 - pct / 100);
      }
      const [r, g, b] = hslToRgb(h, rowS, rowL);
      const hex = rgbToHex(r, g, b);
      const isCurrent = Math.abs(rowL - l) < 6 && Math.abs(rowS - s) < 6;

      const row = document.createElement("div");
      row.className = "shade-row" + (isCurrent ? " current" : "");
      row.style.background = hex;
      row.style.color = relativeLuminance(r, g, b) > 0.5 ? "#0A0D17" : "#fff";
      row.innerHTML = `<span class="shade-pct">${pct}%</span>
         <span class="shade-right">
           <span>${hex.toUpperCase()}</span>
           <button class="copy-btn" data-copy-raw="${hex.toUpperCase()}" data-icon="copy"></button>
         </span>`;
      row.addEventListener("click", () => {
        state.h = h;
        state.s = rowS;
        state.l = rowL;
        render();
        pushRecent();
      });
      list.appendChild(row);
    }
    mountIcons(list);
  }

  document.querySelectorAll("[data-variant]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll("[data-variant]")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      shadesVariant = btn.dataset.variant;
      renderShades();
    });
  });

  /* ---------- Недавние и сохранённые цвета ---------- */
  function pushRecent() {
    const hex = rgbToHex(...hslToRgb(state.h, state.s, state.l));
    recentColors = [hex, ...recentColors.filter((c) => c !== hex)].slice(0, 8);
    renderRecent();
  }

  function renderRecent() {
    const wrap = $("recentList");
    wrap.innerHTML = "";
    recentColors.forEach((hex) => {
      const sw = document.createElement("div");
      sw.className = "swatch-item";
      sw.style.background = hex;
      sw.title = hex;
      sw.addEventListener("click", () => setFromHex(hex));
      wrap.appendChild(sw);
    });
  }

  $("clearRecent").addEventListener("click", () => {
    recentColors = [];
    renderRecent();
  });

  function persistSavedColors() {
    try {
      localStorage.setItem(SAVED_COLORS_KEY, JSON.stringify(savedColors));
    } catch (err) {}
  }

  function renderSavedColors() {
    const wrap = $("savedColorsList");
    const empty = $("savedColorsEmpty");
    $("savedCount").textContent = savedColors.length;
    wrap.innerHTML = "";
    if (savedColors.length === 0) {
      wrap.style.display = "none";
      empty.style.display = "block";
      return;
    }
    wrap.style.display = "flex";
    empty.style.display = "none";
    savedColors.forEach((hex) => {
      const item = document.createElement("div");
      item.className = "saved-swatch-item";
      const sw = document.createElement("div");
      sw.className = "swatch-item";
      sw.style.background = hex;
      sw.title = hex;
      sw.addEventListener("click", () => {
        setFromHex(hex);
        $("savedColorsMenu").classList.remove("open");
      });
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "saved-swatch-remove";
      rm.innerHTML = "&times;";
      rm.title = t("remove_color") || "Remove";
      rm.addEventListener("click", (e) => {
        e.stopPropagation();
        savedColors = savedColors.filter((c) => c !== hex);
        persistSavedColors();
        renderSavedColors();
      });
      item.appendChild(sw);
      item.appendChild(rm);
      wrap.appendChild(item);
    });
  }

  $("clearSavedColors").addEventListener("click", (e) => {
    e.stopPropagation();
    savedColors = [];
    persistSavedColors();
    renderSavedColors();
  });

  $("savedColorsBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    $("exportMenu").classList.remove("open");
    $("langMenu").classList.remove("open");
    const wasOpen = $("savedColorsMenu").classList.contains("open");
    if (!wasOpen) renderSavedColors();
    toggleMenu($("savedColorsMenu"), $("savedColorsBtn"));
  });
  $("savedColorsMenu").addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", () =>
    $("savedColorsMenu").classList.remove("open"),
  );

  $("favBtn").addEventListener("click", () => {
    const hex = rgbToHex(...hslToRgb(state.h, state.s, state.l));
    if (!savedColors.includes(hex)) {
      savedColors.push(hex);
      persistSavedColors();
      renderSavedColors();
      $("favBtn").innerHTML = ICONS.starFilled;
      showToast(t("toast_saved_color"));
      setTimeout(() => {
        $("favBtn").innerHTML = ICONS.star;
      }, 600);
    }
  });

  /* ---------- Ввод HEX / установка цвета ---------- */
  function setFromHex(hex) {
    hex = hex.trim();
    if (!hex.startsWith("#")) hex = "#" + hex;
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    const [r, g, b] = hexToRgb(hex);
    const [h, s, l] = rgbToHsl(r, g, b);
    state.h = h;
    state.s = s;
    state.l = l;
    render();
    pushRecent();
  }

  // Разбирает значение поля Quick Input с учётом выбранного в
  // селекторе формата (HEX / RGB / HSL) и переводит его в HEX.
  function setFromQuickInput(value, format) {
    value = value.trim();
    if (format === "rgb") {
      const m = value.match(
        /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i,
      );
      if (m) {
        const clamp = (n) => Math.min(255, Math.max(0, parseInt(n, 10)));
        setFromHex(rgbToHex(clamp(m[1]), clamp(m[2]), clamp(m[3])));
        return;
      }
    } else if (format === "hsl") {
      const m = value.match(
        /hsla?\(\s*(-?\d{1,3})\s*,\s*(\d{1,3})%?\s*,\s*(\d{1,3})%?/i,
      );
      if (m) {
        const h = ((parseInt(m[1], 10) % 360) + 360) % 360;
        const s = Math.min(100, Math.max(0, parseInt(m[2], 10)));
        const l = Math.min(100, Math.max(0, parseInt(m[3], 10)));
        setFromHex(rgbToHex(...hslToRgb(h, s, l)));
        return;
      }
    }
    // формат HEX или строка не распозналась как rgb()/hsl() — как раньше
    setFromHex(value);
  }

  $("hexInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter")
      setFromQuickInput(e.target.value, $("quickFormat").value);
  });
  $("hexInput").addEventListener("blur", (e) =>
    setFromQuickInput(e.target.value, $("quickFormat").value),
  );
  $("quickFormat").addEventListener("change", render);

  /* ---------- Копирование в буфер обмена ---------- */
  function showToast(msg) {
    const t = $("toast");
    t.innerHTML = `${icon("check")} ${escapeHtml(String(msg))}`;
    t.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => t.classList.remove("show"), 1800);
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

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast(t("toast_copied_prefix") + text))
        .catch(() => {
          if (fallbackCopy()) {
            showToast(t("toast_copied_prefix") + text);
          } else {
            showToast(t("toast_copy_failed") || "Copy failed");
          }
        });
    } else if (fallbackCopy()) {
      showToast(t("toast_copied_prefix") + text);
    } else {
      showToast(t("toast_copy_failed") || "Copy failed");
    }
  }

  document.querySelectorAll(".copy-btn[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => copyText($(btn.dataset.copy).value));
  });

  // Делегирование вместо навешивания обработчика на каждую кнопку при
  // каждой перерисовке shades-списка — иначе после N перерисовок клик
  // срабатывал бы N раз (утечка обработчиков + дублирующиеся тосты).
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-copy-raw]");
    if (!btn) return;
    e.stopPropagation();
    copyText(btn.dataset.copyRaw);
  });

  $("copyHexTopBtn").addEventListener("click", () =>
    copyText($("outHex").value),
  );

  $("copyAllBtn").addEventListener("click", () => {
    const lines = [
      "HEX: " + $("outHex").value,
      "RGB: " + $("outRgb").value,
      "HSL: " + $("outHsl").value,
      "HSV: " + $("outHsv").value,
      "CMYK: " + $("outCmyk").value,
      "LAB: " + $("outLab").value,
    ].join("\n");
    copyText(lines);
  });

  /* ---------- Случайный цвет / пипетка ---------- */
  $("randomBtn").addEventListener("click", () => {
    state.h = Math.random() * 360;
    state.s = 40 + Math.random() * 50;
    state.l = 35 + Math.random() * 35;
    render();
    pushRecent();
  });

  $("eyedropperBtn").addEventListener("click", async () => {
    if (!("EyeDropper" in window)) {
      showToast(t("toast_no_eyedropper"));
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

  /* ---------- Генерация / экспорт палитры ---------- */
  $("generatePaletteBtn").addEventListener("click", () => {
    state.h = Math.random() * 360;
    render();
    pushRecent();
  });

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  $("exportPaletteBtn").addEventListener("click", () => {
    const rows = Array.from(
      document.querySelectorAll(
        "#shadesList .shade-row .shade-right > span:first-child",
      ),
    ).map((s) => s.textContent);
    const json = JSON.stringify(rows, null, 2);
    $("exportModalCode").textContent = json;
    $("exportModal").hidden = false;
    $("exportModalCopy").onclick = () => {
      const done = () => showToast(t("toast_palette_exported") || "Copied");
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
          .writeText(json)
          .then(done)
          .catch(() => {
            const ta = document.createElement("textarea");
            ta.value = json;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            try {
              document.execCommand("copy");
              done();
            } catch (err) {
              showToast(t("toast_copy_failed") || "Copy failed");
            }
            document.body.removeChild(ta);
          });
      } else {
        const ta = document.createElement("textarea");
        ta.value = json;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          done();
        } catch (err) {
          showToast(t("toast_copy_failed") || "Copy failed");
        }
        document.body.removeChild(ta);
      }
    };
    $("exportModalDownload").onclick = () => {
      downloadFile("palette.json", json, "application/json");
      showToast(t("toast_palette_exported"));
    };
  });
  $("exportModalClose").addEventListener("click", () => {
    $("exportModal").hidden = true;
  });
  $("exportModal").addEventListener("click", (e) => {
    if (e.target === $("exportModal")) $("exportModal").hidden = true;
  });

  /* ---------- Export меню ---------- */
  function toggleMenu(menu, anchorBtn) {
    const wasOpen = menu.classList.contains("open");
    if (wasOpen) {
      menu.classList.remove("open");
      return;
    }
    if (anchorBtn) {
      // Класс добавляем до замера ширины: пока меню скрыто (display:none),
      // offsetWidth всегда вернёт 0. Так как всё происходит синхронно —
      // браузер не успевает отрисовать промежуточный кадр, мигания нет.
      menu.classList.add("open");
      const rect = anchorBtn.getBoundingClientRect();
      const menuWidth = menu.offsetWidth || 220;
      const margin = 8;
      let rightOffset = window.innerWidth - rect.right;
      const wouldOverflowLeft =
        window.innerWidth - rightOffset - menuWidth < margin;
      menu.style.position = "fixed";
      menu.style.top = rect.bottom + 6 + "px";
      if (wouldOverflowLeft) {
        menu.style.left = Math.max(margin, rect.left) + "px";
        menu.style.right = "auto";
      } else {
        menu.style.right = rightOffset + "px";
        menu.style.left = "auto";
      }
      return;
    }
    menu.classList.add("open");
  }
  $("exportBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    $("langMenu").classList.remove("open");
    $("savedColorsMenu").classList.remove("open");
    toggleMenu($("exportMenu"), $("exportBtn"));
  });
  document.addEventListener("click", () =>
    $("exportMenu").classList.remove("open"),
  );
  $("exportMenu").addEventListener("click", (e) => e.stopPropagation());

  $("exportMenu")
    .querySelectorAll("button")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const hex = $("outHex").value;
        if (btn.dataset.export === "css") {
          copyText(`--picked-color: ${hex};`);
        } else if (btn.dataset.export === "json") {
          downloadFile(
            "color.json",
            JSON.stringify(
              {
                hex,
                rgb: $("outRgb").value,
                hsl: $("outHsl").value,
                hsv: $("outHsv").value,
                cmyk: $("outCmyk").value,
                lab: $("outLab").value,
              },
              null,
              2,
            ),
            "application/json",
          );
        } else if (btn.dataset.export === "png") {
          const c = $("hiddenCanvas");
          c.width = 240;
          c.height = 160;
          const ctx = c.getContext("2d");
          ctx.fillStyle = hex;
          ctx.fillRect(0, 0, c.width, c.height);
          c.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "color.png";
            a.click();
            URL.revokeObjectURL(url);
          });
        }
        $("exportMenu").classList.remove("open");
      });
    });
  $("exportBtn2").addEventListener("click", (e) => {
    e.stopPropagation();
    $("langMenu").classList.remove("open");
    $("savedColorsMenu").classList.remove("open");
    toggleMenu($("exportMenu"), $("exportBtn2"));
  });

  /* ---------- Загрузка изображения — извлечение среднего цвета ---------- */
  $("uploadBtn").addEventListener("click", () => $("uploadInput").click());
  $("uploadInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const c = $("hiddenCanvas");
      c.width = 60;
      c.height = 60;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, 60, 60);
      const data = ctx.getImageData(0, 0, 60, 60).data;
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
      setFromHex(rgbToHex(r / n, g / n, b / n));
      showToast(t("toast_color_extracted"));
    };
    img.src = URL.createObjectURL(file);
  });

  /* ---------- Тема (сохраняется в localStorage) ---------- */
  function getTheme() {
    return document.documentElement.getAttribute("data-theme") === "light"
      ? "light"
      : "dark";
  }
  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("cp-theme", theme);
  }
  function applyThemeIcon() {
    const btn = $("themeToggle");
    btn.dataset.icon = getTheme() === "light" ? "moon" : "sun";
    btn.innerHTML = ICONS[btn.dataset.icon] || "";
  }
  $("themeToggle").addEventListener("click", () => {
    setTheme(getTheme() === "light" ? "dark" : "light");
    applyThemeIcon();
    showToast(t("toast_theme_toggled"));
  });

  /* ---------- Язык (меню + сохранение в localStorage) ---------- */
  function renderLangList(filter) {
    const list = $("langList");
    const q = (filter || "").trim().toLowerCase();
    const current = getLang();
    const items = LANGUAGES.filter(
      (l) => l.name.toLowerCase().includes(q) || l.code.includes(q),
    );
    list.innerHTML = "";
    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "lang-list-empty";
      empty.textContent = "—";
      list.appendChild(empty);
      return;
    }
    items.forEach((l) => {
      const btn = document.createElement("button");
      btn.textContent = l.name;
      btn.dataset.lang = l.code;
      if (l.code === current) btn.classList.add("active");
      btn.addEventListener("click", () => {
        setLang(l.code);
        applyThemeIcon();
        renderLangList($("langSearch").value);
        $("langMenu").classList.remove("open");
      });
      list.appendChild(btn);
    });
  }
  $("langToggle").addEventListener("click", (e) => {
    e.stopPropagation();
    $("exportMenu").classList.remove("open");
    toggleMenu($("langMenu"), $("langToggle"));
    if ($("langMenu").classList.contains("open")) {
      renderLangList("");
      $("langSearch").value = "";
      $("langSearch").focus();
    }
  });
  $("langMenu").addEventListener("click", (e) => e.stopPropagation());
  $("langSearch").addEventListener("input", (e) =>
    renderLangList(e.target.value),
  );
  document.addEventListener("click", () =>
    $("langMenu").classList.remove("open"),
  );

  /* ---------- Страницы (Picker / Palette) ---------- */
  const OVERFLOW_PAGES = ["image", "accessibility", "resources"];
  function switchPage(page) {
    document
      .querySelectorAll(".app-page")
      .forEach((p) => p.classList.toggle("active", p.id === "page-" + page));
    document
      .querySelectorAll(".topnav-link[data-page]")
      .forEach((a) => a.classList.toggle("active", a.dataset.page === page));
    document
      .querySelectorAll(".bottomnav-link[data-page]")
      .forEach((a) => a.classList.toggle("active", a.dataset.page === page));
    document
      .querySelectorAll(".bottomnav-sheet-item[data-page]")
      .forEach((a) => a.classList.toggle("active", a.dataset.page === page));
    const moreBtn = $("bottomNavMoreBtn");
    if (moreBtn)
      moreBtn.classList.toggle("active", OVERFLOW_PAGES.includes(page));
    closeBottomSheet();
  }
  document
    .querySelectorAll(
      ".topnav-link[data-page], .bottomnav-link[data-page], .bottomnav-sheet-item[data-page]",
    )
    .forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        switchPage(a.dataset.page);
      });
    });

  /* ---------- Шторка «Ещё» в нижней навигации ---------- */
  function openBottomSheet() {
    const sheet = $("bottomNavSheet");
    if (!sheet) return;
    sheet.hidden = false;
    $("bottomNavMoreBtn").setAttribute("aria-expanded", "true");
  }
  function closeBottomSheet() {
    const sheet = $("bottomNavSheet");
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true;
    $("bottomNavMoreBtn").setAttribute("aria-expanded", "false");
  }
  if ($("bottomNavMoreBtn")) {
    $("bottomNavMoreBtn").addEventListener("click", (e) => {
      e.preventDefault();
      $("bottomNavSheet").hidden ? openBottomSheet() : closeBottomSheet();
    });
    $("bottomNavSheetBackdrop").addEventListener("click", closeBottomSheet);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeBottomSheet();
    });
  }

  /* ---------- /Шторка «Ещё» ---------- */

  /* ---------- Палитры (страница Palette) ---------- */
  const PALETTES_KEY = "cp-palettes";
  const DEFAULT_PALETTES = [
    {
      id: "p1",
      name: "Ocean Breeze",
      created: 2,
      fav: true,
      colors: [
        { name: "Deep Ocean", hex: "#0D1B2A" },
        { name: "Ocean Depth", hex: "#1B263B" },
        { name: "Sea Blue", hex: "#415A77" },
        { name: "Sky Blue", hex: "#6497B1" },
        { name: "Wave", hex: "#A8DADC" },
        { name: "Sea Foam", hex: "#BDE0FE" },
        { name: "Surf", hex: "#CAF0F8" },
        { name: "Mist", hex: "#E0FBFC" },
      ],
    },
    {
      id: "p2",
      name: "Sunset Dream",
      created: 4,
      colors: [
        { name: "Ember", hex: "#FDCB6E" },
        { name: "Amber", hex: "#F6A63A" },
        { name: "Coral", hex: "#F0932B" },
        { name: "Tangerine", hex: "#E17055" },
        { name: "Crimson", hex: "#D63031" },
        { name: "Rose", hex: "#C0392B" },
        { name: "Wine", hex: "#922B21" },
      ],
    },
    {
      id: "p3",
      name: "Forest Retreat",
      created: 6,
      colors: [
        { name: "Pine", hex: "#1B4332" },
        { name: "Moss", hex: "#2D6A4F" },
        { name: "Fern", hex: "#40916C" },
        { name: "Sage", hex: "#52B788" },
        { name: "Mint", hex: "#74C69D" },
        { name: "Leaf", hex: "#95D5B2" },
        { name: "Sprout", hex: "#B7E4C7" },
        { name: "Dew", hex: "#D8F3DC" },
      ],
    },
    {
      id: "p4",
      name: "Royal Purple",
      created: 8,
      colors: [
        { name: "Midnight Violet", hex: "#3C096C" },
        { name: "Royal", hex: "#5A189A" },
        { name: "Amethyst", hex: "#7B2CBF" },
        { name: "Orchid", hex: "#9D4EDD" },
        { name: "Lilac", hex: "#C77DFF" },
        { name: "Lavender", hex: "#E0AAFF" },
      ],
    },
    {
      id: "p5",
      name: "Warm Neutrals",
      created: 9,
      colors: [
        { name: "Espresso", hex: "#4A3428" },
        { name: "Cocoa", hex: "#7A5C43" },
        { name: "Camel", hex: "#A9825C" },
        { name: "Sand", hex: "#D2B48C" },
        { name: "Linen", hex: "#E8D8C3" },
        { name: "Cream", hex: "#F5EBDD" },
      ],
    },
    {
      id: "p6",
      name: "Iceberg",
      created: 11,
      colors: [
        { name: "Glacier", hex: "#0B3D5C" },
        { name: "Steel", hex: "#2E5C7A" },
        { name: "Frost", hex: "#6497B1" },
        { name: "Pale Sky", hex: "#9FC5D8" },
        { name: "Ice", hex: "#CFE8F3" },
        { name: "Snow", hex: "#F0FAFF" },
        { name: "White", hex: "#FFFFFF" },
      ],
    },
    {
      id: "p7",
      name: "Candy Pop",
      created: 13,
      colors: [
        { name: "Cherry", hex: "#FF3B5C" },
        { name: "Tangy Orange", hex: "#FF8A3D" },
        { name: "Lemon", hex: "#FFD93D" },
        { name: "Lime", hex: "#6BCB77" },
        { name: "Sky", hex: "#4D96FF" },
        { name: "Bubblegum", hex: "#FF6FB5" },
      ],
    },
    {
      id: "p8",
      name: "Midnight",
      created: 15,
      colors: [
        { name: "Void", hex: "#0A0D17" },
        { name: "Charcoal", hex: "#1E2233" },
        { name: "Slate", hex: "#363C56" },
        { name: "Steel Grey", hex: "#5C6488" },
        { name: "Fog", hex: "#8A91B0" },
        { name: "Cloud", hex: "#C7CCE0" },
      ],
    },
  ];

  function loadPalettes() {
    try {
      const raw = localStorage.getItem(PALETTES_KEY);
      const arr = raw ? JSON.parse(raw) : null;
      return Array.isArray(arr) && arr.length ? arr : DEFAULT_PALETTES;
    } catch (err) {
      return DEFAULT_PALETTES;
    }
  }
  function persistPalettes() {
    try {
      localStorage.setItem(PALETTES_KEY, JSON.stringify(palettes));
    } catch (err) {}
  }

  let palettes = loadPalettes();
  let activePaletteId = palettes[0] && palettes[0].id;
  let activeColorHex = null;
  let paletteQuery = "";
  let paletteFilterMode = "all";

  function getActivePalette() {
    return palettes.find((p) => p.id === activePaletteId) || palettes[0];
  }

  // Относительная светимость и контраст к белому фону (WCAG 2.x)
  function relLuminance(hex) {
    const [r, g, b] = hexToRgb(hex).map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contrastToWhite(hex) {
    const l1 = relLuminance(hex);
    return (1 + 0.05) / (l1 + 0.05);
  }
  function ratingFor(ratio) {
    if (ratio >= 7) return "AAA";
    if (ratio >= 4.5) return "AA";
    return "—";
  }

  function renderPaletteList() {
    const list = $("paletteList");
    const q = paletteQuery.trim().toLowerCase();
    const filtered = palettes.filter(
      (p) =>
        p.name.toLowerCase().includes(q) &&
        (paletteFilterMode !== "fav" || p.fav),
    );
    $("paletteCount").textContent = `${palettes.length} ${
      t("palette_count_word") || "palettes"
    }`;
    list.innerHTML = "";
    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "palette-list-empty";
      empty.textContent = t("palette_none_found") || "No palettes found";
      list.appendChild(empty);
      return;
    }
    filtered.forEach((p) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className =
        "palette-list-item" + (p.id === activePaletteId ? " active" : "");
      item.innerHTML = `
        <span class="palette-list-swatch">${p.colors
          .slice(0, 5)
          .map((c) => `<span style="background:${safeHex(c.hex)}"></span>`)
          .join("")}</span>
        <span class="palette-list-item-info">
          <b>${escapeHtml(p.name)}</b>
          <small>${p.colors.length} ${t("palette_colors_word") || "colors"}</small>
        </span>`;
      item.addEventListener("click", () => {
        activePaletteId = p.id;
        activeColorHex = null;
        renderPaletteList();
        renderPaletteMain();
      });
      list.appendChild(item);
    });
  }

  function renderPaletteMain() {
    const p = getActivePalette();
    if (!p) return;
    $("paletteTitle").textContent = p.name;
    $("paletteMeta").innerHTML = `${p.colors.length} ${
      t("palette_colors_word") || "colors"
    } &middot; ${t("palette_created") || "Created"} ${Number(p.created) || 1} ${
      t("palette_days_ago") || "days ago"
    }`;
    $("favPaletteBtn").dataset.icon = p.fav ? "starFilled" : "star";
    $("favPaletteBtn").innerHTML = ICONS[$("favPaletteBtn").dataset.icon];

    const strip = $("paletteStrip");
    strip.innerHTML = p.colors
      .map((c) => {
        const hex = safeHex(c.hex);
        return `<span style="background:${hex}" data-hex="${hex}" title="${hex}"></span>`;
      })
      .join("");
    strip.querySelectorAll("span").forEach((s) => {
      s.addEventListener("click", () => selectShadeColor(s.dataset.hex));
    });

    const rows = $("paletteColorsList");
    rows.innerHTML = "";
    p.colors.forEach((c, idx) => {
      const hex = safeHex(c.hex);
      const ratio = contrastToWhite(hex);
      const rating = ratingFor(ratio);
      const row = document.createElement("div");
      row.className = "palette-color-row";
      row.innerHTML = `
        <span class="palette-color-swatch" style="background:${hex}"></span>
        <span class="palette-color-name">${escapeHtml(c.name)}</span>
        <span class="palette-color-hex">${hex}</span>
        <span class="palette-color-rating ${rating === "AAA" ? "aaa" : rating === "AA" ? "aa" : ""}">${rating}</span>
        <span class="palette-color-ratio">${ratio.toFixed(2)}</span>
        <span class="palette-color-row-actions">
          <button type="button" data-act="edit" title="Edit">${icon("edit")}</button>
          <button type="button" data-act="delete" title="Delete">${icon("trash")}</button>
        </span>`;
      row.querySelector('[data-act="delete"]').addEventListener("click", () => {
        p.colors.splice(idx, 1);
        persistPalettes();
        renderPaletteList();
        renderPaletteMain();
      });
      row.querySelector('[data-act="edit"]').addEventListener("click", () => {
        const next = prompt(t("palette_edit_prompt") || "New HEX value:", hex);
        if (next && /^#?[0-9a-fA-F]{6}$/.test(next)) {
          c.hex = next.startsWith("#") ? next : "#" + next;
          persistPalettes();
          renderPaletteMain();
        }
      });
      row.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        selectShadeColor(hex);
      });
      rows.appendChild(row);
    });

    populateShadeSelect(p);
  }

  function populateShadeSelect(p) {
    const sel = $("shadeColorSelect");
    sel.innerHTML = p.colors
      .map(
        (c) =>
          `<option value="${safeHex(c.hex)}">${escapeHtml(c.name)} — ${safeHex(c.hex)}</option>`,
      )
      .join("");
    if (!activeColorHex || !p.colors.some((c) => c.hex === activeColorHex)) {
      activeColorHex = p.colors[0] ? p.colors[0].hex : "#6497B1";
    }
    sel.value = activeColorHex;
    renderPaletteShades(activeColorHex);
  }

  function selectShadeColor(hex) {
    activeColorHex = hex;
    $("shadeColorSelect").value = hex;
    renderPaletteShades(hex);
  }

  function renderPaletteShades(hex) {
    const list = $("paletteShadesList");
    list.innerHTML = "";
    const [r, g, b] = hexToRgb(hex);
    const [h, s] = rgbToHsl(r, g, b);
    const baseL = rgbToHsl(r, g, b)[2];
    for (let pct = 100; pct >= 0; pct -= 10) {
      // 100% — насыщенный тёмный оттенок, 0% — белый
      const l = 15 + ((100 - pct) / 100) * 85;
      const sAtStep = pct === 0 ? 0 : s;
      const [rr, gg, bb] = hslToRgb(h, sAtStep, l);
      const rowHex = rgbToHex(rr, gg, bb);
      const isCurrent = Math.abs(l - baseL) < 5;
      const row = document.createElement("div");
      row.className = "shade-row" + (isCurrent ? " current" : "");
      row.style.background = rowHex;
      row.style.color = contrastToWhite(rowHex) < 3 ? "#14161f" : "#fff";
      row.innerHTML = `
        <span class="shade-pct">${pct}%</span>
        <span class="shade-right">
          <span>${rowHex}</span>
          <button type="button" class="copy-btn" data-hex="${rowHex}">${icon("copy")}</button>
        </span>`;
      row.querySelector(".copy-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        copyText(rowHex);
      });
      list.appendChild(row);
    }
  }

  function wirePalettePage() {
    $("paletteSearch").addEventListener("input", (e) => {
      paletteQuery = e.target.value;
      renderPaletteList();
    });
    $("paletteFilter").addEventListener("change", (e) => {
      paletteFilterMode = e.target.value === "fav" ? "fav" : "all";
      renderPaletteList();
    });
    $("shadeColorSelect").addEventListener("change", (e) =>
      selectShadeColor(e.target.value),
    );
    $("favPaletteBtn").addEventListener("click", () => {
      const p = getActivePalette();
      p.fav = !p.fav;
      persistPalettes();
      renderPaletteMain();
    });
    $("renamePaletteBtn").addEventListener("click", () => {
      const p = getActivePalette();
      const next = prompt(
        t("palette_rename_prompt") || "Palette name:",
        p.name,
      );
      if (next && next.trim()) {
        p.name = next.trim();
        persistPalettes();
        renderPaletteList();
        renderPaletteMain();
      }
    });
    $("deletePaletteBtn").addEventListener("click", () => {
      if (palettes.length <= 1) {
        showToast(
          t("palette_cannot_delete_last") || "Keep at least one palette",
        );
        return;
      }
      if (!confirm(t("palette_delete_confirm") || "Delete this palette?"))
        return;
      palettes = palettes.filter((p) => p.id !== activePaletteId);
      activePaletteId = palettes[0].id;
      activeColorHex = null;
      persistPalettes();
      renderPaletteList();
      renderPaletteMain();
    });
    $("newPaletteBtn").addEventListener("click", () => {
      const name = prompt(
        t("palette_new_prompt") || "New palette name:",
        "New Palette",
      );
      if (!name || !name.trim()) return;
      const p = {
        id: "p" + Date.now(),
        name: name.trim(),
        created: 0,
        colors: [{ name: "Color 1", hex: "#6366F1" }],
      };
      palettes.unshift(p);
      activePaletteId = p.id;
      activeColorHex = null;
      persistPalettes();
      renderPaletteList();
      renderPaletteMain();
      showToast(t("toast_palette_created") || "Palette created");
    });
    $("addColorBtn").addEventListener("click", () => {
      const p = getActivePalette();
      const hex = rgbToHex(...hslToRgb(state.h, state.s, state.l));
      p.colors.push({ name: "New Color", hex });
      persistPalettes();
      renderPaletteMain();
      showToast(t("toast_color_added") || "Color added");
    });
    $("copyPaletteBtn").addEventListener("click", () => {
      const p = getActivePalette();
      copyText(p.colors.map((c) => safeHex(c.hex)).join(", "));
    });
    $("downloadPaletteBtn").addEventListener("click", () => {
      const p = getActivePalette();
      downloadFile(
        `${p.name.toLowerCase().replace(/\s+/g, "-")}.json`,
        JSON.stringify(p, null, 2),
        "application/json",
      );
    });
    $("sharePaletteBtn").addEventListener("click", async () => {
      const p = getActivePalette();
      const hexList = p.colors.map((c) => safeHex(c.hex)).join(", ");
      if (navigator.share) {
        try {
          await navigator.share({
            title: p.name,
            text: `${p.name} — ${hexList}`,
          });
        } catch (err) {
          // Пользователь закрыл системное окно «Поделиться» — ничего не делаем.
        }
        return;
      }
      copyText(hexList);
      showToast(
        t("toast_palette_link_copied") || "Palette colors copied to share",
      );
    });
    document.querySelectorAll("[data-ptab]").forEach((tabBtn) => {
      tabBtn.addEventListener("click", () => {
        document
          .querySelectorAll("[data-ptab]")
          .forEach((b) => b.classList.toggle("active", b === tabBtn));
        const showInfo = tabBtn.dataset.ptab === "info";
        $("paletteColorsList").hidden = showInfo;
        $("paletteInfo").hidden = !showInfo;
        if (showInfo) {
          const p = getActivePalette();
          $("paletteInfo").innerHTML = `
            <p>${t("palette_info_hint") || "This palette contains " + p.colors.length + " colors, ideal for UI, branding or illustration work."}</p>`;
        }
      });
    });
  }

  function initPalettePage() {
    wirePalettePage();
    renderPaletteList();
    renderPaletteMain();
  }

  /* ---------- Инициализация ---------- */
  mountIcons();
  applyThemeIcon();
  applyI18n();
  drawWheel();
  render();
  pushRecent();
  initPalettePage();
  recentColors = [
    "#9F7F60",
    "#C08552",
    "#8A6C4F",
    "#5B7FBF",
    "#7C5CBF",
    "#7C8291",
    "#B27C6A",
    "#E37FA0",
  ];
  renderRecent();

  /* ---------- Интеграция со страницей Library ---------- */
  window.addEventListener("cp:palettes-updated", () => {
    palettes = loadPalettes();
    renderPaletteList();
    renderPaletteMain();
  });
  window.addEventListener("cp:saved-colors-updated", () => {
    savedColors = loadSavedColors();
    renderSavedColors();
  });

  /* ---------- Защита от случайного перетаскивания файла мимо зоны
     загрузки: без этого браузер по умолчанию открывает файл прямо
     в текущей вкладке, заменяя содержимое сайта. ---------- */
  const imageDropzoneSelector = "#imgxDrop";
  document.addEventListener("dragover", (e) => {
    if (!e.target.closest(imageDropzoneSelector)) e.preventDefault();
  });
  document.addEventListener("drop", (e) => {
    if (e.target.closest(imageDropzoneSelector)) return;
    e.preventDefault();
    const file =
      e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      showToast(
        t("toast_use_image_page") ||
          "Drop images on the Image page to extract colors",
      );
    }
  });
})();

// colorUtils.js — конвертации цветовых моделей, гармония, контраст, имена цветов

/* ---------- Базовые конвертации ---------- */

function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  const num = parseInt(hex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")
  );
}

function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const d = max - min;
  let h;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d === 0) h = 0;
  else {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h * 360, s * 100, v * 100];
}

function rgbToCmyk(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return [0, 0, 0, 100];
  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);
  return [c * 100, m * 100, y * 100, k * 100];
}

function rgbToLab(r, g, b) {
  let [x, y, z] = rgbToXyz(r, g, b);
  x /= 95.047;
  y /= 100;
  z /= 108.883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x),
    fy = f(y),
    fz = f(z);
  const L = 116 * fy - 16;
  const A = 500 * (fx - fy);
  const B = 200 * (fy - fz);
  return [L, A, B];
}

/* ---------- LCH (полярная запись Lab) ---------- */

function labToLch(L, a, b) {
  const C = Math.sqrt(a * a + b * b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [L, C, H];
}

function rgbToLch(r, g, b) {
  const [L, a, bb] = rgbToLab(r, g, b);
  return labToLch(L, a, bb);
}

/* ---------- OKLab / OKLCH (Björn Ottosson) ---------- */

function rgbToOklab(r, g, b) {
  const lin = (v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const lr = lin(r),
    lg = lin(g),
    lb = lin(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l),
    m_ = Math.cbrt(m),
    s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

function rgbToOklch(r, g, b) {
  const [L, a, bb] = rgbToOklab(r, g, b);
  const C = Math.sqrt(a * a + bb * bb);
  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [L, C, H];
}

function rgbToXyz(r, g, b) {
  let [rr, gg, bb] = [r, g, b].map((v) => {
    v /= 255;
    return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
  });
  rr *= 100;
  gg *= 100;
  bb *= 100;
  const x = rr * 0.4124 + gg * 0.3576 + bb * 0.1805;
  const y = rr * 0.2126 + gg * 0.7152 + bb * 0.0722;
  const z = rr * 0.0193 + gg * 0.1192 + bb * 0.9505;
  return [x, y, z];
}

/* ---------- Контраст WCAG ---------- */

function relativeLuminance(r, g, b) {
  const [rr, gg, bb] = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
}

function contrastRatio(rgb1, rgb2) {
  const l1 = relativeLuminance(...rgb1);
  const l2 = relativeLuminance(...rgb2);
  const lighter = Math.max(l1, l2),
    darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function contrastLabel(rgb) {
  const white = [255, 255, 255];
  const black = [0, 0, 0];
  const ratio = Math.max(contrastRatio(rgb, white), contrastRatio(rgb, black));
  if (ratio >= 7) return { grade: "AAA", text: "Excellent Contrast" };
  if (ratio >= 4.5) return { grade: "AA", text: "Good Contrast" };
  return { grade: "—", text: "Low Contrast" };
}

/* ---------- Гармония цветов ---------- */

function colorHarmony(h, s, l) {
  const at = (hue) => hslToRgb((hue + 360) % 360, s, l);
  return {
    analogous: [h - 30, h, h + 30].map(at),
    complementary: [h, h + 180].map(at),
    triadic: [h, h + 120, h + 240].map(at),
    tetradic: [h, h + 90, h + 180, h + 270].map(at),
    monochromatic: [
      l * 0.4,
      l * 0.7,
      l,
      Math.min(l * 1.3 + 10, 95),
      Math.min(l * 1.6 + 20, 98),
    ].map((ll) => hslToRgb(h, s, ll)),
  };
}

/* ---------- Имена цветов (ближайшее совпадение CSS-палитры) ---------- */

const NAMED_COLORS = [
  ["Black", "#000000"],
  ["White", "#FFFFFF"],
  ["Silver", "#C0C0C0"],
  ["Gray", "#808080"],
  ["Charcoal", "#36454F"],
  ["Slate", "#708090"],
  ["Maroon", "#800000"],
  ["Red", "#FF0000"],
  ["Crimson", "#DC143C"],
  ["Firebrick", "#B22222"],
  ["Tomato", "#FF6347"],
  ["Coral", "#FF7F50"],
  ["Salmon", "#FA8072"],
  ["Orange Red", "#FF4500"],
  ["Orange", "#FFA500"],
  ["Amber", "#FFBF00"],
  ["Gold", "#FFD700"],
  ["Goldenrod", "#DAA520"],
  ["Khaki", "#F0E68C"],
  ["Olive", "#808000"],
  ["Yellow", "#FFFF00"],
  ["Lime", "#00FF00"],
  ["Forest Green", "#228B22"],
  ["Green", "#008000"],
  ["Emerald", "#50C878"],
  ["Teal", "#008080"],
  ["Turquoise", "#40E0D0"],
  ["Cyan", "#00FFFF"],
  ["Sky Blue", "#87CEEB"],
  ["Steel Blue", "#4682B4"],
  ["Blue", "#0000FF"],
  ["Royal Blue", "#4169E1"],
  ["Navy", "#000080"],
  ["Indigo", "#4B0082"],
  ["Violet", "#8A2BE2"],
  ["Purple", "#800080"],
  ["Orchid", "#DA70D6"],
  ["Magenta", "#FF00FF"],
  ["Pink", "#FFC0CB"],
  ["Hot Pink", "#FF69B4"],
  ["Rose", "#FF007F"],
  ["Brown", "#A52A2A"],
  ["Saddle Brown", "#8B4513"],
  ["Sienna", "#A0522D"],
  ["Chocolate", "#D2691E"],
  ["Peru", "#CD853F"],
  ["Tan", "#D2B48C"],
  ["Sand", "#C2B280"],
  ["Beige", "#F5F5DC"],
  ["Ivory", "#FFFFF0"],
  ["Cream", "#FFFDD0"],
  ["Chestnut", "#954535"],
  ["Copper", "#B87333"],
  ["Bronze", "#CD7F32"],
  ["Rust", "#B7410E"],
  ["Terracotta", "#E2725B"],
  ["Mustard", "#FFDB58"],
  ["Mint", "#98FF98"],
  ["Lavender", "#E6E6FA"],
  ["Plum", "#DDA0DD"],
  ["Wheat", "#F5DEB3"],
  ["Peach", "#FFDAB9"],
  ["Apricot", "#FBCEB1"],
  ["Taupe", "#483C32"],
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

/* ---------- Экранирование HTML (защита от XSS при выводе
   пользовательских строк — например, названий палитр — через
   innerHTML) ---------- */

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

/* ---------- Строгая валидация HEX перед выводом в HTML-атрибуты
   (style="background:...", data-hex, title и т.п.). Хранимые данные
   (localStorage, импорт) могут быть повреждены или подделаны — валидный
   HEX никогда не нуждается в экранировании, поэтому вместо экранирования
   просто отбраковываем всё, что не похоже на #RRGGBB / #RGB. ---------- */

function safeHex(value, fallback) {
  const s = String(value).trim();
  return /^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$/.test(s)
    ? s
    : fallback || "#000000";
}

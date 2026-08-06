// accordion.js — превращает пронумерованные секции каждой страницы в
// раскрывающиеся блоки с шевроном (как в приложениях). При загрузке
// страницы все секции развёрнуты по умолчанию — сворачивание доступно
// только по клику пользователя. На десктопе визуально не влияет ни на
// что: карточки видны как обычно.

(function () {
  const BREAKPOINT = 1100;

  function isMobile() {
    return window.innerWidth <= BREAKPOINT;
  }

  function findHead(card) {
    const standard = card.querySelector(":scope > .card-head");
    if (standard) return standard;
    for (const child of card.children) {
      if (child.querySelector("h2, h3")) return child;
    }
    return null;
  }

  function enhanceCard(card) {
    if (card.dataset.accordionReady) return;
    if (card.dataset.noAccordion !== undefined) return;
    const head = findHead(card);
    if (!head) return;
    card.dataset.accordionReady = "1";

    const chevron = document.createElement("span");
    chevron.className = "icon card-collapse-chevron";
    chevron.innerHTML =
      (typeof ICONS !== "undefined" && ICONS.chevronDown) || "";
    head.appendChild(chevron);
    head.classList.add("card-head-toggle");

    // Все секции стартуют развёрнутыми — .collapsed не добавляется.
    // Свернуть можно только вручную, кликом по заголовку.

    head.addEventListener("click", (e) => {
      if (e.target.closest(".card-head-actions")) return;
      if (e.target.closest("button, a, input, select, label")) return;
      if (!isMobile()) return;
      card.classList.toggle("collapsed");
    });
  }

  function enhanceAll() {
    document.querySelectorAll(".app-page").forEach((page) => {
      page.querySelectorAll(".card").forEach((card) => enhanceCard(card));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhanceAll);
  } else {
    enhanceAll();
  }

  window.enhanceAccordionCards = enhanceAll;
})();

// accordion.js — на мобильной ширине превращает пронумерованные секции
// каждой страницы в раскрывающиеся блоки (первая секция открыта,
// остальные свёрнуты в одну строку с шевроном) — как в приложениях.
// На десктопе не влияет ни на что: карточки видны как обычно.

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

  function enhanceCard(card, expanded) {
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

    if (!expanded) card.classList.add("collapsed");

    head.addEventListener("click", (e) => {
      if (e.target.closest(".card-head-actions")) return;
      if (e.target.closest("button, a, input, select, label")) return;
      if (!isMobile()) return;
      card.classList.toggle("collapsed");
    });
  }

  function enhanceAll() {
    document.querySelectorAll(".app-page").forEach((page) => {
      const cards = page.querySelectorAll(".card");
      cards.forEach((card, i) => {
        let expanded = i === 0;
        if (card.dataset.accordionExpanded !== undefined) expanded = true;
        if (card.dataset.accordionCollapsed !== undefined) expanded = false;
        enhanceCard(card, expanded);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhanceAll);
  } else {
    enhanceAll();
  }

  window.enhanceAccordionCards = enhanceAll;
})();

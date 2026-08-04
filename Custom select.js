// custom-select.js — заменяет нативный вид <select> на тему приложения.
// Нативный <select> остаётся в DOM как источник истины (value/options/
// disabled/событие change) — весь существующий код на других страницах
// работает без изменений. Поверх него монтируется кастомная кнопка
// со списком в духе .menu-wrap/.menu, уже используемого в приложении
// для Export / Saved Colors / переключателя языка.

(function () {
  const ENHANCED = new WeakSet();

  function buildList(select) {
    return Array.from(select.options).map((o) => ({
      value: o.value,
      text: o.textContent.trim(),
      disabled: o.disabled,
    }));
  }

  function currentLabel(select) {
    const opt = select.options[select.selectedIndex];
    return opt ? opt.textContent.trim() : "";
  }

  function enhance(select) {
    if (ENHANCED.has(select) || select.dataset.cselSkip !== undefined) return;
    ENHANCED.add(select);

    const wrap = document.createElement("div");
    wrap.className = "csel " + select.className;
    if (select.id) wrap.dataset.cselFor = select.id;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "csel-btn";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    if (select.hasAttribute("aria-label"))
      btn.setAttribute("aria-label", select.getAttribute("aria-label"));

    const labelEl = document.createElement("span");
    labelEl.className = "csel-label";

    const chevron = document.createElement("span");
    chevron.className = "icon csel-chevron";
    chevron.innerHTML =
      (typeof ICONS !== "undefined" && ICONS.chevronDown) || "";

    btn.appendChild(labelEl);
    btn.appendChild(chevron);

    const list = document.createElement("ul");
    list.className = "csel-list";
    list.setAttribute("role", "listbox");
    list.hidden = true;

    wrap.appendChild(btn);
    wrap.appendChild(list);

    select.insertAdjacentElement("afterend", wrap);
    select.style.display = "none";

    let activeIndex = -1;

    function syncDisabled() {
      const disabled = select.disabled;
      btn.disabled = disabled;
      wrap.classList.toggle("csel-disabled", disabled);
    }

    function syncLabel() {
      labelEl.textContent = currentLabel(select);
    }

    function closeList() {
      list.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      wrap.classList.remove("open");
    }

    function openList() {
      if (select.disabled) return;
      document.querySelectorAll(".csel.open").forEach((el) => {
        if (el !== wrap) el.dispatchEvent(new CustomEvent("csel:close"));
      });
      rebuildList();
      list.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      wrap.classList.add("open");
      const activeLi = list.querySelector('[aria-selected="true"]');
      if (activeLi) activeLi.scrollIntoView({ block: "nearest" });
    }

    wrap.addEventListener("csel:close", closeList);

    function rebuildList() {
      const items = buildList(select);
      list.innerHTML = "";
      activeIndex = select.selectedIndex;
      items.forEach((item, i) => {
        const li = document.createElement("li");
        li.className = "csel-option";
        li.setAttribute("role", "option");
        li.dataset.index = i;
        li.textContent = item.text;
        if (item.disabled) li.setAttribute("aria-disabled", "true");
        if (i === select.selectedIndex) {
          li.setAttribute("aria-selected", "true");
          li.classList.add("active");
        }
        li.addEventListener("click", () => {
          if (item.disabled) return;
          select.selectedIndex = i;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          closeList();
          btn.focus();
        });
        list.appendChild(li);
      });
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (list.hidden) openList();
      else closeList();
    });

    btn.addEventListener("keydown", (e) => {
      const opts = Array.from(list.children);
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (list.hidden) openList();
        else if (activeIndex >= 0 && opts[activeIndex])
          opts[activeIndex].click();
        return;
      }
      if (e.key === "Escape") {
        closeList();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (list.hidden) {
          openList();
          return;
        }
        const dir = e.key === "ArrowDown" ? 1 : -1;
        let next = activeIndex;
        for (let step = 0; step < opts.length; step++) {
          next = (next + dir + opts.length) % opts.length;
          if (!opts[next].hasAttribute("aria-disabled")) break;
        }
        activeIndex = next;
        opts.forEach((o, i) =>
          o.classList.toggle("focused", i === activeIndex),
        );
        opts[activeIndex] &&
          opts[activeIndex].scrollIntoView({ block: "nearest" });
        return;
      }
      if (e.key === "Home" && !list.hidden) {
        e.preventDefault();
        activeIndex = 0;
        opts.forEach((o, i) => o.classList.toggle("focused", i === 0));
      }
      if (e.key === "End" && !list.hidden) {
        e.preventDefault();
        activeIndex = opts.length - 1;
        opts.forEach((o, i) =>
          o.classList.toggle("focused", i === opts.length - 1),
        );
      }
    });

    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) closeList();
    });

    // Программные изменения .value (например, populateShadeSelect) должны
    // сразу отражаться в кастомной подписи кнопки.
    const valueDesc = Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      "value",
    );
    Object.defineProperty(select, "value", {
      configurable: true,
      get() {
        return valueDesc.get.call(select);
      },
      set(v) {
        valueDesc.set.call(select, v);
        syncLabel();
      },
    });

    // Изменение списка опций (динамическое заполнение через innerHTML,
    // а также обновление текста <option> при переключении языка через i18n)
    const optionsObserver = new MutationObserver(() => {
      syncLabel();
      if (!list.hidden) rebuildList();
    });
    optionsObserver.observe(select, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Изменение атрибута disabled (например, переключение вкладок Library)
    const disabledObserver = new MutationObserver(syncDisabled);
    disabledObserver.observe(select, {
      attributes: true,
      attributeFilter: ["disabled"],
    });

    select.addEventListener("change", syncLabel);

    syncLabel();
    syncDisabled();
    rebuildList();
  }

  function enhanceAll(root) {
    (root || document).querySelectorAll("select").forEach(enhance);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => enhanceAll());
  } else {
    enhanceAll();
  }

  // Публичный хук на случай появления новых <select> после начальной загрузки
  window.enhanceCustomSelects = enhanceAll;
})();

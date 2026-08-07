// pwa.js — регистрация service worker, кнопка «Установить приложение»
// и локальные уведомления (без сервера — Notification API напрямую).

(function () {
  const $ = (id) => document.getElementById(id);

  /* ---------- Service worker (офлайн-кэш) ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {
        // Тихо игнорируем — например, если страница открыта как file://,
        // где service worker недоступен по спецификации браузеров.
      });
    });
  }

  /* ---------- Кнопка «Установить приложение» ---------- */
  let deferredInstallPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const btn = $("resInstallBtn");
    if (btn) btn.hidden = false;
  });

  function wireInstallButton() {
    const btn = $("resInstallBtn");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      btn.hidden = true;
    });
    window.addEventListener("appinstalled", () => {
      btn.hidden = true;
      deferredInstallPrompt = null;
    });
  }

  /* ---------- Локальные уведомления ---------- */
  function updateNotifyStatus() {
    const status = $("resAppStatus");
    const btn = $("resNotifyBtn");
    if (!status || !btn) return;
    if (!("Notification" in window)) {
      status.textContent =
        (window.t && t("res_app_notify_unsupported")) ||
        "Notifications are not supported in this browser.";
      btn.disabled = true;
      return;
    }
    if (Notification.permission === "granted") {
      status.textContent =
        (window.t && t("res_app_notify_on")) || "Notifications are enabled.";
      btn.disabled = true;
    } else if (Notification.permission === "denied") {
      status.textContent =
        (window.t && t("res_app_notify_blocked")) ||
        "Notifications are blocked in your browser settings.";
      btn.disabled = true;
    } else {
      status.textContent = "";
      btn.disabled = false;
    }
  }

  function wireNotifyButton() {
    const btn = $("resNotifyBtn");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      if (!("Notification" in window)) return;
      const perm = await Notification.requestPermission();
      updateNotifyStatus();
      if (perm === "granted") {
        // Пробное уведомление, чтобы подтвердить, что всё работает.
        try {
          if (navigator.serviceWorker && navigator.serviceWorker.ready) {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification("HTML Color Picker PRO", {
              body:
                (window.t && t("res_app_notify_welcome")) ||
                "You'll now get reminders here.",
              icon: "icon-192.png",
              badge: "icon-192.png",
            });
          } else {
            new Notification("HTML Color Picker PRO", {
              body:
                (window.t && t("res_app_notify_welcome")) ||
                "You'll now get reminders here.",
              icon: "icon-192.png",
            });
          }
        } catch (e) {}
      }
    });
  }

  function init() {
    wireInstallButton();
    wireNotifyButton();
    updateNotifyStatus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

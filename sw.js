/* sw.js — офлайн-кэш всего приложения ("app shell"). Стратегия
   cache-first: сначала пробуем локальный кэш, к сети обращаемся
   только если файла там нет. При обновлении версии CACHE_NAME
   старый кэш автоматически подчищается. */

const CACHE_NAME = "color-picker-pro-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./favicon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./reset.css",
  "./tokens.css",
  "./styles.css",
  "./custom-select.css",
  "./Library.css",
  "./accessibility.css",
  "./resources.css",
  "./image-extractor.css",
  "./accordion.css",
  "./icons.js",
  "./colorUtils.js",
  "./i18n.js",
  "./custom-select.js",
  "./script.js",
  "./Converter.js",
  "./Library.js",
  "./accessibility.js",
  "./resources.js",
  "./image-extractor.js",
  "./accordion.js",
  "./pwa.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Кэшируем свежую копию на будущее (только успешные, свои же запросы).
          if (
            response &&
            response.status === 200 &&
            response.type === "basic"
          ) {
            const copy = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          // Полностью офлайн и файла нет в кэше — отдаём главную страницу
          // как разумный запасной вариант для навигационных запросов.
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
    }),
  );
});

/* ---------- Локальные уведомления (без сервера) ---------- */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow("./index.html");
    }),
  );
});

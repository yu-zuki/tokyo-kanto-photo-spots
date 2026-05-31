const CACHE = "photo-spots-v1";
const ASSETS = [
  "/tokyo-kanto-photo-spots/",
  "/tokyo-kanto-photo-spots/index.html",
  "/tokyo-kanto-photo-spots/assets/app.js",
  "/tokyo-kanto-photo-spots/assets/styles.css",
  "/tokyo-kanto-photo-spots/assets/data.js",
  "/tokyo-kanto-photo-spots/assets/photo_meta.js",
  "/tokyo-kanto-photo-spots/assets/japanese_photo_refs.js",
  "/tokyo-kanto-photo-spots/assets/spot_locations.js",
  "/tokyo-kanto-photo-spots/assets/map_config.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("fetch", (event) => {
  // For API calls, use network-first (weather data must be fresh)
  if (event.request.url.includes("open-meteo.com")) {
    return;
  }
  // For static assets, use cache-first then network fallback
  event.respondWith(
    caches.match(event.request).then(
      (cached) => cached || fetch(event.request)
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
});

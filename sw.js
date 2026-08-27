const CACHE_NAME = "fixam9ja-shell-v3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./account.html",
  "./artisan-plans.html",
  "./help.html",
  "./policies.html",
  "./disclaimer.html",
  "./privacy.html",
  "./account-deletion.html",
  "./styles.css",
  "./account.css",
  "./help-widget.css",
  "./app.js",
  "./account.js",
  "./review.js",
  "./location-data.js",
  "./supabase-config.js",
  "./fixam-logo.jpg",
  "./fixam-logo-header.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  const isNavigation = event.request.mode === "navigate";
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || (isNavigation ? caches.match("./index.html") : Response.error()))),
  );
});

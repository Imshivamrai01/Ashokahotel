// Ashoka Hotel — Service Worker
// Handles: PWA offline caching + Web Push notifications for captain calls

// Bump this on every deploy that changes hashed assets — `activate` purges all
// caches that don't match, so stale _next/static chunks can't cause ChunkLoadError.
const CACHE_VERSION = "v4";
const STATIC_CACHE = `ashoka-static-${CACHE_VERSION}`;
const ALL_CACHES = [STATIC_CACHE];

// Pre-cache only public, cacheable assets. Auth-gated routes (/captain,
// /kitchen, /cashier) are intentionally excluded — for an unauthenticated SW
// request they return a login redirect, and caching that as the "app shell"
// would show staff a stale login page offline.
const PRECACHE_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/buzzer.mp3",
];

// ── Install: pre-cache app shell ─────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        // Resilient: one missing asset must not abort the whole install.
        Promise.allSettled(PRECACHE_ASSETS.map((a) => cache.add(a))),
      )
      .then(() => self.skipWaiting()),
  );
});

// ── Activate: clean up old caches ─────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !ALL_CACHES.includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Fetch: caching strategies ─────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin, browser extensions
  if (
    request.method !== "GET" ||
    !url.origin.startsWith("http") ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // API routes — NETWORK ONLY. Never cache: these are auth-gated and
  // time-sensitive (orders, bills, table state). Serving a cached copy offline
  // would present stale data as if live and could outlive logout. On failure we
  // return an explicit 503 so the client shows an error instead of fake data.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            JSON.stringify({ error: "offline" }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );
    return;
  }

  // Static assets (_next/static, icons, fonts) — cache first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?|mp3)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Navigation requests (HTML pages) — network first, cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request) || caches.match("/")),
    );
    return;
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "🔔 Table Calling!",
      body: event.data.text(),
      tag: "captain-call",
    };
  }

  const options = {
    body: payload.body ?? "",
    tag: payload.tag ?? "captain-call",
    renotify: true,
    requireInteraction: true, // stays on screen until dismissed
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    vibrate: [200, 100, 200, 100, 200],
    data: payload.data ?? {},
    actions: [
      { action: "acknowledge", title: "✓ On My Way" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(
      payload.title ?? "Table Calling!",
      options,
    ),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "acknowledge" || event.action === "") {
    // Focus the captain app window or open it
    event.waitUntil(
      clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((windowClients) => {
          // Find an existing captain window
          const captainWindow = windowClients.find((c) =>
            c.url.includes("/captain"),
          );
          if (captainWindow) {
            return captainWindow.focus();
          }
          // Open new window if none found
          return clients.openWindow("/captain");
        }),
    );
  }
});

self.addEventListener("notificationclose", () => {
  // Notification was swiped away — no action needed
});

// Aura Service Worker — v4
// Strategy:
//   - Navigation (HTML) → Network-first (toujours la version fraîche)
//   - _next/static/ (chunks JS/CSS hachés) → Cache-first (immutables)
//   - Images/assets → Stale-while-revalidate
//   - API / Supabase → Bypass (pas de cache)

const STATIC_CACHE  = "aura-static-v4";   // chunks Next.js (immutables par hash)
const DYNAMIC_CACHE = "aura-dynamic-v4";  // images, fonts, etc.

// ── Install ──────────────────────────────────────────────────
self.addEventListener("install", () => {
  self.skipWaiting();
});

// ── Activate : supprime tous les anciens caches ──────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ────────────────────────────────────────────────────
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);

  // 1. API / Supabase / auth → réseau direct, pas de cache
  if (
    url.hostname.includes("supabase") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/")
  ) return;

  // 2. Chunks Next.js (_next/static/) → Cache-first
  //    Ces fichiers ont un hash dans leur nom → immutables
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(e.request).then((cached) => {
          if (cached) return cached;
          return fetch(e.request).then((res) => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // 3. Navigations HTML (pages) → Network-first
  //    On va TOUJOURS chercher la version fraîche en priorité
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match(e.request).then((c) => c ?? caches.match("/"))
      )
    );
    return;
  }

  // 4. Autres assets (images, fonts, icons) → Stale-while-revalidate
  e.respondWith(
    caches.open(DYNAMIC_CACHE).then((cache) =>
      cache.match(e.request).then((cached) => {
        const fresh = fetch(e.request).then((res) => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => cached);
        return cached ?? fresh;
      })
    )
  );
});

// ── Push Notifications ──────────────────────────────────────
self.addEventListener("push", (e) => {
  const data  = e.data?.json() ?? {};
  const title = data.title ?? "Vaiiya";
  const body  = data.body  ?? "Nouvelle notification";
  const icon  = data.icon  ?? "/icons/icon-192.png";
  const url   = data.url   ?? "/";

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: "/icons/icon-192.png",
      data: { url },
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url ?? "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

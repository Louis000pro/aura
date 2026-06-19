// Vaiiya Service Worker — v10 (HTML réseau-strict : déploiements toujours frais en ligne)
// Stratégie :
//   - Navigation (HTML) → Réseau STRICT d'abord : on sert toujours la page
//     fraîche quand on est en ligne (un déploiement est visible immédiatement),
//     cache en secours UNIQUEMENT si le réseau échoue (hors-ligne).
//   - _next/static/ (chunks hashés, immuables) → Cache-first, cache PERMANENT
//     (jamais purgé → une page en cache trouve toujours ses chunks).
//   - Images/fonts → Stale-While-Revalidate.
//   - API / Supabase / auth → réseau direct (pas de cache).

const STATIC_CACHE  = "vaiiya-static";   // chunks immuables — jamais purgés
const HTML_CACHE    = "vaiiya-html";     // pages (SWR)
const DYNAMIC_CACHE = "vaiiya-dynamic";  // images, fonts, etc.
const KEEP = [STATIC_CACHE, HTML_CACHE, DYNAMIC_CACHE];

// ── Install : pré-cache l'app-shell ("/") pour un 1er lancement instantané ──
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(HTML_CACHE).then((c) => c.add("/")).catch(() => {})
  );
  self.skipWaiting();
});

// ── Activate : supprime les anciens caches (aura-*, versions précédentes) ──
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ────────────────────────────────────────────────────
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // 1. Supabase : on CACHE les images de storage (pdp, posters) mais on
  //    bypass l'API/auth/realtime et les vidéos (range requests).
  if (url.hostname.includes("supabase")) {
    const isStorageImg =
      url.pathname.includes("/storage/v1/object/public/") &&
      /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(url.pathname);
    if (!isStorageImg) return; // auth/rest/realtime/vidéos → réseau direct
    // image de storage → continue vers le cache SWR (étape 4)
  } else if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  // 2. Chunks Next.js (immuables par hash) → Cache-first PERMANENT
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(e.request).then((cached) =>
          cached ||
          fetch(e.request).then((res) => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          })
        )
      )
    );
    return;
  }

  // 3. Navigations HTML → Réseau STRICT d'abord, secours cache UNIQUEMENT si le
  //    réseau échoue (hors-ligne). Plus de timeout : un déploiement est donc
  //    TOUJOURS visible dès qu'on est en ligne (fini le cache périmé servi sur
  //    réseau lent / VPN). L'app reste fonctionnelle hors-ligne via le cache.
  if (e.request.mode === "navigate") {
    e.respondWith((async () => {
      const cache = await caches.open(HTML_CACHE);
      try {
        const net = await fetch(e.request);
        if (net && net.ok) cache.put(e.request, net.clone());
        return net;
      } catch {
        return (await cache.match(e.request)) || (await cache.match("/")) || Response.error();
      }
    })());
    return;
  }

  // 4. Autres assets (images, fonts, icons) → Stale-While-Revalidate
  e.respondWith(
    caches.open(DYNAMIC_CACHE).then((cache) =>
      cache.match(e.request).then((cached) => {
        const fresh = fetch(e.request)
          .then((res) => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || fresh;
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

// Vaiiya Service Worker, v16 (l'app s'ouvre depuis l'appareil)
// v16 (2026-11-18, Louis : « que ce soit quasiment instantané ») : les écrans
//   de l'app (l'accueil et les onglets, liste `ECRANS_INSTANTANES`) ne
//   s'ouvrent plus en attendant le réseau. Le service worker rend tout de
//   suite la page gardée sur l'appareil, et va chercher la fraîche EN MÊME
//   TEMPS, qu'il range pour la fois suivante. Ces pages sont statiques (la
//   même coquille pour tout le monde, les données arrivent ensuite de
//   Supabase), donc rendre la copie gardée ne montre rien de faux.
//   ⚠️ UNE MISE EN LIGNE N'EST PAS RATÉE POUR AUTANT : quand la page fraîche
//   vient d'une autre version que la copie gardée (`x-vaiiya-deploiement`),
//   toutes les autres copies sont jetées et la page ouverte est prévenue.
//   Le premier changement de page se fait alors en entier, sur la nouvelle
//   version (voir le script du <head> dans `app/layout.tsx`). Une copie de
//   plus de sept jours n'est plus rendue : on attend le réseau.
//   Toutes les autres pages restent en réseau strict, comme avant.
// v15 (2026-11-03) : à l'installation, le service worker ne garde plus
//   seulement le HTML de « / » : il lit ce HTML, et celui des quatre onglets,
//   et met en cache tous les fichiers `_next/static` qu'ils réclament (code et
//   styles), plus les icônes de l'app. Une fois la première visite faite,
//   l'ouverture suivante n'attend plus que la page elle-même : tout le reste
//   est déjà sur l'appareil. Les stratégies de cache ne changent pas (pages en
//   réseau strict, donc un déploiement reste visible tout de suite).
// v14 (2026-10-27) : deux changements, et la stratégie des pages ne bouge pas.
//   1. Une requête de navigation interne ou de préchargement de Next (marquée
//      `_rsc=`) ne passe PLUS par le cache. Elle tombait dans le « reste »
//      (stale-while-revalidate) : on servait la réponse d'hier, souvent d'une
//      version précédente, et Next devait alors recharger la page en entier ;
//      chaque préchargement écrivait en plus dans le cache. Next garde
//      lui-même ces réponses en mémoire, il n'a pas besoin de nous.
//   2. Sur Chrome 123+ (Android compris), les appels à l'API, à Supabase et
//      ces navigations ne RÉVEILLENT plus le service worker (`addRoutes`) :
//      un appui après une minute d'inactivité ne paie plus son démarrage.
//      Ailleurs (Safari), le gestionnaire `fetch` les laisse passer comme
//      avant.
// v13 : au démarrage à froid (icône de l'iPhone), le navigateur doit d'abord
// réveiller ce service worker avant qu'il ne demande la page au réseau. Avec
// le « navigation preload », la requête part EN MÊME TEMPS que le réveil : la
// page arrive plus tôt, et la stratégie ne change pas (réseau strict, donc un
// déploiement reste visible tout de suite). Safari le gère depuis iOS 15.4.
// v12 (une seconde tentative sur les chunks)
// v11 (HTML réseau-strict + purge ciblée à la demande)
//
// ⚠️ v11 N'A CHANGÉ AUCUNE STRATÉGIE DE CACHE. Le seul ajout est un
// gestionnaire `message` qui permet à l'écran de secours (`app/error.tsx`) de
// demander la purge du cache HTML. Les navigations restent en réseau strict,
// les chunks en cache-first permanent, les assets en stale-while-revalidate.
//
// Stratégie :
//   - Écrans de l'app (v16) → la copie gardée tout de suite, la fraîche
//     derrière, et toutes les copies jetées quand une version change.
//   - Autres navigations (HTML) → Réseau STRICT d'abord : on sert toujours la page
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

// ── Une requête de navigation interne de Next (RSC) ──
// Next ajoute `_rsc=` à toutes, préchargements compris : c'est le repère le
// plus sûr, l'en-tête `RSC` ne sert que de seconde lecture.
function estNavigationInterne(url, request) {
  return url.searchParams.has("_rsc") || request.headers.get("rsc") === "1";
}

// ── Ce qui part au réseau sans réveiller le service worker (Chrome 123+) ──
// ⚠️ Rien ici ne peut faire échouer l'installation : un navigateur qui ne
// connaît pas `addRoutes`, ou qui refuse une règle, garde simplement le
// gestionnaire `fetch` ci-dessous, qui laisse passer ces mêmes requêtes.
// Les images de Supabase (storage) ne sont PAS dans la liste : le cache les
// garde, comme avant.
// Les chemins s'écrivent `/api/:chemin*` (« /api, puis n'importe quoi ») et
// pas avec une barre suivie d'une étoile : ces deux signes collés ouvrent un
// commentaire pour les bancs qui lisent ce fichier.
function routesDirectes(e) {
  try {
    if (typeof e.addRoutes !== "function" || typeof URLPattern !== "function") return Promise.resolve();
    return Promise.resolve(e.addRoutes([
      { condition: { urlPattern: new URLPattern({ pathname: "/api/:chemin*" }) }, source: "network" },
      { condition: { urlPattern: new URLPattern({ search: "*_rsc=*" }) }, source: "network" },
      { condition: { urlPattern: new URLPattern({ hostname: "*.supabase.co", pathname: "/rest/:chemin*" }) }, source: "network" },
      { condition: { urlPattern: new URLPattern({ hostname: "*.supabase.co", pathname: "/auth/:chemin*" }) }, source: "network" },
    ])).catch(() => {});
  } catch {
    return Promise.resolve();
  }
}

// ── Install : pré-cache l'app-shell ("/") pour un 1er lancement instantané ──
// Les écrans dont on garde le code d'avance. Les pages derrière la connexion
// rendent leur coquille sans session : on n'en garde que les fichiers statiques.
const COQUILLE = ["/", "/progression", "/nutrition", "/communaute", "/profil"];
const ICONES = ["/icons/icon-192.png", "/manifest.json"];

// Lit un document HTML et met en cache chaque fichier `_next/static` qu'il
// réclame. Rien ici ne peut faire échouer l'installation.
async function installerCoquille() {
  const html = await caches.open(HTML_CACHE);
  const statique = await caches.open(STATIC_CACHE);
  const fichiers = new Set();
  await Promise.all(COQUILLE.map(async (chemin) => {
    try {
      const res = await fetch(chemin, { credentials: "same-origin" });
      if (!res.ok) return;
      if (ECRANS_INSTANTANES.has(chemin)) await garderPage(html, chemin, res.clone());
      const texte = await res.text();
      for (const m of texte.matchAll(/["'(](\/_next\/static\/[^"'()\s\\]+\.(?:js|css|woff2))(?=["')\\])/g)) fichiers.add(m[1]);
    } catch { /* hors ligne : on réessaiera à la prochaine installation */ }
  }));
  // Quatre téléchargements à la fois, pas cinquante : un téléphone en 4G ne
  // gagne rien à tout lancer d'un coup, et chaque fichier a sa limite de
  // temps (une requête qui ne répond pas ne doit pas bloquer l'installation).
  const file = [...fichiers];
  const ouvrier = async () => {
    while (file.length) {
      const f = file.shift();
      try {
        if (await statique.match(f)) continue;
        const ctrl = new AbortController();
        const limite = setTimeout(() => ctrl.abort(), 15000);
        const res = await fetch(f, { signal: ctrl.signal }).finally(() => clearTimeout(limite));
        if (res.ok) await statique.put(f, res);
      } catch { /* ignore */ }
    }
  };
  await Promise.all([ouvrier(), ouvrier(), ouvrier(), ouvrier()]);
  const dyn = await caches.open(DYNAMIC_CACHE);
  await Promise.all(ICONES.map((f) => dyn.add(f).catch(() => {})));
}

self.addEventListener("install", (e) => {
  e.waitUntil(Promise.all([
    installerCoquille().catch(() => {}),
    routesDirectes(e),
  ]));
  self.skipWaiting();
});

// ── Activate : supprime les anciens caches (aura-*, versions précédentes) ──
// v14 : retire aussi les réponses de navigation interne que v13 rangeait
// dans `vaiiya-dynamic` ; elles ne serviront plus jamais.
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => caches.open(DYNAMIC_CACHE)
        .then((c) => c.keys().then((reqs) => Promise.all(
          reqs.filter((r) => new URL(r.url).searchParams.has("_rsc")).map((r) => c.delete(r)),
        )))
        .catch(() => {}))
      .then(() => self.registration.navigationPreload?.enable().catch(() => {}))
      .then(() => self.clients.claim())
  );
});

// ── Les écrans qui s'ouvrent depuis l'appareil (v16) ─────────
// Seulement des pages STATIQUES de l'app : leur HTML est le même pour tout le
// monde (`○` au build), les données de la personne arrivent après, de
// Supabase. Une page rendue par le serveur pour quelqu'un (le profil d'un ami,
// une discussion) n'a rien à faire ici.
const ECRANS_INSTANTANES = new Set(["/", "/progression", "/nutrition", "/communaute", "/profil", "/parametres"]);
const ENTETE_VERSION = "x-vaiiya-deploiement";
const ENTETE_GARDE = "x-vy-garde-le";
const AGE_MAX_COPIE = 7 * 24 * 3600 * 1000;

// Un rechargement demandé (le bouton « Recharger » de l'écran de secours
// purge d'abord le cache, mais un navigateur peut aussi le dire) part au
// réseau.
function rechargementDemande(request) {
  return request.cache === "reload" || request.cache === "no-store";
}

// Garde une page fraîche, avec l'heure où on l'a gardée. La clé est le chemin
// seul : les paramètres (`?ouvrir=…`) ne changent pas le HTML d'une page
// statique, l'écran les lit lui-même dans l'adresse.
async function garderPage(cache, chemin, res) {
  const entetes = new Headers(res.headers);
  entetes.set(ENTETE_GARDE, String(Date.now()));
  const corps = await res.blob();
  await cache.put(chemin, new Response(corps, { status: res.status, statusText: res.statusText, headers: entetes }));
}

async function ouvrirInstantane(e, chemin) {
  const cache = await caches.open(HTML_CACHE);
  const gardee = await cache.match(chemin).catch(() => undefined);
  const age = gardee ? Date.now() - Number(gardee.headers.get(ENTETE_GARDE) || 0) : Infinity;

  // La page fraîche, toujours demandée (le préchargement de navigation est
  // déjà parti pendant le réveil du service worker).
  const fraiche = (async () => {
    const pre = await Promise.resolve(e.preloadResponse).catch(() => undefined);
    const res = pre || (await fetch(e.request));
    if (!res || !res.ok || res.redirected || res.type === "opaqueredirect") return res;
    const avant = gardee && gardee.headers.get(ENTETE_VERSION);
    const apres = res.headers.get(ENTETE_VERSION);
    if (avant && apres && avant !== apres) {
      // Nouvelle version en ligne : les autres copies sont d'une version
      // disparue, on les jette toutes avant de garder la fraîche.
      await caches.delete(HTML_CACHE).catch(() => {});
      const neuf = await caches.open(HTML_CACHE);
      await garderPage(neuf, chemin, res.clone());
      prevenirNouvelleVersion(apres);
    } else {
      await garderPage(cache, chemin, res.clone());
    }
    return res;
  })();

  if (gardee && age < AGE_MAX_COPIE) {
    e.waitUntil(fraiche.catch(() => {}));
    return gardee;
  }
  try {
    const res = await fraiche;
    if (res) return res;
  } catch { /* hors ligne */ }
  return gardee || (await cache.match("/")) || Response.error();
}

function prevenirNouvelleVersion(version) {
  self.clients.matchAll({ type: "window", includeUncontrolled: true })
    .then((liste) => { for (const c of liste) c.postMessage({ type: "vaiiya-nouvelle-version", version }); })
    .catch(() => {});
}

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

  // 1 bis. Navigation interne ou préchargement de Next → réseau direct,
  //        jamais de cache (v14, voir en tête du fichier).
  if (estNavigationInterne(url, e.request)) return;

  // 2. Chunks Next.js (immuables par hash) → Cache-first PERMANENT
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(e.request).then((cached) =>
          cached ||
          // Un réseau qui vacille au démarrage faisait échouer la feuille de
          // style, et la page s'affichait en texte brut : on retente une fois.
          fetch(e.request).catch(() => fetch(e.request)).then((res) => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          })
        )
      )
    );
    return;
  }

  // 2 bis. Les écrans de l'app → la copie gardée tout de suite, la fraîche
  //        derrière (v16, voir en tête du fichier).
  if (e.request.mode === "navigate" && ECRANS_INSTANTANES.has(url.pathname) && !rechargementDemande(e.request)) {
    e.respondWith(ouvrirInstantane(e, url.pathname));
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
        // La réponse préchargée pendant le réveil du service worker, sinon
        // une requête normale (navigateur sans preload, ou preload refusé).
        const pre = await Promise.resolve(e.preloadResponse).catch(() => undefined);
        const net = pre || (await fetch(e.request));
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

// ── Purge ciblée, demandée par l'écran de secours ────────────
//
// ⚠️ SEUL `vaiiya-html` EST PURGEABLE, ET C'EST UN ARBITRAGE, PAS UNE
// PRÉCAUTION. C'est le seul cache dont le contenu peut être FAUX plutôt que
// simplement vieux : il reçoit toute navigation réussie (étape 3), donc il
// peut porter le document d'un build disparu, et il accepterait aussi une page
// de contrôle anti-robot, qui répond en 200.
//
// ⚠️ `vaiiya-static` N'EST PAS PURGÉ, ET IL NE FAUT PAS L'AJOUTER ICI. Ses URL
// sont hachées par contenu, donc immuables : une entrée en cache est toujours
// les bons octets pour cette URL-là. Le vider ne peut donc pas réparer un
// chunk manquant, puisque le problème est justement une URL qui n'est PAS dans
// le cache et qui répond 404 sur le réseau. Ça ne ferait que retélécharger des
// fichiers corrects et détruire le fonctionnement hors ligne, au moment précis
// où quelqu'un a peut-être simplement un réseau qui vacille. (Que ce cache
// grossisse sans fin est un vrai sujet, mais c'en est un autre : il ne cause
// pas cette panne.)
//
// `vaiiya-dynamic` (images, polices) n'a aucun rapport avec le chargement des
// modules. Pas de `caches.keys()` balayé aveuglément : la liste est explicite.
const PURGEABLES = [HTML_CACHE];

self.addEventListener("message", (e) => {
  if (!e.data || e.data.type !== "vaiiya-purge") return;
  const port = e.ports && e.ports[0];
  e.waitUntil(
    (async () => {
      const purges = [];
      for (const nom of PURGEABLES) {
        try {
          if (await caches.delete(nom)) purges.push(nom);
        } catch { /* un cache qui refuse de partir ne bloque pas le reste */ }
      }
      // La réponse est un confort : l'appelant borne son attente et recharge
      // de toute façon. Un service worker d'une version antérieure ne répond
      // pas du tout, et c'est un cas prévu côté client.
      try { if (port) port.postMessage({ ok: true, purges }); } catch { /* ignore */ }
    })(),
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
      data: { url, suivi: data.suivi },
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const suivi = e.notification.data?.suivi;
  if (suivi?.id && suivi?.token) {
    const controle = new AbortController();
    const limite = setTimeout(() => controle.abort(), 4000);
    e.waitUntil(fetch("/api/notifications/touchee", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(suivi), signal: controle.signal,
    }).catch(() => {}).finally(() => clearTimeout(limite)));
  }
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

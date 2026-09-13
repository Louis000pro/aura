/**
 * Le secours des frontières d'erreur (`app/error.tsx`, `app/global-error.tsx`).
 *
 * ⚠️ CE FICHIER N'IMPORTE RIEN. Il est chargé par les deux seuls écrans qui
 * s'affichent quand le reste de l'application vient d'échouer, et le mode
 * d'échec le plus probable est justement « un module ne se charge pas » : une
 * dépendance ici pourrait empêcher l'écran de secours de s'afficher du tout.
 * C'est la raison pour laquelle `framer-motion` a quitté `error.tsx`.
 *
 * ⚠️ ET RIEN ICI NE JETTE JAMAIS. Une exception levée depuis une frontière
 * d'erreur ne serait rattrapée par personne. D'où les `try/catch`, y compris
 * autour de choses d'apparence inoffensive : `sessionStorage` jette pour de
 * bon quand le navigateur bloque le stockage.
 */

/** Le commit du déploiement, posé par `next.config.ts`. Vide en local : on ne
 *  fabrique pas une fausse version. Sert au DIAGNOSTIC, jamais au verrou. */
export const BUILD_ID: string = process.env.NEXT_PUBLIC_BUILD_ID || "local";

/** ⚠️ CLÉ INDÉPENDANTE DU BUILD, ET C'EST TOUT L'INTÉRÊT. Une clé qui portait
 *  le build laissait passer ceci : build A échoue → secours → rechargement →
 *  build B est servi → l'erreur persiste → la clé a changé → un SECOND secours
 *  partait aussitôt. La règle est « une tentative par incident », pas « une
 *  tentative par build ». Le build reste dans la VALEUR, pour le journal. */
const CLE_MARQUE = "vaiiya_secours";

/** Deux secours séparés par moins d'une minute sont le même incident : le
 *  rechargement, le chargement de la page et la nouvelle erreur tiennent
 *  largement dedans. Au-delà, c'est un incident distinct et il a droit à sa
 *  propre tentative, sinon on enfermerait l'onglet pour toute sa durée.
 *
 *  Une fenêtre trop courte coûterait un rechargement de plus, jamais une
 *  boucle : chaque tentative réécrit la marque, et une tentative n'a lieu que
 *  sur montage d'une frontière d'erreur. Rien ne recharge tout seul en boucle. */
const FENETRE_INCIDENT_MS = 60_000;

/** Plafonds de temps : la page d'erreur ne doit jamais rester suspendue parce
 *  qu'un service worker ne répond pas. */
const MS_ENVOI = 600; // laisser au journal le temps de partir
const MS_PURGE = 1000; // réponse du service worker

/* ── 1. Reconnaître une erreur de chargement de module ────────────────────

   Liste VOLONTAIREMENT COURTE, chaque motif correspondant à une signature
   réellement émise :

   - `ChunkLoadError` : Turbopack pose lui-même ce `name`, vérifié dans la
     sortie de build de ce projet (`Error("Failed to load chunk …")` puis
     `l.name = "ChunkLoadError"`). C'est aussi le nom historique de webpack.
   - `Failed to load chunk ` : le message du même runtime, au cas où le `name`
     se perde en route (sérialisation, `digest`).
   - `Loading chunk … failed` : le message classique de webpack.
   - Les trois formulations d'un `import()` natif qui échoue, une par moteur.

   ⚠️ DÉLIBÉRÉMENT ABSENTS, ne pas les ajouter : `Failed to fetch`,
   `NetworkError`, `Load failed`. Ce sont les messages d'un `fetch` d'API qui
   échoue, donc le cas le plus banal d'un réseau qui vacille ; les traiter en
   chunk manquant déclencherait un rechargement à chaque coupure.

   ⚠️ `Failed to load script from …` est absent aussi : il appartient à Vercel
   Analytics et Speed Insights, qui se contentent d'un `console.log` et ne
   jettent jamais. Vérifié dans la sortie de build, puis observé en vrai. */
const MOTIFS_MODULE: RegExp[] = [
  /Failed to load chunk /i,
  /Loading (?:CSS )?chunk \S+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
];

type ErreurLue = { nom: string; message: string; pile: string; digest: string };

/** Lecture défensive : l'argument d'une frontière est typé `Error`, mais rien
 *  ne garantit ce qu'il porte à l'exécution. */
function lire(e: unknown): ErreurLue {
  try {
    if (!e || typeof e !== "object") {
      return { nom: "", message: typeof e === "string" ? e : "", pile: "", digest: "" };
    }
    const o = e as Record<string, unknown>;
    const s = (v: unknown) => (typeof v === "string" ? v : "");
    return { nom: s(o.name), message: s(o.message), pile: s(o.stack), digest: s(o.digest) };
  } catch {
    return { nom: "", message: "", pile: "", digest: "" };
  }
}

/** `true` uniquement pour les signatures listées ci-dessus. */
export function estErreurDeModule(e: unknown): boolean {
  try {
    const { nom, message } = lire(e);
    return nom === "ChunkLoadError" || MOTIFS_MODULE.some((m) => m.test(message));
  } catch {
    return false;
  }
}

/* ── 2. Décider s'il faut tenter une récupération ─────────────────────── */

/** Ce que la frontière a décidé. Part aussi dans le journal : c'est ce qui
 *  permettra de savoir si le correctif agit, au lieu de le supposer. */
export type Decision =
  | "non" // pas une erreur de chargement de module
  | "lance" // première tentative de cet incident, elle démarre
  | "deja-tente" // un secours a eu lieu il y a moins d'une minute
  | "sans-stockage"; // sessionStorage indisponible → on ne tente RIEN

type Marque = { t: number; b: string };

/** Vrai seulement si `sessionStorage` accepte réellement une écriture : la
 *  présence de l'objet ne suffit pas, c'est l'écriture qui jette en navigation
 *  privée stricte. Sans verrou fiable on ne peut pas garantir « une seule
 *  fois », donc on ne tente rien. */
function stockageUtilisable(): boolean {
  try {
    sessionStorage.setItem(CLE_MARQUE + "_sonde", "1");
    sessionStorage.removeItem(CLE_MARQUE + "_sonde");
    return true;
  } catch {
    return false;
  }
}

/** La dernière tentative, ou `null`. Une valeur abîmée est lue comme « à
 *  l'instant » : dans le doute on refuse le secours plutôt que de risquer un
 *  rechargement de trop. La marque meurt avec l'onglet, donc la portée de ce
 *  cas théorique est un onglet, et les trois boutons restent disponibles. */
function lireMarque(): Marque | null {
  try {
    const brut = sessionStorage.getItem(CLE_MARQUE);
    if (!brut) return null;
    const o = JSON.parse(brut) as Record<string, unknown>;
    return {
      t: typeof o?.t === "number" ? o.t : Date.now(),
      b: typeof o?.b === "string" ? o.b : "?",
    };
  } catch {
    return { t: Date.now(), b: "?" };
  }
}

/**
 * Décide, et POSE la marque quand elle répond « lance ».
 *
 * La marque est écrite avant que quoi que ce soit ne démarre : si la
 * récupération échoue en chemin, elle reste posée et le chargement suivant ne
 * retentera pas. C'est ce qui rend la boucle impossible.
 */
export function deciderSecours(e: unknown): Decision {
  try {
    if (typeof window === "undefined" || !estErreurDeModule(e)) return "non";
    if (!stockageUtilisable()) return "sans-stockage";

    const maintenant = Date.now();
    const precedente = lireMarque();
    // Le build ne participe PAS à cette comparaison : c'est ce qui ferme le
    // cas « ancien build puis nouveau build » d'un même incident.
    if (precedente && maintenant - precedente.t < FENETRE_INCIDENT_MS) return "deja-tente";

    sessionStorage.setItem(CLE_MARQUE, JSON.stringify({ t: maintenant, b: BUILD_ID }));
    return "lance";
  } catch {
    // Dans le doute on ne recharge pas : un écran figé avec ses boutons vaut
    // mieux qu'un rechargement qu'on ne saurait pas compter.
    return "sans-stockage";
  }
}

/* ── 3. Journal : ce qu'on envoie, et ce qu'on n'envoie jamais ────────── */

function tronquer(s: string, n: number): string {
  return typeof s === "string" && s.length > n ? s.slice(0, n) + "…" : s || "";
}

/**
 * Envoie un compte rendu à `/api/client-error`.
 *
 * ⚠️ CHAMPS AUTORISÉS UNIQUEMENT. Ne jamais ajouter ici : cookie, jeton,
 * en-tête Authorization, e-mail, identifiant de compte, contenu saisi,
 * réponse Supabase ou Stripe, et surtout PAS `location.search` ni
 * `location.hash`, qui portent régulièrement des jetons (retour OAuth,
 * confirmation de paiement). On n'envoie que `pathname`.
 *
 * Rend une promesse résolue quand le message est parti, pour que la
 * récupération lui laisse une courte avance avant de recharger. Ne rejette
 * jamais.
 */
export function signalerErreur(e: unknown, origine: string, decision: Decision): Promise<void> {
  return (async () => {
    try {
      const { nom, message, pile, digest } = lire(e);
      let caches_: string[] = [];
      try {
        caches_ = typeof caches === "undefined" ? [] : (await caches.keys()).slice(0, 12);
      } catch {
        /* Cache Storage refusé : le reste du compte rendu part quand même */
      }
      const m = lireMarque();

      const corps = JSON.stringify({
        nom: tronquer(nom, 80),
        message: tronquer(message, 300),
        pile: tronquer(pile, 1500),
        digest: tronquer(digest, 80),
        chemin: tronquer(location.pathname, 200), // jamais search ni hash
        ua: tronquer(navigator.userAgent, 300),
        build: BUILD_ID,
        // La tentative précédente, avec SON build : sur « deja-tente », c'est
        // ce couple qui dit si le rechargement a changé de build entre-temps.
        tentative: m ? `${m.b}@${Math.round((Date.now() - m.t) / 1000)}s` : "",
        sw:
          "serviceWorker" in navigator
            ? navigator.serviceWorker.controller
              ? "controle"
              : "sans-controleur"
            : "non-supporte",
        caches: caches_,
        origine: tronquer(origine, 20),
        module: estErreurDeModule(e),
        secours: decision,
      });

      /* `sendBeacon` d'abord : la récupération recharge juste après, ce qui
         annulerait un `fetch` ordinaire. Un beacon survit au déchargement. */
      try {
        const blob = new Blob([corps], { type: "application/json" });
        if (navigator.sendBeacon?.("/api/client-error", blob)) return;
      } catch {
        /* beacon refusé (taille, file pleine) → repli ci-dessous */
      }
      await fetch("/api/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: corps,
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* Le journal est un confort : il ne doit jamais empêcher l'écran de
         s'afficher ni la récupération de se faire. */
    }
  })();
}

/* ── 4. La récupération, et les sorties manuelles ─────────────────────── */

/** Borne une attente. Rend `null` au délai dépassé, sans jamais rejeter : un
 *  service worker muet ne doit pas suspendre l'écran. */
function borner<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    const fin = (v: T | null) => {
      clearTimeout(t);
      resolve(v);
    };
    p.then(fin, () => fin(null));
  });
}

/**
 * Demande au service worker de purger ses caches purgeables.
 *
 * ⚠️ LA LISTE DES CACHES EST DÉCIDÉE DANS `public/sw.js`, PAS ICI (seul
 * `vaiiya-html` y figure, la justification est sur place). Le client demande
 * une purge, il ne choisit pas ce qui tombe.
 *
 * ⚠️ Un service worker antérieur à ce correctif n'a pas de gestionnaire de
 * message : il ne répondra jamais. C'est le cas au premier déploiement, et
 * c'est pour ça que l'attente est bornée.
 */
async function purgerCaches(): Promise<void> {
  try {
    const ctrl = navigator.serviceWorker?.controller;
    if (!ctrl) return;
    await borner(
      new Promise((resolve, reject) => {
        try {
          const canal = new MessageChannel();
          canal.port1.onmessage = (ev) => resolve(ev.data);
          ctrl.postMessage({ type: "vaiiya-purge" }, [canal.port2]);
        } catch (err) {
          reject(err);
        }
      }),
      MS_PURGE,
    );
  } catch {
    /* la récupération continue sans la purge */
  }
}

/**
 * Lance la récupération : purge ciblée, puis un VRAI rechargement.
 *
 * ⚠️ PAS DE `registration.update()` ICI, ET C'EST DÉLIBÉRÉ. `PWARegister`
 * l'appelle DÉJÀ à chaque montage, donc à chaque chargement de page, y compris
 * celui où l'erreur est survenue : le refaire n'apporte rien. Et c'était la
 * seule chose qui pouvait déclencher un `controllerchange` pendant notre
 * secours, donc le seul chemin par lequel le rechargement de `PWARegister` et
 * le nôtre se seraient additionnés. Le retirer supprime le double
 * rechargement à la source, sans toucher à `PWARegister`.
 *
 * Ça ne coûte rien : les navigations sont en réseau strict dans `sw.js`, donc
 * un vrai rechargement rend toujours le HTML du build courant quand on est en
 * ligne, quelle que soit la version du service worker.
 *
 * ⚠️ LE RECHARGEMENT EST DANS UN `finally` : ni un service worker absent, ni
 * un service worker muet, ni une purge refusée ne peuvent l'empêcher.
 *
 * `location.replace` et pas `reload` : l'entrée d'historique est remplacée,
 * donc « précédent » ne ramène pas sur l'écran d'erreur qu'on vient de quitter.
 */
export function lancerSecours(envoiDuJournal?: Promise<void>): void {
  void (async () => {
    try {
      if (envoiDuJournal) await borner(envoiDuJournal, MS_ENVOI);
      await purgerCaches();
    } catch {
      /* Un `catch` en plus du `finally`, et il n'est pas décoratif : sans lui,
         une exception ici sortirait de la promesse en rejet non géré. Le
         rechargement aurait quand même lieu (il est dans le `finally`), mais on
         laisserait une erreur inexpliquée derrière soi, sur l'écran dont le
         métier est justement de rendre les erreurs lisibles. */
    } finally {
      try {
        location.replace(location.href);
      } catch {
        try {
          location.reload();
        } catch {
          /* plus rien à tenter : les boutons de l'écran restent disponibles */
        }
      }
    }
  })();
}

/** Rechargement réel, demandé par l'utilisateur. Passe par le réseau, donc par
 *  la branche « navigation » de `sw.js`, qui est en réseau strict. */
export function rechargerVaiiya(): void {
  try {
    location.reload();
  } catch {
    /* ignoré */
  }
}

/** Retour à l'accueil par une VRAIE navigation, jamais par le routeur client :
 *  si le bundle est en cause, le routeur client est précisément ce à quoi on
 *  ne peut plus se fier. */
export function allerAccueil(): void {
  try {
    location.assign("/");
  } catch {
    /* ignoré */
  }
}

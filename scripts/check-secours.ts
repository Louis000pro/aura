/* ════════════════════════════════════════════════════════════════════
   check:secours — le banc d'essai de l'écran de secours.

     npm run check:secours

   ⚠️ IL EXERCE LE VRAI `src/lib/secoursErreur.ts`, pas une recopie. Ce
   module est PUR au sens qui compte ici : il n'importe rien et ne lit que
   des globals du navigateur, qu'on peut donc simuler. Toute la décision se
   vérifie hors ligne, sur une app pourtant auth-gated.

   LES DEUX RÈGLES QU'IL PROTÈGE :

   1. UNE SEULE récupération automatique par incident, même si le
      rechargement fait passer d'un build à un autre. La marque de
      tentative est donc indépendante du build (le build n'est là que pour
      le diagnostic) et bornée dans le temps.

   2. Le rechargement a lieu QUOI QU'IL ARRIVE : service worker absent,
      muet ou qui jette ne doivent jamais suspendre l'écran.
   ════════════════════════════════════════════════════════════════════ */
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RACINE = path.resolve(import.meta.dirname, "..");
const FICHIER = path.join(RACINE, "src/lib/secoursErreur.ts");
const URL_MODULE = pathToFileURL(FICHIER).href;

let echecs = 0;
function verdict(nom: string, bon: boolean, detail = "") {
  if (!bon) echecs++;
  console.log("[" + (bon ? "OK   " : "ECHEC") + "] " + nom + (detail ? " — " + detail : ""));
}

/* ── Faux navigateur ──────────────────────────────────────────────────
   Un seul `store` traverse les scénarios quand on veut simuler le MÊME
   onglet à travers un rechargement : c'est exactement ce que fait
   `sessionStorage` dans la vraie vie. */
type Etat = {
  replace: number;
  reload: number;
  beacons: { url: string; blob: Blob }[];
  swMuet: boolean;
  swAbsent: boolean;
  swJette: boolean;
  stockageCasse: boolean;
  purges: number;
};
const etat: Etat = {
  replace: 0, reload: 0, beacons: [], swMuet: false, swAbsent: false,
  swJette: false, stockageCasse: false, purges: 0,
};
let store = new Map<string, string>();

function installerGlobals() {
  const g = globalThis as unknown as Record<string, unknown>;
  g.window = globalThis;
  g.location = {
    pathname: "/progression",
    search: "?token=SECRET123&code=abc",
    hash: "#jeton=AUSSI_SECRET",
    href: "https://vaiiya.fr/progression?token=SECRET123#jeton=AUSSI_SECRET",
    replace: () => { etat.replace++; },
    reload: () => { etat.reload++; },
    assign: () => {},
  };
  g.sessionStorage = {
    getItem: (k: string) => {
      if (etat.stockageCasse) throw new Error("stockage bloqué");
      return store.has(k) ? store.get(k)! : null;
    },
    setItem: (k: string, v: string) => {
      if (etat.stockageCasse) throw new Error("stockage bloqué");
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      if (etat.stockageCasse) throw new Error("stockage bloqué");
      store.delete(k);
    },
  };
  const controller = {
    postMessage(_msg: unknown, transfer?: MessagePort[]) {
      if (etat.swJette) throw new Error("postMessage refusé");
      if (etat.swMuet) return; // ne répond JAMAIS → doit expirer
      etat.purges++;
      transfer?.[0]?.postMessage({ ok: true, purges: ["vaiiya-html"] });
    },
  };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      userAgent: "Mozilla/5.0 (banc)",
      sendBeacon: (url: string, blob: Blob) => { etat.beacons.push({ url, blob }); return true; },
      serviceWorker: etat.swAbsent ? undefined : { controller },
    },
  });
  g.caches = { keys: async () => ["vaiiya-static", "vaiiya-html", "vaiiya-dynamic"] };
  g.fetch = async () => ({ ok: true });
}

/** Nouvel onglet : tout est remis à zéro, marque comprise. */
function nouvelOnglet(patch: Partial<Etat> = {}) {
  Object.assign(etat, {
    replace: 0, reload: 0, beacons: [], swMuet: false, swAbsent: false,
    swJette: false, stockageCasse: false, purges: 0,
  }, patch);
  store = new Map();
  installerGlobals();
}

/** Même onglet, nouveau chargement de page : la marque survit. */
function memeOngletRecharge(patch: Partial<Etat> = {}) {
  Object.assign(etat, {
    replace: 0, reload: 0, beacons: [], swMuet: false, swAbsent: false,
    swJette: false, stockageCasse: false, purges: 0,
  }, patch);
  installerGlobals();
}

type Module = typeof import("@/lib/secoursErreur");
let nCharge = 0;

/** Charge une INSTANCE du module comme si elle venait d'un build donné.
 *  `BUILD_ID` étant lu au chargement, la requête d'URL force Node à en
 *  créer une nouvelle : c'est ce qui permet de rejouer « ancien build puis
 *  nouveau build » dans le même onglet. */
async function charger(build: string): Promise<Module> {
  process.env.NEXT_PUBLIC_BUILD_ID = build;
  return (await import(URL_MODULE + "?b=" + (++nCharge))) as Module;
}

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));
const chunk = () => {
  const e = new Error("Failed to load chunk 0abc as a runtime dependency of chunk 0def");
  e.name = "ChunkLoadError";
  return e;
};

nouvelOnglet();
const S = await charger("aaaaaaa");

/* ══ 1. DÉTECTION ══════════════════════════════════════════════════ */
console.log("\n── Reconnaître une erreur de module ──");
verdict("Turbopack : name=ChunkLoadError", S.estErreurDeModule(chunk()));
verdict("Turbopack : message « Failed to load chunk » sans le name",
  S.estErreurDeModule(new Error("Failed to load chunk 0abc from module x")));
verdict("webpack : « Loading chunk 42 failed »",
  S.estErreurDeModule(new Error("Loading chunk 42 failed. (missing: /_next/x.js)")));
verdict("webpack : « Loading CSS chunk 7 failed »",
  S.estErreurDeModule(new Error("Loading CSS chunk 7 failed.")));
verdict("Chrome : « Failed to fetch dynamically imported module »",
  S.estErreurDeModule(new TypeError("Failed to fetch dynamically imported module: /a.js")));
verdict("Firefox : « error loading dynamically imported module »",
  S.estErreurDeModule(new TypeError("error loading dynamically imported module: /a.js")));
verdict("Safari : « Importing a module script failed »",
  S.estErreurDeModule(new TypeError("Importing a module script failed.")));

console.log("\n── Et surtout, ce qui n'en est PAS une ──");
verdict("panne d'API : « Failed to fetch » nu",
  !S.estErreurDeModule(new TypeError("Failed to fetch")));
verdict("panne d'API : « NetworkError » (Firefox)",
  !S.estErreurDeModule(new TypeError("NetworkError when attempting to fetch resource.")));
verdict("panne d'API : « Load failed » (Safari)",
  !S.estErreurDeModule(new TypeError("Load failed")));
verdict("erreur React ordinaire",
  !S.estErreurDeModule(new TypeError("Cannot read properties of undefined (reading 'map')")));
verdict("Vercel Analytics : « Failed to load script from » (ne jette jamais)",
  !S.estErreurDeModule(new Error("Failed to load script from https://va.vercel-scripts.com/x.js")));
verdict("entrée absurde : rend false sans jeter",
  S.estErreurDeModule(null) === false && S.estErreurDeModule(undefined) === false
    && S.estErreurDeModule("x") === false && S.estErreurDeModule(42) === false);

/* ══ 2. UNE SEULE TENTATIVE PAR INCIDENT ═══════════════════════════ */
console.log("\n── Une seule récupération par incident ──");
{
  nouvelOnglet();
  const A = await charger("aaaaaaa");
  verdict("erreur React classique → aucune récupération",
    A.deciderSecours(new TypeError("Cannot read properties of undefined")) === "non");
  verdict("1er secours autorisé", A.deciderSecours(chunk()) === "lance");
  verdict("2e secours immédiat REFUSÉ", A.deciderSecours(chunk()) === "deja-tente");
  for (let i = 0; i < 5; i++) A.deciderSecours(chunk());
  verdict("5 passages de plus : toujours refusés", A.deciderSecours(chunk()) === "deja-tente");
  verdict("une seule marque, indépendante du build",
    store.size === 1 && [...store.keys()][0] === "vaiiya_secours",
    "clés : " + [...store.keys()].join(", "));
}

/* ══ 3. LE CAS QUI A MOTIVÉ CE DURCISSEMENT : BUILD A → BUILD B ════ */
console.log("\n── Ancien build puis nouveau build, même incident ──");
{
  nouvelOnglet();
  const A = await charger("aaaaaaa");
  verdict("build A : secours lancé", A.deciderSecours(chunk()) === "lance");

  // Le rechargement a eu lieu et le serveur sert désormais un AUTRE build.
  // Même onglet, donc la marque est toujours là.
  memeOngletRecharge();
  const B = await charger("bbbbbbb");
  verdict("les deux instances portent bien des builds différents",
    A.BUILD_ID === "aaaaaaa" && B.BUILD_ID === "bbbbbbb",
    A.BUILD_ID + " puis " + B.BUILD_ID);
  verdict("build B : second secours REFUSÉ (c'est le même incident)",
    B.deciderSecours(chunk()) === "deja-tente");
  verdict("build B : aucun rechargement de plus", etat.replace === 0);

  // Et un troisième build ne rouvre pas la porte non plus.
  memeOngletRecharge();
  const C = await charger("ccccccc");
  verdict("build C : toujours refusé", C.deciderSecours(chunk()) === "deja-tente");
  verdict("la marque garde le build de la PREMIÈRE tentative, pour le journal",
    (JSON.parse(store.get("vaiiya_secours")!) as { b: string }).b === "aaaaaaa");
}

/* ══ 4. UN INCIDENT PLUS TARD A DROIT À SA PROPRE TENTATIVE ════════ */
console.log("\n── Un incident réellement distinct, plus tard ──");
{
  nouvelOnglet();
  const A = await charger("aaaaaaa");
  verdict("1er incident : lancé", A.deciderSecours(chunk()) === "lance");
  // Deux minutes plus tard : la fenêtre d'incident (60 s) est passée.
  store.set("vaiiya_secours", JSON.stringify({ t: Date.now() - 120_000, b: "aaaaaaa" }));
  verdict("après expiration de la fenêtre : autorisé", A.deciderSecours(chunk()) === "lance");
  verdict("juste avant l'expiration : encore refusé", (() => {
    store.set("vaiiya_secours", JSON.stringify({ t: Date.now() - 59_000, b: "aaaaaaa" }));
    return A.deciderSecours(chunk()) === "deja-tente";
  })());
  verdict("l'onglet n'est donc jamais bloqué pour toute sa session", true);
}

/* ══ 5. STOCKAGE INDISPONIBLE ══════════════════════════════════════ */
console.log("\n── sessionStorage indisponible ──");
{
  nouvelOnglet({ stockageCasse: true });
  const A = await charger("aaaaaaa");
  verdict("décision = « sans-stockage »", A.deciderSecours(chunk()) === "sans-stockage");
  verdict("AUCUN rechargement automatique", etat.replace === 0 && etat.reload === 0);
}

/* ══ 6. LE RECHARGEMENT A LIEU QUOI QU'IL ARRIVE ═══════════════════ */
console.log("\n── Le service worker ne peut pas bloquer la récupération ──");
{
  nouvelOnglet();
  const A = await charger("aaaaaaa");
  A.deciderSecours(chunk());
  const t0 = Date.now();
  A.lancerSecours();
  await attendre(400);
  verdict("SW présent et coopératif : un rechargement", etat.replace === 1, "purges=" + etat.purges);
  verdict("et il est rapide", Date.now() - t0 < 900, Date.now() - t0 + " ms");
}
{
  nouvelOnglet({ swAbsent: true });
  const A = await charger("aaaaaaa");
  A.deciderSecours(chunk());
  A.lancerSecours();
  await attendre(400);
  verdict("SW absent : rechargement quand même", etat.replace === 1);
}
{
  nouvelOnglet({ swMuet: true });
  const A = await charger("aaaaaaa");
  A.deciderSecours(chunk());
  const t0 = Date.now();
  A.lancerSecours();
  await attendre(300);
  verdict("SW muet : on attend, on ne recharge pas encore", etat.replace === 0);
  await attendre(1500);
  verdict("SW muet : rechargé malgré le silence", etat.replace === 1);
  verdict("SW muet : attente bornée, pas suspendue", Date.now() - t0 < 3000, Date.now() - t0 + " ms");
}
{
  nouvelOnglet({ swJette: true });
  const A = await charger("aaaaaaa");
  A.deciderSecours(chunk());
  A.lancerSecours();
  await attendre(1600);
  verdict("SW qui jette : rechargement quand même", etat.replace === 1);
}

/* ══ 7. LE JOURNAL ═════════════════════════════════════════════════ */
console.log("\n── Le journal : ce qui part, et ce qui ne part jamais ──");
{
  nouvelOnglet();
  const A = await charger("aaaaaaa");
  const e = chunk();
  e.stack = "ChunkLoadError: …\n  at /_next/static/chunks/x.js:1:1";
  (e as Error & { digest?: string }).digest = "123456789";
  const d = A.deciderSecours(e);
  await A.signalerErreur(e, "error", d);
  const charge = JSON.parse(await etat.beacons[0]!.blob.text()) as Record<string, unknown>;

  verdict("envoyé par sendBeacon (survit au rechargement)", etat.beacons.length === 1);
  verdict("vers /api/client-error", etat.beacons[0]!.url === "/api/client-error");
  verdict("nom, message, pile, digest présents",
    charge.nom === "ChunkLoadError" && String(charge.message).includes("Failed to load chunk")
      && String(charge.pile).length > 0 && charge.digest === "123456789");
  verdict("chemin = pathname SEUL", charge.chemin === "/progression");
  verdict("AUCUNE query string", !JSON.stringify(charge).includes("SECRET123"));
  verdict("AUCUN hash", !JSON.stringify(charge).includes("AUSSI_SECRET"));
  verdict("build et décision transmis",
    charge.build === "aaaaaaa" && charge.module === true && charge.secours === "lance");
  verdict("la tentative précédente est nommée, avec son build",
    typeof charge.tentative === "string" && String(charge.tentative).startsWith("aaaaaaa@"),
    String(charge.tentative));
  verdict("état du SW et noms de caches présents",
    charge.sw === "controle" && (charge.caches as string[]).includes("vaiiya-html"));
  verdict("liste de champs FERMÉE",
    Object.keys(charge).sort().join(",")
      === "build,caches,chemin,digest,message,module,nom,origine,pile,secours,sw,tentative,ua",
    Object.keys(charge).sort().join(","));
}
{
  // Tout casser autour du journal : il ne doit jamais faire tomber l'écran.
  nouvelOnglet();
  const A = await charger("aaaaaaa");
  (globalThis as unknown as Record<string, unknown>).caches = {
    keys: async () => { throw new Error("caches cassé"); },
  };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { get userAgent(): string { throw new Error("ua cassé"); } },
  });
  let jete = false;
  try { await A.signalerErreur(chunk(), "error", "non"); } catch { jete = true; }
  verdict("signalerErreur ne jette JAMAIS", !jete);
  let jete2 = false;
  try { A.deciderSecours(chunk()); } catch { jete2 = true; }
  verdict("deciderSecours ne jette JAMAIS", !jete2);
  installerGlobals();
}

/* ══ 8. CONTRÔLES DE SOURCE ════════════════════════════════════════
   Ce sont des propriétés du CHEMIN, donc exactement celles qui
   repasseraient inaperçues : elles ne cassent rien quand on les perd. */
console.log("\n── Propriétés du code lui-même ──");
{
  /** ⚠️ ON LIT LE CODE SANS SES COMMENTAIRES, et ce n'est pas un détail :
   *  ces fichiers DÉCRIVENT ce qu'ils s'interdisent (« pas de
   *  registration.update() ici », « jamais location.search »). Un contrôle
   *  qui lit le fichier brut trouve la phrase et conclut l'inverse de la
   *  vérité. C'est le faux positif habituel des contrôles de source, pris
   *  ici dans l'autre sens. */
  const sansCommentaires = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, " ");

  const src = sansCommentaires(readFileSync(FICHIER, "utf8"));
  verdict("secoursErreur.ts n'importe RIEN (une frontière d'erreur ne dépend de rien)",
    !/^\s*import\s/m.test(src) && !/\brequire\(/.test(src));
  verdict("aucun registration.update() : c'est ce qui évitait le double rechargement",
    !/registration\s*\.\s*update|\.update\(\)/.test(src));
  verdict("la clé de marque ne porte pas le build",
    /const CLE_MARQUE = "vaiiya_secours"/.test(src) && !/CLE_MARQUE.*\$\{?BUILD_ID/.test(src));
  verdict("le rechargement est dans un finally", /finally\s*\{[\s\S]{0,200}location\.replace/.test(src));
  verdict("ni search ni hash ne sont lus", !/location\.(search|hash)/.test(src));

  const err = sansCommentaires(readFileSync(path.join(RACINE, "src/app/error.tsx"), "utf8"));
  verdict("error.tsx ne dépend plus de framer-motion", !/framer-motion/.test(err));
  verdict("error.tsx offre les trois sorties",
    /reset\(\)/.test(err) && /rechargerVaiiya/.test(err) && /allerAccueil/.test(err));

  const sw = sansCommentaires(readFileSync(path.join(RACINE, "public/sw.js"), "utf8"));
  verdict("sw.js ne purge QUE vaiiya-html", /const PURGEABLES = \[HTML_CACHE\]/.test(sw));
  verdict("sw.js ne balaie jamais Cache Storage en aveugle",
    !/caches\.keys\(\)[\s\S]{0,120}caches\.delete/.test(sw.split("addEventListener(\"message\"")[1] ?? ""));
}

/* ══ 9. rateLimit.ts : le comportement e-mail est-il INCHANGÉ ? ════
   `autoriserEnvoiEmail` délègue désormais à `autoriserRafale`. On ne
   l'affirme pas, on rejoue la version d'origine à côté et on exige des
   réponses identiques, y compris sur l'expiration de fenêtre. */
console.log("\n── rateLimit : le chemin e-mail n'a pas bougé ──");
{
  const FENETRE_MS = 60 * 60 * 1000;
  type Seau = { envois: number; finFenetre: number };
  const temoinSeaux = new Map<string, Seau>();
  /** La version de `main`, recopiée telle quelle. */
  function temoin(usage: string, email: string, maxParHeure = 3): boolean {
    const maintenant = Date.now();
    const cle = `${usage}:${email.toLowerCase().trim()}`;
    const seau = temoinSeaux.get(cle);
    if (!seau || maintenant > seau.finFenetre) {
      temoinSeaux.set(cle, { envois: 1, finFenetre: maintenant + FENETRE_MS });
      return true;
    }
    if (seau.envois >= maxParHeure) return false;
    seau.envois++;
    return true;
  }

  const { autoriserEnvoiEmail } = await import("@/lib/rateLimit");
  const vrai = Date.now;
  let horloge = vrai();
  Date.now = () => horloge;

  const sequence: [string, string, number | undefined][] = [
    ["otp", "a@b.fr", undefined], ["otp", "a@b.fr", undefined], ["otp", "a@b.fr", undefined],
    ["otp", "a@b.fr", undefined],                    // 4e : refusé
    ["otp", "  A@B.FR  ", undefined],                // même seau après normalisation
    ["reset", "a@b.fr", undefined],                  // autre usage → son propre quota
    ["reset", "a@b.fr", 1], ["reset", "a@b.fr", 1],  // max explicite
    ["otp", "c@d.fr", 5],
  ];
  let identiques = true;
  const trace: string[] = [];
  for (const [u, m, max] of sequence) {
    const x = max === undefined ? autoriserEnvoiEmail(u, m) : autoriserEnvoiEmail(u, m, max);
    const y = max === undefined ? temoin(u, m) : temoin(u, m, max);
    trace.push(`${u}/${m.trim()}:${x ? "oui" : "non"}`);
    if (x !== y) identiques = false;
  }
  verdict("même séquence, mêmes réponses que la version de main", identiques, trace.join(" "));

  horloge += FENETRE_MS + 1000; // une heure plus tard
  const x = autoriserEnvoiEmail("otp", "a@b.fr");
  const y = temoin("otp", "a@b.fr");
  verdict("expiration de la fenêtre : comportement identique", x === y && x === true);
  Date.now = vrai;
}

console.log("\n" + (echecs === 0 ? "Tout passe." : echecs + " échec(s)."));
process.exit(echecs === 0 ? 0 : 1);

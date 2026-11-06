/* ═══ Le moteur des premiers pas ═══
   Le chemin entre l'arrivée et la première action (Louis, 2026-11-05). C'est un
   moteur impératif, comme `Landing/vivant/` : il écrit l'écran et il pose des
   classes, et React ne fait que le monter (`PremiersPas.tsx`).

   ⚠️ Les phrases du Guide vivent dans `guides.ts` (`pas.*`), jamais ici. Les
   libellés d'interface restent ici : ce sont des mots de l'app.
   ⚠️ Rien n'écrit en base ici. Le moteur appelle `cfg` : c'est `PremiersPas.tsx`
   qui parle au compte et à Supabase.
   ⚠️ La règle des chiffres : une séance et une recette se comptent dans
   `lib/premiersPas/donnees.ts`, tenu à jour par `check:premiers-pas`.
   ⚠️ Rien ne monte au-dessus du geste du Guide : chaque écran pose ses éléments
   sous une ligne calculée (`--ligne`, `--ligne-b`, `--ligne-t`). */

import { voix, type CleVoix, type ContexteVoix, type GuideId } from "@/lib/guides";
import { DONNEES as D } from "@/lib/premiersPas/donnees";
import { etatVide, garderParcours, type Aliment, type EtatParcours } from "@/lib/premiersPas/reponses";

/** Où vivent les images du parcours. */
const A = "/premiers-pas/";

export type ResultatCompte = { erreur: string | null };

/** Ce que le moteur demande à l'app. Tout le reste, il le fait seul. */
export type ConfigParcours = {
  depart: string;
  etat?: EtatParcours;
  prenomDefaut: string;
  connecte: () => boolean;
  /** ⚠️ Les pseudos sont uniques en base, et le champ part du prénom. */
  pseudoLibre: (pseudo: string) => Promise<boolean>;
  envoyerCode: (email: string) => Promise<{ erreur: string | null; jeton?: string }>;
  verifierCode: (d: { jeton: string; code: string; pseudo: string; email: string; motDePasse: string; prenom: string }) => Promise<ResultatCompte>;
  google: () => Promise<ResultatCompte>;
  /** Écrit les réponses en base, une fois le compte là. Rend le numéro de membre. */
  ecrire: (etat: EtatParcours) => Promise<{ numero: number | null }>;
  activerRappels: () => Promise<void>;
  enregistrerSource: (source: string) => Promise<void>;
  /** Déclenche l'installation. `true` si le navigateur l'a proposée. */
  installer: () => Promise<boolean>;
  peutInstaller: () => boolean;
  terminer: (visiteFinie: boolean) => void;
  /** Un compte qui a déjà répondu choisit son Guide, puis passe à la visite. */
  apresGuide?: string;
  surGuide?: (g: GuideId) => void;
};

type Appel = { label: string; actif?: boolean; clic: () => void; raison?: string; lien?: string; surLien?: () => void };
type Tirage = { val: number; min: number; max: number; pas: number; px: number; axe: (e: PointerEvent) => number; pose: (v: number, fini: boolean) => void };
type Regle = { min: number; max: number; pas: number; grad: number; major: number; px: number };
type Fini = (phrase: string) => void;

const SQUELETTE = `<div class="ciel"></div>
  <div class="etoiles"><i></i><i></i><i></i></div>
  <div id="perso" data-vu="0"><div class="gd"><div class="gd-in"><img alt=""><img class="off" alt=""></div></div></div>
  <div id="vue"></div>
  <div id="bulle" data-vu="0" role="status" aria-live="polite"></div>
  <div id="fil" hidden>
    <button type="button" id="retour" aria-label="Revenir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
    <div id="segments"></div>
  </div>
  <div id="appel" hidden></div>`;

let cfg: ConfigParcours;
let infos: { numero: number | null } = { numero: null };
let tel: HTMLElement, vue: HTMLElement, perso: HTMLElement, bulle: HTMLElement, appelZone: HTMLElement, fil: HTMLElement, gd: HTMLElement, gdIn: HTMLElement;
let imgs: HTMLImageElement[] = [];
let reduit = false;
let S: EtatParcours = etatVide();

const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = tel): T => r.querySelector(s) as T;
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = tel): T[] => [...r.querySelectorAll<T>(s)];
const V = (cle: CleVoix, ctx?: ContexteVoix) => voix(S.guide, cle, ctx);
/** Les écrans où l'on peut reprendre, après une fermeture ou un retour de Google. */
const GARDES = ["prenom", "objectif", "niveau", "lieu", "jours", "duree", "age", "mesures", "aliments", "semaine"];

const NB = String.fromCharCode(160);
const fr = (t: string | number) => String(t)
  .replace(/'/g, "’")
  .replace(/ ([?!:;»])/g, NB + "$1")
  .replace(/« /g, "«" + NB)
  .replace(/(\d) (min|minutes|séances?|recettes?|EXP|kg|cm|ans|jours?|programmes?|questions?)/g, "$1" + NB + "$2");

/** Ce que la personne tape finit dans du HTML : ces signes n'y entrent pas. */
const propre = (t: string) => t.replace(/[<>"&]/g, "");

const NOM: Record<string, string> = { nora: "Nora", sasha: "Sasha" };

/* ── Les chiffres : la même règle pour tout l'écran ── */
const NIVEAUX = [
  { id: "debutant", t: "Je débute", s: "Moins de 6 mois", n: 0 },
  { id: "reprise", t: "Je reprends", s: "Après une pause", n: 0 },
  { id: "intermediaire", t: "Je m'entraîne", s: "Depuis 6 mois ou plus", n: 1 },
  { id: "avance", t: "Depuis longtemps", s: "Plus de 2 ans", n: 2 },
];
const niveauMax = () => {
  const n = NIVEAUX.find((x) => x.id === S.niveau);
  return n ? Math.min(2, n.n + 1) : 2;
};
const bitLieu = () => {
  if (S.lieu === "salle" || S.lieu === "deux") return 1;
  if (S.lieu === "maison") return S.equip === "halteres" ? 4 : 2;
  return 7;
};
const seancesPourToi = (duree = S.duree) => D.seances.filter(([d, l, n, prem]) => !prem && (l & bitLieu()) && n <= niveauMax() && d <= duree).length;
const seancesDuLieu = () => D.seances.filter(([, l, , prem]) => !prem && (l & bitLieu())).length;
const seancesDuBut = (id: string) => {
  const i = D.cleBut.indexOf(id);
  return D.seances.filter(([, , , prem, b]) => !prem && (b & (1 << i))).length;
};
const BIT: Record<Aliment, number> = { viande: 1, porc: 2, poisson: 4, oeufs: 8, lait: 16, gluten: 32 };
const masque = () => S.sans.reduce((m, k) => m | BIT[k], 0);
const recettesPourToi = () => D.recettes.filter((r) => !(r & masque())).length;

/* ── Le ciel ── */
let pCiel = 0;
function ciel(p: number) {
  if (p > pCiel + .004 && p < .95 && !reduit) {
    const v = document.createElement("i");
    v.className = "vague";
    v.onanimationend = () => v.remove();
    tel.append(v);
  }
  pCiel = p;
  tel.style.setProperty("--p", String(p));
  tel.dataset.ton = p >= .66 ? "jour" : "nuit";
}
function dessinerEtoiles() {
  const r = (n: number) => Math.abs(Math.sin(n * 91.7) * 43758.5) % 1;
  $$(".etoiles i").forEach((el, c) => {
    const pts: string[] = [];
    for (let i = 0; i < 34; i++) {
      const x = r(i + c * 40 + 1), y = r(i + c * 40 + 2) * .86, a = .3 + r(i + 3 + c) * .7;
      pts.push(`calc(${(x * 100).toFixed(1)}cqw) calc(${(y * 100).toFixed(1)}cqh) 0 ${c === 0 ? .2 : .1}px rgba(255,255,255,${a.toFixed(2)})`);
    }
    el.style.boxShadow = pts.join(",");
  });
}

/* ── Le Guide ── */
const POSES = ["salut", "designe", "approuve", "surprise", "montre", "haltere", "assiette", "carnet", "fier", "telephone"];
/* Le côté où se passe le geste, sur l'image d'origine. */
const COTE_POSE: Record<string, string> = { designe: "g", salut: "g", assiette: "d", telephone: "d" };
let poseActuelle = "salut", sensPlace = 1, cotePlace = 0;
const sensPose = (p: string) => {
  const c = COTE_POSE[p];
  return c && cotePlace ? ((c === "g") === (cotePlace > 0) ? 1 : -1) : sensPlace;
};
let imgActive = 0;
const srcPose = (p: string, g: string = S.guide || "nora") => `${A}${g}-${p}.webp`;
function prechargerGuide() { POSES.forEach((p) => { const i = new Image(); i.src = srcPose(p); }); }
function pose(p: string, hop?: boolean) {
  const src = srcPose(p);
  poseActuelle = p;
  const sens = String(sensPose(p));
  gdIn.style.setProperty("--dx", String(p === "designe" && S.guide === "sasha" ? `${-12 * Number(sens)}%` : "0%"));
  const ok = () => {
    if (imgs[imgActive].getAttribute("src") !== src || imgs[imgActive].dataset.sens !== sens) {
      const suivante = 1 - imgActive;
      imgs[suivante].src = src;
      imgs[suivante].dataset.sens = String(sens);
      imgs[suivante].classList.remove("off");
      imgs[imgActive].classList.add("off");
      imgActive = suivante;
    }
  };
  ok();
  if (hop && !reduit) {
    gdIn.classList.remove("hop");
    void gdIn.offsetWidth;
    gdIn.classList.add("hop");
    setTimeout(() => gdIn.classList.remove("hop"), 640);
  }
}
const PLACES: Record<"grand" | "haut" | "hautd" | "milieu", { x: string; y: string; s: number; sens: number; cote: number }> = {
  grand: { x: "0cqw", y: "180px", s: 1.02, sens: 1, cote: 0 },
  haut: { x: "-22cqw", y: "162px", s: .64, sens: 1, cote: -1 },
  hautd: { x: "21cqw", y: "162px", s: .64, sens: -1, cote: 1 },
  milieu: { x: "0cqw", y: "156px", s: .78, sens: 1, cote: 0 },
};
const telBas = () => tel.clientHeight < 700;
function place(nom: keyof typeof PLACES, saut?: boolean) {
  const p = PLACES[nom];
  const bas = telBas();
  gd.classList.toggle("saut", !!saut);
  gd.style.setProperty("--gx", String(p.x));
  gd.style.setProperty("--gy", String(bas ? `${parseInt(p.y, 10) - 34}px` : p.y));
  gd.style.setProperty("--gs", String(bas ? p.s * .8 : p.s));
  sensPlace = p.sens;
  cotePlace = p.cote;
  imgs[imgActive].dataset.sens = String(sensPose(poseActuelle));
  perso.dataset.vu = "1";
}
const cacherGuide = () => { perso.dataset.vu = "0"; };

/* ── La parole : écrite en direct, comme sur la vitrine ── */
let jetonParole = 0;
function taper(el: HTMLElement, html: string, vivant: () => boolean, fin?: (() => void) | null, ms = 26) {
  if (reduit) { el.innerHTML = html; fin?.(); return; }
  const plat: [string, boolean][] = [];
  let gras = false;
  for (const m of html.split(/(<b>|<\/b>)/)) {
    if (m === "<b>") { gras = true; continue; }
    if (m === "</b>") { gras = false; continue; }
    for (const c of m) plat.push([c, gras]);
  }
  let i = 0;
  const pas = () => {
    if (!vivant()) return;
    i = Math.min(plat.length, i + 2);
    let out = "", g = false;
    for (let k = 0; k < i; k++) {
      if (plat[k][1] !== g) { out += g ? "</b>" : "<b>"; g = plat[k][1]; }
      out += plat[k][0];
    }
    if (g) out += "</b>";
    el.innerHTML = out + (i < plat.length ? '<i class="caret"></i>' : "");
    if (i < plat.length) setTimeout(pas, ms);
    else fin?.();
  };
  pas();
}
function dire(txt: string, o: { pose?: string; hop?: boolean; net?: boolean } = {}) {
  const j = ++jetonParole;
  const html = fr(txt);
  if (o.pose) pose(o.pose, o.hop);
  const avant = bulle.dataset.vu === "1" ? bulle.offsetHeight : 0;
  bulle.dataset.vu = "1";
  bulle.dataset.parle = "1";
  bulle.style.height = "auto";
  bulle.innerHTML = `<span class="fantome">${html}</span><span class="ecrit"></span>`;
  const apres = bulle.offsetHeight;
  if (avant && avant !== apres && !reduit) {
    bulle.style.height = `${avant}px`;
    void bulle.offsetHeight;
    bulle.style.height = `${apres}px`;
  }
  const ecrit = $(".ecrit", bulle);
  const fin = () => setTimeout(() => { if (j === jetonParole) delete bulle.dataset.parle; }, 500);
  if (o.net) { ecrit.innerHTML = html; fin(); return; }
  taper(ecrit, html, () => j === jetonParole, fin);
}
const taireBulle = () => { jetonParole++; bulle.dataset.vu = "0"; };
function caseBulle(o: { l?: string; r?: string; t?: string; ql?: string; qr?: string; qp?: string } = {}) {
  bulle.style.setProperty("--bl", String(o.l || "16px"));
  bulle.style.setProperty("--br", String(o.r || "16px"));
  bulle.style.setProperty("--bt", String(o.t || "calc(env(safe-area-inset-top, 0px) + 52px)"));
  bulle.style.setProperty("--ql", String(o.ql || "calc(25% - 10px)"));
  bulle.style.setProperty("--qr", String(o.qr || "auto"));
  bulle.style.setProperty("--qp", String(o.qp || "18%"));
}

/* ── Le bouton ── */
function appel(a?: Appel | null) {
  if (!a) { appelZone.hidden = true; appelZone.innerHTML = ""; return; }
  appelZone.hidden = false;
  appelZone.classList.remove("bas");
  appelZone.innerHTML = `<button type="button" class="cta" aria-disabled="${a.actif === false}">${fr(a.label)}</button>${a.lien ? `<button type="button" class="lien">${fr(a.lien)}</button>` : ""}`;
  $(".cta", appelZone).onclick = () => {
    if ($(".cta", appelZone).getAttribute("aria-disabled") === "true") { if (a.raison) dire(a.raison, { pose: "designe" }); return; }
    a.clic();
  };
  if (a.lien) $(".lien", appelZone).onclick = a.surLien ?? null;
}
const activer = (oui: boolean, label?: string) => {
  const b = $(".cta", appelZone);
  if (!b) return;
  b.setAttribute("aria-disabled", String(!oui));
  if (label) b.textContent = fr(label);
};

/* ── Les écrans ── */
const QUESTIONS = ["prenom", "objectif", "niveau", "lieu", "jours", "duree", "age", "mesures", "aliments"];
const SUIVANT: Record<string, string> = { prenom: "objectif", objectif: "niveau", niveau: "lieu", lieu: "jours", jours: "duree", duree: "age", age: "mesures", mesures: "aliments", aliments: "compo" };
const PRECEDENT = Object.fromEntries(Object.entries(SUIVANT).map(([a, b]) => [b, a]));
let ecran: string | null = null;
let minuteurs: ReturnType<typeof setTimeout>[] = [];
const plus_tard = (f: () => void, ms: number) => { const t = setTimeout(f, ms); minuteurs.push(t); return t; };

function filQuestions(id: string) {
  const i = QUESTIONS.indexOf(id);
  fil.hidden = i < 0;
  if (i < 0) return;
  const seg = $("#segments");
  if (!seg.children.length) seg.innerHTML = QUESTIONS.map(() => "<i></i>").join("");
  [...seg.children].forEach((el, k) => el.classList.toggle("fait", k < i));
}
let jetonEcran = 0;
function aller(id: string): Promise<void> {
  const j = ++jetonEcran;
  minuteurs.forEach(clearTimeout);
  minuteurs = [];
  document.dispatchEvent(new Event("vaiiya:ecran"));
  return new Promise((fini) => {
    const rendre = () => {
      if (j !== jetonEcran) return;
      tel.classList.remove("passage");
      ecran = id;
      tel.removeAttribute("data-niveau");
      tel.removeAttribute("data-montee");
      tel.removeAttribute("data-verrou");
      if (GARDES.includes(id)) garderParcours(S, id);
      vue.innerHTML = "";
      caseBulle();
      filQuestions(id);
      E[id]();
      fini();
    };
    if (vue.firstChild && !reduit) {
      tel.classList.add("passage");
      setTimeout(rendre, 230);
    } else rendre();
  });
}
const tic = () => { if (navigator.vibrate) navigator.vibrate(6); };

const E: Record<string, () => void> = {};

E.guide = () => {
  ciel(0);
  cacherGuide();
  taireBulle();
  appel(null);
  vue.innerHTML = `<div class="portail">
    <h1>${fr("Avec <em>qui</em> tu commences ?")}</h1>
    <div class="duo">
      <button type="button" class="fig nora" data-g="nora" aria-label="Choisir Nora"><img src="${A}nora-master.webp" alt=""><span>Nora</span></button>
      <button type="button" class="fig sasha" data-g="sasha" aria-label="Choisir Sasha"><img src="${A}sasha-master.webp" alt=""><span>Sasha</span></button>
    </div>
    <p>${fr("Ton Guide IA te suit partout dans Vaiiya. Tu pourras en changer.")}</p>
  </div>`;
  $$(".fig").forEach((b) => { b.onclick = () => choisirGuide(b.dataset.g as GuideId); });
};
function choisirGuide(g: GuideId) {
  S.guide = g;
  prechargerGuide();
  const elu = $(`.fig[data-g="${g}"]`), autre = $(`.fig:not([data-g="${g}"])`);
  elu.style.setProperty("--vers", String(g === "nora" ? "24cqw" : "-24cqw"));
  elu.classList.add("elu");
  autre.style.setProperty("--sort", String(g === "nora" ? "60cqw" : "-60cqw"));
  autre.classList.add("loin");
  $(".portail p").style.opacity = "0";
  $(".portail h1").style.opacity = "0";
  plus_tard(() => {
    poseActuelle = "salut";
    imgs[imgActive].src = srcPose("salut");
    gd.style.transition = "none";
    gd.classList.remove("saut");
    gd.style.setProperty("--gx", "0cqw");
    gd.style.setProperty("--gy", `${tel.clientHeight * .42}px`);
    gd.style.setProperty("--gs", ".92");
    imgs[imgActive].dataset.sens = "1";
    perso.dataset.vu = "1";
    void gd.offsetWidth;
    gd.style.transition = "";
    place("grand");
    vue.innerHTML = "";
    caseBulle({ ql: "calc(50% - 10px)", qp: "50%" });
    dire(V("pas.salut", { nomGuide: NOM[g] }), { pose: "salut" });
    cfg.surGuide?.(g);
    appel({ label: "C'est parti", clic: () => aller(cfg.apresGuide ?? "prenom") });
  }, 620);
}

E.prenom = () => {
  ciel(.05);
  place("milieu");
  caseBulle({ ql: "calc(50% - 10px)", qp: "50%" });
  dire(V("pas.prenom"), { pose: "carnet" });
  vue.innerHTML = `<div class="champ-prenom ${S.prenom ? "plein" : ""}" style="top:62cqh">
    <input id="prenom" type="text" autocomplete="given-name" enterkeyhint="next" maxlength="20" placeholder="Ton prénom" aria-label="Ton prénom" value="${S.prenom}"><span></span></div>`;
  const champ = $<HTMLInputElement>("#prenom");
  const valider = () => {
    const v = propre(champ.value).trim();
    if (v.length < 2) return;
    S.prenom = v.charAt(0).toUpperCase() + v.slice(1);
    champ.blur();
    dire(V("pas.prenom.ok", { prenom: S.prenom }), { pose: "approuve", hop: true });
    ciel(.07);
    activer(false);
    plus_tard(() => aller("objectif"), 1500);
  };
  champ.oninput = () => {
    const ok = champ.value.trim().length >= 2;
    $(".champ-prenom").classList.toggle("plein", ok);
    activer(ok);
  };
  champ.onkeydown = (e) => { if (e.key === "Enter") valider(); };
  appel({ label: "Continuer", actif: S.prenom.length >= 2, clic: valider, raison: V("pas.prenom.raison") });
};

const BUTS = [
  { id: "masse", t: "Prendre du muscle", m: "curl", c: "#5A36BE" },
  { id: "force", t: "Devenir plus fort", m: "developpe", c: "#7446D2" },
  { id: "poids", t: "Perdre du poids", m: "genoux", c: "#9558DE" },
  { id: "endurance", t: "Tenir plus longtemps", m: "tapis", c: "#B56AE2" },
  { id: "souplesse", t: "Gagner en souplesse", m: "cobra", c: "#D07CD8", ci: "#2A1466" },
  { id: "sante", t: "Me sentir mieux", m: "fentes", c: "#E890C6", ci: "#2A1466" },
  { id: "reprendre", t: "Reprendre le sport", m: "squat", c: "#F6A5B4", ci: "#2A1466" },
];
const POSE_BUT: Record<string, string> = { masse: "haltere", force: "haltere", poids: "carnet", endurance: "montre", souplesse: "fier", sante: "approuve", reprendre: "approuve" };
const motBut = (id: string) => V(`pas.but.${id}` as CleVoix, { nombre: seancesDuBut(id) });
E.objectif = () => {
  ciel(.09);
  place("hautd");
  caseBulle({ ql: "auto", qr: "calc(25% - 10px)", qp: "82%" });
  if (S.buts.length) dire(motBut(S.buts[S.buts.length - 1]), { pose: POSE_BUT[S.buts[S.buts.length - 1]] });
  else dire(V("pas.but", { prenom: S.prenom }), { pose: "designe" });
  vue.innerHTML = `<i class="s-aube"></i><div class="strates">${BUTS.map((b, i) => `
    <button type="button" class="strate" aria-pressed="${S.buts.includes(b.id)}" data-b="${b.id}" style="--c:${b.c};--ci:${b.ci || "#fff"};--i:${i};z-index:${i + 1}">
      <span>${fr(b.t)}</span>
      <svg class="coche" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4.5 4.5L19 7"/></svg>
      <span class="sil" aria-hidden="true"><i style="--m:url(${A}m-${b.m}-1.webp)"></i><i style="--m:url(${A}m-${b.m}-2.webp)"></i></span>
    </button>`).join("")}
    <div class="strate" style="--c:#FBB8AC;--i:7;z-index:9;height:calc(env(safe-area-inset-bottom, 0px) + 104px)"></div>
  </div>`;
  $$(".strate[data-b]").forEach((b) => {
    b.onclick = () => {
      tic();
      const id = b.dataset.b as string;
      const pris = S.buts.includes(id);
      if (pris) S.buts = S.buts.filter((x) => x !== id);
      else {
        if (S.buts.length === 2) {
          const sort = S.buts.shift();
          $(`.strate[data-b="${sort}"]`).setAttribute("aria-pressed", "false");
        }
        S.buts.push(id);
      }
      b.setAttribute("aria-pressed", String(!pris));
      activer(S.buts.length > 0);
      if (!pris) { ciel(.11); dire(motBut(id), { pose: POSE_BUT[id], hop: true }); }
    };
  });
  appel({ label: "Continuer", actif: S.buts.length > 0, clic: () => aller("niveau"), raison: V("pas.but.raison") });
};

const POSE_NIVEAU: Record<string, string> = { debutant: "telephone", reprise: "fier", intermediaire: "haltere", avance: "montre" };
const motNiveau = (id: string) => V(`pas.niveau.${id}` as CleVoix);
/* Repères d'un écran de 390 × 594, étirés au conteneur. De bas en haut. */
const MARCHES = [
  { dos: 370, hwD: 176, lev: 410, bas: 594, hw: 214, fx: .17, s: .62, t: 21 },
  { dos: 258, hwD: 150, lev: 290, bas: 370, hw: 176, fx: .165, s: .56, t: 19 },
  { dos: 170, hwD: 128, lev: 194, bas: 258, hw: 150, fx: .18, s: .5, t: 17 },
  { dos: 106, hwD: 112, lev: 122, bas: 170, hw: 128, fx: .2, s: .45, t: 15 },
];
function marcheHTML(n: (typeof NIVEAUX)[number], i: number) {
  const m = MARCHES[i], c = 195;
  const g = Math.max(0, c - m.hw), l = Math.min(390, c + m.hw);
  return `<div class="m-pas" data-i="${i}" style="--i:${i}"><svg class="m-svg" viewBox="0 0 390 594" preserveAspectRatio="none" aria-hidden="true">
    <polygon class="m-dessus" points="${c - m.hwD},${m.dos} ${c + m.hwD},${m.dos} ${c + m.hw},${m.lev} ${c - m.hw},${m.lev}"/>
    <rect class="m-face" x="${c - m.hw}" y="${m.lev}" width="${m.hw * 2}" height="${m.bas - m.lev}"/>
    <line class="m-aura" x1="${c - m.hw}" y1="${m.lev}" x2="${c + m.hw}" y2="${m.lev}"/>
    <line class="m-neon" x1="${c - m.hw}" y1="${m.lev}" x2="${c + m.hw}" y2="${m.lev}"/></svg>
    <button type="button" class="pas-m" aria-pressed="${S.niveau === n.id}" data-n="${n.id}" style="left:${(g / 390) * 100}%;width:${((l - g) / 390) * 100}%;top:${(m.dos / 594) * 100}%;height:${((m.bas - m.dos) / 594) * 100}%;--lab:${((m.lev - m.dos) / (m.bas - m.dos)) * 100}%;--t:${m.t}px"><span>${fr(n.t)}<small>${fr(n.s)}</small></span></button></div>`;
}
function poserMontee(i: number, saut?: boolean) {
  const M = $(".montee"), W = tel.clientWidth;
  $$(".m-pas").forEach((el) => {
    const j = Number(el.dataset.i);
    el.classList.toggle("allume", j <= i);
    el.classList.toggle("vise", j === i);
    el.style.zIndex = j > i ? "1" : "4";
    $(".pas-m", el).setAttribute("aria-pressed", String(j === i));
  });
  M.dataset.choix = String(i);
  const m = MARCHES[i];
  const s = m.s * (telBas() ? .8 : 1);
  const hG = W * (880 / 920) * s;
  const lev = M.offsetTop + (m.lev / 594) * M.clientHeight;
  gd.classList.toggle("saut", !!saut);
  gd.style.setProperty("--gx", `${Math.round(W * m.fx - W / 2)}px`);
  gd.style.setProperty("--gy", `${Math.round(lev - hG * .86)}px`);
  gd.style.setProperty("--gs", String(s));
  cotePlace = -1;
  sensPlace = 1;
  imgs[imgActive].dataset.sens = String(sensPose(poseActuelle));
}
E.niveau = () => {
  ciel(.13);
  tel.dataset.montee = "1";
  place("haut");
  if (S.niveau) dire(motNiveau(S.niveau), { pose: POSE_NIVEAU[S.niveau] });
  else dire(V("pas.niveau"), { pose: "designe" });
  vue.innerHTML = `<div class="montee">
    <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
      <linearGradient id="m-lip" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#BA80FA"/><stop offset=".5" stop-color="#F99FB0"/><stop offset="1" stop-color="#FEC175"/></linearGradient>
      <linearGradient id="m-f" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3B2596" stop-opacity=".8"/><stop offset="1" stop-color="#150B4C" stop-opacity=".82"/></linearGradient>
      <linearGradient id="m-fa" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#E9829C" stop-opacity=".78"/><stop offset=".22" stop-color="#9A4DC8" stop-opacity=".72"/><stop offset="1" stop-color="#251269" stop-opacity=".84"/></linearGradient>
      <linearGradient id="m-d" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#7E5BE0" stop-opacity=".16"/><stop offset="1" stop-color="#B99AFF" stop-opacity=".4"/></linearGradient>
      <linearGradient id="m-da" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#F99FB0" stop-opacity=".2"/><stop offset="1" stop-color="#FFC48E" stop-opacity=".82"/></linearGradient>
      <linearGradient id="m-t" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#FFEBD0" stop-opacity=".95"/><stop offset=".5" stop-color="#FFD3AC" stop-opacity=".42"/><stop offset="1" stop-color="#FFD3AC" stop-opacity="0"/></linearGradient>
    </defs></svg>
    <i class="m-soleil"></i><i class="m-arche"></i>
    ${[...NIVEAUX.map(marcheHTML)].reverse().join("")}
    <svg class="m-tapis" viewBox="0 0 390 594" preserveAspectRatio="none" aria-hidden="true"><polygon points="139,106 251,106 322,594 68,594"/></svg></div>`;
  $$(".pas-m").forEach((b) => {
    b.onclick = () => {
      tic();
      const niveau = b.dataset.n as string;
      S.niveau = niveau;
      tel.dataset.niveau = niveau;
      poserMontee(NIVEAUX.findIndex((n) => n.id === niveau), true);
      ciel(.15);
      activer(true);
      dire(motNiveau(niveau), { pose: POSE_NIVEAU[niveau], hop: true });
    };
  });
  appel({ label: "Continuer", actif: !!S.niveau, clic: () => aller("lieu"), raison: V("pas.niveau.raison") });
  if (S.niveau) { tel.dataset.niveau = S.niveau; poserMontee(NIVEAUX.findIndex((n) => n.id === S.niveau)); }
};

const motLieu = () => {
  if (S.lieu === "salle") return V("pas.lieu.salle", { nombre: seancesDuLieu() });
  if (S.lieu === "deux") return V("pas.lieu.deux", { nombre: seancesDuLieu() });
  if (S.equip === "halteres") return V("pas.lieu.halteres", { nombre: seancesDuLieu() });
  if (S.equip === "poids") return V("pas.lieu.poids", { nombre: seancesDuLieu() });
  return V("pas.lieu.maison");
};
E.lieu = () => {
  ciel(.17);
  place("hautd");
  caseBulle({ ql: "auto", qr: "calc(25% - 10px)", qp: "82%" });
  if (S.lieu && (S.lieu !== "maison" || S.equip)) dire(motLieu(), { pose: "fier" });
  else dire(V("pas.lieu"), { pose: "designe" });
  const PORTES = [
    { id: "salle", t: "À la salle", img: "porte-salle", op: "50% 46%" },
    { id: "maison", t: "À la maison", img: "porte-maison", op: "62% 68%" },
    { id: "deux", t: "Les deux", img: "porte-deux", op: "42% 70%" },
  ];
  vue.innerHTML = `<i class="a-sol" style="--cx:${S.lieu ? { salle: "-33%", maison: "0%", deux: "33%" }[S.lieu] : "0%"}"></i><div class="arches" ${S.lieu ? "data-choix" : ""}>${PORTES.map((p, i) => `
    <button type="button" class="arche" aria-pressed="${S.lieu === p.id}" data-l="${p.id}" style="--i:${i};--op:${p.op}"><span class="a-cadre"><img src="${A}${p.img}.webp" alt=""></span><img class="a-reflet" src="${A}${p.img}.webp" alt=""><span class="a-nom">${fr(p.t)}</span></button>`).join("")}</div>`;
  const ok = () => S.lieu && (S.lieu !== "maison" || S.equip);
  const dessinerMatos = () => {
    $(".matos")?.remove();
    if (S.lieu !== "maison") return;
    const m = document.createElement("div");
    m.className = "matos";
    m.innerHTML = `<button type="button" data-e="poids" aria-pressed="${S.equip === "poids"}">Rien</button><button type="button" data-e="halteres" aria-pressed="${S.equip === "halteres"}">${fr("Des haltères")}</button>`;
    vue.append(m);
    $$("button", m).forEach((b) => {
      b.onclick = () => {
        S.equip = b.dataset.e as "poids" | "halteres";
        $$("button", m).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        activer(true);
        ciel(.19);
        dire(motLieu(), { pose: S.lieu === "maison" ? "designe" : "fier", hop: true });
      };
    });
  };
  $$(".arche").forEach((b) => {
    b.onclick = () => {
      tic();
      const lieu = b.dataset.l as "salle" | "maison" | "deux";
      S.lieu = lieu;
      if (lieu !== "maison") S.equip = null;
      $(".arches").setAttribute("data-choix", "");
      $(".a-sol").style.setProperty("--cx", { salle: "-33%", maison: "0%", deux: "33%" }[lieu]);
      $$(".arche").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      dessinerMatos();
      activer(!!ok());
      if (ok()) ciel(.19);
      dire(motLieu(), { pose: ok() ? "fier" : "designe", hop: !!ok() });
    };
  });
  dessinerMatos();
  appel({ label: "Continuer", actif: !!ok(), clic: () => aller("jours"), raison: V("pas.lieu.raison") });
};

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const LETTRES = ["L", "M", "M", "J", "V", "S", "D"];
const listeJours = (l: number[]) => {
  const noms = l.map((i) => JOURS[i]);
  if (noms.length < 2) return noms[0] || "";
  return `${noms.slice(0, -1).join(", ")} et ${noms[noms.length - 1]}`;
};
function motJours() {
  const l = [...S.jours].sort((a, b) => a - b);
  const n = l.length;
  if (!n) return V("pas.jours.vide");
  const noms = listeJours(l);
  const Maj = noms.charAt(0).toUpperCase() + noms.slice(1);
  if (n === 1) return V("pas.jours.un", { liste: Maj });
  if (n === 7) return V("pas.jours.tous");
  const espacees = l.every((d, i) => i === 0 || d - l[i - 1] >= 2);
  if (espacees) return V("pas.jours.espaces", { liste: Maj });
  return V("pas.jours.varie", { liste: Maj });
}
E.jours = () => {
  ciel(.21);
  place("haut");
  dire(S.jours.length ? motJours() : V("pas.jours"), { pose: "carnet" });
  vue.innerHTML = `<div class="jours">${LETTRES.map((l, i) => `
    <button type="button" class="jour" aria-pressed="${S.jours.includes(i)}" aria-label="${JOURS[i]}" data-j="${i}" style="--i:${i}"><i></i><b>${l}</b></button>`).join("")}</div>
    <div class="compte"><b id="n-j" class="vy-nombre">${S.jours.length}</b><span id="l-j"></span></div>`;
  let avantJ = S.jours.length;
  const maj = () => {
    const n = S.jours.length;
    compterVers($("#n-j"), avantJ, n, 260);
    avantJ = n;
    $("#l-j").textContent = fr(n > 1 ? "séances par semaine" : "séance par semaine");
    activer(n > 0);
  };
  $$(".jour").forEach((b) => {
    b.onclick = () => {
      tic();
      const j = Number(b.dataset.j);
      const pris = S.jours.includes(j);
      S.jours = pris ? S.jours.filter((x) => x !== j) : [...S.jours, j];
      b.setAttribute("aria-pressed", String(!pris));
      maj();
      ciel(.21 + S.jours.length * .004);
      dire(motJours(), { pose: "carnet", net: false });
    };
  });
  appel({ label: "Continuer", actif: S.jours.length > 0, clic: () => aller("duree"), raison: V("pas.jours.raison") });
  maj();
};

const PALIERS = [10, 15, 20, 30, 45, 60];
E.duree = () => {
  ciel(.25);
  place("haut");
  dire(V("pas.duree"), { pose: "montre" });
  vue.innerHTML = `<div class="duree"><b id="n-d" class="vy-nombre">${S.duree}</b><span>minutes</span><p id="l-d"></p></div>
    <div class="grad" aria-hidden="true">${PALIERS.map((p, k) => `<i class="vy-nombre" data-p="${p}" style="--b:${(.14 + (k / (PALIERS.length - 1)) * .8) * 100}%">${p}</i>`).join("")}</div>
    <div class="jauge" role="slider" aria-label="Durée d'une séance" aria-valuemin="10" aria-valuemax="60" tabindex="0"><i></i><u></u></div>`;
  const j = $(".jauge");
  const dessiner = () => {
    const k = PALIERS.indexOf(S.duree);
    j.style.setProperty("--v", String(.14 + (k / (PALIERS.length - 1)) * .8));
    j.setAttribute("aria-valuenow", String(S.duree));
    const nd = $("#n-d");
    if (nd.textContent !== String(S.duree)) {
      nd.textContent = String(S.duree);
      nd.classList.remove("tape");
      void nd.offsetWidth;
      nd.classList.add("tape");
    }
    $$(".grad i").forEach((x) => x.classList.toggle("on", x.dataset.p === String(S.duree)));
    const n = seancesPourToi();
    $("#l-d").innerHTML = fr(`<b class="vy-nombre">${n}</b> ${n > 1 ? "séances tiennent" : "séance tient"} dans ce temps.`);
  };
  const depuis = (e: PointerEvent) => {
    const r = j.getBoundingClientRect();
    const f = 1 - (e.clientY - r.top) / r.height;
    const k = Math.round(Math.max(0, Math.min(1, (f - .14) / .8)) * (PALIERS.length - 1));
    if (PALIERS[k] !== S.duree) {
      S.duree = PALIERS[k];
      dessiner();
      if (navigator.vibrate) navigator.vibrate(4);
    }
  };
  j.onpointerdown = (e) => { j.setPointerCapture(e.pointerId); depuis(e); j.onpointermove = depuis; };
  j.onpointerup = j.onpointercancel = () => {
    j.onpointermove = null;
    ciel(.27);
    dire(V("pas.duree.ok", { minutes: S.duree }), { pose: "montre", hop: true });
  };
  j.onkeydown = (e) => {
    const k = PALIERS.indexOf(S.duree);
    if (e.key === "ArrowUp" && k < PALIERS.length - 1) { S.duree = PALIERS[k + 1]; dessiner(); }
    if (e.key === "ArrowDown" && k > 0) { S.duree = PALIERS[k - 1]; dessiner(); }
  };
  dessiner();
  appel({ label: "Continuer", clic: () => aller("age") });
};

/* La roue et les règles se pilotent au doigt, avec un peu d'élan. */
function tirer(el: HTMLElement, o: Tirage) {
  let v = o.val, prise: number | null = null, dernier = 0, vitesse = 0, t0 = 0, raf = 0;
  const fin = () => { const s = o.pas * Math.round(v / o.pas); o.pose(s, true); };
  el.onpointerdown = (e) => {
    cancelAnimationFrame(raf);
    el.setPointerCapture(e.pointerId);
    prise = o.axe(e);
    dernier = prise; t0 = performance.now(); vitesse = 0;
  };
  el.onpointermove = (e) => {
    if (prise == null) return;
    const y = o.axe(e);
    const dt = Math.max(1, performance.now() - t0);
    vitesse = (y - dernier) / dt;
    v = Math.max(o.min, Math.min(o.max, v - (y - dernier) / o.px));
    dernier = y; t0 = performance.now();
    o.pose(v, false);
  };
  const lacher = () => {
    if (prise == null) return;
    prise = null;
    const glisse = () => {
      if (Math.abs(vitesse) < .02) {
        const cible = o.pas * Math.round(v / o.pas);
        const pas = () => {
          v += (cible - v) * .28;
          o.pose(v, false);
          if (Math.abs(cible - v) > .02) raf = requestAnimationFrame(pas);
          else { v = cible; fin(); }
        };
        pas();
        return;
      }
      v = Math.max(o.min, Math.min(o.max, v - (vitesse * 16) / o.px));
      vitesse *= .93;
      o.pose(v, false);
      raf = requestAnimationFrame(glisse);
    };
    glisse();
  };
  el.onpointerup = lacher;
  el.onpointercancel = lacher;
  document.addEventListener("vaiiya:ecran", () => cancelAnimationFrame(raf), { once: true });
  return { valeur: () => v };
}

E.age = () => {
  ciel(.29);
  place("haut");
  if (!S.accord) {
    dire(V("pas.accord"), { pose: "carnet" });
    appel(null);
    vue.innerHTML = `<div class="accord">
      <h3>${fr("Ton accord, avant de continuer")}</h3>
      <p>${fr("Ton âge, ta taille et ton poids servent à personnaliser tes conseils.")}</p>
      <label><input type="checkbox" id="ok-sante"><span>${fr("J'accepte que Vaiiya utilise ces informations, mon alimentation et ce que je dis de ma santé à mon Guide pour personnaliser mes conseils. Je peux retirer mon accord à tout moment.")} <a href="/confidentialite#sante" target="_blank" rel="noopener">En savoir plus</a></span></label>
      <button type="button" class="cta" id="ok-suite" aria-disabled="true">Continuer</button></div>`;
    const c = $<HTMLInputElement>("#ok-sante"), b = $("#ok-suite");
    c.onchange = () => b.setAttribute("aria-disabled", String(!c.checked));
    b.onclick = () => { if (c.checked) { S.accord = true; E.age(); } };
    return;
  }
  dire(V("pas.age"), { pose: "carnet" });
  vue.innerHTML = `<div class="repere"></div><div class="roue" role="slider" aria-label="Ton âge" tabindex="0">${Array.from({ length: 9 }, () => '<i class="vy-nombre"></i>').join("")}</div>
    <div class="genres"><button type="button" data-g="homme" aria-pressed="${S.genre === "homme"}">Homme</button><button type="button" data-g="femme" aria-pressed="${S.genre === "femme"}">Femme</button><button type="button" data-g="autre" aria-pressed="${S.genre === "autre"}">Autre</button></div>
    <p class="note-g">${fr("Vaiiya en tient compte pour estimer tes calories. Sans lien avec ton Guide.")}</p>`;
  const roue = $(".roue"), items = $$("i", roue);
  const PAS = 62;
  const dessiner = (v: number) => {
    items.forEach((el, k) => {
      const n = Math.round(v) - 4 + k;
      const d = n - v;
      el.textContent = String(n >= 13 && n <= 90 ? n : "");
      const a = Math.abs(d);
      el.style.transform = `translateY(${d * PAS}px) scale(${Math.max(.5, 1.18 - a * .3)})`;
      el.style.opacity = String(Math.max(.14, 1 - a * .36));
    });
  };
  const ok = () => !!S.genre && S.age >= 15;
  dessiner(S.age);
  tirer(roue, {
    val: S.age, min: 13, max: 90, pas: 1, px: PAS, axe: (e) => e.clientY,
    pose: (v, fini) => {
      dessiner(v);
      if (!fini) return;
      S.age = v;
      activer(ok());
      if (v < 15) dire(V("pas.age.refus"), { pose: "carnet" });
      else ciel(.31);
    },
  });
  roue.onkeydown = (e) => {
    const pas = e.key === "ArrowUp" ? 1 : e.key === "ArrowDown" ? -1 : 0;
    if (!pas) return;
    e.preventDefault();
    S.age = Math.max(13, Math.min(90, S.age + pas));
    dessiner(S.age);
    roue.setAttribute("aria-valuenow", String(S.age));
    activer(ok());
  };
  roue.setAttribute("aria-valuenow", String(S.age));
  $$(".genres button").forEach((b) => {
    b.onclick = () => {
      S.genre = b.dataset.g as string;
      $$(".genres button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      activer(ok());
    };
  });
  appel({
    label: "Continuer", actif: !!ok(), clic: () => aller("mesures"),
    get raison() { return S.age < 15 ? V("pas.age.refus") : V("pas.age.raison"); },
  });
};

function dessinerRegle(cv: HTMLCanvasElement, v: number, o: Regle) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const W = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
  const c = cv.getContext("2d") as CanvasRenderingContext2D;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, W, H);
  const pxU = o.px;
  const span = W / 2 / pxU;
  const debut = Math.floor((v - span) / o.grad) * o.grad;
  for (let u = debut; u <= v + span; u += o.grad) {
    if (u < o.min || u > o.max) continue;
    const x = W / 2 + (u - v) * pxU;
    const dix = Math.round(u / o.grad) % o.major === 0;
    const proche = Math.max(0, 1 - Math.abs(x - W / 2) / (W / 2));
    c.globalAlpha = .28 + proche * .62;
    c.fillStyle = "#fff";
    const h = dix ? 30 : 16;
    c.fillRect(Math.round(x) - .75, 6, 1.5, h);
    if (dix) {
      c.globalAlpha = .4 + proche * .5;
      c.font = `600 13px ${getComputedStyle(tel).getPropertyValue("--chiffre")}`;
      c.textAlign = "center";
      c.fillText(String(Math.round(u)), x, 56);
    }
  }
  c.globalAlpha = 1;
  const g = c.createLinearGradient(0, 0, 0, 44);
  g.addColorStop(0, "#FFD98A"); g.addColorStop(1, "#FEC175");
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(W / 2 - 2, 0, 4, 44, 2);
  c.fill();
}
const RG = {
  taille: { min: 130, max: 220, pas: 1, grad: 1, major: 10, px: 9 },
  poids: { min: 35, max: 180, pas: .5, grad: 1, major: 10, px: 9 },
};
E.mesures = () => {
  ciel(.33);
  place("hautd");
  caseBulle({ ql: "auto", qr: "calc(25% - 10px)", qp: "82%" });
  dire(V("pas.mesures"), { pose: "carnet" });
  vue.innerHTML = `<div class="regles" style="top:38cqh">
    <div class="regle"><div><b id="v-t" class="vy-nombre">${S.taille}</b><span>cm</span></div><canvas id="r-t" role="slider" tabindex="0" aria-label="Ta taille"></canvas></div>
    <div class="regle"><div><b id="v-p" class="vy-nombre">${String(S.poids).replace(".", ",")}</b><span>kg</span></div><canvas id="r-p" role="slider" tabindex="0" aria-label="Ton poids"></canvas></div>
  </div>`;
  const brancher = (id: string, cle: "taille" | "poids", sortie: string) => {
    const cv = $<HTMLCanvasElement>(id), o = RG[cle];
    dessinerRegle(cv, S[cle], o);
    cv.setAttribute("aria-valuenow", String(S[cle]));
    cv.onkeydown = (e) => {
      const sens = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
      if (!sens) return;
      e.preventDefault();
      S[cle] = Math.max(o.min, Math.min(o.max, S[cle] + sens * o.pas));
      dessinerRegle(cv, S[cle], o);
      cv.setAttribute("aria-valuenow", String(S[cle]));
      $(sortie).textContent = String(S[cle]).replace(".", ",");
    };
    tirer(cv, {
      val: S[cle], min: o.min, max: o.max, pas: o.pas, px: o.px, axe: (e) => e.clientX,
      pose: (v, fini) => {
        dessinerRegle(cv, v, o);
        const s = Math.round(v / o.pas) * o.pas;
        $(sortie).textContent = String(String(s).replace(".", ","));
        if (fini) { S[cle] = v; ciel(.35); touche[cle] = true; if (touche.taille && touche.poids) dire(V("pas.mesures.ok"), { pose: "approuve" }); }
      },
    });
  };
  const touche: Record<string, boolean> = {};
  brancher("#r-t", "taille", "#v-t");
  brancher("#r-p", "poids", "#v-p");
  appel({ label: "Continuer", clic: () => aller("aliments") });
};

const METS: { id: Aliment; t: string; i: string }[] = [
  { id: "viande", t: "Viande", i: "boeuf" },
  { id: "porc", t: "Porc", i: "porc" },
  { id: "poisson", t: "Poisson", i: "poisson" },
  { id: "oeufs", t: "Œufs", i: "oeuf" },
  { id: "lait", t: "Lait", i: "lait" },
  { id: "gluten", t: "Gluten", i: "pain" },
];
function compterVers(el: HTMLElement, de: number, a: number, ms = 500) {
  if (reduit) { el.textContent = String(a); return; }
  const t0 = performance.now();
  const pas = (t: number) => {
    const f = Math.min(1, (t - t0) / ms);
    const e = 1 - Math.pow(1 - f, 3);
    el.textContent = String(Math.round(de + (a - de) * e));
    if (f < 1) requestAnimationFrame(pas);
  };
  requestAnimationFrame(pas);
}
const motRegime = () => {
  const n = recettesPourToi();
  if (!S.sans.length) return V("pas.aliments.vide");
  const veg = S.sans.includes("viande") && S.sans.includes("poisson");
  if (veg && S.sans.includes("oeufs") && S.sans.includes("lait")) return V("pas.aliments.vegetal", { nombre: n });
  if (veg) return V("pas.aliments.vegetarien", { nombre: n });
  return V("pas.aliments.note", { nombre: n });
};
E.aliments = () => {
  ciel(.38);
  place("haut");
  dire(S.sans.length ? motRegime() : V("pas.aliments"), { pose: "assiette" });
  vue.innerHTML = `<div class="ali-col"><div class="assiettes">${METS.map((m, i) => `
    <button type="button" class="mets" aria-pressed="${S.sans.includes(m.id)}" data-m="${m.id}" style="--i:${i}"><img src="${A}i-${m.i}.webp" alt=""><span>${m.t}</span></button>`).join("")}</div>
    <div class="compte-r"><b id="n-r" class="vy-nombre">${recettesPourToi()}</b><span>recettes pour toi</span></div></div>`;
  $$(".mets").forEach((b) => {
    b.onclick = () => {
      tic();
      const avant = recettesPourToi();
      const id = b.dataset.m as Aliment;
      const pris = S.sans.includes(id);
      S.sans = pris ? S.sans.filter((x) => x !== id) : [...S.sans, id];
      if (!pris && id === "viande" && !S.sans.includes("porc")) {
        S.sans.push("porc");
        $('.mets[data-m="porc"]').setAttribute("aria-pressed", "true");
      }
      b.setAttribute("aria-pressed", String(!pris));
      compterVers($("#n-r"), avant, recettesPourToi());
      activer(true, S.sans.length ? "Continuer" : "Je mange de tout");
      dire(motRegime(), { pose: "assiette" });
    };
  });
  appel({ label: S.sans.length ? "Continuer" : "Je mange de tout", clic: () => aller("compo") });
};

const COCHE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke-width="1.6"/><path d="M7.5 12.5l3 3 6-6.5"/></svg>';
E.compo = () => {
  ciel(.5);
  place("milieu");
  appel(null);
  caseBulle({ ql: "calc(50% - 10px)", qp: "50%" });
  dire(V("pas.compo"), { pose: "carnet" });
  const n = Math.max(1, S.jours.length);
  vue.innerHTML = `<div class="compo" style="top:58cqh">
    <div id="c1">${COCHE}<span>${fr(n > 1 ? "Je pose tes séances" : "Je pose ta séance")}</span><b class="vy-nombre">${n}</b></div>
    <div id="c2">${COCHE}<span>${fr("Je trie le catalogue")}</span><b id="c2n" class="vy-nombre">${D.seances.length}</b></div>
    <div id="c3">${COCHE}<span>${fr("Je choisis tes recettes")}</span><b id="c3n" class="vy-nombre">${D.recettes.length}</b></div></div>`;
  const ligne = (id: string, delai: number, f?: () => void) => {
    plus_tard(() => { $(id).classList.add("vu"); f?.(); }, delai);
    plus_tard(() => $(id).classList.add("ok"), delai + 760);
  };
  ligne("#c1", 300);
  ligne("#c2", 1000, () => compterVers($("#c2n"), D.seances.length, seancesPourToi(), 800));
  ligne("#c3", 1800, () => compterVers($("#c3n"), D.recettes.length, recettesPourToi(), 800));
  plus_tard(() => ciel(.72), 900);
  plus_tard(() => { pose("surprise", true); }, 2700);
  plus_tard(() => { aller("semaine"); }, 3400);
};

const PHOTOS: Record<string, string> = { "Cardio / HIIT": "cardio" };
const photoSeance = (nom: string) => {
  const g = S.guide || "nora";
  if (nom === "Haut du corps") return `haut-${g}`;
  if (nom === "Bas du corps") return `bas-${g}`;
  if (nom === "Push") return `push-${g}`;
  if (nom === "Pull") return `pull-${g}`;
  return PHOTOS[nom] || `accueil-${g}`;
};
/** 0 = lundi, comme `S.jours`. */
const aujourdhui = () => (new Date().getDay() + 6) % 7;
/** Le jour de la semaine de la ligne `p` : la ligne 0, c'est aujourd'hui. */
const jourDe = (p: number) => (aujourdhui() + p) % 7;
const sem = () => S.semaine as (string | null)[];
function preparerSemaine() {
  if (!S.jours.length) S.jours = [0, 2, 4];
  const lignes = S.jours.map((j) => (j - aujourdhui() + 7) % 7).sort((a, b) => a - b);
  const cycle = D.cycles[Math.min(7, lignes.length)];
  const s: (string | null)[] = new Array(7).fill(null);
  lignes.forEach((p, i) => { s[p] = cycle[i % cycle.length]; });
  S.semaine = s;
  S.semaineLe = new Date().toDateString();
}
const CADRE: Record<string, string> = { "Haut du corps": "50% 0%", "Bas du corps": "50% 15%", Push: "50% 46%", Pull: "50% 0%", "Full Body": "50% 4%", "Cardio / HIIT": "50% 34%" };
const GAP = 6;
let H_SEM = 496, H_REPOS = 36;
const hSeance = () => {
  const n = sem().filter(Boolean).length;
  return Math.max(44, Math.min(92, (H_SEM - (7 - n) * H_REPOS - 6 * GAP) / n));
};
const Maj = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
function poserLignes(sauf?: HTMLElement) {
  const hS = hSeance();
  let y = 0;
  const lignes = $$(".lig");
  sem().forEach((nom, j) => {
    const el = lignes.find((x) => Number(x.dataset.jour) === j);
    if (el && el !== sauf) el.style.transform = `translateY(${y}px)`;
    y += (nom ? hS : H_REPOS) + GAP;
  });
}
const nomLigne = (p: number) => (p === 0 ? "Aujourd'hui" : Maj(JOURS[jourDe(p)]));
function dessinerSemaine() {
  const zone = $(".semaine");
  H_SEM = zone.clientHeight;
  H_REPOS = H_SEM < 420 ? 26 : 36;
  const hS = hSeance();
  zone.innerHTML = sem().map((nom, j) => nom
    ? `<div class="lig seance" data-jour="${j}" style="height:${hS}px;--i:${j}"><img src="${A}${photoSeance(nom)}.webp" alt="" style="--op:${CADRE[nom] || "50% 12%"}"><div><small>${nomLigne(j)}</small><b>${fr(nom)}</b></div><u></u></div>`
    : `<div class="lig repos" data-jour="${j}" style="height:${H_REPOS}px"><span>${nomLigne(j)}</span></div>`).join("");
  poserLignes();
  $$(".lig.seance").forEach(tenirSeance);
}
function tenirSeance(el: HTMLElement) {
  el.onpointerdown = (e) => {
    el.setPointerCapture(e.pointerId);
    el.classList.add("prise");
    const r = el.getBoundingClientRect();
    const zone = $(".semaine").getBoundingClientRect();
    const decale = (e.clientY - r.top) / zone.height * H_SEM;
    let depart: number | null = null;
    const bouge = (ev: PointerEvent) => {
      const y = ((ev.clientY - zone.top) / zone.height) * H_SEM - decale;
      el.style.transform = `translateY(${y}px) scale(1.02)`;
      const hS = hSeance();
      const milieu = y + hS / 2;
      let cumul = 0, cible = 6;
      for (let j = 0; j < 7; j++) {
        const h = (sem()[j] ? hS : H_REPOS) + GAP;
        if (milieu < cumul + h) { cible = j; break; }
        cumul += h;
      }
      const ici = Number(el.dataset.jour);
      /* ⚠️ Une séance ne passe pas devant une autre : c'est le cycle qui dit ce
         qui vient ensuite, et l'écran doit montrer ce qui arrivera vraiment. */
      const sens = cible > ici ? 1 : -1;
      let vers = ici;
      for (let p = ici + sens; p !== cible + sens; p += sens) {
        if (sem()[p]) break;
        vers = p;
      }
      if (vers !== ici) {
        if (depart === null) depart = ici;
        sem()[vers] = sem()[ici];
        sem()[ici] = null;
        const autre = $(`.lig[data-jour="${vers}"]`);
        autre.dataset.jour = String(ici);
        $("span", autre).textContent = nomLigne(ici);
        el.dataset.jour = String(vers);
        $("small", el).textContent = nomLigne(vers);
        poserLignes(el);
      }
    };
    el.onpointermove = bouge;
    el.onpointerup = el.onpointercancel = () => {
      el.onpointermove = null;
      el.classList.remove("prise");
      poserLignes();
      S.jours = sem().flatMap((n, p) => (n ? [jourDe(p)] : []));
      const fin = Number(el.dataset.jour);
      if (depart !== null && fin !== depart) {
        const nom = $("b", el).textContent ?? "";
        $(".sem-h span").textContent = fr(V("pas.semaine.deplace", { titre: nom, jour: JOURS[jourDe(fin)], avant: JOURS[jourDe(depart)] }));
        $<HTMLImageElement>(".sem-h img").src = `${A}${S.guide || "nora"}-avatar-encourage.webp`;
      }
    };
  };
}
E.semaine = () => {
  ciel(.87);
  cacherGuide();
  taireBulle();
  if (!S.semaine || S.semaineLe !== new Date().toDateString()) preparerSemaine();
  const n = seancesPourToi(), r = recettesPourToi();
  vue.innerHTML = `<div class="sem-col"><h1 class="sem-t">${fr(`<em>${S.prenom || cfg.prenomDefaut}</em>, ta semaine est prête.`)}</h1>
    <p class="sem-h"><img src="${A}${S.guide || "nora"}-avatar.webp" alt=""><span>${fr(V("pas.semaine.astuce"))}</span></p>
    <div class="semaine"></div>
    <p class="sem-pied">${fr(`<b class="vy-nombre">${n}</b> séances et <b class="vy-nombre">${r}</b> recettes sont choisies pour toi.`)}</p></div>`;
  dessinerSemaine();
  appel({ label: "Garder ma semaine", clic: () => { garderParcours(S, "semaine"); if (cfg.connecte()) void finirCompte(); else ouvrirCompte(); } });
};
const GOOGLE = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.5 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.9 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.9c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.3-10 7.3-17.5z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.2C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.2z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z"/></svg>`;

/* ⚠️ Le compte naît APRÈS la semaine : on a quelque chose à garder. Le code reçu
   par e-mail reste obligatoire (`/api/auth/verify-otp` crée le compte). */
function ouvrirCompte() {
  appel(null);
  const f = document.createElement("div");
  f.className = "compte-f";
  const pseudo = (S.prenom || "").toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
  f.innerHTML = `<h2>${fr("Crée ton compte pour garder ta semaine.")}</h2>
    <button type="button" class="google">${GOOGLE}${fr("Continuer avec Google")}</button>
    <div class="ou">ou</div>
    <label><span>Pseudo</span><input id="c-pseudo" type="text" value="${pseudo}" autocomplete="username" maxlength="24"></label>
    <label><span>E-mail</span><input id="c-mail" type="email" inputmode="email" placeholder="ton@email.fr" autocomplete="email"></label>
    <label><span>Mot de passe</span><input id="c-mdp" type="password" placeholder="6 caractères minimum" autocomplete="new-password"></label>
    <p class="compte-err" role="alert" hidden></p>
    <button type="button" class="cta" id="c-ok">${fr("Créer mon compte")}</button>
    <small>${fr('En créant ton compte, tu acceptes les <a href="/conditions" target="_blank" rel="noopener">conditions</a>.')}<br>${fr('Déjà un compte ? <a href="/auth">Me connecter</a>')}</small>`;
  vue.append(f);
  const err = $(".compte-err", f);
  const dire2 = (m: string | null) => { err.hidden = !m; err.textContent = String(m ? fr(m) : ""); };
  const ok = $<HTMLButtonElement>("#c-ok", f);
  $(".google", f).onclick = async () => {
    garderParcours(S, "apres-compte");
    const r = await cfg.google();
    if (r.erreur) dire2(r.erreur);
  };
  ok.onclick = async () => {
    const pse = $<HTMLInputElement>("#c-pseudo", f).value.trim();
    const email = $<HTMLInputElement>("#c-mail", f).value.trim();
    const mdp = $<HTMLInputElement>("#c-mdp", f).value;
    if (pse.length < 3) { dire2("Choisis un pseudo de 3 caractères au moins."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { dire2("Cet e-mail n'a pas l'air complet."); return; }
    if (mdp.length < 6) { dire2("Il faut 6 caractères au moins pour le mot de passe."); return; }
    dire2(null);
    ok.setAttribute("aria-disabled", "true");
    ok.textContent = fr("Je t'envoie un code…");
    const libre = await cfg.pseudoLibre(pse);
    const r = libre ? await cfg.envoyerCode(email) : null;
    ok.setAttribute("aria-disabled", "false");
    ok.textContent = fr("Créer mon compte");
    if (!r) {
      dire2("Ce pseudo est déjà pris. Essaie une variante.");
      $<HTMLInputElement>("#c-pseudo", f).focus();
      return;
    }
    if (r.erreur || !r.jeton) { dire2(r.erreur ?? "Le code n'est pas parti. Réessaie."); return; }
    demanderCode(f, { jeton: r.jeton, pseudo: pse, email, motDePasse: mdp });
  };
}

function demanderCode(f: HTMLElement, c: { jeton: string; pseudo: string; email: string; motDePasse: string }) {
  f.innerHTML = `<h2>${fr("Regarde tes e-mails.")}</h2>
    <p class="compte-note">${fr(`Le code vient d'arriver sur ${propre(c.email)}.`)}</p>
    <label><span>Code</span><input id="c-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6 chiffres"></label>
    <p class="compte-err" role="alert" hidden></p>
    <button type="button" class="cta" id="c-valide">${fr("Valider")}</button>
    <button type="button" class="lien" id="c-renvoi">${fr("Renvoyer le code")}</button>`;
  const err = $(".compte-err", f), champ = $<HTMLInputElement>("#c-code", f), ok = $<HTMLButtonElement>("#c-valide", f);
  const dire2 = (m: string | null) => { err.hidden = !m; err.textContent = String(m ? fr(m) : ""); };
  let jeton = c.jeton;
  champ.focus();
  ok.onclick = async () => {
    const code = champ.value.replace(/\D/g, "");
    if (code.length < 6) { dire2("Le code fait 6 chiffres."); return; }
    dire2(null);
    ok.setAttribute("aria-disabled", "true");
    ok.textContent = fr("Je vérifie…");
    const r = await cfg.verifierCode({ jeton, code, pseudo: c.pseudo, email: c.email, motDePasse: c.motDePasse, prenom: S.prenom });
    if (r.erreur) {
      ok.setAttribute("aria-disabled", "false");
      ok.textContent = fr("Valider");
      dire2(r.erreur);
      return;
    }
    await finirCompte();
  };
  $("#c-renvoi", f).onclick = async () => {
    const r = await cfg.envoyerCode(c.email);
    if (r.jeton) { jeton = r.jeton; dire2("Un nouveau code vient de partir."); } else dire2(r.erreur ?? "Le code n'est pas parti. Réessaie.");
  };
}

/* Le compte existe : les réponses partent en base, puis la carte arrive. */
async function finirCompte() {
  appel(null);
  infos = await cfg.ecrire(S);
  void aller("carte");
}

const FLAMME = '<svg viewBox="0 0 100 120" aria-hidden="true"><defs><linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC56A"/><stop offset="1" stop-color="#E8620C"/></linearGradient></defs><path fill="url(#fl)" d="M52 24C56 41 73 55 73 82C73 100 62 113 50 113C38 113 27 100 27 84C27 63 42 47 52 24Z"/></svg>';
/* ── Le son : comme dans l'app, tout est synthétisé, rien n'est un fichier ── */
let audio: AudioContext | null = null;
const contexte = () => {
  if (reduit) return null;
  try {
    audio = audio || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
    return audio;
  } catch { return null; }
};
function note(m: number, quand = 0, duree = .9, force = .05, forme: OscillatorType = "triangle") {
  const c = contexte();
  if (!c) return;
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + quand;
  o.type = forme;
  o.frequency.value = 440 * 2 ** ((m - 69) / 12);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(force, t + .014);
  g.gain.exponentialRampToValueAtTime(.0004, t + duree);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + duree + .05);
}
function souffle(duree = .8, force = .05) {
  const c = contexte();
  if (!c) return;
  const b = c.createBuffer(1, Math.floor(c.sampleRate * duree), c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
  s.buffer = b;
  f.type = "bandpass";
  f.Q.value = .8;
  f.frequency.setValueAtTime(240, t);
  f.frequency.exponentialRampToValueAtTime(1500, t + duree * .5);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(force, t + duree * .24);
  g.gain.exponentialRampToValueAtTime(.0004, t + duree);
  s.connect(f).connect(g).connect(c.destination);
  s.start(t);
}

/* ── Les étincelles : un seul canevas, des gerbes et des braises ── */
type Particule = { x: number; y: number; vx: number; vy: number; g: number; fr: number; vie: number; pas: number; r: number; c: string; doux?: boolean };
type ZoneFeu = { x: number; y: number; l: number; h: number };
function etincelles(cv: HTMLCanvasElement) {
  const L = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = L * dpr;
  cv.height = H * dpr;
  const ctx = cv.getContext("2d") as CanvasRenderingContext2D;
  ctx.scale(dpr, dpr);
  ctx.lineCap = "round";
  const COUL = ["#FFF1CF", "#FFD98A", "#FEC175", "#F99FB0", "#BA80FA"];
  const pts: Particule[] = [];
  let zone: ZoneFeu | null = null, vit = 0, tourne = false, avant = 0;
  const pas = (t: number) => {
    if (!cv.isConnected) { tourne = false; return; }
    const dt = Math.min(2.4, (t - avant) / 16.7);
    avant = t;
    ctx.clearRect(0, 0, L, H);
    ctx.globalCompositeOperation = "lighter";
    if (zone && Math.random() < vit * dt) pts.push({
      x: zone.x + (Math.random() - .5) * zone.l, y: zone.y + (Math.random() - .35) * zone.h,
      vx: (Math.random() - .5) * .3, vy: -.25 - Math.random() * .55, g: 0, fr: 1, vie: 1,
      pas: .006 + Math.random() * .006, r: .9 + Math.random() * 1.3, c: COUL[Math.floor(Math.random() * 3)], doux: true,
    });
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i], x0 = p.x, y0 = p.y;
      p.vx *= p.fr ** dt;
      p.vy = p.vy * p.fr ** dt + p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vie -= p.pas * dt;
      if (p.vie <= 0) { pts.splice(i, 1); continue; }
      ctx.globalAlpha = p.doux ? Math.sin(p.vie * Math.PI) * .85 : Math.min(1, p.vie * 1.7);
      ctx.strokeStyle = p.c;
      ctx.lineWidth = p.doux ? p.r : p.r * (.5 + p.vie * .7);
      ctx.beginPath();
      ctx.moveTo(x0 - p.vx * 1.5, y0 - p.vy * 1.5);
      ctx.lineTo(p.x + .01, p.y + .01);
      ctx.stroke();
    }
    if (pts.length || zone) requestAnimationFrame(pas);
    else { ctx.clearRect(0, 0, L, H); tourne = false; }
  };
  const lancer = () => {
    if (tourne || reduit) return;
    tourne = true;
    avant = performance.now();
    requestAnimationFrame(pas);
  };
  return {
    gerbe(x: number, y: number, n: number, o: { haut?: boolean; v?: number; g?: number } = {}) {
      for (let i = 0; i < n; i++) {
        const a = o.haut ? -Math.PI / 2 + (Math.random() - .5) * 1.1 : Math.random() * Math.PI * 2;
        const v = (o.v || 7) * (.25 + Math.random() * .75);
        pts.push({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.g ?? .07, fr: .965, vie: 1,
          pas: .012 + Math.random() * .016, r: 1.4 + Math.random() * 2, c: COUL[Math.floor(Math.random() * COUL.length)],
        });
      }
      lancer();
    },
    braises(z: ZoneFeu | null, v = .14) { zone = z; vit = v; if (z) lancer(); },
  };
}

/* La vraie flamme du premier jour : la Lueur de `FlammeSerie`, avec ses trois couches. */
const LUEUR = `<svg viewBox="20 18 60 100" aria-hidden="true"><defs><radialGradient id="bvc" cx="50" cy="102" r="78" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FF6A1A"/><stop offset="1" stop-color="#C92A0A"/></radialGradient><radialGradient id="bvm" cx="50" cy="106" r="52" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FF9E3A"/><stop offset="1" stop-color="#FF6A1A"/></radialGradient><radialGradient id="bvh" cx="50" cy="106" r="30" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFD27A"/><stop offset="1" stop-color="#FF9E3A"/></radialGradient></defs><g class="f-c"><path fill="url(#bvc)" d="M52 24C56 41 73 55 73 82C73 100 62 113 50 113C38 113 27 100 27 84C27 63 42 47 52 24Z"/></g><g class="f-m"><path fill="url(#bvm)" d="M51 54C55 66 66 74 66 90C66 102 59 110 50 110C41 110 34 102 34 92C34 77 46 68 51 54Z"/></g><g class="f-h"><path fill="url(#bvh)" d="M50 80C53 87 58 91 58 98C58 104 54 108 50 108C46 108 42 104 42 99C42 91 48 87 50 80Z"/></g></svg>`;

/* ═══ L'écran de bienvenue : le premier lever de soleil ═══
   Le noir, le Guide qui parle, l'aube qui s'ouvre, la carte qui arrive,
   puis chaque gain à son tour. Rien ne se passe au toucher : tout le
   monde voit la scène, en moins de sept secondes. */
E.carte = () => {
  ciel(1);
  cacherGuide();
  taireBulle();
  appel(null);
  contexte();
  const p = S.prenom || cfg.prenomDefaut, g = S.guide || "nora";
  const ouverture = fr(V("pas.bienvenue.ouverture", { prenom: p })), dernier = fr(V("pas.bienvenue.fin"));
  vue.innerHTML = `<div class="bv">
    <div class="bv-ciel"></div>
    <img class="bv-g" src="${srcPose("fier", g)}" alt="">
    <p class="bv-ouv"><span class="fantome">${ouverture}</span><span class="ecrit"></span></p>
    <div class="bv-col">
      <div class="bv-tete">
        <h1 class="bv-t">${fr(`Bienvenue,<br class="bv-br"> <em>${p}</em>.`)}</h1>
        <p class="bv-h">${fr(`${infos.numero ? `Membre n°${NB}${infos.numero}. ` : ""}Incline ta carte du doigt.`)}</p>
      </div>
      <div class="zone-carte">
        <i class="bv-rayons"></i><i class="bv-soleil"></i><i class="bv-onde"></i>
        <div class="bv-cadre"><div class="carte" role="img" aria-label="${fr(`Carte Bronze de ${p}${infos.numero ? `, membre numéro ${infos.numero}` : ""}`)}">
          <div class="mat"></div><div class="mot"></div><div class="ref"></div>
          <div class="c-h"><span>Vaiiya</span><span class="vy-nombre">${infos.numero ? `N°${NB}${String(infos.numero).padStart(3, "0")}` : ""}</span></div>
          <img class="gem" src="${A}bronze.webp" alt="">
          <div class="nom">Bronze</div><div class="tr"></div><div class="ps">${p}</div>
          <div class="dt">${fr(`Depuis le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`)}</div><div class="dp">Le point de départ</div><div class="bord"></div>
          <i class="bv-reflet"></i>
        </div></div>
      </div>
      <div class="bv-gains">
        <div class="bv-lig">
          <div class="bv-exp"><b id="bv-c" class="vy-nombre">0</b><span>EXP</span></div>
          <div class="bv-fl"><i class="bv-lueur"></i>${LUEUR}<div><b>${fr("Jour 1")}</b><small>${fr("Demain : +20 EXP")}</small></div></div>
        </div>
        <div class="bv-route">
          <img class="bv-r0" src="${A}bronze.webp" alt="">
          <div class="bv-piste"><i></i></div>
          <img class="bv-r1" src="${A}argent.webp" alt="">
          ${["or", "platine", "diamant", "eternel"].map((r, i) => `<img class="bv-rs" style="--i:${i}" src="${A}${r}.webp" alt="">`).join("")}
        </div>
        <p class="bv-cap"></p>
      </div>
      <div class="bv-mot"><span class="m-ava"><i class="m-halo"></i><img src="${srcPose("approuve", g)}" alt=""></span><p><span class="fantome">${dernier}</span><span class="ecrit"></span></p></div>
    </div>
    <i class="bv-flash"></i>
    <canvas class="bv-part" aria-hidden="true"></canvas>
  </div>`;
  const bv = $(".bv"), col = $(".bv-col"), zone = $(".zone-carte"), c = $(".carte"), num = $("#bv-c"), piste = $(".bv-piste");
  bv.prepend($(".etoiles").cloneNode(true));
  bv.style.setProperty("--tz", String(p.length > 11 ? .72 : p.length > 8 ? .86 : 1));

  /* La carte prend ce qui reste, et la lumière se cale sur elle */
  const libre = col.clientHeight - $(".bv-tete").offsetHeight - $(".bv-gains").offsetHeight - $(".bv-mot").offsetHeight - 30;
  const hc = Math.round(Math.max(200, Math.min(316, libre)));
  bv.style.setProperty("--hc", `${hc}px`);
  bv.style.setProperty("--k", String((hc / 332).toFixed(3)));
  const cy0 = col.offsetTop + zone.offsetTop + hc / 2, cy1 = tel.clientHeight * .5;
  bv.style.setProperty("--cy0", `${Math.round(cy0)}px`);
  bv.style.setProperty("--cy1", `${Math.round(cy1)}px`);
  bv.style.setProperty("--dy", `${Math.round(cy1 - cy0)}px`);
  bv.style.setProperty("--ex", `${Math.round(($(".bv-fl").offsetWidth + 18) / 2)}px`);

  const etat = (n: number) => bv.classList.add(`a${n}`);
  const point = (el: HTMLElement, fx = .5, fy = .5) => {
    const b = bv.getBoundingClientRect(), r = el.getBoundingClientRect(), z = b.width / bv.clientWidth || 1;
    return { x: (r.left - b.left + r.width * fx) / z, y: (r.top - b.top + r.height * fy) / z };
  };
  const legende = (html: string) => {
    const q = $(".bv-cap");
    q.innerHTML = fr(html);
    $$("b", q).forEach((b) => b.classList.add("vy-nombre"));
    q.classList.remove("neuf");
    void q.offsetWidth;
    q.classList.add("neuf");
  };
  const incliner = () => {
    const incline = (e: PointerEvent) => {
      const r = zone.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      const y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      c.style.animation = "none";
      c.style.transition = "none";
      c.style.setProperty("--pp-ry", `${(x - .5) * 34}deg`);
      c.style.setProperty("--pp-rx", `${(.5 - y) * 26}deg`);
      c.style.setProperty("--pp-mx", `${x * 100}%`);
      c.style.setProperty("--pp-my", `${y * 100}%`);
    };
    zone.onpointerdown = (e) => { zone.setPointerCapture(e.pointerId); incline(e); zone.onpointermove = incline; };
    zone.onpointerup = zone.onpointercancel = () => {
      zone.onpointermove = null;
      c.style.transition = "transform .7s var(--ressort)";
      c.style.setProperty("--pp-ry", "0deg");
      c.style.setProperty("--pp-rx", "0deg");
    };
  };
  const ouvrirLaSuite = () => {
    appel({ label: "C'est parti", clic: () => aller("source") });
    $(".cta", appelZone).classList.add("arrive");
  };
  if (reduit) {
    [1, 2, 3, 4, 5, 6].forEach(etat);
    bv.classList.add("net", "route");
    num.textContent = String(60);
    piste.style.setProperty("--e", String(.6));
    legende("Plus que <b>40</b> EXP avant Argent");
    $(".bv-mot .ecrit").innerHTML = dernier;
    incliner();
    ouvrirLaSuite();
    return;
  }

  const feu = etincelles($(".bv-part"));
  /* Un seul compteur à la fois : un gain arrive, le précédent s'arrête */
  let compte = 0;
  const compter = (de: number, a: number, ms: number) => {
    const j = ++compte, t0 = performance.now();
    const pas = (t: number) => {
      if (j !== compte) return;
      const f = Math.max(0, Math.min(1, (t - t0) / ms));
      num.textContent = String(Math.round(de + (a - de) * (1 - (1 - f) ** 3)));
      if (f < 1) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  };
  const jeton = (txt: string, html: string, de: number, a: number, part: number) => {
    legende(html);
    const j = document.createElement("b");
    j.className = "bv-jeton vy-nombre";
    j.textContent = String(txt);
    bv.append(j);
    const o = point(zone, .5, .92), d = point(num);
    const t = (x: number, y: number, s: number) => `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${s})`;
    j.animate([
      { transform: t(o.x, o.y + 12, .3), opacity: 0 },
      { transform: t(o.x, o.y - 16, 1.32), opacity: 1, offset: .32 },
      { transform: t(o.x, o.y - 12, 1.2), opacity: 1, offset: .5 },
      { transform: t(d.x, d.y, .6), opacity: 1, offset: .94 },
      { transform: t(d.x, d.y, .5), opacity: 0 },
    ], { duration: 780, easing: "cubic-bezier(.45, 0, .25, 1)", fill: "forwards" });
    plus_tard(() => {
      j.remove();
      compter(de, a, a - de > 20 ? 460 : 300);
      piste.style.setProperty("--e", String(part));
      num.classList.remove("coup");
      void num.offsetWidth;
      num.classList.add("coup");
      const q = point(num);
      feu.gerbe(q.x, q.y, 26, { v: 5, g: .05 });
      note(84, 0, .5, .05, "sine");
      note(88, .08, .7, .05, "sine");
      tic();
    }, 740);
  };

  const T = { parole: 260, lumiere: 1500, carte: 1650, impact: 2430, recul: 3350, p50: 3620, p10: 4700, route: 5620, flamme: 5900, fin: 6700 };
  plus_tard(() => taper($(".bv-ouv .ecrit"), ouverture, () => bv.isConnected, null, 34), T.parole);
  plus_tard(() => {
    etat(1);
    note(67, 0, .9, .05);
    note(72, .34, 1.1, .05);
  }, T.lumiere);
  plus_tard(() => etat(2), T.carte);
  plus_tard(() => {
    etat(3);
    const m = point(zone);
    feu.gerbe(m.x, m.y, 96, { v: 9, g: .05 });
    feu.braises({ x: m.x, y: m.y, l: tel.clientWidth, h: hc * 1.5 }, .16);
    if (navigator.vibrate) navigator.vibrate([18, 40, 70]);
    [48, 60, 64, 67, 72].forEach((n) => note(n, 0, 1.9, .042));
    note(84, .02, 1.3, .02, "sine");
  }, T.impact);
  plus_tard(() => { etat(4); incliner(); }, T.recul);
  plus_tard(() => jeton("+50", "<b>+50</b> Ton cadeau de bienvenue", 0, 50, .5), T.p50);
  plus_tard(() => jeton("+10", "<b>+10</b> Ta première connexion", 50, 60, .6), T.p10);
  plus_tard(() => {
    bv.classList.add("route");
    legende("Plus que <b>40</b> EXP avant Argent");
  }, T.route);
  plus_tard(() => {
    etat(5);
    souffle(.8, .06);
    tic();
    plus_tard(() => {
      const q = point($(".bv-fl svg"), .5, .25);
      feu.gerbe(q.x, q.y, 20, { v: 3.4, g: -.02, haut: true });
    }, 240);
  }, T.flamme);
  plus_tard(() => {
    etat(6);
    taper($(".bv-mot .ecrit"), dernier, () => bv.isConnected);
    ouvrirLaSuite();
  }, T.fin);
};

/* Mesure la bulle avant qu'elle parle : le Guide se place en dessous */
function hauteurBulle(txt: string) {
  const m = bulle.cloneNode(false) as HTMLElement;
  m.style.visibility = "hidden";
  m.style.height = "auto";
  m.dataset.vu = "1";
  m.innerHTML = `<span class="fantome">${fr(txt)}</span>`;
  tel.append(m);
  const h = m.offsetHeight;
  m.remove();
  return h;
}

/* ═══ Les rappels : l'écran devient ton téléphone, ce soir-là ═══ */
E.rappels = () => {
  ciel(.4);
  tel.dataset.verrou = "1";
  taireBulle();
  appel(null);
  contexte();
  if (!S.semaine) preparerSemaine();
  const l = [...S.jours].sort((a, b) => a - b);
  const ligne = Math.max(0, sem().findIndex(Boolean));
  const premiere = sem()[ligne] || "Full Body";
  const jourPremiere = new Date(Date.now() + ligne * 864e5);
  const phrase = V("pas.rappels", { liste: listeJours(l) });
  vue.innerHTML = `<div class="vr">
    <svg viewBox="0 0 18 22" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M9 1.5a5.2 5.2 0 0 0-5.2 5.2v2.7h-.3A2.5 2.5 0 0 0 1 11.9v6.6A2.5 2.5 0 0 0 3.500 21h11a2.500 2.500 0 0 0 2.500-2.500v-6.600a2.500 2.500 0 0 0-2.500-2.500h-.3V6.700A5.200 5.200 0 0 0 9 1.500Zm-3.300 7.900V6.700a3.300 3.300 0 0 1 6.600 0v2.700Z"/></svg>
    <small>${Maj(jourPremiere.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))}</small>
    <time>08:00</time>
    <div class="ntf" role="img" aria-label="${fr(`Notification de Vaiiya : ${premiere}, c'est aujourd'hui. Elle t'attend, prête à lancer.`)}">
      <img src="${A}icone.webp" alt="">
      <div>
        <p><b>Vaiiya</b><span>maintenant</span></p>
        <strong>${fr(`${premiere}, c'est aujourd'hui`)}</strong>
        <em>${fr("Elle t'attend, prête à lancer.")}</em>
      </div>
    </div>
  </div>`;
  const v = $(".vr"), n = $(".ntf"), heure = $("time", v);

  /* Le Guide tient son téléphone sous la notification */
  const H = tel.clientHeight, yB = v.offsetTop + n.offsetTop + n.offsetHeight + 12;
  caseBulle({ t: `${yB}px`, ql: "calc(50% - 10px)", qp: "50%" });
  const yG = yB + hauteurBulle(phrase) + 6;
  place("milieu");
  gd.style.setProperty("--gy", `${yG}px`);
  gd.style.setProperty("--gs", String(Math.max(.5, Math.min(.92, (H - 118 - yG) / (tel.clientWidth * .92))).toFixed(3)));
  pose("telephone");

  const lire = (m: number) => { heure.textContent = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
  const suite = () => {
    appel({
      label: "Oui, préviens-moi", lien: "Plus tard",
      clic: () => { S.rappels = true; void cfg.activerRappels(); aller("visite"); },
      surLien: () => { S.rappels = false; aller("visite"); },
    });
    $(".cta", appelZone).classList.add("arrive");
  };
  if (reduit) {
    lire(19 * 60);
    n.classList.add("la");
    dire(phrase, { pose: "telephone", net: true });
    suite();
    return;
  }
  const t0 = performance.now(), duree = 1250, de = 8 * 60;
  const pas = (t: number) => {
    if (!heure.isConnected) return;
    const f = Math.max(0, Math.min(1, (t - t0) / duree)), e = f * f * (3 - 2 * f);
    lire(Math.round(de + (19 * 60 - de) * e));
    if (f < 1) requestAnimationFrame(pas);
  };
  requestAnimationFrame(pas);
  plus_tard(() => {
    n.classList.add("la");
    v.classList.add("vibre");
    if (navigator.vibrate) navigator.vibrate([26, 70, 26]);
    note(88, 0, .5, .05, "sine");
    note(91, .11, .9, .05, "sine");
    const r = document.createElement("i");
    r.className = "rim";
    n.append(r);
    plus_tard(() => r.remove(), 2800);
  }, duree + 60);
  plus_tard(() => dire(phrase, { pose: "telephone" }), duree + 640);
  plus_tard(suite, duree + 1000);
};

/* ═══ La visite ═══ */
const IC: Record<string, string> = {
  accueil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/></svg>',
  entrainement: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/></svg>',
  nutrition: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3v8a2.5 2.5 0 0 1-2 2.4V21M3 3v6M11 3v6"/><path d="M17 21v-7c-2 0-3-2-3-5s1.500-6 3-6c1.500 0 3 2 3 6v12"/></svg>',
  communaute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.500 12a8 8 0 0 1-11.800 7L3.500 20.500 5 15.300A8 8 0 1 1 20.500 12z"/></svg>',
};
const CHAPS = [
  { id: "accueil", t: "Accueil" },
  { id: "entrainement", t: "Entraînement" },
  { id: "guide", t: "" },
  { id: "nutrition", t: "Nutrition" },
  { id: "communaute", t: "Communauté" },
];
let chap = 0, chapFait: boolean[] = [];
const FICHES = {
  squat: { n: "Squat", m: ["Quadriceps", "Fessiers"], tip: "Pieds largeur d'épaules, talons ancrés. Descends à l'amplitude qui reste confortable.", ben: "Le geste de base du bas du corps : cuisses, fessiers et gainage travaillent ensemble." },
  developpe: { n: "Développé couché", m: ["Pectoraux", "Triceps", "Épaules"], tip: "Omoplates serrées, barre au niveau du bas des pectoraux, pieds ancrés.", ben: "La référence de la poussée horizontale pour le haut du corps." },
  rowing: { n: "Rowing barre", m: ["Dos", "Biceps"], tip: "Buste penché à quarante-cinq degrés, dos plat, tire vers le nombril.", ben: "Construit l'épaisseur du dos." },
  pompes: { n: "Pompes", m: ["Pectoraux", "Triceps", "Épaules"], tip: "Corps aligné des talons à la tête, coudes à 45°. Pose les genoux pour alléger sans perdre le geste.", ben: "Développe la poussée du haut du corps et la stabilité des épaules." },
};
const PLAT: { nom: string; kcal: number; p: number; g: number; l: number; lignes: { nom: string; q: string; kcal: number; x?: number; y?: number }[] } = { nom: "Poke bowl", kcal: 745, p: 37, g: 55, l: 40, lignes: [
  { nom: "Saumon", q: "130 g", kcal: 260, x: 25, y: 41 },
  { nom: "Riz", q: "150 g", kcal: 210, x: 36, y: 74 },
  { nom: "Avocat", q: "70 g", kcal: 144, x: 53, y: 44 },
  { nom: "Sauce soja-sésame", q: "10 ml", kcal: 48 },
  { nom: "Edamame", q: "35 g", kcal: 42, x: 59, y: 77 },
  { nom: "Sésame", q: "3 g", kcal: 18, x: 44, y: 61 },
  { nom: "Chou rouge", q: "40 g", kcal: 12, x: 80, y: 52 },
  { nom: "Concombre", q: "70 g", kcal: 8, x: 66, y: 21 },
  { nom: "Oignon nouveau", q: "10 g", kcal: 3, x: 46, y: 13 },
] };
const posesDe = (k: string) => [1, 2, 3].map((n) => `<img src="${A}f-${k}-${n}.webp" alt=""${n === 1 ? ' class="on"' : ""}>`).join("");
let minuteurPoses: ReturnType<typeof setInterval> | undefined;
function jouerPoses(box: HTMLElement) {
  clearInterval(minuteurPoses);
  if (reduit) return;
  const imgs = $$("img", box);
  let i = 0;
  minuteurPoses = setInterval(() => {
    if (!box.isConnected) { clearInterval(minuteurPoses); return; }
    imgs[i].classList.remove("on");
    i = (i + 1) % imgs.length;
    imgs[i].classList.add("on");
  }, 800);
}
/* La séance se lance pour de vrai, en petit : le compte à rebours de la première
   séance du jour, puis le mouvement. */
function lancerApercu(fini: Fini) {
  const h = $("#v-h");
  h.onclick = null;
  geste();
  const t = document.createElement("div");
  t.className = "v-tunnel";
  t.innerHTML = `<div class="v-intro"><b>${fr("PRÊT ?")}</b><img src="${A}${S.guide || "nora"}-approuve.webp" alt=""></div>
    <div class="v-poses">${posesDe("squat")}</div>
    <div class="v-t-bas"><b>Squat</b><span>${fr("Série 1 sur 3 · 12 répétitions")}</span></div>`;
  h.replaceWith(t);
  const mot = $(".v-intro b", t);
  const voir = () => {
    t.classList.add("joue");
    jouerPoses($(".v-poses", t));
    plus_tard(() => fini(V("pas.visite.accueil.fin")), 1500);
  };
  if (reduit) { voir(); return; }
  ([["3", 850], ["2", 1200], ["1", 1550], ["GO", 1900]] as [string, number][]).forEach(([m, q]) => plus_tard(() => {
    mot.textContent = String(m);
    mot.classList.remove("tape");
    void mot.offsetWidth;
    mot.classList.add("tape");
    if (m === "GO") $(".v-intro img", t).style.opacity = "0";
  }, q));
  plus_tard(voir, 2400);
}
/* La fiche d'un mouvement : le geste en grand, ce qu'il travaille, la consigne. */
function ouvrirFiche(k: keyof typeof FICHES, fini: Fini) {
  const f = FICHES[k];
  const d = document.createElement("div");
  d.className = "v-fiche";
  d.setAttribute("role", "dialog");
  d.setAttribute("aria-label", f.n);
  d.innerHTML = `<div class="v-poses">${posesDe(k)}</div>
    <h3>${fr(f.n)}</h3><p class="v-m">${f.m.join(" · ")}</p>
    <p class="v-tip">${fr(f.tip)}</p><p class="v-ben">${fr(f.ben)}</p>
    <button type="button" class="cta">Revenir aux mouvements</button>`;
  $(".mini").append(d);
  jouerPoses($(".v-poses", d));
  lacher();
  parler(V("pas.visite.fiche"), { pose: "haltere" }).then(() => viser($(".cta", d), { sansFil: true }));
  $(".cta", d).onclick = () => {
    clearInterval(minuteurPoses);
    lacher();
    d.classList.add("sort");
    plus_tard(() => d.remove(), 320);
    fini(V("pas.visite.mouvements.fin"));
  };
}
/* L'assiette : la scène de la vitrine, dans le petit Vaiiya. Le total reste la somme
   des lignes, et chaque aliment reçoit son numéro quand la ligne passe dessus. */
const parts = () => {
  const k = [PLAT.p * 4, PLAT.g * 4, PLAT.l * 9];
  const t = k[0] + k[1] + k[2];
  let d = 0;
  return k.map((v) => { const p = (v / t) * 100; const a = { p: p.toFixed(2), d: d.toFixed(2) }; d += p; return a; });
};
function poserBilan(total: number) {
  const part = total / PLAT.kcal;
  const b = $(".v-bilan");
  b.style.setProperty("--fait", String(part.toFixed(3)));
  $("#v-somme").textContent = String(total);
  $$("[data-macro]", b).forEach((m) => { m.textContent = String(Math.round(Number(m.dataset.macro) * part)); });
}
function bilanHTML() {
  const a = parts();
  const lourd = Math.max(...PLAT.lignes.map((l) => l.kcal));
  let n = 0;
  return `<div class="v-b-tete"><div class="v-anneau"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="fond" cx="60" cy="60" r="52"/>
    ${["p", "g", "l"].map((m, i) => `<circle class="arc ${m}" cx="60" cy="60" r="52" pathLength="100" style="--part:${a[i].p};--debut:${a[i].d}"/>`).join("")}</svg>
    <p><b class="vy-nombre"><i>~</i><span id="v-somme">0</span></b><span>kcal</span></p></div>
    <div><p class="v-b-nom">${PLAT.nom}</p><dl class="v-macros">
    <div class="p"><dt>Protéines</dt><dd><b class="vy-nombre" data-macro="${PLAT.p}">0</b> g</dd></div>
    <div class="g"><dt>Glucides</dt><dd><b class="vy-nombre" data-macro="${PLAT.g}">0</b> g</dd></div>
    <div class="l"><dt>Lipides</dt><dd><b class="vy-nombre" data-macro="${PLAT.l}">0</b> g</dd></div></dl></div></div>
    <ol class="v-aliments">${PLAT.lignes.map((l) => `<li style="--part:${(l.kcal / lourd).toFixed(3)}"><i class="vy-nombre">${l.x !== undefined ? ++n : ""}</i><span>${fr(l.nom)}</span><span class="vy-nombre">${fr(l.q)}</span><span class="vy-nombre">${l.kcal}</span></li>`).join("")}</ol>
    <p class="v-b-note">${fr("Une estimation, que tu ajustes avant de noter.")}</p>`;
}
function scanner(fini: Fini) {
  const box = $(".v-assiette");
  $(".v-obt").remove();
  box.classList.add("flash");
  lacher();
  parler(V("pas.visite.nutrition.regarde"), { pose: "assiette" });
  $(".v-bilan").classList.add("monte");
  const lis = $$(".v-aliments li");
  const SCAN = 2600, DEBUT = 520;
  const fin = () => fini(V("pas.visite.nutrition.fin"));
  if (reduit) {
    $$(".v-rep").forEach((r) => r.classList.add("vu"));
    lis.forEach((l) => l.classList.add("vu"));
    poserBilan(PLAT.kcal);
    fin();
    return;
  }
  plus_tard(() => $(".v-balaye").classList.add("passe"), DEBUT);
  let n = 0, total = 0;
  PLAT.lignes
    .map((l, i) => ({ l, li: lis[i], rep: l.x !== undefined ? $(`.v-rep[data-n="${++n}"]`) : null, t: l.y !== undefined ? SCAN * (l.y / 100) : SCAN + 220 }))
    .sort((a, b) => a.t - b.t)
    .forEach((e) => plus_tard(() => {
      e.rep?.classList.add("vu");
      e.li.classList.add("vu");
      total += e.l.kcal;
      poserBilan(total);
    }, DEBUT + e.t));
  plus_tard(fin, DEBUT + SCAN + 1700);
}
/* La lumière guide : un contour qui tourne autour de ce qu'il faut toucher, un fil
   qui part de la bulle, et le reste de l'écran qui baisse d'un cran. */
let jetonVisite = 0;
function mesure(el: HTMLElement) {
  const m = $(".mini"), bm = m.getBoundingClientRect(), b = el.getBoundingClientRect();
  const z = bm.width / m.clientWidth || 1;
  return { x: (b.left - bm.left) / z, y: (b.top - bm.top) / z, l: b.width / z, h: b.height / z };
}
function lacher() {
  const m = $(".mini");
  if (!m) return;
  m.classList.remove("vise");
  $$(".rim", m).forEach((r) => r.remove());
  $$(".cible", m).forEach((c) => c.classList.remove("cible"));
  $(".m-fil").innerHTML = "";
}
function geste() {
  jetonVisite++;
  const g = $(".mini-g");
  if (g) {
    delete g.dataset.parle;
    const f = $(".fantome", g), e = $(".ecrit", g);
    if (f && e) e.innerHTML = f.innerHTML;
  }
  $(".mini")?.classList.remove("ecoute");
  lacher();
}
function viser(cibles: HTMLElement | HTMLElement[], o: { zone?: HTMLElement; sansFil?: boolean } = {}) {
  const m = $(".mini");
  const liste = (Array.isArray(cibles) ? cibles : [cibles]).filter(Boolean);
  if (!m || !liste.length) return;
  lacher();
  liste.forEach((el, i) => {
    el.classList.add("cible");
    const r = document.createElement("i");
    r.className = "rim";
    r.style.setProperty("--d", `${i * -.5}s`);
    el.append(r);
  });
  const zone = mesure(o.zone || liste[0]);
  m.style.setProperty("--sx", `${zone.x + zone.l / 2}px`);
  m.style.setProperty("--sy", `${zone.y + zone.h / 2}px`);
  m.style.setProperty("--sr", `${Math.max(zone.l, zone.h) * .58}px`);
  m.classList.add("vise");
  if (o.sansFil) return;
  /* Le fil de lumière : de la bulle au haut de la cible */
  const p = mesure($(".mini-g p")), a = mesure(liste[0]);
  const x1 = p.x + Math.min(p.l - 30, 40), y1 = p.y + p.h - 2, x2 = a.x + a.l / 2, y2 = a.y - 3;
  if (y2 - y1 < 8) return;
  const k = Math.min(60, (y2 - y1) * .55);
  const d = `M${x1} ${y1}C${x1} ${y1 + k},${x2} ${y2 - k},${x2} ${y2}`;
  $(".m-fil").innerHTML = `<defs><linearGradient id="f-g" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="#BA80FA"/><stop offset=".6" stop-color="#F99FB0"/><stop offset="1" stop-color="#FEC175"/></linearGradient></defs>
    <path class="f-halo" d="${d}"/><path class="f-ligne" d="${d}" pathLength="1"/><path class="f-comete" d="${d}" pathLength="1"/>`;
}
function parler(txt: string, o: { enc?: boolean; vers?: HTMLElement; pose?: string } = {}): Promise<void> {
  const j = ++jetonVisite;
  const m = $(".mini"), g = $(".mini-g"), p = $("p", g), html = fr(txt);
  lacher();
  const geste = o.pose || (o.vers ? "designe" : o.enc ? "approuve" : "designe");
  const ava = $<HTMLImageElement>(".m-ava img", g);
  ava.src = srcPose(geste);
  ava.style.setProperty("--f", String(COTE_POSE[geste] === "g" ? -1 : 1));
  p.innerHTML = `<span class="fantome">${html}</span><span class="ecrit"></span>`;
  g.dataset.parle = "1";
  m.classList.add("ecoute");
  m.classList.toggle("guide-bas", !!o.vers);
  g.toggleAttribute("data-bas", !!o.vers);
  if (o.vers) {
    const t = mesure(o.vers), bar = mesure($(".barre"));
    const hautGuide = bar.y - g.offsetHeight - 16;
    g.style.setProperty("--dy", `${Math.round(hautGuide - g.offsetTop)}px`);
    const sc = $(".mini-scene"), haut = mesure(sc).y;
    const pieces = ([...sc.children] as HTMLElement[]).flatMap((c) => (c.matches(".v-chat") ? [...c.children] as HTMLElement[] : [c]));
    const bas = Math.max(0, ...pieces.map((c) => { const r = mesure(c); return r.y + r.h - haut; }));
    m.style.setProperty("--decal", `${Math.max(0, Math.min(190, Math.ceil(bas + 12 - hautGuide)))}px`);
    p.style.setProperty("--qx", `${Math.round(t.x + t.l / 2 - mesure(p).x - 10)}px`);
  } else g.style.setProperty("--dy", "0px");
  p.classList.remove("arrive");
  void p.offsetWidth;
  p.classList.add("arrive");
  tic();
  return new Promise((fini) => {
    taper($(".ecrit", p), html, () => j === jetonVisite, () => {
      plus_tard(() => {
        if (j !== jetonVisite) return;
        delete g.dataset.parle;
        m.classList.remove("ecoute");
        fini();
      }, 320);
    }, 38);
  });
}
function barre() {
  return `<nav class="barre" aria-label="Navigation de Vaiiya">${CHAPS.map((c, i) => c.id === "guide"
    ? `<button type="button" class="onglet orbe" data-c="${i}" aria-label="Ton Guide"><img src="${A}${S.guide || "nora"}-avatar.webp" alt=""></button>`
    : `<button type="button" class="onglet" data-c="${i}">${IC[c.id]}<span>${c.t}</span></button>`).join("")}</nav>`;
}
function majBarre(appelVers: number) {
  $$(".onglet").forEach((b, i) => {
    b.classList.toggle("actif", i === chap);
    b.classList.toggle("vu", !!chapFait[i] && i !== chap);
    b.classList.toggle("appel", i === appelVers);
    b.setAttribute("aria-current", i === chap ? "page" : "false");
    b.onclick = () => { if (i === appelVers) { chap = i; chapitre(); } };
  });
}
function chapitre() {
  const sc = $(".mini-scene");
  lacher();
  jetonVisite++;
  majBarre(-1);
  $$(".mini-fil i").forEach((x, i) => x.classList.toggle("fait", i <= chap));
  const entrer = () => {
    sc.classList.remove("sort", "finie");
    sc.innerHTML = "";
    monterChapitre(sc);
    sc.classList.remove("entre");
    void sc.offsetWidth;
    sc.classList.add("entre");
  };
  if (sc.firstChild && !reduit) {
    sc.classList.add("sort");
    plus_tard(entrer, 240);
  } else entrer();
}
function monterChapitre(sc: HTMLElement) {
  const premiere = (S.semaine && S.semaine.find(Boolean)) || "Full Body";
  const fini = (phrase: string) => {
    chapFait[chap] = true;
    sc.classList.add("finie");
    if (chap < CHAPS.length - 1) {
      const onglet = $$(".onglet")[chap + 1];
      majBarre(chap + 1);
      parler(phrase, { enc: true, vers: onglet }).then(() => viser(onglet, { sansFil: true }));
    } else {
      majBarre(-1);
      parler(phrase, { enc: true }).then(() => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "cta v-fin";
        b.textContent = fr("J'ai compris");
        b.onclick = () => aller("installer");
        $(".mini").append(b);
        viser(b, { sansFil: true });
      });
    }
  };
  if (chap === 0) {
    sc.innerHTML = `<button type="button" class="v-hero" id="v-h"><img src="${A}${photoSeance(premiere)}.webp" alt=""><div><small>Ta prochaine séance</small><b>${fr(premiere)}</b><span>${fr("C'est parti")}</span></div></button>
      <div class="v-ligne"><div>${FLAMME}<span><b class="vy-nombre">1</b>jour</span></div><div><img src="${A}bronze.webp" alt=""><span><b class="vy-nombre">60</b>EXP</span></div></div>`;
    $("#v-h").onclick = () => lancerApercu(fini);
    parler(V("pas.visite.accueil"), { pose: "designe" }).then(() => viser($("#v-h")));
  }
  if (chap === 1) {
    sc.innerHTML = `<div class="v-mvts">${Object.entries(FICHES).map(([k, f]) => `<button type="button" class="v-mvt" data-m="${k}"><img src="${A}f-${k}-1.webp" alt=""><span>${fr(f.n)}</span></button>`).join("")}<p class="v-chiffres">${fr(`<b class="vy-nombre">${D.mouvements}</b> mouvements, <b class="vy-nombre">${D.seances.length}</b> séances, <b class="vy-nombre">${D.programmes}</b> programmes.`)}</p></div>`;
    $$(".v-mvt").forEach((b) => { b.onclick = () => { $$(".v-mvt").forEach((x) => { x.onclick = null; }); ouvrirFiche(b.dataset.m as keyof typeof FICHES, fini); }; });
    parler(V("pas.visite.mouvements"), { pose: "haltere" }).then(() => viser($$(".v-mvt"), { zone: $(".v-mvts") }));
  }
  if (chap === 2) {
    sc.innerHTML = `<div class="v-chat" id="v-c"><button type="button" class="v-brouillon" style="--i:0">${fr("Décale ma séance à demain")}</button></div>`;
    parler(V("pas.visite.guide"), { pose: "telephone" }).then(() => viser($(".v-brouillon")));
    $(".v-brouillon").onclick = () => {
      const c = $("#v-c");
      lacher();
      c.innerHTML = `<div class="v-moi">${fr("Décale ma séance à demain")}</div>`;
      parler(V("pas.visite.guide.prepare"), { pose: "carnet" });
      plus_tard(() => {
        const carte = document.createElement("div");
        carte.className = "v-carte";
        carte.innerHTML = `<b>${fr(`${premiere} passe à mardi`)}</b><p>${fr("Le reste de ta semaine ne bouge pas.")}</p>
          <div class="v-semaine">${LETTRES.map((l, i) => `<i class="${i === 0 ? "on" : ""}" data-v="${i}">${l}</i>`).join("")}</div>
          <button type="button" style="margin-top:10px">Valider</button>`;
        c.append(carte);
        const v = $("button", carte);
        parler(V("pas.visite.guide.carte"), { pose: "carnet" }).then(() => viser(v, { sansFil: true }));
        v.onclick = () => {
          v.onclick = null;
          geste();
          $('[data-v="0"]', carte).classList.remove("on");
          $('[data-v="1"]', carte).classList.add("on");
          carte.classList.add("ok");
          v.textContent = fr("C'est fait");
          plus_tard(() => fini(V("pas.visite.guide.fin")), 900);
        };
      }, 1100);
    };
  }
  if (chap === 3) {
    let n = 0;
    sc.innerHTML = `<div class="v-assiette"><img src="${A}poke.webp" alt="">${PLAT.lignes.filter((l) => l.x !== undefined).map((l) => `<b class="v-rep vy-nombre" data-n="${++n}" style="left:${l.x}%;top:${l.y}%">${n}</b>`).join("")}<i class="v-balaye"></i><button type="button" class="v-obt" aria-label="Prendre la photo"></button></div>
      <div class="v-bilan">${bilanHTML()}</div>`;
    $(".v-obt").onclick = () => scanner(fini);
    parler(V("pas.visite.nutrition"), { pose: "assiette" }).then(() => viser($(".v-obt"), { sansFil: true }));
  }
  if (chap === 4) {
    /* Le relais : deux montants, quatre barreaux. Un barreau ne s'allume que
       quand les deux l'ont atteint, et c'est lui qui dévoile l'affiche. */
    const moi = S.prenom || cfg.prenomDefaut;
    const BOUTONS = ["Faire ma séance", "Séance suivante", "Encore une", "La dernière"];
    const SUITES = [
      [V("pas.visite.relais.1"), "approuve"],
      [V("pas.visite.relais.2"), "montre"],
      [V("pas.visite.relais.3"), "designe"],
    ];
    sc.innerHTML = `<div class="v-nuit"><i class="bv-rayons"></i></div>
      <div class="v-rel">
        <div class="v-haut">
          <div class="v-pos">
            ${[1, 2, 3, 4].map((i) => `<img src="${A}aurore-${i}.webp" alt=""${i > 1 ? ` class="rv" data-n="${i}"` : ""}>`).join("")}
            <i class="v-front"></i><i class="v-voile"></i>
            <span class="v-sig">Vaiiya<img src="${A}marque-blanc.webp" alt=""></span>
            <div class="v-nom"><b>Aurore</b><small>${moi} &amp; Marc</small><span class="v-bdg"><img src="${A}aurore-4.webp" alt=""><b>${fr("Badge Premier relais")}</b></span></div>
            <div class="v-msg"><i>M</i><span></span></div>
          </div>
          <div class="v-ech" aria-hidden="true">
            ${[4, 3, 2, 1].map((i) => `<div class="v-bar" data-n="${i}" style="--n:${i}"><i class="t"></i><i class="l"></i><i class="m"></i></div>`).join("")}
            <i class="v-av toi">${(moi[0] ?? "T").toUpperCase()}</i><i class="v-av marc">M</i>
            <div class="v-noms"><small>Toi</small><small>Marc</small></div>
          </div>
        </div>
        <button type="button" class="v-btn" id="v-b">${fr(BOUTONS[0])}</button>
      </div>
      <canvas class="v-part" aria-hidden="true"></canvas>`;
    const pos = $(".v-pos"), btn = $("#v-b"), msg = $(".v-msg"), rel = $(".v-rel"), mini = $(".mini");
    const feu = etincelles($(".v-part"));
    let n = 0, libre = true;
    const lumiere = () => {
      const f = $(".v-front");
      f.classList.remove("go");
      void f.offsetWidth;
      f.classList.add("go");
    };
    const devoiler = (k: number) => {
      const img = $(`.rv[data-n="${k}"]`);
      if (img) img.classList.add("on");
      lumiere();
      pos.classList.remove("souffle");
      void pos.offsetWidth;
      pos.classList.add("souffle");
    };
    const finale = () => {
      rel.classList.add("fin");
      mini.classList.add("nuit");
      const r = mesure(pos), haut = mesure($(".mini-g p"));
      const y0 = haut.y + haut.h + 12, y1 = mini.clientHeight - 92 - 56 - 12;
      const s = Math.min((y1 - y0) / r.h, (mini.clientWidth - 36) / r.l);
      pos.style.transform = `translate(${Math.round(mini.clientWidth / 2 - r.x - r.l / 2)}px, ${Math.round((y0 + y1) / 2 - r.y - r.h / 2)}px) scale(${s.toFixed(3)})`;
      devoiler(4);
      plus_tard(() => {
        const q = mesure(pos);
        feu.gerbe(q.x + q.l / 2, q.y + q.h * .42, 110, { v: 9.5, g: .05 });
        feu.braises({ x: q.x + q.l / 2, y: q.y + q.h / 2, l: mini.clientWidth, h: q.h }, .14);
        if (navigator.vibrate) navigator.vibrate([18, 40, 70]);
        [52, 60, 64, 67, 72, 76].forEach((m) => note(m, 0, 1.9, .04));
        rel.classList.add("eclat");
      }, 1050);
      plus_tard(() => {
        parler(V("pas.visite.relais.gagne"), { pose: "fier" })
          .then(() => plus_tard(() => { if (mini.isConnected) fini(V("pas.visite.fin")); }, 1100));
      }, 1800);
    };
    btn.onclick = () => {
      if (!libre) return;
      libre = false;
      geste();
      const k = ++n;
      btn.classList.add("prise");
      tic();
      note(60 + [7, 12, 16, 19][k - 1], 0, .7, .05, "sine");
      $(".v-av.toi").style.setProperty("--l", String(k));
      $(`.v-bar[data-n="${k}"] .t`).classList.add("on");
      plus_tard(() => {
        $(".v-av.marc").style.setProperty("--l", String(k));
        $(`.v-bar[data-n="${k}"] .m`).classList.add("on");
        $("span", msg).textContent = fr(`Marc a franchi le maillon du jour · ${k} sur 4.`);
        msg.classList.add("la");
        note(60 + [12, 16, 19, 24][k - 1], 0, .8, .05, "sine");
        tic();
      }, 640);
      plus_tard(() => {
        $(`.v-bar[data-n="${k}"]`).classList.add("ok");
        if (k === 4) { msg.classList.remove("la"); finale(); return; }
        devoiler(k + 1 === 4 ? 0 : k + 1);
      }, 1180);
      if (k === 4) return;
      plus_tard(() => msg.classList.remove("la"), 2700);
      plus_tard(() => {
        libre = true;
        btn.classList.remove("prise");
        btn.textContent = fr(BOUTONS[k]);
        const [txt, geste2] = SUITES[k - 1];
        parler(txt, { pose: geste2 }).then(() => viser(btn, { sansFil: true }));
      }, 2200);
    };
    parler(V("pas.visite.relais"), { pose: "fier" }).then(() => viser(btn, { sansFil: true }));
  }
}
E.visite = () => {
  ciel(1);
  cacherGuide();
  taireBulle();
  appel(null);
  chap = 0; chapFait = [];
  vue.innerHTML = `<div class="mini"><div class="mini-scene"></div><i class="m-voile"></i>
    <svg class="m-fil" aria-hidden="true"></svg>
    <div class="mini-fil" aria-hidden="true">${CHAPS.map(() => "<i></i>").join("")}</div>
    <div class="mini-g"><span class="m-ava"><i class="m-halo"></i><img src="${srcPose("designe")}" alt=""></span><p></p></div>
    <button type="button" class="passer">Passer</button>${barre()}</div>`;
  $(".passer").onclick = () => aller("installer");
  const mini = $(".mini");
  mini.addEventListener("pointerdown", (e) => {
    if ((e.target as HTMLElement).closest(".cible, .passer") || !$(".cible", mini)) return;
    mini.classList.remove("rappel");
    void mini.offsetWidth;
    mini.classList.add("rappel");
    plus_tard(() => mini.classList.remove("rappel"), 760);
  });
  chapitre();
};


/* ═══ Après la carte ═══ */
const SOURCES = ["TikTok", "Instagram", "Un ami", "Google", "Autre chose"];
E.source = () => {
  ciel(1);
  place("haut");
  dire(V("pas.source"), { pose: "carnet" });
  vue.innerHTML = `<div class="sources">${SOURCES.map((s, i) => `<button type="button" class="source" aria-pressed="false" style="--i:${i}">${fr(s)}</button>`).join("")}</div>`;
  $$(".source").forEach((b, i) => {
    b.onclick = () => {
      tic();
      S.source = SOURCES[i];
      b.setAttribute("aria-pressed", "true");
      void cfg.enregistrerSource(SOURCES[i]);
      dire(V("pas.source.merci"), { pose: "approuve", hop: true });
      plus_tard(() => { void aller("rappels"); }, 1100);
    };
  });
  appel(null);
};

const estInstallee = () => matchMedia("(display-mode: standalone)").matches
  || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const estIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);

E.installer = () => {
  if (estInstallee() || (!cfg.peutInstaller() && !estIOS())) { cfg.terminer(true); return; }
  ciel(1);
  place("milieu");
  gd.style.setProperty("--gy", telBas() ? "112px" : "140px");
  gd.style.setProperty("--gs", telBas() ? ".5" : ".62");
  caseBulle({ ql: "calc(50% - 10px)", qp: "50%" });
  dire(V("pas.installer"), { pose: "telephone" });
  const cases = Array.from({ length: 11 }, (_, i) => (i === 6 ? `<img src="${A}logo.webp" alt="Vaiiya">` : "<i></i>")).join("");
  vue.innerHTML = `<div class="ecran-tel">${cases}</div>`;
  const passer = () => cfg.terminer(true);
  appel({
    label: "Installer Vaiiya", lien: "Plus tard", surLien: passer,
    clic: async () => {
      const propose = await cfg.installer();
      if (propose) { passer(); return; }
      if (estIOS()) {
        dire(V("pas.installer.ios"), { pose: "telephone" });
        appel({ label: "C'est fait", clic: passer });
        return;
      }
      passer();
    },
  });
};

/** Monte le parcours dans `racine` et rend la fonction qui l'arrête. */
export function demarrerParcours(racine: HTMLElement, c: ConfigParcours): () => void {
  cfg = { ...c, prenomDefaut: propre(c.prenomDefaut) };
  tel = racine;
  tel.innerHTML = SQUELETTE;
  vue = $("#vue"); perso = $("#perso"); bulle = $("#bulle"); appelZone = $("#appel"); fil = $("#fil"); gd = $(".gd"); gdIn = $(".gd-in");
  imgs = $$<HTMLImageElement>(".gd img");
  reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  S = c.etat ?? etatVide();
  S.prenom = propre(S.prenom);
  infos = { numero: null };
  ecran = null;
  pCiel = 0;
  dessinerEtoiles();
  if (S.guide) prechargerGuide();
  $("#retour").onclick = () => {
    if (ecran && PRECEDENT[ecran]) void aller(PRECEDENT[ecran]);
    else if (ecran === "prenom") void aller("guide");
  };
  let vivant = true;
  document.fonts?.ready?.then(() => { if (vivant && ecran === "mesures") void aller("mesures"); });
  if (c.depart === "apres-compte") void finirCompte();
  else void aller(c.depart);
  return () => {
    vivant = false;
    jetonEcran++;
    jetonParole++;
    jetonVisite++;
    minuteurs.forEach(clearTimeout);
    minuteurs = [];
    clearInterval(minuteurPoses);
    document.dispatchEvent(new Event("vaiiya:ecran"));
    tel.innerHTML = "";
  };
}

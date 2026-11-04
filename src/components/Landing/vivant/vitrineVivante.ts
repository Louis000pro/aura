/* ═══ LA VITRINE VIVANTE ═══
   Tout ce qui bouge par script sur vaiiya.fr, chargé à part : la page est déjà
   entière dans le HTML, et ce code ne fait que la jouer. Il arrive quand la
   vitrine est réellement à l'écran, donc jamais chez un membre connecté, dont
   l'accueil la garde masquée le temps de lire sa session.

   ⚠️ TOUT S'ARRÊTE AVEC LA FONCTION RENDUE : une personne qui se connecte quitte
   la vitrine sans recharger la page. Aucune boucle, aucun écouteur, aucun
   contexte WebGL ne doit lui survivre.

   Ce qui tourne sans script (les rails, les phrases, l'aurore, le relais)
   vit dans le module CSS, et le veilleur le fige hors de l'écran. */

import { creerFond, type Fond, type Place } from "./fondLogo";
import { jouerConversation } from "./conversation";
import { borne, creerVeilleur, trouve, type Classes, type Veilleur } from "./veilleur";

/* ═══ LA JOURNÉE SUIT LE DÉFILEMENT ═══
   En haut, le ciel s'éclaire à mesure que le jour monte : le soleil se lève
   parce qu'on avance. En bas, la lueur s'éteint à mesure que la nuit arrive,
   et le néon s'allume quand il fait assez sombre pour qu'on le voie. */
function journee(racine: HTMLElement, veilleur: Veilleur, reduit: boolean, fondFixe: boolean, signal: AbortSignal) {
  const heros = trouve(racine, "[data-heros]");
  const fin = trouve(racine, "[data-fin]");
  const sonde = trouve(fin, "[data-sonde]");
  const monte = trouve(heros, "[data-monte]");
  const lignes = Array.from(heros.querySelectorAll<HTMLElement>("[data-sens]"));

  /* Le point du logo tombe où Nora et Sasha se rejoignent. Sur téléphone, le V
     reste plus large que l'écran pour laisser le texte au clair. */
  const crete = () => borne(innerWidth * .06, 52, 92);
  const aube = () => parseFloat(getComputedStyle(heros).paddingBottom) || 0;
  const crepuscule = () => sonde.offsetHeight;
  const placeHeros: Place = (w, h) => {
    const y = h - aube() - crete() + 6;
    const S = y * 1.06;
    const X = w < 700 ? borne((w * 1.5) / (2 * S * .7832), .5, 1) : borne(w / (2 * S * .7832) * 1.12, .7, 1.35);
    return { x: w / 2, y, S, X };
  };
  const placeFin: Place = (w) => {
    const S = w < 768 ? 190 : 236;
    return { x: w / 2, y: crepuscule() + (w < 768 ? 34 : 44) + S, S, X: 1 };
  };

  const fondHeros = creerFond(trouve<HTMLCanvasElement>(heros, "canvas"), placeHeros, {}, fondFixe);
  const fondFin = creerFond(trouve<HTMLCanvasElement>(fin, "canvas"), placeFin, { neon: 1, rond: 1, allume: 0, jour: fondFixe ? 0 : .9 }, fondFixe);
  const tenir = (zone: Element, fond: Fond | null) => {
    if (fond) veilleur.surveiller(zone, (vu) => (vu ? fond.demarrer() : fond.arreter()));
  };
  tenir(heros, fondHeros);
  tenir(fin, fondFin);

  if (fondHeros && !fondFixe && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    heros.addEventListener("pointermove", (e) => {
      const b = heros.getBoundingClientRect();
      fondHeros.viser(e.clientX - b.left, e.clientY - b.top, .9);
    }, { signal });
    heros.addEventListener("pointerleave", () => fondHeros.viser(0, 0, 0), { signal });
  }

  let neonAllume = false;
  const minuteries: number[] = [];
  function allumerNeon() {
    neonAllume = true;
    if (!fondFin) return;
    if (reduit) {
      fondFin.regler({ allume: 1 });
      return;
    }
    /* Trois ratés, comme un vrai tube. */
    for (const [t, v] of [[0, .7], [70, .06], [170, .85], [240, .12], [420, 1]]) {
      minuteries.push(window.setTimeout(() => fondFin.regler({ allume: v }), t));
    }
  }
  signal.addEventListener("abort", () => minuteries.forEach(clearTimeout), { once: true });

  let attente = false;
  let dernier = -1;
  const bouger = () => {
    attente = false;
    const k = borne(window.scrollY / (heros.offsetHeight - aube()), 0, 1);
    /* Une fois le héros parti, plus rien à écrire ici. */
    if (k !== dernier) {
      dernier = k;
      if (!reduit) {
        for (const l of lignes) l.style.transform = `translate3d(${Number(l.dataset.sens) * k * 18}vw,0,0)`;
        monte.style.setProperty("--monte", k.toFixed(3));
      }
      if (!fondFixe) fondHeros?.regler({ ouvre: k, jour: .16 + .84 * k });
    }
    const hautFin = fin.getBoundingClientRect().top;
    if (!fondFixe) {
      const f = borne((innerHeight - (hautFin + crepuscule() * .35)) / (innerHeight * .75), 0, 1);
      fondFin?.regler({ jour: .9 * Math.pow(1 - f, 1.4) });
    }
    /* Le néon s'allume quand tout le logo est à l'écran. */
    if (!neonAllume && hautFin + placeFin(innerWidth, 0).y < innerHeight * .96) allumerNeon();
  };
  window.addEventListener("scroll", () => {
    if (attente) return;
    attente = true;
    requestAnimationFrame(bouger);
  }, { passive: true, signal });
  window.addEventListener("resize", bouger, { signal });
  bouger();

  return () => {
    fondHeros?.detruire();
    fondFin?.detruire();
  };
}

/* ═══ TOUT SE PARLE ═══
   Les fils se tracent en pixels réels : c'est ce qui garde une longueur de 100
   sur chaque chemin, donc des impulsions égales. */
function tracerFils(racine: HTMLElement, signal: AbortSignal) {
  const c = trouve(racine, "[data-constellation]");
  const svg = trouve<SVGSVGElement>(c, "svg");
  const paires = Array.from(svg.querySelectorAll<SVGGElement>("[data-x]"));
  const tracer = () => {
    const b = c.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${b.width} ${b.height}`);
    const cx = b.width / 2, cy = b.height / 2;
    for (const g of paires) {
      const X = Number(g.dataset.x) / 100 * b.width;
      const Y = Number(g.dataset.y) / 100 * b.height;
      const d = `M${X} ${Y} Q ${(X + cx) / 2} ${cy} ${cx} ${cy}`;
      for (const p of g.children) p.setAttribute("d", d);
    }
  };
  const ro = new ResizeObserver(tracer);
  ro.observe(c);
  signal.addEventListener("abort", () => ro.disconnect(), { once: true });
  tracer();
}

/* ═══ L'ASSIETTE SCANNÉE ═══
   Trois plats, la ligne passe, chaque aliment s'étiquette à son passage, et le
   total monte. Sans animation, le premier plat reste analysé, comme dans la page. */
function scannerAssiette(racine: HTMLElement, s: Classes, veilleur: Veilleur, reduit: boolean) {
  if (reduit) return;
  const box = trouve(racine, "[data-assiette]");
  const plats = Array.from(box.querySelectorAll<HTMLElement>("[data-plat]"));
  const ligne = trouve(box, "[data-ligne-scan]");
  const res = trouve(box, "[data-resultat]");
  const total = trouve(box, "[data-total]");
  const toutes = Array.from(box.querySelectorAll<HTMLElement>("[data-y]"));
  const att = veilleur.horloge(box);
  const SCAN = 2400;

  for (const m of toutes) m.classList.remove(s.vu);
  res.classList.remove(s.vu);

  void (async function boucle() {
    for (let i = 0; ; i = (i + 1) % plats.length) {
      const p = plats[i];
      for (const x of plats) x.classList.toggle(s.on, x === p);
      await att(900);
      ligne.classList.remove(s.passe);
      ligne.getBoundingClientRect();
      ligne.classList.add(s.passe);
      const macros = Array.from(p.querySelectorAll<HTMLElement>("[data-y]")).sort((a, b) => Number(a.dataset.y) - Number(b.dataset.y));
      let t = 0;
      for (const m of macros) {
        /* L'étiquette apparaît quand la ligne passe sur elle. */
        const quand = SCAN * Math.min(1, Math.max(0, (Number(m.dataset.y) - 6) / 88));
        await att(Math.max(0, quand - t));
        t = quand;
        m.classList.add(s.vu);
      }
      await att(Math.max(0, SCAN - t) + 80);
      ligne.classList.remove(s.passe);
      res.classList.add(s.vu);
      const fin = Number(p.dataset.plat);
      for (let k = 0; k <= 20; k++) {
        total.textContent = String(Math.round(fin * (1 - Math.pow(1 - k / 20, 3))));
        await att(32);
      }
      await att(3200);
      res.classList.remove(s.vu);
      for (const m of macros) m.classList.remove(s.vu);
      await att(320);
    }
  })();
}

/* ═══ LES RANGS QUI S'ALLUMENT ═══
   Le compteur monte de zéro au dernier seuil, et chaque rang s'allume quand il
   est atteint. Sans animation, ils restent tous allumés, comme dans la page. */
function allumerRangs(racine: HTMLElement, s: Classes, veilleur: Veilleur, reduit: boolean) {
  if (reduit) return;
  const zone = trouve(racine, "[data-rangs]");
  const esc = trouve(zone, "[data-escalier]");
  const exp = trouve(zone, "[data-exp]");
  const marches = Array.from(esc.querySelectorAll<HTMLElement>("[data-min]"));
  const seuils = marches.map((m) => Number(m.dataset.min));
  const att = veilleur.horloge(zone);
  let lance = false;
  veilleur.surveiller(zone, (vu) => {
    if (!vu || lance) return;
    lance = true;
    esc.setAttribute("data-anime", "");
    void (async function boucle() {
      for (;;) {
        for (const m of marches) m.classList.remove(s.atteint, s.ici);
        exp.textContent = "0";
        await att(600);
        for (let k = 0; k < marches.length; k++) {
          const dernier = k === marches.length - 1;
          if (k) {
            const a = seuils[k - 1], b = seuils[k], n = dernier ? 44 : 30;
            for (let i = 1; i <= n; i++) {
              exp.textContent = String(Math.round(a + (b - a) * (i / n)));
              await att(30);
            }
          }
          marches[k].classList.add(s.atteint);
          marches.forEach((m, i) => m.classList.toggle(s.ici, i === k));
          await att(dernier ? 3200 : 420);
        }
      }
    })();
  });
}

export function animerVitrine(racine: HTMLElement, s: Classes): () => void {
  const fin = new AbortController();
  const { signal } = fin;
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* Sur un appareil faible, le fond reste une image : le reste de la page
     coûte peu, lui compte chaque pixel. */
  const fondFixe = reduit || document.documentElement.classList.contains("perf-lite");

  const veilleur = creerVeilleur(signal);
  racine.querySelectorAll("[data-vivant]").forEach((el) => veilleur.surveiller(el));

  const eteindre = journee(racine, veilleur, reduit, fondFixe, signal);
  jouerConversation(racine, s, veilleur, reduit, signal);
  tracerFils(racine, signal);
  scannerAssiette(racine, s, veilleur, reduit);
  allumerRangs(racine, s, veilleur, reduit);

  return () => {
    fin.abort();
    eteindre();
  };
}

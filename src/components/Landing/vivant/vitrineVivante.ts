/* ═══ LA VITRINE VIVANTE ═══
   Tout ce qui bouge par script sur vaiiya.fr, chargé à part : la page est déjà
   entière dans le HTML, et ce code ne fait que la jouer. Il arrive quand la
   vitrine est réellement à l'écran, donc jamais chez un membre connecté, dont
   l'accueil la garde masquée le temps de lire sa session.

   ⚠️ TOUT S'ARRÊTE AVEC LA FONCTION RENDUE : une personne qui se connecte quitte
   la vitrine sans recharger la page. Aucune boucle, aucun écouteur, aucun
   contexte WebGL ne doit lui survivre.

   Ce qui tourne sans script (la frise, les phrases, les poses, le mur de mots)
   vit dans le module CSS, et le veilleur le fige hors de l'écran. */

import { creerFond, type Fond, type Place } from "./fondLogo";
import { jouerConversation } from "./conversation";
import { jouerPlateau, jouerRangs, jouerRelais, jouerRelie, scannerAssiette } from "./scenes";
import { borne, creerDefile, creerVeilleur, trouve, type Veilleur } from "./veilleur";
import type { Classes } from "./veilleur";

/* ═══ LE JOUR SE LÈVE AU DÉFILEMENT ═══
   En haut, le ciel s'éclaire à mesure que le jour monte : le soleil se lève
   parce qu'on avance. À la fin, le néon s'allume quand tout le logo est à l'écran. */
function journee(racine: HTMLElement, veilleur: Veilleur, reduit: boolean, fondFixe: boolean, signal: AbortSignal) {
  const heros = trouve(racine, "[data-heros]");
  const fin = trouve(racine, "[data-fin]");
  const monte = trouve(heros, "[data-monte]");
  const lignes = Array.from(heros.querySelectorAll<HTMLElement>("[data-sens]"));

  /* Le point du logo tombe où Nora et Sasha se rejoignent. Sur téléphone, le V
     reste plus large que l'écran pour laisser le texte au clair. */
  const crete = () => borne(innerWidth * .06, 52, 92);
  const aube = () => parseFloat(getComputedStyle(heros).paddingBottom) || 0;
  const placeHeros: Place = (w, h) => {
    const y = h - aube() - crete() + 6;
    const S = y * 1.06;
    const X = w < 700 ? borne((w * 1.5) / (2 * S * .7832), .5, 1) : borne(w / (2 * S * .7832) * 1.12, .7, 1.35);
    return { x: w / 2, y, S, X };
  };
  const placeFin: Place = (w) => {
    const S = w < 768 ? 190 : 236;
    return { x: w / 2, y: (w < 768 ? 74 : 84) + S, S, X: 1 };
  };

  const fondHeros = creerFond(trouve<HTMLCanvasElement>(heros, "canvas"), placeHeros, {}, fondFixe);
  const fondFin = creerFond(trouve<HTMLCanvasElement>(fin, "canvas"), placeFin, { neon: 1, rond: 1, allume: 0, jour: 0 }, fondFixe);
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

  let dernier = -1;
  const bouger = () => {
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
    /* Le néon s'allume quand tout le logo est à l'écran. */
    if (!neonAllume && fin.getBoundingClientRect().top + placeFin(innerWidth, 0).y < innerHeight * .96) allumerNeon();
  };

  return {
    bouger,
    eteindre() {
      fondHeros?.detruire();
      fondFin?.detruire();
    },
  };
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
  const suivre = creerDefile(signal);

  const jour = journee(racine, veilleur, reduit, fondFixe, signal);
  suivre(jour.bouger);
  jouerPlateau(racine, s, veilleur, reduit, signal);
  jouerConversation(racine, s, veilleur, reduit, signal);
  scannerAssiette(racine, s, veilleur, reduit);
  jouerRelais(racine, suivre, reduit);
  const relie = jouerRelie(racine, s, veilleur, reduit, fondFixe, signal);
  jouerRangs(racine, s, suivre, reduit);

  return () => {
    fin.abort();
    jour.eteindre();
    relie();
  };
}

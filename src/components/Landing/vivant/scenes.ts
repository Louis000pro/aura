/* ═══ LES SCÈNES DE LA VITRINE ═══
   Une fonction par scène. Chacune part de la page telle que le serveur l'a écrite,
   lisible sans script, et n'en change le dessin qu'en posant `data-anime` : sans
   script et en mouvement réduit, on lit tout, sans rien attendre. */

import { creerFond, type Place } from "./fondLogo";
import { borne, trouve, type Classes, type Suivre, type Veilleur } from "./veilleur";

/* ═══ LES MOUVEMENTS ═══
   Un mouvement à la fois, cinq secondes chacun. Toucher un nom le choisit et
   relance son temps. La barre sous le nom dure ces mêmes cinq secondes, en CSS. */
export function jouerPlateau(racine: HTMLElement, s: Classes, veilleur: Veilleur, reduit: boolean, signal: AbortSignal) {
  const zone = trouve(racine, "[data-plateau]");
  const scenes = Array.from(zone.querySelectorAll<HTMLElement>("[data-vedette]"));
  const boutons = Array.from(zone.querySelectorAll<HTMLElement>("[data-nom]"));
  const noms = trouve(zone, "[data-noms]");
  const DUREE = 5000;
  let ici = 0;
  let reste = DUREE;

  function montrer(k: number) {
    ici = k;
    reste = DUREE;
    scenes.forEach((e, n) => e.classList.toggle(s.on, n === k));
    boutons.forEach((b, n) => b.setAttribute("aria-pressed", String(n === k)));
    /* La rangée défile seule jusqu'au nom, sans jamais toucher à la page. */
    if (noms.scrollWidth > noms.clientWidth) {
      noms.scrollTo({ left: boutons[k].offsetLeft - 20, behavior: reduit ? "auto" : "smooth" });
    }
  }
  boutons.forEach((b, n) => b.addEventListener("click", () => montrer(n), { signal }));

  if (reduit) return;
  const att = veilleur.horloge(zone);
  void (async function boucle() {
    for (;;) {
      await att(100);
      reste -= 100;
      if (reste <= 0) montrer((ici + 1) % scenes.length);
    }
  })();
}

/* ═══ L'ASSIETTE SCANNÉE ═══
   La ligne passe, chaque aliment reçoit son numéro à son passage, sa ligne sort
   du ticket, et le total monte de ce que la ligne ajoute. La dernière ligne, qui
   n'a pas de repère sur la photo (la sauce, l'huile), sort à la fin. */
export function scannerAssiette(racine: HTMLElement, s: Classes, veilleur: Veilleur, reduit: boolean) {
  if (reduit) return;
  const box = trouve(racine, "[data-assiette]");
  const plats = Array.from(box.querySelectorAll<HTMLElement>("[data-plat]"));
  const tickets = Array.from(trouve(racine, "[data-ticket]").querySelectorAll<HTMLElement>("[data-ticket-plat]"));
  const ligne = trouve(box, "[data-ligne-scan]");
  const att = veilleur.horloge(box);
  const SCAN = 2600;

  const effacer = (i: number) => {
    plats[i].querySelectorAll("[data-y]").forEach((m) => m.classList.remove(s.vu));
    tickets[i].querySelectorAll("[data-kcal]").forEach((m) => m.classList.remove(s.vu));
    trouve(tickets[i], "[data-somme]").textContent = "0";
  };
  plats.forEach((_, i) => effacer(i));

  void (async function boucle() {
    for (let i = 0; ; i = (i + 1) % plats.length) {
      const p = plats[i];
      const t = tickets[i];
      const somme = trouve(t, "[data-somme]");
      for (const x of plats) x.classList.toggle(s.on, x === p);
      for (const x of tickets) x.classList.toggle(s.on, x === t);
      await att(800);
      ligne.classList.remove(s.passe);
      ligne.getBoundingClientRect();
      ligne.classList.add(s.passe);

      const reperes = Array.from(p.querySelectorAll<HTMLElement>("[data-y]"));
      const lignes = Array.from(t.querySelectorAll<HTMLElement>("[data-kcal]"));
      let total = 0;
      let quand = 0;
      for (let k = 0; k < lignes.length; k++) {
        const r = reperes[k];
        /* Le repère s'allume quand la ligne passe sur lui. Une ligne sans repère
           arrive juste après la dernière. */
        const moment = r ? SCAN * borne(Number(r.dataset.y) / 100, 0, 1) : SCAN + 220;
        await att(Math.max(30, moment - quand));
        quand = moment;
        r?.classList.add(s.vu);
        lignes[k].classList.add(s.vu);
        total += Number(lignes[k].dataset.kcal);
        somme.textContent = String(total);
      }
      await att(Math.max(0, SCAN - quand) + 80);
      ligne.classList.remove(s.passe);
      await att(4600);
      effacer(i);
      await att(260);
    }
  })();
}

/* ═══ LE RELAIS ═══
   L'affiche se dévoile sous le doigt : `--p` suit le défilement, tout le reste est
   dans le module CSS, sans une écriture de plus par image. */
export function jouerRelais(racine: HTMLElement, suivre: Suivre, reduit: boolean) {
  if (reduit) return;
  const zone = trouve(racine, "[data-relais]");
  zone.setAttribute("data-anime", "");
  let avant = -1;
  suivre(() => {
    const b = zone.getBoundingClientRect();
    if (b.bottom < -innerHeight || b.top > innerHeight * 2) return;
    const p = borne(-b.top / Math.max(1, b.height - innerHeight), 0, 1);
    if (Math.abs(p - avant) < .001) return;
    avant = p;
    zone.style.setProperty("--p", p.toFixed(3));
  });
}

/* ═══ DE BRONZE À ÉTERNEL ═══
   L'écran reste en place, et chaque rang occupe une part égale du défilement. Le
   compteur avance d'un seuil à l'autre sous le doigt : un compteur qui tourne seul
   se regarde, celui-ci se pousse. */
export function jouerRangs(racine: HTMLElement, s: Classes, suivre: Suivre, reduit: boolean) {
  if (reduit) return;
  const zone = trouve(racine, "[data-rangs]");
  const rangs = Array.from(zone.querySelectorAll<HTMLElement>("[data-min]"));
  const marches = Array.from(zone.querySelectorAll<HTMLElement>("[data-marche]"));
  const exp = trouve(zone, "[data-exp]");
  const seuils = rangs.map((r) => Number(r.dataset.min));
  const n = rangs.length;
  zone.setAttribute("data-anime", "");

  let ici = -1;
  let ecrit = -1;
  suivre(() => {
    const b = zone.getBoundingClientRect();
    if (b.bottom < -innerHeight || b.top > innerHeight * 2) return;
    const p = borne(-b.top / Math.max(1, b.height - innerHeight), 0, .9999);
    const k = Math.floor(p * n);
    const part = p * n - k;
    const valeur = k < n - 1 ? Math.round(seuils[k] + (seuils[k + 1] - seuils[k]) * part) : seuils[n - 1];
    if (valeur !== ecrit) {
      ecrit = valeur;
      exp.textContent = String(valeur);
    }
    if (k === ici) return;
    ici = k;
    rangs.forEach((r, i) => r.classList.toggle(s.ici, i === k));
    marches.forEach((m, i) => {
      m.classList.toggle(s.ici, i === k);
      m.classList.toggle(s.atteint, i < k);
    });
  });
}

/* ═══ TOUT SE PARLE ═══
   Le logo est le schéma : une séance descend la branche gauche, un repas la branche
   droite, et ce qui arrive au point repart vers le rang et le Guide. La lumière est
   dans le fond (`ondeG`, `ondeD`, `eclat`), le reste dans le module CSS. */
export function jouerRelie(racine: HTMLElement, s: Classes, veilleur: Veilleur, reduit: boolean, fondFixe: boolean, signal: AbortSignal) {
  const zone = trouve(racine, "[data-relie]");
  const scene = trouve(zone, "[data-relie-scene]");
  const ancre = trouve(zone, "[data-ancre]");
  const canvas = trouve<HTMLCanvasElement>(zone, "canvas");
  const svg = trouve<SVGSVGElement>(scene, "svg");
  const objets = {
    seance: trouve(scene, '[data-objet="seance"]'),
    repas: trouve(scene, '[data-objet="repas"]'),
    guide: trouve(scene, '[data-objet="guide"]'),
    rang: trouve(scene, '[data-objet="rang"]'),
  };
  const exp = trouve(scene, "[data-recu-exp]");
  const dit = trouve(scene, "[data-recu-guide]");

  /* Le dessin se règle dans la feuille de style : le script lit `.ancre`. */
  const place: Place = () => {
    const z = canvas.getBoundingClientRect();
    const a = ancre.getBoundingClientRect();
    const S = Math.max(1, a.height);
    return { x: a.left - z.left, y: a.top - z.top, S, X: a.width / (S * .7832) };
  };
  const fond = creerFond(canvas, place, { rond: 1, jour: 0 }, fondFixe);
  if (fond) {
    veilleur.surveiller(zone, (vu) => (vu ? fond.demarrer() : fond.arreter()));
  } else {
    /* Sans WebGL, le logo reste là, à sa place. */
    const logo = trouve<HTMLElement>(zone, "img");
    const p = place(0, 0);
    logo.style.cssText = `display:block;left:${p.x - p.S * .78 * p.X}px;top:${p.y - p.S}px;width:${p.S * 1.56 * p.X}px`;
  }

  /* Deux fils partent du point : ils se tracent en pixels réels, une fois la taille
     connue, ce qui garde une longueur de 100 sur chaque chemin. */
  function tracer() {
    const b = scene.getBoundingClientRect();
    if (!b.width) return;
    svg.setAttribute("viewBox", `0 0 ${b.width} ${b.height}`);
    const a = ancre.getBoundingClientRect();
    const px = a.left - b.left;
    const py = a.top - b.top + a.height * .1069;
    for (const nom of ["guide", "rang"] as const) {
      const r = trouve(objets[nom], "div").getBoundingClientRect();
      const tx = r.left - b.left + r.width / 2;
      const ty = r.top - b.top + r.height * .2;
      svg.querySelectorAll(`[data-fil="${nom}"]`).forEach((c) => c.setAttribute("d", `M${px} ${py} Q ${px} ${ty} ${tx} ${ty}`));
    }
  }
  const ro = new ResizeObserver(tracer);
  ro.observe(scene);
  signal.addEventListener("abort", () => ro.disconnect(), { once: true });
  tracer();

  if (reduit) return () => fond?.detruire();

  zone.setAttribute("data-anime", "");
  const att = veilleur.horloge(zone);
  const pas = async (ms: number, f: (k: number) => void) => {
    const n = Math.max(1, Math.round(ms / 28));
    for (let i = 1; i <= n; i++) {
      f(i / n);
      await att(28);
    }
  };
  const pouls = Array.from(svg.querySelectorAll<SVGElement>(`[data-pouls]`));

  async function coup(source: HTMLElement, cote: "ondeG" | "ondeD", gain: string, phrase: string) {
    source.classList.add(s.actif);
    await att(650);
    await pas(1000, (k) => fond?.regler({ [cote]: 1.04 - k * 1.06 }));
    fond?.regler({ [cote]: -1 });
    await pas(160, (k) => fond?.regler({ eclat: k }));
    for (const f of pouls) {
      f.classList.remove(s.passe);
      f.getBoundingClientRect();
      f.classList.add(s.passe);
    }
    exp.textContent = gain;
    dit.textContent = phrase;
    await pas(780, (k) => fond?.regler({ eclat: 1 - k }));
    objets.rang.classList.add(s.recu);
    objets.guide.classList.add(s.recu);
    await att(2600);
    for (const o of [source, objets.rang, objets.guide]) o.classList.remove(s.actif, s.recu);
    await att(700);
  }

  void (async function boucle() {
    await att(900);
    for (;;) {
      await coup(objets.seance, "ondeG", "+30", "Il voit ta séance");
      await coup(objets.repas, "ondeD", "+5", "Il voit ton repas");
    }
  })();

  return () => fond?.detruire();
}

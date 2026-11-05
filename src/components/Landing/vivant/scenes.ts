/* ═══ LES SCÈNES DE LA VITRINE ═══
   Une fonction par scène. Chacune part de la page telle que le serveur l'a écrite,
   lisible sans script, et n'en change le dessin qu'en posant `data-anime` : sans
   script et en mouvement réduit, on lit tout, sans rien attendre. */

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
  let haut = 0, course = 1, avant = -1;
  suivre(zone, (y) => {
    const p = borne((y - haut) / course, 0, 1);
    if (Math.abs(p - avant) < .001) return;
    avant = p;
    zone.style.setProperty("--p", p.toFixed(3));
  }, () => {
    const b = zone.getBoundingClientRect();
    haut = b.top + window.scrollY;
    course = Math.max(1, b.height - innerHeight);
  });
}

/* ═══ DE BRONZE À ÉTERNEL ═══
   Tout suit le doigt, sans seuil : la gemme du rang monte, celle d'avant s'en va par
   le haut, et les deux ciels se croisent. Revenir en arrière déroule la même scène à
   l'envers. Chaque rang se tient un moment à l'écran : le mouvement ne se fait que
   sur le milieu de sa part de défilement.
   ⚠️ Seuls `transform` et `opacity` s'écrivent ici, et seulement sur les deux rangs
   visibles : le reste est masqué, et ne coûte rien. */
const douce = (x: number) => {
  const t = borne(x, 0, 1);
  return t * t * (3 - 2 * t);
};

export function jouerRangs(racine: HTMLElement, s: Classes, suivre: Suivre, reduit: boolean) {
  if (reduit) return;
  const zone = trouve(racine, "[data-rangs]");
  const rangs = Array.from(zone.querySelectorAll<HTMLElement>("[data-min]"));
  const gemmes = rangs.map((r) => trouve(r, "[data-gemme]"));
  const textes = rangs.map((r) => trouve(r, "[data-texte]"));
  const ciels = Array.from(zone.querySelectorAll<HTMLElement>("[data-ciel]"));
  const marches = Array.from(zone.querySelectorAll<HTMLElement>("[data-marche]"));
  const exp = trouve(zone, "[data-exp]");
  const seuils = rangs.map((r) => Number(r.dataset.min));
  const n = rangs.length;
  zone.setAttribute("data-anime", "");

  const montres = new Set<number>();
  const montrer = (i: number, vu: boolean) => {
    if (vu === montres.has(i)) return;
    if (vu) montres.add(i);
    else montres.delete(i);
    const v = vu ? "visible" : "hidden";
    gemmes[i].style.visibility = v;
    textes[i].style.visibility = v;
    ciels[i].style.visibility = v;
  };

  let haut = 0, course = 1, H = 1, ici = -1, ecrit = -1, avant = -9;
  suivre(zone, (y) => {
    const t = borne((y - haut) / course, 0, 1) * (n - 1);
    const k = Math.min(n - 2, Math.floor(t));
    const part = t - k;
    const pos = k + douce((part - .2) / .6);

    if (Math.abs(pos - avant) > .001) {
      avant = pos;
      for (let i = 0; i < n; i++) {
        const d = i - pos;
        const a = Math.abs(d);
        montrer(i, a < 1);
        if (a >= 1) continue;
        gemmes[i].style.transform = `translate3d(0, ${(d * H * .58).toFixed(1)}px, 0) scale(${(1 - a * .14).toFixed(3)})`;
        gemmes[i].style.opacity = borne(1 - a * 1.15, 0, 1).toFixed(3);
        textes[i].style.transform = `translate3d(0, ${(d * 64).toFixed(1)}px, 0)`;
        textes[i].style.opacity = borne(1 - a * 2.2, 0, 1).toFixed(3);
        ciels[i].style.opacity = (1 - a).toFixed(3);
      }
    }

    const valeur = Math.round(seuils[k] + (seuils[k + 1] - seuils[k]) * part);
    if (valeur !== ecrit) {
      ecrit = valeur;
      exp.textContent = String(valeur);
    }
    const proche = Math.round(pos);
    if (proche === ici) return;
    ici = proche;
    marches.forEach((m, i) => {
      m.classList.toggle(s.ici, i === proche);
      m.classList.toggle(s.atteint, i < proche);
    });
  }, () => {
    const b = zone.getBoundingClientRect();
    H = innerHeight;
    haut = b.top + window.scrollY;
    course = Math.max(1, b.height - H);
    avant = -9;
  });
}

/* ═══ TOUT SE PARLE ═══
   Une séance descend l'aile gauche, un repas l'aile droite. Quand la lumière touche
   le cœur, il bat, et elle repart par les deux ailes du bas vers le Guide et le rang.
   Le script ne fait que poser les classes au bon moment : la lumière elle-même est
   une animation CSS, jouée par la carte graphique. */
export function jouerRelie(racine: HTMLElement, s: Classes, veilleur: Veilleur, reduit: boolean) {
  if (reduit) return;
  const zone = trouve(racine, "[data-relie]");
  const scene = trouve(zone, "[data-relie-scene]");
  const objet = (nom: string) => trouve(scene, `[data-objet="${nom}"]`);
  const aile = (nom: string) => trouve(scene, `[data-aile="${nom}"]`);
  const [seance, repas, guide, rang] = ["seance", "repas", "guide", "rang"].map(objet);
  const [aileSeance, aileRepas, aileGuide, aileRang] = ["seance", "repas", "guide", "rang"].map(aile);
  const coeur = trouve(scene, "[data-coeur]");
  const exp = trouve(scene, "[data-recu-exp]");
  const dit = trouve(scene, "[data-recu-guide]");
  zone.setAttribute("data-anime", "");
  const att = veilleur.horloge(zone);

  async function coup(source: HTMLElement, depart: HTMLElement, gain: string, phrase: string) {
    source.classList.add(s.actif);
    await att(520);
    depart.classList.add(s.passe);
    await att(1000);
    coeur.classList.add(s.bat);
    aileGuide.classList.add(s.passe);
    aileRang.classList.add(s.passe);
    exp.textContent = gain;
    dit.textContent = phrase;
    await att(820);
    guide.classList.add(s.recu);
    rang.classList.add(s.recu);
    await att(2300);
    for (const o of [source, guide, rang]) o.classList.remove(s.actif, s.recu);
    for (const a of [depart, aileGuide, aileRang]) a.classList.remove(s.passe);
    coeur.classList.remove(s.bat);
    await att(520);
  }

  void (async function boucle() {
    await att(600);
    for (;;) {
      await coup(seance, aileSeance, "+30", "Il voit ta séance");
      await coup(repas, aileRepas, "+5", "Il voit ton repas");
    }
  })();
}

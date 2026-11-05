/* ═══ LA CONVERSATION QUI S'ÉCRIT ═══
   Trois scènes en boucle : une séance, un repas, un déplacement. Nora et Sasha
   se relaient, et toucher un portrait change de Guide. Le dessin est celui de
   la conversation de l'app, version 3.

   ⚠️ LE TEXTE DES CARTES VIT DANS LA PAGE, avec le reste de la vitrine : ce
   script les recopie dans le fil, il n'en écrit aucune. Sans JavaScript et en
   mouvement réduit, la scène déjà écrite de la page reste à l'écran, et elle
   reste lue par un lecteur d'écran pendant que la boucle tourne (le fil animé
   est `aria-hidden`).
   ⚠️ CE QUE DIT LE GUIDE VIENT DE `lib/guides.ts` : les vraies phrases de
   l'ouverture, et `vitrine.*` pour les réponses que le coach écrit dans l'app. */

import { PRENOM_GUIDE, voix, type CleVoix, type ContexteVoix, type EtatGuide, type GuideId } from "@/lib/guides";
import { trouve, type Classes, type Veilleur } from "./veilleur";

class Arret extends Error {}

export function jouerConversation(racine: HTMLElement, s: Classes, veilleur: Veilleur, reduit: boolean, signal: AbortSignal) {
  const conv = trouve(racine, "[data-conv]");
  const fil = trouve(conv, "[data-conv-fil]");
  const pile = trouve(conv, "[data-conv-pile]");
  const repli = trouve(conv, "[data-conv-repli]");
  const zone = trouve(conv, "[data-conv-texte]");
  const saisie = trouve(conv, "[data-conv-saisie]");
  const nomEl = trouve(conv, "[data-conv-nom]");
  const statutBloc = trouve(conv, "[data-conv-statut]");
  const statutEl = trouve(statutBloc, "b");
  const visages = Array.from(conv.querySelectorAll<HTMLElement>("[data-visage]"));
  const portraits = Array.from(racine.querySelectorAll<HTMLElement>("[data-guide]"));
  const modeles = {
    seance: trouve(repli, '[data-piece="seance"]'),
    repas: trouve(conv, '[data-piece="repas"]'),
    deplacer: trouve(conv, '[data-piece="deplacer"]'),
  };

  let guide: GuideId = "nora";
  let choisi: GuideId | null = null;
  let jeton = 0;
  let courant = 0;

  const dormir = veilleur.horloge(conv);
  const att = async (ms: number) => {
    await dormir(ms);
    if (courant !== jeton) throw new Arret();
  };

  /* Un hasard fixe : la frappe a toujours le même rythme, donc la boucle aussi. */
  let graine = 7;
  const hasard = () => {
    graine = (graine * 9301 + 49297) % 233280;
    return graine / 233280;
  };
  const delai = (c: string) => {
    const r = hasard();
    let d = 34 + r * 44;
    if (c === " ") d += 22;
    if (c === "," || c === ".") d += 150;
    if (r > .94) d += 170;
    return d;
  };

  const dit = (cle: CleVoix, ctx?: ContexteVoix) => voix(guide, cle, ctx);

  function visage(etat: EtatGuide) {
    for (const v of visages) v.classList.toggle(s.on, v.dataset.visage === `${guide}-${etat}`);
  }
  function statut(t: string) {
    statutEl.textContent = t;
    /* Le voyant suit ce qu'il fait : il écoute, il travaille, ou c'est fait. */
    statutBloc.dataset.etat = t === "t’écoute" ? "ecoute" : t === "c’est fait" ? "fait" : "travaille";
  }
  function repos() {
    const invite = document.createElement("em");
    invite.textContent = `Écris à ${PRENOM_GUIDE[guide]}…`;
    zone.replaceChildren(invite);
    saisie.removeAttribute("data-pret");
  }
  function recaler() {
    fil.toggleAttribute("data-deborde", pile.offsetHeight > fil.clientHeight);
  }
  function ajouter<T extends HTMLElement>(el: T): T {
    pile.append(el);
    recaler();
    return el;
  }
  function bloc(classes: string, texte?: string) {
    const d = document.createElement("div");
    d.className = classes;
    if (texte) d.textContent = texte;
    return d;
  }
  function dessinerSaisie(txt: string) {
    const curseur = document.createElement("i");
    curseur.className = s.caret;
    zone.textContent = txt;
    zone.append(curseur);
  }

  /** Ce que la personne tape. Un nombre efface autant de lettres. */
  async function taper(pas: (string | number)[]) {
    let txt = "";
    visage("listen");
    statut("t’écoute");
    await att(700);
    dessinerSaisie("");
    await att(380);
    for (const p of pas) {
      if (typeof p === "string") {
        for (const c of p) {
          txt += c;
          dessinerSaisie(txt);
          saisie.toggleAttribute("data-pret", true);
          await att(delai(c));
        }
      } else {
        await att(340);
        for (let i = 0; i < p; i++) {
          txt = txt.slice(0, -1);
          dessinerSaisie(txt);
          await att(80);
        }
        await att(140);
      }
    }
    await att(420);
    saisie.setAttribute("data-part", "");
    await att(150);
    saisie.removeAttribute("data-part");
    repos();
    ajouter(bloc(`${s.bulle} ${s.moi}`, txt));
  }

  /** Il prépare sa réponse : trois points, et ce qu'il fait dans l'en-tête. */
  async function ecrit(texte: string, ms: number) {
    visage("think");
    statut(texte);
    const b = ajouter(bloc(`${s.bulle} ${s.lui} ${s.ecrit}`));
    b.append(document.createElement("i"), document.createElement("i"), document.createElement("i"));
    await att(ms);
    b.remove();
    recaler();
  }

  async function dire(t: string, etat: EtatGuide = "explain", st = "t’écrit…") {
    visage(etat);
    statut(st);
    const b = ajouter(bloc(`${s.bulle} ${s.lui}`));
    const mots = t.split(" ").map((m) => {
      const e = document.createElement("span");
      e.textContent = `${m} `;
      e.style.opacity = "0";
      e.style.transition = "opacity .16s";
      return e;
    });
    b.append(...mots);
    recaler();
    for (const m of mots) {
      m.style.opacity = "1";
      await att(46 + hasard() * 30);
    }
  }

  async function ouvre(t: string) {
    visage("explain");
    await att(500);
    ajouter(bloc(`${s.bulle} ${s.lui}`, t));
    await att(700);
  }

  async function appuyer(el: HTMLElement) {
    el.classList.add(s.appuie);
    await att(460);
    el.classList.remove(s.appuie);
  }

  function reponses(liste: string[]) {
    const r = bloc(s.reponses);
    r.append(...liste.map((t) => bloc(s.brouillon, t)));
    return ajouter(r);
  }

  function piece(nom: keyof typeof modeles) {
    return ajouter(modeles[nom].cloneNode(true) as HTMLElement);
  }

  async function valider(p: HTMLElement, texte: string) {
    const b = trouve(p, "[data-bouton]");
    await appuyer(b);
    p.setAttribute("data-fait", "");
    b.textContent = texte;
  }

  const SCENES = [
    async function seance() {
      await ouvre(dit("ouverture.libre"));
      await taper(["J’ai 30 minutes ce soir, et des haltèrs", 1, "es."]);
      await ecrit("t’écrit…", 760);
      await dire(dit("vitrine.seance"));
      await att(320);
      await ecrit("prépare ta séance…", 1050);
      visage("explain");
      statut("t’écoute");
      piece("seance");
      await att(1500);
      const r = reponses(["Plutôt demain", "Un autre jour"]);
      visage("listen");
      await att(1500);
      await appuyer(r.firstElementChild as HTMLElement);
      r.remove();
      ajouter(bloc(`${s.bulle} ${s.moi}`, "Plutôt demain"));
      await att(620);
      await dire(dit("proposition.programmee", { titre: "Haut du corps", jour: "demain" }), "encourage", "c’est fait");
      await att(3000);
    },
    async function repas() {
      await ouvre(dit("ouverture.faite", { titre: "Push" }));
      await taper(["J’ai mangé un poke bowl ce midi."]);
      await ecrit("estime ton repas…", 1100);
      await dire(dit("vitrine.repas"));
      await att(420);
      const p = piece("repas");
      visage("listen");
      statut("t’écoute");
      await att(2000);
      await valider(p, "Noté ✓");
      await att(520);
      await dire(dit("vitrine.repas_note"), "encourage", "c’est fait");
      await att(3000);
    },
    async function deplacer() {
      await ouvre(dit("ouverture.etape", { titre: "Push", jour: "mercredi" }));
      await taper(["Je ne peux pas mercredi, décale ma séance."]);
      await ecrit("t’écrit…", 760);
      await dire(dit("vitrine.deplacer"));
      await att(420);
      const p = piece("deplacer");
      visage("listen");
      statut("t’écoute");
      await att(2000);
      await valider(p, "Déplacée ✓");
      await att(520);
      await dire(dit("proposition.programmee", { titre: "Push", jour: "jeudi" }), "encourage", "c’est fait");
      await att(3000);
    },
  ];

  function poserGuide(g: GuideId) {
    guide = g;
    nomEl.textContent = PRENOM_GUIDE[g];
    for (const p of portraits) p.setAttribute("aria-pressed", String(p.dataset.guide === g));
    repos();
    visage("listen");
    statut("t’écoute");
  }

  async function vider() {
    pile.classList.add(s.efface);
    await dormir(340);
    pile.textContent = "";
    recaler();
    pile.classList.remove(s.efface);
  }

  for (const p of portraits) {
    p.addEventListener("click", () => {
      const g = p.dataset.guide as GuideId;
      if (reduit) {
        poserGuide(g);
        return;
      }
      choisi = g;
      jeton++;
    }, { signal });
  }

  /* Sans animation : la scène déjà écrite de la page reste à l'écran. */
  if (reduit) return;

  repli.setAttribute("data-lecteur", "");
  poserGuide("nora");

  void (async function boucle() {
    for (let i = 0; ; i++) {
      courant = jeton;
      if (choisi) guide = choisi;
      choisi = null;
      poserGuide(guide);
      graine = 7 + i * 13;
      try {
        await SCENES[i % SCENES.length]();
        guide = guide === "nora" ? "sasha" : "nora";
      } catch (e) {
        if (!(e instanceof Arret)) throw e;
      }
      await vider();
    }
  })();
}

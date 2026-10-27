/* ═══════════════════════════════════════════════════════════════════════
   check:matin, le banc des trois rendez-vous du matin.

     npm run check:matin

   ⚠️ IL EXERCE LES VRAIES RÈGLES (`monteeSerie`, `motDuJour`,
   `mouvementDuJour`) et les vraies phrases de `guides.ts`, puis il lit la
   source des écrans qui les montrent.

   CE QU'IL PROTÈGE (Louis, 2026-10-17, page « Revenir chaque jour » ;
   le mot sur sa banque, GO du 2026-10-18) :
   · la flamme monte une seule fois, à l'ouverture où la série a grandi,
     jamais sans repère, jamais quand elle redescend ;
   · le mot du jour dit des choses vraies, sans reproche ni accord de
     genre, et ne dit « rien de prévu » qu'une fois la journée lue ;
   · son accroche suit l'ordre de ce qui compte, son conseil suit la
     journée, et rien ne revient trop vite (30 jours, 60 jours) ;
   · le mouvement du jour est le même pour tout le monde, animé, et la
     rotation passe par les 102 mouvements ;
   · retourner sa carte rapporte +5 EXP, une fois par jour, et seule la
     base le décide : l'écran ne fait monter « +5 » que sur sa réponse.
   ═══════════════════════════════════════════════════════════════════════ */
import { readFileSync } from "node:fs";
import path from "node:path";
import { decideMontee } from "@/lib/monteeSerie";
import {
  ACCROCHE_FLAMME,
  FENETRE_ACCROCHE,
  FENETRE_CONSEIL,
  PIECES_ACCROCHE,
  PIECES_CONSEIL,
  choisirMot,
  conseilDuMot,
  lignesDuMot,
  rangDuJour,
  type EntreeMot,
  type FaitsMot,
  type HistoriqueMot,
  type PlanDuJour,
} from "@/lib/motDuJour";
import { mouvementDuJour, exerciceDuMouvement, carteRetournee } from "@/lib/mouvementDuJour";
import {
  EXP_CONNEXION_SUITE,
  EXP_MOUVEMENT,
  MISSIONS,
  MISSIONS_JOUR,
  MISSIONS_PREMIUM,
  PLAFOND_JOUR_GRATUIT,
  PLAFOND_JOUR_PREMIUM,
} from "@/lib/aura";
import { EXERCISE_LIBRARY, trouverExercice } from "@/lib/exerciseLibrary";
import { resolveGuide } from "@/lib/exerciseGuides";
import { MATIN, CONSEILS_MATIN, direMatin, direConseil, texteBrut, type ContexteMatin, type PieceMatin } from "@/lib/guides";
import { shiftDateStr } from "@/lib/dates";
import { indexDuJour } from "@/lib/missionsAccueil";
import type { MomentAccueil } from "@/lib/momentAccueil";

let echecs = 0;
function verdict(nom: string, bon: boolean, detail: string) {
  if (!bon) echecs++;
  console.log("[" + (bon ? "OK   " : "ECHEC") + "] " + nom + " · " + detail);
}

/* ── La montée ─────────────────────────────────────────────────────────── */

verdict("sans repère, on note en silence", decideMontee(null, { serie: 12, exp: 695 }) === null, "aucune montée");
verdict("même série qu'à la dernière visite : rien", decideMontee({ serie: 12, exp: 695 }, { serie: 12, exp: 725 }) === null, "aucune montée");
{
  const m = decideMontee({ serie: 11, exp: 675 }, { serie: 12, exp: 695 });
  verdict(
    "le cas réel : 11 → 12, 675 → 695 EXP",
    !!m && m.deSerie === 11 && m.aSerie === 12 && m.deExp === 675 && m.aExp === 695 && m.palierAvant === "feu" && m.palierApres === "feu",
    m ? `${m.deSerie} → ${m.aSerie}, ${m.deExp} → ${m.aExp}` : "rien",
  );
}
verdict("une série qui redescend ne joue rien", decideMontee({ serie: 12, exp: 695 }, { serie: 1, exp: 705 }) === null, "coupure");
{
  const m = decideMontee({ serie: 29, exp: 900 }, { serie: 30, exp: 920 });
  verdict("le jour d'un palier : le Feu devient Brasier", !!m && m.palierAvant === "feu" && m.palierApres === "brasier", m ? `${m.palierAvant} → ${m.palierApres}` : "rien");
}
{
  const m = decideMontee({ serie: 4, exp: 500 }, { serie: 5, exp: 470 });
  verdict("une EXP plus basse ne fabrique jamais un gain négatif", !!m && m.aExp - m.deExp === 0, m ? `+${m.aExp - m.deExp}` : "rien");
}

/* ── Le mot du jour : les phrases ──────────────────────────────────────── */

const NB = " ";
const vide = (): HistoriqueMot => ({ pieces: {}, familles: {} });
const entree = (o: Partial<EntreeMot> = {}): EntreeMot => ({
  jour: "2026-10-17", heure: 9, serie: 12, moment: null, plan: null, faits: null,
  relais: null, premium: false, historique: vide(), ...o,
});
const lire = (e: EntreeMot) => {
  const choix = choisirMot(e);
  return { choix, lignes: lignesDuMot(e, choix), conseil: conseilDuMot(e, choix) };
};
const brut = (e: EntreeMot) => lire(e).lignes.map((l) => texteBrut(l.texte));
const etape: PlanDuJour = { etat: "etape", etape: "Bas du corps" };
const feu: ContexteMatin = { serie: 12, au: "au Feu", le: "le Feu", suivanteLe: "le Brasier", suivanteNom: "Brasier", restant: 18 };

{
  // Le compte de Louis le 2026-10-17 : 12 jours, prochaine étape Bas du corps.
  const premiere = texteBrut(direMatin(MATIN.flamme.courante[0], feu));
  const programme = texteBrut(direMatin(MATIN.plan.etape[0], { etape: "Bas du corps" }));
  verdict(
    "le cas réel, mot pour mot",
    premiere === "Douze jours d’affilée, ta flamme est au Feu. Plus que 18 jours avant le Brasier."
      && programme === "Ton programme te propose Bas du corps, quand tu veux.",
    `${premiere} | ${programme}`,
  );
  const l = brut(entree({ plan: etape }));
  verdict(
    "ce jour-là : une accroche, la flamme, le programme",
    l.length === 3 && /douze/i.test(l[1]) && l[1].includes("18") && l[1].includes("Brasier") && l[2].includes("Bas du corps"),
    l.join(" | "),
  );
}
{
  const debut = MATIN.flamme.debut.map((p) => texteBrut(direMatin(p, { serie: 1, restant: 2, suivanteLe: "la Flamme", suivanteNom: "Flamme" })));
  const [l1] = brut(entree({ serie: 1 })).slice(1);
  verdict("jour 1 : la flamme s'allume, la suivante est à deux jours", debut.every((p) => p.includes("2 jours")) && debut[0].startsWith("Premier jour de ta série"), l1);
}
{
  const p = texteBrut(direMatin(MATIN.flamme.nouvelle[0], { serie: 7, le: "le Feu", au: "au Feu" }));
  const l = lire(entree({ serie: 7 })).lignes;
  verdict(
    "le jour d'un palier, le mot s'ouvre sur la nouvelle flamme",
    p === `Sept jours d’affilée${NB}: ta flamme devient le Feu.` && l[0].flamme === "feu" && texteBrut(l[1].texte).includes("Brasier"),
    `${texteBrut(l[0].texte)} | ${texteBrut(l[1].texte)}`,
  );
}
{
  const p = texteBrut(direMatin(MATIN.flamme.nouvelle[0], { serie: 30, le: "le Brasier" }));
  verdict("trente et cent jours s'écrivent en lettres", p.startsWith("Trente jours d’affilée") && texteBrut(direMatin(MATIN.flamme.nouvelle[0], { serie: 100, le: "le Feu sacré" })).startsWith("Cent jours"), p);
}
{
  const sommets = MATIN.flamme.sommet.map((p) => texteBrut(direMatin(p, { serie: 140 })));
  verdict("au dernier palier, plus de « plus que »", sommets.every((p) => p.includes("Feu sacré") && !p.includes("Plus que")), sommets[1]);
}

/* ── Le joker de la nuit (2026-10-24, maquette « Le passage de rang ») ── */
{
  const maquette = texteBrut(direMatin(MATIN.joker[0], { jokers: 1 }));
  verdict(
    "la phrase de la maquette, mot pour mot",
    maquette === "Hier, ton joker a gardé ta série. Il t’en reste un ce mois-ci.",
    maquette,
  );
  const dernier = MATIN.joker.map((p) => texteBrut(direMatin(p, { jokers: 0 })));
  verdict("le dernier joker du mois dit quand reviennent les suivants", dernier.every((p) => p.includes("le 1er")), dernier[0]);

  const couvert = { hierCouvert: true, restants: 2 };
  const l = lire(entree({ jokers: couvert }));
  verdict(
    "un joker posé cette nuit ouvre le mot",
    !!l.choix.accroche?.startsWith("joker.") && texteBrut(l.lignes[0].texte).includes("joker") && texteBrut(l.lignes[0].texte).includes("deux"),
    texteBrut(l.lignes[0].texte),
  );
  const retour: MomentAccueil = { cle: "absence.courte", phrase: "retour.absence.courte", etat: "welcome", ctx: {} };
  verdict(
    "il passe avant le retour, après une nouvelle flamme",
    !!lire(entree({ jokers: couvert, moment: retour })).choix.accroche?.startsWith("joker.")
      && lire(entree({ jokers: couvert, serie: 7 })).choix.accroche === ACCROCHE_FLAMME,
    "joker, puis flamme en premier le jour d'un palier",
  );
  const muets = [entree(), entree({ jokers: null }), entree({ jokers: { hierCouvert: false, restants: 1 } })];
  verdict(
    "sans joker cette nuit, le mot n'en parle pas",
    muets.every((e) => !lire(e).choix.accroche?.startsWith("joker.")),
    "trois cas",
  );
  verdict(
    "le joker revient chaque fois qu'il se pose",
    !!lire(entree({ jokers: couvert, historique: { pieces: Object.fromEntries(MATIN.joker.map((p) => [p.id, "2026-10-16"])), familles: {} } }))
      .choix.accroche?.startsWith("joker."),
    "aucune fenêtre de trente jours",
  );
}
{
  const l = brut(entree({ serie: 3, plan: null }));
  const m = brut(entree({ serie: 5, plan: null }));
  verdict("tant que la journée n'est pas lue, pas de ligne de programme", l.length === 2 && m.length === 2, `${m.length} lignes`);
}
for (const [etat, attendu] of [["done", "plan.fait"], ["repos", "plan.repos"], ["libre", "plan.libre"], ["seance", "plan.seance"]] as const) {
  const l = lire(entree({ serie: 5, plan: { etat, titre: "Express 12" } })).lignes;
  verdict(`journée « ${etat} » → ${attendu}`, l[l.length - 1].id.startsWith(attendu + "."), texteBrut(l[l.length - 1].texte));
}
{
  const exact = texteBrut(direMatin(MATIN.plan.etapeJour[0], { etape: "Pull", jour: "mardi 8" }));
  const l = brut(entree({ serie: 5, plan: { etat: "etape", etape: "Pull", jour: "mardi 8" } }));
  verdict("une étape déjà datée dit son jour", exact === "Ta prochaine séance, Pull, est prévue mardi 8." && l[2].includes("Pull") && l[2].includes("mardi 8"), l[2]);
}

/* ── Le mot du jour : l'ordre et les familles ──────────────────────────── */

const retour: MomentAccueil = { cle: "absence.courte", phrase: "retour.absence.courte", etat: "welcome", ctx: {} };
const cap: MomentAccueil = { cle: "serie", phrase: "retour.serie", etat: "encourage", ctx: { serie: 14 } };
const palier: MomentAccueil = { cle: "palier", phrase: "retour.palier", etat: "encourage", ctx: { manque: 20, rang: "Platine" } };
const seance: PlanDuJour = { etat: "seance", titre: "Push", mouvements: ["Pompes", "Développé couché", "Dips sur chaise"] };
const faitsDe = (o: Partial<FaitsMot> = {}): FaitsMot => ({ hier: { seances: 0, titre: null, minutes: null, repas: 0 }, semaine: null, ageCompte: 90, ...o });

{
  const r = lire(entree({ serie: 1, moment: retour, plan: etape }));
  verdict(
    "un retour : l'accroche du retour, la Lueur qui repart, une séance courte",
    r.choix.accroche?.startsWith("retour.court.") === true
      && r.lignes[1].id.startsWith("flamme.repart.")
      && r.conseil?.famille === "reprendre"
      && r.lignes[2].id.startsWith("plan.retour."),
    r.lignes.map((l) => texteBrut(l.texte)).join(" | "),
  );
}
{
  const r = lire(entree({ serie: 14, moment: cap, faits: faitsDe() }));
  verdict("un cap de série n'est pas dit deux fois", /^(jour|moment)\./.test(r.choix.accroche ?? ""), r.choix.accroche ?? "aucune");
}
{
  const r = lire(entree({ moment: palier, plan: etape }));
  verdict("un rang à portée passe avant le jour", r.choix.accroche?.startsWith("palier.") === true && texteBrut(r.lignes[0].texte).includes("Platine"), texteBrut(r.lignes[0].texte));
}
{
  const nouvelle = lire(entree({ serie: 30, moment: palier }));
  verdict("une nouvelle flamme passe avant tout, même un rang à portée", nouvelle.choix.accroche === ACCROCHE_FLAMME && nouvelle.lignes[0].flamme === "brasier", texteBrut(nouvelle.lignes[0].texte));
  const brasier = lire(entree({ serie: 30, plan: etape }));
  verdict("le jour du Brasier, le Guide pose sa question", brasier.conseil?.famille === "question" && brasier.conseil.id === "question.brasier", brasier.conseil?.id ?? "aucun");
}
{
  const r = lire(entree({ faits: faitsDe({ hier: { seances: 1, titre: "Pull", minutes: 41, repas: 0 } }) }));
  verdict("une séance hier passe avant le jour et l'heure", r.choix.accroche?.startsWith("hier.seance.") === true && texteBrut(r.lignes[0].texte).includes("Pull"), texteBrut(r.lignes[0].texte));
}
{
  const r = lire(entree({ relais: { quoi: "a_moi", maillon: 3 }, faits: faitsDe() }));
  verdict("le relais a sa phrase, sans nommer personne", r.choix.accroche?.startsWith("relais.a_moi.") === true, texteBrut(r.lignes[0].texte));
}
{
  const r = lire(entree({ jour: "2026-11-01", faits: faitsDe() }));
  verdict("le premier du mois a la sienne", r.choix.accroche?.startsWith("mois.") === true, texteBrut(r.lignes[0].texte));
}
{
  const r = lire(entree({ faits: faitsDe({ ageCompte: 30 }) }));
  verdict("un mois après l'inscription, l'anniversaire", r.choix.accroche === "anniv.30" && r.conseil?.id === "question.anniv30", texteBrut(r.lignes[0].texte));
}
{
  const r = lire(entree({ plan: seance, faits: faitsDe() }));
  verdict("une séance prévue donne le geste d'un de ses mouvements", r.conseil?.famille === "geste" && !!trouverExercice(r.conseil.mouvement) && r.lignes[2].id.startsWith("plan.seance.geste."), r.conseil?.famille === "geste" ? r.conseil.mouvement : "rien");
  const sans = lire(entree({ plan: { etat: "seance", titre: "Impro", mouvements: ["Mouvement inconnu"] }, faits: faitsDe() }));
  verdict("sans mouvement de la bibliothèque, pas de geste", sans.conseil?.famille !== "geste" && sans.lignes[2].id.startsWith("plan.seance."), sans.conseil?.famille ?? "aucun");
}
{
  const r = lire(entree({ plan: { etat: "repos" }, faits: faitsDe() }));
  verdict("un repos donne la respiration ou la récup", r.conseil?.famille === "respire" || r.conseil?.famille === "recup", r.conseil?.famille ?? "aucun");
  const soir = lire(entree({ heure: 21, plan: { etat: "libre" }, faits: faitsDe() }));
  verdict("le soir donne le sommeil", soir.conseil?.famille === "sommeil", soir.conseil?.famille ?? "aucun");
}
{
  const dimanche = "2026-10-18";
  const s = (valides: string[], premium = false, aujourdhui = false) => {
    const v = aujourdhui ? [...valides, dimanche] : valides;
    return lire(entree({ jour: dimanche, premium, faits: faitsDe({ semaine: { lundi: "2026-10-12", valides: v, seances: 2, repas: 0 } }) })).conseil;
  };
  const deux = s(["2026-10-12", "2026-10-13"]);
  const quatre = s(["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15"]);
  const quatrePremium = s(["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15"], true);
  const six = s(["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"]);
  verdict("le dimanche donne la semaine", rangDuJour(dimanche) === 6 && deux?.famille === "semaine", deux?.famille ?? "aucun");
  const mission = (c: typeof deux) => (c?.famille === "semaine" ? c.mission ?? "" : "");
  verdict("à une action de la Semaine active, le mot le dit", mission(deux).includes("Semaine active est à toi"), mission(deux));
  verdict("la Semaine active gagnée dit son EXP, lue dans le catalogue", mission(quatre) === `La Semaine active est faite${NB}: +${MISSIONS.find((m) => m.id === "semaineActive")?.exp} EXP.`, mission(quatre));
  verdict("la Semaine régulière n'est promise qu'à Vaiiya+", mission(quatrePremium).includes("Semaine régulière") && !mission(quatre).includes("régulière"), mission(quatrePremium));
  verdict("à un jour de la Semaine parfaite, on le dit", mission(six).includes("Semaine parfaite"), mission(six));
  const compte = deux?.famille === "semaine" ? texteBrut(deux.compte) : "";
  verdict("un compte à zéro ne s'écrit pas", compte === "2 jours validés · 2 séances" && !/\b0\b/.test(compte), compte);
}
{
  // Le même jour, recomposé après avoir noté son choix : rien ne bouge.
  const e = entree({ plan: seance, faits: faitsDe() });
  const a = choisirMot(e);
  const h = vide();
  if (a.accroche) h.pieces[a.accroche] = e.jour;
  if (a.conseil) { h.pieces[a.conseil.id] = e.jour; h.familles[e.jour] = a.conseil.famille; }
  const b = choisirMot({ ...e, historique: h });
  verdict("le mot reste le même toute la journée", JSON.stringify(a) === JSON.stringify(b), `${a.accroche} · ${a.conseil?.id}`);
}

/* ── Le mot du jour : rien ne revient trop vite ────────────────────────── */

function simuler(nom: string, jours: number, contexte: (jour: string, i: number) => Partial<EntreeMot>) {
  const h = vide();
  const vuLe: Record<string, string> = {};
  let accrocheTrop = "", conseilTrop = "", familleRepetee = "";
  let precedente: string | null = null;
  for (let i = 0; i < jours; i++) {
    const jour = shiftDateStr("2026-10-19", i);
    const e = entree({ jour, historique: { pieces: { ...h.pieces }, familles: { ...h.familles } }, ...contexte(jour, i) });
    const c = choisirMot(e);
    if (c.accroche && c.accroche !== ACCROCHE_FLAMME) {
      const avant = vuLe[c.accroche];
      if (avant && indexDuJour(jour) - indexDuJour(avant) < FENETRE_ACCROCHE && !accrocheTrop) accrocheTrop = `${c.accroche} le ${avant} puis le ${jour}`;
      vuLe[c.accroche] = jour; h.pieces[c.accroche] = jour;
    }
    if (c.conseil) {
      if (c.conseil.famille !== "semaine") {
        const avant = vuLe[c.conseil.id];
        if (avant && indexDuJour(jour) - indexDuJour(avant) < FENETRE_CONSEIL && !conseilTrop) conseilTrop = `${c.conseil.id} le ${avant} puis le ${jour}`;
        vuLe[c.conseil.id] = jour; h.pieces[c.conseil.id] = jour;
      }
      if (precedente === c.conseil.famille && !familleRepetee) familleRepetee = `${c.conseil.famille} le ${jour}`;
      precedente = c.conseil.famille;
      h.familles[jour] = c.conseil.famille;
    }
  }
  verdict(`${nom} : une accroche ne revient pas avant ${FENETRE_ACCROCHE} jours`, !accrocheTrop, accrocheTrop || `${jours} jours`);
  verdict(`${nom} : un conseil ne revient pas avant ${FENETRE_CONSEIL} jours`, !conseilTrop, conseilTrop || `${jours} jours`);
  verdict(`${nom} : la famille du conseil change chaque jour`, !familleRepetee, familleRepetee || "toujours une autre");
}
simuler("une année sans rien de prévu, le matin", 365, () => ({ heure: 9, serie: 12, plan: { etat: "libre" }, faits: faitsDe() }));
simuler("une année avec une séance chaque jour", 365, () => ({ heure: 8, serie: 12, plan: seance, faits: faitsDe({ hier: { seances: 1, titre: "Push", minutes: 40, repas: 2 } }) }));
simuler("une année de repos, le soir", 365, () => ({ heure: 21, serie: 12, plan: { etat: "repos" }, faits: faitsDe() }));

/* ── Le mot du jour : la banque ────────────────────────────────────────── */

function toutesLesPieces(): { id: string; texte: string }[] {
  const plein: ContexteMatin = {
    ...feu, titre: "Push", minutes: 32, etape: "Pull", jour: "mardi 8", manque: 20, rang: "Platine",
    repas: 3, maillon: 3, mois: "octobre", jokers: 2,
  };
  const out: { id: string; texte: string }[] = [];
  const marcher = (v: unknown) => {
    if (Array.isArray(v)) { v.forEach(marcher); return; }
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (typeof o.id === "string" && (typeof o.texte === "string" || typeof o.texte === "function")) {
        out.push({ id: o.id, texte: PIECES_CONSEIL.has(o.id) ? direConseil(o as never) : direMatin(o as unknown as PieceMatin, plein) });
        return;
      }
      Object.values(o).forEach(marcher);
    }
  };
  marcher(MATIN);
  marcher(CONSEILS_MATIN);
  return out;
}
{
  const toutes = toutesLesPieces();
  const ids = toutes.map((p) => p.id);
  const doublons = ids.filter((id, i) => ids.indexOf(id) !== i);
  verdict("chaque pièce a son identifiant, sans doublon", doublons.length === 0, doublons[0] ?? `${toutes.length} pièces`);
  const accroches = PIECES_ACCROCHE.size;
  const conseils = PIECES_CONSEIL.size;
  verdict("une banque assez grande pour ne pas se répéter", accroches >= 150 && conseils >= 120, `${accroches} accroches, ${conseils} conseils`);

  const interdits = /\brat[ée]e?s?\b|manqu|oubli|dommage|attention|tu aurais|il faudrait|il fallait|il aurait fallu|\ben retard\b/i;
  const reproches = toutes.filter((p) => interdits.test(texteBrut(p.texte)));
  verdict("aucune phrase du mot ne reproche quoi que ce soit", reproches.length === 0, reproches[0] ? `${reproches[0].id} : ${reproches[0].texte}` : "aucune");

  const genre = /\b(content|contente|prête?|fière?|fier|motivée?|fatiguée?|heureux|heureuse|revenue?)\b/i;
  const accords = toutes.filter((p) => genre.test(texteBrut(p.texte)));
  verdict("aucun accord de genre", accords.length === 0, accords[0] ? `${accords[0].id} : ${accords[0].texte}` : "aucun");

  const fautes = toutes.filter((p) => /—|undefined|NaN|\[object|⟦⟧|\{|\}/.test(p.texte));
  verdict("aucun tiret cadratin ni trou dans une phrase", fautes.length === 0, fautes[0] ? `${fautes[0].id} : ${fautes[0].texte}` : "aucun");

  const typo = toutes.filter((p) => / [:;?!%]|'/.test(texteBrut(p.texte)));
  verdict("espace insécable et apostrophe courbe partout", typo.length === 0, typo[0] ? `${typo[0].id} : ${JSON.stringify(typo[0].texte)}` : "aucune faute");
}
{
  const avecMouvement = Object.values(CONSEILS_MATIN).flatMap((v) => (Array.isArray(v) ? v : Object.values(v))).filter((c) => c.mouvement);
  const absents = avecMouvement.filter((c) => !trouverExercice(c.mouvement!) || !resolveGuide(c.mouvement!));
  verdict("chaque mouvement cité par un conseil existe et est animé", absents.length === 0, absents.map((c) => c.mouvement).join(", ") || `${avecMouvement.length} mouvements`);
}

/* ── Le mouvement du jour ──────────────────────────────────────────────── */

verdict("le 17 octobre 2026, c'est le Bicycle crunch", mouvementDuJour("2026-10-17").name === "Bicycle crunch", mouvementDuJour("2026-10-17").name);
verdict("le même mouvement pour une même date", mouvementDuJour("2026-11-03").name === mouvementDuJour("2026-11-03").name, "déterministe");
{
  const vus = new Set<string>();
  const debut = Date.UTC(2026, 9, 17);
  for (let i = 0; i < EXERCISE_LIBRARY.length; i++) vus.add(mouvementDuJour(new Date(debut + i * 86_400_000).toISOString().slice(0, 10)).name);
  verdict(`en ${EXERCISE_LIBRARY.length} jours, les ${EXERCISE_LIBRARY.length} mouvements passent`, vus.size === EXERCISE_LIBRARY.length, `${vus.size} différents`);
}
{
  const sansAnimation = EXERCISE_LIBRARY.filter((m) => !resolveGuide(m.name)).map((m) => m.name);
  verdict("chaque mouvement du jour est animé", sansAnimation.length === 0, sansAnimation.join(", ") || "les 102");
}
{
  const ex = exerciceDuMouvement(mouvementDuJour("2026-10-17"));
  verdict("le tunnel reçoit le mouvement tel qu'une séance composée", ex.name === "Bicycle crunch" && ex.sets > 0 && !!ex.reps && ex.muscles.length > 0, `${ex.sets} × ${ex.reps}`);
}

/* ── La carte et ses 5 EXP ─────────────────────────────────────────────── */

verdict("retournée ici aujourd'hui : elle s'ouvre retournée", carteRetournee({ retourneeLe: "2026-10-17", jour: "2026-10-17", dejaGagne: false }), "cet appareil");
verdict("retournée hier : elle se présente fermée", !carteRetournee({ retourneeLe: "2026-10-16", jour: "2026-10-17", dejaGagne: false }), "un autre jour ne compte pas");
verdict("retournée ailleurs aujourd'hui : la base suffit", carteRetournee({ retourneeLe: null, jour: "2026-10-17", dejaGagne: true }), "un autre appareil");
{
  /* Louis, 2026-10-17 au soir : la carte garde ses 5 EXP, mais elle n'est
     plus une quête. Elle ne doit réapparaître ni dans le catalogue, ni dans
     le compte du jour. */
  const ids: string[] = MISSIONS.map((m) => m.id);
  verdict("le mouvement du jour n'est plus une quête", !ids.includes("mouvement") && MISSIONS_JOUR.length === 4, `${MISSIONS_JOUR.length} missions du jour`);
  verdict("sa carte rapporte toujours 5 EXP", EXP_MOUVEMENT === 5, `+${EXP_MOUVEMENT}`);
}
{
  const gratuit = EXP_CONNEXION_SUITE + MISSIONS_JOUR.filter((m) => m.id !== "connexion").reduce((s, m) => s + m.exp, 0);
  const premium = gratuit + MISSIONS_PREMIUM.reduce((s, m) => s + m.exp, 0);
  verdict("le plafond des missions suit le catalogue, sans la carte", PLAFOND_JOUR_GRATUIT === gratuit && PLAFOND_JOUR_PREMIUM === premium, `${PLAFOND_JOUR_GRATUIT} et ${PLAFOND_JOUR_PREMIUM}`);
}

/* ── Par la source ─────────────────────────────────────────────────────── */

const RACINE = path.resolve(import.meta.dirname, "..");
const lireSource = (fichier: string) => readFileSync(path.join(RACINE, fichier), "utf8");

{
  const tuile = lireSource("src/components/accueil/MaJournee.tsx");
  verdict("la tuile décide sa montée avec la règle unique", tuile.includes("decideMontee(") && tuile.includes("noterVuSerie("), "MaJournee.tsx");
  verdict("la montée ne joue pas quand il faut réduire les animations", (/reduce \? null : decideMontee\(/.test(tuile) || (/const brut = decideMontee\(/.test(tuile) && /reduce \? null : brut/.test(tuile))), "reduce");
}
{
  const feuille = lireSource("src/components/accueil/FeuilleMotDuJour.tsx");
  verdict("le mot se compose avec la règle et la banque", feuille.includes("choisirMot(") && feuille.includes("lignesDuMot(") && feuille.includes("conseilDuMot("), "FeuilleMotDuJour.tsx");
  verdict("le choix du jour se garde et se relit", feuille.includes("lireChoixDuJour(") && feuille.includes("noterChoixDuJour("), "une fois par jour");
  verdict("le mot attend la journée avant de dire « rien de prévu »", /etat === "loading" \? null/.test(feuille), "plan nul en chargement");
  verdict("la question du jour ouvre la conversation sur elle", feuille.includes("onQuestion(texteBrut(") && lireSource("src/components/AccueilSignature.tsx").includes("ouvrirSurQuestion(q)"), "onQuestion");
  verdict(
    "le mot lit les jokers que la base a comptés",
    /historique, jokers \}/.test(feuille) && /jokers=\{aura\.jokers \?/.test(lireSource("src/components/AccueilSignature.tsx")),
    "aura.jokers → FeuilleMotDuJour",
  );
  const ctx = lireSource("src/context/AssistantContext.tsx");
  const corps = ctx.slice(ctx.indexOf("const ouvrirSurQuestion"), ctx.indexOf("const close = useCallback"));
  verdict("un tour de la personne, masqué, passe devant la question", /role: "user" as const[^}]*masque: true/.test(corps) && /role: "assistant" as const, content: q/.test(corps), "sanitizeHistory");
}
{
  const carte = lireSource("src/components/accueil/MouvementDuJour.tsx");
  verdict("le sceau ne se pose que sur la réponse de la base", carte.includes("{gain && posee && <Sceau"), "gain confirmé");
  verdict("« +5 EXP » ne s'envole que d'un gain neuf, et jamais en mouvement réduit", carte.includes('envol={gain === "gagne" && eclore}') && carte.includes("const eclore = touchee && !reduce"), "envol");
  verdict("deux touchers ne lancent qu'une découverte", carte.includes("lancee.current") && carte.includes("if (phase !== \"fermee\" || lancee.current) return"), "garde");
  verdict("la carte fermée n'annonce les 5 EXP que si la base sait les créditer", carte.includes("{bonus && (") && carte.includes("bonus ? `Découvrir le mouvement du jour, plus"), "bonus");
}
{
  const feuille = lireSource("src/components/accueil/FeuilleMotDuJour.tsx");
  verdict("le mot demande les 5 EXP à la base", feuille.includes("crediterMouvement(createClient())"), "decouvrir_mouvement_aura");
  verdict("le gain ne remonte que sur un crédit neuf", feuille.includes("if (r) onGain();") && feuille.includes("if (r === null) return;"), "true seulement");
  verdict("sans le SQL, le mot ne demande rien et ne promet rien", feuille.includes("if (dejaGagne === null) return;") && feuille.includes("bonus={dejaGagne !== null}"), "dejaGagne null");
}
{
  const sql = lireSource("supabase/migrations/20261017_mouvement_du_jour.sql");
  const points = /'mouvement_du_jour', 'day', v_today::text, (\d+), false/.exec(sql)?.[1];
  verdict("la base crédite le nombre du catalogue", Number(points) === EXP_MOUVEMENT, `${points} = ${EXP_MOUVEMENT}`);
  verdict("l'état des missions porte la nouvelle", sql.includes("'mouvement', jsonb_build_object(") && /'mouvement_du_jour'\s*\]::text\[\]/.test(sql), "etat_missions_aura + CHECK");
}
{
  const accueil = lireSource("src/components/AccueilSignature.tsx");
  verdict("le mot lit l'état de la carte à part, pas dans les missions", accueil.includes("dejaGagne={aura.mouvementDuJour}") && !accueil.includes("ROUTE_MOT_DU_JOUR"), "aura.mouvementDuJour");
  verdict("l'aura se relit à la fermeture du mot, après un gain", /gainMouvement\.current = false;\s*onAuraChange\?\.\(\)/.test(accueil) && lireSource("src/app/AccueilClient.tsx").includes("onAuraChange={() => setStatsTick("), "onAuraChange");
}
{
  const accueil = lireSource("src/components/AccueilSignature.tsx");
  verdict("l'entrée porte la pastille du mot non lu", accueil.includes("motNonLu") && accueil.includes("t’a laissé un mot"), "AccueilSignature.tsx");
  verdict("le moment du jour est gardé pour le mot", lireSource("src/app/AccueilClient.tsx").includes("noterMomentDuJour("), "AccueilClient.tsx");
}

console.log(echecs === 0 ? "\nTout passe." : `\n${echecs} échec(s).`);
process.exit(echecs === 0 ? 0 : 1);

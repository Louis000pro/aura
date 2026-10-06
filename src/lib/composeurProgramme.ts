/* ════════════════════════════════════════════════════════════════════
   R9c · LE PROGRAMME PAR PRIORITÉS (décisions 31, 32, 41 ; maquette 05
   écrans 01, 02, 11 ; maquette 08 écrans 01, 02, 09)

   La personne dit ce qu'elle veut travailler (une priorité, une seconde
   facultative, ou « Un peu de tout »), et ses jours. Ce module en tire un
   CYCLE : des noms d'étapes, dans un ordre. Le contenu de chaque étape se
   lit dans son nom (`entreesDe`, banqueEtapes.ts), donc il n'est décidé
   qu'une fois, au même endroit.

   ⚠️ PUR ET DÉTERMINISTE : ni horloge, ni hasard, ni lecture. Les mêmes
   choix donnent le même programme sur tous les appareils, et l'aperçu
   montré avant l'activation est exactement ce qui s'écrira.

   ⚠️ LES RÈGLES, ET RIEN DE PLUS (décision 36 : aucune règle sportive
   universelle).
   · Une séance par jour choisi (de 1 à 6 ; au-delà le cycle tourne).
   · Dès deux jours, chaque priorité revient au moins deux fois par
     semaine : « P1 & P2 » puis « P2 & P1 ». Avec une seule priorité, elle
     est associée à une zone voisine (dos avec bras, fessiers avec jambes…).
   · Les autres séances couvrent ce qui reste : d'abord le groupe que les
     priorités ne touchent pas (s'il y en a deux en jeu, le moins
     travaillé), puis l'autre, puis tout le corps, puis le cardio.
   · « Un peu de tout » reprend le cycle de référence du produit
     (`cycleDeReference`), celui que tout le monde a aujourd'hui.

   Ce n'est qu'un choix de composition : deux passages par priorité ne
   sont ni une garantie ni une dette (réponse de Codex au cadrage).
   ════════════════════════════════════════════════════════════════════ */

import { LIBELLE_ZONE, ZONES, nomDeZones, zonesDuNom, type Zone } from "@/lib/banqueEtapes";
import { cycleDeReference } from "@/lib/planning";

export type ChoixProgramme = {
  /** 0 = « Un peu de tout », 1 ou 2 zones dans l'ordre de priorité. */
  priorites: Zone[];
  /** Le nombre de séances par semaine (les jours choisis). */
  seances: number;
};

export type ProgrammeCompose = {
  nom: string;
  /** Ce qui se recopie dans `programmes.intention`, et se relit. */
  intention: string;
  etapes: { position: number; nom: string }[];
  /** Combien de fois chaque priorité revient dans un tour du cycle. */
  passages: { zone: Zone; fois: number }[];
};

export const SEANCES_MAX = 6;

const PARTENAIRE: Readonly<Record<Zone, Zone>> = {
  dos: "bras", bras: "epaules", epaules: "pectoraux", pectoraux: "epaules",
  fessiers: "jambes", jambes: "fessiers", abdos: "dos",
};

const HAUT: readonly Zone[] = ["dos", "pectoraux", "epaules", "bras"];
const BAS: readonly Zone[] = ["fessiers", "jambes"];

/** Les priorités valides : connues, sans doublon, deux au plus. */
export function prioritesValides(brut: readonly string[]): Zone[] {
  const sortie: Zone[] = [];
  for (const z of brut) {
    if ((ZONES as readonly string[]).includes(z) && !sortie.includes(z as Zone)) sortie.push(z as Zone);
  }
  return sortie.slice(0, 2);
}

/** Le nombre de séances d'un cycle composé, borné. */
export function seancesDuChoix(n: number): number {
  return Math.max(1, Math.min(SEANCES_MAX, Math.round(Number.isFinite(n) ? n : 1)));
}

/** Les zones travaillées par une étape (par son nom). */
export function zonesDeLEtape(nom: string): Zone[] {
  const z = zonesDuNom(nom);
  if (z) return z;
  if (nom === "Haut du corps" || nom === "Push" || nom === "Pull") return [...HAUT];
  if (nom === "Bas du corps") return [...BAS];
  if (nom === "Full Body") return [...HAUT, ...BAS];
  return [];
}

export function composerProgramme(choix: ChoixProgramme): ProgrammeCompose {
  const n = seancesDuChoix(choix.seances);
  const priorites = prioritesValides(choix.priorites);

  if (priorites.length === 0) {
    const noms = cycleDeReference(n);
    return {
      nom: "Un peu de tout",
      intention: "priorites:equilibre",
      etapes: noms.map((nom, i) => ({ position: i + 1, nom })),
      passages: [],
    };
  }

  const [p1, p2 = PARTENAIRE[priorites[0]]] = priorites;
  const f1 = nomDeZones(p1, p2);
  const f2 = nomDeZones(p2, p1);
  const couvertes = new Set<Zone>([p1, p2]);
  /* Le complément : le groupe que les priorités ne touchent pas ; si
     elles touchent les deux, celui qui reste le moins travaillé. */
  const toucheHaut = HAUT.some((z) => couvertes.has(z));
  const toucheBas = BAS.some((z) => couvertes.has(z));
  const resteHaut = HAUT.filter((z) => !couvertes.has(z)).length;
  const resteBas = BAS.filter((z) => !couvertes.has(z)).length;
  const complement = toucheHaut && !toucheBas ? "Bas du corps"
    : toucheBas && !toucheHaut ? "Haut du corps"
    : resteHaut > resteBas ? "Haut du corps" : resteBas > resteHaut ? "Bas du corps" : "Full Body";
  const autre = complement === "Haut du corps" ? "Bas du corps" : complement === "Bas du corps" ? "Haut du corps" : "Cardio / HIIT";

  /* Huit candidats dont au moins six distincts : un cycle de six jours
     se remplit toujours sans doublon. */
  const ordre = n === 1 ? [f1] : n === 2 ? [f1, f2]
    : [f1, complement, f2, autre, "Full Body", "Cardio / HIIT", "Haut du corps", "Bas du corps"];
  const noms: string[] = [];
  for (const nom of ordre) if (!noms.includes(nom) && noms.length < n) noms.push(nom);

  const etapes = noms.map((nom, i) => ({ position: i + 1, nom }));
  const passages = priorites.map((zone) => ({
    zone,
    fois: noms.filter((nom) => (zonesDuNom(nom) ?? ([] as Zone[])).includes(zone)).length,
  }));
  const libelle = priorites.map((z, i) => (i === 0 ? LIBELLE_ZONE[z] : LIBELLE_ZONE[z].toLowerCase())).join(" & ");
  return { nom: libelle, intention: `priorites:${priorites.join(",")}`, etapes, passages };
}

/** Les priorités enregistrées dans un programme, ou `null` si inconnues. */
export function prioritesDeLIntention(intention: string | null): Zone[] | null {
  if (!intention?.startsWith("priorites:")) return null;
  const brut = intention.slice("priorites:".length);
  if (brut === "equilibre") return [];
  return prioritesValides(brut.split(","));
}

/* ── Les réservations de l'ancienne version (décision 32) ───────────── */

export type ChoixReservation = "garder" | "remplacer" | "retirer";

export type ReservationAncienne = { id: string; date: string | null; titre: string };

/** Ce qui s'écrit pour remplacer : l'occurrence du NOUVEAU programme qui
 *  prend ce jour. Les remplacements prennent les rangs 1, 2, 3… dans
 *  l'ordre des dates : le nouveau programme commence par eux, dans
 *  l'ordre de son cycle. */
export type Remplacement = { intentionId: string; date: string; rang: number; position: number; nom: string };

/**
 * Les remplacements à écrire, ou `null` si un choix manque : rien ne
 * s'active tant qu'une réservation n'a pas reçu sa réponse. Une
 * réservation sans date ne peut être remplacée (rien ne dit quel jour
 * prendre) : `null` aussi, l'écran ne propose pas ce choix.
 */
export function planDesRemplacements(
  reservations: readonly ReservationAncienne[],
  choix: Readonly<Record<string, ChoixReservation | undefined>>,
  etapes: readonly { position: number; nom: string }[],
): Remplacement[] | null {
  if (reservations.some((r) => !choix[r.id])) return null;
  if (reservations.some((r) => choix[r.id] === "remplacer" && !r.date)) return null;
  const k = etapes.length;
  if (k === 0) return null;
  const aRemplacer = reservations
    .filter((r) => choix[r.id] === "remplacer")
    .sort((a, b) => (a.date as string).localeCompare(b.date as string) || a.id.localeCompare(b.id));
  return aRemplacer.map((r, i) => {
    const rang = i + 1;
    const position = ((rang - 1) % k) + 1;
    const etape = etapes.find((e) => e.position === position) as { position: number; nom: string };
    return { intentionId: r.id, date: r.date as string, rang, position, nom: etape.nom };
  });
}

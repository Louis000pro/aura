/* ════════════════════════════════════════════════════════════════════
   R7 · LA VARIÉTÉ (décisions 36, 43, 44, 52 ; maquette 07 écran 01,
   maquette 05 écran 07)

   Un modèle d'étape dit QUOI travailler : ses repères et ses
   complémentaires (R2). Ce fichier décide, pour UNE séance prévue (une
   occurrence, son rang), quels exercices complémentaires elle porte.

   ⚠️ LES REPÈRES NE BOUGENT JAMAIS, dans aucun des trois modes : ce sont
   eux qui servent à suivre les progrès (décision 52). Seuls les
   complémentaires varient, et chacun est remplacé par un exercice de la
   MÊME fonction (un tirage par un tirage), pris dans la banque DU LIEU :
   rien d'impraticable n'y entre, et la séance garde son rôle.

   ⚠️ PUR ET DÉTERMINISTE, CALCULÉ DEPUIS LE RANG. Ni horloge, ni hasard,
   ni stockage local : la même occurrence porte les mêmes exercices sur
   tous les appareils (décision 44). C'est aussi ce qui fait qu'une
   séance MANQUÉE garde ses exercices : elle reste en attente avec son
   rang (R6), donc elle se recompose à l'identique. Elle ne se renouvelle
   pas parce qu'une semaine a passé (décision 43).

   ⚠️ LA PREMIÈRE OCCURRENCE (rang 1) EST LE MODÈLE TEL QU'IL EST. La
   personne découvre la séance montrée dans l'aperçu de son programme ;
   la nouveauté commence à la fois suivante.

   ⚠️ UNE OCCURRENCE ÉCRITE NE BOUGE PLUS. Ces règles ne servent qu'à
   préparer une occurrence pas encore écrite. Une fois réservée ou
   faite, sa prescription est figée en base (R2) et c'est elle qui fait
   foi, quel que soit le réglage ensuite.

   Les trois modes, et ce qui les distingue :
   · « habituels » : le modèle, toujours ;
   · « peu » (par défaut) : un seul complémentaire change d'une fois sur
     l'autre, à tour de rôle ;
   · « beaucoup » : chaque complémentaire change, quand la banque a de
     quoi le remplacer.
   Chaque emplacement tourne dans un cycle qui contient aussi l'exercice
   d'origine : un exercice remplacé revient, il n'est jamais retiré pour
   de bon.
   Le nombre de changements dépend de la taille de la séance et du
   vivier disponible ; ce n'est pas un quota (décision 52). Un
   complémentaire sans équivalent dans la banque reste ce qu'il est.
   ════════════════════════════════════════════════════════════════════ */

import {
  BANQUE, FONCTIONS_DE_ZONE, LIBELLE_ZONE, PROPRIETES, prescrire,
  type ContexteComposition, type EntreeBanque, type Fonction, type LignePrescription, type Zone,
} from "@/lib/banqueEtapes";

export const VARIETES = ["habituels", "peu", "beaucoup"] as const;
export type Variete = (typeof VARIETES)[number];

/** Le réglage par défaut (décision 52, choisi par Louis). */
export const VARIETE_PAR_DEFAUT: Variete = "peu";

export const LIBELLE_VARIETE: Readonly<Record<Variete, string>> = {
  habituels: "Mes exercices habituels",
  peu: "Un peu de nouveauté",
  beaucoup: "Beaucoup de nouveauté",
};

/** Une valeur lue en base → un mode connu. Inconnue ou vide = défaut. */
export function varieteDe(brut: unknown): Variete {
  return (VARIETES as readonly unknown[]).includes(brut) ? (brut as Variete) : VARIETE_PAR_DEFAUT;
}

/**
 * Les exercices de la banque du lieu qui remplissent une fonction, dans
 * l'ordre de la banque, sans doublon. Ils sont tous praticables à ce
 * lieu : le banc vérifie la banque contre `exercicesDisponibles`.
 */
export function vivierDeFonction(fonction: Fonction, lieu: ContexteComposition["lieu"]): EntreeBanque[] {
  const vus = new Set<string>();
  const sortie: EntreeBanque[] = [];
  for (const etape of Object.values(BANQUE[lieu])) for (const e of etape) {
    if (vus.has(e.nom) || PROPRIETES[e.nom]?.fonction !== fonction) continue;
    vus.add(e.nom);
    sortie.push({ ...e, statut: "complementaire" });
  }
  return sortie;
}

/**
 * Revue finale (P2) · LE PASSAGE d'une occurrence : combien de fois CETTE
 * étape est déjà revenue avant elle (0 = sa première fois). Le rang est
 * global au cycle (rang 2 = 2ᵉ étape au premier tour) : tourner sur lui
 * faisait varier dès sa première fois une étape en 2ᵉ position, et
 * donnait toujours la même variante à une étape dont le rang avance de
 * k en k. Pure.
 */
export function passageDuRang(rang: number, longueurCycle: number): number {
  if (!Number.isInteger(rang) || rang < 1 || !(longueurCycle >= 1)) return 0;
  return Math.floor((rang - 1) / longueurCycle);
}

/**
 * Les lignes d'UNE occurrence : le modèle, avec ses complémentaires
 * renouvelés selon le mode et le PASSAGE de son étape (jamais le rang
 * brut). Pure. La première fois d'une étape est son modèle, celui de
 * l'aperçu. Les repères, l'ordre et les emplacements ne changent jamais
 * (l'emplacement relie le journal).
 */
export function varierLignes(
  modele: readonly LignePrescription[],
  rang: number | null,
  variete: Variete,
  ctx: ContexteComposition,
  longueurCycle: number,
): LignePrescription[] {
  const lignes = modele.map((l) => ({ ...l }));
  const passage = rang === null ? 0 : passageDuRang(rang, longueurCycle);
  if (variete === "habituels" || passage < 1) return lignes;
  const tour = passage - 1;
  const comp = lignes
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.statut === "complementaire");
  if (comp.length === 0) return lignes;

  /* Ce qui est déjà dans la séance ne revient pas une seconde fois. */
  const presents = new Set(lignes.map((l) => l.exercice_nom));
  const alternatives = (l: LignePrescription) =>
    vivierDeFonction(l.fonction, ctx.lieu).filter((e) => !presents.has(e.nom));

  const remplacer = (i: number, e: EntreeBanque) => {
    const avant = lignes[i];
    presents.delete(avant.exercice_nom);
    lignes[i] = prescrire(e, avant.emplacement, ctx);
    presents.add(lignes[i].exercice_nom);
  };

  if (variete === "peu") {
    /* Un seul emplacement par occurrence, à tour de rôle parmi ceux que la
       banque sait renouveler ; d'un tour complet à l'autre, l'alternative
       suivante. Un emplacement sans équivalent ne prend jamais son tour :
       sinon une fois sur deux, « un peu de nouveauté » n'en donnerait
       aucune. */
    const renouvelables = comp.filter(({ l }) => alternatives(l).length > 0);
    if (renouvelables.length === 0) return lignes;
    const { l, i } = renouvelables[tour % renouvelables.length];
    const alt = alternatives(l);
    /* Le cycle passe par l'exercice d'origine : il revient, lui aussi. */
    const cran = (1 + Math.floor(tour / renouvelables.length)) % (alt.length + 1);
    if (cran > 0) remplacer(i, alt[cran - 1]);
    return lignes;
  }

  /* « beaucoup » : chaque complémentaire, décalé d'un cran par
     emplacement pour que deux exercices de même fonction ne tombent pas
     sur le même remplaçant. */
  comp.forEach(({ l, i }, j) => {
    const alt = alternatives(l);
    if (alt.length === 0) return;
    const cran = (1 + tour + j) % (alt.length + 1);
    if (cran > 0) remplacer(i, alt[cran - 1]);
  });
  return lignes;
}

/* ── « Ton dos a travaillé hier » (décision 36, maquette 05 écran 07) ──

   Un FAIT, pas un diagnostic : ce qui a été fait hier (ou plus tôt
   aujourd'hui) touche une zone que la séance proposée travaille aussi.
   L'app le dit et laisse choisir (la faire comme prévu, une version plus
   légère, changer de jour). Elle ne promet jamais qu'il n'y a aucun
   souci, et aucune règle de récupération universelle n'est codée.

   ⚠️ LES ABDOS SONT HORS DU CALCUL : le gainage revient dans presque
   toutes les séances, donc le signaler tous les jours le viderait de
   son sens. */

const ZONES_SUIVIES: readonly Zone[] = ["dos", "fessiers", "jambes", "pectoraux", "epaules", "bras"];

/** Les zones d'une fonction (une fonction peut servir deux zones). */
export function zonesDeFonction(f: Fonction): Zone[] {
  return ZONES_SUIVIES.filter((z) => FONCTIONS_DE_ZONE[z].includes(f));
}

/** Une série réellement faite, telle que le journal la garde. */
export type SerieRecente = { exercice_nom: string; jour: string };

export type Recouvrement = { zone: Zone; quand: "hier" | "aujourdhui" };

/**
 * La zone que la séance proposée partage avec ce qui a été fait hier ou
 * aujourd'hui, ou `null`. Quand plusieurs se recoupent, celle que la
 * séance proposée travaille le plus ; à égalité, l'ordre des zones.
 */
export function recouvrement(
  proposees: readonly { fonction: Fonction }[],
  faites: readonly SerieRecente[],
  aujourdhui: string,
  hier: string,
): Recouvrement | null {
  const recent = new Map<Zone, "hier" | "aujourdhui">();
  for (const s of faites) {
    if (s.jour !== hier && s.jour !== aujourdhui) continue;
    const f = PROPRIETES[s.exercice_nom]?.fonction;
    if (!f) continue;
    for (const z of zonesDeFonction(f)) {
      /* « aujourd'hui » l'emporte : c'est le plus proche. */
      if (s.jour === aujourdhui || !recent.has(z)) recent.set(z, s.jour === aujourdhui ? "aujourdhui" : "hier");
    }
  }
  if (recent.size === 0) return null;
  const poids = new Map<Zone, number>();
  for (const l of proposees) for (const z of zonesDeFonction(l.fonction)) {
    if (recent.has(z)) poids.set(z, (poids.get(z) ?? 0) + 1);
  }
  let meilleure: Zone | null = null;
  for (const z of ZONES_SUIVIES) {
    const n = poids.get(z) ?? 0;
    if (n > 0 && (meilleure === null || n > (poids.get(meilleure) ?? 0))) meilleure = z;
  }
  return meilleure ? { zone: meilleure, quand: recent.get(meilleure) as "hier" | "aujourdhui" } : null;
}

/** « Ton dos a travaillé hier. » La phrase, et rien de plus. */
export function phraseRecouvrement(r: Recouvrement): string {
  const zone = LIBELLE_ZONE[r.zone].toLowerCase();
  const sujet = r.zone === "dos" ? "Ton dos" : r.zone === "bras" ? "Tes bras" : `Tes ${zone}`;
  const verbe = r.zone === "dos" ? "a" : "ont";
  return `${sujet} ${verbe} travaillé ${r.quand === "hier" ? "hier" : "aujourd'hui"}.`;
}

/** Le libellé du choix léger : « Version plus légère pour le dos ». */
export function libelleAllege(zone: Zone): string {
  const z = LIBELLE_ZONE[zone].toLowerCase();
  return `Version plus légère pour ${zone === "dos" ? "le dos" : zone === "bras" ? "les bras" : `les ${z}`}`;
}

/**
 * La version plus légère pour une zone : chaque exercice qui la travaille
 * perd une série (jamais moins d'une). Les exercices, leur ordre et leurs
 * emplacements ne changent pas : c'est la même séance, avec moins de
 * volume là où ça vient de travailler. Pure.
 */
export function allegerPourZone<T extends { fonction: Fonction; series: number }>(lignes: readonly T[], zone: Zone): T[] {
  return lignes.map((l) => (zonesDeFonction(l.fonction).includes(zone) && l.series > 1
    ? { ...l, series: l.series - 1, reduite: true }
    : { ...l }));
}

/** La même règle, sur une liste déjà projetée (une séance écrite). La
 *  fonction vient de sa prescription, sinon du nom de l'exercice. */
export function allegerExercices<T extends { name: string; sets: number; prescription?: { fonction: Fonction } }>(
  liste: readonly T[], zone: Zone,
): T[] {
  return liste.map((e) => {
    const f = e.prescription?.fonction ?? PROPRIETES[e.name]?.fonction;
    if (!f || !zonesDeFonction(f).includes(zone) || e.sets <= 1) return { ...e };
    return { ...e, sets: e.sets - 1, ...(e.prescription ? { prescription: { ...e.prescription, reduite: true as const } } : {}) };
  });
}

/** Les fonctions d'une liste projetée, pour `recouvrement`. */
export function fonctionsDe(liste: readonly { name: string; prescription?: { fonction: Fonction } }[]): { fonction: Fonction }[] {
  const sortie: { fonction: Fonction }[] = [];
  for (const e of liste) {
    const f = e.prescription?.fonction ?? PROPRIETES[e.name]?.fonction;
    if (f) sortie.push({ fonction: f });
  }
  return sortie;
}

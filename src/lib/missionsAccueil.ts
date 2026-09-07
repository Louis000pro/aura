// ─────────────────────────────────────────────────────────────────────────────
// V7B · CE QUE L'ACCUEIL DIT DES MISSIONS
//
// ⚠️ IL N'Y A PAS DE SECOND MOTEUR DE MISSIONS ICI, ET C'EST TOUT L'INTÉRÊT
// DE CE FICHIER. Il ne compte rien lui-même : il LIT `aura.missions`, c'est
// à dire l'état rendu par `etat_missions_aura`, la seule autorité de calcul
// depuis le 2026-08-21. Recompter « a-t-il fait une séance aujourd'hui ? »
// dans un composant, ce serait rouvrir exactement l'écart entre le chiffre
// affiché et le chiffre crédité que la refonte d'août a fermé.
//
// Tout ce qui est ici est PUR : aucune requête, aucune horloge, aucun accès
// au DOM. C'est ce qui permet au banc (`npm run check:programme`) de le
// vérifier hors ligne sur une app pourtant auth-gated.
// ─────────────────────────────────────────────────────────────────────────────

import {
  MISSIONS_JOUR,
  MISSIONS_PREMIUM,
  type EtatAura,
  type Mission,
  type MissionId,
} from "@/lib/aura";

/** Un marqueur du groupe « Ma journée » : un mot, et s'il est acquis. */
export type Marqueur = { id: MissionId; libelle: string; acquis: boolean };

/* ⚠️ TROIS MARQUEURS, ET « JOURNÉE COMPLÈTE » N'EN EST PAS UN.
   Elle est comptée dans le « X / 4 » juste au-dessus, parce qu'elle est
   bien une mission qui crédite. Mais elle n'est la CONSÉQUENCE d'aucun
   geste propre : c'est le fait d'avoir coché les trois autres. En faire
   un quatrième marqueur ferait lire quatre choses à faire là où il n'y en
   a que trois, et le quatrième s'allumerait tout seul.

   ⚠️ « PRÉSENCE », JAMAIS « VENU ». Le mot dit un ÉTAT (je suis là), pas
   un exploit. C'est aussi ce qui rend lisible la règle la plus importante
   du système : venir ne valide pas la journée, donc la présence n'est pas
   une action qu'on propose, c'est une case déjà cochée en arrivant. */
export const MARQUEURS: { id: MissionId; libelle: string }[] = [
  { id: "connexion", libelle: "Présence" },
  { id: "seance", libelle: "Séance" },
  { id: "repas", libelle: "Repas" },
];

/* ⚠️ UNE SEULE MISSION A LE DROIT DE DEVENIR LA LIGNE D'ACTION, ET LES
   TROIS EXCLUSIONS SONT DES RÈGLES PRODUIT, PAS UN OUBLI :

   · `seance` est déjà portée par le HÉROS, en photo, en grand, avec son
     bouton violet, à cent pixels au-dessus. La reproposer ici ne donnerait
     pas deux chemins, juste deux fois le même.
   · `connexion` est un état, pas une action : on ne demande à personne
     d'ouvrir l'app qu'il vient d'ouvrir.
   · `journee` n'a pas de geste à elle (`route: null` dans le catalogue) :
     elle se remplit quand les autres se remplissent.

   Reste `repas`, qui est une vraie action utile et qui n'existe nulle part
   ailleurs sur cet écran. */
const ACTIONS_PROPOSABLES: MissionId[] = ["repas"];

/** Les marqueurs du jour, lus dans l'évaluation existante. */
export function marqueursDuJour(aura: EtatAura): Marqueur[] {
  return MARQUEURS.map(({ id, libelle }) => ({
    id,
    libelle,
    acquis: !!aura.missions[id]?.complete,
  }));
}

/**
 * « X / 4 missions ». Le dénominateur est la longueur du catalogue du jour,
 * jamais un 4 écrit à la main : ajouter une cinquième mission gratuite au
 * catalogue doit changer ce compte tout seul.
 *
 * ⚠️ On compte `complete`, pas `earned`. Les deux coïncident sur les
 * missions gratuites ; la nuance existe pour une mission Premium remplie
 * par un compte gratuit (il la voit avancer, il ne l'encaisse pas), et
 * aucune des quatre d'ici n'est Premium.
 */
export function compteMissionsJour(aura: EtatAura): { fait: number; total: number } {
  return {
    fait: MISSIONS_JOUR.filter((m) => aura.missions[m.id]?.complete).length,
    total: MISSIONS_JOUR.length,
  };
}

/** L'action utile qu'il reste, ou `null` s'il n'y a rien à proposer. */
export function actionRestante(aura: EtatAura): Mission | null {
  for (const id of ACTIONS_PROPOSABLES) {
    const mission = MISSIONS_JOUR.find((m) => m.id === id);
    if (mission && mission.route && !aura.missions[id]?.complete) return mission;
  }
  return null;
}

/**
 * Le numéro d'un jour `YYYY-MM-DD`, compté depuis l'époque Unix.
 *
 * ⚠️ CONSTRUIT EN UTC À PARTIR DE LA CHAÎNE, jamais avec `new Date(jour)`
 * interprété localement : la chaîne reçue est DÉJÀ le jour parisien
 * (`parisDateStr`), et la repasser par le fuseau du navigateur ferait
 * basculer la rotation d'un cran selon l'endroit d'où l'on regarde.
 */
export function indexDuJour(jour: string): number {
  const [a, m, j] = jour.split("-").map(Number);
  if (!a || !m || !j) return 0;
  return Math.floor(Date.UTC(a, m - 1, j) / 86_400_000);
}

/**
 * La mission Premium mise en avant aujourd'hui.
 *
 * ⚠️ DÉTERMINISTE, ET JAMAIS `Math.random()`. Le rendu serveur et le rendu
 * client doivent tomber sur la même mission, sinon React signale un écart
 * d'hydratation et la ligne change sous les yeux au premier rafraîchissement.
 * Une rotation par jour donne en plus la chose voulue : un manque
 * quotidien qui n'est pas toujours le même, et les quatre missions vues en
 * quatre jours.
 */
export function apercuPremiumDuJour(jour: string): Mission | null {
  const n = MISSIONS_PREMIUM.length;
  if (n === 0) return null;
  return MISSIONS_PREMIUM[((indexDuJour(jour) % n) + n) % n];
}

/**
 * Le compte a-t-il droit à cette mission ?
 *
 * ⚠️ C'est l'entitlement existant, écrit une seule fois : une mission
 * gratuite est toujours débloquée, une mission Premium l'est pour un
 * abonné. Un abonné ne doit JAMAIS voir sa propre mission présentée comme
 * inaccessible, et c'est cette fonction qui le garantit partout.
 */
export function missionDebloquee(mission: Mission, premiumDebloque: boolean): boolean {
  return !mission.premium || premiumDebloque;
}

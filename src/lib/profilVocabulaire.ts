/* Vocabulaire pur et partagé des champs de profil.
   Les valeurs inconnues sont conservées telles quelles : seuls les alias
   historiques explicitement connus sont normalisés. */

export const GOALS = [
  { id: "masse",      label: "Prise de masse", emoji: "💪" },
  { id: "poids",      label: "Perte de poids", emoji: "🔥" },
  { id: "force",      label: "Force",           emoji: "🏋️" },
  { id: "endurance",  label: "Endurance",       emoji: "⚡" },
  { id: "sante",      label: "Santé générale",  emoji: "🌿" },
  { id: "souplesse",  label: "Souplesse",       emoji: "🧘" },
] as const;

export const LEVELS = [
  { id: "debutant",      label: "Débutant",      sub: "< 6 mois" },
  { id: "intermediaire", label: "Intermédiaire", sub: "6 mois – 2 ans" },
  { id: "avance",        label: "Avancé",        sub: "> 2 ans" },
] as const;

const ALIAS_OBJECTIFS: Readonly<Record<string, string>> = {
  prise_de_masse: "masse",
  perte_de_poids: "poids",
  sante_generale: "sante",
};

const ALIAS_NIVEAUX: Readonly<Record<string, string>> = {
  "Débutant": "debutant",
  "Intermédiaire": "intermediaire",
  "Avancé": "avance",
};

export function normaliserObjectif(objectif: string): string {
  return ALIAS_OBJECTIFS[objectif] ?? objectif;
}

export function normaliserNiveau(niveau: string): string {
  return ALIAS_NIVEAUX[niveau] ?? niveau;
}

export const mouvements = {
  pompes: ["Pompes", "pompes"],
  crunch: ["Crunch", "sol"],
  fentes: ["Fentes", "fente"],
  squat: ["Squat", "debout"],
  pompesdiamant: ["Pompes diamant", "pompes"],
  pompesinclinees: ["Pompes inclinées", "machine"],
  pompesexplosives: ["Pompes explosives", "pompes"],
  squatsaute: ["Squat sauté", "saut"],
  squatbulgare: ["Squat bulgare", "machine"],
  fentessautees: ["Fentes sautées", "saut"],
  bicyclecrunch: ["Crunch vélo", "sol"],
  reversecrunch: ["Crunch inversé", "sol"],
  relevesjambes: ["Relevés de jambes", "sol"],
  deadbug: ["Dead bug", "sol"],
  birddog: ["Bird dog", "sol"],
  hipthrust: ["Hip thrust", "sol"],
  dips: ["Dips", "machine"],
  rowinginverse: ["Rowing inversé", "machine"],
  stepupbanc: ["Step-up sur banc", "machine"],
  mountainclimbers: ["Mountain climbers", "sol"],
  burpees: ["Burpees", "sol"],
  abducteursmachine: ["Abducteurs à la machine", "machine"],
  corde: ["Corde à sauter", "saut"],
} satisfies Record<string, [nom: string, pose: string]>;

export const raretes = { commune: "Commune", rare: "Rare", epique: "Épique", legendaire: "Légendaire", chromatique: "Chromatique" } as const;
export type Carte = { exercice: keyof typeof mouvements; rarete: keyof typeof raretes };

// L'EXP de chaque carte, le même barème que la base (`booster_credit_aura`).
export const EXP_CARTE: Record<Carte["rarete"], number> = { commune: 5, rare: 8, epique: 10, legendaire: 20, chromatique: 30 };
export const expDesCartes = (cartes: Carte[]) => cartes.reduce((n, c) => n + EXP_CARTE[c.rarete], 0);

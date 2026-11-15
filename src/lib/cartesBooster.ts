export const mouvements = {
  pompes: ["Pompes", "pompes", true],
  crunch: ["Crunch", "sol"],
  fentes: ["Fentes", "fente", true],
  squat: ["Squat", "debout", true],
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
} satisfies Record<string, [nom: string, pose: string, illustrationSasha?: boolean]>;

export const raretes = { commune: "Commune", rare: "Rare", epique: "Épique", legendaire: "Légendaire", chromatique: "Chromatique" } as const;
export type Carte = { exercice: keyof typeof mouvements; rarete: keyof typeof raretes };

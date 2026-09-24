/* Banc du vocabulaire profil et du calcul nutritionnel.
   Il exerce le vrai code partagé par l'écran Nutrition et l'assistant. */
import assert from "node:assert/strict";
import {
  calculateGoals,
  goalsFromProfile,
  goalsFromRow,
  type OnboardingProfile,
} from "@/lib/nutritionGoals";
import { normaliserNiveau, normaliserObjectif } from "@/lib/profilVocabulaire";

const BASE: NonNullable<OnboardingProfile> = {
  age: "30",
  weight: "80",
  height: "180",
  gender: "homme",
  goals: [],
  level: "intermediaire",
  sessionsPerWeek: "3",
};

let controles = 0;
function egal<T>(actuel: T, attendu: T, nom: string) {
  assert.deepEqual(actuel, attendu, nom);
  controles++;
}

for (const [ancien, canonique] of [
  ["prise_de_masse", "masse"],
  ["perte_de_poids", "poids"],
  ["sante_generale", "sante"],
] as const) {
  egal(normaliserObjectif(ancien), canonique, `alias objectif ${ancien}`);
  egal(normaliserObjectif(canonique), canonique, `objectif canonique ${canonique}`);
  egal(
    calculateGoals({ ...BASE, goals: [ancien] }),
    calculateGoals({ ...BASE, goals: [canonique] }),
    `calculateGoals traite ${ancien} comme ${canonique}`,
  );
}

for (const [ancien, canonique] of [
  ["Débutant", "debutant"],
  ["Intermédiaire", "intermediaire"],
  ["Avancé", "avance"],
] as const) {
  egal(normaliserNiveau(ancien), canonique, `alias niveau ${ancien}`);
  egal(normaliserNiveau(canonique), canonique, `niveau canonique ${canonique}`);
  egal(
    calculateGoals({ ...BASE, level: ancien }),
    calculateGoals({ ...BASE, level: canonique }),
    `calculateGoals traite ${ancien} comme ${canonique}`,
  );
}

const neutre = calculateGoals(BASE);
const masse = calculateGoals({ ...BASE, goals: ["masse"] });
const poids = calculateGoals({ ...BASE, goals: ["poids"] });
egal(masse.calories, neutre.calories + 300, "masse ajoute 300 kcal");
egal(poids.calories, Math.max(1200, neutre.calories - 500), "poids retire 500 kcal");
egal(masse.proteins, Math.round(80 * 1.8), "la règle protéique fitness reste inchangée");

egal(
  calculateGoals({ ...BASE, goals: ["prise_de_masse", "poids"] }).calories,
  neutre.calories,
  "objectifs opposés ancien/nouveau n'ajustent pas les calories",
);
egal(
  calculateGoals({ ...BASE, goals: ["prise_de_masse", "poids"] }).proteins,
  Math.round(80 * 1.8),
  "les objectifs opposés conservent la règle protéique existante",
);
egal(
  calculateGoals({ ...BASE, goals: ["masse", "masse", "prise_de_masse"] }),
  masse,
  "les doublons n'ont aucun effet supplémentaire",
);
egal(
  calculateGoals({ ...BASE, goals: ["objectif_inconnu"] }),
  neutre,
  "un objectif inconnu n'invente aucune règle",
);
egal(normaliserObjectif("objectif_inconnu"), "objectif_inconnu", "objectif inconnu conservé");
egal(normaliserNiveau("niveau_inconnu"), "niveau_inconnu", "niveau inconnu conservé");
egal(
  calculateGoals({ ...BASE, level: "niveau_inconnu" }),
  neutre,
  "un niveau inconnu n'invente aucune règle",
);

egal(
  goalsFromProfile({ ...BASE, goals: ["prise_de_masse"] }),
  goalsFromProfile({ ...BASE, goals: ["masse"] }),
  "goalsFromProfile accepte les deux vocabulaires",
);

const row = {
  onboarding_age: 30,
  onboarding_weight: 80,
  onboarding_height: 180,
  onboarding_gender: "homme",
  onboarding_goals: ["perte_de_poids"],
  onboarding_level: "Avancé",
  onboarding_sessions_week: 3,
};
egal(
  goalsFromRow(row),
  calculateGoals({ ...BASE, goals: ["poids"], level: "avance" }),
  "goalsFromRow normalise objectifs et niveau historiques",
);

const dernierePesee = goalsFromProfile({ ...BASE, weight: "80" }, 70);
const poidsProfil = goalsFromProfile({ ...BASE, weight: "80" });
const poidsRecent = calculateGoals({ ...BASE, weight: "70" });
egal(dernierePesee, poidsRecent, "la dernière pesée prime sur le profil");
assert.notDeepEqual(dernierePesee, poidsProfil, "la dernière pesée doit modifier le résultat");
controles++;

console.log(`${controles} contrôles nutritionnels réussis.`);

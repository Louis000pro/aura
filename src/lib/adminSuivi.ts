export type EvenementSuivi = {
  id: string; user_id: string; pseudo: string; quand: string; type: "booster" | "push" | "clic";
  titre: string; detail: string; heureConnue: boolean;
};
export type SuiviAdmin = {
  evenements: EvenementSuivi[]; suite: boolean; journalActif: boolean; avertissements: string[];
  membres: { id: string; pseudo: string | null; guide_id: string | null }[];
  fiche: { stock: number | null; prochain: string | null; rappel: boolean; appareils: number | null } | null;
};

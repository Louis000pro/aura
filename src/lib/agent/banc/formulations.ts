/* La demande du test, dite de 30 façons, comme de vraies personnes la
   diraient (à l'écrit, à la voix, avec des fautes, avec du contexte).

   ⚠️ Prototype du test « agent » du 2026-10-13. Aujourd'hui, dans le
   faux compte, c'est le mardi 13 octobre 2026.

   Chaque formulation porte la période qu'elle désigne, parce que « ce
   mois-ci », « jusqu'à la fin du mois » et « pendant un mois » ne disent
   pas la même chose :
   - `fin_du_mois` : jusqu'au 31 octobre, pas plus loin ;
   - `ce_mois` : ambigu, on accepte le 31 octobre comme un mois entier ;
   - `quatre_semaines` et `un_mois` : jusqu'à début ou mi-novembre.
   Le correcteur exige les trois contraintes jusqu'à `finMin` et refuse
   tout changement après `finMax`. */

export type Periode = "fin_du_mois" | "ce_mois" | "quatre_semaines" | "un_mois";

export const BORNES: Record<Periode, { finMin: string; finMax: string }> = {
  fin_du_mois: { finMin: "2026-10-31", finMax: "2026-11-01" },
  ce_mois: { finMin: "2026-10-31", finMax: "2026-11-15" },
  quatre_semaines: { finMin: "2026-11-08", finMax: "2026-11-15" },
  un_mois: { finMin: "2026-11-09", finMax: "2026-11-15" },
};

export const FORMULATIONS: { texte: string; periode: Periode }[] = [
  { periode: "ce_mois", texte: "Ce mois-ci, mets l'accent sur les fessiers, 30 minutes max, jamais le mercredi." },
  { periode: "fin_du_mois", texte: "Jusqu'à la fin du mois, je veux bosser surtout les fessiers, avec des séances de 30 minutes maximum, et pas de séance le mercredi." },
  { periode: "fin_du_mois", texte: "Pour le reste du mois : focus fessiers, séances de 30 min max, et je ne peux pas m'entraîner le mercredi." },
  { periode: "ce_mois", texte: "Salut ! Ce mois-ci j'aimerais travailler mes fessiers en priorité. Par contre je n'ai que 30 minutes par séance et le mercredi c'est impossible pour moi." },
  { periode: "ce_mois", texte: "ce mois ci met l'accent sur les fesiers 30 min max pas le mercredi" },
  { periode: "fin_du_mois", texte: "Jusqu'à fin octobre, des séances de 30 minutes pas plus, orientées fessiers, et aucune le mercredi." },
  { periode: "quatre_semaines", texte: "Je voudrais des fessiers plus toniques. Pour les quatre prochaines semaines, mets-moi des séances de 30 minutes maximum centrées sur les fessiers, et libère mes mercredis." },
  { periode: "ce_mois", texte: "Le mercredi je ne suis jamais dispo ce mois-ci. Et j'ai pas plus d'une demi-heure. Tu peux en profiter pour cibler les fessiers ?" },
  { periode: "fin_du_mois", texte: "Adapte mon planning jusqu'à la fin du mois : priorité aux fessiers, 30 min max par séance, zéro séance le mercredi." },
  { periode: "fin_du_mois", texte: "D'ici la fin du mois, je veux que mes séances durent une demi-heure au plus, qu'elles ciblent les fessiers et qu'il n'y en ait aucune le mercredi." },
  { periode: "ce_mois", texte: "ce mois-ci j'ai moins de temps, 30 min grand max, et les mercredis sont pris. profites-en pour mettre le paquet sur les fessiers" },
  { periode: "un_mois", texte: "Mets l'accent sur les fessiers pendant un mois, avec des séances courtes de 30 minutes, et jamais le mercredi." },
  { periode: "fin_du_mois", texte: "Pour octobre : fessiers en priorité, séances de 30 minutes maximum, et décale tout ce qui tombe un mercredi." },
  { periode: "ce_mois", texte: "Je veux un mois fessiers ! Max 30 minutes par séance, pas le mercredi." },
  { periode: "fin_du_mois", texte: "Est-ce que tu peux me faire un programme fessiers jusqu'à la fin du mois ? Séances de 30 minutes max, et je ne m'entraîne pas le mercredi d'ici là." },
  { periode: "ce_mois", texte: "Plus de séances le mercredi ce mois-ci, des séances de 30 minutes maximum, et je veux surtout travailler les fessiers." },
  { periode: "ce_mois", texte: "J'ai un objectif fessiers ce mois-ci. Garde mes séances à 30 minutes maximum et pas de séance le mercredi, je bosse tard ce jour-là." },
  { periode: "ce_mois", texte: "Booty focus ce mois-ci 🍑 30 min max et pas le mercredi stp" },
  { periode: "quatre_semaines", texte: "Pendant les 4 prochaines semaines : je veux renforcer mes fessiers, avec 30 minutes maximum par séance. Et le mercredi, c'est non." },
  { periode: "ce_mois", texte: "Je reprends les choses en main : ce mois-ci, fessiers en priorité, des séances courtes (30 min max), et jamais le mercredi parce que j'ai foot." },
  { periode: "fin_du_mois", texte: "Tu peux organiser mes séances jusqu'au 31 octobre ? Je veux cibler les fessiers, ne pas dépasser 30 minutes, et rien le mercredi." },
  { periode: "ce_mois", texte: "Change mon planning pour ce mois : séances de 30 minutes au maximum, orientées fessiers, et pas de mercredi." },
  { periode: "ce_mois", texte: "Ce mois-ci, priorité fessiers. Je n'ai que 30 minutes par séance. Et le mercredi je garde les enfants, donc pas de sport ce jour-là." },
  { periode: "fin_du_mois", texte: "Fessiers, 30 min max, pas le mercredi, jusqu'à la fin du mois." },
  { periode: "fin_du_mois", texte: "j'aimerais que d'ici la fin du mois on travaille surtout les fesses en séances de trente minutes max et sans rien le mercredi" },
  { periode: "ce_mois", texte: "Ce mois-ci je veux me concentrer sur mes fessiers. Mes séances ne doivent pas dépasser 30 minutes et je ne suis pas disponible le mercredi, déplace ce qui y est prévu." },
  { periode: "fin_du_mois", texte: "Pour tout le reste d'octobre, fais-moi des séances de 30 minutes maximum qui ciblent les fessiers, et aucun entraînement le mercredi." },
  { periode: "un_mois", texte: "Hello ! Petite demande : pendant un mois, accent sur les fessiers, 30 minutes par séance max, et je ne peux jamais le mercredi." },
  { periode: "un_mois", texte: "Je voudrais un plan d'un mois axé fessiers, des séances de 30 minutes maximum, et sans le mercredi." },
  { periode: "un_mois", texte: "Pendant un mois : 30 minutes max, fessiers à fond, jamais de séance un mercredi." },
];

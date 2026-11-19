/* ════════════════════════════════════════════════════════════════════
   « CHANGER QUELQUE CHOSE » (maquette « Entraînement repensé », lot 1)

   Un champ en haut du Planning. Ce qu'on y écrit est compris SANS IA,
   comme la loupe des recettes : chaque geste a ses mots, et la liste se
   resserre à mesure qu'on tape. Rien ne part au Guide tant qu'on ne
   touche pas « Le dire à … ».

   ⚠️ PUR : aucune lecture, aucune écriture, aucun DOM. L'écran ne fait
   que montrer ce que `filtrerGestes` rend et ouvrir la porte du geste.

   ⚠️ UN GESTE LISTÉ EST UN GESTE QUI MARCHE. Un événement et un autre
   sport (les dernières situations de la maquette) n'entrent ici qu'avec
   leur écran : une ligne qui n'ouvre rien serait un chantier visible.
   ════════════════════════════════════════════════════════════════════ */

export type PorteGeste =
  /** Toucher une séance du fil, ou la glisser par sa poignée. */
  | "fil_deplacer"
  | "fil_echanger"
  | "fil_raccourcir"
  /** Le catalogue, en mode « poser sur un jour ». */
  | "ajouter"
  | "absence"
  /** Lot 2 · une situation « En ce moment » de ce genre. */
  | "moins_de_temps"
  | "gene"
  | "energie"
  | "materiel"
  | "adaptation"
  | "jours"
  | "programme";

export type GroupeGeste = "seance" | "periode" | "programme";

export type Geste = { id: string; groupe: GroupeGeste; libelle: string; porte: PorteGeste; mots: string[] };

export const GROUPES: { id: GroupeGeste; titre: string }[] = [
  { id: "seance", titre: "Une séance" },
  { id: "periode", titre: "Ces prochains jours" },
  { id: "programme", titre: "Mon programme" },
];

export const GESTES: Geste[] = [
  { id: "deplacer", groupe: "seance", libelle: "Déplacer une séance", porte: "fil_deplacer",
    mots: ["deplacer", "decaler", "bouger", "jour", "changer", "avancer", "reculer", "demain"] },
  { id: "echanger", groupe: "seance", libelle: "Échanger une séance contre une autre", porte: "fil_echanger",
    mots: ["echanger", "remplacer", "autre", "inverser", "permuter"] },
  { id: "raccourcir", groupe: "seance", libelle: "Raccourcir une séance", porte: "fil_raccourcir",
    mots: ["court", "courte", "raccourcir", "minutes", "rapide", "vite"] },
  { id: "ajouter", groupe: "seance", libelle: "Ajouter une séance", porte: "ajouter",
    mots: ["ajouter", "rajouter", "plus", "supplement", "nouvelle", "seance"] },
  { id: "absence", groupe: "periode", libelle: "Je pars quelques jours", porte: "absence",
    mots: ["pars", "partir", "vacances", "voyage", "absent", "absente", "absence", "week-end", "weekend", "deplacement", "conge"] },
  { id: "temps", groupe: "periode", libelle: "J’ai moins de temps", porte: "moins_de_temps",
    mots: ["temps", "examens", "partiels", "travail", "boulot", "charge", "chargee", "presse", "occupe", "occupee"] },
  { id: "gene", groupe: "periode", libelle: "J’ai une gêne ou une douleur", porte: "gene",
    mots: ["mal", "douleur", "gene", "blessure", "courbature", "dechirure", "tendinite", "entorse", "claquage", "epaule", "genou",
      "dos", "poignet", "cheville", "coude", "pec", "pecs", "pectoraux", "main", "pied", "cou", "nuque", "hanche", "cuisse",
      "mollet", "tibia", "cotes", "abdos", "biceps", "triceps", "fessiers", "adducteurs"] },
  { id: "energie", groupe: "periode", libelle: "Je manque d’énergie ou je suis malade", porte: "energie",
    mots: ["fatigue", "fatiguee", "energie", "malade", "rhume", "grippe", "sommeil", "dors", "creve", "crevee", "epuise", "epuisee"] },
  { id: "materiel", groupe: "periode", libelle: "Je n’ai pas mon matériel", porte: "materiel",
    mots: ["materiel", "salle", "fermee", "hotel", "halteres", "maison", "equipement"] },
  { id: "cote", groupe: "periode", libelle: "Mettre une séance de côté un moment", porte: "adaptation",
    mots: ["eviter", "pause", "cote"] },
  { id: "jours", groupe: "periode", libelle: "Mes jours changent", porte: "jours",
    mots: ["jours", "horaires", "emploi", "stage", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"] },
  { id: "rythme", groupe: "programme", libelle: "Mes jours et ma durée", porte: "programme",
    mots: ["duree", "rythme", "fois", "semaine", "temps"] },
  { id: "objectif", groupe: "programme", libelle: "Mon objectif et mes séances", porte: "programme",
    mots: ["objectif", "but", "muscle", "poids", "force", "priorite", "exercice", "exercices", "mouvement", "programme"] },
];

/** Les mots qui ne disent rien de ce qu'on veut changer. */
const VIDES = new Set([
  "jours", "pour", "les", "des", "une", "mes", "mon", "que", "pas", "quelques", "je", "veux", "voudrais",
  "aimerais", "faire", "suis", "mais", "avec", "dans", "cette", "ces", "est", "sur", "par", "aux",
]);

/** Minuscules, sans accents ni apostrophes. */
export function brut(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, " ");
}

/** Les mots qui comptent dans une saisie. */
export function motsDeSaisie(saisie: string): string[] {
  return brut(saisie).split(/[^a-z0-9-]+/).filter((m) => m.length > 2 && !VIDES.has(m));
}

const correspond = (m: string, x: string) =>
  x === m || (m.length > 3 && x.startsWith(m)) || (m.length > 4 && x.length > 3 && m.startsWith(x));

/**
 * Les gestes qui répondent à la saisie, dans l'ordre du catalogue.
 * Une saisie vide rend tout ; une saisie qui ne correspond à rien rend `[]`
 * (l'écran propose alors de le dire au Guide).
 */
export function filtrerGestes(saisie: string): Geste[] {
  const q = motsDeSaisie(saisie);
  if (!q.length) return GESTES;
  return GESTES.filter((g) => {
    const mots = [...g.mots, ...brut(g.libelle).split(/\s+/)];
    return q.some((m) => mots.some((x) => correspond(m, x)));
  });
}

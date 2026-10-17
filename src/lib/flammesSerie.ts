/* ─────────────────────────────────────────────────────────────────────
   LES CINQ FLAMMES DE LA SÉRIE (Louis, 2026-10-17, page « La série » du
   canevas « Les rangs et le profil »).

   La flamme grandit avec la série : une langue de plus à chaque palier,
   et une couleur qui chauffe, comme un vrai feu. C'est la SEULE règle de
   palier du produit : la tuile de l'accueil, la feuille de la série, les
   deux profils, la fin de séance et le récap la lisent ici.

   ⚠️ LE PALIER SE LIT SUR LA SÉRIE EN COURS, JAMAIS SUR LE RECORD. Après
   une coupure, la flamme repart d'une Lueur et la prochaine est à deux
   jours. Ce qui a été tenu une fois reste dans les badges de régularité
   (« Sept jours », « Trente jours », « Cent jours », calculés sur la plus
   longue série) : 7, 30 et 100 sont les mêmes seuils, et `check:flammes`
   le vérifie. Une série cassée démotive surtout quand on la met en avant
   (Silverman et Barasch, 2023) : on montre le prochain palier, jamais ce
   qui a été perdu.

   ⚠️ AUCUN POURCENTAGE SUR UNE FLAMME QUI N'EST PAS LA TIENNE, comme pour
   les rangs (« L'anneau seulement sur ton rang ») : la seule mesure est
   « plus que N jours avant la suivante ».
   ───────────────────────────────────────────────────────────────────── */

export type IdFlamme = "lueur" | "flamme" | "feu" | "brasier" | "sacre";

export type PalierFlamme = {
  id: IdFlamme;
  nom: string;
  /** Le nombre de jours d'affilée à partir duquel cette flamme brûle. */
  des: number;
  /** Le nom avec son article, pour une phrase : « le Brasier ». */
  le: string;
  /** « ta flamme est au Feu », « à la Flamme ». */
  au: string;
};

export const PALIERS_FLAMME: readonly PalierFlamme[] = [
  { id: "lueur", nom: "Lueur", des: 1, le: "la Lueur", au: "à la Lueur" },
  { id: "flamme", nom: "Flamme", des: 3, le: "la Flamme", au: "à la Flamme" },
  { id: "feu", nom: "Feu", des: 7, le: "le Feu", au: "au Feu" },
  { id: "brasier", nom: "Brasier", des: 30, le: "le Brasier", au: "au Brasier" },
  { id: "sacre", nom: "Feu sacré", des: 100, le: "le Feu sacré", au: "au Feu sacré" },
];

export type EtatFlamme = {
  palier: PalierFlamme;
  /** `null` au dernier palier. */
  suivant: PalierFlamme | null;
  /** Les jours avant la flamme suivante (0 au dernier palier). */
  restant: number;
  /** Vrai le jour même où cette flamme arrive (jamais pour la Lueur). */
  nouvelle: boolean;
};

/** La série commence à un jour : zéro ou moins compte comme le premier. */
function jourDeSerie(jours: number): number {
  return Number.isFinite(jours) ? Math.max(1, Math.floor(jours)) : 1;
}

export function palierFlamme(jours: number): PalierFlamme {
  const j = jourDeSerie(jours);
  let palier = PALIERS_FLAMME[0];
  for (const p of PALIERS_FLAMME) if (j >= p.des) palier = p;
  return palier;
}

export function etatFlamme(jours: number): EtatFlamme {
  const j = jourDeSerie(jours);
  const palier = palierFlamme(j);
  const suivant = PALIERS_FLAMME.find((p) => p.des > j) ?? null;
  return {
    palier,
    suivant,
    restant: suivant ? suivant.des - j : 0,
    nouvelle: palier.des > 1 && j === palier.des,
  };
}

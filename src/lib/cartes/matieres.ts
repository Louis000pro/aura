/* ─────────────────────────────────────────────────────────────────────
   LES MATIÈRES DES CARTES (Louis, 2026-11-06, maquette « Les cartes
   Vaiiya », GO du même jour).

   Six rangs, une matière et une couche du ciel chacun : de la terre aux
   étoiles. Les finitions viennent des cadrans de montre (soleillé, nacre,
   aventurine). Tout ce qui décrit une carte sans la dessiner vit ici :
   `faces.ts` la dessine, `catalogue.ts` dit quelles cartes existent, et ni
   l'un ni l'autre ne recopie une couleur.

   ⚠️ UNE CARTE NE PORTE AUCUN CHIFFRE DE JEU : ni attaque, ni vie (Louis :
   « TOTALEMENT hors sujet »).
   ⚠️ Ce fichier et `faces.ts` n'importent que par chemin relatif : la
   cuisson des vignettes (`npm run cartes`) les sert tels quels au navigateur.
   ───────────────────────────────────────────────────────────────────── */

import type { IdFlamme } from "@/lib/flammesSerie";

export const LARGEUR_FACE = 1024;
export const HAUTEUR_FACE = 1434;

/** Où vivent les images des cartes, dans `public/`. */
export const DOSSIER = "/cartes/";

export type Quatre = readonly [string, string, string, string];
export type Trois = readonly [string, string, string];
export type Finitions = readonly [number, number, number, number];

export type MatiereRang = {
  id: string;
  nom: string;
  n: number;
  m: Quatre;
  lueur: string;
  encre: string;
  /** Irisation, paillettes, soleillé, vivant. */
  f: Finitions;
  emG?: number;
  ir?: Trois;
  art: string;
  em: string;
  fini: string;
};

export const MATIERES_RANG: readonly MatiereRang[] = [
  { id: "bronze", nom: "Bronze", n: 1, m: ["#2B1208", "#94552A", "#E8A96C", "#FFF1DC"], lueur: "#FF9A50", encre: "#FBE8D3", f: [0, 0, 0.55, 0], art: `${DOSSIER}art-0.webp`, em: `${DOSSIER}em-bronze.webp`, fini: "Cuivre brossé" },
  { id: "argent", nom: "Argent", n: 2, m: ["#1C222C", "#7C8A9C", "#DCE4EE", "#FFFFFF"], lueur: "#C8D8F0", encre: "#F2F5F9", f: [0, 0.25, 0.8, 0], emG: 1.5, art: `${DOSSIER}art-1.webp`, em: `${DOSSIER}em-argent.webp`, fini: "Acier miroir" },
  { id: "or", nom: "Or", n: 3, m: ["#3A2404", "#B57A10", "#FFCF4E", "#FFF8D6"], lueur: "#FFC34A", encre: "#FFF3D6", f: [0, 0.35, 1, 0], art: `${DOSSIER}art-2.webp`, em: `${DOSSIER}em-or.webp`, fini: "Or frappé" },
  { id: "platine", nom: "Platine", n: 4, m: ["#1F2F33", "#7FA6A8", "#E2F3F0", "#FFFFFF"], lueur: "#BDF3E8", encre: "#EFFBF8", f: [0.5, 0.3, 0.7, 0], emG: 2.6, ir: ["#FFFFFF", "#BFEFE6", "#E9D6FF"], art: `${DOSSIER}art-3.webp`, em: `${DOSSIER}em-platine.webp`, fini: "Nacre" },
  { id: "diamant", nom: "Diamant", n: 5, m: ["#0E2A5C", "#5FA3E8", "#DCF1FF", "#FFFFFF"], lueur: "#8CCBFF", encre: "#EEF7FF", f: [0.85, 0.55, 0.5, 0], emG: 2.4, ir: ["#FFFFFF", "#7CC4FF", "#FFB6E4"], art: `${DOSSIER}art-4.webp`, em: `${DOSSIER}em-diamant.webp`, fini: "Prisme" },
  { id: "eternel", nom: "Éternel", n: 6, m: ["#2A1160", "#A67A2E", "#FFD878", "#FFF6E0"], lueur: "#C9A8FF", encre: "#FFF6E2", f: [0.7, 0.7, 0.35, 1], emG: 1.5, ir: ["#FFE08A", "#C9A8FF", "#FFF4DC"], art: `${DOSSIER}art-5.webp`, em: `${DOSSIER}em-eternel.webp`, fini: "Vivante" },
];

/** Les couleurs du logo : l'irisation des programmes. */
export const LOGO_IRIS: Trois = ["#BA80FA", "#F99FB0", "#FEC175"];

export const MATIERES_FLAMME: Record<IdFlamme, { n: number; m: Quatre }> = {
  lueur: { n: 1, m: ["#3A1206", "#B4481A", "#FF9E5A", "#FFE9D0"] },
  flamme: { n: 2, m: ["#3A1806", "#C8641A", "#FFB85A", "#FFF0D0"] },
  feu: { n: 3, m: ["#3F2206", "#D08A1E", "#FFD45A", "#FFF7D8"] },
  brasier: { n: 4, m: ["#44300A", "#D9A32A", "#FFE680", "#FFFBE6"] },
  sacre: { n: 5, m: ["#3A3020", "#CDB880", "#FFF3C4", "#FFFFFF"] },
};

export const MATIERE_DOS = { m: ["#2B1A52", "#A77C33", "#FFD98A", "#FFF8E6"] as Quatre, lueur: "#C9A8FF", encre: "#F4ECFF", f: [0, 0.22, 0.3, 0] as Finitions };
export const MATIERE_PROGRAMME = { m: ["#2A1160", "#8B5CF6", "#E9C8FF", "#FFF4E6"] as Quatre, lueur: "#BA80FA", encre: "#F6EEFF", f: [0.95, 0.14, 0.2, 0] as Finitions };
export const MATIERE_MOUVEMENT = { m: ["#22203A", "#6E6A92", "#C9C6E6", "#FFFFFF"] as Quatre, lueur: "#8B5CF6", encre: "#EDEAFB", f: [0, 0, 0, 0] as Finitions };
export const LUEUR_FLAMME = "#FF8A30";

export const MATIERES_RELAIS: Record<string, { m: Quatre; ir: Trois }> = {
  sillage: { m: ["#3A1806", "#C8741E", "#FFC870", "#FFF6E0"], ir: ["#FFD98A", "#FF9E6A", "#FFF0D0"] },
  aurore: { m: ["#0C3A3A", "#3FB6A8", "#BFF5E8", "#FFFFFF"], ir: ["#7CF0D8", "#7CA8FF", "#D8A8FF"] },
  brume: { m: ["#2A2410", "#B09A5A", "#F6E6B0", "#FFFBEA"], ir: ["#FFE9A8", "#C9B8FF", "#FFFFFF"] },
};

/** Ce qu'une face doit montrer. `faces.ts` le dessine, le catalogue le décide. */
export type FaceVoulue =
  | { genre: "rang"; rang: string; pseudo?: string; numero?: number | null; date?: string | null }
  | { genre: "flamme"; flamme: IdFlamme; jours: number; nom: string; pseudo?: string; date?: string | null }
  | { genre: "programme"; titre: string; duree: string; pose: string | null; pseudo?: string; date?: string | null }
  | { genre: "relais"; serie: string; nom: string; rang: string; duo?: string; date?: string | null }
  | { genre: "mouvement"; titre: string; muscles: string; numero: string; sprite: string; date?: string | null };

/** Le dos d'une carte : tous les chiffres qu'elle ne montre pas devant. */
export type FicheDos = {
  pseudo: string;
  ligne: string;
  faits: readonly (readonly [string | number, string])[];
  pied: string;
};

/** Une pochette scellée : le film sur le paysage de la carte. */
export type PochetteVoulue = {
  art: string;
  m: Quatre;
  lueur: string;
  encre: string;
  iris: number;
  ir?: Trois;
  /** Les étincelles sous le logo : le rang, pour une carte de rang. */
  etoiles: number;
};

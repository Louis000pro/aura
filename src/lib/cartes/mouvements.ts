/* ─────────────────────────────────────────────────────────────────────
   LE CARNET DES MOUVEMENTS, EN CARTES (maquette « Les cartes Vaiiya »).

   102 cartes mates, numérotées dans l'ordre de la bibliothèque : une
   carte s'allume quand le mouvement du jour l'a découverte, et elle joue
   son geste. À part du catalogue exprès : seule la collection en a besoin,
   et la bibliothèque d'exercices n'a rien à faire dans la vitrine du profil.

   ⚠️ LE CARNET NE FERME RIEN : les 102 mouvements restent ouverts dans la
   bibliothèque, il garde une trace de ce qui a été découvert ici.
   ⚠️ Il vit sur l'appareil (`lireCarnet`) : le suivre d'un appareil à
   l'autre demande une petite table, pas encore posée.
   ───────────────────────────────────────────────────────────────────── */

import { EXERCISE_LIBRARY, type LibExercise } from "@/lib/exerciseLibrary";
import { frameSrc, pickGenre, resolveGuide } from "@/lib/exerciseGuides";
import { MATIERE_MOUVEMENT } from "./matieres";
import type { CarteDef } from "./catalogue";

/** « DÉVELOPPÉ\nCOUCHÉ » : un nom long se coupe au milieu, jamais dans un mot. */
export function titreMouvement(nom: string): string {
  const t = nom.toUpperCase();
  if (t.length <= 13 || !t.includes(" ")) return t;
  const milieu = t.length / 2;
  let coupe = -1;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === " " && (coupe < 0 || Math.abs(i - milieu) < Math.abs(coupe - milieu))) coupe = i;
  }
  return `${t.slice(0, coupe)}\n${t.slice(coupe + 1)}`;
}

export function carteMouvement(m: LibExercise, place: number, gagnee: boolean): CarteDef {
  const total = EXERCISE_LIBRARY.length;
  const guide = resolveGuide(m.name);
  const genre = guide ? pickGenre(guide) : null;
  const poses = guide && genre ? Array.from({ length: guide.frames }, (_, i) => frameSrc(guide, genre, i)) : [];
  const muscles = m.muscles.slice(0, 2).join(", ");
  return {
    id: `mv-${place}`,
    famille: "mouvements",
    nom: m.name,
    lueur: MATIERE_MOUVEMENT.lueur,
    gagnee,
    place,
    surTotal: total,
    vignette: null,
    face: { genre: "mouvement", titre: titreMouvement(m.name), muscles, numero: `${place}/${total}`, sprite: poses[0] ?? "", date: null },
    fiche: { pseudo: m.name, ligne: muscles, faits: [[place, `sur ${total}`]], pied: "Mouvement découvert" },
    pochette: null,
    vignettePochette: null,
    poses: poses.length > 1 ? poses : undefined,
    titre: m.name,
    sous: "Un mouvement découvert",
    dit: `Carte ${m.name}, ${place} sur ${total}`,
    jour: null,
    etiquette: [m.name.toUpperCase(), `${place}/${total}`],
  };
}

/** Le carnet : les 102 cartes, celles découvertes allumées. */
export function cartesMouvements(carnet: readonly string[]): CarteDef[] {
  const vus = new Set(carnet);
  return EXERCISE_LIBRARY.map((m, i) => carteMouvement(m, i + 1, vus.has(m.name)));
}


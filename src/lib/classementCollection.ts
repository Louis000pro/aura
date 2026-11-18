import { mouvements, raretes, type Carte } from "./cartesBooster";
import { POINTS_RARETE, type Collectionneur } from "./collectionBoosters";

type Profil = { id: string; pseudo: string | null; avatar_url: string | null };

/** Une seule entrée par mouvement et rareté, quel que soit le nombre de doublons. */
export function ajouterCartes(collection: Set<string>, cartes: unknown): void {
  if (!Array.isArray(cartes)) return;
  for (const carte of cartes) {
    if (!carte || typeof carte !== "object") continue;
    if (Object.hasOwn(mouvements, carte.exercice) && Object.hasOwn(raretes, carte.rarete)) {
      collection.add(carte.exercice + ":" + carte.rarete);
    }
  }
}

export function classerCollections(profils: Profil[], collections: Map<string, Set<string>>, moi: string): Collectionneur[] {
  const liste = profils.map(p => {
    const ligne: Collectionneur = { user_id: p.id, pseudo: p.pseudo, avatar_url: p.avatar_url,
      points: 0, cartes: 0, commune: 0, rare: 0, epique: 0, legendaire: 0, chromatique: 0, rang: 0, moi: p.id === moi };
    for (const cle of collections.get(p.id) ?? []) {
      const rarete = cle.split(":")[1] as Carte["rarete"];
      ligne.points += POINTS_RARETE[rarete];
      ligne[rarete]++;
      ligne.cartes++;
    }
    return ligne;
  }).sort((a, b) => b.points - a.points || b.cartes - a.cartes ||
    (a.pseudo ?? "").localeCompare(b.pseudo ?? "", "fr") || a.user_id.localeCompare(b.user_id));
  liste.forEach((ligne, index) => {
    const avant = liste[index - 1];
    ligne.rang = avant && avant.points === ligne.points && avant.cartes === ligne.cartes ? avant.rang : index + 1;
  });
  return liste;
}

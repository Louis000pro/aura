/* ─────────────────────────────────────────────────────────────────────
   CE QUE LES CARTES GARDENT SUR L'APPAREIL.

   Les pochettes pas encore ouvertes, la plus haute flamme vue, et une copie
   de la vitrine choisie.

   ⚠️ UNE POCHETTE QU'ON N'A PAS OUVERTE ATTEND. « Continuer » pendant une
   scène ne fait rien perdre : elle reste scellée dans la collection. Sur
   un autre appareil, la carte est simplement là, ouverte.
   ⚠️ UNE FLAMME GAGNÉE NE SE PERD PAS. La série se casse, le record de la
   base ne compte que les journées actives : c'est ce repère-ci qui se
   souvient d'une flamme tenue par les seules connexions, avec son jour.
   ───────────────────────────────────────────────────────────────────── */

import { PALIERS_FLAMME, type IdFlamme } from "@/lib/flammesSerie";

export const EVT_POCHETTES = "vaiiya:pochettes";

/** Ouvre la collection quand on est déjà sur le profil. */
export const EVT_COLLECTION = "vaiiya:ouvrir-collection";

/** Une vue qui se ferme rend sa place par `history.back()`, qui est
 *  asynchrone : une navigation ou une vue ouverte tout de suite serait
 *  annulée par ce retour. On attend le `popstate`, avec un délai de secours
 *  si aucune vue n'avait de place à rendre. */
export function apresRetour(fn: () => void) {
  let fait = false;
  const une = () => {
    if (fait) return;
    fait = true;
    window.removeEventListener("popstate", une);
    fn();
  };
  window.addEventListener("popstate", une);
  window.setTimeout(une, 400);
}

/** « Voir ma collection », depuis n'importe où, une fois la vue refermée. */
export function versCollection(aller: (url: string) => void) {
  apresRetour(() => {
    if (window.location.pathname === "/profil") window.dispatchEvent(new Event(EVT_COLLECTION));
    else aller("/profil?ouvrir=collection");
  });
}

const clePochettes = (u: string) => `vaiiya_pochettes_${u}`;
const cleFlammes = (u: string) => `vaiiya_flammes_${u}`;

/** Le carnet des mouvements, sur l'appareil. La clé vit ici pour que le
 *  profil compte le carnet sans charger la bibliothèque d'exercices. */
export const cleCarnet = (u: string) => `vaiiya_carnet_mouvements_${u}`;

function tailleCarnet(userId: string): number {
  try {
    const v = JSON.parse(localStorage.getItem(cleCarnet(userId)) ?? "[]") as unknown;
    return Array.isArray(v) ? v.length : 0;
  } catch {
    return 0;
  }
}

const cleVitrine = (u: string) => `vaiiya_vitrine_${u}`;

function lireVitrineAppareil(userId: string): string[] | null {
  try {
    const v = JSON.parse(localStorage.getItem(cleVitrine(userId)) ?? "null") as unknown;
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : null;
  } catch {
    return null;
  }
}

/** La dernière vitrine lue en base. Elle pose les bonnes cartes dès l'ouverture
 *  du profil : sans elle, celles de Vaiiya s'affichent puis changent sous les
 *  yeux. La base reste l'autorité. */
export function noterVitrine(userId: string, choix: readonly string[] | null) {
  try {
    if (choix) localStorage.setItem(cleVitrine(userId), JSON.stringify(choix));
    else localStorage.removeItem(cleVitrine(userId));
    window.dispatchEvent(new Event(EVT_POCHETTES));
  } catch { /* Stockage refusé : la vitrine arrive avec la lecture. */ }
}

/** Tout ce que l'appareil garde, en une chaîne stable pour `useSyncExternalStore`. */
export function instantaneAppareil(userId: string): string {
  return JSON.stringify({
    attente: lirePochettes(userId).attente,
    flammes: lireFlammes(userId),
    carnet: tailleCarnet(userId),
    vitrine: lireVitrineAppareil(userId),
  });
}

type Pochettes = { attente: string[]; ouvertes: string[] };

export function lirePochettes(userId: string): Pochettes {
  try {
    const v = JSON.parse(localStorage.getItem(clePochettes(userId)) ?? "null") as Partial<Pochettes> | null;
    return {
      attente: Array.isArray(v?.attente) ? v.attente.filter((x) => typeof x === "string") : [],
      ouvertes: Array.isArray(v?.ouvertes) ? v.ouvertes.filter((x) => typeof x === "string") : [],
    };
  } catch {
    return { attente: [], ouvertes: [] };
  }
}

function ecrire(userId: string, p: Pochettes) {
  try {
    localStorage.setItem(clePochettes(userId), JSON.stringify(p));
    window.dispatchEvent(new Event(EVT_POCHETTES));
  } catch { /* Stockage refusé : la carte reste dans la collection, ouverte. */ }
}

/** Une carte vient d'être gagnée : sa pochette attend, une seule fois. */
export function deposerPochette(userId: string, id: string) {
  const p = lirePochettes(userId);
  if (p.attente.includes(id) || p.ouvertes.includes(id)) return;
  ecrire(userId, { ...p, attente: [...p.attente, id] });
}

export function marquerOuverte(userId: string, id: string) {
  const p = lirePochettes(userId);
  if (p.ouvertes.includes(id) && !p.attente.includes(id)) return;
  ecrire(userId, { attente: p.attente.filter((x) => x !== id), ouvertes: [...new Set([...p.ouvertes, id])] });
}

export type FlammesVues = { max: number; dates: Partial<Record<IdFlamme, string>> };

export function lireFlammes(userId: string): FlammesVues {
  try {
    const v = JSON.parse(localStorage.getItem(cleFlammes(userId)) ?? "null") as Partial<FlammesVues> | null;
    return { max: typeof v?.max === "number" ? v.max : 0, dates: v?.dates && typeof v.dates === "object" ? v.dates : {} };
  } catch {
    return { max: 0, dates: {} };
  }
}

/** La série du moment : un palier nouveau note son jour. */
export function noterFlamme(userId: string, jours: number) {
  if (!userId || !Number.isFinite(jours) || jours < 1) return;
  const vu = lireFlammes(userId);
  const nouvelles = PALIERS_FLAMME.filter((p) => jours >= p.des && !vu.dates[p.id]);
  if (jours <= vu.max && nouvelles.length === 0) return;
  const jour = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
  const dates = { ...vu.dates };
  for (const p of nouvelles) dates[p.id] = jour;
  try {
    localStorage.setItem(cleFlammes(userId), JSON.stringify({ max: Math.max(vu.max, jours), dates }));
  } catch { /* Stockage refusé : la flamme de l'accueil, elle, reste juste. */ }
}

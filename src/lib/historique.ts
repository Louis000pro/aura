/**
 * historique.ts — ce que l'écran MONTRE du passé, selon l'offre.
 *
 * Un compte gratuit voit les `PLANS.free.limits.historiqueJours` derniers
 * jours (7), aujourd'hui compris. ⚠️ C'EST UN MASQUAGE, JAMAIS UN EFFACEMENT,
 * et les conditions (article 3) le promettent :
 *   - rien n'est supprimé ni filtré en base ;
 *   - la série, les badges et les rangs se calculent toujours sur TOUT
 *     l'historique (ils vivent côté serveur, ce module ne les touche pas) ;
 *   - Vaiiya+ rend tout le passé visible d'un coup.
 * On ne filtre donc qu'à l'AFFICHAGE, et un jour masqué ne se présente jamais
 * comme un jour vide : l'écran dit qu'il est conservé (`HistoriqueMasque`).
 *
 * Une seule règle pour tous les écrans : deux fenêtres calculées à deux
 * endroits finiraient par ne pas montrer les mêmes jours.
 */
import { PLANS } from "./plans";

/** Accès à tout l'historique : un abonné, ou un admin (il teste). */
export function historiqueComplet(u: { is_premium?: boolean; is_admin?: boolean } | null | undefined): boolean {
  return !!(u?.is_premium || u?.is_admin);
}

/** YYYY-MM-DD en heure LOCALE (les colonnes `date` sont écrites en local). */
function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Premier jour visible (inclus), ou `null` quand tout est visible.
 * `ref` est injectable pour le banc : la fenêtre glisse avec le jour.
 */
export function debutHistorique(complet: boolean, ref: Date = new Date()): string | null {
  if (complet) return null;
  const jours = PLANS.free.limits.historiqueJours;
  if (!Number.isFinite(jours)) return null;
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  d.setDate(d.getDate() - (jours - 1));
  return ymdLocal(d);
}

/**
 * Un jour (YYYY-MM-DD) ou un horodatage ISO est-il visible ?
 * Un horodatage se ramène à son jour LOCAL avant la comparaison : une
 * séance faite à 23 h en France ne doit pas changer de jour par l'UTC.
 */
export function estVisible(dateOuIso: string, debut: string | null): boolean {
  if (!debut) return true;
  const jour = dateOuIso.length > 10 ? ymdLocal(new Date(dateOuIso)) : dateOuIso;
  return jour >= debut;
}

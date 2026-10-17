import { createClient } from "@/lib/supabase";

/* ════════════════════════════════════════════════════════════════════
   LE CONSENTEMENT AUX DONNÉES DE SANTÉ (RGPD art. 9, audit du 2026-10-17)

   Poids, taille, alimentation et ce qu'on dit de sa santé au Guide sont
   des données de santé : les traiter demande un accord EXPLICITE, donné
   par un geste distinct (une case non cochée d'avance), et dont on garde
   la preuve. Accepter les conditions générales ne suffit pas.

   La preuve vit dans les métadonnées du compte Supabase Auth (comme
   `premier_accueil_vu`) : date et version du texte accepté, sans
   migration. Changer le texte de la case = monter `VERSION_CONSENTEMENT`.
   ════════════════════════════════════════════════════════════════════ */

export const VERSION_CONSENTEMENT = "2026-10-17";

/** Âge en dessous duquel on ne peut pas créer de profil seul : en France,
 *  un mineur de moins de 15 ans ne peut pas consentir seul au traitement
 *  de ses données (loi Informatique et Libertés, art. 45). */
export const AGE_MINIMUM = 15;

export type Consentement = { le: string; version: string };

export async function lireConsentement(): Promise<Consentement | null> {
  try {
    const { data } = await createClient().auth.getUser();
    const c = data.user?.user_metadata?.consentement_sante as Consentement | undefined;
    return c && c.le ? c : null;
  } catch {
    return null;
  }
}

export async function enregistrerConsentement(): Promise<boolean> {
  try {
    const { error } = await createClient().auth.updateUser({
      data: { consentement_sante: { le: new Date().toISOString(), version: VERSION_CONSENTEMENT } },
    });
    return !error;
  } catch {
    return false;
  }
}

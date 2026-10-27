/* ════════════════════════════════════════════════════════════════════
   notificationPrefs.ts : CE QUE VAIIYA A LE DROIT D'ENVOYER

   Source unique des cinq familles de notification. Ajouter une famille
   se fait ICI (et nulle part ailleurs) : une valeur dans `CategorieNotif`
   et une colonne dans la table. L'écran qui règle chaque famille n'existe
   pas encore (les Paramètres n'ont qu'un interrupteur pour tout) ; les
   textes écrits pour lui sont dans le commit 0cc0fc14.

   Le contrôle vit dans `sendPushToUser` (porte unique, comme `exigerAdmin`
   pour l'administration et `garderIA` pour les routes IA). La catégorie y
   est un paramètre OBLIGATOIRE : le compilateur refuse un envoi qui ne dit
   pas de quelle famille il relève, donc on ne peut pas ajouter un push qui
   échappe silencieusement aux réglages de l'utilisateur.
   ════════════════════════════════════════════════════════════════════ */

import type { SupabaseClient } from "@supabase/supabase-js";

export type CategorieNotif = "rappel" | "message" | "ami" | "relais" | "maj";

export type Preferences = Record<CategorieNotif, boolean>;

/** Tout est allumé au départ : on n'a rien à cacher, et rien n'est intrusif. */
export const PAR_DEFAUT: Preferences = {
  rappel:  true,
  message: true,
  ami:     true,
  relais:  true,
  maj:     true,
};

type Ligne = Partial<Record<CategorieNotif, boolean>> & { user_id?: string };

function depuisLigne(ligne: Ligne | null | undefined): Preferences {
  if (!ligne) return { ...PAR_DEFAUT };
  return {
    rappel:  ligne.rappel  ?? true,
    message: ligne.message ?? true,
    ami:     ligne.ami     ?? true,
    relais:  ligne.relais  ?? true,
    maj:     ligne.maj     ?? true,
  };
}

/**
 * Préférences d'un compte. Une absence de ligne vaut « tout allumé » : on
 * n'écrit rien tant que la personne n'a rien changé, donc la table ne
 * contient que les choix réels.
 *
 * ⚠️ Tant que la migration n'est pas collée, la table n'existe pas : on rend
 * les valeurs par défaut au lieu de faire échouer l'envoi. Un réglage
 * manquant ne doit jamais priver quelqu'un de ses messages.
 */
export async function preferencesDe(
  client: SupabaseClient,
  userId: string,
): Promise<Preferences> {
  const { data, error } = await client
    .from("notification_prefs")
    .select("rappel, message, ami, relais, maj")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { ...PAR_DEFAUT };
  return depuisLigne(data as Ligne | null);
}

/** Même chose pour un lot de comptes : une requête, pas N (leçon /api/admin/stats). */
export async function preferencesDeLot(
  client: SupabaseClient,
  userIds: string[],
): Promise<Map<string, Preferences>> {
  const carte = new Map<string, Preferences>();
  for (const id of userIds) carte.set(id, { ...PAR_DEFAUT });
  if (!userIds.length) return carte;

  const { data, error } = await client
    .from("notification_prefs")
    .select("user_id, rappel, message, ami, relais, maj")
    .in("user_id", userIds);

  if (error || !data) return carte;
  for (const ligne of data as Ligne[]) {
    if (ligne.user_id) carte.set(ligne.user_id, depuisLigne(ligne));
  }
  return carte;
}

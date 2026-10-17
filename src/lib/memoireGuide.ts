import { createClient } from "@/lib/supabase";

/* ════════════════════════════════════════════════════════════════════
   LA MÉMOIRE DU GUIDE SE COUPE (audit du 2026-10-17).

   Le Guide retient d'une conversation à l'autre ce qu'on lui dit, santé
   comprise : c'est un traitement de données de santé, et il doit pouvoir
   s'arrêter. Coupée, la mémoire n'apprend plus rien et n'est plus envoyée
   au modèle ; ce qui était retenu reste visible et effaçable.

   Le réglage vit dans les métadonnées du compte : il suit la personne sur
   tous ses appareils, et `getSession()` le lit sans aller sur le réseau.
   Absent = activée (c'était le comportement de toujours).
   ════════════════════════════════════════════════════════════════════ */

export async function memoireActive(): Promise<boolean> {
  try {
    const { data } = await createClient().auth.getSession();
    return data.session?.user?.user_metadata?.memoire_guide_coupee !== true;
  } catch {
    return true;
  }
}

export async function reglerMemoire(active: boolean): Promise<boolean> {
  try {
    const { error } = await createClient().auth.updateUser({ data: { memoire_guide_coupee: !active } });
    return !error;
  } catch {
    return false;
  }
}

import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { STATUTS_ACTIFS } from "@/lib/stripeSync";

/**
 * Supprimer un compte, pour de vrai (audit du 2026-10-17).
 *
 * `auth.admin.deleteUser` ne suffit pas, et chacun des trous était réel :
 *  · un abonné continuait d'être prélevé par Stripe ;
 *  · `weight_logs` et `notifications` n'ont pas de clé étrangère en
 *    cascade : des pesées (données de santé) survivaient au compte ;
 *  · les fichiers du Storage (photo de profil, photos de conversation)
 *    n'étaient jamais retirés ;
 *  · `messages.user_id` est en SET NULL : le texte restait dans le fil,
 *    alors que la politique de confidentialité promet de l'effacer.
 *
 * L'ordre compte : on arrête d'abord l'argent, puis on efface ce qui ne
 * partirait pas tout seul, et le compte en dernier (sa cascade emporte le
 * reste). Une étape secondaire ratée est journalisée mais ne bloque pas la
 * suppression ; seul l'échec de Stripe l'arrête, parce que supprimer un
 * compte qu'on continue de facturer serait le pire résultat possible.
 */
export async function supprimerCompte(
  admin: SupabaseClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; raison: string }> {
  // 1. L'abonnement, avant tout le reste.
  const { data: profil } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();
  const client = (profil as { stripe_customer_id?: string | null } | null)?.stripe_customer_id;
  if (client) {
    const secret = process.env.STRIPE_SECRET_KEY ?? "";
    if (!secret) return { ok: false, raison: "stripe_indisponible" };
    try {
      const stripe = new Stripe(secret);
      const liste = await stripe.subscriptions.list({ customer: client, status: "all", limit: 20 });
      for (const sub of liste.data) {
        if (STATUTS_ACTIFS.includes(sub.status) || sub.status === "incomplete" || sub.status === "unpaid") {
          await stripe.subscriptions.cancel(sub.id);
        }
      }
    } catch (e) {
      console.error("[suppression] Stripe :", e instanceof Error ? e.message : e);
      return { ok: false, raison: "stripe" };
    }
  }

  // 2. Les fichiers. Les photos de conversation se retrouvent par leurs
  //    messages, la photo de profil par le dossier du compte.
  try {
    const { data: medias } = await admin
      .from("messages")
      .select("media_path")
      .eq("user_id", userId)
      .not("media_path", "is", null);
    const chemins = (medias ?? []).map((m) => (m as { media_path: string }).media_path).filter(Boolean);
    for (let i = 0; i < chemins.length; i += 100) {
      await admin.storage.from("conversation-media").remove(chemins.slice(i, i + 100));
    }

    const avatars: string[] = [];
    for (const dossier of [userId, `${userId}/groupes`]) {
      const { data } = await admin.storage.from("avatars").list(dossier, { limit: 1000 });
      for (const f of data ?? []) if (f.id) avatars.push(`${dossier}/${f.name}`);
    }
    if (avatars.length) await admin.storage.from("avatars").remove(avatars);
  } catch (e) {
    console.warn("[suppression] fichiers :", e instanceof Error ? e.message : e);
  }

  // 3. Ce que la cascade n'emporte pas.
  const effacements = await Promise.all([
    admin.from("messages").delete().eq("user_id", userId),
    admin.from("weight_logs").delete().eq("user_id", userId),
    admin.from("notifications").delete().eq("user_id", userId),
    admin.from("notifications").delete().eq("from_user_id", userId),
  ]);
  for (const r of effacements) {
    if (r.error) console.warn("[suppression] effacement :", r.error.message);
  }

  // 4. Le compte, dont la cascade emporte le profil et le reste.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, raison: error.message };
  return { ok: true };
}

/**
 * sendPushToUser : LA PORTE UNIQUE de toutes les notifications push d'événement.
 *
 * `categorie` est OBLIGATOIRE : c'est ce qui rend le réglage de l'utilisateur
 * impossible à contourner par oubli. Un nouvel envoi ne compile pas tant qu'il
 * n'a pas dit de quelle famille il relève, donc il ne peut pas passer à côté
 * du contrôle. Même raisonnement que `exigerAdmin` et `garderIA` : le contrôle
 * ne se recopie pas, il se traverse.
 *
 * (Le rappel du soir ne passe pas par ici : le cron parle à web-push
 * directement pour n'ouvrir qu'une fois la liste des abonnements. Il fait
 * sa propre lecture des préférences, avec le même module.)
 */

import { createAdminClient } from "@/lib/supabase-admin";
import { preferencesDe, type CategorieNotif } from "@/lib/notificationPrefs";

export async function sendPushToUser(params: {
  user_id: string;
  categorie: CategorieNotif;
  title: string;
  body: string;
  url?: string;
  icon?: string;
}): Promise<void> {
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!serviceKey) return;

  try {
    const prefs = await preferencesDe(createAdminClient(), params.user_id);
    if (!prefs[params.categorie]) return;

    // La catégorie sert au filtrage ici et ne descend pas dans le payload :
    // elle ne regarde pas l'appareil, seulement la décision d'envoyer.
    const charge = {
      user_id: params.user_id,
      title:   params.title,
      body:    params.body,
      url:     params.url,
      icon:    params.icon,
    };

    await fetch(`${appUrl}/api/notifications/push`, {
      method:  "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(charge),
    });
  } catch {
    // Push is fire-and-forget — never break the calling route
  }
}

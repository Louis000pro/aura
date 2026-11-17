/**
 * pushServeur.ts — envoyer un push à tous les appareils d'un compte (côté serveur).
 * Retire au passage les abonnements morts (410 / 404).
 */
import webpush from "web-push";
import type { createAdminClient } from "./supabase-admin";

type Admin = ReturnType<typeof createAdminClient>;
export type MessagePush = { title: string; body: string; url?: string; icon?: string };

let pret = false;
function preparer(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const priv = process.env.VAPID_PRIVATE_KEY ?? "";
  if (!pub || !priv) return false;
  if (!pret) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:contact@aura.app", pub, priv);
    pret = true;
  }
  return true;
}

/** Le visage du Guide pour l'icône, sinon celle de Vaiiya. */
export function iconeGuide(guide: string | null | undefined): string {
  return guide === "nora" || guide === "sasha" ? `/guides/push/${guide}-v1.png` : "/icons/icon-192.png";
}

export async function pousserA(admin: Admin, userId: string, msg: MessagePush): Promise<number> {
  if (!preparer()) throw new Error("VAPID non configuré");
  const { data: subs } = await admin.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", userId);
  if (!subs?.length) return 0;
  const payload = JSON.stringify({ title: msg.title, body: msg.body, url: msg.url ?? "/", icon: msg.icon ?? "/icons/icon-192.png" });
  const res = await Promise.allSettled(subs.map(s =>
    webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
      .catch(async (err: { statusCode?: number }) => {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await admin.from("push_subscriptions").delete().match({ endpoint: s.endpoint });
        }
        throw err;
      })));
  return res.filter(r => r.status === "fulfilled").length;
}

/** Le Guide d'un compte, sans casser si la colonne n'existe pas. */
export async function guideDe(admin: Admin, userId: string): Promise<string | null> {
  const { data, error } = await admin.from("profiles").select("guide_id").eq("id", userId).maybeSingle();
  if (error) return null;
  return (data as { guide_id?: string | null } | null)?.guide_id ?? null;
}

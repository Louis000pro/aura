import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { createAdminClient } from "./supabase-admin";
type Admin = ReturnType<typeof createAdminClient>;
export type SuiviPush = { id: string; token: string };
export const empreintePush = (token: string) => createHash("sha256").update(token).digest("hex");

/** Le suivi ne doit jamais empêcher un envoi si sa table n'est pas encore activée. */
export async function debutPush(admin: Admin, userId: string, titre: string, categorie: string, appareils: number): Promise<SuiviPush | null> {
  const suivi = { id: randomUUID(), token: randomBytes(32).toString("hex") };
  try {
    const { error } = await admin.from("journal_push").insert({ id: suivi.id, user_id: userId,
      titre: titre.slice(0, 200), categorie: categorie.slice(0, 40), appareils, token_hash: empreintePush(suivi.token) });
    return error ? null : suivi;
  } catch { return null; }
}

export async function finPush(admin: Admin, suivi: SuiviPush | null, resultats: PromiseSettledResult<unknown>[]): Promise<void> {
  if (!suivi) return;
  const acceptes = resultats.filter(r => r.status === "fulfilled").length;
  const echecs = resultats.length - acceptes;
  const codes = [...new Set(resultats.flatMap(r => r.status === "rejected" && Number.isInteger(r.reason?.statusCode) ? [r.reason.statusCode as number] : []))];
  try {
    await admin.from("journal_push").update({ termine_le: new Date().toISOString(), acceptes, echecs, codes_erreur: codes,
      statut: !resultats.length ? "sans_appareil" : !acceptes ? "echec" : echecs ? "partiel" : "accepte" }).eq("id", suivi.id);
  } catch { /* un journal indisponible ne doit pas faire rejouer un push */ }
}

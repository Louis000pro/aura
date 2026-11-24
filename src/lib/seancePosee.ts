import { lireIntention, saveDay } from "@/lib/planning";
import type { ResultatGeste } from "@/lib/semaineGestes";

/** Déplace une séance posée hors programme. Relue avant d'écrire : partie
 *  ailleurs, faite ou devenue une réservation, rien ne s'écrit. */
export async function deplacerSeancePosee(userId: string, id: string, de: string, vers: string): Promise<ResultatGeste> {
  try {
    const d = await lireIntention(userId, id);
    if (!d || d.date !== de || d.status !== "planned" || d.etapeId) return { ok: false, raison: "changee" };
    await saveDay(userId, { ...d, date: vers }, "utilisateur");
    return { ok: true };
  } catch (e) {
    console.error("[semaine] déplacer la séance posée :", e);
    return { ok: false, raison: "echec" };
  }
}

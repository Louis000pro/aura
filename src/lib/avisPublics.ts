/* ════════════════════════════════════════════════════════════════════
   Lecture SERVEUR des avis publics (approuvés).

   ⚠️ Serveur uniquement : ce module importe le client admin (clé service_role).
   Il ne doit JAMAIS être importé depuis un composant client. La landing en
   reçoit le RÉSULTAT en props (voir `app/page.tsx`), pas le module.

   On lit avec le client admin en filtrant explicitement `statut = 'approuve'` :
   la lecture est fiable quel que soit l'état de la RLS, et rien d'autre que des
   avis approuvés ne sort. Le pseudo et l'avatar se joignent depuis `profiles`,
   comme partout ailleurs, pour ne jamais figer une identité.
   ════════════════════════════════════════════════════════════════════ */
import { createAdminClient } from "@/lib/supabase-admin";
import type { AvisPublic, ResumeAvis } from "@/lib/avisTypes";

type Ligne = { id: string; user_id: string; note: number; texte: string; created_at: string };

async function joindre(admin: ReturnType<typeof createAdminClient>, lignes: Ligne[]): Promise<AvisPublic[]> {
  if (lignes.length === 0) return [];
  const ids = Array.from(new Set(lignes.map((l) => l.user_id)));
  const { data: profs } = await admin
    .from("profiles").select("id, pseudo, avatar_url").in("id", ids);
  const parId = new Map<string, { pseudo?: string; avatar_url?: string | null }>();
  (profs ?? []).forEach((p: { id: string; pseudo?: string; avatar_url?: string | null }) => parId.set(p.id, p));
  return lignes.map((l) => ({
    id: l.id,
    note: l.note,
    texte: l.texte,
    created_at: l.created_at,
    pseudo: parId.get(l.user_id)?.pseudo ?? "Membre",
    avatar_url: parId.get(l.user_id)?.avatar_url ?? null,
  }));
}

/** Tous les avis approuvés, du plus récent au plus ancien. Pour la page /avis. */
export async function listerAvisApprouves(): Promise<AvisPublic[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("avis")
      .select("id, user_id, note, texte, created_at")
      .eq("statut", "approuve")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error || !data) return [];
    return joindre(admin, data as Ligne[]);
  } catch {
    return [];
  }
}

/** Le résumé pour la page d'accueil : total, moyenne, et jusqu'à 3 avis en aperçu. */
export async function resumeAvisPublics(): Promise<ResumeAvis> {
  const vide: ResumeAvis = { total: 0, moyenne: 0, apercu: [] };
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("avis")
      .select("id, user_id, note, texte, created_at")
      .eq("statut", "approuve")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error || !data || data.length === 0) return vide;

    const lignes = data as Ligne[];
    const total = lignes.length;
    const moyenne = lignes.reduce((s, l) => s + l.note, 0) / total;

    // Pour l'aperçu, on privilégie les avis qui portent un texte : une carte
    // vide sur la page d'accueil ne prouve rien. On complète avec les autres.
    const avecTexte = lignes.filter((l) => l.texte.trim().length > 0);
    const choisis = [...avecTexte, ...lignes.filter((l) => l.texte.trim().length === 0)].slice(0, 3);

    return { total, moyenne, apercu: await joindre(admin, choisis) };
  } catch {
    return vide;
  }
}

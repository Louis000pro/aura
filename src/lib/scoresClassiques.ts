/* ════════════════════════════════════════════════════════════════════
   LES SCORES DES CLASSIQUES, LUS EN BASE.

   Un score vit avec sa séance, dans `workout_sessions.score` (journal
   immuable, RLS propriétaire) : on lit les siens, jamais ceux d'un autre.

   ⚠️ `null` VEUT DIRE « JE NE SAIS PAS », jamais « aucun score » : la base
   n'a pas répondu, ou la colonne n'existe pas encore (tant que
   `20261101_score_classiques.sql` n'est pas collé). L'écran ne dit alors
   ni « ton meilleur » ni « premier essai ».
   ════════════════════════════════════════════════════════════════════ */
import { createClient } from "@/lib/supabase";
import type { ScoreClassique, ScoreDate } from "@/lib/classiques";

function enScore(score: unknown, quand: unknown): ScoreDate | null {
  const s = score as Partial<ScoreClassique> | null;
  if (!s || typeof s !== "object" || typeof s.valeur !== "number" || typeof s.classique !== "string" || typeof quand !== "string") return null;
  return {
    v: 1, classique: s.classique, sorte: s.sorte as ScoreClassique["sorte"], valeur: s.valeur,
    ...(typeof s.tours === "number" ? { tours: s.tours } : {}),
    ...(typeof s.reste === "number" ? { reste: s.reste } : {}),
    passages: Array.isArray(s.passages) ? s.passages.filter((p): p is number => typeof p === "number") : [],
    quand,
  };
}

/** Tes scores sur un classique (ou sur tous), du plus ancien au plus récent. */
export async function lireScores(userId: string, classique?: string): Promise<ScoreDate[] | null> {
  const supabase = createClient();
  let req = supabase
    .from("workout_sessions")
    .select("started_at, score")
    .eq("user_id", userId)
    .not("score", "is", null)
    .order("started_at", { ascending: true })
    .limit(400);
  if (classique) req = req.eq("score->>classique", classique);
  const { data, error } = await req;
  if (error) return null;
  return (data ?? []).flatMap((r) => {
    const s = enScore((r as { score: unknown }).score, (r as { started_at: unknown }).started_at);
    return s ? [s] : [];
  });
}

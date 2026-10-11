import { createClient } from "@/lib/supabase";
import { PLANS } from "@/lib/plans";
import { ACCENT_BY_CATEGORY, CATEGORY_LABEL, ICON_NAME_BY_CATEGORY, normalizeCategory, normalizeDifficulty, seanceToRow, type ProposedSeance } from "@/lib/assistantActions";
import type { SeanceAReprendre } from "@/lib/seanceInterrompue";

export function propositionAGarder(s: Pick<SeanceAReprendre, "title" | "duration" | "difficulty" | "category" | "exerciseList">): ProposedSeance {
  const category = normalizeCategory(s.category);
  return {
    id: `custom-${crypto.randomUUID()}`, title: s.title, subtitle: `${CATEGORY_LABEL[category]} · Ma séance`,
    category, difficulty: normalizeDifficulty(s.difficulty), duration: s.duration,
    exercisesCount: s.exerciseList.length, muscles: [...new Set(s.exerciseList.flatMap((e) => e.muscles))],
    accent: ACCENT_BY_CATEGORY[category], icon: ICON_NAME_BY_CATEGORY[category],
    exerciseList: s.exerciseList as ProposedSeance["exerciseList"],
  };
}

/** Reconstruit l'action d'une impro après reload, sans stocker son callback. */
export async function garderSeanceReprise(user: { id: string; is_premium?: boolean; is_admin?: boolean }, seance: SeanceAReprendre): Promise<boolean> {
  const g = seance.aGarder;
  if (!g) return false;
  const client = createClient();
  const { data: existante, error: lecture } = await client.from("custom_sessions").select("id").eq("id", g.id).eq("user_id", user.id).maybeSingle();
  if (lecture) return false;
  if (existante) return true;
  if (!user.is_premium && !user.is_admin) {
    const { count, error } = await client.from("custom_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if (error || count === null || count >= PLANS.free.limits.sessionsMax) return false;
  }
  const { error } = await client.from("custom_sessions").insert(seanceToRow({
    ...g,
    // Le contenu restauré est celui joué, jamais une seconde liste périmée.
    exerciseList: seance.exerciseList as typeof g.exerciseList,
    exercisesCount: seance.exerciseList.length,
  }, user.id));
  let gardee = !error;
  if (error?.code === "23505") {
    const { data, error: verification } = await client.from("custom_sessions").select("id").eq("id", g.id).eq("user_id", user.id).maybeSingle();
    gardee = !verification && !!data;
  }
  if (gardee) {
    window.dispatchEvent(new Event("custom-sessions-updated"));
    return true;
  }
  return false;
}

/* ════════════════════════════════════════════════════════════════════
   R9a · LES JOURS D'ENTRAÎNEMENT, LUS ET ÉCRITS (décision 20)

   La décision vit dans `projection.ts` (pure) ; ici, seulement les
   lectures et les écritures des trois tables de la migration R9a.

   ⚠️ TROIS RÉPONSES À LA LECTURE, PAS DEUX. Une table ABSENTE (migration
   pas encore appliquée) vaut « aucun jour choisi » : l'app reste celle
   d'avant. Une lecture RATÉE rend `null` : « je ne sais pas », et
   l'appelant garde ce qu'il montrait au lieu d'annoncer un calendrier
   vide (décision 16).
   ════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase";
import { CALENDRIER_VIDE, normaliserJours, type Absence, type Calendrier, type ExceptionJour } from "@/lib/projection";

type Client = ReturnType<typeof createClient>;

const absente = (e: { code?: string } | null | undefined) => e?.code === "42P01" || e?.code === "PGRST205";

/** Le calendrier d'une personne, à partir de `depuis` pour les dates. */
export async function lireCalendrier(userId: string, depuis: string, client?: Client): Promise<Calendrier | null> {
  if (!userId) return null;
  const supabase = client ?? createClient();
  try {
    const [regle, ex, abs] = await Promise.all([
      supabase.from("jours_entrainement").select("jours").eq("user_id", userId).maybeSingle(),
      supabase.from("exceptions_jour").select("date, genre").eq("user_id", userId).gte("date", depuis),
      supabase.from("absences").select("id, debut, fin").eq("user_id", userId).gte("fin", depuis),
    ]);
    if (absente(regle.error) || absente(ex.error) || absente(abs.error)) return CALENDRIER_VIDE;
    if (regle.error || ex.error || abs.error) {
      console.warn("[jours] calendrier illisible :", regle.error?.message ?? ex.error?.message ?? abs.error?.message);
      return null;
    }
    return {
      jours: normaliserJours((regle.data as { jours?: unknown } | null)?.jours),
      exceptions: ((ex.data ?? []) as ExceptionJour[]).filter((e) => e.genre === "pas_de_seance" || e.genre === "seance_en_plus"),
      absences: (abs.data ?? []) as Absence[],
    };
  } catch (e) {
    console.warn("[jours] calendrier illisible :", (e as Error)?.message);
    return null;
  }
}

/** Les calendriers de plusieurs comptes (le cron du soir, client de service). */
export async function lireCalendriers(userIds: string[], depuis: string, client: Client): Promise<Map<string, Calendrier> | null> {
  const carte = new Map<string, Calendrier>();
  if (userIds.length === 0) return carte;
  const [regle, ex, abs] = await Promise.all([
    client.from("jours_entrainement").select("user_id, jours").in("user_id", userIds),
    client.from("exceptions_jour").select("user_id, date, genre").in("user_id", userIds).gte("date", depuis),
    client.from("absences").select("user_id, debut, fin").in("user_id", userIds).gte("fin", depuis),
  ]);
  if (absente(regle.error) || absente(ex.error) || absente(abs.error)) return carte;
  if (regle.error || ex.error || abs.error) return null;
  const de = (id: string) => {
    let c = carte.get(id);
    if (!c) { c = { jours: [], exceptions: [], absences: [] }; carte.set(id, c); }
    return c;
  };
  for (const r of (regle.data ?? []) as { user_id: string; jours: unknown }[]) de(r.user_id).jours = normaliserJours(r.jours);
  for (const r of (ex.data ?? []) as (ExceptionJour & { user_id: string })[]) de(r.user_id).exceptions.push({ date: r.date, genre: r.genre });
  for (const r of (abs.data ?? []) as (Absence & { user_id: string })[]) de(r.user_id).absences.push({ debut: r.debut, fin: r.fin });
  return carte;
}

/** Pose la règle de chaque semaine. Une liste vide retire la règle. */
export async function enregistrerJours(userId: string, jours: number[]): Promise<void> {
  const supabase = createClient();
  const propres = normaliserJours(jours);
  const { error } = propres.length === 0
    ? await supabase.from("jours_entrainement").delete().eq("user_id", userId)
    : await supabase.from("jours_entrainement").upsert({ user_id: userId, jours: propres, maj_le: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/** Retire ou ajoute un jour daté. `null` efface l'exception (retour à la règle). */
export async function poserException(userId: string, date: string, genre: ExceptionJour["genre"] | null): Promise<void> {
  const supabase = createClient();
  const { error } = genre === null
    ? await supabase.from("exceptions_jour").delete().eq("user_id", userId).eq("date", date)
    : await supabase.from("exceptions_jour").upsert({ user_id: userId, date, genre });
  if (error) throw new Error(error.message);
}

/** Déclare une absence. Une absence qui chevauche est refusée par la base. */
export async function poserAbsence(userId: string, debut: string, fin: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("absences").insert({ user_id: userId, debut, fin });
  if (error) throw new Error(error.code === "23P01" ? "absence_chevauche" : error.message);
}

export async function retirerAbsence(userId: string, id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("absences").delete().eq("user_id", userId).eq("id", id);
  if (error) throw new Error(error.message);
}

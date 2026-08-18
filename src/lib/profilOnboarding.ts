/* ════════════════════════════════════════════════════════════════════
   L'écriture des réponses de profil, à un seul endroit.

   Ces dix colonnes sont lues un peu partout (nutritionGoals, le prompt du
   coach, la génération de séance, l'écran Paramètres). Il y a maintenant
   DEUX écrans capables de les remplir : la modale historique
   (`OnboardingWrapper`) et le nouveau parcours `/bienvenue`. Deux copies
   de la même écriture, c'est la divergence garantie, et ce projet en a
   déjà payé plusieurs.

   ⚠️ `onboarding_completed` se calcule ICI, pas chez l'appelant. C'est lui
   qui décide si la bulle de rappel s'affiche et si le compte est
   considéré comme configuré : deux règles différentes selon l'écran de
   saisie donneraient deux vérités sur la même personne.
   ════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase";
import type { OnboardingData } from "@/components/OnboardingModal";

/** Vrai quand TOUTES les réponses attendues sont là. La taille n'en fait
 *  pas partie, volontairement : c'est la règle historique, et la changer
 *  ferait basculer des comptes déjà considérés comme complets. */
export function profilComplet(d: OnboardingData): boolean {
  return !!(d.age && d.weight && d.gender && d.goals.length > 0 && d.level && d.sessionsPerWeek && d.mealsPerDay && d.diet);
}

/** Écrit les réponses dans `profiles` et rend l'état de complétude.
 *  Écrit aussi la copie locale que le coach relit (`vaiiya_ob_<id>`). */
export async function enregistrerProfil(userId: string, d: OnboardingData): Promise<boolean> {
  // Copie côté client : le coach IA et l'écran Profil la relisent.
  try { localStorage.setItem(`vaiiya_ob_${userId}`, JSON.stringify(d)); } catch { /* ignore */ }

  const complet = profilComplet(d);

  const supabase = createClient();
  await supabase.from("profiles").upsert({
    id:                       userId,
    onboarding_age:           d.age             ? parseInt(d.age)             : null,
    onboarding_height:        d.height          ? parseInt(d.height)          : null,
    onboarding_weight:        d.weight          ? parseFloat(d.weight)        : null,
    onboarding_gender:        d.gender          || null,
    onboarding_goals:         d.goals.length    ? d.goals                     : null,
    onboarding_level:         d.level           || null,
    onboarding_sessions_week: d.sessionsPerWeek ? parseInt(d.sessionsPerWeek) : null,
    onboarding_meals_day:     d.mealsPerDay     ? parseInt(d.mealsPerDay)     : null,
    onboarding_diet:          d.diet            || null,
    onboarding_completed:     complet,
  }, { onConflict: "id" });

  return complet;
}

/* ════════════════════════════════════════════════════════════════════
   Le profil d'entrée : les questions, les réponses possibles, et
   l'écriture. Un seul endroit pour les trois.

   Ces dix colonnes sont lues un peu partout (nutritionGoals, le prompt
   du coach, la génération de séance, l'écran Paramètres). Il y a eu
   jusqu'à QUATRE écrans capables de les remplir, chacun avec sa propre
   liste de réponses : l'inscription historique, le formulaire des
   Paramètres, un troisième dans /profil, et le parcours /bienvenue. Ils
   n'écrivaient pas les mêmes valeurs dans la même colonne (« masse »
   ici, « prise_de_masse » là), donc l'écran des Paramètres n'arrivait
   plus à nommer l'objectif d'un compte rempli ailleurs.

   Depuis le 2026-08-22, il n'y a plus qu'un questionnaire, `/bienvenue`,
   et plus qu'un vocabulaire, celui-ci.

   ⚠️ `onboarding_completed` se calcule ICI, pas chez l'appelant. C'est
   lui qui décide si le rappel s'affiche et si le compte est considéré
   comme configuré : deux règles selon l'écran de saisie donneraient deux
   vérités sur la même personne.
   ════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase";
import { localDateStr } from "@/lib/dates";

export type OnboardingData = {
  age: string;
  height: string;
  weight: string;
  gender: string;
  goals: string[];
  level: string;
  sessionsPerWeek: string;
  mealsPerDay: string;
  diet: string;
};

/** Un questionnaire vide. Exporté pour que personne n'en réécrive un. */
export const PROFIL_VIDE: OnboardingData = {
  age: "", height: "", weight: "", gender: "",
  goals: [], level: "", sessionsPerWeek: "", mealsPerDay: "", diet: "",
};

/* ── Les réponses possibles ───────────────────────────────────────
   ⚠️ Les `id` sont ce qui part en base. Les changer réécrirait le sens
   des lignes déjà enregistrées : on ajoute, on ne renomme pas. */

export const GOALS = [
  { id: "masse",      label: "Prise de masse",   emoji: "💪" },
  { id: "poids",      label: "Perte de poids",   emoji: "🔥" },
  { id: "force",      label: "Force",             emoji: "🏋️" },
  { id: "endurance",  label: "Endurance",         emoji: "⚡" },
  { id: "sante",      label: "Santé générale",    emoji: "🌿" },
  { id: "souplesse",  label: "Souplesse",         emoji: "🧘" },
];

export const LEVELS = [
  { id: "debutant",      label: "Débutant",       sub: "< 6 mois" },
  { id: "intermediaire", label: "Intermédiaire",  sub: "6 mois – 2 ans" },
  { id: "avance",        label: "Avancé",         sub: "> 2 ans" },
];

export const GENDERS = [
  { id: "homme", label: "Homme" },
  { id: "femme", label: "Femme" },
  { id: "autre", label: "Autre" },
];

export const SESSIONS = ["1", "2", "3", "4", "5", "6", "7"];
export const MEALS    = ["2", "3", "4", "5", "6+"];
export const DIETS    = [
  { id: "omnivore",    label: "Omnivore",   emoji: "🥩" },
  { id: "vegetarien",  label: "Végétarien", emoji: "🥗" },
  { id: "vegan",       label: "Vegan",      emoji: "🌱" },
  { id: "sansgluten",  label: "Sans gluten",emoji: "🌾" },
];

/* Les valeurs écrites par les anciens formulaires. Elles sont encore en
   base sur de vrais comptes : on les LIT, on ne les écrit plus. */
const LEGACY_GOALS: Record<string, string> = {
  prise_de_masse: "masse",
  perte_de_poids: "poids",
  sante_generale: "sante",
};

/** Le libellé d'un objectif, quelle que soit l'époque où il a été écrit.
 *  Rend la valeur brute si elle n'est pas reconnue : mieux vaut afficher
 *  quelque chose d'inattendu que rien du tout. */
export function libelleObjectif(id: string): string {
  const cle = LEGACY_GOALS[id] ?? id;
  return GOALS.find((g) => g.id === cle)?.label ?? id;
}

/* ── Complétude et écriture ───────────────────────────────────────── */

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

  /* ⚠️ Le poids saisi ici est AUSSI une pesée du jour. Cette écriture
     vivait dans le formulaire des Paramètres, donc le même poids donné à
     l'inscription ne comptait pas comme une pesée et la courbe du profil
     démarrait à vide. Il n'y a qu'une source de poids, `weight_logs`, et
     c'est elle que relit l'objectif nutrition. */
  const poids = parseFloat(d.weight);
  if (Number.isFinite(poids) && poids > 0) {
    await supabase.from("weight_logs").upsert(
      { user_id: userId, date: localDateStr(), weight_kg: poids },
      { onConflict: "user_id,date" }
    );
  }

  return complet;
}

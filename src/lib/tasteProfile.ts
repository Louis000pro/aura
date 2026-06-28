/* ════════════════════════════════════════════════════════════════════
   Profil de goûts — source UNIQUE des données.

   Le « profil de goûts » (aime cuisiner ? temps ? accès aux ingrédients ?
   bases préférées) est demandé une fois via le popup TastePrefsPrompt, puis
   modifiable à tout moment dans les Paramètres (TasteProfileModal). Les deux
   écrans partagent ce fichier pour que les questions, les bases proposées et
   la logique d'enregistrement ne divergent JAMAIS — c'est aussi ce que lit le
   menu généré par l'IA (RecommendedMeals → /api/nutrition/menu).
   Voir [[nutrition-unification-refonte]].
   ════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase";

export type TasteProfile = {
  cooking: string | null;
  time: string | null;
  ingredients: string | null;
  bases: string[];
  updatedAt: string;
};

/* ─── Questions à choix unique ─── */
export const Q_COOKING = ["J'adore", "Un peu", "Le moins possible"];
export const Q_TIME = ["≤ 15 min", "~30 min", "J'ai le temps"];
export const Q_INGREDIENTS = ["Je trouve de tout", "Ça dépend", "Je fais simple"];

/* ─── Bases préférées (choix multiple) ─── */
export const BASE_GROUPS: { group: string; items: { label: string; emoji: string }[] }[] = [
  { group: "Protéines", items: [
    { label: "Poulet / volaille", emoji: "🍗" },
    { label: "Viande rouge", emoji: "🥩" },
    { label: "Porc / charcuterie", emoji: "🥓" },
    { label: "Poisson", emoji: "🐟" },
    { label: "Fruits de mer", emoji: "🦐" },
    { label: "Œufs", emoji: "🥚" },
    { label: "Légumineuses", emoji: "🫘" },
    { label: "Tofu / soja", emoji: "🌱" },
  ] },
  { group: "Féculents", items: [
    { label: "Riz", emoji: "🍚" },
    { label: "Pâtes", emoji: "🍝" },
    { label: "Pommes de terre", emoji: "🥔" },
    { label: "Pain", emoji: "🍞" },
    { label: "Semoule / couscous", emoji: "🌾" },
    { label: "Quinoa / boulgour", emoji: "🥣" },
    { label: "Avoine / céréales", emoji: "🥣" },
  ] },
  { group: "Légumes & laitages", items: [
    { label: "Légumes verts", emoji: "🥦" },
    { label: "Salade / crudités", emoji: "🥗" },
    { label: "Fromage", emoji: "🧀" },
    { label: "Yaourt / fromage blanc", emoji: "🥛" },
  ] },
];
export const KNOWN_BASES = new Set(BASE_GROUPS.flatMap((g) => g.items.map((i) => i.label)));

/* Au moins les 3 questions à choix unique remplies (les bases restent facultatives). */
export function isTasteComplete(p: Pick<TasteProfile, "cooking" | "time" | "ingredients">): boolean {
  return !!(p.cooking && p.time && p.ingredients);
}

export function tasteTodayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* Signature courte (pour invalider le cache du menu quand les goûts changent). */
export function tasteSignature(p: TasteProfile | null): string {
  return p?.updatedAt ? p.updatedAt.replace(/[^0-9]/g, "") : "0";
}

const localKey = (userId: string) => `vaiiya_taste_profile_${userId}`;

/* Lecture locale immédiate (synchrone) — suffisante dans la majorité des cas. */
export function loadTasteProfileLocal(userId: string): TasteProfile | null {
  try {
    const raw = localStorage.getItem(localKey(userId));
    return raw ? (JSON.parse(raw) as TasteProfile) : null;
  } catch {
    return null;
  }
}

/* Local d'abord, sinon repli sur la base (utile sur un nouvel appareil). */
export async function fetchTasteProfile(userId: string): Promise<TasteProfile | null> {
  const local = loadTasteProfileLocal(userId);
  if (local) return local;
  try {
    const { data } = await createClient()
      .from("profiles")
      .select("taste_profile")
      .eq("id", userId)
      .maybeSingle();
    const tp = (data as { taste_profile?: TasteProfile } | null)?.taste_profile ?? null;
    return tp && typeof tp === "object" ? tp : null;
  } catch {
    return null;
  }
}

/* Enregistre : local (source rapide) + best-effort base + événement live. */
export async function saveTasteProfile(userId: string, profile: TasteProfile): Promise<void> {
  try { localStorage.setItem(localKey(userId), JSON.stringify(profile)); } catch { /* ignore */ }
  try { await createClient().from("profiles").update({ taste_profile: profile }).eq("id", userId); } catch { /* ignore */ }
  try { window.dispatchEvent(new Event("vaiiya:taste")); } catch { /* ignore */ }
}

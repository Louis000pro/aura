import { createAdminClient } from "@/lib/supabase-admin";

/**
 * Vérifie qu'un profil existe pour un user_id (auth.users.id).
 * Si manquant, le crée avec les metadata de auth.users.
 * Bypass RLS (service role). Idempotent.
 */
export async function ensureProfileForUser(userId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (existing) return;

  // Récupérer les metadata du user
  let pseudo: string | null = null;
  let fullName: string | null = null;
  let avatarUrl: string | null = null;
  let email: string | null = null;
  try {
    const { data } = await supabase.auth.admin.getUserById(userId);
    const u = data?.user;
    if (u) {
      email = u.email ?? null;
      pseudo = (u.user_metadata?.pseudo as string | undefined) ?? (u.email?.split("@")[0] ?? null);
      fullName = (u.user_metadata?.full_name as string | undefined) ?? (u.user_metadata?.name as string | undefined) ?? pseudo;
      avatarUrl = (u.user_metadata?.avatar_url as string | undefined) ?? null;
    }
  } catch { /* ignore */ }

  if (!pseudo) pseudo = `user_${userId.slice(0, 6)}`;
  // Normalise les espaces (pas de pseudo avec espaces parasites)
  pseudo = pseudo.replace(/\s+/g, " ").trim();
  if (fullName) fullName = fullName.replace(/\s+/g, " ").trim();

  // Insert avec gestion du conflit de pseudo (suffixer)
  let insertPseudo = pseudo;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await supabase.from("profiles").insert({
      id: userId,
      pseudo: insertPseudo,
      full_name: fullName ?? insertPseudo,
      avatar_url: avatarUrl,
      email,
    });
    if (!error) return;
    if (error.code === "23505" && error.message?.includes("pseudo")) {
      insertPseudo = `${pseudo}_${Math.floor(Math.random() * 999)}`;
      continue;
    }
    // Autre erreur (ex: profil créé entre-temps par un autre appel) → arrête
    return;
  }
}

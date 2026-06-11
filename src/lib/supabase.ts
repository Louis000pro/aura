import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!url || !key) {
    // Retourne un client vide pour éviter le crash au build / prerender
    // Une vraie erreur sera levée uniquement si on essaie de faire une requête
    return createBrowserClient("https://placeholder.supabase.co", "placeholder-anon-key");
  }

  return createBrowserClient(url, key, {
    // Cookies de session longue durée → l'utilisateur reste connecté
    // (contourne le plafond 7 jours d'ITP sur Safari/iOS pour les cookies de session)
    cookieOptions: {
      maxAge: 60 * 60 * 24 * 365, // 1 an
      sameSite: "lax",
      secure: true,
      path: "/",
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

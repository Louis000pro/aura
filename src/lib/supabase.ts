import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!url || !key) {
    // Retourne un client vide pour éviter le crash au build / prerender
    // Une vraie erreur sera levée uniquement si on essaie de faire une requête
    return createBrowserClient("https://placeholder.supabase.co", "placeholder-anon-key");
  }

  return createBrowserClient(url, key);
}

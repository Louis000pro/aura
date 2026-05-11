import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase avec la clé service_role — côté serveur uniquement.
 * Ne jamais exposer SUPABASE_SERVICE_ROLE_KEY au client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

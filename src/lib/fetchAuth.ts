/**
 * fetchAuth.ts — appel client vers une de NOS routes, avec le jeton de session.
 *
 * Le pendant côté navigateur de `compteAppelant` (dans `apiAuth.ts`) : là-bas on
 * lit le jeton, ici on le pose. Toute route qui identifie son appelant doit être
 * appelée par ici, sinon la requête part sans jeton et revient en 401.
 *
 * `aiFetch` s'appuie sur cette fonction et n'ajoute que le vocabulaire des
 * quotas d'IA. Ne pas dupliquer la récupération du jeton ailleurs.
 */
import { createClient } from "./supabase";

export async function fetchAuth(input: string, init: RequestInit = {}): Promise<Response> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, { ...init, headers });
}

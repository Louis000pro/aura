/**
 * aiFetch.ts — appel client vers une route IA, avec le jeton de session.
 *
 * Depuis le 2026-07-29, toutes les routes IA exigent d'être connecté (avant,
 * elles étaient ouvertes à tout internet : n'importe qui pouvait faire tourner
 * la facture Mistral/Groq sans même avoir de compte). Plutôt que de recopier la
 * récupération du jeton dans la quinzaine d'endroits qui appellent l'IA, tout
 * passe par ici.
 *
 * Ne pas remplacer par un `fetch` nu : l'appel partirait sans jeton et
 * reviendrait en 401.
 */
import { createClient } from "./supabase";

export async function aiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, { ...init, headers });
}

/**
 * Message à afficher quand une route IA refuse.
 * Rend null si ce n'est pas un refus de quota : l'appelant garde alors sa
 * propre gestion d'erreur.
 */
export async function messageDeRefus(res: Response): Promise<string | null> {
  if (res.status !== 429 && res.status !== 401 && res.status !== 413) return null;
  try {
    const data = await res.clone().json();
    if (typeof data?.message === "string") return data.message;
  } catch {
    /* réponse sans JSON : on retombe sur les messages génériques */
  }
  if (res.status === 401) return "Connecte-toi pour utiliser cette fonction";
  if (res.status === 413) return "C'est un peu trop volumineux, réduis et réessaie";
  return "Tu as atteint ta limite du jour, ça repart demain";
}

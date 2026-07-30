/**
 * Identifier l'appelant d'une route API, à partir de son jeton.
 *
 * Pourquoi ce fichier existe : plusieurs routes prenaient l'identifiant du
 * compte dans le CORPS de la requête (`{ user_id }`) sans jamais vérifier de
 * jeton. N'importe qui pouvait donc agir au nom de n'importe qui, en devinant
 * ou en lisant un identifiant. Le cas le plus grave était l'enregistrement
 * d'un appareil pour les notifications : on pouvait s'abonner aux
 * notifications de quelqu'un d'autre et lire ses messages.
 *
 * Règle : le compte vient TOUJOURS du jeton, jamais du corps de la requête.
 * Un `user_id` envoyé par le client n'est au mieux qu'une intention, à
 * comparer au jeton, jamais une autorité.
 *
 * `garderIA` (dans `aiLimits.ts`) fait la même vérification, en y ajoutant les
 * plafonds d'usage. Les routes qui ne coûtent pas d'IA passent ici.
 */
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export type Appelant = { id: string; email: string | null };

/** Rend le compte derrière l'en-tête Authorization, ou `null`. */
export async function compteAppelant(req: Request): Promise<Appelant | null> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}

/** Réponse standard quand le jeton manque ou ne vaut rien. */
export function refusAuth(): NextResponse {
  return NextResponse.json(
    { error: "non_authentifie", message: "Reconnecte-toi pour continuer" },
    { status: 401 }
  );
}

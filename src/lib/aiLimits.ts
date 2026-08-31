/**
 * aiLimits.ts — source unique du garde-fou IA.
 *
 * Chaque fonction d'IA de Vaiiya coûte de l'argent à chaque appel. Ce fichier
 * dit, en un seul endroit : combien d'appels par jour, combien par minute, et
 * quelle taille d'entrée on accepte. Toutes les routes IA passent par
 * `garderIA()`, sinon la règle divergerait d'un fichier à l'autre.
 *
 * ── L'esprit, verrouillé avec Louis le 2026-07-29 ──
 * Le Premium est vendu « illimité ». Il le reste dans la vie réelle : les
 * plafonds sont posés très au-dessus de ce qu'un humain fait en une journée.
 * Ils n'existent que pour arrêter ce qui n'est pas un usage humain (un script,
 * une boucle, un compte partagé par vingt personnes). C'est la clause d'usage
 * raisonnable des conditions d'utilisation, traduite en code.
 *
 * Donc : on ne descend PAS ces plafonds pour « économiser ». Un abonné qui
 * touche le plafond en s'entraînant normalement, c'est un bug de notre côté,
 * pas un abus du sien.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "./supabase-admin";
import { LIMITES, PLAFONDS, type CategorieIA } from "./aiQuotas";
import { parisDateStr } from "./dates";

// Les chiffres vivent dans `aiQuotas.ts` (sans dépendance serveur) pour que la
// page des conditions générales affiche exactement ce que ce fichier applique.
export { LIMITES, PLAFONDS };
export type { CategorieIA };

/** Minute courante, pour la fenêtre de rafale. */
function minuteUTC(d = new Date()): string {
  return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
}

export interface AccesIA {
  userId: string;
  premium: boolean;
  admin: boolean;
}

type Resultat =
  | { ok: true; acces: AccesIA }
  | { ok: false; reponse: NextResponse };

/**
 * Porte d'entrée de toute route IA : authentifie, compte, et refuse proprement.
 *
 * Refus possibles :
 *   401 non connecté (avant, ces routes étaient ouvertes à tout internet)
 *   429 rafale (trop d'appels en une minute)
 *   429 plafond du jour, avec un message différent selon gratuit ou abonné
 */
export async function garderIA(req: Request, categorie: CategorieIA): Promise<Resultat> {
  const admin = createAdminClient();

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return {
      ok: false,
      reponse: NextResponse.json(
        { error: "non_authentifie", message: "Connecte-toi pour utiliser cette fonction" },
        { status: 401 }
      ),
    };
  }

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  const compte = authData?.user;
  if (authError || !compte) {
    return {
      ok: false,
      reponse: NextResponse.json(
        { error: "session_invalide", message: "Reconnecte-toi pour continuer" },
        { status: 401 }
      ),
    };
  }

  const { data: profil } = await admin
    .from("profiles")
    .select("is_admin, is_premium")
    .eq("id", compte.id)
    .maybeSingle();

  const estAdmin = !!profil?.is_admin;
  const estPremium = !!profil?.is_premium || estAdmin;
  const limite = LIMITES[categorie];

  const compter = async (cle: string, expire: Date): Promise<number | null> => {
    const { data, error } = await admin.rpc("consommer_ia", {
      p_user: compte.id,
      p_cle: cle,
      p_expire: expire.toISOString(),
    });
    if (error) {
      // Tant que la migration n'est pas collée, la RPC n'existe pas. On laisse
      // passer plutôt que de casser l'app, mais on le dit fort dans les logs :
      // pendant ce temps il n'y a AUCUNE protection.
      console.warn("[garderIA] compteur indisponible, aucune limite appliquée:", error.message);
      return null;
    }
    return typeof data === "number" ? data : null;
  };

  // ── Rafale, d'abord : c'est le refus le moins cher ──
  const finMinute = new Date(Date.now() + 2 * 60 * 1000);
  const enUneMinute = await compter(`${categorie}:m:${minuteUTC()}`, finMinute);
  if (enUneMinute !== null && enUneMinute > limite.parMinute) {
    return {
      ok: false,
      reponse: NextResponse.json(
        {
          error: "trop_rapide",
          message: "Doucement, laisse-moi une minute pour suivre 🙂",
          retryAfter: 60,
        },
        { status: 429, headers: { "Retry-After": "60" } }
      ),
    };
  }

  // ── Plafond du jour. Un admin n'est pas plafonné à la journée (il teste),
  //    mais il reste soumis à la rafale ci-dessus, ce qui suffit à arrêter
  //    une boucle folle ou un jeton volé. ──
  if (!estAdmin) {
    const plafond = estPremium ? limite.premium : limite.gratuit;
    const finJour = new Date(Date.now() + 36 * 60 * 60 * 1000);
    // Jour parisien : les compteurs se remettent à zéro à minuit, comme les
    // missions et la présence. Un seul calendrier pour toute l'app.
    const aujourdhui = await compter(`${categorie}:${parisDateStr()}`, finJour);

    if (aujourdhui !== null && aujourdhui > plafond) {
      return {
        ok: false,
        reponse: NextResponse.json(
          {
            error: "limite_atteinte",
            limitReached: true,
            dailyLimit: plafond,
            premium: estPremium,
            message: estPremium
              ? `Tu as atteint ${plafond} ${limite.libelle} aujourd’hui. C’est bien au-delà d’un usage normal, alors on met en pause jusqu’à demain. Écris-nous si c’est une erreur.`
              : `Tu as utilisé tes ${plafond} ${limite.libelle} du jour. Ça repart demain, ou passe en Premium pour ne plus y penser.`,
          },
          { status: 429 }
        ),
      };
    }
  }

  return { ok: true, acces: { userId: compte.id, premium: estPremium, admin: estAdmin } };
}

/** Refus type quand une entrée dépasse un plafond de taille. */
export function refusTaille(quoi: string): NextResponse {
  return NextResponse.json(
    { error: "entree_trop_grande", message: `${quoi} est trop volumineux.` },
    { status: 413 }
  );
}

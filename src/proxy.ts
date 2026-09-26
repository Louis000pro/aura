import { NextResponse, type NextRequest } from "next/server";

/* ════════════════════════════════════════════════════════════════════
   Le proxy ne RAFRAÎCHIT plus la session, il la PROLONGE.

   Avant (jusqu'au 2026-09-26), il appelait `supabase.auth.getUser()` à
   CHAQUE requête (pages, requêtes RSC, routes d'API, préchargements).
   À l'ouverture de l'app avec un jeton expiré, cinq ou six requêtes
   partaient en même temps et chacune rafraîchissait le MÊME jeton de
   rafraîchissement, en parallèle avec le client du navigateur. Supabase
   fait tourner ce jeton : les copies en retard devenaient invalides, et
   la session finissait révoquée. Vu dans les journaux d'authentification :
   quatre `token_refreshed` à la même seconde depuis les serveurs Vercel,
   suivis d'un `token_revoked`, puis des `refresh_token_not_found`.
   D'où « à chaque fois que je rouvre l'app, je suis déconnecté ».

   ⚠️ Désormais UN SEUL endroit rafraîchit la session : le client du
   navigateur (`lib/supabase.ts`, `autoRefreshToken`), qui sérialise ses
   rafraîchissements. Ne pas remettre d'appel à Supabase ici.

   Ce qu'il fait encore : sur une ouverture de PAGE (et seulement là), il
   réémet les cookies de session déjà présents, sans rien changer à leur
   valeur, avec une durée d'un an. Un cookie posé par le serveur échappe au
   plafond de 7 jours que Safari impose aux cookies écrits par JavaScript.
   C'est sans risque de course : la page arrive avant que le moindre script
   ait pu rafraîchir quoi que ce soit.
   ════════════════════════════════════════════════════════════════════ */

const UN_AN = 60 * 60 * 24 * 365;
const COOKIE_SESSION = /^sb-.+-auth-token(\.\d+)?$/;

export function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  if (request.headers.get("sec-fetch-dest") !== "document") return response;

  for (const c of request.cookies.getAll()) {
    if (!COOKIE_SESSION.test(c.name)) continue;
    response.cookies.set(c.name, c.value, {
      maxAge: UN_AN, sameSite: "lax", secure: true, path: "/",
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|json|txt|xml|woff2?)$).*)"],
};

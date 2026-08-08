import type { MetadataRoute } from "next";

/**
 * robots.txt généré par Next.
 * On autorise l'indexation des pages publiques (vitrine, premium, légal)
 * et on bloque les zones privées / personnalisées (app, API, auth).
 */
export default function robots(): MetadataRoute.Robots {
  // Hors production (préversions Vercel, `next dev`) : RIEN n'est indexable.
  // Empêche les URL de préversion `*.vercel.app` d'apparaître dans les moteurs
  // et de dévoiler une fonctionnalité avant son lancement officiel. Complète
  // l'en-tête `X-Robots-Tag` posé dans `next.config.ts`.
  if (process.env.VERCEL_ENV !== "production") {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // ⚠️ Un Disallow et un `noindex` sur la même URL s'annulent : le robot
        // n'a pas le droit de visiter la page, donc il n'y lit jamais l'ordre
        // de la retirer, et une URL déjà connue peut rester listée sans titre
        // ni description. Une page à désindexer doit rester VISITABLE et porter
        // sa balise (voir `lib/noindexEcranApp.ts`) ; le Disallow ne sert qu'à
        // ce qu'on ne veut simplement pas voir visité.
        //
        // C'est pourquoi /recherche n'est plus ici : il porte désormais un
        // vrai `noindex`, qui ne vaut que si le crawler peut le lire.
        disallow: [
          "/api/",
          "/auth",
          "/auth/",
          "/notifications",
          "/parametres",
          "/admin",
        ],
      },
    ],
    sitemap: "https://vaiiya.fr/sitemap.xml",
    host: "https://vaiiya.fr",
  };
}

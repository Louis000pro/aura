import type { MetadataRoute } from "next";

/**
 * robots.txt généré par Next.
 * On autorise l'indexation des pages publiques (vitrine, premium, légal)
 * et on bloque les zones privées / personnalisées (app, API, auth).
 */
export default function robots(): MetadataRoute.Robots {
  // Hors production (préversions Vercel, `next dev`) : RIEN n'est indexable.
  // Empêche les URL de preview *.vercel.app d'apparaître dans les moteurs et
  // de dévoiler une fonctionnalité avant son lancement officiel.
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
        disallow: [
          "/api/",
          "/auth",
          "/auth/",
          "/notifications",
          "/parametres",
          "/admin",
          "/recherche",
        ],
      },
    ],
    sitemap: "https://vaiiya.fr/sitemap.xml",
    host: "https://vaiiya.fr",
  };
}

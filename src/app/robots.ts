import type { MetadataRoute } from "next";

/**
 * robots.txt généré par Next.
 * On autorise l'indexation des pages publiques (vitrine, premium, légal)
 * et on bloque les zones privées / personnalisées (app, API, auth).
 */
export default function robots(): MetadataRoute.Robots {
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

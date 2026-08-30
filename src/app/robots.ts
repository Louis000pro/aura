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
        // sa balise (voir `lib/noindexEcranApp.ts`).
        //
        // C'est pourquoi /auth, /notifications, /parametres et /admin n'y sont
        // plus : les quatre portent désormais un vrai `noindex`, qui ne vaut
        // que si le crawler peut le lire. /auth était le cas le plus
        // net, puisque toutes les pages vitrine la lient (« Créer mon compte ») :
        // le moteur voyait le lien, ne pouvait pas visiter la page, et ne lisait
        // donc jamais la consigne qu'elle portait.
        //
        // Accessoirement, un `Disallow: /admin` publiait le chemin dans un
        // fichier que tout le monde lit. La page se garde toute seule ; le
        // retirer d'ici en dit moins, pas plus.
        //
        // Il ne reste donc que /api/ : des routes sans HTML, donc sans endroit
        // où poser une balise, et qu'aucun robot n'a de raison d'appeler.
        disallow: ["/api/"],
      },
    ],
    sitemap: "https://vaiiya.fr/sitemap.xml",
    host: "https://vaiiya.fr",
  };
}

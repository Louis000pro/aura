import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  // ── Performance ──────────────────────────────────────────────
  // NB: React Compiler désactivé — il cassait le timing de lecture des
  // vidéos et la réactivité de l'auth sur mobile. À ré-évaluer plus tard
  // avec des tests ciblés.

  // Retire les console.* en production (sauf erreurs/avertissements)
  // → bundle plus léger + moins de bruit runtime.
  compiler: {
    removeConsole: { exclude: ["error", "warn"] },
  },

  experimental: {
    // Tree-shaking fin des gros packages d'imports nommés.
    optimizePackageImports: ["framer-motion", "lucide-react"],
  },

  // ── Non-indexation des environnements hors production ─────────
  // Sur les préversions Vercel (`VERCEL_ENV=preview`) et en local, on pose
  // `X-Robots-Tag: noindex, nofollow` sur TOUTES les réponses (HTML + non-HTML,
  // ceinture + bretelles avec robots.ts). En production (`VERCEL_ENV=production`)
  // aucun en-tête n'est ajouté → vaiiya.fr reste pleinement indexable.
  // NB: chaque environnement Vercel a son propre build, donc la valeur de
  // VERCEL_ENV est figée correctement au build.
  async headers() {
    if (process.env.VERCEL_ENV === "production") return [];
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;

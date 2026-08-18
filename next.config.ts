import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
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

  // ── L'environnement, lisible aussi côté navigateur ────────────
  // `VERCEL_ENV` est la source de vérité de l'environnement dans ce repo
  // (robots.ts, en-têtes noindex ci-dessous), mais il n'existe que côté
  // serveur. On le recopie ici pour que le client puisse savoir s'il est
  // en production : c'est ce qui ferme le mode revue de `/bienvenue`
  // (`src/lib/modeRevue.ts`) partout ailleurs qu'en préversion.
  //
  // Recopié explicitement plutôt que laissé au réglage « exposer
  // automatiquement les variables système » de Vercel : ce réglage peut
  // être décoché sans qu'on le remarque, ce fichier non.
  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "",
  },

  // ── Non-indexation de tout ce qui n'est pas la production ─────
  // Sur les préversions Vercel (`VERCEL_ENV=preview`) et en local, on pose
  // `X-Robots-Tag: noindex, nofollow` sur TOUTES les réponses. C'est la
  // ceinture ; `src/app/robots.ts` est la bretelle. Les deux sont utiles :
  // l'en-tête couvre aussi les réponses non-HTML (images, JSON, PDF) qu'un
  // robots.txt ne protège pas, et il vaut pour une URL déjà connue d'un
  // moteur, qu'un simple Disallow ne désindexe pas.
  //
  // En production (`VERCEL_ENV=production`) aucun en-tête n'est ajouté, donc
  // vaiiya.fr reste pleinement indexable.
  //
  // Chaque environnement Vercel a son propre build : la valeur de VERCEL_ENV
  // est donc figée correctement au moment du build, pas devinée à l'exécution.
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

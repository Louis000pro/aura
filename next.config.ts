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
};

export default nextConfig;

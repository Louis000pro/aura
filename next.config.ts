import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  // ── Performance ──────────────────────────────────────────────
  // React Compiler : auto-mémoïsation des composants → bien moins de
  // re-renders, feed/likes/commentaires plus fluides.
  reactCompiler: true,

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

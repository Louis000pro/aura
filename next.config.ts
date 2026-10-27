import type { NextConfig } from "next";

/* ── L'identifiant du déploiement, pour ne jamais mélanger deux versions ──
   Une app restée ouverte pendant une mise en ligne gardait l'ANCIEN code,
   puis téléchargeait des morceaux du NOUVEAU au premier préchargement ou
   au premier changement de page. Next ne compare les versions qu'APRÈS
   avoir lu la réponse, donc après avoir chargé ces morceaux, et le runtime
   garde le premier code reçu pour chaque module : l'app tournait avec deux
   versions mélangées. Ce sont toutes les erreurs remontées la semaine du
   2026-10-20 (« photoDuGuide is not a function », « workoutSessions »
   indéfini, React #130 et #306), à chaque fois quelques minutes après un
   push.
   Chaque réponse porte donc cet identifiant (`x-vaiiya-deploiement`), et la
   page connaît le sien (`NEXT_PUBLIC_DEPLOIEMENT`, lu par le script du
   <head> dans `layout.tsx`). Une réponse de navigation d'une autre version
   est refusée AVANT d'être lue, et Next charge alors la page en entier.
   Unique par déploiement quand Vercel le donne, sinon le commit. Vide en
   local : rien n'est posé, rien n'est comparé. */
const DEPLOIEMENT = (process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || "").trim();

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
  //
  // `NEXT_PUBLIC_BUILD_ID` suit exactement la même logique, et sert au journal
  // des erreurs client (`/api/client-error`) ainsi qu'au verrou de
  // récupération de `src/lib/secoursErreur.ts`. C'est le COMMIT réel du
  // déploiement, pas un identifiant fabriqué : il se retrouve tel quel dans
  // `git log`, ce qu'un compteur maison ne permettrait pas. Vide en local, et
  // c'est voulu : on ne fabrique pas une fausse version.
  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "",
    NEXT_PUBLIC_BUILD_ID: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7),
    NEXT_PUBLIC_DEPLOIEMENT: DEPLOIEMENT,
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
  //
  // ── En-têtes de sécurité, partout (audit du 2026-10-17) ──────
  // Pas de CSP pour l'instant : l'app charge MediaPipe, YouTube et Stripe,
  // une politique mal réglée casserait ces écrans en silence. Ce qui suit ne
  // casse rien et ferme les attaques les plus courantes :
  //  · personne ne peut afficher Vaiiya dans un cadre (clickjacking) ;
  //  · le navigateur ne devine pas le type d'un fichier ;
  //  · une page ne transmet que l'origine du site aux sites qu'elle ouvre ;
  //  · caméra et micro restent permis pour Vaiiya seul (scanner, analyse,
  //    dictée), la géolocalisation et le paiement par le navigateur non.
  async headers() {
    const securite = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=()" },
      // La version qui a servi la réponse (voir `DEPLOIEMENT` en tête).
      ...(DEPLOIEMENT ? [{ key: "x-vaiiya-deploiement", value: DEPLOIEMENT }] : []),
    ];
    if (process.env.VERCEL_ENV === "production") {
      return [{ source: "/:path*", headers: securite }];
    }
    return [
      {
        source: "/:path*",
        headers: [...securite, { key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;

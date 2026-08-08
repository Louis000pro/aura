import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import MainWrapper from "@/components/MainWrapper";
import { AuthProvider } from "@/context/AuthContext";
import { GuidedTourProvider } from "@/context/GuidedTourContext";
import OnboardingWrapper from "@/components/OnboardingWrapper";
import GuidedTour from "@/components/GuidedTour/GuidedTour";
import PWARegister from "@/components/PWARegister";
import SplashIntro from "@/components/SplashIntro";
import PremiumBanner from "@/components/PremiumBanner";
import PresenceDuJour from "@/components/PresenceDuJour";
import CelebrationRang from "@/components/rang/CelebrationRang";
import PopupNouveautes from "@/components/maj/PopupNouveautes";
import { AssistantProvider } from "@/context/AssistantContext";
import { WorkoutLaunchProvider } from "@/context/WorkoutLaunchContext";
import AssistantSheet from "@/components/AssistantSheet";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PLANS, VENTE_OUVERTE } from "@/lib/plans";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://vaiiya.fr"),
  title: {
    default: "Vaiiya ✦ · Coach IA · Musculation · Nutrition",
    template: "%s · Vaiiya",
  },
  description: "Vaiiya réunit tes séances guidées, ta nutrition et ton coach IA dans une seule application web. Un catalogue de séances montrées mouvement par mouvement, la nutrition comprise d'une photo, et un rang qui monte à chaque effort.",
  applicationName: "Vaiiya",
  keywords: [
    "coach IA", "coach sportif IA", "musculation", "nutrition", "fitness",
    "programme d'entraînement personnalisé", "suivi progression", "perte de poids",
    "prise de masse", "application fitness", "coach nutrition", "salle de sport",
    "entraînement maison", "Vaiiya",
  ],
  authors: [{ name: "Vaiiya" }],
  creator: "Vaiiya",
  publisher: "Vaiiya",
  category: "health",
  // Pas de `alternates.canonical` ici, et ce n'est pas un oubli. Le layout
  // racine est partagé par toutes les routes : une valeur posée ici est héritée
  // par toute page qui ne la redéfinit pas. Elle valait « https://vaiiya.fr »,
  // donc /premium, /conditions, /mentions-legales, /confidentialite et jusqu'à
  // la page 404 se déclaraient doublons de l'accueil, ce qui revient à demander
  // aux moteurs de ne pas les indexer. Chaque page publique porte désormais son
  // propre canonical ; une page sans canonical est simplement canonique
  // d'elle-même, ce qui est le comportement correct par défaut.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icons/icon-48.png?v=6", type: "image/png", sizes: "48x48" },
      { url: "/icons/icon-96.png?v=6", type: "image/png", sizes: "96x96" },
    ],
    shortcut: "/icons/icon-48.png?v=6",
    apple: "/icons/apple-touch-icon.png?v=5",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // contenu plein écran sous la barre d'état
    title: "Vaiiya",
  },
  openGraph: {
    type: "website",
    siteName: "Vaiiya",
    title: "Vaiiya ✦ · Coach IA · Musculation · Nutrition",
    description: "Séances guidées mouvement par mouvement, nutrition comprise d'une photo, coach IA qui agit. Une seule application pour t'entraîner, manger mieux et tenir dans le temps.",
    locale: "fr_FR",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vaiiya · Coach IA · Musculation · Nutrition",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vaiiya ✦ · Coach IA · Musculation · Nutrition",
    description: "Séances guidées, nutrition comprise d'une photo et coach IA. Une seule application pour t'entraîner et tenir dans le temps.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" translate="no" suppressHydrationWarning className={`${geist.variable} h-full antialiased notranslate`} style={{ backgroundColor: "var(--html-bg)" }}>
      {/* Inline script runs before first paint — prevents dark mode flash */}
      <head>
        {/* Empêche les extensions de traduction (Google Translate, Opera) de casser React */}
        <meta name="google" content="notranslate" />

        {/* Écrans de démarrage iOS (PWA standalone) — logo Vaiiya au lieu d'un écran blanc */}
        <link rel="apple-touch-startup-image" media="screen and (device-width:375px) and (device-height:667px) and (-webkit-device-pixel-ratio:2)" href="/splash/splash-750x1334.png?v=5" />
        <link rel="apple-touch-startup-image" media="screen and (device-width:414px) and (device-height:896px) and (-webkit-device-pixel-ratio:2)" href="/splash/splash-828x1792.png?v=5" />
        <link rel="apple-touch-startup-image" media="screen and (device-width:375px) and (device-height:812px) and (-webkit-device-pixel-ratio:3)" href="/splash/splash-1125x2436.png?v=5" />
        <link rel="apple-touch-startup-image" media="screen and (device-width:414px) and (device-height:896px) and (-webkit-device-pixel-ratio:3)" href="/splash/splash-1242x2688.png?v=5" />
        <link rel="apple-touch-startup-image" media="screen and (device-width:390px) and (device-height:844px) and (-webkit-device-pixel-ratio:3)" href="/splash/splash-1170x2532.png?v=5" />
        <link rel="apple-touch-startup-image" media="screen and (device-width:428px) and (device-height:926px) and (-webkit-device-pixel-ratio:3)" href="/splash/splash-1284x2778.png?v=5" />
        <link rel="apple-touch-startup-image" media="screen and (device-width:393px) and (device-height:852px) and (-webkit-device-pixel-ratio:3)" href="/splash/splash-1179x2556.png?v=5" />
        <link rel="apple-touch-startup-image" media="screen and (device-width:430px) and (device-height:932px) and (-webkit-device-pixel-ratio:3)" href="/splash/splash-1290x2796.png?v=5" />
        {/* Thème AVANT le paint → aucun flash. Préf. aura-theme : system|light|dark.
            Défaut = CLAIR (absence de préférence). Seul "system" explicite suit le téléphone. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var p;try{p=localStorage.getItem('aura-theme');}catch(e){}var dark=p==='dark'||(p==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);var el=document.documentElement;if(dark){el.setAttribute('data-theme','dark');}else{el.removeAttribute('data-theme');}}catch(e){}})();` }} />

        {/* Qualité visuelle adaptative : pose la classe perf-lite sur <html> AVANT
            le paint. Priorité au réglage manuel (Paramètres → vaiiya-quality) ;
            sinon mode auto = détection de l'appareil (m = Go RAM, c = cœurs CPU,
            ou préférence système « réduire les animations »). Le CSS + l'orbe
            s'allègent en conséquence. Seuils auto à garder synchro avec perfMode.ts. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var q;try{q=localStorage.getItem('vaiiya-quality');}catch(e){}var lite;if(q==='high'){lite=false;}else if(q==='lite'){lite=true;}else{var n=navigator,m=n.deviceMemory,c=n.hardwareConcurrency,r=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;lite=!!(r||(typeof m==='number'&&m<=4)||(typeof c==='number'&&c<=4));}if(lite){document.documentElement.classList.add('perf-lite');}}catch(e){}})();` }} />

        {/* Session déjà ouverte ? On le sait AVANT le premier paint. L'accueil
            est servi avec la landing publique dans le HTML (c'est ce qui la rend
            lisible sans JavaScript) ; celui qui est déjà connecté ne doit pas la
            voir passer pour autant. `@supabase/ssr` range le jeton dans un cookie
            `sb-<projet>-auth-token`, avec repli sur le localStorage. La bascule
            se fait en CSS (voir `.accueil-attente` dans globals.css), donc le
            rendu React reste identique serveur et client. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var s=/(^|;\\s*)sb-[^=]*-auth-token/.test(document.cookie);if(!s){try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf('sb-')===0&&k.indexOf('-auth-token')>0){s=true;break;}}}catch(e){}}if(s){document.documentElement.classList.add('a-session');}}catch(e){}})();` }} />

        {/* Données structurées JSON-LD — aide Google à comprendre Vaiiya */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://vaiiya.fr/#organization",
                  name: "Vaiiya",
                  url: "https://vaiiya.fr",
                  logo: {
                    "@type": "ImageObject",
                    url: "https://vaiiya.fr/icons/icon-512.png",
                    width: 512,
                    height: 512,
                  },
                  image: "https://vaiiya.fr/icons/icon-512.png",
                  description: "Vaiiya édite une application web française d'entraînement et de nutrition, guidée par un assistant IA.",
                  // Seul contact confirmé, celui des mentions légales.
                  email: "bonjour@vaiiya.fr",
                  contactPoint: {
                    "@type": "ContactPoint",
                    email: "bonjour@vaiiya.fr",
                    contactType: "customer support",
                    availableLanguage: ["fr"],
                  },
                  // Les comptes officiels, donnés par Louis le 2026-08-08.
                  //
                  // `sameAs` est ce qui permet à un moteur de comprendre que ce
                  // domaine et ces profils sont la MÊME entité, au lieu de
                  // quatre présences sans lien. Il est posé ici, sur
                  // l'Organization, et nulle part ailleurs : c'est l'éditeur qui
                  // tient des comptes, pas le site ni l'application.
                  //
                  // ⚠️ URL propres uniquement. Un lien copié depuis l'application
                  // Instagram ou TikTok traîne des paramètres de partage
                  // (`igsh`, `_t`, `_r`, `si`…) qui identifient la personne qui a
                  // partagé : ils ne désignent plus le profil de façon stable, et
                  // ils n'ont rien à faire dans une donnée structurée publique.
                  //
                  // Discord n'y est pas : il n'existe pas encore publiquement.
                  // Pas de `foundingDate` ni de `legalName` non plus, rien ne les
                  // atteste. Les mentions légales déclarent un éditeur
                  // particulier non professionnel : ne pas transformer Vaiiya en
                  // société ici.
                  sameAs: [
                    "https://www.instagram.com/vaiiyapro/",
                    "https://www.tiktok.com/@vaiiyapro",
                    "https://www.youtube.com/@vaiiyapro",
                  ],
                },
                {
                  "@type": "WebSite",
                  "@id": "https://vaiiya.fr/#website",
                  url: "https://vaiiya.fr",
                  name: "Vaiiya",
                  inLanguage: "fr-FR",
                  publisher: { "@id": "https://vaiiya.fr/#organization" },
                  about: { "@id": "https://vaiiya.fr/#application" },
                },
                {
                  "@type": "WebApplication",
                  // Un identifiant stable, et l'application rattachée à son
                  // éditeur : sans ces liens, le graphe décrit trois choses
                  // séparées au lieu d'une seule entité « Vaiiya ».
                  "@id": "https://vaiiya.fr/#application",
                  name: "Vaiiya",
                  url: "https://vaiiya.fr",
                  publisher: { "@id": "https://vaiiya.fr/#organization" },
                  provider: { "@id": "https://vaiiya.fr/#organization" },
                  applicationCategory: "HealthApplication",
                  // « Web » seulement : les applications iOS et Android sont
                  // prévues mais n'existent pas. L'annoncer ici serait un fait
                  // faux porté par une donnée structurée, donc repris tel quel
                  // par les moteurs et par les assistants IA.
                  operatingSystem: "Web",
                  inLanguage: "fr-FR",
                  description: "Séances guidées montrées mouvement par mouvement, nutrition estimée à partir d'une photo, coach IA qui agit sur le planning et les repas, et une progression par rangs sans classement entre utilisateurs.",
                  // Le prix n'est jamais écrit à la main : il vient de plans.ts,
                  // comme la page /conditions. Tant que `VENTE_OUVERTE` est faux
                  // (verrou juridique), rien n'est vendable, donc la seule offre
                  // honnête est le compte gratuit. Le jour où la vente s'ouvre,
                  // l'abonnement apparaît ici tout seul, au bon prix.
                  offers: VENTE_OUVERTE
                    ? [
                        {
                          "@type": "Offer",
                          price: "0",
                          priceCurrency: "EUR",
                          description: "Compte gratuit, sans carte bancaire.",
                        },
                        {
                          "@type": "Offer",
                          price: (PLANS.premium.priceCents / 100).toFixed(2),
                          priceCurrency: "EUR",
                          description: "Vaiiya Premium, par mois, résiliable à tout moment.",
                        },
                      ]
                    : {
                        "@type": "Offer",
                        price: "0",
                        priceCurrency: "EUR",
                        description: "Compte gratuit, sans carte bancaire. L'abonnement Premium n'est pas encore ouvert à la souscription.",
                      },
                },
              ],
            }),
          }}
        />
      </head>
      <body className="min-h-full notranslate" translate="no">
        {/* Voile léger derrière la barre d'état (lisibilité de l'horloge en mode plein écran) */}
        <div aria-hidden style={{ position: "fixed", top: 0, left: 0, right: 0, height: "env(safe-area-inset-top)", zIndex: 1, pointerEvents: "none", background: "linear-gradient(to bottom, rgba(45,33,80,0.18), transparent)" }} />
        <SplashIntro />
        <AuthProvider>
          <PresenceDuJour />
          {/* Le rang peut monter n'importe où : la célébration vit au-dessus de tout. */}
          <CelebrationRang />
          <AssistantProvider>
            <WorkoutLaunchProvider>
              <GuidedTourProvider>
                <Navigation />
                <MainWrapper>{children}</MainWrapper>
                <OnboardingWrapper />
                <GuidedTour />
                {/* Le récap de mise à jour : une fois par compte, puis dans
                    Paramètres. Il vit DANS le fournisseur de la visite guidée
                    pour ne jamais s'ouvrir par dessus elle. */}
                <PopupNouveautes />
                <PWARegister />
                <AssistantSheet />
                <PremiumBanner />
              </GuidedTourProvider>
            </WorkoutLaunchProvider>
          </AssistantProvider>
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

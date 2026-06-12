import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import MainWrapper from "@/components/MainWrapper";
import { AuthProvider } from "@/context/AuthContext";
import OnboardingWrapper from "@/components/OnboardingWrapper";
import PWARegister from "@/components/PWARegister";
import SplashIntro from "@/components/SplashIntro";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://vaiiya.fr"),
  title: {
    default: "Vaiiya ✦ — Coach IA · Musculation · Nutrition",
    template: "%s · Vaiiya",
  },
  description: "Coach IA · Musculation · Nutrition — ton accompagnement de santé premium piloté par l'IA. Programmes personnalisés, suivi de progression et communauté fitness.",
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
  alternates: {
    canonical: "https://vaiiya.fr",
  },
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
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/icons/icon-96.png", type: "image/png", sizes: "96x96" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png?v=4",
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
    title: "Vaiiya ✦ — Coach IA · Musculation · Nutrition",
    description: "Rejoins Vaiiya : ton coach fitness & nutrition piloté par l'IA. Partage tes performances, suis ta progression, et progresse avec ta communauté.",
    locale: "fr_FR",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vaiiya — Coach IA · Musculation · Nutrition",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vaiiya ✦ — Coach IA · Musculation · Nutrition",
    description: "Ton coach fitness & nutrition piloté par l'IA. Rejoins la communauté Vaiiya.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#A78BFA",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" translate="no" className={`${geist.variable} h-full antialiased notranslate`} style={{ backgroundColor: "#F5F3FF" }}>
      {/* Inline script runs before first paint — prevents dark mode flash */}
      <head>
        {/* Empêche les extensions de traduction (Google Translate, Opera) de casser React */}
        <meta name="google" content="notranslate" />

        {/* Écrans de démarrage iOS (PWA standalone) — logo Vaiiya au lieu d'un écran blanc */}
        <link rel="apple-touch-startup-image" media="screen and (device-width:375px) and (device-height:667px) and (-webkit-device-pixel-ratio:2)" href="/splash/splash-750x1334.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width:414px) and (device-height:896px) and (-webkit-device-pixel-ratio:2)" href="/splash/splash-828x1792.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width:375px) and (device-height:812px) and (-webkit-device-pixel-ratio:3)" href="/splash/splash-1125x2436.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width:414px) and (device-height:896px) and (-webkit-device-pixel-ratio:3)" href="/splash/splash-1242x2688.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width:390px) and (device-height:844px) and (-webkit-device-pixel-ratio:3)" href="/splash/splash-1170x2532.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width:428px) and (device-height:926px) and (-webkit-device-pixel-ratio:3)" href="/splash/splash-1284x2778.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width:393px) and (device-height:852px) and (-webkit-device-pixel-ratio:3)" href="/splash/splash-1179x2556.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width:430px) and (device-height:932px) and (-webkit-device-pixel-ratio:3)" href="/splash/splash-1290x2796.png" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{document.documentElement.removeAttribute('data-theme');localStorage.removeItem('aura-theme');}catch(e){}})();` }} />

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
                  description: "Coach IA, musculation et nutrition — accompagnement de santé premium piloté par l'IA.",
                },
                {
                  "@type": "WebSite",
                  "@id": "https://vaiiya.fr/#website",
                  url: "https://vaiiya.fr",
                  name: "Vaiiya",
                  inLanguage: "fr-FR",
                  publisher: { "@id": "https://vaiiya.fr/#organization" },
                },
                {
                  "@type": "WebApplication",
                  name: "Vaiiya",
                  url: "https://vaiiya.fr",
                  applicationCategory: "HealthApplication",
                  operatingSystem: "Web, iOS, Android",
                  inLanguage: "fr-FR",
                  description: "Coach IA fitness & nutrition : programmes personnalisés, suivi de progression et communauté.",
                  offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "EUR",
                    description: "Inscription gratuite — abonnements Premium et Créateur disponibles.",
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
          <Navigation />
          <MainWrapper>{children}</MainWrapper>
          <OnboardingWrapper />
          <PWARegister />
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

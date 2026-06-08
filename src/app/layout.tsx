import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import MainWrapper from "@/components/MainWrapper";
import { AuthProvider } from "@/context/AuthContext";
import OnboardingWrapper from "@/components/OnboardingWrapper";
import PWARegister from "@/components/PWARegister";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://vaiiya.fr"),
  title: "Vaiiya ✦",
  description: "Coach IA · Musculation · Nutrition — ton accompagnement de santé premium piloté par l'IA.",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-192.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
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
    <html lang="fr" translate="no" className={`${geist.variable} h-full antialiased notranslate`}>
      {/* Inline script runs before first paint — prevents dark mode flash */}
      <head>
        {/* Empêche les extensions de traduction (Google Translate, Opera) de casser React */}
        <meta name="google" content="notranslate" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('aura-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');})();` }} />
      </head>
      <body className="min-h-full notranslate" translate="no">
        <AuthProvider>
          <Navigation />
          <MainWrapper>{children}</MainWrapper>
          <OnboardingWrapper />
          <PWARegister />
        </AuthProvider>
      </body>
    </html>
  );
}

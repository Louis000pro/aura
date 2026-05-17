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
  title: "Aura ✦",
  description: "Un accompagnement de santé premium piloté par l'IA multimodale.",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-192.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Aura",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${geist.variable} h-full antialiased`}>
      {/* Inline script runs before first paint — prevents dark mode flash */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('aura-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');})();` }} />
      </head>
      <body className="min-h-full">
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

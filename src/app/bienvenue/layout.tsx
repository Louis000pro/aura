import { noindexEcranApp } from "@/lib/noindexEcranApp";

// Le suffixe « · Vaiiya » vient du `template` du layout racine : le passer
// ici aussi affichait « Bienvenue · Vaiiya · Vaiiya ».
export const metadata = noindexEcranApp("Bienvenue");

/* ⚠️ `GuideProvider` N'EST PLUS MONTÉ ICI. Il vit dans `app/layout.tsx`
   depuis le 2026-08-19.

   La raison d'origine tenait tant que le Guide ne parlait que sur cette
   route : le monter globalement aurait fait une lecture de
   `profiles.guide_id` par session pour tout le monde, sans rien rendre en
   échange. Ce n'est plus le cas. Le Guide porte maintenant la voix et le
   visage de la conversation, et se change dans les paramètres : deux
   surfaces présentes sur toutes les pages. Une seule lecture d'une seule
   colonne par session, mise en cache localement dès la première réponse
   confirmée, est le prix normal de ça.

   Ce layout ne garde donc que son titre de page. */
export default function BienvenueLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

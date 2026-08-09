import { noindexEcranApp } from "@/lib/noindexEcranApp";

/**
 * Écran d'entrée dans l'application : hors des moteurs de recherche.
 *
 * ⚠️ Il ne se traite PAS comme les autres écrans applicatifs, et c'est le
 * point de ce fichier. /auth est lié depuis toutes les pages vitrine (« Créer
 * mon compte », le CTA de fin d'article) : ce sont de vrais appels à l'action,
 * ils restent. Google découvre donc l'URL de toute façon.
 *
 * Tant que `robots.txt` la bloquait, le moteur voyait le lien, n'avait pas le
 * droit de visiter la page, et ne lisait donc jamais la consigne qu'elle
 * portait. Une URL découverte mais interdite de visite peut rester listée sans
 * titre ni description : le blocage produisait exactement ce qu'il prétendait
 * empêcher. La page est maintenant visitable et dit elle-même `noindex`.
 *
 * `follow` est volontaire : les liens de cet écran peuvent être suivis, il n'y
 * a rien à cacher, c'est son indexation qu'on ne veut pas.
 *
 * Le layout couvre aussi /auth/reset-password, qui n'a rien à faire dans un
 * moteur non plus.
 */
export const metadata = noindexEcranApp("Connexion");

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}

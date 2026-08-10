/**
 * Les pages vitrine publiques, en un seul endroit.
 *
 * Elles vivaient dans `components/seo/MarketingShell.tsx`, donc seules ces
 * pages se connaissaient entre elles : rien d'autre sur le site n'y menait.
 * Une page que personne ne lie ne reçoit aucun poids interne, et un robot
 * arrivant sur l'accueil n'avait aucun chemin vers elles.
 *
 * La liste est ici pour que la landing et le gabarit vitrine tirent du même
 * fil. Ajouter une page vitrine se fait une seule fois, à cet endroit.
 */
export const SEO_PAGES: { href: string; label: string }[] = [
  { href: "/coach-ia", label: "Coach sportif IA" },
  { href: "/prise-de-masse", label: "Prise de masse" },
  { href: "/perte-de-poids", label: "Perte de poids" },
  { href: "/musculation-maison", label: "Musculation à la maison" },
  { href: "/nutrition-sportive", label: "Nutrition sportive" },
  // Le hub des fiches d'exercices. Il est listé ici dès sa mise en ligne :
  // une page que personne ne lie ne reçoit aucun poids interne, et c'est
  // exactement ce qui avait rendu /guides invisible et inutile.
  { href: "/exercices", label: "Exercices" },
  // La page qui explique l'entité elle-même. Elle est en dernier parce qu'elle
  // ne répond pas à une question d'entraînement : on y va quand on se demande
  // qui est derrière, pas quand on cherche un programme.
  { href: "/a-propos", label: "À propos" },
];

/** Les pages légales publiques, dans l'ordre où on les présente. */
export const LEGAL_PAGES: { href: string; label: string }[] = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/conditions", label: "Conditions générales" },
  { href: "/confidentialite", label: "Confidentialité" },
];

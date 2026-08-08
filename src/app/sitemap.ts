import type { MetadataRoute } from "next";

/**
 * Sitemap des pages publiques indexables de Vaiiya.
 *
 * Deux règles tiennent ce fichier :
 *
 * 1. On ne liste QUE des pages réellement indexables. Une URL présente ici mais
 *    marquée `noindex` envoie deux ordres contradictoires au robot ; une URL
 *    d'écran applicatif (derrière l'auth, personnalisée) n'a rien à y faire même
 *    si elle répond 200. C'est pourquoi `/coach` en est sorti : c'est le chat de
 *    l'assistant, pas une page vitrine.
 *
 * 2. `lastModified` dit la vérité ou ne dit rien. La version précédente posait
 *    `new Date()` sur TOUTES les pages : à chaque déploiement, le sitemap
 *    annonçait que l'intégralité du site venait de changer. Un signal qui est
 *    toujours vrai n'apprend rien, et Google finit par ignorer le champ pour
 *    tout le domaine. On écrit donc une date fixe par page, prise de l'historique
 *    git réel du contenu correspondant.
 *
 * ⚠️ En modifiant le contenu d'une de ces pages, mets sa date à jour ici. Une
 * date figée est un moindre mal (le robot revient de lui-même), une date fausse
 * qui bouge tout le temps décrédibilise le fichier entier.
 *
 * `changeFrequency` a été retiré : Google l'ignore, et annoncer « monthly » sur
 * une page qui n'a pas bougé depuis juin était une affirmation de plus qu'on ne
 * pouvait pas tenir.
 */

type Page = {
  path: string;
  /** Date de dernière modification réelle du contenu (AAAA-MM-JJ). */
  maj: string;
  priority: number;
};

const PAGES: Page[] = [
  // L'accueil : la landing publique, refaite au lot SEO 1.
  { path: "/", maj: "2026-08-08", priority: 1.0 },

  // Les cinq pages vitrine (`lib/seoPages.ts`), écrites en juin.
  { path: "/coach-ia", maj: "2026-06-12", priority: 0.9 },
  { path: "/prise-de-masse", maj: "2026-06-12", priority: 0.9 },
  { path: "/perte-de-poids", maj: "2026-06-12", priority: 0.9 },
  { path: "/musculation-maison", maj: "2026-06-12", priority: 0.8 },
  { path: "/nutrition-sportive", maj: "2026-06-12", priority: 0.8 },

  // L'offre. Indexable même vente fermée : « prix Vaiiya » se cherche de toute
  // façon, mieux vaut y répondre nous-mêmes.
  { path: "/premium", maj: "2026-08-08", priority: 0.8 },

  // Le légal. Peu de trafic, mais leur présence rassure moteurs et lecteurs sur
  // l'existence réelle de l'éditeur.
  { path: "/conditions", maj: "2026-08-08", priority: 0.3 },
  { path: "/mentions-legales", maj: "2026-08-08", priority: 0.3 },
  { path: "/confidentialite", maj: "2026-08-08", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://vaiiya.fr";

  return PAGES.map((p) => ({
    url: `${base}${p.path}`,
    lastModified: new Date(`${p.maj}T00:00:00Z`),
    priority: p.priority,
  }));
}

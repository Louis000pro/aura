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
 * 2. Pas de `lastModified`, et c'est délibéré. La version précédente posait
 *    `new Date()` sur TOUTES les pages : à chaque déploiement, le sitemap
 *    annonçait que l'intégralité du site venait de changer. Un signal qui est
 *    toujours vrai n'apprend rien, et Google finit par ignorer le champ pour
 *    tout le domaine. Une date figée écrite à la main n'est pas mieux : elle est
 *    exacte le jour où on l'écrit, et elle devient fausse à la première
 *    modification que personne ne pense à reporter ici. Tant qu'il n'existe pas
 *    de source automatique et fiable de la dernière modification RÉELLE d'une
 *    page, on préfère l'absence d'information à une information qui se périme
 *    toute seule. Le champ est facultatif, et les moteurs revisitent de
 *    toute façon.
 *
 * `changeFrequency` est absent pour la même raison : Google l'ignore, et
 * annoncer « monthly » sur une page qui n'a pas bougé depuis des mois était une
 * affirmation de plus qu'on ne pouvait pas tenir.
 *
 * `priority`, lui, reste : ce n'est pas une observation qui peut devenir fausse
 * mais une intention de notre part, celle de dire quelles pages comptent le
 * plus dans le site.
 *
 * Ajouter une page ici = elle doit être publique, servir du contenu à un robot,
 * et ne porter aucun `noindex`.
 */

const PAGES: { path: string; priority: number }[] = [
  // L'accueil : la landing publique.
  { path: "/", priority: 1.0 },

  // Les cinq pages vitrine (`lib/seoPages.ts`).
  { path: "/coach-ia", priority: 0.9 },
  { path: "/prise-de-masse", priority: 0.9 },
  { path: "/perte-de-poids", priority: 0.9 },
  { path: "/musculation-maison", priority: 0.8 },
  { path: "/nutrition-sportive", priority: 0.8 },

  // L'offre. Indexable même vente fermée : « prix Vaiiya » se cherche de toute
  // façon, mieux vaut y répondre nous-mêmes.
  { path: "/premium", priority: 0.8 },

  // Le légal. Peu de trafic, mais leur présence rassure moteurs et lecteurs sur
  // l'existence réelle de l'éditeur.
  { path: "/conditions", priority: 0.3 },
  { path: "/mentions-legales", priority: 0.3 },
  { path: "/confidentialite", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://vaiiya.fr";

  return PAGES.map((p) => ({
    url: `${base}${p.path}`,
    priority: p.priority,
  }));
}

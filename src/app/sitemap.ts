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
 * `changeFrequency` et `priority` sont absents pour une raison voisine : Google
 * ignore les deux. Le premier annonçait « monthly » sur des pages qui n'avaient
 * pas bougé depuis des mois, le second classait nos pages entre elles alors
 * qu'aucun moteur ne lit ce classement. Ce fichier ne garde donc que ce qu'il
 * sait dire sans se tromper : la liste des URL publiques que nous voulons faire
 * découvrir.
 *
 * Ajouter une page ici = elle doit être publique, servir du contenu à un robot,
 * et ne porter aucun `noindex`.
 */

const PAGES: string[] = [
  // L'accueil : la landing publique.
  "/",

  // Les cinq pages vitrine (`lib/seoPages.ts`).
  "/coach-ia",
  "/prise-de-masse",
  "/perte-de-poids",
  "/musculation-maison",
  "/nutrition-sportive",

  // L'offre. Indexable même vente fermée : « prix Vaiiya » se cherche de toute
  // façon, mieux vaut y répondre nous-mêmes.
  "/premium",

  // Le légal. Peu de trafic, mais leur présence rassure moteurs et lecteurs sur
  // l'existence réelle de l'éditeur.
  "/conditions",
  "/mentions-legales",
  "/confidentialite",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://vaiiya.fr";

  return PAGES.map((chemin) => ({ url: `${base}${chemin}` }));
}

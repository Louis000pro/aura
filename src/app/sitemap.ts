import type { MetadataRoute } from "next";
import { fichesPubliees } from "@/lib/exercicesPublics";

/**
 * Sitemap des pages publiques indexables de Vaiiya.
 *
 * Deux règles tiennent ce fichier :
 *
 * 1. On ne liste QUE des pages réellement indexables. Une URL présente ici mais
 *    marquée `noindex` envoie deux ordres contradictoires au robot ; une URL
 *    d'écran applicatif (derrière l'auth, personnalisée) n'a rien à y faire même
 *    si elle répond 200. C'est pourquoi `/coach` en était sorti : c'était le
 *    chat de l'assistant, pas une page vitrine. (Cette page a été supprimée le
 *    2026-09-03, plus rien n'y menait. `/coach-ia`, la page vitrine, reste.)
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

  // La page qui décrit l'entité Vaiiya (ce que c'est, qui le fait, ce qu'il y
  // a dedans). C'est la page que l'on veut voir répondre à « c'est quoi
  // Vaiiya », donc elle a sa place ici comme les autres pages de fond.
  "/a-propos",

  // Le hub de la bibliothèque d'exercices. Les fiches elles-mêmes sont
  // ajoutées plus bas, depuis la liste de celles qui sont rédigées : une
  // fiche sans contenu n'a pas de route, elle n'a donc rien à faire ici.
  "/exercices",

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

  /* Les fiches d'exercices ne sont pas recopiées à la main : elles sortent
     de la même source que leurs routes, donc le sitemap ne peut annoncer
     ni une URL qui n'existe pas, ni oublier celle qui vient d'être écrite.
     C'est la seule liste du fichier qu'on peut se permettre de générer,
     précisément parce qu'elle est adossée à `generateStaticParams`. */
  const fiches = fichesPubliees().map((f) => `/exercices/${f.slug}`);

  return [...PAGES, ...fiches].map((chemin) => ({ url: `${base}${chemin}` }));
}

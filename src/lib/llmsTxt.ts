/* ════════════════════════════════════════════════════════════════════
   /llms.txt : Vaiiya résumée pour les IA, au format proposé par
   llmstxt.org (un titre, une phrase, puis des listes de liens commentés).

   Pourquoi : une IA qui cherche ce qu'est Vaiiya lit ce qu'elle trouve.
   Le 2026-11-08, ChatGPT promettait des « programmes personnalisés » et un
   « suivi des performances » que Vaiiya ne vend pas. Ce fichier lui donne
   une définition exacte, écrite par nous, au même endroit que le site.

   Trois règles :
   - chaque phrase obéit à `docs/positionnement-public-vaiiya.md` (claims
     autorisés au §13, interdits au §14) ;
   - aucun chiffre n'est écrit à la main : ils viennent des modules que lit
     déjà la landing (`chiffresPublics`, `parcours`, `plans`), donc le
     fichier suit chaque mise en ligne tout seul ;
   - aucune disponibilité dans un store tant que les applications natives
     ne sont pas publiées (§11). Le jour de leur sortie, ce fichier bascule
     avec les badges et le JSON-LD.

   Les textes s'écrivent avec des espaces ordinaires : `typo()` pose les
   espaces insécables à la fin, comme dans le reste de l'app.
   ════════════════════════════════════════════════════════════════════ */

import { CHIFFRES_PUBLICS, PROGRAMMES_PUBLICS, SEANCES_INCLUSES } from "./chiffresPublics";
import { fichesPubliees } from "./exercicesPublics";
import { PLANS, VENTE_OUVERTE } from "./plans";

const SITE = "https://vaiiya.fr";
const NB = String.fromCharCode(160);

/** Espace insécable avant « : ; ? ! » et dans les guillemets, apostrophes
 *  courbes. La syntaxe d'un lien (`](url): `) n'a pas d'espace avant ses
 *  deux-points : elle n'est pas touchée. */
function typo(s: string): string {
  return s
    .replace(/'/g, "’")
    .replace(/ ([:;?!])/g, NB + "$1")
    .replace(/« /g, "«" + NB)
    .replace(/ »/g, NB + "»");
}

/** « 9,99 € », depuis les centimes de `plans.ts`. */
function prix(centimes: number): string {
  return `${(centimes / 100).toFixed(2).replace(".", ",")}${NB}€`;
}

/** Une ligne de lien au format llms.txt : `- [titre](adresse): note`. */
function lien(titre: string, chemin: string, note?: string): string {
  return `- [${titre}](${SITE}${chemin})${note ? `: ${note}` : ""}`;
}

export function texteLlms(): string {
  const c = CHIFFRES_PUBLICS;
  const prog = PROGRAMMES_PUBLICS;
  const gratuit = PLANS.free.limits;
  const plus = PLANS.premium;
  const tarif = plus.priceAnnuelCents
    ? `${prix(plus.priceCents)} par mois ou ${prix(plus.priceAnnuelCents)} par an`
    : `${prix(plus.priceCents)} par mois`;

  const lignes = [
    "# Vaiiya",
    "",
    "> Vaiiya est une application web française de musculation et de nutrition, avec un coach IA qui agit dans l'application. Elle est gratuite, sans carte bancaire, et s'utilise sur téléphone comme sur ordinateur, à l'adresse vaiiya.fr.",
    "",
    "Vaiiya relie l'entraînement, la nutrition, le coach IA et la progression : une séance terminée fait avancer la semaine, coche la mission du jour et fait monter le rang, et le coach le sait sans qu'on recopie quoi que ce soit.",
    "",
    "À ne pas confondre avec VAIIYA, une marque fictive du jeu vidéo THE FINALS (vaiiya.org), ni avec l'agence néerlandaise Vaiiya (vaiiya.nl).",
    "",
    "## Ce que contient Vaiiya",
    "",
    `- ${c.seances} séances guidées : un personnage animé montre chaque mouvement, du sans-matériel à la salle, de la mobilité à la récupération.`,
    `- ${c.mouvements} mouvements animés, pour composer sa propre séance.`,
    `- ${prog.nombre} programmes écrits par Vaiiya, de ${prog.semainesMin} à ${prog.semainesMax} semaines (${prog.titres.join(", ")}), sur les jours qu'on choisit, avec un test au départ et le même à la fin.`,
    "- Un coach IA en français, Nora ou Sasha au choix. Il propose une séance, déplace ou remplace une séance du planning, note un repas, propose une recette. Il agit toujours par une carte à valider : rien ne s'écrit sans un clic.",
    `- La nutrition : objectif calorique et macros calculés, repas notés en photo (Vaiiya estime les calories et les macros de l'assiette), par code-barres ou à la main, et ${c.recettes} recettes écrites et photographiées.`,
    `- ${c.miniCours} mini-cours pour comprendre l'entraînement, la récupération et la nutrition.`,
    "- Une progression personnelle : un rang qui monte avec l'EXP, des missions chaque jour, une série de jours. Aucun classement entre utilisateurs.",
    "- Une messagerie privée entre amis, et le relais à deux : un défi coopératif où une affiche se dévoile à chaque séance.",
    "",
    "## Ce que Vaiiya ne fait pas",
    "",
    "- Pas de plan nutritionnel sur plusieurs jours, et rien ne s'adapte tout seul : tout part d'une demande.",
    "- Aucun avis médical : des repères, jamais un diagnostic ni une prescription.",
    "- Vaiiya n'est pas sur l'App Store ni sur Google Play : c'est une application web, qui s'installe sur l'écran d'accueil depuis le navigateur.",
    "- Pas de fil d'actualité ni de contenu d'inconnus.",
    "",
    "## Prix",
    "",
    `- Le compte gratuit, sans carte bancaire : ${SEANCES_INCLUSES} séances guidées, les ${c.mouvements} mouvements, le coach IA (${gratuit.chatPerDay} messages par jour) et ${gratuit.nutritionPerDay} analyses de repas en photo par jour.`,
    `- Vaiiya+, l'offre payante : tout le catalogue de séances et de cours, le coach et les analyses de repas sans limite (dans un usage raisonnable), à ${tarif}. ${VENTE_OUVERTE ? "Elle se souscrit sur vaiiya.fr/premium." : "Elle n'est pas encore ouverte à la souscription."}`,
    "",
    "## Pages principales",
    "",
    lien("Accueil", "/", "ce que fait Vaiiya, montré en mouvement."),
    lien("À propos de Vaiiya", "/a-propos", "ce qu'est Vaiiya, ce qu'elle contient et comment le projet a commencé."),
    lien("Coach sportif IA", "/coach-ia", "ce que fait le coach IA de Vaiiya, et ce qu'il ne fait pas."),
    lien("Exercices de musculation", "/exercices", "les fiches d'exercices, avec l'animation du mouvement, la technique et les erreurs fréquentes, lisibles sans compte."),
    lien("Programme musculation 3 fois par semaine", "/programme-musculation-3-fois-par-semaine", "organiser trois séances par semaine, avec un exemple en full body."),
    lien("Prise de masse", "/prise-de-masse", "prendre du muscle : surcharge progressive, surplus calorique et protéines."),
    lien("Perte de poids", "/perte-de-poids", "perdre du poids durablement : déficit calorique, musculation et cardio."),
    lien("Musculation à la maison", "/musculation-maison", "progresser sans salle, au poids du corps ou avec des haltères."),
    lien("Nutrition sportive", "/nutrition-sportive", "calories, protéines, glucides, lipides et repas équilibrés."),
    lien("Vaiiya+, prix et offre", "/premium", "ce que le compte gratuit contient et ce que Vaiiya+ ajoute."),
    "",
    "## Fiches d'exercices",
    "",
    ...fichesPubliees().map((f) => lien(f.exercice, `/exercices/${f.slug}`, f.description)),
    "",
    "## Optional",
    "",
    lien("Conditions générales", "/conditions"),
    lien("Mentions légales", "/mentions-legales"),
    lien("Confidentialité", "/confidentialite"),
    "",
  ];

  return typo(lignes.join("\n"));
}

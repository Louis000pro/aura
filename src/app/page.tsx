import type { Metadata } from "next";
import AccueilClient from "./AccueilClient";
import { CHIFFRES_PUBLICS } from "@/lib/chiffresPublics";
import { resumeAvisPublics } from "@/lib/avisPublics";
import { questionsAccueil } from "@/lib/questionsAccueil";

/* La landing lit les avis approuvés côté serveur : on met le rendu en cache
   10 min plutôt que de frapper la base à chaque visite de l'écran le plus
   ouvert de l'app. Les avis n'ont pas besoin d'être à la seconde près. */
export const revalidate = 600;

/**
 * Coquille serveur de l'accueil.
 *
 * Elle n'existe que pour porter la `metadata` de `/`. Le layout racine est
 * partagé par toutes les routes : un canonical posé là-bas serait hérité par
 * chaque page qui n'en redéfinit pas, et c'est exactement ce qui faisait
 * déclarer à onze URL publiques qu'elles étaient des doublons de l'accueil.
 * Le canonical de la page d'accueil vit donc ici, sur la page d'accueil.
 *
 * Tout l'écran, lui, reste dans `AccueilClient` : c'est un composant client
 * (état d'authentification, animations), et un composant client ne peut pas
 * exporter de `metadata`.
 */
export const metadata: Metadata = {
  // Le titre que Google affiche pour l’accueil. Le slogan, lui, reste une
  // émotion sur la page ; c’est ici que vont les mots que les gens tapent
  // (« application », « musculation », « nutrition », « gratuit »), sans le
  // suffixe « · Vaiiya » du gabarit, puisque le nom ouvre déjà le titre.
  title: { absolute: "Vaiiya : application de musculation et de nutrition gratuite" },
  description: `L’application de musculation et de nutrition avec un coach IA : ${CHIFFRES_PUBLICS.seances} séances guidées, tes repas compris d’une photo. Gratuite, sans carte bancaire.`,
  alternates: { canonical: "https://vaiiya.fr/" },
};

export default async function Page() {
  /* Les chiffres de la landing sont comptés ici, côté serveur, et descendus en
     props. Les importer directement dans `LandingVitrine` (composant client)
     enverrait au navigateur le texte intégral des 26 mini-cours pour n'afficher
     qu'un nombre. Voir `lib/chiffresPublics.ts`.

     Les avis approuvés se lisent en base (lecture serveur, jamais côté client :
     voir `lib/avisPublics.ts`).

     Les huit questions de l'accueil se composent ici aussi : la vitrine les
     affiche, et les données structurées `FAQPage` les répètent mot pour mot,
     pour Google comme pour les IA. Repliées à l'écran, elles sont pourtant
     dans le HTML dès le chargement (voir `lib/questionsAccueil.ts`). */
  const avis = await resumeAvisPublics();
  const questions = questionsAccueil();
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.reponse },
    })),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq).replace(/</g, "\\u003c") }}
      />
      <AccueilClient chiffres={CHIFFRES_PUBLICS} avis={avis} questions={questions} />
    </>
  );
}

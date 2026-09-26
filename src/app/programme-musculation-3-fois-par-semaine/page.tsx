import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/seo/MarketingShell";

/**
 * Page pilier « programme musculation 3 fois par semaine ».
 *
 * Contenu ÉDITORIAL honnête (comment structurer une semaine à 3 séances), qui
 * MONTRE ce que Vaiiya fait réellement : catalogue de séances guidées,
 * composition libre depuis les mouvements animés, et l'assistant qui propose
 * une séance à valider. On n'écrit JAMAIS que Vaiiya « génère un programme
 * périodisé qui s'adapte tout seul » : l'adaptation existe mais se déclenche à
 * la demande (positionnement §5). Toute programmation est donnée en EXEMPLE,
 * jamais comme prescription, et sans claim absolu ni sanitaire.
 */
export const metadata: Metadata = {
  title: "Programme musculation 3 fois par semaine",
  description:
    "Programme de musculation 3 fois par semaine : le format full body, un exemple de séances lundi-mercredi-vendredi, séries et répétitions. Vaiiya compose tes séances et suit ta progression.",
  alternates: { canonical: "https://vaiiya.fr/programme-musculation-3-fois-par-semaine" },
  openGraph: {
    title: "Programme musculation 3 fois par semaine · Vaiiya",
    description:
      "Trois séances full body par semaine suffisent pour progresser. Exemple de programme et séances composées avec toi.",
    url: "https://vaiiya.fr/programme-musculation-3-fois-par-semaine",
    images: ["/og-image.png"],
  },
};

/* FAQ réelle et factuelle → `FAQPage` JSON-LD, lisible par Google et par les
   IA. Ce n'est PAS un balisage d'avis auto-décerné (interdit) : ce sont des
   questions/réponses de contenu. */
const FAQ: { q: string; r: string }[] = [
  {
    q: "3 séances de musculation par semaine, est-ce suffisant ?",
    r: "Oui. Pour un débutant comme pour un pratiquant intermédiaire, trois séances full body par semaine suffisent à progresser, à condition de laisser un jour de repos entre chaque séance et d'augmenter progressivement les charges.",
  },
  {
    q: "Quel est le meilleur format pour un programme 3 fois par semaine ?",
    r: "Le full body : chaque séance travaille l'ensemble du corps. Sur trois séances, chaque groupe musculaire est ainsi sollicité trois fois par semaine, ce qui est un bon rythme pour progresser sans surcharge.",
  },
  {
    q: "Quels jours choisir ?",
    r: "Un jour sur deux, par exemple lundi, mercredi et vendredi, pour laisser au moins 48 heures de récupération entre deux séances.",
  },
  {
    q: "Peut-on prendre du muscle ou perdre du poids avec 3 séances ?",
    r: "Oui, dans les deux cas. La différence se joue surtout dans l'alimentation : un léger surplus de calories pour la prise de masse, un léger déficit pour la perte de poids. L'entraînement reste très proche.",
  },
  {
    q: "Vaiiya propose-t-il un programme sur 3 séances ?",
    r: "Vaiiya te donne un catalogue de séances guidées, une bibliothèque de 102 mouvements animés pour composer ta propre séance, et un assistant qui te propose une séance à valider. Rien ne s'enregistre sans ton accord, et l'inscription est gratuite.",
  },
];

export default function Programme3FoisParSemainePage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.r },
    })),
  };

  return (
    <MarketingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <h1>Programme de musculation 3 fois par semaine</h1>
      <p className="lead">
        Trois séances de musculation par semaine suffisent pour progresser, à condition de bien les
        structurer. Le format le plus efficace sur trois jours est le <strong>full body</strong>&nbsp;:
        chaque séance travaille tout le corps. Voici comment répartir ta semaine, un exemple de programme
        lundi-mercredi-vendredi, et comment Vaiiya compose tes séances avec toi.
      </p>

      <h2>Pourquoi 3 séances par semaine&nbsp;?</h2>
      <p>
        Trois séances, c&apos;est le rythme qui concilie <strong>progression</strong> et{" "}
        <strong>récupération</strong>. Le muscle se construit pendant le repos, pas pendant l&apos;effort&nbsp;:
        s&apos;entraîner un jour sur deux laisse au corps le temps de récupérer entre chaque séance. C&apos;est
        aussi le format le plus tenable dans une vie chargée, et donc celui qu&apos;on suit vraiment sur la durée.
      </p>

      <h2>Le meilleur format sur 3 jours&nbsp;: le full body</h2>
      <p>
        En <strong>full body</strong>, chaque séance sollicite l&apos;ensemble des groupes musculaires. Sur
        trois séances, chaque muscle est donc travaillé trois fois par semaine&nbsp;: c&apos;est ce qui rend ce
        format si efficace pour un débutant ou un intermédiaire. On privilégie les{" "}
        <strong>exercices polyarticulaires</strong> (squat, développé couché, tractions, soulevé de terre,
        développé militaire), qui recrutent beaucoup de muscles à la fois.
      </p>

      <h3>Exemple de semaine</h3>
      <ul>
        <li><strong>Lundi&nbsp;:</strong> full body — jambes, pectoraux, dos, épaules, bras.</li>
        <li><strong>Mardi&nbsp;:</strong> repos.</li>
        <li><strong>Mercredi&nbsp;:</strong> full body — mêmes zones, exercices variés.</li>
        <li><strong>Jeudi&nbsp;:</strong> repos.</li>
        <li><strong>Vendredi&nbsp;:</strong> full body.</li>
        <li><strong>Week-end&nbsp;:</strong> repos, ou une marche / du cardio léger.</li>
      </ul>

      <h3>Exemple de séance full body</h3>
      <ul>
        <li>Squat — <strong>4 × 8 à 12</strong></li>
        <li>Développé couché — <strong>4 × 8 à 12</strong></li>
        <li>Tractions ou tirage — <strong>4 × 8 à 12</strong></li>
        <li>Développé militaire — <strong>3 × 10</strong></li>
        <li>Gainage — <strong>3 × 30 à 45 s</strong></li>
      </ul>
      <p>
        Ce ne sont que des <strong>exemples</strong>&nbsp;: adapte les exercices à ton matériel et à ton
        niveau. Pas de salle&nbsp;? La <Link href="/musculation-maison">musculation à la maison</Link> permet
        de suivre le même format avec des haltères et le poids du corps.
      </p>

      <h2>Combien de séries et de répétitions&nbsp;?</h2>
      <p>
        Un format courant est de <strong>3 à 4 séries de 8 à 12 répétitions</strong> par exercice, avec une
        charge qui te laisse une ou deux répétitions en réserve. L&apos;important est la{" "}
        <strong>surcharge progressive</strong>&nbsp;: viser un peu plus de charge ou de répétitions au fil des
        semaines, plutôt que de tout donner à chaque séance.
      </p>

      <h2>Prise de masse ou perte de poids&nbsp;?</h2>
      <p>
        Le même programme 3 fois par semaine sert les deux objectifs&nbsp;: la différence se joue surtout dans
        l&apos;assiette. Pour une <Link href="/prise-de-masse">prise de masse</Link>, vise un léger surplus de
        calories&nbsp;; pour une <Link href="/perte-de-poids">perte de poids</Link>, un léger déficit. Dans les
        deux cas, la <Link href="/nutrition-sportive">nutrition sportive</Link> est la moitié du résultat.
      </p>

      <h2>Ton programme 3 fois par semaine avec Vaiiya</h2>
      <p>
        Plutôt qu&apos;un plan générique, tu peux demander au <Link href="/coach-ia">coach IA Vaiiya</Link>{" "}
        de composer tes séances selon ton niveau, ton matériel et ton objectif&nbsp;: il te les montre, tu
        valides, et ta progression se suit séance après séance. Tu peux aussi partir d&apos;une des séances
        guidées du catalogue, ou <strong>composer la tienne</strong> à partir des{" "}
        <Link href="/exercices">mouvements animés</Link>. L&apos;inscription est gratuite, sans carte bancaire.
      </p>

      <h2>Questions fréquentes</h2>
      {FAQ.map((f) => (
        <div key={f.q}>
          <h3>{f.q}</h3>
          <p>{f.r}</p>
        </div>
      ))}
    </MarketingShell>
  );
}

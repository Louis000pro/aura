import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/seo/MarketingShell";

/**
 * Seule la promesse produit a changé : « l'ajuste à mesure que tu progresses »
 * décrivait un automatisme qui n'existe pas. L'adaptation existe, mais elle se
 * déclenche à la demande. Voir `docs/positionnement-public-vaiiya.md`, §5.
 */
export const metadata: Metadata = {
  title: "Programme prise de masse : prendre du muscle",
  description:
    "Programme de prise de masse : entraînement en surcharge progressive, surplus calorique et apport en protéines. Vaiiya compose tes séances et suit tes repas au quotidien.",
  alternates: { canonical: "https://vaiiya.fr/prise-de-masse" },
  openGraph: {
    title: "Programme prise de masse · Vaiiya",
    description:
      "Prends du muscle : des séances composées avec toi, des calories et des protéines suivies.",
    url: "https://vaiiya.fr/prise-de-masse",
    images: ["/og-image.png"],
  },
};

export default function PriseDeMassePage() {
  return (
    <MarketingShell>
      <h1>Programme prise de masse : prendre du muscle efficacement</h1>
      <p className="lead">
        La <strong>prise de masse</strong>{" "}repose sur trois piliers : un entraînement de musculation en
        surcharge progressive, un léger surplus calorique et un apport suffisant en protéines. Vaiiya compose
        tes séances de prise de masse, suit tes calories et tes protéines, et refait ta semaine quand tu le
        lui demandes.
      </p>

      <h2>Les 3 piliers d&apos;une prise de masse réussie</h2>
      <h3>1. L&apos;entraînement en surcharge progressive</h3>
      <p>
        Pour prendre du muscle, tes séances doivent privilégier les exercices polyarticulaires (squat,
        développé couché, soulevé de terre, tractions) avec des charges qui augmentent progressivement. Un
        schéma de <strong>4 séries de 8 à 12 répétitions</strong>{" "}est un format courant en hypertrophie.
      </p>
      <h3>2. Le surplus calorique</h3>
      <p>
        On ne construit pas de muscle sans énergie. Vise un surplus modéré de{" "}
        <strong>250 à 500 kcal par jour</strong> au-dessus de ta maintenance pour limiter la prise de gras.
        La <Link href="/nutrition-sportive">nutrition sportive</Link> est la moitié du résultat.
      </p>
      <h3>3. Les protéines</h3>
      <p>
        Consomme environ <strong>1,6 à 2&nbsp;g de protéines par kilo</strong> de poids de corps et par jour,
        réparties sur tes repas, pour soutenir la synthèse musculaire.
      </p>

      <h2>Exemple de répartition hebdomadaire</h2>
      <ul>
        <li><strong>Débutant :</strong> 3 séances full body par semaine.</li>
        <li><strong>Intermédiaire :</strong> split haut / bas sur 4 séances.</li>
        <li><strong>Confirmé :</strong> push / pull / legs sur 5 à 6 séances.</li>
      </ul>
      <p>
        Pas de salle&nbsp;? La <Link href="/musculation-maison">musculation à la maison</Link> permet aussi de
        progresser avec haltères et poids du corps.
      </p>

      <h2>Ton programme prise de masse avec Vaiiya</h2>
      <p>
        Plutôt que de suivre un plan générique, demande au <Link href="/coach-ia">coach IA Vaiiya</Link>{" "}
        de composer tes séances selon ton niveau, ton matériel et ton objectif. Il te les montre, tu valides,
        et la progression se suit séance après séance. Quand ta charge ou ton emploi du temps change, tu lui
        demandes de refaire la semaine. L&apos;inscription est gratuite.
      </p>
    </MarketingShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/seo/MarketingShell";

export const metadata: Metadata = {
  title: "Programme prise de masse : prendre du muscle",
  description:
    "Programme de prise de masse personnalisé : entraînement musculation, surplus calorique et apport en protéines pour prendre du muscle efficacement. Généré par l'IA Vaiiya.",
  alternates: { canonical: "https://vaiiya.fr/prise-de-masse" },
  openGraph: {
    title: "Programme prise de masse — Vaiiya",
    description:
      "Prends du muscle avec un programme musculation + nutrition personnalisé par l'IA.",
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
        surcharge progressive, un léger surplus calorique et un apport suffisant en protéines. Vaiiya génère
        ton programme prise de masse personnalisé et l&apos;ajuste à mesure que tu progresses.
      </p>

      <h2>Les 3 piliers d&apos;une prise de masse réussie</h2>
      <h3>1. L&apos;entraînement en surcharge progressive</h3>
      <p>
        Pour prendre du muscle, tes séances doivent privilégier les exercices polyarticulaires (squat,
        développé couché, soulevé de terre, tractions) avec des charges qui augmentent progressivement. Un
        schéma de <strong>4 séries de 8 à 12 répétitions</strong>{" "}est idéal pour l&apos;hypertrophie.
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

      <h2>Ton programme prise de masse personnalisé</h2>
      <p>
        Plutôt que de suivre un plan générique, laisse le <Link href="/coach-ia">coach IA Vaiiya</Link>{" "}
        construire ton programme selon ton niveau, ton matériel et ton objectif, puis suivre ta progression
        séance après séance. L&apos;inscription est gratuite.
      </p>
    </MarketingShell>
  );
}

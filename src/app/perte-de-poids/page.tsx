import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/seo/MarketingShell";

export const metadata: Metadata = {
  title: "Perte de poids : programme pour maigrir durablement",
  description:
    "Perdre du poids durablement : déficit calorique, musculation et cardio. Programme de sèche et plan nutrition personnalisés par l'IA Vaiiya pour maigrir sans reprendre.",
  alternates: { canonical: "https://vaiiya.fr/perte-de-poids" },
  openGraph: {
    title: "Perte de poids & sèche — Vaiiya",
    description:
      "Maigrir durablement avec un programme sport + nutrition personnalisé par l'IA.",
    url: "https://vaiiya.fr/perte-de-poids",
    images: ["/og-image.png"],
  },
};

export default function PerteDePoidsPage() {
  return (
    <MarketingShell>
      <h1>Perte de poids : maigrir durablement avec sport et nutrition</h1>
      <p className="lead">
        La <strong>perte de poids</strong>{" "}repose sur un déficit calorique maîtrisé, associé à de la
        musculation pour préserver le muscle et à de l&apos;activité pour augmenter ta dépense. Vaiiya
        construit ton programme de <strong>sèche</strong> et ton plan nutrition adaptés à ton rythme.
      </p>

      <h2>Le principe : le déficit calorique</h2>
      <p>
        Pour maigrir, tu dois consommer moins de calories que tu n&apos;en dépenses. Un déficit modéré de{" "}
        <strong>300 à 500 kcal par jour</strong>{" "}permet de perdre environ 0,5&nbsp;kg par semaine — un rythme
        sain et tenable, sans effet yo-yo. Les régimes trop agressifs font perdre du muscle et reprendre vite.
      </p>

      <h2>Pourquoi garder la musculation ?</h2>
      <p>
        En déficit, la musculation protège ta masse musculaire : tu perds du gras, pas du muscle. Résultat,
        une silhouette plus dessinée et un métabolisme maintenu. Garde des charges sur des exercices
        polyarticulaires, comme en <Link href="/prise-de-masse">prise de masse</Link>, mais avec un apport
        calorique réduit.
      </p>

      <h2>Les leviers d&apos;une sèche efficace</h2>
      <ul>
        <li><strong>Protéines élevées</strong> (1,8 à 2,2&nbsp;g/kg) pour la satiété et le muscle.</li>
        <li><strong>Musculation</strong> 3 à 4 fois par semaine.</li>
        <li><strong>Cardio / NEAT</strong> : marche quotidienne, escaliers, activité de fond.</li>
        <li><strong>Sommeil et hydratation</strong>, souvent sous-estimés.</li>
        <li><strong>Régularité</strong> plutôt que perfection&nbsp;: un déficit tenable bat un régime extrême.</li>
      </ul>

      <h2>Bien manger sans frustration</h2>
      <p>
        Une bonne <Link href="/nutrition-sportive">nutrition sportive</Link> ne veut pas dire se priver. Vaiiya te
        propose des repas équilibrés adaptés à tes calories, que tu manges chez toi ou en{" "}
        <Link href="/musculation-maison">t&apos;entraînant à la maison</Link>.
      </p>

      <h2>Ton programme perte de poids personnalisé</h2>
      <p>
        Le <Link href="/coach-ia">coach IA Vaiiya</Link> calcule ton déficit, génère tes séances et ajuste le
        plan selon tes résultats. Crée ton compte gratuit pour commencer ta transformation.
      </p>
    </MarketingShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/seo/MarketingShell";

/**
 * Le fond (déficit, musculation en sèche, leviers) est juste et n'a pas
 * bougé. Deux promesses produit ont été corrigées : « plan nutrition », qui
 * n'existe pas, et « ajuste le plan selon tes résultats », qui décrivait un
 * automatisme inexistant. Voir `docs/positionnement-public-vaiiya.md`, §5 et §6.
 */
export const metadata: Metadata = {
  title: "Perte de poids : programme pour maigrir durablement",
  description:
    "Perdre du poids durablement : déficit calorique, musculation et cardio. Vaiiya compose tes séances de sèche, calcule tes calories et suit tes repas au quotidien.",
  alternates: { canonical: "https://vaiiya.fr/perte-de-poids" },
  openGraph: {
    title: "Perte de poids et sèche · Vaiiya",
    description:
      "Maigrir durablement : des séances composées avec toi, des calories calculées et des repas suivis.",
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
        compose tes séances de <strong>sèche</strong>, calcule tes calories et suit tes repas au fil des
        jours.
      </p>

      <h2>Le principe : le déficit calorique</h2>
      <p>
        Pour maigrir, tu dois consommer moins de calories que tu n&apos;en dépenses. Un déficit modéré de{" "}
        <strong>300 à 500 kcal par jour</strong>{" "}vise environ 0,5&nbsp;kg par semaine, un rythme
        généralement tenable dans la durée. Les régimes trop agressifs font souvent perdre du muscle et
        reprendre vite.
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
        Une bonne <Link href="/nutrition-sportive">nutrition sportive</Link>{" "}ne veut pas dire se priver.
        Vaiiya te propose des idées de repas qui tiennent dans tes calories, et note ce que tu manges à
        partir d&apos;une photo, d&apos;un code-barres ou de ce que tu écris, que tu sois chez toi, au
        restaurant ou en <Link href="/musculation-maison">séance à la maison</Link>.
      </p>

      <h2>Commencer ta perte de poids avec Vaiiya</h2>
      <p>
        Le <Link href="/coach-ia">coach IA Vaiiya</Link>{" "}calcule ton déficit et compose tes séances. Quand ta
        semaine change, tu lui demandes de la réorganiser&nbsp;: il te montre la nouvelle semaine et tu
        valides. Rien ne se réécrit tout seul dans ton dos. Crée ton compte gratuit pour commencer.
      </p>
    </MarketingShell>
  );
}

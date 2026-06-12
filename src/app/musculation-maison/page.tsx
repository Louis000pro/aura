import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/seo/MarketingShell";

export const metadata: Metadata = {
  title: "Musculation à la maison — programme sans salle, haltères & poids du corps",
  description:
    "Programme de musculation à la maison : exercices au poids du corps et aux haltères pour progresser sans salle de sport. Plan personnalisé par l'IA Vaiiya, gratuit.",
  alternates: { canonical: "https://vaiiya.fr/musculation-maison" },
  openGraph: {
    title: "Musculation à la maison — Vaiiya",
    description:
      "Progresse sans salle : programme musculation maison au poids du corps et haltères, personnalisé par l'IA.",
    url: "https://vaiiya.fr/musculation-maison",
    images: ["/og-image.png"],
  },
};

export default function MusculationMaisonPage() {
  return (
    <MarketingShell>
      <h1>Musculation à la maison : progresser sans salle de sport</h1>
      <p className="lead">
        Pas besoin d&apos;abonnement en salle pour te muscler. Avec le <strong>poids du corps</strong> et une
        simple paire d&apos;<strong>haltères</strong>, tu peux construire du muscle chez toi. Vaiiya adapte ton
        programme de musculation maison à ton matériel et à ton niveau.
      </p>

      <h2>S&apos;entraîner au poids du corps</h2>
      <p>
        Les exercices au poids du corps sont redoutablement efficaces&nbsp;: pompes, tractions, dips, squats,
        fentes et gainage couvrent l&apos;ensemble du corps. La clé est la <strong>surcharge progressive</strong>&nbsp;:
        augmente les répétitions, ralentis le mouvement ou passe à des variantes plus difficiles (pompes
        déclinées, pistol squats) pour continuer à progresser.
      </p>

      <h2>Avec une paire d&apos;haltères</h2>
      <p>
        Quelques haltères élargissent énormément les possibilités&nbsp;: développé, rowing, soulevé de terre
        roumain, curl, élévations… De quoi viser la <Link href="/prise-de-masse">prise de masse</Link> comme
        la <Link href="/perte-de-poids">perte de poids</Link> sans jamais mettre les pieds en salle.
      </p>

      <h2>Exemple de séance full body maison</h2>
      <ul>
        <li>Squats ou fentes — 4 × 12</li>
        <li>Pompes (variante adaptée) — 4 × max</li>
        <li>Rowing haltères ou tractions — 4 × 10</li>
        <li>Développé épaules haltères — 3 × 12</li>
        <li>Gainage — 3 × 45&nbsp;s</li>
      </ul>
      <p>
        Trois séances full body par semaine suffisent pour des résultats visibles quand l&apos;entraînement
        est régulier et bien dosé.
      </p>

      <h2>La nutrition compte autant que l&apos;entraînement</h2>
      <p>
        Même à la maison, tes résultats dépendent de ton assiette. Découvre les bases de la{" "}
        <Link href="/nutrition-sportive">nutrition sportive</Link> pour accompagner tes séances.
      </p>

      <h2>Ton programme maison personnalisé</h2>
      <p>
        Indique ton matériel (rien, haltères, élastiques) et laisse le{" "}
        <Link href="/coach-ia">coach IA Vaiiya</Link> bâtir un programme adapté à ton salon. Inscription
        gratuite.
      </p>
    </MarketingShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/seo/MarketingShell";
import { CHIFFRES_PUBLICS } from "@/lib/chiffresPublics";

/**
 * « Vaiiya adapte ton programme à ton matériel » laissait entendre un suivi
 * permanent. Le fait réel est plus simple et plus intéressant : le matériel est
 * pris en compte au moment de la génération. La page dit maintenant les deux
 * façons de composer une séance chez soi, dont celle où l'utilisateur la
 * construit lui-même (voir `docs/positionnement-public-vaiiya.md`, §4).
 */
export const metadata: Metadata = {
  title: "Musculation à la maison : poids du corps et haltères",
  description:
    "Musculation à la maison : exercices au poids du corps et aux haltères pour progresser sans salle. Vaiiya compose la séance avec ce que tu as, ou tu la construis toi-même. Gratuit.",
  alternates: { canonical: "https://vaiiya.fr/musculation-maison" },
  openGraph: {
    title: "Musculation à la maison · Vaiiya",
    description:
      "Progresse sans salle : des séances au poids du corps ou aux haltères, composées avec toi ou construites par toi.",
    url: "https://vaiiya.fr/musculation-maison",
    images: ["/og-image.png"],
  },
};

export default function MusculationMaisonPage() {
  return (
    <MarketingShell>
      <h1>Musculation à la maison : progresser sans salle de sport</h1>
      <p className="lead">
        Pas besoin d&apos;abonnement en salle pour te muscler. Avec le <strong>poids du corps</strong>{" "}et une
        simple paire d&apos;<strong>haltères</strong>, tu peux construire du muscle chez toi. Vaiiya tient
        compte de ton matériel au moment où il compose ta séance&nbsp;: il ne te proposera pas une machine
        que tu n&apos;as pas.
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
        <li>Squats ou fentes, 4 × 12</li>
        <li>Pompes (variante adaptée), 4 × max</li>
        <li>Rowing haltères ou tractions, 4 × 10</li>
        <li>Développé épaules haltères, 3 × 12</li>
        <li>Gainage, 3 × 45&nbsp;s</li>
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

      <h2>Composer ta séance maison</h2>
      <p>
        Deux façons de faire, et aucune n&apos;est meilleure que l&apos;autre. Tu dis à Vaiiya où tu
        t&apos;entraînes (chez toi au poids du corps, chez toi avec des haltères, ou en salle) et le{" "}
        <Link href="/coach-ia">coach IA</Link>{" "}compose une séance qui n&apos;utilise que ce que tu as sous la
        main, en te la montrant avant que tu la gardes.
      </p>
      <p>
        Ou tu la construis toi-même. La bibliothèque contient <strong>{CHIFFRES_PUBLICS.mouvements} mouvements animés</strong>{" "}
        filtrables par zone du corps et par matériel&nbsp;: tu choisis les exercices, tu règles les séries,
        les répétitions et le repos, et la séance est à toi. Les mouvements se regardent aussi librement dans
        les <Link href="/exercices">fiches d&apos;exercices</Link>, sans compte. L&apos;inscription est
        gratuite.
      </p>
    </MarketingShell>
  );
}

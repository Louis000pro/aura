import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/seo/MarketingShell";

export const metadata: Metadata = {
  title: "Coach sportif IA — ton coach musculation & nutrition personnalisé",
  description:
    "Vaiiya est ton coach sportif IA : programmes de musculation personnalisés, plans nutrition et suivi de progression pilotés par l'intelligence artificielle. Gratuit pour commencer.",
  alternates: { canonical: "https://vaiiya.fr/coach-ia" },
  openGraph: {
    title: "Coach sportif IA — Vaiiya",
    description:
      "Programmes de musculation et nutrition personnalisés par l'IA. Ton coach disponible 24/7 dans ta poche.",
    url: "https://vaiiya.fr/coach-ia",
    images: ["/og-image.png"],
  },
};

export default function CoachIaPage() {
  return (
    <MarketingShell>
      <h1>Coach sportif IA : ton coach musculation & nutrition personnalisé</h1>
      <p className="lead">
        Vaiiya est un <strong>coach sportif propulsé par l&apos;intelligence artificielle</strong>. Il crée
        tes programmes de musculation, adapte ta nutrition à tes objectifs et suit ta progression — le tout
        personnalisé, instantané et disponible 24h/24 dans ton téléphone.
      </p>

      <h2>Qu&apos;est-ce qu&apos;un coach sportif IA ?</h2>
      <p>
        Un coach sportif IA analyse ton profil (âge, niveau, objectifs, matériel disponible) pour générer un
        accompagnement sur-mesure, sans rendez-vous ni tarif horaire. Là où un coach traditionnel coûte 40 à
        80&nbsp;€ la séance, Vaiiya te donne un <strong>programme d&apos;entraînement personnalisé</strong> et
        des conseils nutrition en quelques secondes, ajustés à chaque progrès.
      </p>

      <h2>Ce que fait ton coach IA Vaiiya</h2>
      <ul>
        <li><strong>Programmes de musculation personnalisés</strong> selon ton niveau, ton matériel et ton objectif (force, masse, sèche).</li>
        <li><strong>Plans nutrition adaptés</strong> à tes calories et macros — voir la <Link href="/nutrition-sportive">nutrition sportive</Link>.</li>
        <li><strong>Suivi de progression</strong> : poids, séries, charges et photos d&apos;évolution.</li>
        <li><strong>Réponses instantanées</strong> à tes questions : technique d&apos;exercice, récupération, motivation.</li>
        <li><strong>Adaptation continue</strong> : ton programme évolue avec tes résultats.</li>
      </ul>

      <h2>Pour qui ?</h2>
      <p>
        Que tu vises la <Link href="/prise-de-masse">prise de masse</Link>, la{" "}
        <Link href="/perte-de-poids">perte de poids</Link>, ou que tu t&apos;entraînes en salle ou à la{" "}
        <Link href="/musculation-maison">maison</Link>, ton coach IA construit le plan adapté à ta situation.
        Débutant comme confirmé, tu avances avec une méthode claire plutôt que de naviguer à l&apos;aveugle.
      </p>

      <h2>Combien ça coûte ?</h2>
      <p>
        L&apos;inscription est <strong>gratuite</strong>. Tu obtiens tes premiers programmes et ton suivi sans
        payer. Une formule <Link href="/premium">Vaiiya Premium</Link> débloque le coaching IA illimité et des
        fonctionnalités avancées pour ceux qui veulent aller plus loin.
      </p>
    </MarketingShell>
  );
}

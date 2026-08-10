import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/seo/MarketingShell";

/**
 * Cette page décrivait un produit que Vaiiya n'a jamais eu : des « plans
 * nutrition », des « photos d'évolution » et une « adaptation continue » du
 * programme aux résultats. Rien de tout cela n'existe (voir
 * `docs/positionnement-public-vaiiya.md`, §5 et §6). Le texte dit désormais ce
 * que l'assistant fait vraiment, et surtout COMMENT il le fait : il propose,
 * l'utilisateur valide. C'est le geste distinctif du produit, il valait mieux
 * que la promesse qu'il remplace.
 */
export const metadata: Metadata = {
  title: "Coach sportif IA : musculation et nutrition",
  description:
    "Vaiiya est ton coach sportif IA : il compose tes séances de musculation, suit tes calories et tes macros, et te guide pendant l'effort. Tu peux aussi construire tes séances toi-même. Gratuit pour commencer.",
  alternates: { canonical: "https://vaiiya.fr/coach-ia" },
  openGraph: {
    title: "Coach sportif IA · Vaiiya",
    description:
      "Des séances composées avec toi, la nutrition suivie en photo, un assistant qui propose et que tu valides.",
    url: "https://vaiiya.fr/coach-ia",
    images: ["/og-image.png"],
  },
};

export default function CoachIaPage() {
  return (
    <MarketingShell>
      <h1>Coach sportif IA : ton coach musculation &amp; nutrition personnalisé</h1>
      <p className="lead">
        Vaiiya est un <strong>coach sportif propulsé par l&apos;intelligence artificielle</strong>. Tu lui
        parles normalement, il compose une séance, réorganise ta semaine ou note un repas, et il te montre
        toujours ce qu&apos;il va faire avant de le faire. Rien ne s&apos;enregistre sans que tu valides.
      </p>

      <h2>Qu&apos;est-ce qu&apos;un coach sportif IA ?</h2>
      <p>
        Un coach sportif IA tient compte de ta situation (niveau, objectif, matériel disponible, temps que tu
        as cette semaine) pour te proposer un entraînement qui te correspond, tout de suite et sans
        rendez-vous. Ce n&apos;est pas un professionnel de santé, et Vaiiya ne remplace ni un médecin ni un
        coach diplômé : c&apos;est un outil qui compose, montre et suit, pendant que tu gardes la décision.
      </p>

      <h2>Ce que fait ton coach IA Vaiiya</h2>
      <ul>
        <li><strong>Il compose une séance de musculation</strong> selon ton niveau, ton matériel et ton objectif (force, masse, sèche), puis te la présente sur une carte que tu acceptes ou non.</li>
        <li><strong>Il suit tes calories et tes macros</strong>, à partir d&apos;une photo d&apos;assiette, d&apos;un code-barres ou de ce que tu écris. Voir la <Link href="/nutrition-sportive">nutrition sportive</Link>.</li>
        <li><strong>Il réorganise ta semaine quand tu le lui demandes</strong>, par exemple s&apos;il ne te reste que deux jours d&apos;entraînement.</li>
        <li><strong>Il suit ta progression</strong> : séances réalisées, poids et mesures, records, rang qui monte à chaque effort.</li>
        <li><strong>Il répond à tes questions</strong> sur la technique, la récupération ou l&apos;organisation, sans quitter l&apos;application.</li>
      </ul>
      <p>
        Ce qu&apos;il ne fait pas, et c&apos;est volontaire : rien ne se modifie tout seul dans ton dos. Ton
        programme ne se réécrit pas pendant la nuit parce qu&apos;une statistique a bougé. Tu demandes, il
        propose, tu valides.
      </p>

      <h2>Tu n&apos;es jamais obligé de passer par l&apos;IA</h2>
      <p>
        L&apos;assistant est une porte d&apos;entrée, pas un passage obligé. Tu peux aussi bien{" "}
        <strong>suivre une séance du catalogue</strong>, <strong>construire entièrement la tienne</strong>{" "}
        en piochant dans les 102 mouvements animés de la bibliothèque, ou{" "}
        <strong>improviser</strong> et garder la séance à la fin si elle t&apos;a plu. Les mouvements se
        consultent librement dans les <Link href="/exercices">fiches d&apos;exercices</Link>.
      </p>

      <h2>Pour qui ?</h2>
      <p>
        Que tu vises la <Link href="/prise-de-masse">prise de masse</Link>, la{" "}
        <Link href="/perte-de-poids">perte de poids</Link>, ou que tu t&apos;entraînes en salle ou à la{" "}
        <Link href="/musculation-maison">maison</Link>, ton coach IA compose le plan adapté à ta situation.
        Débutant comme confirmé, tu avances avec une méthode claire plutôt que de naviguer à l&apos;aveugle.
      </p>

      <h2>Combien ça coûte ?</h2>
      <p>
        L&apos;inscription est <strong>gratuite</strong>, sans carte bancaire. Tu obtiens le catalogue de
        séances, la bibliothèque de mouvements, le suivi de tes repas et ta progression sans rien payer. Un
        abonnement <Link href="/premium">Vaiiya Premium</Link> lèvera plus tard les plafonds de
        l&apos;assistant et ouvrira des programmes réservés : il n&apos;est <strong>pas encore ouvert à la
        souscription</strong>, et aucun paiement n&apos;est possible aujourd&apos;hui.
      </p>
    </MarketingShell>
  );
}

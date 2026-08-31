import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import MarketingShell from "@/components/seo/MarketingShell";
import { CHIFFRES_PUBLICS } from "@/lib/chiffresPublics";

/**
 * /a-propos : la page qui explique l'entité Vaiiya.
 *
 * Elle existe parce qu'aucune page publique ne répondait à « c'est quoi
 * Vaiiya, et qui le fait ». Les cinq pages vitrine répondent à des questions
 * d'entraînement, la landing montre le produit, /premium donne les prix :
 * l'entité elle-même n'était décrite nulle part ailleurs que dans une donnée
 * structurée, que personne ne lit.
 *
 * Deux règles ont tenu la rédaction (voir `docs/positionnement-public-vaiiya.md`) :
 * on n'écrit que ce qu'un inconnu peut vérifier en créant un compte, et
 * l'histoire s'arrête exactement là où s'arrêtent les faits communiqués par le
 * fondateur. Aucun prénom, aucun nom, aucun chiffre d'utilisateurs, aucune
 * structure juridique tant qu'elle n'existe pas.
 *
 * Elle passe par `MarketingShell` : même en-tête, même colonne, même pied de
 * page que les cinq autres pages vitrine. Une page « à propos » qui ne
 * ressemble à rien d'autre sur le site se lit comme une page ajoutée après
 * coup, ce qu'elle est précisément censée ne pas être.
 */

export const metadata: Metadata = {
  title: "À propos de Vaiiya",
  description:
    "Vaiiya est une application web française d’entraînement et de nutrition où l’entraînement, les repas, l’assistant IA et la progression communiquent. Son histoire, ce qu’elle contient et où elle va.",
  alternates: { canonical: "https://vaiiya.fr/a-propos" },
  openGraph: {
    title: "À propos de Vaiiya",
    description:
      "Une application web française d’entraînement et de nutrition, où chaque partie communique avec les autres. Développée par deux lycéens en région lyonnaise.",
    url: "https://vaiiya.fr/a-propos",
    images: ["/og-image.png"],
  },
};

/* Les liens que fait Vaiiya, tels qu'ils existent dans le produit. Chacun est
   vérifiable : une séance terminée crédite bien la mission et l'EXP, et
   l'assistant lit bien le planning et les repas avant de proposer. */
const LIENS = [
  {
    t: "Une séance terminée ne s’arrête pas à la séance",
    d: "Elle coche ta mission du jour, ajoute ton EXP, fait monter ton rang et avance ta semaine. Il n’y a rien à recopier ailleurs.",
  },
  {
    t: "L’assistant sait ce que tu as déjà fait",
    d: "Il connaît ton profil, ton planning, tes repas notés et tes statistiques. C’est ce qui lui permet de proposer une semaine qui tient dans la tienne, plutôt qu’un programme générique.",
  },
  {
    t: "Un repas noté en parlant arrive au bon endroit",
    d: "Tu dis à l’assistant ce que tu as mangé, il l’estime et te le montre. Une fois validé, il rejoint ta nutrition, pas un carnet séparé.",
  },
  {
    t: "Le défi à deux se nourrit de tes vraies séances",
    d: "Le relais avance quand une séance est réellement terminée, et il se joue dans la messagerie privée. Aucun classement, aucun fil public.",
  },
];

const PORTES = [
  { t: "Suivre une séance du catalogue", d: "Elle est prête, tu appuies, elle démarre." },
  { t: "Construire entièrement la tienne", d: "Tu pioches dans la bibliothèque de mouvements, tu règles les séries, les répétitions et le repos." },
  { t: "La demander à l’assistant", d: "Tu écris ce que tu veux, il propose une séance sur une carte, tu la gardes ou non." },
  { t: "Improviser", d: "Tu commences sans rien préparer, et tu peux garder la séance à la fin si elle t’a plu." },
];

export default function AProposPage() {
  const c = CHIFFRES_PUBLICS;

  const donneesStructurees = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": "https://vaiiya.fr/a-propos#page",
    url: "https://vaiiya.fr/a-propos",
    name: "À propos de Vaiiya",
    inLanguage: "fr-FR",
    description:
      "Ce qu’est Vaiiya, pourquoi ses différentes dimensions sont reliées, et comment le projet a commencé.",
    isPartOf: { "@id": "https://vaiiya.fr/#website" },
    // La page parle de l'éditeur et de l'application déjà décrits dans le
    // layout racine. On les référence, on ne les redéclare pas : deux
    // descriptions concurrentes de la même entité valent moins qu'une seule.
    about: [
      { "@id": "https://vaiiya.fr/#organization" },
      { "@id": "https://vaiiya.fr/#application" },
    ],
  };

  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(donneesStructurees) }}
      />

      <h1>À propos de Vaiiya</h1>
      <p className="lead">
        Vaiiya est une <strong>application web française d&apos;entraînement et de nutrition</strong>, où
        l&apos;entraînement, les repas, l&apos;assistant et la progression ne sont pas quatre outils côte à
        côte, mais un seul parcours dont les parties se parlent. Elle s&apos;utilise dans un navigateur, sur
        téléphone comme sur ordinateur, et le compte est gratuit.
      </p>

      <h2>Pourquoi tout est relié</h2>
      <p>
        Le sport et l&apos;alimentation se vivent dans la même journée. Les séparer en trois applications
        oblige à recopier d&apos;un endroit à l&apos;autre, et personne ne recopie longtemps. C&apos;est le
        point de départ de Vaiiya&nbsp;: une seule source par information, et des parties qui se
        préviennent entre elles.
      </p>
      <ul>
        {LIENS.map((l) => (
          <li key={l.t}>
            <strong>{l.t}.</strong> {l.d}
          </li>
        ))}
      </ul>

      <h2>Le logo</h2>
      <figure
        style={{
          margin: "1.5rem 0 1.25rem",
          padding: "2rem 1.5rem",
          borderRadius: "1.5rem",
          background: "rgba(255,255,255,0.72)",
          border: "1px solid rgba(167,139,250,0.16)",
          textAlign: "center",
        }}
      >
        <Image
          src="/marque/marque-noir.png"
          alt="La marque Vaiiya : deux courbes qui descendent et se rejoignent en un seul point."
          width={128}
          height={112}
          style={{ display: "inline-block", height: "auto", maxWidth: "100%" }}
        />
      </figure>
      <p>
        Les éléments de la marque descendent séparément, se rapprochent, et finissent réunis en un point
        unique. C&apos;est la même idée que le produit&nbsp;: plusieurs dimensions qui convergent au lieu de
        cohabiter.
      </p>

      <h2>Quatre façons de s&apos;entraîner</h2>
      <p>
        Vaiiya n&apos;est pas un catalogue fermé, et l&apos;assistant n&apos;est pas un passage obligé.
        Selon le jour, tu peux&nbsp;:
      </p>
      <ul>
        {PORTES.map((p) => (
          <li key={p.t}>
            <strong>{p.t}.</strong> {p.d}
          </li>
        ))}
      </ul>
      <p>
        Dans les quatre cas, la séance se déroule de la même façon&nbsp;: un écran qui ne dit qu&apos;une
        chose à la fois, le mouvement suivant, montré par un personnage animé. Ces mouvements se regardent
        aussi librement, sans compte, dans les <Link href="/exercices">fiches d&apos;exercices</Link>.
      </p>

      <h2>Comment le projet a commencé</h2>
      {/* Ni âges ni structure juridique ici : cette page est evergreen, et les
          deux vieillissent. Un âge devient faux à un anniversaire, une structure
          « en cours de création » devient fausse le jour où elle existe. Les
          deux vivent dans `docs/positionnement-public-vaiiya.md` comme des
          instantanés datés, à revalider avant tout usage externe. */}
      <p>
        Vaiiya a démarré le <strong>1er mai 2026</strong>. Le projet est développé par{" "}
        <strong>deux lycéens de la région lyonnaise</strong>, en parallèle du lycée.
      </p>
      <p>
        L&apos;idée de départ, un coach sportif guidé par une intelligence artificielle, a elle-même été
        suggérée par une IA. Le point d&apos;arrivée a peu à voir avec ce point de départ&nbsp;: à force de
        construire, la question n&apos;était plus «&nbsp;comment faire un coach IA&nbsp;» mais «&nbsp;pourquoi
        faut-il trois applications et deux carnets pour suivre une semaine d&apos;entraînement&nbsp;». C&apos;est
        de cette question qu&apos;est venu le reste, et c&apos;est ce qui tient encore quand on enlève le mot
        IA.
      </p>
      <p>
        Le projet avance étape par étape, avec une ambition entrepreneuriale assumée. Aujourd&apos;hui,
        Vaiiya est entièrement gratuit et rien n&apos;est encaissé.
      </p>

      <h2>Ce qu&apos;il y a dedans aujourd&apos;hui</h2>
      <p>
        Rien de tout cela n&apos;est une promesse&nbsp;: c&apos;est ce qui est en ligne au moment où tu lis
        cette page.
      </p>
      <ul>
        <li>
          <strong>{c.mouvements} mouvements</strong>, tous montrés par un personnage animé, avec leurs
          muscles et leur consigne.
        </li>
        <li>
          <strong>{c.seances} séances guidées</strong>, du sans-matériel à la salle, de la mobilité à la
          récupération.
        </li>
        <li>
          <strong>{c.miniCours} mini-cours</strong>{" "}pour comprendre l&apos;entraînement, la récupération et
          la nutrition sans jargon.
        </li>
        <li>
          <strong>{c.recettes} recettes</strong> écrites et photographiées, avec leurs macros par portion.
        </li>
        <li>
          <strong>{c.fiches} fiches d&apos;exercices publiques</strong>, lisibles sans créer de compte.
        </li>
      </ul>

      <h2>Où va Vaiiya</h2>
      <p>
        Ce paragraphe décrit une intention, pas des fonctionnalités à venir. Vaiiya continuera d&apos;intégrer
        les évolutions techniques qui apportent un bénéfice réel à l&apos;utilisateur, et seulement
        celles-là&nbsp;: la question posée à chaque ajout est de savoir si quelqu&apos;un revient plus
        facilement le lendemain, pas si la technologie est impressionnante.
      </p>
      <p>
        Trois limites ne bougeront pas. La progression reste <strong>personnelle</strong>&nbsp;: pas de
        classement, aucune comparaison entre utilisateurs. L&apos;assistant <strong>propose et ne décide
        pas</strong>&nbsp;: rien ne s&apos;enregistre sans un accord. Et Vaiiya n&apos;est{" "}
        <strong>pas un service de santé</strong>&nbsp;: ce qu&apos;il donne, ce sont des repères, jamais un
        avis médical.
      </p>
      <p>
        Pour voir ce que ça donne concrètement, le plus simple reste de commencer&nbsp;: le{" "}
        <Link href="/coach-ia">coach IA</Link>, la <Link href="/nutrition-sportive">nutrition sportive</Link>{" "}
        et l&apos;offre <Link href="/premium">Premium</Link> ont chacune leur page.
      </p>
    </MarketingShell>
  );
}

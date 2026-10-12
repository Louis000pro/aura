/**
 * LandingVitrine : le haut de vaiiya.fr (visiteur non connecté).
 *
 * Maquette validée par Louis le 2026-10-12 (`docs/maquettes/page-vitrine.html`,
 * direction A « La lumière du matin » en tête, puis le chemin de la direction B
 * « Dans trois mois »). La page vend ce que Vaiiya change dans une vie, pas un
 * exercice : une identité (« Deviens la personne qui y va »), puis le chemin
 * pour y arriver, puis la journée, les rangs, et ce qui est relié.
 *
 * ⚠️ DÉCISIONS DE LOUIS À NE PAS DÉFAIRE.
 *   · Toujours CLAIRE à l'entrée. Les couleurs de ces sections sont écrites en
 *     dur exprès : elles ne suivent pas le mode sombre de l'app.
 *   · Les photos marquées « vitrine » (`/public/vitrine/`) sont retouchées aux
 *     couleurs du logo (violet, rose, jaune). C'est une EXCEPTION réservée à
 *     cette page : dans l'app, les photos de séance restent naturelles.
 *   · Le dégradé des mots d'accent est celui du LOGO (`DEGRADE_LOGO`), pas le
 *     violet → magenta des boutons, qui reste la couleur d'action.
 *
 * ⚠️ POSITIONNEMENT PUBLIC (`docs/positionnement-public-vaiiya.md`) : aucun
 * chiffre d'utilisateurs, aucun faux avis, aucune promesse sur le corps. Le
 * chemin du jour 1 au mois 3 est présenté comme un EXEMPLE de parcours, et les
 * bulles posées sur la photo décrivent l'app, pas une personne réelle.
 */

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RANGS } from "@/lib/aura";
import { PLANS, formatPrice } from "@/lib/plans";
import type { ChiffresPublics } from "@/lib/chiffresPublics";
import styles from "./LandingVitrine.module.css";

/** Ancre de la section qui suit le héros (le lien « Voir ce qu'il y a dedans »). */
export const DISCOVER_ANCHOR = "decouvrir";

/** Le dégradé du logo, de haut en bas : violet, rose, pêche. */
const DEGRADE_LOGO = "linear-gradient(120deg,#A66CF4 0%,#E68FC6 52%,#FEB86E 100%)";
const MOT_ACCENT: React.CSSProperties = {
  backgroundImage: DEGRADE_LOGO,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};
const ACTION_BG = "linear-gradient(135deg,#8B5CF6 0%,#C13BC1 100%)";

const ENCRE = "#1C1626";
const ENCRE_2 = "#5C5468";
const ENCRE_3 = "#7B7389";
const CUIVRE = "#B4570C";

function BoutonPrincipal({ label, href = "/auth?mode=signup" }: { label: string; href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-[18px] px-6 py-4 text-[16px] font-bold text-white transition-transform active:scale-[.98]"
      style={{ background: ACTION_BG, boxShadow: "0 14px 30px -12px rgba(139,92,246,.75)" }}
    >
      {label}
      <ArrowRight size={17} strokeWidth={2.4} />
    </Link>
  );
}

function Surtitre({ children }: { children: React.ReactNode }) {
  return <p className="mb-2.5 text-[13px] font-bold" style={{ color: CUIVRE }}>{children}</p>;
}

function Titre({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2
      className={`text-[34px] md:text-[46px] leading-[1.02] ${className}`}
      style={{ color: ENCRE, fontWeight: 850, fontVariationSettings: "var(--w-voix)", textWrap: "balance", letterSpacing: "-0.015em" }}
    >
      {children}
    </h2>
  );
}

/* ═══════════════ 1 · LE HÉROS ═══════════════ */

function Heros() {
  return (
    <section className={styles.haut}>
      <nav className={styles.nav}>
        <span className="flex items-center gap-2 text-[20px] font-light tracking-[0.14em]" style={{ color: ENCRE }}>
          <Image src="/marque/logo-degrade.png" alt="" width={34} height={34} priority className={styles.logo} />
          Vaiiya
        </span>
        <Link href="/auth?mode=login" className={styles.connexion}>Se connecter</Link>
      </nav>

      <div className={styles.photo}>
        <Image
          src="/vitrine/coureuse-aube.webp"
          alt="Une coureuse monte des marches au lever du soleil"
          fill
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
          style={{ objectPosition: "center 30%" }}
        />
        <span className={`${styles.bulle} ${styles.b1}`}>
          <i style={{ background: "#FFF0E2" }}>🔥</i>
          <span><b className="vy-nombre">21</b> jours de suite</span>
        </span>
        <span className={`${styles.bulle} ${styles.b2}`}>
          <Image src="/rangs/rank-03-or.png" alt="" width={30} height={30} />
          <span>Rang <b>Or</b> atteint</span>
        </span>
        <span className={`${styles.bulle} ${styles.b3}`}>
          <i style={{ background: "#F1EBFF", color: "#7C4FE0" }}>✦</i>
          <span>Séance du jour faite <b style={{ color: "#0B8A68" }}>✓</b></span>
        </span>
      </div>

      <div className={styles.mots}>
        <p className="mb-3 text-[13px] font-semibold" style={{ color: ENCRE_3 }}>
          Entraînement, nutrition et assistant IA, en français
        </p>
        <h1
          className="text-[44px] md:text-[68px] leading-[.95]"
          style={{ color: ENCRE, fontWeight: 900, fontVariationSettings: "var(--w-voix)", letterSpacing: "-0.025em", textWrap: "balance" }}
        >
          Deviens la personne <span style={MOT_ACCENT}>qui y va.</span>
        </h1>
        <p className="mt-4 mb-6 max-w-[38ch] text-[16px] leading-relaxed" style={{ color: ENCRE_2 }}>
          Tes séances, tes repas et un assistant qui te connaît, réunis dans une seule appli.
          Jusqu’au jour où t’entraîner ne demande plus d’effort pour commencer.
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <BoutonPrincipal label="Commencer gratuitement" />
          <a href={`#${DISCOVER_ANCHOR}`} className="px-1.5 py-3 text-[16px] font-semibold" style={{ color: "#5B3FC4" }}>
            Voir ce qu’il y a dedans
          </a>
        </div>
        <p className="mt-3 text-[13px]" style={{ color: ENCRE_3 }}>
          Gratuit, sans carte bancaire. Ta première séance dure 12 minutes.
        </p>
      </div>
    </section>
  );
}

/* ═══════════════ 2 · LE CHEMIN (direction B) ═══════════════ */

type Etape = {
  quand: string;
  titre: string;
  texte: string;
  photo: string;
  repere: { image: string; affiche?: boolean };
  pastilles: { texte: string; ton: "violet" | "feu" | "teal" }[];
};

const ETAPES: Etape[] = [
  {
    quand: "Jour 1",
    titre: "12 minutes dans ton salon.",
    texte: "Ta première séance, sans matériel. Tu la fais en entier.",
    photo: "/entrainement/cat-sansmateriel.webp",
    repere: { image: "/rangs/rank-01-bronze.png" },
    pastilles: [{ texte: "+30 EXP", ton: "violet" }, { texte: "Bronze", ton: "violet" }],
  },
  {
    quand: "Semaine 2",
    titre: "Ta série tient, même les jours chargés.",
    texte: "Une séance ou un repas noté suffit pour la garder.",
    photo: "/entrainement/cardio-saut.webp",
    repere: { image: "/rangs/rank-02-argent.png" },
    pastilles: [{ texte: "🔥 10 jours", ton: "feu" }, { texte: "Argent", ton: "violet" }],
  },
  {
    quand: "Mois 1",
    titre: "Tu entraînes un ami avec toi.",
    texte: "Votre relais révèle une affiche, séance après séance.",
    photo: "/vitrine/course-ville.webp",
    repere: { image: "/defis/sillage/04.webp", affiche: true },
    pastilles: [{ texte: "Relais gagné ✓", ton: "teal" }],
  },
  {
    quand: "Mois 3",
    titre: "Tu y vas sans te poser la question.",
    texte: "C’est devenu une partie de toi.",
    photo: "/vitrine/coureuse-aube.webp",
    repere: { image: "/rangs/rank-03-or.png" },
    pastilles: [{ texte: "Or", ton: "violet" }, { texte: "🔥 63 jours", ton: "feu" }],
  },
];

const TON_PASTILLE = {
  violet: { background: "#F3EEFF", color: "#5B3FC4" },
  feu: { background: "#FFF0E2", color: CUIVRE },
  teal: { background: "#E3FAF2", color: "#0B7A5C" },
};

function Chemin() {
  return (
    <section id={DISCOVER_ANCHOR} className={`${styles.chemin} scroll-mt-6`}>
      <div className={styles.soleil} aria-hidden />
      <div className="relative mx-auto max-w-[1140px] px-5 md:px-11 text-center">
        <Surtitre>Dans trois mois</Surtitre>
        <Titre className="mx-auto max-w-[16ch]">
          Tu iras t’entraîner <span style={MOT_ACCENT}>sans y penser.</span>
        </Titre>
        <p className="mx-auto mt-3 max-w-[40ch] text-[16px]" style={{ color: ENCRE_2 }}>
          Vaiiya transforme l’envie en habitude : une séance à ta mesure, des repas suivis, et quelqu’un pour te relancer au bon moment.
        </p>

        <ol className={styles.route}>
          {ETAPES.map((e, i) => (
            <li key={e.quand} className={styles.etape} data-derniere={i === ETAPES.length - 1 || undefined}>
              <span className={styles.repere} data-affiche={e.repere.affiche || undefined}>
                <Image src={e.repere.image} alt="" width={e.repere.affiche ? 40 : 46} height={e.repere.affiche ? 56 : 46} />
              </span>
              <div className={styles.carte}>
                <div className="relative aspect-[16/9]">
                  <Image src={e.photo} alt="" fill sizes="(min-width: 768px) 25vw, 80vw" className="object-cover" />
                </div>
                <div className="px-4 pt-3.5 pb-4 text-left">
                  <span className="vy-nombre text-[13px] font-semibold" style={{ color: CUIVRE }}>{e.quand}</span>
                  <h3 className="mt-1 text-[20px] leading-[1.15]" style={{ color: ENCRE, fontWeight: 850, fontVariationSettings: "var(--w-voix)" }}>
                    {e.titre}
                  </h3>
                  <p className="mt-1 text-[13px]" style={{ color: ENCRE_2 }}>{e.texte}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {e.pastilles.map((p) => (
                      <span key={p.texte} className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={TON_PASTILLE[p.ton]}>
                        {p.texte}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-[13px]" style={{ color: ENCRE_3 }}>
          Exemple de parcours. Le tien ira à ton rythme, et c’est très bien comme ça.
        </p>
      </div>
    </section>
  );
}

/* ═══════════════ 3 · UNE JOURNÉE ═══════════════ */

const MOMENTS = [
  { quand: "Le matin", texte: "Ta séance t’attend, prête, à ta mesure.", photo: "/entrainement/cat-debuter.webp" },
  { quand: "À midi", texte: "Une photo de ton assiette, et c’est noté.", photo: "/recipes/poke-bowl-saumon-avocat.jpg" },
  { quand: "Le soir", texte: "Tu vois le chemin que tu as fait.", photo: "/vitrine/bras-leves.webp" },
];

function Journee() {
  return (
    <section className="mx-auto max-w-[1140px] px-5 md:px-11 py-14">
      <Surtitre>Une journée avec Vaiiya</Surtitre>
      <Titre>Tu n’as plus à te demander quoi faire.</Titre>
      <div className="mt-6 grid gap-3.5 md:grid-cols-3">
        {MOMENTS.map((m) => (
          <div key={m.quand} className="relative aspect-[4/5] overflow-hidden rounded-[26px]">
            <Image src={m.photo} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-16 text-white"
              style={{ background: "linear-gradient(to top, rgba(28,14,6,.72), transparent)" }}>
              <span className="text-[11px] font-bold uppercase tracking-[0.06em] opacity-85">{m.quand}</span>
              <p className="mt-1 text-[20px] leading-[1.1]" style={{ fontWeight: 850, fontVariationSettings: "var(--w-voix)" }}>
                {m.texte}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════ 4 · LES RANGS ═══════════════ */

function Rangs() {
  return (
    <section className="mx-auto max-w-[1140px] px-5 md:px-11 pb-14">
      <Surtitre>Ta progression</Surtitre>
      <Titre>Six rangs. Chacun se mérite en revenant.</Titre>
      <p className="mt-3 max-w-[44ch] text-[16px]" style={{ color: ENCRE_2 }}>
        Chaque séance et chaque repas noté te rapportent de l’EXP. Personne contre qui te comparer : tu montes à ton rythme.
      </p>
      <div className="mt-6 overflow-x-auto rounded-[28px] bg-white px-3.5 py-5" style={{ boxShadow: "0 24px 50px -36px rgba(120,60,10,.4)" }}>
        <ol className="grid min-w-[420px] grid-cols-6 items-end gap-1.5">
          {RANGS.filter((r) => r.image).map((r, i) => {
            const taille = 40 + i * 6;
            return (
              <li key={r.id} className="flex flex-col items-center gap-1 text-center">
                <Image src={r.image!} alt="" width={taille} height={taille}
                  style={{ width: taille, height: taille, objectFit: "contain", filter: "drop-shadow(0 8px 12px rgba(80,40,120,.25))" }} />
                <b className="text-[13px]" style={{ color: ENCRE }}>{r.nom}</b>
                <span className="vy-nombre text-[11px]" style={{ color: ENCRE_3 }}>{i === 0 ? "0 EXP" : r.min}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ═══════════════ 5 · TOUT AU MÊME ENDROIT ═══════════════ */

function ToutRelie({ chiffres }: { chiffres: ChiffresPublics }) {
  const lignes = [
    { titre: `${chiffres.seances} séances guidées`, texte: "À la maison ou à la salle, montrées mouvement par mouvement.", photo: "/entrainement/cardio-saut.webp" },
    { titre: "La tienne, composée en deux minutes", texte: `Parmi ${chiffres.mouvements} mouvements animés.`, photo: "/entrainement/cat-renfo.webp" },
    { titre: "Tes repas, sans prise de tête", texte: "Photo de l’assiette, recette avec tes restes, carte du resto.", photo: "/recipes/avocado-toast.jpg" },
    { titre: "Un assistant qui agit", texte: "Il prépare, tu valides. Rien ne s’écrit sans ton accord.", photo: "/guides/nora-explain-avatar-v1.webp" },
  ];
  return (
    <section className="mx-auto max-w-[1140px] px-5 md:px-11 pb-14">
      <Surtitre>Tout au même endroit</Surtitre>
      <Titre>Et tout se parle.</Titre>
      <div className="mt-6 grid gap-2.5 md:grid-cols-2">
        {lignes.map((l) => (
          <div key={l.titre} className="flex items-center gap-3.5 rounded-[20px] bg-white p-3" style={{ boxShadow: "0 1px 2px rgba(60,30,10,.06)" }}>
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-[14px]" style={{ background: "#F1EBFF" }}>
              <Image src={l.photo} alt="" fill sizes="64px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <b className="block text-[16px]" style={{ color: ENCRE }}>{l.titre}</b>
              <span className="text-[13px]" style={{ color: ENCRE_2 }}>{l.texte}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════ 6 · LE RELAIS ET VAIIYA+ ═══════════════ */

function Relais() {
  return (
    <section className="mx-auto grid max-w-[1140px] items-center gap-5 px-5 md:grid-cols-2 md:px-11 pb-16">
      <div className="flex gap-2.5">
        {["/defis/sillage/02.webp", "/defis/sillage/04.webp"].map((src) => (
          <div key={src} className="relative aspect-[9/16] w-1/2 overflow-hidden rounded-[18px]" style={{ boxShadow: "0 20px 40px -24px rgba(40,20,80,.5)" }}>
            <Image src={src} alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover" />
          </div>
        ))}
      </div>
      <div>
        <Surtitre>À deux, c’est plus facile</Surtitre>
        <Titre>Le relais : une affiche qui se révèle à chaque séance.</Titre>
        <p className="mt-3 max-w-[44ch] text-[16px]" style={{ color: ENCRE_2 }}>
          Lance-le avec un ami. Quatre séances à vous deux dans la semaine, et l’affiche est à vous.
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-[22px] px-5 py-4"
          style={{ background: "linear-gradient(135deg,#FFF3D6,#FBE6FF)" }}>
          <div>
            <b className="block text-[16px]" style={{ color: ENCRE }}>Vaiiya+ arrive bientôt</b>
            <span className="text-[13px]" style={{ color: ENCRE_2 }}>Le compte gratuit garde les séances, les mouvements et les rangs, sans pub.</span>
          </div>
          <Link href="/premium" className="vy-nombre whitespace-nowrap text-[20px] font-bold" style={{ color: "#8A5A06" }}>
            {formatPrice(PLANS.premium.priceCents)}/mois
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function LandingVitrine({ chiffres }: { chiffres: ChiffresPublics }) {
  return (
    <div className={styles.page}>
      <Heros />
      <Chemin />
      <Journee />
      <Rangs />
      <ToutRelie chiffres={chiffres} />
      <Relais />
    </div>
  );
}

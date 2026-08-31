"use client";

/**
 * LandingStory : la présentation qui scrolle sous le hero de vaiiya.fr.
 *
 * Principe : « la preuve, pas la promesse ». On ne montre que des mécaniques
 * RÉELLES du produit, avec les VRAIS visuels (photos naturelles du catalogue,
 * sprites du tunnel, badges de rang, affiches de relais). Aucune fausse
 * statistique, aucun faux témoignage, aucune fausse interface sociale.
 *
 * Le morceau central est `TunnelPhone` : une réplique fidèle de l'écran de
 * séance réel (barre segmentée, chrono, personnage-guide animé sur ses vraies
 * frames, séries, coup de pouce, bouton violet). Si le tunnel change dans
 * l'app, c'est ici qu'il faut le refléter.
 *
 * ADN visuel : système « D ». Violet = action, or = énergie, teal = corps et
 * progrès. Tout passe par les tokens (`var(--text-*)`, `var(--accent)`,
 * `rgba(var(--surface-rgb),…)`, classes `lg-*`) pour que le mode sombre suive.
 */

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Camera, Sparkles, ArrowRight, Check, Play, Plus, ChevronDown, X, ShieldCheck,
} from "lucide-react";
import { AssistantAvatar, AssistantSpark } from "@/components/AssistantMark";
import { SEO_PAGES, LEGAL_PAGES } from "@/lib/seoPages";
import { RANGS } from "@/lib/aura";
/* Le type seul. Les nombres sont comptés côté serveur et descendus en props :
   voir `lib/chiffresPublics.ts`. */
import type { ChiffresPublics } from "@/lib/chiffresPublics";

/* Couleur d'action du système D : violet vers magenta. Le CTA principal est
   TOUJOURS violet (jamais violet vers or). Constante de marque, stable clair/sombre. */
const ACTION_BG = "linear-gradient(135deg,#8B5CF6 0%,#C13BC1 100%)";
/* Même dégradé, en texte, pour les mots d'accent. */
const ACCENT_TEXT: React.CSSProperties = {
  backgroundImage: ACTION_BG,
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  color: "transparent",
};
const TEAL = "#2BD4A0"; // corps, progrès, réussite
const GOLD = "#FFB020"; // énergie : calories, effort, série

const EASE = [0.22, 1, 0.36, 1] as const;

/** Ancre de la 1re section, partagée avec le bouton « Voir Vaiiya en action » du hero. */
export const DISCOVER_ANCHOR = "decouvrir";

/* ── Révélation au scroll (une seule fois) ── */
function Reveal({
  children, delay = 0, y = 28, className,
}: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Sur-titre de section ── */
function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase"
      style={{ letterSpacing: "0.24em", color: dark ? "#BFA9FF" : "var(--text-3)" }}
    >
      <span className="inline-block h-px w-6"
        style={{ background: `linear-gradient(90deg, transparent, ${dark ? "#BFA9FF" : "var(--accent)"})` }} />
      {children}
      <span className="inline-block h-px w-6"
        style={{ background: `linear-gradient(90deg, ${dark ? "#FFCE7A" : "var(--gold)"}, transparent)` }} />
    </span>
  );
}

/* ── Titre de section ── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-6 text-[clamp(1.9rem,4.6vw,3rem)] font-extralight tracking-tight leading-[1.12]"
      style={{ color: "var(--text-0)" }}>
      {children}
    </h2>
  );
}

/* ── Bouton d'action principal (violet) ── */
function CtaPrimary({ label, href = "/auth?mode=signup", big = false }: { label: string; href?: string; big?: boolean }) {
  return (
    <Link href={href}>
      <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
        className="relative inline-flex items-center gap-2 cursor-pointer overflow-hidden rounded-full font-semibold text-white"
        style={{
          padding: big ? "17px 36px" : "13px 26px",
          fontSize: big ? 16 : 14,
          background: ACTION_BG,
          boxShadow: "0 14px 36px rgba(139,92,246,0.42), inset 0 1px 0 rgba(255,255,255,0.28)",
        }}>
        <motion.div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.32) 50%,transparent 65%)" }}
          animate={{ x: ["-120%", "120%"] }} transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.8 }} />
        <span className="relative z-10">{label}</span>
        <ArrowRight size={big ? 17 : 15} strokeWidth={2.4} className="relative z-10" />
      </motion.div>
    </Link>
  );
}

/* ── Pied de page : une entrée, puis une colonne ── */
function FooterLien({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link href={href} className="text-[13px] font-light hover:opacity-70" style={{ color: "var(--text-2)" }}>
        {label}
      </Link>
    </li>
  );
}

function FooterCol({ titre, liens }: { titre: string; liens: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: "var(--text-3)" }}>{titre}</p>
      <ul className="space-y-2">
        {liens.map((l) => <FooterLien key={l.href} href={l.href} label={l.label} />)}
      </ul>
    </div>
  );
}

/* ── Bouton secondaire (verre) ── */
function CtaGhost({ label, href }: { label: string; href: string }) {
  return (
    <Link href={href}>
      <span className="inline-flex items-center gap-1.5 px-5 py-3 rounded-full text-[14px] font-medium cursor-pointer lg-surface"
        style={{ color: "var(--text-body)", border: "1px solid rgba(var(--accent-rgb),0.25)" }}>
        {label}
      </span>
    </Link>
  );
}

/* ════════════════════════════ 1 · CE QU'EST VAIIYA ════════════════════════════ */

function SectionQuoi({ chiffres }: { chiffres: ChiffresPublics }) {
  /* Les nombres viennent du serveur (`lib/chiffresPublics.ts`), qui compte les
     mini-cours et les mouvements dans leurs vraies sources. Les séances, elles,
     sont encore comptées à la main : le catalogue vit dans un composant de page,
     pas dans un module de données. Le détail est écrit là-bas. */
  const preuves = [
    { n: chiffres.seances, label: "séances guidées" },
    { n: chiffres.miniCours, label: "mini-cours" },
    { n: chiffres.mouvements, label: "mouvements montrés" },
  ];

  return (
    <section id={DISCOVER_ANCHOR} className="relative px-6 py-24 md:py-32 scroll-mt-10">
      <div className="max-w-3xl mx-auto text-center">
        <Reveal><Eyebrow>C&rsquo;est quoi Vaiiya</Eyebrow></Reveal>
        <Reveal delay={0.06}>
          <SectionTitle>
            Tout ton sport,{" "}
            <span style={ACCENT_TEXT}>relié dans une seule app</span>.
          </SectionTitle>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mt-7 text-base md:text-lg font-light leading-relaxed max-w-xl mx-auto" style={{ color: "var(--text-2)" }}>
            Un vrai catalogue de séances guidées, ta nutrition comprise d&rsquo;une photo, un assistant qui agit
            et un rang qui monte à chaque effort. Une seule app pour t&rsquo;entraîner, manger mieux et tenir dans le temps.
          </p>
        </Reveal>

        {/* Preuves de profondeur. */}
        <Reveal delay={0.18}>
          <div className="mt-12 grid grid-cols-3 gap-3 max-w-lg mx-auto">
            {preuves.map((p) => (
              <div key={p.label} className="rounded-[22px] p-4 lg-surface lg-highlight">
                <p className="text-[clamp(1.8rem,6vw,2.6rem)] font-extralight leading-none" style={ACCENT_TEXT}>{p.n}</p>
                <p className="mt-2 text-[12px] font-medium leading-tight" style={{ color: "var(--text-3)" }}>{p.label}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Le fil rouge « tout connecté », en une phrase plutôt qu'en cartes. */}
        <Reveal delay={0.24}>
          <p className="mt-10 text-[15px] font-light leading-relaxed max-w-lg mx-auto" style={{ color: "var(--text-3)" }}>
            Et tout communique : une séance terminée coche ta mission du jour, ajoute ton EXP et fait avancer
            ta semaine. Rien à recopier ailleurs.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════ 2 · LE CATALOGUE ════════════════════════════ */

const CATALOGUE = [
  { img: "/entrainement/cat-sansmateriel.webp", tag: "Pour commencer", title: "Full Body Débutant", meta: "25 min · Sans matériel", premium: false },
  { img: "/entrainement/cat-salle.webp", tag: "Salle", title: "Force Haut du Corps", meta: "40 min · Renforcement", premium: false },
  { img: "/entrainement/cat-mobilite.webp", tag: "Mobilité", title: "Mobilité Matinale", meta: "12 min · Tous niveaux", premium: false },
  { img: "/entrainement/cat-masse.webp", tag: "Premium", title: "Prise de masse", meta: "Programmes spécialisés", premium: true },
];

function SectionCatalogue() {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <Reveal><Eyebrow>Le catalogue</Eyebrow></Reveal>
          <Reveal delay={0.06}>
            <SectionTitle>
              Une vraie séance <span style={ACCENT_TEXT}>pour chaque moment</span>.
            </SectionTitle>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-6 text-base md:text-lg font-light max-w-xl mx-auto leading-relaxed" style={{ color: "var(--text-2)" }}>
              Sans matériel, à la salle, en mobilité ou en récupération. Une base gratuite solide pour démarrer,
              et Premium quand tu veux les formats spécialisés.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATALOGUE.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.06}>
              <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.3, ease: EASE }}
                className="relative rounded-[22px] overflow-hidden lg-highlight"
                style={{ border: c.premium ? "1px solid rgba(var(--accent-rgb),0.5)" : "1px solid rgba(var(--surface-rgb),0.7)" }}>
                <div className="relative w-full" style={{ aspectRatio: "3 / 4" }}>
                  <Image src={c.img} alt={c.title} fill sizes="(max-width:768px) 45vw, 22vw" style={{ objectFit: "cover" }} />
                  <div className="absolute inset-x-0 bottom-0 h-2/3" style={{ background: "linear-gradient(to top, rgba(10,6,20,0.82), transparent)" }} />
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                    style={c.premium
                      ? { background: ACTION_BG, color: "#fff" }
                      : { background: "rgba(255,255,255,0.9)", color: "#2D2150" }}>
                    {c.tag}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="text-[13px] font-semibold text-white leading-tight">{c.title}</p>
                    <p className="text-[11px] font-light mt-0.5" style={{ color: "rgba(255,255,255,0.82)" }}>{c.meta}</p>
                  </div>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-10 text-center">
            <CtaGhost label="Voir tout le catalogue" href="/auth?mode=signup" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════ 2 bis · COMPOSER SA SÉANCE ════════════════════════════
   La page montrait un catalogue et un assistant, donc elle décrivait un produit
   où l'on choisit parmi ce qui existe ou l'on demande à l'IA. La troisième porte
   manquait : construire sa séance soi-même, mouvement par mouvement. C'est une
   fonctionnalité importante (voir `docs/positionnement-public-vaiiya.md`, §4), et
   c'est aussi le seul endroit où les mouvements animés comptés plus haut servent
   à quelque chose de visible.

   Elle est posée juste après le catalogue : on montre d'abord ce qui est prêt,
   ensuite on dit qu'on n'y est pas enfermé. Le panneau reprend la vraie
   bibliothèque de l'application, avec ses vrais sprites.
   ───────────────────────────────────────────────────────────────────── */

const PORTES = [
  { t: "Suivre une séance", d: "Le catalogue est prêt, tu appuies et elle démarre." },
  { t: "Composer la tienne", d: "Tu choisis les mouvements, tu règles séries, répétitions et repos." },
  { t: "La demander à l’✦", d: "Tu dis ce que tu veux, l’assistant propose, tu gardes ou non." },
  { t: "Improviser", d: "Tu commences sans rien préparer, et tu peux garder la séance à la fin." },
];

/* Quatre gestes de la vraie bibliothèque, avec leurs planches livrées. Si l'un
   d'eux change, vérifier que les fichiers existent toujours dans
   `public/entrainement/guides` : une vitrine qui promet des animations ne peut
   pas se permettre une image manquante. */
const MOUVEMENTS_VITRINE = [
  { cle: "squat", genre: "f", poses: 3, nom: "Squat", zone: "Quadriceps · Fessiers", choisi: true },
  { cle: "pompes", genre: "f", poses: 3, nom: "Pompes", zone: "Pectoraux · Triceps", choisi: true },
  { cle: "developpecouche", genre: "h", poses: 3, nom: "Développé couché", zone: "Pectoraux", choisi: true },
  { cle: "fentes", genre: "f", poses: 4, nom: "Fentes", zone: "Quadriceps · Fessiers", choisi: false },
];

function VignetteMouvement({
  m,
  frame,
  index,
}: {
  m: (typeof MOUVEMENTS_VITRINE)[number];
  frame: number;
  index: number;
}) {
  /* Un décalage par vignette : quatre personnages qui bougent à l'unisson
     ressemblent à une animation, quatre qui se répondent ressemblent à une
     bibliothèque. Une seule horloge pour les quatre, en revanche. */
  const pose = ((frame + index) % m.poses) + 1;

  return (
    <div className="relative rounded-[18px] p-2.5 lg-surface"
      style={{ border: "1px solid rgba(var(--accent-rgb),0.14)" }}>
      <div className="relative w-full overflow-hidden rounded-[12px]"
        style={{ aspectRatio: "1 / 1", background: "rgba(var(--accent-rgb),0.06)" }}>
        <Image
          src={`/entrainement/guides/${m.cle}-${m.genre}-${pose}.webp`}
          alt={m.nom}
          fill
          sizes="120px"
          style={{ objectFit: "contain" }}
        />
      </div>
      <p className="mt-2 text-[12px] font-semibold leading-tight truncate" style={{ color: "var(--text-1)" }}>{m.nom}</p>
      <p className="text-[10.5px] font-light leading-tight truncate" style={{ color: "var(--text-3)" }}>{m.zone}</p>

      {/* La pastille : teal quand le mouvement est déjà dans la séance, violet
          quand elle reste à toucher. Système « D », rien d'inventé ici. */}
      <span aria-hidden className="absolute top-3.5 right-3.5 w-[22px] h-[22px] rounded-full flex items-center justify-center"
        style={{ background: m.choisi ? TEAL : ACTION_BG, boxShadow: "0 4px 12px rgba(0,0,0,0.18)" }}>
        {m.choisi
          ? <Check size={12} color="#04150F" strokeWidth={3.5} />
          : <Plus size={13} color="#fff" strokeWidth={3} />}
      </span>
    </div>
  );
}

function PanneauBibliotheque({ mouvements }: { mouvements: number }) {
  const reduce = useReducedMotion();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setFrame((f) => f + 1), 900);
    return () => clearInterval(t);
  }, [reduce]);

  const choisis = MOUVEMENTS_VITRINE.filter((m) => m.choisi).length;

  return (
    <div className="rounded-[30px] overflow-hidden lg-surface lg-highlight"
      style={{ border: "1px solid rgba(var(--accent-rgb),0.16)" }}>

      <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(var(--accent-rgb),0.1)" }}>
        <p className="text-[14px] font-semibold leading-tight" style={{ color: "var(--text-0)" }}>La bibliothèque</p>
        <p className="text-[11.5px] font-light" style={{ color: "var(--text-3)" }}>
          {mouvements} mouvements, tous animés
        </p>
      </div>

      {/* Les filtres réels de l'écran : la zone du corps et le matériel. */}
      <div className="flex flex-wrap gap-1.5 px-5 pt-4">
        {["Tout le corps", "Sans matériel", "Haltères"].map((f, i) => (
          <span key={f} className="px-2.5 py-1 rounded-full text-[11px] font-medium"
            style={i === 0
              ? { background: "rgba(var(--accent-rgb),0.14)", color: "var(--accent)" }
              : { background: "rgba(var(--surface-rgb),0.7)", color: "var(--text-3)" }}>
            {f}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-5 py-4">
        {MOUVEMENTS_VITRINE.map((m, i) => (
          <VignetteMouvement key={m.cle} m={m} frame={frame} index={i} />
        ))}
      </div>

      <div className="px-5 pb-5">
        <span className="flex items-center justify-center py-3 rounded-full text-[13.5px] font-semibold text-white"
          style={{ background: ACTION_BG }}>
          En faire une séance ({choisis})
        </span>
      </div>
    </div>
  );
}

function SectionComposer({ chiffres }: { chiffres: ChiffresPublics }) {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 md:gap-14 items-center">

        <Reveal>
          <Eyebrow>Ta séance</Eyebrow>
          <SectionTitle>
            Suis-en une. Ou <span style={ACCENT_TEXT}>compose la tienne</span>.
          </SectionTitle>
          <p className="mt-5 text-[15px] md:text-base font-light leading-relaxed" style={{ color: "var(--text-2)" }}>
            Le catalogue est une porte d&rsquo;entrée, pas la seule. Selon le jour, tu prends une séance toute
            faite, tu la construis mouvement par mouvement, tu la demandes à l&rsquo;assistant, ou tu
            improvises.
          </p>

          <div className="mt-8 space-y-4">
            {PORTES.map((p, i) => (
              <Reveal key={p.t} delay={0.08 + i * 0.06} y={14}>
                <div className="flex gap-3.5">
                  <span className="mt-[3px] w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: ACTION_BG }}>
                    <Check size={10} color="#fff" strokeWidth={3.5} />
                  </span>
                  <div>
                    <p className="text-[14.5px] font-semibold leading-snug" style={{ color: "var(--text-1)" }}>{p.t}</p>
                    <p className="mt-0.5 text-[13.5px] font-light leading-relaxed" style={{ color: "var(--text-3)" }}>{p.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <PanneauBibliotheque mouvements={chiffres.mouvements} />
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════ 3 · LE TUNNEL ════════════════════════════
   Réplique fidèle de l'écran de séance réel. Les frames du personnage sont
   celles du produit (public/entrainement/guides), rejouées à la cadence du
   vrai `ExerciseGuide` : 900 ms par pose, fondu de 500 ms.
   ───────────────────────────────────────────────────────────────────── */

const CRUNCH_FRAMES = [
  "/entrainement/guides/crunch-f-1.webp",
  "/entrainement/guides/crunch-f-2.webp",
  "/entrainement/guides/crunch-f-3.webp",
];

function TunnelPhone() {
  const reduce = useReducedMotion();
  const [frame, setFrame] = useState(0);
  const [sec, setSec] = useState(47);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % CRUNCH_FRAMES.length), 900);
    return () => clearInterval(t);
  }, [reduce]);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setSec((s) => (s + 1) % 3600), 1000);
    return () => clearInterval(t);
  }, [reduce]);

  const chrono = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

  return (
    <div className="relative" style={{ width: 300, maxWidth: "100%" }}>
      {/* Lueur ambiante derrière l'appareil */}
      <div className="absolute pointer-events-none"
        style={{
          inset: "-14% -22%",
          background: "radial-gradient(closest-side, rgba(139,92,246,0.45), transparent 72%)",
          filter: "blur(46px)",
        }} />

      {/* Châssis */}
      <div className="relative rounded-[46px] p-[10px]"
        style={{
          background: "linear-gradient(160deg,#3B3160 0%,#171129 38%,#0C0818 100%)",
          boxShadow: "0 50px 110px -30px rgba(0,0,0,0.85), 0 0 0 1px rgba(190,168,255,0.16), inset 0 1px 0 rgba(255,255,255,0.14)",
        }}>
        {/* Écran */}
        <div className="relative overflow-hidden rounded-[38px] px-4 pt-4 pb-5"
          style={{ background: "radial-gradient(120% 60% at 50% 0%, #180F35 0%, #0B0718 52%, #06030E 100%)" }}>

          {/* Barre segmentée : 5 exos faits (teal), le 6e en cours (violet), le dernier à venir */}
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[3px] flex-1 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.14)" }}>
                {i < 5 && <div className="h-full w-full rounded-full" style={{ background: TEAL }} />}
                {i === 5 && (
                  <motion.div className="h-full rounded-full" style={{ background: "#A855F7" }}
                    initial={{ width: "18%" }}
                    whileInView={reduce ? undefined : { width: "62%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 3.2, ease: "linear", delay: 0.4 }} />
                )}
              </div>
            ))}
          </div>

          {/* Chrono + actions */}
          <div className="mt-3.5 flex items-center justify-between">
            <span className="px-3 py-1.5 rounded-full text-[13px] font-medium tabular-nums"
              style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.9)" }}>
              {chrono}
            </span>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(139,92,246,0.22)", border: "1px solid rgba(168,132,255,0.45)" }}>
                <AssistantSpark px={16} />
              </span>
              <span className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.07)" }}>
                <X size={14} color="rgba(255,255,255,0.75)" strokeWidth={2.4} />
              </span>
            </div>
          </div>

          {/* Exercice */}
          <p className="mt-4 text-[10px] font-semibold uppercase" style={{ letterSpacing: "0.22em", color: "#B6A2E8" }}>
            Exercice 6 / 7
          </p>
          <h3 className="mt-1 text-[30px] font-extrabold tracking-tight leading-none text-white">CRUNCH</h3>

          {/* Démo dépliable */}
          <span className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11.5px] font-medium"
            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.85)" }}>
            <Play size={10} fill="currentColor" strokeWidth={0} />
            Démo · ton coach
            <ChevronDown size={12} strokeWidth={2.2} style={{ opacity: 0.6 }} />
          </span>

          {/* Le personnage-guide, sur ses vraies frames.
              Les trois images sont les poses d'un même mouvement, et une seule est
              visible à la fois : leur donner chacune un `alt` ferait lire trois fois
              la même chose. On décrit donc le GROUPE (`role="img"` + `aria-label`) et
              les frames restent décoratives, ce qu'elles sont individuellement. */}
          <div className="relative mt-2 flex items-center justify-center" style={{ height: 150 }}
            role="img" aria-label="Personnage guide Vaiiya montrant le mouvement du crunch, pose après pose">
            <div className="absolute pointer-events-none"
              style={{
                width: 210, height: 210, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(139,92,246,0.30), transparent 64%)",
              }} />
            {CRUNCH_FRAMES.map((src, i) => (
              <Image key={src} src={src} alt="" width={170} height={170} aria-hidden
                className="absolute object-contain"
                style={{
                  height: "100%", width: "auto",
                  opacity: reduce ? (i === 1 ? 1 : 0) : i === frame ? 1 : 0,
                  transition: "opacity 500ms ease-in-out",
                }} />
            ))}
          </div>

          {/* Séries et répétitions */}
          <p className="text-center text-[10px] font-semibold uppercase" style={{ letterSpacing: "0.22em", color: "rgba(255,255,255,0.5)" }}>
            Série 2 / 3
          </p>
          <p className="text-center text-[46px] font-light leading-none mt-1 text-white tabular-nums">20</p>
          <p className="text-center text-[12px] font-light" style={{ color: "rgba(255,255,255,0.55)" }}>reps</p>

          {/* Pastilles de série */}
          <div className="mt-3 flex items-center justify-center gap-3">
            <span className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ border: `2px solid ${TEAL}` }}>
              <Check size={11} color={TEAL} strokeWidth={3.2} />
            </span>
            <motion.span className="w-6 h-6 rounded-full"
              style={{ border: "2px solid #A855F7" }}
              animate={reduce ? {} : { boxShadow: ["0 0 0 0 rgba(168,85,247,0)", "0 0 14px 3px rgba(168,85,247,0.55)", "0 0 0 0 rgba(168,85,247,0)"] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} />
            <span className="w-6 h-6 rounded-full" style={{ border: "2px solid rgba(255,255,255,0.18)" }} />
          </div>

          {/* Le coup de pouce technique */}
          <div className="mt-4 rounded-2xl px-3 py-2.5 flex gap-2"
            style={{ background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="flex-shrink-0 mt-0.5"><AssistantSpark px={14} /></span>
            <p className="text-[11.5px] font-light leading-snug" style={{ color: "rgba(255,255,255,0.72)" }}>
              <span className="font-semibold" style={{ color: "rgba(255,255,255,0.92)" }}>Le geste : </span>
              Mains à peine derrière les tempes, sans tirer sur la nuque. Expire en montant.
            </p>
          </div>

          {/* Validation */}
          <div className="mt-4 w-full rounded-full py-3 text-center text-[15px] font-semibold text-white"
            style={{ background: ACTION_BG, boxShadow: "0 12px 30px -6px rgba(168,85,247,0.6)" }}>
            Série terminée ✓
          </div>
          <p className="mt-2.5 text-center text-[12px] font-light" style={{ color: "rgba(255,255,255,0.42)" }}>
            Passer l&rsquo;exercice
          </p>
        </div>
      </div>
    </div>
  );
}

const TUNNEL_POINTS = [
  { t: "Le geste est montré", d: "Un personnage rejoue le mouvement en boucle, à hauteur d’écran. Rien à chercher sur internet." },
  { t: "Le compte se fait tout seul", d: "Séries, répétitions et récupération avancent avec toi. Tu poses ton téléphone et tu suis." },
  { t: "L’étincelle reste à portée", d: "Une question en plein effort, une adaptation à demander : elle est là, dans l’écran." },
];

function SectionTunnel() {
  return (
    <section className="relative px-6 py-24 md:py-32 overflow-hidden"
      style={{ background: "radial-gradient(120% 80% at 50% -6%, #1A1140 0%, #0B0718 55%, #050208 100%)" }}>
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-14 md:gap-10 items-center">

        <Reveal className="order-2 md:order-1">
          <Eyebrow dark>Le tunnel</Eyebrow>
          <h2 className="mt-6 text-[clamp(1.9rem,4.6vw,3rem)] font-extralight tracking-tight text-white leading-[1.12]">
            Tu n&rsquo;as pas besoin de savoir <span className="font-light" style={{ color: "#D9C6FF" }}>quoi faire</span>.
          </h2>
          <p className="mt-5 text-[15px] md:text-base font-light leading-relaxed" style={{ color: "rgba(236,234,246,0.78)" }}>
            Une fois la séance lancée, l&rsquo;écran ne fait plus qu&rsquo;une chose : te dire le mouvement suivant.
            C&rsquo;est ce que tu vois à droite, ni plus ni moins.
          </p>

          <div className="mt-8 space-y-5">
            {TUNNEL_POINTS.map((p, i) => (
              <Reveal key={p.t} delay={0.08 + i * 0.07} y={16}>
                <div className="flex gap-3.5">
                  <span className="mt-1 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: TEAL }}>
                    <Check size={11} color="#04150F" strokeWidth={3.5} />
                  </span>
                  <div>
                    <p className="text-[14.5px] font-semibold text-white leading-snug">{p.t}</p>
                    <p className="mt-1 text-[13.5px] font-light leading-relaxed" style={{ color: "rgba(236,234,246,0.62)" }}>{p.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1} className="order-1 md:order-2 flex justify-center">
          <TunnelPhone />
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════ 4 · L'INTELLIGENCE UTILE ════════════════════════════ */

/* Conversation réelle telle qu'elle se joue dans l'app : on parle normalement,
   l'assistant répond, puis propose une CARTE à valider. Rien ne s'écrit sans clic. */
function ChatDemo() {
  const reduce = useReducedMotion();
  return (
    <div className="rounded-[30px] overflow-hidden lg-surface lg-highlight"
      style={{ border: "1px solid rgba(var(--accent-rgb),0.16)" }}>

      {/* En-tête */}
      <div className="flex items-center gap-3 px-5 py-4"
        style={{ borderBottom: "1px solid rgba(var(--accent-rgb),0.1)" }}>
        <AssistantAvatar size={30} />
        <div>
          <p className="text-[14px] font-semibold leading-tight" style={{ color: "var(--text-0)" }}>Ton assistant</p>
          <p className="text-[11.5px] font-light" style={{ color: "var(--text-3)" }}>Il connaît tes séances et tes repas</p>
        </div>
      </div>

      <div className="px-5 py-5 space-y-3">
        {/* Message de l'utilisateur */}
        <Reveal y={12}>
          <div className="flex justify-end">
            <p className="max-w-[80%] px-4 py-2.5 text-[13.5px] font-light leading-relaxed text-white"
              style={{ background: ACTION_BG, borderRadius: "18px 18px 5px 18px" }}>
              Cette semaine je n&rsquo;ai que mardi et samedi.
            </p>
          </div>
        </Reveal>

        {/* Réponse de l'assistant */}
        <Reveal y={12} delay={0.12}>
          <div className="flex justify-start">
            <p className="max-w-[85%] px-4 py-2.5 text-[13.5px] font-light leading-relaxed"
              style={{
                background: "rgba(var(--accent-rgb),0.09)",
                color: "var(--text-1)",
                borderRadius: "18px 18px 18px 5px",
              }}>
              Pas de souci. J&rsquo;ai regroupé l&rsquo;essentiel sur tes deux jours et allégé samedi.
            </p>
          </div>
        </Reveal>

        {/* La carte à valider : le vrai geste distinctif de l'assistant */}
        <Reveal y={14} delay={0.24}>
          <div className="rounded-[20px] p-4"
            style={{
              background: "rgba(var(--surface-rgb),0.55)",
              border: "1px solid rgba(var(--accent-rgb),0.28)",
              boxShadow: "0 14px 34px -18px rgba(139,92,246,0.55)",
            }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={13} style={{ color: "var(--accent)" }} />
              <p className="text-[11px] font-bold uppercase" style={{ letterSpacing: "0.14em", color: "var(--accent)" }}>
                Nouvelle semaine
              </p>
            </div>
            <div className="space-y-2">
              {[
                { j: "Mardi", s: "Full Body Intermédiaire", d: "45 min", on: true },
                { j: "Samedi", s: "Mobilité complète", d: "20 min", on: true },
              ].map((r) => (
                <div key={r.j} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                  style={{ background: "rgba(var(--accent-rgb),0.07)" }}>
                  <span className="text-[11px] font-bold w-12 flex-shrink-0" style={{ color: "var(--accent)" }}>{r.j}</span>
                  <span className="text-[12.5px] font-medium flex-1 leading-tight" style={{ color: "var(--text-1)" }}>{r.s}</span>
                  <span className="text-[11px] font-light" style={{ color: "var(--text-3)" }}>{r.d}</span>
                </div>
              ))}
            </div>
            <div className="mt-3.5 flex gap-2">
              <motion.span
                animate={reduce ? {} : { boxShadow: ["0 0 0 0 rgba(139,92,246,0)", "0 0 0 6px rgba(139,92,246,0.12)", "0 0 0 0 rgba(139,92,246,0)"] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="flex-1 text-center py-2.5 rounded-full text-[13px] font-semibold text-white"
                style={{ background: ACTION_BG }}>
                Appliquer
              </motion.span>
              <span className="px-5 py-2.5 rounded-full text-[13px] font-medium"
                style={{ background: "rgba(var(--surface-rgb),0.8)", color: "var(--text-2)" }}>
                Plus tard
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

const MACROS = [
  { l: "Protéines", v: "38 g", c: TEAL },
  { l: "Glucides", v: "34 g", c: GOLD },
  { l: "Lipides", v: "14 g", c: "#A855F7" },
];

function SectionIntelligence() {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <Reveal><Eyebrow>L&rsquo;intelligence utile</Eyebrow></Reveal>
          <Reveal delay={0.06}>
            <SectionTitle>
              Elle ne répond pas seulement. <span style={ACCENT_TEXT}>Elle agit</span>.
            </SectionTitle>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-6 text-base md:text-lg font-light max-w-xl mx-auto leading-relaxed" style={{ color: "var(--text-2)" }}>
              Tu écris comme tu parles. Elle déplace tes séances, note un repas, propose une recette.
              Toujours une carte à valider : rien ne s&rsquo;écrit sans ton accord.
            </p>
          </Reveal>
        </div>

        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6 items-start">
          <Reveal><ChatDemo /></Reveal>

          {/* Nutrition par photo : une VRAIE assiette, analysée */}
          <Reveal delay={0.1}>
            <div className="rounded-[30px] overflow-hidden lg-surface lg-highlight"
              style={{ border: "1px solid rgba(var(--accent-rgb),0.16)" }}>
              <div className="relative w-full" style={{ aspectRatio: "4 / 3" }}>
                <Image src="/recipes/bowl-de-poulet-quinoa-et-avocat.jpg" alt="Assiette analysée par Vaiiya"
                  fill sizes="(max-width:1024px) 92vw, 44vw" style={{ objectFit: "cover" }} />
                <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold"
                  style={{ background: "rgba(12,8,24,0.72)", color: "#fff", backdropFilter: "blur(8px)" }}>
                  <Camera size={11} /> Photo prise à midi
                </span>

                {/* Le verdict, posé sur l'image */}
                <div className="absolute inset-x-3 bottom-3 rounded-2xl px-4 py-3"
                  style={{ background: "rgba(12,8,24,0.78)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="flex items-baseline justify-between mb-2.5">
                    <p className="text-[13px] font-semibold text-white">Bowl poulet quinoa avocat</p>
                    <p className="text-[17px] font-semibold leading-none" style={{ color: GOLD }}>
                      612 <span className="text-[11px] font-normal">kcal</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {MACROS.map((m) => (
                      <div key={m.l} className="flex-1 rounded-lg px-2 py-1.5" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <p className="text-[9.5px] font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>{m.l}</p>
                        <p className="text-[13px] font-bold leading-tight" style={{ color: m.c }}>{m.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-5 py-5">
                <p className="text-[15px] font-semibold mb-2" style={{ color: "var(--text-0)" }}>
                  Ton repas, compris en une photo
                </p>
                <p className="text-[13.5px] font-light leading-relaxed" style={{ color: "var(--text-2)" }}>
                  Sans rien peser ni fouiller une base de données. Tu prends l&rsquo;assiette en photo, Vaiiya estime
                  les calories et les macros, tu corriges si besoin. La saisie en moins, le suivi en plus.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════ 5 · LA CONSTANCE ════════════════════════════ */

// L'échelle vient de `RANGS` (src/lib/aura.ts), jamais d'une liste recopiée :
// les six chemins étaient écrits à la main ici, une septième gemme aurait donc
// pu exister dans l'app sans jamais apparaître sur la landing.
const RANGS_LADDER = RANGS;
/** Le canevas des planches est en 320 × 512 : la hauteur mène, la largeur suit. */
const H_GEMME = 52;
const L_GEMME = Math.round(H_GEMME * (320 / 512));
const MISSIONS = [
  { img: "/missions/daily/connexion-v1.webp", label: "Connexion du jour", exp: "+5" },
  { img: "/missions/daily/seance-v1.webp", label: "Première séance", exp: "+30" },
  { img: "/missions/daily/repas-v1.webp", label: "Premier repas", exp: "+5" },
];

function SectionConstance() {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <Reveal><Eyebrow>Ta constance</Eyebrow></Reveal>
          <Reveal delay={0.06}>
            <SectionTitle>
              Tu ne compares pas ton corps.<br />
              <span style={ACCENT_TEXT}>Tu construis ta régularité</span>.
            </SectionTitle>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-6 text-base md:text-lg font-light max-w-xl mx-auto leading-relaxed" style={{ color: "var(--text-2)" }}>
              Les missions récompensent ce que tu fais vraiment. Ton rang raconte ton parcours, sans classement
              et sans culpabilisation.
            </p>
          </Reveal>
        </div>

        <div className="grid md:grid-cols-2 gap-5 items-stretch">
          <Reveal>
            <div className="h-full rounded-[26px] p-6 lg-surface lg-highlight">
              <p className="text-[12px] font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--text-3)" }}>Tes missions du jour</p>
              <div className="space-y-2.5">
                {MISSIONS.map((m) => (
                  <div key={m.label} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl" style={{ background: "rgba(var(--accent-rgb),0.07)" }}>
                    <Image src={m.img} alt="" aria-hidden width={34} height={34} className="rounded-lg" />
                    <span className="text-[13.5px] font-medium flex-1" style={{ color: "var(--text-1)" }}>{m.label}</span>
                    <span className="text-[13px] font-bold" style={{ color: "var(--gold)" }}>{m.exp} EXP</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[12.5px] font-light leading-relaxed" style={{ color: "var(--text-3)" }}>
                Une mission ne se crédite qu&rsquo;une fois par jour. Pas de triche possible, donc pas de course à qui
                clique le plus.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="h-full rounded-[26px] p-6 lg-surface lg-highlight flex flex-col">
              <p className="text-[12px] font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--text-3)" }}>Ton rang qui monte</p>
              <div className="grid grid-cols-3 gap-3 flex-1 place-items-center">
                {RANGS_LADDER.map((r, i) => (
                  <div key={r.id} className="flex flex-col items-center gap-1.5">
                    {r.image && (
                      <Image src={r.image} alt="" aria-hidden width={L_GEMME} height={H_GEMME}
                        style={{ opacity: i === 0 ? 1 : 0.82 - i * 0.1 }} />
                    )}
                    <span className="text-[11px] font-semibold" style={{ color: i === 0 ? "var(--text-1)" : "var(--text-3)" }}>{r.nom}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: TEAL }}>
                <ShieldCheck size={13} /> Cosmétique uniquement. Aucun avantage acheté avec l&rsquo;EXP.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════ 6 · LE RELAIS ════════════════════════════ */

function SectionRelais() {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        <Reveal delay={0.1} className="flex justify-center md:order-2">
          <motion.div whileHover={{ y: -8, rotate: -1 }} transition={{ duration: 0.4, ease: EASE }}
            className="relative w-[230px] rounded-[24px] overflow-hidden"
            style={{ boxShadow: "0 34px 80px -26px rgba(139,92,246,0.55)" }}>
            <Image src="/defis/sillage/04.webp" alt="Affiche du relais Sillage" width={230} height={409}
              style={{ width: "100%", height: "auto" }} />
          </motion.div>
        </Reveal>
        <Reveal className="md:order-1">
          <Eyebrow>Le relais</Eyebrow>
          <SectionTitle>
            À deux. <span style={ACCENT_TEXT}>Pas contre les autres</span>.
          </SectionTitle>
          <p className="mt-5 text-[15px] md:text-base font-light leading-relaxed" style={{ color: "var(--text-2)" }}>
            Quatre jours sur sept, chacun son tour. À chaque séance, votre affiche se dévoile un peu plus.
            Aucun classement, aucune punition, on ne nomme jamais celui qui a lâché.
          </p>
          <ul className="mt-6 space-y-2.5">
            {[
              "Une équipe de deux, un simple lien d’invitation",
              "Un maillon par jour, jamais deux fois de suite la même personne",
              "Tout se passe dans votre messagerie privée, jamais sur un fil public",
              "L’affiche gagnée devient votre trophée",
            ].map((b) => (
              <li key={b} className="flex items-start gap-2.5">
                <span className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: ACTION_BG }}>
                  <Check size={10} color="#fff" strokeWidth={3.5} />
                </span>
                <span className="text-[14px] font-light" style={{ color: "var(--text-2)" }}>{b}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════ 7 · CE QUE TU AS EN CRÉANT TON COMPTE ════════════════════════════ */

const INCLUS = [
  "Le catalogue de séances gratuites",
  "La bibliothèque de mouvements, pour composer les tiennes",
  "Le tunnel guidé et ses démonstrations",
  "La nutrition par photo",
  "Ton planning de la semaine",
  "Ton rang, ton EXP et tes missions",
  "Le relais à deux avec un proche",
];

function SectionFinale() {
  return (
    <>
      <section className="relative px-6 py-24 md:py-28">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-11">
            <Reveal><Eyebrow>Le compte gratuit</Eyebrow></Reveal>
            <Reveal delay={0.06}>
              <SectionTitle>
                Tu commences avec <span style={ACCENT_TEXT}>tout ça</span>.
              </SectionTitle>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-6 text-base font-light max-w-lg mx-auto leading-relaxed" style={{ color: "var(--text-2)" }}>
                Pas de version bridée le temps d&rsquo;un essai. Le compte gratuit donne accès au produit,
                pour de vrai.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div className="rounded-[28px] p-6 md:p-8 lg-surface lg-highlight"
              style={{ border: "1px solid rgba(var(--accent-rgb),0.2)" }}>
              <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3.5">
                {INCLUS.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <span className="mt-0.5 w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: TEAL }}>
                      <Check size={11} color="#04150F" strokeWidth={3.5} />
                    </span>
                    <span className="text-[14px] font-light" style={{ color: "var(--text-1)" }}>{b}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 pt-5 text-[13px] font-light leading-relaxed"
                style={{ color: "var(--text-3)", borderTop: "1px solid rgba(var(--accent-rgb),0.12)" }}>
                Premium arrive plus tard, si tu veux les séances spécialisées, les missions supplémentaires et
                l&rsquo;assistant sans limite. Jamais pour débloquer une fonction de base.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative px-6 pt-8 pb-24 md:pb-32 text-center overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{ height: "70%", background: "linear-gradient(to top, rgba(var(--accent-rgb),0.12), transparent)" }} />
        <Reveal>
          <p className="relative text-[13px] font-semibold uppercase tracking-[0.24em] mb-5" style={{ color: "var(--accent)" }}>Vaiiya</p>
          <h2 className="relative text-[clamp(2rem,6vw,3.6rem)] font-extralight leading-[1.02] tracking-tight mb-4" style={{ color: "var(--text-0)" }}>
            Commence là où <span style={ACCENT_TEXT}>tu en es</span>.
          </h2>
          <p className="relative text-[15px] md:text-base font-light max-w-md mx-auto leading-relaxed mb-9" style={{ color: "var(--text-2)" }}>
            Une séance suffit pour savoir si Vaiiya est fait pour toi.
          </p>
          <div className="relative flex flex-col items-center gap-4">
            <CtaPrimary label="Créer mon compte gratuit" big />
            <p className="text-[12.5px] font-light" style={{ color: "var(--text-3)" }}>
              Sans carte bancaire · Prêt en une minute
            </p>
            <Link href="/auth?mode=login">
              <span className="mt-1 text-[13px] font-light cursor-pointer" style={{ color: "var(--text-3)" }}>
                Déjà un compte ? <span style={{ color: "var(--accent)", fontWeight: 500 }}>Se connecter</span>
              </span>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Pied de page ─────────────────────────────────────────────────────
          Il ne portait qu'une ligne de trois liens. Il porte maintenant les
          pages vitrine (« Comprendre »), qui n'étaient liées depuis nulle part
          ailleurs sur le site : elles ne se pointaient qu'entre elles, donc
          elles ne recevaient aucun poids interne et un visiteur arrivant sur
          l'accueil n'avait aucun chemin vers elles. Ce sont de vraies pages de
          fond, à leur place dans un pied de page, pas une liste de mots-clés.
          La liste vient de `lib/seoPages.ts`, source unique. */}
      <footer className="relative px-6 pt-12 pb-10 border-t" style={{ borderColor: "rgba(var(--accent-rgb),0.12)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid gap-9 sm:grid-cols-3">
            {/* Marque */}
            <div>
              <span className="text-lg font-extralight tracking-[0.12em]" style={{ color: "var(--text-1)" }}>Vaiiya</span>
              <p className="mt-2 text-[12.5px] font-light leading-relaxed max-w-[24ch]" style={{ color: "var(--text-3)" }}>
                Tes séances, tes repas et ton coach au même endroit. Application web, en français.
              </p>
            </div>

            {/* Pages de fond */}
            <FooterCol titre="Comprendre" liens={SEO_PAGES} />

            {/* Le compte, puis le légal */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: "var(--text-3)" }}>Vaiiya</p>
              <ul className="space-y-2">
                <FooterLien href="/auth?mode=login" label="Se connecter" />
                <FooterLien href="/premium" label="Premium" />
                {LEGAL_PAGES.map((p) => <FooterLien key={p.href} href={p.href} label={p.label} />)}
              </ul>
            </div>
          </div>

          <p className="mt-10 pt-6 text-[12px] font-light border-t" style={{ color: "var(--text-3)", borderColor: "rgba(var(--accent-rgb),0.10)" }}>
            © {new Date().getFullYear()} Vaiiya · Entraînement · Nutrition · Coach IA
          </p>
        </div>
      </footer>
    </>
  );
}

export default function LandingStory({ chiffres }: { chiffres: ChiffresPublics }) {
  return (
    <div className="relative w-full">
      <SectionQuoi chiffres={chiffres} />
      <SectionCatalogue />
      <SectionComposer chiffres={chiffres} />
      <SectionTunnel />
      <SectionIntelligence />
      <SectionConstance />
      <SectionRelais />
      <SectionFinale />
    </div>
  );
}

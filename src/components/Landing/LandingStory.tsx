"use client";

/**
 * LandingStory — la présentation qui scrolle sous le hero de vaiiya.fr.
 *
 * Principe : « la preuve, pas la promesse ». On ne montre que des mécaniques
 * RÉELLES du produit (catalogue, tunnel guidé, rang/EXP/missions, assistant qui
 * agit, nutrition par photo, relais) avec les VRAIS visuels (photos naturelles
 * du catalogue, badges de rang, affiches de relais). Aucune fausse statistique,
 * aucun faux témoignage, aucune fausse interface sociale.
 *
 * ADN visuel : système « D ». Violet = action, or = énergie, teal = corps et
 * progrès. Tout passe par les tokens (`var(--text-*)`, `var(--accent)`,
 * `rgba(var(--surface-rgb),…)`, classes `lg-*`) pour que le mode sombre suive
 * automatiquement. Révélations au scroll une seule fois.
 */

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Camera, Sparkles, ArrowRight, Check,
  Timer, Compass, TrendingUp, ShieldCheck, type LucideIcon,
} from "lucide-react";

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
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase"
      style={{ letterSpacing: "0.24em", color: "var(--text-3)" }}
    >
      <span className="inline-block h-px w-6" style={{ background: "linear-gradient(90deg, transparent, var(--accent))" }} />
      {children}
      <span className="inline-block h-px w-6" style={{ background: "linear-gradient(90deg, var(--gold), transparent)" }} />
    </span>
  );
}

/* ── Bouton d'action principal (violet) ── */
function CtaPrimary({ label, href = "/auth?mode=signup", big = false }: { label: string; href?: string; big?: boolean }) {
  return (
    <Link href={href}>
      <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
        className="relative inline-flex items-center gap-2 cursor-pointer overflow-hidden rounded-full font-semibold text-white"
        style={{
          padding: big ? "16px 34px" : "13px 26px",
          fontSize: big ? 16 : 14,
          background: ACTION_BG,
          boxShadow: "0 12px 32px rgba(139,92,246,0.42), inset 0 1px 0 rgba(255,255,255,0.28)",
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

/* ════════════════════════════ SECTIONS ════════════════════════════ */

/* 1 · Ce qu'est Vaiiya + preuves de profondeur (compteurs réels). */
const PREUVES = [
  { n: "53", label: "séances réelles" },
  { n: "26", label: "mini-cours" },
  { n: "102", label: "mouvements guidés" },
];
function SectionQuoi() {
  return (
    <section id={DISCOVER_ANCHOR} className="relative px-6 py-24 md:py-32 scroll-mt-10">
      <div className="max-w-3xl mx-auto text-center">
        <Reveal><Eyebrow>C&rsquo;est quoi Vaiiya</Eyebrow></Reveal>
        <Reveal delay={0.06}>
          <h2 className="mt-6 text-[clamp(2rem,5.4vw,3.4rem)] font-extralight leading-[1.1] tracking-tight" style={{ color: "var(--text-0)" }}>
            Tout ton sport,{" "}
            <span style={ACCENT_TEXT}>relié dans une seule app</span>.
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mt-7 text-base md:text-lg font-light leading-relaxed max-w-xl mx-auto" style={{ color: "var(--text-2)" }}>
            Un vrai catalogue de séances guidées, ta nutrition comprise d&rsquo;une photo, un assistant qui agit
            et un rang qui monte à chaque effort. Une seule app pour t&rsquo;entraîner, manger mieux et tenir dans le temps.
          </p>
        </Reveal>
        {/* Compteurs. TODO : dériver du catalogue réel à l'implémentation plutôt que de figer les nombres. */}
        <Reveal delay={0.18}>
          <div className="mt-12 grid grid-cols-3 gap-3 max-w-lg mx-auto">
            {PREUVES.map((p) => (
              <div key={p.label} className="rounded-[22px] p-4 lg-surface lg-highlight">
                <p className="text-[clamp(1.8rem,6vw,2.6rem)] font-extralight leading-none" style={ACCENT_TEXT}>{p.n}</p>
                <p className="mt-2 text-[12px] font-medium leading-tight" style={{ color: "var(--text-3)" }}>{p.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* 2 · « Une action. Tout se met à jour. » — le fil rouge « tout connecté ». */
const ETAPES: { icon: LucideIcon; n: string; title: string; desc: string }[] = [
  { icon: Compass, n: "01", title: "Choisis ce qui te convient", desc: "Ton niveau, ton matériel et le temps que tu as vraiment." },
  { icon: Timer, n: "02", title: "Laisse-toi guider", desc: "Chaque mouvement est montré. Le tunnel reste avec toi du début à la fin." },
  { icon: TrendingUp, n: "03", title: "Vois ta constance grandir", desc: "La séance valide tes missions, ajoute de l'EXP et fait monter ton rang." },
];
function SectionConnecte() {
  return (
    <section className="relative px-6 py-24 md:py-28">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <Reveal><Eyebrow>Tout connecté</Eyebrow></Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-6 text-[clamp(1.9rem,4.6vw,3rem)] font-extralight tracking-tight" style={{ color: "var(--text-0)" }}>
              Une action. <span style={ACCENT_TEXT}>Tout se met à jour</span>.
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-6 text-base md:text-lg font-light max-w-xl mx-auto leading-relaxed" style={{ color: "var(--text-2)" }}>
              Rien à recopier entre plusieurs apps. Vaiiya comprend ce que tu fais et prépare naturellement la suite.
            </p>
          </Reveal>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {ETAPES.map((e, i) => (
            <Reveal key={e.n} delay={i * 0.08}>
              <div className="h-full rounded-[26px] p-6 lg-surface lg-highlight">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center lg-rose">
                    <e.icon size={18} style={{ color: "var(--accent)" }} strokeWidth={1.8} />
                  </div>
                  <span className="text-[13px] font-semibold" style={{ color: "var(--text-3)" }}>{e.n}</span>
                </div>
                <h3 className="text-[17px] font-semibold mb-2" style={{ color: "var(--text-0)" }}>{e.title}</h3>
                <p className="text-[14px] font-light leading-relaxed" style={{ color: "var(--text-2)" }}>{e.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
        {/* Le gain rendu tangible : +35 EXP après une séance (mission « première séance »). */}
        <Reveal delay={0.1}>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full lg-surface text-[13px] font-medium" style={{ color: "var(--text-1)" }}>
              <Image src="/rangs/bronze-v2.png" alt="Rang Bronze" width={22} height={22} />
              Rang Bronze
            </span>
            <ArrowRight size={16} style={{ color: "var(--text-3)" }} />
            <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-semibold text-white" style={{ background: ACTION_BG }}>
              <Sparkles size={13} /> Séance faite, +35 EXP
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* 3 · Le catalogue — vraies photos naturelles. */
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
            <h2 className="mt-6 text-[clamp(1.9rem,4.6vw,3rem)] font-extralight tracking-tight" style={{ color: "var(--text-0)" }}>
              Une vraie séance <span style={ACCENT_TEXT}>pour chaque moment</span>.
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-6 text-base md:text-lg font-light max-w-xl mx-auto leading-relaxed" style={{ color: "var(--text-2)" }}>
              Une base gratuite solide pour démarrer. Quand tu veux aller plus loin, Premium ouvre les formats
              spécialisés. Les séances Premium restent visibles, jamais grisées ni floutées.
            </p>
          </Reveal>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATALOGUE.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.06}>
              <div className="relative rounded-[22px] overflow-hidden lg-highlight"
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
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.1}>
          <div className="mt-10 text-center">
            <CtaGhost label="Explorer les séances" href="/auth?mode=signup" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* 4 · Le tunnel — rupture sombre, immersive. */
const GUIDE_SPRITE = "/entrainement/guides/bearcrawl-f-1.webp";
function SectionTunnel() {
  return (
    <section className="relative px-6 py-24 md:py-32 overflow-hidden"
      style={{ background: "radial-gradient(120% 80% at 50% -6%, #1A1140 0%, #0B0718 55%, #050208 100%)" }}>
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        <Reveal>
          <span className="inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase" style={{ letterSpacing: "0.24em", color: "#C3AEFF" }}>
            <span className="inline-block h-px w-6" style={{ background: "linear-gradient(90deg, transparent, #C3AEFF)" }} />
            Le tunnel
          </span>
          <h2 className="mt-6 text-[clamp(1.9rem,4.6vw,3rem)] font-extralight tracking-tight text-white leading-[1.12]">
            Tu n&rsquo;as pas besoin de connaître les mouvements.
          </h2>
          <p className="mt-5 text-[15px] md:text-base font-light leading-relaxed" style={{ color: "rgba(236,234,246,0.8)" }}>
            Le personnage te montre le geste, le chrono avance avec toi et chaque récupération arrive au bon moment.
            Tu suis, c&rsquo;est tout.
          </p>
          <ul className="mt-7 space-y-3">
            {["Démonstrations animées, à hauteur d'écran", "Chrono et récupération automatiques", "L'étincelle ✦ à portée de main"].map((b) => (
              <li key={b} className="flex items-start gap-2.5">
                <span className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: TEAL }}>
                  <Check size={10} color="#04150F" strokeWidth={3.5} />
                </span>
                <span className="text-[14px] font-light" style={{ color: "rgba(236,234,246,0.92)" }}>{b}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.1} className="flex justify-center">
          <div className="relative w-[280px] rounded-[28px] p-5"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(195,174,255,0.22)", boxShadow: "0 30px 70px -24px rgba(139,92,246,0.55)" }}>
            {/* barre segmentée facon stories */}
            <div className="flex gap-1.5 mb-5">
              {[1, 1, 1, 0, 0, 0].map((on, i) => (
                <div key={i} className="h-1 flex-1 rounded-full" style={{ background: on ? TEAL : "rgba(255,255,255,0.16)" }} />
              ))}
            </div>
            <div className="relative h-52 rounded-2xl overflow-hidden flex items-end justify-center"
              style={{ background: "linear-gradient(180deg,#2A2150,#140E2E)" }}>
              <Image src={GUIDE_SPRITE} alt="Personnage-guide Vaiiya" width={180} height={180} style={{ objectFit: "contain" }} />
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white" style={{ background: ACTION_BG }}>
                Effort 2 / 5
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-[15px] font-semibold text-white">Cercles de hanches</p>
                <p className="text-[12px] font-light" style={{ color: "rgba(236,234,246,0.6)" }}>Échauffement</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extralight leading-none" style={{ color: "#FFC24E" }}>30</p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(236,234,246,0.5)" }}>secondes</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* 5 · L'intelligence utile — l'étincelle agit + nutrition par photo. */
function SectionIntelligence() {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <Reveal><Eyebrow>L&rsquo;intelligence utile</Eyebrow></Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-6 text-[clamp(1.9rem,4.6vw,3rem)] font-extralight tracking-tight" style={{ color: "var(--text-0)" }}>
              Elle ne répond pas seulement. <span style={ACCENT_TEXT}>Elle agit</span>.
            </h2>
          </Reveal>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {/* L'étincelle agit */}
          <Reveal>
            <div className="h-full rounded-[26px] p-6 lg-surface lg-highlight">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: ACTION_BG }}>
                  <Sparkles size={15} color="#fff" />
                </div>
                <p className="text-[15px] font-semibold" style={{ color: "var(--text-0)" }}>L&rsquo;étincelle agit</p>
              </div>
              <div className="rounded-2xl p-4 mb-3" style={{ background: "rgba(var(--accent-rgb),0.08)" }}>
                <p className="text-[13px] font-medium mb-2" style={{ color: "var(--text-1)" }}>
                  « Cette semaine je n&rsquo;ai que mardi et samedi. »
                </p>
                <p className="text-[13px] font-light leading-relaxed" style={{ color: "var(--text-2)" }}>
                  J&rsquo;ai déplacé tes séances et allégé samedi. Tu veux voir le nouveau plan ?
                </p>
              </div>
              <p className="text-[13px] font-light leading-relaxed" style={{ color: "var(--text-2)" }}>
                Elle refait ta semaine, note un repas que tu lui racontes, propose une recette. Toujours une carte
                à valider : rien ne s&rsquo;écrit sans ton accord.
              </p>
            </div>
          </Reveal>

          {/* Nutrition par photo */}
          <Reveal delay={0.08}>
            <div className="h-full rounded-[26px] p-6 lg-surface lg-highlight">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center lg-turquoise">
                  <Camera size={15} style={{ color: TEAL }} />
                </div>
                <p className="text-[15px] font-semibold" style={{ color: "var(--text-0)" }}>Ton repas, compris en une photo</p>
              </div>
              <div className="rounded-2xl overflow-hidden mb-3 relative" style={{ aspectRatio: "16 / 9" }}>
                <Image src="/entrainement/cat-perte.webp" alt="Repas analysé" fill sizes="(max-width:768px) 90vw, 40vw" style={{ objectFit: "cover" }} />
                <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold"
                  style={{ background: "rgba(255,255,255,0.9)", color: "#7C5CFA" }}>
                  <Sparkles size={10} /> Analysé par l&rsquo;IA
                </span>
              </div>
              <p className="text-[13px] font-light leading-relaxed" style={{ color: "var(--text-2)" }}>
                Sans tout peser ni chercher dans des bases interminables. Une photo, et Vaiiya estime les calories
                et les macros. La saisie en moins, le suivi en plus.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* 6 · La constance — rang, EXP, missions. Jamais le corps, jamais de classement. */
const RANGS_LADDER = [
  { img: "/rangs/bronze-v2.png", nom: "Bronze" },
  { img: "/rangs/argent-v2.png", nom: "Argent" },
  { img: "/rangs/or-v2.png", nom: "Or" },
  { img: "/rangs/platine-v2.png", nom: "Platine" },
  { img: "/rangs/diamant-v2.png", nom: "Diamant" },
  { img: "/rangs/eternel-v2.png", nom: "Éternel" },
];
const MISSIONS = [
  { img: "/missions/daily/connexion-v1.webp", label: "Connexion du jour", exp: "+5" },
  { img: "/missions/daily/seance-v1.webp", label: "Première séance", exp: "+35" },
  { img: "/missions/daily/repas-v1.webp", label: "Premier repas", exp: "+5" },
];
function SectionConstance() {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <Reveal><Eyebrow>Ta constance</Eyebrow></Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-6 text-[clamp(1.9rem,4.6vw,3rem)] font-extralight tracking-tight leading-[1.12]" style={{ color: "var(--text-0)" }}>
              Tu ne compares pas ton corps.<br />
              <span style={ACCENT_TEXT}>Tu construis ta régularité</span>.
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-6 text-base md:text-lg font-light max-w-xl mx-auto leading-relaxed" style={{ color: "var(--text-2)" }}>
              Les missions récompensent ce que tu fais vraiment. Ton rang raconte ton parcours, sans classement
              et sans culpabilisation.
            </p>
          </Reveal>
        </div>

        <div className="grid md:grid-cols-2 gap-5 items-stretch">
          {/* Les missions du jour */}
          <Reveal>
            <div className="h-full rounded-[26px] p-6 lg-surface lg-highlight">
              <p className="text-[13px] font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--text-3)" }}>Tes missions du jour</p>
              <div className="space-y-2.5">
                {MISSIONS.map((m) => (
                  <div key={m.label} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl" style={{ background: "rgba(var(--accent-rgb),0.07)" }}>
                    <Image src={m.img} alt={m.label} width={34} height={34} className="rounded-lg" />
                    <span className="text-[13.5px] font-medium flex-1" style={{ color: "var(--text-1)" }}>{m.label}</span>
                    <span className="text-[13px] font-bold" style={{ color: "var(--gold)" }}>{m.exp} EXP</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Le ladder des rangs */}
          <Reveal delay={0.08}>
            <div className="h-full rounded-[26px] p-6 lg-surface lg-highlight flex flex-col">
              <p className="text-[13px] font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--text-3)" }}>Ton rang qui monte</p>
              <div className="grid grid-cols-3 gap-3 flex-1 place-items-center">
                {RANGS_LADDER.map((r, i) => (
                  <div key={r.nom} className="flex flex-col items-center gap-1.5">
                    <Image src={r.img} alt={`Rang ${r.nom}`} width={52} height={52}
                      style={{ opacity: i === 0 ? 1 : 0.82 - i * 0.1 }} />
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

/* 7 · Le relais — le défi à deux. */
function SectionRelais() {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        <Reveal delay={0.1} className="flex justify-center md:order-2">
          <div className="relative w-[230px] rounded-[24px] overflow-hidden" style={{ boxShadow: "0 30px 70px -24px rgba(139,92,246,0.5)" }}>
            <Image src="/defis/sillage/04.webp" alt="Affiche du relais Sillage" width={230} height={409} style={{ width: "100%", height: "auto" }} />
          </div>
        </Reveal>
        <Reveal className="md:order-1">
          <Eyebrow>Le relais</Eyebrow>
          <h2 className="mt-6 text-[clamp(1.9rem,4.6vw,3rem)] font-extralight tracking-tight leading-[1.1]" style={{ color: "var(--text-0)" }}>
            À deux. <span style={ACCENT_TEXT}>Pas contre les autres</span>.
          </h2>
          <p className="mt-5 text-[15px] md:text-base font-light leading-relaxed" style={{ color: "var(--text-2)" }}>
            Quatre jours sur sept, chacun son tour. À chaque séance, votre affiche se dévoile un peu plus.
            Aucun classement, aucune punition, on ne nomme jamais celui qui a lâché.
          </p>
          <ul className="mt-6 space-y-2.5">
            {["Une équipe de deux, un lien d'invitation", "Un maillon par jour, jamais deux fois de suite la même personne", "L'affiche gagnée devient votre trophée"].map((b) => (
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

/* 8 · Essayer puis conserver + CTA final. */
const COL_SANS = ["Explorer le catalogue", "Ouvrir toutes les fiches", "Découvrir le tunnel guidé"];
const COL_PRET = ["Sauvegarder tes séances", "Construire ton planning", "Faire grandir ton rang"];
function SectionFinale() {
  return (
    <>
      <section className="relative px-6 py-24 md:py-28">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Reveal><Eyebrow>Essayer, puis conserver</Eyebrow></Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-6 text-[clamp(1.8rem,4.4vw,2.7rem)] font-extralight tracking-tight" style={{ color: "var(--text-0)" }}>
                Crée ton compte quand tu veux <span style={ACCENT_TEXT}>garder ton parcours</span>.
              </h2>
            </Reveal>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <Reveal>
              <div className="h-full rounded-[26px] p-6 lg-surface lg-highlight">
                <p className="text-[13px] font-semibold uppercase tracking-wide mb-4" style={{ color: TEAL }}>Découvrir pour de vrai</p>
                <ul className="space-y-3">
                  {COL_SANS.map((b) => (
                    <li key={b} className="flex items-start gap-2.5">
                      <span className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: TEAL }}>
                        <Check size={10} color="#04150F" strokeWidth={3.5} />
                      </span>
                      <span className="text-[14px] font-light" style={{ color: "var(--text-1)" }}>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="h-full rounded-[26px] p-6 lg-surface lg-highlight" style={{ border: "1px solid rgba(var(--accent-rgb),0.35)" }}>
                <p className="text-[13px] font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--accent)" }}>Quand tu es prêt</p>
                <ul className="space-y-3">
                  {COL_PRET.map((b) => (
                    <li key={b} className="flex items-start gap-2.5">
                      <span className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: ACTION_BG }}>
                        <Check size={10} color="#fff" strokeWidth={3.5} />
                      </span>
                      <span className="text-[14px] font-light" style={{ color: "var(--text-1)" }}>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative px-6 pt-8 pb-24 md:pb-32 text-center">
        <Reveal>
          <p className="text-[13px] font-semibold uppercase tracking-[0.24em] mb-5" style={{ color: "var(--accent)" }}>Vaiiya</p>
          <h2 className="text-[clamp(2rem,6vw,3.6rem)] font-extralight leading-[1.02] tracking-tight mb-4" style={{ color: "var(--text-0)" }}>
            Commence là où <span style={ACCENT_TEXT}>tu en es</span>.
          </h2>
          <p className="text-[15px] md:text-base font-light max-w-md mx-auto leading-relaxed mb-9" style={{ color: "var(--text-2)" }}>
            Une séance suffit pour découvrir si Vaiiya est fait pour toi.
          </p>
          <div className="flex flex-col items-center gap-4">
            <CtaPrimary label="Essayer une séance" big />
            <Link href="/auth?mode=login">
              <span className="text-[13px] font-light cursor-pointer" style={{ color: "var(--text-3)" }}>
                Déjà un compte ? <span style={{ color: "var(--accent)", fontWeight: 500 }}>Se connecter</span>
              </span>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Pied de page */}
      <footer className="relative px-6 py-10 border-t" style={{ borderColor: "rgba(var(--accent-rgb),0.12)" }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-lg font-extralight tracking-[0.12em]" style={{ color: "var(--text-1)" }}>Vaiiya</span>
          <p className="text-[12px] font-light" style={{ color: "var(--text-3)" }}>Entraînement · Nutrition · Coach IA</p>
          <div className="flex items-center gap-5 text-[12px] font-light" style={{ color: "var(--text-3)" }}>
            <Link href="/auth?mode=login"><span className="cursor-pointer hover:opacity-70">Se connecter</span></Link>
            <Link href="/premium"><span className="cursor-pointer hover:opacity-70">Premium</span></Link>
            <Link href="/confidentialite"><span className="cursor-pointer hover:opacity-70">Confidentialité</span></Link>
            <span style={{ color: "var(--text-3)" }}>© 2026</span>
          </div>
        </div>
      </footer>
    </>
  );
}

export default function LandingStory() {
  return (
    <div className="relative w-full">
      <SectionQuoi />
      <SectionConnecte />
      <SectionCatalogue />
      <SectionTunnel />
      <SectionIntelligence />
      <SectionConstance />
      <SectionRelais />
      <SectionFinale />
    </div>
  );
}

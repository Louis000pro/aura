"use client";

/**
 * LandingStory — La présentation qui scrolle sous le hero de vaiiya.fr.
 *
 * Pensée comme une page produit premium : on déroule CE QU’EST Vaiiya, CE
 * QU’IL FAIT (maquettes fidèles de chaque fonctionnalité réelle), POUR QUI
 * c’est fait, puis un dernier appel à l’action. Aucune donnée inventée :
 * on vend les bénéfices concrets, pas de faux chiffres ni faux témoignages.
 *
 * ADN visuel : verre dépoli clair (.lg-*), dégradés violet → or, Geist light,
 * révélations au scroll (whileInView, une seule fois).
 */

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Brain, Utensils, Activity, Dumbbell, TrendingUp, Users,
  Sparkles, ArrowRight, Check, Flame, Crown,
} from "lucide-react";

/* Dégradé de marque pour le texte d’accent */
const GRAD_TEXT: React.CSSProperties = {
  backgroundImage: "linear-gradient(135deg,#A78BFA 0%,#C4902A 100%)",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  color: "transparent",
};

const EASE = [0.22, 1, 0.36, 1] as const;

/** Ancre de la 1re section — partagée avec le bouton « Découvrir » du hero (page.tsx). */
export const DISCOVER_ANCHOR = "decouvrir";

/** Surface « carte verre clair » réutilisée (cartes secondaires + personas). */
const GLASS_CARD: React.CSSProperties = {
  background: "rgba(255,255,255,0.6)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.85)",
};

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
      style={{ letterSpacing: "0.24em", color: "#7C6BAA" }}
    >
      <span className="inline-block h-px w-6" style={{ background: "linear-gradient(90deg, transparent, #A78BFA)" }} />
      {children}
      <span className="inline-block h-px w-6" style={{ background: "linear-gradient(90deg, #D4A843, transparent)" }} />
    </span>
  );
}

/* ════════════════════════════ MAQUETTES ════════════════════════════ */

/* Coach IA vocal — orbe + onde + courte conversation */
const WAVE = [10, 18, 26, 16, 22, 12, 20, 14];
function MockCoachIA() {
  return (
    <div className="lg-surface lg-highlight rounded-[28px] p-5 w-[290px] sm:w-[320px]" style={{ boxShadow: "0 24px 60px -18px rgba(167,139,250,0.4)" }}>
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#A78BFA,#D4A843)", boxShadow: "0 4px 14px rgba(167,139,250,0.5)" }}>
          <motion.div className="absolute inset-0 rounded-full" style={{ border: "1.5px solid rgba(167,139,250,0.5)" }}
            animate={{ scale: [1, 1.35], opacity: [0.6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }} />
          <Sparkles size={15} color="#fff" strokeWidth={2} />
        </div>
        <div>
          <p className="text-[13px] font-semibold leading-none" style={{ color: "#2D2150" }}>Coach Vaiiya</p>
          <p className="text-[10px] font-light mt-1" style={{ color: "#A78BFA" }}>● à l’écoute</p>
        </div>
      </div>

      {/* Bulle utilisateur */}
      <div className="flex justify-end mb-3">
        <div className="px-3.5 py-2.5 rounded-2xl rounded-tr-md text-[12px] font-medium max-w-[78%]"
          style={{ background: "linear-gradient(135deg,#A78BFA,#9333EA)", color: "#fff" }}>
          Crée-moi une séance pecs, 45 min 💪
        </div>
      </div>

      {/* Réponse vocale du coach + onde */}
      <div className="flex items-end gap-2">
        <div className="px-3.5 py-3 rounded-2xl rounded-tl-md max-w-[82%]" style={{ background: "rgba(240,235,255,0.85)" }}>
          <div className="flex items-center gap-[3px] h-6 mb-1.5">
            {WAVE.map((h, i) => (
              <motion.span key={i} className="w-[3px] rounded-full" style={{ height: h, background: "linear-gradient(180deg,#A78BFA,#D4A843)" }}
                animate={{ scaleY: [1, 1.8, 1] }}
                transition={{ duration: 0.9 + (i % 3) * 0.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.06 }} />
            ))}
          </div>
          <p className="text-[12px] font-medium leading-snug" style={{ color: "#2D2150" }}>
            C’est prêt : 5 exercices, échauffement inclus. On démarre ?
          </p>
        </div>
      </div>
    </div>
  );
}

/* Nutrition par photo — photo + plat détecté + macros */
function MacroBar({ label, val, pct, color }: { label: string; val: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[10px] font-medium" style={{ color: "#5A6177" }}>{label}</span>
        <span className="text-[10px] font-semibold" style={{ color: "#2D2150" }}>{val}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(167,139,250,0.14)" }}>
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }}
          transition={{ duration: 1, ease: EASE, delay: 0.2 }} />
      </div>
    </div>
  );
}
function MockNutrition() {
  return (
    <div className="lg-surface lg-highlight rounded-[28px] p-4 w-[290px] sm:w-[320px]" style={{ boxShadow: "0 24px 60px -18px rgba(212,168,67,0.34)" }}>
      {/* "Photo" du plat */}
      <div className="relative h-32 rounded-2xl overflow-hidden mb-3 flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,#FDF3E0 0%,#F5E6A3 50%,#E9D9FF 100%)" }}>
        <div className="absolute inset-0 opacity-60" style={{ background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.7), transparent 60%)" }} />
        <Utensils size={34} color="#C4902A" strokeWidth={1.4} />
        <div className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-1 rounded-full"
          style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(6px)" }}>
          <Sparkles size={10} color="#A78BFA" />
          <span className="text-[9px] font-semibold" style={{ color: "#7C5CFA" }}>Analysé par l’IA</span>
        </div>
      </div>
      {/* Plat détecté */}
      <div className="flex items-end justify-between mb-3">
        <p className="text-[14px] font-semibold" style={{ color: "#2D2150" }}>Poke bowl saumon</p>
        <p className="text-[13px] font-light" style={{ color: "#C4902A" }}><b style={{ fontWeight: 700 }}>642</b> kcal</p>
      </div>
      {/* Macros */}
      <div className="space-y-2.5">
        <MacroBar label="Protéines" val="38 g" pct={70} color="linear-gradient(90deg,#A78BFA,#9333EA)" />
        <MacroBar label="Glucides" val="54 g" pct={55} color="linear-gradient(90deg,#D4A843,#E8C766)" />
        <MacroBar label="Lipides" val="22 g" pct={38} color="linear-gradient(90deg,#C4AAFF,#A78BFA)" />
      </div>
    </div>
  );
}

/* Analyse du mouvement — silhouette + score technique */
function MockAnalyse() {
  return (
    <div className="lg-surface lg-highlight rounded-[28px] p-5 w-[290px] sm:w-[320px]" style={{ boxShadow: "0 24px 60px -18px rgba(167,139,250,0.4)" }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] font-semibold" style={{ color: "#2D2150" }}>Squat · 12 reps</p>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold"
          style={{ background: "rgba(16,185,129,0.12)", color: "#0E9E6E" }}>
          <Check size={11} strokeWidth={3} /> Technique 92%
        </span>
      </div>
      {/* Silhouette avec articulations détectées */}
      <div className="relative h-36 rounded-2xl mb-4 overflow-hidden flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,#1A1535 0%,#2D2150 100%)" }}>
        <svg width="120" height="130" viewBox="0 0 120 130" fill="none">
          {/* segments */}
          <g stroke="#A78BFA" strokeWidth="2.5" strokeLinecap="round" opacity="0.9">
            <line x1="60" y1="22" x2="60" y2="58" />
            <line x1="60" y1="34" x2="38" y2="52" />
            <line x1="60" y1="34" x2="82" y2="52" />
            <line x1="60" y1="58" x2="42" y2="86" />
            <line x1="60" y1="58" x2="78" y2="86" />
            <line x1="42" y1="86" x2="48" y2="116" />
            <line x1="78" y1="86" x2="72" y2="116" />
          </g>
          {/* articulations */}
          {[[60,18],[60,34],[38,52],[82,52],[60,58],[42,86],[78,86],[48,116],[72,116]].map(([x, y], i) => (
            <motion.circle key={i} cx={x} cy={y} r="4" fill="#fff"
              animate={{ opacity: [0.55, 1, 0.55] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.12 }} />
          ))}
          <circle cx="60" cy="14" r="8" fill="none" stroke="#D4A843" strokeWidth="2.5" />
        </svg>
        <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(6px)" }}>
          <p className="text-[10px] font-medium" style={{ color: "#EDE8FF" }}>💡 Descends un peu plus bas, dos bien droit</p>
        </div>
      </div>
    </div>
  );
}

/* Coque commune des 3 maquettes secondaires (grille). */
function MockShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg-surface lg-highlight rounded-[24px] p-4 w-full" style={{ boxShadow: "0 18px 44px -16px rgba(167,139,250,0.3)" }}>
      {children}
    </div>
  );
}

/* Séances sur-mesure — liste d’exercices + bouton */
const EXOS = [
  { n: "Développé couché", s: "4 × 8", done: true },
  { n: "Tractions", s: "4 × 10", done: true },
  { n: "Développé militaire", s: "3 × 12", done: false },
  { n: "Rowing haltère", s: "3 × 12", done: false },
];
function MockSeance() {
  return (
    <MockShell>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center lg-rose"><Dumbbell size={14} color="#7C5CFA" /></div>
        <p className="text-[13px] font-semibold" style={{ color: "#2D2150" }}>Haut du corps</p>
        <span className="ml-auto text-[10px] font-medium" style={{ color: "#A78BFA" }}>2/4</span>
      </div>
      <div className="space-y-1.5">
        {EXOS.map((e) => (
          <div key={e.n} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl" style={{ background: "rgba(240,235,255,0.5)" }}>
            <div className="w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: e.done ? "linear-gradient(135deg,#A78BFA,#9333EA)" : "rgba(167,139,250,0.18)" }}>
              {e.done && <Check size={10} color="#fff" strokeWidth={3.5} />}
            </div>
            <span className="text-[11.5px] font-medium flex-1" style={{ color: e.done ? "#A0AEC0" : "#2D2150" }}>{e.n}</span>
            <span className="text-[10.5px] font-semibold" style={{ color: "#7C6BAA" }}>{e.s}</span>
          </div>
        ))}
      </div>
    </MockShell>
  );
}

/* Progression & score — anneau + barres */
const BARS = [40, 52, 46, 64, 58, 76, 88];
function MockProgression() {
  const R = 26, C = 2 * Math.PI * R;
  return (
    <MockShell>
      <div className="flex items-center gap-3 mb-3">
        <div className="relative" style={{ width: 64, height: 64 }}>
          <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(167,139,250,0.15)" strokeWidth="5" />
            <motion.circle cx="32" cy="32" r={R} fill="none" stroke="url(#pg)" strokeWidth="5" strokeLinecap="round"
              strokeDasharray={C} initial={{ strokeDashoffset: C }} whileInView={{ strokeDashoffset: C * 0.09 }}
              viewport={{ once: true }} transition={{ duration: 1.4, ease: EASE, delay: 0.2 }} />
            <defs><linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#A78BFA" /><stop offset="100%" stopColor="#D4A843" /></linearGradient></defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-light leading-none" style={{ color: "#2D2150" }}>91</span>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#A0AEC0" }}>Score du jour</p>
          <p className="text-[12.5px] font-medium mt-0.5" style={{ color: "#2D2150" }}>En grande forme ✦</p>
          <p className="inline-flex items-center gap-1 text-[11px] font-semibold mt-1" style={{ color: "#0E9E6E" }}>
            <TrendingUp size={12} /> +12% cette semaine
          </p>
        </div>
      </div>
      <div className="flex items-end justify-between gap-1.5 h-14 px-1">
        {BARS.map((h, i) => (
          <motion.div key={i} className="flex-1 rounded-t-md" style={{ background: i === BARS.length - 1 ? "linear-gradient(180deg,#A78BFA,#D4A843)" : "rgba(167,139,250,0.3)" }}
            initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.1 + i * 0.06 }} />
        ))}
      </div>
    </MockShell>
  );
}

/* Communauté — mini post de feed */
function MockCommunaute() {
  return (
    <MockShell>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#A78BFA,#D4A843)" }}>L</div>
        <div>
          <p className="text-[12.5px] font-semibold leading-none" style={{ color: "#2D2150" }}>Léa M.</p>
          <p className="text-[10px] font-light mt-1" style={{ color: "#A0AEC0" }}>il y a 2 h</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-semibold lg-rose" style={{ color: "#7C5CFA" }}>
          <Flame size={10} color="#D4A843" /> Record
        </span>
      </div>
      <p className="text-[12px] font-medium mb-3" style={{ color: "#2D2150" }}>
        Nouveau PR au squat aujourd’hui 🎉 <span style={{ color: "#A78BFA", fontWeight: 700 }}>#progression</span>
      </p>
      <div className="h-20 rounded-xl mb-2.5" style={{ background: "linear-gradient(135deg,#E9D9FF,#F5E6A3)" }} />
      <div className="flex items-center gap-4 text-[11px] font-medium" style={{ color: "#7C6BAA" }}>
        <span>❤️ 128</span><span>💬 14</span><span className="ml-auto">↗ Partager</span>
      </div>
    </MockShell>
  );
}

/* ════════════════════════════ SECTIONS ════════════════════════════ */

/* Grande ligne fonctionnalité (texte + maquette, alternée) */
function FeatureRow({
  index, eyebrow, title, accent, desc, bullets, mockup,
}: {
  index: number; eyebrow: string; title: React.ReactNode; accent: string;
  desc: string; bullets: string[]; mockup: React.ReactNode;
}) {
  const reverse = index % 2 === 1;
  return (
    <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
      <Reveal className={reverse ? "md:order-2" : ""}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="mt-5 text-[clamp(1.7rem,3.6vw,2.4rem)] font-light leading-[1.12] tracking-tight" style={{ color: "#1A202C" }}>
          {title}
        </h3>
        <p className="mt-4 text-[15px] md:text-base font-light leading-relaxed" style={{ color: "#5A6177" }}>{desc}</p>
        <ul className="mt-6 space-y-2.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5">
              <span className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#A78BFA,#D4A843)" }}>
                <Check size={10} color="#fff" strokeWidth={3.5} />
              </span>
              <span className="text-[14px] font-light" style={{ color: "#4A5568" }}>{b}</span>
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal delay={0.1} className={`flex justify-center ${reverse ? "md:order-1" : ""}`}>
        <div className="relative">
          <div className="absolute -inset-6 rounded-[40px] pointer-events-none"
            style={{ background: `radial-gradient(circle at 50% 40%, ${accent}, transparent 70%)`, filter: "blur(24px)" }} />
          <div className="relative">{mockup}</div>
        </div>
      </Reveal>
    </div>
  );
}

/* Carte secondaire (grille) */
function MiniCard({ icon: Icon, title, desc, mock }: { icon: React.ElementType; title: string; desc: string; mock: React.ReactNode }) {
  return (
    <Reveal className="h-full">
      <div className="h-full rounded-[26px] p-5 flex flex-col"
        style={{ ...GLASS_CARD, boxShadow: "0 12px 40px -14px rgba(167,139,250,0.2)" }}>
        <div className="mb-4">{mock}</div>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center lg-rose"><Icon size={14} color="#7C5CFA" /></div>
          <h4 className="text-[15px] font-semibold" style={{ color: "#1A202C" }}>{title}</h4>
        </div>
        <p className="text-[13px] font-light leading-relaxed" style={{ color: "#5A6177" }}>{desc}</p>
      </div>
    </Reveal>
  );
}

const PERSONAS = [
  { tag: "Tu débutes", title: "On te prend par la main", desc: "Pas besoin de savoir quoi faire : l’IA construit tes séances et t’explique chaque geste. Tu te lances, c’est tout." },
  { tag: "Tu progresses déjà", title: "Mesure tout, dépasse-toi", desc: "Charges, volume, technique, récup’ : tu suis chaque détail et tu repousses tes limites séance après séance." },
  { tag: "Tu manques de temps", title: "Ton coach pense pour toi", desc: "Séances calibrées sur ton agenda, nutrition réglée d’une photo. Le minimum d’efforts mental, le maximum de résultats." },
  { tag: "Un objectif précis", title: "Taillé pour ton but", desc: "Perte de poids, prise de masse ou remise en forme : Vaiiya adapte tout à ce que tu vises vraiment." },
];

/* Fonctionnalités phares — pilotent les lignes alternées (l'alternance vient de l'index). */
const FEATURES = [
  {
    eyebrow: "Coach IA vocal",
    accent: "rgba(167,139,250,0.28)",
    title: <>Parle. Il <span style={GRAD_TEXT}>t’écoute</span>, et il agit.</>,
    desc: "Demande à voix haute, comme à un vrai coach. Vaiiya crée ta séance, répond à tes questions et ajuste ton plan en temps réel — sans que tu touches un seul réglage.",
    bullets: ["Séances générées sur commande", "Répond à toutes tes questions", "S’adapte à ta forme du jour"],
    mockup: <MockCoachIA />,
  },
  {
    eyebrow: "Nutrition par photo",
    accent: "rgba(212,168,67,0.26)",
    title: <>Photographie ton plat. <span style={GRAD_TEXT}>L’IA fait le reste</span>.</>,
    desc: "Fini de tout peser et de chercher dans des bases interminables. Une photo, et Vaiiya reconnaît ton repas, estime les calories et détaille tes macros en un instant.",
    bullets: ["Reconnaissance du plat par l’IA", "Calories et macros automatiques", "Ton suivi nutrition sans friction"],
    mockup: <MockNutrition />,
  },
  {
    eyebrow: "Analyse du mouvement",
    accent: "rgba(167,139,250,0.28)",
    title: <>Filme ton geste, <span style={GRAD_TEXT}>corrige ta technique</span>.</>,
    desc: "Vaiiya analyse ton mouvement, repère tes appuis et te donne un retour clair pour t’entraîner mieux — et surtout sans te blesser.",
    bullets: ["Détection des articulations", "Score de technique instantané", "Conseils concrets pour progresser"],
    mockup: <MockAnalyse />,
  },
];

export default function LandingStory() {
  return (
    <div className="relative w-full">

      {/* ─────────── 1. CE QU’EST VAIIYA ─────────── */}
      <section id={DISCOVER_ANCHOR} className="relative px-6 py-24 md:py-32 scroll-mt-10">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal><Eyebrow>C’est quoi Vaiiya ?</Eyebrow></Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-6 text-[clamp(2rem,5.4vw,3.4rem)] font-extralight leading-[1.1] tracking-tight" style={{ color: "#1A202C" }}>
              Tout ton coaching réuni dans{" "}
              <span style={GRAD_TEXT}>une seule app intelligente</span>.
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-7 text-base md:text-lg font-light leading-relaxed max-w-xl mx-auto" style={{ color: "#5A6177" }}>
              Un coach qui te parle, des séances faites pour toi, ta nutrition comprise d’une simple photo
              et ta progression mesurée jour après jour. Vaiiya remplace les dix apps que tu jongles
              aujourd’hui — et te fait avancer pour de vrai.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="mt-10 flex flex-wrap justify-center gap-2.5">
              {["S’entraîner", "Manger mieux", "Progresser", "Rester motivé"].map((t) => (
                <span key={t} className="px-4 py-2 rounded-full text-[13px] font-medium"
                  style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(167,139,250,0.2)", color: "#5A4B86" }}>
                  {t}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────── 2. FONCTIONNALITÉS PHARES ─────────── */}
      <section className="relative px-6 py-10 md:py-14">
        <div className="max-w-5xl mx-auto space-y-24 md:space-y-36">
          {FEATURES.map((f, i) => (
            <FeatureRow key={f.eyebrow} index={i} {...f} />
          ))}
        </div>
      </section>

      {/* ─────────── 3. ET TOUT LE RESTE ─────────── */}
      <section className="relative px-6 py-24 md:py-32">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <Reveal><Eyebrow>Et tout pour rester sur ta lancée</Eyebrow></Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-6 text-[clamp(1.8rem,4.4vw,2.8rem)] font-extralight tracking-tight" style={{ color: "#1A202C" }}>
                Un écosystème complet, pas une app de plus.
              </h2>
            </Reveal>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <MiniCard icon={Dumbbell} title="Séances sur-mesure"
              desc="Commence en un tap, seul ou guidé par l’IA. Crée, lance, partage tes programmes — et entraîne-toi sur ceux des autres."
              mock={<MockSeance />} />
            <MiniCard icon={TrendingUp} title="Progression & score"
              desc="Un score quotidien qui résume ta forme, des stats claires et ta courbe qui monte. Tu vois enfin tes efforts payer."
              mock={<MockProgression />} />
            <MiniCard icon={Users} title="Communauté"
              desc="Partage tes performances, suis tes amis et puise la motivation du groupe. Le réseau de ceux qui avancent vraiment."
              mock={<MockCommunaute />} />
          </div>
        </div>
      </section>

      {/* ─────────── 4. POUR QUI ─────────── */}
      <section className="relative px-6 py-24 md:py-32">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <Reveal><Eyebrow>Pour qui ?</Eyebrow></Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-6 text-[clamp(2rem,5vw,3.2rem)] font-extralight tracking-tight" style={{ color: "#1A202C" }}>
                Peu importe <span style={GRAD_TEXT}>où tu en es</span>.
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-6 text-base md:text-lg font-light max-w-xl mx-auto leading-relaxed" style={{ color: "#5A6177" }}>
                Vaiiya s’adapte à ton niveau, à ton temps et à tes objectifs — du tout premier jour jusqu’à tes records.
              </p>
            </Reveal>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {PERSONAS.map((p, i) => (
              <Reveal key={p.tag} delay={i * 0.06}>
                <div className="h-full rounded-[24px] p-6"
                  style={{ ...GLASS_CARD, boxShadow: "0 12px 40px -16px rgba(167,139,250,0.18)" }}>
                  <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold mb-3 lg-rose" style={{ color: "#7C5CFA" }}>{p.tag}</span>
                  <h3 className="text-[17px] font-semibold mb-2" style={{ color: "#1A202C" }}>{p.title}</h3>
                  <p className="text-[14px] font-light leading-relaxed" style={{ color: "#5A6177" }}>{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── 5. GRATUIT POUR COMMENCER ─────────── */}
      <section className="relative px-6 py-16">
        <Reveal>
          <div className="max-w-4xl mx-auto rounded-[32px] px-7 py-10 md:px-12 md:py-12 text-center relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(240,235,255,0.9) 0%, rgba(255,251,240,0.9) 100%)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 24px 64px -24px rgba(167,139,250,0.3)" }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5" style={{ background: "rgba(255,255,255,0.7)" }}>
              <Crown size={13} color="#D4A843" />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#7C6BAA" }}>Gratuit pour commencer</span>
            </div>
            <h2 className="text-[clamp(1.6rem,4vw,2.4rem)] font-light tracking-tight mb-3" style={{ color: "#1A202C" }}>
              Crée ton compte en 30 secondes.
            </h2>
            <p className="text-[15px] font-light max-w-lg mx-auto leading-relaxed" style={{ color: "#5A6177" }}>
              Lance-toi gratuitement et découvre tout ce que Vaiiya peut faire pour toi.
              Tu passeras Premium le jour où tu voudras aller encore plus loin.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <CtaPrimary label="Commencer gratuitement" />
              <Link href="/premium">
                <span className="inline-flex items-center gap-1.5 px-5 py-3 rounded-full text-[14px] font-medium cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(167,139,250,0.25)", color: "#5A4B86" }}>
                  Voir Premium
                </span>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ─────────── 6. CTA FINAL ─────────── */}
      <section className="relative px-6 pt-16 pb-24 md:pt-24 md:pb-32 text-center">
        <Reveal>
          <p className="text-[13px] font-semibold uppercase tracking-[0.24em] mb-5" style={{ color: "#A78BFA" }}>Vaiiya</p>
          <h2 className="text-[clamp(2.4rem,7vw,4.5rem)] font-extralight leading-[0.98] tracking-tight" style={{ color: "#1A202C" }}>
            Prêt à devenir
          </h2>
          <h2 className="text-[clamp(2.4rem,7vw,4.5rem)] font-extralight leading-[1.02] tracking-tight mb-8" style={GRAD_TEXT}>
            inarrêtable ?
          </h2>
          <div className="flex flex-col items-center gap-4">
            <CtaPrimary label="Commencer gratuitement" big />
            <Link href="/auth?mode=login">
              <span className="text-[13px] font-light cursor-pointer" style={{ color: "#7C6BAA" }}>
                Déjà un compte ? <span style={{ color: "#A78BFA", fontWeight: 500 }}>Se connecter</span>
              </span>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ─────────── PIED DE PAGE ─────────── */}
      <footer className="relative px-6 py-10 border-t" style={{ borderColor: "rgba(167,139,250,0.12)" }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-lg font-extralight tracking-[0.12em]" style={{ color: "#2D3748" }}>Vaiiya</span>
          <p className="text-[12px] font-light" style={{ color: "#A0AEC0" }}>Coach IA · Musculation · Nutrition</p>
          <div className="flex items-center gap-5 text-[12px] font-light" style={{ color: "#7C6BAA" }}>
            <Link href="/auth?mode=login"><span className="cursor-pointer hover:opacity-70">Se connecter</span></Link>
            <Link href="/premium"><span className="cursor-pointer hover:opacity-70">Premium</span></Link>
            <span style={{ color: "#C4B8E0" }}>© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* Bouton principal réutilisable */
function CtaPrimary({ label, big = false }: { label: string; big?: boolean }) {
  return (
    <Link href="/auth?mode=signup">
      <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
        className="relative inline-flex items-center gap-2 cursor-pointer overflow-hidden rounded-full font-semibold text-white"
        style={{
          padding: big ? "16px 34px" : "13px 26px",
          fontSize: big ? 16 : 14,
          background: "linear-gradient(135deg,#A78BFA 0%,#D4A843 100%)",
          boxShadow: "0 10px 30px rgba(167,139,250,0.45), inset 0 1px 0 rgba(255,255,255,0.3)",
        }}>
        <motion.div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.35) 50%,transparent 65%)" }}
          animate={{ x: ["-120%", "120%"] }} transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.6 }} />
        <span className="relative z-10">{label}</span>
        <ArrowRight size={big ? 17 : 15} strokeWidth={2.4} className="relative z-10" />
      </motion.div>
    </Link>
  );
}

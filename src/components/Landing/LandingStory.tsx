"use client";

/**
 * LandingStory : le bas de vaiiya.fr, sous la vitrine (`LandingVitrine`).
 *
 * Il ne porte plus que les avis réels (au-dessus du seuil), ce que contient le
 * compte gratuit, l'appel final et le pied de page. Les sections qui
 * présentaient le produit ont été remplacées le 2026-10-12 par la vitrine
 * validée par Louis (`docs/maquettes/page-vitrine.html`).
 */

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { SEO_PAGES, LEGAL_PAGES } from "@/lib/seoPages";
/* Le résumé des avis, lui aussi compté côté serveur et descendu en props. */
import { SEUIL_AVIS_PUBLIC, type ResumeAvis } from "@/lib/avisTypes";

/* Couleur d'action du système D : violet vers magenta. Le CTA principal est
   TOUJOURS violet (jamais violet vers or). Constante de marque, stable clair/sombre. */
const ACTION_BG = "linear-gradient(135deg,#8B5CF6 0%,#C13BC1 100%)";
/* Les mots d'accent prennent le dégradé du LOGO, comme la vitrine au-dessus. */
const ACCENT_TEXT: React.CSSProperties = {
  backgroundImage: "linear-gradient(120deg,#A66CF4 0%,#E68FC6 52%,#FEB86E 100%)",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  color: "transparent",
};
const TEAL = "#2BD4A0"; // corps, progrès, réussite
const GOLD = "#FFB020"; // énergie : calories, effort, série

const EASE = [0.22, 1, 0.36, 1] as const;


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
    <h2 className="mt-6 text-[clamp(1.625rem,4.6vw,3rem)] font-extralight tracking-tight leading-[1.12]"
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
      <span className="inline-flex items-center gap-1.5 px-5 py-3 rounded-full text-[13px] font-medium cursor-pointer lg-surface"
        style={{ color: "var(--text-body)", border: "1px solid rgba(var(--accent-rgb),0.25)" }}>
        {label}
      </span>
    </Link>
  );
}

/* ════════════════════════════ 6 bis · LES AVIS ════════════════════════════
   Preuve sociale, tout en bas, juste avant l'invitation à créer un compte.

   Ne s'affiche QUE si `avis.total >= SEUIL_AVIS_PUBLIC` (décidé par la page
   serveur, mais on regarde ici aussi par sécurité) : « 5,0 ★ (1 avis) » a l'air
   fabriqué. Les avis sont RÉELS, modérés, et rendus côté serveur — donc dans le
   HTML, donc utiles au référencement. Les avatars sont des URL distantes (pas
   de domaine configuré pour next/image), donc `<img>` simple, comme /avis.
   ───────────────────────────────────────────────────────────────────── */

function EtoilesLanding({ note, taille = 15 }: { note: number; taille?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${note} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={taille} height={taille} viewBox="0 0 24 24" aria-hidden
          style={{ color: n <= note ? GOLD : "rgba(var(--accent-rgb),0.22)" }}
          fill={n <= note ? GOLD : "transparent"} stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round">
          <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.9l-5.8 3 1.1-6.45-4.7-4.6 6.5-.95z" />
        </svg>
      ))}
    </span>
  );
}

function SectionAvis({ avis }: { avis: ResumeAvis }) {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="max-w-4xl mx-auto text-center">
        <Reveal><Eyebrow>Les avis</Eyebrow></Reveal>
        <Reveal delay={0.06}>
          <SectionTitle>
            Ils utilisent Vaiiya <span style={ACCENT_TEXT}>au quotidien</span>.
          </SectionTitle>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="mt-7 flex items-center justify-center gap-3.5">
            <span className="text-[clamp(2rem,7vw,2.8rem)] font-extralight leading-none" style={{ color: "var(--text-0)" }}>
              {avis.moyenne.toFixed(1).replace(".", ",")}
            </span>
            <EtoilesLanding note={Math.round(avis.moyenne)} taille={20} />
            <span className="text-[13px] font-light" style={{ color: "var(--text-3)" }}>sur {avis.total} avis</span>
          </div>
        </Reveal>

        <div className="mt-12 grid md:grid-cols-3 gap-4 text-left">
          {avis.apercu.map((a, i) => (
            <Reveal key={a.id} delay={0.06 + i * 0.06}>
              <div className="h-full rounded-[22px] p-5 lg-surface lg-highlight">
                <div className="flex items-center gap-2.5 mb-3">
                  {a.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.avatar_url} alt="" width={36} height={36} className="rounded-full object-cover w-9 h-9" />
                  ) : (
                    <span className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-bold text-white"
                      style={{ background: ACTION_BG }}>{a.pseudo.charAt(0).toUpperCase()}</span>
                  )}
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold leading-tight truncate" style={{ color: "var(--text-0)" }}>{a.pseudo}</p>
                    <p className="text-[11px] font-light" style={{ color: "var(--text-3)" }}>
                      {new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <EtoilesLanding note={a.note} taille={14} />
                {a.texte.trim() && (
                  <p className="mt-2.5 text-[14px] font-light leading-relaxed" style={{ color: "var(--text-2)" }}>{a.texte}</p>
                )}
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.14}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3.5">
            <CtaPrimary label="Laisser un avis" href="/avis" />
            <CtaGhost label="Voir tous les avis" href="/avis" />
          </div>
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
              <p className="mt-6 text-[16px] font-light max-w-lg mx-auto leading-relaxed" style={{ color: "var(--text-2)" }}>
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
                    <span className="text-[13px] font-light" style={{ color: "var(--text-1)" }}>{b}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 pt-5 text-[13px] font-light leading-relaxed"
                style={{ color: "var(--text-3)", borderTop: "1px solid rgba(var(--accent-rgb),0.12)" }}>
                Vaiiya+ arrive plus tard, si tu veux les séances spécialisées, les missions supplémentaires et
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
          <h2 className="relative text-[clamp(2.125rem,6vw,3.6rem)] font-extralight leading-[1.02] tracking-tight mb-4" style={{ color: "var(--text-0)" }}>
            Commence là où <span style={ACCENT_TEXT}>tu en es</span>.
          </h2>
          <p className="relative text-[16px] font-light max-w-md mx-auto leading-relaxed mb-9" style={{ color: "var(--text-2)" }}>
            Une séance suffit pour savoir si Vaiiya est fait pour toi.
          </p>
          <div className="relative flex flex-col items-center gap-4">
            <CtaPrimary label="Créer mon compte gratuit" big />
            <p className="text-[13px] font-light" style={{ color: "var(--text-3)" }}>
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
              <span className="text-[20px] font-extralight tracking-[0.12em]" style={{ color: "var(--text-1)" }}>Vaiiya</span>
              <p className="mt-2 text-[13px] font-light leading-relaxed max-w-[24ch]" style={{ color: "var(--text-3)" }}>
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
                <FooterLien href="/premium" label="Vaiiya+" />
                {LEGAL_PAGES.map((p) => <FooterLien key={p.href} href={p.href} label={p.label} />)}
              </ul>
            </div>
          </div>

          <p className="mt-10 pt-6 text-[13px] font-light border-t" style={{ color: "var(--text-3)", borderColor: "rgba(var(--accent-rgb),0.10)" }}>
            © {new Date().getFullYear()} Vaiiya · Entraînement · Nutrition · Coach IA
          </p>
        </div>
      </footer>
    </>
  );
}

export default function LandingStory({ avis }: { avis: ResumeAvis }) {
  return (
    <div className="relative w-full" style={{ background: "#FFFBF5" }}>
      {/* La preuve sociale n'apparaît qu'au-dessus du seuil : sinon rien. */}
      {avis.total >= SEUIL_AVIS_PUBLIC && <SectionAvis avis={avis} />}
      <SectionFinale />
    </div>
  );
}

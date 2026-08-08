"use client";

/**
 * LandingHero : le premier écran de vaiiya.fr (visiteur non connecté).
 *
 * Promesse : « La constance n'est pas un don. C'est un choix. » Le titre porte
 * la philosophie (ce que Vaiiya récompense vraiment : revenir, pas performer un
 * jour), le sur-titre et le sous-titre portent le concret pour qu'on comprenne
 * en trois secondes de quoi il s'agit.
 *
 * ADN : système « D ». Le CTA principal est violet (jamais violet vers or).
 * Tout est en tokens pour que le mode sombre suive. Pas de nuée de particules :
 * une seule nappe douce et deux halos lents, rien qui distraie du message.
 */

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { DISCOVER_ANCHOR } from "./LandingStory";

/* Violet vers magenta : la couleur d'action du système D. */
const ACTION_BG = "linear-gradient(135deg,#8B5CF6 0%,#C13BC1 100%)";
const ACCENT_TEXT: React.CSSProperties = {
  backgroundImage: ACTION_BG,
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  color: "transparent",
};

const EASE = [0.16, 1, 0.3, 1] as const;

export default function LandingHero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative w-full min-h-[100svh] flex flex-col overflow-hidden">

      {/* ── Nappe chaude ancrée en bas, pleine largeur ── */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none z-0"
        style={{ height: "58%", background: "linear-gradient(to top, rgba(var(--gold-rgb),0.20) 0%, rgba(var(--gold-rgb),0.07) 45%, transparent 100%)" }} />

      {/* ── Deux halos lents (aucune particule : on ne distrait pas du message) ── */}
      <motion.div className="absolute rounded-full pointer-events-none z-0"
        style={{ top: "-22%", left: "-14%", width: 720, height: 720, background: "rgba(var(--accent-rgb),0.26)", filter: "blur(110px)", willChange: "transform" }}
        animate={reduce ? {} : { scale: [1, 1.1, 1], y: [-12, 16, -12] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute rounded-full pointer-events-none z-0"
        style={{ bottom: "-24%", right: "-14%", width: 680, height: 680, background: "rgba(var(--gold-rgb),0.22)", filter: "blur(110px)", willChange: "transform" }}
        animate={reduce ? {} : { scale: [1, 1.08, 1], y: [16, -18, 16] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 2 }} />

      {/* ── Barre de navigation ── */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative z-20 flex items-center justify-between gap-3 px-5 md:px-10 py-4"
      >
        <span className="text-xl md:text-2xl font-extralight tracking-[0.12em] flex-shrink-0" style={{ color: "var(--text-1)" }}>
          Vaiiya
        </span>
        <div className="flex items-center gap-2">
          <Link href="/auth?mode=login">
            <motion.span whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }}
              className="inline-flex items-center px-3.5 py-2 rounded-xl text-[13px] font-medium cursor-pointer whitespace-nowrap lg-surface"
              style={{ color: "var(--text-body)" }}>
              Se connecter
            </motion.span>
          </Link>
          <Link href="/auth?mode=signup">
            <motion.span whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold cursor-pointer whitespace-nowrap text-white"
              style={{ background: ACTION_BG, boxShadow: "0 6px 20px rgba(139,92,246,0.4)" }}>
              Commencer
              <ArrowRight size={13} strokeWidth={2.5} />
            </motion.span>
          </Link>
        </div>
      </motion.nav>

      {/* ── Contenu du hero ── */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 text-center pb-16">

        {/*
          Titre de la page.

          Le sur-titre « Entraînement · Nutrition · Coach IA » et le slogan sont
          deux morceaux du même titre : le premier dit ce qu'est Vaiiya, le
          second pourquoi on y revient. Ils étaient dans deux éléments séparés,
          et seul le slogan portait le rôle de titre. Une phrase magnifique mais
          muette sur le produit était donc la seule chose qu'un moteur lisait en
          h1.

          Ils sont réunis ici sans qu'un mot change ni qu'un pixel bouge : le
          sur-titre garde sa typo, son espacement et son animation, il devient
          simplement la première ligne du h1. Rien n'a été écrit pour les
          robots, on a seulement corrigé quel élément porte le titre.
        */}
        <h1 className="mb-7 md:mb-8">
          {/* Sur-titre : le concret, tout de suite */}
          <motion.span
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
            className="block text-[11px] md:text-xs font-semibold uppercase mb-7 md:mb-9"
            style={{ letterSpacing: "0.26em", color: "var(--text-3)" }}
          >
            Entraînement · Nutrition · Coach IA
          </motion.span>

          {/* La promesse */}
          <span className="block overflow-hidden">
            <motion.span
              initial={{ y: "108%", opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.25, ease: EASE }}
              className="block text-[clamp(2.1rem,7.2vw,4.4rem)] font-extralight leading-[1.06] tracking-tight"
              style={{ color: "var(--text-0)" }}
            >
              La constance n&rsquo;est pas un don.
            </motion.span>
          </span>
          <span className="block overflow-hidden">
            <motion.span
              initial={{ y: "108%", opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.45, ease: EASE }}
              className="block text-[clamp(2.1rem,7.2vw,4.4rem)] font-light leading-[1.1] tracking-tight"
              style={ACCENT_TEXT}
            >
              C&rsquo;est un choix.
            </motion.span>
          </span>
        </h1>

        {/* Sous-titre : ce que fait le produit */}
        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.6 }}
          className="text-[15px] md:text-lg font-light max-w-lg leading-relaxed mb-9 md:mb-10"
          style={{ color: "var(--text-2)" }}
        >
          {/* « coach IA » plutôt que « coach » : c'est le seul mot ajouté au
              haut de la page, et il dit vrai. Le reste de la phrase ne bouge
              pas, la première section porte déjà « une seule app ». */}
          Vaiiya relie tes séances, tes repas et ton coach IA en un seul parcours,
          pour que revenir demain reste simple.
        </motion.p>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm sm:max-w-none sm:w-auto"
        >
          <Link href="/auth?mode=signup" className="w-full sm:w-auto">
            <motion.span whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
              className="relative flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-full text-[15px] font-semibold cursor-pointer overflow-hidden text-white"
              style={{ background: ACTION_BG, boxShadow: "0 14px 36px rgba(139,92,246,0.45), inset 0 1px 0 rgba(255,255,255,0.28)" }}>
              {!reduce && (
                <motion.span className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.32) 50%,transparent 65%)" }}
                  animate={{ x: ["-120%", "120%"] }} transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.8 }} />
              )}
              <span className="relative z-10">Commencer gratuitement</span>
              <ArrowRight size={16} strokeWidth={2.4} className="relative z-10" />
            </motion.span>
          </Link>
          <button type="button"
            onClick={() => document.getElementById(DISCOVER_ANCHOR)?.scrollIntoView({ behavior: "smooth" })}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-4 rounded-full text-[15px] font-medium cursor-pointer lg-surface"
            style={{ color: "var(--text-body)", border: "1px solid rgba(var(--accent-rgb),0.22)" }}>
            <Sparkles size={15} style={{ color: "var(--accent)" }} />
            Voir Vaiiya en action
          </button>
        </motion.div>

        {/* Réassurance */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.05, duration: 0.6 }}
          className="mt-6 text-[12.5px] font-light"
          style={{ color: "var(--text-3)" }}
        >
          Sans carte bancaire · Gratuit pour commencer
        </motion.p>

        {/* Aperçu produit : les vraies photos du catalogue */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.7 }}
          className="mt-12 md:mt-14 flex items-end justify-center gap-2.5 md:gap-4"
        >
          {[
            { src: "/entrainement/cat-express.webp", label: "Express 12", meta: "12 min", big: false },
            { src: "/entrainement/cat-fullbody.webp", label: "Full Body", meta: "25 min", big: true },
            { src: "/entrainement/cat-recup.webp", label: "Récupération", meta: "15 min", big: false },
          ].map((c) => (
            <div key={c.label}
              className="relative rounded-[18px] md:rounded-[22px] overflow-hidden flex-shrink-0"
              style={{
                width: c.big ? 132 : 108,
                aspectRatio: "3 / 4",
                border: "1px solid rgba(var(--surface-rgb),0.7)",
                boxShadow: c.big
                  ? "0 26px 60px -22px rgba(139,92,246,0.55)"
                  : "0 18px 44px -20px rgba(139,92,246,0.4)",
              }}>
              <Image src={c.src} alt={c.label} fill sizes="140px" style={{ objectFit: "cover" }} priority={c.big} />
              <div className="absolute inset-x-0 bottom-0 h-2/3" style={{ background: "linear-gradient(to top, rgba(10,6,20,0.85), transparent)" }} />
              <div className="absolute inset-x-0 bottom-0 p-2.5">
                <p className="text-[11.5px] font-semibold text-white leading-tight">{c.label}</p>
                <p className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.78)" }}>{c.meta}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Invitation à dérouler ── */}
      <motion.button type="button" aria-label="Découvrir Vaiiya"
        onClick={() => document.getElementById(DISCOVER_ANCHOR)?.scrollIntoView({ behavior: "smooth" })}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 0.7 }}
        className="relative z-10 mx-auto mb-8 flex items-center justify-center rounded-full cursor-pointer lg-surface"
        style={{ width: 40, height: 40, border: "1px solid rgba(var(--accent-rgb),0.28)" }}
      >
        <motion.span animate={reduce ? {} : { y: [0, 5, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
          <ChevronDown size={20} strokeWidth={2.2} style={{ color: "var(--accent)" }} />
        </motion.span>
      </motion.button>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, BookOpen, Check, Clock, Sparkles, X } from "lucide-react";
import { lockBodyModal } from "@/lib/bodyModal";
import type { AdviceArticle } from "@/lib/adviceArticles";

export default function AdviceReaderSheet({
  article,
  onClose,
}: {
  article: AdviceArticle;
  onClose: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const unlockBody = lockBodyModal();
    document.body.classList.add("advice-reader-open");
    return () => {
      document.body.classList.remove("advice-reader-open");
      unlockBody();
    };
  }, []);

  const updateProgress = () => {
    const node = scroller.current;
    if (!node) return;
    const available = node.scrollHeight - node.clientHeight;
    setProgress(available <= 0 ? 100 : Math.min(100, Math.max(0, (node.scrollTop / available) * 100)));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[155] flex items-end md:items-center justify-center md:p-4"
      style={{ background: "rgba(8,5,16,0.7)", backdropFilter: "blur(5px)" }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <motion.article
        role="dialog"
        aria-modal="true"
        aria-labelledby={`advice-title-${article.id}`}
        initial={{ y: 55, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 370, damping: 34 }}
        className="relative w-full max-w-lg h-[100dvh] md:h-[92dvh] md:rounded-[30px] overflow-hidden flex flex-col"
        style={{
          background: "rgb(var(--surface-rgb))",
          border: "1px solid rgba(var(--accent-rgb),0.18)",
          boxShadow: "0 -20px 64px rgba(0,0,0,0.48)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute top-0 inset-x-0 h-[3px] z-30" style={{ background: "rgba(255,255,255,0.12)" }}>
          <div
            className="h-full transition-[width] duration-150"
            style={{ width: `${progress}%`, background: "#2BD4A0" }}
          />
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="absolute z-30 top-[calc(env(safe-area-inset-top)+14px)] md:top-4 right-4 h-9 px-3 rounded-full flex items-center justify-center gap-1.5 text-white"
          style={{
            background: "rgba(8,6,14,0.5)",
            border: "1px solid rgba(255,255,255,0.25)",
            backdropFilter: "blur(8px)",
          }}
          aria-label="Fermer le cours"
        >
          <X size={16} strokeWidth={2.2} />
          <span className="text-[10px] font-extrabold">Fermer</span>
        </motion.button>

        <div
          ref={scroller}
          onScroll={updateProgress}
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          <header className="relative min-h-[390px] md:min-h-[360px] flex items-end overflow-hidden">
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundImage: `url(/entrainement/${article.image}.webp)`,
                backgroundPosition: article.imagePosition ?? "center 28%",
                backgroundSize: "cover",
              }}
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ background: "linear-gradient(to top,rgba(6,5,10,0.97) 5%,rgba(6,5,10,0.56) 48%,rgba(6,5,10,0.08) 82%)" }}
            />
            <div className="relative z-10 px-6 pb-6 pt-[calc(env(safe-area-inset-top)+88px)] text-white">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.14em]"
                  style={{ background: "rgba(8,6,14,0.42)", border: "1px solid rgba(255,255,255,0.24)", backdropFilter: "blur(7px)" }}>
                  <BookOpen size={11} strokeWidth={2.2} aria-hidden />
                  {article.theme}
                </span>
                {article.access === "premium" && (
                  <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.14em]"
                    style={{ background: "linear-gradient(110deg,var(--accent),var(--gold))" }}>
                    <Sparkles size={10} strokeWidth={2.3} aria-hidden />
                    Premium
                  </span>
                )}
              </div>
              <h1 id={`advice-title-${article.id}`}
                className="text-[30px] md:text-[34px] font-black leading-[0.98] tracking-[-0.035em] max-w-[420px]"
                style={{ textWrap: "balance", textShadow: "0 3px 18px rgba(0,0,0,0.52)" }}>
                {article.title}
              </h1>
              <p className="mt-3 text-[13px] leading-relaxed font-medium text-white/78 max-w-[410px]">
                {article.subtitle}
              </p>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-white/68">
                <Clock size={12} strokeWidth={2.2} aria-hidden />
                <span>{article.readingMinutes} min de lecture</span>
                <span aria-hidden>·</span>
                <span>Conseil Vaiiya</span>
              </div>
            </div>
          </header>

          <div className="px-6 pt-7 pb-[calc(2rem+env(safe-area-inset-bottom))]">
            <p className="text-[17px] font-semibold leading-[1.7]" style={{ color: "var(--text-1)" }}>
              {article.intro}
            </p>

            <div className="mt-8 space-y-8">
              {article.sections.map((section, index) => (
                <section key={section.title}>
                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="text-[10px] font-black tabular-nums" style={{ color: "var(--accent)" }}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h2 className="text-[20px] font-black leading-tight tracking-[-0.02em]" style={{ color: "var(--text-1)", textWrap: "balance" }}>
                      {section.title}
                    </h2>
                  </div>
                  <div className="space-y-3.5">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="text-[15px] leading-[1.78] font-normal" style={{ color: "var(--text-2)" }}>
                        {paragraph}
                      </p>
                    ))}
                    {section.bullets && section.bullets.length > 0 && (
                      <ul className="space-y-2.5 pt-1">
                        {section.bullets.map((bullet) => (
                          <li key={bullet} className="flex gap-2.5 text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                            <Check size={14} strokeWidth={2.4} className="mt-1 flex-shrink-0" style={{ color: "var(--teal-encre)" }} aria-hidden />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              ))}
            </div>

            <section className="mt-9 rounded-[22px] p-5"
              style={{ background: "rgba(var(--accent-rgb),0.07)", border: "1px solid rgba(var(--accent-rgb),0.16)" }}>
              <p className="text-[9.5px] font-black uppercase tracking-[0.16em]" style={{ color: "var(--accent)" }}>
                Exemple concret
              </p>
              <p className="text-[14.5px] font-semibold leading-[1.72] mt-2" style={{ color: "var(--text-1)" }}>
                {article.example}
              </p>
            </section>

            <section className="mt-9 rounded-[22px] p-5"
              style={{ background: "rgba(43,212,160,0.08)", border: "1px solid rgba(43,212,160,0.18)" }}>
              <p className="text-[9.5px] font-black uppercase tracking-[0.16em]" style={{ color: "var(--teal-encre)" }}>
                À retenir
              </p>
              <p className="text-[17px] font-black leading-snug mt-2" style={{ color: "var(--text-1)", textWrap: "balance" }}>
                {article.takeaway}
              </p>
            </section>

            <section className="mt-3 rounded-[22px] p-5"
              style={{ background: "rgba(var(--accent-rgb),0.09)", border: "1px solid rgba(var(--accent-rgb),0.18)" }}>
              <p className="text-[9.5px] font-black uppercase tracking-[0.16em]" style={{ color: "var(--accent)" }}>
                Essaie ça
              </p>
              <p className="text-[14.5px] font-semibold leading-relaxed mt-2" style={{ color: "var(--text-1)" }}>
                {article.tryThis}
              </p>
            </section>

            <section className="mt-9">
              <p className="text-[9.5px] font-black uppercase tracking-[0.16em] mb-2.5" style={{ color: "var(--text-3)" }}>
                Repères scientifiques
              </p>
              <div className="space-y-1">
                {article.sources.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-2 py-2 text-[11px] font-semibold leading-relaxed"
                    style={{ color: "var(--text-3)" }}
                  >
                    <ArrowUpRight size={12} strokeWidth={2} className="mt-0.5 flex-shrink-0" aria-hidden />
                    <span>{source.label}</span>
                  </a>
                ))}
              </div>
              <p className="mt-3 text-[10.5px] leading-relaxed" style={{ color: "var(--text-3)", opacity: 0.82 }}>
                Ces repères sont généraux. Une douleur, une maladie, une grossesse ou un traitement peuvent demander un avis personnalisé.
              </p>
            </section>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              className="w-full h-12 rounded-2xl mt-8 text-[13px] font-black text-white"
              style={{
                background: "linear-gradient(135deg,#8B5CF6,#C13BC1)",
                boxShadow: "0 8px 22px rgba(139,92,246,0.28)",
              }}
            >
              Revenir aux conseils
            </motion.button>
          </div>
        </div>
      </motion.article>
    </motion.div>
  );
}

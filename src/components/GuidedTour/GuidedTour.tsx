"use client";

/* ════════════════════════════════════════════════════════════════════
   GuidedTour — la coque de la visite.

   Un seul écran plein, tenu du début à la fin : la visite ne navigue
   plus dans l'application et ne pointe plus le vrai DOM. Elle REJOUE
   Vaiiya en miniature (cf. scenes.tsx), pour deux raisons tranchées :
    · le jour de l'inscription, les vraies pages sont vides — l'ancienne
      visite braquait un projecteur sur des écrans sans rien dedans ;
    · les ancres DOM mouraient à chaque refonte, sans bruit.

   La coque ne connaît que le nombre de chapitres. Contenu = chapitres.tsx
   pour la structure, `guides.ts` pour les mots : c'est le Guide qui fait
   la visite, et la coque ne fait que lui donner la parole.

   Sans Guide résolu (choix pas fait, `20260818_guide_id.sql` pas collée,
   hors ligne), la visite est EXACTEMENT celle d'avant : le trait doré
   devant le surtitre, la marque Vaiiya à l'ouverture, les textes
   communs. Aucune branche n'invente d'écran intermédiaire.

   Avancer : bouton, glissement horizontal, flèches du clavier.
   Reculer : chevron, glissement inverse, flèche gauche.
   Quitter : « Passer » ou Échap — dans les deux cas la visite est
   marquée comme vue (on ne repropose pas ce qu'on a refusé).
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronLeft, X } from "lucide-react";
import { useGuidedTour } from "@/context/GuidedTourContext";
import { useAuth } from "@/context/AuthContext";
import { useGuideActif } from "@/context/GuideContext";
import { VisageGuide, prechargerGuide } from "@/components/AssistantMark";
import { voix, type CleVoix } from "@/lib/guides";
import { CHAPITRES } from "@/components/GuidedTour/chapitres";

const EASE = [0.22, 1, 0.36, 1] as const;
const BLANC = (a: number) => `rgba(255,255,255,${a})`;

/* Étoiles fixes du fond : positions déterministes (aucun Math.random →
   aucun écart entre le rendu serveur et le rendu navigateur). */
/* ── La scène s'ajuste au trou qui lui reste ──
   Chaque scène est dessinée à sa taille nominale (340 px de large, 250 à
   330 px de haut). Au lieu de la laisser déborder — puis rogner, puis
   inviter à faire défiler, ce que personne ne fait pendant une visite —
   on mesure la place disponible et on met la scène à l'échelle. Le texte
   et le bouton, eux, ne bougent jamais : ils sont la partie qui se lit.
   Le facteur ne descend pas sous 0,5 (au-delà ce serait illisible). */
function SceneAjustee({ children, cle }: { children: React.ReactNode; cle: string }) {
  const zone = useRef<HTMLDivElement>(null);
  const contenu = useRef<HTMLDivElement>(null);
  const [facteur, setFacteur] = useState(1);

  useLayoutEffect(() => {
    const mesurer = () => {
      const z = zone.current;
      const c = contenu.current;
      if (!z || !c) return;
      // offsetHeight/Width ignorent le `transform` : on mesure donc toujours
      // la taille NATURELLE, jamais la taille déjà réduite (pas de boucle).
      const h = c.offsetHeight;
      const w = c.offsetWidth;
      if (!h || !w) return;
      // La place réelle, c'est la zone MOINS ses marges internes : la
      // comparer à `clientHeight` (qui les inclut) laissait dépasser le haut
      // de la scène de quelques pixels sur les petits téléphones.
      const cs = getComputedStyle(z);
      const dispoH = z.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const dispoW = z.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const k = Math.min(1, dispoH / h, dispoW / w);
      setFacteur(Math.max(0.5, Number.isFinite(k) ? k : 1));
    };

    mesurer();
    const ro = new ResizeObserver(mesurer);
    if (zone.current) ro.observe(zone.current);
    if (contenu.current) ro.observe(contenu.current);
    window.addEventListener("resize", mesurer);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", mesurer);
    };
  }, [cle]);

  return (
    <div
      ref={zone}
      className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-7"
      style={{ paddingTop: 10, paddingBottom: 18 }}
    >
      <div
        ref={contenu}
        className="w-full"
        style={{
          maxWidth: 340,
          transform: `scale(${facteur})`,
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

const POUSSIERE = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  top: `${(i * 61 + 5) % 100}%`,
  or: i % 4 === 0,
  taille: i % 3 === 0 ? 2.5 : 1.8,
  delai: (i % 7) * 0.45,
  duree: 3 + (i % 4) * 0.8,
}));

export default function GuidedTour() {
  const { isOpen, stepIndex, totalSteps, next, prev, close } = useGuidedTour();
  const { user } = useAuth();
  const { guide } = useGuideActif();
  const reduce = useReducedMotion();
  const [sens, setSens] = useState(1);
  const precedent = useRef(stepIndex);

  /* Le sens de l'animation suit le sens de lecture. */
  useEffect(() => {
    setSens(stepIndex >= precedent.current ? 1 : -1);
    precedent.current = stepIndex;
  }, [stepIndex]);

  /* Les neuf chapitres défilent vite, et le visage change entre eux. Sans
     préchargement, le premier passage d'un état à l'autre viderait la
     pastille le temps du téléchargement, en plein milieu d'une phrase. */
  useEffect(() => {
    if (isOpen) prechargerGuide(guide);
  }, [isOpen, guide]);

  /* La page derrière ne défile pas pendant la visite (elle est masquée). */
  useEffect(() => {
    if (!isOpen) return;
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = avant; };
  }, [isOpen]);

  /* Clavier : → suivant · ← précédent · Échap quitter. */
  useEffect(() => {
    if (!isOpen) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "Escape") { e.preventDefault(); close(true); }
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [isOpen, next, prev, close]);

  if (!isOpen) return null;

  const chapitre = CHAPITRES[Math.min(stepIndex, CHAPITRES.length - 1)];
  const { Scene } = chapitre;
  const pseudo = user?.pseudo || "toi";
  const premier = stepIndex === 0;
  const dernier = stepIndex === totalSteps - 1;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Visite de Vaiiya"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[120] flex flex-col overflow-hidden"
      style={{
        background:
          "radial-gradient(135% 92% at 50% 8%, #241849 0%, #100A22 58%, #07050F 100%)",
      }}
    >
      {/* Poussière d'étoiles — le fond respire sans jamais attirer l'œil */}
      {!reduce &&
        POUSSIERE.map((p, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute rounded-full pointer-events-none"
            style={{
              width: p.taille,
              height: p.taille,
              left: p.left,
              top: p.top,
              background: p.or ? "#F5E6A3" : "#A78BFA",
              boxShadow: `0 0 8px ${p.or ? "rgba(245,230,163,0.7)" : "rgba(167,139,250,0.7)"}`,
            }}
            animate={{ opacity: [0.1, 0.6, 0.1] }}
            transition={{ duration: p.duree, repeat: Infinity, delay: p.delai, ease: "easeInOut" }}
          />
        ))}

      {/* ── Haut : l'avancement, et la sortie ── */}
      <div
        className="relative z-10 flex shrink-0 items-center gap-3 px-5"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
      >
        {/* L'avancement, façon segments du tunnel. Le chapitre en cours
            s'allonge ; sa couleur est celle du chapitre. Le dégradé est un
            calque en opacité (un dégradé ne s'interpole pas : l'animer
            directement produirait un à-coup). */}
        <div className="flex flex-1 items-center" style={{ gap: 4 }}>
          {CHAPITRES.map((c, i) => (
            <motion.span
              key={c.id}
              className="relative block overflow-hidden"
              animate={{
                flexGrow: i === stepIndex ? 2.2 : 1,
                background: i < stepIndex ? "rgba(195,174,255,0.7)" : BLANC(0.13),
              }}
              transition={{ duration: 0.45, ease: EASE }}
              style={{ height: 3, flexBasis: 0, borderRadius: 99 }}
            >
              <motion.span
                className="absolute inset-0"
                animate={{ opacity: i === stepIndex ? 1 : 0 }}
                transition={{ duration: 0.4 }}
                style={{
                  borderRadius: 99,
                  background: `linear-gradient(90deg, ${chapitre.accent[0]}, ${chapitre.accent[1]})`,
                }}
              />
            </motion.span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => close(true)}
          aria-label="Passer la visite"
          className="flex shrink-0 cursor-pointer items-center gap-1.5"
          style={{
            padding: "7px 12px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 500,
            color: BLANC(0.62),
            background: BLANC(0.06),
            border: `1px solid ${BLANC(0.1)}`,
          }}
        >
          Passer
          <X size={11} strokeWidth={2.6} />
        </button>
      </div>

      {/* ── Le chapitre ── */}
      <AnimatePresence mode="wait" custom={sens} initial={false}>
        <motion.div
          key={chapitre.id}
          custom={sens}
          drag={reduce ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.16}
          onDragEnd={(_, info) => {
            if (info.offset.x < -70) next();
            else if (info.offset.x > 70) prev();
          }}
          initial={{ opacity: 0, x: sens * 44 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: sens * -32 }}
          transition={{ duration: 0.42, ease: EASE }}
          className="relative z-10 flex min-h-0 flex-1 flex-col"
        >
          {/* On ne fait jamais défiler une visite : personne n'a l'idée de
              tirer vers le bas pendant qu'on lui montre quelque chose. Le
              texte et le bouton gardent donc leur place, et c'est la SCÈNE
              qui se met à la taille de ce qui reste (cf. SceneAjustee). */}
          <SceneAjustee cle={chapitre.id}>
            <Scene pseudo={pseudo} guide={guide} />
          </SceneAjustee>

          <div
            className="shrink-0 px-7"
            style={{ maxWidth: 460, margin: "0 auto", width: "100%" }}
          >
            {/* Le texte — une seule idée, jamais deux */}
            <div>
              {/* Le surtitre dit DE QUOI on parle : il doit se lire avant le
                  titre, pas se chercher après. D'où sa taille et son trait. */}
              {chapitre.surtitre && (
                <div className="flex items-center" style={{ gap: guide ? 10 : 9, margin: "0 0 11px" }}>
                  {/* Le visage PREND LA PLACE du trait, il ne s'ajoute pas à
                      lui : la visite change de bouche, pas de mise en page.
                      Son état est déclaré par le chapitre (cf. chapitres.tsx)
                      et ne se devine jamais dans le texte. L'ouverture et le
                      final n'ont pas de surtitre, donc pas de pastille : le
                      Guide y est déjà en grand, et l'✦ garde la sortie parce
                      que c'est justement le bouton qu'on montre. */}
                  {guide ? (
                    <VisageGuide guide={guide} etat={chapitre.visage} size={32} />
                  ) : (
                    <span
                      aria-hidden
                      style={{
                        width: 22,
                        height: 2,
                        borderRadius: 99,
                        background: `linear-gradient(90deg, ${chapitre.accent[0]}, ${chapitre.accent[1]})`,
                      }}
                    />
                  )}
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: "0.13em",
                      textTransform: "uppercase",
                      background: `linear-gradient(90deg, ${chapitre.accent[0]}, ${chapitre.accent[1]})`,
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                    }}
                  >
                    {chapitre.surtitre}
                  </p>
                </div>
              )}
              <h2
                style={{
                  margin: 0,
                  fontSize: "clamp(24px, 6.4vw, 31px)",
                  fontWeight: 300,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.18,
                  color: "#FFFFFF",
                }}
              >
                {chapitre.titre}
              </h2>
              <p
                style={{
                  margin: "12px 0 0",
                  fontSize: 14.5,
                  fontWeight: 300,
                  lineHeight: 1.62,
                  color: BLANC(0.7),
                }}
              >
                {voix(guide, `visite.${chapitre.id}` as CleVoix, { pseudo })}
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── Bas : reculer, avancer ── */}
      <div
        className="relative z-10 flex shrink-0 items-center gap-3 px-7"
        style={{
          maxWidth: 460,
          margin: "0 auto",
          width: "100%",
          paddingTop: 18,
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 22px)",
        }}
      >
        {!premier && (
          <motion.button
            type="button"
            onClick={prev}
            aria-label="Chapitre précédent"
            whileTap={{ scale: 0.94 }}
            className="flex shrink-0 cursor-pointer items-center justify-center"
            style={{
              width: 46,
              height: 46,
              borderRadius: 999,
              color: BLANC(0.7),
              background: BLANC(0.06),
              border: `1px solid ${BLANC(0.12)}`,
            }}
          >
            <ChevronLeft size={19} strokeWidth={2.2} />
          </motion.button>
        )}

        <motion.button
          type="button"
          onClick={next}
          whileTap={{ scale: 0.97 }}
          className="flex flex-1 cursor-pointer items-center justify-center gap-2"
          style={{
            height: 52,
            borderRadius: 999,
            fontSize: 15,
            fontWeight: 600,
            color: "#FFFFFF",
            background: "linear-gradient(135deg, #8B5CF6 0%, #C13BC1 100%)",
            boxShadow: "0 16px 38px -14px rgba(139,92,246,0.95)",
            border: "none",
          }}
        >
          {chapitre.cta ?? (dernier ? "Terminer" : "Suivant")}
          <ArrowRight size={16} strokeWidth={2.5} />
        </motion.button>
      </div>
    </motion.div>
  );
}

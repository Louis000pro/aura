"use client";

/* ════════════════════════════════════════════════════════════════════
   Les SCÈNES de la visite guidée.

   Chaque chapitre montre une brique réelle de Vaiiya, REJOUÉE ici en
   miniature : le personnage-guide animé du tunnel, les vraies photos du
   catalogue, la gemme du rang, l'affiche du relais, l'étincelle.

   Pourquoi rejouer plutôt que pointer l'app avec un projecteur (ce que
   faisait l'ancienne visite) :
    · un compte qui vient de naître n'a NI séance, NI mission, NI ami →
      le projecteur illuminait des écrans vides le jour de l'inscription,
      c'est-à-dire exactement le pire moment ;
    · les ancres DOM meurent à chaque refonte, en silence (la visite
      d'avant attendait 3,6 s puis sautait l'étape sans rien dire) ;
    · ici la promesse est tenue à l'image près, et une seule personne
      touche un seul fichier pour la faire évoluer.

   La visite assume le SOMBRE en permanence, comme le tunnel de séance :
   les couleurs sont donc des hex fixes, pas des tokens de thème.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Home, Dumbbell, Utensils, MessageCircle, Check, Plus, Flame } from "lucide-react";
import ExerciseGuide from "@/components/ExerciseGuide";
import GemmeRang from "@/components/GemmeRang";
import { AssistantSpark } from "@/components/AssistantMark";
import { RANGS } from "@/lib/aura";

/* ── Les 3 rôles de couleur du système D, en version nuit ── */
export const VIOLET = "#8B5CF6";
export const MAGENTA = "#C13BC1";
export const OR = "#F5B120";
export const OR_CHAUD = "#E8620C";
export const TEAL = "#2BD4A0";
export const OR_CLAIR = "#F5E6A3";

const BLANC = (a: number) => `rgba(255,255,255,${a})`;

/* ── Le cadre commun : une surface de nuit posée sur le fond de nuit ── */
function Cadre({
  children,
  className = "",
  padding = 18,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: number;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{
        padding,
        borderRadius: 26,
        background: "linear-gradient(168deg, #17102C 0%, #0D0819 100%)",
        border: `1px solid ${BLANC(0.09)}`,
        boxShadow: `0 26px 60px -28px rgba(0,0,0,0.9), inset 0 1px 0 ${BLANC(0.05)}`,
      }}
    >
      {children}
    </div>
  );
}

/** Petite étiquette de section, à l'intérieur d'une scène. */
function Mention({ children, color = BLANC(0.42) }: { children: React.ReactNode; color?: string }) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color,
      }}
    >
      {children}
    </p>
  );
}

/* ═══════════════════ 0 · OUVERTURE ═══════════════════ */

export function SceneOuverture({ pseudo }: { pseudo: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col items-center">
      <motion.div
        className="relative flex items-center justify-center"
        style={{ width: 168, height: 168 }}
        initial={{ opacity: 0, scale: 0.86 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.span
          aria-hidden
          className="absolute rounded-full"
          style={{
            width: 168,
            height: 168,
            background: `radial-gradient(circle, rgba(139,92,246,0.5) 0%, rgba(245,230,163,0.22) 46%, transparent 72%)`,
            filter: "blur(28px)",
          }}
          animate={reduce ? undefined : { opacity: [0.5, 0.95, 0.5], scale: [0.92, 1.06, 0.92] }}
          transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <motion.img
          src="/marque/marque-blanc.png"
          alt="Vaiiya"
          draggable={false}
          className="relative select-none"
          style={{ width: 132, height: 132, objectFit: "contain" }}
          animate={reduce ? undefined : { y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mt-7 text-center"
        style={{ margin: "26px 0 0", fontSize: 15, fontWeight: 300, color: BLANC(0.6) }}
      >
        Bienvenue,
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32, duration: 0.55 }}
        className="text-center"
        style={{
          margin: "2px 0 0",
          fontSize: "clamp(30px, 8vw, 40px)",
          fontWeight: 300,
          letterSpacing: "-0.02em",
          background: `linear-gradient(100deg, ${VIOLET} 0%, #C3AEFF 42%, ${OR_CLAIR} 100%)`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {pseudo}
      </motion.p>
    </div>
  );
}

/* ═══════════════════ 1 · LA SÉANCE GUIDÉE ═══════════════════ */

export function SceneTunnel() {
  const reduce = useReducedMotion();
  return (
    <Cadre>
      {/* La barre segmentée du tunnel : fait en teal, en cours en violet */}
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            style={{
              height: 3,
              flex: 1,
              borderRadius: 99,
              background:
                i < 2
                  ? TEAL
                  : i === 2
                  ? `linear-gradient(90deg, ${VIOLET}, ${MAGENTA})`
                  : BLANC(0.13),
            }}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <Mention>Exercice 3 sur 6</Mention>
        <Mention color="rgba(245,177,32,0.85)">Série 2 / 3</Mention>
      </div>

      {/* Le personnage-guide, exactement celui du tunnel */}
      <div style={{ marginTop: 4 }}>
        <ExerciseGuide name="Squat" />
      </div>

      <div className="flex items-end justify-between" style={{ marginTop: 10 }}>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 300,
              letterSpacing: "-0.02em",
              color: "#FFFFFF",
            }}
          >
            Squat
          </p>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: BLANC(0.5) }}>12 répétitions</p>
        </div>

        {/* L'anneau de repos, orange, qui se lance tout seul */}
        <div className="relative flex items-center justify-center" style={{ width: 62, height: 62 }}>
          <svg width={62} height={62} viewBox="0 0 62 62" aria-hidden>
            <defs>
              <linearGradient id="tour-repos" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FFD34E" />
                <stop offset="100%" stopColor="#FF7A1A" />
              </linearGradient>
            </defs>
            <circle cx="31" cy="31" r="27" fill="none" stroke={BLANC(0.1)} strokeWidth="3" />
            <motion.circle
              cx="31"
              cy="31"
              r="27"
              fill="none"
              stroke="url(#tour-repos)"
              strokeWidth="3"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1 1"
              transform="rotate(-90 31 31)"
              initial={{ strokeDashoffset: 0 }}
              animate={reduce ? { strokeDashoffset: 0.35 } : { strokeDashoffset: [0, 1] }}
              transition={reduce ? undefined : { duration: 5, repeat: Infinity, ease: "linear" }}
            />
          </svg>
          <span
            className="absolute text-center"
            style={{ fontSize: 12, fontWeight: 600, color: "#FFC864", letterSpacing: "0.01em" }}
          >
            45s
          </span>
        </div>
      </div>
    </Cadre>
  );
}

/* ═══════════════════ 2 · LE CATALOGUE ═══════════════════ */

const AFFICHES = [
  { img: "/entrainement/cat-mobilite.webp", nom: "Mobilité", rot: -9, y: 14, z: 1 },
  { img: "/entrainement/cat-fullbody.webp", nom: "Full body", rot: 0, y: 0, z: 3 },
  { img: "/entrainement/cat-cardiohiit.webp", nom: "Cardio", rot: 9, y: 14, z: 1 },
];

export function SceneCatalogue() {
  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex items-start justify-center" style={{ gap: 10 }}>
        {AFFICHES.map((a, i) => (
          <motion.div
            key={a.nom}
            initial={{ opacity: 0, y: 26, rotate: 0 }}
            animate={{ opacity: 1, y: a.y, rotate: a.rot }}
            transition={{ delay: 0.1 + i * 0.11, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              zIndex: a.z,
              width: a.z === 3 ? 116 : 100,
              borderRadius: 18,
              overflow: "hidden",
              border: `1px solid ${BLANC(0.12)}`,
              boxShadow: "0 20px 42px -18px rgba(0,0,0,0.95)",
              background: "#0D0819",
            }}
          >
            {/* La photo reste NATURELLE : zéro teinte, zéro pastille par-dessus. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={a.img}
              alt=""
              aria-hidden
              draggable={false}
              style={{
                display: "block",
                width: "100%",
                height: a.z === 3 ? 152 : 132,
                objectFit: "cover",
              }}
            />
            <p
              style={{
                margin: 0,
                padding: "8px 10px 9px",
                fontSize: 11,
                fontWeight: 600,
                color: BLANC(0.82),
                letterSpacing: "0.01em",
              }}
            >
              {a.nom}
            </p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.5 }}
        className="flex items-center gap-2"
        style={{
          marginTop: 26,
          padding: "10px 16px",
          borderRadius: 999,
          background: `linear-gradient(135deg, ${VIOLET}, ${MAGENTA})`,
          boxShadow: "0 12px 30px -12px rgba(139,92,246,0.9)",
        }}
      >
        <Plus size={14} strokeWidth={2.6} color="#FFFFFF" />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>Composer la mienne</span>
      </motion.div>
    </div>
  );
}

/* ═══════════════════ 3 · L'ÉTINCELLE QUI AGIT ═══════════════════ */

export function SceneAssistant() {
  return (
    <Cadre padding={16}>
      {/* Ce que tu écris */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.45 }}
        className="flex justify-end"
      >
        <p
          style={{
            margin: 0,
            maxWidth: "82%",
            padding: "10px 14px",
            borderRadius: "16px 16px 4px 16px",
            fontSize: 13.5,
            lineHeight: 1.45,
            color: "#FFFFFF",
            background: `linear-gradient(135deg, ${VIOLET}, ${MAGENTA})`,
          }}
        >
          Mets-moi une séance jambes jeudi
        </p>
      </motion.div>

      {/* Ce qu'elle répond */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.15, duration: 0.45 }}
        className="flex items-start gap-2"
        style={{ marginTop: 12 }}
      >
        <span
          className="inline-flex items-center justify-center shrink-0"
          style={{
            width: 26,
            height: 26,
            borderRadius: 999,
            background: "rgba(139,92,246,0.16)",
            border: `1px solid ${BLANC(0.1)}`,
          }}
        >
          <AssistantSpark px={15} />
        </span>
        <p
          style={{
            margin: 0,
            maxWidth: "82%",
            padding: "10px 14px",
            borderRadius: "16px 16px 16px 4px",
            fontSize: 13.5,
            lineHeight: 1.45,
            color: BLANC(0.9),
            background: BLANC(0.07),
            border: `1px solid ${BLANC(0.07)}`,
          }}
        >
          Jeudi, c&apos;est libre. Je te prépare ça.
        </p>
      </motion.div>

      {/* Et ce qu'elle FAIT : la carte à valider, dans le même souffle */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.9, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          marginTop: 14,
          padding: 13,
          borderRadius: 18,
          background: "rgba(139,92,246,0.11)",
          border: "1px solid rgba(139,92,246,0.4)",
        }}
      >
        <Mention color="rgba(195,174,255,0.8)">Jeudi</Mention>
        <p style={{ margin: "6px 0 0", fontSize: 15, fontWeight: 600, color: "#FFFFFF" }}>
          Jambes &amp; Fessiers
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: BLANC(0.5) }}>
          40 min · 6 exercices
        </p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.25, duration: 0.4 }}
          className="flex items-center justify-center"
          style={{
            marginTop: 11,
            padding: "9px 14px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            color: "#FFFFFF",
            background: `linear-gradient(135deg, ${VIOLET}, ${MAGENTA})`,
          }}
        >
          Ajouter à ma semaine
        </motion.div>
      </motion.div>
    </Cadre>
  );
}

/* ═══════════════════ 4 · NUTRITION ═══════════════════ */

const LIEUX = [
  { img: "/nutrition/maison.jpg", nom: "À la maison" },
  { img: "/nutrition/resto.jpg", nom: "Resto & livraison" },
  { img: "/nutrition/pouce.jpg", nom: "Sur le pouce" },
];

export function SceneNutrition() {
  return (
    <div className="w-full flex flex-col items-center">
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        style={{
          margin: "0 0 16px",
          fontSize: 22,
          fontWeight: 300,
          letterSpacing: "-0.01em",
          color: "#FFFFFF",
        }}
      >
        On mange où&nbsp;?
      </motion.p>

      <div className="w-full flex flex-col" style={{ gap: 9 }}>
        {LIEUX.map((l, i) => (
          <motion.div
            key={l.nom}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.14, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full overflow-hidden"
            style={{
              height: 64,
              borderRadius: 18,
              border: `1px solid ${BLANC(0.1)}`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={l.img}
              alt=""
              aria-hidden
              draggable={false}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* Voile de lecture UNIQUEMENT là où se pose le texte */}
            <span
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(90deg, rgba(8,5,16,0.82) 0%, rgba(8,5,16,0.42) 62%, rgba(8,5,16,0.1) 100%)",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 16,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 14.5,
                fontWeight: 600,
                color: "#FFFFFF",
              }}
            >
              {l.nom}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════ 5 · LE RANG ET LES MISSIONS ═══════════════════ */

const MISSIONS = [
  { nom: "Connexion du jour", exp: "+5" },
  { nom: "Séance terminée", exp: "+30" },
  { nom: "Repas noté", exp: "+5" },
];

export function SceneRang() {
  const reduce = useReducedMotion();
  const [coches, setCoches] = useState(reduce ? 3 : 0);

  useEffect(() => {
    if (reduce || coches >= MISSIONS.length) return;
    const t = setTimeout(() => setCoches((n) => n + 1), 620 + coches * 60);
    return () => clearTimeout(t);
  }, [coches, reduce]);

  return (
    <div className="w-full flex flex-col items-center">
      <GemmeRang rang={RANGS[0]} size={78} />

      <p style={{ margin: "10px 0 0", fontSize: 15, fontWeight: 600, color: "#FFFFFF" }}>
        {RANGS[0].nom}
      </p>
      <p
        style={{
          margin: "2px 0 0",
          fontSize: 12.5,
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: OR_CLAIR,
        }}
      >
        40 / 50 EXP
      </p>

      <Cadre className="mt-4" padding={12}>
        <div className="flex flex-col" style={{ gap: 9 }}>
          {MISSIONS.map((m, i) => {
            const fait = i < coches;
            return (
              <div key={m.nom} className="flex items-center" style={{ gap: 10 }}>
                <motion.span
                  className="inline-flex items-center justify-center shrink-0"
                  animate={{
                    background: fait ? TEAL : "rgba(255,255,255,0.06)",
                    borderColor: fait ? TEAL : "rgba(255,255,255,0.16)",
                    scale: fait ? [1, 1.18, 1] : 1,
                  }}
                  transition={{ duration: 0.34 }}
                  style={{ width: 22, height: 22, borderRadius: 999, border: "1.5px solid" }}
                >
                  <motion.span animate={{ opacity: fait ? 1 : 0 }} transition={{ duration: 0.2 }} style={{ display: "flex" }}>
                    <Check size={13} strokeWidth={3} color="#08160F" />
                  </motion.span>
                </motion.span>

                <motion.span
                  animate={{ color: fait ? BLANC(0.94) : BLANC(0.52) }}
                  style={{ flex: 1, fontSize: 13.5 }}
                >
                  {m.nom}
                </motion.span>

                <span style={{ fontSize: 12.5, fontWeight: 700, color: fait ? TEAL : BLANC(0.3) }}>
                  {m.exp}
                </span>
              </div>
            );
          })}
        </div>
      </Cadre>

      <div
        className="flex items-center"
        style={{
          gap: 7,
          marginTop: 14,
          padding: "7px 14px",
          borderRadius: 999,
          background: "rgba(245,177,32,0.12)",
          border: "1px solid rgba(245,177,32,0.3)",
        }}
      >
        <Flame size={14} strokeWidth={2.4} color={OR} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#FFCE7A" }}>Série · 4 jours</span>
      </div>
    </div>
  );
}

/* ═══════════════════ 6 · LE RELAIS ═══════════════════ */

export function SceneRelais() {
  const reduce = useReducedMotion();
  const [etat, setEtat] = useState(reduce ? 3 : 0);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setEtat((e) => (e + 1) % 4), 1700);
    return () => clearInterval(t);
  }, [reduce]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 150, height: 266 }}>
        {/* L'affiche se dévoile d'un cran à chaque maillon franchi */}
        {[0, 1, 2, 3].map((i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={`/defis/sillage/0${i + 1}.webp`}
            alt=""
            aria-hidden
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: 18,
              opacity: i === etat ? 1 : 0,
              transition: "opacity 900ms ease-in-out",
            }}
          />
        ))}

        {/* Le sceau : un trait d'or qui se referme, un quart par maillon */}
        <svg
          className="absolute pointer-events-none"
          style={{ inset: -5 }}
          width={160}
          height={276}
          viewBox="0 0 160 276"
          aria-hidden
        >
          <defs>
            <linearGradient id="tour-sceau" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={OR_CLAIR} />
              <stop offset="100%" stopColor={OR_CHAUD} />
            </linearGradient>
          </defs>
          <rect x="3" y="3" width="154" height="270" rx="22" fill="none" stroke={BLANC(0.12)} strokeWidth="2" />
          <motion.rect
            x="3"
            y="3"
            width="154"
            height="270"
            rx="22"
            fill="none"
            stroke="url(#tour-sceau)"
            strokeWidth="2.5"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            animate={{ strokeDashoffset: 100 - (etat + 1) * 25 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            style={{ transform: "rotate(-90deg)", transformOrigin: "80px 138px" }}
          />
        </svg>
      </div>

      {/* Les quatre maillons. Le remplissage se fait en OPACITÉ d'un calque
          doré posé par-dessus : un dégradé ne s'interpole pas, l'animer
          directement ferait un à-coup au lieu d'un fondu. */}
      <div className="flex items-center" style={{ gap: 6, marginTop: 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            className="relative block overflow-hidden"
            animate={{ width: i <= etat ? 26 : 14 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ height: 3, borderRadius: 99, background: BLANC(0.14) }}
          >
            <motion.span
              className="absolute inset-0"
              animate={{ opacity: i <= etat ? 1 : 0 }}
              transition={{ duration: 0.45 }}
              style={{ background: `linear-gradient(90deg, ${OR_CLAIR}, ${OR})`, borderRadius: 99 }}
            />
          </motion.span>
        ))}
      </div>
      <p style={{ margin: "12px 0 0", fontSize: 12.5, color: BLANC(0.55) }}>
        Un maillon par jour, à deux
      </p>
    </div>
  );
}

/* ═══════════════════ 7 · LE REPÈRE (la barre) ═══════════════════ */

const ONGLETS = [
  { icone: Home, nom: "Accueil" },
  { icone: Dumbbell, nom: "Entraînement" },
  { icone: null, nom: "" },
  { icone: Utensils, nom: "Nutrition" },
  { icone: MessageCircle, nom: "Communauté" },
];

export function SceneRepere() {
  const reduce = useReducedMotion();
  return (
    <div className="w-full flex flex-col items-center">
      <div
        className="relative w-full"
        style={{
          padding: "16px 8px 12px",
          borderRadius: 26,
          background: "linear-gradient(168deg, #17102C 0%, #0D0819 100%)",
          border: `1px solid ${BLANC(0.09)}`,
          boxShadow: "0 26px 60px -28px rgba(0,0,0,0.9)",
        }}
      >
        <div className="flex items-end justify-between">
          {ONGLETS.map((o, i) => {
            if (!o.icone) {
              return (
                <div key="orbe" className="flex flex-col items-center" style={{ flex: 1 }}>
                  <motion.span
                    aria-hidden
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: 62,
                      height: 62,
                      top: 2,
                      background: "radial-gradient(circle, rgba(139,92,246,0.55) 0%, transparent 68%)",
                      filter: "blur(10px)",
                    }}
                    animate={reduce ? undefined : { opacity: [0.45, 0.95, 0.45], scale: [0.9, 1.1, 0.9] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <span
                    className="relative inline-flex items-center justify-center"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 999,
                      background: "rgba(139,92,246,0.14)",
                      border: "1px solid rgba(139,92,246,0.4)",
                    }}
                  >
                    <AssistantSpark px={24} />
                  </span>
                  <span
                    style={{
                      marginTop: 7,
                      fontSize: 9.5,
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                      color: OR_CLAIR,
                    }}
                  >
                    L&apos;étincelle
                  </span>
                </div>
              );
            }
            const Icone = o.icone;
            const actif = i === 0;
            return (
              <div key={o.nom} className="flex flex-col items-center" style={{ flex: 1, paddingBottom: 2 }}>
                <Icone
                  size={21}
                  strokeWidth={actif ? 2.4 : 1.9}
                  color={actif ? "#C3AEFF" : BLANC(0.42)}
                />
                <span
                  style={{
                    marginTop: 7,
                    fontSize: 9.5,
                    fontWeight: actif ? 700 : 500,
                    color: actif ? "#C3AEFF" : BLANC(0.42),
                    textAlign: "center",
                    lineHeight: 1.1,
                  }}
                >
                  {o.nom}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p style={{ margin: "18px 0 0", fontSize: 12.5, color: BLANC(0.5), textAlign: "center" }}>
        Cinq cases, jamais plus. Elle reste en bas de chaque écran.
      </p>
    </div>
  );
}

/* ═══════════════════ 8 · FINAL ═══════════════════ */

export function SceneFinal() {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col items-center">
      <motion.div
        className="relative flex items-center justify-center"
        style={{ width: 132, height: 132 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.span
          aria-hidden
          className="absolute rounded-full"
          style={{
            width: 132,
            height: 132,
            background: `radial-gradient(circle, rgba(139,92,246,0.55) 0%, rgba(245,230,163,0.25) 45%, transparent 70%)`,
            filter: "blur(22px)",
          }}
          animate={reduce ? undefined : { opacity: [0.55, 1, 0.55], scale: [0.9, 1.08, 0.9] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="relative">
          <AssistantSpark px={74} />
        </span>
      </motion.div>
    </div>
  );
}

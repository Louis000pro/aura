"use client";

// ============================================================
// COMMUNAUTÉ — FERMETURE TEMPORAIRE
//
// Écran affiché à la place de l'onglet Communauté en production
// le temps de préparer la refonte « la saison » (branche dev).
//
// ⚠️ Il ne charge AUCUN média et ne fait AUCUNE requête : c'est
// tout l'intérêt. L'ancien fil vidéo (autoplay + preload="auto")
// était la cause de l'egress Supabase qui a fait exploser le
// quota — tant qu'il est monté, il consomme.
//
// Pour rouvrir : `COMMUNAUTE_EN_MAINTENANCE = false` dans
// src/app/communaute/page.tsx (et supprimer ce fichier une fois
// la refonte livrée).
// ============================================================

import Link from "next/link";
import { motion } from "framer-motion";

export default function CommunauteMaintenance() {
  return (
    <div
      style={{
        minHeight: "78dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0 32px",
        gap: 4,
      }}
    >
      {/* L'étincelle — le seul élément dominant, elle respire */}
      <motion.span
        aria-hidden
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0.55, 1, 0.55], scale: 1 }}
        transition={{
          opacity: { duration: 3.4, repeat: Infinity, ease: "easeInOut" },
          scale: { duration: 0.6, ease: "easeOut" },
        }}
        style={{
          fontSize: 46,
          lineHeight: 1,
          color: "var(--gold)",
          textShadow: "0 0 28px rgba(var(--gold-rgb), 0.45)",
          marginBottom: 18,
        }}
      >
        ✦
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        style={{ fontSize: 21, fontWeight: 600, color: "var(--text-0)", letterSpacing: "-0.01em", margin: 0 }}
      >
        La communauté revient bientôt
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.5 }}
        style={{ fontSize: 13.5, fontWeight: 400, lineHeight: 1.6, color: "var(--text-body)", margin: "10px 0 0", maxWidth: 320 }}
      >
        Elle est en train d&apos;être entièrement repensée. Le temps de la
        reconstruire, elle est temporairement indisponible — elle rouvrira
        avec la prochaine mise à jour de Vaiiya.
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.42, duration: 0.5 }}
        style={{ fontSize: 12, fontWeight: 400, color: "var(--text-3)", margin: "14px 0 0" }}
      >
        Tes publications et tes abonnements sont intacts.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.5 }}
        style={{ marginTop: 26 }}
      >
        <Link
          href="/"
          style={{
            display: "inline-block",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-1)",
            textDecoration: "none",
            padding: "11px 22px",
            borderRadius: 999,
            background: "rgba(var(--surface-rgb), 0.8)",
            border: "1px solid rgba(var(--accent-rgb), 0.28)",
            boxShadow: "var(--shadow-aura-sm)",
          }}
        >
          Retour à l&apos;accueil
        </Link>
      </motion.div>
    </div>
  );
}

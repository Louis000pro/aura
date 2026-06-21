"use client";

/* ════════════════════════════════════════════════════════════════════
   AnnouncementCard — carte « Nouveautés » (récap d'une mise à jour).
   Utilisée à l'identique dans la cloche (NotificationBell) et la page
   /notifications. Style ADN Vaiiya : verre violet + or, doux.
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { Announcement } from "@/lib/announcements";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function AnnouncementCard({
  announcement,
  unseen = false,
  compact = false,
}: {
  announcement: Announcement;
  unseen?: boolean;
  compact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-3xl overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, rgba(212,192,255,0.32) 0%, rgba(245,230,163,0.28) 100%)",
        border: "1px solid rgba(167,139,250,0.3)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 20px rgba(167,139,250,0.14)",
      }}
    >
      {/* Halo décoratif */}
      <div
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(212,192,255,0.45) 0%, transparent 70%)" }}
      />

      <div className={compact ? "p-3.5 relative z-10" : "p-5 relative z-10"}>
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              width: compact ? 30 : 36,
              height: compact ? 30 : 36,
              background: "linear-gradient(135deg,#A78BFA,#F5E6A3)",
              boxShadow: "0 3px 12px rgba(167,139,250,0.4)",
            }}
          >
            <Sparkles size={compact ? 15 : 18} strokeWidth={2} style={{ color: "#fff" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="font-bold tracking-[0.16em] uppercase"
              style={{ color: "#7C5CFA", fontSize: compact ? 9 : 10 }}
            >
              Nouveautés
            </p>
            <p className="font-light" style={{ color: "#A0AEC0", fontSize: compact ? 10 : 11 }}>
              {formatDate(announcement.date)}
            </p>
          </div>
          {unseen && (
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: "#A78BFA", color: "#fff", boxShadow: "0 2px 8px rgba(167,139,250,0.4)" }}
            >
              NOUVEAU
            </span>
          )}
        </div>

        {/* Titre + intro */}
        <h3
          className="font-black tracking-tight leading-tight"
          style={{ color: "#2D3748", fontSize: compact ? 15 : 18 }}
        >
          {announcement.title}
        </h3>
        {announcement.intro && (
          <p
            className="font-light leading-relaxed mt-1.5"
            style={{ color: "#718096", fontSize: compact ? 12 : 13 }}
          >
            {announcement.intro}
          </p>
        )}

        {/* Liste des nouveautés */}
        <div className={compact ? "mt-3 flex flex-col gap-2.5" : "mt-4 flex flex-col gap-3"}>
          {announcement.items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + i * 0.05, duration: 0.25 }}
              className="flex items-start gap-2.5"
            >
              <span
                className="rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  width: compact ? 26 : 30,
                  height: compact ? 26 : 30,
                  background: "rgba(255,255,255,0.65)",
                  fontSize: compact ? 13 : 15,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                }}
              >
                {item.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold leading-snug" style={{ color: "#2D3748", fontSize: compact ? 12.5 : 14 }}>
                  {item.title}
                </p>
                <p className="font-light leading-relaxed mt-0.5" style={{ color: "#718096", fontSize: compact ? 11.5 : 12.5 }}>
                  {item.text}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

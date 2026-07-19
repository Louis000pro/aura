"use client";

// ============================================================
// LA FINALE — le mini-Wrapped de fin de saison.
// S'affiche UNE fois quand la saison globale vient de se terminer
// (fenêtre de 14 jours), avant la cérémonie de la saison suivante
// (z-index au-dessus : on ferme la finale → la cérémonie apparaît).
// Habillage pur : toute la donnée vient de fetchSeasonRecap.
// ============================================================

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { rankFor } from "@/lib/season";
import {
  fetchLastFinishedGlobalSeason,
  fetchSeasonRecap,
  type SeasonRecap,
} from "@/lib/seasonApi";
import { shareFinaleCard } from "@/lib/seasonFinaleExport";

const seenKey = (seasonId: string) => `vaiiya-finale-vue-${seasonId}`;

const GOLD = "#E6C56E";
const fade = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.55, ease: "easeOut" as const },
});

export default function SeasonFinale() {
  const { user } = useAuth();
  const [recap, setRecap] = useState<SeasonRecap | null>(null);
  const [closed, setClosed] = useState(false);
  const [share, setShare] = useState<"idle" | "busy" | "done">("idle");

  useEffect(() => {
    if (!user?.pseudo) return;
    let on = true;
    (async () => {
      try {
        const season = await fetchLastFinishedGlobalSeason();
        if (!season || localStorage.getItem(seenKey(season.id))) return;
        const r = await fetchSeasonRecap(season, user.id);
        // Pas participé → pas de finale (et on ne la re-propose plus)
        if (r.myCamp === null && r.myEclats === 0) {
          localStorage.setItem(seenKey(season.id), "1");
          return;
        }
        if (on) setRecap(r);
      } catch { /* la finale est un bonus : jamais bloquant */ }
    })();
    return () => { on = false; };
  }, [user]);

  if (!recap || closed) return null;

  const s = recap.season;
  const iWon = recap.myCamp !== null && recap.myCamp === recap.winner;
  const winnerName = recap.winner === "draw" ? null : recap.winner === "a" ? s.camp_a_name : s.camp_b_name;
  const rank = rankFor(recap.myEclats);
  const bestRank = rankFor(recap.bestEclats);

  const close = () => {
    localStorage.setItem(seenKey(s.id), "1");
    setClosed(true);
  };

  const doShare = async () => {
    if (share === "busy") return;
    setShare("busy");
    await shareFinaleCard({ recap, user: user?.pseudo ? `@${user.pseudo}` : "" }, `vaiiya-${s.name.toLowerCase().replace(/\s+/g, "-")}.png`);
    setShare("done");
    window.setTimeout(() => setShare("idle"), 1800);
  };

  const camp = (key: "a" | "b") => {
    const won = recap.winner === key;
    const dim = recap.winner !== "draw" && !won;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, opacity: dim ? 0.42 : 1, filter: dim ? "saturate(.6)" : undefined }}>
        <span style={{ fontSize: 40, lineHeight: 1, filter: won ? `drop-shadow(0 0 18px rgba(230,197,110,.55))` : undefined }}>
          {key === "a" ? s.camp_a_emblem : s.camp_b_emblem}
        </span>
        <span style={{ fontSize: 46, fontWeight: 900, fontVariantNumeric: "tabular-nums", color: won ? GOLD : "#ECEAF6" }}>
          {recap.points[key]}
        </span>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "#BCB7D6" }}>
          {key === "a" ? s.camp_a_name : s.camp_b_name}
          {recap.myCamp === key ? " · toi" : ""}
        </span>
      </div>
    );
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9994, overflow: "auto",
      background: "radial-gradient(120% 72% at 50% -6%, #100B1E 0%, #050208 52%, #000 100%)",
      color: "#ECEAF6",
      display: "flex", flexDirection: "column",
      padding: "calc(env(safe-area-inset-top) + 26px) 22px calc(env(safe-area-inset-bottom) + 22px)",
    }}>
      {/* La balafre dorée — la signature de la saison, une dernière fois */}
      <span aria-hidden style={{
        position: "fixed", top: "-12%", bottom: "-12%", left: "50%", width: 3,
        background: `linear-gradient(180deg, transparent, ${GOLD}, transparent)`,
        boxShadow: `0 0 34px 10px rgba(230,197,110,.28)`,
        transform: "rotate(17deg)", pointerEvents: "none",
      }} />

      {/* En-tête */}
      <motion.div {...fade(0.1)} style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", fontWeight: 800, color: GOLD }}>✦ Vaiiya</div>
        <div style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 800, color: "#BCB7D6", marginTop: 6 }}>
          {s.name} · la finale
        </div>
      </motion.div>

      {/* L'affrontement final */}
      <motion.div {...fade(0.5)} style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 40, marginTop: 34 }}>
        {camp("a")}
        <span style={{ fontSize: 15, fontWeight: 900, color: "#BCB7D6", paddingBottom: 34, fontStyle: "italic" }}>VS</span>
        {camp("b")}
      </motion.div>

      {/* Le verdict */}
      <motion.div {...fade(1.05)} style={{ textAlign: "center", marginTop: 26 }}>
        <div style={{ fontSize: 27, fontWeight: 900, lineHeight: 1.15 }}>
          {recap.winner === "draw" ? "Égalité parfaite" : <>Les {winnerName} l&apos;emportent <span style={{ color: GOLD }}>✦</span></>}
        </div>
        {recap.myCamp && (
          <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 7, color: iWon ? GOLD : "#BCB7D6" }}>
            {recap.winner === "draw" ? "Personne ne plie." : iWon ? "Ton camp. Ta victoire." : "La revanche commence maintenant."}
          </div>
        )}
      </motion.div>

      {/* Ton bilan */}
      <motion.div {...fade(1.6)} style={{
        marginTop: 30, borderRadius: 18, padding: "16px 10px",
        background: "rgba(22,18,30,.72)", border: "1px solid rgba(195,174,255,.16)",
        display: "flex", justifyContent: "space-around", textAlign: "center",
      }}>
        {([
          [String(recap.mySeances), recap.mySeances > 1 ? "séances" : "séance", "#ECEAF6"],
          [String(recap.myEclats), "éclats ✦", "#ECEAF6"],
          [rank.name, "rang final", GOLD],
        ] as const).map(([v, l, c]) => (
          <div key={l}>
            <div style={{ fontSize: l === "rang final" ? 21 : 27, fontWeight: 900, color: c, fontVariantNumeric: "tabular-nums", lineHeight: "32px" }}>{v}</div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "#BCB7D6", marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </motion.div>

      {/* Les exploits de la saison */}
      {recap.seasonBadges.length > 0 && (
        <motion.div {...fade(2.0)} style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          {recap.seasonBadges.slice(0, 4).map((b) => (
            <div key={b.badge_name + b.completed_at} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 99,
              background: "rgba(58,45,18,.5)", border: "1px solid rgba(212,168,67,.45)",
            }}>
              <span style={{ fontSize: 14 }}>{b.badge_emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: GOLD }}>{b.badge_name}</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* La gravure */}
      <motion.p {...fade(2.35)} style={{ fontSize: 11, color: "#BCB7D6", textAlign: "center", lineHeight: 1.6, marginTop: 22 }}>
        Nouvelle saison : tout le monde repart <b style={{ color: "#ECEAF6" }}>Argent</b>.<br />
        Ton meilleur rang — <b style={{ color: GOLD }}>{bestRank.name}</b> — est gravé à vie, comme tes badges.
      </motion.p>

      {/* Actions */}
      <motion.div {...fade(2.7)} style={{ marginTop: "auto", paddingTop: 26, display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          type="button"
          onClick={doShare}
          disabled={share === "busy"}
          style={{
            width: "100%", padding: "14px 0", borderRadius: 16, cursor: "pointer",
            background: "transparent", color: GOLD, fontWeight: 800, fontSize: 14,
            border: `1.5px solid rgba(230,197,110,.55)`,
          }}
        >
          {share === "busy" ? "Génération…" : share === "done" ? "Enregistré ✦" : "Partager ma saison"}
        </button>
        <button
          type="button"
          onClick={close}
          style={{
            width: "100%", padding: "15px 0", borderRadius: 16, cursor: "pointer", border: "none",
            background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", fontWeight: 800, fontSize: 14.5,
            boxShadow: "0 8px 26px rgba(139,92,246,.4)",
          }}
        >
          Vers la nouvelle saison
        </button>
      </motion.div>
    </div>
  );
}

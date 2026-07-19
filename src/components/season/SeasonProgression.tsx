"use client";

// ============================================================
// TA PROGRESSION — l'écran de rang de la saison.
// Le grand hexagone, l'échelle des 6 rangs, le classement entre
// amis (jamais global), la vitrine des badges gagnés à vie.
// Overlay plein écran ouvert depuis la carte de rang du QG.
// Habillage pur : toute la donnée vient de useGlobalSeason + api.
// ============================================================

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";
import { RANKS, founderWave, type Rank } from "@/lib/season";
import {
  fetchFriendsLeaderboard,
  fetchMemberNumber,
  fetchMyBadges,
  type EarnedBadge,
  type LeaderboardEntry,
} from "@/lib/seasonApi";
import type { GlobalSeasonState } from "@/lib/useSeason";

const HEX_CLIP = "polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)";
const RANK_GRAD: Record<string, string> = {
  bronze:    "linear-gradient(160deg,#C08A4E,#7E4F24)",
  argent:    "linear-gradient(160deg,#D7DDE6,#8E99AB)",
  or:        "linear-gradient(160deg,#FFD34E,#C89227)",
  platine:   "linear-gradient(160deg,#CDEBFF,#6FA8DC)",
  diamant:   "linear-gradient(160deg,#C7B8FF,#7C5CFF)",
  etincelle: "linear-gradient(140deg,#8B5CF6 20%,#C13BC1 55%,#E6C56E 100%)",
};
const RANK_INK: Record<string, string> = {
  bronze: "#fff", argent: "#3c4654", or: "#5a3f08", platine: "#274a66", diamant: "#fff", etincelle: "#fff",
};

function Hexagon({ rank, size, dim }: { rank: Rank; size: number; dim?: boolean }) {
  return (
    <span style={{
      width: size, height: Math.round(size * 1.1), clipPath: HEX_CLIP,
      display: "grid", placeItems: "center", fontWeight: 900, fontSize: Math.round(size * 0.36),
      background: RANK_GRAD[rank.key], color: RANK_INK[rank.key],
      filter: dim ? "grayscale(1) brightness(.55)" : undefined, opacity: dim ? 0.55 : 1,
    }}>
      {rank.numeral}
    </span>
  );
}

export default function SeasonProgression({ s, onClose }: { s: GlobalSeasonState; onClose: () => void }) {
  const { user } = useAuth();
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [badges, setBadges] = useState<EarnedBadge[]>([]);
  const [memberNumber, setMemberNumber] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !s.season) return;
    void fetchFriendsLeaderboard(s.season.id, user.id).then(setBoard);
    void fetchMyBadges(user.id).then(setBadges);
    void fetchMemberNumber(user.id).then(setMemberNumber);
  }, [user, s.season]);

  if (!s.season) return null;

  const wave = founderWave(memberNumber);
  const myPos = board.findIndex((b) => b.isMe);
  const ahead = myPos > 0 ? board[myPos - 1] : null;

  const overlay = (
    <div role="dialog" aria-modal="true" aria-label="Ta progression de saison" style={{
      position: "fixed", inset: 0, zIndex: 8990, overflow: "auto",
      background: "radial-gradient(120% 72% at 50% -6%, #100B1E 0%, #050208 52%, #000 100%)",
      color: "#ECEAF6",
      padding: "calc(env(safe-area-inset-top) + 18px) 16px calc(env(safe-area-inset-bottom) + 24px)",
      boxSizing: "border-box", overscrollBehavior: "contain",
    }}>
      <div style={{ width: "100%", maxWidth: 1040, margin: "0 auto" }}>
      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 800, color: "#BCB7D6" }}>{s.season.name}</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>Ta progression</h2>
        </div>
        <button onClick={onClose} aria-label="Fermer" style={{ width: 34, height: 34, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(22,18,30,.72)", border: "1px solid rgba(195,174,255,.16)", color: "#ECEAF6", cursor: "pointer", fontSize: 15 }}>✕</button>
      </div>

      {/* Le grand rang */}
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 18, padding: "18px 12px 14px", background: "rgba(22,18,30,.72)", border: "1px solid rgba(195,174,255,.16)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 13 }}>
        {/* balafres décoratives */}
        <span style={{ position: "absolute", top: "-30%", bottom: "-30%", left: "24%", width: 2, background: "linear-gradient(180deg, transparent, rgba(230,197,110,.55), transparent)", transform: "rotate(16deg)" }} />
        <span style={{ position: "absolute", top: "-30%", bottom: "-30%", right: "20%", width: 2, background: "linear-gradient(180deg, transparent, rgba(139,92,246,.45), transparent)", transform: "rotate(16deg)" }} />
        <span style={{ filter: "drop-shadow(0 0 22px rgba(255,211,78,.5))" }}>
          <Hexagon rank={s.rank} size={80} />
        </span>
        <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: ".06em", textTransform: "uppercase" }}>{s.rank.name}</div>
        <div style={{ fontSize: 11.5, color: "#BCB7D6", fontVariantNumeric: "tabular-nums" }}>{s.eclats} éclat{s.eclats > 1 ? "s" : ""}</div>
        <div style={{ width: "78%", height: 7, borderRadius: 99, background: "rgba(188,183,214,.2)", overflow: "hidden", marginTop: 3 }}>
          <i style={{ display: "block", height: "100%", width: `${Math.round(s.progress * 100)}%`, borderRadius: 99, background: "linear-gradient(90deg,#8B5CF6,#C13BC1)" }} />
        </div>
        <div style={{ fontSize: 10.5, color: "#BCB7D6" }}>
          {s.next
            ? <><b style={{ color: "#E6C56E", fontWeight: 800 }}>{s.next.rank.name} à {s.next.rank.min}</b> — encore ~{Math.max(1, Math.ceil(s.next.missing / 35))} séance{Math.ceil(s.next.missing / 35) > 1 ? "s" : ""}</>
            : <b style={{ color: "#E6C56E", fontWeight: 800 }}>Le sommet. Garde-le.</b>}
        </div>
      </div>

      {/* L'échelle des 6 rangs */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px", marginBottom: 15 }}>
        {RANKS.map((r) => {
          const reached = s.eclats >= r.min;
          const isCur = r.key === s.rank.key;
          return (
            <div key={r.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 46 }}>
              <span style={{ transform: isCur ? "scale(1.18)" : undefined, filter: isCur ? "drop-shadow(0 0 10px rgba(255,211,78,.6))" : undefined }}>
                <Hexagon rank={r} size={32} dim={!reached} />
              </span>
              <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: isCur ? "#E6C56E" : "#BCB7D6" }}>{r.name}</span>
            </div>
          );
        })}
      </div>

      {/* Classement entre amis */}
      {board.length > 1 && (
        <div style={{ borderRadius: 18, padding: "8px 10px", background: "rgba(22,18,30,.72)", border: "1px solid rgba(195,174,255,.16)", marginBottom: 13 }}>
          <div style={{ fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 800, color: "#BCB7D6", padding: "4px 4px 6px" }}>
            Le cercle {ahead ? <span style={{ color: "#E6C56E" }}>· {ahead.pseudo} te devance de {ahead.eclats - s.eclats}</span> : myPos === 0 ? <span style={{ color: "#E6C56E" }}>· tu mènes ✦</span> : null}
          </div>
          {board.map((b, i) => (
            <div key={b.user_id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 6px", borderRadius: b.isMe ? 11 : 0, background: b.isMe ? "rgba(139,92,246,.12)" : "transparent", borderBottom: b.isMe || i === board.length - 1 ? "none" : "1px solid rgba(195,174,255,.1)" }}>
              <span style={{ width: 16, fontSize: 11, fontWeight: 800, color: "#BCB7D6", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
              {b.avatar_url
                ? <img src={b.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                : <span style={{ width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#5A4B92,#8B5CF6)" }}>{b.pseudo.slice(0, 1).toUpperCase()}</span>}
              <span style={{ fontSize: 12, fontWeight: 700, flex: 1 }}>{b.isMe ? "Toi" : b.pseudo}</span>
              <span style={{ fontSize: 11.5, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{b.eclats} <span style={{ fontSize: 9, color: "#E6C56E" }}>✦</span></span>
            </div>
          ))}
        </div>
      )}

      {/* La vitrine des badges */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 13 }}>
        {wave && (
          <div style={{ flex: "1 1 30%", minWidth: 92, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 4px", borderRadius: 13, background: "rgba(58,45,18,.55)", border: "1px solid rgba(212,168,67,.5)" }}>
            <span style={{ fontSize: 17, color: "#E6C56E" }}>{wave.emoji}</span>
            <span style={{ fontSize: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em", color: "#E6C56E", textAlign: "center" }}>{wave.name} n°{memberNumber}</span>
          </div>
        )}
        {badges.map((b) => (
          <div key={b.badge_name + b.completed_at} style={{ flex: "1 1 30%", minWidth: 92, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 4px", borderRadius: 13, background: "rgba(22,18,30,.6)", border: "1px solid rgba(212,168,67,.35)" }}>
            <span style={{ fontSize: 17 }}>{b.badge_emoji}</span>
            <span style={{ fontSize: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em", color: "#BCB7D6", textAlign: "center" }}>{b.badge_name}</span>
          </div>
        ))}
        <div style={{ flex: "1 1 30%", minWidth: 92, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 4px", borderRadius: 13, background: "rgba(22,18,30,.35)", border: "1px dashed rgba(212,168,67,.35)", opacity: 0.55 }}>
          <span style={{ fontSize: 17 }}>?</span>
          <span style={{ fontSize: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em", color: "#BCB7D6", textAlign: "center" }}>Prochain exploit</span>
        </div>
      </div>

      <p style={{ fontSize: 9.5, color: "#BCB7D6", textAlign: "center", lineHeight: 1.5 }}>
        L'éclat récompense ta constance, jamais ton corps.<br />
        Nouvelle saison = tout le monde repart Argent — tes badges restent à vie.
      </p>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

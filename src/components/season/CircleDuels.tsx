"use client";

// ============================================================
// LES DUELS DE CERCLE — la section du QG sous la présence.
// Le duel global oppose tout Vaiiya ; ici, on lance le SIEN :
// famille, amis, équipe. Une séance marque dans TOUTES les
// arènes du joueur à la fois (le score se calcule depuis
// workout_sessions — rien à faire de plus).
// Habillage pur : toute la donnée vient de seasonApi.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  chooseCamp,
  createCircle,
  fetchCircleDuelBoards,
  fetchMyCircles,
  fetchMyFollowing,
  launchCircleDuel,
  type CircleDuelBoard,
  type FollowedProfile,
} from "@/lib/seasonApi";
import { CAMP_PAIRS, campEmblem, campName, seasonDaysLeft, type CampKey, type Circle } from "@/lib/season";

const CAMP_GRAD: Record<CampKey, string> = {
  a: "linear-gradient(135deg,#F5B120,#E8620C)",
  b: "linear-gradient(135deg,#8B5CF6,#C13BC1)",
};

/* ─── Une mini-arène ──────────────────────────────────────── */

function MiniArena({ board, onJoin }: {
  board: CircleDuelBoard;
  onJoin: (camp: CampKey) => Promise<void>;
}) {
  const { season, circle, points, myCamp } = board;
  const [joining, setJoining] = useState<CampKey | null>(null);
  const lead = points.a === points.b ? null : points.a > points.b ? "a" : "b";

  return (
    <div style={{
      position: "relative", overflow: "hidden", borderRadius: 14, flex: "none",
      width: 236, padding: "10px 12px 11px",
      background: "linear-gradient(120deg,#1c1130 0%,#0b0616 55%,#120a08 100%)",
      border: "1px solid rgba(195,174,255,.18)",
    }}>
      {/* la balafre, déclinée en petit */}
      <div aria-hidden style={{
        position: "absolute", top: "-20%", bottom: "-20%", left: "54%", width: 2,
        background: "linear-gradient(180deg, transparent, #E6C56E 50%, transparent)",
        transform: "rotate(16deg)", boxShadow: "0 0 10px 2px rgba(230,197,110,.5)",
      }} />
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", position: "relative" }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: "#ECEAF6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {circle ? `${circle.emoji} ${circle.name}` : season.name}
        </span>
        <span style={{ fontSize: 8.5, fontWeight: 800, color: "#E6C56E", flex: "none", marginLeft: 8 }}>J-{seasonDaysLeft(season)}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 7, position: "relative" }}>
        {(["a", "b"] as CampKey[]).map((camp) => {
          const isA = camp === "a";
          return (
            <div key={camp} style={{ display: "flex", flexDirection: "column", gap: 1, alignItems: isA ? "flex-start" : "flex-end" }}>
              <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.75)" }}>
                {campEmblem(season, camp)} {campName(season, camp)}{myCamp === camp ? " · toi" : ""}
              </span>
              <span style={{
                fontSize: 26, fontWeight: 900, lineHeight: 1.1, fontVariantNumeric: "tabular-nums",
                color: "#ECEAF6", opacity: lead === null || lead === camp ? 1 : 0.55,
                textShadow: lead === camp ? (isA ? "0 0 16px rgba(245,177,32,.55)" : "0 0 16px rgba(139,92,246,.6)") : undefined,
              }}>
                {points[camp]}
              </span>
            </div>
          );
        })}
      </div>

      {/* pas encore de camp → on choisit ici (scellé, comme partout) */}
      {myCamp === null && (
        <div style={{ display: "flex", gap: 6, marginTop: 8, position: "relative" }}>
          {(["a", "b"] as CampKey[]).map((camp) => (
            <button
              key={camp}
              disabled={joining !== null}
              onClick={async () => { setJoining(camp); await onJoin(camp); }}
              style={{
                flex: 1, fontSize: 9.5, fontWeight: 800, color: "#fff", border: "none", borderRadius: 9,
                padding: "7px 4px", cursor: "pointer", background: CAMP_GRAD[camp],
                opacity: joining !== null && joining !== camp ? 0.4 : 1,
              }}
            >
              {joining === camp ? "…" : `Rejoindre ${campEmblem(season, camp)}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Le lanceur (bottom sheet en 2 temps) ────────────────── */

function LaunchSheet({ userId, myCircles, onDone, onClose }: {
  userId: string;
  myCircles: Circle[];
  onDone: () => void;
  onClose: () => void;
}) {
  const ownCircles = myCircles.filter((c) => c.owner_id === userId);
  const [step, setStep] = useState<"circle" | "duel">("circle");
  const [circle, setCircle] = useState<Circle | null>(null);

  // création de cercle
  const [creating, setCreating] = useState(ownCircles.length === 0);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("👥");
  const [following, setFollowing] = useState<FollowedProfile[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  // le duel
  const [pairIdx, setPairIdx] = useState(() => Math.floor(Math.random() * CAMP_PAIRS.length));
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchMyFollowing(userId).then(setFollowing).catch(() => {});
  }, [userId]);

  const togglePick = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const goDuel = async () => {
    setError(null);
    if (creating) {
      if (!name.trim()) { setError("Donne un nom à ton cercle"); return; }
      setBusy(true);
      const c = await createCircle(name.trim(), emoji, userId, [...picked]);
      setBusy(false);
      if (!c) { setError("Le cercle n'a pas pu être créé"); return; }
      setCircle(c);
    }
    setStep("duel");
  };

  const launch = async () => {
    if (!circle) return;
    setBusy(true);
    const pair = CAMP_PAIRS[pairIdx];
    const season = await launchCircleDuel(circle, userId, { campA: pair.a, campB: pair.b, days });
    if (season) {
      // le lanceur rejoint le camp A d'office (il pourra voir les autres choisir)
      await chooseCamp(season.id, userId, "a");
      onDone();
    } else {
      setBusy(false);
      setError("Le duel n'a pas pu être lancé");
    }
  };

  const pair = CAMP_PAIRS[pairIdx];
  const chip = (active: boolean): React.CSSProperties => ({
    fontSize: 10.5, fontWeight: 800, borderRadius: 99, padding: "7px 12px", cursor: "pointer",
    color: active ? "#0d0a14" : "#C3AEFF",
    background: active ? "linear-gradient(135deg,#FFD34E,#E6C56E)" : "rgba(139,92,246,.08)",
    border: active ? "1px solid transparent" : "1px solid rgba(139,92,246,.4)",
  });

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 9980, background: "rgba(0,0,0,.66)", display: "flex", alignItems: "flex-end" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxHeight: "82dvh", overflowY: "auto",
          borderRadius: "22px 22px 0 0", padding: "18px 18px calc(20px + env(safe-area-inset-bottom))",
          background: "linear-gradient(180deg,#171028,#0a0512)", color: "#ECEAF6",
          border: "1px solid rgba(195,174,255,.2)", borderBottom: "none",
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 99, background: "#BCB7D6", opacity: 0.4, margin: "0 auto 14px" }} />

        {step === "circle" ? (
          <>
            <div style={{ fontSize: 8.5, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 800, color: "#E6C56E" }}>Duel de cercle · 1/2</div>
            <h3 style={{ fontSize: 17, fontWeight: 900, margin: "4px 0 2px" }}>Ton cercle</h3>
            <p style={{ fontSize: 11, color: "#BCB7D6", margin: "0 0 14px" }}>Famille, amis, équipe — un petit groupe, votre propre arène.</p>

            {ownCircles.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
                {ownCircles.map((c) => (
                  <button key={c.id} onClick={() => { setCircle(c); setCreating(false); }} style={chip(circle?.id === c.id && !creating)}>
                    {c.emoji} {c.name}
                  </button>
                ))}
                <button onClick={() => { setCircle(null); setCreating(true); }} style={chip(creating)}>+ Nouveau</button>
              </div>
            )}

            {creating && (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nom du cercle (« La famille », « Le bureau »…)"
                    maxLength={30}
                    style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#ECEAF6", background: "rgba(255,255,255,.06)", border: "1px solid rgba(195,174,255,.25)", borderRadius: 12, padding: "10px 12px", outline: "none" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  {["👥", "🏠", "💼", "🎓", "🛡️", "🐺"].map((e) => (
                    <button key={e} onClick={() => setEmoji(e)} style={{
                      width: 36, height: 36, borderRadius: 11, fontSize: 16, cursor: "pointer", display: "grid", placeItems: "center",
                      background: emoji === e ? "rgba(230,197,110,.18)" : "rgba(255,255,255,.05)",
                      border: emoji === e ? "1.5px solid #E6C56E" : "1px solid rgba(195,174,255,.2)",
                    }}>{e}</button>
                  ))}
                </div>

                <div style={{ fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 800, color: "#BCB7D6", marginBottom: 8 }}>
                  Qui en fait partie ?{picked.size > 0 && <b style={{ color: "#2BD4A0" }}> · {picked.size}</b>}
                </div>
                {following.length === 0 ? (
                  <p style={{ fontSize: 11, color: "#BCB7D6", margin: "0 0 8px" }}>Tu ne suis encore personne — trouve des gens d&apos;abord, le duel n&apos;attend qu&apos;eux.</p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 6, maxHeight: 168, overflowY: "auto" }}>
                    {following.map((p) => {
                      const on = picked.has(p.id);
                      return (
                        <button key={p.id} onClick={() => togglePick(p.id)} style={{
                          display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 700, borderRadius: 99, padding: "5px 10px 5px 5px", cursor: "pointer",
                          color: on ? "#0d0a14" : "#ECEAF6",
                          background: on ? "#2BD4A0" : "rgba(255,255,255,.06)",
                          border: on ? "1px solid transparent" : "1px solid rgba(195,174,255,.22)",
                        }}>
                          {p.avatar_url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img loading="lazy" decoding="async" src={p.avatar_url} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />
                            : <span style={{ width: 20, height: 20, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#5A4B92,#8B5CF6)" }}>{p.pseudo.slice(0, 1).toUpperCase()}</span>}
                          {p.pseudo}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {error && <p style={{ fontSize: 11, color: "#FF8A8A", margin: "8px 0 0" }}>{error}</p>}

            <button
              disabled={busy || (!creating && !circle)}
              onClick={goDuel}
              style={{
                width: "100%", marginTop: 14, fontSize: 13, fontWeight: 800, color: "#fff", border: "none", borderRadius: 14,
                padding: "13px 0", cursor: "pointer", background: "linear-gradient(135deg,#8B5CF6,#C13BC1)",
                opacity: busy || (!creating && !circle) ? 0.55 : 1,
              }}
            >
              {busy ? "…" : "Continuer — le duel"}
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 8.5, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 800, color: "#E6C56E" }}>Duel de cercle · 2/2</div>
            <h3 style={{ fontSize: 17, fontWeight: 900, margin: "4px 0 2px" }}>Les deux camps</h3>
            <p style={{ fontSize: 11, color: "#BCB7D6", margin: "0 0 14px" }}>Chacun choisit son camp en arrivant — chaque séance = 1 point.</p>

            {/* la paire, façon mini-VS balafré */}
            <button
              onClick={() => setPairIdx((i) => (i + 1) % CAMP_PAIRS.length)}
              aria-label="Changer la paire de camps"
              style={{
                position: "relative", overflow: "hidden", width: "100%", borderRadius: 14, cursor: "pointer",
                padding: "16px 16px", background: "linear-gradient(120deg,#241505 0%,#0b0616 52%,#1B0F38 100%)",
                border: "1px solid rgba(230,197,110,.3)", color: "#ECEAF6",
              }}
            >
              <span aria-hidden style={{ position: "absolute", top: "-20%", bottom: "-20%", left: "50%", width: 2, background: "linear-gradient(180deg,transparent,#E6C56E 50%,transparent)", transform: "rotate(14deg)", boxShadow: "0 0 12px 2px rgba(230,197,110,.55)" }} />
              <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
                <span style={{ fontSize: 15, fontWeight: 900 }}>{pair.a.emblem} {pair.a.name}</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: "#E6C56E", letterSpacing: ".14em" }}>VS</span>
                <span style={{ fontSize: 15, fontWeight: 900 }}>{pair.b.name} {pair.b.emblem}</span>
              </span>
              <span style={{ display: "block", marginTop: 6, fontSize: 9.5, color: "#BCB7D6", position: "relative" }}>Touche pour changer la paire</span>
            </button>

            <div style={{ fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 800, color: "#BCB7D6", margin: "16px 0 8px" }}>Durée</div>
            <div style={{ display: "flex", gap: 7 }}>
              {[7, 14, 30].map((d) => (
                <button key={d} onClick={() => setDays(d)} style={chip(days === d)}>{d} jours</button>
              ))}
            </div>

            {error && <p style={{ fontSize: 11, color: "#FF8A8A", margin: "10px 0 0" }}>{error}</p>}

            <button
              disabled={busy}
              onClick={launch}
              style={{
                width: "100%", marginTop: 16, fontSize: 13, fontWeight: 800, color: "#0d0a14", border: "none", borderRadius: 14,
                padding: "13px 0", cursor: "pointer", background: "linear-gradient(135deg,#FFD34E,#E6C56E)", opacity: busy ? 0.55 : 1,
              }}
            >
              {busy ? "…" : "Lancer le duel ✦"}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─── La section du QG ────────────────────────────────────── */

export default function CircleDuels() {
  const { user } = useAuth();
  const [boards, setBoards] = useState<CircleDuelBoard[]>([]);
  const [myCircles, setMyCircles] = useState<Circle[]>([]);
  const [showLaunch, setShowLaunch] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [b, c] = await Promise.all([fetchCircleDuelBoards(user.id), fetchMyCircles()]);
    setBoards(b);
    setMyCircles(c);
  }, [user]);

  useEffect(() => { void refresh().catch(() => {}); }, [refresh]);

  if (!user) return null;

  return (
    <div style={{ padding: "18px 0 0 16px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", paddingRight: 16 }}>
        <span style={{ fontSize: 8.5, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 800, color: "#BCB7D6" }}>
          Les duels de cercle
        </span>
        <button
          onClick={() => setShowLaunch(true)}
          style={{ fontSize: 10, fontWeight: 800, color: "#C3AEFF", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          + Lancer un duel
        </button>
      </div>

      {boards.length > 0 ? (
        <div style={{ display: "flex", gap: 10, marginTop: 9, overflowX: "auto", paddingRight: 16, paddingBottom: 2, scrollbarWidth: "none" }}>
          {boards.map((b) => (
            <MiniArena
              key={b.season.id}
              board={b}
              onJoin={async (camp) => {
                await chooseCamp(b.season.id, user.id, camp);
                await refresh();
              }}
            />
          ))}
        </div>
      ) : (
        <button
          onClick={() => setShowLaunch(true)}
          style={{
            display: "block", width: "calc(100% - 16px)", marginTop: 9, textAlign: "left", cursor: "pointer",
            borderRadius: 14, padding: "11px 13px", color: "#BCB7D6",
            background: "rgba(139,92,246,.06)", border: "1px dashed rgba(139,92,246,.4)",
          }}
        >
          <b style={{ fontSize: 11.5, fontWeight: 800, color: "#ECEAF6" }}>Ton arène privée ⚔</b>
          <span style={{ display: "block", fontSize: 10, marginTop: 2 }}>
            Famille, amis, équipe — lance un duel rien qu&apos;entre vous. Chaque séance compte ici aussi.
          </span>
        </button>
      )}

      <AnimatePresence>
        {showLaunch && (
          <LaunchSheet
            userId={user.id}
            myCircles={myCircles}
            onClose={() => setShowLaunch(false)}
            onDone={async () => { setShowLaunch(false); await refresh(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

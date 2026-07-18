"use client";

// ============================================================
// LA CÉRÉMONIE DU CHOIX — plein écran, incontournable.
// S'affiche quand une saison globale est active et que
// l'utilisateur n'a pas encore de camp. Le choix se SCELLE en
// maintenant l'emblème 2 secondes (vibration à la clé) — et il
// ne se change plus. Aucune statistique avant le choix : les
// effectifs ne se révèlent qu'après.
// Signature visuelle : la « balafre » diagonale dorée.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGlobalSeason } from "@/lib/useSeason";
import { campEmblem, campName, type CampKey } from "@/lib/season";

const HOLD_MS = 2000;

// Manifestes des paires connues ; repli générique pour les autres.
const MANIFESTOS: Record<string, string> = {
  Solaire: "On gagne le matin, quand les autres dorment encore.",
  Lunaire: "La nuit ne nous arrête pas. Elle nous appartient.",
};
const manifesto = (name: string) =>
  MANIFESTOS[name] ?? "Chaque séance que tu termines rapporte un point à ton camp.";

const CAMP_GRAD: Record<CampKey, string> = {
  a: "linear-gradient(135deg,#F5B120,#E8620C)",
  b: "linear-gradient(135deg,#8B5CF6,#C13BC1)",
};
const CAMP_GLOW: Record<CampKey, string> = {
  a: "rgba(245,177,32,.65)",
  b: "rgba(139,92,246,.7)",
};

export default function SeasonCeremony() {
  const { user } = useAuth();
  const { loading, season, myCamp, campCounts, chooseCamp } = useGlobalSeason();

  const [phase, setPhase] = useState<"choose" | "sealed" | "closed">("choose");
  const [sealedCamp, setSealedCamp] = useState<CampKey | null>(null);
  const [holding, setHolding] = useState<CampKey | null>(null);
  const [holdP, setHoldP] = useState(0); // 0→1
  const rafRef = useRef<number>(0);
  const submittingRef = useRef(false);

  const cancelHold = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setHolding(null);
    setHoldP(0);
  }, []);

  const seal = useCallback(
    async (camp: CampKey) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      try { navigator.vibrate?.(80); } catch { /* pas supporté */ }
      const ok = await chooseCamp(camp);
      submittingRef.current = false;
      if (ok) {
        setSealedCamp(camp);
        setPhase("sealed");
      }
      cancelHold();
    },
    [chooseCamp, cancelHold],
  );

  const startHold = useCallback(
    (camp: CampKey) => {
      if (submittingRef.current) return;
      setHolding(camp);
      const t0 = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / HOLD_MS);
        setHoldP(p);
        if (p >= 1) { void seal(camp); return; }
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [seal],
  );

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Gate : connecté, profil amorcé, saison active, pas encore de camp.
  if (!user?.pseudo || loading || !season || phase === "closed") return null;
  if (myCamp !== null && phase !== "sealed") return null;

  const camps: CampKey[] = ["a", "b"];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9990, background: "#050208", color: "#ECEAF6", overflow: "hidden" }}>
      <style>{`
        @keyframes vaiiya-slash-in { from { opacity:0; } to { opacity:1; } }
        @media (prefers-reduced-motion: reduce){ .vaiiya-cer-anim { animation:none !important; transition:none !important; } }
      `}</style>

      {/* halos des deux mondes */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(75% 55% at 22% 22%, rgba(245,177,32,.32), transparent 62%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(75% 55% at 78% 78%, rgba(139,92,246,.38), transparent 62%)" }} />

      {/* la balafre */}
      <div className="vaiiya-cer-anim" style={{
        position: "absolute", top: "-14%", bottom: "-14%", left: "50%", width: 3.5,
        background: "linear-gradient(180deg, transparent 0%, #FFE9BE 22%, #E6C56E 50%, #FFE9BE 78%, transparent 100%)",
        transform: "rotate(17deg)", boxShadow: "0 0 18px 3px rgba(230,197,110,.85), 0 0 55px 12px rgba(230,197,110,.35)",
        animation: "vaiiya-slash-in .8s ease-out both",
      }} />
      <span style={{ position: "absolute", top: "calc(50% - 46px)", left: "calc(50% - 42px)", fontSize: 44, fontWeight: 900, transform: "rotate(-4deg)", color: "#FFF3D6", textShadow: "0 0 22px rgba(230,197,110,.9)", zIndex: 4 }}>V</span>
      <span style={{ position: "absolute", top: "calc(50% + 2px)", left: "calc(50% + 12px)", fontSize: 44, fontWeight: 900, transform: "rotate(-4deg)", color: "#FFF3D6", textShadow: "0 0 22px rgba(230,197,110,.9)", zIndex: 4 }}>S</span>

      {phase === "choose" && (
        <>
          <div style={{ position: "absolute", top: "max(44px, env(safe-area-inset-top))", left: 0, right: 0, textAlign: "center", zIndex: 5 }}>
            <span style={{ fontSize: 10, letterSpacing: ".22em", textTransform: "uppercase", fontWeight: 800, color: "#E6C56E" }}>{season.name}</span>
            <h2 style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>Choisis ton camp</h2>
          </div>

          {camps.map((camp) => {
            const isA = camp === "a";
            const p = holding === camp ? holdP : 0;
            return (
              <div key={camp} style={{
                position: "absolute", zIndex: 5, display: "flex", flexDirection: "column", gap: 10, maxWidth: 170,
                ...(isA
                  ? { top: "22%", left: 24, alignItems: "flex-start", textAlign: "left" as const }
                  : { bottom: "19%", right: 24, alignItems: "flex-end", textAlign: "right" as const }),
              }}>
                <button
                  aria-label={`Rejoindre ${campName(season, camp)} (maintenir 2 secondes)`}
                  onPointerDown={() => startHold(camp)}
                  onPointerUp={cancelHold}
                  onPointerLeave={cancelHold}
                  onPointerCancel={cancelHold}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{
                    width: 84, height: 84, borderRadius: "50%", border: "none", cursor: "pointer",
                    display: "grid", placeItems: "center", fontSize: 36, color: "#fff",
                    background: CAMP_GRAD[camp],
                    boxShadow: `0 0 ${36 + p * 30}px ${CAMP_GLOW[camp]}`,
                    transform: holding === camp ? "scale(1.06)" : "scale(1)",
                    transition: "transform .15s ease",
                    touchAction: "none", WebkitTapHighlightColor: "transparent",
                    position: "relative",
                  }}
                >
                  {campEmblem(season, camp)}
                  {/* anneau de scellement */}
                  <span style={{
                    position: "absolute", inset: -8, borderRadius: "50%",
                    background: `conic-gradient(#E6C56E ${p * 360}deg, rgba(230,197,110,.18) 0deg)`,
                    WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))",
                    mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))",
                  }} />
                </button>
                <div>
                  <div style={{ fontSize: 21, fontWeight: 900, letterSpacing: ".05em", textTransform: "uppercase" }}>{campName(season, camp)}</div>
                  <p style={{ fontSize: 11.5, lineHeight: 1.5, color: "#BCB7D6", fontWeight: 600, marginTop: 4 }}>{manifesto(campName(season, camp))}</p>
                </div>
              </div>
            );
          })}

          <div style={{ position: "absolute", bottom: "max(24px, env(safe-area-inset-bottom))", left: 0, right: 0, textAlign: "center", zIndex: 5 }}>
            <p style={{ fontSize: 11, fontWeight: 700, display: "inline-block", padding: "8px 16px", borderRadius: 99, background: "rgba(13,10,20,.85)", border: "1px solid rgba(230,197,110,.4)" }}>
              Maintiens un emblème 2 s pour sceller ton choix
            </p>
            <p style={{ fontSize: 10, color: "#BCB7D6", marginTop: 7 }}>Le choix vaut pour toute la saison. Tes amis&nbsp;? Tu le sauras après.</p>
          </div>
        </>
      )}

      {phase === "sealed" && sealedCamp && (
        <div style={{ position: "absolute", inset: 0, zIndex: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center", background: sealedCamp === "a" ? "radial-gradient(120% 90% at 50% 30%, rgba(245,177,32,.3), #050208 70%)" : "radial-gradient(120% 90% at 50% 30%, rgba(139,92,246,.34), #050208 70%)" }}>
          <span style={{ width: 96, height: 96, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 42, color: "#fff", background: CAMP_GRAD[sealedCamp], boxShadow: `0 0 60px ${CAMP_GLOW[sealedCamp]}` }}>
            {campEmblem(season, sealedCamp)}
          </span>
          <h2 style={{ fontSize: 26, fontWeight: 900 }}>Tu es {campName(season, sealedCamp)}</h2>
          <p style={{ fontSize: 13, color: "#BCB7D6", lineHeight: 1.5, maxWidth: 280 }}>
            Vous êtes <b style={{ color: "#ECEAF6" }}>{campCounts[sealedCamp]}</b> {campName(season, sealedCamp)}s
            — <b style={{ color: "#ECEAF6" }}>{campCounts[sealedCamp === "a" ? "b" : "a"]}</b> en face.
            Chaque séance terminée rapporte un point à ton camp.
          </p>
          <button
            onClick={() => setPhase("closed")}
            style={{ marginTop: 10, padding: "13px 34px", borderRadius: 14, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", fontWeight: 800, fontSize: 14, boxShadow: "0 8px 22px -8px rgba(139,92,246,.65)" }}
          >
            Entrer dans la saison
          </button>
        </div>
      )}
    </div>
  );
}

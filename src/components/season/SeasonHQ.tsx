"use client";

// ============================================================
// LE QG — l'écran d'arrivée de l'onglet Communauté.
// Un lobby de jeu, pas une page web : l'arène balafrée en haut,
// ta carte ancrée côté camp, l'exploit en sceau doré, le ticker
// d'événements, la poignée vers le fil. Toujours sombre (comme
// le tunnel de séance). Toute la donnée vient de useGlobalSeason
// — ce fichier n'est QUE de l'habillage, redessinable à volonté.
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGlobalSeason } from "@/lib/useSeason";
import { completeExploit, fetchCirclePresence, fetchRecentEvents, type FeedEvent, type PresenceEntry } from "@/lib/seasonApi";
import { campEmblem, campName, seasonDaysLeft, type CampKey } from "@/lib/season";
import SeasonProgression from "@/components/season/SeasonProgression";

const HEX_CLIP = "polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)";
const CAMP_GRAD: Record<CampKey, string> = {
  a: "linear-gradient(135deg,#F5B120,#E8620C)",
  b: "linear-gradient(135deg,#8B5CF6,#C13BC1)",
};

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

function tickerSentence(e: FeedEvent): string | null {
  const who = e.actorPseudo ?? "Quelqu'un";
  switch (e.type) {
    case "exploit_done": return `🏅 ${who} a relevé l'exploit « ${String(e.payload.badge_name ?? "")} »`;
    case "rank_up":      return `✦ ${who} monte ${String(e.payload.rank_name ?? "de rang")}`;
    case "duel_lead":    return `⚡ La séance de ${who} fait basculer le duel — ${String(e.payload.camp_emblem ?? "")} ${String(e.payload.camp_name ?? "son camp")} devant`;
    case "streak":       return `🔥 ${who} — ${String(e.payload.days ?? "?")} jours d'affilée`;
    case "season_start": return `✦ La saison est lancée`;
    default: return null;
  }
}

export default function SeasonHQ({ onOpenFil, onOpenSearch, onOpenDMs, onNoSeason }: {
  onOpenFil: () => void;
  onOpenSearch: () => void;
  onOpenDMs: () => void;
  onNoSeason: () => void;
}) {
  const { user } = useAuth();
  const s = useGlobalSeason();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [explStep, setExplStep] = useState<"idle" | "confirm" | "saving">("idle");
  const [showProgression, setShowProgression] = useState(false);
  const noSeasonRef = useRef(false);

  // Pas de saison active → l'onglet retombe sur le fil, sans écran cassé.
  useEffect(() => {
    if (!s.loading && !s.season && !noSeasonRef.current) {
      noSeasonRef.current = true;
      onNoSeason();
    }
  }, [s.loading, s.season, onNoSeason]);

  useEffect(() => {
    void fetchRecentEvents(12).then(setEvents);
  }, []);

  // La présence : « Qui a transpiré aujourd'hui ? »
  const [presence, setPresence] = useState<PresenceEntry[]>([]);
  useEffect(() => {
    if (!user) return;
    void fetchCirclePresence(user.id).then(setPresence).catch(() => {});
  }, [user]);
  const sweatCount = presence.filter((p) => p.doneToday).length;

  const pointsA = s.scores.find((x) => x.camp === "a")?.points ?? 0;
  const pointsB = s.scores.find((x) => x.camp === "b")?.points ?? 0;

  const tickerItems = useMemo(() => {
    const items = events.map(tickerSentence).filter((x): x is string => !!x);
    if (items.length === 0 && s.season) {
      items.push("✦ La saison est lancée — chaque séance compte");
      items.push(`⚡ ${campName(s.season, "a")} ${pointsA} — ${pointsB} ${campName(s.season, "b")}`);
    }
    return items;
  }, [events, s.season, pointsA, pointsB]);

  const freshCount = useMemo(
    () => events.filter((e) => Date.now() - new Date(e.created_at).getTime() < 86_400_000).length,
    [events],
  );

  if (s.loading || !s.season) {
    return (
      <div style={{ minHeight: "60dvh", display: "grid", placeItems: "center", color: "#C3AEFF" }}>
        <span style={{ fontSize: 28, opacity: 0.7 }}>✦</span>
      </div>
    );
  }

  const season = s.season;
  const myCamp = s.myCamp;
  const lead = pointsA === pointsB ? null : pointsA > pointsB ? "a" : "b";
  const margin = Math.abs(pointsA - pointsB);
  const duelLine = myCamp === null
    ? "Choisis ton camp pour entrer dans le duel"
    : lead === null
      ? "Égalité parfaite — tout se joue maintenant"
      : lead === myCamp
        ? `Ton camp mène de ${margin}`
        : `Ton camp est mené de ${margin} — ta séance peut tout changer`;

  const exploitDoneCount = s.exploitDoneBy.length;

  return (
    <div style={{
      width: "100vw", marginLeft: "calc(-50vw + 50%)",
      minHeight: "100dvh",
      background: "radial-gradient(120% 72% at 50% -6%, #100B1E 0%, #050208 52%, #000 100%)",
      color: "#ECEAF6",
      display: "flex", flexDirection: "column",
      paddingBottom: "calc(6.5rem + env(safe-area-inset-bottom))",
    }}>
      <style>{`
        @keyframes vaiiya-tick { to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce){ .vaiiya-tick-track { animation: none !important; } }
      `}</style>

      {/* ═══ L'ARÈNE ═══ */}
      <div style={{ position: "relative", height: 252, flex: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, clipPath: "polygon(0 0,62% 0,38% 100%,0 100%)", background: "linear-gradient(200deg,#3A2606 0%,#100B02 80%)" }} />
        <div style={{ position: "absolute", inset: 0, clipPath: "polygon(0 0,62% 0,38% 100%,0 100%)", background: "radial-gradient(90% 80% at 28% 30%, rgba(245,177,32,.4), transparent 60%)" }} />
        <div style={{ position: "absolute", inset: 0, clipPath: "polygon(62% 0,100% 0,100% 100%,38% 100%)", background: "linear-gradient(160deg,#1B0F38 0%,#070310 80%)" }} />
        <div style={{ position: "absolute", inset: 0, clipPath: "polygon(62% 0,100% 0,100% 100%,38% 100%)", background: "radial-gradient(90% 80% at 72% 65%, rgba(139,92,246,.4), transparent 60%)" }} />
        {/* la balafre */}
        <div style={{
          position: "absolute", top: "-8%", bottom: "-8%", left: "50%", width: 3,
          background: "linear-gradient(180deg, transparent 0%, #FFE9BE 22%, #E6C56E 50%, #FFE9BE 78%, transparent 100%)",
          transform: "rotate(13.5deg)",
          boxShadow: "0 0 18px 3px rgba(230,197,110,.85), 0 0 55px 12px rgba(230,197,110,.35)", zIndex: 5,
        }} />

        <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top) + 14px)", left: 0, right: 0, textAlign: "center", zIndex: 6 }}>
          <span style={{ fontSize: 9, letterSpacing: ".2em", textTransform: "uppercase", fontWeight: 800, color: "#E6C56E", background: "rgba(13,10,20,.75)", padding: "4px 11px", borderRadius: 99, border: "1px solid rgba(230,197,110,.35)" }}>
            {season.name} · J-{seasonDaysLeft(season)}
          </span>
        </div>

        {/* icônes trouver des gens / messages */}
        <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top) + 10px)", right: 12, zIndex: 7, display: "flex", gap: 7 }}>
          <button onClick={onOpenSearch} aria-label="Trouver des gens" style={{ width: 32, height: 32, borderRadius: 11, display: "grid", placeItems: "center", background: "rgba(13,10,20,.6)", border: "1px solid rgba(255,255,255,.14)", color: "#ECEAF6", cursor: "pointer", fontSize: 14 }}>⌕</button>
          <button onClick={onOpenDMs} aria-label="Messages" style={{ width: 32, height: 32, borderRadius: 11, display: "grid", placeItems: "center", background: "rgba(13,10,20,.6)", border: "1px solid rgba(255,255,255,.14)", color: "#ECEAF6", cursor: "pointer", fontSize: 13 }}>✉</button>
        </div>

        {(["a", "b"] as CampKey[]).map((camp) => {
          const isA = camp === "a";
          const pts = isA ? pointsA : pointsB;
          const membersCount = s.scores.find((x) => x.camp === camp)?.members ?? 0;
          return (
            <div key={camp} style={{ position: "absolute", top: 92, zIndex: 6, display: "flex", flexDirection: "column", gap: 2, ...(isA ? { left: 22, alignItems: "flex-start" as const } : { right: 22, alignItems: "flex-end" as const, textAlign: "right" as const }) }}>
              <span style={{ width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 14, color: "#fff", background: CAMP_GRAD[camp], boxShadow: `0 0 20px ${isA ? "rgba(232,98,12,.6)" : "rgba(139,92,246,.65)"}` }}>
                {campEmblem(season, camp)}
              </span>
              <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: ".1em", textTransform: "uppercase", opacity: 0.85, marginTop: 4 }}>
                {campName(season, camp)}{myCamp === camp ? " · toi" : ""}
              </span>
              <span style={{ fontSize: 46, fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums", textShadow: isA ? "0 0 26px rgba(245,177,32,.55)" : "0 0 26px rgba(139,92,246,.65)" }}>
                {pts}
              </span>
              <span style={{ fontSize: 8.5, fontWeight: 700, color: "rgba(255,255,255,.7)" }}>{membersCount} membre{membersCount > 1 ? "s" : ""}</span>
            </div>
          );
        })}

        <div style={{ position: "absolute", bottom: 14, left: 0, right: 0, textAlign: "center", zIndex: 6, fontSize: 9.5, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.82)" }}>
          {duelLine}
        </div>
      </div>

      {/* ═══ TA CARTE — ancrée côté camp (tap → progression) ═══ */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Voir ta progression"
        onClick={() => setShowProgression(true)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setShowProgression(true); }}
        style={{
          position: "relative", zIndex: 10, cursor: "pointer",
          margin: myCamp === "a" ? "-24px 58px 0 14px" : "-24px 14px 0 58px",
          borderRadius: 16, padding: "10px 12px",
          background: "rgba(24,16,42,.92)",
          border: myCamp === "a" ? "1px solid rgba(245,177,32,.45)" : "1px solid rgba(139,92,246,.45)",
          boxShadow: "0 12px 30px -10px rgba(0,0,0,.7)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <b style={{ fontSize: 12.5, fontWeight: 800 }}>
              {user?.pseudo ?? "Toi"}{myCamp ? ` · ${campEmblem(season, myCamp)} ${campName(season, myCamp)}` : ""}
            </b>
            <span style={{ fontSize: 9.5, color: "#BCB7D6", fontVariantNumeric: "tabular-nums" }}>{s.eclats} éclat{s.eclats > 1 ? "s" : ""}</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: "rgba(188,183,214,.2)", overflow: "hidden", margin: "6px 0 4px" }}>
            <i style={{ display: "block", height: "100%", width: `${Math.round(s.progress * 100)}%`, borderRadius: 99, background: "linear-gradient(90deg,#8B5CF6,#C13BC1)" }} />
          </div>
          <div style={{ fontSize: 9, color: "#BCB7D6" }}>
            {s.next
              ? <><b style={{ color: "#E6C56E", fontWeight: 800 }}>{s.next.rank.name} à {s.next.rank.min}</b> — encore {s.next.missing} éclat{s.next.missing > 1 ? "s" : ""} (~{Math.max(1, Math.ceil(s.next.missing / 35))} séances)</>
              : <b style={{ color: "#E6C56E", fontWeight: 800 }}>✦ Étincelle — le sommet</b>}
          </div>
        </div>
        <span style={{ width: 38, height: 42, flex: "none", clipPath: HEX_CLIP, display: "grid", placeItems: "center", fontWeight: 900, fontSize: 13, background: RANK_GRAD[s.rank.key], color: RANK_INK[s.rank.key], filter: "drop-shadow(0 0 8px rgba(255,211,78,.4))" }}>
          {s.rank.numeral}
        </span>
      </div>

      {/* ═══ L'EXPLOIT — le sceau ═══ */}
      {s.exploit && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 16px 4px" }}>
          <span style={{
            width: 58, height: 58, flex: "none", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 22,
            background: s.exploitDone
              ? "radial-gradient(circle at 35% 30%, #FFE9BE, #E6C56E 45%, #8A6410 100%)"
              : "radial-gradient(circle at 35% 30%, rgba(255,233,190,.5), rgba(230,197,110,.5) 45%, rgba(138,100,16,.6) 100%)",
            boxShadow: s.exploitDone ? "0 0 24px rgba(230,197,110,.6)" : "0 0 14px rgba(230,197,110,.3)",
            border: "2px solid rgba(255,243,214,.8)",
          }}>
            {s.exploit.badge_emoji}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 8.5, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 800, color: "#E6C56E" }}>
              L'exploit de la semaine · solo
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.25, marginTop: 2 }}>{s.exploit.title}</div>
            <div style={{ fontSize: 10, color: "#BCB7D6", marginTop: 2 }}>
              {s.exploitDone
                ? <>Badge « {s.exploit.badge_name} » gagné ✦ — à vie</>
                : <>Badge « {s.exploit.badge_name} » à vie · +{s.exploit.reward_eclats} éclats · {exploitDoneCount === 0 ? "personne ne l'a encore réussi" : `${exploitDoneCount} l'${exploitDoneCount > 1 ? "ont" : "a"} réussi`}</>}
            </div>
          </div>
          {!s.exploitDone && (
            explStep === "idle" ? (
              <button onClick={() => setExplStep("confirm")} style={{ flex: "none", fontSize: 11, fontWeight: 800, color: "#C3AEFF", border: "1.5px solid rgba(139,92,246,.5)", borderRadius: 11, padding: "8px 12px", background: "rgba(139,92,246,.07)", cursor: "pointer" }}>
                Je tente
              </button>
            ) : (
              <button
                disabled={explStep === "saving"}
                onClick={async () => {
                  if (!user || !s.exploit) return;
                  setExplStep("saving");
                  await completeExploit(s.exploit, user.id);
                  await s.refresh();
                  setExplStep("idle");
                }}
                style={{ flex: "none", fontSize: 11, fontWeight: 800, color: "#0d0a14", border: "none", borderRadius: 11, padding: "8px 12px", background: "linear-gradient(135deg,#FFD34E,#E6C56E)", cursor: "pointer", opacity: explStep === "saving" ? 0.6 : 1 }}
              >
                {explStep === "saving" ? "…" : "C'est fait ✦ (sur l'honneur)"}
              </button>
            )
          )}
        </div>
      )}

      {/* ═══ LA PRÉSENCE — qui a transpiré aujourd'hui ? ═══ */}
      {presence.length > 1 && (
        <div style={{ padding: "18px 0 0 16px" }}>
          <div style={{ fontSize: 8.5, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 800, color: "#BCB7D6" }}>
            Qui a transpiré aujourd&apos;hui ?
            {sweatCount > 0 && <b style={{ color: "#2BD4A0" }}> · {sweatCount}</b>}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 9, overflowX: "auto", paddingRight: 16, paddingBottom: 2, scrollbarWidth: "none" }}>
            {presence.map((p) => (
              <div key={p.user_id} style={{ flex: "none", width: 46, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <span style={{
                  width: 42, height: 42, borderRadius: "50%", display: "grid", placeItems: "center", position: "relative",
                  // Anneau teal = séance faite (système D : teal = fait ✓) ; sinon liseré éteint
                  border: p.doneToday ? "2px solid #2BD4A0" : "2px solid rgba(188,183,214,.28)",
                  boxShadow: p.goldHalo ? "0 0 12px 3px rgba(230,197,110,.55)" : undefined,
                  opacity: p.doneToday || p.goldHalo ? 1 : 0.55,
                }}>
                  {p.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img loading="lazy" decoding="async" src={p.avatar_url} alt={p.pseudo} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    : <span style={{ width: "100%", height: "100%", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 15, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#5A4B92,#8B5CF6)" }}>{p.pseudo.slice(0, 1).toUpperCase()}</span>}
                  {p.goldHalo && (
                    <span style={{ position: "absolute", top: -5, right: -5, fontSize: 11, color: "#E6C56E", textShadow: "0 0 6px rgba(230,197,110,.8)" }}>✦</span>
                  )}
                </span>
                <span style={{ fontSize: 8, fontWeight: 700, color: p.doneToday ? "#ECEAF6" : "#BCB7D6", maxWidth: 46, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.isMe ? "Toi" : p.pseudo}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ LE TICKER ═══ */}
      {tickerItems.length > 0 && (
        <div style={{ overflow: "hidden", borderTop: "1px solid rgba(195,174,255,.16)", borderBottom: "1px solid rgba(195,174,255,.16)", padding: "8px 0", marginTop: 18 }}>
          <div className="vaiiya-tick-track" style={{ display: "flex", gap: 34, whiteSpace: "nowrap", width: "max-content", animation: "vaiiya-tick 22s linear infinite" }}>
            {[...tickerItems, ...tickerItems].map((t, i) => (
              <span key={i} style={{ fontSize: 11, color: "#BCB7D6", fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* ═══ LA POIGNÉE VERS LE FIL ═══ */}
      <button onClick={onOpenFil} style={{ marginTop: "auto", padding: "18px 0 6px", background: "none", border: "none", cursor: "pointer", textAlign: "center", color: "#BCB7D6" }}>
        <span style={{ display: "block", width: 36, height: 4, borderRadius: 99, background: "#BCB7D6", opacity: 0.5, margin: "0 auto 7px" }} />
        <span style={{ fontSize: 11.5, fontWeight: 700 }}>
          Remonter le fil{freshCount > 0 ? <> — <b style={{ color: "#C3AEFF" }}>{freshCount} nouveauté{freshCount > 1 ? "s" : ""}</b></> : ""}
        </span>
      </button>

      {showProgression && <SeasonProgression s={s} onClose={() => setShowProgression(false)} />}
    </div>
  );
}

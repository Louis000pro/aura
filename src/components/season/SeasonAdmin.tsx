"use client";

// ============================================================
// L'ADMIN DE LA SAISON — créer saisons globales et exploits
// sans toucher au SQL. Onglet « Saison » de /admin (thème clair
// de la page admin, pas le sombre du QG). Les inserts passent
// par seasonApi ; la RLS ne laisse passer qu'un admin.
// ============================================================

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  createGlobalExploit,
  createGlobalSeason,
  fetchAllGlobalExploits,
  fetchAllGlobalSeasons,
} from "@/lib/seasonApi";
import { CAMP_PAIRS, type Exploit, type Season } from "@/lib/season";

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.75)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
  borderRadius: 16,
  padding: 20,
};
const label: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#A0AEC0",
};
const input: React.CSSProperties = {
  width: "100%", fontSize: 13, fontWeight: 500, color: "#2D3748",
  background: "rgba(240,235,255,0.5)", border: "1px solid rgba(212,192,255,0.4)",
  borderRadius: 12, padding: "9px 12px", outline: "none",
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Premier et dernier jour du mois SUIVANT (le rythme mensuel). */
function nextMonthWindow(): { start: string; end: string; monthName: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + 1, 1, 12);
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 12);
  const monthName = start.toLocaleDateString("fr-FR", { month: "long" });
  return { start: iso(start), end: iso(end), monthName };
}

/** Lundi prochain → dimanche (la semaine d'exploit). */
function nextWeekWindow(): { start: string; end: string } {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: iso(monday), end: iso(sunday) };
}

function statusOf(x: { starts_on: string; ends_on: string }): { text: string; color: string } {
  const day = iso(new Date());
  if (day < x.starts_on) return { text: "à venir", color: "#A78BFA" };
  if (day > x.ends_on) return { text: "terminée", color: "#A0AEC0" };
  return { text: "en cours", color: "#34D399" };
}

const frDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

export default function SeasonAdmin({ userId, onToast }: {
  userId: string;
  onToast: (msg: string) => void;
}) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [exploits, setExploits] = useState<Exploit[]>([]);

  // formulaire saison
  const [win] = useState(nextMonthWindow);
  const [sName, setSName] = useState(`Saison de ${win.monthName}`);
  const [pairIdx, setPairIdx] = useState(0);
  const [campAName, setCampAName] = useState(CAMP_PAIRS[0].a.name);
  const [campAEmblem, setCampAEmblem] = useState(CAMP_PAIRS[0].a.emblem);
  const [campBName, setCampBName] = useState(CAMP_PAIRS[0].b.name);
  const [campBEmblem, setCampBEmblem] = useState(CAMP_PAIRS[0].b.emblem);
  const [sStart, setSStart] = useState(win.start);
  const [sEnd, setSEnd] = useState(win.end);
  const [sBusy, setSBusy] = useState(false);

  // formulaire exploit
  const [wWin] = useState(nextWeekWindow);
  const [eTitle, setETitle] = useState("");
  const [eBadge, setEBadge] = useState("");
  const [eEmoji, setEEmoji] = useState("🏅");
  const [eReward, setEReward] = useState(80);
  const [eStart, setEStart] = useState(wWin.start);
  const [eEnd, setEEnd] = useState(wWin.end);
  const [eBusy, setEBusy] = useState(false);

  const refresh = async () => {
    const [s, e] = await Promise.all([fetchAllGlobalSeasons(), fetchAllGlobalExploits()]);
    setSeasons(s);
    setExploits(e);
  };
  useEffect(() => { void refresh().catch(() => {}); }, []);

  const cyclePair = () => {
    const i = (pairIdx + 1) % CAMP_PAIRS.length;
    setPairIdx(i);
    setCampAName(CAMP_PAIRS[i].a.name);
    setCampAEmblem(CAMP_PAIRS[i].a.emblem);
    setCampBName(CAMP_PAIRS[i].b.name);
    setCampBEmblem(CAMP_PAIRS[i].b.emblem);
  };

  const submitSeason = async () => {
    if (!sName.trim() || !campAName.trim() || !campBName.trim() || !sStart || !sEnd || sEnd < sStart) {
      onToast("Saison incomplète (noms + dates dans l'ordre)"); return;
    }
    setSBusy(true);
    const created = await createGlobalSeason(userId, {
      name: sName.trim(),
      campA: { name: campAName.trim(), emblem: campAEmblem.trim() || "☀" },
      campB: { name: campBName.trim(), emblem: campBEmblem.trim() || "☾" },
      startsOn: sStart,
      endsOn: sEnd,
    });
    setSBusy(false);
    if (!created) { onToast("Refusé — vérifie les droits admin et le SQL appliqué"); return; }
    onToast(`Saison « ${created.name} » créée ✦`);
    await refresh();
  };

  const submitExploit = async () => {
    if (!eTitle.trim() || !eBadge.trim() || !eStart || !eEnd || eEnd < eStart) {
      onToast("Exploit incomplet (titre + badge + dates dans l'ordre)"); return;
    }
    setEBusy(true);
    const created = await createGlobalExploit(userId, {
      title: eTitle.trim(),
      badgeName: eBadge.trim(),
      badgeEmoji: eEmoji.trim() || "🏅",
      rewardEclats: Math.max(1, eReward),
      startsOn: eStart,
      endsOn: eEnd,
    });
    setEBusy(false);
    if (!created) { onToast("Refusé — vérifie les droits admin et le SQL appliqué"); return; }
    onToast(`Exploit « ${created.badge_name} » créé 🏅`);
    setETitle(""); setEBadge("");
    await refresh();
  };

  return (
    <motion.div key="saison" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">

      {/* ── Nouvelle saison ── */}
      <div style={card}>
        <p style={{ ...label, marginBottom: 4 }}>Nouvelle saison (duel global)</p>
        <p style={{ fontSize: 11, color: "#A0AEC0", margin: "0 0 14px" }}>
          Deux nouvelles équipes chaque mois — ton astral ou élémentaire, jamais lié à des mouvements.
        </p>

        <div className="flex flex-col gap-2.5">
          <input style={input} value={sName} onChange={(e) => setSName(e.target.value)} placeholder="Nom (« Saison de septembre »)" maxLength={40} />

          <div className="flex gap-2 items-center">
            <input style={{ ...input, width: 52, textAlign: "center" }} value={campAEmblem} onChange={(e) => setCampAEmblem(e.target.value)} maxLength={4} aria-label="Emblème du camp A" />
            <input style={input} value={campAName} onChange={(e) => setCampAName(e.target.value)} placeholder="Camp A" maxLength={20} />
            <span style={{ fontSize: 10, fontWeight: 800, color: "#A78BFA", flexShrink: 0 }}>VS</span>
            <input style={input} value={campBName} onChange={(e) => setCampBName(e.target.value)} placeholder="Camp B" maxLength={20} />
            <input style={{ ...input, width: 52, textAlign: "center" }} value={campBEmblem} onChange={(e) => setCampBEmblem(e.target.value)} maxLength={4} aria-label="Emblème du camp B" />
          </div>
          <button onClick={cyclePair} style={{ alignSelf: "flex-start", fontSize: 11, fontWeight: 600, color: "#A78BFA", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            ↺ Suggérer une autre paire
          </button>

          <div className="flex gap-2">
            <div style={{ flex: 1 }}>
              <p style={{ ...label, marginBottom: 4 }}>Du</p>
              <input type="date" style={input} value={sStart} onChange={(e) => setSStart(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ ...label, marginBottom: 4 }}>Au (inclus)</p>
              <input type="date" style={input} value={sEnd} onChange={(e) => setSEnd(e.target.value)} />
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={sBusy}
            onClick={submitSeason}
            className="cursor-pointer"
            style={{
              marginTop: 4, fontSize: 13, fontWeight: 700, color: "#2D3748", border: "none", borderRadius: 14,
              padding: "12px 0", background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)", opacity: sBusy ? 0.6 : 1,
            }}
          >
            {sBusy ? "…" : "Créer la saison ✦"}
          </motion.button>
        </div>
      </div>

      {/* ── Saisons existantes ── */}
      <div style={card}>
        <p style={{ ...label, marginBottom: 12 }}>Saisons ({seasons.length})</p>
        {seasons.length === 0 ? (
          <p style={{ fontSize: 12, color: "#A0AEC0" }}>Aucune saison — le SQL est-il appliqué ?</p>
        ) : (
          <div className="flex flex-col gap-2">
            {seasons.map((s) => {
              const st = statusOf(s);
              return (
                <div key={s.id} className="flex items-center justify-between gap-3" style={{ padding: "8px 10px", borderRadius: 12, background: "rgba(240,235,255,0.45)" }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: "#2D3748", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.name} — {s.camp_a_emblem} {s.camp_a_name} vs {s.camp_b_name} {s.camp_b_emblem}
                    </p>
                    <p style={{ fontSize: 10, color: "#A0AEC0" }}>
                      {frDate(s.starts_on)} → {frDate(s.ends_on)}
                      {s.winner && ` · vainqueur : ${s.winner === "draw" ? "égalité" : s.winner === "a" ? s.camp_a_name : s.camp_b_name}`}
                    </p>
                  </div>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: st.color, flexShrink: 0 }}>{st.text}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Nouvel exploit ── */}
      <div style={card}>
        <p style={{ ...label, marginBottom: 4 }}>Nouvel exploit (l&apos;hebdo perso)</p>
        <p style={{ fontSize: 11, color: "#A0AEC0", margin: "0 0 14px" }}>
          Sur l&apos;honneur, réussi seul. Badge à vie + éclats — jamais lié au corps ni à la perf.
        </p>

        <div className="flex flex-col gap-2.5">
          <input style={input} value={eTitle} onChange={(e) => setETitle(e.target.value)} placeholder="Le défi (« 3 minutes de planche, d'une traite »)" maxLength={80} />
          <div className="flex gap-2 items-center">
            <input style={{ ...input, width: 52, textAlign: "center" }} value={eEmoji} onChange={(e) => setEEmoji(e.target.value)} maxLength={4} aria-label="Emoji du badge" />
            <input style={input} value={eBadge} onChange={(e) => setEBadge(e.target.value)} placeholder="Nom du badge (« Inoxydable »)" maxLength={30} />
            <input
              type="number" min={1} max={500}
              style={{ ...input, width: 84 }}
              value={eReward}
              onChange={(e) => setEReward(parseInt(e.target.value, 10) || 0)}
              aria-label="Éclats de récompense"
            />
          </div>

          <div className="flex gap-2">
            <div style={{ flex: 1 }}>
              <p style={{ ...label, marginBottom: 4 }}>Du</p>
              <input type="date" style={input} value={eStart} onChange={(e) => setEStart(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ ...label, marginBottom: 4 }}>Au (inclus)</p>
              <input type="date" style={input} value={eEnd} onChange={(e) => setEEnd(e.target.value)} />
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={eBusy}
            onClick={submitExploit}
            className="cursor-pointer"
            style={{
              marginTop: 4, fontSize: 13, fontWeight: 700, color: "#2D3748", border: "none", borderRadius: 14,
              padding: "12px 0", background: "linear-gradient(135deg,#D4C0FF,#F5E6A3)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)", opacity: eBusy ? 0.6 : 1,
            }}
          >
            {eBusy ? "…" : "Créer l'exploit 🏅"}
          </motion.button>
        </div>
      </div>

      {/* ── Exploits existants ── */}
      <div style={card}>
        <p style={{ ...label, marginBottom: 12 }}>Exploits ({exploits.length})</p>
        {exploits.length === 0 ? (
          <p style={{ fontSize: 12, color: "#A0AEC0" }}>Aucun exploit pour l&apos;instant</p>
        ) : (
          <div className="flex flex-col gap-2">
            {exploits.map((x) => {
              const st = statusOf(x);
              return (
                <div key={x.id} className="flex items-center justify-between gap-3" style={{ padding: "8px 10px", borderRadius: 12, background: "rgba(240,235,255,0.45)" }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: "#2D3748", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {x.badge_emoji} {x.title}
                    </p>
                    <p style={{ fontSize: 10, color: "#A0AEC0" }}>
                      Badge « {x.badge_name} » · +{x.reward_eclats} éclats · {frDate(x.starts_on)} → {frDate(x.ends_on)}
                    </p>
                  </div>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: st.color, flexShrink: 0 }}>{st.text}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

"use client";

/* ─────────────────────────────────────────────────────────────
   Une affiche de séance, rendue en couverture de magazine
   (maquette « Le profil Vaiiya », 2026-10-14).

   Le nom de la séance en lettres géantes, la date et le numéro en
   tête, les deux premiers chiffres de la séance en bas. On ne
   recalcule rien : tout vient de `performance_data`, tel que la fin
   de séance l'a écrit. La surface est toujours sombre, comme le
   tunnel et l'affiche partageable qu'elle ouvre.
   ───────────────────────────────────────────────────────────── */

import type { PerformanceData } from "@/components/PerformanceCard";

const FONDS = [
  "radial-gradient(90% 60% at 100% 0%, rgba(193,59,193,.75) 0%, transparent 65%), radial-gradient(90% 70% at 0% 100%, rgba(139,92,246,.85) 0%, transparent 65%), #120D1A",
  "radial-gradient(90% 60% at 0% 0%, rgba(245,177,32,.6) 0%, transparent 65%), radial-gradient(90% 70% at 100% 100%, rgba(139,92,246,.8) 0%, transparent 65%), #120D1A",
];

/** Le titre en mots empilés, la taille suit la longueur du mot le plus long. */
function titreEmpile(titre: string): { lignes: string[]; taille: number } {
  const mots = titre.toUpperCase().split(/\s+/).filter(Boolean).slice(0, 4);
  const plusLong = Math.max(1, ...mots.map((m) => m.length));
  // 264 px de large, la largeur 125 d'Archivo fait ~0,62 em par lettre
  const taille = Math.max(34, Math.min(118, Math.floor(250 / (plusLong * 0.62))));
  return { lignes: mots.length ? mots : ["SÉANCE"], taille };
}

export default function CouvertureSeance({ data, numero, teinte = 0, onClick }: {
  data: PerformanceData;
  numero: number;
  teinte?: number;
  onClick: () => void;
}) {
  const { lignes, taille } = titreEmpile(data.title || "Séance");
  const chiffres = (data.metrics ?? []).slice(0, 2);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Affiche ${data.title || "de séance"}${data.date ? `, ${data.date}` : ""}`}
      className="relative h-[330px] w-[264px] flex-shrink-0 overflow-hidden text-left transition-transform active:scale-[.98]"
      style={{ borderRadius: "var(--r-affiche)", background: FONDS[teinte % FONDS.length], color: "#fff", boxShadow: "0 24px 44px -24px rgba(28,22,38,.8)" }}
    >
      <span
        aria-hidden
        className="absolute -left-1"
        style={{
          top: 58, fontSize: taille, lineHeight: 0.82, fontWeight: 900,
          fontVariationSettings: "'wdth' 125", letterSpacing: "-0.05em", color: "rgba(255,255,255,.95)",
        }}
      >
        {lignes.map((l, i) => <span key={i} className="block whitespace-nowrap">{l}</span>)}
      </span>

      <div className="absolute left-[18px] right-[18px] top-4 flex justify-between text-[11px]" style={{ color: "rgba(255,255,255,.75)" }}>
        <span><b className="font-extrabold text-white" style={{ fontVariationSettings: "var(--w-voix)" }}>Vaiiya</b> · séance n° {numero}</span>
        {data.date && <span>{data.date}</span>}
      </div>

      {chiffres.length > 0 && (
        <div
          className="absolute bottom-[18px] left-[18px] right-[18px] grid pt-3"
          style={{ gridTemplateColumns: `repeat(${chiffres.length}, minmax(0, 1fr))`, borderTop: "1px solid rgba(255,255,255,.22)" }}
        >
          {chiffres.map((m, i) => (
            <div key={i} style={i ? { borderLeft: "1px solid rgba(255,255,255,.22)", paddingLeft: 14 } : undefined}>
              <span className="vy-nombre block text-[34px] leading-none" style={{ fontWeight: 800 }}>
                {m.value}
              </span>
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,.7)" }}>
                {m.unit ? `${m.unit} · ` : ""}{m.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

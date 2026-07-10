"use client";

/* ════════════════════════════════════════════════════════════════════
   PerfShareCard — le poster de perf partageable (aperçu DOM 9:16).

   Fond « aura » + compo (chiffre géant, marque ✦ VAIIYA, stats). Les
   tailles sont proportionnelles à la largeur `width` pour rester nettes à
   n'importe quelle taille, et calées sur renderPerfCardBlob (l'export PNG
   1080×1920). Le texte se pose dans le tiers bas sombre → lisible.

   L'export final se fait via sharePerfCard() de @/lib/perfShareExport.
   ════════════════════════════════════════════════════════════════════ */

import type { PerfShareData } from "@/lib/perfShareExport";

const TS = "0 1px 10px rgba(0,0,0,0.65)";

export default function PerfShareCard({ data, width = 320 }: { data: PerfShareData; width?: number }) {
  const w = width;
  const px = (r: number) => `${Math.round(w * r * 100) / 100}px`;

  return (
    <div style={{
      width: w, aspectRatio: "9 / 16", borderRadius: px(0.08), overflow: "hidden",
      position: "relative", background: "#050308", boxShadow: "0 18px 46px rgba(0,0,0,0.5)",
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={data.bg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 38%, rgba(5,3,8,0.35) 58%, rgba(5,3,8,0.86) 90%)" }} />

      <div style={{ position: "absolute", inset: 0, padding: `${px(0.055)} ${px(0.052)}`, display: "flex", flexDirection: "column", color: "#fff" }}>
        {/* Haut : marque + date */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: px(0.04), letterSpacing: px(0.009), fontWeight: 600, textShadow: TS }}>{data.brand ?? "✦ VAIIYA"}</span>
          <span style={{ fontSize: px(0.033), color: "rgba(255,255,255,0.75)", textShadow: TS }}>{data.date}</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Bas : compo */}
        <div>
          <div style={{ fontSize: px(0.033), letterSpacing: px(0.008), fontWeight: 600, color: "#C9B6FF", textShadow: TS, textTransform: "uppercase" }}>{data.category}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: px(0.02), marginTop: px(0.01) }}>
            <span style={{ fontSize: px(0.2), fontWeight: 600, lineHeight: 0.9, letterSpacing: px(-0.006), textShadow: "0 2px 18px rgba(0,0,0,0.5)" }}>{data.hero.value}</span>
            {data.hero.unit && <span style={{ fontSize: px(0.06), color: "rgba(255,255,255,0.82)", textShadow: TS }}>{data.hero.unit}</span>}
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.22)", margin: `${px(0.043)} 0 ${px(0.036)}` }} />
          <div style={{ display: "flex", gap: px(0.07) }}>
            {data.subs.slice(0, 3).map((s) => (
              <div key={s.l}>
                <div style={{ fontSize: px(0.057), fontWeight: 600, textShadow: TS }}>{s.v}</div>
                <div style={{ fontSize: px(0.03), letterSpacing: px(0.003), color: "rgba(255,255,255,0.62)", textTransform: "uppercase" }}>{s.l}</div>
              </div>
            ))}
          </div>
          {data.user && <div style={{ marginTop: px(0.043), fontSize: px(0.037), color: "rgba(255,255,255,0.82)", textShadow: TS }}>{data.user}</div>}
        </div>
      </div>
    </div>
  );
}

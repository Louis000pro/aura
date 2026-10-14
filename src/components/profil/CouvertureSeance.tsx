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

import { useLayoutEffect, useRef, useState } from "react";
import type { PerformanceData } from "@/components/PerformanceCard";

const FONDS = [
  "radial-gradient(90% 60% at 100% 0%, rgba(193,59,193,.75) 0%, transparent 65%), radial-gradient(90% 70% at 0% 100%, rgba(139,92,246,.85) 0%, transparent 65%), #120D1A",
  "radial-gradient(90% 60% at 0% 0%, rgba(245,177,32,.6) 0%, transparent 65%), radial-gradient(90% 70% at 100% 100%, rgba(139,92,246,.8) 0%, transparent 65%), #120D1A",
  "radial-gradient(90% 60% at 100% 100%, rgba(79,123,255,.7) 0%, transparent 65%), radial-gradient(90% 70% at 0% 0%, rgba(139,92,246,.8) 0%, transparent 65%), #120D1A",
];

/** Le nombre de fonds proposés quand on modifie une affiche. */
export const NB_FONDS = FONDS.length;
export function fondCouverture(i: number) { return FONDS[((i % FONDS.length) + FONDS.length) % FONDS.length]; }

/** Les mots qu'on peut choisir pour une affiche (sans doublon). */
export const MOTS_PROPOSES = Array.from(new Set(
  ["Jambes", "Bras", "Torse", "Dos", "Pecs", "Épaules", "Push", "Fessiers", "Abdos", "Corps", "Cardio", "HIIT", "Force", "Mobilité", "Récup"],
));

/* ⭐ UN SEUL MOT PAR COUVERTURE (Louis, 2026-10-14) : la zone que la séance
   travaille, écrite comme on la dirait. « Jambes » pour une séance jambes,
   « Bras » pour une séance bras, et un mot trouvé quand le titre en a
   trois (« Haut du corps » devient « Torse »). L'ORDRE EST LA RÈGLE : le
   plus précis passe avant le plus large, sinon « Haut du corps » tomberait
   sur « corps » et « Récupération jambes » sur « jambes ». */
const MOTS: [RegExp, string][] = [
  [/recup|retour au calme|detente|relache|calme|lendemain|etirement/, "Récup"],
  [/mobilit|posture|hanche|cheville|colonne|souplesse/, "Mobilité"],
  [/haut du corps|torse|upper/, "Torse"],
  [/bas du corps|jambe|quadri|squat|lower/, "Jambes"],
  [/posterieur|fessier|ischio|glute/, "Fessiers"],
  [/pecto|pecs|poitrine|developpe/, "Pecs"],
  [/\bpush\b/, "Push"],
  [/\bpull\b|\bdos\b|tirage|traction|rowing/, "Dos"],
  [/epaule/, "Épaules"],
  [/\bbras\b|biceps|triceps/, "Bras"],
  [/abdo|gainage|core|sangle/, "Abdos"],
  [/hiit|tabata/, "HIIT"],
  [/cardio|endurance|rameur|course|velo|saut/, "Cardio"],
  [/full ?body|corps entier|complet/, "Corps"],
  [/force|machine|salle|masse/, "Force"],
];

function sansAccents(t: string) {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Le mot de la couverture : la zone si on la reconnaît, sinon le mot le
 *  plus parlant du titre (le plus long, les petits mots écartés). */
export function motCouverture(titre: string): string {
  const t = sansAccents(titre);
  for (const [re, mot] of MOTS) if (re.test(t)) return mot;
  const mots = titre.split(/[\s—–\-&·,]+/).filter((m) => m.length > 3);
  return (mots.sort((a, b) => b.length - a.length)[0] ?? titre.split(/\s+/)[0] ?? "Séance");
}

/* ⚠️ LE MOT SE MESURE, IL NE SE DEVINE PAS. Une règle « 0,62 em par
   lettre » laissait déborder les mots aux lettres larges (« MOBILITÉ »,
   « ÉPAULES ») et rapetissait les autres. On pose le mot à 100 px, on
   lit sa vraie largeur, et on règle la taille pour qu'il remplisse
   exactement la largeur utile. Relu quand la carte change de taille et
   quand la police arrive (avant, le navigateur mesure le repli). */
function useMotAjuste(mot: string, plafond: number) {
  const boite = useRef<HTMLDivElement>(null);
  const mesure = useRef<HTMLSpanElement>(null);
  const [taille, setTaille] = useState(0);
  useLayoutEffect(() => {
    const b = boite.current, m = mesure.current;
    if (!b || !m) return;
    const ajuster = () => {
      const w = m.getBoundingClientRect().width;
      if (!w) return;
      setTaille(Math.min(plafond, Math.floor((100 * b.clientWidth) / w * 0.98)));
    };
    ajuster();
    const ro = new ResizeObserver(ajuster);
    ro.observe(b);
    document.fonts?.ready.then(ajuster).catch(() => {});
    return () => ro.disconnect();
  }, [mot, plafond]);
  return { boite, mesure, taille };
}

const STYLE_MOT: React.CSSProperties = {
  lineHeight: 0.82, fontWeight: 900, fontVariationSettings: "'wdth' 125",
  letterSpacing: "-0.05em", whiteSpace: "nowrap",
};

export default function CouvertureSeance({ data, numero, teinte = 0, mot, compact = false, onClick }: {
  data: PerformanceData;
  numero?: number;
  teinte?: number;
  /** Le mot choisi à la main ; sinon il se déduit du titre. */
  mot?: string | null;
  /** Une couverture de grille : elle prend la largeur de sa colonne. */
  compact?: boolean;
  onClick?: () => void;
}) {
  const texte = (mot || motCouverture(data.title || "Séance")).toUpperCase();
  const { boite, mesure, taille } = useMotAjuste(texte, compact ? 70 : 118);
  const chiffres = (data.metrics ?? []).slice(0, 2);
  const marge = compact ? 12 : 18;
  const Racine = onClick ? "button" : "div";

  return (
    <Racine
      {...(onClick ? { type: "button" as const, onClick } : {})}
      aria-label={`Affiche ${data.title || "de séance"}${data.date ? `, ${data.date}` : ""}`}
      className={`relative block overflow-hidden text-left ${onClick ? "transition-transform active:scale-[.98]" : ""} ${compact ? "aspect-[4/5] w-full" : "h-[330px] w-[264px] flex-shrink-0"}`}
      style={{ borderRadius: compact ? "var(--r-bloc)" : "var(--r-affiche)", background: fondCouverture(teinte), color: "#fff", boxShadow: "0 24px 44px -24px rgba(28,22,38,.8)" }}
    >
      <div className="absolute flex justify-between gap-2 text-[11px]" style={{ left: marge, right: marge, top: compact ? 10 : 16, color: "rgba(255,255,255,.75)" }}>
        {compact
          ? <span className="truncate">{data.date}</span>
          : <>
              <span className="truncate"><b className="font-extrabold text-white" style={{ fontVariationSettings: "var(--w-voix)" }}>Vaiiya</b>{numero ? ` · séance n° ${numero}` : ""}</span>
              {data.date && <span className="flex-shrink-0">{data.date}</span>}
            </>}
      </div>

      {/* La largeur utile, mesurée ; le mot vit dedans et n'en sort pas. */}
      <div ref={boite} aria-hidden className="absolute overflow-hidden" style={{ left: marge, right: marge, top: compact ? 30 : 50 }}>
        <span ref={mesure} className="pointer-events-none invisible absolute left-0 top-0" style={{ ...STYLE_MOT, fontSize: 100 }}>{texte}</span>
        <span className="block" style={{ ...STYLE_MOT, fontSize: taille || 1, color: "rgba(255,255,255,.95)", opacity: taille ? 1 : 0 }}>{texte}</span>
      </div>

      {chiffres.length > 0 && (
        <div
          className="absolute grid"
          style={{ left: marge, right: marge, bottom: compact ? 10 : 18, paddingTop: compact ? 8 : 12, gridTemplateColumns: `repeat(${chiffres.length}, minmax(0, 1fr))`, borderTop: "1px solid rgba(255,255,255,.22)" }}
        >
          {chiffres.map((m, i) => (
            <div key={i} className="min-w-0" style={i ? { borderLeft: "1px solid rgba(255,255,255,.22)", paddingLeft: compact ? 8 : 14 } : undefined}>
              <span className={`vy-nombre block truncate leading-none ${compact ? "text-[20px]" : "text-[34px]"}`} style={{ fontWeight: 800 }}>
                {m.value}
              </span>
              <span className="block truncate text-[11px]" style={{ color: "rgba(255,255,255,.7)" }}>
                {compact ? (m.unit || m.label) : `${m.unit ? `${m.unit} · ` : ""}${m.label}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </Racine>
  );
}

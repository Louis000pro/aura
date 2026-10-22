"use client";

/* ════════════════════════════════════════════════════════════════════
   LA FIN DE SÉANCE, LE MOMENT DONT ON EST FIER
   (maquette « La fin de séance », validée par Louis le 2026-10-17)

   Les morceaux de l'écran de fin, rendus par `WorkoutGuideModal`. Ils
   ne lisent rien et n'écrivent rien : le tunnel leur donne ce que le
   journal a réellement enregistré, ils le mettent en scène.

   ⚠️ JAMAIS UN CHIFFRE NÉGATIF (Louis, 2026-10-17). Le fait marquant ne
   montre qu'un progrès vérifiable, et `gainDuFait` le dit toujours en
   positif : moins d'assistance s'écrit « 4 kg d'assistance en moins »,
   jamais « −4 kg ». Un écart nul ou en recul ne s'affiche pas du tout.

   ⚠️ AUCUN VERT SUR CET ÉCRAN (Louis, 2026-10-17). Le sceau « Séance
   faite », le progrès, la lueur et les confettis sont violet → rose :
   c'est la marque qui célèbre.
   ════════════════════════════════════════════════════════════════════ */

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { motCouverture, useMotAjuste, STYLE_MOT } from "@/components/profil/CouvertureSeance";
import ExerciseThumb from "@/components/seance/ExerciseThumb";
import FlammeSerie from "@/components/serie/FlammeSerie";
import { nombreFr } from "@/lib/saisieSerie";
import { quandRelatif, type FaitMarquant, type Gain } from "@/lib/recapSeance";
export { gainDuFait } from "@/lib/recapSeance";
import { progressionRang, type Rang } from "@/lib/aura";
import { texteRecord, dateRecord, ecartRecord, type RecordMouvement, type Marche, type Perf } from "@/lib/records";
import { palierFlamme } from "@/lib/flammesSerie";

const ENCRE = { t1: "#F4F1FB", t2: "#A79FC0", doux: "#CFC7E6", lav: "#C9B8FF", rose: "#F0ABFC", exp: "#C3AEFF" };
const FILET = "1px solid rgba(244,241,251,0.10)";

/* ── 1 · La couverture : le mot de la séance, le Guide devant ── */
const CONFETTIS = [
  { x: 9, c: "#F5B120", d: 0.15 }, { x: 21, c: "#8B5CF6", d: 0.35, rond: true },
  { x: 33, c: "#F0ABFC", d: 0.05 }, { x: 50, c: "#C13BC1", d: 0.45 },
  { x: 64, c: "#F5B120", d: 0.25, rond: true }, { x: 76, c: "#F0ABFC", d: 0.55 },
  { x: 89, c: "#8B5CF6", d: 0.1 },
];

export function CouvertureFin({ titre, guide, fete }: { titre: string; guide: ReactNode | null; fete: boolean }) {
  const reduit = useReducedMotion();
  const mot = motCouverture(titre || "Séance").toUpperCase();
  const { boite, mesure, taille } = useMotAjuste(mot, 132);
  return (
    <div className="relative w-full" style={{ height: guide ? 320 : 170 }}>
      <div aria-hidden="true" className="pointer-events-none absolute" style={{ left: "-20%", right: "-20%", top: -80, height: 420, background: "radial-gradient(closest-side, rgba(139,92,246,0.40), rgba(139,92,246,0))" }} />
      <div aria-hidden="true" className="pointer-events-none absolute" style={{ left: "10%", right: "10%", top: 120, height: 280, background: "radial-gradient(closest-side, rgba(193,59,193,0.24), rgba(193,59,193,0))" }} />

      {/* Les confettis : les seuls jours de record, une seule chute. */}
      {fete && !reduit && CONFETTIS.map((p, i) => (
        <motion.span key={i} aria-hidden="true" className="pointer-events-none absolute"
          style={{ left: `${p.x}%`, top: 0, width: p.rond ? 6 : 7, height: p.rond ? 6 : 12, borderRadius: p.rond ? "50%" : 2, background: p.c }}
          initial={{ y: -40, rotate: 0, opacity: 0 }}
          animate={{ y: 420, rotate: 320, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.6, delay: p.d, ease: [0.2, 0.7, 0.3, 1] }} />
      ))}

      {/* Le sceau, en violet → rose comme le reste de l'écran. */}
      <p className="relative flex items-center justify-center gap-2 text-[13px] font-bold" style={{ color: ENCRE.lav }}>
        <span aria-hidden="true" className="inline-flex items-center justify-center" style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}>
          <svg width="11" height="11" viewBox="0 0 11 11"><path d="M2 5.8l2.3 2.2L9 3" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        Séance faite
      </p>

      {/* Le mot se mesure et remplit la largeur, comme sur les affiches du profil. */}
      <div ref={boite} aria-hidden="true" className="absolute overflow-hidden text-center" style={{ left: 0, right: 0, top: 34 }}>
        <span ref={mesure} className="pointer-events-none invisible absolute left-0 top-0" style={{ ...STYLE_MOT, fontSize: 100 }}>{mot}</span>
        <span className="block" style={{ ...STYLE_MOT, lineHeight: 1, fontSize: taille || 1, color: ENCRE.t1, opacity: taille ? 1 : 0 }}>{mot}</span>
      </div>

      {guide && (
        <motion.div className="absolute left-1/2" style={{ top: 66, x: "-50%" }}
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          {guide}
        </motion.div>
      )}
    </div>
  );
}

/* ── 2 · Le titre et la phrase du Guide ── */
export function TitreFin({ titre, phrase, nom }: { titre: string; phrase: string; nom: string | null }) {
  return (
    <motion.div className="relative w-full px-4 text-center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
      <h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.1, fontWeight: 900, fontVariationSettings: "var(--w-voix)", color: ENCRE.t1 }}>{titre}</h2>
      <p className="mt-1.5 text-[16px] leading-snug" style={{ color: ENCRE.doux }}>
        {phrase}{nom && <span style={{ color: ENCRE.t2 }}> {nom}</span>}
      </p>
    </motion.div>
  );
}

/* ── 3 · Les trois chiffres ── */
export function ChiffresFin({ items }: { items: { v: number; l: string }[] }) {
  return (
    <motion.div className="relative grid w-full mt-5 text-center" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
      {items.map((it, i) => (
        <div key={it.l} className="py-1" style={i ? { borderLeft: FILET } : undefined}>
          <span className="vy-nombre block leading-none" style={{ fontSize: 34, fontWeight: 800, color: ENCRE.t1 }}>{it.v}</span>
          <span className="block mt-1.5 text-[13px]" style={{ color: ENCRE.t2 }}>{it.l}</span>
        </div>
      ))}
    </motion.div>
  );
}

/* ── 4 · Ce qui a changé, en violet → rose ── */
export function CarteProgres({ fait, gain }: { fait: FaitMarquant; gain: Gain }) {
  const quand = quandRelatif(fait.termineLe, new Date());
  const avant = fait.genre === "charge" ? `${nombreFr(fait.avant)} kg` : `${fait.avant}`;
  const apres = fait.genre === "charge" ? `${nombreFr(fait.charge)} kg` : `${fait.reps}`;
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
      className="relative w-full mt-5 overflow-hidden text-left"
      style={{ borderRadius: "var(--r-affiche)", background: "linear-gradient(160deg, #3B1C70 0%, #4C1553 58%, #2A0F33 100%)", border: "1px solid rgba(240,171,252,0.38)" }}>
      <div className="flex items-baseline justify-between px-5 pt-4">
        <span className="text-[13px] font-bold" style={{ color: ENCRE.rose }}>Ce qui a changé</span>
        <span className="text-[13px]" style={{ color: "#DCC4F2" }}>{quand}</span>
      </div>
      <div className="flex items-end gap-1.5 px-5 pt-1.5">
        <div className="flex-1 min-w-0">
          <p className="text-[20px] font-extrabold leading-tight" style={{ color: ENCRE.t1, fontVariationSettings: "var(--w-voix)" }}>{fait.nom}</p>
          <p className="mt-3 leading-none">
            <span className="vy-nombre" style={{ fontSize: 58, fontWeight: 800, color: ENCRE.rose }}>{gain.valeur}</span>
            <span className="text-[20px] font-extrabold" style={{ color: ENCRE.rose }}> {gain.unite}</span>
          </p>
          <p className="mt-2 text-[13px]" style={{ color: "#EBDDF7" }}>{gain.libelle}</p>
        </div>
        <span className="flex-shrink-0"><ExerciseThumb name={fait.nom} size={92} /></span>
      </div>
      <div className="flex items-center gap-2.5 mx-5 mt-4 mb-5">
        <div className="flex-1">
          <p className="text-[11px]" style={{ color: "#DCC4F2" }}>Avant</p>
          <p className="vy-nombre text-[20px]" style={{ color: "#DCC4F2", fontWeight: 700 }}>{avant}</p>
        </div>
        <svg width="76" height="20" viewBox="0 0 84 20" aria-hidden="true"><path d="M2 10h74" stroke={ENCRE.rose} strokeWidth="2" strokeDasharray="3 5" strokeLinecap="round" /><path d="M72 4l7 6-7 6" fill="none" stroke={ENCRE.rose} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <div className="flex-1 text-right">
          <p className="text-[11px]" style={{ color: ENCRE.rose }}>Aujourd’hui</p>
          <p className="vy-nombre text-[20px]" style={{ color: ENCRE.t1, fontWeight: 800 }}>{apres}</p>
        </div>
      </div>
    </motion.section>
  );
}

/* ── 4 bis · Un nouveau record : la seule carte qui brille, parce que
   c'est la seule nouvelle. Elle prend la place de « Ce qui a changé » :
   un seul fait marquant à la fois. ── */
export function CarteRecord({ record, avant, apres }: { record: RecordMouvement; avant: Marche; apres: Perf }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
      className="w-full mt-5 text-left" style={{ borderRadius: 20, padding: 1.5, background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}>
      <div className="flex items-center gap-3.5 px-4 py-3.5" style={{ borderRadius: 19, background: "#18122A" }}>
        <span className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M12 2l2.6 6.6L21 9.3l-5 4.4 1.6 6.8L12 17l-5.6 3.5L8 13.7 3 9.3l6.4-.7z" /></svg>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[13px] font-semibold" style={{ color: ENCRE.rose }}>Nouveau record</span>
          <span className="text-[16px] font-semibold" style={{ color: ENCRE.t1 }}>{record.nom}, {texteRecord(record.mesure, apres)}</span>
          <span className="text-[13px]" style={{ color: ENCRE.t2 }}>Ton record d’avant : {texteRecord(record.mesure, avant)}, le {dateRecord(avant.quand)}.</span>
        </span>
        <b className="vy-nombre flex-shrink-0" style={{ fontSize: 26, fontWeight: 800, color: ENCRE.t1 }}>{ecartRecord(record.mesure, avant, apres)}</b>
      </div>
    </motion.section>
  );
}

/* ── 5 · La série et le rang, un seul groupe à filet ── */
export function SerieEtRang({ serie, exp }: { serie: number | null; exp: number | null }) {
  const p = exp !== null ? progressionRang(exp) : null;
  if (serie === null && !p) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
      className="relative w-full mt-4 text-left"
      style={{ borderRadius: "var(--r-bloc)", background: "rgba(244,241,251,0.05)", border: "1px solid rgba(244,241,251,0.09)" }}>
      {serie !== null && (
        <div className="flex items-center gap-3 px-3.5 py-3">
          <FlammeSerie jours={serie} taille={30} />
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-bold" style={{ color: ENCRE.t1 }}>
              <span className="vy-nombre" style={{ fontWeight: 800, color: "#F5B120" }}>{serie}</span> jour{serie > 1 ? "s" : ""} d’affilée
            </p>
            <p className="text-[13px] mt-0.5" style={{ color: ENCRE.t2 }}>{palierFlamme(serie).nom} · journée validée</p>
          </div>
        </div>
      )}
      {p && <LigneRang rang={p.rang} suivant={p.suivant} part={p.part} restant={p.restant} haut={serie !== null} />}
    </motion.div>
  );
}

function LigneRang({ rang, suivant, part, restant, haut }: { rang: Rang; suivant: Rang | null; part: number; restant: number; haut: boolean }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3" style={haut ? { borderTop: "1px solid rgba(244,241,251,0.08)" } : undefined}>
      {rang.image
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={rang.image} alt="" aria-hidden="true" style={{ width: 32, height: 32, objectFit: "contain" }} />
        : <i aria-hidden="true" className="block" style={{ width: 16, height: 16, borderRadius: 4, transform: "rotate(45deg)", background: `linear-gradient(135deg, ${rang.neon[0]}, ${rang.neon[1]})` }} />}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-2 text-[13px]">
          <span className="font-bold" style={{ color: ENCRE.t1 }}>{rang.nom}</span>
          {suivant && <span style={{ color: ENCRE.t2 }}>plus que <span className="vy-nombre" style={{ color: ENCRE.t1, fontWeight: 700 }}>{restant}</span> avant {suivant.nom}</span>}
        </div>
        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(244,241,251,0.1)" }}>
          <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #8B5CF6, #C13BC1)" }}
            initial={{ width: `${Math.max(0, part * 100 - 12)}%` }} animate={{ width: `${part * 100}%` }}
            transition={{ duration: 1.4, delay: 0.9, ease: [0.2, 0.8, 0.2, 1] }} />
        </div>
      </div>
    </div>
  );
}

/* ── 6 · Le petit coin des avis (Louis : « c'est important ») ──
   Un coin, pas une carte : il ne passe jamais devant la séance. */
export function CoinAvis({ onAvis, onPlusTard }: { onAvis: () => void; onPlusTard: () => void }) {
  return (
    <div className="flex items-center gap-3 w-full mt-4 px-3.5 py-3 text-left"
      style={{ borderRadius: "var(--r-bloc)", background: "rgba(139,92,246,0.10)", border: "1px solid rgba(201,184,255,0.22)" }}>
      <span aria-hidden="true" className="flex flex-shrink-0 gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <svg key={i} width="13" height="13" viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" fill="#F5B120" /></svg>
        ))}
      </span>
      <button type="button" onClick={onAvis} className="flex-1 min-w-0 text-left cursor-pointer">
        <span className="block text-[13px] font-bold" style={{ color: ENCRE.t1 }}>Ton avis sur Vaiiya</span>
        <span className="block text-[11px] mt-0.5" style={{ color: ENCRE.t2 }}>Il nous aide à rendre l’app meilleure</span>
      </button>
      <button type="button" onClick={onPlusTard} className="flex-shrink-0 text-[13px] cursor-pointer px-1 min-h-[44px]" style={{ color: ENCRE.t2 }}>
        Plus tard
      </button>
    </div>
  );
}

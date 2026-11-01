"use client";

/* ════════════════════════════════════════════════════════════════════
   LES CLASSIQUES, LA PAGE DU CATALOGUE (maquette « Le chrono et le
   score », version 3, « Catalogue › Les classiques » ; GO de Louis le
   2026-11-01).

   La photo et le titre en tête, puis « Un classique, c'est quoi ? », qui
   rouvre la feuille de la première fois, les cinq façons de compter
   (chacune rouvre la feuille de son format, c'est là qu'elle « se relit
   depuis Les classiques »), Le Décompte en grand, les autres classiques,
   et les quatre futurs Vaiiya+.

   L'écran ne décide rien : lancer, ouvrir un aperçu Vaiiya+, revenir et
   fermer viennent du catalogue. Ton meilleur se lit dans `lireScores`, et
   une lecture ratée n'en montre aucun (jamais un faux).

   ⚠️ Les chiffres des cinq façons de compter sont des EXEMPLES de forme
   (« 11:42 », « 6 + 11 »), ceux de la maquette validée ; ton meilleur ne
   s'écrit que sous « Ton meilleur ».
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Photo } from "@/components/entrainement/PhotoSeance";
import { PucePlus } from "@/components/catalogue/CartesSeance";
import { VisageGuide } from "@/components/AssistantMark";
import { FeuillePremiereFois, PageRegle, noterFeuilleVue } from "@/components/seance/classique/ExplicationsClassique";
import { useGuideActif } from "@/context/GuideContext";
import { lireScores } from "@/lib/scoresClassiques";
import { photosDeRangee } from "@/lib/workoutArt";
import { VENTE_OUVERTE } from "@/lib/plans";
import {
  CLASSIQUES, FACON, bilanDe, feuillePremiereFois, scoreCourt, typo,
  type Classique, type ScoreDate, type SorteScore,
} from "@/lib/classiques";

const NB = String.fromCharCode(160);
/** Une espace insécable entre un nombre et le mot qui le suit (« 12 minutes »). */
const insec = (s: string) => typo(s).replace(/(\d) (?=\p{L})/gu, `$1${NB}`);
const maj = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** La forme d'un score, en exemple, et son pictogramme. */
const FACONS: { sorte: SorteScore; exemple: string; icone: ReactNode }[] = [
  { sorte: "temps", exemple: "11:42", icone: <><circle cx="12" cy="14" r="7" /><path d="M12 14v-3.5M9.5 2.5h5M18.5 7.5l1.5-1.5" /></> },
  { sorte: "tours", exemple: `6${NB}+${NB}11`, icone: <><path d="M17 2l3 3-3 3" /><path d="M4 11V9a4 4 0 0 1 4-4h12" /><path d="M7 22l-3-3 3-3" /><path d="M20 13v2a4 4 0 0 1-4 4H4" /></> },
  { sorte: "reps", exemple: "64", icone: <path d="M5 4v16M10 4v16M15 4v16M3 15l16-6" /> },
  { sorte: "tenue", exemple: "2:05", icone: <path d="M6 3h12M6 21h12M7 3c0 4.5 4 6 5 9-1 3-5 4.5-5 9M17 3c0 4.5-4 6-5 9 1 3 5 4.5 5 9" /> },
  { sorte: "minute", exemple: "12", icone: <><path d="M4 20h16" /><path d="M6 16v-3M10 16V9M14 16V6M18 16V3" /></> },
];

/* Le voile des photos : sombre en haut pour les boutons, sombre en bas
   pour le texte, quel que soit le thème. */
const VOILE_HAUT = "linear-gradient(180deg, rgba(14,10,24,0.38) 0%, rgba(14,10,24,0) 24%, rgba(14,10,24,0) 40%, rgba(14,10,24,0.6) 70%, rgba(14,10,24,0.9) 100%)";
const VOILE_BAS = "linear-gradient(180deg, rgba(14,10,24,0) 35%, rgba(14,10,24,0.6) 68%, rgba(14,10,24,0.9) 100%)";
const VERRE: React.CSSProperties = {
  background: "rgba(255,255,255,0.20)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "none",
};
const GROUPE: React.CSSProperties = {
  borderRadius: "var(--r-bloc)", background: "rgb(var(--surface-rgb))",
  border: "1px solid rgba(var(--accent-rgb),0.1)", boxShadow: "var(--ombre-pose)",
};

export type SeanceClassique = {
  id: string; title: string; duration: number; difficulty: string;
  category?: string; muscles?: string[]; access?: "free" | "premium"; bientotPlus?: boolean;
};

export default function LesClassiques<S extends SeanceClassique>({
  seances, tag, userId, canAccessPremium, libelleRetour, onStart, onPremium, onRetour, onFermer,
}: {
  /** Les séances de la collection « Les classiques ». */
  seances: S[];
  tag: string;
  userId: string | null;
  canAccessPremium: boolean;
  libelleRetour: string;
  onStart: (s: S) => void;
  onPremium: (s: S) => void;
  onRetour: () => void;
  onFermer: () => void;
}) {
  const { guide } = useGuideActif();
  const [scores, setScores] = useState<{ pour: string; data: ScoreDate[] | null } | null>(null);
  useEffect(() => {
    if (!userId) return;
    let vivant = true;
    void lireScores(userId).then((data) => { if (vivant) setScores({ pour: userId, data }); });
    return () => { vivant = false; };
  }, [userId]);

  const lignes = useMemo(() => CLASSIQUES.flatMap((c) => {
    const s = seances.find((x) => x.id === c.id);
    return s ? [{ c, s }] : [];
  }), [seances]);
  const photos = useMemo(() => photosDeRangee(lignes.map(({ s }) => ({ id: s.id, title: s.title, category: s.category, muscles: s.muscles }))), [lignes]);
  const meilleurs = useMemo(() => {
    const data = scores && scores.pour === userId ? scores.data : null;
    const m = new Map<string, ScoreDate>();
    for (const { c } of lignes) {
      const b = bilanDe((data ?? []).filter((x) => x.classique === c.id)).meilleur;
      if (b) m.set(c.id, b);
    }
    return m;
  }, [scores, userId, lignes]);

  const une = lignes.find(({ c }) => c.id === "decompte") ?? lignes[0];
  const autres = lignes.filter((l) => l !== une && l.c.ouvert);
  const futurs = lignes.filter((l) => !l.c.ouvert);

  const ouvrir = (s: S) => (s.access === "premium" && !canAccessPremium ? onPremium(s) : onStart(s));

  /* La feuille de la première fois, relue ici, puis la règle complète. */
  const [feuille, setFeuille] = useState<{ c: Classique; ouverte: boolean }>({ c: CLASSIQUES[0], ouverte: false });
  const [regle, setRegle] = useState<{ c: Classique; ouverte: boolean }>({ c: CLASSIQUES[0], ouverte: false });
  const relire = (c: Classique) => setFeuille({ c, ouverte: true });
  /* Lue ici, elle ne s'ouvrira plus d'elle-même : c'est une seule fois. */
  const fermerFeuille = () => { noterFeuilleVue(userId, feuille.c.format); setFeuille((f) => ({ ...f, ouverte: false })); };
  const deSorte = (sorte: SorteScore) => CLASSIQUES.filter((c) => c.sorte === sorte && c.ouvert);

  return (
    <>
      {/* ── La tête : la photo, le titre et la promesse ── */}
      <div className="relative -mx-5" style={{ height: 300 }}>
        <Photo img="cat-defis" pos="50% 35%" prioritaire style={{ position: "absolute", inset: 0 }} />
        <div aria-hidden className="absolute inset-0" style={{ background: VOILE_HAUT }} />
        <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={onRetour} aria-label={libelleRetour}
          className="absolute top-4 left-4 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer" style={VERRE}>
          <ChevronLeft size={20} strokeWidth={2.2} color="#FFFFFF" aria-hidden />
        </motion.button>
        <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={onFermer} aria-label="Fermer"
          className="absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer" style={VERRE}>
          <X size={18} strokeWidth={2.2} color="#FFFFFF" aria-hidden />
        </motion.button>
        <div className="absolute left-5 right-5 bottom-5">
          <p className="text-[13px] font-bold" style={{ color: "rgba(255,255,255,0.82)" }}>
            Dans le catalogue · {lignes.length}{NB}classiques
          </p>
          <h2 className="mt-1.5 text-[34px] leading-none text-white" style={{ fontWeight: 900, fontVariationSettings: "var(--w-voix)" }}>
            Les classiques
          </h2>
          <p className="mt-2 text-[16px] leading-[22px]" style={{ color: "rgba(255,255,255,0.92)" }}>{typo(tag)}</p>
        </div>
      </div>

      {/* ── Un classique, c'est quoi ? La feuille de la première fois, relue ── */}
      <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => relire(une?.c ?? CLASSIQUES[0])}
        aria-label={typo("Un classique, c'est quoi ?")}
        className="w-full mt-4 flex items-center gap-3 px-3.5 text-left cursor-pointer" style={{ ...GROUPE, height: 56, boxShadow: "none" }}>
        <VisageGuide guide={guide} etat="explain" size={32} />
        <span className="flex-1 min-w-0 text-[16px] font-bold" style={{ color: "var(--text-0)" }}>{typo("Un classique, c'est quoi ?")}</span>
        <ChevronRight size={18} strokeWidth={2.2} style={{ color: "var(--exp-encre)" }} aria-hidden />
      </motion.button>

      {/* ── Cinq façons de compter : chacune rouvre la feuille de son format ── */}
      <h3 className="vy-sous mt-6" style={{ color: "var(--text-0)" }}>Cinq façons de compter</h3>
      <div className="flex gap-2.5 overflow-x-auto -mr-5 pr-5 mt-3 pb-1" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
        {FACONS.map(({ sorte, exemple, icone }) => {
          const ceux = deSorte(sorte);
          const exemplaire = ceux[0] ?? CLASSIQUES.find((c) => c.sorte === sorte);
          if (!exemplaire) return null;
          return (
            <motion.button type="button" key={sorte} whileTap={{ scale: 0.96 }} onClick={() => relire(exemplaire)}
              aria-label={`${maj(FACON[sorte])}. Relire : ${typo(feuillePremiereFois(exemplaire).question)}`}
              className="flex-shrink-0 text-left cursor-pointer p-3" style={{ ...GROUPE, width: 124, minHeight: 126 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "var(--feu-encre)" }}>
                {icone}
              </svg>
              <span className="vy-nombre block mt-1.5 text-[26px] leading-none" style={{ color: "var(--text-0)", fontWeight: 800 }}>{exemple}</span>
              <span className="block mt-1 text-[13px] leading-4 font-bold" style={{ color: "var(--text-0)" }}>{maj(FACON[sorte])}</span>
              <span className="block mt-0.5 text-[11px] leading-[14px]" style={{ color: "var(--text-2)" }}>
                {insec(ceux.slice(0, 2).map((c) => c.titre).join(", "))}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* ── Le Décompte, en grand ── */}
      {une && (
        <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => ouvrir(une.s)} aria-label={`Ouvrir : ${une.c.titre}`}
          className="relative block w-full mt-6 overflow-hidden text-left p-0 border-none cursor-pointer"
          style={{ height: 230, borderRadius: "var(--r-affiche)", background: "#1A1424", boxShadow: "var(--ombre-flottant)" }}>
          <Photo img={photos.get(une.s.id) ?? "cat-defis"} pos="50% 32%" style={{ position: "absolute", inset: 0 }} />
          <span aria-hidden className="absolute inset-0" style={{ background: VOILE_BAS }} />
          <span className="absolute left-[18px] right-[18px] bottom-4 flex items-end justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-[13px] font-bold" style={{ color: "rgba(255,255,255,0.82)" }}>
                {une.c.minutes}{NB}min · {FACON[une.c.sorte]} · {une.c.niveau}
              </span>
              <span className="block mt-1 text-[26px] leading-[1.05] text-white" style={{ fontWeight: 900, fontVariationSettings: "var(--w-voix)" }}>
                {une.c.titre}
              </span>
              <span className="block mt-1 text-[13px] leading-snug" style={{ color: "rgba(255,255,255,0.88)" }}>{insec(une.c.promesse)}</span>
            </span>
            {meilleurs.get(une.c.id) && (
              <span className="flex-shrink-0 text-right">
                <span className="block text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.78)" }}>Ton meilleur</span>
                <span className="vy-nombre block mt-0.5 text-[26px] leading-none text-white" style={{ fontWeight: 800 }}>
                  {scoreCourt(meilleurs.get(une.c.id)!)}
                </span>
              </span>
            )}
          </span>
        </motion.button>
      )}

      {/* ── Les autres classiques ── */}
      {autres.length > 0 && (
        <>
          <div className="mt-6 flex items-baseline gap-2">
            <h3 className="vy-sous" style={{ color: "var(--text-0)" }}>Les autres classiques</h3>
            <span className="vy-nombre text-[16px]" style={{ color: "var(--text-2)", fontWeight: 800 }}>{autres.length}</span>
          </div>
          <div className="mt-3 overflow-hidden" style={GROUPE}>
            {autres.map(({ c, s }, i) => (
              <LigneClassique key={c.id} c={c} img={photos.get(s.id) ?? "cat-defis"} premiere={i === 0}
                meilleur={meilleurs.get(c.id) ?? null} onOuvrir={() => ouvrir(s)} />
            ))}
          </div>
        </>
      )}

      {/* ── Les futurs Vaiiya+, ouverts tant que l'offre n'est pas en vente ── */}
      {futurs.length > 0 && (
        <>
          <div className="mt-6 flex items-baseline gap-2">
            <h3 className="vy-sous" style={{ color: "var(--text-0)" }}>{VENTE_OUVERTE ? "Avec Vaiiya+" : "Bientôt dans Vaiiya+"}</h3>
            <span className="vy-nombre text-[16px]" style={{ color: "var(--or-encre)", fontWeight: 800 }}>{futurs.length}</span>
          </div>
          {!VENTE_OUVERTE && (
            <p className="mt-1 text-[13px] leading-[18px]" style={{ color: "var(--text-2)" }}>
              Ouverts à tous pour l’instant. Ils passeront dans Vaiiya+ quand l’offre ouvrira.
            </p>
          )}
          <div className="mt-3 overflow-hidden" style={{ ...GROUPE, border: "1px solid rgba(245,177,32,0.45)" }}>
            {futurs.map(({ c, s }, i) => (
              <LigneClassique key={c.id} c={c} img={photos.get(s.id) ?? "cat-defis"} premiere={i === 0}
                meilleur={meilleurs.get(c.id) ?? null} puce={VENTE_OUVERTE ? "Vaiiya+" : "Bientôt Vaiiya+"} onOuvrir={() => ouvrir(s)} />
            ))}
          </div>
        </>
      )}

      <FeuillePremiereFois classique={feuille.c} guide={guide} ouverte={feuille.ouverte} onFermer={fermerFeuille}
        onRegle={() => { fermerFeuille(); setRegle({ c: feuille.c, ouverte: true }); }} />
      <PageRegle classique={regle.c} ouverte={regle.ouverte} onFermer={() => setRegle((r) => ({ ...r, ouverte: false }))}
        onLancer={() => {
          setRegle((r) => ({ ...r, ouverte: false }));
          const l = lignes.find(({ c }) => c.id === regle.c.id);
          if (l) ouvrir(l.s);
        }} />
    </>
  );
}

/** Une ligne de classique : la photo, le nom, la promesse, la durée, ce
 *  qu'on y compte, et ton meilleur s'il existe. */
function LigneClassique({ c, img, premiere, meilleur, puce, onOuvrir }: {
  c: Classique; img: string; premiere: boolean; meilleur: ScoreDate | null; puce?: string; onOuvrir: () => void;
}) {
  return (
    <button type="button" onClick={onOuvrir} aria-label={`Ouvrir : ${c.titre}`}
      className="w-full flex items-center gap-3 px-3.5 py-3 text-left cursor-pointer bg-transparent border-none"
      style={{ borderTop: premiere ? "none" : "1px solid rgba(var(--accent-rgb),0.1)" }}>
      <Photo img={img} pos="center 22%" style={{ width: 56, height: 56, borderRadius: 14, flexShrink: 0 }} />
      <span className="flex-1 min-w-0">
        <span className="block text-[16px] leading-5 font-bold" style={{ color: "var(--text-0)" }}>{c.titre}</span>
        <span className="block mt-0.5 text-[13px] leading-[18px]" style={{ color: "var(--text-2)" }}>{insec(c.promesse)}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-4 font-semibold" style={{ color: "var(--text-2)" }}>
          {puce && <PucePlus texte={puce} />}
          <span>
            {c.minutes}{NB}min · {FACON[c.sorte]}
            {meilleur && (
              <> · <span style={{ color: "var(--exp-encre)" }}>ton meilleur <span className="vy-nombre text-[13px]" style={{ fontWeight: 800 }}>{scoreCourt(meilleur)}</span></span></>
            )}
          </span>
        </span>
      </span>
      <ChevronRight size={16} strokeWidth={2.2} className="flex-shrink-0" style={{ color: "var(--text-3)" }} aria-hidden />
    </button>
  );
}

"use client";

/* ════════════════════════════════════════════════════════════════════
   LA FICHE D'UN CLASSIQUE (maquette « Le chrono et le score », version 3).

   Louis, 2026-10-31 : ton meilleur « doit être mis plus en valeur ! On en
   est fier et on a en même temps envie d'en découdre ». Il est donc le
   héros de la fiche : « Ton meilleur », en très grand, « À battre », et
   le Guide qui lance le défi. Puis « Comment ça marche » en trois lignes,
   la règle complète à un toucher, et les mouvements.

   ⚠️ La fiche ne lit rien : le tunnel lui donne l'historique lu à
   l'ouverture (`null` quand la base n'a pas répondu : on ne dit alors
   rien de ton meilleur, ni « premier essai »).
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { ChevronRight, X } from "lucide-react";
import { VisageGuide } from "@/components/AssistantMark";
import ExerciseThumb from "@/components/seance/ExerciseThumb";
import TexteAjuste from "@/components/seance/classique/TexteAjuste";
import { cheminDuGuide } from "@/lib/photosGuide";
import { voix, type GuideRef } from "@/lib/guides";
import {
  bilanDe, dateLongue, ecartProgres, feuillePremiereFois, meta, mouvements, scoreCourt, scoreLong, surtitre,
  tempsCourt, titreMouvements, typo,
  type Classique, type ScoreDate,
} from "@/lib/classiques";

const NUIT = "#1D1530";

/** « 35 s plus vite », « 3 répétitions de plus », « 12 s de plus ». */
function texteProgres(c: Classique, p: { valeur: string; unite: string }): string {
  const v = p.valeur.replace(/^\+/, "");
  if (c.sorte === "temps") return `${v} plus vite`;
  if (c.sorte === "tenue") return `${v} de plus`;
  return `${v} ${p.unite} de plus`;
}
const DEGRADE = "linear-gradient(100deg,#8B5CF6,#C13BC1)";
const MOT: React.CSSProperties = { fontWeight: 900, fontVariationSettings: "var(--w-voix)" };

export default function FicheClassique({ classique: c, heroImage, guide, historique, onLancer, onProgrammer, onRegle, onMouvement, onFermer }: {
  classique: Classique;
  heroImage?: string | null;
  guide: GuideRef;
  historique: ScoreDate[] | null;
  onLancer: () => void;
  onProgrammer?: () => void;
  onRegle: () => void;
  onMouvement: (nom: string) => void;
  onFermer: () => void;
}) {
  const bilan = historique ? bilanDe(historique) : null;
  const meilleur = bilan?.meilleur ?? null;
  const premier = bilan?.premier ?? null;
  const progres = meilleur && premier && meilleur !== premier ? ecartProgres(c, premier, meilleur) : null;
  const phrase = meilleur
    ? voix(guide, c.sorte === "temps" ? "classique.fiche.temps" : "classique.fiche.plus", { meilleur: c.sorte === "temps" ? tempsCourt(meilleur.valeur) : scoreLong(c, meilleur) })
    : bilan ? voix(guide, "classique.fiche.premier") : null;
  const ms = mouvements(c);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -12 }} className="flex flex-col">
      {/* ── Le héros : la photo, le nom, ton meilleur ── */}
      <div className="relative" style={{ background: NUIT }}>
        <div className="absolute inset-x-0 top-0" style={{ height: 300 }}>
          {heroImage
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={cheminDuGuide(heroImage, guide)} alt="" className="w-full h-full object-cover" style={{ objectPosition: "50% 30%" }} />
            : <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)" }} />}
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(29,21,48,0.15) 0%, rgba(29,21,48,0.55) 45%, ${NUIT} 100%)` }} />
        </div>
        <button type="button" onClick={onFermer} aria-label="Fermer"
          className="absolute top-3.5 right-3.5 z-10 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer text-white"
          style={{ background: "rgba(255,255,255,0.16)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.22)" }}>
          <X size={18} strokeWidth={2.2} />
        </button>

        <div className="relative px-5 pb-6" style={{ paddingTop: 170 }}>
          <p className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.72)" }}>{surtitre(c)}</p>
          <h2 className="uppercase leading-[0.9] mt-2 text-white" style={{ ...MOT, fontVariationSettings: "'wdth' 125", fontSize: "clamp(44px, 14vw, 62px)", letterSpacing: "-0.02em" }}>
            {c.lignes.map((l, i) => <span key={i} className="block">{l}</span>)}
          </h2>
          <p className="text-[16px] mt-3 leading-snug" style={{ color: "rgba(255,255,255,0.9)" }}>{typo(c.promesse)}</p>
          <p className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>{meta(c)}</p>

          <div className="mt-5 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.14)" }}>
            {meilleur ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[20px] font-bold" style={{ color: "#C3AEFF" }}>Ton meilleur</p>
                  <span className="text-[13px] font-bold px-3 py-1 rounded-full" style={{ background: "linear-gradient(100deg,#F5B120,#FF7A1A)", color: "#3A1A03" }}>À battre</span>
                </div>
                <div className="mt-1">
                  <TexteAjuste plafond={116} texte={scoreCourt(meilleur)}
                    style={{ fontWeight: 900, fontVariationSettings: "'wdth' 112", letterSpacing: "-0.03em", lineHeight: 0.95, background: "linear-gradient(120deg,#C3AEFF,#F0ABFC)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }} />
                </div>
                {c.sorte === "tours" && <p className="text-[13px] -mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>tours + répétitions</p>}
                <p className="text-[16px] mt-2 leading-snug" style={{ color: "rgba(255,255,255,0.82)" }}>
                  Posé le {dateLongue(meilleur.quand)}
                  {progres
                    ? <>, <b className="text-white">{texteProgres(c, progres)}</b> que ta première fois.</>
                    : bilan && bilan.essais.length === 1 ? ", ta première fois." : "."}
                </p>
              </>
            ) : bilan ? (
              <>
                <p className="text-[20px] font-bold" style={{ color: "#C3AEFF" }}>{feuillePremiereFois(c).repere ?? "Ton premier score sera ton repère"}</p>
                <p className="text-[16px] mt-1.5 leading-snug" style={{ color: "rgba(255,255,255,0.82)" }}>
                  {typo("Le chiffre de ta première fois est gardé dans ton profil. La prochaine fois, tu essaies de le battre.")}
                </p>
              </>
            ) : null}

            {phrase && guide && (
              <div className="flex items-end gap-3 mt-5">
                <span className="flex-shrink-0 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.12)" }}>
                  <VisageGuide guide={guide} etat="encourage" size={44} />
                </span>
                <p className="text-[16px] leading-snug rounded-[18px] px-4 py-3" style={{ background: "rgba(255,255,255,0.10)", color: "#FFFFFF", borderBottomLeftRadius: 6 }}>
                  {typo(phrase)}
                </p>
              </div>
            )}

            <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={onLancer}
              className="w-full mt-5 flex items-center justify-center text-white font-bold text-[20px] cursor-pointer"
              style={{ height: 58, borderRadius: 22, background: DEGRADE, boxShadow: "0 10px 30px -6px rgba(193,59,193,0.55)" }}>
              {meilleur ? "Battre mon meilleur" : "C’est parti"}
            </motion.button>
            {onProgrammer && (
              <button type="button" onClick={onProgrammer} className="w-full mt-1 min-h-[44px] text-[16px] font-semibold cursor-pointer" style={{ color: "rgba(255,255,255,0.78)" }}>
                Le programmer un autre jour
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Comment ça marche ── */}
      <div className="px-4 pt-6 pb-4" style={{ background: "var(--bg-0, #F7F5FC)" }}>
        <h3 className="text-[26px] px-1" style={{ ...MOT, color: "var(--text-0)" }}>Comment ça marche</h3>
        <div className="mt-3 rounded-[var(--r-bloc)] overflow-hidden" style={{ background: "rgb(var(--surface-rgb))", border: "1px solid rgba(var(--accent-rgb),0.10)" }}>
          {c.comment.map((l, i) => (
            <div key={i} className="flex gap-3.5 px-4 py-4" style={i ? { borderTop: "1px solid rgba(var(--accent-rgb),0.10)" } : undefined}>
              <span className="vy-nombre flex-shrink-0 flex items-center justify-center rounded-full text-[16px]"
                style={{ width: 32, height: 32, background: "rgba(139,92,246,0.10)", color: "var(--exp-encre)", fontWeight: 800 }}>{i + 1}</span>
              <div className="min-w-0 pt-1">
                <p className="text-[16px] leading-snug" style={{ color: "var(--text-1)" }}>
                  {typo(l.texte)}{l.gras && <> <b style={{ color: "var(--text-0)" }}>{typo(l.gras)}</b></>}
                </p>
                {l.escalier && (
                  <div className="flex items-end gap-1 mt-2.5" style={{ height: 34 }} aria-hidden="true">
                    {l.escalier.map((n, k) => (
                      <span key={k} className="flex-1 rounded-[5px]" style={{ height: 8 + (26 * n) / Math.max(...l.escalier!), background: "#FFD9B8" }} />
                    ))}
                  </div>
                )}
                {l.note && <p className="text-[13px] mt-1.5" style={{ color: "var(--text-2)" }}>{typo(l.note)}</p>}
              </div>
            </div>
          ))}
          <button type="button" onClick={onRegle}
            className="w-full flex items-center justify-between px-4 py-4 text-[16px] font-bold cursor-pointer"
            style={{ borderTop: "1px solid rgba(var(--accent-rgb),0.10)", color: "var(--exp-encre)" }}>
            La règle complète <ChevronRight size={18} strokeWidth={2.4} />
          </button>
        </div>

        {/* ── Les mouvements ── */}
        <h3 className="text-[26px] px-1 mt-7" style={{ ...MOT, color: "var(--text-0)" }}>{titreMouvements(ms.length)}</h3>
        <div className="grid gap-2.5 mt-3" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          {ms.map((m) => (
            <button key={m.exercice} type="button" onClick={() => onMouvement(m.exercice)}
              className="flex items-center gap-2.5 rounded-[var(--r-bloc)] p-2 text-left cursor-pointer"
              style={{ background: "rgb(var(--surface-rgb))", border: "1px solid rgba(var(--accent-rgb),0.10)" }}>
              <span className="flex-shrink-0 rounded-[14px] overflow-hidden flex items-center justify-center" style={{ width: 56, height: 56, background: "rgba(139,92,246,0.07)" }}>
                <ExerciseThumb name={m.exercice} size={54} />
              </span>
              <span className="min-w-0">
                <b className="block text-[16px] font-bold truncate" style={{ color: "var(--text-0)" }}>{m.nom}</b>
                <span className="block text-[13px]" style={{ color: "var(--text-2)" }}>{m.detail}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

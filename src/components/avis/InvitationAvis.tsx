"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useGuideActif } from "@/context/GuideContext";
import { CelebrationGuide, VisageGuide } from "@/components/AssistantMark";
import { STYLE_MOT, useMotAjuste } from "@/components/profil/CouvertureSeance";
import { PRENOM_GUIDE, voix } from "@/lib/guides";
import { monAvis, poserAvis } from "@/lib/avis";
import { lockBodyModal } from "@/lib/bodyModal";
import {
  EVENEMENT_PROPOSER_AVIS,
  LIEN_AVIS,
  marquerAvis,
  peutProposerAvis,
  type SceneAvis,
} from "@/lib/invitationAvis";

/**
 * L'invitation à donner son avis, en trois temps (maquette « Demander un
 * avis », version 1 validée par Louis le 2026-10-17) :
 *   1. la question, sur l'écran du moment (le mot de la séance en grand, dans
 *      le dégradé de la marque) ;
 *   2. une étoile touchée : un mot, si on veut (avis interne, modéré) ;
 *   3. merci, et Trustpilot proposé à TOUT LE MONDE, quelle que soit la note.
 *
 * Montée une fois dans le layout : le moment (3ᵉ séance, rang, relais) peut
 * survenir n'importe où. Une seule fois par personne, pour toujours (le flag se
 * pose à l'affichage). « Plus tard » ferme pour de bon. Aucune récompense, et
 * on ne demande jamais un « bon » avis (§14/§17).
 *
 * ⚠️ Toujours clair, couleurs en dur, comme la vitrine et l'écran de connexion :
 * c'est un moment de marque, pas une surface de l'app.
 */

const DEGRADE = "linear-gradient(90deg,#8B5CF6,#C13BC1)";
const ENCRE = "#1E1B2E";
const ENCRE_2 = "#4A4760";
const ENCRE_3 = "#6B6880";

type Etape = "question" | "ecrire" | "merci";

function Etoile({ pleine, taille }: { pleine: boolean; taille: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" aria-hidden="true"
      fill={pleine ? "#F5B120" : "none"} stroke={pleine ? "#F5B120" : "#C9C2E6"} strokeWidth={1.6} strokeLinejoin="round">
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
    </svg>
  );
}

function Etoiles({ note, taille, onPick }: { note: number; taille: number; onPick: (n: number) => void }) {
  return (
    <div className="flex justify-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onPick(n)} aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
          aria-pressed={n <= note}
          className="grid h-12 w-12 place-items-center bg-transparent active:scale-90 transition-transform">
          <Etoile pleine={n <= note} taille={taille} />
        </button>
      ))}
    </div>
  );
}

/** Le bouton violet qui se détache vraiment de la page : reflet en haut,
 *  ombre courte et nette, ombre large et douce. */
const BOUTON: React.CSSProperties = {
  background: DEGRADE,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 4px 10px rgba(139,92,246,.35), 0 18px 36px rgba(139,92,246,.35)",
  fontVariationSettings: "'wdth' 116",
};

function MotDuMoment({ mot }: { mot: string }) {
  const texte = mot.toUpperCase();
  const { boite, mesure, taille } = useMotAjuste(texte, 170);
  return (
    <div ref={boite} className="relative mt-3 flex w-full justify-center overflow-hidden">
      <span ref={mesure} aria-hidden="true" className="pointer-events-none absolute opacity-0"
        style={{ ...STYLE_MOT, fontSize: 100, paddingRight: "0.05em" }}>{texte}</span>
      <h1 className="m-0" style={{
        ...STYLE_MOT, fontSize: taille || 100, paddingRight: "0.05em", visibility: taille ? "visible" : "hidden",
        background: DEGRADE, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
      }}>{texte}</h1>
    </div>
  );
}

export default function InvitationAvis() {
  const { user } = useAuth();
  const { guide } = useGuideActif();
  const reduce = useReducedMotion();
  const [scene, setScene] = useState<SceneAvis | null>(null);
  const [etape, setEtape] = useState<Etape>("question");
  const [note, setNote] = useState(0);
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [rate, setRate] = useState(false);

  const fermer = useCallback(() => setScene(null), []);

  useEffect(() => {
    const onProposer = (e: Event) => {
      const id = user?.id;
      const detail = (e as CustomEvent<SceneAvis>).detail;
      if (!id || !detail || !peutProposerAvis(id)) return;
      // Vue une fois, jamais reproposée, même si la personne s'en va sans répondre.
      marquerAvis(id, "vu");
      // Quelqu'un qui a déjà laissé un avis (sur /avis) n'a pas à être redemandé.
      void monAvis(id).then((deja) => {
        if (deja) return;
        // Le court délai laisse la scène précédente (célébration de rang) sortir.
        window.setTimeout(() => {
          setEtape("question"); setNote(0); setTexte(""); setRate(false);
          setScene(detail);
        }, 700);
      }).catch(() => {});
    };
    window.addEventListener(EVENEMENT_PROPOSER_AVIS, onProposer);
    return () => window.removeEventListener(EVENEMENT_PROPOSER_AVIS, onProposer);
  }, [user?.id]);

  useEffect(() => (scene ? lockBodyModal() : undefined), [scene]);

  const choisir = (n: number) => { setNote(n); setEtape("ecrire"); };

  const envoyer = async (avecTexte: boolean) => {
    const id = user?.id;
    if (!id || !note || envoi) return;
    setEnvoi(true); setRate(false);
    const ok = await poserAvis(id, note, avecTexte ? texte : "");
    setEnvoi(false);
    if (ok) setEtape("merci"); else setRate(true);
  };

  const trustpilot = () => {
    if (user?.id) marquerAvis(user.id, "fait");
    window.open(LIEN_AVIS, "_blank", "noopener,noreferrer");
    fermer();
  };

  // `scene` est toujours nul à l'hydratation : rien ne se rend au montage.
  if (typeof document === "undefined") return null;

  const question = scene?.pourquoi === "rang"
    ? voix(guide, "avis.question.rang", { rang: scene.mot })
    : voix(guide, scene?.pourquoi === "relais" ? "avis.question.relais" : "avis.question.seances");

  return createPortal(
    <AnimatePresence>
      {scene && (
        <motion.div
          key="avis"
          className="fixed inset-0 z-[125] flex justify-center"
          style={{ background: etape === "question" ? "#F7F5FC" : "rgba(18,14,34,.55)", fontFamily: "var(--font-sans)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          role="dialog" aria-modal="true" aria-label="Donner ton avis sur Vaiiya"
        >
          {etape === "question" ? (
            <div className="flex h-full w-full max-w-[430px] flex-col px-5"
              style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 28px)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)", color: ENCRE }}>
              <p className="m-0 text-center text-[13px]" style={{ color: ENCRE_3 }}>{scene.surtitre}</p>
              <MotDuMoment mot={scene.mot} />
              {scene.minutes != null && scene.series != null && (
                <p className="m-0 mt-3 text-center text-[16px]" style={{ color: ENCRE_2 }}>
                  <b className="vy-nombre" style={{ color: ENCRE, fontWeight: 700 }}>{scene.minutes}</b> min ·{" "}
                  <b className="vy-nombre" style={{ color: ENCRE, fontWeight: 700 }}>{scene.series}</b> série{scene.series > 1 ? "s" : ""}
                </p>
              )}

              <motion.div
                className="relative mt-auto rounded-[24px] px-[18px] pb-[18px]"
                style={{
                  border: "2px solid transparent",
                  background: "linear-gradient(#FFFFFF,#FFFFFF) padding-box, linear-gradient(135deg,#8B5CF6,#C13BC1) border-box",
                  boxShadow: "0 20px 44px rgba(109,75,214,.18)",
                }}
                initial={reduce ? false : { y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 24, stiffness: 260, delay: 0.1 }}
              >
                <div className={`${guide ? "-mt-[70px]" : "pt-5"} flex justify-center`}>
                  <CelebrationGuide guide={guide} hauteur={188} />
                </div>
                {guide && <p className="m-0 mt-0.5 text-center text-[11px] font-bold" style={{ color: "#6D4BD6" }}>{PRENOM_GUIDE[guide]}</p>}
                <h2 className="m-0 mt-1 text-center text-[20px] font-extrabold leading-tight" style={{ fontVariationSettings: "'wdth' 116" }}>{question}</h2>
                <p className="m-0 mt-1.5 text-center text-[13px]" style={{ color: ENCRE_2 }}>Ta note aide d’autres personnes à nous trouver.</p>
                <div className="mt-3.5"><Etoiles note={note} taille={36} onPick={choisir} /></div>
                <p className="m-0 mt-1.5 text-center text-[11px]" style={{ color: ENCRE_3 }}>Touche une étoile, c’est tout.</p>
                <button type="button" onClick={fermer} className="mt-2.5 h-11 w-full bg-transparent text-[13px] font-semibold" style={{ color: ENCRE_3 }}>Plus tard</button>
              </motion.div>

              <button type="button" onClick={fermer}
                className="mt-4 h-14 w-full rounded-[10px] text-[16px] font-extrabold text-white active:translate-y-0 -translate-y-0.5 transition-transform"
                style={BOUTON}>Continuer</button>
            </div>
          ) : (
            <motion.div
              key={etape}
              className="absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-[430px] flex-col rounded-t-[var(--r-feuille)] bg-white px-5 pt-2.5"
              style={{ minHeight: etape === "ecrire" ? "72%" : "62%", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)", color: ENCRE }}
              initial={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
            >
              <div className="mx-auto mb-3.5 h-1 w-10 rounded-full" style={{ background: "rgba(107,104,128,.3)" }} />
              {etape === "ecrire" ? (
                <>
                  <div className="flex items-center gap-3">
                    <VisageGuide guide={guide} etat="listen" size={44} />
                    <p className="m-0 text-[16px] leading-snug">{voix(guide, "avis.ecrire")}</p>
                  </div>
                  <div className="mt-4"><Etoiles note={note} taille={34} onPick={setNote} /></div>
                  <label className="mt-5 block">
                    <span className="block text-[13px] font-semibold" style={{ color: ENCRE_2 }}>Ton avis (facultatif)</span>
                    <textarea rows={4} maxLength={500} value={texte} onChange={(e) => setTexte(e.target.value)}
                      className="mt-1.5 w-full resize-none rounded-[14px] px-3.5 py-3 text-[16px] outline-none"
                      style={{ border: "1px solid rgba(45,55,72,.12)", background: "#FBFAFE", color: ENCRE }} />
                  </label>
                  <p className="m-0 mt-1.5 text-[11px]" style={{ color: ENCRE_3 }}>Il pourra apparaître sur vaiiya.fr avec ton pseudo, après relecture.</p>
                  {rate && <p className="m-0 mt-2 text-[13px] font-semibold" style={{ color: "#C0392B" }}>Ton avis n’est pas parti. Réessaie dans un instant.</p>}
                  <div className="mt-auto flex flex-col gap-1.5 pt-5">
                    <button type="button" disabled={envoi} onClick={() => envoyer(true)}
                      className="h-[52px] rounded-[10px] text-[16px] font-bold text-white disabled:opacity-70" style={BOUTON}>
                      {envoi ? "Envoi…" : "Envoyer"}
                    </button>
                    <button type="button" disabled={envoi} onClick={() => envoyer(false)}
                      className="h-11 bg-transparent text-[13px] font-semibold" style={{ color: ENCRE_3 }}>Juste la note, c’est bon</button>
                  </div>
                </>
              ) : (
                <>
                  <div className={`${guide ? "-mt-[90px]" : "pt-2"} flex justify-center`}>
                    <CelebrationGuide guide={guide} hauteur={163} />
                  </div>
                  <h2 className="m-0 mt-1 text-center text-[26px] font-extrabold leading-tight" style={{ fontVariationSettings: "'wdth' 116" }}>Merci, vraiment.</h2>
                  <p className="m-0 mx-auto mt-2 max-w-[300px] text-center text-[16px] leading-snug" style={{ color: ENCRE_2 }}>{voix(guide, "avis.merci")}</p>
                  <div className="mt-auto flex flex-col gap-1.5 pt-5">
                    <button type="button" onClick={trustpilot}
                      className="flex h-[52px] items-center justify-center gap-2 rounded-[10px] text-[16px] font-bold text-white" style={BOUTON}>
                      Le dire sur Trustpilot
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" /></svg>
                    </button>
                    <button type="button" onClick={fermer} className="h-11 bg-transparent text-[13px] font-semibold" style={{ color: ENCRE_3 }}>C’est bon comme ça</button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

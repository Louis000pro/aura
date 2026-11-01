"use client";

/* ════════════════════════════════════════════════════════════════════
   QUAND REFAIRE UN CLASSIQUE (Louis, 2026-10-31 : « si on veut le refaire
   dans 3 semaines ou dans 5 semaines, ça ne doit pas bloquer », et « en
   un clic pouvoir le placer sur un jour et le visualiser avant de
   valider »).

   Le mois s'ouvre avec les séances déjà prévues et le bon moment (de
   trois à cinq semaines après le dernier essai) en couleur ; tous les
   autres jours restent possibles. Un toucher choisit le jour, la semaine
   de ce jour se montre avec le classique dedans, puis on valide.

   ⚠️ L'écriture passe par `ajouterIntention` : on AJOUTE, on ne remplace
   jamais une séance déjà posée ce jour-là (V6b).
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  PLANNING_TYPE_BY_CATEGORY, ajouterIntention, ctxFromLieu, dureeIntention, fetchRange, readLieu, type PlanningDay,
} from "@/lib/planning";
import { localDateStr } from "@/lib/dates";
import { exerciseData } from "@/lib/exercicesCatalogue";
import { bonMoment, typo, type Classique } from "@/lib/classiques";

const E = { t1: "#1F1B2E", t2: "#6B6580", t3: "#9A93AE", lav: "#6B4BD6", feu: "#B4470A" };
const DEGRADE = "linear-gradient(100deg,#8B5CF6,#C13BC1)";
const MOT: React.CSSProperties = { fontWeight: 900, fontVariationSettings: "var(--w-voix)" };
const JOURS = ["L", "M", "M", "J", "V", "S", "D"];

const premierDuMois = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const lundiDe = (d: Date) => { const r = new Date(d.getFullYear(), d.getMonth(), d.getDate()); r.setDate(r.getDate() - ((r.getDay() + 6) % 7)); return r; };
const plus = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const jourLong = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const jourCourt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
const moisLong = (d: Date) => d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
const jourMois = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

export default function ChoisirJour({ classique: c, userId, depuis, ouverte, onFermer, onChoisi }: {
  classique: Classique;
  userId: string | null;
  /** Le dernier essai : le bon moment se compte à partir de lui. `null` :
   *  pas encore d'essai, aucun jour n'est mis en avant. */
  depuis: Date | null;
  ouverte: boolean;
  onFermer: () => void;
  onChoisi: (date: string) => void;
}) {
  const moment = useMemo(() => (depuis ? bonMoment(depuis) : null), [depuis]);
  const [mois, setMois] = useState(() => premierDuMois(moment ? moment.du : new Date()));
  const [choisi, setChoisi] = useState<string | null>(null);
  const [prevu, setPrevu] = useState<{ pour: string; jours: Record<string, PlanningDay[]> } | null>(null);
  const [envoi, setEnvoi] = useState<"repos" | "en_cours" | "echec">("repos");

  const aujourdhui = localDateStr();
  const grille = useMemo(() => {
    const debut = lundiDe(mois);
    const fin = plus(lundiDe(new Date(mois.getFullYear(), mois.getMonth() + 1, 0)), 6);
    const jours: Date[] = [];
    for (let d = debut; d <= fin; d = plus(d, 1)) jours.push(d);
    return jours;
  }, [mois]);
  const cleMois = localDateStr(mois);

  useEffect(() => {
    if (!ouverte || !userId) return;
    let vivant = true;
    void fetchRange(userId, grille.map((d) => localDateStr(d)))
      .then((jours) => { if (vivant) setPrevu({ pour: cleMois, jours }); })
      .catch(() => { if (vivant) setPrevu({ pour: cleMois, jours: {} }); });
    return () => { vivant = false; };
  }, [ouverte, userId, grille, cleMois]);
  const jours = prevu?.pour === cleMois ? prevu.jours : null;

  const du = moment ? localDateStr(moment.du) : "", au = moment ? localDateStr(moment.au) : "";
  const semaine = choisi ? Array.from({ length: 7 }, (_, i) => localDateStr(plus(lundiDe(new Date(`${choisi}T12:00:00`)), i))) : [];

  const valider = async () => {
    if (!choisi || !userId || envoi === "en_cours") return;
    setEnvoi("en_cours");
    const lieu = readLieu(userId);
    const jour: PlanningDay = {
      id: null, date: choisi, type: PLANNING_TYPE_BY_CATEGORY[c.categorie] ?? "Force",
      title: c.titre, difficulty: c.niveau, location: ctxFromLieu(lieu.location, lieu.equip),
      exerciseList: exerciseData[c.id] ?? [], sessionId: null, status: "planned",
    };
    try {
      await ajouterIntention(userId, jour, "utilisateur");
      window.dispatchEvent(new CustomEvent("programme-updated", { detail: { date: choisi } }));
      setEnvoi("repos");
      onChoisi(choisi);
      onFermer();
    } catch {
      setEnvoi("echec");
    }
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {ouverte && (
        <motion.div className="fixed inset-0 flex items-end sm:items-center justify-center" style={{ zIndex: 107, background: "rgba(8,5,16,0.55)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onFermer}>
          <motion.div role="dialog" aria-modal="true" aria-label={`Quand refaire ${c.titre}`}
            className="w-full sm:max-w-md bg-white px-5 pt-3 pb-6 overflow-y-auto"
            style={{ maxHeight: "94dvh", borderTopLeftRadius: "var(--r-feuille)", borderTopRightRadius: "var(--r-feuille)", scrollbarWidth: "none" }}
            initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: "spring", stiffness: 380, damping: 36 }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="block rounded-full" style={{ width: 40, height: 5, background: "rgba(31,27,46,0.14)", marginLeft: "calc(50% - 20px)" }} aria-hidden="true" />
              <button type="button" onClick={onFermer} aria-label="Fermer" className="flex items-center justify-center rounded-full cursor-pointer" style={{ width: 40, height: 40, color: E.t2 }}>
                <X size={18} strokeWidth={2.4} />
              </button>
            </div>
            <h2 className="text-[26px] leading-tight" style={{ ...MOT, color: E.t1 }}>{typo(`Quand refaire ${c.titre} ?`)}</h2>
            <p className="text-[16px] mt-1.5 leading-snug" style={{ color: E.t2 }}>
              {moment
                ? typo(`Le bon moment : du ${jourMois(moment.du)} au ${jourMois(moment.au)}. Les autres jours restent possibles.`)
                : "Choisis le jour qui te va."}
            </p>

            {/* ── Le mois ── */}
            <div className="flex items-center justify-between mt-4">
              <button type="button" onClick={() => setMois(new Date(mois.getFullYear(), mois.getMonth() - 1, 1))} aria-label="Mois précédent"
                className="flex items-center justify-center rounded-full cursor-pointer" style={{ width: 44, height: 44, color: E.t1 }}>
                <ChevronLeft size={20} strokeWidth={2.4} />
              </button>
              <p className="text-[16px] font-bold first-letter:uppercase" style={{ color: E.t1 }}>{moisLong(mois)}</p>
              <button type="button" onClick={() => setMois(new Date(mois.getFullYear(), mois.getMonth() + 1, 1))} aria-label="Mois suivant"
                className="flex items-center justify-center rounded-full cursor-pointer" style={{ width: 44, height: 44, color: E.t1 }}>
                <ChevronRight size={20} strokeWidth={2.4} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mt-1 text-center">
              {JOURS.map((j, i) => <span key={i} className="text-[11px] font-semibold py-1" style={{ color: E.t3 }}>{j}</span>)}
              {grille.map((d) => {
                const iso = localDateStr(d);
                const horsMois = d.getMonth() !== mois.getMonth();
                const passe = iso < aujourdhui;
                const bon = !!moment && iso >= du && iso <= au;
                const estChoisi = iso === choisi;
                const seances = (jours?.[iso] ?? []).filter((x) => x.type !== "Repos" && x.title);
                return (
                  <button key={iso} type="button" disabled={passe} onClick={() => setChoisi(iso)}
                    aria-label={`${jourLong(iso)}${bon ? ", le bon moment" : ""}${seances.length ? ", une séance prévue" : ""}`}
                    aria-pressed={estChoisi}
                    className="relative flex flex-col items-center justify-center rounded-[12px] cursor-pointer disabled:cursor-default"
                    style={{
                      height: 44, opacity: passe ? 0.3 : horsMois ? 0.45 : 1,
                      background: estChoisi ? DEGRADE : bon ? "rgba(255,122,26,0.12)" : "transparent",
                      color: estChoisi ? "#FFFFFF" : E.t1,
                    }}>
                    <span className="vy-nombre text-[16px]" style={{ fontWeight: estChoisi || bon ? 800 : 600 }}>{d.getDate()}</span>
                    {seances.length > 0 && (
                      <span className="absolute bottom-1 rounded-full" style={{ width: 5, height: 5, background: estChoisi ? "#FFFFFF" : E.lav }} />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-2 text-[13px]" style={{ color: E.t2 }}>
              <span className="inline-flex items-center gap-1.5"><span className="rounded-full" style={{ width: 6, height: 6, background: E.lav }} />Une séance prévue</span>
              {moment && <span className="inline-flex items-center gap-1.5"><span className="rounded-[4px]" style={{ width: 12, height: 12, background: "rgba(255,122,26,0.18)" }} />Le bon moment</span>}
            </div>

            {/* ── La semaine du jour choisi ── */}
            {choisi && (
              <div className="mt-5">
                <p className="text-[16px] font-bold" style={{ color: E.t1 }}>Ta semaine du {jourMois(new Date(`${semaine[0]}T12:00:00`))}</p>
                <div className="mt-2 rounded-[var(--r-bloc)] overflow-hidden" style={{ border: "1px solid rgba(31,27,46,0.10)" }}>
                  {semaine.flatMap((iso) => [
                    ...(jours?.[iso] ?? []).filter((x) => x.type !== "Repos" && x.title).map((x) => ({ iso, titre: x.title, minutes: dureeIntention(x), nouveau: false })),
                    ...(iso === choisi ? [{ iso, titre: c.titre, minutes: c.minutes, nouveau: true }] : []),
                  ]).map((l, i) => (
                    <div key={`${l.iso}-${i}`} className="flex items-center gap-3 px-3.5 py-2.5"
                      style={{ borderTop: i ? "1px solid rgba(31,27,46,0.08)" : undefined, background: l.nouveau ? "rgba(139,92,246,0.07)" : undefined }}>
                      <span className="text-[13px] font-semibold w-[64px] flex-shrink-0 first-letter:uppercase" style={{ color: E.t2 }}>{jourCourt(l.iso)}</span>
                      <span className="flex-1 min-w-0 text-[16px] font-semibold truncate" style={{ color: E.t1 }}>{l.titre}</span>
                      {l.nouveau
                        ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: DEGRADE }}>Nouveau</span>
                        : <span className="text-[13px]" style={{ color: E.t2 }}>{l.minutes} min</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <motion.button type="button" whileTap={choisi ? { scale: 0.97 } : undefined} onClick={() => void valider()}
              aria-disabled={!choisi || envoi === "en_cours" || undefined}
              className="w-full mt-5 flex items-center justify-center text-white font-bold text-[20px] cursor-pointer"
              style={{ height: 58, borderRadius: 22, background: DEGRADE, opacity: choisi ? 1 : 0.45, boxShadow: choisi ? "0 10px 30px -6px rgba(193,59,193,0.45)" : "none" }}>
              {envoi === "en_cours" ? "Un instant…" : choisi ? `Valider ${jourLong(choisi)}` : "Choisis un jour"}
            </motion.button>
            <p className="text-[13px] text-center mt-2" style={{ color: envoi === "echec" ? E.feu : E.t2 }}>
              {envoi === "echec" ? "Le jour n’a pas pu être ajouté. Tu peux réessayer." : "Tu pourras le déplacer à tout moment depuis ton planning."}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

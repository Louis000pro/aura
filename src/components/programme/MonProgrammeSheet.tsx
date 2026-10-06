"use client";

/* ════════════════════════════════════════════════════════════════════
   R9c · « MON PROGRAMME » (maquette 08, écrans 01, 02 et 09)

   Deux temps, et rien ne s'active dans le premier.
   ① Ce que tu veux travailler : une priorité, une seconde facultative, ou
     « Un peu de tout ». Les jours, le lieu viennent de ce qui est déjà
     répondu ; « Mes jours » s'ouvre d'ici.
   ② L'aperçu : les séances qui reviendront, dans leur ordre, avec leurs
     vrais exercices. Puis, s'il en reste, chaque séance encore prévue de
     l'ancien programme, avec trois choix : la garder, la remplacer, la
     retirer (décision 32). « Activer » ne part qu'avec une réponse pour
     chacune, et la base le vérifie aussi.

   R7 · « Mes exercices » (maquette 07 écran 01) : le réglage de variété,
   à part. Il s'enregistre seul, sans changer de programme : il ne décide
   que des séances pas encore préparées.

   ⚠️ L'APERÇU EST CE QUI S'ÉCRIT. Les noms viennent de
   `composerProgramme`, les exercices de `composerEtape` sur le même nom
   et le même contexte que l'écriture (`preparerActivation`).
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import FeuilleBas from "@/components/semaine/FeuilleBas";
import { LIBELLE_ZONE, ZONES, composerEtape, limiteDeLEtape, phraseLimite, type Zone } from "@/lib/banqueEtapes";
import {
  composerProgramme, planDesRemplacements, prioritesDeLIntention, seancesDuChoix,
  type ChoixReservation, type ReservationAncienne,
} from "@/lib/composeurProgramme";
import { activerProgramme, preparerActivation, reservationsAChoisir } from "@/lib/monProgramme";
import { contexteDe, type GenInput } from "@/lib/planning";
import { libelleJourProjete, type Calendrier } from "@/lib/projection";
import { ABR_JOURS } from "@/lib/semaine";
import { EVT_JOURNEE } from "@/lib/finSeance";
import type { ProgrammeEtCycle } from "@/lib/programme";
import { LIBELLE_VARIETE, VARIETES, type Variete } from "@/lib/variete";
import { ecrireVariete, lireVariete } from "@/lib/varieteBase";

/* Une séance de six exercices, vue par chaque mode : les repères restent,
   les autres restent ou changent (maquette 07 écran 01). */
const POINTS: Record<Variete, ("repere" | "garde" | "nouveau")[]> = {
  habituels: ["repere", "repere", "garde", "garde", "garde", "garde"],
  peu: ["repere", "repere", "garde", "garde", "garde", "nouveau"],
  beaucoup: ["repere", "repere", "garde", "nouveau", "nouveau", "nouveau"],
};

function Points({ mode }: { mode: Variete }) {
  return (
    <span className="flex items-center gap-1" aria-hidden>
      {POINTS[mode].map((p, i) => p === "nouveau"
        ? <span key={i} className="text-[13px] font-extrabold leading-none" style={{ color: "var(--exp-encre)" }}>+</span>
        : <span key={i} className="w-2 h-2 rounded-full" style={{ background: p === "repere" ? "var(--text-0)" : "rgba(var(--text-3-rgb),0.45)" }} />)}
    </span>
  );
}

const LIEU: Record<string, string> = {
  salle: "En salle",
  halteres: "À la maison, avec haltères",
  poids: "À la maison, sans matériel",
};

const CHOIX_LIBELLE: Record<ChoixReservation, string> = {
  garder: "La garder", remplacer: "Remplacer", retirer: "Retirer",
};

export default function MonProgrammeSheet({ userId, programme, calendrier, gen, aujourdhui, onClose, onMesJours, onActive }: {
  userId: string;
  programme: ProgrammeEtCycle | null;
  calendrier: Calendrier | null;
  gen: GenInput | null;
  aujourdhui: string;
  onClose: () => void;
  onMesJours?: () => void;
  onActive: () => void;
}) {
  const connues = programme ? prioritesDeLIntention(programme.programme.intention) : null;
  /* `null` = rien choisi encore ; `[]` = « Un peu de tout ». */
  const [priorites, setPriorites] = useState<Zone[] | null>(connues);
  const [etape, setEtape] = useState<"choix" | "apercu" | "exercices">("choix");
  /* R7 · `undefined` = en lecture ; `null` = illisible. */
  const [variete, setVariete] = useState<Variete | null | undefined>(undefined);
  const [varieteChoisie, setVarieteChoisie] = useState<Variete | null>(null);
  const [varieteMsg, setVarieteMsg] = useState<string | null>(null);
  const [ouverte, setOuverte] = useState<number | null>(null);
  const [reservations, setReservations] = useState<ReservationAncienne[] | null>(programme ? null : []);
  const [illisible, setIllisible] = useState(false);
  const [lecture, setLecture] = useState(0);
  const [choix, setChoix] = useState<Record<string, ChoixReservation | undefined>>({});
  const [refus, setRefus] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const jours = calendrier?.choisi && calendrier.jours.length > 0 ? calendrier.jours : null;
  /* Revue finale (P2) · des jours choisis, mais aucun : on ne retombe
     pas sur une fréquence inventée, on le dit. */
  const aucunJour = !!calendrier?.choisi && calendrier.jours.length === 0;
  const seances = seancesDuChoix(jours ? jours.length : gen?.sessions ?? 3);
  const compose = useMemo(
    () => (priorites ? composerProgramme({ priorites, seances }) : null),
    [priorites, seances],
  );
  const ctx = useMemo(() => (gen ? contexteDe(gen) : null), [gen]);
  const exercices = useMemo(
    () => (compose && ctx ? compose.etapes.map((e) => composerEtape(e.nom, ctx).map((l) => l.exercice_nom)) : []),
    [compose, ctx],
  );
  const limites = useMemo(
    () => (compose && ctx ? compose.etapes.map((e) => limiteDeLEtape(e.nom, ctx.lieu)) : []),
    [compose, ctx],
  );
  const identique = !!compose && !!programme
    && programme.programme.intention === compose.intention
    && programme.cycle.map((e) => e.nom).join("|") === compose.etapes.map((e) => e.nom).join("|");

  /* Les séances encore prévues de l'ancien programme, lues à l'aperçu.
     Strict : « je n'ai pas pu lire » n'est pas « il n'y en a aucune ». */
  useEffect(() => {
    if (etape !== "apercu" || !programme) return;
    let vivant = true;
    reservationsAChoisir(userId, programme.programme.id)
      .then((r) => { if (vivant) { setIllisible(false); setReservations(r); } })
      .catch(() => { if (vivant) { setReservations(null); setIllisible(true); } });
    return () => { vivant = false; };
  }, [etape, programme, userId, lecture]);

  useEffect(() => {
    let vivant = true;
    void lireVariete(userId).then((v) => { if (vivant) setVariete(v); });
    return () => { vivant = false; };
  }, [userId]);

  const enregistrerVariete = async () => {
    const v = varieteChoisie ?? variete;
    if (!v) return;
    setEnvoi(true); setVarieteMsg(null);
    const r = await ecrireVariete(userId, v);
    setEnvoi(false);
    if (r === "ok") {
      setVariete(v);
      window.dispatchEvent(new Event(EVT_JOURNEE));
      setEtape("choix");
      return;
    }
    setVarieteMsg(r === "pas_ouvert" ? "Ce réglage n’est pas encore ouvert. Rien n’a changé." : "Ça n’a pas pris. Réessaie dans un instant.");
  };

  const basculer = (z: Zone) => {
    setPriorites((p) => {
      const liste = p ?? [];
      if (liste.includes(z)) return liste.filter((x) => x !== z);
      return liste.length >= 2 ? [liste[0], z] : [...liste, z];
    });
  };

  const plan = compose && reservations ? planDesRemplacements(reservations, choix, compose.etapes) : null;
  const blocage = aucunJour ? "Aucun jour choisi : choisis au moins un jour dans « Mes jours »."
    : !gen ? "Je n’arrive pas à lire tes réglages d’entraînement."
    : variete === null ? "Je n’arrive pas à lire ton réglage d’exercices."
    : variete === undefined ? "Je lis tes réglages…"
    : identique ? "C’est déjà ton programme."
    : reservations === null ? (illisible ? "Je n’arrive pas à voir tes séances déjà prévues." : "Je regarde tes séances déjà prévues…")
    : !plan ? "Choisis quoi faire de chaque séance encore prévue."
    : null;

  /* Revue finale (P1) · une activation garde SON identité tant que son
     contenu ne change pas : rejouée après une réponse perdue, la base la
     reconnaît. Un autre aperçu est une autre activation. */
  const activationRef = useRef<{ cle: string; id: string } | null>(null);
  const activer = async () => {
    if (blocage || !compose || !gen || !reservations || !variete) { setRefus(true); return; }
    const brouillon = preparerActivation("", programme?.programme.id ?? null, compose, gen, reservations, choix, variete);
    if (!brouillon) { setRefus(true); return; }
    const cle = JSON.stringify(brouillon);
    if (activationRef.current?.cle !== cle) activationRef.current = { cle, id: crypto.randomUUID() };
    const demande = { ...brouillon, activation_id: activationRef.current.id };
    setEnvoi(true); setErreur(null);
    const r = await activerProgramme(demande);
    if (r.ok) {
      window.dispatchEvent(new Event(EVT_JOURNEE));
      onActive();
      return;
    }
    setEnvoi(false);
    if (r.raison === "programme_change") setErreur("Ton programme a changé entre-temps. Ferme et rouvre pour voir le nouvel aperçu.");
    else if (r.raison === "choix_incomplets") { setErreur("Une séance prévue n’a pas encore de choix."); setLecture((n) => n + 1); }
    else if (r.raison === "apercu_perime") { setErreur("Une séance prévue a bougé depuis l’aperçu. Rien n’a été modifié : vérifie à nouveau."); setLecture((n) => n + 1); }
    else if (r.raison === "pas_ouvert") setErreur("Le changement de programme n’est pas encore ouvert. Rien n’a été modifié.");
    else if (r.raison === "incertain") setErreur("La connexion a coupé avant la réponse. Réessaie : si c’était déjà passé, rien ne sera fait deux fois.");
    else setErreur("Ça n’a pas pris. Rien n’a été modifié, réessaie dans un instant.");
  };

  const phrasePassages = (() => {
    if (!compose || compose.passages.length === 0) return null;
    const noms = compose.passages.map((p, i) => (i === 0 ? LIBELLE_ZONE[p.zone] : LIBELLE_ZONE[p.zone].toLowerCase()));
    const fois = compose.passages[0].fois;
    if (compose.passages.every((p) => p.fois === fois)) {
      return `${noms.join(" et ")} ${noms.length > 1 ? "reviennent" : "revient"} ${fois} fois dans le cycle.`;
    }
    return compose.passages.map((p) => `${LIBELLE_ZONE[p.zone]} : ${p.fois} fois`).join(" · ") + " dans le cycle.";
  })();

  return (
    <FeuilleBas onClose={onClose} niveau={105}>
      <div className="px-5 pt-1 pb-2 flex items-center justify-between flex-shrink-0">
        <p className="vy-sous" style={{ color: "var(--text-0)" }}>
          {etape === "choix" ? "Mon programme" : etape === "exercices" ? "Mes exercices" : programme ? "Ton nouveau programme" : "Ton programme"}
        </p>
        <button onClick={onClose} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center cursor-pointer bg-transparent border-none">
          <X size={16} style={{ color: "var(--text-3)" }} />
        </button>
      </div>

      <div className="overflow-y-auto px-5 flex-1" style={{ scrollbarWidth: "none" }}>
        {etape === "choix" ? (
          <>
            <p className="vy-label mt-1" style={{ color: "var(--text-3)" }}>Ce que tu veux travailler · 2 au plus</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {ZONES.map((z) => {
                const rang = priorites?.indexOf(z) ?? -1;
                const on = rang >= 0;
                return (
                  <button key={z} onClick={() => basculer(z)} aria-pressed={on}
                    className="h-10 px-3.5 rounded-full cursor-pointer text-[13px] font-semibold flex items-center gap-1.5"
                    style={on
                      ? { background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", border: "none" }
                      : { background: "transparent", color: "var(--text-2)", border: "1px solid rgba(var(--text-3-rgb),0.3)" }}>
                    {on && <span className="vy-nombre text-[11px]" style={{ fontWeight: 800 }}>{rang + 1}</span>}
                    {LIBELLE_ZONE[z]}
                  </button>
                );
              })}
              <button onClick={() => setPriorites([])} aria-pressed={priorites?.length === 0}
                className="h-10 px-3.5 rounded-full cursor-pointer text-[13px] font-semibold"
                style={priorites?.length === 0
                  ? { background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", border: "none" }
                  : { background: "transparent", color: "var(--text-2)", border: "1px solid rgba(var(--text-3-rgb),0.3)" }}>
                Un peu de tout
              </button>
            </div>

            <div className="mt-6">
              <button onClick={onMesJours} disabled={!onMesJours}
                className="w-full flex items-center justify-between py-3 bg-transparent border-none cursor-pointer text-left"
                style={{ borderTop: "1px solid rgba(var(--text-3-rgb),0.14)" }}>
                <span className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>Mes jours</span>
                <span className="text-[13px] flex items-center gap-1" style={{ color: "var(--text-2)" }}>
                  {aucunJour ? "Aucun jour choisi" : jours ? jours.map((j) => ABR_JOURS[j - 1]).join(" · ") : `${seances} séance${seances > 1 ? "s" : ""} par semaine`}
                  {onMesJours && <ChevronRight size={14} />}
                </span>
              </button>
              <div className="flex items-center justify-between py-3" style={{ borderTop: "1px solid rgba(var(--text-3-rgb),0.14)" }}>
                <span className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>Où</span>
                <span className="text-[13px]" style={{ color: "var(--text-2)" }}>{gen ? LIEU[gen.ctx] : "—"}</span>
              </div>
              <button onClick={() => { setVarieteChoisie(null); setVarieteMsg(null); setEtape("exercices"); }}
                disabled={variete === undefined}
                className="w-full flex items-center justify-between py-3 bg-transparent border-none cursor-pointer text-left"
                style={{ borderTop: "1px solid rgba(var(--text-3-rgb),0.14)" }}>
                <span className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>Mes exercices</span>
                <span className="text-[13px] flex items-center gap-1" style={{ color: "var(--text-2)" }}>
                  {variete ? LIBELLE_VARIETE[variete] : variete === null ? "Illisible" : "…"}
                  <ChevronRight size={14} />
                </span>
              </button>
            </div>
          </>
        ) : etape === "exercices" ? (
          <>
            <div className="mt-1" role="radiogroup" aria-label="Mes exercices">
              {VARIETES.map((m) => {
                const on = (varieteChoisie ?? variete) === m;
                return (
                  <button key={m} role="radio" aria-checked={on} onClick={() => setVarieteChoisie(m)}
                    className="w-full flex items-center justify-between gap-3 py-3.5 bg-transparent border-none cursor-pointer text-left"
                    style={{ borderTop: "1px solid rgba(var(--text-3-rgb),0.14)" }}>
                    <span className="flex flex-col gap-1.5">
                      <span className="text-[16px] font-semibold" style={{ color: "var(--text-0)" }}>{LIBELLE_VARIETE[m]}</span>
                      <Points mode={m} />
                    </span>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ border: on ? "6px solid #8B5CF6" : "1.5px solid rgba(var(--text-3-rgb),0.5)" }} />
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-3 text-[11px]" style={{ color: "var(--text-3)" }}>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "var(--text-0)" }} />Repère</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "rgba(var(--text-3-rgb),0.45)" }} />Gardé</span>
              <span className="flex items-center gap-1"><span className="font-extrabold" style={{ color: "var(--exp-encre)" }}>+</span>Nouveau</span>
            </div>
            <p className="vy-corps mt-4" style={{ color: "var(--text-2)" }}>Tes exercices repères restent pour suivre tes progrès.</p>
            {varieteMsg && <p className="text-[13px] mt-3" style={{ color: "var(--text-2)" }}>{varieteMsg}</p>}
          </>
        ) : compose && (
          <>
            {phrasePassages && <p className="vy-corps mt-1" style={{ color: "var(--text-1)" }}>{phrasePassages}</p>}
            <div className="mt-3">
              {compose.etapes.map((e, i) => (
                <div key={e.position} style={{ borderTop: "1px solid rgba(var(--text-3-rgb),0.14)" }}>
                  <button onClick={() => setOuverte(ouverte === i ? null : i)} aria-expanded={ouverte === i}
                    className="w-full flex items-center justify-between py-3 bg-transparent border-none cursor-pointer text-left">
                    <span>
                      <span className="block text-[16px] font-semibold" style={{ color: "var(--text-0)" }}>{e.nom}</span>
                      <span className="block text-[13px]" style={{ color: "var(--text-3)" }}>
                        <span className="vy-nombre">{exercices[i]?.length ?? 0}</span> exercices
                      </span>
                      {limites[i] && (
                        <span className="block text-[13px]" style={{ color: "var(--text-2)" }}>{phraseLimite(limites[i]!)}</span>
                      )}
                    </span>
                    {ouverte === i ? <ChevronDown size={16} style={{ color: "var(--text-3)" }} /> : <ChevronRight size={16} style={{ color: "var(--text-3)" }} />}
                  </button>
                  {ouverte === i && (
                    <ul className="pb-3 pl-1">
                      {(exercices[i] ?? []).map((n) => (
                        <li key={n} className="text-[13px] py-0.5" style={{ color: "var(--text-2)" }}>{n}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {programme && reservations === null && (
              <div className="mt-5">
                <p className="vy-corps" style={{ color: illisible ? "var(--text-2)" : "var(--text-3)" }}>
                  {illisible ? "Je n’arrive pas à voir tes séances déjà prévues." : "Je regarde tes séances déjà prévues…"}
                </p>
                {illisible && (
                  <button onClick={() => { setIllisible(false); setLecture((n) => n + 1); }}
                    className="mt-2 text-[13px] font-semibold bg-transparent border-none cursor-pointer p-0" style={{ color: "var(--exp-encre)" }}>
                    Réessayer
                  </button>
                )}
              </div>
            )}
            {reservations && reservations.length > 0 && (
              <div className="mt-5">
                {reservations.map((r) => {
                  const remplacee = plan?.find((x) => x.intentionId === r.id);
                  return (
                    <div key={r.id} className="py-3" style={{ borderTop: "1px solid rgba(var(--text-3-rgb),0.14)" }}>
                      <p className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
                        {r.titre} est prévue {r.date ? libelleJourProjete(r.date, aujourdhui) : "sans jour"}
                      </p>
                      <div className="flex gap-1.5 mt-2" role="radiogroup" aria-label={`Que faire de ${r.titre}`}>
                        {(["garder", "remplacer", "retirer"] as ChoixReservation[]).map((c) => {
                          const on = choix[r.id] === c;
                          const impossible = c === "remplacer" && !r.date;
                          return (
                            <button key={c} role="radio" aria-checked={on} disabled={impossible}
                              onClick={() => { setChoix((p) => ({ ...p, [r.id]: c })); setRefus(false); }}
                              className="flex-1 h-9 rounded-[var(--r-controle)] cursor-pointer text-[13px] font-semibold"
                              style={on
                                ? { background: "rgba(var(--accent-rgb),0.14)", color: "var(--exp-encre)", border: "1px solid rgba(var(--accent-rgb),0.5)" }
                                : { background: "transparent", color: impossible ? "var(--text-3)" : "var(--text-2)", border: "1px solid rgba(var(--text-3-rgb),0.3)" }}>
                              {CHOIX_LIBELLE[c]}
                            </button>
                          );
                        })}
                      </div>
                      {remplacee && (
                        <p className="vy-label mt-1.5" style={{ color: "var(--text-3)" }}>Ce jour-là : {remplacee.nom}</p>
                      )}
                      {choix[r.id] === "retirer" && (
                        <p className="vy-label mt-1.5" style={{ color: "var(--text-3)" }}>Elle disparaît de ta semaine, sans être comptée.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        {erreur && <p className="text-[13px] mt-4" style={{ color: "#DC2626" }}>{erreur}</p>}
        <div style={{ height: 12 }} />
      </div>

      <div className="px-5 pt-3 flex flex-col gap-2 flex-shrink-0"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        {etape === "exercices" ? (
          <>
            <motion.button whileTap={{ scale: 0.97 }} aria-disabled={envoi || !(varieteChoisie ?? variete)}
              onClick={() => { if (!envoi) void enregistrerVariete(); }}
              className="w-full py-3 rounded-2xl text-[16px] font-extrabold text-white cursor-pointer border-none"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)", opacity: envoi ? 0.55 : 1 }}>
              {envoi ? "Enregistrement…" : "Enregistrer"}
            </motion.button>
            <button disabled={envoi} onClick={() => setEtape("choix")}
              className="w-full py-2 text-[13px] font-semibold cursor-pointer bg-transparent border-none" style={{ color: "var(--text-2)" }}>
              Retour
            </button>
          </>
        ) : etape === "choix" ? (
          <motion.button whileTap={{ scale: 0.97 }} aria-disabled={!priorites}
            onClick={() => { if (priorites) { setEtape("apercu"); setOuverte(null); setErreur(null); setRefus(false); } else setRefus(true); }}
            className="w-full py-3 rounded-2xl text-[16px] font-extrabold text-white cursor-pointer border-none"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)", opacity: priorites ? 1 : 0.55 }}>
            Voir mon programme
          </motion.button>
        ) : (
          <>
            {refus && blocage && <p className="text-[13px]" style={{ color: "var(--text-2)" }}>{blocage}</p>}
            <motion.button whileTap={{ scale: 0.97 }} aria-disabled={!!blocage || envoi}
              onClick={() => { if (!envoi) void activer(); }}
              className="w-full py-3 rounded-2xl text-[16px] font-extrabold text-white cursor-pointer border-none"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)", opacity: blocage || envoi ? 0.55 : 1 }}>
              {envoi ? "Activation…" : "Activer ce programme"}
            </motion.button>
            <button disabled={envoi} onClick={() => { setEtape("choix"); setErreur(null); }}
              className="w-full py-2 text-[13px] font-semibold cursor-pointer bg-transparent border-none" style={{ color: "var(--text-2)" }}>
              Modifier mes choix
            </button>
          </>
        )}
        {etape === "choix" && refus && !priorites && (
          <p className="text-[13px]" style={{ color: "var(--text-2)" }}>Choisis au moins une zone, ou « Un peu de tout ».</p>
        )}
      </div>
    </FeuilleBas>
  );
}

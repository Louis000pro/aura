"use client";

/* ════════════════════════════════════════════════════════════════════
   R9b · « MA SEMAINE » POUR QUI A CHOISI SES JOURS (maquette 08,
   écrans 04, 06, 07 et 08)

   Deux semaines modifiables (« Cette semaine », « Semaine prochaine »),
   plus « Après », un aperçu en lecture seule. Une ligne par jour.

   ⚠️ CET ÉCRAN NE DÉCIDE RIEN. Les lignes viennent de `lignesSemaine`
   (pure), la projection de `resolutionDuProgramme` (la même que l'accueil
   et le Guide, décision 21), et chaque geste de `semaineGestes`.

   ⚠️ « REFAIS MA SEMAINE » N'EXISTE PAS ICI : la semaine se remplit
   seule, sans rien écrire (validé par Louis). Il reste pour les comptes
   sans jours choisis.

   ⚠️ « JE NE SAIS PAS » N'EST PAS « RIEN ». Une lecture ratée affiche
   « Je n'arrive pas à lire ta semaine » et « Réessayer », jamais une
   semaine vide.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftRight, CalendarDays, Check, ChevronRight, ListChecks, Minus, Play, Plus, Timer, X } from "lucide-react";
import FeuilleBas from "@/components/semaine/FeuilleBas";
import ChoixJour from "@/components/entrainement/ChoixJour";
import { Photo } from "@/components/entrainement/PhotoSeance";
import { resolveArt } from "@/lib/workoutArt";
import { contexteDe, dayTitle, fetchRange, type GenInput, type PlanningDay } from "@/lib/planning";
import { modeleDeLEtape, modeleDeLOccurrence } from "@/lib/prescription";
import { lireVariete } from "@/lib/varieteBase";
import { projeterPrescription } from "@/lib/banqueEtapes";
import type { EtapeCycle, ProgrammeEtCycle } from "@/lib/programme";
import { resolutionDuProgramme, type ResolutionProgramme } from "@/lib/projectionBase";
import { decaler, libelleAttente, type JourProjete } from "@/lib/projection";
import { ABR_JOURS, lignesSemaine, semaineDe, type ElementJour, type LigneSemaine, type SeanceJournal } from "@/lib/semaine";
import { changerDeJour, lireJournal, regleDuJour, retirerLeJour, type ResultatGeste } from "@/lib/semaineGestes";
import { rangEnAttente } from "@/lib/occurrences";

type Onglet = 0 | 1 | 2;
const ONGLETS = ["Cette semaine", "Semaine prochaine", "Après"] as const;

type Donnees = { intentions: PlanningDay[]; journal: SeanceJournal[]; proj: ResolutionProgramme };

/** La réservation à libérer une fois la nouvelle séance enregistrée. */
export type ALiberer = { id: string; date: string } | null;

/** Ce qu'on a touché pour ouvrir la feuille d'un jour. */
type Cible = { ligne: LigneSemaine<EtapeCycle>; element: ElementJour<EtapeCycle> | null };

const RAISONS: Record<Exclude<ResultatGeste, { ok: true }>["raison"], string> = {
  changee: "Ta semaine a bougé entre-temps, je l’ai relue.",
  illisible: "Je n’arrive pas à relire ta semaine, réessaie dans un instant.",
  echec: "Ça n’a pas pris, réessaie dans un instant.",
  masquee: "Ton adaptation met cette séance de côté ce jour-là.",
  partiel: "Je ne sais pas si c’est passé jusqu’au bout : je relis ta semaine, regarde ce jour avant de recommencer.",
};

const CONFLITS = {
  absence: "en pause pendant ton absence",
  jour_retire: "jour retiré, elle passera au suivant",
  adaptation: "mise de côté par ton adaptation",
} as const;

export default function MaSemaineSheet({
  userId, programme, gen, aujourdhui, onClose, onLancerTete, onLancerIntention, onVersionCourte,
  onChoisirSeance, onMesJours, onAbsence, onChange,
}: {
  userId: string;
  programme: ProgrammeEtCycle | null;
  gen: GenInput | null;
  aujourdhui: string;
  onClose: () => void;
  /** Lance la séance que l'app propose maintenant (la tête de la suite). */
  onLancerTete: () => void;
  onLancerIntention: (d: PlanningDay) => void;
  /** R8 · « Version courte » : la séance de ce jour, raccourcie, maintenant.
   *  `null` = la séance de tête (l'étape libre du héros). */
  onVersionCourte?: (d: PlanningDay | null) => void;
  /** Ouvre le catalogue pour poser une séance sur ce jour. `liberer` :
   *  la réservation à retirer SEULEMENT une fois la séance enregistrée. */
  onChoisirSeance: (date: string, liberer: ALiberer) => void;
  onMesJours: () => void;
  onAbsence: () => void;
  /** Une écriture a eu lieu : l'accueil et la semaine se relisent. */
  onChange: () => void;
}) {
  const [onglet, setOnglet] = useState<Onglet>(0);
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [illisible, setIllisible] = useState(false);
  const [lecture, setLecture] = useState(0);
  const [cible, setCible] = useState<Cible | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const semaines = useMemo(() => {
    const a = semaineDe(aujourdhui);
    return [a, semaineDe(decaler(a[0], 7)), semaineDe(decaler(a[0], 14))];
  }, [aujourdhui]);

  /* Une lecture : les intentions des trois semaines, et la projection
     jusqu'au dernier jour montré. */
  useEffect(() => {
    let vivant = true;
    const toutes = semaines.flat();
    const horizon = Math.max(1, toutes.filter((d) => d >= aujourdhui).length);
    Promise.all([
      fetchRange(userId, toutes),
      resolutionDuProgramme(userId, programme, aujourdhui, horizon),
      lireJournal(userId, toutes),
    ]).then(([m, proj, journal]) => {
      if (!vivant) return;
      if (!proj) { setIllisible(true); return; }
      setIllisible(false);
      setDonnees({ intentions: Object.values(m).flat(), journal, proj });
    }).catch(() => { if (vivant) setIllisible(true); });
    return () => { vivant = false; };
  }, [userId, programme, aujourdhui, semaines, lecture]);

  const relire = useCallback(() => setLecture((n) => n + 1), []);

  const lignes = useMemo(() => {
    if (!donnees) return null;
    const res = donnees.proj.resolution;
    return lignesSemaine<EtapeCycle>({
      dates: semaines[onglet],
      aujourdhui,
      intentions: donnees.intentions,
      projetes: res?.jours ?? [],
      journal: donnees.journal,
      calendrier: donnees.proj.calendrier,
      rangPropose: res?.proposee?.rang ?? null,
    });
  }, [donnees, semaines, onglet, aujourdhui]);

  /* La séance proposée tombe-t-elle un autre jour qu'aujourd'hui ? Alors
     un jour libre d'aujourd'hui dit « La faire aujourd'hui ». */
  const proposee = donnees?.proj.resolution?.proposee ?? null;
  const proposeeAilleurs = !!proposee && proposee.date !== aujourdhui;

  const apres = async (r: ResultatGeste, ok: string) => {
    setCible(null);
    setMessage(r.ok ? ok : RAISONS[r.raison]);
    setTimeout(() => setMessage(null), 2600);
    relire();
    onChange();
  };

  const lectureSeule = onglet === 2;

  return (
    <FeuilleBas onClose={onClose} hauteur="90dvh">
      <div className="px-5 pt-1 pb-2 flex items-center justify-between flex-shrink-0">
        <p className="vy-sous" style={{ color: "var(--text-0)" }}>Ma semaine</p>
        <button onClick={onClose} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center cursor-pointer bg-transparent border-none">
          <X size={16} style={{ color: "var(--text-3)" }} />
        </button>
      </div>

      <div className="px-5 pb-3 flex gap-4 flex-shrink-0" role="tablist">
        {ONGLETS.map((t, i) => (
          <button key={t} role="tab" aria-selected={onglet === i} onClick={() => setOnglet(i as Onglet)}
            className="pb-1.5 text-[13px] font-semibold cursor-pointer bg-transparent border-none flex items-center gap-0.5"
            style={{
              color: onglet === i ? "var(--text-0)" : "var(--text-3)",
              borderBottom: onglet === i ? "2px solid #8B5CF6" : "2px solid transparent",
            }}>
            {t}{i === 2 && <ChevronRight size={12} strokeWidth={2.4} />}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto px-5 flex-1" style={{ scrollbarWidth: "none" }}>
        {illisible ? (
          <div className="py-10 text-center">
            <p className="vy-corps" style={{ color: "var(--text-2)" }}>Je n&apos;arrive pas à lire ta semaine pour l&apos;instant.</p>
            <button onClick={relire} className="mt-3 text-[13px] font-semibold bg-transparent border-none cursor-pointer" style={{ color: "var(--exp-encre)" }}>
              Réessayer
            </button>
          </div>
        ) : !lignes ? (
          <p className="vy-corps py-10 text-center" style={{ color: "var(--text-3)" }}>Je lis ta semaine…</p>
        ) : (
          <>
            {lectureSeule && (
              <p className="vy-label pb-2" style={{ color: "var(--text-3)" }}>Un aperçu : il se précisera au fil des semaines.</p>
            )}
            {lignes.map((l, i) => (
              <LigneJour key={l.date} ligne={l} premiere={i === 0}
                lectureSeule={lectureSeule}
                laFaireAujourdhui={l.aujourdhui && l.etat === "libre" && proposeeAilleurs && !lectureSeule}
                onLancerTete={onLancerTete}
                onOuvrir={(element) => setCible({ ligne: l, element })} />
            ))}
          </>
        )}
        <div style={{ height: 12 }} />
      </div>

      <div className="px-5 pt-3 flex gap-2 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(var(--text-3-rgb),0.14)", paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        <button onClick={onMesJours}
          className="flex-1 py-2.5 rounded-2xl text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5"
          style={{ background: "transparent", border: "1px solid rgba(var(--text-3-rgb),0.28)", color: "var(--text-1)" }}>
          <CalendarDays size={14} strokeWidth={2.2} /> Mes jours
        </button>
        <button onClick={onAbsence}
          className="flex-1 py-2.5 rounded-2xl text-[13px] font-semibold cursor-pointer"
          style={{ background: "transparent", border: "1px solid rgba(var(--text-3-rgb),0.28)", color: "var(--text-1)" }}>
          Je m&apos;absente
        </button>
      </div>

      <AnimatePresence>
        {message && (
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-24 px-4 py-2 rounded-2xl text-[13px] font-medium"
            style={{ background: "rgb(var(--surface-rgb))", boxShadow: "var(--ombre-flottant)", color: "var(--text-1)", whiteSpace: "nowrap" }}>
            {message}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cible && donnees && (
          <FeuilleJour
            cible={cible}
            userId={userId}
            programme={programme}
            gen={gen}
            aujourdhui={aujourdhui}
            reservable={(etapeId, rang) => !!programme && !!donnees.proj.etat
              && rangEnAttente(programme.cycle, donnees.proj.etat, etapeId) === rang}
            onClose={() => setCible(null)}
            onLancerTete={() => { setCible(null); onLancerTete(); }}
            onLancerIntention={(d) => { setCible(null); onLancerIntention(d); }}
            onVersionCourte={onVersionCourte ? (d) => { setCible(null); onVersionCourte(d); } : undefined}
            onChoisirSeance={(date, liberer) => { setCible(null); onChoisirSeance(date, liberer); }}
            onResultat={apres}
          />
        )}
      </AnimatePresence>
    </FeuilleBas>
  );
}

/* ─── Une ligne par jour ─────────────────────────────────────────── */

function LigneJour({ ligne, premiere, lectureSeule, laFaireAujourdhui, onLancerTete, onOuvrir }: {
  ligne: LigneSemaine<EtapeCycle>;
  premiere: boolean;
  lectureSeule: boolean;
  laFaireAujourdhui: boolean;
  onLancerTete: () => void;
  onOuvrir: (element: ElementJour<EtapeCycle> | null) => void;
}) {
  const l = ligne;
  const attenue = l.etat === "passe_sans" || l.etat === "pas_de_seance" || l.etat === "absence";
  const touchable = !lectureSeule && !l.passe;
  return (
    <div className="flex items-start gap-3 py-2.5" style={{ borderTop: premiere ? "none" : "1px solid rgba(var(--text-3-rgb),0.12)" }}>
      <div className="w-9 flex-shrink-0 text-center">
        <span className="block text-[11px] font-bold" style={{ color: l.aujourdhui ? "var(--exp-encre)" : "var(--text-3)" }}>{ABR_JOURS[l.jour - 1]}</span>
        <span className="block vy-nombre text-[16px]" style={{ color: l.aujourdhui ? "var(--exp-encre)" : "var(--text-2)" }}>{l.date.slice(8, 10)}</span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        {l.elements.length === 0 ? (
          <button disabled={!touchable} onClick={() => onOuvrir(null)}
            className="text-left bg-transparent border-none p-0 flex items-center justify-between min-h-[36px]"
            style={{ cursor: touchable ? "pointer" : "default", opacity: attenue ? 0.55 : 1 }}>
            <span className="text-[13px]" style={{ color: "var(--text-3)" }}>
              {l.etat === "absence" ? "En pause"
                : l.etat === "pas_de_seance" ? "Pas de séance ce jour-là"
                : l.etat === "passe_sans" ? "Passé sans séance"
                : "Libre"}
            </span>
            {laFaireAujourdhui && (
              <span role="button" tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onLancerTete(); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onLancerTete(); } }}
                className="text-[13px] font-semibold flex items-center gap-0.5" style={{ color: "var(--exp-encre)" }}>
                La faire aujourd&apos;hui <ChevronRight size={13} strokeWidth={2.4} />
              </span>
            )}
          </button>
        ) : l.elements.map((el, n) => (
          <ElementLigne key={n} element={el} touchable={!lectureSeule && el.genre !== "fait" && el.genre !== "realisee"} onOuvrir={() => onOuvrir(el)} />
        ))}
      </div>
    </div>
  );
}

function ElementLigne({ element: el, touchable, onOuvrir }: {
  element: ElementJour<EtapeCycle>;
  touchable: boolean;
  onOuvrir: () => void;
}) {
  /* Tour 42 · une réservation se montre par SON intention : le vrai titre,
     même substitué. La projection n'apporte que son conflit. */
  const intention = el.genre === "realisee" ? null : el.genre === "prevu" ? el.intention : el.intention;
  const titre = el.genre === "realisee" ? el.seance.titre
    : intention ? dayTitle(intention)
    : el.genre === "prevu" ? el.projete.etape.nom : "";
  const duree = el.genre === "realisee" ? (el.seance.dureeMin ?? 45)
    : el.genre === "prevu" && !intention ? (el.projete.etape.dureeMin ?? 45)
    : intention?.type === "HIIT" ? 30 : 45;
  const art = resolveArt({ title: titre });
  const p = el.genre === "prevu" ? el.projete : null;
  const fait = el.genre === "fait" || el.genre === "realisee";
  const sous = fait ? null
    : p?.conflit ? CONFLITS[p.conflit]
    : p?.attendaitLe ? libelleAttente(p.attendaitLe)
    : p?.reservee || (el.genre === "pose" && !!el.intention.etapeId) ? "réservée"
    : p ? "prévue" : null;
  /* ⚠️ Photos naturelles, toujours (verrou du 2026-07-13) : l'état se dit
     par le texte et le chrome, jamais par une photo atténuée. */
  return (
    <button disabled={!touchable} onClick={onOuvrir}
      className="flex items-center gap-2.5 text-left bg-transparent border-none p-0 w-full"
      style={{ cursor: touchable ? "pointer" : "default" }}>
      <Photo img={art.img} pos="center 22%" className="rounded-xl flex-shrink-0" style={{ width: 40, height: 40 }} />
      <span className="flex-1 min-w-0">
        <span className="block text-[16px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{titre}</span>
        <span className="block text-[13px] truncate" style={{ color: p?.attendaitLe ? "var(--exp-encre)" : "var(--text-3)" }}>
          <span className="vy-nombre">{duree}</span> min{sous ? ` · ${sous}` : ""}
        </span>
      </span>
      {fait ? (
        <span className="text-[13px] font-semibold flex items-center gap-1 flex-shrink-0" style={{ color: "var(--teal-encre)" }}>
          Faite <Check size={13} strokeWidth={3} />
        </span>
      ) : touchable ? (
        <ChevronRight size={15} strokeWidth={2.4} className="flex-shrink-0" style={{ color: "var(--text-3)" }} />
      ) : null}
    </button>
  );
}

/* ─── La feuille d'un jour : trois gestes, partout les mêmes ─────── */

function FeuilleJour({ cible, userId, programme, gen, aujourdhui, reservable, onClose, onLancerTete, onLancerIntention, onVersionCourte, onChoisirSeance, onResultat }: {
  cible: Cible;
  userId: string;
  programme: ProgrammeEtCycle | null;
  gen: GenInput | null;
  aujourdhui: string;
  /** Cette occurrence est-elle celle en attente de son étape ? (tour 42) */
  reservable: (etapeId: string, rang: number) => boolean;
  onClose: () => void;
  onLancerTete: () => void;
  onLancerIntention: (d: PlanningDay) => void;
  onVersionCourte?: (d: PlanningDay | null) => void;
  onChoisirSeance: (date: string, liberer: ALiberer) => void;
  onResultat: (r: ResultatGeste, ok: string) => void;
}) {
  const { ligne, element } = cible;
  const [vue, setVue] = useState<"gestes" | "jour" | "exos" | "autre">("gestes");
  const [exos, setExos] = useState<string[] | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const p: JourProjete<EtapeCycle> | null = element?.genre === "prevu" ? element.projete : null;
  /* Tour 42 · l'intention qui porte la réservation vient de la ligne
     elle-même, associée par identité, jamais retrouvée par l'étape. */
  const reservation = element?.genre === "prevu" ? element.intention : null;
  const pose = element?.genre === "pose" ? element.intention : null;
  const titre = reservation ? dayTitle(reservation) : p ? p.etape.nom : pose ? dayTitle(pose)
    : ligne.etat === "pas_de_seance" ? "Pas de séance ce jour-là" : "Libre";
  const jourLong = new Date(ligne.date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  /* « Changer de jour » : une réservation se déplace ; une prévision ne se
     réserve que si elle est l'occurrence en attente de son étape. */
  /* Revue finale (P2) · une réservation en conflit ce jour-là ne se lance
     pas comme si de rien n'était : on dit le conflit, et « La faire quand
     même » est un choix explicite. */
  const faisableBrut = !!((p && element?.genre === "prevu" && (element.proposee || reservation)) || pose);
  const faisable = faisableBrut && !p?.conflit;
  const outrePasse = faisableBrut && !!p?.conflit;
  const peutChanger = !!p && !p.conflit && (p.reservee ? !!reservation : reservable(p.etape.id, p.rang));

  const geste = async (f: () => Promise<ResultatGeste>, ok: string) => {
    if (envoi) return;
    setEnvoi(true);
    const r = await f();
    onResultat(r, ok);
  };

  const voirExos = async () => {
    setVue("exos");
    if (exos) return;
    /* Une réservation montre SA prescription figée, jamais le modèle du
       lieu d'aujourd'hui. */
    if (reservation) { setExos((reservation.exerciseList ?? []).map((e) => e.name)); return; }
    if (!p || !gen || !programme) return;
    /* Revue finale (P2) · une prévision montre les exercices de SON
       occurrence (variété R7 selon son passage), ceux qui seront réservés
       et lancés, jamais le modèle brut. */
    const ctx = contexteDe(gen);
    const [m, variete] = await Promise.all([modeleDeLEtape({ id: p.etape.id, nom: p.etape.nom }, ctx), lireVariete(userId)]);
    if (!m || !variete) { setExos([]); return; }
    const occ = modeleDeLOccurrence(m, { id: p.etape.id, rang: p.rang }, ctx, variete, programme.cycle.length);
    setExos(projeterPrescription(occ.lignes).map((e) => e.name));
  };

  return (
    <FeuilleBas onClose={onClose} niveau={106}>
      <div className="px-5 pt-1 pb-3 flex items-start justify-between flex-shrink-0">
        <div className="min-w-0">
          <p className="vy-sous truncate" style={{ color: "var(--text-0)" }}>{titre}</p>
          <p className="vy-label mt-0.5" style={{ color: "var(--text-3)" }}>
            {jourLong.charAt(0).toUpperCase() + jourLong.slice(1)}
            {p ? (p.reservee ? " · réservée" : " · prévue") : ""}
          </p>
        </div>
        <button onClick={onClose} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center cursor-pointer bg-transparent border-none">
          <X size={16} style={{ color: "var(--text-3)" }} />
        </button>
      </div>

      <div className="overflow-y-auto px-5 flex-1" style={{ scrollbarWidth: "none", paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        {vue === "jour" ? (
          <ChoixJour onChoisir={(date) => {
            if (!p || !programme || !gen) return;
            void geste(() => changerDeJour({
              userId,
              cible: { programmeId: programme.programme.id, etapeId: p.etape.id, rang: p.rang, date: ligne.date, reservationId: reservation?.id ?? null },
              vers: date, aujourdhui, gen,
            }), "C’est noté ✓");
          }} />
        ) : vue === "autre" ? (
          <div>
            <p className="vy-corps" style={{ color: "var(--text-1)" }}>
              Tu choisis une séance du catalogue pour ce jour. « {titre} » passera au prochain jour d&apos;entraînement : elle n&apos;est ni faite, ni sautée.
            </p>
            <motion.button whileTap={{ scale: 0.97 }} disabled={envoi}
              onClick={() => onChoisirSeance(ligne.date, reservation?.id ? { id: reservation.id, date: ligne.date } : null)}
              className="w-full mt-4 py-3 rounded-2xl text-[16px] font-extrabold text-white cursor-pointer border-none"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}>
              Choisir la séance
            </motion.button>
            <button onClick={() => setVue("gestes")} className="w-full py-2 mt-1 text-[13px] font-semibold bg-transparent border-none cursor-pointer" style={{ color: "var(--text-2)" }}>
              Garder « {titre} »
            </button>
          </div>
        ) : vue === "exos" ? (
          <div>
            {exos === null ? (
              <p className="vy-corps" style={{ color: "var(--text-3)" }}>Je prépare la liste…</p>
            ) : exos.length === 0 ? (
              <p className="vy-corps" style={{ color: "var(--text-3)" }}>Les exercices se fixent quand tu la prépares.</p>
            ) : exos.map((n, i) => (
              <p key={i} className="text-[16px] py-2" style={{ color: "var(--text-1)", borderTop: i ? "1px solid rgba(var(--text-3-rgb),0.12)" : "none" }}>{n}</p>
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {/* L'action principale, quand il y en a une. */}
            {faisable ? (
              <motion.button whileTap={{ scale: 0.97 }} disabled={envoi}
                onClick={() => {
                  if (pose) onLancerIntention(pose);
                  else if (reservation) onLancerIntention(reservation);
                  else onLancerTete();
                }}
                className="w-full mb-2 py-3 rounded-2xl text-[16px] font-extrabold text-white cursor-pointer border-none flex items-center justify-center gap-1.5"
                style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}>
                <Play size={15} fill="#fff" /> La faire maintenant
              </motion.button>
            ) : null}

            {outrePasse && p?.conflit && (
              <Geste icone={<Play size={16} />} label="La faire quand même" sous={CONFLITS[p.conflit]}
                disabled={envoi} onClick={() => { if (reservation) onLancerIntention(reservation); else onLancerTete(); }} />
            )}

            {/* R8 · la même séance, pour le temps qu'on a (maquette 08 écran 07 :
                « Version courte » s'ajoute ici avec la durée libre). Seulement
                quand elle peut se faire maintenant, comme le bouton du dessus. */}
            {faisable && onVersionCourte && (
              <Geste icone={<Timer size={16} />} label="Version courte" sous="Pour le temps que tu as"
                disabled={envoi} onClick={() => onVersionCourte(pose ?? reservation ?? null)} />
            )}
            {peutChanger && (
              <Geste icone={<ArrowLeftRight size={16} />} label="Changer de jour" onClick={() => setVue("jour")} />
            )}
            {/* ⚠️ Tour 42 · CE N'EST PAS UNE SUBSTITUTION, et le nom le dit.
                Rien n'est retiré avant que la nouvelle séance soit
                enregistrée ; annuler le catalogue ne change rien. */}
            {p && (
              <Geste icone={<ArrowLeftRight size={16} style={{ transform: "rotate(90deg)" }} />}
                label="Mettre une autre séance ce jour-là" disabled={envoi} onClick={() => setVue("autre")} />
            )}
            {!p && !pose && (ligne.etat === "libre" || ligne.etat === "occupe") && (
              <Geste icone={<Plus size={16} />} label="Choisir une séance" disabled={envoi}
                onClick={() => onChoisirSeance(ligne.date, null)} />
            )}
            {p && (
              <Geste icone={<Minus size={16} />} label="Pas d’entraînement ce jour-là" sous="La séance passe au jour suivant"
                disabled={envoi}
                onClick={() => void geste(() => retirerLeJour(userId, ligne.date, reservation?.id ?? null, ligne.enPlus ? "seance_en_plus" : null), "Jour retiré, la séance passe au suivant")} />
            )}
            {ligne.etat === "pas_de_seance" && (
              <Geste icone={<Plus size={16} />} label="Remettre ce jour" disabled={envoi}
                onClick={() => void geste(() => regleDuJour(userId, ligne.date, null), "Jour remis ✓")} />
            )}
            {ligne.etat === "libre" && !ligne.entrainement && (
              <Geste icone={<Plus size={16} />} label="M’entraîner ce jour-là" sous="Seulement cette semaine" disabled={envoi}
                onClick={() => void geste(() => regleDuJour(userId, ligne.date, "seance_en_plus"), "Jour ajouté ✓")} />
            )}
            {ligne.enPlus && !p && (
              <Geste icone={<Minus size={16} />} label="Retirer ce jour en plus" disabled={envoi}
                onClick={() => void geste(() => regleDuJour(userId, ligne.date, null), "Jour retiré ✓")} />
            )}
            {p && (
              <Geste icone={<ListChecks size={16} />} label="Voir les exercices" onClick={() => void voirExos()} />
            )}
          </div>
        )}
      </div>
    </FeuilleBas>
  );
}

function Geste({ icone, label, sous, onClick, disabled }: {
  icone: React.ReactNode; label: string; sous?: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex items-center gap-3 py-3 text-left bg-transparent border-none cursor-pointer w-full"
      style={{ borderTop: "1px solid rgba(var(--text-3-rgb),0.12)", opacity: disabled ? 0.5 : 1 }}>
      <span className="w-8 h-8 rounded-[var(--r-controle)] flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(var(--accent-rgb),0.1)", color: "var(--exp-encre)" }}>{icone}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[16px] font-semibold" style={{ color: "var(--text-1)" }}>{label}</span>
        {sous && <span className="block text-[13px]" style={{ color: "var(--text-3)" }}>{sous}</span>}
      </span>
      <ChevronRight size={15} strokeWidth={2.4} style={{ color: "var(--text-3)" }} />
    </button>
  );
}

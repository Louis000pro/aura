"use client";

/* ════════════════════════════════════════════════════════════════════
   LE FIL DES DEUX SEMAINES (maquette « Entraînement repensé », lot 1)

   La vue Planning d'Entraînement. Une ligne par jour, sur deux
   semaines : la date en chiffre, un rail, et la séance avec sa photo et
   la raison de sa place. Ce qui est fait est en teal, aujourd'hui est mis
   en lumière, SANS gros bouton : la séance du jour se lance depuis
   l'accueil (Louis, 2026-11-09 : pas de doublon).

   Il remplace « Ma semaine » (R9b), qui était une feuille ouverte depuis
   une bande de sept pastilles. Les règles n'ont pas bougé et ne vivent
   pas ici :
   · les lignes viennent de `lignesSemaine` (pure) ;
   · la projection de `resolutionDuProgramme`, la même que l'accueil et
     le Guide ;
   · chaque geste de `semaineGestes`, qui relit avant d'écrire.

   ⚠️ « JE NE SAIS PAS » N'EST PAS « RIEN ». Une lecture ratée affiche
   « Je n'arrive pas à lire ton planning » et « Réessayer », jamais deux
   semaines vides.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, GripVertical } from "lucide-react";
import { Photo } from "@/components/entrainement/PhotoSeance";
import { resolveArt } from "@/lib/workoutArt";
import { dayTitle, fetchRange, type GenInput, type PlanningDay } from "@/lib/planning";
import type { EtapeCycle, ProgrammeEtCycle } from "@/lib/programme";
import { resolutionDuProgramme, type ResolutionProgramme } from "@/lib/projectionBase";
import { decaler } from "@/lib/projection";
import { ABR_JOURS, lignesSemaine, semaineDe, type ElementJour, type LigneSemaine, type SeanceJournal } from "@/lib/semaine";
import { changerDeJour, echangerDeJour, lireJournal, type CibleAffichee, type ResultatGeste } from "@/lib/semaineGestes";
import { rangEnAttente } from "@/lib/occurrences";
import FeuilleJour, { type Cible } from "@/components/planning/FeuilleJour";
import { RAISONS, descriptionElement, type ALiberer } from "@/components/planning/ligneSeance";
import { BANDE, genreDe } from "@/components/situations/BilletsMoment";
import { situationsDuJour, type Situation } from "@/lib/situations";
import { creerSituation, modifierSituation } from "@/lib/situationsBase";
import { enregistrerJours } from "@/lib/joursEntrainement";
import { ecrireReglages } from "@/lib/reglagesProgramme";
import { useReglagesProgramme } from "@/hooks/useReglagesProgramme";
import { useGuideActif } from "@/context/GuideContext";
import { EVT_JOURNEE } from "@/lib/finSeance";
import { propositionDuMoment, type Proposition } from "@/lib/propositionsGuide";
import { lireEcartees, lireFaitsPropositions, noterEcartee, type FaitsLus } from "@/lib/propositionsBase";
import PropositionGuide from "@/components/planning/PropositionGuide";

export type { ALiberer };

type Donnees = { intentions: PlanningDay[]; journal: SeanceJournal[]; proj: ResolutionProgramme };

export default function FilPlanning({
  userId, programme, gen, aujourdhui, relecture, situations,
  onLancerTete, onLancerIntention, onLancerCourt, onChoisirSeance, onDemander, onOuvrirProgramme, onChange,
}: {
  userId: string;
  programme: ProgrammeEtCycle | null;
  gen: GenInput | null;
  aujourdhui: string;
  /** Change quand l'écran a relu sa journée : le fil se relit aussi. */
  relecture: unknown;
  /** Lot 2 · les situations « En ce moment » : une bande le long des
   *  jours qu’elles touchent, et une ligne sur la séance qu’elles changent. */
  situations: Situation[] | null;
  onLancerTete: () => void;
  onLancerIntention: (d: PlanningDay) => void;
  /** La séance de ce jour, pour le temps qu'on a. `null` = la tête. */
  onLancerCourt: (d: PlanningDay | null, minutes: number) => void;
  onChoisirSeance: (date: string, liberer: ALiberer) => void;
  /** Ouvre la conversation, la phrase déjà écrite dans la saisie. */
  onDemander: (phrase: string) => void;
  /** Lot 5 · « Ouvrir mon programme », depuis une proposition du Guide. */
  onOuvrirProgramme: () => void;
  onChange: () => void;
}) {
  const { guide } = useGuideActif();
  const reglages = useReglagesProgramme(userId);
  const [faits, setFaits] = useState<FaitsLus | null>(null);
  const [ecartees, setEcartees] = useState<Set<string>>(() => (typeof window === "undefined" ? new Set() : lireEcartees(userId)));
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [illisible, setIllisible] = useState(false);
  const [lecture, setLecture] = useState(0);
  const [cible, setCible] = useState<Cible | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const semaines = useMemo(() => {
    const a = semaineDe(aujourdhui);
    return [a, semaineDe(decaler(a[0], 7))];
  }, [aujourdhui]);

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
  }, [userId, programme, aujourdhui, semaines, lecture, relecture]);

  const relire = useCallback(() => setLecture((n) => n + 1), []);

  /* Lot 5 · les faits des propositions du Guide. Une lecture ratée rend
     `null` : aucune proposition plutôt qu'une proposition fausse. */
  useEffect(() => {
    let vivant = true;
    void lireFaitsPropositions(userId, programme?.programme.id ?? null, programme?.cycle ?? []).then((f) => { if (vivant) setFaits(f); });
    return () => { vivant = false; };
  }, [userId, programme, lecture, relecture]);

  const lignes = useMemo(() => {
    if (!donnees) return null;
    const res = donnees.proj.resolution;
    return semaines.map((dates) => lignesSemaine<EtapeCycle>({
      dates, aujourdhui,
      intentions: donnees.intentions,
      projetes: res?.jours ?? [],
      journal: donnees.journal,
      calendrier: donnees.proj.calendrier,
      rangPropose: res?.proposee?.rang ?? null,
    }));
  }, [donnees, semaines, aujourdhui]);

  const proposee = donnees?.proj.resolution?.proposee ?? null;
  const proposeeAilleurs = !!proposee && proposee.date !== aujourdhui;

  /* Lot 5 · la proposition du moment : une seule, posée sur son jour. */
  const proposition = useMemo<Proposition | null>(() => {
    if (!donnees || !lignes || !faits || situations === null || reglages === undefined) return null;
    const ligneAuj = lignes.flat().find((l) => l.date === aujourdhui);
    const durees = (programme?.cycle ?? []).map((e) => e.dureeMin).filter((d): d is number => typeof d === "number");
    return propositionDuMoment({
      aujourdhui,
      calendrier: donnees.proj.calendrier,
      proposee: proposee?.date ? { etapeId: proposee.etape.id, nom: proposee.etape.nom, date: proposee.date, attendaitLe: proposee.attendaitLe } : null,
      aujourdhuiLibre: !!ligneAuj && ligneAuj.elements.length === 0,
      joursFaits: faits.joursFaits,
      derniereSeance: faits.derniereSeance,
      situations,
      etapesRefermees: faits.etapesRefermees,
      dureePrevue: durees.length > 0 ? Math.round(durees.reduce((n, d) => n + d, 0) / durees.length) : 45,
      dureeVisee: reglages?.dureeMin ?? null,
      variete: reglages?.variete ?? null,
      programmeDepuis: faits.programmeDepuis,
      vues: ecartees,
    }, guide);
  }, [donnees, lignes, faits, situations, reglages, aujourdhui, programme, proposee, ecartees, guide]);

  const ecarter = useCallback((cle: string) => {
    noterEcartee(userId, cle);
    setEcartees((v) => new Set(v).add(cle));
  }, [userId]);

  /* Une prévision ne se réserve que si elle est l'occurrence en attente
     de son étape (tour 42) ; une réservation se déplace toujours. */
  const reservable = useCallback((etapeId: string, rang: number) =>
    !!programme && !!donnees?.proj.etat && rangEnAttente(programme.cycle, donnees.proj.etat, etapeId) === rang,
  [programme, donnees]);

  const deplacable = useCallback((el: ElementJour<EtapeCycle> | null): el is Extract<ElementJour<EtapeCycle>, { genre: "prevu" }> => {
    if (!el || el.genre !== "prevu") return false;
    const p = el.projete;
    if (p.conflit) return false;
    return p.reservee ? !!el.intention : reservable(p.etape.id, p.rang);
  }, [reservable]);

  const cibleDe = useCallback((el: Extract<ElementJour<EtapeCycle>, { genre: "prevu" }>, date: string): CibleAffichee | null => {
    if (!programme) return null;
    return { programmeId: programme.programme.id, etapeId: el.projete.etape.id, rang: el.projete.rang, date, reservationId: el.intention?.id ?? null };
  }, [programme]);

  const dire = useCallback((t: string) => {
    setMessage(t);
    setTimeout(() => setMessage(null), 2800);
  }, []);

  const apres = useCallback((r: ResultatGeste, ok: string) => {
    setCible(null);
    dire(r.ok ? ok : RAISONS[r.raison]);
    relire();
    onChange();
  }, [dire, relire, onChange]);

  /** Glisser (ou choisir un jour dans la feuille) : déplace, ou échange
   *  si le jour visé porte déjà une séance du programme. */
  const deplacer = useCallback(async (de: { element: Extract<ElementJour<EtapeCycle>, { genre: "prevu" }>; date: string }, vers: string) => {
    if (!gen || !lignes || envoi) return;
    const a = cibleDe(de.element, de.date);
    if (!a) return;
    const ligneVers = lignes.flat().find((l) => l.date === vers);
    const occupant = ligneVers?.elements.find((e) => deplacable(e)) ?? null;
    setEnvoi(true);
    try {
      const nomA = de.element.intention ? dayTitle(de.element.intention) : de.element.projete.etape.nom;
      const jourVers = new Date(vers + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long" });
      if (occupant && occupant.genre === "prevu") {
        const b = cibleDe(occupant, vers);
        if (!b) return;
        const nomB = occupant.intention ? dayTitle(occupant.intention) : occupant.projete.etape.nom;
        const jourDe = new Date(de.date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long" });
        const r = await echangerDeJour({ userId, a, b, aujourdhui, gen });
        apres(r, `${nomA} passe à ${jourVers}, ${nomB} prend ${jourDe}.`);
      } else {
        const r = await changerDeJour({ userId, cible: a, vers, aujourdhui, gen });
        apres(r, `${nomA} passe à ${jourVers}. Les autres séances suivent.`);
      }
    } finally {
      setEnvoi(false);
    }
  }, [gen, lignes, envoi, cibleDe, deplacable, userId, aujourdhui, apres]);

  /** Lot 5 · le bouton d'une proposition : il agit tout de suite, par
   *  l'écriture qui existe déjà pour ce geste. */
  const agir = useCallback(async (p: Proposition) => {
    const a = p.action;
    if (a.genre === "reprendre_court") { ecarter(p.cle); onLancerCourt(null, a.minutes); return; }
    if (a.genre === "ouvrir_programme") { ecarter(p.cle); onOuvrirProgramme(); return; }
    if (a.genre === "voir_suite") return;
    if (a.genre === "faire_aujourdhui") {
      const el = lignes?.flat().flatMap((l) => l.elements.map((e) => ({ e, date: l.date })))
        .find((x) => x.e.genre === "prevu" && x.e.proposee);
      if (el && el.e.genre === "prevu") { ecarter(p.cle); await deplacer({ element: el.e, date: el.date }, aujourdhui); }
      else dire(RAISONS.changee);
      return;
    }
    setEnvoi(true);
    let ok = false;
    let texte = "";
    try {
      if (a.genre === "raccourcir_semaine") {
        ok = (await creerSituation(userId, { debut: aujourdhui, fin: a.fin, reglages: { genre: "moins_de_temps", minutes: a.minutes } })).ok;
        texte = `Tes séances passent à ${a.minutes} min jusqu’à dimanche.`;
      } else if (a.genre === "prolonger_situation") {
        const s = a.situation;
        ok = (await modifierSituation(userId, s.id, { debut: s.debut, fin: a.fin, reglages: s.reglages, motif: s.motif })).ok;
        texte = "C’est prolongé d’une semaine.";
      } else if (a.genre === "duree_visee") {
        ok = await ecrireReglages(userId, { duree_cible_min: a.minutes });
        texte = `Ton programme vise maintenant ${a.minutes} min par séance.`;
      } else if (a.genre === "renouveler") {
        ok = await ecrireReglages(userId, { variete: "peu" });
        texte = "Tes prochaines séances changeront quelques exercices secondaires.";
      } else if (a.genre === "changer_jours") {
        ok = await enregistrerJours(userId, a.jours, aujourdhui).then(() => true, () => false);
        if (ok && typeof window !== "undefined") window.dispatchEvent(new Event(EVT_JOURNEE));
        texte = "Tes jours sont changés. Les séances suivent.";
      }
    } finally {
      setEnvoi(false);
    }
    if (ok) { ecarter(p.cle); dire(texte); relire(); onChange(); }
    else dire(RAISONS.echec);
  }, [ecarter, onLancerCourt, onOuvrirProgramme, lignes, deplacer, aujourdhui, dire, userId, relire, onChange]);

  /* ── Le glisser, par la poignée ──
     Une copie de la ligne suit le doigt ; le jour sous le doigt s'allume
     s'il peut la recevoir (aujourd'hui ou plus tard, pas un jour d'absence,
     pas un jour déjà fait). Rien ne s'écrit avant de lâcher. */
  const [glisse, setGlisse] = useState<{ element: Extract<ElementJour<EtapeCycle>, { genre: "prevu" }>; date: string; y: number; dy: number; largeur: number; gauche: number; vers: string | null } | null>(null);
  const glisseRef = useRef(glisse);
  useEffect(() => { glisseRef.current = glisse; }, [glisse]);

  const recevable = useCallback((date: string, de: string) => {
    if (date === de || date < aujourdhui || !lignes) return false;
    const l = lignes.flat().find((x) => x.date === date);
    if (!l || l.etat === "absence") return false;
    return !l.elements.some((e) => e.genre === "fait" || e.genre === "realisee");
  }, [aujourdhui, lignes]);

  const debutGlisse = (e: React.PointerEvent, element: Extract<ElementJour<EtapeCycle>, { genre: "prevu" }>, date: string) => {
    if (envoi) return;
    e.preventDefault();
    const ligne = (e.currentTarget as HTMLElement).closest("[data-seance]") as HTMLElement | null;
    const r = ligne?.getBoundingClientRect();
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* sans capture, le geste marche quand même */ }
    setGlisse({ element, date, y: e.clientY, dy: r ? e.clientY - r.top : 30, largeur: r?.width ?? 300, gauche: r?.left ?? 0, vers: null });
  };
  const bougeGlisse = (e: React.PointerEvent) => {
    const g = glisseRef.current;
    if (!g) return;
    const sous = document.elementsFromPoint(e.clientX, e.clientY).find((n) => (n as HTMLElement).dataset?.jour) as HTMLElement | undefined;
    const date = sous?.dataset.jour ?? null;
    setGlisse({ ...g, y: e.clientY, vers: date && recevable(date, g.date) ? date : null });
  };
  const finGlisse = () => {
    const g = glisseRef.current;
    setGlisse(null);
    if (g?.vers) void deplacer({ element: g.element, date: g.date }, g.vers);
  };

  const cycle = programme?.cycle ?? null;

  return (
    <div className="relative" onPointerMove={glisse ? bougeGlisse : undefined} onPointerUp={glisse ? finGlisse : undefined} onPointerCancel={glisse ? () => setGlisse(null) : undefined}>
      {illisible ? (
        <div className="py-10 text-center">
          <p className="vy-corps" style={{ color: "var(--text-2)" }}>Je n&apos;arrive pas à lire ton planning pour l&apos;instant.</p>
          <button onClick={relire} className="mt-3 text-[13px] font-semibold bg-transparent border-none cursor-pointer" style={{ color: "var(--exp-encre)" }}>
            Réessayer
          </button>
        </div>
      ) : !lignes ? (
        <p className="vy-corps py-10 text-center" style={{ color: "var(--text-3)" }}>Je lis ton planning…</p>
      ) : (
        lignes.map((semaine, w) => {
          const faites = semaine.reduce((n, l) => n + l.elements.filter((e) => e.genre === "fait" || e.genre === "realisee").length, 0);
          const avenir = semaine.filter((l) => !l.passe).reduce((n, l) => n + l.elements.filter((e) => e.genre === "prevu" || e.genre === "pose").length, 0);
          const minutes = semaine.filter((l) => !l.passe).reduce((n, l) => n + l.elements
            .filter((e) => e.genre === "prevu" || e.genre === "pose")
            .reduce((m, e) => m + descriptionElement(e, cycle).duree, 0), 0);
          return (
            <section key={w} className="mt-5">
              <div className="flex items-baseline justify-between mb-1.5">
                <h2 className="text-[20px]" style={{ color: "var(--text-0)", fontWeight: 800, fontVariationSettings: "var(--w-voix)" }}>
                  {w === 0 ? "Cette semaine" : "Semaine prochaine"}
                </h2>
                <span className="text-[13px]" style={{ color: "var(--text-2)" }}>
                  {w === 0 ? (
                    <><b className="vy-nombre" style={{ color: "var(--text-0)" }}>{faites}</b> faite{faites > 1 ? "s" : ""} · <b className="vy-nombre" style={{ color: "var(--text-0)" }}>{avenir}</b> à venir</>
                  ) : (
                    <><b className="vy-nombre" style={{ color: "var(--text-0)" }}>{avenir}</b> séance{avenir > 1 ? "s" : ""}{minutes > 0 && <> · <DureeTotale minutes={minutes} /></>}</>
                  )}
                </span>
              </div>
              {semaine.map((l) => (
                <div key={l.date}>
                <LigneJour ligne={l} cycle={cycle}
                  situations={l.passe ? [] : situationsDuJour(situations ?? [], l.date)}
                  cible={glisse?.vers === l.date}
                  prise={glisse?.date === l.date ? glisse.element : null}
                  laFaireAujourdhui={l.aujourdhui && l.etat === "libre" && proposeeAilleurs && proposition?.genre !== "manquee"}
                  deplacable={deplacable}
                  onLancerTete={onLancerTete}
                  onPoignee={(e, el) => debutGlisse(e, el, l.date)}
                  onOuvrir={(element) => setCible({ ligne: l, element })} />
                {proposition && proposition.date === l.date && (
                  <div className="ml-[74px]">
                    <PropositionGuide proposition={proposition} guide={guide} envoi={envoi}
                      onGeste={() => void agir(proposition)}
                      onLaisser={() => ecarter(proposition.cle)}
                      onParler={() => { ecarter(proposition.cle); onDemander(proposition.parler); }} />
                  </div>
                )}
                </div>
              ))}
            </section>
          );
        })
      )}

      {/* La copie qui suit le doigt. */}
      {glisse && (
        <div className="fixed z-[95] pointer-events-none px-2 rounded-[18px]"
          style={{
            top: glisse.y - glisse.dy, left: glisse.gauche, width: glisse.largeur,
            background: "rgb(var(--surface-rgb))", boxShadow: "var(--ombre-flottant)",
          }}>
          <ElementLigne element={glisse.element} cycle={cycle} poignee={false} />
        </div>
      )}

      <AnimatePresence>
        {message && (
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            role="status"
            className="fixed left-1/2 -translate-x-1/2 bottom-28 z-[96] px-4 py-2 rounded-2xl text-[13px] font-medium text-center"
            style={{ background: "rgb(var(--surface-rgb))", boxShadow: "var(--ombre-flottant)", color: "var(--text-1)", maxWidth: "min(92vw, 420px)" }}>
            {message}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cible && donnees && lignes && (
          <FeuilleJour
            cible={cible}
            userId={userId}
            programme={programme}
            gen={gen}
            aujourdhui={aujourdhui}
            lignes={lignes.flat()}
            deplacable={deplacable}
            envoi={envoi}
            onClose={() => setCible(null)}
            onDeplacer={(el, vers) => void deplacer({ element: el, date: cible.ligne.date }, vers)}
            onLancerTete={() => { setCible(null); onLancerTete(); }}
            onLancerIntention={(d) => { setCible(null); onLancerIntention(d); }}
            onLancerCourt={(d, m) => { setCible(null); onLancerCourt(d, m); }}
            onChoisirSeance={(date, liberer) => { setCible(null); onChoisirSeance(date, liberer); }}
            onDemander={(phrase) => { setCible(null); onDemander(phrase); }}
            onResultat={apres}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DureeTotale({ minutes }: { minutes: number }) {
  if (minutes < 60) return <><b className="vy-nombre" style={{ color: "var(--text-0)" }}>{minutes}</b> min</>;
  return <><b className="vy-nombre" style={{ color: "var(--text-0)" }}>{Math.floor(minutes / 60)}</b> h <b className="vy-nombre" style={{ color: "var(--text-0)" }}>{String(minutes % 60).padStart(2, "0")}</b></>;
}

/* ─── Une ligne par jour ─────────────────────────────────────────── */

const RAIL_PREVU = "repeating-linear-gradient(to bottom, rgba(139,92,246,.42) 0 4px, transparent 4px 8px)";
const RAIL_FAIT = "rgba(43,212,160,.6)";

function LigneJour({ ligne, cycle, situations, cible, prise, laFaireAujourdhui, deplacable, onLancerTete, onPoignee, onOuvrir }: {
  ligne: LigneSemaine<EtapeCycle>;
  cycle: EtapeCycle[] | null;
  /** Les situations actives ce jour-là. */
  situations: Situation[];
  /** Le jour sous le doigt pendant un glisser. */
  cible: boolean;
  /** La séance qu'on est en train de glisser depuis ce jour. */
  prise: ElementJour<EtapeCycle> | null;
  laFaireAujourdhui: boolean;
  deplacable: (el: ElementJour<EtapeCycle> | null) => boolean;
  onLancerTete: () => void;
  onPoignee: (e: React.PointerEvent, el: Extract<ElementJour<EtapeCycle>, { genre: "prevu" }>) => void;
  onOuvrir: (element: ElementJour<EtapeCycle> | null) => void;
}) {
  const l = ligne;
  const fait = l.elements.some((e) => e.genre === "fait" || e.genre === "realisee");
  const prevu = l.elements.some((e) => e.genre === "prevu" || e.genre === "pose");
  const touchable = !l.passe;
  const date = new Date(l.date + "T00:00:00");
  const rail = l.aujourdhui
    ? `linear-gradient(to bottom, ${RAIL_FAIT} 0 50%, transparent 50%), ${RAIL_PREVU}`
    : l.passe ? RAIL_FAIT : RAIL_PREVU;

  let point: React.ReactNode = <i className="absolute rounded-full" style={{ left: 11, top: "50%", transform: "translate(-50%,-50%)", width: 5, height: 5, background: "var(--text-3)" }} />;
  if (fait) point = (
    <i className="absolute rounded-full grid place-items-center" style={{ left: 11, top: "50%", transform: "translate(-50%,-50%)", width: 18, height: 18, background: "#2BD4A0", color: "#fff" }}>
      <Check size={11} strokeWidth={3.2} />
    </i>
  );
  else if (l.aujourdhui) point = (
    <i className="absolute rounded-full" style={{ left: 11, top: "50%", transform: "translate(-50%,-50%)", width: 14, height: 14, background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "0 0 0 4px rgba(139,92,246,.2), 0 0 14px rgba(193,59,193,.55)" }} />
  );
  else if (prevu) point = (
    <i className="absolute rounded-full" style={{ left: 11, top: "50%", transform: "translate(-50%,-50%)", width: 12, height: 12, background: "rgb(var(--surface-rgb))", border: "2.5px solid #8B5CF6" }} />
  );

  const vide = l.etat === "absence" ? "Tu n’es pas là"
    : l.etat === "pas_de_seance" ? "Pas d’entraînement ce jour-là"
    : l.passe ? ""
    : l.aujourdhui ? "Aujourd’hui, rien de prévu"
    : "Libre";

  return (
    <div data-jour={l.date} className="grid relative rounded-2xl"
      style={{
        gridTemplateColumns: "38px 14px 22px minmax(0,1fr)", minHeight: 40,
        background: cible ? "rgba(139,92,246,.16)" : l.aujourdhui ? "linear-gradient(90deg, rgba(139,92,246,.13), rgba(139,92,246,.02) 85%)" : undefined,
        boxShadow: cible ? "inset 0 0 0 1.5px #8B5CF6" : undefined,
      }}>
      <div className="flex flex-col items-end justify-center pr-1" style={{ lineHeight: 1.05 }}
        aria-label={date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}>
        <span className="text-[11px] font-semibold" style={{ color: l.aujourdhui ? "var(--exp-encre)" : "var(--text-3)" }}>{ABR_JOURS[l.jour - 1]}</span>
        <b className="vy-nombre text-[16px]" style={{ color: l.aujourdhui ? "var(--exp-encre)" : l.passe ? "var(--text-3)" : "var(--text-1)" }}>{Number(l.date.slice(8, 10))}</b>
      </div>
      <div className="flex gap-[2px] justify-center" aria-hidden>
        {situations.map((s) => <i key={s.id} className="block" style={{ width: 4, ...BANDE[genreDe(s)] }} />)}
        {l.etat === "absence" && <i className="block" style={{ width: 4, ...BANDE.absence }} />}
      </div>
      <div className="relative" aria-hidden>
        <span className="absolute" style={{ left: 10, top: 0, bottom: 0, width: 2, background: rail }} />
        {point}
      </div>
      <div className="min-w-0 flex flex-col justify-center">
        {l.elements.length === 0 ? (
          <button disabled={!touchable} onClick={() => onOuvrir(null)}
            className="text-left bg-transparent border-none py-2 pl-1.5 flex items-center justify-between min-h-[40px]"
            style={{ cursor: touchable ? "pointer" : "default" }}>
            <span className="text-[13px]" style={{ color: "var(--text-3)" }}>{vide}</span>
            {laFaireAujourdhui && (
              <span role="button" tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onLancerTete(); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onLancerTete(); } }}
                className="text-[13px] font-semibold pr-1" style={{ color: "var(--exp-encre)" }}>
                La faire aujourd&apos;hui
              </span>
            )}
          </button>
        ) : l.elements.map((el, n) => {
          const peutBouger = !l.passe && deplacable(el);
          return (
            <div key={n} data-seance style={{ opacity: prise === el ? 0.25 : 1 }}>
              <ElementLigne element={el} cycle={cycle} situations={situations}
                touchable={!l.passe && el.genre !== "fait" && el.genre !== "realisee"}
                poignee={peutBouger}
                onPoignee={peutBouger && el.genre === "prevu" ? (e) => onPoignee(e, el) : undefined}
                onOuvrir={() => onOuvrir(el)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ElementLigne({ element: el, cycle, situations = [], touchable = false, poignee, onPoignee, onOuvrir }: {
  element: ElementJour<EtapeCycle>;
  cycle: EtapeCycle[] | null;
  situations?: Situation[];
  touchable?: boolean;
  poignee: boolean;
  onPoignee?: (e: React.PointerEvent) => void;
  onOuvrir?: () => void;
}) {
  const d = descriptionElement(el, cycle);
  const art = resolveArt({ title: d.titre });
  const note = d.fait ? null : noteSituation(situations, d.duree, el.genre === "prevu" && !el.intention);
  /* ⚠️ Photos naturelles, toujours (verrou du 2026-07-13) : l'état se dit
     par le texte et le chrome, jamais par une photo atténuée. */
  return (
    <div className="flex items-center w-full min-w-0">
      <button disabled={!touchable} onClick={onOuvrir}
        className="flex items-center gap-[11px] text-left bg-transparent border-none py-[7px] pl-1.5 flex-1 min-w-0"
        style={{ cursor: touchable ? "pointer" : "default" }}>
        <Photo img={art.img} pos="center 22%" className="flex-shrink-0" style={{ width: 50, height: 50, borderRadius: 15 }} />
        <span className="flex-1 min-w-0" style={{ lineHeight: 1.25 }}>
          <span className="block text-[16px] font-bold truncate" style={{ color: d.fait ? "var(--teal-encre)" : "var(--text-0)", fontVariationSettings: "var(--w-nombre)" }}>{d.titre}</span>
          <span className="block text-[13px] truncate" style={{ color: "var(--text-2)" }}>
            {d.fait ? <>fait · <span className="vy-nombre">{d.duree}</span> min</>
              : <><span className="vy-nombre">{d.duree}</span> min{d.nbExos > 0 && <> · <span className="vy-nombre">{d.nbExos}</span> exercices</>}</>}
          </span>
          {note && (
            <span className="flex items-center gap-[5px] text-[11px] font-semibold truncate mt-px" style={{ color: note.genre === "moins_de_temps" ? "var(--feu-encre)" : "var(--exp-encre)" }}>
              <i aria-hidden className="block flex-none rounded-[2px]" style={{ width: 8, height: 8, ...BANDE[note.genre] }} />{note.texte}
            </span>
          )}
          {!d.fait && d.raison && (
            <span className="block text-[11px] font-semibold truncate mt-px" style={{ color: d.p?.conflit ? "var(--feu-encre)" : "var(--exp-encre)" }}>{d.raison}</span>
          )}
        </span>
      </button>
      {poignee && (
        <span role="button" tabIndex={-1} aria-label={`Déplacer ${d.titre}`}
          onPointerDown={onPoignee}
          className="flex-shrink-0 grid place-items-center"
          style={{ width: 30, height: 44, color: "var(--text-3)", touchAction: "none", cursor: "grab" }}>
          <GripVertical size={16} />
        </span>
      )}
    </div>
  );
}

/** Ce qu'une situation change sur cette séance, en une ligne. La plus
 *  utile d'abord : la durée, puis la gêne, l'énergie, le matériel. */
function noteSituation(situations: Situation[], duree: number, seComposera: boolean): { genre: Situation["reglages"]["genre"]; texte: string } | null {
  for (const s of situations) {
    const r = s.reglages;
    if (r.genre === "moins_de_temps" && duree > r.minutes) return { genre: r.genre, texte: `${r.minutes} min au lieu de ${duree}` };
  }
  for (const s of situations) {
    const r = s.reglages;
    if (r.genre === "gene") return { genre: r.genre, texte: "adaptée à ta gêne" };
    if (r.genre === "energie") return { genre: r.genre, texte: "une série de moins par exercice" };
    if (r.genre === "materiel" && seComposera) return { genre: r.genre, texte: r.lieu === "halteres" ? "aux haltères" : "sans matériel" };
  }
  return null;
}

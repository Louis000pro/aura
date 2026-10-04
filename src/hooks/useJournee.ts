"use client";

/* ════════════════════════════════════════════════════════════════════
   V7A · CE QUE VAIIYA SAIT DE TA JOURNÉE, LU UNE SEULE FOIS.

   Le héros passe sur l'accueil, mais Entraînement garde sa semaine, son
   « Organiser » et son catalogue : les deux écrans lisent donc les mêmes
   lignes. Écrire deux lectures, c'était deux façons de décider si la
   journée est libre ou en repos, et deux occasions de diverger — celle
   qu'on paie déjà deux fois dans ce produit (l'EXP, la série).

   ⚠️ LIRE N'ÉCRIT RIEN (V5), À UNE EXCEPTION NOMMÉE. `creerProgramme`
   autorise la création du PREMIER programme, et il n'est vrai que sur
   Entraînement : c'est le repli pour les comptes qui ont répondu au
   questionnaire avant que celui-ci ne sache créer un programme. Ouvrir
   l'accueil ne crée jamais une structure, il la lit.

   ⚠️ CE HOOK NE DÉCIDE PAS DE CE QU'IL FAUT ÉCRIRE À LA FIN D'UNE
   SÉANCE. Il déclare ce qu'il lance (`CibleSeance`) ; c'est
   `terminerSeance` qui referme, depuis le lanceur global.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useWorkoutLaunch } from "@/context/WorkoutLaunchContext";
import { createClient } from "@/lib/supabase";
import { levelToDifficulty } from "@/lib/assistantActions";
import { heroImageForSeance } from "@/lib/workoutArt";
import { EVT_JOURNEE } from "@/lib/finSeance";
import { avecEtapeVerifiee, type ContexteEtape, etatJournee, intentionDeLEtape, lancementDuJour, libelleReservation, repetitionDuJour } from "@/lib/journee";
import {
  lireSemaine, saveDay, reservationDeLOccurrence, hasSeance, loadLieu, readVariant, ctxFromLieu,
  weekDates, todayYmd, dayTitle, parDate, principale, supplements, seancesDuJour,
  weekdayIndex, prochainsJours, contexteDe, appliquerRegleDuJour,
  type PlanningDay, type GenInput, type CycleSemaine,
} from "@/lib/planning";
import {
  getOrCreateProgramme, lireProgrammeActif, etapeSuivanteDe,
  type EtapeOccurrence, type ProgrammeEtCycle,
} from "@/lib/programme";
import {
  adaptationDuJour, etapeMasquee, etapesCompatibles, idsMasques, libelleJour,
  type Adaptation,
} from "@/lib/adaptation";
import type { EtatJournee } from "@/lib/journee";
import { projeterPrescription } from "@/lib/banqueEtapes";
import { ecrireOccurrence, modeleDeLEtape, type ModeleEtape } from "@/lib/prescription";

const DAY_FULL = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/** Traduit les objectifs de l'onboarding en libellés lisibles par le
 *  générateur. C'est la même table qu'avant, elle n'a pas bougé d'une
 *  entrée : elle a juste suivi la lecture qu'elle sert. */
const goalLabels: Record<string, string> = {
  masse: "Prise de masse", poids: "Perte de poids", sante: "Santé générale",
  force: "Force", endurance: "Endurance", souplesse: "Souplesse",
};

export type Journee = {
  /** L'état du héros. `loading` tant qu'on ne sait pas : on n'affirme
   *  jamais « rien de prévu » avant d'avoir lu. */
  etat: EtatJournee;
  /** L'intention PRINCIPALE du jour (l'étape du cycle d'abord, sinon la
   *  plus ancienne). Le héros n'a la place que pour une séance. */
  jour: PlanningDay | null;
  /** Ce qui vient EN PLUS aujourd'hui (V6b). */
  extras: PlanningDay[];
  etape: EtapeOccurrence | null;
  /** La réservation EN ATTENTE de l'étape suivante, où qu'elle soit datée
   *  (elle vit souvent hors de la semaine chargée). `null` = l'étape n'a
   *  pas encore de jour, et « quand tu veux » est alors la vérité. */
  reservation: PlanningDay | null;
  /** Le jour de cette réservation, dit à voix haute : « mardi 8 ». */
  reserveLe: string | null;
  /**
   * V8 · L'ADAPTATION QUI S'APPLIQUE AUJOURD'HUI, ou `null`.
   *
   * ⚠️ ELLE EST LUE, ELLE N'EST JAMAIS APPLIQUÉE AU PROGRAMME. Le cycle
   * persisté ne bouge pas d'une ligne : c'est la SÉLECTION de l'étape qui
   * la traverse. Quand l'adaptation expire, il n'y a donc rien à
   * réécrire, la lecture cesse simplement de filtrer.
   */
  adaptation: Adaptation | null;
  /** Sa fin, dite à voix haute : « 17 sept. ». `null` sans adaptation. */
  adaptationJusquau: string | null;
  /** Le cycle du programme actif et les étapes que l'adaptation masque,
   *  pour les DEUX chemins qui composent une semaine (« Refais ma
   *  semaine » et « refais ma semaine » dit au Guide). C'est lui qui leur
   *  donne de quoi écrire la provenance de chaque séance posée. `null`
   *  quand il n'y a pas de programme : la semaine se compose alors comme
   *  avant, sans lien. */
  cycleSemaine: CycleSemaine | null;
  /** La taille de l'instance de l'étape, calculée sans rien écrire. */
  nbExos: number;
  nextLabel: string | null;
  doneStats: { minutes: number; kcal: number } | null;
  semaine: PlanningDay[] | null;
  setSemaine: React.Dispatch<React.SetStateAction<PlanningDay[] | null>>;
  gen: GenInput | null;
  programme: ProgrammeEtCycle | null;
  besoinSetup: boolean;
  niveau: string | null;
  recharger: () => void;
  /** Lance la séance du jour : l'intention datée si elle existe, sinon
   *  l'étape du cycle, matérialisée à cet instant et jamais avant. */
  lancerAujourdhui: () => void;
  /** Lance une intention précise (un supplément, un autre jour). */
  lancerIntention: (d: PlanningDay, options?: { repetition?: boolean }) => void;
  /** Relance la séance DÉJÀ TERMINÉE aujourd'hui (« Refaire la séance »).
   *  C'est une répétition, donc un supplément : elle ne referme aucune
   *  étape et ne fait pas avancer le cycle. Ne fait rien s'il n'y a rien
   *  à refaire. */
  refaire: () => void;
  /** Donne un jour à la prochaine étape du cycle. L'intention créée PORTE
   *  son étape, donc la faire refermera bien le cycle. Rend `false` si
   *  l'écriture n'a pas pris. */
  daterEtape: (date: string) => Promise<boolean>;
};

export function useJournee({ creerProgramme = false }: { creerProgramme?: boolean } = {}): Journee {
  const { user } = useAuth();
  const { launchWorkout } = useWorkoutLaunch();

  const [semaine, setSemaine] = useState<PlanningDay[] | null>(null);
  const [pret, setPret] = useState(false);
  const [besoinSetup, setBesoinSetup] = useState(false);
  const [programme, setProgramme] = useState<ProgrammeEtCycle | null>(null);
  const [gen, setGen] = useState<GenInput | null>(null);
  const [etape, setEtape] = useState<EtapeOccurrence | null>(null);
  const [reservation, setReservation] = useState<PlanningDay | null>(null);
  /* R2 · le modèle de l'étape suivante pour ce lieu : écrit, ou composé
     en mémoire. `null` = pas d'étape, ou lecture ratée (on ne lance pas). */
  const [modele, setModele] = useState<ModeleEtape | null>(null);
  const [adaptation, setAdaptation] = useState<Adaptation | null>(null);
  const [niveau, setNiveau] = useState<string | null>(null);
  const [doneStats, setDoneStats] = useState<{ minutes: number; kcal: number } | null>(null);

  const today = todayYmd();
  const semaineDates = useMemo(() => weekDates(new Date(today + "T00:00:00")), [today]);

  const charger = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const { data: prof } = await supabase
      .from("profiles")
      .select("onboarding_level, onboarding_sessions_week, onboarding_goals")
      .eq("id", user.id)
      .maybeSingle();

    const aRepondu = !!(prof && (prof.onboarding_level || prof.onboarding_sessions_week
      || (Array.isArray(prof.onboarding_goals) && prof.onboarding_goals.length > 0)));
    const { location, equip } = await loadLieu(user.id);
    setNiveau(prof?.onboarding_level ?? null);

    if (!aRepondu) {
      // Vraiment rien à lire (onboarding pas fait) → héros de mise en route.
      setBesoinSetup(true);
      setSemaine(null);
      setPret(true);
      return;
    }
    /* Lieu OPTIONNEL : tant que la synchro cross-device n'a pas eu lieu, le
       localStorage de cet appareil peut être vide. On retombe sur le poids
       du corps et la personne affine son lieu via « Organiser ». */
    const reglages: GenInput = {
      ctx: ctxFromLieu(location, equip),
      sessions: prof!.onboarding_sessions_week ?? 3,
      goals: ((prof!.onboarding_goals as string[] | null) ?? []).map((g) => goalLabels[g] ?? g),
      level: prof!.onboarding_level,
      variant: readVariant(user.id),
      seed: user.id,
    };
    try {
      /* ⚠️ LIRE N'ÉCRIT PLUS RIEN (V5). Une semaine sans ligne est une
         semaine sans rien de prévu, et c'est une réponse valide. */
      setSemaine(await lireSemaine(user.id, weekDates()));
      setGen(reglages);
      setBesoinSetup(false);
    } catch (e) {
      console.error("Planning load error", e);
    }

    /* ⚠️ LE PROGRAMME NE NAÎT QUE LÀ OÙ ON L'AUTORISE (V7A). Il se crée
       normalement à la sortie du questionnaire, là où la personne vient
       de donner ses réponses. Ici c'est le REPLI, pour les comptes qui
       ont répondu avant que le questionnaire ne sache le faire — et il
       n'est armé que sur Entraînement. L'accueil, lui, lit. */
    try {
      const actif = creerProgramme
        ? await getOrCreateProgramme(user.id)
        : await lireProgrammeActif(user.id);
      setProgramme(actif);
      /* ⚠️ V8 · L'ADAPTATION SE LIT AVANT L'ÉTAPE, PARCE QU'ELLE DÉCIDE
         DE L'ÉTAPE. Une requête, et seulement s'il y a un programme :
         sans programme il n'y a pas de cycle à adapter. Elle est
         rattachée au programme ACTIF, donc une nouvelle version du
         programme cesse d'être adaptée d'elle-même, sans écriture. */
      const couche = actif ? await adaptationDuJour(user.id, actif.programme.id, todayYmd()) : null;
      setAdaptation(couche);
      const suivante = actif
        ? await etapeSuivanteDe(user.id, actif, (e) => etapeMasquee(e.id, couche))
        : null;
      setEtape(suivante);
      setModele(suivante
        ? await modeleDeLEtape({ id: suivante.id, nom: suivante.nom }, contexteDe(reglages))
        : null);
      /* ⚠️ ET ON DEMANDE À LA BASE SI CETTE ÉTAPE A DÉJÀ UN JOUR.
         C'est la réparation du défaut du 2026-09-06 : le héros ne
         regardait que les intentions D'AUJOURD'HUI, et `etapeSuivante`
         ne dérive son curseur que des étapes REFERMÉES. Une étape
         réservée pour mardi était donc invisible aux deux, et l'accueil
         la reproposait « quand tu veux » un dimanche. La chercher dans
         la semaine chargée ne suffit pas : depuis que le sélecteur
         propose quinze jours, elle vit souvent au-delà. Une requête, sur
         la clé de l'invariant lui-même, et seulement s'il y a une étape. */
      /* R6 · LA RÉSERVATION DE CETTE OCCURRENCE-LÀ, pas de l'étape en
         général : une occurrence = une ligne (`uniq_occurrence`). */
      setReservation(suivante && actif
        ? await reservationDeLOccurrence(user.id, actif.programme.id, suivante.rang)
        : null);
    } catch (e) {
      console.error("Programme load error", e);
    }
    setPret(true);
  }, [user, creerProgramme]);

  useEffect(() => { void charger(); }, [charger]);

  /* Se remet d'accord avec la base dès que quelqu'un d'autre a écrit :
     une fin de séance, l'orbe, « Organiser », un changement de lieu. */
  useEffect(() => {
    const handler = () => { void charger(); };
    window.addEventListener(EVT_JOURNEE, handler);
    window.addEventListener("lieu-updated", handler);
    return () => {
      window.removeEventListener(EVT_JOURNEE, handler);
      window.removeEventListener("lieu-updated", handler);
    };
  }, [charger]);

  const parJour = useMemo(() => parDate(semaine), [semaine]);
  const intentionsDuJour = useMemo(() => parJour[today] ?? [], [parJour, today]);
  const jour = principale(intentionsDuJour);
  const extras = useMemo(() => supplements(intentionsDuJour), [intentionsDuJour]);

  /* L'INSTANCE de l'étape : la PROJECTION de son modèle (R2). Rien n'est
     écrit tant que la séance n'est pas faite ou datée ; la copie se fige
     au lancement et voyage avec lui. */
  const instance = useMemo(
    () => (etape && modele ? projeterPrescription(modele.lignes) : []),
    [etape, modele],
  );

  /* ⚠️ « AUCUNE ÉTAPE COMPATIBLE » N'EST PAS « PAS DE PROGRAMME ». Les
     deux rendent `etape = null`, et l'écran ne dit pas du tout la même
     chose : sans programme, la journée est libre ; avec un programme
     entièrement masqué, c'est l'adaptation qui bloque, et il faut le
     dire au lieu d'écrire « rien de prévu » comme si personne n'avait
     rien décidé. */
  const adaptationBloque =
    !!adaptation && !!programme && programme.cycle.length > 0
    && etapesCompatibles(programme.cycle, adaptation).length === 0;

  const etat = etatJournee({ pret, besoinSetup, jour, etape, adaptationBloque });

  /* Ce qu'il faut pour composer une semaine QUI SAIT D'OÙ ELLE VIENT :
     le cycle avec ses identifiants, et les étapes que l'adaptation
     masque. Le masquage se fait donc par identifiant partout, jusque
     dans le générateur de semaine. */
  const cycleSemaine = useMemo<CycleSemaine | null>(
    () => (programme
      ? {
        programmeId: programme.programme.id,
        etapes: programme.cycle.map((e) => ({ id: e.id, nom: e.nom })),
        masquees: idsMasques(programme.cycle, adaptation),
      }
      : null),
    [programme, adaptation],
  );

  /* Prochaine séance de la semaine (états repos et libre) */
  const nextLabel = useMemo(() => {
    if (!semaine) return null;
    const demain = prochainsJours(2)[1];
    for (const date of semaineDates) {
      if (date <= today) continue;
      /* La prochaine séance À FAIRE de la journée, pas la première ligne :
         une journée peut porter une séance déjà faite et un extra prévu. */
      const suivante = seancesDuJour(parJour[date]).find((x) => x.status !== "done");
      if (suivante) {
        const when = date === demain ? "demain" : DAY_FULL[weekdayIndex(date)];
        return `${dayTitle(suivante)} · ${when}`;
      }
    }
    return null;
  }, [semaine, parJour, semaineDates, today]);

  /* Durée / kcal de la séance faite aujourd'hui (une seule petite requête) */
  useEffect(() => {
    if (etat !== "done" || !user) return;
    let annule = false;
    (async () => {
      const supabase = createClient();
      const debutDuJour = new Date(today + "T00:00:00").toISOString();
      const { data } = await supabase
        .from("workout_sessions")
        .select("duration_minutes, elapsed_seconds, calories_burned")
        .eq("user_id", user.id)
        .gte("started_at", debutDuJour)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!annule && data) {
        setDoneStats({
          minutes: data.elapsed_seconds ? Math.max(1, Math.round(data.elapsed_seconds / 60)) : (data.duration_minutes ?? 0),
          kcal: data.calories_burned ?? 0,
        });
      }
    })();
    return () => { annule = true; };
  }, [etat, user, today]);

  /* R6 · tours 15 et 16 · UN GESTE SUR L'ÉTAPE AFFICHÉE SE FAIT SUR UN
     CONTEXTE RELU, JAMAIS SUR CE QUE L'ÉCRAN GARDAIT. Le contexte entier
     (programme, occurrence, étape, adaptation tracée, étapes masquées) est
     relu en mode STRICT : une adaptation illisible n'est pas une
     adaptation absente. Différent de l'affiché → refus, l'écran se relit. */
  type ContexteHook = ContexteEtape & { occ: EtapeOccurrence; adaptationLue: Adaptation | null };
  const contexteAffiche = useMemo<ContexteHook | null>(() => (
    etape && programme ? {
      programmeId: programme.programme.id,
      etapeId: etape.id, rang: etape.rang, nom: etape.nom,
      adaptationId: adaptation?.id ?? null,
      masquees: idsMasques(programme.cycle, adaptation),
      occ: etape, adaptationLue: adaptation,
    } : null
  ), [etape, programme, adaptation]);

  const relireContexte = useCallback(async (): Promise<ContexteHook | null> => {
    if (!user || !programme) return null;
    const actif = await lireProgrammeActif(user.id);
    if (!actif || actif.programme.id !== programme.programme.id) return null;
    const couche = await adaptationDuJour(user.id, actif.programme.id, todayYmd(), "stricte");
    const occ = await etapeSuivanteDe(user.id, actif, (e) => etapeMasquee(e.id, couche));
    if (!occ) return null;
    return {
      programmeId: actif.programme.id,
      etapeId: occ.id, rang: occ.rang, nom: occ.nom,
      adaptationId: couche?.id ?? null,
      masquees: idsMasques(actif.cycle, couche),
      occ, adaptationLue: couche,
    };
  }, [user, programme]);

  /* Refusé : on le dit, et on relit pour que l'écran montre la vraie suite. */
  const refuser = useCallback((raison: "illisible" | "changee") => {
    console.warn("[journee] étape non vérifiée :", raison);
    if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT_JOURNEE));
  }, []);

  const lancerIntention = useCallback((d: PlanningDay, options?: { repetition?: boolean }) => {
    if (!hasSeance(d)) return;
    const titre = dayTitle(d);
    launchWorkout({
      sessionId: `planning-${d.id ?? d.date}`,
      title: titre,
      duration: d.type === "HIIT" ? 30 : 45,
      difficulty: d.difficulty,
      category: d.type,
      /* ⚠️ LA PHOTO SE RÉSOUT PAR LE TITRE, PAS PAR LA CATÉGORIE. Le
         `type` d'une intention est un libellé de planning (« Force »,
         « HIIT »), pas une catégorie de séance : le passer à `resolveArt`
         le ferait chercher une famille qui n'existe pas. Le titre suffit,
         et c'est déjà lui qui décide de la photo du héros. */
      heroImage: heroImageForSeance({ title: `${titre} ${d.type}` }),
      exerciseList: d.exerciseList,
      /* Sans identité, rien à refermer : une ligne sans `id` ne peut pas
         être marquée, et la marquer par sa date créditerait aussi le
         supplément du même jour (V6b).

         ⚠️ ET UNE RÉPÉTITION NE DÉCLARE AUCUNE CIBLE, C'EST CE QUI LA
         REND INOFFENSIVE. Refaire une séance déjà terminée en la visant
         par son `id` rejouerait `marquerIntention` sur elle : le fait
         d'origine verrait sa `date` et son `consommee_le` réécrits à
         l'instant de la répétition. Sans cible, la fin de séance n'écrit
         rien dans les intentions et le journal enregistre la séance pour
         ce qu'elle est, un supplément hors programme. */
      cible: !options?.repetition && d.id ? { genre: "intention", intentionId: d.id } : undefined,
    });
  }, [launchWorkout]);

  /* ⚠️ L'ÉTAT `done` NE PASSE PAS PAR `lancementDuJour`, ET C'EST LE
     CŒUR DU CORRECTIF. Cette résolution-là répond à « qu'est-ce qui
     vient ensuite » ; « Refaire la séance » demande l'inverse. Le bouton
     promettait donc une action et en exécutait une autre. */
  const refaire = useCallback(() => {
    const quoi = repetitionDuJour(jour);
    if (quoi) lancerIntention(quoi, { repetition: true });
  }, [jour, lancerIntention]);

  const lancerAujourdhui = useCallback(() => {
    /* ⚠️ LA DÉCISION EST UNE FONCTION PURE, ET ELLE VIT DANS `journee.ts`.
       Elle porte l'ordre qui compte : la séance datée aujourd'hui, puis
       la RÉSERVATION de l'étape où qu'elle soit posée, puis l'étape libre
       et elle seule. Décider dimanche de faire l'étape réservée mardi est
       légitime ; c'est cette ligne-là qu'on termine, jamais une seconde. */
    const quoi = lancementDuJour({ jour, reservation, etape, instancePrete: instance.length > 0 });
    if (quoi?.genre === "intention") { lancerIntention(quoi.intention); return; }
    /* Lancer une étape du cycle : on matérialise son instance À CET
       INSTANT, en mémoire, et on n'écrit RIEN. Si la séance n'est pas
       terminée, il n'en reste aucune trace. */
    if (!quoi || !etape || !programme) return;
    const difficulte = levelToDifficulty(gen?.level ?? null);
    /* ⚠️ UNE ÉTAPE LIBRE FERMERA UNE OCCURRENCE À LA FIN : on vérifie
       qu'elle est toujours la suite avant de la lancer (tour 15). */
    if (!contexteAffiche) return;
    void avecEtapeVerifiee(contexteAffiche, relireContexte, (c) => launchWorkout({
      sessionId: `etape-${c.etapeId}`,
      title: c.nom,
      duration: c.occ.dureeMin ?? 45,
      difficulty: difficulte,
      category: "Force",
      heroImage: heroImageForSeance({ title: c.nom }),
      exerciseList: instance,
      cible: {
        genre: "etape",
        programmeId: c.programmeId,
        etapeId: c.etapeId,
        /* R6 · l'occurrence est FIGÉE au lancement (décision 22) : la fin
           de séance ferme celle-ci, même si une autre a été fermée
           entre-temps. */
        rang: c.rang,
        adaptationId: c.adaptationId,
        type: "Force",
        title: c.nom,
        difficulty: difficulte,
        location: gen?.ctx ?? null,
        exerciseList: instance,
        /* R2 · la prescription FIGÉE à cet instant : la fin de séance (et
           son rejeu depuis l'attente locale) l'écrit telle quelle. */
        prescription: modele ? modele.lignes.map((l) => ({ ...l })) : null,
        modeleId: modele?.modeleId ?? null,
      },
    })).then((v) => { if (!v.ok) refuser(v.raison); });
  }, [jour, reservation, lancerIntention, etape, instance, modele, programme, gen, launchWorkout, contexteAffiche, relireContexte, refuser]);

  /* ⚠️ LE SEUL ENDROIT DU PRODUIT QUI DATE UNE ÉTAPE, ET DONC LE SEUL
     QUI CRÉE UNE INTENTION PORTANT SON LIEN VERS LE PROGRAMME. Sans ce
     lien, « Lui donner un jour » écrivait une séance ordinaire : on la
     faisait, elle passait « faite », et le cycle n'avançait pas — le
     héros reproposait la même étape le lendemain, indéfiniment. La
     consommation vient de l'INTENTION du geste, jamais du titre. */
  const daterEtape = useCallback(async (date: string): Promise<boolean> => {
    if (!user || !etape || !programme || !modele || instance.length === 0) return false;
    /* ⚠️ UNE SEULE RÉSERVATION PAR ÉTAPE, ET C'EST LA BASE QUI L'IMPOSE
       (`uniq_intention_par_etape`, V6). Redonner un jour à une étape déjà
       datée est donc un DÉPLACEMENT, pas un second ajout : sans ça, la
       base refuserait l'écriture et le geste échouerait sans rien dire.

       ⚠️ ET ON LA CHERCHE EN BASE, PAS DANS LA SEMAINE CHARGÉE. Depuis
       que le sélecteur propose quinze jours, la réservation peut vivre
       hors de la semaine courante, donc hors de tout ce que cet écran a
       lu : la chercher là aurait rendu le défaut intermittent, ce qui
       est pire qu'un défaut franc. */
    if (!contexteAffiche) return false;
    let v;
    try {
      /* ⚠️ L'ÉTAPE AFFICHÉE PEUT ÊTRE UN AFFICHAGE CONSERVÉ (tour 15) :
         on relit la suite avant d'écrire, et on refuse si on ne sait pas.
         Chercher la réservation ne remplace pas lire les occurrences. */
      v = await avecEtapeVerifiee(contexteAffiche, relireContexte, async (c) => {
      /* La lecture est DANS le `try` : elle interroge la base comme
         l'écriture, donc elle échoue de la même façon. */
      const dejaPosee = await reservationDeLOccurrence(user.id, c.programmeId, c.rang);
      /* R2 · UNE OCCURRENCE NEUVE S'ÉCRIT AVEC SA PRESCRIPTION, en une
         transaction. Rejouée, elle rend celle qui existe sans recalculer
         ses lignes. */
      if (!dejaPosee) {
        const r = await ecrireOccurrence({
          programme_id: c.programmeId,
          etape_consommee_id: c.etapeId,
          programme_seance_id: c.etapeId,
          rang: c.rang,
          statut: "prevue",
          date,
          type: "Force",
          title: c.nom,
          difficulty: levelToDifficulty(gen?.level ?? null),
          location: gen?.ctx ?? null,
          origine: "utilisateur",
          adaptation_id: c.adaptationId ?? null,
          consommee_le: null,
          lancement_id: null,
        }, modele.modeleId, modele.lignes);
        if (r.resultat !== "ok" && r.resultat !== "deja") throw new Error("occurrence non écrite");
        if (r.resultat === "ok") { await appliquerRegleDuJour(user.id, date, r.id); return; }
        /* `deja` : elle existait (écrite ailleurs entre-temps) ; on la déplace. */
        const relue = await reservationDeLOccurrence(user.id, c.programmeId, c.rang);
        if (!relue) throw new Error("occurrence introuvable");
        await saveDay(user.id, { ...relue, date }, "utilisateur");
        return;
      }
      /* ⚠️ UN DÉPLACEMENT GARDE LE CONTENU ÉCRIT, il ne le remplace pas par
         l'instance du moment : la projection d'une occurrence prescrite ne
         se modifie jamais à part (et l'ancienne réservation d'avant R2
         garde ses exercices). */
      const voulue = {
        ...intentionDeLEtape({
          date,
          programmeId: c.programmeId,
          etape: { id: c.etapeId, nom: c.nom },
          rang: c.rang,
          difficulty: levelToDifficulty(gen?.level ?? null),
          location: gen?.ctx ?? null,
          exerciseList: dejaPosee.exerciseList,
          adaptationId: c.adaptationId,
        }),
        id: dejaPosee.id,
      };
      await saveDay(user.id, voulue, "utilisateur");
      });
    } catch (e) {
      console.error("[journee] impossible de dater l'étape :", e);
      return false;
    }
    if (!v.ok) { refuser(v.raison); return false; }
    /* Les deux écrans se remettent d'accord : la semaine gagne une ligne,
       et le héros passe de « quand tu veux » à la journée qui la porte. */
    if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT_JOURNEE));
    return true;
  }, [user, etape, programme, modele, instance, gen, contexteAffiche, relireContexte, refuser]);

  return {
    etat, jour, extras, etape, reservation,
    /* ⚠️ AUCUNE DATE À AFFICHER SI ELLE EST DÉJÀ AUJOURD'HUI : dans ce
       cas l'intention EST celle du jour, donc l'état vaut « seance » et
       le héros ne montre plus l'étape. */
    reserveLe: reservation?.date ? libelleReservation(reservation.date, today) : null,
    adaptation,
    adaptationJusquau: adaptation ? libelleJour(adaptation.fin) : null,
    cycleSemaine,
    nbExos: instance.length, nextLabel, doneStats,
    semaine, setSemaine, gen, programme, besoinSetup, niveau,
    recharger: () => { void charger(); },
    lancerAujourdhui, lancerIntention, refaire, daterEtape,
  };
}

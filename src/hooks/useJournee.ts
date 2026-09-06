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
import { etatJournee, intentionDeLEtape, lancementDuJour, libelleReservation } from "@/lib/journee";
import {
  lireSemaine, ajouterIntention, saveDay, reservationDeLEtape, hasSeance, loadLieu, readVariant, ctxFromLieu,
  weekDates, todayYmd, dayTitle, parDate, principale, supplements, seancesDuJour,
  weekdayIndex, prochainsJours, instanceDeLEtape,
  type PlanningDay, type GenInput,
} from "@/lib/planning";
import {
  getOrCreateProgramme, lireProgrammeActif, etapeSuivanteDe,
  type EtapeCycle, type ProgrammeEtCycle,
} from "@/lib/programme";
import type { EtatJournee } from "@/lib/journee";

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
  etape: EtapeCycle | null;
  /** La réservation EN ATTENTE de l'étape suivante, où qu'elle soit datée
   *  (elle vit souvent hors de la semaine chargée). `null` = l'étape n'a
   *  pas encore de jour, et « quand tu veux » est alors la vérité. */
  reservation: PlanningDay | null;
  /** Le jour de cette réservation, dit à voix haute : « mardi 8 ». */
  reserveLe: string | null;
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
  lancerIntention: (d: PlanningDay) => void;
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
  const [etape, setEtape] = useState<EtapeCycle | null>(null);
  const [reservation, setReservation] = useState<PlanningDay | null>(null);
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
      const suivante = actif ? await etapeSuivanteDe(user.id, actif) : null;
      setEtape(suivante);
      /* ⚠️ ET ON DEMANDE À LA BASE SI CETTE ÉTAPE A DÉJÀ UN JOUR.
         C'est la réparation du défaut du 2026-09-06 : le héros ne
         regardait que les intentions D'AUJOURD'HUI, et `etapeSuivante`
         ne dérive son curseur que des étapes REFERMÉES. Une étape
         réservée pour mardi était donc invisible aux deux, et l'accueil
         la reproposait « quand tu veux » un dimanche. La chercher dans
         la semaine chargée ne suffit pas : depuis que le sélecteur
         propose quinze jours, elle vit souvent au-delà. Une requête, sur
         la clé de l'invariant lui-même, et seulement s'il y a une étape. */
      setReservation(suivante ? await reservationDeLEtape(user.id, suivante.id) : null);
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

  /* L'INSTANCE de l'étape : sa liste d'exercices concrète. Calcul local et
     instantané, jetable, jamais écrite tant que la séance n'est pas faite. */
  const instance = useMemo(
    () => (etape && gen ? instanceDeLEtape(etape.nom, gen) : []),
    [etape, gen],
  );

  const etat = etatJournee({ pret, besoinSetup, jour, etape });

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

  const lancerIntention = useCallback((d: PlanningDay) => {
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
         supplément du même jour (V6b). */
      cible: d.id ? { genre: "intention", intentionId: d.id } : undefined,
    });
  }, [launchWorkout]);

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
    launchWorkout({
      sessionId: `etape-${etape.id}`,
      title: etape.nom,
      duration: etape.dureeMin ?? 45,
      difficulty: difficulte,
      category: "Force",
      heroImage: heroImageForSeance({ title: etape.nom }),
      exerciseList: instance,
      cible: {
        genre: "etape",
        programmeId: programme.programme.id,
        etapeId: etape.id,
        type: "Force",
        title: etape.nom,
        difficulty: difficulte,
        location: gen?.ctx ?? null,
        exerciseList: instance,
      },
    });
  }, [jour, reservation, lancerIntention, etape, instance, programme, gen, launchWorkout]);

  /* ⚠️ LE SEUL ENDROIT DU PRODUIT QUI DATE UNE ÉTAPE, ET DONC LE SEUL
     QUI CRÉE UNE INTENTION PORTANT SON LIEN VERS LE PROGRAMME. Sans ce
     lien, « Lui donner un jour » écrivait une séance ordinaire : on la
     faisait, elle passait « faite », et le cycle n'avançait pas — le
     héros reproposait la même étape le lendemain, indéfiniment. La
     consommation vient de l'INTENTION du geste, jamais du titre. */
  const daterEtape = useCallback(async (date: string): Promise<boolean> => {
    if (!user || !etape || !programme || instance.length === 0) return false;
    /* ⚠️ UNE SEULE RÉSERVATION PAR ÉTAPE, ET C'EST LA BASE QUI L'IMPOSE
       (`uniq_intention_par_etape`, V6). Redonner un jour à une étape déjà
       datée est donc un DÉPLACEMENT, pas un second ajout : sans ça, la
       base refuserait l'écriture et le geste échouerait sans rien dire.

       ⚠️ ET ON LA CHERCHE EN BASE, PAS DANS LA SEMAINE CHARGÉE. Depuis
       que le sélecteur propose quinze jours, la réservation peut vivre
       hors de la semaine courante, donc hors de tout ce que cet écran a
       lu : la chercher là aurait rendu le défaut intermittent, ce qui
       est pire qu'un défaut franc. */
    try {
      /* La lecture est DANS le `try` : elle interroge la base comme
         l'écriture, donc elle échoue de la même façon. */
      const dejaPosee = await reservationDeLEtape(user.id, etape.id);
      const voulue = {
        ...intentionDeLEtape({
          date,
          programmeId: programme.programme.id,
          etape: { id: etape.id, nom: etape.nom },
          difficulty: levelToDifficulty(gen?.level ?? null),
          location: gen?.ctx ?? null,
          exerciseList: instance,
        }),
        id: dejaPosee?.id ?? null,
      };
      if (voulue.id) await saveDay(user.id, voulue, "utilisateur");
      else await ajouterIntention(user.id, voulue, "utilisateur");
    } catch (e) {
      console.error("[journee] impossible de dater l'étape :", e);
      return false;
    }
    /* Les deux écrans se remettent d'accord : la semaine gagne une ligne,
       et le héros passe de « quand tu veux » à la journée qui la porte. */
    if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT_JOURNEE));
    return true;
  }, [user, etape, programme, instance, gen]);

  return {
    etat, jour, extras, etape, reservation,
    /* ⚠️ AUCUNE DATE À AFFICHER SI ELLE EST DÉJÀ AUJOURD'HUI : dans ce
       cas l'intention EST celle du jour, donc l'état vaut « seance » et
       le héros ne montre plus l'étape. */
    reserveLe: reservation?.date ? libelleReservation(reservation.date, today) : null,
    nbExos: instance.length, nextLabel, doneStats,
    semaine, setSemaine, gen, programme, besoinSetup, niveau,
    recharger: () => { void charger(); },
    lancerAujourdhui, lancerIntention, daterEtape,
  };
}

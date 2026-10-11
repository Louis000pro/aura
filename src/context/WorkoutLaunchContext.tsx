"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import WorkoutGuideModal, { type Exercise } from "@/components/WorkoutGuideModal";
import { ConflitReprise } from "@/components/entrainement/SeanceInterrompue";
import { useAuth, type User } from "@/context/AuthContext";
import type { CibleSeance } from "@/lib/finSeance";
import {
  avancementDeReprise, effacerReprise, finalisationGardee, lireReprise, observerReprise, prendreVerrouSeance, sauverReprise,
  type AvancementSeance, type SeanceAReprendre, type SeanceInterrompue,
} from "@/lib/seanceInterrompue";
import { garderSeanceReprise } from "@/lib/garderSeanceReprise";
import type { ProposedSeance } from "@/lib/assistantActions";
import { verifierCibleReprise } from "@/lib/cibleReprise";

export type WorkoutLaunchInput = {
  sessionId: string;
  title: string;
  accent?: string;
  duration: number;
  difficulty: string;
  category?: string;
  heroImage?: string;
  exerciseList?: Exercise[];
  onGarder?: () => void | boolean | Promise<boolean>;
  /** Données de la séance à garder : les fonctions ne survivent pas à un reload. */
  aGarder?: ProposedSeance;
  /** Intention / étape refermée, jamais déduite du titre. Absent = supplément. */
  cible?: CibleSeance;
  relaisRunId?: string;
};

type Lancement = WorkoutLaunchInput & { userId: string; executionId: string; demarreeLe: number; reprise?: AvancementSeance };
type Value = {
  launchWorkout: (w: WorkoutLaunchInput) => void;
  reprise: SeanceInterrompue | null;
  reprendre: () => void;
  abandonner: (executionId: string) => void;
  erreurReprise: string | null;
  repriseSupplement: boolean;
};
const Ctx = createContext<Value | null>(null);
const RIEN = () => null;

export function useWorkoutLaunch(): Value {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWorkoutLaunch doit être utilisé dans <WorkoutLaunchProvider>");
  return c;
}

/** Tous les accès ouvrent le même lecteur, porté dans body hors des transforms. */
export function WorkoutLaunchProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // Un changement de compte détruit le lecteur, ses callbacks et son verrou.
  return <WorkoutLaunchSession key={user?.id ?? "sans-compte"} user={user}>{children}</WorkoutLaunchSession>;
}

function WorkoutLaunchSession({ children, user }: { children: React.ReactNode; user: User | null }) {
  const userId = user?.id ?? null;
  const [active, setActive] = useState<Lancement | null>(null);
  const [attente, setAttente] = useState<{ userId: string; seance: WorkoutLaunchInput } | null>(null);
  const [erreur, setErreur] = useState<{ userId: string; texte: string } | null>(null);
  const [supplement, setSupplement] = useState<string | null>(null);
  const lecture = useCallback(() => lireReprise(userId), [userId]);
  const observer = useCallback((notifier: () => void) => observerReprise(userId, notifier), [userId]);
  const brouillon = useSyncExternalStore(observer, lecture, RIEN);
  const verrou = useRef<{ executionId: string; liberer: () => void } | null>(null);
  const ouverture = useRef(false);
  const vivant = useRef(true);
  const lecteur = active?.userId === userId ? active : null;
  const demande = attente?.userId === userId ? attente.seance : null;

  useEffect(() => {
    vivant.current = true;
    return () => {
      vivant.current = false;
      verrou.current?.liberer();
      verrou.current = null;
    };
  }, [userId]);

  const ouvrir = useCallback(async (w: WorkoutLaunchInput, ancien?: SeanceInterrompue) => {
    if (!userId || ouverture.current) return;
    ouverture.current = true;
    try {
      const liberer = await prendreVerrouSeance(userId);
      if (!vivant.current) { liberer?.(); return; }
      if (!liberer) {
        setErreur({ userId, texte: "Cette séance est ouverte dans un autre onglet. Ferme-la là-bas pour la reprendre ici." });
        if (!lireReprise(userId)) setAttente({ userId, seance: w });
        return;
      }
      // Relire APRÈS le verrou : un autre onglet a pu terminer ou remplacer.
      const courant = lireReprise(userId);
      if (ancien && courant?.executionId !== ancien.executionId) {
        liberer();
        setErreur({ userId, texte: "Cette séance a changé dans un autre onglet. Retrouve sa dernière version ci-dessous." });
        return;
      }
      if (!ancien && courant) { liberer(); setAttente({ userId, seance: w }); return; }
      let contenu = w;
      if (ancien && courant) {
        const cible = await verifierCibleReprise(courant);
        if (!vivant.current) { liberer(); return; }
        if (cible === "inconnu") {
          liberer();
          setErreur({ userId, texte: "Impossible de vérifier ton planning pour l’instant. Vérifie ta connexion, puis réessaie." });
          return;
        }
        if (cible === "modifie" && supplement !== courant.executionId) {
          liberer(); setSupplement(courant.executionId);
          setErreur({ userId, texte: "Ton planning ou ton programme a changé. Tu peux reprendre cette séance en supplément, sans modifier ton programme." });
          return;
        }
        if (cible === "modifie") contenu = { ...w, cible: undefined };
      }
      const executionId = ancien?.executionId ?? crypto.randomUUID();
      verrou.current = { executionId, liberer };
      setErreur(null);
      setSupplement(null);
      setAttente(null);
      setActive({ ...contenu, userId, executionId, demarreeLe: ancien?.demarreeLe ?? Date.now(), reprise: ancien ? avancementDeReprise(courant!) : undefined });
    } finally { ouverture.current = false; }
  }, [userId, supplement]);

  const launchWorkout = useCallback((w: WorkoutLaunchInput) => {
    if (!userId || lecteur) return;
    const courant = lireReprise(userId);
    if (courant) { setAttente({ userId, seance: w }); return; }
    void ouvrir(w);
  }, [userId, lecteur, ouvrir]);

  const reprendre = useCallback(() => {
    const courant = lireReprise(userId);
    if (courant && !lecteur) void ouvrir(courant.seance, courant);
  }, [userId, lecteur, ouvrir]);

  const abandonner = useCallback((executionId: string) => {
    if (!userId) return;
    void prendreVerrouSeance(userId).then((liberer) => {
      if (!liberer) { setErreur({ userId, texte: "Cette séance est encore ouverte dans un autre onglet." }); return; }
      effacerReprise(userId, executionId);
      liberer();
      setErreur(null);
    });
  }, [userId]);

  const fermer = useCallback((executionId: string) => {
    if (verrou.current?.executionId === executionId) { verrou.current.liberer(); verrou.current = null; }
    setActive((a) => a?.executionId === executionId ? null : a);
  }, []);

  const sauvegarder = useCallback((exercises: Exercise[], avancement: AvancementSeance, debutMs: number) => {
    if (!lecteur || verrou.current?.executionId !== lecteur.executionId) return;
    const seance: SeanceAReprendre = {
      sessionId: lecteur.sessionId, title: lecteur.title, duration: lecteur.duration,
      difficulty: lecteur.difficulty, category: lecteur.category, heroImage: lecteur.heroImage,
      exerciseList: exercises, cible: lecteur.cible, aGarder: lecteur.aGarder, relaisRunId: lecteur.relaisRunId,
    };
    sauverReprise({ version: 1, userId: lecteur.userId, executionId: lecteur.executionId,
      demarreeLe: debutMs,
      actualiseeLe: Date.now(), seance, avancement });
  }, [lecteur]);

  // R1 reste l'autorité : ici on retire seulement le brouillon du lecteur.
  const terminer = useCallback((enregistree = false) => {
    if (!lecteur) return;
    if (enregistree || finalisationGardee(lecteur.userId, lecteur.executionId)) effacerReprise(lecteur.userId, lecteur.executionId);
  }, [lecteur]);

  const conflit = demande && !lecteur;
  const visible = typeof document !== "undefined";
  return (
    <Ctx.Provider value={{ launchWorkout, reprise: lecteur ? null : brouillon, reprendre, abandonner,
      erreurReprise: erreur?.userId === userId ? erreur.texte : null,
      repriseSupplement: !!brouillon && supplement === brouillon.executionId }}>
      {children}
      {visible && createPortal(
        <>
          <AnimatePresence>
            {lecteur && (
              <WorkoutGuideModal key={lecteur.executionId}
                sessionId={lecteur.sessionId} title={lecteur.title} accent={lecteur.accent ?? "var(--accent)"}
                duration={lecteur.duration} difficulty={lecteur.difficulty} category={lecteur.category}
                heroImage={lecteur.heroImage} exerciseList={lecteur.exerciseList}
                executionId={lecteur.executionId} reprise={lecteur.reprise} onProgress={sauvegarder}
                demarreeLe={lecteur.demarreeLe} proprietaireReprise={lecteur.userId}
                cible={lecteur.cible ?? null} relaisRunId={lecteur.relaisRunId}
                onGarder={lecteur.onGarder ?? (lecteur.aGarder && user
                  ? () => garderSeanceReprise(user, { ...lecteur, exerciseList: lecteur.exerciseList ?? [] }) : undefined)}
                onTerminee={terminer} onClose={() => fermer(lecteur.executionId)} />
            )}
          </AnimatePresence>
          {conflit && <ConflitReprise brouillon={brouillon} erreur={erreur?.userId === userId ? erreur.texte : null}
            supplement={!!brouillon && supplement === brouillon.executionId}
            onReprendre={reprendre} onFermer={() => setAttente(null)}
            onRemplacer={async () => {
              if (!userId || !demande) return;
              const liberer = await prendreVerrouSeance(userId);
              if (!liberer) { setErreur({ userId, texte: "Cette séance est encore ouverte dans un autre onglet." }); return; }
              const courant = lireReprise(userId);
              if (courant?.executionId !== brouillon?.executionId) {
                liberer();
                setErreur({ userId, texte: "La séance en pause a changé. Vérifie-la avant de l’abandonner." });
                return;
              }
              if (courant) effacerReprise(userId, courant.executionId);
              liberer();
              void ouvrir(demande);
            }} />}
        </>, document.body)}
    </Ctx.Provider>
  );
}

"use client";

/* ─────────────────────────────────────────────────────────────────────
   LE MOT DU JOUR (Louis, 2026-10-17, page « Revenir chaque jour » ;
   refait sur la maquette « Le mot du jour », GO du 2026-10-18).

   Ce qu'ouvre la pastille posée sur le visage du Guide, en haut de
   l'accueil : sa bulle (une accroche, la flamme, le programme), le
   conseil du jour, puis le mouvement du jour à découvrir. Il ne s'ouvre
   jamais tout seul : c'est un message qu'on a envie d'ouvrir, pas une
   fenêtre qui s'impose.

   ⚠️ LES PHRASES VIENNENT DE `guides.ts`, LE CHOIX DE `motDuJour.ts`,
   jamais d'ici. Ce fichier apporte les faits et les affiche. Les titres
   des cartes (« Le savais-tu ? », « Ta semaine ») sont des libellés de
   l'app, pas des paroles du Guide : ils vivent ici.
   ⚠️ LE MOT SE COMPOSE UNE FOIS LA JOURNÉE LUE (`useJournee`, la seule
   lecture de la journée du produit) et les faits d'hier revenus, ou après
   quatre secondes : tant qu'il attend, la bulle montre deux traits, et
   « rien de prévu » ne s'écrit jamais avant d'avoir lu.
   ⚠️ LE CHOIX DU JOUR SE GARDE À LA PREMIÈRE OUVERTURE : le mot reste le
   même toute la journée. Les faits, eux, se relisent.
   ⚠️ LES 5 EXP DE LA CARTE SONT DEMANDÉS À LA BASE (`crediterMouvement`),
   jamais comptés ici. Le gain ne remonte à l'accueil (`onGain`) que sur
   un crédit confirmé : c'est lui qui fait relire l'aura à la fermeture.
   ⚠️ LA CARTE N'EST PLUS UNE QUÊTE (Louis, 2026-10-17 au soir) : ses 5 EXP
   ne s'annoncent que sur elle. Tant que la base ne connaît pas ce gain
   (`dejaGagne` à `null`, SQL pas collé), la carte n'en promet aucun et
   ne le demande pas : un chiffre promis puis jamais crédité est un mensonge.
   ───────────────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronRight, Play } from "lucide-react";
import Sheet from "@/components/communaute/Sheet";
import { VisageGuide } from "@/components/AssistantMark";
import ExerciseDetailSheet from "@/components/seance/ExerciseDetailSheet";
import ExerciseThumb from "@/components/seance/ExerciseThumb";
import FlammeSerie from "@/components/serie/FlammeSerie";
import CarteMouvementDuJour, { type GainMouvement } from "@/components/accueil/MouvementDuJour";
import { createClient } from "@/lib/supabase";
import { useJournee } from "@/hooks/useJournee";
import { useWorkoutLaunch } from "@/context/WorkoutLaunchContext";
import { dayTitle, readLieu } from "@/lib/planning";
import { parisHour } from "@/lib/dates";
import { workoutSessions } from "@/lib/catalogueSeances";
import { heroImageForSeance } from "@/lib/workoutArt";
import { cheminDuGuide } from "@/lib/photosGuide";
import { useGuideActif } from "@/context/GuideContext";
import { PRENOM_GUIDE, morceauxMatin, texteBrut, type GuideRef } from "@/lib/guides";
import {
  basculerDefi, choisirMot, conseilDuMot, defiFait, lignesDuMot, lireChoixDuJour, lireFaitsMot,
  lireHistorique, noterChoixDuJour,
  type ConseilMot, type EntreeMot, type FaitsMot, type LigneMot,
} from "@/lib/motDuJour";
import type { MomentAccueil } from "@/lib/momentAccueil";
import type { EtatCoop } from "@/lib/defi";
import { EXERCISE_LIBRARY, trouverExercice, type LibExercise } from "@/lib/exerciseLibrary";
import {
  ajouterAuCarnet,
  carteRetournee,
  crediterMouvement,
  exerciceDuMouvement,
  lireCarnet,
  lireRetournee,
  minutesDuMouvement,
  mouvementDuJour,
  noterRetournee,
  zoneDuMouvement,
} from "@/lib/mouvementDuJour";
import styles from "./FeuilleMotDuJour.module.css";

/** « dimanche 18 octobre ». */
function libelleDuJour(jour: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
      .format(new Date(`${jour}T12:00:00Z`));
  } catch {
    return "jour";
  }
}

/** Le texte du Guide, ses nombres dans le visage du chiffre. */
function Texte({ s }: { s: string }) {
  return (
    <>
      {morceauxMatin(s).map((m, i) => (m.nombre
        ? <span key={i} className="vy-nombre" style={{ fontWeight: 800 }}>{m.texte}</span>
        : <span key={i}>{m.texte}</span>))}
    </>
  );
}

export default function FeuilleMotDuJour({
  guide,
  moment,
  serie,
  userId,
  jour,
  dejaGagne,
  relais,
  premium,
  onGain,
  onFermer,
  onRepondre,
  onQuestion,
}: {
  guide: GuideRef;
  /** Le mot que le Guide avait pour l'accueil aujourd'hui, s'il en avait un. */
  moment: MomentAccueil | null;
  serie: number;
  userId: string;
  jour: string;
  /** La base dit que la carte a déjà rapporté ses 5 EXP aujourd'hui (ici ou
   *  ailleurs). `null` : la base ne connaît pas encore ce gain. */
  dejaGagne: boolean | null;
  /** Le relais vivant, lu par l'accueil, ou `null`. */
  relais: { quoi: EtatCoop["quoi"]; maillon?: number } | null;
  /** Vaiiya+ : la mission Premium de la semaine compte. */
  premium: boolean;
  /** Les 5 EXP viennent d'être crédités. */
  onGain: () => void;
  onFermer: () => void;
  onRepondre: () => void;
  /** Répondre à la question du jour : la conversation s'ouvre dessus. */
  onQuestion: (question: string) => void;
}) {
  const reduce = !!useReducedMotion();
  const j = useJournee();
  const { launchWorkout } = useWorkoutLaunch();
  const nom = guide ? PRENOM_GUIDE[guide] : "Vaiiya";

  /* ── Ce que le mot sait de la journée ── */
  const [heure] = useState(() => parisHour(new Date()));
  const [historique] = useState(() => lireHistorique(userId));
  const [faits, setFaits] = useState<FaitsMot | null | undefined>(undefined);
  useEffect(() => {
    let vivant = true;
    void lireFaitsMot(createClient(), userId, jour).then(
      (f) => { if (vivant) setFaits(f); },
      () => { if (vivant) setFaits(null); },
    );
    return () => { vivant = false; };
  }, [userId, jour]);
  // Une lecture qui traîne ne retient pas le mot plus de quatre secondes.
  const [attenteFinie, setAttenteFinie] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAttenteFinie(true), 4000);
    return () => clearTimeout(t);
  }, []);

  const plan = j.etat === "loading" ? null : {
    etat: j.etat,
    titre: j.jour ? dayTitle(j.jour) : null,
    etape: j.etape?.nom ?? null,
    jour: j.reserveLe ?? j.prevuLe ?? null,
    mouvements: j.aLancer?.exercices.map((x) => x.name) ?? [],
    minutes: j.doneStats?.minutes ?? null,
  };
  const pret = (plan !== null || attenteFinie) && (faits !== undefined || attenteFinie);
  const entree: EntreeMot = { jour, heure, serie, moment, plan, faits: faits ?? null, relais, premium, historique };
  // Le choix du jour se garde à la première ouverture, et se relit ensuite.
  const stocke = lireChoixDuJour(userId, jour);
  const choix = stocke ?? (pret ? choisirMot(entree) : null);
  useEffect(() => {
    if (pret && choix && !stocke) noterChoixDuJour(userId, jour, choix);
  });
  const lignes = choix ? lignesDuMot(entree, choix) : null;
  const conseil = choix ? conseilDuMot(entree, choix) : null;

  /* ── Le mouvement du jour et ses 5 EXP ── */
  const mouvement = mouvementDuJour(jour);
  const [carnet, setCarnet] = useState<string[]>(() => lireCarnet(userId));
  const [fiche, setFiche] = useState<LibExercise | null>(null);

  const [ouverteAuMontage] = useState(() =>
    carteRetournee({ retourneeLe: lireRetournee(userId), jour, dejaGagne: dejaGagne === true }),
  );
  const [gain, setGain] = useState<GainMouvement>(dejaGagne ? "deja" : null);
  const demander = () => {
    if (dejaGagne === null) return;
    void crediterMouvement(createClient()).then((r) => {
      if (r === null) return;
      setGain(r ? "gagne" : "deja");
      if (r) onGain();
    });
  };
  const decouvrir = () => {
    noterRetournee(userId, jour);
    ajouterAuCarnet(userId, mouvement.name);
    demander();
  };
  /* Retournée sur cet appareil sans que la base l'ait comptée (le réseau a
     lâché au mauvais moment) : on redemande le crédit en ouvrant le mot,
     sinon les 5 EXP resteraient promis sans plus aucune carte à toucher.
     La base ne crédite jamais deux fois. */
  const relance = useRef(false);
  useEffect(() => {
    if (relance.current || !ouverteAuMontage || dejaGagne !== false) return;
    relance.current = true;
    demander();
  });

  // Le carnet compte aussi la carte retournée AILLEURS aujourd'hui.
  const compte = carnet.length + (ouverteAuMontage && !carnet.includes(mouvement.name) ? 1 : 0);
  const [compteAuMontage] = useState(compte);

  // Un mouvement se joue comme une séance de bibliothèque : un supplément,
  // qui ne referme aucune étape du programme.
  const essayer = (exo: LibExercise) => {
    launchWorkout({
      sessionId: exo.name === mouvement.name ? `mouvement-du-jour-${jour}` : `mot-du-jour-${jour}`,
      title: exo.name,
      duration: minutesDuMouvement(exo),
      difficulty: "Débutant",
      category: zoneDuMouvement(exo),
      exerciseList: [exerciceDuMouvement(exo)],
    });
    setFiche(null);
    onFermer();
  };

  // La séance courte d'un retour, ou la première séance des débuts.
  const lancerSeance = (id: string) => {
    const s = workoutSessions.find((x) => x.id === id);
    if (!s) return;
    launchWorkout({
      sessionId: s.id,
      title: s.title,
      duration: s.duration,
      difficulty: s.difficulty,
      category: s.category,
      heroImage: heroImageForSeance({ title: s.title, category: s.category }),
    });
    onFermer();
  };

  const boutonEssayer = (exo: LibExercise) => (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={() => essayer(exo)}
      className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 cursor-pointer"
      style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff", fontSize: 16, fontWeight: 800, boxShadow: "var(--ombre-action)" }}
    >
      <Play size={14} strokeWidth={2.5} fill="#fff" aria-hidden="true" /> L’essayer maintenant
    </motion.button>
  );

  const ouvrirFiche = (nomExo: string) => {
    const exo = trouverExercice(nomExo);
    if (exo) setFiche(exo);
  };

  return (
    <>
      <Sheet onFermer={onFermer}>
        <div className={styles.defile}>
          <div className="flex items-center gap-3">
            <VisageGuide guide={guide} etat="welcome" size={48} />
            <div>
              <p style={{ color: "var(--text-0)", fontSize: 16, fontWeight: 800 }}>{nom}</p>
              <p style={{ color: "var(--text-3)", fontSize: 13 }}>Ton mot du {libelleDuJour(jour)}</p>
            </div>
          </div>

          <BulleDuMot lignes={lignes} />

          {conseil && (
            <CarteConseil
              conseil={conseil}
              guide={guide}
              nom={nom}
              reduce={reduce}
              userId={userId}
              jour={jour}
              onFiche={ouvrirFiche}
              onQuestion={onQuestion}
              onLancer={lancerSeance}
            />
          )}

          <div className="mt-5 flex items-baseline justify-between">
            <p style={{ color: "var(--text-0)", fontSize: 16, fontWeight: 800, fontVariationSettings: "var(--w-voix)" }}>
              Le mouvement du jour
            </p>
            <p style={{ color: "var(--text-3)", fontSize: 11, fontWeight: 700 }}>
              Ton carnet&nbsp;:{" "}
              <motion.span
                key={compte}
                className="vy-nombre inline-block"
                style={{ color: "var(--text-0)" }}
                initial={compte !== compteAuMontage && !reduce ? { scale: 1.9, y: -2 } : false}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 480, damping: 14 }}
              >
                {compte}
              </motion.span>{" "}
              / {EXERCISE_LIBRARY.length}
            </p>
          </div>
          <div className="mt-2.5">
            <CarteMouvementDuJour
              mouvement={mouvement}
              ouverte={ouverteAuMontage}
              gain={gain}
              bonus={dejaGagne !== null}
              reduce={reduce}
              onDecouvrir={decouvrir}
              onRetournee={() => setCarnet(lireCarnet(userId))}
              onEssayer={() => essayer(mouvement)}
              onVoirFiche={() => setFiche(mouvement)}
            />
          </div>

          {/* Le jour d'une question, c'est sa carte qui ouvre la conversation :
              un second lien vers le même endroit dirait deux fois la même chose. */}
          {conseil?.famille !== "question" && (
            <button
              type="button"
              onClick={onRepondre}
              className="mx-auto mt-3 flex items-center gap-0.5 py-2 cursor-pointer"
              style={{ color: "var(--exp-encre)", fontSize: 13, fontWeight: 700 }}
            >
              Répondre à {nom} <ChevronRight size={14} strokeWidth={2.6} aria-hidden="true" />
            </button>
          )}
        </div>
      </Sheet>

      {/* La fiche vit hors de la feuille : un enfant `fixed` se calerait sur
          la feuille animée au lieu de l'écran. */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {fiche && (
            <ExerciseDetailSheet exo={fiche} action={boutonEssayer(fiche)} onClose={() => setFiche(null)} />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

/** La bulle du Guide : ses lignes, ou deux traits tant qu'il compose. */
export function BulleDuMot({ lignes }: { lignes: LigneMot[] | null }) {
  return (
    <div className={styles.bulle} aria-busy={!lignes}>
      {lignes ? lignes.map((l) => (l.flamme ? (
        <p key={l.id} className={`${styles.ligne} ${styles.ligneForte}`}>
          <FlammeSerie palier={l.flamme} taille={30} />
          <span><Texte s={l.texte} /></span>
        </p>
      ) : (
        <p key={l.id} className={styles.ligne}><Texte s={l.texte} /></p>
      ))) : (
        <>
          <div className={styles.squelette} />
          <div className={styles.squelette} />
        </>
      )}
    </div>
  );
}

/* ── Le conseil du jour ──────────────────────────────────────────────── */

const ENCRE: Record<ConseilMot["famille"], "violet" | "teal" | "feu"> = {
  geste: "violet", savais: "violet", sommeil: "violet", question: "violet",
  respire: "teal", recup: "teal", semaine: "teal",
  nutrition: "feu", defi: "feu", reprendre: "feu",
};

function titreDuConseil(c: ConseilMot): string {
  switch (c.famille) {
    case "geste": return `Le geste · ${c.mouvement}`;
    case "savais":
    case "sommeil": return "Le savais-tu ?";
    case "respire": return "Respire · une minute";
    case "recup": return "Récup";
    case "nutrition": return "Dans l’assiette";
    case "defi": return "Mini-défi";
    case "question": return "Une question";
    case "reprendre": return c.debut ? "Pour commencer" : "Reprendre";
    case "semaine": return "Ta semaine";
  }
}

export function CarteConseil({ conseil, guide, nom, reduce, userId, jour, onFiche, onQuestion, onLancer }: {
  conseil: ConseilMot;
  guide: GuideRef;
  nom: string;
  reduce: boolean;
  userId: string;
  jour: string;
  onFiche: (nom: string) => void;
  onQuestion: (question: string) => void;
  onLancer: (id: string) => void;
}) {
  return (
    <section className={styles.conseil} data-encre={ENCRE[conseil.famille]}>
      <p className={styles.titre}>{titreDuConseil(conseil)}</p>
      <CorpsDuConseil conseil={conseil} guide={guide} nom={nom} reduce={reduce} userId={userId} jour={jour}
        onFiche={onFiche} onQuestion={onQuestion} onLancer={onLancer} />
    </section>
  );
}

function Scene({ nom, onOuvrir }: { nom: string; onOuvrir: () => void }) {
  return (
    <button type="button" className={styles.scene} onClick={onOuvrir} aria-label={`Voir la fiche : ${nom}`}>
      <ExerciseThumb name={nom} size={74} />
    </button>
  );
}

function LienFiche({ onOuvrir }: { onOuvrir: () => void }) {
  return (
    <button type="button" className={styles.lien} onClick={onOuvrir}>
      Voir la fiche <ChevronRight size={13} strokeWidth={2.6} aria-hidden="true" />
    </button>
  );
}

function CorpsDuConseil({ conseil, guide, nom, reduce, userId, jour, onFiche, onQuestion, onLancer }: {
  conseil: ConseilMot;
  guide: GuideRef;
  nom: string;
  reduce: boolean;
  userId: string;
  jour: string;
  onFiche: (nom: string) => void;
  onQuestion: (question: string) => void;
  onLancer: (id: string) => void;
}) {
  switch (conseil.famille) {
    case "geste":
      return (
        <div className={styles.rangee}>
          <Scene nom={conseil.mouvement} onOuvrir={() => onFiche(conseil.mouvement)} />
          <div className={styles.corps}>
            <p className={styles.texte}>{conseil.texte}</p>
            <LienFiche onOuvrir={() => onFiche(conseil.mouvement)} />
          </div>
        </div>
      );
    case "savais":
    case "sommeil":
      return (
        <div className={`${styles.rangee} ${styles.rangeeCentre}`}>
          {conseil.nombre && (
            <span className={`vy-nombre ${styles.nombre}`} style={{ fontWeight: 800 }}>{conseil.nombre}</span>
          )}
          <p className={`${styles.texte} ${styles.corps}`}><Texte s={conseil.texte} /></p>
        </div>
      );
    case "respire":
      return <Respiration rythme={conseil.rythme} texte={conseil.texte} reduce={reduce} />;
    case "recup":
    case "nutrition":
    case "defi": {
      // Un mouvement qui n'existe plus dans la bibliothèque ne s'affiche pas.
      const mvt = conseil.mouvement && trouverExercice(conseil.mouvement) ? conseil.mouvement : null;
      return (
        <>
          <div className={styles.rangee}>
            {mvt && <Scene nom={mvt} onOuvrir={() => onFiche(mvt)} />}
            <div className={styles.corps}>
              <p className={styles.texte}>{conseil.texte}</p>
              {mvt && <LienFiche onOuvrir={() => onFiche(mvt)} />}
            </div>
          </div>
          {conseil.famille === "defi" && <BoutonDefi userId={userId} jour={jour} />}
        </>
      );
    }
    case "question":
      return (
        <div className={styles.rangee}>
          <span className={styles.visage}><VisageGuide guide={guide} etat="listen" size={30} /></span>
          <div className={styles.corps}>
            <p className={styles.question}>{conseil.texte}</p>
            <button type="button" className={styles.lien} onClick={() => onQuestion(texteBrut(conseil.texte))}>
              Répondre à {nom} <ChevronRight size={13} strokeWidth={2.6} aria-hidden="true" />
            </button>
          </div>
        </div>
      );
    case "reprendre":
      return <SeanceCourte debut={conseil.debut} texte={conseil.texte} userId={userId} onLancer={onLancer} />;
    case "semaine":
      return (
        <>
          <div className={styles.semaine}>
            {conseil.jours.map((d) => (
              <span key={d.date} className={styles.jour} aria-hidden="true">
                <span className={styles.pastille} data-etat={d.valide ? "valide" : d.aujourdhui ? "aujourdhui" : undefined}>
                  {d.valide && <Check size={12} strokeWidth={3.4} />}
                </span>
                <span className={styles.lettre}>{d.lettre}</span>
              </span>
            ))}
          </div>
          {conseil.compte && <p className={styles.compte}><Texte s={conseil.compte} /></p>}
          {conseil.mission && <p className={styles.mission}>{conseil.mission}</p>}
        </>
      );
  }
}

/** Le mini-défi se coche sur l'appareil. Il ne rapporte rien. */
function BoutonDefi({ userId, jour }: { userId: string; jour: string }) {
  const [fait, setFait] = useState(() => defiFait(userId, jour));
  return (
    <button
      type="button"
      className={styles.defi}
      data-fait={fait ? "" : undefined}
      aria-pressed={fait}
      onClick={() => setFait(basculerDefi(userId, jour))}
    >
      {fait ? <><Check size={13} strokeWidth={3} aria-hidden="true" /> Fait</> : "Je l’ai fait"}
    </button>
  );
}

/** La séance courte d'un retour, ou la première séance des débuts. */
function SeanceCourte({ debut, texte, userId, onLancer }: {
  debut: boolean;
  texte: string;
  userId: string;
  onLancer: (id: string) => void;
}) {
  const [id] = useState(() => (debut && readLieu(userId).location === "salle" ? "salle-decouverte" : "express-12"));
  const { guide } = useGuideActif();
  const s = workoutSessions.find((x) => x.id === id);
  if (!s) return <p className={styles.texte}>{texte}</p>;
  const photo = cheminDuGuide(heroImageForSeance({ title: s.title, category: s.category }), guide);
  return (
    <>
      <div className={styles.seance}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="" className={styles.photo} />
        <div className={styles.corps}>
          <p className={styles.seanceTitre}>{s.title}</p>
          <p className={styles.seanceMeta}>
            <span className="vy-nombre">{s.duration}</span> min · <span className="vy-nombre">{s.exercises}</span> mouvements
            {" · "}{s.id === "salle-decouverte" ? "en salle" : "sans matériel"}
          </p>
        </div>
        <button type="button" className={styles.lancer} onClick={() => onLancer(s.id)}>Lancer</button>
      </div>
      <p className={styles.note}>{texte}</p>
    </>
  );
}

/** Une minute de respiration : le cercle suit le rythme du conseil. */
function Respiration({ rythme, texte, reduce }: {
  rythme: readonly [number, number, number, number];
  texte: string;
  reduce: boolean;
}) {
  const [inspire, garde, expire, attends] = rythme;
  const total = Math.max(1, inspire + garde + expire + attends);
  const [depart] = useState(() => Date.now());
  const [maintenant, setMaintenant] = useState(depart);
  const [finLe, setFinLe] = useState<number | null>(null);
  const [faite, setFaite] = useState(false);
  useEffect(() => {
    if (reduce && finLe === null) return;
    const t = setInterval(() => {
      const n = Date.now();
      setMaintenant(n);
      if (finLe !== null && n >= finLe) { setFinLe(null); setFaite(true); }
    }, 250);
    return () => clearInterval(t);
  }, [reduce, finLe]);

  const t = ((maintenant - depart) / 1000) % total;
  const phase = t < inspire ? "Inspire" : t < inspire + garde ? "Garde" : t < inspire + garde + expire ? "Expire" : "Attends";
  const times = [0, inspire / total, (inspire + garde) / total, (inspire + garde + expire) / total, 1];
  const reste = finLe === null ? null : Math.max(0, Math.ceil((finLe - maintenant) / 1000));

  return (
    <div className={`${styles.rangee} ${styles.rangeeCentre}`}>
      <span className={styles.souffle} aria-hidden="true">
        <motion.span
          className={styles.cercle}
          initial={{ scale: 0.62 }}
          animate={reduce ? { scale: 0.82 } : { scale: [0.62, 1, 1, 0.62, 0.62] }}
          transition={reduce ? { duration: 0 } : { duration: total, times, ease: "easeInOut", repeat: Infinity }}
        />
        {!reduce && <span className={styles.phase}>{phase}</span>}
      </span>
      <div className={styles.corps}>
        <p className={styles.texte}>{texte}</p>
        {reste !== null ? (
          <p className={styles.etat} aria-live="polite">
            <span className="vy-nombre" style={{ fontWeight: 800 }}>{reste}</span>&nbsp;s
          </p>
        ) : faite ? (
          <p className={styles.etat} aria-live="polite">Une minute, c’est fait.</p>
        ) : (
          <button
            type="button"
            className={styles.lien}
            onClick={() => { const n = Date.now(); setMaintenant(n); setFinLe(n + 60_000); }}
          >
            Respirer avec moi <ChevronRight size={13} strokeWidth={2.6} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

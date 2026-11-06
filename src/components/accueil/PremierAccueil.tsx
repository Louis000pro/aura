"use client";

/* ════════════════════════════════════════════════════════════════════
   LA PREMIÈRE JOURNÉE (Louis, 2026-11-05, maquette « Les premiers pas »).
   Après le parcours, le premier accueil montre une seule chose : ce qu'il
   reste pour passer Argent. Une séance et un repas le même jour y mènent.

   ⚠️ TOUT EST VRAI ICI. L'EXP vient de la base (`calculerAura`), la séance se
   lance dans le vrai lecteur, le repas se note dans la vraie Nutrition, et le
   passage d'Argent est la vraie scène (`CelebrationRang`). Aucune règle d'EXP
   n'est écrite dans cet écran : les gains et le seuil d'Argent viennent de
   `aura.ts`.

   ⚠️ « PLUS TARD » FERME L'ÉCRAN POUR DE BON. Rien n'est imposé. Le repère vit
   dans les métadonnées du compte (`usePremierAccueil`), donc il suit la
   personne sur tous ses appareils.
   ⚠️ IL NE S'ADRESSE QU'À UN COMPTE QUI N'A ENCORE RIEN FAIT.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calculerAura, EXP_JOURNEE, EXP_REPAS, EXP_SEANCE, RANGS, type EtatAura } from "@/lib/aura";
import { workoutSessions } from "@/lib/catalogueSeances";
import type { GuideRef } from "@/lib/guides";
import { cheminDuGuide } from "@/lib/photosGuide";
import { readLieu } from "@/lib/planning";
import { marquerPresence } from "@/lib/presence";
import { createClient } from "@/lib/supabase";
import { heroImageForSeance } from "@/lib/workoutArt";
import { useWorkoutLaunch } from "@/context/WorkoutLaunchContext";
import s from "./PremierAccueil.module.css";

const NB = String.fromCharCode(160);
const A = "/premiers-pas/";

/** La première séance proposée : courte, gratuite, et adaptée au lieu. */
function premiereSeance(userId: string) {
  const { location } = readLieu(userId);
  const id = location === "salle" ? "salle-decouverte" : "express-12";
  return workoutSessions.find((x) => x.id === id) ?? workoutSessions.find((x) => x.id === "express-12")!;
}

export default function PremierAccueil({ userId, guide, onFermer }: {
  userId: string;
  pseudo: string;
  guide: GuideRef;
  onFermer: () => void;
}) {
  const router = useRouter();
  const { launchWorkout, lecteurOuvert } = useWorkoutLaunch();
  const seance = useMemo(() => premiereSeance(userId), [userId]);
  const photo = heroImageForSeance({ title: seance.title, category: seance.category });
  const [aura, setAura] = useState<EtatAura | null>(null);

  /* Relu à l'arrivée et à la fermeture du lecteur : c'est là que l'EXP bouge. */
  useEffect(() => {
    if (lecteurOuvert) return;
    let vivant = true;
    const supabase = createClient();
    void (async () => {
      await marquerPresence(supabase, userId).catch(() => null);
      const etat = await calculerAura(supabase, userId).catch(() => null);
      if (vivant && etat) setAura(etat);
    })();
    return () => { vivant = false; };
  }, [userId, lecteurOuvert]);

  const seanceFaite = !!aura?.missions.seance?.complete;
  const repasFait = !!aura?.missions.repas?.complete;

  /* Les deux sont faits : l'accueil habituel reprend, et la scène d'Argent
     joue d'elle-même. */
  useEffect(() => {
    if (seanceFaite && repasFait) onFermer();
  }, [seanceFaite, repasFait, onFermer]);

  const seuil = RANGS[1]?.min ?? 100;
  const exp = aura?.exp ?? 0;
  const reste = Math.max(0, seuil - exp);

  const lancer = () => {
    if (seanceFaite) return;
    launchWorkout({
      sessionId: seance.id,
      title: seance.title,
      duration: seance.duration,
      difficulty: seance.difficulty,
      category: seance.category,
      heroImage: photo,
    });
  };

  return (
    <section className={s.journee} aria-label="Ta première journée">
      {guide && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className={s.guide} data-guide={guide} src={`${A}${guide}-designe.webp`} alt="" />
      )}
      <h1 className={s.titre}>Ta <em>première</em> journée</h1>

      <div className={s.rang}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${A}bronze.webp`} alt="Bronze" />
        <div className={s.piste}><i style={{ width: `${Math.min(1, exp / seuil) * 100}%` }} /></div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${A}argent.webp`} alt="Argent" />
      </div>
      <p className={s.exp}>
        <b className="vy-nombre">{aura ? exp : "–"}</b> / {seuil}{NB}EXP
        {aura && reste > 0 ? ` · Encore ${reste}${NB}EXP pour passer Argent.` : ""}
      </p>

      <div className={s.actions}>
        <button type="button" className={s.action} data-fait={seanceFaite} onClick={lancer}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cheminDuGuide(photo, guide)} alt="" />
          <i className="vy-nombre">{seanceFaite ? "Fait" : `+${EXP_SEANCE}${NB}EXP`}</i>
          <span>
            <small>{seance.duration}{NB}min</small>
            <b>{seanceFaite ? "Séance faite" : `Faire ${seance.title}`}</b>
          </span>
        </button>
        <button type="button" className={s.action} data-fait={repasFait} onClick={() => { if (!repasFait) router.push("/nutrition"); }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${A}assiette.webp`} alt="" />
          <i className="vy-nombre">{repasFait ? "Fait" : `+${EXP_REPAS}${NB}EXP`}</i>
          <span>
            <small>Une photo ou un mot suffit</small>
            <b>{repasFait ? "Repas noté" : "Noter mon premier repas"}</b>
          </span>
        </button>
      </div>

      <p className={s.note}>Les deux le même jour{NB}: <b className="vy-nombre">+{EXP_JOURNEE}</b>{NB}EXP de plus.</p>
      <button type="button" className={s.passer} onClick={onFermer}>Plus tard</button>
    </section>
  );
}

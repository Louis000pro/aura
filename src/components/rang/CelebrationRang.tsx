"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import { cleMontee } from "@/lib/motRang";
import { EVENEMENT_RANG_MONTE, type DetailRangMonte } from "@/lib/celebrationRang";
import { proposerAvis } from "@/lib/invitationAvis";
import { RANGS, type Rang } from "@/lib/aura";

/* La scène (sa musique, ses particules, sa carte et son image) arrive au
   moment où elle joue, préchargée au repos par `PrechargeDifferes`. Ce
   fichier-ci reste chargé dès le démarrage : l'écouteur ne doit rater
   aucune montée. Si le morceau ne se charge pas (hors ligne, sans cache),
   la scène ne s'affiche pas, et la page ne tombe pas pour autant. */
const SceneRang = dynamic(
  () => import("@/components/rang/SceneRang").catch(() => ({ default: () => null })),
  { ssr: false },
);

/**
 * LE PASSAGE DE RANG, EN PLEIN ÉCRAN, DANS LA NUIT (Louis, 2026-10-24 :
 * « GO, code la refonte du passage de rang comme sur la maquette version 2,
 * avec la scène dans la nuit »).
 *
 * Monté une fois dans le layout : le rang peut monter n'importe où (fin de
 * séance, repas noté, simple présence). `noterRang` (lib/celebrationRang.ts)
 * a déjà tout tranché avant d'émettre l'évènement : aucun réseau ici, sauf
 * la carte, qui se lit quand on l'ouvre.
 *
 * Cinq temps : le noir, la charge, l'éveil, l'éclat, puis le nom, le Guide
 * et les cadeaux (la carte, le cadre, les jokers ou le titre). La musique du
 * rang part à l'éclat, le téléphone vibre sur Android.
 *
 * ⚠️ LA SCÈNE NE SE PASSE PAS (Louis, 2026-10-24 : « tout le monde doit
 * l'avoir et la voir, et franchement c'est pas une cinématique ») : aucun
 * toucher, aucune touche ne la coupe. Les deux boutons n'existent qu'à la
 * fin, et Échap ne ferme qu'à ce moment-là.
 * ⚠️ PAS DE VAIIYA+ OFFERT au passage (Louis, même jour).
 * ⚠️ MOUVEMENT RÉDUIT : la gemme change en fondu, sans flash, sans secousse
 * ni clignotement, et sans particules.
 */
export default function CelebrationRang() {
  const { user } = useAuth();
  const [scene, setScene] = useState<{ rang: Rang; cle: number } | null>(null);

  useEffect(() => {
    const onMonte = (e: Event) => {
      const id = (e as CustomEvent<DetailRangMonte>).detail?.rangId;
      const rang = RANGS.find((r) => r.id === id);
      // Le Bronze ne se gagne jamais (on l'a dès l'inscription) : pas de scène.
      if (rang && cleMontee(rang.id)) setScene({ rang, cle: Date.now() });
    };
    window.addEventListener(EVENEMENT_RANG_MONTE, onMonte);
    return () => window.removeEventListener(EVENEMENT_RANG_MONTE, onMonte);
  }, []);

  // En refermant la scène, la personne vient de vivre sa montée de rang :
  // c'est le pic où l'on peut proposer un avis (une seule fois par personne).
  const rang = scene?.rang ?? null;
  const uid = user?.id;
  const fermer = useCallback(() => {
    setScene(null);
    if (uid && rang) proposerAvis(uid, { pourquoi: "rang", surtitre: "Nouveau rang", mot: rang.nom });
  }, [uid, rang]);

  // `scene` ne naît que d'un évènement, donc dans le navigateur : à
  // l'hydratation elle est toujours nulle et rien ne se rend.
  if (!scene) return null;
  return createPortal(<SceneRang key={scene.cle} rang={scene.rang} onFermer={fermer} />, document.body);
}

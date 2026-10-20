"use client";

/* ════════════════════════════════════════════════════════════════════
   OuvertureGuide · le Guide parle en premier, et de ta journée.

   Louis, 2026-10-20 (version 3 de la maquette « La conversation du
   Guide ») : en ouvrant la conversation, on ne doit plus tomber sur une
   page blanche, « Salut » et « Dis-moi où tu en es », la même pour tout le
   monde. Le Guide dit ce qui se passe AUJOURD'HUI (une séance en pause, la
   séance du jour, la prochaine étape, ce qui est fait, le repos, la
   flamme) et les réponses possibles attendent déjà, de ton côté.

   ⚠️ MONTÉ UNIQUEMENT QUAND LA CONVERSATION EST OUVERTE ET VIDE. C'est ce
   qui borne les lectures (la journée, la série) au moment où quelqu'un
   ouvre vraiment la conversation : la feuille est montée sur toutes les
   pages, et lire la journée à chaque page pour une conversation que
   personne n'ouvre serait un coût pour rien.

   ⚠️ AUCUN APPEL D'IA. Ce qu'il dit vient de `ouvertureGuide.ts` (pur) et
   de `guides.ts`. Une réponse qui AGIT (reprendre, lancer) passe par les
   mêmes portes que le héros de l'accueil et n'écrit rien dans le fil ;
   les autres partent au coach, qui prend la main, et l'ouverture entre
   alors dans le fil devant elles (`noterOuverture`).
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useAssistant } from "@/context/AssistantContext";
import { useWorkoutLaunch } from "@/context/WorkoutLaunchContext";
import { useGuideActif } from "@/context/GuideContext";
import { useJournee } from "@/hooks/useJournee";
import { createClient } from "@/lib/supabase";
import { calculerAura } from "@/lib/aura";
import { dayTitle } from "@/lib/planning";
import { nomGuide } from "@/lib/guides";
import { composerOuverture, situationDuJour, type BrouillonOuverture } from "@/lib/ouvertureGuide";
import { BULLE, BULLE_GUIDE, Brouillon, PointsSaisie } from "./bulles";

/** Au-delà, le Guide parle avec ce qu'il sait : une journée qui ne répond
 *  pas ne doit pas le laisser écrire indéfiniment. */
const DELAI_MS = 3000;
/** L'écart entre deux bulles, comme quelqu'un qui écrit la suivante. */
const ECART_S = 0.35;

export default function OuvertureGuide() {
  const { user } = useAuth();
  const { guide } = useGuideActif();
  const { sendMessage, noterOuverture, close, messagesEpuises } = useAssistant();
  const { reprise, reprendre } = useWorkoutLaunch();
  const j = useJournee();

  /* La série : la même source que la flamme de l'accueil (`serie_aura`),
     jamais un compte refait ici. `undefined` = pas encore lue, `null` =
     lecture ratée : on n'en parle pas plutôt que de dire un faux chiffre. */
  const [serie, setSerie] = useState<number | null | undefined>(undefined);
  const [delaiPasse, setDelaiPasse] = useState(false);
  /* L'heure se lit une fois, à l'ouverture : « Bonsoir » ne devient pas
     « Salut » sous les yeux parce qu'on a passé minuit en lisant. */
  const [heure] = useState(() => new Date().getHours());

  const compte = user?.id;
  useEffect(() => {
    if (!compte) return;
    let vivant = true;
    void calculerAura(createClient(), compte).then((a) => { if (vivant) setSerie(a ? a.serie : null); });
    return () => { vivant = false; };
  }, [compte]);
  useEffect(() => {
    const t = setTimeout(() => setDelaiPasse(true), DELAI_MS);
    return () => clearTimeout(t);
  }, []);

  const repriseTitre = reprise?.seance.title ?? null;
  const repriseIdx = reprise?.avancement.exerciseIdx ?? 0;
  const repriseTotal = reprise?.seance.exerciseList.length ?? 0;
  const titreJour = j.jour ? dayTitle(j.jour) : null;
  const etapeNom = j.etape?.nom ?? null;
  const quand = j.prevuLe ?? j.reserveLe;

  const situation = useMemo(() => situationDuJour({
    reprise: repriseTitre ? { titre: repriseTitre, exerciceIdx: repriseIdx, total: repriseTotal } : null,
    etat: j.etat,
    titreJour,
    etape: etapeNom,
    quand,
    minutes: j.dureeMin,
  }), [repriseTitre, repriseIdx, repriseTotal, j.etat, titreJour, etapeNom, quand, j.dureeMin]);

  /* Il parle quand il sait (la journée ET la série), ou au bout du délai
     avec ce qu'il a : la situation générale s'il n'a rien lu. */
  const pret = (situation !== null && serie !== undefined) || delaiPasse;
  const pseudo = user?.pseudo ?? null;
  const peutLancer = !!j.aLancer;
  const ouverture = useMemo(() => pret ? composerOuverture(guide, {
    situation: situation ?? { genre: "aucune" },
    pseudo,
    serie: typeof serie === "number" ? serie : null,
    heure,
    peutLancer,
    coach: !messagesEpuises,
  }) : null, [pret, guide, situation, pseudo, serie, heure, peutLancer, messagesEpuises]);

  /* Ce qu'on montre, le prochain envoi l'emporte dans le fil. Et quand on
     cesse de le montrer (la conversation a commencé, la feuille se
     ferme), on l'oublie : une ouverture d'hier ne doit pas précéder un
     message de demain. */
  useEffect(() => {
    noterOuverture(ouverture ? ouverture.bulles : null);
    return () => noterOuverture(null);
  }, [ouverture, noterOuverture]);

  const repondre = (b: BrouillonOuverture) => {
    /* Les deux réponses qui AGISSENT passent par les mêmes portes que le
       bouton violet du héros, et la conversation se ferme pour laisser la
       place à la séance. Rien n'est écrit dans le fil : la prochaine
       ouverture redira la journée telle qu'elle sera devenue. */
    if (b.action === "reprendre") { reprendre(); close(); return; }
    if (b.action === "lancer") { j.lancerAujourdhui(); close(); return; }
    sendMessage(b.texte);
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Ce que la personne doit savoir avant de parler : à qui (AI Act,
          art. 50) et ce que ça vaut (pas un avis médical). EN HAUT : sur la
          capture de Louis du 2026-10-19, cette ligne était sous le pli. */}
      <p className="text-[11px] text-center mb-3" style={{ color: "var(--text-body)" }}>
        Réponses générées par une IA. Conseils généraux, pas un avis médical.
      </p>
      <div className="flex flex-col gap-1" aria-live="polite">
        {!ouverture ? (
          <div className="flex justify-start">
            <p role="status" aria-label={`${nomGuide(guide)} écrit`}
              className="flex items-center gap-1.5 px-4" style={{ ...BULLE_GUIDE, height: 44 }}>
              <PointsSaisie />
            </p>
          </div>
        ) : ouverture.bulles.map((b, i) => (
          <motion.div key={`${i}-${b}`} className="flex justify-start"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * ECART_S, duration: 0.24, ease: [0.25, 0.46, 0.45, 0.94] }}>
            <p className={BULLE} style={{ ...BULLE_GUIDE, maxWidth: "84%" }}>{b}</p>
          </motion.div>
        ))}
      </div>
      <div className="flex-1 min-h-6" />
      {/* Ce que tu peux lui répondre, déjà écrit, de ton côté. */}
      {ouverture && ouverture.brouillons.length > 0 && (
        <div className="flex flex-col items-end gap-2">
          {ouverture.brouillons.map((b, i) => (
            <Brouillon key={b.texte} rang={i} delai={ouverture.bulles.length * ECART_S} onClick={() => repondre(b)}>
              {b.texte}
            </Brouillon>
          ))}
        </div>
      )}
    </div>
  );
}

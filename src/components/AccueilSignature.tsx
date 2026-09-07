"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import GemmeRang from "@/components/GemmeRang";
import { VisageGuide } from "@/components/AssistantMark";
import MaJournee from "@/components/accueil/MaJournee";
import FeuilleMissions from "@/components/accueil/FeuilleMissions";
import { useAssistant } from "@/context/AssistantContext";
import { type EtatAura } from "@/lib/aura";
import { voix, type GuideRef } from "@/lib/guides";
import type { MomentAccueil } from "@/lib/momentAccueil";
import { etatPoster, imageEtat, type RelaisAccueil } from "@/lib/defi";
import styles from "./AccueilSignature.module.css";

/* ═══════════════════════════════════════════════════════════════════════
   V7B · L'ACCUEIL RÉPOND À LA JOURNÉE.

   Cinq blocs, dans cet ordre, et l'ordre EST la décision :

     ① l'entrée      qui m'accompagne, et un mot s'il a une raison
     ② le héros      ce que je fais maintenant  (V7A, inchangé)
     ③ ma journée    ce qu'il me reste, et ce que Premium ajoute
     ④ le relais     conditionnel, rare, humain
     ⑤ où j'en suis  série, rang et EXP sur UNE ligne

   ⚠️ CE QUI A QUITTÉ CET ÉCRAN, ET IL NE FAUT PAS LE RAMENER : la liste
   complète des missions du jour, la section « Cette semaine », le coffre
   des missions Premium, la grande affiche Premium, et la duplication de
   la série / du rang / de l'EXP. Le catalogue des missions n'a pas
   disparu, il est à un geste (la feuille « Voir tout ») ; les
   hebdomadaires vivent aussi dans Profil › Progrès et les Premium sur
   /premium. Le `PremiumBanner` global est hors de ce chantier.

   ⚠️ UN SEUL AFFICHAGE PRINCIPAL D'EXP, et c'est la ligne ⑤. L'ancien
   écran écrivait « EXP » quinze fois : une fois par sceau de mission,
   plus deux en-têtes de section, plus la bande de rang. Le seul autre
   endroit où le mot apparaît désormais est le sceau de la mission
   Premium du jour, qui est le gain de CETTE mission, pas mon total.

   ⚠️ AUCUNE MISSION N'EST DÉCRITE DANS CE FICHIER, et aucun compte n'y
   est calculé. `MaJournee` lit `missionsAccueil.ts`, qui lit lui-même
   `aura.missions`, c'est-à-dire l'évaluation de la base. Recopier un
   nombre ici, c'est promettre à l'écran ce que le serveur ne donnera pas.
   ═══════════════════════════════════════════════════════════════════════ */

export default function AccueilSignature({
  greeting,
  pseudo,
  aura,
  auraLoaded,
  missionsLues,
  expGain,
  isPremium,
  isAdmin,
  guide,
  moment,
  relais,
  jour,
  heros,
  onNavigate,
  onOpenRangs,
}: {
  greeting: string;
  pseudo: string;
  aura: EtatAura;
  auraLoaded: boolean;
  /** L'évaluation des missions est-elle celle de la BASE ?
   *
   *  ⚠️ Ce n'est pas `auraLoaded`, et confondre les deux ferait clignoter
   *  la journée. `auraLoaded` passe à vrai dès le cache localStorage, qui
   *  ne garde que l'EXP : les missions qui l'accompagnent sont vides.
   *  « Ma journée » attend donc la vraie réponse plutôt que d'afficher
   *  « 0 / 4 » à quelqu'un qui a déjà tout fait. */
  missionsLues: boolean;
  expGain: number | null;
  isPremium: boolean;
  isAdmin: boolean;
  /** Nora, Sasha, ou `null` : sans Guide résolu la marque ✦ reprend la
   *  place et la phrase reste la version commune. */
  guide: GuideRef;
  /** Le relais VIVANT, ou `null` : la bande n'existe que s'il y a
   *  quelque chose à faire aujourd'hui. */
  relais: RelaisAccueil | null;
  /** Ce que le Guide a à dire en arrivant, ou `null` quand il n'a rien à
   *  dire, ce qui est le cas le plus fréquent. Décidé dans
   *  `momentAccueil.ts`, jamais ici : cet écran affiche, il ne juge pas.
   *
   *  ⚠️ V7B N'AJOUTE AUCUN DÉCLENCHEUR. Les six moments de
   *  `momentAccueil.ts` sont exactement ceux d'avant cette vague. */
  moment: MomentAccueil | null;
  /** Le jour parisien courant, `YYYY-MM-DD`. Il décide quelle mission
   *  Premium est mise en avant aujourd'hui. */
  jour: string;
  /** Le héros « Aujourd'hui », arrivé d'Entraînement en V7A. L'accueil ne
   *  le fabrique pas et ne touche pas à son moteur : il lui donne sa
   *  place, juste après l'entrée, parce que la première question de la
   *  journée est « je fais quoi maintenant » et non « où en est mon
   *  EXP ». V7B ne change rien à ses états ni à ses règles. */
  heros?: React.ReactNode;
  onNavigate: (path: string) => void;
  onOpenRangs: () => void;
}) {
  const reduce = useReducedMotion();
  const premiumDebloque = isPremium || isAdmin;
  const [feuille, setFeuille] = useState(false);

  return (
    <div className={styles.home}>
      <Entree guide={guide} greeting={greeting} pseudo={pseudo} moment={moment} reduce={!!reduce} />

      {heros}

      {/* ③ Ma journée. Tant que l'aura n'est pas lue, le groupe ne se rend
          pas : afficher « 0 / 4 » à quelqu'un qui a tout fait serait pire
          que d'attendre une seconde. Même règle que la série. */}
      {missionsLues && (
        <MaJournee
          aura={aura}
          jour={jour}
          premiumDebloque={premiumDebloque}
          onNavigate={onNavigate}
          onVoirTout={() => setFeuille(true)}
        />
      )}

      {relais && <BandeRelais relais={relais} onNavigate={onNavigate} />}

      {/* ⑤ Où j'en suis. Série, rang et EXP répondaient à la même question
          sur DEUX surfaces de 142 px au total, en tête d'écran. Elles
          tiennent sur une ligne, en bas, parce que « où j'en suis » n'est
          pas la première question d'une journée. */}
      <LigneEtat
        aura={aura}
        charge={auraLoaded}
        expGain={expGain}
        reduce={!!reduce}
        onOpen={onOpenRangs}
      />

      <AnimatePresence>
        {feuille && missionsLues && (
          <FeuilleMissions
            aura={aura}
            premiumDebloque={premiumDebloque}
            onNavigate={onNavigate}
            onFermer={() => setFeuille(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── ① L'ENTRÉE ───────────────────────────────────────────────────────
   Le visage de Nora ou de Sasha, et « Bonsoir, Louis » sur une ligne.

   ⚠️ LE VISAGE EST TOUJOURS LÀ, MÊME QUAND LE GUIDE SE TAIT. Il a existé
   une version où il n'apparaissait qu'avec une phrase : le Guide
   disparaissait alors de l'écran le plus ouvert de l'app la plupart des
   jours, ce qui est exactement l'inverse de « quelqu'un t'accompagne ».
   C'est la PHRASE qui est conditionnelle, pas la présence.

   ⚠️ LES DEUX LIGNES DE TITRE DE 33 px SONT PARTIES, PAS LE PSEUDO. Le
   bonjour occupait 88 px en tête d'écran et faisait concurrence au héros,
   qui est ce que la page doit commander. Le pseudo garde son dégradé.

   ⚠️ TOUTE LA ZONE OUVRE LE VRAI ASSISTANT, et jamais un second chat.
   `useAssistant().open()` est la feuille globale, celle de l'étincelle ✦ :
   il n'y a qu'une conversation dans Vaiiya. Aucun prefill n'est envoyé,
   parce qu'un prefill est un message que l'UTILISATEUR est censé avoir
   écrit : en poser un ici ferait dire à quelqu'un une phrase qu'il n'a
   pas choisie. */
function Entree({
  guide,
  greeting,
  pseudo,
  moment,
  reduce,
}: {
  guide: GuideRef;
  greeting: string;
  pseudo: string;
  moment: MomentAccueil | null;
  reduce: boolean;
}) {
  const { open } = useAssistant();

  return (
    <motion.button
      type="button"
      className={styles.entree}
      data-parle={moment ? "" : undefined}
      onClick={() => open()}
      aria-label="Parler à ton Guide"
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {/* Sans Guide résolu (choix pas fait, SQL pas collé, hors ligne),
          `VisageGuide` rend l'étincelle ✦ : la zone reste, et elle ouvre
          la même conversation. */}
      <VisageGuide guide={guide} etat={moment?.etat ?? "welcome"} size={moment ? 40 : 34} />
      <span className={styles.entreeTxt}>
        <span className={styles.salut}>
          {greeting}, <b className={styles.pseudo}>{pseudo}</b>
        </span>
        {moment && <span className={styles.mot}>{voix(guide, moment.phrase, moment.ctx)}</span>}
      </span>
    </motion.button>
  );
}

/* ── ⑤ OÙ J'EN SUIS ───────────────────────────────────────────────────
   Une ligne : 🔥 série · gemme + rang · EXP / seuil. Elle ouvre la
   galerie des rangs, exactement comme la bande d'avant.

   Ce qu'on répare : la série et le rang portaient DEUX blocs de la même
   famille, l'un sous l'autre, 142 px en tête d'écran, pour répondre à une
   seule question. Ils ne disparaissent pas, ils cessent de commander la
   page. */
function LigneEtat({
  aura,
  charge,
  expGain,
  reduce,
  onOpen,
}: {
  aura: EtatAura;
  charge: boolean;
  expGain: number | null;
  reduce: boolean;
  onOpen: () => void;
}) {
  const serie = aura.serie;

  return (
    <button type="button" className={styles.etat} onClick={onOpen}>
      <span className={styles.etatSerie} data-done={aura.jourValide ? "" : undefined}>
        <i aria-hidden="true">🔥</i>
        {/* Tant que la base n'a pas répondu, un tiret : un « 0 » provisoire
            chez quelqu'un qui en est à trente jours serait le pire des
            messages possibles. */}
        <b>{charge ? serie : "—"}</b>
        <small>{serie > 1 || !charge ? "jours" : "jour"}</small>
      </span>

      <span className={styles.etatSep} aria-hidden="true" />

      <span className={styles.etatRang}>
        <GemmeRang rang={aura.rang} size={26} flotte={false} />
        {aura.rang.nom}
      </span>

      <span className={styles.etatExp}>
        <b>{charge ? aura.exp : "—"}</b> / {aura.seuilHaut} EXP
        <AnimatePresence>
          {expGain !== null && (
            <motion.em
              initial={reduce ? false : { opacity: 0, y: 7, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
            >
              +{expGain}
            </motion.em>
          )}
        </AnimatePresence>
      </span>

      <ChevronRight size={16} strokeWidth={2.4} className={styles.etatChevron} aria-hidden="true" />
    </button>
  );
}

/* ── ④ LA BANDE DU RELAIS ─────────────────────────────────────────────
   Le relais n'avait AUCUNE entrée sur l'accueil : cinq boutons y menaient
   dans l'app, aucun là où l'on arrive. Une bande fine, et seulement quand
   un relais est vivant.

   Elle ouvre LA CONVERSATION, pas /defi : c'est là que vit l'équipier.
   L'affiche en grand est à un tap de là.

   Elle ne porte pas de bouton d'action : ce qu'elle propose se fait dans
   la conversation qu'elle ouvre. */
function BandeRelais({ relais, onNavigate }: {
  relais: RelaisAccueil;
  onNavigate: (href: string) => void;
}) {
  const nom = relais.equipier?.pseudo;
  const etat = etatPoster(relais.faits, relais.objectif);

  // Ce que dit la bande suit la règle du relais, jamais l'humeur : la
  // même lecture que /defi, donc les deux écrans ne se contredisent pas.
  const phrase =
    relais.tour.quoi === "deja_franchi"
      ? (relais.tour.parMoi ? "C’est fait pour aujourd’hui." : "Le maillon du jour est franchi.")
      : relais.tour.quoi === "pas_mon_tour"
        ? `Aujourd’hui, c’est à ${relais.tour.equipier?.pseudo ?? nom ?? "l’autre"}.`
        : "Aujourd’hui, c’est à toi.";

  return (
    <button
      type="button"
      className={styles.relais}
      onClick={() => onNavigate(relais.conversationId ? `/communaute/${relais.conversationId}` : "/defi")}
    >
      <span className={styles.relaisAffiche}>
        <Image src={imageEtat(relais.serie, etat)} alt="" fill sizes="30px" className="object-cover" />
      </span>
      <span className={styles.relaisCopy}>
        <strong>
          {nom ? `Relais avec ${nom}` : "Ton relais"} · {relais.faits} sur {relais.objectif}
        </strong>
        <small>{phrase}</small>
      </span>
      <ChevronRight size={16} strokeWidth={2.5} className={styles.relaisChevron} aria-hidden="true" />
    </button>
  );
}

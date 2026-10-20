"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { VisageGuide } from "@/components/AssistantMark";
import MaJournee from "@/components/accueil/MaJournee";
import { useAuth } from "@/context/AuthContext";
import { useAssistant } from "@/context/AssistantContext";
import type { EtatAura } from "@/lib/aura";
import { PRENOM_GUIDE, type GuideRef } from "@/lib/guides";
import type { MomentAccueil } from "@/lib/momentAccueil";
import { lireMot, marquerMotLu } from "@/lib/motDuJour";
import { etatPoster, imageEtat, type RelaisAccueil } from "@/lib/defi";
import styles from "./AccueilSignature.module.css";

import dynamic from "next/dynamic";
// Les trois feuilles ne s'ouvrent qu'au toucher : elles se téléchargent à part
// pour ne pas ralentir le lancement de l'accueil (Louis, 2026-10-20).
const FeuilleSerie = dynamic(() => import("@/components/accueil/FeuilleSerie"), { ssr: false });
const FeuilleMotDuJour = dynamic(() => import("@/components/accueil/FeuilleMotDuJour"), { ssr: false });
const FeuilleMissions = dynamic(() => import("@/components/accueil/FeuilleMissions"), { ssr: false });

/* ═══════════════════════════════════════════════════════════════════════
   V7B · L'ACCUEIL RÉPOND À LA JOURNÉE.

   Cinq blocs, dans cet ordre, et l'ordre EST la décision :

     ① l'entrée      qui m'accompagne, et un mot s'il a une raison
     ② le héros      ce que je fais maintenant  (V7A, inchangé)
     ③ ma journée    en bento (essai verre, 2026-10-11) : série, rang et
                     EXP, quêtes en anneau, puis le rail des quêtes
     ④ le relais     conditionnel, rare, humain

   ⚠️ CE QUI A QUITTÉ CET ÉCRAN, ET IL NE FAUT PAS LE RAMENER : la liste
   complète des missions du jour, la section « Cette semaine », le coffre
   des missions Premium, la grande affiche Premium, et la duplication de
   la série / du rang / de l'EXP. Le catalogue des missions n'a pas
   disparu, il est à un geste (la feuille « Voir tout ») ; les
   hebdomadaires vivent aussi dans Profil › Progrès et les Premium sur
   /premium. Le `PremiumBanner` global est hors de ce chantier.

   ⚠️ UN SEUL AFFICHAGE PRINCIPAL D'EXP, et c'est la tuile du rang du
   bento (dans `MaJournee`). L'ancien
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
  onAuraChange,
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
  /** Fait relire l'aura en base (le mouvement du jour vient de rapporter
   *  son EXP). L'accueil ne compte jamais rien lui-même. */
  onAuraChange?: () => void;
}) {
  const reduce = useReducedMotion();
  const premiumDebloque = isPremium || isAdmin;
  const [feuille, setFeuille] = useState(false);
  const [feuilleSerie, setFeuilleSerie] = useState(false);
  const { user } = useAuth();
  const { open: ouvrirAssistant, ouvrirSurQuestion } = useAssistant();

  /* ── Le mot du jour (Louis, 2026-10-17) ──
     Un mot par jour, gardé sur l'appareil avec son état « lu ». Il attend
     l'aura de la base : la flamme qu'il cite doit être celle de la base,
     pas celle du cache. Le mot du Guide sur l'accueil (`moment`) y entre :
     calculé une fois par jour, il est gardé pour un mot ouvert plus tard. */
  const [motOuvert, setMotOuvert] = useState(false);
  const [luLe, setLuLe] = useState<string | null>(null);
  const motStocke = user?.id ? lireMot(user.id, jour) : null;
  const motNonLu = missionsLues && !!user?.id && luLe !== jour && !motStocke?.lu;
  const ouvrirMot = () => {
    if (!user?.id) return;
    marquerMotLu(user.id, jour);
    setLuLe(jour);
    setMotOuvert(true);
  };

  /* Les 5 EXP du mouvement du jour : l'aura se relit à la FERMETURE du mot,
     pas au crédit. Relue tout de suite, le « +5 » du rang se jouerait
     derrière la feuille ; relue en la fermant, on le voit arriver. */
  const gainMouvement = useRef(false);
  const fermerMot = () => {
    setMotOuvert(false);
    if (gainMouvement.current) {
      gainMouvement.current = false;
      onAuraChange?.();
    }
  };

  return (
    <div className={styles.home}>
      <Entree guide={guide} greeting={greeting} pseudo={pseudo} moment={moment} motNonLu={motNonLu} onOuvrirMot={ouvrirMot} reduce={!!reduce} />

      {heros}

      {/* ③ Ma journée. Tant que l'aura n'est pas lue, le groupe ne se rend
          pas : afficher « 0 / 4 » à quelqu'un qui a tout fait serait pire
          que d'attendre une seconde. Même règle que la série. */}
      {missionsLues && (
        <MaJournee
          aura={aura}
          userId={user?.id}
          jour={jour}
          premiumDebloque={premiumDebloque}
          expGain={expGain}
          reduce={!!reduce}
          onNavigate={onNavigate}
          onVoirTout={() => setFeuille(true)}
          onOpenRangs={onOpenRangs}
          onOpenSerie={() => setFeuilleSerie(true)}
        />
      )}

      {relais && <BandeRelais relais={relais} onNavigate={onNavigate} />}

      <AnimatePresence>
        {feuilleSerie && missionsLues && user?.id && (
          <FeuilleSerie
            userId={user.id}
            serie={Math.max(1, aura.serie)}
            onFermer={() => setFeuilleSerie(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {motOuvert && missionsLues && user?.id && (
          <FeuilleMotDuJour
            key={jour}
            guide={guide}
            moment={moment ?? motStocke?.moment ?? null}
            serie={Math.max(1, aura.serie)}
            userId={user.id}
            jour={jour}
            dejaGagne={aura.mouvementDuJour}
            relais={relais ? { quoi: relais.etat.quoi, maillon: relais.etat.quoi === "a_moi" ? relais.etat.maillon : undefined } : null}
            premium={premiumDebloque}
            onGain={() => { gainMouvement.current = true; }}
            onFermer={fermerMot}
            onRepondre={() => { fermerMot(); ouvrirAssistant(); }}
            onQuestion={(q) => { fermerMot(); ouvrirSurQuestion(q); }}
          />
        )}
      </AnimatePresence>

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
  motNonLu,
  onOuvrirMot,
  reduce,
}: {
  guide: GuideRef;
  greeting: string;
  pseudo: string;
  moment: MomentAccueil | null;
  /** Le mot du jour attend d'être lu : la pastille, et le geste l'ouvre. */
  motNonLu: boolean;
  onOuvrirMot: () => void;
  reduce: boolean;
}) {
  const { open } = useAssistant();

  /* ⭐ LE MOT DU JOUR (Louis, 2026-10-17) : tant qu'il n'est pas lu, une
     pastille sur le visage et « Sasha t'a laissé un mot » sous le bonjour,
     comme un message qui attend. La phrase du Guide pour l'accueil n'est
     plus écrite ici : elle ouvre le mot. Une fois lu, l'entrée redevient
     la porte de la conversation. */
  return (
    <motion.button
      type="button"
      className={styles.entree}
      data-parle={motNonLu ? "" : undefined}
      onClick={() => (motNonLu ? onOuvrirMot() : open())}
      aria-label={motNonLu ? "Lire le mot du jour de ton Guide" : "Parler à ton Guide"}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {/* Sans Guide résolu (choix pas fait, SQL pas collé, hors ligne),
          `VisageGuide` rend l'étincelle ✦ : la zone reste, et elle ouvre
          la même conversation. */}
      <span className={styles.visage}>
        <VisageGuide guide={guide} etat={moment?.etat ?? "welcome"} size={motNonLu ? 40 : 34} />
        {motNonLu && (
          <motion.span
            className={styles.pastille}
            aria-hidden="true"
            initial={reduce ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 420, damping: 18 }}
          >
            1
          </motion.span>
        )}
      </span>
      <span className={styles.entreeTxt}>
        <span className={styles.salut}>
          {greeting}, <b className={styles.pseudo}>{pseudo}</b>
        </span>
        {motNonLu && (
          <span className={styles.motNonLu}>
            {guide ? `${PRENOM_GUIDE[guide]} t’a laissé un mot` : "Ton mot du jour est arrivé"}
            <ChevronRight size={14} strokeWidth={2.6} aria-hidden="true" />
          </span>
        )}
      </span>
    </motion.button>
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
  const etat = etatPoster(relais.min, relais.objectif);

  // Ce que dit la bande suit la règle co-op du relais, la même lecture que
  // /defi : les deux écrans ne se contredisent jamais.
  const e = relais.etat;
  const phrase =
    e.quoi === "a_moi"        ? `À toi de jouer · maillon ${e.maillon}.`
  : e.quoi === "bloque"       ? (relais.enGroupe ? "En attente du groupe." : `En attente de ${e.equipier?.pseudo ?? nom ?? "ton binôme"}.`)
  : e.quoi === "fini_pour_moi"? (relais.enGroupe ? "Tu as fini, on attend le groupe." : "Tu as fini, on attend ton binôme.")
  : e.quoi === "plafond_jour" ? "Reviens demain pour la suite."
  :                             "Ouvre ton relais.";

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
          {nom ? `Relais avec ${nom}` : "Ton relais"} · {relais.min} sur {relais.objectif}
        </strong>
        <small>{phrase}</small>
      </span>
      <ChevronRight size={16} strokeWidth={2.5} className={styles.relaisChevron} aria-hidden="true" />
    </button>
  );
}

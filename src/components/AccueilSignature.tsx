"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import GemmeRang from "@/components/GemmeRang";
import { VisageGuide } from "@/components/AssistantMark";
import {
  MISSIONS_JOUR,
  MISSIONS_PREMIUM,
  MISSIONS_SEMAINE,
  PLAFOND_JOUR_GRATUIT,
  PLAFOND_JOUR_PREMIUM,
  resteMission,
  type EtatAura,
  type Mission,
  type ProgressionMission,
} from "@/lib/aura";
import { voix, type GuideRef } from "@/lib/guides";
import type { MomentAccueil } from "@/lib/momentAccueil";
import { formatPrice, PLANS, VENTE_OUVERTE } from "@/lib/plans";
import styles from "./AccueilSignature.module.css";

/* ⚠️ AUCUNE MISSION N'EST DÉCRITE DANS CE FICHIER. Son nom, sa condition et
   son EXP viennent tous de `MISSIONS` (src/lib/aura.ts), qui est aussi ce que
   la base crédite. Recopier un nombre ici, c'est promettre à l'écran ce que le
   serveur ne donnera pas : l'ancienne version le faisait pour les cinq
   missions Premium, et deux d'entre elles avaient déjà divergé. */

export default function AccueilSignature({
  greeting,
  pseudo,
  aura,
  auraLoaded,
  expGain,
  isPremium,
  isAdmin,
  guide,
  moment,
  onNavigate,
  onOpenRangs,
}: {
  greeting: string;
  pseudo: string;
  aura: EtatAura;
  auraLoaded: boolean;
  expGain: number | null;
  isPremium: boolean;
  isAdmin: boolean;
  /** Nora, Sasha, ou `null` : sans Guide résolu la marque ✦ reprend la
   *  place et la phrase reste la version commune. */
  guide: GuideRef;
  /** Ce que le Guide a à dire en arrivant, ou `null` quand il n'a rien à
   *  dire, ce qui est le cas le plus fréquent. Décidé dans
   *  `momentAccueil.ts`, jamais ici : cet écran affiche, il ne juge pas. */
  moment: MomentAccueil | null;
  onNavigate: (path: string) => void;
  onOpenRangs: () => void;
}) {
  const reduce = useReducedMotion();
  const premiumUnlocked = isPremium || isAdmin;
  const showPremiumOffer = !isPremium;
  const prix = formatPrice(PLANS.premium.priceCents);

  /* Ce qui a réellement été crédité aujourd'hui, et le maximum atteignable.
     On affiche les deux : « 35 / 50 EXP » se comprend d'un coup d'œil, un
     total seul ne dit pas où il s'arrête. */
  const expDuJour = [...MISSIONS_JOUR, ...MISSIONS_PREMIUM]
    .filter((m) => aura.missions[m.id].earned)
    .reduce((total, m) => total + m.exp, 0);
  const plafondDuJour = premiumUnlocked ? PLAFOND_JOUR_PREMIUM : PLAFOND_JOUR_GRATUIT;

  /* Ce que le coffre ajoute en une journée. Calculé, jamais écrit : le jour où
     une mission Premium change de valeur, ce chiffre suit tout seul. */
  const expPremiumJour = MISSIONS_PREMIUM.reduce((total, m) => total + m.exp, 0);

  return (
    <div className={styles.home}>
      <header className={styles.greeting}>
        <p>{greeting}</p>
        <h1>
          <span className={styles.pseudo}>{pseudo}</span>
        </h1>
      </header>

      {/* ⚠️ IL N'Y A PLUS DE LIGNE D'ACCUEIL PERMANENTE. « Content de te
          revoir. » s'écrivait sous le pseudo à CHAQUE ouverture, disait
          toujours la même chose, et accordait au masculin quoi qu'il
          arrive. À la place, le Guide parle quand il a une raison de
          parler (une absence, un début, un rang à portée, un cap de
          série) et se tait le reste du temps. Un mot rare qui tombe juste
          vaut mieux qu'une phrase quotidienne qui ne dit rien. */}
      {moment && <MotDuGuide guide={guide} moment={moment} reduce={!!reduce} />}

      {showPremiumOffer && (
        <motion.section
          className={styles.poster}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          aria-label="Découvrir Vaiiya Premium"
        >
          <Image
            src="/premium/vaiiya-premium-home-v1.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 767px) calc(100vw - 32px), 640px"
            className={styles.posterImage}
          />
          <div className={styles.posterShade} aria-hidden="true" />
          <div className={styles.posterCopy}>
            <span className={styles.premiumWordmark}>
              <BrandSpark />
              VAIYIA PREMIUM
            </span>
            <h2>Tout Vaiiya. Sans limites.</h2>
            <p>Programmes exclusifs, assistant illimité et toutes les missions.</p>
            <button type="button" onClick={() => onNavigate("/premium")}>
              {VENTE_OUVERTE ? `Découvrir · ${prix}` : "Découvrir"}
            </button>
          </div>
        </motion.section>
      )}

      <BlocSerie serie={aura.serie} jourValide={aura.jourValide} charge={auraLoaded} />

      <button type="button" className={styles.rankStrip} onClick={onOpenRangs}>
        <span className={styles.rankGem}>
          <GemmeRang rang={aura.rang} size={34} />
        </span>
        <span className={styles.rankCopy}>
          {/* La série a son propre bloc juste au-dessus : la redire ici
              ferait deux compteurs pour une seule idée. */}
          <strong>{aura.rang.nom}</strong>
          <small>Voir les rangs et leurs récompenses.</small>
        </span>
        <span className={styles.rankExp}>
          <strong>{auraLoaded ? aura.exp : "—"} EXP</strong>
          <small>sur {aura.seuilHaut}</small>
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
      </button>

      <section>
        <SectionHeading
          title="Missions du jour"
          subtitle="Tu sais ce que ça rapporte avant de le faire."
          aside={`${expDuJour} / ${plafondDuJour} EXP`}
        />
        <div className={styles.missionStack}>
          {MISSIONS_JOUR.map((mission) => (
            <LigneMission
              key={mission.id}
              mission={mission}
              etat={aura.missions[mission.id]}
              debloquee
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          title="Cette semaine"
          subtitle="Des jours validés, jamais un nombre de séances."
          aside={`${aura.detail.joursActifsSemaine} / 7 jours`}
        />
        <div className={styles.missionStack}>
          {MISSIONS_SEMAINE.map((mission) => (
            <LigneMission
              key={mission.id}
              mission={mission}
              etat={aura.missions[mission.id]}
              debloquee={!mission.premium || premiumUnlocked}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="Missions Premium" />
        <div className={styles.premiumVault}>
          <div className={styles.premiumHeading}>
            <span className={styles.premiumSeal} aria-hidden="true" />
            <span className={styles.premiumHeadingCopy}>
              <strong>Un autre terrain de jeu</strong>
              <small>Des missions supplémentaires, jamais obligatoires.</small>
            </span>
            <span className={styles.premiumBonus}>
              <strong>+{expPremiumJour}</strong>
              <small>EXP / jour</small>
            </span>
          </div>

          <div className={styles.premiumList}>
            {MISSIONS_PREMIUM.map((mission) => (
              <LigneMission
                key={mission.id}
                mission={mission}
                etat={aura.missions[mission.id]}
                debloquee={premiumUnlocked}
                onNavigate={onNavigate}
              />
            ))}
          </div>

          <div className={styles.premiumFooter}>
            <p>
              {premiumUnlocked
                ? "Missions Premium actives sur ton compte."
                : `Quatre missions du jour en plus, et un palier de plus dans la semaine : jusqu'à ${PLAFOND_JOUR_PREMIUM} EXP par jour.`}
            </p>
            {!premiumUnlocked && (
              <button type="button" onClick={() => onNavigate("/premium")}>
                Débloquer
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── La série ─────────────────────────────────────────────────────────
   Elle répond à UNE question : « est-ce que je suis revenu faire quelque
   chose aujourd'hui ? ». Pas de pourcentage, pas de tableau, pas
   d'historique : un nombre, et ce qu'il reste à faire pour le garder.

   ⚠️ SE CONNECTER NE LA VALIDE PAS. C'est la règle la plus importante du
   système, et c'est pour ça que la phrase dit « une action », jamais
   « reviens demain ». Une série qui monte en ouvrant l'app ne mesure
   rien, et tout le monde finit par le sentir. */
function BlocSerie({
  serie,
  jourValide,
  charge,
}: {
  serie: number;
  jourValide: boolean;
  charge: boolean;
}) {
  /* Tant que la base n'a pas répondu, on n'affiche pas de série : un « 0 »
     provisoire chez quelqu'un qui en est à 30 jours serait le pire des
     messages possibles. */
  if (!charge) return null;

  const aUneSerie = serie > 0;
  return (
    <section className={styles.streak} data-done={jourValide ? "" : undefined}>
      <span className={styles.streakFlame} aria-hidden="true">🔥</span>
      <span className={styles.streakCopy}>
        <strong>
          {aUneSerie ? `${serie} jour${serie > 1 ? "s" : ""}` : "Aujourd’hui"}
        </strong>
        <small>
          {jourValide
            ? "Journée validée."
            : aUneSerie
              ? "Fais une action pour continuer ta série."
              : "Une séance ou un repas lance ta série."}
        </small>
      </span>
      {jourValide && (
        <span className={styles.streakCheck} aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </span>
      )}
    </section>
  );
}

/* ── Le mot du Guide ──────────────────────────────────────────────────
   Un visage de 40 px et une phrase, posés sur la page. Ni carte, ni
   cadre, ni bandeau coloré : ce n'est pas une notification, c'est
   quelqu'un qui dit une chose en passant. La règle « ni carte, ni cadre,
   ni pastille » du grand personnage vaut ici aussi, et l'avatar rond est
   la seule forme admise (c'est déjà celle de la conversation).

   Il ne porte AUCUN bouton. Ce que le Guide propose (une séance, un
   repas) existe déjà juste en dessous, dans les missions du jour : lui
   ajouter une commande dupliquerait la même action à trois centimètres
   d'écart. */
function MotDuGuide({
  guide,
  moment,
  reduce,
}: {
  guide: GuideRef;
  moment: MomentAccueil;
  reduce: boolean;
}) {
  return (
    <motion.div
      className={styles.guideWord}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <VisageGuide guide={guide} etat={moment.etat} size={40} />
      <p>{voix(guide, moment.phrase, moment.ctx)}</p>
    </motion.div>
  );
}

function SectionHeading({
  title,
  subtitle,
  aside,
}: {
  title: string;
  subtitle?: string;
  aside?: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {aside && <span>{aside}</span>}
    </div>
  );
}

/* ── Une mission ──────────────────────────────────────────────────────
   Une seule ligne pour les trois familles (jour, semaine, Premium) :
   elles disent exactement la même chose, il n'y avait aucune raison de
   les écrire deux fois.

   Elle montre les quatre informations exigées par le produit : le NOM, la
   CONDITION, la RÉCOMPENSE en EXP, et l'ÉTAT. Rien n'est calculé ici, tout
   est lu, c'est ce qui rend impossible un écart entre le « +30 EXP »
   affiché et le crédit réel.

   ⚠️ UNE MISSION PREMIUM SE DESSINE PAREIL PARTOUT, et sa marque se lit sur
   `mission.premium`, jamais sur l'endroit où la ligne est rendue. C'est ce
   qui permet à « Semaine régulière » de porter exactement la même
   signalétique au milieu des missions gratuites de la semaine que les
   quatre missions du bloc Premium : basculer une mission d'une famille à
   l'autre est un booléen dans le catalogue, et l'écran suit tout seul.

   Il a existé une deuxième écriture, sombre, réservée au bloc Premium
   (2026-08-21). Elle est SUPPRIMÉE : deux façons de dessiner la même chose,
   c'est une chose de plus à comprendre, et la version dorée suffisait. */
function LigneMission({
  mission,
  etat,
  debloquee,
  onNavigate,
}: {
  mission: Mission;
  etat: ProgressionMission;
  /** Le compte a-t-il droit à cette mission ? Un compte gratuit voit quand
   *  même la mission Premium et sa progression : on ne cache pas ce qu'on
   *  vend, on dit juste qu'il faut Premium pour l'encaisser. */
  debloquee: boolean;
  onNavigate: (path: string) => void;
}) {
  const premium = mission.premium;
  const route = debloquee ? mission.route : "/premium";

  /* ⚠️ LA CONDITION RESTE SOUS LE TITRE, elle ne se fait remplacer par
     rien. « Ouvrir Vaiiya. Ne valide pas ta journée. » porte la règle la
     plus importante du système : c'est la seule phrase de l'app qui dit
     que venir ne suffit pas. Ce qu'il reste à faire prend donc la place
     de l'ancien « À FAIRE », qui n'apprenait rien. */
  /* Rien sous le sceau quand la mission est gagnée : le tampon teal et sa
     coche le disent déjà, et « Validée » écrit à côté ferait doublon. */
  const etatTexte = etat.earned
    ? null
    : !debloquee && etat.complete
      ? "Premium"
      : resteMission(mission, etat);

  const contenu = (
    <>
      <span className={styles.sigil}>
        <Image
          src={mission.image}
          alt=""
          width={42}
          height={42}
          className={styles.dailyMissionImage}
        />
        {premium && !debloquee && <Cadenas />}
      </span>
      <span className={styles.missionCopy}>
        <strong>
          {mission.titre}
          {premium && <em className={styles.tagPremium}>Premium</em>}
        </strong>
        <small>{mission.condition}</small>
      </span>
      <span className={styles.gain}>
        <span className={styles.sceau} data-earned={etat.earned ? "" : undefined}>
          {etat.earned && (
            <>
              {/* La coche porte le sens à l'œil, le mot le porte à l'oreille :
                  sans lui, une synthèse vocale lirait « plus 5 EXP » sur une
                  mission déjà encaissée comme sur une mission à faire. */}
              <span className={styles.horsEcran}>Validée, </span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </>
          )}
          <strong>+{mission.exp}</strong>
          <em>EXP</em>
        </span>
        {etatTexte && <small>{etatTexte}</small>}
      </span>
    </>
  );

  const marque = premium ? "" : undefined;
  if (!route) return <div className={styles.mission} data-premium={marque}>{contenu}</div>;
  return (
    <button type="button" className={styles.mission} data-premium={marque} onClick={() => onNavigate(route)}>
      {contenu}
    </button>
  );
}

/* Le cadenas posé sur le pictogramme, repris des cartes Premium du
   catalogue de séances : le reprendre ici évite d'apprendre deux fois la
   même chose à la même personne.

   ⚠️ IL NE S'AFFICHE QUE POUR UN COMPTE QUI N'Y A PAS DROIT. Il a existé
   une version « étincelle pour un abonné » : elle mettait une pastille
   dorée sur les quatre missions de quelqu'un qui les a déjà, donc elle
   lui vendait ce qu'il a payé. Un abonné ne voit plus aucune pastille,
   et c'est le bon signal : chez lui la mission est simplement une
   mission. */
function Cadenas() {
  return (
    <span className={styles.cachet} aria-hidden="true">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
        <rect x="4" y="10.5" width="16" height="11" rx="2.6" fill="currentColor" stroke="none" />
        <path d="M8.2 10.5V7.6a3.8 3.8 0 0 1 7.6 0v2.9" />
      </svg>
    </span>
  );
}

function BrandSpark() {
  return <span className={styles.brandSpark} aria-hidden="true" />;
}

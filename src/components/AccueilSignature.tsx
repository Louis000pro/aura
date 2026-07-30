"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import GemmeRang from "@/components/GemmeRang";
import { EXP_CONNEXION, EXP_REPAS, EXP_SEANCE, EXP_SEANCE_STREAK, type EtatAura } from "@/lib/aura";
import { formatPrice, PLANS, VENTE_OUVERTE } from "@/lib/plans";
import styles from "./AccueilSignature.module.css";

type MissionKind =
  | "connexion"
  | "seance"
  | "repas"
  | "double"
  | "matin"
  | "intense"
  | "nutrition"
  | "parfaite";

type DailyMissionKind = Extract<MissionKind, "connexion" | "seance" | "repas">;
type PremiumMissionKind = Exclude<MissionKind, DailyMissionKind>;

type PremiumMission = {
  kind: PremiumMissionKind;
  titre: string;
  sous: string;
  exp: number;
  image: string;
  period: "jour" | "semaine";
  path?: string;
};

const DAILY_MISSION_IMAGES: Record<DailyMissionKind, string> = {
  connexion: "/missions/daily/connexion-v1.webp",
  seance: "/missions/daily/seance-v1.webp",
  repas: "/missions/daily/repas-v1.webp",
};

const MISSIONS_PREMIUM: PremiumMission[] = [
  {
    kind: "double",
    titre: "Double séance",
    sous: "Deux séances de 5 min minimum aujourd’hui",
    exp: 60,
    image: "/missions/premium/double-seance-v1.webp",
    period: "jour",
    path: "/progression",
  },
  {
    kind: "matin",
    titre: "Lève-tôt",
    sous: "Une séance de 5 min minimum avant 9 h",
    exp: 40,
    image: "/missions/premium/leve-tot-v1.webp",
    period: "jour",
    path: "/progression",
  },
  {
    kind: "intense",
    titre: "Semaine intense",
    sous: "Cinq séances de 5 min minimum cette semaine",
    exp: 50,
    image: "/missions/premium/semaine-intense-v1.webp",
    period: "semaine",
    path: "/progression",
  },
  {
    kind: "nutrition",
    titre: "Journée nutrition complète",
    sous: "Petit-déjeuner, déjeuner et dîner notés",
    exp: 15,
    image: "/missions/premium/nutrition-complete-v1.webp",
    period: "jour",
    path: "/nutrition",
  },
  {
    kind: "parfaite",
    titre: "Semaine parfaite",
    sous: "Sept jours de connexion dans la semaine",
    exp: 35,
    image: "/missions/premium/semaine-parfaite-v1.webp",
    period: "semaine",
  },
];

export default function AccueilSignature({
  greeting,
  pseudo,
  aura,
  auraLoaded,
  expGain,
  isPremium,
  isAdmin,
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
  onNavigate: (path: string) => void;
  onOpenRangs: () => void;
}) {
  const reduce = useReducedMotion();
  const premiumUnlocked = isPremium || isAdmin;
  const showPremiumOffer = !isPremium;
  const connexionOk = aura.missions.today.connexion.complete;
  const seanceOk = aura.missions.today.seance.complete;
  const repasOk = aura.missions.today.repas.complete;
  const streak = Math.max(1, aura.detail.streak);
  const prix = formatPrice(PLANS.premium.priceCents);
  const expDuJour =
    (connexionOk ? EXP_CONNEXION : 0) +
    (seanceOk ? EXP_SEANCE + EXP_SEANCE_STREAK : 0) +
    (repasOk ? EXP_REPAS : 0);

  return (
    <div className={styles.home}>
      <header className={styles.greeting}>
        <p>{greeting}</p>
        <h1>
          <span className={styles.pseudo}>{pseudo}</span>
        </h1>
        <span>Content de te revoir.</span>
      </header>

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

      <button type="button" className={styles.rankStrip} onClick={onOpenRangs}>
        <span className={styles.rankGem}>
          <GemmeRang rang={aura.rang} size={34} />
        </span>
        <span className={styles.rankCopy}>
          <strong>{aura.rang.nom} · Jour {streak}</strong>
          <small>Te revoilà — ton histoire continue.</small>
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
          subtitle="Trois gestes simples, quand tu veux."
          aside={`${expDuJour} EXP gagnés`}
        />
        <div className={styles.missionStack}>
          <MissionRow
            kind="connexion"
            titre="Connexion du jour"
            sous="Présence validée"
            exp={EXP_CONNEXION}
            done={connexionOk}
          />
          <MissionRow
            kind="seance"
            titre={seanceOk ? "Séance terminée" : "Terminer une séance"}
            sous={seanceOk ? "Ton rang vient d’avancer" : `Choisis celle qui te ressemble · bonus série +${EXP_SEANCE_STREAK}`}
            exp={EXP_SEANCE}
            done={seanceOk}
            onClick={() => onNavigate("/progression")}
          />
          <MissionRow
            kind="repas"
            titre={repasOk ? "Repas noté" : "Noter un repas"}
            sous={repasOk ? "Ton rang vient d’avancer" : "Quelques secondes suffisent"}
            exp={EXP_REPAS}
            done={repasOk}
            tone="energy"
            onClick={() => onNavigate("/nutrition")}
          />
        </div>
      </section>

      <section>
        <SectionHeading title="Missions Premium" />
        <div className={styles.premiumVault} data-locked={!premiumUnlocked ? "" : undefined}>
          <div className={styles.premiumHeading}>
            <span className={styles.premiumSeal} aria-hidden="true" />
            <span className={styles.premiumHeadingCopy}>
              <strong>Un autre terrain de jeu</strong>
              <small>Des missions supplémentaires, jamais obligatoires.</small>
            </span>
          </div>

          <div className={styles.premiumList}>
            {MISSIONS_PREMIUM.map((mission) => {
              const target = premiumUnlocked ? mission.path : "/premium";
              const state = aura.missions.premiumMissions[mission.kind];
              return (
                <button
                  key={mission.titre}
                  type="button"
                  className={styles.premiumMission}
                  onClick={target ? () => onNavigate(target) : undefined}
                  disabled={!target}
                >
                  <span className={styles.premiumSigil}>
                    <Image
                      src={mission.image}
                      alt=""
                      width={42}
                      height={42}
                      className={styles.premiumMissionImage}
                    />
                  </span>
                  <span className={styles.premiumMissionCopy}>
                    <strong>{mission.titre}</strong>
                    <small>{mission.sous}</small>
                  </span>
                  <span className={styles.premiumMissionExp} data-earned={state.earned ? "" : undefined}>
                    <strong>+{mission.exp} EXP</strong>
                    <small>
                      {state.earned
                        ? "Validée"
                        : state.progress > 0
                          ? `${state.progress}/${state.target}`
                          : mission.period}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>

          <div className={styles.premiumFooter}>
            <p>
              {premiumUnlocked
                ? "Missions Premium actives sur ton compte."
                : "Missions, programmes et assistant illimités."}
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

function MissionRow({
  kind,
  titre,
  sous,
  exp,
  done = false,
  tone = "action",
  onClick,
}: {
  kind: DailyMissionKind;
  titre: string;
  sous: string;
  exp: number;
  done?: boolean;
  tone?: "action" | "energy";
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className={styles.sigil} data-tone={done ? "success" : tone}>
        <Image
          src={DAILY_MISSION_IMAGES[kind]}
          alt=""
          width={42}
          height={42}
          className={styles.dailyMissionImage}
        />
      </span>
      <span className={styles.missionCopy}>
        <strong>{titre}</strong>
        <small>{sous}</small>
      </span>
      <span className={styles.missionExp} data-tone={done ? "success" : tone}>
        {done ? "Validée" : `+${exp} EXP`}
      </span>
    </>
  );

  if (!onClick) {
    return <div className={styles.mission}>{content}</div>;
  }

  return (
    <button type="button" className={styles.mission} onClick={onClick}>
      {content}
    </button>
  );
}

function BrandSpark() {
  return <span className={styles.brandSpark} aria-hidden="true" />;
}

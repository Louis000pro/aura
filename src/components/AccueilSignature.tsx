"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import GemmeRang from "@/components/GemmeRang";
import { EXP_CONNEXION, EXP_REPAS, EXP_SEANCE, EXP_SEANCE_STREAK, type EtatAura } from "@/lib/aura";
import { formatPrice, PLANS } from "@/lib/plans";
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

type PremiumMission = {
  kind: MissionKind;
  titre: string;
  sous: string;
  exp: number;
  image: string;
  path?: string;
};

const MISSIONS_PREMIUM: PremiumMission[] = [
  {
    kind: "double",
    titre: "Double séance",
    sous: "Deux séances dans la même journée",
    exp: 60,
    image: "/missions/premium/double-seance-v1.webp",
    path: "/progression",
  },
  {
    kind: "matin",
    titre: "Lève-tôt",
    sous: "Une séance avant 9 h",
    exp: 40,
    image: "/missions/premium/leve-tot-v1.webp",
    path: "/progression",
  },
  {
    kind: "intense",
    titre: "Semaine intense",
    sous: "Cinq séances dans la semaine",
    exp: 50,
    image: "/missions/premium/semaine-intense-v1.webp",
    path: "/progression",
  },
  {
    kind: "nutrition",
    titre: "Journée nutrition complète",
    sous: "Tous les repas du jour notés",
    exp: 15,
    image: "/missions/premium/nutrition-complete-v1.webp",
    path: "/nutrition",
  },
  {
    kind: "parfaite",
    titre: "Semaine parfaite",
    sous: "Sept jours de connexion",
    exp: 35,
    image: "/missions/premium/semaine-parfaite-v1.webp",
  },
];

export default function AccueilSignature({
  greeting,
  pseudo,
  aura,
  auraLoaded,
  expGain,
  seanceOk,
  repasOk,
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
  seanceOk: boolean;
  repasOk: boolean;
  isPremium: boolean;
  isAdmin: boolean;
  onNavigate: (path: string) => void;
  onOpenRangs: () => void;
}) {
  const reduce = useReducedMotion();
  const premiumUnlocked = isPremium || isAdmin;
  const showPremiumOffer = !isPremium;
  const streak = Math.max(1, aura.detail.streak);
  const prix = formatPrice(PLANS.premium.priceCents);
  const expDuJour =
    EXP_CONNEXION +
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
              Découvrir · {prix}
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
            done
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
        <SectionHeading
          title="Missions Premium"
          subtitle={premiumUnlocked ? "Elles sont toutes débloquées." : "Tu vois exactement ce que tu pourrais débloquer."}
        />
        <div className={styles.premiumVault}>
          <div className={styles.premiumHeading}>
            <span className={styles.premiumSeal} aria-hidden="true" />
            <span className={styles.premiumHeadingCopy}>
              <strong>Un autre terrain de jeu</strong>
              <small>Des missions supplémentaires, jamais obligatoires.</small>
            </span>
            <span className={styles.premiumPrice}>
              <strong>{prix}</strong>
              <small>par mois</small>
            </span>
          </div>

          <div className={styles.premiumList}>
            {MISSIONS_PREMIUM.map((mission) => {
              const target = premiumUnlocked ? mission.path : "/premium";
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
                  <span className={styles.premiumMissionExp}>+{mission.exp}</span>
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
  subtitle: string;
  aside?: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
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
  kind: MissionKind;
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
        <MissionSigil kind={done ? "connexion" : kind} />
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

function MissionSigil({ kind }: { kind: MissionKind }) {
  const common = {
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (kind) {
    case "connexion":
      return (
        <svg {...common} aria-hidden="true">
          <path d="m8 16.5 5 5L24 10" />
          <path d="M16 4.5c4.2 0 7.7 2.4 9.3 6M27.5 16A11.5 11.5 0 1 1 11 5.6" />
        </svg>
      );
    case "seance":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M5 21c3.4-6.5 7.1-9.7 11-9.7S23.6 14.5 27 21" />
          <path d="m8.8 22 3-5.2 4.2 5.7 4.2-5.7 3 5.2M16 5.5v5M13.5 8h5" />
        </svg>
      );
    case "repas":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M6.5 21c3.1 4 15.9 4 19 0M9 18c1.3-4.4 3.6-6.7 7-6.7s5.7 2.3 7 6.7" />
          <path d="M16 11.3c-.6-3 .8-5 4-6M19.6 5.4c.5 2.5-.3 4.1-2.4 4.9" />
        </svg>
      );
    case "double":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M10 5.5 5.5 16 10 26.5M22 5.5 26.5 16 22 26.5M15 7l-3 7h4l-1 11 5-13h-4l2-5" />
        </svg>
      );
    case "matin":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M5 24h22M9 24a7 7 0 0 1 14 0M16 5v4M7.5 9l2.8 2.8M24.5 9l-2.8 2.8" />
        </svg>
      );
    case "intense":
      return (
        <svg {...common} aria-hidden="true">
          <path d="m6 16 5-7 5 7 5-7 5 7-5 7-5-7-5 7Z" />
          <circle cx="6" cy="16" r="1.5" />
          <circle cx="26" cy="16" r="1.5" />
        </svg>
      );
    case "nutrition":
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="16" cy="16" r="10" />
          <path d="M16 6v10l8.7 5M9.8 23.8 16 16" />
        </svg>
      );
    case "parfaite":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M16 5v4M16 23v4M5 16h4M23 16h4M8.2 8.2 11 11M21 21l2.8 2.8M23.8 8.2 21 11M11 21l-2.8 2.8" />
          <path d="m16 11 1.6 3.4L21 16l-3.4 1.6L16 21l-1.6-3.4L11 16l3.4-1.6Z" />
        </svg>
      );
  }
}

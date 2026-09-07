"use client";

/* ─────────────────────────────────────────────────────────────────────
   LA FEUILLE « MISSIONS ».

   Ce qu'ouvre « Voir tout ». Elle porte le catalogue ENTIER, celui qui
   occupait 1 100 px d'accueil avant V7B : les quatre missions du jour,
   les quatre Premium, les trois de la semaine.

   ⚠️ UNE FEUILLE, PAS UN ACCORDÉON, et la différence est tout le sujet.
   Un accordéon rallongerait l'accueil de la hauteur exacte qu'on vient
   de lui retirer. Une feuille défile toute seule et se referme sur un
   écran qui n'a pas bougé d'un pixel. C'est la même famille que
   « Avec qui ? », « Quel jour ? » ou la fiche d'un mouvement, et c'est
   littéralement le même composant `Sheet`.

   ⚠️ AUCUN SECOND MOTEUR DE MISSIONS. Les trois listes sont les trois
   constantes du catalogue, les lignes sont le composant partagé, l'état
   vient d'`aura.missions`. Ce fichier ne décide de rien.
   ───────────────────────────────────────────────────────────────────── */

import Sheet from "@/components/communaute/Sheet";
import LigneMission, { listeMissions } from "@/components/missions/LigneMission";
import {
  MISSIONS_JOUR,
  MISSIONS_PREMIUM,
  MISSIONS_SEMAINE,
  PLAFOND_JOUR_GRATUIT,
  PLAFOND_JOUR_PREMIUM,
  type EtatAura,
  type Mission,
} from "@/lib/aura";
import { missionDebloquee } from "@/lib/missionsAccueil";
import styles from "./FeuilleMissions.module.css";

export default function FeuilleMissions({
  aura,
  premiumDebloque,
  onNavigate,
  onFermer,
}: {
  aura: EtatAura;
  /** Abonné ou administrateur : l'entitlement existant, calculé par l'appelant. */
  premiumDebloque: boolean;
  onNavigate: (path: string) => void;
  onFermer: () => void;
}) {
  /* Ce qui a réellement été crédité aujourd'hui, et le maximum atteignable.
     On affiche les deux : « 35 / 50 EXP » se comprend d'un coup d'œil, un
     total seul ne dit pas où il s'arrête. C'est le seul endroit du produit
     qui porte encore ce compte : l'accueil, lui, n'affiche plus qu'une
     seule EXP, celle du rang. */
  const expDuJour = [...MISSIONS_JOUR, ...MISSIONS_PREMIUM]
    .filter((m) => aura.missions[m.id]?.earned)
    .reduce((total, m) => total + m.exp, 0);
  const plafondDuJour = premiumDebloque ? PLAFOND_JOUR_PREMIUM : PLAFOND_JOUR_GRATUIT;

  /* Ce que les missions Premium ajoutent en une journée. Calculé, jamais
     écrit : le jour où l'une d'elles change de valeur, ce chiffre suit. */
  const expPremiumJour = MISSIONS_PREMIUM.reduce((total, m) => total + m.exp, 0);

  const rendre = (missions: Mission[]) => (
    <div className={listeMissions}>
      {missions.map((mission) => (
        <LigneMission
          key={mission.id}
          mission={mission}
          etat={aura.missions[mission.id]}
          debloquee={missionDebloquee(mission, premiumDebloque)}
          onNavigate={(path) => {
            onFermer();
            onNavigate(path);
          }}
        />
      ))}
    </div>
  );

  return (
    <Sheet onFermer={onFermer}>
      <div className={styles.head}>
        <h2>Missions</h2>
        <span className={styles.headExp}>
          {expDuJour} / {plafondDuJour} EXP
        </span>
      </div>

      {/* ⚠️ C'EST LE CORPS QUI DÉFILE, PAS LA PAGE. La feuille est déjà
          `fixed` en bas de l'écran : sans hauteur bornée ici, onze lignes
          la feraient dépasser du haut du téléphone, et l'en-tête sortirait
          de l'écran avec elle. */}
      <div className={styles.corps}>
        <section className={styles.sec}>
          <div className={styles.lab}>
            Aujourd’hui
            <span>
              {MISSIONS_JOUR.filter((m) => aura.missions[m.id]?.complete).length} / {MISSIONS_JOUR.length}
            </span>
          </div>
          {rendre(MISSIONS_JOUR)}
        </section>

        <section className={styles.sec}>
          <div className={styles.lab}>
            {premiumDebloque ? "Tes missions Premium" : "Avec Premium"}
            <span className={styles.labOr}>+{expPremiumJour} EXP / jour</span>
          </div>
          {rendre(MISSIONS_PREMIUM)}
        </section>

        <section className={styles.sec}>
          <div className={styles.lab}>
            Cette semaine
            <span>{aura.detail.joursActifsSemaine} / 7 jours</span>
          </div>
          {rendre(MISSIONS_SEMAINE)}
        </section>

        {/* La règle qui explique tout le reste, une fois, en bas. Elle ne
            se dit nulle part ailleurs depuis que l'accueil ne liste plus
            les missions. */}
        <p className={styles.regle}>Ouvrir Vaiiya ne valide pas ta journée.</p>
      </div>
    </Sheet>
  );
}

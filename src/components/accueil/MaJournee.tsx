"use client";

/* ─────────────────────────────────────────────────────────────────────
   V7B · « MA JOURNÉE », LE GROUPE FUSIONNÉ.

   ⚠️ POURQUOI UN SEUL GROUPE ET PAS DEUX. « Ma journée » et « Missions »
   comptaient les mêmes quatre choses : les quatre missions quotidiennes
   SONT la journée. Écrits l'un sous l'autre, « Séance » et « Repas »
   apparaissaient deux fois à cent pixels d'écart. Un titre, un compte,
   les marqueurs, l'action, le manque Premium : une idée, un groupe, des
   filets internes (règle de composition verrouillée).

   Ce que le groupe porte, dans cet ordre :
     1. « Ma journée · X / 4 missions · Voir tout › »  → la feuille
     2. les trois marqueurs : Présence · Séance · Repas
     3. l'action utile qui reste, s'il y en a une
     4. une seule mission Premium, celle du jour

   Il ne décide RIEN : tout vient de `missionsAccueil.ts`, qui lit
   lui-même `aura.missions`, c'est-à-dire l'évaluation existante.
   ───────────────────────────────────────────────────────────────────── */

import { ChevronRight } from "lucide-react";
import LigneMission from "@/components/missions/LigneMission";
import type { EtatAura } from "@/lib/aura";
import {
  actionRestante,
  apercuPremiumDuJour,
  compteMissionsJour,
  marqueursDuJour,
  missionDebloquee,
} from "@/lib/missionsAccueil";
import styles from "./MaJournee.module.css";

export default function MaJournee({
  aura,
  jour,
  premiumDebloque,
  onNavigate,
  onVoirTout,
}: {
  aura: EtatAura;
  /** Le jour parisien courant, `YYYY-MM-DD`. Il décide quelle mission
   *  Premium est mise en avant : la rotation est déterministe, donc le
   *  serveur et le client tombent sur la même. */
  jour: string;
  premiumDebloque: boolean;
  onNavigate: (path: string) => void;
  onVoirTout: () => void;
}) {
  const { fait, total } = compteMissionsJour(aura);
  const marqueurs = marqueursDuJour(aura);
  const action = actionRestante(aura);
  const apercu = apercuPremiumDuJour(jour);

  return (
    <section className={styles.groupe} aria-label="Ma journée">
      <button type="button" className={styles.tete} onClick={onVoirTout}>
        <span className={styles.titre}>Ma journée</span>
        <span className={styles.compte}>
          <b>
            {fait} / {total}
          </b>
          <small>missions</small>
        </span>
        {/* ⚠️ LE CHEVRON SEUL, ET LE MOT EN MOINS. « Voir tout » redisait ce
            que la tête fait déjà : elle est un bouton en entier depuis V7B,
            et le compte « 2 / 4 » annonce lui-même qu'il y en a plus à voir.
            C'est l'accessoire qu'on enlève pour payer l'agrandissement du
            reste. ⚠️ Le chevron, LUI, RESTE : c'est le seul signe que la
            ligne s'ouvre, et le retirer coûterait une affordance au lieu
            d'un mot. */}
        <ChevronRight size={17} strokeWidth={2.4} className={styles.voir} aria-hidden="true" />
      </button>

      <ul className={styles.marques}>
        {marqueurs.map((m) => (
          <li key={m.id} className={styles.marque} data-on={m.acquis ? "" : undefined}>
            <i className={styles.pip} aria-hidden="true">
              {m.acquis && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </i>
            {m.libelle}
            <span className={styles.horsEcran}>{m.acquis ? " : fait" : " : à faire"}</span>
          </li>
        ))}
      </ul>

      {/* ⚠️ L'ACTION NE DUPLIQUE JAMAIS LE HÉROS. « Terminer une séance »
          est déjà portée juste au-dessus, en photo et en grand, avec son
          bouton violet : la règle vit dans `actionRestante`, pas ici. */}
      {action?.route && (
        <button type="button" className={styles.action} onClick={() => onNavigate(action.route!)}>
          {action.titre}
          <ChevronRight size={17} strokeWidth={2.2} className={styles.chev} aria-hidden="true" />
        </button>
      )}

      {/* Une seule mission Premium, en rotation quotidienne : c'est ce qui
          crée un manque lisible sans revendre l'offre en grand. L'affiche
          Premium et le coffre ont quitté l'accueil en V7B ; le
          `PremiumBanner` global, lui, n'est pas touché.

          ⚠️ Chez un abonné, c'est simplement une de ses missions : pas de
          cadenas, pas de renvoi vers /premium. `missionDebloquee` porte
          cette règle pour tout le produit. */}
      {apercu && (
        <div className={styles.apercu}>
          <LigneMission
            mission={apercu}
            etat={aura.missions[apercu.id]}
            debloquee={missionDebloquee(apercu, premiumDebloque)}
            onNavigate={onNavigate}
          />
        </div>
      )}
    </section>
  );
}

"use client";

import Image from "next/image";
import { resteMission, type Mission, type ProgressionMission } from "@/lib/aura";
import styles from "./LigneMission.module.css";

/* ⚠️ AUCUNE MISSION N'EST DÉCRITE DANS CE FICHIER. Son nom, sa condition et
   son EXP viennent tous de `MISSIONS` (src/lib/aura.ts), qui est aussi ce que
   la base crédite. Recopier un nombre ici, c'est promettre à l'écran ce que le
   serveur ne donnera pas.

   Ce composant vivait dans `AccueilSignature.tsx`. Il en est sorti en V7B :
   l'accueil n'empile plus de missions, mais trois surfaces les rendent
   désormais (la feuille « Missions », la zone de constance du profil,
   /premium). Une seule écriture, partout la même. */

/** L'empilement qui contient des lignes de mission : un cadre, des filets. */
export const listeMissions = styles.missionStack;

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
   quatre missions Premium : basculer une mission d'une famille à l'autre
   est un booléen dans le catalogue, et l'écran suit tout seul.

   Il a existé une deuxième écriture, sombre, réservée au bloc Premium
   (2026-08-21). Elle est SUPPRIMÉE : deux façons de dessiner la même chose,
   c'est une chose de plus à comprendre, et la version dorée suffisait. */
export default function LigneMission({
  mission,
  etat,
  debloquee,
  onNavigate,
}: {
  mission: Mission;
  /** La progression réelle, lue dans `aura.missions`.
   *
   *  ⚠️ ABSENTE = ON NE SUIT RIEN, ET C'EST UN CAS LÉGITIME. Sur /premium
   *  la page est publique : personne n'a d'aura à afficher, et poser un
   *  « encore 2 séances » par défaut affirmerait une progression nulle à
   *  quelqu'un qui les a peut-être faites. La ligne devient alors un
   *  CATALOGUE (nom, condition, gain, marque Premium) et rien de plus. */
  etat?: ProgressionMission;
  /** Le compte a-t-il droit à cette mission ? Un compte gratuit voit quand
   *  même la mission Premium et sa progression : on ne cache pas ce qu'on
   *  vend, on dit juste qu'il faut Premium pour l'encaisser.
   *
   *  ⚠️ Se calcule avec `missionDebloquee` (src/lib/missionsAccueil.ts),
   *  jamais à la main : un abonné ne doit jamais voir sa propre mission
   *  présentée comme inaccessible. */
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
  const etatTexte = !etat
    ? null
    : etat.earned
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
        <span className={styles.sceau} data-earned={etat?.earned ? "" : undefined}>
          {etat?.earned && (
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

/* Le cadenas doré posé sur le coin du pictogramme, pour un compte qui n'a
   pas encore Premium. Le même dessin est repris sur les cartes du catalogue
   (`Cadenas` dans progression/page.tsx) : un seul signe de verrou dans
   toute l'app.

   ⚠️ IL NE S'AFFICHE QUE POUR QUI N'Y A PAS DROIT. Il a existé une version
   qui posait une étincelle sur les missions d'un abonné : elle lui vendait
   ce qu'il a déjà payé. Chez un abonné, une mission Premium est simplement
   une mission, et elle ne porte aucune pastille.

   ⚠️ UN « + » A REMPLACÉ CE CADENAS PENDANT UNE JOURNÉE, PUIS LOUIS EST
   REVENU AU VERROU (2026-08-22). L'idée était qu'un cadenas dit ce qu'on ne
   peut pas faire quand un « + » dit ce qu'il y a à prendre. À l'écran, le
   « + » ne se reconnaissait pas : il ne donnait ni l'envie ni même l'idée
   qu'on pouvait toucher. Le verrou, lui, se lit sans apprentissage. Ne pas
   refaire l'aller-retour.

   ⚠️ Il déborde du pictogramme, donc `.sigil` ne peut pas porter
   `overflow: hidden`. Ce n'est pas une perte : les WebP arrivent déjà avec
   leurs coins arrondis découpés en transparence. */
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

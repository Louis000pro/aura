"use client";

/* ─────────────────────────────────────────────────────────────────────
   LA FICHE D'UNE QUÊTE (Louis, 2026-11-02 : « quand on clique sur une
   quête, on doit pouvoir voir tous ses détails, comment on la réalise »).

   Ce qu'ouvre le toucher d'une quête, partout où elle s'affiche : le rail
   de l'accueil, la feuille « Missions » et /premium. Quatre choses, et
   rien de plus : ce qu'elle rapporte et jusqu'à quand, où on en est, les
   étapes pour la faire, et le bouton qui mène au bon écran.

   ⚠️ AUCUNE QUÊTE N'EST DÉCRITE ICI. Les étapes, la note et le mot du
   bouton vivent dans `MISSIONS` (lib/aura.ts), avec le reste de la
   quête ; l'avancée vient d'`aura.missions`, l'évaluation de la base. Ce
   fichier ne fait que les poser.
   ───────────────────────────────────────────────────────────────────── */

import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import Sheet from "@/components/communaute/Sheet";
import { MISSIONS, expMission, type EtatAura, type Mission } from "@/lib/aura";
import ligne from "./LigneMission.module.css";
import styles from "./FicheQuete.module.css";

const NB = String.fromCharCode(160);

/** La typographie française, posée au rendu : espace insécable avant
 *  « : ; ? ! », dans les guillemets et après un nombre (« 5 min », « 9 h »). */
function typo(s: string): string {
  return s
    .replace(/ ([:;?!»])/g, NB + "$1")
    .replace(/« /g, "«" + NB)
    .replace(/(\d) /g, "$1" + NB);
}

/** Où mène le bouton : l'écran de la quête, ou, pour une quête faite
 *  d'autres quêtes (« Journée complète »), celui de la première étape qui
 *  reste à faire. */
function suite(mission: Mission, aura?: EtatAura | null): { route: string; action: string } | null {
  if (mission.route && mission.action) return { route: mission.route, action: mission.action };
  for (const etape of mission.etapes) {
    if (!etape.quete || aura?.missions[etape.quete]?.complete) continue;
    const quete = MISSIONS.find((m) => m.id === etape.quete);
    if (quete?.route && quete.action) return { route: quete.route, action: quete.action };
  }
  return null;
}

export function FicheQuete({
  mission,
  aura,
  debloquee,
  onNavigate,
  onRetour,
}: {
  mission: Mission;
  /** Absente sur /premium : la page est publique, on n'y suit rien. */
  aura?: EtatAura | null;
  /** `missionDebloquee` (lib/missionsAccueil.ts), jamais calculé à la main. */
  debloquee: boolean;
  /** Absent : pas de bouton (sur /premium, on y est déjà). */
  onNavigate?: (path: string) => void;
  /** Ouverte dans la feuille « Missions » : revenir à la liste. */
  onRetour?: () => void;
}) {
  const etat = aura?.missions[mission.id];
  const exp = expMission(mission, aura ?? null);
  const semaine = mission.periode === "semaine";
  // Une quête faite d'autres quêtes coche ses étapes : la barre redirait
  // la même chose une deuxième fois.
  const cocheSesEtapes = mission.etapes.some((e) => e.quete);
  const [un, plusieurs] = mission.unite ?? ["", ""];
  // La puce Vaiiya+ se colle au dernier mot du titre : quand le titre passe
  // à la ligne, ils partent ensemble au lieu de laisser la puce seule.
  const coupe = mission.titre.lastIndexOf(" ") + 1;

  const vers = !debloquee
    ? { route: "/premium", action: "Découvrir Vaiiya+" }
    : etat?.earned ? null : suite(mission, aura);

  return (
    <div>
      {onRetour && (
        <button type="button" className={styles.retour} onClick={onRetour}>
          <ChevronLeft size={16} strokeWidth={2.4} aria-hidden="true" />
          Toutes les missions
        </button>
      )}

      <div className={styles.tete}>
        <Image src={mission.image} alt="" width={56} height={56} className={styles.picto} />
        <div className={styles.titres}>
          <h2>
            {mission.titre.slice(0, coupe)}
            <span className={styles.insecable}>
              {mission.titre.slice(coupe)}
              {mission.premium && <em className={ligne.tagPremium}>Vaiiya+</em>}
            </span>
          </h2>
          <p className={styles.meta}>
            <b>+{exp} EXP</b> · {semaine ? "du lundi au dimanche" : "chaque jour, jusqu’à minuit"}
          </p>
        </div>
      </div>

      {etat?.earned ? (
        <p className={styles.validee}>
          <Coche />
          {semaine ? "Validée cette semaine" : "Validée aujourd’hui"}
        </p>
      ) : etat && !etat.complete && etat.target > 1 && !cocheSesEtapes ? (
        <div className={styles.avance}>
          <span className={styles.barre} aria-hidden="true">
            <i style={{ width: `${Math.min(1, etat.progress / etat.target) * 100}%` }} />
          </span>
          <small>
            {etat.progress} {etat.progress > 1 ? plusieurs : un} sur {etat.target}
          </small>
        </div>
      ) : null}

      {/* Un compte gratuit voit la quête Vaiiya+ et la voit avancer : on ne
          cache pas ce qu'on vend, on dit qui en gagne l'EXP. */}
      {!debloquee && (
        <p className={styles.reserve}>
          {etat?.complete ? "Tu l’as faite. " : ""}Seuls les membres Vaiiya+ gagnent son EXP.
        </p>
      )}

      <h3 className={styles.section}>Comment la faire</h3>
      <ol className={styles.etapes}>
        {mission.etapes.map((etape, i) => {
          const faite = !!(etape.quete && aura?.missions[etape.quete]?.complete);
          return (
            <li key={i} data-faite={faite ? "" : undefined}>
              <span className={styles.marque} aria-hidden="true">
                {faite ? <Coche /> : i + 1}
              </span>
              <span>
                {typo(etape.texte)}
                {faite && <span className={ligne.horsEcran}> Faite.</span>}
              </span>
            </li>
          );
        })}
      </ol>
      {mission.note && <p className={styles.note}>{typo(mission.note)}</p>}

      {onNavigate && vers && (
        <button type="button" className={styles.bouton} onClick={() => onNavigate(vers.route)}>
          {vers.action}
        </button>
      )}
    </div>
  );
}

/** La fiche seule, dans sa feuille : ce qu'ouvre une carte du rail de
 *  l'accueil, ou une ligne de /premium. Dans la feuille « Missions », la
 *  fiche prend la place de la liste au lieu d'empiler une feuille de plus. */
export default function FeuilleQuete({
  mission,
  aura,
  debloquee,
  onNavigate,
  onFermer,
}: {
  mission: Mission;
  aura?: EtatAura | null;
  debloquee: boolean;
  onNavigate?: (path: string) => void;
  onFermer: () => void;
}) {
  return (
    <Sheet onFermer={onFermer}>
      <FicheQuete
        mission={mission}
        aura={aura}
        debloquee={debloquee}
        onNavigate={
          onNavigate &&
          ((path) => {
            onFermer();
            onNavigate(path);
          })
        }
      />
    </Sheet>
  );
}

function Coche() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

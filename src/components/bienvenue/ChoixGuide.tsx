"use client";

/* ════════════════════════════════════════════════════════════════════
   Écran 0 — la rencontre avec le Guide.

   C'est le premier choix personnel de Vaiiya, et il arrive AVANT les
   questions de corps, de genre et d'objectifs. Il est obligatoire : ni
   « Plus tard », ni « Passer », ni valeur présélectionnée, ni ordre qui
   s'adapterait à la personne.

   ⚠️ UN SEUL GUIDE À LA FOIS. Les deux cartes côte à côte, c'était deux
   produits à comparer dans une grille. Ici chaque Guide occupe la
   scène : le personnage domine, le texte se range autour de lui, et son
   bouton fait partie de la même composition. On passe de l'un à l'autre
   d'un geste horizontal.

   ⚠️ LE BIAIS DU PREMIER SLIDE, ET CE QUI LE RÉDUIT VRAIMENT. Avec deux
   slides, le premier est mécaniquement plus vu. Ce biais ne vient pas
   du geste, il vient de ne pas savoir ce qu'il y a en face : un point
   anonyme laisse la question ouverte. La commande de navigation NOMME
   donc l'autre Guide (« Voir Sasha »), ce qui ferme la question même
   pour quelqu'un qui ne swipera jamais. Aucune recommandation, aucune
   présélection, aucun tirage au sort : l'ordre est fixe et le même pour
   tout le monde.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { GuideId } from "@/lib/guides";
import PortraitGuide from "./PortraitGuide";
import s from "./bienvenue.module.css";

type Fiche = {
  id: GuideId;
  nom: string;
  trait: string;
  pour: string;
  /** La phrase qui dit CE QUE LE GUIDE FAIT, pas ce qu'il vaut. C'est
   *  elle qui rend la différence lisible sans « en savoir plus ». */
  maniere: string;
  /* La version longue, derrière « En savoir plus ». Elle décrit une
     maniere de faire, jamais une qualité : aucun des deux Guides n'est
     meilleur, ils n'ont pas les mêmes gestes. */
  detail: string[];
};

const FICHES: Fiche[] = [
  {
    id: "nora",
    nom: "Nora",
    trait: "Calme et méthodique",
    pour: "Tu préfères comprendre avant d'agir.",
    maniere: "Elle structure davantage, explique ses choix et t'aide à avancer étape par étape.",
    detail: [
      "Plus posée.",
      "Explique davantage le pourquoi.",
      "Structure avant l'action.",
      "Convient à quelqu'un qui aime comprendre et avancer étape par étape.",
    ],
  },
  {
    id: "sasha",
    nom: "Sasha",
    trait: "Direct et dynamique",
    pour: "Tu préfères avancer puis ajuster en chemin.",
    maniere: "Il va plus vite à l'essentiel, garde les échanges rythmés et t'aide à passer à l'action.",
    detail: [
      "Plus direct.",
      "Va plus vite à l'action.",
      "Garde les échanges plus rythmés.",
      "Convient à quelqu'un qui préfère avancer puis ajuster.",
    ],
  },
];

export default function ChoixGuide({
  onChoisir,
  enCours,
  erreur,
}: {
  /** L'appelant enregistre. En cas d'échec il repasse `erreur` : on ne
   *  fait jamais semblant d'avoir enregistré. */
  onChoisir: (g: GuideId) => void;
  enCours: GuideId | null;
  erreur: string | null;
}) {
  const [index, setIndex] = useState(0);
  const [detail, setDetail] = useState<Fiche | null>(null);
  const pisteRef = useRef<HTMLDivElement>(null);
  const reduit = useReducedMotion();

  const autre = FICHES[index === 0 ? 1 : 0];

  /* Le clavier, pour que le carrousel ne dépende pas d'un geste tactile.
     L'écoute est posée sur la fenêtre plutôt que sur un conteneur
     `tabIndex` : ça évite d'ajouter un arrêt de tabulation qui ne mène
     nulle part, et ça marche sans avoir à deviner où cliquer d'abord. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setDetail(null); return; }
      if (detail) return;                      // la feuille a la priorité
      if (e.key === "ArrowRight") setIndex((i) => Math.min(FICHES.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail]);

  const finDeGlisse = (_e: unknown, info: PanInfo) => {
    // Un seuil proportionnel, avec un plancher : sur un petit écran un
    // pourcentage seul demanderait un geste minuscule. La largeur est lue
    // à cet instant précis, pas gardée en état : rien à observer, rien à
    // resynchroniser au redimensionnement.
    const largeur = pisteRef.current?.clientWidth ?? 0;
    const seuil = Math.max(46, largeur * 0.18);
    const { offset, velocity } = info;
    if (offset.x < -seuil || velocity.x < -420) setIndex((i) => Math.min(FICHES.length - 1, i + 1));
    else if (offset.x > seuil || velocity.x > 420) setIndex((i) => Math.max(0, i - 1));
  };

  return (
    <>
      <h1 className={s.titre}>Choisis ton guide</h1>
      <p className={s.ligneEgalite}>
        Deux façons de t&apos;accompagner. La même intelligence Vaiiya.
      </p>

      <div
        ref={pisteRef}
        className={s.piste}
        role="group"
        aria-roledescription="carrousel"
        aria-label="Nora ou Sasha"
      >
        {/* ⚠️ DEUX COUCHES, ET C'EST VOULU.

            Le RAIL porte la position, en pourcentage, par une simple
            transformation CSS : sur quel Guide on est ne dépend donc
            d'AUCUNE animation JavaScript, d'aucune mesure et d'aucune
            image composée. Si le moteur d'animation ne tourne pas, le
            carrousel atterrit quand même sur le bon Guide.

            Le GESTE ne porte que l'écart du doigt, et revient toujours à
            zéro. Les deux se composent : pendant qu'il revient, le rail
            part vers sa nouvelle position, ce qui donne un seul
            déplacement continu. */}
        <div
          className={s.rail}
          style={{ transform: `translate3d(${-index * 50}%, 0, 0)` }}
        >
        <motion.div
          className={s.geste}
          drag={reduit ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1}
          dragMomentum={false}
          animate={{ x: 0 }}
          transition={{ type: "tween", duration: 0.38, ease: [0.22, 0.61, 0.36, 1] }}
          onDragEnd={finDeGlisse}
        >
          {FICHES.map((f, i) => (
            <div
              key={f.id}
              className={s.slide}
              role="group"
              aria-label={f.nom}
              /* Le Guide hors écran ne doit pas être atteignable au
                 clavier : sinon la tabulation propose « Choisir Sasha »
                 pendant qu'on regarde Nora. */
              inert={i !== index}
            >
              <div className={s.scene}>
                <PortraitGuide forme="scene" anime={!reduit} />
              </div>

              <div className={s.identite}>
                <span className={s.nom}>{f.nom}</span>
                <span className={s.trait}>{f.trait}</span>
                <span className={s.pour}>{f.pour}</span>
                <span className={s.secondaire2}>{f.maniere}</span>
                <button type="button" className={s.enSavoirPlus} onClick={() => setDetail(f)}>
                  En savoir plus
                </button>
              </div>

              <button
                type="button"
                className={`${s.cta} ${s.ctaSlide}`}
                disabled={enCours !== null}
                onClick={() => onChoisir(f.id)}
              >
                {enCours === f.id ? "Un instant…" : `Choisir ${f.nom}`}
              </button>
            </div>
          ))}
        </motion.div>
        </div>
      </div>

      <div className={s.nav}>
        <div className={s.points}>
          {FICHES.map((f, i) => (
            <button
              key={f.id}
              type="button"
              className={i === index ? `${s.point} ${s.pointActif}` : s.point}
              aria-label={`Voir ${f.nom}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
            >
              <span className={s.pointRond} />
            </button>
          ))}
        </div>
        <button
          type="button"
          className={s.autre}
          onClick={() => setIndex(index === 0 ? 1 : 0)}
        >
          {index === 0 ? (
            <>Voir {autre.nom}<ChevronRight size={15} strokeWidth={2.5} /></>
          ) : (
            <><ChevronLeft size={15} strokeWidth={2.5} />Voir {autre.nom}</>
          )}
        </button>
      </div>

      <p className={s.note}>Tu pourras changer dans tes paramètres.</p>

      {erreur && <p className={s.erreur} role="alert">{erreur}</p>}

      {detail && (
        <div
          className={s.voile}
          role="dialog"
          aria-modal="true"
          aria-label={`En savoir plus sur ${detail.nom}`}
          onClick={() => setDetail(null)}
        >
          <div className={s.feuille} onClick={(e) => e.stopPropagation()}>
            <span className={s.feuilleNom}>{detail.nom}</span>
            <ul className={s.feuilleListe}>
              {detail.detail.map((d) => <li key={d}>{d}</li>)}
            </ul>
            <button type="button" className={s.secondaire} onClick={() => setDetail(null)}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}

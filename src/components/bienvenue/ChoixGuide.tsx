"use client";

/* ════════════════════════════════════════════════════════════════════
   Écran 0 — le choix du Guide.

   C'est le premier choix personnel de Vaiiya, et il arrive AVANT les
   questions de corps, de genre et d'objectifs. Il est obligatoire : ni
   « Plus tard », ni « Passer », ni valeur présélectionnée, ni ordre qui
   s'adapterait à la personne.

   ⚠️ Les deux cartes sont posées côte à côte, à toutes les largeurs,
   et pas empilées. Empilées, la première serait plus haut dans la page
   et donc systématiquement plus vue : ce serait un pouce sur la
   balance, invisible mais réel, en faveur de Nora. Côte à côte en
   `1fr 1fr`, elles ont la même taille et la même position verticale
   par construction. Vérifié à 360 px : les deux tiennent au-dessus de
   la ligne de flottaison.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import type { GuideId } from "@/lib/guides";
import PortraitGuide from "./PortraitGuide";
import s from "./bienvenue.module.css";

type Fiche = {
  id: GuideId;
  nom: string;
  trait: string;
  pour: string;
  /* La version longue, cachée derrière « En savoir plus ». Elle décrit
     une manière de faire, jamais une qualité : aucun des deux Guides
     n'est meilleur, ils n'ont pas les mêmes gestes. */
  detail: string[];
};

const FICHES: Fiche[] = [
  {
    id: "nora",
    nom: "Nora",
    trait: "Calme et méthodique",
    pour: "Si tu préfères comprendre avant d'agir.",
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
    pour: "Si tu préfères avancer et ajuster en chemin.",
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
  /** Rend `false` si l'écriture a échoué : l'écran le dit alors au lieu
   *  d'avancer sur un choix qui n'existe pas en base. */
  onChoisir: (g: GuideId) => void;
  enCours: GuideId | null;
  erreur: string | null;
}) {
  const [detail, setDetail] = useState<Fiche | null>(null);

  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDetail(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail]);

  return (
    <>
      <h1 className={s.titre}>Choisis ton guide</h1>
      <p className={s.sousTitre}>
        Nora et Sasha ont les mêmes capacités. Ce qui change, c&apos;est leur façon de t&apos;accompagner.
      </p>

      <div className={s.grille}>
        {FICHES.map((f) => (
          <div key={f.id} className={s.carte}>
            <PortraitGuide forme="carte" />
            <span className={s.nom}>{f.nom}</span>
            <span className={s.trait}>{f.trait}</span>
            <span className={s.pour}>{f.pour}</span>

            {/* Deux boutons FRÈRES, jamais imbriqués : « choisir » et
                « en savoir plus » sont deux intentions différentes, et
                un bouton dans un bouton rend la cible impossible à
                viser proprement au doigt. */}
            <button
              type="button"
              className={s.cta}
              disabled={enCours !== null}
              onClick={() => onChoisir(f.id)}
            >
              {enCours === f.id ? "Un instant…" : `Choisir ${f.nom}`}
            </button>
            <button
              type="button"
              className={s.enSavoirPlus}
              onClick={() => setDetail(f)}
            >
              En savoir plus
            </button>
          </div>
        ))}
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
            <span className={s.nom}>{detail.nom}</span>
            <ul className={s.feuilleListe}>
              {detail.detail.map((d) => <li key={d}>{d}</li>)}
            </ul>
            <div style={{ height: 18 }} />
            <button type="button" className={s.secondaire} onClick={() => setDetail(null)}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}

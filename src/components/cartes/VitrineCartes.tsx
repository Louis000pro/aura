"use client";

import type { CSSProperties } from "react";
import type { CarteDef } from "@/lib/cartes/catalogue";
import VignetteCarte from "./VignetteCarte";
import s from "./Cartes.module.css";

/**
 * LA VITRINE : trois cartes sous verre, chacune avec son étiquette, comme une
 * carte gradée. La seule partie sombre du profil : c'est là que la lumière
 * des cartes se voit.
 *
 * Les cartes choisies d'abord, puis Vaiiya pose les plus belles (`vitrineDe`).
 * Une carte pas encore gagnée n'y entre que sur son propre profil, éteinte,
 * pour ne pas laisser un étal vide.
 */
export default function VitrineCartes({
  titre,
  cartes,
  scellees,
  onVoir,
  onChanger,
}: {
  titre: string;
  cartes: readonly CarteDef[];
  /** Les cartes dont la pochette attend d'être ouverte. */
  scellees?: readonly string[];
  onVoir: (c: CarteDef) => void;
  /** Sans lui, pas de bouton : il n'y a rien à choisir, ou ce n'est pas la nôtre. */
  onChanger?: () => void;
}) {
  return (
    <section className={s.presentoir} aria-label={titre}>
      <header>
        <h3>{titre}</h3>
        {onChanger && <button type="button" className={s.changer} onClick={onChanger}>Changer</button>}
      </header>
      <div className={s.etals} data-n={cartes.length} style={{ "--n": cartes.length } as CSSProperties}>
        {cartes.map((c) => {
          const scellee = c.gagnee && !!scellees?.includes(c.id);
          return (
            <div key={c.id} className={s.etal}>
              <button
                type="button"
                className={s.etui}
                data-eteinte={c.gagnee ? undefined : ""}
                disabled={!c.gagnee}
                aria-label={c.gagnee ? (scellee ? `Ouvrir ta pochette ${c.nom}` : c.dit) : `Carte ${c.nom}, pas encore gagnée`}
                onClick={() => onVoir(c)}
              >
                <span className={`${s.etiquette} vy-nombre`} aria-hidden="true">
                  <span>{c.etiquette[0]}</span>
                  <span>{c.etiquette[1]}</span>
                </span>
                <VignetteCarte carte={c} scellee={scellee} />
              </button>
              <div className={s.socle} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

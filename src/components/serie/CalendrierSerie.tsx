"use client";

/* ─────────────────────────────────────────────────────────────────────
   LE CALENDRIER DE LA SÉRIE, EN TRAÎNÉE QUI CHAUFFE (Louis, 2026-10-17,
   page « La traînée » du canevas « Les rangs et le profil »).

   Chaque jour de série prend la couleur de la flamme qu'il avait allumée ;
   le ruban qui relie les jours passe d'une couleur à la suivante ; le jour
   où une flamme est née porte sa flamme ; la prochaine flamme attend sur sa
   date, en pointillés. La gamme vit dans `CalendrierSerie.module.css`.

   Ce composant ne DÉCIDE rien : `lib/traineeSerie.ts` dit, case par case,
   quel rang, quelle flamme, quel ruban, quel chemin. Il ne fait que les
   dessiner, et il ne colorie jamais un jour sans.
   ───────────────────────────────────────────────────────────────────── */

import type { CSSProperties } from "react";
import { useMemo } from "react";
import FlammeSerie from "@/components/serie/FlammeSerie";
import { PALIERS_FLAMME, type IdFlamme } from "@/lib/flammesSerie";
import { grilleTrainee, type BordRuban, type CaseJour } from "@/lib/traineeSerie";
import styles from "./CalendrierSerie.module.css";

const JOURS_SEMAINE = ["L", "M", "M", "J", "V", "S", "D"];
const NOM = Object.fromEntries(PALIERS_FLAMME.map((p) => [p.id, p.nom])) as Record<IdFlamme, string>;

const etendue = (bord: BordRuban) => (bord === "centre" ? "50%" : "0");

/** Le ruban d'une case : de son bord (ou de son centre) à l'autre, et sa moitié droite qui passe à la couleur du lendemain. */
function styleRuban(r: NonNullable<CaseJour["ruban"]>): CSSProperties {
  const ici = `var(--ruban-${r.palier})`;
  const gauche = r.gauche === "fondu" ? "transparent" : ici;
  const droite = r.droite === "fondu" ? "transparent" : `var(--ruban-${r.vers})`;
  const fond =
    r.gauche !== "centre" && r.droite !== "centre"
      ? `${gauche} 0%, ${ici} 50%, ${droite} 100%`
      : r.gauche !== "centre"
        ? `${gauche} 0%, ${ici} 100%`
        : `${ici} 0%, ${droite} 100%`;
  return { left: etendue(r.gauche), right: etendue(r.droite), background: `linear-gradient(90deg, ${fond})` };
}

function dateLisible(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
}

/** Ce qu'un lecteur d'écran entend pour une case : le jour, puis ce que la traînée y dit. */
function description(c: CaseJour): string {
  const morceaux = [dateLisible(c.date)];
  if (c.aujourdhui) morceaux.push("aujourd’hui");
  if (c.serie) {
    morceaux.push(`jour ${c.serie.rang} de ta série`);
    if (c.serie.nee) morceaux.push(`nouvelle flamme : ${NOM[c.serie.nee]}`);
  }
  if (c.prochaine) morceaux.push(`ta flamme devient ${NOM[c.prochaine]} si tu continues`);
  return morceaux.join(", ");
}

export default function CalendrierSerie({
  annee,
  mois,
  rangs,
  aujourdhui,
}: {
  annee: number;
  /** De 0 (janvier) à 11, comme `Date`. */
  mois: number;
  /** Le rang de chaque jour actif dans sa série (`rangsDesJours`). */
  rangs: ReadonlyMap<string, number>;
  aujourdhui: string;
}) {
  const cases = useMemo(() => grilleTrainee({ annee, mois, rangs, aujourdhui }), [annee, mois, rangs, aujourdhui]);

  return (
    <div className={styles.grille}>
      {JOURS_SEMAINE.map((j, i) => (
        <span key={i} className={styles.semaine} aria-hidden="true">{j}</span>
      ))}
      {cases.map((c, i) => {
        if (!c) return <span key={i} />;
        return (
          <span key={c.date} className={styles.jour}>
            {c.ruban && <i aria-hidden="true" className={styles.ruban} style={styleRuban(c.ruban)} />}
            {c.chemin && (
              <i
                aria-hidden="true"
                className={styles.chemin}
                style={{ left: c.chemin.gauche ? 0 : "50%", right: c.chemin.droite ? 0 : "50%" }}
              />
            )}
            <span
              className={`${styles.rond} vy-nombre`}
              data-feu={c.serie?.palier ?? c.prochaine ?? undefined}
              data-actif={c.serie ? "" : undefined}
              data-aujourdhui={c.aujourdhui ? "" : undefined}
              data-prochaine={c.prochaine ? "" : undefined}
              data-futur={c.futur && !c.prochaine ? "" : undefined}
              // La graisse se pose en ligne : `.vy-nombre` ramènerait le chiffre à 600.
              style={{ fontWeight: c.serie ? 800 : c.prochaine ? 700 : 500 }}
            >
              <span aria-hidden="true">{c.numero}</span>
              <span className="sr-only">{description(c)}</span>
              {c.serie?.nee && (
                <span className={styles.badge} aria-hidden="true">
                  <FlammeSerie palier={c.serie.nee} taille={13} />
                </span>
              )}
              {c.prochaine && (
                <span className={styles.badge} aria-hidden="true">
                  <FlammeSerie palier={c.prochaine} taille={13} eteinte />
                </span>
              )}
            </span>
          </span>
        );
      })}
    </div>
  );
}

"use client";

import { forwardRef, type CSSProperties } from "react";
import type { Rang } from "@/lib/aura";
import { dateLongue, type DonneesCarte } from "@/lib/cartesRang";
import styles from "./CarteRang.module.css";

/**
 * LA CARTE DE RANG (Louis, 2026-10-24, maquette « Le passage de rang »,
 * version 2). Chaque rang donne une carte, gravée au pseudo avec la date où
 * il a été atteint. La matière change avec le rang : bronze mat, argent
 * brossé, or gravé de cercles, platine nacré, diamant holographique, et la
 * carte vivante de l'Éternel.
 *
 * Ce qu'elle écrit se voit déjà ailleurs : le pseudo, le numéro de membre,
 * la date du rang, et les séances et les jours qu'il a fallu. Elle ne dit
 * rien du corps et ne compare à personne.
 *
 * ⚠️ TOUT SE MESURE EN `cqw` (la carte est un conteneur) : la même carte se
 * pose à 52 px dans un cadeau de la scène et à 300 px dans la visionneuse.
 * L'inclinaison passe par six variables (`--mx`, `--my`, `--px`, `--py`,
 * `--rx`, `--ry`) que `useInclinaison` écrit sur l'élément ; sans elles, la
 * carte se tient droite, son reflet au repos.
 *
 * `decor` : la carte n'est qu'un visuel (dans un cadeau, une rangée), elle
 * se tait pour un lecteur d'écran.
 */
const CarteRang = forwardRef<HTMLDivElement, {
  rang: Rang;
  donnees: DonneesCarte;
  decor?: boolean;
  className?: string;
  style?: CSSProperties;
}>(function CarteRang({ rang, donnees, decor = false, className, style }, ref) {
  const bronze = rang.id === "bronze";
  const pseudo = donnees.pseudo.trim() || "toi";
  const date = dateLongue(bronze ? donnees.inscritLe : donnees.atteintLe);
  const numero = donnees.numero != null ? String(donnees.numero).padStart(3, "0") : null;
  // Le nom remplit la largeur sans déborder : « Or » en grand, « Diamant » plus serré.
  const tailleNom = Math.min(15, 80 / (rang.nom.length * 0.81));
  const faits = !bronze && (donnees.seances != null || donnees.jours != null);

  return (
    <div
      ref={ref}
      className={`${styles.carte}${className ? ` ${className}` : ""}`}
      data-rang={rang.id}
      style={style}
      {...(decor
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": `Carte ${rang.nom} de ${pseudo}${date ? `, ${bronze ? "depuis le" : "atteinte le"} ${date}` : ""}` })}
    >
      <div className={`${styles.couche} ${styles.matiere}`} />
      <div className={`${styles.couche} ${styles.motif}`} />
      <div className={`${styles.couche} ${styles.poussiere}`} />
      <div className={`${styles.couche} ${styles.holo}`} />
      <div className={`${styles.couche} ${styles.paillettes}`} />
      <div className={`${styles.couche} ${styles.reflet}`} />
      <div className={styles.contenu}>
        <div className={styles.haut}>
          <span className={styles.marque}>
            <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.etincelle}>
              <path d="M12 1.5c.7 6.6 3.4 9.8 10.5 10.5-7.1.7-9.8 3.9-10.5 10.5C11.3 15.9 8.6 12.7 1.5 12 8.6 11.3 11.3 8.1 12 1.5z" fill="currentColor" />
            </svg>
            <span>Vaiiya</span>
          </span>
          {numero && (
            // La graisse se pose en ligne : `.vy-nombre` la ramènerait à 600.
            <span className={`${styles.numero} vy-nombre`} style={{ fontWeight: 700 }}>N°&nbsp;{numero}</span>
          )}
        </div>
        <div className={styles.zoneGemme}>
          {rang.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.gemme} src={rang.image} alt="" draggable={false} decoding="async" />
          )}
        </div>
        <p className={styles.nom} style={{ fontSize: `${tailleNom.toFixed(2)}cqw` }}>{rang.nom}</p>
        <span className={styles.trait} />
        <p className={styles.pseudo}>{pseudo}</p>
        {date && <p className={styles.date}>{bronze ? "Depuis le" : "Atteint le"} {date}</p>}
        {bronze ? (
          <p className={styles.depart}>Le point de départ</p>
        ) : faits ? (
          <>
            <p className={styles.pour}>Pour y arriver</p>
            <div className={styles.faits}>
              {donnees.seances != null && (
                <div className={styles.fait}>
                  <b className="vy-nombre">{donnees.seances}</b>
                  <span>{donnees.seances > 1 ? "séances" : "séance"}</span>
                </div>
              )}
              {donnees.jours != null && (
                <div className={styles.fait}>
                  <b className="vy-nombre">{donnees.jours}</b>
                  <span>{donnees.jours > 1 ? "jours" : "jour"}</span>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
      <div className={`${styles.couche} ${styles.bord}`} />
    </div>
  );
});

export default CarteRang;

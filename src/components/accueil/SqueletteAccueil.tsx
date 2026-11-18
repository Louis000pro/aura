"use client";

import styles from "./RevelationAccueil.module.css";

/** La disposition réservée dès la résolution de la session. */
export default function SqueletteAccueil() {
  const bloc = (nom: string) => styles.bloc + " " + styles[nom];
  return <div className={styles.squelette} aria-hidden="true">
    <div className={styles.entree}>
      <div className={bloc("portrait")} />
      <div className={styles.texte}>
        <div className={bloc("ligne")} />
        <div className={bloc("ligne") + " " + styles.ligneCourte} />
      </div>
    </div>
    <div className={bloc("heros")} />
    <div className={styles.bento}>
      <div className={bloc("rang")} />
      <div className={bloc("tuile")} />
      <div className={bloc("tuile")} />
    </div>
    <div className={bloc("booster")} />
    <div className={styles.quetes}>
      <div className={bloc("quete")} />
      <div className={bloc("quete")} />
    </div>
  </div>;
}

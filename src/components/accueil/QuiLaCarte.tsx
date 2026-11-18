"use client";

// « Qui l'a » : combien de membres ont une carte, et lesquels de tes amis (Louis, 2026-11-18).
// Les autres membres ne sont qu'un nombre : leur collection reste la leur.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase";
import { mouvements, raretes, type Carte } from "@/lib/cartesBooster";
import { lireDetenteurs, type Detenteurs } from "@/lib/collectionBoosters";
import styles from "./Collectionneurs.module.css";

const dateCourte = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });

export function Visage({ pseudo, avatar, taille = 36 }: { pseudo: string | null; avatar: string | null; taille?: number }) {
  return <span className={styles.visage} style={{ width: taille, height: taille }} aria-hidden="true">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {avatar ? <img src={avatar} alt="" /> : (pseudo ?? "?").slice(0, 1).toUpperCase()}
  </span>;
}

export default function QuiLaCarte({ carte, onFermer }: { carte: Carte; onFermer: () => void }) {
  const [donnees, setDonnees] = useState<{ cle: string; d: Detenteurs | null } | null>(null);
  const cle = carte.exercice + ":" + carte.rarete;
  useEffect(() => {
    const controle = new AbortController();
    void lireDetenteurs(createClient(), carte, controle.signal)
      .then(d => { if (!controle.signal.aborted) setDonnees({ cle, d }); });
    return () => controle.abort();
  }, [cle, carte]);
  useEffect(() => {
    const clavier = (event: KeyboardEvent) => { if (event.key === "Escape") onFermer(); };
    window.addEventListener("keydown", clavier);
    return () => window.removeEventListener("keydown", clavier);
  }, [onFermer]);

  const d = donnees?.cle === cle ? donnees.d : undefined;
  const autres = d ? Math.max(0, d.total - d.amis.length - (d.moi ? 1 : 0)) : 0;
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className={styles.voile} onClick={event => { if (event.target === event.currentTarget) onFermer(); }}>
      <div className={styles.feuille} role="dialog" aria-modal="true" aria-label={"Qui a " + mouvements[carte.exercice][0]}>
        <button type="button" className={styles.croix} aria-label="Fermer" onClick={onFermer}>×</button>
        <h3>{mouvements[carte.exercice][0]} · {raretes[carte.rarete]}</h3>
        {d === undefined ? <p className={styles.sous}>Chargement…</p> : d === null ? <p className={styles.sous}>Impossible de voir qui l’a pour le moment.</p> : <>
          <p className={styles.sous}>{d.moi ? (d.moi > 1 ? `Tu l’as en ${d.moi} exemplaires` : "Tu l’as") : "Tu ne l’as pas encore"}</p>
          <span className={styles.puce}><span className="vy-nombre">{d.total}</span> {d.total > 1 ? "membres l’ont" : "membre l’a"} sur <span className="vy-nombre">{d.membres}</span></span>
          {(d.amis.length > 0 || autres > 0) && <ul className={styles.gens}>
            {d.amis.map(ami => <li key={ami.user_id}>
              <Visage pseudo={ami.pseudo} avatar={ami.avatar_url} />
              <span>{ami.pseudo ?? "Un ami"}<small>Dans tes amis</small></span>
              {ami.n > 1 && <b className="vy-nombre">×{ami.n}</b>}
            </li>)}
            {autres > 0 && <li>
              <span className={styles.visage} style={{ width: 36, height: 36, background: "#e9e4f2", color: "#5a5168" }} aria-hidden="true">+{autres}</span>
              <span>{autres > 1 ? `${autres} autres membres` : "Un autre membre"}</span>
            </li>}
          </ul>}
          {d.premier_le && <p className={styles.pied}>
            Sortie la première fois le {dateCourte.format(new Date(d.premier_le))}{d.premier_pseudo ? `, chez ${d.premier_pseudo}` : ""}.
          </p>}
        </>}
      </div>
    </div>,
    document.body,
  );
}

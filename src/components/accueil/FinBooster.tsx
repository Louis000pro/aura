"use client";

// La page de fin d'un booster (maquette validée par Louis le 2026-11-18) : toujours claire,
// la rareté de la meilleure carte, la collection qui avance (en violet, jamais de vert),
// puis « Ouvrir le suivant » en or quand il reste des boosters en réserve.

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { mouvements, raretes, type Carte } from "@/lib/cartesBooster";
import { lireClassement, lireDetenteurs, TOTAL_CARTES, ORDRE_RARETES } from "@/lib/collectionBoosters";
import QuiLaCarte from "./QuiLaCarte";
import styles from "./FinBooster.module.css";

const TROIS_HEURES = 3 * 3600 * 1000;
const ordinal = (n: number) => n === 1 ? "1re" : n + "e";

/** La rareté de la meilleure carte et la collection qui avance. */
export function InfosFin({ cartes, exemplaires, avant }: {
  cartes: Carte[];
  exemplaires: number[] | null;
  /** Nombre de cartes différentes avant ce booster, null si inconnu. */
  avant: number | null;
}) {
  const meilleure = cartes.reduce((m, c) => ORDRE_RARETES.indexOf(c.rarete) > ORDRE_RARETES.indexOf(m.rarete) ? c : m, cartes[0]);
  const rare = ORDRE_RARETES.indexOf(meilleure.rarete) >= 2;
  const [detenteurs, setDetenteurs] = useState<number | null>(null);
  const [rang, setRang] = useState<{ rang: number; amis: number } | null>(null);
  const [quiLa, setQuiLa] = useState(false);

  const { exercice, rarete } = meilleure;
  useEffect(() => {
    const controle = new AbortController();
    const client = createClient();
    if (rare) void lireDetenteurs(client, { exercice, rarete }, controle.signal)
      .then(d => { if (!controle.signal.aborted && d) setDetenteurs(d.total); });
    void lireClassement(client, controle.signal).then(liste => {
      const moi = liste?.find(l => l.moi);
      if (!controle.signal.aborted && liste && moi && liste.length > 1) setRang({ rang: moi.rang, amis: liste.length });
    });
    return () => controle.abort();
  }, [rare, exercice, rarete]);

  const neuves = exemplaires ? exemplaires.filter(n => n === 1).length : 0;
  const apres = avant !== null && exemplaires ? avant + neuves : null;
  const nom = mouvements[meilleure.exercice][0] + " " + raretes[meilleure.rarete].toLowerCase();

  return <>
    {rare && detenteurs !== null && detenteurs > 0 && <p className={styles.rarete}>
      {detenteurs <= 1 ? <>Personne d’autre n’a {nom}.</> : <>Seuls <b>{detenteurs} membres</b> ont {nom}.</>}
      <br /><button type="button" onClick={() => setQuiLa(true)}>Voir qui l’a ›</button>
    </p>}
    {apres !== null && <div className={styles.progression}>
      <div className={styles.ligne}>
        <span>Ta collection</span>
        <span className={styles.compte}><span className="vy-nombre">{apres} / {TOTAL_CARTES}</span>{neuves > 0 && <em className="vy-nombre">+{neuves}</em>}</span>
      </div>
      <div className={styles.barre} role="img" aria-label={`${apres} cartes sur ${TOTAL_CARTES}`}>
        <i style={{ width: (avant! / TOTAL_CARTES * 100) + "%" }} />
        {neuves > 0 && <i className={styles.gain} style={{ left: (avant! / TOTAL_CARTES * 100) + "%", width: (neuves / TOTAL_CARTES * 100) + "%" }} />}
      </div>
    </div>}
    {rang && <p className={styles.rang}>Ta place chez tes amis : <b>{ordinal(rang.rang)}</b> sur {rang.amis}</p>}
    {quiLa && <QuiLaCarte carte={meilleure} onFermer={() => setQuiLa(false)} />}
  </>;
}

/** Ouvrir le suivant (en or) s'il en reste, sinon la collection et le prochain booster. */
export function ActionsFin({ stock, illimite, prochainMs, compte, onSuivant, onCollection }: {
  stock: number | null;
  illimite: boolean;
  prochainMs: number | null;
  compte: string;
  onSuivant: () => void;
  onCollection: () => void;
}) {
  const suivant = illimite || (stock !== null && stock > 0);
  if (suivant) return <div className={styles.actions}>
    <button type="button" className={styles.or} onClick={onSuivant}>
      {illimite ? "Ouvrir un autre booster" : <>Ouvrir le suivant <small>· {stock} en réserve</small></>}
    </button>
    <Link className={styles.lien} href="/profil#cartes-exercices" onClick={onCollection}>Voir ma collection</Link>
  </div>;

  // Le temps qui reste vient du compte à rebours (« 01:52:07 »), déjà tenu à jour chaque seconde.
  const [h = 0, m = 0, sec = 0] = compte.split(":").map(Number);
  const part = Math.max(0, Math.min(1, 1 - ((h * 3600 + m * 60 + sec) * 1000) / TROIS_HEURES));
  return <div className={styles.actions}>
    {prochainMs !== null && compte && <div className={styles.attente}>
      <span className={styles.anneau} style={{ background: `conic-gradient(#f5b120 0 ${part * 100}%, #f3ecdc ${part * 100}% 100%)` }} aria-hidden="true"><span /></span>
      <span><b>Prochain booster dans <span className="vy-nombre">{compte}</span></b>
        {stock !== null && <small>Réserve 0 sur 3 · un de plus toutes les 3 heures</small>}</span>
    </div>}
    <Link className={styles.violet} href="/profil#cartes-exercices" onClick={onCollection}>Voir ma collection</Link>
  </div>;
}

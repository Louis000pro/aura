"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { createClient } from "@/lib/supabase";
import type { GuideRef } from "@/lib/guides";
import styles from "./BoosterQuotidien.module.css";

const mouvements = {
  pompes: ["Pompes", "/entrainement/guides/pompes-f-2.webp", "/premiers-pas/m-pompes-2.webp"],
  crunch: ["Crunch", "/entrainement/guides/crunch-f-2.webp", "/entrainement/guides/crunch-f-2.webp"],
  fentes: ["Fentes", "/entrainement/guides/fentes-f-2.webp", "/premiers-pas/m-fentes-2.webp"],
  squat: ["Squat", "/premiers-pas/f-squat-2.webp", "/premiers-pas/m-squat-2.webp"],
} as const;
const raretes = { commune: "Commune", rare: "Rare", epique: "Épique" } as const;
type Carte = { exercice: keyof typeof mouvements; rarete: keyof typeof raretes };

export default function BoosterQuotidien({ guide, jour }: { guide: GuideRef; jour: string }) {
  const [disponible, setDisponible] = useState(false);
  const [cartes, setCartes] = useState<Carte[] | null>(null);
  const [index, setIndex] = useState(0);
  const [recto, setRecto] = useState(false);
  const [dechirure, setDechirure] = useState(0);
  const [erreur, setErreur] = useState(false);
  const [chargement, setChargement] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const actif = useRef(false);
  const profil = guide ?? "nora";
  const portrait = "/guides/" + profil + "-welcome-avatar-v1.webp";

  useEffect(() => {
    let vivant = true;
    void createClient().from("boosters_exercices").select("cartes").eq("jour", jour).maybeSingle().then(({ data, error }) => {
      if (vivant && !error) setDisponible(true);
      if (vivant && data) {
        setCartes(ancien => ancien ?? data.cartes as Carte[]);
        if (!actif.current) setIndex(3);
      }
    });
    return () => { vivant = false; };
  }, [jour]);

  async function ouvrir() {
    if (actif.current || cartes) return;
    actif.current = true;
    setErreur(false);
    setChargement(true);
    setDechirure(1);
    try {
      const { data, error } = await createClient().rpc("ouvrir_booster_exercices");
      if (error || !Array.isArray(data) || data.length !== 3) throw new Error("Tirage indisponible");
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        await new Promise(resolve => window.setTimeout(resolve, 550));
      }
      setCartes(data as Carte[]);
    } catch {
      setErreur(true);
      setDechirure(0);
      actif.current = false;
    } finally {
      setChargement(false);
    }
  }

  function face(carte: Carte) {
    const [nom, nora, sasha] = mouvements[carte.exercice];
    return <>
      <strong>{nom}</strong>
      <Image src={profil === "sasha" ? sasha : nora} alt="" width={240} height={210} />
      <small>{raretes[carte.rarete]}</small>
    </>;
  }

  function avancer() {
    if (!recto) { setRecto(true); return; }
    setIndex(index + 1);
    setRecto(false);
  }

  if (!disponible) return null;

  const sachet = <><Image src={portrait} alt="" width={150} height={150} /><strong>BOOSTER</strong></>;
  const carte = cartes?.[index];
  return (
    <MotionConfig reducedMotion="user">
      <section className={styles.bloc} aria-label="Booster du jour">
        <div><small>3 cartes d’exercices</small><h2>Ton booster du jour</h2>
          <button type="button" className={styles.ouvrir} onClick={() => dialog.current?.showModal()}>
            {cartes ? "Voir mes cartes" : "Ouvrir mon booster"}
          </button>
        </div>
        <div className={styles.mini}>{sachet}</div>
      </section>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby="titre-booster">
        <div className={styles.ecran}>
          <button type="button" className={styles.fermer} aria-label="Fermer" onClick={() => dialog.current?.close()}>×</button>
          <h2 id="titre-booster">{cartes ? carte ? "Carte " + (index + 1) + " sur 3" : "Tes 3 cartes" : "Ton booster du jour"}</h2>
          {!cartes && <>
            <div className={styles.scene}>
              <motion.div className={styles.sachet} animate={chargement ? { y: 240, rotate: 16, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
                style={{ clipPath: "polygon(0 16px," + dechirure * 100 + "% 16px," + dechirure * 100 + "% 0,100% 0,100% 100%,0 100%)" }}>
                {sachet}
              </motion.div>
              <button type="button" className={styles.soudure} aria-label="Ouvrir le booster par la soudure"
                disabled={chargement}
                onClick={event => { if (event.detail === 0) void ouvrir(); }}
                onPointerDown={event => {
                  if (!event.isPrimary || event.button !== 0) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={event => {
                  if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                  const { left, width } = event.currentTarget.getBoundingClientRect();
                  const part = Math.max(0, Math.min(1, (event.clientX - left) / width));
                  setDechirure(part);
                  if (part >= .92) { event.currentTarget.releasePointerCapture(event.pointerId); void ouvrir(); }
                }}
                onPointerUp={() => { if (!actif.current) setDechirure(0); }}
                onPointerCancel={() => { if (!actif.current) setDechirure(0); }}
              ><span style={{ width: dechirure * 100 + "%" }} /></button>
            </div>
            <p>Prochain booster demain à 00 h 00 · heure de Paris</p>
            <p>{chargement ? "Ouverture…" : "Glisse sur la soudure de gauche à droite."}</p>
            {erreur && <p role="alert">Le booster est indisponible. Réessaie dans un instant.</p>}
          </>}
          {carte && <motion.button key={index + "-" + recto} type="button"
            initial={recto ? { rotateY: -90 } : { opacity: 0, y: 45 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }} transition={{ duration: index === 2 && recto ? .65 : .3 }}
            className={styles.carte} data-rarete={recto ? carte.rarete : undefined}
            aria-label={!recto ? "Retourner la carte" : index === 2 ? "Voir les trois cartes" : "Découvrir la carte suivante"}
            onClick={avancer}>
            {recto ? face(carte) : <Image src={portrait} alt="" width={240} height={210} />}
          </motion.button>}
          {cartes && !carte && <div className={styles.grille}>{cartes.map(item =>
            <article key={item.exercice} className={styles.carte} data-rarete={item.rarete}>{face(item)}</article>
          )}</div>}
        </div>
      </dialog>
    </MotionConfig>
  );
}

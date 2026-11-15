"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { useGuideActif } from "@/context/GuideContext";
import { shiftDateStr } from "@/lib/dates";
import type { GuideRef } from "@/lib/guides";
import styles from "./BoosterQuotidien.module.css";

const mouvements = {
  pompes: ["Pompes", "/entrainement/guides/pompes-f-2.webp", "/premiers-pas/m-pompes-2.webp"],
  crunch: ["Crunch", "/entrainement/guides/crunch-f-2.webp", "/entrainement/guides/crunch-f-2.webp"],
  fentes: ["Fentes", "/entrainement/guides/fentes-f-2.webp", "/premiers-pas/m-fentes-2.webp"],
  squat: ["Squat", "/premiers-pas/f-squat-2.webp", "/premiers-pas/m-squat-2.webp"],
  pompesdiamant: ["Pompes diamant","/entrainement/guides/pompesdiamant-f-2.webp","/entrainement/guides/pompesdiamant-f-2.webp"],
  pompesinclinees: ["Pompes inclinées","/entrainement/guides/pompesinclinees-f-2.webp","/entrainement/guides/pompesinclinees-f-2.webp"],
  pompesexplosives: ["Pompes explosives","/entrainement/guides/pompesexplosives-f-2.webp","/entrainement/guides/pompesexplosives-f-2.webp"],
  squatsaute: ["Squat sauté","/entrainement/guides/squatsaute-f-2.webp","/entrainement/guides/squatsaute-f-2.webp"],
  squatbulgare: ["Squat bulgare","/entrainement/guides/squatbulgare-f-2.webp","/entrainement/guides/squatbulgare-f-2.webp"],
  fentessautees: ["Fentes sautées","/entrainement/guides/fentessautees-f-2.webp","/entrainement/guides/fentessautees-f-2.webp"],
  bicyclecrunch: ["Crunch vélo","/entrainement/guides/bicyclecrunch-f-2.webp","/entrainement/guides/bicyclecrunch-f-2.webp"],
  reversecrunch: ["Crunch inversé","/entrainement/guides/reversecrunch-f-2.webp","/entrainement/guides/reversecrunch-f-2.webp"],
  relevesjambes: ["Relevés de jambes","/entrainement/guides/relevesjambes-f-2.webp","/entrainement/guides/relevesjambes-f-2.webp"],
  deadbug: ["Dead bug","/entrainement/guides/deadbug-f-2.webp","/entrainement/guides/deadbug-f-2.webp"],
  birddog: ["Bird dog","/entrainement/guides/birddog-f-2.webp","/entrainement/guides/birddog-f-2.webp"],
  hipthrust: ["Hip thrust","/entrainement/guides/hipthrust-f-2.webp","/entrainement/guides/hipthrust-f-2.webp"],
  dips: ["Dips","/entrainement/guides/dips-f-2.webp","/entrainement/guides/dips-f-2.webp"],
  rowinginverse: ["Rowing inversé","/entrainement/guides/rowinginverse-f-2.webp","/entrainement/guides/rowinginverse-f-2.webp"],
  stepupbanc: ["Step-up sur banc","/entrainement/guides/stepupbanc-f-2.webp","/entrainement/guides/stepupbanc-f-2.webp"],
  mountainclimbers: ["Mountain climbers","/entrainement/guides/mountainclimbers-f-2.webp","/entrainement/guides/mountainclimbers-f-2.webp"],
  burpees: ["Burpees","/entrainement/guides/burpees-f-2.webp","/entrainement/guides/burpees-f-2.webp"],
  abducteursmachine: ["Abducteurs à la machine","/entrainement/guides/abducteursmachine-f-2.webp","/entrainement/guides/abducteursmachine-f-2.webp"],
  corde: ["Corde à sauter","/entrainement/guides/corde-f-2.webp","/entrainement/guides/corde-f-2.webp"],
} as const;
const raretes = { commune: "Commune", rare: "Rare", epique: "Épique", legendaire: "Légendaire", chromatique: "Chromatique" } as const;
type Carte = { exercice: keyof typeof mouvements; rarete: keyof typeof raretes };

function face(carte: Carte, profil: GuideRef) {
  const [nom, nora, sasha] = mouvements[carte.exercice];
  return <>
    <strong>{nom}</strong>
    <Image src={profil === "sasha" ? sasha : nora} alt="" width={240} height={210} />
    <small>{raretes[carte.rarete]}</small>
  </>;
}


const fuseauParis = new Intl.DateTimeFormat("en", {timeZone:"Europe/Paris",timeZoneName:"longOffset"});
function tempsRestant(jour: string) {
  const demain = shiftDateStr(jour, 1);
  const minuitUTC = new Date(demain + "T00:00:00Z");
  const decalage = fuseauParis.formatToParts(minuitUTC)
    .find(part => part.type === "timeZoneName")?.value.slice(3) || "+00:00";
  const secondes = Math.max(0, Math.ceil((Date.parse(demain + "T00:00:00" + decalage) - Date.now()) / 1000));
  return [Math.floor(secondes / 3600), Math.floor(secondes / 60) % 60, secondes % 60]
    .map(valeur => String(valeur).padStart(2, "0")).join(":");
}

export function CollectionBoosters({ userId }: { userId: string }) {
  const { guide } = useGuideActif();
  const [cartes, setCartes] = useState<Carte[] | null>(null);
  const [erreur, setErreur] = useState(false);
  useEffect(() => {
    let actif = true;
    async function charger() {
      const client = createClient();
      const collection = new Map<string, Carte>();
      const taillePage = 100;
      for (let debut = 0; actif; debut += taillePage) {
        const { data, error } = await client.from("boosters_exercices").select("cartes")
          .eq("user_id", userId).order("jour", { ascending: false }).range(debut, debut + taillePage - 1);
        if (!actif) return;
        if (error) { setErreur(true); return; }
        for (const tirage of data) {
          for (const carte of tirage.cartes as Carte[]) {
            collection.set(carte.exercice + ":" + carte.rarete, carte);
          }
        }
        if (data.length < taillePage) {
          setCartes([...collection.values()]);
          return;
        }
      }
    }
    void charger();
    return () => { actif = false; };
  }, [userId]);
  useEffect(() => {
    if (window.location.hash === "#cartes-exercices") {
      document.getElementById("cartes-exercices")?.scrollIntoView();
    }
  }, [userId]);
  return <section id="cartes-exercices" className={styles.collection}>
    <h2>Mes cartes d’exercices</h2>
    {erreur ? <p>Impossible de charger les cartes.</p> : !cartes ? <p>Chargement…</p> : !cartes.length ? <p>Ouvre ton premier booster pour commencer ta collection.</p> :
      <div className={styles.grille}>{cartes.map(carte => <article key={carte.exercice + ":" + carte.rarete} className={styles.carte} data-rarete={carte.rarete}>{face(carte, guide)}</article>)}</div>}
  </section>;
}

export default function BoosterQuotidien({ guide, jour }: { guide: GuideRef; jour: string }) {
  const [disponible, setDisponible] = useState(false);
  const [cartes, setCartes] = useState<Carte[] | null>(null);
  const [compteRebours, setCompteRebours] = useState("");
  const [index, setIndex] = useState(0);
  const [dechirure, setDechirure] = useState(0);
  const [erreur, setErreur] = useState(false);
  const [chargement, setChargement] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const actif = useRef(false);
  const trace = useRef<Array<[number, number]>>([]);
  const [decoupe, setDecoupe] = useState<string>();
  const profil = guide ?? "nora";
  const portrait = "/guides/" + profil + "-welcome-avatar-v1.webp";

  useEffect(() => {
    let vivant = true;
    void createClient().rpc("ouvrir_booster_exercices_v2", { p_apercu: true }).then(({ data, error }) => {
      if (vivant && !error) setDisponible(true);
      if (vivant && data) {
        setCartes(ancien => ancien ?? data as Carte[]);
        if (!actif.current) setIndex(3);
      }
    });
    return () => { vivant = false; };
  }, [jour]);

  useEffect(() => {
    if (!cartes) return;
    const tick = () => setCompteRebours(tempsRestant(jour));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [cartes, jour]);

  async function ouvrir() {
    if (actif.current || cartes) return;
    actif.current = true;
    setErreur(false);
    setChargement(true);
    setDechirure(1);
    try {
      const { data, error } = await createClient().rpc("ouvrir_booster_exercices_v2");
      if (error || !Array.isArray(data) || data.length !== 3) throw new Error("Tirage indisponible");
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        await new Promise(resolve => window.setTimeout(resolve, 550));
      }
      setCartes(data as Carte[]);
    } catch {
      setErreur(true);
      setDechirure(0);
      setDecoupe(undefined);
      actif.current = false;
    } finally {
      setChargement(false);
    }
  }

  function avancer() {
    setIndex(index + 1);
  }

  if (!disponible) return null;

  const sachet = <><strong>BOOSTER</strong><span>VAIIYA</span><Image src={portrait} data-guide={profil} alt="" width={250} height={250} /></>;
  const carte = cartes?.[index];
  return (
    <MotionConfig reducedMotion="user">
      <section className={styles.bloc} aria-label="Booster du jour">
        <div><small>3 cartes d’exercices</small><h2>Ton booster du jour</h2>
          <button type="button" className={styles.ouvrir} disabled={!!cartes} onClick={() => dialog.current?.showModal()}>
            Ouvrir le booster
          </button>
        </div>
        <div className={styles.statut}><div className={styles.mini}>{sachet}</div>
          {cartes && <div className={styles.compte}><small>Prochain booster</small><strong>{compteRebours}</strong></div>}
        </div>
      </section>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby="titre-booster">
        <div className={styles.ecran}>
          <button type="button" className={styles.fermer} aria-label="Fermer" onClick={() => dialog.current?.close()}>×</button>
          <h2 id="titre-booster">{cartes ? carte ? "Carte " + (index + 1) + " sur 3" : "Tes 3 cartes" : "Ton booster du jour"}</h2>
          {!cartes && <>
            <div className={styles.scene}>
              <motion.div className={styles.sachet} animate={chargement ? { y: 240, rotate: 16, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
                style={{ clipPath: decoupe }}>
                {sachet}
              </motion.div>
              <button type="button" className={styles.soudure} aria-label="Ouvrir le booster par la soudure"
                disabled={chargement}
                onClick={event => { if (event.detail === 0) void ouvrir(); }}
                onPointerDown={event => {
                  if (!event.isPrimary || event.button !== 0) return;
                  const y = Math.min(40, Math.max(5, event.clientY - event.currentTarget.getBoundingClientRect().top));
                  trace.current = [[0, y]];
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={event => {
                  if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                  const { left, top, width } = event.currentTarget.getBoundingClientRect();
                  const part = Math.max(0, Math.min(1, (event.clientX - left) / width));
                  const y = Math.min(40, Math.max(5, event.clientY - top));
                  if (part * 100 > (trace.current.at(-1)?.[0] ?? 0)) trace.current.push([part * 100, y]);
                  const chemin = trace.current.map(([x, hauteur]) => x + "% " + hauteur + "px").join(",");
                  setDecoupe("polygon(" + chemin + "," + part * 100 + "% 0,100% 0,100% 100%,0 100%)");
                  setDechirure(part);
                  if (part >= .92) { event.currentTarget.releasePointerCapture(event.pointerId); void ouvrir(); }
                }}
                onPointerUp={() => { if (!actif.current) { setDechirure(0); setDecoupe(undefined); } }}
                onPointerCancel={() => { if (!actif.current) { setDechirure(0); setDecoupe(undefined); } }}
              ><span style={{ width: dechirure * 100 + "%" }} /></button>
            </div>
            <p>Prochain booster demain à 00 h 00 · heure de Paris</p>
            <p>{chargement ? "Ouverture…" : "Glisse sur la soudure de gauche à droite."}</p>
            {erreur && <p role="alert">Le booster est indisponible. Réessaie dans un instant.</p>}
          </>}
          {carte && <motion.button key={index} type="button"
            initial={{ opacity: 0, y: 45, scale: .94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: index === 2 ? .55 : .3 }}
            className={styles.carte} data-rarete={carte.rarete}
            aria-label={index === 2 ? "Voir les trois cartes" : "Découvrir la carte suivante"}
            onClick={avancer}>
            {face(carte, profil)}
          </motion.button>}
          {cartes && !carte && <>
            <p>Retrouve ces cartes dans ton profil.</p>
            <div className={styles.grille}>{cartes.map(item =>
            <article key={item.exercice} className={styles.carte} data-rarete={item.rarete}>{face(item, profil)}</article>
          )}</div>
            <Link className={styles.ouvrir} data-ouvert href="/profil#cartes-exercices" onClick={() => dialog.current?.close()}>Voir mes cartes</Link>
          </>}
        </div>
      </dialog>
    </MotionConfig>
  );
}

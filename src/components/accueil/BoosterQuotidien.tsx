"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { useGuideActif } from "@/context/GuideContext";
import { shiftDateStr } from "@/lib/dates";
import type { GuideRef } from "@/lib/guides";
import styles from "./BoosterQuotidien.module.css";

const mouvements = {
  pompes: ["Pompes", "pompes", true],
  crunch: ["Crunch", "sol"],
  fentes: ["Fentes", "fente", true],
  squat: ["Squat", "debout", true],
  pompesdiamant: ["Pompes diamant", "pompes"],
  pompesinclinees: ["Pompes inclinées", "machine"],
  pompesexplosives: ["Pompes explosives", "pompes"],
  squatsaute: ["Squat sauté", "saut"],
  squatbulgare: ["Squat bulgare", "machine"],
  fentessautees: ["Fentes sautées", "saut"],
  bicyclecrunch: ["Crunch vélo", "sol"],
  reversecrunch: ["Crunch inversé", "sol"],
  relevesjambes: ["Relevés de jambes", "sol"],
  deadbug: ["Dead bug", "sol"],
  birddog: ["Bird dog", "sol"],
  hipthrust: ["Hip thrust", "sol"],
  dips: ["Dips", "machine"],
  rowinginverse: ["Rowing inversé", "machine"],
  stepupbanc: ["Step-up sur banc", "machine"],
  mountainclimbers: ["Mountain climbers", "sol"],
  burpees: ["Burpees", "sol"],
  abducteursmachine: ["Abducteurs à la machine", "machine"],
  corde: ["Corde à sauter", "saut"],
} satisfies Record<string, [nom: string, pose: string, illustrationSasha?: boolean]>;
const raretes = { commune: "Commune", rare: "Rare", epique: "Épique", legendaire: "Légendaire", chromatique: "Chromatique" } as const;
type Carte = { exercice: keyof typeof mouvements; rarete: keyof typeof raretes };

const etoiles = [
  [19, 3, 3], [79, 4, 4], [24, 8, 7], [57, 8, 4], [96, 8, 6], [24, 19, 3],
  [57, 17, 8], [96, 24, 3], [24, 29, 7], [58, 33, 4], [96, 41, 7],
  [7, 35, 4], [16, 43, 3], [38, 44, 4], [25, 50, 5], [56, 51, 7], [96, 50, 4],
  [92, 57, 7], [59, 58, 5], [21, 56, 4], [25, 61, 7], [57, 66, 8], [91, 66, 5],
  [12, 65, 4], [27, 71, 4], [83, 72, 3], [53, 73, 4], [72, 77, 3],
].map(([x, y, taille]) => ({
  key: x + ":" + y,
  style: { "--etoile-x": x + "%", "--etoile-y": y + "%", "--etoile-taille": taille + "px" } as CSSProperties,
}));

function CarteBooster({ carte, guide, avancer, derniere = false }: {
  carte: Carte;
  guide: GuideRef;
  avancer?: () => void;
  derniere?: boolean;
}) {
  const [nom, pose, illustrationSasha] = mouvements[carte.exercice];
  const rarete = raretes[carte.rarete];
  const image = guide === "sasha" && illustrationSasha
    ? `/premiers-pas/m-${carte.exercice}-2.webp`
    : `/boosters/nora/${carte.exercice}.webp`;
  const geste = useRef<{ bounds: DOMRect; x: number; y: number; glisse: boolean } | null>(null);

  function eclairer(event: PointerEvent<HTMLElement>) {
    if (!event.isPrimary || (event.pointerType === "touch" && !geste.current)) return;
    const element = event.currentTarget;
    const { left, top, width, height } = geste.current?.bounds ?? element.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - left) / width));
    const y = Math.max(0, Math.min(1, (event.clientY - top) / height));
    if (geste.current && event.buttons && Math.hypot(event.clientX - geste.current.x, event.clientY - geste.current.y) > 6) {
      geste.current.glisse = true;
    }
    element.dataset.eclairee = "";
    element.style.setProperty("--lumiere-x", x * 100 + "%");
    element.style.setProperty("--lumiere-y", y * 100 + "%");
    element.style.setProperty("--reflet", (1 - x) * 100 + "%");
    element.style.setProperty("--inclinaison-x", (.5 - y) * 21 + "deg");
    element.style.setProperty("--inclinaison-y", (x - .5) * 25 + "deg");
  }

  function relacher(event: PointerEvent<HTMLElement>) {
    if (!event.isPrimary) return;
    if (geste.current && Math.hypot(event.clientX - geste.current.x, event.clientY - geste.current.y) > 6) {
      geste.current.glisse = true;
    }
    const element = event.currentTarget;
    delete element.dataset.eclairee;
    for (const property of ["--lumiere-x", "--lumiere-y", "--reflet", "--inclinaison-x", "--inclinaison-y"]) {
      element.style.removeProperty(property);
    }
  }

  return (
    <article className={styles.carte} data-rarete={carte.rarete} data-revelation={avancer ? "" : undefined}
      onPointerDown={event => {
        if (!event.isPrimary || event.button !== 0) return;
        geste.current = { bounds: event.currentTarget.getBoundingClientRect(), x: event.clientX, y: event.clientY, glisse: false };
        eclairer(event);
      }}
      onPointerMove={eclairer}
      onPointerUp={relacher}
      onPointerLeave={event => { relacher(event); geste.current = null; }}
      onPointerCancel={event => { relacher(event); geste.current = null; }}>
      <div className={styles.cadre}>
        <div className={styles.face}>
          <div aria-hidden="true" className={styles.etoiles}>
            {etoiles.map(etoile => <i key={etoile.key} style={etoile.style} />)}
          </div>
          <div aria-hidden="true" className={`${styles.etoiles} ${styles.etoilesEclairees}`}>
            {etoiles.map(etoile => <i key={etoile.key} style={etoile.style} />)}
          </div>
          <Image className={styles.logo} src="/marque/logo-degrade.png" alt="" width={24} height={18} />
          <div className={styles.exercice} data-pose={pose}>
            <Image src={image} alt="" width={240} height={240} sizes={avancer ? "(max-width: 420px) 80vw, 330px" : "135px"}
              className={styles.mouvement} draggable={false} loading={avancer ? "eager" : "lazy"} />
          </div>
          <strong>{nom}</strong>
          <small>{rarete}</small>
        </div>
      </div>
      {avancer && <button type="button" className={styles.suivante}
        aria-label={`${nom}, ${rarete}. ${derniere ? "Voir les trois cartes" : "Découvrir la carte suivante"}`}
        onClick={event => {
          if (event.detail === 0 || !geste.current?.glisse) avancer();
          geste.current = null;
        }} />}
    </article>
  );
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
      <div className={styles.grille}>{cartes.map(carte =>
        <CarteBooster key={carte.exercice + ":" + carte.rarete} carte={carte} guide={guide} />
      )}</div>}
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
  const mouvementReduit = useReducedMotion();
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
      <dialog ref={dialog} className={styles.dialog} data-ouverture={carte ? "" : undefined} aria-labelledby="titre-booster">
        <div className={styles.ecran}>
          <button type="button" className={styles.fermer} aria-label="Fermer" onClick={() => dialog.current?.close()}>×</button>
          <h2 id="titre-booster" aria-live="polite">{cartes ? carte ? "Carte " + (index + 1) + " sur 3" : "Booster ouvert" : "Ton booster du jour"}</h2>
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
          {carte && <div key={index} className={styles.revelation} data-rarete={carte.rarete}>
            {index === 2 && !mouvementReduit && <div className={styles.aura} aria-hidden="true" />}
            <motion.div
              initial={mouvementReduit ? false : { opacity: 0, y: 40, scale: .94, visibility: "hidden" }}
              animate={{ opacity: 1, y: 0, scale: 1, visibility: "visible" }}
              transition={{ delay: index === 2 ? .64 : 0, duration: index === 2 ? .48 : .3 }}>
              <CarteBooster carte={carte} guide={profil} avancer={avancer} derniere={index === 2} />
            </motion.div>
          </div>}
          {cartes && !carte && <>
            <p>Tes trois cartes ont rejoint ta collection.</p>
            <div className={`${styles.grille} ${styles.recapitulatif}`}>{cartes.map((item, position) =>
              <motion.div key={item.exercice} initial={mouvementReduit ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }} transition={{ delay: position * .075, duration: .32 }}>
                <CarteBooster carte={item} guide={profil} />
              </motion.div>
            )}</div>
            <Link className={styles.ouvrir} data-ouvert href="/profil#cartes-exercices" onClick={() => dialog.current?.close()}>Voir mes cartes</Link>
          </>}
        </div>
      </dialog>
    </MotionConfig>
  );
}

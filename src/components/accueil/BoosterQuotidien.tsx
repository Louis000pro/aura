"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { useGuideActif } from "@/context/GuideContext";
import { shiftDateStr } from "@/lib/dates";
import type { GuideRef } from "@/lib/guides";
import { mouvements, raretes, type Carte } from "@/lib/cartesBooster";
import SachetBooster, { MiniSachetBooster } from "./SachetBooster";
import styles from "./BoosterQuotidien.module.css";

async function demanderEssai(methode: "GET" | "POST", signal?: AbortSignal) {
  const { data: { session } } = await createClient().auth.getSession();
  if (!session) return null;
  const response = await fetch("/api/boosters/essai", {
    method: methode,
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
    signal,
  });
  if (!response.ok) return null;
  return await response.json() as { illimite?: boolean; cartes?: Carte[] };
}

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

function CarteBooster({ carte, guide, avancer, derniere = false, prioritaire = false }: {
  carte: Carte;
  guide: GuideRef;
  avancer?: () => void;
  derniere?: boolean;
  prioritaire?: boolean;
}) {
  const [nom, pose, illustrationSasha] = mouvements[carte.exercice];
  const rarete = raretes[carte.rarete];
  const image = guide === "sasha" && illustrationSasha
    ? `/premiers-pas/m-${carte.exercice}-2.webp`
    : `/boosters/nora/${carte.exercice}.webp?v=2`;
  const geste = useRef<{ id: number; bounds: DOMRect; x: number; y: number } | null>(null);
  const clicApresGlissement = useRef(false);

  function eclairer(event: PointerEvent<HTMLElement>) {
    const enCours = geste.current;
    if (!event.isPrimary || (event.pointerType === "touch" && enCours?.id !== event.pointerId)) return;
    const element = event.currentTarget;
    const { left, top, width, height } = enCours?.bounds ?? element.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - left) / width));
    const y = Math.max(0, Math.min(1, (event.clientY - top) / height));
    if (enCours && Math.hypot(event.clientX - enCours.x, event.clientY - enCours.y) > 6) {
      clicApresGlissement.current = true;
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
    const enCours = geste.current;
    if (enCours?.id === event.pointerId) {
      if (event.type !== "pointerup" || Math.hypot(event.clientX - enCours.x, event.clientY - enCours.y) > 6) {
        clicApresGlissement.current = true;
      }
      geste.current = null;
    }
    const element = event.currentTarget;
    delete element.dataset.eclairee;
    for (const property of ["--lumiere-x", "--lumiere-y", "--reflet", "--inclinaison-x", "--inclinaison-y"]) {
      element.style.removeProperty(property);
    }
  }

  return (
    <article className={styles.carte} data-rarete={carte.rarete} data-revelation={avancer ? "" : undefined}
      data-derniere={derniere ? "" : undefined}
      onPointerDown={event => {
        if (!event.isPrimary || event.button !== 0) return;
        const { currentTarget, target, pointerId, clientX, clientY } = event;
        geste.current = { id: pointerId, bounds: currentTarget.getBoundingClientRect(), x: clientX, y: clientY };
        clicApresGlissement.current = false;
        if (avancer && target instanceof HTMLButtonElement) target.setPointerCapture(pointerId);
        eclairer(event);
      }}
      onPointerMove={eclairer}
      onPointerUp={relacher}
      onPointerLeave={relacher}
      onPointerCancel={relacher}
      onLostPointerCapture={relacher}>
      <div className={styles.cadre}>
        <div className={styles.face}>
          <div aria-hidden="true" className={styles.etoiles}>
            {etoiles.map(etoile => <i key={etoile.key} style={etoile.style} />)}
          </div>
          <div aria-hidden="true" className={`${styles.etoiles} ${styles.etoilesEclairees}`}>
            {etoiles.map(etoile => <i key={etoile.key} style={etoile.style} />)}
          </div>
          <div aria-hidden="true" className={styles.spectre} />
          <Image className={styles.logo} src="/marque/logo-degrade.png" alt="" width={24} height={18} />
          <div className={styles.exercice} data-pose={pose}>
            <Image src={image} alt="" width={420} height={420} unoptimized
              className={styles.mouvement} draggable={false} loading={avancer || prioritaire ? "eager" : "lazy"} />
          </div>
          <strong>{nom}</strong>
          <small>{rarete}</small>
        </div>
      </div>
      {avancer && <button type="button" className={styles.suivante}
        aria-label={`${nom}, ${rarete}. ${derniere ? "Voir les trois cartes" : "Découvrir la carte suivante"}`}
        onClick={event => {
          if (event.detail === 0 || !clicApresGlissement.current) avancer();
          clicApresGlissement.current = false;
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
  const [illimite, setIllimite] = useState(false);
  const [cartes, setCartes] = useState<Carte[] | null>(null);
  const [compteRebours, setCompteRebours] = useState("");
  const [index, setIndex] = useState(0);
  const [erreur, setErreur] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [sortie, setSortie] = useState<Carte[] | null>(null);
  const [essaiSachet, setEssaiSachet] = useState(0);
  const mouvementReduit = useReducedMotion();
  const dialog = useRef<HTMLDialogElement>(null);
  const actif = useRef(false);
  const profil = guide ?? "nora";

  useEffect(() => {
    let vivant = true;
    const controle = new AbortController();
    async function charger() {
      const essai = await demanderEssai("GET", controle.signal).catch(() => null);
      if (!vivant) return;
      if (essai?.illimite) {
        setIllimite(true);
        setDisponible(true);
        return;
      }
      const { data, error } = await createClient().rpc("ouvrir_booster_exercices_v2", { p_apercu: true });
      if (!vivant || error) return;
      setIllimite(false);
      setDisponible(true);
      if (data) {
        setCartes(ancien => ancien ?? data as Carte[]);
        if (!actif.current) setIndex(3);
      }
    }
    void charger();
    return () => { vivant = false; controle.abort(); };
  }, [jour]);

  useEffect(() => {
    if (!cartes || illimite) return;
    const tick = () => setCompteRebours(tempsRestant(jour));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [cartes, illimite, jour]);

  function reinitialiserEssai() {
    actif.current = false;
    setCartes(null);
    setIndex(0);
    setErreur(false);
  }

  async function ouvrir() {
    if (actif.current || cartes) return;
    actif.current = true;
    setErreur(false);
    setChargement(true);
    try {
      let tirage: unknown;
      if (illimite) {
        tirage = (await demanderEssai("POST"))?.cartes;
      } else {
        const { data, error } = await createClient().rpc("ouvrir_booster_exercices_v2");
        if (error) throw new Error("Tirage indisponible");
        tirage = data;
      }
      if (!Array.isArray(tirage) || tirage.length !== 3) throw new Error("Tirage indisponible");
      const nouvellesCartes = tirage as Carte[];
      if (!mouvementReduit) {
        setSortie(nouvellesCartes);
        await new Promise(resolve => window.setTimeout(resolve, 1100));
      }
      setCartes(nouvellesCartes);
    } catch {
      setErreur(true);
      setEssaiSachet(essai => essai + 1);
      actif.current = false;
    } finally {
      setSortie(null);
      setChargement(false);
    }
  }

  function avancer() {
    setIndex(index + 1);
  }

  if (!disponible) return null;

  const carte = cartes?.[index];
  return (
    <MotionConfig reducedMotion="user">
      <section className={styles.bloc} aria-label="Booster du jour">
        <div><small>{illimite ? "Mode test · ouvertures illimitées" : "3 cartes d’exercices"}</small>
          <h2>{illimite ? "Tes boosters d’essai" : "Ton booster du jour"}</h2>
          <button type="button" className={styles.ouvrir} disabled={chargement || (!illimite && !!cartes)} onClick={() => {
            if (illimite) reinitialiserEssai();
            dialog.current?.showModal();
          }}>
            Ouvrir le booster
          </button>
        </div>
        <div className={styles.statut}><MiniSachetBooster />
          {cartes && !illimite && <div className={styles.compte}><small>Prochain booster</small><strong>{compteRebours}</strong></div>}
        </div>
      </section>
      <dialog ref={dialog} className={styles.dialog} data-ouverture={carte ? "" : undefined} aria-labelledby="titre-booster">
        <div className={styles.ecran} data-sortie={sortie ? "" : undefined}>
          <button type="button" className={styles.fermer} aria-label="Fermer" onClick={() => dialog.current?.close()}>×</button>
          <h2 id="titre-booster" aria-live="polite">{cartes ? carte ? "Carte " + (index + 1) + " sur 3" : "Booster ouvert" : illimite ? "Booster d’essai" : "Ton booster du jour"}</h2>
          {!cartes && <>
            <SachetBooster key={essaiSachet} ouvrir={() => { void ouvrir(); }} chargement={chargement} sortie={!!sortie}
              enfants={sortie?.map((item, position) => <motion.div key={item.exercice} className={styles.carteSortante} aria-hidden="true"
                initial={{ y: "4%", x: 0, rotate: 0, opacity: 0 }}
                animate={{ y: ["4%", "-63%", "-53%"], x: [0, 0, (position - 1) * 48],
                  rotate: [0, 0, (position - 1) * 12], opacity: [0, 1, 1] }}
                transition={{ delay: .12 + position * .04, duration: .86, times: [0, .62, 1], ease: "easeOut" }}>
                <CarteBooster carte={item} guide={profil} prioritaire />
              </motion.div>)} />
            {!illimite && <p>Prochain booster demain à 00 h 00 · heure de Paris</p>}
            {erreur && <p role="alert">Le booster est indisponible. Réessaie dans un instant.</p>}
          </>}
          {carte && <div key={index} className={styles.revelation} data-rarete={carte.rarete}>
            {index === 2 && !mouvementReduit && <div className={styles.aura} aria-hidden="true" />}
            <motion.div
              initial={mouvementReduit ? false : { opacity: 0, y: 32, scale: .91, rotate: index % 2 ? 3 : -3, visibility: "hidden" }}
              animate={mouvementReduit ? { opacity: 1, y: 0, scale: 1, rotate: 0, visibility: "visible" } : {
                opacity: [0, 1, 1], y: [32, -5, 0], scale: [.91, 1.023, 1],
                rotate: [index % 2 ? 3 : -3, index % 2 ? -.6 : .6, 0], visibility: "visible",
              }}
              transition={{ delay: index === 2 && !mouvementReduit ? .59 : 0, duration: mouvementReduit ? 0 : index === 2 ? .63 : .46,
                times: [0, .7, 1], ease: ["easeOut", "easeInOut"] }}>
              <CarteBooster carte={carte} guide={profil} avancer={avancer} derniere={index === 2} />
            </motion.div>
          </div>}
          {cartes && !carte && <>
            <p>{illimite ? "Tirage d’essai · tu peux en ouvrir un autre tout de suite." : "Tes trois cartes ont rejoint ta collection."}</p>
            <div className={`${styles.grille} ${styles.recapitulatif}`}>{cartes.map((item, position) =>
              <motion.div key={item.exercice} initial={mouvementReduit ? false : { opacity: 0, y: 24, rotate: (position - 1) * 5 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: mouvementReduit ? 0 : position * .09,
                  duration: mouvementReduit ? 0 : .43, ease: [.2, .85, .26, 1] }}>
                <CarteBooster carte={item} guide={profil} />
              </motion.div>
            )}</div>
            {illimite
              ? <button className={styles.ouvrir} data-ouvert type="button" onClick={reinitialiserEssai}>Ouvrir un autre booster</button>
              : <Link className={styles.ouvrir} data-ouvert href="/profil#cartes-exercices" onClick={() => dialog.current?.close()}>Voir mes cartes</Link>}
          </>}
        </div>
      </dialog>
    </MotionConfig>
  );
}

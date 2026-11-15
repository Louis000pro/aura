"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { useGuideActif } from "@/context/GuideContext";
import { shiftDateStr } from "@/lib/dates";
import type { GuideId } from "@/lib/guides";
import { mouvements, raretes, type Carte } from "@/lib/cartesBooster";
import SachetBooster, { MiniSachetBooster } from "./SachetBooster";
import styles from "./BoosterQuotidien.module.css";

async function demanderEssai(methode: "GET" | "POST", signal?: AbortSignal, requete?: string) {
  const { data: { session } } = await createClient().auth.getSession();
  if (!session) return null;
  const response = await fetch("/api/boosters/essai", {
    method: methode,
    headers: { Authorization: `Bearer ${session.access_token}`, ...(requete ? { "X-Booster-Request-Id": requete } : {}) },
    cache: "no-store",
    signal,
  });
  if (!response.ok) return null;
  return await response.json() as { illimite?: boolean; cartes?: Carte[]; exp?: number };
}

const etoiles = [
  [19, 3, 3], [79, 4, 4], [24, 8, 7], [57, 8, 4], [96, 8, 6], [24, 19, 3],
  [57, 17, 8], [96, 24, 3], [24, 29, 7], [58, 33, 4], [96, 41, 7],
  [7, 35, 4], [16, 43, 3], [38, 44, 4], [25, 50, 5], [56, 51, 7], [96, 50, 4],
  [92, 57, 7], [59, 58, 5], [21, 56, 4], [25, 61, 7], [57, 66, 8], [91, 66, 5],
  [12, 65, 4], [27, 71, 4], [83, 72, 3], [53, 73, 4], [72, 77, 3],
].map(([x, y, taille]) => ({
  key: x + ":" + y,
  colonne: Math.min(2, Math.floor(x / (100 / 3))),
  ligne: y < 50 ? 0 : 1,
  style: { "--etoile-x": x + "%", "--etoile-y": y + "%", "--etoile-taille": taille + "px" } as CSSProperties,
}));

const zonesEtoiles = Array.from({ length: 6 }, (_, index) => {
  const colonne = index % 3;
  const ligne = Math.floor(index / 3);
  return { x: (colonne + .5) / 3, y: (ligne + .5) / 2,
    etoiles: etoiles.filter(etoile => etoile.colonne === colonne && etoile.ligne === ligne) };
});

async function lireGuideCartes(userId: string): Promise<GuideId | null> {
  const { data, error } = await createClient().from("profiles").select("guide_id").eq("id", userId).maybeSingle();
  if (error) throw new Error("Lecture du coach indisponible");
  const guide = data?.guide_id;
  return guide === "sasha" || guide === "nora" ? guide : null;
}

function imageCarte(carte: Carte, guide: GuideId) {
  if (guide === "nora" && carte.exercice === "crunch" && carte.rarete !== "chromatique") {
    return "/boosters/cartes-prisme/" + carte.rarete + "-crunch.webp";
  }
  return "/boosters/cartes-completes-v1/" + [guide, carte.exercice, carte.rarete].join("-") + ".webp";
}

async function decoderCarte(carte: Carte, guide: GuideId) {
  const image = new window.Image();
  image.src = imageCarte(carte, guide);
  let timer: number | undefined;
  try {
    await Promise.race([
      image.decode(),
      new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error("Image indisponible")), 15000);
      }),
    ]);
    return image;
  } finally {
    window.clearTimeout(timer);
  }
}

function CarteBooster({ carte, guide, avancer, derniere = false, prioritaire = false }: {
  carte: Carte;
  guide: GuideId;
  avancer?: () => void;
  derniere?: boolean;
  prioritaire?: boolean;
}) {
  const [nom] = mouvements[carte.exercice];
  const rarete = raretes[carte.rarete];
  const geste = useRef<{ id: number; x: number; y: number } | null>(null);
  const zone = useRef<DOMRect | null>(null);
  const position = useRef({ x: .5, y: .5 });
  const frame = useRef<number | null>(null);
  const reflet = useRef<HTMLDivElement>(null);
  const cadre = useRef<HTMLDivElement>(null);
  const zones = useRef<(HTMLDivElement | null)[]>([]);
  const clicApresGlissement = useRef(false);

  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);

  function eclairer(event: PointerEvent<HTMLElement>) {
    const enCours = geste.current;
    if (!event.isPrimary || (event.pointerType === "touch" && enCours?.id !== event.pointerId)) return;
    const element = event.currentTarget;
    const { left, top, width, height } = zone.current ??= element.getBoundingClientRect();
    position.current = {
      x: Math.max(0, Math.min(1, (event.clientX - left) / width)),
      y: Math.max(0, Math.min(1, (event.clientY - top) / height)),
    };
    if (enCours && Math.hypot(event.clientX - enCours.x, event.clientY - enCours.y) > 6) clicApresGlissement.current = true;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const { x, y } = position.current;
      if (!element.hasAttribute("data-eclairee")) element.dataset.eclairee = "";
      cadre.current!.style.transform = "perspective(760px) rotateX(" + ((.5 - y) * 17) + "deg) rotateY(" + ((x - .5) * 21) + "deg)";
      reflet.current!.style.transform = "translate3d(" + ((x - .5) * 47) + "%," + ((y - .5) * 32) + "%,0)";
      for (let i = 0; i < zonesEtoiles.length; i++) {
        const point = zonesEtoiles[i];
        zones.current[i]!.style.opacity = String(Math.max(0, 1 - Math.hypot(x - point.x, y - point.y) * 1.72));
      }
    });
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
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    zone.current = null;
    delete event.currentTarget.dataset.eclairee;
    cadre.current?.style.removeProperty("transform");
    reflet.current?.style.removeProperty("transform");
    for (const etoiles of zones.current) etoiles?.style.removeProperty("opacity");
  }

  return (
    <article className={styles.carte} data-rarete={carte.rarete} data-revelation={avancer ? "" : undefined}
      data-derniere={derniere ? "" : undefined}
      onPointerDown={event => {
        if (!event.isPrimary || event.button !== 0) return;
        const { currentTarget, target, pointerId, clientX, clientY } = event;
        zone.current = currentTarget.getBoundingClientRect();
        geste.current = { id: pointerId, x: clientX, y: clientY };
        clicApresGlissement.current = false;
        if (avancer && target instanceof HTMLButtonElement) target.setPointerCapture(pointerId);
        eclairer(event);
      }}
      onPointerMove={eclairer}
      onPointerUp={relacher}
      onPointerLeave={relacher}
      onPointerCancel={relacher}
      onLostPointerCapture={relacher}>
      <div ref={cadre} className={styles.cadre}>
        <div className={styles.face}>
          <div aria-hidden="true" className={styles.etoiles}>
            {etoiles.map(etoile => <i key={etoile.key} style={etoile.style} />)}
          </div>
          <div aria-hidden="true" className={styles.etoilesEclairees}>
            {zonesEtoiles.map((point, i) => <div key={i} ref={element => { zones.current[i] = element; }} className={styles.zoneEtoiles}>
              {point.etoiles.map(etoile => <i key={etoile.key} style={etoile.style} />)}
            </div>)}
          </div>
          <div aria-hidden="true" className={styles.spectre}><div ref={reflet} className={styles.reflet} /></div>
          <Image className={styles.planche} src={imageCarte(carte, guide)} alt={nom + ", " + rarete}
            width={820} height={1290} unoptimized draggable={false} loading={avancer || prioritaire ? "eager" : "lazy"} />
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
  const cleGuide = userId + ":" + guide;
  const [portrait, setPortrait] = useState<{ cle: string; choix: GuideId | null } | null>(null);
  const profil = portrait?.cle === cleGuide ? portrait : null;
  useEffect(() => {
    let actif = true;
    void lireGuideCartes(userId)
      .then(choix => { if (actif) setPortrait({ cle: cleGuide, choix }); })
      .catch(() => { if (actif) setPortrait({ cle: cleGuide, choix: null }); });
    return () => { actif = false; };
  }, [cleGuide, userId]);
  useEffect(() => {
    let actif = true;
    async function charger() {
      const client = createClient();
      const collection = new Map<string, Carte>();
      const taillePage = 100;
      for (const table of ["boosters_exercices", "boosters_illimites"]) {
        for (let debut = 0; actif; debut += taillePage) {
          const lecture = client.from(table).select("cartes").eq("user_id", userId);
          const { data, error } = await (table === "boosters_exercices"
            ? lecture.order("jour", { ascending: false })
            : lecture.order("ouvert_le", { ascending: false }).order("requete_id"))
            .range(debut, debut + taillePage - 1);
          if (!actif) return;
          if (error?.code === "PGRST205" || error?.code === "42P01") {
            if (table === "boosters_illimites") break;
          }
          if (error) { setErreur(true); return; }
          for (const tirage of data) {
            for (const carte of tirage.cartes as Carte[]) {
              collection.set(carte.exercice + ":" + carte.rarete, carte);
            }
          }
          if (data.length < taillePage) break;
        }
      }
      if (actif) setCartes([...collection.values()]);
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
      !profil ? <p>Chargement de ton coach…</p> : !profil.choix ? <p>Impossible d’identifier ton coach. Vérifie ton choix dans les paramètres.</p> :
      <div className={styles.grille}>{cartes.map(carte =>
        <CarteBooster key={carte.exercice + ":" + carte.rarete} carte={carte} guide={profil.choix!} />
      )}</div>}
  </section>;
}

const ordreRarete: Carte["rarete"][] = ["commune", "rare", "epique", "legendaire", "chromatique"];

function disposerCartes(cartes: Carte[]) {
  if (cartes.length !== 3) return cartes;
  const resultat = [...cartes];
  const vedette = cartes.reduce((meilleure, carte, index) =>
    ordreRarete.indexOf(carte.rarete) >= ordreRarete.indexOf(cartes[meilleure].rarete) ? index : meilleure, 0);
  const [carte] = resultat.splice(vedette, 1);
  resultat.splice(1, 0, carte);
  return resultat;
}

export default function BoosterQuotidien({ userId, jour, onGain }: { userId: string; jour: string; onGain?: () => void }) {
  const [disponible, setDisponible] = useState(false);
  const [illimite, setIllimite] = useState(false);
  const [cartes, setCartes] = useState<Carte[] | null>(null);
  const [compteRebours, setCompteRebours] = useState("");
  const [index, setIndex] = useState(0);
  const [exp, setExp] = useState(0);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [sortie, setSortie] = useState<Carte[] | null>(null);
  const [essaiSachet, setEssaiSachet] = useState(0);
  const mouvementReduit = useReducedMotion();
  const dialog = useRef<HTMLDialogElement>(null);
  const actif = useRef(false);
  const tirageEnAttente = useRef<{ cartes: Carte[]; exp: number } | null>(null);
  const requeteEssai = useRef<string | null>(null);
  const imagesDecodees = useRef<HTMLImageElement[]>([]);
  const [profil, setProfil] = useState<GuideId | null>(null);

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
    imagesDecodees.current = [];
    setCartes(null);
    setExp(0);
    setIndex(0);
    setErreur("");
    setProfil(null);
  }

  async function ouvrir() {
    if (actif.current || cartes) return;
    actif.current = true;
    setErreur("");
    setChargement(true);
    let message = "Impossible de vérifier ton coach. Réessaie dans un instant.";
    try {
      const guideConfirme = await lireGuideCartes(userId);
      if (!guideConfirme) {
        message = "Choisis ton coach dans les paramètres pour ouvrir ton booster.";
        throw new Error(message);
      }
      message = "Le booster est indisponible. Réessaie dans un instant.";
      let tirage = tirageEnAttente.current;
      if (!tirage) {
        let nouvellesCartes: unknown;
        let gain = 0;
        if (illimite) {
          requeteEssai.current ??= crypto.randomUUID();
          const resultat = await demanderEssai("POST", undefined, requeteEssai.current);
          nouvellesCartes = resultat?.cartes;
          gain = resultat?.exp ?? 0;
        } else {
          const client = createClient();
          const { data, error } = await client.rpc("ouvrir_booster_exercices_v3");
          if (error?.code === "PGRST202") {
            const ancien = await client.rpc("ouvrir_booster_exercices_v2");
            if (ancien.error) throw new Error("Tirage indisponible");
            nouvellesCartes = ancien.data;
          } else {
            if (error) throw new Error("Tirage indisponible");
            nouvellesCartes = data?.cartes;
            gain = data?.exp ?? 0;
          }
        }
        if (!Array.isArray(nouvellesCartes) || nouvellesCartes.length !== 3) throw new Error("Tirage indisponible");
        tirage = { cartes: nouvellesCartes as Carte[], exp: gain };
        tirageEnAttente.current = tirage;
      }
      imagesDecodees.current = await Promise.all(tirage.cartes.map(carte => decoderCarte(carte, guideConfirme)));
      tirageEnAttente.current = null;
      requeteEssai.current = null;
      setProfil(guideConfirme);
      setExp(tirage.exp);
      if (tirage.exp > 0) onGain?.();
      if (!mouvementReduit && dialog.current?.open) setSortie(tirage.cartes);
      else setCartes(tirage.cartes);
    } catch {
      setErreur(message);
      setEssaiSachet(essai => essai + 1);
      actif.current = false;
    } finally {
      setChargement(false);
    }
  }

  function terminerChute() {
    if (!sortie) return;
    setCartes(sortie);
    setSortie(null);
  }

  function avancer() {
    setIndex(index + 1);
  }

  if (!disponible) return null;

  const carte = profil ? cartes?.[index] : undefined;
  const recapitulatif = profil && cartes && !carte ? disposerCartes(cartes) : null;
  return (
    <MotionConfig reducedMotion="user">
      <section className={styles.bloc} aria-label="Booster du jour">
        <div><small>{illimite ? "Mode test · ouvertures illimitées" : "3 cartes d’exercices"}</small>
          <h2>{illimite ? "Tes boosters d’essai" : "Ton booster du jour"}</h2>
          <button type="button" className={styles.ouvrir} disabled={chargement || !!sortie || (!illimite && !!cartes)} onClick={() => {
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
      <dialog ref={dialog} className={styles.dialog} data-ouverture={carte ? "" : undefined}
        data-recapitulatif={recapitulatif ? "" : undefined} onClose={terminerChute} aria-labelledby="titre-booster">
        <div className={styles.ecran} data-sortie={sortie ? "" : undefined}>
          <button type="button" className={styles.fermer} aria-label="Fermer" onClick={() => dialog.current?.close()}>×</button>
          <h2 id="titre-booster" aria-live="polite">{cartes ? carte ? "Carte " + (index + 1) + " sur 3" : "Booster ouvert !" : illimite ? "Booster d’essai" : "Ton booster du jour"}</h2>
          {!cartes && <>
            <SachetBooster key={essaiSachet} ouvrir={() => { void ouvrir(); }}
              chargement={chargement || !!sortie} sortie={!!sortie} reveler={terminerChute} />
            {!illimite && <p>Prochain booster demain à 00 h 00 · heure de Paris</p>}
            {erreur && <p role="alert">{erreur}</p>}
          </>}
          {carte && profil && <div key={index} className={styles.revelation} data-rarete={carte.rarete}>
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
          {recapitulatif && profil && <>
            <p className={styles.nombreCartes}>Tu as obtenu <strong>{recapitulatif.length} cartes</strong></p>
            {exp > 0 && <p className={styles.gainBooster}>+{exp} EXP</p>}
            <div className={styles.recapitulatif} aria-label="Cartes obtenues">
              {recapitulatif.map((item, position) =>
                <div key={item.exercice + ":" + item.rarete + ":" + position} className={styles.carteRecap}>
                  <motion.div initial={mouvementReduit ? false : { opacity: 0, y: 26, scale: .94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: mouvementReduit ? 0 : position === 1 ? .15 : .06, duration: .45,
                      ease: [.2, .85, .26, 1] }}>
                    <CarteBooster carte={item} guide={profil} prioritaire />
                  </motion.div>
                </div>
              )}
            </div>
            <div className={styles.actionsRecap}>
              <Link className={styles.collectionOr} href="/profil#cartes-exercices" onClick={() => dialog.current?.close()}>
                Voir ma collection <span aria-hidden="true">›</span>
              </Link>
              {illimite && <button className={styles.autreBooster} type="button" onClick={reinitialiserEssai}>
                Ouvrir un autre booster
              </button>}
            </div>
          </>}
        </div>
      </dialog>
    </MotionConfig>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { MotionConfig, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { useGuideActif } from "@/context/GuideContext";
import { shiftDateStr } from "@/lib/dates";
import type { GuideId } from "@/lib/guides";
import { mouvements, raretes, type Carte } from "@/lib/cartesBooster";
import { lireCollectionBoosters } from "@/lib/collectionBoosters";
import SachetBooster, { MiniSachetBooster, demanderMouvementAppareil } from "./SachetBooster";
import OuvertureCartes from "./OuvertureCartes";
import { InfosFin, ActionsFin } from "./FinBooster";
import { libererCelebration, retenirCelebration } from "@/lib/celebrationRang";
import { MaCollection, SaCollection } from "./CollectionCartes";
import type { CarteDetenue } from "@/lib/collectionBoosters";
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

function CarteBooster({ carte, guide, avancer, onOuvrir, derniere = false, prioritaire = false }: {
  carte: Carte;
  guide: GuideId;
  avancer?: () => void;
  onOuvrir?: () => void;
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
      role={onOuvrir ? "button" : undefined}
      tabIndex={onOuvrir ? 0 : undefined}
      aria-label={onOuvrir ? `Voir ${nom}, ${rarete}, en grand` : undefined}
      onClick={onOuvrir ? () => { if (!clicApresGlissement.current) onOuvrir(); clicApresGlissement.current = false; } : undefined}
      onKeyDown={onOuvrir ? event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOuvrir(); } } : undefined}
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
function prochainMinuit(jour: string) {
  const demain = shiftDateStr(jour, 1);
  const minuitUTC = new Date(demain + "T00:00:00Z");
  const decalage = fuseauParis.formatToParts(minuitUTC)
    .find(part => part.type === "timeZoneName")?.value.slice(3) || "+00:00";
  return Date.parse(demain + "T00:00:00" + decalage);
}

function echeanceBooster(data: { prochain: string | null; maintenant: string }) {
  if (!data.prochain) return null;
  const reste = Date.parse(data.prochain) - Date.parse(data.maintenant);
  return Number.isFinite(reste) && reste > 0 ? Date.now() + reste : null;
}

function tempsRestant(prochain: number) {
  const secondes = Math.max(0, Math.ceil((prochain - Date.now()) / 1000));
  return [Math.floor(secondes / 3600), Math.floor(secondes / 60) % 60, secondes % 60]
    .map(valeur => String(valeur).padStart(2, "0")).join(":");
}

function useGuideCartes(userId: string) {
  const { guide } = useGuideActif();
  const [revision, setRevision] = useState(0);
  const cle = userId + ":" + guide + ":" + revision;
  const [portrait, setPortrait] = useState<{ cle: string; choix: GuideId | null } | null>(null);
  const profil = portrait?.cle === cle ? portrait : null;
  useEffect(() => {
    let actif = true;
    void lireGuideCartes(userId)
      .then(choix => { if (actif) setPortrait({ cle, choix }); })
      .catch(() => { if (actif) setPortrait({ cle, choix: null }); });
    return () => { actif = false; };
  }, [cle, userId]);
  return { profil, verifier: () => setRevision(revision => revision + 1) };
}

const ordreRarete: Carte["rarete"][] = ["commune", "rare", "epique", "legendaire", "chromatique"];
const raretesCollection = [...ordreRarete].reverse();
function GrilleCollectionBoosters({ cartes, guide, onOuvrir }: { cartes: CarteDetenue[]; guide: GuideId; onOuvrir: (carte: CarteDetenue) => void }) {
  return <>{raretesCollection.map(rarete => {
    const groupe = cartes.filter(carte => carte.rarete === rarete);
    if (!groupe.length) return null;
    return <section key={rarete} className={styles.groupeCollection} aria-labelledby={"collection-" + rarete}>
      <h3 id={"collection-" + rarete}>{raretes[rarete]} <span>{groupe.length}</span></h3>
      <div className={styles.grille}>{groupe.map(carte =>
        <div key={carte.exercice} className={styles.carteGrille}>
          <CarteBooster carte={carte} guide={guide} onOuvrir={() => onOuvrir(carte)} />
          {carte.n > 1 && <span className={styles.fois}>×{carte.n}</span>}
        </div>
      )}</div>
    </section>;
  })}
  </>;
}

export function CollectionBoosters({ userId }: { userId: string }) {
  const { profil, verifier } = useGuideCartes(userId);
  const guide = profil?.choix;
  const [cartes, setCartes] = useState<CarteDetenue[] | null>(null);
  const [erreur, setErreur] = useState(false);
  useEffect(() => {
    const controle = new AbortController();
    void lireCollectionBoosters(createClient(), userId, controle.signal)
      .then(cartes => { if (!controle.signal.aborted) setCartes(cartes); })
      .catch(() => { if (!controle.signal.aborted) setErreur(true); });
    return () => controle.abort();
  }, [userId]);
  useEffect(() => {
    if (window.location.hash === "#cartes-exercices") {
      document.getElementById("cartes-exercices")?.scrollIntoView();
    }
  }, [userId]);
  return <section id="cartes-exercices" className={styles.collection}>
    <h2>Mes cartes d’exercices</h2>
    {erreur ? <p>Impossible de charger les cartes.</p> : !cartes ? <p>Chargement…</p> : !cartes.length ? <p>Ouvre ton premier booster pour commencer ta collection.</p> :
      !profil ? <p>Chargement de ton coach…</p> : !guide ? <p>Coach indisponible. <button type="button" onClick={verifier}>Réessayer</button></p> :
      <MaCollection cartes={cartes} image={carte => imageCarte(carte, guide)}
        parRarete={onOuvrir => <GrilleCollectionBoosters cartes={cartes} guide={guide} onOuvrir={onOuvrir} />} />}
  </section>;
}

export function CollectionBoostersProfil({ userId, pseudo }: { userId: string; pseudo: string }) {
  const [collection, setCollection] = useState<{ cartes: CarteDetenue[]; guide: GuideId | null } | null>(null);
  const [miennes, setMiennes] = useState<CarteDetenue[] | null>(null);
  const [erreur, setErreur] = useState(false);
  useEffect(() => {
    const controle = new AbortController();
    async function charger() {
      const client = createClient();
      const { data: { session } } = await client.auth.getSession();
      if (controle.signal.aborted) return;
      if (!session) throw new Error("Session indisponible");
      if (session.user.id !== userId) void lireCollectionBoosters(client, session.user.id, controle.signal)
        .then(m => { if (!controle.signal.aborted) setMiennes(m); }).catch(() => {});
      const reponse = await fetch("/api/boosters/collection?" + new URLSearchParams({ membre: userId }), {
        headers: { Authorization: `Bearer ${session.access_token}` },
        signal: controle.signal,
      });
      if (!reponse.ok) throw new Error("Collection indisponible");
      const resultat = await reponse.json();
      if (!controle.signal.aborted) setCollection(resultat);
    }
    void charger().catch(() => { if (!controle.signal.aborted) setErreur(true); });
    return () => controle.abort();
  }, [userId]);

  return <section className={styles.collection}>
    <h2>Ses cartes d’exercices</h2>
    {erreur ? <p>Impossible de charger ses cartes.</p> : !collection ? <p>Chargement…</p> :
      !collection.cartes.length ? <p>Aucune carte débloquée pour le moment.</p> :
      collection.guide ? <SaCollection cartes={collection.cartes.map(c => ({ ...c, n: c.n ?? 1 }))} miennes={miennes} pseudo={pseudo}
        image={carte => imageCarte(carte, collection.guide!)} /> :
      <ul>{collection.cartes.map(carte => <li key={carte.exercice + ":" + carte.rarete}>
        {mouvements[carte.exercice][0]} · {raretes[carte.rarete]}
      </li>)}</ul>}
  </section>;
}

export default function BoosterQuotidien({ userId, jour, onGain }: { userId: string; jour: string; onGain?: () => void }) {
  const { profil: portrait, verifier: verifierCoach } = useGuideCartes(userId);
  const coach = portrait?.choix ?? null;
  const [statut, setStatut] = useState<"chargement" | "pret" | "erreur">("chargement");
  const [revisionStatut, setRevisionStatut] = useState(0);
  const [illimite, setIllimite] = useState(false);
  const [cartes, setCartes] = useState<Carte[] | null>(null);
  const [prochain, setProchain] = useState<number | null>(null);
  // Réserve : jusqu’à 3 boosters gardés, un de plus toutes les 3 heures. null = ancienne cadence.
  const [stock, setStock] = useState<number | null>(null);
  const [compteRebours, setCompteRebours] = useState("");
  const [ancienneCadence, setAncienneCadence] = useState(false);
  const [modeScene, setModeScene] = useState<"ouverture" | "recap">("recap");
  const [tirageId, setTirageId] = useState(0);
  const [exemplaires, setExemplaires] = useState<number[] | null>(null);
  const [tailleAvant, setTailleAvant] = useState<number | null>(null);
  const [rectSachet, setRectSachet] = useState<DOMRect | null>(null);
  const collectionAvant = useRef<Promise<Map<string, number> | null> | null>(null);
  const [exp, setExp] = useState(0);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [sortie, setSortie] = useState<Carte[] | null>(null);
  const [essaiSachet, setEssaiSachet] = useState(0);
  const mouvementReduit = useReducedMotion();
  const [chancesOuvertes, setChancesOuvertes] = useState(false);
  const [chances, setChances] = useState<Record<string, number> | null>(null);
  const ouvrirChances = () => {
    setChancesOuvertes(true);
    void createClient().rpc("mes_chances_booster").then(({ data }) => { if (data) setChances(data as Record<string, number>); });
  };
  const dialog = useRef<HTMLDialogElement>(null);
  const actif = useRef(false);
  const tirageEnAttente = useRef<{ cartes: Carte[]; exp: number } | null>(null);
  const requeteOuverture = useRef<string | null>(null);
  const imagesDecodees = useRef<HTMLImageElement[]>([]);
  const [profil, setProfil] = useState<GuideId | null>(null);
  const [guideSachet, setGuideSachet] = useState<GuideId | null>(null);
  const [preparation, setPreparation] = useState(false);
  const [erreurCoach, setErreurCoach] = useState("");

  useEffect(() => {
    let vivant = true;
    const controle = new AbortController();
    async function charger() {
      const client = createClient();
      const [essai, apercu] = await Promise.all([
        demanderEssai("GET", controle.signal).catch(() => null),
        client.rpc("ouvrir_booster_exercices_v4").abortSignal(controle.signal),
      ]);
      if (!vivant) return;
      if (essai?.illimite) {
        setIllimite(true);
        setStatut("pret");
        return;
      }
      if (apercu.error?.code === "PGRST202") {
        const ancien = await client.rpc("ouvrir_booster_exercices_v2", { p_apercu: true }).abortSignal(controle.signal);
        if (!vivant) return;
        if (ancien.error) { setStatut("erreur"); return; }
        setAncienneCadence(true);
        setProchain(ancien.data ? prochainMinuit(jour) : null);
      } else {
        if (apercu.error || !apercu.data) { setStatut("erreur"); return; }
        setAncienneCadence(false);
        setProchain(echeanceBooster(apercu.data));
        setStock(typeof apercu.data.stock === "number" ? apercu.data.stock : null);
      }
      setIllimite(false);
      setStatut("pret");
    }
    void charger().catch(() => { if (vivant) setStatut("erreur"); });
    return () => { vivant = false; controle.abort(); };
  }, [jour, revisionStatut]);

  useEffect(() => {
    if (prochain === null || illimite) return;
    const echeance = prochain;
    const tick = () => {
      if (Date.now() >= echeance) {
        setProchain(null);
        setRevisionStatut(revision => revision + 1);
        setCompteRebours("");
      } else setCompteRebours(tempsRestant(echeance));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [prochain, illimite]);

  function reinitialiserScene() {
    actif.current = false;
    imagesDecodees.current = [];
    setCartes(null);
    setExp(0);
    setExemplaires(null);
    setTailleAvant(null);
    setErreur("");
    setProfil(null);
  }

  // Ce qu'on possède avant l'ouverture : c'est ce qui dira « Nouvelle » ou « ×N », et où en est la collection.
  function lireCollectionAvant() {
    collectionAvant.current = lireCollectionBoosters(createClient(), userId)
      .then(cartes => new Map(cartes.map(carte => [carte.exercice + ":" + carte.rarete, carte.n])))
      .catch(() => null);
  }

  function ouvrirSuivant() {
    lireCollectionAvant();
    reinitialiserScene();
    setEssaiSachet(essai => essai + 1);
  }

  async function preparerSachet() {
    if (preparation) return;
    setPreparation(true);
    setErreurCoach("");
    try {
      const guideConfirme = await lireGuideCartes(userId);
      if (!guideConfirme) {
        setErreurCoach("Choisis ton coach dans les paramètres pour ouvrir ton booster.");
        return;
      }
      if (guideConfirme !== coach) verifierCoach();
      // Ce qu'on possède avant l'ouverture : c'est ce qui dira quelles cartes sont « Nouvelle ».
      lireCollectionAvant();
      reinitialiserScene();
      setGuideSachet(guideConfirme);
      if (dialog.current && !dialog.current.open) dialog.current.showModal();
    } catch {
      setErreurCoach("Impossible de vérifier ton coach. Réessaie dans un instant.");
    } finally {
      setPreparation(false);
    }
  }

  async function ouvrir() {
    if (!guideSachet || actif.current || cartes) return;
    actif.current = true;
    retenirCelebration();
    setErreur("");
    setChargement(true);
    try {
      let tirage = tirageEnAttente.current;
      if (!tirage) {
        let nouvellesCartes: unknown;
        let gain = 0;
        requeteOuverture.current ??= crypto.randomUUID();
        if (illimite) {
          const resultat = await demanderEssai("POST", undefined, requeteOuverture.current);
          nouvellesCartes = resultat?.cartes;
          gain = resultat?.exp ?? 0;
        } else if (!ancienneCadence) {
          const { data, error } = await createClient().rpc("ouvrir_booster_exercices_v4", { p_requete: requeteOuverture.current });
          if (error || !data) throw new Error("Tirage indisponible");
          const echeance = echeanceBooster(data);
          setProchain(echeance);
          const reste = typeof data.stock === "number" ? data.stock : null;
          setStock(reste);
          if (!data.cartes && (reste === 0 || (reste === null && echeance))) {
            requeteOuverture.current = null;
            actif.current = false;
            libererCelebration();
            dialog.current?.close();
            return;
          }
          nouvellesCartes = data.cartes;
          gain = data.exp;
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
          setProchain(prochainMinuit(jour));
        }
        if (!Array.isArray(nouvellesCartes) || nouvellesCartes.length !== 3) throw new Error("Tirage indisponible");
        tirage = { cartes: nouvellesCartes as Carte[], exp: gain };
        tirageEnAttente.current = tirage;
      }
      imagesDecodees.current = await Promise.all(tirage.cartes.map(carte => decoderCarte(carte, guideSachet)));
      tirageEnAttente.current = null;
      requeteOuverture.current = null;
      const avant = await Promise.race([
        collectionAvant.current ?? Promise.resolve(null),
        new Promise<null>(resoudre => window.setTimeout(() => resoudre(null), 1500)),
      ]);
      const cartesTirees = tirage.cartes;
      setExemplaires(avant ? cartesTirees.map(carte => (avant.get(carte.exercice + ":" + carte.rarete) ?? 0) + 1) : null);
      setTailleAvant(avant ? avant.size : null);
      setRectSachet(dialog.current?.querySelector("[data-sachet]")?.getBoundingClientRect() ?? null);
      setModeScene("ouverture");
      setTirageId(id => id + 1);
      setProfil(guideSachet);
      setExp(tirage.exp);
      if (tirage.exp > 0) onGain?.();
      if (!mouvementReduit && dialog.current?.open) setSortie(cartesTirees);
      else setCartes(cartesTirees);
    } catch {
      libererCelebration();
      setErreur("Le booster est indisponible. Réessaie dans un instant.");
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

  useEffect(() => () => libererCelebration(), []);

  const tirageAffiche = profil ? sortie ?? cartes : null;
  return (
    <MotionConfig reducedMotion="user">
      <section className={styles.bloc} aria-label="Booster d’exercices"
        data-accueil-charge={statut !== "chargement" && portrait ? "oui" : "non"}>
        <div className={styles.miniature}><MiniSachetBooster guide={coach} /></div>
        <div className={styles.informations}>
          <h2>{illimite ? "Tes boosters d’essai" : ancienneCadence ? "Ton booster du jour" : "Ton booster"}</h2>
          <small>{illimite ? "Mode test · ouvertures illimitées" : "3 cartes d’exercices"}</small>
          <div className={styles.actionsAccueil}>
          <button type="button" className={styles.ouvrir}
            aria-busy={preparation}
            disabled={statut === "chargement" || !portrait || preparation || chargement || !!sortie || (!illimite && (stock !== null ? stock === 0 : prochain !== null))}
            onClick={() => {
              if (statut === "erreur") {
                setStatut("chargement");
                setRevisionStatut(revision => revision + 1);
                return;
              }
              // Pendant le geste : sur iPhone, c'est la seule façon de faire bouger le reflet avec le téléphone.
              demanderMouvementAppareil();
              void preparerSachet();
            }}>
            {statut === "erreur" || (portrait && !coach) ? "Réessayer" : "Ouvrir le booster"}
          </button>
          {!illimite && stock !== null && <small className={styles.reserve}>{stock} / 3 en réserve</small>}
          </div>
          {erreurCoach && <p role="alert">{erreurCoach}</p>}
        </div>
        {prochain !== null && !illimite && <div className={styles.prochain}><small>Prochain booster</small><strong>{compteRebours}</strong></div>}
      </section>
      <dialog ref={dialog} className={styles.dialog} onClose={() => { terminerChute(); libererCelebration(); }} aria-labelledby="titre-booster">
        <div className={styles.ecran} data-sortie={sortie ? "" : undefined}>
          {!cartes && <>
            <button type="button" className={styles.fermer} aria-label="Fermer" onClick={() => dialog.current?.close()}>×</button>
            <h2 id="titre-booster" aria-live="polite">{illimite ? "Booster d’essai" : ancienneCadence ? "Ton booster du jour" : "Ton booster"}</h2>
            {guideSachet && <SachetBooster key={essaiSachet + ":" + guideSachet} guide={guideSachet} rarete={sortie?.[2]?.rarete} ouvrir={() => { void ouvrir(); }}
              chargement={chargement || !!sortie} sortie={!!sortie} reveler={terminerChute} />}
            {!illimite && <p>{ancienneCadence ? "Prochain booster demain à minuit" : "Un booster de plus toutes les 3 h, jusqu’à 3 en réserve"}</p>}
            <button type="button" className={styles.chancesBouton} onClick={ouvrirChances}>Mes chances de rareté</button>
            {chancesOuvertes && <div className={styles.chancesFond} onClick={() => setChancesOuvertes(false)}>
              <div className={styles.chancesFiche} role="dialog" aria-label="Mes chances de rareté" onClick={e => e.stopPropagation()}>
                <button type="button" className={styles.chancesFermer} aria-label="Fermer" onClick={() => setChancesOuvertes(false)}>×</button>
                <h3>Ta meilleure carte</h3>
                <ul>
                  {([["rare", 60], ["epique", 30], ["legendaire", 9], ["chromatique", 1]] as const).map(([r, base]) => { const part = (Math.round((chances?.[r] ?? base) * 10) / 10).toLocaleString("fr-FR") + " %"; return (
                    <li key={r}>
                      <img src={`/boosters/cartes-completes-v1/${guideSachet ?? "sasha"}-squat-${r}.webp`} alt="" />
                      <span>{raretes[r]}</span><strong>{part}</strong>
                    </li>
                  ); })}
                </ul>
                <p>{chances?.affilee ? `Tu as eu ${chances.affilee === 1 ? "une rare" : chances.affilee + " rares"} d’affilée : tes chances montent.` : "Jamais de commune. Chaque rare d’affilée fait monter tes chances."}</p>
                <p>Et 0,5 % de chances de tomber sur un pack d’exception : trois cartes épiques ou mieux.</p>
              </div>
            </div>}
            {erreur && <p role="alert">{erreur}</p>}
          </>}
        </div>
        {tirageAffiche && profil && <OuvertureCartes key={tirageId} cartes={tirageAffiche}
          images={tirageAffiche.map(item => imageCarte(item, profil))}
          libelles={tirageAffiche.map(item => mouvements[item.exercice][0] + " · " + raretes[item.rarete])}
          exp={exp} exemplaires={exemplaires} mode={modeScene} sachet={rectSachet}
          onFermer={() => dialog.current?.close()}
          onRecap={libererCelebration}
          infos={<InfosFin cartes={tirageAffiche} exemplaires={exemplaires} avant={tailleAvant} />}
          actions={<>
            <ActionsFin stock={stock} illimite={illimite} prochainMs={prochain} compte={compteRebours}
              onSuivant={ouvrirSuivant} onCollection={() => dialog.current?.close()} />
            {erreurCoach && <p role="alert">{erreurCoach}</p>}
          </>} />}
      </dialog>
    </MotionConfig>
  );
}

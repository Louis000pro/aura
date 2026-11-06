"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as PE } from "react";
import { createPortal } from "react-dom";
import { useRetourTelephone } from "@/hooks/useRetourTelephone";
import { jouerFinSeance, jouerOuvertureCarte } from "@/lib/musiqueRang";
import { lockBodyModal } from "@/lib/bodyModal";
import { marquerOuverte } from "@/lib/cartes/appareil";
import type { CarteDef } from "@/lib/cartes/catalogue";
import type { CarteLive, PreparationCarte } from "@/lib/cartes/live";
import CarteVivante from "./CarteVivante";
import VignetteCarte from "./VignetteCarte";
import s from "./Cartes.module.css";

/**
 * LE GAIN D'UNE CARTE (maquette « Les cartes Vaiiya », étape 8). Une pochette
 * à déchirer du doigt, la carte sort de dos, un toucher la retourne avec un
 * éclair, des éclats et un accord.
 *
 * Pour les rangs, les relais et les programmes (décision de Louis) : une
 * flamme arrive toute seule, et le mouvement du jour garde son retournement
 * simple.
 *
 * ⚠️ `preparer` tourne dès l'arrivée de la pochette : l'ouverture ne doit
 * rien attendre. La déchirure se joue sur deux photos de la pochette, prises
 * dans le canvas juste avant de le rendre à la carte.
 * ⚠️ « Glisse ton doigt » est aussi un bouton : un geste n'est jamais la
 * seule façon d'ouvrir.
 * ⚠️ SANS MOTEUR (pas de WebGL2), pas de pochette : la carte se montre
 * directement, en image, et rien n'est perdu.
 */

type Etat = "poche" | "dos" | "fin";

function dentele() {
  const n = 28, h = 1.1;
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) pts.push(`${((i / n) * 100).toFixed(2)}% ${i % 2 ? 0 : h}%`);
  for (let i = n; i >= 0; i--) pts.push(`${((i / n) * 100).toFixed(2)}% ${i % 2 ? 100 : 100 - h}%`);
  return `polygon(${pts.join(",")})`;
}
const DENTELE = dentele();

const vibrer = (m: number | number[]) => { try { navigator.vibrate?.(m); } catch { /* refusé */ } };

/** Une tranche de la pochette, photographiée. */
function tranche(photo: HTMLCanvasElement, haut: boolean) {
  const t = document.createElement("div");
  t.className = s.tranche;
  const c = document.createElement("canvas");
  c.width = photo.width;
  c.height = photo.height;
  c.getContext("2d")?.drawImage(photo, 0, 0);
  t.append(c);
  t.style.clipPath = haut ? "polygon(0 0,100% 0,100% 11.7%,0 11.7%)" : "polygon(0 11.7%,100% 11.7%,100% 100%,0 100%)";
  return t;
}

/* Les éclats de la révélation. */
function eclats(cv: HTMLCanvasElement, zone: HTMLElement, lueur: string) {
  const b = cv.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = b.width * dpr;
  cv.height = b.height * dpr;
  const x = cv.getContext("2d");
  if (!x) return;
  x.scale(dpr, dpr);
  const z = zone.getBoundingClientRect();
  const cx = z.left - b.left + z.width / 2, cy = z.top - b.top + z.height / 2;
  const P = Array.from({ length: 90 }, (_, i) => {
    const a = Math.random() * 6.283, v = 2 + Math.random() * 7;
    return { x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.2, t: 0, d: 50 + Math.random() * 60, r: 1 + Math.random() * 2.4, or: i % 3 === 0 };
  });
  const pas = () => {
    x.clearRect(0, 0, b.width, b.height);
    let vivant = false;
    for (const p of P) {
      if (p.t > p.d) continue;
      vivant = true;
      p.t++;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.97;
      p.vy = p.vy * 0.97 + 0.05;
      x.globalAlpha = 1 - p.t / p.d;
      x.fillStyle = p.or ? "#FFF3CF" : lueur;
      x.save();
      x.translate(p.x, p.y);
      x.rotate(p.t * 0.08);
      const r = p.r * 2.2;
      x.beginPath();
      x.moveTo(0, -r);
      x.quadraticCurveTo(0, 0, r, 0);
      x.quadraticCurveTo(0, 0, 0, r);
      x.quadraticCurveTo(0, 0, -r, 0);
      x.quadraticCurveTo(0, 0, 0, -r);
      x.fill();
      x.restore();
    }
    if (vivant && cv.isConnected) requestAnimationFrame(pas);
    else x.clearRect(0, 0, b.width, b.height);
  };
  pas();
}

export default function GainCarte({
  carte,
  userId,
  onFermer,
  onCollection,
}: {
  carte: CarteDef;
  userId: string;
  onFermer: () => void;
  onCollection: () => void;
}) {
  const [etat, setEtat] = useState<Etat>("poche");
  const [sansMoteur, setSansMoteur] = useState(false);
  const [aide, setAide] = useState("Glisse ton doigt sur le haut de la pochette");
  const reduit = useRef(false);
  const racine = useRef<HTMLDivElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const support = useRef<HTMLDivElement>(null);
  const poche = useRef<HTMLDivElement>(null);
  const eclatsCv = useRef<HTMLCanvasElement>(null);
  const live = useRef<CarteLive | null>(null);
  const prep = useRef<Promise<PreparationCarte> | null>(null);
  const ouverte = useRef(false);
  const depart = useRef<number | null>(null);
  const part = useRef(0);
  const minuteurs = useRef<number[]>([]);

  useEffect(() => lockBodyModal(), []);
  useRetourTelephone(true, "gainCarte", onFermer);
  useEffect(() => {
    reduit.current = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const m = minuteurs.current;
    return () => m.forEach(clearTimeout);
  }, []);

  const direct = useCallback(() => {
    setSansMoteur(true);
    setEtat("fin");
    marquerOuverte(userId, carte.id);
  }, [userId, carte.id]);

  const surPret = useCallback((l: CarteLive | null) => {
    if (!l || !carte.pochette) { direct(); return; }
    live.current = l;
    void l.pochette(carte.pochette).then((ok) => {
      if (!ok) { direct(); return; }
      const p = l.preparer(carte);
      p.catch(() => {}); // l'échec se traite à l'ouverture
      prep.current = p;
    });
  }, [carte, direct]);

  const reveler = useCallback((l: CarteLive, p: PreparationCarte) => {
    l.onTap = () => l.retourner();
    l.reveler(p);
    setEtat("fin");
    setAide("");
    marquerOuverte(userId, carte.id);
    vibrer([40, 30, 70]);
    jouerFinSeance(carte.famille === "rangs" && carte.face.genre === "rang" ? carte.face.rang : "or");
    if (!reduit.current && eclatsCv.current && zone.current) eclats(eclatsCv.current, zone.current, carte.lueur);
  }, [userId, carte]);

  const ouvrir = useCallback(async () => {
    const l = live.current;
    if (ouverte.current || !l || !prep.current) return;
    ouverte.current = true;
    let p: PreparationCarte;
    try {
      p = await prep.current;
    } catch (e) {
      console.warn("[cartes] carte impossible à dessiner :", e);
      direct();
      return;
    }
    const po = poche.current, su = support.current;
    if (!po || !su) return;
    const photo = l.photographier();
    const tH = tranche(photo, true), tB = tranche(photo, false);
    po.dataset.ouverte = "";
    po.append(tB, tH);
    su.style.clipPath = "none";
    su.dataset.etat = "sous";
    l.sortirDeLaPochette(carte, p);
    tH.animate(
      [{ transform: "none", opacity: 1 }, { transform: "translate(64%,-60%) rotate(17deg)", opacity: 0 }],
      { duration: reduit.current ? 1 : 620, easing: "cubic-bezier(.3,.6,.3,1)", fill: "forwards" },
    );
    tB.animate(
      [{ transform: "none", opacity: 1, offset: 0 }, { transform: "translateY(10%)", opacity: 1, offset: 0.35 }, { transform: "translateY(112%)", opacity: 0, offset: 1 }],
      { duration: reduit.current ? 1 : 900, delay: reduit.current ? 0 : 120, easing: "cubic-bezier(.5,0,.8,.5)", fill: "forwards" },
    );
    jouerOuvertureCarte();
    vibrer(24);
    setEtat("dos");
    setAide("");
    const plus = (ms: number, fn: () => void) => { minuteurs.current.push(window.setTimeout(fn, ms)); };
    plus(reduit.current ? 0 : 760, () => { po.style.display = "none"; su.dataset.etat = "sort"; });
    plus(reduit.current ? 0 : 1800, () => { delete su.dataset.etat; });
    plus(reduit.current ? 0 : 950, () => setAide("Touche la carte pour la retourner"));
    l.onTap = () => reveler(l, p);
  }, [carte, direct, reveler]);

  const poser = (v: number) => {
    part.current = v;
    poche.current?.style.setProperty("--p", v.toFixed(3));
  };
  const appui = (e: PE<HTMLDivElement>) => {
    if (ouverte.current) return;
    depart.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.dataset.enCours = "";
  };
  const glisse = (e: PE<HTMLDivElement>) => {
    if (depart.current === null) return;
    const b = e.currentTarget.getBoundingClientRect();
    const v = Math.max(0, Math.min(1, Math.abs(e.clientX - depart.current) / (b.width * 0.9)));
    poser(v);
    if (v >= 1) void ouvrir();
  };
  const lache = (e: PE<HTMLDivElement>) => {
    if (depart.current === null) return;
    depart.current = null;
    delete e.currentTarget.dataset.enCours;
    if (part.current > 0.55) void ouvrir();
    else poser(0);
  };

  // Elle ne s'ouvre qu'après un geste : le serveur ne la rend jamais.
  if (typeof document === "undefined") return null;

  const rang = carte.famille === "rangs";
  return createPortal(
    <div
      ref={racine}
      className={s.gain}
      data-etat={etat}
      role="dialog"
      aria-modal="true"
      aria-label={`Carte ${carte.nom}`}
      style={{ "--lueur": carte.lueur } as CSSProperties}
    >
      <div className={s.gFond} />
      <div className={s.gRayons} />
      <canvas ref={eclatsCv} className={s.gEclats} aria-hidden="true" />
      <p className={s.gTitre}>{etat === "poche" ? "Une carte t’attend" : ""}</p>
      <div ref={zone} className={s.gZone}>
        {sansMoteur ? (
          <div className={s.support}><CarteVivante carte={carte} /></div>
        ) : (
          <div ref={support} className={s.support} data-etat="poche" style={{ clipPath: DENTELE }}>
            {/* La pochette est carrée : ses coins dépasseraient derrière la carte, arrondie. */}
            <CarteVivante surPret={surPret} onTap={null} toujoursVisible fond={etat === "poche" ? <VignetteCarte carte={carte} scellee /> : undefined} />
          </div>
        )}
        {!sansMoteur && (
          <div
            ref={poche}
            className={s.poche}
            onPointerDown={appui}
            onPointerMove={glisse}
            onPointerUp={lache}
            onPointerCancel={lache}
          >
            <div className={s.indice} />
            <div className={s.fente}><i /></div>
          </div>
        )}
      </div>
      {etat === "poche" ? (
        <button type="button" className={s.gAide} onClick={() => void ouvrir()}>{aide}</button>
      ) : etat === "dos" ? (
        <p className={s.gAide} aria-live="polite">{aide}</p>
      ) : null}
      {etat === "fin" && (
        <div className={s.gFin}>
          <h3>Carte {carte.nom}</h3>
          <p>{rang ? `Rang ${carte.place} sur ${carte.surTotal}, gravée à ton nom` : carte.sous}</p>
          <button type="button" className={s.bouton} onClick={onCollection}>Voir ma collection</button>
          <button type="button" className={s.lien} onClick={onFermer}>Continuer</button>
        </div>
      )}
    </div>,
    document.body,
  );
}

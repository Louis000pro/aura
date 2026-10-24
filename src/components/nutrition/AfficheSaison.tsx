"use client";

/* ════════════════════════════════════════════════════════════════════
   L'affiche de saison, entre « Une idée » et « Trouver une recette »
   (lib/momentsSaison ; maquette « La saison, en décor », niveau 2, en
   clair et en sombre, Louis, 2026-10-24).

   Sur le téléphone, elle prend toute la largeur : sa lumière naît et
   s'éteint dans le fond de la page. Quatre produits de la saison se
   posent sur le haut du mot, et le motif du moment bouge derrière le
   texte et derrière les photos, jamais par-dessus. Sur ordinateur, c'est
   un bloc arrondi.

   ⚠️ LE MOT SE MESURE, comme `useMotAjuste` : « Barbecue » ou « Agrumes »
   ne tiennent pas à 76 px sur un téléphone, donc la taille descend
   jusqu'à ce que la ligne la plus large tienne.

   ⚠️ LE DÉCOR S'ARRÊTE quand le téléphone demande moins de mouvement et
   sur un appareil modeste (`perf-lite`) : les feuilles et les flocons
   restent posés, le soleil ne tourne plus, la guirlande ne scintille plus.

   ⚠️ LES COULEURS VIVENT DANS LE MODULE CSS, une classe par moment, en
   clair et en sombre. Le violet reste l'action (« Voir les recettes ») et
   aucun décor n'utilise l'or saturé : il dit Vaiiya+.
   ════════════════════════════════════════════════════════════════════ */

import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
import type { Recipe } from "@/lib/recipeBank";
import { dureeRecette } from "@/lib/collectionsRecettes";
import { imageProduit, type MomentActif } from "@/lib/momentsSaison";
import MarqueFavori from "@/components/nutrition/MarqueFavori";
import s from "@/components/nutrition/AfficheSaison.module.css";

const TAILLE_MOT = 76;

/* La ligne la plus large du mot, posée à 100 px et mesurée : la taille la
   fait tenir dans la largeur, sans jamais dépasser `plafond`. Relu quand
   l'affiche change de largeur et quand la police arrive. */
function useTitreAjuste(lignes: string[], plafond: number) {
  const boite = useRef<HTMLDivElement>(null);
  const mesure = useRef<HTMLSpanElement>(null);
  const [taille, setTaille] = useState(0);
  const cle = lignes.join("|");
  useLayoutEffect(() => {
    const b = boite.current, m = mesure.current;
    if (!b || !m) return;
    const ajuster = () => {
      const large = Math.max(0, ...Array.from(m.children, (c) => c.getBoundingClientRect().width));
      if (!large) return;
      setTaille(Math.min(plafond, Math.floor((100 * b.clientWidth) / large * 0.98)));
    };
    ajuster();
    const ro = new ResizeObserver(ajuster);
    ro.observe(b);
    document.fonts?.ready.then(ajuster).catch(() => {});
    return () => ro.disconnect();
  }, [cle, plafond]);
  return { boite, mesure, taille };
}

/* ── Les motifs ─────────────────────────────────────────────────────── */

const CHENE = "M12 1Q17.5 4.5 14.2 8Q20 10.5 15 13.6Q21 17 15.2 19.6Q18.6 23.4 13.6 25.4L12.6 26.6L12.6 33L11.4 33L11.4 26.6L10.4 25.4Q5.4 23.4 8.8 19.6Q3 17 9 13.6Q4 10.5 9.8 8Q6.5 4.5 12 1Z";
const HETRE = "M4 20C4 10 10 4 20 4C20 14 14 20 4 20Z";

/* `x` en pourcentage de la largeur ; `y` et `r`, la place d'une feuille
   posée quand le décor ne bouge pas : à gauche entre le surtitre et le mot,
   au bas de l'affiche, ou cachée derrière une photo, jamais sur un texte. */
const FEUILLES = [
  { x: 5, taille: 17, chute: 16, delai: -3, balance: 3.4, bdelai: -1.2, y: 140, r: -24, chene: true, teinte: 1 },
  { x: 29, taille: 15, chute: 18, delai: -11, balance: 2.9, bdelai: -0.4, y: 650, r: 40, chene: false, teinte: 2 },
  { x: 48, taille: 21, chute: 14, delai: -6, balance: 3.8, bdelai: -2, y: 620, r: 18, chene: true, teinte: 3 },
  { x: 69, taille: 18, chute: 17, delai: -14, balance: 3.1, bdelai: -1.6, y: 630, r: -30, chene: false, teinte: 4 },
  { x: 82, taille: 16, chute: 15, delai: -8, balance: 3.6, bdelai: -0.8, y: 430, r: 30, chene: true, teinte: 5 },
  { x: 92, taille: 14, chute: 13, delai: -1, balance: 2.7, bdelai: -2.2, y: 120, r: 12, chene: false, teinte: 6 },
];

function Feuilles() {
  return (
    <div className={s.chutes} aria-hidden>
      {FEUILLES.map((f, i) => (
        <span key={i} className={s.chute}
          style={{ left: `${f.x}%`, animationDuration: `${f.chute}s`, animationDelay: `${f.delai}s`, "--y": `${f.y}px` } as CSSProperties}>
          <svg viewBox={f.chene ? "0 0 24 34" : "0 0 24 24"} className={`${s.feuille} ${s[`teinte${f.teinte}`]}`}
            style={{ width: f.taille, animationDuration: `${f.balance}s`, animationDelay: `${f.bdelai}s`, "--r": `${f.r}deg` } as CSSProperties}>
            <path d={f.chene ? CHENE : HETRE} />
            <path d={f.chene ? "M12 4V26" : "M4 20L16 8"} className={s.nervure} />
          </svg>
        </span>
      ))}
    </div>
  );
}

const FLOCONS = [
  { x: 6, taille: 12, chute: 20, delai: -4, tourne: 5.2, tdelai: -1.4, y: 140, r: 20 },
  { x: 23, taille: 9, chute: 24, delai: -15, tourne: 4.6, tdelai: -0.6, y: 520, r: -30 },
  { x: 38, taille: 15, chute: 18, delai: -9, tourne: 5.8, tdelai: -2.2, y: 100, r: 10 },
  { x: 55, taille: 11, chute: 22, delai: -2, tourne: 4.9, tdelai: -3.1, y: 720, r: 45 },
  { x: 67, taille: 16, chute: 19, delai: -12, tourne: 6.2, tdelai: -0.9, y: 700, r: -15 },
  { x: 82, taille: 10, chute: 25, delai: -18, tourne: 4.4, tdelai: -2.6, y: 420, r: 35 },
  { x: 93, taille: 13, chute: 21, delai: -7, tourne: 5.5, tdelai: -1.8, y: 80, r: -40 },
];
const BRAS = "M12 12V2.6M9.7 4.9 12 7.2l2.3-2.3";
const ANGLES = [0, 60, 120, 180, 240, 300];

function Neige() {
  return (
    <div className={s.chutes} aria-hidden>
      {FLOCONS.map((f, i) => (
        <span key={i} className={`${s.chute} ${s.lente}`}
          style={{ left: `${f.x}%`, animationDuration: `${f.chute}s`, animationDelay: `${f.delai}s`, "--y": `${f.y}px` } as CSSProperties}>
          <svg viewBox="0 0 24 24" className={s.flocon}
            style={{ width: f.taille, animationDuration: `${f.tourne}s`, animationDelay: `${f.tdelai}s`, "--r": `${f.r}deg` } as CSSProperties}>
            <g className={s.floconOmbre}>{ANGLES.map((a) => <path key={a} d={BRAS} transform={a ? `rotate(${a} 12 12)` : undefined} />)}</g>
            <g className={s.floconTrait}>{ANGLES.map((a) => <path key={a} d={BRAS} transform={a ? `rotate(${a} 12 12)` : undefined} />)}</g>
          </svg>
        </span>
      ))}
    </div>
  );
}

/* La guirlande suit la courbe M-10 6 Q195 64 400 6 d'une affiche de 390 px :
   x = -10 + 410 t et y = 6 + 116 t (1 - t). Les ampoules se placent en
   pourcentage, donc elles suivent le fil quand l'affiche s'élargit. */
const AMPOULES = Array.from({ length: 11 }, (_, k) => {
  const t = 0.05 + k * 0.09;
  return {
    x: ((-10 + 410 * t) / 390) * 100,
    y: 6 + 116 * t * (1 - t),
    teinte: k % 5,
    delai: (k * 0.7) % 2.6,
    duree: 2.2 + (k % 3) * 0.5,
  };
});

function Guirlande() {
  return (
    <div className={s.guirlande} aria-hidden>
      <svg viewBox="0 0 390 64" preserveAspectRatio="none" className={s.fil}>
        <path d="M-10 6 Q195 64 400 6" vectorEffect="non-scaling-stroke" />
      </svg>
      {AMPOULES.map((a, k) => (
        <span key={k} className={`${s.ampoule} ${s[`lampe${a.teinte}`]}`}
          style={{ left: `${a.x.toFixed(2)}%`, top: a.y + 3.5, animationDelay: `-${a.delai.toFixed(1)}s`, animationDuration: `${a.duree.toFixed(1)}s` }} />
      ))}
    </div>
  );
}

function Vapeur() {
  return (
    <svg viewBox="0 0 110 92" className={s.vapeur} aria-hidden>
      <path d="M22 90 C12 77 32 66 22 53 C12 40 30 31 22 18" />
      <path className={s.v2} d="M55 90 C45 77 65 66 55 53 C45 40 63 31 55 18" />
      <path className={s.v3} d="M88 90 C78 77 98 66 88 53 C78 40 96 31 88 18" />
    </svg>
  );
}

function Soleil() {
  return (
    <div className={s.soleil} aria-hidden>
      <div className={s.rayons} />
      <div className={s.disque} />
    </div>
  );
}

/* ── L'affiche ──────────────────────────────────────────────────────── */

export default function AfficheSaison({ actif, estFavori, onOuvrir, onVoirTout }: {
  actif: MomentActif;
  /** Un petit cœur sur la photo d'une recette favorite. */
  estFavori: (id: string) => boolean;
  onOuvrir: (r: Recipe, liste: Recipe[]) => void;
  onVoirTout: () => void;
}) {
  const { moment, recettes, surtitre, phrase } = actif;
  const lignes = moment.titre.split(" ");
  const { boite, mesure, taille } = useTitreAjuste(lignes, TAILLE_MOT);
  const idTitre = useId();

  return (
    <section aria-labelledby={idTitre}
      className={`${s.affiche} ${s[moment.id]} ${moment.motif === "guirlande" ? s.avecGuirlande : ""}`}>
      {moment.motif === "feuilles" && <Feuilles />}
      {moment.motif === "neige" && <Neige />}
      {moment.motif === "guirlande" && <Guirlande />}

      <div className={s.tete}>
        {moment.motif === "soleil" && <Soleil />}
        <span className={s.surtitre}>{surtitre}</span>
        {moment.vapeur && <Vapeur />}
        <div className={s.nature} aria-hidden>
          {moment.produits.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.nom} src={imageProduit(p.nom)} alt="" decoding="async" className={s.produit}
              style={{ left: p.x, top: p.y, width: p.taille, height: p.taille, transform: p.angle ? `rotate(${p.angle}deg)` : undefined }} />
          ))}
        </div>
      </div>

      {/* La largeur utile, mesurée : le mot vit dedans et n'en sort pas. */}
      <div ref={boite} className={s.titreBoite}>
        <span ref={mesure} aria-hidden className={`${s.mot} ${s.mesure}`}>
          {lignes.map((l, i) => <span key={i}>{l}</span>)}
        </span>
        <h2 id={idTitre} className={`${s.mot} ${s.titre}`} style={taille ? { fontSize: taille } : { opacity: 0 }}>
          {lignes.map((l, i) => <span key={i} className={s.ligne}>{i > 0 ? " " : ""}{l}</span>)}
        </h2>
      </div>
      <p className={s.phrase}>{phrase}</p>

      <div className={s.rail}>
        {recettes.map((r) => (
          <button key={r.id} type="button" onClick={() => onOuvrir(r, recettes)} className={s.recette}>
            <span className={s.photoBoite}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.image} alt="" loading="lazy" decoding="async" className={s.photo} />
              {estFavori(r.id) && <MarqueFavori taille={28} ecart={8} />}
            </span>
            <span className={s.nom}>{r.nom}</span>
            <span className={s.duree}>{dureeRecette(r)}</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={onVoirTout} className={s.lien}>
        Voir les {recettes.length}&nbsp;recettes
        <ChevronRight size={15} strokeWidth={2.3} aria-hidden />
      </button>
    </section>
  );
}

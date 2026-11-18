"use client";

// La collection des cartes d'exercices sur le profil (maquette validée par Louis le 2026-11-18) :
// où on en est (N sur 115), une vitrine des trois plus belles cartes, puis l'album (chaque mouvement
// dans ses cinq raretés, les emplacements vides en pointillés), le rangement par rareté et
// le classement des collectionneurs. Violet et or, jamais de vert.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { mouvements, raretes, type Carte } from "@/lib/cartesBooster";
import {
  lireClassement, pointsCollection, cleCarte, TOTAL_CARTES, ORDRE_RARETES,
  type CarteDetenue, type Collectionneur,
} from "@/lib/collectionBoosters";
import VisionneuseCarte from "./VisionneuseCarte";
import QuiLaCarte, { Visage } from "./QuiLaCarte";
import styles from "./Collectionneurs.module.css";

type Onglet = "album" | "rarete" | "collectionneurs";
const trier = new Intl.Collator("fr");
const ordreMouvements = (Object.keys(mouvements) as Carte["exercice"][])
  .sort((a, b) => trier.compare(mouvements[a][0], mouvements[b][0]));
const LETTRE: Record<Carte["rarete"], string> = { commune: "C", rare: "R", epique: "É", legendaire: "L", chromatique: "Ch" };
const COURT: Record<Carte["rarete"], string> = { commune: "Commune", rare: "Rare", epique: "Épique", legendaire: "Légend.", chromatique: "Chroma." };
const ordinal = (n: number) => n === 1 ? "1re" : n + "e";

export function Point({ rarete }: { rarete: Carte["rarete"] }) {
  return <span className={styles.point} data-rarete={rarete} aria-hidden="true" />;
}

/** Les trois plus belles : la rareté d'abord, puis les doublons. */
const vitrine = (cartes: CarteDetenue[]) => [...cartes]
  .sort((a, b) => ORDRE_RARETES.indexOf(b.rarete) - ORDRE_RARETES.indexOf(a.rarete) || b.n - a.n)
  .slice(0, 3);

export function Anneau({ part, children }: { part: number; children: ReactNode }) {
  return <span className={styles.anneau} style={{ background: `conic-gradient(#8b5cf6 0 ${part * 100}%, #eee8f6 ${part * 100}% 100%)` }}>
    <span>{children}</span>
  </span>;
}

export function EnTeteCollection({ cartes, ligne }: { cartes: CarteDetenue[]; ligne: ReactNode }) {
  const part = cartes.length / TOTAL_CARTES;
  return <div className={styles.bloc}>
    <div className={styles.gros}>
      <Anneau part={part}><span className="vy-nombre">{Math.round(part * 100)} %</span></Anneau>
      <div><b><span className="vy-nombre">{cartes.length}</span> {cartes.length > 1 ? "cartes" : "carte"} sur <span className="vy-nombre">{TOTAL_CARTES}</span></b><span>{ligne}</span></div>
    </div>
    <div className={styles.raretes}>
      {[...ORDRE_RARETES].map(r => <div key={r}><Point rarete={r} /><b className="vy-nombre">{cartes.filter(c => c.rarete === r).length}</b>{COURT[r]}</div>)}
    </div>
  </div>;
}

function Vignette({ carte, image, n, onOuvrir }: { carte: Carte; image: string; n?: number; onOuvrir: () => void }) {
  return <button type="button" className={styles.vignette} data-rarete={carte.rarete} onClick={onOuvrir}
    aria-label={mouvements[carte.exercice][0] + ", " + raretes[carte.rarete] + (n && n > 1 ? ", " + n + " exemplaires" : "")}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={image} alt="" loading="lazy" draggable={false} />
    {n && n > 1 ? <span className={styles.fois + " vy-nombre"}>×{n}</span> : null}
  </button>;
}

export function Vitrine({ cartes, image, onOuvrir, titre }: { cartes: CarteDetenue[]; image: (c: Carte) => string; onOuvrir: (c: CarteDetenue) => void; titre: string }) {
  const trois = vitrine(cartes);
  if (!trois.length) return null;
  return <div className={styles.bloc}>
    <p className={styles.etiquette}>{titre}</p>
    <div className={styles.vitrine}>{trois.map(c => <Vignette key={cleCarte(c)} carte={c} image={image(c)} onOuvrir={() => onOuvrir(c)} />)}</div>
  </div>;
}

function Album({ cartes, image, onOuvrir }: { cartes: CarteDetenue[]; image: (c: Carte) => string; onOuvrir: (c: CarteDetenue) => void }) {
  const parCle = useMemo(() => new Map(cartes.map(c => [cleCarte(c), c])), [cartes]);
  return <div className={styles.bloc}>
    <div className={styles.albumTete} aria-hidden="true"><span />{ORDRE_RARETES.map(r => <span key={r}>{LETTRE[r]}</span>)}</div>
    <div className={styles.album}>
      {ordreMouvements.map(m => <div key={m} className={styles.ligneAlbum}>
        <span className={styles.nomMouvement}>{mouvements[m][0]}</span>
        {ORDRE_RARETES.map(r => {
          const c = parCle.get(m + ":" + r);
          return c ? <Vignette key={r} carte={c} image={image(c)} n={c.n} onOuvrir={() => onOuvrir(c)} />
            : <span key={r} className={styles.vide} aria-label={mouvements[m][0] + ", " + raretes[r] + " : pas encore"} />;
        })}
      </div>)}
    </div>
  </div>;
}

function MiniRaretes({ l }: { l: Collectionneur }) {
  const liste = [...ORDRE_RARETES].reverse().filter(r => l[r] > 0).slice(0, 3);
  return <span className={styles.mini}>{liste.map(r => <i key={r}><Point rarete={r} /><span className="vy-nombre">{l[r]}</span></i>)}</span>;
}

export function Classement({ portee: porteeDepart = "tous" }: { portee?: "amis" | "tous" }) {
  const [portee, setPortee] = useState(porteeDepart);
  const [donnees, setDonnees] = useState<{ portee: string; liste: Collectionneur[] | null } | null>(null);
  const [limite, setLimite] = useState(50);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controle = new AbortController();
    void lireClassement(createClient(), portee, controle.signal)
      .then(liste => { if (!controle.signal.aborted) setDonnees({ portee, liste }); });
    return () => controle.abort();
  }, [portee, revision]);
  const liste = donnees?.portee === portee ? donnees.liste : undefined;
  return <div className={styles.bloc}>
    <div className={styles.selecteur} role="tablist">
      {(["amis", "tous"] as const).map(p => <button key={p} type="button" role="tab" aria-selected={portee === p}
        onClick={() => { setPortee(p); setLimite(50); }}>{p === "amis" ? "Amis" : "Tout Vaiiya"}</button>)}
    </div>
    {liste === undefined ? <p className={styles.note}>Chargement…</p> : liste === null ? <p className={styles.note}>Le classement n’est pas disponible pour le moment. <button type="button" onClick={() => { setDonnees(null); setRevision(r => r + 1); }}>Réessayer</button></p> :
      !liste.length ? <p className={styles.note}>Personne n’a encore de carte ici.</p> : <ol className={styles.classement}>
        {liste.slice(0, limite).concat(liste.slice(limite).filter(l => l.moi)).map((l, k, affichees) => {
          const coupe = k > 0 && l.rang > affichees[k - 1].rang + 1;
          const contenu = <>
            <span className={styles.rangNum + " vy-nombre"}>{l.rang}</span>
            <Visage pseudo={l.pseudo} avatar={l.avatar_url} />
            <span className={styles.qui}>{l.moi ? <b>Toi</b> : l.pseudo ?? "Un membre"}<MiniRaretes l={l} /></span>
            <span className={styles.score}><span className="vy-nombre">{l.points} pts</span><small>{l.cartes} {l.cartes > 1 ? "cartes" : "carte"}</small></span>
          </>;
          return <li key={l.user_id} data-moi={l.moi ? "" : undefined} data-coupe={coupe ? "" : undefined}>
            {l.moi || !l.pseudo ? <div className={styles.rangee}>{contenu}</div>
              : <Link className={styles.rangee} href={"/profil/" + encodeURIComponent(l.pseudo)}>{contenu}</Link>}
          </li>;
        })}
      </ol>}
    {portee === "amis" && liste && liste.length > limite && <button type="button" className={styles.voirPlus} onClick={() => setLimite(n => n + 50)}>Voir plus de membres</button>}
    <p className={styles.note}>Commune 1 · rare 2 · épique 5 · légendaire 10 · chromatique 25. Les doublons ne comptent pas.</p>
  </div>;
}

/** La carte en grand, avec « Qui l'a » dessous. */
export function CarteEnGrand({ carte, image, onFermer }: { carte: Carte; image: string; onFermer: () => void }) {
  const [quiLa, setQuiLa] = useState(false);
  return <>
    <VisionneuseCarte src={image} rarete={carte.rarete} nom={mouvements[carte.exercice][0]} libelleRarete={raretes[carte.rarete]}
      alt={mouvements[carte.exercice][0] + ", " + raretes[carte.rarete]} onFermer={onFermer}
      bas={<button type="button" className={styles.quiLa} onClick={() => setQuiLa(true)}>Qui l’a ›</button>} />
    {quiLa && <QuiLaCarte carte={carte} onFermer={() => setQuiLa(false)} />}
  </>;
}

/** Ma collection : en-tête, vitrine, puis Album / Par rareté / Les collectionneurs. */
export function MaCollection({ cartes, image, parRarete }: {
  cartes: CarteDetenue[];
  image: (c: Carte) => string;
  parRarete: (onOuvrir: (c: CarteDetenue) => void) => ReactNode;
}) {
  const [onglet, setOnglet] = useState<Onglet>("album");
  const [enGrand, setEnGrand] = useState<CarteDetenue | null>(null);
  const [place, setPlace] = useState<{ rang: number; amis: number; points: number } | null>(null);
  useEffect(() => {
    const controle = new AbortController();
    void lireClassement(createClient(), "amis", controle.signal).then(liste => {
      const moi = liste?.find(l => l.moi);
      if (!controle.signal.aborted && moi) setPlace({ rang: moi.rang, amis: liste!.length, points: moi.points });
    });
    return () => controle.abort();
  }, []);
  const points = place?.points ?? pointsCollection(cartes);
  const ligne = place && place.amis > 1 ? <>{ordinal(place.rang)} place chez tes amis · <span className="vy-nombre">{points}</span> points</> : <><span className="vy-nombre">{points}</span> points</>;
  return <>
    <EnTeteCollection cartes={cartes} ligne={ligne} />
    <Vitrine titre="Ma vitrine" cartes={cartes} image={image} onOuvrir={setEnGrand} />
    <div className={styles.onglets} role="tablist">
      {([["album", "Album"], ["rarete", "Par rareté"], ["collectionneurs", "Les collectionneurs"]] as const).map(([id, nom]) =>
        <button key={id} type="button" role="tab" aria-selected={onglet === id} onClick={() => setOnglet(id)}>{nom}</button>)}
    </div>
    {onglet === "album" && <Album cartes={cartes} image={image} onOuvrir={setEnGrand} />}
    {onglet === "rarete" && parRarete(setEnGrand)}
    {onglet === "collectionneurs" && <Classement />}
    {enGrand && <CarteEnGrand carte={enGrand} image={image(enGrand)} onFermer={() => setEnGrand(null)} />}
  </>;
}

/** La collection d'un autre membre : où il en est, vous deux, ce qu'il a que tu n'as pas, sa vitrine. */
export function SaCollection({ cartes, image, miennes, pseudo }: {
  cartes: CarteDetenue[];
  image: (c: Carte) => string;
  /** Ma collection, null si je regarde ou si elle ne se lit pas. */
  miennes: CarteDetenue[] | null;
  pseudo: string;
}) {
  const [enGrand, setEnGrand] = useState<CarteDetenue | null>(null);
  const [tout, setTout] = useState(false);
  const mesCles = useMemo(() => new Set((miennes ?? []).map(cleCarte)), [miennes]);
  const manquantes = useMemo(() => !miennes ? [] : cartes.filter(c => !mesCles.has(cleCarte(c)))
    .sort((x, y) => ORDRE_RARETES.indexOf(y.rarete) - ORDRE_RARETES.indexOf(x.rarete)), [cartes, miennes, mesCles]);
  const max = Math.max(cartes.length, miennes?.length ?? 0, 1);
  return <>
    <EnTeteCollection cartes={cartes} ligne={<><span className="vy-nombre">{pointsCollection(cartes)}</span> points</>} />
    {miennes && <div className={styles.bloc}>
      <p className={styles.etiquette}>Vous deux</p>
      <div className={styles.barreDuo}><span>{pseudo}</span><span className={styles.piste}><i style={{ width: cartes.length / max * 100 + "%" }} /></span><b className="vy-nombre">{cartes.length}</b></div>
      <div className={styles.barreDuo} data-moi=""><span>Toi</span><span className={styles.piste}><i style={{ width: miennes.length / max * 100 + "%" }} /></span><b className="vy-nombre">{miennes.length}</b></div>
    </div>}
    {manquantes.length > 0 && <div className={styles.bloc}>
      <p className={styles.etiquette}>Ce qu’il te manque de sa collection{manquantes.length > 4 && !tout && <button type="button" onClick={() => setTout(true)}>et {manquantes.length - 4} autres</button>}</p>
      <div className={styles.manquantes}>{(tout ? manquantes : manquantes.slice(0, 4)).map(c =>
        <Vignette key={cleCarte(c)} carte={c} image={image(c)} onOuvrir={() => setEnGrand(c)} />)}</div>
    </div>}
    <Vitrine titre="Sa vitrine" cartes={cartes} image={image} onOuvrir={setEnGrand} />
    {enGrand && <CarteEnGrand carte={enGrand} image={image(enGrand)} onFermer={() => setEnGrand(null)} />}
  </>;
}

"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft } from "lucide-react";
import { useRetourTelephone } from "@/hooks/useRetourTelephone";
import { lockBodyModal } from "@/lib/bodyModal";
import { compterGagnees, toutes, type CarteDef, type Collection } from "@/lib/cartes/catalogue";
import { cartesMouvements } from "@/lib/cartes/mouvements";
import { lireCarnet } from "@/lib/mouvementDuJour";
import VignetteCarte from "./VignetteCarte";
import s from "./Cartes.module.css";

/**
 * LA COLLECTION (maquette « Les cartes Vaiiya », étape 11). Chaque famille a
 * sa forme : un classeur pour les rangs, un éventail pour les flammes, un
 * rail pour les programmes, un trio pour les relais, un carnet pour les
 * mouvements.
 *
 * ⚠️ CE QU'ON N'A PAS RESTE VISIBLE, ÉTEINT, AVEC SON NUMÉRO : aucun cadenas.
 * Une carte éteinte n'ouvre rien, sauf deux portes : un relais mène à
 * « Avec qui ? », un programme mène à la rangée qui les propose.
 * ⚠️ Toujours dans la nuit. Chargée à l'ouverture : elle embarque la
 * bibliothèque d'exercices, que le profil n'a pas à porter.
 */
function Case({ carte, attente, onVoir, porte, style }: {
  carte: CarteDef;
  attente: readonly string[];
  onVoir: (c: CarteDef) => void;
  porte?: () => void;
  style?: CSSProperties;
}) {
  const scellee = carte.gagnee && attente.includes(carte.id);
  const action = carte.gagnee ? () => onVoir(carte) : porte;
  return (
    <button
      type="button"
      className={s.case}
      style={style}
      data-eteinte={carte.gagnee ? undefined : ""}
      disabled={!action}
      onClick={action}
      aria-label={carte.gagnee ? (scellee ? `Ouvrir ta pochette ${carte.nom}` : carte.dit) : `${carte.nom}, ${carte.place} sur ${carte.surTotal}, pas encore gagnée`}
    >
      <VignetteCarte carte={carte} scellee={scellee} />
      {!carte.gagnee && <span className={`${s.place} vy-nombre`} aria-hidden="true">{carte.place}/{carte.surTotal}</span>}
    </button>
  );
}

export default function CollectionCartes({
  collection,
  userId,
  attente,
  onFermer,
  onVoir,
  onRelais,
  onProgrammes,
}: {
  collection: Collection;
  userId: string;
  attente: readonly string[];
  onFermer: () => void;
  onVoir: (c: CarteDef) => void;
  onRelais: () => void;
  onProgrammes: () => void;
}) {
  useEffect(() => lockBodyModal(), []);
  useRetourTelephone(true, "collectionCartes", onFermer);
  // Le carnet se lit à l'ouverture : il n'existe que sur cet appareil.
  const [mouvements] = useState(() => cartesMouvements(lireCarnet(userId)));

  // Elle ne s'ouvre qu'après un toucher : le serveur ne la rend jamais.
  if (typeof document === "undefined") return null;

  const nbMouvements = mouvements.filter((m) => m.gagnee).length;
  const gagnees = compterGagnees(collection) + nbMouvements;
  const total = toutes(collection).length + mouvements.length;
  const compte = (l: CarteDef[]) => `${l.filter((c) => c.gagnee).length}/${l.length}`;
  const rangsVus = collection.rangs.filter((c) => c.gagnee).length;
  const commun = { attente, onVoir };

  return createPortal(
    <div className={s.coll} role="dialog" aria-modal="true" aria-label="Ta collection">
      <div className={s.collCorps}>
        <button type="button" className={s.retour} onClick={onFermer} aria-label="Revenir au profil">
          <ArrowLeft size={22} strokeWidth={2.2} />
        </button>
        <h2>Ta collection</h2>
        <p className={s.compte}><b className="vy-nombre">{gagnees}</b> cartes sur <b className="vy-nombre">{total}</b></p>

        <section className={s.fam}>
          <header><h3>Les rangs</h3><span className="vy-nombre">{compte(collection.rangs)}</span></header>
          <div className={s.classeur}>
            {collection.rangs.map((c) => <div key={c.id} className={s.etuiClasseur}><Case carte={c} {...commun} /></div>)}
          </div>
          <div className={s.pano}>
            <i style={{ width: `${((collection.rangs.length - rangsVus) / collection.rangs.length) * 100}%` }} />
            <span>Le panorama</span>
          </div>
          <p className={s.note}>Les six cartes forment un seul paysage. Il se dévoile à chaque rang.</p>
        </section>

        <section className={s.fam}>
          <header><h3>Les flammes</h3><span className="vy-nombre">{compte(collection.flammes)}</span></header>
          <div className={s.eventail}>
            {collection.flammes.map((c, i) => (
              <Case key={c.id} carte={c} {...commun} style={{ "--i": i - 2, zIndex: 5 - Math.abs(i - 2) } as CSSProperties} />
            ))}
          </div>
        </section>

        <section className={s.fam}>
          <header><h3>Les programmes</h3><span className="vy-nombre">{compte(collection.programmes)}</span></header>
          <div className={s.fil}>
            {collection.programmes.map((c) => <Case key={c.id} carte={c} {...commun} porte={onProgrammes} />)}
          </div>
        </section>

        <section className={s.fam}>
          <header><h3>Les relais</h3><span className="vy-nombre">{compte(collection.relais)}</span></header>
          <div className={s.trio}>
            {collection.relais.map((c) => <Case key={c.id} carte={c} {...commun} porte={onRelais} />)}
          </div>
        </section>

        <section className={s.fam}>
          <header><h3>Les mouvements</h3><span className="vy-nombre">{nbMouvements}/{mouvements.length}</span></header>
          <div className={s.carnet}>
            {mouvements.map((c) => <Case key={c.id} carte={c} {...commun} />)}
          </div>
          <p className={s.note}>Une carte de plus chaque matin, dans le mot de ton Guide.</p>
        </section>
      </div>
    </div>,
    document.body,
  );
}

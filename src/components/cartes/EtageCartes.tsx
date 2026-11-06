"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useCollectionCompte } from "@/hooks/useCollectionCompte";
import { apresRetour } from "@/lib/cartes/appareil";
import { dateLongue, type CartesRang } from "@/lib/cartesRang";
import { compterGagnees, derniereCarte, toutes, totalCollection, vitrineDe, type CarteDef } from "@/lib/cartes/catalogue";
import VignetteCarte from "./VignetteCarte";
import VitrineCartes from "./VitrineCartes";
import s from "./Cartes.module.css";

/* Tout ce qui s'ouvre arrive à l'ouverture : le profil ne porte que des images. */
const CollectionCartes = dynamic(() => import("./CollectionCartes"), { ssr: false });
const FeuilleCarte = dynamic(() => import("./FeuilleCarte"), { ssr: false });
const GainCarte = dynamic(() => import("./GainCarte"), { ssr: false });

/**
 * LES CARTES SUR SON PROFIL : la vitrine, la pochette qui attend, la dernière
 * carte gagnée, puis l'entrée de la collection.
 *
 * Toucher une carte l'ouvre en grand, sauf si sa pochette attend : on la
 * déchire d'abord.
 */
export default function EtageCartes({
  userId,
  pseudo,
  rangId,
  serie,
  record,
  slugs,
  cartes,
  collectionOuverte,
  onCollection,
  onRelais,
}: {
  userId: string;
  pseudo: string;
  rangId: string;
  serie: number;
  record: number | null;
  slugs: ReadonlySet<string>;
  cartes: CartesRang | null;
  collectionOuverte: boolean;
  onCollection: (ouverte: boolean) => void;
  onRelais: () => void;
}) {
  const router = useRouter();
  const { collection, attente, carnet } = useCollectionCompte({ userId, pseudo, rangId, serie, record, slugs, cartes });
  const [feuille, setFeuille] = useState<CarteDef | null>(null);
  const [gain, setGain] = useState<CarteDef | null>(null);

  const enAttente = toutes(collection).filter((c) => c.gagnee && c.pochette && attente.includes(c.id));
  const voir = (c: CarteDef) => {
    if (enAttente.some((x) => x.id === c.id)) setGain(c);
    else setFeuille(c);
  };
  const derniere = derniereCarte(collection);
  const quand = dateLongue(derniere?.jour);
  const gagnees = compterGagnees(collection) + carnet;

  return (
    <div className="mb-8">
      <VitrineCartes titre="Ma vitrine" cartes={vitrineDe(collection, { combler: true })} scellees={attente} onVoir={voir} />

      <div className={s.groupeCartes}>
        {enAttente[0] && (
          <button type="button" className={`${s.ligneCarte} vy-filet`} onClick={() => setGain(enAttente[0])}>
            <span className={s.miniature}><VignetteCarte carte={enAttente[0]} scellee /></span>
            <span>
              <b>Une carte t’attend</b>
              <small>Déchire ta pochette {enAttente[0].nom}</small>
            </span>
            <ChevronRight size={18} strokeWidth={2} style={{ color: "var(--text-3)", marginLeft: "auto", flexShrink: 0 }} />
          </button>
        )}
        {derniere && !enAttente.some((c) => c.id === derniere.id) && (
          <button type="button" className={`${s.ligneCarte} vy-filet`} onClick={() => setFeuille(derniere)}>
            <span className={s.miniature}><VignetteCarte carte={derniere} /></span>
            <span>
              <b>Dernière carte : {derniere.nom}</b>
              {quand && <small>Gagnée le {quand}</small>}
            </span>
          </button>
        )}
        <button type="button" className={`${s.ligneCarte} vy-filet`} onClick={() => onCollection(true)}>
          <b>Ma collection</b>
          <span className={`${s.compteur} vy-nombre`}>{gagnees}/{totalCollection(collection)}</span>
          <ChevronRight size={18} strokeWidth={2} style={{ color: "var(--text-3)", flexShrink: 0 }} />
        </button>
      </div>

      {collectionOuverte && (
        <CollectionCartes
          collection={collection}
          userId={userId}
          attente={attente}
          onFermer={() => onCollection(false)}
          onVoir={voir}
          onRelais={() => { onCollection(false); apresRetour(onRelais); }}
          onProgrammes={() => { onCollection(false); apresRetour(() => router.push("/progression")); }}
        />
      )}
      {feuille && (
        <FeuilleCarte
          carte={feuille}
          rail={feuille.famille === "rangs" ? collection.rangs.filter((c) => c.gagnee) : undefined}
          onFermer={() => setFeuille(null)}
        />
      )}
      {gain && (
        <GainCarte
          carte={gain}
          userId={userId}
          onFermer={() => setGain(null)}
          onCollection={() => { setGain(null); apresRetour(() => onCollection(true)); }}
        />
      )}
    </div>
  );
}

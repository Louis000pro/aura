"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, X } from "lucide-react";
import { useRetourTelephone } from "@/hooks/useRetourTelephone";
import { lockBodyModal } from "@/lib/bodyModal";
import { PLACES_VITRINE, basculerChoix, choixPossibles, type Collection } from "@/lib/cartes/catalogue";
import VignetteCarte from "./VignetteCarte";
import s from "./Cartes.module.css";

/**
 * CHANGER SA VITRINE. Trois places en haut, les cartes gagnées en dessous :
 * un toucher pose une carte, un autre la retire. Toujours dans la nuit, comme
 * la collection.
 *
 * Rien ne s'écrit avant « Enregistrer ». Une place libre, Vaiiya la remplit,
 * et « Laisser Vaiiya choisir » lui rend les trois.
 */
export default function ChoixVitrine({
  collection,
  choix,
  attente,
  onEnregistrer,
  onFermer,
}: {
  collection: Collection;
  choix: readonly string[] | null;
  attente: readonly string[];
  /** Rend `false` si la base a refusé : la vue reste ouverte et le dit. */
  onEnregistrer: (choix: readonly string[]) => Promise<boolean>;
  onFermer: () => void;
}) {
  useEffect(() => lockBodyModal(), []);
  useRetourTelephone(true, "choixVitrine", onFermer);

  const familles = choixPossibles(collection);
  const parId = new Map(familles.flatMap((f) => f.cartes).map((c) => [c.id, c]));
  // Une carte qu'on ne peut pas montrer depuis cet appareil ne garde pas sa place.
  const [brouillon, setBrouillon] = useState(() => (choix ?? []).filter((id) => parId.has(id)).slice(0, PLACES_VITRINE));
  const [etat, setEtat] = useState<"libre" | "envoi" | "rate">("libre");

  // Elle ne s'ouvre qu'après un toucher : le serveur ne la rend jamais.
  if (typeof document === "undefined") return null;

  const basculer = (id: string) => {
    setBrouillon((b) => basculerChoix(b, id));
    setEtat("libre");
  };
  const enregistrer = async (liste: readonly string[]) => {
    setEtat("envoi");
    if (await onEnregistrer(liste)) onFermer();
    else setEtat("rate");
  };

  return createPortal(
    <div className={s.coll} role="dialog" aria-modal="true" aria-label="Changer ma vitrine">
      <div className={s.collCorps}>
        <button type="button" className={s.retour} onClick={onFermer} aria-label="Revenir au profil">
          <ArrowLeft size={22} strokeWidth={2.2} />
        </button>
        <h2>Ma vitrine</h2>
        <p className={s.compte}>Choisis les trois cartes que les autres voient sur ton profil.</p>

        <div className={s.places}>
          <ol>
            {Array.from({ length: PLACES_VITRINE }, (_, i) => {
              const carte = parId.get(brouillon[i]);
              if (!carte) return <li key={i} className={s.placeLibre}><span>Libre</span></li>;
              return (
                <li key={carte.id}>
                  <button type="button" className={s.case} onClick={() => basculer(carte.id)} aria-label={`Retirer ${carte.nom} de ta vitrine`}>
                    <VignetteCarte carte={carte} scellee={attente.includes(carte.id)} />
                    <span className={s.retirer} aria-hidden="true"><X size={14} strokeWidth={2.6} /></span>
                  </button>
                </li>
              );
            })}
          </ol>
          {brouillon.length < PLACES_VITRINE && <p>Les places libres, Vaiiya les remplit.</p>}
        </div>

        {familles.map((f) => (
          <section key={f.titre} className={s.fam}>
            <header><h3>{f.titre}</h3></header>
            <div className={s.trio}>
              {f.cartes.map((c) => {
                const n = brouillon.indexOf(c.id) + 1;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={s.case}
                    data-choisie={n > 0 ? "" : undefined}
                    aria-pressed={n > 0}
                    aria-label={n > 0 ? `${c.nom}, place ${n}` : c.nom}
                    onClick={() => basculer(c.id)}
                  >
                    <VignetteCarte carte={c} scellee={attente.includes(c.id)} />
                    {n > 0 && <span className={`${s.rangChoix} vy-nombre`} aria-hidden="true">{n}</span>}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <div className={s.barreChoix}>
          {etat === "rate" && <p role="alert">Ta vitrine n’a pas pu être enregistrée. Réessaie.</p>}
          <button type="button" className={s.bouton} disabled={etat === "envoi"} onClick={() => void enregistrer(brouillon)}>
            {etat === "envoi" ? "Enregistrement…" : "Enregistrer"}
          </button>
          {choix && (
            <button type="button" className={s.lien} disabled={etat === "envoi"} onClick={() => void enregistrer([])}>
              Laisser Vaiiya choisir
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

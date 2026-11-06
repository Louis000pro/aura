"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useRetourTelephone } from "@/hooks/useRetourTelephone";
import { jouerOuvertureCarte } from "@/lib/musiqueRang";
import { lockBodyModal } from "@/lib/bodyModal";
import type { CarteDef } from "@/lib/cartes/catalogue";
import CarteVivante from "./CarteVivante";
import VignetteCarte from "./VignetteCarte";
import s from "./Cartes.module.css";

/**
 * UNE CARTE EN GRAND. Toutes les familles passent par ici : on la penche du
 * doigt, on la retourne d'un toucher, et « Partager ma carte » envoie sa
 * story, une image 1080 × 1920 dessinée par le même moteur.
 *
 * Toujours dans la nuit : la carte porte sa propre lumière, et c'est là
 * qu'elle se voit. `rail` : les autres cartes de la famille, pour passer de
 * l'une à l'autre (les rangs). Sans `partage`, c'est la carte de quelqu'un
 * d'autre : on la regarde, on ne la partage pas à sa place.
 */
export default function FeuilleCarte({
  carte,
  rail,
  partage = true,
  onFermer,
}: {
  carte: CarteDef;
  rail?: readonly CarteDef[];
  partage?: boolean;
  onFermer: () => void;
}) {
  const [choix, setChoix] = useState<string>(carte.id);
  const actuelle = rail?.find((c) => c.id === choix) ?? carte;
  const [etat, setEtat] = useState<"repos" | "envoi" | "partagee" | "enregistree" | "erreur">("repos");
  const partager = useRef<HTMLButtonElement>(null);
  const revenir = useRef<HTMLButtonElement>(null);

  useEffect(() => lockBodyModal(), []);
  useRetourTelephone(true, "feuilleCarte", onFermer);

  // Une seule fois, même quand le mode strict rejoue les effets.
  const entree = useRef(false);
  useEffect(() => {
    if (entree.current) return;
    entree.current = true;
    jouerOuvertureCarte();
    (partager.current ?? revenir.current)?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onFermer]);

  // Elle ne s'ouvre qu'après un toucher : le serveur ne la rend jamais.
  if (typeof document === "undefined") return null;

  const envoyer = async () => {
    setEtat("envoi");
    const { partagerCarte } = await import("@/lib/carteShareExport");
    const r = await partagerCarte(actuelle);
    setEtat(r === "shared" ? "partagee" : r === "downloaded" ? "enregistree" : "erreur");
  };

  const aide = etat === "partagee" ? "Carte envoyée."
    : etat === "enregistree" ? "L’image est enregistrée sur ton appareil."
    : etat === "erreur" ? "La carte n’a pas pu se préparer. Réessaie."
    : "Bouge la carte du doigt. Touche-la pour la retourner.";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={actuelle.titre}
      className={s.feuille}
      style={{ "--lueur": actuelle.lueur } as CSSProperties}
    >
      <h2>{actuelle.titre}</h2>
      <p className={s.sous}>{actuelle.sous}</p>
      <div className={s.zoneFeuille}>
        <CarteVivante carte={actuelle} />
      </div>
      <p className={s.aide}>{aide}</p>
      {/* Ce que le dos écrit, pour qui ne le voit pas. */}
      <p className="sr-only">
        {actuelle.fiche.ligne}. {actuelle.fiche.faits.map(([v, l]) => `${v} ${l}`).join(", ")}
      </p>
      {rail && rail.length > 1 && (
        <div className={s.rail}>
          {rail.map((c) => (
            <button key={c.id} type="button" aria-label={c.nom} aria-pressed={c.id === actuelle.id} onClick={() => setChoix(c.id)}>
              <VignetteCarte carte={c} />
            </button>
          ))}
        </div>
      )}
      <div className={s.actions}>
        <button ref={revenir} type="button" className={s.lien} onClick={onFermer}>Revenir</button>
        {partage && (
          <button ref={partager} type="button" className={s.bouton} onClick={envoyer} disabled={etat === "envoi"}>
            {etat === "envoi" ? "Je prépare ta carte…" : "Partager ma carte"}
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

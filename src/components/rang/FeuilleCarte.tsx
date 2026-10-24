"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CarteRang from "@/components/rang/CarteRang";
import { useInclinaison } from "@/hooks/useInclinaison";
import { createClient } from "@/lib/supabase";
import { cartesDuCompte, donneesCarte, type CartesRang } from "@/lib/cartesRang";
import { partagerCarte } from "@/lib/carteShareExport";
import { jouerOuvertureCarte } from "@/lib/musiqueRang";
import { lockBodyModal } from "@/lib/bodyModal";
import type { Rang } from "@/lib/aura";

/**
 * LA CARTE EN GRAND (maquette « Le passage de rang », version 2). Elle
 * s'ouvre depuis la scène (« Voir ma carte ») et depuis le profil (« Ma
 * carte », la collection). On la penche du doigt, et « Partager ma carte »
 * envoie sa story, une image 1080 × 1920 dessinée par l'app.
 *
 * Toujours dans la nuit, comme la scène : la carte porte sa propre matière,
 * et c'est sur la nuit que sa lumière se voit.
 */
export default function FeuilleCarte({
  rang,
  userId,
  pseudo,
  onFermer,
  /** La carte vient d'être gagnée : son atteinte, c'est aujourd'hui. */
  neuve = false,
}: {
  rang: Rang;
  userId: string;
  pseudo: string;
  onFermer: () => void;
  neuve?: boolean;
}) {
  const [cartes, setCartes] = useState<CartesRang | null>(null);
  const [etat, setEtat] = useState<"repos" | "envoi" | "partagee" | "enregistree" | "erreur">("repos");
  const zone = useRef<HTMLDivElement>(null);
  const carte = useRef<HTMLDivElement>(null);
  const partager = useRef<HTMLButtonElement>(null);

  useEffect(() => lockBodyModal(), []);
  useEffect(() => {
    let vivant = true;
    void cartesDuCompte(createClient(), userId).then((c) => { if (vivant) setCartes(c); });
    return () => { vivant = false; };
  }, [userId]);

  useInclinaison(zone, carte);

  // L'entrée : la carte arrive retournée, un souffle et une note de verre.
  // Une seule fois, même quand le mode strict rejoue les effets.
  const entree = useRef(false);
  useEffect(() => {
    if (entree.current) return;
    entree.current = true;
    jouerOuvertureCarte();
    partager.current?.focus({ preventScroll: true });
    const reduit = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!reduit) {
      zone.current?.animate(
        [
          { transform: "perspective(900px) translateY(18%) rotateY(-100deg) scale(0.55)", opacity: 0 },
          { transform: "perspective(900px)", opacity: 1 },
        ],
        { duration: 700, easing: "cubic-bezier(.2,.9,.25,1)" },
      );
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onFermer]);

  // Elle ne s'ouvre qu'après un toucher : le serveur ne la rend jamais.
  if (typeof document === "undefined") return null;

  const donnees = donneesCarte(cartes, rang.id, pseudo);
  if (neuve && !donnees.atteintLe) donnees.atteintLe = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });

  const envoyer = async () => {
    setEtat("envoi");
    const r = await partagerCarte(rang.id, donnees);
    setEtat(r === "shared" ? "partagee" : r === "downloaded" ? "enregistree" : "erreur");
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ta carte ${rang.nom}`}
      className="fixed inset-0 z-[135] flex flex-col items-center justify-center px-[7vw]"
      style={{
        gap: "2.4vh",
        paddingTop: "calc(6vh + env(safe-area-inset-top, 0px))",
        paddingBottom: "calc(3.5vh + env(safe-area-inset-bottom, 0px))",
        background: "rgba(8,4,16,0.94)",
        color: "#fff",
      }}
    >
      <p className="m-0 text-center" style={{ fontSize: 20, fontWeight: 850, fontVariationSettings: "var(--w-voix)" }}>
        Ta carte {rang.nom}
      </p>
      <div ref={zone} style={{ width: "min(64vw, 39vh, 320px)", touchAction: "none", cursor: "grab" }}>
        <CarteRang ref={carte} rang={rang} donnees={donnees} />
      </div>
      <p className="m-0 text-center" style={{ fontSize: 13, color: "rgba(255,255,255,0.56)" }}>
        {etat === "partagee" ? "Carte envoyée." : etat === "enregistree" ? "L’image est enregistrée sur ton appareil." : etat === "erreur" ? "La carte n’a pas pu se préparer. Réessaie." : "Bouge la carte du doigt"}
      </p>
      <div className="flex w-full items-center justify-center" style={{ gap: 12, maxWidth: 420 }}>
        <button
          type="button"
          onClick={onFermer}
          className="cursor-pointer"
          style={{ minHeight: 48, padding: "10px 14px", fontSize: 16, fontWeight: 650, color: "rgba(255,255,255,0.76)", background: "none", border: 0 }}
        >
          Revenir
        </button>
        <button
          ref={partager}
          type="button"
          onClick={envoyer}
          disabled={etat === "envoi"}
          className="flex-1 cursor-pointer rounded-full disabled:opacity-70"
          style={{
            minHeight: 52, padding: "13px 22px", fontSize: 16, fontWeight: 750, color: "#fff", border: 0,
            background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)",
          }}
        >
          {etat === "envoi" ? "Je prépare ta carte…" : "Partager ma carte"}
        </button>
      </div>
    </div>,
    document.body,
  );
}

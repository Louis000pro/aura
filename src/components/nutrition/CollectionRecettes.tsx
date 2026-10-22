"use client";

/* ════════════════════════════════════════════════════════════════════
   Une collection de recettes, en vue pleine dans l'écran Nutrition.

   La photo d'une recette de la collection en haut, ce qui fait entrer une
   recette dedans dit tel quel, puis la grille. Le filtre n'apparaît que si
   la collection mélange petits-déjeuners et plats ; il n'y a pas de
   « Déjeuner » contre « Dîner » parce que la banque ne les distingue pas
   vraiment : un plat se mange midi ou soir.

   Le retour du téléphone ferme la vue (useRetourTelephone, dans l'écran).
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { Recipe } from "@/lib/recipeBank";
import { collection, dureeRecette, imageRecette, natureDe, type IdCollection } from "@/lib/collectionsRecettes";
import { PRENOM_GUIDE, type GuideRef } from "@/lib/guides";
import { VisageGuide } from "@/components/AssistantMark";
import ns from "@/components/nutrition/Nutrition.module.css";

type Filtre = "tout" | "petit-dej" | "plat";

export default function CollectionRecettes({ id, recettes, guide, onRetour, onOuvrir, onDemander }: {
  id: IdCollection;
  recettes: Recipe[];
  guide: GuideRef;
  onRetour: () => void;
  onOuvrir: (r: Recipe, liste: Recipe[]) => void;
  onDemander: () => void;
}) {
  const c = collection(id);
  const [filtre, setFiltre] = useState<Filtre>("tout");

  const aDesPetitsDej = recettes.some((r) => natureDe(r) === "petit-dej");
  const aDesPlats = recettes.some((r) => natureDe(r) !== "petit-dej");
  const filtrable = aDesPetitsDej && aDesPlats;
  const visibles = !filtrable || filtre === "tout"
    ? recettes
    : recettes.filter((r) => (natureDe(r) === "petit-dej") === (filtre === "petit-dej"));

  return (
    <div className="flex flex-col gap-4">
      <section className="relative overflow-hidden" style={{ height: 320, borderRadius: "var(--r-affiche)", boxShadow: "var(--ombre-pose)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageRecette(c.heros)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <span aria-hidden className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(14,10,28,.35) 0%, rgba(14,10,28,0) 30%, rgba(14,10,28,0) 45%, rgba(14,10,28,.75) 100%)" }} />
        {/* Le verre a sa place ici : le bouton flotte sur une photo. */}
        <button type="button" onClick={onRetour} aria-label="Revenir à la nutrition"
          className="absolute left-3.5 top-3.5 flex h-11 w-11 items-center justify-center rounded-full text-white cursor-pointer"
          style={{ background: "var(--verre-photo)", border: "1px solid rgba(255,255,255,0.4)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
          <ChevronLeft size={19} strokeWidth={2.2} />
        </button>
        <div className="absolute inset-x-5 bottom-5 flex flex-col gap-1.5">
          <h1 className="text-[44px] leading-none text-white" style={{ fontWeight: 200, letterSpacing: "-0.01em" }}>{c.titre}</h1>
          <p className="text-[16px]" style={{ color: "rgba(255,255,255,0.92)" }}>{c.sousTitre}</p>
        </div>
      </section>

      {filtrable && (
        <div className="flex gap-1.5" role="group" aria-label="Filtrer les recettes">
          {([
            { v: "tout", label: "Tout" },
            { v: "petit-dej", label: "Petit-déj" },
            { v: "plat", label: "Midi et soir" },
          ] as { v: Filtre; label: string }[]).map((f) => (
            <button key={f.v} type="button" aria-pressed={filtre === f.v} onClick={() => setFiltre(f.v)} className={ns.puce}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2" style={{ gap: "18px 10px" }}>
        {visibles.map((r) => (
          <button key={r.id} type="button" onClick={() => onOuvrir(r, visibles)} className="flex min-w-0 flex-col gap-1.5 text-left cursor-pointer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.image} alt="" loading="lazy" decoding="async"
              className="block w-full object-cover"
              style={{ aspectRatio: "1 / 1", borderRadius: "var(--r-bloc)", boxShadow: "var(--ombre-pose)", background: "rgba(var(--accent-rgb),0.10)" }} />
            <span className="line-clamp-2 px-0.5 text-[16px] font-bold leading-snug" style={{ color: "var(--text-0)" }}>{r.nom}</span>
            <span className="px-0.5 text-[11px] font-semibold" style={{ color: "var(--text-3)" }}>{dureeRecette(r)}</span>
          </button>
        ))}
      </div>

      <button type="button" onClick={onDemander}
        className={`${ns.bloc} mt-1.5 items-center justify-center gap-2.5 px-4 text-[13px] font-bold cursor-pointer`}
        style={{ minHeight: 52, flexDirection: "row" }}>
        <VisageGuide guide={guide} etat="explain" size={28} />
        {guide ? `Demander une autre idée à ${PRENOM_GUIDE[guide]}` : "Demander une autre idée"}
      </button>
    </div>
  );
}

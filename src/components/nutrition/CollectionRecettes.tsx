"use client";

/* ════════════════════════════════════════════════════════════════════
   Une collection de recettes, en vue pleine dans l'écran Nutrition : une
   des six collections, ou les recettes du moment de l'année.

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
import { natureDe } from "@/lib/collectionsRecettes";
import { PRENOM_GUIDE, type GuideRef } from "@/lib/guides";
import { VisageGuide } from "@/components/AssistantMark";
import CarteRecette from "@/components/nutrition/CarteRecette";
import ns from "@/components/nutrition/Nutrition.module.css";

type Filtre = "tout" | "petit-dej" | "plat";

export default function CollectionRecettes({ titre, sousTitre, heros, recettes, guide, estFavori, onRetour, onOuvrir, onDemander }: {
  titre: string;
  /** Ce qui fait entrer une recette dans la collection, dit tel quel. */
  sousTitre: string;
  /** La photo du haut : celle d'une recette de la collection. */
  heros: string;
  recettes: Recipe[];
  guide: GuideRef;
  /** Un petit cœur sur la photo d'une recette favorite. */
  estFavori: (id: string) => boolean;
  onRetour: () => void;
  onOuvrir: (r: Recipe, liste: Recipe[]) => void;
  onDemander: () => void;
}) {
  const [filtre, setFiltre] = useState<Filtre>("tout");

  /* « Midi et soir » ne garde que des plats : les recettes d'un moment de
     l'année mêlent aussi des boissons et des desserts (un chocolat chaud
     n'est pas un dîner), qui restent sous « Tout ». */
  const aDesPetitsDej = recettes.some((r) => natureDe(r) === "petit-dej");
  const aDesPlats = recettes.some((r) => natureDe(r) === "plat");
  const filtrable = aDesPetitsDej && aDesPlats;
  const visibles = !filtrable || filtre === "tout"
    ? recettes
    : recettes.filter((r) => natureDe(r) === (filtre === "petit-dej" ? "petit-dej" : "plat"));

  return (
    <div className="flex flex-col gap-4">
      <section className="relative overflow-hidden" style={{ height: 320, borderRadius: "var(--r-affiche)", boxShadow: "var(--ombre-pose)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heros} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <span aria-hidden className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(14,10,28,.35) 0%, rgba(14,10,28,0) 30%, rgba(14,10,28,0) 45%, rgba(14,10,28,.75) 100%)" }} />
        {/* Le verre a sa place ici : le bouton flotte sur une photo. */}
        <button type="button" onClick={onRetour} aria-label="Revenir à la nutrition"
          className="absolute left-3.5 top-3.5 flex h-11 w-11 items-center justify-center rounded-full text-white cursor-pointer"
          style={{ background: "var(--verre-photo)", border: "1px solid rgba(255,255,255,0.4)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
          <ChevronLeft size={19} strokeWidth={2.2} />
        </button>
        <div className="absolute inset-x-5 bottom-5 flex flex-col gap-1.5">
          <h1 className="text-[44px] leading-none text-white" style={{ fontWeight: 200, letterSpacing: "-0.01em" }}>{titre}</h1>
          <p className="text-[16px]" style={{ color: "rgba(255,255,255,0.92)" }}>{sousTitre}</p>
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
          <CarteRecette key={r.id} recette={r} favori={estFavori(r.id)} onOuvrir={() => onOuvrir(r, visibles)} />
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

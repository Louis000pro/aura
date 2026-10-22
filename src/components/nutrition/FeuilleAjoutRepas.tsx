"use client";

/* ════════════════════════════════════════════════════════════════════
   « Ajouter un repas » : la seule porte d'ajout de l'écran Nutrition.

   On choisit le moment (préchoisi sur le repas qui vient, ou sur le moment
   vide qu'on a touché dans le détail), puis la façon : la photo de
   l'assiette en grand, le code-barres et l'écrire en dessous, et les
   derniers repas en un geste.

   Le moment choisi ici part dans la modale qui s'ouvre (photo, code-barres,
   saisie) : elle le montre déjà coché, et on peut encore le changer là-bas.

   Un dernier repas ajouté se coche ; le toucher une seconde fois le
   retire. L'appui long épingle un plat (il passe devant les autres).
   ════════════════════════════════════════════════════════════════════ */

import { useRef, useState } from "react";
import { Barcode, Camera, Check, Heart, PenLine, Plus, X } from "lucide-react";
import Sheet from "@/components/communaute/Sheet";
import ImageRepas from "@/components/nutrition/ImageRepas";
import { MOMENTS, MOMENT_COURT, nomComparable, type MealType, type RecentMeal } from "@/lib/repas";
import ns from "@/components/nutrition/Nutrition.module.css";

/** « 2026-10-20 » → « lundi 20 octobre ». */
function jourEnLettres(date: string): string {
  const [a, m, j] = date.split("-").map(Number);
  return new Date(a, m - 1, j).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export default function FeuilleAjoutRepas({
  typeInitial, date, aujourdhui, recents, estEpingle, indiceVu,
  onFermer, onPhoto, onCodeBarres, onEcrire, onAjouterRecent, onRetirer, onEpingler,
}: {
  typeInitial: MealType;
  date: string;
  aujourdhui: string;
  recents: RecentMeal[];
  estEpingle: (nom: string) => boolean;
  indiceVu: boolean;
  onFermer: () => void;
  onPhoto: (type: MealType) => void;
  onCodeBarres: (type: MealType) => void;
  onEcrire: (type: MealType) => void;
  /** Rend l'identifiant du repas écrit, ou `null` si l'écriture a échoué. */
  onAjouterRecent: (r: RecentMeal, type: MealType) => Promise<string | null>;
  onRetirer: (id: string) => Promise<void> | void;
  onEpingler: (r: RecentMeal) => void;
}) {
  const [type, setType] = useState<MealType>(typeInitial);
  const [ajoutes, setAjoutes] = useState<Record<string, string>>({});
  const [enCours, setEnCours] = useState<string | null>(null);
  const [toutVoir, setToutVoir] = useState(false);

  // Appui long = épingler ; un simple toucher = ajouter (jamais les deux).
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFait = useRef(false);
  const appuyer = (r: RecentMeal) => {
    longFait.current = false;
    minuteur.current = setTimeout(() => { longFait.current = true; onEpingler(r); }, 480);
  };
  const lacher = () => { if (minuteur.current) { clearTimeout(minuteur.current); minuteur.current = null; } };

  const toucher = async (r: RecentMeal) => {
    if (longFait.current) { longFait.current = false; return; }
    const cle = nomComparable(r.name);
    if (enCours) return;
    setEnCours(cle);
    const deja = ajoutes[cle];
    if (deja) {
      await onRetirer(deja);
      setAjoutes((a) => { const s = { ...a }; delete s[cle]; return s; });
    } else {
      const id = await onAjouterRecent(r, type);
      if (id) setAjoutes((a) => ({ ...a, [cle]: id }));
    }
    setEnCours(null);
  };

  const visibles = toutVoir ? recents : recents.slice(0, 3);

  return (
    <Sheet onFermer={onFermer} niveau={90}>
      <div className="flex flex-col gap-4 pb-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-[26px] leading-tight" style={{ color: "var(--text-0)", fontWeight: 800, fontVariationSettings: "var(--w-voix)" }}>
              Ajouter un repas
            </h2>
            {date !== aujourdhui && (
              <span className="text-[13px]" style={{ color: "var(--text-3)" }}>Pour le {jourEnLettres(date)}</span>
            )}
          </div>
          <button type="button" onClick={onFermer} aria-label="Fermer"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full cursor-pointer"
            style={{ background: "rgba(var(--text-3-rgb),0.12)", color: "var(--text-1)" }}>
            <X size={17} strokeWidth={2.3} />
          </button>
        </div>

        <div role="radiogroup" aria-label="Quel repas" className="flex gap-1.5">
          {MOMENTS.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={type === m} onClick={() => setType(m)} className={ns.puce}>
              {MOMENT_COURT[m]}
            </button>
          ))}
        </div>

        <button type="button" onClick={() => onPhoto(type)}
          className="flex items-center gap-3.5 p-4 text-left text-white cursor-pointer"
          style={{ minHeight: 104, borderRadius: "var(--r-bloc)", background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}>
          <span className="flex flex-shrink-0 items-center justify-center rounded-full"
            style={{ width: 52, height: 52, background: "rgba(255,255,255,0.22)", border: "1px solid rgba(255,255,255,0.4)" }}>
            <Camera size={24} strokeWidth={2} />
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-[16px] font-bold">Prendre mon assiette en photo</span>
            <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.9)" }}>Les calories sont estimées à partir de la photo.</span>
          </span>
        </button>

        <div className="-mt-1.5 grid grid-cols-2 gap-2.5">
          {[
            { cle: "code", titre: "Code-barres", sous: "Pour un produit emballé", Icone: Barcode, agir: () => onCodeBarres(type) },
            { cle: "ecrire", titre: "L’écrire", sous: "Par exemple : un yaourt", Icone: PenLine, agir: () => onEcrire(type) },
          ].map(({ cle, titre, sous, Icone, agir }) => (
            <button key={cle} type="button" onClick={agir} className={`${ns.bloc} cursor-pointer`} style={{ minHeight: 104, padding: 12, gap: 10 }}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "rgba(139,92,246,0.12)", color: "var(--exp-encre)" }}>
                <Icone size={18} strokeWidth={2} />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[16px] font-bold" style={{ color: "var(--text-0)" }}>{titre}</span>
                <span className="text-[11px]" style={{ color: "var(--text-3)" }}>{sous}</span>
              </span>
            </button>
          ))}
        </div>

        {recents.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[16px] font-bold" style={{ color: "var(--text-0)" }}>Mes derniers repas</span>
              {recents.length > 3 && (
                <button type="button" onClick={() => setToutVoir((v) => !v)} className="min-h-11 pl-3 text-[13px] font-semibold cursor-pointer"
                  style={{ color: "var(--exp-encre)" }}>
                  {toutVoir ? "Voir moins" : "Tout voir"}
                </button>
              )}
            </div>
            {!indiceVu && (
              <span className="-mt-1.5 text-[11px]" style={{ color: "var(--text-3)" }}>Appui long sur un plat pour l’épingler en premier.</span>
            )}
            <div className="grid grid-cols-3 gap-2.5">
              {visibles.map((r) => {
                const cle = nomComparable(r.name);
                const fait = !!ajoutes[cle];
                const epingle = estEpingle(r.name);
                return (
                  <button key={cle} type="button" aria-pressed={fait}
                    aria-label={fait ? `${r.name}, ajouté. Toucher pour le retirer` : `Ajouter ${r.name}`}
                    onPointerDown={() => appuyer(r)} onPointerUp={lacher} onPointerLeave={lacher} onPointerMove={lacher}
                    onContextMenu={(e) => e.preventDefault()}
                    onClick={() => { void toucher(r); }}
                    className="flex min-w-0 flex-col gap-1.5 text-left cursor-pointer" style={{ WebkitTouchCallout: "none", opacity: enCours === cle ? 0.6 : 1 }}>
                    <span className="relative block">
                      <ImageRepas nom={r.name} className="block w-full" icone={24}
                        style={{ height: 118, borderRadius: "var(--r-bloc)", boxShadow: "0 10px 22px -14px rgba(45,25,90,.5)" }} />
                      {epingle && (
                        <span aria-hidden className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full"
                          style={{ background: "rgba(255,255,255,0.92)" }}>
                          <Heart size={12} strokeWidth={2.5} style={{ color: "#8B5CF6", fill: "#8B5CF6" }} />
                        </span>
                      )}
                      <span aria-hidden className="absolute bottom-[7px] right-[7px] flex h-[30px] w-[30px] items-center justify-center rounded-full text-white"
                        style={{ background: fait ? "#0B8A68" : "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "0 0 0 2px #fff" }}>
                        {fait ? <Check size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
                      </span>
                    </span>
                    <span className="line-clamp-2 text-[13px] font-semibold leading-snug" style={{ color: "var(--text-0)" }}>{r.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

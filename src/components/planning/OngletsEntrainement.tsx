"use client";

/* Les quatre vues d'Entraînement, sous le titre, toujours au même
   endroit (maquette « Entraînement repensé », décision 1). Planning
   d'abord : c'est la vue qui s'ouvre. */

export type VueEntrainement = "planning" | "programme" | "progres" | "catalogue";

export const VUES: { id: VueEntrainement; nom: string }[] = [
  { id: "planning", nom: "Planning" },
  { id: "programme", nom: "Programme" },
  { id: "progres", nom: "Progrès" },
  { id: "catalogue", nom: "Catalogue" },
];

export function estVue(v: string | null): v is VueEntrainement {
  return VUES.some((x) => x.id === v);
}

export default function OngletsEntrainement({ vue, onVue }: { vue: VueEntrainement; onVue: (v: VueEntrainement) => void }) {
  return (
    <div role="tablist" aria-label="Vues d’Entraînement" className="flex gap-5 mt-2.5"
      style={{ borderBottom: "1px solid rgba(var(--text-3-rgb),0.18)" }}>
      {VUES.map((v) => {
        const actif = v.id === vue;
        return (
          <button key={v.id} type="button" role="tab" aria-selected={actif} onClick={() => onVue(v.id)}
            className="relative bg-transparent border-none cursor-pointer text-[16px] pt-2 pb-2.5 px-0"
            style={{ color: actif ? "var(--text-0)" : "var(--text-2)", fontWeight: actif ? 700 : 600 }}>
            {v.nom}
            {actif && (
              <span aria-hidden className="absolute left-0 right-0 rounded-[3px]"
                style={{ bottom: -1, height: 3, background: "linear-gradient(90deg,#8B5CF6,#C13BC1)" }} />
            )}
          </button>
        );
      })}
    </div>
  );
}


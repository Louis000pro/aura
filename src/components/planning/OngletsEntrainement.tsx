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

/** Une ligne d'une vue : un titre, ce qu'elle dit aujourd'hui, une flèche. */
export function LigneVue({ titre, sous, onClick }: { titre: string; sous?: string | null; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="vy-filet w-full flex items-center gap-2 text-left bg-transparent border-none cursor-pointer px-4 py-3.5">
      <span className="flex-1 min-w-0">
        <span className="block vy-sous" style={{ color: "var(--text-0)" }}>{titre}</span>
        {sous && <span className="block text-[13px] mt-0.5 truncate" style={{ color: "var(--text-2)" }}>{sous}</span>}
      </span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ color: "var(--text-3)", flexShrink: 0 }}>
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  );
}

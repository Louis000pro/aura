"use client";

/* ════════════════════════════════════════════════════════════════════
   R4 · « LA PROCHAINE FOIS » (maquette 07, écran 08 ; décisions 47 et 48)

   Une seule proposition mise en avant, les autres derrière « Un autre
   ajustement proposé ». Accepter ou Garder : rien ne change sans accord,
   et rien ne s'écrit sur « Garder ».

   ⚠️ UNE SÉANCE DÉJÀ PRÉPARÉE SE NOMME AVANT D'ÊTRE AJUSTÉE (tour 29).
   Le premier « Accepter » n'écrit rien si la prochaine séance de l'étape
   est déjà prête : la base le dit, la carte l'annonce (« Ta séance de
   mardi 8 est déjà prête »), et seul « Ajuster mardi 8 » la modifie.

   ⚠️ SANS CRAN CONFIRMÉ, AUCUNE VALEUR N'EST PROPOSÉE : on choisit la
   prochaine charge, en l'écrivant exactement.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { ReglageCharge } from "@/components/seance/ReglageCharge";
import { cibleAcceptee, type PropositionSeance } from "@/lib/progression";
import { accepterCible } from "@/lib/progressionBase";
import { chargeReglable, libelleCharge, type TypeChargeReglable } from "@/lib/saisieSerie";

type Etat =
  | { genre: "ouverte" }
  | { genre: "envoi" }
  | { genre: "acceptee"; ajuste: string | null }
  | { genre: "gardee" }
  | { genre: "preparee"; intentionId: string; date: string | null }
  | { genre: "erreur"; texte: string };

/** « mardi 8 » depuis « 2026-10-13 », lu comme une date locale. */
export function jourCourt(ymd: string | null): string {
  if (!ymd) return "prévue";
  const [a, m, j] = ymd.split("-").map(Number);
  const d = new Date(a, (m ?? 1) - 1, j ?? 1);
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" });
}

function Carte({ p, lancementId, enregistree }: { p: PropositionSeance; lancementId: string; enregistree: boolean }) {
  const [etat, setEtat] = useState<Etat>({ genre: "ouverte" });
  const pr = p.proposition;
  const reglable = chargeReglable(p.chargeType);
  const [choisie, setChoisie] = useState<number | null>(pr.genre === "charge" ? pr.chargeActuelle : null);
  const nomBas = p.nom.toLowerCase();

  const cible = cibleAcceptee(pr, choisie, p.chargeType);
  const phrase = pr.genre === "reps"
    ? `Tes séries de ${nomBas} ont toutes atteint ${pr.repsActuelles}. On vise ${pr.repsCible} la prochaine fois ?`
    : pr.chargeProposee !== null
      ? `Tes séries de ${nomBas} ont atteint ${p.repsMax}. On passe à ${libelleCharge(pr.chargeProposee, p.chargeType as TypeChargeReglable)} ?`
      : `Tes séries de ${nomBas} ont atteint ${p.repsMax}. Choisis la prochaine charge :`;
  const garder = pr.genre === "reps"
    ? `Garder ${pr.repsActuelles}`
    : `Garder ${libelleCharge(pr.chargeActuelle, p.chargeType as TypeChargeReglable)}`;

  const envoyer = async (appliquerA: string | null) => {
    if (!cible) return;
    setEtat({ genre: "envoi" });
    const r = await accepterCible({ lancementId, emplacement: p.emplacement, charge: cible.charge, repsCible: cible.repsCible, cran: cible.cran, appliquerA });
    if (r.resultat === "ok") setEtat({ genre: "acceptee", ajuste: appliquerA ? (etat.genre === "preparee" ? etat.date : null) : null });
    else if (r.resultat === "occurrence_preparee") setEtat({ genre: "preparee", intentionId: r.intentionId, date: r.date });
    else if (r.resultat === "seance_introuvable") setEtat({ genre: "erreur", texte: "Ta séance s'enregistre encore. Réessaie dans un instant." });
    else setEtat({ genre: "erreur", texte: "Impossible d'enregistrer ce choix pour l'instant." });
  };

  if (etat.genre === "acceptee") {
    return <p className="text-[13px] font-semibold" style={{ color: "#C9B8FF" }}>
      C&apos;est noté pour la prochaine fois{etat.ajuste ? `, dès ta séance de ${jourCourt(etat.ajuste)}` : ""}.
    </p>;
  }
  if (etat.genre === "gardee") {
    return <p className="text-[13px]" style={{ color: "#A79FC0" }}>On garde la même cible.</p>;
  }
  return (
    <div>
      <p className="text-[13px] leading-snug" style={{ color: "#E9E4F7" }}>
        {etat.genre === "preparee"
          ? `Ta séance de ${jourCourt(etat.date)} est déjà prête. On l'ajuste aussi ?`
          : phrase}
      </p>
      {pr.genre === "charge" && pr.chargeProposee === null && reglable && etat.genre !== "preparee" && (
        <div className="mt-3 flex justify-center">
          <ReglageCharge valeur={choisie} type={p.chargeType as TypeChargeReglable} onChange={setChoisie} />
        </div>
      )}
      {etat.genre === "erreur" && <p className="text-[13px] mt-2" style={{ color: "#FFB4A8" }}>{etat.texte}</p>}
      <div className="flex gap-2.5 mt-3">
        <button type="button"
          disabled={!enregistree || !cible || etat.genre === "envoi"}
          onClick={() => void envoyer(etat.genre === "preparee" ? etat.intentionId : null)}
          className="flex-[2] py-3 rounded-xl text-[13px] font-bold cursor-pointer text-white disabled:opacity-40"
          style={{ background: "linear-gradient(100deg,#8B5CF6,#C13BC1)" }}>
          {!enregistree ? "Enregistrement…" : etat.genre === "preparee" ? `Ajuster ${jourCourt(etat.date)}` : "Accepter"}
        </button>
        <button type="button" onClick={() => setEtat({ genre: "gardee" })}
          className="flex-1 py-3 rounded-xl text-[13px] font-semibold cursor-pointer"
          style={{ color: "#C9C2DD", background: "rgba(255,255,255,0.06)" }}>
          {garder}
        </button>
      </div>
    </div>
  );
}

export default function LaProchaineFois({ propositions, lancementId, enregistree }: {
  propositions: PropositionSeance[];
  lancementId: string;
  /** La séance est-elle enregistrée ? Accepter en a besoin pour relire sa source. */
  enregistree: boolean;
}) {
  const [toutes, setToutes] = useState(false);
  if (propositions.length === 0) return null;
  const visibles = toutes ? propositions : propositions.slice(0, 1);
  return (
    <div className="w-full mt-4 rounded-2xl p-4 text-left" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <p className="text-[11px] font-bold mb-2" style={{ color: "#A79FC0" }}>La prochaine fois</p>
      <div className="flex flex-col gap-4">
        {visibles.map((p) => <Carte key={p.emplacement} p={p} lancementId={lancementId} enregistree={enregistree} />)}
      </div>
      {!toutes && propositions.length > 1 && (
        <button type="button" onClick={() => setToutes(true)}
          className="inline-flex items-center gap-1 mt-3 text-[13px] font-semibold cursor-pointer" style={{ color: "#C9B8FF" }}>
          {propositions.length === 2 ? "Un autre ajustement proposé" : `${propositions.length - 1} autres ajustements proposés`}
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

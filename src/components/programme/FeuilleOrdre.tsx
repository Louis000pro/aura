"use client";

/* L'ordre des séances du programme : monter, descendre, retirer, ajouter.
   Rien ne s'écrit avant « Enregistrer », qui crée une nouvelle version du
   programme (`lib/ordreCycle.ts`). Cette feuille montre et déclare. */

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import FeuilleBas from "@/components/semaine/FeuilleBas";
import type { GenInput } from "@/lib/planning";
import type { EtapeCycle } from "@/lib/programme";
import type { ReservationAncienne } from "@/lib/composeurProgramme";
import { EVT_JOURNEE } from "@/lib/finSeance";
import {
  CYCLE_MAX, deplacerDansListe, enregistrerOrdre, reservationsAChoisir, reservationsPerdues, seancesAjoutables,
  type SeanceOrdonnee,
} from "@/lib/ordreCycle";

const SOUCIS: Record<string, string> = {
  programme_change: "Ton programme a changé entre-temps. Ferme et rouvre cette page.",
  choix_incomplets: "Tes séances prévues ont bougé entre-temps. Ferme et rouvre cette page.",
  apercu_perime: "Tes séances prévues ont bougé entre-temps. Ferme et rouvre cette page.",
  pas_ouvert: "Ça n’est pas encore possible.",
  illisible: "Je n’arrive pas à relire ton programme. Réessaie dans un instant.",
  echec: "Ça n’a pas été enregistré. Réessaie dans un instant.",
  incertain: "Je ne sais pas si ça a été enregistré. Réessaie : rien ne sera fait deux fois.",
};

export default function FeuilleOrdre({ userId, programme, pile, gen, aujourdhui, onClose, onFini }: {
  userId: string;
  programme: { id: string; nom: string; intention: string | null };
  /** Les séances, la prochaine d'abord. */
  pile: EtapeCycle[];
  gen: GenInput;
  aujourdhui: string;
  onClose: () => void;
  onFini: (message: string) => void;
}) {
  const [liste, setListe] = useState<SeanceOrdonnee[]>(() => pile.map((e) => ({ id: e.id, nom: e.nom })));
  const [reservations, setReservations] = useState<ReservationAncienne[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => {
    let vivant = true;
    reservationsAChoisir(userId, programme.id)
      .then((r) => { if (vivant) setReservations(r); })
      .catch(() => { if (vivant) setErreur(SOUCIS.illisible); });
    return () => { vivant = false; };
  }, [userId, programme.id]);

  const cle = liste.map((s) => s.id ?? `+${s.nom}`).join("|");
  const change = cle !== pile.map((e) => e.id).join("|");
  const perdues = reservations ? reservationsPerdues(reservations, liste) : [];
  const ajoutables = liste.length < CYCLE_MAX ? seancesAjoutables(gen.ctx, liste.map((s) => s.nom)) : [];

  /* La même liste rejouée est la même activation. */
  const activation = useRef<{ cle: string; id: string } | null>(null);
  const enregistrer = async () => {
    if (!change || !reservations || envoi) return;
    if (activation.current?.cle !== cle) activation.current = { cle, id: crypto.randomUUID() };
    setEnvoi(true); setErreur(null);
    const r = await enregistrerOrdre({ userId, aujourdhui, activationId: activation.current.id, programme, liste, reservations, gen });
    setEnvoi(false);
    if (!r.ok) { setErreur(SOUCIS[r.raison] ?? SOUCIS.echec); return; }
    window.dispatchEvent(new Event(EVT_JOURNEE));
    onFini(`C’est enregistré. Ta prochaine séance : ${liste[0].nom}.`);
  };

  return (
    <FeuilleBas onClose={onClose} hauteur="90dvh" niveau={105}>
      <div className="flex items-center justify-between px-5 pt-1 pb-2 flex-shrink-0">
        <h2 className="text-[20px]" style={{ color: "var(--text-0)", fontWeight: 800, fontVariationSettings: "var(--w-voix)" }}>Tes séances</h2>
        <button type="button" onClick={onClose} aria-label="Fermer" className="w-10 h-10 flex items-center justify-center bg-transparent border-none cursor-pointer" style={{ color: "var(--text-3)" }}>
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <p className="text-[13px] mb-3" style={{ color: "var(--text-2)" }}>La première de la liste est ta prochaine séance, puis elles reviennent dans cet ordre.</p>
        <div className="overflow-hidden" style={{ borderRadius: "var(--r-bloc)", background: "rgba(var(--surface-rgb),0.9)", border: "1px solid rgba(var(--text-3-rgb),0.16)" }}>
          {liste.map((s, i) => (
            <div key={s.id ?? s.nom} className="vy-filet flex items-center gap-1 pl-3.5 pr-1.5 py-1.5">
              <span className="vy-nombre text-[13px] w-6" style={{ color: "var(--text-3)" }}>{i + 1}</span>
              <b className="flex-1 min-w-0 truncate text-[16px]" style={{ color: "var(--text-0)" }}>{s.nom}</b>
              <Rond label={`Monter ${s.nom}`} disabled={i === 0} onClick={() => setListe((l) => deplacerDansListe(l, i, -1))}><ArrowUp size={16} /></Rond>
              <Rond label={`Descendre ${s.nom}`} disabled={i === liste.length - 1} onClick={() => setListe((l) => deplacerDansListe(l, i, 1))}><ArrowDown size={16} /></Rond>
              <Rond label={`Retirer ${s.nom}`} disabled={liste.length <= 1} onClick={() => setListe((l) => l.filter((_, j) => j !== i))}><X size={16} /></Rond>
            </div>
          ))}
        </div>

        {ajoutables.length > 0 && (
          <>
            <p className="text-[13px] mt-5 mb-2" style={{ color: "var(--text-2)" }}>Ajouter une séance</p>
            <div className="flex flex-wrap gap-2">
              {ajoutables.map((n) => (
                <button key={n} type="button"
                  onClick={() => setListe((l) => [...l, { id: pile.find((e) => e.nom === n)?.id ?? null, nom: n }])}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold cursor-pointer"
                  style={{ background: "rgba(var(--surface-rgb),0.9)", color: "var(--text-0)", border: "1px solid rgba(var(--text-3-rgb),0.25)" }}>
                  <Plus size={14} /> {n}
                </button>
              ))}
            </div>
          </>
        )}

        {change && (
          <p className="text-[13px] mt-5" style={{ color: "var(--text-2)" }}>
            C’est une nouvelle version de ton programme : elle commence par {liste[0].nom}. Chaque séance garde ses exercices, et celles que tu as placées gardent leur jour.
            Une adaptation en cours s’arrête, et une hausse de charge déjà acceptée est à refaire.
            {perdues.length > 0 && <> {perdues.map((r) => r.titre).join(", ")} quitte{perdues.length > 1 ? "nt" : ""} ton planning.</>}
          </p>
        )}
        {erreur && <p role="alert" className="text-[13px] mt-3" style={{ color: "var(--feu-encre)" }}>{erreur}</p>}
        <button type="button" disabled={!change || !reservations || envoi} onClick={() => void enregistrer()}
          className="w-full mt-4 py-3 rounded-2xl text-[16px] font-extrabold text-white cursor-pointer border-none"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)", opacity: change && reservations && !envoi ? 1 : 0.5 }}>
          Enregistrer
        </button>
      </div>
    </FeuilleBas>
  );
}

function Rond({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick}
      className="w-10 h-10 flex items-center justify-center bg-transparent border-none cursor-pointer"
      style={{ color: "var(--text-2)", opacity: disabled ? 0.25 : 1 }}>
      {children}
    </button>
  );
}

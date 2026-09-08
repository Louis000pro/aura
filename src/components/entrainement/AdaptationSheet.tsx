"use client";

/* ════════════════════════════════════════════════════════════════════
   V8 · ADAPTER TEMPORAIREMENT SON PROGRAMME.

   Un seul écran, et il fait trois choses : dire ce qui est en cours,
   permettre de l'arrêter, et en déclarer une nouvelle. Le Guide n'est
   PAS branché dessus (c'est V9) ; ici, la personne décide elle-même,
   et c'est aussi le seul endroit où l'on peut arrêter une adaptation
   sans avoir à formuler une phrase.

   ⚠️ CET ÉCRAN N'ÉCRIT QUE DANS `adaptations_entrainement`. Il ne touche
   ni au programme, ni au cycle, ni à une seule intention : c'est tout
   l'intérêt d'une couche datée. Le retour au programme de référence ne
   demande donc aucune écriture, puisque le programme n'a jamais bougé.

   ⚠️ ET IL NE RÉÉCRIT AUCUNE RÉSERVATION. Une séance déjà datée sur une
   étape que l'adaptation masquerait est un CONFLIT : on la montre, et
   on n'active pas tant qu'elle est là. Supprimer, déplacer ou remplacer
   automatiquement ce que quelqu'un a posé serait exactement la
   réécriture silencieuse que le modèle s'interdit.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import {
  ajouterJours, creerAdaptation, fermerAdaptations, finParDefaut, libelleJour,
  REEVALUATION_SEMAINES, reservationsEnConflit, validerAxes,
  type Adaptation,
} from "@/lib/adaptation";
import { fetchRange, todayYmd, dayTitle, type PlanningDay } from "@/lib/planning";
import type { ProgrammeEtCycle } from "@/lib/programme";

/** Les dates d'une fenêtre, bornes incluses. Bornée à 120 jours : une
 *  adaptation plus longue qu'un trimestre n'est plus une adaptation,
 *  c'est une nouvelle version du programme, et on ne va pas demander
 *  cent cinquante jours d'intentions pour le dire. */
function datesEntre(debut: string, fin: string): string[] {
  const out: string[] = [];
  let d = debut;
  for (let i = 0; i < 120 && d <= fin; i++) {
    out.push(d);
    d = ajouterJours(d, 1);
  }
  return out;
}

export default function AdaptationSheet({
  userId, programme, adaptation, onClose, onChange,
}: {
  userId: string;
  programme: ProgrammeEtCycle | null;
  adaptation: Adaptation | null;
  onClose: () => void;
  /** La journée se relit : le héros, la semaine et l'étape suivante se
   *  remettent d'accord avec ce qui vient d'être écrit. */
  onChange: () => void;
}) {
  const today = todayYmd();
  /* Le cycle est une dépendance de plusieurs mémos : sans `useMemo`, le
     repli `[]` en fabrique un neuf à chaque rendu et tout ce qui en
     dépend se recalcule sans raison. */
  const cycle = useMemo(() => programme?.cycle ?? [], [programme]);

  const [choisies, setChoisies] = useState<string[]>([]);
  const [debut, setDebut] = useState(today);
  const [fin, setFin] = useState(() => finParDefaut(today));
  const [motif, setMotif] = useState("");
  /* ⚠️ LA RÉPONSE PORTE LA QUESTION QU'ELLE DÉCRIT, ET ON NE
     RÉINITIALISE JAMAIS. Un `setConflits(null)` synchrone au début de
     l'effet est un avertissement React (`set-state-in-effect`) et une
     cascade de rendus ; ne rien remettre du tout laisserait, le temps
     d'une requête, la liste d'une période précédente sous les yeux. On
     COMPARE donc : une réponse qui ne répond pas à la question posée
     n'est simplement plus lue. Même procédé que la ligne « ensemble »
     d'un profil. */
  const [conflits, setConflits] = useState<{ cle: string; liste: PlanningDay[] } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  const basculer = (id: string) =>
    setChoisies((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const axes = useMemo(() => ({ eviter_etapes: choisies }), [choisies]);
  const valide = validerAxes(axes, cycle);
  const periodeValide = !!debut && !!fin && fin >= debut;
  /* Toutes les étapes masquées : on ne l'interdit pas (c'est une réponse
     légitime à une vraie gêne), on le DIT avant le clic. Le héros dira la
     même chose ensuite, au lieu d'afficher « rien de prévu ». */
  const toutMasque = cycle.length > 0 && choisies.length === cycle.length;

  /* ⚠️ LES CONFLITS SE CHERCHENT EN BASE, SUR LA FENÊTRE DEMANDÉE. Les
     chercher dans la semaine déjà chargée à l'écran raterait toutes les
     réservations au-delà de dimanche, et le défaut serait INTERMITTENT
     selon la date d'aujourd'hui : le pire mode d'échec possible. */
  const cleConflits = `${debut}|${fin}|${[...choisies].sort().join(",")}`;
  useEffect(() => {
    if (!userId || !periodeValide || choisies.length === 0) return;
    let annule = false;
    (async () => {
      try {
        const parJour = await fetchRange(userId, datesEntre(debut, fin));
        const toutes = Object.values(parJour).flat();
        const liste = reservationsEnConflit(toutes, { debut, fin, axes: { eviter_etapes: choisies } });
        if (!annule) setConflits({ cle: cleConflits, liste });
      } catch {
        /* On ne sait pas : on n'affirme donc pas « aucun conflit », et le
           bouton reste fermé. Une adaptation activée par-dessus une
           réservation qu'on n'a pas su lire serait pire qu'un bouton
           qui attend. */
        if (!annule) setConflits(null);
      }
    })();
    return () => { annule = true; };
  }, [userId, debut, fin, choisies, periodeValide, cleConflits]);

  /* La réponse ne vaut que pour la question qu'elle porte. */
  const conflitsAJour = conflits && conflits.cle === cleConflits ? conflits.liste : null;

  const peutActiver =
    valide.ok && periodeValide && !occupe && conflitsAJour !== null && conflitsAJour.length === 0;

  const activer = useCallback(async () => {
    if (!programme || !valide.ok) return;
    setOccupe(true);
    setErreur(null);
    const r = await creerAdaptation({
      userId,
      programmeId: programme.programme.id,
      cycle,
      debut,
      fin,
      axes: valide.axes,
      motif,
      origine: "utilisateur",
    });
    setOccupe(false);
    if (!r.ok) { setErreur(r.raison); return; }
    onChange();
    onClose();
  }, [programme, valide, userId, cycle, debut, fin, motif, onChange, onClose]);

  const arreter = useCallback(async () => {
    if (!adaptation) return;
    setOccupe(true);
    const ok = await fermerAdaptations([adaptation.id]);
    setOccupe(false);
    if (!ok) { setErreur("L’adaptation n’a pas pu être arrêtée."); return; }
    onChange();
    onClose();
  }, [adaptation, onChange, onClose]);

  const nomDe = (id: string) => cycle.find((e) => e.id === id)?.nom ?? "";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:px-4"
      style={{ background: "rgba(12,8,22,0.5)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 64, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 48, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="w-full max-w-lg rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: "rgb(var(--surface-rgb))",
          border: "1px solid rgba(var(--accent-rgb),0.14)",
          boxShadow: "0 -14px 44px rgba(0,0,0,0.35)",
          maxHeight: "88vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1 md:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--text-3)", opacity: 0.4 }} />
        </div>

        <div className="px-5 pt-2 pb-3 flex items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-[19px] font-light" style={{ color: "var(--text-1)" }}>
              Adapter temporairement
            </h2>
            <p className="text-[11.5px] font-medium mt-1 leading-snug" style={{ color: "var(--text-3)" }}>
              Ton programme ne change pas. Il reprend tout seul à la fin.
            </p>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0 border-none"
            style={{ background: "rgba(var(--tint-violet-rgb),0.7)" }} aria-label="Fermer">
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>

        <div className="overflow-y-auto px-5 flex-1" style={{ scrollbarWidth: "none", paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}>

          {/* ── Ce qui est en cours ── */}
          {adaptation && (
            <div className="overflow-hidden mb-4" style={{
              borderRadius: "var(--r-bloc)",
              background: "rgba(var(--surface-rgb),0.9)",
              border: "1px solid rgba(var(--text-3-rgb),0.16)",
            }}>
              <div className="px-4 pt-3.5 pb-3.5 vy-filet">
                <p className="vy-label mb-1.5">En cours</p>
                <p className="text-[15px] font-bold leading-snug" style={{ color: "var(--text-0)" }}>
                  {adaptation.axes.eviter_etapes.map(nomDe).filter(Boolean).join(" · ") || "Étapes évitées"}
                </p>
                <p className="text-[12px] font-medium mt-1.5" style={{ color: "var(--text-2)" }}>
                  Jusqu’au {libelleJour(adaptation.fin)}
                  {adaptation.motif ? ` · ${adaptation.motif}` : ""}
                </p>
              </div>
              <button
                onClick={arreter} disabled={occupe}
                className="w-full h-11 px-4 text-left text-[13px] font-bold cursor-pointer border-none bg-transparent vy-filet"
                style={{ color: "var(--text-2)" }}>
                Arrêter maintenant
              </button>
            </div>
          )}

          {!programme || cycle.length === 0 ? (
            <p className="text-[13px] font-light leading-relaxed py-4" style={{ color: "var(--text-2)" }}>
              Tu n’as pas encore de programme, donc rien à adapter.
            </p>
          ) : adaptation ? (
            /* ⚠️ UNE SEULE ADAPTATION À LA FOIS, ET LA BASE LE TIENT
               (`EXCLUDE`). Proposer un second formulaire ici, c'est
               proposer un geste qui sera refusé : on dit plutôt quoi
               faire. */
            <p className="text-[12.5px] font-light leading-relaxed" style={{ color: "var(--text-3)" }}>
              Une seule adaptation à la fois. Arrête celle-ci pour en déclarer une autre.
            </p>
          ) : (
            <>
              {/* ── Les étapes à éviter ── */}
              <p className="vy-label mb-2">Ce que tu évites</p>
              <div className="flex flex-wrap gap-2 mb-1">
                {cycle.map((e) => {
                  const on = choisies.includes(e.id);
                  return (
                    <button key={e.id} onClick={() => basculer(e.id)}
                      aria-pressed={on}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[12.5px] font-bold cursor-pointer"
                      style={on
                        ? { background: "rgba(var(--accent-rgb),0.14)", border: "1px solid rgba(var(--accent-rgb),0.42)", color: "var(--exp-encre)" }
                        : { background: "rgba(var(--text-3-rgb),0.07)", border: "1px solid rgba(var(--text-3-rgb),0.16)", color: "var(--text-2)" }}>
                      {on && <Check size={12} strokeWidth={3} />}
                      {e.nom}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11.5px] font-light leading-snug mt-2 mb-4" style={{ color: "var(--text-3)" }}>
                Ces séances ne te seront plus proposées pendant la période. Elles ne sont
                ni faites, ni sautées : elles reviennent à leur tour ensuite.
              </p>

              {/* ── La période ── */}
              <p className="vy-label mb-2">Du … au …</p>
              <div className="flex items-center gap-2 mb-1">
                <input type="date" value={debut} min={today}
                  onChange={(ev) => {
                    const d = ev.target.value;
                    setDebut(d);
                    if (d && fin < d) setFin(finParDefaut(d));
                  }}
                  className="flex-1 min-w-0 h-11 px-3 rounded-xl text-[13px] font-semibold"
                  style={{ background: "rgba(var(--text-3-rgb),0.07)", border: "1px solid rgba(var(--text-3-rgb),0.16)", color: "var(--text-1)" }} />
                <input type="date" value={fin} min={debut || today}
                  onChange={(ev) => setFin(ev.target.value)}
                  className="flex-1 min-w-0 h-11 px-3 rounded-xl text-[13px] font-semibold"
                  style={{ background: "rgba(var(--text-3-rgb),0.07)", border: "1px solid rgba(var(--text-3-rgb),0.16)", color: "var(--text-1)" }} />
              </div>
              {/* ⚠️ « JUSQU'À NOUVEL ORDRE » N'EXISTE PAS. Une adaptation
                  sans fin est une modification permanente qui ne dit pas
                  son nom ; une modification permanente devient une
                  nouvelle version du programme. On propose donc une date,
                  et on dit qu'on repassera la voir. */}
              <button onClick={() => setFin(finParDefaut(debut || today))}
                className="text-[11.5px] font-bold cursor-pointer bg-transparent border-none px-0 mt-1"
                style={{ color: "var(--exp-encre)" }}>
                Je ne sais pas encore · {REEVALUATION_SEMAINES} semaines
              </button>
              <p className="text-[11.5px] font-light leading-snug mt-1.5 mb-4" style={{ color: "var(--text-3)" }}>
                Une adaptation a toujours une fin. Si ça dure, on en refait une, ou ton
                programme change pour de bon.
              </p>

              {/* ── Le motif, purement descriptif ── */}
              <p className="vy-label mb-2">Pour t’en souvenir</p>
              <input type="text" value={motif} maxLength={120}
                onChange={(ev) => setMotif(ev.target.value)}
                placeholder="Épaule sensible, pas de matériel…"
                className="w-full h-11 px-3 rounded-xl text-[13px] font-medium mb-1"
                style={{ background: "rgba(var(--text-3-rgb),0.07)", border: "1px solid rgba(var(--text-3-rgb),0.16)", color: "var(--text-1)" }} />
              <p className="text-[11.5px] font-light leading-snug mt-1.5 mb-4" style={{ color: "var(--text-3)" }}>
                Ce texte ne change rien à ce qui te sera proposé.
              </p>

              {/* ── Ce qui empêche ── */}
              {toutMasque && (
                <p className="text-[12.5px] font-medium leading-snug mb-3" style={{ color: "var(--text-2)" }}>
                  Tu évites tout ton programme : plus aucune séance ne te sera proposée
                  pendant cette période.
                </p>
              )}

              {conflitsAJour !== null && conflitsAJour.length > 0 && (
                <div className="overflow-hidden mb-3" style={{
                  borderRadius: "var(--r-bloc)",
                  border: "1px solid rgba(var(--accent-rgb),0.24)",
                  background: "rgba(var(--tint-violet-rgb),0.5)",
                }}>
                  <div className="px-4 pt-3.5 pb-3">
                    <p className="text-[13px] font-bold mb-1.5" style={{ color: "var(--text-0)" }}>
                      {conflitsAJour.length === 1 ? "Une séance est déjà posée" : `${conflitsAJour.length} séances sont déjà posées`}
                    </p>
                    <p className="text-[11.5px] font-light leading-snug mb-2.5" style={{ color: "var(--text-2)" }}>
                      Elles portent une étape que tu veux éviter. Vaiiya n’y touche pas tout
                      seul : décale-les ou retire-les depuis ta semaine, puis reviens ici.
                    </p>
                    <ul className="m-0 p-0 list-none">
                      {conflitsAJour.map((c) => (
                        <li key={c.id ?? `${c.date}-${c.title}`}
                          className="flex items-baseline gap-2 py-1 text-[12px] font-semibold"
                          style={{ color: "var(--text-1)" }}>
                          <span style={{ color: "var(--text-3)" }}>{libelleJour(c.date)}</span>
                          <span className="truncate">{dayTitle(c)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {(erreur || (!valide.ok && choisies.length > 0)) && (
                <p className="text-[12px] font-semibold mb-3" style={{ color: "var(--text-1)" }}>
                  {erreur ?? (valide.ok ? "" : valide.raison)}
                </p>
              )}

              <motion.button
                whileTap={peutActiver ? { scale: 0.97 } : undefined}
                onClick={peutActiver ? activer : undefined}
                aria-disabled={!peutActiver}
                className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-[15px] font-extrabold text-white border-none mb-2"
                style={{
                  background: "linear-gradient(135deg,#8B5CF6,#C13BC1)",
                  boxShadow: "var(--ombre-action)",
                  opacity: peutActiver ? 1 : 0.45,
                }}>
                {occupe ? "…" : "Activer l’adaptation"}
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

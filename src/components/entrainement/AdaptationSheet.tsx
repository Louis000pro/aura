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

   ⚠️ ET IL NE RÉÉCRIT AUCUNE RÉSERVATION TOUT SEUL. Une séance déjà
   datée sur une étape que l'adaptation masquerait est un CONFLIT : on la
   montre, et on n'active pas tant qu'elle est là. Supprimer, déplacer ou
   remplacer automatiquement ce que quelqu'un a posé serait exactement la
   réécriture silencieuse que le modèle s'interdit.

   ⚠️ MAIS ON PEUT LE RÉSOUDRE D'ICI, ET C'EST DE L'ERGONOMIE, PAS UNE
   SÉMANTIQUE NOUVELLE. Chaque conflit porte « Décaler » et « Retirer »,
   et les deux passent par les AUTORITÉS QUI EXISTENT DÉJÀ : `saveDay`
   déplace l'intention (même identité, même provenance, même lien vers le
   programme, exactement ce que fait le glisser-déposer de « Organiser »)
   et `retirerIntention` la retire (une suppression, jamais un statut, la
   même sémantique que `libererJours`, resserrée sur une ligne). Cet
   écran n'invente donc aucune écriture de planning : il déclare un
   geste, et c'est toujours la personne qui le déclenche.

   ⚠️ APRÈS CHAQUE GESTE, ON RELIT LA BASE. Une séance décalée À
   L'INTÉRIEUR de la période reste un conflit : retirer sa ligne de la
   liste affichée rouvrirait le bouton sur un conflit qui existe encore.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { lockBodyModal } from "@/lib/bodyModal";
import {
  chargerConflits, creerAdaptation, fermerAdaptations, finParDefaut, libelleJour,
  REEVALUATION_SEMAINES, validerAxes,
  type Adaptation,
} from "@/lib/adaptation";
import { retirerIntention, saveDay, todayYmd, dayTitle, type PlanningDay } from "@/lib/planning";
import { EVT_JOURNEE } from "@/lib/finSeance";
import type { ProgrammeEtCycle } from "@/lib/programme";
import ChoixJour from "./ChoixJour";

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
  /* Le geste en cours sur UN conflit : le sélecteur de jour ouvert, ou le
     retrait armé. Un seul à la fois, et il porte l'identité de la ligne
     visée : une confirmation qui ne dit pas sur quoi elle porte est une
     confirmation qu'on donne à l'aveugle. */
  const [geste, setGeste] = useState<{ id: string; quoi: "decaler" | "retirer" } | null>(null);
  /* ⚠️ IL FAIT PARTIE DE LA QUESTION POSÉE, PAS D'UN RAFRAÎCHISSEMENT À
     CÔTÉ. Après un geste, la réponse d'avant ne répond plus : la clé
     change, la liste affichée redevient « je ne sais pas », et le bouton
     d'activation reste fermé tant que la base n'a pas répondu. */
  const [tick, setTick] = useState(0);

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
  const cleConflits = `${debut}|${fin}|${[...choisies].sort().join(",")}|${tick}`;
  useEffect(() => {
    if (!userId || !periodeValide || choisies.length === 0) return;
    let annule = false;
    (async () => {
      try {
        const liste = await chargerConflits(userId, { debut, fin, axes: { eviter_etapes: choisies } });
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

  /* ⚠️ ON NE RETIRE RIEN DE LA LISTE À L'ÉCRAN : ON REPOSE LA QUESTION.
     C'est la source qui dit s'il reste un conflit, et un déplacement peut
     très bien retomber dans la période. */
  const relire = useCallback(() => {
    setGeste(null);
    setTick((t) => t + 1);
    /* La semaine derrière et le héros de l'accueil se remettent d'accord
       avec ce qui vient d'être écrit. */
    onChange();
    if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT_JOURNEE));
  }, [onChange]);

  /* ⚠️ DÉCALER, C'EST L'AUTORITÉ DE DÉPLACEMENT DÉJÀ EN PLACE, ET RIEN
     D'AUTRE. `saveDay` sur une intention qui porte son `id` MODIFIE cette
     ligne : aucune seconde intention, l'identité est conservée, et la
     provenance comme le lien vers l'étape survivent parce que la ligne a
     été relue avant d'être réécrite. C'est mot pour mot ce que fait le
     glisser-déposer de « Organiser ». */
  const decaler = useCallback(async (c: PlanningDay, date: string) => {
    if (!c.id || date === c.date) { setGeste(null); return; }
    setOccupe(true);
    setErreur(null);
    try {
      await saveDay(userId, { ...c, date }, "utilisateur");
    } catch {
      setErreur("Cette séance n’a pas pu être décalée.");
    }
    setOccupe(false);
    relire();
  }, [userId, relire]);

  /* ⚠️ RETIRER, C'EST UNE SUPPRESSION, ET SÛREMENT PAS UN STATUT. La
     marquer `passee` dirait qu'elle a été écartée alors qu'elle n'a
     jamais eu lieu, et `faite` refermerait une étape que personne n'a
     faite : le curseur du cycle s'ordonne justement sur les intentions
     résolues. Rien du programme n'est touché, et une réservation V7A
     rend simplement son étape libre : le héros la reproposera quand
     l'adaptation ne la masquera plus. */
  const retirer = useCallback(async (c: PlanningDay) => {
    if (!c.id) { setGeste(null); return; }
    setOccupe(true);
    setErreur(null);
    try {
      await retirerIntention(userId, c.id);
    } catch {
      setErreur("Cette séance n’a pas pu être retirée.");
    }
    setOccupe(false);
    relire();
  }, [userId, relire]);

  /* La nav du bas s'efface tant que la feuille est ouverte : c'est ce que
     fait `Sheet` pour Organiser, Choisir et Improviser, et l'oublier ici
     laissait le bouton d'activation collé a la barre fixe. */
  useEffect(() => lockBodyModal(), []);

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
          maxHeight: "88dvh",
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

        <div className="overflow-y-auto px-5 flex-1" style={{ scrollbarWidth: "none", paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}>

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
                    <p className="text-[11.5px] font-light leading-snug mb-1" style={{ color: "var(--text-2)" }}>
                      Elles portent une étape que tu veux éviter. Vaiiya n’y touche pas tout
                      seul : décale-les ou retire-les, une par une.
                    </p>
                    <ul className="m-0 p-0 list-none">
                      {conflitsAJour.map((c) => {
                        const ouvert = geste && geste.id === c.id ? geste.quoi : null;
                        return (
                          <li key={c.id ?? `${c.date}-${c.title}`} className="py-2 vy-filet">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: "var(--text-3)" }}>
                                {libelleJour(c.date)}
                              </span>
                              <span className="flex-1 min-w-0 truncate text-[12px] font-semibold" style={{ color: "var(--text-1)" }}>
                                {dayTitle(c)}
                              </span>
                              {/* ⚠️ DEUX ACTIONS SECONDAIRES, DONC SANS SURFACE
                                  NI VIOLET PLEIN : le seul bouton d'action de
                                  cet écran reste « Activer l'adaptation ». */}
                              {ouvert === "retirer" ? (
                                <>
                                  <button onClick={() => void retirer(c)} disabled={occupe}
                                    className="text-[11.5px] font-bold cursor-pointer bg-transparent border-none px-0 flex-shrink-0"
                                    style={{ color: "var(--exp-encre)" }}>
                                    Confirmer
                                  </button>
                                  <button onClick={() => setGeste(null)}
                                    className="text-[11.5px] font-bold cursor-pointer bg-transparent border-none px-0 flex-shrink-0"
                                    style={{ color: "var(--text-3)" }}>
                                    Annuler
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => setGeste(ouvert === "decaler" || !c.id ? null : { id: c.id, quoi: "decaler" })}
                                    className="text-[11.5px] font-bold cursor-pointer bg-transparent border-none px-0 flex-shrink-0"
                                    style={{ color: ouvert === "decaler" ? "var(--exp-encre)" : "var(--text-2)" }}>
                                    {ouvert === "decaler" ? "Fermer" : "Décaler"}
                                  </button>
                                  <button onClick={() => { if (c.id) setGeste({ id: c.id, quoi: "retirer" }); }}
                                    className="text-[11.5px] font-bold cursor-pointer bg-transparent border-none px-0 flex-shrink-0"
                                    style={{ color: "var(--text-2)" }}>
                                    Retirer
                                  </button>
                                </>
                              )}
                            </div>
                            {/* ⚠️ LA CONSÉQUENCE SE NOMME AVANT LE CLIC, C'EST
                                la règle du modèle : on ne fait jamais deviner
                                ce qu'un geste va écrire. */}
                            {ouvert === "retirer" && (
                              <p className="text-[11px] font-light leading-snug mt-1.5" style={{ color: "var(--text-3)" }}>
                                Elle disparaît de ta semaine. Elle n’est ni faite, ni sautée, et ton
                                programme ne bouge pas.
                              </p>
                            )}
                            <AnimatePresence initial={false}>
                              {ouvert === "decaler" && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
                                  className="overflow-hidden">
                                  <p className="text-[11px] font-light leading-snug mt-1.5" style={{ color: "var(--text-3)" }}>
                                    Choisis un jour hors de la période, sinon elle restera dans la liste.
                                  </p>
                                  {/* Le sélecteur de jour de l'app, celui du héros
                                      et du menu d'une séance. Pas un second. */}
                                  <ChoixJour onChoisir={(date) => void decaler(c, date)} />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </li>
                        );
                      })}
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

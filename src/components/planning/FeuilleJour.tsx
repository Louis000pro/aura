"use client";

/* ════════════════════════════════════════════════════════════════════
   LA FEUILLE D'UN JOUR (maquette « Entraînement repensé », lot 1)

   Toucher une séance du fil l'ouvre. En haut, la séance et pourquoi elle
   est là ; puis ce qui se règle sur place (le jour, la durée) ; puis les
   portes (les exercices, l'échange, passer, le jour sans) ; en bas,
   l'action et « Demander à … pour ce jour ».

   ⚠️ ELLE NE DÉCIDE RIEN. Chaque geste vient de `semaineGestes`, qui
   relit avant d'écrire, et la feuille dit le refus quand il y en a un.

   ⚠️ LA DURÉE NE S'ENREGISTRE PAS POUR UN AUTRE JOUR. Une séance prévue
   n'a pas encore de durée à elle en base : régler la durée sert à la
   lancer maintenant, raccourcie (la même règle que « Version courte »).
   Le réglage n'apparaît donc que quand la séance peut se faire maintenant.
   L'effort (« plus léger »), lui, s'enregistre pour ce jour : c'est une
   situation « moins d'énergie » d'une seule journée.

   ⚠️ « CHANGER LES EXERCICES » ICI NE VAUT QUE CE JOUR-LÀ. Les changer pour
   toujours se fait dans la vue Programme.
   ════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, X } from "lucide-react";
import FeuilleBas from "@/components/semaine/FeuilleBas";
import { Photo } from "@/components/entrainement/PhotoSeance";
import { VisageGuide } from "@/components/AssistantMark";
import { useGuideActif } from "@/context/GuideContext";
import { PRENOM_GUIDE } from "@/lib/guides";
import { resolveArt } from "@/lib/workoutArt";
import { contexteDe, type GenInput, type PlanningDay } from "@/lib/planning";
import { modeleDeLEtape, modeleDeLOccurrence } from "@/lib/prescription";
import { lireVariete } from "@/lib/varieteBase";
import { projeterPrescription } from "@/lib/banqueEtapes";
import type { EtapeCycle, ProgrammeEtCycle } from "@/lib/programme";
import type { JourProjete } from "@/lib/projection";
import { decaler, jourDeSemaine } from "@/lib/projection";
import { ABR_JOURS, type ElementJour, type LigneSemaine } from "@/lib/semaine";
import FeuilleSeanceProgramme from "@/components/programme/FeuilleSeanceProgramme";
import type { ContexteComposition, LignePrescription } from "@/lib/banqueEtapes";
import {
  lignesDuJour, modifierCeJour, passerLaSeance, regleDuJour, retirerLeJour,
  type CibleAffichee, type ResultatGeste,
} from "@/lib/semaineGestes";
import { dateCourte, deGenre, situationsDuJour, type Situation } from "@/lib/situations";
import { arreterSituation, creerSituation } from "@/lib/situationsBase";
import { CONFLITS, descriptionElement, type ALiberer } from "@/components/planning/ligneSeance";

/** Ce qu'on a touché pour ouvrir la feuille d'un jour. */
export type Cible = { ligne: LigneSemaine<EtapeCycle>; element: ElementJour<EtapeCycle> | null };

type Prevu = Extract<ElementJour<EtapeCycle>, { genre: "prevu" }>;
type Pose = Extract<ElementJour<EtapeCycle>, { genre: "pose" }>;

const DUREE_MIN = 10;
const DUREE_PAS = 5;

export default function FeuilleJour({
  cible, userId, programme, gen, aujourdhui, lignes, deplacable, glissable, situations, envoi,
  onClose, onDeplacer, onLancerTete, onLancerIntention, onLancerCourt, onChoisirSeance, onDemander, onResultat,
}: {
  cible: Cible;
  userId: string;
  programme: ProgrammeEtCycle | null;
  gen: GenInput | null;
  aujourdhui: string;
  /** Les jours du fil : pour dire quels jours sont déjà pris. */
  lignes: LigneSemaine<EtapeCycle>[];
  deplacable: (el: ElementJour<EtapeCycle> | null) => el is Prevu;
  /** Comme `deplacable`, plus les séances posées à côté du programme. */
  glissable: (el: ElementJour<EtapeCycle> | null) => el is Prevu | Pose;
  situations: Situation[] | null;
  /** Un geste est en cours ailleurs dans le fil. */
  envoi: boolean;
  onClose: () => void;
  onDeplacer: (el: Prevu | Pose, vers: string) => void;
  onLancerTete: () => void;
  onLancerIntention: (d: PlanningDay) => void;
  onLancerCourt: (d: PlanningDay | null, minutes: number) => void;
  onChoisirSeance: (date: string, liberer: ALiberer) => void;
  onDemander: (phrase: string) => void;
  onResultat: (r: ResultatGeste, ok: string) => void;
}) {
  const { ligne, element } = cible;
  const { guide } = useGuideActif();
  const prenom = guide ? PRENOM_GUIDE[guide] : null;
  const [vue, setVue] = useState<"jour" | "exos" | "autre" | "passer">("jour");
  const [exos, setExos] = useState<string[] | null>(null);
  const [occupe, setOccupe] = useState(false);
  const bloque = envoi || occupe;

  const p: JourProjete<EtapeCycle> | null = element?.genre === "prevu" ? element.projete : null;
  const reservation = element?.genre === "prevu" ? element.intention : null;
  const pose = element?.genre === "pose" ? element.intention : null;
  const d = element ? descriptionElement(element, programme?.cycle ?? null) : null;
  const titre = d?.titre ?? (ligne.etat === "pas_de_seance" ? "Pas d’entraînement" : "Libre");
  const jourLong = new Date(ligne.date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  /* Se faire maintenant : la séance proposée, une réservation, ou une
     séance posée. Une réservation en conflit ne se lance qu'en le disant. */
  const faisableBrut = !!((p && element?.genre === "prevu" && (element.proposee || reservation)) || pose);
  const faisable = faisableBrut && !p?.conflit;
  const peutChanger = glissable(element);
  /* Changer les exercices de ce jour : la séance du programme qu'on peut
     réserver, ou sa réservation. */
  const modifiable = deplacable(element) && !!gen && !!programme;
  const [edition, setEdition] = useState<{ cible: CibleAffichee; ctx: ContexteComposition; lignes: LignePrescription[] } | null>(null);
  const [souci, setSouci] = useState<string | null>(null);
  /* L'effort de ce jour : une situation « moins d'énergie », d'un jour ou plus. */
  const energie = deGenre(situationsDuJour(situations ?? [], ligne.date), "energie");
  const energieLongue = !!energie && energie.debut !== energie.fin;
  const effortReglable = !ligne.passe && !!(p || pose) && situations !== null;
  const changerEffort = async (leger: boolean) => {
    if (bloque || leger === !!energie || energieLongue) return;
    setOccupe(true);
    const ok = leger
      ? (await creerSituation(userId, { debut: ligne.date, fin: ligne.date, reglages: { genre: "energie", mode: "leger" } })).ok
      : await arreterSituation(userId, energie!, aujourdhui);
    onResultat(ok ? { ok: true } : { ok: false, raison: "echec" }, leger ? "Une série de moins par exercice ce jour-là." : "Effort comme prévu ce jour-là.");
  };
  const ouvrirEdition = async () => {
    if (!p || !gen || !programme || bloque) return;
    setOccupe(true); setSouci(null);
    const c: CibleAffichee = { programmeId: programme.programme.id, etapeId: p.etape.id, rang: p.rang, date: ligne.date, reservationId: reservation?.id ?? null };
    const l = await lignesDuJour({ userId, cible: c, etape: { id: p.etape.id, nom: p.etape.nom }, gen, longueurCycle: programme.cycle.length });
    setOccupe(false);
    if (!l) { setSouci("Je n’arrive pas à lire les exercices de cette séance."); return; }
    const base = contexteDe(gen);
    setEdition({ cible: c, lignes: l, ctx: reservation?.location ? { ...base, lieu: reservation.location } : base });
  };
  /* Seule la PROCHAINE séance se passe (V9C) : c'est celle que l'app propose. */
  const passable = !!p && element?.genre === "prevu" && element.proposee && !p.conflit;
  const suivante = useMemo(() => {
    if (!p || !programme) return null;
    const tri = [...programme.cycle].sort((a, b) => a.position - b.position);
    const i = tri.findIndex((e) => e.id === p.etape.id);
    return i >= 0 && tri.length > 1 ? tri[(i + 1) % tri.length].nom : null;
  }, [p, programme]);

  const dureeBase = d?.duree ?? 45;
  const [duree, setDuree] = useState(dureeBase);
  const courte = duree < dureeBase;

  /* Les sept prochains jours, à partir d'aujourd'hui. */
  const sept = useMemo(() => Array.from({ length: 7 }, (_, i) => decaler(aujourdhui, i)), [aujourdhui]);
  const pris = (date: string) => {
    const l = lignes.find((x) => x.date === date);
    return !!l && l.elements.some((e) => e.genre === "prevu" || e.genre === "pose");
  };
  const fermeLe = (date: string) => {
    const l = lignes.find((x) => x.date === date);
    return !!l && (l.etat === "absence" || l.elements.some((e) => e.genre === "fait" || e.genre === "realisee"));
  };

  const geste = async (f: () => Promise<ResultatGeste>, ok: string) => {
    if (bloque) return;
    setOccupe(true);
    const r = await f();
    onResultat(r, ok);
  };

  const lancer = () => {
    if (courte) { onLancerCourt(pose ?? reservation ?? null, duree); return; }
    if (pose) onLancerIntention(pose);
    else if (reservation) onLancerIntention(reservation);
    else onLancerTete();
  };

  const voirExos = async () => {
    setVue("exos");
    if (exos) return;
    const fixee = pose ?? reservation;
    if (fixee) { setExos((fixee.exerciseList ?? []).map((e) => e.name)); return; }
    if (!p || !gen || !programme) { setExos([]); return; }
    /* Une prévision montre les exercices de SON occurrence (variété selon
       son passage), ceux qui seront réservés et lancés. */
    const ctx = contexteDe(gen);
    const [m, variete] = await Promise.all([modeleDeLEtape({ id: p.etape.id, nom: p.etape.nom }, ctx), lireVariete(userId)]);
    if (!m || !variete) { setExos([]); return; }
    const occ = modeleDeLOccurrence(m, { id: p.etape.id, rang: p.rang }, ctx, variete, programme.cycle.length);
    setExos(projeterPrescription(occ.lignes).map((e) => e.name));
  };

  const retour = vue !== "jour" ? () => setVue("jour") : null;
  const art = resolveArt({ title: titre });

  if (edition && p && gen && programme) {
    return (
      <FeuilleSeanceProgramme
        etape={p.etape} ctx={edition.ctx} lignes={edition.lignes} tousLes={programme.cycle.length}
        ceJour={{
          quand: jourLong,
          enregistrer: async (l) => {
            const r = await modifierCeJour({ userId, cible: edition.cible, avant: edition.lignes, lignes: l, aujourdhui, gen });
            if (!r.ok && r.raison === "echec") return "Ça n’a pas été enregistré. Réessaie dans un instant.";
            onResultat(r, `${titre} est changée pour ce jour-là.`);
            return null;
          },
        }}
        onClose={() => setEdition(null)}
        onEnregistre={() => setEdition(null)} />
    );
  }

  return (
    <FeuilleBas onClose={onClose} niveau={106}>
      <div className="px-5 pt-1 pb-3 flex items-start gap-3.5 flex-shrink-0">
        {element ? (
          <Photo img={art.img} pos="center 22%" className="flex-shrink-0" style={{ width: 76, height: 76, borderRadius: 20 }} />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="vy-label" style={{ color: "var(--text-3)" }}>{jourLong.charAt(0).toUpperCase() + jourLong.slice(1)}</p>
          <p className="text-[26px] leading-[1.1] truncate" style={{ color: "var(--text-0)", fontWeight: 800, fontVariationSettings: "var(--w-voix)" }}>{titre}</p>
          {d && !d.fait && (
            <p className="text-[13px] mt-0.5" style={{ color: "var(--text-2)" }}>
              <span className="vy-nombre">{d.duree}</span> min{d.nbExos > 0 && <> · <span className="vy-nombre">{d.nbExos}</span> exercices</>}
            </p>
          )}
        </div>
        <button onClick={retour ?? onClose} aria-label={retour ? "Retour" : "Fermer"} className="w-8 h-8 flex items-center justify-center cursor-pointer bg-transparent border-none flex-shrink-0">
          {retour ? <ChevronRight size={16} style={{ color: "var(--text-3)", transform: "rotate(180deg)" }} /> : <X size={16} style={{ color: "var(--text-3)" }} />}
        </button>
      </div>

      <div className="overflow-y-auto px-5 flex-1" style={{ scrollbarWidth: "none", paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        {vue === "exos" ? (
          <div>
            {exos === null ? (
              <p className="vy-corps" style={{ color: "var(--text-3)" }}>Je prépare la liste…</p>
            ) : exos.length === 0 ? (
              <p className="vy-corps" style={{ color: "var(--text-3)" }}>Les exercices se fixent quand tu la prépares.</p>
            ) : exos.map((n, i) => (
              <p key={i} className="text-[16px] py-2" style={{ color: "var(--text-1)", borderTop: i ? "1px solid rgba(var(--text-3-rgb),0.12)" : "none" }}>{n}</p>
            ))}
          </div>
        ) : vue === "autre" ? (
          <div>
            <p className="vy-corps" style={{ color: "var(--text-1)" }}>
              Tu choisis une séance du catalogue ou une des tiennes pour ce jour. « {titre} » passera au prochain jour d&apos;entraînement : elle n&apos;est ni faite, ni passée.
            </p>
            <BoutonAction disabled={bloque} onClick={() => onChoisirSeance(ligne.date, reservation?.id ? { id: reservation.id, date: ligne.date } : null)}>
              Choisir la séance
            </BoutonAction>
          </div>
        ) : vue === "passer" ? (
          <div>
            <p className="vy-corps" style={{ color: "var(--text-1)" }}>
              « {titre} » ne sera pas faite : pas de séance enregistrée, pas d&apos;EXP.{suivante ? ` La suivante, ${suivante}, prend sa place tout de suite.` : ""}
            </p>
            <BoutonAction disabled={bloque} onClick={() => p && void geste(() => passerLaSeance(userId, { etapeId: p.etape.id, rang: p.rang }), `${titre} est passée.`)}>
              Passer « {titre} »
            </BoutonAction>
          </div>
        ) : (
          <div className="flex flex-col">
            {d?.raison && (
              <p className="text-[13px] pl-2.5 mb-1" style={{ color: "var(--text-2)", borderLeft: "2px solid #8B5CF6" }}>
                {d.raison.charAt(0).toUpperCase() + d.raison.slice(1)}.
              </p>
            )}

            {/* Le jour : sept puces. Un jour pris échange sa séance. */}
            {peutChanger && (
              <Reglage nom="Jour">
                <div className="flex justify-between gap-1">
                  {sept.map((date) => {
                    const actif = date === ligne.date;
                    const ferme = !actif && fermeLe(date);
                    const estPris = !actif && pris(date);
                    return (
                      <button key={date} disabled={ferme || bloque} onClick={() => !actif && onDeplacer(element, date)}
                        aria-pressed={actif}
                        aria-label={new Date(date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" }) + (estPris ? ", déjà une séance" : "")}
                        className="flex flex-col items-center justify-center border-none cursor-pointer"
                        style={{
                          width: 36, height: 46, borderRadius: 13, lineHeight: 1.1,
                          background: actif ? "linear-gradient(135deg,#8B5CF6,#C13BC1)" : "rgba(var(--text-3-rgb),0.14)",
                          boxShadow: estPris ? "inset 0 0 0 1.5px rgba(139,92,246,.45)" : undefined,
                          opacity: ferme ? 0.35 : 1,
                        }}>
                        <span className="text-[11px]" style={{ color: actif ? "#fff" : "var(--text-2)" }}>{ABR_JOURS[jourDeSemaine(date) - 1]}</span>
                        <b className="vy-nombre text-[13px]" style={{ color: actif ? "#fff" : "var(--text-1)" }}>{Number(date.slice(8, 10))}</b>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[13px] mt-1.5" style={{ color: "var(--text-3)" }}>{element?.genre === "prevu" ? "Un jour déjà pris : les deux séances échangent leur place." : "Un jour déjà pris : elle s’y ajoute."}</p>
              </Reglage>
            )}

            {/* La durée : pour la faire maintenant, raccourcie si besoin. */}
            {faisable && (
              <Reglage nom="Durée">
                <div className="flex items-center gap-2.5">
                  <Pas label="Moins" onClick={() => setDuree((m) => Math.max(DUREE_MIN, m - DUREE_PAS))} disabled={duree <= DUREE_MIN}>−</Pas>
                  <b className="vy-nombre text-[26px] text-center" style={{ color: "var(--text-0)", minWidth: 44 }}>{duree}</b>
                  <span className="text-[13px] -ml-1.5" style={{ color: "var(--text-2)" }}>min</span>
                  <Pas label="Plus" onClick={() => setDuree((m) => Math.min(dureeBase, m + DUREE_PAS))} disabled={duree >= dureeBase}>+</Pas>
                </div>
                <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>
                  {courte ? "Version courte : les exercices principaux d’abord." : "Toute la séance, comme prévu."}
                </p>
              </Reglage>
            )}

            {effortReglable && (
              <Reglage nom="Effort">
                <div role="radiogroup" className="flex gap-1 p-[3px] rounded-[13px]" style={{ background: "rgba(var(--text-3-rgb),0.16)" }}>
                  {[{ l: "Comme prévu", v: false }, { l: "Plus léger", v: true }].map((o) => {
                    const actif = o.v === !!energie;
                    return (
                      <button key={o.l} type="button" role="radio" aria-checked={actif} disabled={bloque || energieLongue} onClick={() => void changerEffort(o.v)}
                        className="flex-1 py-2 px-1.5 rounded-[10px] text-[13px] font-semibold border-none cursor-pointer"
                        style={{ background: actif ? "rgb(var(--surface-rgb))" : "transparent", color: actif ? "var(--text-0)" : "var(--text-2)" }}>
                        {o.l}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>
                  {energieLongue ? `Déjà plus léger jusqu’au ${dateCourte(energie!.fin)} : change-le dans « En ce moment ».`
                    : energie ? "Une série de moins par exercice, si tu la fais ce jour-là." : "Plus léger : une série de moins par exercice ce jour-là."}
                </p>
              </Reglage>
            )}

            {souci && <p role="alert" className="text-[13px] mt-2" style={{ color: "var(--feu-encre)" }}>{souci}</p>}
            <div className="mt-2">
              {modifiable && <Porte label="Changer les exercices" sous="Seulement ce jour-là" disabled={bloque} onClick={() => void ouvrirEdition()} />}
              {(p || pose) && <Porte label="Voir les exercices" onClick={() => void voirExos()} />}
              {p && <Porte label="Échanger contre une autre séance" sous="Du catalogue ou une des tiennes" onClick={() => setVue("autre")} />}
              {passable && <Porte label="Passer cette séance" sous={suivante ? `Elle ne sera pas faite, ${suivante} prend sa place.` : "Elle ne sera pas faite."} onClick={() => setVue("passer")} />}
              {p && (
                <Porte label="Pas d’entraînement ce jour-là" sous="La séance passe au jour suivant." disabled={bloque}
                  onClick={() => void geste(() => retirerLeJour(userId, ligne.date, reservation?.id ?? null, ligne.enPlus && !ligne.parSituation ? "seance_en_plus" : null), "Jour retiré, la séance passe au suivant.")} />
              )}
              {p?.conflit && faisableBrut && (
                <Porte label="La faire quand même" sous={CONFLITS[p.conflit]} disabled={bloque}
                  onClick={() => { if (reservation) onLancerIntention(reservation); else onLancerTete(); }} />
              )}
              {!p && !pose && (ligne.etat === "libre" || ligne.etat === "occupe") && (
                <Porte label="Choisir une séance" sous="Du catalogue ou une des tiennes" disabled={bloque} onClick={() => onChoisirSeance(ligne.date, null)} />
              )}
              {ligne.etat === "pas_de_seance" && (
                /* Retiré par un sport ou un événement : le remettre est un choix
                   écrit, qui l'emporte sur la situation. */
                <Porte label="Remettre ce jour" sous={ligne.parSituation ? "Il est pris par ce que tu as noté dans « En ce moment »." : undefined} disabled={bloque}
                  onClick={() => void geste(() => regleDuJour(userId, ligne.date, ligne.parSituation ? "seance_en_plus" : null), "Jour remis.")} />
              )}
              {ligne.etat === "libre" && !ligne.entrainement && (
                <Porte label="M’entraîner ce jour-là" sous="Seulement cette semaine" disabled={bloque}
                  onClick={() => void geste(() => regleDuJour(userId, ligne.date, "seance_en_plus"), "Jour ajouté.")} />
              )}
              {ligne.enPlus && !p && (
                <Porte label="Retirer ce jour en plus" disabled={bloque} onClick={() => void geste(() => (ligne.parSituation ? retirerLeJour(userId, ligne.date, null) : regleDuJour(userId, ligne.date, null)), "Jour retiré.")} />
              )}
            </div>

            {faisable && (
              <BoutonAction disabled={bloque} onClick={lancer}>
                {ligne.aujourdhui ? "La faire maintenant" : "La faire aujourd’hui"}{courte ? ` · ${duree} min` : ""}
              </BoutonAction>
            )}
            <button type="button"
              onClick={() => onDemander(`Pour ${jourLong}${element ? `, ma séance « ${titre} »` : ""} : `)}
              className="w-full mt-2 py-2 flex items-center justify-center gap-2 bg-transparent border-none cursor-pointer text-[13px] font-semibold"
              style={{ color: "var(--text-2)" }}>
              <VisageGuide guide={guide} etat="listen" size={24} />
              {prenom ? `Demander à ${prenom} pour ce jour` : "Demander à ton Guide pour ce jour"}
            </button>
          </div>
        )}
      </div>
    </FeuilleBas>
  );
}

function Reglage({ nom, children }: { nom: string; children: React.ReactNode }) {
  return (
    <div className="grid items-start py-3" style={{ gridTemplateColumns: "62px minmax(0,1fr)", gap: "4px 10px", borderTop: "1px solid rgba(var(--text-3-rgb),0.12)" }}>
      <span className="text-[13px] font-semibold pt-3" style={{ color: "var(--text-2)" }}>{nom}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Pas({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled}
      className="grid place-items-center border-none cursor-pointer text-[20px] font-semibold"
      style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(139,92,246,.1)", color: "var(--exp-encre)", opacity: disabled ? 0.35 : 1 }}>
      {children}
    </button>
  );
}

function Porte({ label, sous, onClick, disabled }: { label: string; sous?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="grid items-center w-full text-left bg-transparent border-none cursor-pointer py-[11px]"
      style={{ gridTemplateColumns: "minmax(0,1fr) 18px", gap: "2px 8px", borderTop: "1px solid rgba(var(--text-3-rgb),0.12)", opacity: disabled ? 0.5 : 1 }}>
      <span className="text-[16px] font-semibold" style={{ color: "var(--text-0)" }}>{label}</span>
      <ChevronRight size={15} strokeWidth={2.4} style={{ color: "var(--text-3)", gridRow: sous ? "1 / span 2" : undefined, gridColumn: 2 }} />
      {sous && <span className="text-[13px]" style={{ color: "var(--text-2)", gridColumn: 1 }}>{sous}</span>}
    </button>
  );
}

function BoutonAction({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} disabled={disabled} onClick={onClick}
      className="w-full mt-4 py-3 rounded-2xl text-[16px] font-extrabold text-white cursor-pointer border-none"
      style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)", opacity: disabled ? 0.6 : 1 }}>
      {children}
    </motion.button>
  );
}

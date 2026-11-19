"use client";

/* ════════════════════════════════════════════════════════════════════
   ENTRAÎNEMENT · LOT 3 · LA VUE « PROGRAMME » (maquette, écran Programme)

   De haut en bas :
   · le programme daté en cours, s'il y en a un (une ligne de temps et
     son arrivée ; le cycle est alors en pause) ;
   · le cycle : son nom (renommable), depuis quand, puis LA PHRASE dont
     chaque mot souligné est un réglage (les jours, la durée visée, le
     lieu, l'objectif, la zone) ;
   · la pile des séances, dans l'ordre où elles reviennent : toucher une
     séance ouvre son éditeur ;
   · « Comment il décide » : quatre règles en phrases, le mot tourne au
     toucher ;
   · « Ses versions » : ce qui a changé, et revenir à la version d'avant.

   Ce qui DÉCIDE est pur (`vueProgramme.ts`, `reglagesProgramme.ts`) ;
   ce qui écrit passe par les écritures habituelles, puis le journal.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ChevronRight, Pencil, Repeat } from "lucide-react";
import { Photo } from "@/components/entrainement/PhotoSeance";
import FeuilleSeanceProgramme from "@/components/programme/FeuilleSeanceProgramme";
import { resolveArt } from "@/lib/workoutArt";
import { composerEtape, projeterPrescription, type LignePrescription } from "@/lib/banqueEtapes";
import { contexteDe, persistLieu, type GenInput } from "@/lib/planning";
import { prioritesDeLIntention } from "@/lib/composeurProgramme";
import { modeleDeLEtape } from "@/lib/prescription";
import { estimerMinutes, itemDExercice } from "@/lib/dureeLibre";
import type { ProgrammeEtCycle, EtapeCycle } from "@/lib/programme";
import type { Calendrier } from "@/lib/projection";
import type { Rythme } from "@/lib/rythmeSeance";
import type { EtatParcours } from "@/hooks/useJournee";
import { useReglagesProgramme } from "@/hooks/useReglagesProgramme";
import {
  REGLES, colonneRegle, ecrireReglages, motRegle, valeurRegle, valeurSuivante, type CleRegle,
} from "@/lib/reglagesProgramme";
import { lireHistoire, noterVersion, revenirA, type HistoireProgramme } from "@/lib/programmeVersions";
import {
  DUREES_VISEES, LIEUX, dateVersion, etiquettePile, lignesVersions, motBut, motDuree, motFois, motJours,
  motLieu, motZone, pileDuCycle, semaineDuProgramme,
} from "@/lib/vueProgramme";
import { EVT_JOURNEE } from "@/lib/finSeance";

type Mot = "duree" | "lieu";

export default function VueProgramme({
  userId, programme, prochaine, rythme, gen, calendrier, parcours, aujourdhui, guide,
  onMesJours, onMonProgramme, onSemaineParcours, onChange, onToast,
}: {
  userId: string;
  programme: ProgrammeEtCycle | null;
  /** La prochaine étape du cycle (celle que le planning proposera). */
  prochaine: { id: string } | null;
  rythme: Rythme | null;
  gen: GenInput | null;
  calendrier: Calendrier | null;
  parcours: EtatParcours | null;
  aujourdhui: string;
  guide: string | null;
  onMesJours: () => void;
  onMonProgramme: () => void;
  onSemaineParcours: () => void;
  onChange: () => void;
  onToast: (m: string) => void;
}) {
  const reglages = useReglagesProgramme(userId);
  const [histoire, setHistoire] = useState<HistoireProgramme | null | undefined>(undefined);
  const [lecture, setLecture] = useState(0);
  const [motOuvert, setMotOuvert] = useState<Mot | null>(null);
  const [renommer, setRenommer] = useState<string | null>(null);
  const [edition, setEdition] = useState<EtapeCycle | null>(null);
  const [modeles, setModeles] = useState<{ cle: string; lignes: Record<string, LignePrescription[]> } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [toutesVersions, setToutesVersions] = useState(false);

  const ctx = useMemo(() => (gen ? contexteDe(gen) : null), [gen]);
  const cycle = useMemo(() => programme?.cycle ?? [], [programme]);
  const pile = useMemo(() => pileDuCycle(cycle, prochaine?.id ?? null), [cycle, prochaine]);
  const cleModeles = `${programme?.programme.id ?? ""}|${ctx?.lieu ?? ""}|${lecture}`;

  /* L'histoire : le journal, les programmes, les séances faites. */
  useEffect(() => {
    let vivant = true;
    void lireHistoire(userId).then((h) => { if (vivant) setHistoire(h); });
    return () => { vivant = false; };
  }, [userId, lecture]);

  /* Les exercices de chaque séance, pour la pile et l'éditeur. */
  useEffect(() => {
    if (!ctx || cycle.length === 0) return;
    let vivant = true;
    void Promise.all(cycle.map(async (e) => [e.id, (await modeleDeLEtape(e, ctx))?.lignes ?? composerEtape(e.nom, ctx)] as const))
      .then((paires) => { if (vivant) setModeles({ cle: cleModeles, lignes: Object.fromEntries(paires) }); });
    return () => { vivant = false; };
  }, [ctx, cycle, cleModeles]);
  const lignesDe = useCallback((e: EtapeCycle): LignePrescription[] =>
    (modeles?.cle === cleModeles ? modeles.lignes[e.id] : undefined) ?? (ctx ? composerEtape(e.nom, ctx) : []), [modeles, cleModeles, ctx]);

  const relire = () => { setLecture((n) => n + 1); onChange(); };

  /* ── Les écritures ── */

  const choisirDuree = async (min: number | null) => {
    if (!reglages || envoi) return;
    const avant = reglages.dureeMin;
    setMotOuvert(null);
    if (avant === min) return;
    setEnvoi(true);
    const ok = await ecrireReglages(userId, { duree_cible_min: min });
    if (ok) {
      await noterVersion(userId, {
        programmeId: programme?.programme.id ?? null, genre: "duree",
        texte: `Durée : ${min === null ? "plus de limite" : `${min} min visées`}${avant === null ? "" : ` au lieu de ${avant} min`}`,
        avant: { duree: avant }, apres: { duree: min },
      });
      relire();
    } else onToast("La durée n’a pas été enregistrée. Réessaie dans un instant.");
    setEnvoi(false);
  };

  const choisirLieu = async (l: (typeof LIEUX)[number]) => {
    if (!gen || envoi) return;
    setMotOuvert(null);
    if (l.ctx === gen.ctx) return;
    const avant = LIEUX.find((x) => x.ctx === gen.ctx);
    setEnvoi(true);
    try {
      await persistLieu(userId, l.patch);
      await noterVersion(userId, {
        programmeId: programme?.programme.id ?? null, genre: "lieu",
        texte: `Lieu : ${l.mot}${avant ? ` au lieu de ${avant.mot}` : ""}`,
        avant: avant?.patch ?? null, apres: l.patch,
      });
      relire();
    } catch {
      onToast("Le lieu n’a pas été enregistré. Réessaie dans un instant.");
    }
    setEnvoi(false);
  };

  const tournerRegle = async (cle: CleRegle) => {
    if (!reglages || envoi) return;
    const avant = valeurRegle(reglages, cle);
    const apres = valeurSuivante(cle, avant);
    const regle = REGLES.find((r) => r.cle === cle)!;
    setEnvoi(true);
    const ok = await ecrireReglages(userId, colonneRegle(cle, apres));
    if (ok) {
      await noterVersion(userId, {
        programmeId: programme?.programme.id ?? null, genre: "regle",
        texte: `${regle.avant}${motRegle(cle, apres)}${regle.apres}`.replace(/\.$/, ""),
        avant: colonneRegle(cle, avant), apres: colonneRegle(cle, apres),
      });
      /* La variété et la rotation décident des séances préparées : la
         journée se relit. */
      if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT_JOURNEE));
      relire();
    } else onToast("La règle n’a pas été enregistrée. Réessaie dans un instant.");
    setEnvoi(false);
  };

  const enregistrerNom = async () => {
    if (!programme || renommer === null) return;
    const nom = renommer.trim().slice(0, 60);
    setRenommer(null);
    if (!nom || nom === programme.programme.nom) return;
    setEnvoi(true);
    const { createClient } = await import("@/lib/supabase");
    const { error } = await createClient().from("programmes").update({ nom }).eq("id", programme.programme.id).eq("user_id", userId);
    if (error) onToast("Le nom n’a pas été enregistré. Réessaie dans un instant.");
    else {
      await noterVersion(userId, {
        programmeId: programme.programme.id, genre: "nom",
        texte: `Nom : « ${nom} » au lieu de « ${programme.programme.nom} »`,
        avant: { nom: programme.programme.nom }, apres: { nom },
      });
      relire();
    }
    setEnvoi(false);
  };

  const revenir = async (v: NonNullable<ReturnType<typeof lignesVersions>[number]["annulable"]>) => {
    if (envoi) return;
    setEnvoi(true);
    const ok = await revenirA(userId, v, aujourdhui, ctx);
    onToast(ok ? "C’est revenu comme avant." : "Ça n’a pas pris. Réessaie dans un instant.");
    relire();
    setEnvoi(false);
  };

  /* ── Ce qui s'affiche ── */

  const versions = useMemo(() => histoire
    ? lignesVersions(histoire.journal, histoire.programmes, programme?.programme.id ?? null, guide)
    : [], [histoire, programme, guide]);
  const jours = calendrier?.choisi ? calendrier.jours : [];
  const priorites = prioritesDeLIntention(programme?.programme.intention ?? null);
  const enPause = !!parcours;

  return (
    <div className="mt-4">
      {parcours && <BlocParcours p={parcours} aujourdhui={aujourdhui} cycleNom={programme?.programme.nom ?? null} onSemaine={onSemaineParcours} />}

      {programme && (
        <section className={parcours ? "mt-8" : ""}>
          {/* Le nom, renommable */}
          {renommer === null ? (
            <div className="flex items-center gap-2">
              <h2 className="vy-titre" style={{ fontSize: 26, color: "var(--text-0)" }}>{programme.programme.nom}</h2>
              <button type="button" aria-label="Renommer le programme" onClick={() => setRenommer(programme.programme.nom)}
                className="w-8 h-8 flex items-center justify-center bg-transparent border-none cursor-pointer" style={{ color: "var(--text-3)" }}>
                <Pencil size={15} />
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); void enregistrerNom(); }} className="flex items-center gap-2">
              <input autoFocus value={renommer} maxLength={60} onChange={(e) => setRenommer(e.target.value)} onBlur={() => void enregistrerNom()}
                aria-label="Nom du programme"
                className="vy-titre flex-1 min-w-0 bg-transparent outline-none border-b-2"
                style={{ fontSize: 26, color: "var(--text-0)", borderColor: "var(--exp-encre)" }} />
            </form>
          )}
          {histoire?.depuis && (
            <p className="text-[13px] mt-1" style={{ color: "var(--text-2)" }}>
              {enPause ? "En pause pendant ton programme daté · " : <><span className="vy-nombre">{semaineDuProgramme(histoire.depuis, aujourdhui)}</span><sup>e</sup> semaine · </>}
              <span className="vy-nombre">{histoire.faites}</span> séance{histoire.faites > 1 ? "s" : ""} faite{histoire.faites > 1 ? "s" : ""} depuis le {dateVersion(histoire.depuis, aujourdhui)}
            </p>
          )}

          {/* La phrase */}
          <p className="mt-4 text-[20px] leading-[1.5]" style={{ color: "var(--text-0)", fontWeight: 500 }}>
            Je m’entraîne{" "}
            {jours.length > 0 ? (
              <><MotSouligne onClick={onMesJours}>{motFois(jours.length)}</MotSouligne> par semaine, le <MotSouligne onClick={onMesJours}>{motJours(jours)}</MotSouligne></>
            ) : (
              <MotSouligne onClick={onMesJours}>quand ça me va</MotSouligne>
            )}
            {reglages && <>, <MotSouligne actif={motOuvert === "duree"} onClick={() => setMotOuvert(motOuvert === "duree" ? null : "duree")}>{motDuree(reglages.dureeMin)}</MotSouligne></>}
            {gen && <>, <MotSouligne actif={motOuvert === "lieu"} onClick={() => setMotOuvert(motOuvert === "lieu" ? null : "lieu")}>{motLieu(gen.ctx)}</MotSouligne></>}
            . Je veux <MotSouligne onClick={onMonProgramme}>{motBut(gen?.goals ?? [])}</MotSouligne>, <MotSouligne onClick={onMonProgramme}>{motZone(priorites)}</MotSouligne>.
          </p>
          {motOuvert === "duree" && (
            <Choix>
              {DUREES_VISEES.map((d) => (
                <Puce key={String(d)} actif={(reglages?.dureeMin ?? null) === d} onClick={() => void choisirDuree(d)}>
                  {d === null ? "Sans limite" : `${d} min`}
                </Puce>
              ))}
              <p className="w-full text-[13px] mt-1" style={{ color: "var(--text-3)" }}>Une séance plus longue se raccourcit au lancement : les exercices principaux d’abord.</p>
            </Choix>
          )}
          {motOuvert === "lieu" && gen && (
            <Choix>
              {LIEUX.map((l) => <Puce key={l.ctx} actif={gen.ctx === l.ctx} onClick={() => void choisirLieu(l)}>{l.mot}</Puce>)}
            </Choix>
          )}
          <p className="text-[13px] mt-2" style={{ color: "var(--text-3)" }}>Touche un mot souligné pour le changer.</p>

          {/* La pile */}
          <TeteBloc titre="Tes séances" sous="dans l’ordre où elles reviennent" />
          <div className="overflow-hidden" style={{ borderRadius: "var(--r-bloc)", background: "rgba(var(--surface-rgb),0.9)", border: "1px solid rgba(var(--text-3-rgb),0.16)" }}>
            {pile.map((e, i) => {
              const lignes = lignesDe(e);
              const minutes = lignes.length ? estimerMinutes(projeterPrescription(lignes).map(itemDExercice)) : null;
              const art = resolveArt({ title: e.nom });
              const premiere = i === 0;
              return (
                <button key={e.id} type="button" onClick={() => setEdition(e)}
                  className="vy-filet w-full flex items-center gap-3 text-left bg-transparent border-none cursor-pointer"
                  style={{ padding: premiere ? "14px 14px" : "10px 14px" }}>
                  <Photo img={art.img} pos="center 22%" className="flex-shrink-0"
                    style={{ width: premiere ? 64 : 44, height: premiere ? 64 : 44, borderRadius: premiere ? 16 : 12 }} />
                  <span className="flex-1 min-w-0">
                    <small className="block text-[11px] font-semibold" style={{ color: premiere ? "var(--exp-encre)" : "var(--text-3)" }}>{etiquettePile(i)}</small>
                    <b className="block truncate" style={{ fontSize: premiere ? 18 : 16, color: "var(--text-0)" }}>{e.nom}</b>
                    {premiere && (
                      <span className="block text-[13px] leading-snug" style={{ color: "var(--text-2)" }}>
                        <span className="vy-nombre">{lignes.length}</span> exercices{minutes ? <> · <span className="vy-nombre">{minutes}</span> min</> : null}
                        {rythme && rythme !== "volume" && !enPause ? ` · cette fois en version ${rythme === "lourd" ? "lourde : moins de répétitions, plus de charge" : "endurance : plus de répétitions, moins de charge"}` : ""}
                      </span>
                    )}
                  </span>
                  <ChevronRight size={16} style={{ color: "var(--text-3)", flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-2.5 text-[13px]" style={{ color: "var(--text-3)" }}>
            <Repeat size={14} /> Et ça recommence.
          </div>

          {/* Les règles */}
          {reglages && (
            <>
              <TeteBloc titre="Comment il décide" sous="touche pour changer" />
              <div className="flex flex-col gap-3">
                {REGLES.map((r) => (
                  <p key={r.cle} className="vy-corps" style={{ color: "var(--text-0)" }}>
                    {r.avant}<MotSouligne onClick={() => void tournerRegle(r.cle)}>{motRegle(r.cle, valeurRegle(reglages, r.cle))}</MotSouligne>{r.apres}
                  </p>
                ))}
              </div>
            </>
          )}

          {/* Les versions */}
          {versions.length > 0 && (
            <>
              <TeteBloc titre="Ses versions" sous="rien n’est perdu" />
              <div className="flex flex-col">
                {(toutesVersions ? versions : versions.slice(0, 5)).map((v) => (
                  <div key={v.cle} className="vy-filet flex gap-3 py-2.5">
                    <small className="vy-nombre text-[11px] pt-0.5 flex-shrink-0" style={{ color: "var(--text-3)", width: 54 }}>{dateVersion(v.date, aujourdhui)}</small>
                    <div className="flex-1 min-w-0 text-[13px] leading-snug" style={{ color: v.annulee ? "var(--text-3)" : "var(--text-0)", textDecoration: v.annulee ? "line-through" : "none" }}>
                      {v.texte} <i style={{ color: "var(--text-3)", fontStyle: "normal" }}>· {v.auteur}</i>
                      {v.annulable && (
                        <button type="button" disabled={envoi} onClick={() => void revenir(v.annulable!)}
                          className="block mt-1 text-[13px] font-semibold bg-transparent border-none p-0 cursor-pointer" style={{ color: "var(--exp-encre)" }}>
                          Revenir à la version d’avant
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {versions.length > 5 && !toutesVersions && (
                <button type="button" onClick={() => setToutesVersions(true)} className="mt-1 text-[13px] font-semibold bg-transparent border-none p-0 cursor-pointer" style={{ color: "var(--exp-encre)" }}>
                  Voir les <span className="vy-nombre">{versions.length - 5}</span> autres
                </button>
              )}
            </>
          )}

          <button type="button" onClick={onMonProgramme}
            className="mt-6 w-full flex items-center justify-between px-4 py-3.5 text-left cursor-pointer"
            style={{ borderRadius: "var(--r-bloc)", background: "rgba(var(--tint-violet-rgb),0.55)", border: "1px solid rgba(var(--accent-rgb),0.16)", color: "var(--exp-encre)" }}>
            <span className="text-[16px] font-semibold">Changer de programme</span>
            <ChevronRight size={18} />
          </button>
        </section>
      )}

      <AnimatePresence>
        {edition && ctx && (
          <FeuilleSeanceProgramme
            key={edition.id}
            etape={edition}
            ctx={ctx}
            lignes={lignesDe(edition)}
            tousLes={cycle.length}
            onClose={() => setEdition(null)}
            onEnregistre={(m) => { setEdition(null); onToast(m); relire(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Les morceaux ─────────────────────────────────────────────────────── */

function MotSouligne({ children, onClick, actif = false }: { children: React.ReactNode; onClick: () => void; actif?: boolean }) {
  return (
    /* Un span et pas un <button> : un bouton est un bloc en ligne, et la
       ligne se coupait juste avant le point qui le suit. */
    <span role="button" tabIndex={0} onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      className="cursor-pointer"
      style={{
        color: "var(--exp-encre)", textDecoration: "underline", textDecorationStyle: "dotted",
        textDecorationThickness: 2, textUnderlineOffset: 5, background: actif ? "rgba(var(--accent-rgb),0.12)" : "transparent", borderRadius: 4,
      }}>
      {children}
    </span>
  );
}

function Choix({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2 mt-3">{children}</div>;
}

function Puce({ children, actif, onClick }: { children: React.ReactNode; actif: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="px-3.5 py-2 rounded-full text-[13px] font-semibold cursor-pointer whitespace-nowrap"
      style={{
        background: actif ? "var(--exp-encre)" : "rgba(var(--surface-rgb),0.9)",
        color: actif ? "#fff" : "var(--text-0)",
        border: actif ? "none" : "1px solid rgba(var(--text-3-rgb),0.25)",
      }}>
      {children}
    </button>
  );
}

function TeteBloc({ titre, sous }: { titre: string; sous: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 mt-7 mb-2.5">
      <h3 className="vy-sous" style={{ color: "var(--text-0)" }}>{titre}</h3>
      <span className="text-[13px]" style={{ color: "var(--text-3)" }}>{sous}</span>
    </div>
  );
}

/** Le programme daté en cours : sa ligne de temps et son arrivée. */
function BlocParcours({ p, aujourdhui, cycleNom, onSemaine }: { p: EtatParcours; aujourdhui: string; cycleNom: string | null; onSemaine: () => void }) {
  const def = p.lu.def;
  const semaine = Math.min(def.semaines, Math.max(1, Math.floor((new Date(aujourdhui).getTime() - new Date(p.lu.debut).getTime()) / (7 * 86400000)) + 1));
  const part = p.cal.total > 0 ? p.cal.faits / p.cal.total : 0;
  const phase = def.phases.find((ph) => semaine <= ph.jusqua) ?? def.phases[def.phases.length - 1];
  const seances = phase?.seances ?? [];
  const finDite = new Date(p.cal.fin + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  return (
    <section>
      <h2 className="vy-titre" style={{ fontSize: 26, color: "var(--text-0)" }}>{def.titre}</h2>
      <p className="text-[13px] mt-1" style={{ color: "var(--text-2)" }}>Un programme de Vaiiya · <span className="vy-nombre">{def.semaines}</span> semaines</p>
      <div className="relative mt-5 mb-7" style={{ height: 34 }}>
        <div className="absolute left-0 right-[64px] top-[10px] h-[3px] rounded-full" style={{ background: "rgba(var(--text-3-rgb),0.22)" }} />
        <div className="absolute left-0 top-[10px] h-[3px] rounded-full" style={{ width: `calc((100% - 64px) * ${part})`, background: "#2BD4A0" }} />
        {Array.from({ length: def.semaines }, (_, i) => (
          <span key={i} className="absolute top-[18px] text-[11px]" style={{ left: `calc((100% - 64px) * ${i / def.semaines})`, color: "var(--text-3)" }}>S{i + 1}</span>
        ))}
        <span className="absolute right-0 top-0 text-[11px] text-right leading-tight font-semibold" style={{ color: "var(--text-0)", width: 60 }}>Test final<br />{finDite}</span>
      </div>
      <p className="text-[20px] leading-[1.5]" style={{ color: "var(--text-0)", fontWeight: 500 }}>
        Semaine <span className="vy-nombre">{semaine}</span> sur <span className="vy-nombre">{def.semaines}</span>
        {p.rang ? <>, {p.rang.toLocaleLowerCase("fr-FR")}</> : null}. Je m’entraîne le <MotSouligne onClick={onSemaine}>{motJours(p.lu.jours)}</MotSouligne>.
      </p>
      {cycleNom && <p className="text-[13px] mt-2" style={{ color: "var(--text-2)" }}>« {cycleNom} » est en pause. Il reprend où tu l’as laissé à la fin du programme.</p>}
      {seances.length > 0 && (
        <>
          <TeteBloc titre={seances.length > 1 ? `Ses ${seances.length === 2 ? "deux" : seances.length} séances` : "Sa séance"} sous={seances.length > 1 ? "en alternance" : "cette phase"} />
          <div className="overflow-hidden" style={{ borderRadius: "var(--r-bloc)", background: "rgba(var(--surface-rgb),0.9)", border: "1px solid rgba(var(--text-3-rgb),0.16)" }}>
            {seances.map((s, i) => (
              <div key={s + i} className="vy-filet flex items-center gap-3" style={{ padding: "10px 14px" }}>
                <Photo img={resolveArt({ title: s }).img} pos="center 22%" className="flex-shrink-0" style={{ width: 44, height: 44, borderRadius: 12 }} />
                <span className="flex-1 min-w-0">
                  <small className="block text-[11px] font-semibold" style={{ color: i === 0 ? "var(--exp-encre)" : "var(--text-3)" }}>{i === 0 ? "En alternance" : "Puis"}</small>
                  <b className="block truncate text-[16px]" style={{ color: "var(--text-0)" }}>{s}</b>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

"use client";

/* ════════════════════════════════════════════════════════════════════
   UNE SITUATION « EN CE MOMENT » : LA DÉCLARER, LA CHANGER, L'ARRÊTER
   (maquette « Entraînement repensé », lot 2)

   Une feuille par genre, la même forme partout : ce qu'on règle, la
   période, puis « Ce que ça change » AVANT de valider, et un bouton qui
   redit la date de fin. Rien ne s'écrit avant le bouton.

   ⚠️ LES RÈGLES VIVENT DANS `lib/situations.ts`, l'écriture dans
   `lib/situationsBase.ts`. Cette feuille montre et déclare.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import FeuilleBas from "@/components/semaine/FeuilleBas";
import ExerciseThumb from "@/components/seance/ExerciseThumb";
import Silhouette from "@/components/situations/Silhouette";
import { contexteDe, type GenInput } from "@/lib/planning";
import { modeleDeLEtape } from "@/lib/prescription";
import type { ProgrammeEtCycle } from "@/lib/programme";
import { decaler } from "@/lib/projection";
import { baseZone, LE_MIEN } from "@/lib/zonesMouvements";
import {
  dateCourte, effetGene, JOURS_MAX, JOURS_REEVALUATION, lesJours, MINUTES_MAX, MINUTES_MIN, nomGene, pausesDecidees,
  type EffetSeance, type EtatMouvement, type GenreSituation, type LieuSituation, type ModeGene,
  type ReglagesSituation, type SeancePourGene, type Situation,
} from "@/lib/situations";
import { arreterSituation, creerSituation, modifierSituation } from "@/lib/situationsBase";

const DUREES: { j: number; label: string }[] = [
  { j: 7, label: "1 semaine" }, { j: 14, label: "2 semaines" }, { j: 30, label: "1 mois" }, { j: 0, label: "Je te dirai" },
];
const ETAT: Record<EtatMouvement, string> = { eviter: "à éviter", leger: "plus léger", garder: "sans changement" };
const SUIVANT: Record<EtatMouvement, EtatMouvement> = { eviter: "leger", leger: "garder", garder: "eviter" };

const TITRES: Record<GenreSituation, string> = {
  moins_de_temps: "J’ai moins de temps",
  gene: "Où est-ce que ça fait mal ?",
  energie: "Je manque d’énergie",
  materiel: "Je n’ai pas mon matériel",
  evenement: "J’ai un événement",
  autre_sport: "Je fais un autre sport",
  jours_moment: "Mes jours changent un moment",
};
const LETTRES = ["L", "M", "M", "J", "V", "S", "D"];
const JOURS_GENRE = (g: GenreSituation) => g === "autre_sport" || g === "jours_moment";

export default function FeuilleSituation({
  userId, genre, existante, programme, gen, aujourdhui, onClose, onFini, onAbsence, joursChoisis = true, onMesJours,
}: {
  userId: string;
  genre: GenreSituation;
  /** La situation en cours, pour la changer ou l'arrêter. */
  existante: Situation | null;
  programme: ProgrammeEtCycle | null;
  gen: GenInput | null;
  aujourdhui: string;
  onClose: () => void;
  /** Une écriture a eu lieu : la phrase à dire. */
  onFini: (message: string) => void;
  /** « Moins d'énergie » → « Je fais une pause » ouvre l'absence. */
  onAbsence?: () => void;
  /** Sans jours choisis, un sport et des jours qui changent n'auraient
   *  aucun effet : on les choisit d'abord. */
  joursChoisis?: boolean;
  onMesJours?: () => void;
}) {
  const r0 = existante?.reglages;
  const [jours, setJours] = useState<number | null>(existante ? null : 14);
  /* Un événement : son jour est la fin, et la situation commence la veille. */
  const [dateEvt, setDateEvt] = useState(existante && genre === "evenement" ? existante.fin : decaler(aujourdhui, 7));
  const [nom, setNom] = useState(existante?.motif ?? "");
  const [semaine, setSemaine] = useState<Set<number>>(new Set(r0?.genre === "autre_sport" || r0?.genre === "jours_moment" ? r0.jours : []));
  const fin = genre === "evenement" ? dateEvt
    : jours === null && existante ? existante.fin : decaler(aujourdhui, jours || JOURS_REEVALUATION);
  const debut = genre === "evenement" ? (dateEvt > aujourdhui ? decaler(dateEvt, -1) : dateEvt)
    : existante ? existante.debut : aujourdhui;
  const basculeJour = (j: number) => setSemaine((p) => { const n = new Set(p); if (n.has(j)) n.delete(j); else n.add(j); return n; });
  const [minutes, setMinutes] = useState(r0?.genre === "moins_de_temps" ? r0.minutes : 25);
  const [lieu, setLieu] = useState<LieuSituation>(r0?.genre === "materiel" ? r0.lieu : "poids");
  const [zones, setZones] = useState<Set<string>>(new Set(r0?.genre === "gene" ? r0.zones : []));
  const [mode, setMode] = useState<ModeGene>(r0?.genre === "gene" ? r0.mode : "eviter");
  const [choix, setChoix] = useState<Record<string, EtatMouvement>>(r0?.genre === "gene" ? r0.choix ?? {} : {});
  const [pauses, setPauses] = useState<Record<string, boolean>>(r0?.genre === "gene" ? r0.pauses ?? {} : {});
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [arreter, setArreter] = useState(false);

  /* Les séances du programme, pour l'aperçu d'une gêne : la liste de
     chaque étape, telle qu'elle se compose pour le lieu des réglages. */
  const [seances, setSeances] = useState<SeancePourGene[] | null>(null);
  useEffect(() => {
    if (genre !== "gene" || !programme || !gen) return;
    let vivant = true;
    const ctx = contexteDe(gen);
    const tri = [...programme.cycle].sort((a, b) => a.position - b.position);
    Promise.all(tri.map((e) => modeleDeLEtape({ id: e.id, nom: e.nom }, ctx)))
      .then((ms) => {
        if (!vivant) return;
        setSeances(tri.map((e, i) => ({ id: e.id, nom: e.nom, exercices: (ms[i]?.lignes ?? []).map((l) => l.exercice_nom) })));
      })
      .catch(() => { if (vivant) setSeances([]); });
    return () => { vivant = false; };
  }, [genre, programme, gen]);

  const reglagesGene = useMemo((): Extract<ReglagesSituation, { genre: "gene" }> =>
    ({ genre: "gene", zones: [...zones], mode, choix, pauses }), [zones, mode, choix, pauses]);
  const effet: EffetSeance[] | null = useMemo(() =>
    genre === "gene" && seances && zones.size ? effetGene(seances, reglagesGene) : null, [genre, seances, zones, reglagesGene]);

  const basculeZone = (z: string) => {
    setZones((prev) => { const n = new Set(prev); if (n.has(z)) n.delete(z); else n.add(z); return n; });
    setChoix({}); setPauses({});
  };
  const changerMode = (m: ModeGene) => {
    /* Passer à « un par un » garde ce qui est à l'écran. */
    if (m === "un" && effet) {
      const fige: Record<string, EtatMouvement> = { ...choix };
      for (const x of effet) for (const t of x.touches) fige[`${x.id}/${t.nom}`] = t.etat;
      setChoix(fige);
    } else if (m !== "un") { setChoix({}); setPauses({}); }
    setMode(m);
  };

  const reglages = (): ReglagesSituation | null => {
    if (genre === "moins_de_temps") return { genre, minutes };
    if (genre === "energie") return { genre, mode: "leger" };
    if (genre === "materiel") return { genre, lieu };
    if (genre === "evenement") return { genre };
    if (genre === "autre_sport" || genre === "jours_moment") return semaine.size ? { genre, jours: [...semaine].sort((a, b) => a - b) } : null;
    if (!zones.size) return null;
    return { ...reglagesGene, pauses: effet ? { ...pausesDecidees(effet), ...pauses } : pauses };
  };

  const quand = jours === 0 ? `, on refait le point le ${dateCourte(fin)}` : ` jusqu’au ${dateCourte(fin)}`;
  /* « 8 déc. » finit déjà par un point. */
  const quandPoint = quand.endsWith(".") ? quand : `${quand}.`;
  const libelleBouton = (() => {
    if (existante) return "Enregistrer";
    if (genre === "moins_de_temps") return `Séances à ${minutes} min${quand}`;
    if (genre === "energie") return `Alléger mes séances${quand}`;
    if (genre === "materiel") return `${lieu === "halteres" ? "Aux haltères" : "Sans matériel"}${quand}`;
    if (genre === "evenement") return `Noter mon événement du ${dateCourte(dateEvt)}`;
    if (genre === "autre_sport") return semaine.size ? "Noter mon sport" : "Choisis ses jours";
    if (genre === "jours_moment") return semaine.size ? "Changer mes jours pour l’instant" : "Choisis tes jours";
    const z = [...zones];
    const quoi = z.length > 1 ? "ces endroits" : z.length ? (LE_MIEN[baseZone(z[0]) ?? "Cou"] ?? "cet endroit") : "cet endroit";
    return `Ménager ${quoi}${quand}`;
  })();

  /* Le nom d'un événement ou d'un sport, écrit par la personne. Jamais lu comme une règle. */
  const nomPourBase = genre === "evenement" || genre === "autre_sport" ? nom.trim().slice(0, 60) || null : existante?.motif ?? null;

  const valider = async () => {
    const r = reglages();
    if (!r) { setErreur(JOURS_GENRE(genre) ? "Choisis au moins un jour de la semaine." : "Touche d’abord l’endroit qui te fait mal."); return; }
    if (genre === "evenement" && (dateEvt < aujourdhui || dateEvt > decaler(aujourdhui, JOURS_MAX))) { setErreur("Choisis une date dans les quatre prochains mois."); return; }
    setEnvoi(true); setErreur(null);
    const res = existante
      ? await modifierSituation(userId, existante.id, { debut, fin, reglages: r, motif: nomPourBase })
      : await creerSituation(userId, { debut, fin, reglages: r, motif: nomPourBase });
    setEnvoi(false);
    if (!res.ok) {
      setErreur(res.raison === "chevauche"
        ? (genre === "evenement" ? "Tu as déjà un événement sur ces jours. Touche son billet pour le changer." : "Tu en as déjà une de ce genre sur ces jours. Touche son billet pour la changer.")
        : "Ça n’a pas pris, réessaie dans un instant.");
      return;
    }
    onFini(existante ? "C’est changé." : r.genre === "gene" ? `${nomGene(r.zones)}, ménagé${quandPoint}` : r.genre === "evenement" ? `C’est noté pour le ${dateCourte(dateEvt)}. Bon courage !` : `C’est noté${quandPoint}`);
  };

  const stop = async () => {
    if (!existante) return;
    setEnvoi(true);
    const ok = await arreterSituation(userId, existante, aujourdhui);
    setEnvoi(false);
    if (ok) onFini("C’est arrêté. Tes séances reprennent leur forme normale.");
    else setErreur("Ça n’a pas pris, réessaie dans un instant.");
  };

  if (JOURS_GENRE(genre) && !joursChoisis) {
    return (
      <FeuilleBas onClose={onClose} niveau={106}>
        <div className="px-5 pt-2" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
          <p className="text-[20px]" style={{ color: "var(--text-0)", fontWeight: 800, fontVariationSettings: "var(--w-voix)" }}>{TITRES[genre]}</p>
          <p className="text-[16px] mt-2" style={{ color: "var(--text-1)" }}>
            Choisis d’abord tes jours d’entraînement habituels. Le planning saura alors quoi déplacer.
          </p>
          <button type="button" onClick={onMesJours}
            className="w-full mt-4 py-3 rounded-2xl text-[16px] font-extrabold text-white cursor-pointer border-none"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)" }}>
            Choisir mes jours
          </button>
        </div>
      </FeuilleBas>
    );
  }

  return (
    <FeuilleBas onClose={onClose} niveau={106} hauteur={genre === "gene" ? "90dvh" : undefined}>
      <div className="px-5 pt-1 pb-2 flex items-center justify-between flex-shrink-0">
        <p className="text-[20px]" style={{ color: "var(--text-0)", fontWeight: 800, fontVariationSettings: "var(--w-voix)" }}>{TITRES[genre]}</p>
        <button onClick={onClose} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center cursor-pointer bg-transparent border-none">
          <X size={16} style={{ color: "var(--text-3)" }} />
        </button>
      </div>

      <div className="overflow-y-auto px-5 flex-1" style={{ scrollbarWidth: "none", paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        {genre === "gene" && (
          <>
            <Silhouette choisies={zones} onBascule={basculeZone} />
            <p className="text-[20px] leading-tight" style={{ color: "var(--text-0)", fontWeight: 800, fontVariationSettings: "var(--w-voix)" }}>
              {zones.size ? [...zones].join(", ") : "Aucun endroit choisi"}
            </p>
            <p className="text-[13px] mt-1" style={{ color: "var(--text-2)" }}>
              Touche l’endroit qui fait mal, de face ou de dos : un muscle ou une articulation. Tu peux en choisir plusieurs.
            </p>
          </>
        )}

        {genre === "moins_de_temps" && (
          <Reglage nom="Chaque séance">
            <div className="flex items-center gap-2.5">
              <Pas label="Moins" onClick={() => setMinutes((m) => Math.max(MINUTES_MIN, m - 5))} disabled={minutes <= MINUTES_MIN}>−</Pas>
              <b className="vy-nombre text-[26px] text-center" style={{ color: "var(--text-0)", minWidth: 44 }}>{minutes}</b>
              <span className="text-[13px] -ml-1.5" style={{ color: "var(--text-2)" }}>min</span>
              <Pas label="Plus" onClick={() => setMinutes((m) => Math.min(MINUTES_MAX, m + 5))} disabled={minutes >= MINUTES_MAX}>+</Pas>
            </div>
          </Reglage>
        )}

        {genre === "materiel" && (
          <Reglage nom="J’ai">
            <Segment valeur={lieu} options={[{ v: "poids", l: "Rien" }, { v: "halteres", l: "Des haltères" }]} onChange={(v) => setLieu(v as LieuSituation)} />
          </Reglage>
        )}

        {(genre === "evenement" || genre === "autre_sport") && (
          <Reglage nom={genre === "evenement" ? "C’est quoi" : "Quel sport"}>
            <input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={60}
              placeholder={genre === "evenement" ? "Un match, un semi…" : "Foot, natation…"}
              className="w-full px-3 py-2 rounded-[12px] border-none outline-none"
              style={{ background: "rgba(var(--text-3-rgb),0.12)", color: "var(--text-0)" }} />
          </Reglage>
        )}

        {genre === "evenement" && (
          <Reglage nom="Le jour">
            <input type="date" value={dateEvt} min={aujourdhui} max={decaler(aujourdhui, JOURS_MAX)}
              onChange={(e) => { if (e.target.value) setDateEvt(e.target.value); }}
              className="w-full px-3 py-2 rounded-[12px] border-none outline-none"
              style={{ background: "rgba(var(--text-3-rgb),0.12)", color: "var(--text-0)" }} />
          </Reglage>
        )}

        {JOURS_GENRE(genre) && (
          <Reglage nom={genre === "autre_sport" ? "Ses jours" : "Mes jours d’entraînement"} long>
            <div role="group" className="flex gap-1.5">
              {LETTRES.map((l, i) => {
                const j = i + 1, actif = semaine.has(j);
                return (
                  <button key={j} type="button" aria-pressed={actif} onClick={() => basculeJour(j)}
                    aria-label={["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"][i]}
                    className="flex-1 h-10 rounded-[12px] text-[13px] font-bold border-none cursor-pointer"
                    style={{ background: actif ? "linear-gradient(135deg,#8B5CF6,#C13BC1)" : "rgba(var(--text-3-rgb),0.14)", color: actif ? "#fff" : "var(--text-1)" }}>
                    {l}
                  </button>
                );
              })}
            </div>
          </Reglage>
        )}

        {genre !== "evenement" && (
        <Reglage nom={existante ? "Jusqu’au" : "Jusqu’à quand"} long>
          <Segment valeur={jours === null ? "" : String(jours)}
            options={DUREES.map((d) => ({ v: String(d.j), l: d.label }))}
            onChange={(v) => setJours(Number(v))} />
          {existante && jours === null && (
            <p className="text-[13px] mt-1.5" style={{ color: "var(--text-2)" }}>Aujourd’hui, jusqu’au {dateCourte(existante.fin)}.</p>
          )}
        </Reglage>
        )}

        {genre === "gene" && (
          <Reglage nom="Les mouvements qui sollicitent cet endroit" long>
            <Segment valeur={mode} options={[{ v: "eviter", l: "Les éviter" }, { v: "alleger", l: "Les alléger" }, { v: "un", l: "Un par un" }]}
              onChange={(v) => changerMode(v as ModeGene)} />
          </Reglage>
        )}

        {/* Ce que ça change, avant de valider. */}
        <div className="mt-3.5 p-3.5 rounded-[18px]" style={{ background: "rgba(139,92,246,.07)" }}>
          <p className="text-[13px] font-bold mb-2" style={{ color: "var(--exp-encre)" }}>Ce que ça change</p>
          {genre === "moins_de_temps" && (
            <p className="text-[13px]" style={{ color: "var(--text-1)" }}>
              Tes séances passent à <b className="vy-nombre">{minutes}</b> min{quandPoint} Chacune garde ses exercices principaux d’abord. Le reste de ton programme ne change pas.
            </p>
          )}
          {genre === "energie" && (
            <>
              <p className="text-[13px]" style={{ color: "var(--text-1)" }}>
                Chaque exercice perd une série{quandPoint} Les séances restent les mêmes, en plus doux.
              </p>
              {onAbsence && (
                <button type="button" onClick={onAbsence} className="mt-2 text-[13px] font-bold bg-transparent border-none p-0 cursor-pointer underline underline-offset-[3px]" style={{ color: "var(--exp-encre)" }}>
                  Je préfère faire une pause
                </button>
              )}
            </>
          )}
          {genre === "materiel" && (
            <p className="text-[13px]" style={{ color: "var(--text-1)" }}>
              Tes séances se préparent {lieu === "halteres" ? "avec des haltères" : "sans matériel"}{quandPoint} Une séance déjà réservée garde ses exercices.
            </p>
          )}
          {genre === "evenement" && (
            <p className="text-[13px]" style={{ color: "var(--text-1)" }}>
              {dateEvt > aujourdhui ? "La veille, chaque exercice perd une série. " : ""}{joursChoisis ? <>Le {dateCourte(dateEvt)}, pas de séance : ton événement est l’effort du jour. Une séance prévue ce jour-là passe au jour d’entraînement suivant.</> : <>Le {dateCourte(dateEvt)} reste à ton événement.</>}
            </p>
          )}
          {genre === "autre_sport" && (
            <p className="text-[13px]" style={{ color: "var(--text-1)" }}>
              {semaine.size ? <>Plus de séance {lesJours([...semaine])}{quandPoint} Une séance prévue ces jours-là passe au jour d’entraînement suivant.</> : "Touche les jours où tu fais ton autre sport."}
            </p>
          )}
          {genre === "jours_moment" && (
            <p className="text-[13px]" style={{ color: "var(--text-1)" }}>
              {semaine.size ? <>Tes séances tombent {lesJours([...semaine])}{quand}, puis tes jours habituels reviennent. Ton programme garde son ordre.</> : "Touche les jours où tu peux t’entraîner pendant cette période."}
            </p>
          )}
          {genre === "gene" && (
            !zones.size ? (
              <p className="text-[13px]" style={{ color: "var(--text-1)" }}>Touche l’endroit qui te fait mal. Tu verras ici chaque mouvement concerné, séance par séance.</p>
            ) : !programme ? (
              <p className="text-[13px]" style={{ color: "var(--text-1)" }}>Les mouvements qui sollicitent cet endroit seront {mode === "alleger" ? "allégés" : "écartés"} de tes séances.</p>
            ) : !effet ? (
              <p className="text-[13px]" style={{ color: "var(--text-3)" }}>Je regarde tes séances…</p>
            ) : (
              <ApercuGene effet={effet} mode={mode} fin={fin}
                onMouvement={(id, nom, etat) => { if (mode !== "un") changerMode("un"); setChoix((c) => ({ ...c, [`${id}/${nom}`]: SUIVANT[etat] })); }}
                onPause={(id, enPause) => setPauses((p) => ({ ...p, [id]: !enPause }))} />
            )
          )}
        </div>

        {erreur && <p role="alert" className="text-[13px] mt-3" style={{ color: "var(--feu-encre)" }}>{erreur}</p>}

        <motion.button whileTap={{ scale: 0.97 }} disabled={envoi} onClick={() => void valider()}
          className="w-full mt-4 py-3 rounded-2xl text-[16px] font-extrabold text-white cursor-pointer border-none"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", boxShadow: "var(--ombre-action)", opacity: envoi ? 0.6 : 1 }}>
          {libelleBouton}
        </motion.button>

        {existante && (
          arreter ? (
            <button type="button" disabled={envoi} onClick={() => void stop()}
              className="w-full mt-2 py-2.5 text-[13px] font-bold bg-transparent border-none cursor-pointer" style={{ color: "var(--feu-encre)" }}>
              Oui, arrêter maintenant : tes séances reprennent leur forme
            </button>
          ) : (
            <button type="button" onClick={() => setArreter(true)}
              className="w-full mt-2 py-2.5 text-[13px] font-semibold bg-transparent border-none cursor-pointer" style={{ color: "var(--text-2)" }}>
              Arrêter maintenant
            </button>
          )
        )}
        {genre === "gene" && (
          <p className="text-[11px] text-center mt-2.5" style={{ color: "var(--text-2)" }}>
            Si la douleur dure ou augmente, parle-en à un professionnel de santé.
          </p>
        )}
      </div>
    </FeuilleBas>
  );
}

function ApercuGene({ effet, mode, fin, onMouvement, onPause }: {
  effet: EffetSeance[];
  mode: ModeGene;
  fin: string;
  onMouvement: (seanceId: string, nom: string, etat: EtatMouvement) => void;
  onPause: (seanceId: string, enPause: boolean) => void;
}) {
  const touchees = effet.filter((x) => x.touches.length || x.inconnus.length);
  const intactes = effet.filter((x) => !x.touches.length && !x.inconnus.length);
  if (!touchees.length) return <p className="text-[13px]" style={{ color: "var(--text-1)" }}>Aucun mouvement de ton programme ne sollicite cet endroit. Tes séances ne changent pas.</p>;
  const ev = touchees.reduce((n, x) => n + x.evites, 0);
  const lg = touchees.reduce((n, x) => n + x.legers, 0);
  const mv = (n: number) => `${n} mouvement${n > 1 ? "s" : ""}`;
  const quoi = [ev ? `${mv(ev)} à éviter` : "", lg ? `${mv(lg)} en plus léger` : ""].filter(Boolean).join(" et ");
  return (
    <div>
      <p className="text-[13px]" style={{ color: "var(--text-0)" }}>
        {quoi ? `${quoi}, dans ${touchees.length} séance${touchees.length > 1 ? "s" : ""} sur ${effet.length}.` : "Tous les mouvements restent comme prévu."}
      </p>
      {mode === "un" && <p className="text-[13px] mt-1" style={{ color: "var(--text-2)" }}>Touche un mouvement pour choisir ce qu’il devient.</p>}
      {touchees.map((x) => (
        <div key={x.id} className="mt-3 pt-2.5" style={{ borderTop: "1px solid rgba(139,92,246,.18)" }}>
          <div className="flex items-baseline justify-between gap-2.5">
            <b className="text-[16px]" style={{ color: "var(--text-0)", fontWeight: 800, fontVariationSettings: "var(--w-voix)" }}>{x.nom}</b>
            <span className="text-[13px]" style={{ color: x.pause ? "var(--exp-encre)" : "var(--text-2)", fontWeight: x.pause ? 700 : 400 }}>
              {x.pause ? `en pause jusqu’au ${dateCourte(fin)}` : `${mv(x.touches.length)} sur ${x.total}`}
            </span>
          </div>
          {!x.pause && x.touches.map((t) => (
            <button key={t.nom} type="button" onClick={() => onMouvement(x.id, t.nom, t.etat)}
              className="grid items-center w-full text-left bg-transparent border-none cursor-pointer py-1"
              style={{ gridTemplateColumns: "36px minmax(0,1fr) auto", gap: 10 }}>
              <span style={{ opacity: t.etat === "eviter" ? 0.45 : 1 }}><ExerciseThumb name={t.nom} size={36} /></span>
              <b className="text-[13px] font-semibold" style={{ color: t.etat === "eviter" ? "var(--text-2)" : "var(--text-0)", textDecoration: t.etat === "eviter" ? "line-through" : undefined }}>{t.nom}</b>
              <span className="text-[13px] font-bold" style={{ color: t.etat === "garder" ? "var(--text-2)" : "var(--exp-encre)" }}>{ETAT[t.etat]}</span>
            </button>
          ))}
          {x.pause && (
            <p className="text-[13px] mt-0.5" style={{ color: "var(--text-1)" }}>
              {mv(x.evites)} sur {x.total} à éviter. {x.reste === 0 ? "Il n’en reste aucun." : x.reste === 1 ? "Il n’en reste qu’un." : `Il en reste ${x.reste}.`} Les autres séances prennent sa place.
            </p>
          )}
          {x.inconnus.length > 0 && (
            <p className="text-[13px] mt-1" style={{ color: "var(--text-2)" }}>
              Je ne sais pas ce que sollicite{x.inconnus.length > 1 ? "nt" : ""} : {x.inconnus.join(", ")}. Vas-y doucement.
            </p>
          )}
          {x.evites > 0 && x.reste > 0 && (
            <button type="button" onClick={() => onPause(x.id, x.pause)}
              className="mt-1 text-[13px] font-bold bg-transparent border-none p-0 py-1.5 cursor-pointer underline underline-offset-[3px]" style={{ color: "var(--exp-encre)" }}>
              {x.pause ? "La garder quand même" : "La mettre en pause"}
            </button>
          )}
        </div>
      ))}
      {intactes.length > 0 && (
        <p className="text-[13px] mt-3 pt-2.5" style={{ color: "var(--text-2)", borderTop: "1px solid rgba(139,92,246,.18)" }}>
          {intactes.map((x) => x.nom).join(", ")} ne change{intactes.length > 1 ? "nt" : ""} pas.
        </p>
      )}
    </div>
  );
}

function Reglage({ nom, children, long }: { nom: string; children: React.ReactNode; long?: boolean }) {
  return (
    <div className={long ? "py-3" : "grid items-center py-3"}
      style={{ borderTop: "1px solid rgba(var(--text-3-rgb),0.12)", ...(long ? {} : { gridTemplateColumns: "92px minmax(0,1fr)", gap: "4px 10px" }) }}>
      <span className={`text-[13px] font-semibold ${long ? "block mb-2" : ""}`} style={{ color: "var(--text-2)" }}>{nom}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Segment({ valeur, options, onChange }: { valeur: string; options: { v: string; l: string }[]; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" className="flex gap-1 p-[3px] rounded-[13px]" style={{ background: "rgba(var(--text-3-rgb),0.16)" }}>
      {options.map((o) => {
        const actif = o.v === valeur;
        return (
          <button key={o.v} type="button" role="radio" aria-checked={actif} onClick={() => onChange(o.v)}
            className="flex-1 py-2 px-1.5 rounded-[10px] text-[13px] font-semibold text-center border-none cursor-pointer"
            style={{ background: actif ? "rgb(var(--surface-rgb))" : "transparent", color: actif ? "var(--text-0)" : "var(--text-2)", boxShadow: actif ? "0 1px 3px rgba(45,55,72,.14)" : undefined }}>
            {o.l}
          </button>
        );
      })}
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

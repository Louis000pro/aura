"use client";

/* ─────────────────────────────────────────────────────────────
   « Ajouter un record », dans Profil › Progrès (Louis, 2026-11-18 :
   « on ne sait pas comment ajouter des progrès »).

   Deux temps dans la même feuille : choisir le mouvement (la
   bibliothèque, ou le nom tapé tel quel), puis dire le chiffre.
   La mesure se devine (un mouvement chargé se mesure à la charge, un
   gainage au chrono, le reste en répétitions) et se change d'un toucher.

   ⚠️ Une note, pas une séance : aucune EXP, rien pour la flamme.
   ───────────────────────────────────────────────────────────── */

import { useMemo, useState } from "react";
import { ChevronLeft, Search, X } from "lucide-react";
import Sheet from "@/components/communaute/Sheet";
import ExerciseThumb from "@/components/seance/ExerciseThumb";
import { chercherExercices, trouverExercice, aplatir, type LibExercise } from "@/lib/exerciseLibrary";
import { cleExercice } from "@/lib/exerciceCle";
import { ajouterRecordManuel, valeurRecord, uniteRecord, type MesureRecord, type RecordMouvement } from "@/lib/records";

const DEGRADE = "linear-gradient(135deg, #8B5CF6, #C13BC1)";
const MESURES: { id: MesureRecord; libelle: string }[] = [
  { id: "reps", libelle: "Répétitions" },
  { id: "charge", libelle: "Charge" },
  { id: "duree", libelle: "Durée" },
];

/** La mesure qu'on propose d'abord pour un mouvement. */
function mesureProposee(exo: LibExercise | undefined, existant: RecordMouvement | undefined): MesureRecord {
  if (existant) return existant.mesure;
  if (!exo) return "reps";
  if (exo.mode === "temps") return "duree";
  if (exo.equip === "fonte" || exo.equip === "machine") return "charge";
  return "reps";
}

/** « 2026-11-18 » dans le fuseau de Paris. */
function aujourdhui(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
}

/** Un nombre tapé à la française (« 62,5 »). `NaN` si ce n'en est pas un. */
function lireNombre(s: string): number {
  const t = s.trim().replace(",", ".");
  return t === "" ? NaN : Number(t);
}

const CHAMP: React.CSSProperties = {
  background: "rgba(var(--text-3-rgb),0.08)",
  border: "1px solid rgba(var(--text-3-rgb),0.18)",
  borderRadius: "var(--r-controle)",
  color: "var(--text-0)",
};

export default function AjoutRecord({ userId, records, onFermer, onAjoute }: {
  userId: string;
  /** Les records déjà connus, pour proposer la même mesure et montrer l'actuel. */
  records: RecordMouvement[];
  onFermer: () => void;
  /** Appelé une fois le record gardé, avec le nom du mouvement. */
  onAjoute: (nom: string) => void;
}) {
  const [nom, setNom] = useState<string | null>(null);
  const [texte, setTexte] = useState("");

  const resultats = useMemo(() => chercherExercices({ texte }).slice(0, 30), [texte]);
  const nomLibre = texte.trim();
  const libreConnu = nomLibre !== "" && resultats.some((e) => aplatir(e.name) === aplatir(nomLibre));

  return (
    <Sheet onFermer={onFermer}>
      <div className="flex flex-col px-[22px] pb-6" role="dialog" aria-label="Ajouter un record">
        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1">
            {nom && (
              <button type="button" onClick={() => setNom(null)} aria-label="Changer de mouvement"
                className="-ml-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full cursor-pointer"
                style={{ color: "var(--text-2)" }}>
                <ChevronLeft size={20} />
              </button>
            )}
            <h2 className="vy-titre truncate" style={{ fontSize: 26 }}>{nom ? "Ton chiffre" : "Ajouter un record"}</h2>
          </div>
          <button type="button" onClick={onFermer} aria-label="Fermer"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full cursor-pointer"
            style={{ background: "rgba(var(--text-3-rgb),0.1)", color: "var(--text-2)" }}>
            <X size={18} />
          </button>
        </div>

        {nom === null ? (
          <>
            <p className="mt-1 text-[13px]" style={{ color: "var(--text-2)" }}>Sur quel mouvement ?</p>
            <label className="mt-4 flex items-center gap-2 px-3" style={{ ...CHAMP, minHeight: 48 }}>
              <Search size={17} style={{ color: "var(--text-3)" }} />
              <input autoFocus value={texte} onChange={(e) => setTexte(e.target.value)}
                placeholder="Pompes, squat, développé couché…" aria-label="Chercher un mouvement"
                className="min-w-0 flex-1 bg-transparent text-[16px] outline-none" style={{ color: "var(--text-0)" }} />
            </label>
            <div className="mt-3 flex max-h-[48vh] flex-col overflow-y-auto">
              {resultats.map((e, i) => (
                <button key={e.name} type="button" onClick={() => setNom(e.name)}
                  className="flex w-full items-center gap-3 py-2 text-left cursor-pointer"
                  style={i ? { borderTop: "1px solid rgba(var(--text-3-rgb),0.12)" } : undefined}>
                  <span className="flex-shrink-0 overflow-hidden rounded-[10px]" style={{ background: "rgba(139,92,246,0.07)" }}>
                    <ExerciseThumb name={e.name} size={44} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[16px] font-medium" style={{ color: "var(--text-0)" }}>{e.name}</span>
                </button>
              ))}
              {nomLibre !== "" && !libreConnu && (
                <button type="button" onClick={() => setNom(nomLibre.slice(0, 80))}
                  className="flex min-h-[48px] w-full items-center py-2 text-left text-[16px] font-semibold cursor-pointer"
                  style={{ color: "var(--exp-encre)", borderTop: resultats.length ? "1px solid rgba(var(--text-3-rgb),0.12)" : undefined }}>
                  Utiliser « {nomLibre.slice(0, 80)} »
                </button>
              )}
            </div>
          </>
        ) : (
          <FormulaireValeur key={nom} userId={userId} nom={nom}
            existant={records.find((r) => aplatir(r.nom) === aplatir(nom))}
            onAjoute={() => onAjoute(nom)} />
        )}
      </div>
    </Sheet>
  );
}

function FormulaireValeur({ userId, nom, existant, onAjoute }: {
  userId: string;
  nom: string;
  existant: RecordMouvement | undefined;
  onAjoute: () => void;
}) {
  const exo = trouverExercice(nom);
  const [mesure, setMesure] = useState<MesureRecord>(() => mesureProposee(exo, existant));
  const [valeur, setValeur] = useState("");
  const [reps, setReps] = useState("");
  const [minutes, setMinutes] = useState("");
  const [secondes, setSecondes] = useState("");
  const [jour, setJour] = useState(aujourdhui);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const nombre = mesure === "duree"
    ? (lireNombre(minutes || "0") || 0) * 60 + (lireNombre(secondes || "0") || 0)
    : lireNombre(valeur);
  const repsNb = lireNombre(reps);
  const valide = Number.isFinite(nombre) && nombre > 0
    && (mesure !== "reps" || Number.isInteger(nombre))
    && (mesure !== "charge" || reps === "" || (Number.isInteger(repsNb) && repsNb >= 1))
    && jour !== "" && jour <= aujourdhui();

  const enregistrer = async () => {
    if (!valide || envoi) return;
    setEnvoi(true);
    setErreur(null);
    /* Midi à Paris : le jour reste le bon quel que soit le fuseau. */
    const quand = jour === aujourdhui() ? new Date().toISOString() : `${jour}T12:00:00+01:00`;
    const msg = await ajouterRecordManuel(userId, {
      cle: cleExercice(nom), nom, mesure,
      valeur: Math.round(nombre * 100) / 100,
      reps: mesure === "charge" && reps !== "" ? repsNb : null,
      quand,
    });
    setEnvoi(false);
    if (msg) setErreur(msg); else onAjoute();
  };

  return (
    <div className="flex flex-col">
      <div className="mt-3 flex items-center gap-3">
        <span className="flex-shrink-0 overflow-hidden rounded-2xl" style={{ background: "rgba(139,92,246,0.07)" }}>
          <ExerciseThumb name={nom} size={64} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold" style={{ color: "var(--text-0)" }}>{nom}</p>
          <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
            {existant
              ? `Ton record actuel : ${valeurRecord(existant.mesure, existant.meilleur)} ${existant.mesure === "reps" ? "rép." : uniteRecord(existant.mesure, existant.meilleur)}`
              : "Ton premier record sur ce mouvement"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-1 p-1" role="radiogroup" aria-label="Ce qu’on mesure"
        style={{ background: "rgba(var(--text-3-rgb),0.08)", borderRadius: "var(--r-controle)" }}>
        {MESURES.map((m) => {
          const actif = m.id === mesure;
          return (
            <button key={m.id} type="button" role="radio" aria-checked={actif} onClick={() => setMesure(m.id)}
              className="min-h-[40px] text-[13px] font-semibold cursor-pointer"
              style={{
                borderRadius: 8,
                background: actif ? "rgb(var(--surface-rgb))" : "transparent",
                color: actif ? "var(--text-0)" : "var(--text-2)",
                boxShadow: actif ? "var(--ombre-pose)" : undefined,
              }}>
              {m.libelle}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex gap-3">
        {mesure === "reps" && (
          <Champ libelle="Répétitions d’affilée" suffixe="rép." valeur={valeur} onChange={setValeur} entier />
        )}
        {mesure === "charge" && (
          <>
            <Champ libelle="Charge" suffixe="kg" valeur={valeur} onChange={setValeur} />
            <Champ libelle="Répétitions" suffixe="rép." valeur={reps} onChange={setReps} entier facultatif />
          </>
        )}
        {mesure === "duree" && (
          <>
            <Champ libelle="Minutes" suffixe="min" valeur={minutes} onChange={setMinutes} entier />
            <Champ libelle="Secondes" suffixe="s" valeur={secondes} onChange={setSecondes} entier />
          </>
        )}
      </div>

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>Fait le</span>
        <input type="date" value={jour} max={aujourdhui()} onChange={(e) => setJour(e.target.value)}
          className="min-h-[48px] px-3 text-[16px] outline-none" style={CHAMP} />
      </label>

      {existant && valide && existant.mesure !== mesure && (
        <p className="mt-3 text-[13px] leading-snug" style={{ color: "var(--text-2)" }}>
          Ce mouvement se mesure déjà {existant.mesure === "charge" ? "à la charge" : existant.mesure === "duree" ? "au chrono" : "en répétitions"} :
          garde la même mesure pour que ton record monte.
        </p>
      )}
      {erreur && <p className="mt-3 text-[13px]" role="alert" style={{ color: "#E5484D" }}>{erreur}</p>}

      <button type="button" onClick={enregistrer} disabled={!valide || envoi}
        className="mt-6 min-h-[52px] rounded-2xl text-[16px] font-semibold text-white cursor-pointer disabled:cursor-not-allowed"
        style={{ background: DEGRADE, boxShadow: valide ? "var(--ombre-action)" : undefined, opacity: valide ? 1 : 0.45 }}>
        {envoi ? "Un instant…" : "Enregistrer le record"}
      </button>
      <p className="mt-3 text-center text-[13px]" style={{ color: "var(--text-2)" }}>
        Pendant une séance, tes chiffres notés s’ajoutent tout seuls.
      </p>
    </div>
  );
}

function Champ({ libelle, suffixe, valeur, onChange, entier, facultatif }: {
  libelle: string;
  suffixe: string;
  valeur: string;
  onChange: (v: string) => void;
  entier?: boolean;
  facultatif?: boolean;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>
        {libelle}{facultatif ? " (facultatif)" : ""}
      </span>
      <span className="flex items-center gap-2 px-3" style={{ ...CHAMP, minHeight: 52 }}>
        <input value={valeur} inputMode={entier ? "numeric" : "decimal"} aria-label={libelle}
          onChange={(e) => onChange(e.target.value.replace(entier ? /[^0-9]/g : /[^0-9.,]/g, "").slice(0, 7))}
          className="vy-nombre min-w-0 flex-1 bg-transparent text-[20px] font-bold outline-none" style={{ color: "var(--text-0)" }} />
        <span className="text-[13px]" style={{ color: "var(--text-2)" }}>{suffixe}</span>
      </span>
    </label>
  );
}

"use client";

/* ─────────────────────────────────────────────────────────────
   « Tes records », dans Profil › Progrès (maquette « Les records
   Vaiiya », 2026-10-22).

   Le dernier record battu est le héros ; les autres tiennent dans une
   liste à filets. Toucher un record ouvre sa fiche : le chiffre en
   grand, l'escalier de ses marches, et une phrase sur le chemin.

   ⚠️ Gratuit, sans EXP, sans comparaison : un record ne se mesure qu'à
   soi. Une lecture ratée ne rend RIEN (jamais « aucun record »).
   ───────────────────────────────────────────────────────────── */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { ChevronRight, Share2, X } from "lucide-react";
import ExerciseThumb from "@/components/seance/ExerciseThumb";
import ExerciseDetailSheet from "@/components/seance/ExerciseDetailSheet";
import Sheet from "@/components/communaute/Sheet";
import { trouverExercice } from "@/lib/exerciseLibrary";
import {
  lireRecords, valeurRecord, uniteRecord, texteRecord, dateRecord, dateCourte, phraseChemin,
  type RecordMouvement,
} from "@/lib/records";

const DEGRADE = "linear-gradient(135deg, #8B5CF6, #C13BC1)";
const CHIFFRE_DEGRADE: React.CSSProperties = {
  background: DEGRADE, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
};
/** Combien de lignes sous le héros avant « Voir les N records ». */
const LIGNES_REPLIEES = 3;

/** Le jour d'un record, dit comme une personne : « mardi », « le 12 octobre ». */
function quandDit(iso: string): string {
  const d = new Date(iso);
  const jours = (Date.now() - d.getTime()) / 86_400_000;
  if (jours < 1) return "aujourd’hui";
  if (jours < 6) return d.toLocaleDateString("fr-FR", { weekday: "long", timeZone: "Europe/Paris" });
  return `le ${dateRecord(iso)}`;
}

export default function RecordsProgres({ userId }: { userId: string }) {
  const router = useRouter();
  const [records, setRecords] = useState<{ pour: string; liste: RecordMouvement[] | null } | null>(null);
  const [ouvert, setOuvert] = useState<RecordMouvement | null>(null);
  const [tout, setTout] = useState(false);

  useEffect(() => {
    let vivant = true;
    void lireRecords(userId).then((liste) => { if (vivant) setRecords({ pour: userId, liste }); });
    return () => { vivant = false; };
  }, [userId]);

  const liste = records?.pour === userId ? records.liste : undefined;
  if (liste === undefined || liste === null) return null;

  if (liste.length === 0) {
    return (
      <section className="mb-6">
        <h2 className="vy-sous mb-3">Tes records</h2>
        <div className="flex flex-col gap-3.5 p-[18px]"
          style={{ borderRadius: "var(--r-affiche)", background: "rgba(var(--surface-rgb),0.9)", border: "1px dashed rgba(139,92,246,0.4)" }}>
          <div className="flex items-center gap-3.5">
            <span className="flex-shrink-0 rounded-2xl" style={{ background: "rgba(139,92,246,0.08)" }}>
              <ExerciseThumb name="Pompes" size={76} />
            </span>
            <div className="min-w-0">
              <p className="text-[16px] font-semibold" style={{ color: "var(--text-0)" }}>Ton premier record t’attend</p>
              <p className="mt-1 text-[13px] leading-snug" style={{ color: "var(--text-2)" }}>
                Pendant une séance, note tes répétitions ou ta charge quand on te les demande : le meilleur chiffre de chaque mouvement devient ton record.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 pt-3 text-[13px]" style={{ borderTop: "1px solid rgba(var(--text-3-rgb),0.14)", color: "var(--text-1)" }}>
            <span><b className="font-semibold">Répétitions</b> : le plus grand nombre d’affilée.</span>
            <span><b className="font-semibold">Charge</b> : le plus lourd, au même nombre de répétitions.</span>
            <span><b className="font-semibold">Gainage</b> : le plus long, au chrono.</span>
          </div>
          <button type="button" onClick={() => router.push("/progression")}
            className="min-h-[48px] rounded-2xl text-[16px] font-semibold text-white cursor-pointer"
            style={{ background: DEGRADE }}>
            Lancer une séance
          </button>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
          Tes records ne se comparent à ceux de personne. Ils ne rapportent pas d’EXP : ce sont les tiens, c’est tout.
        </p>
      </section>
    );
  }

  const [heros, ...autres] = liste;
  const visibles = tout ? autres : autres.slice(0, LIGNES_REPLIEES);
  const premiere = heros.marches[0];
  const aMonte = heros.marches.length > 1;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="vy-sous">Tes records</h2>
        <span className="vy-nombre text-[13px]" style={{ color: "var(--text-2)" }}>{liste.length}</span>
      </div>

      {/* Le héros : le dernier record battu. */}
      <button type="button" onClick={() => setOuvert(heros)}
        className="relative block w-full overflow-hidden text-left cursor-pointer"
        style={{ borderRadius: "var(--r-affiche)", background: "rgb(var(--surface-rgb))", border: "1px solid rgba(139,92,246,0.18)", boxShadow: "var(--ombre-pose)" }}>
        <div style={{ height: 3, background: DEGRADE }} />
        <div className="flex items-end gap-1.5 px-4 pb-[18px] pt-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-[11px] font-semibold" style={{ color: "var(--exp-encre)" }}>
              {aMonte ? "Nouveau" : "Ton record"} · {quandDit(heros.meilleur.quand)}
            </span>
            <span className="truncate text-[16px] font-semibold" style={{ color: "var(--text-0)" }}>{heros.nom}</span>
            <span className="mt-0.5 flex items-baseline gap-1.5">
              <b className="vy-nombre leading-[0.9]" style={{ fontSize: 54, fontWeight: 800, ...CHIFFRE_DEGRADE }}>
                {valeurRecord(heros.mesure, heros.meilleur)}
              </b>
              <span className="text-[16px] font-semibold" style={{ color: "var(--text-2)" }}>{uniteRecord(heros.mesure, heros.meilleur)}</span>
            </span>
            {aMonte && (
              <span className="mt-1.5 text-[13px]" style={{ color: "var(--text-2)" }}>
                Le {dateRecord(premiere.quand)}, c’était {texteRecord(heros.mesure, premiere)}.
              </span>
            )}
          </div>
          <span className="-mb-2 -mr-1.5 flex-shrink-0"><ExerciseThumb name={heros.nom} size={120} /></span>
        </div>
      </button>

      {/* Les autres : une liste, un filet entre chaque. */}
      {autres.length > 0 && (
        <div className="mt-3 overflow-hidden"
          style={{ borderRadius: "var(--r-bloc)", background: "rgba(var(--surface-rgb),0.9)", border: "1px solid rgba(var(--text-3-rgb),0.16)" }}>
          {visibles.map((r, i) => (
            <button key={r.cle} type="button" onClick={() => setOuvert(r)}
              className="flex w-full items-center gap-3 px-3.5 py-3 text-left cursor-pointer"
              style={i ? { borderTop: "1px solid rgba(var(--text-3-rgb),0.14)" } : undefined}>
              <span className="flex-shrink-0 overflow-hidden rounded-[10px]" style={{ background: "rgba(139,92,246,0.07)" }}>
                <ExerciseThumb name={r.nom} size={46} delay={i * 300} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[16px] font-semibold" style={{ color: "var(--text-0)" }}>{r.nom}</span>
                <span className="text-[13px]" style={{ color: "var(--text-2)" }}>le {dateRecord(r.meilleur.quand)}</span>
              </span>
              <span className="flex items-baseline gap-1">
                <b className="vy-nombre text-[20px]" style={{ fontWeight: 700, color: "var(--text-0)" }}>{valeurRecord(r.mesure, r.meilleur)}</b>
                <span className="text-[11px]" style={{ color: "var(--text-2)" }}>
                  {r.mesure === "reps" ? "rép." : uniteRecord(r.mesure, r.meilleur)}
                </span>
              </span>
            </button>
          ))}
          {autres.length > LIGNES_REPLIEES && (
            <button type="button" onClick={() => setTout((t) => !t)}
              className="flex min-h-[46px] w-full items-center justify-center gap-1.5 text-[13px] font-semibold cursor-pointer"
              style={{ borderTop: "1px solid rgba(var(--text-3-rgb),0.14)", color: "var(--exp-encre)" }}>
              {tout ? "Replier" : `Voir les ${liste.length} records`}
              <ChevronRight size={14} strokeWidth={2.2} style={{ transform: tout ? "rotate(-90deg)" : "rotate(90deg)" }} />
            </button>
          )}
        </div>
      )}

      {ouvert && <FicheRecord record={ouvert} onFermer={() => setOuvert(null)} />}
    </section>
  );
}

/** La fiche d'un record : le chiffre, l'escalier de ses marches, le chemin. */
export function FicheRecord({ record: r, onFermer }: { record: RecordMouvement; onFermer: () => void }) {
  const [mouvement, setMouvement] = useState(false);
  const exo = trouverExercice(r.nom);
  const marches = r.marches.slice(-5);
  const max = Math.max(...marches.map((m) => m.valeur));
  const min = Math.min(...marches.map((m) => m.valeur));
  const hauteur = (v: number) => (max === min ? 84 : 30 + ((v - min) / (max - min)) * 54);
  const chemin = phraseChemin(r);

  const partager = async () => {
    const texte = `Mon record sur Vaiiya · ${r.nom} : ${texteRecord(r.mesure, r.meilleur)}.`;
    try {
      if (navigator.share) await navigator.share({ text: texte, url: "https://vaiiya.fr" });
      else await navigator.clipboard?.writeText(`${texte} https://vaiiya.fr`);
    } catch { /* partage annulé */ }
  };

  return (
    <>
      <Sheet onFermer={onFermer}>
        <div className="flex flex-col px-[22px] pb-6" role="dialog" aria-label={`Record : ${r.nom}`}>
          <div className="mt-1 flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px]" style={{ color: "var(--text-2)" }}>Ton record</span>
              <h2 className="vy-titre" style={{ fontSize: 26 }}>{r.nom}</h2>
            </div>
            <button type="button" onClick={onFermer} aria-label="Fermer"
              className="flex h-10 w-10 items-center justify-center rounded-full cursor-pointer"
              style={{ background: "rgba(var(--text-3-rgb),0.1)", color: "var(--text-2)" }}>
              <X size={18} />
            </button>
          </div>

          <div className="mt-2 flex items-end">
            <div className="flex flex-1 flex-col">
              <b className="vy-nombre leading-[0.86]" style={{ fontSize: 92, fontWeight: 800, ...CHIFFRE_DEGRADE }}>
                {valeurRecord(r.mesure, r.meilleur)}
              </b>
              <span className="mt-1.5 text-[16px] font-semibold" style={{ color: "var(--text-2)" }}>
                {r.mesure === "reps" ? "répétitions d’affilée" : uniteRecord(r.mesure, r.meilleur)} · {dateRecord(r.meilleur.quand)}
              </span>
            </div>
            <span className="-mr-2.5 flex-shrink-0"><ExerciseThumb name={r.nom} size={116} /></span>
          </div>

          {marches.length > 1 && (
            <div className="mt-6 flex flex-col gap-2.5">
              <span className="text-[11px] font-medium" style={{ color: "var(--text-2)" }}>Le chemin jusqu’ici</span>
              <div className="flex h-[112px] items-end gap-2">
                {marches.map((m, i) => {
                  const derniere = i === marches.length - 1;
                  return (
                    <div key={m.quand} className="flex flex-1 flex-col items-center gap-1.5">
                      <b className="vy-nombre text-[16px]" style={{ fontWeight: derniere ? 800 : 700, color: derniere ? "var(--exp-encre)" : "var(--text-2)" }}>
                        {valeurRecord(r.mesure, m)}
                      </b>
                      <span className="w-full" style={{
                        height: hauteur(m.valeur), borderRadius: "8px 8px 3px 3px",
                        background: derniere ? "linear-gradient(180deg, #8B5CF6, #C13BC1)" : `rgba(139,92,246,${0.1 + (i / marches.length) * 0.18})`,
                      }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                {marches.map((m) => (
                  <span key={m.quand} className="flex-1 text-center text-[11px]" style={{ color: "var(--text-2)" }}>{dateCourte(m.quand)}</span>
                ))}
              </div>
            </div>
          )}

          {chemin && <p className="mt-5 text-[16px] leading-relaxed" style={{ color: "var(--text-1)" }}>{chemin}</p>}

          <div className="mt-6 flex flex-col gap-1">
            <button type="button" onClick={partager}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl text-[16px] font-semibold text-white cursor-pointer"
              style={{ background: DEGRADE, boxShadow: "var(--ombre-action)" }}>
              <Share2 size={17} /> Partager mon record
            </button>
            {exo && (
              <button type="button" onClick={() => setMouvement(true)}
                className="min-h-[44px] text-[16px] font-medium cursor-pointer" style={{ color: "var(--text-2)" }}>
                Voir le mouvement
              </button>
            )}
          </div>
        </div>
      </Sheet>
      <AnimatePresence>
        {mouvement && exo && <ExerciseDetailSheet exo={exo} onClose={() => setMouvement(false)} />}
      </AnimatePresence>
    </>
  );
}

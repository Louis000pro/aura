"use client";

/* ════════════════════════════════════════════════════════════════════
   TES CLASSIQUES, SUR LE PROFIL (maquette « Le chrono et le score »,
   version 3 : « Ton meilleur sur chacun »).

   Une couverture sombre par classique déjà fait : son nom, ce qu'on y
   compte, ton meilleur en grand, le jour où tu l'as posé, et combien de
   fois tu l'as fait. Toucher une couverture ouvre la fiche du classique.
   Dessous, le prochain classique posé au planning (« Le Décompte revient
   le samedi 21 novembre »), puis « À tenter » : ceux que tu n'as pas
   encore faits, et le lien vers leur page du catalogue.

   Rien ne s'affiche tant qu'aucun classique n'a de score, ni quand la
   base ne répond pas (`null` n'est pas « aucun »). Une lecture du
   planning ratée cache seulement la ligne du prochain essai.

   ⚠️ On ne compare qu'à soi : aucun classement, aucun chiffre d'autrui.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarDays, ChevronRight } from "lucide-react";
import { Photo } from "@/components/entrainement/PhotoSeance";
import { PucePlus } from "@/components/catalogue/CartesSeance";
import { useAuth } from "@/context/AuthContext";
import { useWorkoutLaunch } from "@/context/WorkoutLaunchContext";
import { lireScores } from "@/lib/scoresClassiques";
import { fetchRange, type PlanningDay } from "@/lib/planning";
import { localDateStr } from "@/lib/dates";
import { heroImageForSeance, photosDeRangee } from "@/lib/workoutArt";
import { VENTE_OUVERTE } from "@/lib/plans";
import {
  CLASSIQUES, FACON, bilanDe, dateCourte, faitNFois, lignePrevu, prochainClassique, scoreCourt, typo,
  type Classique, type ScoreDate,
} from "@/lib/classiques";

const NB = String.fromCharCode(160);
const maj = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/* Une lumière par couverture, dans les couleurs de la marque (jamais de vert). */
const LUMIERES = [
  "radial-gradient(120% 70% at 100% 0%, rgba(193,59,193,0.55), transparent 55%), radial-gradient(90% 60% at 0% 100%, rgba(139,92,246,0.7), transparent 60%)",
  "radial-gradient(110% 70% at 0% 0%, rgba(245,177,32,0.45), transparent 55%), radial-gradient(90% 60% at 100% 100%, rgba(139,92,246,0.65), transparent 60%)",
  "radial-gradient(110% 70% at 0% 0%, rgba(139,92,246,0.6), transparent 55%), radial-gradient(90% 60% at 100% 100%, rgba(79,110,247,0.55), transparent 60%)",
  "radial-gradient(110% 70% at 100% 0%, rgba(193,59,193,0.5), transparent 55%), radial-gradient(90% 60% at 0% 100%, rgba(139,92,246,0.75), transparent 60%)",
];
/** Le planning se lit sur trois mois : le bon moment pour refaire un
 *  classique va de trois à cinq semaines, et le jour reste libre. */
const JOURS_LUS = 92;

export default function TesClassiques({ userId }: { userId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { launchWorkout } = useWorkoutLaunch();
  const [scores, setScores] = useState<{ pour: string; data: ScoreDate[] | null } | null>(null);
  const [prevu, setPrevu] = useState<{ pour: string; jours: PlanningDay[] | null } | null>(null);
  useEffect(() => {
    let vivant = true;
    void lireScores(userId).then((data) => { if (vivant) setScores({ pour: userId, data }); });
    const debut = new Date();
    const dates = Array.from({ length: JOURS_LUS }, (_, i) => localDateStr(new Date(debut.getFullYear(), debut.getMonth(), debut.getDate() + i)));
    fetchRange(userId, dates)
      .then((r) => { if (vivant) setPrevu({ pour: userId, jours: Object.values(r).flat() }); })
      .catch(() => { if (vivant) setPrevu({ pour: userId, jours: null }); });
    return () => { vivant = false; };
  }, [userId]);
  const data = scores?.pour === userId ? scores.data : null;
  if (!data?.length) return null;

  const faits = CLASSIQUES.flatMap((c) => {
    const bilan = bilanDe(data.filter((s) => s.classique === c.id));
    return bilan.meilleur ? [{ c, meilleur: bilan.meilleur, fois: bilan.essais.length, dernier: bilan.essais[bilan.essais.length - 1].quand }] : [];
  }).sort((a, b) => b.dernier.localeCompare(a.dernier));
  if (!faits.length) return null;

  const faitsIds = new Set(faits.map(({ c }) => c.id));
  const aTenter = CLASSIQUES.filter((c) => !faitsIds.has(c.id));
  const photos = photosDeRangee(aTenter.map((c) => ({ id: c.id, title: c.titre, category: c.categorie })));
  const aujourdhui = localDateStr();
  const jours = prevu?.pour === userId ? prevu.jours : null;
  const prochain = jours ? prochainClassique(jours, aujourdhui) : null;
  const ligne = prochain ? lignePrevu(prochain.classique, prochain.date, aujourdhui, faitsIds.has(prochain.classique.id)) : null;

  /* La fiche du classique, par le lanceur global, comme depuis le catalogue. */
  const ouvrir = (c: Classique) => {
    if (!c.ouvert && VENTE_OUVERTE && !(user?.is_premium || user?.is_admin)) { router.push("/premium"); return; }
    launchWorkout({
      sessionId: c.id, title: c.titre, duration: c.minutes, difficulty: c.niveau, category: c.categorie,
      heroImage: heroImageForSeance({ title: c.titre, category: c.categorie }),
    });
  };

  return (
    <section className="mt-7">
      <div className="flex items-baseline gap-2 px-1">
        <h3 className="vy-sous" style={{ color: "var(--text-0)" }}>Tes classiques</h3>
        <span className="vy-nombre text-[20px]" style={{ color: "var(--text-2)", fontWeight: 700 }}>{faits.length}</span>
      </div>
      <p className="text-[16px] px-1 mt-0.5" style={{ color: "var(--text-2)" }}>Ton meilleur sur chacun.</p>
      <div className="grid gap-3 mt-3" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        {faits.map(({ c, meilleur, fois }, i) => (
          <motion.button key={c.id} type="button" whileTap={{ scale: 0.97 }} onClick={() => ouvrir(c)}
            aria-label={`${c.titre}, ton meilleur ${scoreCourt(meilleur)}`}
            className="relative overflow-hidden flex flex-col justify-between p-3.5 text-left cursor-pointer border-none"
            style={{ aspectRatio: "4 / 5", borderRadius: "var(--r-affiche)", background: "#130E1E", boxShadow: "var(--ombre-pose)" }}>
            <span className="absolute inset-0" style={{ background: LUMIERES[i % LUMIERES.length] }} aria-hidden="true" />
            <span className="relative block min-w-0">
              <span className="block text-[16px] font-bold leading-tight text-white">{c.titre}</span>
              <span className="block text-[13px] mt-0.5 leading-snug" style={{ color: "rgba(255,255,255,0.7)" }}>{maj(FACON[c.sorte])}</span>
            </span>
            <span className="relative block">
              <span className="block text-white leading-none" style={{ fontWeight: 900, fontVariationSettings: "'wdth' 112", letterSpacing: "-0.03em", fontSize: scoreCourt(meilleur).length > 5 ? 34 : 48 }}>
                {scoreCourt(meilleur)}
              </span>
              <span className="flex items-baseline justify-between gap-2 mt-2 text-[13px]" style={{ color: "rgba(255,255,255,0.72)" }}>
                <span>{dateCourte(meilleur.quand)}</span>
                <span>{faitNFois(fois)}</span>
              </span>
            </span>
          </motion.button>
        ))}
      </div>

      {/* Le prochain classique posé au planning. */}
      {prochain && ligne && (
        <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => ouvrir(prochain.classique)}
          className="w-full mt-4 flex items-center gap-3 px-3.5 py-3 text-left cursor-pointer"
          style={{ minHeight: 68, borderRadius: "var(--r-bloc)", background: "rgb(var(--surface-rgb))", border: "1px solid rgba(var(--accent-rgb),0.1)" }}>
          <span aria-hidden className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(var(--accent-rgb),0.10)", color: "var(--exp-encre)" }}>
            <CalendarDays size={20} strokeWidth={2} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[16px] leading-5 font-bold" style={{ color: "var(--text-0)" }}>{typo(ligne.titre)}</span>
            <span className="block mt-0.5 text-[13px] leading-[18px]" style={{ color: "var(--text-2)" }}>{ligne.detail}</span>
          </span>
          <ChevronRight size={18} strokeWidth={2.2} className="flex-shrink-0" style={{ color: "var(--text-2)" }} aria-hidden />
        </motion.button>
      )}

      {/* À tenter : les classiques pas encore faits, et leur page du catalogue. */}
      {aTenter.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3 mt-6 px-1">
            <h3 className="vy-sous" style={{ color: "var(--text-0)" }}>À tenter</h3>
            <button type="button" onClick={() => router.push("/progression?ouvrir=classiques")}
              className="min-h-[44px] text-[13px] font-bold cursor-pointer bg-transparent border-none" style={{ color: "var(--exp-encre)" }}>
              Les {CLASSIQUES.length}{NB}classiques
            </button>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
            {aTenter.map((c) => (
              <motion.button key={c.id} type="button" whileTap={{ scale: 0.97 }} onClick={() => ouvrir(c)} aria-label={`Ouvrir : ${c.titre}`}
                className="relative flex-shrink-0 overflow-hidden text-left p-0 border-none cursor-pointer"
                style={{ width: 132, height: 176, borderRadius: "var(--r-bloc)", background: "#1A1424" }}>
                <Photo img={photos.get(c.id) ?? "cat-defis"} pos="center 22%" style={{ position: "absolute", inset: 0 }} />
                <span aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(14,10,24,0) 40%, rgba(14,10,24,0.55) 68%, rgba(14,10,24,0.88) 100%)" }} />
                {!c.ouvert && <span className="absolute left-2 top-2"><PucePlus texte={VENTE_OUVERTE ? "Vaiiya+" : "Bientôt Vaiiya+"} /></span>}
                <span className="absolute left-2.5 right-2.5 bottom-2.5">
                  <span className="block text-[16px] leading-[19px] font-bold text-white">{c.titre}</span>
                  <span className="block mt-0.5 text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.86)" }}>
                    {maj(FACON[c.sorte])} · {c.minutes}{NB}min
                  </span>
                </span>
              </motion.button>
            ))}
          </div>
        </>
      )}
      <p className="sr-only">{faits.map(({ c, meilleur }) => `${c.titre}${NB}: ${scoreCourt(meilleur)}`).join(", ")}</p>
    </section>
  );
}

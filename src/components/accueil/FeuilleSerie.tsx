"use client";

/* ─────────────────────────────────────────────────────────────────────
   LA FEUILLE « SÉRIE ».

   Ce qu'ouvre la flamme de l'accueil (Louis, 2026-10-15). Elle ouvrait
   la galerie des rangs, qui n'a rien à voir : on touche une flamme pour
   voir ses jours, pas son rang.

   ⚠️ LES JOURS COMPTÉS SONT CEUX DE LA SÉRIE, PAS CEUX DES MISSIONS.
   Depuis le 2026-10-14, ouvrir Vaiiya tient la série : un jour de la
   série est donc un jour avec une connexion, une séance ou un repas. On
   lit exactement ce que `serie_aura` compte, sinon la feuille dessinerait
   une série différente du nombre écrit au-dessus d'elle.

   ⚠️ ELLE NE COLORIE JAMAIS L'ABSENCE, comme la carte de constance du
   profil : un jour sans est un simple chiffre, jamais une croix ni une
   case rouge. On montre ce qui a été fait.

   ⚠️ LE NOMBRE NE SE RECALCULE PAS ICI. La série en cours vient de l'aura
   (base), la plus longue de `badges_aura`. La feuille ne fait que lire
   quels jours ont été actifs pour les dessiner.

   LA FLAMME EST CELLE DE L'ACCUEIL (Louis, 2026-10-17) : `FlammeSerie`,
   au palier que décide `lib/flammesSerie.ts`. Le dessin plat qui vivait
   ici est supprimé.

   LE CALENDRIER EST UNE TRAÎNÉE QUI CHAUFFE (Louis, 2026-10-17, page « La
   traînée » du canevas) : `CalendrierSerie`, d'après `lib/traineeSerie.ts`.
   Chaque jour prend la couleur de la flamme qu'il avait allumée, le ruban
   ne se coupe plus en fin de semaine, et la prochaine flamme attend sur sa
   date. La rangée des cinq flammes, juste au-dessus, en est la légende.

   LES JOURS GARDÉS PAR UN JOKER (2026-10-24) viennent de l'aura
   (`aura.jokers.couverts`, lus en base par `serie_jokers_aura`) : ils
   relient la série sans compter, et le calendrier y pose un bouclier.
   ───────────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import Sheet from "@/components/communaute/Sheet";
import { IconeJoker } from "@/components/rang/Joker";
import CalendrierSerie from "@/components/serie/CalendrierSerie";
import FlammeSerie from "@/components/serie/FlammeSerie";
import { createClient } from "@/lib/supabase";
import { chargerBadgesAura } from "@/lib/badgesAura";
import { parisDateStr, shiftDateStr } from "@/lib/dates";
import { etatFlamme, PALIERS_FLAMME } from "@/lib/flammesSerie";
import { rangsDesJours } from "@/lib/traineeSerie";

/** Combien de mois on peut remonter. Au-delà, la série a déjà été comptée. */
const MOIS_MAX = 12;

function moisDe(jour: string): { annee: number; mois: number } {
  return { annee: Number(jour.slice(0, 4)), mois: Number(jour.slice(5, 7)) - 1 };
}

export default function FeuilleSerie({
  userId,
  serie,
  couverts = [],
  onFermer,
}: {
  userId: string;
  /** La série en cours, telle que l'accueil l'affiche déjà. */
  serie: number;
  /** Les jours gardés par un joker (`YYYY-MM-DD`). */
  couverts?: string[];
  onFermer: () => void;
}) {
  const aujourdhui = parisDateStr();
  const [actifs, setActifs] = useState<Set<string> | null>(null);
  const [record, setRecord] = useState<number | null>(null);
  const [decalage, setDecalage] = useState(0); // 0 = ce mois-ci, 1 = le précédent…

  useEffect(() => {
    let vivant = true;
    const depuis = shiftDateStr(aujourdhui, -(MOIS_MAX * 31 + 7));
    // `aura_mission_credits` est en RLS propriétaire : ce sont MES lignes.
    void createClient()
      .from("aura_mission_credits")
      .select("period_key")
      .eq("user_id", userId)
      .eq("period_type", "day")
      .in("mission_id", ["connexion", "seance", "repas"])
      .gte("period_key", depuis)
      .then(({ data, error }) => {
        if (!vivant) return;
        setActifs(error ? new Set() : new Set((data ?? []).map((r) => r.period_key as string)));
      });
    void chargerBadgesAura(userId).then((b) => {
      if (vivant) setRecord(b.progres?.serie ?? null);
    });
    return () => { vivant = false; };
  }, [userId, aujourdhui]);

  const { titre, annee, mois, joursDuMois } = useMemo(() => {
    const base = moisDe(aujourdhui);
    const d = new Date(Date.UTC(base.annee, base.mois - decalage, 1));
    const annee = d.getUTCFullYear();
    const mois = d.getUTCMonth();
    const prefixe = `${annee}-${String(mois + 1).padStart(2, "0")}-`;
    const nom = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
    const compte = actifs ? [...actifs].filter((j) => j.startsWith(prefixe)).length : 0;
    return { titre: nom.charAt(0).toUpperCase() + nom.slice(1), annee, mois, joursDuMois: compte };
  }, [aujourdhui, decalage, actifs]);
  // Le rang de chaque jour dans sa série, sur tout ce qui a été lu (douze
  // mois) : une série qui a commencé le mois d'avant garde sa couleur. Un
  // jour gardé par un joker relie la série sans compter.
  const cleCouverts = couverts.join(",");
  const garde = useMemo(() => new Set(cleCouverts ? cleCouverts.split(",") : []), [cleCouverts]);
  const rangs = useMemo(() => rangsDesJours(actifs ?? [], garde), [actifs, garde]);
  const jokersDuMois = useMemo(() => {
    const prefixe = `${annee}-${String(mois + 1).padStart(2, "0")}-`;
    return [...garde].filter((j) => j.startsWith(prefixe)).length;
  }, [garde, annee, mois]);

  const record_ = record !== null ? Math.max(record, serie) : null;
  const flamme = etatFlamme(serie);

  return (
    <Sheet onFermer={onFermer}>
      <div className="flex items-center gap-3.5">
        <FlammeSerie jours={serie} taille={56} />
        <div>
          <p className="vy-label" style={{ color: "var(--feu-encre)" }}>Ta série</p>
          <p style={{ color: "var(--text-0)", fontSize: 34, lineHeight: 1.05, fontWeight: 800 }}>
            <span className="vy-nombre" style={{ fontWeight: 800 }}>{serie}</span>{" "}
            <span style={{ fontSize: 20, fontWeight: 700 }}>{serie > 1 ? "jours de suite" : "jour"}</span>
          </p>
          {/* La seule mesure de la feuille : la flamme suivante, jamais un
              pourcentage sur une flamme qui n'est pas la tienne. */}
          <p className="mt-1" style={{ fontSize: 13, color: "var(--text-2)" }}>
            <b style={{ color: "var(--feu-encre)", fontWeight: 800 }}>{flamme.palier.nom}</b>
            {flamme.suivant ? (
              <>
                {" · plus que "}
                <b className="vy-nombre" style={{ color: "var(--text-0)", fontWeight: 800 }}>{flamme.restant}</b>
                {` ${flamme.restant > 1 ? "jours" : "jour"} avant ${flamme.suivant.nom}`}
              </>
            ) : " · ta flamme est à son plus beau"}
          </p>
        </div>
      </div>
      {record_ !== null && record_ > serie && (
        <p className="mt-2" style={{ fontSize: 13, color: "var(--text-3)" }}>
          Ta plus longue : <b className="vy-nombre" style={{ color: "var(--text-1, var(--text-0))" }}>{record_}</b> jours
        </p>
      )}

      {/* Les cinq flammes. Elles suivent la série EN COURS : après une
          coupure on repart de la Lueur, et ce qui a été tenu une fois vit
          dans les badges de régularité, pas ici. */}
      <p className="vy-label mt-5 mb-2" style={{ color: "var(--text-2)" }}>Tes flammes</p>
      <div className="grid grid-cols-5 gap-1">
        {PALIERS_FLAMME.map((p) => {
          const courant = p.id === flamme.palier.id;
          const tenue = p.des <= serie;
          const unite = p.des > 1 ? "jours" : "jour";
          return (
            <div
              key={p.id}
              className="flex flex-col items-center gap-1 rounded-[14px] px-0.5 pt-2.5 pb-2"
              style={{ background: courant ? "rgba(232,98,12,0.10)" : "transparent" }}
            >
              <span className="flex h-11 items-end">
                <FlammeSerie palier={p.id} taille={36} eteinte={!tenue} />
              </span>
              <span style={{ fontSize: 11, fontWeight: courant ? 800 : 700, whiteSpace: "nowrap", color: courant ? "var(--feu-encre)" : tenue ? "var(--text-0)" : "var(--text-3)" }}>
                {p.nom}
              </span>
              <span className="inline-flex items-center gap-0.5" style={{ fontSize: 11, whiteSpace: "nowrap", color: courant ? "var(--feu-encre)" : tenue ? "var(--teal-encre)" : "var(--text-3)" }}>
                {courant ? (
                  <b style={{ fontWeight: 700 }}>Ta flamme</b>
                ) : (
                  <>
                    {tenue && <><Check size={11} strokeWidth={3} aria-hidden="true" /><span className="sr-only">atteinte, </span></>}
                    <span className="vy-nombre" style={{ fontWeight: 400 }}>{p.des}</span>&nbsp;{unite}
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button type="button" aria-label="Mois précédent"
          disabled={decalage >= MOIS_MAX - 1}
          onClick={() => setDecalage((v) => Math.min(MOIS_MAX - 1, v + 1))}
          className="w-11 h-11 flex items-center justify-center rounded-full cursor-pointer disabled:opacity-30"
          style={{ color: "var(--text-2)" }}>
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-0)" }}>{titre}</p>
          <p style={{ fontSize: 11, color: "var(--text-3)" }}>
            {actifs === null ? " " : joursDuMois > 0 ? `${joursDuMois} jour${joursDuMois > 1 ? "s" : ""} avec toi` : "Pas encore de jour ce mois-ci"}
          </p>
        </div>
        <button type="button" aria-label="Mois suivant"
          disabled={decalage === 0}
          onClick={() => setDecalage((v) => Math.max(0, v - 1))}
          className="w-11 h-11 flex items-center justify-center rounded-full cursor-pointer disabled:opacity-30"
          style={{ color: "var(--text-2)" }}>
          <ChevronRight size={20} />
        </button>
      </div>

      <CalendrierSerie annee={annee} mois={mois} rangs={rangs} aujourdhui={aujourdhui} couverts={garde} />
      {/* La légende du bouclier, seulement quand le mois en porte un. */}
      {jokersDuMois > 0 && (
        <p className="mt-2 flex items-center justify-center gap-1.5" style={{ fontSize: 13, color: "var(--or-encre)", fontWeight: 650 }}>
          <IconeJoker taille={14} />
          {jokersDuMois > 1 ? "Jours gardés par un joker" : "Jour gardé par un joker"}
        </p>
      )}

      <p className="mt-4 text-center" style={{ fontSize: 13, color: "var(--text-3)" }}>
        Ouvrir Vaiiya chaque jour suffit à tenir ta série.
      </p>
    </Sheet>
  );
}

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
   ───────────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Sheet from "@/components/communaute/Sheet";
import { createClient } from "@/lib/supabase";
import { chargerBadgesAura } from "@/lib/badgesAura";
import { parisDateStr, shiftDateStr } from "@/lib/dates";

/** Combien de mois on peut remonter. Au-delà, la série a déjà été comptée. */
const MOIS_MAX = 12;
const JOURS_SEMAINE = ["L", "M", "M", "J", "V", "S", "D"];

function moisDe(jour: string): { annee: number; mois: number } {
  return { annee: Number(jour.slice(0, 4)), mois: Number(jour.slice(5, 7)) - 1 };
}

function cle(annee: number, mois: number, j: number): string {
  return `${annee}-${String(mois + 1).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
}

export function Flamme({ taille = 44 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille * 1.2} viewBox="0 0 40 48" aria-hidden="true">
      <defs>
        <linearGradient id="flamme-serie" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#E8620C" />
          <stop offset="1" stopColor="#F5B120" />
        </linearGradient>
      </defs>
      <path
        d="M20 2c2 8 12 13 12 25 0 9-6 17-12 17S8 36 8 27c0-6 3-9 5-12 1 4 3 6 5 6-1-7 0-13 2-19z"
        fill="url(#flamme-serie)"
      />
      <path d="M20 26c3 4 6 6 6 11 0 4-3 7-6 7s-6-3-6-7c0-3 2-5 3-7 1 2 2 3 3 3-1-3-1-5 0-7z" fill="#FFE3A3" opacity=".85" />
    </svg>
  );
}

export default function FeuilleSerie({
  userId,
  serie,
  onFermer,
}: {
  userId: string;
  /** La série en cours, telle que l'accueil l'affiche déjà. */
  serie: number;
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

  const { titre, cases, joursDuMois } = useMemo(() => {
    const base = moisDe(aujourdhui);
    const d = new Date(Date.UTC(base.annee, base.mois - decalage, 1));
    const annee = d.getUTCFullYear();
    const mois = d.getUTCMonth();
    const nbJours = new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate();
    const vide = (d.getUTCDay() + 6) % 7; // lundi = 0
    const liste: (string | null)[] = Array.from({ length: vide }, () => null);
    for (let j = 1; j <= nbJours; j++) liste.push(cle(annee, mois, j));
    const nom = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
    const compte = actifs ? liste.filter((c) => c && actifs.has(c)).length : 0;
    return { titre: nom.charAt(0).toUpperCase() + nom.slice(1), cases: liste, joursDuMois: compte };
  }, [aujourdhui, decalage, actifs]);

  const record_ = record !== null ? Math.max(record, serie) : null;

  return (
    <Sheet onFermer={onFermer}>
      <div className="flex items-center gap-3.5">
        <Flamme taille={40} />
        <div>
          <p className="vy-label" style={{ color: "var(--feu-encre)" }}>Ta série</p>
          <p style={{ color: "var(--text-0)", fontSize: 34, lineHeight: 1.05, fontWeight: 800 }}>
            <span className="vy-nombre" style={{ fontWeight: 800 }}>{serie}</span>{" "}
            <span style={{ fontSize: 20, fontWeight: 700 }}>{serie > 1 ? "jours de suite" : "jour"}</span>
          </p>
        </div>
      </div>
      {record_ !== null && record_ > serie && (
        <p className="mt-2" style={{ fontSize: 13, color: "var(--text-3)" }}>
          Ta plus longue : <b className="vy-nombre" style={{ color: "var(--text-1, var(--text-0))" }}>{record_}</b> jours
        </p>
      )}

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

      <div className="mt-2 grid grid-cols-7 gap-y-1.5 text-center">
        {JOURS_SEMAINE.map((j, i) => (
          <span key={i} style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)" }}>{j}</span>
        ))}
        {cases.map((c, i) => {
          if (!c) return <span key={i} />;
          const futur = c > aujourdhui;
          const actif = !!actifs?.has(c);
          const estAujourdhui = c === aujourdhui;
          // Un jour actif relié à son voisin forme un ruban : la série se
          // voit d'un coup d'œil, sans compter.
          const avant = actif && actifs!.has(shiftDateStr(c, -1)) && i % 7 !== 0;
          const apres = actif && actifs!.has(shiftDateStr(c, 1)) && i % 7 !== 6;
          return (
            <span key={i} className="relative flex items-center justify-center h-10">
              {(avant || apres) && (
                <i aria-hidden="true" className="absolute top-1/2 -translate-y-1/2 h-8"
                  style={{
                    left: avant ? 0 : "50%",
                    right: apres ? 0 : "50%",
                    background: "rgba(245,177,32,0.22)",
                  }} />
              )}
              <span
                className="relative flex items-center justify-center w-8 h-8 rounded-full vy-nombre"
                style={{
                  fontSize: 13,
                  fontWeight: actif ? 800 : 500,
                  color: actif ? "#fff" : futur ? "var(--text-3)" : "var(--text-2)",
                  opacity: futur ? 0.45 : 1,
                  background: actif ? "linear-gradient(160deg,#F5B120,#E8620C)" : "transparent",
                  boxShadow: estAujourdhui ? "0 0 0 2px var(--feu-encre)" : "none",
                }}
                aria-label={actif ? `${c}, jour de ta série` : c}
              >
                {Number(c.slice(8))}
              </span>
            </span>
          );
        })}
      </div>

      <p className="mt-4 text-center" style={{ fontSize: 13, color: "var(--text-3)" }}>
        Ouvrir Vaiiya chaque jour suffit à tenir ta série.
      </p>
    </Sheet>
  );
}

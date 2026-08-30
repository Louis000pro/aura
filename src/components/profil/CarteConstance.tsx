"use client";

/* ─────────────────────────────────────────────────────────────────────
   LA CARTE DE CONSTANCE.

   Le profil affiche déjà « 🔥 14 ». C'est un nombre juste et un nombre
   muet : il ne dit pas si c'est ta première bonne période ou ta dixième,
   ni ce que tu as tenu avant. La carte montre la même chose en la
   rendant lisible, et elle ne coûte aucune donnée nouvelle.

   ⚠️ ELLE NE COLORIE JAMAIS L'ABSENCE. C'est le défaut précis de la
   grille de GitHub : chaque jour raté y devient un objet visible, aussi
   gros qu'un jour réussi, et l'image qui reste c'est le vide. Ici un
   jour actif est un point plein, un jour sans est un point de 1 px,
   presque la surface elle-même. Mêmes données, l'inverse comme
   impression.

   ⚠️ ÇA COMMENCE À L'INSCRIPTION, JAMAIS AVANT. Pas une case avant ton
   premier jour : dessiner des semaines vides pour une période où tu ne
   connaissais pas Vaiiya inventerait un échec.

   ⚠️ SEIZE SEMAINES, JAMAIS L'ANNÉE. Une grille annuelle sur un compte
   de trois mois, ce sont neuf mois de rien posés à côté de ton travail.

   ⚠️ BINAIRE, COMME LA RÈGLE. Pas de dégradé d'intensité : une journée
   est active ou ne l'est pas (une action utile, séance OU repas, règle
   verrouillée du 21 août). Quatre nuances de teal inventeraient une
   deuxième définition de la journée réussie.

   ⚠️ AUCUN POURCENTAGE. « Assiduité : 68 % » est une note. On compte ce
   qui a été FAIT, jamais ce qui manque.

   La plus longue série vient de `badges_aura` et n'est PAS recalculée
   ici : c'est le même nombre qui débloque « Sept jours » et « Trente
   jours », et il n'en existe qu'un.
   ───────────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { parisDateStr, shiftDateStr } from "@/lib/dates";

const SEMAINES = 16;
const PAS      = 12;   // px entre deux points
const R_PLEIN  = 3.9;
const R_VIDE   = 1.15;

/** Le lundi de la semaine d'une date `YYYY-MM-DD`, en chaîne. */
function lundiDe(jour: string): string {
  const d = new Date(`${jour}T12:00:00Z`);
  const decalage = (d.getUTCDay() + 6) % 7; // lundi = 0
  return shiftDateStr(jour, -decalage);
}

export default function CarteConstance({ userId, inscritLe, serieRecord }: {
  userId: string;
  /** `profiles.created_at`. La carte ne remonte jamais plus haut. */
  inscritLe: string | null;
  /** La plus longue série, rendue par `badges_aura`. `null` = on ne sait pas. */
  serieRecord: number | null;
}) {
  const [actifs, setActifs] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!userId) return;
    let vivant = true;

    /* On lit le registre directement : `aura_mission_credits` est en RLS
       propriétaire, donc ce sont MES lignes et rien d'autre. On lit des
       faits (quels jours ont été actifs), on ne recalcule aucune EXP :
       l'autorité de calcul reste en base, décision du 21 août. */
    const depuis = shiftDateStr(parisDateStr(), -(SEMAINES * 7));
    void createClient()
      .from("aura_mission_credits")
      .select("period_key")
      .eq("user_id", userId)
      .eq("period_type", "day")
      .in("mission_id", ["seance", "repas"])
      .gte("period_key", depuis)
      .then(({ data, error }) => {
        if (!vivant) return;
        setActifs(error ? new Set() : new Set((data ?? []).map((r) => r.period_key as string)));
      });

    return () => { vivant = false; };
  }, [userId]);

  const { colonnes, total, semainesVues } = useMemo(() => {
    const aujourdhui = parisDateStr();
    const debutGrille = lundiDe(shiftDateStr(aujourdhui, -((SEMAINES - 1) * 7)));
    const naissance = inscritLe ? inscritLe.slice(0, 10) : null;

    const cols: (string | null)[][] = [];
    let compte = 0;
    let premiereVue = SEMAINES;

    for (let s = 0; s < SEMAINES; s++) {
      const col: (string | null)[] = [];
      for (let j = 0; j < 7; j++) {
        const jour = shiftDateStr(debutGrille, s * 7 + j);
        // Ni avant l'inscription, ni dans le futur : ces cases ne se
        // dessinent pas du tout, elles ne sont pas « ratées ».
        if (jour > aujourdhui || (naissance && jour < naissance)) col.push(null);
        else {
          col.push(jour);
          if (s < premiereVue) premiereVue = s;
          if (actifs?.has(jour)) compte++;
        }
      }
      cols.push(col);
    }
    return { colonnes: cols, total: compte, semainesVues: SEMAINES - premiereVue };
  }, [actifs, inscritLe]);

  if (actifs === null) {
    return (
      <div
        className="rounded-3xl h-[152px] mt-3 animate-pulse"
        style={{ background: "rgba(var(--tint-violet-rgb),0.5)" }}
      />
    );
  }

  const largeur = PAS * SEMAINES + 2;
  const hauteur = PAS * 7 + 2;

  return (
    <div
      className="rounded-3xl px-4 py-3.5 mt-3"
      style={{
        background: "rgba(var(--surface-rgb),0.8)",
        border: "1px solid rgba(var(--accent-rgb),0.14)",
        boxShadow: "0 4px 24px rgba(var(--accent-rgb),0.1), inset 0 1px 0 rgba(var(--surface-rgb),1)",
        backdropFilter: "blur(10px)",
      }}
    >
      <p className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: "var(--text-3)" }}>
        Ta constance
      </p>

      <svg
        viewBox={`0 0 ${largeur} ${hauteur}`} width="100%"
        preserveAspectRatio="xMinYMin meet"
        className="mt-2.5 block"
        role="img"
        aria-label={`${total} journées actives sur les ${SEMAINES} dernières semaines`}
      >
        {colonnes.map((col, x) =>
          col.map((jour, y) => {
            if (!jour) return null;
            const cx = 1 + PAS * x + PAS / 2;
            const cy = 1 + PAS * y + PAS / 2;
            const plein = actifs.has(jour);
            return (
              <circle
                key={jour}
                cx={cx} cy={cy}
                r={plein ? R_PLEIN : R_VIDE}
                fill={plein ? "var(--teal-encre)" : "rgba(var(--text-3-rgb),0.42)"}
              />
            );
          }),
        )}
      </svg>

      <p className="text-[11.5px] mt-2.5 leading-relaxed" style={{ color: "var(--text-3)" }}>
        {serieRecord !== null && serieRecord > 1 && (
          <>
            Ta plus longue série : <b style={{ color: "var(--text-2)", fontWeight: 700 }}>{serieRecord} jours</b>.<br />
          </>
        )}
        {semainesVues < SEMAINES
          ? <>Tu es là depuis <b style={{ color: "var(--text-2)", fontWeight: 700 }}>{semainesVues <= 1 ? "une semaine" : `${semainesVues} semaines`}</b>.</>
          : <>{total} journée{total > 1 ? "s" : ""} active{total > 1 ? "s" : ""} sur les {SEMAINES} dernières semaines.</>}
      </p>
    </div>
  );
}

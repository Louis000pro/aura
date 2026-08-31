"use client";

/* ─────────────────────────────────────────────────────────────────────
   LA COURBE DE POIDS.

   Le poids est la donnée la plus chargée du produit, et la seule où un
   choix de dessin peut littéralement faire de la peine. Quatre règles
   verrouillées, et la première est mathématique avant d'être esthétique.

   ⚠️ 1. L'ÉCHELLE A UN PLANCHER DE 4 kg (`AMPLITUDE_MIN`).
   Une échelle qui s'ajuste au minimum et au maximum, réglage par défaut
   de toutes les bibliothèques de graphiques, fait d'un wobble de 300 g
   une falaise. C'est une machine à culpabiliser, et c'est de
   l'arithmétique, pas du goût : avec un plancher, une variation normale
   ressemble à une variation normale, et une vraie tendance se voit
   quand même.

   ⚠️ 2. LA COURBE EST TEAL DANS LES DEUX SENS. Le teal, dans le système
   D, veut dire « le corps », pas « bravo ». Monter n'est pas un échec :
   quelqu'un en prise de masse veut exactement ça. Pas de vert, pas de
   rouge, jamais.

   ⚠️ 3. PAS DE LIGNE D'OBJECTIF. Une ligne cible transforme une courbe
   en dette : chaque jour, elle mesure la distance qui te sépare de là où
   tu « devrais » être. C'est l'anneau-culpabilité retiré de la nutrition,
   dessiné autrement.

   ⚠️ 4. PAS D'AXE, PAS DE GRILLE, PAS DE POURCENTAGE. Le chiffre du jour
   est écrit en grand au-dessus, le mouvement en toutes lettres en
   dessous. Un axe des ordonnées n'ajouterait qu'une précision que
   personne ne lit, au prix de la seule chose qui compte : la forme.

   La phrase dit le FAIT (« −2,5 kg depuis le 12 juin », « stable depuis
   trois semaines »). Jamais d'adverbe, jamais de compliment, jamais de
   « continue comme ça » : on dit ce qui s'est passé, la personne sait si
   c'est ce qu'elle voulait.
   ───────────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type Pesee = { date: string; kg: number };

const FENETRE_JOURS  = 120;
const AMPLITUDE_MIN  = 4;    // kg, voir la règle 1
const LARGEUR        = 300;
const HAUTEUR        = 84;

/** Le mouvement, en toutes lettres. Rend `null` s'il n'y a rien à dire. */
function phraseMouvement(pesees: Pesee[]): string | null {
  if (pesees.length < 2) return null;
  const debut = pesees[0];
  const fin   = pesees[pesees.length - 1];
  const delta = fin.kg - debut.kg;

  // Sous 500 g d'écart sur toute la fenêtre, on ne parle pas de tendance :
  // c'est le bruit d'une balance, et le nommer inventerait un mouvement.
  if (Math.abs(delta) < 0.5) {
    const jours = Math.round(
      (new Date(fin.date).getTime() - new Date(debut.date).getTime()) / 86400000,
    );
    const semaines = Math.max(1, Math.round(jours / 7));
    return semaines >= 2 ? `Stable depuis ${semaines} semaines.` : "Stable cette semaine.";
  }

  const signe = delta > 0 ? "+" : "−";
  const val   = Math.abs(delta).toFixed(1).replace(".", ",");
  const jour  = new Date(debut.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  return `${signe}${val} kg depuis le ${jour}.`;
}

/** Le chemin lissé (Catmull-Rom converti en Bézier) et le dernier point. */
function tracer(pesees: Pesee[]): { d: string; fin: [number, number] } | null {
  if (pesees.length < 2) return null;

  const kgs = pesees.map((p) => p.kg);
  let bas = Math.min(...kgs);
  let haut = Math.max(...kgs);
  if (haut - bas < AMPLITUDE_MIN) {
    const milieu = (haut + bas) / 2;
    bas  = milieu - AMPLITUDE_MIN / 2;
    haut = milieu + AMPLITUDE_MIN / 2;
  }

  const t0 = new Date(pesees[0].date).getTime();
  const t1 = new Date(pesees[pesees.length - 1].date).getTime();
  const etendue = Math.max(1, t1 - t0);

  const pts: [number, number][] = pesees.map((p) => [
    3 + (LARGEUR - 6) * ((new Date(p.date).getTime() - t0) / etendue),
    5 + (HAUTEUR - 10) * (1 - (p.kg - bas) / (haut - bas)),
  ]);

  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return { d, fin: pts[pts.length - 1] };
}

export default function CourbePoids({ userId, onPeser }: {
  userId: string;
  /** Ouvre la pesée du jour. Une porte, jamais deux : c'est la MÊME feuille
   *  que le rendez-vous mensuel de la nutrition, pas une seconde saisie. */
  onPeser: () => void;
}) {
  const [pesees, setPesees] = useState<Pesee[] | null>(null);

  useEffect(() => {
    if (!userId) return;
    let vivant = true;

    const charger = () => {
      const depuis = new Date(Date.now() - FENETRE_JOURS * 86400000)
        .toISOString().slice(0, 10);
      void createClient()
        .from("weight_logs")
        .select("date, weight_kg")
        .eq("user_id", userId)
        .gte("date", depuis)
        .order("date", { ascending: true })
        .then(({ data }) => {
          if (!vivant) return;
          setPesees(
            ((data ?? []) as { date: string; weight_kg: number }[])
              .map((r) => ({ date: r.date, kg: Number(r.weight_kg) }))
              .filter((p) => Number.isFinite(p.kg)),
          );
        });
    };

    charger();
    // Une pesée enregistrée ailleurs (le rendez-vous mensuel) redessine la
    // courbe sans recharger l'écran. L'évènement existe déjà.
    window.addEventListener("vaiiya:weighin", charger);
    return () => { vivant = false; window.removeEventListener("vaiiya:weighin", charger); };
  }, [userId]);

  const trace  = useMemo(() => (pesees ? tracer(pesees) : null), [pesees]);
  const phrase = useMemo(() => (pesees ? phraseMouvement(pesees) : null), [pesees]);

  if (pesees === null) {
    return (
      <div
        className="rounded-3xl h-[152px] animate-pulse"
        style={{ background: "rgba(var(--tint-violet-rgb),0.5)" }}
      />
    );
  }

  const dernier = pesees[pesees.length - 1];

  return (
    <button
      type="button"
      onClick={onPeser}
      className="w-full text-left rounded-3xl px-4 py-3.5 cursor-pointer"
      style={{
        background: "rgba(var(--surface-rgb),0.8)",
        border: "1px solid rgba(var(--accent-rgb),0.14)",
        boxShadow: "0 4px 24px rgba(var(--accent-rgb),0.1), inset 0 1px 0 rgba(var(--surface-rgb),1)",
        backdropFilter: "blur(10px)",
      }}
      aria-label="Ton poids, et ajouter une pesée"
    >
      <span className="block text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: "var(--text-3)" }}>
        Ton poids
      </span>

      {dernier ? (
        <span className="flex items-baseline gap-1.5 mt-1">
          <b
            className="text-[30px] font-black leading-none tabular-nums"
            style={{ color: "var(--teal-encre)", letterSpacing: "-0.035em" }}
          >
            {dernier.kg.toFixed(1).replace(".", ",")}
          </b>
          <i className="not-italic text-[13px] font-bold" style={{ color: "var(--teal-encre)", opacity: 0.72 }}>kg</i>
        </span>
      ) : (
        <span className="block text-[13px] font-semibold mt-1.5" style={{ color: "var(--text-1)" }}>
          Aucune pesée pour l&apos;instant.
        </span>
      )}

      {phrase && (
        <span className="block text-[11.5px] mt-1.5" style={{ color: "var(--text-2)" }}>{phrase}</span>
      )}

      {trace ? (
        <span className="block mt-2.5">
          <svg
            viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} width="100%" height={HAUTEUR}
            preserveAspectRatio="none" aria-hidden="true" style={{ display: "block" }}
          >
            <defs>
              <linearGradient id="vy-poids" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#2BD4A0" stopOpacity="0.22" />
                <stop offset="1" stopColor="#2BD4A0" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${trace.d}L${LARGEUR - 3},${HAUTEUR}L3,${HAUTEUR}Z`} fill="url(#vy-poids)" />
            <path d={trace.d} fill="none" stroke="var(--teal-encre)" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={trace.fin[0]} cy={trace.fin[1]} r="3.6" fill="var(--teal-encre)" />
          </svg>
        </span>
      ) : (
        /* ⚠️ SOUS DEUX PESÉES, PAS DE COURBE : une ligne entre deux points
           n'est pas une tendance, c'est un trait.
           ⚠️ ET PAS DE GUIDE ICI, malgré la maquette : la liste des séances
           juste en dessous a déjà le sien quand elle est vide, et un compte
           neuf a les deux vides en même temps. Un seul Guide par écran. */
        <span className="block text-[12px] mt-2 leading-relaxed" style={{ color: "var(--text-3)" }}>
          {pesees.length === 1
            ? "Une seule pesée pour l’instant. À la deuxième, la courbe commence."
            : "Pèse-toi une fois, puis une autre : la courbe part de là."}
          <b className="block mt-1.5 text-[12.5px] font-bold" style={{ color: "var(--exp-encre)" }}>
            Me peser
          </b>
        </span>
      )}
    </button>
  );
}

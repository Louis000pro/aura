"use client";

/* ─────────────────────────────────────────────────────────────
   La semaine ensemble (Louis, 2026-10-21, maquette « La semaine
   ensemble » validée : « Fait ça »).

   Un objectif commun pour la bande, en tête du fil : trois séances
   par membre, du lundi au dimanche. La carte montre le total de la
   bande et qui a déjà bougé ; la feuille, l'anneau en grand, les
   jours où quelqu'un a bougé, et la bande.

   ⚠️ CE QUI N'EST PAS ICI, ET NE DOIT PAS Y VENIR : un compte par
   personne, un classement, le nom de quelqu'un qui n'a pas encore
   bougé, un reproche. La base ne rend d'ailleurs aucun compte par
   personne (`semaine_ensemble`).
   ───────────────────────────────────────────────────────────── */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, X } from "lucide-react";
import Sheet from "@/components/communaute/Sheet";
import { PersonAvatar } from "@/components/communaute/ConversationAvatar";
import type { Personne } from "@/lib/messagerie";
import type { SemaineEnsemble as Semaine } from "@/lib/filPotes";

const LETTRES = ["zéro", "une", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"];
const enLettres = (n: number) => (n >= 0 && n < LETTRES.length ? LETTRES[n] : String(n));

/** La phrase de la semaine : ce qui reste, jamais qui manque. */
function phrase(s: Semaine): string {
  const reste = s.objectif - s.seances;
  if (reste <= 0) return "Objectif atteint ensemble. Bravo la bande.";
  if (s.seances === 0) return `La semaine commence : ${s.objectif} séances à faire ensemble.`;
  if (reste === 1) return "Plus qu’une pour la bande, d’ici dimanche.";
  return `Plus que ${enLettres(reste)} pour la bande, d’ici dimanche.`;
}

function Anneau({ part, taille, epaisseur }: { part: number; taille: number; epaisseur: number }) {
  const r = (taille - epaisseur) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, part));
  return (
    <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`} aria-hidden>
      <defs>
        <linearGradient id="se-anneau" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#C13BC1" />
        </linearGradient>
      </defs>
      <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke="rgba(139,92,246,.14)" strokeWidth={epaisseur} />
      {p > 0 && (
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke="url(#se-anneau)" strokeWidth={epaisseur}
          strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} transform={`rotate(-90 ${taille / 2} ${taille / 2})`} />
      )}
    </svg>
  );
}

function Visage({ p, actif, taille }: { p: Personne; actif: boolean; taille: number }) {
  return (
    <span className="flex rounded-full p-[2px]"
      style={{ background: actif ? "linear-gradient(135deg, #8B5CF6, #C13BC1)" : "transparent" }}>
      <span className="rounded-full p-[2px]" style={{ background: "rgb(var(--bg-rgb))" }}>
        <PersonAvatar personne={p} taille={taille} />
      </span>
    </span>
  );
}

const JOURS = ["L", "M", "M", "J", "V", "S", "D"];
const NOMS_JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

function datesDeLaSemaine(debut: string): string[] {
  const [a, m, j] = debut.split("-").map(Number);
  return Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(a, m - 1, j + i)).toISOString().slice(0, 10));
}

function libelleSemaine(debut: string): string {
  const d = datesDeLaSemaine(debut);
  const f = (s: string, mois: boolean) => new Date(s + "T12:00:00Z").toLocaleDateString("fr-FR", {
    day: "numeric", ...(mois ? { month: "long" } : {}), timeZone: "UTC",
  });
  const memeMois = d[0].slice(5, 7) === d[6].slice(5, 7);
  return `Du lundi ${f(d[0], !memeMois)} au dimanche ${f(d[6], true)}`;
}

export default function SemaineEnsemble({ semaine, bande, moi }: {
  semaine: Semaine;
  /** Moi en premier (pseudo « Toi »), puis mes amis. */
  bande: Personne[];
  moi: string;
}) {
  const [ouverte, setOuverte] = useState(false);

  // Le bouton retour du téléphone ferme la feuille au lieu de quitter
  // la Communauté : on pose une entrée d'historique à l'ouverture, et
  // fermer à la main la consomme pour ne rien laisser derrière.
  useEffect(() => {
    if (!ouverte) return;
    history.pushState({ semaineEnsemble: true }, "");
    const surRetour = () => setOuverte(false);
    window.addEventListener("popstate", surRetour);
    return () => {
      window.removeEventListener("popstate", surRetour);
      if (history.state?.semaineEnsemble) history.back();
    };
  }, [ouverte]);
  const part = semaine.objectif ? semaine.seances / semaine.objectif : 0;
  const ontBouge = bande.filter((p) => semaine.aBouge.has(p.id));
  const aujourdhui = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
  const dates = datesDeLaSemaine(semaine.debut);

  /* Le compte vit DANS l'anneau : le nombre, puis « sur 9 » dessous.
     Écrit sur une ligne (« 4 / 9 séances »), il débordait du cercle. */
  const compte = (grand: boolean) => (
    <span className="absolute inset-0 flex flex-col items-center justify-center">
      <span className="vy-nombre" style={{ fontSize: grand ? 44 : 24, fontWeight: 800, color: "var(--text-0)", lineHeight: 1 }}>
        {semaine.seances}
      </span>
      <span className="mt-1" style={{ fontSize: grand ? 13 : 11, color: "var(--text-3)", lineHeight: 1 }}>
        sur {semaine.objectif}
      </span>
    </span>
  );

  return (
    <>
      <button onClick={() => setOuverte(true)} aria-label="Ouvrir la semaine ensemble"
        className="mb-5 flex w-full flex-col gap-3.5 p-4 text-left"
        style={{ borderRadius: "var(--r-bloc)", background: "rgb(var(--surface-rgb))", boxShadow: "var(--ombre-pose)" }}>
        <span className="flex w-full items-center justify-between">
          <span className="text-[13px] font-semibold" style={{ color: "var(--text-3)" }}>Cette semaine, ensemble</span>
          <ChevronRight className="h-4 w-4" style={{ color: "var(--text-3)" }} />
        </span>
        <span className="flex items-center gap-4">
          <span className="relative flex-shrink-0">
            <Anneau part={part} taille={78} epaisseur={8} />
            {compte(false)}
          </span>
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-[16px] font-semibold" style={{ color: "var(--text-0)" }}>
              {semaine.seances} séance{semaine.seances > 1 ? "s" : ""} faite{semaine.seances > 1 ? "s" : ""} ensemble
            </span>
            <span className="text-[13px] leading-snug" style={{ color: "var(--text-2)" }}>{phrase(semaine)}</span>
          </span>
        </span>
        {ontBouge.length > 0 && (
          <span className="flex items-center gap-2.5">
            <span className="flex">
              {ontBouge.slice(0, 5).map((p, i) => (
                <span key={p.id} style={{ marginLeft: i ? -8 : 0 }}><Visage p={p} actif taille={26} /></span>
              ))}
            </span>
            <span className="text-[13px]" style={{ color: "var(--text-2)" }}>
              {ontBouge.length === bande.length
                ? "Toute la bande a bougé"
                : `${enLettres(ontBouge.length).replace(/^./, (c) => c.toUpperCase())} de la bande ${ontBouge.length > 1 ? "ont" : "a"} déjà bougé`}
            </span>
          </span>
        )}
      </button>

      {ouverte && (
        <Sheet onFermer={() => setOuverte(false)}>
          <div className="flex flex-col gap-5 px-1 pb-4">
            <button onClick={() => setOuverte(false)} aria-label="Fermer"
              className="-mb-5 flex h-10 w-10 items-center justify-center self-end rounded-full"
              style={{ background: "rgba(var(--text-3-rgb), .12)", color: "var(--text-1)" }}>
              <X className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="text-[13px] font-semibold" style={{ color: "var(--text-3)" }}>{libelleSemaine(semaine.debut)}</span>
              <h2 className="vy-titre" style={{ color: "var(--text-0)" }}>La semaine ensemble</h2>
              <span className="relative flex items-center justify-center">
                <Anneau part={part} taille={150} epaisseur={12} />
                {compte(true)}
              </span>
              <p className="max-w-[300px] text-[16px] leading-snug" style={{ color: "var(--text-1)" }}>
                {phrase(semaine)} Chaque séance de chacun compte.
              </p>
            </div>

            <div style={{ borderRadius: "var(--r-bloc)", background: "rgba(var(--tint-violet-rgb), .35)" }}>
              <div className="vy-filet flex flex-col gap-3 p-4">
                <span className="text-[13px] font-semibold" style={{ color: "var(--text-3)" }}>Les jours où la bande a bougé</span>
                <div className="grid grid-cols-7 gap-1.5">
                  {dates.map((d, i) => {
                    const fait = semaine.jours.has(d);
                    const auj = d === aujourdhui;
                    return (
                      <span key={d} className="flex flex-col items-center gap-1.5"
                        aria-label={`${NOMS_JOURS[i]}${fait ? " : quelqu’un a bougé" : ""}`}>
                        <span className="h-8 w-8 rounded-full"
                          style={fait
                            ? { background: "linear-gradient(135deg, #8B5CF6, #C13BC1)", boxShadow: auj ? "0 0 0 2px rgb(var(--bg-rgb)), 0 0 0 4px #C13BC1" : undefined }
                            : { border: `1.5px dashed rgba(var(--text-3-rgb), ${auj ? .7 : .35})` }} />
                        <span className="text-[11px]" aria-hidden
                          style={{ color: auj ? "var(--text-0)" : "var(--text-3)", fontWeight: auj ? 700 : 400 }}>{JOURS[i]}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="vy-filet flex flex-col gap-3 p-4">
                <span className="text-[13px] font-semibold" style={{ color: "var(--text-3)" }}>La bande</span>
                <div className="-mx-4 flex gap-3.5 overflow-x-auto px-4 pb-1">
                  {bande.map((p) => (
                    <span key={p.id} className="flex w-[56px] flex-shrink-0 flex-col items-center gap-1.5">
                      <Visage p={p} actif={semaine.aBouge.has(p.id)} taille={44} />
                      <span className="w-full truncate text-center text-[11px]" style={{ color: "var(--text-2)" }}>
                        {p.id === moi ? "Toi" : p.pseudo}
                      </span>
                    </span>
                  ))}
                </div>
                <span className="text-[13px]" style={{ color: "var(--text-3)" }}>L’anneau violet : a déjà bougé cette semaine.</span>
              </div>
            </div>

            {!semaine.aBouge.has(moi) && (
              <Link href="/" onClick={() => setOuverte(false)}
                className="py-3.5 text-center text-[16px] font-semibold text-white"
                style={{ borderRadius: "var(--r-controle)", background: "linear-gradient(135deg, #8B5CF6, #C13BC1)", boxShadow: "var(--ombre-action)" }}>
                Faire ma séance
              </Link>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}

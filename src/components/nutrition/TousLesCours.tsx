"use client";

/* ════════════════════════════════════════════════════════════════════
   « Tous les cours », en vue pleine dans l'écran Nutrition : le sommaire
   de la banque de cours (version B de la maquette « Distinguer un cours
   d'une recette », Louis, 2026-10-25).

   Un thème = un cadre, ses cours en lignes séparées par un filet (la
   photo du plat en petit, le titre, le format), et « Voir les N cours »
   quand il en a plus de trois. Un thème sans cours écrit ne s'affiche
   pas : on ne montre jamais un chantier.

   Les puces de format (Flash, Cours, Dossier) n'apparaissent que si elles
   changent vraiment la liste (deux cours au moins, jamais tous), comme
   les puces d'une envie. Le retour du téléphone ferme la vue
   (useRetourTelephone, dans l'écran).
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { BookOpen, Check, ChevronLeft, ChevronRight } from "lucide-react";
import {
  NOM_FORMAT, VISIBLES_PAR_THEME, formatsQuiFiltrent, libelleFormat, resumeFormats, themesAvecCours,
  type Cours, type FormatCours, type IdThemeCours,
} from "@/lib/coursNutrition";
import { imageRecette } from "@/lib/collectionsRecettes";
import { Cadenas, nomAccessible } from "@/components/nutrition/ComprendreNutrition";
import { Typo } from "@/components/nutrition/Typo";
import c from "@/components/nutrition/Cours.module.css";
import ns from "@/components/nutrition/Nutrition.module.css";

function LigneCours({ cours, lu, verrou, onOuvrir }: {
  cours: Cours; lu: boolean; verrou: boolean; onOuvrir: () => void;
}) {
  return (
    <button type="button" onClick={onOuvrir} aria-label={nomAccessible(cours, lu, verrou)} className={`vy-filet ${c.ligne}`}>
      <span className={c.lignePhoto}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageRecette(cours.photo)} alt="" loading="lazy" decoding="async" />
        {verrou && <Cadenas taille={11} />}
      </span>
      <span className={c.ligneTexte}>
        <span className={c.ligneTitre}><Typo s={cours.titre} /></span>
        <span className={`${c.format} ${c.ligneFormat}`}>
          <BookOpen size={12} strokeWidth={2.2} aria-hidden />
          {libelleFormat(cours)}
          {verrou && <span className={c.plus}>Vaiiya+</span>}
          {lu && !verrou && (
            <span className={`${c.lu} inline-flex items-center gap-1`}>
              <Check size={12} strokeWidth={2.8} aria-hidden />Lu
            </span>
          )}
        </span>
      </span>
      <ChevronRight size={16} strokeWidth={2.3} aria-hidden style={{ color: "var(--text-3)", flexShrink: 0 }} />
    </button>
  );
}

export default function TousLesCours({ cours, lus, premiumDebloque, onRetour, onOuvrir }: {
  cours: Cours[];
  lus: ReadonlySet<string>;
  premiumDebloque: boolean;
  onRetour: () => void;
  onOuvrir: (cours: Cours) => void;
}) {
  const [format, setFormat] = useState<FormatCours | null>(null);
  const [deplies, setDeplies] = useState<IdThemeCours[]>([]);
  const puces = formatsQuiFiltrent(cours);
  const visibles = format ? cours.filter((co) => co.format === format) : cours;

  return (
    <div className="flex flex-col gap-6">
      <button type="button" onClick={onRetour} aria-label="Revenir à la nutrition" className={ns.rond}>
        <ChevronLeft size={19} strokeWidth={2.2} />
      </button>

      <div className="-mt-2 flex flex-col gap-1.5">
        <h1 className="text-[34px] leading-none" style={{ color: "var(--text-0)", fontWeight: 800, fontVariationSettings: "var(--w-voix)" }}>
          Comprendre la nutrition
        </h1>
        <p className="text-[13px]" style={{ color: "var(--text-3)" }}>{resumeFormats(cours)}</p>
      </div>

      {puces.length > 0 && (
        <div role="group" aria-label="Format" className={`${ns.rail} -mx-4 px-4`} style={{ gap: 8 }}>
          <button type="button" aria-pressed={format === null} onClick={() => setFormat(null)} className={`${ns.puce} ${ns.puceRail}`}>
            Tous
          </button>
          {puces.map((f) => (
            <button key={f} type="button" aria-pressed={format === f} onClick={() => setFormat(format === f ? null : f)}
              className={`${ns.puce} ${ns.puceRail}`}>
              {NOM_FORMAT[f].titre}
            </button>
          ))}
        </div>
      )}

      {themesAvecCours(visibles).map((t) => {
        /* Avec un format choisi, chaque thème montre tous ses cours de ce format. */
        const tout = format !== null || deplies.includes(t.id);
        const montres = tout ? t.cours : t.cours.slice(0, VISIBLES_PAR_THEME);
        return (
          <section key={t.id} className="flex flex-col gap-2.5" aria-label={t.nom}>
            <h2 className="text-[20px]" style={{ color: "var(--text-0)", fontWeight: 750, fontVariationSettings: "var(--w-voix)" }}>
              {t.nom}
            </h2>
            <div className={c.sommaire}>
              {montres.map((co) => (
                <LigneCours key={co.id} cours={co} lu={lus.has(co.id)}
                  verrou={co.acces === "vaiiya+" && !premiumDebloque} onOuvrir={() => onOuvrir(co)} />
              ))}
              {montres.length < t.cours.length && (
                <button type="button" onClick={() => setDeplies((d) => [...d, t.id])} className={`vy-filet ${c.voirTout}`}>
                  Voir les {t.cours.length}&nbsp;cours
                  <ChevronRight size={14} strokeWidth={2.3} aria-hidden />
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

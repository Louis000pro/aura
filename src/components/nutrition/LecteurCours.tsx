"use client";

/* ════════════════════════════════════════════════════════════════════
   Le lecteur d'un cours de nutrition, version B de la maquette
   « Distinguer un cours d'une recette » (Louis, 2026-10-25) : une page
   claire, le titre d'abord, le visage du Guide à côté de l'intro, puis
   la photo du plat posée dans le texte, jamais en couverture. C'est ce
   qui sépare un cours d'une fiche recette, qui s'ouvre sur sa photo.

   Le texte se charge à l'ouverture (lib/coursNutrition, `chargerTexte`).
   Le cours est noté lu quand son « À retenir » passe à l'écran
   (hooks/useCoursLus), sur cet appareil seulement.

   ⚠️ Le texte est le même pour Nora et Sasha : seul le visage change. Le
   lecteur se rend dans un portail vers `document.body`, comme la feuille
   du bas : un ancêtre animé en `transform` cadrerait un élément `fixed`
   sur lui-même.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, BookOpen, X } from "lucide-react";
import { lockBodyModal } from "@/lib/bodyModal";
import { useGuideActif } from "@/context/GuideContext";
import { VisageGuide } from "@/components/AssistantMark";
import {
  THEMES_COURS, chargerTexte, dateLisible, libelleEnvie, libelleFormat,
  type Cours, type TexteCours,
} from "@/lib/coursNutrition";
import { envie, imageRecette, type IdEnvie } from "@/lib/collectionsRecettes";
import { marquerLu } from "@/hooks/useCoursLus";
import { Typo } from "@/components/nutrition/Typo";
import c from "@/components/nutrition/Cours.module.css";
import ns from "@/components/nutrition/Nutrition.module.css";

function Paragraphes({ liste }: { liste: string[] }) {
  return <>{liste.map((p) => <p key={p}><Typo s={p} /></p>)}</>;
}

export default function LecteurCours({ cours, uid, onFermer, onEnvie }: {
  cours: Cours;
  uid: string | null;
  onFermer: () => void;
  onEnvie: (id: IdEnvie) => void;
}) {
  const { guide } = useGuideActif();
  const [texte, setTexte] = useState<TexteCours | null>(null);
  const [rate, setRate] = useState(false);
  const [essai, setEssai] = useState(0);
  const [progres, setProgres] = useState(0);
  const page = useRef<HTMLElement>(null);
  const defile = useRef<HTMLDivElement>(null);
  const retenir = useRef<HTMLElement>(null);

  useEffect(() => {
    let annule = false;
    chargerTexte(cours.id)
      .then((t) => { if (!annule) setTexte(t); })
      .catch(() => { if (!annule) setRate(true); });
    return () => { annule = true; };
  }, [cours.id, essai]);

  // La barre du bas et l'en-tête de l'app s'effacent sous le lecteur.
  const fermerRef = useRef(onFermer);
  useEffect(() => { fermerRef.current = onFermer; });
  useEffect(() => {
    const liberer = lockBodyModal();
    document.body.classList.add("advice-reader-open");
    page.current?.focus({ preventScroll: true });
    const surTouche = (e: KeyboardEvent) => { if (e.key === "Escape") fermerRef.current(); };
    window.addEventListener("keydown", surTouche);
    return () => {
      window.removeEventListener("keydown", surTouche);
      document.body.classList.remove("advice-reader-open");
      liberer();
    };
  }, []);

  // Lu : « À retenir » est passé à l'écran.
  useEffect(() => {
    const cible = retenir.current;
    const racine = defile.current;
    if (!texte || !cible || !racine || !uid) return;
    const io = new IntersectionObserver((entrees) => {
      if (entrees.some((e) => e.isIntersecting)) { marquerLu(uid, cours.id); io.disconnect(); }
    }, { root: racine, threshold: 0.6 });
    io.observe(cible);
    return () => io.disconnect();
  }, [texte, uid, cours.id]);

  const suivre = () => {
    const n = defile.current;
    if (!n) return;
    const course = n.scrollHeight - n.clientHeight;
    setProgres(course <= 0 ? 100 : Math.min(100, Math.max(0, (n.scrollTop / course) * 100)));
  };

  const theme = THEMES_COURS.find((t) => t.id === cours.theme)?.nom ?? "";
  const idTitre = `cours-${cours.id}`;

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div className={c.voile}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onFermer(); }}>
      <motion.article ref={page} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={idTitre}
        className={`${c.page} outline-none`}
        initial={{ y: 48, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 36, opacity: 0 }}
        transition={{ type: "spring", stiffness: 370, damping: 34 }}>
        <div className={c.progres} aria-hidden><span style={{ width: `${progres}%` }} /></div>

        <button type="button" onClick={onFermer} className={c.fermer} aria-label="Fermer le cours">
          <X size={15} strokeWidth={2.4} aria-hidden />
          Fermer
        </button>

        <div ref={defile} onScroll={suivre} className={c.defile}>
          <div className={c.contenu}>
            <header className={c.entete}>
              <span className={c.format} style={{ fontSize: 13 }}>
                <BookOpen size={14} strokeWidth={2.2} aria-hidden />
                {theme} · {libelleFormat(cours)}
                {cours.acces === "vaiiya+" && <span className={c.plus}>Vaiiya+</span>}
              </span>
              <h1 id={idTitre} className={c.titre}><Typo s={cours.titre} /></h1>
              <p className={c.sousTitre}><Typo s={cours.sousTitre} /></p>
            </header>

            {texte ? (
              <>
                <div className={c.intro}>
                  <VisageGuide guide={guide} etat="explain" size={40} />
                  <div><Paragraphes liste={texte.intro} /></div>
                </div>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={c.photo} src={imageRecette(cours.photo)} alt="" decoding="async" />

                {texte.sections.map((s) => (
                  <section key={s.titre} className={c.partie}>
                    <h2><Typo s={s.titre} /></h2>
                    <Paragraphes liste={s.paragraphes} />
                  </section>
                ))}

                <section className={`${c.encadre} ${c.exemple}`}>
                  <h2>Exemple concret</h2>
                  <Paragraphes liste={texte.exemple} />
                </section>

                <section className={`${c.encadre} ${c.doute}`}>
                  <h2>Ce qu’on ne sait pas encore</h2>
                  <Paragraphes liste={texte.doute} />
                </section>

                <div className={c.finale}>
                  <section ref={retenir} className={`${c.encadre} ${c.retenir}`}>
                    <h2>À retenir</h2>
                    <p><Typo s={texte.retenir} /></p>
                  </section>
                  {texte.essai && (
                    <section className={`${c.encadre} ${c.essai}`}>
                      <h2>Essaie ça</h2>
                      <p><Typo s={texte.essai} /></p>
                    </section>
                  )}
                </div>

                {cours.envie && (
                  <button type="button" onClick={() => onEnvie(cours.envie!)} className={ns.pilule}>
                    {libelleEnvie(envie(cours.envie).label)}
                  </button>
                )}

                <section className={c.sources} aria-labelledby={`${idTitre}-sources`}>
                  <div className="flex flex-col gap-1">
                    <h2 id={`${idTitre}-sources`}>Sources</h2>
                    <p className={c.sourcesNote}>
                      Vérifiées le {dateLisible(cours.verifieLe)}. Les connaissances évoluent&nbsp;: ce cours sera relu quand elles changeront.
                    </p>
                  </div>
                  {texte.sources.map((g) => (
                    <div key={g.groupe} className={c.groupe}>
                      <h3>{g.groupe}</h3>
                      {g.liens.map((l) => (
                        <a key={l.url + l.label} href={l.url} target="_blank" rel="noreferrer" className={c.lien}>
                          <ArrowUpRight size={13} strokeWidth={2} aria-hidden />
                          <span><Typo s={l.label} /></span>
                        </a>
                      ))}
                    </div>
                  ))}
                  <p className={c.sourcesNote}>
                    Ces repères sont généraux. Une maladie, une grossesse ou un traitement demandent un avis personnalisé.
                  </p>
                </section>

                <button type="button" onClick={onFermer} className={c.revenir}>Revenir aux cours</button>
              </>
            ) : rate ? (
              <div className="flex flex-col items-start gap-3">
                <p className={c.sousTitre}>Ce cours ne s’est pas chargé. Vérifie ta connexion, puis réessaie.</p>
                <button type="button" onClick={() => { setRate(false); setEssai((n) => n + 1); }} className={c.revenir} style={{ alignSelf: "flex-start", paddingLeft: 0 }}>
                  Réessayer
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3" aria-label="Chargement du cours">
                <span className={c.attente} style={{ width: "92%" }} />
                <span className={c.attente} style={{ width: "100%" }} />
                <span className={c.attente} style={{ width: "74%" }} />
              </div>
            )}
          </div>
        </div>
      </motion.article>
    </motion.div>,
    document.body,
  );
}

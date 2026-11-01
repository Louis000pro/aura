"use client";

/* ════════════════════════════════════════════════════════════════════
   « JE CHOISIS », LE CATALOGUE QUI PROPOSE (maquette « Trouver ma
   séance », version 2 ; GO de Louis le 2026-11-01).

   De haut en bas : la loupe, la ligne de filtres qui défile de côté
   (comme sur Vinted), puis des séances proposées : pour toi, pour
   équilibrer ta semaine, ton prochain palier, moins de 15 minutes, les
   nouvelles, et tout le catalogue. Dès qu'un filtre est choisi, l'écran
   montre les séances qui le tiennent ; dès qu'on tape, la loupe.

   ⚠️ Cet écran ne décide RIEN : les règles vivent dans lib/trouverSeance
   (pur, `npm run check:trouver`). Il n'écrit rien en base ; la seule
   chose qu'il garde, ce sont les dernières recherches, sur l'appareil.

   ⚠️ Une rangée sans données ne s'affiche pas : un compte neuf voit
   « Pour toi », les séances courtes, les nouvelles et le catalogue.
   ════════════════════════════════════════════════════════════════════ */

import { useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, History, Search, SlidersHorizontal, X } from "lucide-react";
import { Photo } from "@/components/entrainement/PhotoSeance";
import ExerciseThumb from "@/components/seance/ExerciseThumb";
import { VisageGuide } from "@/components/AssistantMark";
import { useGuideActif } from "@/context/GuideContext";
import { PRENOM_GUIDE } from "@/lib/guides";
import { readLieu, todayYmd } from "@/lib/planning";
import { uniteRecord, valeurRecord } from "@/lib/records";
import { doseDe, type ExoTour } from "@/lib/toursSeance";
import { photosDeRangee } from "@/lib/workoutArt";
import type { LibExercise } from "@/lib/exerciseLibrary";
import {
  GROUPES, PUCES_LIGNE, SANS_FILTRE, basculer, chercher, choisis, courtes, exercicesDe, filtrer, mouvementsPour,
  nombreDeFiltres, nouvelles, pluriel, pourEquilibrer, pourToi, prochainPalier, pucesChoisies, sousTitre,
  type Contexte, type Filtres, type IdGroupe, type Niveau, type SeanceTrouvable,
} from "@/lib/trouverSeance";
import { CarteGrille, CarteRail, GrandeCarte, LigneSeance, type SeanceCarte } from "./CartesSeance";
import FeuilleFiltres from "./FeuilleFiltres";
import { useDonneesTrouver } from "./useDonneesTrouver";

const NB = String.fromCharCode(160);

/* Les dernières recherches, sur l'appareil, par compte (quatre au plus). */
const CLE_RECENTES = (id: string) => `vaiiya_recherches_seances_${id}`;
function lireRecentes(id: string | null): string[] {
  if (!id) return [];
  try {
    const v = JSON.parse(localStorage.getItem(CLE_RECENTES(id)) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 4) : [];
  } catch { return []; }
}

export type CollectionDuJour = { id: string; name: string; img: string; pos?: string };

type S0 = SeanceTrouvable & SeanceCarte;

export default function TrouverSeance<S extends S0>({
  seances, userId, niveau, canAccessPremium, collections, nbCollections, loupeAuDepart = false,
  onStart, onPremium, onManage, onCollection, onToutesCollections, onDemander, onMouvement,
}: {
  seances: S[];
  userId: string | null;
  niveau: Niveau | null;
  canAccessPremium: boolean;
  /** Une collection par famille, celle du jour (« Tout le catalogue »). */
  collections: CollectionDuJour[];
  nbCollections: number;
  /** Ouvert depuis le champ de recherche d'Entraînement : la loupe d'abord. */
  loupeAuDepart?: boolean;
  onStart: (s: S) => void;
  onPremium: (s: S) => void;
  onManage: (s: S) => void;
  onCollection: (id: string) => void;
  onToutesCollections: () => void;
  /** Envoie la demande au Guide (la conversation s'ouvre dessus). */
  onDemander: (demande: string) => void;
  onMouvement: (exo: LibExercise) => void;
}) {
  const [filtres, setFiltres] = useState<Filtres>(SANS_FILTRE);
  const [feuille, setFeuille] = useState<IdGroupe | "tout" | null>(null);
  const [saisie, setSaisie] = useState("");
  const [loupeOuverte, setLoupeOuverte] = useState(loupeAuDepart);
  const [recentes, setRecentes] = useState<string[]>(() => lireRecentes(userId));
  const [jour] = useState(() => todayYmd());
  const [lieu] = useState(() => (userId ? readLieu(userId) : { location: null, equip: null }));
  const champ = useRef<HTMLInputElement>(null);
  const donnees = useDonneesTrouver(userId);

  const ctx: Contexte = useMemo(() => ({ lieu, dureeCible: donnees.dureeCible, niveau, premium: canAccessPremium, jour }),
    [lieu, donnees.dureeCible, niveau, canAccessPremium, jour]);

  const nbFiltres = nombreDeFiltres(filtres);
  const texte = saisie.trim();
  /* La loupe est ouverte tant qu’on y est, ou qu’il y reste un mot. */
  const enRecherche = loupeOuverte || texte.length > 0;
  const recherche = useMemo(() => (texte.length >= 2 ? chercher(seances, texte) : null), [seances, texte]);
  const mouvements = useMemo(() => (texte.length >= 2 ? mouvementsPour(texte) : []), [texte]);
  const resultats = useMemo(() => (nbFiltres > 0 ? filtrer(seances, filtres) : null), [seances, filtres, nbFiltres]);

  const toi = useMemo(() => (donnees.pret ? pourToi(seances, ctx) : null), [seances, ctx, donnees.pret]);
  const equilibre = useMemo(() => pourEquilibrer(seances, donnees.faites, ctx), [seances, donnees.faites, ctx]);
  const palier = useMemo(() => prochainPalier(seances, donnees.records, ctx), [seances, donnees.records, ctx]);
  const rapides = useMemo(() => courtes(seances, ctx), [seances, ctx]);
  const neuves = useMemo(() => nouvelles(seances, ctx), [seances, ctx]);

  const memoriser = (t = texte) => {
    if (!userId || t.length < 2) return;
    const n = [t, ...recentes.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 4);
    setRecentes(n);
    try { localStorage.setItem(CLE_RECENTES(userId), JSON.stringify(n)); } catch { /* stockage bloqué */ }
  };
  const verrou = (s: S) => s.access === "premium" && !canAccessPremium;
  const ouvrir = (s: S) => {
    if (enRecherche) memoriser();
    if (verrou(s)) onPremium(s); else onStart(s);
  };
  const quitterRecherche = () => { setSaisie(""); setLoupeOuverte(false); champ.current?.blur(); };

  /** Une photo par carte, sans doublon dans une rangée. */
  const photos = (liste: S[]) => photosDeRangee(liste);

  return (
    <>
      {/* ── La loupe ── */}
      <div className="flex items-center gap-1">
        {enRecherche && (
          <button type="button" onClick={quitterRecherche} aria-label="Retour au catalogue"
            className="w-10 h-10 -ml-2 flex items-center justify-center flex-shrink-0 cursor-pointer bg-transparent border-none">
            <ChevronLeft size={22} strokeWidth={2.2} style={{ color: "var(--text-0)" }} />
          </button>
        )}
        <form role="search" onSubmit={(e) => { e.preventDefault(); memoriser(); champ.current?.blur(); }}
          className="flex-1 min-w-0 h-12 rounded-full flex items-center gap-2.5 pl-4 pr-3"
          style={{
            background: "rgb(var(--surface-rgb))",
            border: enRecherche ? "1.5px solid var(--accent)" : "1px solid rgba(var(--accent-rgb),0.16)",
            boxShadow: enRecherche ? "0 0 0 4px rgba(var(--accent-rgb),0.12)" : "var(--ombre-pose)",
          }}>
          <Search size={18} strokeWidth={2.2} aria-hidden className="flex-shrink-0" style={{ color: "var(--text-3)" }} />
          <input
            ref={champ}
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            onFocus={() => setLoupeOuverte(true)}
            onBlur={() => { if (!saisie.trim()) setLoupeOuverte(false); }}
            autoFocus={loupeAuDepart}
            placeholder="Dos, 20 min, sans saut…"
            aria-label="Trouver ma séance"
            inputMode="search"
            enterKeyHint="search"
            className="flex-1 min-w-0 bg-transparent outline-none text-[16px] placeholder:text-[var(--text-3)]"
            style={{ color: "var(--text-0)" }}
          />
          {saisie && (
            <button type="button" onClick={() => { setSaisie(""); champ.current?.focus(); }} aria-label="Effacer la recherche"
              className="w-7 h-7 flex items-center justify-center flex-shrink-0 rounded-full cursor-pointer border-none"
              style={{ background: "rgba(var(--accent-rgb),0.14)" }}>
              <X size={14} strokeWidth={2.4} style={{ color: "var(--text-2)" }} />
            </button>
          )}
        </form>
      </div>

      {/* ── La ligne de filtres ── */}
      {!enRecherche && (
        <div className="flex gap-2 overflow-x-auto -mx-5 px-5 mt-3 pb-1" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          <Puce onClick={() => setFeuille("tout")} icone={<SlidersHorizontal size={16} strokeWidth={2.2} />}
            badge={nbFiltres > 0 ? nbFiltres : undefined} label={nbFiltres > 0 ? `Filtres, ${nbFiltres} choisis` : "Tous les filtres"}>
            Filtres
          </Puce>
          {pucesChoisies(filtres).map((p) => (
            <Puce key={`${p.groupe}:${p.id}`} actif label={`Retirer : ${p.label}`}
              onClick={() => setFiltres(p.groupe === "sansSaut" ? { ...filtres, sansSaut: false } : basculer(filtres, p.groupe, p.id))}>
              {p.label}
              <X size={12} strokeWidth={2.8} aria-hidden />
            </Puce>
          ))}
          {PUCES_LIGNE.filter((g) => choisis(filtres, g).length === 0).map((g) => (
            <Puce key={g} onClick={() => setFeuille(g)} label={GROUPES.find((x) => x.id === g)!.titre}>
              {GROUPES.find((x) => x.id === g)!.court}
              <ChevronDown size={12} strokeWidth={2.8} aria-hidden style={{ color: "var(--text-3)" }} />
            </Puce>
          ))}
          {!filtres.sansSaut && (
            <Puce onClick={() => setFiltres({ ...filtres, sansSaut: true })} label="Sans saut">Sans saut</Puce>
          )}
        </div>
      )}

      {enRecherche ? (
        /* ── La loupe : ce qu'elle a compris, les mouvements, les séances ── */
        texte.length < 2 ? (
          recentes.length > 0 && (
            <section className="mt-6">
              <p className="text-[13px] font-semibold" style={{ color: "var(--text-2)" }}>Tes dernières recherches</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {recentes.map((r) => (
                  <button key={r} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setSaisie(r)}
                    className="h-9 px-3 rounded-full inline-flex items-center gap-1.5 text-[13px] font-medium cursor-pointer whitespace-nowrap"
                    style={{ background: "rgb(var(--surface-rgb))", border: "1px solid rgba(var(--accent-rgb),0.14)", color: "var(--text-0)" }}>
                    <History size={14} strokeWidth={2.2} aria-hidden style={{ color: "var(--text-3)" }} />
                    {r}
                  </button>
                ))}
              </div>
            </section>
          )
        ) : recherche && (
          <div className="mt-3.5" aria-live="polite">
            {recherche.inconnus.length > 0 && (
              <p className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>
                Rien pour {recherche.inconnus.map((m) => `«${NB}${m}${NB}»`).join(", ")}.
              </p>
            )}
            {(recherche.strict ? recherche.ligne : recherche.message) && (
              <p className="text-[13px] font-medium mt-0.5" style={{ color: "var(--text-2)" }}>
                {recherche.strict ? recherche.ligne : recherche.message}
              </p>
            )}
            {mouvements.length > 0 && (
              <section className="mt-4">
                <p className="text-[13px] font-semibold" style={{ color: "var(--text-2)" }}>Mouvements</p>
                <div className="flex gap-2.5 overflow-x-auto -mx-5 px-5 mt-2 pb-1" style={{ scrollbarWidth: "none" }}>
                  {mouvements.map((m) => (
                    <button key={m.name} type="button" onClick={() => { memoriser(); onMouvement(m); }}
                      className="flex-shrink-0 w-[88px] flex flex-col items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                      aria-label={`Voir le mouvement : ${m.name}`}>
                      <span className="w-[88px] h-[88px] rounded-[var(--r-bloc)] flex items-center justify-center overflow-hidden"
                        style={{ background: "rgba(var(--accent-rgb),0.08)" }}>
                        <ExerciseThumb name={m.name} size={80} />
                      </span>
                      <span className="text-[11px] font-semibold text-center leading-tight" style={{ color: "var(--text-0)" }}>{m.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {recherche.seances.length > 0 && (
              <Cadre classe="mt-3">
                {(() => {
                  const img = photos(recherche.seances);
                  return recherche.seances.map((s, i) => (
                    <LigneSeance key={s.id} seance={s} img={img.get(s.id)!} verrou={verrou(s)} onOuvrir={ouvrir} grande premiere={i === 0}
                      detail={exercicesDe(s).slice(0, 3).map((e) => e.name).join(" · ")} />
                  ));
                })()}
              </Cadre>
            )}
            {!recherche.strict && recherche.demande && <DemanderGuide demande={recherche.demande} onDemander={onDemander} />}
          </div>
        )
      ) : resultats ? (
        /* ── Les filtres choisis : les séances qui les tiennent ── */
        <section className="mt-6" aria-live="polite">
          <h3 className="vy-sous" style={{ color: "var(--text-0)" }}>
            {resultats.strict
              ? <><span className="vy-nombre" style={{ fontWeight: 700 }}>{resultats.seances.length}</span> {pluriel(resultats.seances.length).replace(/^\d+ /, "")}</>
              : "Les plus proches"}
          </h3>
          {(resultats.strict ? sousTitre(filtres) : resultats.message) && (
            <p className="text-[13px] font-medium mt-1" style={{ color: "var(--text-2)" }}>
              {resultats.strict ? sousTitre(filtres) : resultats.message}
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-4 mt-3.5">
            {(() => {
              const img = photos(resultats.seances);
              return resultats.seances.map((s) => (
                <CarteGrille key={s.id} seance={s} img={img.get(s.id)!} verrou={verrou(s)} onOuvrir={ouvrir} onGerer={s.perso ? undefined : onManage} />
              ));
            })()}
          </div>
          {!resultats.strict && resultats.demande && <DemanderGuide demande={resultats.demande} onDemander={onDemander} />}
        </section>
      ) : (
        /* ── Les séances proposées ── */
        <>
          <Rangee titre="Pour toi" phrase={toi?.phrase}>
            {!donnees.pret ? (
              <div className="animate-pulse mt-3" style={{ width: "min(300px, 78vw)", aspectRatio: "15 / 19", borderRadius: "var(--r-affiche)", background: "rgba(var(--tint-violet-rgb),0.5)" }} />
            ) : toi && (
              <div className="flex gap-3 overflow-x-auto -mx-5 px-5 mt-3 pb-2" style={{ scrollSnapType: "x mandatory", scrollPaddingInline: 20, scrollbarWidth: "none" }}>
                {(() => {
                  const img = photos(toi.seances);
                  return toi.seances.map((s) => (
                    <GrandeCarte key={s.id} seance={s} img={img.get(s.id)!} verrou={verrou(s)} onOuvrir={ouvrir} onGerer={onManage} />
                  ));
                })()}
              </div>
            )}
          </Rangee>

          {equilibre && (
            <Rangee titre="Pour équilibrer ta semaine" phrase={equilibre.phrase}>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {(() => {
                  const img = photos(equilibre.seances);
                  return equilibre.seances.map((s) => (
                    <CarteGrille key={s.id} seance={s} img={img.get(s.id)!} verrou={verrou(s)} onOuvrir={ouvrir} onGerer={onManage} />
                  ));
                })()}
              </div>
            </Rangee>
          )}

          {palier && (
            <Rangee titre="Ton prochain palier">
              <div className="mt-3 px-4 pt-4 pb-1 overflow-hidden" style={{
                borderRadius: "var(--r-bloc)", background: "rgba(43,212,160,0.11)", border: "1px solid rgba(43,212,160,0.32)",
              }}>
                <p className="text-[13px] font-semibold" style={{ color: "var(--teal-encre)" }}>Ton record · {palier.record.nom}</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="vy-nombre text-[34px] leading-[44px]" style={{ color: "var(--teal-encre)", fontWeight: 700 }}>
                    {valeurRecord(palier.record.mesure, palier.record.meilleur)}
                  </span>
                  <span className="text-[16px] font-medium" style={{ color: "var(--text-0)" }}>
                    {palier.record.mesure === "reps" ? "d’affilée" : uniteRecord(palier.record.mesure, palier.record.meilleur)}
                  </span>
                </div>
                <div className="-mx-4 mt-2" style={{ borderTop: "1px solid rgba(11,138,104,0.2)" }}>
                  {(() => {
                    const img = photos(palier.seances.map((x) => x.seance));
                    return palier.seances.map(({ seance, exercice }, i) => (
                      <LigneSeance key={seance.id} seance={seance} img={img.get(seance.id)!} verrou={verrou(seance)} onOuvrir={ouvrir} premiere={i === 0}
                        detail={`${exercice.name} · ${doseDe(exercice as ExoTour)}`} />
                    ));
                  })()}
                </div>
              </div>
            </Rangee>
          )}

          {rapides.length > 0 && (
            <Rangee titre="Moins de 15 minutes" lien={{ texte: "Tout voir", onClick: () => onCollection("express") }}>
              <Cadre classe="mt-3">
                {(() => {
                  const img = photos(rapides);
                  return rapides.map((s, i) => (
                    <LigneSeance key={s.id} seance={s} img={img.get(s.id)!} verrou={verrou(s)} onOuvrir={ouvrir} premiere={i === 0} />
                  ));
                })()}
              </Cadre>
            </Rangee>
          )}

          {neuves.length > 0 && (
            <Rangee titre="Nouvelles séances">
              <div className="flex gap-3 overflow-x-auto -mx-5 px-5 mt-3 pb-1" style={{ scrollSnapType: "x proximity", scrollPaddingInline: 20, scrollbarWidth: "none" }}>
                {(() => {
                  const img = photos(neuves);
                  return neuves.map((s) => (
                    <CarteRail key={s.id} seance={s} img={img.get(s.id)!} verrou={verrou(s)} onOuvrir={ouvrir} />
                  ));
                })()}
              </div>
            </Rangee>
          )}

          <Rangee titre="Tout le catalogue" lien={{ texte: `Les ${nbCollections} collections`, onClick: onToutesCollections }}>
            <div className="grid grid-cols-3 gap-2.5 mt-3">
              {collections.map((c) => (
                <motion.button key={c.id} whileTap={{ scale: 0.97 }} onClick={() => onCollection(c.id)}
                  className="relative overflow-hidden block p-0 border-none cursor-pointer"
                  style={{ aspectRatio: "5 / 6", borderRadius: "var(--r-bloc)", boxShadow: "var(--ombre-pose)" }}
                  aria-label={`Collection : ${c.name}`}>
                  <Photo img={c.img} pos={c.pos} style={{ position: "absolute", inset: 0 }} />
                  <span className="absolute inset-x-0 bottom-0 px-2.5 pb-2.5 pt-10 text-left" style={{ background: "var(--voile-affiche)" }}>
                    <span className="block text-[13px] font-semibold leading-tight text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>{c.name}</span>
                  </span>
                </motion.button>
              ))}
            </div>
          </Rangee>
        </>
      )}

      <AnimatePresence>
        {feuille && (
          <FeuilleFiltres
            groupe={feuille}
            filtres={filtres}
            seances={seances}
            onFermer={() => setFeuille(null)}
            onAppliquer={(f) => { setFiltres(f); setFeuille(null); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/** Une puce de la ligne : un filtre à ouvrir, ou un filtre choisi qui se retire. */
function Puce({ children, onClick, actif = false, icone, badge, label }: {
  children: ReactNode; onClick: () => void; actif?: boolean; icone?: ReactNode; badge?: number; label: string;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      className="h-10 px-3 rounded-full flex-shrink-0 inline-flex items-center gap-1.5 text-[13px] font-semibold cursor-pointer whitespace-nowrap"
      style={actif
        ? { border: "1.5px solid var(--accent)", background: "rgba(var(--accent-rgb),0.12)", color: "var(--exp-encre)" }
        : { border: "1px solid rgba(var(--accent-rgb),0.16)", background: "rgb(var(--surface-rgb))", color: "var(--text-0)" }}>
      {icone}
      {children}
      {badge != null && (
        <span className="vy-nombre min-w-[18px] h-[18px] px-[5px] rounded-full inline-flex items-center justify-center text-[11px] text-white"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", fontWeight: 700 }}>
          {badge}
        </span>
      )}
    </button>
  );
}

/** Une rangée proposée : son titre, sa phrase, et un lien s'il y en a un. */
function Rangee({ titre, phrase, lien, children }: {
  titre: string; phrase?: string; lien?: { texte: string; onClick: () => void }; children: ReactNode;
}) {
  return (
    <section className="mt-8 first:mt-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="vy-sous" style={{ color: "var(--text-0)" }}>{titre}</h3>
        {lien && (
          <button type="button" onClick={lien.onClick}
            className="text-[13px] font-semibold flex-shrink-0 cursor-pointer bg-transparent border-none p-0"
            style={{ color: "var(--exp-encre)" }}>
            {lien.texte}
          </button>
        )}
      </div>
      {phrase && <p className="text-[13px] font-medium mt-1" style={{ color: "var(--text-2)" }}>{phrase}</p>}
      {children}
    </section>
  );
}

/** Un cadre de liste : une surface, des filets entre les lignes. */
function Cadre({ classe = "", children }: { classe?: string; children: ReactNode }) {
  return (
    <div className={`overflow-hidden ${classe}`} style={{
      borderRadius: "var(--r-bloc)", background: "rgb(var(--surface-rgb))",
      border: "1px solid rgba(var(--accent-rgb),0.1)", boxShadow: "var(--ombre-pose)",
    }}>
      {children}
    </div>
  );
}

/** Quand rien ne réunit tout : le Guide peut composer la séance qui manque.
 *  La demande part dans la conversation, comme celle des recettes. */
function DemanderGuide({ demande, onDemander }: { demande: string; onDemander: (d: string) => void }) {
  const { guide } = useGuideActif();
  return (
    <button type="button" onClick={() => onDemander(`Compose-moi ${demande.charAt(0).toLowerCase()}${demande.slice(1)}`)}
      className="mt-4 w-full flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer"
      style={{ borderRadius: "var(--r-bloc)", background: "rgba(var(--accent-rgb),0.07)", border: "1px solid rgba(var(--accent-rgb),0.16)" }}>
      <span className="flex-shrink-0"><VisageGuide guide={guide} etat="listen" size={48} /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-[16px] font-semibold" style={{ color: "var(--text-0)" }}>
          {guide ? `Demander à ${PRENOM_GUIDE[guide]}` : "Demander à ton Guide"}
        </span>
        <span className="block text-[13px] font-medium mt-0.5" style={{ color: "var(--text-2)" }}>{demande}</span>
      </span>
      <ChevronRight size={18} strokeWidth={2.2} className="flex-shrink-0" style={{ color: "var(--exp-encre)" }} />
    </button>
  );
}

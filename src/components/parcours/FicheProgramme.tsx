"use client";

/* ════════════════════════════════════════════════════════════════════
   LA FICHE D'UN PROGRAMME (maquette « Les programmes », version 2,
   écrans « La fiche d'un programme » et « Ton programme actuel se met en
   pause »).

   De haut en bas : la photo et le titre, le Guide qui annonce le but,
   « Comment ça marche » en trois étapes, les semaines, les jours à
   choisir, puis le bouton qui dit le jour du départ. Si un cycle (Push,
   Pull…) est en cours, une feuille dit qu'il se met en pause et où il
   reprendra, avant de commencer.

   ⚠️ UN SEUL PROGRAMME À LA FOIS (la base l'impose). Pendant un
   programme, la fiche d'un autre le dit et renvoie vers le programme en
   cours, au lieu d'un bouton qui refuserait.
   ════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Photo } from "@/components/entrainement/PhotoSeance";
import { PucePlus } from "@/components/catalogue/CartesSeance";
import { useGuideActif } from "@/context/GuideContext";
import { voix } from "@/lib/guides";
import { VENTE_OUVERTE } from "@/lib/plans";
import { resolveArt } from "@/lib/workoutArt";
import { commencerParcours, type LectureParcours } from "@/lib/parcoursBase";
import {
  SEANCES, calendrierDuDepart, capitale, dansLaPhrase, dateEnLettres, jourChoisi, nbCreneaux, planSemaines, programmeOuvert,
  semainesDites, typoParcours, type DefParcours,
} from "@/lib/parcours";
import ChoixJours from "./ChoixJours";
import { BulleGuide, Bouton, E, Ecran, FILET, Feuille, GROUPE, Lien, MONO, SOUS, TITRE } from "./commun";

const NB = String.fromCharCode(160);
const LETTRES_NOMBRE = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept"];

/** Le jour d'aujourd'hui, à Paris. */
function aujourdhuiParis(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** « Push, Pull et Bas du corps ». */
export function nomsDuCycle(noms: string[]): string {
  if (noms.length <= 1) return noms[0] ?? "";
  return `${noms.slice(0, -1).join(", ")} et ${noms[noms.length - 1]}`;
}

export type CycleEnPause = { noms: string; etape: string | null } | null;

export default function FicheProgramme({ def, ouvert, onFermer, lecture, cycle, premium, onPremium, onVoirEnCours }: {
  def: DefParcours;
  ouvert: boolean;
  onFermer: () => void;
  lecture: LectureParcours | null;
  /** Le cycle en cours (ses étapes et la prochaine), s'il y en a un. */
  cycle: CycleEnPause;
  premium: boolean;
  /** Vente ouverte, compte gratuit, programme Vaiiya+ : l'offre. */
  onPremium: () => void;
  /** Le programme en cours : ouvrir sa semaine. */
  onVoirEnCours?: () => void;
}) {
  const router = useRouter();
  const { guide } = useGuideActif();
  const [jours, setJours] = useState<number[]>(() => (def.parSemaine === 3 ? [1, 3, 5] : def.parSemaine === 2 ? [2, 5] : [1, 2, 4, 5]));
  const [pause, setPause] = useState(false);
  const [envoi, setEnvoi] = useState<"repos" | "en_cours">("repos");
  const [erreur, setErreur] = useState<string | null>(null);
  const [jour] = useState(aujourdhuiParis);

  const plan = useMemo(() => planSemaines(def), [def]);
  const complet = jours.length === def.parSemaine;
  const depart = complet ? jourChoisi(jours, jour) : null;
  const fin = useMemo(() => (complet ? calendrierDuDepart(def, jours, jour).fin : null), [complet, def, jours, jour]);
  const enCours = lecture?.enCours ?? null;
  const ouvertA = programmeOuvert(def, premium, VENTE_OUVERTE);
  const photo = resolveArt({ title: SEANCES[def.photo]?.titre ?? def.titre, category: SEANCES[def.photo]?.categorie }).img;

  const commencer = async () => {
    setEnvoi("en_cours");
    setErreur(null);
    const r = await commencerParcours(def, jours, jour);
    setEnvoi("repos");
    if (!r.ok) {
      setPause(false);
      setErreur(r.code === "deja_en_cours"
        ? "Un programme est déjà en cours."
        : "Je n’arrive pas à commencer le programme pour l’instant. Réessaie dans un moment.");
      return;
    }
    setPause(false);
    onFermer();
    /* Le héros de l'accueil montre le programme dès maintenant. */
    router.push("/");
  };

  const libelleDepart = depart ? (depart === jour ? "Commencer aujourd’hui" : `Commencer ${dateEnLettres(depart)}`) : "Choisis tes jours";

  return (
    <>
      <Ecran ouvert={ouvert} onFermer={onFermer} retour etiquette={`Le programme ${def.titre}`} fond="#FAF8FF">
        <div className="relative" style={{ height: 312, background: "#1A1424" }}>
          <Photo img={photo} pos="50% 16%" style={{ position: "absolute", inset: 0 }} />
          <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(14,10,24,0.38) 0%, rgba(14,10,24,0) 24%, rgba(14,10,24,0) 40%, rgba(14,10,24,0.6) 70%, rgba(14,10,24,0.9) 100%)" }} />
          <div className="absolute" style={{ left: 20, right: 20, bottom: 20 }}>
            {def.acces === "plus" && !premium && (
              <div className="mb-2.5"><PucePlus texte={VENTE_OUVERTE ? "Vaiiya+" : "Bientôt Vaiiya+"} /></div>
            )}
            <p className="m-0 text-[13px] font-bold" style={{ color: "rgba(255,255,255,0.84)" }}>
              Un programme · <span style={MONO}>{def.semaines}</span>{NB}semaines · <span style={MONO}>{nbCreneaux(def)}</span>{NB}séances
            </p>
            <h1 className="m-0 mt-1.5 text-[34px] leading-none text-white" style={TITRE}>{typoParcours(def.titre)}</h1>
            <p className="m-0 mt-2 text-[16px] leading-[22px]" style={{ color: "rgba(255,255,255,0.92)" }}>{typoParcours(def.accroche)}</p>
          </div>
        </div>

        <div className="px-5 pt-[18px]">
          {guide && (
            <BulleGuide guide={guide} texte={voix(guide, "parcours.fiche", { duree: capitale(semainesDites(def.semaines)), titre: def.but })} />
          )}

          <h2 className="mt-6 mb-0 text-[20px] leading-[26px]" style={SOUS}>Comment ça marche</h2>
          <div className="mt-2.5" style={GROUPE}>
            {[
              { titre: "Un test au départ", texte: def.test.depart },
              { titre: `${capitale(LETTRES_NOMBRE[def.parSemaine] ?? String(def.parSemaine))} séances par semaine`, texte: "Les jours que tu choisis. Une séance manquée glisse au prochain jour libre." },
              { titre: "Le même test à la fin", texte: "Pour voir le chemin parcouru, sans te comparer à personne." },
            ].map((e, i) => (
              <div key={e.titre} className="flex gap-3" style={{ padding: "14px 16px", borderTop: i ? FILET : undefined }}>
                <span className="flex-shrink-0 flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: "#EFE9FF", color: E.lav, ...MONO, fontWeight: 800, fontSize: 15 }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="m-0 text-[16px] leading-5 font-extrabold">{e.titre}</p>
                  <p className="m-0 mt-[3px] text-[13px] leading-[18px]" style={{ color: E.t2 }}>{typoParcours(e.texte)}</p>
                </div>
              </div>
            ))}
          </div>

          <h2 className="mt-6 mb-0 text-[20px] leading-[26px]" style={SOUS}>{capitale(`les ${semainesDites(def.semaines)}`)}</h2>
          <div className="mt-2.5" style={GROUPE}>
            {plan.map((l, i) => (
              <div key={l.quand} className="flex gap-3.5" style={{ padding: "13px 16px", borderTop: i ? FILET : undefined }}>
                <p className="m-0 flex-shrink-0 text-[13px] font-bold" style={{ width: 92, color: E.lav }}>{l.quand}</p>
                <p className="m-0 text-[16px] leading-[21px]">{typoParcours(l.quoi)}</p>
              </div>
            ))}
          </div>

          {enCours ? (
            <div className="mt-6" style={{ ...GROUPE, padding: "16px" }}>
              <p className="m-0 text-[16px] leading-[22px]">
                {enCours.def.id === def.id
                  ? "Tu suis ce programme en ce moment."
                  : typoParcours(`Tu suis déjà « ${enCours.def.titre} ». Un seul programme à la fois : arrête-le pour commencer celui-ci.`)}
              </p>
              {onVoirEnCours && <Lien onClick={onVoirEnCours} couleur={E.lav} gras>Voir mon programme en cours</Lien>}
            </div>
          ) : (
            <>
              <h2 className="mt-6 mb-0 text-[20px] leading-[26px]" style={SOUS}>Tes jours</h2>
              <div className="mt-2.5"><ChoixJours jours={jours} nombre={def.parSemaine} onChange={setJours} /></div>
              <p className="m-0 mt-2 text-[13px] leading-[18px]" style={{ color: E.t3 }}>
                {typoParcours(`${capitale(LETTRES_NOMBRE[def.parSemaine] ?? String(def.parSemaine))} jours par semaine. ${def.lieu}`)}
              </p>
              <div className="mt-[22px]">
                {ouvertA ? (
                  <Bouton desactive={!complet} enCours={envoi === "en_cours"} onClick={() => (cycle ? setPause(true) : void commencer())}>
                    {libelleDepart}
                  </Bouton>
                ) : (
                  <Bouton onClick={onPremium}>Avec Vaiiya+</Bouton>
                )}
              </div>
              {erreur && <p role="alert" className="m-0 mt-2 text-[13px]" style={{ color: E.t2 }}>{erreur}</p>}
            </>
          )}
        </div>
      </Ecran>

      <Feuille ouverte={pause} onFermer={() => setPause(false)} etiquette="Ton programme actuel se met en pause">
        <h2 className="m-0 mt-5 text-[26px] leading-[31px]" style={TITRE}>Ton programme actuel se met en pause</h2>
        <p className="m-0 mt-2.5 text-[16px] leading-[23px]" style={{ color: E.t2 }}>
          {typoParcours(cycle
            ? `${cycle.noms} ${cycle.noms.includes(" et ") ? "attendent" : "attend"} la fin de ${dansLaPhrase(def.titre)}${fin ? `, le ${dateEnLettres(fin)}` : ""}. ${cycle.etape ? `Tu reprendras à ${cycle.etape}, là où tu en es aujourd’hui.` : "Tu reprendras là où tu en es aujourd’hui."}`
            : "")}
        </p>
        <div className="mt-[18px] rounded-[18px]" style={{ padding: "14px 16px", background: "#F4F0FF" }}>
          <p className="m-0 text-[13px] font-bold" style={{ color: E.lav }}>Ce qui ne change pas</p>
          <p className="m-0 mt-1.5 text-[16px] leading-[22px]">Ta série, ton rang et tes records continuent. Tu peux arrêter le programme quand tu veux.</p>
        </div>
        <div className="mt-[22px]">
          <Bouton enCours={envoi === "en_cours"} onClick={() => void commencer()}>{typoParcours(`Commencer ${dansLaPhrase(def.titre)}`)}</Bouton>
        </div>
        <div className="flex justify-center mt-1">
          <Lien onClick={() => setPause(false)}>Garder mon programme actuel</Lien>
        </div>
      </Feuille>
    </>
  );
}

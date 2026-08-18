"use client";

/* ════════════════════════════════════════════════════════════════════
   Le parcours d'entrée de Vaiiya.

   0. Choisis ton Guide      (obligatoire, aucune sortie)
   1. Ton corps              (le Guide ouvre ici)
   2. Tes objectifs
   3. Ton niveau et ton rythme
   4. Ton entraînement
   5. Ta nutrition
   6. C'est prêt

   Deux doctrines cohabitent, et elles ne se contredisent pas :
   le CHOIX DU GUIDE est obligatoire, le QUESTIONNAIRE ne l'est pas. On
   ne rend pas artificiellement obligatoire ce qui ne l'est pas
   aujourd'hui : à partir de l'étape 1, « Plus tard » enregistre ce qui
   est déjà rempli et emmène à la fin.

   ⚠️ Chaque étape franchie ÉCRIT. C'est volontaire et ça coûte un
   upsert : un rafraîchissement au milieu du parcours ne doit pas
   effacer ce qui vient d'être répondu, et `onboarding_completed` ne
   passe à vrai que quand tout est là (la règle vit dans
   `lib/profilOnboarding`, une seule fois pour les deux écrans).
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useGuideActif } from "@/context/GuideContext";
import { useGuidedTour } from "@/context/GuidedTourContext";
import { createClient } from "@/lib/supabase";
import { lockBodyModal } from "@/lib/bodyModal";
import { destinationDepuisUrl } from "@/lib/destinationInterne";
import { enregistrerProfil } from "@/lib/profilOnboarding";
import { loadLieu, persistLieu } from "@/lib/planning";
import { voix } from "@/lib/guides";
import type { GuideId } from "@/lib/guides";
import type { OnboardingData } from "@/components/OnboardingModal";
import ChoixGuide from "./ChoixGuide";
import EtapesProfil, { ORDRE, SECTIONS, type Entrainement, type Section } from "./EtapesProfil";
import PortraitGuide from "./PortraitGuide";
import s from "./bienvenue.module.css";

const VIDE: OnboardingData = {
  age: "", height: "", weight: "", gender: "",
  goals: [], level: "", sessionsPerWeek: "", mealsPerDay: "", diet: "",
};

const NOM: Record<GuideId, string> = { nora: "Nora", sasha: "Sasha" };

type Etape = "guide" | Section | "pret";

export default function ParcoursBienvenue() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { etat, guide, choisirGuide } = useGuideActif();
  const { start: demarrerVisite } = useGuidedTour();

  /* `null` = la personne n'a encore rien décidé sur cet écran. L'étape
     réellement affichée est dérivée plus bas : elle ne se recopie donc
     jamais dans un effet, et la règle « où commence-t-on » n'existe
     qu'à un seul endroit. */
  const [etapeChoisie, setEtape] = useState<Etape | null>(null);
  const [data, setDataBrut] = useState<OnboardingData>(VIDE);
  const [entrainement, setEntrainementBrut] = useState<Entrainement>({ location: null, equip: null });
  /** `null` = pas encore lu. Décide de la bifurcation compte neuf / compte connu. */
  const [dejaConfigure, setDejaConfigure] = useState<boolean | null>(null);
  const [enCours, setEnCours] = useState<GuideId | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  /* La destination voulue, lue une seule fois : le parcours peut avoir
     interrompu une intention (une notification touchée, par exemple). */
  const [destination] = useState(() => destinationDepuisUrl("/"));

  // Le parcours occupe tout l'écran : la barre du bas se retire, comme
  // pour le tunnel de séance.
  useEffect(() => lockBodyModal(), []);

  /* Sans compte, il n'y a rien à écrire. On renvoie vers la connexion en
     gardant la destination, pour revenir ici juste après. */
  useEffect(() => {
    if (isLoading || user) return;
    const retour = `/bienvenue${destination !== "/" ? `?next=${encodeURIComponent(destination)}` : ""}`;
    router.replace(`/auth?next=${encodeURIComponent(retour)}`);
  }, [isLoading, user, destination, router]);

  /* Ce que le compte a déjà répondu. On repart de ses réponses plutôt que
     d'un formulaire vide : un compte existant ne doit jamais avoir
     l'impression que son profil a été perdu. */
  useEffect(() => {
    if (!user?.id) return;
    let annule = false;
    (async () => {
      const supabase = createClient();
      const { data: p } = await supabase
        .from("profiles")
        .select("onboarding_age, onboarding_height, onboarding_weight, onboarding_gender, onboarding_goals, onboarding_level, onboarding_sessions_week, onboarding_meals_day, onboarding_diet, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      if (annule) return;
      const t = (v: unknown) => (v === null || v === undefined ? "" : String(v));
      if (p) {
        const r = p as Record<string, unknown>;
        setDataBrut({
          age: t(r.onboarding_age),
          height: t(r.onboarding_height),
          weight: t(r.onboarding_weight),
          gender: t(r.onboarding_gender),
          goals: Array.isArray(r.onboarding_goals) ? (r.onboarding_goals as string[]) : [],
          level: t(r.onboarding_level),
          sessionsPerWeek: t(r.onboarding_sessions_week),
          mealsPerDay: t(r.onboarding_meals_day),
          diet: t(r.onboarding_diet),
        });
        setDejaConfigure(!!r.onboarding_completed);
      } else {
        setDejaConfigure(false);
      }
      const lieu = await loadLieu(user.id);
      if (!annule) setEntrainementBrut(lieu);
    })();
    return () => { annule = true; };
  }, [user?.id]);

  /* Un Guide déjà connu à l'arrivée : on ne repose pas la question, et on
     reprend là où ça a du sens. Un compte déjà configuré n'a que la
     conclusion à voir ; un compte neuf entre dans le questionnaire. */
  const debut: Etape = etat === "actif" && dejaConfigure !== null
    ? (dejaConfigure ? "pret" : ORDRE[0])
    : "guide";
  const etape: Etape = etapeChoisie ?? debut;

  const setData = useCallback((patch: Partial<OnboardingData>) => setDataBrut((d) => ({ ...d, ...patch })), []);
  const setEntrainement = useCallback((patch: Partial<Entrainement>) => setEntrainementBrut((e) => ({ ...e, ...patch })), []);

  /* ── Écriture ─────────────────────────────────────────────────── */

  const enregistrer = async () => {
    if (!user?.id) return;
    await enregistrerProfil(user.id, data);
    // Le lieu vit dans ses propres colonnes, avec sa propre fonction : on
    // ne pousse QUE ce qui est renseigné, pour ne pas effacer un réglage
    // déjà fait ailleurs.
    if (entrainement.location || entrainement.equip) {
      await persistLieu(user.id, {
        ...(entrainement.location ? { location: entrainement.location } : {}),
        ...(entrainement.equip ? { equip: entrainement.equip } : {}),
      });
    }
  };

  const choisir = async (g: GuideId) => {
    setErreur(null);
    setEnCours(g);
    const ok = await choisirGuide(g);
    setEnCours(null);
    if (!ok) {
      // Aucun faux succès : on ne fait pas semblant d'avoir enregistré.
      setErreur("Impossible d'enregistrer ton choix pour le moment. Vérifie ta connexion et réessaie.");
      return;
    }
    setEtape(dejaConfigure ? "pret" : ORDRE[0]);
  };

  /* ── Navigation entre sections ────────────────────────────────── */

  const index = ORDRE.indexOf(etape as Section);

  const suivant = async () => {
    await enregistrer();
    setEtape(index >= ORDRE.length - 1 ? "pret" : ORDRE[index + 1]);
  };

  const precedent = () => {
    // On ne revient JAMAIS sur le choix du Guide : il est déjà écrit, et
    // le rejouer ferait croire qu'il n'a pas été pris en compte. Il se
    // change dans les paramètres, comme l'écran 0 l'annonce.
    if (index > 0) setEtape(ORDRE[index - 1]);
  };

  const plusTard = async () => {
    await enregistrer();
    setEtape("pret");
  };

  const entrer = () => router.replace(destination);

  const decouvrir = () => {
    router.replace(destination);
    /* La visite se joue PAR-DESSUS l'écran courant, sans redirection : on
       arrive donc d'abord à destination, puis on la lance. Sans ce court
       délai, le premier chapitre s'ouvrirait sur /bienvenue, c'est-à-dire
       sur l'écran qu'on vient de quitter. */
    setTimeout(() => demarrerVisite(), 450);
  };

  /* ── Rendu ────────────────────────────────────────────────────── */

  if (isLoading || !user || etat === "chargement" || dejaConfigure === null) {
    return (
      <div className={s.ecran}>
        <div className={s.conteneur}><p className={s.attente}>Un instant…</p></div>
      </div>
    );
  }

  const nomGuide = guide ? NOM[guide] : "";

  return (
    <div className={s.ecran}>
      <div className={s.conteneur}>
        {etape === "guide" && (
          <ChoixGuide onChoisir={(g) => { void choisir(g); }} enCours={enCours} erreur={erreur} />
        )}

        {etape !== "guide" && etape !== "pret" && (
          <>
            {/* Le Guide reste identifiable en haut, sur toutes les
                étapes : présence continue, sans prise de parole. */}
            <div className={s.bandeau}>
              <PortraitGuide forme="bandeau" />
              <div>
                <div className={s.bandeauNom}>{nomGuide}</div>
                <div className={s.bandeauEtape}>Étape {index + 1} sur {ORDRE.length}</div>
              </div>
            </div>

            <div className={s.corps}>
              <h1 className={s.titre}>{SECTIONS[etape as Section].titre}</h1>
              {/* La seule vraie prise de parole du milieu de parcours :
                  l'ouverture, une fois, sur la première section. */}
              {index === 0 && <p className={s.sousTitre}>{voix(guide, "bienvenue.ouverture")}</p>}
              <p className={s.ligneCommune}>{SECTIONS[etape as Section].ligne}</p>

              <EtapesProfil
                section={etape as Section}
                data={data}
                setData={setData}
                entrainement={entrainement}
                setEntrainement={setEntrainement}
              />

              <div className={s.pied}>
                {index > 0 && (
                  <button type="button" className={s.passer} onClick={precedent}>Retour</button>
                )}
                {/* Le questionnaire reste quittable : c'est ce qu'il est
                    aujourd'hui, et le rendre obligatoire au passage serait
                    un changement de produit déguisé en refonte. */}
                <button type="button" className={s.passer} onClick={() => { void plusTard(); }}>Plus tard</button>
                <button type="button" className={s.cta} onClick={() => { void suivant(); }}>
                  {index >= ORDRE.length - 1 ? "Terminer" : "Continuer"}
                </button>
              </div>
            </div>
          </>
        )}

        {etape === "pret" && (
          <div className={s.fin}>
            <PortraitGuide forme="fin" />
            <p className={s.finPhrase}>
              {voix(guide, dejaConfigure ? "bienvenue.fin_retour" : "bienvenue.fin")}
            </p>
            <div className={s.finActions}>
              <button type="button" className={s.cta} onClick={entrer}>
                {dejaConfigure ? "Continuer" : "Entrer dans Vaiiya"}
              </button>
              {/* Proposée, jamais imposée : quelqu'un qui veut juste entrer
                  n'a pas à traverser neuf chapitres pour y arriver. */}
              {!dejaConfigure && (
                <button type="button" className={s.secondaire} onClick={decouvrir}>
                  Découvrir Vaiiya
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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

   ⚠️ MODE REVUE (`?review=1`, hors production seulement). Il rejoue le
   parcours complet sans RIEN écrire, pour qu'on puisse le juger autant
   de fois qu'il le faut, avec Nora puis avec Sasha, sans créer de
   compte ni abîmer son profil. Une seule variable le porte, `revue`, et
   elle garde les trois portes d'écriture fermées : `choisirGuide`,
   `enregistrerProfil` et `persistLieu`. Les réponses réelles servent
   quand même de valeurs de départ : on juge l'écran tel qu'il sera, pas
   un formulaire vide.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useGuideActif } from "@/context/GuideContext";
import { useGuidedTour } from "@/context/GuidedTourContext";
import { createClient } from "@/lib/supabase";
import { lockBodyModal } from "@/lib/bodyModal";
import { destinationDepuisUrl } from "@/lib/destinationInterne";
import { enregistrerProfil } from "@/lib/profilOnboarding";
import { modeRevue } from "@/lib/modeRevue";
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
  const reduit = useReducedMotion();

  /* Lu une seule fois : le mode ne doit pas pouvoir changer en cours de
     parcours, sinon une étape écrirait alors que la précédente non. */
  const [revue] = useState(() => modeRevue());

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
  /** Le Guide « choisi » en mode revue. Il ne quitte jamais la mémoire. */
  const [guideRevue, setGuideRevue] = useState<GuideId | null>(null);
  /** Ce qu'une action de fin AURAIT fait, quand la revue l'a retenue. */
  const [noteRevue, setNoteRevue] = useState<string | null>(null);

  /** Les réponses telles qu'elles ont été lues, pour que « Recommencer »
   *  reparte du vrai profil et pas d'un formulaire à moitié modifié. */
  const departRef = useRef<{ data: OnboardingData; entrainement: Entrainement } | null>(null);

  /* La destination voulue, lue une seule fois : le parcours peut avoir
     interrompu une intention (une notification touchée, par exemple). */
  const [destination] = useState(() => destinationDepuisUrl("/"));

  // Le parcours occupe tout l'écran : la barre du bas se retire, comme
  // pour le tunnel de séance.
  useEffect(() => lockBodyModal(), []);

  /* Sans compte, il n'y a rien à écrire. On renvoie vers la connexion en
     gardant la destination, pour revenir ici juste après.

     ⚠️ Sauf en revue : ce mode n'écrit rien, donc exiger un compte n'a
     aucun sens, et s'en passer permet de juger l'écran tel que le voit
     un compte vraiment neuf, sans aucune réponse préremplie. */
  useEffect(() => {
    if (isLoading || user || revue) return;
    const suffixe = [
      destination !== "/" ? `next=${encodeURIComponent(destination)}` : "",
      revue ? "review=1" : "",
    ].filter(Boolean).join("&");
    const retour = `/bienvenue${suffixe ? `?${suffixe}` : ""}`;
    router.replace(`/auth?next=${encodeURIComponent(retour)}`);
  }, [isLoading, user, destination, revue, router]);

  /* Ce que le compte a déjà répondu. On repart de ses réponses plutôt que
     d'un formulaire vide : un compte existant ne doit jamais avoir
     l'impression que son profil a été perdu. En mode revue c'est une
     lecture, et rien d'autre. */
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
      let lu: OnboardingData = VIDE;
      if (p) {
        const r = p as Record<string, unknown>;
        lu = {
          age: t(r.onboarding_age),
          height: t(r.onboarding_height),
          weight: t(r.onboarding_weight),
          gender: t(r.onboarding_gender),
          goals: Array.isArray(r.onboarding_goals) ? (r.onboarding_goals as string[]) : [],
          level: t(r.onboarding_level),
          sessionsPerWeek: t(r.onboarding_sessions_week),
          mealsPerDay: t(r.onboarding_meals_day),
          diet: t(r.onboarding_diet),
        };
        setDataBrut(lu);
        setDejaConfigure(!!r.onboarding_completed);
      } else {
        setDejaConfigure(false);
      }
      const lieu = await loadLieu(user.id);
      if (annule) return;
      setEntrainementBrut(lieu);
      departRef.current = { data: lu, entrainement: lieu };
    })();
    return () => { annule = true; };
  }, [user?.id]);

  /* La lecture du profil, ou son absence assumée : en revue sans compte
     il n'y a rien à lire, donc rien à attendre non plus. */
  const profilLu: boolean | null = dejaConfigure !== null ? dejaConfigure
    : (revue && !user ? false : null);

  /* En revue, on joue TOUJOURS le parcours d'un compte neuf : c'est tout
     l'intérêt du mode, et la bifurcation « compte existant → conclusion »
     se teste en enlevant `review=1`. */
  const dejaVu = revue ? false : profilLu;
  const guideAffiche: GuideId | null = revue ? guideRevue : guide;

  /* Un Guide déjà connu à l'arrivée : on ne repose pas la question, et on
     reprend là où ça a du sens. Un compte déjà configuré n'a que la
     conclusion à voir ; un compte neuf entre dans le questionnaire. */
  const debut: Etape = !revue && etat === "actif" && profilLu !== null
    ? (profilLu ? "pret" : ORDRE[0])
    : "guide";
  const etape: Etape = etapeChoisie ?? debut;

  const setData = useCallback((patch: Partial<OnboardingData>) => setDataBrut((d) => ({ ...d, ...patch })), []);
  const setEntrainement = useCallback((patch: Partial<Entrainement>) => setEntrainementBrut((e) => ({ ...e, ...patch })), []);

  /* ── Écriture ─────────────────────────────────────────────────── */

  const enregistrer = async () => {
    // ⚠️ La porte d'écriture du questionnaire. En revue elle reste
    // fermée : ni les dix colonnes `onboarding_*`, ni le lieu.
    if (revue || !user?.id) return;
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
    // ⚠️ La porte d'écriture du Guide. En revue, le choix ne vit qu'en
    // mémoire : `profiles.guide_id` n'est pas touché.
    if (revue) {
      setGuideRevue(g);
      setEtape(ORDRE[0]);
      return;
    }
    setEnCours(g);
    const ok = await choisirGuide(g);
    setEnCours(null);
    if (!ok) {
      // Aucun faux succès : on ne fait pas semblant d'avoir enregistré.
      setErreur("Impossible d'enregistrer ton choix pour le moment. Vérifie ta connexion et réessaie.");
      return;
    }
    setEtape(profilLu ? "pret" : ORDRE[0]);
  };

  /** Mode revue seulement : on revient au tout début, et on remet les
   *  réponses telles qu'elles étaient en base. Aucune donnée réelle
   *  n'est touchée, puisqu'aucune n'a été écrite. */
  const recommencer = () => {
    setGuideRevue(null);
    setErreur(null);
    setNoteRevue(null);
    setEtape(null);
    const depart = departRef.current;
    setDataBrut(depart ? depart.data : VIDE);
    setEntrainementBrut(depart ? depart.entrainement : { location: null, equip: null });
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

  /* ⚠️ LES DEUX SORTIES SONT FERMÉES EN REVUE, et c'est la dernière fuite
     qui restait. « Découvrir Vaiiya » lançait la VRAIE visite guidée,
     dont l'achèvement écrit `profiles.tour_completed` : la revue n'était
     donc hermétique que tant qu'on ne touchait pas ce bouton. « Entrer »
     quitte le mode et rend la main à l'app, qui marque la présence du
     jour (`marquerPresence`) et écrit donc elle aussi.

     Les boutons restent VISIBLES et réagissent : il faut pouvoir juger
     l'écran tel qu'il sera, et un bouton qui ne répond pas ne dit pas
     s'il est neutralisé ou cassé. Ils annoncent ce qu'ils auraient fait,
     et la pastille « Recommencer » est juste au-dessus pour rejouer. */
  const entrer = () => {
    if (revue) {
      setNoteRevue("En revue, on reste ici. En vrai, ce bouton t'emmène dans Vaiiya.");
      return;
    }
    router.replace(destination);
  };

  const decouvrir = () => {
    if (revue) {
      setNoteRevue("En revue, la visite guidée n'est pas lancée : la terminer enregistrerait un réglage sur ton compte.");
      return;
    }
    router.replace(destination);
    /* La visite se joue PAR-DESSUS l'écran courant, sans redirection : on
       arrive donc d'abord à destination, puis on la lance. Sans ce court
       délai, le premier chapitre s'ouvrirait sur /bienvenue, c'est-à-dire
       sur l'écran qu'on vient de quitter. */
    setTimeout(() => demarrerVisite(), 450);
  };

  /* ── Rendu ────────────────────────────────────────────────────── */

  const bandeauRevue = revue ? (
    <div className={s.revue}>
      <span className={s.revueMot}>Revue · rien n&apos;est enregistré</span>
      <button type="button" className={s.revueBouton} onClick={recommencer}>Recommencer</button>
    </div>
  ) : null;

  // En revue on n'attend ni le compte, ni le contexte du Guide : le
  // parcours doit pouvoir se juger avant même que la colonne existe.
  const attente = isLoading || (!user && !revue) || profilLu === null
    || (!revue && etat === "chargement");

  if (attente) {
    return (
      <div className={s.ecran}>
        {bandeauRevue}
        <div className={s.conteneur}><p className={s.attente}>Un instant…</p></div>
      </div>
    );
  }

  const nomGuide = guideAffiche ? NOM[guideAffiche] : "";

  return (
    <div className={s.ecran}>
      {bandeauRevue}

      <div className={etape === "guide" ? `${s.conteneur} ${s.conteneurScene}` : s.conteneur}>
        {etape === "guide" && (
          <ChoixGuide onChoisir={(g) => { void choisir(g); }} enCours={enCours} erreur={erreur} />
        )}

        {etape !== "guide" && etape !== "pret" && (
          <>
            {/* ⚠️ LE GUIDE CONDUIT L'ÉTAPE, il ne la décore pas.
                Buste + prénom + une phrase à la première personne, dans un
                seul bloc. Le prénom sert d'attribution à la phrase : c'est
                ce couple qui fait « Nora me demande ce que je veux faire
                évoluer » plutôt que « page objectifs, avec Nora dans
                l'en-tête ».

                Une phrase par SECTION, jamais par réponse : il ouvre, puis
                il se tait pendant qu'on répond. Et elle vient de
                `lib/guides.ts`, donc elle porte la personnalité au lieu de
                la simuler ici.

                Pas de bulle, pas de pointe, pas de personnage qui flotte
                au-dessus des champs : ce n'est pas une conversation, c'est
                quelqu'un qui mène un questionnaire. */}
            <div className={s.presence}>
              <PortraitGuide forme="presence" anime={!reduit} />
              <div className={s.presenceMots}>
                <div className={s.presenceNom}>{nomGuide}</div>
                <p className={s.presencePhrase}>
                  {voix(guideAffiche, SECTIONS[etape as Section].voix)}
                </p>
              </div>
            </div>

            <div className={s.jauge}>
              <div className={s.jaugeBarre} style={{ width: `${((index + 1) / ORDRE.length) * 100}%` }} />
            </div>

            <div className={s.corps}>
              {/* Le titre garde toute son importance : le Guide nomme
                  l'intention, le titre nomme la structure. Le compteur se
                  range au bout de la même ligne, il ne mérite pas une
                  rangée à lui. */}
              <div className={s.titreLigne}>
                <h1 className={s.titre}>{SECTIONS[etape as Section].titre}</h1>
                <span className={s.compteur}>Étape {index + 1} sur {ORDRE.length}</span>
              </div>
              {/* Presque toutes les lignes neutres ont disparu : elles
                  reformulaient la phrase du Guide. Celles qui restent
                  disent quelque chose qu'il ne dit pas. */}
              {SECTIONS[etape as Section].ligne && (
                <p className={s.ligneCommune}>{SECTIONS[etape as Section].ligne}</p>
              )}

              <div className={s.questions}>
                <EtapesProfil
                  section={etape as Section}
                  data={data}
                  setData={setData}
                  entrainement={entrainement}
                  setEntrainement={setEntrainement}
                />
              </div>

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
            {/* Le Guide donne son identité à la conclusion aussi : sans
                lui, cet écran redevient une page de confirmation. */}
            <PortraitGuide forme="fin" />
            <p className={s.finNom}>{nomGuide}</p>
            <p className={s.finPhrase}>
              {voix(guideAffiche, dejaVu ? "bienvenue.fin_retour" : "bienvenue.fin")}
            </p>
            <div className={s.finActions}>
              <button type="button" className={s.cta} onClick={entrer}>
                {dejaVu ? "Continuer" : "Entrer dans Vaiiya"}
              </button>
              {/* Proposée, jamais imposée : quelqu'un qui veut juste entrer
                  n'a pas à traverser neuf chapitres pour y arriver. */}
              {!dejaVu && (
                <button type="button" className={s.secondaire} onClick={decouvrir}>
                  Découvrir Vaiiya
                </button>
              )}
            </div>
            {noteRevue && <p className={s.revueNote}>{noteRevue}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

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

   ⚠️ TOUT LE PARCOURS SE RÉPOND (Louis, 2026-08-19). Le choix du Guide
   était déjà obligatoire ; les cinq étapes le sont devenues. « Plus
   tard » a été retiré, et « Continuer » ne passe plus sur une étape
   vide (`champsManquants` dans `EtapesProfil`). Avant, on pouvait
   traverser les cinq étapes sans rien toucher et arriver dans Vaiiya
   avec un profil vide sans l'avoir décidé : ce n'était pas une liberté,
   c'était un piège silencieux. La sortie existe toujours, elle se prend
   en quittant la page ; elle n'est simplement plus proposée à chaque
   question.

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
import { enregistrerProfil, PROFIL_VIDE, type OnboardingData } from "@/lib/profilOnboarding";
import { modeRevue } from "@/lib/modeRevue";
import { loadLieu, persistLieu } from "@/lib/planning";
import { voix } from "@/lib/guides";
import type { GuideId } from "@/lib/guides";
import ChoixGuide from "./ChoixGuide";
import EtapesProfil, { MOMENTS, ORDRE, SECTIONS, champsManquants, momentDe, type Entrainement, type Section } from "./EtapesProfil";
import { prechargerMoments } from "@/components/AssistantMark";
import PortraitGuide from "./PortraitGuide";
import s from "./bienvenue.module.css";

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
  const [data, setDataBrut] = useState<OnboardingData>(PROFIL_VIDE);
  const [entrainement, setEntrainementBrut] = useState<Entrainement>({ location: null, equip: null });
  /** `null` = pas encore lu. Décide de la bifurcation compte neuf / compte connu. */
  const [dejaConfigure, setDejaConfigure] = useState<boolean | null>(null);
  const [enCours, setEnCours] = useState<GuideId | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  /** Le Guide « choisi » en mode revue. Il ne quitte jamais la mémoire. */
  const [guideRevue, setGuideRevue] = useState<GuideId | null>(null);
  /** Ce qu'une action de fin AURAIT fait, quand la revue l'a retenue. */
  const [noteRevue, setNoteRevue] = useState<string | null>(null);
  /** Vrai une fois qu'on a tenté de continuer sur une étape incomplète.
   *  C'est lui qui autorise la phrase « Il manque… » : sans tentative,
   *  pas de reproche. */
  const [manqueVu, setManqueVu] = useState(false);

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
      let lu: OnboardingData = PROFIL_VIDE;
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

  /* ⚠️ LA BASE NE SAIT PAS RÉPONDRE (état « inconnu » : colonne pas
     encore là, réseau coupé, profil illisible). On ne pose alors PAS la
     question du Guide : `choisirGuide` échouerait, et l'écran 0 est le
     seul dont on ne peut pas sortir sans réussir à écrire. Le
     questionnaire, lui, écrit d'autres colonnes et fonctionne très bien :
     on va donc droit aux questions, sans portrait ni prénom, avec la
     formulation commune. C'est exactement ce que fait déjà `VisageGuide`
     ailleurs quand aucun Guide n'est résolu.

     C'est ce qui garantit qu'aucune porte de l'app ne mène à un mur : la
     ligne des Paramètres, le rappel et la garde envoient tous ici. */
  const guideIndisponible = !revue && etat === "inconnu";

  /* En revue, on joue TOUJOURS le parcours d'un compte neuf : c'est tout
     l'intérêt du mode, et la bifurcation « compte existant → conclusion »
     se teste en enlevant `review=1`. */
  const dejaVu = revue ? false : profilLu;
  const guideAffiche: GuideId | null = revue ? guideRevue : guide;

  /* Un Guide déjà connu à l'arrivée : on ne repose pas la question, et on
     reprend là où ça a du sens. Un compte déjà configuré n'a que la
     conclusion à voir ; un compte neuf entre dans le questionnaire. */
  const debut: Etape = (!revue && etat === "actif" && profilLu !== null) || guideIndisponible
    ? (profilLu ? "pret" : ORDRE[0])
    : "guide";
  const etapeVoulue: Etape = etapeChoisie ?? debut;

  /* Passé l'écran de choix, le Guide est forcément connu : c'est le choix
     lui-même qui fait avancer, et un compte déjà réglé n'arrive à la
     conclusion que si `etat === "actif"`. Si l'invariant tombait quand
     même, on ne bricole pas un portrait par défaut et on n'affiche pas un
     écran amputé : on repose la question. Un Guide que personne n'a choisi
     est un bug, pas une valeur. */
  const etape: Etape = etapeVoulue !== "guide" && !guideAffiche && !guideIndisponible
    ? "guide" : etapeVoulue;

  /* ⚠️ LE PRÉCHARGEMENT REMPLACE LA TRANSITION, il ne l'accompagne pas.
     Le portrait bascule sec d'une section à l'autre (décision de Louis :
     pas d'animation), donc rien ne couvre le changement d'image. Un
     fichier pas encore téléchargé laisserait un trou au milieu de
     l'écran, exactement là où le Guide doit être.

     On demande dès que le Guide est connu, c'est-à-dire pendant qu'on
     lit encore l'écran de choix : les cinq bustes sont donc là avant la
     première question. `prechargerMoments` ne demande que les planches
     qui existent vraiment ; tant qu'aucune n'est dessinée, cet effet ne
     fait aucune requête. */
  useEffect(() => {
    prechargerMoments(guideAffiche, MOMENTS, "pose");
  }, [guideAffiche]);

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
      setErreur("Impossible d’enregistrer ton choix pour le moment. Vérifie ta connexion et réessaie.");
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
    setDataBrut(depart ? depart.data : PROFIL_VIDE);
    setEntrainementBrut(depart ? depart.entrainement : { location: null, equip: null });
  };

  /* ── Navigation entre sections ────────────────────────────────── */

  const index = ORDRE.indexOf(etape as Section);

  /* ⚠️ « CONTINUER » NE PASSE PLUS SUR UNE ÉTAPE VIDE (décision de
     Louis, 2026-08-19). Avant, le bouton avançait quoi qu'il arrive :
     on pouvait traverser les cinq écrans sans rien toucher et arriver
     dans Vaiiya avec un profil vide, sans jamais l'avoir décidé. Ce
     n'était pas une liberté, c'était un piège silencieux.

     ⚠️ ET IL RESTE CLIQUABLE, éteint mais vivant (`aria-disabled` et
     non `disabled`). Un bouton mort ne dit pas s'il est refusé ou
     cassé : on tape, rien ne bouge, on n'apprend rien. Ici le clic
     répond, en nommant ce qui manque.

     ⚠️ La phrase n'apparaît qu'APRÈS une tentative. L'afficher en
     arrivant sur l'étape reviendrait à reprocher une question avant de
     l'avoir posée. */
  const manquants = index >= 0 ? champsManquants(etape as Section, data, entrainement) : [];
  const bloque = manquants.length > 0;

  /** « ton âge, ta taille et ton poids » : la virgule partout, « et »
   *  pour le dernier. Composé ici parce que seul l'appelant sait
   *  combien d'éléments il annonce. */
  const phraseManque = manquants.length === 0 ? null
    : manquants.length === 1 ? `Il manque ${manquants[0]}.`
    : `Il manque ${manquants.slice(0, -1).join(", ")} et ${manquants[manquants.length - 1]}.`;

  const suivant = async () => {
    if (bloque) { setManqueVu(true); return; }
    setManqueVu(false);
    await enregistrer();
    setEtape(index >= ORDRE.length - 1 ? "pret" : ORDRE[index + 1]);
  };

  const precedent = () => {
    // On ne revient JAMAIS sur le choix du Guide : il est déjà écrit, et
    // le rejouer ferait croire qu'il n'a pas été pris en compte. Il se
    // change dans les paramètres, comme l'écran 0 l'annonce.
    setManqueVu(false);
    if (index > 0) setEtape(ORDRE[index - 1]);
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
      setNoteRevue("En revue, on reste ici. En vrai, ce bouton t’emmène dans Vaiiya.");
      return;
    }
    router.replace(destination);
  };

  const decouvrir = () => {
    if (revue) {
      setNoteRevue("En revue, la visite guidée n’est pas lancée : la terminer enregistrerait un réglage sur ton compte.");
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

        {etape !== "guide" && etape !== "pret" && (guideAffiche || guideIndisponible) && (
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
            {guideAffiche ? (
              <div className={s.presence}>
                <PortraitGuide
                  guide={guideAffiche}
                  forme="presence"
                  moment={momentDe(etape as Section)}
                  anime={!reduit}
                />
                <div className={s.presenceMots}>
                  <div className={s.presenceNom}>{nomGuide}</div>
                  <p className={s.presencePhrase}>
                    {voix(guideAffiche, SECTIONS[etape as Section].voix)}
                  </p>
                </div>
              </div>
            ) : (
              /* Sans Guide résolu : la phrase reste, à la formulation
                 commune, et personne ne la prononce. On ne met pas un
                 portrait par défaut, ce serait donner un visage à
                 quelqu'un qui n'a pas été choisi. */
              <p className={s.presencePhrase}>{voix(null, SECTIONS[etape as Section].voix)}</p>
            )}

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

              {/* ⚠️ « PLUS TARD » A ÉTÉ SUPPRIMÉ (Louis, 2026-08-19).
                  Il ouvrait une sortie à chacune des cinq étapes, donc
                  la question la plus fréquente devenait « est-ce que je
                  peux éviter ça ? » plutôt que la question posée. Cinq
                  écrans courts, ce n'est pas trop demander pour ce
                  qu'ils débloquent derrière. Ne pas le remettre « pour
                  laisser le choix » : le choix existe encore, il se
                  prend en quittant la page, il n'est simplement plus
                  proposé à chaque écran. */}
              <div className={manqueVu && phraseManque ? `${s.piedBloc} ${s.piedBlocAvecMot}` : s.piedBloc}>
                {/* ⚠️ AU-DESSUS DES BOUTONS, pas en dessous. Mesuré sur
                    un écran de 640 : la phrase ajoute 14 px, donc posée
                    sous le bouton elle passait sous le pli, et
                    l'explication qu'on vient de demander se retrouvait
                    hors de vue. Ici elle est prise dans l'espace libre
                    que le pied laissait au-dessus de lui.

                    `role="status"` et pas `alert` : ce n'est pas une
                    erreur, c'est une question encore ouverte. */}
                {manqueVu && phraseManque && (
                  <p className={s.manque} id="bv-manque" role="status">{phraseManque}</p>
                )}
                <div className={s.pied}>
                  {index > 0 && (
                    <button type="button" className={s.passer} onClick={precedent}>Retour</button>
                  )}
                  <button
                    type="button"
                    className={bloque ? `${s.cta} ${s.ctaEteint}` : s.cta}
                    aria-disabled={bloque}
                    aria-describedby={manqueVu && phraseManque ? "bv-manque" : undefined}
                    onClick={() => { void suivant(); }}
                  >
                    {index >= ORDRE.length - 1 ? "Terminer" : "Continuer"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {etape === "pret" && (guideAffiche || guideIndisponible) && (
          <div className={s.fin}>
            {/* Le Guide donne son identité à la conclusion aussi : sans
                lui, cet écran redevient une page de confirmation. */}
            {guideAffiche && <PortraitGuide guide={guideAffiche} forme="fin" />}
            {guideAffiche && <p className={s.finNom}>{nomGuide}</p>}
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

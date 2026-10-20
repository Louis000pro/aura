"use client";

/* ════════════════════════════════════════════════════════════════════
   AssistantSheet — le chat global, en bottom sheet par-dessus la page.

   S'ouvre depuis l'orbe de navigation (ou open()), reste contextuel
   (la page derrière est visible/grisée). Lit tout son état depuis
   useAssistant() : un seul cerveau, une seule UI. Thématisé (clair/sombre)
   via les design tokens.
   ════════════════════════════════════════════════════════════════════ */

import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Send, ChevronDown, Mic, Square, Check, Utensils } from "lucide-react";
import { useAssistant } from "@/context/AssistantContext";
import type { QuestionCliquable } from "@/lib/assistantTools";
import type { AttenteAction, JourDispo } from "@/context/AssistantContext";
import CarteSeance from "@/components/assistant/CarteSeance";
import OuvertureGuide from "@/components/assistant/OuvertureGuide";
import { BULLE, BULLE_GUIDE, BULLE_MOI, Brouillon, PointsSaisie } from "@/components/assistant/bulles";
import { useWorkoutLaunch } from "@/context/WorkoutLaunchContext";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";
import { CATEGORY_LABEL } from "@/lib/assistantActions";
import { VENTE_OUVERTE } from "@/lib/plans";
import { useRouter } from "next/navigation";
import { heroImageForSeance } from "@/lib/workoutArt";
import { EnteteGuide, prechargerGuide } from "@/components/AssistantMark";
import { useGuideActif } from "@/context/GuideContext";
import { voix, nomGuide, roleGuide } from "@/lib/guides";
import type { EtatGuide } from "@/lib/guides";

/** Libellé lisible d'un moment de repas (valeurs canoniques du journal).
 *  ⚠️ `gouter` se dit « Goûter », jamais « Collation » (choix de Louis,
 *  2026-08-11) : c'est déjà le mot de l'écran Nutrition et du coach, et
 *  l'✦ était le seul endroit à nommer autrement le même créneau. */
const MEAL_LABEL: Record<string, string> = {
  "petit-dejeuner": "Petit-déjeuner",
  "dejeuner": "Déjeuner",
  "gouter": "Goûter",
  "diner": "Dîner",
};

/** Le jour tel qu'il est écrit sur sa puce (« demain », « ven. 1 ») : le bouton
 *  de validation doit dire EXACTEMENT ce qui a été touché. */
function libelleJour(jours: JourDispo[] | null, ymd: string | null): string {
  const j = jours?.find((x) => x.ymd === ymd);
  return (j?.label ?? "").toLowerCase();
}

/* ── Rendu lisible des réponses de l'✦ ──
   Le modèle glisse parfois du markdown (**gras**, listes en *, titres #, `code`).
   À l'écran, ces symboles sont moches à lire. On les transforme en présentation
   propre : gras réel, puces à tiret « – », et on retire les artefacts (# ` ^ ~ *
   isolés). Filet de sécurité — le prompt demande déjà d'écrire sans markdown. */
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  // Découpe **gras** (et __gras__) en morceaux ; nettoie les symboles restants.
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/) || part.match(/^__([^_]+)__$/);
    if (bold) {
      return (
        <strong key={`${keyBase}-b${i}`} style={{ fontWeight: 600 }}>
          {clean(bold[1])}
        </strong>
      );
    }
    const c = clean(part);
    return c ? <span key={`${keyBase}-s${i}`}>{c}</span> : null;
  });
}

/** Retire les symboles markdown résiduels qui salissent la lecture. */
function clean(s: string): string {
  return s
    .replace(/`+/g, "")        // `code`
    .replace(/[\^~]/g, "")     // ^ ~ (exposants / barrés markdown)
    .replace(/(^|\s)\*(?=\S)/g, "$1") // * d'emphase collé à un mot
    .replace(/\*(?=\s|$)/g, ""); // * isolé
}

function AssistantContent({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((raw, i) => {
        const line = raw.replace(/^\s+/, (m) => m); // garde l'indentation légère
        // Puce ( - , * , • ) → tiret propre avec retrait pendu
        const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
        if (bullet) {
          return (
            <span key={i} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{ color: "var(--exp-encre)", flexShrink: 0 }}>–</span>
              <span>{renderInline(bullet[1], `l${i}`)}</span>
            </span>
          );
        }
        // Liste numérotée → on garde le numéro
        const num = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
        if (num) {
          return (
            <span key={i} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{ color: "var(--exp-encre)", fontWeight: 600, flexShrink: 0 }}>{num[1]}.</span>
              <span>{renderInline(num[2], `l${i}`)}</span>
            </span>
          );
        }
        // Titre markdown (#, ##…) → ligne en gras, sans les dièses
        const head = line.match(/^\s*#{1,6}\s+(.*)$/);
        if (head) {
          return (
            <span key={i} style={{ display: "block", fontWeight: 600 }}>
              {renderInline(head[1], `l${i}`)}
            </span>
          );
        }
        return (
          <span key={i} style={{ display: "block" }}>
            {renderInline(line, `l${i}`)}
          </span>
        );
      })}
    </>
  );
}

/* Les bulles (le Guide à gauche, toi à droite) et les réponses en
   pointillés vivent dans `assistant/bulles.tsx` : la feuille et son
   ouverture les dessinent pareil. */

/* ── Les réponses cliquables ──
   Elles attendent sous la question, de ton côté, en brouillons. Une carte,
   chez nous, annonce une écriture à valider ; une question ne demande rien
   à valider, elle n'en porte donc pas le costume.

   Une fois répondue, la réponse choisie DEVIENT ta bulle : c'est la seule
   trace (le message envoyé au coach reste masqué), donc rien ne s'écrit
   deux fois. Une question laissée sans réponse s'efface dès qu'un message
   arrive après elle : on ne répond qu'une fois, et jamais hors contexte. */
function QuestionChips({ q, actif, onChoisir }: {
  q: QuestionCliquable;
  actif: boolean;
  onChoisir: (choix: string) => void;
}) {
  if (q.repondu) {
    return (
      <div className="flex justify-end">
        <p className={BULLE} style={{ ...BULLE_MOI, maxWidth: "84%", wordBreak: "break-word" }}>{q.repondu}</p>
      </div>
    );
  }
  if (!actif) return null; // question dépassée : on ne la laisse pas cliquable
  return (
    <div className="flex flex-col items-end gap-2">
      {q.choix.map((c, i) => (
        <Brouillon key={c} rang={i} onClick={() => onChoisir(c)}>{c}</Brouillon>
      ))}
    </div>
  );
}

/* Ce que fait le Guide, en trois mots sous son nom, comme dans une
   messagerie. ⚠️ C'est un LIBELLÉ D'INTERFACE, pas une parole du Guide : il
   décrit son état, il ne parle pas, donc il vit ici et pas dans guides.ts.
   Il se lit sur les mêmes signaux que son visage (`etatGuide`, l'action en
   cours), jamais dans le texte. Aucun accord de genre : les mêmes mots
   valent pour Nora et pour Sasha. */
function statutGuide(etat: EtatGuide, attente: AttenteAction | null): string {
  if (attente === "seance") return "prépare ta séance…";
  if (attente === "recette") return "écrit ta recette…";
  if (attente === "repas") return "estime ton repas…";
  if (etat === "think") return "t’écrit…";
  if (etat === "encourage") return "c’est fait";
  return "t’écoute";
}

/* Le point de présence : teal, la couleur de ce qui va bien (système D). Il
   bat doucement pour dire « je suis là », et ne bouge pas du tout quand on a
   demandé moins de mouvement. */
function PointPresence() {
  const reduire = useReducedMotion();
  return (
    <span aria-hidden className="relative flex-shrink-0" style={{ width: 9, height: 9 }}>
      {!reduire && (
        <motion.span className="absolute inset-0 rounded-full" style={{ background: "#2BD4A0" }}
          animate={{ scale: [1, 2.4], opacity: [0.5, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }} />
      )}
      <span className="absolute inset-0 rounded-full" style={{ background: "#2BD4A0" }} />
    </span>
  );
}

/* ── La carte d'une séance proposée pour la bibliothèque ──
   Elle tient son propre état de choix (jour ouvert, jour touché) et porte une
   `key` liée à la proposition : une nouvelle séance repart donc à zéro sans
   qu'aucun effet n'ait à la remettre à plat. Garder le jour d'une carte
   précédente ferait programmer la mauvaise séance. */
function CarteProposition() {
  const { pendingSeance, confirmSeance, garderSeance, cancelSeance, chargerJours, close, bibliothequePleine } = useAssistant();
  const { launchWorkout } = useWorkoutLaunch();
  const [jours, setJours] = useState<JourDispo[] | null>(null);
  const [jourChoisi, setJourChoisi] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState(false);

  if (!pendingSeance) return null;
  const s = pendingSeance;

  const ouvrirJours = () => {
    setOuvert((v) => !v);
    if (!jours) void chargerJours().then(setJours);
  };

  /* « La faire maintenant » lance la séance SANS rien garder ni programmer :
     s'entraîner ne doit jamais obliger à ranger quelque chose d'abord. */
  const faireMaintenant = () => {
    launchWorkout({
      sessionId: s.id,
      title: s.title,
      accent: "var(--accent)",
      duration: s.duration,
      difficulty: s.difficulty,
      category: s.category,
      heroImage: heroImageForSeance({ title: s.title, category: s.category, muscles: s.muscles }),
      exerciseList: s.exerciseList.map((e) => ({
        name: e.name, sets: e.sets, reps: e.reps, rest: e.rest, restAfter: e.restAfter,
        tip: e.tip ?? "", benefit: e.benefit ?? "", muscles: e.muscles ?? [],
      })),
      // Elle n'est rangée nulle part : le tunnel proposera de la garder une
      // fois terminée, comme une impro. Stock plein → on ne le propose pas du
      // tout, plutôt qu'un bouton qui refuse après l'effort.
      ...(bibliothequePleine ? {} : { onGarder: () => garderSeance(s), aGarder: s }),
    });
    cancelSeance();
    close();
  };

  return (
    <CarteSeance
      kicker="Proposition"
      titre={s.title}
      meta={[CATEGORY_LABEL[s.category], `${s.duration} min`, s.difficulty].join(" · ")}
      exercices={s.exerciseList.map((ex) => ({ name: ex.name, dose: `${ex.sets} × ${ex.reps}`, muscles: ex.muscles }))}
      /* Deux sorties seulement (Louis, 2026-10-17) : la faire maintenant
         (l'action, en violet), ou la programmer, qui ouvre les jours. Un
         jour choisi, le bouton dit lequel. Plus de « Garder la séance » :
         elle finissait dans une bibliothèque que personne ne voyait. */
      options={[
        { id: "day", label: "Programmer", actif: ouvert, onClick: ouvrirJours },
      ]}
      jours={ouvert ? jours : null}
      jourChoisi={jourChoisi}
      onJour={(d) => setJourChoisi((v) => (v === d ? null : d))}
      cta={jourChoisi ? `Programmer ${libelleJour(jours, jourChoisi)}` : "La faire maintenant"}
      onValider={jourChoisi ? () => confirmSeance(jourChoisi) : faireMaintenant}
      onFermer={cancelSeance}
      hint={ouvert && !jourChoisi ? "Choisis le jour" : null}
    />
  );
}

/* ── La carte d'un jour de planning qui va changer ──
   Même coquille, autres sorties : le jour est déjà visé, donc le bouton le
   nomme et le bandeau dit ce qu'on va remplacer. Le jour sélectionné n'est pas
   un état local ici : c'est la date de la proposition elle-même. */
function CartePlanning() {
  const { pendingPlan, confirmPlan, basculerEnPlus, retargetPlan, cancelPlan, chargerJours } = useAssistant();
  const [jours, setJours] = useState<JourDispo[] | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [garderAussi, setGarderAussi] = useState(false);

  if (!pendingPlan) return null;
  const p = pendingPlan;

  const ouvrirJours = () => {
    setOuvert((v) => !v);
    if (!jours) void chargerJours().then(setJours);
  };

  return (
    <CarteSeance
      kicker={p.kicker}
      ton="jour"
      titre={p.title}
      meta={p.meta}
      exercices={(p.preview?.exerciseList ?? []).map((ex) => ({ name: ex.name, dose: `${ex.sets} × ${ex.reps}`, muscles: ex.muscles }))}
      options={[
        ...(p.retargetable ? [{ id: "day", label: "Changer de jour", actif: ouvert, onClick: ouvrirJours }] : []),
        /* V9C · la seconde sortie d'une substitution, en toutes lettres.
           Décision 1 de V9 : « autre chose que X » propose une substitution
           par défaut, et la carte offre l'autre lecture sans la deviner.
           C'est une BASCULE : elle porte sa coche quand elle est active, et
           on peut revenir en arrière. */
        ...(p.substitution ? [{
          id: "enplus",
          label: `En plus, sans toucher à « ${p.substitution.etapeNom} »`,
          bascule: true,
          actif: p.geste.type === "ajouter",
          onClick: basculerEnPlus,
        }] : []),
        ...(p.gardable ? [{ id: "keep", label: "Garder dans mes séances", bascule: true, actif: garderAussi, onClick: () => setGarderAussi((v) => !v) }] : []),
      ]}
      jours={ouvert ? jours : null}
      jourChoisi={p.preview?.date ?? null}
      onJour={(d) => { retargetPlan(d); setOuvert(false); }}
      cta={p.cta}
      onValider={() => confirmPlan(garderAussi)}
      onFermer={cancelPlan}
      consequence={p.consequence}
      hint={garderAussi ? "Elle rejoindra aussi tes séances" : null}
    />
  );
}

export default function AssistantSheet() {
  const { isOpen, close, messages, isStreaming, sendMessage, repondreQuestion, memoryNotice, pendingSeance, pendingPlan, pendingRecipe, pendingMeal, actionLoading, etatGuide, noterSaisie, confirmRecipe, cancelRecipe, confirmMeal, cancelMeal, quotaChat, messagesEpuises } = useAssistant();
  const router = useRouter();
  /* Qui parle dans cette conversation. `null` tant que le choix n'a pas
     été fait (ou que la lecture a échoué) : tout retombe alors sur ✦ et
     sur le texte commun, donc rien ne casse. */
  const { guide } = useGuideActif();
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const voice = useVoiceCapture({ onTranscript: (t) => sendMessage(t) });

  useEffect(() => { setMounted(true); }, []);

  /* Les cinq poses se relaient au même endroit, dans l'en-tête. On les
     demande à l'ouverture de la feuille : sans ça, le premier passage à
     « think » téléchargerait son fichier PENDANT le fondu, et la place du
     Guide se viderait le temps de l'aller-retour. */
  useEffect(() => { if (isOpen) prechargerGuide(guide, "entete"); }, [isOpen, guide]);

  /* Une carte épinglée en bas prend de la hauteur : l'en-tête se resserre
     alors, sinon sur un petit téléphone il ne resterait presque rien de la
     conversation entre le Guide et la carte. */
  const compact = !!(pendingSeance || pendingPlan || pendingRecipe || pendingMeal);

  // La saisie grandit VERTICALEMENT avec le texte (on voit tout ce qu'on écrit,
  // on peut se relire et se corriger — plus de ligne unique qui défile à l'horizontale).
  const autoGrow = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`; // plafonné, puis scroll interne
  };
  useEffect(() => { autoGrow(); }, [input]);

  // Auto-scroll en bas à chaque nouveau contenu
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    /* Sans message, l'écran d'accueil commence par la tête du Guide :
       descendre en bas la couperait (la mention IA l'a rallongé). */
    if (messages.length === 0) { el.scrollTo({ top: 0 }); return; }
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    // La carte s'anime et grandit après le 1er rendu : on re-scroll une fois sa
    // hauteur stabilisée pour que son bouton de validation reste atteignable.
    if (pendingSeance || pendingPlan || pendingRecipe || pendingMeal) {
      const t = setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }), 360);
      return () => clearTimeout(t);
    }
  }, [messages, isOpen, pendingSeance, pendingPlan, pendingRecipe, pendingMeal, actionLoading]);

  // Échap pour fermer
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  /* Un seul endroit change le brouillon, et il prévient le contexte au
     passage : le Guide écoute tant qu'il y a quelque chose d'écrit. Le
     signal part d'ici plutôt que d'un effet, parce que c'est ici qu'on
     SAIT ce qui change (un effet devrait le redécouvrir à chaque rendu). */
  const ecrire = (v: string) => {
    setInput(v);
    noterSaisie(v.trim().length > 0);
  };

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    ecrire("");
  };

  const canSend = !!input.trim() && !isStreaming;

  // Les réponses cliquables déjà données sont visibles sur la puce cochée : le
  // message envoyé au coach, lui, ne s'affiche pas (il ferait doublon).
  const visibles = messages.filter((m) => !m.masque);
  // Une question est en attente → on rappelle qu'on peut aussi taper.
  const derniere = visibles[visibles.length - 1];
  const questionEnAttente = !!derniere?.question && !derniere.question.repondu && !isStreaming;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Voile (page visible derrière) */}
          <motion.div
            key="assistant-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={close}
            className="fixed inset-0 z-[110]"
            style={{ background: "rgba(10,7,24,0.42)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }}
          />

          {/* Sheet */}
          <motion.div
            key="assistant-sheet"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed z-[111] left-0 right-0 bottom-0 mx-auto flex flex-col overflow-hidden
                       md:left-auto md:right-6 md:bottom-6 md:w-[420px] md:rounded-3xl"
            style={{
              height: "min(88vh, 760px)",
              maxWidth: 640,
              /* Blanche et pleine, jamais en verre (Louis, 2026-10-11) : la
                 conversation se lit, rien ne doit transparaître dessous. */
              background: "rgb(var(--surface-rgb))",
              borderTopLeftRadius: 28, borderTopRightRadius: 28,
              border: "1px solid rgba(var(--accent-rgb),0.18)",
              boxShadow: "0 -12px 48px rgba(0,0,0,0.28)",
            }}
          >
            {/* ── L'EN-TÊTE : LE GUIDE, SON NOM, CE QU'IL FAIT ──
                Version 3 : on doit voir d'un coup d'œil qu'on parle à
                quelqu'un. Le Guide se tient en haut à gauche, assez grand
                pour qu'on voie son geste, et la ligne sous son nom dit ce
                qu'il fait en ce moment (« t'écoute », « prépare ta
                séance… »), comme une messagerie. Son visage est le seul qui
                CHANGE en place, d'où le fondu croisé, court : une pose qui
                claque d'une image à l'autre se remarque plus que ce qu'elle
                raconte.

                Le fond est l'aube de l'app (`--fond-verre`), opaque : rien
                ne transparaît dessous, la règle du 2026-10-11 tient. Il se
                fond dans la surface en bas, pour que la conversation commence
                sans trait. */}
            <div className="relative flex-shrink-0 overflow-hidden"
              style={{ height: compact ? 96 : 176, background: "var(--fond-verre)", transition: "height .28s cubic-bezier(.22,1,.36,1)" }}>
              <div aria-hidden className="absolute inset-x-0 bottom-0 pointer-events-none"
                style={{ height: 56, background: "linear-gradient(to bottom, rgba(var(--surface-rgb),0), rgb(var(--surface-rgb)))" }} />
              <div className="absolute"
                style={{ left: -2, top: 8, transform: `scale(${compact ? 0.5 : 1})`, transformOrigin: "top left", transition: "transform .28s cubic-bezier(.22,1,.36,1)" }}>
                <span className="relative block" style={{ width: 136, height: 170 }}>
                  <AnimatePresence initial={false}>
                    <motion.span key={etatGuide} className="absolute inset-0"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.22 }}>
                      <EnteteGuide guide={guide} etat={etatGuide} hauteur={170} />
                    </motion.span>
                  </AnimatePresence>
                </span>
              </div>
              <div className="absolute min-w-0"
                style={{ left: compact ? 80 : 142, right: 64, top: compact ? 20 : 56, transition: "left .28s cubic-bezier(.22,1,.36,1), top .28s cubic-bezier(.22,1,.36,1)" }}>
                {/* Un seul mot pour désigner Nora et Sasha : « Guide ».
                    L'en-tête disait « Ton assistant », les cartes disaient
                    « le coach » et le produit dit ✦ : trois noms pour un
                    seul interlocuteur. */}
                <p className={`${compact ? "text-[20px]" : "text-[26px]"} truncate`}
                  style={{ lineHeight: 1.05, fontWeight: 800, fontVariationSettings: "var(--w-voix)", letterSpacing: "-0.02em", color: "var(--text-0)" }}>
                  {nomGuide(guide)}
                </p>
                <p role="status" aria-live="polite" className="flex items-center gap-2 mt-1.5 text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
                  <PointPresence />
                  <span className="truncate">{statutGuide(etatGuide, actionLoading)}</span>
                </p>
                {/* « IA » en toutes lettres, toujours visible (AI Act, art. 50). */}
                <p className="mt-1 text-[11px] font-medium truncate" style={{ color: "var(--text-body)" }}>{roleGuide(guide)}</p>
              </div>
              <button onClick={close} aria-label="Fermer la conversation"
                className="absolute flex items-center justify-center cursor-pointer"
                style={{ right: 12, top: 12, width: 44, height: 44, borderRadius: 999, background: "rgba(var(--surface-rgb),0.72)", border: "1px solid rgba(var(--accent-rgb),0.16)" }}>
                <ChevronDown size={20} strokeWidth={2} style={{ color: "var(--text-1)" }} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0"
              style={{ scrollbarWidth: "none" }}>
              {/* LE GUIDE PARLE EN PREMIER, ET DE TA JOURNÉE (2026-10-20).
                  Une séance en pause, la séance du jour, la prochaine étape,
                  ce qui est fait, le repos, la flamme : `OuvertureGuide`
                  le lit et le dit, sans appel d'IA, et tes réponses
                  attendent déjà de ton côté. Il n'est monté que sur une
                  conversation ouverte et vide, donc la journée ne se lit
                  qu'au moment où quelqu'un l'ouvre vraiment. */}
              {messages.length === 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col flex-1">
                  <OuvertureGuide />
                </motion.div>
              )}

              <AnimatePresence initial={false}>
                {visibles.map((msg, i) => {
                  /* Deux messages de suite du même côté se serrent, comme
                     dans une messagerie : c'est une même prise de parole. */
                  const precedent = visibles[i - 1];
                  const suite = !!precedent && precedent.role === msg.role && !precedent.question;
                  return (
                  <Fragment key={msg.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    style={suite ? { marginTop: -8 } : undefined}>
                    <div className={BULLE}
                      style={{
                        maxWidth: "84%", wordBreak: "break-word", whiteSpace: "pre-wrap",
                        ...(msg.role === "user" ? BULLE_MOI : BULLE_GUIDE),
                      }}>
                      {msg.role === "assistant" ? <AssistantContent text={msg.content} /> : msg.content}
                      {msg.streaming && msg.role === "assistant" && msg.content === "" && (
                        <span className="flex items-center gap-1 py-1.5" aria-label={`${nomGuide(guide)} écrit`}>
                          <PointsSaisie />
                        </span>
                      )}
                      {msg.streaming && msg.role === "assistant" && msg.content !== "" && (
                        <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }}
                          style={{ color: "var(--exp-encre)", marginLeft: 1 }}>|</motion.span>
                      )}
                    </div>
                  </motion.div>
                  {msg.question && (
                    <QuestionChips
                      q={msg.question}
                      actif={i === visibles.length - 1 && !isStreaming}
                      onChoisir={(c) => repondreQuestion(msg.id, c)}
                    />
                  )}
                  </Fragment>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Zone d'action ÉPINGLÉE au-dessus de la saisie : la carte reste
                TOUJOURS atteignable, quelle que soit la longueur de la
                conversation, elle n'est plus écrasée par le fil de messages
                qui, lui, se réduit (flex-1) pour lui faire place.

                ⚠️ ELLE DÉFILE, ELLE NE ROGNE PLUS. Le plafond de 62 % existait
                déjà, mais la zone était en `overflow-hidden` : une carte plus
                haute que ce plafond perdait purement et simplement son bas,
                donc son bouton violet, derrière le composer (signalé par Louis
                le 2026-09-09). On la borne toujours, pour que la conversation
                reste visible, mais ce qui dépasse se fait défiler au lieu de
                disparaître. La carte, elle, s'est repliée : le cas normal
                n'atteint plus ce plafond. */}
            <div className="flex-shrink-0 min-h-0 px-3 pb-2.5 pt-0.5 flex flex-col gap-2 overflow-y-auto overscroll-contain"
              style={{ maxHeight: "62%", scrollbarWidth: "none" }}>

              {/* Génération en cours */}
              {actionLoading && (
                /* ── IL ÉCRIT ──
                   Trois points dans sa bulle, comme quelqu'un qui tape. Ce
                   qu'il fait vraiment est dit en haut, sous son nom
                   (« prépare ta séance… »), là où son visage passe en pose de
                   réflexion : c'est l'en-tête qui le montre grand, plus un
                   second portrait posé dans le fil.

                   La phrase d'attente du Guide reste lue par un lecteur
                   d'écran. Elle nomme ce qu'elle attend : elle disait « une
                   séance » aux trois actions qui font patienter, donc elle en
                   promettait une à qui venait de raconter son déjeuner. */
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="self-start">
                  <p role="status" aria-label={voix(guide, `attente.${actionLoading}`)}
                    className="flex items-center gap-1.5 px-4" style={{ ...BULLE_GUIDE, height: 44 }}>
                    <PointsSaisie />
                  </p>
                </motion.div>
              )}

              {pendingSeance && <CarteProposition key={pendingSeance.id} />}
              {pendingPlan && <CartePlanning key={`${pendingPlan.title}-${pendingPlan.preview?.date ?? ""}`} />}

              {/* ── Carte RECETTE ── */}
              {pendingRecipe && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="w-full overflow-hidden flex flex-col"
                  style={{ minHeight: 0, borderRadius: "var(--r-bloc)", background: "rgba(var(--surface-rgb),0.98)", border: "1px solid rgba(var(--accent-rgb),0.22)", boxShadow: "var(--ombre-pose)" }}>
                  <div className="flex items-center gap-3 px-4 pt-3.5 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(var(--accent-rgb),0.10)" }}>
                    <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 text-[20px]"
                      style={{ borderRadius: "var(--r-controle)", background: "linear-gradient(135deg,#F5B120,#E8620C)" }}>
                      🍽️
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="vy-label" style={{ color: "var(--exp-encre)" }}>Recette</p>
                      <p className="text-[16px] font-semibold leading-tight truncate" style={{ color: "var(--text-0)" }}>{pendingRecipe.nom}</p>
                    </div>
                  </div>

                  {/* Repères */}
                  <div className="flex flex-wrap gap-1.5 px-4 pt-2.5 flex-shrink-0">
                    {[
                      `${pendingRecipe.prepMin + pendingRecipe.cookMin} min`,
                      `${pendingRecipe.portions} portion${pendingRecipe.portions > 1 ? "s" : ""}`,
                      pendingRecipe.difficulty,
                      `${pendingRecipe.calories} kcal`,
                      `${pendingRecipe.proteins} g prot.`,
                    ].map((t) => (
                      <span key={t} className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(var(--tint-violet-rgb),0.7)", color: "var(--text-2)" }}>{t}</span>
                    ))}
                  </div>

                  {/* Ingrédients + étapes */}
                  <div className="px-4 pt-2.5 pb-1 flex flex-col gap-2 overflow-y-auto flex-1" style={{ maxHeight: 190, minHeight: 64, scrollbarWidth: "none" }}>
                    {pendingRecipe.ingredients.length > 0 && (
                      <div className="flex flex-col gap-1">
                        {pendingRecipe.ingredients.map((ing, i) => (
                          <div key={i} className="flex items-center justify-between gap-3 py-1.5 px-3 rounded-xl"
                            style={{ background: "rgba(var(--tint-violet-rgb),0.45)" }}>
                            <span className="text-[13px] font-light truncate" style={{ color: "var(--text-1)" }}>{ing.nom}</span>
                            <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: "var(--exp-encre)" }}>{ing.quantite}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {pendingRecipe.steps.length > 0 && (
                      <ol className="flex flex-col gap-1.5 pl-1">
                        {pendingRecipe.steps.map((s, i) => (
                          <li key={i} className="flex gap-2 text-[13px] font-light leading-snug" style={{ color: "var(--text-2)" }}>
                            <span className="flex-shrink-0 font-bold" style={{ color: "var(--exp-encre)" }}>{i + 1}.</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {pendingRecipe.safetyNote && (
                      <p className="text-[11px] font-medium leading-snug px-3 py-2 rounded-xl"
                        style={{ background: "rgba(245,177,32,0.12)", color: "var(--text-2)" }}>
                        ⚠️ {pendingRecipe.safetyNote}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(var(--accent-rgb),0.10)" }}>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={cancelRecipe}
                      className="flex-1 py-2.5 text-[13px] font-semibold cursor-pointer"
                      style={{ borderRadius: "var(--r-controle)", background: "rgba(var(--accent-rgb),0.10)", color: "var(--text-2)" }}>
                      Fermer
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={confirmRecipe}
                      className="flex-1 py-2.5 text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                      style={{ borderRadius: "var(--r-controle)", background: "linear-gradient(135deg, var(--accent), var(--violet-mid))", color: "#fff", boxShadow: "var(--ombre-action)" }}>
                      <Check size={15} strokeWidth={2.4} /> Ajouter au repas
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* ── Carte REPAS (log) — estimation à valider, aucune écriture sans clic ── */}
              {pendingMeal && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="w-full overflow-hidden"
                  style={{ borderRadius: "var(--r-bloc)", background: "rgba(var(--surface-rgb),0.98)", border: "1px solid rgba(var(--accent-rgb),0.22)", boxShadow: "var(--ombre-pose)" }}>
                  <div className="flex items-center gap-3 px-4 pt-3.5 pb-3" style={{ borderBottom: "1px solid rgba(var(--accent-rgb),0.10)" }}>
                    <div className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                      style={{ borderRadius: "var(--r-controle)", background: "linear-gradient(135deg,#F5B120,#E8620C)" }}>
                      <Utensils size={16} strokeWidth={1.8} style={{ color: "#fff" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="vy-label" style={{ color: "var(--exp-encre)" }}>
                        Repas à noter · {MEAL_LABEL[pendingMeal.mealType] ?? "Repas"}
                      </p>
                      <p className="text-[16px] font-semibold leading-tight truncate" style={{ color: "var(--text-0)" }}>{pendingMeal.foodName}</p>
                    </div>
                  </div>

                  {/* Macros estimées */}
                  <div className="flex flex-wrap gap-1.5 px-4 pt-2.5 pb-1">
                    {[
                      `${pendingMeal.calories} kcal`,
                      `${pendingMeal.proteins} g prot.`,
                      `${pendingMeal.carbs} g gluc.`,
                      `${pendingMeal.fats} g lip.`,
                    ].map((t) => (
                      <span key={t} className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(var(--tint-violet-rgb),0.7)", color: "var(--text-2)" }}>{t}</span>
                    ))}
                  </div>

                  {pendingMeal.confidence === "low" && (
                    <p className="px-4 pt-1.5 text-[11px] font-light leading-snug" style={{ color: "var(--text-3)" }}>
                      Estimation approximative, tu pourras l&apos;ajuster dans Nutrition.
                    </p>
                  )}

                  <div className="flex gap-2 px-4 py-3 mt-1" style={{ borderTop: "1px solid rgba(var(--accent-rgb),0.10)" }}>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={cancelMeal}
                      className="flex-1 py-2.5 text-[13px] font-semibold cursor-pointer"
                      style={{ borderRadius: "var(--r-controle)", background: "rgba(var(--accent-rgb),0.10)", color: "var(--text-2)" }}>
                      Annuler
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={confirmMeal}
                      className="flex-1 py-2.5 text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                      style={{ borderRadius: "var(--r-controle)", background: "linear-gradient(135deg, var(--accent), var(--violet-mid))", color: "#fff", boxShadow: "var(--ombre-action)" }}>
                      <Check size={15} strokeWidth={2.4} /> Noter le repas
                    </motion.button>
                  </div>
                </motion.div>
              )}

            </div>

            {/* Input */}
            <div className="flex-shrink-0 px-3 pt-2"
              style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))", borderTop: "1px solid rgba(var(--accent-rgb),0.12)" }}>
              {/* Puce mémoire — « Je m'en souviendrai » */}
              <AnimatePresence>
                {memoryNotice && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    className="flex items-center gap-1.5 w-fit mx-auto mb-2 px-3 py-1.5 rounded-full text-[13px] font-medium"
                    style={{ background: "rgba(var(--accent-rgb),0.12)", color: "var(--exp-encre)", border: "1px solid rgba(var(--accent-rgb),0.22)" }}>
                    {memoryNotice}
                  </motion.div>
                )}
              </AnimatePresence>
              {voice.error && (
                <p className="text-[11px] text-center mb-1.5" style={{ color: "var(--exp-encre)" }}>{voice.error}</p>
              )}
              {messagesEpuises && quotaChat ? (
                <MessagesEpuises plafond={quotaChat.plafond} onPremium={() => { close(); router.push("/premium"); }} />
              ) : (
              <form onSubmit={submit} className="flex items-end gap-2">
                <div className="flex-1 flex items-center px-4 py-2 rounded-3xl"
                  style={{ background: "rgba(var(--tint-violet-rgb),0.5)", border: "1px solid rgba(var(--accent-rgb),0.18)" }}>
                  <textarea
                    ref={taRef}
                    rows={1}
                    value={input} onChange={(e) => ecrire(e.target.value)}
                    onKeyDown={(e) => {
                      // Entrée = envoyer ; Maj+Entrée = nouvelle ligne (pour se relire/corriger)
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e); }
                    }}
                    placeholder={voice.state === "recording" ? "Écoute en cours…"
                      : questionEnAttente ? "ou écris ta réponse…"
                      /* À quelqu'un, pas à une machine : « Pose ta question »
                         mettait la personne en position de demander. */
                      : guide ? `Écris à ${nomGuide(guide)}…`
                      : "Écris ton message…"}
                    disabled={isStreaming || voice.state !== "idle"}
                    className="flex-1 bg-transparent text-[16px] leading-relaxed outline-none disabled:opacity-60 resize-none py-1"
                    style={{ color: "var(--text-0)", maxHeight: 132 }}
                  />
                </div>

                {/* Micro */}
                <motion.button type="button" whileTap={{ scale: 0.92 }}
                  onClick={() => (voice.state === "recording" ? voice.stop() : voice.start())}
                  disabled={isStreaming || voice.state === "processing"}
                  className="w-11 h-11 flex items-center justify-center rounded-2xl flex-shrink-0 cursor-pointer"
                  style={voice.state === "recording"
                    ? { background: "linear-gradient(135deg, #FC8181, #F56565)" }
                    : { background: "rgba(var(--accent-rgb),0.12)" }}
                  aria-label={voice.state === "recording" ? "Arrêter" : "Parler"}>
                  {voice.state === "recording"
                    ? <Square size={15} strokeWidth={2.4} style={{ color: "#fff" }} />
                    : <Mic size={17} strokeWidth={2} style={{ color: "var(--exp-encre)" }} />}
                </motion.button>

                {/* Envoyer — au repos, le bouton reste PARFAITEMENT lisible :
                    une flèche violette sur fond pâle, exactement comme le micro
                    à côté. Avant, l'icône restait blanche et le fond s'effaçait
                    à 55 % d'opacité : on ne voyait plus rien, donc on ne savait
                    plus à quoi servait ce bouton. Ce n'est pas l'existence du
                    bouton qu'on estompe, c'est seulement son côté « prêt à
                    partir » (le violet plein) qui s'allume quand on a écrit. */}
                <motion.button type="submit" whileTap={canSend ? { scale: 0.92 } : {}}
                  disabled={!canSend}
                  className="w-11 h-11 flex items-center justify-center rounded-2xl flex-shrink-0 cursor-pointer"
                  style={canSend
                    ? { background: "linear-gradient(135deg, var(--accent), var(--violet-mid))" }
                    : { background: "rgba(var(--accent-rgb),0.12)", border: "1px solid rgba(var(--accent-rgb),0.22)" }}
                  aria-label="Envoyer">
                  <Send size={15} strokeWidth={2.2} style={{ color: canSend ? "#fff" : "var(--accent)" }} />
                </motion.button>
              </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* Les messages du jour sont épuisés : la saisie disparaît, à la façon des
   autres assistants, et une petite bannière Vaiiya+ mène à la page Premium.
   Tant que la vente est fermée, la page dit elle-même « Bientôt disponible » :
   la bannière y mène quand même (décision de Louis, 2026-09-24), pour qu'on
   puisse voir ce que Vaiiya+ contient. */
function MessagesEpuises({ plafond, onPremium }: { plafond: number; onPremium: () => void }) {
  const banniere = (
    <>
      <span aria-hidden style={{ color: "var(--gold)" }}>✦</span>
      <span className="font-extrabold" style={{ color: "var(--or-encre)" }}>Vaiiya+</span>
      <span className="flex-1 min-w-0 truncate" style={{ color: "var(--text-2)" }}>Le coach sans limite</span>
      {VENTE_OUVERTE
        ? <span className="font-bold flex-shrink-0" style={{ color: "var(--exp-encre)" }}>Découvrir ›</span>
        : <span className="font-bold flex-shrink-0 flex items-center gap-1" style={{ color: "var(--or-encre)" }}>
            <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(var(--gold-rgb),0.14)" }}>Bientôt</span>
            <span aria-hidden>›</span>
          </span>}
    </>
  );
  return (
    <div className="px-1 pb-1">
      <p className="text-[16px] font-semibold text-center" style={{ color: "var(--text-0)" }}>
        Tu as utilisé tes {plafond} messages du jour
      </p>
      <p className="text-[13px] text-center mt-0.5" style={{ color: "var(--text-3)" }}>
        Ils reviennent demain, à minuit.
      </p>
      <button type="button" onClick={onPremium}
        className="w-full mt-3 flex items-center gap-2 px-3.5 py-2.5 text-[13px] cursor-pointer text-left"
        style={{ borderRadius: "var(--r-controle)", border: "1px solid rgba(var(--gold-rgb),0.45)", background: "rgba(var(--gold-rgb),0.07)" }}
        aria-label="Découvrir Vaiiya+">
        {banniere}
      </button>
    </div>
  );
}

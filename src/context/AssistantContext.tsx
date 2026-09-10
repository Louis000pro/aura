"use client";

/* ════════════════════════════════════════════════════════════════════
   AssistantContext — LE cerveau unique de l'assistant Vaiiya.

   Un seul moteur, monté globalement (layout), exposé partout via
   useAssistant(). L'orbe de navigation (NavOrb) l'ouvre ; le bottom
   sheet (AssistantSheet) l'affiche. Il connaît la PAGE COURANTE et
   sait orienter (tag [NAV] → navigation réelle).

   v1 = ORIENTATION (lecture + navigation). Les tags d'écriture
   ([PROGRAMME_UPDATE], [LIEU_UPDATE]) sont nettoyés de l'affichage mais
   PAS appliqués ici (ils restent gérés par la page coach historique).
   ════════════════════════════════════════════════════════════════════ */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { aiFetch, messageDeRefus } from "@/lib/aiFetch";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase";
import { goalsFromRow } from "@/lib/nutritionGoals";
import { resolveNavTarget } from "@/lib/siteKnowledge";
import { normalizeForDedupe, stripMemoryTags, normalizeCategory, type AiMemory } from "@/lib/aiMemory";
import { setThemePreference, type ThemePreference } from "@/hooks/useTheme";
import { assembleSeance, seanceToRow, normalizeCategory as normalizeWorkoutCategory, normalizeDifficulty, levelToDifficulty, type ProposedSeance } from "@/lib/assistantActions";
import { normaliserChoix, type AssistantAction, type ChatEvent, type QuestionCliquable } from "@/lib/assistantTools";
import { voix, voixAction, CHOIX_LIEU, CHOIX_EQUIP, CHOIX_PORTEE, type EtatGuide, type GuideRef, type TonGuide } from "@/lib/guides";
import { useGuideActif } from "@/context/GuideContext";
import { PLANS } from "@/lib/plans";
import {
  /* ⚠️ `saveDay` A DISPARU DE CETTE LISTE EN V9C, ET C'EST LE POINT.
     `confirmSeance` était le dernier écrivain caché du contexte : il
     appelait l'autorité d'écriture directement, donc il décidait seul
     quelle ligne du jour serait réécrite. Tout passe désormais par
     `appliquerGeste`. Un `saveDay` qui réapparaîtrait ici, c'est
     `confirmPlan` qui a simplement changé d'adresse. */
  resolveWhen, dayLabel, dayLabelLong, dayTitle, lireJour, lireIntention, fetchRange, hasSeance, prochainsJours,
  principale, cibleRemplacable, estMobilier, vientDuProgramme,
  ctxFromLieu, readLieu, loadLieu, persistLieu, readVariant, weekDates, todayYmd, normalizeExercises, previewWeek,
  type CycleSemaine,
  PLANNING_TYPE_BY_CATEGORY, type PlanningDay, type GenInput,
} from "@/lib/planning";
import {
  appliquerGeste, consequenceDeplacement, consequencePose, consequenceRetrait, consequenceSaut,
  consequenceSemaine, consequenceSubstitution, consequenceSupplement,
  resoudreCibles, type EtapeNommee, type GestePlanning,
} from "@/lib/gestePlanning";
import { viserEtape, type ResultatVisee } from "@/lib/etapeCiblee";
import {
  contenuParRef, libelleContenu, resoudreSeanceNommee,
  type ContenuNomme, type ForceNom,
} from "@/lib/contenuNomme";
import { lireProgrammeActif } from "@/lib/programme";
import { adaptationDuJour, idsMasques } from "@/lib/adaptation";
import { etatMoteur, resumeMoteur } from "@/lib/guideMoteur";
import {
  etatNutrition, repasFrais, semaineFraiche, signalerRepas,
  type JourNutrition, type RepasDetail,
} from "@/lib/guideNutrition";
import { localDateStr } from "@/lib/dates";

type MemoryAction =
  | { type: "save"; category?: string; fact?: string }
  | { type: "forget"; keywords?: string }
  | { type: "none" };

/* ── Filet anti-balises ──────────────────────────────────────────────
   Le coach n'a plus aucun outil : c'est l'aiguilleur qui décide, et la carte
   s'affiche toute seule. Sauf qu'un modèle à qui on décrit une carte finit
   par essayer de l'invoquer avec un mot-clé qu'il invente. Signalé par Louis
   le 2026-07-30 : « Je prépare une séance pecs […] [CARTE]Séance Pectoraux -
   Débutant[/CARTE] » — du code au milieu d'une conversation.

   La cause est traitée dans le prompt (plus aucune grammaire à crochets
   enseignée au coach), ceci est le filet : on ne peut pas lister à l'avance
   les balises qu'un modèle inventera, donc on les enlève toutes. Le motif est
   volontairement étroit — MAJUSCULES, chiffres et tirets bas uniquement — pour
   ne jamais toucher à une vraie phrase entre crochets. */
const BALISE = /\[\/?[A-Z][A-Z0-9_]{1,23}\]/g;
/** Coupe une balise en cours de frappe (« …prépare ça [CAR ») pendant le flux. */
const BALISE_EN_COURS = /\[\/?[A-Z][A-Z0-9_]*$/;

function sansBalises(texte: string): string {
  return texte.replace(BALISE, "").replace(/[ \t]{2,}/g, " ");
}

/** Clés d'objectif (onboarding) → libellés compris par le générateur. */
const GOAL_LABELS: Record<string, string> = {
  masse: "prise de masse", prise_de_masse: "prise de masse",
  poids: "perte de poids", perte_de_poids: "perte de poids",
  force: "force", endurance: "endurance",
  sante: "santé générale", sante_generale: "santé générale",
  souplesse: "souplesse",
};

/** Recette proposée par l'IA, en attente d'ajout aux repas du jour. */
export type PendingRecipe = {
  nom: string;
  portions: number;
  prepMin: number;
  cookMin: number;
  difficulty: string;
  ingredients: { nom: string; quantite: string }[];
  steps: string[];
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  safetyNote?: string;
};

/** Repas décrit par l'utilisateur, estimé, en attente d'ajout au journal. */
export type PendingMeal = {
  foodName: string;
  mealType: string; // petit-dejeuner | dejeuner | gouter | diner
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  confidence?: string;
};

/** Changement de planning proposé par l'IA, en attente de confirmation.
 *  `kicker`/`meta`/`cta` sont ce que la carte AFFICHE : ils sont composés ici,
 *  au moment où on connaît le jour visé et ce qu'on va écraser. La carte, elle,
 *  ne devine rien (elle ne saurait pas dire « à la place de Jambes »). */
type PendingPlan = {
  kicker: string;           // le jour visé, et ce qu'on y remplace
  title: string;            // titre de la carte (nom de la séance ou jour déplacé)
  meta: string;             // « Force · 5 mouvements · en salle »
  cta: string;              // « Remplacer jeudi »
  /**
   * V9B · CE QUI SERA ÉCRIT, DÉCLARÉ AU MOMENT OÙ LA CARTE S'AFFICHE.
   *
   * ⚠️ C'ÉTAIT UNE LISTE DE JOURS À ÉCRIRE PLUS UNE LISTE DE JOURS À
   * LIBÉRER, ET `confirmPlan` DÉCIDAIT DU RESTE. C'est ce qui a laissé
   * passer les deux défauts de cette vague : `plan_set` ne disait pas
   * quelle ligne il visait (donc la base choisissait, et elle choisissait
   * justement la réservation d'étape), et la libération de « refais ma
   * semaine » emportait tout ce qui était prévu. Un geste nommé, avec son
   * identité et sa portée, ne peut plus vouloir dire autre chose à
   * l'écriture qu'à l'affichage.
   */
  geste: GestePlanning;
  /**
   * Ce que ça change pour le programme, en toutes lettres, AVANT le clic.
   * Composée par le CODE (`gestePlanning`), jamais par le modèle : le
   * coach n'a plus d'outils depuis juillet et ne voit pas ce qu'on écrit,
   * donc le laisser décrire l'effet d'un geste, ce serait lui faire
   * promettre ce qu'il ne peut pas savoir.
   */
  consequence: string;
  /** Jour de départ d'un déplacement : c'est lui que le kicker nomme. */
  depuis?: string;
  preview: PlanningDay | null; // jour dont on prévisualise les exercices
  /** Le jour visé peut-il être changé depuis la carte ? (faux pour la semaine entière) */
  retargetable?: boolean;
  /** Cette séance peut-elle rejoindre la bibliothèque en plus du planning ? */
  gardable?: boolean;
  /**
   * V9C · CE GESTE EST UN SUPPLÉMENT, ET IL LE RESTE MÊME EN CHANGEANT DE
   * JOUR.
   *
   * ⚠️ SANS CE DRAPEAU, CHANGER LE JOUR D'UN SUPPLÉMENT LE TRANSFORMERAIT
   * EN REMPLACEMENT. `recalerCarte` relit la journée d'arrivée et bascule
   * sur « remplacer » dès qu'elle y trouve une cible : c'est juste pour
   * `plan_set`, et c'est exactement ce qu'un supplément ne doit jamais
   * faire (« ne passe jamais par `cibleRemplacable` »).
   */
  forcerAjout?: boolean;
  /**
   * V9C · LA SUBSTITUTION, ET SA SECONDE SORTIE.
   *
   * ⚠️ « EN PLUS, SANS TOUCHER À PULL » N'EST PAS UNE POLITESSE : c'est la
   * décision 1 de V9, verrouillée avant le code. « Autre chose que X »
   * propose une substitution PAR DÉFAUT, jamais un saut, et la carte offre
   * l'autre lecture en toutes lettres. On garde donc de quoi recomposer
   * les deux faces sans rien relire : la bascule est un choix d'affichage,
   * pas une seconde lecture de la base.
   */
  substitution?: {
    etapeNom: string;
    apresNom: string | null;
    /** L'intention telle qu'elle s'écrirait EN SUBSTITUTION (avec son étape). */
    jour: PlanningDay;
  };
};

/** Un jour proposé dans le choix « quand ? » d'une carte. */
export type JourDispo = { ymd: string; label: string; occupe?: string | null; bloque?: boolean };

/** Ce que le Guide peut être en train de préparer. Les trois actions qui
 *  font patienter, et rien d'autre : la bulle d'attente doit nommer ce
 *  qu'elle attend. */
export type AttenteAction = "seance" | "recette" | "repas";

export type AssistantMsg = {
  role: "user" | "assistant";
  content: string;
  id: string;
  streaming?: boolean;
  /** Question à choix cliquables posée sous cette bulle. */
  question?: QuestionCliquable;
  /** Message envoyé au coach mais PAS affiché : la réponse à une question
   *  cliquable est déjà visible sous la forme de la puce cochée, l'écrire une
   *  seconde fois en bulle utilisateur dirait deux fois la même chose. */
  masque?: boolean;
  /** Ce que le Guide FAIT en disant cette bulle : il écoute (il vient de
   *  poser une question) ou il explique (il répond, il annonce une carte).
   *  C'est le visage que porte son avatar à côté du message.
   *
   *  ⚠️ ÉCRIT ICI, À LA CRÉATION, ET JAMAIS DEVINÉ APRÈS COUP. Chaque
   *  endroit qui pousse une bulle sait exactement pourquoi il la pousse ;
   *  relire le texte pour retrouver cette intention (chercher un point
   *  d'interrogation, un mot d'encouragement) serait faux dès la première
   *  question rhétorique du modèle. */
  ton?: TonGuide;
};

interface UserContext {
  pseudo?: string; age?: string; height?: string; weight?: string;
  gender?: string; goals?: string[]; level?: string; sessionsPerWeek?: string;
  mealsPerDay?: string; diet?: string; skipped?: boolean;
}
interface LiveStats {
  calories?: number; calorieGoal?: number; proteins?: number; proteinGoal?: number; streak?: number;
  lastWeight?: number; recentSessions?: string[];
}

type AssistantContextValue = {
  isOpen: boolean;
  open: (prefill?: string) => void;
  close: () => void;
  toggle: () => void;
  clear: () => void;
  messages: AssistantMsg[];
  isStreaming: boolean;
  sendMessage: (text: string) => void;
  /** Réponse à une question cliquable (clic sur une puce). */
  repondreQuestion: (msgId: string, choix: string) => void;
  pseudo?: string;
  memoryNotice: string | null;
  pendingSeance: ProposedSeance | null;
  pendingPlan: PendingPlan | null;
  pendingRecipe: PendingRecipe | null;
  pendingMeal: PendingMeal | null;
  /** Ce que le Guide prépare en ce moment, ou `null`. */
  actionLoading: AttenteAction | null;
  /** Le visage que porte le Guide à l'instant, déduit des seuls signaux
   *  structurés de la conversation. Voir `EtatGuide` dans `guides.ts`. */
  etatGuide: EtatGuide;
  /** La feuille signale qu'un message est en cours d'écriture : le Guide
   *  écoute. Elle seule voit le champ de saisie, d'où ce passe-plat. */
  noterSaisie: (actif: boolean) => void;
  /** Le stock gratuit de séances gardées est plein : la carte n'offre alors que ce qui reste possible. */
  bibliothequePleine: boolean;
  /** Garde la séance proposée. `jour` la pose aussi sur le planning, en UNE
   *  validation : le jour se choisit maintenant AVANT de valider, plus après. */
  confirmSeance: (jour?: string | null) => void;
  /** Range une séance proposée dans la bibliothèque (aussi utilisé APRÈS une séance lancée sans l'avoir gardée). */
  garderSeance: (s: ProposedSeance) => Promise<boolean>;
  cancelSeance: () => void;
  confirmPlan: (garderAussi?: boolean) => void;
  /** V9C · bascule une substitution en supplément, et inversement. */
  basculerEnPlus: () => void;
  /** Change le jour visé par la carte planning (mêmes exercices, autre date). */
  retargetPlan: (ymd: string) => void;
  cancelPlan: () => void;
  /** Les 7 prochains jours avec ce qui y est déjà prévu (choix « quand ? »). */
  chargerJours: () => Promise<JourDispo[]>;
  confirmRecipe: () => void;
  cancelRecipe: () => void;
  confirmMeal: () => void;
  cancelMeal: () => void;
};

const Ctx = createContext<AssistantContextValue | null>(null);

export function useAssistant(): AssistantContextValue {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAssistant doit être utilisé dans <AssistantProvider>");
  return c;
}

let _counter = 0;
const uid = () => `${Date.now()}-${++_counter}`;
/* ⚠️ Le jour du journal alimentaire se calcule en heure LOCALE, jamais en
   UTC. C'est la convention documentée des colonnes `date` de
   `nutrition_logs` (`src/lib/dates.ts`) et c'est ce que l'écran Nutrition
   écrit. Il y avait ici un `new Date().toISOString().slice(0, 10)` : entre
   minuit et 2 h du matin en France, le Guide interrogeait donc la veille et
   ne voyait aucun des repas que l'écran affichait. */
const jourDuJournal = () => localDateStr();

const CAP = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** « aujourd'hui », « demain », sinon le jour de la semaine (« jeudi »).
 *  Sert au libellé du bouton, qui doit tenir sur une ligne. */
function jourCourt(date: string): string {
  if (date === todayYmd()) return "aujourd’hui";
  if (date === resolveWhen("demain")) return "demain";
  return dayLabel(date).toLowerCase();
}

/** Lieu d'un jour de planning, en français lisible. */
const LIEU_LABEL: Record<string, string> = {
  salle: "en salle",
  halteres: "à la maison, haltères",
  poids: "au poids du corps",
};

/** Ce que la carte planning affiche. Composé ICI, où l'on sait quel jour est
 *  visé et ce qu'il portait déjà : la carte, elle, n'a aucun moyen de deviner
 *  « à la place de Jambes ». Nommer ce qu'on écrase AVANT le clic, c'est la
 *  même règle que « rien ne s'écrit sans validation ». */
function texteCartePlan(jour: PlanningDay, remplace: string | null, verbe = "Programmer") {
  return {
    kicker: CAP(dayLabelLong(jour.date)) + (remplace ? ` · à la place de « ${remplace} »` : ""),
    meta: [jour.type, `${jour.exerciseList.length} mouvements`, LIEU_LABEL[jour.location ?? ""] ?? ""]
      .filter(Boolean).join(" · "),
    cta: `${remplace ? "Remplacer" : verbe} ${jourCourt(jour.date)}`,
  };
}

/**
 * Le verbe d'une pose : on REMPLACE ce qu'on réécrit, on AJOUTE à côté de
 * ce qui reste, on PROGRAMME une journée vide.
 *
 * ⚠️ « Programmer vendredi » SUR UN JOUR DÉJÀ OCCUPÉ NE DIT PAS CE QUI SE
 * PASSE. Le bouton doit annoncer le geste exact, sinon la ligne de
 * conséquence est le seul endroit qui dit la vérité, et elle est plus
 * petite que le bouton.
 */
function verbePose(gardee: PlanningDay | null | undefined): string {
  return gardee ? "Ajouter" : "Programmer";
}

/**
 * V9B · RECOMPOSE UNE CARTE QUI CHANGE DE JOUR.
 *
 * ⚠️ CHANGER LE JOUR D'UNE POSE CHANGE LA LIGNE QU'ELLE VISE, et l'ancienne
 * version l'ignorait : elle déplaçait les dates à écrire, laissait le
 * « à la place de » vide, et l'identité de la cible se décidait à
 * l'écriture. Ici la carte redemande la journée d'arrivée, donc elle
 * nomme ce qu'elle y remplace et déclare l'identité qu'elle écrira.
 *
 * `connu` dit si la journée d'arrivée a vraiment été relue. Tant qu'elle ne
 * l'est pas, on ne prétend rien : la conséquence est vide (donc pas
 * affichée) et le geste retombe sur l'AJOUT, qui ne détruit rien.
 */
function recalerCarte(
  p: PendingPlan,
  ymd: string,
  cible: PlanningDay | null,
  gardee: PlanningDay | null,
  connu: boolean,
): PendingPlan {
  if (p.geste.type === "deplacer") {
    /* Un déplacement vise une ligne par son `id` : changer la destination
       ne change pas ce qu'on déplace, donc rien à re-résoudre. */
    const jour = { ...p.geste.jour, date: ymd };
    return {
      ...p,
      ...texteCartePlan(jour, null, "Déplacer vers"),
      kicker: `${p.depuis ? CAP(dayLabelLong(p.depuis)) + " → " : ""}${dayLabelLong(ymd)}`,
      geste: { type: "deplacer", jour },
      preview: jour,
    };
  }
  /* V9C · UNE SUBSTITUTION CHANGE DE JOUR SANS CHANGER D'IDENTITÉ. Elle
     vise une ÉTAPE, pas une ligne de la journée d'arrivée : il n'y a donc
     aucune cible à re-résoudre, et son `id` (la réservation reprise) ne
     bouge pas non plus. Seule la date change, exactement comme pour un
     déplacement. */
  if (p.geste.type === "substituer") {
    const jour = { ...p.geste.jour, date: ymd };
    return {
      ...p,
      ...texteCartePlan(jour, null, "Faire à la place"),
      kicker: p.kicker,
      geste: { type: "substituer", jour },
      substitution: p.substitution ? { ...p.substitution, jour } : undefined,
      preview: jour,
    };
  }
  if (p.geste.type === "remplacer" || p.geste.type === "ajouter") {
    /* ⚠️ UN SUPPLÉMENT RESTE UN SUPPLÉMENT. Sans ce garde, changer le jour
       d'un « en plus » le ferait passer par `cibleRemplacable` et écraser
       la séance déjà posée là-bas : le geste dirait une chose sur la
       carte et en ferait une autre au clic. */
    const vise = p.forcerAjout ? null : cible;
    const jour = { ...p.geste.jour, date: ymd, id: vise?.id ?? null };
    return {
      ...p,
      ...texteCartePlan(jour, vise ? dayTitle(vise) : null, p.forcerAjout ? "Ajouter" : verbePose(gardee)),
      geste: vise ? { type: "remplacer", jour } : { type: "ajouter", jour },
      consequence: p.forcerAjout
        ? consequenceSupplement(p.substitution?.etapeNom ?? null)
        : connu ? consequencePose(vise, gardee) : "",
      /* La face « à la place » suit la même date, sinon revenir dessus
         reproposerait le jour d'avant sans le dire. */
      substitution: p.substitution
        ? { ...p.substitution, jour: { ...p.substitution.jour, date: ymd } }
        : undefined,
      preview: jour,
    };
  }
  return p;
}

/** Normalise un moment de repas vers les 4 valeurs canoniques du journal. */
function normalizeMealType(raw?: string): string {
  const t = (raw || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/petit|matin|breakfast/.test(t)) return "petit-dejeuner";
  if (/dejeun|midi|lunch/.test(t)) return "dejeuner";
  if (/gout|collation|snack/.test(t)) return "gouter";
  if (/diner|soir|dinner/.test(t)) return "diner";
  return "";
}
/** Repas le plus probable selon l'heure (repli quand le moment n'est pas dit). */
function mealTypeFromHour(h = new Date().getHours()): string {
  return h < 10 ? "petit-dejeuner" : h < 15 ? "dejeuner" : h < 18 ? "gouter" : "diner";
}

/** Garde-fou anti-faux-positif du thème. Le petit modèle d'analyse hallucinait
 *  parfois l'intention set_theme sur un message sans rapport → l'app basculait
 *  en sombre « sans raison ». On n'applique le thème QUE si le message parle
 *  vraiment de l'apparence (thème/mode/sombre/clair/luminosité/yeux/écran). */
function textMentionsTheme(text: string): boolean {
  const t = (text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return /(theme|mode\s*(?:sombre|clair|nuit|jour|noir|blanc|auto)|\bsombre\b|\bclair\b|\bnuit\b|dark\s*mode|night\s*mode|apparence|affichage|luminos|eblou|trop\s*(?:blanc|lumineu|clair|brillant|vif)|mal\s*aux\s*yeux|\becran\b|\bfond\b\s*(?:noir|blanc|sombre|clair))/.test(t);
}

/* ═══════════════ V9C bis · LE CONTENU QU'ON A NOMMÉ ═══════════════

   ⚠️ TROIS SOURCES AUTORISÉES, ET AUCUNE GÉNÉRATION LIBRE : le catalogue
   Vaiiya, la bibliothèque, une séance perso (décision 5 de V9). Une
   quatrième est explicitement refusée : UNE AUTRE ÉTAPE DU CYCLE. Elle
   ouvrirait une ambiguïté sur son propre tour futur (l'a-t-on avancée ?
   la refera-t-on ?), et c'est hors périmètre.

   ⚠️ ET LA RECONNAISSANCE A QUITTÉ CE FICHIER (V9C bis). Elle vivait ici,
   donc elle ne servait qu'à la substitution : `plan_set` continuait de
   GÉNÉRER une séance neuve quand on lui nommait « Express 12 ». Trois
   gestes en ont besoin, ils partagent donc une seule autorité,
   `contenuNomme`, qui décide aussi ce qu'on fait d'un nom ambigu.

   ⚠️ ON NE DEVINE PAS UN CONTENU. Si la demande ne nomme rien qu'on
   retrouve, on le DIT et on demande le nom : inventer une séance ici,
   ce serait la génération libre qu'on vient de s'interdire. */

/** Ce que le Guide répond quand une étape ne peut pas être visée.
 *
 *  ⚠️ CHAQUE REFUS A SA PHRASE, ET AUCUN N'EST MUET. Un `return` nu ici,
 *  ce serait une demande sans réponse, exactement ce que V9B a passé une
 *  vague à fermer. Et le refus « masquée » propose une SORTIE : c'est
 *  l'adaptation qui bloque, elle se gère dans son écran. */
function phraseRefus(guide: GuideRef, res: Extract<ResultatVisee, { ok: false }>): string {
  switch (res.refus) {
    case "aucun_programme": return voix(guide, "impasse.etape_sans_programme");
    case "illisible":       return voix(guide, "impasse.etape_illisible");
    case "introuvable":     return voix(guide, "impasse.etape_introuvable", { titre: res.nom ?? "" });
    case "deja_resolue":    return voix(guide, "impasse.etape_deja_resolue", { titre: res.nom ?? "" });
    case "masquee":         return voix(guide, "impasse.etape_masquee", { titre: res.nom ?? "", jour: res.jusquau ?? "" });
    case "pas_la_prochaine":
      return voix(guide, "impasse.etape_pas_la_prochaine", { titre: res.nom ?? "", etape: res.proposable ?? "" });
  }
}

/* Au-delà de cette absence (app en arrière-plan / onglet en veille), revenir
   dans l'app rouvre un chat vierge. sessionStorage gère déjà les vraies
   fermetures ; ce filet couvre les PWA qui restent chaudes. */
const IDLE_RESET_MS = 30 * 60 * 1000; // 30 min

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMsg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [memoryNotice, setMemoryNotice] = useState<string | null>(null);
  const [pendingSeance, setPendingSeance] = useState<ProposedSeance | null>(null);
  const [pendingPlan, setPendingPlan] = useState<PendingPlan | null>(null);
  const [pendingRecipe, setPendingRecipe] = useState<PendingRecipe | null>(null);
  const [pendingMeal, setPendingMeal] = useState<PendingMeal | null>(null);
  /* Ce que le Guide est en train de préparer, ou `null`. Ce n'est plus un
     booléen : la bulle d'attente annonçait « une séance » aux TROIS actions
     qui font patienter, donc elle promettait une séance à quelqu'un qui
     venait de raconter son déjeuner. */
  const [actionLoading, setActionLoading] = useState<AttenteAction | null>(null);
  /* Une action validée vient d'aboutir. Compteur et pas booléen : deux
     réussites de suite doivent relancer le délai, pas se partager le premier
     minuteur. Il ne sert qu'au visage du Guide, jamais à une écriture. */
  const [reussite, setReussite] = useState(0);
  /* La personne est en train d'écrire un message. Signal envoyé par la feuille
     (elle seule voit le champ), et pas une devinette : c'est vrai quand le
     brouillon n'est pas vide, faux sinon. Il ne sert qu'au visage du Guide. */
  const [saisie, setSaisie] = useState(false);
  /* Le stock gratuit de séances gardées est plein ? La carte le dit AVANT le
     clic et ne propose alors que ce qui reste possible (s'entraîner). On ne
     limite jamais le fait de créer ni de s'entraîner, seulement le rangement. */
  const [bibliothequePleine, setBibliothequePleine] = useState(false);

  /* ── Le Guide qui parle ──────────────────────────────────────────────
     Toutes les phrases de l'assistant passent par `voix()` / `voixAction()`
     (src/lib/guides.ts), et depuis le 2026-08-19 elles ont une variante
     Nora et une variante Sasha.

     ⚠️ LU DANS UNE RÉF, PAS DIRECTEMENT DANS LES CALLBACKS, et ce n'est pas
     de la paresse. Une vingtaine de `useCallback` d'ici prononcent une
     phrase ; passer `guide` en dépendance les recréerait tous à chaque
     changement de Guide, et surtout il suffirait d'en oublier un pour
     qu'une phrase reste figée sur l'ancien Guide, sans erreur ni symptôme.
     Une réf lue au moment où l'on parle ne peut pas se désynchroniser.
     C'est le même motif que `liveStatsRef` juste en dessous. */
  const { guide } = useGuideActif();
  const guideRef = useRef<GuideRef>(guide);
  // Écrit dans un effet, jamais pendant le rendu : un rendu concurrent peut
  // être abandonné, et une réf écrite dans un rendu jeté est une valeur
  // fantôme.
  useEffect(() => { guideRef.current = guide; }, [guide]);

  const userContextRef = useRef<UserContext | null>(null);
  const liveStatsRef = useRef<LiveStats | null>(null);
  const richProfileRef = useRef<Record<string, unknown> | null>(null);
  const memoriesRef = useRef<AiMemory[]>([]);
  const dataLoadedRef = useRef(false);
  /* Le chargement du contexte est PARTAGÉ, pas seulement marqué comme
     démarré. `open()` le lance, `sendMessage` l'attend : sans cette
     promesse, le second appel voyait `dataLoadedRef` déjà vrai et repartait
     aussitôt, donc le premier message pouvait partir avec un contexte
     encore nul. Même procédé que `marquerPresence`. */
  const chargementRef = useRef<Promise<void> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* Changer de compte remet le contexte à zéro. Sans ça, les deux repères
     ci-dessus resteraient posés et le nouveau compte hériterait du profil,
     des repas et des souvenirs du précédent. */
  useEffect(() => {
    dataLoadedRef.current = false;
    chargementRef.current = null;
  }, [user?.id]);

  /* La demande mise en attente parce qu'il nous manquait le lieu. Elle repart
     dès qu'on l'apprend, PAR N'IMPORTE QUEL CHEMIN : la puce touchée, mais
     aussi la réponse tapée à la main (outil save_lieu). C'était le trou : on
     enregistrait le lieu, on disait « c'est noté », et il fallait redemander
     sa séance. Vu de l'utilisateur, la première demande ne donnait jamais de
     carte. */
  const attenteRef = useRef<string | null>(null);
  /* `sendMessage` est défini plus bas ; `runAction` doit pouvoir relancer une
     demande. Un ref évite de tout réordonner (et la boucle de dépendances). */
  const sendRef = useRef<((text: string, masque?: boolean) => void) | null>(null);

  /* Le lieu vit dans le localStorage (lecture synchrone) mais la source
     durable, c'est la base. Sans cette hydratation, un appareil neuf, un
     stockage vidé ou un navigateur privé refaisait poser la question alors
     qu'on connaît déjà la réponse — et seul /progression hydratait. */
  useEffect(() => {
    if (!user?.id) return;
    void loadLieu(user.id);
  }, [user?.id]);

  /* ── Historique de SESSION (par utilisateur) ──
     Le fil de conversation ne vit QUE le temps de la session : il est rangé
     dans sessionStorage (et non localStorage) → fermer puis rouvrir l'app =
     chat vierge, plus jamais un mur de messages d'il y a un mois. On estampille
     le fil pour aussi repartir à zéro quand on revient après une longue absence
     (PWA restée chaude). La mémoire long terme (ai_memories, Supabase) n'est
     JAMAIS concernée. */
  const historyKey = user?.id ? `aura_coach_history_${user.id}` : null;

  const readHistory = useCallback((): AssistantMsg[] => {
    if (!historyKey || typeof window === "undefined") return [];
    // Purge de l'ancien historique PERSISTANT (localStorage) des versions
    // précédentes — sinon un vieux fil ressort à la première ouverture.
    try { localStorage.removeItem(historyKey); } catch { /* ignore */ }
    try {
      const raw = sessionStorage.getItem(historyKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as { ts?: number; msgs?: AssistantMsg[] };
      if (!parsed || (parsed.ts != null && Date.now() - parsed.ts > IDLE_RESET_MS)) {
        try { sessionStorage.removeItem(historyKey); } catch { /* ignore */ }
        return [];
      }
      return Array.isArray(parsed.msgs) ? parsed.msgs : [];
    } catch { return []; }
  }, [historyKey]);

  useEffect(() => { setMessages(readHistory()); }, [readHistory]);

  const persist = useCallback((msgs: AssistantMsg[]) => {
    if (!historyKey || typeof window === "undefined") return;
    try {
      const clean = msgs.slice(-60).map((m) => ({ ...m, streaming: false }));
      sessionStorage.setItem(historyKey, JSON.stringify({ ts: Date.now(), msgs: clean }));
    } catch { /* ignore */ }
  }, [historyKey]);

  // Retour dans l'app (onglet ré-affiché) après une longue absence → si le
  // dernier message dépasse IDLE_RESET_MS, on rouvre sur un chat vierge. Ne
  // touche à rien tant que le fil est frais (pas d'écrasement d'une conversation
  // en cours).
  useEffect(() => {
    if (!historyKey || typeof window === "undefined") return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      try {
        const raw = sessionStorage.getItem(historyKey);
        if (!raw) return;
        const parsed = JSON.parse(raw) as { ts?: number };
        if (parsed?.ts != null && Date.now() - parsed.ts > IDLE_RESET_MS) {
          try { sessionStorage.removeItem(historyKey); } catch { /* ignore */ }
          setMessages([]);
        }
      } catch { /* ignore */ }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [historyKey]);

  /* ── Collecte du contexte utilisateur (LAZY : au 1er besoin seulement) ── */
  const ensureContext = useCallback(async () => {
    if (dataLoadedRef.current || !user?.id) return;
    dataLoadedRef.current = true;
    const supabase = createClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_age, onboarding_height, onboarding_weight, onboarding_gender, onboarding_goals, onboarding_level, onboarding_sessions_week, onboarding_meals_day, onboarding_diet")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && (profile.onboarding_age || profile.onboarding_weight || profile.onboarding_level)) {
      userContextRef.current = {
        pseudo: user.pseudo,
        age: profile.onboarding_age?.toString(),
        height: profile.onboarding_height?.toString(),
        weight: profile.onboarding_weight?.toString(),
        gender: profile.onboarding_gender,
        goals: profile.onboarding_goals ?? [],
        level: profile.onboarding_level,
        sessionsPerWeek: profile.onboarding_sessions_week?.toString(),
        mealsPerDay: profile.onboarding_meals_day?.toString(),
        diet: profile.onboarding_diet,
      };
    } else {
      userContextRef.current = { pseudo: user.pseudo, skipped: true };
    }

    const today = jourDuJournal();
    // Cette fenêtre se compare à la colonne `date` (jour local) : elle se
    // calcule dans le même repère. `thirtyDaysAgo` ci-dessous vise
    // `started_at`, un horodatage : là, UTC est le bon repère.
    const sevenDaysAgo = localDateStr(new Date(Date.now() - 7 * 86400_000));
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

    const [nutritionTodayRes, nutritionWeekRes, sessionsRes, weightHistoryRes, followersRes, followingRes, postsRes, profileBioRes, memoriesRes] = await Promise.all([
      supabase.from("nutrition_logs").select("calories, proteins").eq("user_id", user.id).eq("date", today),
      supabase.from("nutrition_logs").select("date, meal_type, food_name, calories, proteins, carbs, fats, time, description").eq("user_id", user.id).gte("date", sevenDaysAgo).order("date", { ascending: false }).order("time", { ascending: true }),
      supabase.from("workout_sessions").select("title, started_at, duration_minutes, calories_burned, exercises").eq("user_id", user.id).gte("started_at", thirtyDaysAgo).order("started_at", { ascending: false }).limit(15),
      supabase.from("weight_logs").select("weight_kg, date").eq("user_id", user.id).order("date", { ascending: false }).limit(10),
      supabase.from("followers").select("follower_id", { count: "exact", head: true }).eq("following_id", user.id),
      supabase.from("followers").select("following_id", { count: "exact", head: true }).eq("follower_id", user.id),
      supabase.from("posts").select("type, caption, performance_data, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("profiles").select("bio, full_name").eq("id", user.id).maybeSingle(),
      supabase.from("ai_memories").select("id, content, category, source, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(60),
    ]);

    const nutritionRows = nutritionTodayRes.data ?? [];
    const totalCalories = nutritionRows.reduce((s: number, r: { calories: number }) => s + (r.calories ?? 0), 0);
    const totalProteins = nutritionRows.reduce((s: number, r: { proteins: number }) => s + (r.proteins ?? 0), 0);

    const sessionRows = sessionsRes.data ?? [];
    const sessionDays = new Set((sessionRows as { started_at: string }[]).map((s) => s.started_at.slice(0, 10)));
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (sessionDays.has(d.toISOString().slice(0, 10))) streak++;
      else if (i > 0) break;
    }

    const weightHistory = (weightHistoryRes.data ?? []) as { weight_kg: number; date: string }[];
    const recentSessions = sessionRows.slice(0, 5).map((s: { title: string; started_at: string; duration_minutes?: number }) => {
      const d = new Date(s.started_at);
      const dayNames = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
      return `${dayNames[d.getDay()]} : ${s.title}${s.duration_minutes ? ` (${s.duration_minutes} min)` : ""}`;
    });

    // Objectif du jour : même calcul partagé que l'écran Nutrition (profil central
    // + dernière pesée qui prime) → l'IA et l'écran ne peuvent plus diverger.
    const hasBodyProfile = !!(profile && (profile.onboarding_age || profile.onboarding_weight || profile.onboarding_level));
    const dayGoals = hasBodyProfile
      ? goalsFromRow(profile as Record<string, unknown>, weightHistory[0]?.weight_kg ?? null)
      : null;

    liveStatsRef.current = {
      calories: Math.round(totalCalories),
      calorieGoal: dayGoals?.calories,
      proteins: Math.round(totalProteins),
      proteinGoal: dayGoals?.proteins,
      streak: streak > 0 ? streak : undefined,
      lastWeight: weightHistory[0]?.weight_kg ?? undefined,
      recentSessions: recentSessions.length > 0 ? recentSessions : undefined,
    };

    const nutritionWeekMap: Record<string, { calories: number; proteins: number; carbs: number; fats: number }> = {};
    for (const row of (nutritionWeekRes.data ?? []) as { date: string; calories: number; proteins: number; carbs?: number; fats?: number }[]) {
      if (!nutritionWeekMap[row.date]) nutritionWeekMap[row.date] = { calories: 0, proteins: 0, carbs: 0, fats: 0 };
      nutritionWeekMap[row.date].calories += row.calories ?? 0;
      nutritionWeekMap[row.date].proteins += row.proteins ?? 0;
    }
    const nutritionWeek = Object.entries(nutritionWeekMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, v]) => ({ date, calories: Math.round(v.calories), proteins: Math.round(v.proteins) }));

    const mealsDetail = ((nutritionWeekRes.data ?? []) as { date: string; meal_type?: string; food_name?: string; calories?: number; proteins?: number; time?: string; description?: string | null }[])
      .slice(0, 12)
      .map((m) => ({ date: m.date, mealType: m.meal_type, name: m.food_name ?? "Repas", calories: m.calories, proteins: m.proteins, time: m.time, description: m.date === today ? (m.description ?? null) : null }));

    const recentPosts = (postsRes.data ?? []).map((p: { type: string; caption?: string | null; created_at: string }) => ({
      type: p.type, caption: p.caption, createdAt: p.created_at.slice(0, 10),
    }));

    const workoutHistory = sessionRows.map((s: { title: string; started_at: string; duration_minutes?: number; calories_burned?: number; exercises?: unknown }) => ({
      title: s.title, date: s.started_at.slice(0, 10), durationMinutes: s.duration_minutes, caloriesBurned: s.calories_burned,
      exercises: Array.isArray(s.exercises) ? (s.exercises as { name?: string; title?: string }[]).slice(0, 5).map((e) => e.name ?? e.title ?? "exercice") : undefined,
    }));

    richProfileRef.current = {
      bio: profileBioRes.data?.bio ?? null,
      fullName: profileBioRes.data?.full_name ?? null,
      followersCount: followersRes.count ?? 0,
      followingCount: followingRes.count ?? 0,
      postsCount: recentPosts.length,
      recentPosts, todayDate: today, mealsDetail, nutritionWeek,
      weightHistory: weightHistory.map((w) => ({ date: w.date, weight: w.weight_kg })),
      workoutHistory, monthWorkouts: sessionRows.length,
    };

    memoriesRef.current = (memoriesRes.data ?? []) as AiMemory[];
  }, [user?.id, user?.pseudo]);

  /* Le contexte, attendable. `ensureContext` garde son propre garde-fou
     (`dataLoadedRef`) ; ce qu'on ajoute ici, c'est de pouvoir ATTENDRE le
     chargement déjà en cours au lieu de repartir aussitôt. */
  const contextePret = useCallback((): Promise<void> => {
    if (!chargementRef.current) chargementRef.current = ensureContext();
    return chargementRef.current;
  }, [ensureContext]);

  /* Repère nutrition OPTIONNEL pour la génération de séance — renvoie une courte
     note SEULEMENT si l'utilisateur suit sa nutrition aujourd'hui ET qu'un signal
     clair existe. Sinon null → séance générée comme d'habitude, jamais de pénalité.
     C'est un BONUS, pas une condition (même esprit que la règle côté /api/chat). */
  /* ⚠️ ELLE LIT LE JOURNAL FRAIS, PLUS L'INSTANTANÉ DE SESSION. Elle
     lisait `liveStatsRef` et `richProfileRef` bruts, donc c'était la
     TROISIÈME représentation du jour qui survivait à une suppression : on
     pouvait générer une séance « bien rechargé, ~286 kcal mangées » sur
     une journée vidée. Sans lecture fraîche, elle ne dit RIEN : la note
     est un bonus, jamais une pénalité, donc son doute se tait. */
  /* ⚠️ L'identifiant passe par une variable locale, comme dans `open`.
     Lire `user.id` DANS le callback ferait inférer `user` entier au
     compilateur React là où la dépendance déclarée est `user?.id`, et
     ça coûte un avertissement neuf, ce que la discipline interdit. */
  const idNutrition = user?.id;
  /* Même précaution pour la recomposition d'une carte planning : elle relit
     la journée d'arrivée, donc elle a besoin du compte, et elle ne doit pas
     faire inférer `user` entier au compilateur React. */
  const idPlanning = user?.id;
  const buildNutritionNote = useCallback(async (): Promise<string | null> => {
    const goal = liveStatsRef.current?.calorieGoal;
    if (!goal || !idNutrition) return null;
    const nut = await etatNutrition(idNutrition).catch(() => null);
    if (!nut) return null;
    if (nut.repas.length === 0) return null; // ne note pas ses repas aujourd'hui → on n'y touche pas
    const consumed = nut.calories;
    const ratio = consumed / goal;
    if (ratio >= 0.9) {
      return `L’utilisateur est bien rechargé aujourd’hui (~${consumed}/${goal} kcal mangées). Tu PEUX te permettre une séance un peu plus intense si c’est pertinent.`;
    }
    if (new Date().getHours() >= 16 && ratio <= 0.5) {
      return `L’utilisateur a peu mangé aujourd’hui (~${consumed}/${goal} kcal). Tu PEUX privilégier une séance un peu plus courte ou d’intensité modérée.`;
    }
    return null;
  }, [idNutrition]);

  /* ── Mémoire long terme : persiste une action d'extraction (save / forget) ── */
  const persistMemoryAction = useCallback(async (action: MemoryAction) => {
    if (!user?.id) return;
    const supabase = createClient();

    if (action.type === "forget" && action.keywords) {
      const nk = normalizeForDedupe(action.keywords);
      if (!nk) return;
      const targets = memoriesRef.current.filter((mm) => {
        const c = normalizeForDedupe(mm.content);
        return c.includes(nk) || nk.includes(c);
      });
      if (targets.length === 0) return;
      const ids = targets.map((t) => t.id);
      await supabase.from("ai_memories").delete().in("id", ids);
      const idSet = new Set(ids);
      memoriesRef.current = memoriesRef.current.filter((mm) => !idSet.has(mm.id));
      setMemoryNotice(voix(guideRef.current, "memoire.oubliee"));
      return;
    }

    if (action.type === "save" && action.fact) {
      const content = String(action.fact).trim();
      const ns = normalizeForDedupe(content);
      if (!ns) return;
      const dup = memoriesRef.current.some((mm) => {
        const c = normalizeForDedupe(mm.content);
        return c === ns || c.includes(ns) || ns.includes(c);
      });
      if (dup) return;
      const { data, error } = await supabase
        .from("ai_memories")
        .insert({ user_id: user.id, content, category: normalizeCategory(action.category), source: "auto" })
        .select("id, content, category, source, created_at")
        .single();
      if (!error && data) {
        memoriesRef.current = [data as AiMemory, ...memoriesRef.current];
        setMemoryNotice(voix(guideRef.current, "memoire.retenue"));
      }
    }
  }, [user?.id]);

  /* ── Reste-t-il une place dans la bibliothèque ? ──
     Même règle que /progression : on plafonne le STOCK, jamais la création ni
     l'entraînement. Supprimer une séance libère une place tout de suite, et ce
     qui est déjà gardé n'est ni verrouillé ni effacé. Compteur côté client :
     c'est une limite douce assumée, pas une frontière de sécurité. */
  const verifierPlaces = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;
    if (user.is_premium || user.is_admin) { setBibliothequePleine(false); return false; }
    const { count } = await createClient()
      .from("custom_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    const pleine = (count ?? 0) >= PLANS.free.limits.sessionsMax;
    setBibliothequePleine(pleine);
    return pleine;
    // `user` en entier (et pas ses champs un à un) : c'est ce que le compilateur
    // React déduit, et une dépendance plus fine lui fait renoncer à optimiser.
  }, [user]);

  /* Pose une question à choix cliquables sous une nouvelle bulle du coach.
     `relance` = la demande d'origine, renvoyée au coach une fois la réponse
     connue, pour qu'il enchaîne au lieu de repartir de zéro. */
  const poserQuestion = useCallback((contenu: string, q: QuestionCliquable) => {
    // Mémorisée ici aussi : si l'utilisateur tape sa réponse au lieu de toucher
    // une puce, c'est `save_lieu` qui la reprendra.
    if (q.relance) attenteRef.current = q.relance;
    setMessages((prev) => [...prev, { role: "assistant" as const, content: contenu, id: uid(), question: q, ton: "listen" as const }]);
  }, []);

  /* ══════════ V9C bis · LE CONTENU QU'ON A NOMMÉ, ET RIEN D'AUTRE ══════════

     Trois gestes ont besoin de reconnaître une séance qu'on leur nomme
     (substituer, poser une séance sur un jour, en ajouter une en plus).
     Ils passent tous par ici, pour la même raison que `viserEtape` existe
     du côté des étapes : une reconnaissance écrite à trois endroits
     donnerait trois réponses différentes au même mot.

     ⚠️ TROIS ISSUES, ET AUCUNE N'EST MUETTE. Un contenu trouvé, une
     ambiguïté qu'on ne tranche pas tout seul (on demande, la question
     porte la demande d'origine), ou rien du tout, que l'appelant traite
     selon ce que son geste sait faire d'un nom inconnu. */
  const resoudreContenu = useCallback(async (
    nom: string,
    force: ForceNom,
    demande: AssistantAction,
  ): Promise<ContenuNomme | "demande" | null> => {
    const compte = user?.id;
    if (!compte) return null;
    const res = await resoudreSeanceNommee(compte, nom, force, !!(user?.is_premium || user?.is_admin));
    if (res.ok) return res.contenu;
    if (res.raison === "aucune") return null;

    /* ⚠️ ON DEMANDE PAR IDENTIFIANT, JAMAIS EN RENVOYANT LA PHRASE AU
       MODÈLE : même raison que le « laquelle ? » de V9B, repasser trois
       mots à l'aiguilleur rouvrirait l'ambiguïté qu'on lève. */
    const vus = new Set<string>();
    const contenus = res.candidats.slice(0, 4).map((c) => {
      let choix = libelleContenu(c);
      while (vus.has(choix)) choix += " ·";
      vus.add(choix);
      return { choix, ref: c.ref };
    });
    poserQuestion(voix(guideRef.current, "question.quel_contenu"), {
      choix: contenus.map((c) => c.choix), genre: "contenu", contenus, demande,
    });
    return "demande";
  }, [user?.id, user?.is_premium, user?.is_admin, poserQuestion]);

  /* ── V9B · LA CARTE D'UN GESTE QUI VISE UNE INTENTION DÉJÀ ÉCRITE ──
     Déplacer et retirer partagent tout : la ligne est trouvée, son
     identité est déclarée, et la conséquence se déduit de ce qu'elle
     porte. Deux entrées y mènent (la demande directe, et la réponse à
     « laquelle ? »), donc une seule composition : deux cartes écrites à
     deux endroits finiraient par annoncer deux choses différentes. ── */
  const preparerSurCible = useCallback(async (
    cible: PlanningDay,
    suite: { geste: "deplacer" | "retirer"; to?: string | null },
    connu?: Record<string, PlanningDay[]>,
  ) => {
    /* ⚠️ L'identifiant passe par la variable hoistée, jamais par `user.id`
       lu dans le callback : c'est le piège déjà payé deux fois (V9A, puis
       V9A ter). Le compilateur React infère alors `user` entier là où la
       dépendance déclarée est `user?.id`, et ça coûte un avertissement. */
    if (!idPlanning || !cible.id) return;
    const say = (content: string) => setMessages((prev) => [...prev, { role: "assistant" as const, content, id: uid(), ton: "explain" as const }]);

    if (suite.geste === "retirer") {
      setPendingPlan({
        ...texteCartePlan(cible, null, "Retirer"),
        title: dayTitle(cible),
        consequence: consequenceRetrait(cible),
        geste: { type: "retirer", intentionId: cible.id },
        preview: cible,
      });
      return;
    }

    const dates = prochainsJours(15);
    const parJour = connu ?? await fetchRange(idPlanning, dates);
    let to = suite.to ?? null;
    if (!to) {
      /* Empêchement sans destination (« je ne peux pas jeudi ») : on prend
         le premier jour libre à venir. ⚠️ Depuis V5, un jour LIBRE est le
         plus souvent un jour SANS AUCUNE LIGNE : exiger une ligne ici
         rendrait le geste impossible pour presque tout le monde, et
         l'échec serait muet. */
      const libre = (d: string) => {
        const jour = parJour[d] ?? [];
        return jour.length === 0 || jour.every((i) => i.status !== "done" && !hasSeance(i));
      };
      to = dates.find((d) => d > cible.date && libre(d))
        ?? dates.find((d) => d !== cible.date && libre(d))
        ?? null;
      if (!to) {
        say(voix(guideRef.current, "impasse.move_sans_jour"));
        return;
      }
    }
    if (to === cible.date) {
      say(voix(guideRef.current, "impasse.move_deja_prevu", { jour: dayLabelLong(to) }));
      return;
    }

    /* ⚠️ « REJOINT », PLUS « À LA PLACE DE » (V6b). L'intention se DÉPLACE :
       elle garde son identité, sa réservation, sa provenance et son
       adaptation, et change de date. Ce qui est déjà posé au jour d'arrivée
       reste, la journée en porte deux. Aucune séance n'est écrasée par un
       déplacement, et plus rien n'est libéré derrière lui — la ligne qu'il
       fallait effacer, c'était celle qu'un déplacement CRÉAIT ailleurs. */
    const movedDay: PlanningDay = { ...cible, date: to, status: "planned" };
    const rejoint = principale(parJour[to] ?? []);
    const cotoie = hasSeance(rejoint) ? dayTitle(rejoint) : null;
    setPendingPlan({
      ...texteCartePlan(movedDay, null, "Déplacer vers"),
      kicker: `${CAP(dayLabelLong(cible.date))} → ${dayLabelLong(to)}${cotoie ? ` · avec « ${cotoie} »` : ""}`,
      title: dayTitle(cible),
      consequence: consequenceDeplacement(cible),
      depuis: cible.date,
      geste: { type: "deplacer", jour: movedDay },
      preview: movedDay,
      retargetable: true,
    });
  }, [idPlanning]);

  /* ══════════════ V9C · SUBSTITUER ══════════════

     ⚠️ « AUTRE CHOSE QUE PULL » PROPOSE UNE SUBSTITUTION, JAMAIS UN SAUT
     (décision 1 de V9). Les deux referment l'étape, mais l'un le fait
     parce qu'on s'est entraîné et l'autre parce qu'on a renoncé : les
     confondre ferait avancer le cycle sans séance sur une phrase qui
     annonçait le contraire. La carte porte donc la seconde sortie en
     toutes lettres, « en plus, sans y toucher ».

     ⚠️ ET LE CYCLE N'AVANCE PAS AU CLIC. La ligne naît « prévue » : c'est
     la FIN DE SÉANCE qui la passera à « faite », par l'autorité unique de
     V7A. Refermer l'étape à la confirmation, ce serait créditer une
     séance que personne n'a encore faite. */
  const preparerSubstitution = useCallback(async (
    input: { etape?: string | null; quoi?: string | null; when?: string | null },
    contenuImpose?: ContenuNomme,
  ) => {
    const compte = idPlanning;
    if (!compte) return;
    const say = (content: string) => setMessages((prev) => [...prev, { role: "assistant" as const, content, id: uid(), ton: "explain" as const }]);

    const res = await viserEtape(compte, input.etape ?? null);
    if (!res.ok) { say(phraseRefus(guideRef.current, res)); return; }
    const { etape, apres, reservation, programmeId, adaptation } = res.visee;

    /* ⚠️ ICI ON DÉSIGNE, DONC ON RECONNAÎT LARGEMENT : « ma séance
       Pompes » a le droit de retrouver « Pompes ». Générer n'a jamais été
       une option sur ce geste (décision 5 de V9), donc un nom un peu lâche
       ne risque pas de faire passer une invention pour un choix. */
    const contenu = contenuImpose ?? await resoudreContenu(input.quoi ?? "", "large", {
      intent: "etape_substituer", etape: input.etape ?? undefined,
      quoi: input.quoi ?? undefined, when: input.when ?? undefined, portee: "a_la_place",
    });
    if (contenu === "demande") return;
    if (!contenu) { say(voix(guideRef.current, "impasse.substitution_sans_contenu", { titre: etape.nom })); return; }

    /* Le jour : celui qu'on demande, sinon CELUI DE LA RÉSERVATION quand
       l'étape en avait déjà un (« à la place de Pull » garde le jour de
       Pull), sinon aujourd'hui. */
    const date = (input.when ? resolveWhen(input.when) : null) ?? reservation?.date ?? todayYmd();
    const saved = readLieu(compte);
    const jour: PlanningDay = {
      /* ⚠️ ON REPREND LA RÉSERVATION, ON N'EN CRÉE PAS UNE SECONDE :
         `uniq_intention_par_etape` refuserait la deuxième intention
         prévue portant la même étape, et le geste échouerait au clic
         après avoir promis le contraire sur la carte. */
      id: reservation?.id ?? null,
      date,
      type: PLANNING_TYPE_BY_CATEGORY[contenu.category] ?? "Force",
      /* ⚠️ SON TITRE RÉEL, JAMAIS LES MOTS DE LA DEMANDE. On écrivait la
         phrase telle qu'elle était dite : « express 12 » restait en
         minuscules dans le planning, et `resolveSessionId` ne retrouvait
         plus ses animations le jour où on la relançait. */
      title: contenu.title,
      difficulty: contenu.difficulty,
      location: ctxFromLieu(saved.location, saved.equip),
      /* ⚠️ SA LISTE EXACTE, PAS UNE VERSION NORMALISÉE. `normalizeExercises`
         COMBLE ce qui manque (`restAfter` absent devient 90) : Express 12
         y gagnait six minutes de transitions et y perdait son `auto`. */
      exerciseList: contenu.exerciseList,
      sessionId: contenu.sessionId,
      status: "planned",
      programmeId,
      /* CE QUI EST REFERMÉ : l'étape, déclarée. */
      etapeId: etape.id,
      /* ⚠️ D'OÙ VIENT LE CONTENU : d'AILLEURS, donc `null`. C'est
         exactement le cas que `lienProgramme` ne savait pas représenter
         avant V9C, puisqu'il déduisait la provenance de la consommation.
         Une substitution qui déclarerait l'étape comme provenance
         mentirait sur ce qu'on va faire. */
      provenanceId: null,
      adaptationId: adaptation?.id ?? null,
    };

    setPendingPlan({
      kicker: `À la place de « ${etape.nom} »`,
      title: contenu.title,
      meta: [jour.type, `${jour.exerciseList.length} mouvements`, CAP(dayLabelLong(date))].filter(Boolean).join(" · "),
      cta: `Faire ça à la place`,
      consequence: consequenceSubstitution(etape.nom, apres?.nom ?? null),
      geste: { type: "substituer", jour },
      preview: jour,
      retargetable: true,
      substitution: { etapeNom: etape.nom, apresNom: apres?.nom ?? null, jour },
    });
  }, [idPlanning, resoudreContenu]);

  /* ══════════════ V9C · SAUTER ══════════════

     ⚠️ CE QU'UN SAUT N'EST PAS SE DIT AVANT LE CLIC, PARCE QU'APRÈS IL EST
     TROP TARD : il n'y a pas d'annulation dans cette première version
     (décision 3 de V9), et c'est la carte qui tient lieu de garde-fou.
     Elle nomme donc les deux choses qui comptent : l'étape ne sera pas
     comptée comme faite, et la prochaine devient l'autre, tout de suite. */
  const preparerSaut = useCallback(async (nom?: string | null) => {
    const compte = idPlanning;
    if (!compte) return;
    const say = (content: string) => setMessages((prev) => [...prev, { role: "assistant" as const, content, id: uid(), ton: "explain" as const }]);

    const res = await viserEtape(compte, nom ?? null);
    if (!res.ok) { say(phraseRefus(guideRef.current, res)); return; }
    const { etape, apres, reservation, programmeId, adaptation } = res.visee;

    setPendingPlan({
      kicker: "Passer une étape",
      title: etape.nom,
      meta: apres ? `Ensuite : ${apres.nom}` : "Ton cycle avance",
      cta: `Passer « ${etape.nom} »`,
      consequence: consequenceSaut(etape.nom, apres?.nom ?? null),
      geste: {
        type: "sauter",
        programmeId,
        etape: { id: etape.id, nom: etape.nom },
        reservationId: reservation?.id ?? null,
        adaptationId: adaptation?.id ?? null,
      },
      /* Un saut n'a aucun contenu : pas d'aperçu, donc pas de liste de
         mouvements dépliable. Ce n'est pas une séance. */
      preview: null,
    });
  }, [idPlanning]);

  /* ── Action PLANNING (Phase 2) : prépare une carte de confirmation.
     Aucune écriture en base ici — tout passe par confirmPlan() (clic). ── */
  const preparePlanAction = useCallback(async (action: AssistantAction, text: string, contenuImpose?: ContenuNomme) => {
    if (!user?.id) return;
    // Réponse courte du coach dans le fil (chaque impasse est explicite, jamais muette).
    // Une impasse est une explication : le Guide dit pourquoi rien ne
    // bouge. Ce n'est ni une question, ni une réussite.
    const say = (content: string) => setMessages((prev) => [...prev, { role: "assistant" as const, content, id: uid(), ton: "explain" as const }]);

    /* ── V9B · DÉPLACER ET RETIRER : ON RÉSOUT LA LIGNE, PUIS ON DEMANDE ──

       ⚠️ L'AIGUILLEUR RESTE PAUVRE, ET C'EST LA DÉCISION 7 DE V9. Il rend
       un jour et éventuellement un nom ; c'est le CODE qui traduit ça en
       une intention réelle, en passant D'ABORD par les étapes du cycle.
       Une séance du catalogue intitulée « Push » n'est pas l'étape Push :
       le titre désigne, il n'identifie jamais.

       ⚠️ ET LA FENÊTRE FAIT QUINZE JOURS, PAS LA SEMAINE CIVILE. Une
       réservation d'étape vit souvent au-delà du dimanche : la chercher
       dans la semaine courante rendrait le geste intermittent selon le
       jour où l'on parle, c'est-à-dire pire qu'un geste qui échoue. */
    if (action.intent === "plan_move" || action.intent === "plan_retirer") {
      const dates = prochainsJours(15);
      const parJour = await fetchRange(user.id, dates);
      const toutes = dates.flatMap((d) => parJour[d] ?? []);
      const nom = (action.quoi || "").trim() || null;
      const jourDit = action.when ? resolveWhen(action.when) : null;
      const to = action.intent === "plan_move" && action.to ? resolveWhen(action.to) : null;

      /* Le cycle sert UNIQUEMENT à traduire un nom en identité d'étape. Son
         échec ne bloque rien : on désigne alors par le titre, et rien de
         métier n'en dépend puisque la ligne voyage avec ses colonnes. */
      let cycle: EtapeNommee[] | null = null;
      try {
        const actif = await lireProgrammeActif(user.id);
        cycle = actif ? actif.cycle.map((e) => ({ id: e.id, nom: e.nom })) : null;
      } catch { /* programme illisible : on désignera par le nom */ }

      let candidats = resoudreCibles(toutes, { date: jourDit, nom }, cycle);
      if (to) candidats = candidats.filter((c) => c.date !== to);
      /* Ni jour ni nom : « ma séance » veut dire la prochaine. Poser
         « laquelle ? » sur une demande qui n'en désigne aucune, ce serait
         un formulaire, pas une question. */
      if (!jourDit && !nom) candidats = candidats.slice(0, 1);

      if (candidats.length === 0) {
        say(nom
          ? voix(guideRef.current, "impasse.cible_introuvable", { titre: nom })
          : voix(guideRef.current, action.intent === "plan_move" ? "impasse.move_introuvable" : "impasse.retrait_introuvable"));
        return;
      }

      const geste = action.intent === "plan_move" ? "deplacer" as const : "retirer" as const;
      if (candidats.length > 1) {
        /* ⚠️ PLUSIEURS CORRESPONDANCES : ON DEMANDE, ON N'ÉCRIT RIEN, ET
           ON NE REPASSE PAS PAR LE MODÈLE. La réponse désigne un
           identifiant ; renvoyer « jeudi 10 » à l'aiguilleur rouvrirait
           exactement l'ambiguïté qu'on est en train de lever. */
        const vus = new Set<string>();
        const cibles = candidats.slice(0, 4).map((c) => {
          let choix = `${dayTitle(c)} · ${jourCourt(c.date)}`;
          while (vus.has(choix)) choix += " ·";
          vus.add(choix);
          return { choix, id: c.id as string };
        });
        poserQuestion(voix(guideRef.current, "question.quelle_seance"), {
          choix: cibles.map((c) => c.choix),
          genre: "cible",
          cibles,
          suite: { geste, to },
        });
        return;
      }

      await preparerSurCible(candidats[0], { geste, to }, parJour);
      return;
    }

    // SEMAINE ENTIÈRE : « refais ma semaine » / « plus légère » / « plus de
    // cardio »… On génère la semaine SANS écrire (previewWeek) et on propose
    // une carte ; le passé et les jours déjà faits sont préservés.
    if (action.intent === "plan_regen") {
      const supabase = createClient();
      const { data: prof } = await supabase
        .from("profiles")
        .select("onboarding_level, onboarding_sessions_week, onboarding_goals")
        .eq("id", user.id)
        .maybeSingle();
      const saved = readLieu(user.id);
      if (!saved.location || (saved.location === "maison" && !saved.equip)) {
        // Lieu incomplet : on le demande en puces plutôt que de rester muet
        // sur une promesse. La demande d'origine repart dès qu'on a la réponse.
        if (!saved.location) {
          poserQuestion(voix(guideRef.current, "question.lieu_semaine"), { choix: CHOIX_LIEU, genre: "lieu", relance: text });
        } else {
          poserQuestion(voix(guideRef.current, "question.equip"), { choix: CHOIX_EQUIP, genre: "equip", relance: text });
        }
        return;
      }
      const adjust = action.adjust ?? "none";
      let sessions = prof?.onboarding_sessions_week ?? 3;
      const goals = (((prof?.onboarding_goals as string[] | null) ?? [])).map((g) => GOAL_LABELS[g] ?? g);
      if (adjust === "leger") sessions = Math.max(2, sessions - 1);
      if (adjust === "intense") sessions = Math.min(6, sessions + 1);
      if (adjust === "cardio") goals.push("endurance");
      if (adjust === "force") goals.push("force");
      // Variant frais pour que « refais » change vraiment le contenu.
      const variant = readVariant(user.id) + 1;
      try { localStorage.setItem(`vaiiya_prog_variant_${user.id}`, String(variant)); } catch { /* ignore */ }
      const gen: GenInput = {
        ctx: ctxFromLieu(saved.location, saved.equip),
        sessions, goals,
        level: prof?.onboarding_level ?? null,
        variant,
        seed: user.id,
      };
      const dates = weekDates();
      const existing = await fetchRange(user.id, dates);
      /* ⚠️ LE GUIDE EST LE TROISIÈME CHEMIN QUI POSE DES ÉTAPES, ET IL
         AVAIT ÉTÉ OUBLIÉ EN V8 (défaut du 2026-09-08). « Refais ma
         semaine » dit au Guide compose exactement la même semaine que le
         bouton d'Entraînement : sans le cycle, il repose une étape que
         l'adaptation masque, et il l'écrit sans aucun lien avec le
         programme, donc invisible à la détection de conflit. Deux
         lectures, seulement sur ce chemin, et son échec ne bloque rien :
         on retombe alors sur le comportement d'avant. */
      let cycleSemaine: CycleSemaine | null = null;
      try {
        const actif = await lireProgrammeActif(user.id);
        if (actif) {
          const couche = await adaptationDuJour(user.id, actif.programme.id, todayYmd());
          cycleSemaine = {
            programmeId: actif.programme.id,
            etapes: actif.cycle.map((e) => ({ id: e.id, nom: e.nom })),
            masquees: idsMasques(actif.cycle, couche),
          };
        }
      } catch { /* programme illisible → semaine composée sans lien, comme avant */ }
      /* ⚠️ On n'écrit QUE des séances : reposer les jours « Repos » de la
         semaine générée recréerait le mobilier automatique que V5 retire.
         Les jours sans séance sont libérés, et un jour libre veut dire
         libre. Les jours déjà faits et le passé ne bougent pas.

         ⚠️ ⚠️ ET « REFAIS MA SEMAINE » NE VEUT PAS DIRE « EFFACE TOUT CE
         QUI ÉTAIT PRÉVU » : C'EST LE SECOND DÉFAUT QUE V9B RÉPARE. Ce
         chemin libérait TOUS les jours à venir, donc il emportait les
         réservations d'étapes, les suppléments et les séances posées à la
         main, sans que la carte n'en dise un mot. Le bouton d'Entraînement,
         lui, ne retire que `origine = 'systeme'` depuis V5 : deux chemins
         pour le même geste, deux portées, et c'est le plus destructeur qui
         était muet. Un jour qui porte autre chose que du mobilier n'est
         donc ni libéré, ni réécrit, et la carte le NOMME avant le clic. */
      const garde = (d: string) => (existing[d] ?? []).some((i) => !estMobilier(i));
      const aVenir = dates.filter((d) => d >= todayYmd());
      const modifiables = aVenir.filter((d) => !garde(d));
      const writes = previewWeek(gen, dates, cycleSemaine)
        .filter((d) => modifiables.includes(d.date))
        .filter(hasSeance);
      const nbSeances = writes.length;
      if (nbSeances === 0) {
        say(voix(guideRef.current, "impasse.regen_semaine_finie"));
        return;
      }
      const adjustLabel = adjust === "leger" ? " · plus légère"
        : adjust === "intense" ? " · plus intense"
        : adjust === "cardio" ? " · plus de cardio"
        : adjust === "force" ? " · plus de force" : "";
      setPendingPlan({
        kicker: "Toute la semaine",
        title: "Nouvelle semaine ✦",
        meta: `Dès aujourd’hui · ${nbSeances} séance${nbSeances > 1 ? "s" : ""}${adjustLabel}`,
        cta: "Remplacer ma semaine",
        consequence: consequenceSemaine(aVenir.filter(garde).map((d) => dayLabel(d).toLowerCase())),
        geste: { type: "semaine", poser: writes, liberer: modifiables },
        preview: writes.find(hasSeance) ?? null,
      });
      return;
    }

    // BIBLIOTHÈQUE → PLANNING : poser une séance DÉJÀ créée sur un jour (pas de
    // génération : on copie la séance existante et on la lie via session_id).
    if (action.intent === "plan_library") {
      const day = resolveWhen(action.when || "aujourd_hui");
      if (!day) {
        say(voix(guideRef.current, "impasse.library_sans_jour"));
        return;
      }
      const title = (action.title || "").trim();
      if (!title) {
        say(voix(guideRef.current, "impasse.library_sans_nom"));
        return;
      }
      /* ⚠️ V9C bis · CE GESTE DÉSIGNE, IL NE COMPOSE JAMAIS, donc il passe
         par l'autorité et il voit désormais le CATALOGUE en plus de la
         bibliothèque : « mets Express 12 mardi » désignait une séance qui
         existe et se faisait répondre qu'elle est introuvable. Il perd au
         passage son `.limit(1)` sur la plus récemment modifiée, qui
         choisissait en silence entre deux séances du même nom. */
      const contenuLib = contenuImpose ?? await resoudreContenu(title, "large", action);
      if (contenuLib === "demande") return;
      if (!contenuLib) {
        say(voix(guideRef.current, "impasse.library_introuvable", { titre: title }));
        return;
      }
      const saved = readLieu(user.id);
      const libDay: PlanningDay = {
        id: null,
        date: day,
        type: PLANNING_TYPE_BY_CATEGORY[contenuLib.category] ?? "Force",
        title: contenuLib.title,
        difficulty: contenuLib.difficulty,
        location: ctxFromLieu(saved.location, saved.equip),
        exerciseList: contenuLib.exerciseList,
        sessionId: contenuLib.sessionId,
        status: "planned",
      };
      /* ⚠️ LA CIBLE SE DÉCLARE ICI, ET PAS À L'ÉCRITURE (V9B). Sans `id`,
         `poser` choisissait lui-même la ligne à réécrire, et la carte
         nommait autre chose que ce qui allait être écrit. */
      const jourVise = await lireJour(user.id, day);
      const cible = cibleRemplacable(jourVise);
      const gardee = jourVise.find(vientDuProgramme) ?? null;
      const libJour: PlanningDay = { ...libDay, id: cible?.id ?? null };
      setPendingPlan({
        ...texteCartePlan(libJour, cible ? dayTitle(cible) : null, verbePose(gardee)),
        title: contenuLib.title,
        consequence: consequencePose(cible, gardee),
        geste: cible ? { type: "remplacer", jour: libJour } : { type: "ajouter", jour: libJour },
        preview: libJour,
        retargetable: true,
      });
      return;
    }

    // SET / LOCATION / AJOUTER : on génère une vraie séance pour le jour cible.
    /* ⚠️ V9C · UN SUPPLÉMENT EST TOUJOURS DATÉ, ET IL N'A PAS DE JOUR PAR
       DÉFAUT. « Aujourd'hui » convient à `plan_set`, qui DÉFINIT la séance
       d'un jour ; pour un « en plus » sans jour dit, ce serait choisir à la
       place de quelqu'un. On demande, et on ne reste jamais muet. */
    const estAjout = action.intent === "plan_ajouter";
    const when = estAjout
      ? (action.when ? resolveWhen(action.when) : null)
      : resolveWhen(action.when || "aujourd_hui");
    if (!when) {
      if (estAjout) say(voix(guideRef.current, "impasse.ajout_sans_jour"));
      return;
    }

    const saved = readLieu(user.id);
    let location: "salle" | "maison" | null = saved.location;
    let equip: "halteres" | "poids" | null = saved.equip;
    if (action.intent === "plan_location") {
      location = action.location === "salle" ? "salle" : "maison";
      if (location === "maison" && equip !== "halteres") equip = "poids";
    }
    const ctx = ctxFromLieu(location, equip);

    const category = normalizeWorkoutCategory(action.category);
    const muscles: string[] = Array.isArray(action.muscles)
      ? (action.muscles as unknown[]).filter((m): m is string => typeof m === "string")
      : [];
    let baseDesc = (action.description || "").trim();
    /* ⚠️ ⚠️ LE DÉFAUT CENTRAL DE V9B EST ICI, ET IL ÉTAIT MUET. `plan_set`
       composait `{ id: null, … }` sans aucune identité de programme ;
       `poser` visait alors « la première intention non résolue » du jour,
       or `ordonner` met justement l'étape en tête. Une réservation V7A
       était donc réécrite, et `lienProgramme` écrivant ses trois colonnes
       MÊME À `null`, elle cessait d'être une réservation : toujours là,
       toujours prévue, mais sans son étape. Le curseur ne bougeait pas, le
       héros reproposait l'étape comme libre, et personne n'était prévenu.
       On résout donc la cible ICI, avec la règle unique, et le geste
       déclare l'identité qu'il écrira. Une journée qui ne porte qu'une
       séance de PROGRAMME (qu'elle réserve une étape ou qu'elle en
       provienne) n'a pas de cible remplaçable : la séance s'AJOUTE à
       côté, et la carte le dit. */
    const jourVise = await lireJour(user.id, when);
    /* ⚠️ V9C · UN SUPPLÉMENT NE PASSE JAMAIS PAR `cibleRemplacable`. C'est
       la définition même du geste : il s'ajoute, y compris sur une journée
       qui porte déjà une séance. Lui laisser résoudre une cible, ce serait
       en refaire un remplacement dès que la journée n'est pas vide. */
    const cible = estAjout ? null : cibleRemplacable(jourVise);
    const gardee = jourVise.find(vientDuProgramme) ?? null;
    const actuelle = principale(jourVise);
    if (action.intent === "plan_location") {
      baseDesc = actuelle && actuelle.title ? actuelle.title : "séance complète";
    }

    /* ══════════ V9C bis · UNE SÉANCE QU'ON NOMME N'EST PAS UNE SÉANCE
       À COMPOSER, ET C'ÉTAIT LE DÉFAUT RÉEL. ══════════

       « Remplace ma séance d'aujourd'hui par Express 12 » arrivait ici,
       et « Express 12 » n'était rien de plus qu'un bout de phrase passé
       à `/api/workout/generate` : le générateur rendait une séance neuve
       (« Force Express Maison », 6 mouvements) alors qu'Express 12 existe
       et en porte 5. L'intention était comprise, l'objet perdu.

       ⚠️ LA RECONNAISSANCE EST EXACTE ICI, ET LARGE AILLEURS. Ce geste
       DÉCRIT ce qu'il veut, et composer est son métier : « du dos »,
       « une séance jambes de 30 min » doivent continuer de générer. Seule
       une demande qui EST le nom d'une séance prend le dessus. Les gestes
       qui DÉSIGNENT (`plan_library`, le contenu d'une substitution)
       reconnaissent largement, eux, puisque générer n'y est pas une option.

       ⚠️ ET `plan_location` RESTE DEHORS. Sa description est le titre de
       la séance DÉJÀ posée sur ce jour : la reconnaître, ce serait reposer
       la même au lieu de la recomposer pour le nouveau lieu, c'est-à-dire
       retourner le geste contre lui-même. */
    const nomme = (action.intent === "plan_set" || estAjout)
      ? (contenuImpose ?? await resoudreContenu(baseDesc, "exacte", action))
      : null;
    if (nomme === "demande") return;
    if (nomme) {
      const jourNomme: PlanningDay = {
        id: cible?.id ?? null,
        date: when,
        type: PLANNING_TYPE_BY_CATEGORY[nomme.category] ?? "Force",
        title: nomme.title,
        difficulty: nomme.difficulty,
        location: ctx,
        /* Sa liste, dans son ordre, avec ses temps : rien n'est recomposé
           et rien n'est comblé. */
        exerciseList: nomme.exerciseList,
        sessionId: nomme.sessionId,
        status: "planned",
      };
      setPendingPlan({
        ...texteCartePlan(jourNomme, cible ? dayTitle(cible) : null, estAjout ? "Ajouter" : verbePose(gardee)),
        ...(estAjout ? { kicker: `En plus · ${CAP(dayLabelLong(when))}` } : {}),
        title: nomme.title,
        consequence: estAjout ? consequenceSupplement(null) : consequencePose(cible, gardee),
        geste: cible ? { type: "remplacer", jour: jourNomme } : { type: "ajouter", jour: jourNomme },
        preview: jourNomme,
        retargetable: true,
        forcerAjout: estAjout,
        /* Pas de « garder aussi » : cette séance existe déjà, dans sa
           bibliothèque ou dans le catalogue. La proposer une seconde fois
           ferait un doublon à son nom. */
      });
      return;
    }

    setActionLoading("seance");
    setPendingPlan(null);
    try {
      const difficulty = levelToDifficulty(userContextRef.current?.level);
      const lieuTxt = location === "maison"
        ? (equip === "halteres" ? " à la maison avec haltères" : " à la maison au poids du corps")
        : " en salle de sport";
      const description = `${baseDesc || "séance complète"}${lieuTxt}`.slice(0, 400);
      // Bonus nutrition uniquement si on planifie AUJOURD'HUI (jamais un jour futur)
      const nutritionNote = when === localDateStr() ? await buildNutritionNote() : null;

      const genRes = await aiFetch("/api/workout/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, category, difficulty, muscles, nutritionNote }),
      });
      if (!genRes.ok) throw new Error("generation HTTP " + genRes.status);
      const data = await genRes.json();
      if (!data || data.error) throw new Error("generation: " + (data?.error ?? "réponse vide"));

      const seance = assembleSeance({
        title: data.title,
        category,
        difficulty,
        muscles: (Array.isArray(data.muscles) && data.muscles.length > 0) ? data.muscles : muscles,
        rawExercises: Array.isArray(data.exercises) ? data.exercises : [],
      });

      const day: PlanningDay = {
        id: cible?.id ?? null,
        date: when,
        type: PLANNING_TYPE_BY_CATEGORY[category] ?? "Force",
        title: seance.title,
        difficulty,
        location: ctx,
        exerciseList: normalizeExercises(seance.exerciseList),
        sessionId: null,
        status: "planned",
      };

      const pleine = await verifierPlaces();
      setPendingPlan({
        ...texteCartePlan(day, cible ? dayTitle(cible) : null, estAjout ? "Ajouter" : verbePose(gardee)),
        ...(estAjout ? { kicker: `En plus · ${CAP(dayLabelLong(when))}` } : {}),
        title: seance.title,
        consequence: estAjout ? consequenceSupplement(null) : consequencePose(cible, gardee),
        geste: cible ? { type: "remplacer", jour: day } : { type: "ajouter", jour: day },
        preview: day,
        retargetable: true,
        forcerAjout: estAjout,
        // Générée à l'instant : elle n'existe nulle part ailleurs, donc on peut
        // proposer de la garder AUSSI dans la bibliothèque, pas seulement sur
        // ce jour-là (une séance de la biblio, elle, y est déjà). Sauf si le
        // stock gratuit est plein : on ne propose pas un bouton qui refusera.
        gardable: !pleine,
      });
    } catch (e) {
      const detail = (e as { message?: string })?.message ?? String(e);
      say(`⚠️ Modification du planning échouée : ${detail}`);
    } finally {
      setActionLoading(null);
    }
  }, [user?.id, buildNutritionNote, poserQuestion, verifierPlaces, preparerSurCible, resoudreContenu]);

  /* ── Mémoire long terme (silencieuse, best-effort) ──
     Volontairement restée sur son propre petit appel : elle n'a rien à voir
     avec ce que le coach répond à l'écran, personne ne la voit arriver, et
     son prompt est affûté depuis des mois. Les ACTIONS, elles, ont quitté
     cet appel : elles viennent maintenant du même tour que le texte. ── */
  const extractMemory = useCallback(async (text: string, context: string) => {
    if (!user?.id || !text.trim()) return;
    try {
      const res = await aiFetch("/api/assistant/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context }),
      });
      if (!res.ok) return;
      const parsed = (await res.json()) as { memory?: MemoryAction } | null;
      const mem = parsed?.memory;
      if (mem && (mem.type === "save" || mem.type === "forget")) void persistMemoryAction(mem);
    } catch { /* silencieux par nature */ }
  }, [user?.id, persistMemoryAction]);

  /* ── Exécution d'une action décidée par le coach ──
     L'action arrive du MÊME appel que sa phrase (outils de /api/chat), donc
     le texte et la carte ne peuvent plus se contredire. Ajouter une capacité :
     une entrée dans `assistantTools.ts`, une branche ici, une carte si ça écrit. ── */
  const runAction = useCallback(async (action: AssistantAction, text: string) => {
    if (!user?.id || !action?.intent) return;

    // La question du coach (ask_choice) est rattachée à sa bulle dans
    // sendMessage : ici il n'y a rien à exécuter.
    if (action.intent === "ask_choice") return;

    // NAVIGATION : le coach emmène l'utilisateur sur une page de l'app.
    if (action.intent === "open_page") {
      const route = resolveNavTarget(action.cible ?? "");
      if (route && route !== pathname) {
        setTimeout(() => router.push(route), 700);
        // Emmener quelqu'un au bon endroit EST une action qui aboutit : elle
        // mérite le même visage qu'une carte validée.
        setReussite((n) => n + 1);
      }
      return;
    }

    // LIEU D'ENTRAÎNEMENT : mémorisé dès que l'utilisateur l'indique, pour que
    // le tour suivant ne repose pas la question (localStorage + base).
    if (action.intent === "save_lieu") {
      const loc = action.lieu === "salle" ? "salle" : action.lieu === "maison" ? "maison" : null;
      const eq = action.materiel === "halteres" ? "halteres" : action.materiel === "poids" ? "poids" : null;
      if (!loc && !eq) return;
      void persistLieu(user.id, { ...(loc ? { location: loc } : {}), ...(eq ? { equip: eq } : {}) });

      /* Une demande attendait ce lieu : elle repart toute seule. Sans ça, le
         coach répondait « c'est noté ✦ » et l'utilisateur devait redemander sa
         séance — d'où l'impression que la première demande ne marche jamais.
         (localStorage est déjà écrit par persistLieu, la relecture est bonne.) */
      const attente = attenteRef.current;
      if (!attente) return;
      const { location, equip } = readLieu(user.id);
      if (!location) return;
      if (location === "maison" && !equip) {
        // Une seule question à la fois : le matériel arrive maintenant, et
        // c'est lui qui relancera la demande.
        poserQuestion(voix(guideRef.current, "question.equip"), {
          choix: CHOIX_EQUIP, genre: "equip", relance: attente,
        });
        return;
      }
      attenteRef.current = null;
      sendRef.current?.(attente, true);
      return;
    }

    // 2a-bis) THÈME du site (sombre / clair / auto). Appliqué TOUT DE SUITE,
    // sans carte de confirmation : c'est instantané, visible et réversible d'un
    // mot — demander « tu confirmes ? » pour un changement de couleur serait
    // plus lourd que l'action elle-même.
    if (action.intent === "set_theme") {
      const t = (action.theme ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      const pref: ThemePreference | null =
        /somb|dark|nuit|noir/.test(t) ? "dark"
        : /clair|light|jour|blanc/.test(t) ? "light"
        : /auto|system/.test(t) ? "system"
        : null;
      if (!pref) return;
      // Garde anti-faux-positif : le petit modèle hallucinait parfois set_theme
      // sur un message sans rapport (l'app basculait en sombre « sans raison »).
      // On n'applique QUE si l'utilisateur a vraiment parlé d'apparence.
      if (!textMentionsTheme(text)) return;
      setThemePreference(pref);
      // Le thème a changé sous ses yeux : c'est fait, sans carte à valider.
      setReussite((n) => n + 1);
      // Pas de message ici : le coach parle et agit dans le même tour, et
      // `phraseDeRepli` annonce déjà le changement. En ajouter un deuxième
      // ferait dire deux fois la même chose.
      return;
    }

    // 2a-ter) RECETTE : l'IA cuisine (un plat, un thème, ou les restes qu'on a
    // sous la main) puis propose une carte. Rien n'est loggé sans validation.
    if (action.intent === "create_recipe") {
      setActionLoading("recette");
      setPendingRecipe(null);
      try {
        const ingredients = Array.isArray(action.ingredients)
          ? (action.ingredients as unknown[]).filter((i): i is string => typeof i === "string")
          : [];
        const res = await aiFetch("/api/nutrition/recipe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dish: action.dish ?? "",
            theme: action.theme_recette ?? "",
            ingredients,
            mealType: action.mealType ?? "",
            portions: 2,
          }),
        });
        if (!res.ok) throw new Error("recette HTTP " + res.status);
        const data = await res.json();
        if (!data?.recipe) throw new Error(data?.error ?? "réponse vide");
        setPendingRecipe(data.recipe as PendingRecipe);
      } catch (e) {
        const detail = (e as { message?: string })?.message ?? String(e);
        setMessages((prev) => [...prev, {
          role: "assistant" as const,
          content: `⚠️ Je n’ai pas réussi à écrire la recette : ${detail}`,
          id: uid(),
          ton: "explain" as const,
        }]);
      } finally {
        setActionLoading(null);
      }
      return;
    }

    // 2a-quater) REPAS : l'utilisateur raconte ce qu'il a mangé/bu → on estime
    // les macros (endpoint nutrition existant) et on propose une carte. Rien
    // n'est loggé sans clic (même règle que la recette et les séances). Zéro
    // jugement : on note ce qui a été mangé, quoi que ce soit.
    if (action.intent === "log_meal") {
      const food = (action.food ?? "").trim();
      if (!food) return;
      setActionLoading("repas");
      setPendingMeal(null);
      try {
        const res = await aiFetch("/api/nutrition/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: food }),
        });
        if (!res.ok) throw new Error("estimation HTTP " + res.status);
        const data = await res.json();
        if (!data || data.error || typeof data.calories !== "number") {
          throw new Error(data?.error ?? "réponse vide");
        }
        const mealType = normalizeMealType(action.mealType) || normalizeMealType(data.mealType) || mealTypeFromHour();
        setPendingMeal({
          foodName: typeof data.foodName === "string" && data.foodName.trim() ? data.foodName.trim() : food,
          mealType,
          calories: Math.max(0, Math.round(data.calories ?? 0)),
          proteins: Math.max(0, Math.round(data.proteins ?? 0)),
          carbs: Math.max(0, Math.round(data.carbs ?? 0)),
          fats: Math.max(0, Math.round(data.fats ?? 0)),
          confidence: typeof data.confidence === "string" ? data.confidence : undefined,
        });
      } catch (e) {
        const detail = (e as { message?: string })?.message ?? String(e);
        setMessages((prev) => [...prev, {
          role: "assistant" as const,
          content: `⚠️ Je n’ai pas réussi à estimer ce repas : ${detail}`,
          id: uid(),
          ton: "explain" as const,
        }]);
      } finally {
        setActionLoading(null);
      }
      return;
    }

    /* ══════ V9C · LES TROIS GESTES DE CYCLE ══════

       ⚠️ ILS SONT STRICTEMENT DISTINCTS, ET AUCUN NE PEUT SE FAIRE PASSER
       POUR UN AUTRE. Substituer referme l'étape quand la séance sera
       faite ; sauter la referme tout de suite et sans séance ; ajouter n'y
       touche jamais. C'est aussi pour ça que chacun a son outil : un seul
       outil « faire autre chose » aurait laissé le modèle arbitrer une
       conséquence qu'il ne voit pas. */
    if (action.intent === "etape_substituer") {
      const portee = (action.portee ?? "").trim();
      const charge = {
        etape: action.etape ?? null,
        quoi: action.quoi ?? action.description ?? null,
        when: action.when ?? null,
      };
      /* ⚠️ DANS LE DOUTE ON DEMANDE, ON NE DEVINE PAS. « Je veux faire du
         cardio » ne dit pas si c'est à la place de la prochaine étape ou
         en plus, et les deux ne font pas du tout la même chose au cycle.
         La question porte la demande d'origine, donc la réponse ne
         repasse pas par l'aiguilleur. */
      if (portee === "en_plus") {
        void preparePlanAction({ ...action, intent: "plan_ajouter", description: charge.quoi ?? action.description }, text);
        return;
      }
      if (portee !== "a_la_place") {
        poserQuestion(voix(guideRef.current, "question.portee"), {
          choix: CHOIX_PORTEE, genre: "portee", substitution: charge,
        });
        return;
      }
      void preparerSubstitution(charge);
      return;
    }
    if (action.intent === "etape_sauter") {
      void preparerSaut(action.etape ?? action.quoi ?? null);
      return;
    }

    // 2a) Pilotage du PLANNING (remplacer / décaler / changer le lieu / poser une séance de la biblio / refaire la semaine / ajouter en plus)
    if (action.intent === "plan_set" || action.intent === "plan_location" || action.intent === "plan_move" || action.intent === "plan_retirer" || action.intent === "plan_library" || action.intent === "plan_regen" || action.intent === "plan_ajouter") {
      void preparePlanAction(action, text);
      return;
    }

    // 2b) Création d'une séance réutilisable (bibliothèque) → génération + carte
    if (action.intent !== "create_seance") return;

    /* Le lieu conditionne le contenu (machines vs poids du corps). Il est
       normalement déjà connu — `questionManquante` le vérifie avant d'exécuter
       l'action — mais ce filet ne renvoie JAMAIS en silence : un `return` nu
       ici, c'était une demande sans réponse et sans explication. */
    const { location: lieu, equip } = readLieu(user.id);
    if (!lieu) {
      poserQuestion(voix(guideRef.current, "question.lieu"), {
        choix: CHOIX_LIEU, genre: "lieu", relance: text,
      });
      return;
    }

    setActionLoading("seance");
    setPendingSeance(null);
    try {
      const category = normalizeWorkoutCategory(action.category);
      const difficulty = action.difficulty
        ? normalizeDifficulty(action.difficulty)
        : levelToDifficulty(userContextRef.current?.level);
      const muscles: string[] = Array.isArray(action.muscles)
        ? (action.muscles as unknown[]).filter((m): m is string => typeof m === "string")
        : [];

      const lieuTxt = lieu === "maison"
        ? (equip === "halteres" ? " à la maison avec haltères" : " à la maison au poids du corps")
        : " en salle de sport";
      const description = `${action.description || text}${lieuTxt}`.slice(0, 400);
      // Bonus nutrition : créer une séance = pour maintenant (aujourd'hui)
      const nutritionNote = buildNutritionNote();

      const genRes = await aiFetch("/api/workout/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, category, difficulty, muscles, nutritionNote }),
      });
      if (!genRes.ok) throw new Error("generation HTTP " + genRes.status);
      const data = await genRes.json();
      if (!data || data.error) throw new Error("generation: " + (data?.error ?? "réponse vide"));

      await verifierPlaces();
      setPendingSeance(assembleSeance({
        title: data.title,
        category,
        difficulty,
        muscles: (Array.isArray(data.muscles) && data.muscles.length > 0) ? data.muscles : muscles,
        rawExercises: Array.isArray(data.exercises) ? data.exercises : [],
      }));
    } catch (e) {
      // Échec de génération : on le DIT, avec le détail (diagnostic temporaire)
      const detail = (e as { message?: string })?.message ?? String(e);
      setMessages((prev) => [...prev, {
        role: "assistant" as const,
        content: `⚠️ Génération séance échouée (${detail})\n(copie-moi ce message stp)`,
        id: uid(),
        ton: "explain" as const,
      }]);
    } finally {
      setActionLoading(null);
    }
  }, [user?.id, pathname, router, preparePlanAction, buildNutritionNote, poserQuestion, verifierPlaces, preparerSubstitution, preparerSaut]);

  /* ── Ce qui manque AVANT d'agir ──
     C'est le CODE qui sait de quoi il a besoin, pas le modèle : lui demander
     de retenir nos prérequis marchait mal (il écrivait la question en texte au
     lieu d'appeler l'outil, donc sans réponses à toucher). Ici c'est
     déterministe : si le lieu manque pour une action qui en dépend, la bulle
     du coach EST la question, et la demande d'origine repart après la réponse.
     Sans ça le coach promettrait une carte, puis poserait une question. ── */
  const questionManquante = useCallback((action: AssistantAction, text: string): { texte: string; question: QuestionCliquable } | null => {
    if (!user?.id) return null;
    const besoinDuLieu = action.intent === "create_seance" || action.intent === "plan_set"
      || action.intent === "plan_regen" || action.intent === "plan_ajouter";
    if (!besoinDuLieu) return null;
    const { location, equip } = readLieu(user.id);
    // La demande est mise de côté : elle repart dès qu'on connaît la réponse,
    // qu'elle soit touchée (puce) ou tapée à la main (outil save_lieu).
    if (!location) {
      attenteRef.current = text;
      return { texte: voix(guideRef.current, "question.lieu"), question: { choix: CHOIX_LIEU, genre: "lieu", relance: text } };
    }
    if (location === "maison" && !equip) {
      attenteRef.current = text;
      return { texte: voix(guideRef.current, "question.equip"), question: { choix: CHOIX_EQUIP, genre: "equip", relance: text } };
    }
    return null;
  }, [user?.id]);

  /* ── Envoi d'un message ──
     `masque` : le message part au coach mais ne s'affiche pas. Sert aux
     réponses cliquables, déjà visibles sous la forme de la puce cochée. ── */
  const sendMessage = useCallback(async (text: string, masque?: boolean) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    /* Attendu, et plus seulement lancé. `void ensureContext()` laissait le
       premier message d'une session partir avec `liveStats` et
       `richProfile` encore nuls : le prompt disait alors « Données non
       disponibles » et le coach répondait « aucun repas enregistré » à
       quelqu'un dont le journal était rempli. `open()` l'a en général déjà
       lancé, donc ça n'attend rien dans le cas normal. */
    const contexteCharge = contextePret();

    const userMsg: AssistantMsg = { role: "user", content: trimmed, id: uid(), ...(masque ? { masque: true } : {}) };
    const assistantId = uid();
    setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "", id: assistantId, streaming: true }]);
    setIsStreaming(true);

    /* Le plafond du coach est tenu par le SERVEUR (`garderIA`), et son refus
       est rendu par `messageDeRefus` plus bas. Il y avait ici un SECOND
       compteur, en localStorage, qui annonçait « 12 messages par jour » quand
       le vrai plafond gratuit en vaut 5 (`aiQuotas.ts`) : il bloquait donc
       avant l'heure, sur un chiffre que personne d'autre ne connaissait, et il
       se remettait à zéro en vidant son navigateur. */

    /* Le lieu d'entraînement n'est plus DEVINÉ ici. Deux regex tentaient de
       reconnaître qu'un message répondait à la question du tour précédent
       (`coachAskedLieu` + `sniffLieu`), avec les faux positifs que ça suppose.
       Désormais la question est posée en puces : un clic donne une réponse
       structurée, et si l'utilisateur préfère taper, le coach dispose de
       l'outil save_lieu. Plus rien à deviner. */

    // Mémoire long terme uniquement (l'action, elle, est décidée côté serveur
    // dans le même aller-retour que le texte). ⚠️ palier gratuit =
    // 1 req/s, et /api/chat en consomme désormais DEUX à la suite
    // (l'aiguilleur puis le coach) : on décale d'autant cet appel secondaire,
    // dont rien à l'écran ne dépend, pour lui laisser la voie libre.
    const recentContext = messages
      .slice(-4)
      .map((m) => `${m.role === "user" ? "Utilisateur" : "Coach"}: ${m.content}`)
      .join("\n");
    setTimeout(() => { void extractMemory(trimmed, recentContext); }, 2500);

    // On n'envoie que les derniers échanges au modèle (limite la taille de requête
    // → évite le 413 « request too large » sur les longues conversations).
    const history = [...messages, userMsg].slice(-10).map((m) => ({ role: m.role, content: m.content }));

    /* ⚠️ V9A · LE MOTEUR SE RELIT, IL NE SE MET PAS EN CACHE DE SESSION.
       `ensureContext()` charge une fois et ne relit jamais (`dataLoadedRef`)
       : c'est acceptable pour un profil, c'est FAUX pour un programme, dont
       l'état change à chaque séance terminée. Sans ça, le Guide continuerait
       d'annoncer Pull une heure après que Pull a été faite. Le cache d'ici
       est court et `EVT_JOURNEE` le vide, donc toute écriture existante
       rend le message suivant conscient du nouvel état. */
    const moteur = user?.id ? resumeMoteur(await etatMoteur(user.id).catch(() => null)) : null;

    /* ⚠️ MÊME RÈGLE POUR LE JOURNAL ALIMENTAIRE, ET C'EST LE DÉFAUT DU
       2026-09-09. Le contexte de session gardait « 0 kcal, aucun repas »
       pendant que l'écran Nutrition affichait 286 kcal du jour. On relit
       donc la journée (cache court, vidé par `EVT_NUTRITION`) et on
       REMPLACE la part « aujourd'hui » du contexte. Une lecture ratée rend
       `null` et laisse le contexte de session intact : on ne remplace
       jamais une donnée par une absence de donnée. */
    await contexteCharge.catch(() => undefined);
    const nut = user?.id ? await etatNutrition(user.id).catch(() => null) : null;
    const live = nut
      ? { ...(liveStatsRef.current ?? {}), calories: nut.calories, proteins: nut.proteines }
      : liveStatsRef.current;
    /* ⚠️ TOUTES les représentations du jour se remplacent, pas seulement
       les deux évidentes. Défaut du 2026-09-09 (suppression) : `liveStats`
       et `mealsDetail` étaient bien purgés, `nutritionWeek` non, donc la
       moyenne 7 jours comptait encore le repas effacé. Une seule
       représentation oubliée suffit à faire survivre un fait supprimé.

       ⚠️ ET `journalDuJourLu` PORTE LA DIFFÉRENCE ENTRE « JE SAIS QU'IL
       N'Y A RIEN » ET « JE N'AI PAS PU LIRE ». Elle ne vaut vrai que sur
       une lecture fraîche RÉUSSIE (`nut` non nul, journée vide comprise),
       et c'est elle qui autorise le prompt à écrire l'absence. Sans ce
       drapeau, une journée vide et une lecture ratée arrivent au coach
       sous la même forme : rien du tout. */
    const rich = nut
      ? {
          ...(richProfileRef.current ?? {}),
          todayDate: nut.jour,
          journalDuJourLu: true,
          mealsDetail: repasFrais(
            (richProfileRef.current?.mealsDetail as RepasDetail[] | undefined),
            nut,
          ),
          nutritionWeek: semaineFraiche(
            (richProfileRef.current?.nutritionWeek as JourNutrition[] | undefined),
            nut,
          ),
        }
      : richProfileRef.current;

    try {
      const abort = new AbortController();
      abortRef.current = abort;
      const res = await aiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          userContext: userContextRef.current,
          pseudo: user?.pseudo,
          liveStats: live,
          // V9A · le programme, le cycle, les séances datées et l'adaptation,
          // en quelques centaines de caractères. C'est la source unique du
          // coach là-dessus : il n'a aucun outil pour aller la chercher.
          moteur,
          richProfile: rich,
          currentPage: pathname,
          memories: memoriesRef.current,
          memoryEnabled: true,
          // Le prénom et la manière de parler du Guide. Le serveur en tire
          // un bloc de ton COURT ; les règles et les données ne changent pas.
          guide: guideRef.current,
          // Lieu connu → le chat ne redemande pas « salle ou maison ? »
          lieu: user?.id ? (localStorage.getItem(`vaiiya_lieu_${user.id}`) || null) : null,
          lieu_equip: user?.id ? (localStorage.getItem(`vaiiya_lieu_equip_${user.id}`) || null) : null,
        }),
        signal: abort.signal,
      });

      // Refus de quota ou de session : la réponse est un JSON, pas le flux
      // NDJSON. Sans ce filet, la boucle de lecture ci-dessous ne trouverait
      // ni `t` ni `a` et laisserait une bulle vide à l'écran.
      const refus = await messageDeRefus(res);
      if (refus) {
        setMessages((prev) => {
          const next = prev.map((m) => m.id === assistantId
            ? { ...m, content: refus, streaming: false } : m);
          persist(next);
          return next;
        });
        return;
      }

      if (!res.body) throw new Error("No response body");

      /* ── Lecture du flux NDJSON ──
         Une ligne = un événement : `t` un morceau de texte, `a` l'action
         décidée dans le MÊME tour, `e` une erreur. Une ligne illisible est
         traitée comme du texte brut (filet pour les réponses en clair). */
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let action: AssistantAction | null = null;

      const lire = (raw: string) => {
        const l = raw.trim();
        if (!l) return;
        if (l[0] !== "{") { accumulated += l; return; }
        try {
          const ev = JSON.parse(l) as ChatEvent;
          if ("t" in ev) accumulated += ev.t;
          else if ("a" in ev && ev.a?.intent) action = ev.a;
          else if ("e" in ev) accumulated += `\n⚠️ ${ev.e}`;
        } catch { accumulated += l; }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lignes = buffer.split("\n");
        buffer = lignes.pop() ?? "";
        for (const l of lignes) lire(l);
        // `accumulated` reste BRUT (les tags historiques sont relus plus bas) :
        // on ne nettoie que ce qui s'affiche, sinon une balise clignoterait le
        // temps d'un chunk.
        const enCours = sansBalises(accumulated).replace(BALISE_EN_COURS, "");
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: enCours, streaming: true } : m));
      }
      if (buffer) lire(buffer);

      // Filets pour les anciens tags : ils ne devraient plus arriver (le coach
      // appelle open_page / save_lieu), mais un modèle peut encore en écrire un.
      const lieuMatch = accumulated.match(/\[LIEU_UPDATE\]\s*(salle|maison)\s*\[\/LIEU_UPDATE\]/i);
      if (lieuMatch && user?.id) {
        void persistLieu(user.id, { location: lieuMatch[1].toLowerCase() as "salle" | "maison" });
      }

      let cleaned = stripMemoryTags(accumulated)
        .replace(/\[PROGRAMME_UPDATE\][\s\S]*?\[\/PROGRAMME_UPDATE\]/gi, "")
        .replace(/\[LIEU_UPDATE\][\s\S]*?\[\/LIEU_UPDATE\]/gi, "")
        .replace(/\[NAV\][\s\S]*?\[\/NAV\]/gi, "");
      // Les balises ci-dessus emportent leur contenu (c'était de la donnée) ;
      // celles que le modèle invente encadrent une vraie phrase, on garde donc
      // le texte et on ne retire que les crochets.
      cleaned = sansBalises(cleaned).trim();

      // `action` n'est renseignée que dans une closure : TypeScript ne suit pas
      // cette affectation et la croit toujours nulle. Le cast rétablit son vrai
      // type pour les branches ci-dessous.
      const recue = action as AssistantAction | null;

      // Une information nous manque pour agir → la bulle EST la question, et
      // l'action attend. Le coach ne promet donc jamais une carte qu'il ne
      // peut pas encore préparer.
      const manque = recue ? questionManquante(recue, trimmed) : null;
      let questionAttachee: QuestionCliquable | undefined;

      if (manque) {
        cleaned = manque.texte;
        questionAttachee = manque.question;
      } else if (recue) {
        // Question posée par le modèle lui-même : la bulle DOIT être cette
        // question et pas la phrase du coach, sinon les puces répondraient à
        // autre chose que ce qui est écrit au-dessus d'elles.
        if (recue.intent === "ask_choice") {
          const choix = normaliserChoix(recue.choix);
          if (choix.length >= 2) {
            questionAttachee = { choix, genre: "libre" };
            cleaned = voixAction(guideRef.current, recue);
          }
        }
        // Filet : le coach parle normalement sur ces tours depuis que la
        // décision d'action est sortie de son prompt, mais un flux coupé ou
        // un refus laisserait une bulle vide.
        if (!cleaned) cleaned = voixAction(guideRef.current, recue);
      }

      // Ni texte ni action : ça ne doit JAMAIS passer inaperçu. Une version
      // précédente supprimait la bulle vide, du coup l'utilisateur envoyait un
      // message et il ne se passait rien du tout, sans la moindre explication.
      if (!cleaned) cleaned = voix(guideRef.current, "panne.sans_reponse");

      setMessages((prev) => {
        const next = prev.map((m) => m.id === assistantId
          ? {
              ...m,
              content: cleaned,
              streaming: false,
              // Le ton se déduit de ce qu'on VIENT de décider, pas du texte :
              // une bulle qui porte une question est une bulle qui écoute.
              ton: (questionAttachee ? "listen" : "explain") as TonGuide,
              ...(questionAttachee ? { question: questionAttachee } : {}),
            }
          : m);
        persist(next);
        return next;
      });

      // L'action ne part que si rien ne manque. Sinon elle repartira toute
      // seule après la réponse (`relance`).
      if (recue && !manque) void runAction(recue, trimmed);

      const navMatch = accumulated.match(/\[NAV\]\s*([^[\]]+?)\s*\[\/NAV\]/i);
      if (navMatch) {
        const route = resolveNavTarget(navMatch[1]);
        if (route && route !== pathname) setTimeout(() => router.push(route), 700);
      }
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "AbortError") return;
      setMessages((prev) => prev.map((m) => m.id === assistantId
        ? { ...m, content: voix(guideRef.current, "panne.erreur"), streaming: false, ton: "explain" as const } : m));
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [messages, isStreaming, user, pathname, router, contextePret, persist, extractMemory, runAction, questionManquante]);

  // `runAction` relance une demande mise en attente sans dépendre de
  // `sendMessage`, défini après lui (et qui dépend de lui).
  useEffect(() => { sendRef.current = sendMessage; }, [sendMessage]);

  /* ── Réponse à une question cliquable ──
     La puce touchée reste affichée, cochée ; les autres disparaissent. On ne
     crée PAS de bulle utilisateur : la réponse est déjà lisible sur la puce,
     l'écrire une seconde fois dirait deux fois la même chose. Le coach, lui,
     reçoit bien la réponse (message masqué).

     Pour le lieu, la réponse est ENREGISTRÉE avant de relancer : le coach du
     tour suivant le connaît déjà et ne repose pas la question. C'est ce qui
     remplace les anciennes regex qui devinaient. ── */
  const repondreQuestion = useCallback((msgId: string, choix: string) => {
    if (isStreaming) return;
    const cible = messages.find((m) => m.id === msgId);
    const q = cible?.question;
    if (!q || q.repondu) return; // on ne répond qu'une fois

    setMessages((prev) => {
      const next = prev.map((m) => m.id === msgId && m.question
        ? { ...m, question: { ...m.question, repondu: choix } }
        : m);
      persist(next);
      return next;
    });

    const relance = q.relance ?? "";

    if (q.genre === "lieu" && user?.id) {
      const location = /salle/i.test(choix) ? "salle" : "maison";
      void persistLieu(user.id, { location });
      // Une seule question à la fois : le matériel n'arrive qu'ICI, une fois
      // le lieu connu, et jamais en même temps que la première question.
      if (location === "maison" && !readLieu(user.id).equip) {
        setMessages((prev) => [...prev, {
          role: "assistant" as const, content: voix(guideRef.current, "question.equip"), id: uid(),
          question: { choix: CHOIX_EQUIP, genre: "equip" as const, relance }, ton: "listen" as const,
        }]);
        return;
      }
      attenteRef.current = null;
      if (relance) sendMessage(relance, true);
      return;
    }

    if (q.genre === "equip" && user?.id) {
      void persistLieu(user.id, { equip: /halt/i.test(choix) ? "halteres" : "poids" });
      attenteRef.current = null;
      if (relance) sendMessage(relance, true);
      return;
    }

    /* V9B · « Laquelle ? » : la réponse désigne une INTENTION, pas une
       phrase. On relit la ligne en base par son identifiant — la question
       survit donc à un rechargement — et on ouvre la carte. Toujours
       aucune écriture : c'est le bouton violet qui écrit. */
    if (q.genre === "cible" && user?.id && q.suite) {
      const trouve = (q.cibles ?? []).find((c) => c.choix === choix);
      if (!trouve) return;
      const suite = q.suite;
      const compte = user.id;
      void lireIntention(compte, trouve.id).then((intention) => {
        if (intention) void preparerSurCible(intention, suite);
      });
      return;
    }

    /* V9C · « À la place » ou « en plus » ? La réponse ne repart PAS au
       modèle : elle choisit laquelle des deux branches ouvrir, à partir de
       la demande d'origine portée par la question. Renvoyer trois mots à
       l'aiguilleur lui ferait re-décider une action sans son contexte,
       c'est-à-dire rouvrir l'ambiguïté qu'on vient de lever. */
    if (q.genre === "portee" && q.substitution) {
      const charge = q.substitution;
      if (/place/i.test(choix)) {
        void preparerSubstitution(charge);
      } else {
        void preparePlanAction(
          { intent: "plan_ajouter", when: charge.when ?? undefined, description: charge.quoi ?? undefined },
          charge.quoi ?? "",
        );
      }
      return;
    }

    /* V9C bis · « Laquelle de ces deux séances ? » La réponse désigne une
       SOURCE, qu'on relit avant de composer quoi que ce soit, puis on
       rejoue exactement la demande d'origine avec elle. Aucune écriture
       ici non plus : c'est le bouton violet qui écrit. */
    if (q.genre === "contenu" && user?.id && q.demande) {
      const trouve = (q.contenus ?? []).find((c) => c.choix === choix);
      if (!trouve) return;
      const demande = q.demande;
      const compte = user.id;
      const premium = !!(user.is_premium || user.is_admin);
      void contenuParRef(compte, trouve.ref, premium).then((contenu) => {
        if (!contenu) return;
        if (demande.intent === "etape_substituer") {
          void preparerSubstitution(
            { etape: demande.etape ?? null, quoi: demande.quoi ?? null, when: demande.when ?? null },
            contenu,
          );
        } else {
          void preparePlanAction(demande, demande.description ?? demande.title ?? "", contenu);
        }
      });
      return;
    }

    // Question libre du coach : sa réponse repart telle quelle.
    sendMessage(choix, true);
  }, [messages, isStreaming, user?.id, user?.is_premium, user?.is_admin, persist, sendMessage, preparerSurCible, preparerSubstitution, preparePlanAction]);

  /* ── Contrôles ── */
  const open = useCallback((prefill?: string) => {
    setIsOpen(true);
    void contextePret();
    /* V9A · on remplit le cache du moteur pendant que la feuille s'ouvre,
       donc AVANT le premier message. Sans ça, la première phrase paierait
       les lectures ; ici elles se font pendant qu'on tape. Un échec ne
       coûte rien : `sendMessage` relit. */
    const qui = user?.id;
    if (qui) void etatMoteur(qui).catch(() => null);
    if (prefill && prefill.trim()) sendMessage(prefill);
  }, [contextePret, sendMessage, user?.id]);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const clear = useCallback(() => {
    setMessages([]);
    if (historyKey) {
      try { sessionStorage.removeItem(historyKey); } catch { /* ignore */ }
      try { localStorage.removeItem(historyKey); } catch { /* ignore */ }
    }
  }, [historyKey]);

  /* ── Ranger une séance dans la bibliothèque ──
     Sortie de `confirmSeance` parce qu'elle sert aussi APRÈS coup : une séance
     lancée depuis la carte n'est enregistrée nulle part, et le tunnel propose
     de la garder une fois terminée (même carte « Tu la gardes ? » que l'impro).
     Sans ça, on jette le travail à l'instant où il vient de faire ses preuves. */
  const garderSeance = useCallback(async (s: ProposedSeance): Promise<boolean> => {
    if (!user?.id) return false;
    // Filet : le plafond gratuit se voit déjà sur la carte, mais une séance
    // lancée puis gardée en fin de tunnel repasse par ici longtemps après.
    if (await verifierPlaces()) return false;
    const { error } = await createClient().from("custom_sessions").insert(seanceToRow(s, user.id));
    return !error;
  }, [user?.id, verifierPlaces]);

  /* ── Validation de la carte séance ──
     Une SEULE validation fait tout : la séance rejoint la bibliothèque, et si
     un jour a été choisi sur la carte, elle est posée dessus dans la foulée
     (liée par `sessionId`, même plomberie que « poser une séance de la
     biblio »). Avant, il fallait créer, PUIS répondre à une deuxième carte qui
     demandait quand la faire — deux cartes pour une seule intention. ── */
  const confirmSeance = useCallback(async (jour?: string | null) => {
    if (!user?.id || !pendingSeance) return;
    const s = pendingSeance;
    if (await verifierPlaces()) {
      setMemoryNotice(`Tes ${PLANS.free.limits.sessionsMax} séances gardées sont prises. Libère une place, ou passe en Premium.`);
      return;
    }
    const ok = await garderSeance(s);
    if (!ok) { setMemoryNotice("Oups, impossible de garder la séance."); return; }
    // La séance est gardée : c'est une action validée qui aboutit, le Guide
    // le montre quelques secondes. Jamais sur l'échec, évidemment.
    setReussite((n) => n + 1);

    if (!jour) {
      setPendingSeance(null);
      setMemoryNotice(`« ${s.title} » est dans tes séances ✓`);
      return;
    }

    const category = normalizeWorkoutCategory(s.category);
    const saved = readLieu(user.id);
    try {
      /* ⚠️ V9C · ELLE NE CONSTITUE PLUS UN ÉCRIVAIN CACHÉ. Cette fonction
         appelait `saveDay` directement, donc elle décidait toute seule
         quelle ligne du jour serait réécrite — exactement le second moteur
         de planning que V9B a sorti de `confirmPlan`. Et elle ne posait
         même pas la question : `saveDay` sans `id` laissait `poser` choisir
         sa cible, ce que la vague précédente a passé un correctif entier à
         supprimer. On résout ICI, avec la règle unique, et on confie
         l'écriture à l'autorité qui sait la faire. `AssistantContext`
         déclare des gestes, il n'écrit pas. */
      const jourVise = await lireJour(user.id, jour);
      const cible = cibleRemplacable(jourVise);
      const pose: PlanningDay = {
        id: cible?.id ?? null,
        date: jour,
        type: PLANNING_TYPE_BY_CATEGORY[category] ?? "Force",
        title: s.title,
        difficulty: normalizeDifficulty(s.difficulty),
        location: ctxFromLieu(saved.location, saved.equip),
        exerciseList: normalizeExercises(s.exerciseList),
        sessionId: s.id,
        status: "planned",
      };
      await appliquerGeste(user.id, cible ? { type: "remplacer", jour: pose } : { type: "ajouter", jour: pose }, "guide");
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("programme-updated", { detail: { date: jour } }));
      setPendingSeance(null);
      setMemoryNotice(`Gardée et programmée · ${dayLabelLong(jour)} ✓`);
      setTimeout(() => setIsOpen(false), 1100);
    } catch {
      // La séance EST gardée : on ne fait pas croire l'inverse, on ne signale
      // que ce qui a raté.
      setPendingSeance(null);
      setMemoryNotice("Gardée, mais impossible de la programmer.");
    }
  }, [user?.id, pendingSeance, garderSeance, verifierPlaces]);

  const cancelSeance = useCallback(() => setPendingSeance(null), []);

  /* ── Les 7 prochains jours, avec ce qui y est déjà prévu ──
     Le choix « quand ? » doit dire ce qu'il va écraser AVANT le clic, et ne
     jamais proposer un jour passé ni une séance déjà faite. ── */
  const chargerJours = useCallback(async (): Promise<JourDispo[]> => {
    if (!user?.id) return [];
    const dates = prochainsJours(7);
    let map: Record<string, PlanningDay[]> = {};
    try { map = await fetchRange(user.id, dates); } catch { /* planning illisible → jours nus */ }
    return dates.map((d, i) => {
      /* ⚠️ « OCCUPÉ » NE VEUT PLUS DIRE « PRIS » (V6b) : la journée peut
         en porter une seconde. On nomme ce qui s'y trouve, et on ne
         bloque que ce qui est FAIT, qu'on ne réécrit jamais. */
      const tete = principale(map[d]);
      return {
        ymd: d,
        label: i === 0 ? "Aujourd’hui" : i === 1 ? "Demain" : CAP(dayLabel(d)).slice(0, 3) + ". " + Number(d.slice(8)),
        occupe: hasSeance(tete) ? dayTitle(tete) : null,
        bloque: (map[d] ?? []).every((i2) => i2.status === "done") && (map[d] ?? []).length > 0,
      };
    });
  }, [user?.id]);

  /* ── Changer le jour visé par une carte planning ──
     Les exercices ne bougent pas, seule la date change : régénérer une séance
     parce qu'on la décale d'un jour serait absurde (et coûterait un appel IA).

     ⚠️ MAIS CHANGER DE JOUR CHANGE LA LIGNE QU'ON VISE, ET C'ÉTAIT LE TROU.
     L'ancienne version déplaçait les dates à écrire, laissait le « à la place
     de » vide, et l'identité de la cible se décidait à l'écriture — donc la
     carte pouvait annoncer autre chose que ce qui allait s'écrire. On relit
     donc la journée d'arrivée. En attendant sa réponse, la carte ne prétend
     rien : conséquence vide, et un geste qui AJOUTE, c'est-à-dire qui ne
     détruit rien. ── */
  const retargetPlan = useCallback((ymd: string) => {
    const compte = idPlanning;
    setPendingPlan((prev) => (prev?.preview && prev.preview.date !== ymd
      ? recalerCarte(prev, ymd, null, null, false)
      : prev));
    if (!compte) return;
    void lireJour(compte, ymd).then((jour) => {
      setPendingPlan((prev) => (prev?.preview?.date === ymd
        ? recalerCarte(prev, ymd, cibleRemplacable(jour), jour.find(vientDuProgramme) ?? null, true)
        : prev));
    }).catch(() => { /* jour illisible : la carte reste en « ajouter », qui ne détruit rien */ });
  }, [idPlanning]);

  /* ── Validation de la carte planning ──
     ⚠️ ELLE N'ÉCRIT PLUS RIEN ELLE-MÊME (V9B), ET C'EST LE POINT DE LA
     REFONTE. Cette fonction décidait quoi libérer, avec quelle portée, et
     quelle ligne réécrire : un second moteur de planning caché dans un
     contexte React, c'est-à-dire une règle que personne ne relit. C'est ce
     qui a laissé vivre les deux défauts de la vague. Elle résout désormais
     le geste confirmé, le confie à l'autorité qui sait l'écrire, et ne
     s'occupe plus que de l'écran. V9C pourra ajouter un geste sans rouvrir
     un moteur ici. ── */
  const confirmPlan = useCallback(async (garderAussi?: boolean) => {
    if (!user?.id || !pendingPlan) return;
    try {
      /* C'est le Guide qui pose ces lignes : elles sont donc protégées de
         la prochaine régénération automatique, comme celles posées à la
         main. On transporte la date visée → le planning saute sur la bonne
         semaine pour que la modification se voie. */
      const focusDate = await appliquerGeste(user.id, pendingPlan.geste, "guide") ?? pendingPlan.preview?.date ?? null;
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("programme-updated", { detail: { date: focusDate } }));

      // « La garder aussi » : la séance générée pour ce jour rejoint la
      // bibliothèque, sinon elle n'existerait QUE sur cette case du planning.
      let gardee = false;
      const p = pendingPlan.preview;
      if (garderAussi && p && p.exerciseList.length > 0) {
        const seance = assembleSeance({
          title: p.title || pendingPlan.title,
          category: normalizeWorkoutCategory(p.type),
          difficulty: normalizeDifficulty(p.difficulty),
          muscles: [],
          rawExercises: p.exerciseList,
        });
        const { error } = await createClient().from("custom_sessions").insert(seanceToRow(seance, user.id));
        gardee = !error;
      }
      setPendingPlan(null);
      setReussite((n) => n + 1);
      setMemoryNotice(gardee ? "Planning mis à jour, séance gardée ✓" : "Planning mis à jour ✓");
      setTimeout(() => setIsOpen(false), 900);
    } catch {
      setMemoryNotice("Oups, impossible de mettre à jour le planning.");
    }
  }, [user?.id, pendingPlan]);

  /* ── V9C · LES DEUX FACES D'UNE SUBSTITUTION ──

     ⚠️ « EN PLUS, SANS TOUCHER À PULL » EST LA SECONDE SORTIE EXIGÉE PAR
     LA DÉCISION 1 DE V9, et elle bascule DANS LA CARTE, sans rien relire.
     Les deux faces portent le même contenu ; ce qui change, c'est
     l'identité de programme (`etapeId`) et donc ce que le geste fait au
     cycle. On garde la bascule dans les deux sens : un clic de trop ne
     doit pas coûter la proposition. ── */
  const basculerEnPlus = useCallback(() => {
    setPendingPlan((prev) => {
      if (!prev?.substitution) return prev;
      const { etapeNom, apresNom, jour } = prev.substitution;
      if (prev.geste.type === "substituer") {
        /* ⚠️ ON RETIRE TOUTE L'IDENTITÉ DE PROGRAMME, PAS SEULEMENT
           `etapeId`. Une ligne qui garderait `programmeId` sans étape
           serait un lien à moitié écrit, et `lienProgramme` la
           ramènerait à trois colonnes nulles de toute façon : autant que
           l'objet dise ce qu'il est. */
        const supp: PlanningDay = { ...jour, id: null, programmeId: null, etapeId: null, provenanceId: null };
        return {
          ...prev,
          kicker: `En plus · ${CAP(dayLabelLong(supp.date))}`,
          cta: `Ajouter ${jourCourt(supp.date)}`,
          consequence: consequenceSupplement(etapeNom),
          geste: { type: "ajouter", jour: supp },
          preview: supp,
          forcerAjout: true,
        };
      }
      return {
        ...prev,
        kicker: `À la place de « ${etapeNom} »`,
        cta: "Faire ça à la place",
        consequence: consequenceSubstitution(etapeNom, apresNom),
        geste: { type: "substituer", jour },
        preview: jour,
        forcerAjout: false,
      };
    });
  }, []);

  const cancelPlan = useCallback(() => setPendingPlan(null), []);

  /* ── Validation de la recette : la logge dans les repas du jour (même
     plomberie que la nutrition — une portion, macros de la recette). ── */
  const confirmRecipe = useCallback(async () => {
    if (!user?.id || !pendingRecipe) return;
    const supabase = createClient();
    const now = new Date();
    const { error } = await supabase.from("nutrition_logs").insert({
      user_id: user.id,
      // Le jour LOCAL, celui qu'ecrit l'ecran Nutrition. En UTC, un repas
      // note entre minuit et 2 h du matin atterrissait la VEILLE, donc
      // invisible sur le journal du jour.
      date: localDateStr(now),
      meal_type: "dejeuner",
      food_name: pendingRecipe.nom,
      description: null,
      calories: pendingRecipe.calories,
      proteins: pendingRecipe.proteins,
      carbs: pendingRecipe.carbs,
      fats: pendingRecipe.fats,
      has_photo: false,
      time: now.toTimeString().slice(0, 8),
    });
    if (error) { setMemoryNotice("Oups, impossible d’ajouter le repas."); return; }
    signalerRepas();
    const nom = pendingRecipe.nom;
    setPendingRecipe(null);
    setReussite((n) => n + 1);
    setMemoryNotice(`« ${nom} » ajouté à tes repas ✓`);
    setTimeout(() => { setIsOpen(false); router.push("/nutrition"); }, 900);
  }, [user?.id, pendingRecipe, router]);

  const cancelRecipe = useCallback(() => setPendingRecipe(null), []);

  /* ── Validation d'un repas raconté : l'écrit dans le journal du jour (même
     plomberie que la nutrition — le moment déduit, les macros estimées). ── */
  const confirmMeal = useCallback(async () => {
    if (!user?.id || !pendingMeal) return;
    const supabase = createClient();
    const now = new Date();
    const { error } = await supabase.from("nutrition_logs").insert({
      user_id: user.id,
      // Le jour LOCAL, celui qu'ecrit l'ecran Nutrition. En UTC, un repas
      // note entre minuit et 2 h du matin atterrissait la VEILLE, donc
      // invisible sur le journal du jour.
      date: localDateStr(now),
      meal_type: pendingMeal.mealType,
      food_name: pendingMeal.foodName,
      description: null,
      calories: pendingMeal.calories,
      proteins: pendingMeal.proteins,
      carbs: pendingMeal.carbs,
      fats: pendingMeal.fats,
      has_photo: false,
      time: now.toTimeString().slice(0, 8),
    });
    if (error) { setMemoryNotice("Oups, impossible d’ajouter le repas."); return; }
    signalerRepas();
    const nom = pendingMeal.foodName;
    setPendingMeal(null);
    setReussite((n) => n + 1);
    setMemoryNotice(`« ${nom} » ajouté à tes repas ✓`);
    setTimeout(() => { setIsOpen(false); router.push("/nutrition"); }, 900);
  }, [user?.id, pendingMeal, router]);

  const cancelMeal = useCallback(() => setPendingMeal(null), []);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  /* La réaction du Guide à une réussite retombe seule, sur la même durée
     que la pastille qui l'accompagne : les deux disent la même chose, ils
     doivent partir ensemble. */
  useEffect(() => {
    if (reussite === 0) return;
    const t = setTimeout(() => setReussite(0), 3400);
    return () => clearTimeout(t);
  }, [reussite]);

  /* ── LE VISAGE DU GUIDE ────────────────────────────────────────────────
     Il se déduit ICI, parce que c'est ici que vivent TOUS les signaux :
     l'écran ne fait que l'afficher, il n'a rien à décider.

     ⚠️ AUCUN DE CES TESTS NE REGARDE LE TEXTE D'UN MESSAGE. Chercher un
     point d'interrogation pour savoir si le Guide attend une réponse, ou
     un mot d'encouragement pour savoir s'il félicite, serait faux dans les
     deux sens : faux le jour où le modèle formule autrement, faux dès
     qu'une phrase contient une question rhétorique. Les vrais signaux
     existent déjà et ils sont exacts, parce que c'est nous qui les
     écrivons : `streaming` pendant le flux, `actionLoading` pendant une
     génération, `ton` posé sur la bulle à sa création, `reussite` posé par
     les validations. On ne lit que ça.

     L'ordre compte, du plus immédiat au plus durable : ce qui se passe
     maintenant l'emporte sur ce qui vient de se passer, qui l'emporte sur
     la dernière chose dite. */
  const etatGuide: EtatGuide = useMemo(() => {
    // 1. Il travaille : réponse en cours de flux, ou génération en cours.
    if (isStreaming || actionLoading) return "think";
    // 2. Quelque chose vient d'aboutir. Court, quelques secondes.
    if (reussite > 0) return "encourage";
    // 3. Il attend quelque chose de TOI. Trois formes, toutes structurées :
    //    une question posée par le code et pas encore répondue, une carte
    //    posée sur la table qui attend un clic, ou un brouillon en cours de
    //    frappe. C'est ce point qui a fait sortir `listen` de sa niche : il
    //    n'apparaissait qu'au moment où le lieu d'entraînement manquait,
    //    donc une fois dans la vie d'un compte.
    if (saisie) return "listen";
    if (pendingSeance || pendingPlan || pendingRecipe || pendingMeal) return "listen";
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "assistant") continue;
      if (m.question && !m.question.repondu) return "listen";
      break;
    }
    // 4. Sinon, ce qu'il faisait dans sa dernière bulle.
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "assistant") continue;
      return m.ton ?? "explain";
    }
    // 5. Aucune bulle du Guide : la conversation n'a pas commencé.
    return "welcome";
  }, [isStreaming, actionLoading, reussite, saisie, pendingSeance, pendingPlan, pendingRecipe, pendingMeal, messages]);

  // La notice mémoire ("Je m'en souviendrai") s'efface seule
  useEffect(() => {
    if (!memoryNotice) return;
    const t = setTimeout(() => setMemoryNotice(null), 3400);
    return () => clearTimeout(t);
  }, [memoryNotice]);

  return (
    <Ctx.Provider value={{ isOpen, open, close, toggle, clear, messages, isStreaming, sendMessage, repondreQuestion, pseudo: user?.pseudo, memoryNotice, pendingSeance, pendingPlan, pendingRecipe, pendingMeal, actionLoading, etatGuide, noterSaisie: setSaisie, bibliothequePleine, confirmSeance, garderSeance, cancelSeance, confirmPlan, basculerEnPlus, retargetPlan, cancelPlan, chargerJours, confirmRecipe, cancelRecipe, confirmMeal, cancelMeal }}>
      {children}
    </Ctx.Provider>
  );
}

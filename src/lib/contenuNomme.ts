/* ════════════════════════════════════════════════════════════════════
   contenuNomme — QUAND ON NOMME UNE SÉANCE, C'EST CELLE-LÀ QU'ON VEUT.

   Défaut réel trouvé par Louis le 2026-09-10, au premier essai de V9C :
   « remplace ma séance d'aujourd'hui par Express 12 » a produit une carte
   « Force Express Maison » de 6 mouvements. Express 12 existe pourtant,
   elle en porte 5, dont un chronométré. Le Guide avait donc compris
   l'intention et perdu l'objet.

   ⚠️ LA CAUSE N'EST PAS UN MAUVAIS APPARIEMENT, C'EST UNE ABSENCE
   D'APPARIEMENT. `plan_set` n'a JAMAIS cherché à reconnaître une séance
   existante : il transmet la demande à `/api/workout/generate`, qui
   compose une séance neuve et lui invente un titre. « Express 12 » n'est
   jamais devenu autre chose qu'un bout de phrase envoyé à un générateur.

   D'où ce fichier, et une règle : UNE IDENTITÉ CHOISIE DONNE UN CONTENU
   EXACT. On reprend la source telle qu'elle est (son titre réel, sa liste
   de mouvements, leur ordre, leurs séries, leurs répétitions, leurs temps),
   et aucun générateur ne reconstruit quelque chose de « similaire ».

   ⚠️ ET LA DÉCISION EST PURE, LA LECTURE EST À CÔTÉ, comme partout dans
   ce chantier : `candidatsParNom` ne lit rien et n'écrit rien, donc la
   règle de reconnaissance se vérifie hors ligne sur une app pourtant
   auth-gated.

   ⚠️ DEUX FORCES, ET CE N'EST PAS UN RÉGLAGE DE CONFORT.
     · `exacte` sert aux gestes qui DÉCRIVENT ce qu'ils veulent
       (`plan_set`, `plan_ajouter`) : là, le défaut légitime est de
       générer, et seule une demande qui EST le nom d'une séance a le
       droit de prendre le dessus. « du dos » doit continuer de générer.
     · `large` sert aux gestes qui DÉSIGNENT (`plan_library`, le contenu
       d'une substitution) : là, générer n'a jamais été une option, donc
       « ma séance Pompes » a le droit de reconnaître « Pompes ».

   ⚠️ ON NE TRANCHE JAMAIS UNE AMBIGUÏTÉ TOUT SEUL. Deux séances portent
   le même nom : on demande laquelle. L'ancien code faisait `.limit(1)`
   sur la plus récemment modifiée, c'est-à-dire qu'il choisissait en
   silence à la place de quelqu'un.
   ════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase";
import {
  normalizeCategory as normalizeWorkoutCategory, normalizeDifficulty,
  type WorkoutCategory, type WorkoutDifficulty,
} from "@/lib/assistantActions";
import type { Exercise } from "@/components/WorkoutGuideModal";

/* ═══════════════════ Ce qu'on rend ═══════════════════ */

export type SourceContenu = "bibliotheque" | "catalogue";

/** Une séance existante, recopiée telle quelle. */
export type ContenuNomme = {
  source: SourceContenu;
  /** `lib:<id>` ou `cat:<slug>` : ce qui permet de revenir à la source. */
  ref: string;
  /** Le titre RÉEL de la source, jamais les mots de la demande. */
  title: string;
  category: WorkoutCategory;
  difficulty: WorkoutDifficulty;
  /** Sa liste exacte, dans son ordre. */
  exerciseList: Exercise[];
  /**
   * `custom_sessions.id` quand la séance vient de SA bibliothèque, `null`
   * quand elle vient du catalogue.
   *
   * ⚠️ ET IL N'EXISTE AUCUNE COLONNE POUR TRACER UNE SÉANCE DU CATALOGUE,
   * vérifié avant d'en inventer une. `session_id` porte une clé étrangère
   * vers `custom_sessions` (posée le 2026-06-19), donc un slug y est
   * refusé par la base : c'est exactement le défaut muet de « Ajouter à
   * ma semaine » trouvé en V6b, et `refModele` le filtre depuis. Et
   * `programme_seance_id` désigne une étape du CYCLE : y écrire un slug de
   * catalogue ferait mentir le moteur de programme. La provenance d'une
   * séance du catalogue vit donc là où elle a toujours vécu : dans
   * l'intention elle-même, qui porte son titre et sa liste et se relance
   * sans rien demander à personne (règle V6b, l'intention est
   * auto-suffisante). Le titre suffit d'ailleurs à `resolveSessionId`
   * pour retrouver ses animations, des années plus tard.
   */
  sessionId: string | null;
};

export type ResolutionContenu =
  | { ok: true; contenu: ContenuNomme }
  | { ok: false; raison: "aucune" }
  | { ok: false; raison: "ambigu"; candidats: ContenuNomme[] };

/** Un contenu, plus les noms sous lesquels on accepte de le reconnaître. */
export type EntreeContenu = { alias: string[]; contenu: ContenuNomme };

export type ForceNom = "exacte" | "large";

/* ═══════════════════ La copie, sans rien inventer ═══════════════════ */

/**
 * Recopie une liste d'exercices SANS lui ajouter ce qu'elle n'a pas.
 *
 * ⚠️ CE N'EST PAS `normalizeExercises`, ET LA DIFFÉRENCE EST LE SUJET DE
 * CETTE VAGUE. Celle-là existe pour rattraper une sortie de LLM ou une
 * ligne Supabase de forme inconnue, donc elle COMBLE : `rest` absent vaut
 * 60, `restAfter` absent vaut 90. Passer une séance du catalogue dedans
 * la modifie : Express 12 ne déclare aucun `restAfter` (aucune des 53
 * séances du catalogue n'en déclare), donc elle y gagnerait 90 secondes de
 * transition entre chacun de ses 5 mouvements, soit plus de six minutes
 * sur une séance qui en annonce douze. Et son `auto: 30` disparaîtrait,
 * donc son chrono ne partirait plus.
 *
 * Ici on ne fait que sécuriser la FORME : ce qui est déclaré est gardé,
 * ce qui ne l'est pas reste absent.
 */
export function copierExercices(raw: unknown): Exercise[] {
  if (!Array.isArray(raw)) return [];
  const out: Exercise[] = [];
  for (const x of raw) {
    const e = (x ?? {}) as Record<string, unknown>;
    const nom = String(e.name ?? "").trim();
    if (!nom) continue;
    const copie: Exercise = {
      name: nom,
      sets: Number.isFinite(Number(e.sets)) ? Number(e.sets) : 1,
      reps: String(e.reps ?? ""),
      rest: Number.isFinite(Number(e.rest)) ? Number(e.rest) : 0,
      tip: typeof e.tip === "string" ? e.tip : "",
      benefit: typeof e.benefit === "string" ? e.benefit : "",
      muscles: Array.isArray(e.muscles) ? (e.muscles as unknown[]).filter((m): m is string => typeof m === "string") : [],
    };
    if (Number.isFinite(Number(e.restAfter)) && e.restAfter !== undefined && e.restAfter !== null) copie.restAfter = Number(e.restAfter);
    if (Number.isFinite(Number(e.auto)) && e.auto !== undefined && e.auto !== null) copie.auto = Number(e.auto);
    if (typeof e.hiit === "boolean") copie.hiit = e.hiit;
    out.push(copie);
  }
  return out;
}

/* ═══════════════════ La reconnaissance, pure ═══════════════════ */

/** Minuscules, sans accent, espaces compressés, ponctuation neutralisée. */
export function normaliserNom(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/* « ma séance Pompes » désigne « Pompes ». On retire ce qui présente la
   séance, jamais ce qui la nomme : la liste est courte exprès, une liste
   longue finirait par manger le nom lui-même. */
const PRESENTATIONS = ["ma seance", "mes seances", "la seance", "une seance", "seance", "ma", "mon", "la", "le"];

/** Le nom débarrassé de ce qui le présente. */
export function clefDeNom(nom: string): string {
  let cle = normaliserNom(nom);
  for (const p of PRESENTATIONS) {
    if (cle === p) return "";
    if (cle.startsWith(p + " ")) { cle = cle.slice(p.length + 1); break; }
  }
  return cle;
}

/** `aiguille` apparaît-elle dans `botte` sur des MOTS entiers ? */
function contientMot(botte: string, aiguille: string): boolean {
  if (!aiguille || !botte) return false;
  let i = botte.indexOf(aiguille);
  while (i >= 0) {
    const avant = i === 0 || botte[i - 1] === " ";
    const apres = i + aiguille.length === botte.length || botte[i + aiguille.length] === " ";
    if (avant && apres) return true;
    i = botte.indexOf(aiguille, i + 1);
  }
  return false;
}

/**
 * Les séances que ce nom désigne.
 *
 * ⚠️ UN NOM EXACT L'EMPORTE SUR TOUS LES À-PEU-PRÈS, et c'est ce qui rend
 * la règle utilisable : sans ça, « Pompes » deviendrait ambigu dès que
 * « Pompes maîtrisées » existe, alors que la personne a nommé une séance
 * qui existe, mot pour mot.
 */
export function candidatsParNom(nom: string, entrees: EntreeContenu[], force: ForceNom): EntreeContenu[] {
  const cle = clefDeNom(nom);
  if (!cle) return [];

  const parRef = (liste: EntreeContenu[]) => {
    const vus = new Set<string>();
    return liste.filter((e) => (vus.has(e.contenu.ref) ? false : (vus.add(e.contenu.ref), true)));
  };

  const exactes = entrees.filter((e) => e.alias.some((a) => normaliserNom(a) === cle));
  if (exactes.length > 0) return parRef(exactes);
  if (force === "exacte") return [];

  /* Deux sens, et les deux servent : le nom peut contenir le titre
     (« fais Express 12 ce soir ») ou le titre contenir le nom
     (« Pompes » → « Pompes maîtrisées »). Un alias de moins de trois
     lettres ne désigne rien, il ne fait que du bruit. */
  const larges = entrees.filter((e) => e.alias.some((a) => {
    const t = normaliserNom(a);
    return t.length >= 3 && (contientMot(cle, t) || contientMot(t, cle));
  }));
  return parRef(larges);
}

/* ═══════════════════ Les sources, lues une fois ═══════════════════ */

/** Ce qu'une séance du catalogue déclare, hors présentation. */
export type FicheCatalogue = {
  id: string;
  title: string;
  category: WorkoutCategory;
  difficulty: WorkoutDifficulty;
  access?: "free" | "premium";
  contentType?: "article";
};

export type SourcesCatalogue = {
  /** Les fiches du catalogue (titre affiché, catégorie, difficulté, accès). */
  fiches: FicheCatalogue[];
  /** Titre (alias compris) → identifiant de séance. */
  slugs: Record<string, string>;
  /** Identifiant → liste de mouvements. */
  exos: Record<string, Exercise[]>;
};

export type LireCatalogue = () => Promise<SourcesCatalogue>;

/**
 * ⚠️ IMPORT DYNAMIQUE, ET CE N'EST PAS UNE COQUETTERIE. `exerciseData` vit
 * dans `WorkoutGuideModal`, qui importe `useAssistant` : un import statique
 * refermerait un cycle sur le contexte le plus haut de l'app. Le tunnel est
 * déjà monté globalement, donc rien n'est téléchargé en plus. C'est aussi
 * ce qui garde le banc d'essai hors ligne : rien n'est chargé tant qu'on
 * n'appelle pas.
 */
const catalogueParDefaut: LireCatalogue = async () => {
  const [tunnel, catalogue] = await Promise.all([
    import("@/components/WorkoutGuideModal"),
    import("@/lib/catalogueSeances"),
  ]);
  return {
    fiches: catalogue.workoutSessions.map((s) => ({
      id: s.id, title: s.title, category: s.category,
      difficulty: s.difficulty, access: s.access, contentType: s.contentType,
    })),
    slugs: tunnel.SESSION_SLUGS,
    exos: tunnel.exerciseData,
  };
};

/**
 * Les séances du catalogue qu'on a le droit de proposer.
 *
 * ⚠️ `access` EST UN VERROU. Une séance Premium posée sur le planning
 * depuis la conversation serait lançable, donc l'abonnement se contournerait
 * en la NOMMANT. Elle n'est pas « introuvable » par accident : elle est
 * exclue, comme le catalogue l'exclut déjà à l'écran.
 *
 * Les mini-cours (`contentType: "article"`) sortent aussi : ce sont des
 * lectures, elles n'ont aucun mouvement à poser sur un jour.
 */
export function entreesCatalogue(src: SourcesCatalogue, premiumDebloque: boolean): EntreeContenu[] {
  const alias = new Map<string, string[]>();
  for (const [titre, slug] of Object.entries(src.slugs)) {
    const l = alias.get(slug);
    if (l) l.push(titre); else alias.set(slug, [titre]);
  }
  const out: EntreeContenu[] = [];
  for (const fiche of src.fiches) {
    if (fiche.contentType === "article") continue;
    if (fiche.access === "premium" && !premiumDebloque) continue;
    const exos = src.exos[fiche.id];
    if (!exos || exos.length === 0) continue;
    out.push({
      alias: [fiche.title, ...(alias.get(fiche.id) ?? [])],
      contenu: {
        source: "catalogue",
        ref: "cat:" + fiche.id,
        title: fiche.title,
        category: fiche.category,
        difficulty: fiche.difficulty,
        exerciseList: copierExercices(exos),
        sessionId: null,
      },
    });
  }
  return out;
}

export type LigneBiblio = {
  id: string; title: string;
  category: string | null; difficulty: string | null; exercise_list: unknown;
};

export function entreeBibliotheque(row: LigneBiblio): EntreeContenu {
  return {
    alias: [row.title],
    contenu: {
      source: "bibliotheque",
      ref: "lib:" + row.id,
      title: row.title,
      category: normalizeWorkoutCategory(row.category),
      difficulty: normalizeDifficulty(row.difficulty),
      exerciseList: copierExercices(row.exercise_list),
      sessionId: row.id,
    },
  };
}

const COLONNES_BIBLIO = "id, title, category, difficulty, exercise_list";

/** Les séances de SA bibliothèque qui ressemblent à ce nom. */
async function biblioParNom(userId: string, nom: string): Promise<EntreeContenu[]> {
  const cle = clefDeNom(nom);
  if (!cle) return [];
  try {
    /* ⚠️ ON CHERCHE SUR LE NOM DÉBARRASSÉ DE SA PRÉSENTATION, PAS SUR LA
       PHRASE. « ma séance Pompes » cherché tel quel ne trouve rien, et
       c'est justement la formulation que l'aiguilleur est invité à
       transmettre telle qu'elle est dite. Limite connue et assumée :
       `ilike` compare les accents, donc « mobilite » ne trouvera pas
       « Mobilité ». La règle pure re-filtre ensuite ce qui remonte. */
    const { data } = await createClient()
      .from("custom_sessions")
      .select(COLONNES_BIBLIO)
      .eq("user_id", userId)
      .ilike("title", `%${nom.trim()}%`)
      .order("updated_at", { ascending: false })
      .limit(6);
    return ((data ?? []) as LigneBiblio[]).map(entreeBibliotheque);
  } catch {
    /* Bibliothèque illisible : le catalogue reste consultable. On ne
       remplace jamais une lecture ratée par une invention. */
    return [];
  }
}

/**
 * La séance que ce nom désigne, ou pourquoi on n'en est pas sûr.
 *
 * ⚠️ SA BIBLIOTHÈQUE D'ABORD, LE CATALOGUE ENSUITE : « ma séance Pompes »
 * désigne la sienne, pas celle du catalogue qui lui ressemble. En cas
 * d'égalité parfaite entre les deux, on ne choisit pas, on demande.
 */
export async function resoudreSeanceNommee(
  userId: string,
  nom: string,
  force: ForceNom,
  premiumDebloque: boolean,
  lire: LireCatalogue = catalogueParDefaut,
): Promise<ResolutionContenu> {
  if (!clefDeNom(nom)) return { ok: false, raison: "aucune" };

  const biblio = await biblioParNom(userId, nom);
  let catalogue: EntreeContenu[] = [];
  try {
    catalogue = entreesCatalogue(await lire(), premiumDebloque);
  } catch {
    /* Catalogue indisponible : on répond avec ce qu'on a lu, jamais avec
       une séance composée pour l'occasion. */
  }

  const trouves = candidatsParNom(nom, [...biblio, ...catalogue], force);
  if (trouves.length === 0) return { ok: false, raison: "aucune" };
  if (trouves.length === 1) return { ok: true, contenu: trouves[0].contenu };
  return { ok: false, raison: "ambigu", candidats: trouves.map((e) => e.contenu) };
}

/**
 * La séance désignée par une référence déjà choisie.
 *
 * ⚠️ ON RELIT LA SOURCE, ON NE GARDE PAS LES CANDIDATES EN MÉMOIRE. Une
 * question posée doit survivre à un rechargement, sinon elle devient
 * inerte sans rien dire : c'est la leçon du « laquelle ? » de V9B.
 */
export async function contenuParRef(
  userId: string,
  ref: string,
  premiumDebloque: boolean,
  lire: LireCatalogue = catalogueParDefaut,
): Promise<ContenuNomme | null> {
  if (ref.startsWith("cat:")) {
    try {
      const entrees = entreesCatalogue(await lire(), premiumDebloque);
      return entrees.find((e) => e.contenu.ref === ref)?.contenu ?? null;
    } catch { return null; }
  }
  if (!ref.startsWith("lib:")) return null;
  try {
    const { data } = await createClient()
      .from("custom_sessions")
      .select(COLONNES_BIBLIO)
      .eq("user_id", userId)
      .eq("id", ref.slice(4))
      .maybeSingle();
    return data ? entreeBibliotheque(data as LigneBiblio).contenu : null;
  } catch { return null; }
}

/** Comment on nomme une candidate dans la question « laquelle ? ». */
export function libelleContenu(c: ContenuNomme): string {
  return `${c.title} · ${c.source === "bibliotheque" ? "mes séances" : "catalogue"}`;
}

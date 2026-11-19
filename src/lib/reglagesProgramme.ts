/* ════════════════════════════════════════════════════════════════════
   ENTRAÎNEMENT · LOT 3 · LES RÈGLES QUE SUIT VAIIYA

   Quatre règles écrites en phrases sur la vue Programme, et la durée
   visée. Elles vivent toutes sur `contexte_entrainement` (la source
   unique du contexte depuis V3) :
   · `variete`  (R7)   les exercices secondaires changent peu, beaucoup,
                       ou le moins possible ;
   · `rotation`        une même séance alterne lourd, volume, endurance,
                       ou garde les chiffres du volume ;
   · `hausse`          la fin de séance propose de monter, ou ne dit rien ;
   · `prevenir`        « ton dos a travaillé hier », ou rien ;
   · `duree_cible_min` la durée visée : une séance du programme plus
                       longue se raccourcit au lancement (règle de la
                       version courte), sans toucher au programme.

   ⚠️ CHAQUE RÈGLE AGIT VRAIMENT. Une règle affichée qui ne change rien
   serait un mensonge : « quand je manque une séance » n'est donc pas une
   règle ici (le planning la fait glisser, et ce n'est pas réglable).
   ════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase";
import { VARIETE_PAR_DEFAUT, varieteDe, type Variete } from "@/lib/variete";

type Client = ReturnType<typeof createClient>;

export type Rotation = "alterner" | "garder";
export type Hausse = "proposer" | "rien";

export type ReglagesProgramme = {
  variete: Variete;
  rotation: Rotation;
  hausse: Hausse;
  prevenir: boolean;
  /** La durée visée, en minutes ; `null` = pas de limite. */
  dureeMin: number | null;
};

export const REGLAGES_PAR_DEFAUT: ReglagesProgramme = {
  variete: VARIETE_PAR_DEFAUT, rotation: "alterner", hausse: "proposer", prevenir: true, dureeMin: null,
};

/** Une ligne lue → les réglages (pure). Une valeur inconnue vaut le défaut. */
export function reglagesDe(r: Record<string, unknown> | null | undefined): ReglagesProgramme {
  const d = Number(r?.duree_cible_min);
  return {
    variete: varieteDe(r?.variete),
    rotation: r?.rotation === "garder" ? "garder" : "alterner",
    hausse: r?.hausse === "rien" ? "rien" : "proposer",
    prevenir: r?.prevenir === false ? false : true,
    dureeMin: Number.isFinite(d) && d >= 10 && d <= 180 ? Math.round(d) : null,
  };
}

/* ── Les phrases ─────────────────────────────────────────────────────── */

export type CleRegle = "variete" | "rotation" | "hausse" | "prevenir";

export type Regle = {
  cle: CleRegle;
  avant: string;
  apres: string;
  choix: readonly { valeur: string; mot: string }[];
};

/** Les quatre règles, dans l'ordre de l'écran. Le mot est ce qui se lit
 *  dans la phrase ; chaque valeur est une valeur de la base. */
export const REGLES: readonly Regle[] = [
  {
    cle: "variete", avant: "Les exercices secondaires changent ", apres: " d’une fois à l’autre.",
    choix: [{ valeur: "peu", mot: "un peu" }, { valeur: "beaucoup", mot: "beaucoup" }, { valeur: "habituels", mot: "le moins possible" }],
  },
  {
    cle: "rotation", avant: "Une même séance ", apres: ".",
    choix: [{ valeur: "alterner", mot: "alterne lourd, volume et endurance" }, { valeur: "garder", mot: "garde les mêmes chiffres" }],
  },
  {
    cle: "hausse", avant: "Quand un mouvement devient facile, Vaiiya ", apres: ".",
    choix: [{ valeur: "proposer", mot: "me propose de monter" }, { valeur: "rien", mot: "ne propose rien" }],
  },
  {
    cle: "prevenir", avant: "Si une séance reprend une zone travaillée la veille, Vaiiya ", apres: ".",
    choix: [{ valeur: "oui", mot: "me prévient" }, { valeur: "non", mot: "ne dit rien" }],
  },
];

/** La valeur d'une règle, telle que la phrase la nomme. */
export function valeurRegle(r: ReglagesProgramme, cle: CleRegle): string {
  if (cle === "prevenir") return r.prevenir ? "oui" : "non";
  return r[cle];
}

/** Le mot affiché pour une règle. */
export function motRegle(cle: CleRegle, valeur: string): string {
  const regle = REGLES.find((x) => x.cle === cle);
  return regle?.choix.find((c) => c.valeur === valeur)?.mot ?? valeur;
}

/** La valeur suivante, quand on touche le mot (il tourne). */
export function valeurSuivante(cle: CleRegle, valeur: string): string {
  const choix = REGLES.find((x) => x.cle === cle)!.choix;
  const i = choix.findIndex((c) => c.valeur === valeur);
  return choix[(i + 1) % choix.length].valeur;
}

/** La colonne et sa valeur en base, pour une règle. */
export function colonneRegle(cle: CleRegle, valeur: string): Record<string, string | boolean> {
  if (cle === "prevenir") return { prevenir: valeur === "oui" };
  return { [cle]: valeur };
}

/* ── Lecture et écriture ─────────────────────────────────────────────── */

const COLONNE_ABSENTE = new Set(["42703", "PGRST204"]);

/** Les réglages, ou `null` si on ne sait pas. Sans ligne : le défaut. */
export async function lireReglages(userId: string, client?: Client): Promise<ReglagesProgramme | null> {
  try {
    const supabase = client ?? createClient();
    const { data, error } = await supabase
      .from("contexte_entrainement")
      .select("variete, rotation, hausse, prevenir, duree_cible_min")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      /* La migration du lot 3 pas encore passée : tout le monde est au
         défaut pour les trois nouvelles règles. */
      if (COLONNE_ABSENTE.has((error as { code?: string }).code ?? "")) {
        const repli = await supabase.from("contexte_entrainement").select("variete, duree_cible_min").eq("user_id", userId).maybeSingle();
        if (repli.error) return null;
        return reglagesDe(repli.data as Record<string, unknown> | null);
      }
      console.warn("[reglages] illisibles :", error.message);
      return null;
    }
    return reglagesDe(data as Record<string, unknown> | null);
  } catch (e) {
    console.warn("[reglages] illisibles :", e);
    return null;
  }
}

export const EVT_REGLAGES = "vaiiya:reglages-programme";

/** Écrit une ou plusieurs colonnes, et seulement elles. */
export async function ecrireReglages(userId: string, patch: Record<string, string | number | boolean | null>, client?: Client): Promise<boolean> {
  try {
    const supabase = client ?? createClient();
    const { error } = await supabase
      .from("contexte_entrainement")
      .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
    if (error) { console.warn("[reglages] non enregistrés :", error.message); return false; }
    cache = null;
    if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT_REGLAGES));
    return true;
  } catch (e) {
    console.warn("[reglages] non enregistrés :", e);
    return false;
  }
}

/* ── Le hook : une lecture par session, relue après une écriture ── */

let cache: { userId: string; reglages: Promise<ReglagesProgramme | null> } | null = null;

export function reglagesEnCache(userId: string): Promise<ReglagesProgramme | null> {
  if (!cache || cache.userId !== userId) cache = { userId, reglages: lireReglages(userId) };
  return cache.reglages;
}

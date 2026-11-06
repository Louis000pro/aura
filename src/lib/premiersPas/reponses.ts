/* ═══ Les réponses des premiers pas ═══
   Les questions passent AVANT le compte (décision de Louis, 2026-11-05) : tant
   qu'il n'existe pas, les réponses restent sur l'appareil, et rien ne part sur
   le réseau. Une fois le compte créé, elles partent en base et cette copie
   s'efface.

   Les réponses et leurs conversions sont pures : c'est ce qui permet au banc
   de vérifier hors ligne ce qui part dans le profil. */

import type { GuideId } from "@/lib/guides";
import type { OnboardingData } from "@/lib/profilOnboarding";
import type { DietKey } from "@/lib/recipeBank";
import { createClient } from "@/lib/supabase";

export type Aliment = "viande" | "porc" | "poisson" | "oeufs" | "lait" | "gluten";

export type EtatParcours = {
  guide: GuideId | null;
  prenom: string;
  buts: string[];
  niveau: string | null;
  lieu: "salle" | "maison" | "deux" | null;
  equip: "poids" | "halteres" | null;
  /** Les jours choisis : 0 = lundi. */
  jours: number[];
  duree: number;
  accord: boolean;
  age: number;
  genre: string | null;
  taille: number;
  poids: number;
  sans: Aliment[];
  /** La semaine composée : une séance ou rien, sur les sept prochains jours. */
  semaine: (string | null)[] | null;
  /** Le jour où elle a été composée : la ligne 0, c’est aujourd’hui. */
  semaineLe: string | null;
  rappels: boolean | null;
  source: string | null;
};

export const etatVide = (): EtatParcours => ({
  guide: null, prenom: "", buts: [], niveau: null, lieu: null, equip: null, jours: [], duree: 30,
  accord: false, age: 28, genre: null, taille: 170, poids: 70, sans: [], semaine: null,
  semaineLe: null, rappels: null, source: null,
});

const CLE = "vaiiya_premiers_pas";

export type Sauvegarde = { etat: EtatParcours; ecran: string };

/** ⚠️ Lu à chaque ouverture : une valeur illisible vaut « rien de gardé ». */
export function lireParcours(): Sauvegarde | null {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return null;
    const v = JSON.parse(brut) as Partial<Sauvegarde>;
    if (!v || typeof v.ecran !== "string" || !v.etat) return null;
    return { ecran: v.ecran, etat: { ...etatVide(), ...v.etat } };
  } catch {
    return null;
  }
}

export function garderParcours(etat: EtatParcours, ecran: string): void {
  try { localStorage.setItem(CLE, JSON.stringify({ etat, ecran })); } catch { /* stockage bloqué : on continue en mémoire */ }
}

export function oublierParcours(): void {
  try { localStorage.removeItem(CLE); localStorage.removeItem(SUITE); } catch { /* rien à effacer */ }
}

const SUITE = "vaiiya_premiers_pas_suite";

/** Google ramène à `/` : le `?next=` (une invitation au relais…) se perdrait. */
export function retenirSuite(chemin: string): void {
  try { localStorage.setItem(SUITE, chemin); } catch { /* sans gravité */ }
}

export function lireSuite(): string | null {
  try { return localStorage.getItem(SUITE); } catch { return null; }
}

const VUS = (id: string) => `vaiiya_premiers_pas_vus_${id}`;

/** La visite a-t-elle été vue sur ce compte ? Les métadonnées du compte font
 *  foi ; cette copie évite de renvoyer quelqu'un dans la visite si elles n'ont
 *  pas pu s'écrire. */
export function premiersPasVus(id: string, metadonnees: Record<string, unknown> | undefined): boolean {
  if (metadonnees?.premiers_pas_vus === true) return true;
  try { return localStorage.getItem(VUS(id)) === "1"; } catch { return false; }
}

export function marquerPremiersPas(id: string): void {
  try { localStorage.setItem(VUS(id), "1"); } catch { /* sans gravité */ }
  void createClient().auth.updateUser({ data: { premiers_pas_vus: true } }).catch(() => {});
}

/** Les six tuiles disent ce qu'on ne mange pas. La colonne historique, elle,
 *  garde un régime : on le déduit, pour que l'assistant et les anciens écrans
 *  continuent de lire ce qu'ils lisent aujourd'hui. */
export function regimeDes(sans: readonly Aliment[]): string {
  const a = (x: Aliment) => sans.includes(x);
  if (a("viande") && a("poisson") && a("oeufs") && a("lait")) return "vegan";
  if (a("viande") && a("poisson")) return "vegetarien";
  if (a("gluten") && sans.length === 1) return "sansgluten";
  return "omnivore";
}

const FILTRE: Record<Aliment, DietKey> = {
  viande: "sans-viande", porc: "sans-porc", poisson: "sans-poisson",
  oeufs: "sans-oeufs", lait: "sans-lactose", gluten: "sans-gluten",
};

/** Ce que les écrans de recettes filtrent (`vaiiya_diet_<id>`). Une tuile vaut un
 *  filtre : le nombre de recettes annoncé par le Guide est donc celui que la
 *  personne retrouvera dans Nutrition. */
export function regimesDe(sans: readonly Aliment[]): DietKey[] {
  return sans.map((a) => FILTRE[a]);
}

/** `aliments_exclus` suit le compte, `vaiiya_diet_<id>` vit sur l'appareil : un
 *  appareil neuf retrouve ici ce qu'on a répondu. ⚠️ Rien n'écrase une valeur déjà
 *  posée, et une réponse illisible ne filtre rien. */
export function hydraterRegimes(id: string, brut: unknown): void {
  if (!Array.isArray(brut)) return;
  const sans = brut.filter((x): x is Aliment => Object.keys(FILTRE).includes(x));
  try {
    const cle = `vaiiya_diet_${id}`;
    if (localStorage.getItem(cle) === null) localStorage.setItem(cle, JSON.stringify(regimesDe(sans)));
  } catch { /* stockage bloqué : les recettes restent sans filtre sur cet appareil */ }
}

/** Le profil tel que `enregistrerProfil` l'écrit. ⚠️ Le nombre de repas n'est
 *  plus demandé : trois, la valeur que le coach prend quand il ne sait pas, et
 *  `onboarding_completed` reste vrai. */
export function versProfil(e: EtatParcours): OnboardingData {
  return {
    age: String(e.age),
    height: String(e.taille),
    weight: String(e.poids),
    gender: e.genre ?? "",
    goals: e.buts,
    /* « Je reprends » se compose comme un débutant : mêmes séances, mêmes
       charges. La phrase du Guide fait la différence, pas la prescription. */
    level: e.niveau === "reprise" ? "debutant" : (e.niveau ?? ""),
    sessionsPerWeek: String(Math.max(1, e.jours.length)),
    mealsPerDay: "3",
    diet: regimeDes(e.sans),
  };
}

/** Ce que Vaiiya appelle un lieu : « Les deux » s'entraîne d'abord en salle. */
export function versLieu(e: EtatParcours): { location: "salle" | "maison"; equip?: "halteres" | "poids" } | null {
  if (e.lieu === "salle" || e.lieu === "deux") return { location: "salle" };
  if (e.lieu === "maison") return { location: "maison", equip: e.equip ?? "poids" };
  return null;
}

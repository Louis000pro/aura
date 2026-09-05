/**
 * aiQuotas.ts — les CHIFFRES du garde-fou IA, sans aucune dépendance serveur.
 *
 * Fichier séparé de `aiLimits.ts` exprès : les conditions générales affichent
 * ces mêmes valeurs à l'utilisateur, et une page cliente ne peut pas importer
 * `aiLimits.ts` (qui tire le client d'administration Supabase et `next/server`).
 *
 * Conséquence voulue : le contrat et le code lisent la MÊME source. Il est
 * impossible de changer une limite sans que la page des conditions le dise.
 */

export type CategorieIA =
  | "chat"        // le coach ✦ (fournisseur de chat, cf. lib/llm)
  | "memoire"     // extraction de mémoire long terme, 1 par message
  | "vision"      // photo d'assiette ou de carte de resto (Groq)
  | "estimation"  // macros d'un repas décrit en texte (Groq)
  | "recette"     // recette ou menu généré
  | "seance"      // génération d'une séance
  | "vocal"       // dictée (Groq Whisper)
  | "lookup";     // appels externes gratuits mais coûteux en bande passante

export interface Limite {
  /** Appels par jour pour un compte gratuit. */
  gratuit: number;
  /** Appels par jour pour un abonné. Très haut : c'est un anti-script, pas un quota de vente. */
  premium: number;
  /** Rafale : appels par minute. */
  parMinute: number;
  /** Ce qu'on dit à l'utilisateur quand il bute dessus. */
  libelle: string;
}

export const LIMITES: Record<CategorieIA, Limite> = {
  // 5/jour en gratuit = ce qui est écrit sur la page Premium, ne pas désaligner.
  chat:       { gratuit: 5,  premium: 120, parMinute: 12, libelle: "messages au coach" },
  memoire:    { gratuit: 5,  premium: 120, parMinute: 12, libelle: "messages au coach" },
  // 2/jour en gratuit = ce qui est écrit sur la page Premium.
  vision:     { gratuit: 2,  premium: 40,  parMinute: 6,  libelle: "analyses photo" },
  estimation: { gratuit: 15, premium: 150, parMinute: 15, libelle: "estimations de repas" },
  recette:    { gratuit: 8,  premium: 80,  parMinute: 8,  libelle: "recettes générées" },
  seance:     { gratuit: 5,  premium: 60,  parMinute: 8,  libelle: "séances générées" },
  vocal:      { gratuit: 15, premium: 150, parMinute: 15, libelle: "dictées" },
  lookup:     { gratuit: 60, premium: 300, parMinute: 30, libelle: "recherches" },
};

/**
 * Plafonds de TAILLE d'entrée.
 * Aussi important que le nombre d'appels : un message de 200 000 caractères
 * coûte autant que cent messages normaux. Le compteur seul ne protège de rien.
 */
export const PLAFONDS = {
  /** Caractères d'un message envoyé au coach. Une vraie question fait 200 caractères. */
  messageChars: 4000,
  /** Messages d'historique renvoyés au modèle. */
  historique: 24,
  /** Poids d'une image en base64 (le client compresse déjà à 1024 px). */
  imageOctets: 4 * 1024 * 1024,
  /** Poids d'un enregistrement vocal. Au-delà, ce n'est plus de la dictée. */
  audioOctets: 8 * 1024 * 1024,
  /** Champ de texte libre quelconque (ingrédients, nom de plat, requête). */
  texteCourtChars: 1200,
} as const;

/**
 * Ce que les conditions générales affichent, dans l'ordre.
 * Seules les catégories que l'utilisateur reconnaît : `memoire` et `lookup`
 * sont de la plomberie interne, les lister n'apprendrait rien à personne.
 */
export const QUOTAS_PUBLICS: { categorie: CategorieIA; nom: string }[] = [
  { categorie: "chat",       nom: "Messages au coach ✦" },
  { categorie: "vision",     nom: "Analyses photo (assiette, carte)" },
  { categorie: "estimation", nom: "Estimations d’un repas décrit" },
  { categorie: "recette",    nom: "Recettes et menus générés" },
  { categorie: "seance",     nom: "Séances générées" },
  { categorie: "vocal",      nom: "Dictées vocales" },
];

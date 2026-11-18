/**
 * visionRepas.ts — analyser une photo de repas, côté serveur.
 *
 * ⭐ LE MODÈLE RECONNAÎT ET ESTIME, LE CODE CALCULE (2026-09-25).
 * L'ancienne version demandait au modèle UN total (« calories : 650 ») en
 * une seule fois. Un modèle de vision est bon pour dire QUOI et COMBIEN
 * (« riz, environ 180 g »), mauvais pour faire de tête la somme de quatre
 * aliments : les totaux étaient incohérents d'une photo à l'autre, et les
 * macros ne retombaient pas sur les calories. Ici :
 *   1. le modèle liste chaque élément visible, sauces et matière grasse de
 *      cuisson comprises, avec son poids estimé et ses valeurs pour 100 g ;
 *   2. le code borne chaque valeur, recale les calories d'un élément sur
 *      ses propres macros quand elles se contredisent, puis additionne.
 * Le total affiché est donc toujours la somme exacte de ce qui est listé,
 * et la liste se montre : quelqu'un peut voir « riz 180 g » et juger.
 *
 * Tout ce qui décide est PUR (`lireReponse`, `calculerRepas`) et se vérifie
 * hors ligne avec `npm run check:vision`.
 */

import { referenceDe } from "./tableAliments";

export type ElementRepas = {
  nom: string;
  grammes: number;
  /** Vrai quand les valeurs pour 100 g viennent de la table de référence. */
  reference?: boolean;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
};

export type AnalyseRepas = {
  foodName: string;
  description: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  items: ElementRepas[];
  /** 0 à 1 : ce que le modèle dit de sa propre certitude. */
  confiance: number;
};

/* ── Les modèles, du meilleur au repli ──────────────────────────────────
   Si un identifiant disparaît chez le fournisseur, on passe au suivant au
   lieu d'échouer. `VISION_MODELS` (liste séparée par des virgules) permet
   d'en changer sans toucher au code.

   ⚠️ 2026-10-27 · LES DEUX LLAMA 4 SONT RETIRÉS CHEZ GROQ (Maverick le
   2026-03-09, Scout le 2026-07-17, page « Deprecations » de Groq), et
   aucune variable `VISION_MODELS` n'était posée sur Vercel : chaque photo
   de repas et chaque photo de carte de resto faisait quatre appels refusés
   (`model_not_found`), puis échouait. Vu dans les erreurs du 2026-10-26.
   Qwen 3.8 27B est le seul modèle d'images de Groq ouvert à tous (page
   « Vision » de Groq) ; il lit le JSON avec une image. */
export const MODELES_VISION = (process.env.VISION_MODELS ?? "")
  .split(",").map((m) => m.trim()).filter(Boolean);
if (MODELES_VISION.length === 0) {
  MODELES_VISION.push("qwen/qwen3.8-27b");
}

/* Qwen 3.8 réfléchit avant de répondre si on ne lui dit rien : du temps en
   plus pour une photo qui n'en demande pas, et un texte de réflexion qui
   gênerait la lecture du JSON. `reasoning_effort: "none"` le fait répondre
   directement ; le dernier essai, sans ce réglage, cache la réflexion. */
function essaisPour(model: string): Record<string, unknown>[] {
  const json = { response_format: { type: "json_object" } };
  if (!/qwen/i.test(model)) return [json, {}];
  return [
    { ...json, reasoning_effort: "none" },
    { reasoning_effort: "none" },
    { reasoning_format: "hidden" },
  ];
}

export const PROMPT_VISION = `Tu es diététicien. Tu analyses la photo d'un repas pour estimer ce qu'il apporte, comme le ferait un professionnel qui pèse chaque élément. La quantité est ce qui compte le plus : une erreur de poids fausse tout le reste.

MÉTHODE, dans cet ordre :
1. Liste CHAQUE élément comestible visible séparément : féculent, protéine, légumes, sauce, fromage, pain, boisson, dessert. Une sauce, un filet d'huile ou du beurre visible est un élément à part entière. Ne fusionne pas deux aliments dans un élément.
2. Trouve l'échelle avant d'estimer quoi que ce soit : repère le contenant et les objets connus. Assiette plate ≈ 26 cm de diamètre, assiette à dessert ≈ 20 cm, assiette creuse ≈ 22 cm, bol ≈ 15 cm, ramequin ≈ 9 cm, fourchette ≈ 19 cm, cuillère à soupe ≈ 17 cm, verre ≈ 25 cl, canette 33 cl, main adulte ≈ 18 cm.
3. Pour ce qui se COMPTE (œufs, tranches, nuggets, boulettes, sushis, biscuits, fruits entiers, carrés de chocolat), compte les pièces et donne "pieces" en plus des grammes.
4. Pour le reste, estime la surface occupée dans l'assiette (quelle fraction ?) et l'épaisseur, puis convertis en grammes TELS QUE SERVIS (cuit si c'est cuit). Repères : une assiette plate pleine de féculents cuits, sur 2 cm d'épaisseur ≈ 350 g ; un quart d'assiette de riz ou de pâtes cuits ≈ 120 à 180 g ; un filet de poulet ou un steak de la taille d'une paume ≈ 120 à 150 g ; un pavé de poisson ≈ 130 g ; une poignée de salade ≈ 30 g ; une cuillère à soupe d'huile ≈ 10 g, de sauce ≈ 15 g ; une tranche de pain ≈ 35 g ; un bol rempli de soupe ≈ 300 g.
5. Pour chaque élément, donne ses valeurs pour 100 g dans cet état (table Ciqual) : calories, protéines, glucides, lipides. Attention cuit / cru : 100 g de riz cuit ≈ 130 kcal, pas 350.
6. Compte la matière grasse de cuisson quand l'aliment est poêlé, frit, rôti ou brillant : ajoute-la comme élément (ex. « huile de cuisson », 5 à 15 g par portion). Une salade assaisonnée a sa vinaigrette (≈ 15 g).
7. Ce qui est caché compte aussi quand le plat l'implique : le fromage dans un gratin, la sauce dans un plat mijoté, le beurre sur une tartine.

RÈGLES :
- Ne confonds pas les aliments proches : gnocchis, riz, pâtes, quinoa, semoule, boulgour ; poulet, dinde, porc ; crème et sauce blanche ; patate douce et carotte. Regarde la forme, la texture, la couleur.
- Nomme chaque élément simplement, comme dans une table d'aliments (« riz basmati cuit », « blanc de poulet grillé », « huile d'olive »), et le plat précisément en français (« spaghetti bolognaise », pas « pâtes »).
- Sois réaliste, ni généreux ni avare : une portion de restaurant est plus grosse qu'une portion maison. Ce qui sort du cadre ou se cache sous un autre aliment ne compte que si on le devine clairement.
- Si la photo ne montre pas de nourriture, mets "aucun_repas": true et une liste vide.

Réponds UNIQUEMENT avec un objet JSON, sans texte autour :
{
  "aucun_repas": false,
  "plat": "nom précis du plat en français",
  "description": "description courte en français, 12 mots maximum",
  "elements": [
    { "nom": "riz basmati cuit", "grammes": 180, "kcal_100g": 130, "proteines_100g": 2.7, "glucides_100g": 28, "lipides_100g": 0.3 },
    { "nom": "œuf au plat", "pieces": 2, "grammes": 110, "kcal_100g": 190, "proteines_100g": 13, "glucides_100g": 0.5, "lipides_100g": 15 }
  ],
  "confiance": 0.8
}`;

const nombre = (v: unknown): number => {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v.replace(",", ".")) : NaN;
  return Number.isFinite(n) ? n : 0;
};
const borne = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Extrait le JSON d'une réponse de modèle, même entourée de texte. */
export function lireReponse(texte: string): Record<string, unknown> | null {
  const m = texte.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const v = JSON.parse(m[0]);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Transforme la réponse brute du modèle en repas chiffré.
 * Rend `null` quand la photo ne montre pas de repas (ou rien d'exploitable).
 */
export function calculerRepas(brut: Record<string, unknown>): AnalyseRepas | null {
  if (brut.aucun_repas === true) return null;
  const elementsBruts = Array.isArray(brut.elements) ? brut.elements : [];

  const items: ElementRepas[] = [];
  for (const e of elementsBruts.slice(0, 12)) {
    if (!e || typeof e !== "object") continue;
    const r = e as Record<string, unknown>;
    const nom = String(r.nom ?? "").trim().slice(0, 60);
    if (!nom) continue;
    const ref = referenceDe(nom);

    /* Le poids. Ce qui se compte se pèse mieux par le compte que par la
       surface : quand le modèle donne des pièces et que l'aliment a un poids
       standard, un poids qui s'en écarte de plus de 40 % cède au compte. */
    let g = borne(nombre(r.grammes), 0, 1500);
    const pieces = borne(nombre(r.pieces), 0, 60);
    if (pieces > 0 && ref?.piece) {
      const parCompte = pieces * ref.piece;
      if (g <= 0 || Math.abs(g - parCompte) / parCompte > 0.4) g = parCompte;
    } else if (pieces > 0 && g <= 0) {
      g = pieces * borne(nombre(r.grammes_piece), 0, 500);
    }
    /* Une portion au-delà du plausible pour CET aliment est une erreur
       d'échelle (200 g d'huile, 1 kg de fromage) : on la ramène au plafond. */
    if (ref?.max) g = Math.min(g, ref.max);
    if (g <= 0) continue;

    /* Valeurs pour 100 g : la table quand l'aliment y est (c'est un fait,
       pas une estimation), sinon celles du modèle, bornées au possible. */
    let p = ref ? ref.p : borne(nombre(r.proteines_100g), 0, 100);
    let c = ref ? ref.c : borne(nombre(r.glucides_100g), 0, 100);
    let f = ref ? ref.f : borne(nombre(r.lipides_100g), 0, 100);
    const somme = p + c + f;
    if (somme > 100) { p = (p * 100) / somme; c = (c * 100) / somme; f = (f * 100) / somme; }
    let kcal = ref ? ref.kcal : borne(nombre(r.kcal_100g), 0, 900);

    /* Un élément dont les calories contredisent ses propres macros de plus
       de 25 % : on croit les macros (elles portent plus d'information), et
       on recalcule. Tolérance large, parce que les fibres et l'alcool
       expliquent des écarts réels. */
    const kcalMacros = p * 4 + c * 4 + f * 9;
    if (!ref && kcalMacros > 0 && (kcal <= 0 || Math.abs(kcal - kcalMacros) / kcalMacros > 0.25)) kcal = kcalMacros;

    items.push({
      nom,
      grammes: Math.round(g),
      ...(ref ? { reference: true } : {}),
      calories: Math.round((kcal * g) / 100),
      proteins: Math.round(((p * g) / 100) * 10) / 10,
      carbs: Math.round(((c * g) / 100) * 10) / 10,
      fats: Math.round(((f * g) / 100) * 10) / 10,
    });
  }
  if (items.length === 0) return null;

  const total = (k: "calories" | "proteins" | "carbs" | "fats") =>
    items.reduce((s, i) => s + i[k], 0);

  const plat = String(brut.plat ?? "").trim().slice(0, 80)
    || items.map((i) => i.nom).slice(0, 3).join(", ");

  return {
    foodName: plat.charAt(0).toUpperCase() + plat.slice(1),
    description: String(brut.description ?? "").trim().slice(0, 120),
    calories: Math.round(total("calories")),
    proteins: Math.round(total("proteins")),
    carbs: Math.round(total("carbs")),
    fats: Math.round(total("fats")),
    items,
    confiance: borne(nombre(brut.confiance), 0, 1),
  };
}

/* Le moment du repas, d'après l'heure LOCALE de la personne (jamais le
   modèle). La règle vit dans `lib/repas`, que l'écran lit aussi : une seule
   borne pour la route et pour l'écran. */
export { momentDuRepas } from "./repas";

/* ── L'appel au modèle de vision, avec repli ────────────────────────────
   Une seule écriture pour l'analyse d'assiette ET la lecture de carte :
   chaque modèle de la liste, d'abord en mode JSON strict puis sans (certains
   modèles de vision refusent l'option). Un identifiant retiré par le
   fournisseur fait passer au suivant au lieu d'éteindre la fonction. */
type ClientVision = {
  chat: { completions: { create: (p: Record<string, unknown>) => Promise<{ choices: { message?: { content?: string | null } }[] }> } };
};

export async function appelerVision(
  client: ClientVision,
  image: { base64: string; mimeType: string },
  consigne: string,
  options: { maxTokens: number; temperature: number },
): Promise<string> {
  const messages = [{
    role: "user",
    content: [
      { type: "image_url", image_url: { url: `data:${image.mimeType};base64,${image.base64}` } },
      { type: "text", text: consigne },
    ],
  }];
  let derniere: unknown = null;
  for (const model of MODELES_VISION) {
    for (const essai of essaisPour(model)) {
      try {
        const r = await client.chat.completions.create({
          model,
          messages,
          max_tokens: options.maxTokens,
          temperature: options.temperature,
          ...essai,
        });
        const texte = r.choices[0]?.message?.content ?? "";
        if (texte) return texte;
      } catch (err) {
        derniere = err;
        console.warn(`[vision] ${model} ${JSON.stringify(essai)} a échoué :`, String((err as Error)?.message ?? err).slice(0, 200));
        /* Un modèle retiré ne reviendra pas au deuxième essai : on passe
           directement au suivant au lieu de payer deux refus de plus. */
        if (/model_not_found|does not exist/i.test(String((err as Error)?.message ?? err))) break;
      }
    }
  }
  throw derniere ?? new Error("réponse vide");
}

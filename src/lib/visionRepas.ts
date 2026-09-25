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

export type ElementRepas = {
  nom: string;
  grammes: number;
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
   Maverick voit nettement mieux que Scout (plus d'experts, meilleure
   reconnaissance fine). Si un identifiant disparaît chez le fournisseur,
   on passe au suivant au lieu d'échouer. `VISION_MODELS` (liste séparée
   par des virgules) permet d'en changer sans toucher au code. */
export const MODELES_VISION = (process.env.VISION_MODELS ?? "")
  .split(",").map((m) => m.trim()).filter(Boolean);
if (MODELES_VISION.length === 0) {
  MODELES_VISION.push(
    "meta-llama/llama-4-maverick-17b-128e-instruct",
    "meta-llama/llama-4-scout-17b-16e-instruct",
  );
}

export const PROMPT_VISION = `Tu es diététicien. Tu analyses la photo d'un repas pour estimer ce qu'il apporte, comme le ferait un professionnel qui pèse chaque élément.

MÉTHODE, dans cet ordre :
1. Liste CHAQUE élément comestible visible séparément : féculent, protéine, légumes, sauce, fromage, pain, boisson, dessert. Une sauce, un filet d'huile ou du beurre visible est un élément à part entière.
2. Estime le poids de chaque élément en grammes, TEL QUE SERVI (cuit si c'est cuit). Appuie-toi sur les repères de la photo : une assiette plate fait environ 26 cm, une assiette creuse ou un bol environ 15 à 18 cm, une fourchette environ 19 cm, une main adulte environ 18 cm. Compare la surface et l'épaisseur de chaque aliment à ces repères.
3. Pour chaque élément, donne ses valeurs pour 100 g dans cet état (table Ciqual ou USDA) : calories, protéines, glucides, lipides.
4. Compte la matière grasse de cuisson quand l'aliment est poêlé, frit, rôti ou brillant : ajoute-la comme élément (ex. « huile de cuisson », 5 à 15 g).

RÈGLES :
- Ne confonds pas les aliments proches : gnocchis, riz, pâtes, quinoa, semoule, boulgour ; poulet, dinde, porc ; crème et sauce blanche. Regarde la forme, la texture, la couleur.
- Nomme précisément, en français (« spaghetti bolognaise », pas « pâtes »).
- Sois réaliste, ni généreux ni avare : une portion de restaurant est plus grosse qu'une portion maison.
- Si la photo ne montre pas de nourriture, mets "aucun_repas": true et une liste vide.

Réponds UNIQUEMENT avec un objet JSON, sans texte autour :
{
  "aucun_repas": false,
  "plat": "nom précis du plat en français",
  "description": "description courte en français, 12 mots maximum",
  "elements": [
    { "nom": "riz basmati cuit", "grammes": 180, "kcal_100g": 130, "proteines_100g": 2.7, "glucides_100g": 28, "lipides_100g": 0.3 }
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
    const g = borne(nombre(r.grammes), 0, 1500);
    if (!nom || g <= 0) continue;

    // Valeurs pour 100 g, bornées à ce qui existe physiquement.
    let p = borne(nombre(r.proteines_100g), 0, 100);
    let c = borne(nombre(r.glucides_100g), 0, 100);
    let f = borne(nombre(r.lipides_100g), 0, 100);
    const somme = p + c + f;
    if (somme > 100) { p = (p * 100) / somme; c = (c * 100) / somme; f = (f * 100) / somme; }
    let kcal = borne(nombre(r.kcal_100g), 0, 900);

    /* Un élément dont les calories contredisent ses propres macros de plus
       de 25 % : on croit les macros (elles portent plus d'information), et
       on recalcule. Tolérance large, parce que les fibres et l'alcool
       expliquent des écarts réels. */
    const kcalMacros = p * 4 + c * 4 + f * 9;
    if (kcalMacros > 0 && (kcal <= 0 || Math.abs(kcal - kcalMacros) / kcalMacros > 0.25)) kcal = kcalMacros;

    items.push({
      nom,
      grammes: Math.round(g),
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

/** Le moment du repas, d'après l'heure LOCALE de la personne (jamais le modèle). */
export function momentDuRepas(heure: number): "petit-dejeuner" | "dejeuner" | "gouter" | "diner" {
  if (heure >= 4 && heure < 11) return "petit-dejeuner";
  if (heure >= 11 && heure < 15) return "dejeuner";
  if (heure >= 15 && heure < 18) return "gouter";
  return "diner";
}

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
    for (const jsonStrict of [true, false]) {
      try {
        const r = await client.chat.completions.create({
          model,
          messages,
          max_tokens: options.maxTokens,
          temperature: options.temperature,
          ...(jsonStrict ? { response_format: { type: "json_object" } } : {}),
        });
        const texte = r.choices[0]?.message?.content ?? "";
        if (texte) return texte;
      } catch (err) {
        derniere = err;
        console.warn(`[vision] ${model}${jsonStrict ? " (json)" : ""} a échoué :`, String((err as Error)?.message ?? err).slice(0, 200));
      }
    }
  }
  throw derniere ?? new Error("réponse vide");
}

import { llm, hasLLMKey, CHAT_MODEL } from "@/lib/llm";
import { reconcileMacros } from "@/lib/macros";
import { NextResponse } from "next/server";
import { garderIA } from "@/lib/aiLimits";

export const runtime = "nodejs";
export const maxDuration = 30;

/* ════════════════════════════════════════════════════════════════════
   /api/nutrition/recipe — génère UNE recette complète et SÛRE.

   À partir d'un plat (depuis les suggestions), d'un thème, OU des RESTES que
   l'utilisateur a sous la main (« À finir » → body.ingredients), l'IA rédige
   une vraie recette ORIGINALE en français : ingrédients, étapes, macros par
   portion. Tout est encadré côté sécurité alimentaire (l'inquiétude n°1 :
   pas de recette dangereuse) — voir le bloc de règles dans le prompt.

   Le client peut ensuite « ajouter à mes repas du jour » → log nutrition_logs
   (réutilise la plomberie existante). Macros recalées sur les calories via
   reconcileMacros pour rester cohérentes. Voir [[nutrition-unification-refonte]].
   ════════════════════════════════════════════════════════════════════ */

type RawRecipe = {
  nom?: unknown; theme?: unknown; portions?: unknown; prepMin?: unknown; cookMin?: unknown;
  difficulty?: unknown; diet?: unknown; allergens?: unknown; ingredients?: unknown;
  steps?: unknown; calories?: unknown; proteins?: unknown; carbs?: unknown; fats?: unknown;
  safetyNote?: unknown;
};

const str = (v: unknown, fallback = "") => (typeof v === "string" && v.trim() ? v.trim() : fallback);
const num = (v: unknown, fallback = 0) => (isNaN(Number(v)) ? fallback : Math.round(Number(v)));
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim()) : [];

export async function POST(req: Request) {
  const garde = await garderIA(req, "recette");
  if (!garde.ok) return garde.reponse;

  try {
    if (!hasLLMKey())
      return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });

    const body = await req.json();
    const dish = str(body.dish);
    const theme = str(body.theme);
    // Restes de l'utilisateur (« À finir ») : on cuisine EN PRIORITE avec ça.
    const leftovers = strArr(body.ingredients).slice(0, 15);
    const mealType = str(body.mealType);
    const portions = Math.min(Math.max(num(body.portions, 2), 1), 8);
    const calorieTarget = body.calorieTarget ? Math.round(Number(body.calorieTarget)) : null;
    const diet: string[] = strArr(body.diet);
    const taste = body.taste && typeof body.taste === "object" ? body.taste : null;

    // ── Personnalisation (uniquement ce qu'on connaît) ──
    const perso: string[] = [];
    if (taste?.cooking) perso.push(`Aime cuisiner : ${taste.cooking}.`);
    if (taste?.time) perso.push(`Temps de preparation souhaite : ${taste.time}.`);
    if (Array.isArray(taste?.bases) && taste.bases.length)
      perso.push(`Ingredients de base preferes (a privilegier) : ${taste.bases.join(", ")}.`);
    if (diet.length) perso.push(`Regime/contraintes a respecter STRICTEMENT : ${diet.join(", ")}.`);

    const cible = leftovers.length
      ? `Compose une recette qui utilise EN PRIORITE ces ingredients que l’utilisateur a DEJA sous la main : ${leftovers.join(", ")}. Tu peux ne pas tous les utiliser s’ils ne vont pas ensemble, mais construis le plat autour d’eux. N’ajoute QUE des basiques de placard (huile, sel, poivre, epices, oignon, ail) : l’utilisateur ne doit RIEN acheter d’autre.`
      : dish
        ? `Ecris la recette du plat suivant : "${dish}".`
        : theme
          ? `Invente une recette appartenant au theme : "${theme}".`
          : `Propose une recette equilibree, simple et grand public.`;
    const mealLine = mealType ? `Type de repas vise : ${mealType}.` : "";
    const kcalLine = calorieTarget
      ? `Vise environ ${calorieTarget} kcal par portion.`
      : `Calories realistes pour une portion normale.`;

    const response = await llm.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Tu es un chef cuisinier ET un professionnel de la securite alimentaire. Tu rediges des recettes maison ORIGINALES, simples, realistes et SURES. Tu ne copies aucun texte existant. Reponds UNIQUEMENT avec un objet JSON valide, sans texte avant/apres, sans markdown.",
        },
        {
          role: "user",
          content: `${cible}
${mealLine}
${kcalLine}
Pour ${portions} portion(s).
${perso.length ? "Profil de l utilisateur :\n" + perso.join("\n") : ""}

REGLES DE SECURITE ALIMENTAIRE (PRIORITAIRES, NON NEGOCIABLES) :
- Uniquement de la cuisine maison COURANTE et a faible risque.
- INTERDIT : conserves/sterilisation maison, lacto-fermentation, viande/volaille/porc/poisson/oeuf CRUS ou SOUS-CUITS (pas de tartare, carpaccio, mayonnaise maison a l oeuf cru, oeuf coulant pour public fragile), champignons sauvages, techniques exigeant un savoir-faire d hygiene pointu.
- Pour toute proteine a risque (volaille, porc, viande hachee, poisson, oeuf), les etapes DOIVENT indiquer une cuisson A COEUR claire (ex : "jusqu a ce que la volaille ne soit plus rosee a coeur").
- Donne des temps et feux realistes.
- Liste explicitement les ALLERGENES majeurs presents (gluten, lait, oeuf, fruits a coque, arachide, poisson, crustaces, soja, moutarde, sesame...). Si aucun, tableau vide.
- N affiche un tag de regime (vegetarien, vegan, sans gluten, sans lactose) QUE si la recette le respecte VRAIMENT.

Format JSON STRICT :
{
  "nom": "Nom clair et appetissant",
  "theme": "Theme/categorie du plat",
  "portions": ${portions},
  "prepMin": 10,
  "cookMin": 20,
  "difficulty": "facile",
  "diet": ["vegetarien"],
  "allergens": ["lait", "gluten"],
  "ingredients": [ { "nom": "Blanc de poulet", "quantite": "250 g" } ],
  "steps": ["Etape 1...", "Etape 2..."],
  "calories": 520, "proteins": 42, "carbs": 58, "fats": 12,
  "safetyNote": "Conseil de securite court (cuisson/allergie)"
}

Regles de redaction :
- Francais simple et chaleureux, etapes courtes et numerotees logiquement, ton accessible (pas de jargon).
- calories/proteins/carbs/fats = PAR PORTION, en grammes, coherents entre eux.
- "difficulty" : "facile" | "moyen" | "difficile".
- Retourne UNIQUEMENT le JSON.`,
        },
      ],
      max_tokens: 1600,
      temperature: 0.6,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Pas de JSON dans la reponse");

    const r = JSON.parse(jsonMatch[0]) as RawRecipe;

    // Macros recalees sur les calories (coherence) — meme moteur que les plats.
    const cal = num(r.calories);
    const mac = reconcileMacros(cal, num(r.proteins), num(r.carbs), num(r.fats));

    const ingredients = (Array.isArray(r.ingredients) ? r.ingredients : [])
      .map((it) => {
        const o = it as { nom?: unknown; quantite?: unknown };
        return { nom: str(o?.nom), quantite: str(o?.quantite) };
      })
      .filter((it) => it.nom);

    const recipe = {
      nom: str(r.nom, dish || "Recette"),
      theme: str(r.theme, theme),
      portions: Math.min(Math.max(num(r.portions, portions), 1), 12),
      prepMin: num(r.prepMin),
      cookMin: num(r.cookMin),
      difficulty: ((d) => (d === "moyen" || d === "difficile" ? d : "facile"))(str(r.difficulty)),
      diet: strArr(r.diet),
      allergens: strArr(r.allergens),
      ingredients,
      steps: strArr(r.steps),
      calories: cal,
      proteins: mac.proteins,
      carbs: mac.carbs,
      fats: mac.fats,
      safetyNote: str(r.safetyNote),
    };

    if (!recipe.steps.length || !recipe.ingredients.length)
      throw new Error("Recette incomplete");

    return NextResponse.json({ recipe });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    console.error("Recipe generate error:", err);
    return NextResponse.json(
      { error: `Generation impossible [${e?.status ?? "?"}] ${(e?.message ?? "").slice(0, 150)}` },
      { status: 500 },
    );
  }
}

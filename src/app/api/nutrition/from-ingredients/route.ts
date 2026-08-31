import { llm, hasLLMKey, CHAT_MODEL } from "@/lib/llm";
import { NextResponse } from "next/server";
import { garderIA } from "@/lib/aiLimits";

export const runtime = "nodejs";
export const maxDuration = 30;

/* ════════════════════════════════════════════════════════════════════
   /api/nutrition/from-ingredients — « J'ai des trucs à finir ».

   À partir des ingrédients que l'utilisateur a SOUS LA MAIN (+ objectif, régime,
   goûts), l'IA compose des plats FAISABLES sans rien acheter (hors basiques de
   placard). Retourne 3 plats variés avec de vraies macros, au même format que
   les idées de repas. Voir [[nutrition-onmangeou-redesign]].
   ════════════════════════════════════════════════════════════════════ */

export async function POST(req: Request) {
  const garde = await garderIA(req, "recette");
  if (!garde.ok) return garde.reponse;

  try {
    if (!hasLLMKey())
      return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });

    const body = await req.json();

    const ingredients: string[] = Array.isArray(body.ingredients)
      ? body.ingredients
          .filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 0)
          .map((s: string) => s.trim())
          .slice(0, 15)
      : [];
    if (!ingredients.length)
      return NextResponse.json({ error: "Aucun ingrédient" }, { status: 400 });

    const calorieTarget = Math.round(Number(body.calorieTarget) || 2000);
    const mealType = typeof body.mealType === "string" ? body.mealType : "diner";
    const diet: string[] = Array.isArray(body.diet)
      ? body.diet.filter((d: unknown): d is string => typeof d === "string")
      : [];
    const taste = body.taste && typeof body.taste === "object" ? body.taste : null;

    const persoLines: string[] = [];
    if (taste?.time) persoLines.push(`Temps de preparation souhaite : ${taste.time}.`);
    if (taste?.cooking) persoLines.push(`Rapport a la cuisine : ${taste.cooking}.`);
    if (diet.length) persoLines.push(`Regime a respecter STRICTEMENT : ${diet.join(", ")}.`);
    const perso = persoLines.join("\n");

    const perDish = Math.round(calorieTarget / 3);

    const response = await llm.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Tu es un chef qui compose des plats realistes a partir des ingredients DISPONIBLES de l’utilisateur. Tu peux supposer les basiques de placard (huile, sel, poivre, epices, oignon, ail). Reponds UNIQUEMENT avec un objet JSON valide, sans texte avant/apres, sans markdown.",
        },
        {
          role: "user",
          content: `Ingredients disponibles (n’achete rien d’autre que des basiques de placard) : ${ingredients.join(", ")}.
Type de repas : ${mealType}. Vise environ ${perDish} kcal pour ce plat (coherent avec le type de repas).
${perso}

Propose 3 plats DIFFERENTS et realistes faisables avec ces ingredients.
Format JSON STRICT :
{ "dishes": [ { "nom": "Nom court et reconnaissable", "calories": 480, "proteins": 30, "carbs": 40, "fats": 18, "prepMin": 15, "difficulty": "facile" } ] }

Regles :
- Utilise en priorite les ingredients fournis ; ne suppose que des basiques de placard.
- macros en GRAMMES, coherentes avec les calories.
- "nom" clair (ex : "Omelette feta epinards", "Poelee courgettes riz").
- "prepMin" realiste ; "difficulty" : "facile" | "moyen" | "difficile".
- Respecte le regime pour TOUS les plats.
- Retourne UNIQUEMENT le JSON.`,
        },
      ],
      max_tokens: 900,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Pas de JSON dans la reponse");

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);
  } catch (err) {
    const e = err as { status?: number; message?: string };
    console.error("from-ingredients error:", err);
    return NextResponse.json(
      { error: `Generation impossible [${e?.status ?? "?"}] ${(e?.message ?? "").slice(0, 150)}` },
      { status: 500 },
    );
  }
}

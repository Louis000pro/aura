import { llm, hasLLMKey, optionsIA } from "@/lib/llm";
import { NextResponse } from "next/server";
import { garderIA } from "@/lib/aiLimits";

export const runtime = "nodejs";
export const maxDuration = 30;

/* ════════════════════════════════════════════════════════════════════
   /api/nutrition/menu — génère une BANQUE de plats personnalisée.

   À partir du profil de goûts (aime cuisiner ? temps ? accès ingrédients ?
   bases préférées) + des coups de cœur (plats déjà aimés) + de l'objectif
   calorique + du régime, l'IA propose, pour chaque type de repas, plusieurs
   plats variés avec de VRAIES macros. Le client met le résultat en cache pour
   la semaine et le distribue dans le menu 7 jours (logique existante).
   Le catalogue figé côté client reste le secours si cet appel échoue.
   ════════════════════════════════════════════════════════════════════ */

export async function POST(req: Request) {
  const garde = await garderIA(req, "recette");
  if (!garde.ok) return garde.reponse;

  try {
    if (!hasLLMKey())
      return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });

    const body = await req.json();

    const mealTypes: string[] =
      Array.isArray(body.mealTypes) && body.mealTypes.length
        ? body.mealTypes.filter((t: unknown): t is string => typeof t === "string")
        : ["petit-dejeuner", "dejeuner", "gouter", "diner"];
    const perType = Math.min(Math.max(Number(body.perType) || 8, 4), 12);
    const calorieTarget = Math.round(Number(body.calorieTarget) || 2000);
    const diet: string[] = Array.isArray(body.diet)
      ? body.diet.filter((d: unknown): d is string => typeof d === "string")
      : [];
    const taste = body.taste && typeof body.taste === "object" ? body.taste : null;
    const favorites: string[] = Array.isArray(body.favorites)
      ? body.favorites.filter((f: unknown): f is string => typeof f === "string").slice(0, 12)
      : [];

    // ── Bloc de personnalisation (n'inclut que ce qu'on connaît) ──
    const lines: string[] = [];
    if (taste?.cooking) lines.push(`Aime cuisiner : ${taste.cooking}.`);
    if (taste?.time) lines.push(`Temps de preparation souhaite : ${taste.time}.`);
    if (taste?.ingredients) lines.push(`Acces aux ingredients : ${taste.ingredients}.`);
    if (Array.isArray(taste?.bases) && taste.bases.length)
      lines.push(`Ingredients de base preferes (a privilegier) : ${taste.bases.join(", ")}.`);
    if (favorites.length)
      lines.push(`Plats qu il aime deja (propose des variantes et des plats dans le meme esprit, sans tout repeter) : ${favorites.join(", ")}.`);
    if (diet.length)
      lines.push(`Regime/contraintes a respecter STRICTEMENT : ${diet.join(", ")}.`);
    const perso = lines.length
      ? lines.join("\n")
      : "Aucune preference connue : propose des plats varies, equilibres et grand public.";

    const typesSpec = mealTypes.map((t) => `"${t}"`).join(", ");

    const response = await llm.chat.completions.create({
      ...optionsIA("coach", 3500),
      messages: [
        {
          role: "system",
          content:
            "Tu es un chef et nutritionniste. Tu proposes des idees de repas personnalisees, realistes et variees. Reponds UNIQUEMENT avec un objet JSON valide, sans texte avant/apres, sans markdown.",
        },
        {
          role: "user",
          content: `Genere une banque de plats PERSONNALISEE pour la semaine.

Profil de l utilisateur :
${perso}
Objectif : environ ${calorieTarget} kcal par jour, repartis sur les repas (un dejeuner/diner pese plus qu un gouter/collation). Chaque plat a des calories realistes pour SON type de repas.

Pour CHACUN de ces types de repas : ${typesSpec}
genere EXACTEMENT ${perType} plats DIFFERENTS et varies, adaptes au profil.

Format JSON STRICT :
{
  "pools": {
    "<type>": [
      { "nom": "Nom court et reconnaissable", "calories": 500, "proteins": 30, "carbs": 50, "fats": 15, "indulgent": false, "prepMin": 20, "difficulty": "facile" }
    ]
  }
}

Regles :
- "nom" : nom clair et reconnaissable, pas poetique (ex : "Poulet riz brocolis", "Porridge avoine banane").
- proteins/carbs/fats en GRAMMES, realistes et coherents avec les calories.
- "indulgent": true seulement pour un plat plaisir (riche/gras/sucre), au maximum ~1 sur 5.
- "prepMin": temps de preparation en minutes, conforme au temps souhaite du profil.
- "difficulty": "facile" | "moyen" | "difficile", conforme au gout pour la cuisine du profil.
- Respecte le regime pour TOUS les plats.
- Varie les ingredients et les styles ; privilegie les bases preferees sans tout y ramener.
- Retourne UNIQUEMENT le JSON.`,
        },
      ],
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
    console.error("Menu generate error:", err);
    return NextResponse.json(
      { error: `Generation impossible [${e?.status ?? "?"}] ${(e?.message ?? "").slice(0, 150)}` },
      { status: 500 },
    );
  }
}

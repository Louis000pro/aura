import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { garderIA, PLAFONDS, refusTaille } from "@/lib/aiLimits";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  /**
   * Connexion + plafond d'usage (la vision est le poste de coût le plus cher).
   *
   * ⚠️ L'ancien comptage lisait les repas ENREGISTRÉS avec photo dans
   * `nutrition_logs` : une analyse qu'on n'enregistrait pas ne comptait pas,
   * donc un compte gratuit pouvait scanner à volonté en fermant la fiche à
   * chaque fois. On compte désormais les appels réellement passés au modèle.
   */
  const garde = await garderIA(req, "vision");
  if (!garde.ok) return garde.reponse;

  try {
    const { image, mimeType } = await req.json();

    if (!image || !mimeType) {
      return NextResponse.json({ error: "image et mimeType requis" }, { status: 400 });
    }
    if (typeof image === "string" && image.length > PLAFONDS.imageOctets) {
      return refusTaille("Cette photo");
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY non configurée" }, { status: 500 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${image}` },
            },
            {
              type: "text",
              text: `Tu es un expert en nutrition et en reconnaissance d'aliments. Analyse très attentivement cette photo de repas.

INSTRUCTIONS IMPORTANTES :
- Regarde TOUS les détails visuels : la forme, la texture, la couleur, la sauce des aliments
- Ne confonds pas les aliments similaires : gnocchis ≠ riz, pâtes ≠ riz, quinoa ≠ semoule
- Les gnocchis sont des petites boulettes ovales/rondes de pommes de terre, souvent dans une sauce
- Identifie précisément le plat (ex: "Gnocchis à la sauce tomate" et non "riz")
- Sois précis sur les aliments européens/italiens/français
- Tiens compte de tous les éléments visibles dans l'assiette (viande, légumes, sauce, garniture)

Retourne UNIQUEMENT un objet JSON valide, sans texte avant ou après :
{
  "foodName": "nom précis du plat en français",
  "description": "description courte en français (max 12 mots)",
  "mealType": "petit-dejeuner" ou "dejeuner" ou "gouter" ou "diner",
  "calories": estimation calories totales (nombre entier),
  "proteins": protéines en grammes (nombre entier),
  "carbs": glucides en grammes (nombre entier),
  "fats": lipides en grammes (nombre entier)
}

Sois réaliste sur les portions visibles. Retourne UNIQUEMENT le JSON.`,
            },
          ],
        },
      ],
      max_tokens: 512,
      temperature: 0.1,
    });

    const text = response.choices[0]?.message?.content ?? "";

    // Extract JSON robustly
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Pas de JSON dans la réponse: ${text.slice(0, 200)}`);
    }

    const data = JSON.parse(jsonMatch[0]);

    // Validate required fields
    const required = ["foodName", "description", "mealType", "calories", "proteins", "carbs", "fats"];
    for (const key of required) {
      if (!(key in data)) {
        data[key] = key === "foodName" ? "Repas" : key === "description" ? "" : key === "mealType" ? "dejeuner" : 0;
      }
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Food analysis error:", err);
    return NextResponse.json(
      { error: "Analyse impossible. Vérifie que GROQ_API_KEY est configurée." },
      { status: 500 }
    );
  }
}

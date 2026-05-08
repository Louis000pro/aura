import Groq from "groq-sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { image, mimeType } = await req.json();

    if (!image || !mimeType) {
      return NextResponse.json({ error: "image et mimeType requis" }, { status: 400 });
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
              text: `Tu es un nutritionniste expert. Analyse cette photo de repas.

Retourne UNIQUEMENT un objet JSON valide, sans texte avant ou après:
{
  "foodName": "nom du plat en français (concis)",
  "description": "description courte en français (max 12 mots)",
  "mealType": "petit-dejeuner" ou "dejeuner" ou "gouter" ou "diner" (selon le type de plat visible),
  "calories": estimation calories totales (nombre entier),
  "proteins": protéines en grammes (nombre entier),
  "carbs": glucides en grammes (nombre entier),
  "fats": lipides en grammes (nombre entier)
}

Soit réaliste sur les portions. Si l'image n'est pas un repas, retourne quand même un JSON avec des valeurs à 0.`,
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

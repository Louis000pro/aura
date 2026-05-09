import Groq from "groq-sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(req: Request) {
  try {
    const { description } = await req.json();
    if (!description?.trim()) return NextResponse.json({ error: "description manquante" }, { status: 400 });
    if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "GROQ_API_KEY manquante" }, { status: 500 });

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Tu es un nutritionniste expert. L utilisateur te donne une description textuelle de ce qu il a mange. Tu dois estimer les valeurs nutritionnelles TOTALES pour TOUTE la quantite mentionnee. Reponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou apres.`,
        },
        {
          role: "user",
          content: `Aliment(s) consomme(s) : "${description}"

Retourne un JSON avec :
{
  "foodName": "nom court et clair du repas en francais",
  "mealType": "petit-dejeuner" | "dejeuner" | "gouter" | "diner",
  "calories": total kcal (nombre entier),
  "proteins": proteines totales en g (nombre entier),
  "carbs": glucides totaux en g (nombre entier),
  "fats": lipides totaux en g (nombre entier),
  "confidence": "high" | "medium" | "low"
}

Exemples de precision :
- "5 madeleines" = environ 250 kcal, 4g prot, 36g gluc, 10g lip
- "un bol de lait entier 250ml" = environ 160 kcal, 8g prot, 12g gluc, 9g lip
- Additionne tout si plusieurs aliments

Retourne UNIQUEMENT le JSON.`,
        },
      ],
      max_tokens: 300,
      temperature: 0.1,
    });

    const text = response.choices[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Pas de JSON dans la reponse");

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Nutrition estimate error:", err);
    return NextResponse.json({ error: "Estimation impossible" }, { status: 500 });
  }
}

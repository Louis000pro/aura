import Groq from "groq-sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { description, category, difficulty } = await req.json();
    if (!description?.trim())
      return NextResponse.json({ error: "description manquante" }, { status: 400 });
    if (!process.env.GROQ_API_KEY)
      return NextResponse.json({ error: "GROQ_API_KEY manquante" }, { status: 500 });

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "Tu es un coach sportif expert. L utilisateur decrit une seance d entrainement. Tu generes une seance structuree avec des exercices precis et adaptes. Reponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou apres, sans markdown.",
        },
        {
          role: "user",
          content: `Genere une seance d entrainement basee sur :
Description : "${description}"
Categorie : ${category ?? "force"}
Niveau : ${difficulty ?? "Intermediaire"}

Retourne un JSON avec exactement ce format :
{
  "title": "Nom court et percutant (max 4 mots, en francais)",
  "muscles": ["liste des muscles principaux en francais"],
  "exercises": [
    {
      "name": "Nom de l exercice en francais",
      "sets": 3,
      "reps": 10,
      "rest": 60,
      "restAfter": 90,
      "tip": "Conseil technique court et actionnable",
      "benefit": "Benefice principal de cet exercice",
      "muscles": ["muscle1", "muscle2"]
    }
  ]
}

Regles :
- Entre 4 et 8 exercices, adaptes au niveau ${difficulty ?? "Intermediaire"}
- sets : 2 a 5 (entier)
- reps : 6 a 20 (entier)
- rest : repos entre series en secondes, 30 a 120 (entier)
- restAfter : repos apres l exercice en secondes, 60 a 180 (entier)
- tip et benefit : phrases courtes (max 10 mots)
- Retourne UNIQUEMENT le JSON, rien d autre`,
        },
      ],
      max_tokens: 1800,
      temperature: 0.65,
    });

    const text = response.choices[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Pas de JSON dans la reponse");

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Workout generate error:", err);
    return NextResponse.json({ error: "Generation impossible" }, { status: 500 });
  }
}

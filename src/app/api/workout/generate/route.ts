import Groq from "groq-sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { description, category, difficulty, muscles } = await req.json();
    if (!description?.trim())
      return NextResponse.json({ error: "description manquante" }, { status: 400 });
    // GROQ_API_KEY en priorité, sinon COACH_AURA_KEY (celle du chat) — évite
    // un échec silencieux si une seule des deux clés est configurée.
    const apiKey = process.env.GROQ_API_KEY ?? process.env.COACH_AURA_KEY;
    if (!apiKey)
      return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });

    const groq = new Groq({ apiKey });

    // Extraire la durée cible si mentionnée dans la description (ex: "20min", "20 minutes")
    const durationMatch = description.match(/(\d+)\s*min/i);
    const targetMinutes = durationMatch ? parseInt(durationMatch[1]) : null;
    const targetSeconds = targetMinutes ? targetMinutes * 60 : null;

    const durationConstraint = targetSeconds
      ? `
CONTRAINTE DE DUREE CRITIQUE : la seance doit durer exactement ${targetMinutes} minutes.
La duree est calculee avec cette formule precise, exercice par exercice :
  temps_actif    = sets x reps x 3 secondes
  repos_series   = (sets - 1) x rest secondes
  transition     = restAfter secondes (sauf pour le dernier exercice)
  total_exercice = temps_actif + repos_series + transition

La somme de tous les total_exercice doit etre proche de ${targetSeconds} secondes (= ${targetMinutes} min).
Ajuste le nombre d exercices, les sets, reps, rest et restAfter en consequence.
Calcule mentalement le total avant de repondre et verifie qu il est proche de ${targetSeconds}s.`
      : "";

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
Niveau : ${difficulty ?? "Intermediaire"}${Array.isArray(muscles) && muscles.length > 0 ? `
Muscles cibles par l utilisateur : ${muscles.join(", ")} — la seance DOIT travailler prioritairement ces muscles.` : ""}
${durationConstraint}

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
- Tu es libre de choisir le nombre d exercices, les sets, reps, rest et restAfter selon ce qui est le plus efficace sportivement pour chaque exercice
- Le niveau "${difficulty ?? "Intermediaire"}" influence la complexite et l intensite des exercices choisis :
  * Debutant    : variantes accessibles et simples
  * Intermediaire : exercices classiques bien maitrisés
  * Avance      : exercices techniques et intensites elevees
- tip et benefit : phrases courtes (max 10 mots)
${targetSeconds ? `- SEULE contrainte absolue : total proche de ${targetMinutes} min (${targetSeconds}s) — ajuste librement le nombre d exercices et leurs valeurs pour y arriver` : "- Libre sur le nombre d exercices"}
- Retourne UNIQUEMENT le JSON, rien d autre`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.6,
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

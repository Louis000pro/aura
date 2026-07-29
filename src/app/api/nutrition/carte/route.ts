import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { garderIA, PLAFONDS, refusTaille } from "@/lib/aiLimits";

export const runtime = "nodejs";
export const maxDuration = 30;

/* ════════════════════════════════════════════════════════════════════
   /api/nutrition/carte — « La carte » du resto en photo → l'IA LIT les
   plats et les CLASSE selon l'objectif du moment.

   Règle d'or : on n'a PAS vu les assiettes, seulement des noms sur une
   carte. Donc AUCUN chiffre (ni kcal ni macros) — juste un verdict et une
   raison relative et prudente par plat. Le vrai décompte se fait ensuite
   avec la Photo IA de l'assiette (/api/nutrition/analyze).
   Voir [[nutrition-onmangeou-redesign]].
   ════════════════════════════════════════════════════════════════════ */

type Verdict = "recommande" | "correct" | "eviter";
const VERDICT_RANK: Record<Verdict, number> = { recommande: 0, correct: 1, eviter: 2 };
type RawDish = { name?: unknown; verdict?: unknown; reason?: unknown; best?: unknown };

export async function POST(req: Request) {
  // Même garde-fou que /analyze : c'est le même modèle de vision, donc le même
  // poste de coût, donc le même compteur.
  const garde = await garderIA(req, "vision");
  if (!garde.ok) return garde.reponse;

  try {
    const { image, mimeType, objective, goalKnown } = await req.json();
    if (!image || !mimeType) {
      return NextResponse.json({ error: "image et mimeType requis" }, { status: 400 });
    }
    if (typeof image === "string" && image.length > PLAFONDS.imageOctets) {
      return refusTaille("Cette photo");
    }
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY non configurée" }, { status: 500 });
    }

    const obj = typeof objective === "string" && objective.trim()
      ? objective.trim()
      : "Objectif inconnu : privilégie un plat équilibré et un bon apport en protéines.";

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${image}` } },
            {
              type: "text",
              text: `Tu es un coach nutrition bienveillant. Voici la PHOTO d'une carte / menu de restaurant.

Ta mission : lire les PLATS proposés et les CLASSER pour aider la personne à choisir — SANS jamais inventer de chiffres.

Contexte de la personne (son objectif du moment) :
${obj}

RÈGLES ABSOLUES :
- Tu n'as PAS vu les assiettes, seulement des noms sur une carte. Donc AUCUN chiffre : pas de calories, pas de grammes, pas de macros. Le vrai comptage se fera plus tard avec une photo de l'assiette.
- Pour chaque plat, un "reason" court (max ~12 mots), RELATIF et PRUDENT ("souvent plus riche en protéines", "plutôt copieux", "léger mais peu de protéines"). Jamais affirmatif au gramme près.
- Donne à chaque plat un "verdict" par rapport à SON objectif : "recommande" (bon choix), "correct" (ok mais pas idéal), "eviter" (à garder pour une autre fois — formulé sans culpabiliser).
- Choisis UN SEUL plat avec "best": true — le meilleur pour son objectif.
- Ignore les boissons et le décor ; garde les vrais plats. Maximum 8 plats, les plus notables.

Retourne UNIQUEMENT un JSON valide, sans texte avant ou après :
{
  "place": "nom du restaurant si visible sinon null",
  "dishes": [
    { "name": "nom du plat", "verdict": "recommande", "reason": "raison relative courte", "best": false }
  ]
}`,
            },
          ],
        },
      ],
      max_tokens: 900,
      temperature: 0.2,
    });

    const text = response.choices[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`Pas de JSON dans la réponse: ${text.slice(0, 200)}`);
    const data = JSON.parse(jsonMatch[0]) as { place?: unknown; dishes?: unknown };

    const rawDishes: RawDish[] = Array.isArray(data?.dishes) ? (data.dishes as RawDish[]) : [];
    const dishes = rawDishes
      .map((d) => {
        const verdict: Verdict =
          d?.verdict === "recommande" || d?.verdict === "eviter" ? d.verdict : "correct";
        return {
          name: typeof d?.name === "string" ? d.name.trim().slice(0, 80) : "",
          verdict,
          reason: typeof d?.reason === "string" ? d.reason.trim().slice(0, 120) : "",
          best: d?.best === true,
        };
      })
      .filter((d) => d.name.length > 0)
      .slice(0, 8);

    if (!dishes.length) {
      return NextResponse.json({ error: "carte_illisible", empty: true }, { status: 422 });
    }

    // Un seul "best" : celui marqué, sinon le 1er "recommande", sinon le 1er plat.
    let bestIdx = dishes.findIndex((d) => d.best);
    if (bestIdx < 0) bestIdx = dishes.findIndex((d) => d.verdict === "recommande");
    if (bestIdx < 0) bestIdx = 0;
    dishes.forEach((d, i) => { d.best = i === bestIdx; });

    // Tri : le meilleur d'abord, puis recommande → correct → eviter.
    dishes.sort((a, b) =>
      (b.best ? 1 : 0) - (a.best ? 1 : 0) || VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict]);

    return NextResponse.json({
      place: typeof data?.place === "string" && data.place.trim() ? data.place.trim().slice(0, 60) : null,
      dishes,
      goalKnown: goalKnown === true,
    });
  } catch (err) {
    console.error("Menu scan error:", err);
    return NextResponse.json({ error: "Lecture de la carte impossible, réessaie." }, { status: 500 });
  }
}

import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 30;

// Analyses photo gratuites par jour (la vision IA est le poste de coût le plus cher)
const FREE_DAILY_SCANS = 2;

// Date du jour au format YYYY-MM-DD en fuseau Europe/Paris (= date stockée côté app)
function parisToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export async function POST(req: Request) {
  try {
    // ── 1) Authentification obligatoire (empêche l'abus anonyme de l'endpoint vision) ──
    const admin = createAdminClient();
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "non_authentifié" }, { status: 401 });
    const { data: userData, error: authErr } = await admin.auth.getUser(token);
    const caller = userData?.user;
    if (authErr || !caller) return NextResponse.json({ error: "token_invalide" }, { status: 401 });

    // ── 2) Limite quotidienne pour les comptes gratuits (Premium/admin = illimité) ──
    const { data: prof } = await admin
      .from("profiles").select("is_admin, is_premium").eq("id", caller.id).maybeSingle();
    const unlimited = !!(prof?.is_admin || prof?.is_premium);
    if (!unlimited) {
      const { count } = await admin
        .from("nutrition_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", caller.id).eq("date", parisToday()).eq("has_photo", true);
      if ((count ?? 0) >= FREE_DAILY_SCANS) {
        return NextResponse.json(
          { error: "limite_atteinte", limitReached: true, dailyLimit: FREE_DAILY_SCANS },
          { status: 429 },
        );
      }
    }

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

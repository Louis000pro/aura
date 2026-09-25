import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { garderIA, PLAFONDS, refusTaille } from "@/lib/aiLimits";
import { PROMPT_VISION, appelerVision, calculerRepas, lireReponse, momentDuRepas } from "@/lib/visionRepas";

export const runtime = "nodejs";
export const maxDuration = 45;

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
    const { image, mimeType, heure } = await req.json();

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
    const texte = await appelerVision(
      groq as unknown as Parameters<typeof appelerVision>[0],
      { base64: image, mimeType },
      PROMPT_VISION,
      { maxTokens: 1200, temperature: 0.1 },
    );

    const brut = lireReponse(texte);
    if (!brut) throw new Error(`Pas de JSON dans la réponse: ${texte.slice(0, 200)}`);

    const repas = calculerRepas(brut);
    if (!repas) {
      return NextResponse.json(
        { error: "aucun_repas", message: "Je ne vois pas de repas sur cette photo. Essaie de cadrer l’assiette de plus près." },
        { status: 422 },
      );
    }

    /* Le moment du repas vient de l'heure de la personne, pas du modèle :
       une photo ne dit pas s'il est midi. */
    const h = typeof heure === "number" && heure >= 0 && heure < 24
      ? heure
      : Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", timeZone: "Europe/Paris" }).format(new Date()));

    return NextResponse.json({ ...repas, mealType: momentDuRepas(h) });
  } catch (err) {
    console.error("Food analysis error:", err);
    return NextResponse.json(
      { error: "Analyse impossible, réessaie dans un instant." },
      { status: 500 }
    );
  }
}

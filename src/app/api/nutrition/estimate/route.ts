import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { garderIA, PLAFONDS, refusTaille } from "@/lib/aiLimits";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(req: Request) {
  const garde = await garderIA(req, "estimation");
  if (!garde.ok) return garde.reponse;

  try {
    const { description, enseigne, origin, niveau } = await req.json();
    if (!description?.trim()) return NextResponse.json({ error: "description manquante" }, { status: 400 });
    if (String(description).length > PLAFONDS.texteCourtChars) return refusTaille("Ce texte");
    if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "GROQ_API_KEY manquante" }, { status: 500 });

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Contexte « commande » (livraison / resto) : l'enseigne affine fortement
    // l'estimation (fast-food = plus gras & portions généreuses qu'un resto).
    const hasContext = typeof enseigne === "string" && enseigne.trim().length > 0;
    const originLabel = origin === "livraison" ? "en livraison" : origin === "surplace" ? "au restaurant" : "";
    // Indice de niveau choisi par l'utilisateur (sélecteur visuel) : on le prend
    // comme référence plutôt que de laisser l'IA deviner seule.
    const niveauHint = niveau === "fast-food" || niveau === "resto" || niveau === "healthy" ? String(niveau) : "";

    const userContent = hasContext
      ? `Commande ${originLabel} chez « ${String(enseigne).trim()} ».
Articles : "${description}"

${niveauHint ? `L'utilisateur indique un établissement de type « ${niveauHint} » — prends-le comme référence pour le niveau.\n` : ""}Tiens compte du NIVEAU de l'établissement pour ajuster l'estimation :
- fast-food (McDonald's, Burger King, KFC, kebab, tacos…) = plus gras, plus salé, portions généreuses ;
- restaurant classique / bistro = cuisine standard, portions correctes ;
- enseigne "healthy" (poke, salad bar, jus…) = plus léger, plus de légumes.

Retourne UN JSON avec :
{
  "foodName": "nom court et clair de la commande en francais",
  "mealType": "petit-dejeuner" | "dejeuner" | "gouter" | "diner",
  "calories": total kcal (nombre entier, POUR TOUTE la commande),
  "proteins": proteines totales en g (entier),
  "carbs": glucides totaux en g (entier),
  "fats": lipides totaux en g (entier),
  "enseigneLevel": "fast-food" | "resto" | "healthy" (ton estimation du niveau),
  "category": "burger" | "pizza" | "asiatique" | "bistro" | "tacos" | "petit-dej" | "dessert" (la catégorie la plus proche),
  "confidence": "high" | "medium" | "low"
}

Additionne TOUS les articles. Retourne UNIQUEMENT le JSON.`
      : `Aliment(s) consomme(s) : "${description}"

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

Retourne UNIQUEMENT le JSON.`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Tu es un nutritionniste expert. L utilisateur te donne une description textuelle de ce qu il a mange. Tu dois estimer les valeurs nutritionnelles TOTALES pour TOUTE la quantite mentionnee. Reponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou apres.`,
        },
        { role: "user", content: userContent },
      ],
      max_tokens: 320,
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

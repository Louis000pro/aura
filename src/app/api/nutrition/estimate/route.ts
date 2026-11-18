import { NextResponse } from "next/server";
import { garderIA, PLAFONDS, refusTaille } from "@/lib/aiLimits";
import { llm, optionsIA, hasLLMKey, CLE_ATTENDUE } from "@/lib/llm";
import { calculerRepas } from "@/lib/visionRepas";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(req: Request) {
  const garde = await garderIA(req, "estimation");
  if (!garde.ok) return garde.reponse;

  try {
    const { description, enseigne, origin, niveau } = await req.json();
    if (!description?.trim()) return NextResponse.json({ error: "description manquante" }, { status: 400 });
    if (String(description).length > PLAFONDS.texteCourtChars) return refusTaille("Ce texte");
    if (!hasLLMKey()) return NextResponse.json({ error: `${CLE_ATTENDUE} manquante` }, { status: 500 });

    // Contexte « commande » (livraison / resto) : l'enseigne affine fortement
    // l'estimation (fast-food = plus gras & portions généreuses qu'un resto).
    const hasContext = typeof enseigne === "string" && enseigne.trim().length > 0;
    const originLabel = origin === "livraison" ? "en livraison" : origin === "surplace" ? "au restaurant" : "";
    // Indice de niveau choisi par l'utilisateur (sélecteur visuel) : on le prend
    // comme référence plutôt que de laisser l'IA deviner seule.
    const niveauHint = niveau === "fast-food" || niveau === "resto" || niveau === "healthy" ? String(niveau) : "";

    /* ⭐ MÊME MÉTHODE QUE LA PHOTO (2026-11-18) : le modèle liste chaque
       aliment avec son poids et ses valeurs pour 100 g, et le CODE calcule
       (lib/visionRepas, `calculerRepas`) en prenant les valeurs de la table
       de référence quand l'aliment y est. Un total demandé d'un coup était
       instable (« 5 madeleines » à 250 puis 400 kcal), et les macros ne
       retombaient pas sur les calories. */
    const elementsJson = `"elements": [
    { "nom": "aliment simple, comme dans une table", "quantite_dite": "ce que la personne a écrit (ex. 2 œufs, 1 bol)", "pieces": 2, "grammes": 110, "kcal_100g": 150, "proteines_100g": 12.5, "glucides_100g": 0.7, "lipides_100g": 11 }
  ]`;

    const methode = `MÉTHODE :
1. Sépare chaque aliment ou article mentionné en un élément. Un plat composé de fast-food (burger, tacos, kebab, pizza, sandwich) reste UN élément avec les valeurs du plat entier pour 100 g ; ses frites ou sa boisson sont des éléments à part.
2. Convertis la QUANTITÉ écrite en grammes. Respecte exactement ce qui est dit (« 3 œufs », « 200 g », « un grand bol », « une demi-pizza »). Repères : œuf 55 g, tranche de pain 35 g, tranche de jambon 40 g, yaourt 125 g, banane 120 g, pomme 150 g, cuillère à soupe 15 g (huile 10 g), cuillère à café 5 g, bol de céréales avec lait 250 g, verre 200 ml, canette 330 ml, assiette de pâtes ou de riz cuits 250 g, steak haché 100 g, filet de poulet 130 g. Pour un liquide, 1 ml ≈ 1 g. Une portion se compte telle qu'on la sert réellement, jamais une demi-portion ; sans quantité, prends la portion standard servie.
3. Pour ce qui se compte, donne aussi "pieces".
4. Donne les valeurs pour 100 g de chaque élément dans l'état où il est mangé (cuit si c'est cuit), d'après la table Ciqual.
5. Ajoute ce que la préparation implique quand elle est dite : « poêlé » ou « frit » = huile de cuisson (10 g), « tartine beurrée » = beurre (10 g).

Repères de plats entiers, pour vérifier ton total :
- tacos français façon O'Tacos taille M (frites et sauce fromagère dedans) ≈ 450 g, ≈ 1000 kcal
- kebab ≈ 350 g, ≈ 750 kcal (sans les frites)
- burger de fast-food simple ≈ 300 kcal, burger double ou gourmet ≈ 550 à 750 kcal
- portion de frites moyenne ≈ 115 g, ≈ 330 kcal
- pizza entière pour une personne ≈ 400 g, ≈ 1000 kcal
- 5 madeleines ≈ 125 g, ≈ 550 kcal
En France, « tacos » veut dire le tacos français (galette roulée, grillée), pas le petit taco mexicain, sauf si la personne le précise.`;

    const userContent = hasContext
      ? `Commande ${originLabel} chez « ${String(enseigne).trim()} ».
Articles : "${description}"

${niveauHint ? `L’utilisateur indique un établissement de type « ${niveauHint} », prends-le comme référence pour le niveau.\n` : ""}Tiens compte du NIVEAU de l’établissement pour ajuster l’estimation :
- fast-food (McDonald’s, Burger King, KFC, kebab, tacos…) = plus gras, plus salé, portions généreuses ;
- restaurant classique / bistro = cuisine standard, portions correctes ;
- enseigne "healthy" (poke, salad bar, jus…) = plus léger, plus de légumes.
Si tu connais les valeurs officielles d’un article de cette enseigne, utilise-les.

${methode}

Retourne UN JSON avec :
{
  "foodName": "nom court et clair de la commande en francais",
  ${elementsJson},
  "enseigneLevel": "fast-food" | "resto" | "healthy" (ton estimation du niveau),
  "category": "burger" | "pizza" | "asiatique" | "bistro" | "tacos" | "petit-dej" | "dessert" (la catégorie la plus proche),
  "confidence": "high" | "medium" | "low"
}

Retourne UNIQUEMENT le JSON.`
      : `Aliment(s) consomme(s) : "${description}"

${methode}

Retourne un JSON avec :
{
  "foodName": "nom court et clair du repas en francais",
  "mealType": "petit-dejeuner" | "dejeuner" | "gouter" | "diner" ("gouter" = un extra pris entre les repas : shaker, fruit, boisson, encas),
  ${elementsJson},
  "confidence": "high" | "medium" | "low"
}

Retourne UNIQUEMENT le JSON.`;

    /* Le texte passe par le même fournisseur que le Guide (lib/llm.ts).
       Il avait son propre modèle Groq, codé en dur, et Groq l'a retiré deux
       fois (llama-3.3-70b, puis llama-4-scout le 2026-10-23) : l'estimation
       tombait en panne en silence. Rôle « coach » et pas « outil » : le
       petit modèle sous-estimait grossièrement le fast-food (un tacos
       frites à 500 kcal, Louis le 2026-10-23). */
    const response = await llm.chat.completions.create({
      ...optionsIA("coach", 900),
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Tu es un nutritionniste expert. L utilisateur te donne une description textuelle de ce qu il a mange. Tu listes chaque aliment avec son poids exact pour TOUTE la quantite mentionnee et ses valeurs pour 100 g. Reponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou apres.`,
        },
        { role: "user", content: userContent },
      ],
      temperature: 0.1,
    });

    const text = response.choices[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Pas de JSON dans la reponse");

    const data = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    /* Les totaux sont la somme des éléments, calculée ici. Une réponse sans
       éléments exploitables (ancien format) garde ses totaux tels quels. */
    const repas = calculerRepas({ plat: data.foodName, elements: data.elements });
    if (!repas) return NextResponse.json(data);
    const { elements: _e, ...reste } = data;
    void _e;
    return NextResponse.json({
      ...reste,
      foodName: repas.foodName,
      calories: repas.calories,
      proteins: repas.proteins,
      carbs: repas.carbs,
      fats: repas.fats,
      items: repas.items,
    });
  } catch (err) {
    console.error("Nutrition estimate error:", err);
    return NextResponse.json({ error: "Estimation impossible" }, { status: 500 });
  }
}

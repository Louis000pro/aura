import { llm, hasLLMKey, CHAT_MODEL } from "@/lib/llm";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { description, category, difficulty, muscles, nutritionNote } = await req.json();
    if (!description?.trim())
      return NextResponse.json({ error: "description manquante" }, { status: 400 });
    if (!hasLLMKey())
      return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });

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

    // Contrainte de MATERIEL deduite du lieu mentionne dans la description
    // (meme texte que les callers : "en salle de sport" / "a la maison avec
    // halteres" / "a la maison au poids du corps").
    const lieuLc = String(description).toLowerCase();
    let equipmentConstraint = "";
    if (/salle|gym|basic\s*fit/.test(lieuLc)) {
      equipmentConstraint = `
LIEU : SALLE de sport equipee — tout le materiel est disponible (machines, barres, halteres, poulies, banc, barre de traction). Tu peux tout utiliser.`;
    } else if (/halt[èe]re/.test(lieuLc)) {
      equipmentConstraint = `
MATERIEL (STRICT) : a la MAISON avec des HALTERES. Tu peux utiliser des halteres + le poids du corps UNIQUEMENT. INTERDIT : machines, poulies, barre, banc de muscu, barre de traction, kettlebell, et tout exercice de salle.`;
    } else if (/poids\s*du\s*corps|sans\s*mat|maison|chez\s*(soi|moi)|domicile/.test(lieuLc)) {
      equipmentConstraint = `
MATERIEL (STRICT) : a la MAISON, SANS AUCUN materiel — poids du corps UNIQUEMENT. INTERDIT formellement : halteres, barre, machine, poulie, kettlebell, elastique, banc, AINSI QUE tout exercice suspendu necessitant une barre de traction (PAS de tractions, PAS de releves de jambes suspendus) ou un poids additionnel (PAS de "leste", PAS de "charge"). Uniquement des exercices au sol ou debout, faisables dans une piece.`;
    }

    // Bonus nutrition OPTIONNEL : présent seulement si le caller a un signal clair
    // pour AUJOURD'HUI. Soft par construction — jamais une contrainte dure.
    const nutritionConstraint = (typeof nutritionNote === "string" && nutritionNote.trim())
      ? `
NUTRITION (BONUS OPTIONNEL — jamais une contrainte) : ${nutritionNote.trim()}
Tu PEUX t en servir pour un LEGER ajustement (intensite, volume ou duree) ou pour enrichir un "tip". Ne reduis JAMAIS la qualite de la seance et n en fais pas le sujet.`
      : "";

    const response = await llm.chat.completions.create({
      model: CHAT_MODEL,
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
Muscles cibles par l utilisateur : ${muscles.join(", ")} — la seance DOIT travailler prioritairement ces muscles.` : ""}${equipmentConstraint}${nutritionConstraint}
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
- MATERIEL (ABSOLU) : respecte la contrainte de LIEU/MATERIEL ci-dessus. Ne propose JAMAIS un exercice impossible avec le materiel indique (au poids du corps : aucun exercice avec barre/halteres/machine, ni suspendu a une barre, ni leste/charge).
- NOM DES EXERCICES (CRITIQUE) : pour "name", utilise TOUJOURS le nom standard et reconnaissable de l exercice, celui qu un debutant trouverait sur YouTube et qu on emploie en salle (ex : "Développé couché", "Curl haltères", "Fentes avant", "Pompes diamant", "Dips sur banc", "Gainage planche"). JAMAIS de nom invente, poetique ou metaphorique (INTERDIT : "Bras de guerrier", "Gainage du dragon", "Dips entre deux chaises"). Si c est une variante, garde le nom de base reconnaissable suivi de la precision (ex : "Squat sauté", "Pompes inclinées"). Un nom clair = l utilisateur sait quoi faire et trouve une video de demo.
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
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Pas de JSON dans la reponse");

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);
  } catch (err) {
    const e = err as { status?: number; message?: string };
    console.error("Workout generate error:", err);
    // Détail temporaire pour diagnostic (statut Mistral : 429 ? parse ? …)
    return NextResponse.json(
      { error: `Generation impossible [${e?.status ?? "?"}] ${(e?.message ?? "").slice(0, 150)}` },
      { status: 500 },
    );
  }
}

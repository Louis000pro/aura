import { llm, hasLLMKey, CHAT_MODEL } from "@/lib/llm";
import { NextResponse } from "next/server";
import { garderIA, PLAFONDS, refusTaille } from "@/lib/aiLimits";
import { exercicesDisponibles, aplatir, type LibExercise } from "@/lib/exerciseLibrary";
import { resolveGuide } from "@/lib/exerciseGuides";

/* Nombre d'exercices d'une séance « normale ». Louis, 2026-07-30 : le modèle
   s'était mis une barrière invisible à 3 mouvements. Rien ne l'y obligeait,
   mais rien ne l'en empêchait non plus, et une carte qui scrolle un peu ne
   dérange personne. La contrainte de durée, elle, reste prioritaire. */
const EXOS_MIN = 5;
const EXOS_MAX = 8;

/** Un exercice tel qu'il sort du modèle (ou tel qu'on le complète). */
type ExoGenere = {
  name: string;
  sets: number;
  reps: number | string;
  rest: number;
  restAfter: number;
  tip?: string;
  benefit?: string;
  muscles?: string[];
};

/** Traduit une entrée de la bibliothèque en exercice de séance. */
function depuisLaBibliotheque(e: LibExercise): ExoGenere {
  return {
    name: e.name,
    sets: e.sets,
    reps: e.mode === "temps" ? `${e.seconds}s` : e.reps,
    rest: e.rest,
    restAfter: Math.max(e.rest, 60),
    tip: e.tip,
    benefit: e.benefit,
    muscles: e.muscles,
  };
}

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const garde = await garderIA(req, "seance");
  if (!garde.ok) return garde.reponse;

  try {
    const { description, category, difficulty, muscles, nutritionNote } = await req.json();
    if (!description?.trim())
      return NextResponse.json({ error: "description manquante" }, { status: 400 });
    if (String(description).length > PLAFONDS.texteCourtChars)
      return refusTaille("Cette description");
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
    const ctx: "salle" | "halteres" | "poids" = /salle|gym|basic\s*fit/.test(lieuLc)
      ? "salle"
      : /halt[èe]re/.test(lieuLc) ? "halteres" : "poids";
    let equipmentConstraint = "";
    if (/salle|gym|basic\s*fit/.test(lieuLc)) {
      equipmentConstraint = `
LIEU : SALLE de sport equipee, tout le materiel est disponible (machines, barres, halteres, poulies, banc, barre de traction). Tu peux tout utiliser.`;
    } else if (/halt[èe]re/.test(lieuLc)) {
      equipmentConstraint = `
MATERIEL (STRICT) : a la MAISON avec des HALTERES. Tu peux utiliser des halteres + le poids du corps UNIQUEMENT. INTERDIT : machines, poulies, barre, banc de muscu, barre de traction, kettlebell, et tout exercice de salle.`;
    } else if (/poids\s*du\s*corps|sans\s*mat|maison|chez\s*(soi|moi)|domicile/.test(lieuLc)) {
      equipmentConstraint = `
MATERIEL (STRICT) : a la MAISON, SANS AUCUN materiel, poids du corps UNIQUEMENT. INTERDIT formellement : halteres, barre, machine, poulie, kettlebell, elastique, banc, AINSI QUE tout exercice suspendu necessitant une barre de traction (PAS de tractions, PAS de releves de jambes suspendus) ou un poids additionnel (PAS de "leste", PAS de "charge"). Uniquement des exercices au sol ou debout, faisables dans une piece.`;
    }

    // Bonus nutrition OPTIONNEL : présent seulement si le caller a un signal clair
    // pour AUJOURD'HUI. Soft par construction — jamais une contrainte dure.
    const nutritionConstraint = (typeof nutritionNote === "string" && nutritionNote.trim())
      ? `
NUTRITION (BONUS OPTIONNEL, jamais une contrainte) : ${nutritionNote.trim()}
Tu PEUX t en servir pour un LEGER ajustement (intensite, volume ou duree) ou pour enrichir un "tip". Ne reduis JAMAIS la qualite de la seance et n en fais pas le sujet.`
      : "";

    /* LA LISTE FERMÉE. Le modèle ne choisit plus les noms tout seul : il pioche
       dans les gestes qui ont un personnage animé, et rien d'autre. C'est la
       seule façon fiable de tenir la promesse « chaque mouvement se voit ».
       Le contrôle après coup (plus bas) reste indispensable : un petit modèle
       reformule volontiers un nom qu'on vient de lui donner. */
    const dispo = exercicesDisponibles(ctx);
    const listeAutorisee = dispo.map((e) => e.name).join(" | ");

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
Muscles cibles par l utilisateur : ${muscles.join(", ")}, la seance DOIT travailler prioritairement ces muscles.` : ""}${equipmentConstraint}${nutritionConstraint}
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
- NOM DES EXERCICES (REGLE ABSOLUE) : le champ "name" doit etre COPIE MOT POUR MOT depuis la liste autorisee ci-dessous. Aucun autre exercice n existe pour toi. Pas de variante, pas de reformulation, pas de precision ajoutee, pas de traduction : la copie doit etre exacte, accents compris. Un nom hors liste est supprime de la seance, donc tu perds l exercice.
LISTE AUTORISEE (${dispo.length} exercices, choisis UNIQUEMENT la dedans) :
${listeAutorisee}
- MATERIEL : la liste ci-dessus est deja filtree pour le lieu indique. Tu n as donc rien a exclure toi-meme, mais respecte la coherence de la seance.
- NOMBRE D EXERCICES : ${EXOS_MIN} a ${EXOS_MAX}. Ne descends JAMAIS en dessous de ${EXOS_MIN}${targetSeconds ? ` sauf si la contrainte de duree l impose` : ""}. Une seance courte se fait avec moins de series, pas avec moins d exercices. N essaie pas de faire tenir la seance dans un ecran : l affichage scrolle.
- Tu es libre pour les sets, reps, rest et restAfter selon ce qui est le plus efficace sportivement pour chaque exercice
- Le niveau "${difficulty ?? "Intermediaire"}" influence la complexite et l intensite des exercices choisis :
  * Debutant    : variantes accessibles et simples
  * Intermediaire : exercices classiques bien maitrisés
  * Avance      : exercices techniques et intensites elevees
- tip et benefit : phrases courtes (max 10 mots)
${targetSeconds ? `- DUREE : total proche de ${targetMinutes} min (${targetSeconds}s), joue d abord sur les series et le repos, et seulement ensuite sur le nombre d exercices` : ""}
- Retourne UNIQUEMENT le JSON, rien d autre`,
        },
      ],
      // De quoi ecrire 8 exercices complets sans tronquer le JSON (un JSON
      // coupe en deux ne parse pas du tout : la generation echoue en entier).
      max_tokens: 2200,
      temperature: 0.6,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Pas de JSON dans la reponse");

    const data = JSON.parse(jsonMatch[0]);

    /* ── Le filtre qui tient la promesse ──
       Le prompt demande de copier les noms ; le modèle en reformule quand même.
       On garde donc un exercice seulement si son nom résout vers un
       personnage animé (`resolveGuide`, la même fonction que le tunnel et la
       carte), quitte à le remplacer par son homologue exact de la
       bibliothèque quand on le reconnaît. Ce qui ne s'anime pas ne passe pas. */
    const parNom = new Map(dispo.map((e) => [aplatir(e.name), e]));
    const vus = new Set<string>();
    const gardes: ExoGenere[] = [];

    for (const brut of Array.isArray(data.exercises) ? data.exercises : []) {
      const nom = String(brut?.name ?? "").trim();
      if (!nom) continue;
      const exact = parNom.get(aplatir(nom));
      // Nom hors bibliothèque mais qui a bien sa planche (variante reconnue
      // par les règles) : on le garde tel quel, l'animation existe.
      if (!exact && !resolveGuide(nom)) continue;
      const cle = aplatir(exact?.name ?? nom);
      if (vus.has(cle)) continue;
      vus.add(cle);
      gardes.push(exact
        ? { ...depuisLaBibliotheque(exact), ...brut, name: exact.name }
        : (brut as ExoGenere));
      if (gardes.length >= EXOS_MAX) break;
    }

    /* Si le tri a trop coupé, on complète depuis la bibliothèque plutôt que de
       rendre une séance de deux mouvements : les muscles demandés d'abord, le
       reste du contexte ensuite. Une séance amputée est pire qu'une séance
       complétée par des gestes qu'on sait animés. */
    const vises = new Set(
      (Array.isArray(muscles) ? muscles : []).concat(Array.isArray(data.muscles) ? data.muscles : [])
        .filter((m: unknown): m is string => typeof m === "string")
        .map(aplatir),
    );
    const pertinent = (e: LibExercise) =>
      vises.size === 0 || e.muscles.some((m) => vises.has(aplatir(m)));
    const renfort = [...dispo.filter(pertinent), ...dispo].filter((e) => !vus.has(aplatir(e.name)));
    for (const e of renfort) {
      if (gardes.length >= EXOS_MIN) break;
      if (vus.has(aplatir(e.name))) continue; // `renfort` liste deux fois les pertinents
      vus.add(aplatir(e.name));
      gardes.push(depuisLaBibliotheque(e));
    }

    return NextResponse.json({ ...data, exercises: gardes });
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

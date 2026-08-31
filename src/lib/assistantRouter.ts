/* ════════════════════════════════════════════════════════════════════
   assistantRouter — QUI décide de l'action, et pourquoi ce n'est plus le
   coach lui-même.

   Le chantier précédent avait mis les actions dans le même tour que la
   parole (tool calling) pour qu'elles ne puissent plus se contredire. La
   logique était bonne, l'exécution non : Louis a signalé que la carte de
   séance n'apparaissait qu'à la DEUXIÈME demande. Mesuré en direct contre
   l'API, sur la demande « fais une séance pecs » :

     prompt système de   241 caractères → outil appelé 6 fois sur 6
     prompt système de 1 762 caractères → 3 fois sur 6
     prompt système de 5 371 caractères → 1 fois sur 6

   Le prompt réel du coach fait plus de 5 000 caractères (domaines, ton,
   santé, nutrition, lieu, connaissance du site, profil, stats). Ce n'est
   donc pas une question de formulation : `mistral-small-latest` cesse
   simplement d'appeler ses outils quand on l'enterre sous les consignes.
   Aucune réécriture ne rattrape ça, on a essayé (retirer les phrases
   d'exemple recopiables, réécrire la description de l'outil, déplacer le
   bloc, baisser la température) : au mieux 3/6.

   D'où ce fichier : la décision d'action part dans un appel SÉPARÉ, court,
   qui ne fait que ça. Mesuré sur 25 cas : 24 corrects, ~550 ms.

   ⚠️ Ce n'est PAS le retour des deux cerveaux d'avant. Ce qui rendait
   l'ancien montage bancal, ce n'est pas le nombre d'appels, c'est que les
   deux DÉCIDAIENT chacun de leur côté avec des informations différentes,
   et que le coach promettait une carte que l'analyseur n'avait pas
   préparée. Ici il n'y a plus qu'un seul décideur : le coach n'a plus
   d'outils du tout, il ne fait que parler ; l'aiguilleur ne parle jamais,
   il ne fait que décider. Ils ne peuvent pas être en désaccord puisqu'ils
   ne répondent pas à la même question.

   ⚠️ `rien_a_faire` n'est pas décoratif. Sans issue de secours, le modèle
   appelle quelque chose PLUTÔT QUE RIEN : « salut » et « merci » partaient
   sur open_page. Avec cet outil-là, ils retombent correctement sur zéro
   action. Il ne sort jamais d'ici : il est traduit en `null`.
   ════════════════════════════════════════════════════════════════════ */

import type OpenAI from "openai";
import { llm, CHAT_MODEL } from "@/lib/llm";
import { ASSISTANT_TOOLS, type AssistantAction } from "@/lib/assistantTools";

const RIEN = "rien_a_faire";

const OUTILS = [
  {
    type: "function" as const,
    function: {
      name: RIEN,
      description:
        "Le message n’appelle AUCUNE action dans l’app : c’est une question de connaissance, un avis, une discussion, une confidence, un état ou une douleur, un salut, un remerciement, une réaction courte. C’est le cas le plus fréquent : dans le doute, appelle celui-ci.",
      parameters: { type: "object", properties: {} },
    },
  },
  ...ASSISTANT_TOOLS,
];

/* Court EXPRÈS : c'est toute la raison d'être de ce fichier. Avant d'ajouter
   une ligne ici, rappelle-toi que la fiabilité s'écroule avec la longueur. */
const PROMPT = `Tu es l’aiguilleur de Vaiiya, une app de sport et de nutrition. Tu lis le DERNIER message de l’utilisateur et tu appelles l’outil qui correspond à ce qu’il te demande de FAIRE dans l’app. S’il ne demande rien à faire, tu appelles ${RIEN}.
Tu appelles TOUJOURS exactement un outil, et tu n’écris jamais de texte.`;

type Message = { role: "user" | "assistant"; content: unknown };

/** Le texte d'un message, quel que soit son format (une image ne dit rien
 *  d'utile à l'aiguilleur, et alourdirait l'appel pour rien). */
function texteDe(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((p) => (p && typeof p === "object" && "text" in p ? String((p as { text?: unknown }).text ?? "") : ""))
    .join(" ")
    .trim();
}

/**
 * L'action que réclame le dernier message, ou `null` s'il n'y en a aucune.
 * Ne lève jamais : une panne d'aiguillage doit laisser le coach parler
 * normalement, pas casser la conversation.
 */
export async function deciderAction(messages: Message[]): Promise<AssistantAction | null> {
  // Les trois derniers tours suffisent pour comprendre une correction
  // (« non, plutôt vendredi ») sans rallonger l'appel.
  const recents = messages
    .slice(-3)
    .map((m) => ({ role: m.role, content: texteDe(m.content) }))
    .filter((m) => m.content);
  if (recents.length === 0 || recents[recents.length - 1].role !== "user") return null;

  try {
    const res = await llm.chat.completions.create({
      model: CHAT_MODEL,
      messages: [{ role: "system", content: PROMPT }, ...recents] as OpenAI.Chat.ChatCompletionMessageParam[],
      max_tokens: 200,
      temperature: 0,
      tools: OUTILS as OpenAI.Chat.Completions.ChatCompletionTool[],
      tool_choice: "auto",
    });

    const appel = res.choices?.[0]?.message?.tool_calls?.[0];
    if (!appel || !("function" in appel)) return null;
    const nom = appel.function?.name;
    if (!nom || nom === RIEN) return null;

    let args: Record<string, unknown> = {};
    try {
      const brut = appel.function?.arguments;
      if (brut) args = JSON.parse(brut);
    } catch { /* arguments illisibles : l'intent seul suffit à ouvrir la carte */ }

    return { ...args, intent: nom } as AssistantAction;
  } catch (err) {
    console.error("[aiguilleur] échec :", (err as { message?: string })?.message ?? err);
    return null;
  }
}

/** Le nom de la carte qui va s'ouvrir, tel qu'on le dit au coach. */
const CARTES: Record<string, string> = {
  create_seance: "une proposition de séance",
  plan_set: "une séance à mettre sur un jour de son planning",
  plan_move: "un déplacement de séance dans son planning",
  plan_location: "un changement de lieu sur un jour de son planning",
  plan_library: "une de ses séances à poser sur un jour",
  plan_regen: "une nouvelle semaine de planning",
  log_meal: "un repas à ajouter à son journal",
  create_recipe: "une recette",
};

/**
 * Ce qu'on ajoute au prompt du coach une fois l'action connue.
 *
 * C'est la raison pour laquelle l'aiguilleur passe AVANT et non à côté : un
 * coach qui ignore ce qui va s'afficher sous lui réécrit la carte (il listait
 * les exercices, mesuré) ou promet une carte qui ne viendra pas. Informé, il
 * ne peut plus faire ni l'un ni l'autre.
 */
export function cadreAction(action: AssistantAction | null): string {
  if (!action) {
    return `\n\nCE QUI SE PASSE PENDANT QUE TU RÉPONDS : aucune carte ne va s’afficher sous ton message. Réponds donc pour de vrai, avec du contenu utile, et n’annonce JAMAIS quelque chose « à valider juste en dessous ».`;
  }
  if (action.intent === "ask_choice") return "";
  const carte = CARTES[action.intent];
  if (!carte) {
    // set_theme, open_page, save_lieu : ça agit sans rien faire valider.
    return `\n\nCE QUI SE PASSE PENDANT QUE TU RÉPONDS : l’app est en train de faire ce qu’il demande. Confirme-le en UNE phrase courte, sans détailler.`;
  }
  return `\n\nCE QUI SE PASSE PENDANT QUE TU RÉPONDS : ${carte} s’affiche à l’instant juste sous ton message, et il la validera d’un clic. Annonce-la en UNE seule phrase courte et chaleureuse, puis arrête-toi. N’écris SURTOUT pas ce qu’elle contient (ni exercices, ni séries, ni répétitions, ni calories, ni macros) et ne lui propose pas un choix qu’elle lui propose déjà. Ici, exceptionnellement, tu ne poses aucune question : la carte attend déjà sa réponse.`;
}

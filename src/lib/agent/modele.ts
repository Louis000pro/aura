/* L'appel au vrai modèle pour la boucle d'agent, par le client unique de
   l'app (`llm`) : le test mesure donc le fournisseur et le modèle de
   production, pas une copie. ⚠️ Prototype du test du 2026-10-13. */
import type OpenAI from "openai";
import { llm, optionsIA, type RoleIA } from "@/lib/llm";
import type { AppelerModele } from "./boucle";

/* Les limites du fournisseur, rendues avec chaque appel : le test tourne
   sur la clé de production, il ne doit pas épuiser le quota du coach. */
const LIMITES = [
  "x-ratelimit-limit-requests",
  "x-ratelimit-limit-tokens",
  "x-ratelimit-remaining-requests",
  "x-ratelimit-remaining-tokens",
  "x-ratelimit-reset-requests",
  "x-ratelimit-reset-tokens",
];

export type ReglageModele = {
  /** `coach` = le grand modèle, `outil` = le petit (voir llm.ts). */
  role: RoleIA;
  /** Ne compte que chez un fournisseur qui raisonne. */
  effort: "low" | "medium" | "high";
  /** Ce que la réponse visible a le droit d'occuper (la réserve de
   *  raisonnement s'ajoute par-dessus, comme partout dans l'app). */
  maxJetons?: number;
  temperature?: number;
};

export function appelerLLM(reglage: ReglageModele): AppelerModele {
  return async (messages, outils) => {
    const base = optionsIA(reglage.role, reglage.maxJetons ?? 1200);
    const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      ...base,
      ...(base.reasoning_effort ? { reasoning_effort: reglage.effort } : {}),
      temperature: reglage.temperature ?? 0.2,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      tools: outils.map((o) => ({
        type: "function" as const,
        function: { name: o.nom, description: o.description, parameters: o.parametres },
      })),
      tool_choice: "auto",
    };
    const { data, response } = await llm.chat.completions.create(params).withResponse();
    const choix = data.choices[0];
    const message = choix?.message;
    const appels = (message?.tool_calls ?? []).flatMap((t) =>
      t.type === "function" ? [{ id: t.id, nom: t.function.name, arguments: t.function.arguments }] : []
    );
    const limites: Record<string, string> = {};
    for (const cle of LIMITES) {
      const v = response.headers.get(cle);
      if (v) limites[cle.replace("x-ratelimit-", "")] = v;
    }
    return {
      texte: message?.content ?? null,
      appels,
      jetonsEntree: data.usage?.prompt_tokens ?? 0,
      jetonsSortie: data.usage?.completion_tokens ?? 0,
      finRaison: choix?.finish_reason ?? null,
      limites,
    };
  };
}

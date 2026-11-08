import { texteLlms } from "@/lib/llmsTxt";

/* /llms.txt : le résumé de Vaiiya pour les IA (voir `lib/llmsTxt.ts`).

   Son contenu ne dépend que du code (chiffres, programmes, prix), jamais de
   la requête : il est donc construit une fois, au build, comme le sitemap. */
export const dynamic = "force-static";

export function GET() {
  return new Response(texteLlms(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Fait pour être lu par les IA, pas pour sortir comme une page dans Google.
      "X-Robots-Tag": "noindex",
    },
  });
}

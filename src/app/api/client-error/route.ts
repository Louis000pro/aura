import { NextRequest } from "next/server";
import { autoriserRafale } from "@/lib/rateLimit";

/**
 * POST /api/client-error
 *
 * Le journal des erreurs qui atteignent `app/error.tsx` et
 * `app/global-error.tsx`. Ces frontières ne faisaient qu'un `console.error`
 * dans le navigateur de la personne : aucune occurrence n'a jamais laissé de
 * trace, et on ne pouvait que deviner la cause. Un `console.error` ici fait
 * remonter la ligne dans les erreurs runtime Vercel, donc elle devient lisible.
 *
 * ⚠️ ELLE EST PUBLIQUE, ET C'EST OBLIGATOIRE : l'écran d'erreur s'affiche
 * aussi à quelqu'un qui n'est pas connecté (c'est même le cas observé, la
 * barre de navigation était absente). Exiger un jeton reviendrait à ne pas
 * journaliser le cas qu'on cherche. D'où les deux garde-fous ci-dessous.
 *
 * ⚠️ ON NE FAIT CONFIANCE À RIEN DU CORPS REÇU. La ligne de journal est
 * RECOMPOSÉE à partir d'une liste fermée de champs, chacun tronqué : écrire
 * directement ce qu'un client envoie reviendrait à laisser n'importe qui
 * injecter ce qu'il veut dans nos journaux.
 */

/** Corps plus gros que ça : on ne lit même pas. La pile est déjà tronquée
 *  côté client, donc un corps volumineux n'est pas un cas légitime. */
const MAX_OCTETS = 8_000;

/** 10 comptes rendus par IP et par tranche de 10 minutes. Assez pour voir une
 *  rafale réelle (un écran qui plante en boucle), trop peu pour inonder. */
const MAX_PAR_IP = 10;
const FENETRE_MS = 10 * 60 * 1000;

function texte(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  // Les retours à la ligne d'une pile sont remplacés : une ligne de journal
  // qui en contient devient plusieurs entrées illisibles côté Vercel.
  return v.replace(/\s+/g, " ").slice(0, max);
}

export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "inconnue";
    if (!autoriserRafale("client-error", ip, MAX_PAR_IP, FENETRE_MS)) {
      return new Response(null, { status: 429 });
    }

    const brut = await req.text();
    if (brut.length > MAX_OCTETS) return new Response(null, { status: 413 });

    const d = JSON.parse(brut) as Record<string, unknown>;

    /* Liste fermée. Aucun autre champ n'est lu, donc aucun autre champ ne peut
       arriver dans les journaux, même si le client en envoyait. */
    const nom = texte(d.nom, 80) || "Error";
    const message = texte(d.message, 300);
    const chemin = texte(d.chemin, 200); // pathname seul, jamais la query
    const build = texte(d.build, 40);
    const origine = texte(d.origine, 20);
    const secours = texte(d.secours, 20);
    // Build de la tentative précédente et son âge : sur « deja-tente », c'est
    // ce qui dit si le rechargement a changé de build entre les deux.
    const tentative = texte(d.tentative, 40);
    const sw = texte(d.sw, 30);
    const digest = texte(d.digest, 80);
    const ua = texte(d.ua, 300);
    // Surtout pas `const module` : `@next/next/no-assign-module-variable`
    // l'interdit, et une variable qui porte ce nom-là dans un bundle n'a de
    // toute façon rien d'anodin.
    const estModule = d.module === true;
    const caches = Array.isArray(d.caches)
      ? d.caches.slice(0, 12).map((c) => texte(c, 40)).filter(Boolean).join(",")
      : "";
    const pile = texte(d.pile, 1500);

    console.error(
      `[client-error] ${nom}: ${message} | module=${estModule} secours=${secours} ` +
        `tentative=${tentative} chemin=${chemin} build=${build} origine=${origine} sw=${sw} ` +
        `digest=${digest} caches=${caches} ua=${ua} | pile: ${pile}`,
    );

    return new Response(null, { status: 204 });
  } catch {
    /* Un corps illisible ne vaut pas une erreur : on répond 204 pour que le
       client n'ait rien à réessayer. Cette route ne doit jamais devenir une
       source de bruit à son tour. */
    return new Response(null, { status: 204 });
  }
}

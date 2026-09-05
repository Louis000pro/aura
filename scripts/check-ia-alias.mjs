/* Résout les imports « @/… » vers src/… pour que `npm run check:ia` exerce le
   VRAI code de l'app (l'aiguilleur, ses outils, ses prompts) au lieu d'en
   recopier une version qui divergerait au premier changement.
   Chargé par --import ; Node applique ensuite le retrait de types aux .ts. */
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { statSync } from "node:fs";
import path from "node:path";

const RACINE = path.resolve(import.meta.dirname, "..");

export async function resolve(spec, ctx, next) {
  if (spec.startsWith("@/")) {
    const base = path.join(RACINE, "src", spec.slice(2));
    for (const ext of ["", ".ts", ".tsx", "/index.ts"]) {
      try {
        statSync(base + ext);
        return next(pathToFileURL(base + ext).href, ctx);
      } catch { /* essai suivant */ }
    }
  }
  return next(spec, ctx);
}

register("./check-ia-alias.mjs", pathToFileURL(import.meta.filename));

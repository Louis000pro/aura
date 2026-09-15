/* Résout les imports « @/… » vers src/… pour que `npm run check:ia` exerce le
   VRAI code de l'app (l'aiguilleur, ses outils, ses prompts) au lieu d'en
   recopier une version qui divergerait au premier changement.
   Chargé par --import ; Node applique ensuite le retrait de types aux .ts. */
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { statSync } from "node:fs";
import path from "node:path";

const RACINE = path.resolve(import.meta.dirname, "..");

const EXTENSIONS = ["", ".ts", ".tsx", "/index.ts"];

function premierExistant(base) {
  for (const ext of EXTENSIONS) {
    try {
      statSync(base + ext);
      return base + ext;
    } catch { /* essai suivant */ }
  }
  return null;
}

export async function resolve(spec, ctx, next) {
  if (spec.startsWith("@/")) {
    const trouve = premierExistant(path.join(RACINE, "src", spec.slice(2)));
    if (trouve) return next(pathToFileURL(trouve).href, ctx);
  }
  /* ⚠️ ET LES IMPORTS RELATIFS SANS EXTENSION, qui sont la moitié de `src/lib`.
     TypeScript les résout, l'ESM de Node NON : il exige l'extension. Un banc
     qui exerce un module dont une dépendance s'écrit `./serverEnv` échouait
     donc au chargement, sur un fichier parfaitement valide. On complète
     l'extension de la même façon que pour `@/`, à partir du fichier
     IMPORTATEUR. Rien n'est court-circuité : on ne s'en mêle que si le
     chemin ne désigne pas déjà un fichier existant. */
  if ((spec.startsWith("./") || spec.startsWith("../")) && ctx.parentURL?.startsWith("file:")) {
    const depuis = path.dirname(new URL(ctx.parentURL).pathname);
    const base = path.resolve(depuis, spec);
    try {
      statSync(base);
    } catch {
      const trouve = premierExistant(base);
      if (trouve) return next(pathToFileURL(trouve).href, ctx);
    }
  }
  return next(spec, ctx);
}

register("./check-ia-alias.mjs", pathToFileURL(import.meta.filename));

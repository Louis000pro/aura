/* ════════════════════════════════════════════════════════════════════
   Le mode revue de `/bienvenue`.

   Il existe pour une seule raison : pouvoir rejouer le parcours d'entrée
   autant de fois qu'il le faut, avec Nora puis avec Sasha, sans créer de
   compte, sans toucher à la base, et sans abîmer son vrai profil.

   ⚠️ IL NE DOIT JAMAIS S'OUVRIR EN PRODUCTION. La règle est donc écrite
   à l'envers de l'habitude : on n'autorise pas « sauf en production »,
   on refuse SAUF preuve positive qu'on est ailleurs. Si l'information
   d'environnement venait à manquer (variable non injectée, configuration
   changée), le mode disparaît de la préversion, ce qui se voit tout de
   suite et ne casse rien. L'inverse, un mode de conception qui fuit en
   production sans que personne s'en aperçoive, serait le mauvais échec.

   `VERCEL_ENV` est déjà la source de vérité de l'environnement dans ce
   repo (`robots.ts`, en-têtes `noindex` de `next.config.ts`). Chaque
   environnement Vercel ayant son propre build, la valeur est figée
   correctement au moment de la construction, jamais devinée à
   l'exécution. `next.config.ts` la recopie sous `NEXT_PUBLIC_VERCEL_ENV`
   pour qu'elle soit aussi lisible côté navigateur : on ne dépend donc
   pas d'un réglage de projet Vercel qui pourrait être décoché.
   ════════════════════════════════════════════════════════════════════ */

/** Vrai seulement là où on a la preuve de ne pas être en production. */
export function revueAutorisee(): boolean {
  // Développement local (`npm run dev`).
  if (process.env.NODE_ENV !== "production") return true;
  // Préversion Vercel (branche de test, dont `simplification-code`).
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV;
  return env === "preview" || env === "development";
}

/** Le paramètre d'URL, lu tel quel. */
export function revueDemandee(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("review") === "1";
}

/** La question à poser depuis l'écran : demandé ET autorisé. */
export function modeRevue(): boolean {
  return revueDemandee() && revueAutorisee();
}

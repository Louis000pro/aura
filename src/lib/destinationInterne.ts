/* ════════════════════════════════════════════════════════════════════
   Où renvoyer quelqu'un après une étape qui l'a interrompu.

   Un `?next=` vient de l'extérieur : c'est une valeur qu'un tiers peut
   fabriquer. On n'accepte donc qu'un chemin INTERNE, jamais une URL
   absolue, sinon n'importe qui peut écrire un lien de connexion (ou de
   choix de Guide) qui renvoie ailleurs après coup.

   `//exemple.com` compte comme une URL absolue : le navigateur la lit
   comme « même protocole, autre domaine ». C'est le cas que le simple
   test « commence par / » laisse passer, et c'est pour ça qu'il est
   écrit ici une fois pour toutes plutôt que recopié à chaque appelant.

   ⚠️ ⚠️ MAIS ÉCARTER `//` NE SUFFISAIT PAS, ET C'ÉTAIT UNE REDIRECTION
   OUVERTE — mesurée dans Chromium, pas supposée. Le navigateur NORMALISE
   le chemin avant de le résoudre : il remplace `\` par `/` et supprime
   les tabulations et les retours à la ligne. Quatre écritures passaient
   donc le test et sortaient du site :

     /\evil.com      /\/evil.com      /<TAB>/evil.com      /<LF>/evil.com

   les quatre résolues en `http://evil.com/`. Un lien de connexion
   parfaitement crédible (`vaiiya.fr/auth?next=/%5Cevil.com`) renvoyait
   donc ailleurs juste après que la personne ait tapé son mot de passe.

   ⭐ ON NE DEVINE PLUS, ON RÉSOUT. La question « ce chemin reste-t-il chez
   nous ? » est celle que le navigateur tranche, donc on la lui pose :
   `new URL` contre une origine factice, et on n'accepte que ce qui ne
   bouge pas d'origine. La liste des caractères à surveiller n'a alors
   plus à être devinée, ce qui est le seul moyen de tenir dans le temps.

   ⚠️ ET LE RÉSULTAT SE REVÉRIFIE, parce que la normalisation peut FABRIQUER
   le défaut qu'on vient d'écarter : `/..//evil.com` reste bien chez nous à
   la résolution, mais son chemin normalisé est `//evil.com`, qui repartirait
   ailleurs si on le rendait tel quel à `router.push`. D'où le second
   contrôle, sur la sortie.
   ════════════════════════════════════════════════════════════════════ */

/* Origine factice et stable : la fonction reste PURE, donc vérifiable hors
   navigateur, et `.invalid` est un domaine réservé qui ne résout jamais. */
const BASE = "https://vaiiya.invalid";

/** Rend le chemin s'il est interne, sinon `defaut`. */
export function destinationInterne(brut: string | null | undefined, defaut = "/"): string {
  // On garde l'exigence d'un chemin absolu : `communaute` sans barre oblique
  // n'a jamais été accepté, et ce n'est pas le moment de l'ouvrir.
  if (!brut || !brut.startsWith("/")) return defaut;
  let chemin: string;
  try {
    const u = new URL(brut, BASE);
    if (u.origin !== BASE) return defaut;
    chemin = u.pathname + u.search + u.hash;
  } catch {
    return defaut;
  }
  if (!chemin.startsWith("/") || chemin.startsWith("//")) return defaut;
  return chemin;
}

/** Le `?next=` de l'URL courante, déjà validé.
 *  Lu sur `window` plutôt qu'avec `useSearchParams` : pas de frontière
 *  `<Suspense>` à poser autour de chaque appelant. */
export function destinationDepuisUrl(defaut = "/"): string {
  if (typeof window === "undefined") return defaut;
  return destinationInterne(new URLSearchParams(window.location.search).get("next"), defaut);
}

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
   ════════════════════════════════════════════════════════════════════ */

/** Rend le chemin s'il est interne, sinon `defaut`. */
export function destinationInterne(brut: string | null | undefined, defaut = "/"): string {
  if (!brut) return defaut;
  return brut.startsWith("/") && !brut.startsWith("//") ? brut : defaut;
}

/** Le `?next=` de l'URL courante, déjà validé.
 *  Lu sur `window` plutôt qu'avec `useSearchParams` : pas de frontière
 *  `<Suspense>` à poser autour de chaque appelant. */
export function destinationDepuisUrl(defaut = "/"): string {
  if (typeof window === "undefined") return defaut;
  return destinationInterne(new URLSearchParams(window.location.search).get("next"), defaut);
}

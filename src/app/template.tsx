/* L'enveloppe de chaque page. Elle portait un fondu d'entrée (de 55 % à
   100 % d'opacité en 200 ms, depuis mai 2026) pour adoucir le passage d'un
   onglet à l'autre et cacher un flash blanc sur l'ancien fond.

   ⚠️ LE FONDU EST RETIRÉ (Louis, 2026-10-27), PAS L'ENVELOPPE. Le fond vit
   désormais derrière tout le site (`body::before`), donc il n'y a plus de
   flash à cacher, et une page déjà visitée revient avec son contenu tout de
   suite (`lib/memoireSession.ts`) : le fondu ne faisait que retarder ce qui
   était déjà là, à chaque changement de page. Voir `docs/fluidite.md`.

   ⚠️ `will-change: opacity` RESTE, ET CE N'EST PAS UN OUBLI. Il fait de
   chaque page un contexte d'empilement depuis mai : les fenêtres posées
   dans une page (sans portail) s'empilent à l'intérieur, sous la barre du
   bas. Le retirer changerait cet empilement sur tous les écrans ; il faudrait
   les revoir un par un avant. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div style={{ willChange: "opacity" }}>{children}</div>;
}

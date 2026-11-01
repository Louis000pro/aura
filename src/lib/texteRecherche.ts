/* ════════════════════════════════════════════════════════════════════
   LIRE CE QU'ON TAPE : la même règle pour les deux loupes, celle des
   recettes (lib/rechercheRecettes) et celle des séances (lib/trouverSeance).

   Les minuscules, les accents, « œ », les pluriels, une faute de frappe et
   un mot écrit comme il se prononce. Sortie de rechercheRecettes le
   2026-11-01 : deux loupes qui liraient le texte chacune à sa façon
   finiraient par ne pas comprendre le même mot.
   ════════════════════════════════════════════════════════════════════ */

/* ── 1 · Les mots ──────────────────────────────────────────────────────── */

/** Ce qui sépare deux mots : tout sauf une lettre (accents et « œ » compris) ou un chiffre. */
const SEPARE = /[^0-9a-z\u00e0-\u00f6\u00f8-\u00ff\u0153]+/;

/** Un texte écrit comme la banque se lit : minuscules, sans accent, « œ »
 *  défait en « oe », et tout ce qui n’est ni lettre ni chiffre devient une espace. */
export function normaliser(texte: string): string {
  return texte.toLowerCase()
    .replace(/œ/g, "oe").replace(/æ/g, "ae")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Le singulier, pour comparer : « oeufs » → « oeuf », « gâteaux » →
 *  « gateau ». Il est faux pour « frais » (→ « frai ») et ça ne gêne pas :
 *  la saisie et la banque passent par la même règle. */
export function singulier(mot: string): string {
  return mot.length > 3 && /[sx]$/.test(mot) ? mot.slice(0, -1) : mot;
}

export type Mot = { ecrit: string; net: string; cle: string };

/** Les mots d’un texte : tels qu’écrits (pour les montrer), normalisés, et en clé (pour comparer). */
export function decouper(texte: string): Mot[] {
  return texte.toLowerCase().split(SEPARE).filter(Boolean).flatMap((ecrit) =>
    normaliser(ecrit).split(" ").filter(Boolean).flatMap((net) => {
      // « 20min », « 1h30 », « 400kcal » : le nombre et l’unité se séparent.
      const colle = /^(\d+)([a-z]+)(\d*)$/.exec(net);
      const morceaux = colle ? [colle[1], colle[2], colle[3]].filter(Boolean) : [net];
      return morceaux.map((m) => ({ ecrit: colle ? m : ecrit, net: m, cle: singulier(m) }));
    }));
}

/** La clé d’une expression : ses mots au singulier, séparés d’une espace. */
export const cleDe = (texte: string) => decouper(texte).map((m) => m.cle).join(" ");

/** La distance entre deux mots : lettres changées, ajoutées, retirées ou
 *  inversées (« vegetarein » est à une faute de « vegetarien »). */
export function distance(a: string, b: string): number {
  let deux: number[] = [];
  let un = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const ligne = [i];
    for (let j = 1; j <= b.length; j++) {
      let d = Math.min(un[j] + 1, ligne[j - 1] + 1, un[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, deux[j - 2] + 1);
      ligne.push(d);
    }
    deux = un;
    un = ligne;
  }
  return un[b.length];
}

/** Les fautes qu’un mot supporte : aucune sous cinq lettres (« riz » et
 *  « thon » ne se devinent pas), une jusqu’à sept, deux au-delà. */
export const tolerance = (mot: string) => (mot.length < 5 ? 0 : mot.length < 8 ? 1 : 2);

/** Deux mots qui ne diffèrent que d’une faute de frappe. */
export const procheDe = (tape: string, juste: string) =>
  tape === juste || (Math.min(tape.length, juste.length) >= 5 && distance(tape, juste) <= tolerance(juste));

/** Un mot tel qu’il se prononce, pour « kinoa » (quinoa), « humus »
 *  (houmous) ou « tajine » écrit « tagine ». Il ne sert qu’en dernier
 *  recours, quand rien d’écrit ne ressemble au mot tapé. */
export function phonetique(mot: string): string {
  let s = mot
    .replace(/sch|sh|ch/g, "§")
    .replace(/ph/g, "f")
    .replace(/gu(?=[eiy])/g, "G").replace(/g(?=[eiy])/g, "j").replace(/G/g, "g")
    .replace(/qu|q|ck/g, "k")
    .replace(/c(?=[eiy])/g, "s").replace(/c/g, "k")
    .replace(/gn/g, "ni")
    .replace(/eau|au/g, "o")
    .replace(/ai|ei/g, "e")
    .replace(/ou/g, "u")
    .replace(/[ae]m(?=[bp])/g, "an").replace(/en(?![aeiouy])/g, "an")
    .replace(/z/g, "s").replace(/y/g, "i").replace(/w/g, "v").replace(/h/g, "")
    .replace(/(.)\1+/g, "$1");
  for (let i = 0; i < 2 && s.length > 3 && /[estdxzp]$/.test(s); i++) s = s.slice(0, -1);
  return s;
}

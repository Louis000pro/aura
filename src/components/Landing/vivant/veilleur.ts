/* ═══ CE QUI N'EST PAS À L'ÉCRAN NE TRAVAILLE PAS ═══
   Un seul observateur pour toute la vitrine. Chaque élément `data-vivant`
   reçoit `data-repos` quand il sort de l'écran : ses animations CSS se figent
   là où elles en sont, ses boucles attendent, son canevas s'arrête. Il repart
   au même endroit quand il revient.

   ⚠️ L'attribut n'est posé qu'à la réponse de l'observateur, jamais d'avance :
   le poser en s'armant figerait une image les entrées du héros, qui jouent
   déjà au moment où ce code arrive. */

type Suivi = { vu: boolean; ecoute: ((vu: boolean) => void)[] };

/** Une attente qui ne compte que le temps passé à l'écran. */
export type Attente = (ms: number) => Promise<void>;

/** Les classes du module CSS, passées par la page : ce code se charge à part. */
export type Classes = Readonly<Record<string, string>>;

export function creerVeilleur(signal: AbortSignal) {
  const suivis = new Map<Element, Suivi>();
  const io = new IntersectionObserver((entrees) => {
    for (const e of entrees) {
      const suivi = suivis.get(e.target);
      if (!suivi) continue;
      suivi.vu = e.isIntersecting;
      e.target.toggleAttribute("data-repos", !suivi.vu);
      for (const f of suivi.ecoute) f(suivi.vu);
    }
  }, { rootMargin: "6% 0px" });
  signal.addEventListener("abort", () => io.disconnect(), { once: true });

  function surveiller(el: Element, ecoute?: (vu: boolean) => void): Suivi {
    let suivi = suivis.get(el);
    if (!suivi) {
      suivi = { vu: false, ecoute: [] };
      suivis.set(el, suivi);
      io.observe(el);
    }
    if (ecoute) suivi.ecoute.push(ecoute);
    return suivi;
  }

  function horloge(el: Element): Attente {
    const suivi = surveiller(el);
    return (ms) => new Promise((fini) => {
      let reste = ms;
      let avant = performance.now();
      (function tic() {
        // La vitrine a quitté l'écran pour de bon : la promesse ne se résout
        // jamais, et la boucle qui l'attendait s'arrête là.
        if (signal.aborted) return;
        const n = performance.now();
        if (suivi.vu) reste -= n - avant;
        avant = n;
        if (reste <= 0) fini();
        else setTimeout(tic, suivi.vu ? Math.min(reste, 40) : 200);
      })();
    });
  }

  return { surveiller, horloge };
}

export type Veilleur = ReturnType<typeof creerVeilleur>;

export function trouve<T extends Element = HTMLElement>(dans: ParentNode, selecteur: string): T {
  const el = dans.querySelector<T>(selecteur);
  if (!el) throw new Error(`Vitrine : ${selecteur} introuvable`);
  return el;
}

export const borne = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/* ═══ UN SEUL ÉCOUTEUR DE DÉFILEMENT ═══
   Tout ce qui suit le doigt passe par ici : une seule lecture par image, quel que
   soit le nombre de scènes. */
export type Suivre = (f: () => void) => void;

export function creerDefile(signal: AbortSignal): Suivre {
  const abonnes: (() => void)[] = [];
  let attente = false;
  const tout = () => {
    attente = false;
    for (const f of abonnes) f();
  };
  const demande = () => {
    if (attente) return;
    attente = true;
    requestAnimationFrame(tout);
  };
  window.addEventListener("scroll", demande, { passive: true, signal });
  window.addEventListener("resize", demande, { signal });
  return (f) => {
    abonnes.push(f);
    f();
  };
}

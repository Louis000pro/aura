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
        /* Une longue attente ne se réveille pas vingt-cinq fois par seconde pour rien. */
        else setTimeout(tic, suivi.vu ? Math.min(reste, 250) : 250);
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

/* ═══ UN SEUL ÉCOUTEUR DE DÉFILEMENT, ET SEULEMENT QUAND IL SERT ═══
   Tout ce qui suit le doigt passe par ici : une seule lecture par image, quel que
   soit le nombre de scènes. Et l'écouteur n'existe que pendant qu'une scène liée au
   défilement est à l'écran : ailleurs, le fil principal n'a rien à faire pendant que
   le doigt descend.

   ⚠️ AUCUNE MESURE PENDANT LE DÉFILEMENT. Lire la place d'un élément à chaque image
   oblige le navigateur à recalculer la page, et c'est ce qui fait saccader un
   téléphone. Les positions se mesurent une fois, puis quand la page change de
   taille, et chaque scène ne reçoit plus que le défilement. */
export type Defile = (y: number) => void;
export type Suivre = (zone: Element, f: Defile, mesurer?: () => void) => void;

export function creerDefile(racine: Element, veilleur: Veilleur, signal: AbortSignal): Suivre {
  const actifs = new Set<Defile>();
  const mesures: (() => void)[] = [];
  let attente = false;
  let branche = false;
  let y = 0;
  /* ⚠️ `scrollY` se lit dans l'évènement, jamais dans la boucle d'image : là, il
     forcerait un recalcul de la page juste avant que les scènes n'écrivent. */
  const tout = () => {
    attente = false;
    for (const f of actifs) f(y);
  };
  const demande = () => {
    y = window.scrollY;
    if (attente) return;
    attente = true;
    requestAnimationFrame(tout);
  };
  const remesurer = () => {
    for (const m of mesures) m();
    demande();
  };
  const brancher = (oui: boolean) => {
    if (oui === branche) return;
    branche = oui;
    if (oui) window.addEventListener("scroll", demande, { passive: true, signal });
    else window.removeEventListener("scroll", demande);
  };
  window.addEventListener("resize", remesurer, { signal });
  const ro = new ResizeObserver(remesurer);
  ro.observe(racine);
  signal.addEventListener("abort", () => ro.disconnect(), { once: true });
  return (zone, f, mesurer) => {
    if (mesurer) {
      mesures.push(mesurer);
      mesurer();
    }
    f(window.scrollY);
    veilleur.surveiller(zone, (vu) => {
      if (vu) {
        actifs.add(f);
        f(window.scrollY);
      } else {
        actifs.delete(f);
      }
      brancher(actifs.size > 0);
    });
  };
}

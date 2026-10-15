/**
 * sons.ts — Les petits sons de Vaiiya (Louis, 2026-10-15).
 *
 * ⚠️ PEU DE SONS, ET JAMAIS SUR UN BOUTON. Un son par moment qu'on ne
 * regarde pas : le 3-2-1 avant un effort, la fin d'un effort, la fin d'un
 * repos (le téléphone est posé), la séance terminée, et la montée de rang.
 * Un clic sonore sur chaque bouton deviendrait du bruit en deux jours.
 *
 * ⚠️ AUCUN FICHIER AUDIO. Les sons sont synthétisés par Web Audio : rien à
 * télécharger, rien à mettre en cache, et ils ne coûtent aucun octet de
 * bande passante (l'egress a déjà explosé une fois).
 *
 * ⚠️ iOS NE JOUE RIEN TANT QU'UN GESTE N'A PAS RÉVEILLÉ L'AUDIO. Le premier
 * toucher sur la page réveille le contexte (`amorcer`), sinon le premier
 * 3-2-1, qui part d'un minuteur et pas d'un geste, serait muet.
 *
 * Coupable dans Paramètres → Sons. La préférence vit sur l'appareil
 * (comme le thème) : c'est un réglage de l'appareil, pas du compte.
 */

export type Son = "tic" | "go" | "finEffort" | "finRepos" | "seanceFinie" | "rang";

const CLE = "vaiiya_sons";
export const EVT_SONS = "vaiiya:sons";

export function sonsActifs(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(CLE) !== "off"; } catch { return true; }
}

export function reglerSons(actifs: boolean): void {
  try { localStorage.setItem(CLE, actifs ? "on" : "off"); } catch { /* stockage bloqué */ }
  window.dispatchEvent(new Event(EVT_SONS));
  if (actifs) jouerSon("go");
}

let ctx: AudioContext | null = null;

function contexte(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    try { ctx = new C(); } catch { return null; }
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

/* Le premier geste réveille l'audio, une seule fois. */
if (typeof window !== "undefined") {
  const amorcer = () => {
    contexte();
    window.removeEventListener("pointerdown", amorcer);
    window.removeEventListener("keydown", amorcer);
  };
  window.addEventListener("pointerdown", amorcer, { passive: true });
  window.addEventListener("keydown", amorcer);
}

/** Une note douce : attaque courte, extinction exponentielle. */
function note(c: AudioContext, freq: number, debut: number, duree: number, volume = 0.16, type: OscillatorType = "sine") {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, debut);
  gain.gain.setValueAtTime(0.0001, debut);
  gain.gain.exponentialRampToValueAtTime(volume, debut + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
  osc.connect(gain).connect(c.destination);
  osc.start(debut);
  osc.stop(debut + duree + 0.02);
}

/* Les notes : une gamme majeure de do, rien de strident. */
const DO5 = 523.25, MI5 = 659.25, SOL5 = 783.99, DO6 = 1046.5, MI6 = 1318.5, SOL4 = 392.0;

export function jouerSon(son: Son): void {
  if (!sonsActifs()) return;
  const c = contexte();
  if (!c) return;
  const t = c.currentTime + 0.01;
  switch (son) {
    case "tic":         note(c, SOL5, t, 0.12, 0.12); break;
    case "go":          note(c, DO6, t, 0.22, 0.16); break;
    case "finEffort":   note(c, SOL5, t, 0.16); note(c, DO5, t + 0.12, 0.28); break;
    case "finRepos":    note(c, DO5, t, 0.14); note(c, SOL5, t + 0.11, 0.26); break;
    case "seanceFinie": [DO5, MI5, SOL5, DO6].forEach((f, i) => note(c, f, t + i * 0.11, 0.5, 0.14)); break;
    case "rang":
      note(c, SOL4, t, 0.4, 0.1, "triangle");
      [DO5, MI5, SOL5, DO6, MI6].forEach((f, i) => note(c, f, t + 0.08 + i * 0.09, 0.7, 0.12));
      break;
  }
}

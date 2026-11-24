/**
 * sonsBooster.ts : les bruitages du booster (Louis, 2026-11-24 : « un son premium […] plus un
 * bruitage », « pas des sons à chaque action », ni jeu ni cinématique).
 *
 * Trois moments, et aucun autre : le film qui se déchire sous le doigt, les cartes qui glissent
 * hors du sachet, la dernière carte qui se retourne. Toucher une carte, la ranger, le total d'EXP
 * et la page de fin restent silencieux. Aucune mélodie, aucun carillon : de la matière (film,
 * papier, air) et un souffle grave. Le même son pour toutes les raretés.
 *
 * Synthétisé comme `sons.ts`, sur le même contexte, coupé par l'interrupteur « Sons ».
 */
import { contexteAudio, sonsActifs } from "@/lib/sons";

type Atelier = { ctx: BaseAudioContext; bus: GainNode; piece: GainNode; film: AudioBuffer; air: AudioBuffer };
let atelier: Atelier | null = null;

export function monterAtelier(ctx: BaseAudioContext): Atelier {
  const n = Math.floor(ctx.sampleRate * 2);
  // L'air : un bruit adouci. Le film : le même, troué de très petits craquements irréguliers.
  const air = ctx.createBuffer(1, n, ctx.sampleRate), film = ctx.createBuffer(1, n, ctx.sampleRate);
  const a = air.getChannelData(0), f = film.getChannelData(0);
  const chute = Math.exp(-1 / (ctx.sampleRate * .0011));
  let doux = 0, craque = 0;
  for (let i = 0; i < n; i++) {
    const b = Math.random() * 2 - 1;
    doux += (b - doux) * .35;
    a[i] = doux;
    if (Math.random() < 620 / ctx.sampleRate) craque += Math.pow(Math.random(), 3);
    craque *= chute;
    f[i] = b * (.1 + Math.min(1, craque) * .9);
  }
  const bus = ctx.createGain();
  bus.gain.value = 1.2;
  const limite = ctx.createDynamicsCompressor();
  limite.threshold.value = -16; limite.ratio.value = 4; limite.attack.value = .004; limite.release.value = .18;
  bus.connect(limite); limite.connect(ctx.destination);
  // Une petite pièce feutrée : sans elle, le bruit sort sec et plat du haut-parleur.
  const m = Math.floor(ctx.sampleRate * .7), echo = ctx.createBuffer(2, m, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = echo.getChannelData(c);
    let v = 0;
    for (let i = 0; i < m; i++) { v += (Math.random() * 2 - 1 - v) * .3; d[i] = v * Math.pow(1 - i / m, 3.4); }
  }
  const salle = ctx.createConvolver(), piece = ctx.createGain(), retour = ctx.createGain();
  salle.buffer = echo; retour.gain.value = .4;
  piece.connect(salle); salle.connect(retour); retour.connect(bus);
  return { ctx, bus, piece, film, air };
}

function pret(): Atelier | null {
  if (!sonsActifs()) return null;
  const ctx = contexteAudio();
  if (!ctx) return null;
  try { return atelier?.ctx === ctx ? atelier : (atelier = monterAtelier(ctx)); } catch { return null; }
}

function vers(at: Atelier, noeud: AudioNode, salle: number) {
  noeud.connect(at.bus);
  const envoi = at.ctx.createGain();
  envoi.gain.value = salle;
  noeud.connect(envoi); envoi.connect(at.piece);
}

/** Un souffle de matière : un bruit filtré qui glisse d'une hauteur à une autre. */
function souffle(at: Atelier, quoi: "film" | "air", t: number, o: { duree: number; montee: number; de: number; a: number; q: number; vol: number; salle: number }) {
  const { ctx } = at;
  const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = at[quoi]; s.loop = true;
  bp.type = "bandpass"; bp.Q.value = o.q;
  bp.frequency.setValueAtTime(o.de, t); bp.frequency.exponentialRampToValueAtTime(o.a, t + o.duree);
  lp.type = "lowpass"; lp.frequency.value = 7000;
  g.gain.setValueAtTime(.0001, t);
  g.gain.exponentialRampToValueAtTime(o.vol, t + o.montee);
  g.gain.exponentialRampToValueAtTime(.0001, t + o.duree);
  s.connect(bp); bp.connect(lp); lp.connect(g); vers(at, g, o.salle);
  s.start(t, Math.random() * 1.5); s.stop(t + o.duree + .05);
}

/** Un corps grave et rond, sans hauteur qui s'entende comme une note. */
function corps(at: Atelier, t: number, f: number, duree: number, vol: number, montee = .012) {
  const o = at.ctx.createOscillator(), g = at.ctx.createGain();
  o.type = "triangle"; // ses harmoniques passent dans un haut-parleur de téléphone
  o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * .72, t + duree);
  g.gain.setValueAtTime(.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + montee);
  g.gain.exponentialRampToValueAtTime(.0001, t + duree);
  o.connect(g); vers(at, g, .15);
  o.start(t); o.stop(t + duree + .05);
}

export function jouerFinDechirure(at: Atelier, t: number, entiere: boolean) {
  if (entiere) souffle(at, "film", t, { duree: .36, montee: .2, de: 1900, a: 3600, q: .6, vol: .8, salle: .25 });
  const fin = entiere ? t + .24 : t;
  souffle(at, "film", fin, { duree: .17, montee: .008, de: 3800, a: 2300, q: .6, vol: .7, salle: .35 });
  souffle(at, "air", fin, { duree: .5, montee: .05, de: 900, a: 420, q: .5, vol: .4, salle: .45 });
  corps(at, fin, 118, .2, .26);
}

export function jouerSortie(at: Atelier, t: number) {
  // Les trois cartes partent à 50 ms d'écart, puis se posent.
  for (let k = 0; k < 3; k++) {
    souffle(at, "air", t + .11 + k * .05, { duree: .4 - k * .03, montee: .13, de: 1000 + k * 160, a: 2500 + k * 260, q: .8, vol: .34, salle: .3 });
  }
  corps(at, t + .78, 104, .2, .16);
}

export function jouerDerniereCarte(at: Atelier, t: number, duree: number) {
  souffle(at, "air", t, { duree: duree * .95, montee: duree * .4, de: 520, a: 1700, q: .7, vol: .42, salle: .45 });
  const pose = t + duree * .62;
  corps(at, pose, 92, .5, .3, .03);
  souffle(at, "air", pose, { duree: 1.1, montee: .12, de: 1500, a: 480, q: .5, vol: .2, salle: .7 });
}

/** La déchirure suit le doigt : elle s'entend quand il avance, et se tait quand il s'arrête. */
export function creerSonDechirure() {
  let voix: { at: Atelier; s: AudioBufferSourceNode; bp: BiquadFilterNode; g: GainNode } | null = null;
  let dernier = 0, entendue = false;
  const taire = () => {
    if (!voix) return;
    const { at, s, g } = voix, t = at.ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setTargetAtTime(0, t, .025);
    s.stop(t + .25);
    voix = null; entendue = false;
  };
  return {
    taire,
    /** pas : ce que le doigt vient de parcourir, en % de la largeur ; part : où il en est (0 à 1). */
    avancer(pas: number, part: number) {
      if (!voix) {
        const at = pret();
        if (!at) return;
        const s = at.ctx.createBufferSource(), bp = at.ctx.createBiquadFilter(), lp = at.ctx.createBiquadFilter(), g = at.ctx.createGain();
        s.buffer = at.film; s.loop = true;
        bp.type = "bandpass"; bp.Q.value = .55;
        lp.type = "lowpass"; lp.frequency.value = 6500;
        g.gain.value = 0;
        s.connect(bp); bp.connect(lp); lp.connect(g); vers(at, g, .22);
        s.start(0, Math.random() * 1.5);
        voix = { at, s, bp, g };
        dernier = at.ctx.currentTime - .03;
      }
      const { at, bp, g } = voix, t = at.ctx.currentTime;
      const vitesse = pas / Math.max(.008, t - dernier); // % par seconde
      dernier = t; entendue = true;
      bp.frequency.setTargetAtTime(1900 + part * 1500 + Math.min(600, vitesse * 2), t, .03);
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(Math.min(.8, .22 + vitesse / 450), t, .014);
      g.gain.setTargetAtTime(0, t + .06, .035);
    },
    /** Le film cède. Ouvert au clavier, rien n'a encore été entendu : on joue la déchirure entière. */
    finir() {
      const deja = entendue, at = pret();
      taire();
      if (at) jouerFinDechirure(at, at.ctx.currentTime + .005, !deja);
    },
  };
}

export function sonSortieCartes() {
  const at = pret();
  if (at) jouerSortie(at, at.ctx.currentTime);
}

export function sonDerniereCarte(dureeMs: number) {
  const at = pret();
  if (at) jouerDerniereCarte(at, at.ctx.currentTime, dureeMs / 1000);
}

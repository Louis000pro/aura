/**
 * musiqueRang.ts — La musique de chaque rang (Louis, 2026-10-24, maquette
 * « Le passage de rang », version 2).
 *
 * Plus le rang est haut, plus elle est riche : deux notes et un accord pour
 * le Bronze, trois pour l'Argent, une nappe chaude pour l'Or, un accord
 * suspendu pour le Platine, des cloches de verre pour le Diamant, un chœur
 * pour l'Éternel. Elle joue au passage de rang, après une montée et un
 * impact, puis EN PLUS COURT à chaque fin de séance : on entend son rang
 * chaque fois qu'on termine.
 *
 * ⚠️ AUCUN FICHIER, comme `sons.ts` : tout est synthétisé par Web Audio, sur
 * le même contexte (un seul réveil sur iOS), et coupé par l'interrupteur
 * « Sons » des Paramètres (`sonsActifs`).
 */

import { contexteAudio, sonsActifs } from "@/lib/sons";

type Musique = {
  /** Les notes du motif, en MIDI. */
  motif: number[];
  accord: number[];
  nappe: boolean;
  choeur?: boolean;
  cascade: number[];
  force: number;
  /** Des cloches de verre, plus brillantes. */
  verre?: boolean;
};

const MUSIQUE: Record<string, Musique> = {
  bronze: { motif: [67, 72], accord: [48, 60, 64, 67], nappe: false, cascade: [], force: 0.9 },
  argent: { motif: [67, 72, 76], accord: [48, 60, 64, 67, 72, 76], nappe: false, cascade: [84, 88, 91], force: 1 },
  or: { motif: [67, 72, 76, 79], accord: [48, 55, 60, 64, 67, 72, 76], nappe: true, cascade: [84, 88, 91, 96], force: 1.1 },
  platine: { motif: [71, 74, 76, 79], accord: [48, 55, 59, 64, 67, 71, 76], nappe: true, cascade: [83, 86, 88, 91, 95], force: 1.15 },
  diamant: { motif: [74, 76, 79, 83, 86], accord: [48, 55, 62, 64, 71, 74, 79], nappe: true, cascade: [86, 88, 91, 95, 98, 100], force: 1.2, verre: true },
  eternel: { motif: [72, 74, 76, 79, 81, 84], accord: [41, 48, 53, 57, 64, 67, 72, 76, 81], nappe: true, choeur: true, cascade: [84, 86, 88, 91, 93, 96, 98, 100], force: 1.35 },
};

/** Les temps de la scène, en millisecondes depuis son départ. */
export type TempsScene = {
  reduit: boolean;
  charge: number;
  eveil: number;
  /** La durée de chaque bascule entre l'ancienne gemme et la nouvelle. */
  bascules: number[];
  eclat: number;
  nom: number;
  cadeaux: number[];
};

/* ── La chaîne de sortie : un compresseur et une réverbération, une fois. ── */
type Chaine = { ctx: AudioContext; sortie: GainNode; verb: ConvolverNode; bruit: AudioBuffer };
let chaine: Chaine | null = null;

function preparer(): Chaine | null {
  const ctx = contexteAudio();
  if (!ctx) return null;
  if (chaine && chaine.ctx === ctx) return chaine;
  try {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 14; comp.ratio.value = 4.5; comp.attack.value = 0.003; comp.release.value = 0.25;
    const sortie = ctx.createGain();
    sortie.gain.value = 0.7;
    sortie.connect(comp); comp.connect(ctx.destination);
    const verb = ctx.createConvolver();
    verb.buffer = impulsion(ctx, 2.8, 2.6);
    const vg = ctx.createGain();
    vg.gain.value = 0.5;
    verb.connect(vg); vg.connect(sortie);
    const bruit = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2), ctx.sampleRate);
    const d = bruit.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    chaine = { ctx, sortie, verb, bruit };
    return chaine;
  } catch {
    return null;
  }
}

function impulsion(ctx: AudioContext, duree: number, k: number): AudioBuffer {
  const n = Math.floor(ctx.sampleRate * duree);
  const b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, k);
  }
  return b;
}

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/* ── Les instruments. Recopiés de la maquette jouable, qui les a fait valider. ── */
function instruments(c: Chaine) {
  const { ctx, verb, bruit } = c;
  const enveloppe = (t: number, a: number, v: number, fin: number) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, fin);
    return g;
  };
  const osc = (type: OscillatorType, f: number, t: number, fin: number) => {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(fin + 0.05);
    return o;
  };
  const souffle = (t: number, fin: number) => {
    const s = ctx.createBufferSource();
    s.buffer = bruit; s.loop = true; s.start(t); s.stop(fin + 0.05);
    return s;
  };
  const envoi = (noeud: AudioNode, q: number) => {
    if (q <= 0) return;
    const s = ctx.createGain();
    s.gain.value = q; noeud.connect(s); s.connect(verb);
  };
  const cloche = (bus: AudioNode, f: number, t: number, duree: number, vol: number, rev: number, eclat: number) => {
    const n = ctx.createGain();
    n.connect(bus); envoi(n, rev);
    ([[1, 1], [2, 0.42 * eclat], [3.01, 0.2 * eclat], [4.18, 0.09 * eclat]] as [number, number][]).forEach(([r, a], i) => {
      const f2 = f * r;
      if (f2 > 15000) return;
      const fin = t + duree / (1 + i * 0.7);
      const o = osc("sine", f2, t, fin), g = enveloppe(t, 0.004, vol * a, fin);
      o.connect(g); g.connect(n);
    });
  };
  const voix = (bus: AudioNode, f: number, t: number, duree: number, vol: number) => {
    const n = ctx.createGain();
    n.connect(bus); envoi(n, 0.42);
    ([[1, 1, 0], [2, 0.22, 0], [1, 0.5, 6]] as [number, number, number][]).forEach(([r, a, det]) => {
      const o = osc("sine", f * r, t, t + duree);
      o.detune.value = det;
      const g = enveloppe(t, 0.014, vol * a, t + duree);
      o.connect(g); g.connect(n);
    });
  };
  const nappe = (bus: AudioNode, freqs: number[], t: number, duree: number, vol: number, choeur: boolean) => {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = choeur ? 2200 : 1500; lp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.45);
    g.gain.setValueAtTime(vol, t + duree * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    lp.connect(g); g.connect(bus); envoi(g, 0.5);
    freqs.forEach((f) => [-7, 7].forEach((det) => { const o = osc("sawtooth", f, t, t + duree); o.detune.value = det; o.connect(lp); }));
    if (choeur) {
      const f1 = ctx.createBiquadFilter(); f1.type = "bandpass"; f1.frequency.value = 760; f1.Q.value = 5;
      const f2 = ctx.createBiquadFilter(); f2.type = "bandpass"; f2.frequency.value = 1150; f2.Q.value = 6;
      const gc = ctx.createGain();
      gc.gain.setValueAtTime(0.0001, t);
      gc.gain.exponentialRampToValueAtTime(vol * 2.4, t + 0.7);
      gc.gain.exponentialRampToValueAtTime(0.0001, t + duree + 0.4);
      f1.connect(gc); f2.connect(gc); gc.connect(bus); envoi(gc, 0.7);
      const lfo = osc("sine", 5.2, t, t + duree + 0.4), lg = ctx.createGain();
      lg.gain.value = 4; lfo.connect(lg);
      freqs.forEach((f) => { const o = osc("sawtooth", f, t, t + duree + 0.4); lg.connect(o.frequency); o.connect(f1); o.connect(f2); });
    }
  };
  const boom = (bus: AudioNode, t: number, force: number) => {
    const o = osc("sine", 150, t, t + 1.1);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.6);
    const g = enveloppe(t, 0.01, 0.75 * force, t + 1.1);
    o.connect(g); g.connect(bus);
  };
  const montee = (bus: AudioNode, t: number, d: number, force: number) => {
    const s = souffle(t, t + d), bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(320, t); bp.frequency.exponentialRampToValueAtTime(7200, t + d);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2 * force, t + d - 0.02);
    g.gain.linearRampToValueAtTime(0.0001, t + d + 0.03);
    s.connect(bp); bp.connect(g); g.connect(bus);
    [-9, 9].forEach((det) => {
      const o = osc("sawtooth", 98, t, t + d);
      o.detune.value = det; o.frequency.exponentialRampToValueAtTime(392, t + d);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.Q.value = 6;
      lp.frequency.setValueAtTime(240, t); lp.frequency.exponentialRampToValueAtTime(4200, t + d);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.05 * force, t + d - 0.03);
      og.gain.linearRampToValueAtTime(0.0001, t + d + 0.02);
      o.connect(lp); lp.connect(og); og.connect(bus);
    });
  };
  const tics = (bus: AudioNode, t: number, d: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const p = i / (n - 1), ti = t + d * (1 - Math.pow(1 - p, 1.9)), f = 1500 + 1600 * p;
      const o = osc("sine", f, ti, ti + 0.04), g = enveloppe(ti, 0.002, 0.05, ti + 0.035);
      o.connect(g); g.connect(bus);
    }
  };
  const impact = (bus: AudioNode, t: number, force: number) => {
    boom(bus, t, force);
    const o2 = osc("triangle", 92, t, t + 0.45);
    o2.frequency.exponentialRampToValueAtTime(44, t + 0.35);
    const g2 = enveloppe(t, 0.006, 0.3 * force, t + 0.45);
    o2.connect(g2); g2.connect(bus);
    const s = souffle(t, t + 0.6), lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(380, t + 0.5);
    const gs = enveloppe(t, 0.003, 0.42 * force, t + 0.55);
    s.connect(lp); lp.connect(gs); gs.connect(bus); envoi(gs, 0.25);
    const s2 = souffle(t, t + 0.12), hp = ctx.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.value = 3800;
    const g3 = enveloppe(t, 0.001, 0.22 * force, t + 0.09);
    s2.connect(hp); hp.connect(g3); g3.connect(bus);
    [2093, 2637, 3136, 3951, 4699, 5274, 6272].forEach((f, i) => cloche(bus, f * (1 + (i % 2) * 0.003), t + 0.015 + i * 0.012, 1.1, 0.022, 0.85, 0.5));
  };
  const fanfare = (bus: AudioNode, m: Musique, tMotif: number, tAccord: number) => {
    m.motif.forEach((n, i) => cloche(bus, hz(n), tMotif + i * 0.072, 0.55, 0.1, 0.32, 1.1));
    m.accord.forEach((n, i) => voix(bus, hz(n), tAccord + i * 0.006, 3.4, n < 52 ? 0.085 : 0.06));
    if (m.nappe) nappe(bus, m.accord.slice(-4).map(hz), tAccord, 3.6, 0.012, !!m.choeur);
    m.cascade.forEach((n, i) => cloche(bus, hz(n), tAccord + 0.16 + i * 0.085, 1.5, 0.032, 0.65, m.verre ? 1.6 : 1.2));
    boom(bus, tAccord, 0.45 * m.force);
  };
  const pop = (bus: AudioNode, t: number, f: number) => {
    const o = osc("sine", f, t, t + 0.3);
    o.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.05);
    const g = enveloppe(t, 0.004, 0.11, t + 0.26);
    o.connect(g); g.connect(bus);
    cloche(bus, f * 2, t + 0.01, 0.45, 0.028, 0.4, 0.8);
  };
  return { cloche, voix, nappe, montee, tics, impact, fanfare, pop, souffle };
}

/** Un bus qu'on peut couper d'un geste, sans clic. */
type Lecture = { couper: () => void };
let enCours: { bus: GainNode; ctx: AudioContext } | null = null;

function nouveauBus(c: Chaine, volume = 1): GainNode {
  // Une musique en chasse une autre : la fin de séance s'efface devant la scène.
  if (enCours) couperBus(enCours.bus, enCours.ctx);
  const b = c.ctx.createGain();
  b.gain.value = volume;
  b.connect(c.sortie);
  enCours = { bus: b, ctx: c.ctx };
  return b;
}

function couperBus(bus: GainNode, ctx: AudioContext) {
  const n = ctx.currentTime;
  try {
    bus.gain.cancelScheduledValues(n);
    bus.gain.setValueAtTime(bus.gain.value, n);
    bus.gain.linearRampToValueAtTime(0.0001, n + 0.09);
  } catch { /* déjà coupé */ }
}

/** Le passage de rang : la montée, l'impact, puis la musique du rang. */
export function jouerPassage(rangId: string, T: TempsScene): Lecture | null {
  if (!sonsActifs()) return null;
  const c = preparer();
  if (!c) return null;
  const m = MUSIQUE[rangId] ?? MUSIQUE.argent;
  const i = instruments(c);
  const b = nouveauBus(c);
  const t0 = c.ctx.currentTime + 0.06;
  const s = (ms: number) => t0 + ms / 1000;
  if (!T.reduit) {
    i.montee(b, s(T.charge), (T.eclat - T.charge) / 1000, m.force);
    i.tics(b, s(T.charge), (T.eveil - T.charge) / 1000, rangId === "eternel" ? 30 : 22);
    let acc = T.eveil;
    T.bascules.forEach((d, k) => {
      i.cloche(b, hz(86 + (k % 2) * 3 + Math.floor(k / 2) * 2), s(acc), 0.32, 0.032, 0.55, 1.3);
      acc += d;
    });
    i.impact(b, s(T.eclat), m.force);
    i.fanfare(b, m, s(T.eclat + 90), s(T.nom));
  } else {
    i.fanfare(b, m, s(T.nom - 250), s(T.nom));
  }
  T.cadeaux.forEach((ms, k) => i.pop(b, s(ms), hz(79 + k * 4)));
  return { couper: () => couperBus(b, c.ctx) };
}

/** La fin de séance : la musique du rang, sans la montée ni l'éclat. */
export function jouerFinSeance(rangId: string | null | undefined): void {
  if (!sonsActifs()) return;
  const c = preparer();
  if (!c) return;
  const m = MUSIQUE[rangId ?? "bronze"] ?? MUSIQUE.bronze;
  const i = instruments(c);
  const b = nouveauBus(c, 0.75);
  const t = c.ctx.currentTime + 0.04;
  m.motif.slice(-3).forEach((n, k) => i.cloche(b, hz(n), t + k * 0.11, 0.5, 0.09, 0.3, 1));
  const ta = t + 0.36;
  m.accord.forEach((n, k) => i.voix(b, hz(n), ta + k * 0.006, 2.2, n < 52 ? 0.06 : 0.045));
  if (m.nappe) i.nappe(b, m.accord.slice(-3).map(hz), ta, 2.2, 0.008, false);
}

/** La carte qu'on ouvre : un souffle, puis une note de verre. */
export function jouerOuvertureCarte(): void {
  if (!sonsActifs()) return;
  const c = preparer();
  if (!c) return;
  const i = instruments(c);
  const b = c.ctx.createGain();
  b.connect(c.sortie);
  const t = c.ctx.currentTime + 0.01;
  const s = i.souffle(t, t + 0.4);
  const bp = c.ctx.createBiquadFilter();
  bp.type = "bandpass"; bp.Q.value = 0.9;
  bp.frequency.setValueAtTime(2600, t); bp.frequency.exponentialRampToValueAtTime(500, t + 0.35);
  const g = c.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.16, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
  s.connect(bp); bp.connect(g); g.connect(b);
  i.cloche(b, hz(88), t + 0.2, 0.6, 0.04, 0.5, 1);
}

/**
 * sonsBooster.ts — L'ouverture du booster (Louis, 2026-11-25 : « premium, soigné, pas trop gamification »).
 *
 * Quatre moments, pas un de plus : le film qui se déchire sous le doigt, les cartes qui sortent, la
 * dernière carte, l'EXP qui monte. Les deux premières cartes se retournent en silence.
 *
 * De vrais enregistrements CC0 (sources dans docs/sons-booster.md), jamais de bruit synthétisé : la
 * première version l'était, Louis l'a refusée. Toutes les notes sont dans la même gamme.
 */
import { contexteAudio, sonsActifs } from "./sons";

const FICHIERS = ["dechirure", "detache", "cartes", "rare", "epique", "legendaire", "chromatique", "exp1", "exp2", "exp3"] as const;
type Fichier = (typeof FICHIERS)[number];
// Les niveaux : la déchirure et les cartes restent sous les notes, l'EXP sous la carte.
const NIVEAU: Record<Fichier, number> = {
  dechirure: .5, detache: .55, cartes: .75, rare: .8, epique: .85, legendaire: .9, chromatique: .9, exp1: .75, exp2: .8, exp3: .8,
};
// Le lit de déchirure : un tour, en secondes (mesuré au rendu), et un départ loin des bords du fichier.
const BOUCLE = .97;
const DEPART = .15;

const tampons = new Map<Fichier, AudioBuffer>();
let chargement: Promise<void> | null = null;
let sortie: GainNode | null = null;

/** Télécharge et décode les sons, pendant le toucher qui prépare le sachet. */
export function preparerSonsBooster(): void {
  if (!sonsActifs()) return;
  const c = contexteAudio();
  if (!c || chargement) return;
  chargement = Promise.all(FICHIERS.map(async f => {
    const r = await fetch(`/sons/booster/${f}.mp3`);
    if (!r.ok) throw new Error(f);
    tampons.set(f, await c.decodeAudioData(await r.arrayBuffer()));
  })).then(() => {}, () => { chargement = null; });
}

function destination(c: AudioContext): GainNode {
  if (!sortie) { sortie = c.createGain(); sortie.gain.value = 1.35; sortie.connect(c.destination); }
  return sortie;
}

function jouer(f: Fichier): void {
  if (!sonsActifs()) return;
  const c = contexteAudio(), tampon = tampons.get(f);
  if (!c || !tampon) return;
  const source = c.createBufferSource(), gain = c.createGain();
  source.buffer = tampon;
  gain.gain.value = NIVEAU[f];
  source.connect(gain).connect(destination(c));
  source.start();
}

export const sonCartes = () => jouer("cartes");
export const sonDerniereCarte = (rarete: string) =>
  jouer(rarete === "epique" || rarete === "legendaire" || rarete === "chromatique" ? rarete : "rare");
/** `k` : 0, 1 ou 2, la carte dont l'EXP rejoint le total. */
export const sonExp = (k: number) => jouer((["exp1", "exp2", "exp3"] as const)[Math.min(2, k)]);

/* La déchirure : un lit continu dont le volume suit la vitesse du doigt. Il s'éteint de lui-même dès
   que le doigt s'arrête. */
let film: { source: AudioBufferSourceNode; gain: GainNode; temps: number } | null = null;

/** `pas` : le chemin parcouru, en % de la largeur du sachet. */
export function sonDechirure(pas: number): void {
  if (!sonsActifs()) return;
  const c = contexteAudio(), tampon = tampons.get("dechirure");
  if (!c || !tampon) return;
  const t = c.currentTime;
  if (!film) {
    const source = c.createBufferSource(), gain = c.createGain();
    source.buffer = tampon;
    source.loop = true;
    source.loopStart = DEPART;
    source.loopEnd = DEPART + BOUCLE;
    gain.gain.value = 0;
    source.connect(gain).connect(destination(c));
    source.start(t, DEPART + Math.random() * BOUCLE * .8);
    film = { source, gain, temps: t - .016 };
  }
  const vitesse = pas / Math.max(.008, Math.min(.12, t - film.temps));
  film.temps = t;
  const force = Math.min(1, Math.sqrt(vitesse / 320));
  film.source.playbackRate.setTargetAtTime(.94 + force * .12, t, .04);
  film.gain.gain.cancelScheduledValues(t);
  film.gain.gain.setTargetAtTime(NIVEAU.dechirure * (.25 + force * .75), t, .018);
  film.gain.gain.setTargetAtTime(0, t + .07, .045);
}

/** La bande se détache : le film s'éteint sous un trait court. */
export function sonDetache(): void {
  jouer("detache");
  taireDechirure();
}

export function taireDechirure(): void {
  if (!film) return;
  const { source, gain } = film, t = gain.context.currentTime;
  film = null;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setTargetAtTime(0, t, .03);
  source.stop(t + .25);
}

/** Le booster se ferme : ce qui résonne encore s'éteint en douceur. */
export function couperSonsBooster(): void {
  if (!sortie) return;
  taireDechirure();
  const s = sortie;
  sortie = null;
  s.gain.setTargetAtTime(0, s.context.currentTime, .12);
  window.setTimeout(() => s.disconnect(), 900);
}

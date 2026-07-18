#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   Usine à personnages-guides : planche brute (ChatGPT) → frames PNG prêtes.

   TOI :  1. génère la planche dans ChatGPT — 2-3 poses du MÊME personnage
             côte à côte (départ → milieu → fin), fond uni (vert de préf.)
             ou transparent, les poses qui ne se touchent pas.
          2. dépose-la dans  guides-src/  — garde ton nommage habituel, le
             script en extrait l'exo tout seul :
             vaiiya-guide-femme-chaise-mur-chroma-v1.png → clé « chaisemur »
          3. npm run guides

   LUI :  détoure le fond, découpe les poses, les met TOUTES sur le même
          canevas (même échelle, même sol) et écrit
          public/entrainement/guides/<clé>-1.png, -2.png, …
          puis te dicte la règle à coller dans src/lib/exerciseGuides.ts.

   Le canevas commun est la clé : c'est lui qui empêche le perso de sauter
   d'une frame à l'autre pendant le fondu.

   Options :
     --loop        after 1→N, réémet N-1…2 pour que le geste revienne
                   (à utiliser quand la planche ne montre que l'aller)
     --only=squat  ne traite que cette planche
     --tol=60      tolérance du détourage (monte si le fond bave, descends
                   si le perso se fait manger)
     --key=xxx     force la clé (si l'extraction auto tombe à côté)
     --pose=2      ne garde QUE la pose n°2 (comptée depuis la gauche) →
                   frames:1, pas d'anim. C'est le cas des exos de TENUE
                   (chaise au mur, gainage) : il n'y a pas de geste à
                   rejouer, et sans fondu aucun décor ne peut sauter.
     --slices=3    force N découpes de largeur égale au lieu de chercher
                   les trous entre poses. Pour les planches où le DÉCOR
                   relie les poses en continu (rameur, presse, tapis) :
                   un long rail/châssis occupe toutes les colonnes, aucun
                   corridor vide ne sépare les poses → le carve auto les
                   recolle en une seule frame géante. On tranche alors en
                   N parts égales (poses régulièrement espacées) et chaque
                   part se recentre sur son propre perso. Vise UNE planche.
     --blobs=2     découpe par FORMES au lieu de colonnes. Pour les planches
                   où les poses SE CHEVAUCHENT en x (bicycle crunch : deux
                   corps allongés en diagonale) : il n'existe aucune colonne
                   vide entre eux, le carve auto les recolle en une frame à
                   deux personnages, et --slices coupe en plein milieu d'un
                   corps en laissant des fragments. Ici on isole les N plus
                   grosses formes connexes et on efface les autres de chaque
                   frame — ça marche tant que les poses ne SE TOUCHENT pas
                   (se chevaucher est permis, se toucher non). Vise UNE
                   planche.
   ════════════════════════════════════════════════════════════════════ */

import { readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = "guides-src";
const OUT = path.join("public", "entrainement", "guides");
const RULES = path.join("src", "lib", "exerciseGuides.ts");

const args = process.argv.slice(2);
const flag = (n, d) => {
  const a = args.find(x => x.startsWith(`--${n}=`));
  return a ? a.slice(n.length + 3) : d;
};
const LOOP = args.includes("--loop");
const ONLY = flag("only", null);
const TOL = Number(flag("tol", 60));
const KEY = flag("key", null);
const POSE = Number(flag("pose", 0));
const SLICES = Number(flag("slices", 0));
const BLOBS = Number(flag("blobs", 0));

/* ── Le nom du fichier → l'exo + le genre ─────────────────────────────
   On garde le nommage de prod intact et on jette l'intendance :
     vaiiya-guide-femme-chaise-mur-chroma-v1 → exo « chaisemur », genre f
   Le genre n'est PAS du bruit : il est gardé dans le nom du sprite pour
   qu'une version femme et une version homme du même exo puissent coexister
   le jour où on offrira le choix (cf. Guide.genres). */
const NOISE = new Set([
  "vaiiya", "aura", "guide", "guides", "sprite", "planche", "sheet",
  "chroma", "chromakey", "greenscreen", "green", "vert", "fondvert", "bg",
  "final", "def", "ok", "new", "copy", "copie",
]);
const GENRE = { femme: "f", female: "f", f: "f", homme: "h", male: "h", h: "h" };

/* La clé NOMME les fichiers (extensiontricepshaltere) ; elle ne matche
   jamais rien — le vrai nom d'exo a des espaces (« Extension triceps
   haltère »). La règle se construit donc à partir des mots.
   Pas de gymnastique sur les accents ici : resolveGuide les retire du nom
   avant de tester, les règles s'écrivent sans accent (cf. exerciseGuides).
   2 mots suffisent à viser un exo sans le sur-restreindre : « extension
   triceps » attrape aussi la variante à la poulie. */
const ruleFor = parts => parts.slice(0, 2).join(".*");

function keyOf(stem) {
  const words = stem
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")   // é → e
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter(p => !NOISE.has(p))
    .filter(p => !/^v?\d+$/.test(p));                    // v1, v2, 01…

  const genre = GENRE[words.find(w => GENRE[w])] ?? null;
  const parts = words.filter(w => !GENRE[w]);
  return {
    key: parts.join("") || stem.toLowerCase().replace(/[^a-z0-9]/g, ""),
    parts,
    genre,
  };
}

/* Marge autour du perso, en pixels du canevas final. */
const PAD = 24;
/* Un trou d'au moins 2 % de la largeur sépare deux poses. */
const GAP_RATIO = 0.02;
/* En dessous, un pixel est considéré comme du vide. */
const INK = 24;

/* ── Le fond : soit l'alpha existe déjà, soit on le déduit des bords ── */

async function toMask(file) {
  const img = sharp(file);
  const meta = await img.metadata();
  const { data, info } = await img
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;

  /* Assez de transparence pour dire que la planche est déjà détourée ? */
  let clear = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < INK) clear++;
  if (meta.hasAlpha && clear > w * h * 0.15) {
    return { data, w, h, mode: "alpha déjà là" };
  }

  /* Sinon : le fond, c'est la couleur médiane du liseré de bord. */
  const edge = [];
  const at = (x, y) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  for (let x = 0; x < w; x += 4) {
    edge.push(at(x, 0), at(x, h - 1));
  }
  for (let y = 0; y < h; y += 4) {
    edge.push(at(0, y), at(w - 1, y));
  }
  const med = k => {
    const v = edge.map(p => p[k]).sort((a, b) => a - b);
    return v[v.length >> 1];
  };
  const bg = [med(0), med(1), med(2)];
  const greenish = bg[1] > bg[0] + 24 && bg[1] > bg[2] + 24;

  /* Bord progressif : net au cœur du fond, doux sur le contour du perso. */
  const t0 = TOL, t1 = TOL * 2;
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - bg[0], dg = data[i + 1] - bg[1], db = data[i + 2] - bg[2];
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    let a = dist <= t0 ? 0 : dist >= t1 ? 255 : Math.round(((dist - t0) / (t1 - t0)) * 255);
    if (a === 0) { data[i] = data[i + 1] = data[i + 2] = 0; }
    else if (greenish && data[i + 1] > Math.max(data[i], data[i + 2])) {
      /* Anti-bavure : le vert qui a déteint sur les contours du perso. */
      data[i + 1] = Math.round((data[i] + data[i + 2]) / 2);
    }
    data[i + 3] = Math.min(data[i + 3], a);
  }
  return {
    data, w, h,
    mode: `fond détouré rgb(${bg.join(",")})${greenish ? " — vert, anti-bavure actif" : ""}`,
  };
}

/* ── Où est l'encre : colonnes occupées → poses ; lignes → sol commun ── */

function carve({ data, w, h }) {
  const cols = new Array(w).fill(false);
  let top = h, bot = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > INK) {
        cols[x] = true;
        if (y < top) top = y;
        if (y > bot) bot = y;
      }
    }
  }
  if (bot < 0) return null;

  /* Les poses = les paquets de colonnes séparés par un vrai trou. */
  const minGap = Math.max(4, Math.floor(w * GAP_RATIO));
  const runs = [];
  let start = -1, gap = 0;
  for (let x = 0; x < w; x++) {
    if (cols[x]) {
      if (start < 0) start = x;
      gap = 0;
    } else if (start >= 0 && ++gap >= minGap) {
      runs.push([start, x - gap]);
      start = -1;
    }
  }
  if (start >= 0) runs.push([start, w - 1]);

  /* On garde le HAUT et le BAS communs à toute la planche : c'est ce qui
     préserve la hauteur relative de chaque pose (un saut reste en l'air,
     un squat reste en bas) au lieu de recoller tout le monde au sol. */
  return { runs, top, bot };
}

/* Les lignes occupées d'une tranche de colonnes — pour recadrer sur UNE
   pose au lieu de la planche entière (cf. --pose). */
function bandOf({ data, w }, [a, b], h) {
  let top = h, bot = -1;
  for (let y = 0; y < h; y++) {
    for (let x = a; x <= b; x++) {
      if (data[(y * w + x) * 4 + 3] > INK) { if (y < top) top = y; if (y > bot) bot = y; break; }
    }
  }
  return [top, bot];
}

/* Le bloc de colonnes le plus large d'une tranche [a,b] — pour --slices : on
   recentre sur le perso principal et on jette les éclats du décor voisin
   (bout de volant, rail) qui débordent dans la tranche, séparés du perso par
   le même trou vide que carve sait voir. null si la tranche est vide. */
function widestRun({ data, w, h }, a, b) {
  /* Seuil relatif à la TRANCHE, pas à la planche : le voisin peut n'être qu'à
     quelques % de la tranche, un seuil calé sur la largeur totale ne le
     verrait pas. Un perso est un bloc plein — pas de corridor vert interne à
     ce seuil — donc on ne risque pas de le couper. */
  const minGap = Math.max(6, Math.floor((b - a + 1) * 0.015));
  let best = null, start = -1, gap = 0;
  for (let x = a; x <= b; x++) {
    let ink = false;
    for (let y = 0; y < h; y++) {
      if (data[(y * w + x) * 4 + 3] > INK) { ink = true; break; }
    }
    if (ink) {
      if (start < 0) start = x;
      gap = 0;
    } else if (start >= 0 && ++gap >= minGap) {
      if (!best || x - gap - start > best[1] - best[0]) best = [start, x - gap];
      start = -1;
    }
  }
  if (start >= 0 && (!best || b - start > best[1] - best[0])) best = [start, b];
  return best;
}

/* Les N plus grosses FORMES connexes (8-voisins), rendues dans l'ordre de
   lecture. Chacune revient avec sa propre copie de la planche où les autres
   formes sont effacées : deux poses qui se chevauchent en x partagent des
   colonnes, donc un simple recadrage ramènerait le voisin dans la frame.
   C'est la seule différence avec --slices ; le reste du pipeline (bande
   commune, canevas partagé) ne bouge pas. */
function blobsOf({ data, w, h }, want) {
  const lab = new Int32Array(w * h);
  const found = [];
  const stack = [];
  for (let s = 0; s < w * h; s++) {
    if (lab[s] || data[s * 4 + 3] <= INK) continue;
    const id = found.length + 1;
    let l = w, r = -1, t = h, b = -1, n = 0;
    lab[s] = id; stack.push(s);
    while (stack.length) {
      const p = stack.pop(), y = (p / w) | 0, x = p % w;
      n++;
      if (x < l) l = x; if (x > r) r = x;
      if (y < t) t = y; if (y > b) b = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (!lab[q] && data[q * 4 + 3] > INK) { lab[q] = id; stack.push(q); }
      }
    }
    found.push({ id, l, r, t, b, n });
  }
  if (found.length < want) return null;

  /* Les plus grosses = les persos ; les miettes (éclat de décor, pixel isolé)
     tombent. Puis on repasse en ordre de lecture : la frame 1 doit être la
     pose de GAUCHE, pas la plus grosse. */
  const keep = found.sort((a, b2) => b2.n - a.n).slice(0, want).sort((a, b2) => a.l - b2.l);
  const ids = new Set(keep.map(k => k.id));

  return keep.map(k => {
    const only = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      if (lab[i] !== k.id) continue;          // voisins ET miettes effacés
      only.set(data.subarray(i * 4, i * 4 + 4), i * 4);
    }
    return { run: [k.l, k.r], data: only, top: k.t, bot: k.b, ids };
  });
}

async function build(file, key, genre) {
  const mask = await toMask(file);
  const cut = carve(mask);
  if (!cut) return console.log(`  ✗ ${key} — planche vide, rien à découper`);

  let { runs, top, bot } = cut;

  /* --pose=N : un exo de TENUE (chaise au mur, gainage) n'a pas de geste à
     rejouer — on ne garde que la pose tenue, et le canevas se recadre sur
     elle seule (garder la bande commune laisserait le vide des autres poses).
     Résultat : frames:1, aucun fondu, donc aucun décor qui saute. */
  if (POSE) {
    if (POSE > runs.length) {
      return console.log(`  ✗ ${key} — pose ${POSE} demandée, la planche n'en a que ${runs.length}`);
    }
    runs = [runs[POSE - 1]];
    [top, bot] = bandOf(mask, runs[0], mask.h);
  }

  /* --slices=N : le décor relie les poses (rameur, presse…), le carve n'a
     trouvé qu'un seul bloc. On tranche cette étendue en N parts égales et on
     rogne chacune sur son perso. Le HAUT/BAS commun reste celui de la planche
     entière → même sol, même échelle, le fondu ne fait sauter personne. */
  if (SLICES) {
    const lo = runs[0][0], hi = runs[runs.length - 1][1];
    const step = (hi - lo + 1) / SLICES;
    const sliced = [];
    for (let s = 0; s < SLICES; s++) {
      const a = Math.round(lo + s * step);
      const b = Math.round(lo + (s + 1) * step) - 1;
      const t = widestRun(mask, a, b);
      if (t) sliced.push(t);
    }
    if (sliced.length !== SLICES) {
      return console.log(`  ✗ ${key} — ${SLICES} tranches demandées, ${sliced.length} avec du perso dedans (planche mal espacée ?)`);
    }
    runs = sliced;
  }

  /* --blobs=N : les poses se chevauchent en x (aucune colonne vide à couper).
     On repart des formes connexes, et chaque frame lit SA propre planche où
     les voisines sont effacées. Le haut/bas redevient celui des seules formes
     gardées — sinon une miette de décor loin du perso étirerait la bande. */
  let sources = null;
  if (BLOBS) {
    const blobs = blobsOf(mask, BLOBS);
    if (!blobs) {
      return console.log(`  ✗ ${key} — ${BLOBS} formes demandées, la planche en a moins (poses qui se touchent ?)`);
    }
    runs = blobs.map(b => b.run);
    sources = blobs.map(b => b.data);
    top = Math.min(...blobs.map(b => b.top));
    bot = Math.max(...blobs.map(b => b.bot));
  }

  const band = bot - top + 1;
  const widest = Math.max(...runs.map(([a, b]) => b - a + 1));
  const cw = widest + PAD * 2;
  const ch = band + PAD * 2;

  const raw = { raw: { width: mask.w, height: mask.h, channels: 4 } };
  const frames = [];
  for (let r = 0; r < runs.length; r++) {
    const [a, b] = runs[r];
    const pw = b - a + 1;
    frames.push(
      await sharp(sources ? sources[r] : mask.data, raw)
        .extract({ left: a, top, width: pw, height: band })
        .extend({
          top: PAD, bottom: PAD,
          left: PAD + ((widest - pw) >> 1),
          right: cw - pw - PAD - ((widest - pw) >> 1),
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png({ compressionLevel: 9 })
        .toBuffer()
    );
  }

  /* --loop : la planche ne montre que l'aller, on rejoue le retour. */
  const out = [...frames];
  if (LOOP && frames.length > 2) {
    for (let i = frames.length - 2; i >= 1; i--) out.push(frames[i]);
  }

  await mkdir(OUT, { recursive: true });
  for (let i = 0; i < out.length; i++) {
    await writeFile(path.join(OUT, `${key}-${genre}-${i + 1}.png`), out[i]);
  }
  console.log(
    `  ✓ ${key}-${genre} — ${out.length} frame${out.length > 1 ? "s" : ""} en ${cw}×${ch}  (${mask.mode})`
  );
  return { key, genre, frames: out.length };
}

/* ── ── */

const files = (await readdir(SRC).catch(() => {
  console.log(`Rien à faire : le dossier ${SRC}/ n'existe pas encore.
Crée-le, dépose tes planches dedans (squat.png, pompes.png, …), relance.`);
  process.exit(0);
})).filter(f => /\.(png|jpe?g|webp)$/i.test(f));

if (!files.length) {
  console.log(`Le dossier ${SRC}/ est vide — dépose tes planches dedans.`);
  process.exit(0);
}

/* --pose vise UNE planche. Sans garde-fou, il s'appliquerait à toutes celles
   qui traînent dans le dossier et re-découperait en silence une tenue déjà
   réglée (frames:1 → on réafficherait la mauvaise pose, sans erreur). */
if ((POSE || SLICES || BLOBS) && !ONLY && files.length > 1) {
  const opt = POSE ? `--pose=${POSE}` : SLICES ? `--slices=${SLICES}` : `--blobs=${BLOBS}`;
  console.log(`\n${opt} s'appliquerait aux ${files.length} planches du dossier.
Vise-en une : npm run guides:build -- --only=<exo> ${opt} && npm run guides:normalize
(ou ne garde que celle-là dans ${SRC}/)
⚠ pas « npm run guides -- <option> » : npm colle l'argument en fin de chaîne,
  donc sur normalize-guides.mjs, qui l'ignore en silence.\n`);
  process.exit(1);
}

console.log(`\nPlanches → frames${LOOP ? "  (--loop : le geste revient)" : ""}\n`);
const done = [];
const seen = new Map();
for (const f of files) {
  const auto = keyOf(path.parse(f).name);
  const key = KEY ?? auto.key;
  const parts = KEY ? [KEY] : auto.parts;
  if (ONLY && key !== ONLY) continue;

  /* Sans genre dans le nom, on ne sait pas qui est dessiné : on ne devine
     pas, sinon la planche femme finirait rangée sous « homme ». */
  if (!auto.genre) {
    console.log(`  ✗ ${f}
      → genre introuvable dans le nom. Ajoute « femme » ou « homme »
        (vaiiya-guide-femme-${key}-chroma-v1.png) puis relance.`);
    continue;
  }

  /* Même exo + même genre = la 2e planche écraserait la 1re. Même exo,
     genres différents = c'est la parité, tout va bien. */
  const id = `${key}-${auto.genre}`;
  if (seen.has(id)) {
    console.log(`  ✗ ${f}
      → même exo ET même genre que ${seen.get(id)} : la 2e écraserait la 1re.
        Garde-en une, ou distingue les exos (…-chaise-mur-assis).`);
    continue;
  }
  seen.set(id, f);

  console.log(`  ${f}\n      →  exo « ${key} », ${auto.genre === "f" ? "femme" : "homme"}`);
  if (parts.length > 3) {
    console.log(`      (si l'exo est faux : npm run guides -- --key=lavraiecle)`);
  }
  const r = await build(path.join(SRC, f), key, auto.genre);
  if (r) done.push({ ...r, parts });
}

/* Reste à faire côté règles : exo inconnu, ou exo connu mais nouveau genre. */
const rules = await import("node:fs").then(fs =>
  fs.promises.readFile(RULES, "utf8").catch(() => "")
);
const ruleOf = key => new RegExp(`key:\\s*"${key}"[^}]*`).exec(rules)?.[0] ?? null;
const framesOf = r => Number(/frames:\s*(\d+)/.exec(r)?.[1] ?? NaN);

const news = done.filter(d => !ruleOf(d.key));
const parity = done.filter(d => {
  const r = ruleOf(d.key);
  return r && !r.includes(`"${d.genre}"`);
});
/* Re-traiter une planche peut CHANGER le nombre de frames (une pose ajoutée,
   --loop, --pose). La règle, elle, garde l'ancien compte : l'app afficherait
   3 frames sur 4 (la remontée disparaît) ou chercherait une 4e PNG qui
   n'existe pas. Rien ne casse bruyamment — d'où ce rappel. */
const stale = done.filter(d => {
  const r = ruleOf(d.key);
  return r && framesOf(r) !== d.frames;
});

if (news.length) {
  console.log(`\nÀ coller dans ${RULES} (GUIDE_RULES) — l'ordre compte, du
plus précis au plus générique :\n`);
  for (const o of news) {
    console.log(`  { re: /${ruleFor(o.parts)}/i, guide: { key: "${o.key}", frames: ${o.frames}, genres: ["${o.genre}"] } },`);
  }
  console.log(`\n(la regex teste le NOM DE L'EXO tel qu'il s'affiche dans l'app,
accents compris — vérifie qu'elle le vise vraiment, et élargis-la aux
variantes : /pompe|push.?up/i plutôt que /pompes/i)`);
}
if (parity.length) {
  console.log(`\nParité : l'exo a déjà sa règle, ajoute juste le genre dans
son tableau \`genres\` (${RULES}) :\n`);
  for (const o of parity) {
    console.log(`  ${o.key} → genres: [… , "${o.genre}"]`);
  }
}
if (stale.length) {
  console.log(`\nLe nombre de frames a changé : mets \`frames\` à jour dans
sa règle (${RULES}), sinon l'app garde l'ancien compte, sans erreur :\n`);
  for (const o of stale) {
    console.log(`  ${o.key} → frames: ${o.frames}  (la règle dit encore ${framesOf(ruleOf(o.key))})`);
  }
}
if (!news.length && !parity.length && !stale.length && done.length) {
  console.log(`\nLes règles sont déjà à jour — rien à toucher.`);
}
console.log();

// Le fond de la carte chromatique : la carte légendaire passée à l'or (Louis, 2026-11-18,
// avec une image de référence « Cartes chromatiques · Rareté dorée »).
//
// Les deux raretés partagent la même mise en page (le cadre, le soleil, la zone du nom, les
// deux chiffres) : on garde le dessin de la légendaire et on change sa matière. Le fond est
// lu en niveaux de lumière puis repeint dans une gamme d'or, « EXERCICE » reste violet, les
// chiffres passent à +7 et +6, le badge dit « CHROMATIQUE », et un film irisé et des éclats
// se posent sur les bords. Le résultat est une image fixe : `npm run cartes:booster` la lit
// comme les autres fonds.
//
// Lancer : node scripts/build-fond-chromatique.mjs
import sharp from "sharp";

const source = "public/boosters/cartes-prisme/legendaire.webp";
const cible = "public/boosters/cartes-prisme/chromatique.webp";
const L = 820, H = 1290;
const svg = c => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${H}">${c}</svg>`);

const { data, info } = await sharp(source).resize(L, H).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const px = Buffer.from(data);
const lum = (i) => .3 * px[i] + .59 * px[i + 1] + .11 * px[i + 2];

// 1. Les deux chiffres de la légendaire s'effacent : chaque pixel d'encre prend la moyenne
// des pixels de fond voisins (une moyenne normalisée, qui ignore l'encre), puis on écrit +7 et +6.
const chiffres = [{ x: 160, y: 1000, w: 110, h: 76 }, { x: 540, y: 1000, w: 115, h: 76 }];
for (const z of chiffres) {
  const fond = (x, y) => lum((y * L + x) * 3) > 150;
  const encre = new Uint8Array(z.w * z.h);
  for (let y = 0; y < z.h; y++) for (let x = 0; x < z.w; x++) {
    let e = false;
    for (let dy = -3; dy <= 3 && !e; dy++) for (let dx = -3; dx <= 3 && !e; dx++) {
      const X = z.x + x + dx, Y = z.y + y + dy;
      if (!fond(X, Y)) e = true;
    }
    encre[y * z.w + x] = e ? 1 : 0;
  }
  const r = 26;
  const copie = Buffer.from(px);
  for (let y = 0; y < z.h; y++) for (let x = 0; x < z.w; x++) {
    if (!encre[y * z.w + x]) continue;
    let s = [0, 0, 0], n = 0;
    for (let dy = -r; dy <= r; dy += 2) for (let dx = -r; dx <= r; dx += 2) {
      const X = z.x + x + dx, Y = z.y + y + dy;
      const lx = X - z.x, ly = Y - z.y;
      if (lx >= 0 && ly >= 0 && lx < z.w && ly < z.h && encre[ly * z.w + lx]) continue;
      if (!fond(X, Y)) continue;
      const i = (Y * L + X) * 3;
      s[0] += copie[i]; s[1] += copie[i + 1]; s[2] += copie[i + 2]; n++;
    }
    const i = ((z.y + y) * L + z.x + x) * 3;
    if (n) { px[i] = s[0] / n; px[i + 1] = s[1] / n; px[i + 2] = s[2] / n; }
  }
}
const nouveaux = await sharp(px, { raw: info }).composite([{ input: svg(`
  <g font-family="Inter, Arial, sans-serif" font-weight="900" font-style="italic" font-size="74" fill="#35165e" text-anchor="middle">
    <text x="212" y="1064">+7</text><text x="596" y="1064">+6</text>
  </g>`) }]).removeAlpha().raw().toBuffer();

// 2. Tout passe à l'or : la lumière de chaque pixel choisit sa teinte dans une gamme d'or.
// « EXERCICE » garde une encre violette, les autres textes deviennent un brun doré.
const gamme = [[0, [58, 24, 6]], [.2, [120, 62, 10]], [.42, [196, 128, 22]], [.62, [236, 182, 52]], [.8, [252, 222, 116]], [.93, [255, 244, 190]], [1, [255, 253, 240]]];
const teinte = t => {
  let k = 0;
  while (k < gamme.length - 2 && t > gamme[k + 1][0]) k++;
  const [a, ca] = gamme[k], [b, cb] = gamme[k + 1], u = (t - a) / (b - a);
  return ca.map((c, j) => c + (cb[j] - c) * u);
};
const exercice = { x: 230, y: 790, w: 360, h: 56 };
const or = Buffer.alloc(nouveaux.length);
for (let y = 0; y < H; y++) for (let x = 0; x < L; x++) {
  const i = (y * L + x) * 3;
  const l = (.3 * nouveaux[i] + .59 * nouveaux[i + 1] + .11 * nouveaux[i + 2]) / 255;
  // Une courbe qui descend les tons moyens : le fond lilas devient un or riche, le cœur du
  // soleil reste clair, les ombres du cadre passent dans l'or foncé.
  const t = Math.min(1, Math.pow(l, 1.75) * 1.06);
  let c = teinte(t);
  const dansExercice = x >= exercice.x && x < exercice.x + exercice.w && y >= exercice.y && y < exercice.y + exercice.h;
  if (dansExercice && l < .6) {
    const k = Math.min(1, (.6 - l) / .35);
    c = c.map((v, j) => v + ([92, 40, 168][j] - v) * k);
  }
  or[i] = c[0]; or[i + 1] = c[1]; or[i + 2] = c[2];
}

// 3. Le film irisé sur les bords, les éclats, et le badge « CHROMATIQUE ».
const tache = (cx, cy, rx, ry, rot, id) => `<defs>
  <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
    <stop stop-color="#ff6ad0"/><stop offset=".25" stop-color="#b98cff"/><stop offset=".45" stop-color="#6fd4ff"/>
    <stop offset=".6" stop-color="#9dffe0"/><stop offset=".78" stop-color="#ff9ad8"/><stop offset="1" stop-color="#c79bff"/>
  </linearGradient></defs>
  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="url(#${id})" opacity=".9" filter="url(#flou)"/>`;
const irise = svg(`<defs><filter id="flou" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter></defs>
  ${tache(52, 300, 30, 170, 14, "a")}${tache(100, 470, 18, 120, 24, "a2")}${tache(768, 330, 30, 170, -16, "b")}${tache(722, 500, 18, 120, -26, "b2")}
  ${tache(48, 1010, 28, 170, -10, "c")}${tache(104, 1150, 16, 90, -40, "c2")}${tache(772, 990, 28, 170, 12, "d")}${tache(716, 1150, 16, 90, 40, "d2")}
  ${tache(410, 1232, 230, 26, 0, "e")}${tache(240, 46, 120, 18, -4, "f")}${tache(410, 690, 300, 14, 0, "h")}`);

// Des éclats en étoile à quatre branches, posés à la main pour ne jamais tomber sur un texte.
const etoile = (x, y, r, o = 1) => `<path transform="translate(${x} ${y})" opacity="${o}" fill="#fff"
  d="M0 ${-r}C${r * .12} ${-r * .12} ${r * .12} ${-r * .12} ${r} 0C${r * .12} ${r * .12} ${r * .12} ${r * .12} 0 ${r}C${-r * .12} ${r * .12} ${-r * .12} ${r * .12} ${-r} 0C${-r * .12} ${-r * .12} ${-r * .12} ${-r * .12} 0 ${-r}Z"/>`;
const eclats = [[150, 250, 16], [670, 230, 20], [120, 480, 10], [700, 520, 12], [215, 180, 8], [610, 330, 9], [80, 640, 9], [745, 690, 11],
  [300, 290, 7], [530, 420, 8], [140, 1150, 12], [690, 1140, 14], [410, 1255, 10], [95, 860, 8], [730, 880, 9], [260, 960, 6], [560, 1110, 7]];
const decor = svg(`
  <defs>
    <radialGradient id="halo"><stop stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="pilule" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff1b8"/><stop offset=".45" stop-color="#f2c349"/><stop offset="1" stop-color="#b9780f"/></linearGradient>
    <linearGradient id="bord" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffbe6"/><stop offset=".5" stop-color="#d79a1e"/><stop offset="1" stop-color="#fff0b0"/></linearGradient>
  </defs>
  ${eclats.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r * 2.4}" fill="url(#halo)" opacity=".55"/>${etoile(x, y, r)}`).join("")}
  <rect x="330" y="72" width="456" height="98" rx="49" fill="#7a4708" opacity=".35" transform="translate(0 5)"/>
  <rect x="330" y="72" width="456" height="98" rx="49" fill="url(#pilule)" stroke="url(#bord)" stroke-width="5"/>
  <rect x="356" y="80" width="404" height="30" rx="15" fill="#fff" opacity=".35"/>
  <g fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round" transform="translate(372 121)">
    <path d="M-20 -14h40l12 15-32 33-32-33z"/><path d="M-32 1h64M-8 -14l8 48 8-48"/>
  </g>
  <text x="578" y="122" text-anchor="middle" dominant-baseline="middle" font-family="Inter, Arial, sans-serif"
    font-size="40" font-weight="900" font-style="italic" fill="#fff" stroke="#8a5208" stroke-width="5" paint-order="stroke">CHROMATIQUE</text>`);

await sharp(or, { raw: info })
  .composite([{ input: irise, blend: "overlay" }, { input: irise, blend: "overlay" }, { input: irise, blend: "screen" }, { input: decor }])
  .webp({ quality: 86, effort: 6 })
  .toFile(cible);
console.log(`Écrit : ${cible}`);

// 4. Le dos doré de la carte chromatique (cinquième carte de la référence) : un or rayonnant,
// un cadre de volutes symétriques, le film irisé sur les bords, des éclats, et la marque au centre.
// Il ne se montre que dans l'attente de la dernière carte, quand elle est chromatique : avant, toutes
// les cartes gardent le même dos, sinon la rareté serait connue dès la sortie du sachet.
const dosCible = "public/boosters/dos-chromatique.webp";
const rayonsDos = Array.from({ length: 36 }, (_, k) => {
  const a = (k * 10) * Math.PI / 180, b = (k * 10 + 4) * Math.PI / 180, R = 1100;
  return `<path d="M410 600L${410 + R * Math.cos(a)} ${600 + R * Math.sin(a)}L${410 + R * Math.cos(b)} ${600 + R * Math.sin(b)}Z"/>`;
}).join("");
// Une volute : une courbe en S qui s'enroule, dessinée pour le coin haut gauche puis reflétée.
const volute = `<path d="M70 250C70 150 120 96 214 92C292 89 330 136 310 182C294 218 250 222 236 196C224 172 246 150 266 160"/>
  <path d="M250 70C150 70 96 120 92 214C89 292 136 330 182 310C218 294 222 250 196 236C172 224 150 246 160 266"/>
  <path d="M120 120C150 170 200 200 262 206M120 120C170 150 200 200 206 262"/>`;
const coins = [[0, 0, 1, 1], [L, 0, -1, 1], [0, H, 1, -1], [L, H, -1, -1]]
  .map(([x, y, sx, sy]) => `<g transform="translate(${x} ${y}) scale(${sx} ${sy})">${volute}</g>`).join("");
const milieu = (y, s) => `<g transform="translate(410 ${y}) scale(1 ${s})">
  <path d="M-150 0C-90 0 -60 -40 -20 -40C10 -40 14 -10 0 -4C-14 2 -22 -16 -8 -20"/>
  <path d="M150 0C90 0 60 -40 20 -40C-10 -40 -14 -10 0 -4C14 2 22 -16 8 -20"/>
</g>`;
const eclatsDos = [[180, 360, 14], [640, 330, 18], [150, 860, 12], [680, 900, 15], [410, 230, 11], [410, 1060, 13], [260, 520, 7], [570, 700, 8], [600, 1150, 9], [210, 1140, 10]];
const marque = (await sharp("public/marque/marque-blanc.png").resize(300).png().toBuffer()).toString("base64");
const dos = svg(`
  <defs>
    <radialGradient id="orDos" cx="50%" cy="47%" r="70%">
      <stop stop-color="#fffbe0"/><stop offset=".22" stop-color="#ffe58a"/><stop offset=".55" stop-color="#eeb43a"/>
      <stop offset=".85" stop-color="#c07c12"/><stop offset="1" stop-color="#8e520a"/>
    </radialGradient>
    <radialGradient id="coeur" cx="50%" cy="46.5%" r="34%"><stop stop-color="#fff" stop-opacity=".95"/><stop offset=".45" stop-color="#fff6cf" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <radialGradient id="halo"><stop stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <filter id="ombre" x="-20%" y="-20%" width="140%" height="140%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="5" result="gros"/>
      <feFlood flood-color="#8a5208"/><feComposite operator="in" in2="gros" result="bord"/>
      <feMerge><feMergeNode in="bord"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <linearGradient id="filet" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffbe6"/><stop offset=".5" stop-color="#f7d36b"/><stop offset="1" stop-color="#fff3c0"/></linearGradient>
  </defs>
  <rect width="${L}" height="${H}" fill="url(#orDos)"/>
  <g fill="#fff6c8" opacity=".16">${rayonsDos}</g>
  <rect width="${L}" height="${H}" fill="url(#coeur)"/>
  <rect x="26" y="26" width="${L - 52}" height="${H - 52}" rx="62" fill="none" stroke="url(#filet)" stroke-width="7"/>
  <rect x="48" y="48" width="${L - 96}" height="${H - 96}" rx="46" fill="none" stroke="#8a5208" stroke-opacity=".45" stroke-width="3"/>
  <g fill="none" stroke="#8a5208" stroke-opacity=".5" stroke-width="12" stroke-linecap="round" transform="translate(0 4)">${coins}${milieu(140, 1)}${milieu(H - 140, -1)}</g>
  <g fill="none" stroke="url(#filet)" stroke-width="8" stroke-linecap="round">${coins}${milieu(140, 1)}${milieu(H - 140, -1)}</g>
  ${eclatsDos.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r * 2.4}" fill="url(#halo)" opacity=".6"/>${etoile(x, y, r)}`).join("")}
  <circle cx="560" cy="470" r="70" fill="url(#halo)" opacity=".7"/>${etoile(560, 470, 34)}
  <image href="data:image/png;base64,${marque}" x="260" y="420" width="300" height="263" filter="url(#ombre)"/>
  <text x="410" y="790" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="96" font-weight="900" font-style="italic"
    fill="#fff" stroke="#8a5208" stroke-width="10" stroke-linejoin="round" paint-order="stroke" letter-spacing="-2">Vaiiya</text>`);
await sharp(dos)
  .composite([
    { input: irise, blend: "overlay" }, { input: irise, blend: "screen" },
  ])
  .webp({ quality: 86, effort: 6 })
  .toFile(dosCible);
console.log(`Écrit : ${dosCible}`);

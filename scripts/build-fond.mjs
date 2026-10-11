// Fabrique le fond « bulles » de Vaiiya (Louis, 2026-10-11) : grandes sphères
// de verre floues, bleu lilas, violet, rose, sur un blanc froid. Pas de jaune.
// `node scripts/build-fond.mjs` → public/fond/vaiiya-bulles-v1.webp
import sharp from "sharp";

const W = 1170, H = 2532;

// Une sphère : un remplissage dégradé (le cœur coloré décalé vers un bord),
// un halo blanc intérieur et une arête fine, comme sur une bulle de verre.
function sphere(id, cx, cy, r, c1, c2, fx, fy) {
  return `
  <radialGradient id="g${id}" cx="${fx}" cy="${fy}" r="0.75">
    <stop offset="0" stop-color="${c1}" stop-opacity="1"/>
    <stop offset=".45" stop-color="${c2}" stop-opacity=".75"/>
    <stop offset=".85" stop-color="#ffffff" stop-opacity=".55"/>
    <stop offset="1" stop-color="#ffffff" stop-opacity=".7"/>
  </radialGradient>
  <g data-s="${id}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#g${id})" filter="url(#doux)"/>
    <circle cx="${cx}" cy="${cy}" r="${r - 22}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="60" filter="url(#halo)"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#fff" stroke-opacity="1" stroke-width="6" filter="url(#arete)"/>
  </g>`;
}

const defs = [], corps = [];
const S = [
  // id, cx, cy, r, cœur, bord, foyer x, foyer y
  [4, 60, 1800, 620, "#E59BE0", "#C7B5FF", 0.70, 0.35],   // bas gauche, rose violet
  [2, 1050, 1150, 820, "#F4B2E6", "#E2D8FF", 0.15, 0.25], // droite, rose pâle
  [1, 60, 520, 700, "#5E90F0", "#9FB2FF", 0.80, 0.55],    // haut gauche, bleu lilas
  [3, 1240, 2200, 720, "#8C6CF4", "#BBA6FF", 0.20, 0.30], // bas droite, violet
];
for (const s of S) {
  const txt = sphere(...s);
  const i = txt.indexOf("<g");
  defs.push(txt.slice(0, i));
  corps.push(txt.slice(i));
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="base" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#EEF1FF"/>
    <stop offset=".5" stop-color="#F7F5FF"/>
    <stop offset="1" stop-color="#F4F0FF"/>
  </linearGradient>
  <filter id="doux" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="halo" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16"/></filter>
  <filter id="arete" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>
  <filter id="flou" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .07 0"/></filter>
  ${defs.join("")}
</defs>
<rect width="${W}" height="${H}" fill="url(#base)"/>
<g filter="url(#flou)">${corps.join("")}</g>
<rect width="${W}" height="${H}" filter="url(#grain)"/>
</svg>`;

await sharp(Buffer.from(svg)).webp({ quality: 82, effort: 6 }).toFile("public/fond/vaiiya-bulles-v1.webp");
console.log("public/fond/vaiiya-bulles-v1.webp");

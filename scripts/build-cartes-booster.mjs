import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { mouvements, raretes } from "../src/lib/cartesBooster.ts";

const largeur = 820;
const hauteur = 1290;
const dossier = "public/boosters";
const sortie = path.join(dossier, "cartes-completes-v1");
const guides = process.argv.slice(2);
if (guides.some(guide => guide !== "sasha" && guide !== "nora")) {
  throw new Error("Guides acceptés : nora, sasha");
}
const anciensVisuelsSasha = new Set(["pompes", "fentes", "squat"]);
const svg = contenu => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${largeur}" height="${hauteur}">${contenu}</svg>`);
const position = (pourcent, dimension) => Math.round(pourcent * dimension / 100);

await mkdir(sortie, { recursive: true });

// La carte chromatique : un fond lilas clair où la lumière rayonne derrière le Guide, un film
// holographique arc-en-ciel posé en lumière douce, et un cadre nacre et or.
const rayons = Array.from({ length: 28 }, (_, i) => {
  const a = (i / 28) * Math.PI * 2, b = a + Math.PI / 56, r = 1400, cx = 410, cy = 430;
  return `<path d="M${cx} ${cy}L${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}L${cx + r * Math.cos(b)} ${cy + r * Math.sin(b)}Z"/>`;
}).join("");
const holo = [
  { input: svg(`<defs><radialGradient id="l" cx="50%" cy="33%" r="65%"><stop stop-color="#fff" stop-opacity=".95"/><stop offset=".45" stop-color="#efe4ff" stop-opacity=".55"/><stop offset="1" stop-color="#d9c8ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="m" cx="50%" cy="33%" r="60%"><stop stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#l)"/><g fill="url(#m)">${rayons}</g>`), blend: "screen" },
  { input: svg(`<defs><linearGradient id="h" x1="0" y1="0" x2="1" y2="1">
    <stop stop-color="#ff7ad9"/><stop offset=".18" stop-color="#ffd36e"/><stop offset=".34" stop-color="#8dffc6"/>
    <stop offset=".5" stop-color="#6fd8ff"/><stop offset=".66" stop-color="#a98bff"/><stop offset=".82" stop-color="#ff8fd0"/><stop offset="1" stop-color="#ffe08a"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#h)" opacity=".7"/>`), blend: "soft-light" },
  { input: svg(`<defs><linearGradient id="c" x1="0" y1="0" x2="1" y2="1">
    <stop stop-color="#ff9ee0"/><stop offset=".15" stop-color="#ffe7a6"/><stop offset=".3" stop-color="#e9b94a"/>
    <stop offset=".45" stop-color="#a6ffd9"/><stop offset=".6" stop-color="#8fdcff"/><stop offset=".75" stop-color="#c3a8ff"/>
    <stop offset=".9" stop-color="#ffb8e6"/><stop offset="1" stop-color="#fff2c2"/></linearGradient>
    <linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff" stop-opacity=".95"/><stop offset=".5" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity=".8"/></linearGradient></defs>
    <rect x="12" y="12" width="${largeur - 24}" height="${hauteur - 24}" rx="48" fill="none" stroke="url(#c)" stroke-width="22"/>
    <rect x="12" y="12" width="${largeur - 24}" height="${hauteur - 24}" rx="48" fill="none" stroke="url(#n)" stroke-width="22" opacity=".45"/>
    <rect x="25" y="25" width="${largeur - 50}" height="${hauteur - 50}" rx="38" fill="none" stroke="#e9b94a" stroke-width="3"/>
    <rect x="4" y="4" width="${largeur - 8}" height="${hauteur - 8}" rx="54" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="3"/>`) },
];

for (const [exercice, [nom, pose]] of Object.entries(mouvements)) {
  for (const guide of guides.length ? guides : ["nora", "sasha"]) {
    const source = guide === "sasha" && anciensVisuelsSasha.has(exercice)
      ? `public/premiers-pas/m-${exercice}-2.webp`
      : path.join(dossier, guide, `${exercice}.webp`);
    const auSol = pose === "sol" || pose === "pompes";
    const saut = pose === "saut" ? 10 : 0;
    const sol = auSol ? 3 : 5;
    const zone = hauteur * .30;
    const visuel = await sharp(source).resize({
      width: position(auSol ? 94 : pose === "machine" ? 89 : 80, largeur * .9),
      height: position(100 - sol - saut - 5, zone),
      fit: "inside",
    }).ensureAlpha().png().toBuffer({ resolveWithObject: true });
    const left = Math.round((largeur - visuel.info.width) / 2);
    const top = Math.round(hauteur * .5 - position(sol + saut - 2, zone) - visuel.info.height);
    const ombre = svg(`<defs><radialGradient id="ombre"><stop stop-color="#211433" stop-opacity=".37"/><stop offset="1" stop-color="#211433" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="${largeur / 2}" cy="${top + visuel.info.height}" rx="${Math.round(visuel.info.width * .44)}" ry="15" fill="url(#ombre)"/>`);

    for (const rarete of Object.keys(raretes)) {
      if (guide === "nora" && exercice === "crunch" && rarete !== "chromatique") continue;
      const chromatique = rarete === "chromatique";
      const or = rarete === "legendaire";
      const fond = sharp(path.join(dossier, "cartes-prisme", `${chromatique ? "epique" : rarete}.webp`));
      if (chromatique) fond.modulate({ brightness: 1.06, saturation: .55 });
      const texte = svg(`
        <text x="410" y="752" text-anchor="middle" dominant-baseline="middle"
          font-family="Arial, sans-serif" font-size="${nom.length > 15 ? 46 : 65}" font-weight="900"
          font-style="italic" fill="${or ? "#fff" : "#35165e"}">${nom.toLocaleUpperCase("fr-FR")}</text>
        ${chromatique ? `<defs>
            <linearGradient id="verre" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fbf8ff" stop-opacity=".97"/><stop offset="1" stop-color="#efe6ff" stop-opacity=".93"/></linearGradient>
            <linearGradient id="reflet" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
          </defs>
          <rect x="289" y="65" width="483" height="109" rx="54" fill="url(#verre)" stroke="#fff" stroke-opacity=".9" stroke-width="3"/>
          <rect x="330" y="69" width="400" height="3" rx="1.5" fill="url(#reflet)"/>
          <text x="555" y="123" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif"
            font-size="42" font-weight="900" font-style="italic" fill="#4a2a86">CHROMATIQUE</text>
          <path d="M330 104h34l12 14-29 32-29-32z" fill="#cfe9ff" stroke="#6a4bb0" stroke-width="3" stroke-linejoin="round"/><path d="M318 118h58M336 104l11 46 11-46" fill="none" stroke="#6a4bb0" stroke-width="2"/>` : ""}`);
      await fond.resize(largeur, hauteur).composite([
        ...(chromatique ? holo : []),
        { input: ombre },
        { input: visuel.data, left, top },
        { input: texte },
      ]).webp({ quality: 78, effort: 5 }).toFile(path.join(sortie, `${guide}-${exercice}-${rarete}.webp`));
    }
  }
}

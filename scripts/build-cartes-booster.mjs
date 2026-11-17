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
    <radialGradient id="m" cx="50%" cy="33%" r="60%"><stop stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#l)"/><g fill="url(#m)">${rayons}</g>`), blend: "screen" },
  { input: svg(`<defs><linearGradient id="h" x1="0" y1="0" x2="1" y2="1">
    <stop stop-color="#ff7ad9"/><stop offset=".18" stop-color="#ffd36e"/><stop offset=".34" stop-color="#8dffc6"/>
    <stop offset=".5" stop-color="#6fd8ff"/><stop offset=".66" stop-color="#a98bff"/><stop offset=".82" stop-color="#ff8fd0"/><stop offset="1" stop-color="#ffe08a"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#h)" opacity=".7"/>`), blend: "soft-light" },
  { input: svg(`<defs><linearGradient id="c" x1="0" y1="0" x2="1" y2="1">
    <stop stop-color="#fff6d8"/><stop offset=".22" stop-color="#e9b94a"/><stop offset=".45" stop-color="#fdfbff"/>
    <stop offset=".62" stop-color="#d8c6ff"/><stop offset=".8" stop-color="#f0c766"/><stop offset="1" stop-color="#fffaf0"/></linearGradient></defs>
    <rect x="9" y="9" width="${largeur - 18}" height="${hauteur - 18}" rx="46" fill="none" stroke="url(#c)" stroke-width="12"/>
    <rect x="17" y="17" width="${largeur - 34}" height="${hauteur - 34}" rx="40" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>`) },
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
            <linearGradient id="verre" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff" stop-opacity=".72"/><stop offset="1" stop-color="#fff" stop-opacity=".34"/></linearGradient>
            <linearGradient id="reflet" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
          </defs>
          <rect x="289" y="65" width="483" height="109" rx="54" fill="url(#verre)" stroke="#fff" stroke-opacity=".9" stroke-width="3"/>
          <rect x="330" y="69" width="400" height="3" rx="1.5" fill="url(#reflet)"/>
          <text x="530" y="123" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif"
            font-size="44" font-weight="900" font-style="italic" fill="#4a2a86">✦ CHROMATIQUE</text>` : ""}`);
      await fond.resize(largeur, hauteur).composite([
        ...(chromatique ? holo : []),
        { input: ombre },
        { input: visuel.data, left, top },
        { input: texte },
      ]).webp({ quality: 78, effort: 5 }).toFile(path.join(sortie, `${guide}-${exercice}-${rarete}.webp`));
    }
  }
}

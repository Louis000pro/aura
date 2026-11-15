import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { mouvements, raretes } from "../src/lib/cartesBooster.ts";

const largeur = 820;
const hauteur = 1290;
const dossier = "public/boosters";
const sortie = path.join(dossier, "cartes-completes-v1");
const svg = contenu => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${largeur}" height="${hauteur}">${contenu}</svg>`);
const position = (pourcent, dimension) => Math.round(pourcent * dimension / 100);

await mkdir(sortie, { recursive: true });

for (const [exercice, [nom, pose, illustrationSasha]] of Object.entries(mouvements)) {
  for (const guide of illustrationSasha ? ["nora", "sasha"] : ["nora"]) {
    const source = guide === "sasha"
      ? `public/premiers-pas/m-${exercice}-2.webp`
      : path.join(dossier, "nora", `${exercice}.webp`);
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
      if (exercice === "crunch" && rarete !== "chromatique") continue;
      const chromatique = rarete === "chromatique";
      const or = rarete === "legendaire";
      const fond = sharp(path.join(dossier, "cartes-prisme", `${chromatique ? "epique" : rarete}.webp`));
      if (chromatique) fond.modulate({ hue: -32, saturation: .64 });
      const texte = svg(`
        <text x="410" y="752" text-anchor="middle" dominant-baseline="middle"
          font-family="Arial, sans-serif" font-size="${nom.length > 15 ? 46 : 65}" font-weight="900"
          font-style="italic" fill="${or ? "#fff" : "#35165e"}">${nom.toLocaleUpperCase("fr-FR")}</text>
        ${chromatique ? `<defs><linearGradient id="badge"><stop stop-color="#65589e"/><stop offset=".42" stop-color="#5e2c87"/><stop offset="1" stop-color="#237681"/></linearGradient></defs>
          <rect x="289" y="65" width="483" height="109" rx="54" fill="url(#badge)" stroke="#fff" stroke-width="4"/>
          <text x="530" y="123" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif"
            font-size="44" font-weight="900" font-style="italic" fill="#fff">✦ CHROMATIQUE</text>` : ""}`);
      await fond.resize(largeur, hauteur).composite([
        { input: ombre },
        { input: visuel.data, left, top },
        { input: texte },
      ]).webp({ quality: 78, effort: 5 }).toFile(path.join(sortie, `${guide}-${exercice}-${rarete}.webp`));
    }
  }
}

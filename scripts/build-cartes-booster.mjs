import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { mouvements, raretes } from "../src/lib/cartesBooster.ts";

const largeur = 820;
const hauteur = 1290;
const dossier = "public/boosters";
const sortie = path.join(dossier, "cartes-completes-v1");
const args = process.argv.slice(2);
const guides = args.filter(a => !a.startsWith("--"));
// `--rarete=chromatique` ne refait que cette rareté (les autres images restent telles quelles).
const seule = args.find(a => a.startsWith("--rarete="))?.slice(9);
if (guides.some(guide => guide !== "sasha" && guide !== "nora")) {
  throw new Error("Guides acceptés : nora, sasha");
}
const anciensVisuelsSasha = new Set(["pompes", "fentes", "squat"]);
const svg = contenu => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${largeur}" height="${hauteur}">${contenu}</svg>`);
const position = (pourcent, dimension) => Math.round(pourcent * dimension / 100);

await mkdir(sortie, { recursive: true });

// La carte chromatique a son propre fond, la légendaire passée à l'or avec son film irisé et
// son badge (`scripts/build-fond-chromatique.mjs`, à relancer avant ce script si on le change).
// Ici on ne pose que la lumière derrière le personnage et le nom en blanc cerclé d'or.
const soleil = svg(`<defs><radialGradient id="s" cx="50%" cy="30%" r="34%"><stop stop-color="#fff" stop-opacity=".75"/><stop offset=".5" stop-color="#fff6d0" stop-opacity=".3"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
  <rect width="100%" height="100%" fill="url(#s)"/>`);

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
      if (seule && rarete !== seule) continue;
      if (guide === "nora" && exercice === "crunch" && rarete !== "chromatique") continue;
      const chromatique = rarete === "chromatique";
      const or = rarete === "legendaire";
      const fond = sharp(path.join(dossier, "cartes-prisme", `${rarete}.webp`));
      const texte = svg(`
        <text x="410" y="752" text-anchor="middle" dominant-baseline="middle"
          font-family="Arial, sans-serif" font-size="${nom.length > 15 ? 46 : 65}" font-weight="900"
          font-style="italic" fill="${or || chromatique ? "#fff" : "#35165e"}"
          ${chromatique ? `stroke="#8a5208" stroke-width="9" stroke-linejoin="round" paint-order="stroke"` : ""}>${nom.toLocaleUpperCase("fr-FR")}</text>`);
      await fond.resize(largeur, hauteur).composite([
        ...(chromatique ? [{ input: soleil, blend: "screen" }] : []),
        { input: ombre },
        { input: visuel.data, left, top },
        { input: texte },
      ]).webp({ quality: 78, effort: 5 }).toFile(path.join(sortie, `${guide}-${exercice}-${rarete}.webp`));
    }
  }
}

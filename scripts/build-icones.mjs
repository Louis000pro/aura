// Régénère les icônes de Vaiiya depuis le logo (`public/logo-vaiiya.png`).
//
// Deux familles, et ce n'est pas la même chose :
// - l'onglet du navigateur (48, 96, favicon.ico) : fond TRANSPARENT, le V
//   remplit presque tout le carré, sinon il devient un point illisible ;
// - l'écran d'accueil du téléphone (180, 192, 512) : fond BLANC, parce
//   qu'iOS remplit la transparence en noir, et le V à 74 % de la largeur
//   pour rester dans la zone sûre d'une icône masquable (cercle de 80 %).
// L'ancienne icône 48 portait deux bandes noires cuites dans l'image.
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const logo = await sharp("public/logo-vaiiya.png").trim({ threshold: 10 }).png().toBuffer();

async function icone(taille, part, fond) {
  const l = Math.round(taille * part);
  const v = await sharp(logo).resize({ width: l, height: l, fit: "inside", kernel: "lanczos3" }).toBuffer();
  const m = await sharp(v).metadata();
  return sharp({ create: { width: taille, height: taille, channels: 4, background: fond } })
    .composite([{ input: v, left: Math.round((taille - m.width) / 2), top: Math.round((taille - m.height) / 2) }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const VIDE = { r: 0, g: 0, b: 0, alpha: 0 };
const BLANC = { r: 255, g: 255, b: 255, alpha: 1 };

writeFileSync("public/icons/icon-48.png", await icone(48, 0.94, VIDE));
writeFileSync("public/icons/icon-96.png", await icone(96, 0.94, VIDE));
writeFileSync("public/icons/apple-touch-icon.png", await icone(180, 0.74, BLANC));
writeFileSync("public/icons/icon-192.png", await icone(192, 0.74, BLANC));
writeFileSync("public/icons/icon-192x192.png", await icone(192, 0.74, BLANC));
writeFileSync("public/icons/icon-512.png", await icone(512, 0.74, BLANC));

// favicon.ico : un conteneur ICO qui embarque deux PNG (32 et 48).
const pngs = [await icone(32, 0.94, VIDE), await icone(48, 0.94, VIDE)];
const tete = Buffer.alloc(6); tete.writeUInt16LE(0, 0); tete.writeUInt16LE(1, 2); tete.writeUInt16LE(pngs.length, 4);
let decalage = 6 + 16 * pngs.length;
const entrees = pngs.map((p, i) => {
  const e = Buffer.alloc(16); const t = [32, 48][i];
  e.writeUInt8(t, 0); e.writeUInt8(t, 1); e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
  e.writeUInt32LE(p.length, 8); e.writeUInt32LE(decalage, 12); decalage += p.length; return e;
});
const ico = Buffer.concat([tete, ...entrees, ...pngs]);
writeFileSync("public/favicon.ico", ico);
writeFileSync("src/app/favicon.ico", ico);
console.log("icônes régénérées");

// Montre chaque élément de premier niveau d'un emoji Fluent, numéroté, pour choisir quoi retirer.
// node dissequer.mjs <sortie.png> nom1 nom2 …
import sharp from "sharp";
import { lireFluent, elements, seulementIndices } from "./fluent.mjs";
const [sortie, ...noms] = process.argv.slice(2);
const W = 92, rows = [];
for (const nom of noms) {
  const svg = lireFluent(nom);
  const els = elements(svg);
  const cells = [svg, ...els.map((_, i) => seulementIndices(svg, [i]))];
  rows.push({ nom, cells });
}
const C = Math.max(...rows.map((r) => r.cells.length));
const comps = [];
for (let y = 0; y < rows.length; y++) {
  const r = rows[y];
  for (let x = 0; x < r.cells.length; x++) {
    const img = await sharp(Buffer.from(r.cells[x]), { density: 200 }).resize(72, 72).png().toBuffer();
    comps.push({ input: img, left: x * W + 10, top: y * 100 + 4 });
    const t = x === 0 ? r.nom.slice(0, 12) : String(x - 1);
    comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="18"><text x="${W / 2}" y="13" font-family="Arial" font-size="12" text-anchor="middle" fill="#222">${t}</text></svg>`), left: x * W, top: y * 100 + 78 });
  }
}
await sharp({ create: { width: C * W, height: rows.length * 100, channels: 4, background: "#F4F1F8" } }).composite(comps).png().toFile(sortie);
console.log("→", sortie);

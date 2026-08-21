#!/usr/bin/env node
/*
  Vérifie que chaque mission du catalogue a bien son pictogramme dans
  `public/`.

  Pourquoi un script : une image manquante ne casse ni le typecheck ni le
  build, elle se voit seulement à l'écran, en production, sous la forme d'un
  carré vide de 42 px à côté d'une mission par ailleurs correcte. C'est
  exactement le genre d'oubli qui survit trois semaines.

  Usage : npm run check:missions
*/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(racine, "src/lib/aura.ts"), "utf8");

/* On lit le catalogue au texte plutôt que de l'importer : ce script tourne
   sans build TypeScript, et le couple `id` / `image` suffit.

   ⚠️ On DÉCOUPE d'abord le bloc `MISSIONS`. Le même fichier contient `RANGS`,
   dont les entrées portent elles aussi un `id` puis une `image` : une regex
   lâchée sur le fichier entier appariait le premier `id` d'un rang avec le
   premier pictogramme de mission, et annonçait « bronze » là où il fallait
   lire « connexion ». */
const bloc = source.slice(source.indexOf("export const MISSIONS: Mission[] = ["));
const catalogue = bloc.slice(0, bloc.indexOf("\n];"));

const missions = [...catalogue.matchAll(/id: "(\w+)",[\s\S]*?image: "([^"]+)"/g)]
  .map(([, id, image]) => ({ id, image }));

if (missions.length === 0) {
  console.error("✖ Aucune mission trouvée dans src/lib/aura.ts, le format a changé ?");
  process.exit(1);
}

const manquants = [];
for (const mission of missions) {
  const fichier = path.join(racine, "public", mission.image);
  const present = fs.existsSync(fichier);
  console.log(`${present ? "  ok  " : "MANQUE"}  ${mission.id.padEnd(18)} ${mission.image}`);
  if (!present) manquants.push(mission);
}

console.log("");
if (manquants.length === 0) {
  console.log(`✓ ${missions.length} missions, ${missions.length} pictogrammes présents.`);
  process.exit(0);
}

console.error(`✖ ${manquants.length} pictogramme(s) manquant(s) sur ${missions.length}.`);
console.error("");
console.error("Déposer les fichiers exactement à ces chemins (WebP, 84×84 px");
console.error("pour rester net sur les écrans à densité double) :");
for (const mission of manquants) console.error(`   public${mission.image}`);
process.exit(1);

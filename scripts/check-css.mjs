/* ════════════════════════════════════════════════════════════════════
   check-css · UN NOM DE CLASSE N'APPARTIENT QU'À UNE SECTION.

   Posé le 2026-10-19, après un défaut que rien d'autre n'attrapait.
   En ajoutant l'escalier de lumière au héros de la vitrine, la classe a
   été nommée `.escalier` — un nom que l'escalier des six rangs portait
   DÉJÀ, 390 lignes plus bas dans le même module. Un module CSS n'a qu'un
   espace de noms : les deux blocs se sont fondus, et comme le second ne
   redisait pas `position`, l'`absolute` du premier s'est appliqué à la
   liste des rangs. Elle est sortie du flux et s'est posée par-dessus son
   propre titre, illisible.

   ⚠️ CE DÉFAUT PASSE TOUS LES AUTRES CONTRÔLES. Le typecheck compile, le
   build réussit, le lint ne dit rien, et `s.escalier` existe bel et bien
   des deux côtés. Il ne se voit QU'À L'ÉCRAN, sur une section qu'on n'a
   pas rouverte — ici elle est restée cassée en production une journée.

   ⚠️ ET LE CRITÈRE N'EST PAS « DEUX FOIS LE MÊME SÉLECTEUR », qui est une
   écriture parfaitement normale : trois modules du produit complètent une
   classe quelques lignes plus bas (`.eclat`, `.sousFerme`, `.chemin`),
   et les refuser ferait échouer du code sain. Ce qui distingue une
   collision d'un complément, c'est la DISTANCE : les compléments vivent
   à moins de 25 lignes, dans la même section ; deux sections qui se
   disputent un nom sont séparées par des centaines de lignes.
   ════════════════════════════════════════════════════════════════════ */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RACINE = "src";
/* Au-delà, deux blocs du même nom ne sont plus un complément : ce sont
   deux sections différentes. Mesuré sur le produit : les compléments
   légitimes vivent à 4, 9 et 22 lignes ; la collision était à 390. */
const DISTANCE = 60;

const fichiers = [];
(function marcher(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) marcher(p);
    else if (p.endsWith(".module.css")) fichiers.push(p);
  }
})(RACINE);

const fautes = [];
let blocs = 0;

for (const f of fichiers) {
  const lignes = readFileSync(f, "utf8").split("\n");
  /* Seulement les blocs en colonne 0 : un sélecteur indenté vit dans une
     media query ou une imbrication, où redire la même classe EST le but. */
  const vus = new Map();
  lignes.forEach((ligne, i) => {
    const m = ligne.match(/^(\.[a-zA-Z][a-zA-Z0-9_-]*)\s*\{/);
    if (!m) return;
    blocs++;
    const precedent = vus.get(m[1]);
    if (precedent !== undefined && i - precedent > DISTANCE) {
      fautes.push(
        `${relative(".", f)}:${i + 1} · \`${m[1]}\` est déjà déclarée ligne ${precedent + 1}, ` +
          `${i - precedent} lignes plus haut : deux sections se disputent ce nom`
      );
    }
    vus.set(m[1], i);
  });
}

if (fautes.length) {
  console.error(`\n✗ ${fautes.length} collision(s) de nom de classe :\n`);
  for (const f of fautes) console.error("  " + f);
  console.error(
    "\nUn module CSS n'a qu'un espace de noms. Donne à la nouvelle classe un nom\n" +
      "à elle : la section qui portait ce nom la première le garde.\n"
  );
  process.exit(1);
}
console.log(`✓ aucun nom de classe partagé entre deux sections : ${blocs} blocs, ${fichiers.length} modules.`);

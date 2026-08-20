# Les gemmes des rangs (l'aura)

**Ces fichiers sont générés. Ne pas les remplacer à la main.**

Source unique des chemins : `RANGS` dans `src/lib/aura.ts`. Personne d'autre
n'écrit un chemin `/rangs/…` (la landing et le popup de nouveautés le faisaient,
ils dérivent maintenant de ce tableau).

## Mettre à jour un visuel

1. déposer la planche dans `rangs-src/rank-0N-<id>.png` (dossier gitignoré,
   comme `guides-src/` pour les personnages) ;
2. `npm run rangs` (`-- --check` mesure sans rien écrire) ;
3. **regarder les six sur fond NOIR.** C'est le seul contrôle qui compte : un
   trou dans une facette pâle est invisible sur fond blanc, et c'est exactement
   ce qui est passé deux fois le 2026-08-20.

Le script `scripts/build-rangs.mjs` fait trois choses que le CSS ne peut pas
faire, et son en-tête explique le détail :

- **il détoure**. Les planches livrées le 2026-08-20 sont arrivées opaques, fond
  crème cuit dans l'image. Sans détourage, chaque badge pose un carré crème
  derrière lui en mode sombre, sur les douze surfaces qui l'affichent ;
- **il ramène les six à la même échelle**. Dans les planches brutes la gemme
  occupe 74 % de la hauteur pour le Bronze et 96 % pour l'Éternel : affichées à
  hauteur égale, elles sauteraient de taille le long de l'échelle ;
- **il symétrise**. Les six emblèmes sont symétriques, le détourage ne l'était
  pas : sur le Bronze un défaut du contour laissait le remplissage entrer dans
  une paume et pas dans l'autre. Le script rend à chaque côté ce que son miroir
  a gardé (il ajoute, il ne retire jamais) ;
- **il retire le vide**. La gemme n'occupait que 44 % de la largeur, donc à
  18 px dans une ligne de conversation il restait environ 8 px de dessin.

Contrat de sortie : **320 × 512, fond transparent, dessin à 492 px de haut,
centré**. `GemmeRang` connaît ce ratio (`RATIO_GEMME`) et rien d'autre. Le
script **refuse** d'écrire plutôt que de rogner en silence.

Si un fichier manque ou ne charge pas, `GemmeRang` retombe sur un rendu SVG :
aucune image cassée, jamais.

## Ce qu'il faut savoir avant de commander une nouvelle planche

Ces six-là sont **difficiles à détourer, et c'est la planche qui en est cause** :
le fond crème est aussi une couleur du dessin. Mesuré sur l'Éternel, fond à
`250,244,241` : un reflet d'aile est à `255,252,251` (plus clair que le fond) et
un filigrane doré à `252,245,224`. Aucune règle de couleur ne peut les
distinguer, à aucun seuil.

Conséquence assumée, écrite dans le script : le détourage penche du côté
**« il peut rester du fond, il ne mange jamais de dessin »**. Le crème reste donc
en fond de coupe dans les paumes du Bronze et de l'Or, des deux côtés depuis la
passe de symétrie. Choix de Louis le 2026-08-20, en voyant le Bronze : plutôt
que de creuser pour l'enlever, on le rend égal des deux côtés, ce qui donne le
rendu de l'Or. Une asymétrie se voit de loin, une couleur de fond non.

Pour une future planche, demander **un PNG déjà transparent**, ou à défaut un
**fond franchement coloré** (vert ou bleu saturé) : le problème disparaît à la
source au lieu d'être arbitré dans le script.

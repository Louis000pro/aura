# Les gemmes des rangs (l'aura)

**Ces fichiers sont générés. Ne pas les remplacer à la main.**

Source unique des chemins : `RANGS` dans `src/lib/aura.ts`. Personne d'autre
n'écrit un chemin `/rangs/…` (la landing et le popup de nouveautés le faisaient,
ils dérivent maintenant de ce tableau).

## Mettre à jour un visuel

1. déposer la planche dans `rangs-src/rank-0N-<id>.png` (dossier gitignoré,
   comme `guides-src/` pour les personnages) ;
2. `npm run rangs` (`-- --check` mesure sans rien écrire) ;
3. **regarder les six sur fond NOIR, de près, bords et creux compris.** C'est le
   seul contrôle qui compte : un halo blanc ou un trou dans une facette pâle ne
   se voient pas sur fond blanc, et c'est exactement ce qui est passé.

Le script `scripts/build-rangs.mjs` fait ce que le CSS ne peut pas faire, et son
en-tête explique le détail :

- **il détoure**. Les planches livrées le 2026-08-20 sont arrivées opaques, fond
  crème cuit dans l'image ;
- **il ramène les six à la même échelle** : 320 × 512, dessin de 492 px de haut ;
- **il retire le vide** autour du dessin, pour qu'une gemme de 18 px dans une
  ligne de conversation reste lisible.

## Le détourage, version 3 (2026-10-24)

La version 2 laissait, sur fond sombre, un **halo blanc dentelé** autour du
Diamant et de l'Éternel (leur lueur, plus claire que le fond, était gardée), un
**liseré crème** le long des bords du Bronze, de l'Argent et de l'Or (leur ombre
portée, raide et teintée de chaud) et du **crème dans les creux** entre le
cristal et les ailes.

La règle de la v3 tient en une phrase : **le fond est lisse, le dessin a un
bord.** Le fond, la lueur et l'ombre portée sont des dégradés doux ; l'emblème
est cerné d'un trait net. Un pixel est du fond s'il est relié au bord de l'image
par un chemin de pixels lisses (gradient sous un seuil). Tout ce que ce
remplissage n'atteint pas est gardé, quelle que soit sa couleur : c'est ce qui
protège les facettes pâles du Platine et du Diamant.

- seuil **18** pour le Bronze, l'Argent et l'Or (ombre raide jusqu'à 14, trait à
  55 et plus) ;
- seuil **8** pour le Platine, le Diamant et l'Éternel (trait le plus pâle à 14,5 ;
  à 11 l'Éternel perd déjà le cadre de son cristal) ;
- les fuites de moins de 5 px de large sont coupées, les miettes d'ombre
  détachées sont retirées ;
- les deux derniers pixels du bord sont **démêlés** (alpha partiel et couleur du
  dessin seul) au lieu d'être gardés avec leur crème.

Contrôles faits le 2026-10-24 : les six sur noir, violet et blanc, zooms sur
chaque bord et chaque creux, aux tailles de l'app (18 à 150 px), et aucun pixel
transparent enfermé dans le dessin.

Si un fichier manque ou ne charge pas, `GemmeRang` retombe sur un rendu SVG :
aucune image cassée, jamais.

## Ce qu'il faut savoir avant de commander une nouvelle planche

Ces six-là sont **difficiles à détourer, et c'est la planche qui en est cause** :
le fond crème est aussi une couleur du dessin (un reflet d'aile de l'Éternel est
même plus clair que le fond), et deux d'entre elles portent une lueur blanche
sur ce même crème.

Pour une future planche, demander **un PNG déjà transparent, sans lueur ni ombre
portée**, ou à défaut un **fond franchement coloré** (vert ou bleu saturé). Le
problème disparaît alors à la source au lieu d'être arbitré dans le script.

# La charte d'humanisation

Écrite le 2026-08-31. Elle vaut pour tout agent qui touche à l'interface ou à la
copie de Vaiiya. Elle ne remplace pas `AGENTS.md`, elle s'y ajoute.

## Le diagnostic, en chiffres

Mesuré sur `src/` avant le chantier :

- **33 tailles de texte distinctes**, et les six plus fréquentes sont toutes sous
  16 px : 749 occurrences en dessous de 16 px contre 90 au-dessus de 20 px.
  Ce n'est pas une hiérarchie, c'est un aplatissement. Rien ne commande l'écran,
  donc l'oeil ne sait pas où se poser, donc tout se ressemble.
- **`font-semibold` 425 fois**, contre 10 `font-normal`. Une seule graisse pour
  dire « ceci compte » : quand tout est en demi-gras, plus rien n'est en gras.
- **`rounded-2xl` 318 fois et `rounded-full` 360 fois.** Un seul rayon, une seule
  forme, un seul rythme vertical : la signature exacte d'une page générée.
- **157 points d'exclamation** dans du texte d'interface, des emojis dans les
  titres.

Ces quatre chiffres sont le sujet. Le reste en découle.

## Les six règles

### 1. La hiérarchie se fait par le CONTRASTE, pas par la nuance

Un écran premium a deux ou trois niveaux, très écartés, et rien entre les deux.
Un écran généré a huit niveaux séparés d'un pixel chacun.

Utiliser les classes de `globals.css` (elles portent la police de titrage et la
bonne graisse), jamais une taille inventée :

| classe | emploi | rendu |
| --- | --- | --- |
| `.vy-display` | le chiffre ou le mot qui EST l'écran. Un par écran, jamais deux. | très grand, titrage, serré |
| `.vy-titre` | titre de page, titre de section forte | grand, titrage |
| `.vy-sous` | titre de bloc à l'intérieur d'un écran | moyen, sans-serif |
| `.vy-corps` | la phrase qu'on lit | 15 px, interligne large |
| `.vy-label` | l'étiquette qui nomme une donnée | petit, discret, jamais en capitales étirées |

Interdit : plus d'une `.vy-display` par écran. Interdit : une taille en dur
entre 16 et 30 px quand une de ces classes fait l'affaire.

### 2. Le gras se mérite

Par défaut le texte est en `font-normal`. `font-semibold` est réservé à ce qui
doit ressortir DANS un bloc déjà calme. Si trois éléments voisins sont en
semibold, aucun des trois ne ressort : en garder un.

Un chiffre n'a pas besoin d'être gras pour être vu, il a besoin d'être GRAND.

### 3. Casser le rythme de la carte

Trois cartes identiques empilées, c'est une liste déguisée. Selon le contenu :

- une **liste à filets** (`border-b` d'un pixel) quand les éléments sont de même
  nature et se comparent. Une carte par ligne, c'est du bruit.
- une **carte** quand l'élément est autonome et qu'on peut agir dessus.
- **rien du tout** (du texte posé sur le fond) quand c'est une phrase.

Ne jamais poser une carte autour d'une phrase : c'est le geste no-code par
excellence. Un bloc n'a pas besoin d'un contour pour exister.

Rayons : `rounded-2xl` reste le défaut des cartes. Les petites surfaces
(pastilles, puces, champs) descendent à `rounded-xl` ou `rounded-lg`. Une forme
qui varie avec la taille, c'est de l'optique, pas de la décoration.

### 4. La copie dit un fait, jamais une émotion à la place du lecteur

- **Aucun point d'exclamation.** Aucun. Il met dans la bouche du lecteur un
  enthousiasme qu'il n'a pas forcément.
- **Aucun emoji dans un titre, un bouton ou une étiquette.** Les emojis
  fonctionnels déjà en place restent (la flamme de la série, l'étincelle de la
  marque).
- **Aucun tiret cadratin.** Règle permanente du projet. Une virgule, un point,
  deux points ou une parenthèse font le travail.
- **Ne pas décrire ce que l'écran montre déjà.** Sous une liste de séances,
  « Voici tes séances » n'apprend rien. Supprimer.
- **Pas de voix marketing** : « découvre », « booste », « optimise », « profite
  de », « en un clic », « et bien plus encore ». Dire la chose.
- **Pas de superlatif sur le produit** : ni auto-critique, ni auto-félicitation
  (règle verrouillée du récap de mise à jour).
- Phrases courtes. Une idée par phrase. Le doute s'écrit (« on ne sait pas
  encore »), il ne se maquille pas en certitude.
- **Zéro culpabilisation** : on décrit ce qui est, jamais ce qui manque. « Trois
  séances cette semaine » et non « il te manque deux séances ».

### 5. La typographie française se respecte

- Apostrophe typographique **’**, jamais `'`. (`aujourd’hui`, `l’étincelle`)
- Espace **insécable** avant `; : ! ?` et à l'intérieur des guillemets
  français **« … »**. En JSX : `{" "}` ou l'entité `&nbsp;`.
- Capitales accentuées : `À`, `É`, `Ê`.
- Unités : espace insécable entre le nombre et l'unité (`12 min`, `2,5 kg`),
  virgule décimale, jamais de point.
- Pas de capitales étirées façon `LETTER-SPACING` sur des mots français, ça
  casse les accents et ça sonne « dashboard ».

### 6. Simplifier ce qu'on traverse

Quand on passe dans un fichier, on emporte ce qui est mort : état inutilisé,
prop jamais lue, branche inatteignable, valeur recopiée d'un fichier voisin,
composant local de trois lignes utilisé une fois. On ne refactore PAS pour le
plaisir : on ne touche qu'à ce qu'on lisait déjà.

## Ce qui ne se touche pas

- **Le système D** : violet = action, orange = énergie, teal = corps et
  réussite. Une couleur a un sens, partout, et un seul.
- **Les encres** pour le texte coloré : `--or-encre`, `--exp-encre`,
  `--feu-encre`, `--teal-encre`. Le violet `--accent` et l'or `--gold` sont
  DÉCORATIFS et ne portent jamais un mot à lire.
- **Aucune couleur de surface ou de texte en dur.** Que des jetons, sinon le
  mode sombre casse. C'est le bug qui a rendu un profil illisible pendant un an.
- **Toute parole de Guide passe par `src/lib/guides.ts`.** Jamais une phrase de
  Nora ou Sasha écrite dans un composant. Les libellés d'interface, eux, restent
  dans le composant.
- **Les photos de contenu restent naturelles** : zéro teinte, zéro pastille.
- **Aucune fonctionnalité ajoutée, aucune retirée.** On change la forme et les
  mots, pas ce que l'application fait.
- **Aucune migration SQL, aucune requête modifiée.**
- Les refus produit tiennent : pas de fil d'activité, pas de classement, pas de
  suggestion d'inconnu, pas de statut « en ligne ».

## Vérification

`npx tsc --noEmit` doit passer. Ne PAS lancer `npm run build` (un seul agent le
lance à la fin). Ne PAS utiliser git.

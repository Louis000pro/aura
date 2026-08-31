# Recherche : sortir du rendu « généré par IA »

Recherche web menée le 2026-08-31, sources croisées (3 minimum par question).
Ce fichier est la **base de preuves** derrière `docs/humanisation-charte.md`.
La charte dit quoi faire ; celui-ci dit pourquoi, avec les sources, et couvre
cinq points que la charte ne traite pas encore : le dosage du violet, les
chiffres, l’élévation, le mouvement, et les caractères Unicode exacts.

---

## 1. Les signes qui font « site généré par IA »

### Le constat de fond

Les sources convergent sur une seule cause : un modèle ne choisit pas, il rend
**la moyenne statistique** de ce qu’il a vu. Chaque « décision » visuelle est en
réalité une absence de décision. D’où une empreinte reconnaissable, décrite en
termes quasi identiques par des auteurs indépendants.

### Les tells, vérifiables dans du code

| Tell | Signature technique |
| --- | --- |
| **Dégradé indigo vers violet** | Cité comme « le tell le plus bruyant de 2026 ». Vient de `indigo-500` de Tailwind (2019), puis boucle de rétroaction dans les données d’entraînement. `from-indigo-500 to-purple-600` |
| **Inter (ou Geist, ou system-ui)** | « La réponse la plus sûre possible » : signale un défaut non choisi, pas une marque |
| **Trois cartes arrondies en rangée** | Rayon uniforme, ombre douce, icône filaire en haut de chacune |
| **Rayon unique partout** | `border-radius: 0.5rem` appliqué à tout, quelle que soit la taille de la surface |
| **Icônes filaires génériques** | Interchangeables, une par carte, sans rapport avec le contenu |
| **Section héros centrée** | Fond sombre, voile en dégradé, titre en dégradé de texte |
| **Ombres douces basse opacité** | Partout, à la même valeur |
| **Étiquette « eyebrow »** | Capitales, point en préfixe, filet en suffixe |
| **Halo coloré sur fond sombre** | Lueur derrière les cartes et les boutons |
| **Animations d’entrée en cascade** | Un auteur en compte plus de 12 par page générée |
| **Copie sans poids** | « Build faster. Ship smarter. » : correct, et ne dit rien du produit |
| **Emojis, points d’exclamation, triades** | Sur le texte : structure trop propre, listes à puces systématiques, « ce n’est pas seulement X, c’est aussi Y » |

### Ce que ça implique pour Vaiiya, et c’est inconfortable

Le violet de la marque, `#A78BFA`, **est exactement `violet-400` de Tailwind**,
et `#8B5CF6` est exactement `violet-500`. Le dégradé violet vers magenta de la
marque est donc, littéralement, le tell numéro un de la liste ci-dessus. Geist
est la police de Vercel, citée parmi les défauts des outils de génération.
Les icônes lucide sont le jeu par défaut de shadcn/ui.

**La conclusion n’est PAS de déverrouiller le système D.** Une couleur de marque
n’est pas le problème ; sa **dose** l’est. Linear tient tout son rendu premium
avec un seul accent, `#5e6ad2`, un lavande-bleu très proche du nôtre. La
différence tient en une phrase de leur documentation : l’accent apparaît sur la
marque, l’anneau de focus et quelques CTA, **jamais en décoration**, jamais en
remplissage de section, jamais en dégradé d’ambiance. C’est exactement le sens
déjà écrit dans `AGENTS.md` (« le violet est TOUJOURS l’action ») mais qui se
perd dès qu’un dégradé violet sert de fond à un bloc.

Deuxième levier, cité par plusieurs sources sur shadcn : ajouter **un seul jeton
que le kit n’a pas** (un grain, une ombre signature, une courbe d’easing propre,
un traitement de filet inhabituel) suffit à donner une empreinte qui distingue
un projet personnalisé d’un projet resté au défaut.

**Sources :**
[925studios, les tells](https://www.925studios.co/blog/ai-slop-design-tells) ·
[solodesign, AI design slop](https://solodesign.cc/blog/ai-design-slop-the-tells/) ·
[dev.to, blame Tailwind indigo-500](https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p) ·
[Shuffle, why AI websites look the same](https://shuffle.dev/blog/2026/01/why-do-most-ai-generated-websites-look-the-same/) ·
[freedesignmd, le piège shadcn](https://freedesignmd.com/blog/shadcn-looks-generic) ·
[The Algorithmic Bridge, 10 signes d’écriture IA](https://www.thealgorithmicbridge.com/p/10-signs-of-ai-writing-that-99-of)

---

## 2. Ce qui fait qu’une interface est perçue comme premium

### Les invariants, communs à Stripe, Linear et Vercel

1. **La typographie EST la marque.** Une seule famille, une échelle systémique.
   La changer casse immédiatement la cohérence.
2. **Retenue chromatique.** Surtout des neutres, plus un accent mesuré. La
   couleur porte du **sens** (danger, réussite), jamais de la décoration.
3. **La densité est dans le comportement, pas dans les pixels.** Un écran
   premium n’est pas plus rempli, il est plus réactif.
4. **Six micro-états par élément** : défaut, survol, focus clavier, actif,
   désactivé, chargement. Chacun décidé, pas subi.
5. **Le mouvement est un système** : un jeu de durées (environ 150 / 200 /
   300 ms) et une famille de courbes, appliqués partout. `ease-out` à l’entrée,
   `ease-in` à la sortie. Jamais les transitions par défaut du navigateur sur
   quelque chose que l’utilisateur voit vingt fois par jour.

### L’échelle typographique de Linear, comme étalon

C’est la donnée la plus directement transposable. À retenir surtout : **l’écart
entre les niveaux** et le **crénage négatif qui augmente avec la taille**.

| Rôle | Taille | Graisse | Interligne | Approche |
| --- | --- | --- | --- | --- |
| Display XL | 80 px | 600 | 1,05 | -3,0 px |
| Display Md | 40 px | 600 | 1,15 | -1,0 px |
| Titre | 28 px | 600 | 1,20 | -0,6 px |
| Titre de carte | 22 px | 500 | 1,25 | -0,4 px |
| Corps | 16 px | 400 | 1,50 | -0,05 px |
| Corps petit | 14 px | 400 | 1,50 | 0 |
| Légende | 12 px | 400 | 1,40 | 0 |
| Étiquette | 13 px | 500 | 1,30 | **+0,4 px** |

Deux enseignements : la graisse **600 ne dépasse jamais 600** sur le display
(pas de 700+), et le corps de texte est en **400**, pas en 500 ni 600. L’échelle
compte huit niveaux mais ils sont très écartés, ce qui est l’inverse des 33
tailles mesurées dans `src/`.

### L’élévation : pas d’ombres

Linear **n’utilise aucune ombre portée**. La profondeur vient de trois choses :
une échelle de surfaces qui s’éclaircissent par paliers, des **filets d’un
pixel** en couleur neutre basse, et un anneau de focus de 2 px. C’est le point
qui distingue le plus nettement un rendu premium d’un rendu généré, où l’ombre
douce est posée sur tout par défaut.

### Le traitement des chiffres, pour une app de sport

Whoop est le benchmark le plus proche de Vaiiya.

- **Le score principal est rendu à environ 72 pt**, « lisible à bout de bras ».
  Tout le reste du texte est délibérément petit. La hiérarchie se fait par la
  **taille seule**.
- **Trois chiffres, pas plus,** sur l’écran d’accueil. La compression est le
  produit : on répond à une seule question du matin.
- **Trois couleurs fonctionnelles**, seuils constants dans tout le système,
  **zéro couleur d’accent décorative**.
- Le noir de fond a trois fonctions assumées, dont faire ressortir les données.
- Les transitions entre les niveaux de détail conservent le **contexte spatial**.

À cela s’ajoute une règle technique absente de la charte : les chiffres qui
changent (chronomètre, compteur d’EXP, poids, séries) doivent utiliser
`font-variant-numeric: tabular-nums`. Sans ça, chaque digit a une chasse
différente et le nombre **tressaute** à chaque mise à jour. C’est un détail
invisible quand il est bien fait et voyant quand il ne l’est pas.

**Sources :**
[Mantlr, comment Stripe, Linear et Vercel livrent de l’UI premium](https://mantlr.com/blog/stripe-linear-vercel-premium-ui) ·
[Jetons de design Linear (miroir awesome-design-md)](https://github.com/voltagent/awesome-design-md/blob/main/design-md/linear.app/DESIGN.md) ·
[925studios, décomposition du design Whoop](https://www.925studios.co/blog/whoop-design-breakdown) ·
[animations.dev, the easing blueprint](https://animations.dev/learn/animation-theory/the-easing-blueprint) ·
[MDN / font-variant-numeric, chiffres tabulaires](https://loke.dev/blog/css-font-variant-numeric-tabular-nums)

---

## 3. Typographie 2026 : un serif éditorial en titrage ?

### La réponse courte : oui, mais en titrage seulement, et avec des pièges

Les paires les plus citées pour un rendu premium en 2026 :

- **Instrument Serif + une sans neutre** : « élégant, très contrasté pour les
  énoncés héros », donné comme « distinctement 2026 et très peu coûteux ».
- **Fraunces + une sans** : plus chaleureux, plus « ancien style », avec du
  caractère. Quatre axes variables (`opsz`, `wght`, `SOFT`, `WONK`).
- **Newsreader** : dessiné pour la lecture longue à l’écran.
- **Bricolage Grotesque** : expressif, mais c’est une sans, pas un serif.

### Les avis contradictoires, à prendre au sérieux

1. **Le serif est risqué en petit corps sur mobile.** Les empattements
   « deviennent flous ou disparaissent » sur les petits écrans. Le consensus :
   un serif convient aux **titres et à la marque**, pas au corps de texte. Ce
   qui rend un serif lisible en petit, c’est une grande hauteur d’x et des
   ouvertures larges (le modèle cité est Georgia).
2. **Attention au retournement :** une des sources sur les tells IA liste
   explicitement le **« serif appliqué partout sans discernement »** et la
   **vague ambre et crème** comme des signatures IA récentes. Autrement dit, le
   réflexe « j’ajoute un serif chaleureux pour faire humain » est **en train de
   devenir le prochain tell**. Le serif ne sauve rien s’il est appliqué
   mécaniquement ; il fonctionne s’il est réservé à un ou deux endroits par
   écran.

### Contraintes vérifiées en base, pas supposées

J’ai vérifié les métadonnées officielles Google Fonts plutôt que de me fier aux
articles :

- **Instrument Serif : sous-ensembles `latin` et `latin-ext`, donc les accents
  français sont couverts.** Mais il n’existe **qu’en graisse 400**, romain et
  italique. Aucun gras. Il ne peut donc servir que de display, jamais de police
  d’interface, et toute hiérarchie à l’intérieur du titrage devra se faire par
  la **taille**, pas par la graisse.
- **Fraunces : 698 glyphes, support vietnamien complet**, ce qui implique très
  largement le français. Variable, donc un seul fichier pour toutes les graisses.
  C’est l’option la plus souple des deux.

Le choix dépend donc du besoin : si le titrage doit avoir plusieurs graisses,
c’est Fraunces. Si un seul poids de display suffit, Instrument Serif est plus
léger et plus tranchant.

**Sources :**
[METADATA officiel Instrument Serif, dépôt google/fonts](https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentserif/METADATA.pb) ·
[Fraunces, Google Fonts](https://fonts.google.com/specimen/Fraunces/about) ·
[Fontaza, les 4 axes de Fraunces](https://fontaza.com/fraunces-font/) ·
[Mantlr, 40 paires Google Fonts](https://mantlr.com/blog/google-fonts-pairing-cheat-sheet) ·
[Toptal, typographie pour applications mobiles](https://www.toptal.com/designers/typography/typography-for-mobile-apps) ·
[TypeType, meilleures polices pour l’UI mobile](https://typetype.org/blog/10-best-fonts-for-mobile-apps-in-2023/)

---

## 4. Microcopy français : sonner humain

### Les marqueurs d’écriture générée, en français

- **Formules passe-partout** : « Démarrez votre voyage », « Boostez votre
  productivité », « et bien plus encore ».
- **Empathie de formulaire** : « Nous comprenons que cela puisse être
  frustrant. » Personne ne parle comme ça.
- **Verbosité.** Le modèle est naturellement bavard ; la révision humaine coupe.
- **Généricité** : un texte qui « pourrait appartenir à n’importe quelle
  application ». C’est le test décisif. Si la phrase marche pour un autre
  produit, elle ne dit rien du nôtre.
- Structure trop propre : triades, listes systématiques, transitions trop nettes.

L’exemple de réécriture donné par la source est parlant :
« Bienvenue dans votre espace personnel ! Nous sommes ravis de vous compter
parmi nos utilisateurs. » devient « Votre argent, votre contrôle. Bienvenue,
[Prénom]. » Le gain ne vient pas de la longueur, il vient du **fait concret**
mis en avant.

### Les règles d’écriture d’interface en français

- **Verbes d’action sur les boutons** : « Ajouter au panier », « S’inscrire ».
  Le bouton dit ce qu’il fait, pas ce qu’on ressent.
- **Phrases courtes, une idée par phrase**, structurées logiquement.
- **Chaque mot doit avoir un but.** S’il n’apprend rien, il sort.
- **Cohérence de la ponctuation et des majuscules** dans tout le produit.
- **Registre de politesse à fixer une fois** (tutoiement ou vouvoiement) et à ne
  jamais mélanger. Vaiiya tutoie ; c’est acquis.
- Un glossaire contrôlé : un concept, un mot, partout. Vaiiya le fait déjà
  (« Goûter » et jamais « Collation », « EXP » et jamais « aura » à l’écran).

**Sources :**
[La grande Ourse, construire un guide de style UX writing](https://lagrandeourse.design/blog/ux-writing/construire-un-guide-de-style-pour-lux-writing-de-votre-marque/) ·
[UX writing à l’ère de l’IA, garder une voix humaine](https://mpouck.github.io/article-ux-writing-ia-voix-humaine.html) ·
[Usabilis, l’UX writing](https://usabilis.com/ux-writing/) ·
[blog-ux.com, tone of voice](https://blog-ux.com/tone-of-voice-ux-writing/)

---

## 5. Typographie française : les règles ratées par les IA

### Les espaces avant la ponctuation haute

| Signe | Avant | Après |
| --- | --- | --- |
| `;` | fine insécable | espace normale |
| `:` | **insécable pleine** | espace normale |
| `?` | fine insécable | espace normale |
| `!` | fine insécable | espace normale |
| `«` | (rien) puis insécable après | |
| `»` | insécable avant | espace normale |
| `,` `.` | rien | espace normale |

### Les caractères Unicode exacts

- `U+00A0` espace insécable (`&nbsp;`) : pour les **deux-points**, les
  guillemets, et entre un nombre et son unité.
- `U+202F` espace **fine** insécable (`&#8239;`) : théoriquement correcte avant
  `;` `?` `!`.
- `U+2019` apostrophe typographique **’**, jamais `'`.
- `U+00AB` / `U+00BB` guillemets français **« »**, jamais `"`.

**Nuance technique importante,** et c’est la raison pour laquelle cette section
existe : la fine insécable `U+202F` a une **restitution instable** selon le
système, le navigateur et la fonte ; elle est souvent ignorée ou rendue comme
une espace normale. La recommandation pragmatique de la source la plus技术ique
est de ne pas la généraliser. **Position retenue pour Vaiiya : utiliser
`U+00A0` partout où une espace insécable est requise.** Elle est fiable
partout, et l’écart typographique avec la fine est invisible aux tailles de
l’interface. Ne pas mélanger les deux dans le même produit.

### Le reste

- **Capitales accentuées obligatoires** : `À`, `É`, `Ê`, `Ç`. Une capitale non
  accentuée est une faute, pas un choix.
- **Virgule décimale**, jamais le point : `2,5 kg` et non `2.5 kg`.
- **Espace insécable entre le nombre et l’unité** : `12 min`, `70 kg`, `30 EXP`.
- **Pas de tiret cadratin** (`U+2014`). Règle permanente du projet.
- Pas de capitales étirées par `letter-spacing` sur des mots français : ça
  dégrade les accents et ça sonne « tableau de bord ».

**Sources :**
[fvsch, espaces et ponctuation haute sur le web](https://fvsch.com/espaces-ponctuation) ·
[Blog du Modérateur, ponctuation et conventions typographiques](https://www.blogdumoderateur.com/regles-ponctuation-typographie/) ·
[Lingolia, tableau récapitulatif des espaces](https://francais.lingolia.com/fr/atelier-decriture/la-ponctuation/tableau-recapitulatif-des-espaces) ·
[OQLF, espace insécable](https://vitrinelinguistique.oqlf.gouv.qc.ca/fiche-gdt/fiche/8360213/espace-insecable)

---

## Les 10 recommandations, classées par impact

1. **Sortir le violet de la décoration.** Le garder sur l’action, la marque et
   le focus ; retirer tout dégradé violet servant de fond, de voile ou
   d’ambiance. C’est le tell numéro un, et c’est faisable **sans toucher au
   système D**, qui dit déjà que le violet est l’action.
2. **Écarter l’échelle typographique.** Deux ou trois niveaux très distants au
   lieu de 33 tailles. Le chiffre qui compte doit être énorme (modèle Whoop),
   le reste petit.
3. **Repasser le corps de texte en graisse 400.** 425 `font-semibold` contre 10
   `font-normal`, c’est l’aplatissement mesuré dans la charte. Linear met son
   corps en 400 et son display en 600, jamais plus.
4. **Remplacer les ombres par des filets d’un pixel et une échelle de surfaces.**
   L’ombre douce uniforme est un marqueur ; le filet est un marqueur de soin.
5. **Passer tous les chiffres variables en `tabular-nums`.** Chrono, EXP, poids,
   séries. Corrige un tressautement que personne ne sait nommer mais que tout le
   monde perçoit.
6. **Faire varier le rayon avec la taille de la surface.** Un rayon unique sur
   318 cartes est une signature ; un rayon optique est une décision.
7. **Introduire le serif en titrage, avec parcimonie.** Fraunces si plusieurs
   graisses sont nécessaires, Instrument Serif sinon (attention : graisse 400
   uniquement). Une occurrence par écran, jamais sur le corps de texte, sinon on
   remplace un tell par le suivant.
8. **Poser un système de mouvement** : un jeu de durées (150 / 200 / 300 ms),
   `ease-out` à l’entrée, `ease-in` à la sortie, et supprimer les cascades
   d’animations d’entrée.
9. **Appliquer `U+00A0` partout** où le français l’exige, plus l’apostrophe
   typographique et les guillemets français. Ne pas utiliser la fine insécable.
10. **Passer la copie au test de généricité** : si une phrase fonctionnerait
    telle quelle dans une autre application, elle est à réécrire ou à supprimer.

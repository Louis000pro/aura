# Lot SEO 3 · Contrat éditorial des fiches `/exercices`

Ce fichier est **la source de vérité** pour rédiger une fiche d'exercice publique.
Il est versionné dans le repo exprès : les règles ci-dessous ont d'abord vécu dans
la mémoire locale d'un agent, où elles ne survivaient ni à un nouveau chat, ni à un
autre agent, ni à un clone du repo. Décisions de Louis, 2026-08-09.

**À lire avant d'écrire une fiche.** Le code de la donnée est dans
`src/lib/exercicesPublics.ts`, l'affichage dans `src/app/exercices/`.

---

## Le principe central

**Les fiches ne sont pas des variantes d'un même article.**

Le développé couché n'est **pas** un modèle éditorial à recopier. C'est un modèle
**visuel**. Chaque exercice a son vocabulaire, ses étapes, ses erreurs, ses repères,
ses variantes, sa longueur et sa logique propre.

Le test de relecture, à passer sur chaque phrase avant publication :

> Est-ce que cette phrase serait encore utile et crédible si elle n'avait aucun
> intérêt SEO ?

Si non, on la supprime ou on la réécrit.

---

## 1. Répondre tout de suite

Dans les premières phrases, le lecteur doit comprendre ce qu'est le mouvement, son
principe général, et ce qu'il sollicite principalement. Court et concret.

Interdits : « dans le monde de la musculation », « cet exercice incontournable »,
« que tu sois débutant ou confirmé ». Aucun remplissage générique.

Règle de la phrase d'ouverture : elle doit contenir une information qu'on ne
pourrait pas écrire pour un autre exercice. Si elle marche aussi bien pour le squat,
elle est à réécrire.

## 2. Aucun claim absolu

Bannis : meilleur exercice, exercice ultime, mouvement le plus efficace, garantit,
empêche les blessures, parfaitement sûr, travaille uniquement, brûle énormément de
calories, indispensable, convient à tout le monde.

Même règle pour les chiffres biomécaniques trop précis quand ils varient d'une
personne à l'autre. Un angle ou une position se présente comme **un repère
raisonnable** quand c'en est un, jamais comme une loi anatomique.

## 3. La programmation est indicative

`3 × 10, 90 s` n'est jamais **la** façon de faire un exercice. La ligne du héros
porte le libellé **« Exemple »** (déjà en place), et selon le cas on peut dire
« repère de départ » ou « format courant ». Séries, répétitions, repos et durées
dépendent de l'objectif, du niveau et de la séance. Une fiche d'exercice n'est pas
un programme.

### La ligne « Pour » n'existe pas tant qu'il n'y a pas de taxonomie

**Ne pas attribuer de niveau public à un exercice tant que Vaiiya ne possède pas
une taxonomie de difficulté ou de niveau explicitement définie et validée comme
donnée produit. Ne jamais inventer cette valeur fiche par fiche pour remplir le
héros.**

Ce qui s'est passé, pour que la règle ne se redécouvre pas : le champ `niveau` a
été créé dans `exercicesPublics.ts` pour ce chantier, alors qu'aucune donnée de
difficulté n'existe dans `exerciseLibrary.ts` (le type `Raw` n'en a pas de champ).
Cinq fiches sur huit affichaient donc « Débutant à confirmé », c'est-à-dire tout
le monde, et les trois autres portaient un jugement écrit pour la page seule. Sur
les burpees, un mouvement au poids du corps que beaucoup de débutants pratiquent,
« Intermédiaire à confirmé » fermait une porte qu'aucune donnée ne nous autorisait
à fermer.

Le champ existe toujours, facultatif et **utilisé par aucune fiche**, pour le jour
où la taxonomie existera. Le héros est conçu pour s'en passer : `lignesDuHero`
saute la ligne absente, et on ne met **rien** à sa place. Deux lignes qui
informent valent mieux que trois dont une est décorative.

## 4. La structure d'exécution épouse le geste

Ne pas forcer toutes les fiches dans trois étapes identiques. Logiques possibles,
non définitives :

| Exercice | Étapes |
|---|---|
| Développé couché | s'installer · descendre · pousser |
| Gainage | se placer · créer la tension · tenir et respirer |
| Burpees | descendre · passer au sol · revenir · enchaîner |
| Curl haltères | se placer · fléchir le coude · contrôler le retour |
| Soulevé de terre | placer la barre et les appuis · créer la tension · se relever · reposer |

Le champ `gabarit` distingue déjà `mouvement` (un geste qui va et vient) de `tenue`
(une position à tenir). Les 15 exercices de la bibliothèque qui n'ont qu'une seule
pose relèvent du second : leur écrire une « descente » produirait du vide.

## 5. Muscles

Distinguer, quand c'est pertinent, les muscles **principalement sollicités** des
**secondaires ou stabilisateurs**. Ne jamais laisser croire qu'un mouvement
polyarticulaire « isole » un muscle. Les pastilles du héros restent simples, c'est
le texte qui apporte la nuance.

## 6. Erreurs fréquentes

Des erreurs **spécifiques à ce mouvement**. Pas de liste générique recopiée d'une
fiche à l'autre (« aller trop vite », « mauvaise posture », « charge trop lourde »).

Une erreur entre dans la fiche seulement si elle aide réellement à mieux exécuter
**cet** exercice. Pour chacune : nom très court, pourquoi ça pose problème,
correction pratique. Ton calme, concret, non dramatique.

## 7. Variantes

**Jamais de classement automatique « plus facile » / « plus difficile ».** Une
variante n'est pas forcément une progression linéaire, et ce qui est dur dépend de
la personne. On décrit ce qui change : matériel, stabilité, amplitude, position,
charge, coordination, contrainte dominante.

Le champ s'appelle `angle`. Exemples de libellés : *Au poids du corps*, *Avec deux
haltères*, *Sur machine*, *À un bras*, *Avec assistance*, *Sans matériel*.

**Contrainte d'interface liée** : tant qu'une variante n'a pas de fiche publiée, sa
carte garde sa miniature animée mais ne porte **aucun signal d'interactivité** (pas
de flèche, pas de `cursor: pointer`, pas de survol, pas de CTA). Elle devient
cliquable automatiquement le jour où la fiche existe, via `slugDeLExercice()`.

## 8. Sécurité et confort

Un encart sécurité **seulement quand il apporte quelque chose** : pareur ou
sécurités au développé couché, rack au squat lourd, installation propre au soulevé
de terre. Pas d'encart alarmiste sur chaque fiche, sinon plus personne ne le lit.

Ne jamais promettre qu'une technique « protège » ou « sécurise » une articulation.
Préférer : aide à stabiliser, permet de mieux contrôler, reste dans une amplitude
confortable, adapte si une position provoque une douleur inhabituelle.

## 9. « Où le placer dans ta séance »

Cette section explique **une logique**, pas un programme. Un mouvement technique et
chargé se place souvent tôt ; l'isolation vient en général après les mouvements
principaux ; le gainage peut intervenir à plusieurs moments ; les burpees servent
aussi bien de travail cardio que d'élément de circuit.

**Jamais la même phrase sur les huit fiches.**

## 10. Longueur

**Aucun quota.** Le développé couché fait environ 650 mots : ce chiffre n'est pas
une cible et ne doit jamais le devenir. Un curl haltères demandera nettement moins,
un soulevé de terre sans doute davantage. Une fiche s'arrête quand les questions
utiles sont traitées.

## 11. Style Vaiiya

Phrases plutôt courtes. Français naturel. Tutoiement. Concret et précis. Pas
professoral, pas de jargon inutile, pas de pseudo-science, pas de ton « article
SEO ».

**Et jamais une phrase qui parle de notre méthode de fabrication** (« écrite à la
main », « pas de remplissage pour faire long ») : ce sont nos règles internes de
qualité, pas du contenu public.

La page doit pouvoir être excellente même si Google n'existait pas.

## 12. SEO et GEO

Le référencement vient de la qualité de la réponse, pas de la répétition. Le nom de
l'exercice apparaît naturellement dans le H1, le title, l'introduction, la section
d'exécution quand c'est naturel, et la metadata.

Les intentions secondaires sont **traitées**, pas répétées. Pour le développé
couché : technique, muscles travaillés, barre, erreurs, variantes.

**Pas de bloc FAQ pour la seule raison que « les moteurs aiment les FAQ ».** Une
vraie question fréquente s'intègre dans le corps du texte.

---

## Règles de produit qui encadrent tout ça

- **Le public ne voit jamais un chantier.** Pas de carte « fiche en préparation »,
  pas de voisin non publié. Une fiche sans `contenu` garde son slug mais n'a ni
  route, ni sitemap, ni affichage. Une section sans contenu publiable disparaît
  entièrement. `href` est obligatoire sur `CarteExercice` : le compilateur tient la
  règle.
- **Le contenu public vit dans `src/lib/exercicesPublics.ts`**, jamais dans
  `exerciseLibrary.ts`, lu par treize modules dont la génération de séance par
  l'IA. Jointure par le nom canonique de l'exercice.
- **Les slugs sont écrits à la main et figés pour toujours.** Un slug calculé change
  le jour où quelqu'un corrige une faute dans le nom, et une URL indexée qui change
  est une URL perdue.
- **Pas de merge en production** tant que le hub n'a pas ses huit vraies fiches.

---

## Briefs des sept fiches restantes

À utiliser au feu vert. Ce ne sont pas des plans imposés : chaque fiche prend la
structure de son geste.

### Squat
Placement des pieds adaptable, descente contrôlée, genoux qui suivent naturellement
la direction des pieds, buste et tronc contrôlés, profondeur adaptée à la mobilité
et au contrôle, poussée pour revenir debout.
**Ne pas enseigner « les genoux ne doivent jamais dépasser les pointes de pieds »
comme une règle absolue.**
Erreurs : perdre le contrôle du tronc, genoux qui s'effondrent fortement vers
l'intérieur, profondeur forcée au détriment du contrôle.
Variantes selon le catalogue réel : goblet squat, squat avec charge, box squat.

### Burpees
Mouvement global et dynamique, séquence claire, rythme contrôlable, adaptation sans
saut ou en step-back (à décrire comme adaptation si elle n'existe pas au catalogue).
**Pas de discours « brûle-graisse miracle ».**
Erreurs : sacrifier le placement pour aller vite, réception incontrôlée, rythme trop
élevé pour conserver l'exécution.
La fiche peut être plus courte et plus dynamique que le développé couché.

### Gainage
**Ne pas forcer une structure de mouvement dynamique.** Alignement général, tension
des abdominaux et des fessiers, bassin contrôlé, respiration maintenue, durée
adaptée à la capacité à tenir la position.
**Éviter « tenir le plus longtemps possible » comme objectif universel.**
Erreurs : bassin qui s'affaisse, bassin excessivement haut, blocage inutile de la
respiration.
Le héros parle probablement en durée plutôt qu'en répétitions (`mode: "temps"`).

### Développé militaire haltères
Position de départ, trajectoire de la charge, avant-bras et poignets organisés sous
la charge, passage de la tête puis retour selon la version réellement illustrée,
tronc stable sans transformer le mouvement en extension excessive du dos.
Erreurs : cambrure excessive, trajectoire très éloignée du corps, élan non voulu.
**Ne pas promettre une position universellement parfaite pour toutes les épaules.**

### Rowing barre
Charnière de hanches, tronc stable, barre tirée vers le bas du torse ou l'abdomen
selon la variante réellement illustrée, contrôle de la descente, mouvement des
coudes plutôt que simple flexion des bras.
Erreurs : redresser le torse à chaque répétition, transformer chaque répétition en
mouvement d'élan, charger au point de perdre la position.
**Bien le distinguer des autres rowings du catalogue.**

### Curl haltères
Mouvement du coude, bras globalement stables, montée contrôlée, descente réellement
contrôlée, supination si elle correspond à l'animation réelle.
Erreurs : balancer le buste, avancer exagérément les coudes pour finir, raccourcir
systématiquement le mouvement.
**Fiche probablement plus courte que le développé couché. Ne pas la gonfler.**

### Soulevé de terre classique
La fiche qui mérite le plus de prudence avec le développé couché. Barre proche,
appuis, charnière de hanches, création de tension avant de décoller, tronc solide,
pousser le sol et se relever de manière coordonnée, verrouillage debout sans
hyperextension exagérée, retour contrôlé au sol.
Erreurs : barre qui s'éloigne du corps, départ sans tension, verrouillage en se
penchant excessivement en arrière, charge qui fait perdre la position.
**Éviter les affirmations anxiogènes sur le dos.** Expliquer le contrôle sans
présenter une forme corporelle unique comme universelle.

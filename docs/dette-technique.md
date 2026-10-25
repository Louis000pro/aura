# Dette technique de Vaiiya

Ce fichier ne liste pas tout ce qui est imparfait : il liste ce qu'on a
**mesuré, compris et délibérément laissé en place**, avec la raison. Une
entrée y entre quand un chantier découvre un défaut hors de son périmètre.
Le corriger au passage aurait mélangé deux intentions dans le même commit,
et c'est précisément ce qu'on s'interdit.

Chaque entrée dit : ce qui se passe, comment le reproduire, ce que ça coûte
vraiment, et pourquoi ça n'a pas été réparé tout de suite.

---

## La semaine ne se rafraîchit pas au passage de minuit

**Découvert** le 2026-09-05, pendant la vague V1 du moteur de programme
(indexation par date). **Pas corrigé dans V1**, volontairement : V1 devait
n'avoir aucun changement visible, et réparer ceci en est un.

**Ce qui se passe.** L'écran Entraînement charge les sept jours de la semaine
une fois, et ne les recharge jamais tant que la page reste ouverte :
`loadWeek` (`src/app/progression/page.tsx`) est un `useCallback` dont la
seule dépendance est `[user]`, et `generate` dans
`src/components/WeeklyProgramme.tsx` dépend de `[user, profile, weekOffset]`.
Ni l'un ni l'autre n'observe le changement de jour. Le jour courant, lui, est
relu à chaque rendu (`todayYmd()`).

**Comment le reproduire.** Laisser l'application ouverte sur Entraînement de
part et d'autre de minuit.

- **En semaine** (mardi 23 h 59 vers mercredi 00 h 01) : les dates de la
  semaine n'ont pas changé, donc tout reste juste. Aucun symptôme.
- **Du dimanche au lundi** : la semaine affichée est encore celle qui vient de
  finir, alors que le jour courant appartient à la suivante. C'est le seul cas
  qui casse, une fois par semaine, et seulement pour quelqu'un qui laisse
  l'écran ouvert à ce moment-là.

**Ce que ça coûte, avant et après V1.** Avant, le héros allait chercher le
jour par sa POSITION : il affichait donc **le lundi de la semaine précédente
comme séance du jour**, avec son bouton « Lancer la séance ». Un écran qui
affirme quelque chose de faux. Depuis V1, la recherche se fait par DATE : la
date d'aujourd'hui n'est pas dans la semaine chargée, donc on ne trouve rien
et le héros retombe sur l'état « repos », et la bande des sept jours se vide.
C'est faux aussi, mais en creux. **V1 a transformé une erreur qui affirme en
une erreur qui se tait** ; elle ne l'a pas supprimée.

**Le remède, quand on le fera.** Il existe déjà dans le produit et il ne
demande rien de neuf : `observeParisDay` (`src/lib/dates.ts`), que l'accueil
utilise depuis toujours (`AccueilClient.tsx`, `const [parisDay, setParisDay]`).
Il suffit que l'écran Entraînement tienne le jour parisien en état et le mette
dans les dépendances de `loadWeek`. ⚠️ Deux points à ne pas manquer ce
jour-là : le jour de référence de Vaiiya est le **jour parisien**
(`parisDateStr()`), pas le fuseau du navigateur, alors que `todayYmd()` de
`planning.ts` rend la date **locale** ; et un rechargement automatique de la
semaine ne doit pas écraser une modification en cours dans la feuille
« Organiser ».

**Pourquoi ce n'est pas urgent.** Il faut laisser l'application ouverte
pendant le passage du dimanche au lundi, sur cet écran précis. Un
rafraîchissement, une navigation ou une réouverture suffisent à corriger, et
la PWA recharge le HTML au réseau d'abord.

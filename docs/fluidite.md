# La fluidité de Vaiiya

Demande de Louis, 2026-10-27 : « Vaiiya manque de fluidité. Quand on change de
page, quand on appuie sur des boutons, quand on fait des actions. » Ce document
dit ce qui ralentissait, mesuré dans le code et dans les erreurs de production,
ce qui a été changé, et les règles qui empêchent d'y revenir.

## Ce qui ralentissait

1. **Chaque changement d'onglet remontait la page en glissant.** `globals.css`
   pose `scroll-behavior: smooth` sur `<html>`. Depuis Next 16, Next ne coupe
   plus ce réglage pendant une navigation sauf si `<html>` porte
   `data-scroll-behavior="smooth"` (guide de migration vers la version 16). Le
   `window.scrollTo(0, 0)` de la barre de navigation héritait aussi du
   défilement doux. Résultat : la nouvelle page arrivait en bas, puis
   remontait sous les yeux.
2. **La barre du bas se reconstruisait à chaque rendu.** Ses onglets étaient un
   composant déclaré dans le corps de `Navigation` : un nouveau type à chaque
   rendu (changer de page, passer les 12 px de défilement, relire le rang),
   donc cinq onglets démontés puis remontés, leurs préchargements rejoués, la
   pastille qui glisse repartie de zéro. Le lint le signalait déjà
   (`react-hooks/static-components`, quatre fois).
3. **Le proxy réveillait une fonction pour chaque navigation interne.** Il ne
   fait quelque chose que pour l'ouverture d'une page (`sec-fetch-dest:
   document`), mais son `matcher` laissait passer toutes les requêtes, y
   compris les navigations et les préchargements de Next. Il tourne sur
   Node.js (`functions-config-manifest.json`) : chaque requête passait par une
   fonction Vercel, parfois à froid, avant d'aller chercher une page statique.
4. **Le service worker servait des réponses de navigation d'hier.** Les
   requêtes de navigation de Next (`?_rsc=`) tombaient dans sa règle « le
   reste », en stale-while-revalidate : il répondait avec la copie gardée,
   souvent d'une version précédente, et Next devait alors recharger la page en
   entier. Chaque préchargement écrivait en plus dans le cache.
5. **Revenir sur un onglet repartait de zéro.** L'accueil relisait sa journée
   (`useJournee` : quatre à cinq allers-retours à la base, l'un après l'autre)
   et montrait son squelette jusqu'à une seconde et demie, à chaque retour.
   Nutrition reposait « Aujourd'hui » vide le temps d'une requête, la liste
   des discussions aussi.
6. **Une app restée ouverte pendant une mise en ligne plantait.** Toutes les
   erreurs client de la semaine du 2026-10-20 viennent de là
   (`photoDuGuide is not a function`, `workoutSessions` indéfini, React #130
   et #306, `ChunkLoadError`), chacune quelques minutes après un push. Le
   routeur de Next décode une réponse de navigation (et charge les morceaux de
   code qu'elle cite) AVANT de comparer les versions
   (`fetch-server-response.js`, `segment-cache/cache.js`), et le runtime de
   Turbopack garde le premier code reçu pour chaque module : l'ancienne page
   tournait avec deux versions mélangées. Les noms des fichiers, eux, suivent
   bien leur contenu (vérifié par deux builds qui ne diffèrent que d'un
   module : 152 fichiers identiques, 5 renommés, aucun nom réutilisé).
7. **L'analyse photo des repas ne marchait plus.** Les deux modèles d'images
   utilisés ont été retirés par Groq (Llama 4 Maverick le 2026-03-09, Scout le
   2026-07-17) et aucune variable `VISION_MODELS` n'était posée : chaque photo
   faisait quatre appels refusés, puis échouait.
8. **Toucher le profil d'un ami ou les infos d'une discussion ne montrait
   rien** le temps que le serveur réponde : deux routes dynamiques sans
   `loading.tsx`.

## Ce qui a été changé

| Quoi | Où |
| --- | --- |
| `data-scroll-behavior="smooth"` sur `<html>`, `scrollTo` en `behavior: "instant"` | `app/layout.tsx`, `components/Navigation.tsx` |
| L'onglet devient un composant déclaré une fois (`OngletNav`) ; `/profil` est préchargé avec les quatre onglets | `components/Navigation.tsx` |
| `touch-action: manipulation` sur ce qui se touche | `app/globals.css` |
| Le proxy ne tourne que pour l'ouverture d'une page (`has: sec-fetch-dest = document`) | `proxy.ts` |
| Service worker v14 : `_rsc` au réseau, jamais en cache ; API, Supabase et navigations hors du service worker sur Chrome 123+ (`addRoutes`) | `public/sw.js` |
| Chaque réponse porte `x-vaiiya-deploiement`, et un script du `<head>` refuse une réponse de navigation d'une autre version avant que Next ne la lise : Next charge alors la page en entier | `next.config.ts`, `app/layout.tsx` |
| La mémoire de session : un écran remontre ce qu'il a déjà montré, ses lectures repartent derrière | `lib/memoireSession.ts`, `hooks/useJournee.ts`, `app/AccueilClient.tsx`, `components/NutritionTab.tsx`, `components/communaute/ConversationListPane.tsx` |
| Qwen 3.8 27B pour la vision, en mode réponse directe (`reasoning_effort: "none"`) | `lib/visionRepas.ts` |
| `loading.tsx` pour `/profil/[username]` et `/communaute/[id]/infos` | `app/…/loading.tsx` |
| Le fondu de 200 ms à chaque changement de page est retiré (OK de Louis, 2026-10-27) : la page arrive à 100 % tout de suite. L'enveloppe et son `will-change: opacity` restent, pour que l'empilement des fenêtres ne change pas | `app/template.tsx` |

## Les règles, pour ne pas y revenir

- **Jamais un composant déclaré dans le corps d'un autre.** Il serait recréé à
  chaque rendu. Le lint le dit (`react-hooks/static-components`).
- **Tout `scrollTo` ou `scrollIntoView` d'une navigation porte
  `behavior: "instant"`.** Le défilement doux du site est pour les ancres.
- **Une route dynamique a son `loading.tsx`**, avec le même indicateur que la
  page pendant sa lecture, pour que rien ne saute de l'un à l'autre.
- **Un écran qui lit la base à son montage garde sa dernière publication**
  (`ecrireMemoire`) et l'oublie sur l'évènement qui la rend périmée
  (`oublierSur`). La clé porte le compte, et le jour quand l'écran en dépend.
  Un geste relit toujours la base avant d'écrire : la mémoire ne sert qu'à
  l'affichage.
- **Le service worker ne garde jamais une réponse `_rsc`**, et une route de
  `addRoutes` ne peut pas faire échouer l'installation (`.catch`).
- **Le proxy ne s'élargit pas** : ce qu'il fait doit pouvoir s'écrire en
  condition de `matcher`.
- **Le script du `<head>` qui compare les versions ne se retire pas**, et ne
  touche que les requêtes `_rsc` : Supabase, l'API et les images passent sans
  lui. Il s'éteint seul en local (pas d'identifiant).
- **Un modèle d'IA codé en dur se vérifie sur la page « Deprecations » du
  fournisseur** avant chaque chantier qui en dépend.

## Vérifié

- `npx tsc --noEmit`, `npm run build`, les bancs `check:programme`,
  `check:vision`, `check:nutrition`, `check:reprise`, `check:ouverture`,
  `check:matin`, `check:rangs`, `check:secours`, `check:css`,
  `check:missions`. `check:echelle` garde ses 26 écarts d'avant, aucun neuf.
- Le lint des fichiers touchés passe de 7 problèmes à 2, aucun nouveau.
- En production locale (`next start`), dans le navigateur : le service worker
  v14 s'installe et prend la main ; une réponse de navigation porte la bonne
  version ; un changement de page reste une navigation douce ; plus aucune
  réponse `_rsc` dans le cache.
- **Le scénario de mise en ligne, de bout en bout** : une page ouverte sur une
  version A, le serveur passé sur une version B, puis un lien touché dans
  l'ancienne page. Elle charge la page demandée en entier, sur la version B,
  sans aucune erreur de l'app.
- Le script du `<head>`, dans Node, sur huit cas (même version, autre version,
  adresse objet comme Next les passe, réponse sans en-tête, Supabase, API,
  panne réseau, double installation).

**Pas vu dans le vrai écran** (derrière la connexion) : la mémoire de session de
l'accueil, d'Entraînement, de Nutrition et de Communauté, ni sur iPhone ni sur
Android. **Pas mesuré contre l'API** : la vision Qwen (la clé Groq n'existe que
sur Vercel). `addRoutes` n'est pas vu sur un vrai Android (le navigateur de test
est un Chromium de bureau).

## Ce qui reste, et pourquoi ce n'est pas fait

- **Les règles d'accès de Supabase.** Le conseiller signale 161 politiques qui
  relisent `auth.uid()` à chaque ligne, 130 politiques permissives en double et
  44 clés étrangères sans index. Supabase mesure de 179 à 9 ms sur de grosses
  tables en écrivant `(select auth.uid())`. Avec le volume actuel (quelques
  milliers de lignes), le temps est dans le réseau, pas dans la base. À faire
  quand les tables grossiront, en SQL à coller par Louis, politique par
  politique.
- **framer-motion en `LazyMotion`.** La documentation annonce un module de
  départ sous 5 Ko au lieu de la bibliothèque entière ; c'est un passage sur
  des dizaines de fichiers (`motion.` vers `m.`).
- **Le `will-change: opacity` permanent de l'enveloppe des pages**
  (`app/template.tsx`), qui fait de chaque page un calque et un contexte
  d'empilement. Le fondu qu'il servait est retiré ; le retirer lui aussi
  changerait l'empilement des fenêtres posées dans les pages sous la barre du
  bas : à vérifier écran par écran avant.
- **Le cerveau de l'assistant** (`context/AssistantContext.tsx`, 3 000 lignes)
  est chargé sur toutes les pages, parce qu'il est monté dans le layout.
- **`cacheComponents` et `<Activity>`** garderaient chaque onglet visité
  monté, avec tout son état (documentation de Next 16, « Preserving UI
  state »). C'est la version complète de la mémoire de session, mais la
  migration touche tout le rendu serveur : un chantier à part.

## Sources

- Next.js 16, documentation embarquée (`node_modules/next/dist/docs/`) :
  « Linking and Navigating », « Ensuring instant navigations », « Preserving
  UI state », `cacheComponents`, `deploymentId`, `proxy` (matcher `has`), et
  le guide de migration vers la version 16 (Scroll Behavior Override).
- [web.dev, Optimize Interaction to Next Paint](https://web.dev/articles/optimize-inp)
- [Emil Kowalski, mobile-native](https://www.ui-skills.com/skills/emilkowalski/mobile-native)
- [Chrome, Service Worker Static Routing API](https://developer.chrome.com/blog/service-worker-static-routing)
  et [MDN, InstallEvent.addRoutes()](https://developer.mozilla.org/en-US/docs/Web/API/InstallEvent/addRoutes)
- [Supabase, RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Groq, Model Deprecations](https://console.groq.com/docs/deprecations),
  [Groq, Vision](https://console.groq.com/docs/vision) et
  [Groq, Qwen 3.8 27B](https://console.groq.com/docs/model/qwen/qwen3.8-27b)
- [Motion, LazyMotion](https://motion.dev/motion/lazy-motion/)
- [Mozilla, bug 1828248](https://bugzilla.mozilla.org/show_bug.cgi?id=1828248)
  (le coût de `backdrop-filter` au défilement sur Android)

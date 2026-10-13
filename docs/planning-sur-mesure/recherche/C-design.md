# Recherche C · Design et UX des plannings d'entraînement personnalisés (état de l'art 2025-2026)

Date : 13 octobre 2026. Pour : Louis et les agents Vaiiya. Aucun fichier du dépôt n'a été modifié (lectures seules de `AGENTS.md`, `docs/refonte-planning/DECISIONS.md` et des maquettes 04 et 08).

---

## 0. Méthode, fiabilité, limites (à lire avant le reste)

- **35 recherches web abouties** (deux autres refusées) avant que le quota de recherche de la session (200 recherches, partagé entre tous les agents lancés en parallèle) ne soit épuisé. Le reste du travail s'appuie sur ce qui avait été trouvé, plus des **lectures directes de sources primaires** encore joignables : `developer.apple.com` (pages des Apple Design Awards et des App Store Awards, articles « developer stories », transcriptions de sessions WWDC, et **texte intégral des Human Interface Guidelines** via leurs fichiers de données) et `developer.android.com`.
- La plupart des autres domaines (fitbod.me, hevyapp.com, musclewiki.com, dribbble.com, behance.net, mobbin.com, nngroup.com, m3.material.io, apple.com, design.google) **n'étaient pas lisibles directement** depuis cet environnement. Pour eux, je m'appuie sur les résumés des moteurs de recherche, et je le signale.
- **Conséquence la plus visible : la partie Dribbble / Behance (point 5 de la demande) n'a pas pu être documentée par des liens vérifiés.** Je le dis plutôt que d'inventer des planches. La section 6 donne des points d'entrée et des concepts tirés des produits primés vérifiés. Une recherche complémentaire est possible dans un message de suivi.
- **Légende de fiabilité**, utilisée partout dans ce document :
  - **[P]** source primaire lue aujourd'hui (texte de l'éditeur, d'Apple ou de Google).
  - **[S]** source secondaire ou résumé de moteur de recherche (presse, tests, fiche App Store résumée) : fiable sur le principe, détails d'écran à confirmer dans l'app.
  - **[M]** souvenir non revérifié aujourd'hui : à confirmer avant de s'en servir dans un argumentaire.

---

## 1. Ce que Vaiiya a déjà tranché, et qui sert de filtre

Lu dans `docs/refonte-planning/DECISIONS.md` et les maquettes 04 et 08. Chaque motif de ce rapport est jugé à travers ces décisions, jamais contre elles :

- **Point 41** : « le héros reste la séance, sa raison tient sur une ligne ; **pas de jauges musculaires** ». Une carte du corps ne peut donc être qu'un **sélecteur** ou un **aperçu binaire**, jamais une jauge. À valider explicitement avec Louis.
- **Point 36** : pas de règle sportive universelle codée (« 10 séries par muscle, 48 h »). Exclut la carte de « récupération en % » à la Fitbod.
- **Point 12** : aucun compteur en tête de semaine.
- **Point 29** : vocabulaire « Mes jours d'entraînement », « Prochaine séance » ; jamais « créneau » ni « étape » à l'écran.
- **Point 40** : cette semaine et la suivante pleinement modifiables, au-delà un aperçu secondaire.
- **Point 45** : durée libre (« j'ai 17 min » est compris) ; l'aperçu montre ce qu'on garde, ce qu'on retire, et si ça compte pour la séance prévue. **Point 38** : réduire le temps d'un jour et raccourcir une séance sont deux gestes distincts.
- **Point 39** : règles déterministes, l'IA explique et **nomme ce qui change** (« Vendredi devient une séance courte »).
- **Point 15** : « Annuler » court, seulement là où le retour est sûr.
- **Écran « Mes jours d'entraînement »** (section « En attente de Louis ») : « Chaque semaine / Cette semaine » ; en « Chaque semaine », aucune séance affichée à côté d'un jour (sinon on croit que lundi = Bas du corps pour toujours) ; en « Cette semaine », la séance qui tombe sur un jour **s'affiche en direct**.
- **Direction de Louis** : « pas d'explication en petite police sous les éléments ; la fonctionnalité doit se comprendre par ce qu'elle montre ».
- **Maquette 08** : « Ce que tu veux travailler · 2 au plus » (Dos, Fessiers, Jambes, Pectoraux, Épaules, Bras, Abdos, Un peu de tout), « Mes jours », « Par séance 45 min », « Où », puis « Ton programme · Dos et fessiers reviennent 2 fois par semaine » et « Activer ce programme ».
- Règles d'`AGENTS.md` : système D (violet = action, orange = énergie/effort/repos, teal = corps/progrès/réussite), photos naturelles, un seul héros, actions secondaires en retrait, Archivo et son axe de largeur, Martian Mono pour les valeurs mesurées, le **démonstrateur animé n'est ni Nora ni Sasha**, le Guide ne se déduit de rien, « adaptation » et jamais « adaptation automatique ».

---

## 2. Catalogue de motifs (livrable a)

Format : **Appli · À l'écran · Pourquoi ça marche · Transposable à Vaiiya · Fiabilité et source.**

### 2.1 Choisir des zones du corps

**M1 · Fitbod, la carte de récupération**
- À l'écran : un onglet Récupération affiche une carte de chaleur composite de la fatigue musculaire ; chaque groupe a un pourcentage de récupération de 0 à 100 %, recalculé après chaque séance d'après les séries, répétitions et charges. La présence d'une vue face/dos n'est pas confirmée par les sources lues.
- Pourquoi ça marche : rend visible une logique invisible (pourquoi l'algorithme évite tel muscle aujourd'hui).
- Transposable : l'idée d'une **silhouette qui montre ce que la semaine travaille**. **Pas** les pourcentages, **pas** la fatigue (points 36 et 41).
- [S] https://fitbod.me/blog/muscle-recovery/ · https://fitbod.me/blog/tracking-volume-intensity-and-recovery-with-fitbod/

**M2 · Hevy, la silhouette des 7 derniers jours**
- À l'écran : dans Statistiques, un schéma du corps surligne **en bleu** les muscles travaillés sur les 7 derniers jours ; un graphique compte les séries par groupe musculaire (30 jours, 3 mois, 1 an) ; une note de version Android mentionne une carte de chaleur consultable **pendant** la saisie d'une séance, touchable pour le détail.
- Pourquoi : un coup d'œil répond à « qu'est-ce que j'ai laissé de côté ».
- Transposable : une silhouette **binaire** (travaillé / pas travaillé), sans compteur, dans l'aperçu ou le bilan de semaine.
- [S] https://www.hevyapp.com/features/muscle-group-workout-chart/ · https://www.hevyapp.com/features/gym-performance/ · https://help.hevyapp.com/hc/en-us/articles/35119778922263 · https://www.apkmirror.com/?p=11862319

**M3 · MuscleWiki, la silhouette comme moteur de recherche**
- À l'écran : on touche un muscle sur une silhouette, les exercices ciblés s'ouvrent (plus de 2 000 exercices, gratuit, sans compte). La bascule face/dos et homme/femme est probable mais **non confirmée** par les sources lues [M].
- Pourquoi : la silhouette remplace un vocabulaire anatomique que la plupart des gens ne maîtrisent pas.
- Transposable : filtrer les **102 mouvements animés** (bibliothèque, `ExerciseLibrarySheet`) en touchant une zone, en gardant les puces de filtre comme voie principale (accessibilité).
- [S] https://musclewiki.com · https://www.klascement.net/app-or-software/219809/musclewiki-database-for-muscle-strengthening-exercises/

**M4 · Planfit (outil web), face et dos**
- À l'écran : vues Face et Dos ; toucher un muscle donne son emplacement, sa fonction et ses exercices.
- [S] https://planfit.ai/en/tools/muscle-anatomy

**M5 · BetterMe, les zones surlignées pendant le quiz**
- À l'écran : pendant le questionnaire, les parties du corps choisies se **surlignent sur un avatar** ; l'onboarding capte un objectif et une date cible et cadre la progression par rapport à elle ; les réponses deviennent « un plan que tu peux voir » (analyse Built for Mars). Le parcours compte **26 à 41 étapes** selon l'appli et la capture, et le paiement n'arrive qu'à la fin.
- Pourquoi ça marche : le retour visuel immédiat donne le sentiment d'un plan fait pour soi.
- Pourquoi c'est un contre-modèle : vocabulaire de « zones à problème », promesse sur le corps, questionnaire interminable avant toute valeur. Le positionnement public de Vaiiya interdit ces promesses.
- Transposable : **le surlignage immédiat, et rien d'autre**.
- [S] https://builtformars.com/company/betterme · https://screensdesign.com/showcase/betterme-health-coaching · https://lazyweb.com/flow/betterme/onboarding
- **MadMuscles** : la recherche n'a rien rendu d'exploitable sur son écran de « zones cibles ». Non documenté ici, plutôt que décrit de mémoire.

**M6 · Freeletics, exclure plutôt que cibler, et « Adapter la séance »**
- À l'écran : dans les réglages du Coach, on peut **exclure jusqu'à deux zones** (biceps, dos, triceps, pectoraux, gainage, bas de jambe, haut de jambe) ; elles reviennent en volume « bien plus faible », pas à zéro. Sur une séance, un bouton **Adapter** répond à « voyage, salle fermée, peu de temps » et **ne change que la séance du jour** ; les exclusions durables vivent dans les réglages. Les intervalles affichent désormais les zones travaillées.
- Pourquoi : la distinction **aujourd'hui / toujours** est claire, et l'exclusion ne casse pas l'équilibre du programme.
- Transposable : c'est exactement la séparation Vaiiya entre l'adaptation datée (V8, `AdaptationSheet`) et la version du programme, et le point 56 (« Pour cette séance seulement / À chaque fois »).
- [S] https://www.freeletics.com/en/blog/posts/new-coach-week-day-view · https://www.freeletics.com/en/blog/posts/how-to-work-with-your-freeletics-coach-to-stay-consistent/ (l'article d'aide sur l'exclusion de zones est cité par la recherche ; son adresse exacte n'est pas confirmée) · https://apps.apple.com/app/id654810212

**M7 · Apple Fitness+ Plans personnalisés, le ciblage arrive en dernier**
- À l'écran : après les jours, la durée et les activités, le dernier écran permet d'ajouter des séances par jour, de choisir coachs et musique, et de **modifier le matériel et le « body focus »** avant « Create Plan ».
- Pourquoi : la structure (quand, combien de temps) passe avant le réglage fin (quoi).
- Transposable : l'**ordre** des questions, plutôt que l'écran lui-même.
- [S] https://9to5mac.com/2023/06/21/create-custom-apple-fitness-plans-ios-17/ · https://iphonelife.com/content/how-to-build-apple-fitness-workout-plan · https://igeeksblog.com/?p=642145

**M8 · WHOOP Strength Trainer, la charge musculaire dans un seul score**
- À l'écran : la charge musculaire (accéléromètre, gyroscope, modèle biomécanique, « quelles parties du corps travaillent ») s'ajoute à la charge cardio dans un **seul score de Strain**. Une mise à jour 2026 (« Passive MSK ») n'est pas validée publiquement.
- Transposable : non (capteurs), mais rappelle qu'un indicateur unique peut cacher la complexité.
- [S] https://www.whoop.com/us/en/thelocker/the-research-and-development-behind-strength-trainer/ · https://www.businesswire.com/news/home/20230425005456/en · https://the5krunner.com/2026/02/28/new-whoop-strength-trainer-update/

**M9 · La vague des cartes 3D**
- À l'écran : MuscleMap (carte 3D interactive), BodyAtlas (silhouette face/dos colorée du chaud au froid), Veins (carte de chaleur touchable).
- Transposable : la tendance existe, **mais pas pour Vaiiya** (voir 4.3 : cohérence avec le personnage plat, poids d'une PWA, accessibilité).
- [S] https://apps.apple.com/app/id6782176731 · https://apps.apple.com/app/id6771045369 · https://apps.apple.com/us/app/-/id6757164368

**M10 · Train Fitness (finaliste ADA 2025, Inclusivité)**
- Ce qu'Apple retient : saisie des séances par CoreMotion et CoreML (montre, AirPods), **modes pour fauteuil roulant et différences de membres**.
- Leçon : une silhouette ne doit pas supposer quatre membres valides ni un seul type de corps.
- [P] https://developer.apple.com/design/awards/2025/

**Synthèse pour Vaiiya (zones)** : 8 zones, celles de la maquette 08 ; silhouette dérivée du **démonstrateur anonyme**, jamais Nora ou Sasha ; face/dos ; une zone = un nom, allumée des deux côtés quand elle y apparaît (Bras, Épaules, Jambes) ; sélection en violet avec un numéro 1 puis 2 ; liste de puces synchronisée ; aucune couleur d'alerte, aucun pourcentage.

### 2.2 Choisir une durée

**M11 · Apple Fitness+ Plans, un budget par jour**
- À l'écran : jours de la semaine, puis un temps quotidien de **10 à 90 minutes**, pour un plan de **2 à 8 semaines**, jusqu'à 5 types d'activité ; un seul plan actif à la fois.
- [S] (mêmes sources que M7)

**M12 · Structured, la journée qui « tient » ou non**
- À l'écran : chaque élément a une heure de début et une **durée** ; la journée est dessinée comme une seule colonne, donc on voit si elle tient. Une boîte de réception garde ce qui n'est pas encore placé. Finaliste ADA 2026 (Inclusivité), décrit par Apple comme un planificateur qui donne la priorité aux pauses et utilise les modèles sur l'appareil pour suggérer et pré-remplir les tâches. Finaliste App Store Awards 2025.
- Pourquoi : la durée devient une **longueur visible**, et la pause a sa place à elle.
- Transposable : rendre la durée **visible** (hauteur ou longueur), et traiter le repos comme un élément du dessin, pas comme un vide.
- [S] https://apps.apple.com/app/structured-daily-planner/id1499198946 · https://structured.app/blog/getstarted · [P] https://developer.apple.com/design/awards/

**M13 · Tiimo (iPhone App of the Year 2025)**
- Ce qu'Apple écrit : elle transforme « chaotic calendars into a timeline of soothing colors » et rend les tâches apaisantes. L'article développeur : « designed with the neurodivergent brain in mind… that approach can also be universal », et relie l'emploi du temps à « your feelings and energy levels ».
- [P] https://developer.apple.com/app-store/app-store-awards-2025/ · https://developer.apple.com/articles/tiimo/

**M14 · Les règles d'Apple pour régler une valeur**
- Curseur : « A horizontal slider is ideal when moving between a fixed starting and ending point » ; graduations avec étiquettes ; « Consider giving live feedback as the value of a slider changes. Live feedback shows people results in real time » ; pour une grande plage, compléter par un champ et un stepper.
- Sélecteurs : ne pas imposer 60 valeurs de minutes, des pas de 15 minutes sont possibles ; un mode « compte à rebours » existe pour une durée.
- Segmenté : « no more than about five segments on iPhone ».
- [P] https://developer.apple.com/design/human-interface-guidelines/sliders · /pickers · /segmented-controls

**M15 · Freeletics « Adapter » pour « peu de temps »** [S] (voir M6).

**Synthèse (durée)** : 4 ou 5 puces (20 · 30 · 45 · 60 · Autre), « Autre » ouvre un curseur horizontal gradué tous les 5 minutes, qui accepte « 17 » (point 45) ; l'aperçu se met à jour en direct (ce qu'on garde, ce qui part, « compte pour Dos & fessiers » ou non) ; le chiffre en Martian Mono, grand.

### 2.3 Choisir les jours

**M16 · Apple Fitness+** : choix des jours, puis contenu par jour [S].

**M17 · Runna**
- À l'écran : niveau (débutant à élite), nombre de séances par semaine (2 à 6), **quels jours**, et un écran dédié au **jour de la sortie longue** ; on peut ensuite passer de 3 à 6 jours ; une revue récente mentionne l'adaptation de l'intensité et du volume, et la prise en compte des vacances et déplacements.
- Pourquoi : un jour peut porter un **rôle** (« la longue ») sans figer un contenu.
- Transposable : en « Chaque semaine », ne rien afficher à côté d'un jour (décision Vaiiya), mais un rôle optionnel comme « mon jour long » serait compatible.
- [S] https://therunnerbeans.com/runna-coaching-app-review/ · https://www.tomsguide.com/reviews/runna-app · https://screensdesign.com/apps/runna-running-training-plans/ · https://www.zelpio.com/blog/runna-app-review-2026/

**M18 · Freeletics, la semaine qui suit ton rythme**
- À l'écran : on peut faire les séances de la semaine **dans n'importe quel ordre** ; une séance faite s'affiche **le jour où elle a été faite** ; une séance manquée **passe au lendemain** jusqu'à être faite ; on ne voit qu'environ une semaine à l'avance, volontairement (« pas des plans figés », réponse d'un membre de l'équipe).
- Transposable : c'est le modèle Vaiiya du point 18 (« une séance manquée t'attend au prochain jour d'entraînement ») et du point 40. Un précédent rassurant.
- [S] https://www.freeletics.com/en/blog/posts/new-coach-week-day-view · https://forum.freeletics.com/t/how-to-see-training-journey-workout-plan/18879

**Synthèse (jours)** : une bande de 7 pastilles L M M J V S D, chacune d'au moins 44 px (7 × 44 + 6 × 8 = 356 px, ça tient dans les 358 px utiles d'un écran de 390 px avec 16 px de marge) ; un toucher bascule ; en « Cette semaine », la séance qui tombe sur le jour s'affiche dessous en direct.

### 2.4 Voir une semaine

**M19 · Runna, le « plan overview »**
- À l'écran : la semaine à venir, ce qui est fait et ce qui reste, le total de distance de la semaine ; chaque sortie avec distance, allure suggérée et type (fractionné, lente, longue, tempo).
- [S] (sources M17)

**M20 · TrainingPeaks, la conformité en couleurs (contre-modèle utile)**
- À l'écran : chaque séance porte une bande de couleur : **vert** (dans les 20 % du prévu), **jaune**, **orange** (écart de plus de 50 %), **rouge** (non faite), **gris** (non prévue) ; la même bande sur les cartes de l'app mobile ; on glisse une séance vers un autre jour, on copie-colle (l'original reste), et maintenir **C** en glissant duplique.
- Pourquoi ça marche : lisible en un clin d'œil pour un coach qui suit vingt athlètes.
- Pourquoi pas pour Vaiiya : **rouge = reproche**. La maquette 04 a déjà tranché : « Pas de séance ce jour-là », gris, sans alerte.
- [S] https://help.trainingpeaks.com/hc/en-us/articles/204861204 · https://help.trainingpeaks.com/hc/en-us/articles/204072164-How-do-I-move-a-workout · https://www.trainingpeaks.com/coach-blog/speed-up-your-coaching-with-5-trainingpeaks-calendar-efficiency-features/

**M21 · Freeletics, « moins de détail, plus de focus »**
- À l'écran : la vue semaine résume plus simplement l'objectif de chaque jour ; certaines séances ont été **renommées pour mieux dire ce qu'elles contiennent** (Conditioning, Strength, Endurance, Beat your PB, Technique).
- [S] https://www.freeletics.com/en/blog/posts/new-coach-week-day-view

**M22 · Oura, « One Big Thing » (refonte d'octobre 2025)**
- À l'écran : l'onglet Aujourd'hui est centré sur **une seule priorité**, plus quelques métriques secondaires ; trois onglets : Aujourd'hui, Vitals, Ma santé.
- Transposable : la règle Vaiiya du héros unique, confirmée par un acteur majeur.
- [S] https://www.techcrunch.com/2025/10/20/oura-launches-redesigned-app-and-cumulative-stress-feature · https://www.businesswire.com/news/home/20251020302425/en · https://www.techbetweenthelines.com/oura-overhauls-app-experience-and-introduces-cumulative-stress-tracking/

**M23 · Structured et Tiimo, la semaine en ligne de temps** [S]/[P] (voir M12, M13).

**Synthèse (semaine)** : le squelette « une ligne par jour, sans compteur » des maquettes 04 et 08 est le bon. L'idée choc est de lui donner une **silhouette** reconnaissable (section 7).

### 2.5 Voir un mois, un cycle, une adaptation

**M24 · Gentler Streak, le mois par rapport à TON histoire, et le « chemin d'activité »**
- Ce qu'écrit le jury ADA 2024 : son « Monthly Summary view, which shows how you're doing in relation to your history, is less about hard comparisons and more about progress ».
- À l'écran (presse) : une **barre horizontale verte** traversée d'une ligne de tendance ; une séance exigeante la pousse au-dessus, une séance légère en dessous ; quand on reste dans la zone, **les points se relient** et forment la « série douce ». Une interview de 2022 : la suggestion la plus appropriée est listée en premier, « et parfois, c'est le repos ».
- Citation du studio : « Statistics are just numbers. Without knowing how to interpret them, they are meaningless. We wanted to change that and focus on the humanity. »
- [P] https://developer.apple.com/design/awards/2024/ · https://developer.apple.com/news/?id=3m0ht22s · [S] https://sg.news.yahoo.com/fitness-app-shows-apple-better-180000454.html · https://9to5mac.com/2022/06/25/gentler-streak-interview-watchos-9/ · https://lifestack.ai/blog/gentler-streak

**M25 · Strava, le carnet d'entraînement en ronds**
- À l'écran : chaque rond est une activité, chaque activité a sa couleur, les statistiques s'affichent au toucher, un filtre choisit temps, distance ou dénivelé. La taille proportionnelle au volume est probable [M], non confirmée.
- [S] https://support.strava.com/hc/en-us/articles/206535704

**M26 · Tide Guide (ADA 2026, Visuels et graphisme, gagnant)**
- Ce qu'Apple retient : une visualisation de données soignée et des animations qui suivent la couleur du ciel au fil de la journée ; l'article développeur : « The app's palette is even designed to match the color of the sky throughout the day ». On y trouve aussi un **calendrier de 10 jours où chaque carte porte un mini graphique de marée**, donc le même vocabulaire visuel d'un jour à l'autre ; une carte du haut qui donne **la réponse d'abord** (« basse mer dans 2 h 54 ») ; des couches de détail pour les experts (« The more time you spend with it, the more you can dig into different layers »).
- [P] https://developer.apple.com/design/awards/ · https://developer.apple.com/news/?id=4r9b23wx

**M27 · Duolingo, un seul chemin**
- Ce qu'écrit Apple : Duolingo a remplacé son « arbre » par **un seul chemin pour tout le monde** ; personnages récurrents ; « subtle animations when people get something right are a reward in themselves ».
- [P] https://developer.apple.com/news/?id=jhkvppla

**M28 · La barre qui traverse les jours (convention des calendriers)**
- Les calendriers grand public dessinent un événement de plusieurs jours comme une barre continue [M].
- Transposable : l'**adaptation datée** de V8 dessinée comme un ruban sur le mois (idée 5).

**M29 · Apple Watch, la charge d'entraînement (watchOS 11)**
- Effort des 7 derniers jours comparé aux 28 derniers, dit en mots (« bien en dessous » à « bien au-dessus ») [M].
- Transposable : comparer à **soi**, en mots, jamais à une norme.

**Synthèse (mois)** : le mois est un **aperçu** (point 40). Reprendre la grammaire de `CarteConstance` (des points, et l'absence jamais coloriée) et y ajouter le futur et les adaptations.

### 2.6 Réorganiser

**M30 · TrainingPeaks** : glisser vers un autre jour, copier-coller qui garde l'original, C pour dupliquer [S] (sources M20).

**M31 · Amie** : glisser une tâche de la colonne latérale vers le calendrier **lui donne une date et une heure** ; les tests citent « joyous interactions and a fluid design system ». [S] https://techcrunch.com/2022/03/17/amie-is-a-new-calendar-app-with-a-social-twist · https://www.producthunt.com/posts/amie-4 · https://thereport.substack.com/p/a-joyful-calendar

**M32 · Apple, « Designing Fluid Interfaces » (WWDC18)** [P] https://developer.apple.com/videos/play/wwdc2018/803/
- « Everything needs to respond instantly. »
- « When swiping or dragging, the contents should stay attached to the gesture. » Et : « We should respect the relative position, and never use the center of the image as the dragging point. »
- Hystérésis : « usually 10 points in iOS » pour distinguer un glisser d'un défilement.
- « elevate interactive elements to a separate plane » (soulever ce qu'on déplace).
- Utiliser l'élan pour projeter la destination ; bords élastiques ; chemins symétriques pour les éléments qui s'écartent.

**M33 · HIG, glisser-déposer** [P] https://developer.apple.com/design/human-interface-guidelines/drag-and-drop
- Image de glisser après environ 3 points, **translucide** ; surligner la destination **seulement si elle accepte** ; sinon rien, ou un signe « interdit » ; en cas d'échec, l'élément **retourne à sa source** ; « Prefer letting people undo a drag-and-drop operation ».

**M34 · HIG, alertes** [P] https://developer.apple.com/design/human-interface-guidelines/alerts
- « Avoid displaying alerts for common, undoable actions, even when they're destructive. »

**Synthèse (réorganiser)** : appui long, l'élément se soulève (`--ombre-flottant`), les jours s'écartent, la destination valide s'éclaire en violet, dépôt, puis un bandeau « Pull passe à vendredi · Annuler » quelques secondes ; jamais de confirmation ; toujours l'alternative « Décaler » par `ChoixJour` (accessibilité, voir 8).

### 2.7 Prévisualiser un plan généré

**M35 · Apple Fitness+** : un écran final où chaque jour est visible et modifiable avant « Create Plan » [S].

**M36 · Vaiiya, maquette 08, écran 2** : « Ton programme · Dos et fessiers reviennent 2 fois par semaine », trois séances, « Chaque séance s'ouvre sur ses vrais exercices », « Activer ce programme » / « Modifier mes choix ». **C'est déjà le bon motif** ; la recherche confirme sa forme.

**M37 · HIG, IA générative** [P] https://developer.apple.com/design/human-interface-guidelines/generative-ai
- « surfacing controls like Edit, Undo, Retry, or Adjust near generated content preserves people's agency » ; « When people adjust or personalize output, provide a clear signal that their action had an effect » ; « Consider offering alternate versions of results ».

**M38 · HIG, apprentissage automatique** [P] https://developer.apple.com/design/human-interface-guidelines/machine-learning
- « Prefer diverse options », « In general, avoid providing too many options », « List the most likely option first », « Make options easy to distinguish and choose ».

**M39 · HIG, chargement** [P] https://developer.apple.com/design/human-interface-guidelines/loading
- « Show something as soon as possible… consider showing placeholder text, graphics, or animations as content loads ».

**M40 · Analyse de 10 traqueurs (Screensdesign)** : avant de commencer, une séance doit montrer le nombre d'exercices, la durée estimée, le focus, l'ordre et les alternatives [S] https://screensdesign.com/articles/workout-tracker-app-design-examples/

**M41 · Fantastical, la phrase comprise pendant qu'on l'écrit** : saisie en langage naturel dont les éléments reconnus se mettent en évidence au fil de la frappe [M] https://flexibits.com/fantastical

### 2.8 Expliquer le pourquoi

**M42 · Oura, les contributeurs**
- À l'écran : le score de préparation (0 à 100) est construit à partir de **contributeurs nommés** (fréquence cardiaque de repos, équilibre de la variabilité cardiaque, indice de récupération, température, sommeil, équilibre du sommeil…), regroupés autour du sommeil, de l'activité et du stress du corps ; Oura en annonce sept, la liste exacte varie selon les sources ; bandes : 85 et plus « optimal », 70 à 84 « bon », moins de 70 « à surveiller ».
- [S] https://ouraring.com/blog/readiness-score/ · https://support.ouraring.com/hc/lv/articles/5949130374547-Glossary

**M43 · The Outsiders (Gentler Stories, finaliste ADA 2026, Interaction)**
- Ce qu'Apple retient : un score de préparation à l'entraînement qui équilibre charge d'entraînement, sommeil et fréquence cardiaque de repos. Fiche : les entrées du score sont montrées dans des graphiques interactifs ; historique sur 7 jours, 4 semaines, 6 mois ; données sur l'appareil.
- [P] https://developer.apple.com/design/awards/ · [S] https://apps.apple.com/us/app/the-outsiders-athlete-tracker/id6751584800 · https://www.ithinkdiff.com/gentler-stories-the-outsiders-athlete-tracker/

**M44 · Apple, comment une IA s'explique** [P]
- HIG : « An attribution expresses the underlying basis or rationale for a result, without explaining exactly how a model works », « Keep attributions factual and based on objective analysis », « avoid technical or statistical jargon », traduire la confiance « in terms of actionable suggestions ».
- WWDC19 : « relate to objective facts rather than subjective taste », « avoid profiling people by not using language that implies understanding or judgment of their emotions and preferences », « A better way is to provide a range in the prediction ».
- https://developer.apple.com/design/human-interface-guidelines/machine-learning · https://developer.apple.com/videos/play/wwdc2019/803/

**Synthèse (pourquoi)** : une ligne, factuelle, portée par le visage du Guide (un seul par écran) : « Dos et fessiers reviennent deux fois : tu les as mis en premier. » Le détail (« Pourquoi ? ») dans une feuille à mi-hauteur si on le demande, avec 3 ou 4 faits en mots, jamais un score.

---

## 3. Références primées et produits adjacents

### 3.1 Apple Design Awards (santé, sport, bien-être, planification)

| Année | App | Catégorie et statut | Ce qu'Apple met en avant | Source |
|---|---|---|---|---|
| 2023 | Any Distance | Visuels et graphisme, **gagnant** | « eye-popping and easily shareable » stats, cartes 3D, AR, Live Activities ; fauteuil, poussette… | [P] /design/awards/2023/ |
| 2023 | Gentler Streak | Visuels et graphisme, **finaliste** | (pas de description) | [P] idem |
| 2023 | Headspace | Impact social, **gagnant** | « the standard for meditation and mental health apps » | [P] idem |
| 2023 | Rise: Energy & Sleep | Innovation, finaliste | | [P] idem |
| 2023 | Flighty | Interaction, gagnant (voyage, adjacent) | Live Activities, Dynamic Island | [P] idem |
| 2023 | Duolingo | Plaisir et amusement, gagnant (adjacent : parcours) | | [P] idem |
| 2024 | **Gentler Streak** | Impact social, **gagnant** | encouragement plutôt que rappels insistants ; « Monthly Summary… less about hard comparisons and more about progress » | [P] /design/awards/2024/ |
| 2024 | Tiimo | Inclusivité, finaliste (planificateur visuel) | | [P] idem |
| 2024 | SmartGym | Innovation, finaliste | | [P] idem |
| 2024 | Meditate · Sunlitt | Visuels et graphisme, finalistes | | [P] idem |
| 2024 | Rooms · Crouton | Visuels / Interaction, gagnants (adjacents) | | [P] idem |
| 2025 | Train Fitness | Inclusivité, finaliste | saisie sans écran, modes fauteuil et différences de membres | [P] /design/awards/2025/ |
| 2025 | Evolve | Inclusivité, finaliste | bien-être LGBTQ+ | [P] idem |
| 2025 | Opal | Impact social, finaliste | bien-être numérique | [P] idem |
| 2026 | Structured | Inclusivité, finaliste | priorise les pauses, IA qui suggère et pré-remplit | [P] /design/awards/ |
| 2026 | The Outsiders | Interaction, finaliste | score de préparation (charge, sommeil, FC de repos) | [P] idem |
| 2026 | Harvee | Impact social, finaliste | stress et récupération, modèles sur l'appareil | [P] idem |
| 2026 | Moonlitt | Interaction, **gagnant** (adjacent) | intégration de Liquid Glass | [P] idem |
| 2026 | Tide Guide | Visuels et graphisme, **gagnant** (adjacent) | visualisation de données, animations à la couleur du ciel | [P] idem |

Constat : **aucune appli de planning d'entraînement pur n'a gagné un ADA sur ces quatre années.** Ce qui gagne dans la santé, c'est la **bienveillance** (Gentler Streak, deux fois distingué), la **donnée rendue humaine ou belle** (Any Distance, Tide Guide) et l'**inclusivité** (Train Fitness). C'est une place à prendre, et elle correspond à l'ADN « zéro culpabilisation » de Vaiiya.

### 3.2 App Store Awards 2025 [P] https://developer.apple.com/app-store/app-store-awards-2025/
- **iPhone App of the Year : Tiimo** (« a timeline of soothing colors »).
- **Apple Watch App of the Year : Strava** (« sleek design, real-time segment tracking, and a global community of athletes »).
- Finalistes : **LADDER** (programmes de renforcement, iPhone), **Structured** (iPad), GO Club (montre), TIDE.
- Strava a annoncé le rachat de **Runna** le 17 avril 2025 [S] https://marathonhandbook.com/strava-announces-acquisition-of-personalized-training-app-runna/ · https://sifted.eu/articles/strava-buys-runna-deal-fitness-app

### 3.3 Webby Awards
- **Apple Fitness+** : People's Voice 2023, catégorie Health, Wellness & Fitness (apps) ; plusieurs distinctions en 2022. [S] https://winners.webbyawards.com/2023/apps-software/general-apps/health-wellness-fitness/248829/apple-fitness · https://winners.webbyawards.com/2022/apps-and-software/general-mobile-ott-apps/health-fitness/218549/apple-fitness
- 2024 : BetterMe: Mental Health (People's Voice) ; Scout by Sutter Health (Webby, selon l'éditeur). [S] https://winners.webbyawards.com/2024/apps-software/general-apps/health-wellness-fitness/291802/betterme-mental-health · https://vitals.sutterhealth.org/scout-by-sutter-health-wins-prestigious-webby-award-for-health-wellness-and-fitness-app-excellence/
- 2025 : **gagnant de la catégorie appli santé non retrouvé** ; un blog l'attribue à Apple Fitness+, une autre recherche le contredit : non confirmé.
- 2026 : The Way (méditation), People's Voice « Best Visual Design – Function » selon un résumé de recherche [S] https://www.webbyawards.com/press/press-releases/30th-annual-webby-awards-announce-2026-winners/

### 3.4 Google Play « Best of »
- 2024 : **MacroFactor**, « Best Everyday Essential » (nutrition, adjacent). [S] https://blog.google/products/google-play/google-play-best-apps-games-2024/
- 2025 : aucune catégorie santé ; Calm (meilleure appli XR), SleepisolBio (montres), Focus Friend (meilleure appli). [S] https://blog.google/products/google-play/best-apps-games-2025/

### 3.5 Mobbin et bibliothèques d'écrans
- Mobbin revendique plus de 600 000 écrans de plus de 1 100 applis (via une documentation tierce) [S]. Contenu non consulté. Pour la suite : Mobbin, Screensdesign (fiches Runna et BetterMe ci-dessus), Lazyweb, Built for Mars.

### 3.6 Produits adjacents, en une ligne chacun
- **Runna** : questions courtes (jours, jour long), aperçu de semaine fait / à faire, chaque séance avec son type et sa cible [S].
- **Strava** : carnet en ronds, montre primée 2025 [S]/[P].
- **TrainingPeaks** : conformité en couleurs, glisser-déposer de coach, à ne pas copier pour le rouge [S].
- **WHOOP** : un seul score qui agrège [S].
- **Oura** : une seule priorité par jour, des contributeurs nommés [S].
- **Structured** : la durée visible, les pauses prioritaires, IA qui pré-remplit [S]/[P].
- **Tiimo** : ligne de temps aux couleurs apaisantes, énergie et émotions [P].
- **Amie** : glisser pour planifier, interactions « joyeuses » [S].
- **Fantastical** : la phrase comprise pendant la frappe [M].
- **Opal** : finaliste ADA 2025 (bien-être numérique) [P] ; détails d'écran non vérifiés.

---

## 4. Le langage visuel du moment

### 4.1 Liquid Glass (Apple, 2025) : les règles telles qu'Apple les écrit [P]

Sources : https://developer.apple.com/videos/play/wwdc2025/219/ · https://developer.apple.com/videos/play/wwdc2025/356/ · https://developer.apple.com/design/human-interface-guidelines/materials · https://developer.apple.com/design/human-interface-guidelines/color

- Place : « Liquid Glass forms a distinct functional layer for controls and navigation elements… that floats above the content layer » ; « **Don't use Liquid Glass in the content layer** » ; « Use Liquid Glass effects sparingly ».
- « always avoid glass on glass. Stacking Liquid Glass elements on top of each other can quickly make the interface feel cluttered and confusing. »
- Deux variantes « should never be mixed » : **regular** (flou et ajustement de luminosité, pour tout ce qui porte du texte) et **clear** (très transparent, seulement au-dessus de contenus riches comme une photo, avec un voile : « If the underlying content is bright, consider adding a dark dimming layer of 35% opacity »).
- Teinte : « Tinting should only be used to bring emphasis to primary elements and actions » ; « Avoid tinting all your elements. When every element is tinted, nothing stands out ». C'est **exactement** la règle Vaiiya « le violet = l'action ».
- Hiérarchie : « Instead of relying on decoration, hierarchy should be expressed through layout and grouping. »
- Concentricité : rayons intérieurs = rayon extérieur moins la marge ; capsules sur téléphone avec une marge près du bord (la barre en capsule de Vaiiya est dans la ligne).
- Effets de bord de défilement : « replacing hard dividers with subtle blur », un seul par vue, et « not decorative ».
- Typographie : « now bolder and left-aligned to improve readability in key moments like alerts and onboarding ».
- Accessibilité automatique : Réduire la transparence rend le verre « frostier », Augmenter le contraste rend les éléments noirs ou blancs avec une bordure, Réduire les animations retire l'élasticité.
- Retours d'équipes : Zoho : « Liquid Glass is not just a visual refresh — it encourages you to rethink structure and flow » ; Monzo : « If you can fit both an icon and text into a button and make it work, do that. If not, stick to text » ; Moonlitt : « it was like the interface was breathing ». [P] https://developer.apple.com/news/?id=to37r18t · https://developer.apple.com/news/?id=1q3azf1j · https://developer.apple.com/news/?id=v1nphz91

**Tension avec Vaiiya, à connaître sans la rouvrir.** Louis a décidé « le verre partout » (bloc « TOUT EN VERRE » de `globals.css`), ce qu'Apple déconseille pour la couche de contenu. Ce n'est pas à rediscuter ici ; la recherche dit seulement **où le risque se concentre dans un planning** : texte dense sur verre, verre posé dans du verre (une pastille de jour dans une carte de semaine dans une feuille), flou multiplié par cellule de calendrier, et contraste sur la partie la plus claire du fond pastel. Les parades sont en section 8.

### 4.2 Material 3 Expressive (Google, 2025)

- Ce qui est vérifié [P] : « M3 Expressive is an expansion of Material Design 3, including research-backed updates to theming, components, motion, typography, and more » (developer.android.com). La grille officielle des « niveaux d'expression » (Wear OS) range les critères en Fondamental, Excellent, Transformatif, avec un critère **« Hero moments »** : « Product specific expressive design moments », puis « dramatic hierarchy and customization » ; mouvement par **jetons de ressort** et **morphing de formes** ; typographie variable (Roboto Flex). https://developer.android.com/develop/ui/compose/designsystems/material3 · https://developer.android.com/design/ui/wear/guides/get-started/levels-expression
- Ce qui vient de la presse [S], **non vérifié sur la page de Google** : 46 études, plus de 18 000 participants ; des éléments clés repérés « jusqu'à 4 fois plus vite » ; l'écart d'efficacité des plus de 45 ans « effacé ». Une critique : rendre chaque action évidente peut créer du bruit pour les habitués. https://9to5google.com/2025/05/05/material-3-expressive-leak/ · https://chromeunboxed.com/google-leaks-the-reason-and-process-behind-their-new-material-3-expressive-design-language/ · https://www.designwhine.com/material-3-expressive-details/
- À emprunter pour Vaiiya, sans changer de palette ni de police : des **ressorts nommés** (comme les ombres nommées), le **morphing de forme** pour marquer un choix (une pastille de jour qui passe du rond à la capsule), et la notion de **moments héros rares** (un ou deux par parcours).

### 4.3 Tendances des applis de sport haut de gamme 2025-2026, et ce qu'elles valent pour Vaiiya

| Tendance | Exemples vérifiés | Pour Vaiiya |
|---|---|---|
| La donnée comme décor | Tide Guide (palette « designed to match the color of the sky throughout the day ») ; Sunlitt (« we decided to place a monolith on the screen and let it cast a shadow », couleurs qui imitent le ciel) [P] | Oui : la semaine dessinée par ses durées, le mois par ses points, plutôt que des tuiles de chiffres. |
| Un élément signature | Any Distance : le masque ovale devenu « one of our main brand characteristics » [P] | Vaiiya a déjà la capsule, l'étincelle, le démonstrateur : les décliner, ne rien ajouter. |
| Typographie affirmée | Apple : plus grasse, alignée à gauche [P] | Archivo et son axe de largeur, les chiffres en Martian Mono : c'est déjà la bonne réponse. |
| Personnages | Duolingo (personnages récurrents), Gentler Streak (Yorhart, « what your heart would be telling you ») [P] | Nora et Sasha pour la parole, le démonstrateur pour le corps. Ne pas mélanger. |
| Corps en 3D | MuscleMap, BodyAtlas [S] | Non : rompt avec les 102 animations plates, pèse sur une PWA, moins accessible. |
| Micro-animations | Duolingo ; Apple : « Aim for brevity and precision in feedback animations », « Let people cancel motion » [P] | Oui, rares, interruptibles, désactivables. |
| Haptique | Apple : causalité, harmonie, utilité, « Don't add feedback just because you can » [P] ; Android : « less is more », éviter les vibrations longues « buzzy » [P] | Limité : pas de vibration web sur iPhone (voir 8). |
| IA qui pré-remplit, l'humain valide | Structured, Harvee (ADA 2026) [P] | C'est le modèle du Guide Vaiiya (cartes, aucune écriture sans clic). |
| Une priorité par écran | Oura « One Big Thing » [S] | Déjà la règle du héros. |
| Bienveillance comme parti pris | Gentler Streak, primé deux fois [P] | L'ADN « zéro culpabilisation » est un argument de design, pas seulement de ton. |

---

## 5. Les principes qui rendent une configuration intuitive

1. **Des valeurs par défaut, et la configuration non essentielle repoussée.** Apple : « Postpone nonessential setup flows or customization steps. Provide reasonable default settings so most people can immediately start interacting ». Exemple : la maquette 08 reprend le lieu et la durée déjà répondus ; Apple Fitness+ propose un plan complet avant le réglage fin. [P] https://developer.apple.com/design/human-interface-guidelines/onboarding
2. **La divulgation progressive.** Apple : « showing only what's necessary upfront — just enough to help people get started then revealing more as they interact » ; feuilles : « consider supporting the medium detent to allow progressive disclosure ». Exemples : Tide Guide (couches de détail), Freeletics (« moins de détail, plus de focus »). [P] https://developer.apple.com/videos/play/wwdc2025/359/ · https://developer.apple.com/design/human-interface-guidelines/sheets · [M] https://www.nngroup.com/articles/progressive-disclosure/
3. **Une question à la fois quand on ne sait rien, un écran récapitulatif quand on sait.** Apple (calibration) : « only ask for essential information… allow people to update their information ». La règle « une question par page » des services publics britanniques va dans le même sens [M] https://design-system.service.gov.uk/patterns/question-pages/. Contre-exemple : les 26 à 41 étapes de BetterMe. Vaiiya : `/bienvenue` pose déjà les questions une par une ; l'écran « Mon programme » de la maquette 08 est le bon récapitulatif pré-rempli.
4. **Un aperçu qui se met à jour en direct.** Apple : « Consider giving live feedback as the value of a slider changes. Live feedback shows people results in real time. » Exemple : la note Vaiiya « la séance qui tombe dessus s'affiche en direct » ; Structured montre si la journée tient. [P] https://developer.apple.com/design/human-interface-guidelines/sliders
5. **Annuler plutôt que confirmer.** Apple : pas d'alerte pour une action courante et réversible ; « Prefer letting people undo a drag-and-drop operation » ; montrer le résultat de l'annulation. Vaiiya : point 15. [P] https://developer.apple.com/design/human-interface-guidelines/alerts · /undo-and-redo · [M] Aza Raskin, « Never Use a Warning When You Mean Undo », A List Apart, 2007 https://alistapart.com/article/neveruseawarning/
6. **Nommer la conséquence avant le clic.** Apple : « Use simple, direct language to describe each explicit feedback option and its consequences ». Vaiiya le fait déjà sur les cartes du Guide (V9). [P] /machine-learning
7. **Corriger comme on fait d'habitude, et voir l'effet tout de suite.** Apple : « Give people familiar, easy ways to make corrections », « Provide immediate value when people make a correction », « Let people correct their corrections ». Exemple : Freeletics « Adapter ». [P]
8. **Peu d'options, différentes, la plus probable d'abord.** Apple (ML) ; Gentler Streak qui met la suggestion la plus appropriée en premier, parfois le repos. [P]/[S]
9. **Séparer « aujourd'hui » de « toujours ».** Freeletics (Adapter la séance / réglages du Coach) ; Vaiiya points 38 et 56. [S]
10. **Montrer plutôt qu'expliquer.** Apple : un écran doit répondre à « where I am », « what I can do », « where I can go from here » ; un graphique gagne à avoir un titre-résumé plutôt qu'une légende. C'est la direction de Louis (pas de petite police explicative). [P] /videos/play/wwdc2025/359/ · /charting-data
11. **Rester interruptible.** Apple : une interface doit accepter qu'on change d'avis en plein geste ; « don't make people wait for an animation to complete ». [P] /videos/play/wwdc2018/803/ · /motion
12. **Dire l'échec en clair.** Apple (IA) : « describe what happened in plain language and offer a clear next step » ; Vaiiya point 16 : « Planning indisponible », jamais une semaine vide. [P] /generative-ai

Pour l'attente pendant une génération, l'« illusion du travail » (montrer le travail fait rend le résultat plus précieux) est un résultat de recherche connu [M] (Buell et Norton, « The Labor Illusion », Management Science, 2011). À utiliser honnêtement : montrer la vraie construction (les séances qui se posent), jamais un faux chargement allongé.

---

## 6. Concepts visuels (Dribbble, Behance, études de cas)

**Limite assumée** : faute de recherche disponible et d'accès direct à dribbble.com et behance.net, je n'ai **aucune planche vérifiée** à citer. Plutôt que d'inventer des liens, voici :

**6.1 Points d'entrée pour une recherche de suivi** (pages de recherche, contenu non consulté) :
- https://dribbble.com/search/workout-planner · https://dribbble.com/search/training-calendar · https://dribbble.com/search/muscle-map · https://dribbble.com/search/body-heatmap
- https://www.behance.net/search/projects/workout%20planner · https://www.behance.net/search/projects/fitness%20app%20case%20study
- https://mobbin.com (parcours Runna, Hevy, Fitbod, Apple Fitness) · https://screensdesign.com/apps/runna-running-training-plans/ · https://lazyweb.com/flow/betterme/onboarding · https://builtformars.com/company/betterme
- Requêtes utiles : « workout plan generator onboarding », « time budget picker », « weekly training timeline », « mesocycle calendar », « body map selector front back ».

**6.2 Concepts forts, vérifiés, tirés des produits primés** (à défaut de Dribbble, ce sont des concepts qui ont passé un jury) :
- **Le monolithe et son ombre** (Sunlitt) : une donnée abstraite devient un objet physique familier. [P]
- **La palette qui suit le ciel** (Tide Guide) : la couleur porte le contexte sans un mot. [P]
- **Le mini graphique répété par jour** (Tide Guide, calendrier de 10 jours) : la même grammaire d'un jour à l'autre rend un mois lisible. [P]
- **Le couloir d'activité** (Gentler Streak) : une zone de bonne intensité, une ligne qui y reste ou en sort, des points qui se relient. [S]
- **La ligne de temps colorée** (Tiimo, Structured) : la durée est une longueur. [P]/[S]
- **Le masque ovale** (Any Distance) : une forme signature qui rend chaque partage reconnaissable. [P]
- **Un seul chemin** (Duolingo) : tout le monde avance sur la même route. [P]
- **Une seule chose aujourd'hui** (Oura) : l'écran a un héros. [S]

---

## 7. Idées « choc » pour Vaiiya (livrable b)

Toutes respectent l'identité verrouillée : **aucune nouvelle couleur, aucune nouvelle police**. Chacune dit ce qu'on voit, pourquoi c'est fort, ce qu'elle respecte, et son risque.

**Idée 1 · La silhouette qui choisit** (« Ce que tu veux travailler »)
- On voit : en grand, la silhouette du **démonstrateur** dans une version mannequin (mêmes proportions, même trait plat, **sans** le haut lilas ni le bas bleu nuit, pour que la sélection se lise), de face. Un bouton « Dos » (ou un geste horizontal) la retourne en 350 ms ; en mouvement réduit, un fondu. Toucher une zone la remplit du dégradé violet → magenta et y pose un numéro **1**, puis **2** (deux au plus, comme la maquette 08). La rangée de puces dessous se met à jour en même temps, et inversement. « Un peu de tout » allume toute la silhouette d'un voile léger.
- Pourquoi c'est choc : le corps **devient l'interface**, en grand, dans le style que les gens reconnaissent déjà dans le tunnel.
- Respecte : violet = choix, pas de pourcentage, pas de rouge, pas de Nora ni Sasha, pas de genre déduit.
- Risque : le point 41 (« pas de jauges musculaires ») ; ici c'est un **sélecteur**, pas une jauge, mais **à valider avec Louis**. Les petites zones (avant-bras, mollets) sont regroupées dans les 8 zones et reçoivent une zone de toucher élargie invisible.

**Idée 2 · L'empreinte : ce que tu as choisi, ce que tu as fait**
- On voit : dans l'aperçu du programme, une petite silhouette où les zones que la semaine va travailler apparaissent en **contour violet** (le choix, l'intention) ; en fin de semaine, les zones réellement travaillées se **remplissent de teal** (le corps, le fait).
- Pourquoi : un seul objet raconte l'avant et l'après, sans un chiffre.
- Respecte : le sens de chaque couleur du système D (violet = intention, teal = réalisé).
- Risque : à nouveau le point 41 ; l'empreinte est **binaire** (travaillé ou non), jamais graduée.

**Idée 3 · Le temps qui se voit** (durée)
- On voit : « **45** » en Martian Mono géant, « min » petit à côté. Dessous, une barre horizontale faite de segments proportionnels à la séance : échauffement (neutre), efforts (orange, segments épais), repos (orange, segments fins : la forme distingue, pas seulement la couleur). Les puces 20 · 30 · 45 · 60 · Autre ; « Autre » rend l'extrémité de la barre déplaçable, avec des graduations tous les 5 minutes. En réduisant, les exercices qui partent glissent vers le bas en s'atténuant, et une ligne dit « Compte pour Dos & fessiers » ou « Devient une autre séance » (point 45).
- Pourquoi : on voit **ce que le temps achète**.
- Respecte : orange = effort et repos, chiffres en Martian Mono, curseur horizontal (Apple).
- Risque : précision du calcul de durée (déjà traité au point 45).

**Idée 4 · La semaine-silhouette**
- On voit : sept colonnes ; chaque jour d'entraînement est une **capsule verticale dont la hauteur suit la durée**, avec la durée en Martian Mono au sommet. Faite = remplie de teal avec une coche ; aujourd'hui = contour violet et le mot « Aujourd'hui » ; prévue = contour fin ; jour libre = un simple point. « t'attendait mercredi » reste la seule phrase.
- Pourquoi : la semaine a une **forme** qu'on reconnaît d'un coup d'œil, sans compteur (point 12). La donnée devient le décor.
- Respecte : pas de rouge, l'absence n'est pas coloriée, état dit par la forme et la couleur.
- Risque : à 390 px, 7 capsules de 44 px laissent peu de place au titre des séances ; le titre vit dans la ligne du jour sélectionné, sous la bande.

**Idée 5 · Le ruban d'adaptation** (« pour une semaine ou un mois »)
- On voit : une adaptation datée (V8) dessinée comme un **ruban de verre** qui traverse les jours concernés dans la semaine et le mois, avec son nom et sa fin : « Sans Push · jusqu'au 6 oct. ». Le toucher ouvre `AdaptationSheet`. Le choix de la période se fait par puces « Cette semaine · 2 semaines · Ce mois-ci · Jusqu'au… », et la longueur du ruban change en direct sur un mini calendrier.
- Pourquoi : une adaptation devient un **objet visible avec un début et une fin**, exactement ce que le modèle de données dit (fin obligatoire, réévaluation à 4 semaines).
- Respecte : le verre est ici légitime (un élément qui flotte au-dessus du calendrier), « adaptation » et jamais « adaptation automatique ».
- Risque : contraste du libellé sur verre ; un seul ruban à la fois (la base l'interdit déjà).

**Idée 6 · Le mois en points**
- On voit : la grammaire de `CarteConstance` prolongée vers le futur : jours actifs passés = points teal ; jours d'entraînement à venir = anneaux vides ; aujourd'hui = anneau violet ; le ruban d'adaptation par-dessus ; au-delà de deux semaines, un toucher ouvre un aperçu en lecture seule avec la phrase commune « Ton programme suit ton rythme… » (point 19).
- Pourquoi : un mois lisible en un coup d'œil, et un langage déjà présent dans l'app (Tide Guide le montre : même mini-vocabulaire par jour).
- Respecte : jamais l'absence coloriée, point 40 (le lointain est un aperçu).

**Idée 7 · L'affiche du programme**
- On voit : en héros, une phrase en Archivo très large (`--w-affiche`) : « **Dos & fessiers**, deux fois par semaine. » ; dessous, les trois séances en affiches photo naturelles légèrement superposées comme un jeu de cartes, avec « 45 min · 6 exercices » en Martian Mono ; un seul bouton violet « Activer ce programme » ; « Modifier mes choix » en lien discret.
- Pourquoi : c'est l'écran où l'on s'engage ; il mérite d'être une affiche, pas un formulaire.
- Respecte : un héros, une action principale violette, photos sans teinte.

**Idée 8 · Le plan qui se pose**
- On voit : après « Voir mon programme », les cartes des séances partent de la sélection et **se posent** sur les jours de la bande de semaine (ressort, moins d'une seconde au total, interruptible au toucher). En mouvement réduit : apparition directe avec un fondu.
- Pourquoi : la cause et l'effet entre les choix et le calendrier se **voient**. C'est la seule « animation de génération » honnête : elle montre le vrai placement.
- Respecte : Apple (cohérence spatiale, interruptibilité), pas de faux chargement.

**Idée 9 · La phrase comprise**
- On voit : dans la conversation, quand on écrit « jambes, 30 min, mardi et jeudi », trois puces apparaissent pendant la frappe sous le champ (« Jambes · 30 min · Mar · Jeu »), chacune retirable ; la carte d'aperçu se construit ; rien ne s'écrit avant le bouton violet.
- Pourquoi : la personne voit **ce que le Guide a compris** avant de valider (Apple : « clear signal that their action had an effect »).
- Respecte : l'aiguilleur reste pauvre et le code résout les identités (décision 7 de V9) ; les puces affichent simplement les paramètres compris.
- Risque : faisabilité technique en direct (à vérifier ; peut se faire à l'envoi plutôt qu'à la frappe).

**Idée 10 · Pourquoi, en une ligne**
- On voit : à côté du héros, le visage du Guide et une ligne factuelle : « Vendredi devient une séance courte : tu as dit 25 min. » (point 39). Un toucher ouvre une feuille à mi-hauteur avec 3 ou 4 faits en mots.
- Pourquoi : expliquer sans paragraphe (direction de Louis), et sur des faits (Apple).
- Respecte : un seul Guide visible par écran.

**Idée 11 · Le glisser qui respire**
- On voit : appui long, la séance se soulève (`--ombre-flottant`, légère mise à l'échelle), les autres jours s'écartent, la destination valide s'éclaire en violet, dépôt, puis « Pull passe à vendredi · Annuler ».
- Pourquoi : déplacer devient un geste direct, et l'erreur se répare d'un toucher.
- Respecte : Apple (réponse immédiate, élément collé au doigt, annulation), point 15.
- Risque : appui long et défilement sur le web mobile (voir 8).

**Idée 12 · Le fond qui suit la semaine** (optionnelle, à tester)
- On voit : les arrêts du dégradé pastel existant (`--fond-verre` : blanc, rose, violet, jaune, beige) glissent doucement selon l'avancée de la semaine (lundi plus violet, dimanche plus doré), comme Tide Guide suit le ciel.
- Pourquoi : la semaine se **ressent** sans un mot.
- Respecte : aucune couleur nouvelle, seulement des proportions.
- Risque : contraste à revérifier à chaque position, performances ; à figer par jour, jamais animé en continu.

---

## 8. Pièges à éviter (livrable c)

### 8.1 Ce qui fait « tableau de bord généré par une IA » dans un planning
- Une grille de tuiles identiques avec un chiffre et une icône chacune.
- Des anneaux concentriques qui imitent ceux d'Apple ; Apple le dit pour ses propres anneaux : « Use them only for their documented purpose » [P] /workouts. Risque d'imitation en plus.
- Une carte de chaleur avec pourcentages et légende ; un score de « préparation » sans base mesurée (Vaiiya n'a pas de capteurs).
- Des étincelles « IA » partout, le dégradé violet sur chaque titre, des ombres violettes décoratives, des emojis de décoration.
- Un sous-titre sous chaque bloc ; des « Voir plus » sur tout.
- Du verre dans du verre dans du verre.
- Le remède est déjà écrit dans `AGENTS.md` (règles de composition) et `docs/humanisation-charte.md`.

### 8.2 Surcharge
- 40 muscles au lieu de 8 zones ; plus de deux priorités.
- Un questionnaire long avant toute valeur (contre-modèle BetterMe, 26 à 41 étapes).
- Le mois entier modifiable (contraire au point 40) ; des filtres empilés ; tout à la même taille.

### 8.3 Culpabilisation
- Rouge pour « non fait » (TrainingPeaks), « série en danger », « zones à problème », courbe de poids projetée, « 0/4 » en tête de semaine.
- Vaiiya a déjà les bonnes réponses : « Pas de séance ce jour-là » en gris, « t'attendait mercredi », jamais l'absence coloriée.

### 8.4 Contraste sur le verre
- Apple (WCAG AA) : **4,5:1** pour un texte jusqu'à 17 pt, **3:1** à partir de 18 pt ou en gras [P] /accessibility. Pour les éléments graphiques porteurs de sens (contour d'une capsule « prévue », zone choisie sur la silhouette) : **3:1** (WCAG 1.4.11) [M] https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- Tester sur la zone **la plus claire** du fond pastel et sur une photo claire.
- Sur une photo lumineuse, Apple pose un voile sombre de **35 %** sous le verre clair [P].
- Garder les surfaces à texte dense dans un verre « régulier » (plus de flou, plus opaque).
- Prévoir les réglages « Réduire la transparence » et « Augmenter le contraste » : `prefers-contrast` est largement pris en charge [M] ; `prefers-reduced-transparency` a un support inégal, notamment sur Safari iOS [M] ; le repli `html.perf-lite` existe déjà.
- Jamais de texte fin (300) sur du verre posé sur une photo.

### 8.5 Cibles et espacements
- Apple : **44 × 44 pt par défaut** sur iOS (minimum 28 × 28) ; environ **12 pt** d'espace autour d'un élément avec fond, **24 pt** sans fond [P] /accessibility. WCAG 2.2 : 24 × 24 px minimum (2.5.8, AA), 44 × 44 px en renforcé (2.5.5, AAA) [M] https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- La bande de 7 jours tient à 44 px (calcul en 2.3). Les zones de la silhouette ont besoin d'une zone de toucher élargie, et la liste de puces reste la voie principale.

### 8.6 Mouvement réduit
- Apple : réduire les animations automatiques et répétitives, resserrer les ressorts, suivre directement le geste, ne pas animer la profondeur, **remplacer les translations par des fondus**, **ne pas animer l'apparition ou la disparition d'un flou** [P] /accessibility.
- Ne jamais transmettre une information **seulement** par le mouvement (Apple /motion) [P].
- Le retournement de la silhouette, le plan qui se pose et le fond qui glisse ont tous une version sans mouvement.

### 8.7 Glisser-déposer
- Toute action par glisser doit avoir une alternative en un seul toucher (WCAG 2.2, 2.5.7 « Dragging Movements », AA) [M] https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html ; `ChoixJour` (« Décaler ») remplit ce rôle.
- Respecter l'hystérésis (environ 10 points) pour ne pas casser le défilement [P].
- Sur le web mobile, l'appui long ouvre aussi la sélection de texte et le menu contextuel : à neutraliser sur les poignées de glisser [M].

### 8.8 La couleur seule
- Apple : « Convey information with more than color alone » [P]. Fait = teal **et** coche ; aujourd'hui = violet **et** le mot ; prévu = contour ; repos et effort distingués par l'épaisseur.

### 8.9 Haptique dans une PWA
- **iOS Safari n'expose pas l'API de vibration** (déjà noté dans `AGENTS.md`) : aucun retour tactile web sur iPhone. Une astuce circule autour du contrôle `switch` de Safari [M], non vérifiée, à ne pas promettre.
- Sur Android, Google déconseille les vibrations « one-shot » longues, qui donnent un bourdonnement, et écrit : « Given the choice of buzzy haptics or no haptics for touch feedback, choose no haptics » [P] https://developer.android.com/develop/ui/views/haptics/haptics-principles. `navigator.vibrate` commande des vibrations à durée fixe, donc relève très probablement de la même logique (inférence) : à réserver à de rares moments forts, en impulsions très courtes. Le `[70, 50, 70]` actuel de fin de repos est à réécouter sous cet angle.
- Apple : « Reserve haptics and audio for significant moments » [P].

### 8.10 Performances
- Un seul conteneur en verre par vue de calendrier, pas un flou par cellule.
- Pas d'animation de flou.
- Tester sur un vieil iPhone (déjà signalé dans le chantier « verre partout »).

### 8.11 Le corps, avec respect
- La silhouette vient du démonstrateur, **jamais** de Nora ou Sasha ; aucun genre déduit.
- Une silhouette ni maigre ni musclée.
- Penser aux différences de membres (Train Fitness, finaliste ADA 2025) : une zone peut être « à éviter », pas seulement « à travailler ».
- Vocabulaire : « Ce que tu veux travailler », jamais « zones à problème » ; aucune promesse sur le corps (positionnement public).

### 8.12 Respecter ce qui est verrouillé
- Pas de jauge musculaire (41), pas de règle universelle de récupération (36), pas de compteur en tête de semaine (12).
- Vocabulaire du point 29 ; pas de petite police explicative.
- Photos naturelles ; un seul bouton violet par écran ; « adaptation » et jamais « adaptation automatique ».

---

## 9. Si l'on maquette demain : un ordre possible

Louis est visuel : **maquette d'abord, code après son GO.** Proposition pour une « maquette 09 », un écran à la fois, chacun avec sa version mouvement réduit et sa version sombre :
1. **Ce que tu veux travailler** : la silhouette (idée 1) et ses puces, à trancher d'abord à cause du point 41.
2. **Par séance** : le temps qui se voit (idée 3).
3. **Ton programme** : l'affiche (idée 7) et l'empreinte (idée 2), puis le plan qui se pose (idée 8).
4. **Ma semaine** : la semaine-silhouette (idée 4) avec le glisser (idée 11) et la ligne « pourquoi » (idée 10).
5. **Le mois** : les points et le ruban d'adaptation (idées 6 et 5).

---

## 10. Sources

### Primaires lues aujourd'hui [P]
- Apple Design Awards : https://developer.apple.com/design/awards/2023/ · https://developer.apple.com/design/awards/2024/ · https://developer.apple.com/design/awards/2025/ · https://developer.apple.com/design/awards/ (2026)
- App Store Awards 2025 : https://developer.apple.com/app-store/app-store-awards-2025/
- Articles développeurs Apple : https://developer.apple.com/developer-stories/ · Gentler Streak https://developer.apple.com/news/?id=3m0ht22s · Any Distance https://developer.apple.com/news/?id=uiiopcl8 · Tiimo https://developer.apple.com/articles/tiimo/ · Duolingo https://developer.apple.com/news/?id=jhkvppla · Monzo https://developer.apple.com/news/?id=1q3azf1j · Zoho https://developer.apple.com/news/?id=to37r18t · Moonlitt https://developer.apple.com/news/?id=v1nphz91 · Tide Guide https://developer.apple.com/news/?id=4r9b23wx · Sunlitt https://developer.apple.com/articles/sunlitt/
- Sessions WWDC : Meet Liquid Glass https://developer.apple.com/videos/play/wwdc2025/219/ · Get to know the new design system https://developer.apple.com/videos/play/wwdc2025/356/ · Design foundations from idea to interface https://developer.apple.com/videos/play/wwdc2025/359/ · Designing Great ML Experiences https://developer.apple.com/videos/play/wwdc2019/803/ · Designing Fluid Interfaces https://developer.apple.com/videos/play/wwdc2018/803/ · Practice audio haptic design https://developer.apple.com/videos/play/wwdc2021/10278/
- Human Interface Guidelines : materials, color, accessibility, onboarding, workouts, charting-data, machine-learning, generative-ai, undo-and-redo, alerts, drag-and-drop, motion, playing-haptics, loading, sliders, segmented-controls, pickers, sheets, modality, toutes sous https://developer.apple.com/design/human-interface-guidelines/
- Google : https://developer.android.com/develop/ui/compose/designsystems/material3 · https://developer.android.com/design/ui/wear/guides/get-started/levels-expression · https://developer.android.com/develop/ui/views/haptics/haptics-principles

### Secondaires [S]
- Fitbod : https://fitbod.me/blog/muscle-recovery/ · https://fitbod.me/blog/tracking-volume-intensity-and-recovery-with-fitbod/
- Hevy : https://www.hevyapp.com/features/muscle-group-workout-chart/ · https://www.hevyapp.com/features/gym-performance/ · https://help.hevyapp.com/hc/en-us/articles/35119778922263 · https://www.apkmirror.com/?p=11862319
- MuscleWiki : https://musclewiki.com · Planfit : https://planfit.ai/en/tools/muscle-anatomy · cartes 3D : https://apps.apple.com/app/id6782176731 · https://apps.apple.com/app/id6771045369 · https://apps.apple.com/us/app/-/id6757164368
- BetterMe : https://builtformars.com/company/betterme · https://screensdesign.com/showcase/betterme-health-coaching · https://lazyweb.com/flow/betterme/onboarding
- Freeletics : https://www.freeletics.com/en/blog/posts/new-coach-week-day-view · https://www.freeletics.com/en/blog/posts/how-to-work-with-your-freeletics-coach-to-stay-consistent/ · https://forum.freeletics.com/t/how-to-see-training-journey-workout-plan/18879
- Apple Fitness+ Plans : https://9to5mac.com/2023/06/21/create-custom-apple-fitness-plans-ios-17/ · https://iphonelife.com/content/how-to-build-apple-fitness-workout-plan · https://igeeksblog.com/?p=642145
- Runna et Strava : https://therunnerbeans.com/runna-coaching-app-review/ · https://www.tomsguide.com/reviews/runna-app · https://screensdesign.com/apps/runna-running-training-plans/ · https://www.zelpio.com/blog/runna-app-review-2026/ · https://marathonhandbook.com/strava-announces-acquisition-of-personalized-training-app-runna/ · https://sifted.eu/articles/strava-buys-runna-deal-fitness-app · https://support.strava.com/hc/en-us/articles/206535704
- TrainingPeaks : https://help.trainingpeaks.com/hc/en-us/articles/204861204 · https://help.trainingpeaks.com/hc/en-us/articles/204072164-How-do-I-move-a-workout · https://www.trainingpeaks.com/coach-blog/speed-up-your-coaching-with-5-trainingpeaks-calendar-efficiency-features/
- Gentler Streak et The Outsiders : https://sg.news.yahoo.com/fitness-app-shows-apple-better-180000454.html · https://9to5mac.com/2022/06/25/gentler-streak-interview-watchos-9/ · https://lifestack.ai/blog/gentler-streak · https://apps.apple.com/us/app/the-outsiders-athlete-tracker/id6751584800 · https://www.ithinkdiff.com/gentler-stories-the-outsiders-athlete-tracker/
- Oura : https://ouraring.com/blog/readiness-score/ · https://support.ouraring.com/hc/lv/articles/5949130374547-Glossary · https://www.techcrunch.com/2025/10/20/oura-launches-redesigned-app-and-cumulative-stress-feature · https://www.businesswire.com/news/home/20251020302425/en · https://www.techbetweenthelines.com/oura-overhauls-app-experience-and-introduces-cumulative-stress-tracking/ · https://tech.yahoo.com/wearables/articles/ouras-made-big-changes-app-182805861.html
- WHOOP : https://www.whoop.com/us/en/thelocker/the-research-and-development-behind-strength-trainer/ · https://www.businesswire.com/news/home/20230425005456/en · https://the5krunner.com/2026/02/28/new-whoop-strength-trainer-update/
- Structured et Amie : https://apps.apple.com/app/structured-daily-planner/id1499198946 · https://structured.app/blog/getstarted · https://techcrunch.com/2022/03/17/amie-is-a-new-calendar-app-with-a-social-twist · https://www.producthunt.com/posts/amie-4 · https://thereport.substack.com/p/a-joyful-calendar
- Material 3 Expressive (presse) : https://9to5google.com/2025/05/05/material-3-expressive-leak/ · https://www.androidauthority.com/google-material-3-expressive-details-3554486/ · https://chromeunboxed.com/google-leaks-the-reason-and-process-behind-their-new-material-3-expressive-design-language/ · https://www.designwhine.com/material-3-expressive-details/ · https://www.dezeen.com/2025/05/28/google-ushers-in-age-of-expressive-interfaces-with-material-design-update/
- Webby et Google Play : https://winners.webbyawards.com/2023/apps-software/general-apps/health-wellness-fitness/248829/apple-fitness · https://winners.webbyawards.com/2022/apps-and-software/general-mobile-ott-apps/health-fitness/218549/apple-fitness · https://winners.webbyawards.com/2024/apps-software/general-apps/health-wellness-fitness/291802/betterme-mental-health · https://vitals.sutterhealth.org/scout-by-sutter-health-wins-prestigious-webby-award-for-health-wellness-and-fitness-app-excellence/ · https://www.webbyawards.com/press/press-releases/30th-annual-webby-awards-announce-2026-winners/ · https://blog.google/products/google-play/google-play-best-apps-games-2024/ · https://blog.google/products/google-play/best-apps-games-2025/
- Presse ADA : https://9to5mac.com/2026/06/02/apple-reveals-apple-design-awards-app-and-game-winners-for-2026/ · https://www.macrumors.com/2026/06/02/apple-design-award-winners-2026/ · https://bgr.com/tech/2024-apple-design-awards-winners-announced-procreate-dreams-gentler-streak-more/
- Motifs de traqueurs : https://screensdesign.com/articles/workout-tracker-app-design-examples/

### Références non revérifiées aujourd'hui [M]
- WCAG 2.2 : https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html · https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html · https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- Divulgation progressive (NN/g) : https://www.nngroup.com/articles/progressive-disclosure/
- Une question par page (GOV.UK) : https://design-system.service.gov.uk/patterns/question-pages/
- Aza Raskin, « Never Use a Warning When You Mean Undo » : https://alistapart.com/article/neveruseawarning/
- Buell et Norton, « The Labor Illusion », Management Science, 2011.
- Fantastical : https://flexibits.com/fantastical
- Médias CSS : https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion · https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency

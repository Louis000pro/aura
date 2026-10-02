# Décisions — refonte du planning

## Validées par Claude et Codex (tour 2)
1. **Un seul écran « Ma semaine »**, gestes manuels directs (Ajouter, Déplacer, Retirer, Lancer), sans quota. Le quota de 3/semaine ne concerne que le Guide.
2. **Pas de file « La suite » permanente.** Une ligne compacte « Prochaine séance · X » (avec sa date si elle est placée) ; la toucher ouvre l'ordre du programme.
3. **Une séance prévue un autre jour se lance aujourd'hui** (« Faire cette séance maintenant »). Le fait se date du jour réel (règle V7A déjà en place).
4. **Le passé n'est jamais transformé automatiquement.** Il sort des actions prioritaires, reste consultable, et seule une décision explicite le reprend, le déplace ou le retire. Aucun saut implicite, aucune remise en « non daté ».
5. **Un repas prévu non noté n'est pas « non mangé ».** Il reste une trace discrète, sans jugement.
6. **Photos naturelles, y compris pour le passé.** On atténue le texte et la place, jamais l'image (verrou du 2026-07-13).
7. **Les gestes transmettent l'identité de l'élément** (id + date complète), jamais un nom de jour. Le Guide accompagne, il ne redésigne pas.
8. **Ajouter ≠ Remplacer** : choisir un jour occupé n'écrase rien implicitement.
9. **Architecture** : domaines séparés en base (table d'intentions repas dédiée, reliée à `nutrition_logs`), modèle de lecture commun pour « Ma semaine » (élément daté = domaine, état, identité, actions autorisées). Un repas prévu ne compte jamais dans les calories consommées.
10. **Planning et journal réunis** : une réalisation s'affiche une seule fois, via la liaison `workout_sessions.seance_prevue_id` (jamais par titre + date).
11. **Extraction ciblée** de `progression/page.tsx` (semaine, ligne de journée, feuille d'actions, sélecteur de date) au-dessus d'une couche de commandes partagée ; catalogue hors périmètre.

## Validées par Claude et Codex (tour 3)
12. **Aucun compteur en tête de semaine.** Les récapitulatifs existants restent à leur place. Le badge « Équilibrée / Ciblée » part de l'en-tête ; la phrase du Guide reste, plus une action discrète « Voir la répartition ».
13. **« Refais ma semaine » garde son comportement actuel** pendant la refonte. « Placer mes prochaines séances » est une proposition distincte.
14. **Placement groupé** : réservations explicites, aperçu, respect de l'existant et des adaptations, chaque étape au plus une fois, `generateWeek` intact. Le comportement hors ordre reste à cadrer avant tout code.
15. **Annuler** : commande inverse courte, seulement là où le retour est sûr, y compris les conséquences (un repos retiré doit revenir). Jamais d'effacement d'un fait ni d'écrasement d'une réservation neuve.
16. **Lecture ratée = « Planning indisponible »**, jamais une semaine vide.

## Validées par Claude et Codex (tour 4 : programme et calendrier, soulevé par Louis)
Constat vérifié dans le code : la semaine régénérée (`generateWeek`) tourne depuis l'étape 1 sans lire le curseur, n'écrit que la provenance, et le héros donne priorité au daté. Résultat : une séance manquée disparaît derrière la suivante. Une séance manquée par manque de temps ne doit jamais valoir un saut.
17. **Trois responsabilités** : le programme dit QUOI et dans quel ordre ; les jours d'entraînement disent QUAND on peut s'entraîner ; le journal garde ce qui a été fait.
18. **Le contenu d'un jour d'entraînement à venir se calcule à la lecture**, dans l'ordre du cycle, depuis la prochaine séance. Une séance manquée glisse au prochain jour d'entraînement, le passage du temps ne consomme jamais rien, aucun rattrapage n'ajoute de séance.
19. **Les séances futures sont des prévisions**, expliquées par une seule phrase commune : « Ton programme suit ton rythme. Une séance manquée t'attend au prochain jour d'entraînement. »
20. **Un jour d'entraînement n'est pas une séance** : stockage dédié (règle hebdomadaire + exceptions datées), jamais une intention `seance` vide. Migration SQL et révision de décisions verrouillées : validation explicite de Louis requise.
21. **Une seule résolution** partagée par l'accueil, la semaine, le Guide et les rappels.
22. **Lancer fige** : on relit la prochaine séance, on montre son vrai contenu avant de commencer, et l'étape visée ne change plus. Abandon = rien n'avance ; fin = une seule consommation.
23. **Sauter reste un geste explicite.** Une séance hors programme compte comme réalisée et ne consomme aucune étape ; « Remplacer la prochaine séance » reste disponible.
24. **Pas de compression** des séances manquées ; l'ordre du cycle ne garantit pas la récupération (`buildSplit` enchaîne Full Body → Haut du corps).
25. **Adaptations** : étapes masquées traversées sans être consommées, appliquées à la date de chaque jour projeté.
26. **Rappels** : un jour d'entraînement choisi peut en déclencher un, résolu au moment de l'envoi avec la même logique.
27. **Migration sans conversion silencieuse** : faits, sauts et séances posées par la personne ou le Guide conservés ; aperçu avant de remplacer les anciennes semaines automatiques ; réservations traitées à part.
28. **Changer ses jours ne change pas le programme** (le nombre de jours et la forme du cycle se séparent), et **une lecture du curseur ratée n'est pas « rien de fait »** (`positionConsommee` repart aujourd'hui au début sur erreur).
29. Vocabulaire : « Mes jours d'entraînement », « Prochaine séance » ; jamais « créneau » ni « étape » à l'écran.

## Validées par Claude et Codex (tour 5 : un programme personnalisé, plus une roulette)
Constat vérifié dans le code : `buildSplit(n)` ne dépend que du nombre de séances par semaine ; l'objectif ne sert qu'au nom et aux séries/répétitions ; le niveau n'est pas lu ; aucune priorité n'est demandée. Et le journal enregistre la liste PRÉVUE (`WorkoutGuideModal`, `exercises: exercises`) : `doneMap` n'est jamais sauvegardé.
30. **Le générateur change, pas le moteur.** On enrichit les tables existantes (`programmes`, `programme_seances`, `intentions_entrainement`, adaptations) ; pas de troisième modèle de planning. Les acquis V4 à V9 restent : identité explicite, historique protégé, absence non consommée, substitution déclarée, contraintes datées, lecture sans écriture.
31. **Le programme part de ce que la personne veut** : une priorité principale (ou « Équilibre général »), une seconde facultative, jours et temps disponibles, matériel. Les exercices aimés ou évités se renseignent depuis les séances, pas par un long questionnaire.
32. **Le contenu est fixé dans la version du programme** (exercices, ordre, prescription de référence) ; le lancement ne le retire pas au hasard. Une version courte ou légère est une variante explicite de cette référence. Changer de priorité crée une nouvelle version avec aperçu ; les séances en attente de l'ancienne sont traitées explicitement (gardées, remplacées ou retirées), jamais effacées.
33. **Des occurrences, pas une lettre.** Chaque séance prévue est une occurrence identifiée (A₁, B₁, C₁, A₂… en interne). La suite se calcule depuis les occurrences encore en attente, dans l'ordre du programme, et non depuis la dernière étape faite : faire C avant B laisse B proposée ensuite. Une occurrence déplacée garde son identité. Évoluent ensemble : réservation, modification, clôture (`reservationDeLEtape`), calcul de la suivante, protections ; `uniq_intention_par_etape` devient « une seule clôture par occurrence », avec un enregistrement rejouable sans doublon. Une répétition crée une réalisation indépendante.
34. **Le journal devient fiable en V1** : chaque exercice réalisé est rattaché à un élément stable du contenu lancé ; on distingue série déclarée faite, répétitions renseignées, exercice passé, charge avec unité, et inconnu. Arriver à l'écran de fin ne vaut pas réalisation de toute la prescription. Les anciens journaux restent « inconnu ». Ressenti facultatif (« Facile / Bien / Dur »).
35. **Aucune dette hebdomadaire.** Une séance non faite reste en attente sans limite de semaine ; un volume visé sert à composer, jamais à rembourser. Pas de séries doublées après une absence.
36. **Pas de règle sportive universelle codée** (10 séries par muscle, 48 h, bloc et test obligatoires). Récupération jugée par recouvrement réel entre ce qui a été fait et ce qui est proposé, avec trois sorties : faire quand même, variante adaptée, déplacer. Fatigue et courbatures se distinguent de la douleur, qui ne promet aucune adaptation médicale.
37. **Pas de progression automatique en V1** à partir d'un ressenti global : il ne mesure pas chaque exercice. La progression par exercice (V2) exige des réalisations comparables et renseignées.
38. **« J'ai 25 min »** : la version courte reste la même séance si elle garde son rôle essentiel (défini par séance, pas de seuil en minutes) ; sinon on propose une autre séance et la substitution se déclare. L'écran montre ce qui reste, la durée et ce que ça compte. Réduire le temps d'un jour et raccourcir une séance sont deux gestes distincts.
39. **Règles déterministes, l'IA explique** : contraintes → matériel → temps → priorité → travail récent → continuité. Un recalcul ne réécrit jamais un choix manuel ; il nomme ce qui change (« Vendredi devient une séance courte »). Une habitude répétée donne une proposition, jamais un changement.
40. **Contrôle sur les semaines** : cette semaine et la suivante pleinement modifiables avec les mêmes gestes ; un aperçu plus lointain reste secondaire. Une absence suspend les propositions sans effacer les séances en attente.
41. **À l'écran** : le héros reste la séance, sa raison tient sur une ligne ; pas de jauges musculaires. « Ce que tu veux travailler » remplace l'édition manuelle de l'ordre (qui retire « Dans quel ordre » de la maquette 04).
42. **Découpage** : V1 = composeur par priorités, contenu fixé, occurrences, journal fiable, deux semaines modifiables, version courte, absence. V2 = carnet de charges, progression par exercice, blocs et réévaluation.

## Validées par Claude et Codex (tour 6 : variété et progression, demandées par Louis)
Retour de Louis sur la maquette 05 : les mêmes séances chaque semaine restent une roulette ; « J'ai 25 min » doit accepter n'importe quelle durée ; il veut le poids visé dans le tunnel et un coach qui demande comment c'était, pour une vraie progression.
43. **Le programme fixe des rôles et des exercices repères, plus la liste exacte** (corrige le point 32). Les exercices repères restent plusieurs séances réellement faites ; les exercices complémentaires varient, préparés à l'avance, sans redondance. Réglage simple : « Un peu de nouveauté » (par défaut) · « Davantage de stabilité » · « Garder mes exercices ». Garder ou remplacer un exercice à l'unité reste possible. Une séance manquée ne renouvelle pas ses exercices.
44. **Trois niveaux** : programme (objectif, rôles, repères, règles de variation) · séance prévue (exercices concrets enregistrés quand les prochaines séances sont préparées, identiques sur tous les appareils) · séance commencée (copie de la prescription, puis résultats réels). Une cible peut évoluer après la séance précédente : c'est une modification explicite, acceptée. Une séance commencée ne change jamais.
45. **Durée libre** (« j'ai 17 min » est compris) : le calcul compte séries, repos, côtés, changements de matériel et préparation. On retire d'abord exercices et séries selon les priorités de la séance ; les enchaînements sans pause seulement s'ils sont prévus pour ce niveau et ce matériel. L'aperçu montre ce qu'on garde, ce qu'on retire et si ça compte pour la séance prévue. Une version express ne ferme pas automatiquement une séance complète.
46. **La progression entre en V1** (corrige le point 37). Dans le tunnel, la cible est affichée et la confirmation dit ce qui est enregistré (« Fait : 10 × 16 kg »), corrigeable tout de suite ; un minuteur terminé ne vaut pas déclaration.
47. **Double progression explicable** : fourchettes de départ par orientation (force 4 à 6 sur certains repères ; muscle 6 à 12 sur les principaux, 10 à 20 sur des accessoires ; reprise 8 à 15), adaptées par exercice et niveau. Hausse proposée seulement sur résultats confirmés et comparables, haut de fourchette atteint avec de la marge ; incertain = on garde ou on demande ; difficulté inhabituelle = ajustement contextualisé ; un écart sous la fourchette déclenche une question, pas un diagnostic. Le cran dépend du matériel disponible (par haltère, charge totale, assistance).
48. **Une question, après la dernière série d'un exercice repère** : « tu aurais pu en faire encore… Aucune · 1 ou 2 · 3 ou plus · Je ne sais pas ». Elle décrit cette série. La proposition qui suit est unique et motivée, avec « Accepter / Garder ». Rien ne change sans accord ; pas de confirmation quand rien ne change.
49. **Maison** : la cible dépend du mouvement, du niveau et de l'objectif, pas du lieu ; pas d'échec imposé. Quelques chemins de progression maison bien définis (répétitions, variante plus difficile…) entrent en V1. Changer d'exercice pendant la séance (machine prise, pas envie) propose un équivalent du même rôle.
50. **Pas de chiffre inventé** : sans donnée suffisante, l'exercice reste utilisable et Vaiiya ne propose pas de charge. Première fois : « choisis une charge que tu pourrais soulever environ 12 fois », ajustement proposé après la première série.
51. **V2** : allègement sur signaux (proposé, jamais imposé), chaînes de variantes complètes, préférences apprises. Le choix laissé à l'utilisateur se défend par l'expérience, pas par une preuve d'assiduité (APART 2025 : 69,5 % contre 71,2 %).

## En attente de Louis (prioritaire : programme et calendrier)
Tour 5, tranché par Louis : 1 = oui (programme construit par objectif) · 2 = oui (une priorité + une seconde facultative, ou « Un peu de tout ») · 3 = oui (cette semaine et la suivante modifiables, aperçu au-delà) · 4 = oui (changer d'objectif = aperçu avant activation, séance en attente gardée / remplacée / retirée). Maquette `05-maquette-lina.html` : retours de Louis intégrés aux points 43 à 51. Maquette `06-maquette-boucle.html` (une séance de bout en bout) à valider.
Réponses de Louis : A = GO sur le principe 17 à 29 · B = jour fixe récurrent plus tard · C = maquette d'abord (`04-maquette-programme.html`).
Maquette 04, tranché par Louis : « t'attendait mercredi » gardé · « Pas de séance ce jour-là » gardé (gris, sans alerte) · « Compter à la place de Pull » dans le message de fin d'une séance libre.
Écran « Mes jours d'entraînement » : choix « Chaque semaine / Cette semaine ». En « Chaque semaine », deux réglages séparés : « Quand » (les jours) et « Dans quel ordre » (la suite des séances, réordonnable, ajout possible) ; aucune séance n'est affichée à côté d'un jour, sinon on croit que lundi = Bas du corps pour toujours (retour de Louis). En « Cette semaine », chaque jour daté a un interrupteur et la séance qui tombe dessus s'affiche en direct.
Retours de Louis sur la maquette 06 (en discussion avec Codex, tour 7) :
- Variété : « Davantage de stabilité » et « Garder mes exercices », c'est pareil. Il faut trois choix : toujours les mêmes exercices, un peu de nouveauté à chaque fois, ou presque tout qui change.
- Tunnel : pas de formulaire pendant le repos. Petites questions et petites validations seulement, jamais une saisie obligatoire.
- Le tunnel de la maquette ne ressemble pas au vrai. Garder le bon de l'ancien : personnage animé qui guide, chrono ou répétitions en grand, conseil du Guide, repos orange avec « Ensuite ».
- Question après un repère : « Je ne sais pas » et « Passer » font doublon, n'en garder qu'un.
- Fin de séance : trop d'informations et aucune qui ressort. À refaire, avec une hiérarchie claire.
- Beauté, cohérence, simplicité, personnalisation.
Direction de Louis : pas d'explication en petite police sous les éléments ; à terme, retirer un maximum de petites descriptions. La fonctionnalité doit se comprendre par ce qu'elle montre.

## En attente de Louis (suspendues, maquette `03-maquette-commune.html`)
1. La hiérarchie « jours + une ligne Prochaine séance » lui convient-elle ?
2. « Placer mes prochaines séances » dès la première version ?
3. GO pour une passe de corrections séparée : répétition depuis la semaine, liaison intention ↔ journal (identité, répétition, échec d'enregistrement traités ensemble), contexte perdu de « Décaler / Remplacer ».

## Écartées (avec la raison)
- **File « La suite » au-dessus des jours** : double l'affichage et fait passer le programme avant « qu'est-ce que je fais ».
- **Désaturer les photos du passé** : contredit le verrou « photos naturelles ».
- **« Non mangé, il s'efface le lendemain »** : l'absence de journal ne prouve rien.
- **Badge « Équilibrée / Ciblée » permanent** : calcul trop fragile (familles déduites du titre) pour mériter la place.
- **Une semaine régénérée fait avancer le cycle** (dans cette refonte) : incompatible avec `uniq_intention_par_etape` sans décision sur les occurrences multiples.

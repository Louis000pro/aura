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

## En attente de Louis (prioritaire : programme et calendrier)
Réponses de Louis : A = GO sur le principe 17 à 29 · B = jour fixe récurrent plus tard · C = maquette d'abord (`04-maquette-programme.html`).
Questions de la maquette 04 : (1) garder « t'attendait mercredi » sous la séance décalée ; (2) afficher « Pas de séance ce jour-là » sur un jour d'entraînement passé ; (3) proposer « Compter à la place de Pull » dans le message de fin d'une séance libre.

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

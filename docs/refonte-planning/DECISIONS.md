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

## En attente de Louis (maquette `03-maquette-commune.html`)
1. La hiérarchie « jours + une ligne Prochaine séance » lui convient-elle ?
2. « Placer mes prochaines séances » dès la première version ?
3. GO pour une passe de corrections séparée : répétition depuis la semaine, liaison intention ↔ journal (identité, répétition, échec d'enregistrement traités ensemble), contexte perdu de « Décaler / Remplacer ».

## Écartées (avec la raison)
- **File « La suite » au-dessus des jours** : double l'affichage et fait passer le programme avant « qu'est-ce que je fais ».
- **Désaturer les photos du passé** : contredit le verrou « photos naturelles ».
- **« Non mangé, il s'efface le lendemain »** : l'absence de journal ne prouve rien.
- **Badge « Équilibrée / Ciblée » permanent** : calcul trop fragile (familles déduites du titre) pour mériter la place.
- **Une semaine régénérée fait avancer le cycle** (dans cette refonte) : incompatible avec `uniq_intention_par_etape` sans décision sur les occurrences multiples.

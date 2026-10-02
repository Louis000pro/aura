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

## En attente de Louis
- « Refais ma semaine » fait-il avancer le cycle ? (Claude et Codex : pas dans cette refonte, les invariants V6 ne le permettent pas sans règle neuve.)
- Les deux défauts vérifiés dans le code (répétition depuis la semaine, liaison du journal) : les corriger tout de suite, hors refonte ?

## Écartées (avec la raison)
- **File « La suite » au-dessus des jours** : double l'affichage et fait passer le programme avant « qu'est-ce que je fais ».
- **Désaturer les photos du passé** : contredit le verrou « photos naturelles ».
- **« Non mangé, il s'efface le lendemain »** : l'absence de journal ne prouve rien.
- **Une semaine régénérée fait avancer le cycle** (dans cette refonte) : incompatible avec `uniq_intention_par_etape` sans décision sur les occurrences multiples.

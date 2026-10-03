# Plan d'implémentation de la refonte du planning (proposition, à relire par Codex)

Base : décisions 17 à 60 de `DECISIONS.md`, maquettes 04 à 07. La maquette 07 a reçu le GO de Louis le 2026-10-03.

Principe : des vagues courtes, chacune utile seule, et chacune vérifiable hors ligne par `npm run check:programme`, parce que l'app est protégée par une connexion. Les décisions sont des fonctions pures ; les écritures passent par une seule autorité. On écrit d'abord ce qui rend les données vraies, puis on construit dessus.

## Ce que le code fait aujourd'hui (constaté)

- La fin de séance (`WorkoutGuideModal.tsx`, autour de la ligne 910) enregistre `exercises` : c'est la liste **prévue**. `doneMap` n'est jamais enregistré. L'erreur d'insertion est avalée (`if (error) return`).
- Le récapitulatif affiche le nombre de séries prévu, pas le nombre fait.
- Le cycle n'a qu'une seule position (`positionConsommee`). `reservationDeLEtape` fait un `limit(1)`. Faire C avant B ne garde donc pas B.
- Une intention porte sa liste d'exercices (`exercise_list`) sans rôle (repère ou complémentaire), sans fourchette et sans charge.
- Aucune charge n'est enregistrée nulle part.

## Les vagues

**R1 · Le journal dit la vérité.** Aucun changement visible, sauf le nombre de séries de la fin.
- Nouvelle table `series_realisees` : `workout_session_id`, `exercice_cle`, `ordre`, `statut` (`faite` | `passee`), `reps`, `duree_s`, `charge`, `unite` (`kg` | `kg_par_haltere` | `poids_du_corps`), `source` (`cible_confirmee` | `corrigee`), `remplace` (clé de l'exercice remplacé).
- `exercice_cle` = l'identifiant stable de `exerciseLibrary`, et pas le nom.
- La fin de séance écrit le fait réel. Si l'écriture échoue, on le dit, au lieu de l'avaler.
- Le récapitulatif compte les séries confirmées.

**R2 · La séance prévue sait ce qu'elle demande.**
- Rôle, séries, fourchette, charge cible et incrément du matériel sur chaque exercice prescrit.
- Une table `etape_exercices` donne les exercices d'une étape. La prescription d'une occurrence est figée dans l'intention au moment où elle est préparée (décision 45), donc identique sur tous les appareils.
- Migration additive : sans prescription, le tunnel garde son comportement actuel.

**R3 · Le tunnel complété (maquette 07, écrans 02 à 07).**
- La charge sous les répétitions, avec le crayon.
- « Fait · 10 × 60 kg ».
- La ligne d'enregistrement pendant le repos, avec « Corriger ».
- La saisie protégée à la fin du repos.
- « Changer » pendant l'exercice, avec la règle des séries déjà faites.
- Aucun changement pour les séances du catalogue sans prescription.
- ⚠️ `WorkoutGuideModal.tsx` est un fichier monolithe : un seul agent à la fois, en passes courtes.

**R4 · La progression.**
- `prochaineCible(historique, prescription, materiel)` est une fonction pure.
- Double progression dans la fourchette. Une montée n'est proposée que sur des séries confirmées et comparables, avec un incrément selon le matériel. Un résultat sous la fourchette fait poser une question. Un résultat incertain fait garder la cible.
- La question après un repère (0 à 2 par séance, décisions 53, 54 et 57).
- La proposition de fin de séance avec Accepter / Garder. Une proposition acceptée devient la cible de la prochaine occurrence, et rien d'autre.

**R5 · La fin de séance refaite (maquette 07, écrans 08 à 10).**
- Les quatre étages.
- Les états « sans comparaison » et « question facultative ».
- Les fonctions existantes (garder la séance, partage, badges, relais) restent, en secondaire.

**R6 · Les occurrences (décisions 30 à 42).**
- Une fermeture par occurrence, enregistrée de façon idempotente.
- Faire C avant B garde B proposée.
- Pas de dette hebdomadaire.
- C'est la vague la plus délicate pour la base : contrainte `uniq_intention_par_etape`, curseur.

**R7 · La variété.**
- Le réglage à trois choix (écran 01).
- Le choix des exercices complémentaires parmi un vivier, au moment où l'occurrence est préparée.
- Une séance manquée garde ses exercices.

**R8 · La durée libre (maquette 06, écran 02).**
- Une estimation qui compte les séries, les repos, les côtés, les changements de matériel et l'échauffement.
- On retire d'abord des exercices et des séries.
- La version courte ne ferme pas automatiquement la séance complète.

**R9 · Le programme par priorités (maquette 05).**
- Choix des priorités et composition du programme.
- Deux semaines modifiables, un aperçu au-delà.
- Changement d'objectif avec aperçu avant activation.

## Ordre proposé et pourquoi

R1 → R2 → R3 → R4 → R5 donnent la boucle de la maquette 07 de bout en bout. R6 → R7 → R8 → R9 rendent ensuite le programme personnel.

On commence par le journal parce que tout le reste se calcule dessus : une progression calculée sur la liste prévue mentirait.

## Ce que chaque vague demande à Louis

- Une migration SQL par vague, dans `supabase/migrations/`, appliquée seulement avec son accord.
- Un essai sur la préversion à la fin de R1, R3, R5 et R9.
- Rien n'est fusionné dans `main` sans son GO.

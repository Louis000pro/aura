# Plan d'implémentation de la refonte du planning

**Validé avec Codex au tour 8.** Ordre retenu : **R1 → R6 → R2 → R3 → R4 → R5 → R9 → R7 → R8**. Le code part de `main` (décision de Louis). R1 est codée : voir la fin du fichier.

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

## Corrections de Codex au tour 8 (retenues)

- **Ordre.** Les occurrences (R6) passent avant la progression : appliquer une proposition à « la prochaine occurrence » demande son identité. R6 couvre tout le parcours de l'identité :
  - préparation, réservation, lancement ;
  - déplacement, substitution, fermeture.

  Une occurrence a une identité avant son lancement, même sans date. Refaire C1 crée une séance réalisée sans refermer C1 une seconde fois. R9 passe avant la variété.
- **Trois identités** :
  - la clé stable de l'exercice ;
  - l'emplacement dans la séance (un même exercice peut passer deux fois) ;
  - l'identifiant de la série.
- **La bibliothèque n'avait pas de clé stable.** R1 l'ajoute (`src/lib/exerciceCle.ts`). On n'invente aucune équivalence pour un nom inconnu.
- **La charge** a une unité, un type (totale, par haltère, assistance, poids du corps) et peut rester inconnue, jamais zéro par défaut. Elle appartient à la personne et à son matériel, pas au modèle d'étape (R2).
- **L'autorité de finalisation** : journal d'abord, cible ensuite, récompenses après ; identifiant de lancement unique en base ; rien ne se perd en cas d'échec ; `started_at` = l'heure du début.
- **Confirmation ≠ passage.** Avant R3, une série « terminée » n'affirme ni les répétitions ni la charge. Un minuteur fini, un minuteur abrégé et un bouton sont trois faits. « Passée » (geste explicite) ≠ « non atteinte ».
- **La vérification réelle** : `check:programme` ne prouve ni les transactions, ni les droits, ni la concurrence. Les scénarios suivants sont à jouer sur une base de test :
  - une finalisation rejouée ;
  - une insertion refusée sans fermeture ;
  - les droits sur les séries d'un autre compte ;
  - C1 avant B1 ;
  - un remplacement après une série ;
  - une séance raccourcie.
- **R9 inclut** « Ma semaine » partagé, les deux semaines modifiables, l'absence, les séances manquées, et la cohérence avec l'accueil, le Guide et les rappels.
- Les migrations se regroupent selon leurs dépendances réelles, pas une par vague.

## R1 · fait (2026-10-03)

- **`src/lib/journalSeance.ts`.** Les décisions sont pures :
  - `lignesDuJournal`, `journalDe`, `seriesConfirmees`, `exercicesFaits` ;
  - `finaliserSeance` : séance en attente → enregistrement → cible refermée → retrait de l'attente ;
  - `rejouerJournalEnAttente`, appelé par `PresenceDuJour`.
- **`src/lib/exerciceCle.ts`** : 102 clés figées, alignées sur les personnages-guides.
- **Le tunnel.**
  - Le prop `onComplete` disparaît, remplacé par `cible`. Le lanceur global et « Organiser » transmettent la cible au lieu de refermer eux-mêmes.
  - « Passer l'exercice » marque les séries passées. « Valider » sur un minuteur marque une durée abrégée.
  - Le récapitulatif compte les séries et exercices faits.
  - Un échec affiche « Pas encore enregistrée · Réessayer ».
  - Maillon, rang, badges et affiche ne partent qu'après un enregistrement neuf.
- **`verrouDeFermeture` est supprimé.** L'unicité est tenue par la base.
- **SQL `supabase/migrations/20261003_r1_journal_series.sql`** :
  - colonnes `lancement_id`, `termine_le`, `journal_version` ;
  - table `series_realisees`, en lecture seule pour son propriétaire ;
  - fonction `enregistrer_seance(p)` : transactionnelle et idempotente.

  Tant qu'elle n'est pas appliquée, le repli écrit la séance comme avant, sans ses séries.
- **Limites connues** :
  - Une séance commencée avant minuit et finie après ne crédite pas les missions du jour : le déclencheur compare la date de `started_at`, désormais l'heure du début.
  - Si l'app se ferme entre l'enregistrement et la fermeture d'une **étape**, la fermeture n'est pas rejouée : une étape se referme par une insertion, et un double serait pire. R6 le règle avec les occurrences.
  - Le repli sans migration n'est pas idempotent.

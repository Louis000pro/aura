# Plan d'implémentation de la refonte du planning

**Validé avec Codex au tour 8.** Ordre retenu : **R1 → R6 → R2 → R3 → R4 → R5 → R9 → R7 → R8**. Le code part de `main` (décision de Louis). R1 et R1 bis sont codées : voir la fin du fichier.

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

- **Limite connue** : une séance commencée avant minuit et finie après ne crédite pas les missions du jour : le déclencheur compare la date de `started_at`, désormais l'heure du début.

## R1 bis · fait (2026-10-03), après la relecture de Codex (tour 9)

Les sept points de Codex, dans l'ordre :

1. **Une fermeture ratée reste en attente.** `fermerCible` (`finSeance.ts`) rend un résultat vérifié : `fermee`, `deja`, `introuvable` ou `echec`. Une mise à jour qui ne touche aucune ligne est relue avant de conclure. Seul `echec` laisse le travail en attente. « Journal enregistré » et « séance finalisée » sont deux champs distincts du résultat.
2. **Le rejeu est idempotent.** La fermeture se date avec le journal : `consommee_le` = sa fin, `date` = le jour parisien de sa fin (`faitDeLaSeance`). Une intention déjà résolue est rendue sans réécriture.
3. **L'étape est récupérable dès maintenant.** L'intention refermée porte le `lancement_id`, et la base refuse deux intentions pour un même lancement (`uniq_intention_lancement`). Rejouer l'insertion d'une étape rend donc `deja` au lieu d'une jumelle. R6 reste nécessaire pour les occurrences, mais plus pour ce cas.
4. **Le compte.** Le journal porte `proprietaire`, et `enregistrer_seance` refuse un journal qui n'est pas celui de `auth.uid()`. Le compte est vérifié avant ET après chaque étape. Le rejeu s'arrête au changement de compte, et il est coordonné par compte.
5. **Relais et affiche.** L'entrée en attente garde `relaisRunId`. Le maillon et l'affiche sont des étapes de la finalisation, rejouables. La base les rend uniques : un maillon par séance (`uniq_action_par_seance`, `deja_valide`), une affiche par séance (`uniq_affiche_par_seance`). Le garde-fou `if (r.deja) return` a disparu.
6. **Plus de repli avant migration.** Sans `enregistrer_seance`, la séance reste entière sur l'appareil. **La migration doit être appliquée avant de déployer ce code.**
7. **Sauvegarde locale et journal unique.**
   - L'écran ne dit « gardée sur ce téléphone » que si le stockage l'a vraiment gardée.
   - Le journal est construit une fois (`journalRef`) ; la finalisation repart toujours de l'entrée gardée.

**Tests comportementaux** (`check:programme`, 680 contrôles) : la vraie finalisation et la vraie fermeture, contre une base et un stockage en mémoire avec leurs pannes. Ils couvrent :
- l'échec de fermeture ;
- le rejeu le lendemain ;
- l'étape rejouée ;
- le changement de compte pendant une requête ;
- deux comptes en parallèle ;
- le relais récupéré ;
- la migration absente ;
- le stockage plein ;
- deux finalisations simultanées.

Trois témoins vérifiés.

**Limite connue** : `valider_action_defi` refuse une séance commencée il y a plus de 3 h (règle du relais). Un maillon récupéré plus tard est donc refusé, et ce refus est définitif, pas réessayé.

## Tour 10 · fait (2026-10-03), après la relecture de Codex

1. **Le propriétaire se fige au départ.** `startWorkout` capture le compte ; `proprietaireDeLaSeance(auDepart, aLaFin)` ne prend celui de la fin que si personne n'était connecté au départ. Testé : A commence, B est connecté à la fin → rien chez B, la séance attend A, puis part sous A au rejeu.
2. **Une finalisation partielle se voit.** `Finalisation.reste` liste les suites encore à faire ; `etatFinDeSeance` décide la phrase. La séance enregistrée reste une réussite, une ligne secondaire nomme ce qui reste avec « Réessayer », et la reprise automatique n'est promise que si l'appareil a gardé le travail. Testé de bout en bout : journal enregistré, fermeture ratée, état visible, puis finalisation réussie sans réécrire le journal ni le maillon.
3. **Le rejeu repart au retour au premier plan et au retour du réseau** (`PresenceDuJour`), coordonné par les Maps existantes.
4. **Le banc tourne sous Windows** : `check-ia-alias.mjs` résout par `fileURLToPath`.
5. **SQL appliqué et exercé** : aucun doublon préalable dans `challenge_actions` ni `posts` ; 14 scénarios sous le rôle `authenticated` (comptes A et B réels), transaction annulée, tous conformes. Reste : l'essai simultané depuis deux sessions, qui demande une écriture réelle puis un nettoyage (accord de Louis requis).

`check:programme` : 691 contrôles, trois témoins vérifiés. La fermeture transactionnelle reste prévue en R6.

## R6 · codée (2026-10-04), en attente de la relecture de Codex et de la migration

**Le modèle.** Chaque passage dans l'ordre du cycle est une occurrence, identifiée par son rang dans le programme : Push₁ = 1, Pull₁ = 2, …, Push₂ = k + 1. L'étape d'un rang se déduit de l'ordre du cycle ; la base la vérifie au lieu de la stocker deux fois.

**La suite.** Elle se calcule depuis les occurrences encore ouvertes (`occurrenceSuivante`, `src/lib/occurrences.ts`), plus depuis la dernière étape faite. Deux bornes :
- **Le plancher** (`programmes.rang_depart`) : aucune occurrence plus basse n'est proposée.
- **Un tour de cycle** derrière la plus lointaine occurrence fermée. Au-delà, une occurrence non faite n'est pas due (décision 35). Sans cette borne, quatre semaines d'adaptation sur Push laisseraient quatre Push à rattraper.

**Les quatre critères de Codex :**
1. **C₁ avant B₁ laisse B₁ proposée.** En base, une fermeture de B écrite sans rang reçoit B₁ (`attribuer_rang`).
2. **Déplacer garde l'identité.** Le rang est relu et réécrit tel quel. Une mise à jour qui ne le donne pas le laisse en place. Changer l'étape le recalcule.
3. **Rejouer ne consomme rien deux fois.** C'est `uniq_occurrence` : une occurrence = une ligne. Une réservation devient la fermeture, sur la même ligne. Une seconde fermeture rend `doublon`, donc `deja`.
4. **Refaire une séance** n'a pas de cible : un journal, aucune ligne qui porte un rang.

**La migration** (`20261004_r6_occurrences.sql`) :
- **Les intentions existantes gardent leur sens.** Aucun statut, aucune date et aucun `consommee_le` ne sont touchés. Chaque fermeture reçoit le rang que l'ancien curseur lui donnait, et le plancher est posé sur l'occurrence qu'il proposait. Le banc rejoue cette reprise sur 1 200 historiques produits par l'ancien moteur : la prochaine séance reste la même, avec 0 écart.
- **Une finalisation R1 encore en attente reste récupérable.** Sa cible n'a pas de rang : la réservation se cherche alors par étape, et le déclencheur donne le rang à l'insertion.
- **L'ancien code en production reste compatible.** Ses écritures sans rang en reçoivent un.
- **À appliquer avant le code**, qui lit et écrit `rang`.
- `uniq_intention_par_etape` reste en place jusqu'au placement groupé (décision 14).

**Changement à valider :** une étape masquée par une adaptation reste due une fois, dans la limite d'un tour. À la fin de l'adaptation, la dernière occurrence non faite est proposée, puis le cycle reprend sans rattrapage. L'ancien moteur la renvoyait au tour suivant.

**Ce que R6 ne fait pas encore :** réserver une occurrence qui n'est pas la prochaine. Aucun écran ne le propose : c'est le placement groupé (décision 14). Le modèle, la base et la fermeture l'acceptent déjà.

**Vérifications.**
- `check:programme` : 724 contrôles, trois témoins vérifiés (fenêtre retirée, ancien curseur, rang non transmis).
- Typecheck, build, et eslint à 93, identique règle par règle.
- **Scénarios joués sur la vraie base le 2026-10-04**, migration comprise, dans une transaction annulée collée par Louis (`r6-scenarios-base.sql`). Tous conformes :
  - **M1 :** l'empreinte des 261 intentions est identique avant et après la migration.
  - **M2 :** les rangs repris sont `1,4,5,6` avec un départ à 7, puis `1,2,3,4` avec un départ à 5. La réservation existante reçoit le rang 1, et plus aucune ligne n'a d'étape sans rang.
  - **S1 :** A, puis C, puis B reçoivent les rangs 5, 7 et 6.
  - **S2 :** une réservation déplacée puis fermée garde son rang 8.
  - **S3 :** le rejeu est refusé par `uniq_intention_lancement`, la double fermeture par `uniq_occurrence`.
  - **S4 :** un rang incohérent avec son étape est refusé.
  - **S5 :** une répétition n'a pas de rang et le plancher ne bouge pas.
  - **S6 :** changer l'étape recalcule le rang (Haut 9 devient Push 11).
  - **S7 :** l'autre compte voit 0 ligne et son écriture est refusée. Le refus vient du déclencheur (`occurrence_sans_cycle`, 23514), qui ne voit pas le cycle d'autrui, avant même la RLS.
- Reste à faire après l'application : l'essai simultané réel (deux fermetures sans rang sur le même programme), puis le nettoyage.

### R6 · corrections du tour 14 de Codex (2026-10-04)

1. **La borne globale « un tour derrière la plus lointaine fermeture » est retirée.** Elle faisait disparaître B₁ sans adaptation (A₁, C₁, A₂, C₂ fermées → B₂ proposée), contre la décision 35. Remplacée par une **base par étape** (`baseEtape` en TypeScript, `rang_base` en SQL) : une étape jamais fermée reste due depuis le plancher, sans limite ; fermée à l'heure, elle repart juste après ; fermée **en retard** (la suite avait déjà dépassé son occurrence suivante), elle rejoint la suite au lieu de rattraper. Une étape a donc **au plus une occurrence en attente**, et une adaptation ne fabrique pas de pile. Une **réservation** est l'occurrence en attente de son étape et garde sa place jusqu'à sa résolution (`EtatOccurrences.reserves`).
2. **Une lecture d'occurrences ratée rend `null`**, plus un programme neuf. `viserEtape` refuse (`illisible`), `etapeSuivanteDe` lève (le héros garde son affichage précédent), le Guide ne dit rien du programme. Une séance déjà lancée garde sa cible et reste finalisable.
3. Banc : 733 contrôles. Témoins vérifiés : sans la notion de retard (3 échecs), avec l'ancienne borne globale (3 échecs).
4. S7 : le refus attendu est `23514` (`occurrence_sans_cycle`, le déclencheur ne voit pas le cycle d'autrui), pas `42501`.
5. À rejouer sur la base : `r6-test-a-coller.sql` (ajout de S8, les bases par étape, attendu 6,7,8,9). Après application : essai simultané réel, et deux fermetures au même rang explicite (une seule fermeture, les deux séances dans le journal).

### R6 · corrections du tour 15 de Codex (2026-10-04)

- **Base réelle, nouvelle règle :** M1 à S7 inchangés et conformes, S8 `rang_base` = 6, 7, 8, 9 comme attendu.
- **Affichage conservé ≠ cible vérifiée.** `avecEtapeVerifiee` (`journee.ts`) relit programme, adaptation et occurrences avant de dater l'étape ou de lancer une étape libre. Lecture ratée ou suite changée : refus, et l'écran se relit (`EVT_JOURNEE`). Une séance déjà lancée garde sa cible. Test comportemental au banc (affichage chargé → fermeture ailleurs → rafraîchissement raté → réservation tentée : zéro écriture).
- **Date inconnue :** une vraie fermeture sans `consommee_le` ne déclare aucun retard, comme `<` avec NULL en SQL ; seule la fermeture imaginée de l'aperçu (`simulee`) a lieu « à l'instant ». En base le cas n'existe pas (`intentions_consommee_check`), S8b le vérifie.
- Banc : 739 contrôles. Témoins : date inconnue traitée comme « maintenant » (1 échec), repli sur l'affichage conservé (3 échecs).

### R6 · corrections du tour 16 de Codex (2026-10-04)

- **Lecture stricte de l'adaptation avant un geste.** `lireAdaptations` / `adaptationDuJour` prennent un mode : `souple` pour l'affichage (une panne vaut « aucune », comportement V8 conservé), `stricte` avant de dater ou de lancer une étape (une panne lève → refus `illisible`). La décision vit dans `interpreterLectureAdaptations`, pure, que le banc rejoue avec une réponse d'erreur de la base.
- **Le geste se fait sur le contexte relu, jamais sur l'affiché.** `ContexteEtape` = programme, étape, rang, nom, adaptation tracée, étapes masquées ; `avecEtapeVerifiee` compare le contexte entier et ne passe à l'action QUE le contexte relu. Même occurrence avec une autre adaptation, ou une étape renommée : refus `changee`.
- Banc : 744 contrôles. Témoins : panne d'adaptation lue comme « aucune » (6 échecs), comparaison limitée à l'occurrence (4 échecs).

### R6 · correction du tour 17 de Codex (2026-10-04)

- **Le sondage de la table d'adaptations a trois réponses, pas deux.** `etatTableAdaptations` rend `presente`, `absente` (PostgreSQL 42P01 ou PostgREST PGRST205 : prouvé, mémorisé pour la session) ou `inconnue` (délai, réseau, refus d'accès : rien n'est prouvé, rien n'est mémorisé, la lecture suivante sonde à nouveau). Avant, toute erreur devenait `false` pour toute la session, et la lecture stricte rendait `[]` avant même d'interpréter quoi que ce soit.
- `lireAdaptations` en mode strict lève sur `inconnue` (le geste est refusé `illisible`) ; une table absente reste « aucune ». `adaptationsDisponibles` (choix des colonnes, lecture souple) vaut `presente`, sans mémoriser une panne.
- Banc : 750 contrôles. Le test traverse le vrai sondage et la vraie lecture avec un faux client : panne → `illisible`, zéro écriture ; rétablissement → nouveau sondage, l'adaptation est lue et le geste refusé `changee` ; table absente → « aucune », un seul sondage pour deux lectures. Témoins : mémoriser la panne (2 échecs), avaler la panne en strict (2 échecs).
- Tour 18 : le classement ne lit plus le texte du message, seulement les codes `42P01` et `PGRST205`. Contre-exemple au banc : `42703` (« column … does not exist ») reste `inconnue` et la lecture stricte échoue. 751 contrôles ; témoin (classement par texte remis) : 2 échecs.

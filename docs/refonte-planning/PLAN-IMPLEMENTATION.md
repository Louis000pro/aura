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

### R6 · vérifications sur la vraie base (2026-10-04)

- **Migration `20261004_r6_occurrences.sql` appliquée par Louis**, vérifiée en lecture : colonnes `rang` et `rang_depart`, déclencheur `intentions_attribuer_rang`, index `uniq_occurrence`, 4 contraintes, `rang_minimal` supprimée, 0 ligne portant une étape sans rang, 0 programme sans plancher.
- **S8b** : une fermeture `faite` sans `consommee_le` est refusée (23514, `intentions_consommee_check`), rien n'est écrit.
- **Même rang explicite** (A, rang 7, deux journaux écrits d'abord) : la première fermeture passe, la seconde est refusée (23505, `uniq_occurrence`) ; 1 fermeture au rang 7, 2 journaux conservés. Transaction annulée.
- **Deux fermetures simultanées sans rang** (deux onglets du SQL Editor, le premier gardant sa transaction ouverte 15 s) : le second attend le verrou consultatif puis reçoit le rang suivant de son étape. Résultat : 7 et 10, sans erreur (rangs 1 et 4 déjà pris).
- Lignes de test supprimées : programme, étapes et intentions à 0.

### R6 · validée (tour 19 de Codex, 2026-10-04)

- Codex a relu `b8b972f` et `d66cbea`, relancé le banc (751 contrôles) et validé R6 : aucun point bloquant ouvert.
- La migration est déjà en base. La mise en ligne du code attend le feu vert de Louis.
- Suite : R2, la prescription figée par occurrence, distincte des séries réalisées, sans charge cible inventée quand l'historique ne permet pas d'en proposer une.

## R2 · cadrage (2026-10-04), soumis à Codex avant le code

### Ce que le code fait aujourd'hui (constaté)

- Une étape du cycle (`programme_seances`) ne porte qu'un **nom** (« Push »). Son contenu est recalculé à chaque lecture par `instanceDeLEtape(nom, gen)` : 5 exercices tirés d'une banque par lieu (`EX` dans `planning.ts`), mélangés avec la graine `user.id` + le lieu + `variant`.
- `variant` vient de `readVariant(user.id)`, donc du **localStorage** : deux appareils peuvent proposer deux contenus différents pour la même occurrence. C'est exactement ce que la décision 44 interdit.
- La prescription est une chaîne (`reps: "4x10"` → `sets` + `reps: "10"`), sans rôle, sans fourchette, sans type de charge. `repSchemeFor` la décide d'après les objectifs (5x5, 4x10, 3x15, 4x12).
- **21 exercices de la banque des étapes n'ont aucune clé stable** (`cleExercice` rend `null`) : leur journal R1 s'écrit avec `exercice_cle = null`, donc aucune progression ne pourra jamais être calculée dessus. Liste : Squats, Squat haltères, Fentes haltères, Fentes marchées, Mollets debout, Mollets haltères, Chaise contre le mur, Tapis course, Tirage vertical, Tirage horizontal, Rowing buste penché, Rowing inversé sous table, Tractions (ou rowing serviette), Extensions triceps poulie, Extensions triceps haltère, Développé épaules haltères, Soulevé de terre roumain haltères, Hip thrust haltère, Crunch machine, Pompes serrées, Gainage dorsal.

### Proposition

**1. Deux tables, deux niveaux (décision 44).**

- `etape_exercices` = **le modèle**, attaché à une étape d'une version de programme : `programme_seance_id` (cascade), `position`, `exercice_cle` (obligatoire), `exercice_nom` (copie d'affichage), `role` (`repere` | `complementaire`), `series`, `mesure` (`reps` | `duree`), `reps_min` / `reps_max` ou `duree_s`, `repos_s`, `charge_type` (`totale` | `par_haltere` | `assistance` | `poids_du_corps`, ou nul). Unique `(programme_seance_id, position)`. RLS par le programme, comme `programme_seances`. **Aucune charge** : elle appartient à la personne et à son matériel, pas au modèle.
- `occurrence_exercices` = **la prescription figée** d'une occurrence : `intention_id` (cascade), `user_id`, `emplacement`, les mêmes colonnes de prescription recopiées, plus `charge_cible` (nulle), `charge_origine` (`aucune` | `historique` | `acceptee`) avec `charge_cible is null ⇔ charge_origine = 'aucune'`. Unique `(intention_id, emplacement)`. RLS propriétaire.
- Pourquoi une table et pas un JSONB sur l'intention : R4 modifiera **une** cible acceptée, R3 et R4 liront ligne par ligne, et les contraintes (fourchette cohérente, charge jamais zéro par défaut) se tiennent en base.
- `exercise_list` reste écrite à côté, dérivée de la prescription : c'est elle que les déploiements actuels et le tunnel lisent.

**2. Quand la prescription se fige.**

- **Dater une étape** (`intentionDeLEtape`) écrit l'intention ET ses lignes, dans une seule transaction (RPC `preparer_occurrence`, idempotente).
- **Lancer une étape sans date** n'écrit toujours rien (règle V5) : la prescription est calculée à partir d'`etape_exercices`, qui vit en base, donc **identique sur tous les appareils** ; elle voyage dans la cible du lancement et s'écrit avec la fermeture (`consommerEtape`), dans la même transaction.
- Les séances qui ne viennent pas d'une étape (catalogue, bibliothèque, impro, semaine régénérée qui ne porte que sa provenance) **n'ont pas de prescription** et gardent le comportement actuel.
- Une nouvelle version du programme ne touche pas une prescription déjà figée.
- Question pour R4, à ne pas trancher maintenant : une cible acceptée pour « la prochaine occurrence » a besoin d'une ligne où vivre si cette occurrence n'est pas encore écrite.

**3. La composition d'une étape.**

- `composerEtape(nom, lieu, niveau, objectifs)`, pure et déterministe, **sans `variant` ni localStorage**. Elle ne puise que des exercices qui ont une clé.
- Rôles : les deux premiers exercices de chaque liste de la banque sont les repères (la banque est réordonnée pour que ce soient les mouvements principaux), les autres sont complémentaires. Écrit dans la banque, jamais deviné par le nom.
- Fourchettes (décision 47) : force 4 à 6 sur les repères ; prise de masse 6 à 12 sur les principaux, 10 à 20 sur les accessoires ; par défaut (santé, reprise, perte de poids) 8 à 15. Les exercices tenus gardent une durée.
- Appelée à la création du programme (`getOrCreateProgramme`). **Les 5 programmes actifs existants** n'ont pas de modèle : je propose un remplissage unique par script, avec l'accord de Louis, plutôt que de les laisser sur l'ancien calcul pour toujours. Leur contenu changera une fois, ce qui se dit dans la carte de mise à jour.

**4. La banque doit n'avoir que des clés.** Chaque nom sans clé reçoit une décision explicite, écrite dans le code et vérifiée par le banc (aucun nom de la banque sans clé) :
- même mouvement, nom différent : on remplace par le nom canonique (Squats → Squat, Chaise contre le mur → Chaise au mur, Tapis course → Tapis de course, Extensions triceps poulie / haltère → Extension triceps poulie / haltère, Rowing inversé sous table → Rowing inversé, Tractions (ou rowing serviette) → Tractions, Tirage vertical → Tirage poitrine, Tirage horizontal → Rowing assis poulie, Rowing buste penché → Rowing buste penché haltères, Mollets debout → Mollets) ;
- même mouvement avec un autre matériel (Squat haltères, Fentes haltères, Soulevé de terre roumain haltères, Mollets haltères, Hip thrust haltère, Développé épaules haltères) : une variante garde son propre historique (décision 52), donc **pas** de clé partagée. Sans planche animée, elle ne peut pas entrer dans la bibliothèque : on la remplace par un exercice de la bibliothèque qui a la même fonction ;
- sans équivalent (Crunch machine, Pompes serrées, Gainage dorsal, Fentes marchées) : même règle.

**5. Le journal se rattache à la prescription.** `series_realisees` gagne `occurrence_exercice_id` (on delete set null), `role`, `reps_min_prescrites` et `reps_max_prescrites`. `reps_prescrites` reste remplie pour les séances sans prescription.

**6. Ce que R2 ne fait pas.**
- Aucune charge cible : `charge_cible` est toujours nulle en R2 (décision 50). La phrase « choisis une charge que tu pourrais soulever environ 12 fois » arrive en R3.
- L'**incrément du matériel** : on ne connaît ni les haltères ni les disques de la personne. En écrire un serait inventer un chiffre. Je propose de le reporter en R4, qui en a besoin et qui peut poser la question.
- Rien de visible dans le tunnel, sauf la fourchette écrite à la place d'un nombre unique (« 8 à 12 » au lieu de « 10 »), à trancher.

### Questions pour Codex

1. Une table de prescription plutôt qu'un JSONB : d'accord ?
2. Figer au moment de dater, ou au lancement d'une étape sans date avec écriture à la fermeture : d'accord avec ce partage, sans écriture au lancement ?
3. Remplissage unique des 5 programmes existants par script, ou ancien calcul conservé pour eux ?
4. Incrément reporté en R4 ?
5. Fourchette visible dès R2, ou nombre unique jusqu'à R3 ?

### R2 · précisions du tour 20 de Codex (2026-10-04)

- Deux tables : oui. `exercise_list` reste une projection de la prescription, écrite dans la même transaction, jamais modifiée à part.
- La **fonction** du mouvement et son **statut** (repère / complémentaire) sont deux propriétés distinctes et déclarées ; « les deux premiers » n'est qu'un ordre de présentation.
- Étape datée : intention et prescription atomiques, idempotentes par occurrence ; un déplacement garde les lignes ; rejouer ne recalcule pas. Étape libre : la copie se fige au lancement, voyage dans l'attente locale, et se rejoue telle quelle.
- Le rattachement du journal ne doit pas dépendre d'une fermeture réussie du premier coup ; deux lancements du même rang gardent chacun leur prescription.
- Programmes existants : remplissage unique, rejouable, précédé d'un comparatif concret validé par Louis ; le contexte de composition est conservé avec le modèle, et un changement de matériel ne bloque personne.
- Incrément en R4. Fourchette visible en R3 ; jusque-là une cible unique, dérivée et comprise dans la fourchette, et aucune répétition réelle déduite du bouton.
- Une substitution préserve la fonction, le matériel et l'accessibilité ; on ne remplace jamais un exercice seulement pour obtenir une clé.

## R2 · codée (2026-10-04), en attente de la relecture de Codex et de la migration

- **La banque des étapes** (`src/lib/banqueEtapes.ts`) : chaque exercice a sa clé, sa fonction et son type de charge (`PROPRIETES`), chaque entrée son statut. Chaque liste ne contient que ce que `exercicesDisponibles(lieu)` autorise (la même autorité que la génération IA). Les 21 noms sans clé sont remplacés un par un, avec la raison écrite dans le fichier. Deux manques de contenu, signalés et non masqués : aucune charnière de hanche aux haltères, aucun tirage praticable à la maison sans matériel (le « Pull » au poids du corps devient une séance de chaîne arrière).
- **La composition** (`composerEtape`) est pure, sans graine ni `variant` ni appareil, versionnée (`COMPOSITION_VERSION = 1`). Le banc tient l'empreinte de la version 1 : changer la banque sans changer la version fait échouer le contrôle. Fourchettes de la décision 47 ; cible de compatibilité = milieu de la fourchette.
- **Migration `20261005_r2_prescription.sql`** : `etape_modeles` (contexte de composition conservé, un modèle par étape et par lieu, immuable) + `etape_exercices` ; `occurrence_exercices` (prescription figée, `charge_cible` nulle tant que `charge_origine = 'aucune'`, jamais zéro) ; lecture seule pour les comptes, écriture par `ecrire_modele` et `ecrire_occurrence` (SECURITY DEFINER, propriété vérifiée). `projeter_prescription` écrit `exercise_list`. Un déclencheur retire la prescription dans la même transaction si le contenu de l'intention change (substitution, autre lieu) : jamais une liste qui contredit ses lignes. `enregistrer_seance` recopie statut, fonction et fourchette dans `series_realisees`.
- **Le journal se rattache par l'emplacement**, pas par une clé étrangère : (lancement → intention refermée par ce lancement → emplacement). Ce lien ne dépend ni de l'ordre d'écriture ni d'une fermeture réussie du premier coup, et chaque journal garde sa propre copie de la prescription de départ.
- **Le code** : `useJournee` lit le modèle de l'étape (écrit, sinon composé ; une lecture ratée ne compose rien et n'autorise pas de lancement), fige la prescription dans la cible au lancement, écrit occurrence et prescription ensemble quand on date, et déplace sans réécrire le contenu. `finSeance` ferme une étape libre avec la copie figée. `getOrCreateProgramme` écrit les modèles du cycle à la création. `instanceDeLEtape` est supprimée. « Refais ma semaine » garde sa variété (Premium) dans la nouvelle banque ; ses lignes ne portent qu'une provenance, sans prescription.
- **Remplissage des programmes existants** : `20261005_r2_modeles_existants.sql`, **généré** par `scripts/r2-remplissage.ts` depuis la composition TypeScript (le banc exige l'égalité). Rejouable, ne complète que les modèles absents des programmes actifs, ne touche à aucune intention. Comparatif des **10** programmes actifs (et non 5) publié pour Louis.
- **Bancs** : `check:programme` 790 contrôles, six témoins vérifiés (nom sans clé, matériel absent, règle changée sans version, prescription non figée, fermeture sans copie, déplacement depuis l'instance). Nouveau `check:prescription-sql` (37 essais) : la migration jouée deux fois dans un PostgreSQL en mémoire (PGlite), ses fonctions, ses refus, le déclencheur, le remplissage, et la projection SQL comparée à la projection TypeScript sur les 54 compositions. Il ne remplace pas l'essai sur la vraie base.
- **Ordre de déploiement** : R2 ne part qu'après la fusion de R6 (PR #3) et l'application de `20261005_r2_prescription.sql` ; le remplissage ensuite, après l'accord de Louis.

### R2 · corrections du tour 22 de Codex (2026-10-04)

- **L'étape et son modèle se publient ensemble.** `charger` lit l'étape, son modèle et sa réservation, puis publie tout d'un coup ; seule la dernière lecture publie (une réponse arrivée en retard ne remet rien à l'écran). Le modèle porte l'occurrence pour laquelle il a été lu (`ModeleDeLOccurrence`), et un modèle d'une autre étape n'est jamais projeté ni lancé. La prescription entre dans le contexte vérifié (`empreinteModele` dans `cleContexte`) : avant de lancer ou de dater, on relit l'étape ET son modèle pour le lieu ; un modèle illisible est un refus, un autre modèle aussi. Les gestes n'utilisent que le modèle relu (`c.modele`).
- **SQL : une prescription incomplète est refusée.** Les deux contraintes (`etape_exercices_prescription_check`, `occurrence_exercices_prescription_check`) exigent `is not null` sur `reps_min`, `reps_cible`, `reps_max` pour les répétitions et sur `duree_s` pour une durée : une comparaison avec NULL rendait NULL, et le CHECK passait (reproduit par Codex avec la vraie fonction).
- **Déplacer une réservation ne change que sa date** (`deplacerReservation`) : contenu, lieu, difficulté, adaptation et prescription restent ceux de la préparation.
- **Bancs indépendants des fins de ligne** : les lectures de fichiers du banc normalisent CRLF ; la lecture ratée du modèle est testée sur le vrai lecteur avec un faux client (panne, table absente, aucun modèle, modèle sans lignes).
- **Comparatif** : une section « Ce que R2 retire » nomme le Pull au poids du corps sans tirage (programmes 7, 8, 10), la disparition de la charnière de hanche aux haltères et la perte de charge des fentes et mollets (programme 2), avec une note sur chaque étape concernée.
- **Bancs** : `check:programme` 800 contrôles, `check:prescription-sql` 50 essais. Témoins : publier l'étape avant son modèle, reconstruire le contexte au déplacement, et revenir à l'ancienne contrainte (13 échecs) font chacun échouer le banc ; avec tous les fichiers en CRLF, tout passe.

## R2 · décision sur le remplissage des programmes existants (2026-10-04)

Codex a validé les quatre corrections (tour 23) et rappelé que les mouvements retirés étaient à trancher par Louis. Louis a délégué le choix (« on fait ce que tu veux »). Décision retenue : **on accepte les trois pertes pour R2**, et le remplissage `20261005_r2_modeles_existants.sql` partira après la vérification sur la vraie base.

Raison : les mouvements retirés n'étaient pas faisables là où ils étaient proposés. Tractions et rowing inversé demandent un agrès qu'une séance « poids du corps » n'a pas ; le soulevé de terre roumain demande une barre qu'une séance « haltères » n'a pas. R2 remplace un mouvement impossible par un mouvement faisable, il ne retire rien qu'on pouvait faire.

Ce qui reste ouvert, et qui n'est pas une équivalence : un « Pull » au poids du corps sans aucun tirage, une séance haltères sans charnière de hanche, des fentes et mollets sans charge. Les combler demande de nouveaux exercices animés (un tirage sans agrès, une charnière aux haltères) : une vague de contenu à part, hors R2.

## R2 · migration appliquée et vérifiée sur la vraie base (2026-10-04)

`20261005_r2_prescription.sql` collée par Louis. Présence vérifiée : trois tables, RLS active avec une seule policy de lecture chacune, les deux contraintes `*_prescription_check`, le trigger, les quatre colonnes du journal, les fonctions en SECURITY DEFINER.

Puis joué sous le rôle `authenticated` avec deux vrais comptes, dans des transactions annulées (base vérifiée vide de tout essai après coup) :

- modèle écrit, puis rejoué sans être recomposé (même identifiant, lignes inchangées) ;
- modèle incomplet refusé (23514), aucun modèle à moitié écrit ;
- occurrence préparée avec deux lignes, `exercise_list` identique à `projeter_prescription` ; rejouée, elle rend la même ;
- occurrence incomplète refusée, aucune intention laissée derrière ;
- écriture directe refusée (42501) sur les deux tables ; mise à jour et suppression directes ne touchent aucune ligne ;
- modèle d'une autre étape refusé (`modele_inconnu`) ;
- un déplacement garde la prescription, un changement de contenu l'emporte ;
- fermeture `faite` acceptée ; même lancement rejoué → `doublon` ; même rang par un autre lancement → `doublon` ;
- le journal recopie la prescription (`repere / poussee_horizontale / 8 / 12`) ;
- le second compte ne voit ni l'occurrence, ni le modèle, ni ses lignes ; il ne peut écrire ni un modèle sur l'étape du premier, ni une occurrence sur son programme, ni rattacher son modèle, ni enregistrer son journal ; témoin : il écrit chez lui ;
- `anon` n'exécute aucune des trois fonctions.

Note d'outillage : le connecteur Supabase expire au-delà d'une requête d'environ 6 Ko ; les essais se jouent par blocs courts.

Remplissage à suivre : 10 programmes actifs, 38 étapes, donc 38 modèles attendus.

## R2 · remplissage appliqué (2026-10-04)

`20261005_r2_modeles_existants.sql` collé par Louis. Vérifié en base : 38 modèles pour 38 étapes de programmes actifs, aucune étape sans modèle, aucun modèle vide, 190 lignes (5 par modèle). Aucune occurrence écrite, intentions inchangées. R2 est complet côté base.

## R3 · cadrage (2026-10-04), soumis à Codex avant le code

Périmètre : maquette 07, écrans 02 à 04, 06 et 07. L'écran 05 (la question après un repère) appartient à R4 ; les écrans 08 à 10 à R5.

### Ce que le code fait aujourd'hui (constaté)

- `completeSet(validation, dureeS)` marque une série `terminee` dans `doneMap` ; aucune répétition ni charge n'est retenue. `lignesDuJournal` écrit donc `reps_declarees = null` partout.
- `series_realisees` a déjà les colonnes `charge`, `charge_unite`, `charge_type` et `exercice_prevu_cle` (R1), avec `charge is null ⇔ charge_unite is null`. Mais **`enregistrer_seance` ne les recopie pas** : même si le tunnel les envoyait, elles resteraient nulles.
- `exercises` est dérivé des props (`useMemo`) : rien ne permet de changer un exercice en cours de séance.
- Une ligne de prescription (R2) porte `fonction`, `statut`, `reps_min/max`, `reps_cible` et `charge_type`. `charge_cible` est toujours nulle.

### Proposition

**1. Seules les séances prescrites changent.** Un exercice sans `prescription` (catalogue, bibliothèque, impro, séance générée) garde exactement le tunnel d'aujourd'hui : même bouton, rien de déclaré, `reps_declarees` nul. Le banc le vérifie.

**2. Pendant l'exercice (écran 02).**
- Le grand nombre reste la cible (`reps_cible`). La fourchette apparaît en une ligne discrète sous lui (« 8 à 12 ») ; aucune autre phrase.
- La charge s'affiche sous les répétitions avec un crayon, seulement si `mesure = reps` et `charge_type` vaut `totale`, `par_haltere` ou `assistance`. Le libellé suit le type : « 60 kg », « 16 kg par haltère », « assistance 20 kg ».
- Charge inconnue : le crayon dit « Charge ? ». Le bouton dit alors « Fait · 10 », et la série s'enregistre avec une charge nulle, **jamais zéro**. Première fois sur cet exercice : une seule ligne du Guide, « Choisis une charge que tu pourrais soulever environ {reps_max} fois » (décision 50), à la place de sa phrase habituelle.
- Une charge saisie vaut pour les séries suivantes du même emplacement, jusqu'à ce qu'on la change.
- Le bouton dit ce qui sera enregistré : « Fait · 10 × 60 kg ». Un toucher enregistre `reps_declarees = reps_cible` et la charge affichée. C'est une déclaration explicite, pas une déduction (tour 20).

**3. Pendant le repos (écrans 03 et 04).**
- Une ligne « ✓ Série 2 · 10 × 60 kg · Corriger » sous le minuteur. Rien d'autre à remplir.
- « Corriger » ouvre, dans le même bloc, deux compteurs − / + (répétitions, charge). Pas de clavier. Pas de charge : seulement les répétitions.
- **Saisie protégée** (décision 55) : si le repos se termine pendant une correction, le minuteur s'arrête à 0 (« Repos terminé »), la vibration a lieu, l'avance automatique est suspendue, et le bouton devient « Enregistrer et reprendre ». Fermer sans enregistrer garde la valeur d'avant. Une correction de charge vaut aussi pour les séries suivantes.
- Une correction modifie la marque de la série dans `doneMap` ; le journal, construit une seule fois à la fin, porte la valeur corrigée.

**4. Changer d'exercice (écran 06).**
- « ⇄ Changer » à côté de la démo, seulement sur un exercice prescrit.
- Équivalents : les exercices de la bibliothèque qui ont **la même fonction**, une clé, une animation, et qui se font au même lieu (`PROPRIETES` + `horsDuLieu`). Plus « Dans tous les mouvements » pour chercher ailleurs.
- Règle des séries (décision 56) : les séries déjà faites restent sur l'exercice d'origine. Le remplaçant prend les séries suivantes du **même emplacement**, avec `exercice_prevu_cle` = l'exercice d'origine. Sa charge part inconnue, jamais héritée. La fourchette et le statut de l'emplacement restent ceux de la prescription.
- L'état passe dans `remplacements: Record<emplacement, { aPartirDe: serie, exercice }>`. `exercises` affiché et `lignesDuJournal` en dérivent ; la prescription d'origine ne change pas.

**5. Au poids du corps et chronométré (écran 07).** Aucun changement : anneau, 3-2-1, pas de kilos, pas de correction.

**6. Une migration** : `enregistrer_seance` recopie `charge`, `charge_unite` (`kg` quand une charge existe), `charge_type`, et `exercice_prevu_cle`. Un journal en attente d'avant R3 n'a pas ces champs : ils restent nuls. Rien d'autre en base.

**7. Le fichier.** `WorkoutGuideModal.tsx` (1 929 lignes) est un monolithe : la logique part dans des modules purs et testables (`saisieSerie.ts` pour le libellé, l'incrément et les corrections ; `remplacement.ts` pour les équivalents et la règle des séries), le composant ne fait qu'afficher. Passes courtes, un seul agent.

### Questions pour Codex

1. **« À chaque fois »** (écran 06) touche la prescription des occurrences futures, alors que les modèles sont immuables (R2). Ma proposition : R3 ne livre que « Pour cette séance seulement », et « À chaque fois » arrive avec R7, qui décide de la composition. D'accord, ou il faut une règle de substitution dès R3 ?
2. **Valeur de départ de la charge** : rien (« Charge ? ») tant que R4 n'existe pas, ou la dernière charge **déclarée** sur la même clé et le même type, affichée telle quelle, sans hausse ?
3. **Pas des compteurs de charge** : 2,5 kg en `totale` et `assistance`, 1 kg en `par_haltere` ? Ce n'est pas l'incrément de progression (R4), seulement le pas de correction.
4. **La fourchette** sous le grand nombre suffit-elle, ou faut-il la montrer ailleurs ?
5. **Remplacement à la dernière série** : s'il ne reste aucune série, « Changer » disparaît-il, ou sert-il à corriger la dernière série déjà faite ?

### R3 · réponses du tour 26 de Codex (retenues)

- « À chaque fois » est masqué jusqu'à R7 ; seul « Pour cette séance seulement » existe.
- La charge part inconnue en R3. La reprise d'une charge historique appartient à R4. Une charge saisie vaut pour le même exercice dans la séance, jamais pour les séances futures.
- Les compteurs sont des raccourcis : toucher la valeur permet d'écrire une charge exacte (1,25 kg, une machine à 7 kg).
- La fourchette tient en une ligne sous la cible.
- « Changer » disparaît quand aucune série ne reste ; une correction ne remplace jamais rétroactivement.
- **Correction 1** : l'identité se garde série par série. Chaque série validée porte son exercice effectif, son type de charge et ses valeurs ; le remplacement courant ne vaut que pour les séries restantes. A → B → C et le retour à A sont testés.
- **Correction 2** : au poids du corps en répétitions, « Fait · 10 » et la correction des répétitions fonctionnent sans kilos. Le chronométré ne change pas.
- Les équivalents gardent la même mesure ; sans équivalent, on le dit.

Correction de mon cadrage : `exercice_prevu_cle` était déjà recopiée par `enregistrer_seance` depuis R1. Seules `charge`, `charge_unite` et `charge_type` manquaient.

## R3 · codée (2026-10-05), en attente de la relecture de Codex et de la migration

- `src/lib/saisieSerie.ts` : libellés (« Fait · 10 × 60 kg », « Série 2 · 10 × 60 kg »), fourchette, charge saisie (jamais zéro), pas de saisie, compteurs.
- `src/lib/remplacement.ts` : équivalents (même fonction, même lieu, même mesure, une clé), lieu le plus sobre quand la séance ne le donne pas, remplacement courant, retour à l'exercice prévu.
- `src/lib/journalSeance.ts` : la marque d'une série terminée porte `reps`, `charge` et `exercice` ; `lignesDuJournal` écrit `reps_declarees`, `charge`, `charge_unite`, `charge_type` et `exercice_prevu_cle`. Sans prescription, rien n'est déclaré (comme R1).
- `WorkoutGuideModal.tsx` affiche seulement : charge et crayon, fourchette, bouton qui dit ce qui s'enregistre, phrase du Guide quand la charge est inconnue, ligne « Corriger » au repos, saisie protégée, panneau « Changer ». `src/components/seance/ReglageCharge.tsx` porte les compteurs.
- Migration `supabase/migrations/20261006_r3_charges.sql` : `enregistrer_seance` recopie la charge ; protections de propriétaire et de rejeu identiques ; anciens journaux acceptés.
- Bancs : `check:programme` (35 contrôles R3), `check:prescription-sql` (60 tests, dont le journal A → B → C joué par la vraie fonction, le rejeu, le propriétaire, la charge à zéro et un journal d'avant R3). Trois témoins vérifiés : retirer l'attente de la saisie protégée, accepter une charge à zéro, faire déclarer une séance sans prescription.
- Vérifié : `tsc`, `build`, `eslint` à 93 (la référence), `check:rappels`, `check:missions`, `check:portraits`. `check:echelle` : 38 écarts, les mêmes qu'avant R3.

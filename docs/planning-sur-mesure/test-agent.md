# Le test « agent » du 2026-10-13

Louis a reçu un conseil : faire de Nora et Sasha de vrais agents, avec des outils comme des bras, qui
mènent une demande de A à Z au lieu d'une action par message. Avant de trancher, on a mesuré.

**Rien n'a touché l'app ni la base.** Le prototype vit dans `src/lib/agent/` et rien dans l'app ne
l'appelle.

## Le montage

- **Une seule demande, formulée de 30 façons** (`src/lib/agent/banc/formulations.ts`). La phrase de
  référence : « Ce mois-ci, mets l'accent sur les fessiers, 30 minutes max, jamais le mercredi. » Les
  variantes changent la période (« ce mois-ci », « jusqu'à la fin du mois », « pendant un mois », « les
  quatre prochaines semaines »), le ton, les fautes et les emoji.
- **Un faux compte et un planning simulé, en mémoire** (`planningSimule.ts`). Séances le lundi, le
  mercredi et le vendredi. Cycle Full Body, puis Haut du corps, puis Bas du corps. On est le mardi 13
  octobre 2026. Le planning suit les règles du vrai moteur : jours habituels, exceptions datées,
  absences, cycle posé dans l'ordre, adaptation datée.
- **La vraie IA de production** : Groq, `openai/gpt-oss-120b`, réflexion « low », par le client `llm`
  de l'app. La consigne courte dit qui parle (Nora), la méthode et les règles.
- **Un correcteur qui juge l'état final**, jamais la suite d'appels, car plusieurs chemins mènent au bon
  résultat. Il vérifie six critères :
  1. un aperçu est présenté ;
  2. aucune séance le mercredi jusqu'à la fin de la période ;
  3. aucune séance de plus de 30 minutes ;
  4. l'accent fessiers sur chaque séance ;
  5. le même nombre de séances chaque semaine qu'avant ;
  6. rien de touché après la période, et rien de changé pour de bon.
- **Lancé sur une préversion Vercel**, le seul endroit où la clé de l'IA existe. Le test passait par une
  route temporaire protégée par jeton, absente en production, appelée par le connecteur Vercel. La
  session cloud n'a ni clé ni accès à `api.groq.com`.

## Les essais

Huit essais lancés, sept mesurés.

| Essai | Formulation | Garde-fous en place | Résultat |
|---|---|---|---|
| A1 | n°1 | aucun : l'agent écrit les dates lui-même | **Échec.** Il a agi sans lire, pris les vendredis pour des mercredis, et conclu en parlant. |
| A2 | n°1 | lecture compacte, conséquences dites par les outils | **Échec.** Il n'a jamais lu le planning, a pris les dimanches pour des mercredis et ajouté 8 séances. Son message final était faux. |
| B1 | n°1 | + le code calcule les dates | **Échec.** Dates justes, mais un refus jamais retenté et « 3 → 2 séances » ignoré. Message faux : il annonçait 30 min et l'accent fessiers alors que l'adaptation avait été refusée. |
| B2 | n°1, réflexion « medium » | idem | **Non mesuré.** L'essai a dépassé 60 s en attendant le quota gratuit, et la fonction a été coupée. |
| C1 | n°1 | + contrôle de fin en code | **Réussi**, après une relance : trois semaines avaient perdu une séance. 41 s, dont environ 37 s d'attente du quota. |
| C2 | n°12, « pendant un mois » | idem | **Planté.** Il a appelé `resenter_apercu`, un nom d'outil écorché, et Groq a refusé toute la réponse (400). |
| C2b | n°12 | + rattrapage des appels illisibles | **Réussi.** La même faute a été rattrapée, puis une relance (cinq semaines avaient perdu une séance). 13,5 s. |
| C3 | n°18, « Booty focus 🍑 » | idem | **Réussi**, et c'est le plus propre : il a lu le programme d'abord et remplacé les mercredis par les jeudis en un seul geste. 7 s. |

**Bilan.** Sans le contrôle de fin, l'agent réussit 0 fois sur 3 (A1, A2, B1), même quand le code
calcule les dates (B1). Avec les trois garde-fous, il réussit 3 fois sur 3 (C1, C2b, C3). C2, avec le
contrôle mais sans le rattrapage, a planté.

Un essai qui va au bout consomme 10 000 à 17 000 jetons, entrée et sortie comprises. Le détail de chaque
essai est en annexe : les journaux de la préversion qui le portaient s'effacent au bout d'une heure.

## Ce qu'on en tire

1. **Le modèle ne sait pas calculer un calendrier.** Il se trompe de jour de la semaine. Les outils
   prennent donc des jours de la semaine (« retirer le mercredi du 13 au 31 »), et le code pose les
   dates.
2. **Il n'écoute pas les avertissements en cours de route.** Il a ignoré « 3 → 2 séances » chaque fois
   qu'un outil le lui a dit. Un contrôle en code relit tout avant de le laisser conclure, et le renvoie au travail s'il
   reste un problème. Ce contrôle a servi à chacun des trois succès. Il ne connaît pas la demande : il
   ne tient que deux règles valables pour n'importe quelle demande (un refus ne reste pas sans suite ;
   le nombre de séances d'une semaine ne change pas en silence, sauf absence).
3. **Sa phrase finale peut mentir.** La personne doit voir l'aperçu construit par le code à partir de
   l'état préparé, jamais le résumé écrit par le modèle.
4. **Il écorche parfois le nom d'un outil** : deux fois, la même faute sur la même formulation. Groq
   refuse alors la réponse entière. La boucle rattrape l'erreur et laisse l'agent refaire son geste.
5. **Il conclut souvent en parlant** au lieu d'appeler l'outil de fin, avec parfois du texte parasite.
   Le contrôle le renvoie une fois vers l'aperçu.

**Verdict : oui à un agent, à une condition.** Le code tient les garanties (les dates, le nombre de
séances, les refus, l'aperçu), le modèle propose, et la personne valide un seul aperçu d'un clic. C'est
conforme à l'avis déjà donné dans AGENTS.md (chantier « Le planning sur mesure ») : seules les
autorités du moteur servent d'outils, jamais une écriture directe en base.

## Ce qui bloque : le palier gratuit de Groq

Les en-têtes de Groq le disent : 8 000 jetons par minute et 1 000 requêtes par jour sur `gpt-oss-120b`.
Une demande à l'agent consomme 10 000 à 17 000 jetons. L'agent attend donc son quota, jusqu'à 44 s sur
un essai, et quelques demandes par jour pèsent autant que des dizaines de messages au coach.

Pour comparer, la production a fait ce jour-là 6 appels de conversation, 6 de mémoire, 4 récaps et 2
générations de séance (table `ai_usage_daily`).

En payant, une demande coûterait environ 0,2 à 0,3 centime : environ 0,15 $ par million de jetons en
entrée et 0,60 $ en sortie. Ces prix viennent de sites tiers et restent à confirmer sur la page de Groq.

## La suite proposée

1. Passer Groq au palier payant. C'est une décision de Louis, et ça coûte des centimes.
2. Rejouer les 30 formulations, puis comparer la réflexion « low » et « medium », et la consigne
   longue, qui reproduit la taille du prompt réel du coach.
3. Seulement ensuite : la maquette de l'étage ③ (« demander au Guide ») et la levée des verrous de V9
   (décisions 4 et 7, et « aucun outil de lecture » de V9A). C'est à Louis de les lever.

## Rejouer le test

- **Hors ligne** : `npm run check:agent`. Le banc vérifie la boucle, le faux planning, le correcteur
  (chaque témoin doit faire tomber son critère), le contrôle de fin et le rattrapage. L'essai B1 y est
  rejoué tel quel : il échoue sans le contrôle et réussit avec.
- **Sur une préversion** :
  1. Restaurer la route :
     `git show aa3d99a:src/app/api/preuve-agent/route.ts > src/app/api/preuve-agent/route.ts`
  2. Générer un nouveau jeton, et remplacer `EMPREINTE` par son sha256. Le jeton lui-même n'est jamais
     commité, car le dépôt est public.
  3. Pousser sur une branche de préversion, puis appeler la route avec ses paramètres : `jeton`, `n`,
     `essai`, `effort`, `consigne`, `modele`, `verif=1` et `trace=1`.
  4. Lire le résultat dans les journaux de la préversion (`[preuve-agent] essai=<nom>`). L'essai tourne
     dans `after()` avec `maxDuration` 300, accepté sur ce projet.
  5. Sur le palier gratuit, espacer les essais d'une minute.
- Les anciennes préversions gardent la route, mais elle exige un jeton qui n'a jamais été commité.

## Annexe : le détail des essais

Tous sur `openai/gpt-oss-120b`, réflexion « low » sauf B2, consigne courte. Les jetons sont donnés en
entrée + sortie.

**Outils v1, l'agent écrit les dates lui-même**

- **A1**, n°1 : échec. Il a agi avant de lire : son adaptation datée du 1er octobre a été refusée (date
  passée). Il a retiré les vendredis 16, 23 et 30, pris pour des mercredis, puis les mercredis, sans
  report. Il a conclu en parlant. 13 726 + 916 jetons, 6 étapes, 51 s, dont environ 44 s d'attente du
  quota.

**Outils v2, lecture compacte et conséquences dites par les outils**

- **A2**, n°1 : échec. Il n'a jamais lu le planning, a pris les dimanches 18 et 25 pour des mercredis,
  ignoré « 2 → 3 séances » et ajouté 8 séances. Les mercredis sont restés intacts. Son message final
  était faux (« aucune séance le mercredi »). 15 505 + 2 166 jetons, 7 étapes, 49 s. Sans attente, une
  étape prend 0,7 à 3,6 s.

**Outils v3, le code calcule les dates (`changer_jours_periode`)**

- **B1**, n°1 : échec. Les dates étaient justes cette fois (mercredis 14, 21 et 28), mais il n'a rien
  lu. Son adaptation datée du 1er octobre a été refusée et jamais retentée, et il a ignoré « 3 → 2
  séances ». Il a conclu en parlant, avec un message faux (il annonçait 30 min et l'accent fessiers).
  5 909 + 410 jetons, 3 étapes, 2,2 s.
- **B2**, n°1, réflexion « medium » : non mesuré. L'essai a dépassé 60 s en attendant le quota, et la
  fonction a été coupée. La route est ensuite passée à `after()` + journaux, avec 300 s.

**Outils v3 + contrôle de fin en code (commit 5e95cdd)**

- **C1**, n°1 : réussi (6 critères), grâce au contrôle.
  1. Mercredis retirés depuis le 1er octobre : refusé (date passée).
  2. Retenté depuis le 13 : accepté, mais « 3 → 2 » ignoré.
  3. Adaptation du 13 au 31, 30 min, fessiers : acceptée.
  4. Il a écrit l'appel d'outil en texte (« Présente_apercu{…} ») au lieu de l'appeler. Le contrôle a
     signalé trois semaines qui perdaient une séance.
  5. Séances en plus les mardis 13, 20 et 27 : nombre de séances rétabli.
  6. Du texte parasite (« Oops… We got messed »), puis `presenter_apercu` avec un message juste.

  13 119 + 840 jetons, 6 étapes, 1 relance, 41 s, dont environ 37 s d'attente du quota.
- **C2**, n°12, « pendant un mois » : planté. Le début était juste (adaptation du 13 octobre au 12
  novembre, mercredis retirés jusqu'au 12 novembre), mais il a ignoré « 3 → 2 » sur cinq semaines. Il a
  voulu conclure en appelant `resenter_apercu`, et Groq a refusé la réponse entière (400). 3 873 + 230
  jetons, 2 étapes.

**Outils v3 + contrôle + rattrapage des appels illisibles (commit aa3d99a)**

- **C2b**, n°12 : réussi (6 critères). Adaptation du 13 octobre au 12 novembre, mercredis retirés. Il a
  refait la faute `resenter_apercu` (rattrapée), puis conclu en parlant. Le contrôle a signalé cinq
  semaines qui perdaient une séance, et l'agent a ajouté les mardis 13, 20 et 27 octobre, 3 et 10
  novembre. Il a de nouveau conclu en parlant, avec un message juste. 11 661 + 584 jetons, 6 étapes,
  1 relance, 1 appel illisible, 13,5 s.
- **C3**, n°18, « Booty focus 🍑 » : réussi (6 critères), le plus propre. Il a lu le programme d'abord,
  remplacé les mercredis par les jeudis en un seul geste (le nombre de séances était juste d'emblée), et
  posé l'adaptation du 13 au 31 (30 min, fessiers). Il a conclu en parlant, a été renvoyé une fois vers
  l'aperçu, puis l'a présenté. 10 634 + 455 jetons, 5 étapes, 1 relance, 7 s.

# V9 · Audit avant code : le Guide au-dessus du moteur

Écrit le 2026-09-08, après la clôture de V8. **Aucune ligne de code V9 n'a été écrite.**
Ce document dit ce qui existe, ce qui manque, ce qu'il faut réutiliser, et où il ne
faut surtout pas réinventer.

La conclusion tient en trois phrases :

1. **Le Guide ne sait rien du moteur, et pas « mal » : rien du tout.** Le paramètre
   `programme` de `buildSystemPrompt` existe encore, et plus personne ne le renseigne
   depuis V0. Il n'y a donc aucun gros contexte programme à démonter, il n'y en a pas.
2. **Presque toutes les autorités d'écriture dont V9 a besoin existent déjà** et sont
   exercées par le banc. Il en manque exactement une, le SAUT.
3. **La base supporte déjà la substitution et le saut** (`etape_consommee_id` sans
   `programme_seance_id`, statut `passee`, curseur qui accepte `passee`). Un seul
   endroit du TypeScript les empêche, et c'est `lienProgramme`.

---

## 1. Architecture actuelle du Guide / Assistant

Un seul chat dans le produit : `AssistantContext` (client) qui appelle `/api/chat`.
Les deux autres chats (accueil, `/coach`) ont été supprimés en V0.

Trois appels au modèle par tour, et ils ne font pas le même métier :

| appel | fichier | rôle IA | prompt | ce qu'il fait |
|---|---|---|---|---|
| l'aiguilleur | `assistantRouter.deciderAction` | `outil` (petit modèle) | ~300 caractères, 3 derniers tours, `temperature: 0` | choisit UN outil dans une liste fermée, n'écrit jamais de texte |
| le coach | `/api/chat` | `coach` | ~12 000 caractères, 10 derniers messages | parle, en streaming, et n'a **aucun outil** |
| la mémoire | `/api/assistant/analyze` | `outil` | son propre prompt | extrait un souvenir, 2,5 s après, silencieuse |

L'ordre compte et il est la correction du 2026-07-30 : l'aiguilleur passe **avant**, et
sa décision devient le contexte du coach (`cadreAction`). Le coach apprend en toutes
lettres ce qui va s'afficher sous lui, ou qu'il n'y aura rien. Le désaccord est donc
impossible par construction : un seul décide, l'autre est informé.

Le transport est du **NDJSON** : `{t}` un morceau de texte, `{a}` l'action, `{e}` une
erreur. L'action ferme le flux, le client ne l'exécute qu'après lecture.

Côté client, `runAction` route l'intent vers une branche. Les branches qui écrivent
posent une **carte** (`pendingSeance`, `pendingPlan`, `pendingRecipe`, `pendingMeal`)
validée par `confirmX`. C'est la règle verrouillée : aucune écriture sans clic.

⚠️ **La mesure qui commande toute l'architecture, et elle ne concerne QUE
l'aiguilleur** : 241 caractères de prompt système donnent 6 appels d'outil sur 6, 1 762
donnent 3 sur 6, 5 371 donnent 1 sur 6. C'est pour ça que le coach n'a plus d'outils.
Corollaire pour V9 : **allonger le prompt du COACH ne casse rien** (il ne fait que
parler) ; allonger celui de l'aiguilleur casse tout.

---

## 2. Les outils existants

`src/lib/assistantTools.ts`, 12 outils, plus `rien_a_faire` qui vit dans
`assistantRouter.ts` et ne sort jamais (il est traduit en `null`).

| outil | écrit ? | quand | autorité appelée |
|---|---|---|---|
| `create_seance` | oui, au clic | génération puis carte | `custom_sessions.insert` (+ `saveDay` si un jour est choisi) |
| `plan_set` | oui, au clic | génération puis carte | `saveDay(..., "guide")` |
| `plan_move` | oui, au clic | carte directe | `saveDay` sur l'intention (update par `id`) |
| `plan_location` | oui, au clic | génération puis carte | `saveDay` |
| `plan_library` | oui, au clic | carte directe | `saveDay` |
| `plan_regen` | oui, au clic | `previewWeek` puis carte | `libererJours` + `saveDay` par jour |
| `log_meal` | oui, au clic | estimation puis carte | `nutrition_logs.insert` |
| `create_recipe` | oui, au clic | génération puis carte | `nutrition_logs.insert` |
| `set_theme` | **oui, sans carte** | tout de suite | `setThemePreference` (préférence locale) |
| `save_lieu` | **oui, sans carte** | tout de suite | `persistLieu` (préférence, base + localStorage) |
| `open_page` | non | navigation | `resolveNavTarget` |
| `ask_choice` | non | question à puces | aucune |

**Aucun outil ne touche `programmes`, `programme_seances` ni
`adaptations_entrainement`.** Le Guide ne peut aujourd'hui ni sauter une étape, ni
substituer, ni ajouter un supplément, ni créer ou arrêter une adaptation.

---

## 3. Comment le contexte utilisateur est chargé aujourd'hui

`ensureContext()` dans `AssistantContext`, appelé au premier besoin (`dataLoadedRef`),
**une seule fois par session**, 10 requêtes : profil onboarding, nutrition du jour,
nutrition 7 jours, 15 séances sur 30 jours, 10 pesées, compte d'amis (deux fois),
10 posts, bio, 60 mémoires.

Le résultat vit dans des `ref` et repart **à chaque message** dans le corps de la
requête : `userContext`, `liveStats`, `richProfile`, `memories`, `lieu`, `lieu_equip`,
`currentPage`, `guide`.

⚠️ **Deux défauts pour V9, et le second est le plus important.**

- Le contexte n'est **jamais relu**. Une séance terminée pendant la conversation, une
  adaptation activée dans la feuille V8, une séance décalée : le Guide continue de
  parler avec les données du premier message.
- **`programme` n'est plus jamais envoyé.** Le paramètre existe dans
  `buildSystemPrompt`, et le corps envoyé par `AssistantContext` ne le contient pas.
  Les deux appelants qui le renseignaient (l'ancien chat de l'accueil et `/coach`) ont
  été supprimés en V0. Depuis, le bloc « Programme actuel » du prompt est **toujours
  vide**.

---

## 4. Quelles lectures passent par du gros contexte injecté

Ordre de grandeur du prompt système actuel, par message :

| bloc | taille approximative |
|---|---|
| le socle (domaines, ton, santé, mise en forme, actions, nutrition, lieu) | ~7 000 caractères |
| `buildSiteKnowledgePrompt` (9 entrées + comment faire) | ~1 500 |
| `buildMemoryPrompt` (jusqu'à 60 souvenirs) | jusqu'à ~3 500 |
| stats du jour + profil enrichi | ~600 |
| `cadreAction` | ~300 |

Soit **~12 000 à 13 000 caractères, à chaque tour**. Ce n'est pas un problème de
fiabilité (le coach n'a pas d'outils), c'est un problème de coût et de dilution.

Ce qui est réellement du gros contexte à réduire : les **60 mémoires**, envoyées
entières à chaque message, et le **profil enrichi** (nutrition sur 7 jours, 10 pesées,
15 séances) dont le prompt ne rend au final qu'un résumé de quatre lignes.

Et ce qui manque : **zéro caractère de programme, de cycle, d'adaptation ou de
planning**. C'est l'inverse du problème habituel.

---

## 5. Quelles actions existent déjà réellement

Écrivent en base après un clic : `create_seance`, `plan_set`, `plan_move`,
`plan_location`, `plan_library`, `plan_regen`, `log_meal`, `create_recipe`.

Écrivent sans clic, et ce sont les deux exceptions historiques, toutes deux sur des
**préférences** : `set_theme`, `save_lieu`.

⚠️ **Trois défauts d'écriture trouvés en auditant, et ils sont dans le périmètre de V9
même s'ils datent d'avant.**

1. **`plan_set` détruit silencieusement un lien de programme.** Il écrit un
   `PlanningDay` avec `id: null` et sans `programmeId` : `saveDay` en mode « remplacer »
   vise alors la première intention non résolue du jour et la met à jour. Si cette
   intention était une **réservation V7A**, `lienProgramme` réécrit les trois colonnes à
   `null`. L'étape cesse d'être réservée, le curseur ne bouge pas, et personne n'est
   prévenu. C'est exactement la substitution non déclarée que le modèle interdit.
2. **`plan_regen` emporte les réservations et les suppléments.** Son
   `libererJours(aVenir)` supprime **toutes** les intentions non résolues des jours à
   venir, y compris une étape réservée pour vendredi et le supplément posé à côté. La
   carte n'en dit rien.
3. **Aucun appelant de `retirerIntention`** hors de la feuille V8. Le Guide ne sait pas
   retirer une séance du planning, alors que l'autorité existe.

---

## 6. Ce qui parle sans écrire

`open_page` (navigue), `ask_choice` (pose une question à puces), et surtout **tout ce
qui touche le programme** : quand quelqu'un demande « qu'est-ce que j'ai de prévu ? »,
l'aiguilleur appelle `rien_a_faire` et le coach répond à partir de rien. Il ne ment pas
volontairement, il n'a simplement aucune donnée, et le prompt lui interdit d'inventer.
La réponse est donc vague, et c'est aujourd'hui le premier trou visible du produit.

---

## 7. Les autorités V7A / V8 réutilisables directement

**Lecture, toutes prêtes.**

| besoin | fonction | fichier |
|---|---|---|
| le programme actif et son cycle | `lireProgrammeActif` | `programme.ts` |
| la prochaine étape (filtre d'adaptation compris) | `etapeSuivanteDe(userId, actif, masquee)` | `programme.ts` |
| le curseur | `positionRefermee` | `programme.ts` |
| la réservation d'une étape, où qu'elle soit datée | `reservationDeLEtape` | `planning.ts` |
| une journée, une plage, une semaine | `lireJour`, `fetchRange`, `lireSemaine` | `planning.ts` |
| la hiérarchie d'une journée | `parDate`, `ordonner`, `principale`, `supplements`, `seancesDuJour` | `planning.ts` |
| l'adaptation du jour (et sa fermeture opportuniste) | `adaptationDuJour` | `adaptation.ts` |
| les étapes masquées | `etapeMasquee`, `etapesCompatibles`, `idsMasques` | `adaptation.ts` |
| les conflits d'une fenêtre, lus en base | `chargerConflits`, `reservationsEnConflit` | `adaptation.ts` |
| l'état de la journée et ce qu'on lance | `etatJournee`, `lancementDuJour`, `repetitionDuJour` | `journee.ts` |
| dire un jour à voix haute | `libelleReservation`, `libelleJour`, `dayLabelLong` | `journee.ts`, `adaptation.ts`, `planning.ts` |

**Écriture, toutes prêtes sauf une.**

| geste | autorité | statut |
|---|---|---|
| déplacer / remplacer une intention | `saveDay(userId, day, origine)` | prête, conserve l'identité et le lien |
| ajouter un supplément | `ajouterIntention` | prête, `etape_consommee_id` nul par construction |
| retirer une intention | `retirerIntention` (V8) | prête, aucun appelant côté Guide |
| libérer des journées entières | `libererJours` | prête, trop grosse pour un geste du Guide |
| marquer une intention | `marquerIntention(id, statut, dateDuFait)` | prête, **sait déjà écrire `skipped`** |
| fabriquer une intention qui réserve une étape | `intentionDeLEtape` (V7A) | prête |
| refermer une étape en la faisant | `consommerEtape`, `terminerSeance` | prêtes |
| déclarer une adaptation | `creerAdaptation`, `validerAxes`, `validerPeriode` | prêtes |
| arrêter une adaptation | `fermerAdaptations` | prête |
| **refermer une étape SANS la faire (le saut)** | **n'existe pas** | **le seul ajout de V9** |

⚠️ **Et le saut est déjà supporté partout ailleurs**, ce qui est la meilleure nouvelle
de cet audit :

- le vocabulaire de statut est `prevue | faite | passee` depuis V6, et **aucun code
  n'écrit `passee`** aujourd'hui ;
- `positionConsommee` filtre déjà `.in(statut, [faite, passee])` : **le curseur avance
  donc sur une étape sautée sans qu'on touche à une ligne de `programme.ts`** ;
- le CHECK `(statut = 'prevue') = (consommee_le is null)` est satisfait par une ligne
  `passee` qui porte son `consommee_le` ;
- `seanceNonFaite` ne remonte que les intentions `prevue` : une étape sautée ne
  réapparaîtra jamais comme une séance ratée.

---

## 8. Où placer des outils courts de lecture

**Recommandation : aucun outil de lecture appelé par le modèle.**

Le raisonnement est chiffré, pas esthétique.

- La fiabilité d'appel s'effondre avec la longueur du prompt, et c'est l'aiguilleur qui
  appelle les outils. Lui ajouter cinq outils de lecture, c'est rallonger sa liste et
  abîmer la décision d'action qui marche à 24 cas sur 25.
- Le nombre de faits utiles est **petit et borné** : le programme, la prochaine étape,
  l'adaptation active, les sept prochains jours. Ça tient en 400 caractères. Faire faire
  un aller-retour au modèle pour aller chercher 400 caractères qu'on sait déjà
  nécessaires, c'est plus lent, moins fiable, et ça ajoute un troisième décideur alors
  que toute l'architecture existe pour n'en avoir qu'un.
- « Le Guide ne doit pas reconstituer le moteur en texte libre » se tient mieux en lui
  **donnant** l'état qu'en lui demandant d'aller le chercher.

Donc : **une lecture déterministe, faite par le code, à chaque tour**, dans un module
neuf.

```
src/lib/guideMoteur.ts
  etatMoteur(userId)   → un objet structuré, composé UNIQUEMENT d'autorités existantes
  resumeMoteur(etat)   → le bloc de prompt, court, pour le coach
```

`etatMoteur` coûte 6 requêtes (`lireProgrammeActif` en compte 2, `adaptationDuJour`,
`etapeSuivanteDe`, `reservationDeLEtape`, `fetchRange` sur 7 jours). C'est trop pour
chaque message : il faut un **cache court, invalidé par `EVT_JOURNEE`**, exactement
l'événement que tous les écrans du planning écoutent déjà. Une conversation de dix
messages coûte alors 6 requêtes, pas 60, et une séance terminée pendant la conversation
invalide le cache toute seule.

`resumeMoteur` prend la place du paramètre `programme` mort de `buildSystemPrompt`. Une
phrase par fait, jamais plus :

```
TON PROGRAMME (données réelles, ne les invente jamais, ne les recalcule jamais) :
- Programme : Prise de masse, cycle Push · Pull · Bas du corps · Haut du corps · Cardio
- Prochaine étape : Pull, sans jour pour l'instant
- Prévu : jeudi Bas du corps
- Adaptation en cours jusqu'au 6 octobre : Push est mise de côté
```

⚠️ **L'aiguilleur, lui, reste aveugle.** Il n'a pas besoin de savoir que la prochaine
étape s'appelle Pull pour comprendre « saute Pull » : il appelle `etape_sauter`, et
**c'est le code qui résout l'identité** à partir de `etatMoteur`. C'est déjà exactement
ce que fait `questionManquante` pour le lieu (le code sait ce qui lui manque, pas le
modèle), et c'est la seule façon de respecter « aucune logique basée sur des titres
quand une identité existe ».

---

## 9. Où placer les confirmations d'écriture

Le mécanisme existe et il est bon : `PendingPlan` plus `confirmPlan`.

Ce qui lui manque pour V9, c'est de savoir dire **ce qui arrive au cycle**. Aujourd'hui
`PendingPlan` porte une liste de jours à écrire (`writes`, `liberer`) et `confirmPlan`
fait « pour chaque write, `saveDay` en `guide` ». Un geste V9 n'est pas une liste de
jours, c'est un geste nommé.

**Recommandation : une seule carte de planning, élargie**, pas une seconde carte (même
arbitrage que V8, qui n'a pas monté un second écran d'adaptation).

`PendingPlan` gagne :

- `geste` : `"deplacer" | "retirer" | "substituer" | "sauter" | "supplement" | "semaine" | "poser"` ;
- `consequence` : la phrase qui nomme l'effet sur le cycle, affichée **avant** le clic
  (« Ta prochaine étape deviendra Bas du corps », « Ta prochaine étape ne bouge pas ») ;
- `alternative` : la seconde sortie quand elle existe (« En plus, sans toucher à Pull »),
  sur le modèle de la carte séance de V8 qui porte déjà deux sorties.

Et `confirmPlan` cesse d'écrire lui-même : il **route** vers l'autorité du geste.

---

## 10. Représenter proprement substitution, saut, supplément

C'est le cœur de V9, et le modèle de données l'a prévu depuis V4. La migration
`20260905_moteur_v4_programme.sql` écrit les deux cas en toutes lettres :

```
« je saute B et je fais C »                        → provenance C, étape C, prochaine D
« je fais du C à la place du contenu de B,
  je garde la suite »                              → provenance C, étape B, prochaine C
```

### Le tableau de la distinction

| geste | ligne écrite | `programme_seance_id` | `etape_consommee_id` | statut | curseur |
|---|---|---|---|---|---|
| **déplacer** | LA même (update par `id`) | inchangé | inchangé | inchangé | inchangé |
| **retirer** | supprimée | — | — | — | inchangé |
| **substituer** | la réservation si elle existe, sinon une neuve | l'étape d'où vient le contenu, ou `null` | **l'étape visée** | `prevue`, puis `faite` | avance **quand la séance est faite** |
| **sauter** | la réservation si elle existe, sinon une neuve | `null` | **l'étape visée** | **`passee`** | **avance tout de suite** |
| **supplément** | une neuve, en plus | `null` | **`null`** | `prevue` | **jamais** |

### Substitution

Une seule intention, qui porte `programme_id` et `etape_consommee_id = l'étape
remplacée`, et dont `programme_seance_id` dit d'où vient le contenu (une autre étape du
cycle, ou `null` si le contenu vient d'ailleurs).

⚠️ **Un seul endroit du code l'empêche, et c'est `lienProgramme` :**

```ts
const source = d.etapeId ?? d.provenanceId ?? null;
```

Dès que `etapeId` est posé, la provenance vaut l'étape refermée. Une substitution
écrirait donc « le contenu vient de Pull » alors qu'il n'en vient pas.

**Correction recommandée : rendre `lienProgramme` purement déclaratif**, plus aucune
déduction. `source = d.provenanceId`, sans repli, et `intentionDeLEtape` (V7A) déclare
**les deux** colonnes à l'identifiant de l'étape, ce qui est déjà la vérité de ce
geste-là. Pour tout ce qui est relu de la base, `rowToDay` rapatrie déjà les deux
colonnes, donc rien ne change pour l'existant. À vérifier au banc, avec témoin.

⚠️ Contraintes à respecter :

- la FK est **composite** : une provenance doit être une étape du **même** programme.
  Une substitution par une séance du catalogue laisse donc `programme_seance_id = null`,
  ce que `intentions_provenance_check` autorise (il n'exige que `programme_id`).
- `uniq_intention_par_etape` : une seule intention **prévue** par étape. Une
  substitution prévue entre en collision avec la réservation existante de la même étape.
  Il faut donc **modifier la réservation**, jamais en créer une seconde. C'est le
  raisonnement de `daterEtape` (V7A) et de « Décaler » (V8), rejoué une troisième fois :
  il faut en faire une fonction unique.

### Saut

Une intention `nature = 'seance'`, `statut = passee`, `etape_consommee_id = l'étape
sautée`, `programme_seance_id = null`, `exercise_list = []`, `date = aujourd'hui`,
`consommee_le = maintenant`, `origine = 'guide'`.

Rien n'entre dans `workout_sessions`, aucune EXP, aucune mission, aucune série. Le
curseur avance immédiatement parce que `positionConsommee` accepte déjà `passee`.

Autorité : `marquerIntention(userId, id, "skipped")` quand une ligne portant l'étape
existe déjà, sinon une écriture neuve `sauterEtape(userId, programmeId, etapeId)` dans
`programme.ts`, symétrique exacte de `consommerEtape`. **C'est le seul ajout d'écriture
de V9.**

⚠️ **Et ce n'est PAS « éviter » (V8).** Une étape évitée est masquée, elle revient au
tour suivant, et rien n'est écrit. Une étape sautée est refermée pour ce tour. La règle
est verrouillée et le banc interdit déjà les mots `saut` et `skip` dans `adaptation.ts` :
le mot doit vivre dans `programme.ts`, jamais ailleurs.

⚠️ **Le trou d'unicité du saut, et c'est le même que le double-fermage de V7A** : la
ligne sautée naît `passee`, donc `uniq_intention_par_etape` (partiel sur `prevue`) ne la
voit pas. Rien n'empêche donc en base de sauter deux fois la même étape, ni de sauter une
étape déjà faite. Le garde-fou doit vivre dans le code, avant l'écriture, comme celui de
`terminerSeance`.

### Supplément

`ajouterIntention` depuis V6b, avec les trois colonnes à `null`. Déjà correct, déjà
exercé au banc (« une intention sans étape ne fait rien avancer, quel que soit son
titre »). Il manque seulement un outil pour l'appeler : aujourd'hui `plan_set`
**remplace**, il n'existe aucun « en plus » côté Guide.

⚠️ Règle produit déjà verrouillée : **un supplément ne reste jamais en attente sans
date.** Un supplément sans jour doit être refusé, pas écrit.

---

## 11. Comment éviter qu'une action du Guide contourne le moteur

Six garde-fous, tous à écrire une seule fois et à appeler partout.

1. **Les réservations.** Toute écriture qui porte un `etape_consommee_id` cherche
   d'abord `reservationDeLEtape` et **modifie la ligne trouvée**. Sans ça,
   `uniq_intention_par_etape` refuse et le geste échoue muet. Une fonction unique,
   jamais recopiée dans chaque branche.
2. **L'adaptation active.** Avant toute écriture qui porte une étape :
   `etapeMasquee(etapeId, adaptationActive)`. Une étape masquée ne se substitue pas et ne
   se saute pas (elle n'est pas proposée), et une séance posée dessus rouvre le conflit
   V8. Refus **nommé** (« Push est mise de côté jusqu'au 6 octobre »), plus une sortie qui
   ouvre la feuille d'adaptation.
3. **Les contraintes de cycle.** Une étape ne se résout **jamais par son nom**. L'outil
   rend au mieux « la prochaine » ou un nom cité ; le code résout vers un `etapeId` via
   `lireProgrammeActif` + `etapeSuivanteDe`. Si le nom cité ne désigne pas exactement une
   étape du cycle actif, on pose une question à puces avec les étapes du cycle, de façon
   déterministe, comme pour le lieu. Aucun `ilike` sur un titre. (Le seul `ilike`
   légitime de l'assistant reste `plan_library`, sur `custom_sessions.title` : une séance
   de bibliothèque n'a pas d'autre identité pour la personne.)
4. **Les intentions déjà résolues.** `retirerIntention`, `libererJours` et `poser`
   filtrent déjà ce qui est fait. À étendre : substituer ou sauter une étape **déjà
   refermée** doit être refusé, sinon le curseur saute deux crans.
5. **Le programme de référence.** Aucun geste V9 n'écrit dans `programmes` ni
   `programme_seances`. Le banc a déjà ce contrôle pour `adaptation.ts` ; il faut
   l'étendre au module neuf.
6. **Aucune écriture sans clic.** `set_theme` et `save_lieu` sont les deux exceptions
   historiques, et elles portent sur des préférences. Aucune écriture V9 ne s'ajoute à
   cette liste.

Et un septième, qui n'est pas une règle de V9 mais une dette qu'elle doit réparer au
passage : `plan_set` et `plan_regen` détruisent aujourd'hui des liens de programme en
silence (voir la section 5).

---

## Le scénario, phrase par phrase

**Programme** : Push (1) → Pull (2) → Bas du corps (3) → Haut du corps (4) → Cardio (5).
**Situation** : prochaine étape = Pull · Bas du corps planifiée jeudi · adaptation active
qui masque Push.

Note préalable : masquer Push alors que le curseur est déjà sur Pull ne change rien tout
de suite. Ça comptera au tour suivant du cycle, et le Guide doit pouvoir le dire.

### 1. « Qu'est-ce que j'ai de prévu ? »

- **Lit** : `etatMoteur` en entier (programme actif, prochaine étape compatible = Pull,
  réservation de Pull = aucune, sept prochains jours = Bas du corps jeudi, adaptation
  active jusqu'au 6 octobre masquant Push).
- **Outil** : `rien_a_faire`. Surtout pas `open_page` : la personne demande une
  information, elle ne demande pas à être emmenée ailleurs.
- **Confirmation** : non.
- **Écrit** : rien.
- **Cycle** : inchangé.
- **Reste inchangé** : tout.
- **Réponse attendue** : « Ta prochaine étape c'est Pull, quand tu veux. Jeudi tu as Bas
  du corps. Et Push est mise de côté jusqu'au 6 octobre. »

⚠️ **Ce cas est aujourd'hui impossible.** Le coach n'a aucune de ces données. C'est V9A
à elle seule, et c'est déjà la moitié de la valeur de la vague.

### 2. « Mets Bas du corps à vendredi »

- **Lit** : l'intention datée jeudi qui porte Bas du corps, trouvée par
  `etapeId ?? provenanceId` et **jamais par le titre** ; ce qui est déjà posé vendredi ;
  l'adaptation (Bas du corps n'est pas masquée).
- **Outil** : `plan_move`, **existant**, élargi d'un paramètre `quoi` (« l'étape ou la
  séance nommée »), résolu par le code vers un `intentionId`. Aujourd'hui l'outil ne
  comprend que des jours (« décale jeudi à vendredi »).
- **Confirmation** : oui. « Déplacer vers vendredi · jeudi → vendredi », plus « avec X »
  si vendredi porte déjà quelque chose, plus la conséquence : « Ta prochaine étape ne
  bouge pas. »
- **Écrit** : `saveDay(userId, { ...intention, date: vendredi }, "guide")`, donc un
  **UPDATE par `id`**. La provenance et `etape_consommee_id` survivent parce que
  `rowToDay` les a relus et que `lienProgramme` les réécrit à l'identique.
- **Cycle** : inchangé. Une réservation reste une réservation.
- **Reste inchangé** : `programmes`, `programme_seances`, l'adaptation, et ce qui est
  déjà posé vendredi (la séance **rejoint**, elle n'écrase pas, V6b).

Si la ligne de jeudi n'était pas une réservation mais une séance **régénérée**
(provenance seule), tout est identique : elle garde sa provenance, elle ne réserve
toujours rien, et le curseur ne bouge pas davantage.

### 3. « Aujourd'hui je veux faire autre chose que Pull »

C'est ici que la règle verrouillée s'applique : **ne jamais réduire toutes les
formulations « à la place de » à un saut dans le cycle.** Deux intentions différentes se
cachent derrière cette phrase, et la carte doit les nommer :

- substitution : Pull est refermée par autre chose, la prochaine devient Bas du corps ;
- supplément : Pull reste à faire, la prochaine reste Pull.

Le défaut est la **substitution** ; le saut demande un signal explicite.

- **Lit** : la prochaine étape (Pull), sa réservation (aucune), ce qui est déjà posé
  aujourd'hui, le lieu, l'adaptation.
- **Outil** : `etape_substituer` (neuf), paramètres `etape` (défaut « la prochaine »),
  `description` (ce qu'il veut faire à la place), `when` (défaut aujourd'hui).
- **Confirmation** : oui, et **c'est la carte la plus importante de V9**. Elle dit « À la
  place de Pull · aujourd'hui » et, en toutes lettres, « Ta prochaine étape deviendra Bas
  du corps. » Elle porte une seconde sortie : « En plus, sans toucher à Pull », qui
  bascule vers le supplément.
- **Écrit** (au clic) : une intention aujourd'hui, `programme_id`,
  `etape_consommee_id = Pull`, `programme_seance_id = null`, statut `prevue`. Si Pull
  avait une réservation ailleurs, on **modifie** cette ligne au lieu d'en créer une
  seconde.
- **Cycle** : **il ne bouge pas encore.** Il bougera quand la séance sera terminée
  (`terminerSeance` → `marquerIntention` par `id`), et il désignera alors Bas du corps.
  Substituer ne consomme rien tant que rien n'est fait, et c'est la propriété qui la
  distingue du saut.
- **Reste inchangé** : `programmes`, `programme_seances`, l'adaptation, et Bas du corps
  vendredi.

### 4. « Finalement saute Pull »

- **Lit** : l'étape Pull, la ligne qui la porte déjà (la substitution posée en 3, ou une
  réservation), et l'adaptation.
- **Outil** : `etape_sauter` (neuf), paramètre `etape` (défaut « la prochaine »).
- **Confirmation** : **oui, obligatoire.** « Pull ne sera pas faite. Elle ne compte pas
  comme réussie, et ta prochaine étape devient Bas du corps. » C'est irréversible pour ce
  tour de cycle, et ça doit se lire avant le clic.
- **Écrit** : la ligne existante qui porte Pull passe en `passee`
  (`marquerIntention(id, "skipped")`). S'il n'y en a aucune, une ligne neuve :
  `statut = passee`, `etape_consommee_id = Pull`, `programme_seance_id = null`,
  `exercise_list = []`, `date = aujourd'hui`, `consommee_le = maintenant`,
  `origine = "guide"`.
- **Cycle** : **il avance tout de suite.** Prochaine étape = Bas du corps, qui est déjà
  réservée vendredi, donc le héros dira « Bas du corps · vendredi » et `lancementDuJour`
  visera cette ligne-là.
- **Reste inchangé** : `programmes`, `programme_seances`, l'adaptation, aucun
  `workout_sessions`, aucune EXP, aucune mission, aucune série.

⚠️ **Le piège de cet enchaînement** : après le 3, une ligne porte déjà Pull. Le saut doit
**la reprendre**, pas en créer une seconde. Sinon deux lignes portent la même étape,
`uniq_intention_par_etape` ne les attrape pas (la ligne sautée naît `passee`), et c'est
exactement le trou du double-fermage de V7A.

### 5. « Ajoute-moi une petite séance cardio en plus samedi »

- **Lit** : samedi (ce qui s'y trouve), le lieu, le niveau. **Aucune lecture de cycle**,
  et c'est le point : un supplément ne connaît pas le programme.
- **Outil** : `plan_ajouter` (neuf), le pendant de `plan_set` qui remplace. Génère la
  séance par le même chemin (`/api/workout/generate`).
- **Confirmation** : oui. « En plus, samedi · Cardio · Ta prochaine étape ne bouge pas. »
- **Écrit** : `ajouterIntention(userId, { ...day, programmeId: null, etapeId: null,
  provenanceId: null }, "guide")`, donc un INSERT qui ne touche à rien de ce qui est déjà
  samedi.
- **Cycle** : jamais. `etape_consommee_id` nul, donc `positionRefermee` l'ignore quel que
  soit son titre, et la faire n'avancera rien.
- **Reste inchangé** : tout le reste, y compris la prochaine étape.

---

## Livrable

### Architecture V9 recommandée

Quatre couches, aucune ne double une existante.

1. **`etatMoteur(userId)`** dans `src/lib/guideMoteur.ts` : la lecture unique,
   déterministe, composée **uniquement** d'autorités existantes. Cache court, invalidé
   par `EVT_JOURNEE`.
2. **`resumeMoteur(etat)`** : le bloc de prompt, court, injecté à la place du paramètre
   `programme` mort de `buildSystemPrompt`. Le Guide ne reconstitue plus rien, on lui
   donne l'état.
3. **Les outils** : quatre neufs plus deux élargis, tous à **paramètres pauvres**. Le
   code résout les identités, jamais le modèle.
4. **`PendingPlan` élargi** d'un `geste`, d'une `consequence` et d'une `alternative`, et
   **`confirmPlan` qui route** vers les autorités au lieu d'écrire lui-même une liste de
   jours.

### Outils de lecture à créer

**Aucun.** Justification chiffrée en section 8. Si Louis veut absolument que le modèle
aille chercher, alors un seul, `lire_planning(quand)`, et il faut **mesurer** l'effet sur
la fiabilité de l'aiguilleur avant de le garder.

### Outils d'écriture à créer

| outil | geste | autorité |
|---|---|---|
| `etape_substituer` | substitution | `saveDay` sur la réservation, ou intention neuve portant l'étape |
| `etape_sauter` | saut | `marquerIntention(..., "skipped")` ou `sauterEtape` (neuve) |
| `plan_ajouter` | supplément | `ajouterIntention` |
| `plan_retirer` | retrait | `retirerIntention` (V8, sans appelant aujourd'hui) |
| `plan_move` + `quoi` | déplacement par nom d'étape | `saveDay` (inchangée) |
| `adaptation_ouvrir` | gérer les adaptations | ouvre `AdaptationSheet` via `?ouvrir=adaptation` |

### Fonctions existantes à réutiliser

Tout le tableau de la section 7. **Une seule fonction d'écriture est à créer**,
`sauterEtape`, dans `programme.ts`, à côté de `consommerEtape`.

### Fichiers à toucher

| fichier | ce qui change |
|---|---|
| `src/lib/guideMoteur.ts` | **neuf** : `etatMoteur`, `resumeMoteur`, le cache |
| `src/lib/programme.ts` | `sauterEtape` |
| `src/lib/planning.ts` | `lienProgramme` devient purement déclaratif |
| `src/lib/journee.ts` | `intentionDeLEtape` déclare les deux colonnes ; peut-être `intentionSubstituee` |
| `src/lib/assistantTools.ts` | les outils neufs, `plan_move.quoi` |
| `src/context/AssistantContext.tsx` | les branches de `runAction`, `PendingPlan` élargi, `confirmPlan` qui route, l'envoi de `moteur` |
| `src/app/api/chat/route.ts` | le paramètre `programme` remplacé par `moteur` |
| `src/lib/guides.ts` | les phrases des gestes et des impasses neuves |
| `src/components/AssistantSheet.tsx` | la conséquence et la seconde sortie sur `CartePlanning` |
| `scripts/check-programme.ts` | les contrôles ci-dessous |
| `AGENTS.md` | l'entrée V9 |

**Aucune migration SQL prévue.** À revérifier au moment de coder, mais le vocabulaire
`passee` existe depuis V6, le curseur l'accepte déjà, et les contraintes de provenance
autorisent déjà la substitution.

### Invariants et tests à ajouter

Purs, donc jouables hors ligne comme le reste du banc :

- substituer écrit l'étape visée et **aucune** provenance ;
- substituer ne fait **pas** avancer le curseur tant que la séance n'est pas faite ; la
  terminer le fait avancer d'exactement un cran ;
- sauter fait avancer le curseur **tout de suite**, et d'un seul cran ;
- une étape sautée n'apparaît **jamais** comme une séance ratée (`seanceNonFaite`) ;
- sauter deux fois la même étape est refusé ; sauter une étape déjà faite est refusé ;
- un supplément ne fait avancer le curseur **dans aucun cas**, quel que soit son titre ;
- un supplément sans date est refusé ;
- déplacer conserve identité, provenance et lien (déjà couvert par V8, à étendre au
  chemin du Guide) ;
- substituer ou sauter une étape **masquée** est refusé, avec le nom de la fin
  d'adaptation ;
- substituer une étape qui a une réservation ailleurs **modifie** cette réservation et
  n'en crée pas une seconde ;
- `etatMoteur` sur un compte sans programme rend un état vide, et `resumeMoteur` n'écrit
  alors **rien** (le Guide ne doit pas inventer un programme).

De source :

- `guideMoteur.ts` ne contient aucun `.insert(`, `.update(`, `.delete(` ;
- aucune branche V9 ne touche `programmes` ni `programme_seances` ;
- le mot `saut` n'apparaît toujours pas dans `adaptation.ts` ;
- aucune comparaison de titre pour désigner une étape, hors `plan_library` ;
- `confirmPlan` appelle les autorités et n'écrit plus de table lui-même.

Et trois témoins, comme d'habitude : rendre `sauterEtape` silencieux sur le curseur,
faire écrire une provenance à la substitution, et laisser un supplément porter une étape
doivent chacun faire échouer leur contrôle.

### Décisions produit restantes

1. **Le défaut de « autre chose que X ».** L'audit recommande la **substitution**, ce qui
   est déjà la règle verrouillée dans AGENTS.md. À confirmer que le Guide applique
   exactement la même règle que l'écran.
2. **Peut-on sauter une étape autre que la prochaine ?** Recommandation : non dans un
   premier temps. Sauter une étape du milieu du cycle demande de dire ce que devient le
   curseur, et ça n'a pas de réponse évidente.
3. **Un saut se défait-il ?** Retirer la ligne `passee` ferait reculer le curseur, ce qui
   est cohérent. Faut-il l'exposer, ou est-ce un geste qui ne se défait pas ?
4. **Le Guide crée-t-il des adaptations, ou ouvre-t-il la feuille V8 ?** Recommandation
   forte : **il ouvre la feuille**. Une adaptation a une période, des axes, et des
   conflits à résoudre un par un : c'est un écran, pas une carte. En faire une carte, ce
   serait un second endroit où déclarer une adaptation, donc deux endroits à tenir
   d'accord.
5. **La substitution par une séance de la bibliothèque ou du catalogue est-elle
   autorisée ?** Techniquement oui, proprement (`programme_seance_id` reste nul).
6. **Combien de requêtes par message accepte-t-on** pour l'état moteur, et le cache
   invalidé par `EVT_JOURNEE` suffit-il ?
7. **L'aiguilleur reste-t-il aveugle ?** Recommandation : oui. Si Louis veut lui donner
   l'état, ça se tranche sur une mesure, comme les 241 / 1 762 / 5 371.

### Découpage conseillé

V9 est trop grosse pour une vague. Quatre, dans cet ordre, chacune livrable seule.

**V9A · LE GUIDE VOIT** (lecture seule)
`guideMoteur.ts`, `resumeMoteur`, le cache invalidé par `EVT_JOURNEE`, le paramètre
`programme` mort remplacé. Aucune écriture, aucun outil neuf, aucune migration. Elle
répond à elle seule à la phrase 1 du scénario, c'est-à-dire au trou le plus visible du
produit aujourd'hui.

**V9B · LE GUIDE DÉPLACE ET RETIRE**
`plan_move` gagne `quoi`, `plan_retirer` est branché sur `retirerIntention`, la carte
nomme la conséquence. **Aucune sémantique nouvelle** : c'est V8 côté conversation. Répare
au passage la destruction silencieuse de `plan_set` et de `plan_regen`.

**V9C · SUBSTITUTION, SAUT, SUPPLÉMENT**
La vraie vague. `lienProgramme` rendu déclaratif, `sauterEtape`, les trois outils, la
carte à deux sorties, et les six garde-fous de la section 11.

**V9D · LES ADAPTATIONS DEPUIS LA CONVERSATION**
`adaptation_ouvrir`, et rien de plus tant que Louis n'a pas tranché la décision 4.

# V8 · Les adaptations temporaires : audit avant conception

> Audit demandé par Louis le 2026-09-07, juste après la clôture de V7B.
> **Aucun code V8 n'a été écrit.** Ce document dit ce qui existe, ce qui manque,
> ce qui va casser, et ce qu'il reste à trancher.
>
> Périmètre lu : `src/lib/planning.ts`, `src/lib/programme.ts`, `src/lib/journee.ts`,
> `src/lib/finSeance.ts`, `src/hooks/useJournee.ts`, `src/lib/exerciseLibrary.ts`,
> `src/context/AssistantContext.tsx`, plus le schéma RÉEL de la base de production
> (connecteur Supabase, lectures seules).

---

## 1. Le résumé, avant le détail

**Rien n'existe.** Le mot « adaptation » apparaît **deux fois** dans tout `src/`, et les
deux sont des commentaires qui décrivent la chaîne de surcharge future
(`programme.ts:100`, `planning.ts:1016`). Aucune table, aucune colonne, aucun type,
aucun écran. C'est une vague entièrement à construire.

**Le terrain est vide, et c'est une chance.** Mesuré en production le 2026-09-07 :
3 programmes (3 actifs), 15 étapes de cycle, 246 intentions, dont **une seule** est
rattachée à un programme, et elle est déjà `faite`. **Zéro réservation d'étape en
attente.** Une vague qui touche la matérialisation ne peut donc casser le geste de
personne aujourd'hui.

**Le point d'insertion est unique**, et c'est la meilleure nouvelle de cet audit :
`instanceDeLEtape()` a **un seul appelant** dans tout le produit.

**Le vrai risque n'est pas technique, il est produit** : « pas de poussée pendant
10 jours » n'a pas une réponse évidente, elle en a trois, et deux d'entre elles
violent un invariant déjà verrouillé. C'est la décision n° 1 du § 11.

**Et un piège de vocabulaire public** : « s'adapte automatiquement » est un **claim
interdit** (`docs/positionnement-public-vaiiya.md`, § 14). V8 rend l'adaptation
*déclarée par la personne*, jamais déduite. Les textes devront dire « tu me dis, je
m'adapte », jamais « Vaiiya s'adapte tout seul ».

---

## 2. Ce qui existe déjà, et ce que ça vaut pour V8

### 2.1 `contexte_entrainement` (42 lignes) — le DÉFAUT de la chaîne

| Colonne | Type | Contrainte | Lu par le nouveau moteur ? |
|---|---|---|---|
| `user_id` | uuid | PK, FK auth.users cascade | oui |
| `lieu` | text | `NULL | salle | maison` | via `loadLieu` |
| `materiel` | text | `NULL | halteres | poids` | via `loadLieu` |
| `seances_cible` | int | `NULL` ou 0..14 | **uniquement à la création du programme** |
| `duree_cible_min` | int | `NULL` ou 5..300 | **PAR PERSONNE. Colonne dormante.** |

⚠️ **`duree_cible_min` n'est lue nulle part dans `src/`** (vérifié : zéro occurrence).
Elle a été remplie par le backfill de V3 et elle dort depuis. Si V8 ouvre un axe
« séances plus courtes », **il sera le premier code à réveiller cette colonne**, et la
chaîne complète (contexte → programme → étape → intention) n'existe aujourd'hui qu'au
niveau de l'étape : `useJournee` lit `etape.dureeMin ?? 45`, point. Poser un axe de
durée en V8 veut donc dire câbler trois étages, pas un.

⚠️ **`seances_cible` n'a AUCUN effet sur le moteur courant.** Elle sert à
`etapesDuCycle()` au moment où le programme naît, et à `REST_PATTERN` de l'ancien
générateur de semaine (`reposerLaSemaine`, `previewWeek`). Le héros ne dit jamais
« aujourd'hui c'est repos parce que tu fais 3 séances ». **Une adaptation de fréquence
n'aurait donc rien sur quoi mordre**, sauf sur « Refais ma semaine » et sur le Guide.
C'est exactement le mode d'échec que le plan interdit : une adaptation confirmée,
affichée, et sans le moindre effet.

### 2.2 `programmes` (3 lignes, 3 actives)

`id, user_id, nom, intention, statut, origine, position_initiale, cree_le, maj_le, archive_le`

- `uniq_programme_actif` : `UNIQUE (user_id) WHERE statut='actif'`.
- `programmes_archive_check` : `(statut='archive') = (archive_le IS NOT NULL)`.

⚠️ **`position_initiale` a `DEFAULT 0` en base alors que les positions du cycle sont
numérotées à partir de 1.** Le code écrit toujours `POSITION_INITIALE = 1`, donc le
défaut ne mord pas aujourd'hui. Mais V8 amène un **second écrivain** (la nouvelle
version de programme quand une adaptation devient permanente), et c'est précisément là
que ça mordrait : un programme créé sans ce champ pointerait une position qui n'existe
pas. `etapeSuivante` retomberait sur `ordonne[0]`, donc l'échec serait **silencieux**.
À corriger dans la migration V8, c'est une ligne.

### 2.3 `programme_seances` (15 lignes)

`id, programme_id, position, nom, nature, duree_min, origine, cree_le`

- `UNIQUE (programme_id, position)` et `UNIQUE (programme_id, id)` (la cible des FK composites).
- Pas de `user_id`, volontairement : sa policy passe par le programme.
- `duree_min` nullable = **HÉRITE** dans la chaîne de surcharge.

**C'est le programme de référence, et V8 ne doit jamais l'écrire.**

### 2.4 `intentions_entrainement` (246 lignes)

Colonnes utiles à V8 : `date` (nullable), `statut` (`prevue|faite|passee`), `nature`,
`origine`, `consommee_le`, `programme_id`, `programme_seance_id`, `etape_consommee_id`,
`exercise_list` (jsonb).

Invariants déjà en base :

- `intentions_consommee_check` : `(statut='prevue') = (consommee_le IS NULL)`
- `intentions_repos_check` : un repos est daté et vide
- `uniq_intention_non_datee` : une seule intention non datée en attente
- `uniq_intention_par_etape` : `UNIQUE (user_id, etape_consommee_id) WHERE etape_consommee_id IS NOT NULL AND statut='prevue'`
- `uniq_repos_par_date`
- deux FK **composites** `(programme_id, X)` vers `programme_seances(programme_id, id)`,
  en `ON DELETE SET NULL (X)` sur leur PROPRE colonne (correctif V4b), plus deux CHECK
  qui refusent une étape sans son programme.

État mesuré : **1 intention liée à un programme** (statut `faite`, du 2026-09-06),
**0 intention sans date**, 9 intentions futures encore `prevue`.

### 2.5 Ce qui n'existe pas du tout

- `btree_gist` : **disponible mais NON installée** (`pg_available_extensions` = 1,
  `pg_extension` = 0). Elle est nécessaire pour l'`EXCLUDE` anti-chevauchement.
- Aucune notion de « motif », de « gêne », de « période », de « contrainte ».
- Aucun axe d'adaptation, aucun vocabulaire fermé.

---

## 3. Où le contenu réel d'une étape est fabriqué, aujourd'hui

**`instanceDeLEtape(nomEtape, gen)`**, `src/lib/planning.ts:309`.

```ts
export function instanceDeLEtape(nomEtape: string, gen: GenInput): Exercise[] {
  const rng = mulberry32(hashStr(`${gen.seed}-${gen.ctx}-${nomEtape}-v${gen.variant}`));
  const bank = EX[gen.ctx][nomEtape] ?? EX[gen.ctx]["Full Body"];
  return shuffleArr(bank, rng).slice(0, 5).map((p) => toExercise(p, repSchemeFor(gen.goals)));
}
```

Un mélange **déterministe** (graine = `user.id + ctx + nom d'étape + variant`) sur une
banque de chaînes `EX[ctx][nomEtape]`, coupé à 5, avec un schéma de séries déduit des
objectifs. **Aucune écriture, aucun appel d'IA, instantané.**

**Un seul appelant** : `src/hooks/useJournee.ts:205`, dans un `useMemo`. Son résultat
sert à exactement trois choses :

1. `nbExos` (ce que le héros affiche) ;
2. `lancerAujourdhui()` : l'`exerciseList` passée au tunnel **et** la `cible: etape` ;
3. `daterEtape()` : l'`exerciseList` **ÉCRITE** dans l'intention réservée.

Le point 3 est celui qui compte pour V8 : **une réservation fige son contenu au moment
où on la pose.** C'est ce qui crée les questions des § 5 et § 6.

### ⚠️ Le mur qu'on ne voit pas venir : la banque n'a aucune métadonnée

`EX` est un dictionnaire de **chaînes**. « Développé couché » n'y est pas un objet avec
une zone et des muscles, c'est un mot. Pour filtrer « les mouvements de poussée », il
faudrait joindre `EXERCISE_LIBRARY` (102 exercices avec `zone`, `muscles`, `equip`).

**Mesuré : sur les 67 entrées distinctes de `EX`, 21 n'existent pas dans
`EXERCISE_LIBRARY`.**

```
Crunch machine | Tirage vertical | Extensions triceps poulie | Fentes haltères |
Mollets debout | Tirage horizontal | Tapis course 20 min | Squat haltères |
Développé épaules haltères | Extensions triceps haltère | Soulevé de terre roumain haltères |
Hip thrust haltère | Mollets haltères | Fentes marchées | Rowing buste penché |
Squats | Chaise contre le mur 3x45s | Pompes serrées |
Tractions (ou rowing serviette) | Rowing inversé sous table | Gainage dorsal 3x40s
```

Un filtre par muscle laisserait donc passer **un tiers de la banque** sans jamais le
signaler (ou l'écarterait en bloc, selon le sens du test). C'est le défaut le plus
coûteux possible pour cette vague : l'adaptation serait déclarée, confirmée, affichée,
et **fausse une fois sur trois**. Toute adaptation qui parle de MOUVEMENTS suppose donc
d'abord de **raccorder `EX` à `EXERCISE_LIBRARY`**, ou de porter les métadonnées dans
`EX`. C'est un chantier à part entière, à faire AVANT ou à écarter du périmètre.

---

## 4. Où la couche d'adaptation s'insère sans muter le programme de référence

Deux endroits, et il faut les deux :

**a) La matérialisation.** `instanceDeLEtape` prend la contrainte en paramètre. C'est
ce que le plan dit déjà : *elle s'applique à la matérialisation, donc le retour au
programme ne demande aucune écriture*. Un seul appelant à modifier.

**b) La sélection de l'étape.** `etapeSuivante(cycle, positionConsommee, positionInitiale)`
(`programme.ts`) est une fonction **pure**, déjà exercée par le banc. Une adaptation qui
masque une étape se pose là, et nulle part ailleurs.

Ce qui ne bouge JAMAIS : `programmes`, `programme_seances`, et le curseur, qui reste
**dérivé** du journal (`positionRefermee`). C'est ce qui garantit que la fin de
l'adaptation ne demande aucune écriture de retour.

---

## 5. Les réservations datées face à une adaptation

Une réservation est une intention `prevue`, datée, qui porte **déjà son contenu figé**
(`exercise_list`), son `programme_id` et son `etape_consommee_id`.

Trois interactions à connaître :

1. **Elle court-circuite l'adaptation.** `lancementDuJour` vise la réservation
   **avant** l'étape libre. Si l'adaptation masque l'étape mais qu'une réservation
   existe, le héros lance quand même l'ancien contenu. L'adaptation serait contournée
   en silence.
2. **`uniq_intention_par_etape` n'autorise qu'une réservation prévue par étape.** Une
   adaptation qui voudrait « remplacer » la réservation doit donc **déplacer / réécrire**
   la ligne existante, jamais en créer une seconde (leçon `daterEtape`, V7A).
3. **Une réservation posée PENDANT l'adaptation est déjà juste** : `daterEtape`
   matérialise à cet instant, donc avec la contrainte active. Rien à faire.

---

## 6. Séance réservée AVANT, exécutée PENDANT

Trois options, et une seule respecte les règles déjà verrouillées.

| Option | Ce qui se passe | Verdict |
|---|---|---|
| (a) On ne touche à rien | le contenu figé part tel quel, avec de la poussée | **Non.** Faux, et silencieux. |
| (b) Le tunnel rematérialise au lancement | l'`exercise_list` stockée devient décorative | **Non.** Casse le contrat V6b (« l'intention porte tout ce que le tunnel relit ») et toucherait aussi le catalogue et les séances perso. |
| (c) On montre et on demande | à la déclaration, on liste les intentions `prevue` datées dans la fenêtre, on montre ce qui change, et on réécrit **sur confirmation** | **Oui.** C'est la règle déjà écrite : *toute adaptation qui touche des séances déjà datées montre les changements et demande confirmation*. |

Conditions de (c) : on ne touche **jamais** une intention `faite` ou `passee` ;
l'`origine` de la ligne n'est pas modifiée (l'auteur reste l'auteur) ; et la réécriture
pose `adaptation_id` pour que l'historique dise sous quelle contrainte le contenu a été
fabriqué.

---

## 7. L'adaptation se termine, une intention future existe encore

Deux sous-cas, qui n'ont pas la même réponse.

**Une intention datée après la fin, créée pendant.** Elle porte un contenu adapté qui
n'a plus lieu d'être. **Recommandation : on ne réécrit rien.** Un contenu adapté est
plus prudent que nécessaire, jamais dangereux ; et réécrire à la fermeture serait une
écriture déclenchée par le simple passage du temps, donc invisible, donc exactement ce
que le produit s'interdit depuis V5. La personne relance « Remplacer » si elle veut.

**Une adaptation dont la `fin` est passée mais dont le statut n'a pas bougé.** C'est
littéralement le bug `challenge_runs` resté `en_cours` à vie. La règle est déjà écrite
et il faut la tenir des deux côtés :

- **l'affichage recalcule l'expiration côté client** (une `fin` dépassée n'est plus
  active, quoi que dise la colonne) ;
- la fermeture en base est **opportuniste** (à la lecture) **et** par le cron du soir,
  qui balaie déjà ces comptes.

⚠️ Ce point n'est pas cosmétique : l'`EXCLUDE` anti-chevauchement est **partiel**
(`WHERE statut='active'`). Une adaptation périmée mais restée `active` **bloquerait la
déclaration de la suivante**.

---

## 8. Collisions avec `programme_seance_id` et `etape_consommee_id`

Le modèle prévoit déjà que les deux colonnes divergent (« je fais C à la place de B »),
mais **aucun code ne sait encore les écrire différemment** : `lienProgramme()` écrit
« les deux à la même valeur, ou les deux à `null` ».

Une adaptation qui **remplace le contenu** d'une étape est le premier cas divergent
réel. Trois configurations, et il faut savoir laquelle la base accepte :

| Provenance | Étape consommée | Accepté ? |
|---|---|---|
| étape X | étape X | oui (le cas actuel) |
| étape Y | étape X | oui : les deux FK sont composites sur le même `programme_id` |
| `NULL` (contenu fabriqué par l'adaptation) | étape X | **oui** : `intentions_etape_check` n'exige que `programme_id NOT NULL`, et `MATCH SIMPLE` laisse passer un couple partiel |
| étape X | `NULL` | oui (c'est le cas « ajouter » de V4) |

Donc **tout est déjà représentable**. Le seul endroit à ouvrir est `lienProgramme()`,
et il faut l'ouvrir **explicitement**, jamais par accident : c'est la fonction qui
empêche aujourd'hui qu'une séance du catalogue referme une étape que personne ne lui a
confiée.

⚠️ **Et si V8 ajoute `adaptation_id` sur l'intention, elle doit rester une colonne
SEULE.** Jamais membre d'un couple composite : la leçon V4b est qu'un `SET NULL` plein
dans une cascade fait sauter les CHECK **au milieu** de la cascade, et qu'un CHECK n'est
pas `DEFERRABLE` en PostgreSQL. `adaptation_id uuid REFERENCES ... ON DELETE SET NULL`,
seule, sans CHECK croisé.

---

## 9. Préserver les trois distinctions

Trois colonnes, trois questions différentes, et il ne faut pas les confondre :

- **`programme_seance_id` — d'où vient le contenu.** `NULL` si le contenu ne vient
  d'aucune étape du cycle.
- **`etape_consommee_id` — quelle étape est refermée.** C'est lui, et lui seul, qui
  fait avancer le curseur.
- **`adaptation_id` (nouveau) — sous quelle contrainte le contenu a été fabriqué.**
  Ce n'est ni une provenance ni une consommation : c'est la trace qui permettra au
  Guide de dire plus tard « pendant ta gêne à l'épaule, tu as fait ces six séances ».

**Règle qui protège l'historique : une adaptation ne réécrit jamais une intention
résolue.** Le journal dit ce qui a eu lieu, y compris quand c'était une version
allégée. C'est ce qui empêche une adaptation de falsifier le passé.

---

## 10. Le scénario complet

**Programme de référence** : `Push → Pull → Bas du corps → Haut du corps → Cardio / HIIT`
(c'est exactement `buildSplit(5)`, donc une cible de 5 séances). Curseur : dernière
étape refermée = `Cardio / HIIT`, prochaine = `Push`.

**Le geste** : « pendant 10 jours, pas de mouvements de poussée » (du 8 au 17 septembre).

### Ce qui reste stocké comme programme de référence

**Rien ne bouge.** `programmes` : une ligne, `statut='actif'`, `position_initiale=1`.
`programme_seances` : cinq lignes, positions 1 à 5, `origine='systeme'`. Aucune écriture,
aucun archivage, aucune nouvelle version. **C'est le contrat de la vague.**

### Ce qui est stocké comme adaptation

Une ligne dans `adaptations_entrainement` :

```
user_id     = <moi>
debut       = 2026-09-08
fin         = 2026-09-17          (obligatoire ; « jusqu'à nouvel ordre » = +4 semaines)
statut      = 'active'
motif       = "épaule douloureuse"   ← le mot de la personne, JAMAIS lu comme logique
axes        = { "eviter_pattern": ["poussee"] }   ← vocabulaire FERMÉ, refusé si inconnu
axes_version= 1
origine     = 'utilisateur'
```

### Ce que voit l'accueil

C'est là que la décision produit mord. Les trois lectures possibles :

| Lecture | Ce que le héros propose | Verdict |
|---|---|---|
| (a) le contenu de `Push` s'adapte | une séance intitulée « Push » **sans aucune poussée** | **Impossible.** Les 7 entrées de la banque `Push` sont toutes des poussées : il ne reste rien. Et une séance « Push » sans poussée ment sur son étiquette. |
| (b) `Push` est **masquée**, on passe à `Pull` | « Ta prochaine séance · **Pull** · Quand tu veux », plus une ligne discrète « Adaptation en cours jusqu'au 17 » | **Recommandé.** Aucune écriture, aucun curseur touché, aucun mensonge. |
| (c) `Push` est **sautée et refermée** | le cycle avance comme si Push avait eu lieu | **Non.** Falsifie l'historique : une étape refermée est une séance faite. |

Donc, en (b) : **« Ta prochaine séance · Pull · Quand tu veux »**, plus une ligne d'état
qui nomme l'adaptation et la date de fin. `nbExos` = la taille de l'instance de Pull,
filtrée (ici, rien à filtrer : Pull n'est pas une poussée).

### Ce qui est réservé si l'utilisateur donne un jour à la prochaine étape

`daterEtape("2026-09-10")` écrit **une** intention :

```
date                = 2026-09-10
statut              = 'prevue'
nature              = 'seance'
origine             = 'utilisateur'
title               = "Pull"
exercise_list       = l'instance de Pull, matérialisée SOUS l'adaptation
programme_id        = <mon programme>
programme_seance_id = <étape Pull>
etape_consommee_id  = <étape Pull>
adaptation_id       = <l'adaptation>     ← nouveau
consommee_le        = NULL
```

`uniq_intention_par_etape` garantit qu'il n'y en aura jamais deux. Redonner un jour à
Pull est un **déplacement** de cette ligne, pas un second ajout.

### Ce qui est consommé quand la séance est faite

`terminerSeance` prend la branche `intention` (la réservation existe) et appelle
`marquerIntention(userId, id, "done", aujourdhui)` :

```
statut       = 'faite'
date         = le jour où ça a réellement eu lieu (règle V7A)
consommee_le = maintenant
```

`positionRefermee` classe par `consommee_le` : dernière refermée = **Pull** (position 2).
`etapeSuivante` rend donc **Bas du corps** (position 3). **Push n'est pas revenue.**
Le curseur est un pointeur unique : il n'a pas de mémoire des étapes sautées.

### Le 11e jour (18 septembre)

1. L'affichage recalcule : `fin < aujourd'hui`, donc **l'adaptation n'est plus active**,
   que le cron soit passé ou non.
2. La fermeture opportuniste (ou le cron) écrit `statut='terminee'`, ce qui libère
   l'`EXCLUDE` pour la suivante.
3. `instanceDeLEtape` cesse de filtrer, `etapeSuivante` cesse de masquer.
4. Le curseur est **là où le journal l'a laissé** : rien à défaire, rien à réécrire.
5. **Push revient au tour suivant du cycle**, c'est-à-dire dans quatre séances. Elle n'a
   pas été « rattrapée » : elle a été sautée, et le cycle tourne. **C'est la décision
   produit n° 1 à confirmer.**
6. Les intentions encore datées dans le futur gardent leur contenu adapté. On ne
   réécrit rien tout seul (§ 7).

---

## 11. Architecture recommandée

### Le principe

**Une adaptation est un FILTRE, pas une écriture.** Elle vit entre le cycle et
l'instance, elle est lue à chaque matérialisation, et elle disparaît en cessant d'être
lue. Le seul moment où elle écrit quelque chose, c'est à sa déclaration, et seulement
sur les intentions déjà datées, après confirmation explicite.

### Les couches

```
lecture :   contexte → programme → ADAPTATION active → étape → intention
                                        ↓
écriture :  rien, sauf 1) la ligne d'adaptation
                       2) les intentions datées touchées, sur confirmation
```

### Le module

**`src/lib/adaptation.ts` (neuf), et il doit être PUR** comme `missionsAccueil.ts` et
`journee.ts` : le vocabulaire fermé, la validation des axes, `adaptationActive(le, liste)`,
`etapeMasquee(etape, axes)`, `filtrerInstance(exos, axes)`. C'est ce qui rend la vague
entièrement vérifiable hors ligne sur une app auth-gated. La lecture et l'écriture
Supabase vivent à part, comme dans `programme.ts`.

### Le vocabulaire des axes, fermé et versionné

Deux barrières, pas une : un `CHECK` en base qui refuse une clé inconnue à l'écriture,
et une validation TypeScript avant l'appel. **N'implémenter QUE ce qu'un moteur applique
réellement** : une clé écrite que rien ne lit produit une adaptation confirmée,
affichée, et sans effet, ce qui est le pire mode d'échec de cette vague.

Axes possibles, par ordre de coût réel :

| Axe | Coût | Remarque |
|---|---|---|
| `eviter_etapes: ["Push"]` | **faible** | filtre dans `etapeSuivante`, pur, aucune métadonnée nécessaire |
| `duree_max_min: 30` | moyen | oblige à câbler la chaîne de durée sur trois étages (§ 2.1) |
| `eviter_pattern: ["poussee"]` | **élevé** | demande de raccorder `EX` à `EXERCISE_LIBRARY` (§ 3), 21 entrées orphelines |
| `seances_max: 2` | **sans effet aujourd'hui** | rien dans le nouveau moteur ne lit une fréquence (§ 2.1) |

**Recommandation forte : V8 n'ouvre que `eviter_etapes` et `duree_max_min`.**
`eviter_pattern` est une V8b qui commence par le raccordement de la banque.

---

## 12. La migration

Une seule, `supabase/migrations/20260908_moteur_v8_adaptations.sql`, à coller à la main
par Louis.

1. `create extension if not exists btree_gist;` (disponible, non installée).
2. `create table adaptations_entrainement (...)` :
   `id, user_id (FK auth.users on delete cascade), debut date not null, fin date not null,
   statut text not null default 'active', motif text, axes jsonb not null default '{}',
   axes_version int not null default 1, origine text not null, cree_le, maj_le, fermee_le`.
3. `check (fin >= debut)` · `check (statut in ('active','terminee','annulee'))` ·
   `check ((statut='active') = (fermee_le is null))` (le miroir de `programmes_archive_check`).
4. Une fonction `immutable` de validation des clés d'`axes`, appelée dans un `CHECK`.
5. `exclude using gist (user_id with =, daterange(debut, fin, '[]') with &&) where (statut='active')`.
6. `create index ... on adaptations_entrainement (user_id, statut, debut)`.
7. RLS `owner full access`, calquée sur `programmes`.
8. `alter table intentions_entrainement add column adaptation_id uuid references adaptations_entrainement(id) on delete set null;`
9. **Et le correctif au passage** : `alter table programmes alter column position_initiale set default 1;` (§ 2.2).

Rollback complet en pied de fichier, plus la requête qui dit si le retour arrière est
encore possible (habitude prise en V6b).

---

## 13. Les fichiers à toucher

| Fichier | Ce qui change |
|---|---|
| `src/lib/adaptation.ts` | **neuf** : vocabulaire, validation, décisions pures, lecture/écriture |
| `src/lib/planning.ts` | `instanceDeLEtape` (+ contrainte), `lienProgramme` (ouvrir la divergence), `dayToRow` (+ `adaptation_id`), `colonnesIntention`, type `PlanningDay` |
| `src/lib/programme.ts` | `etapeSuivante` (+ filtre des étapes masquées) ⚠️ **fonction pure déjà exercée par le banc** |
| `src/hooks/useJournee.ts` | charger l'adaptation active (une requête), la passer à l'instance, l'exposer |
| `src/components/entrainement/TodayHero.tsx` | **une ligne** qui dit que l'adaptation est en cours et jusqu'à quand. Jamais un bandeau. |
| `src/lib/finSeance.ts` + `consommerEtape` | écrire `adaptation_id` sur le fait |
| `src/lib/assistantTools.ts` + `src/context/AssistantContext.tsx` | l'outil de déclaration et sa **carte de confirmation** (rien ne s'écrit sans clic) |
| `src/components/WeeklyProgramme.tsx` | `reposerLaSemaine` doit respecter l'adaptation, sinon « Refais ma semaine » repose des séances non adaptées |
| `src/app/api/cron/reminders/route.ts` | fermeture des adaptations expirées (il balaie déjà ces comptes) |
| `scripts/check-programme.ts` | les invariants purs |
| `docs/positionnement-public-vaiiya.md` | relire le § 14 avant d'écrire une phrase publique |

⚠️ **`progression/page.tsx` (3 720 lignes) et `WeeklyProgramme.tsx` sont des
monolithes** : un seul agent à la fois, `git pull` avant, passe courte.

---

## 14. Les invariants et les bancs à ajouter

**Côté fonctions pures (`check:programme`)** :

- une adaptation dont la `fin` est passée n'est plus active, même si son statut dit le contraire ;
- `fin` obligatoire, « jusqu'à nouvel ordre » rend bien +4 semaines ;
- une clé d'axe inconnue est **refusée**, jamais ignorée ;
- une étape masquée n'est jamais proposée par `etapeSuivante`, et le curseur ne bouge pas pour autant ;
- l'instance filtrée reste **déterministe** (même graine, même sortie) ;
- une instance qui deviendrait vide après filtre ne rend pas une séance vide (garde-fou) ;
- `lienProgramme` continue de refuser une étape consommée sans son programme ;
- **contrôles de source** : aucun écrivain de `programmes` / `programme_seances` dans les fichiers de V8 (le programme de référence est intact **par construction**, pas par bonne volonté).

**Côté base (transaction annulée, avec témoin)** :

- deux adaptations actives qui se chevauchent : refusées ;
- deux adaptations actives qui se touchent bout à bout : acceptées ;
- une adaptation `terminee` qui chevauche une `active` : acceptée ;
- `fin < debut` : refusée ;
- supprimer une adaptation laisse les intentions en place, `adaptation_id` à `null`, aucun renvoi dans le vide ;
- suppression d'un compte : tout part par la cascade ;
- RLS dans les deux sens.

⚠️ Rappel de méthode déjà payé deux fois : **un banc qui n'exerce que les INSERT ne voit
pas les actions référentielles** (leçon V4b), et **`now()` est constant dans une
transaction** (leçon V4).

---

## 15. Ce qu'il reste à trancher, et qui n'est pas de mon ressort

1. **Une étape masquée est-elle SAUTÉE ou REPORTÉE ?** Sautée = le cycle tourne, Push
   revient dans quatre séances, **aucun état supplémentaire**. Reportée = il faut une
   file d'attente, donc un second curseur stocké, donc exactement ce que le modèle a
   refusé partout ailleurs. **Ma recommandation : sautée**, et on l'écrit en toutes
   lettres dans la carte de confirmation, avant le clic.

2. **Quels axes ouvre V8 ?** Ma recommandation : `eviter_etapes` et `duree_max_min`
   seulement. `eviter_pattern` demande d'abord de raccorder la banque à la
   bibliothèque (21 entrées orphelines) ; `seances_max` n'a aujourd'hui rien sur quoi
   mordre.

3. **Qui déclare une adaptation ?** Le Guide seul (une carte de confirmation dans la
   conversation), un écran dans Entraînement, ou les deux ? Le Guide est le chemin
   naturel (« j'ai mal à l'épaule »), mais un écran est le seul endroit où l'on peut
   **arrêter** une adaptation sans avoir à formuler une phrase.

4. **Que se passe-t-il si l'adaptation vide une étape ?** « Pas de bas du corps » sur
   un cycle de deux étapes ne laisse plus rien. Proposer quand même une séance
   adaptée, ou dire « rien à te proposer cette semaine » ? Le produit s'interdit de
   culpabiliser, mais il s'interdit aussi de mentir.

5. **Le mot public.** « Adaptation automatique » est un claim interdit. Comment on
   nomme ça à l'écran ? « Adaptation », « Pause », « Aménagement », « Ma contrainte » ?
   C'est un mot que la personne va lire tous les jours pendant dix jours.

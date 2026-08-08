# Phase 2 — Profils réellement privés (plan, NE PAS EXÉCUTER)

> ## ⏱ Mise à jour du 2026-08-08 : à lire avant tout le reste
>
> Plan écrit le **2026-07-23**, avant 355 commits sur `main`. Ce qu'il faut
> savoir avant de s'en servir :
>
> **Toujours vrai, et c'est l'essentiel.** Le problème que ce plan résout est
> intact : `profiles` reste lisible par **tout compte connecté**
> (`authenticated USING (true)`), email, données de santé et identifiants
> Stripe compris. **Aucun SQL de ce document n'a été exécuté**, la table
> `user_public_profiles` n'existe pas, aucune branche n'a été ouverte. Les
> décisions du §1 (architecture en table séparée, cinq champs publics et
> pas un de plus) n'ont pas été remises en cause.
>
> **Périmé : le prérequis d'ouverture.** Le plan conditionne son démarrage à
> la fusion du Lot 2 `hardening-seo-privacy`. Cette fusion **n'aura pas
> lieu** : la branche est une archive, ses correctifs sont soit déjà sur
> `main`, soit sans objet. Le prérequis réel devient : partir du `main` à
> jour, une fois le mini-lot `seo-security-current` fusionné.
>
> **Périmé : l'inventaire applicatif du §4.** C'est la partie la plus
> abîmée, et la plus dangereuse à suivre telle quelle. Relevé du 2026-08-08 :
>
> | Ce que dit le §4 | Réalité au 2026-08-08 |
> |---|---|
> | 8 entrées pointant `src/app/communaute/page.tsx` (lignes 1329 à 4079) | le fichier fait **28 lignes**. Il ne contient plus rien de tout ça : la messagerie vit dans `src/lib/messagerie.ts` (1105 l.) et `src/components/communaute/ConversationListPane.tsx` (806 l.). **Les 8 entrées sont à refaire de zéro.** |
> | `src/app/decouverte/page.tsx` (entrée #6) | fichier **supprimé**. Entrée sans objet. |
> | « risque n°1 : les embeds `author:profiles` du feed » | il n'en reste **deux**, tous deux dans `src/components/DailyDrawer.tsx`. Le feed a disparu. Le risque n°1 n'en est plus un. |
> | §8 « route admin service-role, non implémentée » | `src/app/api/admin/user/route.ts` **existe** (authentifie par jeton + contrôle `is_admin`). Elle couvre les **actions**, pas la **liste** : `src/app/admin/page.tsx` lit toujours `profiles` directement depuis le navigateur (lignes 420 et 425). Le §8 reste donc à faire, mais partiellement. |
> | §16 « le rang reste exclu du public » | **contredit par le code** : la RPC `rangs_aura` (2026-07-29) expose déjà l'EXP d'autres comptes aux connectés, et la communauté s'en sert pour afficher leurs décorations. Ce n'est plus une décision à prendre, c'est un existant à intégrer. |
>
> **Manquant : les surfaces nées après le plan.** Le §4 doit être étendu à
> `src/lib/messagerie.ts`, `ConversationListPane.tsx`, `src/lib/rangsPublics.ts`,
> `src/lib/aura.ts`, `src/lib/defi.ts`, et à la recherche d'amis par pseudo
> partiel. Au total **36 fichiers** lisent aujourd'hui `profiles`, dont une
> partie côté service-role (non concernée).
>
> **À faire avant d'ouvrir la Phase 2 : refaire l'inventaire §4 sur le code
> actuel.** Le reste du plan (architecture §2, champs §3, SQL §7, ordre §10,
> tests §11, rollback §13) n'a pas vieilli et reste utilisable tel quel.
>
> **Contexte produit ayant changé, sans effet sur ce plan mais à savoir :**
> l'offre Créateur et Premium+ sont supprimées (un seul palier payant à
> 5,99 €), `VENTE_OUVERTE = false` donc `/premium` affiche « Bientôt
> disponible », et PostHog a été retiré en entier.

> **Nature de ce document.** Plan d'ingénierie **validé** pour rendre les profils
> réellement privés : `profiles` en owner-only + une source d'identité publique
> minimale `user_public_profiles`. **Aucun SQL de ce document n'a été exécuté,
> aucun code n'a été modifié, aucune branche n'a été ouverte.** Tout le SQL est
> marqué **NE PAS EXÉCUTER** et sert de spécification à relire avant la Phase 2.
>
> **Prérequis d'ouverture de la Phase 2 :** Lot 2 (`hardening-seo-privacy`)
> fusionné dans `main` et déployé sain. La Phase 2 partira alors d'une **branche
> neuve** `profiles-privacy-phase2` depuis le `main` à jour. Ce plan ne se
> mélange pas à la branche courante.
>
> ⛔ **Périmé au 2026-08-08.** Le Lot 2 ne sera pas fusionné (branche devenue
> archive). Prérequis réel : `seo-security-current` fusionné, **et**
> l'inventaire du §4 refait sur le code actuel. La branche neuve
> `profiles-privacy-phase2` depuis le `main` à jour reste la bonne méthode.

**Date :** 2026-07-23
**Statut :** plan validé (décisions §1) — implémentation non commencée.

---

## 1. Décisions validées

- **Architecture retenue : table séparée `user_public_profiles`** (et non une vue
  `security_invoker`, ni des RPC). Justification comparée en §2.
- **Champs publics validés (les seuls) :** `id`, `pseudo`, `avatar_url`,
  `is_certified` (badge destiné à être visible), `updated_at`.
- **Champs formellement exclus :** `full_name`, `name`, `last_name`, `bio`,
  `level`, `goals`, `member_number`, rang, `is_premium`, `is_admin`,
  `is_banned`, `email`, données physiques (`age`, `height_cm`, `weight_kg`,
  `gender`), données nutritionnelles (`diet`, `meals_per_day`,
  `sessions_per_week`, tout `onboarding_*`), données d'abonnement/Stripe
  (`stripe_customer_id`, `subscription_*`, `current_period_end`), toute
  information interne ou personnelle.
- **Accès :** `user_public_profiles` lisible **uniquement par les membres
  authentifiés**. **Aucun accès `anon`** pour le moment.
- **Profil d'un autre membre** (page `profil/[username]`) : ne présentera plus
  `bio`, `level`, `goals`, nom complet, ni aucune donnée privée. Au départ,
  **uniquement** pseudo + avatar + badge certifié éventuel. Toute extension =
  décision produit explicite.
- **Rang / `member_number` :** exclus, réévalués **après stabilisation du
  système de rang** (voir §12).

---

## 2. Architecture retenue — comparaison

| Critère | Table `user_public_profiles` (**retenu**) | Vue sécurisée | RPC |
|---|---|---|---|
| Sécurité | ★★★★★ ne contient physiquement aucune colonne sensible | ★★★☆☆ dépend de `security_invoker` (footgun) | ★★★★☆ dépend du code de chaque fonction |
| Risque d'exposition future | ★★★★★ ajout de colonne = acte explicite | ★★☆☆☆ propagation possible d'un `select *` | ★★★☆☆ oubli d'un champ en review |
| Maintenance | ★★★★☆ nécessite un trigger de synchro | ★★★★★ zéro synchro | ★★☆☆☆ multiplie les fonctions |
| Performances | ★★★★★ table indexable, recherche rapide | ★★★★☆ re-scanne `profiles` | ★★★☆☆ N+1, pas d'embed |
| Complexité code app | ★★★★☆ `.from()` + relations embed à revoir | ★★★★★ quasi transparent | ★★☆☆☆ casse embeds + réécrit tout en `.rpc()` |
| **Compat. Realtime** | ★★★★★ Realtime fonctionne sur une table | ★★☆☆☆ **Realtime ne diffuse pas les vues** | ★★☆☆☆ pas de Realtime |
| Compat. messagerie / recherche / Relais | ★★★★☆ `ilike`, `IN`, embeds faisables | ★★★★☆ idem sauf Realtime | ★★☆☆☆ lourd |

**Verdict.** La table séparée est la seule à cumuler sécurité par construction,
performances de recherche et compatibilité Realtime. La vue est écartée (dilemme
`security_invoker` + incompatibilité Realtime). Les RPC sont écartés (cassent les
embeds PostgREST et Realtime, coût de maintenance).

---

## 3. Champs publics vs privés

### Public (`user_public_profiles`)
`id`, `pseudo`, `avatar_url`, `is_certified`, `updated_at`.

### Privé (reste dans `profiles`, owner-only)
Tout le reste : `email`, `full_name`, `name`, `last_name`, `bio`, `age`,
`height_cm`, `weight_kg`, `gender`, `goals`, `level`, `diet`, `meals_per_day`,
`sessions_per_week`, tous les `onboarding_*`, `stripe_customer_id`,
`subscription_tier`, `subscription_status`, `is_premium`, `current_period_end`,
`is_admin`, `is_banned`, `member_number`, `training_location`,
`training_equipment`, `tour_completed`.

**Conséquence produit à acter :** les embeds de feed actuels affichent
`is_admin` et `is_certified` sur l'auteur. `is_admin` **ne sera plus public**
(rôle interne, pas un badge). Le badge admin disparaît du feed ; `is_certified`
reste. Acceptable — à confirmer.

---

## 4. Inventaire applicatif — lectures de profils tiers

Périmètre **strict** : lectures **navigateur** (client anon/authentifié) du
profil d'un **autre** utilisateur. Ce sont les seules cassées par owner-only.
Les lectures de son propre profil (`.eq("id", user.id)`) restent couvertes par
la policy `select own` ; les lectures via service-role (`createAdminClient()`)
bypassent la RLS et sont inchangées.

### 4.1 À rebrancher sur `user_public_profiles`

> ⛔ **INVENTAIRE PÉRIMÉ (2026-08-08) — ne pas suivre ce tableau tel quel.**
> Les numéros de ligne datent d'avant 355 commits. Les entrées **6** à **14**
> visent `communaute/page.tsx` (aujourd'hui 28 lignes) ou `decouverte/page.tsx`
> (supprimé) : elles sont à refaire intégralement contre le code actuel, en
> ajoutant les surfaces nées depuis (`src/lib/messagerie.ts`,
> `ConversationListPane.tsx`, `src/lib/rangsPublics.ts`, `src/lib/aura.ts`,
> `src/lib/defi.ts`). Le tableau reste utile comme **méthode** (quelles
> colonnes, quel remplacement, quelle régression) et comme trace de ce que
> l'app lisait à l'époque, pas comme liste de travail.

| # | Fichier | Zone | Champs lus | Remplacement | Régression si non fait |
|---|---|---|---|---|---|
| 1 | `src/components/FollowListModal.tsx:60` | abonnés/abonnements | `id, pseudo, full_name, avatar_url` (`.in(ids)`) | `.from("user_public_profiles")` (pseudo seul) | listes vides |
| 2 | `src/app/profil/[username]/page.tsx:292` | profil public d'un membre | `id, pseudo, name, full_name, bio, avatar_url, level, goals, is_admin` | table publique **+ retrait bio/level/goals/nom** (décision §1) | fuite actuelle de bio/level/goals |
| 3 | `src/app/profil/[username]/page.tsx:305` | badge certifié | `is_certified` | inclus dans la table publique | badge manquant |
| 4 | `src/app/profil/[username]/page.tsx:76` | feed du membre | embed `author:profiles!user_id(pseudo, avatar_url)` | voir §5 (embed vs requête) | auteurs manquants |
| 5 | `src/app/recherche/page.tsx:145,184` | recherche + suggestions | `id, pseudo, full_name, bio, avatar_url` | `.from("user_public_profiles")` `ilike(pseudo)` | recherche cassée |
| 6 | `src/app/decouverte/page.tsx:436,465` | découverte | `id, pseudo, full_name, avatar_url, bio` (`.neq(self)`) | table publique | suggestions cassées |
| 7 | `src/app/communaute/page.tsx:1329,1449` | recherche DM | `id, pseudo, full_name, avatar_url` | table publique | démarrage de conversation cassé |
| 8 | `src/app/communaute/page.tsx:1430` | abonnements (embed) | `profiles!following_id(id, pseudo, full_name, avatar_url)` | voir §5 | liste d'abonnements cassée |
| 9 | `src/app/communaute/page.tsx:1688,2313` | autocomplete @mention | `pseudo, avatar_url` | table publique | mentions cassées |
| 10 | `src/app/communaute/page.tsx:3453` | partenaire DM par id | `id, pseudo, full_name, avatar_url` | table publique | en-tête de fil vide |
| 11 | `src/app/communaute/page.tsx:3484` | suggestions | `id, pseudo, full_name, avatar_url, bio, is_admin, is_certified` | table publique | découverte cassée |
| 12 | `src/app/communaute/page.tsx:3515,3830` | maps id→profil (stories, partenaires) | `id, pseudo, full_name, avatar_url` (`.in`) | table publique | avatars manquants |
| 13 | `src/app/communaute/page.tsx:4071` | recherche globale comptes | `id, pseudo, full_name, bio, avatar_url, is_admin, is_certified` | table publique | recherche cassée |
| 14 | `src/app/communaute/page.tsx:1565` (COMMENTS_SELECT), `1871,1876,2019,2027,3568,3641,4079` | auteurs feed/commentaires (embed) | `author:profiles!user_id(pseudo, avatar_url, is_admin, is_certified)` | voir §5 | tous les auteurs disparaissent |
| 15 | `src/components/DailyDrawer.tsx:70,96` | feed du jour (embed) | `author:profiles!user_id(pseudo, avatar_url, is_admin, is_certified)` | voir §5 | auteurs manquants |

### 4.2 Non affecté — ne rien changer

- **Soi** (`.eq("id", user.id)`, couvert par `select own`) :
  `src/context/AuthContext.tsx:73`, `src/context/AssistantContext.tsx:137,171`,
  `src/app/coach/page.tsx:162,256`, `src/components/WeeklyProgramme.tsx:391`,
  `src/app/parametres/page.tsx:137`, `src/app/profil/page.tsx:1487`,
  `src/components/OnboardingWrapper.tsx:28`, `src/context/GuidedTourContext.tsx:142`,
  `src/components/DailyDrawer.tsx:140`, `src/components/RecommendedMeals.tsx:277`.
- **Service-role** (bypass RLS) :
  `src/app/api/notifications/{like,comment,follow,repost}/route.ts`,
  `src/app/api/stripe/webhook/route.ts`, `src/app/api/me/ensure-profile/route.ts`.

### 4.3 Cas admin (traité en §8)

`src/app/admin/page.tsx:420` lit **tous** les profils via client navigateur.
Sous owner-only, la console admin casse. **Pas de policy large sur `profiles`** :
on la rebranche sur une route API service-role dédiée (§8).

---

## 5. Relations PostgREST — étude table par table

Les embeds `author:profiles!user_id(...)` et `profiles!following_id(...)`
dépendent de clés étrangères détectables par PostgREST. **Étude par table, sans
création massive de FK.**

> ⚠️ **Drift repo/prod à vérifier d'abord.** Dans le repo :
> `posts.user_id → auth.users(id)` (pas `profiles`), alors que l'app embarque
> `author:profiles!user_id` sur `posts`. Cet embed ne fonctionne en prod que si
> une FK divergente `posts.user_id → profiles(id)` y existe réellement. **À
> relever avant toute décision** (requête P0, §6).

### 5.1 Relevé des FK réelles (préalable obligatoire)

```sql
-- P0 — NE PAS EXÉCUTER (relevé) : FK réelles des tables à embed
select tc.table_name, kcu.column_name, ccu.table_name as ref_table,
       tc.constraint_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
     on kcu.constraint_name = tc.constraint_name
join information_schema.constraint_column_usage ccu
     on ccu.constraint_name = tc.constraint_name
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and tc.table_name in ('posts','post_comments','followers');
```

### 5.2 Table par table

| Table / colonne | FK existante (repo) | Embed utilisé | Option A : FK vers `user_public_profiles` | Option B : requête séparée | Recommandation |
|---|---|---|---|---|---|
| `posts.user_id` | `→ auth.users(id)` (repo) ; **FK vers profiles à confirmer** | `author:profiles!user_id(...)` (feed, haute fréquence) | FK `posts_author_public_fk → user_public_profiles(id)` | 1 requête `.in("id", authorIds)` sur `user_public_profiles`, map côté client | **B par défaut** (aucun risque d'orphelin, pas de FK), **A** seulement si la perf du feed l'exige après mesure |
| `post_comments.user_id` | `→ profiles(id)` | `author:profiles!user_id(...)` | FK `post_comments_author_public_fk → user_public_profiles(id)` | `.in("id", commenterIds)` | **B** (volume modéré, pattern déjà utilisé) |
| `followers.following_id` / `follower_id` | `→ profiles(id)` | `profiles!following_id(...)` | FK `followers_following_public_fk` / `followers_follower_public_fk` | `.in("id", ids)` (déjà le pattern de `FollowListModal`) | **B** (aucun besoin de FK) |

### 5.3 Si l'option A (FK) est retenue pour un cas précis

- **Nommer explicitement** la contrainte (ex. `posts_author_public_fk`).
- **Embed par nom de contrainte** (robuste, lève l'ambiguïté) :
  ```
  .select("id, caption, created_at, user_id,
           author:user_public_profiles!posts_author_public_fk(pseudo, avatar_url, is_certified)")
  ```
- **Risque de relation ambiguë :** si `posts.user_id` conserve **deux** FK vers
  des tables d'identité (`profiles` **et** `user_public_profiles`), un embed qui
  ne nomme que la table cible peut devenir ambigu. **Toujours désambiguïser par
  le nom de contrainte** dans le `select`, jamais par le seul nom de table.
- **Pré-condition dure :** une FK échoue si un `user_id` référencé n'a pas de
  ligne `user_public_profiles` (utilisateur sans pseudo). D'où les préflights §6
  et le traitement du cas « sans pseudo ».

### 5.4 Conclusion

Le plan **privilégie la requête séparée (option B)** partout : elle évite toute
FK, tout risque d'orphelin, et s'aligne sur les patterns existants
(`.in("id", ids)` + map). L'option A reste documentée comme optimisation
ciblée du feed `posts`, à n'activer qu'après mesure de perf **et** préflights
verts. **Aucune FK n'est proposée par défaut.**

---

## 6. Requêtes de préflight (NE PAS EXÉCUTER)

À exécuter **avant** backfill et **avant** toute FK.

```sql
-- P1 — Utilisateurs référencés SANS ligne profiles (orphelins de contenu)
-- Répéter pour chaque colonne d'identité réellement présente en prod.
select 'posts' src, p.user_id            from public.posts p          left join public.profiles pr on pr.id = p.user_id           where pr.id is null
union all select 'post_comments', c.user_id from public.post_comments c left join public.profiles pr on pr.id = c.user_id        where pr.id is null
union all select 'followers.follower',  f.follower_id  from public.followers f  left join public.profiles pr on pr.id = f.follower_id  where pr.id is null
union all select 'followers.following', f.following_id from public.followers f  left join public.profiles pr on pr.id = f.following_id where pr.id is null;
-- Étendre à stories.user_id, conversation_members.user_id, messages.sender_id,
-- et aux tables du Relais/défi (participants) selon le schéma réel relevé.
-- Attendu : 0 ligne. Sinon → nettoyer/rattacher avant de continuer.

-- P2 — Profils sans pseudo exploitable (ne seront pas publiés)
select count(*) as profils_sans_pseudo
from public.profiles where pseudo is null or btrim(pseudo) = '';

-- P3 — Après backfill : chaque id référencé possède bien une ligne publique
select 'posts' src, p.user_id
from public.posts p
left join public.user_public_profiles u on u.id = p.user_id
where u.id is null;
-- (répéter par table ; attendu 0 avant d'ajouter une FK, sinon la FK échouera)

-- P4 — Couverture globale du backfill
select
  (select count(*) from public.profiles where pseudo is not null and btrim(pseudo) <> '') as profils_avec_pseudo,
  (select count(*) from public.user_public_profiles) as lignes_publiques;
-- Attendu : les deux comptes égaux.
```

**Comportement « utilisateur sans pseudo » :** il n'a **pas** de ligne
`user_public_profiles` (le trigger et le backfill l'ignorent). L'UI doit donc
gérer l'absence d'identité publique par un **fallback gracieux** (« Membre » +
avatar par défaut), jamais par une erreur. `ensure-profile` répare déjà les
pseudos manquants (notamment comptes Google) → à laisser tourner avant la
bascule. C'est un argument de plus pour l'**option B** (requête séparée) : une
FK dure refuserait ces lignes, une requête séparée tolère l'absence.

---

## 7. SQL proposé (NE PAS EXÉCUTER)

### 7.1 Création non destructive — table + RLS + index

```sql
create table if not exists public.user_public_profiles (
  id           uuid primary key references public.profiles(id) on delete cascade,
  pseudo       text not null,
  avatar_url   text,
  is_certified boolean not null default false,
  updated_at   timestamptz not null default now()
);
create index if not exists idx_upp_pseudo_lower on public.user_public_profiles (lower(pseudo));

alter table public.user_public_profiles enable row level security;

-- Lecture réservée aux membres connectés ; AUCUN accès anon.
create policy "user_public_profiles readable by authenticated"
  on public.user_public_profiles for select to authenticated using (true);
-- Pas de policy INSERT/UPDATE/DELETE : aucune écriture possible depuis anon
-- ni authenticated. Seul le trigger SECURITY DEFINER (propriétaire postgres)
-- écrit dans cette table.
```

> La FK `user_public_profiles.id → profiles(id) ON DELETE CASCADE` fait que la
> suppression d'un profil supprime automatiquement la ligne publique
> (voir §9 : rend le DELETE du trigger redondant).

### 7.2 Backfill (idempotent)

```sql
insert into public.user_public_profiles (id, pseudo, avatar_url, is_certified)
select id, pseudo, avatar_url, coalesce(is_certified, false)
from public.profiles
where pseudo is not null and btrim(pseudo) <> ''
on conflict (id) do update
  set pseudo = excluded.pseudo,
      avatar_url = excluded.avatar_url,
      is_certified = excluded.is_certified,
      updated_at = now();
```

### 7.3 Trigger de synchronisation (durci)

```sql
create or replace function public.sync_user_public_profile()
returns trigger
language plpgsql
security definer
set search_path = public          -- search_path strict
as $$
begin
  -- Synchronisation limitée aux champs EXPLICITEMENT autorisés.
  if new.pseudo is null or btrim(new.pseudo) = '' then
    -- Pas de pseudo → on ne publie rien (et on retire une éventuelle ligne).
    delete from public.user_public_profiles where id = new.id;
    return new;
  end if;
  insert into public.user_public_profiles (id, pseudo, avatar_url, is_certified)
  values (new.id, new.pseudo, new.avatar_url, coalesce(new.is_certified, false))
  on conflict (id) do update
    set pseudo = excluded.pseudo,
        avatar_url = excluded.avatar_url,
        is_certified = excluded.is_certified,
        updated_at = now();
  return new;
end $$;

-- Propriétaire explicite (doit posséder la table pour écrire malgré la RLS).
alter function public.sync_user_public_profile() owner to postgres;

-- Révocation des droits d'exécution inutiles : la fonction n'est appelée que
-- par le trigger, jamais via l'API PostgREST.
revoke all on function public.sync_user_public_profile() from public, anon, authenticated;

-- INSERT/UPDATE uniquement (le DELETE est couvert par la FK ON DELETE CASCADE).
drop trigger if exists trg_sync_user_public_profile on public.profiles;
create trigger trg_sync_user_public_profile
  after insert or update of pseudo, avatar_url, is_certified on public.profiles
  for each row execute function public.sync_user_public_profile();
```

### 7.4 FK d'embed (OPTIONNELLE — seulement si option A retenue, §5)

```sql
-- Exemple (posts) — à n'ajouter qu'après préflight P3 vert pour cette table.
alter table public.posts
  add constraint posts_author_public_fk
  foreign key (user_id) references public.user_public_profiles(id) on delete cascade;
-- Embed : author:user_public_profiles!posts_author_public_fk(pseudo, avatar_url, is_certified)
```

### 7.5 Bascule finale owner-only (DERNIÈRE étape, après refactor validé)

```sql
-- profiles devient owner-only : il ne restera que la policy "select own".
drop policy if exists "profiles lisibles par membres connectes" on public.profiles;
```

---

## 8. Console admin — route service-role dédiée

Aucune policy large sur `profiles`. La console admin passe par une route API
serveur (spécification, non implémentée) :

> ⚠️ **Partiellement réalisé depuis (2026-08-08).**
> `src/app/api/admin/user/route.ts` existe et applique déjà les points 1 à 3
> et 5 (jeton `Bearer`, contrôle `is_admin` en base, 401/403, service-role
> côté serveur), mais pour les **actions** sur un utilisateur. La **lecture de
> la liste** reste à faire : `src/app/admin/page.tsx` interroge encore
> `profiles` directement depuis le navigateur (lignes 420 et 425), donc la
> console cassera bien à la bascule owner-only. Le `GET /api/admin/users`
> décrit ici reste à écrire, en s'alignant sur la route existante.

- **`GET /api/admin/users`** :
  1. lit le token `Authorization: Bearer <jwt>`, `admin.auth.getUser(token)` → `caller` ;
  2. vérifie le statut admin en base (service-role) :
     `admin.from("profiles").select("is_admin").eq("id", caller.id).maybeSingle()` ;
  3. si `!caller` ou `!is_admin` → **403** systématique ;
  4. sinon, `select` **explicite** des colonnes strictement nécessaires à la
     console (`id, pseudo, full_name, avatar_url, is_admin, is_certified,
     is_banned, created_at`) via service-role ;
  5. la **clé service-role reste côté serveur** (jamais renvoyée au client, jamais
     dans un bundle) ;
  6. `src/app/admin/page.tsx` consomme cette route au lieu de lire `profiles`
     directement.

---

## 9. Trigger vs FK ON DELETE CASCADE — pas de double mécanisme

La FK `user_public_profiles.id → profiles(id) ON DELETE CASCADE` supprime
**automatiquement** la ligne publique quand un profil est supprimé. **Une branche
`DELETE` dans le trigger serait donc redondante.** Décision : le trigger ne gère
**que** `INSERT`/`UPDATE` ; la suppression est déléguée à la FK CASCADE. Un seul
mécanisme par responsabilité, aucun doublon.

---

## 10. Ordre de migration (sans interruption)

1. **Préflights** P0–P2 (§5, §6) : relever FK réelles, orphelins, pseudos manquants.
2. **Créer** `user_public_profiles` + RLS + index (§7.1). *Rien ne casse.*
3. **Backfill** (§7.2).
4. **Préflight P3/P4** : couverture complète.
5. **Trigger** (§7.3) : vérifier propagation pseudo/avatar/badge.
6. **(Optionnel)** FK d'embed (§7.4) uniquement si option A + P3 vert.
7. **Refactor app** (§4.1) vers `user_public_profiles` + route admin (§8). *Les
   deux sources coexistent, rien ne casse.*
8. **Tests complets** (§11) sur preview.
9. **Bascule owner-only** (§7.5) — dernière étape.
10. **Vérifier** owner-only réel (test A/B) + non-régression.

---

## 11. Tests obligatoires

| Test | Attendu |
|---|---|
| anon lit `profiles` | 0 ligne |
| anon lit `user_public_profiles` | 0 ligne (réservé `authenticated`) |
| A lit son propre `profiles` complet | OK |
| A lit `profiles` de B | 0 ligne |
| A lit email/âge/poids/taille/objectifs/diet/Stripe de B | 0 ligne |
| A lit `user_public_profiles` de B | pseudo + avatar (+ badge) uniquement |
| B modifie son pseudo/avatar/badge | propagé à `user_public_profiles` |
| A tente de modifier `user_public_profiles` de B | refusé (aucune policy write) |
| suppression d'un profil | ligne publique supprimée (FK CASCADE) |
| utilisateur sans pseudo | pas de ligne publique + fallback UI « Membre » |
| recherche utilisateurs | fonctionnelle |
| messagerie : ouvrir/afficher un fil, en-tête partenaire | fonctionnelle |
| groupes : création + affichage membres | fonctionnels |
| Relais : afficher les participants | fonctionnel |
| feed posts/commentaires : auteurs affichés | pseudo + avatar présents |
| stories : auteurs affichés | présents |
| réseau : réponses `/rest/v1/` | aucune donnée privée d'autrui |
| Realtime : feed/présence en direct | pas de régression |

Test A/B déterministe (simulation de rôle) :

```sql
-- NE PAS EXÉCUTER hors vérification. Remplacer <A>/<B> par des UUID de test.
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<A>","role":"authenticated"}';
select count(*) as a_voit_son_profil   from profiles where id = '<A>';           -- attendu 1
select count(*) as a_voit_profil_de_b  from profiles where id = '<B>';           -- attendu 0
select count(*) as a_voit_public_de_b  from user_public_profiles where id='<B>'; -- attendu 1 (pseudo/avatar)
commit;
```

---

## 12. Migration versionnée (dépôt)

Toute modification appliquée en prod **doit** être enregistrée dans une migration
Supabase versionnée — aucune modification manuelle ne doit rester hors historique.
Découpage proposé (`supabase/migrations/`), un fichier par responsabilité :

| Fichier | Contenu | Type |
|---|---|---|
| `<date>_phase2_user_public_profiles.sql` | table + RLS + index (§7.1) | création non destructive |
| `<date>_phase2_backfill.sql` | backfill (§7.2) | backfill |
| `<date>_phase2_sync_trigger.sql` | fonction + owner + revokes + trigger (§7.3) | déclencheur |
| `<date>_phase2_embed_fks.sql` | FK d'embed (§7.4) | **optionnel** (si option A) |
| `<date>_phase2_profiles_owner_only.sql` | drop policy `authenticated` (§7.5) | bascule finale |

Les changements applicatifs (§4, §8) partent dans la même branche
`profiles-privacy-phase2` que ces migrations. Le SQL du dépôt doit être
**identique** à ce qui aura été exécuté en prod.

---

## 13. Rollback contrôlé (pas de DROP CASCADE aveugle)

Rollback explicite, étape par étape, dans l'ordre inverse des dépendances :

1. **Restaurer la lecture** (urgence uniquement) : recréer la policy
   `create policy "profiles lisibles par membres connectes" on public.profiles
   for select to authenticated using (true);` → retour instantané à l'état
   pré-bascule. *Conséquence : réouvre la lecture inter-membres (état actuel).*
2. **Retirer les FK** d'embed éventuelles : `alter table public.posts drop
   constraint if exists posts_author_public_fk;` (idem autres). *Conséquence :
   les embeds via nom de contrainte cessent ; l'app doit déjà être revenue aux
   requêtes séparées.*
3. **Supprimer le trigger** : `drop trigger if exists
   trg_sync_user_public_profile on public.profiles;`. *Conséquence : la synchro
   s'arrête ; la table publique fige.*
4. **Supprimer la fonction** : `drop function if exists
   public.sync_user_public_profile();`. *Conséquence : plus aucune écriture
   automatique.*
5. **Supprimer la table** — **seulement** une fois les dépendances (FK, trigger,
   fonction) retirées : `drop table if exists public.user_public_profiles;`
   (sans `cascade`, pour échouer bruyamment s'il reste une dépendance oubliée).
6. **Revert applicatif** : `git revert` du/des commits de la branche
   `profiles-privacy-phase2`.

L'étape 1 seule suffit à **rétablir le service** en urgence sans démonter
l'édifice ; le démontage complet (2→6) se fait ensuite à froid.

---

## 14. Risques

- **Embeds feed** (§4.1 #4, #8, #14, #15) : sans rebranchement, tous les auteurs
  du feed/commentaires disparaissent → **risque n°1**, tester en priorité.
- **Drift repo/prod des FK** (`posts.user_id`) : à relever (P0) avant toute
  décision d'embed.
- **Realtime** : un abonnement écoutant `profiles` pour l'UI live doit basculer
  sur `user_public_profiles`.
- **Console admin** : casse si non rebranchée sur la route service-role (§8).
- **Utilisateurs sans pseudo** : fallback UI obligatoire ; sinon FK en échec et
  auteurs manquants.
- **Désynchronisation** (bug trigger) : surveiller via P4 (counts égaux).
- **`profil/[username]`** expose aujourd'hui `bio`/`level`/`goals` d'un tiers →
  retrait acté (§1), à ne pas oublier dans le refactor.

---

## 15. Actions manuelles des fondateurs (le moment venu)

1. Exécuter les préflights P0–P2, puis le SQL §7 dans l'ordre §10.
2. Confirmer les décisions produit déjà tranchées (§1) et l'exclusion de
   `is_admin` du badge public (§3).
3. Lancer les tests §11 (dont A/B) **avant** la bascule owner-only.
4. Déclencher la bascule §7.5 uniquement après feu vert des tests preview.
5. Committer les migrations versionnées (§12) reflétant exactement le prod.

---

## 16. Décisions futures — rang

Le caractère public du **rang** / `member_number` est **reporté**. Il sera
réévalué une fois le système de rang stabilisé, via une décision produit
explicite, et n'entrera dans `user_public_profiles` que par un `ALTER TABLE`
dédié (jamais par défaut).

> ⛔ **Dépassé par les faits (2026-08-08).** Le rang **est déjà exposé** aux
> comptes connectés, par un autre chemin que `profiles` : la RPC
> `rangs_aura(p_users uuid[])` (`supabase/migrations/20260729_rangs_publics.sql`,
> `SECURITY DEFINER`, 60 comptes par appel) rend l'**EXP totale** d'autres
> comptes, et la communauté s'en sert pour afficher leurs décorations
> (`src/lib/rangsPublics.ts`). C'était une décision produit assumée, prise
> après ce plan. Conséquences pour la Phase 2 : le rang n'a pas besoin
> d'entrer dans `user_public_profiles` (il a sa propre porte), mais cette
> porte **doit être auditée avec le reste**, ce qui n'a jamais été fait. Elle
> n'expose que l'EXP, aucune donnée d'entraînement ni de nutrition.
> `member_number` reste, lui, non exposé.

---

## 17. Rappel — Lot 2 (non concerné par ce plan)

La fusion du Lot 2 (`hardening-seo-privacy`) reste **bloquée** jusqu'à
confirmation des prérequis déjà définis : `CRON_SECRET` en Production ; preview
Stripe en **mode test** exclusivement ; inscription + profil fonctionnels ;
checkout authentifié fonctionnel. Ce document Phase 2 ne modifie ni ne débloque
le Lot 2.

> ⛔ **Périmé au 2026-08-08.** Les quatre prérequis ont tous été confirmés
> (`CRON_SECRET` configuré, production en `sk_live_`, preview et développement
> en `sk_test_`, inscription/profil et checkout authentifié testés). Mais le
> Lot 2 **ne sera pas fusionné pour autant** : entre-temps `main` a absorbé
> ses correctifs sous une meilleure forme, et la branche réintroduirait du
> code obsolète, dont une route API supprimée depuis. Elle reste comme
> archive. Le lot qui la remplace est `seo-security-current`.

# Audit & durcissement RLS Supabase — Vaiiya

> **Nature de ce document.** Journal d'audit et de remédiation de la sécurité
> Row-Level Security (RLS) de la base Supabase de production. Il consigne l'état
> initial constaté, les données exposées, les correctifs **déjà appliqués
> directement dans Supabase Production**, les vérifications, et ce qui reste à
> traiter. Établi à partir d'un relevé **réel** du catalogue de production
> (`pg_policies`, `pg_class`, `information_schema`, `pg_proc`), pas des seules
> migrations du repo — ces dernières s'étaient révélées divergentes.

**Date de la remédiation :** 2026-07-23
**Statut global :** fuite principale (PII sans authentification) **FERMÉE en prod**.

---

## 0. Distinction importante — ce qui est appliqué vs ce qui ne l'est pas

| Élément | Où | Statut |
|---|---|---|
| Suppression des 3 politiques publiques sur `profiles` | **Supabase Production** | ✅ **APPLIQUÉ** (SQL exécuté à la main dans le SQL Editor) |
| Politique de lecture `profiles` réservée aux connectés | **Supabase Production** | ✅ **APPLIQUÉ** |
| Révocation de l'accès public à `ouvrir_fil_entre` | **Supabase Production** | ✅ **APPLIQUÉ** |
| Durcissement des API (setup-db, Stripe, ensure-profile, cron) | **Code, branche `hardening-seo-privacy`** | ⏳ **NON FUSIONNÉ** (poussé, testé sur preview, en attente de merge) |
| Tables sociales (`posts`/`stories`/`followers`/likes…) | — | ⏳ **À TRAITER** avec la grosse mise à jour |

> ⚠️ Les changements RLS ci-dessous ont été **exécutés en production** par les
> fondateurs. Ce document ne réexécute aucun SQL et ne modifie aucune politique :
> il **consigne**. Le SQL est reproduit à titre d'archive.

---

## 1. État initial constaté (avant remédiation)

Relevé du catalogue de production. Points saillants :

- **RLS activée sur les 43 tables `public`** (confirmé via `pg_class.relrowsecurity`),
  grâce à l'event trigger `rls_auto_enable` qui active la RLS sur toute nouvelle
  table. Les grants Supabase par défaut (`anon`/`authenticated` = `ALL`) sont donc
  gatés par la RLS.
- **`profiles`** portait **trois** politiques `SELECT` permissives **cumulées**,
  toutes en `USING (true)` :
  - `Profiles lisibles par tous`
  - `profiles public read`
  - `profiles_public_read`
  En RLS, les politiques permissives se combinent en **OU** : une seule `true`
  suffit à rendre la table **lisible par n'importe qui, y compris un visiteur
  non authentifié**, via la clé anon (publique, embarquée dans le bundle client).
- **`ouvrir_fil_entre(uuid, uuid)`** : fonction `SECURITY DEFINER` **sans
  vérification de `auth.uid()`**, avec `EXECUTE` accordé à `anon` et
  `authenticated`. Elle crée une conversation entre deux utilisateurs passés en
  paramètre → **création de conversations entre utilisateurs arbitraires**
  invocable par n'importe qui.

Autres constats (non bloquants, voir §7) : les RPC de la mise à jour
(relais/défi/messagerie) vérifient correctement `auth.uid()` ; la messagerie
(`conversations`/`messages`/`direct_messages`) est correctement filtrée par
appartenance ; plusieurs tables sociales restent en `SELECT USING (true)`.

---

## 2. Données qui étaient potentiellement exposées (via `profiles`)

Colonnes réelles de `public.profiles` lisibles **sans authentification** avant
correctif :

- Identité : `pseudo`, `name`, `last_name`, `full_name`, `bio`, `avatar_url`.
- **Contact** : `email`.
- **Données de santé / corporelles** : `age`, `height_cm`, `weight_kg`, `gender`,
  `goals`, `level`, `diet`, `meals_per_day`, `sessions_per_week`, ainsi que tous
  les champs `onboarding_*` équivalents (`onboarding_age`, `onboarding_height`,
  `onboarding_weight`, `onboarding_gender`, `onboarding_goals`, `onboarding_diet`,
  `onboarding_level`, `onboarding_sessions_week`, `onboarding_meals_day`).
- **Facturation / abonnement** : `stripe_customer_id`, `subscription_tier`,
  `subscription_status`, `is_premium`, `current_period_end`.
- Statuts internes : `is_admin`, `is_certified`, `is_banned`, `member_number`.

→ Un tiers non connecté pouvait, via l'API REST + clé anon, récupérer l'email,
les données de santé et l'identifiant Stripe de **tous** les utilisateurs.
Le `noindex`/`robots.txt` ne protège pas de ce scraping direct : seule la RLS le
fait.

---

## 3. Politiques supprimées (appliqué en prod)

Sur `public.profiles`, les trois politiques de lecture publique ont été
supprimées :

```sql
drop policy if exists "Profiles lisibles par tous" on public.profiles;
drop policy if exists "profiles public read"       on public.profiles;
drop policy if exists "profiles_public_read"        on public.profiles;
```

---

## 4. Politiques finales actuellement présentes sur `profiles`

Politique de lecture ajoutée (appliqué en prod) :

```sql
create policy "profiles lisibles par membres connectes"
  on public.profiles for select to authenticated using (true);
```

Relevé `pg_policies` de contrôle (`cmd = SELECT`) après remédiation :

| policyname | cmd | roles | qual |
|---|---|---|---|
| `profiles lisibles par membres connectes` | SELECT | `{authenticated}` | `true` |
| `select own` | SELECT | `{public}` | `auth.uid() = id` |

Les politiques d'écriture propriétaire préexistantes restent en place
(`profiles_own_write` ALL `auth.uid() = id`, `insert own`, `own profile insert`,
`Utilisateur modifie son profil`, `own profile write`, `update own`).

**Effet net** : lecture réservée aux comptes `authenticated` (+ le propriétaire
pour sa propre ligne). Un rôle `anon` (`auth.uid()` nul) ne correspond à aucune
politique de lecture → **0 ligne**.

---

## 5. Révocation de `ouvrir_fil_entre` (appliqué en prod)

```sql
revoke execute on function public.ouvrir_fil_entre(uuid, uuid) from anon, authenticated;
revoke execute on function public.amis_ouvrent_un_fil() from anon, authenticated;
```

Le trigger `amis_ouvrent_un_fil` (ouverture d'un fil au follow mutuel) **continue
de fonctionner** : les fonctions trigger s'exécutent en contexte `SECURITY
DEFINER` indépendamment des grants. La fonction n'est donc plus invocable
directement via l'API publique, tout en restant opérationnelle en interne.

---

## 6. Vérifications ayant confirmé la fermeture

1. **Relevé `pg_policies` post-remédiation** (§4) : les trois politiques `true`
   sont absentes ; seules subsistent la lecture `authenticated` et
   `select own`.
2. **Raisonnement RLS deny-par-défaut** : rôle `anon`, `auth.uid()` nul → aucune
   politique de lecture applicable → aucune ligne visible. Un compte
   `authenticated` correspond à la politique membres connectés → l'affichage
   inter-utilisateurs (pseudo/avatar) de l'app connectée est préservé.
3. **Contrôle anonyme reproductible** (à exécuter dans le SQL Editor) :
   ```sql
   set local role anon;
   select count(*) as lignes_visibles_par_un_anonyme from public.profiles; -- attendu : 0
   reset role;
   ```
4. RLS confirmée active sur les 43 tables (`pg_class.relrowsecurity = true`).

---

## 7. Tables sociales restant à traiter (avec la grosse mise à jour)

Ces tables portent encore une politique `SELECT USING (true)` → lisibles sans
compte via la clé anon. **Pas de PII de santé**, mais contenu et graphe social
scrapables. Leur RLS est **entremêlée avec la refonte sociale du pivot** : les
corriger isolément changerait le comportement du feed en production juste avant
la mise à jour. À traiter **avec** le déploiement de la grosse MAJ.

| Table | Problème | Correction cible |
|---|---|---|
| `posts` | politique `Posts publics visibles par tous` (`true`) **annule** la logique d'audience `posts_select` (public/friends/privé) → posts privés/amis exposés | retirer le blanket `true`, restreindre `posts_select` à `authenticated` |
| `stories` | `Stories visibles par tous` (`true`) **annule** l'expiration → stories expirées exposées | conserver la fenêtre d'expiration, restreindre à `authenticated` |
| `followers` | `Abonnements visibles par tous` (`true`) → graphe social public | `SELECT TO authenticated` |
| `post_likes`, `post_comments`, `post_reposts`, `comment_likes` | `SELECT USING (true)` → interactions publiques | `SELECT TO authenticated` |
| `highlights`, `highlight_items` | `SELECT USING (true)` | `SELECT TO authenticated` |

Note complémentaire (à vérifier, non bloquant) : `season_eclats` et
`season_scores` apparaissent dans les grants mais pas dans le scan des tables
soumises à RLS → possibles grants orphelins ou vues ; à confirmer (dormant,
lié aux saisons).

Cible produit à terme (rappel) : profils **privés**, données complètes réservées
au propriétaire, identité minimale exposée via une **vue publique dédiée** en
opt-in explicite. Voir la Phase 2 discutée hors de ce document.

---

## 8. Rappel — SQL (archive) vs code non fusionné

- **SQL RLS ci-dessus** : **exécuté en production** par les fondateurs (SQL
  Editor). Ce document ne fait que l'archiver.
- **Durcissement des API** (`/api/setup-db`, `/api/stripe/checkout`,
  `/api/me/ensure-profile`, `/api/cron/reminders`) : présent uniquement sur la
  branche `hardening-seo-privacy`, **poussé et testé sur preview mais NON
  FUSIONNÉ** dans `main`. Sa fusion est conditionnée à la configuration de
  `CRON_SECRET` en production (sinon le cron des rappels renverra 401) et à la
  checklist de pré-fusion du Lot 2.

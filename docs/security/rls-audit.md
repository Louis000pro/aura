# Audit & durcissement RLS Supabase — Vaiiya

> ## ⏱ Mise à jour du 2026-08-08 : à lire avant tout le reste
>
> Ce document a été écrit le **2026-07-23**. Entre cette date et aujourd'hui,
> **355 commits** sont arrivés sur `main` (la grosse mise à jour de juillet).
> Le corps du document reste l'archive fidèle de l'audit ; ce bloc dit ce qui
> a bougé depuis. En cas de contradiction, **c'est ce bloc qui fait foi**.
>
> ### Ce qui est appliqué en Supabase Production (inchangé)
>
> Les trois politiques `SELECT USING (true)` de `profiles` supprimées, la
> politique de lecture réservée aux connectés, et la révocation de
> `ouvrir_fil_entre`. **Aucun SQL n'a été exécuté depuis le 2026-07-23** : ces
> corrections tiennent toujours, la fuite de PII sans authentification reste
> fermée.
>
> ### Ce qui était « à fusionner » et ne l'est plus
>
> Le Lot 2 décrit en §0 et §8 comme « en attente de merge » **n'existe plus
> sous cette forme**. La branche `hardening-seo-privacy` est devenue une
> **archive** : la fusionner réintroduirait du code obsolète. Ses correctifs
> ont été soit repris ailleurs, soit rendus sans objet :
>
> | Correctif d'origine | Statut au 2026-08-08 |
> |---|---|
> | `/api/setup-db` verrouillé | **sans objet** : la route a été **supprimée** de `main` (commit `fc40980`). Supprimée vaut mieux que verrouillée. Ne pas la recréer. |
> | Stripe Checkout authentifié | **déjà fait sur `main`**, en plus complet : jeton `Bearer`, refus 503 quand `VENTE_OUVERTE` est faux, garde-fou anti double abonnement. |
> | `ensure-profile` authentifié | **déjà fait sur `main`**, via le helper partagé `src/lib/apiAuth.ts` (`compteAppelant` / `refusAuth`). |
> | `/api/cron/reminders` fail-closed | **refait proprement** sur la branche `seo-security-current`, appliqué à la version actuelle du fichier (celle qui contient `rappelsRelais()`). |
> | Préversions non indexables | **refait proprement** sur `seo-security-current`. |
>
> ### Ce qui reste ouvert
>
> 1. **`profiles` est lisible par tout compte connecté** (`authenticated
>    USING (true)`). C'est le sujet de la Phase 2, **toujours non exécutée** :
>    aucun SQL, aucune table `user_public_profiles`, aucune branche.
> 2. **Les tables sociales du §7** (`posts`, `stories`, `followers`, likes,
>    commentaires, `highlights`…) : le constat date du 2026-07-23 et
>    **n'a pas été revérifié en base depuis**. Voir la nuance ci-dessous.
>
> ### Observation du §7 dont le raisonnement a changé
>
> Le §7 justifiait de reporter ces tables au motif que « les corriger
> isolément changerait le comportement du feed en production ». **Ce motif
> est caduc : le feed public n'existe plus.** L'ancienne communauté a été
> déposée, et le grand ménage du 2026-07-23 a supprimé likes, commentaires,
> reposts, sauvegardes, stories et highlights **du code**. Les **tables**,
> elles, n'ont jamais été supprimées ni re-sécurisées : si leurs politiques
> `USING (true)` sont toujours là, le contenu et le graphe social restent
> lisibles avec la clé anon, **sans qu'aucun écran ne dépende plus d'eux**.
> Le risque de régression produit en les fermant est donc désormais proche de
> zéro, ce qui en fait un chantier **plus facile qu'annoncé**, pas moins
> urgent. À revérifier en base avant d'agir.
>
> ### Surfaces apparues après cet audit, non couvertes par lui
>
> - **`rangs_aura(p_users uuid[])`** (`supabase/migrations/20260729_rangs_publics.sql`,
>   `SECURITY DEFINER`, réservée aux connectés, 60 comptes par appel) : expose
>   l'**EXP totale** d'autres comptes. Assumé et cadré, mais postérieur à
>   l'audit, donc jamais audité. À intégrer au périmètre Phase 2.
> - **Messagerie et amis** (`src/lib/messagerie.ts`, `apercus_conversations()`,
>   `ajouter_membres_conversation()`, recherche de pseudos partielle) : tout un
>   pan de RPC né après cet audit.
> - **`/api/admin/user`** : route d'administration service-role qui n'existait
>   pas le 2026-07-23.
>
> **Rien de tout cela n'est traité dans ce mini-lot.** Ce sont les chantiers
> suivants.

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
| Durcissement des API (setup-db, Stripe, ensure-profile, cron) | **Code, branche `hardening-seo-privacy`** | ⛔ **PÉRIMÉ au 2026-08-08**, voir le bloc de mise à jour en tête de document. La branche ne doit **pas** être fusionnée. |
| Tables sociales (`posts`/`stories`/`followers`/likes…) | (base) | ⏳ **TOUJOURS À TRAITER**, mais le motif de report a changé (voir bloc de mise à jour) |

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

> ⛔ **Constat daté du 2026-07-23, non revérifié en base depuis.** Le motif de
> report ci-dessus (« changerait le comportement du feed ») **n'est plus
> valable** : le feed public n'existe plus et le code qui lisait ces tables a
> été supprimé. L'exposition en base, elle, n'a pas été corrigée. Revérifier
> `pg_policies` avant d'agir, puis fermer : c'est devenu peu risqué.

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

> ⛔ **Périmé au 2026-08-08.** Ce paragraphe décrit une fusion qui n'aura pas
> lieu. `hardening-seo-privacy` est une archive : trois de ses quatre
> correctifs API sont soit déjà sur `main` en meilleure forme, soit sans objet
> (route supprimée), et le quatrième a été réappliqué à la version actuelle du
> cron sur `seo-security-current`. Le tableau du bloc de mise à jour, en tête
> de document, donne le détail correctif par correctif. `CRON_SECRET` **est**
> configuré en production depuis.
